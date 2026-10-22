// Confrontation · moteur de règles pur et déterministe.
//
// - Aucune dépendance, aucun accès réseau ni base : le serveur garde l'état (objet JSON) et
//   l'envoie à act / tick ; il ne montre aux joueurs que viewFor(state, joueur).
// - Déterministe : tout le hasard vient de générateurs à graine rangés dans l'état
//   (state.rng). Même graine + mêmes actions = même partie, rejouable pour un litige.
// - act et tick ne modifient jamais l'état reçu : ils renvoient un nouvel état.
//
// API :
//   createGame({ players:[{id, contribution?}], mode, seed, config, lobby, now }) -> state
//   act(state, playerId, action, now)  -> { state, events } | { error: { code, message } }
//   tick(state, now)                   -> { state, events }   (délais expirés)
//   viewFor(state, playerId | null)    -> vue filtrée (null = spectateur)
//   legalActions(state, playerId)      -> actions possibles maintenant
//
// Phases : lobby -> contributions -> choix (parmi ses propres cartes, ou 2 propositions tirées) -> partie -> fin

import { DEFAULT_CONFIG, ROLES_PAR_TABLE, MODES, modeFor, mergeConfig } from "./config.mjs";
import { CARD_DEFS, ARME_DE_BASE, buildDeck } from "./cards.mjs";
import { BRANCH_IDS, LOAN_PREFIX, loanCardId } from "./branches.mjs";

export const ENGINE_VERSION = 1;

// ===== Erreurs explicites =====
class Refus extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
const refuse = (code, message) => { throw new Refus(code, message); };

