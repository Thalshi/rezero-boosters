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
- Préparer l'épisode 2 : débloquer ses persos, publier les prédictions.
- Faire tester le site en ligne par le QG.

## À faire / à vérifier / en attente
- Tester le site en ligne avec les vrais comptes Discord.
- Vérifier avec les vrais comptes Discord que Reichi voit la vue Dev et Billy la vue Admin.
- Lancer le contrôle des comptes (vue Dev) et décider quoi faire des comptes signalés éventuels.
- Prochaines actions de l'audit : réduire les requêtes (environ 95 par minute par joueur), ne plus effacer la saisie pendant les mises à jour, tests automatiques et migrations D1.
- Idées en attente : enchères et ordres d'achat au marché, amis et messages privés, score de confiance et signalement de joueurs, suppression de compte.

## Règles et décisions à respecter
- Le secret Discord (client secret) ne passe jamais dans le chat : il est seulement dans Cloudflare.
- C'est le serveur qui décide des tirages et de l'économie (anti-triche).
- Pas de spoil : les persos des prochains épisodes restent cachés tant que Billy ne les débloque pas.
- On ne reprend pas de Kyara le parrainage, les langues FR/EN/ES ni la rareté selon AniList.
- Rien de ce que le navigateur envoie n'est cru pour l'économie : import de sauvegarde limité à 50 cartes Communes ou Peu communes, votes validés par le serveur et refusés après fermeture.
- Avant un déploiement sensible : travailler sur une branche, tester, puis fusionner dans `main` seulement après accord de Reichi.

## Technique et pièges
- Dépôt GitHub Thalshi/rezero-boosters. Un push sur `main` déploie sur Cloudflare (https://rezero-boosters.qg-shinjuku.workers.dev). Le déploiement prend parfois plus de 10 minutes.
- Cloudflare Worker + base D1 + connexion Discord. Réglages dans `wrangler.jsonc` (identifiants du serveur Discord et de Billy).
- `python3 build.py` assemble `src/` en `public/index.html` (site), `artifact.html` (version claude.ai) et `worker/game.js` (règles pour le serveur, généré : ne pas le modifier à la main).
- La version claude.ai (https://claude.ai/artifact/VQWvCstEDhFmTZis9pnn7C) est à republier en même temps que le site.
- Rôles dans `wrangler.jsonc` : `ADMIN_IDS` (Billy) et `DEV_IDS` (Reichi). Ajouter un rôle seulement dans le tableau de bord Cloudflare ne suffit pas : il est écrasé au déploiement suivant.
- Sources de l'interface : `src/app.js`, `src/views.js`, `src/views2.js`, `src/boot.js`, `src/shell.html` et `src/head.css.html`.
