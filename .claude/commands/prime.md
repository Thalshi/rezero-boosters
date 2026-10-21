# /prime

Démarre une session de travail avec le contexte complet du collaborateur.

---

## Mission

Quand l'utilisateur lance `/prime`, exécute la séquence suivante :

### Étape 1 — Charger le contexte
Lis dans cet ordre, en intégralité :
1. `CLAUDE.md` (racine)
2. `context/CONTEXT.md`
3. `context/HISTORY.md`

Si `CONTEXT.md` est encore le placeholder (jamais configuré), dis-le et propose de lancer `/setup-jarvis` d'abord.

### Étape 2 — Résumer la situation
Présente un résumé clair selon cette structure :

```
Salut [Prénom], contexte chargé. Voici où on en est :

**Qui tu es**
[2-3 lignes de synthèse du profil]

**Tes objectifs court terme**
- [Top objectifs en cours]

**Tes projets / chantiers actifs**
- [Liste]

**Dernière session ou changement notable**
- [Si HISTORY.md a une entrée récente, la résumer]

Prêt à bosser. Tu veux qu'on fasse quoi aujourd'hui ?
```

### Étape 3 — Attendre les instructions
Ne lance aucune action de toi-même. Attends que l'utilisateur donne le sujet.

---

## Règles
- Si des fichiers sont vides ou incomplets, signale-le et propose de les remplir.
- Si tu détectes une incohérence entre les fichiers, signale-la calmement.
- Pas de suppositions sur la tâche du jour, attends les instructions.
- Tutoiement, français, pas de tirets longs.
