// Boutique Arcanique, Sanctuaire des Invocations et Atelier Arcanique en mode invité (artifact.html), sur téléphone et ordinateur.
// Captures d'écran dans REPORT_DIR (ou tests/reports) : boutique, portail en cours, résultats ×5, atelier, profil.
import { reporter, playwright, ROOT, sleep } from "./lib.mjs";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

const OUT = process.env.REPORT_DIR || join(ROOT, "tests/reports");
mkdirSync(OUT, { recursive: true });
const t = reporter("Interface · cosmétiques (mode invité)");
const { chromium } = await playwright();
const browser = await chromium.launch();
const go = (page, h) => page.evaluate((h) => { location.hash = "#/" + h; }, h).then(() => sleep(300));
try {
  for (const [label, vp] of [["mobile", { width: 390, height: 844 }], ["ordi", { width: 1366, height: 900 }]]) {
    const errors = [];
    const page = await browser.newPage({ viewport: vp });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("file://" + join(ROOT, "artifact.html")); await sleep(1000);
    // une carte et de l'essence pour tester (sauvegarde locale du navigateur de test uniquement)
    await page.evaluate(() => { save.chakra = 5000; save.owned.billy = { n: 1, gold: 0, first: Date.now() }; persist(); });

    await go(page, "boutique");
    t.check(`${label} · la Boutique s'affiche`, (await page.locator(".zt").count()) > 3);
    await page.screenshot({ path: join(OUT, `cos-boutique-${label}.png`) });
    const first = await page.getAttribute("[data-zbuy]", "data-zbuy");
    const c0 = await page.evaluate(() => save.chakra);
    await page.click(`[data-zbuy="${first}"]`); await sleep(300);
    t.check(`${label} · achat en boutique`, await page.evaluate((id) => !!save.cos.own[id], first));
    t.check(`${label} · le prix est débité`, (await page.evaluate(() => save.chakra)) === c0 - (await page.evaluate((id) => COS_PRICE[COS_BY_ID[id].rar], first)));
    t.check(`${label} · un objet du Sanctuaire ne s'achète pas`, (await page.evaluate(() => buyCosmeticS(save, "cadre-prisme").error || "")).length > 0);

    await go(page, "sanctuaire");
    t.check(`${label} · le portail est affiché`, (await page.locator("#sanctumHost canvas").count()) === 1);
    const before = await page.evaluate(() => save.cos.inst.length);
    await page.click('[data-zsum="5"]'); await sleep(1400);
    await page.screenshot({ path: join(OUT, `cos-portail-${label}.png`) });
    await page.waitForSelector(".zresults", { timeout: 8000 }).catch(() => {});
    t.check(`${label} · l'animation se termine`, (await page.locator(".zresults").count()) === 1, errors);
    t.check(`${label} · invocation ×5 : 5 instances`, (await page.evaluate(() => save.cos.inst.length)) === before + 5);
    t.check(`${label} · 5 objets face cachée`, (await page.locator(".zback").count()) === 5);
    await page.click(".zback >> nth=0"); await sleep(200);
    t.check(`${label} · retourner un objet`, (await page.locator(".zback").count()) === 4);
    await page.click("[data-zflipall]"); await sleep(200);
    await page.screenshot({ path: join(OUT, `cos-resultats-${label}.png`), fullPage: true });
    t.check(`${label} · ×5 : au moins une Rare`, await page.evaluate(() => ZR.results.some((x) => RANKS.indexOf(x.rar) >= RANKS.indexOf("r"))));

    // ×1 sans animation
    await page.check("#zSkip");
    await page.click('[data-zsum="1"]'); await sleep(400);
    t.check(`${label} · invocation ×1 sans animation`, (await page.locator(".zgrid.one").count()) === 1);

    await go(page, "atelier/billy");
    t.check(`${label} · l'Atelier s'ouvre sur la carte demandée`, (await page.evaluate(() => zDraftCard)) === "billy");
    await page.click(`[data-zset][data-ref="a:${first}"]`); await sleep(200);
    // une instance invoquée, sur un autre emplacement que l'objet acheté
    const inst = await page.evaluate((first) => { const it = save.cos.inst.find((x) => COS_BY_ID[x.c].slot !== COS_BY_ID[first].slot); return it && "i:" + it.i; }, first);
    await page.click(`[data-zset][data-ref="${inst}"]`); await sleep(200);
    await page.click("[data-zsave]"); await sleep(300);
    t.check(`${label} · design enregistré (2 objets)`, await page.evaluate(() => Object.keys(save.cos.designs.billy || {}).length === 2), await page.evaluate(() => save.cos.designs.billy));
    await page.click("[data-zfeat]"); await sleep(300);
    t.check(`${label} · carte vedette`, (await page.evaluate(() => save.featured)) === "billy");
    await page.screenshot({ path: join(OUT, `cos-atelier-${label}.png`), fullPage: true });

    await go(page, "carte/billy");
    t.check(`${label} · le design s'affiche sur la fiche`, (await page.locator(".wk-card .kc.cz-cadre, .wk-card .kcw.cz-aura, .wk-card .kc-a .cz-holo, .wk-card .cz-part, .wk-card .cz-orn").count()) > 0);
    await go(page, "profil/moi");
    t.check(`${label} · la carte vedette est sur le profil`, (await page.locator(".zfeat .kcw").count()) === 1);
    await page.screenshot({ path: join(OUT, `cos-profil-${label}.png`) });
    await go(page, "atelier");
    await page.click('[data-seg="zAt"][data-v="inv"]'); await sleep(200);
    t.check(`${label} · inventaire commun (compte + instances)`, (await page.locator(".zt").count()) >= 7);

    // une carte qui quitte la collection perd son design et sa place de vedette
    await page.evaluate(() => { removeCardS(save, "billy", false); persist(); });
    t.check(`${label} · carte retirée : design effacé`, await page.evaluate(() => !save.cos.designs.billy));
    await page.reload(); await sleep(900);
    t.check(`${label} · l'inventaire est gardé après rechargement`, (await page.evaluate(() => save.cos.inst.length)) === before + 6);
    t.check(`${label} · aucune erreur JavaScript`, errors.length === 0, errors);
    await page.close();
  }
} catch (e) { t.check("exécution sans erreur", false, String(e.stack || e)); }
finally { t.done(); await browser.close(); }
