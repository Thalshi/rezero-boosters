# Confrontation · livre de règles

Jeu de cartes multijoueur de Re Zéro, de 2 à 7 joueurs, joué sur le site avec ses personnages de collection. Le serveur arbitre tout ; ce livre explique ce qu'il applique.

Code de référence : `worker/confront/` (moteur), tests : `tests/confront-engine.mjs`, simulations : `tests/confront-sim.mjs`, catalogue des cartes : `CARTES.md`, équilibrage : `EQUILIBRAGE.md`.

**Légende** : chaque règle porte une étiquette.
- **[Original]** : adaptation originale créée pour Re Zéro.
- **[Livret]** : mécanique inspirée du livret de règles de BANG! (référence mécanique seulement : aucun nom, texte, visuel ni terme repris).
- **[Provisoire]** : valeur ou choix à valider par Reichi et Billy (réglable dans `worker/confront/config.mjs` sans toucher au code).

---

## 1. En bref

Chaque joueur incarne un personnage tiré d'une réserve commune, avec un pouvoir qui dépend de sa **branche** (8 branches). On pioche des cartes d'action dans une pioche partagée, on frappe les joueurs à portée, on pare, on se soigne, on pose des équipements. On est éliminé à 0 PV. Le dernier debout gagne (2 et 3 joueurs), ou le camp qui atteint son objectif (4 à 7 joueurs, rôles secrets).

| Mode | Joueurs | Rôles | PV de départ | Objectif |
|---|---|---|---|---|
| Duel | 2 | aucun | 6 [Provisoire] | rester le dernier en vie |
| Trio | 3 | aucun, chacun pour soi | 5 [Provisoire] | rester le dernier en vie |
| Classique | 4 à 7 | Gardien visible, rôles secrets | 4, Gardien +2/+0/+2/+1 et Errant +0/+0/+1/+1 selon la table [Provisoire] | objectif de son camp (§ 4) |

## 2. Vocabulaire

- **Carte de collection** : une carte de personnage que le joueur possède sur le site (une *instance* précise, avec ses éventuels cosmétiques).
- **Branche** : la famille de combat d'un personnage (Assaut, Défense, Stratège, Voleur, Précision, Résistance, Survie, Chance). Elle ne dépend **ni de la rareté ni du booster** : une Mythique et une Commune de la même branche ont exactement le même pouvoir. [Original]
- **Carte de prêt** (« Écho d'Assaut », « Écho de Défense »…) : personnage générique d'une branche, fourni par le jeu pour compléter une contribution. Il n'appartient à personne, ne se vend pas, n'entre jamais dans une collection et disparaît à la fin de la partie. [Original]
- **Carte d'action** : carte de la pioche partagée (Frappe d'essence, Parade…), qui n'existe que pendant la partie. Voir `CARTES.md`.
- **PV** : points de vie actuels / maximum.
- **Présage** : on retourne la carte du dessus de la pioche et on lit son signe (Feu 火, Eau 水, Vent 風, Terre 土) et parfois son rang. [Livret pour le principe du test, Original pour les signes]
- **Distance** : nombre de places entre deux joueurs **en vie**, par le chemin le plus court autour de la table. **Portée** : distance maximale que ton arme atteint. Les deux ne se confondent pas. [Livret]

## 3. Avant la partie

### 3.1 Le salon [Original]
Un joueur ouvre un salon (privé sur invitation ou public : géré par le serveur, hors moteur). Les joueurs le rejoignent. L'hôte lance la partie quand il y a entre 2 et 7 joueurs ; le mode découle du nombre de joueurs (2 = Duel, 3 = Trio, 4 à 7 = Classique). Un mode demandé qui ne correspond pas au nombre de joueurs est refusé.

### 3.2 Les contributions : une carte par branche au plus [Original]
- Chaque joueur peut apporter **au plus une carte de collection par branche**, donc au plus 8 cartes. Il peut en apporter moins, ou aucune.
- « Une par branche » limite **la contribution**, pas la collection : on peut posséder dix personnages Assaut ; on en apporte un seul à une partie donnée.
- La carte apportée indique sa branche. La branche est une donnée du serveur, **carte par carte** : proposition dans `worker/confront/branches-proposees.mjs` (branche du perso pour Commune, Peu commune et Rare ; une deuxième branche proche de son caractère pour Épique, Légendaire et Mythique), que Billy ajuste dans Admin → Branches (choix gardés dans le doc `confrontcfg/branches`). Une variante n'est jamais plus forte : tous les personnages d'une même branche ont le même pouvoir. [Original]
- Le serveur vérifie que le joueur possède bien chaque instance et la **bloque** pendant la partie (ni vente ni échange). La même instance ne peut pas être dans la réserve deux fois. Deux joueurs peuvent apporter deux instances différentes du même personnage.
- Délai pour contribuer : 2 minutes [Provisoire]. Passé ce délai, le joueur est considéré comme n'ayant rien apporté.

