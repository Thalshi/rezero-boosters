# Confrontation · catalogue des cartes d'action

Source de vérité du code : `worker/confront/cards.mjs` (données) et `worker/confront/engine.mjs` (règles). Ce document les décrit pour les humains ; en cas d'écart, c'est le code et ses tests (`tests/confront-engine.mjs`) qui font foi, et ce document doit être corrigé.

## Principes

- **La pioche d'action est partagée** par tous les joueurs de la table et **n'a rien à voir avec les cartes de collection** : on ne l'achète pas, on ne la gagne pas, on ne la garde pas après la partie. Elle est identique pour tous les modes (2 à 7 joueurs) : seules quelques règles changent selon la taille de la table (indiquées carte par carte).
- **82 cartes**, dans un ordre fixe au départ puis mélangées par le serveur. Chaque carte a un identifiant (`a0` à `a81`), une sorte, un **signe** et un **rang**.
- **Signes** (pour les présages) : Feu 火, Eau 水, Vent 風, Terre 土. Ils tournent carte par carte : 21 Feu, 21 Eau, 20 Vent, 20 Terre. **Rangs** de 1 à 10.
- **Présage** : on retourne la carte du dessus de la pioche, on lit son signe (et parfois son rang), puis elle part à la défausse. La branche Chance retourne 2 cartes et garde le meilleur résultat.

| Présage | Réussite | Probabilité (1 carte) | Avec Chance (2 cartes) |
|---|---|---|---|
| Voile de brume, Défense (4 à 7 joueurs) | Eau | 25,6 % | 44,9 % |
| Défense à 2 ou 3 joueurs | Eau ou Vent | 50,0 % | 75,3 % |
| Reprise de Précision | Feu ou Vent | 50,0 % | 75,3 % |
| Se libérer d'un Sceau d'entrave | Feu | 25,6 % | 44,9 % |
| Orbe instable : explosion | Terre de rang 1 à 4 | 9,8 % | 0,8 % (il faut deux explosions) |

- **Types** : *instant* (jouée pendant ton tour puis défaussée), *réaction* (jouée hors de ton tour, en réponse), *équipement* (posé devant toi, effet persistant, une seule carte de chaque sorte devant toi, une seule arme), *différé* (posé devant un joueur, agit au début de son tour).
- **Distance et portée ne sont pas la même chose.** La *distance* entre deux joueurs est le plus court chemin autour de la table, en ne comptant que les joueurs en vie (recalculée à chaque élimination), modifiée par la Cape d'ombre (+1 pour ceux qui te visent), l'Œil du hibou et la branche Précision (−1 pour toi, minimum 1). La *portée* est une propriété de ton arme : tu peux frapper un joueur si sa distance perçue est inférieure ou égale à ta portée. Sans arme, tu as la **Dague d'essence**, portée 1, que personne ne peut te prendre.
- Les noms, textes et règles sont des créations originales pour Re Zéro. Le livret de BANG! a seulement servi de référence pour la mécanique générale (un tour, une attaque de base limitée, une réaction de parade, la distance autour de la table).

## Inventaire

