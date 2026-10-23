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
  // ===== Persos secondaires vus dans l'épisode 1 (noms à confirmer par Billy, images provisoires tirées de l'épisode)
  inconnu: { name: "???", fac: "anta", rar: "e", kanji: "謎", color: "#c9c3d8", icon: "arcane", tag: "Le méchant de l'épisode 1",
             power: "Donne de nouveaux pouvoirs à Mahed (aura violette)", look: "Cheveux blancs avec une mèche noire, yeux cernés de noir, manteau blanc à capuche, sangles et chaînes dorées, bras bandé", mood: "", quote: "" },
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
  ogre1:   { name: "Ogre 1", fac: "enn", rar: "c", kanji: "鬼", color: "#5f7d3a", icon: "mono", tag: "Ogre vert barbu",
             power: "", look: "Ogre à la peau verte, barbe, tenue de cuir", mood: "", quote: "Quoi ? T’en veux encore ?" },
  ogre2:   { name: "Ogre 2", fac: "enn", rar: "c", kanji: "鬼", color: "#3a6f9e", icon: "mono", tag: "Ogre bleu",
             power: "", look: "Ogre massif à la peau bleue", mood: "", quote: "" },
  ogre3:   { name: "Ogre 3", fac: "enn", rar: "pc", kanji: "鬼", color: "#4f6a33", icon: "mono", tag: "Ogre vert",
             power: "", look: "Ogre à la peau verte, vu en gros plan à la fin de l'épisode", mood: "", quote: "" },
  ogre4:   { name: "Ogre 4", fac: "enn", rar: "c", kanji: "鬼", color: "#b0956a", icon: "mono", tag: "Ogre beige",
             power: "", look: "Ogre massif à la peau beige, crâne rasé", mood: "", quote: "" },
  soldat1: { name: "Soldat 1", fac: "enn", rar: "c", kanji: "兵", color: "#a8323c", icon: "spear", tag: "Cape rouge",
             power: "Lance", look: "Soldat en armure, casque fermé, capuche et écharpe rouges, longue lance", mood: "", quote: "" },
  soldat2: { name: "Soldat 2", fac: "enn", rar: "r", kanji: "兵", color: "#8a8f99", icon: "spear", tag: "Casque et capuche rouge",
             power: "", look: "Soldat en armure, casque fermé, capuche rouge, plastron percé", mood: "", quote: "" },
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
  sanglier: { name: "Homme-sanglier", fac: "neu", rar: "r", kanji: "猪", color: "#b08a6a", icon: "mono", tag: "Cuisinier",
             power: "", look: "Homme-sanglier cornu, massif et tatoué, qui sert des pâtes au marché", mood: "", quote: "Des bonnes nouilles en sauce aux boules draconiques." },
  ecureuil: { name: "Écureuil 1", fac: "neu", rar: "c", kanji: "栗", color: "#c8642a", icon: "hammer", tag: "Forgeron",
             power: "", look: "Écureuil roux forgeron, foulard violet, travaille à l'enclume avec le porc-épic", mood: "", quote: "" },
  porcepic: { name: "Porc-épic", fac: "neu", rar: "pc", kanji: "鍛", color: "#7a6a5a", icon: "hammer", tag: "Forgeron",
             power: "", look: "Porc-épic forgeron en armure de cuir, marteau à la main devant l'enclume", mood: "", quote: "" },
  ecureuil2: { name: "Écureuil 2", fac: "neu", rar: "c", kanji: "鼠", color: "#9a9aa8", icon: "mono", tag: "Écureuil gris",
             power: "", look: "Écureuil gris en manteau, sac à dos et gourdes, près des caisses de tomates", mood: "", quote: "" },
  castor1: { name: "Castor 1", fac: "neu", rar: "c", kanji: "厨", color: "#8a6a4a", icon: "mono", tag: "Cuisinier",
             power: "", look: "Castor cuisinier rieur, couperet à la main, dans la cuisine", mood: "", quote: "" },
  castor2: { name: "Castor 2", fac: "neu", rar: "c", kanji: "厨", color: "#7a6a5a", icon: "mono", tag: "Cuisinier",
             power: "", look: "Castor cuisinier qui coupe des carottes, foulard sur les épaules", mood: "", quote: "" },
  castorgeant: { name: "Castor géant", fac: "neu", rar: "r", kanji: "巨", color: "#6a4a32", icon: "mono", tag: "Balafré",
             power: "", look: "Castor géant balafré à l'œil, harnais et chargement de bagages sur le dos", mood: "", quote: "" },
  lion: { name: "Homme-lion", fac: "neu", rar: "pc", kanji: "獅", color: "#c8902a", icon: "mono", tag: "Noble du marché",
             power: "", look: "Homme-lion en robe violette et or, broche turquoise, sur la place du marché", mood: "", quote: "" },
  cerf: { name: "Homme-cerf", fac: "neu", rar: "c", kanji: "鹿", color: "#3a7a6a", icon: "mono", tag: "Place du marché",
             power: "", look: "Homme-cerf aux bois, tenue verte et or, sur la place du marché", mood: "", quote: "" },
  felin: { name: "Homme-félin", fac: "neu", rar: "c", kanji: "猫", color: "#b8862a", icon: "mono", tag: "Col de fourrure",
             power: "", look: "Homme-félin en manteau rouge et or à col de fourrure blanche, coupe à la main", mood: "", quote: "" },
  oiseau: { name: "Grand oiseau", fac: "neu", rar: "pc", kanji: "鳥", color: "#7a2a8a", icon: "mono", tag: "Plumes turquoise",
             power: "", look: "Grand oiseau violet et rouge à crête turquoise, perché au-dessus du marché", mood: "", quote: "" },
  elfe1: { name: "Elfe 1", fac: "neu", rar: "c", kanji: "妖", color: "#7a4a9a", icon: "mono", tag: "Peau violette",
             power: "", look: "Elfe à la peau violette et aux cheveux verts, à la taverne du soir", mood: "", quote: "" },
  elfe2: { name: "Elfe 2", fac: "neu", rar: "c", kanji: "妖", color: "#c8b04a", icon: "mono", tag: "Cheveux blonds",
             power: "", look: "Elfe aux cheveux blonds, chope à la main, à la taverne du soir", mood: "", quote: "" },
  belier: { name: "Homme-bélier", fac: "neu", rar: "pc", kanji: "羊", color: "#8a7a4a", icon: "mono", tag: "Barbe blanche",
             power: "", look: "Colosse à cornes de bélier et longue barbe blanche, attablé à la taverne du soir", mood: "", quote: "" },
  gobelin: { name: "Gobelin", fac: "neu", rar: "c", kanji: "鬼", color: "#a89a7a", icon: "mono", tag: "Grandes oreilles",
             power: "", look: "Petit gobelin souriant aux cheveux blancs et aux grandes oreilles", mood: "", quote: "" },
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
  c:  { label: "Commune",     color: "var(--r-c)",  rank: 0, chakra: 0 },
  pc: { label: "Peu commune", color: "var(--r-pc)", rank: 1, chakra: 1 },
  r:  { label: "Rare",        color: "var(--r-r)",  rank: 2, chakra: 1 },
  e:  { label: "Épique",      color: "var(--r-e)",  rank: 3, chakra: 4 },
  l:  { label: "Légendaire",  color: "var(--r-l)",  rank: 4, chakra: 10 },
  m:  { label: "Mythique",    color: "var(--r-m)",  rank: 5, chakra: 25 },
};
const RANKS = ["c", "pc", "r", "e", "l", "m"];
const SLOT = { c: 56, pc: 28, r: 12, e: 3.2, l: 0.65, m: 0.15 };   // cartes 1 à 4
const LAST = { r: 86, e: 11, l: 2.5, m: 0.5 };                      // 5e carte : Rare ou mieux
// une constante par ligne : build.py exporte chaque nom vers le serveur
const PACK = 5;
const FREE_MAX = 3;                    // réserve de boosters gratuits
const REGEN = 3 * 3600e3;              // un booster gratuit de plus toutes les 3 h
const PRICE = 150;                     // prix d'un booster en boutique (◆)
const GOLD_EVERY = 10;
const MYTHIC_PITY = 0;                 // Mythique garantie au bout de N boosters (0 = jamais : décidé par Reichi, seule la Légendaire est garantie)
const LEGEND_PITY = 40;                // une Légendaire ou mieux garantie au plus tard au 40e booster (provisoire)
const GOLD_CHANCE = 0.01;
const THEME_MIN = 5;                   // persos débloqués avant qu'un booster thématique s'ouvre (provisoire)
const THEME_RARITIES = ["c", "pc", "r"];  // raretés que le thème doit avoir lui-même : l'essentiel de ses cartes vient de lui
const DAILY_LAST = { e: 90, l: 8.5, m: 1.5 }; // 5e carte du pack du jour : Épique ou mieux
const STREAK = [{ boosters: 1 }, { boosters: 1 }, { boosters: 1 }, { boosters: 1 }, { boosters: 1 }, { boosters: 1 }, { boosters: 2, chakra: 100 }];
const DAILY_N = 2;                     // missions du jour tirées chaque jour
const WEEKLY_N = 5;                    // missions de la semaine tirées chaque semaine
const MISSIONS = [
  { id: "open3",  label: "Ouvre 3 boosters",                     key: "open",    goal: 3, reward: { chakra: 15 } },
  { id: "epic1",  label: "Obtiens une carte Épique ou mieux",     key: "epic",    goal: 1, reward: { chakra: 20 } },
  { id: "new2",   label: "Obtiens 2 nouvelles cartes",            key: "new",     goal: 2, reward: { chakra: 15 } },
  { id: "recyc",  label: "Recycle tes doublons",                  key: "recycle", goal: 1, reward: { chakra: 10 } },
  { id: "sell1",  label: "Mets une carte en vente au marché",     key: "sell",    goal: 1, reward: { chakra: 15 } },
  { id: "open6",  label: "Ouvre 6 boosters",                      key: "open",    goal: 6, reward: { chakra: 20 } },
  { id: "rare3",  label: "Obtiens 3 cartes Rares ou mieux",        key: "rare",    goal: 3, reward: { chakra: 15 } },
  { id: "pred1",  label: "Vote pour une prédiction",              key: "predict", goal: 1, reward: { chakra: 15 } },
  { id: "chat1",  label: "Écris un message dans le chat du QG",     key: "chat",    goal: 1, reward: { chakra: 10 } },
  { id: "day1",   label: "Ouvre le pack du jour",                   key: "day",     goal: 1, reward: { chakra: 15 } },
  { id: "sheet3", label: "Consulte 3 fiches de persos",             key: "sheet",   goal: 3, reward: { chakra: 10 } },
  { id: "cf1",    label: "Joue une partie de Confrontation",        key: "cfPlay",  goal: 1, reward: { chakra: 15 } },
];
const LIMITED_END = new Date("2026-12-31T23:59:59");
// ===== Épisodes : persos vus dans l'épisode 1 (repérés sur les images). Billy peut tout changer dans l'onglet Admin.
const EP1 = ["billy", "seb", "mojo", "kuradai", "byakko", "stalk", "nestor", "sultran", "shiro", "mahed", "reichi", "sasori", "iouaf", "sakuto", "rayzo", "teo",
  "inconnu", "ogre1", "ogre2", "ogre3", "ogre4", "soldat1", "soldat2", "sanglier", "ecureuil", "porcepic", "ecureuil2", "castor1", "castor2", "castorgeant",
  "lion", "cerf", "felin", "oiseau", "elfe1", "elfe2", "belier", "gobelin"];
