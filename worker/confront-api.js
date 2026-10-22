// Re Zéro : Confrontation · salons et parties côté serveur.
// Le moteur (worker/confront/engine.mjs) décide de tout ; ici on garde l'état, on vérifie la collection,
// on verrouille les cartes apportées pendant la partie et on ne montre à chacun que viewFor(état, lui).
// Stockage : docs « confront/<gid> » (fermé à l'API des documents). Aucune carte ne change jamais de propriétaire.
import * as G from "./game.js";
import { createGame, act, tick, viewFor, legalActions } from "./confront/engine.mjs";
import { botAction } from "./confront/bots.mjs";
import { brancheDeCarte, brancheProposeeCarte } from "./confront/branches-proposees.mjs";
import { BRANCHES, BRANCH_IDS } from "./confront/branches.mjs";
import { CARD_DEFS, SIGNES } from "./confront/cards.mjs";
import { modeFor } from "./confront/config.mjs";

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const fail = (status, error, code) => json({ error, code }, status);
const STALE = 6 * 3600e3;          // une partie sans activité depuis 6 h est abandonnée (verrous levés)
const isBot = (id) => id.startsWith("bot:");
const newGid = () => Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[b % 32]).join("");

async function load(env, gid) {
  const r = await env.DB.prepare("SELECT data, version FROM docs WHERE path = ?").bind("confront/" + gid).first();
  return r ? { g: JSON.parse(r.data), version: r.version } : null;
}
async function save(env, gid, g, version) {
  if (version == null) {
    const r = await env.DB.prepare("INSERT INTO docs (path, coll, id, data, version, updated) VALUES (?, 'confront', ?, ?, 1, ?) ON CONFLICT(path) DO NOTHING").bind("confront/" + gid, gid, JSON.stringify(g), Date.now()).run();
    return !!r.meta.changes;
  }
  const r = await env.DB.prepare("UPDATE docs SET data = ?, version = version + 1, updated = ? WHERE path = ? AND version = ?").bind(JSON.stringify(g), Date.now(), "confront/" + gid, version).run();
  return !!r.meta.changes;
}
// les bots jouent tant que c'est à eux (contributions et choix compris)
function runBots(g, now) {
  let s = g.state, events = [];
  for (let i = 0; i < 400 && s.phase !== "fin" && s.phase !== "lobby"; i++) {
    let pid = null;
    if (s.phase === "contributions") pid = s.players.find((p) => isBot(p.id) && !p.soumis)?.id;
    else if (s.phase === "choix") pid = s.players.find((p) => isBot(p.id) && !p.choix)?.id;
    else if (s.phase === "partie" && s.prompt && isBot(s.prompt.pid)) pid = s.prompt.pid;
    if (!pid) break;
    const a = botAction(viewFor(s, pid, { log: false }), {});
    const r = act(s, pid, a, now);
    if (r.error) break;
    s = r.state; events.push(...r.events);
  }
  g.state = s;
  return events;
}
// fin de partie (ou partie abandonnée) : on lève les verrous des cartes apportées
async function release(env, h, g) {
  if (g.released) return;
  g.released = true;
  for (const p of g.state.players) if (!isBot(p.id)) await h.mutate(env, p.id, (s) => { if (s.confront?.gid === g.id) delete s.confront; return {}; }).catch(() => null);
}
// modifie une partie en réessayant si quelqu'un d'autre l'a modifiée entre-temps
async function edit(env, h, gid, fn) {
  for (let i = 0; i < 6; i++) {
    const cur = await load(env, gid);
    if (!cur) return { error: "Partie introuvable.", status: 404 };
    const g = cur.g, now = Date.now();
    // délais expirés (un joueur absent joue « par défaut »), puis les bots
    if (g.state.phase !== "lobby" && g.state.phase !== "fin") { const t = tick(g.state, now); g.state = t.state; }
    const out = await fn(g, now);
    if (out?.error) return out;
    runBots(g, now);
    if (now - (g.t || now) > STALE && g.state.phase !== "fin") g.state.phase = "fin";
    g.t = now;
    if (await save(env, gid, g, cur.version)) {
      if (g.state.phase === "fin" && !g.released) { await release(env, h, g); await save(env, gid, g, cur.version + 1); }
      return { g, ...out };
    }
  }
  return { error: "Serveur occupé, réessaie.", status: 503 };
}
const names = async (env, ids) => {
  const real = ids.filter((id) => !isBot(id));
  const rows = real.length ? (await env.DB.prepare(`SELECT id, name, avatar FROM users WHERE id IN (${real.map(() => "?").join(",")})`).bind(...real).all()).results : [];
  return Object.fromEntries([...rows.map((r) => [r.id, { name: r.name, avatar: r.avatar }]), ...ids.filter(isBot).map((id) => [id, { name: "Bot " + id.slice(4), bot: true }])]);
};
async function viewOf(env, g, uid) {
  const me = g.state.players.some((p) => p.id === uid) ? uid : null;
  return { gid: g.id, nom: g.nom, public: g.public, createur: g.createur, spectateur: !me, noms: await names(env, g.state.players.map((p) => p.id)), vue: viewFor(g.state, me) };
}
// cartes de collection apportables : celles du joueur, avec leur branche (rien d'autre du catalogue n'est envoyé)
function myCards(s, choix) {
  return Object.keys(s.owned).filter((id) => G.hasCard(s, id) && G.CARD_BY_ID[id]).map((id) => ({ cardId: id, branch: brancheDeCarte(G.CARD_BY_ID[id], choix) })).filter((c) => c.branch);
}
// branches choisies par Billy, carte par carte (doc « confrontcfg/branches », fermé à l'API des documents) ;
// une carte sans choix garde la proposition (branche du perso, variante en Épique et plus)
const BR_DOC = "confrontcfg/branches";
async function branchChoices(env) {
  const r = await env.DB.prepare("SELECT data FROM docs WHERE path = ?").bind(BR_DOC).first();
  return (r && JSON.parse(r.data).cartes) || {};
}

