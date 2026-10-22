// ===== Interface façon Kyara : navigation, cartes, pages =====
const ROUTES = ["dev", "boosters", "collection", "wiki", "carte", "market", "missions", "pred", "classement", "profil", "raretes", "regles", "infos", "nouveautes", "avis", "admin"];
let param = null;
function nav(v, p = null) {
  if (opening && opening.phase !== "done") return toast("Finis d'ouvrir ton booster d'abord.");
  const h = "#/" + v + (p ? "/" + encodeURIComponent(p) : "");
  if (location.hash !== h) location.hash = h; else route();
}
function route() {
  const [v, p] = location.hash.replace(/^#\/?/, "").split("/");
  view = ROUTES.includes(v) ? v : "boosters";
  param = p ? decodeURIComponent(p) : null;
  closeMenu(); toggleNotifs(false); $("overlay").hidden = true;
  draw(); scrollTo({ top: 0 });
}
addEventListener("hashchange", route);

// --- petits outils d'affichage ---
const fmtN = (n) => (+n || 0).toLocaleString("fr-FR");
const LETTER = { c: "C", pc: "U", r: "R", e: "E", l: "L", m: "M" };
const noOf = (id) => `#${String(CATALOG_NO[id] || 0).padStart(4, "0")}/${String(ALL_CARDS.length).padStart(4, "0")}`;
const hashOf = (s) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
const hueOf = (who) => hashOf(who) % 360;
const POW = { c: [52, 9], pc: [64, 9], r: [76, 9], e: [86, 7], l: [93, 5], m: [97, 3] }, AURA = { c: [38, 6], pc: [44, 6], r: [51, 6], e: [58, 7], l: [66, 7], m: [80, 7] };
const statsOf = (c) => { const h = hashOf(c.id); return [POW[c.rar][0] + (h % POW[c.rar][1]), AURA[c.rar][0] + ((h >> 5) % AURA[c.rar][1])]; };
const imgKey = (c) => (c.img && ART[c.img] ? c.img : ART[c.who] ? c.who : PHOTO[c.who] ? c.who : null);
function artIn(c) {
  const k = imgKey(c);
  if (!k) return `<div class="mono-a">${initials(PEOPLE[c.who].name)}</div>`;
  return `<div class="who-${k}" style="position:absolute;inset:0"><div class="${ART[k] ? "layer" : "photo"}" style="${c.pos ? `--pos:${c.pos};` : ""}${c.zoom > 1 ? `transform:scale(${c.zoom});` : ""}"></div></div>`;
}
const thumb = (c, cls = "th") => `<span class="${cls}">${c && imgKey(c) ? artIn(c) : ""}</span>`;
const nameOf = (c) => PEOPLE[c.who].name;
// chroma : une couleur nommée par perso, comme les chromas de LoL
const CHROMAS = [["Rubis", "#e0314b"], ["Émeraude", "#1fae6a"], ["Saphir", "#2f6bff"], ["Améthyste", "#9b4dff"], ["Ambre", "#f0a020"], ["Obsidienne", "#3b3846"], ["Perle", "#cfc6b4"], ["Turquoise", "#18b8c2"]];
const chromaOf = (who) => CHROMAS[hashOf(who) % CHROMAS.length];
const subOf = (c) => (c.skin === "chroma" ? `Chroma ${chromaOf(c.who)[0]}` : c.title);
// décor d'une carte personnalisée (Atelier Arcanique) : classes et éléments ajoutés, jamais par-dessus le visage
const FOND_BG = {
  nuit: (c) => `radial-gradient(1px 1px at 20% 30%, #fff9 50%, transparent), radial-gradient(1px 1px at 70% 20%, #fff7 50%, transparent), radial-gradient(1.5px 1.5px at 40% 75%, #fff8 50%, transparent), radial-gradient(1px 1px at 85% 60%, #fff6 50%, transparent), linear-gradient(170deg, ${c.c2}, ${c.c1} 70%)`,
  degrade: (c) => `linear-gradient(170deg, ${c.c2}, ${c.c1} 72%)`,
  aurore: (c) => `linear-gradient(160deg, transparent 20%, ${c.c2}55 35%, transparent 50%, ${c.c2}33 65%, transparent 80%), linear-gradient(175deg, ${c.c1}, #05080c)`,
  washi: (c) => `repeating-linear-gradient(95deg, #ffffff08 0 2px, transparent 2px 7px), linear-gradient(170deg, ${c.c2}, ${c.c1} 75%)`,
};
function cosDeco(design, present) {
  if (!design) return null;
  const C = (sl) => (design[sl] ? COS_BY_ID[design[sl]] : null), f = C("cadre"), a = C("aura"), o = C("orn"), h = C("holo"), pa = C("part"), fo = C("fond"), pr = C("pres");
  const kc = [], wrap = [], style = [];
  const base = fo ? FOND_BG[fo.k](fo) : "linear-gradient(170deg, color-mix(in srgb, var(--rc) 26%, #17161d), color-mix(in srgb, var(--rc) 10%, #0e0d12) 70%)";
  if (f) { kc.push("cz-cadre", "cz-cadre-" + f.k); style.push(`--zf1:${f.c1};--zf2:${f.c2}`, `background:${base} padding-box, ${f.k === "prisme" ? `conic-gradient(from var(--zang, 0deg), ${f.c1}, #ffd24d, ${f.c2}, #8a4dff, ${f.c1})` : `linear-gradient(135deg, ${f.c1}, ${f.c2} 45%, ${f.c1} 70%, ${f.c2})`} border-box`); }
  else if (fo) style.push(`background:${base}`);
  if (a) { wrap.push("cz-aura", "cz-aura-" + a.k); style.push(`--za:${a.c1}`); }
  if (pr && present) wrap.push("cz-pres", "cz-pres-" + pr.k);
  const orn = o ? `<span class="cz-orn cz-orn-${o.k}" style="--zo:${o.c1}" aria-hidden="true">${o.k === "kanji" ? "零" : o.k === "etoile" ? "★" : o.k === "couronne" ? '<svg viewBox="0 0 40 22"><path d="M2 20L5 4l9 9 6-11 6 11 9-9 3 16z" fill="currentColor"/><circle cx="20" cy="3" r="2.4" fill="#fff6"/></svg>' : ""}</span>` : "";
  // la couleur de l'aura va sur le cadre extérieur (.kcw), qui dessine le halo
  return { za: a ? a.c1 : null, kc: kc.join(" "), wrap: wrap.join(" "), style: style.join(";"), holo: h ? `<span class="cz-holo cz-holo-${h.k}" aria-hidden="true"></span>` : "", part: pa ? `<span class="cz-part cz-part-${pa.k}" style="--zp:${pa.c1}" aria-hidden="true"></span>` : "", orn };
}
// carte au format Kyara : nom + lettre de rareté, image numérotée, sous-titre, POW / AURA
function cardHTML(c, o = {}) {
  const soon = !!o.soon, locked = soon || !!o.locked, [pw, au] = statsOf(c), p = PEOPLE[c.who];
  const dz = soon || locked ? null : cosDeco(o.design, o.present);
  return `<div class="kcw ${dz ? dz.wrap : ""}" ${o.click ? `data-card="${c.id}" tabindex="0" role="button"` : ""} style="${o.w ? `--w:${o.w}px;` : ""}${dz?.za ? `--za:${dz.za};` : ""}">${dz ? dz.orn : ""}<div class="kc r-${c.rar} ${dz ? dz.kc : ""} ${o.gold ? "gold" : ""} ${locked ? "locked" : ""} ${soon ? "soon" : ""} ${c.skin ? `skin sk-${c.skin}` : ""}"
    style="${c.skin ? `--hue:${hueOf(c.who)}deg;--h:${(hueOf(c.who) + 200) % 360};--chr:${chromaOf(c.who)[1]};` : ""}${dz ? dz.style : ""}" aria-label="${soon ? "Carte secrète" : `${p.name}, ${c.title}, ${RAR[c.rar].label}${o.gold ? ", dorée" : ""}${locked ? ", pas encore obtenue" : ""}`}">
    ${o.tag ? `<span class="kc-tag">${o.tag}</span>` : ""}
    <div class="kc-h"><b>${soon ? "???" : esc(p.name)}</b><i>${LETTER[c.rar]}</i></div>
    <div class="kc-a">${soon ? "" : artIn(c)}${c.skin && !soon ? `<span class="skx"></span>${c.skin === "chroma" ? '<i class="kc-sw"></i>' : ""}` : ""}${dz ? dz.holo : ""}${soon ? "" : `<span class="kc-jp">${p.kanji || ""}</span>`}<span class="kc-no">${noOf(c.id)}</span>${soon || locked ? "" : brTag(c.id)}</div>${dz ? dz.part : ""}
    <div class="kc-s">${soon ? "Bientôt dans l'anime" : esc(subOf(c))}</div>
    <div class="kc-p"><span>POW ${soon ? "??" : pw}</span><span>AURA ${soon ? "??" : au}</span></div>
    ${o.isNew ? '<span class="kc-new">Nouveau</span>' : o.count > 1 ? `<span class="kc-n">×${o.count}</span>` : ""}
  </div></div>`;
}
const myDesign = (id) => (has(id) ? designOfS(save, id) : null);
const cardFor = (c, o = {}) => cardHTML(c, { design: myDesign(c.id), ...o, soon: !visible(c), locked: !has(c.id) });
const icon = {
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  discord: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.6 1.3a18.3 18.3 0 0 0-5.5 0L8.6 3a19.7 19.7 0 0 0-4.9 1.5C.6 9.1-.3 13.6.1 18a19.9 19.9 0 0 0 6 3l1.3-2a12.9 12.9 0 0 1-2-1l.5-.4a14.2 14.2 0 0 0 12.2 0l.5.4c-.6.4-1.3.7-2 1l1.3 2a19.8 19.8 0 0 0 6-3c.5-5.1-.8-9.6-3.6-13.6ZM8 15.3c-1.2 0-2.2-1.1-2.2-2.4S6.8 10.5 8 10.5s2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4Z"/></svg>',
};
const dia = '<span class="dia f"></span>';
const head = (eb, title, lead = "") => `<div class="head"><p class="eyebrow">${eb}</p><h1>${title}</h1>${lead ? `<p class="lead">${lead}</p>` : ""}</div>`;
const seg = (name, items, cur, cls = "") => `<div class="seg ${cls}" role="tablist">${items.map(([k, l, dot]) => `<button type="button" data-seg="${name}" data-v="${k}" aria-pressed="${cur === k}">${l}${dot ? '<i class="dot"></i>' : ""}</button>`).join("")}</div>`;
const utabs = (name, items, cur) => `<div class="utabs" role="tablist">${items.map(([k, l, n]) => `<button type="button" data-seg="${name}" data-v="${k}" aria-pressed="${cur === k}">${l}${n ? `<i class="badge">${n}</i>` : ""}</button>`).join("")}</div>`;
const rarChips = (name, cur) => `<div class="chips">${[["", "Toutes"], ...RANKS.map((k) => [k, RAR[k].label])].map(([k, l]) => `<button class="chip" type="button" data-seg="${name}" data-v="${k}" aria-pressed="${cur === k}">${k ? `<i class="d" style="background:${RAR[k].color}"></i>` : ""}${l}</button>`).join("")}</div>`;
const av = (uid, cls = "") => `<img class="${cls}" data-uid="${uid}" alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">`;
const nm = (uid) => `<b data-uid="${uid}">…</b>`;
// titre choisi par un joueur (le sien vient de la sauvegarde, les autres du classement partagé)
const shownTitleOf = (uid) => TITLE_BY_ID[uid && uid === ME ? save.titleShown : shared.players.find((p) => p.uid === uid)?.title] || null;
const ttagOf = (t, cls = "") => (t ? `<span class="ttag r-${t.rar} ${cls}" title="${esc(t.desc)}"><i>${t.kanji}</i>${esc(t.name)}</span>` : "");
const ttag = (uid, cls) => ttagOf(shownTitleOf(uid), cls);
const who = (uid) => `<button class="who" type="button" data-nav="profil" data-p="${uid}">${av(uid)}${nm(uid)}</button>`;
const empty = (txt, btn = "") => `<div class="empty"><div class="o"></div>${txt}${btn ? `<div style="margin-top:14px">${btn}</div>` : ""}</div>`;
const titleOf = (unique) => unique >= ALL_CARDS.length ? ["神", "Légende"] : unique >= 90 ? ["達人", "Maître"] : unique >= 50 ? ["鑑定士", "Expert"] : unique >= 20 ? ["熟", "Confirmé"] : ["初", "Débutant"];

// --- en-tête, menu ---
let menuOpen = false;
const MENU = () => [
  ["boosters", "札", "Boosters"], ["collection", "集", "Collection"], ["market", "市", "Marché", pendingTrades().length],
  ["missions", "務", "Missions", toClaim()], ...(featureOn(CONFIG, "defile") ? [["defile", "華", "Défilé"]] : []), ...(featureOn(CONFIG, "confrontation") ? [["confront", "対", "Confrontation"]] : []), ...(featureOn(CONFIG, "boutique") ? [["boutique", "店", "Boutique"]] : []), ...(featureOn(CONFIG, "sanctuaire") ? [["sanctuaire", "召", "Sanctuaire"]] : []), ["atelier", "飾", "Atelier"], ["pred", "予", "Prédictions", openPredCount(), "gold"], ["wiki", "典", "Wiki"],
  ["classement", "順", "Classement"], ["avis", "声", "Avis et bugs"], ...(IS_ADMIN ? [["admin", "管", "Admin"], ["createur", "創", "Créateur"], ["branches", "枝", "Branches"], ["galerie", "図", "Galerie"], ["labo", "験", "Labo"]] : []), ...(IS_DEV ? [["dev", "技", "Dev"]] : []),
];
const openPredCount = () => pred.questions.filter((q) => q.status === "open" && pred.mine[q.id] == null).length;
function drawNav() {
  const cur = (v) => (view === v || (v === "wiki" && view === "carte") ? 'aria-current="page"' : "");
  // barre du bas (téléphone) : les 5 endroits où l'on va le plus
  const tb = $("tabbar"), tabs = [["boosters", "札", "Boosters"], ["collection", "集", "Collection"], ["market", "市", "Marché", pendingTrades().length],
    featureOn(CONFIG, "confrontation") ? ["confront", "対", "Combat"] : ["pred", "予", "Prédictions", openPredCount()], ["profil", "我", "Profil", 0, "moi"]];
  if (tb) tb.innerHTML = tabs.map(([v, k, l, n, p]) => `<button type="button" data-nav="${v}" ${p ? `data-p="${p}"` : ""} ${view === v ? 'aria-current="page"' : ""}><b aria-hidden="true">${k}</b>${l}${n ? `<i class="badge">${n}</i>` : ""}</button>`).join("");
  $("nav").innerHTML = `<a href="#/boosters" ${cur("boosters")}>Boosters</a><a href="#/collection" ${cur("collection")}>Collection</a><a href="#/market" ${cur("market")}>Marché</a>
    <a href="#/pred" class="ev" ${cur("pred")}>予 Prédictions${openPredCount() ? ` · ${openPredCount()}` : ""}</a>
    <div class="dd"><button type="button" id="moreBtn" aria-expanded="false">Plus <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 3l4 4 4-4" stroke="currentColor" fill="none" stroke-width="1.6"/></svg></button>
      <div class="dd-menu" id="moreMenu" hidden>${[["wiki", "典", "Wiki"], ["classement", "順", "Classement"], ["raretes", "稀", "Raretés"], ["regles", "規", "Règles"], ["infos", "報", "Infos"], ["nouveautes", "新", "Nouveautés"], ["avis", "声", "Avis et bugs"], ...(IS_ADMIN ? [["admin", "管", "Admin"]] : []), ...(IS_DEV ? [["dev", "技", "Dev"]] : [])].map(([v, k, l]) => `<a href="#/${v}"><i>${k}</i>${l}</a>`).join("")}</div></div>`;
}
let ACCT = null;
async function loadAccount() {
  if (window.DISCORD_LOGIN) ACCT = await window.discordMe();
  else if (USER) { const m = await USER.me().catch(() => null); ACCT = m ? { id: m.id, name: m.name, avatar: m.avatarUrl, admin: IS_ADMIN, member: canShare } : null; }
  drawAvatar(); if (menuOpen) drawMenu();
  loadStyles();
}
// style de Confrontation de chacune de mes cartes (le serveur ne donne que celles que j'ai)
let MY_BR = {};
async function loadStyles() {
  if (!SRV || !featureOn(CONFIG, "confrontation")) return;
  try { await cfCat(); MY_BR = (await srv("confront/mes-styles")).cartes || {}; if (!opening) draw(); } catch (e) {}
}
const brTag = (id) => { const b = MY_BR[id]; return b ? `<span class="kc-br" title="Style en Confrontation : ${esc(cfBranch(b).nom)}">${cfEmb(b, "sm")}</span>` : ""; };
function drawAvatar() {
  const a = ACCT;
  $("avImg").outerHTML = a?.avatar ? `<img id="avImg" src="${esc(a.avatar)}" alt="">` : `<span id="avImg">${a?.name ? esc(a.name[0].toUpperCase()) : "I"}</span>`;
}
function drawMenu() {
  const a = ACCT, st = stats();
  const guest = !a, nameTxt = a?.name || "Invité";
  $("menu").innerHTML = `<div class="acc-card">
    <div class="acc-top"><span class="ring-av">${a?.avatar ? `<img src="${esc(a.avatar)}" alt="">` : `<span>${esc(nameTxt[0].toUpperCase())}</span>`}</span>
      <div><b>${esc(nameTxt)}</b><small>${guest ? "Compte invité" : a.dev ? "Dev · développeur du jeu" : a.admin ? "Admin · créateur de l'anime" : a.member ? "Membre du QG de Shinjuku" : "Pas membre du serveur"}</small></div></div>
    ${guest && window.DISCORD_LOGIN ? `<div class="disc-box">Lie ton compte Discord pour ne pas perdre ta collection et jouer avec le QG.<a class="btn-disc" href="/auth/login">${icon.discord}Se connecter avec Discord</a></div>` : ""}
    ${guest && !window.DISCORD_LOGIN ? `<div class="disc-box">Ta collection est gardée dans ce navigateur. Pour jouer avec le QG, ouvre la version en ligne avec ton compte Discord.</div>` : ""}
    <div class="acc-stats"><div><small>Essence</small><b>${fmtN(save.chakra)}</b></div><div><small>Cartes</small><b>${st.unique}</b></div><div><small>Pitié M</small><b>${save.sinceMythic}/${MYTHIC_PITY}</b></div></div>
  </div>
  <div class="mgrid">${MENU().map(([v, k, l, n, cls]) => `<button type="button" class="${cls || ""}" data-nav="${v}" ${view === v ? 'aria-current="page"' : ""}><i>${k}</i>${l}${n ? `<i class="badge">${n}</i>` : ""}</button>`).join("")}</div>
  <div class="m-foot">${SRV || ME ? `<button type="button" data-nav="profil" data-p="${ME}">Mon profil public</button>` : `<button type="button" data-nav="profil" data-p="moi">Mon profil</button>`}
    ${window.DISCORD_LOGIN && a ? `<a href="/auth/logout">Se déconnecter</a>` : `<button type="button" data-nav="infos">Infos sur le jeu</button>`}</div>`;
}
function toggleMenu(force) {
  menuOpen = force ?? !menuOpen;
  $("menu").hidden = !menuOpen; $("menuBtn").setAttribute("aria-expanded", menuOpen);
  $("menuBtn").innerHTML = menuOpen ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg><i class="dot" id="menuDot" hidden></i>';
  if (menuOpen) { toggleNotifs(false); drawMenu(); }
  header();
}
const closeMenu = () => { if (menuOpen) toggleMenu(false); };
function header() {
  $("wFree").textContent = `${save.free}/${FREE_MAX}`;
  $("wGauge").style.width = Math.min(100, save.free / FREE_MAX * 100) + "%";
  $("wChakra").textContent = fmtN(save.chakra);
  const n = toClaim(), mb = $("mBadge"); mb.hidden = !n; mb.textContent = n;
  const dot = !!(n || pendingTrades().length || openPredCount());
  if ($("menuDot")) $("menuDot").hidden = !dot;
  $("avDot").hidden = !dot;
  badges();
}

// --- tâches à faire (cloche) ---
function todos() {
  const out = [];
  if (save.dailyPack !== dayKey()) out.push({ text: "Ton pack du jour t'attend.", go: "boosters" });
  const n = toClaim(); if (n) out.push({ text: `${n} récompense${n > 1 ? "s" : ""} à récupérer dans Missions.`, go: "missions" });
  if (save.free >= FREE_MAX) out.push({ text: "Tes boosters gratuits sont pleins : ouvre-les pour qu'ils se rechargent.", go: "boosters" });
  const p = SRV ? pendingTrades().length : 0; if (p) out.push({ text: `${p} échange${p > 1 ? "s" : ""} attend${p > 1 ? "ent" : ""} ta réponse.`, go: "trades" });
  const q = openPredCount(); if (q) out.push({ text: `${q} prédiction${q > 1 ? "s" : ""} attend${q > 1 ? "ent" : ""} ton vote.`, go: "pred" });
  return out;
}
function drawNotifs() {
  const box = $("notifPanel"); if (!box) return;
  const td = todos();
  const login = window.DISCORD_LOGIN ? `<a href="/auth/login">Connecte-toi avec Discord</a> pour être prévenu` : "Sur le site du QG (connexion Discord), tu es prévenu";
  box.innerHTML = `<div class="np-head"><b>Notifications</b>${notif.unread ? `<button class="linkbtn" type="button" data-act="notif-read">Tout marquer lu</button>` : ""}</div>
    ${td.length ? `<div class="np-sec">À faire</div>${td.map((x) => `<button class="np-item" type="button" data-ngo="${x.go}"><i class="np-ic todo">!</i><span>${esc(x.text)}</span></button>`).join("")}` : ""}
    <div class="np-sec">Récent</div>
    ${SRV ? (notif.items.length ? notif.items.map((n) => `<button class="np-item ${n.id > notif.read ? "unread" : ""}" type="button" data-ngo="${n.data?.go || (n.data?.chat ? "chat" : "")}"><i class="np-ic k-${n.kind}">${NICON[n.kind] || "•"}</i><span>${esc(n.text)}<small>${ago(n.ts)}</small></span></button>`).join("")
      : `<p class="note">Rien pour l'instant. Tes ventes, échanges, mentions et les nouveaux épisodes arriveront ici.</p>`)
      : `<p class="note">${login} de tes ventes, échanges, mentions et des nouveaux épisodes.</p>`}
    ${"Notification" in window ? `<button class="btn sm" type="button" data-act="notif-push">${pushOn() ? "Notifications de l'appareil : activées" : "Activer les notifications sur cet appareil"}</button>` : ""}`;
}

// ===== Accueil =====
let heroIdx = 0, packTab = "free", heroT = null;
function heroSlides() {
  const out = [];
  const dp = dailyPack(), done = save.dailyPack === dayKey() || dp.closed;
  out.push({ cls: "", eb: "Pack du jour · gratuit", title: dp.name.replace("Pack du jour · ", ""), txt: "Un booster offert chaque jour, thème différent, Épique garantie.",
    btns: `<button class="btn gold big" type="button" data-act="open-day" ${done ? "disabled" : ""}>${done ? "Reviens demain" : "Ouvrir le pack du jour"}</button><button class="btn big" type="button" data-act="see-pack" data-p="jour">Voir le booster</button>`,
    pool: poolFor(dp, CONFIG, ME) });
  if (limitedOn()) { const days = Math.ceil((LIMITED_END - Date.now()) / 86400e3), pk = packOf("saison1");
    out.push({ cls: "acc", eb: `Édition limitée · plus que ${days} j`, title: "Saison 1", txt: "Tous les persos déjà apparus dans l'anime, avec deux fois plus de chances de Légendaire et de Mythique.",
      btns: `<button class="btn acc big" type="button" data-act="open-pack" data-p="saison1" ${save.free ? "" : "disabled"}>Ouvrir · gratuit</button><button class="btn big" type="button" data-act="see-pack" data-p="saison1">Voir le booster</button>`, pool: poolOf(pk) }); }
  const oq = pred.questions.filter((q) => q.status === "open");
  out.push({ cls: "vio", eb: `Prédictions · épisode ${Math.max(2, ...pred.questions.map((q) => q.ep))}`, title: "Prédis la suite", txt: oq.length ? `${oq.length} question${oq.length > 1 ? "s" : ""} ouverte${oq.length > 1 ? "s" : ""}. Chaque bonne réponse rapporte jusqu'à ${Math.max(...oq.map(predRewardOf))} ◆, fixés par Billy.` : "Billy publie les questions après chaque épisode. Les bonnes réponses rapportent de l'essence.",
    btns: `<button class="btn vio big" type="button" data-nav="pred">Faire mes prédictions</button>`, pool: CARDS.filter(canPack) });
  return out;
}
function heroHTML() {
  const sl = heroSlides(); heroIdx %= sl.length; const s = sl[heroIdx];
  const top = [...s.pool].filter((c) => !c.skin || true).sort((a, b) => RAR[b.rar].rank - RAR[a.rar].rank || hashOf(a.id) - hashOf(b.id)).slice(0, 3);
  // toujours trois cartes en éventail : on complète avec les plus belles cartes débloquées
  for (const c of CARDS.filter(canPack).sort((a, b) => RAR[b.rar].rank - RAR[a.rar].rank)) { if (top.length >= 3) break; if (!top.includes(c)) top.push(c); }
  const fan = [top[1], top[0], top[2]].filter(Boolean);
  return `<section class="hero ${s.cls}" id="hero">
    <div class="hero-fan">${fan.map((c) => cardHTML(c)).join("")}</div>
    <div class="hero-t"><p class="eyebrow">${s.eb}</p><h2 class="big">${s.title}</h2><p>${s.txt}</p><div class="row">${s.btns}</div></div>
    <div class="dots">${sl.map((_, i) => `<button type="button" data-hero="${i}" aria-label="Diapo ${i + 1}" aria-pressed="${i === heroIdx}"></button>`).join("")}</div>
  </section>`;
}
function qsHTML() {
  const st = streakState(), n = toClaim();
  const next = save.free < FREE_MAX ? `prochain dans ${fmtWait(REGEN - (Date.now() - save.freeTs))}` : "réserve pleine";
  return `<div class="qs">
    <div style="--c:var(--acc)"><span class="k">箱</span><b>${save.free}/${FREE_MAX}</b><span>gratuits · ${next}</span></div>
    <button type="button" data-nav="missions" style="--c:var(--ok)"><span class="k">務</span><b>${n}</b><span>récompense${n > 1 ? "s" : ""} à récupérer</span>${n ? '<span class="act">Récupérer</span>' : ""}</button>
    <button type="button" ${st.canClaim ? 'data-claim="streak"' : 'data-nav="missions"'} style="--c:var(--r-e)"><span class="k">連</span><b>J${st.n}/7</b><span>connexion à la suite</span>${st.canClaim ? '<span class="act">Récupérer</span>' : ""}</button>
    <div style="--c:var(--gold)"><span class="k">金</span><b>${Math.max(0, GOLD_EVERY - save.sinceGold)}</b><span>avant le booster doré</span></div>
    <div style="--c:var(--acc)"><span class="k">神</span><b>${Math.max(0, MYTHIC_PITY - save.sinceMythic)}</b><span>avant Mythique sûre</span></div>
  </div>`;
}
function packsForTab() {
  if (packTab === "day") return [dailyPack(), ...packsNow().filter((p) => p.limited)];
  return packsNow().filter((p) => !p.limited);
}
function bstHTML(p) {
  return `<div class="bst ${p.skins || p.base === "coffre" ? "coffre" : ""}" style="--pc:${p.color}"><span class="brand"><i>零</i>RE ZÉRO</span><span class="emb">${p.kanji}</span><span class="nm">${p.daily ? p.name.replace("Pack du jour · ", "") : p.name}</span><span class="sub">${p.daily ? "Pack du jour" : p.sub.split(" · ")[0]}</span><span class="n5">${p.count || PACK} ${p.cos ? "objets" : "cartes"}</span></div>`;
}
function selPack() {
  const list = packsForTab();
  const id = packTab === "day" ? (save.packDay || "jour") : save.pack;
  return list.find((p) => p.id === id) || list[0];
}
function boosterZone() {
  const list = packsForTab(), pk = selPack(), pool = poolOf(pk), k = pk.boost || 1;
  const dayDone = save.dailyPack === dayKey(), shop = packTab === "shop";
  // booster thématique pas encore ouvert : arrive avec un prochain épisode
  const opensAt = (p) => packOpensAt(p, CONFIG, ME), soon = (p) => (opensAt(p) ? `Épisode ${opensAt(p)}` : "Bientôt");
  const label = (p) => !packOpen(p) ? soon(p) : p.daily ? (dayDone ? "Demain" : "Gratuit") : p.limited ? "Limité" : shop ? `${PRICE} ◆` : "Gratuit";
  const fill = packOpen(pk) ? mixFillOf(pk, CONFIG, ME) : [];
  let btn;
  if (!packOpen(pk)) btn = `<button class="bigopen" type="button" disabled><b>${pk.daily ? "Indisponible" : "Bientôt"}</b><span>${pk.daily ? "Aucun booster n'est encore ouvert" : opensAt(pk) ? `Arrive avec l'épisode ${opensAt(pk)}` : "Pas encore assez de persos"}</span></button>`;
  else if (pk.daily) btn = `<button class="bigopen" type="button" data-act="open-day" ${dayDone ? "disabled" : ""}><b>Ouvrir</b><span>${dayDone ? "Déjà ouvert · reviens demain" : "Gratuit · 1 par jour"}</span></button>`;
  else if (shop) btn = `<button class="bigopen acc" type="button" data-act="open-pack" data-p="${pk.id}" data-paid="1" ${save.chakra < PRICE ? "disabled" : ""}><b>Acheter</b><span>${PRICE} ◆ · tu as ${fmtN(save.chakra)} ◆</span></button>`;
  else btn = `<button class="bigopen" type="button" data-act="open-pack" data-p="${pk.id}" ${save.free ? "" : "disabled"}><b>Ouvrir</b><span>${save.free ? `Gratuit · ${save.free} restant${save.free > 1 ? "s" : ""}` : `Prochain dans ${fmtWait(REGEN - (Date.now() - save.freeTs))}`}</span></button>`;
  // 2 boosters d'un coup : 10 cartes dans le coffre
  if (packOpen(pk) && !pk.daily && !(shop && pk.limited)) btn += shop
    ? `<button class="bigopen two acc" type="button" data-act="open-pack" data-p="${pk.id}" data-paid="1" data-n="2" ${save.chakra < PRICE * 2 ? "disabled" : ""}><b>Acheter 2 · coffre</b><span>${fmtN(PRICE * 2)} ◆ · 10 cartes</span></button>`
    : `<button class="bigopen two" type="button" data-act="open-pack" data-p="${pk.id}" data-n="2" ${save.free >= 2 ? "" : "disabled"}><b>Ouvrir 2 · coffre</b><span>${save.free >= 2 ? "10 cartes" : "2 gratuits requis"}</span></button>`;
  return `<section class="sec" id="boosters">
    <div class="sec-h"><h2>Choisis ton booster</h2></div>
    ${seg("packTab", [["free", "Gratuits"], ["day", "Du jour & limités", save.dailyPack !== dayKey()], ["shop", "Boutique"]], packTab, "gold")}
    <div class="boost-zone">
      <div class="packrail">${list.map((p) => `<button class="pk" type="button" data-pick="${p.id}" aria-pressed="${p.id === pk.id}">${bstHTML(p)}<span class="lbl ${p.limited ? "lim" : ""}">${label(p)}</span></button>`).join("")}</div>
      <div class="pkd" style="--pc:${pk.color}">
        <div class="pkd-h"><span class="e">${pk.kanji}</span><div><h3>${pk.daily ? pk.name.replace("Pack du jour · ", "") : pk.name}</h3><p>${pk.sub}</p></div></div>
        <div class="mini4"><div><b>${PACK}</b><span>cartes par booster</span></div><div><b style="color:var(--r-${pk.daily ? "e" : "r"})">${pk.daily ? "Épique" : "Rare"}</b><span>ou mieux, garantie</span></div>
          <div><b style="color:var(--acc)">${Math.max(0, MYTHIC_PITY - save.sinceMythic)}</b><span>avant Mythique sûre</span></div><div><b style="color:var(--gold)">${Math.max(0, GOLD_EVERY - save.sinceGold)}</b><span>avant le doré</span></div></div>
        <button class="btn sq block" type="button" data-act="pool" data-p="${pk.id}" style="border-color:#f5c51855;background:#f5c5180d">Voir les ${pool.length} persos</button>
        <p class="eyebrow mut" style="margin-top:4px">Chance par booster</p>
        <div class="odds">${["r", "e", "l", "m"].map((r) => { const v = packChance(r, k, pk.daily ? DAILY_LAST : LAST); return `<span class="n" style="color:${RAR[r].color}"><i></i>${RAR[r].label}</span><span class="m"><i style="width:${Math.max(1.5, v * 100)}%;background:${RAR[r].color};color:${RAR[r].color}"></i></span><span class="p">${pct(v)}</span>`; }).join("")}</div>
        ${fill.length ? `<p class="note">Pas encore de ${fill.map((r) => RAR[r].label).join(", ")} dans ce booster : ces raretés viennent du Mix, avec les mêmes chances.</p>` : ""}
        ${btn}
      </div>
    </div>
  </section>`;
}
function feedCard(f) {
  const c = byId[f.card]; if (!c) return "";
  const vis = visible(c), rc = f.gold ? "#f0c860" : RAR[c.rar].color;
  return `<div class="pull"><div class="ph-card ${vis ? "" : "soon"}" style="--rc:${rc}" ${vis ? `data-card="${c.id}"` : ""}>${vis ? `${artIn(c)}<em>${f.gold ? "Dorée" : RAR[c.rar].label}</em><b>${esc(nameOf(c))}</b>` : "?"}</div>${who(f.uid)}<span class="tm">${ago(f.t)}</span></div>`;
}
function lrowHTML(l) {
  const c = byId[l.card]; if (!c) return "";
  const vis = visible(c);
  return `<button class="lrow" type="button" data-listing="${l.id}">${thumb(vis ? c : null)}<div><b>${vis ? esc(nameOf(c)) : "???"}</b><span class="r" style="color:${RAR[c.rar].color}">${RAR[c.rar].label}${l.gold ? " · dorée" : ""}</span><div class="pr">${fmtN(l.price)} ${dia}</div><span class="st" style="color:var(--ok)">En vente</span></div></button>`;
}
function podiumHTML(list, val, unit) {
  const [a, b, c] = list;
  const pod = (p, i) => p ? `<button class="pod p${i}" type="button" data-nav="profil" data-p="${p.uid}"><span class="rav">${av(p.uid)}<span class="ttl">${titleOf(p.unique || 0)[0]}</span></span><span class="nm" data-uid="${p.uid}">…</span>${TITLE_BY_ID[p.title] ? ttagOf(TITLE_BY_ID[p.title], "sm") : ""}<span class="sc">${unit(p)}</span>
    <span class="ped"><span class="no">${i}</span><b>${fmtN(val(p))}</b><small>${unit.short || ""}</small></span></button>` : "<span></span>";
  return `<div class="podium">${pod(b, 2)}${pod(a, 1)}${pod(c, 3)}</div>`;
}
function viewBoosters() {
  const feed = shared.feed.slice(0, 12);
  const listings = shared.market.filter((l) => l.status === "open" && byId[l.card]).slice(0, 4);
  const top = [...shared.players].sort((a, b) => (b.unique ?? b.cards) - (a.unique ?? a.cards) || (b.mythics || 0) - (a.mythics || 0));
  const unit = (p) => `${fmtN(p.unique ?? p.cards)} cartes · ${p.mythics || 0} M`; unit.short = "cartes";
  const rv = shared.avis || [], avg = rv.length ? rv.reduce((a, r) => a + r.stars, 0) / rv.length : 0;
  return `<div class="wrap page">
    ${heroHTML()}
    ${qsHTML()}
    ${hallHTML()}
    <div class="steps">
      <div><b>01</b><h3>Ouvre tes boosters</h3><p>Des boosters gratuits se rechargent toute la journée. L'essence en débloque d'autres, et le pack du jour est offert.</p></div>
      <div><b>02</b><h3>Complète les factions</h3><p>Chaque faction de l'anime est un album. Les doublons s'échangent au marché ou se recyclent en essence.</p></div>
      <div><b>03</b><h3>Prédis la suite</h3><p>Vote sur ce qui va se passer dans le prochain épisode. Billy récompense chaque bonne réponse en essence.</p></div>
    </div>
    ${boosterZone()}
    <section class="sec"><div><p class="eyebrow"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--acc);margin-right:8px"></span>En direct · Légendaires et Mythiques</p><h2 style="margin-top:6px">Gros tirages</h2></div>
      ${feed.length ? `<div class="rail">${feed.map(feedCard).join("")}</div>` : empty("Personne n'a encore sorti de Légendaire. À toi de jouer.")}</section>
    <section class="sec"><div><h2>Au marché en ce moment</h2><button class="link" type="button" data-nav="market" style="margin-top:6px">Tout le marché</button></div>
      ${listings.length ? `<div class="lst-grid">${listings.map(lrowHTML).join("")}</div>` : empty("Rien en vente pour l'instant.")}</section>
    <section class="sec"><div><h2>Top collectionneurs</h2><button class="link" type="button" data-nav="classement" style="margin-top:6px">Classement complet</button></div>
      ${top.length ? podiumHTML(top, (p) => p.unique ?? p.cards, unit) : empty("Le classement apparaît dès que des joueurs ouvrent des boosters.")}</section>
    <section class="sec"><h2>Ce qu'en disent les joueurs</h2>
      ${rv.length ? `<div class="rating"><b>${avg.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}</b><span class="stars">${"★".repeat(Math.round(avg))}${"☆".repeat(5 - Math.round(avg))}</span><span class="mono mut" style="font-size:13px">${rv.length} avis</span></div>
        <div class="lst-grid">${rv.slice(0, 4).map(reviewHTML).join("")}</div>` : `<p class="note">Pas encore d'avis.</p>`}
      <button class="link" type="button" data-nav="avis" style="color:var(--fg2)">Donner ton avis</button></section>
  </div>`;
}
const reviewHTML = (r) => `<div class="rv"><div class="rv-h">${av(r.uid)}<div>${nm(r.uid)}<span class="stars" style="font-size:13px">${"★".repeat(r.stars)}${"☆".repeat(5 - r.stars)}</span></div><time>${new Date(r.t).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</time></div>${r.text ? `<p>${esc(r.text)}</p>` : ""}</div>`;

// ===== Collection =====
const col = { tab: "cards", rar: "", fac: "", own: "own", sort: "num", q: "" };
const FAC_SKINS = "skins";
const facOf = (c) => (c.skin ? FAC_SKINS : PEOPLE[c.who].fac);
const facLabel = (f) => (f === FAC_SKINS ? "Skins du QG" : FACTIONS[f].label);
const FACS = () => [...Object.keys(FACTIONS), FAC_SKINS];
function facProgress(f) { const list = ALL_CARDS.filter((c) => facOf(c) === f); return [list.filter((c) => has(c.id)).length, list.length]; }
function viewCollection() {
  const st = stats(), dupes = Object.values(save.owned).reduce((a, o) => a + Math.max(0, o.n - 1) + Math.max(0, o.gold - (o.n ? 0 : 1)), 0), dv = dupesValue();
  const q = col.q.trim().toLowerCase();
  let list = ALL_CARDS.filter((c) => (!col.rar || c.rar === col.rar) && (!col.fac || facOf(c) === col.fac)
    && (col.own === "all" || (col.own === "own" ? has(c.id) : !has(c.id)))
    && (!q || (visible(c) && (nameOf(c) + " " + c.title + " " + facLabel(facOf(c))).toLowerCase().includes(q))));
  list.sort(col.sort === "rar" ? (a, b) => RAR[b.rar].rank - RAR[a.rar].rank || CATALOG_NO[a.id] - CATALOG_NO[b.id] : col.sort === "name" ? (a, b) => nameOf(a).localeCompare(nameOf(b)) : (a, b) => CATALOG_NO[a.id] - CATALOG_NO[b.id]);
  const bars = FACS().map((f) => [f, ...facProgress(f)]);
  return `<div class="wrap page">
    ${head("Album · コレクション", "Ma collection")}
    <div class="bigstats"><div><b>${st.unique}<small>/${ALL_CARDS.length}</small></b><span>Cartes uniques</span></div><div class="acc"><b>${Math.round(st.unique / ALL_CARDS.length * 100)} %</b><span>Complétion</span></div><div><b>${dupes}</b><span>Doublons</span></div></div>
    <div class="row"><button class="btn sq" type="button" data-act="recycle" ${dv ? "" : "disabled"}>♻ Recycler les doublons${dv ? ` · +${dv} ◆` : ""}</button>
      <button class="btn sq" type="button" data-act="craft" ${craftableDupes(save).length >= CRAFT_COST ? "" : "disabled"}>✦ Combiner ${CRAFT_COST} doublons → 1 skin</button>
      ${SRV ? `<button class="btn sq" type="button" data-act="wish-all">♡ Manquantes en envies</button>` : ""}</div>
    <div class="sbars">${bars.map(([f, n, t]) => `<button class="sbar" type="button" data-seg="colFac" data-v="${f}"><span>${facLabel(f)}</span><span class="m"><i style="width:${n / t * 100}%"></i></span><span class="v">${n}/${t}</span></button>`).join("")}</div>
    <div class="search">${icon.search}<input class="in" id="colQ" type="search" placeholder="Rechercher un perso ou une faction…" value="${esc(col.q)}"></div>
    ${seg("colTab", [["cards", "Cartes"], ["albums", "Albums"]], col.tab, "light")}
    ${col.tab === "albums" ? albumsHTML() : `
    ${rarChips("colRar", col.rar)}
    <div class="flt"><label>Faction<select class="in" data-sel="colFac"><option value="">Toutes</option>${FACS().map((f) => `<option value="${f}" ${col.fac === f ? "selected" : ""}>${facLabel(f)}</option>`).join("")}</select></label>
      <label>Cartes<select class="in" data-sel="colOwn">${[["own", "Possédées"], ["missing", "Manquantes"], ["all", "Toutes"]].map(([k, l]) => `<option value="${k}" ${col.own === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>
      <label>Tri<select class="in" data-sel="colSort">${[["num", "Numéro"], ["rar", "Rareté"], ["name", "Nom"]].map(([k, l]) => `<option value="${k}" ${col.sort === k ? "selected" : ""}>${l}</option>`).join("")}</select></label></div>
    ${list.length ? `<p class="mono mut" style="margin:0;font-size:13px">${list.length} carte${list.length > 1 ? "s" : ""}</p><div class="cgrid">${list.map((c) => { const o = own(c.id); return cardHTML(c, { soon: !visible(c), locked: !has(c.id), gold: !o.n && o.gold > 0, count: o.n + o.gold, click: true, design: myDesign(c.id) }); }).join("")}</div>`
      : empty(col.own === "own" && !stats().unique ? "Aucune carte pour l'instant. Ouvre ton premier booster !" : "Aucune carte ne correspond à ces filtres.", `<button class="btn sq" type="button" data-act="reset-col">Réinitialiser les filtres</button>`)}`}
  </div>`;
}
function albumsHTML() {
  return `<div class="albums">${FACS().map((f) => {
    const list = ALL_CARDS.filter((c) => facOf(c) === f), [n, t] = facProgress(f), shown = list.filter((c) => has(c.id)).slice(0, 2);
    return `<button class="alb ${n === t ? "full" : ""}" type="button" data-album="${f}"><span class="stack">${[0, 1].map((i) => thumb(shown[i])).join("")}</span><span style="flex:1;min-width:0"><b>${facLabel(f)}</b><small>${n}/${t} cartes${n === t ? " · complet ✦" : ""}</small><span class="m" style="display:block"><i style="width:${n / t * 100}%"></i></span></span></button>`;
  }).join("")}</div>`;
}

// ===== Wiki : tous les persos =====
function viewWiki() {
  return `<div class="wrap page">
    ${head("Wiki · 図鑑", "Les persos de l'anime", "Chaque perso apparu dans Re Zéro : LoL. Obtiens sa carte pour débloquer sa fiche complète : pouvoir, apparence, caractère, citations et cote au marché.")}
    ${Object.entries(FACTIONS).map(([f, F]) => { const list = CARDS.filter((c) => c.who === c.id && PEOPLE[c.who].fac === f || (c.id.endsWith("-1") && PEOPLE[c.who].fac === f && !CARDS.some((x) => x.id === c.who)));
      return `<section class="sec"><div class="sec-h"><h2 style="color:${F.color}">${F.label}</h2><span class="mono mut" style="font-size:13px">${list.filter((c) => visible(c)).length}/${list.length} connus</span></div>
        <div class="cgrid">${list.map((c) => cardFor(c, { click: true })).join("")}</div></section>`; }).join("")}
  </div>`;
}

// ===== Fiche d'un perso =====
let sheetSeen = 0;
function noteSheet() {
  if (Date.now() - sheetSeen < 4000) return; sheetSeen = Date.now();
  if (SRV) srv("seen").catch(() => {}); else { track("sheet"); persist(); }
}
function salesOf(id, days) { const since = Date.now() - days * 86400e3; return shared.market.filter((l) => l.card === id && l.status === "sold" && !l.gold && (l.soldAt || l.t) > since); }
function chartSVG(sales) {
  if (sales.length < 2) return `<p class="note">Pas encore assez de ventes pour tracer la courbe.</p>`;
  const pts = [...sales].sort((a, b) => (a.soldAt || a.t) - (b.soldAt || b.t)), xs = pts.map((l) => l.soldAt || l.t), ys = pts.map((l) => l.price);
  const x0 = Math.min(...xs), x1 = Math.max(...xs) || x0 + 1, y0 = 0, y1 = Math.max(...ys) * 1.15, W = 600, H = 170;
  const X = (x) => 10 + (x - x0) / (x1 - x0 || 1) * (W - 70), Y = (y) => H - 18 - (y - y0) / (y1 - y0 || 1) * (H - 36);
  const d = pts.map((l, i) => `${i ? "L" : "M"}${X(xs[i]).toFixed(1)},${Y(ys[i]).toFixed(1)}`).join(" "), med = median(ys);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Prix des ventes"><defs><linearGradient id="cg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#b072ff" stop-opacity=".45"/><stop offset="1" stop-color="#b072ff" stop-opacity="0"/></linearGradient></defs>
    <path d="${d} L${X(x1).toFixed(1)},${H - 18} L${X(x0).toFixed(1)},${H - 18} Z" fill="url(#cg)"/><path d="${d}" fill="none" stroke="#b072ff" stroke-width="2.5"/>
    ${pts.map((l, i) => `<circle cx="${X(xs[i]).toFixed(1)}" cy="${Y(ys[i]).toFixed(1)}" r="3.5" fill="#15141a" stroke="#b072ff" stroke-width="2"/>`).join("")}
    <line x1="0" x2="${W - 60}" y1="${Y(med)}" y2="${Y(med)}" stroke="#edeae4" stroke-dasharray="4 5" stroke-opacity=".6"/><text x="${W - 56}" y="${Y(med) + 4}" fill="#edeae4" font-size="12" font-family="JetBrains Mono">méd. ${med}</text></svg>`;
}
function marketBlock(id, title = "Cote de la carte") {
  const s7 = salesOf(id, 7), s30 = salesOf(id, 30), open = shared.market.filter((l) => l.card === id && l.status === "open");
  const m7 = median(s7.map((l) => l.price)), m30 = median(s30.map((l) => l.price));
  return `<div class="card sec"><p class="eyebrow mut">Marché</p><h3>${title}</h3>
    <div class="kv3"><div><small>Médiane 7 j</small><b>${m7 ? `${fmtN(m7)} ◆` : "—"}</b></div><div><small>Médiane 30 j</small><b>${m30 ? `${fmtN(m30)} ◆` : "—"}</b></div><div><small>Ventes 30 j</small><b>${s30.length}</b></div></div>
    ${chartSVG(s30)}
    ${open.length ? `<button class="btn sq" type="button" data-act="market-for" data-p="${id}">Voir les ${open.length} annonce${open.length > 1 ? "s" : ""} · dès ${fmtN(Math.min(...open.map((l) => l.price)))} ◆</button>` : `<p class="note">Aucune annonce en ce moment.</p>`}</div>`;
}
function viewCard() {
  const c = byId[param];
  if (!c) return `<div class="wrap page">${empty("Cette carte n'existe pas.", `<button class="btn" type="button" data-nav="wiki">Retour au wiki</button>`)}</div>`;
  if (!visible(c)) return `<div class="wrap page">${head("Wiki", "???", "Ce perso arrive dans un prochain épisode. Sa fiche se débloque quand Billy ouvre l'épisode.")}<div class="wk-card">${cardHTML(c, { soon: true, w: 240 })}</div></div>`;
  noteSheet();
  const o = own(c.id), p = PEOPLE[c.who], got = o.n + o.gold > 0, f = FACTIONS[p.fac], R = RAR[c.rar];
  const quotes = [p.quote, ...(MORE[c.who] || [])].filter(Boolean);
  const chance = packChance(c.rar) / Math.max(1, (c.skin ? SKINS : CARDS).filter((x) => x.rar === c.rar && canPack(x)).length), per = c.skin ? "coffre" : "booster";
  const same = ALL_CARDS.filter((x) => x.id !== c.id && (c.skin ? x.who === c.who : !x.skin && PEOPLE[x.who].fac === p.fac)).slice(0, 12);
  const open = shared.market.filter((l) => l.card === c.id && l.status === "open");
  const row = (k, v) => (v ? `<dt>${k}</dt><dd>${v}</dd>` : "");
  return `<div class="wk-head"><span class="ghost">${p.kanji || ""}</span><div class="wrap head">
      <div class="crumb"><button type="button" data-nav="wiki">Wiki</button><i>/</i><button type="button" data-nav="collection">${c.skin ? "Skins du QG" : f.label}</button><i>/</i><span style="color:var(--fg)">${esc(p.name)}</span></div>
      <div class="row"><span class="pill acc">${c.skin ? "Skins du QG" : f.label}</span><span class="pill out" style="border-color:${R.color};color:${R.color}">${R.label}</span><span class="pill box">${got ? `Possédée ×${o.n + o.gold}` : "Non possédée"}</span>${wishSet().has(c.id) && !got ? '<span class="pill box" style="color:var(--wish);border-color:var(--wish)">♥ Dans tes envies</span>' : ""}</div>
      <h1>${esc(p.name)}</h1><p class="mono mut" style="margin:0">${p.kanji || ""} · ${noOf(c.id)} · ${esc(c.title)}</p></div></div>
    <div class="wrap page" style="padding-top:28px">
    <div class="wk-grid">
      <div class="wk-card card">${cardHTML(c, { locked: !got, gold: !o.n && o.gold > 0, design: myDesign(c.id) })}
        <div class="row" style="justify-content:space-between;width:100%"><span style="color:${R.color};font-weight:700;font-size:14px">${R.label} · ${got ? "possédée" : "non possédée"}</span><span class="mono mut" style="font-size:13px">${pct(chance)} / ${per}</span></div>
        <div class="row" style="width:100%">
          ${got ? `${DB && canShare ? `<button class="btn acc sm" type="button" data-sell="${c.id}">Vendre</button>` : ""}
            ${SRV ? `<button class="btn sm" type="button" data-show="${c.id}">${(save.showcase || []).includes(c.id) ? "★ Retirer de la vitrine" : "☆ Vitrine"}</button>` : ""}
            <button class="btn sm" type="button" data-nav="atelier" data-p="${c.id}">飾 Personnaliser</button>
            ${o.n + o.gold > 1 ? `<button class="btn sm" type="button" data-dis="${c.id}" data-gold="${o.n > 1 ? "" : 1}">Désenchanter · +${cardValue(c.id, !(o.n > 1))} ◆</button>` : ""}
            ${canChat() ? `<button class="btn sm" type="button" data-act="chat-show" data-p="${c.id}">Montrer au comptoir</button>` : ""}
            <button class="btn sm" type="button" data-share="${c.id}" data-gold="${!o.n && o.gold ? 1 : ""}">Partager</button>`
          : `<button class="btn gold sm" type="button" data-nav="boosters">Ouvrir un booster</button>${open.length ? `<button class="btn sm" type="button" data-act="market-for" data-p="${c.id}">Acheter dès ${fmtN(Math.min(...open.map((l) => l.price)))} ◆</button>` : ""}
            ${SRV ? `<button class="btn sm" type="button" data-wish="${c.id}">${wishSet().has(c.id) ? "♥ Retirer de mes envies" : "♡ Ajouter à mes envies"}</button>` : ""}`}
        </div></div>
      <div class="sec">
        ${got ? `<div class="card"><dl class="facts">
          ${MY_BR[c.id] ? `<dt>Style en Confrontation</dt><dd class="kc-brd">${cfEmb(MY_BR[c.id], "sm")} <b>${esc(cfBranch(MY_BR[c.id]).nom)}</b> · ${esc(cfBranch(MY_BR[c.id]).pouvoir || "")}</dd>` : ""}
          ${row("Pouvoir", esc(p.power))}${row("Apparence", esc(p.look))}${row("Caractère", esc(p.mood))}
          <dt>Apparitions</dt><dd>${epOf(c.who) < HIDDEN ? `Re Zéro : LoL · épisode ${epOf(c.who)}` : "Bientôt dans l'anime"}${APPEARS[c.who] ? ` · ${APPEARS[c.who]}` : ""}</dd>
          ${quotes.length ? `<dt>Citations</dt><dd class="quotes">${quotes.map((q) => `<q>${esc(q)}</q>`).join("")}</dd>` : ""}
          <dt>Exemplaires</dt><dd>${o.n} normale${o.n > 1 ? "s" : ""} · ${o.gold} dorée${o.gold > 1 ? "s" : ""}</dd>
          <dt>Recyclage</dt><dd>${R.chakra} ◆ (dorée : ${R.chakra * 3} ◆)</dd>
          ${o.first ? `<dt>Obtenue le</dt><dd>${new Date(o.first).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</dd>` : ""}
        </dl></div>`
        : `<div class="card dash gate"><span class="lk">${icon.lock}</span><div><h3>Fiche verrouillée</h3><p class="note" style="margin-top:6px">Obtiens la carte ${esc(p.name)} dans un booster pour débloquer sa fiche complète : pouvoir, apparence, caractère, apparitions et citations.</p><p class="note" style="margin-top:6px">${R.label} · ${pct(chance)} de chance par ${per}.</p></div></div>`}
        ${marketBlock(c.id)}
      </div>
    </div>
    <section class="sec"><p class="eyebrow mut">${c.skin ? "Même perso" : "Même faction"}</p><h2>${c.skin ? `Autres skins de ${esc(p.name)}` : `Autres persos · ${f.label}`}</h2>
      <div class="cgrid">${same.map((x) => cardFor(x, { click: true })).join("")}</div></section>
  </div>`;
}
