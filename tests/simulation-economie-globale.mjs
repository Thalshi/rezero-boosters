// Simulation de toute l'économie, avec les vraies règles du jeu (worker/game.js) et plusieurs réglages possibles.
// Ce qui rentre : boosters gratuits et pack du jour, recyclage des doublons, missions et succès, prédictions,
// Défilé des Légendes, Confrontation (récompense éventuelle). Ce qui sort : boosters achetés, invocations du Sanctuaire.
// Chaque réglage est appliqué à une copie du moteur (les constantes sont remplacées), jamais au jeu lui-même.
// Usage : node tests/simulation-economie-globale.mjs [joueurs par profil]
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url)), TMP = join(DIR, "reports", "sim-variantes");
mkdirSync(TMP, { recursive: true });
const RUNS = +(process.argv[2] || 8), DAYS = 180;
const T0 = Date.parse("2026-11-02T07:00:00+01:00");

// les réglages comparés ; « actuel » = ce qui est en production
const VARIANTS = process.env.FINAL ? [
  // le réglage final, tel qu'il est écrit dans le moteur (rien n'est remplacé sauf les prix déjà identiques)
  { id: "final", nom: "Final · D + missions refaites (2 du jour, 5 de la semaine) + Légendaire garantie, Mythique jamais", FREE_MAX: 3, REGEN_H: 3, PRICE: 150, SUMMON_COST: 150, COS: 1, confront: { partie: 10, victoire: 10, max: 3 } },
] : process.env.DURE ? [
  // économie dure : gains de C, boosters plus lents ou plus chers, et probabilités plus dures (D et E)
  { id: "g-quart", nom: "C · recyclage ÷ 4, missions ÷ 3 (probabilités actuelles)", FREE_MAX: 3, REGEN_H: 2, PRICE: 100, SUMMON_COST: 150, COS: 1, REC: [0, 1, 1, 4, 10, 25], MIS: 0.33, confront: { partie: 10, victoire: 10, max: 3 } },
  { id: "d-dure", nom: "D · C + gratuit toutes les 3 h, booster 150 ◆, probabilités dures", FREE_MAX: 3, REGEN_H: 3, PRICE: 150, SUMMON_COST: 150, COS: 1, REC: [0, 1, 1, 4, 10, 25], MIS: 0.33, confront: { partie: 10, victoire: 10, max: 3 }, PROB: { SLOT: "{ c: 56, pc: 28, r: 12, e: 3.2, l: 0.65, m: 0.15 }", LAST: "{ r: 86, e: 11, l: 2.5, m: 0.5 }", DAILY_LAST: "{ e: 90, l: 8.5, m: 1.5 }", MYTHIC_PITY: "150", GOLD_CHANCE: "0.01", SUMMON_RATES: "{ c: 42, pc: 30, r: 18, e: 7.5, l: 2.1, m: 0.4 }", SUMMON_PITY_M: "100" } },
  { id: "e-tres-dure", nom: "E · C + réserve 2, toutes les 4 h, booster 200 ◆, invocation 200 ◆, probabilités dures", FREE_MAX: 2, REGEN_H: 4, PRICE: 200, SUMMON_COST: 200, COS: 1.25, REC: [0, 1, 1, 4, 10, 25], MIS: 0.33, confront: { partie: 8, victoire: 8, max: 2 }, PROB: { SLOT: "{ c: 56, pc: 28, r: 12, e: 3.2, l: 0.65, m: 0.15 }", LAST: "{ r: 86, e: 11, l: 2.5, m: 0.5 }", DAILY_LAST: "{ e: 90, l: 8.5, m: 1.5 }", MYTHIC_PITY: "150", GOLD_CHANCE: "0.01", SUMMON_RATES: "{ c: 42, pc: 30, r: 18, e: 7.5, l: 2.1, m: 0.4 }", SUMMON_PITY_M: "100" } },
] : (process.env.GAINS ? [
  // étape 1 : les gains (recyclage et missions), prix des boosters et des invocations inchangés
  { id: "actuel", nom: "Actuel (en ligne)", FREE_MAX: 3, REGEN_H: 2, PRICE: 100, SUMMON_COST: 150, COS: 1, confront: null },
  { id: "g-moitie", nom: "A · recyclage et missions ÷ 2", FREE_MAX: 3, REGEN_H: 2, PRICE: 100, SUMMON_COST: 150, COS: 1, REC: [1, 1, 3, 8, 20, 50], MIS: 0.5, confront: { partie: 10, victoire: 10, max: 3 } },
  { id: "g-tiers", nom: "B · recyclage ÷ 3, missions ÷ 2", FREE_MAX: 3, REGEN_H: 2, PRICE: 100, SUMMON_COST: 150, COS: 1, REC: [1, 1, 2, 5, 13, 33], MIS: 0.5, confront: { partie: 10, victoire: 10, max: 3 } },
  { id: "g-quart", nom: "C · recyclage ÷ 4, missions ÷ 3", FREE_MAX: 3, REGEN_H: 2, PRICE: 100, SUMMON_COST: 150, COS: 1, REC: [0, 1, 1, 4, 10, 25], MIS: 0.33, confront: { partie: 10, victoire: 10, max: 3 } },
] : [
  { id: "actuel", nom: "Actuel (en ligne)", FREE_MAX: 3, REGEN_H: 2, PRICE: 100, SUMMON_COST: 150, COS: 1, confront: null },
  { id: "accessible", nom: "Accessible", FREE_MAX: 3, REGEN_H: 2, PRICE: 100, SUMMON_COST: 120, COS: 0.8, confront: { partie: 10, victoire: 10, max: 3 } },
  { id: "equilibre", nom: "Équilibré", FREE_MAX: 3, REGEN_H: 3, PRICE: 120, SUMMON_COST: 150, COS: 1, confront: { partie: 10, victoire: 10, max: 3 } },
  { id: "collection", nom: "Collectionneur", FREE_MAX: 2, REGEN_H: 4, PRICE: 150, SUMMON_COST: 180, COS: 1.2, confront: { partie: 8, victoire: 8, max: 2 } },
]);
const PROFILES = [
  { id: "occasionnel", label: "Occasionnel", days: [1, 3, 5, 6], hours: [12, 20], social: 0.5, games: 3 / 7 },
  { id: "regulier", label: "Régulier", days: [0, 1, 2, 3, 4, 5, 6], hours: [8, 13, 21], social: 0.9, games: 1 },
  { id: "actif", label: "Très actif", days: [0, 1, 2, 3, 4, 5, 6], hours: [8, 10, 12, 14, 16, 18, 20, 22], social: 1, games: 3 },
];

