// ===== Ouvertures en 3D : le coffre (×10, 2 boosters) et la pochette (×5, un booster) =====
// Les cartes viennent du serveur : la 3D ne fait que les montrer. Le coffre se brise après le tour de clé, la
// pochette se déchire au doigt ; la lumière annonce la meilleure rareté. Ensuite les cartes se retournent une à une
// et les Légendaires et Mythiques « prennent vie ». Les cosmétiques du Sanctuaire passent au dévoilement habituel.
// Sans WebGL, si Three.js ne charge pas, en « mouvements réduits » ou en « version légère », l'ancienne ouverture reste.
const Open3D = (() => {
  const LS = "rz-3d", HEX = { c: "#b5b1bb", pc: "#3fbf7f", r: "#4d9bff", e: "#b072ff", l: "#f5c518", m: "#ff4d2e" }, GOLD = "#f0c860";
  const LAD = ["c", "r", "e", "l", "m"], LABEL = (r) => RAR[r].label;
  const lad = (r) => (r === "pc" ? "c" : r);
  let T = null, M = null, loading = null, failed = false, E = null, cur = null;
  const pref = () => { try { return localStorage.getItem(LS); } catch (e) { return null; } };
  const webgl = () => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; } };
  // seulement la 3D : l'ancienne ouverture ne sert plus que de secours (pas de WebGL, mouvements réduits) ;
  // les navigateurs pilotés par les tests la gardent, sauf si un test demande la 3D
  const usable = () => !failed && !reduced && (!navigator.webdriver || pref() === "1") && webgl();
  function load() {
    if (loading) return loading;
    const all = Promise.all([import("three"), import("three/addons/environments/RoomEnvironment.js"), import("three/addons/geometries/RoundedBoxGeometry.js"), import("three/addons/postprocessing/EffectComposer.js"), import("three/addons/postprocessing/RenderPass.js"), import("three/addons/postprocessing/UnrealBloomPass.js"), import("three/addons/postprocessing/OutputPass.js")]);
    const slow = new Promise((_, rej) => setTimeout(() => rej(new Error("trop lent")), 9000));
    return (loading = Promise.race([all, slow]).then(([t, ...ms]) => { T = t; M = Object.assign({}, ...ms); }).catch((e) => { failed = true; console.warn("Ouverture 3D indisponible", e); }).then(() => { if (opening) drawOpening(); }));
  }
  const wantsChest = (o) => Coffre.isChest(o.pk) || !!o.scenario || o.cards.length > 5;
  const bestOf = (o) => o.cards.reduce((a, x) => (RAR[x.c.rar].rank > RAR[a].rank ? x.c.rar : a), "c");
  const colOf = (x) => (x.gold ? GOLD : HEX[x.c.rar]);

  // ---------- le moteur (créé une fois) ----------
  function engine() {
    if (E) return E;
    const THREE = T, canvas = document.createElement("canvas"); canvas.className = "o3-c";
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75)); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene(); scene.background = new THREE.Color("#07060f"); scene.fog = new THREE.Fog("#07060f", 9, 22);
    scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new M.RoomEnvironment(), 0.04).texture;
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    const composer = new M.EffectComposer(renderer); composer.addPass(new M.RenderPass(scene, camera));
    const bloom = new M.UnrealBloomPass(new THREE.Vector2(512, 512), 0.4, 0.5, 0.96); composer.addPass(bloom); composer.addPass(new M.OutputPass());
    scene.add(new THREE.HemisphereLight("#7f6bb8", "#120a1e", 0.35));
    const key = new THREE.SpotLight("#ffe2b0", 60, 20, 0.5, 0.6, 1.6); key.position.set(3.5, 7, 5); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0004; scene.add(key, key.target);
    const rim = new THREE.PointLight("#2ee6ff", 18, 12, 1.8); rim.position.set(-4, 2.5, -3); scene.add(rim);
    const rim2 = new THREE.PointLight("#ff2e88", 12, 12, 1.8); rim2.position.set(4, 1.5, -3.5); scene.add(rim2);
    const inner = new THREE.PointLight("#ffffff", 0, 9, 1.6); inner.position.set(0, 1.1, 0.1); scene.add(inner);
    E = { THREE, canvas, renderer, scene, camera, composer, bloom, rim, rim2, inner, tweens: [], clockT: 0, shake: 0, last: performance.now(), on: false,
      cam: { pos: new THREE.Vector3(), look: new THREE.Vector3() }, pointer: { x: 0, y: 0, nx: 0, ny: 0 }, ray: new THREE.Raycaster(), ndc: new THREE.Vector2() };
    buildTextures(); buildFloor(); buildChest(); buildKey(); buildPack(); buildParticles(); buildCardGeo();
    canvas.addEventListener("pointerdown", onDown); canvas.addEventListener("pointermove", onMove); canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerleave", () => cur?.cards.forEach((c) => { c.hover = 0; })); canvas.addEventListener("click", onClick);
    addEventListener("resize", () => { if (E.on) resize(); });
    return E;
  }
  // ---------- textures ----------
  function canvasTex(w, h, paint, srgb = true) { const c = document.createElement("canvas"); c.width = w; c.height = h; paint(c.getContext("2d"), w, h); const t = new E.THREE.CanvasTexture(c); if (srgb) t.colorSpace = E.THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
  function hexPattern(g, w, h, line, s = 26) { g.strokeStyle = line; g.lineWidth = 1.4; for (let y = -s; y < h + s; y += s * 1.5) for (let x = -s; x < w + s; x += s * Math.sqrt(3)) { const ox = (Math.round(y / (s * 1.5)) % 2) * s * Math.sqrt(3) / 2; g.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 3 * k + Math.PI / 6; g.lineTo(x + ox + Math.cos(a) * s * .55, y + Math.sin(a) * s * .55); } g.closePath(); g.stroke(); } }
  function drawIcon(g, k, cx, cy, s, col, lw = 1.6) {
    g.save(); g.translate(cx - 12 * s, cy - 12 * s); g.scale(s, s); g.strokeStyle = col; g.lineWidth = lw; g.lineCap = g.lineJoin = "round";
    for (const m of (ICON[k] || ICON.logo).matchAll(/<(path|circle|rect)([^>]*)\/?>/g)) {
      const at = (n) => +(m[2].match(new RegExp(` ${n}="([^"]+)"`)) || [])[1];
      if (m[1] === "path") g.stroke(new Path2D(m[2].match(/ d="([^"]+)"/)[1]));
      else if (m[1] === "circle") { g.beginPath(); g.arc(at("cx"), at("cy"), at("r"), 0, 7); g.stroke(); }
      else g.strokeRect(at("x"), at("y"), at("width"), at("height"));
    }
    g.restore();
  }
  function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function buildTextures() {
    E.radial = canvasTex(128, 128, (g, w) => { const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); r.addColorStop(0, "#fff"); r.addColorStop(.25, "#ffffffaa"); r.addColorStop(1, "#fff0"); g.fillStyle = r; g.fillRect(0, 0, w, w); });
    E.bodyTex = canvasTex(512, 256, (g, w, h) => { const l = g.createLinearGradient(0, 0, 0, h); l.addColorStop(0, "#2a2050"); l.addColorStop(1, "#140f28"); g.fillStyle = l; g.fillRect(0, 0, w, h); hexPattern(g, w, h, "#4a3c7a66"); g.fillStyle = "#0004"; for (let i = 0; i < 900; i++) g.fillRect(Math.random() * w, Math.random() * h, 1, 1); });
    // bandeau d'icônes néon sur les flancs du coffre
    E.runeTex = canvasTex(1024, 128, (g, w, h) => { const ks = ["logo", "feu", "eau", "vent", "terre", "couronne", "eclair", "sanctuaire"]; for (let i = 0; i < 12; i++) drawIcon(g, ks[i % ks.length], (i + .5) * w / 12, h / 2, 2.6, "#fff", 1.6); });
    E.ringTex = canvasTex(1024, 1024, (g, w) => {
      g.translate(w / 2, w / 2); g.strokeStyle = "#fff"; g.lineWidth = 3;
      for (const r of [470, 440, 330]) { g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke(); }
      for (let i = 0; i < 24; i++) { g.save(); g.rotate(i / 24 * Math.PI * 2); g.translate(0, -385); g.rotate(Math.PI / 4); g.strokeRect(-11, -11, 22, 22); g.restore(); }
      for (let i = 0; i < 6; i++) { g.save(); g.rotate(i / 6 * Math.PI * 2); g.beginPath(); g.moveTo(0, -330); g.lineTo(286, -165); g.stroke(); g.restore(); }
      drawIcon(g, "logo", 0, 0, 9, "#fff", 1.4);
    });
    E.shaftTex = canvasTex(4, 256, (g, w, h) => { const l = g.createLinearGradient(0, h, 0, 0); l.addColorStop(0, "#fff"); l.addColorStop(.35, "#ffffff66"); l.addColorStop(1, "#fff0"); g.fillStyle = l; g.fillRect(0, 0, w, h); });
    const THREE = E.THREE;
    E.gold = new THREE.MeshStandardMaterial({ color: "#c9a25a", metalness: 1, roughness: 0.32, envMapIntensity: 0.9 });
    E.darkGold = new THREE.MeshStandardMaterial({ color: "#8a6a32", metalness: 1, roughness: 0.4 });
    E.bodyMat = new THREE.MeshStandardMaterial({ map: E.bodyTex, color: "#9b8cc4", metalness: 0.55, roughness: 0.5, envMapIntensity: 0.45 });
  }
  const glowMat = (c) => new E.THREE.MeshBasicMaterial({ color: new E.THREE.Color(c).multiplyScalar(1.6), toneMapped: false });
  const additive = (o) => new E.THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: E.THREE.AdditiveBlending, toneMapped: false, ...o });
  function buildFloor() {
    const THREE = E.THREE;
    const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 64), new THREE.MeshStandardMaterial({ color: "#0d0a1a", metalness: 0.4, roughness: 0.55 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; E.scene.add(floor);
    E.ringMat = additive({ map: E.ringTex, color: new THREE.Color("#e8c77e").multiplyScalar(.5), opacity: 0.9 });
    E.ring = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 5.4), E.ringMat); E.ring.rotation.x = -Math.PI / 2; E.ring.position.y = 0.005; E.scene.add(E.ring);
    E.dust = new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(Float32Array.from({ length: 450 }, (_, i) => (i % 3 === 1 ? Math.random() * 4 : (Math.random() - .5) * 10)), 3)), new THREE.PointsMaterial({ size: 0.03, map: E.radial, color: "#e8c77e", transparent: true, opacity: .45, depthWrite: false, blending: THREE.AdditiveBlending }));
    E.scene.add(E.dust);
  }

  // ---------- le coffre ----------
  const W = 2.4, H = 1.0, D = 1.5, R = D / 2;
  function buildChest() {
    const THREE = E.THREE, RB = M.RoundedBoxGeometry, gold = E.gold, darkGold = E.darkGold, bodyMat = E.bodyMat;
    const chest = new THREE.Group(), body = new THREE.Group(); chest.add(body); E.scene.add(chest);
    const add = (parent, geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
    add(body, new RB(W, H, D, 4, 0.07), bodyMat, 0, H / 2, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { add(body, new RB(0.2, H + 0.06, 0.2, 3, 0.04), gold, sx * (W / 2 - 0.04), H / 2, sz * (D / 2 - 0.04)); add(body, new THREE.SphereGeometry(0.1, 24, 16), gold, sx * (W / 2 - 0.04), 0.05, sz * (D / 2 - 0.04)); }
    add(body, new RB(W + 0.08, 0.14, D + 0.08, 3, 0.04), gold, 0, 0.09, 0);
    add(body, new RB(W + 0.06, 0.09, D + 0.06, 3, 0.03), gold, 0, H - 0.05, 0);
    add(body, new RB(W - 0.5, 0.05, 0.03, 2, 0.01), darkGold, 0, H * 0.5, D / 2 + 0.01);
    add(body, new RB(0.66, 0.74, 0.1, 4, 0.04), gold, 0, 0.58, D / 2 + 0.05);
    const holeMat = glowMat("#1a0c2e"); holeMat.color.set("#05030a");
    const hole = new THREE.Group(); hole.position.set(0, 0.55, D / 2 + 0.105); body.add(hole);
    hole.add(new THREE.Mesh(new THREE.CircleGeometry(0.075, 32), holeMat));
    const holeLow = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.16), holeMat); holeLow.position.y = -0.09; hole.add(holeLow);
    const holeRing = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.022, 12, 48), gold); holeRing.position.set(0, 0.55, D / 2 + 0.1); body.add(holeRing);
    const runeMat = additive({ map: E.runeTex, color: new THREE.Color("#2ee6ff").multiplyScalar(.5), opacity: .8 });
    for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(D - 0.35, 0.16), runeMat); p.position.set(sx * (W / 2 + 0.002), H * 0.5, 0); p.rotation.y = sx * Math.PI / 2; body.add(p); }
    for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.12), runeMat); p.position.set(sx * 0.72, H * 0.5, D / 2 + 0.003); body.add(p); }
    const seamMat = glowMat("#2ee6ff");
    const seam = add(body, new THREE.BoxGeometry(W - 0.12, 0.025, D - 0.12), seamMat, 0, H + 0.005, 0); seam.castShadow = false;
    const lidPivot = new THREE.Group(); lidPivot.position.set(0, H, -D / 2); body.add(lidPivot);
    const lid = new THREE.Group(); lid.position.z = R; lid.scale.y = 0.72; lidPivot.add(lid);
    const dome = new THREE.Mesh(new THREE.CylinderGeometry(R, R, W, 64, 1, false, 0, Math.PI), bodyMat); dome.rotation.z = Math.PI / 2; dome.castShadow = true; lid.add(dome);
    for (const x of [-(W / 2 - 0.02), -(W / 2 - 0.42), W / 2 - 0.42, W / 2 - 0.02, 0]) { const b = new THREE.Mesh(new THREE.TorusGeometry(R + 0.012, x === 0 ? 0.045 : 0.06, 14, 64, Math.PI), gold); b.rotation.y = Math.PI / 2; b.position.x = x; b.castShadow = true; lid.add(b); }
    const lidRim = new THREE.Mesh(new RB(W + 0.06, 0.08, D + 0.06, 3, 0.03), gold); lidRim.position.set(0, 0.04 / 0.72, 0); lid.add(lidRim);
    const gemMat = new THREE.MeshPhysicalMaterial({ color: "#2ee6ff", emissive: "#2ee6ff", emissiveIntensity: 0.9, metalness: 0, roughness: 0.08, clearcoat: 1, flatShading: true });
    const gemMount = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.08, 6), gold); gemMount.rotation.x = Math.PI / 2; gemMount.position.set(0, 0.42, R * 0.92); lid.add(gemMount);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.15, 0), gemMat); gem.scale.set(1, 1.35, 0.6); gem.position.set(0, 0.42, R * 0.92 + 0.07); lid.add(gem);
    const gemGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: E.radial, color: "#2ee6ff", blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.6 })); gemGlow.scale.set(0.9, 0.9, 1); gemGlow.position.copy(gem.position); lid.add(gemGlow);
    const shaftMat = additive({ map: E.shaftTex, color: "#ffffff", opacity: 0, side: THREE.DoubleSide });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 0.75, 5, 48, 1, true), shaftMat); shaft.position.y = H + 2.5; E.scene.add(shaft);
    // fissures progressives depuis la serrure
    const segs = []; let max = 1;
    const branch = (x, y, a, len, wd, d, dist) => {
      if (d > 6 || len < 6) return;
      const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len; let px = x, py = y;
      for (let k = 1; k <= 4; k++) { const nx = x + (x2 - x) * k / 4 + (Math.random() - .5) * len * .22, ny = y + (y2 - y) * k / 4 + (Math.random() - .5) * len * .22, l = Math.hypot(nx - px, ny - py); segs.push({ x1: px, y1: py, x2: nx, y2: ny, w: wd, d0: dist, d1: dist + l }); dist += l; px = nx; py = ny; }
      branch(px, py, a + (Math.random() - .5) * 0.9, len * .75, wd * .72, d + 1, dist);
      if (Math.random() < .6) branch(px, py, a + (Math.random() < .5 ? -1 : 1) * (0.5 + Math.random() * .7), len * .55, wd * .6, d + 1, dist);
    };
    for (let i = 0; i < 7; i++) branch(512, 236, i / 7 * Math.PI * 2 + Math.random() * .5, 80 + Math.random() * 40, 11, 0, 0);
    for (let i = 0; i < 5; i++) branch(100 + Math.random() * 824, 60 + Math.random() * 390, Math.random() * 7, 70 + Math.random() * 40, 8, 1, 220 + i * 50);
    max = Math.max(...segs.map((c) => c.d1));
    const cc = Object.assign(document.createElement("canvas"), { width: 1024, height: 512 }), cg = cc.getContext("2d");
    const crackTex = new THREE.CanvasTexture(cc); crackTex.colorSpace = THREE.SRGBColorSpace;
    const crackMat = additive({ map: crackTex, color: "#ffffff", opacity: 0 });
    const crackBody = new THREE.Mesh(new RB(W + 0.012, H + 0.012, D + 0.012, 4, 0.07), crackMat); crackBody.position.y = H / 2; body.add(crackBody);
    const crackLid = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.008, R + 0.008, W + 0.01, 64, 1, false, 0, Math.PI), crackMat); crackLid.rotation.z = Math.PI / 2; lid.add(crackLid);
    let crackP = -1;
    const setCrack = (p) => {
      if (Math.abs(p - crackP) < 0.004) return; crackP = p;
      const lim = p * max; cg.clearRect(0, 0, 1024, 512); cg.strokeStyle = "#fff"; cg.lineCap = "round";
      for (const [wk, al] of [[3.2, .25], [1, 1]]) { cg.globalAlpha = al; for (const c of segs) { if (c.d0 >= lim) continue; const f = Math.min(1, (lim - c.d0) / (c.d1 - c.d0)); cg.lineWidth = c.w * wk; cg.beginPath(); cg.moveTo(c.x1, c.y1); cg.lineTo(c.x1 + (c.x2 - c.x1) * f, c.y1 + (c.y2 - c.y1) * f); cg.stroke(); } } cg.globalAlpha = 1;
      crackTex.needsUpdate = true;
    };
    const orb = new THREE.Sprite(new THREE.SpriteMaterial({ map: E.radial, color: "#fff", blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0, toneMapped: false })); orb.position.set(0, 1.0, 0); E.scene.add(orb);
    const orbCore = new THREE.Mesh(new THREE.SphereGeometry(0.18, 32, 16), glowMat("#ffffff")); orbCore.position.copy(orb.position); orbCore.visible = false; E.scene.add(orbCore);
    const tint = (color, k = 1) => { const c = new THREE.Color(color); seamMat.color.copy(c).multiplyScalar(2.2 * k); runeMat.color.copy(c).multiplyScalar(.6 * k); E.ringMat.color.copy(c).multiplyScalar(.5 * k); gemMat.color.copy(c); gemMat.emissive.copy(c); gemGlow.material.color.copy(c); holeMat.color.copy(c).multiplyScalar(2 * k); };
    E.ch = { chest, body, lidPivot, lid, gem, gemMat, gemGlow, seamMat, runeMat, holeMat, crackMat, crackBody, crackLid, seam, shaft, shaftMat, orb, orbCore, setCrack, tint, crack: () => crackP };
  }
  let debris = [];
  const jitterGeo = (g, k) => { const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (1 + (Math.random() - .5) * k), p.getY(i) * (1 + (Math.random() - .5) * k), p.getZ(i) * (1 + (Math.random() - .5) * k)); g.computeVertexNormals(); return g; };
  function shatter(power, color) {
    const THREE = E.THREE, ch = E.ch; ch.chest.updateMatrixWorld(true);
    const center = new THREE.Vector3(0, H * 0.6, 0), pieces = [];
    ch.chest.traverse((m) => { if (!m.isMesh || m === ch.crackBody || m === ch.crackLid || m === ch.seam || m.material === ch.runeMat || m.material === E.bodyMat || m.material === ch.holeMat) return; pieces.push(m); });
    for (const m of pieces) { const c = new THREE.Mesh(m.geometry, m.material); m.matrixWorld.decompose(c.position, c.quaternion, c.scale); throwPiece(c, center, power, 0.12); }
    const nx = 6, ny = 3, nz = 4, sx = W / nx, sy = H / ny, sz = D / nz;
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) for (let k = 0; k < nz; k++) {
      if (k > 0 && k < nz - 1 && i > 0 && i < nx - 1 && j > 0) continue;
      const c = new THREE.Mesh(jitterGeo(new THREE.BoxGeometry(sx * .96, sy * .96, sz * .96, 2, 2, 2), 0.35), E.bodyMat);
      c.position.set(-W / 2 + sx * (i + .5), sy * (j + .5), -D / 2 + sz * (k + .5)); throwPiece(c, center, power, Math.max(sx, sy, sz) / 2);
    }
    for (let i = 0; i < 6; i++) for (let a = 0; a < 4; a++) {
      const ang = (a + .5) / 4 * Math.PI, c = new THREE.Mesh(jitterGeo(new THREE.BoxGeometry(W / 6 * .95, 0.07, R * Math.PI / 4 * .95, 2, 1, 2), 0.3), E.bodyMat);
      const lp = new THREE.Vector3(-W / 2 + W / 6 * (i + .5), Math.sin(ang) * R, Math.cos(ang) * R); ch.lid.localToWorld(lp);
      c.position.copy(lp); c.rotation.x = -(Math.PI / 2 - ang); throwPiece(c, center, power * 1.15, 0.1);
    }
    ch.chest.visible = false;
    emit(160, center, "#6a5a9a", { speed: 4 * power, up: 0.8, life: 1.6, grav: 5, drag: 1.5, jitter: 0.5 });
    emit(power > 1.2 ? 320 : 180, center, color, { speed: 5.5 * power, up: 1, life: 1.8, grav: 2, drag: 1.1, jitter: 0.3 });
  }
  function throwPiece(m, center, power, half) {
    m.castShadow = true; E.scene.add(m);
    const dir = m.position.clone().sub(center); dir.y = Math.max(dir.y, 0) + 0.35; dir.z = dir.z > 0 ? dir.z * 0.35 - 0.2 : dir.z; dir.normalize();
    debris.push({ m, v: dir.multiplyScalar((2.6 + Math.random() * 2.6) * power).add(new E.THREE.Vector3(0, 2 + Math.random() * 2, 0)), w: new E.THREE.Vector3((Math.random() - .5) * 14, (Math.random() - .5) * 14, (Math.random() - .5) * 14), half, t: 0, s0: m.scale.clone(), gravity: 9.8 });
  }
  function stepDebris(dt) {
    const q = new E.THREE.Quaternion(), e = new E.THREE.Euler();
    for (const d of debris) {
      d.t += dt; d.v.y -= d.gravity * dt; d.m.position.addScaledVector(d.v, dt);
      q.setFromEuler(e.set(d.w.x * dt, d.w.y * dt, d.w.z * dt)); d.m.quaternion.premultiply(q);
      if (d.half != null && d.m.position.y < d.half) { d.m.position.y = d.half; d.v.y = Math.abs(d.v.y) > 0.6 ? -d.v.y * 0.32 : 0; d.v.x *= 0.62; d.v.z *= 0.62; d.w.multiplyScalar(0.55); }
      if (d.t > 2.6) d.m.scale.copy(d.s0).multiplyScalar(Math.max(0, 1 - (d.t - 2.6) / 1.2));
    }
    debris = debris.filter((d) => { if (d.t > 3.8) { E.scene.remove(d.m); return false; } return true; });
  }
  // ---------- la clé ----------
  function buildKey() {
    const THREE = E.THREE, gold = E.gold, keyG = new THREE.Group(), inner = new THREE.Group(); keyG.add(inner); E.scene.add(keyG);
    inner.add(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.055, 18, 48), gold));
    const kb2 = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 12, 6), E.darkGold); kb2.rotation.z = Math.PI / 6; inner.add(kb2);
    inner.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.085, 0), E.ch.gemMat));
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.78, 16), gold); sh.rotation.x = Math.PI / 2; sh.position.z = -0.6; inner.add(sh);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 16), gold); col.rotation.x = Math.PI / 2; col.position.z = -0.27; inner.add(col);
    for (const [z, h] of [[-0.86, 0.13], [-0.94, 0.09], [-0.78, 0.07]]) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.04, h, 0.06), gold); t.position.set(0, -h / 2 - 0.02, z); inner.add(t); }
    inner.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: E.radial, color: "#e8c77e", blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.35 })); glow.scale.set(1.2, 1.2, 1); keyG.add(glow);
    E.key = { g: keyG, inner, glow, home: new THREE.Vector3() };
  }

  // ---------- la pochette ----------
  const PW = 1.6, PH = 2.4, PT = 0.2, CRIMP = 0.15, HW = PW / 2, HH = PH / 2, TEAR = HH - CRIMP - 0.13, PACK_Y = 1.55, NS = 16, SW = PW / NS;
  function buildPack() {
    const THREE = E.THREE, TX = 820, TY = Math.round(820 * PH / PW), yPix = (y) => (HH - y) / PH * TY;
    const paint = (g, w, h, back) => {
      const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, "#2a1a52"); bg.addColorStop(.5, "#120a26"); bg.addColorStop(1, "#3a1240"); g.fillStyle = bg; g.fillRect(0, 0, w, h);
      hexPattern(g, w, h, "#e8c77e1c", 30);
      for (let i = -4; i < 10; i++) { const x = i * 130, l = g.createLinearGradient(x, 0, x + 90, 90); l.addColorStop(0, "#fff0"); l.addColorStop(.5, "#ffffff10"); l.addColorStop(1, "#fff0"); g.fillStyle = l; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 60, 0); g.lineTo(x + 60 + h * .5, h); g.lineTo(x + h * .5, h); g.fill(); }
      for (const [y0, y1] of [[0, yPix(HH - CRIMP)], [yPix(-HH + CRIMP), h]]) {
        const l = g.createLinearGradient(0, y0, 0, y1); l.addColorStop(0, "#7a5c2a"); l.addColorStop(.5, "#a8854a"); l.addColorStop(1, "#5a4020"); g.fillStyle = l; g.fillRect(0, y0, w, y1 - y0);
        g.strokeStyle = "#3a2a10aa"; g.lineWidth = 3; for (let x = 6; x < w; x += 14) { g.beginPath(); g.moveTo(x, y0 + 4); g.lineTo(x, y1 - 4); g.stroke(); }
      }
      g.strokeStyle = "#e8c77e"; g.lineWidth = 5; roundRect(g, 34, yPix(HH - CRIMP) + 26, w - 68, yPix(-HH + CRIMP) - yPix(HH - CRIMP) - 52, 26); g.stroke();
      g.strokeStyle = "#2ee6ff66"; g.lineWidth = 2; roundRect(g, 46, yPix(HH - CRIMP) + 38, w - 92, yPix(-HH + CRIMP) - yPix(HH - CRIMP) - 76, 20); g.stroke();
      const ty = yPix(TEAR); g.setLineDash([16, 12]); g.strokeStyle = "#ffffffcc"; g.lineWidth = 3; g.beginPath(); g.moveTo(14, ty); g.lineTo(w - 14, ty); g.stroke(); g.setLineDash([]);
      g.fillStyle = "#07060f"; for (const x of [0, w]) { g.beginPath(); g.moveTo(x, ty - 14); g.lineTo(x + (x ? -16 : 16), ty); g.lineTo(x, ty + 14); g.fill(); }
      if (!back) {
        g.fillStyle = "#ffffffcc"; g.font = "700 22px Inter, sans-serif"; g.textAlign = "left"; g.fillText("DÉCHIRE ICI  ➜", 40, ty - 14);
        const cy = h * .47; g.beginPath(); g.arc(w / 2, cy, 170, 0, 7); g.fillStyle = "#0b0716"; g.fill(); g.strokeStyle = "#e8c77e"; g.lineWidth = 8; g.stroke();
        g.beginPath(); g.arc(w / 2, cy, 148, 0, 7); g.strokeStyle = "#ff2e8888"; g.lineWidth = 3; g.stroke();
        drawIcon(g, "logo", w / 2, cy, 9.5, "#e8c77e", 1.5);
        g.textAlign = "center"; g.fillStyle = "#f0e6d2"; g.font = "900 86px Cinzel, serif"; g.fillText("RE ZÉRO", w / 2, h * .72);
        g.font = "700 30px Inter, sans-serif"; g.fillStyle = "#e8c77e"; g.fillText(E.packLine || "P O C H E T T E   ·   5   C A R T E S", w / 2, h * .72 + 56);
      } else { g.textAlign = "center"; drawIcon(g, "logo", w / 2, h * .5, 6, "#e8c77e88", 1.4); g.font = "700 26px Inter, sans-serif"; g.fillStyle = "#a99cc8"; g.fillText("QG DE SHINJUKU", w / 2, h * .66); }
    };
    // papier métallisé froissé : un relief de plis (carte de normales) et une brillance irrégulière, pour que la lumière glisse dessus
    const crinkle = crinkleMaps(THREE);
    const foil = (map) => new THREE.MeshPhysicalMaterial({ map, normalMap: crinkle.normal, normalScale: new THREE.Vector2(0.55, 0.55), roughnessMap: crinkle.rough, metalness: 0.8, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.25, iridescence: 0.9, iridescenceIOR: 1.5, iridescenceThicknessRange: [180, 820], side: THREE.DoubleSide, envMapIntensity: 1.25 });
    const frontC = document.createElement("canvas"); frontC.width = TX; frontC.height = TY;
    const frontTex = new THREE.CanvasTexture(frontC); frontTex.colorSpace = THREE.SRGBColorSpace; frontTex.anisotropy = 8;
    const repaint = () => { paint(frontC.getContext("2d"), TX, TY, false); frontTex.needsUpdate = true; }; repaint();
    const frontMat = foil(frontTex), backMat = foil(canvasTex(TX, TY, (g, w, h) => paint(g, w, h, true)));
    const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const bulge = (x, y) => PT / 2 * Math.sqrt(Math.max(0, 1 - Math.pow(x / HW, 4))) * sm(HH, HH - CRIMP - 0.18, Math.abs(y)) * (1 + .04 * Math.sin(x * 9 + y * 5));
    const sheet = (x0, x1, y0, y1, side, sx, sy) => {
      const geo = new THREE.PlaneGeometry(x1 - x0, y1 - y0, sx, sy), p = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i) + (x0 + x1) / 2, y = p.getY(i) + (y0 + y1) / 2; p.setXYZ(i, x, y, side * bulge(x, y)); uv.setXY(i, side > 0 ? (x + HW) / PW : 1 - (x + HW) / PW, (y + HH) / PH); }
      geo.computeVertexNormals(); return geo;
    };
    const pack = new THREE.Group(), tilt = new THREE.Group(); pack.add(tilt); E.scene.add(pack);
    for (const side of [1, -1]) { const m = new THREE.Mesh(sheet(-HW, HW, -HH, TEAR, side, 24, 40), side > 0 ? frontMat : backMat); m.castShadow = true; tilt.add(m); }
    const cap = new THREE.Group(); tilt.add(cap); const strips = [];
    for (let i = 0; i < NS; i++) {
      const x0 = -HW + i * SW, x1 = x0 + SW, pivot = new THREE.Group(); pivot.position.set((x0 + x1) / 2, TEAR, 0); cap.add(pivot);
      for (const side of [1, -1]) { const geo = sheet(x0, x1, TEAR, HH, side, 2, 6); geo.translate(-(x0 + x1) / 2, -TEAR, 0); const m = new THREE.Mesh(geo, side > 0 ? frontMat : backMat); m.castShadow = true; pivot.add(m); }
      strips.push({ pivot, x: (x0 + x1) / 2, a: 0, kids: [...pivot.children] });
    }
    const slitMat = additive({ map: E.radial, color: "#ffffff", opacity: 0 });
    const slit = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.32), slitMat); slit.position.set(0, TEAR + 0.1, 0.02); tilt.add(slit);
    const slitLine = new THREE.Mesh(new THREE.BoxGeometry(1, 0.012, PT * .7), glowMat("#ffffff")); slitLine.position.y = TEAR; slitLine.visible = false; tilt.add(slitLine);
    const light = new THREE.PointLight("#ffffff", 0, 6, 1.6); light.position.set(0, TEAR + .25, .2); tilt.add(light);
    const shaftMat = additive({ map: E.shaftTex, color: "#ffffff", opacity: 0, side: THREE.DoubleSide });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.55, 4.2, 48, 1, true), shaftMat); shaft.position.y = TEAR + 2.1; tilt.add(shaft);
    E.pk = { pack, tilt, cap, strips, slit, slitMat, slitLine, light, shaft, shaftMat, p: 0, dir: 1, repaint };
  }
  // plis du papier : lignes de froissure tracées au hasard (hauteur), puis converties en carte de normales
  function crinkleMaps(THREE) {
    const W = 512, H = 768, hc = document.createElement("canvas"); hc.width = W; hc.height = H; const g = hc.getContext("2d");
    g.fillStyle = "#808080"; g.fillRect(0, 0, W, H);
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 260; i++) {
      const x = rnd() * W, y = rnd() * H, a = rnd() * Math.PI, l = 30 + rnd() * 160, w = 1 + rnd() * 3, up = rnd() < 0.5;
      const gr = g.createLinearGradient(x - Math.sin(a) * w * 3, y + Math.cos(a) * w * 3, x + Math.sin(a) * w * 3, y - Math.cos(a) * w * 3);
      gr.addColorStop(0, "#80808000"); gr.addColorStop(0.5, up ? "#ffffff30" : "#00000030"); gr.addColorStop(1, "#80808000");
      g.strokeStyle = gr; g.lineWidth = w * 6; g.beginPath(); g.moveTo(x - Math.cos(a) * l / 2, y - Math.sin(a) * l / 2); g.lineTo(x + Math.cos(a) * l / 2, y + Math.sin(a) * l / 2); g.stroke();
    }
    const hd = g.getImageData(0, 0, W, H).data, nc = document.createElement("canvas"); nc.width = W; nc.height = H;
    const ng = nc.getContext("2d"), out = ng.createImageData(W, H), rc = document.createElement("canvas"); rc.width = W; rc.height = H;
    const rg = rc.getContext("2d"), rout = rg.createImageData(W, H), h = (x, y) => hd[(((y + H) % H) * W + ((x + W) % W)) * 4] / 255;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * 3, dy = (h(x, y + 1) - h(x, y - 1)) * 3, l = Math.hypot(dx, dy, 1), i = (y * W + x) * 4;
      out.data[i] = (-dx / l * 0.5 + 0.5) * 255; out.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; out.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; out.data[i + 3] = 255;
      const r = 150 + (h(x, y) - 0.5) * 300 + Math.abs(dx) * 120; rout.data[i] = rout.data[i + 1] = rout.data[i + 2] = Math.max(60, Math.min(255, r)); rout.data[i + 3] = 255;
    }
    ng.putImageData(out, 0, 0); rg.putImageData(rout, 0, 0);
    const normal = new THREE.CanvasTexture(nc), rough = new THREE.CanvasTexture(rc);
    return { normal, rough };
  }
  function setTear(p) {
    const P = E.pk; P.p = p; const front = p * PW;
    for (const s of P.strips) {
      const along = P.dir > 0 ? s.x + HW : HW - s.x, k = Math.max(0, Math.min(1, (front - along + SW) / 0.45));
      s.a = k; s.pivot.rotation.x = -easeOut(k) * 0.55; s.pivot.rotation.z = -P.dir * easeOut(k) * 0.08; s.pivot.position.y = TEAR + easeOut(k) * 0.03;
    }
    const len = Math.max(0.001, front), cx = P.dir > 0 ? -HW + len / 2 : HW - len / 2;
    P.slit.scale.set(len, 1, 1); P.slit.position.x = cx; P.slitLine.scale.x = len; P.slitLine.position.x = cx; P.slitLine.visible = p > 0;
  }

  // ---------- particules ----------
  const NP = 1000;
  function buildParticles() {
    const THREE = E.THREE, P = E.P = { pos: new Float32Array(NP * 3).fill(999), col: new Float32Array(NP * 3), vel: new Float32Array(NP * 3), life: new Float32Array(NP), max: new Float32Array(NP), base: new Float32Array(NP * 3), drag: new Float32Array(NP), grav: new Float32Array(NP), next: 0 };
    P.geo = new THREE.BufferGeometry(); P.geo.setAttribute("position", new THREE.BufferAttribute(P.pos, 3)); P.geo.setAttribute("color", new THREE.BufferAttribute(P.col, 3));
    const pts = new THREE.Points(P.geo, new THREE.PointsMaterial({ size: 0.07, map: E.radial, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    pts.frustumCulled = false; E.scene.add(pts);
  }
  function emit(n, o, color, { speed = 3, spread = 1, up = 1, life = 1.4, grav = 3, drag = 1.2, jitter = 0.05 } = {}) {
    const P = E.P, c = new E.THREE.Color(color).multiplyScalar(2);
    for (let k = 0; k < n; k++) {
      const i = P.next; P.next = (P.next + 1) % NP;
      P.pos[i * 3] = o.x + (Math.random() - .5) * jitter * 4; P.pos[i * 3 + 1] = o.y + (Math.random() - .5) * jitter; P.pos[i * 3 + 2] = o.z + (Math.random() - .5) * jitter * 4;
      const a = Math.random() * Math.PI * 2, s = speed * (.3 + Math.random() * .7);
      P.vel[i * 3] = Math.cos(a) * s * spread; P.vel[i * 3 + 2] = Math.sin(a) * s * spread; P.vel[i * 3 + 1] = up * s * (.4 + Math.random() * .8);
      const w = Math.random() < .3; P.base[i * 3] = w ? 2 : c.r; P.base[i * 3 + 1] = w ? 2 : c.g; P.base[i * 3 + 2] = w ? 2 : c.b;
      P.life[i] = P.max[i] = life * (.6 + Math.random() * .6); P.grav[i] = grav; P.drag[i] = drag;
    }
  }
  function stepParticles(dt) {
    const P = E.P;
    for (let i = 0; i < NP; i++) {
      if (P.life[i] <= 0) continue;
      P.life[i] -= dt; const f = Math.exp(-P.drag[i] * dt);
      P.vel[i * 3] *= f; P.vel[i * 3 + 2] *= f; P.vel[i * 3 + 1] = P.vel[i * 3 + 1] * f - P.grav[i] * dt;
      for (let j = 0; j < 3; j++) P.pos[i * 3 + j] += P.vel[i * 3 + j] * dt;
      const k = Math.max(0, P.life[i] / P.max[i]); for (let j = 0; j < 3; j++) P.col[i * 3 + j] = P.base[i * 3 + j] * k;
      if (P.life[i] <= 0) P.pos[i * 3 + 1] = 999;
    }
    P.geo.attributes.position.needsUpdate = true; P.geo.attributes.color.needsUpdate = true;
  }
  function shock(pos, color, size = 4, dur = 0.8, flat = true) {
    const THREE = E.THREE, m = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 96), additive({ color: new THREE.Color(color).multiplyScalar(1.1), side: THREE.DoubleSide }));
    m.position.copy(pos); if (flat) m.rotation.x = -Math.PI / 2; else m.lookAt(E.camera.position); E.scene.add(m);
    tween(dur, (t) => { m.scale.setScalar(0.2 + t * size); m.material.opacity = 1 - t; }, easeOut).then(() => { E.scene.remove(m); m.geometry.dispose(); m.material.dispose(); });
  }
  function flash(c, o = 0.9) { const f = $("o3Flash"); if (!f) return; f.style.setProperty("--fc", c); f.animate([{ opacity: o }, { opacity: 0 }], { duration: 700, easing: "ease-out" }); }

  // ---------- animations ----------
  const easeOut = (t) => 1 - Math.pow(1 - t, 3), easeIO = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2), easeIn = (t) => t * t * t;
  const easeBack = (t) => 1 + 2.5 * Math.pow(t - 1, 3) + 1.5 * Math.pow(t - 1, 2);
  const lerp = (a, b, t) => a + (b - a) * t;
  const tween = (dur, fn, ease = easeIO) => new Promise((res) => { if (!E.on) { fn(1, 1); return res(); } E.tweens.push({ t0: E.clockT, dur, fn, ease, res, run: cur?.run }); });
  const wait = (ms) => tween(ms / 1000, () => {});
  const alive = (s) => cur && cur.run === s && E.on;

  // ---------- cartes : vraie épaisseur, face brillante qui irise ----------
  const CW = 1.0, CH = 1.48, CR = 0.07, CT = 0.022;
  function buildCardGeo() {
    const THREE = E.THREE, rr = (w, h, r) => { const s = new THREE.Shape(), x = -w / 2, y = -h / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; };
    E.edgeGeo = new THREE.ExtrudeGeometry(rr(CW, CH, CR), { depth: CT, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 10 }); E.edgeGeo.translate(0, 0, -CT / 2);
    E.faceGeo = new THREE.ShapeGeometry(rr(CW - 0.012, CH - 0.012, CR - 0.006), 10);
    const uv = E.faceGeo.attributes.uv, p = E.faceGeo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / CW + .5, p.getY(i) / CH + .5);
    const back = canvasTex(600, 888, (g, w, h) => {
      roundRect(g, 0, 0, w, h, 42); const fr = g.createLinearGradient(0, 0, w, h); fr.addColorStop(0, "#f0d38c"); fr.addColorStop(.5, "#8a6a32"); fr.addColorStop(1, "#f0d38c"); g.fillStyle = fr; g.fill();
      roundRect(g, 14, 14, w - 28, h - 28, 32); const bg = g.createRadialGradient(w / 2, h * .45, 20, w / 2, h / 2, h * .7); bg.addColorStop(0, "#3a2464"); bg.addColorStop(1, "#0b0916"); g.fillStyle = bg; g.fill();
      g.save(); g.clip(); hexPattern(g, w, h, "#e8c77e22", 34); g.restore();
      roundRect(g, 40, 40, w - 80, h - 80, 22); g.strokeStyle = "#e8c77eaa"; g.lineWidth = 2; g.stroke();
      g.beginPath(); g.arc(w / 2, h / 2, 130, 0, 7); g.fillStyle = "#120a24"; g.fill(); g.strokeStyle = "#e8c77e"; g.lineWidth = 6; g.stroke();
      drawIcon(g, "logo", w / 2, h / 2, 8, "#e8c77e", 1.5);
      g.fillStyle = "#e8c77e"; g.textAlign = "center"; g.font = "700 30px Cinzel, serif"; g.fillText("R E   Z É R O", w / 2, h - 110);
    });
    E.backMat = new THREE.MeshPhysicalMaterial({ map: back, metalness: 0.35, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.12, iridescence: 0.5, iridescenceIOR: 1.4, iridescenceThicknessRange: [200, 700] });
  }
  const imgOf = (x) => { const k = imgKey(x.c); return k ? ART[k] || PHOTO[k] : null; };
  const loadImg = (src) => new Promise((r) => { if (!src) return r(null); const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
  function faceTex(x, img) {
    const col = colOf(x), rar = x.c.rar;
    return canvasTex(600, 888, (g, w, h) => {
      const fr = g.createLinearGradient(0, 0, w, h); fr.addColorStop(0, col); fr.addColorStop(.5, x.gold ? "#3a2c0c" : "#1a1230"); fr.addColorStop(1, col);
      roundRect(g, 0, 0, w, h, 42); g.fillStyle = fr; g.fill();
      roundRect(g, 14, 14, w - 28, h - 28, 32); const bg = g.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, x.gold ? "#3a2c10" : "#1d1636"); bg.addColorStop(1, "#0d0a1a"); g.fillStyle = bg; g.fill(); g.strokeStyle = col; g.lineWidth = 3; g.stroke();
      g.fillStyle = "#f0e6d2"; g.font = "700 44px Cinzel, serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(nameOf(x.c).slice(0, 18), w / 2 - 20, 70);
      g.beginPath(); g.arc(w - 66, 68, 30, 0, 7); g.fillStyle = col; g.fill(); g.fillStyle = "#120d22"; g.font = "900 32px Cinzel, serif"; g.fillText(LETTER[rar] || "C", w - 66, 70);
      g.save(); roundRect(g, 38, 116, w - 76, 500, 22); g.clip(); g.fillStyle = "#0e0d12"; g.fillRect(38, 116, w - 76, 500);
      if (img) { const s = Math.max((w - 76) / img.width, 500 / img.height), iw = img.width * s, ih = img.height * s; g.drawImage(img, 38 + (w - 76 - iw) / 2, 116 + (500 - ih) * 0.22, iw, ih); }
      else { g.fillStyle = col; g.font = "900 120px Cinzel, serif"; g.fillText(initials(nameOf(x.c)), w / 2, 366); }
      const sh = g.createLinearGradient(0, 470, 0, 616); sh.addColorStop(0, "#0000"); sh.addColorStop(1, "#000a"); g.fillStyle = sh; g.fillRect(0, 470, w, 146);
      g.restore(); roundRect(g, 38, 116, w - 76, 500, 22); g.strokeStyle = "#e8c77e88"; g.lineWidth = 2; g.stroke();
      if (x.isNew) { g.fillStyle = "#ff4d2e"; roundRect(g, 54, 132, 150, 40, 10); g.fill(); g.fillStyle = "#1a0c0a"; g.font = "800 22px Inter, sans-serif"; g.fillText("NOUVELLE", 129, 153); }
      g.fillStyle = "#e8e0d0"; g.font = "600 30px Inter, sans-serif"; g.fillText(subOf(x.c).slice(0, 30), w / 2, 668);
      const [pow, aura] = statsOf(x.c); g.fillStyle = "#ffffff10"; roundRect(g, 38, 712, w - 76, 70, 16); g.fill();
      g.font = "600 30px 'JetBrains Mono', monospace"; g.fillStyle = "#f0e6d2"; g.textAlign = "left"; g.fillText("POW " + pow, 64, 748); g.textAlign = "right"; g.fillText("AURA " + aura, w - 64, 748);
      g.textAlign = "center"; g.fillStyle = col; g.font = "700 26px Cinzel, serif"; g.fillText(((x.gold ? "Dorée · " : "") + LABEL(rar)).toUpperCase().split("").join(" "), w / 2, 830);
    });
  }
  function makeCard(x, i, img) {
    const THREE = E.THREE, col = colOf(x), rk = x.gold ? 4 : RAR[x.c.rar].rank;
    const root = new THREE.Group(), tilt = new THREE.Group(), flip = new THREE.Group(); root.add(tilt); tilt.add(flip); E.scene.add(root);
    const edgeMat = new THREE.MeshStandardMaterial({ color: rk >= 3 ? col : "#d8b36a", metalness: 1, roughness: 0.3, emissive: rk >= 3 ? col : "#000", emissiveIntensity: 0 });
    const edge = new THREE.Mesh(E.edgeGeo, edgeMat); edge.castShadow = true; flip.add(edge);
    const faceMat = new THREE.MeshPhysicalMaterial({ map: faceTex(x, img), metalness: 0.15, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08, iridescence: rk >= 3 ? 1 : rk >= 2 ? 0.55 : 0.2, iridescenceIOR: 1.35, iridescenceThicknessRange: [150, 900] });
    const face = new THREE.Mesh(E.faceGeo, faceMat); face.position.z = -(CT / 2 + 0.007); face.rotation.y = Math.PI; flip.add(face);
    const back = new THREE.Mesh(E.faceGeo, E.backMat); back.position.z = CT / 2 + 0.007; flip.add(back);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: E.radial, color: new THREE.Color(col), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 })); halo.scale.set(1.6, 2.1, 1); halo.position.z = -0.08; tilt.add(halo);
    const light = new THREE.PointLight(col, 0, 4, 1.5); light.position.z = 0.6; tilt.add(light);
    const c = { x, img, rk, col, rar: x.gold ? "gold" : x.c.rar, root, tilt, flip, face, back, edge, edgeMat, faceMat, halo, light, flipped: false, busy: false, tiltX: 0, tiltY: 0, hover: 0, home: new THREE.Vector3(), homeRz: 0, s: 1, i };
    for (const m of [edge, face, back]) m.userData.card = c;
    return c;
  }
  function clearCards() { for (const c of cur?.cards || []) { E.scene.remove(c.root); c.faceMat.map.dispose(); c.faceMat.dispose(); c.edgeMat.dispose(); } }

  // ---------- mise en place selon l'écran ----------
  function slotsFor(n, portrait) {
    if (n <= 5) return portrait ? [[-1.2, 2.55], [0, 2.55], [1.2, 2.55], [-0.6, 0.85], [0.6, 0.85]].slice(0, n).map(([x, y]) => ({ x, y, z: 2.2, rz: 0, s: 1 })) : [-2.6, -1.3, 0, 1.3, 2.6].slice(0, n).map((x, i) => ({ x, y: 1.75 - Math.abs(i - 2) * 0.09, z: 2.2 - Math.abs(i - 2) * 0.08, rz: -(i - 2) * 0.045, s: 1 }));
    // coffre (10 cartes) : deux arcs comme le prototype, les cartes du bord tournées vers le joueur
    if (portrait) { const rows = [[0, 1, 2], [3, 4, 5, 6], [7, 8, 9]]; const out = []; rows.forEach((r, j) => r.forEach((_, k) => { const d = k - (r.length - 1) / 2; out.push({ x: d * 0.86, y: 3.0 - j * 1.12 - Math.abs(d) * 0.06, z: 2.2 - Math.abs(d) * 0.08, rz: -d * 0.05, ry: -d * 0.12, s: 0.74 }); })); return out; }
    return Array.from({ length: n }, (_, i) => { const k = i % 5, j = Math.floor(i / 5), d = k - 2; return { x: d * 1.18, y: 2.5 - j * 1.36 - Math.abs(d) * 0.08, z: 2.2 - Math.abs(d) * 0.12, rz: -d * 0.045, ry: -d * 0.1, s: 0.84 }; });
  }
  function resize() {
    const w = innerWidth, h = innerHeight, a = w / h, THREE = E.THREE;
    E.renderer.setSize(w, h, false); E.composer.setSize(w, h); E.camera.aspect = a; E.camera.updateProjectionMatrix(); E.bloom.resolution.set(w / 2, h / 2);
    const portrait = a < 0.85, fov = THREE.MathUtils.degToRad(E.camera.fov), fitW = (wd, dist) => Math.max(wd / (2 * Math.tan(fov / 2) * a), dist);
    E.lay = {
      portrait,
      chestCam: { pos: new THREE.Vector3(0, 2.5, fitW(4.6, 7.6)).multiply(new THREE.Vector3(1, portrait ? 1.25 : 1, 1)), look: new THREE.Vector3(0, portrait ? 1.0 : 0.85, 0) },
      packCam: { pos: new THREE.Vector3(0, PACK_Y + 0.5, portrait ? fitW(2.6, 6.2) : 6.2), look: new THREE.Vector3(0, PACK_Y, 0) },
      cardCam: portrait ? { pos: new THREE.Vector3(0, 2.4, 2.2 + fitW(3.8, 6)), look: new THREE.Vector3(0, 1.75, 2.2) } : { pos: new THREE.Vector3(0, 2.6, 2.2 + fitW(6.8, 6)), look: new THREE.Vector3(0, 1.75, 2.2) },
      slots: slotsFor(cur?.cards?.length || cur?.o?.cards.length || 5, portrait),
    };
    if (!cur) return;
    const v = cur.phase === "cards" || cur.phase === "done" ? E.lay.cardCam : cur.kind === "chest" ? E.lay.chestCam : E.lay.packCam;
    E.cam.pos.copy(v.pos); E.cam.look.copy(v.look);
    cur.cards.forEach((c, i) => { const s = E.lay.slots[i]; c.home.set(s.x, s.y, s.z); c.homeRz = s.rz; c.s = s.s; if (!c.busy) { c.root.position.copy(c.home); c.root.rotation.z = c.homeRz; c.root.rotation.y = s.ry || 0; c.root.scale.setScalar(c.s); } });
  }

  // ---------- page ----------
  function stageHTML(o, top) {
    return `${top}<section class="o3" id="o3"><div class="o3-host" id="o3Host"></div><div class="o3-vign"></div><div class="o3-flash" id="o3Flash"></div>
      <div class="o3-title" id="o3Title"></div><p class="o3-hint" id="o3Hint"></p>
      <div class="o3-fx" id="o3Fx"><div class="o3-fx-bg"></div><canvas class="o3-fx-c" id="o3FxC"></canvas><div class="o3-fx-name" id="o3FxName"><b></b><span></span></div></div>
      <div class="o3-bar"><button class="btn gold" type="button" id="o3All" hidden>Tout retourner</button><button class="btn gold big" type="button" id="o3Done" hidden>Voir le récapitulatif</button><div class="o3-recap" id="o3Recap" hidden></div>
        <div class="o3-tools"><button class="btn sm" type="button" data-act="skip">Passer</button></div></div>
      <p class="o3-sub">${esc(o.pk.name)}${o.pk.daily || o.pk.cos ? "" : ` · ${o.paid ? "acheté" : "gratuit"}`}</p></section>`;
  }
  const hint = (t) => { const h = $("o3Hint"); if (h) { h.textContent = t; h.style.opacity = t ? 1 : 0; } };
  function mount(el, o, top) {
    el.innerHTML = stageHTML(o, top); el.dataset.o3 = o.o3id; el.dataset.cf = ""; delete el.dataset.rv;
    $("o3Host").appendChild(E.canvas);
    $("o3All").onclick = flipAll; $("o3Done").onclick = finish;
    $("o3Fx").onclick = () => cur?.fxSkip?.();
    if (!E.on) { E.on = true; E.last = performance.now(); requestAnimationFrame(frame); }
    resize(); hint(cur?.phase === "idle" ? cur.hint : cur?.phase === "cards" ? "Touche une carte pour la retourner" : "");
    if (cur?.phase === "cards") $("o3All").hidden = false; if (cur?.phase === "done") showRecap();
  }
  function start(o) {
    stop(true);
    const kind = wantsChest(o) ? "chest" : "pack";
    cur = { o, kind, phase: "idle", run: Math.random(), cards: [], best: bestOf(o), imgs: o.cards.map(() => null) };
    // la meilleure carte de la Dorée compte comme une Légendaire pour la lumière
    if (o.cards.some((x) => x.gold) && RAR[cur.best].rank < 4) cur.best = "l";
    Promise.all(o.cards.map((x, i) => (x.cos ? null : loadImg(imgOf(x)).then((im) => { cur && (cur.imgs[i] = im); }))));
    resetScene();
  }
  function resetScene() {
    const ch = E.ch, P = E.pk, K = E.key, THREE = E.THREE;
    E.tweens = []; debris.forEach((d) => E.scene.remove(d.m)); debris = []; clearProps(); cur.keyIn = cur.turned = false; cur.tintCol = null;
    ch.chest.visible = cur.kind === "chest"; ch.chest.position.set(0, 0, 0); ch.chest.rotation.set(0, 0, 0); ch.chest.scale.setScalar(1); ch.body.rotation.set(0, 0, 0); ch.body.position.set(0, 0, 0);
    ch.lidPivot.rotation.x = 0; ch.crackMat.opacity = 0; ch.setCrack(0); ch.orb.material.opacity = 0; ch.orbCore.visible = false; ch.shaftMat.opacity = 0;
    ch.tint("#2ee6ff", .5); ch.holeMat.color.set("#05030a");
    K.g.visible = cur.kind === "chest"; K.g.scale.setScalar(1); K.inner.rotation.set(0, 0, 0);
    P.pack.visible = cur.kind === "pack"; P.pack.position.set(0, PACK_Y, 0); P.pack.rotation.set(0, 0, 0); P.tilt.rotation.set(0, 0, 0); P.tilt.position.set(0, 0, 0);
    P.dir = 1; for (const s of P.strips) { s.pivot.visible = true; for (const k of s.kids) if (k.parent !== s.pivot) s.pivot.add(k); }
    setTear(0); P.slitMat.opacity = 0; P.light.intensity = 0; P.shaftMat.opacity = 0;
    E.inner.intensity = 0; E.inner.position.set(0, 1.1, 0.1); E.renderer.toneMappingExposure = 1.05; E.bloom.strength = 0.4;
    const n = cur.o.cards.length;
    E.packLine = `P O C H E T T E   ·   ${n}   ${cur.o.pk.cos ? "O B J E T S" : "C A R T E S"}`; P.repaint();
    resize();
    if (E.lay) K.home.set(E.lay.portrait ? 0.9 : 1.9, E.lay.portrait ? 2.3 : 1.7, 1.2); K.g.position.copy(K.home);
    cur.hint = cur.kind === "chest" ? "Touche la clé pour briser le coffre" : "Déchire la pochette le long du pointillé (ou touche-la)"; hint(cur.hint);
  }

  // ---------- les temps forts des 30 scénarios, en 3D ----------
  const V3 = (x, y, z) => new E.THREE.Vector3(x, y, z);
  const HOLE = () => V3(0, 0.55, D / 2 + 0.1);
  const banner3 = (text, col = "#e8c77e") => { const tt = $("o3Title"); if (!tt) return; tt.textContent = text; tt.style.setProperty("--rc", col); tt.classList.remove("go"); void tt.offsetWidth; tt.classList.add("go"); };
  function crackTo(p) { const ch = E.ch, a = ch.crack(); if (p <= a) return; ch.crackMat.opacity = 1; tween(0.35, (t) => ch.setCrack(lerp(a, p, easeOut(t)))); }
  function tintTo(r, k = 1) { const ch = E.ch, c = r === "gold" ? GOLD : HEX[r] || HEX[cur.best]; ch.tint(c, k); E.inner.color.set(c); ch.crackMat.color.set(c).multiplyScalar(3); cur.tintCol = c; return c; }
  async function tremble(n = 1, dur = 0.36) { const b = E.ch.body; await tween(dur * n, (t) => { b.rotation.z = Math.sin(t * Math.PI * 6 * n) * 0.012 * (n + 1) * (1 - t * .3); b.position.y = Math.abs(Math.sin(t * Math.PI * 3 * n)) * 0.02 * (n + 1); }); b.rotation.z = 0; b.position.y = 0; }
  // petits objets lumineux posés dans la scène pour un temps fort, retirés au reset
  const props = [];
  const prop = (o) => { E.scene.add(o); props.push(o); return o; };
  const unprop = (o) => { E.scene.remove(o); const i = props.indexOf(o); if (i >= 0) props.splice(i, 1); };
  const spriteOf = (col, size = 1, op = .8) => { const m = new E.THREE.Sprite(new E.THREE.SpriteMaterial({ map: E.radial, color: new E.THREE.Color(col), blending: E.THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: op })); m.scale.setScalar(size); return m; };
  const iconTex = {};
  const iconSprite = (k, col, size) => { const tex = (iconTex[k + col] ||= canvasTex(256, 256, (g) => drawIcon(g, k, 128, 128, 9, col, 1.6))); const m = new E.THREE.Sprite(new E.THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: E.THREE.AdditiveBlending, opacity: 0 })); m.scale.setScalar(size); return m; };
  let crystal = null;
  const B3 = {
    // la clé file vers la serrure et s'y enfonce
    async insert() {
      const K = E.key, hole = HOLE(), k0 = K.g.position.clone(), r0 = K.inner.rotation.clone(), front = hole.clone().add(V3(0, 0, 1.15));
      K.g.visible = true; K.inner.rotation.z = 0;
      await tween(0.6, (t) => { K.g.position.lerpVectors(k0, front, t); K.inner.rotation.set(lerp(r0.x, 0, t), lerp(r0.y, 0, t), lerp(r0.z, 0, t)); });
      const f1 = K.g.position.clone(); await tween(0.3, (t) => K.g.position.lerpVectors(f1, hole.clone().add(V3(0, 0, 0.26)), t), easeIn);
      E.shake = 0.04; emit(18, hole, "#e8c77e", { speed: 1.4, up: 0.6, life: 0.6, grav: 4 }); cur.keyIn = true; cur.turned = false;
    },
    // un quart de tour : clac, la serrure s'allume
    async turn() {
      const K = E.key, z0 = K.inner.rotation.z; await tween(0.42, (t) => { K.inner.rotation.z = z0 + t * Math.PI / 2; }, easeBack);
      E.ch.holeMat.color.set("#2ee6ff").multiplyScalar(2.4); E.shake = 0.05; emit(12, HOLE(), "#2ee6ff", { speed: 1, up: .5, life: .5, grav: 2 }); cur.turned = true; await wait(160);
    },
    async tint(r) { const c = tintTo(r || cur.best, r ? 0.9 : 1.3); emit(24, V3(0, H, 0), c, { speed: 1.8, spread: 1.4, up: .4, life: .8, grav: 0 }); await tremble(1, .3); await wait(220); },
    async ladder() { for (const [j, r] of ladderOf(cur.best).entries()) { tintTo(r, 0.8 + j * 0.15); emit(10 + j * 6, V3(0, H, 0), HEX[r], { speed: 1.6, spread: 1.4, up: .3, life: .7, grav: 0 }); await tremble(1, .3); await wait(100); } },
    async shake(n = 1) { E.shake = Math.max(E.shake, 0.03 * n); await tremble(n); },
    // les bandeaux d'icônes s'allument un à un et des icônes montent autour du coffre
    async runes(n = 8) {
      const ks = ["logo", "feu", "eau", "vent", "terre", "couronne", "eclair", "sanctuaire"], col = cur.tintCol || "#2ee6ff";
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2, sp = prop(iconSprite(ks[i % ks.length], col, 0.45)); sp.position.set(Math.cos(a) * 1.9, 0.3, Math.sin(a) * 1.4);
        tween(1.6, (t) => { sp.material.opacity = Math.sin(Math.min(1, t * 1.4) * Math.PI / 2) * 0.95; sp.position.y = 0.3 + t * 1.1; }, easeOut);
        E.ch.runeMat.color.set(col).multiplyScalar(0.6 + i / n); await wait(90);
      }
      await wait(250); cur.runes = props.filter((p) => p.isSprite && p.material.map && p.scale.x === 0.45);
    },
    async runesOut() { const rs = cur.runes || []; E.ch.tint("#000", 0); await tween(0.5, (t) => { rs.forEach((r) => { r.material.opacity = 0.95 * (1 - t); }); E.renderer.toneMappingExposure = lerp(1.05, 0.55, t); }); rs.forEach(unprop); cur.runes = []; await tween(0.4, (t) => { E.renderer.toneMappingExposure = lerp(0.55, 1.05, t); }); },
    // un cristal flotte au-dessus du coffre et chante
    async crystal(n = 1) {
      if (!crystal) { const THREE = E.THREE; crystal = prop(new THREE.Group()); const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), new THREE.MeshPhysicalMaterial({ color: "#bff4ff", emissive: "#2ee6ff", emissiveIntensity: .8, roughness: .05, clearcoat: 1, flatShading: true, transparent: true, opacity: .92 })); m.scale.set(1, 1.6, 1); crystal.add(m, spriteOf("#2ee6ff", 1.4, .5)); crystal.position.set(0, 2.1, 0); crystal.scale.setScalar(0.01); crystal.userData.m = m; await tween(0.5, (t) => crystal.scale.setScalar(t), easeBack); }
      for (let i = 0; i < n; i++) { shock(crystal.position.clone(), "#2ee6ff", 2.2, .6, false); await tween(0.42, (t) => crystal.scale.setScalar(1 + Math.sin(t * Math.PI) * .25)); }
    },
    async crack() { if (!crystal) await B3.crystal(1); const m = crystal.userData.m; m.material.emissive.set("#5a6a80"); E.shake = .05; emit(30, crystal.position, "#bff4ff", { speed: 1.4, up: .3, life: .6, grav: 3 }); await tween(0.5, (t) => { crystal.rotation.z = Math.sin(t * Math.PI * 8) * .08; }); },
    async burstCrystal() {
      if (!crystal) return; const c = cur.tintCol || HEX[cur.best], p = crystal.position.clone();
      for (let i = 0; i < 14; i++) { const sh = new E.THREE.Mesh(new E.THREE.TetrahedronGeometry(0.07 + Math.random() * .06), new E.THREE.MeshPhysicalMaterial({ color: "#bff4ff", emissive: c, emissiveIntensity: .7, roughness: .1 })); sh.position.copy(p); E.scene.add(sh); debris.push({ m: sh, v: V3((Math.random() - .5) * 5, 1 + Math.random() * 3, (Math.random() - .5) * 4), w: V3(Math.random() * 10, Math.random() * 10, Math.random() * 10), half: 0.05, t: 0, s0: sh.scale.clone(), gravity: 9.8 }); }
      unprop(crystal); crystal = null; flash(c, .35); shock(p, c, 2.6, .7, false); emit(80, p, c, { speed: 3, life: 1, grav: 2 }); await wait(500);
    },
    // la clé ressort : la serrure résiste
    async keyPop() { const K = E.key, p0 = K.g.position.clone(); await tween(0.45, (t) => { K.g.position.copy(p0).add(V3(0, Math.sin(t * Math.PI) * .25, t * .9)); K.inner.rotation.x = -t * .5; }, easeOut); hint("…la serrure résiste"); E.shake = .06; cur.keyIn = false; await wait(400); hint(""); },
    // la clé se brise en deux morceaux qui tombent
    async keyBreak() {
      const K = E.key; K.g.updateMatrixWorld(true); E.shake = .1; emit(40, K.g.position, "#e8c77e", { speed: 2.5, life: .8, grav: 4 });
      for (const side of [-1, 1]) { const piece = K.inner.clone(true); K.inner.matrixWorld.decompose(piece.position, piece.quaternion, piece.scale); piece.position.x += side * .05; E.scene.add(piece); debris.push({ m: piece, v: V3(side * 1.2, 1.5, .8), w: V3(Math.random() * 6, Math.random() * 6, side * 8), half: 0.1, t: 0, s0: piece.scale.clone(), gravity: 9.8 }); }
      K.g.visible = false; cur.keyIn = false; cur.turned = false; hint("La clé s'est brisée…"); await wait(700); hint("");
    },
    // une clé dorée apparaît
    async goldKey() {
      const K = E.key; K.g.position.copy(K.home); K.inner.rotation.set(0, 0, 0); K.g.scale.setScalar(.01); K.g.visible = true;
      const gm = new E.THREE.MeshStandardMaterial({ color: "#ffd86a", metalness: 1, roughness: .18, emissive: "#a8741c", emissiveIntensity: .6 }); K.inner.traverse((m) => { if (m.isMesh && m.material === E.gold) { m.userData.gold0 = m.material; m.material = gm; } });
      K.glow.material.color.set("#ffd86a"); emit(50, K.home, "#ffd86a", { speed: 1.6, up: .6, life: .9, grav: 0 }); hint("Une clé dorée apparaît");
      await tween(0.6, (t) => K.g.scale.setScalar(t), easeBack); await wait(250); hint("");
    },
    // le couvercle se soulève : la lumière filtre… puis il retombe
    async lidPeek() { const ch = E.ch; ch.shaftMat.color.set(cur.tintCol || "#fff"); await tween(0.5, (t) => { ch.lidPivot.rotation.x = -t * .32; E.inner.intensity = t * 3; ch.shaftMat.opacity = t * .12; }, easeOut); await wait(300); },
    async lidFall() { const ch = E.ch; await tween(0.18, (t) => { ch.lidPivot.rotation.x = -.32 * (1 - t); E.inner.intensity = 3 * (1 - t); ch.shaftMat.opacity = .12 * (1 - t); }, easeIn); E.shake = .12; emit(60, V3(0, .05, 0), "#6a5a9a", { speed: 2.4, up: .3, life: 1, grav: 3, jitter: .6 }); await tremble(2, .25); },
    async blackout() { await tween(0.5, (t) => { E.renderer.toneMappingExposure = lerp(1.05, 0.08, t); E.ringMat.opacity = .9 * (1 - t); }); await wait(500); },
    // le coffre est soulevé par la lumière et retombe lourdement
    async redrop() {
      const c = E.ch.chest; tween(0.4, (t) => { E.renderer.toneMappingExposure = lerp(0.08, 1.05, t); E.ringMat.opacity = .9 * t; });
      await tween(0.45, (t) => { c.position.y = t * 0.7; c.rotation.y = t * .3; }, easeOut); await tween(0.28, (t) => { c.position.y = .7 * (1 - t); c.rotation.y = .3 * (1 - t); }, easeIn);
      E.shake = .16; shock(V3(0, .03, 0), cur.tintCol || "#fff", 3.5, .7); emit(80, V3(0, .05, 0), "#6a5a9a", { speed: 3, up: .3, life: 1.1, grav: 3, jitter: .8 }); await wait(250);
    },
    async dust() { for (let k = 0; k < 3; k++) { emit(40, V3(0, .1, 0), k % 2 ? "#a99cc8" : (cur.tintCol || "#2ee6ff"), { speed: 2.4, spread: 1.4, up: .5, life: 1.2, grav: -.4, jitter: 1 }); await wait(220); } await wait(300); },
    // trois sphères violettes se détachent du coffre, tournent, puis s'y fondent
    async split(r = "e") {
      const c = HEX[r], orbs = [0, 1, 2].map(() => prop(spriteOf(c, .5, .9)));
      await tween(1.3, (t) => orbs.forEach((o, i) => { const a = t * Math.PI * 3 + i * Math.PI * 2 / 3, rr = Math.sin(t * Math.PI) * 1.3; o.position.set(Math.cos(a) * rr, 1.2 + Math.sin(t * Math.PI) * .6, Math.sin(a) * rr * .7); }));
      orbs.forEach(unprop); flash(c, .3); emit(60, V3(0, 1.1, 0), c, { speed: 2, life: .8, grav: 0 });
    },
    // deux couronnes d'or montent et s'entrechoquent
    async crowns() {
      const THREE = E.THREE, mk = (x) => { const g = prop(new THREE.Group()); g.add(new THREE.Mesh(new THREE.CylinderGeometry(.24, .24, .12, 24, 1, true), E.gold)); for (let i = 0; i < 6; i++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(.05, .16, 8), E.gold); const a = i / 6 * Math.PI * 2; sp.position.set(Math.cos(a) * .24, .13, Math.sin(a) * .24); g.add(sp); } g.position.set(x, .8, .4); return g; };
      const a = mk(-1.6), b = mk(1.6);
      await tween(0.9, (t) => { a.position.set(lerp(-1.6, -.2, t), .8 + t * 1.4, .4); b.position.set(lerp(1.6, .2, t), .8 + t * 1.4, .4); a.rotation.y = b.rotation.y = t * 6; }, easeIO);
      flash(HEX.l, .5); E.shake = .1; emit(90, V3(0, 2.2, .4), HEX.l, { speed: 3, life: 1, grav: 2 }); unprop(a); unprop(b); await wait(300);
    },
    // une éclipse passe devant un soleil doré, puis la couronne rouge
    async eclipse() {
      const THREE = E.THREE, sun = prop(spriteOf(HEX.l, 2.4, .9)), disk = prop(new THREE.Mesh(new THREE.CircleGeometry(.6, 48), new THREE.MeshBasicMaterial({ color: "#05030a" })));
      sun.position.set(0, 2.6, -1); disk.position.set(-2.2, 2.6, -.9);
      await tween(1.2, (t) => { disk.position.x = lerp(-2.2, 0, easeOut(t)); E.renderer.toneMappingExposure = lerp(1.05, .5, t); });
      sun.material.color.set(HEX.m); flash(HEX.m, .4); await tween(.6, (t) => { sun.scale.setScalar(2.4 + t * 1.2); E.renderer.toneMappingExposure = lerp(.5, 1.05, t); });
      unprop(sun); unprop(disk);
    },
    // un reflet du coffre en sort et y revient
    async twin() {
      const g = prop(E.ch.chest.clone(true)); g.traverse((m) => { if (m.isMesh) { m.material = additive({ color: new E.THREE.Color(cur.tintCol || HEX[cur.best]).multiplyScalar(.5), opacity: .45 }); } });
      await tween(0.6, (t) => { g.position.x = t * 2.4; g.position.z = -t * .6; }, easeOut); await wait(250); await tween(0.5, (t) => { g.position.x = 2.4 * (1 - t); g.position.z = -.6 * (1 - t); }, easeIn);
      unprop(g); E.shake = .1; flash(cur.tintCol || "#fff", .3);
    },
    // une pluie de pièces d'or qui rebondissent sur le sol
    async coins() {
      const THREE = E.THREE, geo = new THREE.CylinderGeometry(.09, .09, .02, 20);
      for (let i = 0; i < 30; i++) { const m = new THREE.Mesh(geo, E.gold); m.castShadow = true; m.position.set((Math.random() - .5) * 3.4, 4 + Math.random() * 2, (Math.random() - .5) * 2.4); E.scene.add(m); debris.push({ m, v: V3(0, -1 - Math.random() * 2, 0), w: V3(Math.random() * 12, Math.random() * 4, Math.random() * 12), half: .02, t: 0, s0: m.scale.clone(), gravity: 9.8 }); if (i % 3 === 0) await wait(40); }
      await wait(900);
    },
    async gild() { const m = E.bodyMat; m.userData.c0 ||= m.color.clone(); const c0 = m.color.clone(), c1 = new E.THREE.Color("#e8c77e"); await tween(.7, (t) => { m.color.lerpColors(c0, c1, t); m.metalness = lerp(.55, .9, t); }); },
    // un reflet de lumière passe sur le coffre
    async sheen() { const pl = prop(new E.THREE.Mesh(new E.THREE.PlaneGeometry(.5, 2.2), additive({ color: new E.THREE.Color("#fff4c8").multiplyScalar(.8), opacity: .7 }))); pl.rotation.z = -.5; pl.position.set(-2, .7, D / 2 + .25); await tween(.8, (t) => { pl.position.x = lerp(-2, 2, t); }); unprop(pl); },
    // des fils de lumière s'enroulent autour du coffre, puis cèdent
    async chrysalis() {
      const THREE = E.THREE, c = cur.tintCol || HEX[cur.best], rings = [0, 1, 2, 3].map((i) => { const r = prop(new THREE.Mesh(new THREE.TorusGeometry(1.5, .012, 8, 96), glowMat(c))); r.position.y = .2 + i * .3; r.rotation.x = Math.PI / 2 + (i - 1.5) * .15; r.scale.setScalar(.01); return r; });
      await tween(1, (t) => rings.forEach((r, i) => { r.scale.setScalar(Math.min(1, t * 1.6 - i * .1)); r.rotation.z = t * (3 + i); }));
      E.shake = .08; emit(80, V3(0, .8, 0), c, { speed: 2.5, life: .9, grav: 1, jitter: .8 }); rings.forEach(unprop); await wait(200);
    },
    // une colonne de lumière tombe du ciel sur le coffre
    async column() {
      const c = cur.tintCol || HEX[cur.best], col = prop(new E.THREE.Mesh(new E.THREE.CylinderGeometry(.9, .9, 12, 48, 1, true), additive({ map: E.shaftTex, color: new E.THREE.Color(c), opacity: 0, side: E.THREE.DoubleSide })));
      col.position.y = 6; col.rotation.x = Math.PI;
      await tween(.35, (t) => { col.material.opacity = t * .5; col.scale.x = col.scale.z = 1 - t * .5; }, easeIn);
      flash(c, .45); E.shake = .15; shock(V3(0, .03, 0), c, 5, .9); await wait(500); await tween(.5, (t) => { col.material.opacity = .5 * (1 - t); }); unprop(col);
    },
    // la nuit tombe : un ciel d'étoiles s'allume
    async stars() {
      const THREE = E.THREE, n = 400, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI, r = 14; pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = 1 + Math.random() * 8; pos[i * 3 + 2] = -Math.sin(a) * r * .8; }
      const st = prop(new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(pos, 3)), new THREE.PointsMaterial({ size: .12, map: E.radial, color: "#ffffff", transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })));
      await tween(1, (t) => { st.material.opacity = t; E.renderer.toneMappingExposure = lerp(1.05, .7, t); });
      cur.stars = st; tween(.6, (t) => { E.renderer.toneMappingExposure = lerp(.7, 1.05, t); });
    },
    // l'emblème géant se dresse derrière le coffre
    async kanji() { const sp = prop(iconSprite("logo", cur.tintCol || "#e8c77e", 3)); sp.position.set(0, 2.4, -1.2); await tween(.6, (t) => { sp.material.opacity = t; sp.scale.setScalar(2 + t); }, easeOut); await wait(500); await tween(.5, (t) => { sp.material.opacity = 1 - t; }); unprop(sp); },
    // des cartes face cachée tournent autour du coffre puis plongent dedans
    async orbit() {
      const cs = [0, 1, 2, 3, 4].map(() => { const m = prop(new E.THREE.Mesh(E.faceGeo, E.backMat)); m.scale.setScalar(.45); return m; });
      await tween(1.4, (t) => cs.forEach((m, i) => { const a = t * Math.PI * 4 + i * Math.PI * 2 / 5, rr = 2 - t * 1.6; m.position.set(Math.cos(a) * rr, 1 + Math.sin(t * Math.PI) * .8, Math.sin(a) * rr * .8); m.rotation.y = -a; }));
      cs.forEach(unprop); emit(60, V3(0, 1, 0), cur.tintCol || "#fff", { speed: 2, life: .8, grav: 0 });
    },
    async quake() { E.shake = .3; shock(V3(0, .03, 0), "#a99cc8", 6, 1); emit(140, V3(0, .05, 0), "#6a5a9a", { speed: 4, spread: 1.6, up: .4, life: 1.3, grav: 4, jitter: 2 }); await tremble(3, .25); },
    // des voiles d'aurore ondulent derrière le coffre
    async aurora() {
      const THREE = E.THREE, cols = ["#3fdc8f", "#2ee6ff", "#b072ff"], vs = cols.map((c, i) => { const m = prop(new THREE.Mesh(new THREE.PlaneGeometry(9, 3, 40, 1), additive({ map: E.shaftTex, color: new THREE.Color(c).multiplyScalar(.7), opacity: 0, side: THREE.DoubleSide }))); m.position.set(0, 3 + i * .4, -3 - i * .5); m.userData.p0 = Float32Array.from(m.geometry.attributes.position.array); return m; });
      await tween(1.6, (t) => vs.forEach((m, i) => { m.material.opacity = Math.sin(t * Math.PI) * .6; const p = m.geometry.attributes.position, p0 = m.userData.p0; for (let k = 0; k < p.count; k++) p.setZ(k, p0[k * 3 + 2] + Math.sin(p0[k * 3] * .8 + t * 6 + i) * .6); p.needsUpdate = true; }));
      vs.forEach(unprop);
    },
    async banner(text) { banner3(text, cur.tintCol || "#e8c77e"); await wait(1500); },
    async pause(ms = 400) { await wait(ms); },
  };
  function clearProps() {
    props.splice(0).forEach((o) => E.scene.remove(o)); crystal = null;
    const m = E.bodyMat; if (m.userData.c0) { m.color.copy(m.userData.c0); m.metalness = .55; }
    E.key.inner.traverse((x) => { if (x.isMesh && x.userData.gold0) { x.material = x.userData.gold0; delete x.userData.gold0; } }); E.key.glow.material.color.set("#e8c77e");
    E.ringMat.opacity = .9;
  }

  // ---------- le coffre s'ouvre ----------
  const ladderOf = (top) => LAD.slice(0, RAR[top].rank >= 4 ? 4 : LAD.indexOf(lad(top)) + 1);
  async function openChest() {
    if (!cur || cur.kind !== "chest" || cur.phase !== "idle") return;
    const me = cur.run, THREE = E.THREE, ch = E.ch, K = E.key, top = cur.best, tc = HEX[top], hole3 = new THREE.Vector3(0, 0.55, D / 2 + 0.1);
    cur.phase = "opening"; hint("");
    const c0 = E.cam.pos.clone(), cl0 = E.cam.look.clone(), cTo = E.lay.chestCam.pos.clone().multiplyScalar(0.82).add(new THREE.Vector3(0, -0.2, 0)), clTo = new THREE.Vector3(0, 0.75, 0);
    tween(0.75, (t) => { E.cam.pos.lerpVectors(c0, cTo, t); E.cam.look.lerpVectors(cl0, clTo, t); });
    // le scénario tiré par le serveur (30 possibles) : ses temps forts, rejoués en 3D ; « open » brise le coffre
    const sc = CHEST_BY_ID[cur.o.scenario] || CHEST_BY_ID["cl-echelle"];
    cur.beats = sc.beats.filter((b) => b[0] !== "open").length || 1; cur.beatI = 0;
    for (const [b, ...args] of sc.beats) {
      if (!alive(me)) return;
      if (b === "open") break;
      try { await (B3[b] || B3.pause)(...args); } catch (e) { console.warn(e); }
      cur.beatI++; if (["tint", "shake", "ladder", "turn", "quake"].includes(b)) crackTo(cur.beatI / cur.beats * 0.75);
    }
    if (!alive(me)) return;
    if (!cur.keyIn) await B3.insert(); if (!cur.turned) await B3.turn();
    if (!alive(me)) return;
    ch.body.rotation.z = 0; ch.body.position.y = 0; ch.tint(tc, 1.4); E.inner.color.set(tc);
    ch.crackMat.color.set(tc).multiplyScalar(3); ch.crackMat.opacity = 1;
    const cs = ch.crack(); await tween(0.3, (t) => { ch.chest.scale.setScalar(1 + t * 0.06); ch.body.rotation.z = Math.sin(t * Math.PI * 14) * 0.02 * t; E.inner.intensity = t * 4; ch.setCrack(lerp(cs, 1, t)); }, easeIn);
    K.g.visible = false; ch.shaftMat.color.set(tc);
    const rk = RAR[top].rank, power = [1, 1, 1, 1.05, 1.15, 1.3][rk];
    shatter(power, tc); flash(tc, rk >= 4 ? 0.5 : 0.3); E.shake = rk >= 4 ? 0.22 : 0.12;
    shock(new THREE.Vector3(0, 0.03, 0), tc, 5, 1.1);
    ch.orb.material.color.set(tc); ch.orbCore.material.color.set(tc).multiplyScalar(2); ch.orbCore.visible = true; E.inner.position.set(0, 1, 0);
    tween(0.5, (t) => { ch.orb.scale.setScalar(lerp(4, 1.3, t)); ch.orb.material.opacity = lerp(0.8, 0.55, t); E.inner.intensity = lerp(18, 6, t); E.bloom.strength = lerp(0.8, 0.5, t); }, easeOut);
    await wait(320); if (!alive(me)) return;
    await dealCards(ch.orb.position.clone(), tc, (c, i, s) => ({ p0: ch.orb.position.clone(), rot0: -Math.PI / 2, mid: new THREE.Vector3(s.x * 0.5, s.y + 1.6, s.z * 0.4) }));
    tween(1.2, (t) => { E.inner.intensity = lerp(6, 1.5, t); ch.orb.material.opacity = lerp(0.55, 0.1, t); ch.orb.scale.setScalar(lerp(1.3, 0.7, t)); ch.orbCore.scale.setScalar(1 - t); }).then(() => { ch.orbCore.visible = false; ch.orbCore.scale.setScalar(1); });
  }

  // ---------- la pochette se déchire ----------
  let drag = null;
  function packScreenWidth() {
    const a = new E.THREE.Vector3(-HW, TEAR, 0), b = new E.THREE.Vector3(HW, TEAR, 0); E.pk.tilt.localToWorld(a); E.pk.tilt.localToWorld(b); a.project(E.camera); b.project(E.camera);
    return Math.max(40, Math.abs(b.x - a.x) / 2 * innerWidth);
  }
  function tearTint(p) {
    const P = E.pk, L = ladderOf(cur.best), r = L[Math.min(L.length - 1, Math.floor(p * L.length * 0.999))], col = new E.THREE.Color(HEX[r]);
    P.slitMat.color.copy(col).multiplyScalar(1.6); P.slitLine.material.color.copy(col).multiplyScalar(2.4); P.light.color.copy(col);
    P.slitMat.opacity = Math.min(1, p * 3) * 0.9; P.light.intensity = p * 3.5;
    return r;
  }
  function tearTo(p) {
    if (!cur || cur.kind !== "pack" || (cur.phase !== "idle" && cur.phase !== "tearing")) return;
    const P = E.pk, prev = P.p; p = Math.max(prev, Math.min(1, p)); if (p === prev) return;
    cur.phase = "tearing"; setTear(p); const r = tearTint(p);
    const at = new E.THREE.Vector3(P.dir > 0 ? -HW + p * PW : HW - p * PW, TEAR, 0.05); P.tilt.localToWorld(at);
    emit(Math.ceil((p - prev) * 120), at, HEX[r], { speed: 1.6, spread: 0.8, up: 0.8, life: 0.6, grav: 3, jitter: 0.02 });
    E.shake = Math.max(E.shake, 0.012); P.tilt.rotation.z = Math.sin(p * 40) * 0.01;
    if (p >= 1) release();
  }
  async function autoTear() {
    if (!cur || cur.kind !== "pack" || (cur.phase !== "idle" && cur.phase !== "tearing")) return;
    const p0 = E.pk.p; hint("");
    await tween(0.9 * (1 - p0) + 0.1, (t) => tearTo(lerp(p0, 1, t)), easeIO);
  }
  async function release() {
    if (cur.phase !== "tearing" && cur.phase !== "idle") return;
    const me = cur.run, THREE = E.THREE, P = E.pk, top = cur.best, tc = HEX[top], rk = RAR[top].rank;
    cur.phase = "opening"; hint("");
    if (top === "m") {
      await wait(120); P.slitMat.opacity = 0; P.light.intensity = 0; P.slitLine.material.color.set("#05030a"); await wait(520); if (!alive(me)) return;
      E.shake = 0.12; P.slitLine.material.color.set(tc).multiplyScalar(3); P.light.color.set(tc);
      await tween(0.35, (t) => { P.slitMat.opacity = t; P.light.intensity = t * 6; P.tilt.rotation.z = Math.sin(t * Math.PI * 14) * 0.03; });
    }
    if (!alive(me)) return;
    P.cap.updateMatrixWorld(true);
    for (const s of P.strips) {
      const g = new THREE.Group(); s.pivot.matrixWorld.decompose(g.position, g.quaternion, g.scale);
      for (const k of s.kids) g.add(k); E.scene.add(g); s.pivot.visible = false;
      debris.push({ m: g, v: new THREE.Vector3(P.dir * (1.4 + Math.random()) + (s.x / HW) * 0.6, 3 + Math.random() * 1.5, 0.8 + Math.random()), w: new THREE.Vector3((Math.random() - .5) * 8, (Math.random() - .5) * 8, (Math.random() - .5) * 10), half: null, t: 0, s0: g.scale.clone(), gravity: 7, strip: s });
    }
    const mouth = new THREE.Vector3(0, TEAR + 0.05, 0); P.tilt.localToWorld(mouth);
    flash(tc, rk >= 4 ? 0.5 : 0.28); E.shake = rk >= 4 ? 0.18 : 0.08;
    emit(rk >= 4 ? 260 : 140, mouth, tc, { speed: 4 * (1 + rk * 0.1), up: 1.4, life: 1.6, grav: 2, drag: 1.1, jitter: 0.3 });
    shock(mouth, tc, 1.6, 0.7, false); P.shaftMat.color.set(tc);
    tween(0.5, (t) => { P.shaftMat.opacity = t * 0.22; P.light.intensity = lerp(6, 12, t); E.bloom.strength = lerp(0.4, 0.75, t); P.tilt.position.y = -Math.sin(t * Math.PI) * 0.08; }, easeOut);
    await wait(280); if (!alive(me)) return;
    const up = mouth.clone().add(new THREE.Vector3(0, 0.9, 0));
    await dealCards(mouth, tc, (c, i, s) => ({ p0: mouth.clone().add(new THREE.Vector3(0, -0.9, 0)), rise: up, rot0: 0, mid: new THREE.Vector3(s.x * 0.5, s.y + 1.2, s.z * 0.5) }), 130);
    tween(0.6, (t) => { P.pack.position.y = lerp(PACK_Y, -1.6, easeIn(t)); P.pack.rotation.z = t * 0.5; P.shaftMat.opacity = (1 - t) * 0.2; P.light.intensity = (1 - t) * 6; E.bloom.strength = lerp(0.75, 0.35, t); }).then(() => { if (cur?.run === me) P.pack.visible = false; });
  }
  // les cartes sortent et viennent se poser devant toi ; les cosmétiques passent au dévoilement habituel
  async function dealCards(from, tc, path, gap = 70) {
    const me = cur.run, o = cur.o;
    if (o.pk.cos) { await wait(500); if (!alive(me)) return; return handOff(); }
    cur.cards = o.cards.map((x, i) => makeCard(x, i, cur.imgs[i])); E.lay.slots = slotsFor(cur.cards.length, E.lay.portrait);
    const camFrom = E.cam.pos.clone(), lookFrom = E.cam.look.clone();
    tween(1.0, (t) => { E.cam.pos.lerpVectors(camFrom, E.lay.cardCam.pos, t); E.cam.look.lerpVectors(lookFrom, E.lay.cardCam.look, t); });
    await Promise.all(cur.cards.map(async (c, i) => {
      const s = E.lay.slots[i], P0 = path(c, i, s); c.home.set(s.x, s.y, s.z); c.homeRz = s.rz; c.s = s.s; c.busy = true;
      c.root.position.copy(P0.p0); c.root.scale.setScalar(0.2); c.root.rotation.set(P0.rot0, 0, 0); c.root.visible = false;
      await wait(gap * i); if (!alive(me)) return;
      c.root.visible = true; emit(14, from, tc, { speed: 1.5, up: 1.2, life: 0.8 });
      if (P0.rise) { const a = c.root.position.clone(); c.root.scale.setScalar(0.85 * c.s); await tween(0.28, (t) => c.root.position.lerpVectors(a, P0.rise, t), easeOut); }
      const p0 = c.root.position.clone(), mid = P0.mid, spin = (i % 5 - 2) * 0.6, sc0 = c.root.scale.x, r0 = c.root.rotation.x;
      await tween(0.6, (t) => {
        const u = 1 - t; c.root.position.set(u * u * p0.x + 2 * u * t * mid.x + t * t * s.x, u * u * p0.y + 2 * u * t * mid.y + t * t * s.y, u * u * p0.z + 2 * u * t * mid.z + t * t * s.z);
        c.root.scale.setScalar(lerp(sc0, c.s, t)); c.root.rotation.set(lerp(r0, 0, t), (s.ry || 0) * t, lerp(spin, s.rz, t));
      }, easeOut);
      c.busy = false;
      if (c.rk >= 3) tween(0.6, (t) => { c.halo.material.opacity = t * (c.rk >= 4 ? 0.28 : 0.2); c.edgeMat.emissiveIntensity = t * 0.6; });
    }));
    if (!alive(me)) return;
    cur.phase = "cards"; $("o3All").hidden = false; hint(`Touche une carte pour la retourner`);
  }
  function handOff() { const o = cur.o; stop(); o.phase = "cards"; o.i = 0; o.flipped = false; drawOpening(); }

  // ---------- retourner les cartes ----------
  async function flipCard(c) {
    if (!cur || c.flipped || c.busy || cur.phase !== "cards") return;
    const me = cur.run; c.busy = true; c.flipped = true;
    const mythic = c.rar === "m", big = c.rk >= 4;
    if (mythic) {
      const e0 = E.renderer.toneMappingExposure;
      await tween(0.45, (t) => { E.renderer.toneMappingExposure = lerp(e0, 0.45, t); c.tilt.position.x = (Math.random() - .5) * 0.04 * t; c.tilt.position.y = (Math.random() - .5) * 0.04 * t; c.halo.material.opacity = 0.26 + t * 0.2; });
      c.tilt.position.set(0, 0, 0); tween(0.6, (t) => { E.renderer.toneMappingExposure = lerp(0.45, 1.05, t); });
    }
    const dur = [0.5, 0.5, 0.55, 0.62, 0.7, 0.75][Math.min(5, c.rk)], start = c.root.position.clone();
    let fired = false;
    await tween(dur, (t) => {
      const lift = Math.sin(t * Math.PI);
      c.root.position.set(start.x, start.y + lift * 0.28, start.z + lift * (big ? 0.9 : 0.5));
      c.flip.rotation.y = t * Math.PI; c.flip.rotation.z = Math.sin(t * Math.PI) * (big ? 0.25 : 0.12);
      if (!fired && t > 0.5) { fired = true; burst(c); }
    }, easeIO);
    c.flip.rotation.set(0, Math.PI, 0); c.root.position.copy(start);
    if (big && alive(me)) { await wait(150); await cutscene(c); }
    c.busy = false;
    if (alive(me) && cur.cards.every((x) => x.flipped)) { cur.phase = "done"; $("o3All").hidden = true; hint(""); showRecap(); }
  }
  function burst(c) {
    const p = new E.THREE.Vector3(); c.tilt.getWorldPosition(p); p.z += 0.15;
    const rk = Math.min(5, c.rk), col = c.col;
    emit([12, 12, 26, 60, 140, 220][rk], p, col, { speed: [1.2, 1.2, 2, 2.8, 3.8, 4.6][rk], up: 0.6, life: [0.6, 0.6, 0.8, 1.1, 1.5, 1.8][rk], grav: 1.5, drag: 1.4, jitter: 0.2 });
    tween(rk >= 4 ? 1.4 : 0.7, (t) => { c.light.intensity = Math.sin(t * Math.PI) * [0.3, 0.3, 0.8, 1.5, 2.5, 3.5][rk]; c.halo.material.opacity = rk >= 2 ? Math.max(rk >= 4 ? 0.16 : 0.08, (1 - t) * 0.6) : (1 - t) * 0.15; });
    if (rk >= 3) shock(p, col, rk >= 4 ? 2.6 : 1.8, rk >= 4 ? 0.9 : 0.6, false);
    if (rk >= 4) {
      E.shake = rk === 5 ? 0.16 : 0.1; tween(1.2, (t) => { E.bloom.strength = 0.4 + Math.sin(t * Math.PI) * (rk === 5 ? 0.3 : 0.2); });
      const tt = $("o3Title"); if (tt) { tt.textContent = (c.rar === "gold" ? "Dorée" : LABEL(c.rar)).toUpperCase(); tt.style.setProperty("--rc", col); tt.classList.remove("go"); void tt.offsetWidth; tt.classList.add("go"); }
    }
  }
  async function flipAll() {
    $("o3All").hidden = true;
    for (const c of cur?.cards || []) if (!c.flipped && cur) { if (c.rk >= 4) await flipCard(c); else { flipCard(c); await wait(220); } }
  }
  // récapitulatif dans la scène : les cartes restent en 3D, le titre et les boutons s'affichent par-dessus
  function showRecap() {
    const box = $("o3Recap"); if (!box || !cur) return;
    const r = recapParts(cur.o); box.innerHTML = `<div class="o3-recap-h">${r.head}</div>${r.actions}<p class="o3-recap-tip">Touche une carte pour voir sa fiche</p>`;
    box.hidden = false; $("o3").classList.add("recap");
  }
  function finish() { const o = cur?.o; stop(); if (o) { o.phase = "done"; drawOpening(); } }

  // ---------- la carte prend vie (Légendaire, Mythique, Dorée) ----------
  function tinted(img, color) { const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const g = c.getContext("2d"); g.drawImage(img, 0, 0); g.globalCompositeOperation = "multiply"; g.fillStyle = color; g.fillRect(0, 0, c.width, c.height); g.globalCompositeOperation = "destination-in"; g.drawImage(img, 0, 0); return c; }
  function hexFloor(g, W0, Hh, color, t, alpha) {
    const hy = Hh * 0.56, F = Hh * 0.5, S = 0.55, row = S * 1.5, col = S * Math.sqrt(3), scroll = (t * 0.6) % (row * 2);
    g.save(); g.strokeStyle = color; g.lineJoin = "round";
    for (let r = 22; r >= 0; r--) {
      const zr = 0.7 + r * row - scroll; if (zr - S < 0.45) continue;
      const ox = (r % 2) * col / 2;
      for (let i = -14; i <= 14; i++) {
        const x = i * col + ox; g.beginPath();
        for (let k = 0; k < 6; k++) { const a = Math.PI / 3 * k + Math.PI / 6, px = x + Math.cos(a) * S * .92, pz = zr + Math.sin(a) * S * .92; g.lineTo(W0 / 2 + px * F / pz, hy + 1.2 * F / pz); }
        g.closePath(); g.globalAlpha = alpha * Math.max(0, Math.min(1, 1.6 / zr)) * (0.75 + Math.sin(t * 3 + i * .5 + r) * .25); g.lineWidth = Math.max(0.6, 3 / zr); g.stroke();
      }
    }
    g.restore();
  }
  function cutscene(c) {
    const img = c.img, fxEl = $("o3Fx"), fxC = $("o3FxC"); if (!img || !fxEl || !fxC) return Promise.resolve();
    const fxG = fxC.getContext("2d"), col = c.col, red = tinted(img, "#ff2e88"), cyan = tinted(img, "#2ee6ff");
    fxEl.style.setProperty("--rc", col);
    const nm = $("o3FxName"); nm.querySelector("b").textContent = nameOf(c.x.c); nm.querySelector("span").textContent = c.rar === "gold" ? "Dorée" : LABEL(c.rar); nm.classList.remove("go"); void nm.offsetWidth; nm.classList.add("go");
    fxEl.classList.add("on");
    const dpr = Math.min(devicePixelRatio, 1.5), Wd = innerWidth, Hh = innerHeight; fxC.width = Wd * dpr; fxC.height = Hh * dpr; fxG.setTransform(dpr, 0, 0, dpr, 0, 0);
    const petals = Array.from({ length: 70 }, () => ({ x: Math.random() * Wd * 1.4 - Wd * .2, y: -Math.random() * Hh, vx: 60 + Math.random() * 120, vy: 140 + Math.random() * 160, a: Math.random() * 7, s: 4 + Math.random() * 7, c: Math.random() < .6 ? col : "#ff2e88" }));
    const TT = 2.7; let t = 0, last = performance.now();
    return new Promise((res) => {
      let done = false; const end = () => { if (done) return; done = true; fxEl.classList.remove("on"); if (cur) cur.fxSkip = null; res(); }; if (cur) cur.fxSkip = end;
      const step = (now) => {
        if (done) return; if (!E.on) return end();
        t += Math.min(0.05, (now - last) / 1000) * (window.__speed || 1); last = now; if (t > TT) return end();
        fxG.clearRect(0, 0, Wd, Hh);
        const pw = Math.min(Wd * .92, Hh * .62 * img.width / img.height), ph = pw * img.height / img.width, cx = Wd / 2, cy = Hh * .44;
        const drop = t < .32 ? easeOut(t / .32) : 1, out = t > 2.25 ? easeIn((t - 2.25) / .45) : 0;
        const close = t > 1.45 && t < 2.25 ? easeIO(Math.min(1, (t - 1.45) / .3)) : t >= 2.25 ? 1 : 0;
        const zoom = 1.04 + Math.min(t, 1.45) * .06 + close * .9, fy = close * ph * .22;
        const glitch = (t < .4 ? 1 - t / .4 : 0) + (t > 1.42 && t < 1.55 ? 1 : 0) + out * 1.5;
        fxG.shadowBlur = 0; hexFloor(fxG, Wd, Hh, col, t, Math.min(1, t * 3) * (1 - out));
        fxG.save(); fxG.globalAlpha = 1 - out * .9;
        fxG.translate(cx, cy + (1 - drop) * -Hh * .9); fxG.rotate((1 - drop) * -.08);
        const sk = ph * .08; fxG.beginPath(); fxG.moveTo(-pw / 2, -ph / 2 + sk); fxG.lineTo(pw / 2, -ph / 2); fxG.lineTo(pw / 2, ph / 2 - sk); fxG.lineTo(-pw / 2, ph / 2); fxG.closePath();
        fxG.save(); fxG.clip();
        const dw = pw * zoom, dh = ph * zoom, dx = -dw / 2, dy = -dh / 2 + fy * zoom;
        if (glitch > 0.02) {
          const off = 10 * glitch + Math.random() * 8 * glitch;
          fxG.globalCompositeOperation = "lighter"; fxG.drawImage(red, dx - off, dy, dw, dh); fxG.drawImage(cyan, dx + off, dy, dw, dh); fxG.globalCompositeOperation = "source-over";
          for (let k = 0; k < 7 * glitch; k++) { const sy = Math.random() * img.height, shh = 6 + Math.random() * 30, o2 = (Math.random() - .5) * 80 * glitch; fxG.drawImage(img, 0, sy, img.width, shh, dx + o2, dy + sy / img.height * dh, dw, shh / img.height * dh); }
        } else fxG.drawImage(img, dx, dy, dw, dh);
        fxG.restore();
        fxG.lineWidth = 3; fxG.strokeStyle = col; fxG.shadowColor = col; fxG.shadowBlur = 22; fxG.stroke(); fxG.restore();
        for (const [ts, a0, a1, rr] of [[.55, -2.6, .2, .48], [.8, 2.5, -.4, .42], [1.6, -2.9, .5, .5]]) {
          const k = (t - ts) / .32; if (k < 0 || k > 1.6) continue;
          const head = Math.min(1, k), tail = Math.max(0, k - .45) / 1.15, R0 = Math.min(Wd, Hh) * rr, a = (u) => a0 + (a1 - a0) * u;
          fxG.save(); fxG.translate(cx, cy); fxG.lineCap = "round";
          fxG.strokeStyle = col; fxG.shadowColor = col; fxG.shadowBlur = 30; fxG.lineWidth = 16 * (1 - tail); fxG.globalAlpha = 1 - Math.max(0, k - 1) / .6;
          fxG.beginPath(); fxG.arc(0, 0, R0, Math.min(a(tail), a(head)), Math.max(a(tail), a(head))); fxG.stroke();
          fxG.strokeStyle = "#fff"; fxG.lineWidth = 5 * (1 - tail); fxG.stroke(); fxG.restore();
        }
        for (const pt of petals) { pt.x += pt.vx / 60; pt.y += pt.vy / 60; pt.a += .08; if (t < .5) continue; fxG.save(); fxG.translate(pt.x, pt.y); fxG.rotate(pt.a); fxG.globalAlpha = .85 * (1 - out); fxG.fillStyle = pt.c; fxG.beginPath(); fxG.ellipse(0, 0, pt.s, pt.s * .45, 0, 0, 7); fxG.fill(); fxG.restore(); }
        if (t < .18) { fxG.fillStyle = `rgba(255,255,255,${(1 - t / .18) * .55})`; fxG.fillRect(0, 0, Wd, Hh); }
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  // ---------- interactions ----------
  function hit(e) {
    const r = E.canvas.getBoundingClientRect(); E.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    E.ray.setFromCamera(E.ndc, E.camera);
    const objs = !cur ? [] : cur.phase === "idle" || cur.phase === "tearing" ? (cur.kind === "chest" ? [E.key.g, E.ch.chest] : [E.pk.pack]) : cur.cards.flatMap((c) => [c.edge, c.face, c.back]);
    return objs.length ? E.ray.intersectObjects(objs, true)[0] || null : null;
  }
  function onDown(e) {
    if (cur?.kind === "pack" && (cur.phase === "idle" || cur.phase === "tearing") && hit(e)) { drag = { x0: e.clientX, p0: E.pk.p, moved: false, id: e.pointerId, w: packScreenWidth() }; E.canvas.setPointerCapture(e.pointerId); }
  }
  function onMove(e) {
    E.pointer.nx = (e.clientX / innerWidth) * 2 - 1; E.pointer.ny = (e.clientY / innerHeight) * 2 - 1;
    if (drag && e.pointerId === drag.id) {
      const dx = e.clientX - drag.x0;
      if (!drag.moved && Math.abs(dx) > 8) { drag.moved = true; if (E.pk.p === 0) E.pk.dir = dx > 0 ? 1 : -1; hint(""); }
      if (drag.moved) tearTo(drag.p0 + Math.max(0, dx * E.pk.dir) / drag.w);
      return;
    }
    if (!cur) return;
    const h = cur.phase === "cards" || cur.phase === "done" ? hit(e) : null;
    cur.cards.forEach((c) => { c.hover = 0; });
    if (h?.object.userData.card) { const c = h.object.userData.card, uv = h.uv; c.hover = 1; if (uv) { const u = h.object === c.face ? 1 - uv.x : uv.x; c.tiltY = (u - 0.5) * 0.7; c.tiltX = -(uv.y - 0.5) * 0.55; } }
    E.canvas.style.cursor = (cur.phase === "idle" || cur.phase === "tearing") && hit(e) ? (cur.kind === "pack" ? "grab" : "pointer") : h ? "pointer" : "default";
  }
  function onUp(e) {
    if (drag && e.pointerId === drag.id) { const d = drag; drag = null; if (!d.moved) autoTear(); else if (E.pk.p < 1) hint("Continue de déchirer"); }
  }
  function onClick(e) {
    if (!cur) return;
    if (cur.kind === "chest" && cur.phase === "idle") { if (hit(e)) openChest(); return; }
    if (cur.phase === "cards" || cur.phase === "done") {
      const h = hit(e), c = h?.object.userData.card; if (!c) return;
      // carte déjà retournée, une fois tout retourné : sa fiche
      if (cur.phase === "done" && c.flipped && !c.busy && !cur.o.lab) { const id = c.x.c.id; closeStage(); return nav("carte", id); }
      flipCard(c);
    }
  }

  // ---------- boucle ----------
  function frame(now) {
    if (!E.on) return;
    const THREE = E.THREE, dt = Math.min(0.05, (now - E.last) / 1000) * (window.__speed || 1); E.last = now; E.clockT += dt;
    for (const tw of [...E.tweens]) { const p = Math.min(1, (E.clockT - tw.t0) / tw.dur); tw.fn(tw.ease(p), p); if (p >= 1) { E.tweens.splice(E.tweens.indexOf(tw), 1); tw.res(); } }
    const ph = cur?.phase, K = E.key, ch = E.ch, P = E.pk;
    if (cur?.kind === "chest" && ph === "idle") { K.g.position.y = K.home.y + Math.sin(E.clockT * 1.6) * 0.08; K.inner.rotation.y = Math.sin(E.clockT * 0.8) * 0.6 - 0.3; K.inner.rotation.x = Math.sin(E.clockT * 1.1) * 0.12; ch.gemGlow.material.opacity = 0.45 + Math.sin(E.clockT * 2) * 0.15; ch.seamMat.color.setScalar(0).add(new THREE.Color("#2ee6ff").multiplyScalar(0.8 + Math.sin(E.clockT * 2) * 0.4)); }
    if (cur?.kind === "pack" && (ph === "idle" || ph === "tearing")) {
      P.pack.position.y = PACK_Y + Math.sin(E.clockT * 1.4) * 0.06; P.pack.rotation.y = Math.sin(E.clockT * 0.7) * 0.22 + E.pointer.x * 0.25; P.pack.rotation.x = -E.pointer.y * 0.12 + Math.sin(E.clockT * 0.9) * 0.04;
      E.rim.position.x = Math.sin(E.clockT * 0.8) * 4; E.rim2.position.x = -Math.sin(E.clockT * 0.8) * 4;
    }
    K.glow.material.opacity = 0.25 + Math.sin(E.clockT * 2.4) * 0.1; ch.gem.rotation.y += dt * 0.6; E.ring.rotation.z += dt * 0.05;
    const dp = E.dust.geometry.attributes.position; for (let i = 0; i < dp.count; i++) { let y = dp.getY(i) + dt * 0.08; if (y > 4) y = 0; dp.setY(i, y); } dp.needsUpdate = true;
    stepParticles(dt); stepDebris(dt);
    if (ch.orbCore.visible) { ch.orbCore.position.y = ch.orb.position.y = 1.0 + Math.sin(E.clockT * 1.5) * 0.05; }
    for (const c of cur?.cards || []) {
      const k = 1 - Math.exp(-dt * 10), hv = c.hover && !c.busy ? 1 : 0;
      c.tilt.rotation.x += ((hv ? c.tiltX : 0) - c.tilt.rotation.x) * k; c.tilt.rotation.y += ((hv ? c.tiltY : 0) - c.tilt.rotation.y) * k;
      c.tilt.position.z += ((hv ? 0.18 : 0) - c.tilt.position.z) * k;
      if (!c.flipped && c.rk >= 3 && !c.busy) { c.halo.material.opacity = (c.rk >= 4 ? 0.26 : 0.18) + Math.sin(E.clockT * 3 + c.i) * 0.06; c.edgeMat.emissiveIntensity = 0.5 + Math.sin(E.clockT * 3 + c.i) * 0.25; }
      if (!c.busy && !c.flipped) c.root.position.y = c.home.y + Math.sin(E.clockT * 1.4 + c.i) * 0.025;
    }
    E.pointer.x += (E.pointer.nx - E.pointer.x) * 0.05; E.pointer.y += (E.pointer.ny - E.pointer.y) * 0.05;
    E.shake *= Math.exp(-dt * 5);
    E.camera.position.copy(E.cam.pos).add(new THREE.Vector3(E.pointer.x * 0.3 + (Math.random() - .5) * E.shake, -E.pointer.y * 0.18 + (Math.random() - .5) * E.shake, 0)); E.camera.lookAt(E.cam.look);
    E.composer.render(dt);
    requestAnimationFrame(frame);
  }

  // ---------- entrée publique ----------
  // appelée par drawOpening pendant la phase « pack » : true si la 3D s'en occupe
  function draw(el, o, top) {
    if (o.phase !== "pack" || !usable()) return false;
    if (!T) {
      load();
      if (!failed) { el.innerHTML = `${top}<section class="stage"><p class="hint">Préparation de l'ouverture…</p></section>`; el.dataset.o3 = ""; el.dataset.cf = ""; return true; }
      return false;
    }
    engine();
    o.o3id ||= Math.random().toString(36).slice(2);
    if (el.dataset.o3 === o.o3id && $("o3")) { el.querySelector(".stage-top")?.replaceWith(Object.assign(document.createElement("div"), { innerHTML: top }).firstElementChild); return true; }
    if (cur?.o !== o) start(o);
    mount(el, o, top);
    return true;
  }
  function stop(keep) {
    if (cur) { clearCards(); cur = null; }
    if (E) { E.tweens = []; debris.forEach((d) => E.scene.remove(d.m)); debris = []; if (!keep) E.on = false; $("o3Fx")?.classList.remove("on"); }
    drag = null; const st = $("stage"); if (st) st.dataset.o3 = "";
  }
  return { draw, stop, get state() { return cur && { kind: cur.kind, phase: cur.phase, cards: cur.cards.length, flipped: cur.cards.filter((c) => c.flipped).length }; }, tear: (p) => tearTo(p), open: () => (cur?.kind === "chest" ? openChest() : autoTear()), flipAll, finish };
})();
