// Retours de Reichi en local : ouverture ×10 (5 coffres d'affilée), recyclage et combinaison au choix,
// envies choisies une à une, fin des votes des prédictions, votes des autres dévoilés avec la bonne réponse, bouton Retour.
import { startServer, player, reporter, IDS, grant, playwright, samePair } from "./lib.mjs";
import * as G from "../worker/game.js";

const srv = await startServer({ port: +(process.env.PORT || 8886) });
const t = reporter("Retours en local (×10, doublons au choix, envies, prédictions, Retour)");
let browser;
try {
  const A = await player(srv.base, IDS.admin, "Billy"), P = await player(srv.base, IDS.p1, "Aiko"), Q = await player(srv.base, IDS.p2, "Bram");
  for (const x of [A, P, Q]) await x.api("state");
  grant(srv, [P], { free: 30, chakra: 5000 });

  t.section("ouverture ×10");
  const r = await P.api("open", { pack: "mix", n: 10 });
  t.check("×10 : 50 cartes et 5 scénarios de coffre", r.cards?.length === 50 && r.scenarios?.length === 5, r.error);
  t.check("×10 : 10 boosters gratuits utilisés", r.state.free === 20 && r.state.opened === 10);
  const rp = await P.api("open", { pack: "mix", n: 10, paid: true });
  t.check("×10 payé : 1 500 ◆", rp.cards?.length === 50 && rp.state.chakra === 5000 - 1500, rp.error);
  t.check("un nombre farfelu retombe sur 1 booster", (await P.api("open", { pack: "mix", n: 7 })).cards?.length === 5);

  t.section("doublons au choix");
  let s = (await P.api("state")).state;
  const dl = Object.entries(s.owned).filter(([, o]) => o.n > 2).map(([id, o]) => ({ id, n: o.n }));
  const d0 = dl[0];
  const rr = await P.api("recycle", { pick: [{ id: d0.id, gold: false, n: 1 }] });
  t.check("recycler 1 exemplaire choisi : seulement celui-là part", rr.state?.owned[d0.id].n === d0.n - 1, rr.error);
  const others = dl.slice(1).every(({ id, n }) => rr.state.owned[id].n === n);
  t.check("les autres doublons sont gardés", others);
  t.check("recycler plus que ses doublons est refusé", (await P.api("recycle", { pick: [{ id: d0.id, gold: false, n: 99 }] })).status === 400);
  s = rr.state;
  const dupIds = Object.entries(s.owned).flatMap(([id, o]) => Array(Math.max(0, o.n - 1)).fill(id));
  const pick = dupIds.slice(-3), before = Object.fromEntries(pick.map((id) => [id, s.owned[id].n]));
  const cr = await P.api("craft", { pick });
  const used = {}; for (const id of pick) used[id] = (used[id] || 0) + 1;
  t.check("combiner les 3 doublons choisis", cr.card && Object.entries(used).every(([id, k]) => cr.state.owned[id].n === before[id] - k), cr.error);
  t.check("combiner avec 2 doublons est refusé", (await P.api("craft", { pick: dupIds.slice(0, 2) })).status === 400);

  t.section("échanges");
  grant(srv, [Q], { free: 12 }); await Q.api("open", { pack: "mix", n: 10 });
  for (let k = 0; k < 4; k++) {
    const sP = (await P.api("state")).state, sQ = (await Q.api("state")).state, [x, y] = samePair(sP, sQ);
    if (k === 0) {
      const z = Object.keys(sQ.owned).find((id) => sQ.owned[id].n > 0 && G.CARD_BY_ID[id].rar !== G.CARD_BY_ID[x].rar);
      t.check("rareté différente : refusé", (await P.api("trade/propose", { to: Q.id, give: [{ id: x, n: 1 }], want: [{ id: z, n: 1 }] })).status === 400);
    }
    const tp = await P.api("trade/propose", { to: Q.id, give: [{ id: x, n: 1 }], want: [{ id: y, n: 1 }] });
    if (k < 3) { const ok = !tp.error && !(await Q.api("trade/answer", { tid: tp.tid, action: "accept" })).error; t.check(`échange ${k + 1}/3 de la semaine accepté`, ok, tp.error); }
    else t.check("4e échange de la semaine : refusé", tp.status === 400 && /semaine/.test(tp.error), tp.error);
  }

  t.section("décorations d'avatar");
  const sd0 = (await P.api("state")).state.chakra;
  const db = await P.api("deco/buy", { id: "deco-flammes" });
  t.check("acheter une décoration : payée et portée", db.state?.cos?.deco === "deco-flammes" && db.state.chakra === sd0 - G.COS_PRICE.r, db.error);
  t.check("la racheter est refusé", (await P.api("deco/buy", { id: "deco-flammes" })).status === 400);
  t.check("porter une décoration pas achetée est refusé", (await P.api("deco/equip", { id: "deco-ailes" })).status === 400);
  t.check("les autres la voient sur le profil", (await Q.api("profile", { uid: P.id })).deco === "deco-flammes");
  t.check("la retirer", (await P.api("deco/equip", { id: null })).state?.cos?.deco === null);
  await P.api("deco/equip", { id: "deco-flammes" });

  t.section("salons");
  const s1 = await P.api("confront/create", { nom: "S1", public: true }), s2 = await P.api("confront/create", { nom: "S2", public: true });
  const mes = (await P.api("confront/list")).miennes.filter((g) => g.phase === "lobby");
  t.check("un seul salon ouvert par personne", mes.length === 1 && mes[0].gid === s2.gid, mes.map((g) => g.nom));
  await Q.api("confront/act", { gid: s2.gid, action: { type: "rejoindre" } });
  await P.api("confront/act", { gid: s2.gid, action: { type: "quitter" } });
  const st2 = await Q.api("confront/state", { gid: s2.gid });
  t.check("le créateur quitte : l'autre joueur devient l'hôte", st2.createur === Q.id && st2.vue?.hote === Q.id, st2.error);
  await Q.api("confront/act", { gid: s2.gid, action: { type: "quitter" } });
  t.check("le dernier quitte : le salon se ferme", !(await P.api("confront/list")).salons.some((g) => g.gid === s2.gid));

  t.section("compte vierge");
  const sw = await fetch(`${srv.base}/auth/test`, { headers: { cookie: A.cookie }, redirect: "manual" });
  const tc = (sw.headers.get("set-cookie") || "").split(";")[0];
  const meT = await (await fetch(`${srv.base}/api/me`, { headers: { cookie: tc } })).json();
  t.check("le compte vierge est un autre compte", meT.test === true && meT.id === "t" + A.id.slice(1) && /\(test\)$/.test(meT.name), meT);
  const stT = await (await fetch(`${srv.base}/api/game/state`, { method: "POST", headers: { cookie: tc, "content-type": "application/json" }, body: "{}" })).json();
  t.check("il démarre vide", Object.keys(stT.state?.owned || {}).length === 0);
  t.check("un joueur normal n'y a pas droit", (await fetch(`${srv.base}/auth/test`, { headers: { cookie: P.cookie }, redirect: "manual" })).status === 403);
  const bk = await fetch(`${srv.base}/auth/test?back=1`, { headers: { cookie: tc }, redirect: "manual" }), rc = (bk.headers.get("set-cookie") || "").split(";")[0];
  t.check("retour au vrai compte", (await (await fetch(`${srv.base}/api/me`, { headers: { cookie: rc } })).json()).id === A.id);

  t.section("prédictions");
  const q1 = await A.coll("POST", "predq", { ep: 2, text: "Qui gagne ?", options: ["Kuradai", "Sasori"], points: 1, reward: 50, status: "open", answer: null, endsAt: Date.now() - 1000, t: Date.now() });
  const q2 = await A.coll("POST", "predq", { ep: 2, text: "Qui perd ?", options: ["Mahed", "Les 4"], points: 1, reward: 50, status: "open", answer: null, endsAt: Date.now() + 3600000, t: Date.now() });
  const id1 = q1.body.id, id2 = q2.body.id;
  t.check("fin des votes passée : vote refusé", (await P.api("vote", { qid: id1, idx: 0 })).status === 409);
  t.check("fin des votes à venir : vote accepté", !(await P.api("vote", { qid: id2, idx: 1 })).error);
  await Q.api("vote", { qid: id2, idx: 0 });
  t.check("avant la révélation, personne ne voit les votes", (await P.api("pred/voters")).voters?.[id2] === undefined);
  await A.doc("PATCH", "predq/" + id2, { status: "resolved", answer: 1 });
  const v = (await P.api("pred/voters")).voters?.[id2] || [];
  t.check("à la révélation, on voit qui a voté quoi", v.length === 2 && v.some(([u, a]) => u === P.id && a === 1) && v.some(([u, a]) => u === Q.id && a === 0), v);

  t.section("interface");
  const { chromium } = await playwright();
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1366, height: 860 } }), errors = [];
  page.on("pageerror", (e) => errors.push(e.stack || e.message));
  await page.goto(`${srv.base}/auth/dev?id=${IDS.p1}&name=Aiko`); await page.waitForTimeout(2500);
  await page.goto(`${srv.base}/#/boosters`); await page.waitForTimeout(1500);
  await page.screenshot({ path: "/tmp/claude-0/-home-user-rezero-boosters/1145acdc-bf55-528c-b0d2-aec63051172b/scratchpad/shots/x10.png" });
  t.check("les 36 décorations se dessinent (avatar et carte)", (await page.evaluate(() => DECOS.flatMap((d) => ["round", "rect"].map((sh) => { try { return decoSVG(d, sh).includes("<svg") ? "" : d.id; } catch (e) { return d.id + " " + e.message; } })).filter(Boolean))).length === 0);
  await page.goto(`${srv.base}/#/boutique`); await page.waitForTimeout(1500);
  t.check("la Boutique s'affiche", (await page.locator(".zd-tile").count()) === 36);
  await page.goto(`${srv.base}/#/boosters`); await page.waitForTimeout(1500);
  t.check("Boosters : bouton ×10 · 5 coffres", await page.locator('[data-act="open-pack"][data-n="10"]').first().isVisible());
  await page.locator('[data-act="open-pack"][data-n="10"]').first().click(); await page.waitForTimeout(1500);
  await page.locator('[data-act="skip"]').first().click().catch(() => {}); await page.waitForTimeout(800);
  for (let i = 0; i < 40 && !(await page.locator('[data-act="next-chest"]').count()); i++) { await page.keyboard.press("Space").catch(() => {}); await page.locator("#revealBtn, [data-act=skip]").first().click({ timeout: 300 }).catch(() => {}); await page.waitForTimeout(200); }
  t.check("fin du 1er coffre : « Coffre suivant · 2/5 »", /2\/5/.test(await page.locator('[data-act="next-chest"]').first().textContent().catch(() => "")));
  await page.locator('[data-act="to-col"]').first().click(); await page.waitForTimeout(800);
  t.check("collection : « Retour à l'ouverture »", await page.locator('[data-act="go-back"]').isVisible());
  await page.click('[data-act="dup-open"][data-mode="recycle"]'); await page.waitForTimeout(400);
  t.check("recycler : la fenêtre de choix s'ouvre, rien de coché", (await page.locator(".dup-it").count()) > 0 && (await page.locator(".dup-it.on").count()) === 0);
  await page.locator('[data-act="dup-inc"]').first().click(); await page.waitForTimeout(200);
  t.check("un + coche un doublon", (await page.locator(".dup-it.on").count()) === 1);
  await page.click('[data-act="close"] >> nth=0');
  await page.click('[data-act="wish-open"]'); await page.waitForTimeout(400);
  t.check("Mes envies : les manquantes, sans rien ajouter tout seul", (await page.locator(".dup-it").count()) > 0 && !((await P.api("state")).state.wish || []).length);
  await page.locator(".dup-sheet [data-wish]").first().click(); await page.waitForTimeout(800);
  t.check("un cœur ajoute une seule envie", (await page.locator(".dup-sheet .wish-h.on").count()) === 1);
  await page.click('.dup-sheet [data-act="close"] >> nth=0');
  await page.click('[data-act="go-back"]'); await page.waitForTimeout(1200);
  t.check("retour à l'ouverture : « Coffre suivant » est de nouveau là", /2\/5/.test(await page.locator('[data-act="next-chest"]').first().textContent().catch(() => "")));
  await page.goto(`${srv.base}/#/pred`); await page.waitForTimeout(2500);
  t.check("prédictions : les votants apparaissent sous la bonne réponse", (await page.locator(".pq-who .pq-v").count()) === 2);
  t.check("aucune erreur JavaScript", errors.length === 0, errors);
} catch (e) { t.check("exécution sans erreur", false, String(e.stack || e)); }
finally { t.done(); await browser?.close(); await srv.stop(); }
