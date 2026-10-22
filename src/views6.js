// ===== Re Zéro : Confrontation (2 à 7 joueurs) =====
// Le serveur et son moteur décident de tout ; la page affiche la vue filtrée (viewFor) et propose les actions légales.
ROUTES.push("confront");
const CF = { cat: null, list: null, table: null, gid: null, timer: null, busy: false, sel: null, defausse: [], garder: [], contrib: {} };
const cfName = (id) => (id === ME ? "Toi" : CF.table?.noms?.[id]?.name || "Joueur");
const ROLE_LABEL = { gardien: "Gardien", sentinelle: "Sentinelle", briseur: "Briseur", errant: "Errant" };
const PHASE_LABEL = { lobby: "Salon", contributions: "Chacun apporte ses cartes", choix: "Choix des personnages", partie: "Partie en cours", fin: "Partie terminée" };
async function cfCat() { if (!CF.cat) try { CF.cat = await srv("confront/catalogue"); } catch (e) { CF.cat = { branches: {}, branchIds: [], cartes: {}, signes: [] }; } }
async function cfLoadList() { await cfCat(); try { CF.list = await srv("confront/list"); } catch (e) { CF.list = { error: e.message }; } if (view === "confront" && !param) draw(); }
async function cfLoadTable(gid) {
  clearTimeout(CF.timer);
  await cfCat();
  try { const t = await srv("confront/state", { gid }); if (JSON.stringify(t) !== JSON.stringify(CF.table)) { CF.table = t; if (view === "confront" && param === gid && !document.activeElement?.closest?.(".cf-keep")) draw(); } }
  catch (e) { CF.table = { error: e.message }; if (view === "confront") draw(); return; }
  if (view === "confront" && param === gid) CF.timer = setTimeout(() => cfLoadTable(gid), document.hidden ? 8000 : CF.table?.vue?.phase === "fin" ? 15000 : 1800);
}
async function cfAct(action) {
  if (CF.busy) return; CF.busy = true;
  try { CF.table = await srv("confront/act", { gid: CF.gid, action }); CF.sel = null; CF.defausse = []; CF.garder = []; }
  catch (e) { toast(e.message); }
  CF.busy = false; draw();
}
const cfCardDef = (c) => CF.cat?.cartes?.[c?.def] || { nom: c?.def || "?", kanji: "?" };
const cfSigne = (id) => CF.cat?.signes?.find((x) => x.id === id) || { kanji: "", nom: id };
const cfAction = (c, extra = "") => { if (!c) return ""; const d = cfCardDef(c), sg = cfSigne(c.signe); return `<span class="cfa ${extra}" title="${esc(d.texte || "")}"><b>${d.kanji}</b><span>${esc(d.nom)}</span><small>${sg.kanji}${c.rang}</small></span>`; };
const cfBranch = (b) => CF.cat?.branches?.[b] || { nom: b, kanji: "?" };

