// ===== Cosmétiques : Boutique Arcanique, Sanctuaire des Invocations, Atelier Arcanique =====
// Le serveur décide de tout (achat, tirage, design) ; le navigateur ne fait qu'afficher et animer le résultat.
ROUTES.push("boutique", "sanctuaire", "atelier");
const COS_SLOT_LABEL = Object.fromEntries(COS_SLOTS.map((s) => [s.id, s.label]));
let zShopSlot = "cadre", zAtelierTab = "design", zDraft = null, zDraftCard = null, zInvSlot = "";

// carte d'exemple pour prévisualiser un cosmétique : la carte vedette, sinon la plus rare possédée, sinon Nestor
function zSample() {
  if (save.featured && has(save.featured)) return byId[save.featured];
  const mine = CARDS.filter((c) => has(c.id)).sort((a, b) => RAR[b.rar].rank - RAR[a.rar].rank);
  return mine[0] || byId.nestor || CARDS[0];
}
const zTile = (c, action = "", extra = "") => `<div class="zt r-${c.rar}">
    <div class="zt-prev">${cardHTML(zSample(), { design: { [c.slot]: c.id }, present: true })}</div>
    <div class="zt-t"><b>${esc(c.name)}</b><span style="color:${RAR[c.rar].color}">${RAR[c.rar].label}</span><small>${COS_SLOT_LABEL[c.slot]}${extra}</small></div>${action}</div>`;

// --- actions (serveur, ou sauvegarde locale en mode invité) ---
async function zCall(action, body, local) {
  if (SRV) return srv(action, body);
  const r = local(); if (r.error) throw new Error(r.error); announceTitles(r.titles); persist(); return r;
}
async function zBuy(id) {
  try { await zCall("shop/buy", { id }, () => buyCosmeticS(save, id)); toast(`${COS_BY_ID[id].name} ajouté à ton inventaire.`); draw(); if (zItem === id && !$("overlay").hidden) zOpenItem(id); }
  catch (e) { toast(e.message); draw(); }
}
async function zSaveDesign() {
  try { await zCall("design", { card: zDraftCard, design: zDraft }, () => saveDesignS(save, zDraftCard, zDraft)); toast("Design enregistré."); zDraft = null; draw(); }
  catch (e) { toast(e.message); }
}
async function zFeature(id) {
  try { await zCall("featured", { card: id }, () => { save.featured = id; return {}; }); toast(id ? "Carte vedette mise à jour." : "Carte vedette retirée."); draw(); }
  catch (e) { toast(e.message); }
}

