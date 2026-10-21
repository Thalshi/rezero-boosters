// Généré par build.py à partir de src/game.js : ne pas modifier ici.
// Données et règles du jeu, communes au navigateur et au serveur Cloudflare.
// Le serveur (worker/) importe ce fichier tel quel : pas de DOM ici.

// ===== Les persos (tableau Miro) =====
const FACTIONS = {
  anta: { label: "Antagonistes · Saison 1", color: "#ff4d5e" },
  enn:  { label: "Ennemis",                 color: "#ff8a3d" },
  neu:  { label: "Neutres",                 color: "#d6bd85" },
  all:  { label: "Alliés",                  color: "#4fd18b" },
  irl:  { label: "QG de Shinjuku",          color: "#5ab0ff" },
};
// rar : c Commune · pc Peu commune · r Rare · e Épique · l Légendaire · m Mythique
const PEOPLE = {
  kai:     { name: "Kaï", fac: "anta", rar: "m", kanji: "混", color: "#d42a3a", icon: "shuriken", tag: "Shurikens géants",
             power: "Shurikens géants rouges et lames, entre contrôle et chaos", look: "Cheveux blanc argenté, bandeau rouge, armure noire et rouge pleine de pointes, cape en lambeaux", mood: "Stratège, solitaire, discipliné, mystérieux, passé trouble", quote: "Le contrôle n’est pas l’absence de chaos, mais sa direction." },
  irsy:    { name: "Irsy", fac: "anta", rar: "l", kanji: "知", color: "#16b8a8", icon: "book", tag: "Magie turquoise",
             power: "Magie de sorts (énergie turquoise), grimoire, dague rituelle et dague magique", look: "Cheveux blancs courts, lunettes, long manteau noir doublé de rouge", mood: "Sévère, froide, méprisante, elle analyse et manipule", quote: "Le savoir n’éclaire que ceux qui acceptent de voir l’ombre." },
  rorkantarak: { name: "Rorkantarak", fac: "anta", rar: "e", kanji: "進", color: "#a3202e", icon: "blades", tag: "Évolution",
             power: "Il évolue : bras-lames, queue à crochet, lance", look: "Humanoïde gris pâle très musclé, crête, barbe, marques et lames cramoisies", mood: "Violence, discipline, évolution, toujours plus loin", quote: "Chaque blessure est une promesse." },
  braxx:   { name: "Braxx", fac: "anta", rar: "l", kanji: "影", color: "#7a2d8f", icon: "mask", tag: "Ombre",
             power: "Ombre : il se fond dans le décor et disparaît, lames d’ombre courbes, bombe fumigène", look: "Capuche pourpre, masque à bec aux yeux rouges, cape d’où sortent des volutes d’ombre", mood: "Mystérieux, calculateur, agile, manipulateur, il frappe avant d’être vu", quote: "Les masques tombent toujours. Pas les miens." },
  dispawn: { name: "Dispawn", fac: "enn", rar: "e", kanji: "劇", color: "#b8323c", icon: "tophat", tag: "Maître de l’arène",
             power: "Canne de combat à tête de serpent, maître de l’arène", look: "Colosse à la peau grise, sourire plein de crocs, haut-de-forme, manteau noir et rouge, boucle dorée", mood: "Imposant, théâtral, charismatique, impitoyable, un gentleman… à sa manière", quote: "Le spectacle est une religion." },
  unbeaten:{ name: "The Unbeaten", fac: "enn", rar: "l", kanji: "不", color: "#8a5a3a", icon: "axe", tag: "Invaincu",
             power: "On ne peut pas le faire tomber. Hache de guerre et lames de ses adversaires vaincus", look: "Guerrier massif en armure abîmée, cape de fourrure, épées plantées dans le dos, œil rouge", mood: "", quote: "Tant que je tiens, je suis encore là." },
  ragna:   { name: "Ragna", fac: "enn", rar: "e", kanji: "嵐", color: "#3f8fe0", icon: "storm", tag: "Tempête et runes",
             power: "Tempête, foudre et runes, lames runiques flottantes", look: "Géant au pelage blanc comme un yéti, runes bleues lumineuses", mood: "", quote: "Je ne combats pas le vent, j’en suis le prolongement." },
  sylvar:  { name: "Sylvar", fac: "enn", rar: "r", kanji: "秘", color: "#8e4fd6", icon: "arcane", tag: "Magie arcanique",
             power: "Magie arcanique violette", look: "Barbu encapuchonné, robes violettes à plumes, tatouages lumineux sur les avant-bras", mood: "Énigmatique, cherche l’équilibre dans l’ombre", quote: "Il reste toujours un autre chemin." },
  explosion: { name: "Explosion King", fac: "enn", rar: "c", kanji: "爆", color: "#f06a1c", icon: "bomb", tag: "Explosifs",
             power: "Explosifs, canon au bras orné d’un crâne, bombes", look: "Petite créature ronde, cheveux en pics orange, lunettes vertes, tenue rouge blindée", mood: "", quote: "" },
  valcer:  { name: "Valcer", fac: "enn", rar: "r", kanji: "剣", color: "#6c5a9e", icon: "rapier", tag: "Duelliste",
             power: "Rapière, c’est un duelliste", look: "Cheveux longs gris, yeux pâles, cape sombre et violette, un seul bras", mood: "Précis, calculateur, aristocrate, dangereux, toujours maître de lui", quote: "La perfection n’a pas besoin d’être complète." },
  goldor:  { name: "Goldor", fac: "neu", rar: "e", kanji: "岩", color: "#b8962e", icon: "orb", tag: "Pierre et nature",
             power: "Pierre et nature, un orbe central lui sert de source d’énergie", look: "Golem de pierre géant, armure dorée, un arbre rouge pousse sur lui", mood: "", quote: "Les racines ne plient jamais." },
  carukan: { name: "Carukan", fac: "neu", rar: "r", kanji: "煙", color: "#c04a6e", icon: "claw", tag: "Seigneur",
             power: "Griffe de cérémonie", look: "Bête à cornes, manteau de fourrure, tenue de seigneur rouge et noire, cigare à fumée rose", mood: "Seigneur, stratège, patient, hédoniste, voit les hommes comme des pions", quote: "Le pouvoir se savoure en silence." },
  ed:      { name: "Ed", fac: "neu", rar: "pc", kanji: "金", color: "#a8823a", icon: "watch", tag: "Ruse",
             power: "Sa canne et sa ruse", look: "Petite créature aux grandes oreilles, costume sombre, col de fourrure rouge, chapeau à plume, montre à gousset", mood: "Rusé, ambitieux, charmeur, manipulateur, obsédé par l’argent", quote: "L’argent ne ment jamais." },
  monoco:  { name: "Monoco", fac: "neu", rar: "r", kanji: "梟", color: "#c9a24a", icon: "owl", tag: "Bâton et hibou",
             power: "Bâton et lien avec son hibou", look: "Humanoïde aux longs cheveux blancs, yeux dorés, manteau de fourrure", mood: "Observateur, énigmatique, pacifique mais redoutable, en harmonie avec la nature", quote: "Chaque silence a sa réponse." },
  monoco2: { name: "Monoco", fac: "neu", rar: "pc", kanji: "猿", color: "#c2453a", icon: "owl", tag: "Forme singe",
             power: "Bâton et lien avec son hibou", look: "Singe au visage rouge, manteau de fourrure", mood: "Observateur, énigmatique, pacifique mais redoutable, en harmonie avec la nature", quote: "Chaque silence a sa réponse." },
  siflar:  { name: "Siflar", fac: "neu", rar: "c", kanji: "蛇", color: "#c8553a", icon: "cobra", tag: "Marchand",
             power: "Aucun : c’est un marchand", look: "Homme-cobra aux écailles rouges et beiges, écharpe et robes rouges, bibelots", mood: "Fourbe, charmeur, beau parleur, pas digne de confiance, vend parfois du toc", quote: "Des objets, des histoires, des opportunités." },
  nestor:  { name: "Nestor", fac: "all", rar: "c", kanji: "工", color: "#b07a3c", icon: "goggles", tag: "Bricoleur",
             power: "Aucun : il bricole et invente", look: "Marmotte avec lunettes d’aviateur, écharpe et sacoche", mood: "Curieux, malin, débrouillard, rêveur, un peu filou", quote: "Petit par la taille, grand par les idées." },
  sultran: { name: "Sultran’Zahar", fac: "all", rar: "m", kanji: "無", color: "#5b2a9e", icon: "void", tag: "Néant",
             power: "Manipule le néant, se sert du vide comme d’une arme, lance du vide", look: "Armure violet sombre, casque masqué à visière lumineuse", mood: "Stratège, silencieux, il anticipe, son but est inconnu", quote: "Le vide en mouvement." },
  elijah:  { name: "Elijah", fac: "all", rar: "r", kanji: "狙", color: "#8a5cc8", icon: "gun", tag: "Arme modulaire",
             power: "Arme modulaire : tir simple, modules reliés, tir à distance", look: "Barbe, mèche violette, long manteau blanc, col rouge", mood: "", quote: "Précision avant tout." },
  nelson:  { name: "Nelson", fac: "all", rar: "pc", kanji: "槌", color: "#2f78c9", icon: "hammer", tag: "Marteau modulable",
             power: "Marteau modulable et gantelet de récupération", look: "Grande créature au pelage bleu, barbe blanche, ornements dorés", mood: "Bon vivant, bricoleur, protecteur, grand cœur", quote: "Le bras qui répare le monde." },
  archibald: { name: "Archibald", fac: "all", rar: "c", kanji: "案", color: "#c9a13a", icon: "bulb", tag: "Inventeur",
             power: "Aucun : c’est un inventeur", look: "Jeune homme aux cheveux en pics, lunettes optiques, bretelles, sac rempli de plans", mood: "Inventif, méticuleux, obstiné, un peu trop curieux", quote: "Si ça existe déjà, c’est qu’on peut faire mieux." },
  morden:  { name: "Morden", fac: "all", rar: "pc", kanji: "沼", color: "#4f8a3a", icon: "spear", tag: "Chasseur des marais",
             power: "Une lance, il chasse en embuscade dans les marais", look: "Homme-crocodile aux yeux jaunes, capuche en tissu", mood: "Patient, territorial, silencieux, opportuniste", quote: "L’eau oublie, mais moi je me souviens." },
  billy:   { name: "Billy", fac: "irl", rar: "l", kanji: "創", color: "#3a6fd8", icon: "cross", tag: "Le créateur",
             power: "", look: "Cheveux bouclés foncés, barbe, bras tatoués, t-shirt noir, cargo, rangers, collier avec une croix", mood: "", quote: "" },
  seb:     { name: "Seb", fac: "irl", rar: "c", kanji: "力", color: "#4a7ab8", icon: "mono", tag: "Carrure forte",
             power: "", look: "Carrure forte, cheveux bruns bouclés, t-shirt noir imprimé, cargo", mood: "", quote: "" },
  mojo:    { name: "Mojo", fac: "irl", rar: "pc", kanji: "芸", color: "#3aa3c8", icon: "glasses", tag: "Créatif",
             power: "", look: "Grand, fin mais musclé, lunettes transparentes, t-shirt rayé, jogging, collier", mood: "Calme, créatif, passionné, fidèle", quote: "" },
  byakko:  { name: "Byakko", fac: "irl", rar: "r", kanji: "虎", color: "#2f5fa8", icon: "gun", tag: "Arme au holster",
             power: "Une arme dans un holster", look: "Cheveux bruns en bataille, débardeur noir, cargo camouflage bleu, rangers, médaillon", mood: "", quote: "" },
  kuradai: { name: "Kuradai", fac: "irl", rar: "r", kanji: "狼", color: "#3b4f9e", icon: "moon", tag: "Loup et lune",
             power: "", look: "1 m 60, crâne rasé sur un côté avec des tresses, haori noir à motif de vagues, collier loup et lune", mood: "Calme, déterminée, loyale, observatrice", quote: "Même le calme peut mordre." },
  mahed:   { name: "Mahed", fac: "irl", rar: "pc", kanji: "大", color: "#3a8fb8", icon: "mono", tag: "2,03 m",
             power: "", look: "Environ 2,03 m, costaud, cheveux bouclés, barbe courte, chemise sombre", mood: "Gentil, confiant, sympathique, les pieds sur terre", quote: "Bigger Things Ahead." },
  reichi:  { name: "Reichi", fac: "irl", rar: "c", kanji: "見", color: "#5a7a4a", icon: "mono", tag: "Observateur",
             power: "", look: "Casquette, barbe fournie, parka kaki, sacoche, cargo noir", mood: "", quote: "Les gens parlent trop. Le monde montre assez." },
  sasori:  { name: "Sasori", fac: "irl", rar: "pc", kanji: "蠍", color: "#6a6a8a", icon: "mono", tag: "Chemise ouverte",
             power: "", look: "Cheveux ondulés mi-longs, bouc, chemise blanche ouverte, pantalon noir, chaussures de ville", mood: "", quote: "" },
  stalk:   { name: "Stalk", fac: "irl", rar: "c", kanji: "球", color: "#d8752e", icon: "ball", tag: "Ballon de basket",
             power: "", look: "Grand, coupe afro, débardeur blanc, short, toujours un ballon de basket", mood: "Calme, observateur, concentré, passionné, fidèle", quote: "Basket toujours avec moi." },
  aramis:  { name: "Aramis", fac: "irl", rar: "pc", kanji: "扉", color: "#c8a83a", icon: "crown", tag: "Jeux et musique",
             power: "", look: "23 ans, lunettes, cheveux en bataille, t-shirt noir avec une couronne, aime les jeux et la musique", mood: "Calme, réfléchi, passionné", quote: "Les idées sont des portes." },
  shiro:   { name: "Shiro", fac: "irl", rar: "c", kanji: "白", color: "#8a6a4a", icon: "glasses", tag: "Lunettes et sacoche",
             power: "", look: "Cheveux courts bouclés, lunettes, veste à capuche marron, cargo, sacoche", mood: "", quote: "" },
  iouaf:   { name: "Iouaf", fac: "irl", rar: "c", kanji: "誠", color: "#3a9a6a", icon: "mono", tag: "Authentique",
             power: "", look: "Barbe, yeux verts, chemise à carreaux, jean large, baskets blanches", mood: "Calme, créatif, loyal, authentique", quote: "" },
  sakuto:  { name: "Sakuto", fac: "irl", rar: "e", kanji: "砲", color: "#9a3a2a", icon: "cannon", tag: "Canon à main",
             power: "Canon à main avec trois cartouches : normale, explosive, fumigène", look: "Costaud, cicatrice au visage, long manteau à col haut", mood: "", quote: "Les petites choses font toujours de grands dégâts." },
  rayzo:   { name: "Rayzo", fac: "irl", kanji: "瞬", color: "#5a7ad8", power: "Téléportation", look: "1 m 70, cheveux plaqués en arrière, bouc, t-shirt gris, short, claquettes", mood: "Calme, confiant, réfléchi, loyal, observateur", quote: "Toujours un peu plus loin." },
  teo:     { name: "Téo", fac: "irl", kanji: "眼", color: "#2ab0a0", power: "À compléter", look: "Lunettes", mood: "", quote: "" },
};
// Rayzo et Téo ont 6 versions chacun, avec leur image de la vidéo « BON ANNIV BG »
const VARIANTS = [
  { id: "rayzo-1", who: "rayzo", img: "rayzoS", title: "Au repos",    rar: "c",  pos: "50% 30%", zoom: 1 },
  { id: "teo-1",   who: "teo",   title: "Au marché",          rar: "c",  pos: "50% 40%", zoom: 1, glint: [72, 37] },
  { id: "rayzo-2", who: "rayzo", img: "rayzoH", title: "Toujours un peu plus loin", rar: "pc", pos: "50% 30%", zoom: 1 },
  { id: "teo-2",   who: "teo",   title: "Grand sourire",      rar: "pc", pos: "62% 40%", zoom: 1.5 },
  { id: "rayzo-3", who: "rayzo", title: "Clignement",         rar: "r",  pos: "50% 30%", zoom: 1.1, fx: ["blink"] },
  { id: "teo-3",   who: "teo",   title: "Coup d'œil",         rar: "r",  pos: "70% 34%", zoom: 1.9, glint: [62, 38] },
  { id: "rayzo-4", who: "rayzo", title: "Saut dimensionnel",  rar: "e",  pos: "55% 30%", zoom: 1.2, fx: ["blink"], tint: "#7b3cff" },
  { id: "teo-4",   who: "teo",   title: "Verres teintés",     rar: "e",  pos: "50% 40%", zoom: 1, glint: [72, 37], tint: "#ff9a2e" },
  { id: "rayzo-5", who: "rayzo", title: "Téléportation",      rar: "l",  pos: "50% 30%", zoom: 1.1, fx: ["ghost", "blink"] },
  { id: "teo-5",   who: "teo",   title: "Regard perçant",     rar: "l",  pos: "72% 33%", zoom: 2.4, glint: [50, 45], tint: "#2ec7ff" },
  { id: "rayzo-6", who: "rayzo", title: "Partout à la fois",  rar: "m",  pos: "50% 30%", zoom: 1.1, fx: ["ghost", "blink"], tint: "#ff4d8d" },
  { id: "billy-fa",  who: "billy",  img: "billyFA",  fa: true, title: "Le Créateur",   rar: "m", pos: "50% 30%", zoom: 1 },
  { id: "reichi-fa", who: "reichi", img: "reichiFA", fa: true, title: "Lame écarlate", rar: "m", pos: "50% 20%", zoom: 1 },
  { id: "teo-6",   who: "teo",   title: "Voit tout",          rar: "m",  pos: "62% 40%", zoom: 1.5, glint: [60, 30], tint: "#b26bff" },
];
const CARDS = [
  ...Object.entries(PEOPLE).filter(([, p]) => p.rar).map(([id, p]) => ({ id, who: id, title: p.tag, rar: p.rar })),
  ...VARIANTS,
];
const PACKS = [
  { id: "saison1", name: "Saison 1", sub: "Édition limitée · Légendaire et Mythique ×2", kanji: "季", color: "#e8b84a", fac: null, boost: 2, limited: true },
  { id: "mix",     name: "Mix",      sub: "Tous les persos",         kanji: "混", color: "#c8aa6e", fac: null },
  { id: "vilains", name: "Vilains",  sub: "Antagonistes et ennemis", kanji: "悪", color: "#ff4d5e", fac: ["anta", "enn"] },
  { id: "monde",   name: "Le Monde", sub: "Alliés et neutres",       kanji: "界", color: "#1fb36b", fac: ["all", "neu"] },
  { id: "bande",   name: "QG de Shinjuku", sub: "Les membres du serveur",              kanji: "友", color: "#0ac8b9", fac: ["irl"] },
  { id: "coffre",  name: "Coffre hextech", sub: "Skins des membres du QG",            kanji: "匠", color: "#b04ce0", fac: ["irl"], skins: true },
];
const RAR = {
  c:  { label: "Commune",     color: "var(--r-c)",  rank: 0, chakra: 2 },
  pc: { label: "Peu commune", color: "var(--r-pc)", rank: 1, chakra: 4 },
  r:  { label: "Rare",        color: "var(--r-r)",  rank: 2, chakra: 10 },
  e:  { label: "Épique",      color: "var(--r-e)",  rank: 3, chakra: 30 },
  l:  { label: "Légendaire",  color: "var(--r-l)",  rank: 4, chakra: 80 },
  m:  { label: "Mythique",    color: "var(--r-m)",  rank: 5, chakra: 250 },
};
const RANKS = ["c", "pc", "r", "e", "l", "m"];
const SLOT = { c: 52, pc: 27, r: 14, e: 5, l: 1.6, m: 0.4 };   // cartes 1 à 4
const LAST = { r: 80, e: 15, l: 4, m: 1 };                        // 5e carte : Rare ou mieux
const PACK = 5, FREE_MAX = 10, REGEN = 20 * 60e3, PRICE = 60, GOLD_EVERY = 10, MYTHIC_PITY = 120, GOLD_CHANCE = 0.02;
const STREAK = [{ boosters: 1 }, { chakra: 50 }, { boosters: 1 }, { chakra: 100 }, { boosters: 2 }, { chakra: 150 }, { boosters: 3, chakra: 300 }];
const MISSIONS = [
  { id: "open3",  label: "Ouvre 3 boosters",                     key: "open",    goal: 3, reward: { chakra: 40 } },
  { id: "epic1",  label: "Obtiens une carte Épique ou mieux",     key: "epic",    goal: 1, reward: { chakra: 60 } },
  { id: "new2",   label: "Obtiens 2 nouvelles cartes",            key: "new",     goal: 2, reward: { boosters: 1 } },
  { id: "recyc",  label: "Recycle tes doublons",                  key: "recycle", goal: 1, reward: { chakra: 30 } },
  { id: "sell1",  label: "Mets une carte en vente au marché",     key: "sell",    goal: 1, reward: { chakra: 40 } },
  { id: "open6",  label: "Ouvre 6 boosters",                      key: "open",    goal: 6, reward: { boosters: 1 } },
  { id: "rare3",  label: "Obtiens 3 cartes Rares ou mieux",        key: "rare",    goal: 3, reward: { chakra: 50 } },
  { id: "pred1",  label: "Fais une prédiction sur l'épisode",       key: "predict", goal: 1, reward: { boosters: 1 } },
];
const LIMITED_END = new Date("2026-12-31T23:59:59");
// ===== Épisodes : persos vus dans l'épisode 1 (repérés sur les images). Billy peut tout changer dans l'onglet Admin.
const EP1 = ["billy", "seb", "mojo", "kuradai", "byakko", "stalk", "nestor", "sultran", "shiro", "mahed", "reichi", "sasori", "iouaf", "sakuto", "rayzo", "teo"];
const EP_MAX = 12, HIDDEN = 99;
const DEFAULT_CONFIG = () => ({ ep: Object.fromEntries(Object.keys(PEOPLE).map((k) => [k, EP1.includes(k) ? 1 : 2])), progress: {}, def: 1, extra: {} });

