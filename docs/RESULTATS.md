# Re Zéro : résultats des tests et des simulations

Branche `dev/re-zero-complet`, 22 octobre 2026. Relancer : `node tests/run-all.mjs` (serveur local isolé, base temporaire, jamais la production).

## Suite complète : 18 suites, 575 vérifications, 0 échec
| Suite | Vérifications | Ce qu'elle prouve |
|---|---|---|
| boosters | 28 | rareté jamais au-dessus, thèmes complétés par le Mix, pity, pack du jour, chances affichées exactes |
| api-securite | 27 | rien de ce que le navigateur envoie n'est cru pour l'économie |
| api-economie | 21 | ouvertures, marché, échanges et comptoir sous concurrence, sans duplication |
| api-confidentialite | 44 | chacun ne lit que ce qu'il a le droit de lire |
| api-cosmetiques | 27 | prix et tirages du serveur, refus, instance sur une seule carte, design perdu avec la carte |
| coffre | 24 | 30 scénarios, tous atteignables ; choisis après le tirage ; une feinte montre toujours moins que la vérité |
| ui-invite | 19 | la version claude.ai (invité) marche hors ligne |
| ui-cosmetiques | 40 | Boutique, Sanctuaire (×1, ×5, sans animation), Atelier, vedette, sur téléphone et ordi |
| ui-coffre | 42 | clé au clavier, au glisser et au toucher, scénarios jusqu'au bout, « Passer », animations réduites |
| admin-labo | 36 | droits, isolation totale du labo, ouvertures imposées, contrôle qualité |
| defile | 33 | copie figée, anti-comptes jetables, pas d'auto-vote, votes simultanés, clôture unique, égalités |
| marche-designs | 11 | séquestre des instances, achat, annulation, effets de compte jamais transférés |
| fonctionnalites | 11 | une nouveauté fermée disparaît du menu et le serveur la refuse |
| confront-engine | 130 | scénarios obligatoires du dossier, secrets, délais, double soumission, conservation des cartes |
| confront-api | 29 | salon, code, bot, contributions depuis la collection, partie complète par l'API, verrous |
| ui-multijoueur | 21 | parcours à plusieurs joueurs dans de vrais navigateurs |
| sync-revisions | 31 | compteurs de synchro, et retour arrière vers l'ancien Worker |
| mesure | 1 | charge réelle mesurée (ci-dessous) |

Captures d'écran (téléphone et ordi) dans `tests/reports/`.

## Charge serveur (synchro étape 2)
| Scénario | Avant | Après |
|---|---|---|
| Onglet ouvert au repos, 60 s | 95 requêtes Worker · 206 D1 · 15 915 lignes lues | 25 · 66 · 3 008 |
| Onglet masqué, 60 s | 29 · 65 · 4 706 | 15 · 37 · 1 879 |
| Comptoir ouvert, 60 s | 112 · 288 · 21 803 | 42 · 148 · 8 896 |
| Admin au repos, 60 s | 105 · 226 · 16 335 | 26 · 68 · 3 050 |

## Économie (simulation, 12 joueurs par profil, 180 jours, valeurs provisoires)
| Profil | Mix complet | Tous les skins | Essence gagnée en 30 jours |
|---|---|---|---|
| Occasionnel | 98 jours | plus de 180 jours | 7 107 ◆ |
| Régulier | 42 jours | 136 jours | 19 806 ◆ |
| Très actif | 24 jours | 123 jours | 21 666 ◆ |

Repères pour fixer les prix des cosmétiques :
- toute la Boutique (38 objets) coûte 13 320 ◆, soit environ 20 jours de gains d'un joueur régulier ;
- une invocation ×1 (150 ◆) représente environ 5 h de ses gains.

Le Mix est passé de 29 à 42 jours pour un joueur régulier depuis l'ajout des 25 persos de l'épisode 1 (161 cartes) : à prendre en compte pour la décision E1.

## Coffre : fréquence mesurée des scénarios (20 000 coffres, joueurs qui progressent)
Classique 51 %, feinte 20 %, transformation 13 %, spectacle 9 %, secret 8 %.

## Confrontation (20 400 parties simulées par des bots)
- Aucune boucle infinie, aucune action refusée, les 82 cartes toujours présentes en fin de partie.
- Écart entre la meilleure et la pire branche, après 8 corrections : duel 18,3 points, trio 9,6, 4 joueurs 10,1, 5 joueurs 5,9, 6 joueurs 7,1, 7 joueurs 5,3.
- Détail et limites (bots simples, collusion en trio) : `docs/confrontation/EQUILIBRAGE.md`.
