// Confrontation · tests du moteur (sans serveur), tous déterministes.
// Lancer : node tests/confront-engine.mjs
// Couvre les scénarios obligatoires du cahier des charges (04 §4 et §11) plus les invariants
// (conservation des cartes, rejouabilité, aucune fuite d'information secrète).
import * as E from "../worker/confront/engine.mjs";
import { playGame, botRng } from "../worker/confront/bots.mjs";
import { BRANCH_IDS } from "../worker/confront/branches.mjs";
import { TOTAL_CARTES } from "../worker/confront/cards.mjs";
import { reporter } from "./lib.mjs";
import { setup, arrange, deckTop, forceTurn, conserved, defOf } from "./confront-outils.mjs";

const t = reporter("Confrontation · moteur");
const P = (s, id) => s.players.find((p) => p.id === id);
// joue une action et échoue bruyamment si elle est refusée
function ok(s, pid, a, now = 0) {
  const r = E.act(s, pid, a, now);
  if (r.error) throw new Error(`${pid} ${JSON.stringify(a)} refusé : ${r.error.code} ${r.error.message}`);
  return r.state;
}
const err = (s, pid, a, now = 0) => (E.act(s, pid, a, now).error || {}).code;
const card = (s, pid, d) => P(s, pid).main.find((u) => defOf(u) === d);
const types = (evs) => evs.map((e) => e.type);
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ===================================================================================
t.section("Contributions, prêts, réserve, tirage et choix");
{
  // 1. Deux joueurs avec peu de cartes : prêts automatiques
  const s = E.createGame({ players: [{ id: "A", contribution: [{ instanceId: "A-1", cardId: "kai-1", branch: "stratege" }] }, { id: "B", contribution: [] }], seed: "peu" });
  const prets = s.reserve.filter((c) => c.pret);
  t.check("duel avec 1 carte apportée en tout : réserve de 16 (8 par joueur), 15 prêts", s.reserve.length === 16 && prets.length === 15, { reserve: s.reserve.length, prets: prets.length });
  t.check("chaque joueur a exactement une carte par branche dans la réserve (prêt ou collection)", ["A", "B"].every((id) => BRANCH_IDS.every((b) => s.reserve.filter((c) => c.apportePar === id && c.branch === b).length === 1)));
  t.check("les prêts n'appartiennent à personne et sont marqués « prêt » (ni vendables ni en collection)", prets.every((c) => c.proprietaire === null && c.pret === true && c.cardId.startsWith("pret-")));
  t.check("phase choix : deux propositions par joueur, toutes différentes", s.phase === "choix" && new Set(s.players.flatMap((p) => p.propositions)).size === 4);
  const s2 = ok(ok(s, "A", { type: "choisir", instanceId: s.players[0].propositions[1] }), "B", { type: "choisir", instanceId: s.players[1].propositions[0] });
  t.check("après les deux choix la partie démarre, 6 PV en duel, main de départ = PV", s2.phase === "partie" && s2.players.every((p) => p.pvMax === 6 && p.pv === 6) && conserved(s2));
  const fin = playGame(s2, { optsFor: () => ({ rng: botRng("peu") }) }).state;
  t.check("la partie à prêts va jusqu'au bout, un seul vainqueur", fin.phase === "fin" && fin.result.gagnants.length === 1, fin.result && fin.result.raison);

  // validations de contribution
  const mk = (contribs) => { try { E.createGame({ players: contribs.map((c, i) => ({ id: "J" + i, contribution: c })), seed: "v" }); return "ok"; } catch (e) { return e.code; } };
  t.check("deux cartes de la même branche dans une contribution : refusé", mk([[{ instanceId: "x1", cardId: "a", branch: "assaut" }, { instanceId: "x2", cardId: "b", branch: "assaut" }], []]) === "BRANCHE_EN_DOUBLE");
  t.check("la même instance apportée par deux joueurs : refusé", mk([[{ instanceId: "x1", cardId: "a", branch: "assaut" }], [{ instanceId: "x1", cardId: "a", branch: "chance" }]]) === "INSTANCE_EN_DOUBLE");
  t.check("une carte de prêt apportée comme une carte de collection : refusé", mk([[{ instanceId: "y", cardId: "pret-assaut", branch: "assaut" }], []]) === "PRET_INTERDIT");
  t.check("branche inconnue : refusé", mk([[{ instanceId: "y", cardId: "a", branch: "magie" }], []]) === "BRANCHE_INCONNUE");
  t.check("plus de 8 cartes : refusé", mk([BRANCH_IDS.concat("assaut").map((b, i) => ({ instanceId: "z" + i, cardId: "c", branch: b })), []]) === "CONTRIBUTION_INVALIDE");
  t.check("8 cartes de 8 branches : accepté", mk([BRANCH_IDS.map((b, i) => ({ instanceId: "z" + i, cardId: "c" + i, branch: b })), []]) === "ok");

  // 6. Deux propriétaires apportent des instances distinctes du même personnage
  const two = E.createGame({ players: [{ id: "A", contribution: [{ instanceId: "A-kai", cardId: "kai-1", branch: "stratege" }] }, { id: "B", contribution: [{ instanceId: "B-kai", cardId: "kai-1", branch: "stratege" }] }, { id: "C", contribution: [] }], seed: "deux-kai" });
  t.check("deux instances distinctes du même personnage (A et B) : acceptées, toutes deux dans la réserve", two.reserve.filter((c) => c.cardId === "kai-1").length === 2);
  // sur de nombreux tirages : jamais la même instance deux fois, jamais deux fois le même perso dans une paire
  let dupInst = 0, samePair = 0, both = null;
  for (let i = 0; i < 400; i++) {
    const g = E.createGame({ players: [{ id: "A", contribution: [{ instanceId: "A-kai", cardId: "kai-1", branch: "stratege" }, { instanceId: "A-x", cardId: "x-1", branch: "assaut" }] }, { id: "B", contribution: [{ instanceId: "B-kai", cardId: "kai-1", branch: "stratege" }] }, { id: "C", contribution: [] }], seed: "tir" + i });
    const all = g.players.flatMap((p) => p.propositions);
    if (new Set(all).size !== all.length) dupInst++;
    for (const p of g.players) { const [a, b] = p.propositions.map((iid) => g.reserve.find((c) => c.instanceId === iid)); if (a.cardId === b.cardId) samePair++; }
    if (!both) {
      const pa = g.players[0].propositions, pb = g.players[1].propositions;
      const ka = pa.find((x) => x.endsWith("-kai")), kb = pb.find((x) => x.endsWith("-kai"));
      if (ka && kb) both = { g, ka, kb };
    }
  }
  t.check("400 tirages : aucune instance distribuée deux fois", dupInst === 0, { dupInst });
  t.check("400 tirages : jamais deux fois le même personnage dans les deux propositions d'un joueur", samePair === 0, { samePair });
  if (both) {
    let g = ok(ok(both.g, "A", { type: "choisir", instanceId: both.ka }), "B", { type: "choisir", instanceId: both.kb });
    g = ok(g, "C", { type: "choisir", instanceId: g.players[2].propositions[0] });
    const a = P(g, "A").perso, b = P(g, "B").perso;
    t.check("plusieurs instances du même personnage en jeu : même perso, instances différentes, même pouvoir", a.cardId === "kai-1" && b.cardId === "kai-1" && a.instanceId !== b.instanceId && a.branch === b.branch);
    const end = playGame(g, { optsFor: () => ({ rng: botRng("kai") }) }).state;
    t.check("… et la partie se termine normalement", end.phase === "fin" && conserved(end));
  } else t.check("tirage où A et B reçoivent chacun un Kaï trouvé", false);

  // 7. Carte personnalisée apportée par A, choisie par B : aucun transfert
  const cosm = { cadre: "aurore", aura: "turquoise", designId: "d-42" };
  let found = null;
  for (let i = 0; i < 500 && !found; i++) {
    const g = E.createGame({ players: [{ id: "A", contribution: [{ instanceId: "A-perso", cardId: "irsy-3", branch: "stratege", cosmetique: cosm }] }, { id: "B", contribution: [] }], seed: "cos" + i });
    if (P(g, "B").propositions.includes("A-perso")) found = g;
  }
  if (found) {
    const before = JSON.stringify(found.reserve.find((c) => c.instanceId === "A-perso"));
    let g = ok(found, "B", { type: "choisir", instanceId: "A-perso" });
    g = ok(g, "A", { type: "choisir", instanceId: P(g, "A").propositions[0] });
    const u = g.usage.find((x) => x.joueur === "B");
    t.check("B joue la carte de A : l'usage note joueur B, propriétaire A", u.instanceId === "A-perso" && u.proprietaire === "A" && u.joueur === "B");
    t.check("la carte et son cosmétique restent à A (réserve et contribution inchangées)", JSON.stringify(g.reserve.find((c) => c.instanceId === "A-perso")) === before && P(g, "A").contribution[0].proprietaire === "A" && deepEq(P(g, "A").contribution[0].cosmetique, cosm));
    const vb = E.viewFor(g, "B");
    t.check("B voit le design de A sur son personnage, avec A comme propriétaire", deepEq(vb.joueurs.find((p) => p.id === "B").perso.cosmetique, cosm) && vb.joueurs.find((p) => p.id === "B").perso.proprietaire === "A");
    const end = playGame(g, { optsFor: () => ({ rng: botRng("cos") }) }).state;
    const after = end.reserve.find((c) => c.instanceId === "A-perso");
    t.check("fin de partie : toujours propriétaire A, aucun champ de transfert dans le résultat", after.proprietaire === "A" && !JSON.stringify(end.result).includes("transfert") && end.usage.find((x) => x.joueur === "B").proprietaire === "A");
  } else t.check("tirage où B reçoit la carte de A trouvé", false);

  // choix invalides, abandon pendant le choix
  const c = E.createGame({ players: [{ id: "A", contribution: [] }, { id: "B", contribution: [] }], seed: "ch" });
  t.check("choisir une carte non proposée : refusé", err(c, "A", { type: "choisir", instanceId: P(c, "B").propositions[0] }) === "CHOIX_INVALIDE");
  const c2 = ok(c, "A", { type: "choisir", instanceId: P(c, "A").propositions[0] });
  t.check("choisir deux fois : refusé", err(c2, "A", { type: "choisir", instanceId: P(c, "A").propositions[1] }) === "DEJA_CHOISI");
  const v = E.viewFor(c2, "B");
  t.check("pendant le choix, B ne voit ni les propositions ni le choix de A", !JSON.stringify(v.joueurs).includes(P(c, "A").propositions[0]) && v.propositions.every((x) => P(c, "B").propositions.includes(x.instanceId)) && !v.journal.some((e) => e.type === "propositions" && e.pid === "A"));
  const ab = ok(c2, "B", { type: "abandon" });
  t.check("abandon pendant le choix : partie annulée, sans vainqueur ni récompense", ab.phase === "fin" && ab.result.raison === "annulee" && Object.values(ab.result.recompenses).every((r) => !r.eligible));
  // délai de choix : première proposition
  const c3 = E.tick(c2, c2.deadline).state;
  t.check("délai de choix expiré : B reçoit sa première proposition, la partie démarre", c3.phase === "partie" && P(c3, "B").choix === P(c, "B").propositions[0]);
}

