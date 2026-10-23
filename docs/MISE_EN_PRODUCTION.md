# Re Zéro : mise en production et retour arrière

Rien de ce document n'est exécuté sans ton accord explicite (Reichi). Branche de travail : `dev/re-zero-complet`.
En production depuis le 22/10/2026 : tout (`dev/re-zero-complet` fusionnée dans `main`, nouveautés ouvertes). Point de restauration D1 pris juste avant : `0000000e-000000f9-0000510c-c116b22844c0cc2ed9ae514596faa219`.
Deuxième mise en production le 22/10/2026 au soir (nouveau coffre et clé, dévoilement carte par carte, titres, perso choisi parmi ses cartes en Confrontation, style de Confrontation sur les cartes). Point de restauration D1 pris juste avant : `00000010-00000000-0000510c-cf3b138cc44089a8cf19c7038b779a7e`.
Troisième mise en production le 23/10/2026 (icônes néon à la place des kanji, arène 3D de Confrontation, salon de table). Point de restauration D1 pris juste avant : `00000014-00000000-0000510d-24f913897d874991282b91dd155a1973`.
Quatrième mise en production le 23/10/2026 (ouvertures en 3D : coffre et ses 30 scénarios, pochette à déchirer). Point de restauration D1 pris juste avant : `00000018-00000000-0000510d-ba3016c075d37598741ee3e74dd3fe13`.
Cinquième mise en production le 23/10/2026 (compte de test : repartir de zéro et récupérer son vrai compte, dev et admin). Point de restauration D1 pris juste avant : `0000001a-0000006d-0000510d-d29459841fcac8379a9158015322f1e9`.
Sixième mise en production le 23/10/2026 (économie dure, missions refaites, salons de Confrontation : prêt, fermer, duel, partage, chacun son deck ; arène seule, quitter la partie à tout moment ; seulement la 3D aux ouvertures ; Gestion à onglets ; notifications, aperçu du Défilé). Point de restauration D1 pris juste avant : `0000001e-00000000-0000510d-2cbb3754473085ba417682a3a684ef34`.

## 1. Ce qui partirait en production

| Lot | Contenu | Touche à l'économie réelle ? |
|---|---|---|
| A. Boosters | Corrections de structure (rareté jamais au-dessus, thèmes complétés par le Mix, pity, pack du jour, Saison 1 non achetable), 25 persos de l'épisode 1, chances affichées exactes | Oui : probabilités effectives des thèmes, recyclage 1/2/5/15/40/100 |
| B. Cosmétiques | Boutique Arcanique, Sanctuaire des Invocations, Atelier, carte vedette | Oui : nouvelles dépenses d'essence (prix provisoires) |
| C. Coffre | Coffre 3D, clé, 30 scénarios (choisis par le serveur après le tirage) | Non (présentation seulement) |
| D. Admin | Galerie, contrôle qualité, laboratoire isolé | Non (données à part) |
| E. Défilé | Inscriptions, votes, récompenses | Oui : récompenses en essence (provisoires) |
| F. Marché des créations | Vente avec design, réglage des frais (laissé à 0) | Non tant que les frais restent à 0 |
| G. Synchro étape 2 | Un seul appel `/api/sync` au lieu d'un appel par abonnement | Non |
| H. Confrontation | Moteur, salons, table de jeu | À décider (récompenses) |

## 2. Base de données : aucune migration
- Aucune nouvelle table, aucune colonne : tout le nouveau tient dans les tables existantes.
  - `players.data` (JSON) reçoit des champs en plus : `cos`, `featured`, `titles`. L'ancien code les garde sans les lire (`normalizeSave` conserve les champs inconnus).
  - `docs` reçoit de nouvelles collections : `lab`, `qa`, `defile`, `confront`, `confrontcfg` (branches choisies par Billy), `creations` (catalogue du Créateur) et `creaimg` (ses images). Elles sont toutes fermées à l'API des documents ; aucune migration : ce sont des lignes de la table `docs` existante.
  - Le Créateur publie directement : à l'ouverture en production, les créations faites en test ne partent pas (base différente).
