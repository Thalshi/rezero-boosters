// Confrontation · simulations de parties complètes entre bots, de 2 à 7 joueurs.
// Lancer : node tests/confront-sim.mjs [--parties 2000] [--modes 2,3,4,5,6,7] [--collusion 2000]
//          [--reference 400] [--avant] [--config '{"pv":{"duel":5}}'] [--json fichier]
//   --avant      : règles d'origine, sans les corrections d'équilibrage (pour comparer)
//   --reference  : parties par branche « une branche contre des joueurs Chance » (duel et trio)
// Mesure : victoires par branche, par rôle et par ordre de jeu, durée, tours, éliminations
// précoces, portée, soins, attaques, mains, boucles, collusion à trois. Les bots sont simples :
// les chiffres comparent des règles entre elles, ce ne sont pas des prédictions sur des humains.
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { cpus } from "node:os";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as E from "../worker/confront/engine.mjs";
import { playGame, botRng } from "../worker/confront/bots.mjs";
import { BRANCH_IDS } from "../worker/confront/branches.mjs";
import { BRANCHES_PROPOSEES } from "../worker/confront/branches-proposees.mjs";
import { CONFIG_AVANT_CORRECTIONS, mergeConfig } from "../worker/confront/config.mjs";
import { setup } from "./confront-outils.mjs";

const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };

// ---------- une partie de référence : p0 avec une branche, les autres en Chance ----------
function refGame(n, i, config, branch) {
  const br = { p0: branch };
  for (let k = 1; k < n; k++) br["p" + k] = "chance";
  const s = setup(n, { seed: `ref-${branch}-${n}-${i}`, branches: br, config });
  const rng = botRng(`ref-${branch}-${n}-${i}`);
  const end = playGame(s, { optsFor: () => ({ rng }) }).state;
  return { kind: "ref", n, branch, gagne: end.result.gagnants.includes("p0") };
}

// ---------- une partie ----------
function oneGame(n, i, config, kind) {
  const seed = `sim-${kind}-${n}-${i}`;
  const r = botRng(seed + "-bots");
  const who = Object.keys(BRANCHES_PROPOSEES);
  // contributions variées : de 0 à 8 cartes de collection par joueur, le reste en prêts
  const players = Array.from({ length: n }, (_, k) => {
    const nb = Math.floor(r() * 9), branches = [...BRANCH_IDS].sort(() => r() - 0.5).slice(0, nb);
    return { id: "p" + k, contribution: branches.map((b, j) => { const w = who.filter((x) => BRANCHES_PROPOSEES[x] === b); return { instanceId: `${seed}-${k}-${j}`, cardId: w[Math.floor(r() * w.length)] + "-1", branch: b }; }) };
  });
  const s0 = E.createGame({ players, seed, config });
  const elimRound = {};
  const optsFor = kind === "collusion" ? (pid) => (pid === "p2" ? { rng: r } : { rng: r, focus: "p2", partners: ["p0", "p1"] }) : () => ({ rng: r });
  const { state: s, steps } = playGame(s0, {
    optsFor, maxSteps: 40000,
    onStep: (st, pid, a, evs) => { for (const e of evs) if (e.type === "elimination") elimRound[e.pid] = e.tourDeTable; },
  });
  const seats = [...s.players].sort((a, b) => a.siege - b.siege), fi = seats.findIndex((p) => p.id === s.premier);
  const order = Object.fromEntries(seats.map((p, k) => [p.id, (k - fi + n) % n]));
  return {
    kind, n, mode: s.mode, raison: s.result.raison, camp: s.result.camp, tours: s.result.tours, tourDeTable: s.result.tourDeTable, steps,
    effondrement: s.stats.effondrement, remelanges: s.stats.remelanges,
    joueurs: s.players.map((p) => ({ id: p.id, branch: p.perso.branch, pret: p.perso.pret, role: p.role, ordre: order[p.id], gagne: s.result.gagnants.includes(p.id), elim: p.ordreElim, elimRound: elimRound[p.id] ?? null, ...s.stats.joueurs[p.id] })),
  };
}

