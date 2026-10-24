// Serveur de l'app sur Cloudflare : connexion Discord + petite base de documents (D1)
// qui reproduit ce que la version claude.ai fait avec ses capacités `db` et `user`.
// Le jeu lui-même (tirages, essence, marché, échanges) est décidé par game-api.js.
import { ensureGameSchema, gameRoute, afterAdminWrite, stampPredq } from "./game-api.js";
import { ensureCombatSchema } from "./combat-api.js";
import { SYNC_SCHEMA, bumpRev, revKeyOf } from "./sync.js";

const SESSION_DAYS = 30;
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });
const fail = (status, code, message) => json({ code, message }, status);

let schemaReady = false;
async function ensureSchema(db) {
  if (schemaReady) return;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS docs (path TEXT PRIMARY KEY, coll TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, version INTEGER NOT NULL, updated INTEGER NOT NULL, lease_holder TEXT, lease_until INTEGER)"),
    db.prepare("CREATE INDEX IF NOT EXISTS docs_coll ON docs (coll)"),
    db.prepare("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT, avatar TEXT, member INTEGER, updated INTEGER)"),
    db.prepare("CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, uid TEXT NOT NULL, expires INTEGER NOT NULL)"),
  ]);
  await ensureGameSchema(db);
  await ensureCombatSchema(db);
  // compteurs de synchro (ajouts seulement) : un échec ici ne doit jamais bloquer le site
  try { await db.batch(SYNC_SCHEMA.map((sql) => db.prepare(sql))); } catch (e) { console.error("sync_rev : schéma non créé", e?.message); }
  schemaReady = true;
}

// ---------- Chemins (mêmes règles que les chemins de la version claude.ai) ----------
const SEG = /^[A-Za-z0-9_\-.~:@+]{1,200}$/;
function parsePath(path, wantDoc) {
  const segs = String(path || "").split("/");
  if (!segs.length || segs.length > 16 || segs.some((s) => !SEG.test(s) || s === "." || s === "..")) return null;
  if (wantDoc !== (segs.length % 2 === 0)) return null;
  return segs;
}

// ---------- Droits ----------
// lecture : tout joueur connecté ; écriture : membre du serveur Discord ; admin : ADMIN_IDS.
// data/users/<id>/… : ancienne sauvegarde, lisible par ce joueur seulement.
// votes : écrits par le serveur du jeu ; chacun lit le sien, l'admin lit tout.
// config, predq, pred : écriture réservée à l'admin. avis : le sien. bugs : lus par l'admin seulement.
// feed, players, market, trades : écrits seulement par le serveur du jeu (game-api.js).
// lab, qa : jamais accessibles ici (routes dédiées, réservées à l'admin).
const SERVER_ONLY = ["feed", "players", "market", "trades"];
function allowed(user, segs, op) {
  if (!user) return false;
  const write = op !== "read" && op !== "list";
  const top = segs[0];
  if (SERVER_ONLY.includes(top)) return !write;
  // labo admin et contrôle qualité : seulement par leurs routes (/api/game/lab, /api/game/qa), jamais par l'API des documents
  if (top === "lab" || top === "qa" || top === "defile" || top === "confront" || top === "confrontcfg" || top === "creations" || top === "creaimg" || top === "devbackup" || top === "refcfg") return false;
  // ancienne sauvegarde du compte : lisible par son joueur, plus modifiable (le serveur tient la partie)
  if (top === "data" && segs[1] === "users") return segs.length >= 3 && segs[2] === user.id && !write;
  // votes : écrits seulement par le serveur (/api/game/vote vérifie que la question est ouverte)
  if (top === "votes") {
    if (write) return false;
    if (segs.length === 1) return op === "list" && user.admin;
    return segs[1] === user.id || (op === "read" && user.admin);
  }
  if (["config", "predq", "pred"].includes(top)) return !write || user.admin;
  // avis : chacun écrit le sien ; bugs : on peut en envoyer, seul l'admin les lit
  if (top === "avis") return !write || segs[1] === user.id;
  if (top === "bugs") return write ? true : user.admin;
  return !write || user.member || user.admin;
}

