// Ouvertures en 3D : la pochette (un booster, 5 cartes) se déchire, le coffre (2 boosters, 10 cartes) se brise,
// les cartes se retournent puis le récapitulatif s'affiche ; les cosmétiques du Sanctuaire passent au dévoilement
// habituel ; « Version légère » revient à l'ancienne ouverture. Les cartes sont celles tirées par le serveur.
import { startServer, player, reporter, IDS, playwright, ROOT, grant } from "./lib.mjs";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

const OUT = process.env.REPORT_DIR || join(ROOT, "tests/reports");
mkdirSync(OUT, { recursive: true });
const srv = await startServer({ port: +(process.env.PORT || 8879) });
const t = reporter("Ouvertures en 3D");
let browser;
const st = (page) => page.evaluate(() => Open3D.state);
const until = (page, f, ms = 60000) => page.waitForFunction(f, null, { timeout: ms, polling: 250 }).then(() => true).catch(() => false);
try {
  const A = await player(srv.base, IDS.p1, "Aiko");
  await A.api("state");
  grant(srv, [A], { free: 10, chakra: 20000 });
  const { chromium } = await playwright();
  browser = await chromium.launch();
  for (const [label, vp] of [["ordi", { width: 1280, height: 800 }], ["mobile", { width: 390, height: 844 }]]) {
    t.section(label);
    const ctx = await browser.newContext({ viewport: vp }), page = await ctx.newPage(), errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await ctx.addInitScript(() => { localStorage.setItem("rz-3d", "1"); window.__speed = 6; });
    await page.goto(`${srv.base}/auth/dev?id=${IDS.p1}&name=Aiko`); await page.waitForTimeout(2500);

    // un booster : la pochette
    const owned0 = Object.keys((await A.api("state")).state.owned).length;
    await page.evaluate(() => startOpening(false, null, 1));
    t.check("un booster : la pochette 3D s'affiche", await until(page, () => Open3D.state?.kind === "pack" && !!document.querySelector("#o3 canvas")));
    await page.waitForTimeout(800); await page.screenshot({ path: join(OUT, `o3-${label}-pochette.png`) });
    // déchirer au doigt le long du pointillé
    const box = await page.locator("#o3 canvas.o3-c").boundingBox(), cx = box.x + box.width / 2, cy = box.y + box.height * .42;
    await page.mouse.move(cx - 40, cy); await page.mouse.down();
    for (let k = 1; k <= 10; k++) await page.mouse.move(cx - 40 + k * 14, cy);
    await page.mouse.up();
    const torn = await st(page);
    t.check("la déchirure suit le doigt", torn && (torn.phase === "tearing" || torn.phase === "opening" || torn.phase === "cards"), torn);
    await page.screenshot({ path: join(OUT, `o3-${label}-dechire.png`) });
    await page.evaluate(() => Open3D.open());
    t.check("la pochette s'ouvre : 5 cartes face cachée", await until(page, () => Open3D.state?.phase === "cards" && Open3D.state.cards === 5));
    await page.screenshot({ path: join(OUT, `o3-${label}-cartes.png`) });
    await page.evaluate(() => Open3D.flipAll());
    t.check("toutes retournées, puis le bouton du récapitulatif", await until(page, () => Open3D.state?.phase === "done" && !document.getElementById("o3Done").hidden, 90000));
    await page.screenshot({ path: join(OUT, `o3-${label}-retournees.png`) });
    await page.click("#o3Done");
    t.check("récapitulatif : les 5 cartes du serveur", await until(page, () => document.querySelectorAll(".summary .kcw, .summary > *").length === 5, 10000));
    t.check("les cartes sont bien dans la collection", Object.keys((await A.api("state")).state.owned).length >= owned0);
    await page.click('[data-act="stage-close"]'); await page.waitForTimeout(500);

    // deux boosters : le coffre
    await page.evaluate(() => startOpening(false, null, 2));
    t.check("deux boosters : le coffre 3D s'affiche", await until(page, () => Open3D.state?.kind === "chest"));
    await page.waitForTimeout(600); await page.screenshot({ path: join(OUT, `o3-${label}-coffre.png`) });
    await page.evaluate(() => Open3D.open());
    t.check("le coffre se brise : 10 cartes", await until(page, () => Open3D.state?.phase === "cards" && Open3D.state.cards === 10, 90000));
    await page.screenshot({ path: join(OUT, `o3-${label}-coffre-cartes.png`) });
    await page.evaluate(() => Open3D.flipAll());
    t.check("coffre : toutes retournées", await until(page, () => Open3D.state?.phase === "done", 120000));
    await page.click("#o3Done");
    t.check("coffre : récapitulatif de 10 cartes", await until(page, () => document.querySelectorAll(".summary > *").length === 10, 10000));
    await page.click('[data-act="stage-close"]'); await page.waitForTimeout(500);

    // invocation ×5 : la pochette, puis le dévoilement habituel des cosmétiques
    await page.evaluate(() => zSummon(5));
    t.check("invocation ×5 : la pochette 3D", await until(page, () => Open3D.state?.kind === "pack"));
    await page.evaluate(() => Open3D.open());
    t.check("puis les objets se dévoilent comme avant", await until(page, () => !!document.getElementById("revealBtn"), 60000));
    await page.click('[data-act="skip"]'); await page.waitForTimeout(400);
    await page.click('[data-act="stage-close"]').catch(() => {}); await page.waitForTimeout(400);

    // version légère : l'ancienne ouverture
    await page.evaluate(() => startOpening(false, null, 1));
    await until(page, () => !!document.getElementById("o3Light"));
    await page.click("#o3Light"); await page.waitForTimeout(600);
    t.check("version légère : l'ancien booster à tirer", (await page.locator("#pack").count()) === 1 && !(await page.locator("#o3").count()));
    await page.click('[data-act="stage-back"]'); await page.waitForTimeout(300); await page.click('[data-act="stage-close"]').catch(() => {});
    await page.evaluate(() => localStorage.setItem("rz-3d", "1"));
    t.check("aucune erreur JavaScript", errors.length === 0, errors);
    await ctx.close();
  }
} catch (e) { t.check("exécution sans erreur", false, String(e.stack || e)); }
finally { t.done(); await browser?.close(); await srv.stop(); }
