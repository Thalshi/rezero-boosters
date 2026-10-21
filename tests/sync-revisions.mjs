// Étape 1 de l'optimisation : compteurs de version par section (table sync_rev).
// Vérifie que chaque écriture fait monter le compteur de sa section, qu'une action refusée n'en fait
// monter aucun, et que la migration se fait sans perte sur une base créée par la version de main.
import { startServer, player, reporter, IDS, ROOT } from "./lib.mjs";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const t = reporter("Synchro · étape 1 (compteurs de version)");
const port = +(process.env.PORT || 8806);
let srv, old, worktree;
try {
  t.section("Migration depuis la version de main");
  worktree = mkdtempSync(join(tmpdir(), "rezero-main-"));
  execFileSync("git", ["worktree", "add", "--detach", worktree, "main"], { cwd: ROOT, stdio: "pipe" });
  old = await startServer({ port, root: worktree, keep: true });
  const O = await player(old.base, IDS.p1, "Ancien");
  await O.api("state"); for (let i = 0; i < 3; i++) await O.api("open", { pack: "mix" });
  const before = (await O.api("state")).state;
  t.check("ancienne version : pas de table sync_rev", old.rows("SELECT name FROM sqlite_master WHERE name = 'sync_rev'").length === 0);
  const persist = old.persist; await old.stop();
  srv = await startServer({ port, persist, keep: true });
  const N = await player(srv.base, IDS.p1, "Ancien");
  const after = (await N.api("state")).state;
  t.check("nouvelle version : table sync_rev et index créés au premier appel", srv.rows("SELECT name FROM sqlite_master WHERE name IN ('sync_rev', 'docs_coll_updated')").length === 2);
  t.check("données du joueur intactes après migration", after.opened === before.opened && after.chakra === before.chakra && JSON.stringify(after.owned) === JSON.stringify(before.owned), { avant: before.opened, après: after.opened });

  t.section("Chaque écriture fait monter le bon compteur");
  const revs = () => Object.fromEntries(srv.rows("SELECT k, v FROM sync_rev").map((r) => [r.k, r.v]));
  const diff = async (label, fn, expect, forbid = []) => {
    const a = revs(); const res = await fn(); const b = revs();
    const changed = Object.keys({ ...a, ...b }).filter((k) => (b[k] || 0) !== (a[k] || 0));
    const ok = expect.every((k) => (b[k] || 0) > (a[k] || 0)) && forbid.every((k) => (b[k] || 0) === (a[k] || 0));
    t.check(label, ok, { attendu: expect, monté: changed, ...(res?.status && res.status !== 200 ? { statut: res.status } : {}) });
    return res;
  };
  let A, R, T;
  await diff("connexion : users", async () => { A = await player(srv.base, IDS.admin, "Billy"); R = await player(srv.base, IDS.dev, "Reichi"); T = await player(srv.base, IDS.p2, "Teo"); }, ["users"]);
  await diff("création d'un joueur : players", () => R.api("state"), ["players"]);
  await T.api("state"); await A.api("state");
  for (let i = 0; i < 10; i++) { await R.api("open", { pack: "mix" }); await A.api("open", { pack: "mix" }); await T.api("open", { pack: "mix" }); }
  await diff("ouverture de booster : players", () => R.api("open", { pack: "jour" }), ["players"], ["market", "trades", "config"]);
  await diff("config (admin) : config", () => A.doc("PUT", "config/game", {}), ["config"], ["players"]);
  const q = await diff("nouvelle prédiction (admin) : predq + notifs", () => A.coll("POST", "predq", { ep: 2, text: "Q", options: ["A", "B"], status: "open", answer: null, t: Date.now() }), ["predq", "notifs"]);
  await diff("vote : votes", () => T.api("vote", { qid: q.body.id, idx: 1 }), ["votes"]);
  await diff("fermeture d'une prédiction : predq", () => A.doc("PATCH", "predq/" + q.body.id, { status: "closed" }), ["predq"]);
  await diff("scores (admin) : pred", () => A.doc("PUT", "pred/scores", { scores: {} }), ["pred"]);
  const card = Object.entries((await R.api("state")).state.owned).find(([, o]) => o.n > 0)[0];
  const sell = await diff("mise en vente : market + players", () => R.api("market/sell", { id: card, price: 10 }), ["market", "players"]);
  await diff("achat : market + players + notifs", () => A.api("market/buy", { lid: sell.lid }), ["market", "players", "notifs"]);
  await diff("rachat de la même annonce (409) : aucun compteur", () => T.api("market/buy", { lid: sell.lid }), [], ["market", "players", "notifs"]);
  const card2 = Object.entries((await R.api("state")).state.owned).find(([, o]) => o.n > 0)[0];
  const s2 = await R.api("market/sell", { id: card2, price: 10 });
  await diff("retrait d'une annonce : market", () => R.api("market/cancel", { lid: s2.lid }), ["market"]);
  const sA = (await A.api("state")).state, sT = (await T.api("state")).state;
  const tp = await diff("proposition d'échange : trades + notifs", () => A.api("trade/propose", { to: T.id, give: [{ id: Object.keys(sA.owned).find((id) => sA.owned[id].n > 0), n: 1 }], want: [{ id: Object.keys(sT.owned).find((id) => sT.owned[id].n > 0), n: 1 }] }), ["trades", "notifs"]);
  await diff("réponse à l'échange : trades", () => T.api("trade/answer", { tid: tp.tid, action: "refuse" }), ["trades"]);
  const msg = await diff("message au comptoir : chat", () => T.api("chat/send", { text: "Salut @Billy" }), ["chat", "notifs"]);
  const mid = (await A.api("pulse", { after: null })).chat.find((m) => m.kind === "msg").id;
  await diff("suppression d'un message : chat", () => A.api("chat/delete", { id: mid }), ["chat"]);
  await diff("annonce (admin) : chat + notifs", () => A.api("announce", { text: "Épisode 2" }), ["chat", "notifs"]);
  await diff("avis : avis", () => T.doc("PUT", "avis/" + T.id, { uid: T.id, stars: 5, t: 1 }), ["avis"]);
  await diff("bug signalé : bugs", () => T.coll("POST", "bugs", { uid: T.id, text: "x", t: 1 }), ["bugs"]);
  await diff("suppression d'un document (admin) : predq", () => A.doc("DELETE", "predq/" + q.body.id), ["predq"]);

  t.section("Les refus ne font monter aucun compteur");
  await diff("écriture refusée (joueur sur config) : rien", () => T.doc("PUT", "config/game", {}), [], ["config"]);
  const q2 = (await A.coll("POST", "predq", { ep: 2, text: "Q2", options: ["A", "B"], status: "closed", answer: null, t: 1 })).body.id;
  await diff("vote refusé (question fermée) : rien", () => T.api("vote", { qid: q2, idx: 0 }), [], ["votes", "predq", "players", "notifs"]);
  const v = revs();
  const rv = await T.api("vote", { qid: "nexistepas", idx: 0 });
  t.check("vote sur une question inexistante : votes inchangé", rv.status === 404 && revs().votes === v.votes);
  t.check("chaque compteur a une date de mise à jour", srv.rows("SELECT COUNT(*) AS n FROM sync_rev WHERE t > 0")[0].n === srv.rows("SELECT COUNT(*) AS n FROM sync_rev")[0].n);

  t.section("Retour arrière : l'ancien Worker (main) sur une base déjà migrée");
  const snap = (await R.api("state")).state, revBefore = revs();
  await srv.stop(); srv = null;
  old = await startServer({ port, root: worktree, persist, keep: true });
  const R2 = await player(old.base, IDS.dev, "Reichi"), A2 = await player(old.base, IDS.admin, "Billy"), T2 = await player(old.base, IDS.p2, "Teo");
  const st2 = (await R2.api("state")).state;
  t.check("ancien Worker : données du joueur intactes", st2.opened === snap.opened && st2.chakra === snap.chakra && JSON.stringify(st2.owned) === JSON.stringify(snap.owned));
  const steps = {};
  steps.booster = (await T2.api("open", { pack: "mix", paid: true })).status;
  const c3 = Object.entries(st2.owned).find(([, o]) => o.n > 0)[0];
  const l3 = await R2.api("market/sell", { id: c3, price: 10 }); steps.vente = l3.status;
  steps.achat = (await A2.api("market/buy", { lid: l3.lid })).status;
  steps.comptoir = (await T2.api("chat/send", { text: "retour arrière" })).status;
  steps.config = (await A2.doc("PUT", "config/game", {})).status;
  steps.pulse = (await A2.api("pulse", { after: null })).status;
  t.check("ancien Worker : booster, vente, achat, comptoir, config, notifications marchent", Object.values(steps).every((x) => x === 200), steps);
  t.check("ancien Worker : la table sync_rev reste en place sans gêner", old.rows("SELECT COUNT(*) AS n FROM sync_rev")[0].n > 0);
  await old.stop(); old = null;
  srv = await startServer({ port, persist, keep: true });
  const R3 = await player(srv.base, IDS.dev, "Reichi");
  const st3 = (await R3.api("state")).state;
  t.check("retour à la nouvelle version : données conservées, compteurs repartent", st3.opened === snap.opened && revs().players > revBefore.players);
} catch (e) { t.check("exécution sans erreur", false, String(e.stack || e)); }
finally {
  t.done();
  if (srv) await srv.stop();
  if (old) await old.stop();
  for (const p of [srv?.persist, old?.persist]) if (p) try { rmSync(p, { recursive: true, force: true }); } catch (e) {}
  if (worktree) try { execFileSync("git", ["worktree", "remove", "--force", worktree], { cwd: ROOT, stdio: "pipe" }); } catch (e) {}
}
