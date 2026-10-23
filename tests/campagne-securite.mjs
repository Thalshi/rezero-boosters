// Campagne : sécurité et justesse côté serveur (requêtes falsifiées, rafales simultanées, statistiques des tirages).
import { startServer, player, reporter, IDS, grant } from "./lib.mjs";
import * as G from "../worker/game.js";

const srv = await startServer({ port: +(process.env.PORT || 8880) });
const t = reporter("Campagne · sécurité et justesse du serveur");
try {
  const P = await player(srv.base, IDS.p1, "Pirate"), V = await player(srv.base, IDS.p2, "Victime"), X = await player(srv.base, IDS.p3, "Spectateur");
  for (const p of [P, V, X]) await p.api("state");

  t.section("Requêtes falsifiées");
  grant(srv, [P], { free: 5, chakra: 120 });
  const o = await P.api("open", { pack: "coffre", scenario: "se-arcenciel", cards: [{ id: "billy", gold: true }], rar: "m" });
  t.check("ouvrir en imposant cartes, rareté et scénario : ignorés, tirage du serveur", o.status === 200 && !(o.cards.length === 1) && G.CHEST_BY_ID[o.scenario].when(G.chestCtx(o.cards)));
  t.check("booster inconnu : refusé ou ramené à un booster réel", (await P.api("open", { pack: "pack-triche" })).status !== 500);
  grant(srv, [P], { chakra: 50 });
  t.check("acheter un booster avec 50 ◆ : refusé, rien débité", (await P.api("open", { pack: "mix", paid: true })).status === 400 && (await P.api("state")).state.chakra === 50);
  grant(srv, [P], { chakra: 1000 });
  const fs = await P.api("summon", { n: 1, rars: ["m", "m", "m", "m", "m"] });
  t.check("invoquer en imposant des raretés (réservé au labo) : ignoré, tirage normal d'un seul objet", fs.status === 200 && fs.got.length === 1 && fs.state.chakra === 1000 - G.summonCost(1));
  const s0 = (await P.api("state")).state;
  t.check("l'essence n'est jamais négative", s0.chakra >= 0);
  t.check("recycler en envoyant une valeur : la valeur du serveur est utilisée", (await P.api("recycle", { value: 99999 })).state.chakra === s0.chakra + G.recycleS(JSON.parse(JSON.stringify(s0)), Date.now()));
  t.check("le labo est refusé à un joueur", (await P.api("lab/open", { pack: "coffre", cards: [] })).status === 403);
  t.check("les actions d'admin du Défilé sont refusées à un joueur", (await P.api("defile/admin", { action: "new" })).status === 403);

  t.section("Confrontation : on ne joue jamais à la place d'un autre");
  grant(srv, [V], { free: 1 }); await V.api("open", { pack: "mix" });
  const g = await V.api("confront/create", { nom: "Sécurité" });
  await V.api("confront/bot", { gid: g.gid });
  t.check("lancer la partie de quelqu'un d'autre : refusé", (await P.api("confront/act", { gid: g.gid, action: { type: "lancer" } })).status === 400);
  t.check("ajouter un bot dans le salon d'un autre : refusé", (await P.api("confront/bot", { gid: g.gid })).status === 400);
  await V.api("confront/act", { gid: g.gid, action: { type: "lancer" } });
  t.check("contribuer sans être à la table : refusé", (await X.api("confront/act", { gid: g.gid, action: { type: "contribuer", cartes: [] } })).status === 400);
  const spy = await X.api("confront/state", { gid: g.gid });
  t.check("un spectateur ne voit ni main ni rôle caché", spy.spectateur && !spy.vue.main && spy.vue.joueurs.every((p) => !p.role || spy.vue.phase === "fin"));
  t.check("agir en se faisant passer pour un autre (playerId dans la requête) : sans effet", (await X.api("confront/act", { gid: g.gid, playerId: V.id, action: { type: "contribuer", cartes: [] } })).status === 400);
  t.check("partie inexistante : refusée proprement", (await X.api("confront/state", { gid: "ZZZZ" })).status === 404);

  t.section("Rafales simultanées : jamais de double débit");
  grant(srv, [P], { chakra: 3 * G.summonCost(1) + 10 });
  const sums = await Promise.all(Array.from({ length: 8 }, () => P.api("summon", { n: 1 })));
  const sP = (await P.api("state")).state;
  t.check("8 invocations ×1 en même temps avec de quoi en payer 3 : exactement 3", sums.filter((r) => r.status === 200).length === 3 && sP.chakra === 10, { ok: sums.filter((r) => r.status === 200).length, essence: sP.chakra, codes: sums.map((r) => r.status) });
  grant(srv, [P], { chakra: 300 });
  const items = G.COSMETICS.filter((c) => !c.only && G.COS_PRICE[c.rar] === 120 && !sP.cos?.own?.[c.id]).slice(0, 5);
  const buys = await Promise.all(items.map((c) => P.api("shop/buy", { id: c.id })));
  const sB = (await P.api("state")).state;
  t.check("5 achats différents en même temps avec 300 ◆ (120 chacun) : 2 passent, essence jamais négative", buys.filter((r) => r.status === 200).length === 2 && sB.chakra === 60, { ok: buys.filter((r) => r.status === 200).length, essence: sB.chakra });
  grant(srv, [P], { free: 3, chakra: 0 });
  const opens = await Promise.all(Array.from({ length: 6 }, () => P.api("open", { pack: "mix" })));
  t.check("6 boosters gratuits en même temps avec 3 en réserve : au plus 3", opens.filter((r) => r.status === 200).length <= 3 && (await P.api("state")).state.free >= 0);
  const before = (await P.api("state")).state, exp = JSON.parse(JSON.stringify(before));
  G.claimAnyS(exp, "all", null, Date.now());
  const claims = await Promise.all(Array.from({ length: 4 }, () => P.api("claim", { kind: "all" })));
  const after = (await P.api("state")).state;
  t.check(`4 « Tout réclamer » en même temps : récompenses versées une seule fois (+${exp.chakra - before.chakra} ◆)`, after.chakra === exp.chakra && exp.chakra > before.chakra, { codes: claims.map((r) => r.status), avant: before.chakra, attendu: exp.chakra, après: after.chakra });

  t.section("Statistiques des tirages (serveur réel)");
  grant(srv, [V], { chakra: 400 * G.summonCost(5) });
  const got = [];
  for (let i = 0; i < 200; i++) { const r = await V.api("summon", { n: 5 }); if (r.status === 200) got.push(...r.got); }
  const n = got.length, freq = Object.fromEntries(G.RANKS.map((r) => [r, got.filter((x) => x.rar === r).length / n * 100]));
  t.note(`1 000 objets invoqués : ${G.RANKS.map((r) => `${G.RAR[r].label} ${freq[r].toFixed(1)} % (annoncé ${G.SUMMON_RATES[r]} %)`).join(", ")}`);
  t.check("1 000 invocations : chaque rareté dans ±5 points du taux annoncé (le plancher ×5 relève un peu les Rares)", G.RANKS.every((r) => Math.abs(freq[r] - G.SUMMON_RATES[r]) <= 5 + (r === "r" ? 4 : 0)), freq);
  const sV = (await V.api("state")).state;
  t.check(`pity d'invocation : jamais plus de ${G.SUMMON_PITY_L} objets sans Légendaire ou mieux`, (() => { let gap = 0, max = 0; for (const x of got) { gap = x.rar === "l" || x.rar === "m" ? 0 : gap + 1; max = Math.max(max, gap); } return max < G.SUMMON_PITY_L; })());
  t.check("chaque ×5 contient au moins une Rare", (() => { for (let i = 0; i < got.length; i += 5) if (!got.slice(i, i + 5).some((x) => G.RANKS.indexOf(x.rar) >= 2)) return false; return true; })());
  t.check("tous les objets invoqués sont dans l'inventaire, sans doublon d'identifiant", sV.cos.inst.length === n && new Set(sV.cos.inst.map((x) => x.i)).size === n);
  grant(srv, [X], { free: 999 });
  const cards = [], scen = {};
  for (let i = 0; i < 300; i++) { const r = await X.api("open", { pack: i % 2 ? "mix" : "coffre" }); if (r.status !== 200) continue; cards.push(...r.cards); if (r.scenario) { scen[r.scenario] = (scen[r.scenario] || 0) + 1; if (!G.CHEST_BY_ID[r.scenario].when(G.chestCtx(r.cards))) scen.INVALIDE = (scen.INVALIDE || 0) + 1; } }
  const rf = Object.fromEntries(G.RANKS.map((r) => [r, cards.filter((c) => G.CARD_BY_ID[c.id].rar === r).length / cards.length * 100]));
  t.note(`1 500 cartes de boosters : ${G.RANKS.map((r) => `${G.RAR[r].label} ${rf[r].toFixed(1)} %`).join(", ")}`);
  t.check("150 coffres réels : chaque scénario choisi est permis par ses cartes", !scen.INVALIDE, scen);
  t.check("boosters : les Communes restent majoritaires et les Mythiques rares (< 3 % des cartes)", rf.c > 30 && rf.m < 3, rf);
} catch (e) { t.check("exécution sans erreur", false, String(e.stack || e)); }
finally { t.done(); await srv.stop(); }
