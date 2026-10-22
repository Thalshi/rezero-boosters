// Coffre arcanique : moteur de scénarios (sans serveur).
// 30 scénarios (6 classiques, 7 feintes, 7 transformations, 6 spectaculaires, 4 secrets), conditions, poids,
// et surtout : le scénario est choisi APRÈS le tirage et ne change jamais les cartes ; une feinte ne montre jamais plus haut que la vérité.
import { reporter, ROOT } from "./lib.mjs";
import * as G from "../worker/game.js";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const t = reporter("Coffre · moteur de scénarios");
const S = G.CHEST_SCENARIOS, cats = (c) => S.filter((x) => x.cat === c).length;
const seeded = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };

t.section("Catalogue");
t.check("30 scénarios : 6 classiques, 7 feintes, 7 transformations, 6 spectaculaires, 4 secrets", S.length === 30 && cats("classique") === 6 && cats("fake") === 7 && cats("transfo") === 7 && cats("spectacle") === 6 && cats("secret") === 4, { total: S.length });
t.check("identifiants uniques", new Set(S.map((x) => x.id)).size === S.length);
const src = readFileSync(join(ROOT, "src/coffre.js"), "utf8");
const played = new Set([...src.matchAll(/^\s+async (\w+)\(/gm)].map((m) => m[1]));
const used = new Set(S.flatMap((x) => x.beats.map((b) => b[0])));
t.check("chaque temps fort utilisé est déclaré", [...used].every((b) => G.CHEST_BEATS.includes(b)), [...used].filter((b) => !G.CHEST_BEATS.includes(b)));
t.check("chaque temps fort déclaré est joué par le navigateur (src/coffre.js)", G.CHEST_BEATS.every((b) => played.has(b)), G.CHEST_BEATS.filter((b) => !played.has(b)));
t.check("chaque scénario finit par l'ouverture", S.every((x) => x.beats.at(-1)[0] === "open"));
t.check("chaque scénario commence par la clé dans la serrure", S.every((x) => x.beats[0][0] === "insert"));

t.section("Conditions (cartes fabriquées)");
const pick = (rar, n = 1, extra = {}) => Array.from({ length: n }, () => ({ id: G.SKINS.find((c) => c.rar === rar && (!extra.who || c.who === extra.who)).id, gold: !!extra.gold, isNew: extra.isNew ?? false }));
const ctxOf = (cards, now) => G.chestCtx(cards, now ?? Date.parse("2026-11-02T15:00:00+01:00"));
const elig = (cards, now) => G.chestEligible(ctxOf(cards, now)).map((x) => x.id);
const uniq = (n) => G.SKINS.filter((c) => c.rar === n);
const cardsOf = (rs) => rs.map((r, i) => ({ id: uniq(r)[i % uniq(r).length].id, gold: false, isNew: false }));
const all5c = cardsOf(["c", "c", "c", "c", "c"]);
t.check("5 Communes : aucune feinte, aucune transformation, aucun spectacle", elig(all5c).every((id) => id.startsWith("cl-")), elig(all5c));
t.check("2 Mythiques : « Cœurs jumeaux » possible", elig(cardsOf(["m", "m", "c", "c", "c"])).includes("tr-jumeaux"));
t.check("Légendaire + Mythique : « Éclipse » possible", elig(cardsOf(["l", "m", "c", "c", "c"])).includes("tr-eclipse"));
t.check("2 Légendaires : « Double couronne » possible", elig(cardsOf(["l", "l", "c", "c", "c"])).includes("tr-couronne"));
t.check("plusieurs Épiques : « Trinité violette » possible", elig(cardsOf(["e", "e", "c", "c", "c"])).includes("tr-trinite"));
const golds = cardsOf(["r", "c", "c", "c", "c"]).map((x, i) => ({ ...x, gold: i < 2 }));
t.check("plusieurs dorées : « Pluie d'or » possible", elig(golds).includes("tr-pluie-or"));
t.check("Mythique : « Extinction » et « Colonne céleste » possibles", ["fk-extinction", "sp-colonne"].every((id) => elig(cardsOf(["m", "c", "c", "c", "c"])).includes(id)));
t.check("secret « Arc-en-ciel » : 5 raretés différentes", elig(cardsOf(["c", "pc", "r", "e", "l"])).includes("se-arcenciel"));
t.check("secret « Minuit à Shinjuku » : à 0 h 30 heure de Paris seulement", elig(cardsOf(["r", "c", "c", "c", "c"]), Date.parse("2026-11-03T00:30:00+01:00")).includes("se-minuit") && !elig(cardsOf(["r", "c", "c", "c", "c"]), Date.parse("2026-11-03T01:30:00+01:00")).includes("se-minuit"));
const twin = cardsOf(["e", "c", "c", "c", "c"]); twin[1] = { ...twin[0] };
t.check("secret « Miroir » : deux fois la même carte Épique ou mieux", elig(twin).includes("se-miroir"));
const twinC = cardsOf(["r", "c", "c", "c", "e"]); twinC[1] = { ...twinC[0] };
t.check("deux Rares identiques ne suffisent pas pour « Miroir »", !elig(twinC).includes("se-miroir"));
t.check("« Le créateur » : une carte de Billy trop commune ne suffit pas", !elig([...pick("c", 1, { who: "billy" }), ...G.SKINS.filter((c) => c.who !== "billy" && c.rar === "l").slice(0, 1).map((c) => ({ id: c.id, gold: false, isNew: false })), ...cardsOf(["c", "c", "c"])]).includes("se-createur"));
if (G.SKINS.some((c) => c.who === "billy")) t.check("secret « Le créateur » : une carte de Billy, Épique ou mieux", elig([...pick("e", 1, { who: "billy" }), ...pick("c", 4)]).includes("se-createur"));
const reach = new Set();
for (const set of [all5c, cardsOf(["m", "m", "c", "c", "c"]), cardsOf(["l", "m", "c", "c", "c"]), cardsOf(["l", "l", "c", "c", "c"]), cardsOf(["e", "e", "c", "c", "c"]), golds, cardsOf(["c", "pc", "r", "e", "l"]), twin, [...pick("e", 1, { who: "billy" }), ...pick("c", 4)],
  cardsOf(["m", "c", "c", "c", "c"]), cardsOf(["l", "r", "r", "c", "c"]), cardsOf(["e", "e", "r", "c", "c"]).map((x) => ({ ...x, isNew: true })), cardsOf(["r", "c", "c", "c", "c"]).map((x, i) => ({ ...x, gold: i === 0, isNew: true })), cardsOf(["r", "r", "r", "c", "c"]).map((x) => ({ ...x, isNew: true }))])
  for (const id of elig(set)) reach.add(id);
for (const id of elig(cardsOf(["r", "c", "c", "c", "c"]), Date.parse("2026-11-03T00:30:00+01:00"))) reach.add(id);
t.check("les 30 scénarios sont atteignables", reach.size === 30, S.map((x) => x.id).filter((id) => !reach.has(id)));

t.section("Le résultat n'est jamais falsifié");
let wrongTint = [], notEligible = 0;
const dist = {}, byCat = {};
const cfg = G.configFrom({ def: 2 });
const RUNS = 20000;
// 40 joueurs qui ouvrent chacun 500 coffres : la collection se remplit, les nouveautés se raréfient
let s;
for (let i = 0; i < RUNS; i++) {
  if (i % 500 === 0) s = G.freshSave(0); s.free = 3;
  const before = i < 500 ? structuredClone(s) : null;
  const r = G.takeAndOpenS(s, "coffre", false, cfg, null, seeded(i), Date.parse("2026-11-02T15:00:00+01:00") + i * 6e4);
  const sc = G.CHEST_BY_ID[r.scenario], ctx = G.chestCtx(r.cards, Date.parse("2026-11-02T15:00:00+01:00") + i * 6e4);
  if (!sc || !sc.when(ctx)) notEligible++;
  for (const [b, arg] of sc.beats) if (b === "tint" && arg && (G.RANKS.indexOf(arg) > ctx.rank || (sc.cat === "fake" && G.RANKS.indexOf(arg) >= ctx.rank))) wrongTint.push([sc.id, arg, ctx.best]);
  dist[sc.id] = (dist[sc.id] || 0) + 1; byCat[sc.cat] = (byCat[sc.cat] || 0) + 1;
  // mêmes cartes qu'une ouverture faite avec la même graine, sans scénario
  if (i < 500) {
    const s2 = before;
    const pk = G.packOfAt("coffre", 0), r2 = G.openPackS(s2, pk, G.poolFor(pk, cfg, null), seeded(i), Date.parse("2026-11-02T15:00:00+01:00") + i * 6e4, G.mixPoolFor(pk, cfg, null));
    if (JSON.stringify(r2.cards) !== JSON.stringify(r.cards)) notEligible += 1000;
  }
}
t.check("le scénario est toujours permis par les cartes tirées", notEligible === 0, notEligible);
t.check("le scénario est tiré après les cartes : il ne change pas le tirage", notEligible < 1000);
t.check("une feinte montre toujours moins que la vérité, aucun scénario ne montre plus", wrongTint.length === 0, wrongTint.slice(0, 3));
t.check("une ouverture de booster (hors coffre) n'a pas de scénario", !("scenario" in G.takeAndOpenS(Object.assign(G.freshSave(0), { free: 3 }), "mix", false, cfg, null, seeded(1), 0)));
const pct = (n) => Math.round(n / RUNS * 1000) / 10;
t.note(`Répartition sur ${RUNS} coffres réels (poids provisoires) : ` + Object.entries(byCat).map(([k, v]) => `${k} ${pct(v)} %`).join(", "));
t.note("Par scénario : " + Object.entries(dist).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${pct(v)} %`).join(", "));
if (process.env.REPORT_DIR) writeFileSync(join(process.env.REPORT_DIR, "coffre-repartition.json"), JSON.stringify({ RUNS, byCat, dist }, null, 1));
t.done();