// confirmation dans la page (le lecteur de claude.ai bloque confirm et prompt) : 1er clic arme le bouton, 2e clic agit
function sure(btn, label) {
  if (btn.dataset.sure) return true;
  btn.dataset.sure = "1"; btn.dataset.label = btn.textContent; btn.textContent = label; btn.classList.add("sure");
  setTimeout(() => { if (btn.isConnected) { delete btn.dataset.sure; btn.textContent = btn.dataset.label; btn.classList.remove("sure"); } }, 4000);
  return false;
}
const closedHTML = (name) => `<div class="wrap page">${head("Bientôt", name)}${empty("Cette partie du jeu n'est pas encore ouverte. Billy l'annoncera au QG.")}</div>`;
// ===== Boutique Arcanique (organisée comme la Boutique Discord : collections, tuiles, aperçu sur ton profil) =====
// Les collections ne sont qu'une présentation : prix et règles restent ceux du serveur (COS_PRICE, buyCosmeticS).
const Z_COLLECTIONS = [
  { id: "lumiere", name: "Lumière céleste", kanji: "光", tag: "Auréoles, ailes et or pur pour les cartes qui brillent.", c1: "#f5c518", c2: "#7a4dff", items: ["orn-aureole", "orn-ailes-lumiere", "aura-solaire", "cadre-or", "orn-couronne", "fond-aurore", "orn-etoile"] },
  { id: "braise", name: "Feu et sang", kanji: "火", tag: "Braises, cuivre et cornes d'ombre : la collection des cartes qui frappent.", c1: "#ff4d2e", c2: "#3a0d14", items: ["cadre-sang", "cadre-cuivre", "aura-braise", "part-braises", "fond-forge", "orn-cornes", "cadre-obsidienne"] },
  { id: "givre", name: "Givre et nuit", kanji: "夜", tag: "Le calme d'une nuit à Shinjuku, du givre jusqu'au néant.", c1: "#4dd6ff", c2: "#101a3a", items: ["aura-givre", "part-flocons", "fond-nuit", "fond-abysse", "aura-neant", "cadre-argent"] },
  { id: "jardin", name: "Jardin du QG", kanji: "花", tag: "Pétales, lucioles et papier washi.", c1: "#3fbf7f", c2: "#2a1a3a", items: ["aura-sylve", "part-petales", "part-lucioles", "cadre-emeraude", "fond-washi", "fond-crepuscule"] },
  { id: "neon", name: "Néon du QG", kanji: "電", tag: "Holographies, néons et mises en scène pour les cartes de vitrine.", c1: "#b072ff", c2: "#0e2a4a", items: [] },
];
// un objet créé depuis l'app rejoint la collection choisie (champ « coll ») ; tout objet de boutique
// qui n'est dans aucune collection rejoint « Néon du QG ». Recalculé après chaque mise à jour des créations.
const Z_COLL_BASE = Object.fromEntries(Z_COLLECTIONS.map((c) => [c.id, c.items.slice()]));
function zCollRefill() {
  for (const c of Z_COLLECTIONS) c.items = [...Z_COLL_BASE[c.id], ...COSMETICS.filter((x) => x.coll === c.id && !Z_COLL_BASE[c.id].includes(x.id)).map((x) => x.id)].filter((id) => COS_BY_ID[id] && !COS_BY_ID[id].only);
  const used = new Set(Z_COLLECTIONS.flatMap((c) => c.items));
  Z_COLLECTIONS.at(-1).items.push(...COSMETICS.filter((c) => !c.only && !used.has(c.id)).map((c) => c.id));
}
zCollRefill();
const zCollOf = (id) => Z_COLLECTIONS.find((c) => c.items.includes(id));
const zFeatured = () => Z_COLLECTIONS[Math.floor(Date.now() / 86400e3) % Z_COLLECTIONS.length]; // la vedette change chaque jour
let zShopFilter = "", zItem = null;
// une tuile : l'objet porté par ta carte, son nom, sa collection, son prix
function zShopTile(c) {
  const owned = !!cosOf(save).own[c.id], price = COS_PRICE[c.rar];
  const tagTxt = c.only ? "Sanctuaire" : owned ? "Possédé" : `${fmtN(price)} ◆`;
  return `<button type="button" class="zs-tile r-${c.rar} ${owned ? "own" : ""}" data-zitem="${c.id}" style="--rc:${RAR[c.rar].color}" aria-label="${esc(c.name)}, ${RAR[c.rar].label}, ${tagTxt}">
    <span class="zs-art">${cardHTML(zSample(), { design: { [c.slot]: c.id }, present: false })}</span>
    <span class="zs-meta"><b>${esc(c.name)}</b><small>${COS_SLOT_LABEL[c.slot]} · <i style="color:${RAR[c.rar].color}">${RAR[c.rar].label}</i></small>
      <span class="zs-price ${owned ? "own" : ""} ${c.only ? "only" : ""}">${owned ? "✓ " : ""}${tagTxt}</span></span></button>`;
}
// ===== Boutique : décorations d'avatar (onglet par défaut) et objets pour les cartes =====
let zBoutTab = "deco", zDecoItem = null;
const zbTabs = () => utabs("zBout", [["deco", "Décorations d'avatar"], ["cartes", "Pour tes cartes"]], zBoutTab);
const zDecoColl = () => DECO_COLLS[Math.floor(Date.now() / 86400e3) % DECO_COLLS.length];
// ton avatar (photo Discord, sinon ton initiale) entouré d'une décoration
function zMeAv(d, size = 84) {
  const name = ACCT?.name || "Toi", img = ACCT?.avatar ? `<img src="${esc(ACCT.avatar)}" alt="">` : `<span class="zd-ini">${esc(name[0].toUpperCase())}</span>`;
  return `<span class="avd zd-av" style="--s:${size}px">${img}${d ? decoSVG(d) : ""}</span>`;
}
function zDecoTile(d) {
  const own = !!decosOf(save)[d.id], on = save.cos?.deco === d.id, C = DECO_COLLS.find((c) => c.id === d.coll) || {};
  return `<button type="button" class="zd-tile r-${d.rar} ${on ? "on" : ""}" data-zdeco="${d.id}" style="--h1:${C.c1};--h2:${C.c2};--rc:${RAR[d.rar].color}" aria-label="${esc(d.name)}, ${RAR[d.rar].label}">
    <span class="zd-stage">${zMeAv(d, 74)}</span>
    <span class="zd-meta"><b>${esc(d.name)}</b><small style="color:${RAR[d.rar].color}">${RAR[d.rar].label}</small>
      <span class="zs-price ${own ? "own" : ""}">${on ? "✓ Portée" : own ? "Possédée" : `${fmtN(COS_PRICE[d.rar])} ◆`}</span></span></button>`;
}
function viewDecos() {
  const F = zDecoColl(), fd = DECOS.filter((d) => d.coll === F.id), cur = save.cos?.deco ? DECO_BY_ID[save.cos.deco] : null, n = Object.keys(decosOf(save)).length;
  const hero = `<section class="zd-hero" style="--h1:${F.c1};--h2:${F.c2}">
      <div class="zd-hero-t"><p class="eyebrow">Collection à la une</p><h2>${esc(F.name)}</h2><p>${esc(F.tag)}</p>
        <button class="btn gold" type="button" data-zdcoll="${F.id}">Voir la collection</button></div>
      <div class="zd-hero-avs">${fd.slice(0, 3).map((d, i) => `<span class="zd-hero-av h${i}">${zMeAv(d, i === 1 ? 120 : 88)}</span>`).join("")}</div>
      <span class="zd-hero-k" aria-hidden="true">${F.kanji}</span></section>`;
  const mine = `<div class="zd-mine">${zMeAv(cur, 56)}<div><b>${cur ? esc(cur.name) : "Aucune décoration"}</b><small>${cur ? "Ta décoration actuelle, visible au comptoir, au classement et sur ton profil." : "Choisis-en une : elle s'affiche partout autour de ton avatar."} ${n ? `· ${n} possédée${n > 1 ? "s" : ""}` : ""}</small></div>${cur ? `<button class="btn sm" type="button" data-zdequip="">Retirer</button>` : ""}</div>`;
  const rows = DECO_COLLS.map((C) => `<section class="sec zs-row" id="zdcoll-${C.id}"><div class="zs-row-h" style="--h1:${C.c1}"><span class="zs-k zd-k">${C.kanji}</span><div><h2>${esc(C.name)}</h2><p class="note">${esc(C.tag)}</p></div></div>
      <div class="zd-grid">${DECOS.filter((d) => d.coll === C.id).sort((a, b) => RAR[a.rar].rank - RAR[b.rar].rank).map(zDecoTile).join("")}</div></section>`).join("");
  return `<div class="wrap page">${head("Boutique Arcanique", "Boutique Arcanique", "Des décorations animées autour de ton avatar, et des objets pour tes cartes. Aucun bonus de jeu : juste du style.")}
    ${zbTabs()}<div class="z-bar"><span>Essence : <b>${fmtN(save.chakra)} ◆</b></span><span class="note">Prix provisoires, en attente de validation.</span></div>
    ${mine}${hero}${rows}</div>`;
}
// fiche d'une décoration : grand aperçu, ton profil et un message au comptoir avec elle
function zOpenDeco(id) {
  const d = DECO_BY_ID[id]; if (!d) return; zDecoItem = id;
  const own = !!decosOf(save)[id], on = save.cos?.deco === id, price = COS_PRICE[d.rar], C = DECO_COLLS.find((c) => c.id === d.coll) || {}, name = ACCT?.name || "Toi";
  const act = on ? `<button class="btn big block" type="button" data-zdequip="">Retirer cette décoration</button>`
    : own ? `<button class="btn gold big block" type="button" data-zdequip="${id}">Porter cette décoration</button>`
    : `<button class="btn gold big block" type="button" data-zdbuy="${id}" ${save.chakra < price ? "disabled" : ""}>Acheter et porter · ${fmtN(price)} ◆</button>
       <p class="note">${save.chakra < price ? `Il te manque ${fmtN(price - save.chakra)} ◆.` : `Il te restera ${fmtN(save.chakra - price)} ◆.`} Elle reste à toi pour toujours.</p>`;
  $("overlay").innerHTML = `<div class="sheet zs-sheet" role="dialog" aria-modal="true" aria-label="${esc(d.name)}"><div class="sheet-h"><h2>${esc(d.name)}</h2><button class="x" type="button" data-act="close" aria-label="Fermer">✕</button></div>
    <div class="sheet-b"><div class="zd-prev" style="--h1:${C.c1};--h2:${C.c2}">
        <div class="zd-prev-big">${zMeAv(d, 150)}</div>
        <div class="zd-prev-side"><div class="zd-prof">${zMeAv(d, 54)}<div><b>${esc(name)}</b><small>${TITLE_BY_ID[save.titleShown] ? esc(TITLE_BY_ID[save.titleShown].name) : "Membre du QG"}</small></div></div>
          <div class="zd-chat">${zMeAv(d, 34)}<div><b>${esc(name)}</b><p>Regardez ma nouvelle déco !</p></div></div></div></div>
      <div class="row" style="flex-wrap:wrap;gap:8px"><span class="pill out" style="border-color:${RAR[d.rar].color};color:${RAR[d.rar].color}">${RAR[d.rar].label}</span><span class="pill">${C.kanji} ${esc(C.name || "")}</span><span class="pill">Animée</span></div>
      ${act}</div></div>`;
  $("overlay").hidden = false;
}
async function zDecoDo(kind, id) {
  try {
    const r = await zCall("deco/" + kind, { id }, () => (kind === "buy" ? buyDecoS(save, id) : equipDecoS(save, id)));
    if (r?.state) Object.assign(save, r.state);
    toast(kind === "buy" ? `${DECO_BY_ID[id].name} : achetée et portée.` : id ? `${DECO_BY_ID[id].name} : portée.` : "Décoration retirée.");
    $("overlay").hidden = true; draw(); header();
  } catch (e) { toast(e.message); }
}
document.addEventListener("click", (e) => {
  const t = e.target;
  const a = t.closest("[data-zdeco]"); if (a) return zOpenDeco(a.dataset.zdeco);
  const b = t.closest("[data-zdbuy]"); if (b) { b.disabled = true; return zDecoDo("buy", b.dataset.zdbuy); }
  const q = t.closest("[data-zdequip]"); if (q) return zDecoDo("equip", q.dataset.zdequip || null);
  const c = t.closest("[data-zdcoll]"); if (c) document.getElementById("zdcoll-" + c.dataset.zdcoll)?.scrollIntoView({ behavior: "smooth", block: "start" });
});
function viewBoutique() {
  if (!featureOn(CONFIG, "boutique")) return closedHTML("Boutique Arcanique");
  if (param === "cartes" || param === "deco") { zBoutTab = param; param = null; }
  if (zBoutTab === "deco") return viewDecos();
  const F = zFeatured(), fItems = F.items.map((id) => COS_BY_ID[id]).filter(Boolean);
  const hero = `<section class="zs-hero" style="--h1:${F.c1};--h2:${F.c2}">
      <div class="zs-hero-t"><p class="eyebrow">Collection à la une</p><h2>${esc(F.name)}</h2><p>${esc(F.tag)}</p>
        <button class="btn gold" type="button" data-zcoll="${F.id}">Voir la collection</button></div>
      <div class="zs-hero-cards">${fItems.slice(0, 3).map((c) => `<div class="zs-hero-card">${cardHTML(zSample(), { design: { [c.slot]: c.id }, present: true })}</div>`).join("")}</div>
      <span class="zs-hero-k" aria-hidden="true">${ico(COLL_ICON[F.id] || "logo")}</span></section>`;
  const filters = seg("zShopF", [["", "Tout"], ...COS_SLOTS.map((sl) => [sl.id, sl.label])], zShopFilter);
  const rows = zShopFilter
    ? `<section class="sec"><h2>${COS_SLOT_LABEL[zShopFilter]}</h2><div class="zs-grid">${COSMETICS.filter((c) => c.slot === zShopFilter).map(zShopTile).join("")}</div></section>`
    : [...Z_COLLECTIONS.map((col) => `<section class="sec zs-row" id="zcoll-${col.id}"><div class="zs-row-h" style="--h1:${col.c1}"><span class="zs-k">${ico(COLL_ICON[col.id] || "logo")}</span><div><h2>${esc(col.name)}</h2><p class="note">${esc(col.tag)}</p></div></div>
        <div class="zs-grid">${col.items.map((id) => COS_BY_ID[id]).filter(Boolean).sort((a, b) => RAR[a.rar].rank - RAR[b.rar].rank).map(zShopTile).join("")}</div></section>`),
      `<section class="sec zs-row"><div class="zs-row-h" style="--h1:#ff4d2e"><span class="zs-k">${ico("sanctuaire")}</span><div><h2>Exclusifs du Sanctuaire</h2><p class="note">Ils ne s'achètent pas : on les obtient seulement en invoquant au Sanctuaire.</p></div></div>
        <div class="zs-grid">${COSMETICS.filter((c) => c.only).map(zShopTile).join("")}</div></section>`].join("");
  return `<div class="wrap page">${head("Boutique Arcanique", "Boutique Arcanique", "Des cosmétiques pour tes cartes, sans aucun bonus de jeu. Achetés ici, ils sont à toi pour toujours et s'utilisent sur toutes tes cartes depuis l'Atelier.")}
    ${zbTabs()}
    <div class="z-bar"><span>Essence : <b>${fmtN(save.chakra)} ◆</b></span><span class="note">Prix provisoires, en attente de validation.</span><button class="btn sm" type="button" data-nav="atelier">Ouvrir l'Atelier</button></div>
    ${hero}${filters}${rows}</div>`;
}
// fiche d'un objet : aperçu sur ton profil et sur ta carte vedette (avec son design actuel), puis achat
function zOpenItem(id) {
  const c = COS_BY_ID[id]; if (!c) return; zItem = id;
  if (!zPrevCard || !has(zPrevCard)) zPrevCard = zSample()?.id;
  const card = byId[zPrevCard] || zSample(), cur = has(card.id) ? designOfS(save, card.id) || {} : {}, design = { ...cur, [c.slot]: c.id };
  const mineC = [...CARDS, ...SKINS].filter((x) => has(x.id));
  const pick = mineC.length ? `<label class="zpick">Voir sur la carte <select class="in" id="zPrevCard">${mineC.map((x) => `<option value="${x.id}" ${x.id === card.id ? "selected" : ""}>${esc(nameOf(x))} · ${esc(x.title)}</option>`).join("")}</select></label>` : "";
  const owned = !!cosOf(save).own[c.id], price = COS_PRICE[c.rar], col = zCollOf(c.id), name = ACCT?.name || "Toi";
  const act = c.only ? `<button class="btn gold big block" type="button" data-nav="sanctuaire">Invoquer au Sanctuaire</button><p class="note">Objet exclusif : il ne s'achète pas, il s'obtient seulement par invocation.</p>`
    : owned ? `<button class="btn gold big block" type="button" data-nav="atelier" data-p="${card.id}">Équiper à l'Atelier</button><p class="note">Tu l'as déjà : il s'utilise sur autant de cartes que tu veux.</p>`
    : `<button class="btn gold big block" type="button" data-zbuy="${c.id}" ${save.chakra < price ? "disabled" : ""}>Acheter · ${fmtN(price)} ◆</button>
       <p class="note">${save.chakra < price ? `Il te manque ${fmtN(price - save.chakra)} ◆.` : `Il te restera ${fmtN(save.chakra - price)} ◆.`} Objet de compte : il reste à toi, ne se vend pas et s'utilise sur toutes tes cartes.</p>`;
  $("overlay").innerHTML = `<div class="sheet zs-sheet" role="dialog" aria-modal="true" aria-label="${esc(c.name)}"><div class="sheet-h"><h2>${esc(c.name)}</h2><button class="x" type="button" data-act="close" aria-label="Fermer">✕</button></div>
    <div class="sheet-b"><div class="zs-prev" style="--h1:${col?.c1 || RAR[c.rar].color};--h2:${col?.c2 || "#15141a"}">
        <div class="zs-prof"><span class="zs-av">${esc(name[0].toUpperCase())}</span><div><b>${esc(name)}</b><small>Aperçu sur ton profil</small></div></div>
        <div class="zs-prev-card">${cardHTML(card, { design, present: true, gold: has(card.id) && !own(card.id).n && own(card.id).gold > 0 })}</div></div>
      <div class="row" style="flex-wrap:wrap;gap:8px"><span class="pill out" style="border-color:${RAR[c.rar].color};color:${RAR[c.rar].color}">${RAR[c.rar].label}</span><span class="pill">${COS_SLOT_LABEL[c.slot]}</span>${col ? `<span class="pill">${ico(COLL_ICON[col.id] || "logo")} ${esc(col.name)}</span>` : ""}<span class="pill">Aucun bonus de jeu</span></div>
      ${pick}${act}</div></div>`;
  $("overlay").hidden = false; $("overlay").dataset.zdrop = ""; $("overlay").dataset.zitem = id;
}
const ZS_SEG = { zShopF: (v) => { zShopFilter = v; } };

