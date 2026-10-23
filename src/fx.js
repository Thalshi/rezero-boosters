// ===== Effets de cartes : décorations spectaculaires, ornements et particules =====
// Repère commun avec decoSVG(d, "rect") : la carte va de (-36, -52) à (36, 52), la vue déborde de 18 tout autour.
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
function fxDragon(u, c1, c2, rx, ry, T, belly = "#fff3c4") {
  const N = 52, path = fxOrbit(rx, ry), dt = .03 * T / 7, mot = (i) => `<animateMotion dur="${T}s" repeatCount="indefinite" rotate="auto" begin="${f1x(-(N + 4 - i) * dt)}s" path="${path}"/>`;
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
function fxBuild(k, c1, c2) {
  const u = "fx" + ++fxN, HW = FX_HW, HH = FX_HH, R = fxRand(k.length * 977 + c1.length * 31 + (c1.charCodeAt(1) || 7));
  let defs = fxGlow(u), back = "", front = "";
  switch (k) {
    // ===== Dragons qui volent autour de la carte =====
    case "dragon": case "dragon2": {
      const tilt = -14, rx = HW + 17, ry = HH + 10, T = k === "dragon2" ? 6.2 : 7;
      defs += fxDragonDefs(u, c1, c2) + fxFrontMask(u, tilt);
      const orbit = `<g transform="rotate(${tilt})">${fxDragon(u, c1, c2, rx, ry, T)}</g>`;
      const clouds = [[-HW - 6, HH - 4, 1], [HW + 4, -HH + 8, -1]].map(([x, y, sx], i) => `<g transform="translate(${x} ${y}) scale(${sx} 1)"><g class="fx-bob" style="animation-delay:${-i * 1.3}s"><path d="M-12 2C-14 -3 -8 -6 -5 -3C-4 -8 4 -8 5 -3C8 -6 14 -3 12 2Z" fill="${c1}" opacity=".22"/><path d="M-9 1C-8 -2 -5 -3 -3 -1M2 -2C4 -4 7 -3 8 0" stroke="${c1}" stroke-width=".8" fill="none" opacity=".8"/></g></g>`).join("");
      back = `<rect x="${-HW - 6}" y="${-HH - 6}" width="${2 * HW + 12}" height="${2 * HH + 12}" rx="10" fill="${c1}" opacity=".18" filter="url(#${u}b)" class="fx-pulse"/>${orbit}`;
      front = `<g mask="url(#${u}m)">${orbit}</g>${clouds}`;
      break;
    }
    // ===== Katanas croisés derrière la carte, reflets sur les lames et coups de lame =====
    case "katanas": {
      defs += `<linearGradient id="${u}s" x1="0" y1="-1" x2="0" y2="1"><stop offset="0" stop-color="#f4f7fb"/><stop offset=".5" stop-color="#aab3c2"/><stop offset="1" stop-color="#5a6272"/></linearGradient>
        <linearGradient id="${u}g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`;
      back = [1, -1].map((sx) => `<g transform="scale(${sx} 1) translate(-62 84) rotate(-57)">${fxKatana(u + (sx > 0 ? "a" : "c"), 172, c2, "#fff")}</g>`).join("")
        .replace(/url\(#(fx\d+)[ac]s\)/g, "url(#$1s)").replace(/url\(#(fx\d+)[ac]g\)/g, "url(#$1g)");
      const slash = (d, i) => `<g class="fx-slash" style="animation-delay:${-i * 1.4}s"><path d="${d}" stroke="${c1}" stroke-width="6" fill="none" opacity=".5" filter="url(#${u}b)" pathLength="100"/><path d="${d}" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round" pathLength="100"/></g>`;
      front = slash(`M${-HW - 14} ${-HH + 10}Q0 -6 ${HW + 14} ${HH - 22}`, 0) + slash(`M${HW + 14} ${-HH + 26}Q4 4 ${-HW - 14} ${HH - 8}`, 1)
        + Array.from({ length: 7 }, (_, i) => fxP("fx-fall", -HW + R() * 2 * HW, -HH - 14, 4.5 + R() * 3, -R() * 7, FX_PETAL("#ffb3cf", "#ff6fa3"), (R() - .5) * 30, .9)).join("");
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
        for (let y = HH; y >= -HH; y -= 9) for (const sx of [-1, 1]) s += tongue(sx * (HW + 1), y, (14 + R() * 10) * sc, 6 * sc, fill, i++, cls);
        for (let x = -HW; x <= HW; x += 8) s += tongue(x, -HH + 2, (20 + R() * 14) * sc, 6 * sc, fill, i++, cls);
        return s; };
      back = `<rect x="${-HW - 4}" y="${-HH - 8}" width="${2 * HW + 8}" height="${2 * HH + 12}" rx="10" fill="${c1}" opacity=".45" filter="url(#${u}b)" class="fx-pulse"/>
        <g filter="url(#${u}t)">${ring(`url(#${u}f)`, 1.15)}${ring(`url(#${u}y)`, .65)}</g>`;
      let bot = ""; for (let x = -HW + 2; x <= HW - 2; x += 7) bot += tongue(x, HH + 3, 7 + R() * 7, 4.5, `url(#${u}f)`, x + 40);
      front = `<g filter="url(#${u}t)" opacity=".9">${bot}</g>`
        + Array.from({ length: 14 }, (_, i) => fxP("fx-rise", -HW - 8 + R() * (2 * HW + 16), HH, 2.2 + R() * 2.2, -R() * 4, `<circle r="${f1x(.6 + R() * .9)}" fill="${i % 3 ? c1 : "#fff3b0"}"/><circle r="2.2" fill="${c1}" opacity=".3"/>`, (R() - .5) * 26)).join("");
      break;
    }
    // ===== Néon de Shinjuku : tubes qui grésillent, enseigne en kanji, pluie =====
    case "neon": case "neon2": {
      const tube = (off, c, w, extra = "") => `<rect x="${-HW - off}" y="${-HH - off}" width="${2 * (HW + off)}" height="${2 * (HH + off)}" rx="${7 + off * .5}" fill="none" stroke="${c}" stroke-width="${w}" ${extra}/>`;
      const lit = (inner, cls = "") => `<g class="${cls}"><g filter="url(#${u}b)" opacity=".9">${inner}</g>${inner}</g>`;
      const sx = HW + 13, sign = (txt, x, y, c, cls) => `<g transform="translate(${x} ${y})"><rect x="-6.5" y="-15" width="13" height="30" rx="2.5" fill="#07060fcc" stroke="#ffffff22" stroke-width=".6"/>${lit(`<rect x="-5" y="-13.5" width="10" height="27" rx="2" fill="none" stroke="${c}" stroke-width=".7"/>${[...txt].map((ch, i) => `<text y="${-4 + i * 11}" text-anchor="middle" font-size="9" font-weight="800" fill="none" stroke="${c}" stroke-width=".7">${ch}</text>`).join("")}`, cls)}<path d="M-6.5 -10H${-sx + HW + 4}M-6.5 10H${-sx + HW + 4}" stroke="#6a6f80" stroke-width=".8"/></g>`;
      back = `<rect x="${-HW - 10}" y="${-HH - 10}" width="${2 * HW + 20}" height="${2 * HH + 20}" rx="14" fill="${c1}" opacity=".22" filter="url(#${u}b)" class="fx-pulse"/>`;
      front = lit(tube(4, c1, 1.6, `stroke-dasharray="150 8 60 6 400"`), "fx-hum") + lit(tube(9, c2, 1.1, `stroke-dasharray="26 ${2 * HW + 2 * HH} 26 0"`), "fx-neonflick")
        + `<circle r="1.6" fill="#fff"><animateMotion dur="3.2s" repeatCount="indefinite" path="M${-HW - 4} ${-HH + 3}V${HH - 3}Q${-HW - 4} ${HH + 4} ${-HW + 3} ${HH + 4}H${HW - 3}Q${HW + 4} ${HH + 4} ${HW + 4} ${HH - 3}V${-HH + 3}Q${HW + 4} ${-HH - 4} ${HW - 3} ${-HH - 4}H${-HW + 3}Q${-HW - 4} ${-HH - 4} ${-HW - 4} ${-HH + 3}"/></circle>`
        + sign(k === "neon2" ? "電脳" : "新宿", sx, -18, c2, "fx-neonflick b") + sign(k === "neon2" ? "夜" : "QG", -sx, 22, c1, "fx-hum")
        + Array.from({ length: 16 }, () => fxP("fx-rain", -HW - 16 + R() * (2 * HW + 32), -HH - 20, .6 + R() * .5, -R() * 2, `<path d="M0 0L-2 9" stroke="${R() > .5 ? c1 : c2}" stroke-width=".5" opacity=".55"/>`)).join("");
      break;
    }
    // ===== Tempête de foudre : éclairs qui frappent la carte, arc électrique sur le bord =====
    case "foudre": {
      const bolt = (x0, y0, x1, y1) => { let s = `M${x0} ${y0}`, br = ""; for (let i = 1; i <= 6; i++) { const t = i / 6, x = x0 + (x1 - x0) * t + (i < 6 ? (R() - .5) * 12 : 0), y = y0 + (y1 - y0) * t + (i < 6 ? (R() - .5) * 6 : 0); s += `L${f1x(x)} ${f1x(y)}`; if (i === 3) br = `M${f1x(x)} ${f1x(y)}l${f1x((R() - .5) * 16)} ${f1x(6 + R() * 8)}l${f1x((R() - .5) * 8)} ${f1x(4 + R() * 6)}`; } return s + br; };
      const strikes = [[-HW - 20, -HH - 26, -HW + 6, -HH], [HW + 22, -HH - 10, HW, -12], [-HW - 22, 14, -HW, HH - 10], [HW + 12, HH + 22, 10, HH], [8, -HH - 30, -4, -HH]];
      const zap = strikes.map(([a, b, c, d], i) => `<g class="fx-strike" style="animation-delay:${f1x(-i * .73)}s"><path d="${bolt(a, b, c, d)}" stroke="${c2}" stroke-width="3.4" fill="none" filter="url(#${u}b)"/><path d="${bolt(a, b, c, d)}" stroke="#fff" stroke-width="1" fill="none" stroke-linejoin="bevel"/><circle cx="${c}" cy="${d}" r="5" fill="${c1}" opacity=".7" filter="url(#${u}b)"/></g>`).join("");
      const arc = (j) => { let s = ""; const n = 40; for (let i = 0; i <= n; i++) { const t = i / n * 2 * Math.PI, ex = Math.cos(t), ey = Math.sin(t), kx = Math.min(1, Math.abs(1 / ex) * .0001 + 1), x = Math.max(-1, Math.min(1, ex * 1.6)) * (HW + 3), y = Math.max(-1, Math.min(1, ey * 1.4)) * (HH + 3); s += `${i ? "L" : "M"}${f1x(x + (R() - .5) * 3 * kx)} ${f1x(y + (R() - .5) * 3)}`; } return `<path class="fx-arc a${j}" d="${s}Z" stroke="${c1}" stroke-width=".8" fill="none"/>`; };
      back = `<rect x="${-HW - 8}" y="${-HH - 8}" width="${2 * HW + 16}" height="${2 * HH + 16}" rx="12" fill="${c2}" opacity=".35" filter="url(#${u}b)" class="fx-storm"/>`;
      front = `<g filter="url(#${u}b)" opacity=".6">${arc(0)}</g>${arc(0)}${arc(1)}${arc(2)}${zap}`
        + Array.from({ length: 8 }, (_, i) => fxP("fx-spark", (R() - .5) * (2 * HW + 10), (R() > .5 ? -1 : 1) * (HH + 2), .9 + R(), -R() * 2, FX_SPARK(i % 2 ? "#fff" : c1, 2.2), (R() - .5) * 20)).join("");
      break;
    }
    // ===== Phénix : ailes de feu qui battent derrière la carte, queue et braises =====
    case "phenix": {
      defs += `<linearGradient id="${u}w" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${c2}"/><stop offset=".55" stop-color="${c1}"/><stop offset="1" stop-color="#fff3b0"/></linearGradient>`;
      const feather = (len, rot, w) => `<path transform="rotate(${rot})" d="M0 0C${f1x(len * .3)} ${f1x(-w)} ${f1x(len * .8)} ${f1x(-w * .7)} ${len} 0C${f1x(len * .8)} ${f1x(w * .5)} ${f1x(len * .3)} ${f1x(w * .6)} 0 0Z" fill="url(#${u}w)" stroke="#fff6" stroke-width=".3"/>`;
      const wing = (sx) => `<g transform="translate(${sx * (HW - 6)} ${-HH + 18}) scale(${sx} 1)"><g class="fx-wing">${[[64, -58, 7], [70, -40, 8], [72, -22, 8], [66, -5, 8], [56, 12, 7], [44, 28, 6], [32, 44, 5]].map(([l, r, w]) => feather(l, r, w)).join("")}
        ${[[38, -50, 5], [42, -30, 5], [40, -12, 5], [32, 6, 4]].map(([l, r, w]) => feather(l, r, w).replace(`url(#${u}w)`, c2)).join("")}</g></g>`;
      back = `<g filter="url(#${u}b)" opacity=".55">${wing(-1)}${wing(1)}</g>${wing(-1)}${wing(1)}
        <g transform="translate(0 ${HH - 6})">${[-24, -10, 0, 10, 24].map((r, i) => `<g class="fx-tail" style="animation-delay:${-i * .3}s">${feather(46 - Math.abs(r) * .6, 90 + r, 5)}</g>`).join("")}</g>
        <g transform="translate(0 ${-HH - 4})"><g class="fx-bob"><path d="M-6 6C-6 -2 -2 -8 4 -8C8 -8 10 -6 12 -4L8 -3C9 0 6 4 4 6Z" fill="url(#${u}w)"/>${[-10, -4, 2].map((x, i) => `<path class="fx-flame" style="animation-delay:${-i * .2}s" d="M${x} -6C${x - 2} -12 ${x + 1} -16 ${x + 4} -20C${x + 4} -14 ${x + 6} -10 ${x + 4} -6Z" fill="${c1}"/>`).join("")}<circle cx="5" cy="-4.4" r=".9" fill="#fff"/></g></g>`;
      front = Array.from({ length: 12 }, (_, i) => fxP("fx-rise", (R() - .5) * (2 * HW + 30), HH + 4, 2.4 + R() * 2, -R() * 4, `<circle r="${f1x(.6 + R())}" fill="${i % 2 ? c1 : "#fff3b0"}"/><circle r="2.4" fill="${c1}" opacity=".3"/>`, (R() - .5) * 30)).join("");
      break;
    }
    // ===== Tempête de sakura : un tourbillon de pétales et une branche en fleur =====
    case "tempete": {
      const tilt = 12; defs += fxFrontMask(u, tilt);
      const swirl = `<g transform="rotate(${tilt})">${Array.from({ length: 22 }, (_, i) => { const rx = HW + 8 + R() * 14, ry = HH + 4 + R() * 12, T = 4 + R() * 3;
        return `<g><animateMotion dur="${f1x(T)}s" repeatCount="indefinite" rotate="auto" begin="${f1x(-R() * T)}s" path="${fxOrbit(f1x(rx), f1x(ry))}"/><g class="fx-flip" style="animation-delay:${f1x(-R() * 2)}s"><g transform="scale(${f1x(.8 + R() * .6)})">${FX_PETAL(i % 3 ? c1 : "#fff0f6", c2)}</g></g></g>`; }).join("")}</g>`;
      const flower = (x, y, r) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((a) => `<ellipse cy="${-r * .55}" rx="${f1x(r * .42)}" ry="${f1x(r * .6)}" fill="${c1}" stroke="${c2}" stroke-width=".4" transform="rotate(${a})"/>`).join("")}<circle r="${f1x(r * .26)}" fill="#ffd24d"/></g>`;
      back = swirl;
      front = `<g mask="url(#${u}m)">${swirl}</g><g transform="translate(${-HW - 10} ${-HH - 6})"><g class="fx-sway"><path d="M0 0C10 4 18 8 30 6C36 5 42 8 50 14M14 4C16 10 22 14 28 14M30 6C34 0 40 -2 46 0" stroke="#4a2a1a" stroke-width="2.2" fill="none" stroke-linecap="round"/>${flower(14, 3, 6)}${flower(28, 14, 5)}${flower(33, 4, 7)}${flower(46, 0, 5)}${flower(50, 14, 6)}</g></g>`;
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
  const svg = (inner, side) => inner ? `<span class="kc-dk fx ${side}" aria-hidden="true"><svg class="dk fx-${k}" viewBox="${-HW - 18} ${-HH - 18} ${2 * HW + 36} ${2 * HH + 36}" preserveAspectRatio="none"><defs>${side === "back" || !back ? defs : defs.replace(/id="(fx\d+)/g, 'id="$1F')}</defs>${side === "back" || !back ? inner : inner.replace(/url\(#(fx\d+)/g, "url(#$1F")}</svg></span>` : "";
  return { back: svg(back, "back"), front: svg(front, "front") };
}
// décoration de carte : les nouvelles (fx) ont deux couches, les anciennes une seule devant
function decoLayers(d) {
  if (!d) return { back: "", front: "" };
  return fxBuild(d.k, d.c1, d.c2 || d.c1) || { back: "", front: `<span class="kc-dk" aria-hidden="true">${decoSVG(d, "rect")}</span>` };
}