// ===== Hasard à graine (mulberry32), rangé dans l'état =====
function hashSeed(str) {
  str = String(str);
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}
function rnd(s, stream) {
  let a = s.rng[stream] | 0;
  a = (a + 0x6d2b79f5) | 0;
  s.rng[stream] = a;
  let x = Math.imul(a ^ (a >>> 15), 1 | a);
  x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
}
const rint = (s, stream, n) => Math.floor(rnd(s, stream) * n);
function shuffle(s, stream, arr) {
  for (let i = arr.length - 1; i > 0; i--) { const j = rint(s, stream, i + 1); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

// L'état est du JSON pur (le serveur le stocke tel quel) : copie par JSON, plus rapide ici que structuredClone
const cloneState = (s) => JSON.parse(JSON.stringify(s));

// Les 82 cartes d'action sont fixes (cards.mjs) : l'état ne garde que leurs identifiants
const CARDS = Object.fromEntries(buildDeck().map((c) => [c.uid, { def: c.def, signe: c.signe, rang: c.rang }]));
/** Carte d'action d'après son identifiant (a0…a81). */
export const carte = (uid) => (CARDS[uid] ? { uid, ...CARDS[uid] } : null);

// ===== Accès =====
const P = (s, id) => s.players.find((p) => p.id === id);
const mustP = (s, id) => P(s, id) || refuse("JOUEUR_INCONNU", "Ce joueur n'est pas dans la partie.");
const bySeat = (s) => [...s.players].sort((a, b) => a.siege - b.siege);
const vivants = (s) => bySeat(s).filter((p) => p.vivant);
const branche = (p) => p.perso && p.perso.branch;
const def = (s, uid) => CARD_DEFS[CARDS[uid].def];
const defId = (s, uid) => CARDS[uid].def;
const petiteTable = (s) => s.mode === "duel" || s.mode === "trio";
const hasEquip = (s, p, d) => p.equip.some((u) => defId(s, u) === d);
const equipOf = (s, p, d) => p.equip.find((u) => defId(s, u) === d);
const inHand = (p, uid) => p.main.includes(uid);
const handOf = (s, p, d) => p.main.filter((u) => defId(s, u) === d);

/** Distance naturelle : plus court chemin autour de la table, parmi les joueurs en vie. */
export function distance(s, aId, bId) {
  const al = vivants(s), i = al.findIndex((p) => p.id === aId), j = al.findIndex((p) => p.id === bId);
  if (i < 0 || j < 0) return Infinity;
  const d = Math.abs(i - j);
  return Math.min(d, al.length - d);
}
/** Distance perçue par A vers B : distance naturelle, -1 (Œil du hibou), -1 (Précision), +1 (Cape d'ombre de B), minimum 1. */
export function distancePercue(s, aId, bId) {
  const a = P(s, aId), b = P(s, bId);
  let d = distance(s, aId, bId);
  if (!isFinite(d)) return d;
  if (hasEquip(s, a, "oeil")) d -= 1;
  if (branche(a) === "precision") d -= 1;
  if (hasEquip(s, b, "cape")) d += 1;
  return Math.max(1, d);
}
/** Portée de l'arme équipée (la dague de base a une portée de 1). La portée n'est pas une distance. */
export const porteeArme = (s, p) => (p.arme ? def(s, p.arme).portee : ARME_DE_BASE.portee);
function frappesMax(s, p) {
  if (p.arme && def(s, p.arme).illimite) return Infinity;
  let n = branche(p) === "assaut" ? s.config.assaut.frappes : s.config.frappesParTour;
  if (petiteTable(s) && s.config.petiteTable.armeLongueFrappeBonus && p.arme && def(s, p.arme).portee >= 3) n += 1;
  return n;
}
/** Bonus de PV du Gardien : un nombre, ou un objet par taille de table. */
export const bonusGardien = (cfg, n) => (typeof cfg.bonusGardien === "number" ? cfg.bonusGardien : cfg.bonusGardien[n] ?? 1);
export const limiteMain = (s, p) => {
  const { min, max } = s.config.limiteMain;
  let l = Math.max(min ?? 0, p.pv);
  if (max != null) l = Math.min(max, l);
  return l;
};
const aPortee = (s, a, b) => a.id !== b.id && b.vivant && distancePercue(s, a.id, b.id) <= porteeArme(s, a);

// ===== Journal et événements =====
// vis : "all" (public) ou liste des joueurs qui le voient. Les événements privés ont toujours un
// équivalent public sans le détail caché.
function emit(s, type, data = {}, vis = "all") {
  const ev = { seq: ++s.seqLog, type, ...data, vis };
  s.log.push(ev);
  // l'état ne garde que la fin du journal (pour la reconnexion) ; le serveur archive le journal
  // complet à partir des événements renvoyés par act / tick
  if (s.log.length > s.config.journalMax) s.log.splice(0, s.log.length - s.config.journalMax);
  if (s._ev) s._ev.push(ev);
  return ev;
}
const visible = (ev, pid) => ev.vis === "all" || (pid != null && ev.vis.includes(pid));
const cardPub = (s, uid) => (uid ? { uid, def: CARDS[uid].def, signe: CARDS[uid].signe, rang: CARDS[uid].rang } : null);

// ===== Statistiques publiques (utiles aux bots et aux simulations, rien de secret) =====
function stat(s, pid, key, n = 1) {
  const st = (s.stats.joueurs[pid] ||= {});
  st[key] = (st[key] || 0) + n;
}
function hostile(s, src, cible, n = 1) {
  if (!src || !cible || src === cible) return;
  const m = (s.stats.hostile[src] ||= {});
  m[cible] = (m[cible] || 0) + n;
}
function aide(s, src, cible, n = 1) {
  if (!src || !cible || src === cible) return;
  const m = (s.stats.aide[src] ||= {});
  m[cible] = (m[cible] || 0) + n;
}

// ===== Pioche =====
function takeTop(s) {
  if (!s.deck.length) {
    if (!s.discard.length) return null;
    s.deck = shuffle(s, "jeu", s.discard.splice(0));
    s.stats.remelanges++;
    emit(s, "remelange", { n: s.deck.length });
  }
  return s.deck.pop();
}
function piocher(s, p, k, cause = "pioche") {
  const got = [];
  for (let i = 0; i < k; i++) { const u = takeTop(s); if (!u) break; got.push(u); }
  p.main.push(...got);
  if (got.length) {
    emit(s, "pioche", { pid: p.id, n: got.length, cause, cartes: got.map((u) => cardPub(s, u)) }, [p.id]);
    emit(s, "pioche_publique", { pid: p.id, n: got.length, cause });
  }
  s.stats.joueurs[p.id] && (s.stats.joueurs[p.id].mainMax = Math.max(s.stats.joueurs[p.id].mainMax || 0, p.main.length));
  return got;
}
const discardCard = (s, uid) => { s.discard.push(uid); };
function fromHand(s, p, uid) {
  const i = p.main.indexOf(uid);
  if (i < 0) refuse("CARTE_ABSENTE", "Cette carte n'est pas dans ta main.");
  p.main.splice(i, 1);
  return uid;
}

/**
 * Présage : retourne la carte du dessus (2 pour la branche Chance, qui garde le meilleur résultat),
 * puis la défausse. `test(carte)` dit si le résultat est favorable au joueur.
 */
function presage(s, p, quoi, test) {
  const n = branche(p) === "chance" ? 2 : 1;
  const cartes = [];
  for (let i = 0; i < n; i++) { const u = takeTop(s); if (u) { cartes.push(u); discardCard(s, u); } }
  const ok = cartes.some((u) => test(CARDS[u]));
  stat(s, p.id, "presages");
  emit(s, "presage", { pid: p.id, quoi, cartes: cartes.map((u) => cardPub(s, u)), favorable: ok });
  return ok;
}

// ===== Création =====
export function createGame({ players = [], mode = "auto", seed = "0", config, lobby = false, now = 0 } = {}) {
  const cfg = mergeConfig(DEFAULT_CONFIG, config);
  const s = {
    v: ENGINE_VERSION, phase: lobby ? "lobby" : "contributions", mode: null, modeDemande: mode, seed: String(seed),
    config: cfg, rev: 0,
    rng: { tirage: hashSeed(seed + ":tirage"), roles: hashSeed(seed + ":roles"), jeu: hashSeed(seed + ":jeu") },
    players: [], reserve: [], deck: [], discard: [], etal: [], limbe: [],
    turn: null, premier: null, prompt: null, promptSeq: 0, queue: [], log: [], seqLog: 0,
    deadline: null, result: null, elimCount: 0, usage: [],
    stats: { joueurs: {}, hostile: {}, aide: {}, remelanges: 0, effondrement: 0 },
    hote: players[0] ? players[0].id : null,
  };
  s._ev = [];
  try {
    for (const pl of players) addPlayer(s, pl.id);
    for (const pl of players) if (pl.contribution !== undefined) submitContribution(s, P(s, pl.id), pl.contribution);
    if (!lobby) { startContributions(s, now); advance(s, now); }
  } catch (e) {
    if (e instanceof Refus) { const err = new Error(e.message); err.code = e.code; throw err; }
    throw e;
  }
  delete s._ev;
  return s;
}

function addPlayer(s, id) {
  if (typeof id !== "string" || !id) refuse("ID_INVALIDE", "Identifiant de joueur invalide.");
  if (P(s, id)) refuse("DEJA_LA", "Ce joueur est déjà dans la partie.");
  if (s.players.length >= 7) refuse("COMPLET", "La partie est complète (7 joueurs).");
  s.players.push({
    id, siege: s.players.length, contribution: null, soumis: false, propositions: [], choix: null, perso: null,
    role: null, roleVisible: false, pv: 0, pvMax: 0, main: [], arme: null, equip: [], vivant: true,
    ordreElim: null, abandon: false, absences: 0, absencesTotal: 0, enLigne: true, nonces: [],
  });
  if (!s.hote) s.hote = id;
}

/**
 * Contribution d'un joueur : au plus UNE carte de collection par branche. Chaque carte indique sa
 * branche (donnée fournie par le serveur, pas devinée ici). Le serveur a déjà vérifié que le
 * joueur possède ces instances et les bloque pendant la partie (ni vente ni échange) ; le moteur
 * ne transfère jamais rien.
 */
function submitContribution(s, p, contribution) {
  if (p.soumis) refuse("DEJA_SOUMIS", "Ta contribution est déjà enregistrée.");
  if (!Array.isArray(contribution)) refuse("CONTRIBUTION_INVALIDE", "La contribution doit être une liste.");
  if (contribution.length > BRANCH_IDS.length) refuse("CONTRIBUTION_INVALIDE", "Au plus une carte par branche (8 cartes).");
  const seen = new Set(), entries = [];
  const autres = new Set(s.players.flatMap((q) => (q.contribution || []).map((c) => c.instanceId)));
  for (const c of contribution) {
    if (!c || typeof c.instanceId !== "string" || !c.instanceId || typeof c.cardId !== "string" || !c.cardId) refuse("CONTRIBUTION_INVALIDE", "Carte apportée mal décrite (instanceId, cardId, branch).");
    if (!BRANCH_IDS.includes(c.branch)) refuse("BRANCHE_INCONNUE", `Branche inconnue : ${c.branch}.`);
    if (c.cardId.startsWith(LOAN_PREFIX) || c.instanceId.startsWith("pret:")) refuse("PRET_INTERDIT", "Une carte de prêt ne peut pas être apportée.");
    if (seen.has(c.branch)) refuse("BRANCHE_EN_DOUBLE", `Une seule carte par branche : ${c.branch} est en double.`);
    if (autres.has(c.instanceId) || entries.some((e) => e.instanceId === c.instanceId)) refuse("INSTANCE_EN_DOUBLE", "Cette instance de carte est déjà dans la réserve.");
    seen.add(c.branch);
    entries.push({ instanceId: c.instanceId, cardId: c.cardId, branch: c.branch, proprietaire: p.id, apportePar: p.id, pret: false, ...(c.cosmetique !== undefined ? { cosmetique: c.cosmetique } : {}) });
  }
  p.contribution = entries;
  p.soumis = true;
  emit(s, "contribution", { pid: p.id, n: entries.length });
}

function startContributions(s, now) {
  const n = s.players.length, m = modeFor(n);
  if (!m) refuse("NB_JOUEURS", "Il faut entre 2 et 7 joueurs.");
  if (s.modeDemande !== "auto" && s.modeDemande !== m) refuse("MODE_INCOMPATIBLE", `${n} joueurs : le mode est ${MODES[m].nom}.`);
  s.mode = m;
  s.phase = "contributions";
  s.deadline = now + s.config.delais.contributions;
  emit(s, "phase", { phase: "contributions", mode: m, n });
}

/** Réserve commune : contributions + cartes de prêt pour chaque branche non fournie. */
function finalizeReserve(s) {
  s.reserve = [];
  for (const p of s.players) {
    const have = new Set(p.contribution.map((c) => c.branch));
    for (const c of p.contribution) s.reserve.push({ ...c });
    for (const b of BRANCH_IDS) if (!have.has(b)) s.reserve.push({ instanceId: `pret:${p.id}:${b}`, cardId: loanCardId(b), branch: b, proprietaire: null, apportePar: p.id, pret: true });
  }
  emit(s, "reserve", { n: s.reserve.length, prets: s.reserve.filter((c) => c.pret).length });
}

/** Persos proposés. persoLibre : chacun choisit parmi ses propres cartes apportées (2 cartes de prêt s'il n'en a
 *  apporté aucune). Sinon, tirage serveur : deux personnages distincts par joueur, jamais la même instance deux fois. */
function dealPropositions(s, now) {
  if (s.config.persoLibre) {
    for (const p of s.players) {
      const own = p.contribution.map((c) => c.instanceId);
      const props = own.length ? own : shuffle(s, "tirage", s.reserve.filter((c) => c.pret && c.apportePar === p.id).map((c) => c.instanceId)).slice(0, 2);
      p.propositions = props;
      emit(s, "propositions", { pid: p.id, propositions: props.map((iid) => s.reserve.find((c) => c.instanceId === iid)) }, [p.id]);
    }
    s.phase = "choix"; s.deadline = now + s.config.delais.choix; emit(s, "phase", { phase: "choix" });
    return;
  }
  const pool = shuffle(s, "tirage", s.reserve.map((c) => c.instanceId));
  const card = (iid) => s.reserve.find((c) => c.instanceId === iid);
  for (const p of s.players) {
    const a = pool.shift();
    let k = pool.findIndex((iid) => card(iid).cardId !== card(a).cardId);
    if (k < 0) k = 0;
    const [b] = pool.splice(k, 1);
    p.propositions = [a, b];
    emit(s, "propositions", { pid: p.id, propositions: [a, b].map(card) }, [p.id]);
  }
  s.phase = "choix";
  s.deadline = now + s.config.delais.choix;
  emit(s, "phase", { phase: "choix" });
}

/** Début de la partie : rôles (tirage séparé), sièges, PV, pioche, mains, premier joueur. */
function setupGame(s, now) {
  const n = s.players.length, cfg = s.config;
  // rôles : générateur séparé, indépendant du tirage des personnages
  if (s.mode === "classique") {
    const t = cfg.roles?.[n] || ROLES_PAR_TABLE[n], roles = [];
    for (const [r, k] of Object.entries(t)) for (let i = 0; i < k; i++) roles.push(r);
    shuffle(s, "roles", roles);
    s.players.forEach((p, i) => { p.role = roles[i]; p.roleVisible = roles[i] === "gardien"; });
  }
  // sièges au hasard
  const order = shuffle(s, "jeu", s.players.map((p) => p.id));
  order.forEach((id, i) => { P(s, id).siege = i; });
  // personnages choisis : aucune propriété ne change, on garde seulement qui joue quelle instance
  s.usage = [];
  for (const p of s.players) {
    const c = s.reserve.find((x) => x.instanceId === p.choix);
    p.perso = { ...c };
    s.usage.push({ joueur: p.id, instanceId: c.instanceId, cardId: c.cardId, proprietaire: c.proprietaire, pret: c.pret });
    p.pvMax = cfg.pv[s.mode] + (p.role === "gardien" ? bonusGardien(cfg, n) : 0) + (p.role === "errant" ? (cfg.bonusErrant || {})[n] || 0 : 0) + (cfg.bonusPvRole?.[p.role]?.[n] || 0) + (petiteTable(s) && p.perso.branch === "survie" ? cfg.petiteTable.surviePvMax || 0 : 0);
    p.pv = p.pvMax;
    s.stats.joueurs[p.id] = { mainMax: 0 };
  }
  // pioche d'action

  const deck = buildDeck();

  s.deck = shuffle(s, "jeu", deck.map((c) => c.uid));
  // premier joueur : le Gardien en classique, au hasard sinon
  const seats = bySeat(s);
  const first = s.mode === "classique" ? s.players.find((p) => p.role === "gardien") : seats[rint(s, "jeu", seats.length)];
  s.premier = first.id;
  // mains de départ, distribuées une carte à la fois à partir du premier joueur
  const fi = seats.indexOf(first), ordre = seats.slice(fi).concat(seats.slice(0, fi));
  const want = Object.fromEntries(ordre.map((p) => [p.id, cfg.mainDepart === "pv" ? p.pvMax : +cfg.mainDepart]));
  want[ordre[ordre.length - 1].id] += cfg.bonusDernierJoueur[s.mode] || 0;
  // réglage fin de l'équilibre des camps : cartes en plus au départ selon le rôle et la taille de table
  for (const p of ordre) want[p.id] += cfg.bonusMainRole?.[p.role]?.[n] || 0;
  for (let k = 0; k < Math.max(...Object.values(want)); k++) for (const p of ordre) if (p.main.length < want[p.id]) piocher(s, p, 1, "depart");
  s.phase = "partie";
  s.deadline = null;
  emit(s, "debut", {
    mode: s.mode, premier: first.id,
    joueurs: seats.map((p) => ({ id: p.id, siege: p.siege, cardId: p.perso.cardId, branch: p.perso.branch, pret: p.perso.pret, pvMax: p.pvMax, gardien: p.role === "gardien" })),
  });
  for (const p of s.players) if (p.role) emit(s, "role", { pid: p.id, role: p.role }, [p.id]);
  s.turn = { pid: first.id, n: 1, tour: 1, stage: "debut", frappes: 0, survie: 0, entrave: false, fini: false };
  emit(s, "tour", { pid: first.id, n: 1, tour: 1 });
  queueTurnStart(s);
}

function queueTurnStart(s) {
  s.queue.push({ t: "effondrement" }, { t: "orbe" }, { t: "entrave" }, { t: "pioche" }, { t: "actions" });
}

function nextTurn(s) {
  const seats = bySeat(s), cur = P(s, s.turn.pid);
  let i = cur.siege, next = null;
  for (let k = 1; k <= seats.length; k++) { const q = seats[(i + k) % seats.length]; if (q.vivant) { next = q; break; } }
  if (!next) return endGame(s, [], "personne");
  const tour = s.turn.tour + (next.siege <= cur.siege ? 1 : 0);
  const n = s.turn.n + 1;
  if (n > s.config.toursMax) return endGame(s, [], "limite_de_tours");
  s.turn = { pid: next.id, n, tour, stage: "debut", frappes: 0, survie: 0, entrave: false, fini: false };
  emit(s, "tour", { pid: next.id, n, tour });
  queueTurnStart(s);
}

// ===== Boucle de résolution =====
function advance(s, now) {
  for (let guard = 0; guard < 100000; guard++) {
    if (s.phase === "contributions") {
      if (s.players.every((p) => p.soumis)) { finalizeReserve(s); dealPropositions(s, now); continue; }
      return;
    }
    if (s.phase === "choix") {
      if (s.players.every((p) => p.choix)) { setupGame(s, now); continue; }
      return;
    }
    if (s.phase !== "partie" || s.prompt) return;
    if (s.queue.length) { runTask(s, s.queue.shift(), now); continue; }
    const a = P(s, s.turn.pid);
    if (!a.vivant || s.turn.fini) { nextTurn(s); continue; }
    if (s.turn.stage === "actions") { openPrompt(s, "tour", a.id, now, { entrave: s.turn.entrave }, "tour"); return; }
    throw new Error("état de tour inattendu : " + s.turn.stage);
  }
  throw new Error("boucle de résolution infinie");
}

function openPrompt(s, kind, pid, now, data = {}, delai = "reaction") {
  const p = P(s, pid);
  let deadline = now + s.config.delais[delai];
  if (!p.enLigne) deadline = Math.min(deadline, now + s.config.delais.graceDeconnexion);
  s.prompt = { id: ++s.promptSeq, kind, pid, deadline, data };
  emit(s, "attente", { kind, pid, deadline, promptId: s.prompt.id, ...publicPromptData(kind, data) });
}
// données d'attente que tout le monde peut voir (jamais les cartes regardées par le Stratège)
function publicPromptData(kind, data) {
  if (kind === "stratege") return {};
  const { cartes, ...rest } = data;
  return rest;
}

function runTask(s, t, now) {
  const a = s.turn && P(s, s.turn.pid);
  switch (t.t) {
    case "effondrement": {
      if (s.turn.tour >= s.config.effondrement[s.mode] && a.vivant) {
        s.stats.effondrement++;
        emit(s, "effondrement", { pid: a.id, tour: s.turn.tour });
        s.queue.unshift({ t: "degats", cible: a.id, n: s.config.effondrement.degats, src: null, cause: "effondrement" });
      }
      return;
    }
    case "orbe": {
      if (!a.vivant) return;
      const o = equipOf(s, a, "orbe");
      if (!o) return;
      const { signe, rangMax, degats } = s.config.presage.orbe;
      // présage favorable = l'orbe n'explose pas
      const calme = presage(s, a, "orbe", (c) => !(c.signe === signe && c.rang <= rangMax));
      if (!calme) {
        a.equip.splice(a.equip.indexOf(o), 1); discardCard(s, o);
        emit(s, "orbe_explose", { pid: a.id, degats });
        s.queue.unshift({ t: "degats", cible: a.id, n: degats, src: null, cause: "orbe" });
      } else {
        const seats = bySeat(s);
        let next = null;
        for (let k = 1; k <= seats.length; k++) { const q = seats[(a.siege + k) % seats.length]; if (q.vivant && q.id !== a.id) { next = q; break; } }
        a.equip.splice(a.equip.indexOf(o), 1);
        if (next && !hasEquip(s, next, "orbe")) { next.equip.push(o); emit(s, "orbe_passe", { de: a.id, a: next.id }); }
        else discardCard(s, o);
      }
      return;
    }
    case "entrave": {
      if (!a.vivant) return;
      const sc = equipOf(s, a, "sceau");
      if (!sc) return;
      const libre = presage(s, a, "entrave", (c) => s.config.presage.entrave.includes(c.signe));
      a.equip.splice(a.equip.indexOf(sc), 1); discardCard(s, sc);
      s.turn.entrave = !libre;
      emit(s, libre ? "entrave_brisee" : "entrave", { pid: a.id });
      return;
    }
    case "pioche": {
      if (!a.vivant) return;
      const b = branche(a);
      if (b === "stratege") {
        const k = s.config.stratege.regarde, cartes = [];
        for (let i = 0; i < k; i++) { const u = takeTop(s); if (u) cartes.push(u); }
        if (cartes.length <= s.config.stratege.garde) { a.main.push(...cartes); emit(s, "pioche", { pid: a.id, n: cartes.length, cartes: cartes.map((u) => cardPub(s, u)) }, [a.id]); emit(s, "pioche_publique", { pid: a.id, n: cartes.length }); return; }
        s.limbe = cartes;
        openPrompt(s, "stratege", a.id, now, { cartes: [...cartes] }, "choixCarte");
        return;
      }
      if (b === "voleur" && ciblesVoleur(s, a).length) { openPrompt(s, "voleur", a.id, now, {}, "choixCarte"); return; }
      piocher(s, a, s.config.pioche);
      return;
    }
    case "actions": s.turn.stage = "actions"; return;
    case "attaque": return taskAttaque(s, t, now);
    case "degats": return taskDegats(s, t, now);
    case "agonie": return taskAgonie(s, t, now);
    case "onde": {
      const c = P(s, t.cible);
      if (!c.vivant) return;
      openPrompt(s, "onde", c.id, now, { src: t.src });
      return;
    }
    case "defi": {
      const x = P(s, t.a), y = P(s, t.b);
      if (!x.vivant || !y.vivant) return;
      openPrompt(s, "defi", t.cur, now, { a: t.a, b: t.b });
      return;
    }
    case "etal": {
      const ordre = t.ordre.filter((id) => P(s, id).vivant);
      if (!ordre.length || !s.etal.length) { s.etal.forEach((u) => discardCard(s, u)); if (s.etal.length) emit(s, "etal_fin", { defausse: s.etal.length }); s.etal = []; return; }
      if (s.etal.length === 1) { const p = P(s, ordre[0]); const u = s.etal.pop(); p.main.push(u); emit(s, "etal_pris", { pid: p.id, carte: cardPub(s, u) }); return; }
      openPrompt(s, "etal", ordre[0], now, { ordre }, "choixCarte");
      return;
    }
    default: throw new Error("tâche inconnue " + t.t);
  }
}

function taskAttaque(s, t, now) {
  const src = P(s, t.src), c = P(s, t.cible);
  if (!c.vivant) return;
  if (t.nature === "riposte" && !src.vivant) return;
  stat(s, c.id, "attaquesRecues");
  const sansPresage = t.nature !== "pluie" && branche(src) === "precision" && petiteTable(s) && s.config.petiteTable.precisionSansPresage;
  if (!sansPresage) {
    if (hasEquip(s, c, "voile") && presage(s, c, "voile", (k) => s.config.presage.voile.includes(k.signe))) { stat(s, c.id, "esquives"); emit(s, "esquive", { pid: c.id, par: "voile", src: src.id }); return; }
    const sigDef = petiteTable(s) && s.config.petiteTable.defense ? s.config.petiteTable.defense : s.config.presage.defense;
    if (branche(c) === "defense" && presage(s, c, "defense", (k) => sigDef.includes(k.signe))) { stat(s, c.id, "esquives"); stat(s, c.id, "esquivesDefense"); emit(s, "esquive", { pid: c.id, par: "defense", src: src.id }); return; }
  }
  openPrompt(s, "reaction", c.id, now, { src: src.id, nature: t.nature, ...(t.carte ? { carte: t.carte } : {}) });
}

function taskDegats(s, t) {
  const c = P(s, t.cible);
  if (!c.vivant) return;
  const k = equipOf(s, c, "kanji");
  if (k) { c.equip.splice(c.equip.indexOf(k), 1); discardCard(s, k); emit(s, "kanji_absorbe", { pid: c.id, n: t.n, cause: t.cause }); stat(s, c.id, "absorbes"); return; }
  c.pv -= t.n;
  stat(s, c.id, "pvPerdus", t.n);
  if (t.src) stat(s, t.src, "degatsInfliges", t.n);
  emit(s, "degats", { pid: c.id, n: t.n, src: t.src, cause: t.cause, pv: c.pv });
  if (branche(c) === "resistance") {
    const { parPv, maxParTour } = s.config.resistance;
    let k = t.n * parPv;
    if (maxParTour != null) { const deja = (s.turn.resistance ||= {})[c.id] || 0; k = Math.max(0, Math.min(k, maxParTour - deja)); s.turn.resistance[c.id] = deja + k; }
    if (k) { piocher(s, c, k, "resistance"); stat(s, c.id, "piochesResistance", k); }
  }
  // Assaut : une Frappe qui fait perdre des PV fait piocher son auteur
  const src = t.src && P(s, t.src);
  if (src && src.vivant && (t.cause === "frappe" || t.cause === "riposte") && branche(src) === "assaut" && s.config.assaut.piocheSiTouche) piocher(s, src, s.config.assaut.piocheSiTouche, "assaut");
  if (c.pv <= 0) s.queue.unshift({ t: "agonie", cible: c.id, src: t.src, cause: t.cause });
}

function optionsSauvetage(s, p) {
  const o = [];
  if (handOf(s, p, "elixir").length && vivants(s).length >= s.config.elixirSauvetageMin) o.push("elixir");
  if (survieDispo(s, p, true)) o.push("survie");
  return o;
}
// coût de Ténacité : à 2 et 3 joueurs, la première utilisation de chaque tour peut coûter moins (réglage)
const coutSurvie = (s, p) => (petiteTable(s) && s.config.petiteTable.survieCoutPremier && p && s.turn && p.survieTour !== s.turn.n ? s.config.petiteTable.survieCoutPremier : s.config.survie.cout);
function survieDispo(s, p, sauvetage = false) {
  if (branche(p) !== "survie") return false;
  if (p.main.length < coutSurvie(s, p)) return false;
  if (!sauvetage && p.pv >= p.pvMax) return false;
  const lim = s.config.survie.parTour;
  if (lim != null && s.turn && s.turn.pid === p.id && s.turn.survie >= lim) return false;
  return true;
}

function taskAgonie(s, t, now) {
  const c = P(s, t.cible);
  if (!c.vivant || c.pv > 0) return;
  if (optionsSauvetage(s, c).length) { openPrompt(s, "sauvetage", c.id, now, { src: t.src, cause: t.cause, manque: 1 - c.pv }); return; }
  eliminate(s, c, t.src, t.cause);
}

function eliminate(s, p, srcId, cause) {
  p.vivant = false;
  p.ordreElim = ++s.elimCount;
  p.roleVisible = true;
  p.pv = Math.min(0, p.pv);
  const perdues = [...p.main, ...(p.arme ? [p.arme] : []), ...p.equip];
  p.main = []; p.arme = null; p.equip = [];
  perdues.forEach((u) => discardCard(s, u));
  emit(s, "elimination", { pid: p.id, role: p.role, par: srcId, cause, defausse: perdues.map((u) => cardPub(s, u)), tourDeTable: s.turn ? s.turn.tour : 0 });
  if (s.prompt && s.prompt.pid === p.id) cancelPrompt(s);
  if (s.turn && s.turn.pid === p.id) s.turn.fini = true;
  if (checkWin(s)) return;
  // récompenses et pénalités
  const src = srcId && P(s, srcId);
  if (src && src.vivant && src.id !== p.id) {
    if (s.mode === "classique") {
      if (p.role === "briseur" && s.config.recompenseElimination.classique) piocher(s, src, s.config.recompenseElimination.classique, "recompense");
      if (p.role === "sentinelle" && src.role === "gardien" && s.config.penaliteGardien) {
        const tout = [...src.main, ...(src.arme ? [src.arme] : []), ...src.equip];
        src.main = []; src.arme = null; src.equip = [];
        tout.forEach((u) => discardCard(s, u));
        emit(s, "penalite_gardien", { pid: src.id, n: tout.length });
      }
    } else if (s.config.recompenseElimination[s.mode]) piocher(s, src, s.config.recompenseElimination[s.mode], "recompense");
  }
}

// Annule l'attente d'un joueur éliminé ou parti, sans bloquer la suite de la chaîne
function cancelPrompt(s) {
  const pr = s.prompt;
  s.prompt = null;
  if (pr.kind === "stratege") { s.limbe.forEach((u) => discardCard(s, u)); s.limbe = []; }
  if (pr.kind === "etal") s.queue.unshift({ t: "etal", ordre: pr.data.ordre.slice(1) });
  emit(s, "attente_annulee", { kind: pr.kind, pid: pr.pid });
}

function checkWin(s) {
  if (s.phase !== "partie") return true;
  const al = vivants(s);
  if (s.mode !== "classique") {
    if (al.length <= 1) { endGame(s, al.map((p) => p.id), "dernier_survivant"); return true; }
    return false;
  }
  const g = s.players.find((p) => p.role === "gardien");
  if (!g.vivant) {
    if (al.length === 1 && al[0].role === "errant") endGame(s, [al[0].id], "errant_seul", "errant");
    else endGame(s, s.players.filter((p) => p.role === "briseur").map((p) => p.id), "gardien_tombe", "briseurs");
    return true;
  }
  if (!al.some((p) => p.role === "briseur" || p.role === "errant")) {
    endGame(s, s.players.filter((p) => p.role === "gardien" || p.role === "sentinelle").map((p) => p.id), "menaces_eliminees", "gardien");
    return true;
  }
  return false;
}

function endGame(s, gagnants, raison, camp = null) {
  s.phase = "fin";
  // la chaîne d'effets en cours s'arrête net : plus aucune tâche ni attente
  const interrompues = s.queue.length + (s.prompt ? 1 : 0);
  s.queue = [];
  s.prompt = null;
  s.limbe.forEach((u) => discardCard(s, u)); s.limbe = [];
  s.etal.forEach((u) => discardCard(s, u)); s.etal = [];
  for (const p of s.players) p.roleVisible = true;
  const tours = s.turn ? s.turn.n : 0, tourDeTable = s.turn ? s.turn.tour : 0;
  const cfgAF = s.config.antiFarm;
  s.result = {
    gagnants, raison, camp, tours, tourDeTable, interrompues,
    roles: Object.fromEntries(s.players.map((p) => [p.id, p.role])),
    // éligibilité aux récompenses (anti-farm) : le serveur applique en plus ses plafonds quotidiens
    recompenses: Object.fromEntries(s.players.map((p) => {
      const raisons = [];
      if (tours < cfgAF.toursMin) raisons.push("partie_trop_courte");
      if (p.abandon) raisons.push("abandon");
      if (p.absencesTotal > cfgAF.absencesMax) raisons.push("absent");
      if (raison === "limite_de_tours" || raison === "annulee") raisons.push("sans_vainqueur");
      return [p.id, { eligible: !raisons.length, gagnant: gagnants.includes(p.id), raisons }];
    })),
  };
  emit(s, "fin", { gagnants, raison, camp, roles: s.result.roles, tours, interrompues });
}

// ===== Actions =====
export function act(state, playerId, action, now = 0) {
  if (!state || typeof state !== "object") return { error: { code: "ETAT_INVALIDE", message: "État manquant." } };
  if (!action || typeof action !== "object" || typeof action.type !== "string") return { error: { code: "ACTION_INVALIDE", message: "Action mal formée." } };
  const s = cloneState(state);
  s._ev = [];
  try {
    tickInner(s, now);
    if (action.rev != null && action.rev !== s.rev) refuse("PERIME", "L'état a changé depuis ta dernière mise à jour : action ignorée.");
    const p = P(s, playerId);
    if (action.nonce != null && p && p.nonces.includes(action.nonce)) refuse("DOUBLON", "Cette action a déjà été reçue.");
    handle(s, playerId, action, now);
    if (action.nonce != null && P(s, playerId)) { const q = P(s, playerId); q.nonces.push(action.nonce); if (q.nonces.length > 32) q.nonces.shift(); }
    s.rev++;
    advance(s, now);
  } catch (e) {
    if (e instanceof Refus) return { error: { code: e.code, message: e.message } };
    throw e;
  }
  const events = s._ev;
  delete s._ev;
  return { state: s, events };
}

export function tick(state, now) {
  const s = cloneState(state);
  s._ev = [];
  tickInner(s, now);
  const events = s._ev;
  delete s._ev;
  return events.length ? { state: s, events } : { state, events: [] };
}

function tickInner(s, now) {
  let changed = false;
  for (let guard = 0; guard < 500; guard++) {
    if ((s.phase === "contributions" || s.phase === "choix") && s.deadline != null && now >= s.deadline) {
      if (s.phase === "contributions") for (const p of s.players) if (!p.soumis) { emit(s, "delai_expire", { kind: "contribution", pid: p.id }); submitContribution(s, p, []); }
      if (s.phase === "choix") for (const p of s.players) if (!p.choix) { emit(s, "delai_expire", { kind: "choix", pid: p.id }); p.choix = p.propositions[0]; }
      changed = true;
      advance(s, now);
      continue;
    }
    if (s.phase === "partie" && s.prompt && now >= s.prompt.deadline) {
      resolveTimeout(s, now);
      changed = true;
      advance(s, now);
      continue;
    }
    break;
  }
  if (changed) s.rev++;
  return changed;
}

function resolveTimeout(s, now) {
  const pr = s.prompt, p = P(s, pr.pid), auto = s.config.defenseAutoSurDelai;
  emit(s, "delai_expire", { kind: pr.kind, pid: p.id });
  let a;
  switch (pr.kind) {
    case "tour": {
      p.absences++; p.absencesTotal++;
      const k = Math.max(0, p.main.length - limiteMain(s, p));
      a = { type: "finir", defausse: p.main.slice(p.main.length - k) };
      respond(s, p, a, now, true);
      if (p.absences >= s.config.absencesMax) abandonner(s, p, "absences");
      return;
    }
    case "reaction": {
      const par = handOf(s, p, "parade")[0];
      a = auto && par ? { type: "parer", carte: par } : { type: "encaisser" };
      break;
    }
    case "onde": case "defi": {
      const f = handOf(s, p, "frappe")[0];
      a = auto && f ? { type: "defausser", carte: f } : { type: "encaisser" };
      break;
    }
    case "sauvetage": {
      const o = optionsSauvetage(s, p), el = handOf(s, p, "elixir")[0];
      a = auto && o.includes("elixir") ? { type: "elixir", carte: el } : auto && o.includes("survie") ? { type: "survie", cartes: p.main.slice(-coutSurvie(s, p)) } : { type: "encaisser" };
      break;
    }
    case "stratege": a = { type: "garder", cartes: pr.data.cartes.slice(0, s.config.stratege.garde) }; break;
    case "voleur": a = { type: "piocher", cible: null }; break;
    case "etal": a = { type: "prendre", carte: s.etal[0] }; break;
    default: throw new Error("attente inconnue " + pr.kind);
  }
  respond(s, p, a, now, true);
}

function abandonner(s, p, raison) {
  if (!p.vivant) return;
  p.abandon = true;
  emit(s, "abandon", { pid: p.id, raison });
  eliminate(s, p, null, "abandon");
}

function handle(s, pid, a, now) {
  const p = P(s, pid);
  switch (a.type) {
    case "rejoindre":
      if (s.phase !== "lobby") refuse("PHASE", "On ne peut rejoindre que le salon.");
      addPlayer(s, pid); emit(s, "rejoint", { pid }); return;
    case "quitter":
      if (s.phase !== "lobby") refuse("PHASE", "La partie a commencé : utilise l'abandon.");
      mustP(s, pid); s.players = s.players.filter((q) => q.id !== pid); s.players.forEach((q, i) => (q.siege = i));
      if (s.hote === pid) s.hote = s.players[0] ? s.players[0].id : null;
      emit(s, "quitte", { pid }); return;
    case "lancer":
      if (s.phase !== "lobby") refuse("PHASE", "La partie est déjà lancée.");
      if (pid !== s.hote) refuse("PAS_HOTE", "Seul l'hôte lance la partie.");
      startContributions(s, now); return;
    case "presence": {
      mustP(s, pid);
      p.enLigne = !!a.enLigne;
      emit(s, p.enLigne ? "reconnexion" : "deconnexion", { pid });
      if (!p.enLigne && s.prompt && s.prompt.pid === pid) s.prompt.deadline = Math.min(s.prompt.deadline, now + s.config.delais.graceDeconnexion);
      return;
    }
    case "abandon": {
      mustP(s, pid);
      if (s.phase === "fin") refuse("FINIE", "La partie est terminée.");
      if (s.phase === "lobby") return handle(s, pid, { type: "quitter" }, now);
      if (s.phase === "contributions" || s.phase === "choix") {
        p.abandon = true;
        emit(s, "abandon", { pid, raison: "volontaire" });
        return endGame(s, [], "annulee");
      }
      if (!p.vivant) refuse("ELIMINE", "Tu es déjà éliminé.");
      return abandonner(s, p, "volontaire");
    }
    case "contribuer":
      mustP(s, pid);
      if (s.phase !== "contributions") refuse("PHASE", "Ce n'est pas le moment d'apporter des cartes.");
      return submitContribution(s, p, a.cartes);
    case "choisir": {
      mustP(s, pid);
      if (s.phase !== "choix") refuse("PHASE", "Ce n'est pas le moment de choisir.");
      if (p.choix) refuse("DEJA_CHOISI", "Tu as déjà choisi ton personnage.");
      if (!p.propositions.includes(a.instanceId)) refuse("CHOIX_INVALIDE", "Tu dois choisir l'un de tes personnages proposés.");
      p.choix = a.instanceId;
      emit(s, "choix", { pid }); // public : seulement le fait d'avoir choisi
      emit(s, "choix_prive", { pid, instanceId: a.instanceId }, [pid]);
      return;
    }
  }
  if (s.phase === "fin") refuse("FINIE", "La partie est terminée.");
  if (s.phase !== "partie") refuse("PHASE", "Action impossible dans cette phase.");
  mustP(s, pid);
  if (!p.vivant) refuse("ELIMINE", "Tu es éliminé.");
  if (!s.prompt || s.prompt.pid !== pid) refuse("PAS_TON_TOUR", "Ce n'est pas à toi d'agir.");
  if (a.promptId != null && a.promptId !== s.prompt.id) refuse("PERIME", "Cette demande n'est plus d'actualité.");
  respond(s, p, a, now, false);
}

// Réponse à l'attente en cours (aussi utilisée pour les délais expirés)
function respond(s, p, a, now, auto) {
  const pr = s.prompt;
  const done = () => { s.prompt = null; };
  switch (pr.kind) {
    case "tour": {
      if (!auto) p.absences = 0;
      if (a.type === "finir") {
        const k = Math.max(0, p.main.length - limiteMain(s, p)), d = a.defausse || [];
        if (!Array.isArray(d) || d.length !== k || new Set(d).size !== d.length || !d.every((u) => inHand(p, u))) refuse("DEFAUSSE_INVALIDE", `Tu dois défausser exactement ${k} carte(s) de ta main.`);
        d.forEach((u) => { fromHand(s, p, u); discardCard(s, u); });
        if (d.length) emit(s, "defausse_fin", { pid: p.id, cartes: d.map((u) => cardPub(s, u)) });
        // mesure : Frappe en main et Frappe encore permise, mais personne à portée
        if (!s.turn.entrave && handOf(s, p, "frappe").length && s.turn.frappes < frappesMax(s, p) && !vivants(s).some((q) => aPortee(s, p, q))) stat(s, p.id, "horsPortee");
        s.turn.fini = true;
        emit(s, "fin_tour", { pid: p.id });
        return done();
      }
      if (s.turn.entrave) refuse("ENTRAVE", "Tu es entravé : tu ne peux que finir ton tour.");
      if (a.type === "survie") return survie(s, p, a.cartes, false, done);
      if (a.type === "jouer") { done(); return jouer(s, p, a); }
      return refuse("ACTION_INVALIDE", "Action inconnue pendant ton tour.");
    }
    case "reaction": {
      const src = P(s, pr.data.src);
      if (a.type === "parer") {
        if (!inHand(p, a.carte) || defId(s, a.carte) !== "parade") refuse("CARTE_INVALIDE", "Il faut une Parade.");
        fromHand(s, p, a.carte); discardCard(s, a.carte);
        stat(s, p.id, "parades");
        emit(s, "pare", { pid: p.id, src: src.id, carte: cardPub(s, a.carte) });
        // petite table : la Frappe parée d'un joueur Précision lui fait piocher (réglage)
        if (pr.data.nature !== "pluie" && src.vivant && branche(src) === "precision" && petiteTable(s) && s.config.petiteTable.precisionPiocheSiParee) piocher(s, src, s.config.petiteTable.precisionPiocheSiParee, "precision");
        // Précision (réglage) : Frappe parée, présage ; sur les signes indiqués, la Frappe revient dans sa main
        const rep = s.config.precision.repriseSiParee;
        if (pr.data.nature === "frappe" && src.vivant && branche(src) === "precision" && rep && rep.length && pr.data.carte && s.discard.includes(pr.data.carte)) {
          // (le présage peut avoir remélangé la défausse : la Frappe est alors dans la pioche)
          const ok = presage(s, src, "reprise", (k) => rep.includes(k.signe));
          const from = s.discard.includes(pr.data.carte) ? s.discard : s.deck.includes(pr.data.carte) ? s.deck : null;
          if (ok && from) {
            from.splice(from.indexOf(pr.data.carte), 1);
            src.main.push(pr.data.carte);
            stat(s, src.id, "reprises");
            emit(s, "reprise", { pid: src.id, carte: cardPub(s, pr.data.carte) });
          }
        }
        return done();
      }
      if (a.type === "riposter") {
        if (!inHand(p, a.carte) || defId(s, a.carte) !== "riposte") refuse("CARTE_INVALIDE", "Il faut une Riposte runique.");
        if (pr.data.nature === "pluie") refuse("RIPOSTE_IMPOSSIBLE", "On ne riposte pas à une Pluie de shurikens.");
        if (!src.vivant || !aPortee(s, p, src)) refuse("HORS_PORTEE", "L'attaquant est hors de portée de ton arme.");
        fromHand(s, p, a.carte); discardCard(s, a.carte);
        hostile(s, p.id, src.id);
        emit(s, "riposte", { pid: p.id, cible: src.id, carte: cardPub(s, a.carte) });
        done();
        s.queue.unshift({ t: "attaque", src: p.id, cible: src.id, nature: "riposte" });
        return;
      }
      if (a.type === "encaisser") {
        done();
        // Précision (réglage) : une Frappe qui touche une cible sans carte en main fait perdre 2 PV
        const n = pr.data.nature !== "pluie" && branche(src) === "precision" && s.config.precision.degatsMainVide && p.main.length === 0 ? s.config.precision.degatsMainVide : 1;
        s.queue.unshift({ t: "degats", cible: p.id, n, src: src.id, cause: pr.data.nature });
        return;
      }
      return refuse("ACTION_INVALIDE", "Réponds par parer, riposter ou encaisser.");
    }
    case "onde": {
      if (a.type === "defausser") {
        if (!inHand(p, a.carte) || defId(s, a.carte) !== "frappe") refuse("CARTE_INVALIDE", "Il faut défausser une Frappe d'essence.");
        fromHand(s, p, a.carte); discardCard(s, a.carte);
        emit(s, "onde_evitee", { pid: p.id });
        return done();
      }
      if (a.type === "encaisser") { done(); s.queue.unshift({ t: "degats", cible: p.id, n: 1, src: pr.data.src, cause: "onde" }); return; }
      return refuse("ACTION_INVALIDE", "Défausse une Frappe ou encaisse.");
    }
    case "defi": {
      const other = pr.data.a === p.id ? pr.data.b : pr.data.a;
      if (a.type === "defausser") {
        if (!inHand(p, a.carte) || defId(s, a.carte) !== "frappe") refuse("CARTE_INVALIDE", "Il faut défausser une Frappe d'essence.");
        fromHand(s, p, a.carte); discardCard(s, a.carte);
        emit(s, "defi_relance", { pid: p.id });
        done();
        s.queue.unshift({ t: "defi", a: pr.data.a, b: pr.data.b, cur: other });
        return;
      }
      if (a.type === "encaisser") { done(); emit(s, "defi_perdu", { pid: p.id }); s.queue.unshift({ t: "degats", cible: p.id, n: 1, src: other, cause: "defi" }); return; }
      return refuse("ACTION_INVALIDE", "Défausse une Frappe ou encaisse.");
    }
    case "sauvetage": {
      const opts = optionsSauvetage(s, p);
      if (a.type === "elixir") {
        if (!opts.includes("elixir")) refuse("SAUVETAGE_IMPOSSIBLE", "L'Élixir ne peut pas te sauver maintenant.");
        if (!inHand(p, a.carte) || defId(s, a.carte) !== "elixir") refuse("CARTE_INVALIDE", "Il faut un Élixir de vie.");
        fromHand(s, p, a.carte); discardCard(s, a.carte);
        p.pv += 1; stat(s, p.id, "soins"); stat(s, p.id, "sauvetages");
        emit(s, "sauvetage", { pid: p.id, par: "elixir", pv: p.pv });
        done();
        s.queue.unshift({ t: "agonie", cible: p.id, src: pr.data.src, cause: pr.data.cause });
        return;
      }
      if (a.type === "survie") {
        if (!opts.includes("survie")) refuse("SAUVETAGE_IMPOSSIBLE", "Ténacité impossible.");
        survie(s, p, a.cartes, true, done);
        s.queue.unshift({ t: "agonie", cible: p.id, src: pr.data.src, cause: pr.data.cause });
        return;
      }
      if (a.type === "encaisser") { done(); eliminate(s, p, pr.data.src, pr.data.cause); return; }
      return refuse("ACTION_INVALIDE", "Sauve-toi ou encaisse.");
    }
    case "stratege": {
      if (a.type !== "garder") refuse("ACTION_INVALIDE", "Choisis les cartes à garder.");
      const k = s.config.stratege.garde, c = a.cartes;
      if (!Array.isArray(c) || c.length !== k || new Set(c).size !== k || !c.every((u) => s.limbe.includes(u))) refuse("CHOIX_INVALIDE", `Garde exactement ${k} des cartes regardées.`);
      const reste = s.limbe.filter((u) => !c.includes(u));
      p.main.push(...c);
      s.deck.unshift(...reste); // sous la pioche
      s.limbe = [];
      emit(s, "pioche", { pid: p.id, n: c.length, cause: "stratege", cartes: c.map((u) => cardPub(s, u)) }, [p.id]);
      emit(s, "pioche_publique", { pid: p.id, n: c.length, cause: "stratege", sousLaPioche: reste.length });
      return done();
    }
    case "voleur": {
      if (a.type !== "piocher") refuse("ACTION_INVALIDE", "Choisis d'où vient ta première carte.");
      done();
      if (a.cible == null) { piocher(s, p, s.config.pioche); return; }
      const c = P(s, a.cible);
      if (!c || !ciblesVoleur(s, p).includes(c.id)) refuse("CIBLE_INVALIDE", "Tu ne peux pas voler ce joueur.");
      const u = c.main.splice(rint(s, "jeu", c.main.length), 1)[0];
      p.main.push(u);
      hostile(s, p.id, c.id); stat(s, p.id, "vols");
      emit(s, "vol", { pid: p.id, cible: c.id, carte: cardPub(s, u) }, [p.id, c.id]);
      emit(s, "vol_public", { pid: p.id, cible: c.id, source: "main" });
      piocher(s, p, s.config.pioche - 1);
      return;
    }
    case "etal": {
      if (a.type !== "prendre") refuse("ACTION_INVALIDE", "Prends une carte de l'étal.");
      if (!s.etal.includes(a.carte)) refuse("CARTE_INVALIDE", "Cette carte n'est pas sur l'étal.");
      s.etal.splice(s.etal.indexOf(a.carte), 1);
      p.main.push(a.carte);
      emit(s, "etal_pris", { pid: p.id, carte: cardPub(s, a.carte) });
      done();
      s.queue.unshift({ t: "etal", ordre: pr.data.ordre.slice(1) });
      return;
    }
  }
  throw new Error("attente inconnue " + pr.kind);
}

function ciblesVoleur(s, p) {
  const { portee, petiteTablePlusRiche, petiteTableMainMin } = s.config.voleur;
  return vivants(s).filter((q) => q.id !== p.id && q.main.length && (portee == null || distancePercue(s, p.id, q.id) <= portee) && !(petiteTable(s) && petiteTableMainMin && q.main.length < petiteTableMainMin) && !(petiteTablePlusRiche && petiteTable(s) && q.main.length < p.main.length + (petiteTablePlusRiche === "strict" ? 1 : 0))).map((q) => q.id);
}

function survie(s, p, cartes, sauvetage, done) {
  if (!survieDispo(s, p, sauvetage)) refuse("SURVIE_IMPOSSIBLE", "Ténacité impossible maintenant.");
  const k = coutSurvie(s, p);
  if (!Array.isArray(cartes) || cartes.length !== k || new Set(cartes).size !== k || !cartes.every((u) => inHand(p, u))) refuse("CARTES_INVALIDES", `Défausse exactement ${k} cartes de ta main.`);
  cartes.forEach((u) => { fromHand(s, p, u); discardCard(s, u); });
  p.pv = Math.min(p.pvMax, p.pv + 1);
  if (s.turn && s.turn.pid === p.id) s.turn.survie++;
  if (s.turn) p.survieTour = s.turn.n;
  stat(s, p.id, "soins"); stat(s, p.id, "survies");
  emit(s, "survie", { pid: p.id, cartes: cartes.map((u) => cardPub(s, u)), pv: p.pv });
  done();
}

/** Cartes jouables à son tour : vérifie tout, puis place les effets dans la file. */
function jouer(s, p, a) {
  const uid = a.carte;
  if (!inHand(p, uid)) refuse("CARTE_ABSENTE", "Cette carte n'est pas dans ta main.");
  const d = defId(s, uid), D = CARD_DEFS[d];
  const cible = a.cible != null ? P(s, a.cible) : null;
  const autreVivant = () => { if (!cible || !cible.vivant || cible.id === p.id) refuse("CIBLE_INVALIDE", "Choisis un autre joueur en vie."); };
  const pose = () => { fromHand(s, p, uid); };
  const use = () => { fromHand(s, p, uid); discardCard(s, uid); };
  const evt = (extra = {}) => emit(s, "joue", { pid: p.id, carte: cardPub(s, uid), ...extra });
  const choixCarte = (c) => {
    if (a.choix === "main") { if (!c.main.length) refuse("CIBLE_VIDE", "Sa main est vide."); return { from: "main" }; }
    if (a.choix && (c.arme === a.choix || c.equip.includes(a.choix))) return { from: "pose", uid: a.choix };
    refuse("CHOIX_INVALIDE", "Choisis « main » ou une carte posée devant ce joueur.");
  };
  const prendre = (c, ch) => {
    if (ch.from === "main") return c.main.splice(rint(s, "jeu", c.main.length), 1)[0];
    if (c.arme === ch.uid) { c.arme = null; return ch.uid; }
    c.equip.splice(c.equip.indexOf(ch.uid), 1); return ch.uid;
  };
  switch (d) {
    case "frappe": {
      autreVivant();
      if (s.turn.frappes >= frappesMax(s, p)) refuse("LIMITE_FRAPPES", "Tu as déjà frappé autant que permis ce tour-ci.");
      if (!aPortee(s, p, cible)) refuse("HORS_PORTEE", `Hors de portée : distance ${distancePercue(s, p.id, cible.id)}, portée de ton arme ${porteeArme(s, p)}.`);
      use(); s.turn.frappes++;
      stat(s, p.id, "frappes"); hostile(s, p.id, cible.id);
      evt({ cible: cible.id });
      s.queue.unshift({ t: "attaque", src: p.id, cible: cible.id, nature: "frappe", carte: uid });
      return;
    }
    case "parade": case "riposte": return refuse("REACTION_SEULEMENT", "Cette carte se joue en réaction, hors de ton tour.");
    case "elixir": {
      if (p.pv >= p.pvMax) refuse("PV_MAX", "Tu es déjà au maximum de tes PV.");
      use(); p.pv += 1; stat(s, p.id, "soins"); evt({ pv: p.pv }); return;
    }
    case "festin": {
      use(); evt();
      for (const q of vivants(s)) if (q.pv < q.pvMax) { q.pv += 1; stat(s, q.id, "soins"); if (q.id !== p.id) aide(s, p.id, q.id); }
      return;
    }
    case "lien": {
      autreVivant();
      if (p.pv < 2) refuse("PV_INSUFFISANTS", "Il te faut au moins 2 PV.");
      if (cible.pv >= cible.pvMax) refuse("PV_MAX", "Ce joueur n'est pas blessé.");
      use(); p.pv -= 1; cible.pv += 1; stat(s, cible.id, "soins"); aide(s, p.id, cible.id, 2);
      evt({ cible: cible.id }); return;
    }
    case "larcin": case "dissipation": {
      autreVivant();
      if (d === "larcin" && distancePercue(s, p.id, cible.id) > s.config.porteeLarcin) refuse("HORS_PORTEE", "Le Larcin ne vise qu'un joueur à distance 1.");
      const ch = choixCarte(cible);
      use();
      const u = prendre(cible, ch);
      hostile(s, p.id, cible.id);
      if (d === "larcin") {
        p.main.push(u); stat(s, p.id, "vols");
        if (ch.from === "main") { emit(s, "vol", { pid: p.id, cible: cible.id, carte: cardPub(s, u) }, [p.id, cible.id]); evt({ cible: cible.id, source: "main" }); }
        else evt({ cible: cible.id, source: "pose", prise: cardPub(s, u) });
      } else { discardCard(s, u); evt({ cible: cible.id, source: ch.from, defaussee: cardPub(s, u) }); }
      return;
    }
    case "inspiration": case "revelation": use(); evt(); piocher(s, p, d === "inspiration" ? 2 : 3, d); return;
    case "etal": {
      use(); evt();
      const al = vivants(s), i = al.indexOf(p), ordre = al.slice(i).concat(al.slice(0, i)).map((q) => q.id);
      for (let k = 0; k < ordre.length; k++) { const u = takeTop(s); if (u) s.etal.push(u); }
      emit(s, "etal", { cartes: s.etal.map((u) => cardPub(s, u)) });
      s.queue.unshift({ t: "etal", ordre });
      return;
    }
    case "defi": {
      autreVivant(); use(); hostile(s, p.id, cible.id); stat(s, p.id, "defis"); evt({ cible: cible.id });
      s.queue.unshift({ t: "defi", a: p.id, b: cible.id, cur: cible.id });
      return;
    }
    case "pluie": case "onde": {
      use(); evt();
      const al = vivants(s), i = al.indexOf(p), autres = al.slice(i + 1).concat(al.slice(0, i));
      autres.forEach((q) => hostile(s, p.id, q.id));
      s.queue.unshift(...autres.map((q) => (d === "pluie" ? { t: "attaque", src: p.id, cible: q.id, nature: "pluie" } : { t: "onde", src: p.id, cible: q.id })));
      return;
    }
    case "sceau": {
      autreVivant();
      if (cible.role === "gardien") refuse("CIBLE_INVALIDE", "Le Gardien ne peut pas être entravé.");
      if (hasEquip(s, cible, "sceau")) refuse("DEJA_POSE", "Ce joueur est déjà sous un Sceau d'entrave.");
      pose(); cible.equip.push(uid); hostile(s, p.id, cible.id); evt({ cible: cible.id }); return;
    }
    case "orbe": {
      if (hasEquip(s, p, "orbe")) refuse("DEJA_POSE", "Tu as déjà une Orbe instable.");
      pose(); p.equip.push(uid); evt(); return;
    }
    default: {
      if (D.cat === "arme") {
        pose();
        if (p.arme) { discardCard(s, p.arme); emit(s, "arme_remplacee", { pid: p.id, ancienne: cardPub(s, p.arme) }); }
        p.arme = uid; evt(); return;
      }
      if (D.type === "equipement") {
        if (hasEquip(s, p, d)) refuse("DEJA_POSE", "Tu as déjà cette carte devant toi (pas de doublon).");
        pose(); p.equip.push(uid); evt(); return;
      }
    }
  }
  throw new Error("carte inconnue " + d);
}

// ===== Actions possibles =====
export function legalActions(s, pid) {
  const p = P(s, pid);
  if (!p) return s.phase === "lobby" && s.players.length < 7 ? [{ type: "rejoindre" }] : [];
  const out = [];
  if (s.phase === "lobby") { out.push({ type: "quitter" }); if (pid === s.hote && modeFor(s.players.length)) out.push({ type: "lancer" }); return out; }
  if (s.phase === "fin") return [];
  if (s.phase === "contributions") { if (!p.soumis) out.push({ type: "contribuer", cartes: "liste" }); out.push({ type: "abandon" }); return out; }
  if (s.phase === "choix") { if (!p.choix) p.propositions.forEach((iid) => out.push({ type: "choisir", instanceId: iid })); out.push({ type: "abandon" }); return out; }
  if (!p.vivant) return [];
  const pr = s.prompt;
  if (pr && pr.pid === pid) {
    const id = pr.id;
    switch (pr.kind) {
      case "tour": {
        const k = Math.max(0, p.main.length - limiteMain(s, p));
        out.push({ type: "finir", aDefausser: k, promptId: id });
        if (s.turn.entrave) break;
        if (survieDispo(s, p)) out.push({ type: "survie", cartes: coutSurvie(s, p), promptId: id });
        const autres = vivants(s).filter((q) => q.id !== pid);
        const seen = new Set();
        for (const u of p.main) {
          const d = defId(s, u);
          if (seen.has(d)) continue; // une carte de chaque sorte suffit (les doublons ont le même effet)
          seen.add(d);
          const D = CARD_DEFS[d], j = (x) => out.push({ type: "jouer", carte: u, promptId: id, ...x });
          const choixDe = (q) => [...(q.main.length ? ["main"] : []), ...(q.arme ? [q.arme] : []), ...q.equip];
          switch (d) {
            case "frappe": if (s.turn.frappes < frappesMax(s, p)) autres.filter((q) => aPortee(s, p, q)).forEach((q) => j({ cible: q.id })); break;
            case "parade": case "riposte": break;
            case "elixir": if (p.pv < p.pvMax) j({}); break;
            case "lien": if (p.pv >= 2) autres.filter((q) => q.pv < q.pvMax).forEach((q) => j({ cible: q.id })); break;
            case "larcin": autres.filter((q) => distancePercue(s, pid, q.id) <= s.config.porteeLarcin).forEach((q) => choixDe(q).forEach((c) => j({ cible: q.id, choix: c }))); break;
            case "dissipation": autres.forEach((q) => choixDe(q).forEach((c) => j({ cible: q.id, choix: c }))); break;
            case "defi": autres.forEach((q) => j({ cible: q.id })); break;
            case "sceau": autres.filter((q) => q.role !== "gardien" && !hasEquip(s, q, "sceau")).forEach((q) => j({ cible: q.id })); break;
            case "orbe": if (!hasEquip(s, p, "orbe")) j({}); break;
            default:
              if (D.cat === "arme" || D.type !== "equipement" || !hasEquip(s, p, d)) j({});
          }
        }
        break;
      }
      case "reaction": {
        handOf(s, p, "parade").slice(0, 1).forEach((u) => out.push({ type: "parer", carte: u, promptId: id }));
        const src = P(s, pr.data.src);
        if (pr.data.nature !== "pluie" && src.vivant && aPortee(s, p, src)) handOf(s, p, "riposte").slice(0, 1).forEach((u) => out.push({ type: "riposter", carte: u, promptId: id }));
        out.push({ type: "encaisser", promptId: id });
        break;
      }
      case "onde": case "defi":
        handOf(s, p, "frappe").slice(0, 1).forEach((u) => out.push({ type: "defausser", carte: u, promptId: id }));
        out.push({ type: "encaisser", promptId: id });
        break;
      case "sauvetage": {
        const o = optionsSauvetage(s, p);
        if (o.includes("elixir")) out.push({ type: "elixir", carte: handOf(s, p, "elixir")[0], promptId: id });
        if (o.includes("survie")) out.push({ type: "survie", cartes: coutSurvie(s, p), promptId: id });
        out.push({ type: "encaisser", promptId: id });
        break;
      }
      case "stratege": out.push({ type: "garder", parmi: [...s.limbe], nombre: s.config.stratege.garde, promptId: id }); break;
      case "voleur": out.push({ type: "piocher", cible: null, promptId: id }); ciblesVoleur(s, p).forEach((c) => out.push({ type: "piocher", cible: c, promptId: id })); break;
      case "etal": s.etal.forEach((u) => out.push({ type: "prendre", carte: u, promptId: id })); break;
    }
  }
  out.push({ type: "abandon" });
  return out;
}

// ===== Vue filtrée =====
/**
 * Ce qu'un joueur (ou un spectateur, playerId = null) a le droit de voir. Jamais : l'état du
 * hasard, l'ordre de la pioche, la main des autres, les rôles cachés, les propositions des
 * autres, les cartes regardées par le Stratège, la carte volée (sauf voleur et volé).
 */
export function viewFor(s, playerId = null, { log = true } = {}) {
  const me = playerId != null ? P(s, playerId) : null;
  const started = s.phase === "partie" || s.phase === "fin";
  const roleShown = (p) => s.phase === "fin" || p.roleVisible || (me && me.id === p.id);
  const players = bySeat(s).map((p) => {
    const o = {
      id: p.id, siege: p.siege, vivant: p.vivant, pv: p.pv, pvMax: p.pvMax, nbMain: p.main.length,
      arme: cardPub(s, p.arme), equip: p.equip.map((u) => cardPub(s, u)), enLigne: p.enLigne,
      ordreElim: p.ordreElim, abandon: p.abandon, soumis: p.soumis, aChoisi: !!p.choix,
      perso: started && p.perso ? { instanceId: p.perso.instanceId, cardId: p.perso.cardId, branch: p.perso.branch, pret: p.perso.pret, proprietaire: p.perso.proprietaire, ...(p.perso.cosmetique !== undefined ? { cosmetique: p.perso.cosmetique } : {}) } : null,
      role: s.mode === "classique" && started && roleShown(p) ? p.role : null,
    };
    if (started) { o.distance = me && me.vivant && p.vivant && p.id !== me.id ? distance(s, me.id, p.id) : null; o.distancePercue = me && me.vivant && p.vivant && p.id !== me.id ? distancePercue(s, me.id, p.id) : null; }
    return o;
  });
  const v = {
    v: s.v, phase: s.phase, mode: s.mode, rev: s.rev, moi: me ? me.id : null, hote: s.hote, deadline: s.deadline,
    joueurs: players,
    reserve: s.phase === "lobby" || s.phase === "contributions" ? null : s.reserve.map((c) => ({ instanceId: c.instanceId, cardId: c.cardId, branch: c.branch, proprietaire: c.proprietaire, apportePar: c.apportePar, pret: c.pret })),
    pioche: s.deck.length, defausse: s.discard.slice(-10).map((u) => cardPub(s, u)), nbDefausse: s.discard.length,
    etal: s.etal.map((u) => cardPub(s, u)),
    tour: s.turn ? { pid: s.turn.pid, n: s.turn.n, tour: s.turn.tour, frappes: s.turn.frappes, entrave: s.turn.entrave } : null,
    premier: s.premier,
    attente: s.prompt ? { id: s.prompt.id, kind: s.prompt.kind, pid: s.prompt.pid, deadline: s.prompt.deadline, ...publicPromptData(s.prompt.kind, s.prompt.data) } : null,
    resultat: s.result,
    stats: { hostile: s.stats.hostile, aide: s.stats.aide },
  };
  if (me) {
    v.main = me.main.map((u) => cardPub(s, u));
    v.monRole = me.role;
    v.maContribution = me.contribution;
    v.propositions = s.phase === "choix" || started ? me.propositions.map((iid) => s.reserve.find((c) => c.instanceId === iid)) : [];
    v.monChoix = me.choix;
    if (s.prompt && s.prompt.pid === me.id && s.prompt.kind === "stratege") v.attente.cartes = s.limbe.map((u) => cardPub(s, u));
    if (started && me.vivant) { v.limiteMain = limiteMain(s, me); v.porteeArme = porteeArme(s, me); v.frappesMax = frappesMax(s, me); }
    v.actions = legalActions(s, me.id);
  }
  if (log) v.journal = s.log.filter((e) => visible(e, me ? me.id : null)).map(({ vis, ...e }) => e);
  return v;
}

/** Événements qu'un joueur a le droit de voir (pour la diffusion en direct). */
export const eventsFor = (events, playerId = null) => events.filter((e) => visible(e, playerId)).map(({ vis, ...e }) => e);
