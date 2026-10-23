// ===== Marché =====
const mk = { rar: "", fac: "", sort: "price", min: "", max: "", notOwned: false, wish: false, q: "", win: 30 };
const pctMed = (l) => { const m = median(salesOf(l.card, 30).map((x) => x.price)); if (!m) return ""; const d = Math.round((l.price - m) / m * 100); return `<span class="${d > 0 ? "up" : d < 0 ? "dn" : ""}">${d > 0 ? "+" : ""}${d} % méd.</span>`; };
function lsHTML(l, mine) {
  const c = byId[l.card]; if (!c) return "";
  const vis = visible(c), wished = wishSet().has(l.card) && !has(l.card);
  const st = l.status === "open" ? "En vente" : l.status === "sold" ? "Vendue" : "Retirée";
  return `<div class="ls ${wished ? "wish" : ""}" data-listing="${l.id}" role="button" tabindex="0">
    ${cardHTML(c, { soon: !vis, gold: l.gold, design: listingDesign(l) })}
    <div class="ls-r"><span class="pill">${l.dz?.inst?.length ? "Avec design" : "Prix fixe"}</span><span class="ls-st ${l.status === "open" ? "" : "end"}">${st}</span></div>
    <div class="ls-p">${fmtN(l.price)} <span class="dia"></span></div>
    <div class="ls-m"><span>${mine ? ago(l.t) : `<span data-uid="${l.seller}">…</span>`}</span>${pctMed(l)}</div>
  </div>`;
}
function gateHTML() {
  const linked = SRV, need = Math.max(0, MARKET_MIN_OPENED - save.opened);
  if ((SRV && !need) || (!SRV && DB && canShare && !need)) return "";
  return `<div class="card dash gate"><span class="lk">${icon.lock}</span><div><h3>Le marché s'ouvre bientôt pour toi</h3>
    <p class="note" style="margin-top:6px">Pour éviter les abus, vendre, acheter et échanger demande un compte un peu installé. Tu peux déjà tout consulter.</p>
    <ul>${!linked ? `<li>Lie ton compte Discord.</li>` : ""}${need ? `<li>Ouvre encore ${need} booster${need > 1 ? "s" : ""} (${MARKET_MIN_OPENED} au total).</li>` : ""}</ul>
    <p class="mono" style="margin:0">${linked ? "Discord lié" : "Discord non lié"} · ${save.opened} booster${save.opened > 1 ? "s" : ""} ouvert${save.opened > 1 ? "s" : ""}</p>
    ${!linked && window.DISCORD_LOGIN ? `<a class="btn-disc" href="/auth/login" style="margin-top:12px;width:fit-content;padding:0 18px">${icon.discord}Lier mon compte Discord</a>` : ""}</div></div>`;
}
function viewMarket() {
  const pend = pendingTrades().length;
  const tabs = utabs("mTab", [["buy", "Acheter"], ["sell", "Vendre"], ["trades", "Échanges", pend], ["mine", "Mes annonces"]], marketTab);
  let body = "";
  if (marketTab === "trades") body = viewTrades();
  else if (marketTab === "mine") {
    const mine = shared.market.filter((l) => l.seller === ME && l.status !== "cancelled");
    body = mine.length ? `<div class="mk-grid">${mine.map((l) => lsHTML(l, true)).join("")}</div>` : empty("Tu n'as rien mis en vente.", `<button class="btn" type="button" data-seg="mTab" data-v="sell">Vendre une carte</button>`);
  } else if (marketTab === "sell") {
    const mine = ALL_CARDS.filter((c) => has(c.id)).sort((a, b) => (own(b.id).n + own(b.id).gold) - (own(a.id).n + own(a.id).gold) || RAR[b.rar].rank - RAR[a.rar].rank);
    body = `<p class="note">Touche une carte pour la mettre en vente. Tes doublons sont en premier.</p>${mine.length ? `<div class="cgrid">${mine.map((c) => { const o = own(c.id); return `<div class="cell" data-sell="${c.id}" role="button" tabindex="0">${cardHTML(c, { gold: !o.n && o.gold > 0, count: o.n + o.gold, design: myDesign(c.id) })}<span class="cap"><span>${o.n + o.gold > 1 ? "Doublon" : "Dernier exemplaire"}</span><span>${cote(c.id) ? `~${cote(c.id)} ◆` : ""}</span></span></div>`; }).join("")}</div>` : empty("Ouvre des boosters pour avoir des cartes à vendre.")}`;
  } else {
    const q = mk.q.trim().toLowerCase(), w = wishSet();
    let open = shared.market.filter((l) => l.status === "open" && byId[l.card] && l.seller !== ME)
      .filter((l) => (!mk.rar || byId[l.card].rar === mk.rar) && (!mk.fac || facOf(byId[l.card]) === mk.fac))
      .filter((l) => (!mk.min || l.price >= +mk.min) && (!mk.max || l.price <= +mk.max))
      .filter((l) => (!mk.notOwned || !has(l.card)) && (!mk.wish || w.has(l.card)))
      .filter((l) => !q || (visible(byId[l.card]) && (nameOf(byId[l.card]) + " " + byId[l.card].title).toLowerCase().includes(q)));
    open.sort(mk.sort === "price-d" ? (a, b) => b.price - a.price : mk.sort === "new" ? (a, b) => b.t - a.t : mk.sort === "rar" ? (a, b) => RAR[byId[b.card].rar].rank - RAR[byId[a.card].rar].rank : (a, b) => a.price - b.price);
    body = `<div class="search">${icon.search}<input class="in" id="mkQ" type="search" placeholder="Rechercher un perso…" value="${esc(mk.q)}"></div>
      ${rarChips("mkRar", mk.rar)}
      <div class="flt"><label>Faction<select class="in" data-sel="mkFac"><option value="">Toutes</option>${FACS().map((f) => `<option value="${f}" ${mk.fac === f ? "selected" : ""}>${facLabel(f)}</option>`).join("")}</select></label>
        <label>Tri<select class="in" data-sel="mkSort">${[["price", "Prix croissant"], ["price-d", "Prix décroissant"], ["new", "Plus récentes"], ["rar", "Rareté"]].map(([k, l]) => `<option value="${k}" ${mk.sort === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>
        <label>Prix <input class="in" data-inp="mkMin" type="number" min="0" placeholder="min" value="${esc(mk.min)}"> – <input class="in" data-inp="mkMax" type="number" min="0" placeholder="max" value="${esc(mk.max)}"></label>
        <button class="chip" type="button" data-toggle="notOwned" aria-pressed="${mk.notOwned}">Que je n'ai pas</button><button class="chip" type="button" data-toggle="wish" aria-pressed="${mk.wish}">Que je cherche</button></div>
      <p class="mono mut" style="margin:0;font-size:13px">${open.length} annonce${open.length > 1 ? "s" : ""}</p>
      ${open.length ? `<div class="mk-grid">${open.map((l) => lsHTML(l)).join("")}</div>` : empty(shared.market.some((l) => l.status === "open") ? "Aucune annonce ne correspond." : "Rien en vente pour l'instant. Sois le premier à mettre un doublon sur le marché.")}`;
  }
  return `<div class="wrap page">
    ${head("Hôtel des ventes", "Le marché", "Achète la carte qui te manque, vends tes doublons au plus offrant, échange directement avec les autres joueurs du QG.")}
    ${sharedNote()}${gateHTML()}
    ${tabs}${body}
  </div>`;
}
function openListing(lid) {
  const l = shared.market.find((x) => x.id === lid); if (!l) return;
  const c = byId[l.card], vis = visible(c), mine = l.seller === ME, owned = has(l.card);
  const sales = salesOf(l.card, mk.win), m7 = median(salesOf(l.card, 7).map((x) => x.price)), m30 = median(salesOf(l.card, 30).map((x) => x.price));
  const locked = SRV ? save.opened < MARKET_MIN_OPENED : !canShare;
  $("overlay").innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="Annonce">
    <div class="sheet-h"><h2>${vis ? esc(nameOf(c)) : "???"}</h2><button class="x" type="button" data-act="close" aria-label="Fermer">✕</button></div>
    <div class="sheet-b">
      ${cardHTML(c, { soon: !vis, gold: l.gold, design: listingDesign(l), present: true })}
      ${listingDzHTML(l)}
      ${vis ? `<button class="link" type="button" data-nav="carte" data-p="${c.id}" style="align-self:center">Voir la fiche</button>` : ""}
      <div class="row"><span class="pill">Prix fixe</span><b style="color:${RAR[c.rar].color};font-size:14px">${RAR[c.rar].label}${l.gold ? " · dorée" : ""}</b><span class="note">vendu par ${mine ? "toi" : `<b data-uid="${l.seller}">…</b>`}</span>
        <span class="pill ${owned ? "" : "ok"}" style="margin-left:auto">${owned ? "Tu l'as déjà" : "Tu ne l'as pas encore"}</span></div>
      <div class="box2"><div><small>Prix</small><b>${fmtN(l.price)} <span class="dia f" style="width:16px;height:16px"></span></b></div><div class="st"><small>Statut</small><b style="color:${l.status === "open" ? "var(--ok)" : "var(--acc)"}">${l.status === "open" ? "En vente" : l.status === "sold" ? "Vendue" : "Retirée"}</b></div></div>
      ${l.status === "open" ? (mine ? `<button class="btn big block" type="button" data-cancel="${l.id}">Retirer de la vente</button>`
        : vis && (canPack(c) || owned) ? `<button class="btn gold big block" type="button" data-buy="${l.id}" ${save.chakra < l.price || locked ? "disabled" : ""}>Acheter · ${fmtN(l.price)} ◆</button>${locked ? `<p class="note">${marketBlock2()}</p>` : save.chakra < l.price ? `<p class="note">Il te manque ${fmtN(l.price - save.chakra)} ◆.</p>` : ""}`
        : `<p class="note">Ce perso n'est pas encore débloqué pour toi.</p>`) : ""}
      <hr class="hr">
      <div class="sec-h"><h3 style="font-size:16px">Prix du marché</h3>${seg("mkWin", [[7, "7 j"], [30, "30 j"]].map(([k, v]) => [String(k), v]), String(mk.win), "light")}</div>
      <div class="kv3"><div><small>Médiane 7 j</small><b>${m7 ? `${fmtN(m7)} ◆` : "—"}</b></div><div><small>Médiane 30 j</small><b>${m30 ? `${fmtN(m30)} ◆` : "—"}</b></div><div><small>Ventes ${mk.win} j</small><b>${sales.length}</b></div></div>
      ${chartSVG(sales)}
    </div></div>`;
  $("overlay").hidden = false; $("overlay").dataset.lid = lid;
  fillNames();
}
const marketBlock2 = () => `Le marché s'ouvre après ${MARKET_MIN_OPENED} boosters ouverts (tu en es à ${save.opened}).`;
// design d'une annonce : les instances incluses, plus les effets de compte du vendeur en aperçu
const listingDesign = (l) => (l.dz ? { ...l.dz.acct, ...Object.fromEntries(l.dz.inst.map((x) => [x.slot, x.c])) } : null);
function listingDzHTML(l) {
  if (!l.dz) return "";
  const inc = l.dz.inst.map((x) => COS_BY_ID[x.c]).filter(Boolean), prev = Object.values(l.dz.acct).map((id) => COS_BY_ID[id]).filter(Boolean);
  return `<div class="dz-box">${inc.length ? `<p><b>Inclus avec la carte</b> (instances uniques) : ${inc.map((c) => `<span class="ti" style="color:${RAR[c.rar].color}">${esc(c.name)}</span>`).join(" ")}</p>` : ""}
    ${prev.length ? `<p class="note">Aperçu seulement, non transféré (cosmétiques de compte du vendeur) : ${prev.map((c) => esc(c.name)).join(", ")}</p>` : ""}</div>`;
}
function sellDesignHTML(id) {
  const d = cosOf(save).designs[id]; if (!d || !featureOn(CONFIG, "marcheDesign")) return "";
  const inst = Object.entries(d).filter(([, r]) => r.startsWith("i:")).map(([, r]) => refCos(save, r)).filter(Boolean);
  const acct = Object.entries(d).filter(([, r]) => r.startsWith("a:")).map(([, r]) => refCos(save, r)).filter(Boolean);
  if (!inst.length && !acct.length) return "";
  return `<label class="zopt-line"><input type="checkbox" id="sellDz" ${inst.length ? "checked" : "disabled"}> Vendre avec son design</label>
    <div class="dz-box">${inst.length ? `<p>Partiront avec la carte : ${inst.map((c) => `<span class="ti" style="color:${RAR[c.rar].color}">${esc(c.name)}</span>`).join(" ")}</p>` : `<p class="note">Aucune instance unique sur ce design : rien à transférer.</p>`}
    ${acct.length ? `<p class="note">Restent à toi (cosmétiques de compte, montrés en aperçu à l'acheteur) : ${acct.map((c) => esc(c.name)).join(", ")}</p>` : ""}</div>`;
}
function openSell(id) {
  const c = byId[id], o = own(id), p = PEOPLE[c.who], gold = !o.n && o.gold > 0;
  if (!DB || !canShare) return toast("Connecte-toi avec Discord pour vendre au marché.");
  const suggest = cote(id) || RAR[c.rar].chakra * 3;
  $("overlay").innerHTML = `<form class="sheet" id="sellForm" data-id="${id}" data-gold="${gold ? 1 : ""}" aria-label="Vendre ${esc(p.name)}">
    <div class="sheet-h"><h2>Vendre ${esc(p.name)}</h2><button class="x" type="button" data-act="close" aria-label="Fermer">✕</button></div>
    <div class="sheet-b">${cardHTML(c, { gold, design: myDesign(c.id) })}
      <p class="note" style="text-align:center">Tu en as ${gold ? o.gold : o.n}. La carte quitte ta collection pendant la vente. Tu touches l'essence dès qu'un joueur l'achète.</p>
      <div class="kv3"><div><small>Cote (médiane 30 j)</small><b>${cote(id) ? `${fmtN(cote(id))} ◆` : "—"}</b></div><div><small>Recyclage</small><b>${RAR[c.rar].chakra} ◆</b></div></div>
      ${sellDesignHTML(id)}
      <label class="field" for="sellPrice">Prix en essence ◆<input id="sellPrice" type="number" inputmode="numeric" min="5" max="9999" step="1" value="${suggest}" required></label>
      <button class="btn acc big block" type="submit">Mettre en vente</button></div>
  </form>`;
  $("overlay").hidden = false;
  $("sellPrice").focus();
}
const itemsHTML = (items, chakra) => [...items.map((it) => { const c = byId[it.id]; return `<span class="ti r-${c.rar}">${esc(nameOf(c))}${c.skin ? " · " + c.title.replace("Skin ", "") : c.id.includes("-") ? " · " + esc(c.title) : ""}${it.gold ? " ★" : ""}${it.n > 1 ? ` ×${it.n}` : ""}</span>`; }), chakra ? `<span class="ti">${chakra} ◆</span>` : ""].join("") || '<span class="mut">rien</span>';
function viewTrades() {
  if (!SRV) return `<div class="card">${offlineMsg("échanger avec les autres joueurs")}</div>`;
  const list = shared.trades || [];
  const block = (title, arr, me) => `<section class="sec"><h3>${title}</h3>${arr.length ? arr.map((t) => `<div class="trade">
      <div class="row" style="justify-content:space-between">${who(me ? t.to : t.from)}<span class="tm">${ago(t.t)}</span></div>
      <div class="trade-sides"><div><small>${me ? "Tu donnes" : "Tu reçois"}</small>${itemsHTML(t.give, t.chakra)}</div><div><small>${me ? "Tu reçois" : "Tu donnes"}</small>${itemsHTML(t.want)}</div></div>
      ${t.status === "open" ? `<div class="row">${!me ? `<button class="btn ok sm" type="button" data-trade="${t.id}" data-ta="accept">Accepter</button><button class="btn sm" type="button" data-trade="${t.id}" data-ta="refuse">Refuser</button>` : `<button class="btn sm" type="button" data-trade="${t.id}" data-ta="cancel">Annuler</button>`}</div>`
        : `<span class="pill">${{ done: "Échange fait", refused: "Refusé", cancelled: "Annulé" }[t.status] || t.status}</span>`}
    </div>`).join("") : `<p class="note">Rien pour l'instant.</p>`}</section>`;
  return `<p class="note">Pour proposer un échange, ouvre le profil d'un joueur (classement, marché, gros tirages) puis « Proposer un échange ». Les cartes proposées sont mises de côté jusqu'à la réponse.</p>
    ${block("Reçus", list.filter((t) => t.to === ME && t.status === "open"), false)}
    ${block("Envoyés", list.filter((t) => t.from === ME && t.status === "open"), true)}
    ${block("Historique", list.filter((t) => t.status !== "open").slice(0, 15), false)}`;
}
function openTradeBuilder(uid) {
  const p = profCache[uid]; if (!p || p.error) return;
  const mine = tradeOptions(save.owned, false), theirs = tradeOptions(p.owned, false);
  const opt = (o, side) => { const c = byId[o.id]; return `<label class="pick r-${c.rar}"><input type="checkbox" data-side="${side}" data-id="${o.id}" data-gold="${o.gold ? 1 : ""}"> ${esc(nameOf(c))}${c.skin ? " · " + c.title.replace("Skin ", "") : c.id.includes("-") ? " · " + esc(c.title) : ""}${o.gold ? " ★" : ""} <span>${RAR[c.rar].label} · ×${o.max}</span></label>`; };
  $("overlay").innerHTML = `<form class="sheet" id="tradeForm" data-to="${uid}" aria-label="Proposer un échange" style="max-width:760px">
    <div class="sheet-h"><h2>Échange avec <span data-uid="${uid}">…</span></h2><button class="x" type="button" data-act="close" aria-label="Fermer">✕</button></div>
    <div class="sheet-b"><div class="trade-cols">
      <fieldset><legend>Tu donnes</legend><div class="pick-list">${mine.map((o) => opt(o, "give")).join("") || '<p class="note">Rien à donner.</p>'}</div></fieldset>
      <fieldset><legend>Tu reçois</legend><div class="pick-list">${theirs.map((o) => opt(o, "want")).join("") || '<p class="note">Rien à recevoir.</p>'}</div></fieldset>
    </div>
    <p class="note" style="text-align:center">Carte contre carte de même rareté · ${Math.max(0, tradesLeftS(save))}/${TRADE_WEEK} échanges restants cette semaine</p>
    <p class="note" id="tradeFair" style="text-align:center">Choisis des cartes des deux côtés : même nombre de cartes de chaque rareté.</p>
    <button class="btn acc big block" type="submit" disabled>Envoyer la proposition</button></div>
  </form>`;
  $("overlay").hidden = false;
  fillNames();
}

// ===== Missions =====
let achF = "all";
const KDAY = ["1", "2", "3", "4", "5", "6", "★"];
function mrHTML(m, kind, id) {
  const ok = kind === "first" ? m.done : m.prog >= m.goal, goal = kind === "first" ? 1 : m.goal, prog = kind === "first" ? (m.done ? 1 : 0) : m.prog;
  return `<div class="mr ${m.claimed ? "claimed" : ""}"><div class="t">${esc(m.label)}<span>${fmtN(prog)}/${fmtN(goal)}</span></div>
    <div class="bar"><i style="width:${Math.min(1, prog / goal) * 100}%"></i></div>
    <div class="rw">${rewardShort(m.reward)}</div>
    <div class="s">${m.claimed ? "Fait ✓" : ok ? `<button class="btn gold sm" type="button" data-claim="${kind}" data-id="${id}">Réclamer</button>` : "En cours"}</div></div>`;
}
const rewardShort = (r) => [r.chakra ? `+${r.chakra} <span class="dia"></span>` : "", r.boosters ? `+${r.boosters} booster${r.boosters > 1 ? "s" : ""}` : ""].filter(Boolean).join(" · ");
function viewMissions() {
  const st = streakState(), ms = missionsToday(), ws = weeklyS(save), fs = firstStepsS(save), as = achievementsS(save);
  const d = ensureDailyS(save), w = ensureWeeklyS(save), n = toClaim();
  const nextDay = new Date(dayKey(Date.now() + 86400e3) + "T00:00:00+02:00"), nextWeek = new Date(dayKey(new Date(weekKey() + "T12:00:00Z").getTime() + 7 * 86400e3) + "T00:00:00+02:00");
  const left = (t) => { const m = Math.max(1, Math.round((t - Date.now()) / 60000)); return m >= 1440 ? `${Math.floor(m / 1440)} j ${Math.floor((m % 1440) / 60)} h` : `${Math.floor(m / 60)} h ${m % 60} min`; };
  const doneAch = as.filter((a) => a.claimed).length;
  const achList = as.filter((a) => achF === "all" || (achF === "todo" ? !a.claimed : a.claimed));
  const bonus = (label, reward, done, can, kind) => `<div class="mbonus"><span>${label} → ${rewardText(reward)}</span>${done ? "<span>Fait ✓</span>" : can ? `<button class="btn gold sm" type="button" data-claim="${kind}">Réclamer</button>` : ""}</div>`;
  return `<div class="wrap page mpage">
    ${head("Missions", "Missions <em>&</em> succès")}
    <div><button class="btn acc big" type="button" data-claim="all" ${n ? "" : "disabled"}>Tout réclamer${n ? ` · ${n}` : ""}</button></div>
    <p class="lead">Reviens chaque jour : connexion, pack du jour, missions et prédictions donnent de l'essence et des boosters en plus des gratuits.</p>
    <div class="mcols"><div class="mcol"><div class="mbox"><div class="mbox-h"><div><p class="eyebrow">Connexion</p><h2>Série de 7 jours</h2></div>
        ${st.canClaim ? `<button class="btn gold" type="button" data-claim="streak">Jour ${st.next} · ${rewardText(STREAK[st.next - 1])}</button>` : `<span class="pill">Reviens demain</span>`}</div>
      <div class="days">${STREAK.map((r, i) => { const dd = i + 1, done = dd <= st.n, now = st.canClaim && dd === st.next; return `<div class="day ${done ? "done" : ""} ${now ? "now" : ""} ${dd === 7 ? "last" : ""}">J${dd}<i>${KDAY[i]}</i><span>${r.chakra ? `+${r.chakra}` : ""}${r.chakra && r.boosters ? " " : ""}${r.boosters ? `${r.boosters}B` : ""}</span></div>`; }).join("")}</div>
      <p class="mono mut" style="margin:0;font-size:12px">${fmtN(save.counts?.login || 0) ? "" : ""}Série actuelle : ${st.n} jour${st.n > 1 ? "s" : ""} · B = booster</p></div>
    <div class="mbox"><div class="mbox-h"><div><p class="eyebrow">Du jour</p><h2>Missions du jour</h2></div><span class="pill">↻ ${left(nextDay)}</span></div>
      ${ms.map((m) => mrHTML(m, "mission", m.id)).join("")}${bonus("Toutes réclamées", DAILY_BONUS, !!d.bonus, ms.every((m) => m.claimed), "daily-bonus")}</div>
    <div class="mbox"><div class="mbox-h"><div><p class="eyebrow">Prédictions</p><h2>Prédis l'épisode</h2></div><span class="pill gold">Jusqu'à ${Math.max(PRED_REWARD, ...pred.questions.map(predRewardOf))} ◆ par bonne réponse</span></div>
      <p class="note">${openPredCount() ? `${openPredCount()} question${openPredCount() > 1 ? "s" : ""} attend${openPredCount() > 1 ? "ent" : ""} ton vote.` : "Tu as voté pour toutes les questions ouvertes."} Billy fixe la récompense de chaque question.</p>
      <button class="btn vio block" type="button" data-nav="pred">Faire mes prédictions</button></div>
    ${missionHero()}</div>
    <div class="mcol">${(save.first || {}).bonus ? "" : `<div class="mbox"><div class="mbox-h"><div><p class="eyebrow">Bienvenue</p><h2>Premiers pas</h2></div><span class="pill gold">Tout fait → ${rewardText(FIRST_BONUS)}</span></div>
      ${fs.map((f) => mrHTML(f, "first", f.id)).join("")}${bonus("Tout fait", FIRST_BONUS, false, fs.every((f) => f.claimed), "first-bonus")}</div>`}
    <div class="mbox"><div class="mbox-h"><div><p class="eyebrow">De la semaine</p><h2>Missions de la semaine</h2></div><span class="pill">↻ ${left(nextWeek)}</span></div>
      ${ws.map((m) => mrHTML(m, "weekly", m.id)).join("")}${bonus(`${WEEKLY_BONUS_N} sur ${ws.length} réclamées`, WEEKLY_BONUS, !!w.bonus, ws.filter((m) => m.claimed).length >= WEEKLY_BONUS_N, "weekly-bonus")}</div></div></div>
    <section class="sec"><div class="sec-h"><div><p class="eyebrow">Succès</p><h2>Succès <span class="mono mut" style="font-size:18px">${doneAch}/${as.length}</span></h2></div>${seg("achF", [["all", "Tous"], ["todo", "À faire"], ["done", "Obtenus"]], achF)}</div>
      <div class="ach-grid">${achList.map((a) => { const ok = a.prog >= a.goal; return `<div class="ach ${a.claimed ? "ok" : ""}"><span class="ic">${a.claimed ? "✦" : "?"}</span><div class="bd"><b>${esc(a.label)}</b><p>${esc(a.desc)}</p><div class="bar"><i style="width:${Math.min(1, a.prog / a.goal) * 100}%"></i></div><small>${fmtN(a.prog)}/${fmtN(a.goal)} · ${rewardShort(a.reward)}</small></div>${!a.claimed && ok ? `<button class="btn gold sm" type="button" data-claim="ach" data-id="${a.id}">Réclamer</button>` : ""}</div>`; }).join("") || empty("Rien ici pour l'instant.")}</div></section>
  </div>`;
}

// une illustration de l'univers pour habiller la page : un perso du QG, différent chaque jour
function missionHero() {
  const pool = CARDS.filter((c) => !c.skin && visible(c) && imgKey(c)); if (!pool.length) return "";
  const c = pool[hashOf(dayKey()) % pool.length], p = PEOPLE[c.who], q = [p.quote, ...(MORE[c.who] || [])].filter(Boolean)[0];
  return `<div class="mbox mhero"><div class="mhero-art">${cardHTML(c, { w: 150, click: true })}</div><div class="mhero-t"><p class="eyebrow">Perso du jour</p><h2>${esc(p.name)}</h2>${q ? `<p class="mhero-q">« ${esc(q)} »</p>` : ""}
    <p class="note">${has(c.id) ? "Déjà dans ta collection." : "Pas encore dans ta collection : il peut sortir de ton prochain booster."}</p><button class="btn gold" type="button" data-nav="boosters">Ouvrir un booster</button></div></div>`;
}

// ===== Prédictions (en plus de Kyara) =====
const localDT = (t) => new Date(t - new Date(t).getTimezoneOffset() * 60000).toISOString().slice(0, 16);
function predLeft(t) {
  const m = Math.max(0, Math.round((t - Date.now()) / 60000));
  return m >= 2880 ? `encore ${Math.round(m / 1440)} jours` : m >= 120 ? `encore ${Math.round(m / 60)} h` : `encore ${m} min`;
}
// qui a voté quoi, chargé une fois la bonne réponse révélée (rafraîchi toutes les minutes au plus)
function predVoters() {
  if (predVoters.busy || Date.now() - (predVoters.t || 0) < 60000) return;
  predVoters.busy = true;
  srv("pred/voters").then((r) => { predVoters.data = r.voters || {}; predVoters.t = Date.now(); if (view === "pred") draw(); }).catch(() => { predVoters.t = Date.now(); }).finally(() => { predVoters.busy = false; });
}
function viewPred() {
  if (!DB) return `<div class="wrap page">${head("Prédictions", "Prédis la <em>suite</em>")}<div class="card">${offlineMsg("faire tes prédictions")}</div></div>`;
  const qs = pred.questions, eps = [...new Set(qs.map((q) => q.ep))].sort((a, b) => b - a);
  const counts = (q) => { const c = q.options.map(() => 0); for (const v of pred.all) { const a = v.answers?.[q.id]; if (a != null && c[a] != null) c[a]++; } return c; };
  const board = Object.entries(pred.scores).sort((a, b) => b[1] - a[1]);
  const myPts = pred.scores[ME] || 0, good = qs.filter((q) => q.status === "resolved" && pred.mine[q.id] === q.answer), earned = good.reduce((t, q) => t + predRewardOf(q), 0);
  const rank = board.findIndex(([u]) => u === ME) + 1;
  if (SRV && qs.some((q) => q.status === "resolved")) predVoters();
  const qHTML = (q) => {
    const mine = pred.mine[q.id], c = IS_ADMIN ? counts(q) : null, tot = c ? c.reduce((a, b) => a + b, 0) : 0, res = q.status === "resolved", open = predOpen(q);
    const who = res ? (predVoters.data?.[q.id] || []) : [];
    const whoHTML = (i) => { const l = who.filter(([, a]) => a === i).map(([u]) => u); return l.length ? `<span class="pq-who">${l.slice(0, 10).map((u) => `<span class="pq-v">${avd(u)}${nm(u)}</span>`).join("")}${l.length > 10 ? `<span class="pq-more">+${l.length - 10}</span>` : ""}</span>` : ""; };
    return `<article class="pq ${q.status}">
      <div class="pq-h"><span class="pill gold">+${predRewardOf(q)} ◆ si bonne réponse</span><span class="pill">${q.points || 1} pt${(q.points || 1) > 1 ? "s" : ""}</span><span class="pill ${open ? "ok" : ""}">${res ? "Résultat" : !open ? "Votes fermés" : q.endsAt ? `Votes ouverts · ${predLeft(q.endsAt)}` : "Votes ouverts"}</span></div>
      <h3>${esc(q.text)}</h3>
      <div class="pq-o">${q.options.map((o, i) => { const cls = [mine === i ? "mine" : "", res && q.answer === i ? "good" : "", res && mine === i && q.answer !== i ? "bad" : ""].join(" ");
        return `<button class="${cls}" type="button" data-vote="${q.id}" data-idx="${i}" ${!open || !canShare ? "disabled" : ""} aria-pressed="${mine === i}">${c && tot ? `<span class="fill" style="width:${c[i] / tot * 100}%"></span>` : ""}<span>${esc(o)}</span>${c ? `<em>${c[i]} vote${c[i] > 1 ? "s" : ""}${tot ? ` · ${Math.round(c[i] / tot * 100)} %` : ""}</em>` : ""}${res && q.answer === i ? "<em>✓ bonne réponse</em>" : mine === i && !res ? "<em>ton choix</em>" : ""}</button>${whoHTML(i)}`; }).join("")}</div>
      ${res ? `<p class="pq-res">${mine == null ? "Tu n'avais pas voté." : mine === q.answer ? `<b style="color:var(--ok)">Bien vu !</b> +${q.points || 1} pt et +${predRewardOf(q)} ◆` : "Raté cette fois."}</p>` : mine != null ? `<p class="pq-res">Ton choix est enregistré. Tu peux le changer tant que les votes sont ouverts. Les votes de chacun se dévoilent avec la bonne réponse.</p>` : ""}
      ${IS_ADMIN ? `<div class="pq-adm">
        ${open ? `<button class="btn sm" type="button" data-pq="close" data-q="${q.id}">Fermer les votes</button>` : `<button class="btn sm" type="button" data-pq="open" data-q="${q.id}">Rouvrir</button>`}
        <select aria-label="Bonne réponse" data-pq-answer="${q.id}"><option value="">Bonne réponse…</option>${q.options.map((o, i) => `<option value="${i}" ${q.answer === i ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>
        <button class="btn gold sm" type="button" data-pq="resolve" data-q="${q.id}">Valider</button>
        <label class="note">Récompense <input type="number" min="0" max="5000" value="${predRewardOf(q)}" data-pq-reward="${q.id}" aria-label="Récompense en essence"> ◆</label>
        <label class="note">Fin des votes <input type="datetime-local" value="${q.endsAt ? localDT(q.endsAt) : ""}" data-pq-end="${q.id}" aria-label="Fin des votes"></label>
        <button class="btn sm" type="button" data-pq="delete" data-q="${q.id}">Supprimer</button></div>` : ""}
    </article>`;
  };
  const unit = (p) => `${p.pts} pt${p.pts > 1 ? "s" : ""}`; unit.short = "points";
  const bl = board.map(([uid, pts]) => ({ uid, pts, unique: (shared.players.find((p) => p.uid === uid) || {}).unique || 0 }));
  return `<div class="wrap page" style="max-width:900px">
    ${head("Prédictions", "Prédis la <em>suite</em>", "Événements, trahisons, combats, alliances : vote pour ce que tu crois qu'il va se passer dans le prochain épisode. Chaque bonne réponse rapporte des points et l'essence fixée par Billy. Les meilleurs prophètes gagnent des bonus dans l'anime.")}
    <div class="card stat4"><div><b>${myPts}</b><span>Tes points</span></div><div class="acc"><b>${good.length}</b><span>Bonnes réponses</span></div><div><b>${fmtN(earned)}</b><span>Essence gagnée</span></div><div><b>${rank ? `#${rank}` : "—"}</b><span>Ton rang</span></div></div>
    ${sharedNote()}
    ${qs.length ? eps.map((ep) => `<section class="sec"><div class="sec-h"><h2>Épisode ${ep}</h2><span class="mono mut" style="font-size:13px">${qs.filter((q) => q.ep === ep).length} question${qs.filter((q) => q.ep === ep).length > 1 ? "s" : ""}</span></div>${qs.filter((q) => q.ep === ep).map(qHTML).join("")}</section>`).join("")
      : `<div class="card">${empty("Pas encore de prédiction. Billy les publie après chaque épisode.")}</div>`}
    <section class="sec"><h2>Meilleurs prophètes</h2>
      ${bl.length ? `${podiumHTML(bl, (p) => p.pts, unit)}<div class="rank-list">${bl.slice(3, 30).map((p, i) => `<button class="rk ${p.uid === ME ? "me" : ""}" type="button" data-nav="profil" data-p="${p.uid}"><span class="no">${i + 4}</span>${avd(p.uid)}<span class="nm" data-uid="${p.uid}">…</span><span class="v">${p.pts}<small>points</small></span></button>`).join("")}</div>` : `<p class="note">Le classement apparaît dès que Billy valide une première bonne réponse.</p>`}</section>
    ${IS_ADMIN ? `<form class="card sec" id="pqForm"><p class="eyebrow">Admin · nouvelle question</p>
      <label class="field" for="pqText">Question<input id="pqText" type="text" maxlength="160" placeholder="Qui va retrouver Byakko en premier ?"></label>
      <label class="field" for="pqOptions">Réponses possibles (une par ligne, 6 max)<textarea id="pqOptions" rows="4" placeholder="Kuradai&#10;Stalk&#10;Personne"></textarea></label>
      <div class="row"><label class="field" for="pqEp" style="flex:1">Épisode<input id="pqEp" type="number" min="1" max="50" value="${eps[0] || 2}"></label>
        <label class="field" for="pqPoints" style="flex:1">Points<input id="pqPoints" type="number" min="1" max="10" value="1"></label>
        <label class="field" for="pqReward" style="flex:1">Récompense ◆<input id="pqReward" type="number" min="0" max="5000" value="${PRED_REWARD}"></label>
        <label class="field" for="pqDur" style="flex:1">Temps pour répondre<select id="pqDur">${[[0, "Sans limite"], [1, "1 heure"], [3, "3 heures"], [6, "6 heures"], [12, "12 heures"], [24, "24 heures"], [48, "2 jours"], [72, "3 jours"], [168, "1 semaine"]].map(([h, l]) => `<option value="${h}" ${h === 48 ? "selected" : ""}>${l}</option>`).join("")}</select></label></div>
      <button class="btn acc" type="submit">Publier la question</button></form>` : ""}
  </div>`;
}

// ===== Classement =====
const BOARDS = [
  ["collection", "collection", "Collection", (p) => p.unique ?? p.cards, "cartes", "Classés par nombre de cartes différentes. Les Mythiques départagent les égalités."],
  ["mythics", "couronne", "Mythiques", (p) => p.mythics || 0, "mythiques", "Classés par nombre de Mythiques différentes."],
  ["skins", "atelier", "Skins", (p) => p.skins || 0, "skins", "Classés par nombre de skins des membres du QG."],
  ["pred", "pred", "Prédictions", (p) => pred.scores[p.uid] || 0, "points", "Classés par points de prédiction sur les épisodes."],
  ["ach", "classement", "Succès", (p) => p.ach || 0, "succès", "Classés par nombre de succès obtenus."],
  ["commerce", "market", "Commerce", (p) => (p.sales || 0) + (p.trades || 0), "ventes et échanges", "Classés par ventes au marché et échanges réussis."],
  ["boosters", "boosters", "Boosters", (p) => p.opened || 0, "boosters", "Classés par nombre de boosters ouverts."],
];
let rankQ = "";
function viewClassement() {
  const B = BOARDS.find((b) => b[0] === boardTab) || BOARDS[0], [, , , score, unitTxt, desc] = B;
  const list = [...shared.players].sort((a, b) => score(b) - score(a) || (b.mythics || 0) - (a.mythics || 0));
  const unit = (p) => `${fmtN(score(p))} ${unitTxt}`; unit.short = unitTxt;
  const q = rankQ.trim().toLowerCase();
  return `<div class="wrap page" style="max-width:900px">
    ${head("Classement", "Les meilleurs collectionneurs")}
    <div class="chips chips-wrap">${BOARDS.map(([k, kj, l]) => `<button class="chip" type="button" data-seg="rankTab" data-v="${k}" aria-pressed="${boardTab === k}"><span class="kj">${ico(kj)}</span>${l}</button>`).join("")}</div>
    <p class="lead">${desc}</p>
    <div class="search">${icon.search}<input class="in" id="rankQ" type="search" placeholder="Chercher un joueur pour se comparer…" value="${esc(rankQ)}"></div>
    ${list.length ? `${q ? "" : podiumHTML(list, score, unit)}
      <div class="rank-list" id="rankList">${list.map((p, i) => ({ p, i })).slice(q ? 0 : 3, 60).map(({ p, i }) => `<button class="rk ${p.uid === ME ? "me" : ""}" type="button" data-nav="profil" data-p="${p.uid}" data-rk="${p.uid}"><span class="no">${i + 1}</span>${avd(p.uid)}<span class="nm"><span data-uid="${p.uid}">…</span> ${TITLE_BY_ID[p.title] ? ttagOf(TITLE_BY_ID[p.title], "sm") : `<span class="tit">${titleOf(p.unique || 0)[0]}</span>`}</span><span class="v">${fmtN(score(p))}<small>${unitTxt}</small></span></button>`).join("")}</div>`
      : empty(sharedNote() ? "Le classement est visible quand tu joues avec le QG." : "Le classement apparaît dès que des joueurs ouvrent des boosters.")}
  </div>`;
}

// ===== Profil public =====
const profCache = {};
async function loadProfile(uid) {
  if (!SRV) return;
  try { profCache[uid] = await (await fetch("/api/game/profile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ uid }) })).json(); }
  catch (e) { profCache[uid] = { error: "Profil indisponible." }; }
  if (view === "profil" && param === uid) draw();
}
function selfProfile() {
  const owned = Object.fromEntries(Object.entries(save.owned).filter(([, o]) => o.n + o.gold > 0).map(([id, o]) => [id, [o.n, o.gold]]));
  const featured = save.featured && has(save.featured) ? save.featured : null;
  const designs = Object.fromEntries([...(save.showcase || []), ...(featured ? [featured] : [])].map((id) => [id, myDesign(id)]).filter(([, d]) => d));
  return { uid: ME || "moi", stats: stats(), owned, showcase: save.showcase || [], wish: save.wish || [], featured, designs, titles: save.titles || [], titleShown: save.titleShown || null };
}
// ===== Titres : ceux qu'on a (le sien se choisit d'un toucher) et, sur son profil, ceux qui restent à gagner =====
let titlesAll = false;
function titlesSection(p, isMe) {
  const own = new Set((p.titles || []).map(titleIdOf).filter(Boolean));
  if (!isMe && !own.size) return "";
  const prog = isMe ? Object.fromEntries(titlesProgressS(save).map((x) => [x.id, x])) : {};
  const item = (t) => {
    const has = own.has(t.id), on = p.titleShown === t.id, pr = prog[t.id];
    const tag = `<span class="ttl-k">${ico(TITLE_ICON[t.cat])}</span><span class="ttl-t"><b>${esc(t.name)}</b><small>${esc(t.desc)}${!has && pr?.goal > 1 ? ` · ${fmtN(pr.prog)}/${fmtN(pr.goal)}` : ""}</small></span>`;
    return isMe && has ? `<button class="ttl-i r-${t.rar} ${on ? "on" : ""}" type="button" data-title="${on ? "" : t.id}" aria-pressed="${on}" title="${on ? "Ne plus l'afficher" : "L'afficher près de ton pseudo"}">${tag}${on ? `<em>Affiché</em>` : ""}</button>`
      : `<div class="ttl-i r-${t.rar} ${has ? "" : "lock"}">${tag}</div>`;
  };
  const list = TITLES.filter((t) => own.has(t.id) || (isMe && titlesAll));
  const cats = Object.entries(TITLE_CATS).map(([k, l]) => [l, list.filter((t) => t.cat === k)]).filter(([, l]) => l.length);
  return `<section class="sec ttl-sec"><p class="eyebrow mut">Titres</p><h2>${isMe ? "Mes titres" : "Ses titres"} <small class="note">${own.size}/${TITLES.length}</small></h2>
    ${isMe ? `<p class="note">${own.size ? "Touche un titre pour l'afficher près de ton pseudo (classement, Confrontation, Défilé)." : "Aucun titre pour l'instant : ils se gagnent en ouvrant, en invoquant, en jouant à Confrontation, au Défilé et aux prédictions."}</p>` : ""}
    ${cats.map(([l, ts]) => `<p class="ttl-cat">${l}</p><div class="ttl-grid">${ts.map(item).join("")}</div>`).join("")}
    ${isMe ? `<button class="btn sm" type="button" data-act="titles-all">${titlesAll ? "Masquer les titres à gagner" : `Voir les ${TITLES.length - own.size} titres à gagner`}</button>` : ""}</section>`;
}
// un titre vient d'être gagné : pendant une ouverture il attend le récapitulatif, sinon il s'annonce tout de suite
let titlesPending = [];
function announceTitles(ids) {
  ids = (ids || []).filter((id) => TITLE_BY_ID[id] && !titlesPending.includes(id));
  if (!ids.length) return;
  titlesPending.push(...ids);
  if (!opening && !busy && !zBusy) flushTitles();
}
const takeTitles = () => { const l = titlesPending; titlesPending = []; return l; };
function titlesWonHTML(ids) {
  return ids?.length ? `<div class="ttl-won">${ids.map((id) => { const t = TITLE_BY_ID[id]; return `<button class="ttl-i r-${t.rar} won" type="button" data-title="${t.id}"><span class="ttl-k">${ico(TITLE_ICON[t.cat])}</span><span class="ttl-t"><small>Nouveau titre</small><b>${esc(t.name)}</b><small>${esc(t.desc)}</small></span><em>${save.titleShown === t.id ? "Affiché" : "L'afficher"}</em></button>`; }).join("")}</div>` : "";
}
function flushTitles() {
  const ids = takeTitles(); if (!ids.length) return;
  if (!$("overlay").hidden) return toast(`Nouveau titre : ${ids.map((id) => TITLE_BY_ID[id].name).join(", ")} !`);
  $("overlay").innerHTML = `<div class="sheet ttl-sheet" role="dialog" aria-modal="true" aria-label="Nouveau titre"><div class="sheet-h"><h2>Titre débloqué !</h2><button class="x" type="button" data-act="close" aria-label="Fermer">✕</button></div>
    <div class="sheet-b">${titlesWonHTML(ids)}<p class="note">Il apparaît près de ton pseudo dans le classement, en Confrontation et au Défilé. Tu peux en changer sur ton profil.</p><button class="btn gold big block" type="button" data-act="close">Super</button></div></div>`;
  $("overlay").hidden = false;
}
async function setShownTitle(id) {
  try { if (SRV) await srv("title", { id }); else { const r = showTitleS(save, id); if (r.error) throw new Error(r.error); persist(); } }
  catch (e) { return toast(e.message); }
  toast(id ? `Titre affiché : ${TITLE_BY_ID[id].name}.` : "Plus aucun titre affiché.");
  if (opening) drawOpening(); else if (!$("overlay").hidden && $("overlay").querySelector(".ttl-sheet")) $("overlay").querySelectorAll("[data-title] em").forEach((e) => { e.textContent = e.parentElement.dataset.title === id ? "Affiché" : "L'afficher"; }); else draw();
}
// tests sur un vrai compte (dev et admin) : repartir de zéro, puis revenir à son vrai compte
let devBackup;
let devLocal = false;
function testZone() {
  if (devBackup === undefined) { devBackup = null; srv("dev/backup").then((r) => { devBackup = r.backup || false; devLocal = !!r.local; draw(); }).catch(() => { devBackup = false; }); }
  const b = devBackup;
  const onTest = !!ACCT?.test;
  return `<section class="sec card test-zone"><p class="eyebrow">Tests · dev et admin seulement</p><h2>Compte vierge</h2>
    <p class="note">Un deuxième compte, rien qu'à toi, qui démarre vide comme un nouveau joueur. Ton vrai compte n'est pas touché : garde-le dans une fenêtre et ouvre le compte vierge dans une fenêtre privée (connecte-toi avec Discord puis clique ici) pour jouer avec les deux en même temps.</p>
    <div class="row">${onTest ? `<span class="pill gold">Tu es sur ton compte vierge</span><a class="btn gold" href="/auth/test?back=1">Revenir à mon vrai compte</a>` : `<a class="btn gold" href="/auth/test">Ouvrir mon compte vierge</a>`}</div>
    <h2 style="margin-top:18px">Repartir de zéro</h2>
    <p class="note">Ton compte redevient celui d'un nouveau joueur (aucune carte, essence et boosters de départ), pour tester le jeu comme quelqu'un qui arrive. Ton vrai compte est mis de côté et tu le récupères en un clic. Les cartes que tu as en vente au marché restent en vente.</p>
    ${b ? `<p class="note"><b>Ton vrai compte est sauvegardé</b> depuis le ${new Date(b.t).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })} : ${b.cartes} cartes, ${b.opened} boosters ouverts, ${fmtN(b.chakra)} ◆. Repartir de zéro encore une fois ne l'écrase pas.</p>` : ""}
    <div class="row"><button class="btn acc" type="button" data-act="dev-reset">Repartir de zéro</button>${b ? `<button class="btn gold" type="button" data-act="dev-restore">Récupérer mon vrai compte</button>` : ""}</div>
    ${devLocal ? `<h2 style="margin-top:18px">Ressources de test (serveur local)</h2><p class="note">Seulement sur ton serveur local : +50 000 ◆ et 60 boosters gratuits pour tout essayer sans attendre. N'existe pas en ligne.</p>
    <div class="row"><button class="btn gold" type="button" data-act="dev-grant">Me donner 50 000 ◆ et 60 boosters</button></div>` : ""}</section>`;
}
function viewProfil() {
  const uid = param, isMe = !uid || uid === "moi" || uid === ME;
  let p = isMe ? selfProfile() : profCache[uid];
  if (!isMe && !SRV) return `<div class="wrap page">${empty("Les profils des autres joueurs sont visibles sur le site du QG, avec ton compte Discord.")}</div>`;
  if (!p) { loadProfile(uid); return `<div class="wrap page">${empty("Chargement du profil…")}</div>`; }
  if (p.error) return `<div class="wrap page">${empty(esc(p.error))}</div>`;
  const st = p.stats, ids = Object.keys(p.owned).filter((id) => byId[id]);
  const [tk, tl] = titleOf(st.unique);
  const show = (p.showcase || []).filter((id) => byId[id]);
  const dupes = ids.filter((id) => p.owned[id][0] > 1 && visible(byId[id])).sort((a, b) => RAR[byId[b].rar].rank - RAR[byId[a].rar].rank);
  const facs = FACS().map((f) => { const list = ALL_CARDS.filter((c) => facOf(c) === f); return [f, list.filter((c) => ids.includes(c.id)).length, list.length]; });
  const realUid = isMe ? ME : uid;
  return `<div class="pf-head"><div class="wrap head">
      <span class="pf-av">${realUid ? `<img data-uid="${realUid}" alt="" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">` : `<span>${esc((ACCT?.name || "I")[0])}</span>`}${decoSVG(isMe ? decoOfUid(ME) : (p.deco ? DECO_BY_ID[p.deco] : decoOfUid(uid)))}</span>
      <p class="eyebrow">Collectionneur</p>
      <div class="pf-name"><h1 style="margin:0">${realUid ? `<span data-uid="${realUid}">…</span>` : esc(ACCT?.name || "Invité")}</h1><span class="seal"><b>${tk}</b><small>${tl.toUpperCase()}</small></span></div>
      ${TITLE_BY_ID[p.titleShown] ? `<div class="pf-ttl">${ttagOf(TITLE_BY_ID[p.titleShown], "lg")}</div>` : ""}
      ${st.since ? `<p class="note">Joue depuis le ${new Date(st.since).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>` : ""}
      <div class="row">${!isMe ? `<button class="btn acc" type="button" data-propose="${uid}" ${save.opened < MARKET_MIN_OPENED ? "disabled" : ""}>⇄ Proposer un échange</button>${SRV && featureOn(CONFIG, "confrontation") ? `<button class="btn" type="button" data-cfdefi="${uid}">${ico("confront")} Défier en duel</button>` : ""}` : `<button class="btn" type="button" data-nav="collection">Ma collection</button>`}
        <button class="btn" type="button" data-act="copy-link">Copier le lien</button></div>
    </div></div>
    <div class="wrap page" style="padding-top:24px">
    <div class="card stat4"><div><b>${st.unique}<small>/${ALL_CARDS.length}</small></b><span>Cartes uniques</span></div><div class="acc"><b>${(st.unique / ALL_CARDS.length * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %</b><span>Complétion</span></div><div class="acc"><b>${st.mythics}</b><span>Mythiques</span></div><div><b>${fmtN(st.opened)}</b><span>Boosters</span></div></div>
    ${p.featured && byId[p.featured] ? `<section class="sec zfeat"><p class="eyebrow mut">Carte vedette</p><div class="zfeat-row">${cardHTML(byId[p.featured], { click: true, design: p.designs?.[p.featured], present: true })}<div><h2>${esc(nameOf(byId[p.featured]))}</h2><p class="note">${isMe ? "Ta carte vedette, avec son design de l'Atelier. Elle s'affiche en premier sur ton profil." : "Sa carte vedette, avec son design de l'Atelier."}</p>${isMe ? `<button class="btn sm" type="button" data-nav="atelier" data-p="${p.featured}">Modifier à l'Atelier</button>` : ""}</div></div></section>` : isMe ? `<section class="sec"><p class="eyebrow mut">Carte vedette</p><p class="note">Choisis une carte vedette depuis l'Atelier Arcanique : elle s'affichera ici avec son design.</p></section>` : ""}
    ${titlesSection(p, isMe)}
    <section class="sec"><p class="eyebrow mut">Vitrine</p><h2>${isMe ? "Ma vitrine" : "Sa vitrine"}</h2>
      ${show.length ? `<div class="vitrine">${show.map((id, i) => cardHTML(byId[id], { click: true, design: p.designs?.[id], tag: i === 0 ? "★ FAVORITE" : "" })).join("")}</div>` : `<p class="note">${isMe ? "Choisis jusqu'à 4 cartes depuis leur fiche : « Vitrine »." : "Pas encore de vitrine."}</p>`}</section>
    <section class="sec"><h2>Collection</h2><p class="note">${st.unique} cartes uniques</p>
      <div class="rarbars">${RANKS.slice().reverse().map((k) => `<div style="--c:${RAR[k].color}"><small><i></i>${RAR[k].label}</small><b>${ids.filter((id) => byId[id].rar === k).length}</b></div>`).join("")}</div></section>
    <section class="sec"><h2>${isMe ? "Mes factions" : "Ses factions"}</h2><div class="sbars">${facs.map(([f, n, t]) => `<div class="sbar" style="cursor:default"><span>${facLabel(f)}</span><span class="m"><i style="width:${n / t * 100}%"></i></span><span class="v">${n}/${t}</span></div>`).join("")}</div></section>
    ${!isMe ? `<section class="sec"><h2>Ses doublons à échanger</h2>${dupes.length ? `<div class="row">${dupes.slice(0, 40).map((id) => `<span class="ti r-${byId[id].rar}">${esc(nameOf(byId[id]))}${byId[id].skin ? " · " + byId[id].title.replace("Skin ", "") : ""} ×${p.owned[id][0] - 1}</span>`).join("")}</div>` : `<p class="note">Pas de doublon pour l'instant.</p>`}</section>` : ""}
  </div>`;
}

// ===== Pages d'infos =====
function viewRaretes() {
  const per = (k) => (SLOT[k] * (PACK - 1) + (LAST[k] || 0)) / PACK;
  const ex = (k) => CARDS.filter((c) => c.rar === k).sort((a, b) => visible(b) - visible(a) || CATALOG_NO[a.id] - CATALOG_NO[b.id])[0];
  const DESC = { c: "Cadre gris mat, aucun effet.", pc: "Cadre vert, filet lumineux.", r: "Cadre bleu, halo externe léger.", e: "Cadre violet, premier reflet holo animé.", l: "Cadre or brossé, holo et forte lueur.", m: "Cadre rouge, holo arc-en-ciel et aura de feu." };
  const ROLE = { c: "Figurants et persos de passage", pc: "Persos secondaires", r: "Persos qui comptent dans l'histoire", e: "Persos clés d'un arc", l: "Les grandes figures de l'anime", m: "Les plus puissants et les plus importants" };
  return `<div class="wrap page">
    ${head("Système de rareté", "De Commune à Mythique", "La rareté d'un perso dépend de son importance dans l'anime de Billy : plus il pèse dans l'histoire, plus sa carte est rare.")}
    <div class="rar-ex">${RANKS.map((k) => { const c = ex(k); return `<div>${c ? cardHTML(c, { soon: !visible(c), click: visible(c) }) : ""}<h3 style="--c:${RAR[k].color}"><i></i>${RAR[k].label}</h3><p class="mono">${pct(per(k) / 100)} des cartes tirées</p><p>${ROLE[k]}</p><p>${DESC[k]}</p></div>`; }).join("")}</div>
    <section class="sec prose"><h2>Et aussi</h2>
      <p><b style="color:var(--gold)">Dorée.</b> Tous les ${GOLD_EVERY} boosters, ta meilleure carte sort dorée (et ${pct(GOLD_CHANCE)} de chance à chaque carte). Une dorée vaut trois fois plus au recyclage.</p>
      <p><b style="color:var(--r-e)">Skins du QG.</b> Les membres du serveur ont chacun six skins, comme dans LoL : ${SKIN_LINES.map((l) => `${l.name} (${RAR[l.rar].label})`).join(", ")}. Ils sortent du Coffre hextech ou en combinant ${CRAFT_COST} doublons.</p>
      <p><b style="color:var(--r-l)">Légendaire garantie.</b> Si tu n'as pas eu de Légendaire ni de Mythique depuis ${LEGEND_PITY} boosters, le suivant t'en donne une. La Mythique, elle, n'est jamais garantie.</p>
      <p><b style="color:var(--wish)">Booster divin.</b> Environ 1 booster sur ${Math.round(1 / DIVINE_CHANCE)} est divin : que des Légendaires et des Mythiques.</p>
      <p><b>POW et AURA.</b> Les deux chiffres en bas de chaque carte montrent la puissance du perso. Plus la carte est rare, plus ils sont hauts.</p></section>
  </div>`;
}
function viewRegles() {
  return `<div class="wrap page">${head("Règles", "Les règles du QG")}
    <ol class="rules">
      <li><b>Pas de triche.</b> Scripts, robots, failles ou outils qui jouent à ta place sont interdits. Une faille trouvée se signale dans Avis et bugs.</li>
      <li><b>Respect au comptoir.</b> Insultes, harcèlement et spam dans le chat mènent à la sourdine ou au bannissement.</li>
      <li><b>Pas d'argent réel.</b> On ne vend ni cartes ni comptes contre de l'argent.</li>
      <li><b>Un seul compte par personne.</b> Les échanges trop déséquilibrés sont bloqués pour empêcher de faire passer des cartes d'un compte à un autre.</li>
      <li><b>Pas de spoil.</b> Les persos des prochains épisodes restent cachés jusqu'à ce que Billy les débloque. Ne les révèle pas aux autres.</li>
      <li><b>Prédictions honnêtes.</b> Une seule réponse par question, modifiable tant que les votes sont ouverts. Billy valide les bonnes réponses.</li>
      <li><b>Billy a le dernier mot.</b> Il crée l'anime et administre le jeu. Une pratique qui n'est pas citée ici n'est pas forcément autorisée.</li>
    </ol></div>`;
}
function viewInfos() {
  return `<div class="wrap page">${head("Infos", "Re Zéro : LoL")}
    <div class="prose">
      <p>Re Zéro : LoL est l'anime que Billy réalise sur les membres du serveur Discord <b>QG de Shinjuku</b>. Un épisode sort environ chaque mois. Ce jeu de cartes reprend tous ses persos.</p>
      <h2>L'histoire</h2>
      <p>Les membres du QG sont mystérieusement téléportés dans un monde inconnu et dispersés aux quatre coins de celui-ci. Certains apparaissent seuls, d'autres, comme Billy et Seb qui jouaient ensemble à ce moment-là, se retrouvent au même endroit. Chacun possède désormais un pouvoir unique qu'il devra apprendre à maîtriser pour survivre. Leur objectif : retrouver tous les membres du QG, se réunir et trouver un moyen de rentrer chez eux sans laisser personne derrière.</p>
      <p>Dans l'épisode 1, Billy et Seb arrivent ensemble dans une grande ville, Mojo se fait courser par les gardes, Byakko et Stalk tombent sur Nestor, qui les sauve sur son destrier volant. Shiro se réveille aux côtés de Sultran'Zahar, Mahed est forcé d'affronter Reichi, et Sasori, Iouaf et Sakuto se retrouvent dans une taverne… jusqu'à ce que la nuit tourne mal pour Sakuto.</p>
      <p><a class="btn" href="https://www.youtube.com/watch?v=mFQ4USNq0k8" target="_blank" rel="noopener">Revoir l'épisode 1</a></p>
      <h2>Les cartes</h2>
      <p>Le numéro d'une carte (par exemple ${noOf(CARDS[0].id)}) est sa place dans le catalogue, des plus rares aux plus communes. Les persos d'un épisode ne peuvent sortir des boosters que lorsque Billy a débloqué cet épisode pour toi : pas de spoil.</p>
      <h2>Le classement et les échanges</h2>
      <p>Le classement principal compte le nombre de cartes différentes. Les échanges équilibrés passent toujours, mais les gros dons d'un joueur à un autre sont bloqués pour que le classement reste juste.</p>
      <h2>Hébergement et données</h2>
      <p>Le site est hébergé sur Cloudflare. La connexion se fait avec ton compte Discord : on garde ton pseudo, ton avatar et ta collection, rien d'autre. Seuls les membres du serveur QG de Shinjuku peuvent jouer en ligne.</p>
      <h2>Contact</h2>
      <p>Une question, un bug, une idée : passe par <button class="link" type="button" data-nav="avis">Avis et bugs</button> ou écris au comptoir.</p>
    </div></div>`;
}
const CHANGELOG = [
  ["21 octobre 2026", "Mise à jour 2.0", [["n", "Toute l'interface reprend celle de Kyara : menu, accueil, collection, marché, missions, classement, profils, fiches."], ["n", "Prédictions : Billy fixe l'essence gagnée pour chaque bonne réponse."], ["n", "Nouvelles missions et succès liés aux prédictions, au chat et aux fiches."], ["n", "Wiki des persos, page Raretés, Règles, Infos, Avis et bugs."]]],
  ["21 octobre 2026", "Mise à jour 1.7", [["n", "Comptoir : le chat du QG, avec mentions @Nom et cartes à montrer."], ["n", "Notifications : ventes, échanges, mentions, nouvel épisode, prédictions, annonces de Billy."]]],
  ["21 octobre 2026", "Mise à jour 1.6", [["n", "Missions de la semaine, premiers pas, succès, pack du jour et booster divin."]]],
  ["20 octobre 2026", "Mise à jour 1.5", [["n", "Coffre hextech façon LoL et 90 skins des membres du QG, du Chroma au Prestige."], ["n", "Échanges entre joueurs, profils, vitrine, liste d'envies."], ["a", "Le serveur décide des tirages et de l'économie : plus de triche possible."]]],
  ["19 octobre 2026", "Mise à jour 1.0", [["n", "Connexion Discord réservée au QG de Shinjuku, cartes débloquées par épisode, rôle admin pour Billy."], ["n", "Prédictions sur l'épisode 2."]]],
];
function viewNouveautes() {
  const L = { n: "Nouveau", a: "Amélioré", c: "Corrigé" };
  return `<div class="wrap page">${head("Nouveautés", "Quoi de neuf ?")}
    <div class="log">${CHANGELOG.map(([d, v, items]) => `<h3>${v}<small>${d}</small></h3>${items.map(([k, t]) => `<div class="${k}"><em>${L[k]}</em><span>${esc(t)}</span></div>`).join("")}`).join("")}</div></div>`;
}
let myStars = 0;
function viewAvis() {
  const rv = shared.avis || [], mine = rv.find((r) => r.uid === ME);
  if (!myStars && mine) myStars = mine.stars;
  const avg = rv.length ? rv.reduce((a, r) => a + r.stars, 0) / rv.length : 0;
  return `<div class="wrap page" style="max-width:860px">${head("Avis et bugs", "Ton avis compte", "Dis ce que tu penses du jeu, propose des idées ou signale un bug. Billy lit tout.")}
    ${DB && canShare ? `<form class="card sec" id="avisForm"><h3>${mine ? "Modifier mon avis" : "Donner mon avis"}</h3>
      <div class="starpick">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-star="${n}" class="${n <= myStars ? "on" : ""}" aria-label="${n} étoile${n > 1 ? "s" : ""}">★</button>`).join("")}</div>
      <textarea class="in" id="avisText" rows="3" maxlength="400" placeholder="Ce que tu aimes, ce qui manque…">${esc(mine?.text || "")}</textarea>
      <button class="btn acc" type="submit">Publier mon avis</button></form>
    <form class="card sec" id="bugForm"><h3>Signaler un bug</h3><p class="note">Décris ce que tu faisais et ce qui s'est passé. Seul Billy voit les signalements.</p>
      <textarea class="in" id="bugText" rows="3" maxlength="800" placeholder="J'ai ouvert un booster et…"></textarea><button class="btn" type="submit">Envoyer à Billy</button></form>`
      : `<div class="card">${offlineMsg("donner ton avis")}</div>`}
    <section class="sec"><h2>Ce qu'en disent les joueurs</h2>
      ${rv.length ? `<div class="rating"><b>${avg.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}</b><span class="stars">${"★".repeat(Math.round(avg))}${"☆".repeat(5 - Math.round(avg))}</span><span class="mono mut" style="font-size:13px">${rv.length} avis</span></div>${rv.map(reviewHTML).join("")}` : `<p class="note">Pas encore d'avis. Sois le premier !</p>`}</section>
  </div>`;
}
async function sendAvis() {
  if (!myStars) return toast("Choisis une note de 1 à 5 étoiles.");
  try { await DB.doc("avis/" + ME).set({ uid: ME, stars: myStars, text: $("avisText").value.trim().slice(0, 400), t: Date.now() }); toast("Merci pour ton avis !"); }
  catch (e) { toast("Ton avis n'est pas passé."); }
}
async function sendBug() {
  const text = $("bugText").value.trim(); if (!text) return toast("Décris le bug.");
  try { await DB.collection("bugs").add({ uid: ME, text: text.slice(0, 800), t: Date.now() }); $("bugText").value = ""; toast("Merci, Billy a reçu ton signalement."); }
  catch (e) { toast("Le signalement n'est pas passé."); }
}

// ===== Admin =====
let bugs = null;
function viewAdmin() {
  if (!IS_ADMIN) return `<div class="wrap page">${empty("Cette page est réservée à Billy.")}</div>`;
  const ids = [...new Set([...shared.players.map((p) => p.uid), ...Object.keys(CONFIG.progress), ...Object.keys(CONFIG.extra)])];
  const chars = Object.entries(PEOPLE).sort((a, b) => Object.keys(FACTIONS).indexOf(a[1].fac) - Object.keys(FACTIONS).indexOf(b[1].fac));
  return `<div class="wrap page" style="max-width:900px">${head("Admin", "Qui peut packer quoi", "Chaque perso est rattaché à l'épisode où il apparaît. Un joueur ne peut packer que les persos des épisodes qu'il a atteints : les autres restent cachés. Tu peux aussi offrir un perso en bonus à un joueur, par exemple pour une bonne prédiction.")}
    <div class="card sec"><label class="field" for="cfgDef">Épisode atteint par défaut<select id="cfgDef" data-cfg="def">${epOptions(CONFIG.def)}</select></label><p class="note">Passer à l'épisode suivant prévient tout le monde dans les notifications.</p></div>
    <div class="card sec"><h3>Créateur</h3><p class="note">Ajoute des persos au fil des épisodes, de nouvelles cartes, retouche l'existant ou crée des cosmétiques. Publié tout de suite.</p><button class="btn gold" type="button" data-nav="createur">Ouvrir le Créateur</button></div>
    <div class="card sec"><h3>Confrontation : branches des cartes</h3><p class="note">Chaque carte a une branche (son pouvoir en partie), avec une variante possible selon la rareté. Une proposition est en place : à toi de l'ajuster.</p><button class="btn" type="button" data-nav="branches">Régler les branches</button></div>
    <div class="card sec"><h3>Nouveautés ouvertes aux joueurs</h3><p class="note">Une nouveauté fermée disparaît du menu et le serveur refuse ses actions. Rien n'est perdu : on la rouvre quand on veut.</p>
      <div class="feat-list">${FEATURES.map(([k, l]) => `<label class="zopt-line"><input type="checkbox" data-feat="${k}" ${featureOn(CONFIG, k) ? "checked" : ""}> ${l}</label>`).join("")}</div></div>
    ${SRV ? `<form class="card sec" id="annForm"><h3>Annonce</h3><p class="note">Elle s'affiche au comptoir et en notification pour tout le QG.</p><textarea class="in" id="annText" rows="2" maxlength="300" placeholder="Ex. : l'épisode 2 sort samedi à 18 h !"></textarea><button class="btn acc" type="submit">Envoyer l'annonce</button></form>` : ""}
    <section class="sec"><h2>Joueurs · ${ids.length}</h2>${ids.length ? `<div class="adm-list">${ids.map((uid) => `<div class="adm-row">${who(uid)}
        <select aria-label="Épisode atteint" data-prog="${uid}"><option value="" ${CONFIG.progress[uid] == null ? "selected" : ""}>Par défaut (${epLabel(CONFIG.def)})</option>${epOptions(CONFIG.progress[uid])}</select>
        <button class="btn sm" type="button" data-bonus="${uid}">Bonus · ${(CONFIG.extra[uid] || []).length}</button></div>`).join("")}</div>` : `<p class="note">Les joueurs apparaissent ici dès qu'ils ouvrent l'app.</p>`}</section>
    <section class="sec"><h2>Persos par épisode</h2><div class="adm-list">${chars.map(([k, p]) => `<div class="adm-row"><span class="adm-name"><b>${esc(p.name)}${k === "monoco2" ? " (singe)" : ""}</b><span>${FACTIONS[p.fac].label}</span></span><select aria-label="Épisode de ${esc(p.name)}" data-ep="${k}">${epOptions(epOf(k), true)}</select></div>`).join("")}</div></section>
  </div>`;
}
// ===== Dev : outils techniques (Reichi) =====
const devData = { stats: null, audit: null, loading: false };
async function loadDev(force) {
  if (!SRV || devData.loading || (devData.stats && !force)) return;
  devData.loading = true;
  const get = (a) => fetch("/api/game/" + a, { credentials: "same-origin" }).then((r) => r.json()).catch(() => ({ error: "Indisponible." }));
  const [stats, audit, b] = await Promise.all([get("dev/stats"), get("dev/audit"), DB.collection("bugs").orderBy("t", "desc").limit(50).get().catch(() => null)]);
  devData.stats = stats; devData.audit = audit; bugs = b ? b.docs.map((d) => ({ id: d.id, ...d.data() })) : [];
  devData.loading = false;
  if (view === "dev") draw();
}
function viewDev() {
  if (!IS_DEV) return `<div class="wrap page">${empty("Cette page est réservée au développeur.")}</div>`;
  if (!SRV) return `<div class="wrap page">${empty("La vue dev marche sur le site en ligne, connecté avec Discord.")}</div>`;
  loadDev();
  const st = devData.stats, au = devData.audit;
  const kv = (label, v) => `<div><b>${v ?? "—"}</b><span>${label}</span></div>`;
  return `<div class="wrap page" style="max-width:1000px">${head("Dev", "Outils du développeur", "Ce qui se passe sous le capot : état du serveur, contrôle des comptes et bugs signalés. Tout ici est en lecture seule.")}
    <div class="row"><button class="btn sm" type="button" data-act="dev-refresh">↻ Actualiser</button>${st?.now ? `<span class="mono mut" style="font-size:12px">mis à jour ${ago(st.now)}</span>` : ""}</div>
    ${!st ? `<div class="card">${empty("Chargement…")}</div>` : st.error ? `<div class="card">${empty(esc(st.error))}</div>` : `
    <section class="sec"><h2>Serveur</h2>
      <div class="card stat4">${kv("Joueurs", fmtN(st.players))}${kv("Actifs (24 h)", fmtN(st.activeToday))}${kv("Membres du QG connectés", `${fmtN(st.members)}/${fmtN(st.users)}`)}${kv("Sessions ouvertes", fmtN(st.sessions))}</div>
      <div class="card stat4">${kv("Boosters ouverts", fmtN(st.economy?.opened))}${kv("Essence en circulation", fmtN(st.economy?.chakra) + " ◆")}${kv("Boosters gratuits en réserve", fmtN(st.economy?.free))}${kv("Annonces en vente", fmtN(st.market?.open))}</div>
      <div class="card stat4">${kv("Ventes conclues", fmtN(st.market?.sold))}${kv("Échanges en cours", fmtN(st.trades?.open))}${kv("Messages au comptoir", fmtN(st.chat))}${kv("Notifications stockées", fmtN(st.notifs))}</div>
      <div class="card"><p class="eyebrow mut">Documents par collection</p><div class="rarbars" style="margin-top:10px">${(st.collections || []).map((c) => `<div><small>${esc(c.coll)}</small><b>${fmtN(c.n)}</b></div>`).join("")}</div></div></section>`}
    <section class="sec"><h2>Contrôle des comptes</h2><p class="note">${esc(au?.note || "Signale les comptes dont les ressources paraissent anormales. Rien n'est modifié.")}</p>
      ${!au ? "" : au.error ? empty(esc(au.error)) : `<p class="mono mut" style="margin:0;font-size:13px">${au.checked} comptes vérifiés · ${au.flagged.length} signalé${au.flagged.length > 1 ? "s" : ""}</p>
        ${au.flagged.length ? `<div class="rank-list">${au.flagged.map((f) => `<button class="rk" type="button" data-nav="profil" data-p="${f.uid}">${av(f.uid)}<span class="nm"><span data-uid="${f.uid}">${esc(f.name || f.uid)}</span><small class="note" style="display:block;font-weight:500">${f.why.map(esc).join(" · ")}</small></span><span class="v">${fmtN(f.chakra)} ◆<small>${f.opened} boosters · ${f.free} gratuits</small></span></button>`).join("")}</div>` : `<p class="note" style="color:var(--ok)">Aucun compte suspect.</p>`}
        ${au.undatedVotes?.length ? `<p class="note">Anciens votes sans heure sur des questions résolues (faits avant le correctif) : ${au.undatedVotes.map((v) => `<b data-uid="${v.uid}">…</b> (${v.questions.length})`).join(", ")}.</p>` : ""}`}</section>
    <section class="sec"><h2>Bugs signalés</h2>${(bugs || []).length ? bugs.map((b) => `<div class="rv"><div class="rv-h">${av(b.uid)}${nm(b.uid)}<time>${ago(b.t)}</time></div><p>${esc(b.text)}</p></div>`).join("") : `<p class="note">Aucun signalement.</p>`}</section>
  </div>`;
}
function openBonus(uid) {
  const locked = Object.entries(PEOPLE).filter(([k]) => epOf(k) > progressOf(uid)), mine = CONFIG.extra[uid] || [];
  $("overlay").innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="Persos offerts"><div class="sheet-h"><h2>Persos offerts à <span data-uid="${uid}">…</span></h2><button class="x" type="button" data-act="close" aria-label="Fermer">✕</button></div>
    <div class="sheet-b"><p class="note">Coche les persos que ce joueur peut packer avant d'avoir atteint leur épisode.</p>
    ${locked.length ? `<div class="adm-checks">${locked.map(([k, p]) => `<label><input type="checkbox" data-extra="${k}" data-uid-for="${uid}" ${mine.includes(k) ? "checked" : ""}> ${esc(p.name)}${k === "monoco2" ? " (singe)" : ""} <span>${epLabel(epOf(k))}</span></label>`).join("")}</div>` : `<p class="note">Ce joueur a déjà accès à tous les persos.</p>`}</div></div>`;
  $("overlay").hidden = false; fillNames();
}

// ===== Liste des persos d'un booster =====
function openPool(id) {
  const pk = id === "jour" ? dailyPack() : packOf(id), pool = poolOf(pk);
  $("overlay").innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="Persos du booster" style="max-width:760px"><div class="sheet-h"><h2>${pk.daily ? pk.name.replace("Pack du jour · ", "") : pk.name} · ${pool.length} cartes</h2><button class="x" type="button" data-act="close" aria-label="Fermer">✕</button></div>
    <div class="sheet-b"><div class="cgrid">${pool.sort((a, b) => RAR[b.rar].rank - RAR[a.rar].rank).map((c) => cardFor(c, { click: true })).join("")}</div></div></div>`;
  $("overlay").hidden = false;
}

// ===== Ouverture d'un booster (plein écran) =====
const glowOf = (o) => { const best = o.cards.reduce((a, x) => (RAR[x.c.rar].rank > RAR[a.c.rar].rank ? x : a), o.cards[0]); return o.divine ? "#ff4d9e" : best.gold ? "#f0c860" : RAR[best.c.rar].rank >= 3 ? `var(--r-${best.c.rar})` : "#f5c518"; };
function drawOpening() {
  const o = opening, el = $("stage");
  el.hidden = false; el.style.setProperty("--glow", glowOf(o));
  const top = `<div class="stage-top"><button class="back" type="button" data-act="stage-back" aria-label="Retour">‹</button>${o.lab ? `<span class="wal lab-pill">${ico("labo")} Labo · rien n'est réel</span>` : `<span class="wal"><span class="bar"><i style="width:${Math.min(100, save.free / FREE_MAX * 100)}%"></i></span>${save.free}/${FREE_MAX}<span class="sep"></span><span class="ess"><span class="dia"></span>${fmtN(save.chakra)}</span></span>`}<span style="width:40px"></span></div>`;
  if (Open3D.draw(el, o, top)) return;
  if (o.restore) { o.restore = false; o.phase = "done"; } // sans 3D : retour direct aux boutons de fin
  if (o.single && o.phase === "pack") { o.single = false; o.phase = "cards"; setTimeout(() => { if (opening === o && !o.flipped) Reveal.tap(); }, reduced ? 0 : 650); } // sans 3D : la carte se retourne seule
  if ((Coffre.isChest(o.pk) || o.scenario) && Coffre.draw(el, o, top)) return;
  if (o.phase === "pack") {
    const chest = o.pk.skins || o.pk.base === "coffre";
    el.innerHTML = `${top}<section class="stage">
      ${chest ? `<button class="chest" type="button" id="pack" aria-label="Ouvrir le coffre"><span class="lid"></span><span class="box"></span><span class="gem"></span></button>`
        : `<div id="pack" role="button" tabindex="0" aria-label="Ouvrir le booster">${bstHTML(o.pk)}</div>`}
      <div class="floor"></div>
      <p class="hint">${o.pk.cos ? `<b>${o.pk.name}</b> · ${o.cards.length} objets` : o.pk.daily ? `Thème du jour : <b>${o.pk.name.replace("Pack du jour · ", "")}</b>` : `<b>${o.pk.name}</b> · ${o.paid ? "acheté" : "gratuit"}`}</p>
      <p class="hint">${chest ? "Touche le coffre pour l'ouvrir" : o.pk.cos ? "Tire la pochette vers le haut (ou touche-la)" : "Tire le booster vers le haut (ou touche-le)"}</p>
      <p class="sub">${o.pk.cos ? `Légendaire garantie dans ${Math.max(0, SUMMON_PITY_L - cosOf(save).sinceL)} invocations au plus` : `Légendaire garantie dans ${Math.max(0, LEGEND_PITY - (save.sinceLegend || 0))} boosters au plus`}</p></section>`;
    const p = $("pack"); if (!chest) bindPull(p);
    return;
  }
  if (o.phase === "cards") return Reveal.render(el, o, top);
  delete el.dataset.rv;
  const r = recapParts(o);
  el.innerHTML = `${top}<section class="stage">${r.head}
    <div class="summary ${o.cards.length > 5 ? "ten" : ""}">${o.cards.map((x) => itemHTML(x, { click: true, design: o.lab ? null : myDesign(x.c.id) })).join("")}</div>
    ${r.actions}</section>`;
}
// titre et boutons du récapitulatif : partagés par la page et l'ouverture en 3D (les cartes restent alors dans la scène)
function recapParts(o) {
  const news = o.cards.filter((x) => x.isNew).length, best = o.cards.reduce((a, x) => (RAR[x.c.rar].rank > RAR[a.c.rar].rank ? x : a), o.cards[0]);
  const head = `<p class="eyebrow gold">Résultat</p><h2>${o.pk.cos ? (news ? `${news} nouvel${news > 1 ? "s" : ""} objet${news > 1 ? "s" : ""}` : "Ajouté à ton inventaire") : news ? `${news} nouvelle${news > 1 ? "s" : ""} carte${news > 1 ? "s" : ""}` : "Que des doublons"}</h2>
    ${titlesWonHTML(o.titles)}`;
  const actions = `<div class="row" style="justify-content:center">
      ${o.lab ? `${o.pk.cos ? "" : `<button class="btn gold big" type="button" data-act="lab-replay">Rejouer</button>`}<button class="btn big" type="button" data-act="lab-back">Retour au labo</button>`
        : o.pk.cos ? `<button class="btn gold big" type="button" data-act="summon-again" ${save.chakra < summonCost(o.n) ? "disabled" : ""}>Encore ×${o.n} · ${fmtN(summonCost(o.n))} ◆</button>`
        : o.pk.daily ? "" : o.chain && o.chain.k + 1 < o.chain.total ? `<button class="btn gold big" type="button" data-act="next-chest">Coffre suivant · ${o.chain.k + 2}/${o.chain.total}</button>` : againBtn(o)}
      ${o.lab ? "" : o.pk.cos ? `<button class="btn big" type="button" data-act="to-atelier">Équiper à l'Atelier</button>` : `<button class="btn big" type="button" data-act="to-col">Ma collection</button>`}
      ${!o.lab && !o.pk.cos && (RAR[best.c.rar].rank >= 3 || best.gold) ? `<button class="btn big" type="button" data-share="${best.c.id}" data-gold="${best.gold ? 1 : ""}">Partager</button>` : ""}
      <button class="btn big" type="button" data-act="stage-close">Fermer</button></div>`;
  return { head, actions };
}
// « Encore » : même nombre de boosters si possible (2 gratuits ou de quoi en acheter 2), sinon un seul
function againBtn(o) {
  const n = o.n || 1;
  // ×10 en plus quand on en a assez : 5 coffres d'affilée
  const ten = o.pk.daily ? "" : save.free >= 10 ? `<button class="btn gold big" type="button" data-act="again" data-n="10">×10 · 5 coffres</button>`
    : !save.free && save.chakra >= PRICE * 10 ? `<button class="btn acc big" type="button" data-act="again" data-paid="1" data-n="10">Acheter ×10 · ${fmtN(PRICE * 10)} ◆</button>` : "";
  if (save.free) { const k = Math.min(n === 10 ? 2 : n, save.free); return `<button class="btn gold big" type="button" data-act="again" data-n="${k}">${k > 1 ? "Encore 2 · coffre" : "Encore un"} · ${save.free}</button>${ten}`; }
  const k = n > 1 && save.chakra >= PRICE * 2 ? 2 : 1;
  return `<button class="btn acc big" type="button" data-act="again" data-paid="1" data-n="${k}" ${save.chakra < PRICE ? "disabled" : ""}>${k > 1 ? "Acheter 2 · coffre" : "Acheter"} · ${fmtN(PRICE * k)} ◆</button>${ten}`;
}
function bindPull(p) {
  let y0 = null, dy = 0;
  p.addEventListener("pointerdown", (e) => { y0 = e.clientY; dy = 0; p.setPointerCapture(e.pointerId); });
  p.addEventListener("pointermove", (e) => { if (y0 == null) return; dy = Math.min(0, e.clientY - y0); p.firstElementChild.style.transform = `translateY(${dy * .6}px) rotate(${dy * .02}deg)`; });
  p.addEventListener("pointerup", () => { if (y0 == null) return; y0 = null; if (dy < -50 || Math.abs(dy) < 6) tearPack(); else p.firstElementChild.style.transform = ""; });
  p.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tearPack(); } });
}
async function tearPack() {
  const p = $("pack"); if (!p || p.dataset.done) return; p.dataset.done = 1;
  if (!reduced) {
    const b = p.classList.contains("chest") ? p : p.firstElementChild;
    if (p.classList.contains("chest")) { b.classList.add("shake"); await sleep(520); b.classList.remove("shake"); b.classList.add("out"); }
    else { b.style.transform = ""; b.classList.add("tear"); }
    const sp = document.createElement("div"); sp.className = "sparks"; sp.style.setProperty("--glow", getComputedStyle($("stage")).getPropertyValue("--glow"));
    for (let i = 0; i < 18; i++) { const s = document.createElement("i"); s.style.setProperty("--a", `${i * 20 + Math.random() * 10}deg`); sp.appendChild(s); }
    document.body.appendChild(sp); setTimeout(() => sp.remove(), 1000);
    const f = document.createElement("div"); f.className = "flash"; f.style.setProperty("--glow", getComputedStyle($("stage")).getPropertyValue("--glow")); document.body.appendChild(f); setTimeout(() => f.remove(), 900);
    await sleep(560);
  }
  opening.phase = "cards"; drawOpening();
}
// « Retour » depuis une carte ou la collection : on rouvre l'ouverture terminée, cartes retournées
let lastOpening = null;
function keepOpening() { if (opening && !opening.lab && !opening.pk.cos) lastOpening = opening; }
function backToOpening() {
  const o = lastOpening; if (!o) return; lastOpening = null;
  opening = { ...o, phase: "pack", restore: true, o3id: null, i: 0, flipped: false, titles: [] };
  closeMenu(); $("overlay").hidden = true; draw();
}
function backBtnHTML() {
  if (lastOpening && ["carte", "collection", "wiki"].includes(view)) return `<div class="wrap backrow"><button class="backbtn" type="button" data-act="go-back">${ico("back")}<span>Retour à l'ouverture</span></button></div>`;
  if (navStack.length && ["carte", "profil", "wiki", "classement", "raretes", "regles", "infos", "nouveautes", "avis"].includes(view)) return `<div class="wrap backrow"><button class="backbtn" type="button" data-act="go-back">${ico("back")}<span>Retour</span></button></div>`;
  return "";
}
// ===== choisir ses doublons (recycler ou combiner) et ses envies =====
// dupSel : { mode: "recycle" | "craft", sel: { "id" ou "id*" (dorée) : nombre } }
let dupSel = null;
const dupKey = (d) => d.id + (d.gold ? "*" : "");
function dupSheet() {
  if (!dupSel) return;
  const craft = dupSel.mode === "craft", sel = dupSel.sel;
  const list = dupeListS(save).filter((d) => !craft || !d.gold).map((d) => ({ ...d, c: byId[d.id] })).sort((a, b) => RAR[a.c.rar].rank - RAR[b.c.rar].rank || nameOf(a.c).localeCompare(nameOf(b.c)));
  const count = Object.values(sel).reduce((a, n) => a + n, 0);
  const value = list.reduce((a, d) => a + (sel[dupKey(d)] || 0) * d.value, 0);
  const full = craft && count >= CRAFT_COST;
  const ov = $("overlay"); ov.dataset.sheet = "dup";
  ov.innerHTML = `<div class="sheet dup-sheet" role="dialog" aria-modal="true" aria-label="${craft ? "Combiner des doublons" : "Recycler des doublons"}"><div class="sheet-h"><h2>${craft ? `Choisis ${CRAFT_COST} doublons à combiner` : "Choisis les doublons à recycler"}</h2><button class="x" type="button" data-act="close" aria-label="Fermer">✕</button></div>
    <div class="sheet-b"><p class="note">${craft ? `Les ${CRAFT_COST} doublons choisis disparaissent et te donnent 1 skin au hasard. Ta dernière carte de chaque perso est toujours gardée.` : "Seuls les exemplaires en trop sont proposés : ta dernière carte de chaque perso est toujours gardée. Garde ceux que tu veux vendre ou échanger."}</p>
      ${list.length ? `<div class="dup-grid">${list.map((d) => { const k = dupKey(d), n = sel[k] || 0; return `<div class="dup-it ${n ? "on" : ""}">${cardHTML(d.c, { gold: d.gold, w: 120 })}
        <div class="dup-ct"><button class="btn sm" type="button" data-act="dup-dec" data-k="${k}" ${n ? "" : "disabled"} aria-label="Un de moins">−</button><b>${n}<small>/${d.extra}</small></b><button class="btn sm" type="button" data-act="dup-inc" data-k="${k}" ${n >= d.extra || full ? "disabled" : ""} aria-label="Un de plus">+</button></div>
        ${craft ? "" : `<span class="dup-v">${d.value} ◆ l'unité</span>`}</div>`; }).join("")}</div>` : `<p class="note">Aucun doublon pour l'instant.</p>`}
      <div class="row dup-foot">${craft ? "" : `<button class="btn" type="button" data-act="dup-all">Tout choisir</button>`}<button class="btn" type="button" data-act="dup-none" ${count ? "" : "disabled"}>Tout enlever</button>
        <button class="btn gold big" type="button" data-act="dup-go" ${craft ? (count === CRAFT_COST ? "" : "disabled") : count ? "" : "disabled"}>${craft ? `Combiner · ${count}/${CRAFT_COST}` : `Recycler ${count} carte${count > 1 ? "s" : ""} · +${fmtN(value)} ◆`}</button></div></div></div>`;
  ov.hidden = false;
}
function dupAct(act, k) {
  if (!dupSel) return;
  const craft = dupSel.mode === "craft", list = dupeListS(save).filter((d) => !craft || !d.gold), sel = dupSel.sel;
  const count = Object.values(sel).reduce((a, n) => a + n, 0);
  if (act === "dup-inc") { const d = list.find((x) => dupKey(x) === k); if (d && (sel[k] || 0) < d.extra && !(craft && count >= CRAFT_COST)) sel[k] = (sel[k] || 0) + 1; }
  if (act === "dup-dec") { if (sel[k] > 1) sel[k]--; else delete sel[k]; }
  if (act === "dup-all") for (const d of list) sel[dupKey(d)] = d.extra;
  if (act === "dup-none") dupSel.sel = {};
  if (act === "dup-go") {
    const pick = Object.entries(sel).filter(([, n]) => n > 0).map(([key, n]) => ({ id: key.replace("*", ""), gold: key.endsWith("*"), n }));
    return craft ? craft_(pick) : recycle(pick);
  }
  dupSheet();
}
const craft_ = (pick) => craft(pick.flatMap((p) => Array(p.n).fill(p.id)));
// envies : les cartes qui te manquent, un cœur à toucher sur chacune
function wishSheet() {
  const ws = wishSet(), miss = ALL_CARDS.filter((c) => !has(c.id) && visible(c));
  const ov = $("overlay"); ov.dataset.sheet = "wish";
  ov.innerHTML = `<div class="sheet dup-sheet" role="dialog" aria-modal="true" aria-label="Mes envies"><div class="sheet-h"><h2>Mes envies · ${ws.size}</h2><button class="x" type="button" data-act="close" aria-label="Fermer">✕</button></div>
    <div class="sheet-b"><p class="note">Touche le cœur des cartes que tu veux : tu es prévenu dès qu'elles arrivent au marché.</p>
      ${miss.length ? `<div class="dup-grid">${miss.map((c) => `<div class="dup-it ${ws.has(c.id) ? "on" : ""}">${cardHTML(c, { w: 120, locked: true })}<button class="btn sm wish-h ${ws.has(c.id) ? "on" : ""}" type="button" data-wish="${c.id}">${ws.has(c.id) ? "♥ Dans mes envies" : "♡ Envie"}</button></div>`).join("")}</div>` : `<p class="note">Il ne te manque aucune carte.</p>`}
      <div class="row dup-foot"><button class="btn" type="button" data-act="wish-clear" ${ws.size ? "" : "disabled"}>Vider mes envies</button><button class="btn gold big" type="button" data-act="close">Terminé</button></div></div></div>`;
  ov.hidden = false;
}
function closeStage() { Coffre.stop(); Reveal.stop(); Open3D.stop(); opening = null; setTimeout(flushTitles, 0); loadStyles(); $("stage").hidden = true; $("stage").innerHTML = ""; $("stage").dataset.cf = ""; draw(); }
function unlocked(x) {
  const c = byId[x.id];
  $("overlay").innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="Objet déverrouillé"><div class="sheet-h"><h2>Objet déverrouillé !</h2><button class="x" type="button" data-act="close" aria-label="Fermer">✕</button></div>
    <div class="sheet-b">${cardHTML(c, { gold: x.gold, isNew: x.isNew })}<p class="note" style="text-align:center"><b>${esc(nameOf(c))}</b> · ${esc(c.title)} · ${RAR[c.rar].label}${x.isNew ? " · nouveau dans ta collection" : " · doublon"}</p><button class="btn gold big block" type="button" data-act="close">Super</button></div></div>`;
  $("overlay").hidden = false;
  draw();
}

// ===== Comptoir (chat) =====
function cardChip(id, gold) {
  const c = byId[id]; if (!c) return "";
  const vis = visible(c);
  return `<button class="cchip" type="button" ${vis ? `data-card="${id}"` : ""} style="--cc:${gold ? "#f0c860" : RAR[c.rar].color}">${thumb(vis ? c : null)}<span><em>${RAR[c.rar].label}${gold ? " · dorée" : ""}</em>${vis ? `${esc(nameOf(c))} · ${esc(c.title)}` : "Perso secret"}</span></button>`;
}
const hhmm = (t) => new Date(t).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
function msgHTML(m) {
  const name = m.name ? `<b data-mention="${esc(m.name)}">${esc(m.name)}</b>` : `<b data-uid="${esc(m.uid)}">…</b>`;
  const avd0 = decoOfUid(m.uid), avi = `${avd0 ? `<span class="avd">` : ""}<img class="av" ${m.avatar ? `src="${esc(m.avatar)}"` : `data-uid="${esc(m.uid)}" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="`} alt="">${avd0 ? `${decoSVG(avd0)}</span>` : ""}`;
  if (m.kind === "pull") return `<div class="cm sys pull">${name}<span>a tiré ✦</span>${cardChip(m.card, m.gold)}</div>`;
  if (m.kind === "announce") return `<div class="cm sys ann"><b>Annonce</b>${esc(m.text)}</div>`;
  const mine = m.uid === ME, ping = !mine && MYNAME && m.text.toLowerCase().includes("@" + MYNAME.toLowerCase());
  const text = esc(m.text).replace(/@([^\s@&<,.!?;:]{2,32})/g, "<mark>@$1</mark>");
  return `<div class="cm ${mine ? "me" : ""} ${ping ? "ping" : ""}">${avi}<div class="cm-b"><div class="cm-h">${name}${m.admin ? '<em class="tagadm">Admin</em>' : ""}<time>${hhmm(m.ts)}</time>${SRV && (mine || IS_ADMIN) ? `<button class="cm-del" type="button" data-chatdel="${m.id}" aria-label="Effacer ce message">✕</button>` : ""}</div>${m.text ? `<p>${text}</p>` : ""}${m.card ? cardChip(m.card, m.gold) : ""}</div></div>`;
}
function drawChatList() {
  const list = $("chatList"); if (!list) return;
  const atBottom = list.scrollHeight - list.scrollTop - list.clientHeight < 80;
  list.innerHTML = chat.msgs.length ? chat.msgs.map(msgHTML).join("") : `<p class="chat-empty">${!canChat() ? "Ici, tout le QG discute en direct, partage ses cartes et ses meilleurs tirages." : chat.loaded ? "Personne n'a encore écrit. Lance la discussion !" : "Chargement…"}</p>`;
  if (atBottom || !list.dataset.ready) list.scrollTop = list.scrollHeight;
  list.dataset.ready = "1";
  fillNames();
  if (chat.msgs.length) { chat.seen = Math.max(chat.seen, chat.msgs[chat.msgs.length - 1].ts); lsSet("rzlol-chat-seen", chat.seen); }
  badges();
}
function drawChat() {
  const foot = canChat()
    ? `<div class="chat-att" id="chatAtt" ${chat.card ? "" : "hidden"}>${chat.card ? `${cardChip(chat.card.id, chat.card.gold)}<button class="linkbtn" type="button" data-act="chat-uncard">Retirer</button>` : ""}</div>
       <form class="chat-form" id="chatForm" autocomplete="off"><input id="chatIn" maxlength="300" placeholder="Écris au QG… (@Nom pour mentionner)" aria-label="Message">
       <button class="btn sm" type="button" data-act="chat-card" title="Montrer une de tes cartes">Carte</button><button class="btn acc sm" type="submit">Envoyer</button></form>`
    : `<p class="note">${window.DISCORD_LOGIN ? `<a href="/auth/login">Connecte-toi avec Discord</a> pour discuter avec le QG.` : "Le comptoir s'active quand tu es connecté à l'app."}</p>`;
  $("chatPanel").innerHTML = `<div class="chat-head"><h2><small>Comptoir</small>Le QG en direct</h2><button class="chat-x" type="button" data-act="chat-close" aria-label="Fermer le comptoir">✕</button></div>
    <div class="chat-list" id="chatList" aria-live="polite"></div><div class="chat-foot">${foot}</div>`;
  drawChatList();
}
function pickChatCard() {
  const mine = ALL_CARDS.filter((c) => has(c.id)).sort((a, b) => RAR[b.rar].rank - RAR[a.rar].rank);
  if (!mine.length) return toast("Ouvre d'abord un booster pour avoir des cartes à montrer.");
  const opts = mine.flatMap((c) => { const o = own(c.id), lbl = `${nameOf(c)} · ${c.title} (${RAR[c.rar].label})`; return [...(o.n ? [`<option value="${c.id}|">${esc(lbl)}</option>`] : []), ...(o.gold ? [`<option value="${c.id}|1">${esc(lbl)} · dorée</option>`] : [])]; }).join("");
  $("overlay").innerHTML = `<form class="sheet" id="chatCardForm" role="dialog" aria-modal="true" aria-label="Montrer une carte"><div class="sheet-h"><h2>Montrer une carte</h2><button class="x" type="button" data-act="close" aria-label="Fermer">✕</button></div>
    <div class="sheet-b"><label class="field" for="chatCardSel">Ta carte<select id="chatCardSel">${opts}</select></label><button class="btn acc big block" type="submit">Joindre au message</button></div></form>`;
  $("overlay").hidden = false;
}

// ===== Rendu =====
const VIEWS = { boosters: viewBoosters, collection: viewCollection, wiki: viewWiki, carte: viewCard, market: viewMarket, missions: viewMissions, pred: viewPred, classement: viewClassement, profil: viewProfil, raretes: viewRaretes, regles: viewRegles, infos: viewInfos, nouveautes: viewNouveautes, avis: viewAvis, admin: viewAdmin, dev: viewDev };
function draw() {
  header(); drawNav();
  if (menuOpen) drawMenu();
  $("view").innerHTML = backBtnHTML() + (VIEWS[view] || viewBoosters)();
  if (opening) drawOpening(); else $("stage").hidden = true;
  $("chatFab").hidden = chat.open;
  fillNames(); afterViews();
}
function subscribeExtra() {
  if (!DB || subscribeExtra.done) return; subscribeExtra.done = true;
  DB.collection("avis").orderBy("t", "desc").limit(100).onSnapshot((s) => { shared.avis = s.docs.map((d) => d.data()).filter((r) => r && r.stars >= 1 && r.stars <= 5); sharedChanged(); }, () => {});
}
