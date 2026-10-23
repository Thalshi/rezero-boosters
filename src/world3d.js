// ===== Le monde 3D du QG : une vraie scène Three.js derrière toute l'app =====
// Même ADN que les tirages et l'arène : le temple de nuit au fond, le sol de pierre et son cercle de runes d'or
// qui tourne, les lueurs rose et cyan, des braises d'or et des pétales qui flottent. La caméra suit doucement
// la souris (ou l'inclinaison du téléphone) et le défilement de la page. Mise en pause pendant les ouvertures,
// dans l'arène et quand l'onglet est caché. Sans WebGL ou avec les animations réduites : le fond CSS reste.
const World3D = (() => {
  const LS = "rz-world";
  let T = null, R = null, loading = null, failed = false, raf = 0;
  const pref = () => { try { return localStorage.getItem(LS); } catch (e) { return null; } };
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const webgl = () => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; } };
  // les navigateurs pilotés par les tests gardent le fond CSS, sauf si un test demande le monde 3D
  const usable = () => !failed && !reduced() && pref() !== "0" && (!navigator.webdriver || pref() === "1") && webgl();
  const busy = () => document.hidden || !!document.querySelector("#stage:not([hidden]) .o3") || document.body.classList.contains("ar-on");

  function tex(w, h, paint) { const c = document.createElement("canvas"); c.width = w; c.height = h; paint(c.getContext("2d"), w, h); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t; }
  function build() {
    const canvas = document.createElement("canvas"); canvas.className = "w3d"; canvas.setAttribute("aria-hidden", "true");
    document.body.prepend(canvas);
    const renderer = new T.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.25 : 1.5)); renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    const scene = new T.Scene(); scene.background = new T.Color("#07060f"); scene.fog = new T.Fog("#0c0818", 12, 34);
    const camera = new T.PerspectiveCamera(46, 1, 0.1, 100);
    const hemi = new T.HemisphereLight("#9a7fd0", "#140a20", 0.7); scene.add(hemi);
    const pink = new T.PointLight("#ff2e88", 26, 14, 1.6); pink.position.set(5, 2.2, 2); scene.add(pink);
    const cyan = new T.PointLight("#2ee6ff", 22, 14, 1.6); cyan.position.set(-5, 2, 1); scene.add(cyan);
    const gold = new T.PointLight("#ffb060", 18, 10, 1.6); gold.position.set(0, 1.4, -2); scene.add(gold);
    // le décor au fond : un panorama par rubrique (setBg), posé sur un grand cylindre
    // le sol de pierre et le cercle de runes
    const floorTex = tex(1024, 1024, (g, w) => {
      g.fillStyle = "#231d30"; g.fillRect(0, 0, w, w); g.translate(w / 2, w / 2);
      for (let r = 60; r < 520; r += 62) { const n = Math.round(r / 18); for (let i = 0; i < n; i++) { const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2; g.fillStyle = `hsl(265, 14%, ${11 + Math.random() * 7}%)`; g.beginPath(); g.arc(0, 0, r + 58, a0, a1); g.arc(0, 0, r, a1, a0, true); g.fill(); g.strokeStyle = "#0006"; g.lineWidth = 3; g.stroke(); } }
      g.fillStyle = "#0005"; for (let i = 0; i < 4000; i++) g.fillRect((Math.random() - .5) * w, (Math.random() - .5) * w, 2, 2);
    });
    const floor = new T.Mesh(new T.CircleGeometry(16, 96), new T.MeshStandardMaterial({ map: floorTex, roughness: .8, metalness: .15 }));
    floor.rotation.x = -Math.PI / 2; scene.add(floor);
    const runeTex = tex(1024, 1024, (g, w) => {
      g.translate(w / 2, w / 2); g.strokeStyle = "#e8c77e"; g.shadowColor = "#e8c77e"; g.shadowBlur = 12;
      g.lineWidth = 7; for (const r of [470, 490]) { g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke(); }
      g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 330, 0, 7); g.stroke(); g.beginPath(); g.arc(0, 0, 120, 0, 7); g.stroke();
      for (let i = 0; i < 8; i++) { g.save(); g.rotate(i / 8 * Math.PI * 2); g.beginPath(); g.moveTo(0, -120); g.lineTo(0, -470); g.stroke(); g.restore(); }
      for (let i = 0; i < 36; i++) { g.save(); g.rotate(i / 36 * Math.PI * 2); g.translate(0, -410); g.rotate(Math.PI / 4); g.strokeRect(-10, -10, 20, 20); g.restore(); }
      // l'emblème du jeu au centre
      g.save(); g.scale(6, 6); g.translate(-12, -12); g.lineWidth = 1.2; g.lineCap = g.lineJoin = "round";
      for (const m of ((typeof ICON === "object" && ICON.logo) || "").matchAll(/ d="([^"]+)"/g)) g.stroke(new Path2D(m[1])); g.restore();
    });
    const runes = new T.Mesh(new T.PlaneGeometry(13, 13), new T.MeshBasicMaterial({ map: runeTex, transparent: true, opacity: .6, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
    runes.rotation.x = -Math.PI / 2; runes.position.y = .02; scene.add(runes);
    // lanternes autour du cercle
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2 + Math.PI / 6, x = Math.cos(a) * 12, z = Math.sin(a) * 6 - 7; if (Math.abs(x) < 7) continue;
      const post = new T.Mesh(new T.CylinderGeometry(.12, .16, 2, 8), new T.MeshStandardMaterial({ color: "#2a2030", roughness: .5, metalness: .4 })); post.position.set(x, 1, z); scene.add(post);
      const lamp = new T.Mesh(new T.BoxGeometry(.5, .6, .5), new T.MeshBasicMaterial({ color: new T.Color("#ffb060").multiplyScalar(1.6), toneMapped: false })); lamp.position.set(x, 2.2, z); scene.add(lamp);
      const roof = new T.Mesh(new T.ConeGeometry(.5, .32, 4), new T.MeshStandardMaterial({ color: "#1d1626" })); roof.position.set(x, 2.66, z); roof.rotation.y = Math.PI / 4; scene.add(roof);
    }
    // braises d'or et pétales
    const glow = tex(64, 64, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, "#fff"); r.addColorStop(.35, "#ffffffaa"); r.addColorStop(1, "#fff0"); g.fillStyle = r; g.fillRect(0, 0, w, w); });
    const N = innerWidth < 700 ? 90 : 160, pos = new Float32Array(N * 3), sp = [];
    for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - .5) * 22; pos[i * 3 + 1] = Math.random() * 8; pos[i * 3 + 2] = (Math.random() - .5) * 14 - 2; sp.push(.15 + Math.random() * .35); }
    const pg = new T.BufferGeometry(); pg.setAttribute("position", new T.BufferAttribute(pos, 3));
    const motes = new T.Points(pg, new T.PointsMaterial({ map: glow, color: "#f0c060", size: .16, transparent: true, opacity: .9, blending: T.AdditiveBlending, depthWrite: false, toneMapped: false }));
    scene.add(motes);
    const PN = innerWidth < 700 ? 30 : 60, petals = new T.InstancedMesh(new T.PlaneGeometry(.12, .08), new T.MeshBasicMaterial({ color: "#ffb3d6", side: T.DoubleSide, transparent: true, opacity: .85 }), PN), pet = [];
    for (let i = 0; i < PN; i++) pet.push({ p: new T.Vector3((Math.random() - .5) * 20, Math.random() * 9, (Math.random() - .5) * 12 - 2), r: new T.Euler(Math.random() * 6, Math.random() * 6, 0), s: Math.random() });
    scene.add(petals);
    R = { hemi, canvas, renderer, scene, camera, runes, motes, pos, sp, N, petals, pet, PN, pink, cyan, gold, m: new T.Matrix4(), q: new T.Quaternion(), one: new T.Vector3(1, 1, 1),
      tx: 0, ty: 0, x: 0, y: 0, t: 0, last: performance.now() };
    const resize = () => { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.fov = innerWidth < 700 ? 58 : 46; camera.updateProjectionMatrix(); };
    addEventListener("resize", resize); resize();
    addEventListener("pointermove", (e) => { R.tx = e.clientX / innerWidth - .5; R.ty = e.clientY / innerHeight - .5; }, { passive: true });
    addEventListener("deviceorientation", (e) => { if (e.gamma == null) return; R.tx = Math.max(-.5, Math.min(.5, e.gamma / 60)); R.ty = Math.max(-.5, Math.min(.5, (e.beta - 45) / 80)); }, { passive: true });
    document.documentElement.classList.add("w3d-on");
  }
  function frame(now) {
    raf = 0; if (!R) return;
    if (busy()) { setTimeout(() => { if (!raf) raf = requestAnimationFrame(frame); }, 500); return; }
    const dt = Math.min(.05, (now - R.last) / 1000); R.last = now; R.t += dt;
    R.x += (R.tx - R.x) * Math.min(1, dt * 2.5); R.y += (R.ty - R.y) * Math.min(1, dt * 2.5);
    const sc = Math.min(1, scrollY / Math.max(1, innerHeight * 2));
    R.camera.position.set(R.x * 2.2, 3.4 - sc * 1.2 - R.y * .8, 9.5 + sc * 1.5); R.camera.lookAt(R.x * .6, .8 - sc * .6, 0);
    R.runes.rotation.z += dt * .05; R.runes.material.opacity = .5 + Math.sin(R.t * 1.3) * .12;
    R.pink.intensity = 22 + Math.sin(R.t * 1.1) * 6; R.cyan.intensity = 20 + Math.sin(R.t * .9 + 1) * 5; R.gold.intensity = 16 + Math.sin(R.t * 2.3) * 3;
    const p = R.pos; for (let i = 0; i < R.N; i++) { p[i * 3 + 1] += R.sp[i] * dt; p[i * 3] += Math.sin(R.t + i) * dt * .08; if (p[i * 3 + 1] > 8) p[i * 3 + 1] = 0; }
    R.motes.geometry.attributes.position.needsUpdate = true;
    R.pet.forEach((d, i) => { d.p.y -= dt * (.3 + d.s * .2); d.p.x += Math.sin(R.t * .7 + i) * dt * .3 + dt * .2; d.r.x += dt * d.s; d.r.y += dt * .6; if (d.p.y < 0) { d.p.y = 9; d.p.x = (Math.random() - .5) * 20; } R.q.setFromEuler(d.r); R.m.compose(d.p, R.q, R.one); R.petals.setMatrixAt(i, R.m); });
    R.petals.instanceMatrix.needsUpdate = true;
    R.renderer.render(R.scene, R.camera);
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (R || loading || !usable()) return;
    loading = import("three").then((t) => { T = t; build(); if (wantBg) { const u = wantBg; wantBg = null; setBg(u); } if (wantTint) setTint(...wantTint); raf = requestAnimationFrame(frame); }).catch(() => { failed = true; });
  }
  addEventListener("visibilitychange", () => { if (!document.hidden && R && !raf) raf = requestAnimationFrame(frame); });
  // change le panorama du fond, en fondu (appelé à chaque changement de rubrique)
  let bgMesh = null, bgUrl = null, wantBg = null;
  // l'image est décodée hors du fil principal (createImageBitmap) et les derniers décors restent prêts
  // sur la carte graphique : changer de rubrique ne fige plus l'écran
  const bgCache = new Map();
  function bgTexture(url) {
    if (bgCache.has(url)) { const t = bgCache.get(url); bgCache.delete(url); bgCache.set(url, t); return t; }
    const p = fetch(url).then((r) => r.blob()).then((b) => createImageBitmap(b, { imageOrientation: "flipY" })).then((img) => {
      const t = new T.Texture(img); t.flipY = false; t.colorSpace = T.SRGBColorSpace; t.wrapS = T.RepeatWrapping; t.repeat.set(-1, 1); t.anisotropy = 8; t.needsUpdate = true;
      try { R.renderer.initTexture(t); } catch {}
      return t;
    }).catch(() => new Promise((ok) => { const img = new Image(); img.onload = () => { const t = new T.Texture(img); t.colorSpace = T.SRGBColorSpace; t.wrapS = T.RepeatWrapping; t.repeat.set(-1, 1); t.needsUpdate = true; ok(t); }; img.src = url; }));
    bgCache.set(url, p);
    while (bgCache.size > 4) { const [k, v] = bgCache.entries().next().value; bgCache.delete(k); v.then((t) => { if (bgMesh?.material.map !== t) t.dispose(); }); }
    return p;
  }
  function setBg(url) {
    wantBg = url; if (!R || !url || url === bgUrl) return; bgUrl = url;
    bgTexture(url).then((t) => {
      if (bgUrl !== url || !R) return;
      const img = t.image, Rr = 22, th = 2.3, Hd = Rr * th / (img.width / img.height);
      const m = new T.Mesh(new T.CylinderGeometry(Rr, Rr, Hd, 72, 1, true, Math.PI - th / 2, th), new T.MeshBasicMaterial({ map: t, side: T.BackSide, color: "#ffffff", fog: false }));
      m.position.set(0, Hd / 2 - 2.2, 0); m.renderOrder = -1; R.scene.add(m);
      // changement net : l'ancien décor disparaît dès que le nouveau est prêt (pas de mélange des deux)
      const old = bgMesh; bgMesh = m;
      if (old) { R.scene.remove(old); old.geometry.dispose(); old.material.dispose(); if (![...bgCache.values()].length || !bgCache.has(old.userData.url)) old.material.map.dispose(); }
      m.userData.url = url;
    });
  }
  // teinte du monde selon le décor : brume, ciel, lumières (accent et ombre du panorama)
  let wantTint = null;
  function setTint(accent, deep) {
    wantTint = [accent, deep]; if (!R) return;
    const a = new T.Color(accent), d = new T.Color(deep);
    R.scene.fog.color.copy(d).multiplyScalar(.7); R.scene.background.copy(d).multiplyScalar(.45);
    R.hemi.color.copy(a).lerp(new T.Color("#ffffff"), .35); R.hemi.groundColor.copy(d);
    R.pink.color.copy(a); R.gold.color.copy(a).lerp(new T.Color("#ffb060"), .5);
  }
  return { start, setBg, setTint, get on() { return !!R; } };
})();
