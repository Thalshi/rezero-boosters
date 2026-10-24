// ===== Parrainage : lien perso, vidéos de Billy, paliers et classement (événement de 2 semaines) =====
ROUTES.push("parrainage");
const REFP = { data: null, loading: false, copied: false };
// arrivée par un lien de parrain : on garde le parrain jusqu'à la connexion, et on montre les vidéos de Billy
(() => {
  try {
    const ref = new URLSearchParams(location.search).get("ref");
    if (ref && /^[a-z0-9]{3,40}$/i.test(ref)) { lsSet("rz-ref", ref); history.replaceState(null, "", location.pathname + location.hash); setTimeout(refWelcome, 1200); }
  } catch (e) {}
})();
const ytId = (url) => (String(url).match(/[?&]v=([\w-]{6,})/) || String(url).match(/youtu\.be\/([\w-]{6,})/) || [])[1];
const refVideos = () => REF_VIDEOS.map((v) => `<div class="ref-vid"><iframe src="https://www.youtube-nocookie.com/embed/${ytId(v.url)}" title="Re : LOL, épisode ${v.ep}" loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe><span>Épisode ${v.ep}</span></div>`).join("");
function refWelcome() {
  if (!$("overlay").hidden) return;
  $("overlay").innerHTML = `<div class="sheet ref-sheet" role="dialog" aria-modal="true" aria-label="Bienvenue"><div class="sheet-h"><h2>Bienvenue sur Re : LOL</h2><button class="x" type="button" data-act="close" aria-label="Fermer">✕</button></div>
    <div class="sheet-b"><p class="note">Un ami t'invite. Re : LOL, c'est le jeu de cartes de l'anime de Billy : regarde l'épisode, puis ouvre tes premiers boosters. Après ${REF_MIN_OPENED} boosters ouverts, vous gagnez tous les deux +${REF_GAIN.boosters} boosters.</p>
      <div class="ref-vids">${refVideos()}</div>
      ${SRV ? `<button class="btn gold big block" type="button" data-act="close">Jouer</button>` : window.DISCORD_LOGIN ? `<a class="btn gold big block" href="/auth/login">Jouer avec Discord</a>` : `<button class="btn gold big block" type="button" data-act="close">Jouer</button>`}</div></div>`;
  $("overlay").hidden = false;
}
// une fois connecté : on déclare le parrain au serveur (une seule fois)
(function refClaimLoop(tries = 0) {
  const ref = lsGet("rz-ref"); if (!ref) return;
  if (!(SRV && ME)) { if (tries < 60) setTimeout(() => refClaimLoop(tries + 1), 1000); return; }
  if (ref === ME) { lsSet("rz-ref", ""); return; }
  srv("ref/claim", { ref }).then((r) => { lsSet("rz-ref", ""); if (r.ok) toast(`Parrainé par ${r.parrain} : ouvre ${REF_MIN_OPENED} boosters et vous gagnez +${REF_GAIN.boosters} boosters chacun !`); }).catch(() => {});
})();
async function refLoad() {
  if (!SRV || REFP.loading) return; REFP.loading = true;
  try { REFP.data = await srv("ref"); } catch (e) { REFP.data = { error: e.message }; }
  REFP.loading = false; if (view === "parrainage") draw();
}
const refLink = () => `${location.origin}/?ref=${encodeURIComponent(ME || "")}`;
const refLeft = (ms) => { if (ms <= 0) return "terminé"; const d = Math.floor(ms / 86400e3), h = Math.floor((ms % 86400e3) / 3600e3); return d ? `${d} j ${h} h` : `${h} h ${Math.floor((ms % 3600e3) / 60000)} min`; };
const refDate = (t) => new Date(t).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
VIEWS.parrainage = () => {
  if (!SRV) return `<div class="wrap page">${head("Événement", "Parrainage", "Le parrainage se joue sur le site du QG, connecté avec Discord.")}<div class="ref-vids">${refVideos()}</div></div>`;
  const D = REFP.data; if (!D) { refLoad(); return `<div class="wrap page">${empty("Chargement de l'événement…")}</div>`; }
  if (D.error) return `<div class="wrap page">${empty(esc(D.error))}</div>`;
  if (!D.start) return `<div class="wrap page">${head("Événement", "Parrainage", "L'événement de parrainage arrive bientôt : invite tes amis, des boosters pour vous deux à chaque filleul.")}<div class="ref-vids">${refVideos()}</div></div>`;
  const now = Date.now(), live = now >= D.start && now <= D.end, ended = now > D.end, n = D.n || 0;
  const next = REF_TIERS.find((t) => n < t.n);
  const share = encodeURIComponent(`Viens jouer à Re : LOL, le jeu de cartes de l'anime de Billy : ${refLink()}`);
  return `<div class="wrap page ref">
    <section class="ref-hero"><p class="eyebrow">Parrainage · événement · ${refDate(D.start)} → ${refDate(D.end)}</p>
      <h1>Invite tes amis</h1>
      <p>Des boosters pour vous deux, une récompense à chaque palier et un classement. Ton ami regarde l'épisode de Billy, se connecte avec Discord et ouvre ${REF_MIN_OPENED} boosters : c'est validé.</p>
      <p class="mono">${live ? `Fin dans <b>${refLeft(D.end - now)}</b>` : ended ? "Événement terminé" : `Commence dans <b>${refLeft(D.start - now)}</b>`} · +${REF_GAIN.boosters} boosters pour toi et ton ami à chaque filleul</p>
      <div class="ref-link"><input class="in" readonly value="${esc(refLink())}" aria-label="Ton lien"><button class="btn gold" type="button" data-refcopy>${REFP.copied ? "✓ Copié" : "Copier mon lien"}</button></div>
      <div class="ref-share">${navigator.share ? `<button class="chip" type="button" data-refshare>Partager…</button>` : ""}
        <a class="chip" target="_blank" rel="noopener" href="https://twitter.com/intent/tweet?text=${share}">X</a><a class="chip" target="_blank" rel="noopener" href="https://wa.me/?text=${share}">WhatsApp</a>
        <a class="chip" target="_blank" rel="noopener" href="https://t.me/share/url?url=${encodeURIComponent(refLink())}">Telegram</a><a class="chip" target="_blank" rel="noopener" href="https://www.reddit.com/submit?url=${encodeURIComponent(refLink())}">Reddit</a>
        <span class="note">Sur Discord : colle ton lien.</span></div>
      ${D.parrain ? `<p class="note">Ton parrain : <b>${esc(D.parrain.name || "un joueur")}</b> · ${D.parrain.done ? "✓ validé" : `ouvre ${REF_MIN_OPENED} boosters pour valider`}</p>` : ""}
    </section>
    <div class="ref-cols">
      <section class="card sec"><h2>Tes paliers</h2><p class="note">Comptent les amis arrivés et validés pendant l'événement. Les récompenses arrivent toutes seules, avec une notification.</p>
        <div class="ref-tiers">${REF_TIERS.map((t) => `<div class="ref-tier ${n >= t.n ? "on" : next === t ? "next" : ""}"><b>${t.n}</b><small>ami${t.n > 1 ? "s" : ""}</small><span>${esc(t.label)}</span><em>${n >= t.n ? "✓ Gagné" : next === t ? `Encore ${t.n - n}` : "Verrouillé"}</em></div>`).join("")}</div>
        <p class="mono ref-count">${n} filleul${n > 1 ? "s" : ""} validé${n > 1 ? "s" : ""}${D.waiting ? ` · ${D.waiting} en cours` : ""}${next ? ` · encore ${next.n - n} pour « ${esc(next.label)} »` : ""}</p>
        <h3>À gagner au classement</h3><div class="ref-prizes">${REF_PRIZES.map((p) => `<div><b>${p.from === p.to ? `${p.from}${p.from === 1 ? "er" : "e"}` : `${p.from}${p.from === 1 ? "er" : "e"} à ${p.to}e`}</b><span>${esc(p.label)}</span></div>`).join("")}</div></section>
      <section class="card sec"><h2>Classement des parrains</h2>${D.rank ? `<p class="note">Tu es ${D.rank}${D.rank === 1 ? "er" : "e"}.</p>` : ""}
        <div class="ref-board">${(D.board || []).length ? D.board.map((b, i) => `<button class="ref-row ${b.uid === ME ? "me" : ""}" type="button" data-nav="profil" data-p="${b.uid}"><i>${i + 1}</i><img class="av" src="${esc(b.avatar || "")}" alt="" onerror="this.style.visibility='hidden'"><b>${esc(b.name || "Joueur")}</b>${qgTag(b.uid)}<span>${b.n}</span></button>`).join("") : `<p class="note">Personne encore : sois le premier !</p>`}</div></section>
    </div>
    <section class="sec"><div class="sec-h"><h2>Les épisodes de Billy</h2></div><div class="ref-vids">${refVideos()}</div></section>
  </div>`;
};
document.addEventListener("click", async (e) => {
  if (e.target.closest("[data-refcopy]")) { try { await navigator.clipboard.writeText(refLink()); REFP.copied = true; toast("Lien copié : envoie-le à tes amis !"); draw(); } catch (err) { toast("Copie impossible : sélectionne le lien à la main."); } return; }
  if (e.target.closest("[data-refshare]")) { try { await navigator.share({ title: "Re : LOL", text: "Viens jouer à Re : LOL avec moi", url: refLink() }); } catch (err) {} return; }
  const rl = e.target.closest("[data-reflaunch]"); if (rl) { if (!confirm("Lancer le parrainage maintenant pour 2 semaines ? Tout le monde sera prévenu.")) return; try { await srv("admin/ref-launch", { days: 14 }); REFP.data = null; toast("Parrainage lancé pour 2 semaines."); draw(); } catch (err) { toast(err.message); } return; }
  if (e.target.closest("[data-resetall]")) {
    const t = prompt("Remise à zéro COMPLÈTE : collections, essence, marché, échanges, chat, amis, Défilé, Confrontation, parrainage… de TOUS les joueurs. Les comptes, épisodes, créations et prédictions restent.\n\nÉcris TOUT EFFACER pour confirmer :");
    if (t !== "TOUT EFFACER") return toast("Annulé : rien n'a été effacé.");
    const launch = confirm("Lancer aussi le parrainage (2 semaines) dans la foulée ?");
    try { await srv("admin/reset-all", { confirm: t, launchRef: launch }); toast("Tout est remis à zéro. Rechargement…"); setTimeout(() => location.reload(), 1500); } catch (err) { toast(err.message); }
  }
});
// onglet Dev : lancer le parrainage, et la remise à zéro complète (avant la présentation au QG)
{ const f = VIEWS.dev; VIEWS.dev = () => (SRV && IS_DEV ? `<div class="wrap page" style="padding-bottom:0"><section class="card sec ref-danger"><h2>Lancement public</h2>
    <p class="note">Avant de montrer le jeu au QG : remets tout à zéro (tous les joueurs repartent de rien, même vous), puis lance le parrainage pour 2 semaines. Les comptes, les épisodes, les créations et les prédictions sont gardés.</p>
    <div class="row"><button class="btn" type="button" data-reflaunch>Lancer le parrainage (2 semaines)</button><button class="btn danger" type="button" data-resetall>Tout remettre à zéro…</button></div></section></div>` : "") + f(); }