### 3.3 Les cartes de prêt et la réserve commune [Original]
- Pour chaque branche qu'un joueur ne fournit pas, le jeu ajoute **une carte de prêt** de cette branche à sa place.
- Chaque joueur met donc **exactement 8 cartes** dans la réserve (une par branche, à lui ou prêtée). Personne ne peut « manipuler le hasard » en apportant plus ou moins de cartes, ou seulement ses meilleures branches : la réserve contient toujours le même nombre de chaque branche.
- La réserve est publique : tout le monde voit ce qui a été apporté (c'est le moment du « mélange collectif » à l'écran).

### 3.4 Le tirage : deux personnages par joueur [Original]
- Le serveur mélange la réserve et donne à chaque joueur **deux propositions** : deux instances différentes, et autant que possible deux personnages différents. **Aucune instance n'est jamais proposée à deux joueurs.**
- Les propositions sont **secrètes** jusqu'au début de la partie.
- On peut recevoir sa propre carte, une carte de prêt ou la carte d'un autre joueur.

### 3.5 Le choix [Original]
- Chaque joueur choisit **un** de ses deux personnages (45 s [Provisoire] ; sans réponse, le serveur prend la première proposition).
- **Choisir la carte d'un autre ne transfère rien** : ni propriété, ni cosmétique, ni design. Le personnage reste la propriété de celui qui l'a apporté ; la partie note seulement « B a joué la carte de A ». Le design (cadre, aura…) de la carte s'affiche tel que son propriétaire l'a créé.
- Les rôles (mode classique) sont tirés **séparément**, avec un hasard indépendant du tirage des personnages.
- Si un joueur abandonne avant la fin du choix, la partie est annulée, sans vainqueur ni récompense.

## 4. Les rôles (mode classique, 4 à 7 joueurs)

### 4.1 Répartition [Livret pour la structure, Original pour les noms]

| Joueurs | Gardien | Sentinelles | Briseurs | Errant |
|---|---|---|---|---|
| 4 | 1 | 0 | 2 | 1 |
| 5 | 1 | 1 | 2 | 1 |
| 6 | 1 | 1 | 3 | 1 |
| 7 | 1 | 2 | 3 | 1 |

- Le **Gardien** (le chef) est révélé à tous dès le début. Tous les autres rôles sont secrets : chacun ne connaît que le sien.
- Un rôle est révélé quand son joueur est éliminé, et tous à la fin de la partie.

### 4.2 Objectifs précis

- **Gardien et Sentinelles** (même camp) : gagnent ensemble quand **tous les Briseurs et l'Errant sont éliminés**, le Gardien étant encore en vie. Les Sentinelles gagnent même si elles sont éliminées en chemin.
- **Briseurs** : gagnent ensemble dès que **le Gardien est éliminé**, sauf dans le cas de l'Errant ci-dessous. Ils gagnent même s'ils sont tous éliminés à ce moment-là.
- **Errant** (le solitaire) : gagne seul s'il est **le dernier joueur en vie**. Concrètement, il doit éliminer (ou voir éliminer) tout le monde, et le Gardien en dernier : si le Gardien tombe alors qu'un autre joueur que l'Errant est encore en vie, ce sont les Briseurs qui gagnent.

### 4.3 Conditions de victoire, vérifiées après chaque élimination

1. Le Gardien vient d'être éliminé : si l'Errant est le seul joueur en vie, **victoire de l'Errant** ; sinon **victoire des Briseurs** (tous, vivants ou non).
2. Sinon, s'il ne reste plus aucun Briseur ni Errant en vie : **victoire du Gardien et des Sentinelles**.
3. Sinon la partie continue.

Exemples : les Briseurs sont tous tombés mais l'Errant vit encore : on continue, l'Errant seul contre le Gardien et ses Sentinelles. Le Gardien tombe alors qu'il reste une Sentinelle et l'Errant : victoire des Briseurs, même éliminés.

