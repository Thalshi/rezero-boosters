// Outils des tests de Confrontation : préparer une table précise (branches, rôles, mains,
// dessus de la pioche) à partir d'un vrai état du moteur. L'état est du JSON : les tests le
// retouchent directement, puis vérifient que les 82 cartes sont toujours là, chacune une fois.
import * as E from "../worker/confront/engine.mjs";
import { buildDeck } from "../worker/confront/cards.mjs";

export const ALL_UIDS = buildDeck().map((c) => c.uid);
export const defOf = (uid) => E.carte(uid).def;

/** Où se trouvent les cartes : renvoie la liste de toutes les positions (pour la conservation). */
export function allCardPositions(s) {
  const pos = [...s.deck, ...s.discard, ...s.etal, ...(s.limbe || [])];
  for (const p of s.players) pos.push(...p.main, ...(p.arme ? [p.arme] : []), ...p.equip);
  return pos;
}
/** Chaque carte d'action existe exactement une fois. */
export function conserved(s) {
  if (s.phase !== "partie" && s.phase !== "fin") return true;
  const pos = allCardPositions(s);
  return pos.length === ALL_UIDS.length && new Set(pos).size === ALL_UIDS.length;
}

function detach(s, uid) {
  for (const arr of [s.deck, s.discard, s.etal, s.limbe || []]) { const i = arr.indexOf(uid); if (i >= 0) { arr.splice(i, 1); return; } }
  for (const p of s.players) {
    let i = p.main.indexOf(uid); if (i >= 0) { p.main.splice(i, 1); return; }
    if (p.arme === uid) { p.arme = null; return; }
    i = p.equip.indexOf(uid); if (i >= 0) { p.equip.splice(i, 1); return; }
  }
}
/** Prend une carte de la sorte voulue, de préférence dans la pioche ou la défausse. */
export function grab(s, def, taken = new Set()) {
  const order = [...s.deck, ...s.discard, ...s.players.flatMap((p) => p.main), ...s.players.flatMap((p) => [...p.equip, ...(p.arme ? [p.arme] : [])])];
  const uid = order.find((u) => defOf(u) === def && !taken.has(u));
  if (!uid) throw new Error("plus de carte " + def);
  taken.add(uid);
  detach(s, uid);
  return uid;
}

/**
 * Met en place les mains et l'équipement : arrange(s, { p0: { main:["frappe"], arme:"lance", equip:["cape"] } }).
 * Les cartes retirées des mains sont mises à la défausse.
 */
export function arrange(s, spec) {
  const taken = new Set();
  for (const [pid, w] of Object.entries(spec)) {
    const p = s.players.find((q) => q.id === pid);
    if (w.main) { s.discard.push(...p.main); p.main = []; }
    if (w.arme !== undefined) { if (p.arme) s.discard.push(p.arme); p.arme = null; }
    if (w.equip) { s.discard.push(...p.equip); p.equip = []; }
  }
  for (const [pid, w] of Object.entries(spec)) {
    const p = s.players.find((q) => q.id === pid);
    if (w.main) p.main = w.main.map((d) => grab(s, d, taken));
    if (w.arme) p.arme = grab(s, w.arme, taken);
    if (w.equip) p.equip = w.equip.map((d) => grab(s, d, taken));
    if (w.pv != null) p.pv = w.pv;
  }
  return s;
}
/** Place des cartes précises sur le dessus de la pioche ({def, signe?}) : la première listée sort en premier. */
export function deckTop(s, wanted) {
  const uids = wanted.map((w) => {
    const ok = (u) => defOf(u) === (w.def || defOf(u)) && (!w.signe || E.carte(u).signe === w.signe) && (!w.rangMax || E.carte(u).rang <= w.rangMax) && (!w.rangMin || E.carte(u).rang >= w.rangMin);
    const u = [...s.deck, ...s.discard].find(ok);
    if (!u) throw new Error("introuvable " + JSON.stringify(w));
    detach(s, u);
    return u;
  });
  s.deck.push(...uids.reverse());
  return s;
}
/** Donne la main à un joueur, phase d'actions, sans file d'effets en cours. */
export function forceTurn(s, pid, now = 0) {
  s.queue = [];
  s.turn = { pid, n: (s.turn ? s.turn.n : 0) + 1, tour: s.turn ? s.turn.tour : 1, stage: "actions", frappes: 0, survie: 0, entrave: false, fini: false };
  s.prompt = { id: ++s.promptSeq, kind: "tour", pid, deadline: now + s.config.delais.tour, data: { entrave: false } };
  return s;
}

/**
 * Partie prête à jouer : n joueurs p0…p(n-1). `branches` : { p0:"assaut" } (les autres prennent
 * une carte de prêt au hasard). `roles` : { p0:"gardien", … } en mode classique. `seats` : ordre
 * des sièges. Rien d'autre n'est retouché : PV, mains et pioche viennent du vrai moteur.
 */
export function setup(n, { seed = "t", branches = {}, roles = null, seats = null, config } = {}) {
  const players = Array.from({ length: n }, (_, i) => {
    const id = "p" + i, b = branches[id];
    return { id, contribution: b ? [{ instanceId: "inst-" + id, cardId: "carte-" + id, branch: b }] : [] };
  });
  let s = E.createGame({ players, seed, config });
  for (const p of s.players) {
    const own = s.reserve.find((c) => c.instanceId === "inst-" + p.id);
    let pick = p.propositions[0];
    if (own) {
      // on force la proposition pour avoir la branche voulue (le tirage lui-même est testé ailleurs)
      for (const q of s.players) if (q.propositions.includes(own.instanceId) && q.id !== p.id) q.propositions = q.propositions.map((x) => (x === own.instanceId ? s.reserve.find((c) => c.pret && !s.players.some((z) => z.propositions.includes(c.instanceId))).instanceId : x));
      p.propositions = [own.instanceId, p.propositions.find((x) => x !== own.instanceId)];
      pick = own.instanceId;
    }
    s.__pick = s.__pick || {}; s.__pick[p.id] = pick;
  }
  const picks = s.__pick; delete s.__pick;
  for (const p of s.players) { const r = E.act(s, p.id, { type: "choisir", instanceId: picks[p.id] }, 0); if (r.error) throw new Error(JSON.stringify(r.error)); s = r.state; }
  s = JSON.parse(JSON.stringify(s));
  if (roles) {
    for (const p of s.players) {
      p.role = roles[p.id]; p.roleVisible = p.role === "gardien";
      p.pvMax = s.config.pv[s.mode] + (p.role === "gardien" ? E.bonusGardien(s.config, s.players.length) : 0); p.pv = p.pvMax;
    }
  }
  if (seats) seats.forEach((id, i) => { s.players.find((p) => p.id === id).siege = i; });
  // on repart d'une table calme : pas d'effet en attente, le joueur actif en phase d'actions
  return forceTurn(s, s.turn.pid);
}