export async function confrontRoute(env, user, path, body, h) {
  if (!path.startsWith("/api/game/confront/")) return null;
  if (!G.featureOn(h.cfg, "confrontation") && !user.admin) return fail(403, "Re Zéro : Confrontation n'est pas encore ouvert.");
  const a = path.slice("/api/game/confront/".length);
  if (a === "catalogue") return json({ branches: BRANCHES, branchIds: BRANCH_IDS, cartes: CARD_DEFS, signes: SIGNES });
  // admin : la branche de chaque carte (proposition et choix de Billy), et la modifier
  if (a === "branches" || a === "branches/set") {
    if (!user.admin) return fail(403, "Réservé à l'admin.");
    const choix = await branchChoices(env);
    if (a === "branches/set") {
      const ids = [...new Set((Array.isArray(body.ids) ? body.ids : []).map(String))];
      const b = body.branch == null || body.branch === "" ? null : String(body.branch);
      if (!ids.length || ids.some((id) => !G.CARD_BY_ID[id])) return fail(400, "Carte inconnue.");
      if (b && !BRANCH_IDS.includes(b)) return fail(400, "Branche inconnue.");
      // choisir la proposition revient à ne rien imposer : la carte suivra une proposition corrigée plus tard
      for (const id of ids) { if (!b || b === brancheProposeeCarte(G.CARD_BY_ID[id])) delete choix[id]; else choix[id] = b; }
      await env.DB.prepare("INSERT INTO docs (path, coll, id, data, version, updated) VALUES (?, 'confrontcfg', 'branches', ?, 1, ?) ON CONFLICT(path) DO UPDATE SET data = excluded.data, version = docs.version + 1, updated = excluded.updated")
        .bind(BR_DOC, JSON.stringify({ cartes: choix }), Date.now()).run();
    }
    return json({ proposees: Object.fromEntries(Object.values(G.CARD_BY_ID).map((c) => [c.id, brancheProposeeCarte(c)])), choix });
  }
  if (a === "list") {
    const since = Date.now() - STALE;
    const rows = (await env.DB.prepare("SELECT data FROM docs WHERE coll = 'confront' AND updated > ? ORDER BY updated DESC LIMIT 60").bind(since).all()).results.map((r) => JSON.parse(r.data));
    const pub = (g) => ({ gid: g.id, nom: g.nom, phase: g.state.phase, joueurs: g.state.players.length, createur: g.createur });
    const row = await h.loadRow(env, user.id), s = row ? G.normalizeSave(JSON.parse(row.data)) : null;
    return json({ salons: rows.filter((g) => g.public && g.state.phase === "lobby").map(pub), enCours: rows.filter((g) => g.public && g.state.phase !== "lobby" && g.state.phase !== "fin").map(pub),
      miennes: rows.filter((g) => g.state.players.some((p) => p.id === user.id) && g.state.phase !== "fin").map(pub), cartes: s ? myCards(s, await branchChoices(env)) : [], verrou: s?.confront || null });
  }
  if (a === "create") {
    if (!user.member && !user.admin) return fail(403, "Réservé aux membres du QG de Shinjuku.");
    const gid = newGid(), now = Date.now();
    const g = { id: gid, nom: String(body.nom || `Table de ${user.name}`).slice(0, 40), public: !!body.public, createur: user.id, t: now,
      state: createGame({ players: [{ id: user.id }], seed: gid + ":" + now + ":" + Math.random(), lobby: true, now }) };
    if (!(await save(env, gid, g))) return fail(503, "Réessaie.");
    return json(await viewOf(env, g, user.id));
  }
  const gid = String(body.gid || "").toUpperCase();
  if (a === "state") {
    const r = await edit(env, h, gid, () => ({}));
    return r.error ? fail(r.status || 400, r.error) : json(await viewOf(env, r.g, user.id));
  }
  if (a === "bot") {
    // outil de test : ajouter un bot dans un salon (le créateur ou l'admin)
    const r = await edit(env, h, gid, (g, now) => {
      if (g.createur !== user.id && !user.admin) return { error: "Seul le créateur du salon peut ajouter un bot." };
      const n = g.state.players.filter((p) => isBot(p.id)).length + 1;
      const out = act(g.state, "bot:" + n, { type: "rejoindre" }, now);
      if (out.error) return { error: out.error.message };
      g.state = out.state; return {};
    });
    return r.error ? fail(r.status || 400, r.error) : json(await viewOf(env, r.g, user.id));
  }
  if (a === "act") {
    const action = body.action && typeof body.action === "object" ? { ...body.action } : null;
    if (!action || typeof action.type !== "string") return fail(400, "Action invalide.");
    const row = await h.loadRow(env, user.id), s = G.normalizeSave(JSON.parse(row.data));
    if (action.type === "rejoindre" && !user.member && !user.admin) return fail(403, "Réservé aux membres du QG de Shinjuku.");
    if (action.type === "contribuer") {
      // la contribution vient de la vraie collection : une carte possédée par branche, branche donnée par le serveur
      if (s.confront && s.confront.gid !== gid && Date.now() - s.confront.t < STALE) return fail(400, "Tu as déjà des cartes engagées dans une autre partie.");
      const ids = [...new Set((Array.isArray(action.cartes) ? action.cartes : []).map(String))].slice(0, BRANCH_IDS.length);
      const mine = Object.fromEntries(myCards(s, await branchChoices(env)).map((c) => [c.cardId, c.branch]));
      if (ids.some((id) => !mine[id])) return fail(400, "Tu ne peux apporter que des cartes de ta collection.");
      action.cartes = ids.map((id) => ({ instanceId: user.id + ":" + id, cardId: id, branch: mine[id], cosmetique: G.designOfS(s, id) || undefined }));
    }
    const r = await edit(env, h, gid, (g, now) => {
      const out = act(g.state, user.id, action, now);
      if (out.error) return { error: out.error.message, code: out.error.code };
      g.state = out.state; return {};
    });
    if (r.error) return fail(r.status || 400, r.error, r.code);
    if (action.type === "contribuer" && action.cartes.length) await h.mutate(env, user.id, (s2) => { s2.confront = { gid, cards: action.cartes.map((c) => c.cardId), t: Date.now() }; return {}; });
    return json(await viewOf(env, r.g, user.id));
  }
  return fail(404, "Action inconnue.");
}
// verrou : une carte apportée à une partie en cours ne peut pas quitter la collection (dernier exemplaire)
export const confrontLocked = (s, id) => !!(s.confront && Date.now() - s.confront.t < STALE && s.confront.cards.includes(id) && G.ownOf(s, id).n + G.ownOf(s, id).gold <= 1);
