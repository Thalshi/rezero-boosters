// Le jeu côté serveur : chaque action passe ici, et c'est le serveur qui tire les cartes,
// tient la collection et l'essence, et règle les ventes et les échanges. Le navigateur ne fait qu'afficher.
import * as G from "./game.js";

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const fail = (status, message, extra = {}) => json({ error: message, ...extra }, status);
const rng = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
const newId = () => [...crypto.getRandomValues(new Uint8Array(10))].map((b) => b.toString(16).padStart(2, "0")).join("");

export async function ensureGameSchema(db) {
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS players (uid TEXT PRIMARY KEY, data TEXT NOT NULL, version INTEGER NOT NULL, updated INTEGER NOT NULL)"),
  ]);
}

// ---------- état des joueurs ----------
async function loadRow(env, uid) {
  return env.DB.prepare("SELECT data, version FROM players WHERE uid = ?").bind(uid).first();
}
// Applique `fn` à l'état du joueur, en réessayant si une autre requête l'a modifié entre-temps.
async function mutate(env, uid, fn) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const row = await loadRow(env, uid);
    if (!row) throw new Error("no_player");
    const s = G.normalizeSave(JSON.parse(row.data));
    const now = Date.now();
    G.regenS(s, now);
    const result = await fn(s, now);
    if (result && result.abort) return result;
    s.updated = now;
    const res = await env.DB.prepare("UPDATE players SET data = ?, version = version + 1, updated = ? WHERE uid = ? AND version = ?").bind(JSON.stringify(s), now, uid, row.version).run();
    if (res.meta.changes) { await publishStats(env, uid, s); return { ...result, state: s }; }
  }
  throw new Error("busy");
}
async function publishStats(env, uid, s) {
  const st = G.statsS(s);
  await env.DB.prepare("INSERT INTO docs (path, coll, id, data, version, updated) VALUES (?, 'players', ?, ?, 1, ?) ON CONFLICT(path) DO UPDATE SET data = excluded.data, version = docs.version + 1, updated = excluded.updated")
    .bind("players/" + uid, uid, JSON.stringify({ uid, ...st, t: Date.now() }), Date.now()).run();
}
async function getConfig(env) {
  const r = await env.DB.prepare("SELECT data FROM docs WHERE path = 'config/game'").first();
  return G.configFrom(r ? JSON.parse(r.data) : null);
}
async function readDoc(env, path) {
  const r = await env.DB.prepare("SELECT data, version FROM docs WHERE path = ?").bind(path).first();
  return r ? { data: JSON.parse(r.data), version: r.version } : null;
}
async function writeDoc(env, coll, id, data) {
  await env.DB.prepare("INSERT INTO docs (path, coll, id, data, version, updated) VALUES (?, ?, ?, ?, 1, ?) ON CONFLICT(path) DO UPDATE SET data = excluded.data, version = docs.version + 1, updated = excluded.updated")
    .bind(coll + "/" + id, coll, id, JSON.stringify(data), Date.now()).run();
}
async function postFeed(env, uid, cards) {
  const big = cards.filter((x) => G.RANKS.indexOf(G.CARD_BY_ID[x.id].rar) >= 4 || x.gold);
  for (const x of big) await writeDoc(env, "feed", newId(), { uid, card: x.id, gold: x.gold, t: Date.now() });
}

// Premier passage : crée le compte, en reprenant si possible la collection d'invité du navigateur
// ou l'ancienne sauvegarde du compte, à condition qu'elle soit plausible.
async function ensurePlayer(env, user, guest) {
  if (await loadRow(env, user.id)) return null;
  let s = null, imported = null;
  const legacy = await readDoc(env, `data/users/${user.id}/rzlol`);
  for (const [src, cand] of [["compte", legacy?.data], ["invité", guest]]) {
    if (!cand) continue;
    const n = G.normalizeSave(cand);
    if (G.plausibleSave(n)) { s = n; imported = src; break; }
  }
  if (!s) s = G.freshSave();
  s.updated = Date.now();
  await env.DB.prepare("INSERT OR IGNORE INTO players (uid, data, version, updated) VALUES (?, ?, 1, ?)").bind(user.id, JSON.stringify(s), Date.now()).run();
  await publishStats(env, user.id, s);
  return imported;
}

