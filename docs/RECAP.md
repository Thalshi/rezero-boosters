# Re Zéro : récap de la session du 22 octobre 2026

Branche : dev/re-zero-complet (dernier commit c6e3557). Rien n'est en production : main n'a pas bougé, aucune migration, aucune donnée réelle touchée.

## Liens

- Démo jouable (mode invité) : https://claude.ai/artifact/4veJUBwRAPRfmnRzsubsyY
- Version claude.ai officielle (à republier seulement au déploiement) : https://claude.ai/artifact/VQWvCstEDhFmTZis9pnn7C
- Prototype de l'Invocation : https://claude.ai/artifact/9VwDWaQ6pYuGn4a65bvhyC
- Site en ligne (version actuelle, sans les nouveautés) : https://rezero-boosters.qg-shinjuku.workers.dev

## Voir le jeu complet sur ton ordi

Le Défilé, Confrontation, la Galerie et le Labo ont besoin du serveur : il faut le lancer chez toi.

```
git fetch origin
git checkout dev/re-zero-complet
npx wrangler dev --local --var DEV_LOGIN:1
```

Puis dans le navigateur :

```
En admin (remplace TON_ID_DISCORD) :
http://localhost:8787/auth/dev?id=TON_ID_DISCORD&name=Reichi

En joueur, dans une fenêtre privée :
http://localhost:8787/auth/dev?id=300000000000000003&name=Teo
```

Partie seul : Menu → Confrontation → Créer → Ajouter un bot → Lancer.
Tout tourne sur une base locale vide, sans contact avec la production.

Dans la démo invité, pour avoir de l'essence de test, tape dans la console du navigateur :

```
save.chakra = 5000; persist()
```

## Ce qui a été fait

### Déjà en production (avec ton accord)
- Sauvegarde D1 et point de restauration Time Travel.
- Étapes 0 et 1 de l'optimisation Cloudflare (compteurs de synchro).

### Boosters (branche)
- La rareté n'est jamais tirée au-dessus de ce qui est prévu.
- Le Monde ne sort plus des Mythiques 40 % du temps ; Vilains n'est plus vide à l'épisode 1.
- Pity correct, pack du jour qui tourne entre les thèmes, Saison 1 non achetable.
- 25 persos de l'épisode 1 ajoutés depuis tes captures (ogres, soldats, habitants de la forêt, « ??? ») : 161 cartes.

### Cosmétiques
- Boutique Arcanique : 45 objets, 7 emplacements (cadre, aura, ornement, holographie, particules, fond, présentation).
- Sanctuaire des Invocations : Portail scellé B + C, ×1 et ×5, feinte de rareté. Jamais de persos.
- Atelier Arcanique : inventaire commun, un design par carte, affiché partout.
- Carte vedette sur le profil.

### Coffre
- Coffre 3D, clé (glisser, toucher, clavier), runes, cristal, 5 cartes face cachée, récapitulatif.
- 30 scénarios : 6 classiques, 7 feintes, 7 transformations, 6 spectaculaires, 4 secrets.
- Le serveur choisit le scénario après le tirage : le résultat n'est jamais faussé.

### Admin
- Galerie de toutes les cartes avec contrôle qualité « Validée / À revoir ».
- Labo séparé de la vraie partie : soldes, pity, 5 cartes et scénario imposés, rejouer.
- Interrupteurs pour ouvrir chaque nouveauté sans redéployer.

### Défilé des Légendes
- Copie figée de la carte et de son design à l'inscription.
- Votes secrets, pas d'auto-vote, protection contre les comptes jetables.
- Modération avec motif, récompenses versées une seule fois, gagnant à l'accueil 7 jours, archives.

### Marché
- Vente d'une carte avec son design : les objets uniques partent avec la carte, les cosmétiques de compte restent au vendeur.

### Re Zéro : Confrontation (2 à 7 joueurs)
- Règles et 82 cartes d'action originales, 8 branches.
- Salons avec code, bots, spectateurs.
- Tes cartes restent à toi, bloquées seulement pendant la partie.
- 20 400 parties simulées sans erreur.

### Technique
- Synchro étape 2 : au repos, 95 requêtes par minute deviennent 25.
- 18 suites de tests, 575 vérifications, toutes vertes sur téléphone et ordi.

## Chiffres utiles pour tes décisions

- Mix complet : occasionnel 98 jours, régulier 42 jours, très actif 24 jours.
- Le Mix est passé de 29 à 42 jours pour un joueur régulier avec les 25 nouveaux persos.
- Un joueur régulier gagne environ 660 ◆ par jour.
- Toute la Boutique (38 objets) coûte 13 320 ◆, soit environ 20 jours de gains d'un joueur régulier.
- Une invocation ×1 (150 ◆) représente environ 5 h de gains.
- Coffre : classique 51 %, feinte 20 %, transformation 13 %, spectacle 9 %, secret 8 %.

## Décisions qui t'attendent

- Rythme de l'économie : 30, 45 ou 60 jours pour finir le Mix.
- Prix de la Boutique (provisoire : C 60, PC 120, R 250, E 500, L 1000, M 2000 ◆).
- Coût d'invocation (provisoire : 150 ◆, ×5 à 675 ◆) et taux (C 38, PC 28, R 20, E 9,5, L 3,7, M 0,8 %).
- Récompenses du Défilé (provisoire : 300 / 150 / 75 ◆ + 20 ◆ de participation).
- PV de Confrontation (je recommande 5 PV en duel).
- Frais du marché (prêt mais laissé à 0 %, option 5 %).
- Lots à déployer et nouveautés à ouvrir au lancement.
- Un jeton Cloudflare en écriture pour une vraie sauvegarde avant déploiement.
- Pour Billy : noms des nouveaux persos, répartition des persos dans les 8 branches.

Détail complet : docs/DECISIONS.md

## Retour arrière : deux points à savoir

- L'ancien code ne connaît pas les nouveaux persos : il refuse de les vendre.
- Il ignore les objets d'une annonce « avec design » : l'acheteur ne les recevrait pas. Retirer ces annonces avant tout retour arrière.

Détail complet : docs/MISE_EN_PRODUCTION.md

## Reste partiel

- Le labo admin ne simule pas encore le marché, les quêtes, les concours ni les parties de Confrontation.
- Pas de test sur un vrai téléphone bas de gamme.
- Pas d'audit complet au lecteur d'écran.

## Documents

- docs/CHECKLIST.md : l'état de chaque point du cahier des charges
- docs/DECISIONS.md : ce que tu dois trancher
- docs/MISE_EN_PRODUCTION.md : déploiement et retour arrière
- docs/RESULTATS.md : tests et simulations
- docs/confrontation/REGLES.md : les règles de Confrontation
- context/CONTEXT.md et context/HISTORY.md : contexte à jour
