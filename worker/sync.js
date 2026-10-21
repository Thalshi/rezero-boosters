// Compteurs de version par section, préparés pour la future synchronisation (/api/game/sync).
// Étape 1 : chaque écriture incrémente le compteur de sa section (config, market, trades, chat…).
// Personne ne lit encore ces compteurs : le comportement du jeu est inchangé.

// Ajouts seulement (« s'ils n'existent pas ») : l'ancien code les ignore, rien n'est modifié ni supprimé.
export const SYNC_SCHEMA = [
  "CREATE TABLE IF NOT EXISTS sync_rev (k TEXT PRIMARY KEY, v INTEGER NOT NULL, t INTEGER NOT NULL)",
  "CREATE INDEX IF NOT EXISTS docs_coll_updated ON docs (coll, updated)",
];

// Section d'un chemin de document : son premier segment (market/abc → market, votes/d123 → votes).
export const revKeyOf = (path) => String(path || "").split("/")[0];

// Incrémente une ou plusieurs sections. Une erreur ici ne doit jamais faire échouer l'action du joueur :
// au pire, la section sera rattrapée par la synchro complète de secours (étape 3).
export async function bumpRev(env, ...keys) {
  const list = [...new Set(keys.filter(Boolean))];
  if (!list.length) return;
  const now = Date.now();
  try {
    await env.DB.batch(list.map((k) => env.DB.prepare("INSERT INTO sync_rev (k, v, t) VALUES (?, 1, ?) ON CONFLICT(k) DO UPDATE SET v = v + 1, t = excluded.t").bind(k, now)));
  } catch (e) {
    console.error("sync_rev : compteur non incrémenté", list, e?.message);
  }
}
