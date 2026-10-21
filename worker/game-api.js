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
    db.prepare("CREATE TABLE IF NOT EXISTS chat (id INTEGER PRIMARY KEY AUTOINCREMENT, uid TEXT NOT NULL, kind TEXT NOT NULL, text TEXT NOT NULL, card TEXT, gold INTEGER NOT NULL DEFAULT 0, ts INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0)"),
    db.prepare("CREATE TABLE IF NOT EXISTS notifs (id INTEGER PRIMARY KEY AUTOINCREMENT, uid TEXT NOT NULL, kind TEXT NOT NULL, text TEXT NOT NULL, data TEXT, ts INTEGER NOT NULL)"),
    db.prepare("CREATE INDEX IF NOT EXISTS notifs_uid ON notifs (uid, id)"),
    db.prepare("CREATE TABLE IF NOT EXISTS notif_read (uid TEXT PRIMARY KEY, last INTEGER NOT NULL)"),
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
  // les Mythiques et les Légendaires dorées s'annoncent aussi dans le chat
  for (const x of big.filter((x) => G.CARD_BY_ID[x.id].rar === "m" || (x.gold && G.CARD_BY_ID[x.id].rar === "l"))) await sayChat(env, uid, "pull", "", x.id, x.gold);
}

// Enregistre un vote dans votes/<uid> (même format qu'avant, plus l'heure de chaque vote).
async function writeVote(env, uid, qid, idx, now) {
  const path = "votes/" + uid;
  for (let attempt = 0; attempt < 5; attempt++) {
    const row = await env.DB.prepare("SELECT data, version FROM docs WHERE path = ?").bind(path).first();
    const v = row ? JSON.parse(row.data) : { uid, answers: {} };
    v.uid = uid; v.answers = { ...(v.answers || {}), [qid]: idx }; v.at = { ...(v.at || {}), [qid]: now }; v.t = now;
    const res = row
      ? await env.DB.prepare("UPDATE docs SET data = ?, version = version + 1, updated = ? WHERE path = ? AND version = ?").bind(JSON.stringify(v), now, path, row.version).run()
      : await env.DB.prepare("INSERT OR IGNORE INTO docs (path, coll, id, data, version, updated) VALUES (?, 'votes', ?, ?, 1, ?)").bind(path, uid, JSON.stringify(v), now).run();
    if (res.meta.changes) return { ok: true, answers: v.answers };
  }
  throw new Error("busy");
}
// Billy ferme, résout ou rouvre une question : on note l'heure de fermeture, qui sert à valider les votes.
export function stampPredq(before, after, now = Date.now()) {
  if (!after || typeof after !== "object") return after;
  if (after.status === "open") { delete after.closedAt; delete after.resolvedAt; return after; }
  if (!after.closedAt) after.closedAt = before?.status === "open" || !before ? now : before.closedAt || now;
  if (after.status === "resolved" && !after.resolvedAt) after.resolvedAt = now;
  return after;
}

// ---------- contrôle des comptes (lecture seule, réservé à l'admin) ----------
async function auditPlayers(env) {
  const { results } = await env.DB.prepare("SELECT p.uid, p.data, u.name FROM players p LEFT JOIN users u ON u.id = p.uid").all();
  const flagged = [];
  for (const row of results) {
    const s = G.normalizeSave(JSON.parse(row.data)), st = G.statsS(s), n = s.opened || 0, why = [];
    const golds = Object.values(s.owned).reduce((a, o) => a + (o.gold || 0), 0);
    if (s.free > 40) why.push(`${s.free} boosters gratuits en réserve (normal : 10 à 40)`);
    if (s.chakra > 2000 + n * 40) why.push(`${s.chakra} ◆ pour ${n} boosters ouverts`);
    if (st.mythics > Math.ceil(n * 0.06) + 2 + Math.floor(n / G.MYTHIC_PITY)) why.push(`${st.mythics} Mythiques pour ${n} boosters`);
    if (golds > Math.ceil(n * 0.25) + 3) why.push(`${golds} cartes dorées pour ${n} boosters`);
    if (st.total > n * G.PACK * 1.5 + 50) why.push(`${st.total} cartes pour ${n} boosters`);
    if (why.length) flagged.push({ uid: row.uid, name: row.name, opened: n, free: s.free, chakra: s.chakra, mythics: st.mythics, why });
  }
  // anciens votes sans heure sur des questions déjà résolues : impossibles à dater, à vérifier à la main
  const qs = (await env.DB.prepare("SELECT id, data FROM docs WHERE coll = 'predq'").all()).results.map((q) => ({ id: q.id, ...JSON.parse(q.data) })).filter((q) => q.status === "resolved");
  const votes = (await env.DB.prepare("SELECT id, data FROM docs WHERE coll = 'votes'").all()).results.map((v) => ({ uid: v.id, ...JSON.parse(v.data) }));
  const undated = votes.map((v) => ({ uid: v.uid, questions: qs.filter((q) => v.answers?.[q.id] != null && !v.at?.[q.id]).map((q) => q.id) })).filter((v) => v.questions.length);
  return { checked: results.length, flagged, undatedVotes: undated, note: "Lecture seule : rien n'a été modifié. Les seuils sont larges, un signalement n'est pas une preuve de triche." };
}

