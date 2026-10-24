// Créations : l'admin (Billy) et le dev (Reichi) ajoutent ou retouchent des persos, des cartes et des cosmétiques
// depuis l'app, et publient directement. Stockage : doc « creations/catalog » (champs) et « creaimg/<clé> » (images),
// fermés à l'API des documents. Le serveur applique le catalogue avant chaque action (G.applyCreations).
import * as G from "./game.js";
import { bumpRev } from "./sync.js";
import { BRANCH_IDS } from "./confront/branches.mjs";

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const fail = (status, error) => json({ error }, status);
const CAT = "creations/catalog";
const MAX_IMG = 400_000;        // une image en data URI (jpeg ~300 Ko au plus, l'app la réduit avant l'envoi)
const LOG_MAX = 60;

// ---- application du catalogue : relu seulement quand sa version change ----
let appliedV = 0;
export async function ensureCreations(env) {
  try {
    const r = await env.DB.prepare("SELECT version FROM docs WHERE path = ?").bind(CAT).first();
    const v = r?.version || 0;
    if (v === appliedV) return;
    const d = v ? JSON.parse((await env.DB.prepare("SELECT data FROM docs WHERE path = ?").bind(CAT).first()).data) : null;
    G.applyCreations(d); appliedV = v;
  } catch (e) { /* table absente (base neuve) : jeu de base */ }
}
async function readCat(env) {
  const r = await env.DB.prepare("SELECT data, version FROM docs WHERE path = ?").bind(CAT).first();
  return r ? { data: JSON.parse(r.data), version: r.version } : { data: { people: {}, cards: {}, cos: {}, imgs: {}, log: [] }, version: 0 };
}
async function writeCat(env, data, version) {
  const now = Date.now();
  const r = version
    ? await env.DB.prepare("UPDATE docs SET data = ?, version = version + 1, updated = ? WHERE path = ? AND version = ?").bind(JSON.stringify(data), now, CAT, version).run()
    : await env.DB.prepare("INSERT INTO docs (path, coll, id, data, version, updated) VALUES (?, 'creations', 'catalog', ?, 1, ?) ON CONFLICT(path) DO NOTHING").bind(CAT, JSON.stringify(data), now).run();
  return !!r.meta.changes;
}

