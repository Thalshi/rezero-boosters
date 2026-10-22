# Re Zéro : checklist de réalisation

Source : dossier `RE_ZERO_DOSSIER_CLAUDE` (01 prompt maître, 03 Invocation, 04 complément technique, 02 références, maquettes v4, règles BANG! en référence mécanique) et décisions de Reichi en conversation.
Branche de travail : `dev/re-zero-complet` (partie de `boosters-economie-v1`). Rien n'est déployé ni migré en production sans accord.

Légende : ✅ terminé · 🟡 partiel · ⬜ à développer · ⛔ bloqué par une décision (option provisoire documentée, réglable sans code)

Mise à jour : à chaque fonctionnalité terminée.

## Décisions déjà prises (à respecter)
- L'Invocation utilise le **Portail scellé (B + C)** : on touche le portail, une main touche le sceau, charge, fissures, éclats ; ×1 et ×5 ; feinte de rareté.
- **Boutique Arcanique** (achat direct de cosmétiques) **et Sanctuaire des Invocations** (cosmétiques aléatoires) coexistent, avec un **inventaire cosmétique commun** et l'**Atelier Arcanique** pour équiper.
- Les **boosters restent dédiés aux personnages** ; les invocations ne donnent jamais de personnages.
- Coffre et Invocation sont **deux systèmes distincts** (le coffre garde ses ~30 scénarios d'ouverture).
- Confrontation : 2 à 7 joueurs ; une carte par branche et par joueur, cartes de prêt pour les branches manquantes, réserve commune, deux personnages proposés par joueur, choix d'un, aucun transfert de propriété ; pas de puissance liée à la rareté.
- Design actuel de Re Zéro conservé ; serveur autoritaire ; aucun paiement réel.

## 1. Boosters, catalogues, économie (dossier §2)
| # | Élément | État | Notes |
|---|---|---|---|
| 1.1 | 5 cartes par booster, raretés C/PC/R/E/L/M, table par emplacement | ✅ | `src/game.js` SLOT/LAST |
| 1.2 | Tirage serveur avant animation | ✅ | `worker/game-api.js` /open |
| 1.3 | Rareté tirée d'abord, jamais au-dessus, thème complété par le Mix | ✅ branche | tests `tests/boosters.mjs` |
| 1.4 | Aucun booster vide, ouverture des thèmes selon le catalogue | ✅ branche | seuil provisoire 5 persos + C/PC/R (⛔ seuil à valider) |
| 1.5 | Pack du jour : rotation sur les boosters ouverts, secours Mix | ✅ branche | |
| 1.6 | Pity Mythique correct (compte seulement si Mythique possible) | ✅ branche | |
| 1.7 | Variantes dorées 2 % + garantie tous les 10 | ✅ | |
| 1.8 | Saison 1 non achetable par l'API | ✅ branche | ⛔ sort de Saison 1 (×2 L/M) à décider |
| 1.9 | Catalogue épisode 1 enrichi (25 persos secondaires) | ✅ branche | ⛔ noms définitifs (???, Ogre 1…) à donner par Billy |
| 1.10 | Chances affichées exactes (pack du jour compris) | ✅ branche | |
| 1.11 | Valeurs économiques (réserve, recharge, prix, recyclage) | ⛔ | provisoire : 3 / 2 h / 100 ◆ / 1-2-5-15-40-100 ; scénarios 30/45/60 j à trancher |
| 1.12 | Simulation 7/30/90/180 j, 3 profils | ✅ | `tests/simulation-economie.mjs` ; à étendre aux cosmétiques |
| 1.13 | Commissions du marché (puits d'essence) | ⛔ | option : 5 % ; réglable |
| 1.14 | Coût et récompenses des cosmétiques dans l'économie | ⛔ | prix provisoires réglables par l'admin |
| 1.15 | Export `MYTHIC_PITY` et constantes vers le serveur | ✅ branche | |

## 2. Coffre hextech / arcanique (dossier §3)
| # | Élément | État | Notes |
|---|---|---|---|
| 2.1 | Coffre ouvrable, 5 cartes face cachée, récapitulatif | 🟡 | version simple (toucher, tremble, retourner) en ligne |
| 2.2 | Coffre 3D, vraie ouverture du couvercle | ⬜ | prototype 3D existant à intégrer |
| 2.3 | Clé : glisser, clic, tactile, clavier | ⬜ | prototype existant |
| 2.4 | Runes et cristal | ⬜ | |
| 2.5 | Teinte selon la meilleure rareté réelle (R bleu, E violet, L or, M rouge) | 🟡 | lueur existante, à porter sur le coffre |
| 2.6 | Variantes or visibles | 🟡 | |
| 2.7 | Moteur modulaire de scénarios (conditions, pondérations, tests) | ⬜ | un seul moteur, pas 30 systèmes |
| 2.8 | 6 scénarios classiques | ⬜ | |
| 2.9 | 7 fake drops / faux redémarrages (résultat jamais falsifié) | ⬜ | |
| 2.10 | 7 transformations (plusieurs E, 2 L, L+M, 2 M, plusieurs or…) | ⬜ | |
| 2.11 | 6 spectaculaires | ⬜ | |
| 2.12 | 4 secrets | ⬜ | |
| 2.13 | Sons facultatifs, passer, mobile, animations réduites | 🟡 | passer existe ; sons ⬜ |
| 2.14 | Pondérations des scénarios | ⛔ | poids provisoires réglables |

## 3. Galerie et administration (dossier §4)
| # | Élément | État | Notes |
|---|---|---|---|
| 3.1 | Admin : épisodes, déblocages, prédictions, annonces | ✅ | |
| 3.2 | Vue Dev : santé serveur, contrôle des comptes | ✅ | |
| 3.3 | Galerie de toutes les cartes (même non possédées), filtres, zoom, variantes | ⬜ | sans octroi de propriété |
| 3.4 | Contrôle qualité des illustrations (marquage QA) | ⬜ | |
| 3.5 | Bac à sable admin isolé côté serveur (faux soldes, inventaires, marché, pity, quêtes, or, cosmétiques, concours, invocations, parties) | ⬜ | données séparées, jamais les vraies |
| 3.6 | « Tester l'ouverture avec cette carte », forcer 5 résultats et un scénario, rejouer | ⬜ | |
| 3.7 | Permissions serveur strictes | 🟡 | rôles admin/dev existants |

## 4. Cosmétiques : Boutique, Sanctuaire, inventaire, Atelier (dossier §5 + décisions)
| # | Élément | État | Notes |
|---|---|---|---|
| 4.1 | Catalogue de cosmétiques sans bonus : cadres, auras, couronnes/auréoles/ailes, holographie, particules, fonds, présentations | ⬜ | ne cachent pas le visage, compatibles Communes |
| 4.2 | Inventaire cosmétique commun | ⬜ | |
| 4.3 | Deux natures : cosmétique de compte (réutilisable, non transférable) et instance unique (transférable) | ⬜ | |
| 4.4 | Boutique Arcanique : prévisualiser, acheter (essence) | ⬜ | ⛔ prix |
| 4.5 | Sanctuaire des Invocations : ×1 et ×5, tirage serveur, Portail scellé | ⬜ | ⛔ coût, probabilités, garanties, doublons |
| 4.6 | Feinte de rareté et intensité selon la rareté | 🟡 | prototype |
| 4.7 | Atelier Arcanique : prévisualiser, équiper, retirer, enregistrer un design | ⬜ | |
| 4.8 | Cartes personnalisées affichées partout (collection, fiche, profil, marché) | ⬜ | |

## 5. Profil, carte vedette, Défilé des Légendes (dossier §6)
| # | Élément | État | Notes |
|---|---|---|---|
| 5.1 | Profil public, vitrine de 4 cartes | ✅ | |
| 5.2 | Carte vedette avec son design ; retrait auto si vendue | ⬜ | |
| 5.3 | Défilé hebdomadaire/mensuel : inscription volontaire, snapshot figé | ⬜ | ⛔ fréquence |
| 5.4 | Votes sans auto-vote, anti-sybil, égalités | ⬜ | |
| 5.5 | Modération (retrait d'une inscription, motif) | ⬜ | |
| 5.6 | Récompenses modérées (essence, titres, badges, cosmétiques) | ⬜ | ⛔ montants |
| 5.7 | Gagnant mensuel à l'accueil une semaine, archives | ⬜ | |

## 6. Marché et échanges (dossier §6)
| # | Élément | État | Notes |
|---|---|---|---|
| 6.1 | Vente, achat, retrait, cote, historique | ✅ | |
| 6.2 | Échanges équilibrés, transferts atomiques, anti-duplication | ✅ | |
| 6.3 | Vendre une carte nue ou avec son design (liste des cosmétiques transférables inclus) | ⬜ | |
| 6.4 | Effets de compte en aperçu seulement, jamais transférés | ⬜ | |
| 6.5 | Frais de vente | ⛔ | option 5 % |
| 6.6 | Badges et titres personnels jamais transférés | ⬜ | |

## 7. Invocation (dossier §7, 03 + décisions)
| # | Élément | État | Notes |
|---|---|---|---|
| 7.1 | Audit et trois concepts | ✅ | prototype `claude.ai/artifact/9VwDWaQ6pYuGn4a65bvhyC` |
| 7.2 | Portail scellé B+C choisi | ✅ | |
| 7.3 | Intégration réelle (Sanctuaire, voir 4.5) | ⬜ | |
| 7.4 | Storyboard, états, erreurs, mobile, animations réduites, passer | 🟡 | prototype |

## 8. Confrontation (dossier §8 à §12, 04)
| # | Élément | État | Notes |
|---|---|---|---|
| 8.1 | Livre de règles complet (2, 3, 4–7), partie fictive commentée | ✅ branche | `docs/confrontation/REGLES.md` (branche `dev/confrontation-moteur`), adaptation originale, partie à 5 tour par tour |
| 8.2 | Catalogue original des cartes d'action avec quantités | ✅ branche | `docs/confrontation/CARTES.md`, 82 cartes, `worker/confront/cards.mjs` |
| 8.3 | Modes : Duel 2, Trio 3 sans rôles, classique 4–7 avec rôles | ✅ branche | moteur `worker/confront/engine.mjs` |
| 8.4 | 8 branches (Assaut, Défense, Stratège, Voleur, Précision, Résistance, Survie, Chance) | ✅ branche | `branches.mjs` ; ⛔ répartition des persos `branches-proposees.mjs` à valider par Billy |
| 8.5 | Contributions (une carte par branche), prêts, réserve commune, 2 propositions, choix | ✅ branche | moteur ; blocage des instances pendant la partie à faire côté serveur |
| 8.6 | Moteur serveur : tours, pioche, actions, réactions, délais, défausse, PV, portée, distance, armes, équipements | 🟡 | moteur pur fini et testé ; intégration dans `worker/game-api.js` (stockage D1, routes) ⬜ |
| 8.7 | Informations secrètes filtrées, anti-triche, reconnexion, abandon, journal | 🟡 | `viewFor`, `eventsFor`, nonce/rev/promptId testés ; archivage du journal et diffusion côté serveur ⬜ |
| 8.8 | Salons privés/publics, invitations, prêt, chronomètres, spectateurs | ⬜ | le moteur gère le salon minimal (rejoindre, lancer) et la vue spectateur ; le reste est serveur |
| 8.9 | Interface : lobby, contribution, mélange, choix, table 2/3/7, main privée, réactions, résultats | ⬜ | mobile |
| 8.10 | Simulations 2–7 joueurs, matrice d'équilibrage | ✅ branche | `tests/confront-sim.mjs` (20 400 parties), `docs/confrontation/EQUILIBRAGE.md`, 8 corrections limitées appliquées et réversibles |
| 8.11 | Scénarios de tests obligatoires (04 §4) | ✅ branche | `tests/confront-engine.mjs` : 130 vérifications |
| 8.12 | Valeurs : PV 6/5/4, bonus Gardien/Errant par table, limite de main | ⛔ | provisoires dans `worker/confront/config.mjs` ; proposition duel à 5 PV (voir EQUILIBRAGE.md) |
| 8.13 | Récompenses de partie, anti-farm | ⛔ | le moteur calcule l'éligibilité ; montants et plafonds serveur à décider |

## 9. Technique, sécurité, performance (dossier §12, 04 §7)
| # | Élément | État | Notes |
|---|---|---|---|
| 9.1 | Tests automatiques (sécurité, économie, confidentialité, parcours) | ✅ | `tests/` |
| 9.2 | Compteurs de synchro `sync_rev` (étape 1) | ✅ | en ligne |
| 9.3 | Route de synchro unique `/api/game/sync` (étape 2+) | ⬜ | |
| 9.4 | Index et lecture par deltas | ⬜ | |
| 9.5 | Performances mobiles (images, animations, mémoire) | 🟡 | |
| 9.6 | Accessibilité (clavier, lecteurs d'écran, animations réduites) | 🟡 | |
| 9.7 | Plan de mise en production et de retour arrière | ⬜ | `docs/MISE_EN_PRODUCTION.md` |

## Plan de réalisation (ordre, dépendances, critères de validation)
1. **Fondations cosmétiques** (4.1–4.3) → critère : catalogue + inventaire côté serveur, tests de propriété et de transfert.
2. **Boutique Arcanique** (4.4) ← 1 → achat serveur atomique, refus si essence insuffisante, tests.
3. **Atelier Arcanique + cartes personnalisées** (4.7, 4.8) ← 1 → design enregistré par carte, affiché partout, sans cacher le visage.
4. **Sanctuaire des Invocations** (4.5, 7.3) ← 1 → tirage serveur ×1/×5, Portail scellé, feinte, aucun personnage obtenu, tests de probabilités.
5. **Coffre arcanique + moteur de scénarios** (2.x) → 30 scénarios, conditions testées, résultat identique au serveur dans 100 % des cas.
6. **Galerie et laboratoire admin** (3.3–3.6) ← 5 → bac à sable isolé, aucune écriture hors sandbox (test).
7. **Carte vedette + profil** (5.2) ← 3.
8. **Défilé des Légendes** (5.3–5.7) ← 7.
9. **Marché des créations** (6.3–6.6) ← 3.
10. **Confrontation** (8.x) : moteur et règles (parallélisable dès le début), puis salons et interface, puis simulations.
11. **Synchro étape 2+ et performances** (9.3–9.6).
12. **Livraison** : démo, résultats, décisions restantes, plan de mise en production (9.7).
