// Salons de Confrontation : cartes de la table (chacun son deck ou partagées), quitter le salon, partager le salon,
// défier quelqu'un en duel depuis son profil (accepter, refuser, table privée).
import { startServer, player, reporter, IDS, grant, playwright } from "./lib.mjs";

const srv = await startServer({ port: +(process.env.PORT || 8884) });
const t = reporter("Confrontation · salons, duels et partage");
let browser;
try {
  const A = await player(srv.base, IDS.p1, "Aiko"), B = await player(srv.base, IDS.p2, "Bram"), C = await player(srv.base, IDS.p3, "Cleo");
  for (const x of [A, B, C]) await x.api("state");
  grant(srv, [A, B], { free: 6 });
  for (const x of [A, B]) for (let i = 0; i < 6; i++) await x.api("open", { pack: "mix" });

  t.section("Cartes de la table");
  const t1 = await A.api("confront/create", { nom: "Deck", public: true });
  t.check("par défaut : chacun son deck", t1.partage === false && t1.vue.phase === "lobby");
  const t2 = await A.api("confront/create", { nom: "Pot", public: true, partage: true });
  t.check("à la création : cartes partagées", t2.partage === true);
  t.check("la liste des salons montre le mode", (await C.api("confront/list")).salons.find((g) => g.gid === t2.gid)?.partage === true);
  await B.api("confront/act", { gid: t1.gid, action: { type: "rejoindre" } });
  t.check("un autre joueur ne peut pas changer le mode", (await B.api("confront/reglage", { gid: t1.gid, partage: true })).status === 403);
  t.check("l'hôte change le mode dans le salon", (await A.api("confront/reglage", { gid: t1.gid, partage: true })).partage === true && (await A.api("confront/reglage", { gid: t1.gid, partage: false })).partage === false);
  await A.api("confront/act", { gid: t1.gid, action: { type: "lancer" } });
  t.check("chacun son deck : venir sans carte quand on en a, refusé", (await A.api("confront/act", { gid: t1.gid, action: { type: "contribuer", cartes: [] } })).status === 400);
  t.check("le mode ne change plus une fois lancé", (await A.api("confront/reglage", { gid: t1.gid, partage: true })).status === 400);
  await A.api("confront/act", { gid: t1.gid, action: { type: "abandon" } });
  await B.api("confront/act", { gid: t2.gid, action: { type: "rejoindre" } });
  await A.api("confront/act", { gid: t2.gid, action: { type: "lancer" } });
  t.check("cartes partagées : venir avec des persos prêtés, accepté", (await A.api("confront/act", { gid: t2.gid, action: { type: "contribuer", cartes: [] } })).vue?.phase != null);
  await A.api("confront/act", { gid: t2.gid, action: { type: "abandon" } });

  t.section("Quitter le salon");
  const t3 = await A.api("confront/create", { nom: "Quitter" });
  await B.api("confront/act", { gid: t3.gid, action: { type: "rejoindre" } });
  const q = await B.api("confront/act", { gid: t3.gid, action: { type: "quitter" } });
  t.check("quitter le salon avant de lancer : on n'y est plus", q.spectateur === true && q.vue.joueurs.length === 1);

  t.section("Duel depuis un profil");
  const d1 = await A.api("confront/create", { invite: IDS.p2 });
  t.check("défi : table privée de duel, chacun son deck", d1.duel === IDS.p2 && d1.public === false && d1.partage === false && d1.nom.includes("Bram"), d1.nom);
  t.check("la personne défiée reçoit une notification", (await B.api("pulse", { after: null })).notifs.items.some((n) => n.kind === "confront" && n.data?.go === "confront/" + d1.gid));
  t.check("le défi apparaît dans ses salons", (await B.api("confront/list")).defis.some((g) => g.gid === d1.gid));
  t.check("le duel n'est pas dans les salons publics", !(await C.api("confront/list")).salons.some((g) => g.gid === d1.gid));
  t.check("quelqu'un d'autre ne peut pas s'asseoir", (await C.api("confront/act", { gid: d1.gid, action: { type: "rejoindre" } })).status === 403);
  t.check("pas de mode partagé en duel", (await A.api("confront/reglage", { gid: d1.gid, partage: true })).status === 400);
  t.check("refuser le défi", (await B.api("confront/refuser", { gid: d1.gid })).ok === true && !(await B.api("confront/list")).defis.some((g) => g.gid === d1.gid));
  t.check("le joueur qui a défié est prévenu du refus", (await A.api("pulse", { after: null })).notifs.items.some((n) => n.kind === "confront" && n.text.includes("refusé")));
  t.check("après un refus, on ne peut plus rejoindre", (await B.api("confront/act", { gid: d1.gid, action: { type: "rejoindre" } })).status === 400);
  t.check("on ne peut pas se défier soi-même", (await A.api("confront/create", { invite: IDS.p1 })).status === 400);
  const d2 = await A.api("confront/create", { invite: IDS.p2 });
  const acc = await B.api("confront/act", { gid: d2.gid, action: { type: "rejoindre" } });
  t.check("accepter le défi : les deux à la table", acc.vue?.joueurs.length === 2);
  await A.api("confront/act", { gid: d2.gid, action: { type: "quitter" } });

  t.section("Page");
  const { chromium } = await playwright();
  browser = await chromium.launch();
  for (const [label, vp] of [["ordi", { width: 1280, height: 860 }], ["mobile", { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({ viewport: vp }), page = await ctx.newPage(), errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await ctx.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
    await page.goto(`${srv.base}/auth/dev?id=${IDS.p1}&name=Aiko`); await page.waitForTimeout(2500);
    await page.goto(`${srv.base}/#/confront`); await page.waitForTimeout(1500);
    t.check(`${label} · création : les deux modes, « chacun son deck » coché`, (await page.locator('[name="cfMode"]').count()) === 2 && (await page.locator('[name="cfMode"][value="deck"]').isChecked()));
    await page.click('label.cf-mode:has([value="partage"])');
    await page.fill("#cfNom", "Salon " + label); await page.click('[data-act="cf-create"]'); await page.waitForTimeout(1500);
    t.check(`${label} · salon : le mode choisi est affiché et modifiable par l'hôte`, (await page.locator('.cf-modebox .cf-mode.on').innerText()).includes("partagées") && (await page.locator("[data-cfmode]").count()) === 2);
    await page.click('[data-cfmode="deck"]'); await page.waitForTimeout(800);
    t.check(`${label} · l'hôte repasse en « chacun son deck »`, (await page.locator('.cf-modebox .cf-mode.on').innerText()).includes("Chacun son deck"));
    await page.click('[data-act="cf-share"]'); await page.waitForTimeout(400);
    t.check(`${label} · partager : le lien du salon`, (await page.locator(".cf-share input").inputValue()).includes("/#/confront/"));
    await page.click('[data-cfsh="chat"]'); await page.waitForTimeout(1000);
    const chatMsgs = (await A.api("pulse", { after: null })).chat?.msgs || (await A.api("pulse", { after: null })).chat || [];
    t.check(`${label} · partager dans le chat du QG`, JSON.stringify(chatMsgs).includes("Salon " + label), chatMsgs);
    await page.screenshot({ path: `tests/reports/confront-salon-${label}.png`, fullPage: true });
    await page.click('[data-cfa=\'{"type":"quitter"}\']'); await page.waitForTimeout(1000);
    t.check(`${label} · « Quitter le salon »`, (await A.api("confront/list")).miennes.every((g) => g.nom !== "Salon " + label));
    await page.goto(`${srv.base}/#/profil/${IDS.p2}`); await page.waitForTimeout(2000);
    await page.click("[data-cfdefi]"); await page.waitForTimeout(1500);
    t.check(`${label} · profil : « Défier en duel » ouvre la table du duel`, page.url().includes("#/confront/") && (await page.locator(".cf-modebox").innerText()).includes("Duel"));
    t.check(`${label} · aucune erreur JavaScript`, errors.length === 0, errors);
    await ctx.close();
  }
} catch (e) { t.check("exécution sans erreur", false, String(e.stack || e)); }
finally { t.done(); await browser?.close(); await srv.stop(); }
