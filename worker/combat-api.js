// Re : LOL · Arène : combats 3 contre 3 avec les persos de sa collection.
// Le moteur (btCreate / btResolve dans game.js) décide de tout ; ici on garde les combats, on fait jouer l'IA,
// on attend le choix des deux joueurs en duel entre amis, et on donne essence et expérience à la fin.
// Stockage : table « combats ». Aucune carte ne change de propriétaire.
import * as G from "./game.js";

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const fail = (status, message) => json({ error: message }, status);
const rng = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
const newId = () => [...crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, "0")).join("");
const NIVEAUX = ["facile", "normal", "difficile"];
const ROUND_MS = 60e3;   // en duel : sans réponse au bout d'une minute, l'absent attaque tout seul
const WAIT_MS = 30 * 60e3; // un défi non accepté expire au bout de 30 min

export async function ensureCombatSchema(db) {
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS combats (id TEXT PRIMARY KEY, a TEXT NOT NULL, b TEXT, kind TEXT NOT NULL, status TEXT NOT NULL, state TEXT, t INTEGER NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS combats_a ON combats (a, status)"),
    db.prepare("CREATE INDEX IF NOT EXISTS combats_b ON combats (b, status)"),
  ]);
}
const load = async (env, id) => { const r = await env.DB.prepare("SELECT * FROM combats WHERE id = ?").bind(id).first(); return r ? { ...r, state: r.state ? JSON.parse(r.state) : null } : null; };
const save = (env, c) => env.DB.prepare("UPDATE combats SET status = ?, state = ?, t = ? WHERE id = ?").bind(c.status, JSON.stringify(c.state), Date.now(), c.id).run();
const sideOf = (c, uid) => (c.a === uid ? 0 : c.b === uid ? 1 : -1);
// ce que voit un joueur : tout, sauf le choix de l'adversaire pour le tour en cours
function viewOf(c, uid) {
  const me = sideOf(c, uid), st = c.state;
  const out = { id: c.id, kind: c.kind, status: c.status, me, a: c.a, b: c.b };
  if (!st) return out;
  // « bt » et pas « state » : côté navigateur, « state » est la sauvegarde du joueur
  out.bt = { ...st, sides: st.sides.map((s, i) => ({ ...s, choix: i === me ? s.choix : null, aChoisi: !!s.choix })) };
  out.actions = me >= 0 && st.winner == null && !st.sides[me].choix ? G.btActions(st, me) : [];
  out.deadline = c.kind === "ami" && st.winner == null ? (st.roundAt || c.t) + ROUND_MS : null;
  return out;
}
const userName = async (env, uid) => (await env.DB.prepare("SELECT name FROM users WHERE id = ?").bind(uid).first())?.name || "Joueur";

