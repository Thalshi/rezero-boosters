// Défilé des Légendes : inscriptions (copie figée de la carte et de son design), votes, modération, récompenses, archives.
// Tout est dans docs « defile/... », fermé à l'API des documents : les votes restent secrets jusqu'à la clôture.
import * as G from "./game.js";

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const fail = (status, error) => json({ error }, status);
async function readJSON(env, path) { const r = await env.DB.prepare("SELECT data, version FROM docs WHERE path = ?").bind(path).first(); return r ? { data: JSON.parse(r.data), version: r.version } : null; }
async function writeJSON(env, coll, id, data, version) {
  if (version == null) {
    await env.DB.prepare("INSERT INTO docs (path, coll, id, data, version, updated) VALUES (?, ?, ?, ?, 1, ?) ON CONFLICT(path) DO UPDATE SET data = excluded.data, version = docs.version + 1, updated = excluded.updated").bind(coll + "/" + id, coll, id, JSON.stringify(data), Date.now()).run();
    return true;
  }
  const r = await env.DB.prepare("UPDATE docs SET data = ?, version = version + 1, updated = ? WHERE path = ? AND version = ?").bind(JSON.stringify(data), Date.now(), coll + "/" + id, version).run();
  return !!r.meta.changes;
}
// modifie le défilé en cours, en réessayant si quelqu'un d'autre l'a modifié entre-temps (votes simultanés)
async function editCurrent(env, fn) {
  for (let i = 0; i < 6; i++) {
    const cur = await readJSON(env, "defile/current");
    if (!cur) return { error: "Aucun Défilé en cours." };
    const d = cur.data, out = fn(d);
    if (out?.error) return out;
    if (await writeJSON(env, "defile", "current", d, cur.version)) return { ...out, d };
  }
  return { error: "Serveur occupé, réessaie." };
}
// ce que voit un joueur : jamais qui a voté pour qui, ni les compteurs avant la clôture
function publicView(d, uid) {
  if (!d) return null;
  const closed = d.phase === "clos", rank = closed ? G.defileRank(d) : null;
  const entries = Object.entries(d.entries || {}).filter(([k, e]) => !e.removed || k === uid)
    .map(([k, e]) => ({ uid: k, name: e.name, card: e.card, gold: e.gold, design: e.design, t: e.t, removed: e.removed || null, reason: k === uid ? e.reason || null : null, votes: closed ? rank.find((r) => r.uid === k)?.votes || 0 : undefined }));
  return { id: d.id, title: d.title, phase: d.phase, t0: d.t0, entries, myVote: d.votes?.[uid] || null, voters: closed ? Object.keys(d.votes || {}).length : undefined, rank: rank?.slice(0, 3) || null };
}