// ---------- chat et notifications ----------
const cardName = (id) => { const c = G.CARD_BY_ID[id]; return c ? `${G.PEOPLE[c.who].name} · ${c.title}` : "une carte"; };
async function sayChat(env, uid, kind, text, card = null, gold = false) {
  await env.DB.prepare("INSERT INTO chat (uid, kind, text, card, gold, ts) VALUES (?, ?, ?, ?, ?, ?)").bind(uid, kind, text, card, gold ? 1 : 0, Date.now()).run();
}
// uid "*" : notification pour tout le monde (annonce, nouvel épisode, prédictions)
export async function notify(env, uid, kind, text, data = null) {
  await env.DB.prepare("INSERT INTO notifs (uid, kind, text, data, ts) VALUES (?, ?, ?, ?, ?)").bind(uid, kind, text.slice(0, 300), data ? JSON.stringify(data) : null, Date.now()).run();
}
// Appelé par le serveur de documents après une écriture de Billy : nouvel épisode, nouvelle prédiction, résultat.
export async function afterAdminWrite(env, path, before, after) {
  try {
    if (path === "config/game") {
      const b = G.configFrom(before), a = G.configFrom(after);
      if (a.def > b.def) await notify(env, "*", "episode", `Épisode ${a.def} débloqué : de nouveaux persos arrivent dans les boosters !`, { go: "boosters" });
      for (const [uid, ep] of Object.entries(a.progress)) if (ep > (b.progress[uid] ?? b.def) && ep > a.def) await notify(env, uid, "episode", `Billy t'a débloqué l'épisode ${ep} : de nouveaux persos à packer !`, { go: "boosters" });
    }
    if (path.startsWith("predq/") && after) {
      if (!before) await notify(env, "*", "pred", `Nouvelle prédiction : ${after.text}`, { go: "pred" });
      else if (after.status === "resolved" && before.status !== "resolved") await notify(env, "*", "pred", `Résultat : ${after.text} → ${after.options?.[after.answer] ?? "?"}`, { go: "pred" });
    }
  } catch (e) { /* une notif ratée ne doit jamais bloquer l'écriture */ }
}
const CHAT_MAX = 300;
async function chatRoute(env, user, path, body) {
  if (path === "/api/game/pulse") {
    // un seul appel régulier : nouveaux messages du chat + notifications
    const after = Number.isFinite(+body.after) && body.after !== null ? +body.after : null;
    const sel = "SELECT c.id, c.uid, c.kind, c.text, c.card, c.gold, c.ts, u.name, u.avatar FROM chat c LEFT JOIN users u ON u.id = c.uid WHERE c.deleted = 0";
    const chat = after == null
      ? (await env.DB.prepare(sel + " ORDER BY c.id DESC LIMIT 60").all()).results.reverse()
      : (await env.DB.prepare(sel + " AND c.id > ? ORDER BY c.id ASC LIMIT 100").bind(after).all()).results;
    const gone = after == null ? [] : (await env.DB.prepare("SELECT id FROM chat WHERE deleted = 1 AND id > ? - 300").bind(after).all()).results.map((r) => r.id);
    const items = (await env.DB.prepare("SELECT id, kind, text, data, ts FROM notifs WHERE uid IN (?, '*') ORDER BY id DESC LIMIT 30").bind(user.id).all()).results
      .map((n) => ({ ...n, data: n.data ? JSON.parse(n.data) : null }));
    const read = (await env.DB.prepare("SELECT last FROM notif_read WHERE uid = ?").bind(user.id).first())?.last ?? 0;
    return json({ chat: chat.map((m) => ({ ...m, gold: !!m.gold, admin: isAdminId(env, m.uid) })), gone, notifs: { items, read, unread: items.filter((n) => n.id > read).length } });
  }
  if (path === "/api/game/notifs/read") {
    const last = Math.max(0, Math.round(+body.last || 0));
    await env.DB.prepare("INSERT INTO notif_read (uid, last) VALUES (?, ?) ON CONFLICT(uid) DO UPDATE SET last = MAX(last, excluded.last)").bind(user.id, last).run();
    return json({ ok: true });
  }
  if (path === "/api/game/chat/send") {
    if (!user.member && !user.admin) return fail(403, "Le chat est réservé aux membres du QG de Shinjuku.");
    const text = String(body.text || "").replace(/\s+/g, " ").trim().slice(0, CHAT_MAX);
    const card = body.card && G.CARD_BY_ID[body.card] ? body.card : null, gold = !!body.gold && !!card;
    if (!text && !card) return fail(400, "Écris un message.");
    const last = await env.DB.prepare("SELECT ts FROM chat WHERE uid = ? AND kind = 'msg' ORDER BY id DESC LIMIT 1").bind(user.id).first();
    if (last && Date.now() - last.ts < 1200) return fail(429, "Doucement, un message à la fois.");
    if (card) {
      const row = await loadRow(env, user.id), s = row && G.normalizeSave(JSON.parse(row.data));
      const o = s && G.ownOf(s, card);
      if (!o || (gold ? o.gold < 1 : o.n + o.gold < 1)) return fail(400, "Tu ne peux montrer que tes propres cartes.");
    }
    await sayChat(env, user.id, "msg", text, card, gold);
    await mutate(env, user.id, (s, now) => { G.trackS(s, "chat", 1, now); return {}; }).catch(() => {});
    // mentions : @Nom d'un joueur connu → notification pour lui
    if (text.includes("@")) {
      const low = text.toLowerCase(), { results } = await env.DB.prepare("SELECT id, name FROM users WHERE name IS NOT NULL").all();
      for (const u of results) if (u.id !== user.id && u.name && low.includes("@" + u.name.toLowerCase())) await notify(env, u.id, "mention", `${user.name} t'a mentionné : « ${text.slice(0, 120)} »`, { chat: true });
    }
    return json({ ok: true });
  }
  if (path === "/api/game/chat/delete") {
    const m = await env.DB.prepare("SELECT uid FROM chat WHERE id = ?").bind(+body.id || 0).first();
    if (!m) return fail(404, "Message introuvable.");
    if (m.uid !== user.id && !user.admin) return fail(403, "Tu ne peux effacer que tes messages.");
    await env.DB.prepare("UPDATE chat SET deleted = 1 WHERE id = ?").bind(+body.id).run();
    return json({ ok: true });
  }
  if (path === "/api/game/announce") {
    if (!user.admin) return fail(403, "Réservé à l'admin.");
    const text = String(body.text || "").replace(/\s+/g, " ").trim().slice(0, CHAT_MAX);
    if (!text) return fail(400, "Écris l'annonce.");
    await sayChat(env, user.id, "announce", text);
    await notify(env, "*", "announce", `Annonce de ${user.name} : ${text}`, { chat: true });
    return json({ ok: true });
  }
  return null;
}
const isAdminId = (env, uid) => String(env.ADMIN_IDS || "").split(/[\s,]+/).filter(Boolean).includes(String(uid).slice(1));