async function engineFor(v) {
  let src = readFileSync(join(DIR, "../worker/game.js"), "utf8");
  const set = (re, line) => { if (!re.test(src)) throw new Error("constante introuvable : " + re); src = src.replace(re, line); };
  set(/^const FREE_MAX = .*$/m, `const FREE_MAX = ${v.FREE_MAX};`);
  set(/^const REGEN = .*$/m, `const REGEN = ${v.REGEN_H} * 3600e3;`);
  set(/^const PRICE = .*$/m, `const PRICE = ${v.PRICE};`);
  set(/^const SUMMON_COST = .*$/m, `const SUMMON_COST = ${v.SUMMON_COST};`);
  set(/^const COS_PRICE = .*$/m, `const COS_PRICE = { c: ${Math.round(60 * v.COS)}, pc: ${Math.round(120 * v.COS)}, r: ${Math.round(250 * v.COS)}, e: ${Math.round(500 * v.COS)}, l: ${Math.round(1000 * v.COS)}, m: ${Math.round(2000 * v.COS)} };`);
  // recyclage : essence par doublon selon la rareté (c, pc, r, e, l, m)
  if (v.REC) ["c", "pc", "r", "e", "l", "m"].forEach((r, i) => set(new RegExp(`^(  ${r}:\\s*\\{ label: .*chakra: )\\d+( \\},)$`, "m"), `$1${v.REC[i]}$2`));
  // missions, série et succès : l'essence donnée est multipliée par MIS (les boosters offerts ne changent pas)
  if (v.MIS != null) src = src.replace(/reward: \{ chakra: (\d+) \}/g, (_, n) => `reward: { chakra: ${Math.round(n * v.MIS)} }`).replace(/^const STREAK = .*$/m, (l) => l.replace(/chakra: (\d+)/g, (_, n) => `chakra: ${Math.round(n * v.MIS)}`));
  // probabilités : remplace les constantes de tirage (boosters, pack du jour, Dorées, invocations, garanties)
  for (const [k, val] of Object.entries(v.PROB || {})) set(new RegExp(`^const ${k} = .*$`, "m"), `const ${k} = ${val};`);
  const f = join(TMP, `game-${v.id}.mjs`); writeFileSync(f, src);
  return import(f + "?" + Date.now());
}

