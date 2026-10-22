// Interrupteurs par fonctionnalité : une nouveauté fermée par l'admin disparaît du menu et le serveur refuse ses actions ;
// la rouvrir rend tout, sans perte. Seul l'admin peut les régler.
import { startServer, player, reporter, IDS, grant, playwright } from "./lib.mjs";
import * as G from "../worker/game.js";

const srv = await startServer({ port: +(process.env.PORT || 8860) });
const t = reporter("Interrupteurs par fonctionnalité");
let browser;
try {
  const A = await player(srv.base, IDS.admin, "Billy"), P = await player(srv.base, IDS.p1, "Teo");
  for (const p of [A, P]) await p.api("state");
  grant(srv, [P], { chakra: 3000, free: 3 });
  const cfg0 = (await A.doc("GET", "config/game")).body?.data || {};
  const setFeatures = (features) => A.doc("PUT", "config/game", { ...cfg0, features });
  t.check("un joueur ne peut pas régler les interrupteurs", (await P.doc("PUT", "config/game", { ...cfg0, features: { boutique: false } })).status === 403);

  await setFeatures({ boutique: false, sanctuaire: false, defile: false, marcheDesign: false });
  const cheap = G.COSMETICS.find((c) => !c.only && c.rar === "c");
  t.check("Boutique fermée : achat refusé", (await P.api("shop/buy", { id: cheap.id })).status === 403);
  t.check("Sanctuaire fermé : invocation refusée", (await P.api("summon", { n: 1 })).status === 403);
  t.check("Défilé fermé : inscription refusée", (await P.api("defile/enter", { card: "billy" })).status === 403);
  t.check("rien n'a été débité", (await P.api("state")).state.chakra === 3000);

  const { chromium } = await playwright();
  browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage(), errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${srv.base}/auth/dev?id=${IDS.p1}&name=Teo`); await page.waitForTimeout(2500);
  const menu = async () => { await page.click("#menuBtn"); await page.waitForTimeout(300); const txt = await page.locator("#menu").innerText(); await page.click("#menuBtn"); return txt; };
  const m1 = await menu();
  t.check("menu : Boutique, Sanctuaire et Défilé masqués", !/Boutique|Sanctuaire|Défilé/.test(m1), m1.slice(0, 200));
  await page.goto(`${srv.base}/#/boutique`); await page.waitForTimeout(800);
  t.check("page de la Boutique : « pas encore ouverte »", (await page.locator("#view").innerText()).includes("pas encore ouverte"));

  await setFeatures({});
  t.check("rouverte : achat accepté", (await P.api("shop/buy", { id: cheap.id })).status === 200);
  t.check("rouvert : invocation acceptée", (await P.api("summon", { n: 1 })).status === 200);
  await page.reload(); await page.waitForTimeout(2500);
  const m2 = await menu();
  t.check("menu : tout réapparaît", /Boutique/.test(m2) && /Sanctuaire/.test(m2) && /Défilé/.test(m2));
  t.check("aucune erreur JavaScript", errors.length === 0, errors);
} catch (e) { t.check("exécution sans erreur", false, String(e.stack || e)); }
finally { t.done(); await browser?.close(); await srv.stop(); }
