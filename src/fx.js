// ===== Effets de cartes et d'avatars : décorations spectaculaires, ornements et particules =====
// Repère commun avec decoSVG : la carte va de (-36, -52) à (36, 52) (« rect »), l'avatar est un disque de rayon 40
// (« round ») ; la vue déborde de 18 tout autour.
// Chaque effet a deux couches : « back » derrière la carte, « front » devant. Ce qui tourne autour de la carte
// (dragons, pétales) est dessiné dans les deux : la couche de devant ne garde que la moitié basse de l'orbite,
// si bien qu'il passe derrière la carte en haut et devant en bas.
let fxN = 0;
const FX_HW = 36, FX_HH = 52, f1x = (n) => +n.toFixed(1);
// petit générateur pseudo-aléatoire stable (les mêmes éclairs à chaque affichage)
const fxRand = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
// orbite elliptique autour de la carte, parcourue dans le sens horaire (bas = devant)
const fxOrbit = (rx, ry) => `M${rx} 0A${rx} ${ry} 0 1 1 ${-rx} 0A${rx} ${ry} 0 1 1 ${rx} 0`;
const fxGlow = (u, sd = 2.4) => `<filter id="${u}b" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="${sd}"/></filter>`;
// particules : --x départ, --dx dérive, --d durée, délai négatif = déjà en route
const fxP = (cls, x, y, d, dl, inner, dx = 0, s = 1) => `<g transform="translate(${f1x(x)} ${f1x(y)})"><g class="${cls}" style="--d:${f1x(d)}s;--dx:${f1x(dx)}px;animation-delay:${f1x(dl)}s"><g transform="scale(${s})">${inner}</g></g></g>`;
const FX_PETAL = (c1, c2) => `<path d="M0 -4.6C3 -3 3.4 1.6 0 4.2C-3.4 1.6 -3 -3 0 -4.6Z" fill="${c1}" stroke="${c2}" stroke-width=".4"/><path d="M0 -3V3" stroke="${c2}" stroke-width=".35" opacity=".6"/>`;
const FX_FLAKE = (c) => `<g stroke="${c}" stroke-width=".7" stroke-linecap="round" fill="none">${[0, 60, 120].map((a) => `<g transform="rotate(${a})"><path d="M0 -4.4V4.4"/><path d="M-1.3 -3.2L0 -2.1L1.3 -3.2M-1.3 3.2L0 2.1L1.3 3.2"/></g>`).join("")}</g>`;
const FX_SPARK = (c, r = 3) => `<path d="M0 ${-r}Q0 0 ${r * .35} 0Q0 0 0 ${r}Q0 0 ${-r * .35} 0Q0 0 0 ${-r}Z" fill="${c}"/><path d="M${-r} 0Q0 0 0 ${r * .3}Q0 0 ${r} 0Q0 0 0 ${-r * .3}Q0 0 ${-r} 0Z" fill="${c}" opacity=".8"/>`;

// --- un dragon serpent : la tête et ~30 anneaux suivent la même orbite, chacun un peu en retard ---
function fxDragon(u, c1, c2, rx, ry, T, belly = "#fff3c4", N = 52) {
  const path = fxOrbit(rx, ry), dt = .03 * T / 7 * 52 / N, mot = (i) => `<animateMotion dur="${T}s" repeatCount="indefinite" rotate="auto" begin="${f1x(-(N + 4 - i) * dt)}s" path="${path}"/>`;
  let body = "";
  for (let i = N; i >= 1; i--) {
    const r = 6 * (1 - i / N * .75), leg = i === 8 || i === 26;
    body += `<g>${mot(i)}${leg ? `<path d="M0 ${r}L-2 ${r + 5}L-4 ${r + 6}M-2 ${r + 5}L-1 ${r + 7}M0 ${-r}L-2 ${-r - 5}L-4 ${-r - 6}" stroke="${c2}" stroke-width="1.3" fill="none" stroke-linecap="round"/>` : ""}
      ${i % 4 === 0 ? `<path d="M${f1x(r * .6)} ${f1x(-r * .7)}L${f1x(-r * .7)} ${f1x(-r * 1.9)}L${f1x(-r * .5)} ${f1x(-r * .6)}Z" fill="${c2}"/>` : ""}
      <ellipse rx="${f1x(r * 1.25)}" ry="${f1x(r)}" fill="url(#${u}d)"/><ellipse cy="${f1x(r * .55)}" rx="${f1x(r * 1.2)}" ry="${f1x(r * .38)}" fill="${belly}" opacity=".8"/></g>`;
  }
  // bout de queue en flamme
  body = `<g>${mot(N + 1)}<path class="fx-flick" d="M2 0C-4 -6 -10 -5 -15 -9C-11 -3 -12 2 -16 6C-10 4 -4 5 2 0Z" fill="${c1}" opacity=".9"/></g>` + body;
  const head = `<g>${mot(0)}<g transform="translate(3 0) scale(1.25)">
      <path class="fx-whisk" d="M7 2C2 8 -8 9 -16 15" stroke="${c1}" stroke-width=".8" fill="none" stroke-linecap="round"/><path class="fx-whisk b" d="M7 -2C2 -8 -8 -9 -16 -15" stroke="${c1}" stroke-width=".8" fill="none" stroke-linecap="round"/>
      <path d="M-4 -4C-9 -9 -14 -10 -18 -9C-14 -7 -11 -5 -8 -3Z" fill="${belly}" stroke="${c2}" stroke-width=".5"/><path d="M-4 4C-9 9 -14 10 -18 9C-14 7 -11 5 -8 3Z" fill="${belly}" stroke="${c2}" stroke-width=".5"/>
      <path d="M-6 -5C-3 -7 4 -6 9 -3.2L13 -1.4L9 -.2L13 1.6L8 3.4C4 6 -3 7 -6 5Z" fill="url(#${u}d)" stroke="${c2}" stroke-width=".6"/>
      <path d="M8 2.4L4.6 3.2M10 .6L6 1.2" stroke="${belly}" stroke-width=".6"/><path d="M-5 -5.4L-9 -8L-7 -4.2M-5 5.4L-9 8L-7 4.2" fill="${c2}"/>
      <ellipse cx="3.4" cy="-2.6" rx="1.6" ry="1.1" fill="#fff"/><ellipse class="fx-eye" cx="3.8" cy="-2.6" rx=".8" ry="1" fill="${c2 === "#0b0916" ? c1 : "#ff2e2e"}"/>
      <circle cx="11.6" cy="-1.6" r=".5" fill="#0008"/></g></g>`;
  // la perle que le dragon poursuit
  const pearl = `<g>${mot(-9)}<circle r="5" fill="${c1}" opacity=".35" filter="url(#${u}b)"/><circle r="2.6" fill="url(#${u}p)"/></g>`;
  return `${pearl}${body}${head}`;
}
const fxDragonDefs = (u, c1, c2) => `<linearGradient id="${u}d" x1="0" y1="-1" x2="0" y2="1"><stop offset="0" stop-color="${c2}"/><stop offset=".45" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
  <radialGradient id="${u}p" cx=".35" cy=".35"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient>`;
// la couche de devant ne montre que la moitié basse de l'orbite (inclinée comme elle)
const fxFrontMask = (u, tilt) => `<mask id="${u}m" maskUnits="userSpaceOnUse" x="-200" y="-200" width="400" height="400"><rect x="-200" y="2" width="400" height="300" fill="#fff" transform="rotate(${tilt})"/></mask>`;

// --- un katana couché sur l'axe x : poignée de 0 à 36, lame jusqu'à L ---
function fxKatana(u, L, wrap, steel) {
  const b0 = 40, wraps = Array.from({ length: 8 }, (_, i) => `<path d="M${3 + i * 4.2} -2.6L${5.1 + i * 4.2} 0L${3 + i * 4.2} 2.6M${5.1 + i * 4.2} -2.6L${3 + i * 4.2} 0L${5.1 + i * 4.2} 2.6" stroke="#f3e6c8" stroke-width=".7" fill="none"/>`).join("");
  return `<rect x="0" y="-2.7" width="36" height="5.4" rx="2" fill="${wrap}"/>${wraps}<rect x="-1.6" y="-2.4" width="2.4" height="4.8" rx="1" fill="#c9a23a"/>
    <ellipse cx="37.4" cy="0" rx="1.8" ry="6.2" fill="#2a2018" stroke="#c9a23a" stroke-width=".7"/><rect x="38.8" y="-2.4" width="2.6" height="4.6" fill="#d8b04a"/>
    <path d="M${b0} -2.3Q${L * .62} -3 ${L} -10.5Q${L - 1} -6.4 ${L - 5} -5Q${L * .6} 2.4 ${b0} 2.3Z" fill="url(#${u}s)" stroke="${steel}" stroke-width=".3"/>
    <path d="M${b0 + 3} .9Q${L * .4} 1.8 ${L * .55} .6T${L * .8} -2.6T${L - 7} -6" stroke="#ffffffa0" stroke-width=".6" fill="none"/>
    <g clip-path="url(#${u}k)"><rect class="fx-gleam" x="${b0}" y="-14" width="10" height="20" fill="url(#${u}g)"/></g>
    <clipPath id="${u}k"><path d="M${b0} -2.3Q${L * .62} -3 ${L} -10.5Q${L - 1} -6.4 ${L - 5} -5Q${L * .6} 2.4 ${b0} 2.3Z"/></clipPath>`;
}