const EP_MAX = 12;
const HIDDEN = 99;
const DEFAULT_CONFIG = () => ({ ep: Object.fromEntries(Object.keys(PEOPLE).map((k) => [k, PEOPLE[k].ep ?? (EP1.includes(k) ? 1 : 2)])), progress: {}, def: 1, extra: {} });

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
const MARKET_FEE = 0;                  // frais de vente retenus au vendeur (0 = aucun ; option proposée : 0.05, en attente de décision)
const marketNet = (price) => price - Math.floor(price * MARKET_FEE);
const MARKET_MIN_OPENED = 10;         // boosters ouverts avant de pouvoir vendre, acheter ou échanger
const CRAFT_COST = 3;                 // doublons combinés pour un skin au hasard (comme le reroll de LoL)
const TRADE_FREE_VALUE = 40;          // en dessous, un échange passe toujours
const TRADE_MAX_RATIO = 3;            // au-dessus, l'échange est un don déguisé : refusé
const DIVINE_CHANCE = 1 / 2000;       // booster divin : 5 Épiques ou mieux, dont une Mythique

const dayKey = (ts = Date.now()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date(ts));
const prevDay = (ts = Date.now()) => dayKey(ts - 86400e3);

function freshSave(now = Date.now()) {
  return { created: now, free: FREE_MAX, freeTs: now, chakra: 120, owned: {}, opened: 0, sinceGold: 0, sinceMythic: 0, sinceLegend: 0, history: [], updated: 0, pack: "saison1",
    streak: { last: "", n: 0 }, daily: null, paid: [], sales: 0, predPaid: [], trades: 0, crafted: 0 };
}
function normalizeSave(s, now = Date.now()) {
  const f = freshSave(now), out = { ...f, ...(s || {}) };
  out.owned = out.owned && typeof out.owned === "object" ? out.owned : {};
  for (const k of ["history", "paid", "predPaid", "predVoted"]) if (!Array.isArray(out[k])) out[k] = [];
  if (!out.streak || typeof out.streak !== "object") out.streak = { last: "", n: 0 };
  out.titles = [...new Set((Array.isArray(out.titles) ? out.titles : []).map(titleIdOf).filter(Boolean))];
  if (out.titleShown && !out.titles.includes(out.titleShown)) out.titleShown = null;
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
    while (picks.length < DAILY_N) { h = (h * 1103515245 + 12345) >>> 0; picks.push(pool.splice(h % pool.length, 1)[0].id); }
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
  { id: "w-open40", label: "Ouvre 40 boosters",                key: "open",    goal: 40, reward: { chakra: 120 } },
  { id: "w-legend", label: "Obtiens une Légendaire ou mieux",  key: "legend",  goal: 1,  reward: { chakra: 100 } },
  { id: "w-sold3",  label: "Vends 3 cartes au marché",         key: "sold",    goal: 3,  reward: { chakra: 100 } },
  { id: "w-trade2", label: "Réussis 2 échanges",               key: "trade",   goal: 2,  reward: { chakra: 100 } },
  { id: "w-craft2", label: "Combine 2 skins",                  key: "craft",   goal: 2,  reward: { chakra: 80 } },
  { id: "w-epic8",  label: "Obtiens 8 Épiques ou mieux",       key: "epic",    goal: 8,  reward: { chakra: 100 } },
  { id: "w-pred5",  label: "Vote pour 5 prédictions",          key: "predict", goal: 5,  reward: { chakra: 80 } },
  { id: "w-predok", label: "Réussis 2 prédictions",            key: "predwin", goal: 2,  reward: { chakra: 120 } },
  { id: "w-cfwin3", label: "Gagne 3 parties de Confrontation", key: "cfWin",   goal: 3,  reward: { chakra: 120 } },
  { id: "w-chat15", label: "Écris 15 messages dans le chat",   key: "chat",    goal: 15, reward: { chakra: 60 } },
];
const DAILY_BONUS = { boosters: 1 };     // toutes les missions du jour réclamées
const WEEKLY_BONUS = { boosters: 3 };    // toutes les missions de la semaine réclamées
// Confrontation : jouable à l'infini, mais l'essence ne vient que des premières parties valables du jour
const CF_REWARD = { partie: 10, victoire: 10, max: 3 };
const FIRST_STEPS = [
  { id: "f-open",   label: "Ouvre ton premier booster",    test: (s) => s.opened >= 1,                           reward: { chakra: 20 } },
  { id: "f-coffre", label: "Ouvre un coffre hextech",      test: (s) => (s.counts?.coffre || 0) >= 1,            reward: { chakra: 30 } },
  { id: "f-recyc",  label: "Recycle ou désenchante un doublon", test: (s) => (s.counts?.recycle || 0) >= 1,      reward: { chakra: 20 } },
  { id: "f-wish",   label: "Ajoute 3 persos à tes envies", test: (s) => (s.wish || []).length >= 3,              reward: { chakra: 20 } },
  { id: "f-show",   label: "Mets une carte en vitrine",    test: (s) => (s.showcase || []).length >= 1,          reward: { chakra: 20 } },
  { id: "f-pred",   label: "Fais une prédiction",          test: (s) => (s.counts?.predict || 0) >= 1,           reward: { chakra: 30 } },
  { id: "f-chat",   label: "Dis bonjour dans le chat du QG", test: (s) => (s.counts?.chat || 0) >= 1,            reward: { chakra: 20 } },
  { id: "f-sheet",  label: "Ouvre une fiche de perso",     test: (s) => (s.counts?.sheet || 0) >= 1,             reward: { chakra: 20 } },
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
  { id: "a-fac1",     label: "Premier album",       desc: "Compléter une faction",              val: (s) => factionsDoneS(s), goal: 1, reward: { chakra: 50 } },
  { id: "a-facall",   label: "Conservateur",        desc: "Compléter toutes les factions",      val: (s) => factionsDoneS(s), goal: Object.keys(FACTIONS).length, reward: { chakra: 1000 } },
  { id: "a-pred1",    label: "Oracle",              desc: "Réussir une prédiction",             val: (s) => s.counts?.predwin || 0, goal: 1, reward: { chakra: 50 } },
  { id: "a-pred10",   label: "Prophète",            desc: "Réussir 10 prédictions",             val: (s) => s.counts?.predwin || 0, goal: 10, reward: { chakra: 300 } },
  { id: "a-vote25",   label: "Visionnaire",         desc: "Voter pour 25 prédictions",          val: (s) => s.counts?.predict || 0, goal: 25, reward: { chakra: 150 } },
  { id: "a-chat50",   label: "Pilier du QG",        desc: "Écrire 50 messages dans le chat",    val: (s) => s.counts?.chat || 0, goal: 50, reward: { chakra: 100 } },
];
// une faction est complète quand on a toutes ses cartes de base (hors skins)
const factionsDoneS = (s) => Object.keys(FACTIONS).filter((f) => { const cs = CARDS.filter((c) => PEOPLE[c.who].fac === f); return cs.length && cs.every((c) => hasCard(s, c.id)); }).length;
// récompense d'une bonne prédiction : fixée par Billy sur chaque question (◆), 50 par défaut
const PRED_REWARD = 50;
const predRewardOf = (q) => Math.max(0, Math.min(5000, Math.round(+(q?.reward ?? PRED_REWARD)) || 0));
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
    while (picks.length < WEEKLY_N) { h = (h * 1103515245 + 12345) >>> 0; picks.push(pool.splice(h % pool.length, 1)[0].id); }
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
// pack du jour : gratuit une fois par jour, Épique ou mieux garantie. Le thème tourne dans l'ordre
// parmi les boosters ouverts à l'épisode en cours (jamais deux jours de suite le même s'il y en a deux ou plus).
// Si le thème du jour n'est pas encore ouvert pour ce joueur, son pack du jour est un Mix.
const DAY_THEMES = ["mix", "vilains", "monde", "bande", "coffre"];
const dayNumber = (now = Date.now()) => Math.round(Date.parse(dayKey(now) + "T12:00:00Z") / 86400e3);
function dailyThemeOf(now = Date.now(), cfg = DEFAULT_CONFIG()) {
  const open = DAY_THEMES.filter((id) => dailyOpenFor(PACKS.find((p) => p.id === id), cfg, null));
  return open.length ? open[dayNumber(now) % open.length] : null;
}
function dailyPackOf(now = Date.now(), cfg = DEFAULT_CONFIG(), uid = null) {
  const id = dailyThemeOf(now, cfg), mix = PACKS.find((p) => p.id === "mix");
  let base = id ? PACKS.find((p) => p.id === id) : mix;
  if (!dailyOpenFor(base, cfg, uid)) base = mix;
  return { ...base, id: "jour", base: base.id, name: `Pack du jour · ${base.name}`, sub: "Gratuit chaque jour · Épique ou mieux garantie", daily: true,
    last: DAILY_LAST, closed: !dailyOpenFor(base, cfg, uid) };
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
// le Mix d'un joueur : toutes ses cartes débloquées (tous ses skins pour le coffre). Il complète un thème
// qui n'a pas encore la rareté tirée, pour que les chances affichées restent exactes.
const mixPoolFor = (pk, cfg, uid) => (pk.skins ? SKINS : CARDS).filter((c) => canPackFor(cfg, c, uid));
const themeSize = (pool) => new Set(pool.map((c) => c.who)).size;
// Un booster s'ouvre si son Mix a au moins une Commune (aucune carte ne monte donc jamais en rareté)
// et, pour un booster thématique, si son thème a au moins THEME_MIN persos débloqués et des cartes
// Communes, Peu communes et Rares : environ 90 % des cartes du booster viennent alors du thème.
function packOpenFor(pk, cfg, uid) {
  const pool = poolFor(pk, cfg, uid);
  if (!pool.length || !mixPoolFor(pk, cfg, uid).some((c) => c.rar === "c")) return false;
  return !pk.fac || (themeSize(pool) >= THEME_MIN && THEME_RARITIES.every((r) => pool.some((c) => c.rar === r)));
}
// le pack du jour doit en plus pouvoir tenir sa promesse : au moins une carte Épique ou mieux
const dailyOpenFor = (pk, cfg, uid) => packOpenFor(pk, cfg, uid) && mixPoolFor(pk, cfg, uid).some((c) => RANKS.indexOf(c.rar) >= 3);
// premier épisode où le booster s'ouvre pour ce joueur (null : aucun épisode prévu)
function packOpensAt(pk, cfg, uid) {
  for (let ep = progressOfCfg(cfg, uid) + 1; ep <= EP_MAX; ep++) {
    const c = { ...cfg, def: ep, progress: uid ? { ...cfg.progress, [uid]: ep } : cfg.progress };
    if (packOpenFor(pk, c, uid)) return ep;
  }
  return null;
}
// raretés absentes du thème, complétées par le Mix (à afficher au joueur)
const mixFillOf = (pk, cfg, uid) => { const pool = poolFor(pk, cfg, uid); return pk.fac ? RANKS.filter((r) => !pool.some((c) => c.rar === r)) : []; };
function configFrom(data) {
  const d = DEFAULT_CONFIG();
  return { ep: { ...d.ep, ...(data?.ep || {}) }, progress: { ...(data?.progress || {}) }, def: data?.def ?? d.def, extra: JSON.parse(JSON.stringify(data?.extra || {})), features: { ...(data?.features || {}) } };
}
const boosted = (t, k) => Object.fromEntries(Object.entries(t).map(([r, p]) => [r, r === "l" || r === "m" ? p * k : p]));
function rollWith(table, rng) {
  let r = rng() * Object.values(table).reduce((a, b) => a + b, 0);
  for (const [k, p] of Object.entries(table)) if ((r -= p) < 0) return k;
  return Object.keys(table)[0];
}
// La rareté est tirée d'abord. Le perso vient du thème ; si le thème n'a pas cette rareté, du Mix (même rareté) ;
// si le Mix non plus, de la rareté inférieure la plus proche. Jamais d'une rareté plus haute.
function pickWith(rar, pool, rng, mix = pool) {
  for (let j = RANKS.indexOf(rar); j >= 0; j--) {
    for (const list of [pool, mix]) {
      const l = list.filter((c) => c.rar === RANKS[j]);
      if (l.length) return l[Math.floor(rng() * l.length)];
    }
  }
  return null;
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
  dropDesignIfGoneS(s, id);
  return true;
}
// Ouvre un booster dans l'état `s`. Renvoie les cartes tirées, ou null si le booster n'a aucune carte débloquée.
function openPackS(s, pk, pool, rng, now = Date.now(), mix = pool) {
  if (!pool.length) return null;
  const k = pk.boost || 1;
  const divine = rng() < DIVINE_CHANCE;
  const rars = [];
  for (let i = 0; i < PACK; i++) rars.push(divine ? (i === PACK - 1 ? "m" : rollWith({ e: 70, l: 25, m: 5 }, rng)) : rollWith(boosted(i < PACK - 1 ? SLOT : pk.last || LAST, k), rng));
  // le pity ne compte que les boosters qui peuvent donner une Mythique (sinon il forcerait une carte impossible)
  const canMythic = pool.some((c) => c.rar === "m") || mix.some((c) => c.rar === "m");
  // la Légendaire garantie ne compte que les boosters qui peuvent en donner une (Légendaire ou Mythique)
  const canLegend = canMythic || pool.some((c) => c.rar === "l") || mix.some((c) => c.rar === "l");
  if (canMythic) s.sinceMythic++;
  if (canLegend) s.sinceLegend = (s.sinceLegend || 0) + 1;
  s.sinceGold++;
  if (MYTHIC_PITY && canMythic && s.sinceMythic >= MYTHIC_PITY && !rars.includes("m")) rars[PACK - 1] = "m";
  if (LEGEND_PITY && canLegend && s.sinceLegend >= LEGEND_PITY && !rars.some((r) => r === "l" || r === "m")) rars[PACK - 1] = "l";
  const cards = rars.map((r) => ({ c: pickWith(r, pool, rng, mix), gold: rng() < GOLD_CHANCE }));
  if (cards.some((x) => x.c.rar === "m")) s.sinceMythic = 0;
  if (cards.some((x) => x.c.rar === "l" || x.c.rar === "m")) s.sinceLegend = 0;
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
    const pk = dailyPackOf(now, cfg, uid);
    if (pk.closed) return { error: "Pas de pack du jour pour l'instant : aucun booster n'est encore ouvert." };
    s.dailyPack = dayKey(now);
    const r = openPackS(s, pk, poolFor(pk, cfg, uid), rng, now, mixPoolFor(pk, cfg, uid));
    trackS(s, "day", 1, now);
    if (pk.skins) { trackS(s, "coffre", 1, now); r.scenario = pickScenarioS(r.cards, rng, now); }
    return { pack: "jour", ...r };
  }
  const pk = packOfAt(packId, now), pool = poolFor(pk, cfg, uid);
  // les éditions limitées ne s'achètent pas : seulement avec un booster gratuit
  if (paid && pk.limited) return { error: `${pk.name} ne s'achète pas : ouvre-le avec un booster gratuit.` };
  if (!packOpenFor(pk, cfg, uid)) { const ep = packOpensAt(pk, cfg, uid); return { error: ep ? `Ce booster arrive avec l'épisode ${ep}. Choisis un autre booster.` : "Ce booster n'est pas encore disponible. Choisis un autre booster." }; }
  if (paid) { if (s.chakra < PRICE) return { error: `Il te faut ${PRICE} ◆ (tu en as ${s.chakra}).` }; s.chakra -= PRICE; }
  else { if (!s.free) return { error: "Plus de booster gratuit pour l'instant." }; if (s.free === FREE_MAX) s.freeTs = now; s.free--; }
  const r = openPackS(s, pk, pool, rng, now, mixPoolFor(pk, cfg, uid));
  if (pk.skins) { trackS(s, "coffre", 1, now); r.scenario = pickScenarioS(r.cards, rng, now); }
  return { pack: pk.id, ...r };
}
// Ouvre 1 ou 2 boosters d'un coup. 2 boosters = 10 cartes = un coffre (avec scénario).
// Tout est vérifié avant de prendre quoi que ce soit : jamais un seul des deux débité.
const openEv = (r) => ({ open: r.cards.map((x) => ({ rar: CARD_BY_ID[x.id].rar, gold: x.gold })), divine: r.divine });
function openManyS(s, packId, paid, n, cfg, uid, rng, now = Date.now()) {
  n = n === 2 ? 2 : 1;
  if (n === 1) { const r = takeAndOpenS(s, packId, paid, cfg, uid, rng, now); if (!r.error) r.titles = grantTitlesS(s, openEv(r), now); return r; }
  if (packId === "jour") return { error: "Le pack du jour s'ouvre un seul à la fois." };
  regenS(s, now);
  if (paid && s.chakra < PRICE * n) return { error: `Il te faut ${PRICE * n} ◆ (tu en as ${s.chakra}).` };
  if (!paid && (s.free || 0) < n) return { error: `Il te faut ${n} boosters gratuits (tu en as ${s.free || 0}).` };
  const runs = [];
  for (let k = 0; k < n; k++) { const r = takeAndOpenS(s, packId, paid, cfg, uid, rng, now); if (r.error) return r; runs.push(r); }
  const cards = runs.flatMap((r) => r.cards), divine = runs.some((r) => r.divine);
  return { pack: runs[0].pack, n, cards, divine, scenario: pickScenarioS(cards, rng, now), titles: grantTitlesS(s, openEv({ cards, divine }), now) };
}
function packChance(rar, k = 1, last = LAST) {
  const a = boosted(SLOT, k), b = boosted(last, k);
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
  // une Commune au moins : le tirage ne remonte jamais en rareté, il trouve donc toujours un skin
  if (!pool.some((c) => c.rar === "c")) return { error: "Aucun skin n'est encore débloqué pour toi." };
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
  const firsts = Object.values(s.owned).map((o) => o.first).filter(Boolean);
  return { cards, unique, gold, total, mythics, skins, opened: s.opened, sales: s.sales || 0, trades: s.trades || 0,
    ach: Object.keys(s.ach || {}).length, predwin: s.counts?.predwin || 0, since: s.created || (firsts.length ? Math.min(...firsts) : 0) };
}
const itemsValue = (items) => (items || []).reduce((a, it) => a + (CARD_BY_ID[it.id] ? cardValue(it.id, it.gold) * (it.n || 1) : 0), 0);
function tradeFair(give, want, chakraGive = 0) {
  const a = itemsValue(give) + chakraGive, b = itemsValue(want);
  if (Math.max(a, b) <= TRADE_FREE_VALUE) return true;
  return Math.min(a, b) * TRADE_MAX_RATIO >= Math.max(a, b);
}
// Une collection d'invité est-elle plausible ? (sinon on ne l'importe pas sur le compte)
// Reprise d'une sauvegarde venue du navigateur (partie en invité ou ancienne version du site).
// Rien de ce qu'elle contient ne peut être vérifié : on repart d'un compte neuf et on ne reprend
// que quelques cartes peu précieuses. Boosters, essence, compteurs, cartes dorées et récompenses
// déjà réclamées ne sont jamais repris.
const IMPORT_RARITIES = ["c", "pc"];
const IMPORT_MAX_CARDS = 50;
function importSaveS(cand, now = Date.now()) {
  const src = cand && typeof cand === "object" ? cand : {};
  const owned = src.owned && typeof src.owned === "object" ? src.owned : {};
  const s = freshSave(now);
  let left = IMPORT_MAX_CARDS;
  for (const [id, o] of Object.entries(owned)) {
    const c = CARD_BY_ID[id];
    if (!c || !IMPORT_RARITIES.includes(c.rar) || left <= 0) continue;
    const n = Math.min(left, Math.max(0, Math.floor(+o?.n || 0)));
    if (!n) continue;
    const first = +o.first > 0 && +o.first <= now ? +o.first : now;
    s.owned[id] = { n, gold: 0, first };
    left -= n;
  }
  s.wish = (Array.isArray(src.wish) ? src.wish : []).filter((id) => CARD_BY_ID[id]).slice(0, 300);
  if (PACKS.some((p) => p.id === src.pack)) s.pack = src.pack;
  s.imported = { at: now, cards: IMPORT_MAX_CARDS - left };
  return s;
}
// Un vote compte s'il a été enregistré avant la fermeture de la question.
// Les votes d'avant cette règle n'ont pas d'heure : ils restent valables.
const predVoteOk = (q, v) => { const at = v?.at?.[q.id]; return !(q.closedAt && at && at > q.closedAt); };

