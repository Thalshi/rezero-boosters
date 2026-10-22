// ===== Confrontation : livret de règles illustré (#/confront/regles) et fiches des rôles =====
// Textes originaux, écrits pour Re Zéro à partir de docs/confrontation/REGLES.md (règles appliquées par le moteur).
const RI = (d, vb = "0 0 64 64") => `<svg viewBox="${vb}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ROLES = {
  gardien: {
    nom: "Gardien", kanji: "守", col: "var(--gold)", vu: "Visible de tous",
    icon: RI(`<path d="M18 14l7 7 7-11 7 11 7-7-3 14H21z"/><path d="M14 30h36v10c0 10-8 16-18 20-10-4-18-10-18-20z"/><path d="M32 36v14"/>`),
    but: "Survivre jusqu'à ce que tous les Briseurs soient éliminés.",
    camp: "Avec les Sentinelles, mais tu ne sais pas qui elles sont.",
    plus: "Tu commences la partie. Selon la table, tu as des PV ou des cartes en plus (voir « Réglages de chaque table »).",
    conseil: "Frappe avec prudence : si tu élimines une Sentinelle, tu défausses toute ta main et tout ton équipement.",
  },
  sentinelle: {
    nom: "Sentinelle", kanji: "衛", col: "var(--cyan)", vu: "Secret",
    icon: RI(`<path d="M32 8l20 8v14c0 13-9 22-20 26-11-4-20-13-20-26V16z"/><circle cx="32" cy="30" r="6"/><path d="M20 30h6M38 30h6"/>`),
    but: "Protéger le Gardien : ton camp gagne quand tous les Briseurs sont tombés, le Gardien encore debout.",
    camp: "Avec le Gardien. Tu gagnes avec lui même si tu es éliminé en chemin.",
    plus: "Personne ne sait que tu es Sentinelle : à toi de le montrer par tes actes (soigner le Gardien, frapper ses ennemis).",
    conseil: "Le Gardien ne te connaît pas et peut te frapper par erreur : aide-le assez tôt pour qu'il te fasse confiance.",
  },
  briseur: {
    nom: "Briseur", kanji: "破", col: "var(--acc)", vu: "Secret",
    icon: RI(`<circle cx="32" cy="32" r="20"/><path d="M30 12l-4 14 8 6-6 10 4 10"/><path d="M12 52l10-10M52 12L42 22"/>`),
    but: "Éliminer le Gardien.",
    camp: "Avec les autres Briseurs, sans savoir qui ils sont. Vous gagnez tous ensemble, même ceux déjà éliminés.",
    plus: "Vous êtes les plus nombreux (2 ou 3 selon la table).",
    conseil: "Éliminer un Briseur fait piocher 3 cartes à celui qui l'a fait : ne te montre pas trop tôt.",
  },
  errant: {
    nom: "Errant", kanji: "孤", col: "#b072ff", vu: "Secret",
    icon: RI(`<path d="M32 8c-9 0-14 7-14 15v9l-6 24h40l-6-24v-9C46 15 41 8 32 8z"/><path d="M25 26c2 2 5 2 7 0M32 26c2 2 5 2 7 0"/><path d="M24 40h16"/>`),
    but: "Être le dernier joueur en vie, seul contre tous.",
    camp: "Personne. Tu joues pour toi.",
    plus: "Tu as un PV de plus à 6 et 7 joueurs.",
    conseil: "Le Gardien doit tomber en dernier : s'il tombe alors qu'un autre joueur que toi est encore en vie, ce sont les Briseurs qui gagnent. Aide-le parfois contre les Briseurs.",
  },
};
// deux camps, sans Errant (rôle retiré : il gagnait surtout par hasard) ; mêmes valeurs que worker/confront/config.mjs
const ROLE_ORDER = ["gardien", "sentinelle", "briseur"];
const ROLE_SPLIT = { 4: [1, 1, 2], 5: [1, 2, 2], 6: [1, 2, 3], 7: [1, 3, 3] };
const ROLE_BONUS = { 4: "Gardien : 2 cartes de plus au départ, Sentinelle : 1", 5: "chaque Briseur : 2 cartes de plus au départ", 6: "Gardien : 2 PV de plus", 7: "Gardien : 3 cartes de plus au départ" };
// fiche d'un rôle (livret, salon, et « ton rôle » pendant la partie)
function roleCard(r, opts = {}) {
  const R = ROLES[r];
  return `<article class="rl-card ${opts.mine ? "mine" : ""}" style="--rc:${R.col}">
    <div class="rl-top"><span class="rl-ic">${R.icon}</span><div><p class="rl-k">${R.kanji} · ${R.vu}</p><h3>${opts.mine ? `Tu es ${R.nom}` : R.nom}</h3></div></div>
    <p class="rl-but"><b>But</b> ${R.but}</p>
    <p><b>Camp</b> ${R.camp}</p>${opts.short ? "" : `<p><b>À savoir</b> ${R.plus}</p>`}
    <p class="rl-tip">${R.conseil}</p></article>`;
}
// petit schéma : la table vue de haut, distances depuis « Toi »
const DIST_SVG = (() => {
  const n = 6, cx = 150, cy = 120, rx = 118, ry = 82, d = [0, 1, 2, 3, 2, 1];
  const seats = Array.from({ length: n }, (_, i) => { const a = Math.PI / 2 + (i / n) * Math.PI * 2; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
  return `<svg class="rg-dist" viewBox="0 0 300 250" role="img" aria-label="Six joueurs autour de la table : tes voisins sont à distance 1, les suivants à 2, celui d'en face à 3">
    <ellipse cx="${cx}" cy="${cy}" rx="${rx - 30}" ry="${ry - 26}" fill="#ffffff08" stroke="#ffffff22"/>
    ${seats.map(([x, y], i) => `<g><circle cx="${x}" cy="${y}" r="21" fill="${i ? "#1c1a24" : "#f5c518"}" stroke="${i ? "#ffffff44" : "#f5c518"}" stroke-width="2"/>
      <text x="${x}" y="${y + 5}" text-anchor="middle" font-size="${i ? 16 : 11}" font-weight="700" fill="${i ? "#fff" : "#1a1406"}">${i ? d[i] : "Toi"}</text></g>`).join("")}
    <text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="11" fill="#ffffff99">distance depuis toi</text></svg>`;
})();
const SIGN_COL = { feu: "#ff4d2e", eau: "#4d9bff", vent: "#3fbf7f", terre: "#c8964a" };
const RG_FAMS = [["attaque", "Attaquer"], ["esquive", "Se défendre (hors de ton tour)"], ["soin", "Se soigner"], ["vol", "Voler et défausser"], ["pioche", "Piocher"], ["duel", "Duels et attaques de zone"], ["arme", "Armes"], ["defense", "Équipements"], ["differe", "Effets différés"]];
const RG_FAM_OF = (d) => (d.cat === "defausse" ? "vol" : d.cat === "zone" ? "duel" : d.cat === "visee" ? "defense" : d.cat);
const RG_TOC = [["but", "But"], ["roles", "Rôles"], ["perso", "Personnage"], ["miseenplace", "Mise en place"], ["tour", "Le tour"], ["distance", "Distance"], ["combat", "Combat"], ["presage", "Présage"], ["cartes", "Cartes"], ["elim", "Élimination"], ["fin", "Fin"], ["petites", "2 et 3 joueurs"], ["temps", "Délais"]];

function viewRegles() {
  if (!CF.cat) cfCat().then(() => { if (view === "confront" && param === "regles") draw(); });
  const cat = CF.cat || { cartes: {}, branchIds: [], branches: {}, signes: [] };
  const defs = Object.entries(cat.cartes || {}), total = defs.reduce((a, [, d]) => a + (d.qte || 0), 0);
  const fam = (f) => defs.filter(([, d]) => RG_FAM_OF(d) === f);
  const sec = (id, n, title, body) => `<section class="sec rg-sec" id="rg-${id}"><p class="rg-n">${n}</p><h2>${title}</h2>${body}</section>`;
  return `<div class="wrap page rg">${head("Confrontation · 対決 · Livret", "Comment jouer", "Le livret complet de Re Zéro : Confrontation. De 2 à 7 joueurs, environ 20 à 40 minutes. Le serveur applique toutes ces règles : tu ne peux pas te tromper, mais mieux vaut savoir ce qui t'attend.")}
    <div class="row"><button class="btn sm" type="button" data-nav="confront">‹ Retour aux salons</button></div>
    <section class="sec rg-quick"><h2>En 30 secondes</h2><ol class="rg-steps">
      <li><b>Un camp</b><span>Gardien et Sentinelles contre Briseurs, à partir de 4 joueurs. Seul le Gardien est connu : à toi de deviner qui est avec toi.</span></li>
      <li><b>Un personnage</b><span>Tiré de ta collection ou de celles des autres. Sa branche lui donne un pouvoir.</span></li>
      <li><b>À ton tour</b><span>Pioche 2 cartes, joue ce que tu veux (une seule Frappe), garde au plus autant de cartes que tes PV.</span></li>
      <li><b>À 0 PV</b><span>Tu es éliminé et ton rôle est révélé. La partie s'arrête dès qu'un camp a gagné.</span></li></ol></section>
    <nav class="rg-toc" aria-label="Sommaire">${RG_TOC.map(([id, l], i) => `<a href="#/confront/regles" data-rg="${id}"><b>${i + 1}</b>${l}</a>`).join("")}</nav>

    ${sec("but", 1, "Le but du jeu", `<p>Chaque joueur incarne un personnage et tente d'atteindre l'objectif de son camp. Le nombre de joueurs fixe le mode :</p>
      <div class="rg-modes">
        <div><b>Duel</b><span>2 joueurs · 6 PV</span><p>Pas de rôle : fais tomber l'autre à 0 PV.</p></div>
        <div><b>Trio</b><span>3 joueurs · 5 PV</span><p>Pas de rôle, chacun pour soi : sois le dernier debout.</p></div>
        <div class="hl"><b>Classique</b><span>4 à 7 joueurs · 4 PV</span><p>Rôles secrets : chaque camp a son propre objectif.</p></div></div>`)}

    ${sec("roles", 2, "Les rôles (mode Classique)", `<p>Au début de la partie, chacun reçoit un rôle au hasard. Le <b>Gardien</b> se montre à tous ; les autres rôles restent <b>secrets</b> : tu ne connais que le tien. Un rôle se révèle quand son joueur est éliminé, et tous à la fin.</p>
      <div class="rl-grid">${ROLE_ORDER.map((r) => roleCard(r)).join("")}</div>
      <h3>Combien de chaque rôle ?</h3><p>Deux camps de taille proche. Chaque table a un petit réglage pour que <b>chaque camp gagne environ une partie sur deux</b> (mesuré sur 2 000 parties simulées par table) : ce n'est pas le rôle tiré qui décide, ce sont tes choix.</p>
      <div class="tbl-wrap"><table class="rg-tbl"><thead><tr><th>Joueurs</th>${ROLE_ORDER.map((r) => `<th style="color:${ROLES[r].col}">${ROLES[r].nom}s</th>`).join("")}<th>Réglage de la table</th></tr></thead>
        <tbody>${Object.entries(ROLE_SPLIT).map(([n, v]) => `<tr><td>${n}</td>${v.map((x) => `<td>${x || "–"}</td>`).join("")}<td class="rg-bonus">${ROLE_BONUS[n]}</td></tr>`).join("")}</tbody></table></div>
      <h3>Qui gagne ?</h3><p>Le serveur vérifie après chaque élimination :</p>
      <ol class="rg-ol"><li>Le <b>Gardien</b> vient de tomber : les <b>Briseurs</b> gagnent, tous, même ceux déjà éliminés.</li>
        <li>Plus aucun Briseur en vie : le <b>Gardien et les Sentinelles</b> gagnent, même ceux déjà éliminés.</li><li>Sinon, on continue.</li></ol>
      <div class="rg-box"><b>Récompense et pénalité</b><p>Éliminer un <b>Briseur</b> fait piocher 3 cartes, quel que soit ton rôle. Si le <b>Gardien élimine une Sentinelle</b>, il défausse toute sa main et tout ce qui est posé devant lui.</p></div>`)}

    ${sec("perso", 3, "Ton personnage et sa branche", `<p>Les personnages viennent de vos collections : chacun peut <b>apporter au plus une carte par branche</b>. Pour chaque branche que tu laisses vide, le jeu ajoute une <b>carte de prêt</b> (un personnage générique). Tout est mélangé, puis chacun reçoit <b>deux propositions secrètes</b> et en choisit une.</p>
      <div class="rg-box"><b>Tes cartes restent à toi</b><p>Jouer la carte d'un autre ne change rien à la propriété ni au design. Pendant la partie, les cartes apportées ne peuvent être ni vendues ni échangées ; elles sont libérées à la fin.</p></div>
      <p>Chaque carte a une <b>branche</b>, qui donne son pouvoir. Les cartes Épique, Légendaire et Mythique d'un perso ont souvent une <b>autre branche</b> que ses cartes plus communes : deux cartes du même perso peuvent donc jouer différemment. Ce n'est jamais plus fort, juste différent : une Commune et une Mythique de la même branche ont exactement le même pouvoir. Quand tu apportes tes cartes, chacune est rangée sous sa branche.</p>
      <div class="cf-branches">${(cat.branchIds || []).map((b) => `<div class="cf-br">${cfEmb(b)}<div><h3>${esc(cfBranch(b).nom)}</h3><p class="note">${esc(cfBranch(b).pouvoir)}</p></div></div>`).join("")}</div>`)}

    ${sec("miseenplace", 4, "Mise en place", `<ol class="rg-ol"><li>Le serveur place les joueurs au hasard autour de la table.</li>
      <li>Chacun reçoit ses PV (Duel 6, Trio 5, Classique 4 ; à 6 joueurs, le Gardien en a 2 de plus).</li>
      <li>La pioche commune de ${total || 82} cartes d'action est mélangée.</li>
      <li>Le <b>Gardien</b> commence (au hasard en Duel et en Trio).</li>
      <li>Chacun reçoit autant de cartes que ses PV, plus le réglage de la table (cartes en plus pour un camp, voir les rôles). En Duel, le second joueur reçoit une carte de plus.</li></ol>`)}

    ${sec("tour", 5, "Le déroulement d'un tour", `<div class="rg-flow">
      <div><i>1</i><b>Début du tour</b><p>Les effets posés devant toi agissent : Orbe instable, puis Sceau d'entrave.</p></div>
      <div><i>2</i><b>Pioche</b><p>Pioche 2 cartes. Stratège et Voleur piochent autrement.</p></div>
      <div><i>3</i><b>Joue</b><p>Autant de cartes que tu veux, une à la fois. Tu n'es jamais obligé de jouer.</p></div>
      <div><i>4</i><b>Fin</b><p>Garde au plus autant de cartes que tes PV actuels, défausse le reste.</p></div></div>
      <div class="rg-box"><b>Trois limites</b><p>Une seule <b>Frappe d'essence</b> par tour (Assaut : 2 ; Lames jumelles : sans limite). Une seule <b>arme</b> : en poser une nouvelle remplace l'ancienne. Jamais deux <b>équipements</b> identiques devant toi.</p></div>`)}

    ${sec("distance", 6, "Distance et portée", `<div class="rg-two">${DIST_SVG}<div>
      <p>La <b>distance</b> entre deux joueurs, c'est le nombre de places qui les séparent par le plus court chemin autour de la table. Les éliminés ne comptent plus : les survivants se rapprochent.</p>
      <p>La <b>portée</b>, c'est jusqu'où ton arme frappe. Sans arme, tu as la <b>Dague d'essence</b> : portée 1. Une Frappe ne vise qu'un joueur dont la distance est inférieure ou égale à ta portée.</p>
      <p class="note">Modifier la distance : Cape d'ombre (on te voit 1 plus loin), Œil du hibou et branche Précision (tu vois les autres 1 plus près). Minimum 1.</p></div></div>
      <div class="rg-arms">${["lames", "lance", "baton", "arc", "canon"].map((k) => `<span><b>${esc(cat.cartes?.[k]?.nom || k)}</b>portée ${cat.cartes?.[k]?.portee ?? "?"}</span>`).join("")}</div>`)}

    ${sec("combat", 7, "Attaquer et se défendre", `<p>Quand une attaque te vise, dans cet ordre :</p>
      <ol class="rg-ol"><li><b>Voile de brume</b> posé devant toi : présage, sur Eau tu esquives.</li>
        <li>Branche <b>Défense</b> : présage, sur Eau tu esquives (Eau ou Vent à 2 ou 3 joueurs).</li>
        <li>Sinon, le jeu te demande : <b>Parade</b> (annule), <b>Riposte runique</b> (annule et renvoie l'attaque) ou <b>encaisser</b> (perdre 1 PV).</li>
        <li>Un <b>Kanji de garde</b> posé devant toi annule la perte de PV, puis il part à la défausse.</li></ol>
      <p class="note">Les PV ne dépassent jamais ton maximum. Résistance pioche quand elle perd des PV ; Assaut pioche quand sa Frappe touche.</p>`)}

    ${sec("presage", 8, "Le présage", `<p>Certains effets demandent un <b>présage</b> : on retourne la carte du dessus de la pioche et on lit son signe (et parfois son rang, de 1 à 10). Chaque carte porte son signe dans le coin.</p>
      <div class="rg-signs">${(cat.signes?.length ? cat.signes : [{ id: "feu", kanji: "火", nom: "Feu" }, { id: "eau", kanji: "水", nom: "Eau" }, { id: "vent", kanji: "風", nom: "Vent" }, { id: "terre", kanji: "土", nom: "Terre" }]).map((s) => `<span style="--sc:${SIGN_COL[s.id]}"><b>${s.kanji}</b>${esc(s.nom)}</span>`).join("")}</div>
      <p class="note">Eau : esquive (Voile, Défense). Feu : se libérer d'un Sceau d'entrave. Terre de rang 1 à 4 : l'Orbe instable explose. La branche Chance retourne 2 cartes et garde la meilleure.</p>`)}

    ${sec("cartes", 9, `Les ${defs.length || 25} cartes d'action`, `<p>${total || 82} cartes dans la pioche commune. Elles n'existent que pendant la partie : elles ne s'achètent pas et ne se gagnent pas. Le chiffre indique combien il y en a.</p>
      ${!defs.length ? `<p class="note">Chargement des cartes…</p>` : RG_FAMS.map(([f, label]) => fam(f).length ? `<h3 class="rg-fam" style="--fc:${CF_FAM[f]?.[0] || "#8a8590"}">${label}</h3><div class="rg-cards">${fam(f).map(([k, d]) => `<div class="rg-card">${cfFace({ def: k, signe: "", rang: "" })}<span class="rg-q">×${d.qte}</span><p>${esc(d.texte)}</p></div>`).join("")}</div>` : "").join("")}`)}

    ${sec("elim", 10, "Tomber à 0 PV", `<p>À 0 PV, une dernière chance s'ouvre : un <b>Élixir de vie</b> (+1 PV, seulement s'il reste au moins 3 joueurs en vie) ou la <b>Ténacité</b> de Survie (défausse 2 cartes, +1 PV). Sinon tu es <b>éliminé</b> : ton rôle est révélé, toutes tes cartes vont à la défausse, et tu ne comptes plus dans les distances.</p>`)}

    ${sec("fin", 11, "Fin de la partie", `<p>La partie s'arrête <b>à l'instant</b> où un camp a gagné, même au milieu d'une attaque. Un joueur peut abandonner à tout moment : il est éliminé comme les autres. Au bout de 30 tours de table, le sceau s'effondre : chaque joueur perd 1 PV au début de son tour, pour que la partie se termine.</p>
      <p>À la fin, les cartes apportées sont libérées et les cartes de prêt disparaissent. Rien n'a changé de propriétaire.</p>`)}

    ${sec("petites", 12, "À 2 et 3 joueurs", `<p>Tout le monde est voisin (distance 1). Pour que les armes et les branches gardent leur intérêt :</p>
      <ul class="rg-ol"><li>Armes de portée 3 ou plus : une Frappe de plus par tour.</li><li>Précision : tes Frappes ne peuvent pas être esquivées par un présage.</li><li>Défense : esquive sur Eau ou Vent.</li><li>Voleur : ne vole qu'un joueur qui a au moins 3 cartes.</li>
        <li>En Trio, éliminer un joueur fait piocher 2 cartes. En Duel, l'Élixir ne sauve pas à 0 PV.</li></ul>`)}

    ${sec("temps", 13, "Délais et absences", `<p>Tu as 90 secondes par action à ton tour et 20 secondes pour réagir à une attaque. Sans réponse, le jeu choisit pour toi (Parade si tu en as une, sinon tu encaisses). Trois tours de suite sans jouer valent abandon. Si tu perds la connexion, tu retrouves ta partie en revenant.</p>`)}
    <div class="row" style="justify-content:center"><button class="btn gold big" type="button" data-nav="confront">Aller aux salons</button></div></div>`;
}
document.addEventListener("click", (e) => {
  const a = e.target.closest("[data-rg]"); if (!a) return;
  e.preventDefault(); document.getElementById("rg-" + a.dataset.rg)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
});

// ===== Admin : branche de Confrontation de chaque carte (#/branches) =====
// Le serveur propose (branche du perso ; une 2e branche en Épique et plus) ; Billy ajuste carte par carte.
ROUTES.push("branches");
const BRX = { data: null, loading: false, filtre: "" };
async function brxLoad() {
  if (BRX.loading) return; BRX.loading = true;
  try { await cfCat(); BRX.data = await srv("confront/branches"); } catch (e) { BRX.data = { error: e.message }; }
  BRX.loading = false; if (view === "branches") draw();
}
async function brxSet(ids, branch) {
  try { BRX.data = await srv("confront/branches/set", { ids, branch }); toast(ids.length > 1 ? `${ids.length} cartes mises à jour.` : "Branche enregistrée."); }
  catch (e) { toast(e.message); }
  draw();
}
const brxOf = (id) => BRX.data.choix[id] || BRX.data.proposees[id];
function viewBranches() {
  if (!IS_ADMIN) return `<div class="wrap page">${empty("Cette page est réservée à Billy.")}</div>`;
  if (!SRV) return `<div class="wrap page">${empty("Les branches se règlent sur le site du QG.")}</div>`;
  if (!BRX.data) { brxLoad(); return `<div class="wrap page"><p class="note">Chargement…</p></div>`; }
  if (BRX.data.error) return `<div class="wrap page">${empty(esc(BRX.data.error))}</div>`;
  const ids = CF.cat?.branchIds || [], opts = (sel) => ids.map((b) => `<option value="${b}" ${b === sel ? "selected" : ""}>${esc(cfBranch(b).nom)}</option>`).join("");
  const count = Object.fromEntries(ids.map((b) => [b, 0])); for (const c of ALL_CARDS) count[brxOf(c.id)]++;
  const changed = Object.keys(BRX.data.choix).length;
  const people = Object.entries(PEOPLE).sort((a, b) => Object.keys(FACTIONS).indexOf(a[1].fac) - Object.keys(FACTIONS).indexOf(b[1].fac))
    .map(([who, p]) => ({ who, p, cards: ALL_CARDS.filter((c) => c.who === who).sort((a, b) => RAR[a.rar].rank - RAR[b.rar].rank) }))
    .filter((x) => x.cards.length && (BRX.filtre !== "modif" || x.cards.some((c) => BRX.data.choix[c.id])) && (BRX.filtre !== "var" || new Set(x.cards.map((c) => brxOf(c.id))).size > 1));
  return `<div class="wrap page" style="max-width:980px">${head("Admin · Confrontation", "Branches des cartes", "Chaque carte a une branche, qui donne son pouvoir en Confrontation. Proposition de départ : la branche du perso, et une deuxième branche pour ses cartes Épique, Légendaire et Mythique. Ce n'est jamais plus fort, juste différent. Tu changes ce que tu veux : c'est pris en compte dès la prochaine partie.")}
    <div class="brx-sum">${ids.map((b) => `<span>${cfEmb(b, "sm")} ${esc(cfBranch(b).nom)} <b>${count[b]}</b></span>`).join("")}</div>
    <p class="note">${changed ? `${changed} carte${changed > 1 ? "s" : ""} modifiée${changed > 1 ? "s" : ""} par toi.` : "Aucune modification : tout suit la proposition."} Cette page cite des persos pas encore débloqués : ne la montre pas aux joueurs.</p>
    ${seg("brxF", [["", "Tous les persos"], ["var", "Avec variantes"], ["modif", "Modifiés"]], BRX.filtre)}
    <div class="brx-list">${people.map(({ who, p, cards }) => `<div class="brx-p">
      <div class="brx-h"><b>${esc(p.name)}</b><span class="note">${FACTIONS[p.fac]?.label || ""}</span>
        <label class="brx-all">Toutes ses cartes <select data-brxall="${who}" aria-label="Branche de toutes les cartes de ${esc(p.name)}"><option value="">Choisir…</option>${opts("")}<option value="__prop">Revenir à la proposition</option></select></label></div>
      <div class="brx-cards">${cards.map((c) => { const b = brxOf(c.id), mod = !!BRX.data.choix[c.id];
        return `<label class="brx-c ${mod ? "mod" : ""}"><span class="brx-r" style="--rc:${RAR[c.rar].color}">${RAR[c.rar].label}</span><span class="brx-t">${esc(subOf(c))}</span>
          <span class="brx-sel">${cfEmb(b, "sm")}<select data-brx="${c.id}" aria-label="Branche de ${esc(p.name)} · ${esc(subOf(c))}">${opts(b)}</select></span>${mod ? `<small>modifiée · proposé : ${esc(cfBranch(BRX.data.proposees[c.id]).nom)}</small>` : ""}</label>`; }).join("")}</div></div>`).join("")}</div></div>`;
}
VIEWS.branches = viewBranches;
ADMIN_SEG.brxF = (v) => { BRX.filtre = v; };
document.addEventListener("change", (e) => {
  const one = e.target.closest?.("[data-brx]"); if (one) return brxSet([one.dataset.brx], one.value);
  const all = e.target.closest?.("[data-brxall]"); if (all && all.value) return brxSet(ALL_CARDS.filter((c) => c.who === all.dataset.brxall).map((c) => c.id), all.value === "__prop" ? null : all.value);
});
