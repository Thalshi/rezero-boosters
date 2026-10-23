// ===== Icônes néon (esprit hextech d'Arcane) : remplacent les kanji partout dans l'interface =====
// Traits 24×24, couleur héritée (currentColor) ; la lueur vient de la classe .ic.
const ICON = {
  back: '<path d="M15 5l-7 7 7 7"/>',
  logo: '<path d="M12 2l8.5 5v10L12 22l-8.5-5V7z"/><circle cx="12" cy="12" r="4.5"/><path d="M12 4.8v2.7M12 16.5v2.7M5.6 8.4l2.4 1.4M16 14.2l2.4 1.4"/>',
  // rôles de Confrontation
  gardien: '<path d="M4.5 9.5l3.5 3 4-6.5 4 6.5 3.5-3-1.7 9.5H6.2z"/><path d="M6 21.5h12"/><circle cx="12" cy="13.5" r="1.3"/>',
  sentinelle: '<path d="M12 2.5l7.5 3v5.5c0 5-3.3 8.6-7.5 10.5C7.8 19.6 4.5 16 4.5 11V5.5z"/><path d="M7.5 11.5s1.8-3 4.5-3 4.5 3 4.5 3-1.8 3-4.5 3-4.5-3-4.5-3z"/><circle cx="12" cy="11.5" r="1.2"/>',
  briseur: '<path d="M12 2l7 4.5v11L12 22l-7-4.5v-11z"/><path d="M12.5 5.5l-2.5 5 3.5 2.2-2.3 5.3"/>',
  // signes des présages
  feu: '<path d="M12 2.5c.8 3.7 5.5 5.2 5.5 10.5a5.5 5.5 0 01-11 0c0-3 1.7-4.4 2.2-6.4 1 1.3 2 2 3.2 2.2-.6-2.2-.6-4.2.1-6.3z"/><path d="M12 14.5c1 1 1.6 1.8 1.6 2.8a1.6 1.6 0 01-3.2 0c0-1 .6-1.8 1.6-2.8z"/>',
  eau: '<path d="M12 2.5c3.3 4.2 6.3 7.7 6.3 11.5a6.3 6.3 0 01-12.6 0c0-3.8 3-7.3 6.3-11.5z"/><path d="M9 14.5a3 3 0 003 3"/>',
  vent: '<path d="M3 8.5h11a3 3 0 10-3-3"/><path d="M3 15.5h15a3 3 0 11-3 3"/><path d="M3 12h9"/>',
  terre: '<path d="M12 2l5.5 6.5L12 22 6.5 8.5z"/><path d="M6.5 8.5h11M12 2v20"/>',
  // familles de cartes
  arme: '<path d="M19.5 3.5l-11 11M14.5 3.5h5v5"/><path d="M6 13.5l4.5 4.5M4 16.5l3.5 3.5M7.5 16.5l-3 3"/>',
  reaction: '<path d="M12 2.5l7.5 3v5.5c0 5-3.3 8.6-7.5 10.5C7.8 19.6 4.5 16 4.5 11V5.5z"/><path d="M12 7v9M8 11.5h8"/>',
  soin: '<path d="M12 2.5c3.3 4.2 6.3 7.7 6.3 11.5a6.3 6.3 0 01-12.6 0c0-3.8 3-7.3 6.3-11.5z"/><path d="M12 11v6M9 14h6"/>',
  pioche: '<rect x="4" y="7" width="11" height="14" rx="2"/><path d="M8.5 3.5h9.5a2 2 0 012 2V17"/><path d="M9.5 11.5l3 2.5-3 2.5"/>',
  zone: '<circle cx="12" cy="12" r="3"/><path d="M12 2v4.5M12 17.5V22M2 12h4.5M17.5 12H22M5 5l3.2 3.2M15.8 15.8L19 19M19 5l-3.2 3.2M8.2 15.8L5 19"/>',
  equipement: '<path d="M12 2l8.5 5v10L12 22l-8.5-5V7z"/><circle cx="12" cy="12" r="3.5"/><path d="M12 5.5v3M12 15.5v3"/>',
  differe: '<path d="M6 2.5h12M6 21.5h12"/><path d="M7 2.5c0 5.5 10 6 10 9.5s-10 4-10 9.5M17 2.5c0 5.5-10 6-10 9.5s10 4 10 9.5"/>',
  duel: '<path d="M4 4l11 11M20 4L9 15"/><path d="M13 17l4 4M11 17l-4 4M15.5 13.5l3 3M8.5 13.5l-3 3"/>',
  vol: '<path d="M3 10c3.5-3.5 14.5-3.5 18 0-1.2 5-5 6.5-9 6.5S4.2 15 3 10z"/><circle cx="8.5" cy="11" r="1.6"/><circle cx="15.5" cy="11" r="1.6"/>',
  defausse: '<circle cx="12" cy="12" r="9"/><path d="M7.5 7.5l9 9M16.5 7.5l-9 9"/>',
  sceau: '<rect x="5" y="10.5" width="14" height="10.5" rx="2"/><path d="M8 10.5V7.5a4 4 0 018 0v3"/><circle cx="12" cy="15.5" r="1.4"/><path d="M12 17v1.6"/>',
  // émotes de l'arène
  salut: '<path d="M8 13V6.5a1.5 1.5 0 013 0V11M11 11V4.5a1.5 1.5 0 013 0V11M14 11V6.5a1.5 1.5 0 013 0V13c0 4.4-2.8 7.5-6 7.5-2.6 0-4.3-1.5-5.8-4L3.3 12.6a1.5 1.5 0 012.6-1.5L8 13"/>',
  haha: '<circle cx="12" cy="12" r="9"/><path d="M7.8 10l1.6-1.3L11 10M13 10l1.6-1.3L16.2 10M8 13.5h8a4 4 0 01-8 0z"/>',
  respect: '<path d="M7 11h3l3.2-7.2c1.4 0 2.2 1 2.2 2.4L14.8 10h4.4a2 2 0 012 2.3l-1 6.1A2 2 0 0118.2 20H7z"/><path d="M3 11h4v9H3z"/>',
  defi: '<path d="M4 4l11 11M20 4L9 15"/><path d="M13 17l4 4M11 17l-4 4M15.5 13.5l3 3M8.5 13.5l-3 3"/>',
  grr: '<circle cx="12" cy="12" r="9"/><path d="M7.5 8.6l3 1.6M16.5 8.6l-3 1.6M8.3 16.6c2.1-2.1 5.3-2.1 7.4 0"/>',
  quoi: '<path d="M12 2.5l2 3.6 4.1-1-1 4.1 3.6 2.3-3.6 2.4 1 4-4.1-1L12 21.5l-2-3.6-4.1 1 1-4L3.3 12.5 6.9 10l-1-4.1 4.1 1z"/><path d="M12 8.2v4.8M12 15.4v.4"/>',
  ouin: '<circle cx="12" cy="12" r="9"/><path d="M7.8 9.8h2.4M13.8 9.8h2.4M9 16.4c2-1.5 4-1.5 6 0M8.6 11.6v3.2"/>',
  pardon: '<path d="M12 20.5s-7.5-4.6-7.5-10.4A4.2 4.2 0 0112 7.6a4.2 4.2 0 017.5 2.5c0 5.8-7.5 10.4-7.5 10.4z"/>',
  // menu
  boosters: '<rect x="3.5" y="6.5" width="10" height="14" rx="1.8" transform="rotate(-10 8.5 13.5)"/><rect x="10.5" y="4" width="10" height="14" rx="1.8"/><path d="M15.5 8.5l1.5 2.5-1.5 2.5-1.5-2.5z"/>',
  collection: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><path d="M17 13.5l3.5 3.5-3.5 3.5-3.5-3.5z"/>',
  market: '<path d="M4 8h16l-1.5 12.5h-13z"/><path d="M8.5 8V6a3.5 3.5 0 017 0v2"/><path d="M12 11.5l2 2.5-2 2.5-2-2.5z"/>',
  missions: '<rect x="4.5" y="3.5" width="15" height="18" rx="2"/><path d="M8 9l1.5 1.5L12 8M8 15l1.5 1.5L12 14M14 9.5h3M14 15.5h3"/>',
  defile: '<path d="M12 2.5l2.6 5.5 6 .8-4.4 4.1 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 8.8l6-.8z"/>',
  confront: '<path d="M4 4l11 11M20 4L9 15"/><path d="M13 17l4 4M11 17l-4 4M15.5 13.5l3 3M8.5 13.5l-3 3"/>',
  boutique: '<path d="M6 3h12l3 6-9 12L3 9z"/><path d="M3 9h18M9 3l3 6 3-6M12 9v12"/>',
  atelier: '<path d="M14.5 4.5l5 5-9.5 9.5-5 1 1-5z"/><path d="M12.5 6.5l5 5"/>',
  sanctuaire: '<ellipse cx="12" cy="12" rx="6.5" ry="9"/><ellipse cx="12" cy="12" rx="3" ry="5"/><path d="M12 1.5v2M12 20.5v2M3 12h2M19 12h2"/>',
  pred: '<circle cx="12" cy="10" r="7"/><path d="M7 20.5h10M9 17l-1 3.5M15 17l1 3.5"/><path d="M9.5 8a3 3 0 013-2"/>',
  profil: '<path d="M12 2l8.5 5v10L12 22l-8.5-5V7z"/><circle cx="12" cy="10" r="3"/><path d="M7 17.5c1.2-2.4 2.9-3.5 5-3.5s3.8 1.1 5 3.5"/>',
  wiki: '<path d="M4 4.5h6.5a2 2 0 012 2V20a1.5 1.5 0 00-1.5-1.5H4z"/><path d="M20 4.5h-6.5a2 2 0 00-2 2V20a1.5 1.5 0 011.5-1.5H20z"/>',
  classement: '<path d="M7 3.5h10v5a5 5 0 01-10 0z"/><path d="M7 5.5H4a3 3 0 003 4M17 5.5h3a3 3 0 01-3 4M12 13.5V17M8 21h8M9.5 17h5v4h-5z"/>',
  raretes: '<path d="M6 3.5h12l3 5.5-9 12-9-12z"/><path d="M3 9h18M9 3.5L12 9l3-5.5"/>',
  regles: '<path d="M6 3.5h10.5a2 2 0 012 2v13a2 2 0 01-2 2H6z"/><path d="M6 3.5a2 2 0 00-2 2v2h2M9.5 8h6M9.5 11.5h6M9.5 15h4"/>',
  infos: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.5v.5"/>',
  nouveautes: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18"/><circle cx="12" cy="12" r="2"/>',
  avis: '<path d="M4 5.5h16v10.5H11l-4.5 4v-4H4z"/><path d="M8 9.5h8M8 12.5h5"/>',
  admin: '<circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v3M21 12v2"/>',
  createur: '<path d="M4 20l1.5-5L16 4.5l3.5 3.5L9 18.5z"/><path d="M13.5 7l3.5 3.5M4 20h16"/>',
  branches: '<circle cx="12" cy="4.5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="12" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M12 6.5v10.5M12 11c-5 0-7 2-7 6M12 11c5 0 7 2 7 6"/>',
  galerie: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 16l5-5 4 4 2.5-2.5 5 5"/><circle cx="15.5" cy="8.5" r="1.5"/>',
  labo: '<path d="M9 3.5h6M10 3.5v6L4.5 19a1.5 1.5 0 001.3 2h12.4a1.5 1.5 0 001.3-2L14 9.5v-6"/><path d="M7 15h10"/>',
  dev: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
  // tuiles de l'accueil et collections
  coffre: '<path d="M3.5 10.5h17v9.5h-17z"/><path d="M3.5 10.5a8.5 6 0 0117 0"/><path d="M12 13v3M10 13h4"/>',
  piece: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7l3 5-3 5-3-5z"/>',
  couronne: '<path d="M4.5 9.5l3.5 3 4-6.5 4 6.5 3.5-3-1.7 9.5H6.2z"/><path d="M6 21.5h12"/>',
  soleil: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1"/>',
  lune: '<path d="M19.5 14.5A8 8 0 019.5 4.5a8 8 0 1010 10z"/><path d="M16 4.5l.8 1.7 1.7.8-1.7.8-.8 1.7-.8-1.7-1.7-.8 1.7-.8z"/>',
  fleur: '<circle cx="12" cy="12" r="2.2"/><path d="M12 9.8C10 6.5 10.5 3.5 12 3.5s2 3 0 6.3zM12 14.2c2 3.3 1.5 6.3 0 6.3s-2-3 0-6.3zM9.8 12C6.5 14 3.5 13.5 3.5 12s3-2 6.3 0zM14.2 12c3.3-2 6.3-1.5 6.3 0s-3 2-6.3 0z"/>',
  eclair: '<path d="M13.5 2.5L5 13.5h6l-1 8 8.5-11h-6z"/>',
  pochette: '<path d="M5 3.5h14v17H5z"/><path d="M5 7.5l3 1.5 4-1.5 4 1.5 3-1.5"/><path d="M12 12l2 2.5-2 2.5-2-2.5z"/>',
  carte: '<rect x="6" y="3" width="12" height="18" rx="2"/><path d="M12 8.5l2.5 3.5-2.5 3.5-2.5-3.5z"/>',
  // factions
  anta: '<path d="M12 21.5c-5-2-8-6-8-11V5l3.5 3L12 3l4.5 5L20 5v5.5c0 5-3 9-8 11z"/><path d="M9 12.5l2 1.2M15 12.5l-2 1.2"/>',
  enn: '<path d="M4 4l11 11M20 4L9 15"/><path d="M13 17l4 4M11 17l-4 4M15.5 13.5l3 3M8.5 13.5l-3 3"/>',
  neu: '<path d="M12 3.5v17M5 20.5h14M4 7.5h16"/><path d="M6.5 7.5L4 13.5a2.8 2.8 0 005 0zM17.5 7.5l-2.5 6a2.8 2.8 0 005 0z"/>',
  all: '<path d="M12 2.5l7.5 3v5.5c0 5-3.3 8.6-7.5 10.5C7.8 19.6 4.5 16 4.5 11V5.5z"/><path d="M12 15.5s-3.5-2.1-3.5-4.6a1.9 1.9 0 013.5-1.1 1.9 1.9 0 013.5 1.1c0 2.5-3.5 4.6-3.5 4.6z"/>',
  irl: '<path d="M12 2l8.5 5v10L12 22l-8.5-5V7z"/><circle cx="12" cy="12" r="4.5"/><path d="M12 4.8v2.7M12 16.5v2.7M5.6 8.4l2.4 1.4M16 14.2l2.4 1.4"/>',
};
// rangs de collectionneur : un hexagone de plus en plus rempli de chevrons
for (let n = 1; n <= 5; n++) ICON["rang" + n] = '<path d="M12 2l8.5 5v10L12 22l-8.5-5V7z"/>' + Array.from({ length: n }, (_, i) => `<path d="M8.5 ${16.5 - i * 2.3}l3.5-2 3.5 2"/>`).join("");
const ico = (k, cls = "ic") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k] || ICON.logo}</svg>`;
// où va chaque icône
const FAC_ICON = (fac) => (ICON[fac] ? fac : "logo");
const PACK_ICON = { mix: "logo", vilains: "anta", monde: "all", bande: "irl", coffre: "coffre", saison1: "couronne", jour: "soleil", summon: "sanctuaire" };
const TITLE_ICON = { ouverture: "boosters", invocation: "sanctuaire", confrontation: "duel", defile: "defile", collection: "collection", oracle: "pred" };
const COLL_ICON = { lumiere: "soleil", braise: "feu", givre: "lune", jardin: "fleur", neon: "eclair" };
const CF_FAMILY_ICON = { attaque: "arme", esquive: "reaction", soin: "soin", vol: "vol", defausse: "defausse", pioche: "pioche", duel: "duel", zone: "zone", arme: "arme", defense: "equipement", visee: "equipement", differe: "differe" };
const packIcon = (p) => PACK_ICON[p.id] || PACK_ICON[p.base] || (p.daily ? "soleil" : p.skins ? "coffre" : "logo");