// ===== Atelier Arcanique =====
function zOptions(slot) {
  const cos = cosOf(save), used = usedInstances(save), out = [];
  for (const c of COSMETICS) if (c.slot === slot && cos.own[c.id]) out.push({ ref: "a:" + c.id, c, note: "Compte" });
  for (const it of cos.inst) { const c = COS_BY_ID[it.c]; if (c && c.slot === slot) out.push({ ref: "i:" + it.i, c, note: used[it.i] && used[it.i] !== zDraftCard ? `Sur ${esc(nameOf(byId[used[it.i]]))}` : "Instance unique" }); }
  return out;
}
function viewAtelier() {
  const mine = [...CARDS, ...SKINS].filter((c) => has(c.id));
  if (param && has(param) && zDraftCard !== param) { zDraftCard = param; zDraft = null; }
  if (!zDraftCard || !has(zDraftCard)) { zDraftCard = (save.featured && has(save.featured) ? save.featured : mine[0]?.id) || null; zDraft = null; }
  const cos = cosOf(save);
  const tabs = utabs("zAt", [["design", "Personnaliser"], ["inv", "Inventaire", cos.inst.length + Object.keys(cos.own).length + Object.keys(decosOf(save)).length, true]], zAtelierTab);
  if (!zDraftCard) return `<div class="wrap page">${head("Atelier Arcanique", "Atelier Arcanique")}<p class="note">Ouvre d'abord un booster : il te faut une carte à personnaliser.</p></div>`;
  if (!zDraft) zDraft = { ...(cos.designs[zDraftCard] || {}) };
  const c = byId[zDraftCard], resolved = Object.fromEntries(Object.entries(zDraft).map(([k, r]) => [k, k === "deco" ? (DECO_BY_ID[r] ? r : null) : refCos(save, r)?.id]).filter(([, v]) => v));
  if (zAtelierTab === "inv") return `<div class="wrap page">${head("Atelier Arcanique", "Atelier Arcanique")}${tabs}${zInventory()}</div>`;
  const dirty = JSON.stringify(zDraft) !== JSON.stringify(cos.designs[zDraftCard] || {});
  return `<div class="wrap page">${head("Atelier Arcanique", "Atelier Arcanique", "Choisis une carte, essaie les cosmétiques de ton inventaire, puis enregistre son design. Il s'affiche partout : collection, profil, carte vedette.")}${tabs}
    <div class="zat">
      <div class="zat-prev"><div class="zat-card">${cardHTML(c, { design: resolved, present: true, gold: !own(c.id).n && own(c.id).gold > 0 })}</div>
        <div class="row" style="justify-content:center">
          <button class="btn gold" type="button" data-zsave ${dirty ? "" : "disabled"}>Enregistrer le design</button>
          <button class="btn" type="button" data-zclear ${Object.keys(zDraft).length ? "" : "disabled"}>Tout retirer</button>
          <button class="btn" type="button" data-zfeat="${save.featured === c.id ? "" : c.id}">${save.featured === c.id ? "★ Carte vedette" : "☆ Mettre en vedette"}</button>
        </div>
        <label class="zpick">Carte à personnaliser <select id="zCard">${mine.map((x) => `<option value="${x.id}" ${x.id === zDraftCard ? "selected" : ""}>${esc(nameOf(x))} · ${esc(x.title)} (${RAR[x.rar].label})</option>`).join("")}</select></label>
      </div>
      <div class="zat-slots">${(() => { const own = DECOS.filter((d) => decosOf(save)[d.id]); return `<div class="zslot"><p class="eyebrow mut">Décoration (celles de ton profil)</p>
        <div class="zopts"><button type="button" class="zopt ${zDraft.deco ? "" : "on"}" data-zset="deco" data-ref="">Aucune</button>
        ${own.map((d) => `<button type="button" class="zopt ${zDraft.deco === d.id ? "on" : ""}" data-zset="deco" data-ref="${d.id}" style="--c:${RAR[d.rar].color}"><i></i>${esc(d.name)}<small>Décoration</small></button>`).join("")}
        ${own.length ? "" : `<span class="note">Aucune pour l'instant : <a href="#/boutique">Boutique</a>, onglet Décorations d'avatar.</span>`}</div></div>`; })()}
      ${COS_SLOTS.map((sl) => { const opts = zOptions(sl.id); return `<div class="zslot"><p class="eyebrow mut">${sl.label}</p>
        <div class="zopts"><button type="button" class="zopt ${zDraft[sl.id] ? "" : "on"}" data-zset="${sl.id}" data-ref="">Aucun</button>
        ${opts.map((o) => `<button type="button" class="zopt ${zDraft[sl.id] === o.ref ? "on" : ""}" data-zset="${sl.id}" data-ref="${o.ref}" style="--c:${RAR[o.c.rar].color}"><i></i>${esc(o.c.name)}<small>${o.note}</small></button>`).join("")}
        ${opts.length ? "" : `<span class="note">Rien pour l'instant : <a href="#/boutique">Boutique</a> ou <a href="#/sanctuaire">Sanctuaire</a>.</span>`}</div></div>`; }).join("")}
        ${sl0Note()}</div>
    </div></div>`;
}
const sl0Note = () => `<p class="note">Une instance unique ne décore qu'une carte à la fois : la choisir ici la retire de l'autre carte. Les cosmétiques de compte s'utilisent sur autant de cartes que tu veux.</p>`;
// un objet seul, sur une carte vierge (silhouette) : on voit l'effet sans le confondre avec une de tes cartes
function zGhost(c, deco) {
  const dz = cosDeco(deco ? { deco: deco.id } : { [c.slot]: c.id }, true), x = deco || c;
  return `<div class="kcw ${dz.wrap}" style="--w:150px;${dz.za ? `--za:${dz.za};` : ""}">${dz.orn}${dz.deco}<div class="kc r-${x.rar} ${dz.kc} kc-ghost" style="${dz.style}">
    <div class="kc-h"><b>${esc(x.name)}</b><i>${LETTER[x.rar]}</i></div>
    <div class="kc-a"><svg class="kc-sil" viewBox="0 0 100 120" aria-hidden="true"><circle cx="50" cy="44" r="20"/><path d="M10 124C12 90 30 74 50 74S88 90 90 124Z"/></svg>${dz.holo}</div>${dz.part}
    <div class="kc-s">${deco ? "Décoration" : esc(COS_SLOT_LABEL[c.slot])}</div><div class="kc-p"><span>${RAR[x.rar].label}</span></div></div></div>`;
}
function zInventory() {
  const cos = cosOf(save), used = usedInstances(save), mine = [...CARDS, ...SKINS].filter((c) => has(c.id));
  const onCard = (ref, slot) => Object.entries(cos.designs).filter(([, d]) => d[slot] === ref).map(([cid]) => cid);
  const items = [...DECOS.filter((d) => decosOf(save)[d.id]).map((d) => ({ deco: d, slot: "deco", ref: d.id, kind: "Décoration · réutilisable" })),
    ...Object.keys(cos.own).filter((id) => COS_BY_ID[id]).map((id) => ({ c: COS_BY_ID[id], slot: COS_BY_ID[id].slot, ref: "a:" + id, kind: "Compte · réutilisable" })),
    ...cos.inst.filter((it) => COS_BY_ID[it.c]).map((it) => ({ c: COS_BY_ID[it.c], slot: COS_BY_ID[it.c].slot, ref: "i:" + it.i, kind: used[it.i] ? `Instance · sur ${esc(nameOf(byId[used[it.i]]))}` : "Instance unique · libre" }))]
    .filter((x) => !zInvSlot || x.slot === zInvSlot);
  const tile = (x) => { const on = onCard(x.ref, x.slot), it = x.deco || x.c;
    return `<div class="zt zt-inv r-${it.rar}"><div class="zt-prev" ${x.c ? `data-zdrop="${x.c.id}" role="button" tabindex="0" style="cursor:pointer"` : ""}>${zGhost(x.c, x.deco)}</div>
      <div class="zt-t"><b>${esc(it.name)}</b><span style="color:${RAR[it.rar].color}">${RAR[it.rar].label}</span><small>${x.kind}${on.length && !x.ref.startsWith("i:") ? ` · sur ${on.length} carte${on.length > 1 ? "s" : ""}` : ""}</small></div>
      ${mine.length ? `<div class="zt-as"><select class="in" aria-label="Carte à décorer" id="zas-${esc(x.ref)}">${mine.map((c) => `<option value="${c.id}" ${on.includes(c.id) ? "selected" : ""}>${esc(nameOf(c))} · ${esc(c.title)}${on.includes(c.id) ? " ✓" : ""}</option>`).join("")}</select>
        <button class="btn sm gold" type="button" data-zas="${esc(x.ref)}" data-slot="${x.slot}">Mettre sur cette carte</button></div>` : `<p class="note">Ouvre un booster pour avoir une carte à décorer.</p>`}</div>`; };
  return `${seg("zInv", [["", "Tout"], ["deco", "Décoration"], ...COS_SLOTS.map((s) => [s.id, s.label])], zInvSlot)}
    ${items.length ? `<div class="zgrid">${items.map(tile).join("")}</div>` : `<p class="note">Ton inventaire est vide. Achète des cosmétiques à la <a href="#/boutique">Boutique</a> ou invoque-en au <a href="#/sanctuaire">Sanctuaire</a>.</p>`}`;
}
// poser un objet de l'inventaire sur une carte : il rejoint son design (le reste du design ne bouge pas)
async function zAssign(ref, slot) {
  const card = document.getElementById("zas-" + ref)?.value; if (!card) return;
  const design = { ...(cosOf(save).designs[card] || {}), [slot]: ref };
  try { await zCall("design", { card, design }, () => saveDesignS(save, card, design)); toast(`Posé sur ${nameOf(byId[card])}.`); draw(); }
  catch (e) { toast(e.message); }
}
document.addEventListener("click", (e) => { const b = e.target.closest("[data-zas]"); if (b) zAssign(b.dataset.zas, b.dataset.slot); });

