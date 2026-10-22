// Galerie (contrôle qualité) et laboratoire admin : droits, isolation de la vraie partie, ouvertures imposées,
// puis parcours navigateur (galerie, aperçu, « tester l'ouverture avec cette carte », coffre du labo) sur ordi et téléphone.
import { startServer, player, reporter, IDS, playwright, ROOT } from "./lib.mjs";
import * as G from "../worker/game.js";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

const OUT = process.env.REPORT_DIR || join(ROOT, "tests/reports");
mkdirSync(OUT, { recursive: true });
const srv = await startServer({ port: +(process.env.PORT || 8830) });
const t = reporter("Admin · galerie et laboratoire");
let browser;
try {
  const A = await player(srv.base, IDS.admin, "Billy"), P = await player(srv.base, IDS.p1, "Teo");
  for (const p of [A, P]) await p.api("state");

  t.section("Droits");
  for (const a of ["lab/state", "lab/open", "lab/reset", "lab/summon", "lab/give", "qa/list", "qa/set"]) {
    const r = await P.api(a, { id: "billy", status: "ok", pack: "coffre" });
    if (r.status !== 403) t.check(`joueur : ${a} refusé`, false, r.status);
  }
  t.check("un joueur n'a accès à aucune route du labo ni du contrôle qualité", true);
  await A.api("lab/state");
  await A.api("qa/set", { id: "billy", status: "revoir", note: "deux visages" });
  const docLab = await P.doc("GET", "lab/" + A.id), docQa = await P.doc("GET", "qa/cards"), docLabA = await A.doc("GET", "lab/" + A.id);
  t.check("l'API des documents ne donne ni le labo ni le contrôle qualité (même à l'admin)", [docLab, docQa, docLabA].every((d) => d.body?.exists === false && !d.body?.data), [docLab.body, docQa.body, docLabA.body]);
  const listLab = await A.coll("GET", "lab");
  t.check("ni en liste", !(listLab.body?.docs || []).length, listLab.status);

  t.section("Contrôle qualité");
  const qa = await A.api("qa/list");
  t.check("avis enregistré avec motif et auteur", qa.qa?.billy?.s === "revoir" && qa.qa.billy.note === "deux visages" && qa.qa.billy.by === "Billy");
  t.check("statut inconnu refusé", (await A.api("qa/set", { id: "billy", status: "parfait" })).status === 400);
  t.check("carte inconnue refusée", (await A.api("qa/set", { id: "nexiste", status: "ok" })).status === 400);
  t.check("effacer un avis", !(await A.api("qa/set", { id: "billy", status: null })).qa.billy);

  t.section("Isolation : le labo ne touche jamais la vraie partie");
  const real0 = (await A.api("state")).state, docs0 = srv.rows("SELECT COUNT(*) AS n FROM docs WHERE coll IN ('feed','players','market')")[0].n;
  const reset = await A.api("lab/reset", { chakra: 777, free: 5, sinceMythic: G.MYTHIC_PITY - 1 });
  t.check("partie de test : valeurs imposées", reset.lab.chakra === 777 && reset.lab.free === 5 && reset.lab.sinceMythic === G.MYTHIC_PITY - 1);
  const pity = await A.api("lab/open", { pack: "mix", all: true });
  t.check(`pity à ${G.MYTHIC_PITY - 1} : la Mythique tombe au booster suivant du labo`, pity.cards.some((x) => G.CARD_BY_ID[x.id].rar === "m"), pity.cards.map((x) => G.CARD_BY_ID[x.id].rar));
  const picks = [["m", 0], ["m", 1], ["c", 0], ["c", 1], ["c", 2]].map(([r, i]) => ({ id: G.SKINS.filter((c) => c.rar === r)[i].id, gold: false }));
  const forced = await A.api("lab/open", { pack: "coffre", cards: picks, scenario: "tr-jumeaux" });
  t.check("ouverture imposée : les 5 cartes choisies et le scénario", forced.status === 200 && forced.cards.map((x) => x.id).join() === picks.map((x) => x.id).join() && forced.scenario === "tr-jumeaux" && forced.compatible === true);
  const wrong = await A.api("lab/open", { pack: "coffre", cards: picks, scenario: "se-arcenciel" });
  t.check("scénario imposé incompatible : joué mais signalé", wrong.status === 200 && wrong.compatible === false);
  t.check("4 cartes imposées : refusé", (await A.api("lab/open", { pack: "coffre", cards: picks.slice(0, 4) })).status === 400);
  t.check("scénario inconnu : refusé", (await A.api("lab/open", { pack: "coffre", scenario: "triche" })).status === 400);
  const sum = await A.api("lab/summon", { rars: ["m", "m", "c", "c", "c"] });
  t.check("invocation imposée (2 Mythiques)", sum.status === 200 && sum.got.filter((x) => x.rar === "m").length === 2);
  const real1 = (await A.api("state")).state, docs1 = srv.rows("SELECT COUNT(*) AS n FROM docs WHERE coll IN ('feed','players','market')")[0].n;
  t.check("vraie partie inchangée (essence, cartes, boosters, inventaire)", real1.chakra === real0.chakra && real1.opened === real0.opened && JSON.stringify(real1.owned) === JSON.stringify(real0.owned) && JSON.stringify(real1.cos || {}) === JSON.stringify(real0.cos || {}));
  t.check("aucune trace dans le fil, les joueurs ou le marché", docs1 === docs0, { avant: docs0, après: docs1 });
  t.check("le labo n'est jamais dans la table des joueurs", srv.rows("SELECT COUNT(*) AS n FROM players WHERE data LIKE '%\"lab\":true%'")[0].n === 0);

  t.section("Navigateur");
  const { chromium } = await playwright();
  browser = await chromium.launch();
  for (const [label, vp] of [["ordi", { width: 1366, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
    const errors = [];
    const ctx = await browser.newContext({ viewport: vp });
    const page = await ctx.newPage(); page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${srv.base}/auth/dev?id=${IDS.admin}&name=Billy`); await page.waitForTimeout(2500);
    await page.goto(`${srv.base}/#/galerie`); await page.waitForTimeout(1500);
    t.check(`${label} · galerie : toutes les cartes, même cachées`, (await page.locator(".gal-c").count()) >= 60 && (await page.evaluate(() => ALL_CARDS.length)) === G.ALL_CARDS.length);
    await page.selectOption("#galCos", G.COSMETICS.find((c) => c.slot === "cadre").id); await page.waitForTimeout(300);
    await page.check("#galGold"); await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT, `admin-galerie-${label}.png`) });
    await page.fill("#galQ", "billy"); await page.waitForTimeout(600);
    t.check(`${label} · recherche`, (await page.locator(".gal-c").count()) >= 1 && (await page.locator(".gal-c").count()) < 40);
    await page.click(".gal-c >> nth=0"); await page.waitForTimeout(300);
    await page.fill("#qaNote", "test visuel"); await page.click('[data-qa="ok"]'); await page.waitForTimeout(800);
    t.check(`${label} · marquage qualité depuis l'aperçu`, (await page.locator(".gal-tags .qa-ok").count()) >= 1);
    await page.screenshot({ path: join(OUT, `admin-galerie-zoom-${label}.png`) });
    const own0 = await page.evaluate(() => JSON.stringify(save.owned));
    await page.click('[data-act="gal-test"]'); await page.waitForTimeout(1200);
    t.check(`${label} · « tester l'ouverture avec cette carte » ouvre le labo avec la carte`, (await page.evaluate(() => location.hash)).startsWith("#/labo/") && (await page.evaluate(() => lab.picks[0])) != null);
    await page.screenshot({ path: join(OUT, `admin-labo-${label}.png`), fullPage: true });
    // imposer les 4 autres cartes et un scénario, puis ouvrir
    for (let i = 1; i < 5; i++) await page.selectOption(`[data-labpick="${i}"]`, G.SKINS.filter((c) => c.rar === "c")[i].id);
    await page.selectOption("#labSc", "fk-redemarrage");
    await page.click('[data-act="lab-open"]'); await page.waitForTimeout(1200);
    t.check(`${label} · coffre du labo marqué « rien n'est réel »`, (await page.locator(".lab-pill").count()) === 1 && (await page.locator("#cfChest").count()) === 1);
    await page.click("#cfKey"); await page.waitForSelector("#revealBtn", { timeout: 15000 });
    await page.click('[data-act="skip"]'); await page.waitForTimeout(300);
    t.check(`${label} · récapitulatif du labo : Rejouer et Retour, pas d'achat`, (await page.locator('#stage [data-act="lab-replay"]').count()) === 1 && (await page.locator('#stage [data-act="again"]').count()) === 0);
    await page.click('#stage [data-act="lab-replay"]'); await page.waitForTimeout(800);
    t.check(`${label} · rejouer la même ouverture`, (await page.locator("#cfChest").count()) === 1);
    await page.click('[data-act="skip"]'); await page.waitForTimeout(300); await page.click('[data-act="lab-back"]'); await page.waitForTimeout(800);
    t.check(`${label} · la vraie collection n'a pas bougé`, (await page.evaluate(() => JSON.stringify(save.owned))) === own0);
    t.check(`${label} · aucune erreur JavaScript`, errors.length === 0, errors);
    await ctx.close();
  }
  const pctx = await browser.newContext(); const pp = await pctx.newPage();
  await pp.goto(`${srv.base}/auth/dev?id=${IDS.p1}&name=Teo`); await pp.waitForTimeout(2000);
  await pp.goto(`${srv.base}/#/galerie`); await pp.waitForTimeout(1200);
  t.check("joueur : la galerie ne montre rien (pas de spoil)", (await pp.locator(".gal-c").count()) === 0);
  await pctx.close();
} catch (e) { t.check("exécution sans erreur", false, String(e.stack || e)); }
finally { t.done(); await browser?.close(); await srv.stop(); }
