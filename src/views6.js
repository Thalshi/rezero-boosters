// ===== Re Zéro : Confrontation (2 à 7 joueurs) =====
// Le serveur et son moteur décident de tout ; la page affiche la vue filtrée (viewFor) et propose les actions légales.
ROUTES.push("confront");
const CF = { cat: null, list: null, table: null, gid: null, timer: null, busy: false, sel: null, defausse: [], garder: [], contrib: {} };
const cfName = (id) => (id === ME ? "Toi" : CF.table?.noms?.[id]?.name || "Joueur");
const ROLE_LABEL = { gardien: "Gardien", sentinelle: "Sentinelle", briseur: "Briseur", errant: "Errant" };
const PHASE_LABEL = { lobby: "Salon", contributions: "Chacun choisit ses cartes", choix: "Choix des personnages", partie: "Partie en cours", fin: "Partie terminée" };
async function cfCat() { if (!CF.cat) try { CF.cat = await srv("confront/catalogue"); } catch (e) { CF.cat = { branches: {}, branchIds: [], cartes: {}, signes: [] }; } }
async function cfLoadList() { if (CF.listLoading) return; CF.listLoading = true; await cfCat(); try { CF.list = await srv("confront/list"); } catch (e) { CF.list = { error: e.message }; } CF.listLoading = false; if (view === "confront" && (!param || CF.table?.vue?.phase === "contributions")) draw(); }
async function cfLoadTable(gid) {
  clearTimeout(CF.timer);
  await cfCat();
  try { const t = await srv("confront/state", { gid }); if (JSON.stringify(t) !== JSON.stringify(CF.table)) { CF.table = t; if (view === "confront" && param === gid && !document.activeElement?.closest?.(".cf-keep")) draw(); } }
  catch (e) { CF.table = { error: e.message }; if (view === "confront") draw(); return; }
  if (view === "confront" && param === gid) CF.timer = setTimeout(() => cfLoadTable(gid), document.hidden ? 8000 : CF.table?.vue?.phase === "fin" ? 15000 : 1800);
}
async function cfAct(action) {
  if (CF.busy) return; CF.busy = true;
  try { CF.table = await srv("confront/act", { gid: CF.gid, action }); CF.sel = null; CF.defausse = []; CF.garder = []; }
  catch (e) { toast(e.message); }
  CF.busy = false; draw();
}
const cfCardDef = (c) => CF.cat?.cartes?.[c?.def] || { nom: c?.def || "?", kanji: "?" };
const cfSigne = (id) => CF.cat?.signes?.find((x) => x.id === id) || { kanji: "", nom: id };
const cfAction = (c, extra = "") => { if (!c) return ""; const d = cfCardDef(c), sg = cfSigne(c.signe); return `<span class="cfa ${extra}" title="${esc(d.texte || "")}"><b>${CF_ICON[c.def] || ico(CF_FAMILY_ICON[d.cat] || "logo")}</b><span>${esc(d.nom)}</span><small>${ico(c.signe)}${c.rang}</small></span>`; };

