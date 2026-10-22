// Confrontation · raconte une partie entre bots, tour par tour, en français (vue de l'arbitre).
// Lancer : node tests/confront-recit.mjs [--joueurs 4] [--graine recit] [--court 20]
//   --court N : cherche la première graine dont la partie dure au plus N tours (pour un exemple lisible)
import * as E from "../worker/confront/engine.mjs";
import { playGame, botRng } from "../worker/confront/bots.mjs";
import { CARD_DEFS } from "../worker/confront/cards.mjs";
import { BRANCHES } from "../worker/confront/branches.mjs";

const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const n = +arg("joueurs", 4), court = arg("court") ? +arg("court") : null;
const NOMS = ["Kaï", "Irsy", "Mahed", "Kuradai", "Sakuto", "Nestor", "Byakko"];
const BR = ["stratege", "chance", "resistance", "precision", "assaut", "survie", "defense"];

function jouer(seed) {
  const players = Array.from({ length: n }, (_, k) => ({ id: NOMS[k], contribution: [{ instanceId: `${seed}-${k}`, cardId: NOMS[k].toLowerCase() + "-1", branch: BR[k] }] }));
  let s = E.createGame({ players, seed });
  const rng = botRng(seed);
  const evs = [];
  s = playGame(s, { optsFor: () => ({ rng, choix: "premier" }), onStep: (st, pid, a, e) => evs.push(...e) }).state;
  return { s, evs };
}

let seed = arg("graine", "recit"), r = jouer(seed);
if (court) for (let i = 0; i < 2000 && r.s.result.tours > court; i++) { seed = `recit-${n}-${i}`; r = jouer(seed); }
const { s, evs } = r;
const c = (x) => (x ? `${CARD_DEFS[x.def].nom} (${x.signe} ${x.rang})` : "?");
const roleNom = { gardien: "Gardien", sentinelle: "Sentinelle", briseur: "Briseur", errant: "Errant" };
console.log(`Graine « ${seed} », ${n} joueurs, mode ${s.mode}.`);
for (const e of evs) {
  switch (e.type) {
    case "debut": console.log(`Table : ${e.joueurs.map((j) => `${j.id} (${BRANCHES[j.branch].nom}${j.pret ? ", prêt" : ""}, ${j.pvMax} PV${j.gardien ? ", Gardien" : ""})`).join(" · ")}. Premier joueur : ${e.premier}.`); break;
    case "role": console.log(`  [secret] ${e.pid} est ${roleNom[e.role]}.`); break;
    case "tour": console.log(`\nTour ${e.n} (tour de table ${e.tour}) : ${e.pid}`); break;
    case "pioche": if (e.cause !== "depart") console.log(`  ${e.pid} pioche ${e.cartes.map(c).join(", ")}${e.cause && e.cause !== "pioche" ? ` [${e.cause}]` : ""}.`); break;
    case "joue": console.log(`  ${e.pid} joue ${c(e.carte)}${e.cible ? ` sur ${e.cible}` : ""}${e.defaussee ? `, défausse ${c(e.defaussee)}` : ""}${e.prise ? `, prend ${c(e.prise)}` : ""}.`); break;
    case "presage": console.log(`  présage de ${e.pid} (${e.quoi}) : ${e.cartes.map(c).join(" / ")} → ${e.favorable ? "favorable" : "défavorable"}.`); break;
    case "esquive": console.log(`  ${e.pid} esquive (${e.par}).`); break;
    case "pare": console.log(`  ${e.pid} pare avec une Parade.`); break;
    case "riposte": console.log(`  ${e.pid} riposte contre ${e.cible}.`); break;
    case "reprise": console.log(`  ${e.pid} reprend sa Frappe en main (Précision).`); break;
    case "degats": console.log(`  ${e.pid} perd ${e.n} PV (${e.cause}) → ${e.pv} PV.`); break;
    case "sauvetage": console.log(`  ${e.pid} se sauve avec un Élixir → ${e.pv} PV.`); break;
    case "survie": console.log(`  ${e.pid} défausse ${e.cartes.length} cartes (Ténacité) → ${e.pv} PV.`); break;
    case "vol": console.log(`  [privé] ${e.pid} vole ${c(e.carte)} à ${e.cible}.`); break;
    case "vol_public": console.log(`  ${e.pid} vole une carte de la main de ${e.cible}.`); break;
    case "etal": console.log(`  Étal : ${e.cartes.map(c).join(", ")}.`); break;
    case "etal_pris": console.log(`  ${e.pid} prend ${c(e.carte)} sur l'étal.`); break;
    case "defi_relance": console.log(`  ${e.pid} défausse une Frappe (Défi).`); break;
    case "defi_perdu": console.log(`  ${e.pid} cède le Défi.`); break;
    case "onde_evitee": console.log(`  ${e.pid} défausse une Frappe contre l'Onde.`); break;
    case "entrave": console.log(`  ${e.pid} reste entravé : il ne jouera aucune carte ce tour-ci.`); break;
    case "entrave_brisee": console.log(`  ${e.pid} brise le Sceau d'entrave.`); break;
    case "orbe_passe": console.log(`  L'Orbe instable passe de ${e.de} à ${e.a}.`); break;
    case "orbe_explose": console.log(`  L'Orbe instable explose sur ${e.pid} !`); break;
    case "kanji_absorbe": console.log(`  Le Kanji de garde de ${e.pid} absorbe le coup.`); break;
    case "elimination": console.log(`  ✖ ${e.pid} est éliminé${e.par ? ` par ${e.par}` : ""}${e.role ? ` : c'était ${roleNom[e.role]}` : ""}.`); break;
    case "penalite_gardien": console.log(`  Le Gardien a éliminé sa Sentinelle : il perd ses ${e.n} cartes.`); break;
    case "defausse_fin": console.log(`  ${e.pid} défausse ${e.cartes.map(c).join(", ")} (limite de main).`); break;
    case "effondrement": console.log(`  Effondrement du sceau : ${e.pid} perd 1 PV.`); break;
    case "fin": console.log(`\nFin : ${e.raison}, gagnants ${e.gagnants.join(", ")}${e.interrompues ? ` (${e.interrompues} effets interrompus)` : ""}.`); break;
  }
}
