# Proposition /update (non appliquée, en attente de ta validation)

Tu m'as demandé de te montrer le contenu exact avant d'appliquer /update. Voici ce que je propose. Rien n'est écrit dans CONTEXT.md ni HISTORY.md tant que tu ne valides pas.

## 1. CONTEXT.md

### Section « Objectifs en cours »
- Avant :
  - Préparer l'épisode 2 : débloquer ses persos, publier les prédictions.
  - Faire tester le site en ligne par le QG.
- Après :
  - Réaliser tout le cahier des charges sur la branche `dev/re-zero-complet` (suivi dans `docs/CHECKLIST.md`) : cosmétiques (Boutique Arcanique, Sanctuaire des Invocations, Atelier Arcanique), coffre et ses 30 scénarios, galerie et labo admin, carte vedette, Défilé des Légendes, marché avec designs, Re Zéro Confrontation (2 à 7 joueurs).
  - Le jeu n'est pas encore lancé : équilibrer les boosters avant le lancement (branche `boosters-economie-v1`, chiffres provisoires non validés).
  - Préparer l'épisode 2 : débloquer ses persos, publier les prédictions.

### Section « À faire / à vérifier / en attente »
- Remplacer la ligne « Prochaines actions de l'audit : réduire les requêtes... » par :
  - Étapes 0 et 1 de l'optimisation Cloudflare déployées (sauvegarde D1, révisions de synchro). Étape 2 (`/api/game/sync`) pas commencée.
- Ajouter :
  - Décisions en attente de Reichi : liste à jour dans `docs/CHECKLIST.md` (valeurs d'économie 30/45/60 jours, seuil des thèmes, Saison 1, prix des cosmétiques, coût et taux d'invocation, poids des scénarios, Défilé, frais du marché, réglages de Confrontation).

### Section « Règles et décisions à respecter », ajouter
- Les boosters donnent des persos, les invocations donnent des cosmétiques, jamais de persos.
- Boutique de skins ET invocations de skins coexistent, avec un inventaire commun et l'Atelier Arcanique pour équiper.
- L'Invocation utilise le Portail scellé (concepts B + C) : clic, une main touche le portail, effets, feinte possible ; en ×5, 5 cartes face cachée sans coffre.
- Le coffre et l'Invocation sont deux systèmes distincts : les ~30 scénarios (dossier §3) appartiennent au coffre.
- Pas de paiement réel. Pas de reprise des visuels ou textes de BANG!.
- Ne pas déployer, migrer la prod ou changer l'économie réelle sans accord explicite de Reichi.
- Le jeton Cloudflare (lecture seule) passe par les secrets réseau de l'environnement cloud, jamais dans le chat, GitHub ou un fichier.

### Section « Technique et pièges », ajouter
- Tests dans `tests/` (`node tests/run-all.mjs`), serveur local isolé avec `wrangler dev --local`. Simulation d'économie : `node tests/simulation-economie.mjs`.
- `worker/game.js` reçoit ses exports via une regex : une constante par ligne au premier niveau de `src/game.js`.
- Sources de l'interface : ajouter `src/views3.js` (Boutique, Atelier, Sanctuaire), `views4.js` (Galerie, Labo), `views5.js` (Défilé), `views6.js` (Confrontation), `coffre.js` (coffre et scénarios).
- Serveur : ajouter `worker/lab-api.js`, `worker/defile-api.js`, `worker/confront-api.js` et le moteur `worker/confront/`. `worker/confront/branches-proposees.mjs` ne doit jamais partir au navigateur (spoils).
- Synchro : le navigateur appelle `/api/sync` toutes les 6 s et ne recharge que les sections changées.
- Interrupteurs des nouveautés : Admin → « Nouveautés ouvertes aux joueurs » (`config/game.features`).

## 2. HISTORY.md (en haut)

```
## 2026-10-22 — Boosters, catalogue et début du jeu complet
- Accès Cloudflare D1 en lecture via les secrets réseau, sauvegarde et point Time Travel avant déploiement.
- Étapes 0 et 1 de l'optimisation Cloudflare déployées (révisions de synchro).
- Audit des boosters : Mythiques trop fréquentes dans Le Monde, Vilains vide à l'épisode 1, recyclage trop généreux. Correction sur la branche boosters-economie-v1 (non déployée).
- Catalogue de l'épisode 1 enrichi : 25 persos (ogres, soldats, habitants de la forêt, « ??? »), 161 cartes.
- Prototype de l'Invocation validé : Portail scellé B + C, main qui touche, feinte de rareté, ×5 en cartes face cachée.
- Lancement de la réalisation complète du cahier des charges sur dev/re-zero-complet, checklist dans docs/CHECKLIST.md.
- Réalisé sur la branche (rien en production) : Boutique Arcanique, Sanctuaire des Invocations, Atelier, carte vedette ; coffre 3D et 30 scénarios ; galerie et labo admin ; Défilé des Légendes ; vente avec design ; Re Zéro Confrontation (moteur, salons, table) ; synchro étape 2 (95 → 25 requêtes/min) ; interrupteurs par nouveauté.
- Plan de mise en production dans docs/MISE_EN_PRODUCTION.md, décisions en attente dans docs/DECISIONS.md.
```

Tu valides ?