export async function defileRoute(env, user, path, body, h) {
  if (!path.startsWith("/api/game/defile")) return null;
  const now = Date.now();
  // Défilé fermé par l'admin : les joueurs ne peuvent plus rien y faire (l'admin garde la main pour le préparer)
  if (!G.featureOn(h.cfg, "defile") && !user.admin && path !== "/api/game/defile/state") return fail(403, "Le Défilé des Légendes n'est pas encore ouvert.");
  if (path === "/api/game/defile/state") {
    const [cur, hall, arch] = await Promise.all([readJSON(env, "defile/current"), readJSON(env, "defile/hall"), readJSON(env, "defile/archives")]);
    const row = await h.loadRow(env, user.id), s = row ? G.normalizeSave(JSON.parse(row.data)) : null;
    return json({ current: publicView(cur?.data, user.id), hall: hall?.data?.until > now ? hall.data : null, archives: arch?.data?.list || [], canVote: s ? G.defileCanVote(s, user.member || user.admin, now) : false });
  }
  if (path === "/api/game/defile/enter") {
    if (!user.member && !user.admin) return fail(403, "Le Défilé est réservé aux membres du QG de Shinjuku.");
    const row = await h.loadRow(env, user.id), s = G.normalizeSave(JSON.parse(row.data)), card = String(body.card || "");
    if (!G.CARD_BY_ID[card] || !G.hasCard(s, card)) return fail(400, "Tu n'as pas cette carte.");
    // copie figée : la carte, sa variante et son design au moment de l'inscription
    const snap = { name: user.name, card, gold: !G.ownOf(s, card).n, design: G.designOfS(s, card), t: now };
    const r = await editCurrent(env, (d) => {
      if (d.phase !== "inscriptions") return { error: "Les inscriptions sont fermées." };
      if (d.entries[user.id]?.removed) return { error: "Ton inscription a été retirée par la modération." };
      d.entries[user.id] = { ...snap, t: d.entries[user.id]?.t || now }; return {};
    });
    return r.error ? fail(400, r.error) : json({ current: publicView(r.d, user.id) });
  }
  if (path === "/api/game/defile/withdraw") {
    const r = await editCurrent(env, (d) => { if (d.phase !== "inscriptions") return { error: "Trop tard pour te retirer." }; delete d.entries[user.id]; return {}; });
    return r.error ? fail(400, r.error) : json({ current: publicView(r.d, user.id) });
  }
  if (path === "/api/game/defile/vote") {
    const row = await h.loadRow(env, user.id), s = G.normalizeSave(JSON.parse(row.data));
    if (!G.defileCanVote(s, user.member || user.admin, now)) return fail(403, `Pour voter : être membre du QG, avoir ouvert ${G.DEFILE_VOTE_MIN_OPENED} boosters et un compte de plus de ${G.DEFILE_VOTE_MIN_DAYS} jours.`);
    const to = String(body.entry || "");
    const r = await editCurrent(env, (d) => {
      if (d.phase !== "votes") return { error: "Les votes ne sont pas ouverts." };
      if (to === user.id) return { error: "Tu ne peux pas voter pour toi." };
      if (!d.entries[to] || d.entries[to].removed) return { error: "Cette inscription n'existe pas." };
      d.votes[user.id] = to; return {};
    });
    return r.error ? fail(400, r.error) : json({ current: publicView(r.d, user.id) });
  }
  if (path === "/api/game/defile/admin") {
    if (!user.admin) return fail(403, "Réservé à l'admin.");
    const a = String(body.action || "");
    if (a === "new") {
      const cur = await readJSON(env, "defile/current");
      if (cur && cur.data.phase !== "clos") return fail(400, "Un Défilé est déjà en cours : clos-le d'abord.");
      const d = { id: "d" + now.toString(36), title: String(body.title || "Défilé des Légendes").slice(0, 80), phase: "inscriptions", t0: now, entries: {}, votes: {} };
      await writeJSON(env, "defile", "current", d);
      await h.notify(env, "*", "defile", `Le ${d.title} est ouvert : inscris ta plus belle carte !`, { go: "defile" });
      return json({ current: publicView(d, user.id) });
    }
    if (a === "votes") {
      const r = await editCurrent(env, (d) => { if (d.phase !== "inscriptions") return { error: "Les votes ne s'ouvrent qu'après les inscriptions." }; if (!G.defileRank(d).length) return { error: "Personne n'est inscrit." }; d.phase = "votes"; d.tv = now; return {}; });
      if (r.error) return fail(400, r.error);
      await h.notify(env, "*", "defile", `Les votes du ${r.d.title} sont ouverts.`, { go: "defile" });
      return json({ current: publicView(r.d, user.id) });
    }
    if (a === "remove") {
      const uid = String(body.uid || ""), reason = String(body.reason || "").slice(0, 200);
      if (!reason) return fail(400, "Indique un motif.");
      const r = await editCurrent(env, (d) => { if (!d.entries[uid]) return { error: "Inscription introuvable." }; d.entries[uid].removed = true; d.entries[uid].reason = reason; for (const [v, to] of Object.entries(d.votes)) if (to === uid) delete d.votes[v]; return {}; });
      if (r.error) return fail(400, r.error);
      await h.notify(env, uid, "defile", `Ton inscription au ${r.d.title} a été retirée : ${reason}`, { go: "defile" });
      return json({ current: publicView(r.d, user.id) });
    }
    if (a === "close") {
      const r = await editCurrent(env, (d) => { if (d.phase !== "votes") return { error: "Ouvre les votes avant de clore." }; d.phase = "clos"; d.tc = now; return {}; });
      if (r.error) return fail(400, r.error);
      const d = r.d, rank = G.defileRank(d);
      // récompenses : une seule fois par Défilé (le passage à « clos » ci-dessus ne réussit qu'une fois)
      for (const [i, e] of rank.entries()) {
        const gain = (G.DEFILE_REWARDS[i] || 0) + G.DEFILE_PARTICIPATION, title = G.DEFILE_TITLES[i];
        await h.mutate(env, e.uid, (s) => { s.chakra += gain; if (title) s.titles = [...new Set([...(s.titles || []), title])]; return {}; }).catch(() => null);
        await h.notify(env, e.uid, "defile", i < 3 ? `${d.title} : tu finis ${i + 1}${i ? "e" : "er"} avec ${e.votes} vote${e.votes > 1 ? "s" : ""} ! +${gain} ◆${title ? ` et le titre « ${title} »` : ""}.` : `${d.title} : merci d'avoir défilé ! +${gain} ◆.`, { go: "defile" });
      }
      const top = rank[0] && d.entries[rank[0].uid];
      if (top) await writeJSON(env, "defile", "hall", { id: d.id, title: d.title, uid: rank[0].uid, name: top.name, card: top.card, gold: top.gold, design: top.design, votes: rank[0].votes, until: now + G.DEFILE_HALL_DAYS * 86400e3 });
      const arch = (await readJSON(env, "defile/archives"))?.data || { list: [] };
      arch.list.unshift({ id: d.id, title: d.title, t: now, podium: rank.slice(0, 3).map((e) => ({ uid: e.uid, name: d.entries[e.uid].name, card: d.entries[e.uid].card, gold: d.entries[e.uid].gold, design: d.entries[e.uid].design, votes: e.votes })), n: rank.length, voters: Object.keys(d.votes).length });
      arch.list = arch.list.slice(0, 36);
      await writeJSON(env, "defile", "archives", arch);
      await h.notify(env, "*", "defile", top ? `${d.title} : ${top.name} remporte le Défilé !` : `${d.title} est terminé.`, { go: "defile" });
      return json({ current: publicView(d, user.id) });
    }
    return fail(400, "Action inconnue.");
  }
  return fail(404, "Route inconnue.");
}
