// Confrontation · bots simples pour les simulations et les tests.
// Un bot ne voit QUE viewFor(state, son id) : il joue avec les mêmes informations qu'un humain
// (sa main, son rôle, ce qui est public). Il choisit toujours parmi view.actions.
import { act, viewFor } from "./engine.mjs";

const VALEUR = {
  parade: 9, riposte: 8, elixir: 8, revelation: 8, inspiration: 7, voile: 7, kanji: 7, frappe: 6, larcin: 6, pluie: 6, onde: 6,
  cape: 6, oeil: 6, lames: 5, lance: 5, baton: 5, arc: 5, canon: 5, dissipation: 5, etal: 5, defi: 5, festin: 5, sceau: 5, lien: 4, orbe: 1,
};
const val = (c) => VALEUR[c.def] ?? 3;

/** Petit générateur à graine pour les choix au hasard des bots. */
export function botRng(seed) {
  let a = 0;
  for (const ch of String(seed)) a = (Math.imul(a ^ ch.charCodeAt(0), 2654435761) + 1) | 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
}

const H = (v, a, b) => (v.stats.hostile[a] && v.stats.hostile[a][b]) || 0;
const A = (v, a, b) => (v.stats.aide[a] && v.stats.aide[a][b]) || 0;

/** Ennemis du bot, du plus prioritaire au moins prioritaire (d'après les seules infos publiques). */
export function ennemis(v, opts = {}) {
  const me = v.joueurs.find((p) => p.id === v.moi);
  const autres = v.joueurs.filter((p) => p.vivant && p.id !== v.moi);
  const partners = new Set(opts.partners || []);
  if (opts.focus) {
    const f = autres.find((p) => p.id === opts.focus);
    if (f) return [f];
    // la victime est éliminée : l'alliance s'arrête, chacun pour soi
    return [...autres].sort((a, b) => a.pv - b.pv);
  }
  if (v.mode !== "classique") return [...autres].sort((a, b) => a.pv - b.pv || H(v, b.id, me.id) - H(v, a.id, me.id));
  const g = v.joueurs.find((p) => p.role === "gardien");
  const susp = (p) => H(v, p.id, g.id) - A(v, p.id, g.id) + 0.5 * H(v, p.id, me.id);
  const role = v.monRole;
  let list;
  if (role === "gardien" || role === "sentinelle") {
    list = autres.filter((p) => p.role !== "gardien").map((p) => ({ p, s: susp(p) }));
    const sure = list.filter((x) => x.s > 0);
    if (sure.length) list = sure;
    else if (role === "sentinelle") list = list.filter((x) => x.s >= 0);
  } else if (role === "briseur") {
    list = autres.map((p) => ({ p, s: (p.role === "gardien" ? 100 : 0) - susp(p) + H(v, p.id, me.id) }));
    list = list.filter((x) => x.p.role === "gardien" || x.s > 0 || autres.length <= 2);
  } else {
    // Errant : affaiblit d'abord les Briseurs pour garder le Gardien en vie, puis finit seul contre lui
    const restants = autres.filter((p) => p.role !== "gardien");
    if (!restants.length) list = autres.map((p) => ({ p, s: 1 }));
    else list = restants.map((p) => ({ p, s: susp(p) + 0.5 * H(v, p.id, me.id) }));
    // avec le Coup de grâce, l'Errant achève lui-même un Gardien affaibli ; sinon il le garde en vie
    if (g && g.vivant && g.pv <= 1 && v.errantCoupDeGrace) list = [{ p: g, s: 1e6 }, ...list.filter((x) => x.p !== g)];
    else if (g && g.vivant && g.pv <= 1 && restants.length) list = list.filter((x) => x.p.role !== "gardien");
  }
  return list.sort((a, b) => b.s - a.s || a.p.pv - b.p.pv).map((x) => x.p);
}

