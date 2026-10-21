# Re Zéro : LoL — Boosters

Jeu de collection de cartes inspiré de Kyara, autour de *Re Zéro : LoL*, l'anime de Billy sur le serveur Discord QG de Shinjuku.

- `index.html` : l'app complète (un seul fichier, images incluses). C'est ce que Cloudflare Pages publie.
- `src/` : les sources (styles, données des persos, logique du jeu).
- `art/` : les illustrations des cartes, découpées dans les planches du tableau Miro.
- `build.py` : régénère `index.html` à partir de `src/` et `art/` (`python3 build.py`).

Sur Cloudflare Pages : pas de commande de build, dossier de sortie `/`.