// ===================================================================================
t.section("Salon (lobby)");
{
  let s = E.createGame({ players: [{ id: "H" }], lobby: true, seed: "lob" });
  s = ok(s, "J", { type: "rejoindre" });
  t.check("un joueur rejoint le salon", s.players.length === 2 && s.phase === "lobby");
  t.check("seul l'hôte lance la partie", err(s, "J", { type: "lancer" }) === "PAS_HOTE");
  const bad = E.createGame({ players: [{ id: "H" }, { id: "J" }], lobby: true, mode: "classique" });
  t.check("mode classique demandé à 2 joueurs : refusé", err(bad, "H", { type: "lancer" }) === "MODE_INCOMPATIBLE");
  s = ok(s, "H", { type: "lancer" }, 0);
  t.check("lancement : phase contributions, mode duel", s.phase === "contributions" && s.mode === "duel");
  s = ok(s, "H", { type: "contribuer", cartes: [{ instanceId: "h1", cardId: "billy-1", branch: "chance" }] });
  t.check("contribution enregistrée, l'autre joueur attendu", s.phase === "contributions" && P(s, "H").soumis && !P(s, "J").soumis);
  const s2 = E.tick(s, s.deadline).state;
  t.check("délai des contributions : la branche manquante est complétée par des prêts", s2.phase === "choix" && s2.reserve.filter((c) => c.apportePar === "J" && c.pret).length === 8);
}

