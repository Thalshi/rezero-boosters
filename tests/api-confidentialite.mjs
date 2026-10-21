// Règles de confidentialité et d'accès : qui peut lire et écrire quoi.
// Ces règles devront rester identiques avec la future route /api/game/sync.
import { startServer, player, reporter, IDS } from "./lib.mjs";

const srv = await startServer({ port: +(process.env.PORT || 8803) });
const t = reporter("API · confidentialité et accès");
try {
  const A = await player(srv.base, IDS.admin, "Billy"), D = await player(srv.base, IDS.dev, "Reichi");
  const P1 = await player(srv.base, IDS.p1, "Joueur1"), P2 = await player(srv.base, IDS.p2, "Joueur2"), P3 = await player(srv.base, IDS.p3, "Joueur3");
  for (const p of [A, D, P1, P2, P3]) await p.api("state");
  for (let i = 0; i < 10; i++) for (const p of [P1, P2]) await p.api("open", { pack: "mix" });

  t.section("Sans connexion");
  for (const url of ["/api/me", "/api/game/state", "/api/doc?path=config/game", "/api/coll?path=market", "/api/game/pulse"]) {
    const r = await fetch(srv.base + url, { method: url.startsWith("/api/game") ? "POST" : "GET" });
    t.check(`${url} refusé sans connexion`, r.status === 401, r.status);
  }

  t.section("Rôles");
  const me = async (p) => (await p.me()).body;
  t.check("Billy : admin, pas dev", (await me(A)).admin === true && (await me(A)).dev === false);
  t.check("Reichi : admin et dev", (await me(D)).admin === true && (await me(D)).dev === true);
  t.check("joueur : ni admin ni dev", (await me(P1)).admin === false && (await me(P1)).dev === false);
  t.check("vue dev (état serveur, contrôle) : seulement le dev", (await D.get("dev/stats")).status === 200 && (await A.get("dev/stats")).status === 403 && (await P1.get("dev/audit")).status === 403);

  t.section("Documents réservés au serveur ou à l'admin");
  for (const [path, label] of [["players/" + P1.id, "players"], ["feed/x", "feed"], ["market/x", "market"], ["trades/x", "trades"], ["votes/" + P1.id, "votes"], ["data/users/" + P1.id + "/rzlol", "ancienne sauvegarde"]])
    t.check(`joueur : écriture refusée sur ${label}`, (await P1.doc("PUT", path, { a: 1 })).status === 403);
  for (const path of ["config/game", "predq/x", "pred/scores"]) {
    t.check(`joueur : écriture refusée sur ${path}`, (await P1.doc("PUT", path, { a: 1 })).status === 403);
    t.check(`admin : écriture permise sur ${path}`, (await A.doc("PUT", path, path === "config/game" ? {} : { a: 1 })).status === 200);
  }
  t.check("joueur : création de prédiction refusée", (await P1.coll("POST", "predq", { text: "x" })).status === 403);

  t.section("Échanges privés");
  const s1 = (await P1.api("state")).state, s2 = (await P2.api("state")).state;
  const tp = await P1.api("trade/propose", { to: P2.id, give: [{ id: Object.keys(s1.owned)[0], n: 1 }], want: [{ id: Object.keys(s2.owned)[0], n: 1 }] });
  t.check("échange créé entre Joueur1 et Joueur2", tp.status === 200, tp.error);
  t.check("Joueur1 voit l'échange", (await P1.coll("GET", "trades")).body.docs.some((d) => d.id === tp.tid));
  t.check("Joueur2 voit l'échange", (await P2.coll("GET", "trades")).body.docs.some((d) => d.id === tp.tid));
  t.check("Joueur3 ne le voit pas (liste)", !(await P3.coll("GET", "trades")).body.docs.some((d) => d.id === tp.tid));
  t.check("Joueur3 ne le voit pas (lecture directe)", (await P3.doc("GET", "trades/" + tp.tid)).body.exists === false);
  t.check("l'admin ne voit pas non plus les échanges des autres", !(await A.coll("GET", "trades")).body.docs.some((d) => d.id === tp.tid));
  t.check("Joueur3 ne peut ni accepter ni annuler", (await P3.api("trade/answer", { tid: tp.tid, action: "accept" })).status === 403 && (await P3.api("trade/answer", { tid: tp.tid, action: "cancel" })).status === 403);

  t.section("Votes, sauvegardes, avis, bugs");
  const q = (await A.coll("POST", "predq", { ep: 2, text: "Q", options: ["A", "B"], status: "open", answer: null, t: Date.now() })).body.id;
  await P1.api("vote", { qid: q, idx: 1 });
  t.check("un joueur lit son propre vote", (await P1.doc("GET", "votes/" + P1.id)).body.exists === true);
  t.check("un joueur ne lit pas le vote d'un autre", (await P2.doc("GET", "votes/" + P1.id)).body.exists === false);
  t.check("un joueur ne liste pas les votes", (await P2.coll("GET", "votes")).body.docs.length === 0);
  t.check("l'admin liste les votes", (await A.coll("GET", "votes")).body.docs.length >= 1);
  srv.sql(`INSERT INTO docs (path, coll, id, data, version, updated) VALUES ('data/users/${P1.id}/rzlol', 'data/users/${P1.id}', 'rzlol', '{"x":1}', 1, 0)`);
  t.check("ancienne sauvegarde : lisible par son joueur", (await P1.doc("GET", `data/users/${P1.id}/rzlol`)).body.exists === true);
  t.check("ancienne sauvegarde : invisible pour les autres", (await P2.doc("GET", `data/users/${P1.id}/rzlol`)).body.exists === false);
  t.check("avis : chacun écrit le sien", (await P1.doc("PUT", "avis/" + P1.id, { uid: P1.id, stars: 5, t: 1 })).status === 200);
  t.check("avis : impossible d'écrire ou supprimer celui d'un autre", (await P2.doc("PUT", "avis/" + P1.id, { stars: 1 })).status === 403 && (await P2.doc("DELETE", "avis/" + P1.id)).status === 403);
  t.check("bugs : un joueur peut en envoyer", (await P1.coll("POST", "bugs", { uid: P1.id, text: "bug", t: 1 })).status === 200);
  t.check("bugs : un joueur ne peut pas les lire", (await P2.coll("GET", "bugs")).body.docs.length === 0);
  t.check("bugs : l'admin et le dev peuvent les lire", (await A.coll("GET", "bugs")).body.docs.length === 1 && (await D.coll("GET", "bugs")).body.docs.length === 1);

  t.section("Notifications et comptoir");
  await P1.api("chat/send", { text: "Coucou @Joueur2" });
  const n2 = await P2.api("pulse", { after: null }), n3 = await P3.api("pulse", { after: null });
  t.check("la mention arrive chez Joueur2", n2.notifs.items.some((n) => n.kind === "mention"));
  t.check("Joueur3 ne reçoit pas les notifications de Joueur2", !n3.notifs.items.some((n) => n.kind === "mention" || n.kind === "trade"));
  t.check("les annonces générales arrivent chez tout le monde", (await A.api("announce", { text: "Annonce" })).status === 200 && (await P3.api("pulse", { after: null })).notifs.items.some((n) => n.kind === "announce"));
  const prof = await P2.api("profile", { uid: P1.id });
  t.check("profil public : pas d'essence, de boosters ni de sauvegarde exposés", prof.status === 200 && !("chakra" in prof) && !("free" in prof) && !("state" in prof) && !JSON.stringify(prof).includes('"chakra"'), Object.keys(prof));

  t.section("Points à surveiller (comportement actuel, non bloquant)");
  const spam = await P1.doc("PUT", "nimporte/quoi", { a: 1 });
  t.note(`un membre peut encore écrire dans une collection libre non utilisée par le jeu (statut ${spam.status}) : à fermer plus tard, sans lien avec la synchro`);
} catch (e) { t.check("exécution sans erreur", false, String(e.stack || e)); }
finally { t.done(); srv.stop(); }
