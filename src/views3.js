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
  const r = local(); if (r.error) throw new Error(r.error); persist(); return r;
}
async function zBuy(id) {
  try { await zCall("shop/buy", { id }, () => buyCosmeticS(save, id)); toast(`${COS_BY_ID[id].name} ajouté à ton inventaire.`); draw(); }
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

// ===== Boutique Arcanique =====
function viewBoutique() {
  const list = COSMETICS.filter((c) => c.slot === zShopSlot);
  const own = cosOf(save).own;
  return `<div class="wrap page">${head("Boutique Arcanique · 店", "Boutique Arcanique", "Des cosmétiques pour tes cartes, sans aucun bonus de jeu. Achetés ici, ils sont à toi pour toujours et s'utilisent sur toutes tes cartes depuis l'Atelier.")}
    <div class="z-bar"><span>Essence : <b>${fmtN(save.chakra)} ◆</b></span><span class="note">Prix provisoires, en attente de validation.</span><button class="btn sm" type="button" data-nav="atelier">Ouvrir l'Atelier</button></div>
    ${seg("zShop", COS_SLOTS.map((s) => [s.id, s.label]), zShopSlot)}
    <div class="zgrid">${list.map((c) => {
      const owned = !!own[c.id], price = COS_PRICE[c.rar];
      const act = c.only === "sanctuaire" ? `<button class="btn sm" type="button" data-nav="sanctuaire">Sanctuaire uniquement</button>`
        : owned ? `<button class="btn sm" type="button" disabled>Possédé</button>`
        : `<button class="btn sm gold" type="button" data-zbuy="${c.id}" ${save.chakra < price ? "disabled" : ""}>Acheter · ${fmtN(price)} ◆</button>`;
      return zTile(c, act);
    }).join("")}</div></div>`;
}

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
  const tabs = utabs("zAt", [["design", "Personnaliser"], ["inv", "Inventaire", cos.inst.length + Object.keys(cos.own).length]], zAtelierTab);
  if (!zDraftCard) return `<div class="wrap page">${head("Atelier Arcanique · 飾", "Atelier Arcanique")}<p class="note">Ouvre d'abord un booster : il te faut une carte à personnaliser.</p></div>`;
  if (!zDraft) zDraft = { ...(cos.designs[zDraftCard] || {}) };
  const c = byId[zDraftCard], resolved = Object.fromEntries(Object.entries(zDraft).map(([k, r]) => [k, refCos(save, r)?.id]).filter(([, v]) => v));
  if (zAtelierTab === "inv") return `<div class="wrap page">${head("Atelier Arcanique · 飾", "Atelier Arcanique")}${tabs}${zInventory()}</div>`;
  const dirty = JSON.stringify(zDraft) !== JSON.stringify(cos.designs[zDraftCard] || {});
  return `<div class="wrap page">${head("Atelier Arcanique · 飾", "Atelier Arcanique", "Choisis une carte, essaie les cosmétiques de ton inventaire, puis enregistre son design. Il s'affiche partout : collection, profil, carte vedette.")}${tabs}
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

// ===== Sanctuaire des Invocations : Portail scellé (B + C) =====
// Le tirage est fait par le serveur AVANT l'animation ; l'animation ne fait que le révéler.
const ZR = { results: null, flipped: [], status: "idle" };
function viewSanctuaire() {
  const cos = cosOf(save);
  const rates = RANKS.map((r) => `<span><i style="background:${RAR[r].color}"></i>${RAR[r].label} ${String(SUMMON_RATES[r]).replace(".", ",")} %</span>`).join("");
  return `<div class="wrap page">${head("Sanctuaire des Invocations · 召", "Sanctuaire des Invocations", "Touche le portail scellé pour invoquer des cosmétiques uniques. Les invocations ne donnent jamais de personnages : ceux-là sortent des boosters.")}
    <div class="z-bar"><span>Essence : <b>${fmtN(save.chakra)} ◆</b></span><span>Mythique garantie dans <b>${Math.max(0, SUMMON_PITY_M - cos.sinceM)}</b> invocations</span></div>
    <div class="zsanct"><div id="sanctumHost" class="sanctum-host"></div>
      <div class="zs-side">
        <button class="btn gold big" type="button" data-zsum="1" ${save.chakra < summonCost(1) || ZR.status === "running" ? "disabled" : ""}>Invoquer ×1 · ${fmtN(summonCost(1))} ◆</button>
        <button class="btn acc big" type="button" data-zsum="5" ${save.chakra < summonCost(5) || ZR.status === "running" ? "disabled" : ""}>Invoquer ×5 · ${fmtN(summonCost(5))} ◆</button>
        <p class="note">×5 : au moins une Rare ou mieux. Chaque objet invoqué est une instance unique, que tu peux équiper à l'Atelier ou vendre avec ta carte.</p>
        <p class="eyebrow mut">Chances par objet (provisoires)</p><div class="zrates">${rates}</div>
        <label class="zopt-line"><input type="checkbox" id="zSkip" ${zSkipAnim ? "checked" : ""}> Passer l'animation</label>
      </div></div>
    ${ZR.results && ZR.status === "done" ? zResultsHTML() : ""}</div>`;
}
let zSkipAnim = false;
try { zSkipAnim = localStorage.getItem("rz-skip-summon") === "1"; } catch (e) {}
const zBest = (got) => got.reduce((a, x) => (RANKS.indexOf(x.rar) > RANKS.indexOf(a) ? x.rar : a), "c");
function zResultsHTML() {
  const got = ZR.results, multi = got.length > 1;
  const tiles = got.map((x, i) => { const c = COS_BY_ID[x.id], open = !multi || ZR.flipped[i];
    return open ? `<div class="zres" data-i="${i}">${zTile(c, "", " · instance unique")}</div>` : `<button class="zres zback" type="button" data-zflip="${i}" aria-label="Retourner l'objet ${i + 1}"><b>封</b></button>`; }).join("");
  const left = got.filter((_, i) => multi && !ZR.flipped[i]).length;
  return `<section class="sec zresults"><p class="eyebrow gold">${multi ? "Invocation ×5" : "Invocation"}</p><h2>${left ? "Retourne tes objets" : "Ajouté à ton inventaire"}</h2>
    <div class="zgrid ${multi ? "five" : "one"}">${tiles}</div>
    <div class="row">${left ? `<button class="btn" type="button" data-zflipnext>Retourner le suivant</button><button class="btn" type="button" data-zflipall>Tout révéler</button>` : `<button class="btn gold" type="button" data-nav="atelier">Équiper à l'Atelier</button>`}</div></section>`;
}
async function zSummon(n) {
  if (ZR.status === "running") return; // pas de double invocation
  ZR.status = "running"; draw();
  let r;
  try { r = await zCall("summon", { n }, () => summonS(save, n, Math.random)); }
  catch (e) { ZR.status = "idle"; toast(e.message); return draw(); }
  ZR.results = r.got; ZR.flipped = r.got.map(() => false);
  const done = () => { ZR.status = "done"; Portal.reset(); draw(); document.querySelector(".zresults")?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  if (zSkipAnim || matchMedia("(prefers-reduced-motion: reduce)").matches) return done();
  Portal.play(zBest(r.got), done);
}
function zFlip(i) {
  if (ZR.flipped[i]) return; ZR.flipped[i] = true;
  const r = ZR.results[i].rar;
  if (r === "l" || r === "m") { const h = $("sanctumHost"); h?.style.setProperty("--glow", RAR[r].color); h?.classList.remove("glowing"); void h?.offsetWidth; h?.classList.add("glowing"); }
  draw();
}

// --- le Portail scellé : canvas persistant, raccroché à la page après chaque rendu ---
const Portal = (() => {
  const host = document.createElement("div"); host.className = "sanctum"; host.tabIndex = 0; host.setAttribute("role", "button"); host.setAttribute("aria-label", "Toucher le portail pour invoquer");
  host.innerHTML = `<canvas></canvas><div class="sanctum-hand" aria-hidden="true"><svg viewBox="0 0 100 172"><defs><linearGradient id="zhg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".6" stop-color="var(--rare)" stop-opacity=".55"/><stop offset="1" stop-color="var(--rare)" stop-opacity="0"/></linearGradient></defs><g fill="url(#zhg)"><rect x="41" y="2" width="17" height="80" rx="8.5"/><rect x="58" y="44" width="16" height="46" rx="8"/><rect x="73" y="50" width="15" height="42" rx="7.5"/><rect x="86" y="58" width="12" height="36" rx="6"/><path d="M36 72h58q4 0 4 6v34q0 30-26 38H50q-22-4-24-30z"/><rect x="16" y="78" width="15" height="46" rx="7.5" transform="rotate(-32 23 100)"/><rect x="44" y="140" width="42" height="32" rx="6"/></g></svg></div><p class="sanctum-hint">Touche le portail</p>`;
  const cv = host.querySelector("canvas"), ctx = cv.getContext("2d"), hand = host.querySelector(".sanctum-hand");
  const RC = { c: "#b5b1bb", pc: "#3fbf7f", r: "#4d9bff", e: "#b072ff", l: "#f5c518", m: "#ff4d2e" };
  const TIER = { c: { k: .8 }, pc: { k: .8 }, r: { k: 1 }, e: { k: 1, ring: 1 }, l: { k: 1.12, ring: 1, rays: 1 }, m: { k: 1.35, ring: 2, rays: 1, shake: 1, burst: 2 } };
  const GL = ["召", "喚", "零", "界", "悪", "友", "匠", "季", "混", "神", "魂", "門"];
  const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), sg = (e, a, b) => cl((e - a) / (b - a)), eo = (t) => 1 - Math.pow(1 - t, 3), ei = (t) => t * t * t, mx = (a, b, t) => a + (b - a) * t;
  const hx = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)], ra = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`, lr = (a, b, t) => a.map((v, i) => Math.round(mx(v, b[i], t)));
  const WH = [255, 255, 255]; let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const stars = Array.from({ length: 90 }, () => ({ a: rnd() * Math.PI * 2, z: rnd() }));
  let W = 0, H = 0, parts = [], shards = [], cracks = [], run = null, raf = 0;
  const makeCracks = () => { cracks = Array.from({ length: 8 }, (_, k) => { let x = 0, y = 0; const pts = [[0, 0]], a0 = k / 8 * Math.PI * 2 + rnd() * .5; for (let i = 0; i < 4; i++) { const a = a0 + (rnd() - .5) * .9; x += Math.cos(a) * .27; y += Math.sin(a) * .27; pts.push([x, y]); } return pts; }); };
  makeCracks();
  const spawn = (n, f) => { for (let i = 0; i < n && parts.length < 200; i++) parts.push(f()); };
  const step = (cx, cy, col, pull) => { for (const p of parts) { if (pull) { const dx = cx - p.x, dy = cy - p.y, d = Math.hypot(dx, dy) + 1; p.vx += dx / d * pull / 60; p.vy += dy / d * pull / 60; if (d < 8) p.life = 0; } p.x += p.vx / 60; p.y += p.vy / 60; p.life -= 1 / 60; } parts = parts.filter((p) => p.life > 0); for (const p of parts) { ctx.fillStyle = ra(col, cl(p.life / p.max) * .9); ctx.fillRect(p.x, p.y, p.s, p.s); } };
  const flash = (a, c = WH) => { if (a > 0) { ctx.fillStyle = ra(c, a); ctx.fillRect(0, 0, W, H); } };
  function portalAt(cx, cy, open, rh, c, t, speed) {
    if (open < 2) return;
    ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, open, rh, 0, 0, Math.PI * 2); ctx.clip(); ctx.fillStyle = "#050409"; ctx.fillRect(0, 0, W, H);
    for (let k = 0; k < 7; k++) { const z = (k / 7 + t * speed * .4) % 1; ctx.strokeStyle = ra(c, z * .55); ctx.lineWidth = 1 + z * 2; ctx.beginPath(); ctx.ellipse(cx, cy, open * z * 1.1, rh * z * 1.1, 0, 0, Math.PI * 2); ctx.stroke(); }
    for (const s of stars) { const z = (s.z + t * speed * .5) % 1, r = z * z * Math.max(open, rh) * 1.3; ctx.fillStyle = ra(lr(c, WH, .4), z); ctx.fillRect(cx + Math.cos(s.a) * r * (open / rh), cy + Math.sin(s.a) * r, 1 + z * 2, 1 + z * 2); }
    ctx.restore(); ctx.strokeStyle = ra(c, .95); ctx.lineWidth = 3; ctx.shadowColor = ra(c, 1); ctx.shadowBlur = 24; ctx.beginPath(); ctx.ellipse(cx, cy, open, rh, 0, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0;
  }
  function makeShards(cx, cy, rx, ry) {
    const out = []; for (let i = 0; i < 12; i++) { const a0 = i / 12 * Math.PI * 2, a1 = (i + 1) / 12 * Math.PI * 2, am = (a0 + a1) / 2, P = (a, r) => [cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r];
      for (const [r0, r1] of [[0, .55], [.55, 1]]) { const pts = r0 ? [P(a0, r0), P(a0, r1), P(am, r1 * 1.02), P(a1, r1), P(a1, r0)] : [[cx, cy], P(a0, r1), P(am, r1), P(a1, r1)];
        const gx = pts.reduce((s, q) => s + q[0], 0) / pts.length, gy = pts.reduce((s, q) => s + q[1], 0) / pts.length, v = (r0 ? 300 : 180) + rnd() * 180;
        out.push({ pts: pts.map(([x, y]) => [x - gx, y - gy]), x: gx, y: gy, vx: Math.cos(am) * v, vy: Math.sin(am) * v - 40, vr: (rnd() - .5) * 8, inner: !r0 }); } }
    return out;
  }
  const HAND = .7, SW = 1.95;
  // une erreur de dessin ne doit jamais bloquer l'invocation : on passe directement au résultat
  function frame(nowMs) {
    try { draw1(nowMs); } catch (err) { raf = 0; ctx.setTransform(1, 0, 0, 1, 0, 0); if (run) { const cb = run.done; run = null; cb(); } }
  }
  function draw1(nowMs) {
    raf = 0;
    if (!host.isConnected || document.hidden) { if (run) raf = requestAnimationFrame(frame); return; }
    const r = host.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    if (Math.round(r.width * dpr) !== cv.width || Math.round(r.height * dpr) !== cv.height) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
    W = r.width; H = r.height; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const now = nowMs / 1000, rar = run ? run.rar : "r", T = TIER[rar], k = T.k, real = hx(RC[rar]);
    const eRun = run ? Math.max(0, now - run.t0) : null, idle = eRun == null, e = idle ? now : eRun;
    const cx0 = W / 2, cy0 = H / 2, R = Math.min(W, H) * .4, rh = R * .95, rx = R * .62;
    const t = idle || eRun < HAND ? .45 : .45 + (eRun - HAND) / k;
    // feinte : une Mythique se charge en violet, une Légendaire en bleu, puis tout bascule pendant la tension
    const fakeR = run && { m: "e", l: "r" }[rar]; let col = idle ? hx("#f5c518") : real, Tv = T;
    if (fakeR) { const q = sg(t, SW, SW + .12); col = lr(hx(RC[fakeR]), real, q); if (q < 1) Tv = { ...TIER[fakeR], k }; }
    host.style.setProperty("--rare", `rgb(${col.join(",")})`);
    if (fakeR && t > SW && t < SW + .3) ctx.translate((rnd() - .5) * 10, (rnd() - .5) * 10);
    const charge = sg(t, .45, 1.5), cracksP = sg(t, 1.2, 2), tension = sg(t, 1.8, 2.3), light = lr(col, WH, .6);
    if (Tv.shake && tension > 0 && t < 2.5) ctx.translate((rnd() - .5) * tension * 7, (rnd() - .5) * tension * 7);
    const sh = tension * 7 * (Tv.shake ? 1.8 : 1) + charge * 1.2, cx = cx0 + (rnd() - .5) * sh, cy = cy0 + (rnd() - .5) * sh;
    if (t < 2.3) {
      portalAt(cx, cy, rx, rh, col, e, mx(.5, 3, charge));
      ctx.save(); ctx.font = `700 ${R * .42}px "Zen Kaku Gothic New", sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.shadowColor = ra(col, 1); ctx.shadowBlur = 8 + charge * 30; ctx.fillStyle = ra(light, .25 + charge * .75); ctx.fillText("封", cx, cy); ctx.restore();
      for (let ri = 0; ri <= (Tv.ring || 0); ri++) { const n = 8 - ri * 2, ox = rx * (1.45 + ri * .22), oy = rh * (1.05 + ri * .08), sp = mx(.4, 4, ei(charge)) * (ri % 2 ? -1 : 1), al = idle ? .3 : sg(t, .3 + ri * .2, .8 + ri * .2);
        ctx.font = `700 ${Math.max(13, R * (.11 - ri * .015))}px "Zen Kaku Gothic New", sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        for (let i = 0; i < n; i++) { const a = e * sp + i / n * Math.PI * 2; ctx.fillStyle = ra(ri ? light : col, al * (Math.cos(a) > -.3 ? 1 : .5)); ctx.fillText(GL[(i * 3 + ri * 4) % 12], cx + Math.cos(a) * ox, cy + Math.sin(a) * oy); } }
      if (cracksP > 0) { ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, rx, rh, 0, 0, Math.PI * 2); ctx.clip(); ctx.strokeStyle = ra(lr(col, WH, .8), .95); ctx.lineWidth = 2; ctx.shadowColor = ra(col, 1); ctx.shadowBlur = 12;
        cracks.forEach((cr, j) => { const n = Math.floor(cl(cracksP * 1.4 - j * .05) * (cr.length - 1)); if (n < 1) return; ctx.beginPath(); for (let i = 0; i <= n; i++) ctx[i ? "lineTo" : "moveTo"](cx + cr[i][0] * rx * 1.3, cy + cr[i][1] * rh * .95); ctx.stroke(); }); ctx.restore(); }
      if (t > .5 && t < 2) spawn(3, () => { const a = rnd() * Math.PI * 2, rr = Math.max(W, H) * .55; return { x: cx0 + Math.cos(a) * rr, y: cy0 + Math.sin(a) * rr, vx: 0, vy: 0, life: 1.4, max: 1.4, s: 2 }; });
      step(cx0, cy0, col, t > .5 && t < 2 ? 380 : 0);
      if (t > 2.15 && !shards.length) shards = makeShards(cx0, cy0, rx, rh);
    } else {
      const u = t - 2.3;
      if (T.rays) { const a = cl(1 - u / .9); ctx.save(); ctx.translate(cx0, cy0); ctx.rotate(u * .6); for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.fillStyle = ra(light, .22 * a); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.max(W, H), -18); ctx.lineTo(Math.max(W, H), 18); ctx.closePath(); ctx.fill(); } ctx.restore(); }
      for (const s of shards) { const x = s.x + s.vx * u, y = s.y + s.vy * u + 200 * u * u; ctx.save(); ctx.translate(x, y); ctx.rotate(s.vr * u); ctx.globalAlpha = cl(1 - u / 1.1); ctx.fillStyle = s.inner ? "#0a0812" : ra(col, .55); ctx.strokeStyle = ra(light, .9); ctx.lineWidth = 1.4; ctx.beginPath(); s.pts.forEach(([px, py], i) => ctx[i ? "lineTo" : "moveTo"](px, py)); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
      const burst = (n) => spawn(n, () => { const a = rnd() * Math.PI * 2, v = 120 + rnd() * 340; return { x: cx0, y: cy0, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: .9, max: .9, s: 2.2 }; });
      if (u < .05) burst(70); if (T.burst === 2 && u > .14 && u < .2) burst(70);
      step(cx0, cy0, col, 0);
    }
    if (idle) { const q = (now * .6) % 1; ctx.strokeStyle = ra(col, .5 * (1 - q)); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx0, cy0, mx(R * .12, R * .45, q), 0, Math.PI * 2); ctx.stroke(); }
    else if (eRun > .5 && eRun < 1.3) { const q = sg(eRun, .5, 1.3); for (const d of [0, .18]) { const qq = cl(q - d); if (qq <= 0) continue; ctx.strokeStyle = ra(lr(col, WH, .6), .9 * (1 - qq)); ctx.lineWidth = 3 * (1 - qq) + .5; ctx.beginPath(); ctx.ellipse(cx0, cy0, mx(8, rx * 1.5, eo(qq)), mx(8, rh * 1.15, eo(qq)), 0, 0, Math.PI * 2); ctx.stroke(); } }
    if (fakeR && t > SW && t < SW + .55) { const q = sg(t, SW, SW + .55); ctx.strokeStyle = ra(lr(real, WH, .3), 1 - q); ctx.lineWidth = 6 * (1 - q) + 1; ctx.beginPath(); ctx.ellipse(cx0, cy0, mx(rx * .3, rx * 2.2, eo(q)), mx(rh * .3, rh * 1.6, eo(q)), 0, 0, Math.PI * 2); ctx.stroke(); flash(.3 * (1 - q), real); }
    if (!idle) flash(t > 2.22 ? Math.sin(sg(t, 2.22, 2.55) * Math.PI) * (T.burst === 2 ? .4 : .85) : 0, T.burst === 2 ? lr(col, WH, .45) : WH);
    if (run && t >= 2.55 + .15) { const cb = run.done; run = null; cb(); }
    raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
  host.addEventListener("click", () => { if (ZR.status !== "running" && save.chakra >= summonCost(1)) zSummon(1); });
  host.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); host.click(); } });
  return {
    host,
    attach(el) { if (el && host.parentNode !== el) el.appendChild(host); host.classList.toggle("busy", ZR.status === "running"); kick(); },
    play(rar, done) {
      parts = []; shards = []; makeCracks();
      let finished = false; const once = () => { if (!finished) { finished = true; clearTimeout(guard); run = null; done(); } };
      const guard = setTimeout(once, 9000); // filet : onglet en arrière-plan, appareil très lent
      run = { rar, t0: performance.now() / 1000, done: once };
      // la main monte et touche le sceau
      hand.style.setProperty("--reach", `${hand.offsetHeight - host.clientHeight / 2}px`);
      hand.classList.remove("touch"); void hand.offsetWidth; hand.classList.add("touch"); kick();
    },
    reset() { run = null; parts = []; shards = []; hand.classList.remove("touch"); },
  };
})();

// --- branchement : rendu, menu, clics ---
VIEWS.boutique = viewBoutique; VIEWS.atelier = viewAtelier; VIEWS.sanctuaire = viewSanctuaire;
function afterViews() {
  if (view === "sanctuaire") Portal.attach($("sanctumHost"));
}
const Z_SEG = { zShop: (v) => { zShopSlot = v; }, zAt: (v) => { zAtelierTab = v; }, zInv: (v) => { zInvSlot = v; } };
document.addEventListener("click", (e) => {
  const t = e.target;
  const b = t.closest("[data-zbuy]"); if (b) { b.disabled = true; return zBuy(b.dataset.zbuy); }
  const s = t.closest("[data-zset]"); if (s) { const sl = s.dataset.zset, ref = s.dataset.ref; if (ref) zDraft[sl] = ref; else delete zDraft[sl]; return draw(); }
  if (t.closest("[data-zsave]")) return zSaveDesign();
  if (t.closest("[data-zclear]")) { zDraft = {}; return draw(); }
  const f = t.closest("[data-zfeat]"); if (f) return zFeature(f.dataset.zfeat || null);
  const sm = t.closest("[data-zsum]"); if (sm) return zSummon(+sm.dataset.zsum);
  const fl = t.closest("[data-zflip]"); if (fl) return zFlip(+fl.dataset.zflip);
  if (t.closest("[data-zflipnext]")) { const i = ZR.flipped.findIndex((x) => !x); if (i >= 0) zFlip(i); return; }
  if (t.closest("[data-zflipall]")) { ZR.flipped = ZR.flipped.map(() => true); return draw(); }
});
document.addEventListener("change", (e) => {
  if (e.target.id === "zCard") { zDraftCard = e.target.value; zDraft = null; nav("atelier", zDraftCard); }
  if (e.target.id === "zSkip") { zSkipAnim = e.target.checked; try { localStorage.setItem("rz-skip-summon", zSkipAnim ? "1" : "0"); } catch (err) {} }
});
