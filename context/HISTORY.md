# Historique

> Journal chronologique des sessions et décisions importantes.
> Le plus récent en haut. Mis à jour via `/update`.

---

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