// ===== Cosmétiques : Boutique Arcanique, Sanctuaire des Invocations, Atelier Arcanique =====
// Aucun cosmétique ne donne de bonus. Ils ne cachent jamais le visage : cadres et auras autour de la carte,
// ornements au-dessus, holographie et particules en voile léger, fond derrière l'illustration.
// Deux natures : « compte » (achetés en boutique, réutilisables sur toutes tes cartes, non transférables)
// et « instance » (obtenues au Sanctuaire, uniques, une carte à la fois, transférables avec la carte).
const COS_SLOTS = [
  { id: "cadre", label: "Cadre" }, { id: "aura", label: "Aura" }, { id: "orn", label: "Ornement" },
  { id: "holo", label: "Holographie" }, { id: "part", label: "Particules" }, { id: "fond", label: "Fond" }, { id: "pres", label: "Présentation" },
];
// k : variante de rendu ; c1, c2 : couleurs ; only : « sanctuaire » si l'objet ne s'achète pas en boutique
const COSMETICS = [
  { id: "cadre-argent", slot: "cadre", name: "Cadre d'argent", rar: "c", k: "metal", c1: "#e8ecf2", c2: "#8a93a3" },
  { id: "cadre-cuivre", slot: "cadre", name: "Cadre de cuivre", rar: "c", k: "metal", c1: "#f0b07a", c2: "#8a4a20" },
  { id: "cadre-or", slot: "cadre", name: "Cadre d'or", rar: "pc", k: "metal", c1: "#fff0b0", c2: "#b8862a" },
  { id: "cadre-neon", slot: "cadre", name: "Cadre néon", rar: "r", k: "neon", c1: "#4dd6ff", c2: "#2a6fff" },
  { id: "cadre-sang", slot: "cadre", name: "Cadre de sang", rar: "r", k: "neon", c1: "#ff4d5e", c2: "#7a0f1c" },
  { id: "cadre-emeraude", slot: "cadre", name: "Cadre d'émeraude", rar: "e", k: "gem", c1: "#5af2a0", c2: "#0f6a44" },
  { id: "cadre-amethyste", slot: "cadre", name: "Cadre d'améthyste", rar: "e", k: "gem", c1: "#d9a0ff", c2: "#5a2a9e" },
  { id: "cadre-obsidienne", slot: "cadre", name: "Cadre d'obsidienne", rar: "l", k: "gem", c1: "#9a8ab8", c2: "#120e18" },
  { id: "cadre-prisme", slot: "cadre", name: "Cadre prismatique", rar: "m", k: "prisme", c1: "#ff4d9e", c2: "#4dd6ff", only: "sanctuaire" },
  { id: "aura-braise", slot: "aura", name: "Aura de braise", rar: "pc", k: "pulse", c1: "#ff7a2e" },
  { id: "aura-givre", slot: "aura", name: "Aura de givre", rar: "pc", k: "pulse", c1: "#8fe3ff" },
  { id: "aura-sylve", slot: "aura", name: "Aura de sylve", rar: "r", k: "pulse", c1: "#5ad17a" },
  { id: "aura-neant", slot: "aura", name: "Aura du néant", rar: "e", k: "flow", c1: "#8a4dff" },
  { id: "aura-solaire", slot: "aura", name: "Aura solaire", rar: "e", k: "flow", c1: "#ffd24d" },
  { id: "aura-spectre", slot: "aura", name: "Aura spectrale", rar: "l", k: "flow", c1: "#e8f4ff" },
  { id: "aura-ecarlate", slot: "aura", name: "Aura écarlate", rar: "m", k: "flow", c1: "#ff2e4d", only: "sanctuaire" },
  { id: "orn-etoile", slot: "orn", name: "Étoile du QG", rar: "c", k: "etoile", c1: "#f5c518" },
  { id: "orn-kanji", slot: "orn", name: "Emblème flottant", rar: "pc", k: "kanji", c1: "#ff4d2e" },
  { id: "orn-aureole", slot: "orn", name: "Auréole", rar: "r", k: "aureole", c1: "#fff3b0" },
  { id: "orn-cornes", slot: "orn", name: "Cornes d'ombre", rar: "r", k: "cornes", c1: "#3a2a4a" },
  { id: "orn-couronne", slot: "orn", name: "Couronne d'or", rar: "e", k: "couronne", c1: "#f5c518" },
  { id: "orn-ailes-lumiere", slot: "orn", name: "Ailes de lumière", rar: "l", k: "ailes", c1: "#fff8e0" },
  { id: "orn-ailes-ombre", slot: "orn", name: "Ailes d'ombre", rar: "l", k: "ailes", c1: "#2a1a3a", only: "sanctuaire" },
  { id: "holo-nacre", slot: "holo", name: "Nacre", rar: "pc", k: "nacre" },
  { id: "holo-arcenciel", slot: "holo", name: "Arc-en-ciel", rar: "r", k: "arcenciel" },
  { id: "holo-scintille", slot: "holo", name: "Scintillement", rar: "e", k: "scintille" },
  { id: "holo-prisme", slot: "holo", name: "Prisme vivant", rar: "l", k: "prisme" },
  { id: "holo-glitch", slot: "holo", name: "Faille du néant", rar: "m", k: "glitch", only: "sanctuaire" },
  { id: "part-etincelles", slot: "part", name: "Étincelles", rar: "c", k: "etincelles", c1: "#ffd24d" },
  { id: "part-flocons", slot: "part", name: "Flocons", rar: "pc", k: "flocons", c1: "#e8f4ff" },
  { id: "part-petales", slot: "part", name: "Pétales", rar: "r", k: "petales", c1: "#ff9ec4" },
  { id: "part-braises", slot: "part", name: "Braises", rar: "r", k: "braises", c1: "#ff6a2e" },
  { id: "part-lucioles", slot: "part", name: "Lucioles", rar: "e", k: "lucioles", c1: "#c8ff6a" },
  { id: "part-runes", slot: "part", name: "Runes du sceau", rar: "l", k: "runes", c1: "#b072ff", only: "sanctuaire" },
  { id: "fond-nuit", slot: "fond", name: "Nuit étoilée", rar: "c", k: "nuit", c1: "#0d1430", c2: "#2a3a80" },
  { id: "fond-crepuscule", slot: "fond", name: "Crépuscule", rar: "c", k: "degrade", c1: "#3a1440", c2: "#c8642a" },
  { id: "fond-abysse", slot: "fond", name: "Abysse", rar: "pc", k: "degrade", c1: "#02141c", c2: "#0f6a8a" },
  { id: "fond-forge", slot: "fond", name: "Forge", rar: "r", k: "degrade", c1: "#1a0a04", c2: "#c84a1a" },
  { id: "fond-aurore", slot: "fond", name: "Aurore boréale", rar: "e", k: "aurore", c1: "#0a1a2a", c2: "#3affb0" },
  { id: "fond-washi", slot: "fond", name: "Papier washi", rar: "l", k: "washi", c1: "#3a3022", c2: "#7a6a48" },
  { id: "pres-flotte", slot: "pres", name: "Flottement", rar: "pc", k: "flotte" },
  { id: "pres-incline", slot: "pres", name: "Inclinaison 3D", rar: "r", k: "incline" },
  { id: "pres-projecteur", slot: "pres", name: "Projecteur", rar: "e", k: "projecteur" },
  { id: "pres-orbite", slot: "pres", name: "Orbite lente", rar: "l", k: "orbite", only: "sanctuaire" },
];
const COS_BY_ID = Object.fromEntries(COSMETICS.map((c) => [c.id, c]));

