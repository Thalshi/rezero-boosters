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

/** Répartition des rôles en mode classique (le Gardien est toujours visible). */
export const ROLES_PAR_TABLE = {
  4: { gardien: 1, sentinelle: 0, briseur: 2, errant: 1 },
  5: { gardien: 1, sentinelle: 1, briseur: 2, errant: 1 },
  6: { gardien: 1, sentinelle: 1, briseur: 3, errant: 1 },
  7: { gardien: 1, sentinelle: 2, briseur: 3, errant: 1 },
};

export const DEFAULT_CONFIG = {
  // Points de vie de départ par mode, plus le bonus du Gardien (provisoire : 6 / 5 / 4, +1)
  pv: { duel: 6, trio: 5, classique: 4 },
  bonusGardien: 1,
  // Limite de main en fin de tour = PV actuels, bornée par [min, max] (max null = pas de plafond)
  limiteMain: { min: 0, max: null },
  // Main de départ : "pv" (autant que les PV max) ou un nombre
  mainDepart: "pv",
  // Cartes piochées au début du tour
  pioche: 2,
  // Frappes autorisées par tour (de base, et pour la branche Assaut)
  frappesParTour: 1,
  frappesAssaut: 2,
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
  // Voleur : distance maximale de la cible pour le vol de pioche (null = n'importe qui)
  porteeVoleur: null,
  // Survie : cartes à défausser pour 1 PV, nombre d'utilisations par tour (null = illimité)
  survie: { cout: 2, parTour: null },
  // Résistance : cartes piochées par PV perdu
  resistance: { parPv: 1 },
  // Stratège : cartes regardées / gardées
  stratege: { regarde: 3, garde: 2 },
  // Règles des petites tables (2 et 3 joueurs, où la distance naturelle vaut toujours 1)
  petiteTable: {
    // Précision : ses Frappes ne peuvent pas être esquivées par présage (Voile de brume, Défense)
    precisionSansPresage: true,
    // Armes de portée 3 ou plus : une Frappe de plus par tour
    armeLongueFrappeBonus: true,
  },
  // Anti-blocage : à partir de ce tour de table, le joueur actif perd 1 PV au début de son tour
  effondrement: { duel: 30, trio: 30, classique: 30, degats: 1 },
  // Fin forcée (match nul) après ce nombre de tours joués, filet de sécurité contre les boucles
  toursMax: 1000,
  // Délais en millisecondes (le serveur appelle tick(state, now))
  delais: {
    contributions: 120000,
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
  // l'avantage du premier joueur), par mode : 0 = aucune
  bonusDernierJoueur: { duel: 0, trio: 0, classique: 0 },
  // Événements gardés dans l'état pour la reconnexion (le journal complet est archivé par le serveur)
  journalMax: 40,
  // Anti-farm (calculé par le moteur, appliqué par le serveur)
  antiFarm: { toursMin: 6, absencesMax: 1 },
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
