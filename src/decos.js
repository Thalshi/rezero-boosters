// ===== Décorations d'avatar : dessins SVG animés autour de l'avatar (catalogue DECOS dans game.js) =====
// Repère : l'avatar est un disque de rayon 40 au centre d'une vue de -58 à 58 ; la décoration déborde tout autour.
let decoN = 0;
const DK_FLOWER = (x, y, r, c1, c2, rot = 0) => `<g transform="translate(${x} ${y}) rotate(${rot})">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="${-r * .55}" rx="${r * .42}" ry="${r * .6}" fill="${c1}" stroke="${c2}" stroke-width=".6" transform="rotate(${a})"/>`).join("")}<circle r="${r * .28}" fill="#ffd24d"/></g>`;
const DK_STAR = (x, y, r, c, i) => `<path class="tw" style="animation-delay:${-i * .37}s" d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z" fill="${c}"/>`;
const DK_SNOW = (r, c) => `<g stroke="${c}" stroke-width="1.1" stroke-linecap="round">${[0, 60, 120].map((a) => `<path d="M0 ${-r}V${r}" transform="rotate(${a})"/>`).join("")}</g>`;
const DK_HEART = (c) => `<path d="M0 3C-6 -2 -6 -7 -3 -8C-1.5 -8.6 0 -7.5 0 -6C0 -7.5 1.5 -8.6 3 -8C6 -7 6 -2 0 3Z" fill="${c}"/>`;
// éléments qui tombent ou montent : --x position, --d durée, --dl décalage (négatif = déjà en route)
const dkFall = (items, cls = "fall") => items.map(([x, d, dl, inner, s = 1]) => `<g class="${cls}" style="--x:${x}px;--d:${d}s;animation-delay:${dl}s"><g transform="scale(${s})">${inner}</g></g>`).join("");
// shape « round » : autour d'un avatar rond (rayon 40) ; « rect » : autour d'une carte (rectangle 72 × 104)
function decoSVG(d, shape = "round") {
  if (!d) return "";
  const u = "dk" + ++decoN, c1 = d.c1, c2 = d.c2 || d.c1, G = `url(#${u}g)`, R = shape === "rect";
  const HW = R ? 36 : 40, HH = R ? 52 : 40, TOP = HH - 40, SIDE = HW - 40, f1 = (n) => +n.toFixed(1);
  // le contour à « off » unités du bord, et un point du contour (t : degrés depuis le haut, sens horaire)
  const ring = (off, attrs) => R ? `<rect x="${-(HW + off)}" y="${-(HH + off)}" width="${2 * (HW + off)}" height="${2 * (HH + off)}" rx="${f1(7 + off * .4)}" ${attrs}/>` : `<circle r="${40 + off}" ${attrs}/>`;
  const at = (t, off) => { const a = (t - 90) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a); if (!R) return [f1(c * (40 + off)), f1(s * (40 + off))]; const w = HW + off, h = HH + off, k = Math.min(Math.abs(c) > 1e-6 ? w / Math.abs(c) : 1e9, Math.abs(s) > 1e-6 ? h / Math.abs(s) : 1e9); return [f1(c * k), f1(s * k)]; };
  const place = (t, off) => { const [x, y] = at(t, off); return `translate(${x} ${y}) rotate(${t})`; };
  const spin = (cls) => (R ? "flow" : "sp " + cls), sc = (x, y) => [f1(x * HW / 40), f1(y * HH / 40)];
  const grad = `<linearGradient id="${u}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient><filter id="${u}f" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2"/></filter>`;
  const glow = (inner) => `<g filter="url(#${u}f)" opacity=".85">${inner}</g>${inner}`;
  let b = "";
  switch (d.k) {
    case "anneau": b = `${ring(4, `fill="none" stroke="${G}" stroke-width="7" opacity=".35" filter="url(#${u}f)" class="pulse"`)}
      <g class="${spin("s8")}">${ring(4, `fill="none" stroke="${G}" stroke-width="3.6" stroke-linecap="round" stroke-dasharray="58 14 8 14"`)}</g>
      <g class="${spin("s14 rev")}">${ring(10, `fill="none" stroke="${c1}" stroke-opacity=".6" stroke-width="1.4" stroke-dasharray="3 9"`)}</g>`; break;
    case "glitch": b = `<g class="jit1">${ring(4, `fill="none" stroke="${c1}" stroke-width="3"`)}</g><g class="jit2">${ring(4, `fill="none" stroke="${c2}" stroke-width="3"`)}</g>
      ${[250, 80, 200, 20].map((t, i) => { const [x, y] = at(t, 10); return `<rect class="blink" style="animation-delay:${-i * .4}s" x="${x - 6}" y="${y}" width="${10 + i * 3}" height="3" fill="${i % 2 ? c1 : c2}"/>`; }).join("")}`; break;
    case "casque": { const cx = HW + 5, band = R ? `M${-cx} 0V${-HH + 6}Q${-cx} ${-HH - 4} ${-HW + 8} ${-HH - 4}H${HW - 8}Q${cx} ${-HH - 4} ${cx} ${-HH + 6}V0` : "M-43 -4A44 44 0 0 1 43 -4";
      b = `<path d="${band}" fill="none" stroke="${c2}" stroke-width="7" stroke-linecap="round"/><path d="${band}" fill="none" stroke="${c1}" stroke-width="1.6" class="pulse"/>
      ${[-1, 1].map((sx) => `<rect x="${sx * cx - 7}" y="-12" width="14" height="26" rx="5" fill="${c2}" stroke="${c1}" stroke-width="1.6"/><rect class="blink" x="${sx * cx - 3}" y="-4" width="6" height="10" rx="2" fill="${c1}"/>`).join("")}
      <path d="M${-cx} 12C${-cx} ${HH - 6} ${-cx + 12} ${HH + 4} -18 ${HH + 6}" fill="none" stroke="${c2}" stroke-width="3" stroke-linecap="round"/><circle cx="-16" cy="${HH + 6}" r="4" fill="${c1}" class="pulse"/>`; break; }
    case "kanji": b = `<g class="${R ? "" : "sp s16"}">${[...(d.txt || "光")].map((k, i, a) => { const [x, y] = at(i / a.length * 360 + 30, 10); return `<g transform="translate(${x} ${y})"><rect x="-8" y="-8" width="16" height="16" rx="4" fill="#0b0916" stroke="${i % 2 ? c2 : c1}" stroke-width="1.6"/><text y="4.5" text-anchor="middle" font-size="11" font-weight="700" fill="${i % 2 ? c2 : c1}">${k}</text></g>`; }).join("")}</g>
      ${ring(4, `fill="none" stroke="${c1}" stroke-opacity=".4" stroke-width="1.2"`)}`; break;
    case "sakura": b = `${[290, 312, 334, 356, 378].map((t, i) => { const [x, y] = at(t, 4), [lx, ly] = at(t + 6, 8); return `<ellipse cx="${lx}" cy="${ly}" rx="5" ry="2.2" fill="#5ad17a" transform="rotate(${t + 40} ${lx} ${ly})"/>${DK_FLOWER(x, y, i % 2 ? 7 : 9.5, c1, c2, t)}`; }).join("")}
      ${dkFall([[30, 5, -1, `<ellipse rx="3" ry="1.8" fill="${c1}"/>`], [46, 6.5, -3.5, `<ellipse rx="2.6" ry="1.6" fill="${c1}"/>`], [-10, 7, -5.5, `<ellipse rx="2.4" ry="1.5" fill="${c2}"/>`]])}`; break;
    case "petales": b = dkFall([[-44, 5, 0, ""], [-26, 6.2, -2.4, ""], [-6, 5.4, -4.1, ""], [14, 6.8, -1.3, ""], [34, 5.8, -3.3, ""], [50, 6.4, -5.2, ""], [-52, 7, -4.6, ""], [24, 7.4, -.6, ""]].map((x, i) => [x[0], x[1], x[2], `<ellipse rx="5" ry="3" fill="${i % 3 ? c1 : c2}" stroke="#ffffff55" stroke-width=".5"/>`, 1])); break;
    case "lanternes": b = [-1, 1].map((sx, i) => `<g class="swing" style="animation-delay:${-i * 1.1}s"><path d="M${sx * HW} ${-HH - 18}V${-HH - 4}" stroke="#2a1a10" stroke-width="1.2"/>
      <g transform="translate(${sx * HW} ${-HH + 6})"><rect x="-4.5" y="-11" width="9" height="3" rx="1" fill="${c2}"/><ellipse rx="8" ry="10" fill="${c1}"/><ellipse rx="8" ry="10" fill="url(#${u}l)"/><path d="M-4 -9.4C-6 -3 -6 3 -4 9.4M4 -9.4C6 -3 6 3 4 9.4M0 -10V10" stroke="#00000055" fill="none" stroke-width=".8"/><rect x="-4.5" y="8" width="9" height="3" rx="1" fill="${c2}"/><path d="M0 11V17" stroke="${c2}" stroke-width="1.2"/><circle class="pulse" r="12" fill="${c2}" opacity=".18"/></g></g>`).join("")
      + `<radialGradient id="${u}l"><stop offset="0" stop-color="#fff7c0" stop-opacity=".8"/><stop offset="1" stop-color="#fff7c0" stop-opacity="0"/></radialGradient>`; break;
    case "flammes": { const n = R ? 20 : 14; b = `<linearGradient id="${u}h" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
      ${Array.from({ length: n }, (_, i) => { const t = i / n * 360, s = (i % 2 ? .75 : 1.1) * (R ? .6 : 1); return `<g transform="${place(t, 1)}"><path class="flick" style="animation-delay:${-i * .17}s" d="M0 2C-6 -4 -4 -12 0 -${18 * s}C4 -12 6 -4 0 2Z" fill="url(#${u}h)"/></g>`; }).join("")}
      ${ring(2, `fill="none" stroke="${c1}" stroke-width="3" opacity=".6" filter="url(#${u}f)"`)}`; break; }
    case "eclairs": b = [35, 145, 215, 320].map((t, i) => `<g transform="${place(t, 7)} rotate(${-t + 15})"><path class="flash" style="animation-delay:${-i * .55}s" d="M2 -12L-5 1H0L-3 12L6 -2H1L4 -12Z" fill="${c1}" stroke="${c2}" stroke-width=".8"/></g>`).join("")
      + ring(4, `fill="none" stroke="${c1}" stroke-width="2" stroke-dasharray="2 6" class="pulse"`); break;
    case "cornes": b = `<g transform="translate(0 ${-TOP})">${[-1, 1].map((sx) => glow(`<path d="M${sx * 18} -36C${sx * 26} -50 ${sx * 40} -56 ${sx * 50} -54C${sx * 40} -50 ${sx * 32} -42 ${sx * 30} -30Z" fill="${c1}" stroke="${c2}" stroke-width="1.6"/>`)).join("")}</g>`; break;
    case "flocons": b = dkFall([[-44, 6, 0], [-22, 7.4, -2.5], [0, 6.6, -4.4], [20, 7.8, -1.2], [40, 6.2, -3.4], [52, 8, -5.6], [-34, 8.6, -6.8]].map(([x, dd, dl], i) => [x, dd, dl, DK_SNOW(i % 2 ? 4 : 5.5, i % 3 ? c1 : c2)])); break;
    case "lune": { const [mx, my] = R ? [HW - 4, -HH + 2] : [34, -36]; b = `<mask id="${u}m"><rect x="-80" y="-80" width="160" height="160" fill="#fff"/><circle cx="${mx + 8}" cy="${my - 6}" r="14" fill="#000"/></mask><g class="float">${glow(`<circle cx="${mx}" cy="${my}" r="17" fill="${c1}" mask="url(#${u}m)"/>`)}</g>
      ${[[-40, -34, 4.5], [-52, 6, 3.4], [48, 22, 4], [-16, -53, 3.2]].map(([x, y, r], i) => { const [X, Y] = sc(x, y); return DK_STAR(X, Y, r, c2, i); }).join("")}`; break; }
    case "etoiles": b = `<g class="${R ? "" : "sp s40"}">${[[0, -52, 6], [40, -34, 4.4], [52, 6, 4], [36, 40, 5], [-6, 53, 4], [-42, 34, 4.4], [-53, -4, 5.6], [-36, -40, 4]].map(([x, y, r], i) => { const [X, Y] = sc(x, y); return DK_STAR(X, Y, r, i % 2 ? c2 : c1, i); }).join("")}</g>`; break;
    case "bulles": b = dkFall([[-36, 6, 0], [-14, 7.2, -2.2], [10, 6.4, -4.1], [30, 7.6, -1.4], [46, 6.8, -3.2]].map(([x, dd, dl], i) => [x, dd, dl, `<circle r="${4.5 + i % 3 * 1.5}" fill="${c1}" fill-opacity=".15" stroke="${c1}" stroke-width=".9"/><circle cx="-1" cy="-1.2" r="1" fill="${c2}"/>`]), "rise"); break;
    case "runes": b = `${ring(3, `fill="none" stroke="${c1}" stroke-width="1.2" opacity=".7"`)}${ring(12, `fill="none" stroke="${c1}" stroke-width="1.2" opacity=".7"`)}
      <g class="${R ? "" : "sp s20"}">${Array.from({ length: R ? 22 : 16 }, (_, i) => `<g transform="${place(i * 360 / (R ? 22 : 16), 7.5)}"><path d="${["M-2 -2.5L2 2.5M2 -2.5L-2 0", "M0 -3V3M-2 -1H2", "M-2 2.5L0 -2.5L2 2.5", "M-2 -2.5H2L-2 2.5H2"][i % 4]}" stroke="${i % 3 ? c1 : c2}" stroke-width="1.2" fill="none" stroke-linecap="round"/></g>`).join("")}</g>
      ${ring(7.5, `fill="none" stroke="${c1}" stroke-width="7" opacity=".14" filter="url(#${u}f)" class="pulse"`)}`; break;
    case "sceau": { const hex = (r) => Array.from({ length: 6 }, (_, i) => { const a = (i * 60 - 90) * Math.PI / 180; return `${f1(Math.cos(a) * r)} ${f1(Math.sin(a) * r)}`; }).join(" L");
      const dots = R ? [0, 90, 180, 270, 45, 135, 225, 315].map((t) => at(t, 13)) : Array.from({ length: 6 }, (_, i) => { const a = (i * 60 - 90) * Math.PI / 180; return [f1(Math.cos(a) * 53), f1(Math.sin(a) * 53)]; });
      b = `<g class="${R ? "" : "sp s24"}">${glow(R ? ring(13, `fill="none" stroke="${c1}" stroke-width="1.8"`) : `<path d="M${hex(53)}Z" fill="none" stroke="${c1}" stroke-width="1.8"/>`)}${dots.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.4" fill="${c2}"/>`).join("")}</g>
        <g class="${spin("s32 rev")}">${R ? ring(7, `fill="none" stroke="${c2}" stroke-width="1" stroke-dasharray="4 4"`) : `<path d="M${hex(47)}Z" fill="none" stroke="${c2}" stroke-width="1" stroke-dasharray="4 4"/>`}</g>`; break; }
    case "orbite": b = R ? `<g class="flow">${ring(8, `fill="none" stroke="${G}" stroke-width="1.6" stroke-dasharray="40 30" stroke-linecap="round"`)}</g>${[20, 140, 260].map((t, i) => { const [x, y] = at(t, 8); return glow(`<circle class="pulse" cx="${x}" cy="${y}" r="${i ? 3.4 : 4.6}" fill="${i % 2 ? c2 : c1}"/>`); }).join("")}`
      : `<g class="sp s4"><circle r="48" fill="none" stroke="${G}" stroke-width="1.6" stroke-dasharray="40 260" stroke-linecap="round"/>${[0, 120, 240].map((a, i) => `<g transform="rotate(${a})">${glow(`<circle cy="-48" r="${i ? 3.4 : 4.6}" fill="${i % 2 ? c2 : c1}"/>`)}</g>`).join("")}</g>`; break;
    case "aureole": b = `<g class="float">${glow(`<ellipse cy="${-HH - 12}" rx="24" ry="6.5" fill="none" stroke="${c1}" stroke-width="3.2"/>`)}<ellipse cy="${-HH - 12}" rx="24" ry="6.5" fill="none" stroke="${c2}" stroke-width="1"/></g>`; break;
    case "ailes": b = [-1, 1].map((sx) => `<g transform="translate(${sx * SIDE} ${R ? -10 : 0})"><g class="flap ${sx < 0 ? "l" : "r"}">${glow(`<path d="M${sx * 36} -8C${sx * 50} -40 ${sx * 66} -44 ${sx * 70} -40C${sx * 62} -34 ${sx * 66} -26 ${sx * 70} -20C${sx * 60} -18 ${sx * 64} -8 ${sx * 66} 0C${sx * 56} 0 ${sx * 56} 8 ${sx * 56} 14C${sx * 46} 10 ${sx * 40} 6 ${sx * 38} 10Z" fill="${c1}" stroke="${c2}" stroke-width="1.2"/>`)}</g></g>`).join(""); break;
    case "couronne": b = `<g transform="${R ? `translate(-8 ${-HH - 8}) rotate(-14)` : "rotate(-14) translate(0 -50)"}"><g class="float">${glow(`<path d="M-17 8L-20 -10L-9 -1L0 -15L9 -1L20 -10L17 8Z" fill="${G}" stroke="#7a4a10" stroke-width="1"/>`)}
      ${[-9, 0, 9].map((x, i) => `<circle class="tw" style="animation-delay:${-i * .5}s" cx="${x}" cy="3.5" r="2.2" fill="${c2}"/>`).join("")}</g></g>`; break;
    case "chat": b = `<g transform="translate(0 ${-TOP})">${[-1, 1].map((sx) => `<g class="${sx > 0 ? "twitch" : ""}"><path d="M${sx * 14} -38L${sx * 30} -60L${sx * 38} -28Z" fill="${c1}" stroke="#0b0916" stroke-width="1.4" stroke-linejoin="round"/><path d="M${sx * 20} -36L${sx * 29} -51L${sx * 33} -32Z" fill="${c2}"/></g>`).join("")}</g>`; break;
    case "coeurs": b = dkFall([[28, 3.6, 0], [42, 4.2, -1.4], [16, 4.8, -2.6], [50, 3.9, -3.2]].map(([x, dd, dl], i) => [x, dd, dl, DK_HEART(i % 2 ? c2 : c1), i % 2 ? .8 : 1.1]), "rise"); break;
    case "sueur": b = [[34, -40, 1.2, 0], [44, -26, .9, -.8]].map(([x, y, s2, dl]) => { const [X, Y] = sc(x, y); return `<g class="drip" style="animation-delay:${dl}s"><path transform="translate(${X} ${Y}) scale(${s2})" d="M0 -7C3 -2 5 1 5 3.5A5 5 0 0 1 -5 3.5C-5 1 -3 -2 0 -7Z" fill="${c1}" stroke="${c2}" stroke-width=".8"/></g>`; }).join(""); break;
    case "colere": { const [X, Y] = sc(34, -38); b = `<g transform="translate(${X} ${Y})"><g class="throb">${[0, 90, 180, 270].map((a) => `<path transform="rotate(${a})" d="M2.5 -10Q2.5 -2.5 10 -2.5" fill="none" stroke="${c1}" stroke-width="3.2" stroke-linecap="round"/>`).join("")}</g></g>
      ${ring(4, `fill="none" stroke="${c1}" stroke-width="2" opacity=".35" class="pulse"`)}`; break; }
    case "citrouille": { const [X, Y] = sc(38, 38); b = `<g transform="translate(${X} ${Y})"><g class="float"><path d="M0 -13C1 -18 4 -19 6 -19" stroke="#3a7a2a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      ${[-8, 0, 8].map((x) => `<ellipse cx="${x}" cy="0" rx="${x ? 8 : 9}" ry="12" fill="${c1}" stroke="#7a3a08" stroke-width=".8"/>`).join("")}
      <g class="flick2" fill="${c2}"><path d="M-7 -4L-3 -4L-5 -8Z"/><path d="M3 -4L7 -4L5 -8Z"/><path d="M-8 3Q0 9 8 3L5 5L2 3L0 6L-2 3L-5 5Z"/></g></g></g>`; break; }
    case "bonnet": b = `<g transform="${R ? `translate(${-HW + 12} ${-HH - 2}) rotate(-22)` : "rotate(-22) translate(-4 -50)"}"><path d="M-22 6C-16 -14 2 -24 22 -16C14 -10 10 -2 18 6Z" fill="${c1}"/><rect x="-24" y="2" width="44" height="8" rx="4" fill="${c2}"/><g class="bounce"><circle cx="24" cy="-16" r="5" fill="${c2}"/></g></g>`; break;
    case "confettis": b = dkFall(Array.from({ length: 12 }, (_, i) => [-50 + i * 9, 3.6 + (i % 4) * .6, -i * .45, `<rect class="spin2" x="-2" y="-1" width="4" height="2.2" fill="${[c1, c2, "#ffd24d"][i % 3]}"/>`])); break;
    default: b = ring(4, `fill="none" stroke="${c1}" stroke-width="3"`);
  }
  const vb = R ? `${-(HW + 18)} ${-(HH + 18)} ${2 * HW + 36} ${2 * HH + 36}` : "-58 -58 116 116";
  return `<svg class="dk dk-${d.k} ${R ? "rect" : ""}" viewBox="${vb}" ${R ? 'preserveAspectRatio="none"' : ""} aria-hidden="true"><defs>${grad}</defs>${b}</svg>`;
}
// décoration portée par un joueur (la sienne vient de sa sauvegarde, celle des autres de leur profil public)
// (la même décoration se porte autour de l'avatar et se pose sur les cartes)
function decoOfUid(uid) {
  const id = uid === ME || uid === "moi" ? save.cos?.deco : (shared.players || []).find((p) => p.uid === uid)?.deco;
  return id ? DECO_BY_ID[id] : null;
}
// décoration autour d'un avatar : les effets (fx.js) ont une couche derrière la photo et une devant ;
// lite : version allégée pour les listes (classement, chat), où beaucoup d'avatars s'affichent à la fois
function avDecoHTML(d, lite = true) {
  if (!d) return { back: "", front: "" };
  return (typeof fxBuild === "function" && fxBuild(d.k, d.c1, d.c2 || d.c1, "round", lite)) || { back: "", front: decoSVG(d) };
}
// un avatar avec sa décoration (même rendu que av(), entouré)
const avd = (uid, cls = "", d = undefined, lite = true) => { const dd = d === undefined ? decoOfUid(uid) : d; if (!dd) return av(uid, cls); const L = avDecoHTML(dd, lite); return `<span class="avd">${L.back}${av(uid, cls)}${L.front}</span>`; };
