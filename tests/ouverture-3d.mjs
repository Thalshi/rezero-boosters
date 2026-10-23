// Ouvertures en 3D : la pochette (un booster, 5 cartes) se déchire, le coffre (2 boosters, 10 cartes) se brise,
// les cartes se retournent puis le récapitulatif s'affiche ; les cosmétiques du Sanctuaire passent au dévoilement
// habituel ; plus de « Version légère » (seulement la 3D). Les cartes sont celles tirées par le serveur.
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
    t.check("toutes retournées : le récapitulatif s'affiche dans la scène 3D", await until(page, () => Open3D.state?.phase === "done" && !document.getElementById("o3Recap").hidden && !!document.querySelector('#o3Recap [data-act="stage-close"]'), 90000));
    t.check("récapitulatif : les cartes restent en 3D, pas de page plate", (await page.evaluate(() => Open3D.state?.cards)) === 5 && (await page.locator(".summary").count()) === 0);
    await page.screenshot({ path: join(OUT, `o3-${label}-retournees.png`) });
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
    t.check("coffre : récapitulatif dans la scène, 10 cartes en 3D", await until(page, () => !document.getElementById("o3Recap").hidden && Open3D.state?.cards === 10, 10000));
    await page.screenshot({ path: join(OUT, `o3-${label}-coffre-recap.png`) });
    await page.click('[data-act="stage-close"]'); await page.waitForTimeout(500);

    // les 30 scénarios du coffre, rejoués en 3D (ordi seulement : c'est long en rendu logiciel)
    if (label === "ordi") {
      const ids = await page.evaluate(() => CHEST_SCENARIOS.map((x) => x.id)), bad = [];
      for (const id of ids) {
        await page.evaluate((id) => { const cs = ALL_CARDS.filter((c) => c.rar === "m").slice(0, 1).concat(ALL_CARDS.filter((c) => c.rar === "l").slice(0, 2), ALL_CARDS.filter((c) => c.rar === "e").slice(0, 3), ALL_CARDS.filter((c) => c.rar === "c").slice(0, 4));
          opening = { phase: "pack", cards: cs.map((c, i) => ({ c, gold: i === 3, isNew: i < 5 })), i: 0, flipped: false, paid: false, pk: packOf("mix"), n: 2, scenario: id, lab: true, titles: [] }; drawOpening(); }, id);
        await until(page, () => Open3D.state?.kind === "chest", 20000);
        await page.evaluate(() => { window.__speed = 14; Open3D.open(); });
        if (id === "fk-redemarrage" || id === "tr-eclipse" || id === "fk-cle") await page.waitForTimeout(2500).then(() => page.screenshot({ path: join(OUT, `o3-scenario-${id}.png`) }));
        if (!(await until(page, () => Open3D.state?.phase === "cards", 90000))) bad.push(id);
        await page.evaluate(() => { window.__speed = 6; Open3D.stop(); closeStage(); });
      }
      t.check(`les ${ids.length} scénarios du coffre vont jusqu'aux cartes`, ids.length === 30 && bad.length === 0, bad);
    }
    // invocation ×5 : la pochette, puis le dévoilement habituel des cosmétiques
    await page.evaluate(() => zSummon(5));
    t.check("invocation ×5 : la pochette 3D", await until(page, () => Open3D.state?.kind === "pack"));
    await page.evaluate(() => Open3D.open());
    t.check("puis les objets se dévoilent comme avant", await until(page, () => !!document.getElementById("revealBtn"), 60000));
    await page.click('[data-act="skip"]'); await page.waitForTimeout(400);
    await page.click('[data-act="stage-close"]').catch(() => {}); await page.waitForTimeout(400);

    // seulement la 3D : plus de bouton pour la couper (et un ancien réglage « 0 » est ignoré)
    await page.evaluate(() => startOpening(false, null, 1));
    t.check("plus de bouton « Version légère », seulement la 3D", await until(page, () => Open3D.state?.kind === "pack") && !(await page.locator("#o3Light").count()));
    await page.evaluate(() => { Open3D.stop(); closeStage(); });
    t.check("aucune erreur JavaScript", errors.length === 0, errors);
    await ctx.close();
  }
} catch (e) { t.check("exécution sans erreur", false, String(e.stack || e)); }
finally { t.done(); await browser?.close(); await srv.stop(); }
