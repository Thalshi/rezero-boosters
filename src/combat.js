// ===== Arène : combats 3 contre 3 avec les persos de sa collection =====
// #/arene : ton équipe, combattre l'IA, défier un ami · #/arene/<id> : le combat
// Les règles sont dans game.js (btCreate, btResolve…) ; sur le site le serveur décide de tout, sur claude.ai
// (sans serveur) les combats contre l'IA se jouent dans la page.
ROUTES.push("arene");
const BT = { list: null, fight: null, busy: false, timer: null, shown: 0, anim: false, pick: null, filtre: "tous", intro: null };
const BT_KANJI = { assassin: "刃", mage: "魔", gardien: "盾", soutien: "癒" };
const BT_AFF_K = { feu: ["火", "#ff6a3d"], vent: ["風", "#4fd18b"], terre: ["土", "#c8964a"], eau: ["水", "#4d9bff"], ombre: ["闇", "#b072ff"], lumiere: ["光", "#ffe27a"] };
const btProfTag = (p) => `<span class="bt-tag p-${p}" title="${BT_PROFILS[p].label}"><i>${BT_KANJI[p]}</i>${BT_PROFILS[p].label}</span>`;
const btAffTag = (a) => `<span class="bt-tag" style="--ac:${BT_AFF_K[a][1]}" title="Affinité ${BT_AFFINITES[a].label} : bat ${BT_AFFINITES[BT_AFFINITES[a].bat].label}"><i>${BT_AFF_K[a][0]}</i>${BT_AFFINITES[a].label}</span>`;
const btArt = (id, cls = "") => { const c = byId[id]; return `<span class="bt-art ${cls}">${c ? artIn(c) : ""}</span>`; };

// --- appels : serveur sur le site, moteur local sur claude.ai (IA seulement) ---
const BT_LOCAL = { fights: {} };
async function btCall(action, body = {}) {
  if (SRV) return srv("combat/" + action, body);
  const fail = (m) => { throw new Error(m); };
  if (action === "team") { const o = btSetTeamS(save, body.ids); if (o.error) fail(o.error); persist(); return { ok: true }; }
  if (action === "feed") { const o = btFeedS(save, body.id); if (o.error) fail(o.error); persist(); return o; }
  if (action === "list") return { combats: [] };
  if (action === "ia") {
    const team = btTeamOf(save); if (team.length !== BT_TEAM) fail(`Choisis d'abord ton équipe de ${BT_TEAM} persos.`);
    const niveau = body.niveau || "normal", ia = btIaTeam(mixPoolFor({}, CONFIG, ME), team, niveau, Math.random);
    const id = "local" + Date.now().toString(36), bt = btCreate([{ uid: ME || "moi", nom: "Toi", team }, { uid: null, nom: `IA ${niveau}`, ia: niveau, team: ia }]);
    BT_LOCAL.fights[id] = { id, kind: "ia", status: "combat", me: 0, bt };
  }
  const id = body.id || Object.keys(BT_LOCAL.fights).at(-1), f = BT_LOCAL.fights[id]; if (!f) fail("Combat introuvable.");
  if (action === "act") {
    if (!btValid(f.bt, 0, body.action)) fail("Action impossible.");
    f.bt.sides[0].choix = body.action; f.bt.sides[1].choix = btIaChoice(f.bt, 1, f.bt.sides[1].ia);
    btResolve(f.bt, Math.random);
  }
  if (action === "abandon") { f.bt.winner = 1; f.bt.abandon = 0; }
  if (f.bt.winner != null && f.status !== "fini") { f.status = "fini"; f.bt.rewards = { 0: f.bt.abandon === 0 && f.bt.round < 4 ? null : btRewardS(save, f.bt.winner === 0, f.bt.sides[1].ia, f.bt.sides[0].team.map((x) => x.id)) }; persist(); }
  return { ...f, actions: f.bt.winner == null ? btActions(f.bt, 0) : [] };
}

