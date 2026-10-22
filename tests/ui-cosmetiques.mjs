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
    t.check(`${label} · la Boutique s'affiche`, (await page.locator(".zs-tile").count()) > 30);
    await page.screenshot({ path: join(OUT, `cos-boutique-${label}.png`) });
    t.check(`${label} · Boutique : bannière de la collection à la une et rayons par collection`, (await page.locator(".zs-hero").count()) === 1 && (await page.locator(".zs-row").count()) >= 5);
    const first = await page.getAttribute(".zs-tile:has(.zs-price:not(.own):not(.only)) >> nth=0", "data-zitem");
    await page.click(`[data-zitem="${first}"] >> nth=0`); await sleep(300);
    t.check(`${label} · Boutique : fiche avec aperçu sur ton profil`, (await page.locator(".zs-sheet .zs-prof").count()) === 1);
    const c0 = await page.evaluate(() => save.chakra);
    await page.click(`#overlay [data-zbuy="${first}"]`); await sleep(300);
    await page.click('#overlay [data-act="close"]').catch(() => {});
    t.check(`${label} · achat en boutique`, await page.evaluate((id) => !!save.cos.own[id], first));
    t.check(`${label} · le prix est débité`, (await page.evaluate(() => save.chakra)) === c0 - (await page.evaluate((id) => COS_PRICE[COS_BY_ID[id].rar], first)));
    t.check(`${label} · un objet du Sanctuaire ne s'achète pas`, (await page.evaluate(() => buyCosmeticS(save, "cadre-prisme").error || "")).length > 0);

    await go(page, "sanctuaire");
    t.check(`${label} · trois offres : carte, pochette, coffre`, (await page.locator(".zoffer").count()) === 3 && (await page.locator("canvas").count()) === 0);
    await page.screenshot({ path: join(OUT, `cos-sanctuaire-${label}.png`) });
    const before = await page.evaluate(() => save.cos.inst.length);
    // ×5 : une pochette qu'on déchire, puis 5 objets un par un
    await page.click('[data-zsum="5"]'); await sleep(400);
    t.check(`${label} · ×5 : la pochette s'affiche`, (await page.locator("#stage #pack .bst").count()) === 1);
    t.check(`${label} · invocation ×5 : 5 instances`, (await page.evaluate(() => save.cos.inst.length)) === before + 5);
    await page.click("#pack"); await sleep(900);
    await page.click("#revealBtn"); await sleep(500);
    t.check(`${label} · retourner un objet`, (await page.locator("#stage .reveal-card.on .ocos").count()) === 1);
    await page.screenshot({ path: join(OUT, `cos-pochette-${label}.png`) });
    await page.click('[data-act="skip"]'); await sleep(300);
    t.check(`${label} · ×5 : récapitulatif des 5 objets`, (await page.locator(".summary .ocos").count()) === 5);
    t.check(`${label} · ×5 : au moins une Rare`, await page.evaluate(() => opening.cards.some((x) => RANKS.indexOf(x.c.rar) >= RANKS.indexOf("r"))));
    await page.screenshot({ path: join(OUT, `cos-resultats-${label}.png`), fullPage: true });
    await page.click('[data-act="stage-close"]'); await sleep(200);
    // ×10 : le coffre
    await page.click('[data-zsum="10"]'); await sleep(500);
    t.check(`${label} · ×10 : le coffre et sa clé`, (await page.locator("#cfChest").count()) === 1 && (await page.locator("#cfKey").count()) === 1);
    await page.click("#cfKey");
    t.check(`${label} · ×10 : 10 objets face cachée`, await page.waitForSelector(".cf-grid", { timeout: 20000 }).then(() => true).catch(() => false) && (await page.locator(".cf .slot").count()) === 10, errors);
    await page.click('[data-cflip="7"]'); await sleep(200);
    t.check(`${label} · ×10 : retourner un objet au choix`, (await page.locator(".cf .slot.flipped .ocos").count()) === 1);
    await page.click('[data-act="skip"]'); await sleep(250);
    t.check(`${label} · ×10 : récapitulatif`, (await page.locator(".summary .ocos").count()) === 10);
    await page.click('[data-act="stage-close"]'); await sleep(200);
    // ×1 : une carte qui se retourne seule
    await page.click('[data-zsum="1"]'); await sleep(1300);
    t.check(`${label} · ×1 : la carte se retourne toute seule`, (await page.locator("#stage .reveal-card.on .ocos").count()) === 1);
    await page.click('[data-act="stage-close"]').catch(() => page.evaluate(() => closeStage())); await sleep(200);
    t.check(`${label} · 16 objets invoqués au total`, (await page.evaluate(() => save.cos.inst.length)) === before + 16);
    // ×1 sans animation : directement le résultat
    await page.check("#zSkip");
    await page.click('[data-zsum="1"]'); await sleep(400);
    t.check(`${label} · invocation ×1 sans animation`, (await page.locator(".summary .ocos").count()) === 1);
    await page.click('[data-act="stage-close"]'); await sleep(200);
    await page.uncheck("#zSkip");

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
    t.check(`${label} · l'inventaire est gardé après rechargement`, (await page.evaluate(() => save.cos.inst.length)) === before + 17);
    t.check(`${label} · aucune erreur JavaScript`, errors.length === 0, errors);
    await page.close();
  }
} catch (e) { t.check("exécution sans erreur", false, String(e.stack || e)); }
finally { t.done(); await browser.close(); }