// ---------- routes ----------
const canMarket = (user, s) => (user.member || user.admin) && s.opened >= G.MARKET_MIN_OPENED;
const marketBlock = (s) => `Le marché et les échanges s'ouvrent après ${G.MARKET_MIN_OPENED} boosters (tu en as ouvert ${s.opened}).`;

export async function gameRoute(req, env, user, path) {
  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  try {
    if (path === "/api/game/state") {
      const imported = await ensurePlayer(env, user, body.guest);
      const r = await mutate(env, user.id, (s) => { s.linked = true; return {}; });
      return json({ state: r.state, imported });
    }
    await ensurePlayer(env, user, null);
    const cfg = await getConfig(env);

    if (path === "/api/game/open") {
      const r = await mutate(env, user.id, (s, now) => {
        const out = G.takeAndOpenS(s, body.pack, !!body.paid, cfg, user.id, rng, now);
        return out.error ? { abort: true, error: out.error } : out;
      });
      if (r.error) return fail(400, r.error);
      await postFeed(env, user.id, r.cards);
      return json(r);
    }
    if (path === "/api/game/recycle") {
      const r = await mutate(env, user.id, (s, now) => ({ value: G.recycleS(s, now) }));
      return json(r);
    }
    if (path === "/api/game/disenchant") {
      const r = await mutate(env, user.id, (s, now) => {
        if (G.ownOf(s, body.id)[body.gold ? "gold" : "n"] <= (body.keepLast ? 1 : 0)) return { abort: true, error: "Tu n'as plus d'exemplaire à désenchanter." };
        const v = G.disenchantS(s, body.id, !!body.gold, now);
        return v ? { value: v } : { abort: true, error: "Carte introuvable." };
      });
      return r.error ? fail(400, r.error) : json(r);
    }
    if (path === "/api/game/craft") {
      const r = await mutate(env, user.id, (s, now) => { const o = G.craftS(s, cfg, user.id, rng, now); return o.error ? { abort: true, error: o.error } : o; });
      if (r.error) return fail(400, r.error);
      await postFeed(env, user.id, [r.card]);
      return json(r);
    }
    if (path === "/api/game/claim") {
      const r = await mutate(env, user.id, (s, now) => {
        const o = G.claimAnyS(s, body.kind, body.id, now);
        return o || { abort: true, error: "Rien à récupérer." };
      });
      return r.error ? fail(400, r.error) : json(r);
    }
    if (path === "/api/game/predictions") {
      // crédite les bonnes prédictions validées par Billy, et la mission « fais une prédiction »
      const votes = (await readDoc(env, "votes/" + user.id))?.data?.answers || {};
      const { results } = await env.DB.prepare("SELECT id, data FROM docs WHERE coll = 'predq'").all();
      const won = results.map((q) => ({ id: q.id, ...JSON.parse(q.data) })).filter((q) => q.status === "resolved" && votes[q.id] === q.answer);
      const r = await mutate(env, user.id, (s, now) => {
        const fresh = won.filter((q) => !s.predPaid.includes(q.id));
        for (const q of fresh) s.predPaid.push(q.id);
        s.chakra += fresh.length * 50;
        const d = G.ensureDailyS(s, now);
        if (Object.keys(votes).length && !d.prog.predict) G.trackS(s, "predict", 1, now);
        return { won: fresh.length, value: fresh.length * 50 };
      });
      return json(r);
    }

    // ----- marché -----
    if (path === "/api/game/market/sell") {
      const price = Math.round(+body.price);
      if (!(price >= 5 && price <= 99999)) return fail(400, "Choisis un prix entre 5 et 99 999 ◆.");
      const lid = newId();
      const r = await mutate(env, user.id, (s, now) => {
        if (!canMarket(user, s)) return { abort: true, error: marketBlock(s) };
        if (!G.CARD_BY_ID[body.id] || !G.removeCardS(s, body.id, !!body.gold)) return { abort: true, error: "Tu n'as plus cette carte." };
        G.trackS(s, "sell", 1, now);
        return { lid };
      });
      if (r.error) return fail(400, r.error);
      await writeDoc(env, "market", lid, { seller: user.id, card: body.id, gold: !!body.gold, price, status: "open", t: Date.now() });
      return json(r);
    }
    if (path === "/api/game/market/buy") {
      const doc = await readDoc(env, "market/" + body.lid);
      const l = doc?.data;
      if (!l || l.status !== "open") return fail(409, "Cette carte vient d'être vendue.");
      if (l.seller === user.id) return fail(400, "C'est ta propre annonce.");
      const row = await loadRow(env, user.id), me = G.normalizeSave(JSON.parse(row.data));
      if (!canMarket(user, me)) return fail(403, marketBlock(me));
      if (me.chakra < l.price) return fail(400, `Il te faut ${l.price} ◆ (tu en as ${me.chakra}).`);
      if (!G.canPackFor(cfg, G.CARD_BY_ID[l.card], user.id) && !G.hasCard(me, l.card)) return fail(403, "Ce perso n'est pas encore débloqué pour toi.");
      // on réserve l'annonce : un seul acheteur peut passer
      const sold = { ...l, status: "sold", buyer: user.id, soldAt: Date.now() };
      const res = await env.DB.prepare("UPDATE docs SET data = ?, version = version + 1, updated = ? WHERE path = ? AND version = ? AND json_extract(data, '$.status') = 'open'")
        .bind(JSON.stringify(sold), Date.now(), "market/" + body.lid, doc.version).run();
      if (!res.meta.changes) return fail(409, "Cette carte vient d'être vendue.");
      const r = await mutate(env, user.id, (s, now) => {
        if (s.chakra < l.price) return { abort: true, error: "Plus assez d'essence." };
        s.chakra -= l.price; G.addCardS(s, l.card, l.gold, now);
        return {};
      });
      if (r.error) { await writeDoc(env, "market", body.lid, l); return fail(400, r.error); }
      await mutate(env, l.seller, (s, now) => { s.chakra += l.price; s.sales = (s.sales || 0) + 1; G.trackS(s, "sold", 1, now); return {}; }).catch(() => {});
      return json({ ...r, card: l.card, price: l.price });
    }
    if (path === "/api/game/market/cancel") {
      const doc = await readDoc(env, "market/" + body.lid);
      const l = doc?.data;
      if (!l || l.seller !== user.id || l.status !== "open") return fail(400, "Cette annonce n'est plus en vente.");
      const res = await env.DB.prepare("UPDATE docs SET data = ?, version = version + 1, updated = ? WHERE path = ? AND version = ? AND json_extract(data, '$.status') = 'open'")
        .bind(JSON.stringify({ ...l, status: "cancelled" }), Date.now(), "market/" + body.lid, doc.version).run();
      if (!res.meta.changes) return fail(409, "Cette carte vient d'être vendue.");
      const r = await mutate(env, user.id, (s, now) => { G.addCardS(s, l.card, l.gold, now); return {}; });
      return json(r);
    }

    // ----- échanges entre joueurs -----
    if (path === "/api/game/trade/propose") {
      const to = String(body.to || ""), give = cleanItems(body.give), want = cleanItems(body.want), chakra = Math.max(0, Math.round(+body.chakra || 0));
      if (!to || to === user.id) return fail(400, "Choisis avec qui échanger.");
      if (!give.length && !chakra) return fail(400, "Propose au moins une carte ou de l'essence.");
      if (!want.length) return fail(400, "Choisis au moins une carte à recevoir.");
      if (!G.tradeFair(give, want, chakra)) return fail(400, "Échange trop déséquilibré : les gros dons sont bloqués, comme sur Kyara.");
      const other = await loadRow(env, to);
      if (!other) return fail(404, "Ce joueur n'a pas encore de collection.");
      const tid = newId();
      // les cartes proposées sont mises de côté jusqu'à la réponse
      const r = await mutate(env, user.id, (s) => {
        if (!canMarket(user, s)) return { abort: true, error: marketBlock(s) };
        if (s.chakra < chakra) return { abort: true, error: "Pas assez d'essence." };
        for (const it of give) if (!G.removeCardS(s, it.id, it.gold, it.n)) return { abort: true, error: `Tu n'as plus assez de ${G.PEOPLE[G.CARD_BY_ID[it.id].who].name}.` };
        s.chakra -= chakra;
        return { tid };
      });
      if (r.error) return fail(400, r.error);
      await writeDoc(env, "trades", tid, { from: user.id, to, give, want, chakra, status: "open", t: Date.now() });
      return json(r);
    }
    if (path === "/api/game/trade/answer") {
      const doc = await readDoc(env, "trades/" + body.tid);
      const t = doc?.data;
      if (!t || t.status !== "open") return fail(400, "Cet échange n'est plus en cours.");
      const accept = body.action === "accept";
      if (accept && t.to !== user.id) return fail(403, "Cet échange ne t'est pas adressé.");
      if (!accept && t.to !== user.id && t.from !== user.id) return fail(403, "Cet échange ne te concerne pas.");
      const status = accept ? "done" : t.from === user.id ? "cancelled" : "refused";
      const res = await env.DB.prepare("UPDATE docs SET data = ?, version = version + 1, updated = ? WHERE path = ? AND version = ? AND json_extract(data, '$.status') = 'open'")
        .bind(JSON.stringify({ ...t, status, closedAt: Date.now() }), Date.now(), "trades/" + body.tid, doc.version).run();
      if (!res.meta.changes) return fail(409, "Cet échange vient de changer.");
      if (!accept) {
        await mutate(env, t.from, (s, now) => { for (const it of t.give) for (let i = 0; i < it.n; i++) G.addCardS(s, it.id, it.gold, now); s.chakra += t.chakra; return {}; });
        const r = await mutate(env, user.id, () => ({}));
        return json(r);
      }
      const r = await mutate(env, user.id, (s, now) => {
        if (!canMarket(user, s)) return { abort: true, error: marketBlock(s) };
        for (const it of t.want) if (!G.removeCardS(s, it.id, it.gold, it.n)) return { abort: true, error: `Tu n'as plus assez de ${G.PEOPLE[G.CARD_BY_ID[it.id].who].name}.` };
        for (const it of t.give) for (let i = 0; i < it.n; i++) G.addCardS(s, it.id, it.gold, now);
        s.chakra += t.chakra; s.trades = (s.trades || 0) + 1; G.trackS(s, "trade", 1, now);
        return {};
      });
      if (r.error) { await writeDoc(env, "trades", body.tid, t); return fail(400, r.error); }
      await mutate(env, t.from, (s, now) => { for (const it of t.want) for (let i = 0; i < it.n; i++) G.addCardS(s, it.id, it.gold, now); s.trades = (s.trades || 0) + 1; G.trackS(s, "trade", 1, now); return {}; });
      return json(r);
    }

    // ----- profil public -----
    if (path === "/api/game/profile") {
      const row = await loadRow(env, String(body.uid || ""));
      if (!row) return fail(404, "Profil introuvable.");
      const s = G.normalizeSave(JSON.parse(row.data));
      const owned = Object.fromEntries(Object.entries(s.owned).filter(([, o]) => o.n + o.gold > 0).map(([id, o]) => [id, [o.n, o.gold]]));
      return json({ uid: body.uid, stats: G.statsS(s), owned, showcase: s.showcase || [], wish: s.wish || [] });
    }
    if (path === "/api/game/showcase") {
      const ids = (Array.isArray(body.ids) ? body.ids : []).filter((id) => G.CARD_BY_ID[id]).slice(0, 4);
      const r = await mutate(env, user.id, (s) => { s.showcase = ids.filter((id) => G.hasCard(s, id)); return {}; });
      return json(r);
    }
    if (path === "/api/game/wish") {
      const r = await mutate(env, user.id, (s) => {
        const w = new Set(s.wish || []);
        for (const id of body.add || []) if (G.CARD_BY_ID[id]) w.add(id);
        for (const id of body.remove || []) w.delete(id);
        s.wish = [...w].slice(0, 300);
        return {};
      });
      return json(r);
    }
    return fail(404, "Action inconnue.");
  } catch (e) {
    if (e.message === "busy") return fail(503, "Le serveur est occupé, réessaie dans un instant.");
    throw e;
  }
}
function cleanItems(items) {
  const map = new Map();
  for (const it of Array.isArray(items) ? items.slice(0, 20) : []) {
    if (!G.CARD_BY_ID[it?.id]) continue;
    const k = it.id + (it.gold ? "*" : ""), n = Math.max(1, Math.min(20, Math.round(+it.n || 1)));
    map.set(k, { id: it.id, gold: !!it.gold, n: (map.get(k)?.n || 0) + n });
  }
  return [...map.values()];
}
