// ===== Créateur : l'admin et le dev ajoutent ou retouchent persos, cartes et cosmétiques (#/createur) =====
// Publié directement pour tout le monde. Le serveur relit tout (worker/creations-api.js) ; ici : formulaires,
// aperçu en direct, image réduite dans le navigateur avant l'envoi. Au démarrage, chaque joueur charge le catalogue.
ROUTES.push("createur");
const CREA = { v: 0, imgV: {}, uris: {}, log: [], raw: { people: {}, cards: {}, cos: {} }, loading: null };
// --- chargement du catalogue (tous les joueurs, sur le site) ---
async function creaLoad(force) {
  if (!window.DISCORD_LOGIN) return false;
  if (CREA.loading) return CREA.loading;
  CREA.loading = (async () => {
    let r;
    try { r = await srv("creations", force ? {} : { v: CREA.v }); } catch (e) { return false; }
    if (r.same) return false;
    creaApply(r);
    return true;
  })().finally(() => { CREA.loading = null; });
  return CREA.loading;
}
async function creaApply(r) {
  CREA.v = r.v; if (r.log) CREA.log = r.log;
  CREA.raw = { people: r.people || {}, cards: r.cards || {}, cos: r.cos || {} };
  applyCreations({ people: r.people, cards: r.cards, cos: r.cos });
  if (typeof zCollRefill === "function") zCollRefill();
  const todo = Object.entries(r.imgs || {}).filter(([k, v]) => CREA.imgV[k] !== v);
  await Promise.all(todo.map(async ([k, v]) => { try { const x = await srv("creations/img", { k }); CREA.uris[k] = x.uri; CREA.imgV[k] = v; ART[k] = x.uri; } catch (e) {} }));
  creaStyle();
}
// une règle CSS par image créée (comme les images de base : .who-<clé> .layer)
function creaStyle() {
  let st = document.getElementById("crea-art");
  if (!st) { st = document.createElement("style"); st.id = "crea-art"; document.head.appendChild(st); }
  st.textContent = Object.entries(CREA.uris).map(([k, u]) => `.who-${k} .layer{background-image:url(${u})}`).join("");
}
setInterval(() => { if (SRV && !document.hidden && !window.__asleep?.()) creaLoad().then((changed) => { if (changed && !opening && $("overlay").hidden && view !== "createur") draw(); }); }, 90000);

// --- la page ---
const CR = { tab: "persos", q: "", who: "", edit: null, busy: false };
const CR_SLOTS = () => COS_SLOTS.map((s) => [s.id, s.label]);
const CR_KINDS = (slot) => [...new Set(COSMETICS.filter((c) => c.slot === slot && !c.id.startsWith("__")).map((c) => c.k))];
const CR_BRANCHES = [["", "Proposée par le jeu"], ["assaut", "Assaut"], ["defense", "Défense"], ["stratege", "Stratège"], ["voleur", "Voleur"], ["precision", "Précision"], ["resistance", "Résistance"], ["survie", "Survie"], ["chance", "Chance"]];
const crOpts = (list, cur) => list.map(([v, l]) => `<option value="${esc(v)}" ${String(cur ?? "") === String(v) ? "selected" : ""}>${esc(l)}</option>`).join("");
const crRar = () => RANKS.map((r) => [r, RAR[r].label]);
const crBadge = (kind, id) => { const box = { perso: "people", carte: "cards", cos: "cos" }[kind], base = kind === "perso" ? CREA_BASE.people[id] : kind === "carte" ? CREA_BASE.cards.some((c) => c.id === id) || byId[id]?.skin : CREA_BASE.cos.some((c) => c.id === id);
  return !base ? `<span class="cr-b new">Créé</span>` : CREA.raw[box]?.[id] ? `<span class="cr-b mod">Retouché</span>` : ""; };

