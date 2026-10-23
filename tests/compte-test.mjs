// Compte de test (dev et admin) : repartir de zéro sur son vrai compte, puis le récupérer tel quel.
import { startServer, player, reporter, IDS, grant, playwright } from "./lib.mjs";

const srv = await startServer({ port: +(process.env.PORT || 8881) });
const t = reporter("Compte de test (dev et admin)");
let browser;
try {
  const D = await player(srv.base, IDS.dev, "Reichi"), A = await player(srv.base, IDS.admin, "Billy"), P = await player(srv.base, IDS.p1, "Aiko");
  for (const x of [D, A, P]) await x.api("state");
  grant(srv, [D], { free: 8, chakra: 777 });
  for (let i = 0; i < 4; i++) await D.api("open", { pack: "mix" });
  const real = (await D.api("state")).state, realCards = Object.keys(real.owned).length;
  t.check("le vrai compte a des cartes", realCards > 0 && real.opened === 4);

  t.check("un joueur normal ne peut pas repartir de zéro", (await P.api("dev/reset")).status === 403 && (await P.api("dev/restore")).status === 403);
  t.check("rien à restaurer avant une remise à zéro", (await D.api("dev/restore")).status === 400);
  const r1 = await D.api("dev/reset");
  t.check("repartir de zéro : compte neuf", r1.state && Object.keys(r1.state.owned).length === 0 && r1.state.opened === 0 && r1.state.linked === true, r1.error);
  t.check("la sauvegarde décrit le vrai compte", (await D.api("dev/backup")).backup?.cartes === realCards);
  // on joue un peu sur le compte neuf, puis on repart encore de zéro : la sauvegarde ne doit pas changer
  await D.api("open", { pack: "mix" });
  await D.api("dev/reset");
  t.check("repartir de zéro une 2e fois n'écrase pas la sauvegarde", (await D.api("dev/backup")).backup?.opened === 4);
  t.check("l'API des documents ne donne pas la sauvegarde", (await D.doc("GET", "devbackup/d" + IDS.dev)).body?.exists !== true && (await P.doc("GET", "devbackup/d" + IDS.dev)).body?.exists !== true);
  const back = await D.api("dev/restore");
  t.check("récupérer le vrai compte : tout revient", back.state && Object.keys(back.state.owned).length === realCards && back.state.opened === 4 && back.state.chakra === real.chakra);
  t.check("après restauration, la sauvegarde est effacée", (await D.api("dev/backup")).backup === null);
  t.check("l'admin aussi peut repartir de zéro", (await A.api("dev/reset")).state?.opened === 0 && (await A.api("dev/restore")).state != null);

  const { chromium } = await playwright();
  browser = await chromium.launch();
  const page = await browser.newPage(), errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${srv.base}/auth/dev?id=${IDS.dev}&name=Reichi`); await page.waitForTimeout(2500);
  await page.goto(`${srv.base}/#/profil`); await page.waitForTimeout(1500);
  t.check("profil du dev : la zone de test est là", await page.locator(".test-zone").isVisible());
  await page.click('[data-act="dev-reset"]'); await page.click('[data-act="dev-reset"]'); await page.waitForTimeout(3500);
  t.check("bouton : compte remis à zéro", Object.keys((await D.api("state")).state.owned).length === 0);
  await page.goto(`${srv.base}/#/profil`); await page.waitForTimeout(2000);
  await page.click('[data-act="dev-restore"]'); await page.click('[data-act="dev-restore"]'); await page.waitForTimeout(3500);
  t.check("bouton : vrai compte récupéré", Object.keys((await D.api("state")).state.owned).length === realCards);
  const pp = await browser.newPage();
  await pp.goto(`${srv.base}/auth/dev?id=${IDS.p1}&name=Aiko`); await pp.waitForTimeout(2000);
  await pp.goto(`${srv.base}/#/profil`); await pp.waitForTimeout(1500);
  t.check("profil d'un joueur normal : pas de zone de test", (await pp.locator(".test-zone").count()) === 0);
  t.check("aucune erreur JavaScript", errors.length === 0, errors);
} catch (e) { t.check("exécution sans erreur", false, String(e.stack || e)); }
finally { t.done(); await browser?.close(); await srv.stop(); }
