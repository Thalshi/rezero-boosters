# Historique

> Journal chronologique des sessions et décisions importantes.
> Le plus récent en haut. Mis à jour via `/update`.

---

## 2026-10-23 — Ouvertures en 3D en production, retours Confrontation, économie
- En production (accord de Reichi) : coffre 3D (×10, 2 boosters) qui se brise après le tour de clé, avec les 30 scénarios rejoués en 3D ; pochette 3D (×5, un booster) à déchirer au doigt ; cartes qui prennent vie (Légendaire, Mythique, Dorée). « Version légère » et ancienne ouverture en secours. Correctif aussi déployé : les cartes de la collection apparaissent dans le choix de Confrontation.
- Prêt sur `dev/confront-retours`, pas en ligne : choix des cartes façon draft et deck enregistré, Duel sans Lien vital ni Festin, 2 équipements au plus (le suivant remplace le plus ancien), cartes volées ou détruites montrées en grand, pioche et éléments expliqués.
- Économie : simulation globale (`tests/simulation-economie-globale.mjs`). Recyclage et missions font plus de 95 % de l'essence ; un joueur régulier gagne ~15 000 ◆ par mois, les cosmétiques sont trop faciles. Décidé avec Reichi : d'abord réduire les gains, ensuite la Boutique façon Discord et les prix des cosmétiques.

## 2026-10-23 — Troisième mise en production : arène 3D et icônes néon
- En production (accord de Reichi) : icônes néon Arcane à la place des kanji dans tout le site, arène 3D branchée sur la vraie Confrontation (main en glisser-déposer, réactions, chrono, historique, fiches, récap des rôles), salon de table (8 émotes, messages), « Vue classique » en un clic et en secours sans WebGL.
- Corrigé en route : toucher un champion hors cible annule la visée, une carte injouable n'est plus défaussée sans le vouloir, victoire par rôle comptée seulement s'il y a un rôle.
- Bots : toujours des cartes de prêt (emblèmes) ; un joueur qui apporte ses cartes voit son perso sur son champion.
- Tests : arène 30/30, campagne 106/106, autres suites vertes. Point de restauration D1 dans docs/MISE_EN_PRODUCTION.md.

## 2026-10-22 — Icônes néon partout, arène 3D en cours d'intégration
- Kanji remplacés par des icônes néon Arcane dans tout le site (`src/icons.js` : logo, rôles, éléments, familles de cartes, menus, factions, rangs, coffre). Commité sur `dev/re-zero-complet`, pas encore en production.
- Reichi a remarqué que la nouvelle arène 3D n'était pas dans le jeu déployé (c'était un prototype) : intégration en cours dans la vraie Confrontation (salon émotes et chat côté serveur, arène branchée sur le vrai moteur, vue classique en secours).

