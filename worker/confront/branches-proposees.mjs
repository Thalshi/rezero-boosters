// Confrontation · répartition PROVISOIRE des personnages existants dans les 8 branches.
//
//   >>> À VALIDER PAR BILLY. <<<
//
// Le moteur n'utilise PAS ce fichier : la branche d'une carte est une donnée fournie à
// createGame (chaque carte apportée indique sa branche). Ce tableau sert seulement de point
// de départ pour que le serveur sache quelle branche donner à une carte de collection.
// Toutes les cartes d'un même personnage (même `who`, toutes raretés et variantes) ont la même
// branche. La rareté ne change rien en combat.
//
// Proposé d'après le pouvoir et le caractère décrits dans PEOPLE (src/game.js), sans rien en
// recopier. Fichier côté serveur uniquement : il ne doit jamais être envoyé au navigateur
// (il cite des persos pas encore débloqués).

export const BRANCHES_PROPOSEES = {
  // Assaut : brutes, explosifs, frappes en série
  rorkantarak: "assaut", explosion: "assaut", ogre1: "assaut", ogre2: "assaut", ogre3: "assaut", ogre4: "assaut", seb: "assaut", nelson: "assaut",
  // Défense : ombre, agilité, téléportation, esquive
  braxx: "defense", sylvar: "defense", rayzo: "defense", monoco2: "defense", elfe1: "defense", ecureuil2: "defense", felin: "defense",
  // Stratège : ceux qui anticipent et analysent
  kai: "stratege", sultran: "stratege", carukan: "stratege", irsy: "stratege", monoco: "stratege", reichi: "stratege", aramis: "stratege",
  // Voleur : ruse, commerce douteux, embuscades
  ed: "voleur", siflar: "voleur", gobelin: "voleur", morden: "voleur", sasori: "voleur", elfe2: "voleur",
  // Précision : tireurs, duellistes, lances, regard perçant
  valcer: "precision", elijah: "precision", byakko: "precision", sakuto: "precision", soldat1: "precision", oiseau: "precision", kuradai: "precision", stalk: "precision",
  // Résistance : ceux qu'on ne fait pas tomber
  unbeaten: "resistance", goldor: "resistance", castorgeant: "resistance", mahed: "resistance", soldat2: "resistance", belier: "resistance", porcepic: "resistance",
  // Survie : bricoleurs, cuisiniers, débrouillards
  nestor: "survie", archibald: "survie", sanglier: "survie", castor1: "survie", castor2: "survie", ecureuil: "survie", mojo: "survie", iouaf: "survie",
  // Chance : créateur, mystères, joueurs et coups du sort
  billy: "chance", inconnu: "chance", ragna: "chance", lion: "chance", shiro: "chance", teo: "chance", dispawn: "chance", cerf: "chance",
};

/** Branche proposée pour une carte de collection { who } (ou null si le perso n'est pas listé). */
export const brancheProposee = (who) => BRANCHES_PROPOSEES[who] || null;