// ===== Créations de l'admin et du dev : persos, cartes et cosmétiques ajoutés ou retouchés depuis l'app =====
// data = { people: { who: champs }, cards: { id: champs }, cos: { id: champs } } (doc « creations/catalog »).
// Un id du jeu de base = retouche (champs remplacés) ; un id nouveau = ajout. Repart toujours du jeu de base :
// appliquer deux fois la même chose donne le même catalogue.
const CREA_BASE = { people: JSON.parse(JSON.stringify(PEOPLE)), cards: CARDS.map((c) => ({ ...c })), cos: COSMETICS.map((c) => ({ ...c })) };
const refill = (obj, entries) => { for (const k of Object.keys(obj)) delete obj[k]; Object.assign(obj, Object.fromEntries(entries)); };
function applyCreations(data) {
  const d = data || {}, P = d.people || {}, C = d.cards || {}, Z = d.cos || {};
  refill(PEOPLE, [...Object.entries(CREA_BASE.people).map(([k, p]) => [k, { ...p, ...(P[k] || {}) }]), ...Object.entries(P).filter(([k]) => !CREA_BASE.people[k])]);
  const baseIds = new Set(CREA_BASE.cards.map((c) => c.id));
  CARDS.splice(0, CARDS.length, ...CREA_BASE.cards.map((c) => ({ ...c, ...(C[c.id] || {}), id: c.id })),
    ...Object.entries(C).filter(([id, c]) => !baseIds.has(id) && PEOPLE[c.who]).map(([id, c]) => ({ ...c, id })));
  SKINNED.splice(0, SKINNED.length, ...Object.keys(PEOPLE).filter((k) => PEOPLE[k].fac === "irl"));
  SKINS.splice(0, SKINS.length, ...SKINNED.flatMap((who) => SKIN_LINES.map((l) => ({ id: `${who}-sk-${l.id}`, who, skin: l.id, title: `Skin ${l.name}`, rar: l.rar, ...(C[`${who}-sk-${l.id}`] || {}) }))));
  ALL_CARDS.splice(0, ALL_CARDS.length, ...CARDS, ...SKINS);
  refill(CARD_BY_ID, ALL_CARDS.map((c) => [c.id, c]));
  refill(CATALOG_NO, [...ALL_CARDS].sort((a, b) => RANKS.indexOf(b.rar) - RANKS.indexOf(a.rar) || a.id.localeCompare(b.id)).map((c, i) => [c.id, i + 1]));
  const cosBase = new Set(CREA_BASE.cos.map((c) => c.id));
  COSMETICS.splice(0, COSMETICS.length, ...CREA_BASE.cos.map((c) => ({ ...c, ...(Z[c.id] || {}), id: c.id })), ...Object.entries(Z).filter(([id]) => !cosBase.has(id)).map(([id, c]) => ({ ...c, id })));
  refill(COS_BY_ID, COSMETICS.map((c) => [c.id, c]));
  const all = ACHIEVEMENTS.find((a) => a.id === "a-all"); if (all) all.goal = ALL_CARDS.length;
}
// --- valeurs PROVISOIRES (à valider) : prix en boutique, coût et probabilités des invocations ---
const COS_PRICE = { c: 60, pc: 120, r: 250, e: 500, l: 1000, m: 2000 };
const SUMMON_COST = 150;              // une invocation ; ×5 coûte 5 fois ce prix moins la remise
const SUMMON_DISCOUNT_5 = 0.1;        // ×5 : 10 % moins cher
const SUMMON_RATES = { c: 42, pc: 30, r: 18, e: 7.5, l: 2.1, m: 0.4 };
const SUMMON_PITY_M = 0;              // Mythique garantie au bout de N invocations (0 = jamais)
const SUMMON_PITY_L = 50;             // une Légendaire ou mieux garantie au plus tard à la 50e invocation (provisoire)
const SUMMON_5_FLOOR = "r";           // ×5 et ×10 : au moins une Rare ou mieux
const SUMMON_10_FLOOR = "e";          // ×10 : au moins une Épique ou mieux
const SUMMON_COUNTS = [1, 5, 10];     // ×1 : une carte ; ×5 : une pochette ; ×10 : le coffre
const summonCost = (n) => (n >= 5 ? Math.round(SUMMON_COST * n * (1 - SUMMON_DISCOUNT_5)) : SUMMON_COST * n);
function cosOf(s) {
  const c = s.cos && typeof s.cos === "object" ? s.cos : (s.cos = {});
  if (!c.own || typeof c.own !== "object") c.own = {};
  if (!Array.isArray(c.inst)) c.inst = [];
  if (!c.designs || typeof c.designs !== "object") c.designs = {};
  if (typeof c.sinceM !== "number") c.sinceM = 0;
  if (typeof c.sinceL !== "number") c.sinceL = 0;
  return c;
}
// références d'un design : « a:<id> » pour un cosmétique de compte, « i:<instance> » pour une instance
const refCos = (s, ref) => {
  if (typeof ref !== "string") return null;
  const c = cosOf(s);
  if (ref.startsWith("a:")) { const id = ref.slice(2); return c.own[id] && COS_BY_ID[id] ? COS_BY_ID[id] : null; }
  if (ref.startsWith("i:")) { const it = c.inst.find((x) => x.i === ref.slice(2)); return it && COS_BY_ID[it.c] ? COS_BY_ID[it.c] : null; }
  return null;
};
// le design d'une carte, résolu en cosmétiques (pour l'affichage)
function designOfS(s, cardId) {
  const d = cosOf(s).designs[cardId]; if (!d) return null;
  const out = {}; for (const sl of COS_SLOTS) { const c = refCos(s, d[sl.id]); if (c && c.slot === sl.id) out[sl.id] = c.id; }
  return Object.keys(out).length ? out : null;
}
function buyCosmeticS(s, id) {
  const c = COS_BY_ID[id], cos = cosOf(s);
  if (!c) return { error: "Cet objet n'existe pas." };
  if (c.only === "sanctuaire") return { error: "Cet objet ne s'obtient qu'au Sanctuaire des Invocations." };
  if (cos.own[id]) return { error: "Tu as déjà cet objet." };
  const price = COS_PRICE[c.rar];
  if (s.chakra < price) return { error: `Il te faut ${price} ◆ (tu en as ${s.chakra}).` };
  s.chakra -= price; cos.own[id] = Date.now(); trackS(s, "shop", 1);
  return { bought: id, price };
}
const SUMMON_POOL = (rar) => COSMETICS.filter((c) => c.rar === rar);
function summonS(s, n, rng, now = Date.now()) {
  if (!SUMMON_COUNTS.includes(n)) return { error: "On invoque 1, 5 ou 10 objets à la fois." };
  const cost = summonCost(n), cos = cosOf(s);
  if (s.chakra < cost) return { error: `Il te faut ${cost} ◆ (tu en as ${s.chakra}).` };
  s.chakra -= cost;
  const rars = [];
  for (let k = 0; k < n; k++) { cos.sinceM++; cos.sinceL++; let r = rollWith(SUMMON_RATES, rng); if (SUMMON_PITY_M && cos.sinceM >= SUMMON_PITY_M) r = "m"; if (SUMMON_PITY_L && cos.sinceL >= SUMMON_PITY_L && r !== "m") r = "l"; if (r === "m") cos.sinceM = 0; if (r === "l" || r === "m") cos.sinceL = 0; rars.push(r); }
  // ×5 : au moins une Rare ou mieux
  if (n >= 5 && !rars.some((r) => RANKS.indexOf(r) >= RANKS.indexOf(SUMMON_5_FLOOR))) rars[n - 1] = SUMMON_5_FLOOR;
  if (n === 10 && !rars.some((r) => RANKS.indexOf(r) >= RANKS.indexOf(SUMMON_10_FLOOR))) rars[n - 2] = SUMMON_10_FLOOR;
  const had = new Set([...Object.keys(cos.own || {}), ...cos.inst.map((x) => x.c)]);
  const got = rars.map((r) => { const pool = SUMMON_POOL(r), c = pool[Math.floor(rng() * pool.length)]; let i; do i = (now.toString(36) + Math.floor(rng() * 1e9).toString(36)).slice(-12); while (cos.inst.some((x) => x.i === i)); cos.inst.push({ i, c: c.id, t: now }); const isNew = !had.has(c.id); had.add(c.id); return { i, id: c.id, rar: r, isNew }; });
  trackS(s, "summon", n, now);
  const titles = grantTitlesS(s, { summon: got }, now);
  // ×10 : ouvert dans le coffre, avec un scénario choisi ici comme pour les boosters
  return n === 10 ? { got, cost, titles, scenario: pickScenarioS(got, rng, now) } : { got, cost, titles };
}
// enregistre le design d'une carte ; une instance ne peut être que sur une carte à la fois (elle quitte l'ancienne)
function saveDesignS(s, cardId, design) {
  if (!CARD_BY_ID[cardId] || !hasCard(s, cardId)) return { error: "Tu n'as pas cette carte." };
  const cos = cosOf(s), clean = {};
  for (const sl of COS_SLOTS) {
    const ref = design?.[sl.id]; if (!ref) continue;
    const c = refCos(s, ref); if (!c || c.slot !== sl.id) return { error: `Objet invalide pour l'emplacement ${sl.label}.` };
    clean[sl.id] = ref;
  }
  for (const [cid, d] of Object.entries(cos.designs)) if (cid !== cardId) for (const k of Object.keys(d)) if (d[k].startsWith("i:") && Object.values(clean).includes(d[k])) delete d[k];
  if (Object.keys(clean).length) cos.designs[cardId] = clean; else delete cos.designs[cardId];
  return { design: clean };
}
// une carte qui quitte la collection perd son design (les instances retournent dans l'inventaire) et n'est plus vedette
function dropDesignIfGoneS(s, cardId) {
  if (hasCard(s, cardId)) return;
  const cos = cosOf(s); delete cos.designs[cardId];
  if (s.featured === cardId) s.featured = null;
  s.showcase = (s.showcase || []).filter((x) => x !== cardId);
}
const usedInstances = (s) => { const u = {}; for (const [cid, d] of Object.entries(cosOf(s).designs)) for (const r of Object.values(d)) if (r.startsWith("i:")) u[r.slice(2)] = cid; return u; };