export async function combatRoute(env, user, path, body, h) {
  if (!path.startsWith("/api/game/combat/")) return null;
  const { mutate, notify, loadRow, cfg, publishStats } = h;
  const myState = async () => { const r = await loadRow(env, user.id); return r ? G.normalizeSave(JSON.parse(r.data)) : null; };
  // fin d'un combat : récompenses des joueurs humains (une seule fois)
  async function finish(c) {
    if (c.status === "fini") return;
    c.status = "fini";
    const st = c.state, won = (i) => st.winner === i;
    const out = {};
    // abandon dès les premiers tours : pas de gains (sinon deux amis pourraient enchaîner les abandons)
    if (st.abandon != null && st.round < 4) { st.rewards = { sans: true }; return; }
    for (const [i, uid] of [[0, c.a], [1, c.b]]) {
      if (!uid || st.sides[i].ia) continue;
      const ids = st.sides[i].team.map((f) => f.id), kind = c.kind === "ia" ? st.sides[1].ia : "ami";
      const r = await mutate(env, uid, (s, now) => ({ reward: G.btRewardS(s, won(i), kind, ids, now) })).catch(() => null);
      if (r?.state) await publishStats(env, uid, r.state).catch(() => {});
      out[i] = r?.reward || null;
    }
    st.rewards = out;
  }
  // duel : l'absent qui n'a pas joué à temps attaque tout seul
  async function timeoutCheck(c) {
    const st = c.state; if (c.kind !== "ami" || c.status !== "combat" || st.winner != null) return false;
    if (Date.now() - (st.roundAt || c.t) < ROUND_MS || !st.sides.some((s) => s.choix)) return false;
    st.sides.forEach((s) => { if (!s.choix) s.choix = { type: "attaque" }; });
    G.btResolve(st, rng); st.roundAt = Date.now();
    if (st.winner != null) await finish(c);
    await save(env, c); return true;
  }

  if (path === "/api/game/combat/team") {
    const r = await mutate(env, user.id, (s) => { const o = G.btSetTeamS(s, body.ids); return o.error ? { abort: true, error: o.error } : o; });
    return r.error ? fail(400, r.error) : json({ ok: true, team: r.state.btTeam, state: r.state });
  }
  if (path === "/api/game/combat/feed") {
    const r = await mutate(env, user.id, (s) => { const o = G.btFeedS(s, String(body.id || "")); return o.error ? { abort: true, error: o.error } : o; });
    if (r.error) return fail(400, r.error);
    await publishStats(env, user.id, r.state).catch(() => {});
    return json({ lvl: r.lvl, up: r.up, state: r.state });
  }
  if (path === "/api/game/combat/list") {
    const now = Date.now();
    await env.DB.prepare("UPDATE combats SET status = 'expire' WHERE status = 'attente' AND t < ?").bind(now - WAIT_MS).run();
    const rows = (await env.DB.prepare("SELECT c.id, c.a, c.b, c.kind, c.status, c.t, ua.name AS na, ub.name AS nb FROM combats c LEFT JOIN users ua ON ua.id = c.a LEFT JOIN users ub ON ub.id = c.b WHERE (c.a = ? OR c.b = ?) AND c.status IN ('attente', 'combat') ORDER BY c.t DESC LIMIT 20").bind(user.id, user.id).all()).results;
    return json({ combats: rows.map((r) => ({ id: r.id, kind: r.kind, status: r.status, t: r.t, moi: r.a === user.id ? "a" : "b", adversaire: r.a === user.id ? (r.kind === "ia" ? null : r.nb) : r.na, recu: r.b === user.id && r.status === "attente" })) });
  }
  // combat contre l'IA
  if (path === "/api/game/combat/ia") {
    const niveau = NIVEAUX.includes(body.niveau) ? body.niveau : "normal", s = await myState(), team = s ? G.btTeamOf(s) : [];
    if (team.length !== G.BT_TEAM) return fail(400, `Choisis d'abord ton équipe de ${G.BT_TEAM} persos.`);
    const pool = G.mixPoolFor({}, cfg, user.id), ia = G.btIaTeam(pool, team, niveau, rng);
    if (ia.length !== G.BT_TEAM) return fail(400, "Pas assez de persos sortis pour composer une équipe adverse.");
    const id = newId(), st = G.btCreate([{ uid: user.id, nom: user.name || "Toi", team }, { uid: null, nom: `IA ${niveau}`, ia: niveau, team: ia }]);
    st.roundAt = Date.now();
    await env.DB.prepare("INSERT INTO combats (id, a, b, kind, status, state, t) VALUES (?, ?, NULL, 'ia', 'combat', ?, ?)").bind(id, user.id, JSON.stringify(st), Date.now()).run();
    return json(viewOf({ id, a: user.id, b: null, kind: "ia", status: "combat", state: st, t: Date.now() }, user.id));
  }
  // défier un ami (il doit accepter, avec son équipe)
  if (path === "/api/game/combat/defi") {
    const to = String(body.uid || ""), s = await myState(), team = s ? G.btTeamOf(s) : [];
    if (team.length !== G.BT_TEAM) return fail(400, `Choisis d'abord ton équipe de ${G.BT_TEAM} persos.`);
    if (!(await env.DB.prepare("SELECT 1 FROM friends WHERE a = ? AND b = ? AND status = 'ok'").bind(user.id, to).first())) return fail(403, "Tu ne peux défier que tes amis.");
    const id = newId(), st = { team };
    await env.DB.prepare("INSERT INTO combats (id, a, b, kind, status, state, t) VALUES (?, ?, ?, 'ami', 'attente', ?, ?)").bind(id, user.id, to, JSON.stringify(st), Date.now()).run();
    await notify(env, to, "combat", `${user.name || "Un ami"} te défie à l'Arène !`, { go: "arene" });
    return json({ id, status: "attente" });
  }
  const c = body.id ? await load(env, String(body.id)) : null;
  if (!c) return fail(404, "Combat introuvable.");
  const me = sideOf(c, user.id);
  if (me < 0) return fail(403, "Ce combat n'est pas le tien.");
  if (path === "/api/game/combat/accepter") {
    if (c.status !== "attente" || me !== 1) return fail(400, "Ce défi n'est plus en attente.");
    const s = await myState(), team = s ? G.btTeamOf(s) : [];
    if (team.length !== G.BT_TEAM) return fail(400, `Choisis d'abord ton équipe de ${G.BT_TEAM} persos.`);
    c.state = G.btCreate([{ uid: c.a, nom: await userName(env, c.a), team: c.state.team }, { uid: c.b, nom: user.name || "Joueur", team }]);
    c.state.roundAt = Date.now(); c.status = "combat"; await save(env, c);
    await notify(env, c.a, "combat", `${user.name || "Ton ami"} accepte ton défi : à toi de jouer à l'Arène !`, { go: "arene" });
    return json(viewOf(c, user.id));
  }
  if (path === "/api/game/combat/refuser") {
    if (c.status !== "attente") return fail(400, "Ce défi n'est plus en attente.");
    c.status = "refuse"; await save(env, c);
    if (me === 1) await notify(env, c.a, "combat", `${user.name || "Ton ami"} refuse ton défi à l'Arène.`, { go: "arene" });
    return json({ ok: true });
  }
  if (path === "/api/game/combat/state") {
    await timeoutCheck(c);
    return json(viewOf(c, user.id));
  }
  if (path === "/api/game/combat/abandon") {
    if (c.status !== "combat" || c.state.winner != null) return fail(400, "Ce combat est déjà fini.");
    c.state.winner = 1 - me; c.state.abandon = me; await finish(c); await save(env, c);
    return json(viewOf(c, user.id));
  }
  if (path === "/api/game/combat/act") {
    if (c.status !== "combat" || c.state.winner != null) return fail(400, "Ce combat est fini.");
    if (await timeoutCheck(c)) return json(viewOf(c, user.id));
    const st = c.state, a = body.action;
    if (st.sides[me].choix) return fail(400, "Tu as déjà choisi pour ce tour.");
    if (!G.btValid(st, me, a)) return fail(400, "Action impossible.");
    st.sides[me].choix = a.type === "changer" ? { type: "changer", to: +a.to } : { type: a.type };
    if (c.kind === "ia") st.sides[1].choix = G.btIaChoice(st, 1, st.sides[1].ia, rng);
    if (st.sides.every((s) => s.choix)) { G.btResolve(st, rng); st.roundAt = Date.now(); }
    if (st.winner != null) await finish(c);
    await save(env, c);
    return json(viewOf(c, user.id));
  }
  return fail(404, "Action inconnue.");
}