// ---------- agrégats ----------
function aggregate(games) {
  const by = (f) => { const m = {}; for (const g of games) for (const p of g.joueurs) { const k = f(p, g); if (k == null) continue; (m[k] ||= []).push({ p, g }); } return m; };
  const rate = (arr) => arr.filter((x) => x.p.gagne).length / arr.length;
  const mean = (arr) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
  const q = (arr, f) => { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(f * s.length))]; };
  const all = games.flatMap((g) => g.joueurs.map((p) => ({ p, g })));
  const winAll = rate(all);
  // victoires par rôle (classique), puis « avantage » d'une branche = victoires − attendu selon le rôle
  const roleRate = Object.fromEntries(Object.entries(by((p) => p.role)).map(([k, v]) => [k, rate(v)]));
  const branch = Object.fromEntries(Object.entries(by((p) => p.branch)).map(([k, v]) => {
    const exp = mean(v.map((x) => (x.p.role ? roleRate[x.p.role] : winAll)));
    return [k, { n: v.length, victoires: rate(v), ecart: rate(v) - exp, soins: mean(v.map((x) => x.p.soins || 0)), frappes: mean(v.map((x) => x.p.frappes || 0)), pvPerdus: mean(v.map((x) => x.p.pvPerdus || 0)), mainMax: mean(v.map((x) => x.p.mainMax || 0)) }];
  }));
  const order = Object.fromEntries(Object.entries(by((p) => p.ordre)).map(([k, v]) => {
    const exp = mean(v.map((x) => (x.p.role ? roleRate[x.p.role] : winAll)));
    return [k, { n: v.length, victoires: rate(v), ecart: rate(v) - exp }];
  }));
  const tours = games.map((g) => g.tours), rounds = games.map((g) => g.tourDeTable);
  return {
    parties: games.length,
    raisons: games.reduce((m, g) => ((m[g.raison] = (m[g.raison] || 0) + 1), m), {}),
    tours: { moyenne: mean(tours), mediane: q(tours, 0.5), p90: q(tours, 0.9), max: Math.max(...tours) },
    toursDeTable: { moyenne: mean(rounds), p90: q(rounds, 0.9), max: Math.max(...rounds) },
    actions: mean(games.map((g) => g.steps)),
    effondrement: games.filter((g) => g.effondrement > 0).length / games.length,
    limiteTours: games.filter((g) => g.raison === "limite_de_tours").length,
    remelanges: mean(games.map((g) => g.remelanges)),
    elimPrecoce: { tour1: all.filter((x) => x.p.elimRound != null && x.p.elimRound <= 1).length / all.length, tour2: all.filter((x) => x.p.elimRound != null && x.p.elimRound <= 2).length / all.length, premiereElimTour: mean(games.map((g) => Math.min(...g.joueurs.map((p) => p.elimRound ?? Infinity))).filter(isFinite)) },
    portee: { horsPorteeParJoueur: mean(all.map((x) => x.p.horsPortee || 0)), horsPorteeParTour: all.reduce((a, x) => a + (x.p.horsPortee || 0), 0) / games.reduce((a, g) => a + g.tours, 0) },
    soins: mean(all.map((x) => x.p.soins || 0)), frappes: mean(all.map((x) => x.p.frappes || 0)), pvPerdus: mean(all.map((x) => x.p.pvPerdus || 0)),
    mains: { maxMoyen: mean(all.map((x) => x.p.mainMax || 0)), p95: q(all.map((x) => x.p.mainMax || 0), 0.95), max: Math.max(...all.map((x) => x.p.mainMax || 0)) },
    roles: Object.fromEntries(Object.entries(by((p) => p.role)).map(([k, v]) => [k, { n: v.length, victoires: rate(v) }])),
    camps: games.reduce((m, g) => (g.camp && (m[g.camp] = (m[g.camp] || 0) + 1), m), {}),
    branches: branch, ordre: order, victoireMoyenne: winAll,
    pretsChoisis: all.filter((x) => x.p.pret).length / all.length,
  };
}

