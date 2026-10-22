// ===== Défilé des Légendes =====
// Les joueurs inscrivent une carte (copie figée avec son design), le QG vote, Billy modère et clôt.
ROUTES.push("defile");
NICON.defile = "華";
const DEF = { loaded: false, loading: false, current: null, hall: null, archives: [], canVote: false, pick: null };
async function defLoad(force) {
  if (!SRV || DEF.loading || (DEF.loaded && !force)) return;
  DEF.loading = true;
  try { Object.assign(DEF, await srv("defile/state"), { loaded: true, t: Date.now() }); } catch (e) { DEF.loaded = true; DEF.t = Date.now(); }
  DEF.loading = false;
  if ((view === "defile" || view === "boosters") && !opening) draw();
}
async function defAct(action, body, msg) {
  try { const r = await srv(action, body); if (r.current) DEF.current = r.current; if (msg) toast(msg); await defLoad(true); }
  catch (e) { toast(e.message); }
}
const defCard = (e, o = {}) => (byId[e.card] ? cardHTML(byId[e.card], { gold: e.gold, design: e.design, present: true, ...o }) : "");
// bannière du gagnant à l'accueil, pendant une semaine
function hallHTML() {
  if (!SRV || !featureOn(CONFIG, "defile")) return "";
  defLoad();
  const h = DEF.hall; if (!h || !byId[h.card]) return "";
  return `<section class="sec def-hall"><div class="def-hall-in"><div class="def-hall-card">${defCard(h)}</div>
    <div><p class="eyebrow gold">Défilé des Légendes · 華</p><h2>${esc(h.name)} remporte ${esc(h.title)}</h2><p class="note">${h.votes} vote${h.votes > 1 ? "s" : ""} du QG. Sa carte reste ici jusqu'au ${new Date(h.until).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}.</p>
    <div class="row"><button class="btn sm" type="button" data-nav="defile">Voir le Défilé</button><button class="btn sm" type="button" data-nav="profil" data-p="${h.uid}">Son profil</button></div></div></div></section>`;
}
function viewDefile() {
  if (!featureOn(CONFIG, "defile") && !IS_ADMIN) return closedHTML("Défilé des Légendes");
  if (!SRV) return `<div class="wrap page">${head("Défilé · 華", "Défilé des Légendes")}${empty("Le Défilé se joue sur le site du QG, avec ton compte Discord.")}</div>`;
  // l'état du Défilé change pendant qu'on joue (Billy ouvre, les votes s'ouvrent) : on le recharge en arrivant, puis toutes les 20 s
  defLoad();
  clearTimeout(DEF.timer); DEF.timer = setTimeout(() => { if (view === "defile" && !document.activeElement?.closest?.(".cf-keep")) defLoad(true); }, 20000);
  const d = DEF.current, phase = d?.phase, mine = d?.entries.find((e) => e.uid === ME);
  const PH = { inscriptions: "Inscriptions ouvertes", votes: "Votes ouverts", clos: "Terminé" };
  const mineCards = [...CARDS, ...SKINS].filter((c) => has(c.id)).sort((a, b) => RAR[b.rar].rank - RAR[a.rar].rank);
  if (!DEF.pick || !has(DEF.pick)) DEF.pick = save.featured && has(save.featured) ? save.featured : mineCards[0]?.id || null;
  let body = "";
  if (!DEF.loaded) body = `<p class="note">Chargement…</p>`;
  else if (!d) body = `<p class="note">Pas de Défilé pour l'instant. Billy annoncera le prochain : prépare ta carte à l'Atelier Arcanique !</p>`;
  else {
    const enter = phase === "inscriptions" ? `<section class="sec def-enter"><h2>${mine && !mine.removed ? "Ton inscription" : "Inscris ta carte"}</h2>
      ${mine?.removed ? `<p class="note">Ton inscription a été retirée par la modération${mine.reason ? ` : « ${esc(mine.reason)} »` : ""}.</p>` : `
      <p class="note">La carte est copiée telle qu'elle est maintenant, avec son design : la modifier ou la vendre ensuite ne change pas ton inscription. Réinscris-toi pour la remplacer.</p>
      <div class="def-pick"><div class="def-pick-card">${DEF.pick ? cardHTML(byId[DEF.pick], { design: myDesign(DEF.pick), present: true, gold: !own(DEF.pick).n }) : ""}</div>
        <div class="def-pick-side"><label class="zpick">Carte <select id="defPick">${mineCards.map((c) => `<option value="${c.id}" ${c.id === DEF.pick ? "selected" : ""}>${esc(nameOf(c))} · ${esc(c.title)} (${RAR[c.rar].label})</option>`).join("")}</select></label>
        <div class="row"><button class="btn gold" type="button" data-act="def-enter" ${DEF.pick && canShare ? "" : "disabled"}>${mine ? "Remplacer mon inscription" : "M'inscrire"}</button>${mine ? `<button class="btn" type="button" data-act="def-withdraw">Me retirer</button>` : ""}<button class="btn" type="button" data-nav="atelier" data-p="${DEF.pick || ""}">Personnaliser à l'Atelier</button></div>
        ${canShare ? "" : `<p class="note">Réservé aux membres du QG de Shinjuku.</p>`}</div></div>`}</section>` : "";
    const voteNote = phase === "votes" ? (DEF.canVote ? `<p class="note">Un vote par personne, modifiable jusqu'à la clôture. Tu ne peux pas voter pour toi. Les résultats restent secrets jusqu'à la fin.</p>` : `<p class="note">Pour voter : être membre du QG, avoir ouvert ${DEFILE_VOTE_MIN_OPENED} boosters et avoir un compte de plus de ${DEFILE_VOTE_MIN_DAYS} jours.</p>`) : "";
    const list = d.entries.filter((e) => !e.removed);
    const podium = phase === "clos" && d.rank?.length ? `<section class="sec"><h2>Podium</h2><div class="def-podium">${d.rank.map((r, i) => { const e = d.entries.find((x) => x.uid === r.uid); return e ? `<div class="def-pod p${i + 1}"><span class="def-place">${["1er", "2e", "3e"][i]}</span>${defCard(e)}<b>${esc(e.name)}</b><small>${r.votes} vote${r.votes > 1 ? "s" : ""}</small></div>` : ""; }).join("")}</div><p class="note">${d.voters} votant${d.voters > 1 ? "s" : ""}. À égalité, l'inscription la plus ancienne passe devant.</p></section>` : "";
    body = `${enter}${podium}<section class="sec"><h2>${phase === "votes" ? "Vote pour ta carte préférée" : "Les cartes en lice"}</h2>${voteNote}
      ${list.length ? `<div class="def-grid">${list.map((e) => `<div class="def-e ${d.myVote === e.uid ? "voted" : ""}">${defCard(e)}
        <div class="def-e-t"><b>${esc(e.name)}</b>${ttag(e.uid, "sm")}${phase === "clos" ? `<small>${e.votes} vote${e.votes > 1 ? "s" : ""}</small>` : ""}</div>
        ${phase === "votes" && e.uid !== ME ? `<button class="btn sm ${d.myVote === e.uid ? "gold" : ""}" type="button" data-defvote="${e.uid}" ${DEF.canVote ? "" : "disabled"}>${d.myVote === e.uid ? "★ Ton vote" : "Voter"}</button>` : ""}
        ${phase === "votes" && e.uid === ME ? `<span class="note">Ta carte</span>` : ""}
        ${IS_ADMIN && phase !== "clos" ? `<button class="btn sm acc" type="button" data-defrm="${e.uid}">Retirer…</button>${DEF.rm === e.uid ? `<div class="def-rm cf-keep"><input type="text" id="defRmWhy" maxlength="200" class="gal-note" placeholder="Motif envoyé au joueur"><button class="btn sm acc" type="button" data-defrmgo="${e.uid}">Retirer l'inscription</button></div>` : ""}` : ""}</div>`).join("")}</div>` : `<p class="note">Personne n'est encore inscrit.</p>`}</section>`;
  }
  const admin = IS_ADMIN ? `<section class="sec def-admin"><p class="eyebrow">Admin</p><h2>Gérer le Défilé</h2>
    <div class="row">${!d || phase === "clos" ? `<input type="text" id="defTitle" maxlength="80" placeholder="Titre (ex. Défilé de novembre)" class="gal-note" style="max-width:320px"><button class="btn gold sm" type="button" data-act="def-new">Ouvrir les inscriptions</button>` : ""}
    ${phase === "inscriptions" ? `<button class="btn gold sm" type="button" data-act="def-votes">Fermer les inscriptions et ouvrir les votes</button>` : ""}
    ${phase === "votes" ? `<button class="btn gold sm" type="button" data-act="def-close">Clore et récompenser</button>` : ""}</div>
    <p class="note">Récompenses provisoires (à valider) : ${DEFILE_REWARDS.map((v, i) => `${i + 1}${i ? "e" : "er"} ${v} ◆`).join(", ")}, plus ${DEFILE_PARTICIPATION} ◆ pour chaque participant ; titres « ${DEFILE_TITLES.join(" », « ")} » (et « Habitué du Défilé » après 5 participations). La fréquence (semaine ou mois) est à décider : c'est toi qui ouvres et fermes.</p></section>` : "";
  const arch = DEF.archives.length ? `<section class="sec"><h2>Archives</h2><div class="def-arch">${DEF.archives.map((a) => `<div class="def-arch-i"><div class="def-arch-c">${a.podium[0] ? defCard(a.podium[0]) : ""}</div><div><b>${esc(a.title)}</b><p class="note">${new Date(a.t).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })} · ${a.n} carte${a.n > 1 ? "s" : ""} · ${a.voters} votant${a.voters > 1 ? "s" : ""}</p><p class="note">${a.podium.map((p, i) => `${i + 1}. ${esc(p.name)} (${p.votes})`).join(" · ")}</p></div></div>`).join("")}</div></section>` : "";
  return `<div class="wrap page">${head("Défilé des Légendes · 華", d ? esc(d.title) : "Défilé des Légendes", "Montre ta plus belle carte personnalisée. Le QG vote, la gagnante s'affiche à l'accueil pendant une semaine.")}
    ${d ? `<div class="z-bar"><span>Étape : <b>${PH[phase]}</b></span><span>${((n) => `${n} inscrit${n > 1 ? "s" : ""}`)(d.entries.filter((e) => !e.removed).length)}</span></div>` : ""}
    ${body}${admin}${arch}</div>`;
}
VIEWS.defile = viewDefile;
// à chaque arrivée sur la page, on recharge l'état du Défilé (il a pu s'ouvrir ou passer aux votes entre-temps)
addEventListener("hashchange", () => { if (location.hash.startsWith("#/defile")) { DEF.t = 0; defLoad(true); } });
document.addEventListener("click", (e) => {
  const t = e.target;
  const v = t.closest("[data-defvote]"); if (v) return defAct("defile/vote", { entry: v.dataset.defvote }, "Vote enregistré.");
  const rm = t.closest("[data-defrm]"); if (rm) { DEF.rm = DEF.rm === rm.dataset.defrm ? null : rm.dataset.defrm; return draw(); }
  const rmGo = t.closest("[data-defrmgo]"); if (rmGo) { const reason = ($("defRmWhy")?.value || "").trim(); if (!reason) return toast("Indique un motif : il est envoyé au joueur."); DEF.rm = null; return defAct("defile/admin", { action: "remove", uid: rmGo.dataset.defrmgo, reason }, "Inscription retirée."); }
  const a = t.closest("[data-act]")?.dataset.act; if (!a || !a.startsWith("def-")) return;
  if (a === "def-enter") return defAct("defile/enter", { card: DEF.pick }, "Ta carte défile !");
  if (a === "def-withdraw") return defAct("defile/withdraw", {}, "Inscription retirée.");
  if (a === "def-new") return defAct("defile/admin", { action: "new", title: $("defTitle")?.value || "" }, "Défilé ouvert.");
  if (a === "def-votes") return defAct("defile/admin", { action: "votes" }, "Votes ouverts.");
  if (a === "def-close" && sure(t.closest("[data-act]"), "Confirmer : clore et récompenser")) return defAct("defile/admin", { action: "close" }, "Défilé clos.");
});
document.addEventListener("change", (e) => { if (e.target.id === "defPick") { DEF.pick = e.target.value; draw(); } });
