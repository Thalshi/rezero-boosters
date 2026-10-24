// ===== Arène en 3D : les deux combattants face à face, avec un corps, dans un vrai décor =====
// Figurines générées par le code (pas de modèle à télécharger) : corps aux couleurs du perso, visage = portrait de sa
// carte, tenue et arme selon le profil (Assassin : capuche et dagues ; Mage : robe et bâton ; Gardien : armure,
// bouclier, épée ; Soutien : cape, auréole, orbe). Animations : respiration, élan, coup, recul, K.O., entrée en jeu,
// et des particules par technique. Sans WebGL (ou animations réduites) : l'écran 2D reste.
const Bt3D = (() => {
  let T = null, R = null, loading = null, failed = false;
  const usable = () => !failed && !matchMedia("(prefers-reduced-motion: reduce)").matches && (() => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; } })();
  const AFF_COL = { feu: "#ff6a3d", vent: "#4fd18b", terre: "#c8964a", eau: "#4d9bff", ombre: "#b072ff", lumiere: "#ffe27a" };
  const TECH_COL = { burst: "#ff4d7a", poison: "#b072ff", shield: "#e8c77e", heal: "#4fd18b" };
  function canvasTex(w, h, paint) { const c = document.createElement("canvas"); c.width = w; c.height = h; paint(c.getContext("2d"), w, h); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t; }
  // visage : le portrait de la carte, recadré en rond
  function faceTex(id) {
    const c = byId[id], k = c && imgKey(c), url = k ? ART[k] || PHOTO[k] : null, col = PEOPLE[c?.who]?.color || "#888";
    const cv = document.createElement("canvas"); cv.width = cv.height = 256; const g = cv.getContext("2d");
    const base = () => { g.fillStyle = col; g.beginPath(); g.arc(128, 128, 128, 0, Math.PI * 2); g.fill(); g.fillStyle = "#fff"; g.font = "bold 110px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText((PEOPLE[c?.who]?.name || "?")[0], 128, 136); };
    base();
    const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace;
    if (url) { const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => {
      const [px, py] = String(c.pos || "50% 22%").split(" ").map((v) => parseFloat(v) / 100), s = Math.min(im.width, im.height) * 0.62;
      const sx = Math.max(0, Math.min(im.width - s, im.width * px - s / 2)), sy = Math.max(0, Math.min(im.height - s, im.height * py - s / 3));
      g.save(); g.beginPath(); g.arc(128, 128, 128, 0, Math.PI * 2); g.clip(); g.drawImage(im, sx, sy, s, s, 0, 0, 256, 256); g.restore(); t.needsUpdate = true; }; im.src = url; }
    return t;
  }
  // matière « anime » : ombrage en aplats (3 tons) ; les pièces métalliques gardent un peu de brillance
  let TOON = null;
  const toonMap = () => { if (!TOON) { TOON = new T.DataTexture(new Uint8Array([70, 70, 70, 255, 160, 160, 160, 255, 255, 255, 255, 255]), 3, 1, T.RGBAFormat); TOON.minFilter = TOON.magFilter = T.NearestFilter; TOON.needsUpdate = true; } return TOON; };
  const mat = (color, o = {}) => new T.MeshToonMaterial({ color, gradientMap: toonMap(), ...o });
  const metal = (color, o = {}) => new T.MeshStandardMaterial({ color, metalness: 0.85, roughness: 0.28, ...o });
  // contour noir façon dessin animé (coque inversée un peu plus grande)
  function outline(group, k = 0.045) {
    const ol = new T.MeshBasicMaterial({ color: "#120a18", side: T.BackSide });
    const list = []; group.traverse((o) => { if (o.isMesh && !o.userData.noOl && o.material.side !== T.DoubleSide && !o.material.isMeshBasicMaterial) list.push(o); });
    for (const o of list) { const m = new T.Mesh(o.geometry, ol); m.userData.noOl = true; o.geometry.computeBoundingSphere(); const r = o.geometry.boundingSphere.radius || 0.2; m.scale.setScalar(1 + Math.min(0.12, k / r * 0.5)); o.add(m); }
  }
  // une figurine : groupe avec les parties à animer
  function figure(f) {
    const who = PEOPLE[f.who] || {}, col = new T.Color(who.color || "#7a5cff"), dark = col.clone().multiplyScalar(0.3), pale = col.clone().lerp(new T.Color("#ffffff"), 0.45), deep = col.clone().lerp(new T.Color("#1a1028"), 0.45);
    const h = hashOf(f.who), skin = ["#f6d3b3", "#e3b08a", "#b7805a", "#7f4f33"][h % 4], hair = ["#1d1620", "#4a2a18", "#e8e2f0", "#8a1f2a", "#26365e", "#f0c060"][(h >>> 3) % 6];
    const root = new T.Group(), body = new T.Group(); root.add(body);
    const add = (geo, m, x, y, z, parent = body) => { const o = new T.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };
    const lathe = (pts, seg = 20) => new T.LatheGeometry(pts.map(([r, y]) => new T.Vector2(r, y)), seg);
    // jambes (cuisse + mollet), bottes
    const legs = [-0.12, 0.12].map((x) => { const g = new T.Group(); g.position.set(x, 0.82, 0); body.add(g);
      add(lathe([[0.001, -0.42], [0.075, -0.42], [0.09, -0.2], [0.11, 0], [0.001, 0.02]], 14), mat(dark), 0, 0, 0, g);
      add(lathe([[0.001, -0.8], [0.085, -0.8], [0.09, -0.62], [0.075, -0.42], [0.001, -0.4]], 14), mat("#1c1424"), 0, 0, 0, g);
      add(new T.CapsuleGeometry(0.075, 0.12, 4, 10), mat("#1c1424"), 0, -0.78, 0.07, g).rotation.x = Math.PI / 2; return g; });
    // buste : taille fine, poitrine, épaules (profil tourné)
    const torso = add(lathe([[0.001, 0], [0.2, 0], [0.17, 0.12], [0.2, 0.3], [0.26, 0.45], [0.27, 0.56], [0.2, 0.64], [0.07, 0.68], [0.001, 0.69]], 24), mat(col), 0, 0.76, 0); torso.scale.z = 0.68;
    // veste ouverte + col
    const jacket = add(lathe([[0.001, 0.02], [0.22, 0.02], [0.215, 0.14], [0.23, 0.3], [0.28, 0.46], [0.285, 0.56], [0.001, 0.57]], 24), mat(deep), 0, 0.76, -0.012); jacket.scale.z = 0.7;
    add(new T.BoxGeometry(0.12, 0.5, 0.02), mat(pale), 0, 1.08, 0.18).userData.noOl = true;
    const belt = add(new T.TorusGeometry(0.2, 0.028, 8, 24), metal("#c9a24a"), 0, 0.8, 0); belt.rotation.x = Math.PI / 2; belt.scale.set(1, 0.7, 1);
    add(new T.CylinderGeometry(0.06, 0.07, 0.12, 12), mat(skin), 0, 1.47, 0);
    // bras : épaule (pivot), bras, coude, avant-bras, main
    const arm = (side) => { const p = new T.Group(); p.position.set(0.31 * side, 1.34, 0); body.add(p);
      add(new T.SphereGeometry(0.085, 14, 10), mat(deep), 0, 0, 0, p);
      add(new T.CapsuleGeometry(0.065, 0.24, 4, 10), mat(deep), 0, -0.17, 0, p);
      const el = new T.Group(); el.position.set(0, -0.33, 0); el.rotation.x = -0.25; p.add(el);
      add(new T.CapsuleGeometry(0.055, 0.22, 4, 10), mat(col), 0, -0.13, 0, el);
      add(new T.SphereGeometry(0.06, 12, 10), mat(skin), 0, -0.3, 0, el);
      const hand = new T.Group(); hand.position.set(0, -0.31, 0); el.add(hand); return { p, hand }; };
    const armR = arm(1), armL = arm(-1);
    // tête : crâne, visage = portrait de la carte cerclé de la couleur de sa rareté, mèches en pointes
    const head = new T.Group(); head.position.set(0, 1.74, 0); head.scale.setScalar(1.3); body.add(head);
    add(new T.SphereGeometry(0.2, 24, 18), mat(skin), 0, 0, 0, head).scale.z = 0.86;
    const RCOL = { c: "#a8a3b5", pc: "#3fbf7f", r: "#4d9bff", e: "#b072ff", l: "#f5c518", m: "#ff4d2e" }[f.rar] || "#fff";
    const face = new T.Mesh(new T.CircleGeometry(0.185, 40), new T.MeshBasicMaterial({ map: faceTex(f.id) })); face.position.set(0, -0.01, 0.2); head.add(face);
    const fr = new T.Mesh(new T.TorusGeometry(0.19, 0.016, 8, 40), new T.MeshBasicMaterial({ color: RCOL })); fr.position.set(0, -0.01, 0.2); head.add(fr);
    const hairM = mat(hair);
    add(new T.SphereGeometry(0.218, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), hairM, 0, 0.02, -0.035, head).rotation.x = -0.5;
    for (let i = 0; i < 9; i++) { const a = -1.9 + i * 0.475, sp = add(new T.ConeGeometry(0.06, 0.2, 8), hairM, Math.sin(a) * 0.17, 0.12 + Math.cos(a * 0.9) * 0.05, -Math.cos(a) * 0.1 - 0.05, head); sp.rotation.set(-0.9 - Math.cos(a) * 0.4, 0, -a * 0.7); }
    const extras = [];
    // tenue et arme selon le profil
    if (f.profil === "assassin") {
      const hood = add(new T.SphereGeometry(0.255, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.6), mat(dark), 0, 0.03, -0.06, head); hood.rotation.x = -0.55;
      add(new T.TorusGeometry(0.15, 0.05, 8, 18), mat(pale), 0, -0.21, 0, head).rotation.x = Math.PI / 2;
      for (const a of [armR, armL]) { const d = add(new T.ConeGeometry(0.035, 0.42, 4), metal("#e4e9f4", { emissive: "#ff4d7a", emissiveIntensity: 0.3 }), 0, -0.05, 0.2, a.hand); d.rotation.x = Math.PI / 2; add(new T.CylinderGeometry(0.02, 0.02, 0.12, 6), mat("#2a1a14"), 0, -0.05, -0.04, a.hand).rotation.x = Math.PI / 2; }
    } else if (f.profil === "mage") {
      const robe = add(lathe([[0.2, 0], [0.24, -0.25], [0.4, -0.78], [0.001, -0.78]], 22), mat(deep), 0, 0.84, 0); robe.scale.z = 0.8;
      add(new T.TorusGeometry(0.4, 0.025, 6, 30), metal("#c9a24a"), 0, 0.07, 0).rotation.x = Math.PI / 2;
      add(new T.ConeGeometry(0.26, 0.5, 18), mat(dark), 0, 0.34, -0.03, head).rotation.x = -0.28;
      add(new T.CylinderGeometry(0.32, 0.32, 0.03, 24), mat(dark), 0, 0.12, -0.01, head).rotation.x = -0.18;
      add(new T.CylinderGeometry(0.022, 0.028, 1.5, 8), mat("#5a3a1a"), 0, 0.15, 0.04, armR.hand);
      extras.push(add(new T.IcosahedronGeometry(0.1, 1), new T.MeshBasicMaterial({ color: "#d4b0ff" }), 0, 0.95, 0.04, armR.hand));
      const orbL = new T.PointLight("#c9a0ff", 1.2, 2, 2); orbL.position.set(0, 0.95, 0.04); armR.hand.add(orbL);
    } else if (f.profil === "gardien") {
      for (const s of [1, -1]) { const pad = add(new T.SphereGeometry(0.15, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), metal("#c9a24a"), 0.31 * s, 1.37, 0); pad.scale.set(1.15, 0.75, 1.05); }
      add(new T.CylinderGeometry(0.23, 0.26, 0.38, 24, 1, true), metal("#b8c0cc", { side: T.DoubleSide }), 0, 1.0, 0).scale.z = 0.72;
      add(new T.SphereGeometry(0.225, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.45), metal("#a8b0bc"), 0, 0.03, -0.02, head);
      add(new T.BoxGeometry(0.04, 0.16, 0.05), metal("#e8c77e"), 0, 0.2, 0.06, head);
      const sh = add(new T.CylinderGeometry(0.25, 0.25, 0.05, 6), mat(col, { emissive: col, emissiveIntensity: 0.15 }), -0.05, -0.02, 0.1, armL.hand); sh.rotation.set(Math.PI / 2, 0, 0); sh.scale.set(1, 1, 1.25);
      add(new T.TorusGeometry(0.25, 0.025, 6, 6), metal("#e8c77e"), -0.05, -0.02, 0.13, armL.hand).scale.set(1, 1.25, 1);
      const sw = add(new T.BoxGeometry(0.045, 0.75, 0.09), metal("#eef3fb", { emissive: "#8fb4ff", emissiveIntensity: 0.15 }), 0, -0.02, 0.42, armR.hand); sw.rotation.x = Math.PI / 2;
      add(new T.BoxGeometry(0.22, 0.04, 0.05), metal("#c9a24a"), 0, -0.02, 0.04, armR.hand);
    } else {
      const cape = add(new T.PlaneGeometry(0.6, 1.1, 1, 8), mat(pale, { side: T.DoubleSide }), 0, 0.9, -0.21); cape.rotation.x = 0.14;
      extras.push(add(new T.TorusGeometry(0.17, 0.016, 8, 30), new T.MeshBasicMaterial({ color: "#fff3b0" }), 0, 0.34, -0.02, head)); extras[0].rotation.x = Math.PI / 2;
      extras.push(add(new T.SphereGeometry(0.085, 16, 12), new T.MeshBasicMaterial({ color: "#7dffb4" }), 0, -0.02, 0.14, armR.hand));
    }
    outline(body);
    // socle et anneau d'affinité
    const ring = new T.Mesh(new T.RingGeometry(0.5, 0.6, 48), new T.MeshBasicMaterial({ color: AFF_COL[f.aff] || "#fff", transparent: true, opacity: 0.85, side: T.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; root.add(ring);
    const glow = new T.PointLight(AFF_COL[f.aff] || "#fff", 1.6, 3, 2); glow.position.set(0, 0.6, 0.4); root.add(glow);
    return { root, body, armR, armL, head, legs, extras, ring, id: f.id, t0: Math.random() * 10, act: null };
  }
  function build(host) {
    const canvas = document.createElement("canvas"); canvas.className = "bt-canvas"; host.prepend(canvas);
    const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75)); renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15; renderer.shadowMap.enabled = true;
    const scene = new T.Scene(); scene.fog = new T.Fog("#140a20", 9, 26);
    const camera = new T.PerspectiveCamera(38, 1, 0.1, 80);
    scene.add(new T.HemisphereLight("#b39cf0", "#1a0e24", 0.9));
    const key = new T.DirectionalLight("#fff0e0", 1.6); key.position.set(2, 6, 5); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); scene.add(key);
    const pink = new T.PointLight("#ff2e88", 8, 10, 1.8); pink.position.set(3.5, 2.4, 1); scene.add(pink);
    const cyan = new T.PointLight("#2ee6ff", 7, 10, 1.8); cyan.position.set(-3.5, 2.2, 1); scene.add(cyan);
    // décor : le panorama de la Confrontation sur un cylindre
    const bgUrl = (typeof ILLUS_DECOR === "object" && (ILLUS_DECOR.confront || ILLUS_DECOR.boosters)) || null;
    if (bgUrl) new T.TextureLoader().load(bgUrl, (t) => { t.colorSpace = T.SRGBColorSpace; const Rr = 16, th = 2.2, Hd = Rr * th / (t.image.width / t.image.height);
      const m = new T.Mesh(new T.CylinderGeometry(Rr, Rr, Hd, 64, 1, true, Math.PI - th / 2, th), new T.MeshBasicMaterial({ map: t, side: T.BackSide, fog: false, color: "#c8c0d8" })); m.position.set(0, Hd / 2 - 3, -2); scene.add(m); });
    // sol de pierre, cercle de runes d'or
    const floorTex = canvasTex(1024, 1024, (g, w) => {
      const gr = g.createRadialGradient(w / 2, w / 2, 40, w / 2, w / 2, w / 2); gr.addColorStop(0, "#4a3c5c"); gr.addColorStop(1, "#1c1426"); g.fillStyle = gr; g.fillRect(0, 0, w, w);
      g.strokeStyle = "#ffffff12"; g.lineWidth = 3; for (let r = 80; r < w / 2; r += 70) { g.beginPath(); g.arc(w / 2, w / 2, r, 0, Math.PI * 2); g.stroke(); }
      for (let a = 0; a < 48; a++) { g.save(); g.translate(w / 2, w / 2); g.rotate(a * Math.PI / 24); g.beginPath(); g.moveTo(80, 0); g.lineTo(w / 2, 0); g.stroke(); g.restore(); }
    });
    const stoneTex = canvasTex(512, 128, (g, w, hh) => { g.fillStyle = "#2a2234"; g.fillRect(0, 0, w, hh); g.strokeStyle = "#0e0a14"; g.lineWidth = 3;
      for (let y = 0; y < hh; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); for (let x = (y / 32) % 2 ? 0 : 32; x < w; x += 64) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 32); g.stroke(); } } });
    stoneTex.wrapS = T.RepeatWrapping; stoneTex.repeat.set(8, 1);
    const ground = new T.Mesh(new T.CircleGeometry(30, 64), new T.MeshStandardMaterial({ color: "#120c1a", roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.32; ground.receiveShadow = true; scene.add(ground);
    const step = new T.Mesh(new T.CylinderGeometry(4.7, 4.85, 0.16, 72), [new T.MeshStandardMaterial({ map: stoneTex, roughness: 0.9 }), new T.MeshStandardMaterial({ color: "#2e2540", roughness: 0.9 }), new T.MeshStandardMaterial({ color: "#000" })]); step.position.y = -0.24; step.receiveShadow = true; scene.add(step);
    const floor = new T.Mesh(new T.CylinderGeometry(4.1, 4.2, 0.18, 72), [new T.MeshStandardMaterial({ map: stoneTex, roughness: 0.9 }), new T.MeshStandardMaterial({ map: floorTex, roughness: 0.85 }), new T.MeshStandardMaterial({ color: "#000" })]); floor.position.y = -0.09; floor.receiveShadow = true; scene.add(floor);
    const rim = new T.Mesh(new T.TorusGeometry(4.1, 0.035, 8, 120), new T.MeshStandardMaterial({ color: "#e8c77e", metalness: 0.9, roughness: 0.25, emissive: "#7a5a20", emissiveIntensity: 0.4 })); rim.rotation.x = Math.PI / 2; rim.position.y = 0.005; scene.add(rim);
    const runes = new T.Mesh(new T.RingGeometry(3.05, 3.2, 96), new T.MeshBasicMaterial({ color: "#e8c77e", transparent: true, opacity: 0.8 })); runes.rotation.x = -Math.PI / 2; runes.position.y = 0.01; scene.add(runes);
    const runes2 = new T.Mesh(new T.RingGeometry(2.55, 2.6, 96), new T.MeshBasicMaterial({ color: "#e8c77e", transparent: true, opacity: 0.45 })); runes2.rotation.x = -Math.PI / 2; runes2.position.y = 0.012; scene.add(runes2);
    // piliers de pierre en demi-cercle, bande de runes et brasero au sommet
    const flames = [];
    [-2.5, -1.95, -1.4, -0.85, 0.85, 1.4, 1.95, 2.5].forEach((a, i) => {
      const x = Math.sin(a) * 5.6, z = -Math.cos(a) * 5.6 + 0.6; if (z > 1.8) return;
      const p = new T.Group(); p.position.set(x, -0.32, z); scene.add(p);
      const shaft = new T.Mesh(new T.CylinderGeometry(0.26, 0.3, 3.4, 12), new T.MeshStandardMaterial({ color: "#3a3048", roughness: 0.85 })); shaft.position.y = 1.7; shaft.castShadow = true; p.add(shaft);
      for (const y of [0.12, 3.45]) { const cap = new T.Mesh(new T.BoxGeometry(0.75, 0.22, 0.75), new T.MeshStandardMaterial({ color: "#2a2234", roughness: 0.9 })); cap.position.y = y; p.add(cap); }
      const band = new T.Mesh(new T.CylinderGeometry(0.31, 0.31, 0.12, 12, 1, true), new T.MeshBasicMaterial({ color: i % 2 ? "#ff6ab0" : "#7ad8ff" })); band.position.y = 2.2; p.add(band);
      const bowl = new T.Mesh(new T.CylinderGeometry(0.3, 0.16, 0.2, 12), metal("#8a6a30")); bowl.position.y = 3.66; p.add(bowl);
      const fl = new T.Mesh(new T.ConeGeometry(0.2, 0.55, 10), new T.MeshBasicMaterial({ color: "#ffb060", transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false })); fl.position.y = 3.98; p.add(fl); flames.push(fl);
      if (i === 3 || i === 4) { const l = new T.PointLight("#ffa050", 4, 7, 1.8); l.position.y = 4; p.add(l); }
    });
    // pétales
    const N = 140, pos = new Float32Array(N * 3); for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 12; pos[i * 3 + 1] = Math.random() * 5; pos[i * 3 + 2] = (Math.random() - 0.5) * 8; }
    const pg = new T.BufferGeometry(); pg.setAttribute("position", new T.BufferAttribute(pos, 3));
    const petals = new T.Points(pg, new T.PointsMaterial({ color: "#ffb3d6", size: 0.06, transparent: true, opacity: 0.85 })); scene.add(petals);
    R = { renderer, scene, camera, canvas, host, runes, petals, flames, figs: [null, null], fx: [], clock: 0, last: performance.now(), shake: 0, raf: 0, on: true, keyIds: [null, null] };
    const resize = () => { const w = host.clientWidth || innerWidth, h = host.clientHeight || innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.position.set(0, 2.1, w < h ? 8.4 : 6.6); camera.lookAt(0, 1.05, 0); camera.updateProjectionMatrix(); };
    R.resize = resize; resize(); addEventListener("resize", resize);
    R.raf = requestAnimationFrame(frame);
  }
  // particules d'un effet
  function burst(x, y, z, color, n = 40, speed = 2.4, life = 0.9, rise = 0) {
    const p = new Float32Array(n * 3), v = []; for (let i = 0; i < n; i++) { p[i * 3] = x; p[i * 3 + 1] = y; p[i * 3 + 2] = z; v.push([(Math.random() - 0.5) * speed, Math.random() * speed * 0.6 + rise, (Math.random() - 0.5) * speed]); }
    const g = new T.BufferGeometry(); g.setAttribute("position", new T.BufferAttribute(p, 3));
    const m = new T.Points(g, new T.PointsMaterial({ color, size: 0.09, transparent: true, opacity: 1, blending: T.AdditiveBlending, depthWrite: false }));
    R.scene.add(m); R.fx.push({ m, v, life, t: 0, kind: "pts" });
  }
  function dome(fig, color) {
    const m = new T.Mesh(new T.SphereGeometry(0.85, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
    m.position.copy(fig.root.position); R.scene.add(m); R.fx.push({ m, life: 1.2, t: 0, kind: "dome" });
  }
  function slash(from, to, color, big) {
    const m = new T.Mesh(new T.TorusGeometry(big ? 0.9 : 0.6, big ? 0.06 : 0.035, 8, 40, Math.PI * 0.9), new T.MeshBasicMaterial({ color, transparent: true, opacity: 1, blending: T.AdditiveBlending, depthWrite: false }));
    m.position.set(to.x - Math.sign(to.x - from.x) * 0.2, 1.2, 0.3); m.rotation.set(0, 0, from.x < to.x ? -0.6 : 2.5); R.scene.add(m); R.fx.push({ m, life: 0.45, t: 0, kind: "slash" });
  }
  function frame(now) {
    if (!R?.on) return;
    const dt = Math.min(0.05, (now - R.last) / 1000); R.last = now; R.clock += dt;
    R.runes.rotation.z += dt * 0.15;
    R.flames.forEach((f, i) => { const k = 1 + Math.sin(R.clock * 9 + i * 2) * 0.12 + Math.sin(R.clock * 23 + i) * 0.06; f.scale.set(1 / k, k, 1 / k); });
    const pa = R.petals.geometry.attributes.position; for (let i = 0; i < pa.count; i++) { let y = pa.getY(i) - dt * 0.35; if (y < 0) y = 5; pa.setY(i, y); pa.setX(i, pa.getX(i) + Math.sin(R.clock + i) * dt * 0.2); } pa.needsUpdate = true;
    for (const [i, F] of R.figs.entries()) {
      if (!F) continue;
      const t = R.clock + F.t0, dir = i === 0 ? 1 : -1, a = F.act;
      F.body.position.y = Math.sin(t * 2.2) * 0.025; F.armR.p.rotation.x = Math.sin(t * 2.2) * 0.08 - 0.15; F.armL.p.rotation.x = -Math.sin(t * 2.2) * 0.08 - 0.1; F.head.rotation.y = -F.root.rotation.y * 0.85 + Math.sin(t * 0.7) * 0.1;
      F.extras.forEach((e, k) => { e.rotation.y += dt * 2; e.position.y += Math.sin(t * 3 + k) * 0.0008; });
      F.root.position.x = F.baseX; F.root.position.y = 0; F.body.rotation.z = 0;
      if (a) {
        a.t += dt; const k = Math.min(1, a.t / a.dur);
        if (a.type === "lunge") { const s = Math.sin(k * Math.PI); F.root.position.x = F.baseX + dir * s * 1.3; F.armR.p.rotation.x = -2.4 * s; F.body.rotation.z = -dir * 0.15 * s; }
        if (a.type === "hit") { F.root.position.x = F.baseX - dir * Math.sin(k * Math.PI) * 0.35; F.body.rotation.z = dir * 0.25 * Math.sin(k * Math.PI); }
        if (a.type === "cast") { F.armR.p.rotation.x = -2.8 * Math.sin(k * Math.PI); F.armL.p.rotation.x = -2.8 * Math.sin(k * Math.PI); F.root.position.y = Math.sin(k * Math.PI) * 0.2; }
        if (a.type === "guard") { F.armL.p.rotation.x = -1.5; F.armL.p.rotation.z = dir * 0.6; }
        if (a.type === "enter") { F.root.position.y = (1 - k) * 4; }
        if (a.type === "ko") { F.body.rotation.z = -dir * Math.min(1, k * 1.4) * 1.45; F.body.position.y = -Math.min(1, k) * 0.15; }
        if (k >= 1 && a.type !== "ko" && a.type !== "guard") F.act = null;
      }
    }
    for (let i = R.fx.length - 1; i >= 0; i--) {
      const f = R.fx[i]; f.t += dt; const k = f.t / f.life;
      if (f.kind === "pts") { const p = f.m.geometry.attributes.position; for (let j = 0; j < p.count; j++) { p.setX(j, p.getX(j) + f.v[j][0] * dt); p.setY(j, p.getY(j) + f.v[j][1] * dt); p.setZ(j, p.getZ(j) + f.v[j][2] * dt); f.v[j][1] -= dt * 1.2; } p.needsUpdate = true; }
      if (f.kind === "slash") { f.m.scale.setScalar(0.6 + k * 0.8); f.m.rotation.z += dt * 6; }
      if (f.kind === "dome") f.m.scale.setScalar(0.6 + Math.min(1, k * 2) * 0.5);
      f.m.material.opacity = Math.max(0, 1 - k);
      if (k >= 1) { R.scene.remove(f.m); f.m.geometry.dispose(); f.m.material.dispose(); R.fx.splice(i, 1); }
    }
    R.shake *= Math.exp(-dt * 7);
    const w = R.host.clientWidth, h = R.host.clientHeight;
    R.camera.position.x = Math.sin(R.clock * 0.25) * 0.35 + (Math.random() - 0.5) * R.shake; R.camera.position.y = 2.1 + (Math.random() - 0.5) * R.shake; R.camera.lookAt(0, 1.05, 0);
    if (w && h) R.renderer.render(R.scene, R.camera);
    R.raf = requestAnimationFrame(frame);
  }
  // met en place / remplace les combattants actifs
  function setFighters(bt, me) {
    for (const [slot, side] of [[0, me], [1, 1 - me]]) {
      const S = bt.sides[side], f = S.team[S.active];
      if (R.keyIds[slot] === f.id && R.figs[slot]) { if (f.ko && R.figs[slot].act?.type !== "ko") R.figs[slot].act = { type: "ko", t: 0, dur: 0.8 }; continue; }
      if (R.figs[slot]) { R.scene.remove(R.figs[slot].root); }
      const F = figure(f); F.baseX = slot === 0 ? -1.55 : 1.55; F.root.position.x = F.baseX; F.root.rotation.y = slot === 0 ? 0.6 : -0.6; F.root.scale.setScalar(1.12);
      R.scene.add(F.root); R.figs[slot] = F; R.keyIds[slot] = f.id;
      if (f.ko) F.act = { type: "ko", t: 1, dur: 0.8 };
    }
  }
  // écran : position d'un combattant (pour les chiffres de dégâts en HTML)
  function screenOf(slot) { const F = R?.figs[slot]; if (!F) return null; const v = new T.Vector3(F.root.position.x, 2.05, 0).project(R.camera); return [(v.x + 1) / 2 * R.host.clientWidth, (1 - v.y) / 2 * R.host.clientHeight]; }
  // joue les événements d'un tour, en même temps que les chiffres HTML
  function play(ev, me, bt) {
    if (!R) return;
    let t = 0;
    const slotOf = (side) => (side === me ? 0 : 1);
    for (const e of ev) {
      const s = slotOf(e.side), o = 1 - s;
      if (e.t === "attaque" || e.t === "tech") {
        setTimeout(() => { const A = R?.figs[s], D = R?.figs[o]; if (!A || !D) return;
          A.act = { type: e.t === "tech" && (e.kind === "heal" || e.kind === "shield" || e.kind === "poison") ? "cast" : "lunge", t: 0, dur: 0.55 };
          const col = e.t === "tech" ? TECH_COL[e.kind] : "#ffffff";
          setTimeout(() => { if (!R) return; slash(A.root.position, D.root.position, col, e.t === "tech"); burst(D.root.position.x, 1.2, 0.2, col, e.t === "tech" ? 70 : 34, e.t === "tech" ? 3.4 : 2.2);
            if (e.n > 0) { D.act = { type: "hit", t: 0, dur: 0.35 }; R.shake = e.t === "tech" ? 0.16 : 0.07; }
            if (e.kind === "poison") burst(D.root.position.x, 0.6, 0, "#b072ff", 60, 1.2, 1.6, 0.8); }, 260);
        }, t);
        t += 650;
      } else if (e.t === "soin") { setTimeout(() => { const A = R?.figs[s]; if (A) burst(A.root.position.x, 0.3, 0, "#4fd18b", 70, 0.9, 1.4, 1.6); }, t); t += 250; }
      else if (e.t === "bouclier") { setTimeout(() => { const A = R?.figs[s]; if (A) dome(A, "#e8c77e"); }, t); t += 250; }
      else if (e.t === "garde") { const A = R?.figs[s]; if (A) { A.act = { type: "guard", t: 0, dur: 1 }; dome(A, "#4d9bff"); } }
      else if (e.t === "poison") { setTimeout(() => { const A = R?.figs[s]; if (A) burst(A.root.position.x, 0.8, 0, "#b072ff", 40, 1, 1.2, 0.6); }, t); t += 200; }
      else if (e.t === "ko") { setTimeout(() => { const A = R?.figs[s]; if (A) { A.act = { type: "ko", t: 0, dur: 0.8 }; R.shake = 0.2; burst(A.root.position.x, 1, 0, "#ffffff", 50, 2, 1); } }, t); t += 500; }
      else if (e.t === "entre") { setTimeout(() => { if (!R) return; setFighters(bt, me); const A = R.figs[s]; if (A) { A.act = { type: "enter", t: 0, dur: 0.5 }; burst(A.root.position.x, 0.1, 0, "#e8c77e", 60, 2.6, 0.8, 0.5); } }, t + 300); t += 600; }
    }
    // le dernier état (persos remplacés, K.O.) une fois les animations passées
    setTimeout(() => { if (R) setFighters(bt, me); }, t + 900);
  }
  async function mount(host, bt, me) {
    if (!usable()) return false;
    if (!T) { loading = loading || import("three").then((m) => { T = m; }).catch(() => { failed = true; }); await loading; if (!T) return false; }
    if (R && R.host !== host) unmount();
    if (!R) build(host);
    setFighters(bt, me); return true;
  }
  function unmount() { if (!R) return; R.on = false; cancelAnimationFrame(R.raf); removeEventListener("resize", R.resize); R.renderer.dispose(); R.canvas.remove(); R = null; }
  return { mount, unmount, play, setFighters, screenOf, get on() { return !!R; } };
})();
