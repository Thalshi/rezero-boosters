// Campagne de tests de bout en bout (navigateurs réels, serveur local, base temporaire isolée).
// Chaque parcours clique comme un joueur, puis compare ce que l'écran a montré à ce que le serveur a décidé.
// Usage : node tests/campagne.mjs   (REPORT_DIR pour les captures et le rapport JSON)
import { startServer, player, reporter, IDS, grant, playwright, ROOT, sleep } from "./lib.mjs";
import * as G from "../worker/game.js";
import { botAction } from "../worker/confront/bots.mjs";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

const OUT = process.env.REPORT_DIR || join(ROOT, "tests/reports/campagne");
mkdirSync(OUT, { recursive: true });
const srv = await startServer({ port: +(process.env.PORT || 8890) });
const t = reporter("Campagne de tests de bout en bout");
const { chromium } = await playwright();
const browser = await chromium.launch();
const VIEW = { mobile: { width: 390, height: 844 }, ordi: { width: 1366, height: 900 } };
const sql = (q) => { for (let i = 0; ; i++) { try { return srv.sql(q); } catch (e) { if (i > 5) throw e; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300); } } };
const veteran = (p) => sql(`UPDATE players SET data = json_set(data, '$.created', ${Date.now() - 10 * 86400e3}) WHERE uid = '${p.id}'`);
const shot = (page, name) => page.screenshot({ path: join(OUT, name + ".png"), fullPage: false }).catch(() => {});

// un joueur = une API (pour vérifier le serveur) + un navigateur (pour cliquer)
async function joueur(id, name, { vp = "mobile", reduced = false } = {}) {
  const api = await player(srv.base, id, name); await api.api("state");
  const ctx = await browser.newContext({ viewport: VIEW[vp], reducedMotion: reduced ? "reduce" : "no-preference", hasTouch: vp === "mobile" });
  // filet : un message montré au joueur ne doit jamais contenir une erreur technique
  await ctx.addInitScript(() => { window.__toasts = []; new MutationObserver(() => { const t = document.getElementById("toast"); if (t && !t.hidden && t.textContent) window.__toasts.push(t.textContent); }).observe(document, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["hidden"] }); });
  const page = await ctx.newPage(), errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => { errors.push("boîte de dialogue : " + d.message()); d.dismiss(); });
  await page.goto(`${srv.base}/auth/dev?id=${id}&name=${encodeURIComponent(name)}`); await page.waitForTimeout(2500);
  const go = async (h) => { await page.evaluate((h) => { location.hash = "#/" + h; }, h); await page.waitForTimeout(500); };
  const state = async () => (await api.api("state")).state;
  return { id: api.id, api, ctx, page, errors, go, state, name, close: () => ctx.close() };
}
// ouvre un booster ou un coffre par l'interface ; renvoie ce que le serveur a tiré et ce que l'écran a montré
async function ouvrir(J, selector, { label = "", flipAll = false } = {}) {
  const { page } = J;
  const resP = page.waitForResponse((r) => r.url().includes("/api/game/open") || r.url().includes("/api/game/lab/open"), { timeout: 15000 }).catch((e) => e);
  await page.click(selector, { timeout: 10000 });
  const resp = await resP;
  if (resp instanceof Error) throw new Error(`aucune réponse du serveur après le clic sur ${selector}`);
  const res = await resp.json();
  await page.waitForTimeout(600);
  const chest = (await page.locator("#cfChest").count()) > 0;
  let leaked = 0;
  if (chest) {
    leaked = await page.locator("#stage [data-card]").count(); // aucune carte ne doit être visible avant l'ouverture
    await page.click("#cfKey", { force: true });
    const sc = G.CHEST_BY_ID[res.scenario];
    for (let i = 0; i < 40 && !(await page.locator("#revealBtn").count()); i++) { if (i === 3) leaked += await page.locator("#stage .kc").count(); await page.waitForTimeout(250); }
    if (!(await page.locator("#revealBtn").count())) return { res, chest, stuck: true, scenario: sc?.id };
    // après le coffre, les cartes se dévoilent une par une (comme la pochette)
    const faces = [];
    if (flipAll) for (let i = 0; i < res.cards.length; i++) {
      // retournement : jusqu'à 1,6 s (Mythique), puis la carte file se ranger
      await page.click("#revealBtn"); await page.waitForSelector("#stage .reveal-card.on .kc", { timeout: 4000 }).catch(() => {}); await page.waitForTimeout(150);
      faces.push(await page.getAttribute("#stage .reveal-card.on .kc", "aria-label").catch(() => ""));
      await page.click("#revealBtn"); await page.waitForTimeout(550);
    }
    if (!(await page.locator(".summary").count())) await page.click('#stage [data-act="skip"]');
    res.faces = faces;
  } else {
    await page.click("#pack"); await page.waitForTimeout(900);
    for (let i = 0; i < 40 && !(await page.locator(".summary").count()); i++) { await page.click("#revealBtn", { timeout: 2000 }).catch(() => {}); await page.waitForTimeout(450); }
  }
  await page.waitForSelector(".summary", { timeout: 8000 });
  const shown = await page.$$eval(".summary [data-card]", (els) => els.map((e) => e.getAttribute("data-card")));
  return { res, chest, shown, leaked, scenario: res.scenario };
}
// choisit un booster sur la page Boosters comme un joueur (onglet, booster), puis renvoie le sélecteur du bouton Ouvrir
async function choisir(page, packId, paid = false) {
  await page.evaluate(() => { location.hash = "#/boosters"; }); await page.waitForTimeout(400);
  await page.click(`[data-seg="packTab"][data-v="${paid ? "shop" : "free"}"] >> visible=true`).catch(() => {}); await page.waitForTimeout(250);
  await page.click(`[data-pick="${packId}"] >> visible=true`).catch(() => {}); await page.waitForTimeout(250);
  return `[data-act="open-pack"][data-p="${packId}"]${paid ? "[data-paid]" : ":not([data-paid])"} >> visible=true`;
}
async function finir(page) {
  if (await page.locator("#cfKey").count()) { await page.click("#cfKey", { force: true }); await page.waitForSelector("#revealBtn", { timeout: 20000 }).catch(() => {}); }
  else if (await page.locator("#pack").count()) { await page.click("#pack"); await page.waitForTimeout(900); }
  if (!(await page.locator(".summary").count())) await page.click('#stage [data-act="skip"]').catch(() => {});
  await page.waitForTimeout(300);
  await closeStage(page);
  await page.waitForTimeout(300);
}
const deco = async (page, scope) => page.locator(`${scope} .cz-cadre, ${scope} .cz-aura, ${scope} .cz-holo, ${scope} .cz-part, ${scope} .cz-orn, ${scope} .cz-pres, ${scope} [class*="cz-fond"]`).count().catch(() => 0);
const decoOf = async (page, scope) => (await page.locator(scope).count()) ? await page.evaluate((sel) => { const el = document.querySelector(sel); return !!el && (el.className.includes("cz-") || !!el.querySelector('[class*="cz-"]') || (el.getAttribute("style") || "").includes("--z")); }, scope) : false;
const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
// fermer l'ouverture, puis la fenêtre « Titre débloqué » si un titre vient d'être gagné
const closeStage = async (page) => { await page.click('#stage [data-act="stage-close"]').catch(() => page.click('#stage [data-act="lab-back"]').catch(() => {})); await page.waitForTimeout(250); if (await page.locator(".ttl-sheet").count()) await page.click('.ttl-sheet [data-act="close"] >> nth=-1').catch(() => {}); };