// ===================================================================================
t.section("Distance, portée, armes (7 joueurs)");
{
  const roles = { p0: "gardien", p1: "briseur", p2: "briseur", p3: "briseur", p4: "sentinelle", p5: "sentinelle", p6: "errant" };
  const seats = ["p0", "p1", "p2", "p3", "p4", "p5", "p6"];
  let s = setup(7, { seed: "sept", branches: Object.fromEntries(seats.map((id) => [id, "assaut"])), roles, seats });
  arrange(s, { p0: { main: ["frappe", "frappe", "lance", "oeil"], arme: null, equip: [] }, p3: { main: [], equip: [] }, p4: { main: [], equip: [] } });
  forceTurn(s, "p0");
  t.check("distances naturelles autour de 7 joueurs : 1,2,3,3,2,1", deepEq(seats.slice(1).map((id) => E.distance(s, "p0", id)), [1, 2, 3, 3, 2, 1]));
  const targets = (st) => E.legalActions(st, "p0").filter((a) => a.type === "jouer" && defOf(a.carte) === "frappe").map((a) => a.cible).sort();
  t.check("dague (portée 1) : seuls les voisins sont à portée", deepEq(targets(s), ["p1", "p6"]));
  t.check("Frappe sur une cible à distance 3 : refusée (hors de portée)", err(s, "p0", { type: "jouer", carte: card(s, "p0", "frappe"), cible: "p3" }) === "HORS_PORTEE");
  s = ok(s, "p0", { type: "jouer", carte: card(s, "p0", "lance") });
  t.check("Lance de chasse (portée 2) : distance 2 atteinte, distance 3 toujours hors de portée", deepEq(targets(s), ["p1", "p2", "p5", "p6"]));
  const capeP2 = JSON.parse(JSON.stringify(s)); arrange(capeP2, { p2: { equip: ["cape"] } });
  t.check("Cape d'ombre sur p2 : p0 le voit à 3, il sort de portée", E.distancePercue(capeP2, "p0", "p2") === 3 && !targets(capeP2).includes("p2"));
  s = ok(s, "p0", { type: "jouer", carte: card(s, "p0", "oeil") });
  t.check("Œil du hibou : distance perçue −1, p3 et p4 à portée de la lance", targets(s).includes("p3") && targets(s).includes("p4") && E.distance(s, "p0", "p3") === 3);
  t.check("la portée de l'arme ne change pas la distance (distance naturelle p0→p3 toujours 3)", E.distance(s, "p0", "p3") === 3 && E.porteeArme(s, P(s, "p0")) === 2);
  // Précision
  const sp = setup(7, { seed: "sept", branches: { ...Object.fromEntries(seats.map((id) => [id, "assaut"])), p0: "precision" }, roles, seats });
  t.check("Précision : distance perçue −1 (p2 à 1, p3 à 2), minimum 1", E.distancePercue(sp, "p0", "p2") === 1 && E.distancePercue(sp, "p0", "p3") === 2 && E.distancePercue(sp, "p0", "p1") === 1);
  // Élimination modifiant la distance + arme après élimination
  let e = setup(7, { seed: "sept", branches: Object.fromEntries(seats.map((id) => [id, "assaut"])), roles, seats });
  arrange(e, { p0: { main: ["frappe"], arme: "lance", equip: [] }, p1: { arme: "baton" }, p4: { main: [], equip: [] } });
  forceTurn(e, "p0");
  t.check("avant élimination : p4 à distance 3, hors de portée de la lance", E.distance(e, "p0", "p4") === 3 && !targets(e).includes("p4"));
  e = ok(e, "p1", { type: "abandon" });
  t.check("p1 éliminé : son arme part à la défausse, il ne compte plus dans les distances", !P(e, "p1").vivant && P(e, "p1").arme === null && E.distance(e, "p0", "p2") === 1 && E.distance(e, "p0", "p1") === Infinity);
  t.check("après 1 élimination : p4 toujours à 3 (6 joueurs)", E.distance(e, "p0", "p4") === 3);
  e = ok(e, "p2", { type: "abandon" });
  t.check("après 2 éliminations : p4 passe à 2, il entre dans la portée de la lance", E.distance(e, "p0", "p4") === 2 && targets(e).includes("p4"));
  t.check("la partie continue (il reste un Briseur et l'Errant) et la main reste à p0", e.phase === "partie" && e.prompt.pid === "p0");
  t.check("Frappe à distance 2 avec la lance après élimination : acceptée", !E.act(e, "p0", { type: "jouer", carte: card(e, "p0", "frappe"), cible: "p4" }).error);
}

