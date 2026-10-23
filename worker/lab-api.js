// Galerie (contrôle qualité) et laboratoire admin.
// Le labo travaille sur une partie de test rangée dans docs « lab/<uid> » : jamais dans la table players,
// jamais visible des autres joueurs, sans effet sur l'économie, le classement, le marché ou le fil.
import * as G from "./game.js";

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const fail = (status, error) => json({ error }, status);
const rng = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;

async function readJSON(env, path) {
  const r = await env.DB.prepare("SELECT data FROM docs WHERE path = ?").bind(path).first();
  return r ? JSON.parse(r.data) : null;
}
// écriture directe, sans compteur de synchro : personne d'autre ne lit ces documents
async function writeJSON(env, coll, id, data) {
  await env.DB.prepare("INSERT INTO docs (path, coll, id, data, version, updated) VALUES (?, ?, ?, ?, 1, ?) ON CONFLICT(path) DO UPDATE SET data = excluded.data, version = docs.version + 1, updated = excluded.updated")
    .bind(coll + "/" + id, coll, id, JSON.stringify(data), Date.now()).run();
}
const freshLab = (now) => Object.assign(G.freshSave(now), { ...G.LAB_START, lab: true, linked: true });
async function loadLab(env, uid) { const d = await readJSON(env, "lab/" + uid); return d ? G.normalizeSave(d) : freshLab(Date.now()); }
const QA_STATUS = ["ok", "revoir"];

export async function labRoute(env, user, path, body, cfg) {
  if (!path.startsWith("/api/game/qa/") && !path.startsWith("/api/game/lab/")) return null;
  if (!user.admin) return fail(403, "Réservé à l'admin.");

  // --- contrôle qualité des illustrations ---
  if (path === "/api/game/qa/list") return json({ qa: (await readJSON(env, "qa/cards")) || {} });
  if (path === "/api/game/qa/set") {
    const id = String(body.id || "");
    if (!G.CARD_BY_ID[id]) return fail(400, "Carte inconnue.");
    const qa = (await readJSON(env, "qa/cards")) || {};
    if (!body.status) delete qa[id];
    else if (!QA_STATUS.includes(body.status)) return fail(400, "Statut inconnu.");
    else qa[id] = { s: body.status, note: String(body.note || "").slice(0, 200), by: user.name, t: Date.now() };
    await writeJSON(env, "qa", "cards", qa);
    return json({ qa });
  }

  // --- laboratoire ---
  const now = Date.now();
  let s = await loadLab(env, user.id), out = {};
  const num = (v, max) => Math.max(0, Math.min(max, Math.floor(+v || 0)));
  if (path === "/api/game/lab/state") { /* lecture seule */ }
  else if (path === "/api/game/lab/reset") {
    s = freshLab(now);
    for (const [k, max] of [["chakra", 1e7], ["free", 999], ["sinceMythic", 999], ["sinceLegend", 999], ["sinceGold", 999]]) if (body[k] != null) s[k] = num(body[k], max);
    if (body.sinceM != null) G.cosOf(s).sinceM = num(body.sinceM, 999);
    if (body.sinceL != null) G.cosOf(s).sinceL = num(body.sinceL, 999);
    if (body.full) for (const c of G.ALL_CARDS) G.addCardS(s, c.id, false, now);
  } else if (path === "/api/game/lab/set") {
    for (const [k, max] of [["chakra", 1e7], ["free", 999], ["sinceMythic", 999], ["sinceLegend", 999], ["sinceGold", 999]]) if (body[k] != null) s[k] = num(body[k], max);
    if (body.sinceM != null) G.cosOf(s).sinceM = num(body.sinceM, 999);
    if (body.sinceL != null) G.cosOf(s).sinceL = num(body.sinceL, 999);
  } else if (path === "/api/game/lab/open") {
    const sc = body.scenario ? String(body.scenario) : null;
    if (sc && !G.CHEST_BY_ID[sc]) return fail(400, "Scénario inconnu.");
    const allCfg = body.all ? G.configFrom({ ...cfg, def: 99 }) : cfg;
    let r;
    if (Array.isArray(body.cards) && body.cards.length) r = G.labForcedOpenS(s, body.cards, now);
    else { s.free = Math.max(s.free, 1); r = G.takeAndOpenS(s, String(body.pack || "mix"), false, allCfg, user.id, rng, now); }
    if (r.error) return fail(400, r.error);
    const pk = G.packOfAt(String(body.pack || "coffre"), now);
    const chest = !!(pk?.skins) || !!sc;
    const scenario = sc || r.scenario || (chest ? G.pickScenarioS(r.cards, rng, now) : null);
    const ok = scenario ? G.CHEST_BY_ID[scenario].when(G.chestCtx(r.cards, now)) : true;
    out = { pack: r.pack || pk?.id || "coffre", cards: r.cards, divine: r.divine, scenario, compatible: ok };
  } else if (path === "/api/game/lab/summon") {
    const r = Array.isArray(body.rars) && body.rars.length ? G.labSummonForcedS(s, body.rars, rng, now) : G.summonS(s, G.SUMMON_COUNTS.includes(+body.n) ? +body.n : 1, rng, now);
    if (r.error) return fail(400, r.error);
    out = r;
  } else if (path === "/api/game/lab/give") {
    if (body.card) { if (!G.CARD_BY_ID[body.card]) return fail(400, "Carte inconnue."); G.addCardS(s, body.card, !!body.gold, now); }
    if (body.cos) { const c = G.COS_BY_ID[body.cos]; if (!c) return fail(400, "Cosmétique inconnu."); if (c.only) G.cosOf(s).inst.push({ i: "lab" + now.toString(36), c: c.id, t: now }); else G.cosOf(s).own[c.id] = now; }
  } else return fail(404, "Action de labo inconnue.");
  s.updated = now;
  await writeJSON(env, "lab", user.id, s);
  return json({ ...out, lab: s });
}