function simulate(G, v, pf, seed) {
  let a = seed; const rng = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  const cfg = G.configFrom({ def: 2 }), mixIds = G.poolFor(G.PACKS.find((p) => p.id === "mix"), cfg, null).map((c) => c.id);
  const s = G.freshSave(T0); s.linked = true;
  const st = { mythB: 0, gagne: { recyclage: 0, missions: 0, predictions: 0, defile: 0, confront: 0 }, boosts: 0, boostSpent: 0, cosSpent: 0, summons: 0, cosM: 0, cosL: 0 };
  const done = () => mixIds.filter((id) => G.hasCard(s, id)).length / mixIds.length;
  const open = (pack, paid, now) => { const b = s.chakra, r = G.takeAndOpenS(s, pack, paid, cfg, null, rng, now); if (r.error) return false; for (const c of r.cards) if (G.CARD_BY_ID[c.id]?.rar === "m") st.mythB++; if (paid) { st.boosts++; st.boostSpent += b - s.chakra; } return true; };
  const summon = (n, now) => { const r = G.summonS(s, n, rng, now); if (r.error) return false; st.summons += n; st.cosSpent += r.cost; for (const x of r.got) { if (x.rar === "m") st.cosM++; if (x.rar === "l") st.cosL++; } return true; };
  // dépense : tant que le Mix n'est pas complet, moitié boosters, moitié invocations (on économise pour un ×5) ; ensuite tout en invocations
  const spend = (now) => {
    for (let k = 0; k < 50; k++) {
      const c5 = G.summonCost(5), c10 = G.summonCost(10), mixDone = done() >= 1;
      if (mixDone) { if (s.chakra >= c10 ? summon(10, now) : s.chakra >= c5 ? summon(5, now) : false) continue; return; }
      if (st.cosSpent <= st.boostSpent) { if (s.chakra >= c5 && summon(5, now)) continue; return; }
      if (s.chakra >= G.PRICE && open("mix", true, now)) continue; return;
    }
  };
  let mixDay = null; const at = {};
  for (let d = 0; d < DAYS; d++) {
    const dayStart = T0 + d * 86400e3, wd = d % 7;
    if (pf.days.includes(wd)) {
      for (const [i, h] of pf.hours.entries()) {
        const now = dayStart + (h - 7) * 3600e3;
        if (i === 0) {
          if (rng() < pf.social) { G.trackS(s, "chat", 1, now); G.trackS(s, "sheet", 3, now); s.counts = { ...(s.counts || {}), chat: (s.counts?.chat || 0) + 1, sheet: (s.counts?.sheet || 0) + 3 }; }
          open("jour", false, now);
          if ([0, 2, 4].includes(wd) && rng() < pf.social) { G.trackS(s, "predict", 1, now); s.counts.predict = (s.counts.predict || 0) + 1; if (rng() < 0.5) { s.chakra += G.PRED_REWARD; st.gagne.predictions += G.PRED_REWARD; G.trackS(s, "predwin", 1, now); } }
          // Défilé tous les 14 jours : participation, et parfois le podium (une table de ~15 joueurs)
          if (d % 14 === 6 && rng() < pf.social) { let g = G.DEFILE_PARTICIPATION; const r = rng(); if (r < 0.07) g += G.DEFILE_REWARDS[0]; else if (r < 0.14) g += G.DEFILE_REWARDS[1]; else if (r < 0.21) g += G.DEFILE_REWARDS[2]; s.chakra += g; st.gagne.defile += g; }
          // Confrontation : parties valables du jour, récompense plafonnée
          if (v.confront) { const n = Math.floor(pf.games) + (rng() < pf.games % 1 ? 1 : 0); for (let k = 0; k < n; k++) { const win = rng() < 0.5; G.trackS(s, "cfPlay", 1, now); if (win) G.trackS(s, "cfWin", 1, now); if (k >= v.confront.max) continue; const g = v.confront.partie + (win ? v.confront.victoire : 0); s.chakra += g; st.gagne.confront += g; } }
        }
        G.regenS(s, now);
        while (open(done() < 1 ? "mix" : "coffre", false, now)) G.regenS(s, now);
        if (i === pf.hours.length - 1) st.gagne.recyclage += G.recycleS(s, now);
        const c0 = s.chakra; G.claimAnyS(s, "all", null, now); st.gagne.missions += Math.max(0, s.chakra - c0);
        while (open(done() < 1 ? "mix" : "coffre", false, now)) {}
        spend(now);
      }
    }
    if (mixDay == null && done() >= 1) mixDay = d + 1;
    if (d + 1 === 30 || d + 1 === 90 || d + 1 === 180) at[d + 1] = { mythB: st.mythB, mix: done(), summons: st.summons, cosM: st.cosM, cosL: st.cosL, ...Object.fromEntries(Object.entries(st.gagne).map(([k, x]) => [k, x])) };
  }
  return { mixDay, at };
}

