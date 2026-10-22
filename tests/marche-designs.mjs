// Marché des créations : vendre une carte avec son design. Les instances uniques partent avec la carte (séquestre),
// les cosmétiques de compte restent au vendeur (aperçu seulement), l'annulation rend tout, rien n'est dupliqué.
import { startServer, player, reporter, IDS, grant } from "./lib.mjs";
import * as G from "../worker/game.js";

const srv = await startServer({ port: +(process.env.PORT || 8850) });
const t = reporter("Marché · cartes avec design");
try {
  const S = await player(srv.base, IDS.p1, "Vendeur"), B = await player(srv.base, IDS.p2, "Acheteur");
  for (const p of [S, B]) await p.api("state");
  grant(srv, [S, B], { free: 12, chakra: 5000 });
  for (let i = 0; i < 10; i++) { await S.api("open", { pack: "mix" }); await B.api("open", { pack: "mix" }); }
  const acct = G.COSMETICS.find((c) => !c.only && c.slot === "cadre");
  await S.api("shop/buy", { id: acct.id });
  let s = (await S.api("summon", { n: 5 })).state;
  const inst = s.cos.inst.find((x) => G.COS_BY_ID[x.c].slot !== "cadre"), slot = G.COS_BY_ID[inst.c].slot;
  const sOwned = s.owned, bOwned = (await B.api("state")).state.owned;
  // une carte que le vendeur a en un exemplaire et que l'acheteur n'a pas
  const card = Object.keys(sOwned).find((id) => sOwned[id].n === 1 && !sOwned[id].gold && !bOwned[id]) || Object.keys(sOwned).find((id) => sOwned[id].n === 1 && !sOwned[id].gold);
  await S.api("design", { card, design: { cadre: "a:" + acct.id, [slot]: "i:" + inst.i } });

  t.section("Mise en vente avec design");
  const sell = await S.api("market/sell", { id: card, price: 50, withDesign: true });
  t.check("annonce créée", sell.status === 200, sell.error);
  const l = (await S.doc("GET", "market/" + sell.lid)).body.data;
  t.check("l'annonce liste l'instance incluse et l'effet de compte en aperçu", l.dz?.inst?.length === 1 && l.dz.inst[0].i === inst.i && l.dz.acct?.cadre === acct.id);
  s = (await S.api("state")).state;
  t.check("séquestre : l'instance quitte l'inventaire du vendeur", !s.cos.inst.some((x) => x.i === inst.i));
  t.check("le cosmétique de compte reste au vendeur", !!s.cos.own[acct.id]);

  t.section("Annulation");
  const cancel = await S.api("market/cancel", { lid: sell.lid });
  s = cancel.state;
  t.check("annuler rend la carte et l'instance, reposée sur la carte", cancel.status === 200 && G.hasCard(s, card) && s.cos.inst.some((x) => x.i === inst.i) && s.cos.designs[card]?.[slot] === "i:" + inst.i);

  t.section("Achat");
  await S.api("design", { card, design: { cadre: "a:" + acct.id, [slot]: "i:" + inst.i } });
  const sell2 = await S.api("market/sell", { id: card, price: 50, withDesign: true });
  const buys = await Promise.all([B.api("market/buy", { lid: sell2.lid }), B.api("market/buy", { lid: sell2.lid })]);
  t.check("deux achats simultanés : un seul passe", buys.filter((x) => x.status === 200).length === 1, buys.map((x) => x.status));
  const b = (await B.api("state")).state;
  t.check("l'acheteur reçoit la carte et l'instance, posée sur la carte", G.hasCard(b, card) && b.cos?.inst?.some((x) => x.i === inst.i) && b.cos.designs[card]?.[slot] === "i:" + inst.i);
  t.check("l'acheteur ne reçoit pas le cosmétique de compte", !b.cos.own?.[acct.id] && b.cos.designs[card]?.cadre === undefined);
  s = (await S.api("state")).state;
  t.check("aucune duplication : l'instance n'existe que chez l'acheteur", !s.cos.inst.some((x) => x.i === inst.i));
  t.check("le vendeur garde son cosmétique de compte", !!s.cos.own[acct.id]);

  t.section("Carte nue");
  const solo = Object.keys(s.owned).find((id) => s.owned[id].n === 1 && !s.owned[id].gold && id !== card);
  const inst2 = s.cos.inst.find((x) => x.i !== inst.i);
  await S.api("design", { card: solo, design: { [G.COS_BY_ID[inst2.c].slot]: "i:" + inst2.i } });
  const nu = await S.api("market/sell", { id: solo, price: 30 });
  const l3 = (await S.doc("GET", "market/" + nu.lid)).body.data;
  s = (await S.api("state")).state;
  t.check("vente sans design : l'annonce n'a pas de design, l'instance reste libre au vendeur", !l3.dz && s.cos.inst.some((x) => x.i === inst2.i) && !s.cos.designs[solo]);
} catch (e) { t.check("exécution sans erreur", false, String(e.stack || e)); }
finally { t.done(); await srv.stop(); }
