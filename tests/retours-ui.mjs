// Retours de Reichi : une notif touchée disparaît de la cloche, aperçu du Défilé avant d'ouvrir les inscriptions,
// le nombre d'objets de l'inventaire n'a plus l'air d'une alerte.
import { startServer, player, reporter, IDS, playwright } from "./lib.mjs";

const srv = await startServer({ port: +(process.env.PORT || 8883) });
const t = reporter("Retours : notifications, aperçu du Défilé, inventaire");
let browser;
try {
  const A = await player(srv.base, IDS.admin, "Billy"), P = await player(srv.base, IDS.p1, "Aiko");
  for (const x of [A, P]) await x.api("state");
  const { chromium } = await playwright();
  browser = await chromium.launch();
  const page = await browser.newPage(), errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  await page.goto(`${srv.base}/auth/dev?id=${IDS.p1}&name=Aiko`); await page.waitForTimeout(2500);

  t.section("Notifications");
  const todo = () => page.evaluate(() => todos().map((x) => x.text));
  const before = await todo();
  t.check("des choses à faire au départ (pack du jour, boosters pleins)", before.length >= 1, before);
  await page.click("#bellBtn"); await page.waitForTimeout(400);
  const first = await page.locator("#notifPanel [data-ntodo]").first().getAttribute("data-ntodo");
  await page.locator("#notifPanel [data-ntodo]").first().click(); await page.waitForTimeout(800);
  t.check("touchée, la notif disparaît de la liste", !(await todo()).includes(first), { first, after: await todo() });
  await page.reload(); await page.waitForTimeout(2500);
  t.check("et elle ne revient pas en rechargeant la page", !(await todo()).includes(first));
  t.check("le compteur de la cloche baisse", (await page.evaluate(() => bellCount())) === before.length - 1);

  t.section("Inventaire");
  await page.goto(`${srv.base}/#/atelier`); await page.waitForTimeout(1500);
  t.check("Atelier : pas de pastille d'alerte sur l'onglet Inventaire", (await page.locator('.utabs [data-v="inv"] .badge').count()) === 0);

  t.section("Défilé : aperçu");
  const ad = await browser.newPage();
  ad.on("pageerror", (e) => errors.push(e.message));
  await ad.goto(`${srv.base}/auth/dev?id=${IDS.admin}&name=Billy`); await ad.waitForTimeout(2500);
  await ad.goto(`${srv.base}/#/defile`); await ad.waitForTimeout(2000);
  await ad.fill("#defTitle", "Défilé de novembre");
  await ad.click('[data-act="def-prev"]'); await ad.waitForTimeout(800);
  t.check("l'aperçu montre la page des joueurs avec le titre", (await ad.locator(".def-prev-bar").isVisible()) && (await ad.locator("h1, .page h1").first().innerText()).includes("novembre") && (await ad.locator(".def-enter").count()) === 1);
  t.check("l'aperçu montre la notification qui partira", (await ad.locator(".def-admin").innerText()).includes("Le Défilé de novembre est ouvert"));
  t.check("rien n'est ouvert pendant l'aperçu", (await A.api("defile/state")).current == null);
  await ad.click('[data-act="def-prev-off"]'); await ad.waitForTimeout(400);
  t.check("« Modifier » revient au formulaire avec le titre gardé", (await ad.inputValue("#defTitle")) === "Défilé de novembre");
  await ad.click('[data-act="def-prev"]'); await ad.waitForTimeout(400);
  await ad.click('[data-act="def-new"]'); await ad.waitForTimeout(1500);
  const cur = (await A.api("defile/state")).current;
  t.check("« Ouvrir pour de vrai » ouvre le Défilé avec ce titre", cur?.phase === "inscriptions" && cur.title === "Défilé de novembre", cur);
  t.check("aucune erreur JavaScript", errors.length === 0, errors);
} catch (e) { t.check("exécution sans erreur", false, String(e.stack || e)); }
finally { t.done(); await browser?.close(); await srv.stop(); }