| Carte | Kanji | Catégorie | Type | Quantité | Moment | Portée / distance | Cible |
|---|---|---|---|---|---|---|---|
| Frappe d'essence | 撃 | attaque | instant | 22 | ton tour | portée de ton arme | un autre joueur |
| Parade | 防 | esquive | réaction | 11 | quand on te vise | sans objet | l'attaque reçue |
| Riposte runique | 返 | esquive | réaction | 2 | quand une Frappe ou Riposte te vise | portée de ton arme vers l'attaquant | l'attaquant |
| Élixir de vie | 癒 | soin | instant | 6 | ton tour, ou sauvetage à 0 PV | sans objet | toi |
| Festin du QG | 宴 | soin | instant | 1 | ton tour | toute la table | tous les joueurs en vie |
| Lien vital | 絆 | soin | instant | 2 | ton tour | n'importe quelle distance | un autre joueur blessé |
| Larcin | 盗 | vol | instant | 4 | ton tour | distance 1 | un autre joueur |
| Dissipation | 散 | défausse | instant | 4 | ton tour | n'importe quelle distance | un autre joueur |
| Inspiration | 閃 | pioche | instant | 2 | ton tour | sans objet | toi |
| Révélation | 啓 | pioche | instant | 1 | ton tour | sans objet | toi |
| Étal du marché | 市 | pioche | instant | 2 | ton tour | toute la table | tous les joueurs en vie |
| Défi de l'arène | 闘 | duel | instant | 3 | ton tour | n'importe quelle distance | un autre joueur |
| Pluie de shurikens | 雨 | zone | instant | 1 | ton tour | toute la table | tous les autres joueurs |
| Onde de choc | 震 | zone | instant | 2 | ton tour | toute la table | tous les autres joueurs |
| Lames jumelles | 双 | arme | équipement | 2 | ton tour | portée 1 | toi |
| Lance de chasse | 槍 | arme | équipement | 3 | ton tour | portée 2 | toi |
| Bâton runique | 杖 | arme | équipement | 2 | ton tour | portée 3 | toi |
| Arc des tempêtes | 弓 | arme | équipement | 1 | ton tour | portée 4 | toi |
| Canon à main | 砲 | arme | équipement | 1 | ton tour | portée 5 | toi |
| Voile de brume | 霧 | défense | équipement | 2 | ton tour (effet hors de ton tour) | sans objet | toi |
| Cape d'ombre | 影 | défense | équipement | 2 | ton tour (effet permanent) | +1 de distance vers toi | toi |
| Œil du hibou | 梟 | visée | équipement | 1 | ton tour (effet permanent) | −1 de distance vers les autres | toi |
| Kanji de garde | 護 | défense | équipement | 1 | ton tour (effet hors de ton tour) | sans objet | toi |
| Sceau d'entrave | 封 | effet différé | différé | 3 | ton tour | n'importe quelle distance | un autre joueur (jamais le Gardien) |
| Orbe instable | 爆 | effet différé, test | différé | 1 | ton tour | passe de joueur en joueur | toi, puis le suivant |
| **Total** | | | | **82** | | | |

Répartition : 22 attaques de base, 13 réactions, 9 soins, 8 vols et défausses, 5 pioches, 3 duels, 3 attaques de zone, 9 armes, 6 défenses et visées, 4 effets différés.

## Règles générales qui s'appliquent à toutes les cartes