// ===== Coffre arcanique : moteur de scénarios d'ouverture =====
// Un seul moteur : chaque scénario est une suite de « temps forts » (beats) joués par le navigateur.
// Le serveur tire les 5 cartes PUIS choisit le scénario d'après elles : l'animation ne change jamais le résultat,
// une feinte ne fait que retarder la vraie couleur. Poids provisoires, réglables (décision en attente).
// Temps forts disponibles (voir src/coffre.js) : nom, puis paramètres.
const CHEST_BEATS = ["insert", "turn", "tint", "ladder", "shake", "runes", "runesOut", "crystal", "crack", "burstCrystal", "keyPop", "keyBreak", "goldKey", "lidPeek", "lidFall", "blackout", "redrop", "dust", "split", "crowns", "eclipse", "twin", "coins", "gild", "sheen", "chrysalis", "column", "stars", "kanji", "orbit", "quake", "aurora", "banner", "pause", "open"];
// ctx : best (meilleure rareté), rank, n[r] (nombre par rareté), gold, news, newTop, who[], ids[], list[{id, who, rar}], hour (Paris)
const CHEST_SCENARIOS = [
  // 6 classiques
  { id: "cl-nette", cat: "classique", name: "Ouverture nette", w: 6, when: () => true, beats: [["insert"], ["turn"], ["tint"], ["shake", 1], ["open"]] },
  { id: "cl-runes", cat: "classique", name: "Runes éveillées", w: 5, when: () => true, beats: [["insert"], ["turn"], ["runes", 6], ["tint"], ["open"]] },
  { id: "cl-cristal", cat: "classique", name: "Cristal chantant", w: 5, when: () => true, beats: [["insert"], ["turn"], ["crystal", 2], ["tint"], ["open"]] },
  { id: "cl-souffle", cat: "classique", name: "Souffle arcanique", w: 4, when: () => true, beats: [["insert"], ["turn"], ["dust"], ["tint"], ["open"]] },
  { id: "cl-serrure", cat: "classique", name: "Serrure ancienne", w: 4, when: () => true, beats: [["insert"], ["turn"], ["pause", 300], ["turn"], ["tint"], ["shake", 1], ["open"]] },
  { id: "cl-echelle", cat: "classique", name: "Échelle des raretés", w: 4, when: (x) => x.rank >= 2, beats: [["insert"], ["turn"], ["ladder"], ["open"]] },
  // 7 fake drops et faux redémarrages
  { id: "fk-recalcitrante", cat: "fake", name: "Serrure récalcitrante", w: 3, when: (x) => x.rank >= 2, beats: [["insert"], ["keyPop"], ["pause", 700], ["insert"], ["turn"], ["tint"], ["shake", 2], ["open"]] },
  { id: "fk-grise", cat: "fake", name: "Fausse Commune", w: 3, when: (x) => x.rank >= 3, beats: [["insert"], ["turn"], ["tint", "c"], ["lidPeek"], ["lidFall"], ["pause", 500], ["tint"], ["shake", 2], ["open"]] },
  { id: "fk-redemarrage", cat: "fake", name: "Faux redémarrage", w: 2, when: (x) => x.rank >= 4, beats: [["insert"], ["turn"], ["tint", "pc"], ["blackout"], ["redrop"], ["runes", 8], ["tint"], ["open"]] },
  { id: "fk-extinction", cat: "fake", name: "Extinction", w: 3, when: (x) => x.best === "m", beats: [["insert"], ["turn"], ["runes", 8], ["tint", "e"], ["runesOut"], ["pause", 900], ["tint"], ["runes", 8], ["shake", 3], ["open"]] },
  { id: "fk-retombe", cat: "fake", name: "Couvercle qui retombe", w: 3, when: (x) => x.rank >= 3, beats: [["insert"], ["turn"], ["tint", "r"], ["lidPeek"], ["lidFall"], ["shake", 2], ["tint"], ["open"]] },
  { id: "fk-fele", cat: "fake", name: "Cristal fêlé", w: 3, when: (x) => x.rank >= 2, beats: [["insert"], ["turn"], ["crystal", 1], ["crack"], ["pause", 600], ["tint"], ["burstCrystal"], ["open"]] },
  { id: "fk-cle", cat: "fake", name: "Clé brisée", w: 2, when: (x) => x.gold > 0 || x.rank >= 4, beats: [["insert"], ["turn"], ["keyBreak"], ["pause", 500], ["goldKey"], ["insert"], ["turn"], ["tint"], ["open"]] },
  // 7 transformations (le coffre change selon les cartes)
  { id: "tr-trinite", cat: "transfo", name: "Trinité violette", w: 4, when: (x) => x.n.e >= 2, beats: [["insert"], ["turn"], ["tint"], ["split", "e"], ["shake", 2], ["open"]] },
  { id: "tr-couronne", cat: "transfo", name: "Double couronne", w: 5, when: (x) => x.n.l >= 2, beats: [["insert"], ["turn"], ["tint", "l"], ["crowns"], ["gild"], ["tint"], ["open"]] },
  { id: "tr-eclipse", cat: "transfo", name: "Éclipse", w: 6, when: (x) => x.n.l >= 1 && x.n.m >= 1, beats: [["insert"], ["turn"], ["tint", "l"], ["eclipse"], ["tint"], ["shake", 3], ["open"]] },
  { id: "tr-jumeaux", cat: "transfo", name: "Cœurs jumeaux", w: 7, when: (x) => x.n.m >= 2, beats: [["insert"], ["turn"], ["tint"], ["twin"], ["quake"], ["open"]] },
  { id: "tr-pluie-or", cat: "transfo", name: "Pluie d'or", w: 5, when: (x) => x.gold >= 2, beats: [["insert"], ["turn"], ["coins"], ["gild"], ["tint"], ["open"]] },
  { id: "tr-reflet", cat: "transfo", name: "Reflet doré", w: 2, when: (x) => x.gold === 1, beats: [["insert"], ["turn"], ["sheen"], ["tint"], ["open"]] },
  { id: "tr-chrysalide", cat: "transfo", name: "Chrysalide", w: 2, when: (x) => x.news >= 4 && x.rank >= 3, beats: [["insert"], ["turn"], ["chrysalis"], ["tint"], ["open"]] },
  // 6 spectaculaires
  { id: "sp-colonne", cat: "spectacle", name: "Colonne céleste", w: 4, when: (x) => x.best === "m", beats: [["insert"], ["turn"], ["tint"], ["column"], ["quake"], ["open"]] },
  { id: "sp-etoiles", cat: "spectacle", name: "Ciel d'étoiles", w: 3, when: (x) => x.rank >= 4, beats: [["insert"], ["turn"], ["stars"], ["tint"], ["open"]] },
  { id: "sp-kanji", cat: "spectacle", name: "Emblème géant", w: 3, when: (x) => x.rank >= 3 && x.newTop, beats: [["insert"], ["turn"], ["tint"], ["kanji", "零"], ["open"]] },
  { id: "sp-orbite", cat: "spectacle", name: "Orbite des cartes", w: 3, when: (x) => x.n.r + x.n.e + x.n.l + x.n.m >= 3, beats: [["insert"], ["turn"], ["tint"], ["orbit"], ["open"]] },
  { id: "sp-seisme", cat: "spectacle", name: "Séisme", w: 2, when: (x) => x.rank >= 4, beats: [["insert"], ["turn"], ["tint"], ["quake"], ["shake", 3], ["open"]] },
  { id: "sp-aurore", cat: "spectacle", name: "Aurore", w: 3, when: (x) => x.rank >= 3, beats: [["insert"], ["turn"], ["tint"], ["aurora"], ["open"]] },
  // 4 secrets (jamais annoncés au joueur avant d'être vus)
  { id: "se-createur", cat: "secret", name: "Le créateur", w: 1, when: (x) => x.list.some((c) => c.who === "billy" && RANKS.indexOf(c.rar) >= 3), beats: [["insert"], ["turn"], ["tint"], ["banner", "Billy a signé ce coffre"], ["kanji"], ["open"]] },
  { id: "se-arcenciel", cat: "secret", name: "Arc-en-ciel", w: 1, when: (x) => new Set(x.rars).size >= 5, beats: [["insert"], ["turn"], ["ladder"], ["banner", "Cinq raretés, un seul coffre"], ["aurora"], ["open"]] },
  { id: "se-minuit", cat: "secret", name: "Minuit à Shinjuku", w: 1, when: (x) => x.hour === 0 && x.rank >= 2, beats: [["insert"], ["turn"], ["blackout"], ["stars"], ["banner", "Minuit à Shinjuku"], ["tint"], ["open"]] },
  { id: "se-miroir", cat: "secret", name: "Miroir", w: 1, when: (x) => x.list.some((c, i) => RANKS.indexOf(c.rar) >= 3 && x.ids.indexOf(c.id) !== i), beats: [["insert"], ["turn"], ["tint"], ["twin"], ["banner", "Deux fois la même carte"], ["open"]] },
];
const CHEST_BY_ID = Object.fromEntries(CHEST_SCENARIOS.map((x) => [x.id, x]));
// probabilités provisoires : un secret possible sort toujours ; une transformation possible sort 3 fois sur 4 ;
// sinon feinte 25 %, spectacle 35 % (si possibles), classique le reste
const CHEST_W = { transfo: 0.75, fake: 0.25, spectacle: 0.35 };
// un coffre peut contenir des cartes (boosters) ou des cosmétiques (Sanctuaire ×10)
const chestItem = (id) => CARD_BY_ID[id] || COS_BY_ID[id];
function chestCtx(cards, now = Date.now()) {
  const rars = cards.map((x) => chestItem(x.id).rar), n = Object.fromEntries(RANKS.map((r) => [r, rars.filter((x) => x === r).length]));
  const best = rars.reduce((a, r) => (RANKS.indexOf(r) > RANKS.indexOf(a) ? r : a), "c"), rank = RANKS.indexOf(best);
  let hour = new Date(now).getUTCHours();
  try { hour = +new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hourCycle: "h23" }).formatToParts(new Date(now)).find((p) => p.type === "hour").value; } catch (e) {}
  return { best, rank, n, rars, gold: cards.filter((x) => x.gold).length, news: cards.filter((x) => x.isNew).length, newTop: cards.some((x) => x.isNew && chestItem(x.id).rar === best),
    who: cards.map((x) => chestItem(x.id).who), ids: cards.map((x) => x.id), list: cards.map((x) => ({ id: x.id, who: chestItem(x.id).who, rar: chestItem(x.id).rar })), hour };
}
const chestEligible = (ctx) => CHEST_SCENARIOS.filter((x) => x.when(ctx));
function pickWeighted(list, rng) { const tot = list.reduce((a, x) => a + x.w, 0); let v = rng() * tot; for (const x of list) { v -= x.w; if (v < 0) return x; } return list[list.length - 1]; }
function pickScenarioS(cards, rng, now = Date.now()) {
  const el = chestEligible(chestCtx(cards, now)), of = (cat) => el.filter((x) => x.cat === cat);
  if (of("secret").length) return pickWeighted(of("secret"), rng).id;
  if (of("transfo").length && rng() < CHEST_W.transfo) return pickWeighted(of("transfo"), rng).id;
  if (of("fake").length && rng() < CHEST_W.fake) return pickWeighted(of("fake"), rng).id;
  if (of("spectacle").length && rng() < CHEST_W.spectacle) return pickWeighted(of("spectacle"), rng).id;
  return pickWeighted(of("classique"), rng).id;
}