// ===== Skins des persos IRL (gammes façon LoL, une par rareté) =====
const SKIN_LINES = [
  { id: "chroma",   name: "Chroma",       rar: "c",  desc: "Une variante de couleur." },
  { id: "arcade",   name: "Arcade",       rar: "pc", desc: "Pixels, néons et borne d'arcade." },
  { id: "neon",     name: "Néon",         rar: "r",  desc: "Contours lumineux, nuit de ville." },
  { id: "lune",     name: "Lune de sang", rar: "e",  desc: "Sous la lune rouge, pétales et ombres." },
  { id: "astral",   name: "Astral",       rar: "l",  desc: "Poussière d'étoiles et halo cosmique." },
  { id: "prestige", name: "Prestige",     rar: "m",  desc: "Édition dorée, réservée aux plus chanceux." },
];
const SKINNED = Object.keys(PEOPLE).filter((k) => PEOPLE[k].fac === "irl");
const SKINS = SKINNED.flatMap((who) => SKIN_LINES.map((l) => ({ id: `${who}-sk-${l.id}`, who, skin: l.id, title: `Skin ${l.name}`, rar: l.rar })));
const ALL_CARDS = [...CARDS, ...SKINS];
const CARD_BY_ID = Object.fromEntries(ALL_CARDS.map((c) => [c.id, c]));
const CATALOG_NO = Object.fromEntries([...ALL_CARDS].sort((a, b) => RANKS.indexOf(b.rar) - RANKS.indexOf(a.rar) || a.id.localeCompare(b.id)).map((c, i) => [c.id, i + 1]));