// ===================================================================================
t.section("Branches : Assaut, Survie, Défense, Résistance, Chance, Stratège, Voleur");
{
  // Assaut : plusieurs attaques
  const duel = (b0, b1, seed = "d") => { const s = setup(2, { seed, branches: { p0: b0, p1: b1 }, seats: ["p0", "p1"] }); return s; };
  let s = duel("assaut", "assaut");
  arrange(s, { p0: { main: ["frappe", "frappe", "frappe"], arme: null, equip: [] }, p1: { main: [], equip: [], arme: null } });
  forceTurn(s, "p0");
  s = ok(s, "p0", { type: "jouer", carte: card(s, "p0", "frappe"), cible: "p1" });
  t.check("Frappe : p1 doit réagir (parer, riposter ou encaisser)", s.prompt.kind === "reaction" && s.prompt.pid === "p1");
  s = ok(s, "p1", { type: "encaisser" });
  s = ok(s, "p0", { type: "jouer", carte: card(s, "p0", "frappe"), cible: "p1" });
  s = ok(s, "p1", { type: "encaisser" });
  t.check("Assaut : deux Frappes dans le même tour, p1 perd 2 PV", P(s, "p1").pv === 4);
  t.check("Assaut : la troisième Frappe est refusée", err(s, "p0", { type: "jouer", carte: card(s, "p0", "frappe"), cible: "p1" }) === "LIMITE_FRAPPES");
  let n = duel("defense", "assaut");
  arrange(n, { p0: { main: ["frappe", "frappe"], arme: null, equip: [] }, p1: { main: [], equip: [] } });
  forceTurn(n, "p0");
  n = ok(ok(n, "p0", { type: "jouer", carte: card(n, "p0", "frappe"), cible: "p1" }), "p1", { type: "encaisser" });
  t.check("hors Assaut : une seule Frappe par tour", err(n, "p0", { type: "jouer", carte: card(n, "p0", "frappe"), cible: "p1" }) === "LIMITE_FRAPPES");
  let l = duel("defense", "assaut");
  arrange(l, { p0: { main: ["frappe", "frappe", "frappe"], arme: "lames", equip: [] }, p1: { main: [], equip: [] } });
  forceTurn(l, "p0");
  for (let i = 0; i < 3; i++) l = ok(ok(l, "p0", { type: "jouer", carte: card(l, "p0", "frappe"), cible: "p1" }), "p1", { type: "encaisser" });
  t.check("Lames jumelles : trois Frappes dans le tour", P(l, "p1").pv === 3);
  let lg = duel("assaut", "assaut");
  arrange(lg, { p0: { main: ["frappe", "frappe", "frappe", "frappe"], arme: "arc", equip: [] }, p1: { main: [], equip: [] } });
  forceTurn(lg, "p0");
  for (let i = 0; i < 3; i++) lg = ok(ok(lg, "p0", { type: "jouer", carte: card(lg, "p0", "frappe"), cible: "p1" }), "p1", { type: "encaisser" });
  t.check("petite table : arme longue (portée 4) + Assaut = 3 Frappes, la 4e refusée", P(lg, "p1").pv === 3 && err(lg, "p0", { type: "jouer", carte: card(lg, "p0", "frappe"), cible: "p1" }) === "LIMITE_FRAPPES");

  // Survie
  let sv = duel("survie", "assaut");
  arrange(sv, { p0: { main: ["frappe", "parade", "onde"], pv: 3 }, p1: { main: [] } });
  forceTurn(sv, "p0");
  const [c1, c2] = P(sv, "p0").main;
  sv = ok(sv, "p0", { type: "survie", cartes: [c1, c2] });
  t.check("Survie : défausser 2 cartes pendant son tour rend 1 PV", P(sv, "p0").pv === 4 && P(sv, "p0").main.length === 1);
  let sf = duel("survie", "assaut"); arrange(sf, { p0: { main: ["frappe", "parade"] } }); forceTurn(sf, "p0");
  t.check("Survie à PV pleins : refusée", err(sf, "p0", { type: "survie", cartes: P(sf, "p0").main }) === "SURVIE_IMPOSSIBLE");
  let sr = duel("assaut", "survie");
  arrange(sr, { p0: { main: ["frappe"] }, p1: { main: ["onde", "festin"], pv: 1, equip: [] } });
  forceTurn(sr, "p0");
  sr = ok(ok(sr, "p0", { type: "jouer", carte: card(sr, "p0", "frappe"), cible: "p1" }), "p1", { type: "encaisser" });
  t.check("Survie à 0 PV : la fenêtre de sauvetage s'ouvre", sr.prompt && sr.prompt.kind === "sauvetage" && sr.prompt.pid === "p1" && P(sr, "p1").pv === 0);
  sr = ok(sr, "p1", { type: "survie", cartes: [...P(sr, "p1").main] });
  t.check("Survie sauve son joueur (0 → 1 PV), la partie continue", P(sr, "p1").vivant && P(sr, "p1").pv === 1 && sr.phase === "partie");

  // Défense
  let df = duel("assaut", "defense");
  arrange(df, { p0: { main: ["frappe"] }, p1: { main: [], equip: [] } });
  forceTurn(df, "p0");
  deckTop(df, [{ signe: "eau" }]);
  let r = E.act(df, "p0", { type: "jouer", carte: card(df, "p0", "frappe"), cible: "p1" });
  t.check("Défense réagit : présage Eau, l'attaque est esquivée sans rien demander à p1", !r.error && types(r.events).includes("esquive") && r.state.prompt.kind === "tour" && P(r.state, "p1").pv === 6);
  deckTop(df, [{ signe: "feu" }]);
  r = E.act(df, "p0", { type: "jouer", carte: card(df, "p0", "frappe"), cible: "p1" });
  t.check("Défense : présage Feu, p1 doit réagir lui-même", r.state.prompt.kind === "reaction" && types(r.events).includes("presage") && !types(r.events).includes("esquive"));
  let pr = setup(2, { seed: "d", branches: { p0: "precision", p1: "defense" }, seats: ["p0", "p1"] });
  arrange(pr, { p0: { main: ["frappe"] }, p1: { main: [], equip: ["voile"] } });
  forceTurn(pr, "p0"); deckTop(pr, [{ signe: "eau" }, { signe: "eau" }]);
  r = E.act(pr, "p0", { type: "jouer", carte: card(pr, "p0", "frappe"), cible: "p1" });
  t.check("petite table : Précision ignore les présages (Voile et Défense), seule une carte arrête la Frappe", r.state.prompt.kind === "reaction" && !types(r.events).includes("presage"));

  // Résistance
  let rs = duel("assaut", "resistance");
  arrange(rs, { p0: { main: ["frappe"] }, p1: { main: [] } });
  forceTurn(rs, "p0");
  rs = ok(ok(rs, "p0", { type: "jouer", carte: card(rs, "p0", "frappe"), cible: "p1" }), "p1", { type: "encaisser" });
  t.check("Résistance : 1 PV perdu = 1 carte piochée", P(rs, "p1").pv === 5 && P(rs, "p1").main.length === 1);

  // Chance : deux cartes au présage, meilleur résultat
  let ch = duel("assaut", "chance");
  arrange(ch, { p0: { main: ["frappe"] }, p1: { main: [], equip: ["voile"] } });
  forceTurn(ch, "p0"); deckTop(ch, [{ signe: "feu" }, { signe: "eau" }]);
  r = E.act(ch, "p0", { type: "jouer", carte: card(ch, "p0", "frappe"), cible: "p1" });
  const ev = r.events.find((e) => e.type === "presage");
  t.check("Chance : le présage retourne 2 cartes et garde la meilleure (Feu puis Eau = esquive)", ev && ev.cartes.length === 2 && ev.favorable && types(r.events).includes("esquive"));

  // Stratège : regarder 3, garder 2, le reste sous la pioche
  let st = duel("stratege", "assaut");
  arrange(st, { p0: { main: [] } });
  st.queue = []; st.prompt = null;
  st.turn = { pid: "p1", n: 1, tour: 1, stage: "actions", frappes: 0, survie: 0, entrave: false, fini: true };
  deckTop(st, [{ def: "frappe" }, { def: "parade" }, { def: "elixir" }]);
  const top3 = st.deck.slice(-3).reverse();
  r = E.act(st, "p1", { type: "presence", enLigne: true }); // déclenche la suite : tour de p0
  st = r.state;
  t.check("Stratège : à sa pioche, il voit 3 cartes (et lui seul)", st.prompt.kind === "stratege" && deepEq(st.prompt.data.cartes.sort(), [...top3].sort()) && !JSON.stringify(E.viewFor(st, "p1")).includes(`"uid":"${top3[0]}"`));
  st = ok(st, "p0", { type: "garder", cartes: [top3[1], top3[2]] });
  t.check("Stratège : garde 2 cartes, la 3e va sous la pioche", deepEq(P(st, "p0").main.sort(), [top3[1], top3[2]].sort()) && st.deck[0] === top3[0] && st.prompt.kind === "tour");

  // Voleur : vol au lieu de la première pioche
  let vo = duel("voleur", "assaut");
  arrange(vo, { p0: { main: [] }, p1: { main: ["parade"] } });
  vo.queue = []; vo.prompt = null;
  vo.turn = { pid: "p1", n: 1, tour: 1, stage: "actions", frappes: 0, survie: 0, entrave: false, fini: true };
  vo = E.act(vo, "p1", { type: "presence", enLigne: true }).state;
  t.check("Voleur : on lui propose de voler au lieu de piocher", vo.prompt.kind === "voleur");
  const stolen = P(vo, "p1").main[0];
  r = E.act(vo, "p0", { type: "piocher", cible: "p1" });
  t.check("Voleur : il prend la carte de p1 et pioche 1 carte", P(r.state, "p0").main.length === 2 && P(r.state, "p0").main.includes(stolen) && P(r.state, "p1").main.length === 0);
  const evVol = r.events.find((e) => e.type === "vol");
  t.check("la carte volée n'est visible que du voleur et du volé", evVol && deepEq(evVol.vis, ["p0", "p1"]) && E.eventsFor(r.events, null).every((e) => e.type !== "vol"));
}