- Tu ne joues des cartes que pendant ta phase d'actions, **sauf** les réactions (Parade, Riposte runique) et l'Élixir de vie en sauvetage.
- Une carte jouée va à la défausse, sauf les équipements et les cartes différées, qui restent posées jusqu'à ce qu'elles soient retirées (Larcin, Dissipation, remplacement d'arme, élimination, effet propre).
- **Pas de doublon devant toi** : jamais deux équipements de la même sorte (deux Capes d'ombre, par exemple). **Une seule arme** : en poser une nouvelle défausse l'ancienne.
- **Une seule Frappe par tour**, sauf : Lames jumelles (illimité), branche Assaut (2), et à 2 ou 3 joueurs une arme de portée 3 ou plus (+1).
- Quand la pioche est vide, la défausse est mélangée par le serveur pour former une nouvelle pioche.
- Le serveur vérifie tout : une carte jouée hors de son moment, sur une cible interdite ou hors de portée est refusée avec un message clair, et rien ne change.

## Les cartes une par une

### Frappe d'essence 撃 (attaque, 22)
- **Effet** : tu attaques un autre joueur dont la distance perçue est inférieure ou égale à la portée de ton arme. S'il ne réagit pas, il perd 1 PV.
- **Moment** : ton tour. **Limite** : 1 par tour (voir les exceptions plus haut).
- **Contre-jeu** : Parade, Riposte runique, Voile de brume, pouvoir Défense, Kanji de garde (absorbe la perte), Cape d'ombre (sort de portée).
- **Autre usage** : une Frappe se défausse aussi pour tenir un Défi ou pour éviter une Onde de choc. Garder une Frappe en main est donc aussi une défense.
- **Branches** : Assaut en joue 2 par tour et pioche 1 carte quand une Frappe fait perdre des PV. Précision voit à −1 et, si sa Frappe est parée, présage Feu ou Vent pour la reprendre en main ; à 2 ou 3 joueurs ses Frappes ne peuvent pas être esquivées par présage. Défense peut l'esquiver par présage. Résistance pioche quand elle lui fait perdre un PV.
- **Par mode** : à 2 et 3 joueurs la distance naturelle vaut toujours 1 : seule la Cape d'ombre peut mettre un joueur hors de portée.

### Parade 防 (esquive, 11)
- **Effet** : annule une Frappe, une Riposte runique ou la part d'une Pluie de shurikens qui te vise.
- **Moment** : hors de ton tour, quand le serveur te demande de réagir (délai : 20 s provisoires ; si tu ne réponds pas, le serveur joue ta Parade pour toi si tu en as une).
- **Restrictions** : ne se joue jamais pendant ton propre tour ; inutile contre l'Onde de choc et le Défi.
- **Branches** : Précision peut récupérer sa Frappe parée (présage). Aucune branche ne change la Parade elle-même.

### Riposte runique 返 (esquive, 2)
- **Effet** : quand une Frappe ou une Riposte te vise, tu l'annules et tu renvoies une attaque à son auteur, s'il est à portée de **ton** arme. Il peut parer, riposter à son tour, ou encaisser.
- **Restrictions** : pas contre une Pluie de shurikens. Une chaîne de Ripostes s'arrête faute de cartes.
- **Branches** : la Riposte renvoyée compte comme une attaque : Défense et Voile de brume peuvent l'esquiver ; si l'auteur de la Riposte est Assaut et qu'elle touche, il pioche.

### Élixir de vie 癒 (soin, 6)
- **Effet** : +1 PV, jamais au-dessus du maximum.
- **Moment** : pendant ton tour ; ou à n'importe quel moment, quand tu tombes à 0 PV ou moins (sauvetage), **s'il reste au moins 3 joueurs en vie** (réglage `elixirSauvetageMin`). On peut enchaîner plusieurs Élixirs pour remonter au-dessus de 0.
- **Restrictions** : refusé à PV pleins.
- **Par mode** : en duel, pas de sauvetage par Élixir (il ne sert qu'à se soigner pendant son tour), pour éviter les duels sans fin. En trio, le sauvetage marche tant que les trois sont en vie.
- **Branches** : Survie a son propre sauvetage (défausser 2 cartes). Résistance peut piocher l'Élixir qui la sauve (elle pioche avant la fenêtre de sauvetage).

### Festin du QG 宴 (soin, 1)
- **Effet** : tous les joueurs en vie gagnent 1 PV (sans dépasser leur maximum).
- **Contre-jeu** : aucun ; c'est une carte de table, elle soigne aussi tes ennemis.
- **Par mode** : en classique, elle profite autant aux Briseurs qu'au Gardien.

### Lien vital 絆 (soin, 2)
- **Effet** : tu perds 1 PV et un autre joueur blessé en gagne 1. Il te faut au moins 2 PV.
- **Restrictions** : ce n'est pas une perte de PV « subie » : elle ne déclenche ni Résistance ni le Kanji de garde.
- **Par mode** : carte originale pensée pour le mode classique : une Sentinelle peut sauver le Gardien, au risque de se dévoiler. En duel elle est presque inutile (seul autre joueur : l'adversaire).

### Larcin 盗 (vol, 4)
- **Effet** : tu prends une carte à un joueur à **distance perçue 1** (pas la portée de l'arme) : au hasard dans sa main, ou une carte précise posée devant lui (arme, équipement, Sceau, Orbe). Elle va dans ta main.
- **Secret** : une carte prise dans la main n'est montrée qu'au voleur et au volé ; les autres voient seulement « une carte de la main ».
- **Branches** : Précision et l'Œil du hibou réduisent la distance, la Cape d'ombre de la cible l'augmente.

### Dissipation 散 (défausse, 4)
- **Effet** : comme le Larcin, mais à n'importe quelle distance, et la carte va à la défausse.
- **Usage** : retirer une Cape d'ombre, un Voile de brume, une arme longue, ou délivrer un allié de son Sceau d'entrave.

### Inspiration 閃 (pioche, 2) et Révélation 啓 (pioche, 1)
- **Effet** : pioche 2 cartes (Inspiration) ou 3 cartes (Révélation).

### Étal du marché 市 (pioche, 2)
- **Effet** : le serveur retourne autant de cartes que de joueurs en vie, face visible. Chacun en prend une, en commençant par toi puis dans l'ordre du tour. Le dernier reçoit la carte restante sans choisir.
- **Délai** : 25 s provisoires par choix ; sans réponse, le serveur donne la première carte de l'étal.

### Défi de l'arène 闘 (duel, 3)
- **Effet** : tu défies un joueur à n'importe quelle distance. En commençant par lui, chacun défausse une Frappe d'essence à tour de rôle ; le premier qui ne peut pas ou ne veut pas perd 1 PV.
- **Contre-jeu** : garder des Frappes. La Parade ne sert à rien.
- **Restrictions** : ne compte pas comme une Frappe (pas de limite par tour).
- **Branches** : le défi ne passe pas par la portée : il annule l'avantage de la Cape d'ombre et des armes. Assaut ne pioche pas sur un Défi gagné (ce n'est pas une Frappe).

### Pluie de shurikens 雨 (zone, 1)
- **Effet** : attaque tous les autres joueurs, sans tenir compte de la distance, un par un dans l'ordre du tour. Chacun pare ou perd 1 PV.
- **Contre-jeu** : Parade, Voile de brume, Défense, Kanji de garde. Pas de Riposte.
- **Restrictions** : ne compte pas comme une Frappe. Si un joueur tombe et que la partie se termine (le Gardien, par exemple), les attaques restantes sont annulées : la partie s'arrête net.

### Onde de choc 震 (zone, 2)
- **Effet** : chaque autre joueur défausse une Frappe d'essence ou perd 1 PV.
- **Contre-jeu** : seulement une Frappe (pas de Parade, pas de présage).

### Les armes : Lames jumelles 双, Lance de chasse 槍, Bâton runique 杖, Arc des tempêtes 弓, Canon à main 砲 (9)
- **Effet** : remplacent la Dague d'essence. Portées 1, 2, 3, 4, 5. Les Lames jumelles (portée 1) permettent des Frappes illimitées pendant ton tour.
- **Restrictions** : une seule arme ; poser une nouvelle arme défausse l'ancienne. Une arme peut être volée (Larcin) ou défaussée (Dissipation). La Dague ne se perd jamais.
- **Traitement explicite des petites tables** (2 et 3 joueurs, distance naturelle toujours 1) : les armes gardent leur portée (utile contre la Cape d'ombre, qui porte la distance à 2) et, **à partir de la portée 3**, donnent **une Frappe de plus par tour**. Le moteur de portée reste entier : seule cette règle s'ajoute.
- **Par mode** : à 7 joueurs, la portée compte vraiment (distances de 1 à 3, 4 avec une Cape) ; à 4 joueurs, la plus grande distance naturelle est 2.

### Voile de brume 霧 (défense, 2)
- **Effet** : quand une Frappe, une Riposte ou une Pluie te vise : présage ; sur Eau, l'attaque est esquivée.
- **Branches** : cumulable avec Défense (deux présages, dans cet ordre : Voile, puis Défense). Chance retourne 2 cartes. À 2 et 3 joueurs, les Frappes de Précision ignorent ce présage.

### Cape d'ombre 影 (défense, 2)
- **Effet** : les autres joueurs te voient à 1 de distance de plus.
- **Par mode** : à 2 et 3 joueurs, c'est la seule façon d'être hors de portée d'une Dague (distance 2).

### Œil du hibou 梟 (visée, 1)
- **Effet** : tu vois les autres joueurs à 1 de distance de moins (minimum 1). Cumulable avec Précision (−2 au total).

### Kanji de garde 護 (défense, 1, carte originale)
- **Effet** : la prochaine fois que tu dois perdre des PV (Frappe, Pluie, Onde, Défi, Orbe, effondrement), tu n'en perds aucun ; puis le kanji est défaussé.
- **Branches** : comme aucun PV n'est perdu, Résistance ne pioche pas et Assaut ne pioche pas.

### Sceau d'entrave 封 (effet différé, 3)
- **Effet** : pose-le devant un autre joueur. Au début de son tour, il fait un présage : sur Feu, il se libère et joue normalement ; sinon il **pioche normalement mais ne joue aucune carte** ce tour-ci (il ne peut que finir son tour et défausser l'excédent). Le sceau est ensuite défaussé dans les deux cas.
- **Restrictions** : jamais sur le Gardien ; un seul sceau à la fois par joueur. Il ne bloque pas les réactions hors du tour (Parade, sauvetage).
- **Contre-jeu** : Dissipation ou Larcin pour l'enlever avant son tour.
- **Différence avec le livret** : le joueur entravé pioche quand même (adaptation originale, pour ne pas laisser quelqu'un sans rien faire ni rien recevoir).

### Orbe instable 爆 (effet différé et test, 1)
- **Effet** : pose-la devant toi. Au début du tour de celui qui l'a (avant le Sceau d'entrave) : présage ; sur Terre de rang 1 à 4, elle explose et il perd 3 PV ; sinon elle passe au joueur suivant en vie.
- **Contre-jeu** : Kanji de garde, Élixir de sauvetage, Survie ; Larcin ou Dissipation pour la retirer.
- **Branches** : Chance la fait exploser seulement si les deux cartes retournées explosent (0,8 %). Résistance pioche au plus 1 carte pour ces 3 PV (plafond d'1 carte par tour).

## Interactions avec les 8 branches (résumé)

| Branche | Cartes concernées | Effet |
|---|---|---|
| Assaut | Frappe | 2 Frappes par tour ; pioche 1 carte quand une de ses Frappes (ou Ripostes) fait perdre des PV |
| Défense | Frappe, Riposte, Pluie | présage d'esquive (Eau ; Eau ou Vent à 2-3 joueurs), après le Voile de brume |
| Stratège | pioche de début de tour | regarde 3, garde 2, la 3e sous la pioche (personne d'autre ne la voit) |
| Voleur | pioche de début de tour | remplace sa 1re pioche par une carte au hasard de la main d'un autre joueur (à 2-3 joueurs : s'il a au moins 3 cartes) |
| Précision | Frappe, Larcin, distances | −1 de distance ; Frappe parée : présage Feu ou Vent pour la reprendre ; à 2-3 joueurs, Frappes non esquivables par présage |
| Résistance | toute perte de PV | pioche 1 carte par PV perdu, au plus 1 par tour de jeu |
| Survie | sauvetage, son tour | défausse 2 cartes pour 1 PV |
| Chance | tous les présages | 2 cartes, garde la meilleure |

## Ce qui est provisoire

Toutes les quantités et toutes les probabilités de présage sont des valeurs de départ, réglables dans `worker/confront/config.mjs` (sauf les quantités, dans `cards.mjs`). Elles ont été mesurées par simulation (`docs/confrontation/EQUILIBRAGE.md`) mais doivent être confirmées par des parties entre vrais joueurs.
