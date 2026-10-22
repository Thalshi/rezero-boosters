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
setInterval(() => { if (SRV && !document.hidden) creaLoad().then((changed) => { if (changed && !opening && $("overlay").hidden && view !== "createur") draw(); }); }, 90000);

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
  const tabs = seg("crTab", [["persos", "Persos"], ["cartes", "Cartes"], ["cos", "Cosmétiques"], ["log", "Historique"]], CR.tab);
  let body = "";
  if (CR.tab === "persos") {
    const q = CR.q.trim().toLowerCase(), list = Object.entries(PEOPLE).filter(([k, p]) => !k.startsWith("__") && (!q || p.name.toLowerCase().includes(q)))
      .sort((a, b) => epOfCfg(CONFIG, a[0]) - epOfCfg(CONFIG, b[0]) || a[1].name.localeCompare(b[1].name));
    body = `<div class="row"><button class="btn gold" type="button" data-cr-new="perso">+ Nouveau perso</button><input class="in cr-q" type="search" id="crQ" placeholder="Chercher un perso" value="${esc(CR.q)}"></div>
      <div class="cr-list">${list.map(([k, p]) => { const c = byId[k] || ALL_CARDS.find((x) => x.who === k);
        return `<button type="button" class="cr-row" data-cr-edit="perso" data-id="${k}">${c ? thumb(c) : `<span class="th"></span>`}<span class="cr-n"><b>${esc(p.name)}</b><small>${FACTIONS[p.fac]?.label || ""} · ${epLabel(epOfCfg(CONFIG, k))}</small></span>${crBadge("perso", k)}</button>`; }).join("")}</div>`;
  } else if (CR.tab === "cartes") {
    const who = CR.who && PEOPLE[CR.who] ? CR.who : "", cards = who ? ALL_CARDS.filter((c) => c.who === who).sort((a, b) => RAR[a.rar].rank - RAR[b.rar].rank) : [];
    body = `<div class="row"><label class="field">Perso <select id="crWho"><option value="">Choisir un perso…</option>${Object.entries(PEOPLE).filter(([k]) => !k.startsWith("__")).sort((a, b) => a[1].name.localeCompare(b[1].name)).map(([k, p]) => `<option value="${k}" ${k === who ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label>
      ${who ? `<button class="btn gold" type="button" data-cr-new="carte">+ Nouvelle carte de ${esc(PEOPLE[who].name)}</button>` : ""}</div>
      ${who ? `<div class="cr-cards">${cards.map((c) => `<button type="button" class="cr-card" data-cr-edit="carte" data-id="${c.id}">${cardHTML(c, {})}${crBadge("carte", c.id)}</button>`).join("")}</div>` : `<p class="note">Choisis un perso pour voir ses cartes, en ajouter une (autre rareté, autre image) ou en retoucher une.</p>`}`;
  } else if (CR.tab === "cos") {
    body = `<div class="row"><button class="btn gold" type="button" data-cr-new="cos">+ Nouveau cosmétique</button></div>
      <div class="zgrid">${COSMETICS.filter((c) => !c.id.startsWith("__")).map((c) => `<button type="button" class="cr-cos" data-cr-edit="cos" data-id="${c.id}">${zTile(c, "", c.only ? " · Sanctuaire" : "")}${crBadge("cos", c.id)}</button>`).join("")}</div>`;
  } else {
    body = CREA.log.length ? `<ol class="cr-log">${CREA.log.map((l) => `<li><b>${esc(l.name || "")}</b> ${esc(l.text)}<small>${new Date(l.t).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</small></li>`).join("")}</ol>` : `<p class="note">Rien n'a encore été créé ni retouché.</p>`;
  }
  return `<div class="wrap page" style="max-width:1100px">${head("Admin · Dev", "Créateur", "Ajoute des persos au fil des épisodes, de nouvelles cartes, retouche l'existant ou dessine des cosmétiques. C'est publié tout de suite pour tout le monde ; un perso d'un épisode pas encore atteint reste caché aux joueurs. Chaque publication prévient l'autre membre de l'équipe.")}
    ${tabs}<div class="cr-body">${body}</div></div>`;
}

// --- formulaire : ouverture ---
function crOpen(kind, id) {
  let f;
  if (kind === "perso") {
    const p = id ? PEOPLE[id] : null, c = id ? byId[id] : null;
    f = p ? { name: p.name, fac: p.fac, kanji: p.kanji || "", color: p.color || "#5ab0ff", tag: p.tag || c?.title || "", power: p.power || "", look: p.look || "", ep: epOfCfg(CONFIG, id), branche: p.branche || "" }
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
      ${fld("Branche en Confrontation", sel("branche", CR_BRANCHES))}${fld("Pouvoir", area("power", 220))}${fld("Apparence", area("look", 220))}${img}`;
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
      <div class="row cr-act"><button class="btn gold big" type="button" data-cr-save ${changed && !CR.busy ? "" : "disabled"}>${isNew ? "Publier" : "Publier les changements"}</button>
        <button class="btn" type="button" data-cr-cancel>Annuler</button>${canReset ? `<button class="btn" type="button" data-cr-reset>Remettre d'origine</button>` : ""}</div>
      <p class="note">Publié tout de suite pour tout le monde. L'autre membre de l'équipe reçoit une notification.</p></div>
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
  if (E.kind === "perso" && E.id && "ep" in data) delete data.ep; // l'épisode d'un perso existant se règle dans Admin (il reste modifiable ici pour un nouveau)
  CR.busy = true; draw();
  try {
    const r = await srv(reset ? "creations/reset" : "creations/save", reset ? { kind: E.kind, id: E.id } : { kind: E.kind, id: E.id, data, image: E.image || undefined });
    await creaApply(r);
    if (E.kind === "perso" && E.id && E.f.ep !== E.start.ep) await crSetEp(E.id, E.f.ep);
    toast(reset ? "Remis d'origine." : E.id ? "Changements publiés." : "Publié pour tout le monde !");
    if (E.kind === "carte") CR.who = r.cards?.[r.id]?.who || byId[r.id]?.who || CR.who;
    CR.edit = null;
  } catch (e) { toast(e.message); }
  CR.busy = false; draw();
}
// épisode d'un perso déjà dans le jeu : même réglage que la page Admin (config du jeu)
async function crSetEp(who, ep) { CONFIG.ep[who] = +ep; await saveConfig(); }

VIEWS.createur = viewCreateur;
ADMIN_SEG.crTab = (v) => { CR.tab = v; };
document.addEventListener("click", (e) => {
  const t = e.target;
  const n = t.closest("[data-cr-new]"); if (n) return crOpen(n.dataset.crNew, null);
  const ed = t.closest("[data-cr-edit]"); if (ed) return crOpen(ed.dataset.crEdit, ed.dataset.id);
  if (t.closest("[data-cr-cancel]")) { CR.edit = null; return draw(); }
  const sv = t.closest("[data-cr-save]"); if (sv) return sure(sv, "Toucher encore pour publier") && crSave(false);
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