// ===== Laboratoire admin : une partie de test isolée (jamais la vraie sauvegarde) =====
const LAB_START = { chakra: 100000, free: 99 };
// ouverture imposée : 5 cartes choisies et un scénario au choix ; rien n'est tiré
function labForcedOpenS(s, picks, now = Date.now()) {
  const list = (Array.isArray(picks) ? picks : []).slice(0, PACK).filter((x) => CARD_BY_ID[x?.id]);
  if (list.length !== PACK) return { error: `Choisis exactement ${PACK} cartes.` };
  const cards = list.map((x) => ({ id: x.id, gold: !!x.gold, isNew: addCardS(s, x.id, !!x.gold, now) }));
  s.opened++;
  return { cards };
}
function labSummonForcedS(s, rars, rng, now = Date.now()) {
  const list = (Array.isArray(rars) ? rars : []).filter((r) => RANKS.includes(r));
  if (!SUMMON_COUNTS.includes(list.length)) return { error: "Choisis 1, 5 ou 10 raretés." };
  const cos = cosOf(s);
  const got = list.map((r) => { const pool = SUMMON_POOL(r), c = pool[Math.floor(rng() * pool.length)]; let i; do i = "lab" + Math.floor(rng() * 1e9).toString(36); while (cos.inst.some((x) => x.i === i)); cos.inst.push({ i, c: c.id, t: now }); return { i, id: c.id, rar: r, isNew: false }; });
  return list.length === 10 ? { got, cost: 0, scenario: pickScenarioS(got, rng, now) } : { got, cost: 0 };
}