// Premier passage : crée le compte. Si le navigateur envoie une partie jouée en invité, ou s'il existe
// une ancienne sauvegarde du compte, on n'en reprend que des cartes peu précieuses (voir importSaveS) :
// le client ne peut imposer ni boosters, ni essence, ni cartes rares.
async function ensurePlayer(env, user, guest) {
  if (await loadRow(env, user.id)) return null;
  let s = G.freshSave(), imported = null;
  const legacy = await readDoc(env, `data/users/${user.id}/rzlol`);
  for (const [src, cand] of [["compte", legacy?.data], ["invité", guest]]) {
    if (!cand) continue;
    const n = G.importSaveS(cand);
    if (n.imported.cards) { s = n; s.imported.from = src; imported = src; break; }
  }
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
    const chatRes = await chatRoute(env, user, path, body);
    if (chatRes) return chatRes;
    if (path === "/api/game/admin/audit") {
      if (!user.admin) return fail(403, "Réservé à l'admin.");
      return json(await auditPlayers(env));
    }
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
    if (path === "/api/game/seen") {
      const r = await mutate(env, user.id, (s, now) => {
        const d = G.ensureDailyS(s, now);
        if ((d.prog.sheet || 0) >= 10) return { abort: true };
        G.trackS(s, "sheet", 1, now); return {};
      });
      return json(r.state ? r : { ok: true });
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
    if (path === "/api/game/vote") {
      // le vote passe par le serveur : refusé dès que la question est fermée ou résolue
      if (!user.member && !user.admin) return fail(403, "Il faut être membre du QG de Shinjuku pour voter.");
      const now = Date.now(), qid = String(body.qid || ""), idx = Number(body.idx);
      const q = qid && (await readDoc(env, "predq/" + qid))?.data;
      if (!q) return fail(404, "Cette question n'existe plus.");
      if (q.status !== "open") return fail(409, "Les votes sont fermés pour cette question.");
      if (!Number.isInteger(idx) || idx < 0 || idx >= (q.options || []).length) return fail(400, "Réponse invalide.");
      return json(await writeVote(env, user.id, qid, idx, now));
    }
    if (path === "/api/game/predictions") {
      // crédite les bonnes prédictions validées par Billy, et la mission « fais une prédiction »
      const vdoc = (await readDoc(env, "votes/" + user.id))?.data || {}, votes = vdoc.answers || {};
      const { results } = await env.DB.prepare("SELECT id, data FROM docs WHERE coll = 'predq'").all();
      const qs = results.map((q) => ({ id: q.id, ...JSON.parse(q.data) }));
      const won = qs.filter((q) => q.status === "resolved" && votes[q.id] === q.answer && G.predVoteOk(q, vdoc));
      const r = await mutate(env, user.id, (s, now) => {
        // chaque nouveau vote compte pour les missions « vote pour une prédiction »
        const voted = qs.filter((q) => votes[q.id] != null && !s.predVoted.includes(q.id));
        for (const q of voted) s.predVoted.push(q.id);
        if (voted.length) G.trackS(s, "predict", voted.length, now);
        // chaque bonne prédiction rapporte ce que Billy a fixé sur la question
        const fresh = won.filter((q) => !s.predPaid.includes(q.id));
        for (const q of fresh) s.predPaid.push(q.id);
        const value = fresh.reduce((t, q) => t + G.predRewardOf(q), 0);
        s.chakra += value;
        if (fresh.length) G.trackS(s, "predwin", fresh.length, now);
        if (!voted.length && !fresh.length) return { abort: true, won: 0, value: 0 };
        return { won: fresh.length, value };
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
      await notify(env, l.seller, "sold", `${user.name} a acheté ta carte ${cardName(l.card)}${l.gold ? " dorée" : ""} : +${l.price} ◆`, { go: "market" });
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
      await notify(env, to, "trade", `${user.name} te propose un échange.`, { go: "trades" });
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
        if (status === "refused") await notify(env, t.from, "trade", `${user.name} a refusé ton échange. Tes cartes sont revenues.`, { go: "trades" });
        else await notify(env, t.to, "trade", `${user.name} a annulé sa proposition d'échange.`, { go: "trades" });
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
      await notify(env, t.from, "trade", `${user.name} a accepté ton échange !`, { go: "trades" });
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
