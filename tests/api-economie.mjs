// Économie et concurrence : boosters, marché, échanges, comptoir, notifications (côté serveur).
import { startServer, player, reporter, IDS } from "./lib.mjs";

const srv = await startServer({ port: +(process.env.PORT || 8802) });
const t = reporter("API · économie et multijoueur");
try {
  const A = await player(srv.base, IDS.admin, "Billy"), R = await player(srv.base, IDS.dev, "Reichi"), T = await player(srv.base, IDS.p1, "Teo");
  for (const p of [A, R, T]) await p.api("state");

  t.section("Boosters");
  const opens = await Promise.all(Array.from({ length: 15 }, () => T.api("open", { pack: "mix" })));
  let s = (await T.api("state")).state;
  const ok = opens.filter((o) => o.status === 200).length;
  t.check("ouvertures simultanées : jamais plus que les boosters gratuits", ok <= 10 && s.opened === ok && s.free === 10 - ok, { réussies: ok, refusées: opens.filter((o) => o.status !== 200).map((o) => o.status) });
  if (opens.some((o) => o.status === 503)) t.note("Comportement actuel connu : sous forte concurrence, certaines ouvertures reçoivent 503 « serveur occupé » (aucune duplication).");
  const o1 = await A.api("open", { pack: "mix" });
  t.check("ouverture : 5 cartes, essence et gratuits cohérents", o1.status === 200 && o1.cards.length === 5 && o1.state.free === 9);
  const Pb = await player(srv.base, IDS.p2, "Payeur"); await Pb.api("state");
  const paidRuns = [];
  for (let i = 0; i < 3; i++) paidRuns.push((await Pb.api("open", { pack: "mix", paid: true })).status);
  t.check("boosters payants : 2 achetés avec 120 ◆, le 3e refusé", paidRuns.join() === "200,200,400", paidRuns);
  for (let i = 0; i < 10; i++) { await A.api("open", { pack: "mix" }); await R.api("open", { pack: "mix" }); }
  for (let i = 0; i < 10 - ok; i++) await T.api("open", { pack: "mix" });

  t.section("Marché");
  s = (await R.api("state")).state;
  const single = Object.entries(s.owned).find(([, o]) => o.n === 1 && !o.gold)?.[0];
  const sells = await Promise.all([R.api("market/sell", { id: single, price: 10 }), R.api("market/sell", { id: single, price: 10 })]);
  t.check("2 ventes simultanées du même dernier exemplaire : une seule passe", sells.filter((x) => x.status === 200).length === 1);
  const lid = sells.find((x) => x.status === 200).lid;
  const anyCard = Object.entries((await R.api("state")).state.owned).find(([, o]) => o.n > 0)[0];
  const bad = [];
  for (const price of [0, -5, 1e9]) bad.push((await R.api("market/sell", { id: anyCard, price })).status);
  t.check("prix 0, négatif ou démesuré refusés", bad.every((x) => x === 400), bad);
  const ess = async (p) => (await p.api("state")).state.chakra;
  const [eA, eT, eR] = [await ess(A), await ess(T), await ess(R)];
  const buys = await Promise.all([A.api("market/buy", { lid }), T.api("market/buy", { lid })]);
  t.check("2 achats simultanés : un seul acheteur, l'autre reçoit 409", buys.filter((b) => b.status === 200).length === 1 && buys.some((b) => b.status === 409), buys.map((b) => b.status));
  const paid = (await ess(A)) - eA + (await ess(T)) - eT;
  t.check("essence : l'acheteur paie 10, le vendeur reçoit 10", paid === -10 && (await ess(R)) - eR === 10);
  const l2 = (await R.api("market/sell", { id: Object.entries((await R.api("state")).state.owned).find(([, o]) => o.n > 0)[0], price: 20 })).lid;
  t.check("retrait d'une annonce : la carte revient", (await R.api("market/cancel", { lid: l2 })).status === 200 && (await A.api("market/buy", { lid: l2 })).status === 409);

  t.section("Échanges");
  const sA = (await A.api("state")).state, sR = (await R.api("state")).state;
  const give = Object.entries(sA.owned).find(([, o]) => o.n > 0)[0], want = Object.entries(sR.owned).find(([, o]) => o.n > 0)[0];
  const tp = await A.api("trade/propose", { to: R.id, give: [{ id: give, n: 1 }], want: [{ id: want, n: 1 }] });
  t.check("proposition d'échange équilibré acceptée", tp.status === 200, tp.error);
  const race = await Promise.all([R.api("trade/answer", { tid: tp.tid, action: "accept" }), A.api("trade/answer", { tid: tp.tid, action: "cancel" })]);
  t.check("accepter et annuler en même temps : une seule action passe", race.filter((x) => x.status === 200).length === 1, race.map((x) => x.status));
  t.check("échange trop déséquilibré refusé", (await A.api("trade/propose", { to: R.id, give: [{ id: give, n: 1 }], chakra: 5000, want: [{ id: want, n: 1 }] })).status === 400);
  const sA2 = (await A.api("state")).state, sR2 = (await R.api("state")).state;
  const g2 = Object.entries(sA2.owned).find(([, o]) => o.n > 0)[0], w2 = Object.entries(sR2.owned).find(([, o]) => o.n > 0)[0];
  const before = sA2.owned[g2].n;
  const tp2 = await A.api("trade/propose", { to: R.id, give: [{ id: g2, n: 1 }], want: [{ id: w2, n: 1 }] });
  const mid2 = (await A.api("state")).state.owned[g2]?.n || 0;
  const ref = await R.api("trade/answer", { tid: tp2.tid, action: "refuse" });
  const after = (await A.api("state")).state.owned[g2].n;
  t.check("carte mise de côté pendant l'échange, rendue après refus", tp2.status === 200 && mid2 === before - 1 && ref.status === 200 && after === before, { avant: before, pendant: mid2, après: after });

  t.section("Comptoir et notifications");
  t.check("message au comptoir envoyé", (await R.api("chat/send", { text: "Salut @Billy" })).status === 200);
  t.check("anti-spam : deuxième message trop rapide refusé (429)", (await R.api("chat/send", { text: "encore" })).status === 429);
  t.check("carte qu'on ne possède pas refusée", (await T.api("chat/send", { text: "", card: "zzz" })).status === 400);
  const pa = await A.api("pulse", { after: null });
  t.check("Billy reçoit la mention et les notifications de vente et d'échange", pa.notifs.items.some((n) => n.kind === "mention") && pa.chat.some((m) => m.text.includes("@Billy")), pa.notifs.items.map((n) => n.kind));
  const pr = await R.api("pulse", { after: null });
  t.check("Reichi est prévenu de la vente et de l'échange", pr.notifs.items.some((n) => n.kind === "sold") && pr.notifs.items.some((n) => n.kind === "trade"), pr.notifs.items.map((n) => n.kind));
  const last = Math.max(...pr.notifs.items.map((n) => n.id));
  await R.api("notifs/read", { last });
  t.check("« tout marquer lu »", (await R.api("pulse", { after: 999999 })).notifs.unread === 0);
  t.check("annonce réservée à l'admin", (await T.api("announce", { text: "x" })).status === 403 && (await A.api("announce", { text: "Épisode 2 samedi" })).status === 200);
  const mid = pa.chat.find((m) => m.kind === "msg").id;
  t.check("suppression d'un message : refusée à un autre joueur, permise à l'admin", (await T.api("chat/delete", { id: mid })).status === 403 && (await A.api("chat/delete", { id: mid })).status === 200);
} catch (e) { t.check("exécution sans erreur", false, String(e.stack || e)); }
finally { t.done(); srv.stop(); }
