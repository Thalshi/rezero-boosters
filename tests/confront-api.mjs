// Confrontation côté serveur : salon, code, bot, contributions tirées de la vraie collection, choix, partie complète
// jouée par l'API, spectateur sans secrets, verrou des cartes apportées pendant la partie, levée à la fin.
import { startServer, player, reporter, IDS, grant, playwright, ROOT } from "./lib.mjs";
import * as G from "../worker/game.js";
import { botAction } from "../worker/confront/bots.mjs";
import { brancheProposee, brancheProposeeCarte } from "../worker/confront/branches-proposees.mjs";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

const OUT = process.env.REPORT_DIR || join(ROOT, "tests/reports");
mkdirSync(OUT, { recursive: true });
const srv = await startServer({ port: +(process.env.PORT || 8870) });
const t = reporter("Confrontation · serveur et table");
let browser;
try {
  const A = await player(srv.base, IDS.p1, "Aiko"), B = await player(srv.base, IDS.p2, "Bram"), S = await player(srv.base, IDS.p3, "Spectre");
  for (const p of [A, B, S]) await p.api("state");
  grant(srv, [A, B], { free: 14 });
  for (let i = 0; i < 12; i++) { await A.api("open", { pack: "mix" }); await B.api("open", { pack: "mix" }); }

  t.section("Branches des cartes (variantes selon la rareté, réglées par l'admin)");
  const Bil = await player(srv.base, IDS.admin, "Billy"); await Bil.api("state");
  t.check("variante : une Épique ou mieux d'un perso peut avoir une autre branche que sa Commune", brancheProposeeCarte(G.CARD_BY_ID["seb-sk-chroma"]) === brancheProposee("seb") && brancheProposeeCarte(G.CARD_BY_ID["seb-sk-prestige"]) !== brancheProposee("seb"));
  t.check("toutes les cartes ont une branche", G.ALL_CARDS.every((c) => brancheProposeeCarte(c)));
  t.check("la liste des branches est réservée à l'admin", (await A.api("confront/branches")).status === 403 && (await A.api("confront/branches/set", { ids: ["seb"], branch: "chance" })).status === 403);
  const br0 = await Bil.api("confront/branches");
  t.check("admin : proposition pour chaque carte, aucun choix au départ", br0.status === 200 && Object.keys(br0.proposees).length === G.ALL_CARDS.length && Object.keys(br0.choix).length === 0);
  t.check("branche ou carte inconnue : refusé", (await Bil.api("confront/branches/set", { ids: ["seb"], branch: "dragon" })).status === 400 && (await Bil.api("confront/branches/set", { ids: ["pas-une-carte"], branch: "chance" })).status === 400);
  const firstA = Object.keys((await A.api("state")).state.owned).find((id) => G.CARD_BY_ID[id]);
  const autre = ["assaut", "defense", "stratege", "voleur", "precision", "resistance", "survie", "chance"].find((b) => b !== brancheProposeeCarte(G.CARD_BY_ID[firstA]));
  const set1 = await Bil.api("confront/branches/set", { ids: [firstA], branch: autre });
  t.check("admin : changer la branche d'une carte", set1.status === 200 && set1.choix[firstA] === autre);
  t.check("le joueur voit la nouvelle branche de sa carte", (await A.api("confront/list")).cartes.find((x) => x.cardId === firstA)?.branch === autre);
  t.check("l'API des documents ne donne pas les choix de l'admin", (await A.doc("GET", "confrontcfg/branches")).body?.exists === false);
  const back = await Bil.api("confront/branches/set", { ids: [firstA], branch: null });
  t.check("revenir à la proposition", back.status === 200 && !back.choix[firstA] && (await A.api("confront/list")).cartes.find((x) => x.cardId === firstA)?.branch === brancheProposeeCarte(G.CARD_BY_ID[firstA]));

  t.section("Salon");
  const c = await A.api("confront/create", { nom: "Table test", public: true });
  const gid = c.gid;
  t.check("création : salon avec code de 4 lettres", c.status === 200 && /^[A-Z2-9]{4}$/.test(gid) && c.vue.phase === "lobby");
  t.check("le salon apparaît dans la liste publique", (await B.api("confront/list")).salons.some((g) => g.gid === gid));
  t.check("l'API des documents ne donne pas la partie", (await B.doc("GET", "confront/" + gid)).body?.exists === false);
  t.check("rejoindre avec le code", (await B.api("confront/act", { gid, action: { type: "rejoindre" } })).vue.joueurs.length === 2);
  t.check("seul le créateur ajoute un bot", (await B.api("confront/bot", { gid })).status === 400);
  t.check("ajouter un bot (outil de test)", (await A.api("confront/bot", { gid })).vue.joueurs.length === 3);
  t.check("seul l'hôte lance", (await B.api("confront/act", { gid, action: { type: "lancer" } })).status === 400);
  const l = await A.api("confront/act", { gid, action: { type: "lancer" } });
  t.check("lancement à 3 : Trio, phase des contributions", l.vue.phase === "contributions");

  t.section("Contributions depuis la collection");
  const listA = await A.api("confront/list");
  t.check("le serveur n'envoie que mes cartes, avec leur branche", listA.cartes.length > 0 && listA.cartes.every((x) => G.CARD_BY_ID[x.cardId] && x.branch === brancheProposeeCarte(G.CARD_BY_ID[x.cardId])));
  const stA = (await A.api("state")).state;
  const notMine = G.CARDS.find((c) => !stA.owned[c.id] && brancheProposee(c.who)).id;
  t.check("apporter une carte que je n'ai pas : refusé", (await A.api("confront/act", { gid, action: { type: "contribuer", cartes: [notMine] } })).status === 400);
  // une carte par branche, en choisissant si possible un exemplaire unique (pour tester le verrou)
  const byBranch = {}; for (const x of listA.cartes) if (!byBranch[x.branch] || stA.owned[x.cardId].n + stA.owned[x.cardId].gold === 1) byBranch[x.branch] = x.cardId;
  const mine = Object.values(byBranch);
  const ca = await A.api("confront/act", { gid, action: { type: "contribuer", cartes: mine } });
  t.check("contribution acceptée (une carte par branche)", ca.status === 200, ca.error);
  const solo = mine.find((id) => stA.owned[id].n + stA.owned[id].gold === 1 && !stA.owned[id].gold);
  if (solo) t.check("verrou : une carte apportée (dernier exemplaire) ne peut pas être vendue", (await A.api("market/sell", { id: solo, price: 10 })).status === 400);
  else t.note("Pas d'exemplaire unique parmi les cartes apportées : verrou de vente non testé.");
  const cb = await B.api("confront/act", { gid, action: { type: "contribuer", cartes: [] } });
  t.check("contribution vide : que des cartes de prêt", cb.status === 200 && cb.vue.phase === "choix", cb.vue?.phase);

  t.section("Choix et partie complète par l'API");
  const spect = await S.api("confront/state", { gid });
  t.check("spectateur : aucune main, aucune proposition", spect.spectateur && !spect.vue.main && !spect.vue.propositions?.length);
  let steps = 0, last = null;
  while (steps < 900) {
    let moved = false;
    for (const P of [A, B]) {
      const st = await P.api("confront/state", { gid });
      last = st.vue;
      if (last.phase === "fin") break;
      const a = botAction(last, {});
      if (!a) continue;
      const r = await P.api("confront/act", { gid, action: a });
      if (r.status !== 200) { t.check("action légale refusée", false, { a, err: r.error }); steps = 9999; break; }
      moved = true; steps++;
    }
    if (last?.phase === "fin" || steps >= 9999) break;
    if (!moved) { const st = await A.api("confront/state", { gid }); if (st.vue.phase === "fin") { last = st.vue; break; } }
  }
  t.check("la partie va jusqu'au bout", last?.phase === "fin", { steps, phase: last?.phase });
  t.check("résultat : gagnants et rôles révélés", Array.isArray(last?.resultat?.gagnants));
  const endS = await S.api("confront/state", { gid });
  t.check("spectateur : voit la fin", endS.vue.phase === "fin");
  const stEnd = (await A.api("state")).state;
  t.check("fin : les verrous sont levés", !stEnd.confront);
  const wonA = (last?.resultat?.gagnants || []).includes(A.id), played = stEnd.counts?.cfPlay || 0;
  t.check("fin : la partie est comptée (victoire seulement si gagnée)", (stEnd.counts?.cfWin || 0) === (wonA && played ? 1 : 0), { wonA, counts: stEnd.counts });
  t.check("fin : une victoire valable donne le titre « Première victoire »", !(stEnd.counts?.cfWin) || stEnd.titles.includes("c-win1"));
  t.check("aucune carte n'a changé de propriétaire", JSON.stringify(Object.keys(stEnd.owned).sort()) === JSON.stringify(Object.keys(stA.owned).sort()));
  if (solo) t.check("après la partie : la carte se vend de nouveau", (await A.api("market/sell", { id: solo, price: 10 })).status === 200);

  t.section("Interrupteur");
  const cfg0 = (await srv.base, (await (await player(srv.base, IDS.admin, "Billy")).doc("GET", "config/game")).body?.data) || {};
  const Adm = await player(srv.base, IDS.admin, "Billy");
  await Adm.doc("PUT", "config/game", { ...cfg0, features: { confrontation: false } });
  t.check("Confrontation fermée : création refusée", (await A.api("confront/create", {})).status === 403);
  await Adm.doc("PUT", "config/game", { ...cfg0, features: {} });

  t.section("Page");
  const { chromium } = await playwright();
  browser = await chromium.launch();
  for (const [label, vp] of [["ordi", { width: 1366, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({ viewport: vp }), page = await ctx.newPage(), errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${srv.base}/auth/dev?id=${IDS.p1}&name=Aiko`); await page.waitForTimeout(2500);
    await page.goto(`${srv.base}/#/confront`); await page.waitForTimeout(1500);
    t.check(`${label} · page des salons et des 8 branches`, (await page.locator(".cf-br").count()) === 8);
    await page.fill("#cfNom", "Table " + label); await page.click('[data-act="cf-create"]'); await page.waitForTimeout(1500);
    await page.click('[data-act="cf-bot"]'); await page.waitForTimeout(900);
    await page.click('[data-cfa=\'{"type":"lancer"}\']'); await page.waitForTimeout(1500);
    t.check(`${label} · contributions : une liste par branche`, (await page.locator("[data-cfb]").count()) === 8);
    await page.screenshot({ path: join(OUT, `confront-contrib-${label}.png`), fullPage: true });
    await page.click('[data-act="cf-contrib"]'); await page.waitForTimeout(1800);
    await page.click(".cf-prop .btn >> nth=0"); await page.waitForTimeout(2500);
    t.check(`${label} · table de jeu affichée`, (await page.locator(".cf-seat").count()) === 2 && (await page.locator(".cf-hand .cf-card").count()) > 0);
    await page.screenshot({ path: join(OUT, `confront-table-${label}.png`), fullPage: true });
    t.check(`${label} · aucune erreur JavaScript`, errors.length === 0, errors);
    await ctx.close();
  }
} catch (e) { t.check("exécution sans erreur", false, String(e.stack || e)); }
finally { t.done(); await browser?.close(); await srv.stop(); }
