// ===== Admin : Galerie (toutes les cartes, contrôle qualité) et Laboratoire (partie de test isolée) =====
// Réservé à l'admin et au dev. Rien ici ne donne de carte ni ne touche à la vraie partie :
// la galerie n'affiche que des aperçus, le labo joue sur une sauvegarde à part gardée par le serveur.
ROUTES.push("galerie", "labo");
const gal = { rar: "", fac: "", qa: "", gold: false, cos: "", q: "", n: 60, qaMap: null, zoom: null };
const lab = { s: null, loading: false, pack: "coffre", all: true, picks: [null, null, null, null, null], golds: [false, false, false, false, false], scenario: "", last: null, sum: null, summonRars: "" };
const adminOnly = () => (IS_ADMIN || IS_DEV) && SRV;
const QA_LABEL = { ok: "Validée", revoir: "À revoir" };

async function galLoadQA() { try { gal.qaMap = (await srv("qa/list")).qa || {}; } catch (e) { gal.qaMap = {}; toast(e.message); } if (view === "galerie") draw(); }
function galList() {
  const q = gal.q.trim().toLowerCase();
  return ALL_CARDS.filter((c) => (!gal.rar || c.rar === gal.rar) && (!gal.fac || facOf(c) === gal.fac)
    && (!gal.qa || (gal.qa === "none" ? !gal.qaMap?.[c.id] : gal.qaMap?.[c.id]?.s === gal.qa))
    && (!q || `${nameOf(c)} ${c.title} ${c.id}`.toLowerCase().includes(q)));
}
function viewGalerie() {
  if (!adminOnly()) return `<div class="wrap page">${empty("La galerie est réservée à l'admin, sur le site du QG.")}</div>`;
  if (!gal.qaMap) { galLoadQA(); gal.qaMap = {}; }
  const list = galList(), n = Object.values(gal.qaMap).length, bad = Object.values(gal.qaMap).filter((x) => x.s === "revoir").length;
  const design = gal.cos ? { [COS_BY_ID[gal.cos].slot]: gal.cos } : null;
  return `<div class="wrap page">${head("Admin · 図", "Galerie", "Toutes les cartes du jeu, même cachées aux joueurs ou non possédées. Aperçu seulement : rien n'est ajouté à une collection.")}
    <div class="z-bar"><span><b>${ALL_CARDS.length}</b> cartes</span><span>Contrôle qualité : <b>${n}</b> vérifiées, <b>${bad}</b> à revoir</span><button class="btn sm" type="button" data-nav="labo">Ouvrir le labo</button></div>
    ${seg("galRar", [["", "Toutes"], ...RANKS.map((r) => [r, RAR[r].label])], gal.rar)}
    <div class="gal-f">
      <label>Faction <select id="galFac"><option value="">Toutes</option>${FACS().map((f) => `<option value="${f}" ${gal.fac === f ? "selected" : ""}>${facLabel(f)}</option>`).join("")}</select></label>
      <label>Qualité <select id="galQa"><option value="">Tout</option><option value="none" ${gal.qa === "none" ? "selected" : ""}>Non vérifiées</option><option value="ok" ${gal.qa === "ok" ? "selected" : ""}>Validées</option><option value="revoir" ${gal.qa === "revoir" ? "selected" : ""}>À revoir</option></select></label>
      <label>Cosmétique <select id="galCos"><option value="">Aucun</option>${COSMETICS.map((c) => `<option value="${c.id}" ${gal.cos === c.id ? "selected" : ""}>${esc(COS_SLOT_LABEL[c.slot])} · ${esc(c.name)}</option>`).join("")}</select></label>
      <label class="zopt-line"><input type="checkbox" id="galGold" ${gal.gold ? "checked" : ""}> Variante dorée</label>
      <label class="gal-q">Chercher <input type="search" id="galQ" value="${esc(gal.q)}" placeholder="Nom, titre, identifiant"></label>
    </div>
    <p class="note">${list.length} carte${list.length > 1 ? "s" : ""}</p>
    <div class="gal-grid">${list.slice(0, gal.n).map((c) => { const qa = gal.qaMap[c.id];
      return `<button type="button" class="gal-c" data-gal="${c.id}" aria-label="${esc(nameOf(c))}, ${esc(c.title)}">${cardHTML(c, { gold: gal.gold, design, present: false })}
        <span class="gal-tags">${!visible(c) ? '<i class="hid">Caché aux joueurs</i>' : ""}${qa ? `<i class="qa-${qa.s}">${QA_LABEL[qa.s]}</i>` : ""}</span></button>`; }).join("")}</div>
    ${list.length > gal.n ? `<div class="row" style="justify-content:center"><button class="btn" type="button" data-act="gal-more">Voir plus (${list.length - gal.n})</button></div>` : ""}</div>`;
}
function galZoom(id) {
  const c = byId[id]; if (!c) return; gal.zoom = id;
  const qa = gal.qaMap?.[id], design = gal.cos ? { [COS_BY_ID[gal.cos].slot]: gal.cos } : null;
  $("overlay").innerHTML = `<div class="sheet gal-sheet" role="dialog" aria-modal="true" aria-label="Aperçu de la carte"><div class="sheet-h"><h2>${esc(nameOf(c))}</h2><button class="x" type="button" data-act="close" aria-label="Fermer">✕</button></div>
    <div class="sheet-b"><div class="gal-zoom">${cardHTML(c, { gold: gal.gold, design, present: true })}</div>
      <p class="note" style="text-align:center">${esc(c.title)} · ${RAR[c.rar].label} · ${facLabel(facOf(c))} · <span class="mono">${c.id}</span>${visible(c) ? "" : " · caché aux joueurs"}</p>
      <p class="eyebrow mut">Contrôle qualité</p>
      <p class="note">Un seul personnage, visage lisible, pas de planche multi-vues ni de texte parasite.${qa ? ` Dernier avis : <b>${QA_LABEL[qa.s]}</b> par ${esc(qa.by)}${qa.note ? ` (« ${esc(qa.note)} »)` : ""}.` : ""}</p>
      <input type="text" id="qaNote" maxlength="200" placeholder="Motif (si à revoir)" value="${esc(qa?.note || "")}" class="gal-note">
      <div class="row"><button class="btn gold sm" type="button" data-qa="ok">Valider</button><button class="btn acc sm" type="button" data-qa="revoir">À revoir</button>${qa ? '<button class="btn sm" type="button" data-qa="">Effacer l\'avis</button>' : ""}</div>
      <button class="btn big block" type="button" data-act="gal-test">Tester l'ouverture avec cette carte</button></div></div>`;
  $("overlay").hidden = false;
}
async function galSetQA(status) {
  try { gal.qaMap = (await srv("qa/set", { id: gal.zoom, status, note: $("qaNote")?.value || "" })).qa; toast(status ? `Carte marquée « ${QA_LABEL[status]} ».` : "Avis effacé."); galZoom(gal.zoom); draw(); }
  catch (e) { toast(e.message); }
}

