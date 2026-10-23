// ===== Gestion : tout ce qui sert à l'admin et au dev, dans une seule rubrique à onglets =====
// Les pages gardent leur adresse (#/admin, #/createur…) : seul le menu change (une entrée « Gestion ») et chaque page
// reçoit la barre d'onglets en haut.
ROUTES.push("tests");
const GEST_TABS = () => [
  ["admin", "admin", "Admin", IS_ADMIN], ["createur", "createur", "Créateur", IS_ADMIN || IS_DEV], ["branches", "branches", "Branches", IS_ADMIN],
  ["galerie", "galerie", "Galerie", IS_ADMIN], ["labo", "labo", "Labo", IS_ADMIN], ["tests", "profil", "Compte de test", SRV && (IS_ADMIN || IS_DEV)], ["dev", "dev", "Dev", IS_DEV],
].filter((x) => x[3]);
const isGest = (v) => GEST_TABS().some((x) => x[0] === v);
const gestHome = () => GEST_TABS()[0]?.[0] || "admin";
function gestBar(cur) {
  return `<nav class="wrap gest" aria-label="Gestion"><p class="eyebrow">Gestion · admin et dev</p><div class="utabs gest-tabs">${GEST_TABS().map(([v, k, l]) => `<button type="button" data-nav="${v}" aria-pressed="${v === cur}">${ico(k)} ${l}</button>`).join("")}</div></nav>`;
}
VIEWS.tests = () => `<div class="wrap page">${head("Gestion", "Compte de test")}${SRV && (IS_ADMIN || IS_DEV) ? testZone() : empty("Réservé à l'admin et au dev, sur le site du QG.")}</div>`;
for (const v of ["admin", "createur", "branches", "galerie", "labo", "tests", "dev"]) { const f = VIEWS[v]; if (f) VIEWS[v] = () => (isGest(v) ? gestBar(v) : "") + f(); }
