// ===== Arène 3D de Confrontation =====
// Affiche la vraie partie (vue filtrée du serveur) dans une arène Three.js, par-dessus la page.
// Le serveur décide de tout : l'arène rejoue les événements du journal en animations et propose
// les actions légales (glisser une carte sur un champion, la toucher, réagir). Sans WebGL, ou si
// le joueur le préfère, la vue classique (views6) reste disponible.
const Arena = (() => {
  const LS = "cf-vue", reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const BR_COL = { assaut: "#ff5a3c", defense: "#4d9bff", stratege: "#b072ff", voleur: "#3fdc8f", precision: "#2ee6ff", resistance: "#c9a37a", survie: "#ff7ab8", chance: "#f5c518" };
  const SIGNE_COL = { feu: "#ff5a3c", eau: "#2ee6ff", vent: "#3fdc8f", terre: "#c9a37a" };
  const ROLE_COL = { gardien: "#e8c77e", sentinelle: "#2ee6ff", briseur: "#ff2e88", errant: "#b072ff" };
  const EMOTES = [["salut", "Salut"], ["haha", "Haha"], ["respect", "Respect"], ["defi", "Viens !"], ["grr", "Grr"], ["quoi", "Quoi ?!"], ["ouin", "Ouin"], ["pardon", "Pardon"]];
  const QUICK = ["Bien joué !", "Je suis avec toi, Gardien", "C'est pas moi !", "On s'allie ?", "Bonne partie !"];
  const PROJ = { arc: "fleche", canon: "boulet", lance: "lance", baton: "magie" };
  let THREE = null, mods = null, loading = null, failed = false;
  let R = null; // le moteur 3D, créé une fois
  let st = null; // la table affichée : { gid, champs, lastSeq, lastSalon, queue, … }
  const $a = (id) => document.getElementById("ar-" + id);
  const wanted = () => { try { return localStorage.getItem(LS) !== "classique"; } catch (e) { return true; } };
  const setWanted = (on) => { try { localStorage.setItem(LS, on ? "arene" : "classique"); } catch (e) {} };
  const webgl = () => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; } };
  const usable = () => !failed && wanted() && webgl();
  const col = (b) => BR_COL[b] || "#e8c77e";
  const defOf = (c) => CF.cat?.cartes?.[c?.def] || {};
  const famCol = (c) => cfFam(defOf(c))[0];
  const nm = (id) => (id === ME ? "Toi" : CF.table?.noms?.[id]?.name || "Joueur");
  const wait = (ms) => new Promise((r) => setTimeout(r, reduced ? Math.min(ms, 120) : ms / (window.__arSpeed || 1)));

  // ---------- chargement de Three.js (CDN, carte d'import dans shell.html) ----------
  function load() {
    return (loading ||= Promise.all([
      import("three"),
      import("three/addons/environments/RoomEnvironment.js"),
      import("three/addons/postprocessing/EffectComposer.js"),
      import("three/addons/postprocessing/RenderPass.js"),
      import("three/addons/postprocessing/UnrealBloomPass.js"),
      import("three/addons/postprocessing/OutputPass.js"),
    ]).then(([T, a, b, c, d, e]) => { THREE = T; mods = { ...a, ...b, ...c, ...d, ...e }; }).catch((e) => { failed = true; console.warn("Arène 3D indisponible", e); if (view === "confront") draw(); }));
  }

  // ---------- page (DOM) ----------
  function mount() {
    if ($a("root")) return;
    const d = document.createElement("div"); d.id = "ar-root"; d.className = "ar"; d.hidden = true;
    d.innerHTML = `<canvas id="ar-c"></canvas><div class="ar-vign"></div><div id="ar-tags"></div><div id="ar-pops"></div><div class="ar-flash" id="ar-flash"></div>
      <div class="ar-top"><button class="btn sm" type="button" id="ar-back">${ico("confront")} Salons</button><button class="btn sm" type="button" id="ar-classic">Vue classique</button><button class="btn sm acc" type="button" id="ar-quit" hidden>Abandonner</button></div>
      <div class="ar-hint" id="ar-hint"></div>
      <div class="ar-banner"><b id="ar-banner"></b></div>
      <div class="ar-hand" id="ar-hand"></div>
      <svg id="ar-aim" aria-hidden="true"><path id="ar-aimPath"/><circle id="ar-aimEnd" r="16"/></svg>
      <button class="ar-chip" id="ar-chip" type="button" hidden></button>
      <div class="ar-tbl" id="ar-tbl"><button type="button" id="ar-tblBtn"><span>La table · rôles et styles</span><span id="ar-tblArr">▾</span></button><div class="ar-bd" id="ar-tblBd"></div></div>
      <div class="ar-log" id="ar-log" data-tab="log"><div class="ar-tabs"><button type="button" id="ar-tabLog" class="on">Historique</button><button type="button" id="ar-tabChat">Salon <i id="ar-chatN"></i></button><button type="button" id="ar-logArr" aria-label="Ouvrir">▾</button></div>
        <div class="ar-last" id="ar-logLast"></div><div class="ar-bd" id="ar-logBd"></div>
        <div class="ar-bd ar-chat" id="ar-chatBd"><div id="ar-chatList"><p class="note">Le salon de la table : parle aux autres joueurs. Les rôles restent secrets, à toi de bluffer.</p></div>
          <div class="ar-qp" id="ar-qp">${QUICK.map((q) => `<button type="button">${esc(q)}</button>`).join("")}</div>
          <form id="ar-chatForm"><input id="ar-chatIn" maxlength="120" autocomplete="off" placeholder="Écris à la table…" aria-label="Message à la table"><button class="btn sm gold" type="submit">Envoyer</button></form>
          <label class="ar-mute"><input type="checkbox" id="ar-mute"> Couper les émotes et messages des autres</label></div></div>
      <button class="btn ar-emob" id="ar-emoBtn" type="button" aria-label="Émotes">${ico("haha")}<span>Émotes</span></button>
      <div class="ar-emow" id="ar-emoW">${EMOTES.map(([k, t]) => `<button type="button" data-emo="${k}">${ico(k)}${t}</button>`).join("")}</div>
      <div class="ar-side"><div class="ar-deck" id="ar-deck" title="Pioche">${ico("logo")}<b id="ar-deckN"></b></div><button class="btn gold" type="button" id="ar-end" disabled>Fin du tour</button></div>
      <div class="ar-react" id="ar-react"><p id="ar-reactTxt"></p><div class="ar-bar"><i id="ar-reactBar"></i></div><div class="ar-cards" id="ar-reactCards"></div><div class="ar-row" id="ar-reactBtns"></div></div>
      <div class="ar-modal" id="ar-modal"><div class="ar-sheet" id="ar-sheet"></div></div>
      <div class="ar-endo" id="ar-endo"><div><h1 id="ar-endTxt"></h1><p id="ar-endSub"></p><div class="ar-row"><button class="btn" type="button" id="ar-endSee">Revoir la table</button><button class="btn gold" type="button" id="ar-endBack">Retour aux salons</button></div></div></div>
      <div class="ar-load" id="ar-load">Entrée dans l'arène…</div>`;
    document.body.appendChild(d);
    $a("back").onclick = () => nav("confront");
    $a("classic").onclick = () => { setWanted(false); hide(); draw(); };
    $a("quit").onclick = (e) => { if (sure(e.currentTarget, "Confirmer l'abandon")) cfAct({ type: "abandon" }); };
    $a("tabLog").onclick = () => panel("log"); $a("tabChat").onclick = () => panel("chat"); $a("logArr").onclick = () => panel();
    $a("tblBtn").onclick = () => { const t = $a("tbl"); t.classList.toggle("open"); $a("tblArr").textContent = t.classList.contains("open") ? "▴" : "▾"; };
    $a("emoBtn").onclick = () => $a("emoW").classList.toggle("on");
    $a("emoW").onclick = (e) => { const b = e.target.closest("[data-emo]"); if (!b) return; $a("emoW").classList.remove("on"); salon("emote", b.dataset.emo); };
    $a("qp").onclick = (e) => { const b = e.target.closest("button"); if (b) salon("msg", b.textContent); };
    $a("chatForm").onsubmit = (e) => { e.preventDefault(); const v = $a("chatIn").value.trim(); if (!v) return; $a("chatIn").value = ""; salon("msg", v); };
    $a("mute").onchange = (e) => { if (st) st.muted = e.target.checked; };
    $a("end").onclick = onEnd;
    $a("chip").onclick = () => showRole();
    $a("modal").onclick = (e) => { if (e.target.id === "ar-modal") closeModal(); };
    $a("endSee").onclick = () => $a("endo").classList.remove("on");
    $a("endBack").onclick = () => nav("confront");
    bindHand();
  }

  // ---------- moteur 3D ----------
  function initRenderer() {
    if (R) return;
    const canvas = $a("c"), renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene(); scene.background = new THREE.Color("#0c0818"); scene.fog = new THREE.Fog("#140c22", 14, 30);
    scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new mods.RoomEnvironment(), 0.04).texture;
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    const composer = new mods.EffectComposer(renderer); composer.addPass(new mods.RenderPass(scene, camera));
    const bloom = new mods.UnrealBloomPass(new THREE.Vector2(512, 512), 0.45, 0.5, 0.92); composer.addPass(bloom); composer.addPass(new mods.OutputPass());
    scene.add(new THREE.HemisphereLight("#9a7fd0", "#1a0f24", 0.55));
    const sun = new THREE.DirectionalLight("#ffd9b0", 1.6); sun.position.set(4, 9, 6); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7 }); scene.add(sun);
    for (const [x, z, c] of [[-5, -3, "#ff9a4a"], [5, -3, "#ff9a4a"], [-4.5, 3, "#ff7ab8"], [4.5, 3, "#ff7ab8"]]) { const l = new THREE.PointLight(c, 10, 9, 1.6); l.position.set(x, 1.8, z); scene.add(l); }
    R = { renderer, scene, camera, composer, bloom, tweens: [], clockT: 0, shake: 0, cam: { pos: new THREE.Vector3(), look: new THREE.Vector3(), base: { pos: new THREE.Vector3(), look: new THREE.Vector3() } }, ray: new THREE.Raycaster(), ndc: new THREE.Vector2(), glyphs: {}, last: performance.now(), on: false, portrait: false };
    R.radial = canvasTex(128, 128, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, "#fff"); r.addColorStop(.3, "#ffffffaa"); r.addColorStop(1, "#fff0"); g.fillStyle = r; g.fillRect(0, 0, w, w); });
    buildDecor(); buildParticles();
    canvas.addEventListener("pointermove", (e) => { if (drag) return; const p = champAt(e), ok = targeting && p && targetsFor(p).length; hover(ok ? p : null); canvas.style.cursor = ok ? "crosshair" : p ? "pointer" : "default"; });
    canvas.addEventListener("click", (e) => { const p = champAt(e); if (!p) return; if (targeting) pickTarget(p); else showInfo(p); });
    addEventListener("resize", () => { if (R.on) resize(); });
  }
  function canvasTex(w, h, paint) { const c = document.createElement("canvas"); c.width = w; c.height = h; paint(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
  const additive = (o) => new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, ...o });
  const iconPaths = (k) => [...(ICON[k] || "").matchAll(/ d="([^"]+)"/g)].map((m) => m[1]);
  const loadImg = (src) => new Promise((r) => { if (!src) return r(null); const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
  function buildDecor() {
    const { scene } = R;
    loadImg(typeof ILLUS_DECOR === "object" ? ILLUS_DECOR.table : null).then((img) => {
      if (!img) return;
      const tex = new THREE.Texture(img); tex.colorSpace = THREE.SRGBColorSpace; tex.needsUpdate = true;
      const Rr = 15, th = 2.3, KEEP = .4, Hd = Rr * th / (img.width / img.height) * KEEP;
      const back = new THREE.Mesh(new THREE.CylinderGeometry(Rr, Rr, Hd, 64, 1, true, Math.PI - th / 2, th), new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, color: "#b9a8cc", fog: false }));
      tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(-1, KEEP); tex.offset.y = 1 - KEEP; back.position.set(0, Hd / 2 - .9, 0); scene.add(back);
    });
    const floorTex = canvasTex(1024, 1024, (g, w) => {
      g.fillStyle = "#2a2338"; g.fillRect(0, 0, w, w); g.translate(w / 2, w / 2);
      for (let r = 60; r < 520; r += 62) { const n = Math.round(r / 18); for (let i = 0; i < n; i++) { const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2, l = 36 + Math.random() * 18; g.fillStyle = `hsl(265, 14%, ${l * .5}%)`; g.beginPath(); g.arc(0, 0, r + 58, a0 + .005, a1 - .005); g.arc(0, 0, r + 4, a1 - .005, a0 + .005, true); g.closePath(); g.fill(); } }
      g.strokeStyle = "#e8c77e"; g.lineWidth = 7; for (const r of [250, 262]) { g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke(); }
      g.lineWidth = 3; for (let i = 0; i < 8; i++) { g.save(); g.rotate(i / 8 * Math.PI * 2); g.beginPath(); g.moveTo(0, -60); g.lineTo(0, -250); g.stroke(); g.restore(); }
      g.save(); g.scale(4.2, 4.2); g.translate(-12, -12); g.lineWidth = 1.4; g.lineCap = g.lineJoin = "round"; for (const d of iconPaths("logo")) g.stroke(new Path2D(d)); g.restore();
      g.fillStyle = "#0004"; for (let i = 0; i < 3000; i++) g.fillRect((Math.random() - .5) * w, (Math.random() - .5) * w, 2, 2);
    });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(7.5, 96), new THREE.MeshStandardMaterial({ map: floorTex, roughness: .75, metalness: .15 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(7.5, .18, 12, 96), new THREE.MeshStandardMaterial({ color: "#3a3150", roughness: .6, metalness: .3 })); rim.rotation.x = Math.PI / 2; rim.position.y = .05; scene.add(rim);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 + Math.PI / 8, x = Math.cos(a) * 6.4, z = Math.sin(a) * 6.4; if (z > 4.5) continue;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(.09, .12, 1.4, 8), new THREE.MeshStandardMaterial({ color: "#2a2030", roughness: .5, metalness: .4 })); post.position.set(x, .7, z); post.castShadow = true; scene.add(post);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(.34, .42, .34), new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffb060").multiplyScalar(1.6), toneMapped: false })); lamp.position.set(x, 1.55, z); scene.add(lamp);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(.34, .22, 4), new THREE.MeshStandardMaterial({ color: "#1d1626" })); roof.position.set(x, 1.86, z); roof.rotation.y = Math.PI / 4; scene.add(roof);
      const gl = new THREE.Sprite(new THREE.SpriteMaterial({ map: R.radial, color: "#ff9a4a", blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: .45 })); gl.scale.set(1.6, 1.6, 1); gl.position.copy(lamp.position); scene.add(gl);
    }
  }
  // étincelles et pétales
  const NP = 1400;
  function buildParticles() {
    const P = R.P = { pos: new Float32Array(NP * 3).fill(999), col: new Float32Array(NP * 3), vel: new Float32Array(NP * 3), life: new Float32Array(NP), max: new Float32Array(NP), base: new Float32Array(NP * 3), drag: new Float32Array(NP), grav: new Float32Array(NP), next: 0 };
    P.geo = new THREE.BufferGeometry(); P.geo.setAttribute("position", new THREE.BufferAttribute(P.pos, 3)); P.geo.setAttribute("color", new THREE.BufferAttribute(P.col, 3));
    const pts = new THREE.Points(P.geo, new THREE.PointsMaterial({ size: .09, map: R.radial, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    pts.frustumCulled = false; R.scene.add(pts);
    const n = 160; R.petals = new THREE.InstancedMesh(new THREE.PlaneGeometry(.09, .06), new THREE.MeshBasicMaterial({ color: "#ffb3d6", side: THREE.DoubleSide, transparent: true, opacity: .85 }), n); R.scene.add(R.petals);
    R.pet = Array.from({ length: n }, () => ({ p: new THREE.Vector3((Math.random() - .5) * 18, Math.random() * 8, (Math.random() - .5) * 14 - 2), r: new THREE.Euler(Math.random() * 6, Math.random() * 6, 0), s: .5 + Math.random() }));
    R._m = new THREE.Matrix4(); R._q = new THREE.Quaternion(); R._s = new THREE.Vector3();
  }
  function emit(n, o, color, { speed = 3, spread = 1, up = 1, life = 1, grav = 3, drag = 1.4, jitter = .05, dir = null } = {}) {
    if (reduced || !R) return; const P = R.P, c = new THREE.Color(color).multiplyScalar(1.6);
    for (let k = 0; k < n; k++) {
      const i = P.next; P.next = (P.next + 1) % NP;
      for (let j = 0; j < 3; j++) P.pos[i * 3 + j] = o.getComponent(j) + (Math.random() - .5) * jitter;
      const a = Math.random() * Math.PI * 2, b = Math.acos(2 * Math.random() - 1), s = speed * (.3 + Math.random() * .7);
      P.vel[i * 3] = Math.sin(b) * Math.cos(a) * s * spread + (dir ? dir.x * s : 0); P.vel[i * 3 + 1] = Math.abs(Math.cos(b)) * s * up + (dir ? dir.y * s : 0); P.vel[i * 3 + 2] = Math.sin(b) * Math.sin(a) * s * spread + (dir ? dir.z * s : 0);
      const w = Math.random() < .25; P.base[i * 3] = w ? 1.8 : c.r; P.base[i * 3 + 1] = w ? 1.8 : c.g; P.base[i * 3 + 2] = w ? 1.8 : c.b;
      P.life[i] = P.max[i] = life * (.6 + Math.random() * .6); P.grav[i] = grav; P.drag[i] = drag;
    }
  }
  function stepParticles(dt) {
    const P = R.P;
    for (let i = 0; i < NP; i++) {
      if (P.life[i] <= 0) continue;
      P.life[i] -= dt; const f = Math.exp(-P.drag[i] * dt);
      P.vel[i * 3] *= f; P.vel[i * 3 + 2] *= f; P.vel[i * 3 + 1] = P.vel[i * 3 + 1] * f - P.grav[i] * dt;
      for (let j = 0; j < 3; j++) P.pos[i * 3 + j] += P.vel[i * 3 + j] * dt;
      const k = Math.max(0, P.life[i] / P.max[i]); for (let j = 0; j < 3; j++) P.col[i * 3 + j] = P.base[i * 3 + j] * k;
      if (P.life[i] <= 0) P.pos[i * 3 + 1] = 999;
    }
    P.geo.attributes.position.needsUpdate = true; P.geo.attributes.color.needsUpdate = true;
    R.pet.forEach((d, i) => { d.p.y -= dt * (.35 + d.s * .2); d.p.x += Math.sin(R.clockT * .7 + i) * dt * .3 + dt * .25; d.r.x += dt * d.s; d.r.y += dt * .7; if (d.p.y < 0) { d.p.y = 8; d.p.x = (Math.random() - .5) * 18; } R._q.setFromEuler(d.r); R._s.setScalar(d.s); R._m.compose(d.p, R._q, R._s); R.petals.setMatrixAt(i, R._m); });
    R.petals.instanceMatrix.needsUpdate = true;
  }
  const easeOut = (t) => 1 - Math.pow(1 - t, 3), easeIO = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2), easeIn = (t) => t * t * t;
  const easeBack = (t) => 1 + 2.6 * Math.pow(t - 1, 3) + 1.6 * Math.pow(t - 1, 2);
  const tween = (dur, fn, ease = easeIO) => new Promise((res) => { if (reduced || !R?.on) { fn(1, 1); return res(); } R.tweens.push({ t0: R.clockT, dur, fn, ease, res }); });
  function flash(color, o = .35, ms = 380) { if (reduced) return; const f = $a("flash"); f.style.background = `radial-gradient(circle, ${color}, transparent 70%)`; f.animate([{ opacity: o }, { opacity: 0 }], { duration: ms, easing: "ease-out" }); }
  function ring(pos, color, size = 3, dur = .7, flat = true) {
    if (reduced) return;
    const m = new THREE.Mesh(new THREE.RingGeometry(.9, 1, 64), additive({ color: new THREE.Color(color).multiplyScalar(1.4), side: THREE.DoubleSide }));
    m.position.copy(pos); if (flat) m.rotation.x = -Math.PI / 2; else m.lookAt(R.camera.position); R.scene.add(m);
    tween(dur, (t) => { m.scale.setScalar(.2 + t * size); m.material.opacity = 1 - t; }, easeOut).then(() => { R.scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
  }

  // ---------- champions ----------
  const SEAT_R = 3.3;
  function persoImg(p) {
    const c = p.perso && !p.perso.pret ? byId[p.perso.cardId] : null, k = c && imgKey(c);
    return k ? ART[k] || PHOTO[k] : typeof ILLUS_BRANCHE === "object" ? ILLUS_BRANCHE[p.perso?.branch] : null;
  }
  const persoName = (p) => { const c = p.perso && !p.perso.pret ? byId[p.perso.cardId] : null; return c ? nameOf(c) : p.perso ? LOAN_NAME(p.perso.branch) : "?"; };
  const LOAN_NAME = (b) => `Écho ${/^[aeéiou]/i.test(cfBranch(b).nom) ? "d'" : "de "}${cfBranch(b).nom}`;
  function champTex(p, img) {
    const c = col(p.branch);
    return canvasTex(400, 580, (g, w, h) => {
      const fr = g.createLinearGradient(0, 0, w, h); fr.addColorStop(0, c); fr.addColorStop(.5, "#1a1230"); fr.addColorStop(1, c);
      g.fillStyle = fr; g.beginPath(); g.roundRect(0, 0, w, h, 28); g.fill();
      g.save(); g.beginPath(); g.roundRect(12, 12, w - 24, h - 24, 20); g.clip(); g.fillStyle = "#1a1230"; g.fillRect(0, 0, w, h);
      if (img) { const s = Math.max((w - 24) / img.width, (h - 24) / img.height); g.drawImage(img, (w - img.width * s) / 2, 12, img.width * s, img.height * s); }
      const sh = g.createLinearGradient(0, h * .6, 0, h); sh.addColorStop(0, "#0000"); sh.addColorStop(1, "#000d"); g.fillStyle = sh; g.fillRect(0, 0, w, h);
      g.restore();
      g.fillStyle = "#fff"; g.font = "700 36px Cinzel, serif"; g.textAlign = "center"; g.fillText(p.label.slice(0, 18), w / 2, h - 44);
    });
  }
  function weaponMesh(kind) {
    const g = new THREE.Group(), gold = new THREE.MeshStandardMaterial({ color: "#d8b36a", metalness: 1, roughness: .3 }), steel = new THREE.MeshStandardMaterial({ color: "#c9d2e0", metalness: 1, roughness: .25 });
    const glow = (c) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.8), toneMapped: false });
    if (kind === "dague") { const b = new THREE.Mesh(new THREE.ConeGeometry(.06, .5, 4), steel); b.position.y = .25; g.add(b, new THREE.Mesh(new THREE.BoxGeometry(.22, .04, .06), gold)); const h = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .18, 8), gold); h.position.y = -.1; g.add(h); }
    if (kind === "arc") { const a = new THREE.Mesh(new THREE.TorusGeometry(.38, .03, 8, 32, Math.PI * .9), glow("#2ee6ff")); a.rotation.z = Math.PI / 2 + Math.PI * .05; g.add(a); const s = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .74, 4), glow("#ffffff")); s.position.x = -.02; g.add(s); }
    if (kind === "canon") { const b = new THREE.Mesh(new THREE.CylinderGeometry(.11, .14, .7, 16), new THREE.MeshStandardMaterial({ color: "#2a2638", metalness: .9, roughness: .3 })); b.rotation.z = Math.PI / 2.4; g.add(b); }
    if (kind === "lance") { const s = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, 1.2, 8), new THREE.MeshStandardMaterial({ color: "#6b4a2b", roughness: .7 })); g.add(s); const tip = new THREE.Mesh(new THREE.ConeGeometry(.07, .26, 4), glow("#b072ff")); tip.position.y = .72; g.add(tip); }
    if (kind === "lames" || kind === "shuriken") { for (const o of kind === "lames" ? [-.18, .18] : [0]) { const sh = new THREE.Shape(); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2, r = i % 2 ? .07 : .22; sh[i ? "lineTo" : "moveTo"](Math.cos(a) * r, Math.sin(a) * r); } const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: .03, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: "#e0e6f0", metalness: 1, roughness: .2, emissive: "#ff2e88", emissiveIntensity: .4 })); m.position.x = o; g.add(m); } }
    if (kind === "baton") { g.add(new THREE.Mesh(new THREE.CylinderGeometry(.03, .04, 1.1, 8), new THREE.MeshStandardMaterial({ color: "#3a2a4a", roughness: .6 }))); const o = new THREE.Mesh(new THREE.IcosahedronGeometry(.11, 1), glow("#b072ff")); o.position.y = .62; g.add(o); }
    if (kind === "magie") { g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(.15, 1), glow("#d6a6ff"))); const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: R.radial, color: "#b072ff", blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); h.scale.setScalar(.8); g.add(h); }
    if (kind === "boulet") g.add(new THREE.Mesh(new THREE.SphereGeometry(.13, 16, 12), new THREE.MeshStandardMaterial({ color: "#1d1b26", metalness: .8, roughness: .35, emissive: "#ff7a1a", emissiveIntensity: .5 })));
    if (kind === "fleche") { const s = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .7, 6), glow("#bff8ff")); s.rotation.x = Math.PI / 2; g.add(s); const tip = new THREE.Mesh(new THREE.ConeGeometry(.04, .14, 6), glow("#2ee6ff")); tip.rotation.x = Math.PI / 2; tip.position.z = .4; g.add(tip); }
    g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    return g;
  }
  function makeChamp(p, seat, n) {
    const a = Math.PI / 2 + seat / n * Math.PI * 2, root = new THREE.Group(); R.scene.add(root);
    const c = col(p.branch);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(.75, .85, .28, 32), new THREE.MeshStandardMaterial({ color: "#3a3150", roughness: .5, metalness: .4 })); ped.position.y = .14; ped.castShadow = ped.receiveShadow = true; root.add(ped);
    const ringM = new THREE.Mesh(new THREE.TorusGeometry(.8, .035, 8, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.5), toneMapped: false })); ringM.rotation.x = Math.PI / 2; ringM.position.y = .29; root.add(ringM);
    const bill = new THREE.Group(); bill.position.y = .3; root.add(bill);
    const body = new THREE.Group(); bill.add(body);
    const face = new THREE.MeshStandardMaterial({ map: champTex(p, null), roughness: .4, metalness: .1, emissive: "#000" });
    const card = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.67, .04), [0, 1, 2, 3, 4, 5].map((i) => (i === 4 ? face : new THREE.MeshStandardMaterial({ color: c, metalness: .9, roughness: .3 }))));
    card.position.y = .95; card.castShadow = true; body.add(card);
    loadImg(persoImg(p)).then((img) => { if (img) { face.map = champTex(p, img); face.needsUpdate = true; } });
    const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: R.radial, color: c, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: .25 })); aura.scale.set(2.4, 2.8, 1); aura.position.set(0, 1, -.1); body.add(aura);
    const wHold = new THREE.Group(); wHold.position.set(.82, 1.05, .15); body.add(wHold);
    card.userData.p = ped.userData.p = p;
    Object.assign(p, { root, bill, body, card, ped, face, aura, ringM, wHold, seat, angle: a, wMesh: null, wKind: null, eqG: [], eqKey: "" });
  }
  function setWeapon(p, kind, fx) {
    if (p.wKind === kind) return;
    if (p.wMesh) p.wHold.remove(p.wMesh);
    p.wKind = kind; p.wMesh = weaponMesh(kind); p.wHold.add(p.wMesh);
    if (fx) { p.wMesh.scale.setScalar(.01); tween(.6, (t) => p.wMesh.scale.setScalar(t), easeBack); emit(40, worldOf(p, 1.1).add(new THREE.Vector3(.6, 0, 0)), "#f5c518", { speed: 2, life: .7, grav: 0 }); }
  }
  function glyphMat(txt, c) {
    return (R.glyphs[txt + c] ||= new THREE.SpriteMaterial({ map: canvasTex(256, 96, (g) => { g.beginPath(); g.roundRect(6, 6, 244, 84, 42); g.fillStyle = "#0b0916e6"; g.fill(); g.lineWidth = 6; g.strokeStyle = c; g.stroke(); g.fillStyle = c; g.font = "700 36px Inter, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(txt, 128, 50); }), transparent: true, depthWrite: false }));
  }
  function setEquip(p, list, fx) {
    const key = list.map((c) => c.def).join(",");
    if (p.eqKey === key) return; p.eqKey = key;
    p.eqG.forEach((g) => p.bill.remove(g));
    p.eqG = list.filter((c) => c.def !== "sceau" && c.def !== "orbe").map((c) => { const g = new THREE.Sprite(glyphMat(defOf(c).nom?.split(" ")[0] || c.def, famCol(c))); g.scale.set(.62, .23, 1); p.bill.add(g); return g; });
    setSeal(p, list.some((c) => c.def === "sceau"), fx); setOrb(p, list.some((c) => c.def === "orbe"));
    if (fx && p.eqG.length) emit(30, worldOf(p, 2), "#5ac8fa", { speed: 1.5, life: .7, grav: 0 });
  }
  function sealTex() {
    return (R.sealTex ||= canvasTex(256, 256, (g) => { g.translate(128, 128); g.strokeStyle = "#ff4d5e"; g.lineWidth = 6; g.lineCap = g.lineJoin = "round"; for (const r of [118, 92]) { g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke(); } for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.beginPath(); for (let k = 0; k < 6; k++) { const b = k / 6 * Math.PI * 2 + Math.PI / 6; g.lineTo(Math.cos(a) * 105 + Math.cos(b) * 11, Math.sin(a) * 105 + Math.sin(b) * 11); } g.closePath(); g.stroke(); } g.save(); g.scale(4.4, 4.4); g.translate(-12, -12); g.lineWidth = 1.5; for (const d of iconPaths("sceau")) g.stroke(new Path2D(d)); g.strokeRect(5, 10.5, 14, 10.5); g.restore(); }));
  }
  function setSeal(p, on, fx) {
    if (on && !p.sealM) { p.sealM = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), additive({ map: sealTex(), color: new THREE.Color("#ff4d5e").multiplyScalar(1.4) })); p.sealM.rotation.x = -Math.PI / 2; p.sealM.position.y = .31; p.root.add(p.sealM); if (fx) { ring(worldOf(p, .32), "#ff4d5e", 2, .6); emit(50, worldOf(p, .4), "#ff4d5e", { speed: 2, up: 1.5, life: .8 }); } }
    if (!on && p.sealM) { const m = p.sealM; p.sealM = null; tween(.5, (t) => { m.material.opacity = 1 - t; m.scale.setScalar(1 + t); }).then(() => p.root.remove(m)); }
  }
  function setOrb(p, on) {
    if (on && !p.orbM) { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(.2, 0), new THREE.MeshStandardMaterial({ color: "#2a1a10", emissive: "#ff7a1a", emissiveIntensity: 1.2, flatShading: true }))); const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: R.radial, color: "#ff7a1a", blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: .7 })); g.add(h); p.orbM = g; g.position.y = 2.45; p.bill.add(g); }
    if (!on && p.orbM) { p.bill.remove(p.orbM); p.orbM = null; }
  }
  const worldOf = (p, y = 1.2) => p.root.position.clone().add(new THREE.Vector3(0, y, 0));
  const champ = (id) => st?.champs.find((p) => p.id === id);

  // ---------- caméra ----------
  function resize() {
    const w = innerWidth, h = innerHeight; R.renderer.setSize(w, h, false); R.composer.setSize(w, h); R.camera.aspect = w / h;
    R.portrait = w / h < .85; R.camera.fov = R.portrait ? 56 : 42; R.camera.updateProjectionMatrix(); R.bloom.resolution.set(w / 2, h / 2);
    R.cam.base.pos.set(0, R.portrait ? 8.4 : 5.4, R.portrait ? 10.6 : 8.6); R.cam.base.look.set(0, R.portrait ? .2 : .5, R.portrait ? -.2 : -.1);
    for (const p of st?.champs || []) p.root.position.set(Math.cos(p.angle) * SEAT_R * (R.portrait ? .52 : 1), 0, Math.sin(p.angle) * SEAT_R * (R.portrait ? .9 : 1));
    R.cam.pos.copy(R.cam.base.pos); R.cam.look.copy(R.cam.base.look); layoutHand();
  }
  async function focus(target, k = .35, dur = .35) { const c = R.cam, p0 = c.pos.clone(), l0 = c.look.clone(), p1 = c.base.pos.clone().lerp(target.clone().add(new THREE.Vector3(0, 2.2, 4.2)), k), l1 = c.base.look.clone().lerp(target, k * 1.4); await tween(dur, (t) => { c.pos.lerpVectors(p0, p1, t); c.look.lerpVectors(l0, l1, t); }); }
  async function unfocus(dur = .5) { const c = R.cam, p0 = c.pos.clone(), l0 = c.look.clone(); await tween(dur, (t) => { c.pos.lerpVectors(p0, c.base.pos, t); c.look.lerpVectors(l0, c.base.look, t); }); }
  function screenOf(v) { const p = v.clone().project(R.camera); return [(p.x + 1) / 2 * innerWidth, (1 - p.y) / 2 * innerHeight]; }

  // ---------- effets ----------
  function pop(p, text, color, small = false) { if (!p) return; const [x, y] = screenOf(worldOf(p, 1.5)); const d = document.createElement("div"); d.className = "ar-pop" + (small ? " small" : ""); d.textContent = text; d.style.color = color; d.style.left = x + "px"; d.style.top = y + "px"; $a("pops").appendChild(d); setTimeout(() => d.remove(), 1200); }
  function hitFx(p, color = "#ff4d5e") {
    const f = p.face; f.emissive.set(color); tween(.45, (t) => { f.emissiveIntensity = (1 - t) * 1.4; p.body.rotation.x = -Math.sin(t * Math.PI) * .35; p.body.position.z = -Math.sin(t * Math.PI) * .15; }, easeOut);
    emit(50, worldOf(p, 1.1), color, { speed: 3.2, life: .7, grav: 4 }); R.shake = Math.max(R.shake, .1);
  }
  function shield(p, c = "#2ee6ff") {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1.05, 1), additive({ color: new THREE.Color(c).multiplyScalar(1.2), wireframe: true, opacity: 0 }));
    const s = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), additive({ color: new THREE.Color(c).multiplyScalar(.35), opacity: 0 }));
    const g = new THREE.Group(); g.add(m, s); g.position.copy(worldOf(p, 1.1)); R.scene.add(g);
    tween(.2, (t) => { m.material.opacity = t; s.material.opacity = t * .5; g.scale.setScalar(.6 + .4 * t); }, easeOut).then(() => wait(250)).then(() => {
      emit(60, g.position, c, { speed: 3.5, life: .6, grav: 1 }); ring(g.position, c, 2.2, .5, false);
      tween(.45, (t) => { m.material.opacity = 1 - t; s.material.opacity = (1 - t) * .5; g.scale.setScalar(1 + t * .4); g.rotation.y += .1; }).then(() => R.scene.remove(g));
    });
  }
  function slash(pos, c) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(.7, .05, 6, 40, Math.PI * .9), additive({ color: new THREE.Color(c).multiplyScalar(2) }));
    m.position.copy(pos); m.lookAt(R.camera.position); m.rotateZ(-.6); R.scene.add(m);
    tween(.32, (t) => { m.scale.setScalar(.6 + t * .6); m.material.opacity = 1 - t; m.rotateZ(.06); }).then(() => R.scene.remove(m));
  }
  // une attaque part : l'arme décide du projectile ; le résultat (parade, dégâts) vient avec les événements suivants
  async function attackFx(from, to) {
    if (!from || !to) return;
    const a = worldOf(from, 1.15), b = worldOf(to, 1.15), w = from.wKind || "dague";
    focus(a.clone().lerp(b, .5), .3, .3);
    if (w === "dague" || w === "lames") {
      const p0 = from.root.position.clone(), dir = to.root.position.clone().sub(p0).multiplyScalar(.72);
      await tween(.26, (t) => from.root.position.copy(p0).addScaledVector(dir, t), easeIn);
      slash(b, w === "lames" ? "#ff2e88" : "#ffffff"); if (w === "lames") setTimeout(() => slash(b, "#ff2e88"), 110);
      await tween(.32, (t) => from.root.position.copy(p0).addScaledVector(dir, 1 - t), easeOut);
    } else {
      const kind = PROJ[w] || "fleche", proj = weaponMesh(kind); R.scene.add(proj);
      const dur = { fleche: .3, boulet: .6, lance: .42, magie: .5 }[kind], H = kind === "boulet" ? 2.2 : kind === "lance" ? .8 : kind === "magie" ? .6 : .15;
      if (kind === "boulet") { emit(40, a, "#ffb060", { speed: 2.5, life: .5, grav: -1, dir: b.clone().sub(a).normalize() }); R.shake = .08; }
      const prev = a.clone();
      await tween(dur, (t) => {
        const p = a.clone().lerp(b, t); p.y += Math.sin(t * Math.PI) * H; proj.position.copy(p);
        const d = p.clone().sub(prev); if (d.lengthSq() > 1e-6) { if (kind === "fleche") proj.lookAt(p.clone().add(d)); else if (kind === "lance") { proj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()); proj.rotateY(t * 20); } else proj.rotation.x += .3; }
        prev.copy(p); emit(kind === "boulet" ? 3 : 2, p, kind === "boulet" ? "#8a7a70" : kind === "fleche" ? "#2ee6ff" : "#b072ff", { speed: .3, life: kind === "boulet" ? .9 : .35, grav: kind === "boulet" ? -.4 : 0 });
      }, kind === "boulet" ? (t) => t : easeIn);
      R.scene.remove(proj);
      if (kind === "boulet") { emit(120, b, "#ff7a1a", { speed: 4.5, life: .9, grav: 2 }); ring(new THREE.Vector3(b.x, .05, b.z), "#ff7a1a", 3.5, .7); flash("#ff7a1a", .3); R.shake = .25; }
    }
    unfocus();
  }
  async function pluieFx(from) {
    await focus(new THREE.Vector3(0, .8, 0), .15, .3);
    for (const t of st.champs.filter((q) => q !== from && q.alive)) {
      const b = worldOf(t, 1.1);
      for (let k = 0; k < 6; k++) {
        const s = weaponMesh("shuriken"); R.scene.add(s); const s0 = b.clone().add(new THREE.Vector3((Math.random() - .5) * 1.6, 5 + Math.random(), (Math.random() - .5) * 1.2));
        tween(.45 + k * .05, (u) => { s.position.lerpVectors(s0, b, u); s.rotation.z += .5; s.rotation.x = 1.2; }, easeIn).then(() => { R.scene.remove(s); emit(8, b, "#ff2e88", { speed: 2, life: .4 }); });
      }
    }
    await wait(800); unfocus();
  }
  async function ondeFx(from) {
    const o = worldOf(from, .1); R.shake = .2; flash("#f5a524", .25);
    for (let k = 0; k < 3; k++) setTimeout(() => ring(o, "#f5a524", 11, 1.1), k * 140);
    emit(160, o, "#c9a37a", { speed: 5, up: .25, life: 1.1, grav: 2, jitter: 1 });
    await wait(450);
    st.champs.filter((q) => q !== from && q.alive).forEach((t) => tween(.4, (u) => { t.body.position.y = Math.sin(u * Math.PI) * .35; t.body.rotation.z = Math.sin(u * Math.PI * 3) * .08; }));
    await wait(500);
  }
  function healFx(p) {
    if (!p) return;
    for (let k = 0; k < 4; k++) setTimeout(() => emit(18, worldOf(p, .3), "#3fdc8f", { speed: 1.2, spread: .6, up: 2.2, life: 1.1, grav: -1.2, jitter: 1 }), k * 90);
    ring(worldOf(p, .32), "#3fdc8f", 1.4, .7);
  }
  function beam(a, b, c, dur = .8) {
    if (!a || !b) return Promise.resolve();
    const pa = worldOf(a, 1.2), pb = worldOf(b, 1.2), m = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, pa.distanceTo(pb), 8, 1, true), additive({ color: new THREE.Color(c).multiplyScalar(1.8) }));
    m.position.copy(pa).lerp(pb, .5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pb.clone().sub(pa).normalize()); R.scene.add(m);
    return tween(dur, (t) => { m.material.opacity = Math.sin(t * Math.PI); m.scale.x = m.scale.z = 1 + Math.sin(t * 20) * .5; }).then(() => R.scene.remove(m));
  }
  // une carte vole d'un point à un autre de l'écran (vol, Étal, défausse)
  function flyCard(c, from, to) {
    if (reduced) return Promise.resolve();
    const [x0, y0] = from ? screenOf(worldOf(from, 1.2)) : [innerWidth - 60, innerHeight - 140], [x1, y1] = to ? screenOf(worldOf(to, 1.2)) : [innerWidth / 2, innerHeight + 80];
    const d = document.createElement("div"); d.className = "ar-fly"; d.style.setProperty("--cc", c ? famCol(c) : "var(--gold)"); d.innerHTML = c && typeof ILLUS_CARTE === "object" && ILLUS_CARTE[c.def] ? `<span class="cfart-${c.def}"></span>` : ico("carte");
    $a("pops").appendChild(d);
    return d.animate([{ transform: `translate(${x0}px, ${y0}px) scale(.5) rotate(-10deg)`, opacity: 0 }, { opacity: 1, offset: .2 }, { transform: `translate(${x1}px, ${y1}px) scale(.8) rotate(8deg)`, opacity: 1 }], { duration: 650 / (window.__arSpeed || 1), easing: "cubic-bezier(.3,.7,.3,1)" }).finished.then(() => d.remove());
  }
  function omen(p, e) {
    if (!p) return;
    const k = (e.cartes || [])[0] || {}, c = SIGNE_COL[k.signe] || "#e8c77e", [x, y] = screenOf(worldOf(p, 2.4));
    const d = document.createElement("div"); d.className = "ar-omen"; d.style.cssText = `left:${x}px;top:${y}px;--oc:${c}`;
    d.innerHTML = `<small>Présage${PRESAGE_POUR[e.quoi] ? ` · ${esc(PRESAGE_POUR[e.quoi])}` : ""}</small><b>${ico(k.signe || "logo")}</b><span>${esc(cfSigne(k.signe).nom || "")} ${k.rang || ""}</span><em class="${e.favorable ? "ok" : "no"}">${e.favorable ? "réussi" : "raté"}</em>`;
    $a("pops").appendChild(d); setTimeout(() => d.remove(), 2100);
  }
  function banner(t, c = "#e8c77e") { const b = $a("banner"); b.textContent = t; b.style.setProperty("--bc", c); b.classList.remove("go"); void b.offsetWidth; b.classList.add("go"); }
  function eliminateFx(p) {
    if (!p) return;
    emit(140, worldOf(p, 1), col(p.branch), { speed: 3, life: 1.2, grav: 1 });
    tween(.9, (t) => { p.body.rotation.x = -t * 1.45; p.body.position.y = -t * .1; p.aura.material.opacity = .25 * (1 - t); p.ringM.material.color.setScalar(1 - t * .9); }, easeIn);
  }
  function bubble(p, html, emo) {
    if (!p) return;
    st.bubbles.filter((b) => b.p === p).forEach((b) => { b.el.remove(); b.dead = true; });
    const el = document.createElement("div"); el.className = "ar-bub" + (emo ? " emo" : ""); el.style.setProperty("--bc", col(p.branch)); el.innerHTML = html; $a("pops").appendChild(el);
    const b = { p, el }; st.bubbles.push(b);
    setTimeout(() => el.classList.add("out"), emo ? 2300 : 3600); setTimeout(() => { el.remove(); b.dead = true; }, emo ? 2700 : 4000);
    if (emo) tween(.6, (u) => { p.body.position.y = Math.abs(Math.sin(u * Math.PI * 2)) * .14 * (1 - u); });
  }

  // ---------- la table affichée ----------
  // st.disp : ce que l'arène montre (PV, vivant…) ; il suit les animations, puis rejoint la vue du serveur
  function setup(T) {
    const v = T.vue, n = v.joueurs.length;
    if (st) for (const p of st.champs) R.scene.remove(p.root);
    st = { gid: T.gid, champs: [], lastSeq: 0, lastSalon: 0, queue: [], running: false, log: [], bubbles: [], muted: false, unread: 0, sel: null, discard: [], deadline: null, roleShown: false };
    v.joueurs.forEach((j, i) => { const p = { id: j.id, branch: j.perso?.branch, perso: j.perso, label: nm(j.id) === "Toi" ? ACCT?.name || "Toi" : nm(j.id) }; makeChamp(p, (i - Math.max(0, v.joueurs.findIndex((q) => q.id === v.moi)) + n) % n, n); st.champs.push(p); });
    st.lastSeq = Math.max(0, ...(v.journal || []).map((e) => e.seq || 0));
    st.log = (v.journal || []).filter(logged).map(logLine);
    st.lastSalon = Math.max(0, ...(T.salon || []).map((m) => m.id));
    (T.salon || []).forEach((m) => chatAdd(m, false));
    applyView(v, false); resize();
  }
  function applyView(v, fx = true) {
    for (const j of v.joueurs) {
      const p = champ(j.id); if (!p) continue;
      p.pv = j.pv; p.pvMax = j.pvMax; p.role = j.role; p.j = j;
      if (p.alive !== false && !j.vivant && !fx) { p.body.rotation.x = -1.45; p.aura.material.opacity = 0; p.ringM.material.color.setScalar(.1); }
      p.alive = j.vivant;
      setWeapon(p, j.arme?.def || "dague", fx); setEquip(p, j.equip || [], fx);
    }
    renderTags(); renderTable(); renderLog();
  }
  const logged = (e) => !["attente", "attente_annulee", "phase", "choix_prive", "propositions", "reserve", "contribution", "choix", "rejoint"].includes(e.type) && !(e.type === "pioche_publique" && e.pid === CF.table?.vue?.moi);
  const LOG_COL = { degats: "#ff4d5e", elimination: "#ff4d5e", pare: "#2ee6ff", esquive: "#2ee6ff", riposte: "#2ee6ff", sauvetage: "#3fdc8f", survie: "#3fdc8f", presage: "#f5c518", orbe_explose: "#ff7a1a" };
  const logLine = (e) => ({ html: cfEvent(e), col: LOG_COL[e.type] || (e.type === "joue" ? famCol(e.carte) : null), tour: e.type === "tour", t: e.tour || e.n });
  function renderLog() {
    if (!st) return;
    $a("logBd").innerHTML = st.log.slice(-120).reverse().map((e) => `<div class="ar-le ${e.tour ? "tour" : ""}" style="--lc:${e.col || "var(--mut)"}">${e.html}</div>`).join("");
    const last = st.log.filter((e) => !e.tour).at(-1); $a("logLast").innerHTML = last ? last.html : "La partie commence.";
  }
  function panel(which) {
    const t = $a("log"); if (which) { t.dataset.tab = which; t.classList.add("open"); } else t.classList.toggle("open");
    const tab = t.dataset.tab; $a("tabLog").classList.toggle("on", tab === "log"); $a("tabChat").classList.toggle("on", tab === "chat"); $a("logArr").textContent = t.classList.contains("open") ? "▴" : "▾";
    if (tab === "chat" && t.classList.contains("open") && st) { st.unread = 0; $a("chatN").textContent = ""; $a("chatList").scrollTop = 1e6; }
  }
  // étiquettes au-dessus des champions
  function roleBadge(p, v) {
    if (!p.role) return "";
    const R0 = ROLES[p.role] || { nom: p.role };
    const me = p.id === v.moi, cls = p.role === "gardien" ? "" : me ? "mine" : "brk";
    return `<span class="ar-role ${cls}">${ico(p.role)} ${esc(R0.nom)}${me && p.role !== "gardien" ? " · toi seul le vois" : ""}</span>`;
  }
  const weaponTxt = (j) => (j?.arme ? `${esc(defOf(j.arme).nom?.split(" ")[0] || j.arme.def)} · portée ${defOf(j.arme).portee || 1}` : "Dague · portée 1");
  function renderTags() {
    const v = CF.table?.vue; if (!v || !st) return;
    $a("tags").innerHTML = st.champs.map((p) => {
      const j = p.j || {}, tg = targeting ? targetsFor(p).length : 0;
      return `<div class="ar-tag ${p.alive ? "" : "dead"} ${v.tour?.pid === p.id && v.phase === "partie" ? "turn" : ""} ${targeting ? (tg ? "target" : "far") : ""}" id="ar-tag-${p.id}" data-pid="${esc(p.id)}" style="--bc:${col(p.branch)}">
        ${roleBadge(p, v)}
        <span class="ar-nm">${cfEmb(p.branch, "sm")}${esc(nm(p.id))}${j.distancePercue != null ? `<small>↔ ${j.distancePercue}</small>` : ""}</span>
        <span class="ar-pv" role="img" aria-label="${p.pv} PV sur ${p.pvMax}">${Array.from({ length: p.pvMax || 0 }, (_, i) => `<i class="${i < p.pv ? "" : "off"}"></i>`).join("")}</span>
        <span class="ar-wp">${weaponTxt(j)}${(j.equip || []).map((c) => ` · <b style="color:${c.def === "sceau" ? "#ff4d5e" : famCol(c)}">${c.def === "sceau" ? "Entravé" : esc(defOf(c).nom?.split(" ")[0] || c.def)}</b>`).join("")} · ${j.nbMain ?? 0} carte${j.nbMain > 1 ? "s" : ""}</span><span class="ar-tm"><i></i></span></div>`;
    }).join("");
    $a("tags").querySelectorAll(".ar-tag").forEach((el) => { el.onclick = () => { const p = champ(el.dataset.pid); if (targeting) pickTarget(p); else showInfo(p); }; });
  }
  function placeTags() {
    for (const p of st.champs) { const el = document.getElementById("ar-tag-" + p.id); if (!el) continue; const [x, y] = screenOf(worldOf(p, 2.05)); el.style.left = x + "px"; el.style.top = y + "px"; }
    for (const b of st.bubbles) { if (b.dead) continue; const [x, y] = screenOf(worldOf(b.p, 2.55)); b.el.style.left = x + 26 + "px"; b.el.style.top = y + "px"; }
  }
  // récap de la table : rôles en jeu, perso, style et pouvoir de chacun
  function renderTable() {
    const v = CF.table?.vue; if (!v || !st) return;
    const n = v.joueurs.length, split = v.mode === "classique" ? ROLE_SPLIT[n] : null;
    const down = (r) => v.joueurs.filter((j) => j.role === r && !j.vivant).length;
    $a("tblBd").innerHTML = (split ? `<div class="ar-rl">${ROLE_ORDER.map((r, i) => split[i] ? `<span style="--rc:${ROLE_COL[r]}">${ico(r)} ${split[i]} ${esc(ROLES[r].nom)}${split[i] > 1 ? "s" : ""}${down(r) ? ` · ${down(r)} tombé${down(r) > 1 ? "s" : ""}` : ""}</span>` : "").join("")}</div>` : `<p class="note">${v.mode === "duel" ? "Duel" : "Trio"} : pas de rôle, chacun pour soi.</p>`) +
      st.champs.map((p) => { const j = p.j || {}, b = cfBranch(p.branch); return `<button type="button" class="ar-pl ${p.alive ? "" : "dead"}" data-pid="${esc(p.id)}" style="--bc:${col(p.branch)}"><span class="ar-av" style="background-image:url(${persoImg(p) || ""})"></span><span><b>${esc(nm(p.id))}</b><em style="color:${p.role ? ROLE_COL[p.role] : "var(--mut)"}">${p.role ? esc(ROLES[p.role]?.nom || p.role) : split ? "rôle caché" : ""}</em>
        <small>${esc(persoName(p))} · <i>${esc(b.nom)}</i> : ${esc(CF_POUVOIR_COURT(p.branch))}</small><small>${p.pv}/${p.pvMax} PV · ${weaponTxt(j)}${(j.equip || []).length ? " · " + j.equip.map((c) => esc(defOf(c).nom)).join(", ") : ""}</small></span></button>`; }).join("");
    $a("tblBd").querySelectorAll("[data-pid]").forEach((el) => { el.onclick = () => showInfo(champ(el.dataset.pid)); });
  }
  const CF_POUVOIR_COURT = (b) => (cfBranch(b).pouvoir || "").split(/[.:]/).slice(0, 2).join(" :").slice(0, 110);

  // ---------- fiche d'un champion (toi compris) ----------
  const cardRow = (c, extra = "") => `<div class="ar-sc" style="--cc:${famCol(c)}"><span class="ar-art ${typeof ILLUS_CARTE === "object" && ILLUS_CARTE[c.def] ? "cfart-" + c.def : ""}"></span><div><b>${esc(defOf(c).nom || c.def)}${extra}</b><span>${esc(defOf(c).texte || "")}</span></div></div>`;
  function showInfo(p) {
    if (!p) return;
    const v = CF.table.vue, j = p.j || {}, me = v.joueurs.find((q) => q.id === v.moi), b = cfBranch(p.branch), mine = p.id === v.moi;
    const rk = p.role ? `${ROLES[p.role]?.nom || p.role}${mine ? " · ton rôle" : p.role === "gardien" ? " · visible de tous" : " · révélé"}` : v.mode === "classique" ? "Rôle caché" : "Chacun pour soi";
    let dist = "";
    if (!mine && p.alive && me?.vivant && j.distancePercue != null) {
      const ok = j.distancePercue <= (v.porteeArme || 1);
      dist = `<div class="ar-ss"><b>Distance</b><div class="ar-sd ${ok ? "ok" : "no"}">Tu le vois à <b>${j.distancePercue}</b> de distance : ${ok ? "il est <b>à portée</b> de ton arme" : `<b>hors de portée</b> de ton arme (portée ${v.porteeArme || 1})`}.</div></div>`;
    }
    $a("sheet").style.setProperty("--bc", col(p.branch));
    $a("sheet").innerHTML = `<div class="ar-sh"><span class="ar-av" style="background-image:url(${persoImg(p) || ""})"></span><div><h2>${esc(nm(p.id))}</h2><p class="ar-rk" style="color:${p.role ? ROLE_COL[p.role] : "var(--mut)"}">${esc(rk)}</p>
        <p class="ar-pvs">${Array.from({ length: p.pvMax || 0 }, (_, i) => `<i class="${i < p.pv ? "" : "off"}"></i>`).join("")} ${p.pv}/${p.pvMax} PV${p.alive ? "" : " · éliminé"} · ${j.nbMain ?? 0} carte(s) en main</p></div><button class="btn sm ar-x" type="button" aria-label="Fermer">✕</button></div>
      <div class="ar-ss"><b>Perso joué</b><div class="ar-sd">${esc(persoName(p))}${p.perso?.pret ? " (carte de prêt)" : ""}</div></div>
      <div class="ar-ss"><b>Style · ${esc(b.nom)}</b><div class="ar-sd">${cfEmb(p.branch, "sm")} ${esc(b.pouvoir || "")}</div></div>
      ${dist}
      <div class="ar-ss"><b>Arme</b>${j.arme ? cardRow(j.arme) : `<div class="ar-sd">Dague d'essence : arme de base, portée 1. Remplacée dès qu'on s'équipe d'une autre arme.</div>`}</div>
      <div class="ar-ss"><b>Équipement</b>${(j.equip || []).length ? j.equip.map((c) => cardRow(c, c.def === "sceau" || c.def === "orbe" ? " · posé devant lui" : "")).join("") : `<p class="note">Aucun équipement posé devant lui.</p>`}</div>`;
    $a("sheet").querySelector(".ar-x").onclick = closeModal;
    $a("modal").classList.add("on");
  }
  function showRole() {
    const v = CF.table?.vue; if (!v?.monRole) return;
    $a("sheet").style.setProperty("--bc", ROLE_COL[v.monRole]);
    $a("sheet").innerHTML = `<div class="ar-rolec">${roleCard(v.monRole, { mine: true })}</div><div class="ar-row"><button class="btn gold" type="button" id="ar-roleOk">C'est compris</button></div>`;
    $a("roleOk").onclick = closeModal; $a("modal").classList.add("on");
  }
  const closeModal = () => $a("modal").classList.remove("on");

  // ---------- la main ----------
  let hand = [], targeting = null, drag = null, hovered = null;
  const plays = (uid) => { const v = CF.table?.vue; if (!v || st?.running) return []; const def = v.main?.find((c) => c.uid === uid)?.def; return (v.actions || []).filter((a) => a.type === "jouer" && v.main.find((c) => c.uid === a.carte)?.def === def).map((a) => ({ ...a, carte: uid })); };
  const targetsFor = (p) => (targeting && p ? targeting.acts.filter((a) => a.cible === p.id) : []);
  const finAct = () => CF.table?.vue?.actions?.find((a) => a.type === "finir");
  function cardEl(c) {
    const d = defOf(c), el = document.createElement("div"); el.className = "ar-hc"; el.dataset.cu = c.uid; el.style.setProperty("--cc", famCol(c));
    el.innerHTML = `<div class="ar-art ${typeof ILLUS_CARTE === "object" && ILLUS_CARTE[c.def] ? "cfart-" + c.def : ""}">${CF_ICON[c.def] || ico(CF_FAMILY_ICON[d.cat] || "logo")}<span class="ar-sg" style="color:${SIGNE_COL[c.signe]}">${ico(c.signe)}${c.rang}</span></div><div class="ar-t">${esc(d.nom || c.def)}</div><div class="ar-d">${esc(CF_SHORT[c.def] || d.texte || "")}</div><div class="ar-ty">${esc(cfFam(d)[1])}</div>`;
    return el;
  }
  function syncHand(v, fx) {
    const main = v.main || [], el = $a("hand"), keep = new Set(main.map((c) => c.uid));
    hand.filter((h) => !keep.has(h.c.uid)).forEach((h) => { h.el.remove(); });
    hand = hand.filter((h) => keep.has(h.c.uid));
    const deck = $a("deck").getBoundingClientRect();
    for (const c of main) if (!hand.some((h) => h.c.uid === c.uid)) {
      const h = { c, el: cardEl(c), fresh: fx }; el.appendChild(h.el); hand.push(h);
    }
    hand.sort((a, b) => main.findIndex((c) => c.uid === a.c.uid) - main.findIndex((c) => c.uid === b.c.uid));
    if (st && !main.some((c) => c.uid === st.sel)) st.sel = null;
    if (st) st.discard = st.discard.filter((u) => keep.has(u));
    layoutHand();
    const hr = el.getBoundingClientRect();
    hand.filter((h) => h.fresh).forEach((h, i) => { h.fresh = false; if (reduced) return; h.el.animate([{ transform: `translate(${deck.left - hr.left}px, ${deck.top - hr.top}px) rotate(20deg) scale(.4)`, opacity: .2 }, { transform: h.el.style.transform, opacity: 1 }], { duration: 420, delay: i * 110, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }); });
  }
  function layoutHand() {
    if (!R || !st) return;
    const n = hand.length, cw = Math.min(132, Math.max(92, innerWidth * .13)), spread = Math.min(cw * .78, (innerWidth - (innerWidth > 600 ? 340 : 24) - cw) / Math.max(1, n - 1)), fin = finAct();
    hand.forEach((h, i) => {
      const o = i - (n - 1) / 2, s = st.sel === h.c.uid, picked = st.discard.includes(h.c.uid), rot = o * (R.portrait ? 5 : 6) * Math.min(1, 6 / n), base = R.portrait ? cw * .32 : cw * .55, lift = s || picked ? cw * .55 : Math.abs(o) * Math.abs(o) * 4 * Math.min(1, 6 / n) + base;
      h.el.style.transform = `translateX(${o * spread}px) translateY(${s || picked ? -lift : lift}px) rotate(${s ? 0 : rot}deg) scale(${s ? 1.22 : 1})`;
      h.el.style.zIndex = s ? 50 : 10 + i;
      const ok = plays(h.c.uid).length > 0 && !st.discMode;
      h.el.classList.toggle("off", !ok && !st.discMode && !reactUses(h.c));
      h.el.classList.toggle("ok", ok); h.el.classList.toggle("picked", picked);
    });
  }
  // en réaction, la carte qui sert (Parade, Riposte, Élixir, une Frappe à défausser) brille
  const reactUses = (c) => { const v = CF.table?.vue, pr = v?.attente; if (!pr || pr.pid !== v.moi || pr.kind === "tour") return false; return (v.actions || []).some((a) => a.carte === c.uid || (a.type === "parer" && c.def === "parade") || (a.type === "riposter" && c.def === "riposte") || (a.type === "elixir" && c.def === "elixir") || (a.type === "defausser" && c.def === "frappe")); };
  function hint(t) { const h = $a("hint"); h.textContent = t || ""; h.hidden = !t; }
  function tipFor(c) {
    const v = CF.table.vue, d = defOf(c), pr = v.attente;
    if (!pr || pr.pid !== v.moi || pr.kind !== "tour") return d.type === "reaction" ? `${d.nom} se joue quand on t'attaque.` : "Attends ton tour pour jouer.";
    if (v.tour?.entrave) return "Tu es entravé ce tour : tu pioches mais ne joues aucune carte.";
    const ps = plays(c.uid);
    if (!ps.length) return d.type === "reaction" ? `${d.nom} se joue quand on t'attaque.` : c.def === "frappe" ? "Plus de Frappe ce tour, ou personne à portée de ton arme." : "Pas jouable maintenant.";
    return ps.some((a) => a.cible) ? "Glisse-la sur un champion, ou touche le champion visé." : "Glisse-la vers le haut, ou touche-la encore, pour la jouer.";
  }
  function startTarget(uid) { const acts = plays(uid).filter((a) => a.cible); targeting = acts.length ? { uid, acts } : null; renderTags(); }
  function cancelTarget() { targeting = null; hover(null); renderTags(); }
  function hover(p) { if (hovered && hovered !== p) hovered.ringM.scale.setScalar(1); hovered = p; if (p) p.ringM.scale.setScalar(1.18); }
  function pickTarget(p) {
    const acts = targetsFor(p); if (!acts.length) return;
    cancelTarget(); st.sel = null; layoutHand();
    if (acts.length === 1) return act(acts[0]);
    // Larcin, Dissipation : une carte de sa main ou une carte posée devant lui
    const j = p.j || {}, posed = [j.arme, ...(j.equip || [])].filter(Boolean);
    $a("sheet").style.setProperty("--bc", "var(--gold)");
    $a("sheet").innerHTML = `<h2 class="ar-h2">Quelle carte de ${esc(nm(p.id))} ?</h2><div class="ar-choices">${acts.map((a, i) => `<button class="btn ${a.choix === "main" ? "gold" : ""}" type="button" data-i="${i}">${a.choix === "main" ? "Une carte au hasard dans sa main" : esc(defOf(posed.find((c) => c.uid === a.choix)).nom || "Carte posée")}</button>`).join("")}</div><button class="btn sm" type="button" id="ar-choixX">Annuler</button>`;
    $a("sheet").querySelectorAll("[data-i]").forEach((b) => { b.onclick = () => { closeModal(); act(acts[+b.dataset.i]); }; });
    $a("choixX").onclick = closeModal; $a("modal").classList.add("on");
  }
  function tapCard(uid) {
    const v = CF.table.vue, fin = finAct(), c = v.main.find((x) => x.uid === uid);
    if (st.running) return hint("Un instant : l'action en cours se termine.");
    if (reactTap(c)) return;
    const ps = plays(uid);
    if (fin?.aDefausser > 0 && (st.discMode || !ps.length)) { st.discard = st.discard.includes(uid) ? st.discard.filter((x) => x !== uid) : [...st.discard, uid].slice(-fin.aDefausser); layoutHand(); return renderSide(); }
    if (targeting && targeting.uid !== uid) cancelTarget();
    if (st.sel === uid) { st.sel = null; const free = ps.find((a) => !a.cible); cancelTarget(); layoutHand(); if (free) act(free); return; }
    st.sel = uid; layoutHand(); hint(tipFor(c));
    if (ps.some((a) => a.cible)) startTarget(uid);
  }
  // toucher sa Parade (ou sa Riposte…) pendant une réaction : la joue
  function reactTap(c) {
    const v = CF.table.vue, pr = v.attente; if (!c || !pr || pr.pid !== v.moi || pr.kind === "tour") return false;
    const a = (v.actions || []).find((x) => (x.type === "parer" && c.def === "parade") || (x.type === "riposter" && c.def === "riposte") || (x.type === "elixir" && c.def === "elixir") || (x.type === "defausser" && c.def === "frappe"));
    if (a) act(a); return !!a;
  }
  function bindHand() {
    const el = $a("hand");
    el.addEventListener("pointerdown", (e) => { const c = e.target.closest(".ar-hc"); if (!c || !st) return; drag = { uid: c.dataset.cu, el: c, x0: e.clientX, y0: e.clientY, on: false, id: e.pointerId }; });
    addEventListener("pointermove", (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.on) { if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 10 || !plays(drag.uid).length) return; startDrag(); }
      const g = drag.ghost, w = g.offsetWidth, ht = g.offsetHeight;
      if (targeting) {
        const ax = drag.r.left + drag.r.width / 2, ay = drag.r.top - 10; g.style.left = ax - w / 2 + "px"; g.style.top = drag.r.top - ht * .35 + "px";
        $a("aim").classList.add("on"); $a("aimPath").setAttribute("d", `M${ax},${ay} Q${(ax + e.clientX) / 2},${Math.min(ay, e.clientY) - 80} ${e.clientX},${e.clientY}`); $a("aimEnd").setAttribute("cx", e.clientX); $a("aimEnd").setAttribute("cy", e.clientY);
        const p = pickAt(e); hover(p && targetsFor(p).length ? p : null);
      } else { g.style.left = e.clientX - w / 2 + "px"; g.style.top = e.clientY - ht * .6 + "px"; g.style.boxShadow = e.clientY < innerHeight * .68 ? "0 0 40px var(--cc)" : ""; }
    });
    addEventListener("pointerup", (e) => {
      if (!drag || e.pointerId !== drag.id) return; const d = drag; drag = null;
      if (!d.on) return tapCard(d.uid);
      $a("aim").classList.remove("on"); d.ghost.remove(); d.el.classList.remove("lifted");
      if (targeting) { const p = pickAt(e); if (p && targetsFor(p).length) return pickTarget(p); cancelTarget(); st.sel = null; return layoutHand(); }
      st.sel = null; layoutHand();
      const free = plays(d.uid).find((a) => !a.cible); if (free && e.clientY < innerHeight * .68) act(free);
    });
  }
  function startDrag() {
    drag.on = true; drag.r = drag.el.getBoundingClientRect(); st.sel = drag.uid; startTarget(drag.uid);
    const g = drag.el.cloneNode(true); g.classList.add("ar-drag"); g.style.width = drag.r.width + "px"; g.style.height = drag.r.height + "px"; g.style.transform = "scale(1.12)"; g.style.left = drag.r.left + "px"; g.style.top = drag.r.top + "px";
    $a("root").appendChild(g); drag.ghost = g; drag.el.classList.add("lifted");
  }
  function pickAt(e) { const t = document.elementFromPoint(e.clientX, e.clientY)?.closest?.(".ar-tag"); if (t) return champ(t.dataset.pid); return champAt(e); }
  function champAt(e) {
    if (!st) return null;
    R.ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); R.ray.setFromCamera(R.ndc, R.camera);
    const h = R.ray.intersectObjects(st.champs.flatMap((p) => [p.card, p.ped]), false)[0]; return h?.object.userData.p || null;
  }
  async function act(a) {
    hint(""); await cfAct(a);
  }
  function onEnd() {
    const fin = finAct(); if (!fin) return;
    if (fin.aDefausser > 0 && st.discard.length < fin.aDefausser) { st.discMode = true; st.sel = null; cancelTarget(); layoutHand(); hint(`Touche ${fin.aDefausser - st.discard.length} carte(s) à défausser, puis « Défausser et finir ».`); return; }
    st.discMode = false;
    act({ type: "finir", defausse: st.discard.slice(0, fin.aDefausser), promptId: fin.promptId });
  }

  // ---------- côté droit, réactions, chrono ----------
  const LBL = { parer: "Parer", riposter: "Riposter", encaisser: "Encaisser (−1 PV)", defausser: "Défausser une Frappe", elixir: "Boire un Élixir (+1 PV)", survie: "Ténacité : défausser 2 cartes (+1 PV)" };
  function renderSide() {
    const v = CF.table.vue, fin = finAct(), btn = $a("end");
    $a("deckN").textContent = v.pioche;
    btn.disabled = !fin || st.running;
    btn.textContent = fin?.aDefausser ? (st.discMode ? `Défausser ${st.discard.length}/${fin.aDefausser} et finir` : `Fin du tour (${fin.aDefausser} carte${fin.aDefausser > 1 ? "s" : ""} de trop)`) : "Fin du tour";
    if (!fin) { btn.classList.remove("low"); st.discMode = false; }
    $a("quit").hidden = !(v.actions || []).some((a) => a.type === "abandon") || v.phase !== "partie";
    const me = v.joueurs.find((j) => j.id === v.moi), pr = v.attente;
    $a("chatForm").hidden = $a("qp").hidden = $a("emoBtn").hidden = !me;
    if (!me) hint("Tu regardes la partie en spectateur.");
    else if (!me.vivant && v.phase === "partie") hint("Tu es éliminé. Tu peux regarder la fin de la partie.");
    else if (pr && pr.pid === v.moi && pr.kind === "tour" && !st.sel) hint(v.tour?.entrave ? "Tu es entravé : finis ton tour." : fin?.aDefausser && st.discMode ? `Touche ${Math.max(0, fin.aDefausser - st.discard.length)} carte(s) à défausser, puis « Défausser et finir ».` : fin?.aDefausser ? `Joue tes cartes, puis « Défausser et finir » : tu gardes au plus ${CF.table.vue.limiteMain} cartes.` : "C'est ton tour : glisse une carte sur un champion, ou vers le haut.");
    else if (pr && pr.pid !== v.moi && v.phase === "partie") hint(`${nm(pr.pid)} ${pr.kind === "tour" ? "joue" : "réfléchit"}…`);
    // rôle
    const chip = $a("chip");
    if (v.monRole) { chip.hidden = false; chip.style.setProperty("--rc", ROLE_COL[v.monRole]); chip.innerHTML = `<i>${ico(v.monRole)}</i><span><b>${esc(ROLES[v.monRole]?.nom || v.monRole)}</b><small>ton rôle${v.monRole === "gardien" ? "" : " secret"} · touche pour le relire</small></span>`; }
    else if (me && v.mode !== "classique") { chip.hidden = false; chip.style.setProperty("--rc", "var(--gold)"); chip.innerHTML = `<i>${ico("duel")}</i><span><b>${v.mode === "duel" ? "Duel" : "Trio"}</b><small>pas de rôle, chacun pour soi</small></span>`; }
    else chip.hidden = true;
  }
  function renderReact() {
    const v = CF.table.vue, pr = v.attente, box = $a("react");
    const mine = pr && pr.pid === v.moi && pr.kind !== "tour" && !st.running;
    box.classList.toggle("on", !!mine); if (!mine) return;
    const acts = v.actions || [], garder = acts.find((a) => a.type === "garder"), prendre = acts.filter((a) => a.type === "prendre");
    const src = pr.src ? nm(pr.src) : "";
    $a("reactTxt").textContent = pr.kind === "reaction" ? `${src} t'attaque${pr.nature === "pluie" ? " (Pluie de shurikens)" : pr.nature === "riposte" ? " (Riposte)" : ""} ! Pare, riposte ou encaisse.` : PROMPT_TXT[pr.kind] || "À toi.";
    st.garder ||= [];
    $a("reactCards").innerHTML = garder ? (v.attente.cartes || []).map((c) => `<button type="button" class="ar-mini ${st.garder.includes(c.uid) ? "on" : ""}" data-g="${c.uid}" style="--cc:${famCol(c)}"><span class="${typeof ILLUS_CARTE === "object" && ILLUS_CARTE[c.def] ? "cfart-" + c.def : ""}"></span>${esc(defOf(c).nom)}</button>`).join("")
      : prendre.length ? prendre.map((a) => { const c = v.etal.find((x) => x.uid === a.carte) || {}; return `<button type="button" class="ar-mini" data-take="${a.carte}" style="--cc:${famCol(c)}"><span class="${typeof ILLUS_CARTE === "object" && ILLUS_CARTE[c.def] ? "cfart-" + c.def : ""}"></span>${esc(defOf(c).nom || "?")}</button>`; }).join("") : "";
    const btns = acts.filter((a) => LBL[a.type] || a.type === "piocher").map((a, i) => `<button class="btn ${a.type === "encaisser" ? "acc" : "gold"}" type="button" data-a="${i}">${a.type === "piocher" ? (a.cible ? `Voler une carte à ${esc(nm(a.cible))}` : "Piocher normalement") : LBL[a.type]}</button>`);
    if (garder) btns.push(`<button class="btn gold" type="button" data-keep="1" ${st.garder.length === garder.nombre ? "" : "disabled"}>Garder (${st.garder.length}/${garder.nombre})</button>`);
    const list = acts.filter((a) => LBL[a.type] || a.type === "piocher");
    $a("reactBtns").innerHTML = btns.join("");
    $a("reactBtns").querySelectorAll("[data-a]").forEach((b) => { b.onclick = () => act(list[+b.dataset.a]); });
    $a("reactBtns").querySelector("[data-keep]")?.addEventListener("click", () => { const k = st.garder; st.garder = []; act({ type: "garder", cartes: k, promptId: garder.promptId }); });
    $a("reactCards").querySelectorAll("[data-g]").forEach((b) => { b.onclick = () => { const u = b.dataset.g; st.garder = st.garder.includes(u) ? st.garder.filter((x) => x !== u) : [...st.garder, u].slice(-garder.nombre); renderReact(); }; });
    $a("reactCards").querySelectorAll("[data-take]").forEach((b) => { b.onclick = () => act(prendre.find((a) => a.carte === b.dataset.take)); });
  }
  function tickTimer() {
    const v = CF.table?.vue, pr = v?.attente; if (!st) return;
    if (!pr?.deadline || v.phase !== "partie") { st.deadline = null; return; }
    if (st.deadline?.id !== pr.id) st.deadline = { id: pr.id, end: pr.deadline, dur: Math.max(5000, pr.deadline - Date.now()) };
    const left = Math.max(0, st.deadline.end - Date.now()), k = left / st.deadline.dur, low = left < 10000;
    const tag = document.getElementById("ar-tag-" + pr.pid), bar = tag?.querySelector(".ar-tm");
    if (bar) { bar.classList.add("on"); bar.classList.toggle("low", low); bar.firstChild.style.transform = `scaleX(${k})`; }
    if (pr.pid === v.moi) { $a("reactBar").style.transform = `scaleX(${k})`; $a("end").classList.toggle("low", low && pr.kind === "tour"); }
  }

  // ---------- événements du journal : animations ----------
  async function play(e) {
    const p = champ(e.pid), c = e.carte, d = c?.def;
    switch (e.type) {
      case "tour": { const me = e.pid === CF.table.vue.moi; banner(me ? "Ton tour" : `Tour de ${nm(e.pid)}`, me ? "#2ee6ff" : col(p?.branch)); await wait(700); break; }
      case "joue": {
        const to = champ(e.cible);
        if (p) pop(p, defOf(c).nom || d, famCol(c), true);
        if (d === "frappe") await attackFx(p, to);
        else if (d === "pluie") await pluieFx(p);
        else if (d === "onde") await ondeFx(p);
        else if (d === "elixir") { healFx(p); pop(p, "+1", "#3fdc8f"); if (p) p.pv = e.pv ?? p.pv; renderTags(); await wait(500); }
        else if (d === "festin") { st.champs.filter((q) => q.alive && q.pv < q.pvMax).forEach((q) => { healFx(q); pop(q, "+1", "#3fdc8f"); q.pv++; }); renderTags(); await wait(700); }
        else if (d === "lien") { await beam(p, to, "#3fdc8f"); healFx(to); if (p) { p.pv--; hitFx(p, "#3fdc8f"); } if (to) to.pv++; renderTags(); }
        else if (d === "defi") await beam(p, to, "#ff9b3d", .9);
        else if (d === "sceau") { await beam(p, to, "#ff4d5e", .6); if (to) setSeal(to, true, true); }
        else if (d === "orbe") { if (p) setOrb(p, true); emit(60, worldOf(p, 2.4), "#ff7a1a", { speed: 2, life: .8, grav: 0 }); await wait(400); }
        else if (d === "larcin") await flyCard(e.prise || null, to, p);
        else if (d === "dissipation") { if (to) hitFx(to, "#8a8590"); await flyCard(e.defaussee || null, to, null); }
        else if (d === "inspiration" || d === "revelation" || d === "etal") { emit(60, worldOf(p, 1.6), "#4dd6ff", { speed: 2, life: .9, grav: -.5 }); await wait(450); }
        else if (defOf(c).cat === "arme") { if (p) setWeapon(p, d, true); await wait(500); }
        else if (defOf(c).type === "equipement") { emit(40, worldOf(p, 1.8), famCol(c), { speed: 2, life: .8, grav: 0 }); await wait(400); }
        break;
      }
      case "degats": if (p) { hitFx(p, e.cause === "onde" ? "#f5a524" : "#ff4d5e"); pop(p, "-" + e.n, "#ff4d5e"); p.pv = e.pv; renderTags(); } await wait(420); break;
      case "pare": if (p) { shield(p); pop(p, "Paré !", "#2ee6ff", true); } await wait(520); break;
      case "riposte": if (p) { shield(p); pop(p, "Riposte !", "#2ee6ff", true); } await wait(300); await attackFx(p, champ(e.cible)); break;
      case "esquive": if (p) { shield(p, "#5ac8fa"); pop(p, "Esquivé !", "#5ac8fa", true); } await wait(520); break;
      case "kanji_absorbe": if (p) { pop(p, "Garde : aucun dégât", "#e8c77e", true); emit(50, worldOf(p, 1.3), "#e8c77e", { speed: 2.5, life: .8, grav: 0 }); } await wait(500); break;
      case "elimination": if (p) { pop(p, "Éliminé", "#ff4d5e", true); p.alive = false; eliminateFx(p); if (e.role) p.role = e.role; renderTags(); } await wait(900); break;
      case "presage": omen(p, e); await wait(1300); break;
      case "orbe_explose": if (p) { setOrb(p, false); const o = worldOf(p, 1.6); emit(160, o, "#ff7a1a", { speed: 5, life: 1, grav: 2 }); ring(new THREE.Vector3(o.x, .05, o.z), "#ff7a1a", 4, .8); flash("#ff7a1a", .4); R.shake = .3; } await wait(700); break;
      case "orbe_passe": { const a = champ(e.de), b = champ(e.a); if (a) setOrb(a, false); await beam(a, b, "#ff7a1a", .5); if (b) setOrb(b, true); break; }
      case "sauvetage": case "survie": if (p) { healFx(p); pop(p, "Sauvé !", "#3fdc8f", true); p.pv = e.pv ?? p.pv; renderTags(); } await wait(600); break;
      case "entrave": if (p) pop(p, "Entravé : passe son tour", "#ff4d5e", true); await wait(600); break;
      case "entrave_brisee": if (p) { setSeal(p, false); pop(p, "Libéré !", "#3fdc8f", true); } await wait(500); break;
      case "vol": case "vol_public": await flyCard(e.carte || null, champ(e.cible), p); break;
      case "etal_pris": await flyCard(e.carte, null, p); break;
      case "pioche_publique": if (p) pop(p, `+${e.n} carte${e.n > 1 ? "s" : ""}`, "#4dd6ff", true); break;
      case "defi_perdu": case "effondrement": if (p) hitFx(p, "#ff9b3d"); break;
      case "onde_evitee": case "defi_relance": if (p) pop(p, "Défausse une Frappe", "#f5a524", true); await wait(300); break;
      case "fin": showEnd(); break;
    }
  }
  async function runQueue() {
    if (st.running) return; st.running = true; renderSide(); renderReact();
    const gid = st.gid;
    while (st && st.gid === gid && st.queue.length) {
      const e = st.queue.shift();
      if (logged(e)) { st.log.push(logLine(e)); renderLog(); }
      if (st.queue.length > 24 && e.type !== "fin") continue;
      try { await play(e); } catch (err) { console.warn(err); }
    }
    if (!st || st.gid !== gid) return;
    st.running = false;
    refresh(false);
  }
  function chatAdd(m, live) {
    const p = champ(m.pid), mine = m.pid === CF.table?.vue?.moi;
    if (!mine && st.muted && live) return;
    const emo = m.kind === "emote", E = emo && EMOTES.find((x) => x[0] === m.v);
    const d = document.createElement("div"); d.className = "ar-cm" + (emo ? " emo" : "") + (mine ? " me" : "");
    d.innerHTML = `<b style="color:${col(p?.branch)}">${esc(nm(m.pid))}</b> ${emo ? `${ico(m.v)} ${esc(E ? E[1] : m.v)}` : esc(m.v)}`;
    $a("chatList").appendChild(d); $a("chatList").scrollTop = 1e6;
    if (!live) return;
    bubble(p, emo ? `<b>${ico(m.v)}</b>${esc(E ? E[1] : "")}` : esc(m.v), emo);
    const t = $a("log"); if (!mine && !(t.classList.contains("open") && t.dataset.tab === "chat")) { st.unread++; $a("chatN").textContent = st.unread; }
  }
  async function salon(kind, v) {
    if (!st) return;
    try { const r = await srv("confront/salon", { gid: st.gid, kind, v }); CF.table = r; sync(r); }
    catch (e) { toast(e.message); }
  }
  function showEnd() {
    const v = CF.table.vue, res = v.resultat; if (!res) return;
    const won = res.gagnants?.includes(v.moi), roles = res.roles || {};
    $a("endTxt").textContent = !v.moi ? "Partie terminée" : won ? "Victoire" : "Défaite";
    $a("endSub").textContent = `${res.gagnants?.length ? `Gagnants : ${res.gagnants.map(nm).join(", ")}.` : "Aucun gagnant."}${res.camp ? ` Camp gagnant : ${{ gardien: "Gardien et Sentinelles", briseurs: "Briseurs", errant: "Errant" }[res.camp] || res.camp}.` : ""} ${Object.entries(roles).filter(([, r]) => r).map(([id, r]) => `${nm(id)} : ${ROLES[r]?.nom || r}`).join(" · ")}`;
    setTimeout(() => $a("endo").classList.add("on"), 900);
    if (won) for (let k = 0; k < 5; k++) setTimeout(() => emit(80, new THREE.Vector3((Math.random() - .5) * 6, 3, (Math.random() - .5) * 4), ["#e8c77e", "#2ee6ff", "#ff2e88"][k % 3], { speed: 4, life: 1.4, grav: 2 }), k * 260);
  }

  // ---------- boucle ----------
  function frame(now) {
    if (!R.on) return;
    const dt = Math.min(.05, (now - R.last) / 1000) * (window.__arSpeed || 1); R.last = now; R.clockT += dt;
    for (const tw of [...R.tweens]) { const k = Math.min(1, (R.clockT - tw.t0) / tw.dur); tw.fn(tw.ease(k), k); if (k >= 1) { R.tweens.splice(R.tweens.indexOf(tw), 1); tw.res(); } }
    for (const p of st?.champs || []) {
      p.bill.rotation.y = Math.atan2(R.camera.position.x - p.root.position.x, R.camera.position.z - p.root.position.z);
      if (p.alive) { p.card.position.y = .95 + Math.sin(R.clockT * 1.6 + p.seat) * .03; p.aura.material.opacity = .2 + Math.sin(R.clockT * 2 + p.seat) * .06; }
      p.eqG.forEach((g, i) => { const a = R.clockT * 1.3 + i * Math.PI * 2 / p.eqG.length; g.position.set(Math.cos(a) * 1.05, 1.95 + Math.sin(a * 2) * .05, Math.sin(a) * .3); });
      if (p.sealM) { p.sealM.rotation.z += dt * .8; p.sealM.material.opacity = .65 + Math.sin(R.clockT * 4) * .2; }
      if (p.orbM) { p.orbM.position.y = 2.45 + Math.sin(R.clockT * 3) * .06; p.orbM.scale.setScalar(1 + Math.sin(R.clockT * 7) * .08); p.orbM.rotation.y += dt * 2; }
      if (p.wMesh) { p.wMesh.position.y = Math.sin(R.clockT * 2.2 + p.seat) * .06; p.wMesh.rotation.y = Math.sin(R.clockT + p.seat) * .5; }
    }
    stepParticles(dt);
    R.shake *= Math.exp(-dt * 6);
    R.camera.position.copy(R.cam.pos).add(new THREE.Vector3((Math.random() - .5) * R.shake, (Math.random() - .5) * R.shake, 0)); R.camera.lookAt(R.cam.look);
    if (st) { placeTags(); tickTimer(); }
    R.composer.render(dt); requestAnimationFrame(frame);
  }

  // ---------- entrée publique ----------
  // appelée à chaque rendu de la table (views6) : met l'arène à jour avec la dernière vue du serveur
  function refresh(fx = true) {
    const T = CF.table, v = T.vue;
    if (!st.running) applyView(v, fx);
    syncHand(v, fx); renderSide(); renderReact(); layoutHand();
  }
  function sync(T) {
    if (!T?.vue || !THREE) return;
    mount(); initRenderer();
    const root = $a("root");
    if (root.hidden) { root.hidden = false; document.body.classList.add("ar-on"); R.on = true; R.last = performance.now(); requestAnimationFrame(frame); }
    if (!st || st.gid !== T.gid) { hand.forEach((h) => h.el.remove()); hand = []; $a("chatList").innerHTML = ""; $a("endo").classList.remove("on"); setup(T); syncHand(T.vue, false); $a("load").hidden = true; if (T.vue.phase === "fin") showEnd(); }
    const v = T.vue, fresh = (v.journal || []).filter((e) => e.seq > st.lastSeq);
    if (fresh.length) { st.lastSeq = Math.max(...fresh.map((e) => e.seq)); st.queue.push(...fresh); }
    for (const m of (T.salon || []).filter((x) => x.id > st.lastSalon)) { st.lastSalon = m.id; chatAdd(m, true); }
    if (v.monRole && !st.roleShown) { st.roleShown = true; let seen = false; try { seen = sessionStorage.getItem("cf-role-" + T.gid) === "1"; sessionStorage.setItem("cf-role-" + T.gid, "1"); } catch (e) {} if (!seen) setTimeout(showRole, 600); }
    if (st.queue.length) runQueue();
    refresh(true);
  }
  function hide() {
    const root = $a("root"); if (!root || root.hidden) return;
    root.hidden = true; document.body.classList.remove("ar-on"); if (R) R.on = false;
    targeting = null; drag = null; closeModal();
  }
  // la table doit-elle s'afficher dans l'arène ? (sinon : vue classique)
  function wants(T) {
    const ph = T?.vue?.phase;
    if (!T || T.error || (ph !== "partie" && ph !== "fin") || !usable()) return false;
    if (!THREE) { load().then(() => { if (THREE && CF.table === T && view === "confront") draw(); }); return false; }
    return true;
  }
  addEventListener("hashchange", () => { if (st && !location.hash.startsWith("#/confront/" + st.gid)) hide(); });
  return { wants, sync, hide, usable, setWanted, offer: () => !failed && !wanted() && webgl(), loading: () => !!loading && !THREE && !failed, get st() { return st; } };
})();
