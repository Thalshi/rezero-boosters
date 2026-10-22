// Simulation de progression avec les vraies règles du jeu (worker/game.js) : boosters gratuits et leur recharge,
// pack du jour, missions, série, succès, prédictions, recyclage, achats en boutique, pity et dorées.
// Trois profils de joueurs, bilan à 7, 30, 90 et 180 jours. Usage : node tests/simulation-economie.mjs [joueurs par profil]
// Hypothèses : tout le catalogue actuel est débloqué (épisode 2), pas de marché ni d'échanges (ils ne créent pas d'essence),
// Billy publie 3 prédictions par semaine à 50 ◆, et le joueur en réussit la moitié.
import * as G from "../worker/game.js";
import { writeFileSync } from "node:fs";

const RUNS = +(process.argv[2] || 12), DAYS = 180, CHECKS = [7, 30, 90, 180];
const cfg = G.configFrom({ def: 2 });
const mixIds = G.poolFor(G.PACKS.find((p) => p.id === "mix"), cfg, null).map((c) => c.id);
const skinIds = G.SKINS.map((c) => c.id);
const T0 = Date.parse("2026-11-02T07:00:00+01:00"); // un lundi
const PROFILES = [
  // jours joués par semaine, heures de visite, fait les missions sociales (chat, fiches, prédictions)
  { id: "occasionnel", label: "Occasionnel", days: [1, 3, 5, 6], hours: [12, 20], social: 0.5, recycleEvery: 7 }, // recycle une fois par semaine, le dernier jour joué
  { id: "regulier", label: "Régulier", days: [0, 1, 2, 3, 4, 5, 6], hours: [8, 13, 21], social: 0.9, recycleEvery: 1 },
  { id: "actif", label: "Très actif", days: [0, 1, 2, 3, 4, 5, 6], hours: [8, 10, 12, 14, 16, 18, 20, 22], social: 1, recycleEvery: 1 },
];

function simulate(pf, seed) {
  let a = seed; const rng = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  const s = G.freshSave(T0); s.linked = true;
  const st = { free: 0, day: 0, paid: 0, mythics: 0, dupes: 0, spent: 0, recycled: 0 };
  const has = (id) => G.hasCard(s, id), done = (ids) => ids.filter(has).length / ids.length;
  const open = (pack, paid, now) => {
    const before = s.chakra, r = G.takeAndOpenS(s, pack, paid, cfg, null, rng, now);
    if (r.error) return false;
    if (paid) { st.paid++; st.spent += before - s.chakra; } else if (pack === "jour") st.day++; else st.free++;
    for (const c of r.cards) { if (G.CARD_BY_ID[c.id].rar === "m") st.mythics++; if (!c.isNew) st.dupes++; }
    return true;
  };
  const choose = () => (done(mixIds) < 1 ? "mix" : "coffre");
  const out = {}; let mixDay = null, skinDay = null;
  for (let d = 0; d < DAYS; d++) {
    const dayStart = T0 + d * 86400e3, wd = d % 7;
    if (pf.days.includes(wd)) {
      for (const [i, h] of pf.hours.entries()) {
        const now = dayStart + (h - 7) * 3600e3;
        if (i === 0) {
          if (rng() < pf.social) { G.trackS(s, "chat", 1, now); G.trackS(s, "sheet", 3, now); s.counts = { ...(s.counts || {}), chat: (s.counts?.chat || 0) + 1, sheet: (s.counts?.sheet || 0) + 3 }; }
          open("jour", false, now);
        }
        // prédictions : 3 par semaine (lundi, mercredi, vendredi), la moitié réussies
        if (i === 0 && [0, 2, 4].includes(wd) && rng() < pf.social) {
          G.trackS(s, "predict", 1, now); s.counts = { ...(s.counts || {}), predict: (s.counts?.predict || 0) + 1 };
          if (rng() < 0.5) { s.chakra += G.PRED_REWARD; G.trackS(s, "predwin", 1, now); s.counts.predwin = (s.counts.predwin || 0) + 1; }
        }
        G.regenS(s, now);
        while (open(choose(), false, now)) G.regenS(s, now);
        if ((pf.recycleEvery === 1 || wd === pf.days[pf.days.length - 1]) && i === pf.hours.length - 1) { const v = G.recycleS(s, now); st.recycled += v; }
        G.claimAnyS(s, "all", null, now);
        while (open(choose(), false, now)) {}
        // dépense l'essence en boutique (garde de quoi rien : le joueur achète dès qu'il peut)
        while (s.chakra >= G.PRICE && open(choose(), true, now)) {}
      }
    }
    if (mixDay == null && done(mixIds) === 1) mixDay = d + 1;
    if (skinDay == null && done(skinIds) === 1) skinDay = d + 1;
    if (CHECKS.includes(d + 1)) {
      const stats = G.statsS(s);
      out[d + 1] = { boosters: st.free + st.day + st.paid, gratuits: st.free, jour: st.day, achetes: st.paid, mythiques: st.mythics,
        mythiquesDiff: G.CARDS.concat(G.SKINS).filter((c) => c.rar === "m" && has(c.id)).length, essenceGagnee: st.spent + s.chakra - 120, dontRecyclage: st.recycled, essenceDepensee: st.spent,
        doublons: st.dupes, mix: done(mixIds), skins: done(skinIds), toutes: stats.unique / (G.CARDS.length + G.SKINS.length), solde: s.chakra };
    }
  }
  return { out, mixDay, skinDay };
}

const med = (xs) => { const v = [...xs].sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
const result = {};
console.log(`Simulation : ${RUNS} joueurs par profil, ${DAYS} jours, règles actuelles (réserve ${G.FREE_MAX}, +1 toutes les ${G.REGEN / 3600e3} h, prix ${G.PRICE} ◆, recyclage ${G.RANKS.map((r) => G.RAR[r].chakra).join("/")})`);
for (const pf of PROFILES) {
  const runs = Array.from({ length: RUNS }, (_, i) => simulate(pf, 1000 + i));
  result[pf.id] = { label: pf.label, mixJours: med(runs.map((r) => r.mixDay ?? 999)), skinsJours: med(runs.map((r) => r.skinDay ?? 999)), points: {} };
  console.log(`\n### ${pf.label} : Mix complet en ${result[pf.id].mixJours >= 999 ? "plus de 180" : result[pf.id].mixJours} jours (médiane), tous les skins en ${result[pf.id].skinsJours >= 999 ? "plus de 180" : result[pf.id].skinsJours} jours`);
  console.log("jour | boosters (gratuits / jour / achetés) | Mythiques (différentes) | doublons | essence gagnée (dont recyclage) | dépensée | Mix | skins | tout");
  for (const d of CHECKS) {
    const m = (k) => med(runs.map((r) => r.out[d][k]));
    const row = Object.fromEntries(Object.keys(runs[0].out[d]).map((k) => [k, m(k)]));
    result[pf.id].points[d] = row;
    console.log(`${String(d).padStart(4)} | ${String(row.boosters).padStart(5)} (${row.gratuits} / ${row.jour} / ${row.achetes}) | ${row.mythiques} (${row.mythiquesDiff}) | ${row.doublons} | ${row.essenceGagnee} ◆ (${row.dontRecyclage}) | ${row.essenceDepensee} ◆ | ${Math.round(100 * row.mix)} % | ${Math.round(100 * row.skins)} % | ${Math.round(100 * row.toutes)} %`);
  }
}
if (process.env.REPORT_DIR) writeFileSync(process.env.REPORT_DIR + "/simulation-economie.json", JSON.stringify(result, null, 1));
