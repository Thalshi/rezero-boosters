# Tests de Re Zéro : LoL

Tests de non-régression et mesure des requêtes Cloudflare. Tout tourne **en local** : chaque fichier démarre son propre `wrangler dev --local` avec une base D1 temporaire, effacée à la fin. Rien n'est envoyé à la base de production, rien n'est déployé.

## Lancer

```
cd tests
npm install            # wrangler + playwright (une seule fois)
npm test               # toute la suite, sans la mesure (~3 min)
npm run test:tout      # avec la mesure des requêtes (~6 min)
npm run mesure         # seulement la mesure
```

Si wrangler ou playwright sont déjà installés ailleurs : `WRANGLER=/chemin/vers/wrangler node run-all.mjs`. Les rapports JSON sont écrits dans `tests/reports/<date>/` (ignoré par git).

## Contenu

| Fichier | Ce qu'il vérifie |
|---|---|
| `api-securite.mjs` | Import de sauvegarde (falsifiée, légitime, ancien chemin), votes de prédiction (avant/après clôture et réponse), réclamations simultanées, contrôle des comptes |
| `api-economie.mjs` | Boosters et concurrence, marché (vente, double achat, retrait), échanges (course accepter/annuler, déséquilibre, refus), comptoir, notifications, annonces |
| `api-confidentialite.mjs` | Accès sans connexion, rôles admin/dev, documents réservés, échanges privés, votes, anciennes sauvegardes, avis, bugs, notifications, profils publics |
| `ui-invite.mjs` | Version sans serveur (`artifact.html`) : toutes les pages, booster, missions, sauvegarde locale, aucune requête réseau |
| `ui-multijoueur.mjs` | Parcours à 3 joueurs dans le navigateur, avec le délai d'affichage chez l'autre joueur : menus par rôle, booster, prédictions, marché, échanges, comptoir, notifications, admin |
| `mesure.mjs` | Requêtes Worker, requêtes D1, lignes lues et écrites par scénario, avec une base remplie (20 joueurs, 400 annonces, 2 000 messages…), et projection sur une journée |
| `instrumented-worker.mjs` | Enveloppe du vrai Worker pour compter les opérations (utilisée seulement par la mesure) |

Les identifiants Discord des tests sont factices. La connexion de test (`/auth/dev`) n'existe qu'en local (`DEV_LOGIN=1`).
