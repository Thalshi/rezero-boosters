# Re Zéro : LoL — Boosters

Jeu de collection de cartes inspiré de Kyara, autour de *Re Zéro : LoL*, l'anime de Billy sur le serveur Discord QG de Shinjuku.

- `public/index.html` : l'app pour Cloudflare (connexion Discord incluse), générée par `build.py`.
- `artifact.html` : la même app pour la version claude.ai, générée par `build.py`.
- `worker/index.js` : le serveur Cloudflare (connexion Discord, base D1 pour le marché, le classement, les prédictions et l'admin).
- `wrangler.jsonc` : la configuration Cloudflare.
- `src/` : les sources (styles, données des persos, logique du jeu).
- `art/` : les illustrations des cartes, découpées dans les planches du tableau Miro.
- `build.py` : régénère les deux pages à partir de `src/` et `art/` (`python3 build.py`).

## Réglages Cloudflare (tableau de bord du Worker → Settings → Variables and Secrets)

- `DISCORD_CLIENT_ID` : l'identifiant de l'application Discord.
- `DISCORD_CLIENT_SECRET` (secret) : le secret de l'application Discord.
- `GUILD_ID` : l'identifiant du serveur QG de Shinjuku (seuls ses membres peuvent voter, vendre et apparaître au classement).
- `ADMIN_IDS` : les identifiants Discord des admins, séparés par des virgules (Billy…).

Dans Discord Developer Portal → OAuth2 → Redirects : `https://<adresse du site>/auth/callback`.