let A, P, Q, R, solo, inst, firstBuy, lst, sk;
let CUR = null; // joueur en cours dans une étape qui crée ses propres joueurs (pour la capture en cas d'échec)
async function etape(name, fn) { if (process.env.ONLY && !name.startsWith(process.env.ONLY)) return; t.section(name); try { await fn(); } catch (e) { t.check(`${name} : l'étape va jusqu'au bout`, false, String(e.message || e).slice(0, 500)); for (const J of [A, P, Q, R, CUR].filter(Boolean)) await shot(J.page, `echec-${name.slice(0, 2).trim()}-${J.name.replace(/\W+/g, "-")}`); } }
try {
  // =====================================================================================
  await etape("1. Parcours joueur : boosters, coffre, économie (téléphone, ordi, animations réduites)", async () => {
  for (const [k, conf] of [["mobile", { vp: "mobile" }], ["ordi", { vp: "ordi" }], ["réduit", { vp: "mobile", reduced: true }]]) {
    const pid = { mobile: IDS.p1, ordi: IDS.p2, "réduit": IDS.p3 }[k];
    const J = await joueur(pid, "Joueur " + k, conf);
    CUR = J;
    let s0 = await J.state();
    t.check(`${k} · compte neuf : 3 boosters gratuits, 120 ◆`, s0.free === G.FREE_MAX && s0.chakra === 120);
    const o1 = await ouvrir(J, await choisir(J.page, "mix"));
    t.check(`${k} · booster gratuit : l'écran montre exactement les 5 cartes du serveur`, same(o1.shown, o1.res.cards.map((c) => c.id)), { écran: o1.shown, serveur: o1.res.cards.map((c) => c.id) });
    let s1 = await J.state();
    t.check(`${k} · booster gratuit : 1 gratuit en moins, essence inchangée, 5 cartes ajoutées`, s1.free === s0.free - 1 && s1.chakra === s0.chakra && Object.values(s1.owned).reduce((a, o) => a + o.n + o.gold, 0) === 5);
    if (k === "mobile") await shot(J.page, "1-recap-booster-mobile");
    await closeStage(J.page);
    // pack du jour
    await J.go("boosters");
    await J.page.click('[data-seg="packTab"][data-v="day"] >> visible=true').catch(() => {}); await J.page.waitForTimeout(300); // l'onglet du jour, pas le carrousel qui tourne
    const od = await ouvrir(J, '[data-act="open-day"] >> visible=true');
    t.check(`${k} · pack du jour : cartes identiques au serveur`, same(od.shown, od.res.cards.map((c) => c.id)));
    await closeStage(J.page);
    s1 = await J.state();
    t.check(`${k} · pack du jour : refusé une 2e fois`, (await J.api.api("open", { pack: "jour" })).status === 400);
    // coffre (scénario choisi par le serveur), 4 ouvertures
    grant(srv, [J.api], { free: 6 });
    await J.page.reload(); await J.page.waitForTimeout(2000);
    for (let i = 0; i < 4; i++) {
      const oc = await ouvrir(J, await choisir(J.page, "coffre"), { flipAll: true });
      t.check(`${k} · coffre ${i + 1} (${oc.scenario}) : aucune carte visible avant l'ouverture`, !oc.leaked, oc.leaked);
      t.check(`${k} · coffre ${i + 1} : cartes retournées et récapitulatif = cartes du serveur`, !oc.stuck && same(oc.shown, oc.res.cards.map((c) => c.id)) && oc.res.faces.length === 5, { stuck: oc.stuck, écran: oc.shown, serveur: oc.res.cards.map((c) => c.id) });
      if (i === 0 && k !== "réduit") await shot(J.page, `1-recap-coffre-${k}`);
      await closeStage(J.page);
    }
    // achat avec l'essence : double clic, un seul débit
    grant(srv, [J.api], { free: 0, chakra: 1000 });
    await J.page.reload(); await J.page.waitForTimeout(2000);
    const buySel = await choisir(J.page, "mix", true);
    s0 = await J.state();
    await J.page.dblclick(buySel);
    await J.page.waitForTimeout(1500);
    s1 = await J.state();
    t.check(`${k} · achat en double clic : un seul booster, ${G.PRICE} ◆ débités une fois`, s1.chakra === s0.chakra - G.PRICE && s1.opened === s0.opened + 1, { avant: s0.chakra, après: s1.chakra });
    await finir(J.page);
    t.check(`${k} · l'ouverture achetée se termine et se ferme`, (await J.page.locator("#stage:not([hidden])").count()) === 0);
    // missions : « Tout réclamer » verse exactement ce que les règles prévoient
    await J.go("missions");
    const before = await J.state(), exp = JSON.parse(JSON.stringify(before));
    G.claimAnyS(exp, "all", null, Date.now());
    const btn = J.page.locator('[data-claim="all"]');
    if (await btn.count() && await btn.isEnabled()) {
      await btn.click(); await J.page.waitForTimeout(1200);
      const after = await J.state();
      t.check(`${k} · missions : essence versée = règles du jeu (+${exp.chakra - before.chakra} ◆)`, after.chakra === exp.chakra, { attendu: exp.chakra, obtenu: after.chakra });
    } else t.note(`${k} · aucune mission à réclamer à ce moment`);
    // recyclage des doublons
    const pre = await J.state(), copy = JSON.parse(JSON.stringify(pre)), val = G.recycleS(copy, Date.now());
    const rec = await J.api.api("recycle");
    t.check(`${k} · recyclage : essence = valeur des doublons (${val} ◆)`, rec.value === val && rec.state.chakra === pre.chakra + val);
    t.check(`${k} · aucune erreur JavaScript, aucune boîte de dialogue`, J.errors.length === 0, J.errors);
    await J.close();
  }

  });
  // =====================================================================================

  await etape("2. Les 30 scénarios du coffre par le serveur (labo) : la feinte ne change jamais les cartes", async () => {
  A = await joueur(IDS.admin, "Billy", { vp: "ordi" });
  await A.go("labo"); await A.page.waitForTimeout(1200);
  sk = (r, i = 0, who) => G.SKINS.filter((c) => c.rar === r && (!who || c.who === who))[i].id;
  const SETS = { "tr-jumeaux": [["m", 0], ["m", 1], ["c", 0], ["c", 1], ["c", 2]], "tr-couronne": [["l", 0], ["l", 1], ["c", 0], ["c", 1], ["c", 2]], "tr-trinite": [["e", 0], ["e", 1], ["c", 0], ["c", 1], ["c", 2]],
    "se-miroir": [["e", 0], ["e", 0], ["c", 0], ["c", 1], ["c", 2]], "se-createur": [["e", 0, "billy"], ["c", 0], ["c", 1], ["c", 2], ["c", 3]], "se-arcenciel": [["c", 0], ["pc", 0], ["r", 0], ["e", 0], ["l", 0]] };
  let bad30 = [], stuck30 = [];
  for (const sc of G.CHEST_SCENARIOS) {
    const picks = (SETS[sc.id] || [["m", 0], ["l", 0], ["e", 0], ["r", 0], ["c", 0]]).map(([r, i, w]) => ({ id: sk(r, i, w), gold: false }));
    if (["tr-pluie-or", "fk-cle"].includes(sc.id)) { picks[3].gold = true; picks[4].gold = true; }
    if (sc.id === "tr-reflet") picks[4].gold = true;
    await A.page.evaluate(({ picks, id }) => { lab.picks = picks.map((p) => p.id); lab.golds = picks.map((p) => p.gold); lab.scenario = id; lab.pack = "coffre"; draw(); }, { picks, id: sc.id });
    const o = await ouvrir(A, '[data-act="lab-open"]', { flipAll: true });
    if (o.stuck) stuck30.push(sc.id);
    else if (!same(o.shown, picks.map((p) => p.id)) || !same(o.res.cards.map((c) => c.id), picks.map((p) => p.id)) || o.leaked) bad30.push({ sc: sc.id, écran: o.shown, leaked: o.leaked });
    await A.page.click('#stage [data-act="lab-back"]').catch(() => {}); await A.page.waitForTimeout(500);
  }
  t.check("30 scénarios joués jusqu'au bout, sans blocage", stuck30.length === 0, stuck30);
  t.check("30 scénarios : cartes montrées = cartes tirées, aucune visible avant l'ouverture", bad30.length === 0, bad30.slice(0, 3));
  // pendant une feinte, la couleur affichée ne dépasse jamais la vraie
  await A.page.evaluate(() => { lab.picks = [null, null, null, null, null]; lab.scenario = "fk-redemarrage"; lab.pack = "coffre"; draw(); });
  const picksM = [["m", 0], ["c", 0], ["c", 1], ["c", 2], ["c", 3]].map(([r, i]) => sk(r, i));
  await A.page.evaluate((ids) => { lab.picks = ids; draw(); }, picksM);
  const resP = A.page.waitForResponse((r) => r.url().includes("/api/game/lab/open")); await A.page.click('[data-act="lab-open"]'); await resP; await A.page.waitForTimeout(500);
  await A.page.click("#cfKey", { force: true });
  const tints = new Set();
  for (let i = 0; i < 30; i++) { tints.add(await A.page.evaluate(() => getComputedStyle(document.getElementById("cf") || document.body).getPropertyValue("--rare").trim())); await A.page.waitForTimeout(150); if (await A.page.locator(".cf-grid").count()) break; }
  t.check("feinte « faux redémarrage » sur une Mythique : passe par des teintes plus basses puis finit rouge", tints.size >= 2, [...tints]);
  await A.page.click('#stage [data-act="skip"]').catch(() => {}); await A.page.click('#stage [data-act="lab-back"]').catch(() => {});

  });
  // =====================================================================================

  await etape("3. Boutique, invocations, Atelier : pas de double débit, affichage partout", async () => {
  P = await joueur(IDS.p1, "Joueur mobile", { vp: "mobile" });
  grant(srv, [P.api], { chakra: 6000, free: 12 });
  for (let i = 0; i < 10; i++) await P.api.api("open", { pack: "mix" });
  await P.page.reload(); await P.page.waitForTimeout(2000);
  await P.go("boutique");
  let sb = await P.state();
  firstBuy = await P.page.getAttribute(".zs-tile:has(.zs-price:not(.own):not(.only)) >> nth=0", "data-zitem");
  await P.page.click(`[data-zitem="${firstBuy}"] >> nth=0`); await P.page.waitForTimeout(400);
  t.check("Boutique : la fiche montre l'objet sur ta carte vedette avant l'achat", (await P.page.locator(".zs-sheet .zs-prev-card .kcw").count()) === 1);
  await P.page.dblclick(`#overlay [data-zbuy="${firstBuy}"]`); await P.page.waitForTimeout(1200);
  t.check("Boutique : après l'achat, la fiche indique « Équiper à l'Atelier »", (await P.page.locator('#overlay [data-nav="atelier"]').count()) === 1);
  await P.page.click('#overlay [data-act="close"]').catch(() => {});
  let sa = await P.state();
  t.check("Boutique : double clic sur Acheter, un seul débit", sa.chakra === sb.chakra - G.COS_PRICE[G.COS_BY_ID[firstBuy].rar] && sa.cos.own[firstBuy], { avant: sb.chakra, après: sa.chakra });
  await P.go("sanctuaire");
  sb = await P.state();
  await P.page.dblclick('[data-zsum="5"]'); await P.page.waitForTimeout(500);
  await P.page.waitForSelector("#stage #pack", { timeout: 12000 }).catch(() => {});
  sa = await P.state();
  t.check("Sanctuaire ×5 : double clic, une seule invocation (5 objets, un débit)", sa.chakra === sb.chakra - G.summonCost(5) && sa.cos.inst.length === (sb.cos?.inst?.length || 0) + 5, { débit: sb.chakra - sa.chakra, objets: sa.cos.inst.length });
  await P.page.click("#pack"); await P.page.waitForTimeout(900); await P.page.click('[data-act="skip"]'); await P.page.waitForTimeout(300);
  t.check("Sanctuaire ×5 : la pochette mène au récapitulatif des 5 objets", (await P.page.locator(".summary .ocos").count()) === 5);
  await closeStage(P.page);
  sb = sa;
  await P.page.dblclick('[data-zsum="10"]'); await P.page.waitForTimeout(800);
  sa = await P.state();
  t.check("Sanctuaire ×10 : double clic, une seule invocation (10 objets, un débit), ouverte dans le coffre", sa.chakra === sb.chakra - G.summonCost(10) && sa.cos.inst.length === sb.cos.inst.length + 10 && (await P.page.locator("#cfChest").count()) === 1);
  await P.page.click("#cfKey", { force: true }); await P.page.waitForSelector("#revealBtn", { timeout: 20000 }).catch(() => {});
  t.check("Sanctuaire ×10 : après le scénario, les 10 objets se dévoilent un par un", (await P.page.locator("#stage .pdots i").count()) === 10 && (await P.page.locator("#revealBtn").count()) === 1);
  await P.page.click('[data-act="skip"]').catch(() => {}); await closeStage(P.page);
  sb = sa;
  await P.page.check("#zSkip"); await P.page.dblclick('[data-zsum="1"]'); await P.page.waitForTimeout(1500);
  sa = await P.state();
  t.check("Sanctuaire ×1 sans animation : double clic, un seul débit", sa.chakra === sb.chakra - G.summonCost(1) && sa.cos.inst.length === sb.cos.inst.length + 1);
  await closeStage(P.page);
  // design avec un objet de compte + une instance, sur une carte possédée en un exemplaire
  solo = Object.keys(sa.owned).find((id) => sa.owned[id].n === 1 && !sa.owned[id].gold && !G.CARD_BY_ID[id].skin);
  inst = sa.cos.inst.find((x) => G.COS_BY_ID[x.c].slot !== G.COS_BY_ID[firstBuy].slot);
  await P.go("atelier/" + solo);
  await P.page.click(`[data-zset][data-ref="a:${firstBuy}"]`); await P.page.waitForTimeout(150);
  await P.page.click(`[data-zset][data-ref="i:${inst.i}"]`); await P.page.waitForTimeout(150);
  await P.page.click("[data-zsave]"); await P.page.waitForTimeout(800);
  await P.page.click("[data-zfeat]"); await P.page.waitForTimeout(800);
  sa = await P.state();
  t.check("Atelier : design (compte + instance) et vedette enregistrés par le serveur", Object.keys(sa.cos.designs[solo] || {}).length === 2 && sa.featured === solo);
  await P.go("collection"); await P.page.waitForTimeout(500);
  await P.page.fill("#colQ, input[type=search]", G.PEOPLE[G.CARD_BY_ID[solo].who].name).catch(() => {}); await P.page.waitForTimeout(500);
  const inCol = await decoOf(P.page, `.kcw[data-card="${solo}"]`);
  await P.go("carte/" + solo); const inSheet = await decoOf(P.page, ".wk-card .kcw");
  await P.page.click(`[data-show="${solo}"]`).catch(() => {}); await P.page.waitForTimeout(800);
  await P.go("profil/moi"); await P.page.waitForTimeout(500);
  const inFeat = await decoOf(P.page, ".zfeat .kcw"), inVit = await decoOf(P.page, ".vitrine .kcw");
  await shot(P.page, "3-profil-vedette-mobile");
  t.check("cosmétiques affichés : collection", inCol);
  t.check("cosmétiques affichés : fiche de la carte", inSheet);
  t.check("cosmétiques affichés : carte vedette du profil", inFeat);
  t.check("cosmétiques affichés : vitrine du profil", inVit);
  Q = await joueur(IDS.p2, "Joueur ordi", { vp: "ordi" });
  const prof = await Q.api.api("profile", { uid: P.id });
  await Q.go("profil/" + P.id); await Q.page.waitForTimeout(1500);
  t.check("cosmétiques affichés : profil vu par un autre joueur (vedette)", (await decoOf(Q.page, ".zfeat .kcw")) && prof.featured === solo);

  });
  // =====================================================================================

  await etape("4. Marché : vente avec design entre deux joueurs, notification", async () => {
  await P.go("carte/" + solo); await P.page.click(`[data-sell="${solo}"]`); await P.page.waitForTimeout(400);
  t.check("formulaire de vente : option « avec son design » et liste de ce qui part", (await P.page.locator("#sellDz").count()) === 1 && (await P.page.locator("#sellForm .dz-box").count()) === 1);
  await P.page.fill("#sellPrice", "25"); await P.page.click('#sellForm button[type="submit"]'); await P.page.waitForTimeout(1500);
  lst = (await Q.api.coll("GET", "market")).body.docs.find((d) => d.data.card === solo && d.data.status === "open");
  t.check("annonce créée avec son design (instance sous séquestre)", !!lst && lst.data.dz?.inst?.length === 1);
  grant(srv, [Q.api], { chakra: 500, free: 12 }); for (let i = 0; i < 10; i++) await Q.api.api("open", { pack: "mix" });
  await Q.page.reload(); await Q.page.waitForTimeout(2500); await Q.go("market"); await Q.page.waitForTimeout(1500);
  t.check("cosmétiques affichés : annonce au marché", await decoOf(Q.page, `.ls[data-listing="${lst.id}"]`));
  await Q.page.click(`[data-listing="${lst.id}"]`); await Q.page.waitForTimeout(400);
  t.check("fiche d'annonce : « Inclus avec la carte » listé", (await Q.page.locator("#overlay .dz-box").count()) === 1);
  const qb = await Q.state();
  await Q.page.dblclick(`[data-buy="${lst.id}"]`); await Q.page.waitForTimeout(1500);
  const qa = await Q.state(), pa = await P.state();
  t.check("achat en double clic : payé une fois, carte et instance reçues", qa.chakra === qb.chakra - 25 && G.hasCard(qa, solo) && qa.cos?.inst?.some((x) => x.i === inst.i));
  t.check("vendeur : payé, l'objet de compte reste, la vedette est retirée", pa.cos.own[firstBuy] && pa.featured !== solo);
  await P.page.waitForTimeout(16000); // le pouls apporte la notification de vente
  await P.page.reload(); await P.page.waitForTimeout(2500);
  t.check("le vendeur reçoit la notification de vente", await P.page.evaluate(() => notif.items.some((n) => n.kind === "sold")));

  });
  // =====================================================================================

  await etape("5. Défilé des Légendes à plusieurs (admin, 3 joueurs, mobile)", async () => {
  await A.go("defile"); await A.page.waitForTimeout(1200);
  if (await A.page.locator("#defTitle").count()) { await A.page.fill("#defTitle", "Défilé de la campagne"); await A.page.click('[data-act="def-prev"]'); await A.page.click('[data-act="def-new"]'); await A.page.waitForTimeout(1200); }
  for (const J of [P, Q]) { await J.page.reload(); await J.page.waitForTimeout(2000); await J.go("defile"); await J.page.waitForTimeout(1500); await J.page.click('[data-act="def-enter"]'); await J.page.waitForTimeout(1200); }
  R = await joueur(IDS.p3, "Joueur réduit", { vp: "mobile", reduced: true });
  await R.go("defile"); await R.page.waitForTimeout(1500); await R.page.click('[data-act="def-enter"]'); await R.page.waitForTimeout(1200);
  t.check("3 inscriptions par l'interface", (await A.api.api("defile/state")).current.entries.length === 3);
  await A.page.reload(); await A.page.waitForTimeout(2000); await A.go("defile"); await A.page.waitForTimeout(1200);
  await A.page.click('[data-act="def-votes"]'); await A.page.waitForTimeout(1200);
  for (const J of [P, Q, R]) veteran(J.api);
  sql(`UPDATE players SET data = json_set(data, '$.opened', 20) WHERE uid IN ('${P.id}','${Q.id}','${R.id}')`);
  for (const [J, to] of [[P, Q], [Q, P], [R, P]]) { await J.page.reload(); await J.page.waitForTimeout(2000); await J.go("defile"); await J.page.waitForTimeout(1500); await J.page.click(`[data-defvote="${to.id}"]`); await J.page.waitForTimeout(1000); }
  t.check("pas de bouton pour voter pour soi", (await P.page.locator(`[data-defvote="${P.id}"]`).count()) === 0);
  // modération par l'interface, sans boîte de dialogue
  await A.page.reload(); await A.page.waitForTimeout(2000); await A.go("defile"); await A.page.waitForTimeout(1200);
  await shot(A.page, "5-defile-admin-ordi");
  const pBefore = (await P.state()).chakra;
  await A.page.click('[data-act="def-close"]'); await A.page.waitForTimeout(300);
  t.check("clore demande une confirmation dans la page (pas de boîte bloquée)", (await A.api.api("defile/state")).current.phase === "votes");
  await A.page.click('[data-act="def-close"]'); await A.page.waitForTimeout(2000);
  const fin = await A.api.api("defile/state");
  t.check("clôture : P gagne avec 2 voix", fin.current.phase === "clos" && fin.current.rank[0].uid === P.id && fin.current.rank[0].votes === 2, fin.current.rank);
  t.check("récompense du gagnant versée une fois", (await P.state()).chakra === pBefore + G.DEFILE_REWARDS[0] + G.DEFILE_PARTICIPATION);
  await R.go("boosters"); await R.page.reload(); await R.page.waitForTimeout(2500);
  t.check("accueil : le gagnant est affiché", (await R.page.locator(".def-hall .kcw").count()) === 1);
  // nouvelle édition et retrait avec motif dans la page
  await A.page.fill("#defTitle", "Deuxième"); await A.page.click('[data-act="def-prev"]'); await A.page.click('[data-act="def-new"]'); await A.page.waitForTimeout(1000);
  await R.go("defile"); await R.page.waitForTimeout(1200); await R.page.click('[data-act="def-enter"]'); await R.page.waitForTimeout(1000);
  await A.page.reload(); await A.page.waitForTimeout(2000); await A.go("defile"); await A.page.waitForTimeout(1200);
  await A.page.click(`[data-defrm="${R.id}"]`); await A.page.waitForTimeout(300);
  await A.page.fill("#defRmWhy", "carte en double"); await A.page.click(`[data-defrmgo="${R.id}"]`); await A.page.waitForTimeout(1200);
  t.check("modération : retrait avec motif depuis la page", (await R.api.api("defile/state")).current.entries.find((e) => e.uid === R.id)?.reason === "carte en double");

  });
  // =====================================================================================

  await etape("6. Confrontation : 2 humains + 1 bot par l'interface, jusqu'à la fin", async () => {
  const cr = await P.api.api("confront/create", { nom: "Campagne", public: true, partage: true });
  const gid = cr.gid;
  await Q.api.api("confront/act", { gid, action: { type: "rejoindre" } });
  // vue classique ici (boutons data-cfa) : l'arène 3D a son propre test, et deux arènes en WebGL logiciel ralentissent trop la machine de test
  for (const J of [P, Q]) await J.page.evaluate(() => localStorage.setItem("cf-vue", "classique"));
  for (const J of [P, Q]) { await J.go("confront/" + gid); await J.page.waitForTimeout(1500); }
  await P.page.click('[data-act="cf-bot"]'); await P.page.waitForTimeout(1200);
  await Q.page.click('[data-cfready="1"]'); await Q.page.waitForTimeout(1200); await P.go("confront/" + gid); await P.page.waitForTimeout(1500);
  await P.page.click(`[data-cfa='{"type":"lancer"}']`); await P.page.waitForTimeout(2200);
  for (const J of [P, Q]) { await J.page.waitForTimeout(1200); await J.page.click('[data-act="cf-contrib"]').catch(() => {}); await J.page.waitForTimeout(1500); }
  for (const J of [P, Q]) { await J.page.waitForSelector(".cf-prop .btn", { timeout: 8000 }).catch(() => {}); await J.page.click(".cf-prop .btn >> nth=0").catch(() => {}); await J.page.waitForTimeout(1200); }
  await shot(Q.page, "6-confront-table-ordi");
  let phase = "", acts = 0, t0 = Date.now();
  while (Date.now() - t0 < 240000) {
    let moved = false;
    for (const J of [P, Q]) {
      await J.page.waitForTimeout(250);
      const v = await J.page.evaluate(async () => { await cfLoadTable(CF.gid); return CF.table?.vue; });
      phase = v?.phase;
      if (phase === "fin") break;
      const a = v && botAction(v, {});
      if (!a) continue;
      // un clic réel quand le bouton existe, sinon la même action par la fonction de la page
      const sel = `[data-cfa='${JSON.stringify(a)}']`;
      if (await J.page.locator(sel).count()) await J.page.click(sel); else await J.page.evaluate((a) => cfAct(a), a);
      acts++; moved = true;
    }
    if (phase === "fin") break;
    if (!moved) await sleep(500);
  }
  await shot(P.page, "6-confront-fin-mobile");
  t.check("partie à 3 (2 humains + 1 bot) terminée sans blocage", phase === "fin", { phase, actions: acts, secondes: Math.round((Date.now() - t0) / 1000) });
  t.check("verrous levés en fin de partie", !(await P.state()).confront && !(await Q.state()).confront);
  const journal = await P.page.evaluate(() => (CF.table?.vue?.journal || []).map((e) => [e.type, !!EVT[e.type] || ["attente", "attente_annulee", "phase"].includes(e.type), cfEvent(e)]));
  t.check("journal : chaque événement a un texte en français, jamais « undefined »", journal.every(([, ok, txt]) => ok && !/undefined/.test(txt)), journal.filter(([, ok, txt]) => !ok || /undefined/.test(txt)).slice(0, 5));
  });

  await etape("7. Confrontation : 2 à 7 joueurs (humains et bots) par l'API, toutes les tables se terminent", async () => {
  const extra = await Promise.all(["700000000000000001", "700000000000000002", "700000000000000003", "700000000000000004"].map((id, i) => player(srv.base, id, "H" + i)));
  for (const e of extra) await e.api("state");
  for (const n of [2, 3, 4, 5, 6, 7]) {
    const humans = [P.api, Q.api, R.api, ...extra].slice(0, Math.max(1, Math.ceil(n / 2)));
    const c = await humans[0].api("confront/create", { nom: "T" + n, partage: true });
    for (const h of humans.slice(1)) { await h.api("confront/act", { gid: c.gid, action: { type: "rejoindre" } }); await h.api("confront/pret", { gid: c.gid, pret: true }); }
    for (let b = humans.length; b < n; b++) await humans[0].api("confront/bot", { gid: c.gid });
    await humans[0].api("confront/act", { gid: c.gid, action: { type: "lancer" } });
    let ph = "", steps = 0;
    for (let k = 0; k < 4000 && ph !== "fin"; k++) {
      let moved = false;
      for (const h of humans) { const v = (await h.api("confront/state", { gid: c.gid })).vue; ph = v.phase; if (ph === "fin") break; const a = botAction(v, {}); if (!a) continue; const r = await h.api("confront/act", { gid: c.gid, action: a }); if (r.status !== 200) { ph = "erreur " + r.error; k = 1e9; break; } steps++; moved = true; }
      if (!moved && ph !== "fin") await sleep(50);
    }
    t.check(`${n} joueurs (${humans.length} humains, ${n - humans.length} bots) : partie terminée`, ph === "fin", { phase: ph, actions: steps });
  }
  });

  await etape("8. Admin : interrupteurs, annonces, épisodes", async () => {
  await A.go("admin"); await A.page.waitForTimeout(1000);
  await A.page.uncheck('[data-feat="sanctuaire"]'); await A.page.waitForTimeout(1800);
  await R.page.reload(); await R.page.waitForTimeout(2500);
  await R.page.click("#menuBtn"); await R.page.waitForTimeout(300);
  t.check("Sanctuaire fermé depuis l'admin : disparaît du menu du joueur", !(await R.page.locator("#menu").innerText()).includes("Sanctuaire"));
  t.check("… et le serveur refuse l'invocation", (await R.api.api("summon", { n: 1 })).status === 403);
  await A.page.check('[data-feat="sanctuaire"]'); await A.page.waitForTimeout(1500);
  t.check("rouvert : l'invocation repasse", (await R.api.api("summon", { n: 1 })).status !== 403);
  if (await A.page.locator("#annText").count()) {
    await A.page.fill("#annText", "Test de la campagne"); await A.page.click('#annForm button[type="submit"]'); await A.page.waitForTimeout(1500);
    const pul = await R.api.api("pulse", { after: null });
    t.check("annonce envoyée à tout le QG", JSON.stringify(pul.body || pul).includes("Test de la campagne"));
  }
  });

  await etape("9. Bilan des erreurs dans les navigateurs", async () => {
  for (const J of [A, P, Q, R]) t.check(`${J.name} : aucune erreur JavaScript ni boîte de dialogue`, J.errors.length === 0, J.errors.slice(0, 5));
  for (const J of [A, P, Q, R]) { const bad = (await J.page.evaluate(() => window.__toasts || [])).filter((x) => /is not defined|undefined|TypeError|Cannot read|null\b|NaN/.test(x)); t.check(`${J.name} : aucun message d'erreur technique montré au joueur`, bad.length === 0, [...new Set(bad)].slice(0, 5)); }
  });
} catch (e) { t.check("exécution sans erreur", false, String(e.stack || e)); }
finally { t.done(); await browser.close(); await srv.stop(); }