### 4.4 Récompenses et pénalité d'élimination [Livret, Provisoire]
- Celui qui élimine un **Briseur** (quel que soit son propre rôle, même Briseur) pioche **3 cartes**.
- Si le **Gardien élimine une Sentinelle**, il défausse **toute sa main et tout son équipement**. Cela rend prudent le Gardien, qui ne connaît pas ses alliés.
- En Trio, celui qui élimine un joueur pioche **2 cartes** [Original, Provisoire]. En Duel, il n'y a pas de récompense (la partie est finie).

## 5. Mise en place

1. **Sièges** : le serveur place les joueurs au hasard autour de la table.
2. **PV** : chacun reçoit les PV du mode (Duel 6, Trio 5, Classique 4) ; le Gardien en reçoit en plus selon la table : **+2 à 4 joueurs, +0 à 5, +2 à 6, +1 à 7** [Provisoire, corrigé après simulation, voir `EQUILIBRAGE.md` ; hypothèse de départ : +1 partout]. L'Errant reçoit +1 PV à 6 et 7 joueurs [Provisoire, corrigé : sans ce bonus il ne gagnait que 4 à 8 % des parties simulées]. Les PV maximum ne changent plus pendant la partie.
3. **Pioche** : les 82 cartes d'action sont mélangées par le serveur.
4. **Premier joueur** : en classique, le **Gardien** commence [Livret] ; en Duel et en Trio, le premier joueur est tiré au hasard [Original].
5. **Mains de départ** : chacun reçoit autant de cartes que ses PV maximum, une par une à partir du premier joueur [Livret]. En Duel, le second joueur reçoit **1 carte de plus** pour compenser l'avantage de commencer [Original, Provisoire, mesuré].

## 6. Le tour de jeu

On joue chacun son tour, dans l'ordre des sièges. Un **tour de table** est terminé quand on revient au premier joueur.

### 6.1 Début du tour (effets en attente), dans cet ordre
1. **Effondrement du sceau** [Original, Provisoire] : à partir du 30e tour de table, le joueur actif perd 1 PV au début de chacun de ses tours. C'est un garde-fou contre les parties interminables (il est atteint dans 31 % des duels simulés, 5 à 21 % des parties à plus de joueurs).
2. **Orbe instable**, si elle est devant toi : présage (voir `CARTES.md`) ; elle explose (3 PV perdus) ou passe au joueur suivant.
3. **Sceau d'entrave**, s'il est devant toi : présage ; sur Feu tu te libères, sinon tu ne joueras aucune carte ce tour-ci (tu piocheras quand même). Le sceau est défaussé.

### 6.2 Pioche
Tu pioches **2 cartes** [Livret]. Deux branches changent cette étape :
- **Stratège** : regarde les 3 cartes du dessus, en garde 2, glisse la troisième sous la pioche. Personne d'autre ne voit ces cartes.
- **Voleur** : peut remplacer sa première carte par une carte prise au hasard dans la main d'un autre joueur (à 2 ou 3 joueurs : seulement s'il a au moins 3 cartes en main), puis pioche la seconde normalement. Seuls le voleur et le volé voient la carte volée.

### 6.3 Actions
Tu joues autant de cartes que tu veux, une à la fois, avec trois limites [Livret] :
- **une seule Frappe d'essence par tour** (Assaut : 2 ; Lames jumelles : illimité ; à 2 ou 3 joueurs, arme de portée 3 ou plus : +1) ;
- **pas deux équipements de la même sorte** devant toi ;
- **une seule arme** : poser une nouvelle arme défausse l'ancienne.

Chaque carte jouée est résolue complètement (réactions comprises) avant que tu puisses jouer la suivante. Tu n'es jamais obligé de jouer une carte.

### 6.4 Fin du tour : limite de main
Quand tu as fini, tu défausses jusqu'à ta **limite de main**, qui est égale à tes **PV actuels** [Livret] (plancher 0, sans plafond [Provisoire] : les simulations mesurent une main maximale moyenne de 6 à 8 cartes, 95 % des joueurs restent à 10 ou moins). Tu choisis les cartes défaussées. Puis le joueur suivant en vie commence son tour.

### 6.5 Réactions hors de ton tour et délais [Livret pour le principe, Original pour les délais]
Le serveur peut te demander de réagir pendant le tour d'un autre :