// ===== Défilé des Légendes =====
// Billy ouvre les inscriptions, puis les votes, puis clôt. Valeurs provisoires, en attente de validation.
const DEFILE_REWARDS = [300, 150, 75];         // essence des 3 premiers (provisoire)
const DEFILE_PARTICIPATION = 20;               // essence de participation (provisoire)
const DEFILE_TITLES = ["Légende du Défilé", "Étoile du Défilé", "Éclat du Défilé"]; // titres personnels, jamais transférés
const DEFILE_TITLE_IDS = ["defile-1", "defile-2", "defile-3"];
const DEFILE_VOTE_MIN_OPENED = 10;             // anti-comptes jetables : boosters ouverts pour voter
const DEFILE_VOTE_MIN_DAYS = 3;                // et ancienneté du compte
const DEFILE_HALL_DAYS = 7;                    // le gagnant reste à l'accueil une semaine
const defileCanVote = (s, member, now = Date.now()) => !!member && s.opened >= DEFILE_VOTE_MIN_OPENED && now - (s.created || now) >= DEFILE_VOTE_MIN_DAYS * 86400e3;

// ===== Titres : gagnés en jouant, jamais achetés ni échangés ; chacun en choisit un à afficher près de son pseudo =====
// Deux sortes : ceux d'un coup d'éclat (une ouverture, une invocation : le résultat les donne tout de suite)
// et ceux de progression (compteurs de la sauvegarde : vérifiés après chaque action).
const TITLE_CATS = { ouverture: "Ouvertures", invocation: "Invocations", confrontation: "Confrontation", defile: "Défilé", collection: "Collection", oracle: "Prédictions" };
const rarCount = (list, test) => list.filter((x) => test(RANKS.indexOf(x.rar))).length;
const TITLES = [
  { id: "o-2l", name: "Double couronne", kanji: "冠", cat: "ouverture", rar: "l", desc: "Deux Légendaires dans la même ouverture", hit: (o) => rarCount(o.open, (r) => r === 4) >= 2 },
  { id: "o-2m", name: "Cœurs jumeaux", kanji: "双", cat: "ouverture", rar: "m", desc: "Deux Mythiques dans la même ouverture", hit: (o) => rarCount(o.open, (r) => r === 5) >= 2 },
  { id: "o-lm", name: "Alignement des astres", kanji: "星", cat: "ouverture", rar: "m", desc: "Une Légendaire et une Mythique dans la même ouverture", hit: (o) => rarCount(o.open, (r) => r === 4) >= 1 && rarCount(o.open, (r) => r === 5) >= 1 },
  { id: "o-3e", name: "Trinité", kanji: "三", cat: "ouverture", rar: "e", desc: "Trois Épiques ou mieux dans la même ouverture", hit: (o) => rarCount(o.open, (r) => r >= 3) >= 3 },
  { id: "o-rainbow", name: "Arc-en-ciel", kanji: "虹", cat: "ouverture", rar: "e", desc: "Cinq raretés différentes dans la même ouverture", hit: (o) => new Set(o.open.map((x) => x.rar)).size >= 5 },
  { id: "o-2gold", name: "Pluie d'or", kanji: "金", cat: "ouverture", rar: "l", desc: "Deux cartes dorées dans la même ouverture", hit: (o) => o.open.filter((x) => x.gold).length >= 2 },
  { id: "o-divine", name: "Élu des dieux", kanji: "神", cat: "ouverture", rar: "l", desc: "Ouvrir un booster divin", hit: (o) => !!o.divine },
  { id: "i-2l", name: "Double prodige", kanji: "冠", cat: "invocation", rar: "l", desc: "Deux Légendaires dans la même invocation", hit: (o) => rarCount(o.summon, (r) => r === 4) >= 2 },
  { id: "i-2m", name: "Jumeaux du Sanctuaire", kanji: "双", cat: "invocation", rar: "m", desc: "Deux Mythiques dans la même invocation", hit: (o) => rarCount(o.summon, (r) => r === 5) >= 2 },
  { id: "i-m1", name: "Main bénie", kanji: "手", cat: "invocation", rar: "m", desc: "Une Mythique en invoquant un seul objet", hit: (o) => o.summon.length === 1 && o.summon[0].rar === "m" },
  { id: "i-100", name: "Pilier du Sanctuaire", kanji: "召", cat: "invocation", rar: "e", desc: "Invoquer 100 objets", val: (s) => s.counts?.summon || 0, goal: 100 },
  { id: "c-win1", name: "Première victoire", kanji: "勝", cat: "confrontation", rar: "r", desc: "Gagner une partie de Confrontation", val: (s) => s.counts?.cfWin || 0, goal: 1 },
  { id: "c-gardien", name: "Rempart du QG", kanji: "盾", cat: "confrontation", rar: "e", desc: "Gagner en Gardien", val: (s) => s.counts?.cfWin_gardien || 0, goal: 1 },
  { id: "c-sentinelle", name: "Œil de la Sentinelle", kanji: "目", cat: "confrontation", rar: "e", desc: "Gagner en Sentinelle", val: (s) => s.counts?.cfWin_sentinelle || 0, goal: 1 },
  { id: "c-briseur", name: "Briseur de sceaux", kanji: "破", cat: "confrontation", rar: "e", desc: "Gagner en Briseur", val: (s) => s.counts?.cfWin_briseur || 0, goal: 1 },
  { id: "c-1pv", name: "Sur le fil", kanji: "糸", cat: "confrontation", rar: "l", desc: "Gagner en finissant à 1 PV", val: (s) => s.counts?.cfWin1pv || 0, goal: 1 },
  { id: "c-table7", name: "Maître de la grande table", kanji: "卓", cat: "confrontation", rar: "l", desc: "Gagner une partie à 7 joueurs", val: (s) => s.counts?.cfWin7 || 0, goal: 1 },
  { id: "c-win10", name: "Champion de l'arène", kanji: "王", cat: "confrontation", rar: "l", desc: "Gagner 10 parties", val: (s) => s.counts?.cfWin || 0, goal: 10 },
  { id: "c-win50", name: "Légende de l'arène", kanji: "龍", cat: "confrontation", rar: "m", desc: "Gagner 50 parties", val: (s) => s.counts?.cfWin || 0, goal: 50 },
  { id: "defile-1", name: DEFILE_TITLES[0], kanji: "華", cat: "defile", rar: "m", desc: "Finir 1er d'un Défilé des Légendes", val: (s) => s.counts?.defile1 || 0, goal: 1 },
  { id: "defile-2", name: DEFILE_TITLES[1], kanji: "華", cat: "defile", rar: "l", desc: "Finir 2e d'un Défilé des Légendes", val: (s) => s.counts?.defile2 || 0, goal: 1 },
  { id: "defile-3", name: DEFILE_TITLES[2], kanji: "華", cat: "defile", rar: "e", desc: "Finir 3e d'un Défilé des Légendes", val: (s) => s.counts?.defile3 || 0, goal: 1 },
  { id: "d-part5", name: "Habitué du Défilé", kanji: "幕", cat: "defile", rar: "r", desc: "Participer à 5 Défilés", val: (s) => s.counts?.defile || 0, goal: 5 },
  { id: "k-fac1", name: "Gardien d'album", kanji: "冊", cat: "collection", rar: "r", desc: "Compléter une faction", val: (s) => factionsDoneS(s), goal: 1 },
  { id: "k-myth5", name: "Panthéon vivant", kanji: "殿", cat: "collection", rar: "l", desc: "Posséder 5 Mythiques différentes", val: (s) => statsS(s).mythics, goal: 5 },
  { id: "k-all", name: "Mémoire du QG", kanji: "零", cat: "collection", rar: "m", desc: "Posséder toutes les cartes", val: (s) => statsS(s).unique, goal: () => ALL_CARDS.length },
  { id: "p-10", name: "Oracle de Shinjuku", kanji: "占", cat: "oracle", rar: "e", desc: "Réussir 10 prédictions", val: (s) => s.counts?.predwin || 0, goal: 10 },
  { id: "p-25", name: "Voix du destin", kanji: "予", cat: "oracle", rar: "l", desc: "Réussir 25 prédictions", val: (s) => s.counts?.predwin || 0, goal: 25 },
];
const TITLE_BY_ID = Object.fromEntries(TITLES.map((t) => [t.id, t]));
const titleGoal = (t) => (typeof t.goal === "function" ? t.goal() : t.goal);
// ancienne forme : le nom du titre au lieu de son identifiant (titres du Défilé d'avant)
const titleIdOf = (x) => (TITLE_BY_ID[x] ? x : TITLES.find((t) => t.name === x)?.id || null);
// donne les titres gagnés : ev = { open: [{rar, gold}], divine } ou { summon: [{rar}] } pour un coup d'éclat ; sans ev, les compteurs
function grantTitlesS(s, ev = null, now = Date.now()) {
  const have = new Set(s.titles || []), got = [];
  for (const t of TITLES) {
    if (have.has(t.id)) continue;
    const ok = t.hit ? !!ev && ((ev.open && t.cat === "ouverture") || (ev.summon && t.cat === "invocation")) && t.hit(ev) : t.val(s) >= titleGoal(t);
    if (ok) { got.push(t.id); have.add(t.id); }
  }
  if (got.length) { s.titles = [...have]; s.titleAt = { ...(s.titleAt || {}), ...Object.fromEntries(got.map((id) => [id, now])) }; if (!s.titleShown) s.titleShown = got[got.length - 1]; }
  return got;
}
// le titre affiché : un de ceux qu'on a, ou aucun
function showTitleS(s, id) {
  if (id && !(s.titles || []).includes(id)) return { error: "Tu n'as pas encore ce titre." };
  s.titleShown = id || null; return { titleShown: s.titleShown };
}
const titlesProgressS = (s) => TITLES.map((t) => ({ id: t.id, own: (s.titles || []).includes(t.id), prog: t.val ? Math.min(titleGoal(t), t.val(s)) : null, goal: t.val ? titleGoal(t) : null }));
// classement : plus de votes d'abord ; à égalité, l'inscription la plus ancienne passe devant
function defileRank(d) {
  const n = {}; for (const e of Object.values(d.votes || {})) n[e] = (n[e] || 0) + 1;
  return Object.entries(d.entries || {}).filter(([, e]) => !e.removed).map(([uid, e]) => ({ uid, votes: n[uid] || 0, t: e.t }))
    .sort((a, b) => b.votes - a.votes || a.t - b.t);
}