// ---------- Session ----------
function cookie(req, name) {
  const m = (req.headers.get("cookie") || "").match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[1]) : null;
}
// admin (Billy) : le contenu du jeu ; dev (Reichi) : les outils techniques, et aussi tous les droits d'admin
const inList = (list, discordId) => String(list || "").split(/[\s,]+/).filter(Boolean).includes(discordId);
const isDev = (env, discordId) => inList(env.DEV_IDS, discordId);
const isAdmin = (env, discordId) => inList(env.ADMIN_IDS, discordId) || isDev(env, discordId);
async function currentUser(req, env) {
  const token = cookie(req, "rz_session");
  if (!token) return null;
  const row = await env.DB.prepare("SELECT s.uid, s.expires, u.name, u.avatar, u.member FROM sessions s JOIN users u ON u.id = s.uid WHERE s.token = ?").bind(token).first();
  if (!row || row.expires < Date.now()) return null;
  const discordId = row.uid.slice(1);
  return { id: row.uid, name: row.name, avatar: row.avatar, member: !!row.member, admin: isAdmin(env, discordId), dev: isDev(env, discordId) };
}
const randomToken = () => [...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, "0")).join("");

// ---------- Connexion Discord ----------
function origin(req) { const u = new URL(req.url); return u.origin; }
function redirectUri(req, env) { return env.REDIRECT_URI || origin(req) + "/auth/callback"; }

async function login(req, env) {
  if (!env.DISCORD_CLIENT_ID) return new Response("Connexion Discord pas encore configurée (DISCORD_CLIENT_ID manquant).", { status: 500 });
  const state = randomToken().slice(0, 24);
  // « consent » : Discord montre toujours l'écran d'autorisation, la personne choisit elle-même de se connecter avec ce compte
  const q = new URLSearchParams({ client_id: env.DISCORD_CLIENT_ID, response_type: "code", redirect_uri: redirectUri(req, env), scope: "identify guilds", state, prompt: "consent" });
  return new Response(null, { status: 302, headers: { location: "https://discord.com/oauth2/authorize?" + q, "set-cookie": `rz_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600` } });
}

async function callback(req, env) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code"), state = url.searchParams.get("state");
  if (!code || !state || state !== cookie(req, "rz_state")) return Response.redirect(origin(req) + "/?login=error", 302);
  const tok = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env.DISCORD_CLIENT_ID, client_secret: env.DISCORD_CLIENT_SECRET, grant_type: "authorization_code", code, redirect_uri: redirectUri(req, env) }),
  }).then((r) => r.json());
  if (!tok.access_token) return Response.redirect(origin(req) + "/?login=error", 302);
  const auth = { authorization: "Bearer " + tok.access_token };
  const [me, guilds] = await Promise.all([
    fetch("https://discord.com/api/users/@me", { headers: auth }).then((r) => r.json()),
    fetch("https://discord.com/api/users/@me/guilds", { headers: auth }).then((r) => (r.ok ? r.json() : [])),
  ]);
  if (!me.id) return Response.redirect(origin(req) + "/?login=error", 302);
  const member = !env.GUILD_ID || (Array.isArray(guilds) && guilds.some((g) => g.id === env.GUILD_ID));
  const avatar = me.avatar ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png?size=64` : `https://cdn.discordapp.com/embed/avatars/${Number(BigInt(me.id) >> 22n) % 6}.png`;
  const uid = "d" + me.id, token = randomToken();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO users (id, name, avatar, member, updated) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name, avatar = excluded.avatar, member = excluded.member, updated = excluded.updated")
      .bind(uid, me.global_name || me.username, avatar, member ? 1 : 0, Date.now()),
    env.DB.prepare("INSERT INTO sessions (token, uid, expires) VALUES (?, ?, ?)").bind(token, uid, Date.now() + SESSION_DAYS * 86400e3),
    env.DB.prepare("DELETE FROM sessions WHERE expires < ?").bind(Date.now()),
  ]);
  await bumpRev(env, "users");
  const headers = new Headers({ location: origin(req) + "/" });
  headers.append("set-cookie", `rz_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`);
  headers.append("set-cookie", "rz_state=; Path=/; Max-Age=0");
  return new Response(null, { status: 302, headers });
}

async function logout(req, env) {
  const token = cookie(req, "rz_session");
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  return new Response(null, { status: 302, headers: { location: origin(req) + "/", "set-cookie": "rz_session=; Path=/; Max-Age=0" } });
}

// ---------- Documents ----------
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
function merge(base, patch) {
  const out = { ...base };
  for (const [k, v] of Object.entries(patch)) out[k] = isObj(v) && isObj(base[k]) ? merge(base[k], v) : v;
  return out;
}
const rowOut = (r) => ({ id: r.id, exists: true, data: JSON.parse(r.data), version: r.version });

