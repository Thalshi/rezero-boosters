// Défilé des Légendes (serveur) : inscriptions figées, votes (anti-comptes jetables, pas d'auto-vote, secret),
// modération, clôture unique, récompenses, égalités, gagnant à l'accueil, archives ; puis la page sur téléphone.
import { startServer, player, reporter, IDS, grant, playwright, ROOT } from "./lib.mjs";
import * as G from "../worker/game.js";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

const OUT = process.env.REPORT_DIR || join(ROOT, "tests/reports");
mkdirSync(OUT, { recursive: true });
const srv = await startServer({ port: +(process.env.PORT || 8840) });
const t = reporter("Défilé des Légendes");
let browser;
// rend un compte « ancien et actif » (base locale de test uniquement)
const veteran = (p) => srv.sql(`UPDATE players SET data = json_set(data, '$.created', ${Date.now() - 10 * 86400e3}, '$.opened', 20) WHERE uid = '${p.id}'`);
try {
  const A = await player(srv.base, IDS.admin, "Billy"), R = await player(srv.base, IDS.dev, "Reichi"), P1 = await player(srv.base, IDS.p1, "Aiko"), P2 = await player(srv.base, IDS.p2, "Bram"), P3 = await player(srv.base, IDS.p3, "Cleo");
  const all = [A, R, P1, P2, P3];
  for (const p of all) await p.api("state");
  grant(srv, all, { free: 3, chakra: 2000 });
  for (const p of all) await p.api("open", { pack: "mix" });
  const cardOf = async (p) => { const s = (await p.api("state")).state; return Object.keys(s.owned).find((id) => s.owned[id].n > 0); };

  t.section("Ouverture et inscriptions");
  t.check("joueur : actions admin refusées", (await P1.api("defile/admin", { action: "new" })).status === 403);
  t.check("s'inscrire sans Défilé : refusé", (await P1.api("defile/enter", { card: await cardOf(P1) })).status === 400);
  const nw = await A.api("defile/admin", { action: "new", title: "Défilé de test" });
  t.check("Billy ouvre un Défilé", nw.status === 200 && nw.current.phase === "inscriptions");
  t.check("un seul Défilé à la fois", (await A.api("defile/admin", { action: "new" })).status === 400);
  const c1 = await cardOf(P1), c2 = await cardOf(P2), c3 = await cardOf(P3);
  // P1 décore sa carte puis s'inscrit : la copie garde ce design même s'il change ensuite
  const cadre = G.COSMETICS.find((c) => !c.only && c.slot === "cadre");
  await P1.api("shop/buy", { id: cadre.id });
  await P1.api("design", { card: c1, design: { cadre: "a:" + cadre.id } });
  const e1 = await P1.api("defile/enter", { card: c1 });
  t.check("inscription : copie de la carte avec son design", e1.status === 200 && e1.current.entries.find((e) => e.uid === P1.id)?.design?.cadre === cadre.id);
  await P1.api("design", { card: c1, design: {} });
  const st0 = await P2.api("defile/state");
  t.check("copie figée : changer le design ensuite ne change pas l'inscription", st0.current.entries.find((e) => e.uid === P1.id)?.design?.cadre === cadre.id);
  const own2 = (await P2.api("state")).state.owned, absent = G.CARDS.find((c) => !own2[c.id]).id;
  t.check("carte non possédée : refusée", (await P2.api("defile/enter", { card: absent })).status === 400);
  await P2.api("defile/enter", { card: c2 }); await P3.api("defile/enter", { card: c3 });
  t.check("3 inscrits", (await A.api("defile/state")).current.entries.length === 3);
  const doc = await P2.doc("GET", "defile/current");
  t.check("l'API des documents ne donne pas le Défilé (votes secrets)", doc.body?.exists === false);
  t.check("voter pendant les inscriptions : refusé", (await R.api("defile/vote", { entry: P1.id })).status >= 400);

  t.section("Votes");
  const ov = await A.api("defile/admin", { action: "votes" });
  t.check("Billy ouvre les votes", ov.status === 200 && ov.current.phase === "votes");
  t.check("s'inscrire pendant les votes : refusé", (await R.api("defile/enter", { card: await cardOf(R) })).status === 400);
  t.check("compte récent : vote refusé (anti-comptes jetables)", (await R.api("defile/vote", { entry: P1.id })).status === 403);
  for (const p of all) veteran(p);
  t.check("voter pour soi : refusé", (await P1.api("defile/vote", { entry: P1.id })).status === 400);
  t.check("voter pour une inscription inexistante : refusé", (await R.api("defile/vote", { entry: "dpersonne" })).status === 400);
  // votes simultanés : aucun ne se perd
  const vs = await Promise.all([R.api("defile/vote", { entry: P2.id }), A.api("defile/vote", { entry: P2.id }), P1.api("defile/vote", { entry: P3.id }), P3.api("defile/vote", { entry: P1.id }), P2.api("defile/vote", { entry: P1.id })]);
  t.check("5 votes simultanés : tous enregistrés", vs.every((v) => v.status === 200), vs.map((v) => v.status));
  const mid = await P1.api("defile/state");
  t.check("pendant les votes : aucun compteur visible", mid.current.entries.every((e) => e.votes === undefined) && mid.current.rank === null && mid.current.myVote === P3.id);
  t.check("changer son vote", (await A.api("defile/vote", { entry: P1.id })).current.myVote === P1.id);
  // P1 : 3 voix (P3, P2, A) ; P2 : 1 (R) ; P3 : 1 (P1) → égalité P2/P3 départagée par l'inscription la plus ancienne (P2)

  t.section("Modération");
  t.check("retrait sans motif : refusé", (await A.api("defile/admin", { action: "remove", uid: P3.id })).status === 400);
  t.check("joueur : retrait refusé", (await P2.api("defile/admin", { action: "remove", uid: P3.id, reason: "x" })).status === 403);

  t.section("Clôture et récompenses");
  const before = {}; for (const p of [P1, P2, P3]) before[p.id] = (await p.api("state")).state.chakra;
  const closes = await Promise.all([A.api("defile/admin", { action: "close" }), A.api("defile/admin", { action: "close" })]);
  t.check("deux clôtures simultanées : une seule passe", closes.filter((c) => c.status === 200).length === 1, closes.map((c) => c.status));
  const fin = await P2.api("defile/state");
  t.check("podium : P1 (3 voix), puis égalité départagée par l'inscription la plus ancienne", fin.current.rank.map((r) => r.uid).join() === [P1.id, P2.id, P3.id].join() && fin.current.rank[0].votes === 3, fin.current.rank);
  const gains = {}; for (const p of [P1, P2, P3]) { const s = (await p.api("state")).state; gains[p.id] = s.chakra - before[p.id]; }
  t.check("récompenses versées une seule fois", gains[P1.id] === G.DEFILE_REWARDS[0] + G.DEFILE_PARTICIPATION && gains[P2.id] === G.DEFILE_REWARDS[1] + G.DEFILE_PARTICIPATION && gains[P3.id] === G.DEFILE_REWARDS[2] + G.DEFILE_PARTICIPATION, gains);
  t.check("titre personnel du gagnant", ((await P1.api("state")).state.titles || []).includes(G.DEFILE_TITLES[0]));
  t.check("titre visible sur le profil public", ((await P2.api("profile", { uid: P1.id })).titles || []).includes(G.DEFILE_TITLES[0]));
  t.check("gagnant à l'accueil pour une semaine", fin.hall?.uid === P1.id && fin.hall.design?.cadre === cadre.id && fin.hall.until > Date.now() + 6 * 86400e3);
  t.check("archive du Défilé", fin.archives[0]?.title === "Défilé de test" && fin.archives[0].podium.length === 3);
  t.check("un nouveau Défilé peut s'ouvrir", (await A.api("defile/admin", { action: "new", title: "Deuxième" })).status === 200);
  await P2.api("defile/enter", { card: c2 });
  const rm = await A.api("defile/admin", { action: "remove", uid: P2.id, reason: "image inappropriée" });
  const seen = await P2.api("defile/state");
  t.check("modération : P2 voit le retrait et son motif, les autres ne voient plus la carte", rm.status === 200 && seen.current.entries.find((e) => e.uid === P2.id)?.reason === "image inappropriée" && !(await P1.api("defile/state")).current.entries.some((e) => e.uid === P2.id));
  t.check("inscription retirée : impossible de se réinscrire", (await P2.api("defile/enter", { card: c2 })).status === 400);

  t.section("Page");
  const { chromium } = await playwright();
  browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }), page = await ctx.newPage(), errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`${srv.base}/auth/dev?id=${IDS.p3}&name=Cleo`); await page.waitForTimeout(2500);
  t.check("accueil : bannière du gagnant", (await page.locator(".def-hall .kcw").count()) === 1);
  await page.screenshot({ path: join(OUT, "defile-accueil-mobile.png") });
  await page.goto(`${srv.base}/#/defile`); await page.waitForTimeout(1500);
  await page.click('[data-act="def-enter"]'); await page.waitForTimeout(1200);
  t.check("s'inscrire depuis la page", (await page.locator(".def-e").count()) === 1);
  await page.screenshot({ path: join(OUT, "defile-page-mobile.png"), fullPage: true });
  t.check("aucune erreur JavaScript", errors.length === 0, errors);
  await ctx.close();
} catch (e) { t.check("exécution sans erreur", false, String(e.stack || e)); }
finally { t.done(); await browser?.close(); await srv.stop(); }