// ===== Sanctuaire des Invocations =====
// Le tirage est fait par le serveur AVANT l'animation ; l'ouverture ne fait que le révéler.
// ×1 : une carte qui se retourne seule ; ×5 : une pochette ; ×10 : le coffre (avec ses scénarios).
let zBusy = false;
const Z_OFFERS = [[1, "Une carte", "Se retourne toute seule", "carte"], [5, "Une pochette", "Au moins une Rare", "pochette"], [10, "Le coffre", "Au moins une Épique", "coffre"]];
function viewSanctuaire() {
  if (!featureOn(CONFIG, "sanctuaire")) return closedHTML("Sanctuaire des Invocations");
  const cos = cosOf(save);
  const rates = RANKS.map((r) => `<span><i style="background:${RAR[r].color}"></i>${RAR[r].label} ${String(SUMMON_RATES[r]).replace(".", ",")} %</span>`).join("");
  return `<div class="wrap page">${head("Sanctuaire des Invocations", "Sanctuaire des Invocations", "Invoque des cosmétiques uniques. Les invocations ne donnent jamais de personnages : ceux-là sortent des boosters.")}
    <div class="z-bar"><span>Essence : <b>${fmtN(save.chakra)} ◆</b></span><span>Légendaire garantie dans <b>${Math.max(0, SUMMON_PITY_L - cos.sinceL)}</b> invocations</span></div>
    <div class="zoffers">${Z_OFFERS.map(([n, t, sub, k]) => `<button class="zoffer n${n}" type="button" data-zsum="${n}" ${save.chakra < summonCost(n) || zBusy ? "disabled" : ""}>
      <span class="zo-art" aria-hidden="true">${n === 10 ? `<span class="zo-chest"><i></i><b>${ico(k)}</b></span>` : n === 5 ? `<span class="zo-pouch"><b>${ico(k)}</b></span>` : `<span class="zo-card"><b>${ico(k)}</b></span>`}</span>
      <span class="zo-n">×${n}</span><b class="zo-t">${t}</b><span class="zo-s">${sub}</span>
      <span class="zo-p">${fmtN(summonCost(n))} ◆${n > 1 ? ` <s>${fmtN(SUMMON_COST * n)}</s>` : ""}</span></button>`).join("")}</div>
    <div class="zs-side">
      <p class="note">Chaque objet invoqué est une instance unique, que tu peux équiper à l'Atelier ou vendre avec ta carte. ×5 et ×10 : 10 % moins cher.</p>
      <p class="eyebrow mut">Chances par objet (provisoires)</p><div class="zrates">${rates}</div>
      <label class="zopt-line"><input type="checkbox" id="zSkip" ${zSkipAnim ? "checked" : ""}> Passer l'animation</label>
    </div>${zDrops()}</div>`;
}
// aperçu d'un objet du Sanctuaire sur une de tes cartes (au choix) ; s'il est à toi, on peut le poser
let zPrevCard = null;
function zDropOpen(id) {
  const c = COS_BY_ID[id]; if (!c) return;
  const cos = cosOf(save), mine = [...CARDS, ...SKINS].filter((x) => has(x.id));
  if (!zPrevCard || !has(zPrevCard)) zPrevCard = zSample()?.id;
  const card = byId[zPrevCard], used = usedInstances(save);
  const ref = cos.own[id] ? "a:" + id : (cos.inst.find((x) => x.c === id && !used[x.i]) || cos.inst.find((x) => x.c === id)) ? "i:" + (cos.inst.find((x) => x.c === id && !used[x.i]) || cos.inst.find((x) => x.c === id)).i : null;
  const design = card && has(card.id) ? { ...(designOfS(save, card.id) || {}), [c.slot]: id } : { [c.slot]: id };
  $("overlay").innerHTML = `<div class="sheet zs-sheet" role="dialog" aria-modal="true" aria-label="${esc(c.name)}"><div class="sheet-h"><h2>${esc(c.name)}</h2><button class="x" type="button" data-act="close" aria-label="Fermer">✕</button></div>
    <div class="sheet-b"><div class="zs-prev" style="--h1:${RAR[c.rar].color};--h2:#15141a"><div class="zs-prev-card">${card ? cardHTML(card, { design, present: true }) : zGhost(c)}</div></div>
      <div class="row" style="flex-wrap:wrap;gap:8px"><span class="pill out" style="border-color:${RAR[c.rar].color};color:${RAR[c.rar].color}">${RAR[c.rar].label}</span><span class="pill">${COS_SLOT_LABEL[c.slot]}</span>${c.only ? `<span class="pill">Exclusif du Sanctuaire</span>` : ""}</div>
      ${mine.length ? `<label class="zpick">Voir sur la carte <select class="in" id="zPrevCard">${mine.map((x) => `<option value="${x.id}" ${x.id === zPrevCard ? "selected" : ""}>${esc(nameOf(x))} · ${esc(x.title)}</option>`).join("")}</select></label>` : `<p class="note">Ouvre un booster pour le voir sur une de tes cartes.</p>`}
      ${ref && card ? `<button class="btn gold big block" type="button" data-zas-ref="${ref}" data-slot="${c.slot}">Mettre sur cette carte</button>` : `<p class="note">${ref ? "" : "Pas encore à toi : il sort des invocations."}</p>`}</div></div>`;
  $("overlay").hidden = false; $("overlay").dataset.zdrop = id; $("overlay").dataset.zitem = "";
}
document.addEventListener("click", (e) => {
  const d = e.target.closest("[data-zdrop]"); if (d) return zDropOpen(d.dataset.zdrop);
  const b = e.target.closest("[data-zas-ref]"); if (b) { const card = zPrevCard, slot = b.dataset.slot, design = { ...(cosOf(save).designs[card] || {}), [slot]: b.dataset.zasRef };
    zCall("design", { card, design }, () => saveDesignS(save, card, design)).then(() => { toast(`Posé sur ${nameOf(byId[card])}.`); $("overlay").hidden = true; draw(); }).catch((err) => toast(err.message)); }
});
document.addEventListener("change", (e) => { if (e.target.id === "zPrevCard") { zPrevCard = e.target.value; const o = $("overlay").dataset; if (o.zitem) zOpenItem(o.zitem); else zDropOpen(o.zdrop); } });
// tout ce qu'une invocation peut donner, rareté par rareté, avec la chance de chaque objet et ce que tu as déjà
let zDropR = "";
function zDrops() {
  const cos = cosOf(save), got = new Set([...Object.keys(cos.own), ...cos.inst.map((x) => x.c)]);
  const rows = RANKS.filter((r) => !zDropR || r === zDropR).map((r) => { const list = SUMMON_POOL(r); if (!list.length) return "";
    const per = SUMMON_RATES[r] / list.length;
    return `<div class="zdrop-r"><div class="zdrop-h"><b style="color:${RAR[r].color}">${RAR[r].label}</b><span class="note">${String(SUMMON_RATES[r]).replace(".", ",")} % au total · ${list.length} objet${list.length > 1 ? "s" : ""} · ${per.toFixed(per < 1 ? 2 : 1).replace(".", ",")} % chacun</span></div>
      <div class="zdrop-g">${list.map((c) => `<button type="button" class="zdrop ${got.has(c.id) ? "got" : ""}" data-zdrop="${c.id}">${zGhost(c)}<b>${esc(c.name)}</b><small>${COS_SLOT_LABEL[c.slot]}${c.only ? " · exclusif" : ""}${got.has(c.id) ? " · ✓ obtenu" : ""}</small></button>`).join("")}</div></div>`; }).join("");
  return `<section class="sec zdrops"><div class="sec-h"><div><p class="eyebrow">Récompenses possibles</p><h2>Ce que tu peux obtenir</h2></div></div>
    ${rarChips("zDropR", zDropR)}${rows}</section>`;
}
let zSkipAnim = false;
try { zSkipAnim = localStorage.getItem("rz-skip-summon") === "1"; } catch (e) {}
async function zSummon(n) {
  if (zBusy) return; // pas de double invocation
  zBusy = true; draw();
  let r;
  try { r = await zCall("summon", { n }, () => summonS(save, n, Math.random)); }
  catch (e) { toast(e.message); return draw(); }
  finally { zBusy = false; }
  summonOpening(r.got, r.scenario, zSkipAnim ? { phase: "done", flipped: true } : {});
}

