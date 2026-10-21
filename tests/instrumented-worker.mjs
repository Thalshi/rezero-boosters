// Variante du Worker pour la mesure, utilisée seulement par tests/mesure.mjs en local.
// Elle enveloppe le vrai Worker (worker/index.js, inchangé) et compte les requêtes reçues,
// les requêtes D1, les lignes lues et écrites. Page de lecture : /__stats (?reset=1 pour remettre à zéro).
import worker from "../worker/index.js";

const STATS = { req: 0, q: 0, rr: 0, rw: 0, byPath: {} };
function wrapDB(db, key) {
  const acc = (meta) => {
    STATS.q++; STATS.rr += meta?.rows_read || 0; STATS.rw += meta?.rows_written || 0;
    const b = (STATS.byPath[key] ||= { req: 0, q: 0, rr: 0, rw: 0 }); b.q++; b.rr += meta?.rows_read || 0; b.rw += meta?.rows_written || 0;
  };
  const wrap = (st) => ({
    bind: (...a) => wrap(st.bind(...a)),
    first: async (col) => { const r = await st.all(); acc(r.meta); const row = r.results[0] ?? null; return col ? row?.[col] : row; },
    all: async () => { const r = await st.all(); acc(r.meta); return r; },
    run: async () => { const r = await st.run(); acc(r.meta); return r; },
    raw: st,
  });
  return { prepare: (sql) => wrap(db.prepare(sql)), batch: async (list) => { const rs = await db.batch(list.map((x) => x.raw)); rs.forEach((r) => acc(r.meta)); return rs; } };
}
export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (url.pathname === "/__stats") {
      const out = JSON.stringify(STATS);
      if (url.searchParams.get("reset")) { STATS.req = STATS.q = STATS.rr = STATS.rw = 0; STATS.byPath = {}; }
      return new Response(out, { headers: { "content-type": "application/json" } });
    }
    if (!url.pathname.startsWith("/api/")) return worker.fetch(req, env, ctx);
    const key = url.pathname + (url.searchParams.get("path") ? "?" + url.searchParams.get("path").split("/")[0] : "");
    STATS.req++; (STATS.byPath[key] ||= { req: 0, q: 0, rr: 0, rw: 0 }).req++;
    return worker.fetch(req, { ...env, DB: wrapDB(env.DB, key) }, ctx);
  },
};