// ===================================================================================
t.section("Cartes d'action : refus et effets");
{
  const roles = { p0: "gardien", p1: "briseur", p2: "errant", p3: "briseur" };
  let s = setup(4, { seed: "c4", branches: { p0: "assaut", p1: "assaut", p2: "assaut", p3: "assaut" }, roles, seats: ["p0", "p1", "p2", "p3"] });
  arrange(s, { p1: { main: ["parade", "sceau", "elixir", "frappe", "orbe"], equip: [] }, p0: { main: [] } });
  forceTurn(s, "p1");
  t.check("Parade pendant son propre tour : refusée (réaction seulement)", err(s, "p1", { type: "jouer", carte: card(s, "p1", "parade") }) === "REACTION_SEULEMENT");
  t.check("Sceau d'entrave sur le Gardien : refusé", err(s, "p1", { type: "jouer", carte: card(s, "p1", "sceau"), cible: "p0" }) === "CIBLE_INVALIDE");
  t.check("Élixir à PV pleins : refusé", err(s, "p1", { type: "jouer", carte: card(s, "p1", "elixir") }) === "PV_MAX");
  t.check("finir sans défausser l'excédent : refusé", (() => { const x = JSON.parse(JSON.stringify(s)); P(x, "p1").pv = 2; return err(x, "p1", { type: "finir", defausse: [] }) === "DEFAUSSE_INVALIDE"; })());
  t.check("limite de main = PV actuels (5 cartes, 2 PV : 3 à défausser)", (() => { const x = JSON.parse(JSON.stringify(s)); P(x, "p1").pv = 2; return E.legalActions(x, "p1").find((a) => a.type === "finir").aDefausser === 3; })());
  t.check("jouer quand ce n'est pas son tour : refusé", err(s, "p2", { type: "jouer", carte: "a0" }) === "PAS_TON_TOUR");
  // Sceau d'entrave
  let e = ok(s, "p1", { type: "jouer", carte: card(s, "p1", "sceau"), cible: "p2" });
  e = ok(e, "p1", { type: "finir", defausse: [] });
  // tour de p2 : présage pour le sceau
  t.check("Sceau posé, p2 commence son tour avec un présage", e.turn.pid === "p2");
  let e2 = JSON.parse(JSON.stringify(s));
  arrange(e2, { p2: { main: [], equip: [] } });
  e2.players.find((p) => p.id === "p2").equip.push(card(e2, "p1", "sceau")); P(e2, "p1").main.splice(P(e2, "p1").main.indexOf(card(e2, "p1", "sceau")), 1);
  deckTop(e2, [{ signe: "vent" }]);
  e2.turn.fini = true; e2.prompt = null;
  e2 = E.act(e2, "p1", { type: "presence", enLigne: true }).state;
  t.check("Sceau d'entrave (présage Vent) : p2 pioche mais ne peut que finir son tour", e2.turn.pid === "p2" && e2.turn.entrave && E.legalActions(e2, "p2").filter((a) => a.type === "jouer").length === 0 && P(e2, "p2").main.length === 2);
  // Orbe instable
  let o = JSON.parse(JSON.stringify(s));
  o.players.find((p) => p.id === "p2").equip.push(card(o, "p1", "orbe")); P(o, "p1").main.splice(P(o, "p1").main.indexOf(card(o, "p1", "orbe")), 1);
  deckTop(o, [{ signe: "terre", rangMax: 4 }]);
  o.turn.fini = true; o.prompt = null;
  o = E.act(o, "p1", { type: "presence", enLigne: true }).state;
  t.check("Orbe instable (Terre 1 à 4) : elle explose, 3 PV perdus", P(o, "p2").pv === 1 && !P(o, "p2").equip.length);
  let o2 = JSON.parse(JSON.stringify(s));
  o2.players.find((p) => p.id === "p2").equip.push(card(o2, "p1", "orbe")); P(o2, "p1").main.splice(P(o2, "p1").main.indexOf(card(o2, "p1", "orbe")), 1);
  deckTop(o2, [{ signe: "feu" }]);
  o2.turn.fini = true; o2.prompt = null;
  o2 = E.act(o2, "p1", { type: "presence", enLigne: true }).state;
  t.check("Orbe instable (autre signe) : elle passe au joueur suivant", P(o2, "p2").pv === 4 && P(o2, "p3").equip.some((u) => defOf(u) === "orbe"));
  // Élixir de sauvetage interdit à 2 joueurs en vie
  let d = setup(2, { seed: "el", branches: { p0: "assaut", p1: "assaut" }, seats: ["p0", "p1"] });
  arrange(d, { p0: { main: ["frappe"] }, p1: { main: ["elixir"], pv: 1, equip: [] } });
  forceTurn(d, "p0");
  d = ok(ok(d, "p0", { type: "jouer", carte: card(d, "p0", "frappe"), cible: "p1" }), "p1", { type: "encaisser" });
  t.check("duel : l'Élixir ne sauve pas à 0 PV (2 joueurs en vie), p1 est éliminé", d.phase === "fin" && d.result.gagnants[0] === "p0");
  // Récompense en trio
  let tr = setup(3, { seed: "tr", branches: { p0: "assaut", p1: "assaut", p2: "assaut" }, seats: ["p0", "p1", "p2"] });
  arrange(tr, { p0: { main: ["frappe"] }, p1: { main: [], pv: 1, equip: [] } });
  forceTurn(tr, "p0");
  tr = ok(ok(tr, "p0", { type: "jouer", carte: card(tr, "p0", "frappe"), cible: "p1" }), "p1", { type: "encaisser" });
  t.check("trio : éliminer un joueur fait piocher 2 cartes", !P(tr, "p1").vivant && P(tr, "p0").main.length === 2);
  // Pénalité du Gardien
  let g = setup(5, { seed: "g5", branches: { p0: "assaut", p1: "assaut", p2: "assaut", p3: "assaut", p4: "assaut" }, roles: { p0: "gardien", p1: "sentinelle", p2: "briseur", p3: "briseur", p4: "errant" }, seats: ["p0", "p1", "p2", "p3", "p4"] });
  arrange(g, { p0: { main: ["frappe", "parade", "elixir"], arme: "lance" }, p1: { main: [], pv: 1, equip: [] } });
  forceTurn(g, "p0");
  g = ok(ok(g, "p0", { type: "jouer", carte: card(g, "p0", "frappe"), cible: "p1" }), "p1", { type: "encaisser" });
  t.check("le Gardien qui élimine sa Sentinelle perd sa main et son équipement", !P(g, "p1").vivant && P(g, "p0").main.length === 0 && P(g, "p0").arme === null);
  // Défi
  let df = setup(2, { seed: "defi", branches: { p0: "assaut", p1: "assaut" }, seats: ["p0", "p1"] });
  arrange(df, { p0: { main: ["defi", "frappe"] }, p1: { main: ["frappe"] } });
  forceTurn(df, "p0");
  df = ok(df, "p0", { type: "jouer", carte: card(df, "p0", "defi"), cible: "p1" });
  t.check("Défi : la cible répond la première", df.prompt.kind === "defi" && df.prompt.pid === "p1");
  df = ok(df, "p1", { type: "defausser", carte: card(df, "p1", "frappe") });
  df = ok(df, "p0", { type: "defausser", carte: card(df, "p0", "frappe") });
  df = ok(df, "p1", { type: "encaisser" });
  t.check("Défi : on alterne, le premier qui ne défausse pas perd 1 PV", P(df, "p1").pv === 5 && P(df, "p0").pv === 6 && df.prompt.kind === "tour");
  // Riposte
  let rp = setup(2, { seed: "rip", branches: { p0: "assaut", p1: "assaut" }, seats: ["p0", "p1"] });
  arrange(rp, { p0: { main: ["frappe"] }, p1: { main: ["riposte"], equip: [] } });
  forceTurn(rp, "p0");
  rp = ok(ok(rp, "p0", { type: "jouer", carte: card(rp, "p0", "frappe"), cible: "p1" }), "p1", { type: "riposter", carte: card(rp, "p1", "riposte") });
  t.check("Riposte runique : l'attaque est annulée et renvoyée, l'attaquant doit réagir", rp.prompt.kind === "reaction" && rp.prompt.pid === "p0" && P(rp, "p1").pv === 6);
  // Étal du marché
  let et = setup(3, { seed: "etal", branches: { p0: "assaut", p1: "assaut", p2: "assaut" }, seats: ["p0", "p1", "p2"] });
  arrange(et, { p0: { main: ["etal"] }, p1: { main: [] }, p2: { main: [] } });
  forceTurn(et, "p0");
  et = ok(et, "p0", { type: "jouer", carte: card(et, "p0", "etal") });
  t.check("Étal du marché : 3 cartes retournées, p0 choisit le premier", et.etal.length === 3 && et.prompt.kind === "etal" && et.prompt.pid === "p0");
  et = ok(et, "p0", { type: "prendre", carte: et.etal[1] });
  et = ok(et, "p1", { type: "prendre", carte: et.etal[0] });
  t.check("… puis chacun dans l'ordre, le dernier reçoit la carte restante", et.etal.length === 0 && [P(et, "p0"), P(et, "p1"), P(et, "p2")].every((p) => p.main.length === 1) && conserved(et));
  // Kanji de garde
  let kg = setup(2, { seed: "kanji", branches: { p0: "assaut", p1: "assaut" }, seats: ["p0", "p1"] });
  arrange(kg, { p0: { main: ["frappe"] }, p1: { main: [], equip: ["kanji"] } });
  forceTurn(kg, "p0");
  kg = ok(ok(kg, "p0", { type: "jouer", carte: card(kg, "p0", "frappe"), cible: "p1" }), "p1", { type: "encaisser" });
  t.check("Kanji de garde : la perte de PV est absorbée, le kanji est défaussé", P(kg, "p1").pv === 6 && P(kg, "p1").equip.length === 0);
  // Lien vital
  let lv = setup(5, { seed: "g5", branches: { p0: "assaut", p1: "assaut", p2: "assaut", p3: "assaut", p4: "assaut" }, roles: { p0: "gardien", p1: "sentinelle", p2: "briseur", p3: "briseur", p4: "errant" }, seats: ["p0", "p1", "p2", "p3", "p4"] });
  arrange(lv, { p1: { main: ["lien"] }, p0: { pv: 3 } });
  forceTurn(lv, "p1");
  lv = ok(lv, "p1", { type: "jouer", carte: card(lv, "p1", "lien"), cible: "p0" });
  t.check("Lien vital : la Sentinelle donne 1 PV au Gardien", P(lv, "p1").pv === 3 && P(lv, "p0").pv === 4);
  t.check("conservation des 82 cartes après tous ces effets", [s, e, e2, o, o2, d, tr, g, df, rp, et, kg, lv].every(conserved));
}