// ===== Règles de l'économie (mêmes règles dans le navigateur et sur le serveur) =====
const MARKET_MIN_OPENED = 10;         // boosters ouverts avant de pouvoir vendre, acheter ou échanger
const CRAFT_COST = 3;                 // doublons combinés pour un skin au hasard (comme le reroll de LoL)
const TRADE_FREE_VALUE = 40;          // en dessous, un échange passe toujours
const TRADE_MAX_RATIO = 3;            // au-dessus, l'échange est un don déguisé : refusé
const DIVINE_CHANCE = 1 / 2000;       // booster divin : 5 Épiques ou mieux, dont une Mythique

const dayKey = (ts = Date.now()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date(ts));
const prevDay = (ts = Date.now()) => dayKey(ts - 86400e3);

function freshSave(now = Date.now()) {
  return { free: FREE_MAX, freeTs: now, chakra: 120, owned: {}, opened: 0, sinceGold: 0, sinceMythic: 0, history: [], updated: 0, pack: "saison1",
    streak: { last: "", n: 0 }, daily: null, paid: [], sales: 0, predPaid: [], trades: 0, crafted: 0 };
}
function normalizeSave(s, now = Date.now()) {
  const f = freshSave(now), out = { ...f, ...(s || {}) };
  out.owned = out.owned && typeof out.owned === "object" ? out.owned : {};
  for (const k of ["history", "paid", "predPaid"]) if (!Array.isArray(out[k])) out[k] = [];
  if (!out.streak || typeof out.streak !== "object") out.streak = { last: "", n: 0 };
  return out;
}
const ownOf = (s, id) => s.owned[id] || { n: 0, gold: 0, first: 0 };
const hasCard = (s, id) => ownOf(s, id).n + ownOf(s, id).gold > 0;

