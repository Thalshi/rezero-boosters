// Parcours réels dans le navigateur, à plusieurs joueurs : boosters, prédictions, marché, échanges,
// comptoir, notifications, menus admin et dev. Mesure aussi le délai d'affichage chez l'autre joueur.
import { startServer, reporter, playwright, IDS, sleep, grant } from "./lib.mjs";

const srv = await startServer({ port: +(process.env.PORT || 8804) });
const t = reporter("Interface · parcours multijoueur");
const { chromium } = await playwright();
const browser = await chromium.launch();
const errors = [];
const open = async (id, name, width = 1280) => {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${name} : ${e.message}`));
  await page.goto(`${srv.base}/auth/dev?id=${id}&name=${name}`); await page.waitForTimeout(2500);
  page.api = (a, body = {}) => page.evaluate(([a, body]) => fetch("/api/game/" + a, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, ...(await r.json()) })), [a, body]);
  return page;
};
const waitFor = async (page, fn, arg, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await page.evaluate(fn, arg).catch(() => false)) return Date.now() - t0; await sleep(250); } return -1; };
try {
  const B = await open(IDS.admin, "Billy"), R = await open(IDS.dev, "Reichi", 430), T = await open(IDS.p1, "Teo");

  t.section("Menus et rôles");
  const menu = async (p) => { await p.click(p.viewportSize().width > 900 ? "#avBtn" : "#menuBtn"); await sleep(300); const items = await p.$$eval("#menu .mgrid button", (bs) => bs.map((b) => b.dataset.nav)); await p.click(p.viewportSize().width > 900 ? "#avBtn" : "#menuBtn"); return items; };
  const mB = await menu(B), mR = await menu(R), mT = await menu(T);
  t.check("Billy : Admin sans Dev", mB.includes("admin") && !mB.includes("dev"));
  t.check("Reichi : Admin et Dev", mR.includes("admin") && mR.includes("dev"));
  t.check("joueur : ni Admin ni Dev", !mT.includes("admin") && !mT.includes("dev"));

  t.section("Boosters");
  await R.click(".bigopen"); await sleep(600);
  const box = await R.locator("#pack").boundingBox();
  await R.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await R.mouse.down(); await R.mouse.move(box.x + box.width / 2, box.y + 10, { steps: 6 }); await R.mouse.up(); await sleep(900);
  t.check("ouverture : le booster se déchire et la première carte s'affiche", await R.isVisible("#revealBtn"));
  await R.click("[data-act=skip]"); await sleep(300);
  t.check("résumé : 5 cartes", (await R.$$(".summary .kcw")).length === 5);
  await R.click("[data-act=stage-close]"); await sleep(300);
  grant(srv, [IDS.admin, IDS.dev, IDS.p1].map((id) => ({ id: "d" + id })), { free: 20 });
  for (const p of [B, R, T]) for (let i = 0; i < 10; i++) await p.api("open", { pack: "mix" });
  for (const p of [B, R, T]) await p.evaluate(() => srv("state"));

  t.section("Prédictions");
  await B.evaluate(() => { location.hash = "#/pred"; }); await sleep(800);
  await B.fill("#pqText", "Qui retrouve Byakko ?"); await B.fill("#pqOptions", "Kuradai\nStalk"); await B.fill("#pqReward", "120");
  await B.click("#pqForm button[type=submit]"); await sleep(800);
  await T.evaluate(() => { location.hash = "#/pred"; });
  const dPred = await waitFor(T, () => document.querySelectorAll("[data-vote]").length > 0);
  t.check("la nouvelle question apparaît chez le joueur", dPred >= 0, { délai_ms: dPred });
  await T.click('[data-vote][data-idx="1"]'); await sleep(1200);
  t.check("vote enregistré par le serveur", (await T.evaluate(() => pred.mine[pred.questions[0].id])) === 1);
  await sleep(6500);
  await B.selectOption("[data-pq-answer]", "1"); await B.click("[data-pq=resolve]"); await sleep(1500);
  const before = await T.evaluate(() => save.chakra);
  const dPaid = await waitFor(T, (b) => save.chakra >= b + 120, before);
  t.check("bonne réponse créditée (+120 ◆)", dPaid >= 0, { délai_ms: dPaid });
  const scores = await B.evaluate(() => fetch("/api/doc?path=pred/scores").then((r) => r.json()));
  t.check("classement des prédictions mis à jour", scores.data?.scores?.["d" + IDS.p1] >= 1, scores.data?.scores);

  t.section("Marché");
  const st = await R.evaluate(() => save);
  const card = Object.entries(st.owned).find(([, o]) => o.n > 0)[0];
  await R.evaluate((c) => { location.hash = "#/carte/" + c; }, card); await sleep(800);
  await R.click("[data-sell]"); await sleep(300); await R.fill("#sellPrice", "15"); await R.click("#sellForm button[type=submit]"); await sleep(1200);
  await B.evaluate(() => { location.hash = "#/market"; });
  const dList = await waitFor(B, () => document.querySelectorAll(".ls").length > 0);
  t.check("l'annonce apparaît chez l'acheteur", dList >= 0, { délai_ms: dList });
  await B.click(".ls"); await sleep(500); await B.click("[data-buy]"); await sleep(1500);
  const dBought = await waitFor(B, () => !shared.market.some((l) => l.status === "open"));
  t.check("achat réussi : l'annonce disparaît de la liste de l'acheteur", dBought >= 0, { délai_ms: dBought });
  if (dBought > 1000) t.note(`comportement actuel : après un achat, la liste de l'acheteur n'est rafraîchie qu'à la lecture suivante (${dBought} ms)`);
  const dSold = await waitFor(R, () => shared.market.some((l) => l.status === "sold"));
  t.check("le vendeur voit sa vente", dSold >= 0, { délai_ms: dSold });

  t.section("Échanges");
  await B.evaluate((uid) => { location.hash = "#/profil/" + uid; }, "d" + IDS.p1); await sleep(1500);
  await B.click("[data-propose]"); await sleep(500);
  // deux cartes de même rareté pour que l'échange soit équilibré
  const rar = await B.evaluate(() => ["c", "pc", "r"].find((r) => document.querySelector(`#tradeForm .pick.r-${r} input[data-side=give]`) && document.querySelector(`#tradeForm .pick.r-${r} input[data-side=want]`)));
  await B.locator(`#tradeForm .pick.r-${rar} input[data-side=give]`).first().click(); await B.locator(`#tradeForm .pick.r-${rar} input[data-side=want]`).first().click();
  t.check("indication d'équilibre affichée (échange équilibré)", (await B.textContent("#tradeFair")).includes("équilibré"), await B.textContent("#tradeFair"));
  await B.click("#tradeForm button[type=submit]"); await sleep(1200);
  const dTrade = await waitFor(T, () => pendingTrades().length > 0);
  t.check("l'échange arrive chez le destinataire", dTrade >= 0, { délai_ms: dTrade });
  await T.evaluate(() => { marketTab = "trades"; location.hash = "#/market"; }); await sleep(800);
  await T.click("[data-ta=accept]"); await sleep(1500);
  const dDone = await waitFor(T, () => shared.trades.some((x) => x.status === "done"));
  t.check("échange accepté et affiché comme fait", dDone >= 0, { délai_ms: dDone });

  t.section("Comptoir et notifications");
  await T.click("#chatFab"); await sleep(600);
  await T.fill("#chatIn", "Salut @Billy"); await T.click("#chatForm button[type=submit]"); await sleep(800);
  await B.click("#chatFab");
  const dChat = await waitFor(B, () => chat.msgs.some((m) => m.text === "Salut @Billy"));
  t.check("message reçu au comptoir ouvert", dChat >= 0, { délai_ms: dChat });
  await B.click("[data-act=chat-close]");
  const dNotif = await waitFor(B, () => notif.items.some((n) => n.kind === "mention"), null, 30000);
  t.check("notification de mention reçue", dNotif >= 0, { délai_ms: dNotif });
  const dTradeNotif = await waitFor(B, () => notif.items.some((n) => n.kind === "trade"), null, 30000);
  t.check("notification d'échange accepté reçue", dTradeNotif >= 0);
  await B.click("#bellBtn"); await sleep(500);
  t.check("ouvrir la cloche marque les notifications lues", await B.evaluate(() => notif.unread === 0));

  t.section("Admin");
  await B.evaluate(() => { location.hash = "#/admin"; }); await sleep(800);
  await B.selectOption("#cfgDef", "2"); await sleep(2000);
  const dEp = await waitFor(T, () => CONFIG.def === 2);
  t.check("Billy débloque l'épisode 2 : visible chez le joueur", dEp >= 0, { délai_ms: dEp });
  t.check("aucune erreur JavaScript", errors.length === 0, errors);
} catch (e) { t.check("exécution sans erreur", false, String(e.stack || e)); }
finally { t.done(); await browser.close(); srv.stop(); }