| Situation | Choix possibles | Délai [Provisoire] | Si tu ne réponds pas |
|---|---|---|---|
| Une attaque te vise (Frappe, Riposte, Pluie) | Parade, Riposte runique (pas contre la Pluie), encaisser | 20 s | Parade jouée pour toi si tu en as une, sinon tu encaisses |
| Onde de choc | défausser une Frappe, encaisser | 20 s | Frappe défaussée si tu en as une |
| Défi de l'arène | défausser une Frappe, céder | 20 s | Frappe défaussée si tu en as une |
| Tu tombes à 0 PV | Élixir (si 3 joueurs en vie ou plus), Ténacité (Survie), accepter | 20 s | Élixir ou Ténacité joués pour toi si possible |
| Étal du marché, Stratège, Voleur | choisir une carte / une cible | 25 s | première carte de l'étal / deux premières cartes / pioche normale |
| Ton propre tour | jouer, finir | 90 s par action | fin du tour, défausse automatique des dernières cartes reçues |

- **Déconnexion** : si tu es déconnecté pendant qu'on attend ta réponse, le délai est ramené à 8 s [Provisoire]. Quand tu reviens, tu retrouves exactement ta main, ton rôle et ce que tu as le droit de voir.
- **Absences** : 3 tours de suite sans jouer (délai expiré) valent abandon [Provisoire].
- Une réponse arrivée après l'expiration est refusée : le serveur a déjà appliqué le choix par défaut.

## 7. Combat

### 7.1 Attaquer [Livret]
Une **Frappe d'essence** vise un autre joueur dont la **distance perçue** est inférieure ou égale à la **portée** de ton arme. Distance perçue = distance naturelle, −1 si tu as l'Œil du hibou, −1 si tu es Précision, +1 si la cible a une Cape d'ombre, minimum 1.

