// Cosmétiques côté serveur : Boutique Arcanique, Sanctuaire des Invocations, Atelier (designs) et carte vedette.
// Le navigateur ne décide de rien : prix, tirages, inventaire et designs sont validés ici.
import { startServer, player, reporter, IDS, grant } from "./lib.mjs";
import * as G from "../worker/game.js";

const srv = await startServer({ port: +(process.env.PORT || 8820) });
const t = reporter("API · cosmétiques");
try {
  const A = await player(srv.base, IDS.p1, "Aiko"), B = await player(srv.base, IDS.p2, "Bram");
  for (const p of [A, B]) await p.api("state");
  grant(srv, [A, B], { chakra: 5000, free: 3 });

  t.section("Boutique Arcanique");
  const cheap = G.COSMETICS.find((c) => !c.only && c.rar === "c"), price = G.COS_PRICE[cheap.rar];
  let s0 = (await A.api("state")).state;
  const b1 = await A.api("shop/buy", { id: cheap.id, price: 1 });
  t.check("achat : prix fixé par le serveur (le prix envoyé est ignoré)", b1.status === 200 && b1.state.chakra === s0.chakra - price && b1.state.cos.own[cheap.id], { avant: s0.chakra, après: b1.state?.chakra });
  t.check("racheter un objet déjà possédé : refusé", (await A.api("shop/buy", { id: cheap.id })).status === 400);
  const only = G.COSMETICS.find((c) => c.only === "sanctuaire");
  t.check("objet réservé au Sanctuaire : refusé en boutique", (await A.api("shop/buy", { id: only.id })).status === 400);
  t.check("objet inconnu : refusé", (await A.api("shop/buy", { id: "cadre-triche" })).status === 400);
  const twice = G.COSMETICS.find((c) => !c.only && c.rar === "pc");
  const par = await Promise.all([A.api("shop/buy", { id: twice.id }), A.api("shop/buy", { id: twice.id })]);
  const after = (await A.api("state")).state;
  t.check("2 achats simultanés du même objet : un seul débit", par.filter((r) => r.status === 200).length === 1 && after.chakra === b1.state.chakra - G.COS_PRICE.pc, par.map((r) => r.status));

  t.section("Sanctuaire des Invocations");
  for (const n of [0, 2, 10, -5, "5x"]) { const r = await A.api("summon", { n }); if (r.status !== 400) t.check(`invocation ×${n} refusée`, false, r.status); }
  t.check("seules les invocations ×1 et ×5 existent", true);
  const s1 = (await A.api("state")).state;
  const one = await A.api("summon", { n: 1 });
  t.check("×1 : un objet, coût du serveur", one.status === 200 && one.got.length === 1 && one.state.chakra === s1.chakra - G.summonCost(1));
  const five = await A.api("summon", { n: 5 });
  t.check("×5 : cinq objets, remise du serveur", five.status === 200 && five.got.length === 5 && five.state.chakra === one.state.chakra - G.summonCost(5), { coût: G.summonCost(5) });
  t.check("×5 : au moins une Rare ou mieux", five.got.some((x) => G.RANKS.indexOf(x.rar) >= G.RANKS.indexOf("r")));
  t.check("aucune invocation ne donne de personnage", [...one.got, ...five.got].every((x) => G.COS_BY_ID[x.id] && !G.CARD_BY_ID[x.id]));
  const ids = five.state.cos.inst.map((x) => x.i);
  t.check("chaque objet invoqué est une instance unique", ids.length === 6 && new Set(ids).size === 6);
  grant(srv, [B], { chakra: 100 });
  t.check("pas assez d'essence : refusé, rien n'est débité", (await B.api("summon", { n: 1 })).status === 400 && (await B.api("state")).state.chakra === 100);

  t.section("Atelier Arcanique et carte vedette");
  await A.api("open", { pack: "mix" });
  const st = (await A.api("state")).state, card = Object.keys(st.owned).find((id) => st.owned[id].n > 0);
  const inst = st.cos.inst.find((x) => G.COS_BY_ID[x.c].slot !== cheap.slot);
  const instSlot = G.COS_BY_ID[inst.c].slot;
  const d1 = await A.api("design", { card, design: { [cheap.slot]: "a:" + cheap.id, [instSlot]: "i:" + inst.i } });
  t.check("design enregistré avec un objet de compte et une instance", d1.status === 200 && Object.keys(d1.state.cos.designs[card]).length === 2);
  t.check("objet sur le mauvais emplacement : refusé", (await A.api("design", { card, design: { [instSlot === "aura" ? "cadre" : "aura"]: "i:" + inst.i } })).status === 400);
  const notMine = G.COSMETICS.find((c) => !c.only && !st.cos.own[c.id] && c.slot === "aura");
  t.check("objet non possédé : refusé", (await A.api("design", { card, design: { aura: "a:" + notMine.id } })).status === 400);
  const absent = G.CARDS.find((c) => !st.owned[c.id]).id;
  t.check("carte non possédée : refusé", (await A.api("design", { card: absent, design: {} })).status === 400);
  const binst = (await B.api("state")).state.cos?.inst || [];
  t.check("instance d'un autre joueur : refusée", (await A.api("design", { card, design: { [instSlot]: "i:zzzzzz" } })).status === 400 && binst.length === 0);
  const card2 = Object.keys(st.owned).find((id) => st.owned[id].n > 0 && id !== card);
  const d2 = await A.api("design", { card: card2, design: { [instSlot]: "i:" + inst.i } });
  t.check("une instance passe sur une autre carte : elle quitte la première", d2.status === 200 && !d2.state.cos.designs[card][instSlot] && d2.state.cos.designs[card2][instSlot] === "i:" + inst.i);
  t.check("vedette : carte non possédée refusée", (await A.api("featured", { card: absent })).status === 400);
  const f = await A.api("featured", { card: card2 });
  t.check("vedette enregistrée", f.status === 200 && f.state.featured === card2);
  const prof = await B.api("profile", { uid: A.id });
  t.check("profil public : carte vedette et son design visibles", prof.featured === card2 && prof.designs?.[card2]?.[instSlot] === inst.c, prof.designs);
  t.check("profil public : l'inventaire n'est pas exposé", !JSON.stringify(prof).includes(inst.i) && !("cos" in prof));
  const pub = await B.doc("GET", "players/" + A.id);
  t.check("fiche publique du joueur : vedette et design (liste des joueurs)", JSON.stringify(pub.body || {}).includes(card2), pub.status);

  t.section("Une carte qui quitte la collection perd son design");
  // on vend au marché une carte possédée en un seul exemplaire (le marché s'ouvre après 10 boosters)
  grant(srv, [A], { free: 12 });
  for (let i = 0; i < 10; i++) await A.api("open", { pack: "mix" });
  let sA = (await A.api("state")).state;
  const solo = Object.keys(sA.owned).find((id) => sA.owned[id].n === 1 && !sA.owned[id].gold);
  await A.api("design", { card: solo, design: { [instSlot]: "i:" + inst.i } });
  await A.api("featured", { card: solo });
  sA = (await A.api("state")).state;
  t.check("préparation : design et vedette sur la carte à vendre", sA.featured === solo && sA.cos.designs[solo]?.[instSlot] === "i:" + inst.i);
  const sell = await A.api("market/sell", { id: solo, price: 10 });
  t.check("mise en vente du dernier exemplaire", sell.status === 200, sell.error);
  sA = (await A.api("state")).state;
  t.check("design et vedette retirés de la carte vendue", !sA.cos.designs[solo] && sA.featured !== solo, { design: sA.cos.designs[solo], vedette: sA.featured });
  t.check("l'instance reste dans l'inventaire, libre", sA.cos.inst.some((x) => x.i === inst.i) && !Object.values(sA.cos.designs).some((d) => Object.values(d).includes("i:" + inst.i)));
} catch (e) { t.check("exécution sans erreur", false, String(e.stack || e)); }
finally { t.done(); await srv.stop(); }