function regenS(s, now = Date.now()) {
  if (s.free >= FREE_MAX) { s.freeTs = now; return false; }
  let changed = false;
  while (s.free < FREE_MAX && now - s.freeTs >= REGEN) { s.free++; s.freeTs += REGEN; changed = true; }
  if (s.free >= FREE_MAX) s.freeTs = now;
  return changed;
}

function ensureDailyS(s, now = Date.now()) {
  const today = dayKey(now);
  if (!s.daily || s.daily.day !== today) {
    let h = 0; for (const ch of today) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const pool = [...MISSIONS], picks = [];
    while (picks.length < 3) { h = (h * 1103515245 + 12345) >>> 0; picks.push(pool.splice(h % pool.length, 1)[0].id); }
    s.daily = { day: today, ids: picks, prog: {}, claimed: {} };
  }
  return s.daily;
}
function trackS(s, key, n = 1, now = Date.now()) {
  const d = ensureDailyS(s, now); d.prog[key] = (d.prog[key] || 0) + n;
  const w = ensureWeeklyS(s, now); w.prog[key] = (w.prog[key] || 0) + n;
  s.counts = s.counts || {}; s.counts[key] = (s.counts[key] || 0) + n;
}

// ===== Semaine, premiers pas, succès, pack du jour (repris de Kyara) =====
const WEEKLY = [
  { id: "w-open20", label: "Ouvre 20 boosters",                key: "open",   goal: 20, reward: { chakra: 150 } },
  { id: "w-legend", label: "Obtiens une Légendaire ou mieux",  key: "legend", goal: 1,  reward: { chakra: 150 } },
  { id: "w-sold3",  label: "Vends 3 cartes au marché",         key: "sold",   goal: 3,  reward: { chakra: 150 } },
  { id: "w-trade2", label: "Réussis 2 échanges",               key: "trade",  goal: 2,  reward: { chakra: 200 } },
  { id: "w-craft2", label: "Combine 2 skins",                  key: "craft",  goal: 2,  reward: { chakra: 150 } },
  { id: "w-epic5",  label: "Obtiens 5 Épiques ou mieux",       key: "epic",   goal: 5,  reward: { chakra: 200 } },
];
const DAILY_BONUS = { boosters: 1 };     // les 3 missions du jour réclamées
const WEEKLY_BONUS = { boosters: 3 };    // les 3 missions de la semaine réclamées
const FIRST_STEPS = [
  { id: "f-open",   label: "Ouvre ton premier booster",    test: (s) => s.opened >= 1,                           reward: { chakra: 20 } },
  { id: "f-coffre", label: "Ouvre un coffre hextech",      test: (s) => (s.counts?.coffre || 0) >= 1,            reward: { chakra: 30 } },
  { id: "f-recyc",  label: "Recycle ou désenchante un doublon", test: (s) => (s.counts?.recycle || 0) >= 1,      reward: { chakra: 20 } },
  { id: "f-wish",   label: "Ajoute 3 persos à tes envies", test: (s) => (s.wish || []).length >= 3,              reward: { chakra: 20 } },
  { id: "f-show",   label: "Mets une carte en vitrine",    test: (s) => (s.showcase || []).length >= 1,          reward: { chakra: 20 } },
  { id: "f-pred",   label: "Fais une prédiction",          test: (s) => (s.counts?.predict || 0) >= 1,           reward: { chakra: 30 } },
  { id: "f-disc",   label: "Lie ton compte Discord",       test: (s) => !!s.linked,                               reward: { chakra: 150 } },
];
const FIRST_BONUS = { boosters: 3 };
const ACHIEVEMENTS = [
  { id: "a-open10",   label: "Premiers pas",        desc: "Ouvrir 10 boosters",                 val: (s) => s.opened, goal: 10,   reward: { chakra: 10 } },
  { id: "a-open100",  label: "Habitué",             desc: "Ouvrir 100 boosters",                val: (s) => s.opened, goal: 100,  reward: { chakra: 50 } },
  { id: "a-open1000", label: "Va donc jouer dehors", desc: "Ouvrir 1 000 boosters",             val: (s) => s.opened, goal: 1000, reward: { chakra: 500 } },
  { id: "a-uniq25",   label: "Collectionneur",      desc: "Posséder 25 cartes différentes",     val: (s) => statsS(s).unique, goal: 25, reward: { chakra: 20 } },
  { id: "a-uniq75",   label: "Archiviste",          desc: "Posséder 75 cartes différentes",     val: (s) => statsS(s).unique, goal: 75, reward: { chakra: 100 } },
  { id: "a-all",      label: "QG complet",          desc: "Posséder toutes les cartes",         val: (s) => statsS(s).unique, goal: ALL_CARDS.length, reward: { chakra: 2000 } },
  { id: "a-epic",     label: "Épique !",            desc: "Obtenir une première Épique ou mieux", val: (s) => ALL_CARDS.some((c) => RANKS.indexOf(c.rar) >= 3 && hasCard(s, c.id)) ? 1 : 0, goal: 1, reward: { chakra: 20 } },
  { id: "a-legend",   label: "Légendaire !",        desc: "Obtenir une première Légendaire ou mieux", val: (s) => ALL_CARDS.some((c) => RANKS.indexOf(c.rar) >= 4 && hasCard(s, c.id)) ? 1 : 0, goal: 1, reward: { chakra: 75 } },
  { id: "a-myth",     label: "Mythique !",          desc: "Obtenir une première Mythique",      val: (s) => statsS(s).mythics, goal: 1, reward: { chakra: 200 } },
  { id: "a-myth5",    label: "Panthéon",            desc: "Posséder 5 Mythiques différentes",   val: (s) => statsS(s).mythics, goal: 5, reward: { chakra: 500 } },
  { id: "a-skin10",   label: "Garde-robe",          desc: "Posséder 10 skins",                  val: (s) => statsS(s).skins, goal: 10, reward: { chakra: 75 } },
  { id: "a-prest",    label: "Prestige",            desc: "Obtenir un skin Prestige",           val: (s) => SKINS.some((c) => c.skin === "prestige" && hasCard(s, c.id)) ? 1 : 0, goal: 1, reward: { chakra: 300 } },
  { id: "a-sale1",    label: "Première vente",      desc: "Vendre une carte au marché",         val: (s) => s.sales || 0, goal: 1,  reward: { chakra: 30 } },
  { id: "a-sale10",   label: "Marchand",            desc: "Vendre 10 cartes",                   val: (s) => s.sales || 0, goal: 10, reward: { chakra: 100 } },
  { id: "a-trade1",   label: "Poignée de main",     desc: "Réussir un échange",                 val: (s) => s.trades || 0, goal: 1, reward: { chakra: 30 } },
  { id: "a-trade10",  label: "Négociateur",         desc: "Réussir 10 échanges",                val: (s) => s.trades || 0, goal: 10, reward: { chakra: 250 } },
  { id: "a-divine",   label: "Touché par les dieux", desc: "Ouvrir un booster divin",           val: (s) => s.counts?.divine || 0, goal: 1, reward: { chakra: 500 } },
];
// semaine : du lundi au dimanche, heure de Paris
function weekKey(now = Date.now()) {
  const d = new Date(dayKey(now) + "T12:00:00Z"), dow = (d.getUTCDay() + 6) % 7;
  return dayKey(d.getTime() - dow * 86400e3);
}
function ensureWeeklyS(s, now = Date.now()) {
  const wk = weekKey(now);
  if (!s.weekly || s.weekly.week !== wk) {
    let h = 7; for (const ch of wk) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const pool = [...WEEKLY], picks = [];
    while (picks.length < 3) { h = (h * 1103515245 + 12345) >>> 0; picks.push(pool.splice(h % pool.length, 1)[0].id); }
    s.weekly = { week: wk, ids: picks, prog: {}, claimed: {}, bonus: false };
  }
  return s.weekly;
}
function weeklyS(s, now = Date.now()) {
  const w = ensureWeeklyS(s, now);
  return w.ids.map((id) => { const m = WEEKLY.find((x) => x.id === id); return { ...m, prog: Math.min(m.goal, w.prog[m.key] || 0), claimed: !!w.claimed[id] }; });
}
const firstStepsS = (s) => FIRST_STEPS.map((f) => ({ ...f, done: !!f.test(s), claimed: !!(s.first || {})[f.id] }));
const achievementsS = (s) => ACHIEVEMENTS.map((a) => ({ ...a, prog: Math.min(a.goal, a.val(s)), claimed: !!(s.ach || {})[a.id] }));
// réclamer n'importe quelle récompense ; kind : streak, mission, daily-bonus, weekly, weekly-bonus, first, first-bonus, ach, all
function claimAnyS(s, kind, id, now = Date.now()) {
  if (kind === "streak") return claimStreakS(s, now);
  if (kind === "mission") return claimMissionS(s, id, now);
  if (kind === "daily-bonus") {
    const d = ensureDailyS(s, now);
    if (d.bonus || missionsTodayS(s, now).some((m) => !m.claimed)) return null;
    d.bonus = true; giveRewardS(s, DAILY_BONUS); return { reward: DAILY_BONUS };
  }
  if (kind === "weekly") {
    const m = weeklyS(s, now).find((x) => x.id === id);
    if (!m || m.prog < m.goal || m.claimed) return null;
    s.weekly.claimed[id] = true; giveRewardS(s, m.reward); return { reward: m.reward };
  }
  if (kind === "weekly-bonus") {
    const w = ensureWeeklyS(s, now);
    if (w.bonus || weeklyS(s, now).some((m) => !m.claimed)) return null;
    w.bonus = true; giveRewardS(s, WEEKLY_BONUS); return { reward: WEEKLY_BONUS };
  }
  if (kind === "first") {
    const f = firstStepsS(s).find((x) => x.id === id);
    if (!f || !f.done || f.claimed) return null;
    s.first = { ...(s.first || {}), [id]: true }; giveRewardS(s, f.reward); return { reward: f.reward };
  }
  if (kind === "first-bonus") {
    if ((s.first || {}).bonus || firstStepsS(s).some((f) => !f.claimed)) return null;
    s.first = { ...s.first, bonus: true }; giveRewardS(s, FIRST_BONUS); return { reward: FIRST_BONUS };
  }
  if (kind === "ach") {
    const a = achievementsS(s).find((x) => x.id === id);
    if (!a || a.prog < a.goal || a.claimed) return null;
    s.ach = { ...(s.ach || {}), [id]: true }; giveRewardS(s, a.reward); return { reward: a.reward };
  }
  if (kind === "all") {
    const total = { boosters: 0, chakra: 0 }, add = (r) => { if (r) { total.boosters += r.reward.boosters || 0; total.chakra += r.reward.chakra || 0; } };
    add(claimStreakS(s, now));
    for (const m of missionsTodayS(s, now)) add(claimMissionS(s, m.id, now));
    add(claimAnyS(s, "daily-bonus", null, now));
    for (const m of weeklyS(s, now)) add(claimAnyS(s, "weekly", m.id, now));
    add(claimAnyS(s, "weekly-bonus", null, now));
    for (const f of firstStepsS(s)) add(claimAnyS(s, "first", f.id, now));
    add(claimAnyS(s, "first-bonus", null, now));
    for (const a of achievementsS(s)) add(claimAnyS(s, "ach", a.id, now));
    return total.boosters || total.chakra ? { reward: total } : null;
  }
  return null;
}
function claimableCountS(s, now = Date.now()) {
  let n = streakStateS(s, now).canClaim ? 1 : 0;
  n += missionsTodayS(s, now).filter((m) => m.prog >= m.goal && !m.claimed).length;
  n += weeklyS(s, now).filter((m) => m.prog >= m.goal && !m.claimed).length;
  n += firstStepsS(s).filter((f) => f.done && !f.claimed).length;
  n += achievementsS(s).filter((a) => a.prog >= a.goal && !a.claimed).length;
  const d = ensureDailyS(s, now), w = ensureWeeklyS(s, now);
  if (!d.bonus && missionsTodayS(s, now).every((m) => m.claimed)) n++;
  if (!w.bonus && weeklyS(s, now).every((m) => m.claimed)) n++;
  if (!(s.first || {}).bonus && firstStepsS(s).every((f) => f.claimed)) n++;
  return n;
}
// pack du jour : gratuit une fois par jour, thème qui tourne, Épique ou mieux garantie
const DAY_THEMES = ["mix", "vilains", "monde", "bande", "coffre"];
function dailyPackOf(now = Date.now()) {
  const k = dayKey(now); let h = 0; for (const ch of k) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const base = PACKS.find((p) => p.id === DAY_THEMES[h % DAY_THEMES.length]);
  return { ...base, id: "jour", base: base.id, name: `Pack du jour · ${base.name}`, sub: "Gratuit chaque jour · Épique ou mieux garantie", daily: true };
}
function missionsTodayS(s, now = Date.now()) {
  const d = ensureDailyS(s, now);
  return d.ids.map((id) => { const m = MISSIONS.find((x) => x.id === id); return { ...m, prog: Math.min(m.goal, d.prog[m.key] || 0), claimed: !!d.claimed[id] }; });
}
function streakStateS(s, now = Date.now()) {
  const today = dayKey(now), st = s.streak;
  const canClaim = st.last !== today;
  const next = canClaim ? (st.last === prevDay(now) ? (st.n % 7) + 1 : 1) : st.n;
  return { canClaim, next, n: canClaim && st.last !== prevDay(now) ? 0 : st.n };
}
function giveRewardS(s, r) {
  if (r.boosters) s.free += r.boosters;
  if (r.chakra) s.chakra += r.chakra;
}
function claimStreakS(s, now = Date.now()) {
  const st = streakStateS(s, now);
  if (!st.canClaim) return null;
  s.streak = { last: dayKey(now), n: st.next };
  const r = STREAK[st.next - 1]; giveRewardS(s, r);
  return { day: st.next, reward: r };
}
function claimMissionS(s, id, now = Date.now()) {
  const m = missionsTodayS(s, now).find((x) => x.id === id);
  if (!m || m.prog < m.goal || m.claimed) return null;
  s.daily.claimed[id] = true; giveRewardS(s, m.reward);
  return { reward: m.reward };
}

