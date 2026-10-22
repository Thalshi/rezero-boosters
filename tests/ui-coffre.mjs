// Coffre arcanique dans le navigateur (mode invité, artifact.html) : clé au clavier, clé ou coffre au toucher,
// chaque scénario joué jusqu'au bout, 5 cartes face cachée, récapitulatif, « Passer », animations réduites.
// Usage : node tests/ui-coffre.mjs [--tous] (par défaut : une sélection ; --tous joue les 30 scénarios sur ordi)
import { reporter, playwright, ROOT, sleep } from "./lib.mjs";
import { join } from "node:path";
import { mkdirSync } from "node:fs";
import * as G from "../worker/game.js";

const OUT = process.env.REPORT_DIR || join(ROOT, "tests/reports");
mkdirSync(OUT, { recursive: true });
const ALL = process.argv.includes("--tous");
const t = reporter("Interface · coffre arcanique");
const { chromium } = await playwright();
const browser = await chromium.launch();
const pickIds = ALL ? G.CHEST_SCENARIOS.map((x) => x.id) : ["cl-nette", "fk-redemarrage", "fk-cle", "tr-eclipse", "sp-orbite", "se-arcenciel"];

async function openChest(page, scenario, cards) {
  await page.evaluate(({ scenario, cards }) => {
    save.free = 3; persist();
    // ouverture réelle en invité, puis (pour la démo du test) on impose le scénario et des cartes compatibles
    return startOpening(false, "coffre").then(() => {
      if (cards) opening.cards = cards.map((x) => ({ c: byId[x.id], gold: x.gold, isNew: x.isNew }));
      if (scenario) opening.scenario = scenario;
      $("stage").dataset.cf = ""; drawOpening();
    });
  }, { scenario, cards });
  await sleep(500);
}
// des cartes qui rendent chaque scénario possible (le test vérifie la condition avec le vrai moteur)
const sk = (r, i = 0, who) => G.SKINS.filter((c) => c.rar === r && (!who || c.who === who))[i].id;
const SETS = {
  default: [["m", 0], ["l", 0], ["e", 0], ["r", 0], ["c", 0]],
  "tr-jumeaux": [["m", 0], ["m", 1], ["c", 0], ["c", 1], ["c", 2]],
  "tr-couronne": [["l", 0], ["l", 1], ["c", 0], ["c", 1], ["c", 2]],
  "tr-trinite": [["e", 0], ["e", 1], ["c", 0], ["c", 1], ["c", 2]],
  "se-miroir": [["e", 0], ["e", 0], ["c", 0], ["c", 1], ["c", 2]],
  "se-createur": [["e", 0, "billy"], ["c", 0], ["c", 1], ["c", 2], ["c", 3]],
  "se-arcenciel": [["c", 0], ["pc", 0], ["r", 0], ["e", 0], ["l", 0]],
};
function cardsFor(id) {
  const base = (SETS[id] || SETS.default).map(([r, i, who]) => ({ id: sk(r, i, who), gold: false, isNew: false }));
  if (id === "tr-pluie-or") { base[3].gold = true; base[4].gold = true; }
  if (id === "tr-reflet") base[4].gold = true;
  if (id === "fk-cle") base[4].gold = true;
  if (id === "tr-chrysalide" || id === "sp-kanji") base.forEach((x) => (x.isNew = true));
  return base;
}
try {
  for (const [label, vp, ids] of [["ordi", { width: 1366, height: 900 }, pickIds], ["mobile", { width: 390, height: 844 }, ["fk-grise", "tr-pluie-or", "sp-colonne"]]]) {
    const errors = [];
    const page = await browser.newPage({ viewport: vp, hasTouch: label === "mobile" });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("file://" + join(ROOT, "artifact.html")); await sleep(900);
    for (const id of ids) {
      const cards = cardsFor(id), sc = G.CHEST_BY_ID[id];
      if (!sc.when(G.chestCtx(cards))) { if (id !== "se-minuit") t.check(`${label} · ${id} : cartes de test compatibles`, false); }
      await openChest(page, id, cards);
      t.check(`${label} · ${id} : coffre et clé affichés`, (await page.locator("#cfChest").count()) === 1 && (await page.locator("#cfKey").count()) === 1);
      if (ids.indexOf(id) === 0) await page.screenshot({ path: join(OUT, `coffre-${label}-cle.png`) });
      // clé : au clavier pour le premier, au glisser pour le deuxième, au toucher sinon
      const k = ids.indexOf(id);
      if (k === 0) { await page.focus("#cfKey"); await page.keyboard.press("Enter"); }
      else if (k === 1) await page.click("#cfChest", { force: true }); // ouvrir en touchant le coffre lui-même
      else await page.click("#cfKey");
      const dur = sc.beats.reduce((a, [b, n]) => a + ({ pause: n || 400, shake: 360 * (n || 1), runes: 90 * (n || 8) + 200, ladder: 260 * 6, crystal: 460 * (n || 1), banner: 1500 }[b] ?? 1000), 0);
      await sleep(Math.min(dur * .55, 4500));
      await page.screenshot({ path: join(OUT, `coffre-${label}-${id}.png`) });
      const ok = await page.waitForSelector("#revealBtn", { timeout: dur + 6000 }).then(() => true).catch(() => false);
      t.check(`${label} · ${id} : le scénario se termine sur les 5 cartes, à dévoiler une par une`, ok && (await page.locator("#stage .pdots i").count()) === 5, errors.slice(-1));
      if (!ok) { await page.evaluate(() => closeStage()); continue; }
      await page.click("#revealBtn"); await sleep(250);
      t.check(`${label} · ${id} : toucher retourne la première carte`, (await page.locator("#stage .reveal-card.on .kc").count()) === 1);
      await page.click("#revealBtn"); await sleep(150);
      if (ids.indexOf(id) === 0) await page.screenshot({ path: join(OUT, `coffre-${label}-cartes.png`) });
      await page.click('[data-act="skip"]'); await sleep(250);
      t.check(`${label} · ${id} : récapitulatif`, (await page.locator(".summary .kcw").count()) === 5);
      if (ids.indexOf(id) === 0) await page.screenshot({ path: join(OUT, `coffre-${label}-recap.png`) });
      await page.click('[data-act="stage-close"]'); await sleep(200);
    }
    // Passer pendant l'animation : on va droit au récapitulatif, sans erreur
    await openChest(page, "fk-redemarrage", cardsFor("fk-redemarrage"));
    await page.click("#cfKey"); await sleep(700); await page.click('[data-act="skip"]'); await sleep(2500);
    t.check(`${label} · « Passer » pendant l'animation : récapitulatif, l'animation ne reprend pas`, (await page.locator(".summary .kcw").count()) === 5 && (await page.locator("#cfChest").count()) === 0);
    await page.click('[data-act="stage-close"]');
    t.check(`${label} · aucune erreur JavaScript`, errors.length === 0, errors);
    await page.close();
  }
  // animations réduites : ouverture immédiate, sans flash
  const rp = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  const rErr = []; rp.on("pageerror", (e) => rErr.push(e.message));
  await rp.goto("file://" + join(ROOT, "artifact.html")); await sleep(900);
  await openChest(rp, "sp-seisme", cardsFor("sp-seisme"));
  await rp.click("#cfKey"); await sleep(300);
  t.check("animations réduites : les cartes arrivent tout de suite", (await rp.locator("#revealBtn").count()) === 1, rErr);
  // le vrai tirage invité donne un scénario permis par ses cartes
  await rp.click('[data-act="skip"]'); await sleep(200); await rp.click('[data-act="stage-close"]');
  const real = await rp.evaluate(async () => { save.free = 3; await startOpening(false, "coffre"); const o = opening; return { scenario: o.scenario, ok: CHEST_BY_ID[o.scenario]?.when(chestCtx(o.cards.map((x) => ({ id: x.c.id, gold: x.gold, isNew: x.isNew })))) }; });
  t.check("ouverture réelle en invité : scénario choisi et compatible", !!real.scenario && real.ok, real);
} catch (e) { t.check("exécution sans erreur", false, String(e.stack || e)); }
finally { t.done(); await browser.close(); }
