# Confrontation · matrice d'équilibrage et résultats mesurés

Toutes les affirmations de ce document viennent de simulations reproductibles. Aucune n'est une garantie d'équilibre entre humains : les bots sont simples (`worker/confront/bots.mjs`), ils servent à **comparer des règles entre elles**, pas à prédire des taux de victoire réels.

## Méthode

- Script : `node tests/confront-sim.mjs` (2 000 parties par mode de 2 à 7 joueurs, 2 000 parties de collusion à trois, 400 parties de référence par branche en duel et en trio ; 20 400 parties en 4 à 5 min sur 4 cœurs). Option `--avant` pour rejouer les règles d'origine, `--config '{…}'` pour tester une variante, `--json fichier` pour garder les chiffres.
- Contributions tirées au hasard : chaque joueur apporte de 0 à 8 cartes, le reste en prêts (environ 50 % des personnages joués sont des prêts). Les bots choisissent au hasard entre leurs deux propositions : chaque branche apparaît autant que les autres.
- Les bots ne voient que leur vue filtrée (`viewFor`), comme un humain.
- **Écart d'une branche** = son taux de victoire moins le taux attendu pour les rôles qu'elle a tenus (50 % en duel, 33,3 % en trio, taux du rôle en classique).
- **Précision statistique** : en duel une branche apparaît environ 500 fois, l'incertitude est d'environ ±4,4 points (intervalle à 95 %) ; à 7 joueurs, environ 1 750 fois, ±2,3 points. Un écart plus petit que ces marges n'est pas significatif.
- **Référence** : une branche contre des adversaires tous Chance (branche proche de la moyenne), dans des tables préparées ; cela mesure la force propre d'un pouvoir, indépendamment du reste de la table.

## Ce que les mesures ont révélé (règles d'origine, bots identiques)

