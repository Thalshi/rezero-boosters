// Version sans serveur (mode invité et version claude.ai) : elle ne doit pas changer avec la synchro.
import { reporter, playwright, ROOT, sleep } from "./lib.mjs";
import { join } from "node:path";

const t = reporter("Interface · mode invité (artifact.html)");
const { chromium } = await playwright();
const browser = await chromium.launch();
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 430, height: 930 } });
  page.on("pageerror", (e) => errors.push(e.message));
  const requests = [];
  page.on("request", (r) => { if (!r.url().startsWith("file:") && !r.url().startsWith("data:") && !r.url().includes("fonts.g")) requests.push(r.url()); });
  await page.goto("file://" + join(ROOT, "artifact.html")); await sleep(1200);
  for (const v of ["boosters", "collection", "wiki", "carte/billy", "market", "missions", "pred", "classement", "profil/moi", "raretes", "regles", "infos", "nouveautes", "avis"]) {
    await page.evaluate((v) => { location.hash = "#/" + v; }, v); await sleep(250);
    t.check(`page ${v} s'affiche`, (await page.evaluate(() => document.getElementById("view").textContent.length)) > 50);
  }
  await page.evaluate(() => { location.hash = "#/"; }); await sleep(300);
  await page.click(".bigopen"); await sleep(500);
  await page.click("#pack"); await sleep(900);
  await page.click("[data-act=skip]"); await sleep(300);
  t.check("ouverture d'un booster en invité", (await page.evaluate(() => save.opened)) === 1);
  await page.click("[data-act=stage-close]");
  await page.evaluate(() => { location.hash = "#/missions"; }); await sleep(300);
  const c0 = await page.evaluate(() => save.chakra);
  await page.click("[data-claim=all]"); await sleep(400);
  t.check("« Tout réclamer » en invité", (await page.evaluate(() => save.chakra)) > c0);
  await page.reload(); await sleep(1000);
  t.check("la collection est gardée après rechargement", (await page.evaluate(() => save.opened)) === 1);
  t.check("aucune requête réseau vers le jeu en invité", requests.length === 0, requests.slice(0, 3));
  t.check("aucune erreur JavaScript", errors.length === 0, errors);
} catch (e) { t.check("exécution sans erreur", false, String(e.stack || e)); }
finally { t.done(); await browser.close(); }