// ===== Laboratoire =====
async function labCall(action, body = {}) {
  lab.loading = true;
  try { const r = await srv("lab/" + action, body); lab.s = r.lab; return r; }
  catch (e) { toast(e.message); return null; }
  finally { lab.loading = false; if (view === "labo" && !opening) draw(); }
}
const labCardOpts = (cur) => `<option value="">Au hasard</option>${RANKS.slice().reverse().map((r) => `<optgroup label="${RAR[r].label}">${ALL_CARDS.filter((c) => c.rar === r).map((c) => `<option value="${c.id}" ${cur === c.id ? "selected" : ""}>${esc(nameOf(c))} · ${esc(c.title)}</option>`).join("")}</optgroup>`).join("")}`;
function viewLabo() {
  if (!adminOnly()) return `<div class="wrap page">${empty("Le laboratoire est réservé à l'admin, sur le site du QG.")}</div>`;
  if (param && byId[param] && lab.picks[0] !== param) { lab.picks[0] = param; lab.pack = "coffre"; }
  if (!lab.s && !lab.loading) labCall("state");
  const s = lab.s, cos = s ? cosOf(s) : null;
  const forced = lab.picks.filter(Boolean).length, cats = { classique: "Classiques", fake: "Feintes", transfo: "Transformations", spectacle: "Spectaculaires", secret: "Secrets" };
  const ctxNow = forced === PACK ? chestCtx(lab.picks.map((id, i) => ({ id, gold: lab.golds[i], isNew: !s?.owned?.[id] }))) : null;
  return `<div class="wrap page">${head("Admin · 験", "Laboratoire", "Une partie de test rien qu'à toi, gardée à part par le serveur. Les ouvertures, invocations et soldes d'ici ne touchent jamais ta vraie collection, le classement, le marché ni le fil du QG.")}
    <div class="lab-warn">Bac à sable : rien de ce qui se passe ici n'est réel.</div>
    <section class="sec"><h2>Partie de test</h2>
      ${s ? `<div class="card stat4"><div><b>${fmtN(s.chakra)}</b><span>Essence de test</span></div><div><b>${s.free}</b><span>Boosters gratuits</span></div><div><b>${statsS(s).unique}</b><span>Cartes</span></div><div><b>${cos.inst.length + Object.keys(cos.own).length}</b><span>Cosmétiques</span></div></div>
        <p class="note">Pity Mythique : ${s.sinceMythic}/${MYTHIC_PITY} · pity dorée : ${s.sinceGold} · pity d'invocation : ${cos.sinceM}/${SUMMON_PITY_M}</p>` : `<p class="note">Chargement…</p>`}
      <div class="lab-form" id="labForm">
        <label>Essence <input type="number" min="0" name="chakra" value="${s?.chakra ?? LAB_START.chakra}"></label>
        <label>Gratuits <input type="number" min="0" name="free" value="${s?.free ?? LAB_START.free}"></label>
        <label>Pity Mythique <input type="number" min="0" name="sinceMythic" value="${s?.sinceMythic ?? 0}"></label>
        <label>Pity dorée <input type="number" min="0" name="sinceGold" value="${s?.sinceGold ?? 0}"></label>
        <label>Pity invocation <input type="number" min="0" name="sinceM" value="${cos?.sinceM ?? 0}"></label>
      </div>
      <div class="row"><button class="btn sm" type="button" data-act="lab-set">Appliquer les valeurs</button><button class="btn sm" type="button" data-act="lab-reset">Repartir de zéro</button><button class="btn sm" type="button" data-act="lab-full">Repartir avec toutes les cartes</button></div></section>
    <section class="sec"><h2>Tester une ouverture</h2>
      <div class="lab-form">
        <label>Booster <select id="labPack">${packsAt(Date.now()).map((p) => `<option value="${p.id}" ${lab.pack === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label>
        <label class="zopt-line"><input type="checkbox" id="labAll" ${lab.all ? "checked" : ""}> Tous les épisodes débloqués</label>
        <label>Scénario du coffre <select id="labSc"><option value="">Choisi par le moteur</option>${Object.entries(cats).map(([k, l]) => `<optgroup label="${l}">${CHEST_SCENARIOS.filter((x) => x.cat === k).map((x) => `<option value="${x.id}" ${lab.scenario === x.id ? "selected" : ""}>${esc(x.name)}${ctxNow ? (x.when(ctxNow) ? " ✓" : " (incompatible)") : ""}</option>`).join("")}</optgroup>`).join("")}</select></label>
      </div>
      <p class="note">Imposer les 5 cartes (sinon le tirage est normal). ${forced && forced < PACK ? `<b>Choisis les 5 cartes, ou aucune.</b>` : ""} ${ctxNow ? "✓ = le moteur pourrait choisir ce scénario avec ces cartes." : ""}</p>
      <div class="lab-picks">${lab.picks.map((id, i) => `<div><select data-labpick="${i}" aria-label="Carte ${i + 1}">${labCardOpts(id)}</select><label class="zopt-line"><input type="checkbox" data-labgold="${i}" ${lab.golds[i] ? "checked" : ""}> Dorée</label></div>`).join("")}</div>
      <div class="row"><button class="btn gold" type="button" data-act="lab-open" ${lab.loading || (forced && forced < PACK) ? "disabled" : ""}>Ouvrir dans le labo</button>${lab.last ? `<button class="btn" type="button" data-act="lab-replay">Rejouer la dernière ouverture</button>` : ""}<button class="btn" type="button" data-act="lab-clear">Vider les cartes imposées</button></div>
      ${lab.last ? `<p class="note">Dernière : ${esc(packOf(lab.last.pack).name)} · scénario ${lab.last.scenario ? `<b>${esc(CHEST_BY_ID[lab.last.scenario].name)}</b>${lab.last.compatible ? "" : " (imposé, incompatible avec ces cartes : jamais choisi en vrai)"}` : "aucun (booster)"}</p>` : ""}</section>
    <section class="sec"><h2>Tester une invocation</h2>
      <div class="lab-form"><label>Raretés imposées <input type="text" id="labRars" value="${esc(lab.summonRars)}" placeholder="vide = tirage normal ; ex. m ou c,pc,r,e,m"></label></div>
      <div class="zsanct lab-sanct"><div id="labSanctum" class="sanctum-host"></div>
        <div class="zs-side"><button class="btn gold" type="button" data-act="lab-sum" data-n="1">Invoquer ×1 (labo)</button><button class="btn acc" type="button" data-act="lab-sum" data-n="5">Invoquer ×5 (labo)</button>
        ${lab.sum ? `<p class="note">Résultat : ${lab.sum.map((x) => `<b style="color:${RAR[x.rar].color}">${esc(COS_BY_ID[x.id].name)}</b>`).join(", ")}</p>` : ""}</div></div></section>
  </div>`;
}
async function labOpen(replay) {
  let r = replay ? lab.last : null;
  if (!r) {
    const forced = lab.picks.every(Boolean);
    r = await labCall("open", { pack: lab.pack, all: lab.all, scenario: lab.scenario || null, cards: forced ? lab.picks.map((id, i) => ({ id, gold: lab.golds[i] })) : null });
    if (!r) return;
    lab.last = r;
  }
  const pk = r.pack === "jour" ? dailyPack() : packOf(r.pack);
  opening = { phase: "pack", cards: r.cards.map((x) => ({ c: byId[x.id], gold: x.gold, isNew: x.isNew })), i: 0, flipped: false, paid: false, pk, divine: r.divine, scenario: r.scenario, lab: true };
  $("stage").dataset.cf = ""; $("overlay").hidden = true;
  draw();
}
async function labSummon(n) {
  const rars = lab.summonRars.split(/[\s,]+/).filter(Boolean);
  const r = await labCall("summon", rars.length ? { rars } : { n }); if (!r) return;
  lab.sum = r.got; draw();
  if (!reduced) { Portal.attach($("labSanctum")); Portal.play(zBest(r.got), () => { Portal.reset(); draw(); }); }
}
VIEWS.galerie = viewGalerie; VIEWS.labo = viewLabo;
const ADMIN_SEG = { galRar: (v) => { gal.rar = v; gal.n = 60; } };
document.addEventListener("click", (e) => {
  const t = e.target;
  const g = t.closest("[data-gal]"); if (g) return galZoom(g.dataset.gal);
  const q = t.closest("[data-qa]"); if (q) return galSetQA(q.dataset.qa || null);
  const a = t.closest("[data-act]")?.dataset.act; if (!a) return;
  if (a === "gal-more") { gal.n += 60; return draw(); }
  if (a === "gal-test") { $("overlay").hidden = true; lab.picks = [gal.zoom, null, null, null, null]; return nav("labo", gal.zoom); }
  const form = () => Object.fromEntries([...document.querySelectorAll("#labForm input")].map((i) => [i.name, +i.value]));
  if (a === "lab-set") return labCall("set", form());
  if (a === "lab-reset") return labCall("reset", form());
  if (a === "lab-full") return labCall("reset", { ...form(), full: true });
  if (a === "lab-open") return labOpen(false);
  if (a === "lab-replay") return labOpen(true);
  if (a === "lab-clear") { lab.picks = [null, null, null, null, null]; lab.golds = lab.golds.map(() => false); if (param) return nav("labo"); return draw(); }
  if (a === "lab-sum") return labSummon(+t.closest("[data-n]").dataset.n);
  if (a === "lab-back") { closeStage(); return nav("labo"); }
});
let galQT;
document.addEventListener("input", (e) => { if (e.target.id === "galQ") { gal.q = e.target.value; gal.n = 60; clearTimeout(galQT); galQT = setTimeout(() => { draw(); const i = $("galQ"); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250); } if (e.target.id === "labRars") lab.summonRars = e.target.value; });
document.addEventListener("change", (e) => {
  const t = e.target;
  if (t.id === "galFac") { gal.fac = t.value; gal.n = 60; return draw(); }
  if (t.id === "galQa") { gal.qa = t.value; gal.n = 60; return draw(); }
  if (t.id === "galCos") { gal.cos = t.value; return draw(); }
  if (t.id === "galGold") { gal.gold = t.checked; return draw(); }
  if (t.id === "labPack") { lab.pack = t.value; return; }
  if (t.id === "labAll") { lab.all = t.checked; return; }
  if (t.id === "labSc") { lab.scenario = t.value; return; }
  if (t.dataset.labpick != null) { lab.picks[+t.dataset.labpick] = t.value || null; return draw(); }
  if (t.dataset.labgold != null) { lab.golds[+t.dataset.labgold] = t.checked; return draw(); }
});
