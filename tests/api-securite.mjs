// Sécurité de l'économie : import de sauvegarde, votes de prédiction, réclamations, contrôle des comptes.
import { startServer, player, reporter, IDS, total } from "./lib.mjs";

const srv = await startServer({ port: +(process.env.PORT || 8801) });
const t = reporter("API · sécurité");
try {
  t.section("Import de sauvegarde");
  const F = await player(srv.base, IDS.p1, "Faussaire");
  const forged = { opened: 400, chakra: 5000, free: 100000, sinceMythic: 119, sinceGold: 9,
    owned: { kai: { n: 3, gold: 2, first: 1 }, "billy-fa": { n: 1, gold: 0 }, "rayzo-1": { n: 500, gold: 9 }, "teo-2": { n: 30, gold: 0 }, zzz: { n: 9 } },
    ach: { "a-open1000": true }, first: { bonus: true }, counts: { predwin: 99 }, sales: 99, trades: 99, dailyPack: "2099-01-01", streak: { last: "2099-01-01", n: 6 }, linked: true };
  let s = (await F.api("state", { guest: forged })).state;
  t.check("sauvegarde falsifiée : 10 boosters gratuits, 120 ◆", s.free === 10 && s.chakra === 120, { free: s.free, chakra: s.chakra });
  t.check("sauvegarde falsifiée : ni Mythique, ni dorée, ni Rare et plus", !s.owned.kai && !s.owned["billy-fa"] && Object.values(s.owned).every((o) => !o.gold));
  t.check("sauvegarde falsifiée : 50 cartes au plus", total(s) <= 50, total(s));
  t.check("sauvegarde falsifiée : compteurs et récompenses non repris", s.opened === 0 && !s.ach && !s.first && !s.counts?.predwin && s.sales === 0 && s.sinceMythic === 0);

  const L = await player(srv.base, IDS.p2, "Legit");
  const legit = { opened: 3, chakra: 160, free: 7, owned: { "rayzo-1": { n: 2, gold: 0, first: 1700000000000 }, "teo-2": { n: 1, gold: 0, first: 1700000000000 }, "rayzo-3": { n: 1, gold: 0 } }, wish: ["kai"], pack: "mix" };
  let r = await L.api("state", { guest: legit }); s = r.state;
  t.check("sauvegarde légitime : reprise « invité »", r.imported === "invité", r.imported);
  t.check("sauvegarde légitime : Communes et Peu communes gardées avec leur date", s.owned["rayzo-1"]?.n === 2 && s.owned["teo-2"]?.n === 1 && s.owned["rayzo-1"].first === 1700000000000);
  t.check("sauvegarde légitime : Rare non reprise", !s.owned["rayzo-3"]);
  t.check("sauvegarde légitime : envies et booster préféré gardés", s.wish?.[0] === "kai" && s.pack === "mix");
  r = await L.api("state", { guest: forged });
  t.check("compte existant : un nouvel envoi de sauvegarde est ignoré", r.imported === null && r.state.free === 10, { imported: r.imported });

  const O = await player(srv.base, IDS.p3, "Ancien");
  t.check("ancien chemin data/users : écriture refusée au joueur", (await O.doc("PUT", `data/users/${O.id}/rzlol`, { opened: 400, free: 99999 })).status === 403);
  srv.sql(`INSERT INTO docs (path, coll, id, data, version, updated) VALUES ('data/users/d600000000000000006/rzlol', 'data/users/d600000000000000006', 'rzlol', '${JSON.stringify({ opened: 50, chakra: 4000, free: 500, owned: { "rayzo-1": { n: 4, gold: 1 }, kai: { n: 1, gold: 0 } } })}', 1, 0)`);
  const O2 = await player(srv.base, "600000000000000006", "Ancien2");
  r = await O2.api("state"); s = r.state;
  t.check("ancienne sauvegarde existante : reprise nettoyée", r.imported === "compte" && s.free === 10 && s.chakra === 120 && s.owned["rayzo-1"]?.n === 4 && !s.owned["rayzo-1"].gold && !s.owned.kai);

  t.section("Votes de prédiction");
  const A = await player(srv.base, IDS.admin, "Billy"), R = await player(srv.base, IDS.dev, "Reichi"), T = await player(srv.base, "700000000000000007", "Teo");
  await R.api("state"); await T.api("state");
  const q = (await A.coll("POST", "predq", { ep: 2, text: "Qui ?", options: ["A", "B", "C"], points: 2, reward: 250, status: "open", answer: null, t: Date.now() })).body.id;
  t.check("écriture directe de votes refusée", (await R.doc("PUT", `votes/${R.id}`, { uid: R.id, answers: { [q]: 1 } })).status === 403);
  t.check("vote avant clôture accepté", (await R.api("vote", { qid: q, idx: 0 })).status === 200);
  t.check("changement de vote tant que c'est ouvert", (await R.api("vote", { qid: q, idx: 1 })).status === 200);
  t.check("réponse invalide refusée", (await R.api("vote", { qid: q, idx: 7 })).status === 400);
  await A.doc("PATCH", "predq/" + q, { status: "closed" });
  t.check("heure de fermeture notée par le serveur", !!(await A.doc("GET", "predq/" + q)).body.data.closedAt);
  t.check("vote après clôture refusé", (await T.api("vote", { qid: q, idx: 1 })).status === 409);
  await A.doc("PATCH", "predq/" + q, { status: "resolved", answer: 1 });
  t.check("vote après la réponse refusé", (await T.api("vote", { qid: q, idx: 1 })).status === 409);
  const c0 = (await R.api("state")).state.chakra;
  const par = await Promise.all(Array.from({ length: 6 }, () => R.api("predictions")));
  const c1 = (await R.api("state")).state.chakra;
  t.check("6 réclamations simultanées : payé une seule fois", c1 - c0 === 250, { gains: par.map((p) => p.value || 0) });
  const t0 = (await T.api("state")).state.chakra; await T.api("predictions");
  t.check("vote refusé : aucun gain", (await T.api("state")).state.chakra === t0);
  await A.doc("PATCH", "predq/" + q, { status: "open", answer: null });
  t.check("réouverture : votes de nouveau acceptés", (await T.api("vote", { qid: q, idx: 2 })).status === 200);

  t.section("Réclamations et ressources");
  const P = await player(srv.base, "800000000000000008", "Presse");
  await P.api("state");
  const cl = await Promise.all(Array.from({ length: 6 }, () => P.api("claim", { kind: "all" })));
  t.check("6 « Tout réclamer » simultanés : une seule réussite", cl.filter((c) => c.status === 200).length === 1, cl.map((c) => c.status));
  const dp = await Promise.all(Array.from({ length: 4 }, () => P.api("open", { pack: "jour" })));
  t.check("4 packs du jour simultanés : un seul ouvert", dp.filter((d) => d.status === 200).length === 1, dp.map((d) => d.status));

  t.section("Contrôle des comptes");
  srv.sql(`INSERT INTO players (uid, data, version, updated) VALUES ('d900000000000000009', '${JSON.stringify({ free: 99999, chakra: 50000, opened: 2, owned: { kai: { n: 1, gold: 3 } } })}', 1, 0)`);
  t.check("contrôle refusé à l'admin non dev et aux joueurs", (await A.get("dev/audit")).status === 403 && (await T.get("dev/audit")).status === 403);
  const au = await R.get("dev/audit");
  t.check("contrôle (dev) signale le compte gonflé", au.flagged?.some((f) => f.uid === "d900000000000000009"));
  t.check("contrôle ne signale pas les comptes normaux", !au.flagged?.some((f) => [L.id, R.id].includes(f.uid)));
  t.check("contrôle ne modifie rien", srv.sql("SELECT data FROM players WHERE uid = 'd900000000000000009'").includes("99999"));
} catch (e) { t.check("exécution sans erreur", false, String(e.stack || e)); }
finally { t.done(); srv.stop(); }
