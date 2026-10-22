# Re Zéro : campagne de tests du 22 octobre 2026

Branche `dev/re-zero-complet`. Tous les tests tournent sur une base de test isolée (serveur local `wrangler dev --local` avec une base temporaire, ou base SQLite dans le navigateur pour la prévisualisation). La production n'a jamais été touchée : seule une lecture a été faite pour vérifier qu'elle ne contenait aucune trace des nouveautés (aucune).

## Prévisualisation sans installation

https://claude.ai/artifact/6xiA1siGGJxtffTESvFCrS

- Le vrai serveur du jeu (le même code que sur Cloudflare) tourne dans ton navigateur, avec sa propre base SQLite. Rien n'est envoyé ailleurs.
- Barre « Prévisu » en bas à gauche : jouer en tant que Reichi (dev), Billy (admin), Teo, Aiko ou Bram ; outils de test (+5 000 ◆, 30 boosters gratuits, compte ancien pour voter, peupler le QG, tout remettre à zéro).
- Ta partie de test est gardée dans ce navigateur. Une seule fenêtre à la fois : pour jouer à plusieurs, on change de personne dans la barre.
- Reconstruire : `python3 build.py && node tools/preview/build.mjs`.

## Ce qui a été réellement exécuté

RESULTATS_ICI

## Bugs trouvés et corrigés

| # | Bug | Où | Gravité | Correction |
|---|---|---|---|---|
| 1 | Ajouter une carte à la vitrine ou aux envies affiche « openSheet is not defined » au lieu de la confirmation, et la page ne se met pas à jour | `src/app.js` | Moyenne, **présent aussi en production** | la fonction disparue est remplacée par un nouvel affichage |
| 2 | La collection, la liste « vendre une carte » et le récapitulatif d'ouverture n'affichaient pas le design des cartes décorées | `src/views.js`, `src/views2.js` | Moyenne | design passé à ces affichages |
| 3 | Un Défilé ouvert par Billy après le chargement du site restait invisible pour les joueurs (pas de bouton « M'inscrire ») jusqu'à un rechargement | `src/views5.js` | Haute | état rechargé à chaque arrivée sur la page et toutes les 20 s |
| 4 | Même défaut possible pour la liste des salons de Confrontation | `src/views6.js` | Moyenne | liste rechargée à chaque arrivée |
| 5 | Clore le Défilé, retirer une inscription et abandonner une partie utilisaient `confirm` / `prompt`, bloqués par le lecteur de claude.ai : actions impossibles dans la prévisualisation | `src/views5.js`, `src/views6.js` | Haute (prévisualisation) | confirmation en deux clics et motif saisi dans la page |
| 6 | Journal de Confrontation : « Présage : undefined » et noms d'événements bruts (« defi perdu ») | `src/views6.js` | Faible | tous les événements du moteur ont un texte en français |
| 7 | Outil de test : un ancien serveur de test resté allumé faussait les résultats suivants | `tests/lib.mjs` | Tests | un test refuse de démarrer si le port est occupé |

## Points vérifiés en particulier

- **Tirages et récompenses côté serveur** : les requêtes falsifiées (cartes, rareté, scénario, prix, valeur de recyclage imposés par le navigateur) sont ignorées ; missions et recyclage versent exactement ce que prévoient les règles ; le labo et l'admin sont refusés aux joueurs ; personne ne peut jouer à la place d'un autre en Confrontation.
- **Les feintes ne modifient jamais les cartes** : les 30 scénarios joués par le vrai serveur (labo) et des coffres tirés au hasard ; à chaque fois les cartes montrées, retournées et récapitulées sont exactement celles tirées par le serveur, et aucune carte n'est visible avant l'ouverture. Sur une feinte, la couleur passe par des raretés plus basses puis finit sur la vraie.
- **Jamais de double débit** : double clics sur Acheter (booster, Boutique, achat au marché) et Invoquer ×1 / ×5 ; rafales simultanées par l'API (8 invocations avec de quoi en payer 3 : exactement 3 ; 5 achats avec de quoi en payer 2 : exactement 2 ; 4 « Tout réclamer » : versé une fois).
- **Cosmétiques affichés partout** : collection, fiche, carte vedette et vitrine du profil (vu par soi et par un autre joueur), annonce et fiche d'annonce au marché, Atelier, Défilé, récapitulatif.
- **Confrontation sans blocage** : une partie à 3 (2 humains + 1 bot) jouée par l'interface jusqu'à la fin ; des tables de 2 à 7 joueurs (humains et bots) jusqu'à la fin ; 3 parties complètes dans la prévisualisation ; verrous des cartes levés à la fin.
- **Mobile et animations réduites** : chaque parcours joueur en format téléphone (390 × 844, tactile), en animations réduites et sur ordi (1366 × 900).

## Tests impossibles ici

- **Vraie connexion Discord** : elle passe par Discord et le site en ligne ; tous les tests utilisent la connexion de test (`/auth/dev`), identique pour le reste du jeu.
- **Vrais téléphones** : testé dans Chromium en format téléphone et tactile, pas sur un iPhone ou un Android réel (Safari iOS en particulier n'a pas été essayé).
- **Charge réelle sur Cloudflare** : mesurée sur le serveur local ; la latence et les limites de Cloudflare et D1 en production ne sont pas reproduites.
- **Partie à 7 humains réels** : simulée (humains joués par des scripts et bots), pas avec 7 personnes.
- **Sons** : déclenchés sans erreur, mais personne ne les a écoutés.
- **Lecteur d'écran** : annonces aria-live et clavier vérifiés, pas d'audit complet avec VoiceOver ou NVDA.

## Problèmes restant à résoudre

- Les **Mythiques d'invocation** sortent plus souvent que le taux annoncé (1,5 % sur 1 000 tirages contre 0,8 % annoncé) : la garantie à 80 et le hasard. Le taux affiché pourrait indiquer le taux réel avec la garantie (environ 1,1 %).
- Le **labo admin** ne simule pas encore le marché, les quêtes, les concours ni les parties de Confrontation.
- La **prévisualisation** ne gère qu'une fenêtre à la fois (deux onglets auraient chacun leur copie de la base).
- Les **délais de Confrontation** (90 s par tour) ne sont testés que dans le moteur (temps simulé), pas en attendant réellement.
- Les **valeurs provisoires** restent à valider (`docs/DECISIONS.md`).