// --- boosters ---
const limitedOnAt = (now = Date.now()) => now < LIMITED_END.getTime();
const packsAt = (now = Date.now()) => PACKS.filter((p) => !p.limited || limitedOnAt(now));
const packOfAt = (id, now = Date.now()) => packsAt(now).find((p) => p.id === id) || packsAt(now)[0];
const epOfCfg = (cfg, who) => cfg.ep[who] ?? 2;
const progressOfCfg = (cfg, uid) => (uid && cfg.progress[uid] != null ? cfg.progress[uid] : cfg.def);
const unlockedFor = (cfg, who, uid) => epOfCfg(cfg, who) <= progressOfCfg(cfg, uid) || (uid ? (cfg.extra[uid] || []).includes(who) : false);
const canPackFor = (cfg, c, uid) => unlockedFor(cfg, c.who, uid);
// les skins ne sortent que du coffre hextech (et de la combinaison de doublons), comme dans LoL
const poolFor = (pk, cfg, uid) => (pk.skins ? SKINS : CARDS).filter((c) => (!pk.fac || pk.fac.includes(PEOPLE[c.who].fac)) && canPackFor(cfg, c, uid));
function configFrom(data) {
  const d = DEFAULT_CONFIG();
  return { ep: { ...d.ep, ...(data?.ep || {}) }, progress: { ...(data?.progress || {}) }, def: data?.def ?? d.def, extra: JSON.parse(JSON.stringify(data?.extra || {})) };
}
const boosted = (t, k) => Object.fromEntries(Object.entries(t).map(([r, p]) => [r, r === "l" || r === "m" ? p * k : p]));
function rollWith(table, rng) {
  let r = rng() * Object.values(table).reduce((a, b) => a + b, 0);
  for (const [k, p] of Object.entries(table)) if ((r -= p) < 0) return k;
  return Object.keys(table)[0];
}
function pickWith(rar, pool, rng) {
  // si le booster n'a pas cette rareté, on prend la plus proche (d'abord en dessous)
  const i = RANKS.indexOf(rar);
  for (let d = 0; d < RANKS.length; d++) {
    for (const j of [i - d, i + d]) {
      const list = pool.filter((c) => c.rar === RANKS[j]);
      if (list.length) return list[Math.floor(rng() * list.length)];
    }
  }
  return pool[0];
}
function addCardS(s, id, gold, now = Date.now()) {
  const o = { ...ownOf(s, id) };
  const isNew = gold ? !o.gold : !o.n;
  if (gold) o.gold++; else o.n++;
  if (!o.first) o.first = now;
  s.owned[id] = o;
  return isNew;
}
function removeCardS(s, id, gold, n = 1) {
  const o = { ...ownOf(s, id) };
  if (gold ? o.gold < n : o.n < n) return false;
  if (gold) o.gold -= n; else o.n -= n;
  s.owned[id] = o;
  return true;
}
// Ouvre un booster dans l'état `s`. Renvoie les cartes tirées, ou null si le booster n'a aucune carte débloquée.
function openPackS(s, pk, pool, rng, now = Date.now()) {
  if (!pool.length) return null;
  const k = pk.boost || 1;
  const divine = rng() < DIVINE_CHANCE;
  const rars = [];
  for (let i = 0; i < PACK; i++) rars.push(divine ? (i === PACK - 1 ? "m" : rollWith({ e: 70, l: 25, m: 5 }, rng)) : rollWith(boosted(i < PACK - 1 ? SLOT : pk.last || LAST, k), rng));
  s.sinceMythic++; s.sinceGold++;
  if (s.sinceMythic >= MYTHIC_PITY && !rars.includes("m")) rars[PACK - 1] = "m";
  const cards = rars.map((r) => ({ c: pickWith(r, pool, rng), gold: rng() < GOLD_CHANCE }));
  if (cards.some((x) => x.c.rar === "m")) s.sinceMythic = 0;
  cards.sort((a, b) => RANKS.indexOf(a.c.rar) - RANKS.indexOf(b.c.rar));
  if (s.sinceGold >= GOLD_EVERY) cards[PACK - 1].gold = true;
  if (cards.some((x) => x.gold)) s.sinceGold = 0;
  const out = cards.map((x) => {
    const isNew = addCardS(s, x.c.id, x.gold, now);
    if (RANKS.indexOf(x.c.rar) >= 3 || x.gold) s.history.unshift({ id: x.c.id, gold: x.gold, t: now });
    return { id: x.c.id, gold: x.gold, isNew };
  });
  s.history = s.history.slice(0, 60);
  s.opened++;
  trackS(s, "open", 1, now);
  trackS(s, "epic", out.filter((x) => RANKS.indexOf(CARD_BY_ID[x.id].rar) >= 3).length, now);
  trackS(s, "rare", out.filter((x) => RANKS.indexOf(CARD_BY_ID[x.id].rar) >= 2).length, now);
  trackS(s, "new", out.filter((x) => x.isNew).length, now);
  trackS(s, "legend", out.filter((x) => RANKS.indexOf(CARD_BY_ID[x.id].rar) >= 4).length, now);
  if (divine) trackS(s, "divine", 1, now);
  return { cards: out, divine };
}
// Prend un booster (gratuit ou acheté) puis l'ouvre. Renvoie { error } ou le résultat de openPackS.
function takeAndOpenS(s, packId, paid, cfg, uid, rng, now = Date.now()) {
  regenS(s, now);
  if (packId === "jour") {
    if (s.dailyPack === dayKey(now)) return { error: "Tu as déjà ouvert le pack du jour. Reviens demain !" };
    const pk = dailyPackOf(now), pool = poolFor(pk, cfg, uid);
    if (!pool.length) return { error: "Aucun perso du pack du jour n'est encore débloqué pour toi." };
    s.dailyPack = dayKey(now);
    const r = openPackS(s, { ...pk, last: { e: 85, l: 12, m: 3 } }, pool, rng, now);
    if (pk.skins) trackS(s, "coffre", 1, now);
    return { pack: "jour", ...r };
  }
  const pk = packOfAt(packId, now), pool = poolFor(pk, cfg, uid);
  if (!pool.length) return { error: "Aucun perso de ce booster n'est encore débloqué pour toi. Choisis un autre booster." };
  if (paid) { if (s.chakra < PRICE) return { error: `Il te faut ${PRICE} ◆ (tu en as ${s.chakra}).` }; s.chakra -= PRICE; }
  else { if (!s.free) return { error: "Plus de booster gratuit pour l'instant." }; if (s.free === FREE_MAX) s.freeTs = now; s.free--; }
  const r = openPackS(s, pk, pool, rng, now);
  if (pk.skins) trackS(s, "coffre", 1, now);
  return { pack: pk.id, ...r };
}
function packChance(rar, k = 1) {
  const a = boosted(SLOT, k), b = boosted(LAST, k);
  const p1 = (a[rar] || 0) / Object.values(a).reduce((x, y) => x + y, 0);
  const p5 = (b[rar] || 0) / Object.values(b).reduce((x, y) => x + y, 0);
  return 1 - Math.pow(1 - p1, PACK - 1) * (1 - p5);
}