## 2026-10-22 — Deuxième mise en production : coffre, dévoilement, titres, Confrontation
- En production (à la demande de Reichi) : nouveau coffre et nouvelle clé, dévoilement carte par carte avec effets en rotation (3 par rareté), 28 titres à gagner et à afficher près du pseudo, Confrontation où chacun choisit son perso parmi ses propres cartes, style de Confrontation affiché sur ses cartes et leur fiche. Point de restauration D1 noté dans docs/MISE_EN_PRODUCTION.md.
- Bug corrigé (aussi en production avant) : le dos des cartes au dévoilement était écrasé par la règle des champs de saisie.
- Prototypes à valider, pas encore dans le jeu : coffre en vraie 3D qui se fissure et éclate, carte Légendaire ou Mythique qui « prend vie » (https://claude.ai/artifact/QrZzHsoPnusVGCZpxEdADe) ; arène 3D de Confrontation jouable contre des bots, avec rôle secret, 25 cartes, présages, chrono 90 s, glisser-déposer, historique, émotes, salon, fiches des champions et icônes néon à la place des kanji (https://claude.ai/artifact/YRN2CKY8CHyzcG14By9BYN). Mode « figurine » essayé puis écarté par Reichi.
- Demandes en attente : remplacer les kanji par des icônes néon dans tout le site (planche à valider), Boutique façon Discord (effets de profil animés, décorations, collections à thème, aperçu avant achat).
- 22 suites de tests vertes (845 vérifications).

## 2026-10-22 — Mise en production complète, design Arcane Néon
- Tout déployé en production (fusion de `dev/re-zero-complet` dans `main`), toutes les nouveautés ouvertes, à la demande de Reichi. Point de restauration D1 noté avant.
- Design « Arcane Néon » choisi parmi 4 propositions (Arcane, Néon Shinjuku, Encre et sceau, mélange) et appliqué à toute l'app, avec une barre de navigation en bas sur téléphone.
- Créateur : Billy et Reichi ajoutent ou retouchent persos, cartes et cosmétiques depuis l'app, publiés directement, sans spoil, avec historique et notification à l'autre.
- Confrontation : visuels finaux (25 cartes, emblèmes, fond de table), livret « Comment jouer » illustré, une branche par carte (variante en Épique et plus, réglable par Billy), deux camps sans Errant réglés à 50/50 par table.
- Coffre : les cartes se dévoilent une par une après l'animation, comme sur Kyara. Bug corrigé : les auras étaient invisibles partout.
- 22 suites de tests vertes (816 vérifications).

## 2026-10-22 — Campagne de tests, illustrations, ouverture selon le nombre
- Campagne de tests complète sur base isolée et prévisualisation sans installation (serveur du jeu dans le navigateur) : https://claude.ai/artifact/6xiA1siGGJxtffTESvFCrS. 8 bugs trouvés et corrigés, dont « openSheet is not defined » aussi présent en production.
- Boutique refaite façon Boutique Discord ; clé du coffre au clic et coffre qui éclate ; Confrontation lisible (cartes illustrées, bandeau d'aide, PV) ; skins façon LoL.
- Premier lot d'illustrations ChatGPT intégré (20 cartes, 8 emblèmes, 6 fonds de skins) ; 5 cartes attendent le lot 2.
- Ouverture selon le nombre : ×1 une carte, ×5 une pochette, ×10 le coffre ; invocation ×10 (1 350 ◆, au moins une Épique) ; « Ouvrir 2 · coffre » pour les boosters ; portail supprimé.
- 21 suites de tests vertes (769 vérifications). Rien en production.

## 2026-10-22 — Jeu complet sur une branche
- Accès Cloudflare D1 en lecture via les secrets réseau ; étapes 0 et 1 de l'optimisation déployées.
- Audit et correction des boosters (Le Monde, Vilains, recyclage), 25 persos ajoutés à l'épisode 1 (161 cartes).
- Prototype de l'Invocation validé : Portail scellé B + C, main qui touche, feinte de rareté.
- Réalisé sur dev/re-zero-complet : Boutique, Sanctuaire, Atelier, carte vedette, coffre à 30 scénarios, galerie et labo admin, Défilé, vente avec design, Re Zéro Confrontation, synchro étape 2, interrupteurs.
- 18 suites de tests vertes (575 vérifications) ; plan de mise en production et liste des décisions dans docs/.

## 2026-10-21 — Audit, sécurité et rôles
- Audit complet du projet : deux failles critiques trouvées (import de sauvegarde falsifiée, votes modifiables après la réponse).
- Corrigé et déployé : import limité à 50 cartes Communes ou Peu communes, votes validés par le serveur, paiement unique et seulement pour les votes faits à temps.
- Contrôle des comptes en lecture seule et vue Dev : état du serveur, comptes suspects, bugs signalés.
- Rôles séparés : Billy admin (contenu du jeu), Reichi dev (outils techniques et droits d'admin).
- « Choisis ton booster » : boosters en grille sur ordi.
- Ajout de CLAUDE.md, du kit /update et /prime, et des fichiers de contexte.

## 2026-10-21 — Interface Kyara, missions, comptoir
- Missions de la semaine, premiers pas, succès, pack du jour et booster divin.
- Comptoir (chat du QG) et notifications : ventes, échanges, mentions, nouvel épisode, prédictions, annonces de Billy.
- Toute l'interface refaite à l'identique de Kyara, avec l'univers Re Zéro : LoL et l'onglet Prédictions en plus.
- Billy fixe l'essence gagnée pour chaque bonne prédiction. Nouvelles missions et succès liés aux prédictions et au chat.
- Installation du kit /update et /prime.

## 2026-10-20 — Coffre hextech, skins, multijoueur
- Coffre hextech façon LoL et 90 skins des membres du QG.
- Échanges entre joueurs, profils, vitrine, liste d'envies, classements.
- Le serveur décide des tirages et de l'économie.

## 2026-10-19 — Première version en ligne
- Hébergement Cloudflare avec connexion Discord réservée au QG de Shinjuku.
- Cartes débloquées par épisode, Billy admin.
- Prédictions sur l'épisode 2.
