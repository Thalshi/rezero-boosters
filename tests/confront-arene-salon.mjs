// Confrontation entièrement dans l'arène 3D : le salon, le choix des cartes et le choix du perso se font
// par-dessus la scène (mêmes boutons que la page classique), puis la partie continue dans la même arène.
import { startServer, player, reporter, IDS, grant, playwright, ROOT } from "./lib.mjs";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

const OUT = process.env.REPORT_DIR || join(ROOT, "tests/reports");
mkdirSync(OUT, { recursive: true });
const srv = await startServer({ port: +(process.env.PORT || 8885) });
const t = reporter("Confrontation · salon et choix des cartes dans l'arène");
let browser;
const until = (page, f, ms = 30000) => page.waitForFunction(f, null, { timeout: ms, polling: 250 }).then(() => true).catch(() => false);
try {
  const A = await player(srv.base, IDS.p1, "Aiko"), B = await player(srv.base, IDS.p2, "Bram");
  for (const x of [A, B]) await x.api("state");
  grant(srv, [A, B], { free: 6 });
  for (const x of [A, B]) for (let i = 0; i < 6; i++) await x.api("open", { pack: "mix" });
  const { chromium } = await playwright();
  browser = await chromium.launch();
  for (const [label, vp] of [["ordi", { width: 1366, height: 860 }], ["mobile", { width: 390, height: 844 }]]) {
    t.section(label);
    const ctx = await browser.newContext({ viewport: vp, hasTouch: label === "mobile" }), page = await ctx.newPage(), errors = [];
    page.on("pageerror", (e) => errors.push(e.stack || e.message));
    await ctx.addInitScript(() => { localStorage.setItem("cf-vue", "arene"); window.__arSpeed = 4; });
    await page.goto(`${srv.base}/auth/dev?id=${IDS.p1}&name=Aiko`); await page.waitForTimeout(2000);
    const c = await A.api("confront/create", { nom: "Salon 3D " + label, public: true }), gid = c.gid;
    await page.goto(`${srv.base}/#/confront/${gid}`);
    t.check("le salon s'ouvre dans l'arène", await until(page, () => { const r = document.getElementById("ar-root"); return !!r && !r.hidden && r.classList.contains("pre"); }, 60000));
    t.check("salon : le choix des cartes de la table et « Lancer » par-dessus la scène", await until(page, () => !!document.querySelector(".ar-pre-body.ph-lobby [data-cfmode]")));
    t.check("salon : 1 socle, le mien", (await page.locator(".ar-tag.pre").count()) === 1);
    await B.api("confront/act", { gid, action: { type: "rejoindre" } });
    t.check("un joueur rejoint : son socle apparaît, « pas prêt »", await until(page, () => document.querySelectorAll(".ar-tag.pre").length === 2 && /pas prêt/.test(document.getElementById("ar-tags").textContent), 20000));
    await B.api("confront/pret", { gid, pret: true });
    t.check("il se met prêt : l'hôte peut lancer", await until(page, () => !!document.querySelector('.ar-pre [data-cfa=\'{"type":"lancer"}\']'), 20000));
    await page.screenshot({ path: join(OUT, `arene-salon-${label}.png`) });
    await page.locator('.ar-pre [data-cfa=\'{"type":"lancer"}\']').dispatchEvent("click");
    t.check("choix des cartes dans l'arène : ma collection en vraies cartes", await until(page, () => document.querySelectorAll(".ar-pre-body.ph-contributions .cf-pick").length > 0, 30000));
    await page.locator(".ar-pre .cf-pick").first().dispatchEvent("click"); await page.waitForTimeout(400);
    t.check("toucher une carte la pose dans le deck", (await page.locator(".ar-pre .cf-slot.on").count()) === 1);
    await page.screenshot({ path: join(OUT, `arene-draft-${label}.png`) });
    await page.locator('.ar-pre [data-act="cf-contrib"]').dispatchEvent("click");
    const mineB = (await B.api("confront/list")).cartes[0].cardId;
    await B.api("confront/act", { gid, action: { type: "contribuer", cartes: [mineB] } });
    t.check("choix du perso dans l'arène", await until(page, () => document.querySelectorAll(".ar-pre-body.ph-choix .cf-prop").length > 0, 30000));
    await page.screenshot({ path: join(OUT, `arene-choix-${label}.png`) });
    await page.locator(".ar-pre .cf-prop .btn").first().dispatchEvent("click");
    const pB = (await B.api("confront/state", { gid })).vue.propositions[0].instanceId;
    await B.api("confront/act", { gid, action: { type: "choisir", instanceId: pB } });
    t.check("la partie démarre dans la même arène : panneaux retirés, main de cartes", await until(page, () => !document.getElementById("ar-root").classList.contains("pre") && document.querySelectorAll("#ar-hand .ar-hc").length > 0, 40000));
    await page.screenshot({ path: join(OUT, `arene-debut-${label}.png`) });
    t.check("aucune erreur JavaScript", errors.length === 0, errors);
    await A.api("confront/act", { gid, action: { type: "abandon" } });
    await ctx.close();
  }
} catch (e) { t.check("exécution sans erreur", false, String(e.stack || e)); }
finally { t.done(); await browser?.close(); await srv.stop(); }