// --- doublons : recycler, désenchanter, combiner ---
const cardValue = (id, gold) => RAR[CARD_BY_ID[id].rar].chakra * (gold ? 3 : 1);
function dupesValueS(s) {
  let v = 0;
  for (const c of ALL_CARDS) { const o = ownOf(s, c.id); v += Math.max(0, o.n - 1) * cardValue(c.id, false) + Math.max(0, o.gold - 1) * cardValue(c.id, true); }
  return v;
}
function recycleS(s, now = Date.now()) {
  const v = dupesValueS(s); if (!v) return 0;
  for (const c of ALL_CARDS) { const o = ownOf(s, c.id); if (o.n > 1 || o.gold > 1) s.owned[c.id] = { ...o, n: Math.min(o.n, 1), gold: Math.min(o.gold, 1) }; }
  s.chakra += v; trackS(s, "recycle", 1, now);
  return v;
}
function disenchantS(s, id, gold, now = Date.now()) {
  if (!CARD_BY_ID[id] || !removeCardS(s, id, !!gold)) return 0;
  const v = cardValue(id, !!gold); s.chakra += v; trackS(s, "recycle", 1, now);
  return v;
}
// 3 doublons (les moins précieux d'abord) → 1 skin au hasard, comme le reroll de LoL
function craftableDupes(s) {
  const list = [];
  for (const c of ALL_CARDS) { const o = ownOf(s, c.id); for (let i = 1; i < o.n; i++) list.push(c); }
  return list.sort((a, b) => RANKS.indexOf(a.rar) - RANKS.indexOf(b.rar));
}
function craftS(s, cfg, uid, rng, now = Date.now()) {
  const dupes = craftableDupes(s);
  if (dupes.length < CRAFT_COST) return { error: `Il te faut ${CRAFT_COST} doublons (tu en as ${dupes.length}).` };
  const pool = SKINS.filter((c) => canPackFor(cfg, c, uid));
  if (!pool.length) return { error: "Aucun skin n'est encore débloqué pour toi." };
  const used = dupes.slice(0, CRAFT_COST);
  for (const c of used) removeCardS(s, c.id, false);
  const c = pickWith(rollWith(SLOT, rng), pool, rng);
  const isNew = addCardS(s, c.id, false, now);
  if (RANKS.indexOf(c.rar) >= 3) s.history.unshift({ id: c.id, gold: false, t: now });
  s.crafted = (s.crafted || 0) + 1; trackS(s, "craft", 1, now);
  return { card: { id: c.id, gold: false, isNew }, used: used.map((x) => x.id) };
}

