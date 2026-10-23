// La page de prévisualisation (serveur de test dans le navigateur) : tous les parcours doivent y marcher,
// sur téléphone et avec les animations réduites. Construire d'abord : node tools/preview/build.mjs
import { reporter, playwright, ROOT, sleep } from "./lib.mjs";
import * as G from "../worker/game.js";
import { botAction } from "../worker/confront/bots.mjs";
import { createServer } from "node:http";
import { readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const OUT = process.env.REPORT_DIR || join(ROOT, "tests/reports/preview");
mkdirSync(OUT, { recursive: true });
const html = readFileSync(join(ROOT, "tools/preview/dist/re-zero-preview.html"));
const port = +(process.env.PORT || 8898);
const http = createServer((q, r) => { r.writeHead(200, { "content-type": "text/html; charset=utf-8" }); r.end(html); }).listen(port);
const t = reporter("Prévisualisation (serveur dans le navigateur)");
const { chromium } = await playwright();
const browser = await chromium.launch();
// choisit un booster sur la page Boosters comme un joueur (onglet, booster), puis renvoie le sélecteur du bouton Ouvrir
async function choisir(page, packId, paid = false) {
  await page.evaluate(() => { location.hash = "#/boosters"; }); await page.waitForTimeout(400);
  await page.click(`[data-seg="packTab"][data-v="${paid ? "shop" : "free"}"] >> visible=true`).catch(() => {}); await page.waitForTimeout(250);
  await page.click(`[data-pick="${packId}"] >> visible=true`).catch(() => {}); await page.waitForTimeout(250);
  return `[data-act="open-pack"][data-p="${packId}"]${paid ? "[data-paid]" : ":not([data-paid])"} >> visible=true`;
}
try {
  for (const [label, opts] of [["mobile", { viewport: { width: 390, height: 844 }, hasTouch: true }], ["réduit", { viewport: { width: 390, height: 844 }, reducedMotion: "reduce" }], ["ordi", { viewport: { width: 1366, height: 900 } }]]) {
    const ctx = await browser.newContext(opts), page = await ctx.newPage(), errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error" && !/favicon|ERR_/.test(m.text())) errors.push("console : " + m.text()); });
    page.on("dialog", (d) => { errors.push("boîte de dialogue : " + d.message()); d.dismiss(); });
    const go = async (h) => { await page.evaluate((h) => { location.hash = "#/" + h; }, h); await page.waitForTimeout(600); };
    const panel = async () => { if (await page.locator("#rzpPanel[hidden]").count()) await page.click("#rzpToggle"); await page.waitForTimeout(200); };
    const tool = async (k) => { await panel(); await page.click(`[data-rzp-tool="${k}"]`); await page.waitForLoadState("load"); await page.waitForTimeout(3500); };
    const who = async (id) => { await panel(); await page.click(`[data-rzp-who="${id}"]`); await page.waitForLoadState("load"); await page.waitForTimeout(3500); };
    await page.goto(`http://localhost:${port}/`); await page.waitForTimeout(4500);
    t.check(`${label} · ouverture : connecté en Reichi (admin et dev)`, await page.evaluate(() => SRV && IS_ADMIN && IS_DEV && ME === "d666024039776518157"));
    await tool("pop");
    t.check(`${label} · « Peupler le QG » : 5 joueurs et des annonces`, await page.evaluate(() => shared.players.length >= 5 && shared.market.length >= 1));
    await tool("ess"); await tool("free");
    // booster et coffre
    await page.click(await choisir(page, "coffre")); await page.waitForTimeout(1200);
    await page.click("#cfKey", { force: true });
    await page.waitForSelector("#revealBtn", { timeout: 20000 }).catch(() => {});
    t.check(`${label} · coffre : animation puis les 5 cartes une par une`, (await page.locator("#stage .pdots i").count()) === 5 && (await page.locator("#revealBtn").count()) === 1);
    await page.click('#stage [data-act="skip"]'); await page.waitForTimeout(400);
    t.check(`${label} · coffre : récapitulatif`, (await page.locator(".summary [data-card]").count()) === 5);
    await page.click('#stage [data-act="stage-close"]');
    // boutique, sanctuaire, atelier
    await go("boutique"); const c0 = await page.evaluate(() => save.chakra);
    const id = await page.getAttribute(".zs-tile:has(.zs-price:not(.own):not(.only)) >> nth=0", "data-zitem"); await page.click(`[data-zitem="${id}"] >> nth=0`); await page.waitForTimeout(300); await page.dblclick(`#overlay [data-zbuy="${id}"]`); await page.waitForTimeout(1200); await page.click('#overlay [data-act="close"]').catch(() => {});
    t.check(`${label} · Boutique : achat débité une fois`, (await page.evaluate(() => save.chakra)) === c0 - G.COS_PRICE[G.COS_BY_ID[id].rar]);
    await go("sanctuaire"); const c1 = await page.evaluate(() => save.chakra);
    await page.click('[data-zsum="5"]'); await page.waitForSelector("#stage #pack", { timeout: 15000 }).catch(() => {});
    await page.click("#pack"); await page.waitForTimeout(900); await page.click('[data-act="skip"]'); await page.waitForTimeout(300);
    t.check(`${label} · Sanctuaire ×5 (pochette) : 5 objets, un débit`, (await page.locator(".summary .ocos").count()) === 5 && (await page.evaluate(() => save.chakra)) === c1 - G.summonCost(5));
    if (label === "mobile") await page.screenshot({ path: join(OUT, "preview-sanctuaire-mobile.png") });
    await page.click('[data-act="stage-close"]').catch(() => {});
    const card = await page.evaluate(() => Object.keys(save.owned).find((k) => has(k)));
    await go("atelier/" + card);
    await page.click('[data-zset][data-ref^="i:"] >> nth=0'); await page.click("[data-zsave]"); await page.waitForTimeout(800);
    t.check(`${label} · Atelier : design enregistré`, await page.evaluate((c) => !!cosOf(save).designs[c], card));
    // Défilé : Reichi ouvre, deux joueurs s'inscrivent et votent
    await go("defile"); await page.fill("#defTitle", "Défilé de test"); await page.click('[data-act="def-prev"]'); await page.click('[data-act="def-new"]'); await page.waitForTimeout(1200);
    await page.click('[data-act="def-enter"]'); await page.waitForTimeout(1000);
    await who("300000000000000003"); await go("defile"); await page.waitForTimeout(1200); await page.click('[data-act="def-enter"]'); await page.waitForTimeout(1000);
    await who("666024039776518157"); await go("defile"); await page.waitForTimeout(1200); await page.click('[data-act="def-votes"]'); await page.waitForTimeout(1000);
    await who("300000000000000004"); await go("defile"); await page.waitForTimeout(1500);
    await page.click('[data-defvote="d300000000000000003"]'); await page.waitForTimeout(1000);
    t.check(`${label} · Défilé : vote enregistré`, await page.evaluate(() => DEF.current?.myVote === "d300000000000000003"));
    await who("666024039776518157"); await go("defile"); await page.waitForTimeout(1500);
    await page.click('[data-act="def-close"]'); await page.waitForTimeout(200); await page.click('[data-act="def-close"]'); await page.waitForTimeout(1500);
    t.check(`${label} · Défilé : clôture par confirmation dans la page`, await page.evaluate(() => DEF.current?.phase === "clos"));
    // Créateur (Reichi est admin et dev) : un cosmétique publié arrive aussitôt en Boutique
    await go("createur"); await page.waitForTimeout(800);
    await page.click('[data-seg="crTab"][data-v="cos"]'); await page.waitForTimeout(300);
    await page.click('[data-cr-new="cos"]'); await page.waitForTimeout(300);
    await page.fill('[data-crf="name"]', "Aura " + label); await page.click("[data-cr-save]"); await page.waitForTimeout(150); await page.click("[data-cr-save]"); await page.waitForTimeout(2500);
    t.check(`${label} · Créateur : cosmétique publié et dans la Boutique`, await page.evaluate((n) => COSMETICS.some((c) => c.name === n) && Z_COLLECTIONS.some((z) => z.items.some((id) => COS_BY_ID[id]?.name === n)), "Aura " + label));
    // Confrontation : le livret de règles (rôles, branches, 25 cartes), puis une partie avec 2 bots jusqu'à la fin
    await go("confront"); await page.waitForTimeout(1200);
    t.check(`${label} · Confrontation : les 3 rôles expliqués dès les salons`, (await page.locator(".rl-card").count()) === 3);
    await page.click('.cf-howto [data-p="regles"]'); await page.waitForTimeout(1500);
    t.check(`${label} · livret : rôles, 8 branches et 25 cartes illustrées`, (await page.locator(".rl-card").count()) === 3 && (await page.locator(".rg .cf-br").count()) === 8 && (await page.locator(".rg-card .cff-art.pic").count()) === 25);
    await go("confront"); await page.waitForTimeout(1200);
    await page.click('[data-act="cf-create"]'); await page.waitForTimeout(1500);
    await page.click('[data-act="cf-bot"]'); await page.waitForTimeout(800); await page.click('[data-act="cf-bot"]'); await page.waitForTimeout(800);
    await page.click(`[data-cfa='{"type":"lancer"}']`); await page.waitForTimeout(1500);
    await page.click('[data-act="cf-contrib"]'); await page.waitForTimeout(1500);
    await page.click(".cf-prop .btn >> nth=0"); await page.waitForTimeout(1500);
    let phase = "", n = 0; const t0 = Date.now();
    while (Date.now() - t0 < 180000) {
      const v = await page.evaluate(async () => { await cfLoadTable(CF.gid); return CF.table?.vue; });
      phase = v?.phase; if (phase === "fin") break;
      const a = v && botAction(v, {});
      if (a) { await page.evaluate((a) => cfAct(a), a); n++; } else await sleep(300);
    }
    if (label === "ordi") await page.screenshot({ path: join(OUT, "preview-confront-fin-ordi.png"), fullPage: true });
    t.check(`${label} · Confrontation à 3 (2 bots) : partie terminée`, phase === "fin", { phase, actions: n });
    // la base survit au rechargement
    const opened = await page.evaluate(() => save.opened);
    await page.reload(); await page.waitForTimeout(4000);
    t.check(`${label} · la partie de test est gardée après rechargement`, (await page.evaluate(() => save.opened)) === opened);
    t.check(`${label} · aucune erreur JavaScript ni boîte de dialogue`, errors.length === 0, errors.slice(0, 5));
    await ctx.close();
  }
} catch (e) { t.check("exécution sans erreur", false, String(e.stack || e)); }
finally { t.done(); await browser.close(); http.close(); }