// ===================================================================================
t.section("Délais, déconnexion, double soumission");
{
  // Déconnexion pendant une réaction
  let s = setup(2, { seed: "dc", branches: { p0: "assaut", p1: "assaut" }, seats: ["p0", "p1"] });
  arrange(s, { p0: { main: ["frappe", "frappe"] }, p1: { main: ["parade"], equip: [] } });
  forceTurn(s, "p0", 1000);
  s = ok(s, "p0", { type: "jouer", carte: card(s, "p0", "frappe"), cible: "p1" }, 1000);
  const dl = s.prompt.deadline;
  s = ok(s, "p1", { type: "presence", enLigne: false }, 2000);
  t.check("déconnexion pendant une réaction : délai raccourci au délai de grâce", s.prompt.deadline === 2000 + s.config.delais.graceDeconnexion && s.prompt.deadline < dl);
  const before = E.tick(s, 2000 + s.config.delais.graceDeconnexion - 1);
  t.check("avant l'expiration : rien ne bouge", before.events.length === 0 && before.state === s);
  let r = E.tick(s, 2000 + s.config.delais.graceDeconnexion);
  t.check("expiration : la Parade est jouée automatiquement pour le joueur absent", types(r.events).includes("delai_expire") && types(r.events).includes("pare") && P(r.state, "p1").pv === 6 && r.state.prompt.pid === "p0");
  // sans Parade : il encaisse
  let s2 = setup(2, { seed: "dc", branches: { p0: "assaut", p1: "assaut" }, seats: ["p0", "p1"] });
  arrange(s2, { p0: { main: ["frappe"] }, p1: { main: [], equip: [] } });
  forceTurn(s2, "p0");
  s2 = ok(s2, "p0", { type: "jouer", carte: card(s2, "p0", "frappe"), cible: "p1" });
  r = E.tick(s2, s2.prompt.deadline);
  t.check("expiration sans Parade : le joueur encaisse", P(r.state, "p1").pv === 5);
  const rc = ok(r.state, "p1", { type: "presence", enLigne: true }, s2.prompt.deadline + 10);
  t.check("reconnexion : le joueur retrouve sa main et l'état à jour", P(rc, "p1").enLigne && E.viewFor(rc, "p1").main.length === P(rc, "p1").main.length);
  // une réponse arrivée trop tard est refusée
  t.check("réponse après expiration : refusée (le délai a déjà joué pour lui)", E.act(s2, "p1", { type: "encaisser" }, s2.prompt.deadline + 5).error.code === "PAS_TON_TOUR");

  // Délai de tour et abandon automatique après 3 absences
  let a = setup(2, { seed: "afk", branches: { p0: "assaut", p1: "assaut" }, seats: ["p0", "p1"] });
  forceTurn(a, "p0", 0);
  let now = 0, guard = 0;
  while (a.phase === "partie" && guard++ < 50) { now = a.prompt.deadline; a = E.tick(a, now).state; }
  t.check("joueurs absents : les délais font avancer la partie jusqu'à l'abandon automatique", a.phase === "fin" && a.players.some((p) => p.abandon), a.result && a.result.raison);
  t.check("anti-farm : l'abandon et les absences rendent la partie non récompensée", Object.values(a.result.recompenses).every((x) => !x.eligible));

  // Double soumission
  let d = setup(2, { seed: "dbl", branches: { p0: "assaut", p1: "assaut" }, seats: ["p0", "p1"] });
  arrange(d, { p0: { main: ["elixir", "frappe"], pv: 4 }, p1: { main: [] } });
  forceTurn(d, "p0");
  const act1 = { type: "jouer", carte: card(d, "p0", "elixir"), nonce: "n-1" };
  const d1 = ok(d, "p0", act1);
  t.check("double soumission (même nonce) : la seconde est refusée", E.act(d1, "p0", act1).error.code === "DOUBLON" && P(d1, "p0").pv === 5);
  t.check("action basée sur un état périmé (rev) : refusée", E.act(d1, "p0", { type: "jouer", carte: card(d1, "p0", "frappe"), cible: "p1", rev: d.rev }).error.code === "PERIME");
  t.check("réponse à une demande périmée (promptId) : refusée", E.act(d1, "p0", { type: "finir", defausse: [], promptId: d.prompt.id }).error.code === "PERIME");
  t.check("action mal formée : refusée proprement", E.act(d1, "p0", null).error.code === "ACTION_INVALIDE" && E.act(d1, "zz", { type: "jouer" }).error.code === "JOUEUR_INCONNU");
  const snap = JSON.stringify(d);
  ok(d, "p0", { type: "jouer", carte: card(d, "p0", "frappe"), cible: "p1" });
  E.tick(d, d.prompt.deadline);
  t.check("l'état d'origine n'est jamais modifié par act ni par tick", JSON.stringify(d) === snap);
}