// --- les effets : back / front en SVG (contenu), defs partagées ---
// shape : « rect » (carte) ou « round » (avatar) ; lite : version allégée pour les listes (moins d'éléments)
function fxBuild(k, c1, c2, shape = "rect", lite = false) {
  const u = "fx" + ++fxN, RD = shape === "round", HW = RD ? 40 : FX_HW, HH = RD ? 40 : FX_HH, R = fxRand(k.length * 977 + c1.length * 31 + (c1.charCodeAt(1) || 7));
  const Q = (n) => Math.max(2, Math.round(n * (lite ? .45 : 1)));
  // le contour (carte ou avatar), un point du contour (t : degrés depuis le haut, sens horaire) et sa normale
  const ringEl = (off, attrs) => RD ? `<circle r="${40 + off}" ${attrs}/>` : `<rect x="${-HW - off}" y="${-HH - off}" width="${2 * (HW + off)}" height="${2 * (HH + off)}" rx="${f1x(8 + off * .5)}" ${attrs}/>`;
  const edge = (t, off = 0) => { const a = (t - 90) * Math.PI / 180, c = Math.cos(a), si = Math.sin(a); if (RD) return [f1x(c * (40 + off)), f1x(si * (40 + off))]; const w = HW + off, h = HH + off, kk = Math.min(Math.abs(c) > 1e-6 ? w / Math.abs(c) : 1e9, Math.abs(si) > 1e-6 ? h / Math.abs(si) : 1e9); return [f1x(c * kk), f1x(si * kk)]; };
  const normal = (t) => { const [x0, y0] = edge(t, 0), [x1, y1] = edge(t, 8), l = Math.hypot(x1 - x0, y1 - y0) || 1; return [(x1 - x0) / l, (y1 - y0) / l]; };
  const ORB = RD ? [56, 46] : [HW + 17, HH + 10], SC = RD ? .72 : 1;
  let defs = fxGlow(u), back = "", front = "";
  switch (k) {
    // ===== Dragons qui volent autour de la carte =====
    case "dragon": case "dragon2": {
      const tilt = RD ? -18 : -14, [rx, ry] = ORB, T = k === "dragon2" ? 6.2 : 7;
      defs += fxDragonDefs(u, c1, c2) + fxFrontMask(u, tilt);
      const orbit = `<g transform="rotate(${tilt})">${fxDragon(u, c1, c2, rx, ry, T, "#fff3c4", lite ? 16 : 52)}</g>`;
      const clouds = [[-HW - 6, HH - 4, 1], [HW + 4, -HH + 8, -1]].map(([x, y, sx], i) => `<g transform="translate(${x} ${y}) scale(${sx} 1)"><g class="fx-bob" style="animation-delay:${-i * 1.3}s"><path d="M-12 2C-14 -3 -8 -6 -5 -3C-4 -8 4 -8 5 -3C8 -6 14 -3 12 2Z" fill="${c1}" opacity=".22"/><path d="M-9 1C-8 -2 -5 -3 -3 -1M2 -2C4 -4 7 -3 8 0" stroke="${c1}" stroke-width=".8" fill="none" opacity=".8"/></g></g>`).join("");
      back = `${ringEl(6, `fill="${c1}" opacity=".18" filter="url(#${u}b)" class="fx-pulse"`)}${orbit}`;
      front = `<g mask="url(#${u}m)">${orbit}</g>${clouds}`;
      break;
    }
    // ===== Katanas croisés derrière la carte, reflets sur les lames et coups de lame =====
    case "katanas": {
      defs += `<linearGradient id="${u}s" x1="0" y1="-1" x2="0" y2="1"><stop offset="0" stop-color="#f4f7fb"/><stop offset=".5" stop-color="#aab3c2"/><stop offset="1" stop-color="#5a6272"/></linearGradient>
        <linearGradient id="${u}g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`;
      back = `<g transform="scale(${SC})">` + [1, -1].map((sx) => `<g transform="scale(${sx} 1) translate(-62 84) rotate(-57)">${fxKatana(u + (sx > 0 ? "a" : "c"), 172, c2, "#fff")}</g>`).join("").concat("</g>")
        .replace(/url\(#(fx\d+)[ac]s\)/g, "url(#$1s)").replace(/url\(#(fx\d+)[ac]g\)/g, "url(#$1g)");
      const slash = (d, i) => `<g class="fx-slash" style="animation-delay:${-i * 1.4}s"><path d="${d}" stroke="${c1}" stroke-width="6" fill="none" opacity=".5" filter="url(#${u}b)" pathLength="100"/><path d="${d}" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round" pathLength="100"/></g>`;
      front = slash(`M${-HW - 14} ${-HH + 10}Q0 -6 ${HW + 14} ${HH - 22}`, 0) + slash(`M${HW + 14} ${-HH + 26}Q4 4 ${-HW - 14} ${HH - 8}`, 1)
        + Array.from({ length: Q(7) }, (_, i) => fxP("fx-fall", -HW + R() * 2 * HW, -HH - 14, 4.5 + R() * 3, -R() * 7, FX_PETAL("#ffb3cf", "#ff6fa3"), (R() - .5) * 30, .9)).join("");
      break;
    }
    // ===== Aura enflammée : vraies flammes ondulantes autour de la carte =====
    case "inferno": {
      defs += `<filter id="${u}t" x="-40%" y="-40%" width="180%" height="180%"><feTurbulence type="fractalNoise" baseFrequency=".05 .11" numOctaves="2" seed="4" result="n"><animate attributeName="baseFrequency" dur="1.6s" values=".05 .11;.058 .13;.05 .11" repeatCount="indefinite"/></feTurbulence><feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G"/></filter>
        <linearGradient id="${u}f" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${c2}"/><stop offset=".55" stop-color="${c1}"/><stop offset="1" stop-color="${c1}" stop-opacity="0"/></linearGradient>
        <linearGradient id="${u}y" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff6c8"/><stop offset="1" stop-color="${c2}" stop-opacity="0"/></linearGradient>`;
      // langues de feu qui montent toujours vers le haut, plus hautes sur les côtés et au sommet
      const tongue = (x, y, h, w, fill, i, cls = "fx-flame") => `<path class="${cls}" style="animation-delay:${f1x(-i * .13)}s;animation-duration:${f1x(.7 + (i % 5) * .12)}s" d="M${f1x(x - w)} ${y}C${f1x(x - w)} ${f1x(y - h * .4)} ${f1x(x - w * .2)} ${f1x(y - h * .6)} ${f1x(x + w * .15)} ${f1x(y - h)}C${f1x(x + w * .3)} ${f1x(y - h * .55)} ${f1x(x + w)} ${f1x(y - h * .35)} ${f1x(x + w)} ${y}Z" fill="${fill}"/>`;
      const ring = (fill, sc, cls) => { let s = "", i = 0;
        if (RD) { for (let t = 0; t < 360; t += lite ? 24 : 14) { const [x, y] = edge(t, 1); s += tongue(x, y, (12 + R() * 9) * sc * (1 + Math.max(0, -y) / 70), 6 * sc, fill, i++, cls); } return s; }
        for (let y = HH; y >= -HH; y -= 9) for (const sx of [-1, 1]) s += tongue(sx * (HW + 1), y, (14 + R() * 10) * sc, 6 * sc, fill, i++, cls);
        for (let x = -HW; x <= HW; x += 8) s += tongue(x, -HH + 2, (20 + R() * 14) * sc, 6 * sc, fill, i++, cls);
        return s; };
      back = `${ringEl(4, `fill="${c1}" opacity=".45" filter="url(#${u}b)" class="fx-pulse"`)}
        <g filter="url(#${u}t)">${ring(`url(#${u}f)`, 1.15)}${ring(`url(#${u}y)`, .65)}</g>`;
      let bot = "";
      if (RD) for (let t = 130; t <= 230; t += 16) { const [x, y] = edge(t, 2); bot += tongue(x, y, 7 + R() * 7, 4.5, `url(#${u}f)`, t); }
      else for (let x = -HW + 2; x <= HW - 2; x += 7) bot += tongue(x, HH + 3, 7 + R() * 7, 4.5, `url(#${u}f)`, x + 40);
      front = `<g filter="url(#${u}t)" opacity=".9">${bot}</g>`
        + Array.from({ length: Q(14) }, (_, i) => fxP("fx-rise", -HW - 8 + R() * (2 * HW + 16), HH, 2.2 + R() * 2.2, -R() * 4, `<circle r="${f1x(.6 + R() * .9)}" fill="${i % 3 ? c1 : "#fff3b0"}"/><circle r="2.2" fill="${c1}" opacity=".3"/>`, (R() - .5) * 26)).join("");
      break;
    }
    // ===== Néon de Shinjuku : tubes qui grésillent, enseigne en kanji, pluie =====
    case "neon": case "neon2": {
      const tube = (off, c, w, extra = "") => ringEl(off, `fill="none" stroke="${c}" stroke-width="${w}" ${extra}`);
      const lit = (inner, cls = "") => `<g class="${cls}"><g filter="url(#${u}b)" opacity=".9">${inner}</g>${inner}</g>`;
      const sx = HW + 13, sign = (txt, x, y, c, cls) => `<g transform="translate(${x} ${y}) scale(${SC})"><rect x="-6.5" y="-15" width="13" height="30" rx="2.5" fill="#07060fcc" stroke="#ffffff22" stroke-width=".6"/>${lit(`<rect x="-5" y="-13.5" width="10" height="27" rx="2" fill="none" stroke="${c}" stroke-width=".7"/>${[...txt].map((ch, i) => `<text y="${-4 + i * 11}" text-anchor="middle" font-size="9" font-weight="800" fill="none" stroke="${c}" stroke-width=".7">${ch}</text>`).join("")}`, cls)}<path d="M-6.5 -10H${-sx + HW + 4}M-6.5 10H${-sx + HW + 4}" stroke="#6a6f80" stroke-width=".8"/></g>`;
      back = ringEl(10, `fill="${c1}" opacity=".22" filter="url(#${u}b)" class="fx-pulse"`);
      front = lit(tube(4, c1, 1.6, `stroke-dasharray="150 8 60 6 400"`), "fx-hum") + lit(tube(9, c2, 1.1, `stroke-dasharray="26 ${2 * HW + 2 * HH} 26 0"`), "fx-neonflick")
        + `<circle r="1.6" fill="#fff"><animateMotion dur="3.2s" repeatCount="indefinite" path="${RD ? fxOrbit(44, 44) : `M${-HW - 4} ${-HH + 3}V${HH - 3}Q${-HW - 4} ${HH + 4} ${-HW + 3} ${HH + 4}H${HW - 3}Q${HW + 4} ${HH + 4} ${HW + 4} ${HH - 3}V${-HH + 3}Q${HW + 4} ${-HH - 4} ${HW - 3} ${-HH - 4}H${-HW + 3}Q${-HW - 4} ${-HH - 4} ${-HW - 4} ${-HH + 3}`}"/></circle>`
        + sign(k === "neon2" ? "電脳" : "新宿", sx, -18, c2, "fx-neonflick b") + sign(k === "neon2" ? "夜" : "QG", -sx, 22, c1, "fx-hum")
        + Array.from({ length: Q(16) }, () => fxP("fx-rain", -HW - 16 + R() * (2 * HW + 32), -HH - 20, .6 + R() * .5, -R() * 2, `<path d="M0 0L-2 9" stroke="${R() > .5 ? c1 : c2}" stroke-width=".5" opacity=".55"/>`)).join("");
      break;
    }
    // ===== Tempête de foudre : éclairs qui frappent la carte, arc électrique sur le bord =====
    case "foudre": {
      const bolt = (x0, y0, x1, y1) => { let s = `M${x0} ${y0}`, br = ""; for (let i = 1; i <= 6; i++) { const t = i / 6, x = x0 + (x1 - x0) * t + (i < 6 ? (R() - .5) * 12 : 0), y = y0 + (y1 - y0) * t + (i < 6 ? (R() - .5) * 6 : 0); s += `L${f1x(x)} ${f1x(y)}`; if (i === 3) br = `M${f1x(x)} ${f1x(y)}l${f1x((R() - .5) * 16)} ${f1x(6 + R() * 8)}l${f1x((R() - .5) * 8)} ${f1x(4 + R() * 6)}`; } return s + br; };
      const strikes = [-40, 70, 230, 160, 8].slice(0, lite ? 3 : 5).map((t, i) => { const [a, b] = edge(t + 12, 24 + i * 2), [c, d] = edge(t, 0); return [a, b, c, d]; });
      const zap = strikes.map(([a, b, c, d], i) => `<g class="fx-strike" style="animation-delay:${f1x(-i * .73)}s"><path d="${bolt(a, b, c, d)}" stroke="${c2}" stroke-width="3.4" fill="none" filter="url(#${u}b)"/><path d="${bolt(a, b, c, d)}" stroke="#fff" stroke-width="1" fill="none" stroke-linejoin="bevel"/><circle cx="${c}" cy="${d}" r="5" fill="${c1}" opacity=".7" filter="url(#${u}b)"/></g>`).join("");
      const arc = (j) => { let s = ""; const n = 40; for (let i = 0; i <= n; i++) { const [x, y] = edge(i / n * 360, 3); s += `${i ? "L" : "M"}${f1x(x + (R() - .5) * 3)} ${f1x(y + (R() - .5) * 3)}`; } return `<path class="fx-arc a${j}" d="${s}Z" stroke="${c1}" stroke-width=".8" fill="none"/>`; };
      back = ringEl(8, `fill="${c2}" opacity=".35" filter="url(#${u}b)" class="fx-storm"`);
      front = `<g filter="url(#${u}b)" opacity=".6">${arc(0)}</g>${arc(0)}${arc(1)}${arc(2)}${zap}`
        + Array.from({ length: Q(8) }, (_, i) => { const [x, y] = edge(R() * 360, 2); return fxP("fx-spark", x, y, .9 + R(), -R() * 2, FX_SPARK(i % 2 ? "#fff" : c1, 2.2), (R() - .5) * 20); }).join("");
      break;
    }
    // ===== Phénix : ailes de feu qui battent derrière la carte, queue et braises =====
    case "phenix": {
      defs += `<linearGradient id="${u}w" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${c2}"/><stop offset=".55" stop-color="${c1}"/><stop offset="1" stop-color="#fff3b0"/></linearGradient>`;
      const feather = (len, rot, w) => `<path transform="rotate(${rot})" d="M0 0C${f1x(len * .3)} ${f1x(-w)} ${f1x(len * .8)} ${f1x(-w * .7)} ${len} 0C${f1x(len * .8)} ${f1x(w * .5)} ${f1x(len * .3)} ${f1x(w * .6)} 0 0Z" fill="url(#${u}w)" stroke="#fff6" stroke-width=".3"/>`;
      const wing = (sx) => `<g transform="translate(${sx * (HW - 6)} ${-HH + 18}) scale(${sx} 1)"><g class="fx-wing">${[[64, -58, 7], [70, -40, 8], [72, -22, 8], [66, -5, 8], [56, 12, 7], [44, 28, 6], [32, 44, 5]].map(([l, r, w]) => feather(l, r, w)).join("")}
        ${[[38, -50, 5], [42, -30, 5], [40, -12, 5], [32, 6, 4]].map(([l, r, w]) => feather(l, r, w).replace(`url(#${u}w)`, c2)).join("")}</g></g>`;
      back = `<g transform="scale(${SC})"><g filter="url(#${u}b)" opacity=".55">${wing(-1)}${wing(1)}</g>${wing(-1)}${wing(1)}
        <g transform="translate(0 ${HH - 6})">${[-24, -10, 0, 10, 24].map((r, i) => `<g class="fx-tail" style="animation-delay:${-i * .3}s">${feather(46 - Math.abs(r) * .6, 90 + r, 5)}</g>`).join("")}</g>
        <g transform="translate(0 ${-HH - 4})"><g class="fx-bob"><path d="M-6 6C-6 -2 -2 -8 4 -8C8 -8 10 -6 12 -4L8 -3C9 0 6 4 4 6Z" fill="url(#${u}w)"/>${[-10, -4, 2].map((x, i) => `<path class="fx-flame" style="animation-delay:${-i * .2}s" d="M${x} -6C${x - 2} -12 ${x + 1} -16 ${x + 4} -20C${x + 4} -14 ${x + 6} -10 ${x + 4} -6Z" fill="${c1}"/>`).join("")}<circle cx="5" cy="-4.4" r=".9" fill="#fff"/></g></g></g>`;
      front = Array.from({ length: Q(12) }, (_, i) => fxP("fx-rise", (R() - .5) * (2 * HW + 30), HH + 4, 2.4 + R() * 2, -R() * 4, `<circle r="${f1x(.6 + R())}" fill="${i % 2 ? c1 : "#fff3b0"}"/><circle r="2.4" fill="${c1}" opacity=".3"/>`, (R() - .5) * 30)).join("");
      break;
    }
    // ===== Tempête de sakura : un tourbillon de pétales et une branche en fleur =====
    case "tempete": {
      const tilt = 12; defs += fxFrontMask(u, tilt);
      const swirl = `<g transform="rotate(${tilt})">${Array.from({ length: Q(22) }, (_, i) => { const rx = ORB[0] - 9 + R() * 14, ry = ORB[1] - 6 + R() * 12, T = 4 + R() * 3;
        return `<g><animateMotion dur="${f1x(T)}s" repeatCount="indefinite" rotate="auto" begin="${f1x(-R() * T)}s" path="${fxOrbit(f1x(rx), f1x(ry))}"/><g class="fx-flip" style="animation-delay:${f1x(-R() * 2)}s"><g transform="scale(${f1x(.8 + R() * .6)})">${FX_PETAL(i % 3 ? c1 : "#fff0f6", c2)}</g></g></g>`; }).join("")}</g>`;
      const flower = (x, y, r) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((a) => `<ellipse cy="${-r * .55}" rx="${f1x(r * .42)}" ry="${f1x(r * .6)}" fill="${c1}" stroke="${c2}" stroke-width=".4" transform="rotate(${a})"/>`).join("")}<circle r="${f1x(r * .26)}" fill="#ffd24d"/></g>`;
      back = swirl;
      front = `<g mask="url(#${u}m)">${swirl}</g><g transform="translate(${-HW - 10} ${-HH - 6}) scale(${SC})"><g class="fx-sway"><path d="M0 0C10 4 18 8 30 6C36 5 42 8 50 14M14 4C16 10 22 14 28 14M30 6C34 0 40 -2 46 0" stroke="#4a2a1a" stroke-width="2.2" fill="none" stroke-linecap="round"/>${flower(14, 3, 6)}${flower(28, 14, 5)}${flower(33, 4, 7)}${flower(46, 0, 5)}${flower(50, 14, 6)}</g></g>`;
      break;
    }

    // ===== Carpes koï : deux poissons (yin et yang) nagent autour, des ondes à la surface =====
    case "koi": {
      const tilt = RD ? -10 : -8; defs += fxFrontMask(u, tilt);
      const fish = (col, spot, off) => { const N = Q(12), path = fxOrbit(ORB[0] - 4, ORB[1] - 4), T = 6.5, mot = (i) => `<animateMotion dur="${T}s" repeatCount="indefinite" rotate="auto" begin="${f1x(-off - (N + 2 - i) * .075)}s" path="${path}"/>`;
        let b = `<g>${mot(N + 2)}<path class="fx-flick" d="M2 0C-4 -7 -9 -8 -12 -6C-9 -2 -9 2 -12 6C-9 8 -4 7 2 0Z" fill="${col}" opacity=".85"/></g>`;
        for (let i = N; i >= 1; i--) { const r = 4.4 * (1 - i / N * .7); b += `<g>${mot(i)}<ellipse rx="${f1x(r * 1.3)}" ry="${f1x(r)}" fill="${col}"/>${i % 3 === 1 ? `<circle cx="${f1x(-r * .2)}" cy="${f1x(-r * .3)}" r="${f1x(r * .5)}" fill="${spot}"/>` : ""}</g>`; }
        return b + `<g>${mot(0)}<path d="M-1 -4C-4 -9 -8 -9 -10 -8C-7 -6 -5 -4 -3 -3ZM-1 4C-4 9 -8 9 -10 8C-7 6 -5 4 -3 3Z" fill="${col}" opacity=".8"/><ellipse cx="2" rx="6.4" ry="4.6" fill="${col}"/><circle cx="-1" r="2.2" fill="${spot}"/><circle cx="5.4" cy="-1.9" r=".8" fill="#111"/><circle cx="5.4" cy="1.9" r=".8" fill="#111"/></g>`; };
      const orbit = `<g transform="rotate(${tilt})">${fish(c1, "#fff6ee", 0)}${fish("#f6f1ea", c2, 3.25)}</g>`;
      back = `${ringEl(6, `fill="#2a8ac8" opacity=".22" filter="url(#${u}b)" class="fx-pulse"`)}${[0, 1, 2].map((i) => `<g class="fx-ripple" style="animation-delay:${-i * 1.1}s">${ringEl(3, `fill="none" stroke="${c1}" stroke-width="1" opacity=".6"`)}</g>`).join("")}${orbit}`;
      front = `<g mask="url(#${u}m)">${orbit}</g>` + Array.from({ length: Q(6) }, () => { const [x, y] = edge(140 + R() * 80, 4); return fxP("fx-rise", x, y, 2.6 + R() * 2, -R() * 4, `<circle r="${f1x(1 + R() * 1.4)}" fill="none" stroke="#cfefff" stroke-width=".6"/>`, (R() - .5) * 10); }).join("");
      break;
    }
    // ===== Papillons : une nuée qui virevolte autour, ailes qui battent =====
    case "papillons": {
      const tilt = 6; defs += fxFrontMask(u, tilt);
      const fly = (i) => { const rx = ORB[0] - 8 + R() * 18, ry = ORB[1] - 6 + R() * 16, T = 5 + R() * 4, sc = .75 + R() * .5, col = i % 2 ? c1 : c2;
        return `<g><animateMotion dur="${f1x(T)}s" repeatCount="indefinite" rotate="auto" begin="${f1x(-R() * T)}s" path="${fxOrbit(f1x(rx), f1x(ry))}"/><g transform="rotate(90) scale(${f1x(sc)})"><g class="fx-flapx" style="animation-delay:${f1x(-R())}s">
          <path d="M0 0C-3 -7 -10 -9 -11 -3C-11 1 -5 2 0 0ZM0 0C-2 4 -7 8 -9 5C-9 3 -4 1 0 0Z" fill="${col}" stroke="#2a1a3a" stroke-width=".4"/><path d="M0 0C3 -7 10 -9 11 -3C11 1 5 2 0 0ZM0 0C2 4 7 8 9 5C9 3 4 1 0 0Z" fill="${col}" stroke="#2a1a3a" stroke-width=".4"/>
          <circle cx="-6" cy="-3.5" r="1.3" fill="#fff" opacity=".7"/><circle cx="6" cy="-3.5" r="1.3" fill="#fff" opacity=".7"/></g><rect x="-.6" y="-4.5" width="1.2" height="9" rx=".6" fill="#2a1a10"/></g></g>`; };
      const swarm = `<g transform="rotate(${tilt})">${Array.from({ length: Q(9) }, (_, i) => fly(i)).join("")}</g>`;
      back = `${ringEl(6, `fill="${c1}" opacity=".18" filter="url(#${u}b)" class="fx-pulse"`)}${swarm}`;
      front = `<g mask="url(#${u}m)">${swarm}</g>` + Array.from({ length: Q(8) }, () => { const [x, y] = edge(R() * 360, 6 + R() * 8); return `<g transform="translate(${x} ${y})"><g class="fx-tw" style="animation-delay:${f1x(-R() * 2)}s">${FX_SPARK("#fff", 1.6)}</g></g>`; }).join("");
      break;
    }
    // ===== Galaxie : bras de nébuleuse qui tournent derrière, une planète en orbite, des étoiles =====
    case "galaxie": {
      defs += `<radialGradient id="${u}n"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset=".3" stop-color="${c1}" stop-opacity=".6"/><stop offset=".75" stop-color="${c2}" stop-opacity=".22"/><stop offset="1" stop-color="${c2}" stop-opacity="0"/></radialGradient>
        <radialGradient id="${u}q" cx=".35" cy=".35"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient>`;
      const arm = (rot, col) => `<path transform="rotate(${rot})" d="M0 0C${f1x(HW * .7)} ${f1x(-HH * .3)} ${f1x(HW * 1.3)} ${f1x(HH * .35)} ${f1x(HW * .9)} ${f1x(HH * 1.15)}" stroke="${col}" stroke-width="9" fill="none" opacity=".42" filter="url(#${u}b)" stroke-linecap="round"/>`;
      const stars = Array.from({ length: Q(34) }, () => { const a = R() * 6.283, r = .3 + R() * .95; return `<circle cx="${f1x(Math.cos(a) * (HW + 18) * r)}" cy="${f1x(Math.sin(a) * (HH + 16) * r)}" r="${f1x(.3 + R() * .7)}" fill="#fff" opacity="${f1x(.4 + R() * .6)}"/>`; }).join("");
      const planet = `<g><animateMotion dur="9s" repeatCount="indefinite" path="${fxOrbit(ORB[0] - 2, ORB[1] - 10)}"/><circle r="5" fill="${c1}" opacity=".4" filter="url(#${u}b)"/><circle r="4" fill="url(#${u}q)"/><ellipse rx="8.5" ry="2.2" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width=".8" transform="rotate(-22)"/></g>`;
      defs += fxFrontMask(u, 0);
      defs += `<radialGradient id="${u}g"><stop offset=".55" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><mask id="${u}gm" maskUnits="userSpaceOnUse" x="-120" y="-120" width="240" height="240"><ellipse rx="${HW + 22}" ry="${HH + 18}" fill="url(#${u}g)"/></mask>`;
      back = `<ellipse rx="${HW + 24}" ry="${HH + 20}" fill="url(#${u}n)" opacity=".6"/><g mask="url(#${u}gm)"><g class="fx-spin slow">${arm(0, c1)}${arm(120, c2)}${arm(240, c1)}</g></g><g class="fx-spin slow">${stars}</g>${planet}`;
      front = `<g mask="url(#${u}m)">${planet}</g>` + Array.from({ length: Q(9) }, () => { const [x, y] = edge(R() * 360, 4 + R() * 12); return `<g transform="translate(${x} ${y})"><g class="fx-tw" style="animation-delay:${f1x(-R() * 2)}s">${FX_SPARK(R() > .5 ? "#fff" : c1, 1.4 + R() * 1.6)}</g></g>`; }).join("");
      break;
    }
    // ===== Masque d'oni : le démon veille au-dessus, fumée rouge, yeux qui brûlent =====
    case "oni": {
      defs += `<linearGradient id="${u}o" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
        <linearGradient id="${u}h" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#f4e6c8"/><stop offset="1" stop-color="#b8a07a"/></linearGradient>`;
      const mask = `<g transform="translate(0 ${-HH - 2}) scale(${RD ? .85 : 1})"><g class="fx-bob">
        <path d="M-11 -12C-16 -20 -17 -28 -13 -35C-11 -27 -7 -21 -3 -17ZM11 -12C16 -20 17 -28 13 -35C11 -27 7 -21 3 -17Z" fill="url(#${u}h)" stroke="#3a2a10" stroke-width=".7"/>
        <path d="M-15 -4C-15 -14 -8 -19 0 -19C8 -19 15 -14 15 -4C15 6 9 12 0 13C-9 12 -15 6 -15 -4Z" fill="url(#${u}o)" stroke="#1a0404" stroke-width="1"/>
        <path d="M-12 -9L-3 -5.5M12 -9L3 -5.5" stroke="#1a0404" stroke-width="2.6" stroke-linecap="round"/><path d="M-3 -1L0 2L3 -1" stroke="#1a0404" stroke-width="1.2" fill="none"/>
        <g filter="url(#${u}b)"><ellipse cx="-6.5" cy="-2.5" rx="3" ry="1.8" fill="#ffe14d"/><ellipse cx="6.5" cy="-2.5" rx="3" ry="1.8" fill="#ffe14d"/></g>
        <g class="fx-blink"><ellipse cx="-6.5" cy="-2.5" rx="2.4" ry="1.4" fill="#fff6a0"/><ellipse cx="6.5" cy="-2.5" rx="2.4" ry="1.4" fill="#fff6a0"/></g>
        <path d="M-9 5Q0 11 9 5Q0 8 -9 5Z" fill="#1a0404"/><path d="M-6.5 5.6L-5.4 10L-4.2 6.3ZM6.5 5.6L5.4 10L4.2 6.3Z" fill="#fff"/></g></g>`;
      const smoke = (n, y0) => Array.from({ length: Q(n) }, () => { const [x, y] = edge(R() * 360, 2); return fxP("fx-smoke", x, y0 ?? y, 3 + R() * 2.5, -R() * 5, `<circle r="${f1x(4 + R() * 4)}" fill="${R() > .5 ? c2 : "#1a0608"}" opacity=".55" filter="url(#${u}b)"/>`, (R() - .5) * 16); }).join("");
      back = `${ringEl(6, `fill="${c2}" opacity=".45" filter="url(#${u}b)" class="fx-pulse"`)}${smoke(12)}`;
      front = mask + smoke(5, HH);
      break;
    }
    // ===== Shurikens : trois étoiles d'acier en orbite, traînées et étincelles =====
    case "shuriken": {
      const tilt = -12; defs += fxFrontMask(u, tilt) + `<linearGradient id="${u}s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4f7fb"/><stop offset=".5" stop-color="#9aa4b4"/><stop offset="1" stop-color="#4a5262"/></linearGradient>
        <linearGradient id="${u}t" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="${c1}" stop-opacity=".8"/><stop offset="1" stop-color="${c1}" stop-opacity="0"/></linearGradient>`;
      const star = `<path d="M0 -7L1.7 -1.7L7 0L1.7 1.7L0 7L-1.7 1.7L-7 0L-1.7 -1.7Z" fill="url(#${u}s)" stroke="#20242e" stroke-width=".5"/><circle r="1.5" fill="#14161c"/><circle r="1.5" fill="none" stroke="${c1}" stroke-width=".5"/>`;
      const orbit = `<g transform="rotate(${tilt})">${[0, 1, 2].map((i) => `<g><animateMotion dur="3.6s" repeatCount="indefinite" rotate="auto" begin="${-i * 1.2}s" path="${fxOrbit(ORB[0] - 2, ORB[1] - 2)}"/><path d="M-2 0L-30 -2.6L-30 2.6Z" fill="url(#${u}t)"/><g class="fx-spin fast">${star}</g></g>`).join("")}</g>`;
      back = `${ringEl(5, `fill="${c1}" opacity=".15" filter="url(#${u}b)" class="fx-pulse"`)}${orbit}`;
      front = `<g mask="url(#${u}m)">${orbit}</g>` + Array.from({ length: Q(7) }, (_, i) => { const [x, y] = edge(R() * 360, 3); return fxP("fx-spark", x, y, .8 + R(), -R() * 2, FX_SPARK(i % 2 ? "#fff" : c1, 2), (R() - .5) * 18); }).join("");
      break;
    }
    // ===== Chaînes spectrales : une chaîne fait le tour, une autre barre le dos, un cadenas =====
    case "chaines": {
      defs += `<linearGradient id="${u}c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8ecf4"/><stop offset=".5" stop-color="${c1}"/><stop offset="1" stop-color="#3a3a4a"/></linearGradient>`;
      const link = (x, y, ang, flat) => flat ? `<rect x="-3.4" y="-.7" width="6.8" height="1.4" rx=".7" fill="url(#${u}c)" transform="translate(${x} ${y}) rotate(${f1x(ang)})"/>` : `<rect x="-3.4" y="-1.7" width="6.8" height="3.4" rx="1.7" fill="none" stroke="url(#${u}c)" stroke-width="1.3" transform="translate(${x} ${y}) rotate(${f1x(ang)})"/>`;
      const loop = (off) => { let s = "", i = 0; const step = RD ? 7.2 : 4.6; for (let t = 0; t < 360; t += step) { const [x, y] = edge(t, off), [x2, y2] = edge(t + 1, off); s += link(x, y, Math.atan2(y2 - y, x2 - x) * 180 / Math.PI, i++ % 2); } return s; };
      const diag = (x0, y0, x1, y1) => { const n = Math.round(Math.hypot(x1 - x0, y1 - y0) / 5.4), a = Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI; return Array.from({ length: n }, (_, i) => link(f1x(x0 + (x1 - x0) * i / n), f1x(y0 + (y1 - y0) * i / n), a, i % 2)).join(""); };
      back = `${ringEl(7, `fill="${c2}" opacity=".35" filter="url(#${u}b)" class="fx-pulse"`)}<g class="fx-rattle">${diag(-HW - 14, -HH - 6, HW + 14, HH + 6)}${diag(HW + 14, -HH - 6, -HW - 14, HH + 6)}</g>`;
      front = `<g filter="url(#${u}b)" opacity=".6">${ringEl(5, `fill="none" stroke="${c1}" stroke-width="3"`)}</g><g class="fx-rattle b">${loop(5)}</g>
        <g transform="translate(0 ${HH + 7})"><g class="fx-bob"><path d="M-4 -2V-6A4 4 0 0 1 4 -6V-2" fill="none" stroke="url(#${u}c)" stroke-width="1.6"/><rect x="-6" y="-2.5" width="12" height="9.5" rx="2" fill="url(#${u}c)" stroke="#2a2a3a" stroke-width=".6"/><circle cy="1.5" r="1.4" fill="#14141c"/><path d="M0 2V5" stroke="#14141c" stroke-width="1"/><circle cy="2" r="6" fill="${c1}" opacity=".3" filter="url(#${u}b)" class="fx-pulse"/></g></g>`;
      break;
    }
    // ===== Glace : des pics de givre jaillissent du bord, brume froide, neige =====
    case "glace": {
      defs += `<linearGradient id="${u}i" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${c2}" stop-opacity=".9"/><stop offset=".6" stop-color="${c1}" stop-opacity=".85"/><stop offset="1" stop-color="#fff"/></linearGradient>`;
      let spikes = "";
      for (let t = 0; t < 360; t += lite ? 20 : 11) { const [x, y] = edge(t + R() * 4, -2), [nx, ny] = normal(t), L = 8 + R() * (t > 300 || t < 60 ? 14 : 9), w = 2.6 + R() * 1.8;
        spikes += `<path d="M${f1x(x - ny * w)} ${f1x(y + nx * w)}L${f1x(x + nx * L)} ${f1x(y + ny * L)}L${f1x(x + ny * w)} ${f1x(y - nx * w)}Z" fill="url(#${u}i)" stroke="#ffffff99" stroke-width=".35" transform="rotate(${f1x((R() - .5) * 14)} ${x} ${y})"/>`; }
      back = `${ringEl(6, `fill="${c1}" opacity=".35" filter="url(#${u}b)" class="fx-pulse"`)}<g class="fx-shine">${spikes}</g>`;
      front = Array.from({ length: Q(10) }, (_, i) => fxP("fx-fall", (R() - .5) * 2 * (HW + 10), -HH - 10, 5 + R() * 4, -R() * 9, FX_FLAKE(i % 2 ? "#fff" : c1), (R() - .5) * 20, .6 + R() * .5)).join("")
        + [[-1, -1], [1, 1]].map(([sx, sy]) => { const [x, y] = [sx * (HW + 2), sy * (HH + 2)]; return `<g transform="translate(${x} ${y}) scale(${sx} ${sy})">${[[-12, 0, 10], [-4, -4, 16], [4, -12, 10]].map(([a, b, l]) => `<path d="M${a} ${b}L${a - 4 - l * .3} ${b - l}L${a + 3} ${b - 2}Z" fill="url(#${u}i)" stroke="#fff" stroke-width=".3"/>`).join("")}</g>`; }).join("");
      break;
    }
    // ===== Marée : deux vagues qui courent sur le bord, bulles, éclaboussures =====
    case "maree": {
      const wave = (off, amp, freq) => { let s = ""; for (let t = 0; t <= 360; t += 3) { const [x, y] = edge(t, off + Math.sin(t * freq * Math.PI / 180) * amp); s += `${t ? "L" : "M"}${x} ${y}`; } return s + "Z"; };
      back = `${ringEl(6, `fill="${c2}" opacity=".35" filter="url(#${u}b)" class="fx-pulse"`)}`;
      front = `<g filter="url(#${u}b)" opacity=".7"><path d="${wave(4, 1.6, 9)}" fill="none" stroke="${c1}" stroke-width="3"/></g>
        <path class="fx-dash" d="${wave(4, 1.6, 9)}" fill="none" stroke="${c1}" stroke-width="2.2" stroke-dasharray="22 8" stroke-linecap="round"/>
        <path class="fx-dash rev" d="${wave(8, 2.2, 6)}" fill="none" stroke="#e8fbff" stroke-width="1.2" stroke-dasharray="10 14" stroke-linecap="round" opacity=".85"/>`
        + Array.from({ length: Q(12) }, () => { const [x, y] = edge(110 + R() * 140, 3); return fxP("fx-rise", x, y, 2.4 + R() * 2.4, -R() * 4, `<circle r="${f1x(.9 + R() * 1.6)}" fill="${c1}" fill-opacity=".2" stroke="#e8fbff" stroke-width=".5"/>`, (R() - .5) * 12); }).join("")
        + Array.from({ length: Q(6) }, () => { const [x, y] = edge(R() * 360, 5); return fxP("fx-spark", x, y, 1 + R(), -R() * 2, `<circle r="1.2" fill="#e8fbff"/>`, (R() - .5) * 16); }).join("");
      break;
    }
    // ===== Lotus : fleurs au pied, rayons de lumière derrière, pollen doré =====
    case "lotus": {
      defs += `<linearGradient id="${u}l" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${c2}"/><stop offset="1" stop-color="#fff"/></linearGradient>`;
      const flower = (x, y, sc) => `<g transform="translate(${x} ${y}) scale(${sc})"><ellipse cy="3" rx="12" ry="3" fill="#2a7a4a" opacity=".85"/>${[-60, -30, 0, 30, 60].map((a) => `<path transform="rotate(${a})" d="M0 0C-3.5 -4 -3.5 -10 0 -14C3.5 -10 3.5 -4 0 0Z" fill="url(#${u}l)" stroke="${c1}" stroke-width=".4"/>`).join("")}${[-20, 20].map((a) => `<path transform="rotate(${a})" d="M0 0C-2.5 -3 -2.5 -8 0 -10C2.5 -8 2.5 -3 0 0Z" fill="#fff" opacity=".9"/>`).join("")}<circle cy="-2" r="2" fill="#ffd24d"/></g>`;
      const rays = Array.from({ length: 12 }, (_, i) => `<path transform="rotate(${i * 30})" d="M0 0L-4 ${-(HH + 20)}L4 ${-(HH + 20)}Z" fill="${c1}" opacity=".1"/>`).join("");
      back = `${ringEl(6, `fill="${c1}" opacity=".3" filter="url(#${u}b)" class="fx-pulse"`)}<g class="fx-spin slow">${rays}</g>`;
      front = flower(-HW * .62, HH + 3, .85) + flower(HW * .62, HH + 3, .85) + flower(0, HH + 6, 1.15)
        + Array.from({ length: Q(12) }, () => fxP("fx-rise", (R() - .5) * 2 * HW, HH, 3 + R() * 2.5, -R() * 5, `<circle r="${f1x(.6 + R() * .8)}" fill="#ffe08a"/><circle r="2" fill="#ffd24d" opacity=".3"/>`, (R() - .5) * 18)).join("");
      break;
    }
    // ===== Hologramme : viseur, anneaux qui tournent, ligne de balayage, pluie de données =====
    case "holo": {
      defs += `<linearGradient id="${u}v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}" stop-opacity="0"/><stop offset=".5" stop-color="${c1}" stop-opacity=".55"/><stop offset="1" stop-color="${c1}" stop-opacity="0"/></linearGradient>
        <clipPath id="${u}k">${ringEl(0, "")}</clipPath>`;
      const lit = (inner) => `<g filter="url(#${u}b)" opacity=".8">${inner}</g>${inner}`;
      const brackets = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => `<path d="M${sx * (HW + 6)} ${sy * (HH + 6) - sy * 11}V${sy * (HH + 6)}H${sx * (HW + 6) - sx * 11}" fill="none" stroke="${c1}" stroke-width="1.5"/>`).join("");
      back = `${ringEl(9, `fill="${c1}" opacity=".16" filter="url(#${u}b)" class="fx-pulse"`)}<g class="fx-dash">${ringEl(11, `fill="none" stroke="${c2}" stroke-width=".8" stroke-dasharray="3 5"`)}</g>`;
      front = `<g class="fx-glitch">${lit(brackets)}</g><g class="fx-dash rev">${ringEl(4, `fill="none" stroke="${c1}" stroke-width="1" stroke-dasharray="30 12 6 12" opacity=".8"`)}</g>
        <g clip-path="url(#${u}k)"><rect class="fx-scan" x="${-HW}" y="${-HH - 6}" width="${2 * HW}" height="6" fill="url(#${u}v)" style="--h:${2 * HH + 12}px"/></g>`
        + Array.from({ length: Q(16) }, () => { const sx = R() > .5 ? 1 : -1; return fxP("fx-fall", sx * (HW + 6 + R() * 10), -HH - 10, 1.4 + R() * 1.6, -R() * 3, `<path d="M0 0V${f1x(2 + R() * 5)}" stroke="${R() > .3 ? c1 : c2}" stroke-width="1" opacity=".8"/>`); }).join("");
      break;
    }
    // ===== Ombre : vrilles d'ombre qui ondulent, des yeux s'ouvrent dans le noir =====
    case "ombre": {
      let tendrils = "";
      for (let i = 0, t = 20; t < 360; t += lite ? 48 : 30, i++) { const [x, y] = edge(t, -1), [nx, ny] = normal(t), L = 16 + R() * 12, cx = x + nx * L * .5 - ny * 8, cy = y + ny * L * .5 + nx * 8;
        tendrils += `<path class="fx-tendril" style="animation-delay:${f1x(-R() * 3)}s;transform-origin:${x}px ${y}px" d="M${f1x(x - ny * 3)} ${f1x(y + nx * 3)}Q${f1x(cx)} ${f1x(cy)} ${f1x(x + nx * L)} ${f1x(y + ny * L)}Q${f1x(cx + ny * 4)} ${f1x(cy - nx * 4)} ${f1x(x + ny * 3)} ${f1x(y - nx * 3)}Z" fill="#0a0612" stroke="${c1}" stroke-width=".5" stroke-opacity=".6"/>`; }
      const eyes = Array.from({ length: Q(6) }, () => { const [x, y] = edge(R() * 360, 10 + R() * 8); return `<g transform="translate(${x} ${y})"><g class="fx-blink" style="animation-delay:${f1x(-R() * 4)}s;animation-duration:${f1x(3 + R() * 3)}s"><ellipse cx="-2.2" rx="1.4" ry=".7" fill="${c1}"/><ellipse cx="2.2" rx="1.4" ry=".7" fill="${c1}"/></g></g>`; }).join("");
      back = `${ringEl(10, `fill="#05030a" opacity=".85" filter="url(#${u}b)"`)}${ringEl(6, `fill="${c2}" opacity=".45" filter="url(#${u}b)" class="fx-pulse"`)}${tendrils}`;
      front = eyes + Array.from({ length: Q(7) }, () => { const [x, y] = edge(R() * 360, 2); return fxP("fx-smoke", x, y, 3 + R() * 2, -R() * 5, `<circle r="${f1x(3 + R() * 3)}" fill="#0a0612" opacity=".6" filter="url(#${u}b)"/>`, (R() - .5) * 14); }).join("");
      break;
    }
    // ===== Comètes : trois comètes tournent autour avec leur queue, ciel étoilé derrière =====
    case "comete": {
      const tilt = -16; defs += fxFrontMask(u, tilt) + `<linearGradient id="${u}t" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#fff"/><stop offset=".25" stop-color="${c1}" stop-opacity=".8"/><stop offset="1" stop-color="${c2}" stop-opacity="0"/></linearGradient>`;
      const orbit = `<g transform="rotate(${tilt})">${[0, 1, 2].map((i) => { const rx = ORB[0] - 4 + i * 5, ry = ORB[1] - 4 + i * 4, T = 4.2 + i * 1.3; return `<g><animateMotion dur="${T}s" repeatCount="indefinite" rotate="auto" begin="${-i * 1.7}s" path="${fxOrbit(rx, ry)}"/><path d="M1 0L-34 -3.4L-34 3.4Z" fill="url(#${u}t)"/><circle r="3" fill="${c1}" opacity=".6" filter="url(#${u}b)"/><circle r="1.8" fill="#fff"/></g>`; }).join("")}</g>`;
      const stars = Array.from({ length: Q(22) }, () => { const [x, y] = edge(R() * 360, 4 + R() * 16); return `<circle cx="${x}" cy="${y}" r="${f1x(.3 + R() * .6)}" fill="#fff" class="fx-tw" style="animation-delay:${f1x(-R() * 2)}s"/>`; }).join("");
      back = `${ringEl(8, `fill="${c2}" opacity=".3" filter="url(#${u}b)"`)}${stars}${orbit}`;
      front = `<g mask="url(#${u}m)">${orbit}</g>`;
      break;
    }
    // ===== Lune de sang : une lune rouge derrière, des chauves-souris passent, brume =====
    case "lunesang": {
      defs += `<radialGradient id="${u}m2" cx=".4" cy=".4"><stop offset="0" stop-color="#ffd0c0"/><stop offset=".45" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient>`;
      const [mx, my] = RD ? [36, -38] : [HW * .55, -HH * .62], mr = 22 * SC;
      const bat = (y0, y1, T, dl, sc, sx) => `<g><animateMotion dur="${T}s" repeatCount="indefinite" begin="${dl}s" path="M${sx * (-HW - 34)} ${y0}C${-sx * 10} ${y0 - 24} ${sx * 10} ${y1 + 24} ${sx * (HW + 34)} ${y1}"/><g transform="scale(${sx * sc} ${sc})"><g class="fx-flapx"><path d="M0 0C-3 -4 -8 -5 -12 -2C-9 -2 -8 0 -9 2C-6 0 -4 1 -3 3C-2 1 -1 1 0 1C1 1 2 1 3 3C4 1 6 0 9 2C8 0 9 -2 12 -2C8 -5 3 -4 0 0Z" fill="#14060a"/></g><circle cx="-.8" cy="-.4" r=".35" fill="#ff4d4d"/><circle cx=".8" cy="-.4" r=".35" fill="#ff4d4d"/></g></g>`;
      back = `${ringEl(8, `fill="${c2}" opacity=".45" filter="url(#${u}b)" class="fx-pulse"`)}<circle cx="${mx}" cy="${my}" r="${f1x(mr + 8)}" fill="${c1}" opacity=".45" filter="url(#${u}b)" class="fx-pulse"/><circle cx="${mx}" cy="${my}" r="${f1x(mr)}" fill="url(#${u}m2)"/>
        ${[[-6, -5, 4], [5, 4, 3], [-3, 8, 2.4], [8, -7, 2]].map(([x, y, r]) => `<circle cx="${f1x(mx + x * SC)}" cy="${f1x(my + y * SC)}" r="${f1x(r * SC)}" fill="${c2}" opacity=".35"/>`).join("")}
        ${bat(-HH * .2, -HH * .7, 6.5, -1, .9, 1)}${bat(-HH * .5, -HH * .1, 8, -4, .7, -1)}`;
      front = (lite ? "" : bat(HH * .3, -HH * .3, 5.5, -2.5, 1.1, 1) + bat(HH * .6, HH * .1, 7.2, -5.5, .8, -1))
        + Array.from({ length: Q(6) }, () => { const [x] = edge(140 + R() * 80, 0); return fxP("fx-smoke", x, HH + 2, 4 + R() * 3, -R() * 6, `<ellipse rx="${f1x(8 + R() * 6)}" ry="3" fill="${c1}" opacity=".35" filter="url(#${u}b)"/>`, (R() - .5) * 20); }).join("");
      break;
    }
    // ===== Plumes : des plumes qui tombent en se balançant, souffle de vent =====
    case "plumes": {
      const feather = (col) => `<path d="M0 -9C3.5 -6 3.6 3 0 9C-3.6 3 -3.5 -6 0 -9Z" fill="${col}" stroke="#ffffff66" stroke-width=".3"/><path d="M0 -9V11" stroke="#ffffffaa" stroke-width=".45"/>${[-5, -2, 1, 4].map((y) => `<path d="M0 ${y}L2.6 ${y - 2.2}M0 ${y}L-2.6 ${y - 2.2}" stroke="#ffffff55" stroke-width=".3"/>`).join("")}`;
      const wind = (y, i) => `<path class="fx-wind" style="animation-delay:${-i * 1.1}s" d="M${-HW - 26} ${y}C${-HW / 2} ${y - 10} ${HW / 2} ${y + 8} ${HW + 26} ${y - 4}" fill="none" stroke="${c1}" stroke-width="1" stroke-linecap="round" stroke-dasharray="26 140" opacity=".7"/>`;
      back = `${ringEl(6, `fill="${c1}" opacity=".2" filter="url(#${u}b)" class="fx-pulse"`)}${wind(-HH * .3, 0)}${wind(HH * .4, 1)}`;
      front = wind(-HH * .7, 2) + Array.from({ length: Q(9) }, (_, i) => fxP("fx-fall", (R() - .5) * 2 * (HW + 12), -HH - 14, 5.5 + R() * 4, -R() * 9, `<g class="fx-sway2" style="animation-delay:${f1x(-R() * 2)}s">${feather(i % 2 ? c1 : c2)}</g>`, (R() - .5) * 40, .7 + R() * .5)).join("");
      break;
    }

    // ===== Ornements (Atelier) =====
    case "o-etoile": front = `<g transform="translate(0 ${-HH - 6})"><g class="fx-bob"><g class="fx-spin">${Array.from({ length: 8 }, (_, i) => `<path transform="rotate(${i * 45})" d="M0 -6L1 -22L-1 -22Z" fill="${c1}" opacity="${i % 2 ? .35 : .6}"/>`).join("")}</g>
      <g filter="url(#${u}b)">${FX_SPARK(c1, 11)}</g>${FX_SPARK(c1, 10)}${FX_SPARK("#fff", 4.5)}</g></g>`
      + [[-HW + 4, -HH + 14, 3], [HW - 6, -HH + 22, 2.4], [HW - 2, -HH - 4, 2]].map(([x, y, r], i) => `<g transform="translate(${x} ${y})"><g class="fx-tw" style="animation-delay:${-i * .6}s">${FX_SPARK("#fff", r)}</g></g>`).join(""); break;
    case "o-kanji": defs += `<radialGradient id="${u}r" cx=".4" cy=".35"><stop offset="0" stop-color="#fff6d0"/><stop offset=".55" stop-color="${c1}"/><stop offset="1" stop-color="#5a1a08"/></radialGradient>`;
      front = `<g transform="translate(0 ${-HH - 7})"><g class="fx-bob"><circle r="13" fill="${c1}" opacity=".45" filter="url(#${u}b)"/><g class="fx-coin"><circle r="10.5" fill="url(#${u}r)" stroke="#ffd98a" stroke-width="1.2"/><circle r="8" fill="none" stroke="#5a1a08" stroke-width=".6" stroke-dasharray="1.4 1.4"/>
        <text y="4.2" text-anchor="middle" font-size="12" font-weight="900" fill="#3a0e04">宿</text></g></g></g>`; break;
    case "o-aureole": front = `<g transform="translate(0 ${-HH - 9})"><g class="fx-bob">${Array.from({ length: 9 }, (_, i) => `<path class="fx-tw" style="animation-delay:${-i * .3}s" d="M${-16 + i * 4} 4L${-24 + i * 6} 30L${-21 + i * 6} 30Z" fill="${c1}" opacity=".18"/>`).join("")}
      <ellipse rx="20" ry="5.5" fill="none" stroke="${c1}" stroke-width="5" opacity=".6" filter="url(#${u}b)"/><ellipse rx="20" ry="5.5" fill="none" stroke="${c1}" stroke-width="2.4"/><ellipse rx="20" ry="5.5" fill="none" stroke="#fff" stroke-width=".7"/>
      <circle r="1.6" fill="#fff"><animateMotion dur="2.4s" repeatCount="indefinite" path="M20 0A20 5.5 0 1 1 -20 0A20 5.5 0 1 1 20 0"/></circle></g></g>`; break;
    case "o-cornes": defs += `<linearGradient id="${u}h" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${c1}"/><stop offset=".7" stop-color="#2a0a10"/><stop offset="1" stop-color="#ff3a4d"/></linearGradient>`;
      front = [-1, 1].map((sx) => `<g transform="translate(${sx * (HW - 12)} ${-HH + 2}) scale(${sx * 1.35} 1.35)"><path d="M-6 2C-8 -10 -2 -24 14 -32C10 -26 8 -18 9 -10C9 -4 6 0 4 2Z" fill="url(#${u}h)" stroke="#0b0916" stroke-width=".8"/>
        ${[0, 1, 2, 3].map((i) => `<path d="M${-5 + i * .6} ${-4 - i * 6}Q${2 + i} ${-3 - i * 6} ${7 - i * .3} ${-1 - i * 6.6}" stroke="#ffffff30" stroke-width=".7" fill="none"/>`).join("")}<circle class="fx-pulse" cx="13" cy="-31" r="2.6" fill="#ff3a4d" opacity=".6" filter="url(#${u}b)"/></g>`).join(""); break;
    case "o-couronne": defs += `<linearGradient id="${u}c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c8"/><stop offset=".5" stop-color="${c1}"/><stop offset="1" stop-color="#8a5a10"/></linearGradient>`;
      front = `<g transform="translate(${-HW + 10} ${-HH - 6}) rotate(-16)"><g class="fx-bob"><path d="M-17 7L-20 -11L-10 -2L0 -16L10 -2L20 -11L17 7Z" fill="url(#${u}c)" stroke="#6a400a" stroke-width=".9"/><rect x="-17.5" y="5" width="35" height="5" rx="1.5" fill="url(#${u}c)" stroke="#6a400a" stroke-width=".7"/>
        ${[[-20, -11, "#4dd6ff"], [0, -16, "#ff2e4d"], [20, -11, "#4dd6ff"]].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="2" fill="${c}" stroke="#fff8" stroke-width=".5"/>`).join("")}${[-9, 0, 9].map((x, i) => `<rect x="${x - 1.6}" y="6" width="3.2" height="3" rx=".6" fill="${["#5af2a0", "#ff2e4d", "#b072ff"][i]}"/>`).join("")}
        <g transform="translate(6 -6)"><g class="fx-tw">${FX_SPARK("#fff", 3.2)}</g></g></g></g>`; break;
    case "o-ailes": defs += `<linearGradient id="${u}w" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${c1}" stop-opacity=".95"/><stop offset="1" stop-color="${c1}" stop-opacity=".55"/></linearGradient>`; {
      const feather = (len, rot, w) => `<path transform="rotate(${rot})" d="M0 0C${f1x(len * .3)} ${f1x(-w)} ${f1x(len * .8)} ${f1x(-w * .7)} ${len} 0C${f1x(len * .8)} ${f1x(w * .5)} ${f1x(len * .3)} ${f1x(w * .6)} 0 0Z" fill="url(#${u}w)" stroke="${c1 < "#8" ? "#ffffff30" : "#00000025"}" stroke-width=".4"/>`;
      const wing = (sx) => `<g transform="translate(${sx * (HW - 6)} ${-HH + 22}) scale(${sx} 1)"><g class="fx-wing">${[[50, -50, 6], [56, -34, 7], [58, -18, 7], [52, -3, 7], [44, 12, 6], [34, 26, 5]].map(([l, r, w]) => feather(l, r, w)).join("")}${[[30, -40, 4.5], [34, -22, 4.5], [30, -6, 4]].map(([l, r, w]) => feather(l, r, w)).join("")}</g></g>`;
      back = `<g filter="url(#${u}b)" opacity=".5">${wing(-1)}${wing(1)}</g>${wing(-1)}${wing(1)}`; } break;

    // ===== Couvre-chefs japonais (ornements) : posés sur le haut de la carte =====
    case "o-kabuto": defs += `<linearGradient id="${u}k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a5a6a"/><stop offset=".45" stop-color="${c1}"/><stop offset="1" stop-color="#0a0a10"/></linearGradient>
        <linearGradient id="${u}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6c8"/><stop offset=".5" stop-color="${c2}"/><stop offset="1" stop-color="#6a400a"/></linearGradient>`;
      front = `<g transform="translate(0 ${-HH - 9}) scale(${SC})"><g class="fx-bob">
        ${[-1, 1].map((sx) => `<path d="M${sx * 15} -4C${sx * 22} -6 ${sx * 30} -4 ${sx * 33} 2L${sx * 30} 8C${sx * 26} 4 ${sx * 20} 3 ${sx * 15} 4Z" fill="url(#${u}k)" stroke="${c2}" stroke-width=".7"/>`).join("")}
        ${[0, 1, 2].map((i) => `<path d="M${-22 + i} ${2 + i * 3.4}Q0 ${8 + i * 3.4} ${22 - i} ${2 + i * 3.4}" stroke="${c2}" stroke-width="2.6" fill="none" opacity="${.9 - i * .15}"/>`).join("")}
        <path d="M-18 4C-18 -12 -9 -19 0 -19C9 -19 18 -12 18 4Z" fill="url(#${u}k)" stroke="#000" stroke-width=".6"/>
        ${[-12, -6, 0, 6, 12].map((x) => `<path d="M${x} -17.5Q${x * 1.2} -6 ${x * 1.25} 4" stroke="#ffffff26" stroke-width=".6" fill="none"/>`).join("")}
        <path d="M-20 4H20" stroke="${c2}" stroke-width="1.6"/>
        <g filter="url(#${u}b)" opacity=".7"><path d="M-3 -16C-10 -24 -20 -34 -26 -44C-18 -36 -9 -30 0 -22C9 -30 18 -36 26 -44C20 -34 10 -24 3 -16Z" fill="${c2}"/></g>
        <path d="M-3 -16C-10 -24 -20 -34 -26 -44C-18 -36 -9 -30 0 -22C9 -30 18 -36 26 -44C20 -34 10 -24 3 -16Z" fill="url(#${u}g)" stroke="#5a3a08" stroke-width=".6"/>
        <circle cy="-17" r="3.6" fill="url(#${u}g)" stroke="#5a3a08" stroke-width=".6"/><circle cy="-17" r="1.6" fill="#a8101e"/>
        <g transform="translate(-20 -40)"><g class="fx-tw">${FX_SPARK("#fff", 2.6)}</g></g></g></g>`; break;
    case "o-kasa": defs += `<linearGradient id="${u}s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a6a3a"/><stop offset=".45" stop-color="${c1}"/><stop offset="1" stop-color="#6a4a22"/></linearGradient>`;
      front = `<g transform="translate(${-HW * .25} ${-HH - 4}) rotate(-9) scale(${SC})"><g class="fx-bob">
        <ellipse cy="5" rx="34" ry="4" fill="#000" opacity=".35" filter="url(#${u}b)"/>
        <path d="M-36 4L0 -15L36 4Q0 9 -36 4Z" fill="url(#${u}s)" stroke="#4a3418" stroke-width=".7"/>
        ${Array.from({ length: 11 }, (_, i) => { const x = -32 + i * 6.4; return `<path d="M0 -15L${f1x(x)} ${f1x(4.6 - Math.abs(x) * .03)}" stroke="#4a3418" stroke-width=".45" opacity=".55"/>`; }).join("")}
        ${[0, 1, 2, 3].map((i) => `<path d="M${-30 + i * 7.5} ${f1x(1 - i * 3.9)}L${30 - i * 7.5} ${f1x(1 - i * 3.9)}" stroke="#4a3418" stroke-width=".35" opacity=".45" transform="scale(1 1)"/>`).join("")}
        <circle cy="-15" r="1.8" fill="#4a3418"/>
        <g class="fx-sway"><path d="M-8 6Q-10 18 -4 26M8 6Q10 18 4 26" stroke="${c2}" stroke-width="1" fill="none"/><circle cx="-4" cy="27" r="1.6" fill="${c2}"/><circle cx="4" cy="27" r="1.6" fill="${c2}"/></g></g></g>`; break;
    case "o-hachimaki": {
      const y = -HH - 3, tail = (dl, s2) => `<g transform="translate(${HW + 1} ${y})"><g class="fx-flag" style="animation-delay:${dl}s"><path d="M0 -3C8 -6 16 ${-2 + s2} 26 ${-6 + s2}L28 ${-1 + s2}C18 ${3 + s2} 9 1 0 3Z" fill="#f4f0e8" stroke="#c8c0b0" stroke-width=".4"/><path d="M14 ${-3 + s2 / 2}L24 ${-4 + s2}" stroke="${c1}" stroke-width=".8"/></g></g>`;
      back = tail(0, 0) + tail(-.4, 10);
      front = `<path d="M${-HW - 2} ${y - 4}Q0 ${y - 7} ${HW + 2} ${y - 4}L${HW + 2} ${y + 4}Q0 ${y + 1} ${-HW - 2} ${y + 4}Z" fill="#f4f0e8" stroke="#c8c0b0" stroke-width=".5"/>
        <path d="M${-HW - 2} ${y - 1}Q0 ${y - 4} ${HW + 2} ${y - 1}" stroke="#d8d0c0" stroke-width=".5" fill="none"/>
        <circle cy="${y - 1.6}" r="5.6" fill="${c1}" opacity=".5" filter="url(#${u}b)" class="fx-pulse"/><circle cy="${y - 1.6}" r="4.6" fill="${c1}"/>
        <text x="-15" y="${y + 1.6}" font-size="5.6" font-weight="900" fill="#1a1a1a" text-anchor="middle">必</text><text x="15" y="${y + 1.6}" font-size="5.6" font-weight="900" fill="#1a1a1a" text-anchor="middle">勝</text>`;
      break; }
    case "o-kitsune": defs += `<linearGradient id="${u}m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#e8e0e8"/></linearGradient>`;
      front = `<g transform="translate(${HW - 6} ${-HH - 2}) rotate(14) scale(${SC})"><g class="fx-bob">
        <circle r="17" fill="${c1}" opacity=".3" filter="url(#${u}b)" class="fx-pulse"/>
        <path d="M-12 -6L-15 -22L-4 -12ZM12 -6L15 -22L4 -12Z" fill="url(#${u}m)" stroke="#2a2030" stroke-width=".6"/><path d="M-11.5 -9L-13 -18L-7 -12ZM11.5 -9L13 -18L7 -12Z" fill="${c1}"/>
        <path d="M-13 -8C-13 -14 -7 -15 0 -15C7 -15 13 -14 13 -8C13 2 6 12 0 16C-6 12 -13 2 -13 -8Z" fill="url(#${u}m)" stroke="#2a2030" stroke-width=".7"/>
        <path d="M-10 -3Q-6 -6 -3 -3M10 -3Q6 -6 3 -3" stroke="${c1}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
        <path d="M-8.5 -1L-4 -.5M8.5 -1L4 -.5" stroke="#1a1018" stroke-width="1.2" stroke-linecap="round"/>
        <path d="M0 -12V-6" stroke="${c1}" stroke-width="1.4"/><circle cy="-13.5" r="1.4" fill="${c1}"/>
        <path d="M-2 11L0 13.5L2 11Z" fill="#1a1018"/><path d="M-6 6Q-9 9 -11 8M6 6Q9 9 11 8" stroke="${c1}" stroke-width=".9" fill="none"/>
        <g class="fx-sway"><path d="M12 -4Q20 4 18 18" stroke="${c2}" stroke-width="1" fill="none"/><path d="M15 16L21 16L18 26Z" fill="${c2}"/><circle cx="18" cy="16" r="2" fill="#ffd24d"/></g></g></g>`; break;
    case "o-kanzashi": {
      const fl = (x, y, r, c) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((a) => `<ellipse cy="${-r * .55}" rx="${f1x(r * .42)}" ry="${f1x(r * .6)}" fill="${c}" stroke="#fff6" stroke-width=".3" transform="rotate(${a})"/>`).join("")}<circle r="${f1x(r * .28)}" fill="#ffd24d"/></g>`;
      front = `<g transform="translate(${-HW + 8} ${-HH - 2}) rotate(-28) scale(${SC})">
        <path d="M0 0L34 0" stroke="#c9a23a" stroke-width="1.6" stroke-linecap="round"/><path d="M28 -1.4L36 0L28 1.4" fill="#c9a23a"/>
        ${fl(-2, -2, 9, c1)}${fl(-11, 5, 6.5, c2)}${fl(6, 6, 5.5, "#fff0f6")}
        ${[-10, -4, 2].map((x, i) => `<g transform="translate(${x} 9)"><g class="fx-swing2" style="animation-delay:${-i * .3}s"><path d="M0 0V${10 + i * 4}" stroke="#d8b04a" stroke-width=".5"/>${[3, 6, 9].map((yy) => `<circle cy="${yy + i * 1.3}" r=".8" fill="#ffe08a"/>`).join("")}<path d="M-2 ${11 + i * 4}L0 ${14.5 + i * 4}L2 ${11 + i * 4}Z" fill="${c1}"/></g></g>`).join("")}
        <g transform="translate(-8 -12)"><g class="fx-tw">${FX_SPARK("#fff", 2.2)}</g></g></g>`;
      break; }
    case "o-ronin": defs += `<linearGradient id="${u}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3a46"/><stop offset="1" stop-color="#0e0e14"/></linearGradient>`;
      front = `<g transform="translate(0 ${-HH + 3}) scale(${SC})"><g class="fx-bob">
        <path d="M-30 6Q0 -22 30 6Q0 1 -30 6Z" fill="url(#${u}r)" stroke="${c1}" stroke-width=".7"/>
        ${[-20, -10, 0, 10, 20].map((x) => `<path d="M0 -12Q${x * .6} -3 ${x * 1.3} ${4 + Math.abs(x) * .02}" stroke="${c1}" stroke-width=".4" fill="none" opacity=".45"/>`).join("")}
        <path d="M-26 4Q0 -2 26 4" stroke="${c1}" stroke-width="1.6" fill="none"/>
        <g filter="url(#${u}b)" opacity=".8"><ellipse cy="9" rx="20" ry="2" fill="${c1}"/></g></g></g>
        ${Array.from({ length: Q(6) }, () => fxP("fx-fall", (R() - .5) * 2 * HW, -HH, 4 + R() * 3, -R() * 7, FX_PETAL(c1, "#fff6"), (R() - .5) * 30, .6)).join("")}`; break;

    // ===== Particules (Atelier) : légères, pour ne jamais cacher le visage =====
    case "p-etincelles": front = Array.from({ length: 12 }, () => fxP("fx-rise", (R() - .5) * 2 * HW, HH - 4, 2 + R() * 2, -R() * 4, `<g class="fx-tw">${FX_SPARK(c1, 1.6 + R() * 1.4)}</g>`, (R() - .5) * 18)).join(""); break;
    case "p-flocons": front = Array.from({ length: 11 }, (_, i) => fxP("fx-fall", (R() - .5) * 2 * HW, -HH - 6, 5 + R() * 4, -R() * 9, `<g class="fx-spin">${FX_FLAKE(i % 3 ? c1 : "#fff")}</g>`, (R() - .5) * 20, .6 + R() * .6)).join(""); break;
    case "p-petales": front = Array.from({ length: 10 }, (_, i) => fxP("fx-fall", (R() - .5) * 2 * HW, -HH - 6, 4.5 + R() * 3, -R() * 8, `<g class="fx-flip">${FX_PETAL(c1, "#ff6fa3")}</g>`, (R() - .5) * 34, .7 + R() * .5)).join(""); break;
    case "p-braises": front = Array.from({ length: 14 }, (_, i) => fxP("fx-rise", (R() - .5) * 2 * HW, HH, 2.4 + R() * 2.4, -R() * 5, `<circle r="2.6" fill="${c1}" opacity=".35" filter="url(#${u}b)"/><circle class="fx-tw" r="${f1x(.6 + R() * .7)}" fill="${i % 3 ? "#ffd27a" : c1}"/>`, (R() - .5) * 24)).join(""); break;
    case "p-lucioles": front = Array.from({ length: 9 }, (_, i) => `<g transform="translate(${f1x((R() - .5) * 2 * HW)} ${f1x((R() - .5) * 2 * HH)})"><g class="fx-wander w${i % 3}" style="animation-delay:${f1x(-R() * 8)}s"><circle r="3.4" fill="${c1}" opacity=".35" filter="url(#${u}b)"/><circle class="fx-blink" style="animation-delay:${f1x(-R() * 3)}s" r="1.1" fill="#fbffd8"/></g></g>`).join(""); break;
    case "p-runes": {
      const G = ["ᚠ", "ᚱ", "ᛟ", "ᚨ", "ᛉ", "ᛞ", "ᚦ", "ᛗ"];
      front = `<g transform="translate(0 ${HH - 4}) scale(1 .3)"><g class="fx-spin slow"><circle r="30" fill="none" stroke="${c1}" stroke-width="1.2" opacity=".7"/><circle r="24" fill="none" stroke="${c1}" stroke-width=".6" stroke-dasharray="2 3" opacity=".8"/>${G.map((g, i) => `<text transform="rotate(${i * 45}) translate(0 -27)" text-anchor="middle" font-size="5" fill="${c1}">${g}</text>`).join("")}</g></g>
        <ellipse cx="0" cy="${HH - 4}" rx="30" ry="9" fill="${c1}" opacity=".18" filter="url(#${u}b)"/>`
        + Array.from({ length: 8 }, (_, i) => fxP("fx-rise", (R() - .5) * 50, HH - 6, 3 + R() * 2, -R() * 5, `<text text-anchor="middle" font-size="6" fill="${c1}" opacity=".9">${G[i]}</text>`, (R() - .5) * 10)).join(""); break; }
    default: return null;
  }
  const fixIds = (side, x) => (side === "back" || !back ? x : x.replace(/id="(fx\d+)/g, 'id="$1F').replace(/url\(#(fx\d+)/g, "url(#$1F"));
  if (RD) { const svgR = (inner, side) => inner ? `<svg class="dk fx fx-${k} ${side}" viewBox="-58 -58 116 116" aria-hidden="true"><defs>${fixIds(side, defs)}</defs>${fixIds(side, inner)}</svg>` : "";
    return { back: svgR(back, "back"), front: svgR(front, "front") }; }
  const svg = (inner, side) => inner ? `<span class="kc-dk fx ${side}" aria-hidden="true"><svg class="dk fx-${k}" viewBox="${-HW - 18} ${-HH - 18} ${2 * HW + 36} ${2 * HH + 36}" preserveAspectRatio="none"><defs>${side === "back" || !back ? defs : defs.replace(/id="(fx\d+)/g, 'id="$1F')}</defs>${side === "back" || !back ? inner : inner.replace(/url\(#(fx\d+)/g, "url(#$1F")}</svg></span>` : "";
  return { back: svg(back, "back"), front: svg(front, "front") };
}
// décoration de carte : les nouvelles (fx) ont deux couches, les anciennes une seule devant
function decoLayers(d) {
  if (!d) return { back: "", front: "" };
  return fxBuild(d.k, d.c1, d.c2 || d.c1) || { back: "", front: `<span class="kc-dk" aria-hidden="true">${decoSVG(d, "rect")}</span>` };
}
