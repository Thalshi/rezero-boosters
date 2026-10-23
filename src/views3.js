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
function viewBoutique() {
  if (!featureOn(CONFIG, "boutique")) return closedHTML("Boutique Arcanique");
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
    <div class="z-bar"><span>Essence : <b>${fmtN(save.chakra)} ◆</b></span><span class="note">Prix provisoires, en attente de validation.</span><button class="btn sm" type="button" data-nav="atelier">Ouvrir l'Atelier</button></div>
    ${hero}${filters}${rows}</div>`;
}
// fiche d'un objet : aperçu sur ton profil et sur ta carte vedette (avec son design actuel), puis achat
function zOpenItem(id) {
  const c = COS_BY_ID[id]; if (!c) return; zItem = id;
  const card = zSample(), cur = has(card.id) ? designOfS(save, card.id) || {} : {}, design = { ...cur, [c.slot]: c.id };
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
      ${act}</div></div>`;
  $("overlay").hidden = false;
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
  const tabs = utabs("zAt", [["design", "Personnaliser"], ["inv", "Inventaire", cos.inst.length + Object.keys(cos.own).length, true]], zAtelierTab);
  if (!zDraftCard) return `<div class="wrap page">${head("Atelier Arcanique", "Atelier Arcanique")}<p class="note">Ouvre d'abord un booster : il te faut une carte à personnaliser.</p></div>`;
  if (!zDraft) zDraft = { ...(cos.designs[zDraftCard] || {}) };
  const c = byId[zDraftCard], resolved = Object.fromEntries(Object.entries(zDraft).map(([k, r]) => [k, refCos(save, r)?.id]).filter(([, v]) => v));
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
      <div class="zat-slots">${COS_SLOTS.map((sl) => { const opts = zOptions(sl.id); return `<div class="zslot"><p class="eyebrow mut">${sl.label}</p>
        <div class="zopts"><button type="button" class="zopt ${zDraft[sl.id] ? "" : "on"}" data-zset="${sl.id}" data-ref="">Aucun</button>
        ${opts.map((o) => `<button type="button" class="zopt ${zDraft[sl.id] === o.ref ? "on" : ""}" data-zset="${sl.id}" data-ref="${o.ref}" style="--c:${RAR[o.c.rar].color}"><i></i>${esc(o.c.name)}<small>${o.note}</small></button>`).join("")}
        ${opts.length ? "" : `<span class="note">Rien pour l'instant : <a href="#/boutique">Boutique</a> ou <a href="#/sanctuaire">Sanctuaire</a>.</span>`}</div></div>`; }).join("")}
        ${sl0Note()}</div>
    </div></div>`;
}
const sl0Note = () => `<p class="note">Une instance unique ne décore qu'une carte à la fois : la choisir ici la retire de l'autre carte. Les cosmétiques de compte s'utilisent sur autant de cartes que tu veux.</p>`;
function zInventory() {
  const cos = cosOf(save), used = usedInstances(save);
  const items = [...Object.keys(cos.own).filter((id) => COS_BY_ID[id]).map((id) => ({ c: COS_BY_ID[id], kind: "Compte · réutilisable" })),
    ...cos.inst.filter((it) => COS_BY_ID[it.c]).map((it) => ({ c: COS_BY_ID[it.c], kind: used[it.i] ? `Instance · sur ${esc(nameOf(byId[used[it.i]]))}` : "Instance unique · libre" }))]
    .filter((x) => !zInvSlot || x.c.slot === zInvSlot);
  return `${seg("zInv", [["", "Tout"], ...COS_SLOTS.map((s) => [s.id, s.label])], zInvSlot)}
    ${items.length ? `<div class="zgrid">${items.map((x) => zTile(x.c, "", ` · ${x.kind}`)).join("")}</div>` : `<p class="note">Ton inventaire est vide. Achète des cosmétiques à la <a href="#/boutique">Boutique</a> ou invoque-en au <a href="#/sanctuaire">Sanctuaire</a>.</p>`}`;
}

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
    <div class="z-bar"><span>Essence : <b>${fmtN(save.chakra)} ◆</b></span><span>Mythique garantie dans <b>${Math.max(0, SUMMON_PITY_M - cos.sinceM)}</b> invocations</span></div>
    <div class="zoffers">${Z_OFFERS.map(([n, t, sub, k]) => `<button class="zoffer n${n}" type="button" data-zsum="${n}" ${save.chakra < summonCost(n) || zBusy ? "disabled" : ""}>
      <span class="zo-art" aria-hidden="true">${n === 10 ? `<span class="zo-chest"><i></i><b>${ico(k)}</b></span>` : n === 5 ? `<span class="zo-pouch"><b>${ico(k)}</b></span>` : `<span class="zo-card"><b>${ico(k)}</b></span>`}</span>
      <span class="zo-n">×${n}</span><b class="zo-t">${t}</b><span class="zo-s">${sub}</span>
      <span class="zo-p">${fmtN(summonCost(n))} ◆${n > 1 ? ` <s>${fmtN(SUMMON_COST * n)}</s>` : ""}</span></button>`).join("")}</div>
    <div class="zs-side">
      <p class="note">Chaque objet invoqué est une instance unique, que tu peux équiper à l'Atelier ou vendre avec ta carte. ×5 et ×10 : 10 % moins cher.</p>
      <p class="eyebrow mut">Chances par objet (provisoires)</p><div class="zrates">${rates}</div>
      <label class="zopt-line"><input type="checkbox" id="zSkip" ${zSkipAnim ? "checked" : ""}> Passer l'animation</label>
    </div></div>`;
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
const Z_SEG = { ...ZS_SEG, zShop: (v) => { zShopSlot = v; }, zAt: (v) => { zAtelierTab = v; }, zInv: (v) => { zInvSlot = v; } };
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
