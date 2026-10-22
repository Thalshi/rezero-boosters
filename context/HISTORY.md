# Historique

> Journal chronologique des sessions et décisions importantes.
> Le plus récent en haut. Mis à jour via `/update`.

---

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