// --- branchement : rendu, menu, clics ---
VIEWS.boutique = viewBoutique; VIEWS.atelier = viewAtelier; VIEWS.sanctuaire = viewSanctuaire;
function afterViews() {
}
const Z_SEG = { ...ZS_SEG, zDropR: (v) => { zDropR = v; }, zBout: (v) => { zBoutTab = v; }, zShop: (v) => { zShopSlot = v; }, zAt: (v) => { zAtelierTab = v; }, zInv: (v) => { zInvSlot = v; } };
document.addEventListener("click", (e) => {
  const t = e.target;
  const b = t.closest("[data-zbuy]"); if (b) { b.disabled = true; return zBuy(b.dataset.zbuy); }
  const it = t.closest("[data-zitem]"); if (it) return zOpenItem(it.dataset.zitem);
  const zc = t.closest("[data-zcoll]"); if (zc) { zShopFilter = ""; draw(); document.getElementById("zcoll-" + zc.dataset.zcoll)?.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
  const s = t.closest("[data-zset]"); if (s) { const sl = s.dataset.zset, ref = s.dataset.ref; if (ref) zDraft[sl] = ref; else delete zDraft[sl]; return draw(); }
  if (t.closest("[data-zsave]")) return zSaveDesign();
  if (t.closest("[data-zclear]")) { zDraft = {}; return draw(); }
  const f = t.closest("[data-zfeat]"); if (f) return zFeature(f.dataset.zfeat || null);
  const sm = t.closest("[data-zsum]"); if (sm) return zSummon(+sm.dataset.zsum);
});
document.addEventListener("change", (e) => {
  if (e.target.id === "zCard") { zDraftCard = e.target.value; zDraft = null; nav("atelier", zDraftCard); }
  if (e.target.id === "zSkip") { zSkipAnim = e.target.checked; try { localStorage.setItem("rz-skip-summon", zSkipAnim ? "1" : "0"); } catch (err) {} }
});