// ---- vérification des champs (tout ce qui vient du navigateur est relu ici) ----
const str = (v, max, min = 0) => { const s = String(v ?? "").trim().slice(0, max); return s.length >= min ? s : null; };
const hex = (v) => (/^#[0-9a-f]{6}$/i.test(String(v || "")) ? String(v).toLowerCase() : null);
const slug = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "x";
const COS_KINDS = () => Object.fromEntries(G.COS_SLOTS.map((s) => [s.id, [...new Set(G.COSMETICS.filter((c) => c.slot === s.id).map((c) => c.k))]]));
function cleanPerso(b, isNew) {
  const out = {}, err = (m) => ({ error: m });
  if (isNew || b.name != null) { if (!(out.name = str(b.name, 30, 1))) return err("Donne un nom (30 caractères au plus)."); }
  if (isNew || b.fac != null) { if (!G.FACTIONS[b.fac]) return err("Choisis une faction."); out.fac = b.fac; }
  if (b.kanji != null) out.kanji = str(b.kanji, 2) || "";
  if (b.color != null) { if (!(out.color = hex(b.color))) return err("Couleur invalide (format #rrggbb)."); }
  for (const [k, n] of [["tag", 40], ["power", 220], ["look", 220], ["mood", 120], ["quote", 160]]) if (b[k] != null) out[k] = str(b[k], n) ?? "";
  if (b.ep != null) { const e = Math.round(+b.ep); if (!(e >= 1 && e <= G.EP_MAX)) return err(`Épisode entre 1 et ${G.EP_MAX}.`); out.ep = e; }
  if (b.branche != null && b.branche !== "") { if (!BRANCH_IDS.includes(b.branche)) return err("Branche inconnue."); out.branche = b.branche; }
  // Arène : profil, affinité et nom de la technique (vide = automatique)
  if (b.bt != null) {
    const x = b.bt || {}, bt = {};
    if (x.profil) { if (!G.BT_PROFILS[x.profil]) return err("Profil d'Arène inconnu."); bt.profil = x.profil; }
    if (x.affinite) { if (!G.BT_AFFINITES[x.affinite]) return err("Affinité inconnue."); bt.affinite = x.affinite; }
    if (x.tech) bt.tech = str(x.tech, 40) || undefined;
    out.bt = bt;
  }
  return { out };
}
function cleanCarte(b, isNew) {
  const out = {}, err = (m) => ({ error: m });
  if (isNew) { if (!G.PEOPLE[b.who]) return err("Choisis le perso de la carte."); out.who = b.who; }
  if (isNew || b.title != null) { if (!(out.title = str(b.title, 40, 1))) return err("Donne un titre à la carte (40 caractères au plus)."); }
  if (isNew || b.rar != null) { if (!G.RANKS.includes(b.rar)) return err("Choisis une rareté."); out.rar = b.rar; }
  if (b.pos != null) { if (!/^\d{1,3}% \d{1,3}%$/.test(String(b.pos))) return err("Cadrage invalide."); out.pos = String(b.pos); }
  if (b.zoom != null) { const z = Math.round(+b.zoom * 100) / 100; if (!(z >= 1 && z <= 3)) return err("Zoom entre 1 et 3."); out.zoom = z; }
  if (b.branche != null && b.branche !== "") { if (!BRANCH_IDS.includes(b.branche)) return err("Branche inconnue."); out.branche = b.branche; }
  // Arène : profil, affinité et nom de la technique (vide = automatique)
  if (b.bt != null) {
    const x = b.bt || {}, bt = {};
    if (x.profil) { if (!G.BT_PROFILS[x.profil]) return err("Profil d'Arène inconnu."); bt.profil = x.profil; }
    if (x.affinite) { if (!G.BT_AFFINITES[x.affinite]) return err("Affinité inconnue."); bt.affinite = x.affinite; }
    if (x.tech) bt.tech = str(x.tech, 40) || undefined;
    out.bt = bt;
  }
  return { out };
}
function cleanCos(b, isNew, base) {
  const out = {}, err = (m) => ({ error: m }), slot = isNew ? b.slot : base.slot;
  if (isNew) { if (!G.COS_SLOTS.some((s) => s.id === b.slot)) return err("Choisis un emplacement."); out.slot = b.slot; }
  if (isNew || b.k != null) { if (!COS_KINDS()[slot]?.includes(b.k)) return err("Choisis un effet."); out.k = b.k; }
  if (isNew || b.name != null) { if (!(out.name = str(b.name, 30, 1))) return err("Donne un nom (30 caractères au plus)."); }
  if (isNew || b.rar != null) { if (!G.RANKS.includes(b.rar)) return err("Choisis une rareté."); out.rar = b.rar; }
  for (const k of ["c1", "c2"]) if (b[k] != null && b[k] !== "") { if (!(out[k] = hex(b[k]))) return err("Couleur invalide (format #rrggbb)."); }
  if (b.only != null) out.only = b.only === "sanctuaire" ? "sanctuaire" : undefined;
  if (b.coll != null) out.coll = str(b.coll, 20) || undefined;
  return { out };
}
const imgOk = (u) => typeof u === "string" && u.length <= MAX_IMG && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(u);

// ce qu'un joueur reçoit : tout le catalogue (sinon les cartes des autres ne s'affichent pas), mais un perso
// pas encore débloqué pour lui reste masqué (nom, textes et image retirés : pas de spoil)
function viewFor(data, cfg, user) {
  const seeAll = user.admin || user.dev, hidden = (who) => !seeAll && !G.unlockedFor(cfg, who, user.id);
  const people = Object.fromEntries(Object.entries(data.people || {}).map(([k, p]) => [k, hidden(k) ? { fac: p.fac, ep: p.ep, name: "???", kanji: "", color: "#5a5a66", tag: "", power: "", look: "" } : p]));
  const cards = Object.fromEntries(Object.entries(data.cards || {}).map(([id, c]) => [id, hidden(c.who || G.CARD_BY_ID[id]?.who) ? { ...c, title: "???", img: undefined } : c]));
  const imgs = Object.fromEntries(Object.entries(data.imgs || {}).filter(([k, m]) => !hidden(m.who)).map(([k, m]) => [k, m.v]));
  return { people, cards, cos: data.cos || {}, imgs, log: seeAll ? data.log || [] : undefined };
}

export async function creationsRoute(env, user, path, body, h) {
  if (!path.startsWith("/api/game/creations")) return null;
  const a = path.slice("/api/game/creations".length).replace(/^\//, "");
  if (a === "") {
    const { data, version } = await readCat(env);
    if (body.v && +body.v === version) return json({ v: version, same: true });
    return json({ v: version, ...viewFor(data, h.cfg, user) });
  }
  if (a === "img") {
    const k = String(body.k || ""), { data } = await readCat(env), m = data.imgs?.[k];
    if (!m || (!(user.admin || user.dev) && !G.unlockedFor(h.cfg, m.who, user.id))) return fail(404, "Image introuvable.");
    const r = await env.DB.prepare("SELECT data FROM docs WHERE path = ?").bind("creaimg/" + k).first();
    return r ? json({ k, uri: JSON.parse(r.data).uri }) : fail(404, "Image introuvable.");
  }
  if (!(user.admin || user.dev)) return fail(403, "Réservé à l'admin et au dev.");

  if (a === "save" || a === "reset") {
    const kind = String(body.kind || ""), id = body.id ? String(body.id) : null;
    if (!["perso", "carte", "cos"].includes(kind)) return fail(400, "Type inconnu.");
    for (let tries = 0; tries < 4; tries++) {
      const { data, version } = await readCat(env);
      for (const k of ["people", "cards", "cos", "imgs"]) data[k] ||= {};
      data.log ||= [];
      const box = { perso: data.people, carte: data.cards, cos: data.cos }[kind];
      const baseOf = (x) => (kind === "perso" ? G.CREA_BASE.people[x] : kind === "carte" ? G.CREA_BASE.cards.find((c) => c.id === x) || (G.CARD_BY_ID[x]?.skin ? G.CARD_BY_ID[x] : null) : G.CREA_BASE.cos.find((c) => c.id === x));
      let label, newId = id, imgKey = null;
      if (a === "reset") {
        // revenir à l'original : seulement pour une retouche du jeu de base (une création publiée reste, elle peut être dans des collections)
        if (!id || !box[id] || !baseOf(id)) return fail(400, "Rien à annuler pour cet élément.");
        delete box[id];
        label = `a remis d'origine ${kind === "perso" ? "le perso" : kind === "carte" ? "la carte" : "le cosmétique"} ${id}`;
      } else {
        const isNew = !id, base = id ? baseOf(id) || box[id] : null;
        if (id && !base) return fail(404, "Élément introuvable.");
        const r = kind === "perso" ? cleanPerso(body.data || {}, isNew) : kind === "carte" ? cleanCarte(body.data || {}, isNew) : cleanCos(body.data || {}, isNew, base);
        if (r.error) return fail(400, r.error);
        if (body.image != null && kind !== "cos" && !imgOk(body.image)) return fail(400, "Image refusée : jpeg, png ou webp de 300 Ko au plus.");
        if (isNew) {
          const taken = (x) => G.PEOPLE[x] || G.CARD_BY_ID[x] || G.COS_BY_ID[x] || data.people[x] || data.cards[x] || data.cos[x];
          const stem = kind === "perso" ? "c-" + slug(r.out.name) : kind === "carte" ? `${r.out.who}-c-${slug(r.out.title)}` : "cr-" + slug(r.out.name);
          newId = stem; for (let n = 2; taken(newId); n++) newId = `${stem}-${n}`;
        }
        box[newId] = { ...(box[newId] || {}), ...r.out };
        for (const k of Object.keys(box[newId])) if (box[newId][k] === undefined) delete box[newId][k];
        // un nouveau perso a aussi sa carte principale (même id), avec le titre et la rareté donnés
        if (kind === "perso" && isNew) {
          if (!G.RANKS.includes(body.data?.rar)) return fail(400, "Choisis la rareté de sa carte.");
          data.cards[newId] = { who: newId, title: r.out.tag || "Nouveau perso", rar: body.data.rar };
          box[newId].ep ??= 2;
        }
        if (body.image != null && kind !== "cos") {
          const who = kind === "perso" ? newId : box[newId].who || G.CARD_BY_ID[newId]?.who;
          imgKey = kind === "perso" ? newId : "cr-" + newId;
          data.imgs[imgKey] = { who, v: (data.imgs[imgKey]?.v || 0) + 1 };
          if (kind === "carte") box[newId].img = imgKey;
        }
        label = `a ${isNew ? "créé" : "modifié"} ${kind === "perso" ? "le perso" : kind === "carte" ? "la carte" : "le cosmétique"} ${(kind === "perso" ? box[newId].name || G.PEOPLE[newId]?.name : kind === "carte" ? box[newId].title || G.CARD_BY_ID[newId]?.title : box[newId].name || G.COS_BY_ID[newId]?.name) || newId}`;
      }
      data.log.unshift({ t: Date.now(), by: user.id, name: user.name, text: label, kind, id: newId });
      data.log = data.log.slice(0, LOG_MAX);
      // l'image d'abord : si le catalogue est écrit, son image existe déjà
      if (imgKey) await env.DB.prepare("INSERT INTO docs (path, coll, id, data, version, updated) VALUES (?, 'creaimg', ?, ?, 1, ?) ON CONFLICT(path) DO UPDATE SET data = excluded.data, version = docs.version + 1, updated = excluded.updated")
        .bind("creaimg/" + imgKey, imgKey, JSON.stringify({ uri: body.image }), Date.now()).run();
      if (!(await writeCat(env, data, version))) continue; // écrit par quelqu'un d'autre entre-temps : on relit et on recommence
      await ensureCreations(env);
      await bumpRev(env, "creations");
      // prévenir l'autre (Billy ↔ Reichi) : chacun voit ce que l'autre publie
      const others = [...new Set([...String(env.ADMIN_IDS || "").split(/[\s,]+/), ...String(env.DEV_IDS || "").split(/[\s,]+/)].filter(Boolean).map((d) => "d" + d))].filter((uid) => uid !== user.id);
      for (const uid of others) await h.notify(env, uid, "announce", `${user.name || "L'équipe"} ${label}.`, { go: "createur" }).catch(() => {});
      return json({ ok: true, id: newId, v: version + 1, ...viewFor(data, h.cfg, user) });
    }
    return fail(409, "Le catalogue change trop vite, réessaie.");
  }
  return fail(404, "Action inconnue.");
}