const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const res = {};
for (const v of VARIANTS) {
  const G = await engineFor(v);
  res[v.id] = { nom: v.nom, reglage: v, profils: {} };
  console.log(`\n=== ${v.nom} : réserve ${v.FREE_MAX}, +1 toutes les ${v.REGEN_H} h, booster ${v.PRICE} ◆, invocation ${v.SUMMON_COST} ◆ (×5 ${G.summonCost(5)}), cosmétique Mythique ${G.COS_PRICE.m} ◆, Confrontation ${v.confront ? `${v.confront.partie} + ${v.confront.victoire} si victoire, ${v.confront.max} parties/jour` : "rien"}`);
  console.log("profil | Mix complet (ou % à 6 mois) | Mythiques de boosters en 6 mois | essence gagnée / 30 j (recyclage · missions · prédictions · Défilé · Confrontation) | invocations / 30 j | cosmétiques L / M en 6 mois");
  for (const pf of PROFILES) {
    const runs = Array.from({ length: RUNS }, (_, i) => simulate(G, v, pf, 7000 + i));
    const m = (f) => med(runs.map(f)), per30 = (k) => Math.round(m((r) => r.at[180][k]) / 6);
    const row = { mixJours: m((r) => r.mixDay ?? 999), recyclage: per30("recyclage"), missions: per30("missions"), predictions: per30("predictions"), defile: per30("defile"), confront: per30("confront"), invocations30: Math.round(m((r) => r.at[180].summons) / 6), cosL: m((r) => r.at[180].cosL), cosM: m((r) => r.at[180].cosM), mythB: m((r) => r.at[180].mythB), mix180: Math.round(m((r) => r.at[180].mix) * 100) };
    row.total30 = row.recyclage + row.missions + row.predictions + row.defile + row.confront;
    res[v.id].profils[pf.id] = row;
    console.log(`${pf.label.padEnd(11)} | ${row.mixJours >= 999 ? `${row.mix180} % à 6 mois` : row.mixJours + " j"} | ${row.mythB} | ${row.total30} ◆ (${row.recyclage} · ${row.missions} · ${row.predictions} · ${row.defile} · ${row.confront}) | ${row.invocations30} | ${row.cosL} / ${row.cosM}`);
  }
}
writeFileSync(join(DIR, "reports", "simulation-economie-globale.json"), JSON.stringify(res, null, 1));