// --- stats, échanges ---
function statsS(s) {
  const cards = ALL_CARDS.filter((c) => ownOf(s, c.id).n).length, gold = ALL_CARDS.filter((c) => ownOf(s, c.id).gold).length;
  const total = Object.values(s.owned).reduce((a, o) => a + (o.n || 0) + (o.gold || 0), 0);
  const unique = ALL_CARDS.filter((c) => hasCard(s, c.id)).length;
  const mythics = ALL_CARDS.filter((c) => c.rar === "m" && hasCard(s, c.id)).length;
  const skins = SKINS.filter((c) => hasCard(s, c.id)).length;
  return { cards, unique, gold, total, mythics, skins, opened: s.opened, sales: s.sales || 0, trades: s.trades || 0 };
}
const itemsValue = (items) => (items || []).reduce((a, it) => a + (CARD_BY_ID[it.id] ? cardValue(it.id, it.gold) * (it.n || 1) : 0), 0);
function tradeFair(give, want, chakraGive = 0) {
  const a = itemsValue(give) + chakraGive, b = itemsValue(want);
  if (Math.max(a, b) <= TRADE_FREE_VALUE) return true;
  return Math.min(a, b) * TRADE_MAX_RATIO >= Math.max(a, b);
}
// Une collection d'invité est-elle plausible ? (sinon on ne l'importe pas sur le compte)
function plausibleSave(s) {
  const total = Object.values(s.owned || {}).reduce((a, o) => a + (o.n || 0) + (o.gold || 0), 0);
  return s.opened <= 400 && total <= s.opened * PACK + 10 && s.chakra <= 5000 && Object.keys(s.owned || {}).every((id) => CARD_BY_ID[id]);
}