// ===== Illustrations du QG (src/illus.js) : déclarées une fois en CSS, utilisées par classe =====
(() => {
  const css = [
    ...Object.entries(typeof ILLUS_CARTE === "object" ? ILLUS_CARTE : {}).map(([k, u]) => `.cfart-${k}{background-image:url(${u})}`),
    ...Object.entries(typeof ILLUS_BRANCHE === "object" ? ILLUS_BRANCHE : {}).map(([k, u]) => `.cfemb-${k}{background-image:url(${u})}`),
    ...Object.entries(typeof ILLUS_SKIN === "object" ? ILLUS_SKIN : {}).map(([k, u]) => `.sk-${k} .skx{background:radial-gradient(60% 55% at 50% 58%,#fff 44%,rgba(255,255,255,0) 78%),url(${u}) center/cover}`),
    // fond de table de Confrontation, assombri pour garder les places lisibles
    ...(typeof ILLUS_DECOR === "object" && ILLUS_DECOR.table ? [`.cf-board{background:linear-gradient(#0b0a12b8,#0b0a12e0),url(${ILLUS_DECOR.table}) center/cover;padding:14px;border-radius:16px;box-shadow:inset 0 0 0 1px #ffffff14}`] : []),
  ].join("\n");
  const st = document.createElement("style"); st.id = "illus-css"; st.textContent = css; document.head.appendChild(st);
})();
const cfEmb = (b, cls = "") => (typeof ILLUS_BRANCHE === "object" && ILLUS_BRANCHE[b] ? `<i class="cf-emb cfemb-${b} ${cls}" aria-hidden="true"></i>` : ico("logo"));
// ===== Visuels des cartes d'action (cadres façon Legends of Runeterra, icônes originales) =====
// famille → couleur et libellé ; chaque carte a une icône, une règle courte et son signe de présage dans le coin
const CF_FAM = {
  attaque: ["#ff4d2e", "Attaque"], esquive: ["#4d9bff", "Réaction"], soin: ["#3fbf7f", "Soin"], vol: ["#b072ff", "Vol"], defausse: ["#8a8590", "Défausse"],
  pioche: ["#4dd6ff", "Pioche"], duel: ["#ff9b3d", "Duel"], zone: ["#ff2f6d", "Zone"], arme: ["#f5c518", "Arme"], defense: ["#5ac8fa", "Défense"], visee: ["#f5c518", "Visée"], differe: ["#c06bff", "Effet différé"],
};
const CF_SHORT = {
  frappe: "1 dégât à un joueur à portée", parade: "Annule une attaque contre toi", riposte: "Annule l'attaque et renvoie-la", elixir: "+1 PV, ou te sauve à 0 PV",
  festin: "+1 PV pour tout le monde", lien: "Donne 1 de tes PV à un blessé", larcin: "Vole une carte à distance 1", dissipation: "Défausse une carte d'un joueur",
  inspiration: "Pioche 2 cartes", revelation: "Pioche 3 cartes", etal: "Chacun prend une carte retournée", defi: "Duel de Frappes : le perdant prend 1 dégât",
  pluie: "1 dégât à tous les autres", onde: "Tous défaussent une Frappe ou prennent 1 dégât", lames: "Portée 1 · Frappes illimitées", lance: "Portée 2", baton: "Portée 3",
  arc: "Portée 4", canon: "Portée 5", voile: "Peut esquiver les attaques (Eau)", cape: "On te voit 1 plus loin", oeil: "Tu vois 1 plus près", kanji: "Bloque les prochains dégâts",
  sceau: "Bloque le tour d'un joueur", orbe: "Bombe qui passe de main en main",
};
const I = (d) => `<svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const CF_ICON = {
  frappe: I('<path d="M10 38 34 14"/><path d="M30 10l8 8"/><path d="M14 30l4 4"/><path d="M8 40l4-4"/><path d="M34 14l4-4"/>'),
  parade: I('<path d="M24 6 38 11v11c0 9-6 16-14 20C16 38 10 31 10 22V11z"/><path d="M18 24l5 5 8-10"/>'),
  riposte: I('<path d="M24 6 38 11v11c0 9-6 16-14 20C16 38 10 31 10 22V11z"/><path d="M30 19H19l4-4"/><path d="M19 19l4 4"/>'),
  elixir: I('<path d="M19 6h10"/><path d="M21 6v10l-8 14a6 6 0 0 0 5 9h12a6 6 0 0 0 5-9l-8-14V6"/><path d="M16 28h16"/><path d="M24 31v6M21 34h6"/>'),
  festin: I('<path d="M8 26h32"/><path d="M10 26a14 10 0 0 1 28 0"/><path d="M24 12v4"/><path d="M12 34h24"/><path d="M16 40h16"/>'),
  lien: I('<path d="M17 21a6 6 0 0 1 0-8l3-3a6 6 0 0 1 8 8l-2 2"/><path d="M31 27a6 6 0 0 1 0 8l-3 3a6 6 0 0 1-8-8l2-2"/><path d="M20 28l8-8"/>'),
  larcin: I('<path d="M14 26V14a3 3 0 0 1 6 0v8"/><path d="M20 20v-6a3 3 0 0 1 6 0v8"/><path d="M26 20v-3a3 3 0 0 1 6 0v11a12 12 0 0 1-12 12h-2a10 10 0 0 1-8-4l-5-7a3 3 0 0 1 5-3l4 4"/>'),
  dissipation: I('<path d="M14 14l20 20M34 14 14 34"/><circle cx="24" cy="24" r="16"/>'),
  inspiration: I('<path d="M24 6a12 12 0 0 1 7 22v4H17v-4A12 12 0 0 1 24 6z"/><path d="M18 38h12M20 42h8"/>'),
  revelation: I('<path d="M4 24s7-12 20-12 20 12 20 12-7 12-20 12S4 24 4 24z"/><circle cx="24" cy="24" r="6"/>'),
  etal: I('<path d="M8 18h32l-3-8H11z"/><path d="M10 18v20h28V18"/><path d="M20 38V28h8v10"/>'),
  defi: I('<path d="M8 8l18 18M8 14V8h6"/><path d="M40 8 22 26M40 14V8h-6"/><path d="M14 32l-6 6M34 32l6 6"/><path d="M17 29l2 2M31 29l-2 2"/>'),
  pluie: I('<path d="M12 10l4 4-4 4-4-4z"/><path d="M30 6l4 4-4 4-4-4z"/><path d="M20 24l4 4-4 4-4-4z"/><path d="M36 26l4 4-4 4-4-4z"/><path d="M12 36l4 4-4 4-4-4z"/>'),
  onde: I('<circle cx="24" cy="24" r="4"/><path d="M14 14a14 14 0 0 0 0 20M34 14a14 14 0 0 1 0 20"/><path d="M8 8a22 22 0 0 0 0 32M40 8a22 22 0 0 1 0 32"/>'),
  lames: I('<path d="M8 40 30 18M30 18l6-10 4 4-10 6"/><path d="M40 40 18 18M18 18 12 8l-4 4 10 6"/>'),
  lance: I('<path d="M8 40 36 12"/><path d="M36 12l6-6-2 10-10 2z"/><path d="M12 32l4 4"/>'),
  baton: I('<path d="M14 42 32 16"/><circle cx="35" cy="11" r="6"/><path d="M35 3v2M43 11h-2M35 19v-2"/>'),
  arc: I('<path d="M14 6a26 26 0 0 1 0 36"/><path d="M14 6v36"/><path d="M14 24h26M34 18l6 6-6 6"/>'),
  canon: I('<path d="M6 22h22l6-6h8v12h-8l-6-6"/><path d="M12 22v10h6l2-10"/><circle cx="40" cy="22" r="2"/>'),
  voile: I('<path d="M6 18c6-4 10 4 16 0s10 4 16 0"/><path d="M6 26c6-4 10 4 16 0s10 4 16 0"/><path d="M6 34c6-4 10 4 16 0s10 4 16 0"/>'),
  cape: I('<path d="M18 8h12l2 4c6 6 8 20 8 28H8c0-8 2-22 8-28z"/><path d="M24 14v26"/>'),
  oeil: I('<circle cx="24" cy="24" r="16"/><circle cx="24" cy="24" r="8"/><circle cx="24" cy="24" r="1"/><path d="M24 4v6M24 38v6M4 24h6M38 24h6"/>'),
  kanji: I('<rect x="10" y="8" width="28" height="32" rx="3"/><path d="M17 17h14M24 13v22M17 27h14M19 35l-3 3M29 35l3 3"/>'),
  sceau: I('<rect x="8" y="20" width="32" height="20" rx="3"/><path d="M15 20v-6a9 9 0 0 1 18 0v6"/><path d="M24 28v5"/>'),
  orbe: I('<circle cx="22" cy="28" r="13"/><path d="M30 18l5-5"/><path d="M35 7v3M38 10h3M33 5l1 2"/>'),
};
const cfFam = (d) => CF_FAM[d.type === "reaction" ? "esquive" : d.cat] || ["#8a8590", ""];
// grande carte (main, choix) : bandeau de famille, icône, nom, règle courte, signe du présage
function cfFace(c, extra = "") {
  if (!c) return "";
  const d = cfCardDef(c), [col, fam] = cfFam(d), sg = cfSigne(c.signe);
  const when = d.type === "reaction" ? "Hors de ton tour" : d.type === "equipement" ? "Équipement" : d.type === "differe" ? "Effet plus tard" : "À ton tour";
  return `<span class="cff ${extra}" style="--fc:${col}" title="${esc(d.texte || "")}">
    <span class="cff-band">${fam}<i>${ico(c.signe)}<b>${c.rang}</b></i></span>
    ${typeof ILLUS_CARTE === "object" && ILLUS_CARTE[c.def] ? `<span class="cff-art pic cfart-${c.def}"></span>` : `<span class="cff-art">${CF_ICON[c.def] || ico(CF_FAMILY_ICON[d.cat] || "logo")}</span>`}
    <span class="cff-name">${esc(d.nom)}</span><span class="cff-rule">${esc(CF_SHORT[c.def] || d.texte || "")}</span><span class="cff-when">${when}</span></span>`;
}
// petite pastille (équipement posé, défausse, journal)
const cfChip = (c) => { if (!c) return ""; const d = cfCardDef(c), [col] = cfFam(d); return `<span class="cfc" style="--fc:${col}" title="${esc(d.nom)} : ${esc(CF_SHORT[c.def] || d.texte || "")}">${CF_ICON[c.def] || ico(CF_FAMILY_ICON[d.cat] || "logo")}<span>${esc(d.nom)}</span></span>`; };
const cfBranch = (b) => CF.cat?.branches?.[b] || { nom: b, kanji: "?" };

// cartes de la table : choisies par l'hôte, visibles avant de rejoindre
const CF_MODES = [["deck", "Chacun son deck", "Tu joues un perso parmi tes propres cartes."], ["partage", "Cartes partagées", "Les cartes de tous vont au pot : tu peux tirer celles des autres (elles restent à leur propriétaire)."]];
// partager un salon : la feuille de partage du téléphone, sinon le lien copié ; et le chat du QG en un toucher
async function cfShare(gid, nom) {
  const url = `${location.origin}/#/confront/${gid}`, text = `Viens jouer à Confrontation : ${nom || "ma table"} (code ${gid})`;
  $("overlay").innerHTML = `<div class="sheet cf-share" role="dialog" aria-label="Partager le salon" style="max-width:420px"><h2>Partager le salon</h2>
    <p class="note">Code <b class="mono">${gid}</b></p><input type="text" readonly value="${esc(url)}" class="gal-note" onclick="this.select()">
    <div class="row"><button class="btn gold" type="button" data-cfsh="chat">Envoyer dans le chat du QG</button><button class="btn" type="button" data-cfsh="copy">Copier le lien</button>${navigator.share ? `<button class="btn" type="button" data-cfsh="os">Autre appli…</button>` : ""}</div>
    <button class="btn sm" type="button" data-act="close">Fermer</button></div>`;
  $("overlay").hidden = false; CF.share = { url, text };
}
async function cfShareDo(k) {
  const { url, text } = CF.share || {}; if (!url) return;
  try {
    if (k === "chat") { await srv("chat/send", { text: `${text} ${url}` }); toast("Envoyé dans le chat du QG."); }
    if (k === "copy") { await navigator.clipboard.writeText(url); toast("Lien copié."); }
    if (k === "os") await navigator.share({ title: "Confrontation", text, url });
    $("overlay").hidden = true;
  } catch (err) { if (err?.name !== "AbortError") toast(err.message || "Partage impossible."); }
}