// ===================================================================================
t.section("Fin de partie au milieu d'une chaîne d'effets");
{
  const roles = { p0: "briseur", p1: "gardien", p2: "briseur", p3: "errant" };
  let s = setup(4, { seed: "chaine", branches: { p0: "assaut", p1: "assaut", p2: "assaut", p3: "assaut" }, roles, seats: ["p0", "p1", "p2", "p3"] });
  arrange(s, { p0: { main: ["pluie"] }, p1: { main: [], pv: 1, equip: [] }, p2: { main: ["parade"], equip: [] }, p3: { main: ["parade"], equip: [] } });
  forceTurn(s, "p0");
  s = ok(s, "p0", { type: "jouer", carte: card(s, "p0", "pluie") });
  t.check("Pluie de shurikens : trois attaques en file, le Gardien répond le premier", s.prompt.pid === "p1" && s.queue.length === 2);
  const r = E.act(s, "p1", { type: "encaisser" });
  t.check("le Gardien tombe : partie finie immédiatement, victoire des Briseurs", r.state.phase === "fin" && r.state.result.camp === "briseurs" && deepEq(r.state.result.gagnants.sort(), ["p0", "p2"]));
  t.check("la chaîne s'arrête : 2 effets interrompus, plus aucune attente ni tâche", r.state.result.interrompues === 2 && r.state.prompt === null && r.state.queue.length === 0);
  t.check("plus aucune action acceptée après la fin", E.act(r.state, "p2", { type: "parer", carte: card(r.state, "p2", "parade") }).error.code === "FINIE");
  t.check("tous les rôles sont révélés à la fin", E.viewFor(r.state, null).joueurs.every((p) => p.role));
  // Duel : l'Onde de choc finit la partie au premier joueur touché
  let o = setup(3, { seed: "onde", branches: { p0: "assaut", p1: "assaut", p2: "assaut" }, seats: ["p0", "p1", "p2"] });
  arrange(o, { p0: { main: ["onde"] }, p1: { main: [], pv: 1, equip: [] }, p2: { main: [], pv: 1, equip: [] } });
  forceTurn(o, "p0");
  o = ok(ok(o, "p0", { type: "jouer", carte: card(o, "p0", "onde") }), "p1", { type: "encaisser" });
  t.check("trio : la première victime de l'Onde est éliminée, l'Onde continue sur le suivant", !P(o, "p1").vivant && o.prompt.pid === "p2");
  o = ok(o, "p2", { type: "encaisser" });
  t.check("… le second tombe aussi : p0 gagne, file vide", o.phase === "fin" && deepEq(o.result.gagnants, ["p0"]) && o.queue.length === 0);
  // Errant seul survivant
  let er = setup(4, { seed: "err", branches: { p0: "assaut", p1: "assaut", p2: "assaut", p3: "assaut" }, roles: { p0: "errant", p1: "gardien", p2: "briseur", p3: "briseur" }, seats: ["p0", "p1", "p2", "p3"] });
  er = ok(ok(er, "p2", { type: "abandon" }), "p3", { type: "abandon" });
  arrange(er, { p0: { main: ["frappe"] }, p1: { main: [], pv: 1, equip: [] } });
  forceTurn(er, "p0");
  er = ok(ok(er, "p0", { type: "jouer", carte: card(er, "p0", "frappe"), cible: "p1" }), "p1", { type: "encaisser" });
  t.check("classique : l'Errant qui élimine le Gardien en dernier gagne seul", er.phase === "fin" && er.result.camp === "errant" && deepEq(er.result.gagnants, ["p0"]));
}