| Constat | Mesure (avant correction) |
|---|---|
| Le pouvoir d'Assaut (2 Frappes) ne vaut **rien** avec ces bots : même résultat quand on le désactive. Les Frappes servent aussi à se défendre (Défi, Onde), en jouer deux d'un coup vide la main. | duel −21,0, trio −15,9, 4 joueurs −7,7 ; référence duel 29 % (désactivé : 27 %) |
| **Résistance** et **Voleur** dominent les petites tables : toute carte gagnée compte double quand il n'y a qu'un ou deux adversaires. | duel Voleur +19,2, Résistance +12,8 ; trio +11,4 et +8,6 |
| **Précision** faible à 2, 3 et 4 joueurs (la distance n'y compte presque pas). | duel −7,8, trio −5,9, 4 joueurs −6,7 |
| Le **Gardien** dépend énormément de la taille de table (nombre d'alliés et d'ennemis). | 4 j : 29,6 %, 5 j : 61,0 %, 6 j : 25,6 %, 7 j : 43,3 % |
| L'**Errant** est presque injouable à 6 et 7 joueurs. | 6 j : 5,3 %, 7 j : 4,3 % |
| **Premier joueur** avantagé en duel. | 55,1 % / 44,9 % |
| **Collusion à trois** : deux joueurs contre le troisième le battent presque toujours. | victime gagnante 0,8 %, éliminée la première dans 95,7 % |
| Aucune boucle infinie, aucune partie bloquée, aucune action refusée aux bots. | 0 sur 14 000 |

Un bug réel a aussi été trouvé par les simulations (carte perdue quand le présage de Précision remélange la défausse) : corrigé, test de non-régression ajouté, et chaque partie simulée vérifie désormais que les 82 cartes sont toutes là à la fin.

## Corrections appliquées (limitées, mesurées, réversibles)

Toutes sont des réglages de `worker/confront/config.mjs` ; `CONFIG_AVANT_CORRECTIONS` permet de revenir en arrière sans toucher au code.

| # | Correction | Réglage | Effet mesuré |
|---|---|---|---|
| C1 | **Assaut** pioche 1 carte quand une de ses Frappes fait perdre des PV | `assaut.piocheSiTouche: 1` | référence duel 29 % → 51 % ; écart duel −21,0 → −5,7, trio −15,9 → −4,8 |
| C2 | **Résistance** : au plus 1 carte par tour de jeu | `resistance.maxParTour: 1` | référence duel 69,5 % → 61 % ; duel +12,8 → +2,2 |
| C3 | **Voleur** à 2-3 joueurs : seulement sur un joueur qui a au moins 3 cartes | `voleur.petiteTableMainMin: 3` | duel +19,2 → +5,2 ; trio +11,4 → −0,5 |
| C4 | **Précision** : Frappe parée, présage Feu ou Vent, elle revient en main | `precision.repriseSiParee` | trio −5,9 → +1,8 ; duel −7,8 → +7,1 (un peu fort, voir décisions) |
| C5 | **Défense** à 2-3 joueurs : esquive sur Eau ou Vent | `petiteTable.defense` | duel −6,9 → +1,7 ; trio −1,8 → +4,8 |
| C6 | **Gardien** : +2 / +0 / +2 / +1 PV à 4 / 5 / 6 / 7 joueurs | `bonusGardien` | Gardien 4 j 29,6 → 44,4 %, 5 j 61,0 → 47,5 %, 6 j 25,6 → 36,9 %, 7 j 43,3 → 43,8 % |
| C7 | **Errant** : +1 PV à 6 et 7 joueurs | `bonusErrant` | 6 j 7,9 → 14,6 %, 7 j 4,2 → 8,0 % |
| C8 | **Duel** : le second joueur commence avec 1 carte de plus | `bonusDernierJoueur.duel: 1` | premier joueur 55,1 % → 53,4 % |

Variantes mesurées puis **écartées** (trop fortes), laissées à 0 dans la configuration : Précision pioche quand sa Frappe est parée (duel 66 % contre Chance, trio +11) ; Survie à 1 carte pour sa première Ténacité du tour (duel 66 %) ; Survie +1 PV max à petite table (trio 68 %) ; Voleur seulement sur un joueur plus riche que lui (duel 42 %, trop faible) ; Précision 2 PV sur une cible sans carte (effet presque nul en trio).

## Rôles : trois camps avec l'Errant (correction C10, remplace C9)

Demande de Reichi : remettre l'Errant, mais plus fort, sans bonus visible (des PV ou des cartes en plus pour un rôle secret le trahissent : seul le Gardien, rôle public, reçoit des bonus ; les bonus de cartes des Sentinelles et des Briseurs de C9 sont retirés pour la même raison). Deux pouvoirs invisibles :

- **Coup de grâce** : si l'Errant élimine lui-même le Gardien, il gagne seul.
- **Double vie** (idée de Reichi, à partir de 5 joueurs) : à sa première mort, la table voit un faux rôle (Sentinelle ou Briseur) et il part aux enfers ; il revient avec 2 PV et 3 cartes quand il ne reste que 3 joueurs en vie, ou quand la partie allait se terminer sans lui ; son vrai rôle est alors révélé.

Pistes mesurées puis écartées (800 parties par table) : PV en plus (visibles), Charognard (+1 PV et 2 cartes à chaque élimination : le soin se voit, et seulement 11 à 19 %), double vie seule (32 / 17 / 11 / 7 %).

| Joueurs | Composition (G / S / B / E) | Réglage (Gardien seulement) | Camp du Gardien | Briseurs | Errant |
|---|---|---|---|---|---|
| 4 | 1 / 0 / 2 / 1 | +1 PV, +1 carte ; Errant sans double vie | 34,6 % | 30,9 % | 34,5 % |
| 5 | 1 / 1 / 2 / 1 | aucun | 35,9 % | 34,1 % | 30,1 % |
| 6 | 1 / 1 / 3 / 1 | +2 PV | 33,4 % | 40,3 % | 26,3 % |
| 7 | 1 / 2 / 3 / 1 | +1 PV | 38,1 % | 41,1 % | 20,7 % |

(1 500 parties simulées par table.) Les réglages sont dans `worker/confront/config.mjs` (`errant`, `bonusGardien`, `bonusMainRole`) ; l'ancienne répartition à deux camps reste disponible (`ROLES_DEUX_CAMPS`).

## Rôles : deux camps à 50/50 (correction C9, sans Errant, remplacée par C10)

Demande de Reichi : retirer les rôles trop faibles pour que la victoire vienne de la réflexion, pas du rôle tiré. L'Errant (8 à 23 % de victoires selon la table) est retiré ; chaque table a sa composition et un petit réglage, cherchés par simulation (1 000 à 1 500 parties par essai, puis 2 000 pour confirmer).

| Joueurs | Composition (G / S / B) | Réglage | Camp du Gardien | Briseurs |
|---|---|---|---|---|
| 4 | 1 / 1 / 2 | Gardien +2 cartes au départ, Sentinelle +1 | 51,2 % | 48,8 % |
| 5 | 1 / 2 / 2 | chaque Briseur +2 cartes au départ | 48,9 % | 51,0 % |
| 6 | 1 / 2 / 3 | Gardien +2 PV | 49,3 % | 50,7 % |
| 7 | 1 / 3 / 3 | Gardien +3 cartes au départ | 50,4 % | 49,6 % |

Ce qui a été essayé : un PV de Gardien en plus ou en moins fait basculer d'environ 15 points (trop grossier) ; la récompense d'élimination d'un Briseur (0 à 5 cartes) ne bouge presque rien ; les cartes de départ en plus permettent un réglage fin (environ 3 à 5 points par carte). Compositions écartées : 1/1/3 à 5 joueurs (Briseurs 72 à 96 %), 1/2/4 à 7 joueurs (Briseurs 72 à 96 %).

Effets mesurés : parties plus courtes (25 à 35 tours au lieu de 39 à 50), effondrement presque jamais atteint (moins de 1 % au lieu de 7 à 21 %). Dispersion des branches comparable (7 à 10 points ; Résistance la plus forte, +3 à +5 ; Survie la plus faible, −3 à −5).

## Dispersion entre branches, avant et après

Écart entre la meilleure et la pire branche (en points de victoire) :

| Mode | Avant | Après |
|---|---|---|
| 2 joueurs | 40,2 | 18,3 |
| 3 joueurs | 27,3 | 9,6 |
| 4 joueurs | 14,8 | 10,1 |
| 5 joueurs | 12,0 | 5,9 |
| 6 joueurs | 10,4 | 7,1 |
| 7 joueurs | 8,9 | 5,3 |

## Résultats mesurés (règles par défaut, après corrections)

### Écart de victoire par branche (points, par rapport à l'attendu)

| Branche | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|
| Assaut | −5,7 | −4,8 | +3,1 | +0,0 | −1,5 | +0,4 |
| Défense | +1,7 | +4,8 | −0,9 | +0,2 | −0,9 | +2,6 |
| Stratège | +6,9 | +3,8 | −1,0 | −2,4 | −2,8 | −2,7 |
| Voleur | +5,2 | −0,5 | +4,2 | +1,8 | +1,4 | +1,2 |
| Précision | +7,1 | +1,8 | −5,0 | −0,8 | +0,4 | +0,0 |
| Résistance | +2,2 | −0,9 | +5,1 | +3,5 | +4,3 | +2,2 |
| Survie | **−11,2** | −3,6 | −3,9 | −0,0 | −0,3 | −2,3 |
| Chance | −5,9 | −0,0 | −2,3 | −2,1 | −0,7 | −1,4 |

Référence (une branche contre des joueurs Chance) : duel, attendu 50 % : Résistance 61,0 · Précision 57,8 · Défense 56,3 · Stratège 55,0 · Assaut 51,0 · Chance 48,5 · Voleur 48,3 · Survie 42,5. Trio, attendu 33,3 % : Précision 39,3 · Assaut 35,8 · Défense 35,0 · Résistance 35,0 · Stratège 33,8 · Voleur 32,5 · Chance 32,5 · Survie 32,3.

### Rôles (classique)

| Joueurs | Gardien et Sentinelles | Briseurs | Errant |
|---|---|---|---|
| 4 | 44,4 % | 33,0 % | 22,6 % |
| 5 | 47,5 % | 41,3 % | 11,3 % |
| 6 | 36,9 % | 48,5 % | 14,6 % |
| 7 | 43,8 % | 48,2 % | 8,0 % |

### Ordre de jeu (victoires selon la place dans le premier tour, 0 = premier)

- Duel : 53,4 % / 46,6 %. Trio : 35,5 / **28,0** / 36,5 % (le deuxième joueur est désavantagé de 5 points). En classique le premier est toujours le Gardien ; les autres places restent à ±3 points de l'attendu.

### Durée, rythme, portée, soins, mains

| Joueurs | Tours (moyenne) | Tours de table | Effondrement atteint | 1re élimination (tour de table) | Éliminés dans les 2 premiers tours de table | Frappes par joueur | Soins par joueur | Hors de portée (par tour) | Main max moyenne (p95) |
|---|---|---|---|---|---|---|---|---|---|
| 2 | 42,6 | 21,8 | 31,1 % | 21,8 | 0,1 % | 13,0 | 5,1 | 0,047 | 8,3 (10) |
| 3 | 48,6 | 22,4 | 31,5 % | 5,4 | 3,8 % | 10,1 | 3,5 | 0,034 | 7,2 (9) |
| 4 | 49,3 | 18,6 | 21,3 % | 5,7 | 2,9 % | 7,5 | 3,1 | 0,022 | 6,8 (9) |
| 5 | 39,4 | 11,9 | 6,9 % | 3,9 | 4,3 % | 4,7 | 2,1 | 0,013 | 6,3 (8) |
| 6 | 49,5 | 13,9 | 13,1 % | 3,6 | 4,3 % | 5,1 | 2,5 | 0,014 | 6,9 (9) |
| 7 | 45,6 | 11,0 | 6,0 % | 3,0 | 5,6 % | 4,0 | 2,2 | 0,009 | 6,7 (9) |

« Hors de portée » : fins de tour où le joueur avait une Frappe permise en main mais personne à portée. La portée bloque peu (moins d'une fois tous les 20 tours) : la plupart du temps, les tables sont assez petites ou les armes assez longues.

Soins par branche : Survie se soigne 2 fois plus que les autres (9,5 en duel contre 3,4 à 5,2) mais perd aussi beaucoup plus de PV (13,8 en duel) : elle échange des cartes contre des PV, et en duel les cartes valent plus que les PV. Les mains restent raisonnables : aucun plafond de main n'est nécessaire (maximum observé 14).

## Matrice : 8 branches × modes 2 à 7

Lecture : ce qui fait la force ou la faiblesse de la branche selon le mode. ▲ avantage mesuré (écart ≥ +4), ▼ désavantage mesuré (≤ −4), = dans la marge d'erreur.

| Branche | 2 | 3 | 4 | 5 | 6 | 7 | Dépend surtout de |
|---|---|---|---|---|---|---|---|
| Assaut | ▼ | ▼ | = | = | = | = | **pioche** (C1), nombre de Frappes en main ; neutre sur la distance |
| Défense | = | ▲ | = | = | = | = | **PV** effectifs (esquive), indépendante de la distance ; renforcée à petite table (C5) |
| Stratège | ▲ | = | = | = | = | = | **pioche** (qualité) ; vaut plus quand les bonnes cartes comptent (duel) |
| Voleur | ▲ | = | ▲ | = | = | = | **pioche** au détriment d'un autre ; double effet à 2 joueurs (C3) |
| Précision | ▲ | = | ▼ | = | = | = | **distance** (grandes tables) et **reprise** de Frappe (petites tables) |
| Résistance | = | = | ▲ | = | ▲ | = | **PV perdus → pioche** ; plus on est ciblé, plus elle rend (C2) |
| Survie | ▼ | = | = | = | = | = | **soin** contre **cartes** ; faible là où les cartes sont rares (duel) |
| Chance | ▼ | = | = | = | = | = | **présages** (Voile, Sceau, Orbe, Défense) : rares en duel |

Facteurs transversaux par mode :

| Facteur | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|
| PV de départ | 6 (Gardien sans objet) | 5 | 4, Gardien 6 | 4, Gardien 4 | 4, Gardien 6, Errant 5 | 4, Gardien 5, Errant 5 |
| Limite de main | = PV ; main max moyenne 8,3 | 7,2 | 6,8 | 6,3 | 6,9 | 6,7 |
| Distance naturelle max | 1 (2 avec Cape) | 1 (2 avec Cape) | 2 | 2 | 3 | 3 |
| Portée utile | contre la Cape seulement ; armes 3+ = Frappe en plus | idem | 2 suffit presque toujours | 2 | 2 à 3 | 3 |
| Soin moyen par joueur | 5,1 | 3,5 | 3,1 | 2,1 | 2,5 | 2,2 |
| Vitesse de pioche | 2 par tour, Élixir sans sauvetage | 2, récompense 2 | 2, récompense Briseur 3 | idem | idem | idem |
| Avantage du premier joueur | +3,4 (après C8) | +2,2 (2e joueur −5,3) | Gardien | Gardien | Gardien | Gardien |
| Risque de coalition | aucun | **très élevé** (mesuré) | moyen (Briseurs qui se trouvent) | moyen | élevé (3 Briseurs) | élevé |

## Collusion à trois

En trio, deux joueurs qui ne s'attaquent jamais et visent le troisième : la victime gagne **1,3 %** des parties (au lieu de 33,3 %) et sort la première dans 94 % des cas. Aucune règle simple ne compense cela sans casser le trio honnête. Propositions (non appliquées, à décider) :
1. Récompenses de trio très faibles ou nulles, et rendement décroissant contre les mêmes adversaires (anti-farm serveur).
2. Classement ou récompenses seulement en duel et en classique ; trio présenté comme mode « entre amis ».
3. Option de règle à tester avec de vrais joueurs : la récompense d'élimination de trio (2 cartes) reversée au **joueur restant**, pas à l'éliminateur, pour que finir la victime avantage le troisième.

En classique, les Briseurs ne se connaissent pas : la coalition demande de se dévoiler, ce que la Lien vital et l'historique des attaques rendent visible. Le risque reste réel sur Discord (canal vocal) : à traiter par l'anti-farm et la modération, pas par les règles.

## Décisions restant à valider

1. **PV provisoires** : garder 6 / 5 / 4 ? Mesure : un duel à **5 PV** est plus court (35,8 tours au lieu de 42,6, effondrement 21,6 % au lieu de 31 %) et un peu plus serré (dispersion 15,2 au lieu de 18,3). Recommandation : passer le duel à 5 PV (`pv.duel`).
2. **Survie en duel** (−11,2) : aucune correction simple mesurée n'est satisfaisante (toutes trop fortes). Options : l'accepter (branche d'endurance, plus intéressante à plusieurs), ou tester avec des humains avant de toucher.
3. **Précision en duel** (+7,1) : la reprise sur Feu ou Vent est un peu forte à 2 joueurs. Option : reprise sur Feu seul en duel (non mesurée ici, à simuler avant).
4. **Corrections C1 à C8** : à confirmer ou à annuler une par une (chaque réglage est indépendant).
5. **Rôles** : Errant à 8 % à 7 joueurs même après C7 : acceptable (rôle difficile par nature) ou +2 PV ?
6. **Effondrement** au 30e tour de table : garder ce garde-fou (jamais de partie bloquée) ou l'avancer.
7. **Délais** (2 min, 45 s, 90 s, 20 s, 25 s, 8 s), **absences** (3), **anti-farm** (6 tours) et récompenses de partie : montants et plafonds côté serveur.
8. **Répartition des personnages dans les branches** (`branches-proposees.mjs`) : à valider par Billy ; elle ne change pas l'équilibre (le pouvoir dépend de la branche, pas du personnage).
9. **Trio et collusion** : voir ci-dessus.

## Limites de ces mesures

- Bots simples : ils ne bluffent pas, ne déduisent pas les rôles finement, gardent mal leurs cartes de défense. Assaut, Survie et Stratège dépendent beaucoup de la qualité de jeu : leurs chiffres sont les moins sûrs.
- Les taux de rôles dépendent fortement de la stratégie des bots (l'Errant joue « affaiblir les Briseurs d'abord »). À revoir après les premières parties réelles : le journal serveur de chaque partie permettra de recalculer exactement ces tableaux sur de vraies parties.