// ===== Marché des créations : vendre une carte avec son design =====
// Seules les instances uniques (Sanctuaire) voyagent avec la carte ; les cosmétiques de compte restent au vendeur
// et ne sont montrés qu'en aperçu. Les instances sont sous séquestre pendant la vente.
function takeDesignForSaleS(s, cardId) {
  const cos = cosOf(s), d = cos.designs[cardId] || {}, inst = [], acct = {};
  for (const [slot, ref] of Object.entries(d)) {
    const c = refCos(s, ref); if (!c) continue;
    if (ref.startsWith("i:")) { const k = cos.inst.findIndex((x) => x.i === ref.slice(2)); if (k >= 0) { inst.push({ ...cos.inst[k], slot }); cos.inst.splice(k, 1); delete d[slot]; } }
    else acct[slot] = c.id;
  }
  if (cos.designs[cardId] && !Object.keys(d).length) delete cos.designs[cardId];
  return { inst, acct };
}
// donne les instances (achat, ou retour au vendeur) et les pose sur la carte reçue
function giveDesignS(s, cardId, inst, now = Date.now()) {
  const cos = cosOf(s); if (!inst?.length) return;
  const d = { ...(cos.designs[cardId] || {}) };
  for (const it of inst) { if (!COS_BY_ID[it.c] || cos.inst.some((x) => x.i === it.i)) continue; cos.inst.push({ i: it.i, c: it.c, t: it.t || now }); d[it.slot || COS_BY_ID[it.c].slot] = "i:" + it.i; }
  if (hasCard(s, cardId)) cos.designs[cardId] = d;
}

// ===== Interrupteurs par fonctionnalité (réglés par l'admin dans config/game, sans redéployer) =====
// Absent = activé. Permet de déployer le code puis d'ouvrir chaque nouveauté quand ses valeurs sont validées.
const FEATURES = [["boutique", "Boutique Arcanique"], ["sanctuaire", "Sanctuaire des Invocations"], ["defile", "Défilé des Légendes"], ["marcheDesign", "Vente avec design au marché"], ["confrontation", "Re Zéro : Confrontation"]];
const featureOn = (cfg, f) => cfg?.features?.[f] !== false;

export { FACTIONS, PEOPLE, VARIANTS, CARDS, PACKS, RAR, RANKS, SLOT, LAST, PACK, FREE_MAX, REGEN, PRICE, GOLD_EVERY, MYTHIC_PITY, LEGEND_PITY, GOLD_CHANCE, THEME_MIN, THEME_RARITIES, DAILY_LAST, STREAK, DAILY_N, WEEKLY_N, MISSIONS, LIMITED_END, EP1, EP_MAX, HIDDEN, DEFAULT_CONFIG, SKIN_LINES, SKINNED, SKINS, ALL_CARDS, CARD_BY_ID, CATALOG_NO, MARKET_FEE, marketNet, MARKET_MIN_OPENED, CRAFT_COST, TRADE_FREE_VALUE, TRADE_MAX_RATIO, DIVINE_CHANCE, dayKey, prevDay, freshSave, normalizeSave, ownOf, hasCard, regenS, ensureDailyS, trackS, WEEKLY, DAILY_BONUS, WEEKLY_BONUS, CF_REWARD, FIRST_STEPS, FIRST_BONUS, ACHIEVEMENTS, factionsDoneS, PRED_REWARD, predRewardOf, weekKey, ensureWeeklyS, weeklyS, firstStepsS, achievementsS, claimAnyS, claimableCountS, DAY_THEMES, dayNumber, dailyThemeOf, dailyPackOf, missionsTodayS, streakStateS, giveRewardS, claimStreakS, claimMissionS, limitedOnAt, packsAt, packOfAt, epOfCfg, progressOfCfg, unlockedFor, canPackFor, poolFor, mixPoolFor, themeSize, packOpenFor, dailyOpenFor, packOpensAt, mixFillOf, configFrom, boosted, rollWith, pickWith, addCardS, removeCardS, openPackS, takeAndOpenS, openEv, openManyS, packChance, cardValue, dupesValueS, recycleS, disenchantS, craftableDupes, craftS, statsS, itemsValue, tradeFair, IMPORT_RARITIES, IMPORT_MAX_CARDS, importSaveS, predVoteOk, COS_SLOTS, COSMETICS, COS_BY_ID, CREA_BASE, refill, applyCreations, COS_PRICE, SUMMON_COST, SUMMON_DISCOUNT_5, SUMMON_RATES, SUMMON_PITY_M, SUMMON_PITY_L, SUMMON_5_FLOOR, SUMMON_10_FLOOR, SUMMON_COUNTS, summonCost, cosOf, refCos, designOfS, buyCosmeticS, SUMMON_POOL, summonS, saveDesignS, dropDesignIfGoneS, usedInstances, CHEST_BEATS, CHEST_SCENARIOS, CHEST_BY_ID, CHEST_W, chestItem, chestCtx, chestEligible, pickWeighted, pickScenarioS, LAB_START, labForcedOpenS, labSummonForcedS, DEFILE_REWARDS, DEFILE_PARTICIPATION, DEFILE_TITLES, DEFILE_TITLE_IDS, DEFILE_VOTE_MIN_OPENED, DEFILE_VOTE_MIN_DAYS, DEFILE_HALL_DAYS, defileCanVote, TITLE_CATS, rarCount, TITLES, TITLE_BY_ID, titleGoal, titleIdOf, grantTitlesS, showTitleS, titlesProgressS, defileRank, takeDesignForSaleS, giveDesignS, FEATURES, featureOn };
