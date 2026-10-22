// ===== Événements =====
let toastT;
function toast(msg) { const t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 2800); }
const SEG = {
  packTab: (v) => { packTab = v; }, colTab: (v) => { col.tab = v; }, colRar: (v) => { col.rar = v; }, colFac: (v) => { col.fac = col.fac === v ? "" : v; col.tab = "cards"; col.own = "all"; },
  mTab: (v) => { marketTab = v; }, mkRar: (v) => { mk.rar = v; }, mkWin: (v) => { mk.win = +v; }, achF: (v) => { achF = v; }, rankTab: (v) => { boardTab = v; },
  ...Z_SEG, ...ADMIN_SEG,
};
document.addEventListener("click", (e) => {
  const t = e.target;
  if (t.closest("#menuBtn") || t.closest("#avBtn")) return toggleMenu();
  if (menuOpen && !t.closest("#menu") && !t.closest(".hd")) toggleMenu(false);
  const mb = t.closest("#moreBtn"); if (mb) { const m = $("moreMenu"); m.hidden = !m.hidden; mb.setAttribute("aria-expanded", !m.hidden); return; }
  if (!t.closest(".dd") && $("moreMenu")) $("moreMenu").hidden = true;
  const nv = t.closest("[data-nav]"); if (nv) { e.preventDefault(); if (nv.dataset.nav === "market" && !nv.dataset.keep) {} return nav(nv.dataset.nav, nv.dataset.p); }
  const sg = t.closest("[data-seg]"); if (sg) { SEG[sg.dataset.seg]?.(sg.dataset.v); if (sg.dataset.seg === "mkWin" && $("overlay").dataset.lid && !$("overlay").hidden) return openListing($("overlay").dataset.lid); return draw(); }
  const tg = t.closest("[data-toggle]"); if (tg) { mk[tg.dataset.toggle] = !mk[tg.dataset.toggle]; return draw(); }
  const hb = t.closest("[data-hero]"); if (hb) { heroIdx = +hb.dataset.hero; heroPause = Date.now(); return refreshHero(); }
  const pick = t.closest("[data-pick]"); if (pick) { if (packTab === "day") save.packDay = pick.dataset.pick; else save.pack = pick.dataset.pick; persist(); return draw(); }
  const alb = t.closest("[data-album]"); if (alb) { col.fac = alb.dataset.album; col.tab = "cards"; col.own = "all"; return draw(); }
  const ls = t.closest("[data-listing]"); if (ls && !t.closest("[data-buy],[data-cancel]")) return openListing(ls.dataset.listing);
  const st = t.closest("[data-star]"); if (st) { myStars = +st.dataset.star; document.querySelectorAll("[data-star]").forEach((b) => b.classList.toggle("on", +b.dataset.star <= myStars)); return; }
  const cBtn2 = t.closest("[data-claim]"); if (cBtn2) { cBtn2.disabled = true; return claim(cBtn2.dataset.claim, cBtn2.dataset.id); }
  const vBtn = t.closest("[data-vote]"); if (vBtn) return vote(vBtn.dataset.vote, +vBtn.dataset.idx);
  const pqBtn = t.closest("[data-pq]");
  if (pqBtn) {
    const qid = pqBtn.dataset.q, a = pqBtn.dataset.pq;
    if (a === "resolve") { const sel = document.querySelector(`[data-pq-answer="${qid}"]`); if (!sel || sel.value === "") return toast("Choisis d'abord la bonne réponse."); return adminPred("resolve", qid, +sel.value); }
    return adminPred(a, qid);
  }
  const bonusBtn = t.closest("[data-bonus]"); if (bonusBtn) return openBonus(bonusBtn.dataset.bonus);
  const tr = t.closest("[data-trade]"); if (tr) { tr.disabled = true; return answerTrade(tr.dataset.trade, tr.dataset.ta); }
  const pr = t.closest("[data-propose]"); if (pr) return openTradeBuilder(pr.dataset.propose);
  const wi = t.closest("[data-wish]"); if (wi) return toggleWish(wi.dataset.wish);
  const sh = t.closest("[data-show]"); if (sh) return toggleShowcase(sh.dataset.show);
  const disBtn = t.closest("[data-dis]"); if (disBtn) return disenchant(disBtn.dataset.dis, !!disBtn.dataset.gold);
  const shareBtn = t.closest("[data-share]"); if (shareBtn) return share(shareBtn.dataset.share, !!shareBtn.dataset.gold);
  const sellBtn = t.closest("[data-sell]"); if (sellBtn) return openSell(sellBtn.dataset.sell);
  const buyBtn = t.closest("[data-buy]"); if (buyBtn) { buyBtn.disabled = true; return buy(buyBtn.dataset.buy).then(() => { $("overlay").hidden = true; }); }
  const cBtn = t.closest("[data-cancel]"); if (cBtn) { cBtn.disabled = true; return cancelSale(cBtn.dataset.cancel).then(() => { $("overlay").hidden = true; }); }
  const ab = t.closest("[data-act]"), act = ab?.dataset.act;
  if (act === "open-day") return startOpening(false, "jour");
  if (act === "open-pack") return startOpening(!!ab.dataset.paid, ab.dataset.p);
  if (act === "again") return startOpening(!!ab.dataset.paid, opening?.pk?.id || save.pack);
  if (act === "see-pack") { packTab = ab.dataset.p === "jour" || ab.dataset.p === "saison1" ? "day" : "free"; if (packTab === "day") save.packDay = ab.dataset.p; draw(); return $("boosters")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth" }); }
  if (act === "pool") return openPool(ab.dataset.p);
  if (act === "skip") { Coffre.stop(); opening.phase = "done"; return drawOpening(); }
  if (act === "cf-next") return Coffre.next();
  if (act === "cf-sound") return Coffre.toggleSound();
  if (act === "stage-back") { if (opening.phase === "done") return closeStage(); opening.phase = "done"; return drawOpening(); }
  if (act === "stage-close") return closeStage();
  if (act === "to-col") { closeStage(); return nav("collection"); }
  if (act === "dev-refresh") { devData.stats = null; devData.audit = null; draw(); return loadDev(true); }
  if (act === "recycle") return recycle();
  if (act === "craft") return craft();
  if (act === "wish-all") return wishAllMissing();
  if (act === "reset-col") { Object.assign(col, { rar: "", fac: "", own: "all", sort: "num", q: "" }); return draw(); }
  if (act === "market-for") { const c = byId[ab.dataset.p]; mk.q = c ? nameOf(c) : ""; marketTab = "buy"; return nav("market"); }
  if (act === "copy-link") { const u = location.href; navigator.clipboard?.writeText(u).then(() => toast("Lien copié."), () => toast(u)); return; }
  if (act === "chat-show") { openChat(true); chat.card = { id: ab.dataset.p, gold: !own(ab.dataset.p).n }; return drawChat(); }
  if (act === "close" || t.id === "overlay") { $("overlay").hidden = true; delete $("overlay").dataset.lid; return; }
  if (t.closest("#pack") && $("pack").classList.contains("chest")) return tearPack();
  if (t.closest("#revealBtn")) return advanceCard();
  const card = t.closest("[data-card]"); if (card) { if (opening) closeStage(); return nav("carte", card.dataset.card); }
});
function advanceCard() {
  const o = opening;
  if (!o.flipped) { o.flipped = true; return drawOpening(); }
  if (o.i < PACK - 1) { o.i++; o.flipped = false; return drawOpening(); }
  o.phase = "done"; drawOpening();
}
document.addEventListener("submit", (e) => {
  const id = e.target.id;
  if (id === "sellForm") { e.preventDefault(); confirmSell(e.target); }
  if (id === "pqForm") { e.preventDefault(); addQuestion(e.target); }
  if (id === "tradeForm") { e.preventDefault(); sendTrade(); }
  if (id === "avisForm") { e.preventDefault(); sendAvis(); }
  if (id === "bugForm") { e.preventDefault(); sendBug(); }
});
let qT;
const SEARCH = { colQ: (v) => { col.q = v; }, mkQ: (v) => { mk.q = v; }, rankQ: (v) => { rankQ = v; } };
document.addEventListener("input", (e) => {
  const t = e.target;
  if (SEARCH[t.id]) { SEARCH[t.id](t.value); clearTimeout(qT); qT = setTimeout(() => { const id = t.id; draw(); const i = $(id); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } }, 250); }
  if (t.dataset.inp) { mk[t.dataset.inp === "mkMin" ? "min" : "max"] = t.value; clearTimeout(qT); qT = setTimeout(() => { const k = t.dataset.inp; draw(); const i = document.querySelector(`[data-inp=${k}]`); if (i) { i.focus(); } }, 400); }
  if (t.closest?.("#tradeForm")) updateTradeFair();
});
document.addEventListener("change", (e) => {
  const t = e.target;
  const SEL = { colFac: (v) => { col.fac = v; }, colOwn: (v) => { col.own = v; }, colSort: (v) => { col.sort = v; }, mkFac: (v) => { mk.fac = v; }, mkSort: (v) => { mk.sort = v; } };
  if (SEL[t.dataset.sel]) { SEL[t.dataset.sel](t.value); return draw(); }
  if (t.dataset.pqReward) return adminPred("reward", t.dataset.pqReward, t.value);
  if (t.closest?.("#tradeForm")) updateTradeFair();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { $("overlay").hidden = true; closeMenu(); }
  if ((e.key === "Enter" || e.key === " ") && e.target.matches?.("[data-card],[data-listing],[data-sell]")) { e.preventDefault(); e.target.click(); }
});

// ===== Démarrage =====
let heroPause = 0;
function refreshHero() { const h = $("hero"); if (h) { h.outerHTML = heroHTML(); } }
regen(); ensureDaily();
route();
loadAccount();
let wasFull = save.free >= FREE_MAX;
setInterval(() => { const full = save.free >= FREE_MAX; if (full && !wasFull) pushOS("Tes boosters gratuits sont pleins : viens les ouvrir !"); wasFull = full; }, 30000);
setInterval(() => { if (regen()) persist(); if (!opening && $("overlay").hidden && !menuOpen && view === "boosters" && !document.activeElement?.closest?.("input,select,textarea")) draw(); else header(); }, 30000);
setInterval(() => { if (view === "boosters" && !opening && $("overlay").hidden && Date.now() - heroPause > 15000 && !document.hidden) { heroIdx++; refreshHero(); } }, 7000);
// en mode serveur, on resynchronise de temps en temps (ventes conclues, échanges reçus…)
setInterval(() => { if (SRV && !busy && !opening && $("overlay").hidden) srv("state").then(() => header()).catch(() => {}); }, 45000);
connect();
