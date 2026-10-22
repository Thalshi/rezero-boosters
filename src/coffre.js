// ===== Coffre arcanique : scène 3D, clé, et lecteur de scénarios =====
// Les cartes et le scénario viennent du serveur (src/game.js : pickScenarioS) ; ici on ne fait que les mettre en scène.
// Un scénario = une suite de temps forts (CHEST_BEATS). Une feinte ne montre jamais un faux résultat : elle retarde la vraie couleur.
const Coffre = (() => {
  // clé ouvragée : anneau à gemme, tige gravée, panneton taillé (le panneton est à droite : c'est lui qui entre dans la serrure)
  const KEY_SVG = `<svg viewBox="0 0 170 56" aria-hidden="true"><defs><linearGradient id="cfkg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4cf"/><stop offset=".45" stop-color="#e8c77e"/><stop offset="1" stop-color="#7a5620"/></linearGradient><radialGradient id="cfkc" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#7ff3ff"/><stop offset="1" stop-color="#0a5a73"/></radialGradient></defs>
  <g fill="none" stroke="url(#cfkg)" stroke-linecap="round"><circle cx="28" cy="28" r="19" stroke-width="5"/><circle cx="28" cy="28" r="12.5" stroke-width="1.5" opacity=".8"/><path d="M28 4C22 0 16 4 18 9M28 4C34 0 40 4 38 9M28 52C22 56 16 52 18 47M28 52C34 56 40 52 38 47" stroke-width="2"/><path d="M5 28C1 22 5 17 9 19M5 28C1 34 5 39 9 37" stroke-width="2"/></g>
  <path d="M28 18l7 10-7 10-7-10z" fill="url(#cfkc)" stroke="#fff6" stroke-width=".8"/><rect x="46" y="24.5" width="96" height="7" rx="2" fill="url(#cfkg)" stroke="#5a4214" stroke-width=".8"/><path d="M54 28h80" stroke="#5a4214" stroke-width=".8" stroke-dasharray="3 4"/>
  <rect x="46" y="21" width="6" height="14" rx="1.5" fill="url(#cfkg)" stroke="#5a4214" stroke-width=".8"/><rect x="70" y="22" width="4" height="12" rx="1" fill="url(#cfkg)" stroke="#5a4214" stroke-width=".6"/>
  <path d="M134 31v13h6v-5h5v7h6v-10h5v8h6v-13z" fill="url(#cfkg)" stroke="#5a4214" stroke-width=".8"/><circle cx="162" cy="28" r="4" fill="url(#cfkg)" stroke="#5a4214" stroke-width=".8"/></svg>`;
  const CROWN = `<svg viewBox="0 0 60 40" aria-hidden="true"><path d="M4 34L8 8l12 14L30 4l10 18L52 8l4 26z" fill="#f5c518" stroke="#7d5a1c" stroke-width="2"/></svg>`;
  const RUNES = ["召", "零", "界", "悪", "友", "匠", "魂", "門"];
  // coffre détaillé (SVG) : bois laqué, ferrures dorées, volutes, sceau à runes qui tourne, lumière dans la fente.
  // La lumière, la gemme et les runes prennent la couleur montrée par le scénario (--rare).
  const chestHTML = () => `<div class="ch2" id="cfChest"><svg viewBox="0 0 320 270" role="img" aria-label="Coffre arcanique scellé">
    <defs><linearGradient id="chW" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1d4d"/><stop offset=".55" stop-color="#160f2c"/><stop offset="1" stop-color="#0b0818"/></linearGradient>
      <linearGradient id="chWS" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#120c25"/><stop offset="1" stop-color="#07050f"/></linearGradient>
      <linearGradient id="chG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1c2"/><stop offset=".35" stop-color="#e8c77e"/><stop offset=".7" stop-color="#b48a3c"/><stop offset="1" stop-color="#6e4c18"/></linearGradient>
      <linearGradient id="chGH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a6420"/><stop offset=".5" stop-color="#f6dc9b"/><stop offset="1" stop-color="#8a6420"/></linearGradient>
      <radialGradient id="chSeal" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#3a2a64"/><stop offset="1" stop-color="#120c25"/></radialGradient>
      <radialGradient id="chGem" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".3" class="ch-rare"/><stop offset="1" stop-color="#1a0c30"/></radialGradient>
      <linearGradient id="chSeam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" class="ch-rare"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <pattern id="chGrain" width="8" height="40" patternUnits="userSpaceOnUse"><path d="M2 0C4 10 0 20 2 40M6 0C8 14 5 26 6 40" stroke="#ffffff0d" fill="none"/></pattern>
      <filter id="chGlow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <symbol id="chCurl" viewBox="0 0 40 24"><path d="M2 22C2 8 14 2 22 6C30 10 26 20 19 18C14 16 16 10 21 11" fill="none" stroke="url(#chG)" stroke-width="2" stroke-linecap="round"/><circle cx="21" cy="11" r="1.6" fill="#f6dc9b"/></symbol></defs>
    <ellipse cx="160" cy="250" rx="128" ry="12" fill="#000" opacity=".55"/>
    <g class="ch2-float">
      <path d="M282 132L300 120L300 222L282 240Z" fill="url(#chWS)" stroke="#e8c77e55"/>
      <rect x="38" y="132" width="244" height="108" rx="6" fill="url(#chW)"/><rect x="38" y="132" width="244" height="108" rx="6" fill="url(#chGrain)"/>
      <rect x="38" y="132" width="244" height="108" rx="6" fill="none" stroke="url(#chG)" stroke-width="3"/><rect x="46" y="140" width="228" height="92" rx="3" fill="none" stroke="#e8c77e44"/>
      <use href="#chCurl" x="58" y="196" width="46" height="28"/><use href="#chCurl" x="262" y="196" width="46" height="28" transform="scale(-1 1) translate(-524 0)"/>
      <use href="#chCurl" x="96" y="148" width="34" height="20" transform="rotate(180 113 158)"/><use href="#chCurl" x="190" y="148" width="34" height="20" transform="scale(-1 -1) translate(-414 -316)"/>
      <rect x="72" y="132" width="12" height="108" fill="url(#chG)" stroke="#5a4214" stroke-width=".6"/><rect x="236" y="132" width="12" height="108" fill="url(#chG)" stroke="#5a4214" stroke-width=".6"/>
      <g fill="#5a4214"><circle cx="78" cy="142" r="2"/><circle cx="78" cy="186" r="2"/><circle cx="78" cy="230" r="2"/><circle cx="242" cy="142" r="2"/><circle cx="242" cy="186" r="2"/><circle cx="242" cy="230" r="2"/></g>
      <g fill="url(#chG)" stroke="#5a4214" stroke-width=".6"><path d="M38 214h20v6h-14v20h-6z"/><path d="M282 214h-20v6h14v20h6z"/></g>
      <g class="ch2-runes" font-family="Zen Kaku Gothic New, serif" font-size="11" text-anchor="middle"><text x="104" y="226">零</text><text x="124" y="226">封</text><text x="196" y="226">界</text><text x="216" y="226">神</text></g>
      <rect class="ch2-seam" x="44" y="127" width="232" height="6" fill="url(#chSeam)" filter="url(#chGlow)"/>
      <g class="ch2-lid">
        <path d="M282 132L300 120L300 96Q292 70 282 98Z" fill="url(#chWS)" stroke="#e8c77e55"/>
        <path d="M38 132L38 100Q160 34 282 100L282 132Z" fill="url(#chW)"/><path d="M38 132L38 100Q160 34 282 100L282 132Z" fill="url(#chGrain)"/>
        <path d="M38 132L38 100Q160 34 282 100L282 132Z" fill="none" stroke="url(#chG)" stroke-width="3"/><path d="M52 120L52 104Q160 50 268 104L268 120" fill="none" stroke="#e8c77e44"/>
        <path d="M72 132L72 84Q78 80 84 78L84 132Z" fill="url(#chG)" stroke="#5a4214" stroke-width=".6"/><path d="M248 132L248 84Q242 80 236 78L236 132Z" fill="url(#chG)" stroke="#5a4214" stroke-width=".6"/>
        <use href="#chCurl" x="98" y="88" width="40" height="24"/><use href="#chCurl" x="182" y="88" width="40" height="24" transform="scale(-1 1) translate(-404 0)"/>
        <rect x="36" y="124" width="248" height="10" fill="url(#chGH)" stroke="#5a4214" stroke-width=".6"/></g>
      <g class="ch2-lock"><path d="M160 104L190 116L186 162L160 180L134 162L130 116Z" fill="url(#chG)" stroke="#5a4214"/><circle cx="160" cy="140" r="25" fill="url(#chSeal)" stroke="#5a4214"/>
        <g class="ch2-ring" font-family="Zen Kaku Gothic New, serif" font-size="7.5" fill="#e8c77e" text-anchor="middle"><circle cx="160" cy="140" r="21" fill="none" stroke="#e8c77e66" stroke-dasharray="2 3"/><text x="160" y="124">召</text><text x="176" y="143">門</text><text x="160" y="161">魂</text><text x="144" y="143">界</text></g>
        <circle cx="160" cy="140" r="9" fill="#0b0818" stroke="url(#chG)" stroke-width="1.5"/><path id="cfLock" d="M160 134a3 3 0 1 1 0 6l2 6h-4l2-6" fill="#000" stroke="#ffd27a88" stroke-width=".6"/></g>
      <path class="ch2-gem" d="M160 92l7 9-7 9-7-9z" fill="url(#chGem)" stroke="#fff8" filter="url(#chGlow)"/></g></svg></div>`;
  const reducedNow = () => reduced || matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, reducedNow() ? 0 : ms));
  let run = 0; // identifiant de lecture : un « Passer » ou une fermeture coupe la lecture en cours

  // --- sons facultatifs (coupés par défaut, mémorisés dans ce navigateur) ---
  let soundOn = false; try { soundOn = localStorage.getItem("rz-sound") === "1"; } catch (e) {}
  let ac = null;
  function snd(f = 440, d = .12, type = "sine", vol = .06) {
    if (!soundOn) return;
    try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = f; g.gain.value = vol; g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + d); o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + d); } catch (e) {}
  }

  // --- rendu ---
  const bestOf = (o) => o.cards.reduce((a, x) => (RAR[x.c.rar].rank > RAR[a].rank ? x.c.rar : a), "c");
  function render(el, o, top) {
    const sc = CHEST_BY_ID[o.scenario] || CHEST_BY_ID["cl-nette"];
    el.innerHTML = `${top}<section class="stage cf" id="cf" style="--rare:${RAR.c.color}">
      <div class="cf-fx" id="cfFx" aria-hidden="true"></div>
      <div class="c3-scene" id="cfScene"><div class="beam"></div>
        <div class="cf-runes" id="cfRunes" aria-hidden="true">${RUNES.map((k, i) => `<i style="--i:${i}">${k}</i>`).join("")}</div>
        <div class="cf-crystal" id="cfCrystal" aria-hidden="true"><i></i><i></i><i></i></div>
        ${chestHTML()}</div>
      <div class="keybox"><div class="key" id="cfKey" tabindex="0" role="button" aria-label="Utiliser la clé sur le coffre">${KEY_SVG}</div>
        <span class="keyhint" id="cfHint">Touche la clé pour ouvrir le coffre</span></div>
      <p class="sr-only" aria-live="polite" id="cfLive"></p>
      <div class="cf-tools"><button class="btn sm" type="button" data-act="cf-sound" aria-pressed="${soundOn}">${soundOn ? "Son activé" : "Son coupé"}</button><button class="btn sm" type="button" data-act="skip">Passer</button></div>
      <p class="sub">${o.pk.name}${o.pk.daily ? "" : ` · ${o.paid ? "acheté" : "gratuit"}`}</p></section>`;
    el.dataset.cf = o.id;
    wireKey(o, sc);
  }
  // ouverture au clic : on touche la clé ou le coffre (ou Entrée au clavier), la clé va seule dans la serrure
  function wireKey(o, sc) {
    const go = (ev) => { if (o.cf !== "key") return; ev?.preventDefault?.(); play(o, sc); };
    $("cfKey").addEventListener("click", go);
    $("cfChest").addEventListener("click", go);
    $("cfKey").addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") go(ev); });
  }

  // --- les temps forts ---
  const fx = () => $("cfFx"), chest = () => $("cfChest"), stage = () => $("cf");
  // la teinte du coffre ET du fond suit ce que le scénario montre (une feinte reste grise ou bleue jusqu'à la bascule)
  const setTint = (r) => { const c = r === "gold" ? "#f0c860" : RAR[r].color; stage()?.style.setProperty("--rare", c); $("stage").style.setProperty("--glow", c); if (opening) opening.glow = c; };
  function spawnFx(cls, n, f) { const box = fx(); if (!box) return; for (let i = 0; i < n; i++) { const e = document.createElement("i"); e.className = cls; f?.(e, i); box.appendChild(e); } }
  const clearFx = (sel) => fx()?.querySelectorAll(sel).forEach((e) => e.remove());
  function keyTo(lock = true) {
    const key = $("cfKey"); if (!key) return;
    if (!lock) { key.style.transform = ""; key.style.opacity = 1; return; }
    const lr = $("cfLock").getBoundingClientRect(), kr = key.getBoundingClientRect();
    key.style.transform = `translate(${lr.left + lr.width / 2 - (kr.left + kr.width * .92)}px, ${lr.top + lr.height / 2 - kr.top - kr.height / 2}px) scale(.6)`;
  }
  const BEAT = {
    async insert() { $("cfHint")?.setAttribute("hidden", ""); keyTo(true); snd(520, .08, "triangle"); await wait(420); },
    async turn() { const k = $("cfKey"); if (k) k.style.transform += " rotateX(80deg)"; stage()?.classList.add("turning"); snd(330, .1, "square", .03); chest()?.classList.add("shake1"); await wait(420); chest()?.classList.remove("shake1"); },
    async tint(o, r) { setTint(r || bestOf(o)); if (!r) snd(660 + 80 * RAR[bestOf(o)].rank, .25); await wait(520); },
    async ladder(o) { for (const r of RANKS.slice(0, RAR[bestOf(o)].rank + 1)) { setTint(r); snd(300 + 90 * RAR[r].rank, .1); await wait(260); } },
    async shake(o, n = 1) { const c = chest(); c?.classList.add("shake" + Math.min(3, n)); snd(120, .2 * n, "sawtooth", .03); await wait(360 * n); c?.classList.remove("shake1", "shake2", "shake3"); },
    async runes(o, n = 8) { const rs = [...document.querySelectorAll("#cfRunes i")].slice(0, n); for (const r of rs) { r.classList.add("on"); snd(800, .05); await wait(90); } await wait(200); },
    async runesOut() { document.querySelectorAll("#cfRunes i").forEach((r) => r.classList.remove("on")); $("cf")?.classList.add("dim"); await wait(400); $("cf")?.classList.remove("dim"); },
    async crystal(o, n = 1) { const c = $("cfCrystal"); for (let i = 0; i < n; i++) { c?.classList.remove("pulse"); void c?.offsetWidth; c?.classList.add("pulse"); snd(990, .2); await wait(460); } },
    async crack() { $("cfCrystal")?.classList.add("cracked"); snd(180, .15, "square", .04); await wait(520); },
    async burstCrystal() { $("cfCrystal")?.classList.add("burst"); snd(1200, .3); await wait(450); },
    async keyPop() { const k = $("cfKey"); if (k) k.style.transform = "translateY(-12px)"; live("…la serrure résiste"); await wait(600); keyTo(false); },
    async keyBreak() { $("cfKey")?.classList.add("broken"); snd(150, .25, "square", .05); live("La clé s'est brisée…"); await wait(600); },
    async goldKey() { const k = $("cfKey"); if (!k) return; k.style.transition = "none"; keyTo(false); k.classList.remove("broken"); k.classList.add("golden"); void k.offsetWidth; k.style.transition = ""; live("Une clé dorée apparaît"); await wait(500); },
    async lidPeek() { chest()?.classList.add("peek"); await wait(650); },
    async lidFall() { const c = chest(); c?.classList.remove("peek"); c?.classList.add("shake2"); snd(90, .25, "sawtooth", .05); await wait(450); c?.classList.remove("shake2"); },
    async blackout() { stage()?.classList.add("blackout"); snd(60, .5, "sine", .05); await wait(900); },
    async redrop() { const s = $("cfScene"); s?.classList.remove("redrop"); void s?.offsetWidth; s?.classList.add("redrop"); stage()?.classList.remove("blackout"); await wait(750); },
    async dust() { spawnFx("dust", 26, (e, i) => { e.style.setProperty("--a", `${i * 14}deg`); e.style.setProperty("--d", `${(i % 5) * 60}ms`); }); await wait(950); clearFx(".dust"); },
    async split() { $("cfCrystal")?.classList.add("split"); snd(880, .3); await wait(950); },
    async crowns() { spawnFx("crown", 2, (e, i) => { e.innerHTML = CROWN; e.style.setProperty("--s", i ? 1 : -1); }); snd(740, .4); await wait(1150); clearFx(".crown"); },
    async eclipse() { spawnFx("eclipse", 1); snd(220, .9, "triangle"); await wait(1300); clearFx(".eclipse"); },
    async twin() { const s = $("cfScene"), g = chest()?.cloneNode(true); if (g) { g.id = ""; g.classList.add("ghost"); s?.appendChild(g); } await wait(1100); g?.remove(); },
    async coins() { spawnFx("coin", 28, (e, i) => { e.style.left = `${(i * 37) % 100}%`; e.style.setProperty("--d", `${(i % 7) * 90}ms`); }); snd(1320, .15); await wait(1200); clearFx(".coin"); },
    async gild() { chest()?.classList.add("gilded"); await wait(600); },
    async sheen() { chest()?.classList.add("sheen"); await wait(850); },
    async chrysalis() { chest()?.classList.add("chrysalis"); snd(520, .8, "triangle"); await wait(1250); chest()?.classList.remove("chrysalis"); },
    async column() { spawnFx("column", 1); snd(160, 1, "sawtooth", .03); await wait(1100); },
    async stars() { stage()?.classList.add("night"); spawnFx("star", 50, (e) => { e.style.left = Math.random() * 100 + "%"; e.style.top = Math.random() * 80 + "%"; e.style.setProperty("--d", Math.round(Math.random() * 700) + "ms"); }); await wait(1250); },
    async kanji(o, k = "零") { spawnFx("kanji", 1, (e) => { e.textContent = k; }); snd(440, .6, "triangle"); await wait(1150); clearFx(".kanji"); },
    async orbit() { spawnFx("orb", 5, (e, i) => e.style.setProperty("--i", i)); await wait(1350); clearFx(".orb"); },
    async quake() { stage()?.classList.add("quake"); snd(70, .7, "sawtooth", .06); await wait(700); stage()?.classList.remove("quake"); },
    async aurora() { spawnFx("aurora", 3, (e, i) => e.style.setProperty("--i", i)); await wait(1300); },
    async banner(o, text) { spawnFx("banner", 1, (e) => { e.textContent = text; }); live(text); await wait(1500); clearFx(".banner"); },
    async pause(o, ms = 400) { await wait(ms); },
    async open(o) { const k = $("cfKey"); if (k) k.style.opacity = 0; setTint(bestOf(o)); $("stage").style.setProperty("--glow", (o.glow = glowOf(o))); chest()?.classList.add("open"); $("cfScene")?.classList.add("open"); snd(880, .5, "triangle"); if (!reducedNow()) { stage()?.classList.add("glowing"); } await wait(750); await BEAT.shatter(o); },
    // le coffre éclate en morceaux derrière les cartes qui arrivent
    async shatter() {
      const c = chest(), box = fx(); if (!c || !box) return;
      const r = c.getBoundingClientRect(), b = box.getBoundingClientRect(), cx = r.left + r.width / 2 - b.left, cy = r.top + r.height / 2 - b.top;
      spawnFx("shard", 16, (e, i) => { const a = (i / 16) * Math.PI * 2 + Math.random() * .4, d = 120 + Math.random() * 160; e.style.left = cx + "px"; e.style.top = cy + "px"; e.style.setProperty("--dx", Math.cos(a) * d + "px"); e.style.setProperty("--dy", Math.sin(a) * d - 40 + "px"); e.style.setProperty("--r", Math.round(Math.random() * 540 - 270) + "deg"); e.style.setProperty("--s", (0.6 + Math.random() * 0.8).toFixed(2)); });
      spawnFx("boom", 1, (e) => { e.style.left = cx + "px"; e.style.top = cy + "px"; });
      c.classList.add("gone"); $("cfScene")?.classList.add("gone");
      snd(140, .4, "sawtooth", .05);
      await wait(650);
    },
  };
  const live = (t) => { const l = $("cfLive"); if (l) l.textContent = t; };

  async function play(o, sc) {
    if (o.cf !== "key") return; // une seule ouverture, même avec plusieurs clics
    o.cf = "anim"; const me = ++run;
    try {
      if (reducedNow()) { setTint(bestOf(o)); chest()?.classList.add("open"); }
      else for (const [b, ...args] of sc.beats) { if (me !== run || opening !== o) return; await BEAT[b]?.(o, ...args); }
    } catch (e) { /* une erreur d'animation ne bloque jamais l'ouverture : on passe aux cartes */ }
    if (me !== run || opening !== o) return;
    // comme la pochette (et Kyara) : les cartes se dévoilent une par une, en grand
    o.cf = "cards"; o.phase = "cards"; o.i = 0; o.flipped = false; $("stage").dataset.cf = ""; drawOpening();
  }

  // --- les 5 cartes face cachée, puis le récapitulatif ---
  function grid(el, o, top) {
    const left = o.flips.filter((x) => !x).length;
    el.innerHTML = `${top}<section class="stage cf cf-grid" style="--rare:${RAR[bestOf(o)].color}">
      <p class="eyebrow gold">${esc(o.pk.name)}</p><h2>${left ? (o.pk.cos ? "Retourne tes objets" : "Retourne tes cartes") : "Tout est révélé"}</h2>
      <div class="multi ${o.cards.length > 5 ? "ten" : ""}">${o.cards.map((x, i) => `<button class="slot ${o.flips[i] ? "flipped" : ""}" type="button" data-cflip="${i}" style="--i:${i};--rc:${x.gold ? "#f0c860" : RAR[x.c.rar].color}" aria-label="${o.flips[i] ? `${esc(itemName(x))}, ${RAR[x.c.rar].label}${x.gold ? ", dorée" : ""}` : `Retourner la carte ${i + 1}`}">
        <span class="back"><b>零</b></span><span class="front">${o.flips[i] ? itemHTML(x) : ""}</span></button>`).join("")}</div>
      <p class="hint" aria-live="polite">${o.last != null ? `<b style="color:${o.cards[o.last].gold ? "#f0c860" : RAR[o.cards[o.last].c.rar].color}">${esc(itemName(o.cards[o.last]))} · ${RAR[o.cards[o.last].c.rar].label}${o.cards[o.last].gold ? " · Dorée" : ""}</b>${o.cards[o.last].isNew ? " · Nouvelle !" : ""}` : "Touche une carte pour la retourner"}</p>
      <div class="row" style="justify-content:center">${left ? `<button class="btn" type="button" data-act="cf-next">Retourner la suivante</button><button class="btn" type="button" data-act="skip">Tout révéler</button>` : `<button class="btn gold big" type="button" data-act="skip">Voir le récapitulatif</button>`}</div>
    </section>`;
    el.dataset.cf = "";
  }
  function flip(i) {
    const o = opening; if (!o || o.phase !== "grid" || o.flips[i]) return;
    o.flips[i] = true; o.last = i;
    const x = o.cards[i];
    if (!reducedNow() && (RAR[x.c.rar].rank >= 4 || x.gold)) { const st = $("stage"); st.style.setProperty("--glow", x.gold ? "#f0c860" : RAR[x.c.rar].color); st.classList.remove("flashy"); void st.offsetWidth; st.classList.add("flashy"); snd(700 + 120 * RAR[x.c.rar].rank, .3); }
    drawOpening();
    const b = document.querySelector(`[data-cflip="${i}"]`); if (b && !reducedNow()) b.classList.add("turning");
  }
  return {
    isChest: (pk) => !!(pk.skins || pk.base === "coffre"),
    draw(el, o, top) {
      if (!o.id) { o.id = Math.random().toString(36).slice(2); o.flips = o.cards.map(() => false); o.cf = "key"; }
      if (o.phase === "pack") { el.style.setProperty("--glow", o.glow || RAR.c.color); if (el.dataset.cf !== o.id) render(el, o, top); else el.querySelector(".stage-top")?.replaceWith(Object.assign(document.createElement("div"), { innerHTML: top }).firstElementChild); return true; }
      if (o.phase === "grid") { grid(el, o, top); return true; }
      return false;
    },
    flip, stop() { run++; },
    next() { const i = opening?.flips?.findIndex((x) => !x); if (i >= 0) flip(i); },
    toggleSound() { soundOn = !soundOn; try { localStorage.setItem("rz-sound", soundOn ? "1" : "0"); } catch (e) {} const b = document.querySelector('[data-act="cf-sound"]'); if (b) { b.setAttribute("aria-pressed", soundOn); b.textContent = soundOn ? "Son activé" : "Son coupé"; } snd(660, .1); },
  };
})();
document.addEventListener("click", (e) => { const b = e.target.closest("[data-cflip]"); if (b) Coffre.flip(+b.dataset.cflip); });