Autres attaques : Pluie de shurikens (tout le monde, sans distance), Onde de choc (tout le monde, se défausser d'une Frappe), Défi de l'arène (n'importe qui, duel de Frappes), Riposte runique (renvoyée à l'attaquant). Détails : `CARTES.md`.

### 7.2 Esquiver et parer
Quand une attaque te vise, dans cet ordre :
1. **Voile de brume** (si tu l'as) : présage, Eau = esquivée. [Livret pour le principe]
2. **Défense** (si c'est ta branche) : présage, Eau = esquivée (Eau ou Vent à 2 ou 3 joueurs). [Original]
3. Sinon le serveur te demande : **Parade**, **Riposte runique** ou **encaisser** (perdre 1 PV).
4. Le **Kanji de garde**, s'il est posé devant toi, annule la perte de PV au moment où elle arrive (puis il est défaussé). [Original]

À 2 ou 3 joueurs, les Frappes d'un joueur **Précision** sautent les étapes 1 et 2.

### 7.3 Perdre des PV, se soigner
- Les PV ne dépassent jamais le maximum. Soins : Élixir de vie (+1, à ton tour), Festin du QG (+1 à tous), Lien vital (tu donnes 1 PV), Ténacité de Survie (2 cartes = 1 PV).
- **Résistance** pioche 1 carte par PV perdu (au plus 1 carte par tour de jeu). **Assaut** pioche 1 carte quand sa Frappe fait perdre des PV.

### 7.4 Tomber à 0 PV, sauvetage, élimination
- À 0 PV ou moins, une **fenêtre de sauvetage** s'ouvre : Élixir de vie (+1 PV chacun, seulement s'il reste au moins 3 joueurs en vie [Livret pour le principe, Provisoire]) ou Ténacité (Survie). On peut enchaîner jusqu'à repasser au-dessus de 0.
- Sinon le joueur est **éliminé** : il montre son rôle, toutes ses cartes (main et devant lui) vont à la défausse, il ne compte plus dans les distances. Les distances de tous sont recalculées aussitôt : des joueurs se « rapprochent ».
- S'il était en train de jouer son tour, son tour s'arrête. Les effets déjà lancés sur les autres continuent, sauf si la partie est finie.

### 7.5 Équipements, armes, portée [Livret pour le principe, Original pour les cartes]
- Tout le monde a la **Dague d'essence**, portée 1, sans carte, qu'on ne peut ni voler ni défausser.
- Armes : portée 1 (Lames jumelles, Frappes illimitées), 2, 3, 4, 5. Une seule arme ; on peut la perdre (Larcin, Dissipation).
- Équipements persistants : Voile de brume, Cape d'ombre (+1 de distance vue par les autres), Œil du hibou (−1 de distance vers les autres), Kanji de garde. Effets différés : Sceau d'entrave, Orbe instable.

### 7.6 Petites tables : traitement explicite de la portée [Original, Provisoire]
À 2 et 3 joueurs, la distance naturelle vaut **toujours 1** (chacun est voisin de tous). Le moteur de portée n'est pas désactivé : la Cape d'ombre peut toujours porter la distance à 2 et une arme de portée 2 ou plus la compense. Pour que les armes longues et la branche Précision gardent un intérêt :
- **armes de portée 3 ou plus** : une Frappe de plus par tour ;
- **Précision** : ses Frappes ne peuvent pas être esquivées par un présage (Voile de brume, Défense) ;
- **Défense** : esquive sur Eau ou Vent (au lieu d'Eau seul), parce que la distance ne protège jamais à cette taille de table ;
- **Voleur** : ne vole qu'un joueur qui a au moins 3 cartes en main (sinon le vol vide l'unique adversaire).

## 8. Les huit branches [Original]

| Branche | Pouvoir |
|---|---|
| Assaut 猛 | Fureur : 2 Frappes par tour ; chaque fois qu'une de tes Frappes fait perdre des PV, pioche 1 carte. |
| Défense 守 | Garde : quand une Frappe ou une Pluie te vise, présage ; sur Eau (Eau ou Vent à 2-3 joueurs), l'attaque est esquivée. Cumulable avec le Voile de brume. |
| Stratège 策 | Clairvoyance : à ta pioche, regarde 3 cartes, garde-en 2, glisse la dernière sous la pioche. |
| Voleur 盗 | Main leste : à ta pioche, tu peux remplacer ta première carte par une carte prise au hasard dans la main d'un autre joueur (à 2-3 joueurs : s'il a au moins 3 cartes). |
| Précision 狙 | Œil sûr : tu vois les autres à 1 de distance de moins ; quand ta Frappe est parée, présage, sur Feu ou Vent tu la reprends en main ; à 2-3 joueurs tes Frappes ne sont pas esquivables par présage. |
| Résistance 耐 | Endurance : chaque PV perdu te fait piocher 1 carte (au plus 1 par tour de jeu). |
| Survie 生 | Ténacité : pendant ton tour, ou quand tu tombes à 0 PV, défausse 2 cartes pour gagner 1 PV. |
| Chance 運 | Bonne étoile : à chacun de tes présages, retourne 2 cartes et garde le meilleur résultat. Le choix est automatique (l'un des deux résultats est toujours au moins aussi bon). |

Les pouvoirs « reformulés » du cahier des charges et leur équilibrage chiffré sont dans `EQUILIBRAGE.md`. Les corrections apportées après mesure (Assaut, Résistance, Voleur, Précision, Défense à petite table) sont [Provisoire].

## 9. Fin de partie

- **Duel et Trio** : la partie s'arrête dès qu'il ne reste qu'un joueur en vie ; il gagne.
- **Classique** : voir § 4.3.
- **Fin au milieu d'une chaîne d'effets** : dès qu'une condition de victoire est remplie, la partie s'arrête **immédiatement**. Les effets restants (par exemple la suite d'une Pluie de shurikens qui vient d'éliminer le Gardien) sont annulés, aucune réponse n'est plus demandée, aucune action n'est plus acceptée. [Original]
- **Match nul** : si 1 000 tours se sont joués sans vainqueur (filet de sécurité, jamais atteint en 20 400 parties simulées). [Original]
- **Abandon** : un joueur peut abandonner à tout moment ; en partie, il est éliminé (rôle révélé, cartes défaussées). Avant la fin du choix des personnages, l'abandon annule la partie.
- **Après la partie** : les instances apportées sont débloquées par le serveur, rien n'a changé de propriétaire, les cartes de prêt disparaissent.

### 9.1 Récompenses et anti-farm [Original, Provisoire]
Le moteur calcule pour chaque joueur s'il est **éligible** aux récompenses, et pourquoi pas :
- partie trop courte (moins de 6 tours joués) ;
- joueur qui a abandonné, ou qui a laissé expirer plus d'un tour ;
- partie sans vainqueur (match nul, annulation).

Le serveur ajoute ses propres garde-fous (non codés ici, à décider) : plafond quotidien de récompenses, rendement décroissant contre les mêmes adversaires, pas de récompense en salon privé entre deux comptes qui jouent toujours ensemble, montants très modestes. Aucune récompense ne dépend de la rareté jouée.

## 10. Arbitrage par le serveur

- **Serveur autoritaire** : le navigateur n'envoie que des intentions (« je joue cette carte sur ce joueur »). Le serveur vérifie tout et décide : tirages, mélanges, présages, vols au hasard. Tout le hasard vient d'une graine propre à la partie : une partie peut être rejouée à l'identique pour un litige.
- **Informations secrètes** : chaque joueur ne reçoit que sa vue : sa main, son rôle, ses propositions, le nombre de cartes des autres, ce qui est posé sur la table, la défausse, et le journal public. Jamais : la main des autres, les rôles cachés, l'ordre de la pioche, l'état du hasard, les cartes regardées par un Stratège, la carte volée (sauf voleur et volé). Un spectateur voit encore moins (aucune main).
- **Anti-triche et double envoi** : chaque action peut porter un numéro unique (refusée si déjà reçue), le numéro de version de l'état qu'a vu le joueur (refusée si l'état a changé entre-temps) et le numéro de la demande à laquelle il répond (refusée si elle est périmée).
- **Journal** : chaque événement est daté et numéroté ; l'état garde les 40 derniers pour la reconnexion, le serveur archive le journal complet.

---

## 11. Une partie fictive complète, tour par tour (5 joueurs)

Partie réelle produite par le moteur (`node tests/confront-recit.mjs --joueurs 5 --graine exemple-3`), jouée par les bots, commentée. Les signes et rangs des cartes sont omis sauf quand ils comptent.

**Préparation.** Cinq joueurs : Mahed, Sakuto, Kaï, Irsy, Kuradai. Chacun apporte une seule carte de collection ; les 7 autres branches de chacun sont complétées par des cartes de prêt (réserve de 40 cartes, 35 prêts). Le tirage donne deux propositions à chacun ; ici tous ont choisi une carte de prêt (choisir une carte de prêt est permis, et sans conséquence sur la collection).

| Siège | Joueur | Branche | Rôle (secret sauf le Gardien) | PV |
|---|---|---|---|---|
| 1 | Mahed | Défense | Sentinelle | 4 |
| 2 | Sakuto | Stratège | Errant | 4 |
| 3 | Kaï | Précision | Briseur | 4 |
| 4 | Irsy | Assaut | **Gardien** (visible) | 4 (bonus +0 à 5 joueurs) |
| 5 | Kuradai | Résistance | Briseur | 4 |

Irsy, Gardien, commence. Chacun a 4 cartes en main.

**Tour 1, Irsy (Gardien).** Pioche 2 cartes. Elle ne sait pas qui est avec elle. Elle lance un **Défi de l'arène** sur Mahed (n'importe quelle distance) : Mahed n'a pas de Frappe à défausser, il cède et perd 1 PV (3). Irsy est Assaut : elle joue **deux Frappes** sur Kaï (voisin, distance 1). Kaï n'a pas de Parade : 4 → 3 → 2 PV, et à chaque Frappe qui touche, Irsy **pioche 1 carte** (Assaut). Avec un **Larcin** (distance 1) elle prend l'Œil du hibou de la main de Kaï (seuls Irsy et Kaï voient quelle carte), puis le pose devant elle.
*Règle illustrée : le Gardien frappe à l'aveugle ; le Défi ignore la distance ; Assaut transforme ses coups en cartes.*

**Tour 2, Kuradai (Briseur).** Pose une Lance de chasse (portée 2) et un Voile de brume, joue Inspiration (+2 cartes), pose une Cape d'ombre (les autres le voient désormais à 1 de plus) et frappe Irsy : 4 → 3.
*Règle illustrée : on ne peut pas poser deux Capes ; la Cape protège Kuradai sans changer la distance réelle.*

**Tour 3, Mahed (Sentinelle).** Pose une Lance, une Cape d'ombre et l'**Orbe instable** devant lui. Joue **Dissipation** sur Kuradai et choisit le Voile de brume posé (à n'importe quelle distance). Frappe Kuradai (distance 2 à cause de la Cape, portée 2 de la lance : à portée). Kuradai perd 1 PV (3) et, Résistance, **pioche 1 carte**.

**Tour 4, Sakuto (Errant).** Stratège : regarde 3 cartes, en garde 2 (Parade, Étal du marché), glisse la troisième sous la pioche. Joue l'**Étal du marché** : 5 cartes retournées, chacun en prend une dans l'ordre (Sakuto prend la Riposte runique). Pose un **Sceau d'entrave** sur Kuradai et frappe Kaï : 2 → 1 PV.
*Règle illustrée : l'Errant affaiblit d'abord les Briseurs pour que le Gardien ne tombe pas trop tôt (sinon ce sont les Briseurs qui gagnent).*

**Tour 5, Kaï (Briseur, 1 PV).** Pose le Bâton runique (portée 3), boit un **Élixir** (2 PV). Dissipation sur Irsy (une Frappe de sa main, au hasard). Frappe Irsy : 3 → 2. Puis **Pluie de shurikens** : chacun, dans l'ordre, doit parer. Irsy encaisse (1 PV). Kuradai pare. Mahed, Défense, fait un présage : **Eau** (Kanji de garde, eau 10) : esquive. Sakuto pare.
*Règle illustrée : la Pluie ne compte pas comme une Frappe ; Défense réagit avant qu'on demande une carte.*

**Tour 6, Irsy (Gardien, 1 PV).** Boit un Élixir (2). Frappe Kaï : Kaï **riposte** (Riposte runique : Irsy est à portée de son Bâton runique). Irsy pare la Riposte. Seconde Frappe (Assaut) : Kaï encaisse, 2 → 1. Irsy pioche 1 carte, puis défausse jusqu'à sa limite de main (2 PV = 2 cartes).

**Tour 7, Kuradai.** Présage du Sceau d'entrave : pas Feu. **Il reste entravé** : il pioche ses 2 cartes mais ne peut jouer aucune carte ; il défausse 3 cartes pour respecter sa limite (3 PV).

**Tour 8, Mahed.** L'Orbe instable : présage favorable (Parade, vent 7), elle passe à Sakuto. Mahed pose un Bâton runique, utilise **Lien vital** sur Irsy (Mahed 3 → 2, Irsy 2 → 3), et frappe Kaï (1 → 0). Kaï n'a ni Élixir ni Survie : **éliminé**. Son rôle est révélé : **Briseur**. Mahed, qui a éliminé un Briseur, pioche **3 cartes**, puis défausse l'excédent.
*Règle illustrée : le Lien vital trahit la Sentinelle (aide visible au Gardien) ; récompense pour un Briseur éliminé ; Kaï ne compte plus dans les distances.*

**Tours 9 à 11.** L'Orbe passe de Sakuto à Irsy puis à Kuradai sans exploser. Irsy pose le Canon à main, re-scelle Kuradai, le frappe (2 PV ; il pioche, Résistance). Kuradai reste entravé une deuxième fois.

**Tours 12 à 15.** Mahed pose un troisième Sceau sur Kuradai (entravé une troisième fois, il défausse 5 cartes). Irsy pose un Voile de brume, boit un Élixir, frappe Kuradai (1 PV), joue un Étal du marché.

**Tour 16, Mahed.** Révélation (+3 cartes). Deux Dissipations sur Kuradai (sa Cape, puis sa Lance). **Défi de l'arène** sur Kuradai : il cède, tombe à 0, pioche 1 carte (Résistance)… c'est un **Élixir** : **sauvetage** (il reste 4 joueurs, donc l'Élixir peut sauver), 1 PV. Mahed le frappe : 0 PV, plus de sauvetage : **éliminé, Briseur**. Mahed pioche 3 cartes de récompense, lance un Défi sur Sakuto (3 PV).
*Règle illustrée : Résistance pioche avant la fenêtre de sauvetage ; tous les Briseurs sont tombés mais l'Errant vit : la partie continue.*

**Tour 17, Sakuto (Errant).** L'Orbe instable **explose** sur lui (Terre de rang 2) : 3 PV perdus, 0 PV. Élixir de sauvetage (3 joueurs en vie : permis) : 1 PV. Il pioche (Stratège) et boit un second Élixir (2 PV).

**Tours 18 à 23.** Seul contre le Gardien et sa Sentinelle, Sakuto pare deux Frappes d'Irsy, subit un nouveau Sceau d'entrave posé par Mahed, puis une Frappe de Mahed (1 PV).

**Tour 24, Irsy.** Larcin sur Sakuto (une Parade de sa main), puis Frappe : Sakuto n'a plus ni Parade ni Élixir : 0 PV, **éliminé, Errant**.

**Fin : plus aucun Briseur ni Errant en vie, victoire du Gardien (Irsy) et de la Sentinelle (Mahed).** 24 tours, 7 tours de table. Les cinq rôles sont révélés. Personne n'a abandonné ni laissé expirer de délai, la partie dure plus de 6 tours : tous les joueurs sont éligibles aux récompenses. Aucune carte n'a changé de propriétaire.

### 11.1 Ce que la partie fictive a obligé à préciser
Ces cas étaient flous dans le cahier des charges ; les voici tranchés (et testés) :
1. **Ordre des effets de début de tour** : effondrement, puis Orbe, puis Sceau (§ 6.1).
2. **Le joueur entravé pioche-t-il ?** Oui, mais il ne joue aucune carte ; il garde ses réactions (§ 6.1, `CARTES.md`).
3. **Résistance à 0 PV** : elle pioche avant la fenêtre de sauvetage et peut se sauver avec la carte piochée (tour 16).
4. **Élixir à 2 joueurs** : jamais de sauvetage, sinon les duels ne finissent pas (§ 7.4).
5. **La Pluie qui élimine le Gardien** arrête tout, même les attaques pas encore résolues (§ 9, testé).
6. **Larcin et Riposte** utilisent la distance perçue, pas la portée pour le Larcin, la portée de **l'arme du riposteur** pour la Riposte.
7. **Choisir une carte de prêt** est toujours permis ; un joueur peut finir avec une carte de prêt alors qu'il a apporté sa propre carte (elle a pu être proposée à un autre).
8. **Rôle d'un joueur qui abandonne** : révélé comme pour une élimination ; pas de récompense pour personne sur cet abandon.

## 12. Spécificités à 2 et 3 joueurs

**Duel.** Pas de rôle, 6 PV, premier joueur au hasard, le second reçoit 7 cartes au lieu de 6. Pas d'Élixir de sauvetage. La distance naturelle est 1 : la Cape d'ombre est la seule façon d'être hors de portée d'une Dague, les armes de portée 3+ donnent une Frappe de plus. Durée simulée : 43 tours en moyenne (22 tours de table), un peu longue : voir la proposition de passer à 5 PV dans `EQUILIBRAGE.md`.

Exemple de début de duel : Sakuto (Assaut) commence, pose l'Arc des tempêtes (portée 4 : à 2 joueurs, +1 Frappe) et joue 3 Frappes dans le même tour (2 d'Assaut + 1 de l'arme longue). Kuradai (Défense) esquive la première sur Vent (à 2 joueurs, Eau ou Vent esquivent), pare la deuxième, encaisse la troisième ; Sakuto pioche 1 carte (Frappe qui touche).

**Trio.** Chacun pour soi, 5 PV. Éliminer un joueur rapporte 2 cartes. Le sauvetage par Élixir marche tant que les trois sont en vie. Attention à la **collusion** : deux joueurs qui s'entendent contre le troisième le battent presque à coup sûr (victime gagnante dans 1,3 % des parties simulées) : c'est un risque social du mode, pas un défaut de règle qu'on peut corriger simplement (voir `EQUILIBRAGE.md` § collusion).

## 13. Récapitulatif des valeurs provisoires

Toutes dans `worker/confront/config.mjs` :

| Réglage | Valeur | Étiquette |
|---|---|---|
| PV Duel / Trio / Classique | 6 / 5 / 4 | [Provisoire] |
| Bonus du Gardien (4 / 5 / 6 / 7 joueurs) | +2 / +0 / +2 / +1 | [Provisoire, corrigé] |
| Bonus de l'Errant (4 / 5 / 6 / 7 joueurs) | +0 / +0 / +1 / +1 | [Provisoire, corrigé] |
| Limite de main | PV actuels, sans plafond | [Livret, Provisoire] |
| Pioche par tour | 2 | [Livret] |
| Frappes par tour | 1 (Assaut 2) | [Livret, Original] |
| Récompense d'élimination | Briseur 3 cartes, Trio 2 | [Livret, Provisoire] |
| Sauvetage par Élixir | 3 joueurs en vie ou plus | [Provisoire] |
| Effondrement | à partir du 30e tour de table | [Original, Provisoire] |
| Compensation du second joueur en Duel | +1 carte | [Original, Provisoire, corrigé] |
| Délais | contribution 2 min, choix 45 s, tour 90 s, réaction 20 s, choix de carte 25 s, déconnecté 8 s | [Provisoire] |
| Absences avant abandon | 3 tours | [Provisoire] |
| Anti-farm | 6 tours minimum, 1 absence au plus | [Provisoire] |
