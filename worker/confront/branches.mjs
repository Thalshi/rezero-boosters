// Confrontation · les 8 branches de combat.
// La branche ne dépend ni de la rareté ni du booster : une Mythique et une Commune de la même
// branche ont exactement le même pouvoir. Le pouvoir est appliqué par le moteur (engine.mjs) ;
// les chiffres sont dans config.mjs.

export const BRANCHES = {
  assaut: {
    nom: "Assaut", kanji: "猛",
    pouvoir: "Fureur : tu peux jouer 2 Frappes par tour au lieu d'une, et chaque fois qu'une de tes Frappes fait perdre des PV, pioche 1 carte.",
    moment: "ton tour",
  },
  defense: {
    nom: "Défense", kanji: "守",
    pouvoir: "Garde : quand une Frappe ou une Pluie de shurikens te vise, présage ; sur Eau, l'attaque est esquivée (à 2 ou 3 joueurs : sur Eau ou Vent). Cumulable avec le Voile de brume (deux présages).",
    moment: "hors de ton tour, automatique",
  },
  stratege: {
    nom: "Stratège", kanji: "策",
    pouvoir: "Clairvoyance : à ta pioche, regarde les 3 cartes du dessus, garde-en 2 et glisse la dernière sous la pioche.",
    moment: "début de ton tour",
  },
  voleur: {
    nom: "Voleur", kanji: "盗",
    pouvoir: "Main leste : à ta pioche, tu peux remplacer ta première carte par une carte prise au hasard dans la main d'un autre joueur (à 2 ou 3 joueurs : seulement s'il a au moins 3 cartes en main).",
    moment: "début de ton tour",
  },
  precision: {
    nom: "Précision", kanji: "狙",
    pouvoir: "Œil sûr : tu vois les autres joueurs à 1 de distance de moins (minimum 1). Quand une de tes Frappes est parée, présage : sur Feu ou Vent, reprends cette Frappe en main. À 2 ou 3 joueurs : tes Frappes ne peuvent pas être esquivées par un présage (Voile de brume, Défense) ; seule une carte les arrête.",
    moment: "permanent",
  },
  resistance: {
    nom: "Résistance", kanji: "耐",
    pouvoir: "Endurance : chaque fois que tu perds 1 PV, pioche 1 carte (au plus 1 carte par tour de jeu).",
    moment: "hors de ton tour, automatique",
  },
  survie: {
    nom: "Survie", kanji: "生",
    pouvoir: "Ténacité : pendant ton tour, ou quand tu tombes à 0 PV, défausse 2 cartes pour gagner 1 PV.",
    moment: "ton tour ou sauvetage",
  },
  chance: {
    nom: "Chance", kanji: "運",
    pouvoir: "Bonne étoile : à chacun de tes présages, retourne 2 cartes et garde le meilleur résultat.",
    moment: "à chaque présage",
  },
};

export const BRANCH_IDS = Object.keys(BRANCHES);

/**
 * Carte de prêt d'une branche : complète la contribution d'un joueur qui n'a pas de carte de cette
 * branche (ou qui ne veut pas l'apporter). Elle n'appartient à personne, ne se vend pas, n'entre
 * jamais dans une collection et n'existe que pendant la partie.
 */
export const LOAN_PREFIX = "pret-";
export const loanCardId = (branch) => LOAN_PREFIX + branch;
export const LOANS = Object.fromEntries(BRANCH_IDS.map((b) => [b, { cardId: loanCardId(b), nom: `Écho ${BRANCHES[b].nom.toLowerCase().startsWith("a") || BRANCHES[b].nom.toLowerCase().startsWith("é") ? "d'" : "de "}${BRANCHES[b].nom}`, branch: b }]));