// ---------- fil de travail ----------
if (!isMainThread) {
  const { jobs, config } = workerData;
  const out = [];
  for (const j of jobs) out.push(j.kind === "ref" ? refGame(j.n, j.i, config, j.branch) : oneGame(j.n, j.i, config, j.kind));
  parentPort.postMessage(out);
} else {
  const { reporter } = await import("./lib.mjs");
  const N = +arg("parties", 2000), modes = arg("modes", "2,3,4,5,6,7").split(",").map(Number);
  const avant = process.argv.includes("--avant");
  let config = arg("config") ? JSON.parse(arg("config")) : undefined;
  if (avant) config = mergeConfig(CONFIG_AVANT_CORRECTIONS, config || {});
  const collusionN = +arg("collusion", N), refN = +arg("reference", 400);
  const jobs = [];
  for (const n of modes) for (let i = 0; i < N; i++) jobs.push({ n, i, kind: "normal" });
  if (modes.includes(3) && collusionN) for (let i = 0; i < collusionN; i++) jobs.push({ n: 3, i, kind: "collusion" });
  for (const n of [2, 3]) if (refN && modes.includes(n)) for (const branch of BRANCH_IDS) for (let i = 0; i < refN; i++) jobs.push({ n, i, kind: "ref", branch });
  const W = Math.max(1, Math.min(cpus().length, 8)), t0 = Date.now();
  const chunks = Array.from({ length: W }, (_, k) => jobs.filter((_, i) => i % W === k));
  let failure = null;
  const results = (await Promise.all(chunks.map((c) => new Promise((res) => {
    const w = new Worker(fileURLToPath(import.meta.url), { workerData: { jobs: c, config } });
    w.on("message", res);
    w.on("error", (e) => { failure = e; res([]); });
  })))).flat();
  const t = reporter("Confrontation · simulations");
  t.check("aucune action de bot refusée, aucune erreur du moteur", !failure, failure && String(failure.message).slice(0, 300));
  const report = { regles: avant ? "avant corrections" : "par défaut (corrections appliquées)", config: config || null, parties: N, duree_s: 0, modes: {}, collusion: null, reference: {} };
  t.note(`règles : ${report.regles}${arg("config") ? " + " + arg("config") : ""}`);
  const pct = (x) => (100 * x).toFixed(1) + " %", sgn = (x) => (x >= 0 ? "+" : "") + (100 * x).toFixed(1);
  for (const n of modes) {
    const a = aggregate(results.filter((g) => g.n === n && g.kind === "normal"));
    report.modes[n] = a;
    t.section(`${n} joueurs · ${a.parties} parties`);
    t.check(`${n} joueurs : toutes les parties se terminent, aucune limite de tours atteinte`, a.parties === N && a.limiteTours === 0, { limite: a.limiteTours });
    t.note(`fins : ${JSON.stringify(a.raisons)} · tours ${a.tours.moyenne.toFixed(1)} (médiane ${a.tours.mediane}, p90 ${a.tours.p90}, max ${a.tours.max}) · tours de table ${a.toursDeTable.moyenne.toFixed(1)} (p90 ${a.toursDeTable.p90}) · effondrement atteint ${pct(a.effondrement)}`);
    if (n >= 4) t.note(`rôles : ${Object.entries(a.roles).map(([k, v]) => `${k} ${pct(v.victoires)}`).join(" · ")} · camps ${JSON.stringify(a.camps)}`);
    t.note(`branches (victoires, écart à l'attendu) : ${Object.entries(a.branches).sort((x, y) => y[1].ecart - x[1].ecart).map(([k, v]) => `${k} ${pct(v.victoires)} (${sgn(v.ecart)})`).join(" · ")}`);
    t.note(`ordre de jeu (0 = premier) : ${Object.entries(a.ordre).map(([k, v]) => `${k}: ${pct(v.victoires)} (${sgn(v.ecart)})`).join(" · ")}`);
    t.note(`élimination au 1er tour de table ${pct(a.elimPrecoce.tour1)}, aux 2 premiers ${pct(a.elimPrecoce.tour2)} · hors de portée ${a.portee.horsPorteeParTour.toFixed(3)} par tour · frappes ${a.frappes.toFixed(1)} · soins ${a.soins.toFixed(1)} · PV perdus ${a.pvPerdus.toFixed(1)} par joueur · main max moyenne ${a.mains.maxMoyen.toFixed(1)} (p95 ${a.mains.p95}, max ${a.mains.max}) · prêts joués ${pct(a.pretsChoisis)}`);
  }
  const col = results.filter((g) => g.kind === "collusion");
  if (col.length) {
    const a = aggregate(col);
    const victim = col.filter((g) => g.joueurs.find((p) => p.id === "p2").gagne).length / col.length;
    const firstOut = col.filter((g) => g.joueurs.find((p) => p.elim === 1).id === "p2").length / col.length;
    report.collusion = { parties: col.length, victimeGagne: victim, victimeSortPremiere: firstOut, tours: a.tours };
    t.section(`Collusion à trois (trio, p0 et p1 contre p2) · ${col.length} parties`);
    t.check("parties en collusion : toutes terminées", a.limiteTours === 0 && col.length === collusionN);
    t.note(`la victime gagne ${pct(victim)} (attendu sans collusion : 33,3 %) et sort la première dans ${pct(firstOut)} des parties · tours ${a.tours.moyenne.toFixed(1)}`);
  }
  for (const n of [2, 3]) {
    const ref = results.filter((g) => g.kind === "ref" && g.n === n);
    if (!ref.length) continue;
    t.section(`Référence : chaque branche contre ${n - 1} joueur(s) Chance · ${refN} parties par branche`);
    const rates = Object.fromEntries(BRANCH_IDS.map((b) => { const r = ref.filter((g) => g.branch === b); return [b, r.filter((g) => g.gagne).length / r.length]; }));
    report.reference[n] = rates;
    t.note(`attendu si égalité : ${pct(1 / n)} · ${Object.entries(rates).sort((a, b) => b[1] - a[1]).map(([b, r]) => `${b} ${pct(r)}`).join(" · ")}`);
  }
  report.duree_s = (Date.now() - t0) / 1000;
  t.note(`${results.length} parties simulées en ${report.duree_s.toFixed(0)} s sur ${W} cœurs`);
  if (arg("json")) writeFileSync(arg("json"), JSON.stringify(report, null, 1));
  t.done();
}
