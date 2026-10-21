// Mesure des requêtes Worker et des opérations D1 par scénario, avec une base remplie comme
// après quelques semaines de jeu. À relancer à chaque étape de l'optimisation pour comparer.
// Résultat : tableau dans la console et, si REPORT_DIR est défini, mesure.json.
import { startServer, playwright, reporter, IDS, sleep } from "./lib.mjs";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SECS = +(process.env.MESURE_SECONDES || 60);
const srv = await startServer({ port: +(process.env.PORT || 8805), script: "tests/instrumented-worker.mjs" });
const t = reporter("Mesure des requêtes");
const stats = (reset) => fetch(`${srv.base}/__stats${reset ? "?reset=1" : ""}`).then((r) => r.json());
const rows = [];
try {
  // base de départ : 20 joueurs, 400 annonces dont 300 vendues, 200 gros tirages, 60 échanges,
  // 15 avis, 12 prédictions, 2 000 messages, 3 000 notifications
  await fetch(`${srv.base}/auth/dev?id=${IDS.admin}&name=Billy`, { redirect: "manual" }).then((r) => fetch(`${srv.base}/api/game/state`, { method: "POST", headers: { cookie: r.headers.get("set-cookie").split(";")[0] } }));
  const now = Date.now(), L = [], ids = ["rayzo-1", "teo-2", "billy", "reichi", "kai", "seb", "mojo", "nestor", "sultran", "shiro"];
  let seed = 1; const rnd = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  const doc = (coll, id, data) => L.push(`INSERT OR REPLACE INTO docs (path,coll,id,data,version,updated) VALUES ('${coll}/${id}','${coll}','${id}','${JSON.stringify(data).replace(/'/g, "''")}',1,${now});`);
  const uid = (u) => "d" + String(300 + u).padStart(18, "0");
  for (let u = 0; u < 20; u++) { L.push(`INSERT OR REPLACE INTO users (id,name,avatar,member,updated) VALUES ('${uid(u)}','Joueur${u}','',1,${now});`); doc("players", uid(u), { uid: uid(u), cards: 10 + rnd(70), unique: 10 + rnd(70), mythics: rnd(3), opened: 10 + rnd(190), t: now }); }
  for (let i = 0; i < 400; i++) doc("market", "m" + i, { seller: uid(i % 20), card: ids[rnd(10)], gold: false, price: 5 + rnd(195), status: i < 100 ? "open" : "sold", t: now - i * 60000, soldAt: now - i * 50000 });
  for (let i = 0; i < 200; i++) doc("feed", "f" + i, { uid: uid(i % 20), card: ids[rnd(10)], gold: false, t: now - i * 90000 });
  for (let i = 0; i < 60; i++) doc("trades", "t" + i, { from: uid(i % 20), to: i % 7 === 0 ? "d" + IDS.p1 : uid((i + 1) % 20), give: [{ id: "seb", gold: false, n: 1 }], want: [{ id: "mojo", gold: false, n: 1 }], chakra: 0, status: i < 10 ? "open" : "done", t: now - i * 3600000 });
  for (let i = 0; i < 15; i++) doc("avis", uid(i), { uid: uid(i), stars: 4, text: "Super", t: now - i * 1000 });
  for (let i = 0; i < 12; i++) doc("predq", "q" + i, { ep: 2, text: "Q" + i, options: ["A", "B"], points: 1, reward: 50, status: i < 10 ? "resolved" : "open", answer: i < 10 ? 0 : null, t: now - i * 1000 });
  for (let u = 0; u < 20; u++) doc("votes", uid(u), { uid: uid(u), answers: Object.fromEntries(Array.from({ length: 12 }, (_, i) => ["q" + i, rnd(2)])) });
  for (let i = 0; i < 2000; i++) L.push(`INSERT INTO chat (uid,kind,text,card,gold,ts) VALUES ('${uid(i % 20)}','msg','Salut ${i}',NULL,0,${now - (2000 - i) * 30000});`);
  for (let i = 0; i < 3000; i++) L.push(`INSERT INTO notifs (uid,kind,text,data,ts) VALUES ('${i % 10 ? uid(i % 20) : "*"}','sold','Vente ${i}',NULL,${now - (3000 - i) * 20000});`);
  const f = join(mkdtempSync(join(tmpdir(), "rezero-seed-")), "seed.sql"); writeFileSync(f, L.join("\n")); srv.sqlFile(f);
  t.note(`base de mesure : ${L.length} lignes insérées`);

  const { chromium } = await playwright();
  const browser = await chromium.launch();
  const scenario = async (label, secs, opts = {}) => {
    const ctx = await browser.newContext(); const page = await ctx.newPage();
    if (opts.hidden) await page.addInitScript(() => { Object.defineProperty(document, "hidden", { get: () => true }); Object.defineProperty(document, "visibilityState", { get: () => "hidden" }); });
    await stats(true);
    await page.goto(`${srv.base}/auth/dev?id=${opts.id || IDS.p1}&name=Mesure`);
    if (!opts.load) { await sleep(5000); await stats(true); if (opts.chat) await page.click("#chatFab"); if (opts.action) await opts.action(page); }
    await sleep(secs * 1000);
    const s = await stats(true); await ctx.close();
    const perMin = (x) => Math.round(x * 60 / secs);
    rows.push({ label, secs, req: s.req, q: s.q, rr: s.rr, rw: s.rw, reqMin: perMin(s.req), rrMin: perMin(s.rr), byPath: s.byPath });
    console.log(`\n== ${label} (${secs} s) : ${s.req} requêtes Worker, ${s.q} requêtes D1, ${s.rr} lignes lues, ${s.rw} lignes écrites`);
    for (const [k, v] of Object.entries(s.byPath).sort((a, b) => b[1].rr - a[1].rr)) console.log("   ", k.padEnd(28), `req ${v.req}`.padEnd(9), `D1 ${v.q}`.padEnd(9), `lues ${v.rr}`.padEnd(12), `écrites ${v.rw}`);
  };
  await scenario("Chargement de la page", 6, { load: true, id: "600000000000000006" });
  await scenario("Onglet ouvert, au repos", SECS);
  await scenario("Onglet masqué", SECS, { hidden: true });
  await scenario("Comptoir ouvert", SECS, { chat: true });
  await scenario("Admin, au repos", SECS, { id: IDS.admin });
  await scenario("Ouverture d'un booster", 4, { action: (p) => p.evaluate(() => startOpening(false, "mix")) });
  await browser.close();

  // projection : 10 joueurs, 2 h d'onglet ouvert + 2 h masqué chacun
  const open = rows.find((r) => r.label === "Onglet ouvert, au repos"), hid = rows.find((r) => r.label === "Onglet masqué");
  const day = { workers: 10 * (120 * open.reqMin + 120 * hid.reqMin), rowsRead: 10 * (120 * open.rrMin + 120 * hid.rrMin) };
  console.log(`\nProjection (10 joueurs, 2 h ouvert + 2 h masqué) : ${day.workers.toLocaleString("fr-FR")} requêtes Worker et ${day.rowsRead.toLocaleString("fr-FR")} lignes D1 lues par jour`);
  t.check("mesure complète", rows.length === 6, rows.map((r) => `${r.label} : ${r.reqMin} req/min, ${r.rrMin} lignes/min`));
  if (process.env.REPORT_DIR) writeFileSync(join(process.env.REPORT_DIR, "mesure.json"), JSON.stringify({ date: new Date().toISOString(), secondes: SECS, scenarios: rows, projection: day }, null, 1));
} catch (e) { t.check("exécution sans erreur", false, String(e.stack || e)); }
finally { t.done(); srv.stop(); }