function viewConfront() {
  if (!SRV) return `<div class="wrap page">${head("Confrontation", "Re Zéro : Confrontation")}${empty("Les parties se jouent sur le site du QG, avec ton compte Discord.")}</div>`;
  if (!featureOn(CONFIG, "confrontation") && !IS_ADMIN) return closedHTML("Re Zéro : Confrontation");
  if (param === "regles") return viewRegles();
  if (param) { if (CF.gid !== param) { CF.gid = param; CF.table = null; CF.contrib = {}; } if (!CF.table) cfLoadTable(param); return cfTableHTML(); }
  CF.gid = null; clearTimeout(CF.timer);
  if (!CF.list) cfLoadList();
  const L = CF.list, row = (g, btn) => `<div class="cf-row"><b>${esc(g.nom)}</b><span class="note">${PHASE_LABEL[g.phase]} · ${g.joueurs} joueur${g.joueurs > 1 ? "s" : ""} · ${g.partage ? "cartes partagées" : "chacun son deck"} · code <span class="mono">${g.gid}</span></span><button class="btn sm" type="button" data-nav="confront" data-p="${g.gid}">${btn}</button></div>`;
  return `<div class="wrap page">${head("Confrontation", "Re Zéro : Confrontation", "De 2 à 7 joueurs. Chacun apporte une carte par branche (des cartes de prêt complètent), on mélange, chacun choisit un perso parmi deux. Tes cartes restent à toi : rien ne change de propriétaire.")}
    <div class="cf-howto"><div><b>Nouveau sur Confrontation ?</b><span>Rôles secrets, personnages, distance, cartes : tout est dans le livret illustré.</span></div><button class="btn gold" type="button" data-nav="confront" data-p="regles">Comment jouer</button></div>
    ${L?.verrou ? `<p class="note">Tu as des cartes engagées dans la partie <span class="mono">${L.verrou.gid}</span> : elles ne peuvent pas être vendues ni échangées tant qu'elle n'est pas finie.</p>` : ""}
    <section class="sec"><h2>Créer une table</h2><div class="lab-form cf-keep"><label>Nom <input type="text" id="cfNom" maxlength="40" placeholder="Table de ${esc(ACCT?.name || "moi")}"></label><label class="zopt-line"><input type="checkbox" id="cfPub" checked> Publique (visible de tous)</label>
      <p class="note">Les cartes de la table (chacun son deck ou cartes partagées) se choisissent dans le salon.</p>
      <button class="btn gold" type="button" data-act="cf-create">Créer</button></div>
      <div class="lab-form cf-keep"><label>Rejoindre avec un code <input type="text" id="cfCode" maxlength="4" placeholder="ABCD" style="text-transform:uppercase;width:120px"></label><button class="btn" type="button" data-act="cf-code">Ouvrir</button></div></section>
    ${!L ? `<p class="note">Chargement…</p>` : L.error ? `<p class="note">${esc(L.error)}</p>` : `
    ${L.defis?.length ? `<section class="sec cf-defis"><h2>Défis reçus</h2>${L.defis.map((g) => `<div class="cf-row"><b>${esc(g.nom)}</b><span class="note">Duel · chacun son deck</span><div class="row"><button class="btn sm gold" type="button" data-cfaccept="${g.gid}">Accepter</button><button class="btn sm" type="button" data-cfrefuse="${g.gid}">Refuser</button></div></div>`).join("")}</section>` : ""}
    ${L.miennes.length ? `<section class="sec"><h2>Mes parties</h2>${L.miennes.map((g) => row(g, "Reprendre")).join("")}</section>` : ""}
    <section class="sec"><h2>Salons ouverts</h2>${L.salons.length ? L.salons.map((g) => row(g, "Voir")).join("") : `<p class="note">Aucun salon public pour l'instant. Crée le tien !</p>`}</section>
    ${L.enCours.length ? `<section class="sec"><h2>À regarder</h2>${L.enCours.map((g) => row(g, "Regarder")).join("")}</section>` : ""}`}
    <section class="sec"><h2>Les rôles</h2><p class="note">À partir de 4 joueurs : deux camps, Gardien et Sentinelles contre Briseurs. Seul le Gardien est connu de tous. Chaque table est réglée pour que chaque camp ait une chance sur deux.</p><div class="rl-grid">${ROLE_ORDER.map((r) => roleCard(r, { short: true })).join("")}</div></section>
    <section class="sec"><h2>Les 8 branches</h2><div class="cf-branches">${(CF.cat?.branchIds || []).map((b) => `<div class="cf-br">${cfEmb(b)}<div><h3>${esc(cfBranch(b).nom)}</h3><p class="note">${esc(cfBranch(b).pouvoir)}</p></div></div>`).join("")}</div>
      <p class="note">Chaque carte a sa branche : les cartes Épique et plus d'un perso en ont souvent une autre. La rareté ne donne aucune puissance : une Commune et une Mythique de la même branche ont le même pouvoir. <a href="#/confront/regles">Lire le livret complet</a>.</p></section></div>`;
}