export { FACTIONS, PEOPLE, VARIANTS, CARDS, PACKS, RAR, RANKS, SLOT, LAST, PACK, STREAK, MISSIONS, LIMITED_END, EP1, EP_MAX, DEFAULT_CONFIG, SKIN_LINES, SKINNED, SKINS, ALL_CARDS, CARD_BY_ID, CATALOG_NO, MARKET_MIN_OPENED, CRAFT_COST, TRADE_FREE_VALUE, TRADE_MAX_RATIO, DIVINE_CHANCE, dayKey, prevDay, freshSave, normalizeSave, ownOf, hasCard, regenS, ensureDailyS, trackS, WEEKLY, DAILY_BONUS, WEEKLY_BONUS, FIRST_STEPS, FIRST_BONUS, ACHIEVEMENTS, weekKey, ensureWeeklyS, weeklyS, firstStepsS, achievementsS, claimAnyS, claimableCountS, DAY_THEMES, dailyPackOf, missionsTodayS, streakStateS, giveRewardS, claimStreakS, claimMissionS, limitedOnAt, packsAt, packOfAt, epOfCfg, progressOfCfg, unlockedFor, canPackFor, poolFor, configFrom, boosted, rollWith, pickWith, addCardS, removeCardS, openPackS, takeAndOpenS, packChance, cardValue, dupesValueS, recycleS, disenchantS, craftableDupes, craftS, statsS, itemsValue, tradeFair, plausibleSave };
