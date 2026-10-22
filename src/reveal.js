// ===== Dévoilement des cartes une par une (boosters, coffre, invocations) =====
// Une carte arrive face cachée (les Épiques et mieux « chargent »), un toucher la retourne avec un effet propre à
// sa rareté, le toucher suivant la range dans le plateau. Plusieurs effets par rareté, tirés en rotation : jamais
// deux fois le même d'affilée. Les cartes viennent du serveur : l'effet ne fait que les montrer.
const Reveal = (() => {
  const reducedNow = () => reduced || matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tierOf = (x) => (x.gold ? "gold" : ({ c: "low", pc: "low", r: "r", e: "e", l: "l", m: "m" })[x.c.rar]);
  const colOf = (x) => (x.gold ? "#f0c860" : RAR[x.c.rar].color);
  // le canvas ne lit pas var(--r-l) : on prend la vraie couleur
  const solid = (c) => (c.startsWith("var(") ? getComputedStyle(document.documentElement).getPropertyValue(c.slice(4, -1)).trim() || "#fff" : c);
  const VARIANTS = {
    low: ["eclat", "souffle", "poussiere"],
    r: ["onde", "eclairs", "prisme"],
    e: ["gerbe", "spirale", "fissures"],
    l: ["rayons", "pluie", "couronne"],
    m: ["eclipse", "tempete", "renaissance"],
    gold: ["pluie", "rayons", "gerbe"],
  };
  const DUR = { low: 450, r: 560, e: 680, l: 820, m: 900, gold: 820 };
  const last = {};
  // rotation : on tire parmi les effets de la rareté, sauf celui joué la dernière fois
  function pick(tier) {
    const all = VARIANTS[tier], pool = all.filter((v) => v !== last[tier]);
    const v = pool[Math.floor(Math.random() * pool.length)];
    last[tier] = v; return v;
  }
  let state = "idle", timers = [], raf = 0, parts = [], rays = null, rings = [], bolts = [], lastT = 0;
  const later = (ms, f) => { const t = setTimeout(f, reducedNow() ? 0 : ms); timers.push(t); return t; };
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  // ---------- particules et lumières (canvas) ----------
  const cv = () => $("rvFx");
  function loop(t) {
    const c = cv(); if (!c) { raf = 0; return; }
    const dt = Math.min(.05, (t - (lastT || t)) / 1000); lastT = t;
    const r = c.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1);
    if (c.width !== Math.round(r.width * d)) { c.width = Math.round(r.width * d); c.height = Math.round(r.height * d); }
    const g = c.getContext("2d"); g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, r.width, r.height);
    if (rays) { rays.t += dt; const a = Math.max(0, 1 - rays.t / rays.life); g.save(); g.translate(rays.x, rays.y); g.rotate(rays.t * .7);
      for (let i = 0; i < rays.n; i++) { g.rotate(Math.PI * 2 / rays.n); g.fillStyle = rays.c; g.globalAlpha = .22 * a; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.max(r.width, r.height), -16); g.lineTo(Math.max(r.width, r.height), 16); g.fill(); }
      g.restore(); if (a <= 0) rays = null; }
    for (const k of rings) { k.t += dt; const q = k.t / k.life; g.globalAlpha = Math.max(0, 1 - q); g.strokeStyle = k.c; g.lineWidth = 4 * (1 - q) + .5; g.beginPath(); g.arc(k.x, k.y, 20 + q * k.r, 0, 7); g.stroke(); }
    rings = rings.filter((k) => k.t < k.life);
    for (const b of bolts) { b.t += dt; g.globalAlpha = Math.max(0, 1 - b.t / .35); g.strokeStyle = b.c; g.lineWidth = 2.2; g.shadowColor = b.c; g.shadowBlur = 12; g.beginPath(); b.pts.forEach(([x, y], i) => g[i ? "lineTo" : "moveTo"](x, y)); g.stroke(); g.shadowBlur = 0; }
    bolts = bolts.filter((b) => b.t < .35);
    for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.grav ?? 200) * dt; p.vx *= .985; if (p.swirl) { const a = Math.atan2(p.y - p.cy, p.x - p.cx) + p.swirl * dt, rr = Math.hypot(p.x - p.cx, p.y - p.cy) + 60 * dt; p.x = p.cx + Math.cos(a) * rr; p.y = p.cy + Math.sin(a) * rr; }
      p.life -= dt; g.globalAlpha = Math.max(0, p.life / p.max); g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.s, 0, 7); g.fill(); }
    g.globalAlpha = 1; parts = parts.filter((p) => p.life > 0);
    raf = parts.length || rays || rings.length || bolts.length ? requestAnimationFrame(loop) : 0;
  }
  const kick = () => { if (!raf && !reducedNow()) { lastT = 0; raf = requestAnimationFrame(loop); } };
  const center = () => { const c = cv(), b = $("revealBtn"); if (!c || !b) return [0, 0]; const a = b.getBoundingClientRect(), r = c.getBoundingClientRect(); return [a.left + a.width / 2 - r.left, a.top + a.height / 2 - r.top]; };
  function burst(color, n, speed, size = 2.4, opts = {}) { if (reducedNow()) return; const [x, y] = center(); for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = speed * (.35 + Math.random() * .65); parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (opts.up || 40), life: opts.life || 1.1, max: opts.life || 1.1, s: size * (.6 + Math.random()), c: Array.isArray(color) ? color[i % color.length] : color, grav: opts.grav }); } kick(); }
  function rain(color, n) { if (reducedNow()) return; const r = cv().getBoundingClientRect(); for (let i = 0; i < n; i++) parts.push({ x: Math.random() * r.width, y: -10 - Math.random() * 200, vx: (Math.random() - .5) * 20, vy: 120 + Math.random() * 160, life: 2.2, max: 2.2, s: 2 + Math.random() * 2, c: color, grav: 90 }); kick(); }
  function spiral(color, n) { if (reducedNow()) return; const [x, y] = center(); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, rr = 30 + Math.random() * 30; parts.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr, vx: 0, vy: 0, grav: 0, cx: x, cy: y, swirl: 3.2, life: 1.3, max: 1.3, s: 2.4, c: color }); } kick(); }
  function rise(color, n) { if (reducedNow()) return; const [x, y] = center(); for (let i = 0; i < n; i++) parts.push({ x: x + (Math.random() - .5) * 220, y: y + 120 + Math.random() * 60, vx: (Math.random() - .5) * 15, vy: -60 - Math.random() * 80, grav: -10, life: 1.6, max: 1.6, s: 1.6, c: color }); kick(); }
  const ring = (color, r = 220, life = .7) => { if (reducedNow()) return; const [x, y] = center(); rings.push({ x, y, c: color, r, life, t: 0 }); kick(); };
  const ray = (color, life = 1.6, n = 12) => { if (reducedNow()) return; const [x, y] = center(); rays = { x, y, c: color, life, t: 0, n }; kick(); };
  function bolt(color, n = 3) { if (reducedNow()) return; const [x, y] = center(), r = cv().getBoundingClientRect(); for (let k = 0; k < n; k++) { const a = Math.random() * Math.PI * 2, len = Math.max(r.width, r.height) * .55, pts = [[x, y]]; let px = x, py = y; for (let i = 1; i <= 7; i++) { px = x + Math.cos(a) * len * i / 7 + (Math.random() - .5) * 40; py = y + Math.sin(a) * len * i / 7 + (Math.random() - .5) * 40; pts.push([px, py]); } bolts.push({ pts, c: color, t: 0 }); } kick(); }
  function flash(color, o = .7, ms = 520) { const f = $("rvFlash"); if (!f || reducedNow()) return; f.style.setProperty("--rc", color); f.animate([{ opacity: o }, { opacity: 0 }], { duration: ms, easing: "ease-out" }); }
  function title(text, color) { const t = $("rvTitle"); if (!t || reducedNow()) return; t.textContent = text; t.style.setProperty("--rc", color); t.animate([{ opacity: 0, transform: "scale(1.6)", letterSpacing: ".4em" }, { opacity: 1, transform: "scale(1)", letterSpacing: ".08em", offset: .25 }, { opacity: 1, offset: .75 }, { opacity: 0, transform: "scale(.96)" }], { duration: 1700, easing: "ease-out" }); }

  // ---------- les effets (appelés au milieu du retournement) ----------
  const FX = {
    eclat: (c) => { burst(["#fff", c], 16, 150, 2); },
    souffle: (c) => { ring("#ffffffaa", 160, .6); burst(c, 10, 110, 1.8); },
    poussiere: (c) => { rise(c, 26); burst("#fff", 8, 120, 1.6); },
    onde: (c) => { ring(c, 240); ring("#fff", 160, .5); burst(c, 34, 220); flash(c, .3); },
    eclairs: (c) => { bolt(c, 4); burst(["#fff", c], 30, 200); flash(c, .3); },
    prisme: (c) => { ring("#4d9bff", 220); setTimeout(() => ring("#2ee6ff", 240), 90); setTimeout(() => ring("#b072ff", 260), 180); burst(["#4d9bff", "#2ee6ff", "#fff"], 36, 220); },
    gerbe: (c) => { burst([c, "#fff", c], 80, 300, 2.6); flash(c, .5); },
    spirale: (c) => { spiral(c, 60); burst("#fff", 30, 180); flash(c, .45); },
    fissures: (c) => { bolt(c, 7); ring(c, 260); burst(c, 50, 260); flash(c, .5); },
    rayons: (c) => { ray(c, 1.8, 14); burst([c, "#fff"], 110, 340, 3); flash(c, .65); },
    pluie: (c) => { rain(c, 120); burst(c, 60, 280, 2.6); flash(c, .55); },
    couronne: (c) => { ring(c, 260, .9); setTimeout(() => ring("#fff", 300, .9), 140); burst([c, "#fff"], 100, 360, 3, { up: 160 }); flash(c, .6); },
    eclipse: (c) => { ray(c, 2.2, 16); burst([c, "#2ee6ff", "#fff"], 170, 440, 3.2); flash(c, .95, 700); },
    tempete: (c) => { bolt(c, 6); setTimeout(() => bolt("#2ee6ff", 5), 120); setTimeout(() => bolt("#fff", 4), 240); burst([c, "#2ee6ff"], 140, 420, 3); flash(c, .85, 650); },
    renaissance: (c) => { flash("#ffffff", .95, 500); spiral(c, 90); setTimeout(() => { ray(c, 1.8, 18); burst([c, "#fff", "#f0c860"], 150, 420, 3.2); }, 200); },
  };
  const TITLE = { l: "LÉGENDAIRE", m: "MYTHIQUE", gold: "DORÉE" };

  // ---------- rendu ----------
  const slotHTML = (x, i, filled) => `<span class="rv-slot ${filled ? "filled" : ""}" style="--rc:${filled ? colOf(x) : "transparent"}">${filled ? (x.cos ? `<b>${RAR[x.c.rar].label[0]}</b>` : thumb(x.c, "rv-th")) : ""}</span>`;
  function labelHTML(x) {
    return `<span class="rv-rar" style="--rc:${colOf(x)}">${x.gold ? "Dorée · " : ""}${RAR[x.c.rar].label}</span><span class="rv-who">${esc(itemName(x))}${x.cos ? "" : ` · ${esc(subOf(x.c))}`}</span>${x.isNew ? '<span class="rv-new">NOUVELLE</span>' : ""}`;
  }
  function render(el, o, top) {
    o.rvid ||= Math.random().toString(36).slice(2);
    const key = `${o.rvid}:${o.i}`;
    if (el.dataset.rv === key) { el.querySelector(".stage-top")?.replaceWith(Object.assign(document.createElement("div"), { innerHTML: top }).firstElementChild); return; }
    clearTimers(); state = "idle";
    const x = o.cards[o.i], t = tierOf(x), charge = ["e", "l", "m"].includes(t) || x.gold;
    el.innerHTML = `${top}<section class="stage rv rv-${t}" id="rvStage" style="--rc:${colOf(x)}">
      <canvas class="rv-fx" id="rvFx" aria-hidden="true"></canvas><div class="rv-flash" id="rvFlash" aria-hidden="true"></div><div class="rv-title" id="rvTitle" aria-hidden="true"></div>
      <div class="pdots">${o.cards.map((_, j) => `<i class="${j <= o.i ? "on" : ""}"></i>`).join("")}</div>
      ${o.divine && o.i === 0 ? '<div class="divine">Booster divin !</div>' : ""}
      <div class="reveal rv-deck"><button class="reveal-card ${o.flipped ? "on" : ""} ${charge && !o.flipped ? "charge" : ""}" type="button" id="revealBtn" aria-label="${o.flipped ? "Carte suivante" : "Retourner la carte"}"><div class="in">
          <div class="face"><div class="cardback rv-back"></div></div>
          <div class="face front">${o.flipped ? itemHTML(x) : ""}</div></div></button></div>
      <p class="hint rv-label ${o.flipped ? "show" : ""}" id="rvLabel" aria-live="polite">${o.flipped ? labelHTML(x) : `${o.pk.cos ? "Objet" : "Carte"} ${o.i + 1} sur ${o.cards.length} · touche pour la retourner`}</p>
      <div class="rv-tray" aria-label="Déjà retournées">${o.cards.map((c, j) => slotHTML(c, j, j < o.i)).join("")}</div>
      <button class="btn" type="button" data-act="skip">Tout voir</button></section>`;
    el.dataset.rv = key;
    if (!o.flipped && !reducedNow()) $("revealBtn").animate([{ transform: "translateY(50px) scale(.82)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 360, easing: "cubic-bezier(.2,1.2,.4,1)" });
  }
  // retourner : préparation (Mythique : tout s'éteint et la carte tremble), retournement, effet au milieu
  function flip(o) {
    const x = o.cards[o.i], t = tierOf(x), c = solid(colOf(x)), v = pick(t), btn = $("revealBtn"), st = $("rvStage");
    if (!btn) return; state = "anim";
    btn.classList.remove("charge"); btn.querySelector(".front").innerHTML = itemHTML(x);
    const pre = t === "m" && !reducedNow() ? 650 : 0;
    if (pre) { st.classList.add("rv-dark"); btn.classList.add("rv-shake"); }
    later(pre, () => {
      st.classList.remove("rv-dark"); btn.classList.remove("rv-shake");
      btn.style.setProperty("--fd", `${DUR[t]}ms`); btn.classList.add("on", "rv-lift"); btn.setAttribute("aria-label", "Carte suivante");
      later(DUR[t] / 2, () => { FX[v](c); if (TITLE[t]) title(TITLE[t], c); });
      later(DUR[t], () => { btn.classList.remove("rv-lift"); finishFlip(o); });
    });
    o.fx = v;
  }
  function finishFlip(o) {
    clearTimers(); const x = o.cards[o.i], btn = $("revealBtn"), L = $("rvLabel");
    o.flipped = true; state = "idle";
    if (btn) { btn.classList.add("on"); btn.classList.remove("charge", "rv-shake", "rv-lift"); btn.querySelector(".front").innerHTML ||= itemHTML(x); }
    $("rvStage")?.classList.remove("rv-dark");
    if (L) { L.innerHTML = labelHTML(x); L.classList.add("show"); }
    const art = btn?.querySelector(".kc-a"); if (art && !reducedNow()) art.animate([{ filter: "brightness(1.6)" }, { filter: "brightness(1)" }], { duration: 700 });
  }
  // suivante : la carte file se ranger dans le plateau
  function next(o) {
    const btn = $("revealBtn"), slot = document.querySelectorAll(".rv-tray .rv-slot")[o.i];
    const go = () => { if (o.i < o.cards.length - 1) { o.i++; o.flipped = false; } else o.phase = "done"; drawOpening(); };
    if (!btn || !slot || reducedNow()) return go();
    state = "anim";
    const a = btn.getBoundingClientRect(), b = slot.getBoundingClientRect();
    btn.animate([{ transform: "none", opacity: 1 }, { transform: `translate(${b.left + b.width / 2 - (a.left + a.width / 2)}px, ${b.top + b.height / 2 - (a.top + a.height / 2)}px) scale(${b.width / a.width})`, opacity: .4 }], { duration: 380, easing: "cubic-bezier(.5,0,.2,1)", fill: "forwards" }).finished.then(() => { state = "idle"; go(); });
  }
  // un toucher : retourne, ou range la carte ; pendant une animation, il la termine tout de suite
  function tap() {
    const o = opening; if (!o || o.phase !== "cards") return;
    if (state === "anim") { if (!o.flipped) { finishFlip(o); } return; }
    if (!o.flipped) flip(o); else next(o);
  }
  return { render, tap, stop() { clearTimers(); state = "idle"; parts = []; rays = null; rings = []; bolts = []; }, variants: VARIANTS };
})();