function cfTableHTML() {
  const T = CF.table;
  if (!T) return `<div class="wrap page"><p class="note">Chargement de la table…</p></div>`;
  if (T.ferme && T.vue?.phase === "lobby") return `<div class="wrap page">${empty("Ce salon a été fermé par l'hôte.")}<div class="row" style="justify-content:center"><button class="btn" type="button" data-nav="confront">Retour aux salons</button></div></div>`;
  if (T.error) return `<div class="wrap page">${empty(esc(T.error))}<div class="row" style="justify-content:center"><button class="btn" type="button" data-nav="confront">Retour aux salons</button></div></div>`;
  const v = T.vue;
  // la table se joue dans l'arène 3D, du salon jusqu'à la fin (la page classique reste en secours sans WebGL)
  if (Arena.wants(T)) { setTimeout(() => Arena.sync(CF.table), 0); return `<div class="wrap page cf-page"><p class="note">La table est dans l'arène.</p></div>`; }
  if (Arena.loading()) return `<div class="wrap page cf-page"><p class="note">Entrée dans l'arène…</p></div>`;
  const { top, body: pre } = cfParts(T);
  let body = pre;
  if (!body) body = cfBoard(v);
  Arena.hide();
  return `<div class="wrap page cf-page">${top}${body}${v.journal?.length ? `<section class="sec"><h2>Journal</h2><ol class="cf-log">${v.journal.filter((e) => !["attente", "attente_annulee", "phase"].includes(e.type) && !(e.type === "pioche_publique" && e.pid === v.moi)).slice(-14).reverse().map((e) => `<li>${cfEvent(e)}</li>`).join("")}</ol></section>` : ""}</div>`;
}
// en-tête (boutons de la table) et contenu des étapes d'avant-partie : salon, choix des cartes, choix du perso ;
// partagés par la page classique et l'arène 3D (mêmes boutons, mêmes règles)
function cfParts(T) {
  const v = T.vue, acts = v.actions || [], has1 = (t) => acts.find((a) => a.type === t);
  const top = `<div class="cf-top"><div><p class="eyebrow">Confrontation · ${esc(PHASE_LABEL[v.phase])}${v.mode ? ` · ${{ duel: "Duel", trio: "Trio", classique: "Classique" }[v.mode]}` : ""}</p><h1 class="cf-h">${esc(T.nom)}</h1>
    <p class="note">Code <b class="mono">${T.gid}</b>${T.spectateur ? " · tu regardes en spectateur" : ""}</p></div>
    <div class="row"><button class="btn sm" type="button" data-nav="confront">Salons</button>${v.phase !== "fin" ? `<button class="btn sm" type="button" data-act="cf-share">Partager le salon</button>` : ""}
      ${v.phase === "lobby" && !T.spectateur && (v.hote === ME || T.createur === ME) && !T.ferme ? `<button class="btn sm" type="button" data-act="cf-close">Fermer le salon</button>` : ""}
      ${has1("quitter") ? `<button class="btn sm acc" type="button" data-cfa='{"type":"quitter"}'>Quitter le salon</button>` : has1("abandon") && (v.phase === "contributions" || v.phase === "choix") ? `<button class="btn sm acc" type="button" data-act="cf-leave">Quitter la table</button>` : v.phase === "partie" && v.joueurs.find((j) => j.id === v.moi)?.vivant ? `<button class="btn sm acc" type="button" data-act="cf-abandon">Quitter la partie</button>` : v.phase !== "lobby" ? `<button class="btn sm" type="button" data-nav="confront">Quitter</button>` : ""}</div></div>`;
  let body = "";
  if (v.phase === "lobby") {
    const attente = v.joueurs.filter((p) => p.id !== v.hote && !/^bot:/.test(p.id) && !T.prets?.[p.id]).length;
    const host = v.hote === ME, M = CF_MODES.find((m) => m[0] === (T.partage ? "partage" : "deck"));
    const modeBox = `<section class="sec cf-modebox"><h2>Cartes de la table</h2>${T.duel ? `<p class="note"><b>Duel</b> : chacun joue son deck.${T.refuse ? " <b>Ton défi a été refusé.</b>" : v.joueurs.length < 2 ? " En attente de la réponse…" : ""}</p>`
      : host ? `<div class="cf-modes">${CF_MODES.map(([k, l, d]) => `<button type="button" class="cf-mode ${k === M[0] ? "on" : ""}" data-cfmode="${k}" aria-pressed="${k === M[0]}"><b>${l}</b><small>${d}</small></button>`).join("")}</div><p class="note">Tout le monde voit ce choix : rejoindre la table, c'est l'accepter.</p>`
      : `<div class="cf-modes"><div class="cf-mode on"><b>${M[1]}</b><small>${M[2]}</small></div></div><p class="note">Choisi par l'hôte. Rejoindre la table, c'est l'accepter.</p>`}</section>`;
    body = `${modeBox}<section class="sec"><h2>Joueurs (${v.joueurs.length}/7)</h2><div class="cf-lobby">${v.joueurs.map((p) => `<span class="pill ${p.id === v.hote || /^bot:/.test(p.id) || T.prets?.[p.id] ? "cf-ready" : ""}">${esc(cfName(p.id))}${p.id === v.hote ? " · hôte" : /^bot:/.test(p.id) || T.prets?.[p.id] ? " · prêt" : " · pas prêt"}</span>`).join("")}</div>
      <p class="note">${v.joueurs.length < 2 ? "Il faut au moins 2 joueurs. Partage le code de la table." : v.joueurs.length === 2 ? "Mode Duel." : v.joueurs.length === 3 ? "Mode Trio, sans rôles." : `Mode Classique, avec des rôles secrets : ${ROLE_SPLIT[v.joueurs.length].map((x, i) => x ? `${x} ${ROLES[ROLE_ORDER[i]].nom}${x > 1 ? "s" : ""}` : "").filter(Boolean).join(", ")} (${ROLE_BONUS[v.joueurs.length]}).`} <a href="#/confront/regles">Comment jouer</a></p>
      <div class="row">${has1("rejoindre") ? `<button class="btn gold" type="button" data-cfa='{"type":"rejoindre"}'>Rejoindre</button>` : ""}${has1("lancer") ? (attente ? `<button class="btn gold" type="button" disabled>En attente : ${attente} pas prêt${attente > 1 ? "s" : ""}</button>` : `<button class="btn gold" type="button" data-cfa='{"type":"lancer"}'>Lancer la partie</button>`) : ""}
      ${!T.spectateur && v.hote !== ME ? `<button class="btn ${T.prets?.[ME] ? "" : "gold"}" type="button" data-cfready="${T.prets?.[ME] ? "0" : "1"}">${T.prets?.[ME] ? "Pas prêt finalement" : "Je suis prêt"}</button>` : ""}
      ${!T.spectateur && (T.createur === ME || IS_ADMIN) && v.joueurs.length < 7 ? `<button class="btn" type="button" data-act="cf-bot">Ajouter un bot (test)</button>` : ""}</div></section>`;
  } else if (v.phase === "contributions") {
    const me = v.joueurs.find((p) => p.id === v.moi);
    if (!CF.list) cfLoadList();
    body = `<section class="sec cf-draft"><div class="cf-draft-h"><div><h2>Choisis tes cartes</h2><p class="note">Une carte par style au plus. À l'étape suivante, <b>tu joues l'une d'elles</b>. Sans carte, on te prête 2 persos. Tes cartes restent à toi ; pendant la partie, elles ne se vendent ni ne s'échangent.</p></div></div>
      ${!me || me.soumis ? `<p class="note">Cartes enregistrées. En attente des autres…</p>` : !CF.list ? `<p class="note">Chargement de tes cartes…</p>` : CF.list.error ? `<p class="note">${esc(CF.list.error)} <button class="btn sm" type="button" data-act="cf-reload">Réessayer</button></p>` : cfDraft()}
      <div class="cf-lobby">${v.joueurs.map((p) => `<span class="pill ${p.soumis ? "ok" : ""}">${esc(cfName(p.id))} ${p.soumis ? "✓" : "…"}</span>`).join("")}</div></section>`;
  } else if (v.phase === "choix") {
    body = `<section class="sec"><h2>Choisis ton personnage</h2><p class="note">${(v.propositions || []).some((c) => c?.pret) ? "Tu n'as pas pris de carte : voici 2 persos prêtés." : "Ce sont tes cartes : choisis celle que tu joues."} Ton choix reste secret jusqu'au début.</p>
      ${v.monChoix ? `<p class="note">Choix enregistré. En attente des autres…</p>` : `<div class="cf-props">${(v.propositions || []).map((c) => c && `<div class="cf-prop">${cfPerso(c, true)}<button class="btn gold" type="button" data-cfa='${JSON.stringify({ type: "choisir", instanceId: c.instanceId })}'>Choisir</button></div>`).join("")}</div>`}
      <div class="cf-lobby">${v.joueurs.map((p) => `<span class="pill ${p.aChoisi ? "ok" : ""}">${esc(cfName(p.id))} ${p.aChoisi ? "✓" : "…"}</span>`).join("")}</div></section>`;
  }
  return { top, body };
}
// ===== Choix des cartes façon draft : le deck (une carte par style) en haut, ta collection en vraies cartes =====
function cfDraft() {
  const mine = CF.list.cartes || [], ids = CF.cat?.branchIds || [], tab = CF.draftTab || "tous";
  const picked = ids.filter((b) => CF.contrib[b]), deck = (CF.list.deck || []).filter((id) => mine.some((c) => c.cardId === id));
  const pool = mine.filter((c) => tab === "tous" || c.branch === tab).sort((a, b) => RAR[byId[b.cardId].rar].rank - RAR[byId[a.cardId].rar].rank || nameOf(byId[a.cardId]).localeCompare(nameOf(byId[b.cardId])));
  const slot = (b) => { const id = CF.contrib[b], c = id && byId[id]; return `<button type="button" class="cf-slot ${c ? "on" : ""} ${tab === b ? "cur" : ""}" data-cftab="${b}" title="${esc(cfBranch(b).nom)}">${c ? `<span class="cf-slot-art">${thumb(c, "cf-th")}</span>` : cfEmb(b, "big")}<b>${esc(cfBranch(b).nom)}</b><small>${c ? esc(nameOf(c)) : "vide"}</small>${c ? `<i data-cfdrop="${b}" aria-label="Retirer">✕</i>` : ""}</button>`; };
  return `<div class="cf-deckbar" aria-label="Ton deck">${ids.map(slot).join("")}</div>
    <div class="row cf-deck-tools">${deck.length ? `<button class="btn sm gold" type="button" data-act="cf-deck-use">Prendre mon deck (${deck.length})</button>` : ""}<button class="btn sm" type="button" data-act="cf-deck-save" ${picked.length ? "" : "disabled"}>Enregistrer comme deck</button>${picked.length ? `<button class="btn sm" type="button" data-act="cf-deck-clear">Tout retirer</button>` : ""}</div>
    <div class="chips cf-tabs"><button class="chip" type="button" data-cftab="tous" aria-pressed="${tab === "tous"}">Toutes · ${mine.length}</button>${ids.map((b) => { const n = mine.filter((c) => c.branch === b).length; return `<button class="chip" type="button" data-cftab="${b}" aria-pressed="${tab === b}" ${n ? "" : "disabled"}>${cfEmb(b, "sm")} ${esc(cfBranch(b).nom)} · ${n}</button>`; }).join("")}</div>
    ${tab !== "tous" ? `<p class="note cf-tab-pow">${cfEmb(tab, "sm")} <b>${esc(cfBranch(tab).nom)}</b> : ${esc(cfBranch(tab).pouvoir)}</p>` : ""}
    ${pool.length ? `<div class="cf-pool">${pool.map((x) => { const c = byId[x.cardId], on = CF.contrib[x.branch] === x.cardId; return `<button type="button" class="cf-pick ${on ? "on" : ""}" data-cfpick="${x.cardId}" data-b="${x.branch}" aria-pressed="${on}">${cardHTML(c, { design: myDesign(c.id) })}<span class="cf-pick-b">${cfEmb(x.branch, "sm")} ${esc(cfBranch(x.branch).nom)}</span>${on ? `<span class="cf-pick-ok">Dans ton deck</span>` : ""}</button>`; }).join("")}</div>` : `<p class="note">Aucune carte de ce style dans ta collection.</p>`}
    <div class="cf-draft-go">${!picked.length && !CF.table?.partage && mine.length ? `<button class="btn gold big" type="button" disabled>Choisis au moins une de tes cartes</button>` : `<button class="btn gold big" type="button" data-act="cf-contrib">${picked.length ? `Valider mes cartes (${picked.length}/${ids.length})` : "Jouer avec 2 persos prêtés"}</button>`}</div>`;
}
function cfPerso(c, big) {
  if (!c) return "";
  const card = byId[c.cardId], b = cfBranch(c.branch);
  const art = c.pret || !card ? `<div class="cf-loan">${cfEmb(c.branch, "big")}<span>Carte de prêt</span></div>` : cardHTML(card, { design: c.cosmetique || null });
  return `<div class="cf-perso ${big ? "big" : ""}">${art}<p class="cf-pb"><b>${cfEmb(c.branch, "sm")} ${esc(b.nom)}</b>${big ? `<small>${esc(b.pouvoir)}</small>` : ""}</p></div>`;
}
const ROLE_TXT = { gardien: "Gardien : survis, les Sentinelles t'aident.", sentinelle: "Sentinelle : protège le Gardien.", briseur: "Briseur : élimine le Gardien.", errant: "Errant : sois le dernier en vie." };
function cfBoard(v) {
  const me = v.joueurs.find((p) => p.id === v.moi), pr = v.attente, acts = v.actions || [], mineTurn = pr && me && pr.pid === me.id;
  const seat = (p) => {
    const tg = CF.sel && CF.targets?.filter((a) => a.cible === p.id) || [];
    const pct = p.pvMax ? Math.max(0, p.pv) / p.pvMax * 100 : 0, low = p.pv <= 1;
    return `<div class="cf-seat ${v.tour?.pid === p.id ? "turn" : ""} ${pr?.pid === p.id ? "wait" : ""} ${p.vivant ? "" : "dead"} ${p.id === v.moi ? "me" : ""} ${tg.length ? "target" : ""}" data-cft="${p.id}">
      ${v.tour?.pid === p.id ? `<span class="cf-ribbon">${p.id === v.moi ? "Ton tour" : "Son tour"}</span>` : ""}
      <div class="cf-seat-top">${cfPerso(p.perso)}<div class="cf-seat-id"><b>${esc(cfName(p.id))}</b>${ttag(p.id, "sm")}
        ${p.role ? `<span class="cf-role r-${p.role}">${ROLE_LABEL[p.role]}</span>` : ""}${p.perso ? `<small class="cf-brl">${cfEmb(p.perso.branch, "sm")} ${esc(cfBranch(p.perso.branch).nom)}</small>` : ""}
        ${p.vivant ? "" : `<small class="cf-ko">Éliminé</small>`}${p.enLigne ? "" : `<small>Hors ligne</small>`}</div></div>
      <div class="cf-hp ${low ? "low" : ""}" role="img" aria-label="${p.pv} PV sur ${p.pvMax}"><span style="width:${pct}%"></span>${Array.from({ length: p.pvMax }, () => "<i></i>").join("")}<b>${p.pv}/${p.pvMax} PV</b></div>
      <div class="cf-stats"><span title="Cartes en main">🂠 ${p.nbMain}</span>${p.distancePercue != null ? `<span title="Distance depuis toi">↔ ${p.distancePercue}</span>` : ""}</div>
      <div class="cf-eq">${p.arme ? cfChip(p.arme) : `<span class="cfc base">${CF_ICON.frappe}<span>Dague · portée 1</span></span>`}${p.equip.map(cfChip).join("")}</div>
      ${tg.length ? `<div class="cf-tgt">${tg.map((a) => `<button class="btn gold" type="button" data-cfa='${JSON.stringify(a)}'>${a.choix ? (a.choix === "main" ? "Une carte de sa main" : esc(cfCardDef({ def: v.joueurs.flatMap((q) => [q.arme, ...q.equip]).find((x) => x?.uid === a.choix)?.def }).nom || "Carte posée")) : "Cibler"}</button>`).join("")}</div>` : ""}
    </div>`;
  };
  const res = v.resultat;
  const fin = v.phase === "fin" && res ? `<section class="sec cf-fin"><h2>${res.gagnants?.includes(v.moi) ? "Victoire !" : res.gagnants?.length ? `Victoire de ${res.gagnants.map(cfName).map(esc).join(", ")}` : "Partie terminée sans vainqueur"}</h2><p class="note">${res.camp ? `Camp gagnant : ${esc(res.camp)} · ` : ""}${res.tours} tours.${res.raison === "annulee" ? " Partie annulée." : ""}</p></section>` : "";
  const roleBox = v.monRole ? roleCard(v.monRole, { mine: true, short: true }) : me && v.mode !== "classique" ? `<p class="note">${v.mode === "duel" ? "Duel" : "Trio"} : pas de rôle, chacun pour soi.</p>` : "";
  const help = `<details class="cf-help"${CF.helpOpen === false ? "" : " open"}><summary>Ton rôle et comment jouer</summary>${roleBox}<ol>
    ${v.monRole ? "" : `<li><b>But</b> : ${v.mode === "duel" ? "fais tomber l'autre joueur à 0 PV." : "sois le dernier en vie."}</li>`}
    <li><b>À ton tour</b> : tu pioches 2 cartes, tu joues celles que tu veux (une seule Frappe par tour), puis <b>Finis ton tour</b>.</li>
    <li><b>Attaquer</b> : la Frappe touche un joueur à portée de ton arme (↔ distance ≤ portée). Les armes augmentent la portée.</li>
    <li><b>Quand on t'attaque</b> : joue une Parade pour annuler, ou encaisse (−1 PV).</li>
    <li><b>Fin du tour</b> : tu gardes au plus autant de cartes que tes PV.</li>
    ${me?.perso ? `<li><b>Ton pouvoir (${esc(cfBranch(me.perso.branch).nom)})</b> : ${esc(cfBranch(me.perso.branch).pouvoir)}</li>` : ""}</ol>
    <p class="note"><a href="#/confront/regles">Livret complet : rôles, distance, toutes les cartes</a></p></details>`;
  return `${fin}${me && v.phase === "partie" ? cfBanner(v, me, pr) : ""}<div class="cf-board">${v.joueurs.map(seat).join("")}</div>
    <div class="cf-mid"><span class="cf-pile">Pioche <b>${v.pioche}</b></span><span class="cf-pile">Défausse <b>${v.nbDefausse}</b></span>${v.defausse?.length ? `<span>Dernière jouée ${cfChip(v.defausse.at(-1))}</span>` : ""}${v.etal?.length ? `<span>Étal ${v.etal.map(cfChip).join("")}</span>` : ""}</div>
    ${me ? cfHand(v, me, pr, acts) : ""}${me ? help : ""}`;
}
// bandeau « que dois-je faire ? »
function cfBanner(v, me, pr) {
  const mine = pr && pr.pid === me.id;
  if (!me.vivant) return `<div class="cf-banner off">Tu es éliminé. Tu peux regarder la fin de la partie.</div>`;
  if (!pr) return "";
  if (!mine) return `<div class="cf-banner off">${esc(cfName(pr.pid))} joue…${pr.deadline ? ` <span data-cfdl="${pr.deadline}"></span>` : ""}</div>`;
  const steps = pr.kind === "tour" ? (CF.sel ? (CF.targets?.length ? "Touche le bouton « Cibler » sur un joueur." : "Clique sur « Jouer cette carte ».") : "1. Choisis une carte en surbrillance · 2. Choisis sa cible · 3. Finis ton tour") : "";
  return `<div class="cf-banner"><b>${PROMPT_TXT[pr.kind] || "À toi."}</b>${steps ? `<span>${steps}</span>` : ""}${pr.deadline ? ` <span class="cf-dl" data-cfdl="${pr.deadline}"></span>` : ""}</div>`;
}
const PROMPT_TXT = { tour: "C'est ton tour !", reaction: "On t'attaque ! Pare, riposte ou encaisse.", onde: "Onde de choc : défausse une Frappe ou perds 1 PV.", defi: "Défi : défausse une Frappe ou perds 1 PV.", sauvetage: "Tu tombes à 0 PV : sauve-toi si tu peux !", stratege: "Stratège : choisis les cartes à garder.", voleur: "Voleur : pioche normalement ou vole une carte au hasard.", etal: "Étal : prends une carte." };
function cfHand(v, me, pr, acts) {
  const plays = acts.filter((a) => a.type === "jouer"), fin = acts.find((a) => a.type === "finir");
  const btn = (a, label, cls = "") => `<button class="btn ${cls}" type="button" data-cfa='${JSON.stringify(a)}'>${label}</button>`;
  const other = acts.filter((a) => ["parer", "riposter", "encaisser", "defausser", "elixir", "survie", "piocher", "prendre"].includes(a.type));
  const LBL = { parer: "🛡 Parer", riposter: "↩ Riposter", encaisser: "Encaisser (−1 PV)", defausser: "Défausser une Frappe", elixir: "Boire un Élixir (+1 PV)", survie: "Ténacité : défausser 2 cartes (+1 PV)", prendre: "Prendre" };
  const garder = acts.find((a) => a.type === "garder");
  const playableDefs = new Set(plays.map((a) => (v.main.find((m) => m.uid === a.carte) || {}).def));
  return `<section class="sec cf-me"><div class="cf-me-h"><h2>Ta main</h2>${v.monRole ? `<span class="cf-role r-${v.monRole}" title="${esc(ROLE_TXT[v.monRole])}">Rôle : ${ROLE_LABEL[v.monRole]}</span>` : ""}${v.limiteMain != null ? `<span class="note">Garde au plus ${v.limiteMain} cartes · ta portée : ${v.porteeArme}</span>` : ""}</div>
    ${other.length ? `<div class="cf-react">${other.map((a) => btn(a, a.type === "piocher" ? (a.cible ? `Voler une carte à ${esc(cfName(a.cible))}` : "Piocher normalement") : a.type === "prendre" ? `Prendre ${cfCardDef(v.etal.find((c) => c.uid === a.carte) || {}).nom}` : LBL[a.type], a.type === "encaisser" ? "acc" : "gold")).join("")}</div>` : ""}
    <div class="cf-hand">${(v.main || []).map((c) => {
      const playable = playableDefs.has(c.def), discard = fin && fin.aDefausser > 0, picked = CF.defausse.includes(c.uid);
      return `<button type="button" class="cf-card ${playable ? "ok" : ""} ${CF.sel === c.uid ? "sel" : ""} ${picked ? "picked" : ""}" data-cfc="${c.uid}" ${playable || discard ? "" : "disabled"} aria-label="${esc(cfCardDef(c).nom)}${playable ? ", jouable" : ""}">${cfFace(c)}</button>`; }).join("") || `<p class="note">Aucune carte en main.</p>`}</div>
    ${garder ? `<p class="note">Garde ${garder.nombre} carte(s) :</p><div class="cf-hand">${(pr.cartes || v.attente?.cartes || []).map((c) => `<button type="button" class="cf-card ok ${CF.garder.includes(c.uid) ? "picked" : ""}" data-cfg="${c.uid}">${cfFace(c)}</button>`).join("")}</div>${btn({ type: "garder", cartes: CF.garder, promptId: garder.promptId }, `Garder (${CF.garder.length}/${garder.nombre})`, "gold")}` : ""}
    <div class="row cf-actions">${CF.sel && CF.noTarget ? btn(CF.noTarget, "Jouer cette carte", "gold big") : ""}
      ${fin ? btn({ type: "finir", defausse: CF.defausse, promptId: fin.promptId }, fin.aDefausser ? `Finir le tour (choisis ${fin.aDefausser - CF.defausse.length} carte${fin.aDefausser - CF.defausse.length > 1 ? "s" : ""} à défausser)` : "Finir mon tour", "acc big") : ""}</div>
    ${fin?.aDefausser ? `<p class="note">Tu as trop de cartes : touche ${fin.aDefausser} carte${fin.aDefausser > 1 ? "s" : ""} à défausser, puis « Finir le tour ».</p>` : ""}</section>`;
}
const EVT = {
  debut: () => "La partie commence.", tour: (e) => `Tour de ${cfName(e.pid)}.`, joue: (e) => `${cfName(e.pid)} joue ${cfCardDef(e.carte || { def: e.def }).nom}${e.cible ? ` sur ${cfName(e.cible)}` : ""}${e.prise ? ` et prend ${cfCardDef(e.prise).nom}` : ""}${e.defaussee ? ` : ${cfCardDef(e.defaussee).nom} est détruite` : ""}${e.remplace ? ` (${cfCardDef(e.remplace).nom} défaussé : ${CF.cat?.regles?.equipMax || 2} équipements au plus)` : ""}.`,
  degats: (e) => `${cfName(e.pid)} perd ${e.n || 1} PV.`, pare: (e) => `${cfName(e.pid)} pare.`, riposte: (e) => `${cfName(e.pid)} riposte.`,
  elimination: (e) => `${cfName(e.pid)} est éliminé${e.role ? ` (${ROLE_LABEL[e.role]})` : ""}.`, fin: () => "Fin de la partie.", abandon: (e) => `${cfName(e.pid)} abandonne.`,
  presage: (e) => `Présage de ${cfName(e.pid)}${PRESAGE_POUR[e.quoi] ? ` (${PRESAGE_POUR[e.quoi]})` : ""} : ${(e.cartes || []).map((c) => `${cfSigne(c.signe).nom} ${c.rang}`).join(", ") || "?"}, ${e.favorable ? "réussi" : "raté"}.`, vol: (e) => `${cfName(e.pid)} vole une carte${e.cible ? ` à ${cfName(e.cible)}` : ""}.`, vol_public: (e) => `${cfName(e.pid)} prend une carte à ${cfName(e.cible)}.`,
  pioche: (e) => `Tu pioches ${e.n || e.cartes?.length || ""} carte(s).`, pioche_publique: (e) => `${cfName(e.pid)} pioche ${e.n || ""} carte(s).`, delai_expire: (e) => `${cfName(e.pid)} n'a pas répondu à temps.`,
  rejoint: (e) => `${cfName(e.pid)} rejoint la table.`, quitte: (e) => `${cfName(e.pid)} quitte la table.`, contribution: (e) => `${cfName(e.pid)} a apporté ses cartes.`, choix: (e) => `${cfName(e.pid)} a choisi son perso.`,
  sauvetage: (e) => `${cfName(e.pid)} se sauve de justesse.`,
  entrave: (e) => `${cfName(e.pid)} reste entravé et passe son tour.`, entrave_brisee: (e) => `${cfName(e.pid)} brise le Sceau d'entrave.`,
  reconnexion: (e) => `${cfName(e.pid)} est de retour.`, deconnexion: (e) => `${cfName(e.pid)} s'est déconnecté.`,
  defi_relance: (e) => `${cfName(e.pid)} relance le défi.`, defi_perdu: (e) => `${cfName(e.pid)} perd le défi.`, onde_evitee: (e) => `${cfName(e.pid)} évite l'onde de choc.`,
  reprise: (e) => `${cfName(e.pid)} reprend sa Frappe.`, remelange: () => "La défausse est remélangée dans la pioche.", effondrement: (e) => `Effondrement : ${cfName(e.pid)} perd 1 PV.`,
  orbe_explose: (e) => `L'Orbe instable explose sur ${cfName(e.pid)} !`, orbe_passe: (e) => `L'Orbe instable passe à ${cfName(e.cible || e.pid)}.`, kanji_absorbe: (e) => `${cfName(e.pid)} absorbe les dégâts (Kanji de garde).`,
  penalite_gardien: (e) => `${cfName(e.pid)} a éliminé une Sentinelle : il perd sa main et son équipement.`, propositions: () => "Les personnages sont proposés.", reserve: () => "La réserve commune est mélangée.",
  etal: (e) => `${cfName(e.pid)} ouvre l'Étal du marché.`, etal_pris: (e) => `${cfName(e.pid)} prend une carte de l'Étal.`, etal_fin: () => "L'Étal est vidé.", arme_remplacee: (e) => `${cfName(e.pid)} change d'arme.`,
  choix_prive: () => "Ton personnage est choisi.", defausse_fin: (e) => `${cfName(e.pid)} défausse en fin de tour.`, esquive: (e) => `${cfName(e.pid)} esquive${e.par === "voile" ? " (Voile de brume)" : e.par === "defense" ? " (Garde)" : ""}.`, survie: (e) => `${cfName(e.pid)} tient bon (Ténacité).`, fin_tour: (e) => `${cfName(e.pid)} finit son tour.`, role: (e) => `Rôle révélé : ${cfName(e.pid)} est ${ROLE_LABEL[e.role] || e.role}.`,
};
const PRESAGE_POUR = { voile: "Voile de brume", defense: "Garde", entrave: "Sceau d'entrave", orbe: "Orbe instable", precision: "Œil sûr", reprise: "Œil sûr" };
const cfEvent = (e) => esc((EVT[e.type] || (() => `${e.type.replace(/_/g, " ")}${e.pid ? ` · ${cfName(e.pid)}` : ""}`))(e));
function cfSelect(uid) {
  const v = CF.table?.vue; if (!v) return;
  const fin = v.actions.find((a) => a.type === "finir");
  const playable = v.actions.filter((a) => a.type === "jouer" && a.carte === uid);
  if (!playable.length && fin?.aDefausser) { CF.defausse = CF.defausse.includes(uid) ? CF.defausse.filter((x) => x !== uid) : [...CF.defausse, uid].slice(0, fin.aDefausser); return draw(); }
  // les actions sont listées pour une carte de chaque sorte : on les reprend pour cette carte-ci
  const def = v.main.find((c) => c.uid === uid)?.def;
  const same = v.actions.filter((a) => a.type === "jouer" && v.main.find((c) => c.uid === a.carte)?.def === def).map((a) => ({ ...a, carte: uid }));
  if (!same.length) return;
  if (CF.sel === uid) { CF.sel = null; return draw(); }
  CF.sel = uid; CF.targets = same.filter((a) => a.cible); CF.noTarget = same.find((a) => !a.cible) || null;
  draw();
}
VIEWS.confront = viewConfront;
document.addEventListener("toggle", (e) => { if (e.target.classList?.contains("cf-help")) CF.helpOpen = e.target.open; }, true);
// la liste des salons change sans cesse : rechargée à chaque arrivée sur la page des salons
addEventListener("hashchange", () => { if (location.hash === "#/confront") { CF.list = null; cfLoadList(); } });
document.addEventListener("click", (e) => {
  const t = e.target;
  const a = t.closest("[data-cfa]"); if (a) return cfAct(JSON.parse(a.dataset.cfa));
  const c = t.closest("[data-cfc]"); if (c) return cfSelect(c.dataset.cfc);
  const dr = t.closest("[data-cfdrop]"); if (dr) { delete CF.contrib[dr.dataset.cfdrop]; return draw(); }
  const rd = t.closest("[data-cfready]"); if (rd) return srv("confront/pret", { gid: CF.gid, pret: rd.dataset.cfready === "1" }).then((r) => { CF.table = r; draw(); }).catch((err) => toast(err.message));
  const sh = t.closest("[data-cfsh]"); if (sh) return cfShareDo(sh.dataset.cfsh);
  const md = t.closest("[data-cfmode]"); if (md) return srv("confront/reglage", { gid: CF.gid, partage: md.dataset.cfmode === "partage" }).then((r) => { CF.table = r; draw(); }).catch((err) => toast(err.message));
  const ac = t.closest("[data-cfaccept]"); if (ac) return srv("confront/act", { gid: ac.dataset.cfaccept, action: { type: "rejoindre" } }).then(() => { CF.list = null; nav("confront", ac.dataset.cfaccept); }).catch((err) => toast(err.message));
  const rf = t.closest("[data-cfrefuse]"); if (rf) return srv("confront/refuser", { gid: rf.dataset.cfrefuse }).then(() => { CF.list = null; toast("Défi refusé."); cfLoadList(); draw(); }).catch((err) => toast(err.message));
  const df = t.closest("[data-cfdefi]"); if (df) return srv("confront/create", { invite: df.dataset.cfdefi }).then((r) => { CF.table = r; CF.gid = r.gid; CF.list = null; toast("Défi envoyé : la table t'attend."); nav("confront", r.gid); }).catch((err) => toast(err.message));
  const pk = t.closest("[data-cfpick]"); if (pk) { const b = pk.dataset.b; CF.contrib[b] = CF.contrib[b] === pk.dataset.cfpick ? null : pk.dataset.cfpick; return draw(); }
  const tb = t.closest("[data-cftab]"); if (tb) { CF.draftTab = CF.draftTab === tb.dataset.cftab && tb.dataset.cftab !== "tous" ? "tous" : tb.dataset.cftab; return draw(); }
  const g = t.closest("[data-cfg]"); if (g) { const n = CF.table.vue.actions.find((x) => x.type === "garder")?.nombre || 0; CF.garder = CF.garder.includes(g.dataset.cfg) ? CF.garder.filter((x) => x !== g.dataset.cfg) : [...CF.garder, g.dataset.cfg].slice(-n); return draw(); }
  const act = t.closest("[data-act]")?.dataset.act; if (!act || !act.startsWith("cf-")) return;
  if (act === "cf-create") return srv("confront/create", { nom: $("cfNom")?.value || "", public: $("cfPub")?.checked }).then((r) => { CF.table = r; CF.gid = r.gid; CF.list = null; nav("confront", r.gid); }).catch((err) => toast(err.message));
  if (act === "cf-code") { const code = ($("cfCode")?.value || "").trim().toUpperCase(); if (code.length === 4) nav("confront", code); return; }
  if (act === "cf-bot") return srv("confront/bot", { gid: CF.gid }).then((r) => { CF.table = r; draw(); }).catch((err) => toast(err.message));
  if (act === "cf-contrib") return cfAct({ type: "contribuer", cartes: Object.values(CF.contrib).filter(Boolean) });
  if (act === "cf-deck-use") { CF.contrib = {}; for (const id of CF.list?.deck || []) { const c = (CF.list.cartes || []).find((x) => x.cardId === id); if (c) CF.contrib[c.branch] = id; } return draw(); }
  if (act === "cf-deck-clear") { CF.contrib = {}; return draw(); }
  if (act === "cf-deck-save") return srv("confront/deck", { cartes: Object.values(CF.contrib).filter(Boolean) }).then((r) => { if (CF.list) CF.list.deck = r.deck; toast("Deck enregistré : tu pourras le reprendre en un toucher."); draw(); }).catch((err) => toast(err.message));
  if (act === "cf-reload") { CF.list = null; cfLoadList(); return draw(); }
  if (act === "cf-share") return cfShare(CF.gid, CF.table?.nom);
  if (act === "cf-close" && sure(t.closest("[data-act]"), "Fermer pour tout le monde")) return srv("confront/fermer", { gid: CF.gid }).then(() => { CF.list = null; toast("Salon fermé."); nav("confront"); }).catch((err) => toast(err.message));
  if (act === "cf-leave" && sure(t.closest("[data-act]"), "Quitter : la partie est annulée")) return cfAct({ type: "abandon" }).then(() => nav("confront"));
  if (act === "cf-abandon" && sure(t.closest("[data-act]"), "Confirmer l'abandon")) return cfAct({ type: "abandon" });
});
document.addEventListener("change", (e) => { const b = e.target.dataset?.cfb; if (b) CF.contrib[b] = e.target.value || null; });
// compte à rebours du délai de réponse
setInterval(() => { document.querySelectorAll("[data-cfdl]").forEach((el) => { const s = Math.max(0, Math.round((+el.dataset.cfdl - Date.now()) / 1000)); el.textContent = `· ${s} s`; }); }, 1000);