// --- la page Arène ---
function btLoadList() { if (BT.listLoading) return; BT.listLoading = true; btCall("list").then((r) => { BT.list = r.combats || []; }).catch(() => { BT.list = []; }).finally(() => { BT.listLoading = false; if (view === "arene" && !param) draw(); }); }
VIEWS.arene = () => (param ? btFightView() : btLobby());
function btLobby() {
  if (BT.list == null) btLoadList();
  const team = btTeamOf(save), day = save.btDay?.day === dayKey() ? save.btDay.wins : 0, st = save.btStats || { win: 0, lose: 0 };
  const recus = (BT.list || []).filter((c) => c.recu), enCours = (BT.list || []).filter((c) => !c.recu);
  const friends = typeof FR !== "undefined" ? FR.list?.friends || [] : [];
  if (SRV && typeof FR !== "undefined" && !FR.list) loadFriends().then(() => { if (view === "arene" && !param) draw(); });
  return `<div class="wrap page bt-page">
    ${head("Arène", "Arène", "Tes persos de collection se battent en équipe de 3. Chacun a son profil, son affinité et sa technique spéciale. Le premier qui met K.O. les 3 persos adverses gagne.")}
    <section class="bt-team-box"><div class="bt-h"><h2>Ton équipe</h2><button class="btn" type="button" data-btteam>${team.length ? "Changer d'équipe" : "Choisir mon équipe"}</button></div>
      ${team.length ? `<div class="bt-team">${team.map((t) => btTeamCard(t.id, t.lvl)).join("")}</div>` : `<p class="note">Choisis 3 persos différents de ta collection. Mélange les profils : un Gardien encaisse, un Assassin frappe fort, un Soutien soigne, un Mage empoisonne.</p>`}</section>
    ${recus.length ? `<section class="sec"><h2>Défis reçus</h2>${recus.map((c) => `<div class="bt-row"><b>${esc(c.adversaire || "Un ami")}</b> te défie<span class="row"><button class="btn gold sm" type="button" data-btacc="${c.id}">Accepter</button><button class="btn sm" type="button" data-btref="${c.id}">Refuser</button></span></div>`).join("")}</section>` : ""}
    ${enCours.length ? `<section class="sec"><h2>Combats en cours</h2>${enCours.map((c) => `<div class="bt-row"><b>${c.kind === "ia" ? "Contre l'IA" : `Contre ${esc(c.adversaire || "un ami")}`}</b>${c.status === "attente" ? '<span class="note">en attente de réponse</span>' : ""}<span class="row">${c.status === "combat" ? `<button class="btn gold sm" type="button" data-nav="arene" data-p="${c.id}">Reprendre</button>` : `<button class="btn sm" type="button" data-btref="${c.id}">Annuler</button>`}</span></div>`).join("")}</section>` : ""}
    <section class="sec"><h2>Combattre</h2><p class="note">Victoires récompensées aujourd'hui : ${day}/${BT_DAILY_WINS} · Bilan : ${st.win} victoire${st.win > 1 ? "s" : ""}, ${st.lose} défaite${st.lose > 1 ? "s" : ""}. Chaque combat donne de l'expérience à ton équipe.</p>
      <div class="bt-modes">${[["facile", "Facile", "Pour apprendre"], ["normal", "Normal", "L'IA place ses techniques"], ["difficile", "Difficile", "L'IA joue les affinités"]].map(([k, l, d]) => `<button class="bt-mode m-${k}" type="button" data-btia="${k}" ${team.length === BT_TEAM && !BT.busy ? "" : "disabled"}><b>${l}</b><small>${d}</small><em>+${BT_REWARD[k]} ◆</em></button>`).join("")}</div>
      ${SRV ? `<h3>Défier un ami</h3>${friends.length ? `<div class="bt-friends">${friends.map((f) => `<button class="chip" type="button" data-btdefi="${f.uid}" ${team.length === BT_TEAM ? "" : "disabled"}>⚔ ${esc(f.name)}</button>`).join("")}</div>` : `<p class="note">Ajoute des amis (profil d'un joueur, « Ajouter en ami ») pour les défier. Victoire contre un ami : +${BT_REWARD.ami} ◆.</p>`}` : ""}</section>
    <section class="sec"><h2>Comment ça marche</h2><div class="bt-how">
      <div><b>Profils</b>${BT_PROFIL_IDS.map((p) => `<p>${btProfTag(p)} ${esc(BT_PROFILS[p].tech.nom)} : ${esc(BT_PROFILS[p].tech.desc)}</p>`).join("")}</div>
      <div><b>Affinités</b><p>Feu bat Vent, Vent bat Terre, Terre bat Eau, Eau bat Feu. Ombre et Lumière se battent l'une l'autre. Affinité favorable : +25 % de dégâts.</p>
        <b>À chaque tour</b><p>Attaque, Technique (puis recharge), Défense (dégâts divisés par 2) ou Changer de perso. Le plus rapide frappe en premier.</p>
        <b>Niveaux</b><p>Chaque combat donne de l'expérience (niveau max ${BT_LVL_MAX}, +5 % de stats par niveau). Tu peux aussi donner un doublon d'une carte pour la faire monter.</p></div></div></section>
  </div>`;
}
function btTeamCard(id, lvl) {
  const f = btFighter(id, lvl), o = save.btLvl?.[id] || { lvl: 1, xp: 0 };
  return `<button class="bt-tc r-${f.rar}" type="button" data-btfiche="${id}">${btArt(id)}<span class="bt-tc-b"><b>${esc(f.nom)}</b><small>Niv. ${f.lvl}${f.lvl < BT_LVL_MAX ? ` · ${o.xp}/${btXpNext(f.lvl)} xp` : " · max"}</small><span class="bt-tags">${btProfTag(f.profil)}${btAffTag(f.aff)}</span></span></button>`;
}
// fiche d'un combattant : stats, technique, monter de niveau avec un doublon
function btFiche(id) {
  const f = btFighter(id, btLvlOf(save, id)), o = own(id);
  $("overlay").innerHTML = `<div class="sheet bt-fiche" role="dialog" aria-modal="true" aria-label="${esc(f.nom)}"><div class="sheet-h"><h2>${esc(f.nom)}</h2><button class="x" type="button" data-act="close" aria-label="Fermer">✕</button></div>
    <div class="sheet-b bt-fiche-b">${btArt(id, "big r-" + f.rar)}<div>
      <p class="note">${esc(f.titre || "")} · ${RAR[f.rar].label} · Niveau ${f.lvl}</p><div class="bt-tags">${btProfTag(f.profil)}${btAffTag(f.aff)}</div>
      <table class="bt-stats">${[["PV", f.pvMax], ["Attaque", f.atk], ["Défense", f.def], ["Vitesse", f.vit]].map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("")}</table>
      <p><b>${esc(f.tech.nom)}</b> (recharge ${f.tech.cd} tours) : ${esc(f.tech.desc)}</p>
      ${f.lvl < BT_LVL_MAX ? `<button class="btn" type="button" data-btfeed="${id}" ${o.n >= 2 ? "" : "disabled"}>Donner un doublon (+${BT_XP.feed} xp)${o.n >= 2 ? ` · ${o.n - 1} dispo` : ""}</button>` : `<p class="note">Niveau maximum.</p>`}</div></div></div>`;
  $("overlay").hidden = false;
}
// choisir son équipe
function btTeamSheet() {
  BT.pick = BT.pick || [...(save.btTeam || [])].filter((id) => has(id));
  const mine = ALL_CARDS.filter((c) => !c.skin && has(c.id)).sort((a, b) => RAR[b.rar].rank - RAR[a.rar].rank || btLvlOf(save, b.id) - btLvlOf(save, a.id));
  const list = mine.filter((c) => BT.filtre === "tous" || btKitOf(c.who).profil === BT.filtre);
  $("overlay").innerHTML = `<div class="sheet pool-sh bt-pick" role="dialog" aria-modal="true" aria-label="Ton équipe"><div class="sheet-h"><h2>Ton équipe · ${BT.pick.length}/${BT_TEAM}</h2><button class="x" type="button" data-act="close" aria-label="Fermer">✕</button></div>
    <div class="pool-bar"><div class="seg">${[["tous", "Tous"], ...BT_PROFIL_IDS.map((p) => [p, BT_PROFILS[p].label])].map(([k, l]) => `<button type="button" data-btfil="${k}" aria-pressed="${BT.filtre === k}">${l}</button>`).join("")}</div><span class="note">3 persos différents. Touche pour ajouter ou retirer.</span></div>
    <div class="sheet-b"><div class="bt-grid">${list.length ? list.map((c) => { const f = btFighter(c.id, btLvlOf(save, c.id)), on = BT.pick.includes(c.id); return `<button type="button" class="bt-pc r-${c.rar} ${on ? "on" : ""}" data-btpick="${c.id}">${btArt(c.id)}<b>${esc(f.nom)}</b><small>Niv. ${f.lvl} · ${f.pvMax} PV · ${f.atk} att.</small><span class="bt-tags">${btProfTag(f.profil)}${btAffTag(f.aff)}</span>${on ? `<i class="bt-n">${BT.pick.indexOf(c.id) + 1}</i>` : ""}</button>`; }).join("") : `<p class="note">Aucune carte de ce profil dans ta collection.</p>`}</div></div>
    <div class="voeu-ok"><button class="btn gold" type="button" data-btsave ${BT.pick.length === BT_TEAM ? "" : "disabled"}>Valider l'équipe</button></div></div>`;
  $("overlay").hidden = false;
}

