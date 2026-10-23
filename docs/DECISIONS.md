# Re Zéro : décisions en attente de ton accord

Chaque point a une valeur **provisoire** déjà en place, réglable sans réécrire le jeu (une constante dans `src/game.js`, puis `python3 build.py`). Ces valeurs provisoires sont en production depuis le 22/10/2026 ; simulation globale : `node tests/simulation-economie-globale.mjs` (avec `GAINS=1` pour les options de gains).
Légende : 🔴 bloque une mise en production · 🟠 à trancher avant le lancement public · 🟢 peut attendre

## Économie des boosters
| # | Décision | Options | Provisoire | Où |
|---|---|---|---|---|
| E1 ✅ | Rythme de l'économie | décidé par Reichi le 23/10 : économie dure, sans frustration | réserve 3, +1 / 3 h, booster et invocation 150 ◆, recyclage 0/1/1/4/10/25, probabilités dures, Légendaire garantie (40 boosters, 50 invocations), Mythique jamais garantie, anti-doublons 40 % ; missions : 2 du jour, 5 de la semaine (bonus dès 3), série surtout en boosters ; Mix ≈ 89 j pour un régulier | `FREE_MAX`, `REGEN`, `PRICE`, `RAR[].chakra`, `SLOT`, `LAST`, `NEW_BIAS`, `LEGEND_PITY`, `MISSIONS`, `WEEKLY` |
| E2 🟠 | Seuil d'ouverture d'un booster thématique | 5, 8 ou 10 persos (+ C/PC/R présents) | 5 | `THEME_MIN` |
| E3 🟠 | Saison 1 (édition limitée) | garder ×2 L/M ou non ; durée | gratuit seulement, non achetable | `PACKS` |
| E4 🟢 | Noms définitifs des nouveaux persos | Billy | « ??? », Ogre 1…4, Soldat 1–2, Castor 1–2… | `PEOPLE` |
| E5 🟠 | Frais du marché | 0 % / 5 % / autre | 0 % (option 5 % prête) | `MARKET_FEE` |

## Cosmétiques
| # | Décision | Options | Provisoire | Où |
|---|---|---|---|---|
| C1 🔴 | Prix en Boutique | par rareté | C 60, PC 120, R 250, E 500, L 1000, M 2000 ◆ | `COS_PRICE` |
| C2 🔴 | Coût d'une invocation | ×1 / ×5 / ×10 | 150 ◆ ; ×5 à 675 ◆ et ×10 à 1 350 ◆ (−10 %) | `SUMMON_COST`, `SUMMON_DISCOUNT_5` |
| C3 🔴 | Taux d'invocation | | C 38, PC 28, R 20, E 9,5, L 3,7, M 0,8 % | `SUMMON_RATES` |
| C4 🟠 | Garanties | pity Mythique, planchers ×5 et ×10 | Mythique garantie à 80, ×5 au moins une Rare, ×10 au moins une Épique | `SUMMON_PITY_M`, `SUMMON_5_FLOOR`, `SUMMON_10_FLOOR` |
| C5 🟠 | Doublons d'invocation | garder (transférables) / convertir en essence | gardés comme instances | `summonS` |
| C6 🟢 | Objets réservés au Sanctuaire | liste | 6 objets (prisme, écarlate, ailes d'ombre, glitch, runes, orbite) | `COSMETICS[].only` |

## Coffre
| # | Décision | Options | Provisoire | Où |
|---|---|---|---|---|
| K1 🟠 | Fréquence des scénarios | | secret toujours si possible ; transformation 75 % ; feinte 25 % ; spectacle 35 % → mesuré : classique 51 %, feinte 20 %, transfo 13 %, spectacle 9 %, secret 8 % | `CHEST_W`, `CHEST_SCENARIOS[].w` |
| K2 🟢 | Les scénarios aussi pour les boosters (pas seulement le coffre) ? | oui / non | décidé : la forme dépend du nombre (×1 une carte, ×5 une pochette, ×10 le coffre), pour les invocations et les boosters (2 boosters d'un coup = coffre) | `summonOpening`, `openManyS` |
| K3 🟠 | Le booster « Coffre hextech » seul (5 skins) | coffre / pochette | garde son coffre (c'est son nom) | `Coffre.isChest` |
| K4 🟢 | Ouvrir plus de 2 boosters d'un coup (×4 = 2 coffres…) | oui / non | non, 2 au plus | `openManyS` |

## Défilé des Légendes
| # | Décision | Options | Provisoire | Où |
|---|---|---|---|---|
| D1 🟠 | Fréquence | semaine / mois | Billy ouvre et ferme à la main | `#/defile` (admin) |
| D2 🟠 | Récompenses | essence, titres, badges, cosmétiques | 300 / 150 / 75 ◆ + 20 ◆ de participation ; 3 titres | `DEFILE_REWARDS`, `DEFILE_PARTICIPATION`, `DEFILE_TITLES` |
| D3 🟢 | Conditions de vote | | membre, 10 boosters, compte de 3 jours | `DEFILE_VOTE_MIN_*` |

## Confrontation
| # | Décision | Options | Provisoire | Où |
|---|---|---|---|---|
| F1 🟠 | PV et limite de main | | 6 / 5 / 4 PV (+1 chef) ; main = PV | `worker/confront/config.mjs` |
| F2 ✅ | Récompenses de partie et anti-farm | décidé le 23/10 : jeu illimité, gains limités | 10 ◆ par partie valable + 10 si victoire, 3 premières parties du jour | `CF_REWARD` |
| F3 ✅ | Affichage de la partie | décidé le 23/10 : seulement l'arène 3D | plus de « Vue classique » ; le plateau classique reste en secours sans WebGL. Salon et choix des cartes en 3D : maquettes à valider (https://claude.ai/artifact/16p1nCHePT95TFvBcpojSU) | `src/arena.js` |
| F4 🟢 | Salon de la table | | 8 émotes, messages de 120 caractères, 1 message toutes les 2 s, 40 derniers gardés, seuls les joueurs de la table écrivent | `worker/confront-api.js` |

## Titres
- 28 titres provisoires (liste dans `TITLES`, `src/game.js`) : ouvertures (Double couronne pour 2 Légendaires, Cœurs jumeaux pour 2 Mythiques, Trinité, Arc-en-ciel, Pluie d'or, Élu des dieux, Alignement des astres), invocations (2 Légendaires, 2 Mythiques, Mythique en ×1, 100 objets), Confrontation (1re victoire, victoire par rôle, à 1 PV, à 7 joueurs, 10 et 50 victoires), Défilé (podium, 5 participations), collection, prédictions.
- À trancher : noms, seuils (10 et 50 victoires, 10 et 25 prédictions), et si certains titres donnent aussi de l'essence (aucune pour l'instant).
- Les victoires de Confrontation ne comptent que pour une partie valable (anti-farm du moteur : durée minimale, pas d'abandon ni d'absence).

## Mise en production
| # | Décision | Options |
|---|---|---|
| P1 🔴 | Lots à déployer et ordre | voir `docs/MISE_EN_PRODUCTION.md` §1 |
| P2 🟠 | Quelles nouveautés ouvrir au lancement | Interrupteurs prêts dans l'admin (Boutique, Sanctuaire, Défilé, vente avec design, Confrontation) : on peut déployer tout le code avec tout fermé, puis ouvrir une par une |
| P3 🔴 | Jeton Cloudflare en écriture pour une vraie sauvegarde D1 avant déploiement | sinon signet Time Travel seulement |