function viewConfront() {
  if (!SRV) return `<div class="wrap page">${head("Confrontation · 対決", "Re Zéro : Confrontation")}${empty("Les parties se jouent sur le site du QG, avec ton compte Discord.")}</div>`;
  if (!featureOn(CONFIG, "confrontation") && !IS_ADMIN) return closedHTML("Re Zéro : Confrontation");
  if (param) { if (CF.gid !== param) { CF.gid = param; CF.table = null; CF.contrib = {}; } if (!CF.table) cfLoadTable(param); return cfTableHTML(); }
  CF.gid = null; clearTimeout(CF.timer);
  if (!CF.list) cfLoadList();
  const L = CF.list, row = (g, btn) => `<div class="cf-row"><b>${esc(g.nom)}</b><span class="note">${PHASE_LABEL[g.phase]} · ${g.joueurs} joueur${g.joueurs > 1 ? "s" : ""} · code <span class="mono">${g.gid}</span></span><button class="btn sm" type="button" data-nav="confront" data-p="${g.gid}">${btn}</button></div>`;
  return `<div class="wrap page">${head("Confrontation · 対決", "Re Zéro : Confrontation", "De 2 à 7 joueurs. Chacun apporte une carte par branche (des cartes de prêt complètent), on mélange, chacun choisit un perso parmi deux. Tes cartes restent à toi : rien ne change de propriétaire.")}
    ${L?.verrou ? `<p class="note">Tu as des cartes engagées dans la partie <span class="mono">${L.verrou.gid}</span> : elles ne peuvent pas être vendues ni échangées tant qu'elle n'est pas finie.</p>` : ""}
    <section class="sec"><h2>Créer une table</h2><div class="lab-form cf-keep"><label>Nom <input type="text" id="cfNom" maxlength="40" placeholder="Table de ${esc(ACCT?.name || "moi")}"></label><label class="zopt-line"><input type="checkbox" id="cfPub" checked> Publique (visible de tous)</label><button class="btn gold" type="button" data-act="cf-create">Créer</button></div>
      <div class="lab-form cf-keep"><label>Rejoindre avec un code <input type="text" id="cfCode" maxlength="4" placeholder="ABCD" style="text-transform:uppercase;width:120px"></label><button class="btn" type="button" data-act="cf-code">Ouvrir</button></div></section>
    ${!L ? `<p class="note">Chargement…</p>` : L.error ? `<p class="note">${esc(L.error)}</p>` : `
    ${L.miennes.length ? `<section class="sec"><h2>Mes parties</h2>${L.miennes.map((g) => row(g, "Reprendre")).join("")}</section>` : ""}
    <section class="sec"><h2>Salons ouverts</h2>${L.salons.length ? L.salons.map((g) => row(g, "Voir")).join("") : `<p class="note">Aucun salon public pour l'instant. Crée le tien !</p>`}</section>
    ${L.enCours.length ? `<section class="sec"><h2>À regarder</h2>${L.enCours.map((g) => row(g, "Regarder")).join("")}</section>` : ""}`}
    <section class="sec"><h2>Les 8 branches</h2><div class="cf-branches">${(CF.cat?.branchIds || []).map((b) => `<div class="cf-br"><b>${cfBranch(b).kanji}</b><div><h3>${esc(cfBranch(b).nom)}</h3><p class="note">${esc(cfBranch(b).pouvoir)}</p></div></div>`).join("")}</div>
      <p class="note">La rareté ne donne aucune puissance : une Commune et une Mythique de la même branche ont le même pouvoir. Règles complètes dans le livret (docs/confrontation/REGLES.md).</p></section></div>`;
}