async function docRoute(req, env, user) {
  const url = new URL(req.url);
  const segs = parsePath(url.searchParams.get("path"), true);
  if (!segs) return fail(400, "invalid_argument", "Chemin de document invalide.");
  const path = segs.join("/"), coll = segs.slice(0, -1).join("/"), id = segs[segs.length - 1];
  const method = req.method;
  const op = method === "GET" ? "read" : "write";
  if (!allowed(user, segs, op)) return op === "read" ? json({ id, exists: false }) : fail(403, "invalid_argument", "Écriture refusée.");
  if (method === "GET") {
    const r = await env.DB.prepare("SELECT id, data, version FROM docs WHERE path = ?").bind(path).first();
    if (r && segs[0] === "trades") { const t = JSON.parse(r.data); if (t.from !== user.id && t.to !== user.id) return json({ id, exists: false }); }
    return json(r ? rowOut(r) : { id, exists: false });
  }
  if (method === "DELETE") { await env.DB.prepare("DELETE FROM docs WHERE path = ?").bind(path).run(); await bumpRev(env, revKeyOf(path)); return json({ ok: true }); }
  const body = await req.json().catch(() => null);
  if (!isObj(body)) return fail(400, "invalid_argument", "Le document doit être un objet JSON.");
  const text = JSON.stringify(body);
  if (text.length > 256 * 1024) return fail(400, "invalid_argument", "Document trop gros.");
  // Billy publie un épisode ou une prédiction : on prévient tout le monde
  const watched = segs[0] === "config" || segs[0] === "predq";
  const before = watched ? await env.DB.prepare("SELECT data FROM docs WHERE path = ?").bind(path).first().then((r) => (r ? JSON.parse(r.data) : null)) : null;
  if (method === "PUT") {
    if (segs[0] === "predq") stampPredq(before, body);
    const text = JSON.stringify(body);
    await env.DB.prepare("INSERT INTO docs (path, coll, id, data, version, updated) VALUES (?, ?, ?, ?, 1, ?) ON CONFLICT(path) DO UPDATE SET data = excluded.data, version = docs.version + 1, updated = excluded.updated")
      .bind(path, coll, id, text, Date.now()).run();
    await bumpRev(env, revKeyOf(path));
    if (watched) await afterAdminWrite(env, path, before, body);
    return json({ ok: true });
  }
  if (method === "PATCH") {
    const r = await env.DB.prepare("SELECT data, version FROM docs WHERE path = ?").bind(path).first();
    if (!r) return fail(404, "invalid_argument", "Document introuvable.");
    const merged = merge(JSON.parse(r.data), body);
    if (segs[0] === "predq") stampPredq(before, merged);
    const next = JSON.stringify(merged);
    const res = await env.DB.prepare("UPDATE docs SET data = ?, version = version + 1, updated = ? WHERE path = ? AND version = ?").bind(next, Date.now(), path, r.version).run();
    if (!res.meta.changes) return fail(409, "conflict", "Le document a changé entre-temps.");
    await bumpRev(env, revKeyOf(path));
    if (watched) await afterAdminWrite(env, path, before, JSON.parse(next));
    return json({ ok: true });
  }
  return fail(405, "invalid_argument", "Méthode non prise en charge.");
}

async function acquireRoute(req, env, user) {
  const { path, holder, ttlMs } = await req.json().catch(() => ({}));
  const segs = parsePath(path, true);
  if (!segs || !allowed(user, segs, "write")) return fail(403, "invalid_argument", "Écriture refusée.");
  const now = Date.now(), until = now + Math.min(600000, Math.max(1000, ttlMs || 30000));
  const res = await env.DB.prepare("UPDATE docs SET lease_holder = ?, lease_until = ? WHERE path = ? AND (lease_until IS NULL OR lease_until < ? OR lease_holder = ?)")
    .bind(String(holder), until, segs.join("/"), now, String(holder)).run();
  return json(res.meta.changes ? { acquired: true, holder, expiresAt: new Date(until).toISOString() } : { acquired: false });
}

