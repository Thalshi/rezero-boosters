// Confrontation · catalogue des cartes d'action (pioche partagée).
// Ces cartes n'ont rien à voir avec les cartes de collection : elles ne s'achètent pas, ne se
// gagnent pas et n'existent que pendant une partie. Noms, textes et règles sont originaux
// (univers Re Zéro). Détail complet : docs/confrontation/CARTES.md.

/** Les quatre signes des présages (chaque carte d'action porte un signe et un rang de 1 à 10). */
export const SIGNES = [
  { id: "feu", kanji: "火", nom: "Feu" },
  { id: "eau", kanji: "水", nom: "Eau" },
  { id: "vent", kanji: "風", nom: "Vent" },
  { id: "terre", kanji: "土", nom: "Terre" },
];

/** Arme de base que tout le monde a sans carte (jamais perdue, jamais volée). */
export const ARME_DE_BASE = { id: "dague", nom: "Dague d'essence", portee: 1 };

// type : "instant" (jouée puis défaussée), "reaction" (jouée hors de son tour, en réponse),
//        "equipement" (posée devant soi, effet persistant), "differe" (posée, agit au début d'un tour)
// cat  : catégorie du cahier des charges (attaque, esquive, soin, vol, defausse, pioche, duel, zone,
//        arme, defense, visee, differe)
export const CARD_DEFS = {
  frappe:      { nom: "Frappe d'essence",   type: "instant",    cat: "attaque",  qte: 22, kanji: "撃", texte: "Attaque un joueur à portée de ton arme. Il perd 1 PV s'il ne pare pas. Une seule Frappe par tour (sauf pouvoir ou arme)." },
  parade:      { nom: "Parade",             type: "reaction",   cat: "esquive",  qte: 11, kanji: "防", texte: "Hors de ton tour : annule une Frappe, une Riposte ou une Pluie de shurikens qui te vise." },
  riposte:     { nom: "Riposte runique",    type: "reaction",   cat: "esquive",  qte: 2,  kanji: "返", texte: "Quand une Frappe ou une Riposte te vise : annule-la et renvoie une attaque à son auteur s'il est à portée de ton arme. Il peut parer." },
  elixir:      { nom: "Élixir de vie",      type: "instant",    cat: "soin",     qte: 6,  kanji: "癒", texte: "À ton tour : +1 PV (jamais au-dessus du maximum). Ou, à n'importe quel moment, quand tu tombes à 0 PV : +1 PV (sauvetage), s'il reste au moins 3 joueurs en vie." },
  festin:      { nom: "Festin du QG",       type: "instant",    cat: "soin",     qte: 1,  kanji: "宴", texte: "Tous les joueurs en vie gagnent 1 PV." },
  lien:        { nom: "Lien vital",         type: "instant",    cat: "soin",     qte: 2,  kanji: "絆", texte: "Tu perds 1 PV (il t'en faut au moins 2) et un autre joueur blessé en gagne 1." },
  larcin:      { nom: "Larcin",             type: "instant",    cat: "vol",      qte: 4,  kanji: "盗", texte: "Prends une carte à un joueur à distance 1 : au hasard dans sa main, ou une carte posée devant lui." },
  dissipation: { nom: "Dissipation",        type: "instant",    cat: "defausse", qte: 4,  kanji: "散", texte: "Défausse une carte d'un joueur, à n'importe quelle distance : au hasard dans sa main, ou une carte posée devant lui." },
  inspiration: { nom: "Inspiration",        type: "instant",    cat: "pioche",   qte: 2,  kanji: "閃", texte: "Pioche 2 cartes." },
  revelation:  { nom: "Révélation",         type: "instant",    cat: "pioche",   qte: 1,  kanji: "啓", texte: "Pioche 3 cartes." },
  etal:        { nom: "Étal du marché",     type: "instant",    cat: "pioche",   qte: 2,  kanji: "市", texte: "Retourne autant de cartes que de joueurs en vie. Chacun en prend une, en commençant par toi puis dans l'ordre du tour." },
  defi:        { nom: "Défi de l'arène",    type: "instant",    cat: "duel",     qte: 3,  kanji: "闘", texte: "Défie un joueur, à n'importe quelle distance. En commençant par lui, chacun défausse une Frappe à tour de rôle ; le premier qui ne peut pas ou ne veut pas perd 1 PV." },
  pluie:       { nom: "Pluie de shurikens", type: "instant",    cat: "zone",     qte: 1,  kanji: "雨", texte: "Attaque tous les autres joueurs, sans tenir compte de la distance. Chacun perd 1 PV s'il ne pare pas. Ne compte pas comme une Frappe." },
  onde:        { nom: "Onde de choc",       type: "instant",    cat: "zone",     qte: 2,  kanji: "震", texte: "Chaque autre joueur défausse une Frappe ou perd 1 PV. La Parade ne sert à rien." },
  lames:       { nom: "Lames jumelles",     type: "equipement", cat: "arme",     qte: 2,  kanji: "双", portee: 1, illimite: true, texte: "Arme, portée 1. Frappes illimitées pendant ton tour." },
  lance:       { nom: "Lance de chasse",    type: "equipement", cat: "arme",     qte: 3,  kanji: "槍", portee: 2, texte: "Arme, portée 2." },
  baton:       { nom: "Bâton runique",      type: "equipement", cat: "arme",     qte: 2,  kanji: "杖", portee: 3, texte: "Arme, portée 3. À 2 ou 3 joueurs : une Frappe de plus par tour." },
  arc:         { nom: "Arc des tempêtes",   type: "equipement", cat: "arme",     qte: 1,  kanji: "弓", portee: 4, texte: "Arme, portée 4. À 2 ou 3 joueurs : une Frappe de plus par tour." },
  canon:       { nom: "Canon à main",       type: "equipement", cat: "arme",     qte: 1,  kanji: "砲", portee: 5, texte: "Arme, portée 5. À 2 ou 3 joueurs : une Frappe de plus par tour." },
  voile:       { nom: "Voile de brume",     type: "equipement", cat: "defense",  qte: 2,  kanji: "霧", texte: "Quand une Frappe ou une Pluie te vise : présage, sur Eau l'attaque est esquivée." },
  cape:        { nom: "Cape d'ombre",       type: "equipement", cat: "defense",  qte: 2,  kanji: "影", texte: "Les autres joueurs te voient à 1 de distance de plus." },
  oeil:        { nom: "Œil du hibou",       type: "equipement", cat: "visee",    qte: 1,  kanji: "梟", texte: "Tu vois les autres joueurs à 1 de distance de moins (minimum 1)." },
  kanji:       { nom: "Kanji de garde",     type: "equipement", cat: "defense",  qte: 1,  kanji: "護", texte: "La prochaine fois que tu dois perdre des PV, tu n'en perds aucun ; puis défausse ce kanji." },
  sceau:       { nom: "Sceau d'entrave",    type: "differe",    cat: "differe",  qte: 3,  kanji: "封", texte: "Pose-le devant un autre joueur (jamais le Gardien). Au début de son tour : présage, sur Feu il se libère ; sinon il pioche mais ne joue aucune carte ce tour-ci. Le sceau est ensuite défaussé." },
  orbe:        { nom: "Orbe instable",      type: "differe",    cat: "differe",  qte: 1,  kanji: "爆", texte: "Pose-la devant toi. Au début du tour de celui qui l'a : présage, sur Terre de rang 1 à 4 elle explose (3 PV perdus) ; sinon elle passe au joueur suivant." },
};

export const ARMES = Object.keys(CARD_DEFS).filter((k) => CARD_DEFS[k].cat === "arme");
export const TOTAL_CARTES = Object.values(CARD_DEFS).reduce((a, d) => a + d.qte, 0);

/**
 * Pioche complète, dans un ordre fixe : chaque carte reçoit un identifiant unique (a0, a1…),
 * un signe et un rang. Les signes tournent carte par carte et les rangs tous les 4, si bien que
 * chaque signe représente environ un quart de la pioche.
 */
export function buildDeck() {
  const out = [];
  let i = 0;
  for (const [def, d] of Object.entries(CARD_DEFS)) {
    for (let k = 0; k < d.qte; k++, i++) out.push({ uid: "a" + i, def, signe: SIGNES[i % 4].id, rang: (Math.floor(i / 4) % 10) + 1 });
  }
  return out;
}