- `sync_rev` existe déjà (étape 1).
- Les `CREATE TABLE IF NOT EXISTS` au démarrage n'ajoutent rien de nouveau.

## 3. Avant de déployer (check-list)
1. Ton accord écrit sur les lots à déployer, et sur les valeurs provisoires concernées (voir `docs/DECISIONS.md`).
2. Sauvegarde D1 : `wrangler d1 export` (il faut un jeton en écriture ; le jeton actuel est en lecture seule), ou au minimum noter un signet Time Travel : `wrangler d1 time-travel info rezero` → garder le `bookmark`.
3. Lancer toute la suite : `node tests/run-all.mjs` (mesure comprise), tout doit être vert.
4. `python3 build.py`, vérifier que `worker/game.js` est bien régénéré (jamais modifié à la main).
5. Fusionner la branche dans `main` (fusion simple, pas de réécriture d'historique) et pousser : Cloudflare déploie seul (parfois plus de 10 minutes).
6. Republier la version claude.ai (VQWvCstEDhFmTZis9pnn7C) avec `artifact.html`.

## 4. Vérifications juste après
- Se connecter avec un vrai compte : ouvrir un booster, ouvrir un coffre, la Boutique, le Sanctuaire, l'Atelier, le Défilé, le marché.
- Billy : la Galerie et le Labo apparaissent dans son menu ; un joueur ne les voit pas.
- Vue Dev : santé du serveur, pas d'erreur en hausse.
- Onglet réseau du navigateur : un appel `/api/sync` toutes les 6 s, pas de rafale de `/api/doc` et `/api/coll`.

## 5. Retour arrière
**Code** : revenir au commit de `main` d'avant la fusion (`git revert` du commit de fusion, puis pousser). Cloudflare redéploie l'ancienne version.

**Données** : les nouveaux champs restent en base sans gêner l'ancien code. Points d'attention, mesurés par les tests :
- **Nouveaux persos de l'épisode 1** : l'ancien code ne les connaît pas. Un joueur qui en a tiré les garde en base, mais l'ancienne version refuse de les vendre et peut mal les afficher (`tests/sync-revisions.mjs` le signale). Si le retour arrière doit durer, il faut redéployer l'ancien code avec le nouveau catalogue (les données de cartes seules), pas l'ancien catalogue.
- **Annonces avec design** : l'ancien code vend la carte mais ignore les instances sous séquestre. Elles seraient perdues pour l'acheteur. Avant un retour arrière, retirer ces annonces (les instances reviennent au vendeur) : `SELECT path FROM docs WHERE coll = 'market' AND json_extract(data, '$.status') = 'open' AND json_extract(data, '$.dz') IS NOT NULL`.
- **Essence dépensée** en boutique ou en invocations : reste dépensée ; les cosmétiques restent en base et réapparaissent si on redéploie.
- **Défilé en cours** : l'ancien code l'ignore ; le reprendre ou le clore après le redéploiement.

**Base** (dernier recours, si des données ont été abîmées) : restaurer le signet Time Travel pris avant le déploiement (`wrangler d1 time-travel restore rezero --bookmark=…`). Attention : on perd tout ce que les joueurs ont fait depuis.

## 6. Déploiement progressif (prêt)
Chaque nouveauté a un interrupteur dans l'admin (« Nouveautés ouvertes aux joueurs », stocké dans `config/game.features`).
Recommandé : **avant** de déployer, fermer Boutique, Sanctuaire, Défilé, vente avec design et Confrontation (l'ancien code ignore ce réglage, sans risque). Le code part alors en production sans rien changer pour les joueurs à part les boosters (lot A) et le coffre. Ensuite, on ouvre chaque nouveauté quand ses valeurs sont validées.
Fermer une nouveauté ne supprime rien : les cosmétiques, designs et inscriptions restent en base.