// ===================================================================================
t.section("Informations secrètes, reconnexion, spectateur");
{
  const players = Array.from({ length: 7 }, (_, i) => ({ id: "p" + i, contribution: [] }));
  let s = E.createGame({ players, seed: "secret" });
  s = playGame(s, { optsFor: () => ({ rng: botRng("sec") }), maxSteps: 120 }).state;
  t.check("partie à 7 en cours après 120 actions", s.phase === "partie");
  let leaks = [];
  for (const me of s.players) {
    const v = E.viewFor(s, me.id), { journal, ...rest } = v, js = JSON.stringify(rest);
    for (const q of s.players) {
      if (q.id === me.id) continue;
      const vq = v.joueurs.find((x) => x.id === q.id);
      if (q.vivant && q.role !== "gardien" && vq.role !== null) leaks.push(`${me.id} voit le rôle de ${q.id}`);
      if (vq.main) leaks.push(`${me.id} voit la main de ${q.id}`);
      // (le journal peut citer une carte devenue publique : Étal, Larcin d'une carte posée…)
      for (const u of q.main) if (js.includes(`"uid":"${u}"`)) leaks.push(`${me.id} voit la carte ${u} de ${q.id}`);
    }
    if (js.includes('"rng"') || js.includes('"deck"') || js.includes('"limbe"') || js.includes('"seed"')) leaks.push("état du hasard ou pioche visibles");
    for (const u of s.deck) if (js.includes(`"uid":"${u}"`)) leaks.push(`${me.id} voit une carte de la pioche`);
    if (typeof v.pioche !== "number") leaks.push("ordre de la pioche visible");
    if (v.journal.some((e) => e.vis)) leaks.push("visibilité interne envoyée");
    const hidden = s.log.filter((e) => e.vis !== "all" && !e.vis.includes(me.id)).map((e) => e.seq);
    if (v.journal.some((e) => hidden.includes(e.seq))) leaks.push(`${me.id} reçoit un événement privé d'un autre`);
  }
  t.check("aucune fuite pour les 7 joueurs (rôles cachés, mains, pioche, hasard, journal privé)", !leaks.length, leaks.slice(0, 5));
  const spec = E.viewFor(s, null), { journal: sjour, ...srest } = spec, sj = JSON.stringify(srest);
  t.check("spectateur : ni main, ni rôle caché, ni action possible, aucun événement privé", !spec.main && spec.joueurs.every((p) => p.role === null || p.role === "gardien" || !s.players.find((q) => q.id === p.id).vivant) && !spec.actions && s.players.every((p) => p.main.every((u) => !sj.includes(`"uid":"${u}"`))) && sjour.every((e) => !["pioche", "vol", "role", "propositions", "choix_prive"].includes(e.type)));
  // reconnexion : on reconstruit tout depuis l'état, sans rien de plus
  const me = s.players.find((p) => p.role !== "gardien");
  const off = ok(s, me.id, { type: "presence", enLigne: false }, 5000);
  const back = ok(off, me.id, { type: "presence", enLigne: true }, 9000);
  const vb = E.viewFor(back, me.id);
  t.check("reconnexion : le joueur retrouve son rôle, sa main, ses actions, sans rien d'autre", vb.monRole === me.role && vb.main.length === me.main.length && Array.isArray(vb.actions) && vb.joueurs.filter((p) => p.id !== me.id && p.vivant && p.role && p.role !== "gardien").length === 0);
  const after = E.eventsFor(back.log.slice(-2), "p_inconnu");
  t.check("les événements de présence sont publics et ne contiennent rien de secret", after.every((e) => ["deconnexion", "reconnexion"].includes(e.type)));
}

// ===================================================================================
t.section("Premier joueur, collusion à trois, robustesse sur parties complètes");
{
  let firsts = { p0: 0, p1: 0 };
  for (let i = 0; i < 400; i++) { const s = E.createGame({ players: [{ id: "p0", contribution: [] }, { id: "p1", contribution: [] }], seed: "f" + i }); const g = playGame(s, { optsFor: () => ({ choix: "premier" }), maxSteps: 2 }).state; firsts[g.premier]++; }
  t.check("duel : premier joueur tiré au hasard (≈ 50 % chacun sur 400 parties)", firsts.p0 > 160 && firsts.p1 > 160, firsts);
  let gard = true;
  for (let i = 0; i < 50; i++) { const s = E.createGame({ players: Array.from({ length: 4 + (i % 4) }, (_, k) => ({ id: "p" + k, contribution: [] })), seed: "g" + i }); const g = playGame(s, { maxSteps: s.players.length }).state; if (g.premier !== g.players.find((p) => p.role === "gardien").id) gard = false; }
  t.check("classique : le Gardien commence toujours", gard);

  // Trois joueurs, deux attaquent systématiquement le troisième (collusion)
  let firstOut = 0, victimWins = 0, games = 200;
  for (let i = 0; i < games; i++) {
    const s = E.createGame({ players: ["p0", "p1", "p2"].map((id) => ({ id, contribution: [] })), seed: "col" + i });
    const rng = botRng("col" + i);
    const end = playGame(s, { optsFor: (pid) => (pid === "p2" ? { rng } : { rng, focus: "p2", partners: ["p0", "p1"] }) }).state;
    if (end.players.find((p) => p.ordreElim === 1).id === "p2") firstOut++;
    if (end.result.gagnants.includes("p2")) victimWins++;
  }
  t.check(`trio, deux joueurs contre le troisième : la victime sort la première dans ${Math.round(100 * firstOut / games)} % des parties`, firstOut / games > 0.6);
  t.note(`trio en collusion : la victime gagne ${Math.round(100 * victimWins / games)} % des parties (33 % sans collusion), voir EQUILIBRAGE.md`);

  // Parties complètes : conservation, PV, limites de main, rejouabilité, pas de boucle
  let bad = [], total = 0, capped = 0;
  for (let n = 2; n <= 7; n++) for (let i = 0; i < 25; i++) {
    const players = Array.from({ length: n }, (_, k) => ({ id: "p" + k, contribution: k % 2 ? [] : [{ instanceId: `i${n}-${i}-${k}`, cardId: "c" + k, branch: BRANCH_IDS[(i + k) % 8] }] }));
    const seed = `rob${n}-${i}`;
    const s0 = E.createGame({ players, seed });
    const rng = botRng(seed);
    const end = playGame(s0, {
      optsFor: () => ({ rng }),
      onStep: (s, pid, a) => {
        if (!conserved(s)) bad.push(`${seed} : cartes perdues ou dupliquées`);
        if (s.players.some((p) => p.pv > p.pvMax)) bad.push(`${seed} : PV au-dessus du max`);
        if (a.type === "finir" && P(s, pid).vivant && P(s, pid).main.length > E.limiteMain(s, P(s, pid))) bad.push(`${seed} : main au-dessus de la limite`);
      },
    }).state;
    total++;
    if (end.phase !== "fin") bad.push(`${seed} : pas finie`);
    if (end.result && end.result.raison === "limite_de_tours") capped++;
    if (i < 3) {
      const rng2 = botRng(seed);
      const again = playGame(E.createGame({ players, seed }), { optsFor: () => ({ rng: rng2 }) }).state;
      if (JSON.stringify(again) !== JSON.stringify(end)) bad.push(`${seed} : rejouer la même graine donne un autre résultat`);
    }
  }
  t.check(`${total} parties complètes (2 à 7 joueurs) : cartes conservées, PV et mains dans les limites, rejouables`, !bad.length, bad.slice(0, 5));
  t.check("aucune partie bloquée jusqu'à la limite de tours (boucle infinie)", capped === 0, { capped });
  t.check(`la pioche contient bien ${TOTAL_CARTES} cartes d'action`, TOTAL_CARTES === 82);
}

t.done();