/** Choisit une action. `opts` : { rng, focus, partners, choix:"hasard"|"premier" } */
export function botAction(v, opts = {}) {
  const rng = opts.rng || Math.random;
  const acts = v.actions || [];
  const pick = (t) => acts.filter((a) => a.type === t);
  if (v.phase === "choix") { const c = pick("choisir"); return opts.choix === "premier" ? c[0] : c[Math.floor(rng() * c.length)]; }
  if (v.phase === "contributions") return { type: "contribuer", cartes: opts.contribution || [] };
  const pr = v.attente;
  if (!pr || pr.pid !== v.moi) return null;
  const main = v.main, byUid = Object.fromEntries(main.map((c) => [c.uid, c]));
  const me = v.joueurs.find((p) => p.id === v.moi);
  const foes = ennemis(v, opts), foeIds = foes.map((p) => p.id);
  const rankFoe = (id) => { const i = foeIds.indexOf(id); return i < 0 ? 99 : i; };
  const cheap = (n, exclude = []) => [...main].filter((c) => !exclude.includes(c.uid)).sort((a, b) => val(a) - val(b)).slice(0, n).map((c) => c.uid);
  const with$ = (a) => ({ ...a, promptId: pr.id });

  switch (pr.kind) {
    case "reaction": return pick("riposter").filter(() => foeIds.includes(pr.src))[0] || pick("parer")[0] || pick("encaisser")[0];
    case "onde": case "defi": return pick("defausser")[0] || pick("encaisser")[0];
    case "sauvetage": {
      const e = pick("elixir")[0]; if (e) return e;
      if (pick("survie").length) return with$({ type: "survie", cartes: cheap(pick("survie")[0].cartes) });
      return pick("encaisser")[0];
    }
    case "stratege": { const a = pick("garder")[0]; const best = [...a.parmi].sort((x, y) => val(card(v, y)) - val(card(v, x))); return with$({ type: "garder", cartes: best.slice(0, a.nombre) }); }
    case "voleur": {
      const opts2 = pick("piocher").filter((a) => a.cible && foeIds.includes(a.cible));
      const rich = opts2.map((a) => ({ a, n: v.joueurs.find((p) => p.id === a.cible).nbMain })).filter((x) => x.n >= 2).sort((x, y) => y.n - x.n);
      return rich[0] ? rich[0].a : pick("piocher").find((a) => a.cible == null);
    }
    case "etal": return [...pick("prendre")].sort((x, y) => val(v.etal.find((c) => c.uid === y.carte)) - val(v.etal.find((c) => c.uid === x.carte)))[0];
    case "tour": return tourAction(v, opts, acts, me, foes, foeIds, rankFoe, byUid, cheap, with$, rng);
  }
  return pick("encaisser")[0] || acts[0];
}
const card = (v, uid) => v.main.find((c) => c.uid === uid) || v.etal.find((c) => c.uid === uid) || (v.attente.cartes || []).find((c) => c.uid === uid) || { def: "?" };