function viewCreateur() {
  if (!IS_ADMIN && !IS_DEV) return `<div class="wrap page">${empty("Cette page est réservée à l'admin et au dev.")}</div>`;
  if (!SRV) return `<div class="wrap page">${empty("Le Créateur s'utilise sur le site du QG, connecté avec Discord.")}</div>`;
  if (CR.edit) return crEditor();
  const tabs = seg("crTab", [["persos", "Persos et cartes"], ["import", "Import en masse"], ["cos", "Cosmétiques"], ["log", "Historique"]], CR.tab);
  let body = "";
  if (CR.tab === "persos") {
    body = CR.p && PEOPLE[CR.p] ? crSheet(CR.p) : crBoard();
  } else if (CR.tab === "cartes") {
    const who = CR.who && PEOPLE[CR.who] ? CR.who : "", cards = who ? ALL_CARDS.filter((c) => c.who === who).sort((a, b) => RAR[a.rar].rank - RAR[b.rar].rank) : [];
    body = `<div class="row"><label class="field">Perso <select id="crWho"><option value="">Choisir un perso…</option>${Object.entries(PEOPLE).filter(([k]) => !k.startsWith("__")).sort((a, b) => a[1].name.localeCompare(b[1].name)).map(([k, p]) => `<option value="${k}" ${k === who ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label>
      ${who ? `<button class="btn gold" type="button" data-cr-new="carte">+ Nouvelle carte de ${esc(PEOPLE[who].name)}</button>` : ""}</div>
      ${who ? `<div class="cr-cards">${cards.map((c) => `<button type="button" class="cr-card" data-cr-edit="carte" data-id="${c.id}">${cardHTML(c, {})}${crBadge("carte", c.id)}</button>`).join("")}</div>` : `<p class="note">Choisis un perso pour voir ses cartes, en ajouter une (autre rareté, autre image) ou en retoucher une.</p>`}`;
  } else if (CR.tab === "import") {
    body = viewImport();
  } else if (CR.tab === "cos") {
    body = `<div class="row"><button class="btn gold" type="button" data-cr-new="cos">+ Nouveau cosmétique</button></div>
      <div class="zgrid">${COSMETICS.filter((c) => !c.id.startsWith("__")).map((c) => `<button type="button" class="cr-cos" data-cr-edit="cos" data-id="${c.id}">${zTile(c, "", c.only ? " · Sanctuaire" : "")}${crBadge("cos", c.id)}</button>`).join("")}</div>`;
  } else {
    body = CREA.log.length ? `<ol class="cr-log">${CREA.log.map((l) => `<li><b>${esc(l.name || "")}</b> ${esc(l.text)}<small>${new Date(l.t).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</small></li>`).join("")}</ol>` : `<p class="note">Rien n'a encore été créé ni retouché.</p>`;
  }
  return `<div class="wrap page" style="max-width:1100px">${head("Admin · Dev", "Créateur", "Ajoute des persos au fil des épisodes, de nouvelles cartes, retouche l'existant ou dessine des cosmétiques. C'est ajouté au jeu tout de suite ; un perso d'un épisode pas encore atteint reste caché aux joueurs. Seule l'équipe (admin et dev) est prévenue, pas les joueurs.")}
    ${tabs}<div class="cr-body">${body}</div></div>`;
}

// --- formulaire : ouverture ---
function crOpen(kind, id) {
  let f;
  if (kind === "perso") {
    const p = id ? PEOPLE[id] : null, c = id ? byId[id] : null;
    f = p ? { name: p.name, fac: p.fac, kanji: p.kanji || "", color: p.color || "#5ab0ff", tag: p.tag || c?.title || "", power: p.power || "", look: p.look || "", ep: epOfCfg(CONFIG, id), branche: p.branche || "", btProfil: p.bt?.profil || "", btAff: p.bt?.affinite || "", btTech: p.bt?.tech || "" }
      : { name: "", fac: "irl", kanji: "", color: "#5ab0ff", tag: "", power: "", look: "", ep: Math.min(EP_MAX, (CONFIG.def || 1) + 1), branche: "", rar: "c" };
  } else if (kind === "carte") {
    const c = id ? byId[id] : null;
    f = c ? { title: c.title, rar: c.rar, pos: c.pos || "50% 30%", zoom: c.zoom || 1, branche: c.branche || "" } : { who: CR.who, title: "", rar: "c", pos: "50% 30%", zoom: 1, branche: "" };
  } else {
    const c = id ? COS_BY_ID[id] : null;
    f = c ? { name: c.name, rar: c.rar, slot: c.slot, k: c.k, c1: c.c1 || "#f5c518", c2: c.c2 || "#3a1440", only: c.only || "", coll: c.coll || "" } : { name: "", rar: "r", slot: "aura", k: CR_KINDS("aura")[0], c1: "#f5c518", c2: "#3a1440", only: "", coll: "neon" };
  }
  CR.edit = { kind, id: id || null, f, start: JSON.parse(JSON.stringify(f)), image: null };
  draw(); scrollTo(0, 0);
}
// --- formulaire : rendu ---
function crEditor() {
  const E = CR.edit, f = E.f, isNew = !E.id;
  const title = { perso: isNew ? "Nouveau perso" : `Perso : ${PEOPLE[E.id]?.name}`, carte: isNew ? `Nouvelle carte de ${PEOPLE[f.who]?.name || "?"}` : `Carte : ${byId[E.id]?.title}`, cos: isNew ? "Nouveau cosmétique" : `Cosmétique : ${COS_BY_ID[E.id]?.name}` }[E.kind];
  const fld = (label, html, hint = "") => `<label class="field">${label}${html}${hint ? `<small class="note">${hint}</small>` : ""}</label>`;
  const txt = (k, max, ph = "") => `<input class="in" type="text" data-crf="${k}" maxlength="${max}" value="${esc(f[k] ?? "")}" placeholder="${esc(ph)}">`;
  const area = (k, max, ph = "") => `<textarea class="in" rows="2" data-crf="${k}" maxlength="${max}" placeholder="${esc(ph)}">${esc(f[k] ?? "")}</textarea>`;
  const sel = (k, list) => `<select data-crf="${k}">${crOpts(list, f[k])}</select>`;
  const col = (k) => `<input type="color" data-crf="${k}" value="${esc(f[k] || "#ffffff")}">`;
  const img = `${fld("Image", `<input type="file" accept="image/*" id="crImg">`, E.image ? "Nouvelle image prête (réduite à 640 px)." : "jpeg, png ou webp ; réduite automatiquement avant l'envoi.")}`;
  let form = "";
  if (E.kind === "perso") form = `${fld("Nom", txt("name", 30, "Ex. Zéphyr"))}${fld("Faction", sel("fac", Object.entries(FACTIONS).map(([k, v]) => [k, v.label])), f.fac === "irl" ? "QG de Shinjuku : 6 skins (Chroma à Prestige) sont créés automatiquement." : "")}
      ${isNew ? fld("Rareté de sa carte", sel("rar", crRar())) : ""}${fld("Titre de sa carte", txt("tag", 40, "Ex. Vent du QG"))}
      <div class="cr-2">${fld("Couleur", col("color"))}</div>
      ${fld("Épisode d'arrivée", sel("ep", Array.from({ length: EP_MAX }, (_, i) => [i + 1, epLabel(i + 1)])), "Caché aux joueurs tant que Billy n'a pas débloqué cet épisode.")}
      ${fld("Branche en Confrontation", sel("branche", CR_BRANCHES))}${fld("Pouvoir", area("power", 220))}${fld("Apparence", area("look", 220))}${img}
      ${E.id ? `<fieldset class="cr-bt"><legend>Arène (combats 3 contre 3)</legend>${(() => { const auto = btKitOf(E.id); return `<div class="cr-2">${fld("Profil", sel("btProfil", [["", `Automatique (${BT_PROFILS[auto.profil].label})`], ...BT_PROFIL_IDS.map((k) => [k, BT_PROFILS[k].label])]), "Assassin frappe fort, Mage empoisonne, Gardien encaisse, Soutien soigne.")}${fld("Affinité", sel("btAff", [["", `Automatique (${BT_AFFINITES[auto.aff].label})`], ...BT_AFF_IDS.map((k) => [k, BT_AFFINITES[k].label])]), "Feu > Vent > Terre > Eau > Feu ; Ombre et Lumière l'une contre l'autre.")}</div>
        ${fld("Nom de sa technique spéciale", txt("btTech", 40, BT_PROFILS[f.btProfil || auto.profil].tech.nom), "Vide = nom par défaut du profil. L'effet dépend du profil.")}`; })()}</fieldset>` : ""}`;
  else if (E.kind === "carte") form = `${fld("Titre", txt("title", 40, "Ex. Tempête"))}${fld("Rareté", sel("rar", crRar()), isNew ? "" : "Changer la rareté change la valeur de la carte pour ceux qui l'ont déjà.")}
      ${img}<div class="cr-2">${fld(`Cadrage horizontal <b>${parseInt(f.pos)}%</b>`, `<input type="range" min="0" max="100" data-crpos="0" value="${parseInt(f.pos)}">`)}${fld(`Cadrage vertical <b>${parseInt(f.pos.split(" ")[1])}%</b>`, `<input type="range" min="0" max="100" data-crpos="1" value="${parseInt(f.pos.split(" ")[1])}">`)}</div>
      ${fld(`Zoom <b>×${(+f.zoom).toFixed(1)}</b>`, `<input type="range" min="1" max="3" step="0.1" data-crf="zoom" value="${f.zoom}">`)}${fld("Branche en Confrontation", sel("branche", CR_BRANCHES), "Vide : branche du perso (ou sa variante en Épique et plus).")}`;
  else form = `${fld("Nom", txt("name", 30, "Ex. Aura du vent"))}${fld("Rareté", sel("rar", crRar()), `Prix en Boutique : ${fmtN(COS_PRICE[f.rar])} ◆`)}
      ${isNew ? fld("Emplacement", sel("slot", CR_SLOTS())) : ""}${fld("Effet", sel("k", CR_KINDS(f.slot).map((k) => [k, k])))}
      <div class="cr-2">${fld("Couleur 1", col("c1"))}${fld("Couleur 2", col("c2"))}</div>
      ${fld("Collection de la Boutique", sel("coll", Z_COLLECTIONS.map((c) => [c.id, c.name])))}
      <label class="zopt-line"><input type="checkbox" data-crf="only" ${f.only ? "checked" : ""}> Réservé au Sanctuaire (ne s'achète pas)</label>`;
  const changed = JSON.stringify(f) !== JSON.stringify(E.start) || !!E.image;
  const canReset = !isNew && crBadge(E.kind, E.id).includes("Retouché");
  return `<div class="wrap page" style="max-width:1100px">${head("Créateur", esc(title))}
    <div class="cr-ed"><div class="cr-form">${form}
      <div class="row cr-act"><button class="btn gold big" type="button" data-cr-save ${changed && !CR.busy ? "" : "disabled"}>${isNew ? "Créer" : "Enregistrer les changements"}</button>
        <button class="btn" type="button" data-cr-cancel>Annuler</button>${canReset ? `<button class="btn" type="button" data-cr-reset>Remettre d'origine</button>` : ""}</div>
      <p class="note">Ajouté au jeu tout de suite. Seule l'équipe (admin et dev) reçoit une notification, pas les joueurs.</p></div>
    <div class="cr-prev"><p class="eyebrow mut">Aperçu</p><div id="crPrev">${crPreview()}</div></div></div></div>`;
}
// aperçu : la vraie carte, avec les valeurs du formulaire (objets temporaires retirés aussitôt)
function crPreview() {
  const E = CR.edit, f = E.f;
  if (E.image) { ART.__prev = E.image; let st = document.getElementById("crea-prev"); if (!st) { st = document.createElement("style"); st.id = "crea-prev"; document.head.appendChild(st); } st.textContent = `.who-__prev .layer{background-image:url(${E.image})}`; }
  if (E.kind === "cos") {
    COS_BY_ID.__prev = { id: "__prev", slot: E.id ? COS_BY_ID[E.id].slot : f.slot, k: f.k, name: f.name || "Aperçu", rar: f.rar, c1: f.c1, c2: f.c2 };
    try { return `<div class="cr-big">${cardHTML(zSample(), { design: { [COS_BY_ID.__prev.slot]: "__prev" }, present: true })}</div>`; } finally { delete COS_BY_ID.__prev; }
  }
  const who = E.kind === "perso" ? E.id || "__prev" : E.id ? byId[E.id].who : f.who;
  const base = E.kind === "carte" && E.id ? byId[E.id] : E.kind === "perso" && E.id ? byId[E.id] || { id: E.id, who, rar: "c" } : { id: "__prev", who, rar: f.rar || "c" };
  const c = { ...base, ...(E.kind === "carte" ? { title: f.title || "Titre", rar: f.rar, pos: f.pos, zoom: +f.zoom } : { title: f.tag || "Titre" }), ...(E.image ? { img: "__prev" } : {}) };
  const keep = PEOPLE[who], P = E.kind === "perso" ? { ...(keep || {}), name: f.name || "Nom", fac: f.fac, kanji: f.kanji, color: f.color, tag: f.tag } : keep;
  PEOPLE[who] = P;
  try { return `<div class="cr-big">${cardHTML(c, {})}</div>`; } finally { if (keep) PEOPLE[who] = keep; else delete PEOPLE[who]; }
}
// image : réduite dans le navigateur (640 px au plus, jpeg) pour rester sous la limite du serveur
function crReadImage(file) {
  return new Promise((ok, ko) => {
    const rd = new FileReader();
    rd.onerror = () => ko(new Error("Image illisible."));
    rd.onload = () => { const im = new Image(); im.onerror = () => ko(new Error("Image illisible.")); im.onload = () => {
      const k = Math.min(1, 640 / Math.max(im.width, im.height)), cv = document.createElement("canvas");
      cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k); cv.getContext("2d").drawImage(im, 0, 0, cv.width, cv.height);
      let q = 0.86, u = cv.toDataURL("image/jpeg", q); while (u.length > 380000 && q > 0.4) { q -= 0.1; u = cv.toDataURL("image/jpeg", q); }
      u.length > 380000 ? ko(new Error("Image trop lourde, même réduite.")) : ok(u); }; im.src = rd.result; };
    rd.readAsDataURL(file);
  });
}
async function crSave(reset) {
  const E = CR.edit; if (!E || CR.busy) return;
  const data = {};
  for (const [k, v] of Object.entries(E.f)) if (!E.id || JSON.stringify(v) !== JSON.stringify(E.start[k])) data[k] = k === "only" ? (v ? "sanctuaire" : "") : v;
  if (E.kind === "perso" && E.id && "ep" in data) delete data.ep;
  // Arène : les trois réglages partent ensemble
  if (E.kind === "perso") { const ch = ["btProfil", "btAff", "btTech"].some((k) => k in data); for (const k of ["btProfil", "btAff", "btTech"]) delete data[k]; if (ch && E.id) data.bt = { profil: E.f.btProfil, affinite: E.f.btAff, tech: E.f.btTech }; } // l'épisode d'un perso existant se règle dans Admin (il reste modifiable ici pour un nouveau)
  CR.busy = true; draw();
  try {
    const r = await srv(reset ? "creations/reset" : "creations/save", reset ? { kind: E.kind, id: E.id } : { kind: E.kind, id: E.id, data, image: E.image || undefined });
    await creaApply(r);
    if (E.kind === "perso" && E.id && E.f.ep !== E.start.ep) await crSetEp(E.id, E.f.ep);
    toast(reset ? "Remis d'origine." : E.id ? "Changements enregistrés." : "Créé !");
    if (E.kind === "carte") CR.who = r.cards?.[r.id]?.who || byId[r.id]?.who || CR.who;
    CR.edit = null;
  } catch (e) { toast(e.message); }
  CR.busy = false; draw();
}
// épisode d'un perso déjà dans le jeu : même réglage que la page Admin (config du jeu)
async function crSetEp(who, ep) { CONFIG.ep[who] = +ep; await saveConfig(); }

const E_CONFIRM = () => (CR.edit && !CR.edit.id ? "Toucher encore pour créer" : "Toucher encore pour enregistrer");
VIEWS.createur = viewCreateur;
ADMIN_SEG.crTab = (v) => { CR.tab = v; };
document.addEventListener("click", (e) => {
  const t = e.target;
  const n = t.closest("[data-cr-new]"); if (n) return crOpen(n.dataset.crNew, null);
  const ed = t.closest("[data-cr-edit]"); if (ed) return crOpen(ed.dataset.crEdit, ed.dataset.id);
  if (t.closest("[data-cr-cancel]")) { CR.edit = null; return draw(); }
  const sv = t.closest("[data-cr-save]"); if (sv) return sure(sv, E_CONFIRM()) && crSave(false);
  const rs = t.closest("[data-cr-reset]"); if (rs) return sure(rs, "Toucher encore pour remettre d'origine") && crSave(true);
});
document.addEventListener("input", (e) => {
  const t = e.target;
  if (t.id === "crQ") { CR.q = t.value; clearTimeout(CR.qT); CR.qT = setTimeout(() => { draw(); const i = $("crQ"); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250); return; }
  if (!CR.edit) return;
  const k = t.dataset.crf, p = t.dataset.crpos;
  if (k) CR.edit.f[k] = t.type === "checkbox" ? t.checked : t.type === "range" ? +t.value : t.value;
  else if (p != null) { const xy = CR.edit.f.pos.split(" "); xy[+p] = t.value + "%"; CR.edit.f.pos = xy.join(" "); }
  else return;
  if (k === "slot") { CR.edit.f.k = CR_KINDS(t.value)[0]; return draw(); }
  if (t.tagName === "SELECT" || t.type === "checkbox") return draw();
  $("crPrev").innerHTML = crPreview();
  const lab = t.closest("label")?.querySelector("b"); if (lab && t.type === "range") lab.textContent = k === "zoom" ? `×${(+t.value).toFixed(1)}` : `${t.value}%`;
  const sv = document.querySelector("[data-cr-save]"); if (sv) sv.disabled = false;
});
document.addEventListener("change", async (e) => {
  if (e.target.id === "crWho") { CR.who = e.target.value; return draw(); }
  if (e.target.id === "crImg" && CR.edit && e.target.files?.[0]) {
    try { CR.edit.image = await crReadImage(e.target.files[0]); } catch (err) { toast(err.message); }
    draw();
  }
});

// ===== Import en masse : plusieurs visuels d'un coup → une carte chacun, à peaufiner ensuite =====
// Chaque image est recadrée au format carte (516 × 720) dans le navigateur ; on choisit le perso (deviné
// d'après le nom du fichier), le titre, la rareté, le cadrage et le cadre dessiné à retirer, puis tout part
// d'un coup. Les cartes créées se retouchent ensuite dans « Persos et cartes », comme les autres.
const CRI = { items: [], busy: false, n: 0 };
const CRI_W = 516, CRI_H = 720;
const criNorm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
// le perso dont le nom (ou l'identifiant) apparaît dans le nom du fichier, le plus long d'abord
function criGuess(file) {
  const f = criNorm(file.replace(/\.[a-z0-9]+$/i, ""));
  const cand = Object.entries(PEOPLE).filter(([k]) => !k.startsWith("__")).flatMap(([k, p]) => [[k, criNorm(k)], [k, criNorm(p.name)]]).filter(([, n]) => n.length >= 2 && f.includes(n));
  return cand.sort((a, b) => b[1].length - a[1].length)[0]?.[0] || "";
}
// rareté proposée : un cran au-dessus de la carte la plus rare du perso (Mythique au plus)
function criRar(who, skip) {
  if (!who || !PEOPLE[who]) return "r";
  const top = Math.max(0, ...ALL_CARDS.filter((c) => c.who === who && !c.skin).map((c) => RAR[c.rar].rank), ...CRI.items.filter((x) => x.who === who && x !== skip).map((x) => RAR[x.rar].rank));
  return RANKS[Math.min(RANKS.length - 1, top + 1)] || "m";
}
function criTitle(who) { const n = ALL_CARDS.filter((c) => c.who === who && !c.skin).length + CRI.items.filter((x) => x.who === who).length; return `Illustration ${n + 1}`; }
// le recadrage : on retire le cadre (en % de chaque bord), puis on garde le format carte autour du point choisi
function criRender(it) {
  const im = it.im, fr = it.frame / 100, x0 = im.width * fr, y0 = im.height * fr, w = im.width - 2 * x0, h = im.height - 2 * y0;
  let cw = w, ch = w * CRI_H / CRI_W; if (ch > h) { ch = h; cw = h * CRI_W / CRI_H; }
  const sx = x0 + (w - cw) * it.fx / 100, sy = y0 + (h - ch) * it.fy / 100;
  const cv = document.createElement("canvas"); cv.width = CRI_W; cv.height = CRI_H;
  const g = cv.getContext("2d"); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high"; g.drawImage(im, sx, sy, cw, ch, 0, 0, CRI_W, CRI_H);
  let q = 0.9, u = cv.toDataURL("image/jpeg", q); while (u.length > 380000 && q > 0.4) { q -= 0.08; u = cv.toDataURL("image/jpeg", q); }
  it.out = u; it.small = cw < CRI_W;
}
function criStyle() {
  let st = document.getElementById("crea-imp"); if (!st) { st = document.createElement("style"); st.id = "crea-imp"; document.head.appendChild(st); }
  st.textContent = CRI.items.map((x) => `.who-__imp${x.k} .layer{background-image:url(${x.out})}`).join("");
}
function criCard(it) {
  const k = "__imp" + it.k; ART[k] = it.out;
  const who = it.who && PEOPLE[it.who] ? it.who : "__impw", keep = PEOPLE[who];
  if (who === "__impw") PEOPLE[who] = { name: it.newName || "Nouveau perso", fac: it.fac || "irl", color: "#5ab0ff", kanji: "" };
  try { return cardHTML({ id: k, who, img: k, title: it.title || "Titre", rar: it.rar, pos: "50% 50%", zoom: 1 }, { w: 190 }); }
  finally { if (who === "__impw") { if (keep) PEOPLE[who] = keep; else delete PEOPLE[who]; } }
}
function criItem(it, i) {
  const people = Object.entries(PEOPLE).filter(([k]) => !k.startsWith("__")).sort((a, b) => a[1].name.localeCompare(b[1].name));
  const rng = (f, label, v, max = 100) => `<label class="field">${label} <b>${v}${f === "frame" ? " %" : "%"}</b><input type="range" min="0" max="${max}" step="${f === "frame" ? 0.5 : 1}" data-cri="${f}" data-i="${i}" value="${v}"></label>`;
  return `<div class="cri-it ${it.status === "ok" ? "ok" : it.status ? "ko" : ""}" data-cri-box="${i}">
    <div class="cri-prev" id="criPrev${i}">${criCard(it)}</div>
    <div class="cri-f"><p class="cri-file">${esc(it.name)}${it.small ? ` <span class="cr-b mod" title="Image plus petite que la carte : elle sera agrandie, donc un peu moins nette">Petite image</span>` : ""}</p>
      <label class="field">Perso <select data-cri="who" data-i="${i}"><option value="">Choisir…</option><option value="__new" ${it.who === "__new" ? "selected" : ""}>+ Nouveau perso</option>${people.map(([k, p]) => `<option value="${k}" ${k === it.who ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label>
      ${it.who === "__new" ? `<div class="cr-2"><label class="field">Nom <input class="in" maxlength="30" data-cri="newName" data-i="${i}" value="${esc(it.newName || "")}"></label><label class="field">Faction <select data-cri="fac" data-i="${i}">${crOpts(Object.entries(FACTIONS).map(([k, v]) => [k, v.label]), it.fac)}</select></label></div>` : ""}
      <div class="cr-2"><label class="field">Titre <input class="in" maxlength="40" data-cri="title" data-i="${i}" value="${esc(it.title)}"></label><label class="field">Rareté <select data-cri="rar" data-i="${i}">${crOpts(crRar(), it.rar)}</select></label></div>
      <div class="cr-2">${rng("fx", "Cadrage horizontal", it.fx)}${rng("fy", "Cadrage vertical", it.fy)}</div>
      ${rng("frame", "Cadre dessiné à retirer", it.frame, 12)}
      <div class="row"><button class="btn sm" type="button" data-cri-del="${i}">Retirer</button>${it.status && it.status !== "ok" ? `<span class="note" style="color:var(--abad,#ff4d5e)">${esc(it.status)}</span>` : it.status === "ok" ? `<span class="note">Créée ✓</span>` : ""}</div></div></div>`;
}
function viewImport() {
  const n = CRI.items.length, ready = CRI.items.filter((x) => x.status !== "ok" && x.who && x.title && (x.who !== "__new" || x.newName)).length;
  return `<div class="cri-drop" id="criDrop"><input type="file" accept="image/*" multiple id="criFiles" hidden>
      <b>Dépose ici tes visuels, autant que tu veux</b><button class="btn sm gold" type="button" data-cri-pick>ou choisis des fichiers</button>
      <small>Chaque image devient une carte. Le perso est deviné d'après le nom du fichier (ex. <i>reichi-pluie.webp</i>), la rareté est proposée un cran au-dessus de ses cartes. Tout se modifie ici avant de créer, puis dans « Persos et cartes ».</small></div>
    ${n ? `<div class="row cri-bar"><label class="zopt-line"><input type="checkbox" id="criFrameAll" ${CRI.frameAll ? "checked" : ""}> Tous ont un cadre dessiné (retirer 5 %)</label>
      <button class="btn gold big" type="button" data-cri-go ${ready && !CRI.busy ? "" : "disabled"}>${CRI.busy ? "Création…" : `Créer ${ready} carte${ready > 1 ? "s" : ""}`}</button>
      <button class="btn" type="button" data-cri-clear>Tout vider</button></div>
      <div class="cri-grid">${CRI.items.map(criItem).join("")}</div>` : ""}`;
}
async function criAdd(files) {
  const list = [...files].filter((f) => /^image\//.test(f.type));
  for (const f of list) {
    try {
      const url = await new Promise((ok, ko) => { const rd = new FileReader(); rd.onload = () => ok(rd.result); rd.onerror = ko; rd.readAsDataURL(f); });
      const im = await new Promise((ok, ko) => { const x = new Image(); x.onload = () => ok(x); x.onerror = ko; x.src = url; });
      const who = criGuess(f.name), it = { k: ++CRI.n, name: f.name, im, who, newName: "", fac: "neu", fx: 50, fy: 35, frame: CRI.frameAll ? 5 : 0, status: "" };
      it.rar = criRar(who); it.title = who ? criTitle(who) : "";
      criRender(it); CRI.items.push(it);
    } catch (e) { toast(`${f.name} : image illisible.`); }
  }
  criStyle(); draw();
}
async function criGo() {
  if (CRI.busy) return; CRI.busy = true; draw();
  let ok = 0;
  for (const it of CRI.items) {
    if (it.status === "ok" || !it.who || !it.title || (it.who === "__new" && !it.newName)) continue;
    try {
      const r = it.who === "__new"
        ? await srv("creations/save", { kind: "perso", id: null, data: { name: it.newName, fac: it.fac, rar: it.rar, tag: it.title, color: "#5ab0ff", ep: Math.min(EP_MAX, (CONFIG.def || 1) + 1) }, image: it.out })
        : await srv("creations/save", { kind: "carte", id: null, data: { who: it.who, title: it.title, rar: it.rar, pos: "50% 50%", zoom: 1 }, image: it.out });
      await creaApply(r); it.status = "ok"; ok++;
    } catch (e) { it.status = e.message || "Refusée."; }
    draw();
  }
  CRI.busy = false;
  CRI.items = CRI.items.filter((x) => x.status !== "ok"); criStyle();
  toast(ok ? `${ok} carte${ok > 1 ? "s" : ""} créée${ok > 1 ? "s" : ""} : à peaufiner dans Persos et cartes.` : "Aucune carte créée.");
  draw();
}
document.addEventListener("click", (e) => {
  const t = e.target;
  if (t.closest("[data-cri-pick]")) return $("criFiles")?.click();
  if (t.closest("[data-cri-go]")) return criGo();
  if (t.closest("[data-cri-clear]")) { CRI.items = []; criStyle(); return draw(); }
  const d = t.closest("[data-cri-del]"); if (d) { CRI.items.splice(+d.dataset.criDel, 1); criStyle(); return draw(); }
});
document.addEventListener("change", (e) => {
  const t = e.target;
  if (t.id === "criFiles" && t.files?.length) return criAdd(t.files);
  if (t.id === "criFrameAll") { CRI.frameAll = t.checked; for (const it of CRI.items) { it.frame = t.checked ? 5 : 0; criRender(it); } criStyle(); return draw(); }
  const f = t.dataset?.cri; if (!f || t.type === "range" || t.tagName === "INPUT" && t.type === "text") return;
  const it = CRI.items[+t.dataset.i]; if (!it) return;
  it[f] = t.value;
  if (f === "who" && t.value && t.value !== "__new") { it.rar = criRar(t.value, it); it.title = it.title && !/^Illustration \d+$/.test(it.title) ? it.title : criTitle(t.value); }
  draw();
});
document.addEventListener("input", (e) => {
  const t = e.target, f = t.dataset?.cri; if (!f) return;
  const i = +t.dataset.i, it = CRI.items[i]; if (!it) return;
  if (t.type === "range") { it[f] = +t.value; criRender(it); criStyle(); const b = t.closest("label")?.querySelector("b"); if (b) b.textContent = `${t.value}${f === "frame" ? " %" : "%"}`; }
  else it[f] = t.value;
  const p = $("criPrev" + i); if (p) p.innerHTML = criCard(it);
  const go = document.querySelector("[data-cri-go]"); if (go && t.type !== "range") { const ready = CRI.items.filter((x) => x.status !== "ok" && x.who && x.title && (x.who !== "__new" || x.newName)).length; go.disabled = !ready || CRI.busy; go.textContent = `Créer ${ready} carte${ready > 1 ? "s" : ""}`; }
});
document.addEventListener("dragover", (e) => { if (e.target.closest?.("#criDrop")) { e.preventDefault(); $("criDrop").classList.add("on"); } });
document.addEventListener("dragleave", (e) => { if (e.target.closest?.("#criDrop")) $("criDrop").classList.remove("on"); });
document.addEventListener("drop", (e) => { if (e.target.closest?.("#criDrop")) { e.preventDefault(); $("criDrop").classList.remove("on"); criAdd(e.dataTransfer.files); } });

// ===== Persos et cartes : les têtes des persos rangées par épisode ; un perso ouvre toutes ses cartes =====
// (on passe d'un perso à l'autre en glissant, avec les flèches ou le clavier)
const crEps = () => [...new Set(Object.keys(PEOPLE).filter((k) => !k.startsWith("__")).map((k) => epOfCfg(CONFIG, k)))].sort((a, b) => a - b);
const crCardsOf = (k) => ALL_CARDS.filter((c) => c.who === k).sort((a, b) => !!a.skin - !!b.skin || RAR[a.rar].rank - RAR[b.rar].rank);
const crFace = (k) => byId[k] || crCardsOf(k).find((c) => !c.skin) || crCardsOf(k)[0];
function crList() {
  const q = criNorm(CR.q), ep = CR.ep ?? "all";
  return Object.entries(PEOPLE).filter(([k, p]) => !k.startsWith("__") && (!q || criNorm(p.name).includes(q)) && (ep === "all" || epOfCfg(CONFIG, k) === +ep))
    .sort((a, b) => epOfCfg(CONFIG, a[0]) - epOfCfg(CONFIG, b[0]) || Object.keys(FACTIONS).indexOf(a[1].fac) - Object.keys(FACTIONS).indexOf(b[1].fac) || a[1].name.localeCompare(b[1].name)).map(([k]) => k);
}
// compteur par rareté (cartes de booster, hors skins) : pour voir d'un coup d'œil s'il faut étaler les variantes
const crRars = (cards) => `<span class="cr-rars">${RANKS.slice().reverse().map((r) => { const n = cards.filter((c) => !c.skin && c.rar === r).length; return n ? `<i style="--rc:var(--r-${r})" title="${RAR[r].label}">${LETTER[r]}${n > 1 ? `×${n}` : ""}</i>` : ""; }).join("")}${cards.some((c) => c.skin) ? `<i class="sk" title="Skins du coffre">+${cards.filter((c) => c.skin).length} skins</i>` : ""}</span>`;
const crHead = (k, extra = "") => { const p = PEOPLE[k], n = crCardsOf(k).length;
  return `<button type="button" class="cr-hd ${extra}" data-cr-p="${k}" style="--fc:${FACTIONS[p.fac]?.color || "#888"}"><span class="cr-hd-img">${thumb(crFace(k), "crh")}</span><b>${esc(p.name)}</b><small>${n} carte${n > 1 ? "s" : ""}</small>${crRars(crCardsOf(k))}${crBadge("perso", k)}</button>`; };
function crBoard() {
  const eps = crEps(), ep = CR.ep ?? "all", list = crList();
  const chips = `<div class="cr-eps">${[["all", "Tous"], ...eps.map((e) => [String(e), epLabel(e)])].map(([v, l]) => `<button type="button" class="chip ${String(ep) === v ? "on" : ""}" data-cr-ep-f="${v}">${l}</button>`).join("")}</div>`;
  const groups = ep === "all" ? eps.map((e) => [e, list.filter((k) => epOfCfg(CONFIG, k) === e)]).filter(([, l]) => l.length) : [[+ep, list]];
  return `<div class="row"><button class="btn gold" type="button" data-cr-new="perso">+ Nouveau perso</button><input class="in cr-q" type="search" id="crQ" placeholder="Chercher un perso" value="${esc(CR.q)}"></div>${chips}
    ${groups.map(([e, l]) => `<section class="cr-grp"><h3>${epLabel(e)} <small>${l.length} perso${l.length > 1 ? "s" : ""}</small>${crRars(l.flatMap((k) => crCardsOf(k)))}</h3><div class="cr-hds">${l.map((k) => crHead(k)).join("")}</div></section>`).join("") || `<p class="note">Aucun perso.</p>`}`;
}
function crSheet(k) {
  const p = PEOPLE[k], list = crList(), i = list.indexOf(k), prev = list[(i - 1 + list.length) % list.length], next = list[(i + 1) % list.length], cards = crCardsOf(k);
  CR.who = k;
  const base = cards.filter((c) => !c.skin), skins = cards.filter((c) => c.skin);
  const row = (l) => `<div class="cr-car">${l.map((c) => `<button type="button" class="cr-card" data-cr-edit="carte" data-id="${c.id}">${cardHTML(c, { w: 170 })}${crBadge("carte", c.id)}</button>`).join("")}</div>`;
  return `<div class="cr-sheet" id="crSheet">
    <div class="cr-sh-top"><button class="btn sm" type="button" data-cr-back>‹ Tous les persos</button><span class="note">${i + 1} / ${list.length} · glisse pour changer de perso</span></div>
    <div class="cr-sh-head" id="crSwipe">
      ${list.length > 1 ? `<button class="cr-nav" type="button" data-cr-p="${prev}" aria-label="Perso précédent">‹</button>` : ""}
      <span class="cr-sh-img">${thumb(crFace(k), "crh")}</span>
      <div class="cr-sh-t"><h2>${esc(p.name)}</h2><p class="note">${FACTIONS[p.fac]?.label || ""} · ${cards.length} carte${cards.length > 1 ? "s" : ""}</p>
        <div class="row"><label class="field cr-sh-ep">Épisode <select data-cr-ep="${k}">${epOptions(epOfCfg(CONFIG, k), true)}</select></label>
          <button class="btn" type="button" data-cr-edit="perso" data-id="${k}">Modifier le perso</button><button class="btn gold" type="button" data-cr-new="carte">+ Nouvelle carte</button></div></div>
      ${list.length > 1 ? `<button class="cr-nav r" type="button" data-cr-p="${next}" aria-label="Perso suivant">›</button>` : ""}
    </div>
    <h3 class="cr-sh-h">Cartes <small>${base.length}</small></h3>${row(base)}
    ${skins.length ? `<h3 class="cr-sh-h">Skins <small>${skins.length}</small></h3>${row(skins)}` : ""}
    <div class="cr-strip">${list.map((x) => crHead(x, x === k ? "on" : "")).join("")}</div></div>`;
}
document.addEventListener("click", (e) => {
  const t = e.target;
  const pp = t.closest("[data-cr-p]"); if (pp) { CR.p = pp.dataset.crP; draw(); requestAnimationFrame(() => document.querySelector(".cr-strip .on")?.scrollIntoView({ inline: "center", block: "nearest" })); return; }
  if (t.closest("[data-cr-back]")) { CR.p = null; return draw(); }
  const f = t.closest("[data-cr-ep-f]"); if (f) { CR.ep = f.dataset.crEpF; return draw(); }
});
document.addEventListener("change", async (e) => {
  const t = e.target; if (!t.dataset?.crEp) return;
  try { await crSetEp(t.dataset.crEp, +t.value); toast(`${PEOPLE[t.dataset.crEp].name} : ${epLabel(+t.value)}.`); } catch (err) { toast(err.message); }
  draw();
});
// glisser à gauche ou à droite sur la tête du perso pour passer au suivant / précédent ; flèches du clavier
let crTouch = null;
document.addEventListener("touchstart", (e) => { if (e.target.closest?.("#crSwipe")) crTouch = [e.touches[0].clientX, e.touches[0].clientY]; }, { passive: true });
document.addEventListener("touchend", (e) => {
  if (!crTouch) return; const [x0, y0] = crTouch, t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0; crTouch = null;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) crStep(dx < 0 ? 1 : -1);
});
document.addEventListener("keydown", (e) => { if (view === "createur" && CR.tab === "persos" && CR.p && !CR.edit && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName) && (e.key === "ArrowLeft" || e.key === "ArrowRight")) crStep(e.key === "ArrowRight" ? 1 : -1); });
function crStep(d) {
  const list = crList(), i = list.indexOf(CR.p); if (i < 0 || list.length < 2) return;
  CR.p = list[(i + d + list.length) % list.length]; draw();
  const s = $("crSwipe"); s?.animate([{ transform: `translateX(${d * 40}px)`, opacity: .3 }, { transform: "none", opacity: 1 }], { duration: 260, easing: "cubic-bezier(.2,.8,.2,1)" });
  requestAnimationFrame(() => document.querySelector(".cr-strip .on")?.scrollIntoView({ inline: "center", block: "nearest" }));
}
document.addEventListener("click", (e) => { const a = e.target.closest("[data-adm-p]"); if (a) { CR.tab = "persos"; CR.p = a.dataset.admP; CR.edit = null; nav("createur"); } });