function cfTableHTML() {
  const T = CF.table;
  if (!T) return `<div class="wrap page"><p class="note">Chargement de la table…</p></div>`;
  if (T.error) return `<div class="wrap page">${empty(esc(T.error))}<div class="row" style="justify-content:center"><button class="btn" type="button" data-nav="confront">Retour aux salons</button></div></div>`;
  const v = T.vue, acts = v.actions || [], has1 = (t) => acts.find((a) => a.type === t);
  const top = `<div class="cf-top"><div><p class="eyebrow">Confrontation · ${esc(PHASE_LABEL[v.phase])}${v.mode ? ` · ${{ duel: "Duel", trio: "Trio", classique: "Classique" }[v.mode]}` : ""}</p><h1 class="cf-h">${esc(T.nom)}</h1>
    <p class="note">Code <b class="mono">${T.gid}</b>${T.spectateur ? " · tu regardes en spectateur" : ""}</p></div>
    <div class="row"><button class="btn sm" type="button" data-nav="confront">Salons</button>${has1("abandon") && v.phase !== "lobby" ? `<button class="btn sm acc" type="button" data-act="cf-abandon">Abandonner</button>` : ""}</div></div>`;
  let body = "";
  if (v.phase === "lobby") {
    body = `<section class="sec"><h2>Joueurs (${v.joueurs.length}/7)</h2><div class="cf-lobby">${v.joueurs.map((p) => `<span class="pill">${esc(cfName(p.id))}${p.id === v.hote ? " · hôte" : ""}</span>`).join("")}</div>
      <p class="note">${v.joueurs.length < 2 ? "Il faut au moins 2 joueurs. Partage le code de la table." : v.joueurs.length === 2 ? "Mode Duel." : v.joueurs.length === 3 ? "Mode Trio, sans rôles." : "Mode Classique, avec des rôles secrets."}</p>
      <div class="row">${has1("rejoindre") ? `<button class="btn gold" type="button" data-cfa='{"type":"rejoindre"}'>Rejoindre</button>` : ""}${has1("lancer") ? `<button class="btn gold" type="button" data-cfa='{"type":"lancer"}'>Lancer la partie</button>` : ""}
      ${!T.spectateur && (T.createur === ME || IS_ADMIN) && v.joueurs.length < 7 ? `<button class="btn" type="button" data-act="cf-bot">Ajouter un bot (test)</button>` : ""}${has1("quitter") ? `<button class="btn" type="button" data-cfa='{"type":"quitter"}'>Quitter</button>` : ""}</div></section>`;
  } else if (v.phase === "contributions") {
    const me = v.joueurs.find((p) => p.id === v.moi), mine = CF.list?.cartes || [];
    if (!CF.list) cfLoadList();
    body = `<section class="sec"><h2>Apporte tes cartes</h2><p class="note">Au plus une carte par branche. Les branches que tu laisses vides reçoivent une carte de prêt. Tes cartes restent dans ta collection ; pendant la partie, tu ne peux ni les vendre ni les échanger.</p>
      ${me && !me.soumis ? `<div class="cf-contrib cf-keep">${(CF.cat?.branchIds || []).map((b) => { const opts = mine.filter((c) => c.branch === b); return `<label><span><b>${cfBranch(b).kanji}</b> ${esc(cfBranch(b).nom)}</span><select data-cfb="${b}"><option value="">Carte de prêt</option>${opts.map((c) => `<option value="${c.cardId}" ${CF.contrib[b] === c.cardId ? "selected" : ""}>${esc(nameOf(byId[c.cardId]))} · ${esc(byId[c.cardId].title)} (${RAR[byId[c.cardId].rar].label})</option>`).join("")}</select></label>`; }).join("")}</div>
        <button class="btn gold" type="button" data-act="cf-contrib">Valider ma contribution</button>` : `<p class="note">Contribution enregistrée. En attente des autres…</p>`}
      <div class="cf-lobby">${v.joueurs.map((p) => `<span class="pill ${p.soumis ? "ok" : ""}">${esc(cfName(p.id))} ${p.soumis ? "✓" : "…"}</span>`).join("")}</div></section>`;
  } else if (v.phase === "choix") {
    body = `<section class="sec"><h2>Choisis ton personnage</h2><p class="note">Deux persos tirés de la réserve commune. Ton choix reste secret jusqu'au début.</p>
      ${v.monChoix ? `<p class="note">Choix enregistré. En attente des autres…</p>` : `<div class="cf-props">${(v.propositions || []).map((c) => c && `<div class="cf-prop">${cfPerso(c, true)}<button class="btn gold" type="button" data-cfa='${JSON.stringify({ type: "choisir", instanceId: c.instanceId })}'>Choisir</button></div>`).join("")}</div>`}
      <div class="cf-lobby">${v.joueurs.map((p) => `<span class="pill ${p.aChoisi ? "ok" : ""}">${esc(cfName(p.id))} ${p.aChoisi ? "✓" : "…"}</span>`).join("")}</div></section>`;
  } else body = cfBoard(v);
  return `<div class="wrap page cf-page">${top}${body}${v.journal?.length ? `<section class="sec"><h2>Journal</h2><ol class="cf-log">${v.journal.filter((e) => !["attente", "attente_annulee", "phase"].includes(e.type) && !(e.type === "pioche_publique" && e.pid === v.moi)).slice(-14).reverse().map((e) => `<li>${cfEvent(e)}</li>`).join("")}</ol></section>` : ""}</div>`;
}
function cfPerso(c, big) {
  if (!c) return "";
  const card = byId[c.cardId], b = cfBranch(c.branch);
  const art = c.pret || !card ? `<div class="cf-loan"><b>${b.kanji}</b><span>Carte de prêt</span></div>` : cardHTML(card, { design: c.cosmetique || null });
  return `<div class="cf-perso ${big ? "big" : ""}">${art}<p class="cf-pb"><b>${b.kanji} ${esc(b.nom)}</b>${big ? `<small>${esc(b.pouvoir)}</small>` : ""}</p></div>`;
}
function cfBoard(v) {
  const me = v.joueurs.find((p) => p.id === v.moi), pr = v.attente, acts = v.actions || [];
  const seat = (p) => `<div class="cf-seat ${v.tour?.pid === p.id ? "turn" : ""} ${pr?.pid === p.id ? "wait" : ""} ${p.vivant ? "" : "dead"} ${p.id === v.moi ? "me" : ""}" data-cft="${p.id}">
    <div class="cf-seat-h"><b>${esc(cfName(p.id))}</b>${p.role ? `<span class="pill">${ROLE_LABEL[p.role]}</span>` : ""}${p.enLigne ? "" : `<span class="pill">hors ligne</span>`}</div>
    ${cfPerso(p.perso)}
    <div class="cf-pv" aria-label="${p.pv} PV sur ${p.pvMax}">${"♥".repeat(Math.max(0, p.pv))}<i>${"♡".repeat(Math.max(0, p.pvMax - p.pv))}</i></div>
    <p class="note">${p.nbMain} carte${p.nbMain > 1 ? "s" : ""}${p.distancePercue != null ? ` · distance ${p.distancePercue}` : ""}</p>
    <div class="cf-eq">${cfAction(p.arme)}${p.equip.map((c) => cfAction(c)).join("")}</div>
    ${CF.sel && CF.targets?.some((a) => a.cible === p.id) ? `<div class="cf-tgt">${CF.targets.filter((a) => a.cible === p.id).map((a) => `<button class="btn sm gold" type="button" data-cfa='${JSON.stringify(a)}'>${a.choix ? (a.choix === "main" ? "Main" : esc(cfCardDef({ def: a.choix }).nom || "Carte posée")) : "Cibler"}</button>`).join("")}</div>` : ""}
  </div>`;
  const res = v.resultat;
  const fin = v.phase === "fin" && res ? `<section class="sec cf-fin"><h2>${res.gagnants?.length ? `Victoire : ${res.gagnants.map(cfName).map(esc).join(", ")}` : "Partie terminée sans vainqueur"}</h2><p class="note">${res.camp ? `Camp gagnant : ${esc(res.camp)} · ` : ""}${res.tours} tours.${res.raison === "annulee" ? " Partie annulée." : ""}</p></section>` : "";
  return `${fin}<div class="cf-board">${v.joueurs.map(seat).join("")}</div>
    <div class="cf-mid"><span>Pioche ${v.pioche}</span><span>Défausse ${v.nbDefausse}</span>${v.defausse?.length ? `<span>Dernière : ${cfAction(v.defausse.at(-1))}</span>` : ""}${v.etal?.length ? `<span>Étal : ${v.etal.map((c) => cfAction(c)).join("")}</span>` : ""}</div>
    ${me ? cfHand(v, me, pr, acts) : ""}`;
}
const PROMPT_TXT = { tour: "C'est ton tour.", reaction: "On t'attaque : pare, riposte ou encaisse.", onde: "Défausse une Frappe ou perds 1 PV.", defi: "Défi : défausse une Frappe ou perds 1 PV.", sauvetage: "Tu tombes à 0 PV : sauve-toi si tu peux.", stratege: "Stratège : garde les cartes de ton choix.", voleur: "Voleur : pioche normalement ou prends une carte au hasard à un joueur.", etal: "Étal : prends une carte." };
function cfHand(v, me, pr, acts) {
  const mine = pr && pr.pid === me.id;
  const plays = acts.filter((a) => a.type === "jouer"), fin = acts.find((a) => a.type === "finir");
  const btn = (a, label, cls = "") => `<button class="btn sm ${cls}" type="button" data-cfa='${JSON.stringify(a)}'>${label}</button>`;
  const other = acts.filter((a) => ["parer", "riposter", "encaisser", "defausser", "elixir", "survie", "piocher", "prendre"].includes(a.type));
  const LBL = { parer: "Parer", riposter: "Riposter", encaisser: "Encaisser", defausser: "Défausser une Frappe", elixir: "Boire un Élixir", survie: "Ténacité (défausser 2)", prendre: "Prendre" };
  const garder = acts.find((a) => a.type === "garder");
  return `<section class="sec cf-me"><div class="cf-me-h"><h2>Ta main</h2>${v.monRole ? `<span class="pill">Rôle : ${ROLE_LABEL[v.monRole]}</span>` : ""}${v.limiteMain != null ? `<span class="note">Limite de main ${v.limiteMain} · portée ${v.porteeArme}</span>` : ""}</div>
    <p class="cf-prompt">${mine ? PROMPT_TXT[pr.kind] || "À toi." : pr ? `En attente de ${esc(cfName(pr.pid))}…` : ""}${pr?.deadline ? ` <span class="note" data-cfdl="${pr.deadline}"></span>` : ""}</p>
    <div class="cf-hand">${(v.main || []).map((c) => { const ok = plays.filter((a) => a.carte === c.uid || cfCardDef(acts.find((x) => x.carte === a.carte) || {}).nom === cfCardDef(c).nom && false); const playable = plays.some((a) => a.carte === c.uid) || plays.some((a) => (v.main.find((m) => m.uid === a.carte) || {}).def === c.def);
      const discard = fin && fin.aDefausser > 0, picked = CF.defausse.includes(c.uid);
      return `<button type="button" class="cf-card ${playable ? "ok" : ""} ${CF.sel === c.uid ? "sel" : ""} ${picked ? "picked" : ""}" data-cfc="${c.uid}" ${playable || discard ? "" : "disabled"}>${cfAction(c)}<small>${esc(cfCardDef(c).texte || "")}</small></button>`; }).join("")}</div>
    ${garder ? `<p class="note">Garde ${garder.nombre} carte(s) :</p><div class="cf-hand">${(pr.cartes || v.attente?.cartes || []).map((c) => `<button type="button" class="cf-card ok ${CF.garder.includes(c.uid) ? "picked" : ""}" data-cfg="${c.uid}">${cfAction(c)}</button>`).join("")}</div>${btn({ type: "garder", cartes: CF.garder, promptId: garder.promptId }, `Garder (${CF.garder.length}/${garder.nombre})`, "gold")}` : ""}
    <div class="row">${CF.sel && CF.noTarget ? btn(CF.noTarget, "Jouer cette carte", "gold") : ""}${other.map((a) => btn(a, a.type === "piocher" ? (a.cible ? `Voler à ${esc(cfName(a.cible))}` : "Piocher normalement") : a.type === "prendre" ? `Prendre ${cfCardDef(v.etal.find((c) => c.uid === a.carte) || {}).nom}` : LBL[a.type])).join("")}
      ${fin ? btn({ type: "finir", defausse: CF.defausse, promptId: fin.promptId }, fin.aDefausser ? `Finir le tour (défausser ${CF.defausse.length}/${fin.aDefausser})` : "Finir le tour", "acc") : ""}</div>
    ${CF.sel && CF.targets?.length ? `<p class="note">Choisis une cible sur la table.</p>` : ""}</section>`;
}
const EVT = {
  debut: () => "La partie commence.", tour: (e) => `Tour de ${cfName(e.pid)}.`, joue: (e) => `${cfName(e.pid)} joue ${cfCardDef(e.carte || { def: e.def }).nom}${e.cible ? ` sur ${cfName(e.cible)}` : ""}.`,
  degats: (e) => `${cfName(e.pid)} perd ${e.n || 1} PV.`, pare: (e) => `${cfName(e.pid)} pare.`, esquive: (e) => `${cfName(e.pid)} esquive.`, riposte: (e) => `${cfName(e.pid)} riposte.`,
  elimination: (e) => `${cfName(e.pid)} est éliminé${e.role ? ` (${ROLE_LABEL[e.role]})` : ""}.`, fin: () => "Fin de la partie.", abandon: (e) => `${cfName(e.pid)} abandonne.`,
  presage: (e) => `Présage : ${cfSigne(e.carte?.signe || e.signe).nom} ${e.carte?.rang || ""}.`, vol: (e) => `${cfName(e.pid)} vole une carte${e.cible ? ` à ${cfName(e.cible)}` : ""}.`, vol_public: (e) => `${cfName(e.pid)} prend une carte à ${cfName(e.cible)}.`,
  pioche: (e) => `Tu pioches ${e.n || e.cartes?.length || ""} carte(s).`, pioche_publique: (e) => `${cfName(e.pid)} pioche ${e.n || ""} carte(s).`, delai_expire: (e) => `${cfName(e.pid)} n'a pas répondu à temps.`,
  rejoint: (e) => `${cfName(e.pid)} rejoint la table.`, quitte: (e) => `${cfName(e.pid)} quitte la table.`, contribution: (e) => `${cfName(e.pid)} a apporté ses cartes.`, choix: (e) => `${cfName(e.pid)} a choisi son perso.`,
  sauvetage: (e) => `${cfName(e.pid)} se sauve de justesse.`, survie: (e) => `${cfName(e.pid)} tient bon (Ténacité).`, fin_tour: (e) => `${cfName(e.pid)} finit son tour.`, role: (e) => `Rôle révélé : ${cfName(e.pid)} est ${ROLE_LABEL[e.role] || e.role}.`,
};
const cfEvent = (e) => esc((EVT[e.type] || (() => `${e.type.replace(/_/g, " ")}${e.pid ? ` · ${cfName(e.pid)}` : ""}`))(e));
function cfSelect(uid) {
  const v = CF.table?.vue; if (!v) return;
  const fin = v.actions.find((a) => a.type === "finir");
  const playable = v.actions.filter((a) => a.type === "jouer" && a.carte === uid);
  if (!playable.length && fin?.aDefausser) { CF.defausse = CF.defausse.includes(uid) ? CF.defausse.filter((x) => x !== uid) : [...CF.defausse, uid].slice(0, fin.aDefausser); return draw(); }
  // les actions sont listées pour une carte de chaque sorte : on les reprend pour cette carte-ci
  const def = v.main.find((c) => c.uid === uid)?.def;
  const same = v.actions.filter((a) => a.type === "jouer" && v.main.find((c) => c.uid === a.carte)?.def === def).map((a) => ({ ...a, carte: uid }));
  if (!same.length) return;
  if (CF.sel === uid) { CF.sel = null; return draw(); }
  CF.sel = uid; CF.targets = same.filter((a) => a.cible); CF.noTarget = same.find((a) => !a.cible) || null;
  draw();
}
VIEWS.confront = viewConfront;
document.addEventListener("click", (e) => {
  const t = e.target;
  const a = t.closest("[data-cfa]"); if (a) return cfAct(JSON.parse(a.dataset.cfa));
  const c = t.closest("[data-cfc]"); if (c) return cfSelect(c.dataset.cfc);
  const g = t.closest("[data-cfg]"); if (g) { const n = CF.table.vue.actions.find((x) => x.type === "garder")?.nombre || 0; CF.garder = CF.garder.includes(g.dataset.cfg) ? CF.garder.filter((x) => x !== g.dataset.cfg) : [...CF.garder, g.dataset.cfg].slice(-n); return draw(); }
  const act = t.closest("[data-act]")?.dataset.act; if (!act || !act.startsWith("cf-")) return;
  if (act === "cf-create") return srv("confront/create", { nom: $("cfNom")?.value || "", public: $("cfPub")?.checked }).then((r) => { CF.table = r; CF.gid = r.gid; CF.list = null; nav("confront", r.gid); }).catch((err) => toast(err.message));
  if (act === "cf-code") { const code = ($("cfCode")?.value || "").trim().toUpperCase(); if (code.length === 4) nav("confront", code); return; }
  if (act === "cf-bot") return srv("confront/bot", { gid: CF.gid }).then((r) => { CF.table = r; draw(); }).catch((err) => toast(err.message));
  if (act === "cf-contrib") return cfAct({ type: "contribuer", cartes: Object.values(CF.contrib).filter(Boolean) });
  if (act === "cf-abandon" && confirm("Abandonner la partie ?")) return cfAct({ type: "abandon" });
});
document.addEventListener("change", (e) => { const b = e.target.dataset?.cfb; if (b) CF.contrib[b] = e.target.value || null; });
// compte à rebours du délai de réponse
setInterval(() => { document.querySelectorAll("[data-cfdl]").forEach((el) => { const s = Math.max(0, Math.round((+el.dataset.cfdl - Date.now()) / 1000)); el.textContent = `· ${s} s`; }); }, 1000);
