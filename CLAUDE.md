# Re : LOL · jeu de cartes

Jeu web de boosters sur l'anime de Billy (serveur Discord QG de Shinjuku). Interface calquée sur Kyara, prédictions en plus.

Contexte complet : `context/CONTEXT.md` (qui, quoi, où on en est) et `context/HISTORY.md` (journal daté). Les lire en début de session (`/prime`), les mettre à jour après un changement important (`/update`).

## Façon de travailler
- Répondre en français, en tutoyant Reichi, sans tirets longs.
- Ne jamais demander ni écrire le secret Discord : il est seulement dans Cloudflare.
- Pas de spoil : les persos des prochains épisodes restent cachés tant que Billy ne les débloque pas.

## Code
- `src/` est la source. `python3 build.py` produit `public/index.html` (site), `artifact.html` (version claude.ai) et `worker/game.js`.
- `worker/game.js` est généré à partir de `src/game.js` : ne jamais le modifier à la main.
- `src/game.js` : règles partagées par le navigateur et le serveur. `src/app.js` : logique. `src/views.js`, `src/views2.js` : pages. `src/boot.js` : événements et démarrage. `src/shell.html` et `src/head.css.html` : structure et style.
- `worker/index.js` : connexion Discord et base de documents. `worker/game-api.js` : le serveur décide des tirages, de l'essence, du marché, des échanges, du chat et des notifications.

## Déployer
- Lancer `python3 build.py`, tester, puis pousser sur `main` : Cloudflare déploie tout seul (parfois plus de 10 minutes).
- Republier aussi la version claude.ai (https://claude.ai/artifact/VQWvCstEDhFmTZis9pnn7C) avec `artifact.html`.
- Tester en local : `wrangler dev --local --var DEV_LOGIN:1`, puis `/auth/dev?id=…&name=…` pour se connecter sans Discord.
