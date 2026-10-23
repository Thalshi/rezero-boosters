// Confrontation · valeurs réglables par mode.
// TOUTES les valeurs chiffrées de ce fichier sont PROVISOIRES (à valider par Reichi et Billy,
// voir docs/confrontation/EQUILIBRAGE.md). Le moteur ne contient aucune de ces valeurs en dur :
// on les change ici (ou on passe `config` à createGame) sans toucher au code.

/** Les trois familles de parties et le nombre de joueurs qu'elles acceptent. */
export const MODES = {
  duel: { joueurs: [2], roles: false, nom: "Duel" },
  trio: { joueurs: [3], roles: false, nom: "Trio (chacun pour soi)" },
  classique: { joueurs: [4, 5, 6, 7], roles: true, nom: "Classique (rôles secrets)" },
};

/** Mode correspondant à un nombre de joueurs. */
export const modeFor = (n) => (n === 2 ? "duel" : n === 3 ? "trio" : n >= 4 && n <= 7 ? "classique" : null);

/** Répartition des rôles en mode classique (le Gardien est toujours visible).
 * Deux camps seulement, sans Errant (corrigé, voir EQUILIBRAGE.md : l'Errant ne gagnait que 8 à 23 %
 * des parties, surtout par hasard). Chaque table est réglée pour que chaque camp gagne environ une
 * partie sur deux : la victoire dépend des décisions, pas du rôle tiré. Avant : ROLES_AVEC_ERRANT. */
export const ROLES_PAR_TABLE = {
  4: { gardien: 1, sentinelle: 1, briseur: 2 },
  5: { gardien: 1, sentinelle: 2, briseur: 2 },
  6: { gardien: 1, sentinelle: 2, briseur: 3 },
  7: { gardien: 1, sentinelle: 3, briseur: 3 },
};
export const ROLES_AVEC_ERRANT = {
  4: { gardien: 1, sentinelle: 0, briseur: 2, errant: 1 },
  5: { gardien: 1, sentinelle: 1, briseur: 2, errant: 1 },
  6: { gardien: 1, sentinelle: 1, briseur: 3, errant: 1 },
  7: { gardien: 1, sentinelle: 2, briseur: 3, errant: 1 },
};

