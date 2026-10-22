# Re Zéro : décisions en attente de ton accord

Chaque point a une valeur **provisoire** déjà en place, réglable sans réécrire le jeu (une constante dans `src/game.js`, puis `python3 build.py`). Rien de cela n'est en production.
Légende : 🔴 bloque une mise en production · 🟠 à trancher avant le lancement public · 🟢 peut attendre

## Économie des boosters
| # | Décision | Options | Provisoire | Où |
|---|---|---|---|---|
| E1 🔴 | Rythme de l'économie | Accessible 30 j / Équilibré 45 j / Collectionneur 60 j pour finir le Mix (joueur régulier) | réserve 3, +1 / 2 h, 100 ◆, recyclage 1/2/5/15/40/100 (≈ 29 j) | `FREE_MAX`, `REGEN`, `PRICE`, `RAR[].chakra` |
| E2 🟠 | Seuil d'ouverture d'un booster thématique | 5, 8 ou 10 persos (+ C/PC/R présents) | 5 | `THEME_MIN` |
| E3 🟠 | Saison 1 (édition limitée) | garder ×2 L/M ou non ; durée | gratuit seulement, non achetable | `PACKS` |
| E4 🟢 | Noms définitifs des nouveaux persos | Billy | « ??? », Ogre 1…4, Soldat 1–2, Castor 1–2… | `PEOPLE` |
| E5 🟠 | Frais du marché | 0 % / 5 % / autre | 0 % (option 5 % prête) | `MARKET_FEE` |

## Cosmétiques
| # | Décision | Options | Provisoire | Où |
|---|---|---|---|---|
| C1 🔴 | Prix en Boutique | par rareté | C 60, PC 120, R 250, E 500, L 1000, M 2000 ◆ | `COS_PRICE` |
| C2 🔴 | Coût d'une invocation | ×1 / ×5 | 150 ◆ ; ×5 à 675 ◆ (−10 %) | `SUMMON_COST`, `SUMMON_DISCOUNT_5` |
| C3 🔴 | Taux d'invocation | | C 38, PC 28, R 20, E 9,5, L 3,7, M 0,8 % | `SUMMON_RATES` |
| C4 🟠 | Garanties | pity Mythique, plancher ×5 | Mythique garantie à 80, ×5 au moins une Rare | `SUMMON_PITY_M`, `SUMMON_5_FLOOR` |
| C5 🟠 | Doublons d'invocation | garder (transférables) / convertir en essence | gardés comme instances | `summonS` |
| C6 🟢 | Objets réservés au Sanctuaire | liste | 6 objets (prisme, écarlate, ailes d'ombre, glitch, runes, orbite) | `COSMETICS[].only` |

## Coffre
| # | Décision | Options | Provisoire | Où |
|---|---|---|---|---|
| K1 🟠 | Fréquence des scénarios | | secret toujours si possible ; transformation 75 % ; feinte 25 % ; spectacle 35 % → mesuré : classique 51 %, feinte 20 %, transfo 13 %, spectacle 9 %, secret 8 % | `CHEST_W`, `CHEST_SCENARIOS[].w` |
| K2 🟢 | Les scénarios aussi pour les boosters (pas seulement le coffre) ? | oui / non | coffre seulement | `Coffre.isChest` |

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
| F2 🟠 | Récompenses de partie et anti-farm | rien / essence plafonnée | à proposer après les simulations | |

## Mise en production
| # | Décision | Options |
|---|---|---|
| P1 🔴 | Lots à déployer et ordre | voir `docs/MISE_EN_PRODUCTION.md` §1 |
| P2 🟠 | Quelles nouveautés ouvrir au lancement | Interrupteurs prêts dans l'admin (Boutique, Sanctuaire, Défilé, vente avec design, Confrontation) : on peut déployer tout le code avec tout fermé, puis ouvrir une par une |
| P3 🔴 | Jeton Cloudflare en écriture pour une vraie sauvegarde D1 avant déploiement | sinon signet Time Travel seulement |
