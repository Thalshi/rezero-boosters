# CONTEXT.md

> Contexte de ce projet pour l'assistant Claude. Source de vérité unique : qui, quoi, où on en est.
> Mis à jour avec `/update`. Détail daté : `HISTORY.md`.

---

## Le projet
- Jeu web de cartes à collectionner (ouverture de boosters) sur Re Zéro : LoL, l'anime de Billy dont les persos sont les membres du serveur Discord QG de Shinjuku.
- Un épisode sort environ chaque mois. L'épisode 1 est sorti, l'épisode 2 est attendu.
- L'interface reprend celle de Kyara (kyara.games). On a en plus un système de prédictions sur les épisodes.

## Les personnes
- Reichi : développeur du jeu. Rôle dev : tous les droits d'admin, plus la vue Dev (état du serveur, contrôle des comptes, bugs signalés).
- Billy : crée l'anime. Rôle admin (le contenu du jeu) : il décide qui peut packer quels persos, publie les prédictions, fixe l'essence gagnée par bonne réponse et fait les annonces.
- Les joueurs : les membres du serveur Discord QG de Shinjuku.

## Objectifs en cours
- Tout le cahier des charges est réalisé sur la branche `dev/re-zero-complet`, rien n'est en production. Suivi : `docs/CHECKLIST.md`, résultats : `docs/RESULTATS.md`.
- Prochaine étape : trancher les décisions de `docs/DECISIONS.md`, puis déployer par lots selon `docs/MISE_EN_PRODUCTION.md`.
- Préparer l'épisode 2 : débloquer ses persos, publier les prédictions.
- Chantier Sanctuaire ouvert : quoi gagner (proposition faite : bannière par saison avec gros lot exclusif, doublons en éclats, paliers de progression), en attente de l'avis de Reichi.
- Illustrations de Confrontation faites avec ChatGPT : lot 1 intégré (`tools/illus/import.py`), lot 2 attendu (Lance de chasse, Bâton runique, Festin du QG, Étal du marché, Kanji de garde, emblèmes sur fond transparent).

## À faire / à vérifier / en attente
- Tester le site en ligne avec les vrais comptes Discord.
- Vérifier avec les vrais comptes Discord que Reichi voit la vue Dev et Billy la vue Admin.
- Lancer le contrôle des comptes (vue Dev) et décider quoi faire des comptes signalés éventuels.
- Optimisation Cloudflare : étapes 0 et 1 en ligne ; étape 2 (`/api/sync`, 95 → 25 requêtes par minute) prête sur la branche.
- En attente de Reichi : rythme de l'économie (30, 45 ou 60 jours), prix des cosmétiques, coût et taux d'invocation, récompenses du Défilé, PV de Confrontation, lots à déployer, jeton Cloudflare en écriture pour la sauvegarde.
- En attente de Billy : noms des nouveaux persos, répartition des persos dans les 8 branches de Confrontation.
- Reste partiel : le labo admin ne simule pas encore marché, quêtes, concours et parties ; pas de test sur un vrai téléphone bas de gamme ; pas d'audit au lecteur d'écran.
- Idées en attente : enchères et ordres d'achat au marché, amis et messages privés, score de confiance et signalement de joueurs, suppression de compte.

## Règles et décisions à respecter
- Le secret Discord (client secret) ne passe jamais dans le chat : il est seulement dans Cloudflare.
- C'est le serveur qui décide des tirages et de l'économie (anti-triche).
- Pas de spoil : les persos des prochains épisodes restent cachés tant que Billy ne les débloque pas.
- On ne reprend pas de Kyara le parrainage, les langues FR/EN/ES ni la rareté selon AniList.
- Rien de ce que le navigateur envoie n'est cru pour l'économie : import de sauvegarde limité à 50 cartes Communes ou Peu communes, votes validés par le serveur et refusés après fermeture.
- Avant un déploiement sensible : travailler sur une branche, tester, puis fusionner dans `main` seulement après accord de Reichi.
- Pas de déploiement, de migration ni de changement de l'économie réelle sans accord explicite de Reichi.
- Boosters = persos ; invocations = cosmétiques, jamais de persos.
- Boutique de skins et Invocation de skins coexistent, avec un inventaire commun et l'Atelier Arcanique pour équiper.
- L'ouverture dépend du nombre, pour les invocations comme pour les boosters : ×1 une carte qui se retourne seule, ×5 une pochette, ×10 le coffre et ses 30 scénarios (2 boosters d'un coup = coffre). Le portail du Sanctuaire est supprimé.
- Pas de paiement réel. Aucun visuel ni texte de BANG! repris.
- Le jeton Cloudflare passe par les secrets réseau de l'environnement cloud, jamais dans le chat, GitHub ou un fichier.

## Technique et pièges
- Dépôt GitHub Thalshi/rezero-boosters. Un push sur `main` déploie sur Cloudflare (https://rezero-boosters.qg-shinjuku.workers.dev). Le déploiement prend parfois plus de 10 minutes.
- Cloudflare Worker + base D1 + connexion Discord. Réglages dans `wrangler.jsonc` (identifiants du serveur Discord et de Billy).
- `python3 build.py` assemble `src/` en `public/index.html` (site), `artifact.html` (version claude.ai) et `worker/game.js` (règles pour le serveur, généré : ne pas le modifier à la main).
- La version claude.ai (https://claude.ai/artifact/VQWvCstEDhFmTZis9pnn7C) est à republier en même temps que le site.
- Rôles dans `wrangler.jsonc` : `ADMIN_IDS` (Billy) et `DEV_IDS` (Reichi). Ajouter un rôle seulement dans le tableau de bord Cloudflare ne suffit pas : il est écrasé au déploiement suivant.
- Sources de l'interface : `src/illus.js` (images générées par `tools/illus/import.py`, ne pas modifier à la main), `src/app.js`, `src/views.js` à `src/views6.js`, `src/coffre.js`, `src/boot.js`, `src/shell.html` et `src/head.css.html`.
- Serveur : `worker/lab-api.js` (galerie, labo), `worker/defile-api.js`, `worker/confront-api.js` et le moteur `worker/confront/`. `worker/confront/branches-proposees.mjs` ne doit jamais partir au navigateur (spoils).
- Une constante par ligne au premier niveau de `src/game.js` : c'est ainsi que `worker/game.js` les reprend.
- Tests : `node tests/run-all.mjs` (21 suites, serveur local isolé ; définir `WRANGLER` si wrangler n'est pas installé dans `tests/`) ; simulation d'économie : `node tests/simulation-economie.mjs`.
- Le navigateur appelle `/api/sync` toutes les 6 s et ne recharge que les sections changées.
- Interrupteurs des nouveautés : Admin → « Nouveautés ouvertes aux joueurs » (`config/game.features`).