// « corrigé » = correction limitée appliquée après mesure (docs/confrontation/EQUILIBRAGE.md) ;
// la valeur d'avant est indiquée pour pouvoir revenir en arrière sans toucher au code.
export const DEFAULT_CONFIG = {
  // Points de vie de départ par mode (provisoire : 6 / 5 / 4)
  pv: { duel: 6, trio: 5, classique: 4 },
  // Répartition des rôles par taille de table (null = ROLES_PAR_TABLE)
  roles: null,
  // PV en plus pour le Gardien, par taille de table (corrigé deux fois : +1 partout, puis +2/+0/+2/+1
  // avec l'Errant ; sans Errant : seul le 6 joueurs en a besoin).
  // Un nombre (même bonus partout) ou un objet { 4: …, 5: …, 6: …, 7: … }.
  bonusGardien: { 4: 0, 5: 0, 6: 2, 7: 0 },
  // PV en plus pour un autre rôle : { role: { taille: n } } (aucun pour l'instant)
  bonusPvRole: {},
  // Réglage fin des camps : cartes en plus dans la main de départ { role: { taille: n } } (mesuré :
  // chaque camp gagne 49 à 51 % des parties simulées à 4, 5, 6 et 7 joueurs)
  bonusMainRole: { gardien: { 4: 2, 7: 3 }, sentinelle: { 4: 1 }, briseur: { 5: 2 } },
  // PV en plus pour l'Errant, par taille de table (corrigé, avant : aucun)
  bonusErrant: { 4: 0, 5: 0, 6: 1, 7: 1 },
  // Limite de main en fin de tour = PV actuels, bornée par [min, max] (max null = pas de plafond)
  limiteMain: { min: 0, max: null },
  // Main de départ : "pv" (autant que les PV max) ou un nombre
  mainDepart: "pv",
  // Cartes piochées au début du tour
  pioche: 2,
  // Frappes autorisées par tour (de base)
  frappesParTour: 1,
  // Assaut : Frappes par tour, cartes piochées quand une de ses Frappes fait perdre des PV
  // (corrigé, avant : piocheSiTouche 0)
  assaut: { frappes: 2, piocheSiTouche: 1 },
  // Cartes retirées de la pioche selon le mode (inutiles à cette table) : en Duel, Lien vital et Festin du QG
  // ne soignent que l'adversaire ou les deux joueurs à égalité
  retraitsParMode: { duel: ["lien", "festin"] },
  // Équipements posés devant soi au plus (l'arme à part ; Sceau et Orbe non comptés) : poser le suivant défausse le plus ancien
  equipMax: 2,
  // Présages (tests). Un présage retourne la carte du dessus : on regarde son signe et son rang.
  presage: {
    voile: ["eau"],          // Voile de brume : esquive si le signe est Eau (1 chance sur 4)
    defense: ["eau"],        // branche Défense : esquive si le signe est Eau (1 chance sur 4)
    entrave: ["feu"],        // Sceau d'entrave : libéré si le signe est Feu (1 sur 4)
    orbe: { signe: "terre", rangMax: 4, degats: 3 }, // Orbe instable : explose sur Terre 1 à 4 (environ 1 sur 10)
  },
  // Élixir de vie : sauvetage (jouer en tombant à 0 PV) seulement s'il reste au moins N joueurs en vie
  elixirSauvetageMin: 3,
  // Récompense quand on élimine quelqu'un (cartes piochées), par mode.
  // Classique : seulement pour l'élimination d'un Briseur (inspiré du livret).
  recompenseElimination: { duel: 0, trio: 2, classique: 3 },
  // Le Gardien qui élimine une Sentinelle perd sa main et son équipement (inspiré du livret)
  penaliteGardien: true,
  // Larcin : distance maximale (la distance perçue, pas la portée d'arme)
  porteeLarcin: 1,
  // Voleur : distance maximale de la cible du vol de pioche (null = n'importe qui) ;
  // à 2 et 3 joueurs, la cible doit avoir au moins N cartes en main (corrigé, avant : pas de minimum) ;
  // variante écartée : seulement un joueur plus riche que lui ("strict" ou true)
  voleur: { portee: null, petiteTableMainMin: 3, petiteTablePlusRiche: false },
  // Survie : cartes à défausser pour 1 PV, nombre d'utilisations par tour (null = illimité)
  survie: { cout: 2, parTour: null },
  // Résistance : cartes piochées par PV perdu, au plus N par tour de jeu (corrigé, avant : null)
  resistance: { parPv: 1, maxParTour: 1 },
  // Précision : signes du présage qui rend une Frappe parée à son auteur (corrigé, avant : []) ;
  // variante écartée : PV perdus en plus par une cible sans carte en main (degatsMainVide)
  precision: { repriseSiParee: ["feu", "vent"], degatsMainVide: 0 },
  // Stratège : cartes regardées / gardées
  stratege: { regarde: 3, garde: 2 },
  // Règles des petites tables (2 et 3 joueurs, où la distance naturelle vaut toujours 1)
  petiteTable: {
    // Précision : ses Frappes ne peuvent pas être esquivées par présage (Voile de brume, Défense)
    precisionSansPresage: true,
    // Armes de portée 3 ou plus : une Frappe de plus par tour
    armeLongueFrappeBonus: true,
    // Défense : signes d'esquive à 2 et 3 joueurs (corrigé, avant : Eau seul comme aux grandes tables)
    defense: ["eau", "vent"],
    // Variantes mesurées puis écartées (trop fortes), laissées à 0 :
    precisionPiocheSiParee: 0, // Précision pioche quand sa Frappe est parée
    survieCoutPremier: 0,      // première Ténacité du tour à 1 carte
    surviePvMax: 0,            // Survie +1 PV max
  },
  // Anti-blocage : à partir de ce tour de table, le joueur actif perd 1 PV au début de son tour
  effondrement: { duel: 30, trio: 30, classique: 30, degats: 1 },
  // Fin forcée (match nul) après ce nombre de tours joués, filet de sécurité contre les boucles
  toursMax: 1000,
  // Choix du perso parmi SES PROPRES cartes apportées (sinon : 2 persos tirés dans la réserve commune)
  persoLibre: true,
  // Délais en millisecondes (le serveur appelle tick(state, now))
  delais: {
    contributions: 180000,
    choix: 45000,
    tour: 90000,
    reaction: 20000,
    choixCarte: 25000,       // Stratège, Voleur, Étal du marché
    graceDeconnexion: 8000,  // délai raccourci pour un joueur déconnecté qui doit répondre
  },
  // À l'expiration d'une réaction, défendre automatiquement si possible (Parade, Élixir, Survie)
  defenseAutoSurDelai: true,
  // Tours entiers sans action (délai expiré) avant abandon automatique
  absencesMax: 3,
  // Cartes de plus dans la main de départ du DERNIER joueur du premier tour (compensation de
  // l'avantage du premier joueur), par mode (corrigé pour le duel, avant : 0)
  bonusDernierJoueur: { duel: 1, trio: 0, classique: 0 },
  // Événements gardés dans l'état pour la reconnexion (le journal complet est archivé par le serveur)
  journalMax: 40,
  // Anti-farm (calculé par le moteur, appliqué par le serveur)
  antiFarm: { toursMin: 6, absencesMax: 1 },
};

/** Configuration d'origine (avant les corrections mesurées), pour comparer dans les simulations. */
export const CONFIG_AVANT_CORRECTIONS = {
  roles: ROLES_AVEC_ERRANT,
  bonusMainRole: {},
  bonusGardien: 1,
  bonusErrant: { 4: 0, 5: 0, 6: 0, 7: 0 },
  assaut: { piocheSiTouche: 0 },
  voleur: { petiteTableMainMin: 0 },
  resistance: { maxParTour: null },
  precision: { repriseSiParee: [] },
  petiteTable: { defense: null },
  bonusDernierJoueur: { duel: 0 },
};

/** Fusion profonde des réglages (les objets sont fusionnés, le reste est remplacé). */
export function mergeConfig(base, over) {
  if (!over) return structuredClone(base);
  const out = structuredClone(base);
  for (const [k, v] of Object.entries(over)) {
    if (v && typeof v === "object" && !Array.isArray(v) && out[k] && typeof out[k] === "object" && !Array.isArray(out[k])) out[k] = mergeConfig(out[k], v);
    else out[k] = structuredClone(v);
  }
  return out;
}