// --- le combat ---
async function btOpen(id) {
  clearTimeout(BT.timer);
  try { const r = await btCall("state", { id }); BT.fight = r; } catch (e) { BT.fight = { error: e.message }; }
  if (view === "arene" && param === id) draw();
  btSchedule();
}
function btSchedule() {
  clearTimeout(BT.timer); const f = BT.fight;
  if (!SRV || !f || f.error || f.kind !== "ami" || f.status === "fini" || view !== "arene" || param !== f.id) return;
  BT.timer = setTimeout(() => btOpen(f.id), document.hidden ? 10000 : 2000);
}
function btFightView() {
  const F = BT.fight;
  if (!F || F.id !== param) { if (!SRV && BT_LOCAL.fights[param]) BT.fight = { ...BT_LOCAL.fights[param], actions: btActions(BT_LOCAL.fights[param].bt, 0) }; else { btOpen(param); return `<div class="wrap page">${empty("Chargement du combat…")}</div>`; } }
  if (BT.fight.error) return `<div class="wrap page">${empty(esc(BT.fight.error), `<button class="btn" type="button" data-nav="arene">Retour à l'Arène</button>`)}</div>`;
  if (BT.fight.status === "attente") return `<div class="wrap page">${empty("En attente de la réponse de ton ami…", `<button class="btn" type="button" data-nav="arene">Retour à l'Arène</button>`)}</div>`;
  const b = BT.fight.bt, me = BT.fight.me, op = 1 - me, A = b.sides[me], O = b.sides[op], fa = A.team[A.active], fo = O.team[O.active];
  const acts = BT.fight.actions || [], last = b.log.at(-1), waiting = !acts.length && b.winner == null;
  setTimeout(btAfterRender, 0);
  return `<div class="bt-fight">
    <div class="bt-top">${btBanner(A, "me")}<b class="bt-vs">VS</b>${btBanner(O, "op")}</div>
    <div class="bt-stage">
      ${btFighterBox(fo, "op")}${btFighterBox(fa, "me")}
      <div class="bt-fx" id="bt-fx"></div>
    </div>
    <div class="bt-log" id="bt-log">${btLogHTML(last, me)}</div>
    <div class="bt-acts">${b.winner != null ? "" : waiting ? `<p class="note">${BT.fight.kind === "ami" ? `En attente de ${esc(O.nom)}…` : "…"}</p>` : btActsHTML(fa, acts)}
      <button class="btn sm bt-quit" type="button" data-btquit>${b.winner != null ? "Retour à l'Arène" : "Abandonner"}</button></div>
    ${b.winner != null ? btEndHTML(b, me) : ""}
    ${BT.intro === BT.fight.id ? btIntroHTML(A, O) : ""}
  </div>`;
}
const btBanner = (S, cls) => `<div class="bt-ban ${cls}"><b>${esc(S.nom)}</b><span>${S.team.map((f, i) => `<i class="${f.ko ? "ko" : ""} ${i === S.active ? "on" : ""}" title="${esc(f.nom)}">${btArt(f.id)}</i>`).join("")}</span></div>`;
function btFighterBox(f, cls) {
  const pct = Math.max(0, f.pv / f.pvMax * 100), col = pct > 50 ? "#4fd18b" : pct > 25 ? "#f5c518" : "#ff4d5e";
  return `<div class="bt-f ${cls} ${f.ko ? "ko" : ""}" data-btf="${cls}">
    <div class="bt-f-info"><div class="bt-f-h"><b>${esc(f.nom)}</b><small>Niv. ${f.lvl}</small></div>
      <div class="bt-hp"><i style="width:${pct}%;background:${col}"></i>${f.bouclier ? `<em style="width:${Math.min(100, f.bouclier / f.pvMax * 100)}%"></em>` : ""}</div>
      <div class="bt-f-s"><span>${f.pv} / ${f.pvMax}</span><span class="bt-st">${f.bouclier ? `<i title="Bouclier ${f.bouclier}">🛡${f.bouclier}</i>` : ""}${f.poison ? `<i title="Poison : -${f.poison.n} PV pendant ${f.poison.tours} tour(s)">☠${f.poison.tours}</i>` : ""}${f.garde ? '<i title="En garde">✋</i>' : ""}${f.cd > 0 ? `<i title="Technique en recharge">⏳${f.cd}</i>` : '<i title="Technique prête" class="ok">✦</i>'}</span></div>
      <div class="bt-tags">${btProfTag(f.profil)}${btAffTag(f.aff)}</div></div>
    <button class="bt-f-art r-${f.rar}" type="button" data-btinfo="${cls}">${btArt(f.id)}</button></div>`;
}
function btActsHTML(f, acts) {
  const has1 = (t) => acts.some((a) => a.type === t), sw = acts.filter((a) => a.type === "changer"), team = BT.fight.bt.sides[BT.fight.me].team;
  return `<button class="bt-a atk" type="button" data-bta='{"type":"attaque"}'><i>⚔</i><b>Attaque</b><small>${f.atk} att. · toujours prête</small></button>
    <button class="bt-a tech k-${f.tech.kind}" type="button" data-bta='{"type":"tech"}' ${has1("tech") ? "" : "disabled"}><i>${BT_KANJI[f.profil]}</i><b>${esc(f.tech.nom)}</b><small>${has1("tech") ? esc(f.tech.desc) : `Recharge : ${f.cd} tour${f.cd > 1 ? "s" : ""}`}</small></button>
    <button class="bt-a def" type="button" data-bta='{"type":"defense"}'><i>✋</i><b>Défense</b><small>Dégâts reçus ÷ 2 ce tour</small></button>
    ${sw.length ? `<div class="bt-sw"><small>Changer de perso</small>${sw.map((a) => `<button class="bt-a sw" type="button" data-bta='{"type":"changer","to":${a.to}}'>${btArt(team[a.to].id)}<b>${esc(team[a.to].nom)}</b><small>${team[a.to].pv}/${team[a.to].pvMax} PV</small></button>`).join("")}</div>` : ""}`;
}
// le dernier tour en phrases
function btLogHTML(L, me) {
  if (!L || !L.ev?.length) return "";
  const who = (side) => (side === me ? "Ton perso" : "L'adversaire"), nm = (side, id) => esc(BT.fight.bt.sides[side].team.find((f) => f.id === id)?.nom || "");
  return `<b>Tour ${L.round || 1}</b> ` + L.ev.map((e) => {
    if (e.t === "debut") return "Le combat commence !";
    if (e.t === "attaque" || e.t === "tech") return `${nm(e.side, e.id)} ${e.t === "tech" ? `lance <b>${esc(e.nom)}</b>` : "attaque"} : <span class="${e.side === me ? "good" : "bad"}">${e.n ? "-" + e.n : "bloqué"}</span>${e.adv === "fort" ? " (super efficace)" : e.adv === "faible" ? " (peu efficace)" : ""}.`;
    if (e.t === "garde") return `${nm(e.side, e.id)} se met en garde.`;
    if (e.t === "entre") return `${nm(e.side, e.id)} entre en jeu.`;
    if (e.t === "soin") return `${nm(e.side, e.id)} récupère ${e.n} PV.`;
    if (e.t === "bouclier") return `${nm(e.side, e.id)} se protège (bouclier ${e.n}).`;
    if (e.t === "bouclier_absorbe") return `Le bouclier absorbe ${e.n}.`;
    if (e.t === "poison_pose") return `${nm(e.side, e.id)} est empoisonné.`;
    if (e.t === "poison") return `Le poison inflige ${e.n} à ${nm(e.side, e.id)}.`;
    if (e.t === "ko") return `<b>${nm(e.side, e.id)} est K.O. !</b>`;
    return "";
  }).filter(Boolean).join(" ");
}
const btIntroHTML = (A, O) => `<div class="bt-intro" id="bt-intro"><div class="bt-intro-s me">${A.team.map((f) => btArt(f.id, "r-" + f.rar)).join("")}<b>${esc(A.nom)}</b></div><i>VS</i><div class="bt-intro-s op">${O.team.map((f) => btArt(f.id, "r-" + f.rar)).join("")}<b>${esc(O.nom)}</b></div></div>`;
function btEndHTML(b, me) {
  const won = b.winner === me, draw0 = b.winner === -1, r = b.rewards?.[me];
  return `<div class="bt-end ${won ? "win" : "lose"}"><div class="bt-end-b"><h2>${draw0 ? "Égalité" : won ? "Victoire" : "Défaite"}</h2>
    <div class="bt-end-team">${b.sides[me].team.map((f) => btArt(f.id, "r-" + f.rar)).join("")}</div>
    ${b.rewards?.sans ? `<p class="note">Abandon trop rapide : pas de gains.</p>` : r ? `<p>${r.chakra ? `+${r.chakra} ◆` : won ? "Plus de gains d'essence aujourd'hui (5 victoires)." : "Pas d'essence pour une défaite."}</p><p class="note">${r.ups.map((u) => `${esc(byId[u.id] ? PEOPLE[byId[u.id].who].name : u.id)} : niveau ${u.lvl}${u.up ? " ⬆" : ""}`).join(" · ")}</p>` : ""}
    <div class="row"><button class="btn gold" type="button" data-nav="arene">Retour à l'Arène</button>${BT.fight.kind === "ia" ? `<button class="btn" type="button" data-btia="${b.sides[1 - me].ia}">Rejouer</button>` : ""}</div></div></div>`;
}
// animations du dernier tour (une seule fois par tour)
function btAfterRender() {
  const b = BT.fight?.bt; if (!b) return;
  const intro = $("bt-intro"); if (intro) setTimeout(() => { intro.classList.add("out"); setTimeout(() => { if (BT.intro === BT.fight?.id) BT.intro = null; intro.remove(); }, 500); }, 1600);
  const key = BT.fight.id + ":" + b.round; if (BT.shown === key || reduced) { BT.shown = key; return; } BT.shown = key;
  const L = b.log.at(-1), me = BT.fight.me; if (!L) return;
  let t = 0;
  for (const e of L.ev) {
    const cls = e.side === me ? "me" : "op", tgt = e.side === me ? "op" : "me";
    if (e.t === "attaque" || e.t === "tech") {
      setTimeout(() => { const el = document.querySelector(`[data-btf="${cls}"]`); el?.classList.add("lunge"); setTimeout(() => el?.classList.remove("lunge"), 450);
        const fx = $("bt-fx"); if (fx) { const s = document.createElement("i"); s.className = `bt-slash ${e.t === "tech" ? "k-" + e.kind : ""} to-${tgt}`; fx.appendChild(s); setTimeout(() => s.remove(), 800); }
        const hit = document.querySelector(`[data-btf="${tgt}"]`); if (hit) { hit.classList.add("hit"); setTimeout(() => hit.classList.remove("hit"), 400); const n = document.createElement("b"); n.className = "bt-dmg"; n.textContent = e.n ? "-" + e.n : "Bloqué"; hit.appendChild(n); setTimeout(() => n.remove(), 1100); } }, t);
      t += 650;
    } else if (e.t === "soin" || e.t === "bouclier") {
      setTimeout(() => { const el = document.querySelector(`[data-btf="${cls}"]`); if (el) { const n = document.createElement("b"); n.className = "bt-dmg heal"; n.textContent = (e.t === "soin" ? "+" : "🛡") + e.n; el.appendChild(n); setTimeout(() => n.remove(), 1100); } }, t);
      t += 300;
    }
  }
}
async function btDo(fn) {
  if (BT.busy) return; BT.busy = true;
  try { await fn(); } catch (e) { toast(e.message); }
  BT.busy = false; draw();
}
// clics de l'Arène : traités en premier (capture), sinon la fenêtre redessinée passerait pour un clic « en dehors » et se fermerait
document.addEventListener("click", (e) => {
  const t = e.target, mine = t.closest("[data-btteam],[data-btfil],[data-btpick],[data-btsave],[data-btfiche],[data-btfeed],[data-btia],[data-btdefi],[data-btacc],[data-btref],[data-bta],[data-btinfo],[data-btquit]");
  if (!mine) return;
  e.stopPropagation();
  if (t.closest("[data-btteam]")) { BT.pick = null; return btTeamSheet(); }
  const fil = t.closest("[data-btfil]"); if (fil) { BT.filtre = fil.dataset.btfil; return btTeamSheet(); }
  const pk = t.closest("[data-btpick]"); if (pk) {
    const id = pk.dataset.btpick, who = byId[id].who;
    if (BT.pick.includes(id)) BT.pick = BT.pick.filter((x) => x !== id);
    else if (BT.pick.some((x) => byId[x].who === who)) toast("Ce perso est déjà dans ton équipe.");
    else if (BT.pick.length >= BT_TEAM) toast(`Ton équipe est complète (${BT_TEAM}) : retire d'abord un perso.`);
    else BT.pick.push(id);
    return btTeamSheet();
  }
  if (t.closest("[data-btsave]")) return btDo(async () => { await btCall("team", { ids: BT.pick }); $("overlay").hidden = true; toast("Équipe enregistrée."); });
  const fi = t.closest("[data-btfiche]"); if (fi) return btFiche(fi.dataset.btfiche);
  const fd = t.closest("[data-btfeed]"); if (fd) return btDo(async () => { const r = await btCall("feed", { id: fd.dataset.btfeed }); toast(r.up ? `Niveau ${r.lvl} !` : "Expérience gagnée."); btFiche(fd.dataset.btfeed); });
  const ia = t.closest("[data-btia]"); if (ia) return btDo(async () => { const r = await btCall("ia", { niveau: ia.dataset.btia }); BT.fight = r; BT.intro = r.id; BT.shown = r.id + ":1"; nav("arene", r.id); });
  const df = t.closest("[data-btdefi]"); if (df) return btDo(async () => { await btCall("defi", { uid: df.dataset.btdefi }); BT.list = null; toast("Défi envoyé : ton ami doit l'accepter."); });
  const ac = t.closest("[data-btacc]"); if (ac) return btDo(async () => { const r = await btCall("accepter", { id: ac.dataset.btacc }); BT.fight = r; BT.intro = r.id; BT.shown = r.id + ":1"; BT.list = null; nav("arene", r.id); });
  const rf = t.closest("[data-btref]"); if (rf) return btDo(async () => { await btCall("refuser", { id: rf.dataset.btref }); BT.list = null; });
  const a = t.closest("[data-bta]"); if (a && BT.fight) return btDo(async () => { BT.fight = await btCall("act", { id: BT.fight.id, action: JSON.parse(a.dataset.bta) }); btSchedule(); });
  const inf = t.closest("[data-btinfo]"); if (inf && BT.fight?.bt) { const b = BT.fight.bt, s = inf.dataset.btinfo === "me" ? BT.fight.me : 1 - BT.fight.me, f = b.sides[s].team[b.sides[s].active]; return toast(`${f.nom} · ${BT_PROFILS[f.profil].label} ${BT_AFFINITES[f.aff].label} · ${f.atk} att. · ${f.def} déf. · ${f.vit} vit. · ${f.tech.nom} : ${f.tech.desc}`); }
  if (t.closest("[data-btquit]")) {
    const b = BT.fight?.bt; if (!b || b.winner != null) { BT.list = null; return nav("arene"); }
    if (!confirm("Abandonner ce combat ?")) return;
    return btDo(async () => { BT.fight = await btCall("abandon", { id: BT.fight.id }); });
  }
}, true);