const SAFE_FIELD = /^[A-Za-z0-9_]{1,64}$/;
async function collRoute(req, env, user) {
  const url = new URL(req.url);
  const segs = parsePath(url.searchParams.get("path"), false);
  if (!segs) return fail(400, "invalid_argument", "Chemin de collection invalide.");
  const coll = segs.join("/");
  if (req.method === "POST") {
    const id = randomToken().slice(0, 20);
    if (!allowed(user, [...segs, id], "write")) return fail(403, "invalid_argument", "Écriture refusée.");
    const body = await req.json().catch(() => null);
    if (!isObj(body)) return fail(400, "invalid_argument", "Le document doit être un objet JSON.");
    await env.DB.prepare("INSERT INTO docs (path, coll, id, data, version, updated) VALUES (?, ?, ?, ?, 1, ?)").bind(coll + "/" + id, coll, id, JSON.stringify(body), Date.now()).run();
    await bumpRev(env, revKeyOf(coll));
    if (coll === "predq") {
      // une question créée déjà fermée reçoit tout de suite son heure de fermeture
      if (body.status !== "open") { stampPredq(null, body); await env.DB.prepare("UPDATE docs SET data = ? WHERE path = ?").bind(JSON.stringify(body), coll + "/" + id).run(); }
      await afterAdminWrite(env, coll + "/" + id, null, body);
    }
    return json({ id });
  }
  if (!allowed(user, segs, "list")) {
    // une collection dont on ne voit que son propre document (ex. votes) : renvoie seulement celui-là
    return json({ docs: [] });
  }
  const order = url.searchParams.get("orderBy"), dir = url.searchParams.get("dir") === "desc" ? "DESC" : "ASC";
  const limit = Math.min(1000, Math.max(1, +url.searchParams.get("limit") || 1000));
  let sql = "SELECT id, data, version FROM docs WHERE coll = ?";
  if (order && SAFE_FIELD.test(order)) sql += ` ORDER BY json_extract(data, '$.${order}') IS NULL, json_extract(data, '$.${order}') ${dir}`;
  else sql += " ORDER BY id ASC";
  sql += " LIMIT ?";
  const { results } = await env.DB.prepare(sql).bind(coll, limit).all();
  const docs = results.map(rowOut).filter((d) => allowed(user, [...segs, d.id], "read") && (coll !== "trades" || d.data.from === user.id || d.data.to === user.id));
  return json({ docs });
}

async function profilesRoute(req, env, user) {
  const ids = (new URL(req.url).searchParams.get("ids") || "").split(",").filter((s) => /^d\d{5,25}$/.test(s)).slice(0, 100);
  if (!ids.length) return json({});
  const { results } = await env.DB.prepare(`SELECT id, name, avatar FROM users WHERE id IN (${ids.map(() => "?").join(",")})`).bind(...ids).all();
  const out = {};
  for (const r of results) out[r.id] = { name: r.name, avatar: r.avatar };
  return json(out);
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const p = url.pathname;
    if (!p.startsWith("/api/") && !p.startsWith("/auth/")) return env.ASSETS.fetch(req);
    if (!env.DB) return fail(500, "unavailable", "Base de données D1 non reliée (binding DB).");
    await ensureSchema(env.DB);
    if (p === "/auth/login") return login(req, env);
    if (p === "/auth/callback") return callback(req, env);
    if (p === "/auth/logout") return logout(req, env);
    if (p === "/auth/dev" && env.DEV_LOGIN === "1") {
      // connexion factice, uniquement pour les tests en local (wrangler dev)
      const fake = url.searchParams.get("id") || "100000000000000001", uid = "d" + fake, token = randomToken();
      await env.DB.batch([
        env.DB.prepare("INSERT OR REPLACE INTO users (id, name, avatar, member, updated) VALUES (?, ?, ?, ?, ?)").bind(uid, url.searchParams.get("name") || "Testeur", "https://cdn.discordapp.com/embed/avatars/0.png", url.searchParams.get("member") === "0" ? 0 : 1, Date.now()),
        env.DB.prepare("INSERT INTO sessions (token, uid, expires) VALUES (?, ?, ?)").bind(token, uid, Date.now() + 86400e3),
      ]);
      await bumpRev(env, "users");
      return new Response(null, { status: 302, headers: { location: "/", "set-cookie": `rz_session=${token}; Path=/; HttpOnly; SameSite=Lax` } });
    }
    const user = await currentUser(req, env);
    if (p === "/api/me") return user ? json(user) : fail(401, "not_signed_in", "Pas connecté.");
    if (!user) return fail(401, "not_signed_in", "Connecte-toi avec Discord.");
    // synchro (étape 2) : les compteurs de version de toutes les sections, en une seule lecture
    if (p === "/api/sync") { const r = await env.DB.prepare("SELECT k, v FROM sync_rev").all(); return json({ revs: Object.fromEntries(r.results.map((x) => [x.k, x.v])) }); }
    if (p === "/api/doc") return docRoute(req, env, user);
    if (p === "/api/acquire" && req.method === "POST") return acquireRoute(req, env, user);
    if (p === "/api/coll") return collRoute(req, env, user);
    if (p === "/api/profiles") return profilesRoute(req, env, user);
    if (p.startsWith("/api/game/")) return gameRoute(req, env, user, p);
    return fail(404, "not_found", "Route inconnue.");
  },
};