function tourAction(v, opts, acts, me, foes, foeIds, rankFoe, byUid, cheap, with$, rng) {
  const plays = acts.filter((a) => a.type === "jouer");
  const of = (d) => plays.filter((a) => byUid[a.carte] && byUid[a.carte].def === d);
  const toFoe = (list) => [...list].filter((a) => foeIds.includes(a.cible)).sort((x, y) => rankFoe(x.cible) - rankFoe(y.cible));
  const portee = v.porteeArme;
  const nFrappes = v.main.filter((c) => c.def === "frappe").length;
  const g = v.joueurs.find((p) => p.role === "gardien");
  const friendsHit = () => {
    // combien d'alliés connus une attaque de zone toucherait (classique uniquement)
    if (v.mode !== "classique" || opts.focus) return 0;
    if (v.monRole === "sentinelle") return g && g.vivant ? 1 : 0;
    return 0;
  };
  if (v.tour && v.tour.entrave) return { type: "finir", defausse: cheap(acts.find((a) => a.type === "finir").aDefausser), promptId: v.attente.id };
  // 1. équipement
  for (const w of ["canon", "arc", "baton", "lance"]) { const a = of(w)[0]; if (a && CARD_PORTEE[w] > portee) return a; }
  if (of("lames")[0] && portee <= 1 && !me.arme && nFrappes >= 2) return of("lames")[0];
  for (const e of ["voile", "kanji", "cape", "oeil"]) if (of(e)[0]) return of(e)[0];
  if (of("orbe")[0] && me.pv >= 3) return of("orbe")[0];
  // 2. pioche
  for (const d of ["revelation", "inspiration", "etal"]) if (of(d)[0]) return of(d)[0];
  // 3. soins
  if (me.pv < me.pvMax && of("elixir")[0]) return of("elixir")[0];
  if (me.pv < me.pvMax && of("festin")[0]) return of("festin")[0];
  // Survie : avec les cartes qui seraient défaussées en fin de tour, ou en urgence
  if (acts.find((a) => a.type === "survie") && me.pv < me.pvMax && (v.main.length - v.limiteMain >= 1 || (me.pv <= 2 && v.main.length >= 3))) return with$({ type: "survie", cartes: cheap(acts.find((a) => a.type === "survie").cartes) });
  if (v.monRole === "sentinelle" && g && g.vivant && g.pv < g.pvMax && me.pv >= 3) { const l = of("lien").find((a) => a.cible === g.id); if (l) return l; }
  // 4. gêner les ennemis
  const sc = toFoe(of("sceau"))[0]; if (sc) return sc;
  for (const d of ["larcin", "dissipation"]) {
    const list = toFoe(of(d));
    if (list.length) {
      const top = list[0].cible;
      const t = v.joueurs.find((p) => p.id === top);
      const posee = list.filter((a) => a.cible === top && a.choix !== "main");
      const prefer = posee.find((a) => ["voile", "kanji", "cape"].includes(defOf(t, a.choix))) || posee.find((a) => t.arme && t.arme.uid === a.choix);
      return prefer || list.find((a) => a.cible === top && a.choix === "main") || list[0];
    }
  }
  // 5. attaques
  const zone = (d) => { const a = of(d)[0]; if (a && foes.length > friendsHit()) return a; return null; };
  const df = toFoe(of("defi"))[0]; if (df && nFrappes >= 2) return df;
  // Frappe : la première du tour toujours ; les suivantes seulement si elles peuvent achever la cible
  // ou s'il reste de quoi se défendre (une Frappe sert aussi contre le Défi et l'Onde de choc)
  const fr = toFoe(of("frappe"))[0];
  if (fr) {
    const tgt = v.joueurs.find((p) => p.id === fr.cible);
    if (v.tour.frappes === 0 || nFrappes >= 3 || tgt.pv <= 1 || tgt.nbMain === 0) return fr;
  }
  const z = zone("pluie") || zone("onde"); if (z) return z;
  // 6. fin du tour
  const fin = acts.find((a) => a.type === "finir");
  return { type: "finir", defausse: cheap(fin.aDefausser), promptId: fin.promptId };
}
const CARD_PORTEE = { lance: 2, baton: 3, arc: 4, canon: 5 };
const defOf = (p, uid) => (p.arme && p.arme.uid === uid ? p.arme.def : (p.equip.find((c) => c.uid === uid) || {}).def);

/**
 * Fait jouer des bots jusqu'à la fin de la partie (ou `maxSteps` actions).
 * `optsFor(pid)` donne les options de chaque bot. Renvoie { state, steps, now }.
 * Toute action refusée par le moteur est une erreur (un bot ne doit jouer que des actions légales).
 */
export function playGame(state, { optsFor = () => ({}), now = 0, step = 1000, maxSteps = 20000, onStep } = {}) {
  let s = state, steps = 0;
  while (s.phase !== "fin" && steps < maxSteps) {
    let pid;
    if (s.phase === "contributions") pid = s.players.find((p) => !p.soumis).id;
    else if (s.phase === "choix") pid = s.players.find((p) => !p.choix).id;
    else if (s.phase === "partie") pid = s.prompt.pid;
    else throw new Error("phase inattendue " + s.phase);
    const v = viewFor(s, pid, { log: false });
    const a = botAction(v, optsFor(pid));
    const r = act(s, pid, a, now);
    if (r.error) throw new Error(`action de bot refusée (${r.error.code}) : ${JSON.stringify(a)} · ${r.error.message}`);
    s = r.state; steps++; now += step;
    if (onStep) onStep(s, pid, a, r.events);
  }
  return { state: s, steps, now };
}
