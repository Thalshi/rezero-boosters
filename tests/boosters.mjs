// Règles des boosters, sans serveur : boosters vides, raretés, probabilités, pack du jour, pity, essence.
// Vérifie chaque booster à chaque épisode, plus des réglages extrêmes de Billy (persos cachés,
// déblocages individuels, catalogues tirés au hasard).
import * as G from "../worker/game.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { reporter, ROOT } from "./lib.mjs";

const t = reporter("Boosters · règles et probabilités");
const { PACKS, RANKS, CARDS, SKINS, PEOPLE } = G;
const rank = (r) => RANKS.indexOf(r);
// générateur reproductible (mulberry32) pour que les échecs se rejouent à l'identique
const seeded = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const rng = seeded(20261021);
const DAY = 86400e3, T0 = Date.parse("2026-10-22T10:00:00Z");
const who = Object.keys(PEOPLE);

// réglages testés : chaque épisode par défaut, puis des réglages extrêmes
const configs = [];
for (let def = 1; def <= G.EP_MAX; def++) configs.push([`épisode ${def}`, G.configFrom({ def })]);
configs.push(["tout caché", G.configFrom({ ep: Object.fromEntries(who.map((k) => [k, G.HIDDEN])) })]);
for (const k of who) configs.push([`seul ${k}`, G.configFrom({ ep: Object.fromEntries(who.map((x) => [x, x === k ? 1 : G.HIDDEN])) })]);
configs.push(["Mythiques seules", G.configFrom({ ep: Object.fromEntries(who.map((x) => [x, ["kai", "sultran"].includes(x) ? 1 : G.HIDDEN])) })]);
configs.push(["sans aucune Mythique", G.configFrom({ def: 2, ep: { kai: G.HIDDEN, sultran: G.HIDDEN, rayzo: G.HIDDEN, teo: G.HIDDEN, billy: G.HIDDEN, reichi: G.HIDDEN } })]);
for (let i = 0; i < 150; i++) configs.push([`hasard ${i}`, G.configFrom({ def: 1 + Math.floor(rng() * 3), ep: Object.fromEntries(who.map((k) => [k, rng() < 0.15 ? G.HIDDEN : 1 + Math.floor(rng() * 4)])) })]);
const UID = "d300000000000000003";
configs.push(["déblocage individuel de Kaï", G.configFrom({ def: 1, extra: { [UID]: ["kai"] } })]);
configs.push(["joueur en retard (épisode 1, les autres au 2)", G.configFrom({ def: 2, progress: { [UID]: 1 } })]);
const uidOf = (label) => (label.startsWith("déblocage") || label.startsWith("joueur en retard") ? UID : null);
const allPacks = (now = T0) => G.packsAt(now);

t.section("Boosters vides et seuils d'ouverture");
{
  let bad = [], closedOk = true, checked = 0;
  for (const [label, cfg] of configs) {
    const uid = uidOf(label);
    for (const pk of allPacks()) {
      const open = G.packOpenFor(pk, cfg, uid), pool = G.poolFor(pk, cfg, uid), mix = G.mixPoolFor(pk, cfg, uid);
      checked++;
      if (open && (!pool.length || !mix.some((c) => c.rar === "c") || (pk.fac && (G.themeSize(pool) < G.THEME_MIN || !G.THEME_RARITIES.every((r) => pool.some((c) => c.rar === r)))))) bad.push(`${label} · ${pk.id}`);
      if (!open) {
        // un booster fermé ne s'ouvre pas et ne consomme rien
        const s = G.freshSave(T0); s.chakra = 1000;
        const r = G.takeAndOpenS(s, pk.id, false, cfg, uid, rng, T0), r2 = G.takeAndOpenS(s, pk.id, true, cfg, uid, rng, T0);
        if (!r.error || !r2.error || s.free !== G.FREE_MAX || s.chakra !== 1000 || s.opened) closedOk = false;
      }
    }
  }
  t.check(`aucun booster ouvrable n'est vide, sous le seuil de ${G.THEME_MIN} persos ou sans Commune, Peu commune et Rare dans son thème (${checked} cas)`, !bad.length, bad.slice(0, 5));
  t.check("un booster fermé refuse de s'ouvrir sans rien consommer (gratuit ou payant)", closedOk);
  const ep1 = G.configFrom({ def: 1 });
  const st = Object.fromEntries(PACKS.map((p) => [p.id, G.packOpenFor(p, ep1, null) ? "ouvert" : `épisode ${G.packOpensAt(p, ep1, null)}`]));
  t.check("épisode 1 : tous les boosters ouverts, Vilains et Le Monde compris (persos secondaires de l'épisode 1)", Object.values(st).every((v) => v === "ouvert"), st);
  // identité des thèmes à l'épisode 1 : part des cartes qui viennent du thème et non du Mix
  for (const id of ["vilains", "monde"]) {
    const pk = PACKS.find((p) => p.id === id), pool = G.poolFor(pk, ep1, null);
    const slot = Object.entries(G.SLOT), last = Object.entries(G.LAST), sum = (t) => t.reduce((a, [, p]) => a + p, 0);
    const share = (4 * slot.filter(([r]) => pool.some((c) => c.rar === r)).reduce((a, [, p]) => a + p, 0) / sum(slot) + last.filter(([r]) => pool.some((c) => c.rar === r)).reduce((a, [, p]) => a + p, 0) / sum(last)) / 5;
    t.check(`épisode 1 : ${pk.name} garde son identité (${Math.round(100 * share)} % de cartes du thème, ${G.themeSize(pool)} persos)`, share >= 0.85);
  }
}

t.section("Raretés : jamais au-dessus de la rareté tirée");
{
  let up = 0, notExact = 0, n = 0;
  for (const [label, cfg] of configs) for (const pk of allPacks()) {
    const uid = uidOf(label);
    if (!G.packOpenFor(pk, cfg, uid)) continue;
    const pool = G.poolFor(pk, cfg, uid), mix = G.mixPoolFor(pk, cfg, uid);
    for (const r of RANKS) for (let i = 0; i < 4; i++) {
      const c = G.pickWith(r, pool, rng, mix); n++;
      if (!c || rank(c.rar) > rank(r)) up++;
      // si le Mix a cette rareté, la carte doit être exactement de cette rareté
      else if (mix.some((x) => x.rar === r) && c.rar !== r) notExact++;
    }
  }
  t.check(`aucune carte plus rare que la rareté tirée (${n} tirages)`, up === 0, { au_dessus: up });
  t.check("rareté exacte dès que le Mix l'a (le thème est complété par le Mix)", notExact === 0, { inexactes: notExact });
  const ep1 = G.configFrom({ def: 1 }), bande = PACKS.find((p) => p.id === "bande");
  const fromTheme = Array.from({ length: 2000 }, () => G.pickWith("c", G.poolFor(bande, ep1, null), rng, G.mixPoolFor(bande, ep1, null))).every((c) => PEOPLE[c.who].fac === "irl");
  t.check("un thème qui a la rareté ne prend jamais de carte du Mix", fromTheme);
}

t.section("Probabilités réelles comparées aux chances affichées");
{
  const N = 20000, rows = [];
  let worst = 0, valueMax = 0;
  for (const def of [1, 2]) {
    const cfg = G.configFrom({ def });
    const list = [...allPacks().filter((p) => G.packOpenFor(p, cfg, null)), G.dailyPackOf(T0, cfg, null)];
    for (const pk of list) {
      const pool = G.poolFor(pk, cfg, null), mix = G.mixPoolFor(pk, cfg, null), k = pk.boost || 1;
      const s = G.freshSave(T0), hit = Object.fromEntries(RANKS.map((r) => [r, 0]));
      let value = 0;
      for (let i = 0; i < N; i++) {
        s.sinceMythic = 0; s.sinceLegend = 0; // le pity est vérifié à part : ici, les chances de base
        const r = G.openPackS(s, pk, pool, rng, T0, mix);
        for (const rr of RANKS) if (r.cards.some((c) => G.CARD_BY_ID[c.id].rar === rr)) hit[rr]++;
        value += r.cards.reduce((a, c) => a + G.cardValue(c.id, c.gold), 0);
      }
      const shown = Object.fromEntries(["r", "e", "l", "m"].map((r) => [r, G.packChance(r, k, pk.daily ? G.DAILY_LAST : G.LAST)]));
      for (const r of ["r", "e", "l", "m"]) {
        const p = shown[r], got = hit[r] / N, se = Math.sqrt(p * (1 - p) / N);
        worst = Math.max(worst, Math.abs(got - p) / Math.max(se, 1e-9));
      }
      valueMax = Math.max(valueMax, pk.daily ? 0 : value / N);
      rows.push(`ép.${def} ${(pk.daily ? "jour·" + pk.base : pk.id).padEnd(13)} Mythique ${(100 * hit.m / N).toFixed(2)} % (affiché ${(100 * shown.m).toFixed(2)} %) · Légendaire ${(100 * hit.l / N).toFixed(1)} % (${(100 * shown.l).toFixed(1)} %) · Épique ${(100 * hit.e / N).toFixed(1)} % (${(100 * shown.e).toFixed(1)} %) · recyclage ${(value / N).toFixed(1)} ◆`);
    }
  }
  for (const r of rows) t.note(r);
  t.check(`chaque booster ouvert donne les chances affichées (${N} ouvertures chacun, écart max ${worst.toFixed(1)} écarts-types)`, worst < 4.5);
  t.check(`un booster acheté rend au plus 40 % de son prix en recyclage (max ${valueMax.toFixed(1)} ◆ pour ${G.PRICE} ◆)`, valueMax <= 0.4 * G.PRICE);
}

t.section("Pack du jour : rotation sur deux ans");
{
  let closedWithMix = [], notOpen = [], repeats = [], missing = [];
  for (const [label, cfg] of configs) {
    const uid = uidOf(label), seen = new Set();
    const mixOk = G.dailyOpenFor(PACKS.find((p) => p.id === "mix"), cfg, uid);
    const themes = G.DAY_THEMES.filter((id) => G.dailyOpenFor(PACKS.find((p) => p.id === id), cfg, null));
    let prev = null;
    for (let d = 0; d < 730; d++) {
      const pk = G.dailyPackOf(T0 + d * DAY, cfg, uid);
      if (pk.closed) { if (mixOk) closedWithMix.push(`${label} jour ${d}`); prev = null; continue; }
      if (!G.dailyOpenFor(PACKS.find((p) => p.id === pk.base), cfg, uid)) notOpen.push(`${label} · ${pk.base}`);
      if (!uid && themes.length > 1 && pk.base === prev) repeats.push(`${label} jour ${d}`);
      prev = pk.base; seen.add(pk.base);
    }
    if (!uid && themes.some((id) => !seen.has(id))) missing.push(label);
  }
  t.check("le pack du jour existe tous les jours dès que le Mix peut s'ouvrir", !closedWithMix.length, closedWithMix.slice(0, 3));
  t.check("le pack du jour propose toujours un booster ouvert pour ce joueur (sinon un Mix)", !notOpen.length, notOpen.slice(0, 3));
  t.check("jamais le même thème deux jours de suite quand il y en a plusieurs", !repeats.length, repeats.slice(0, 3));
  t.check("chaque thème ouvert revient dans la rotation", !missing.length, missing.slice(0, 3));
  const late = G.dailyPackOf(T0, G.configFrom({ def: 2, progress: { [UID]: 1 } }), UID);
  t.check("joueur en retard sur l'épisode : pack du jour en secours (Mix ou thème ouvert pour lui)", !late.closed && G.packOpenFor(PACKS.find((p) => p.id === late.base), G.configFrom({ def: 2, progress: { [UID]: 1 } }), UID), late.base);
  const none = G.configFrom({ ep: Object.fromEntries(who.map((k) => [k, G.HIDDEN])) }), s = G.freshSave(T0);
  const r = G.takeAndOpenS(s, "jour", false, none, null, rng, T0);
  t.check("si rien n'est ouvert : pas de pack du jour, rien n'est consommé", !!r.error && !s.dailyPack && !s.opened, r.error);
  const ep1 = G.configFrom({ def: 1 }), first = Array.from({ length: 6 }, (_, d) => G.dailyPackOf(T0 + d * DAY, ep1, null).base);
  t.note(`épisode 1, à partir du ${G.dayKey(T0)} : ${first.join(", ")}`);
}

t.section("Légendaire garantie (jamais la Mythique) et cartes dorées");
{
  const cfg = G.configFrom({ def: 2 }), s = G.freshSave(T0); let gap = 0, maxGap = 0, goldGap = 0, maxGold = 0, reset = true;
  for (let i = 0; i < 3000; i++) {
    s.free = 1; const r = G.takeAndOpenS(s, "mix", false, cfg, null, rng, T0);
    const l = r.cards.some((c) => rank(G.CARD_BY_ID[c.id].rar) >= 4), g = r.cards.some((c) => c.gold);
    gap = l ? 0 : gap + 1; maxGap = Math.max(maxGap, gap); goldGap = g ? 0 : goldGap + 1; maxGold = Math.max(maxGold, goldGap);
    if ((l && s.sinceLegend !== 0) || (g && s.sinceGold !== 0)) reset = false;
  }
  t.check(`une Légendaire ou mieux au plus tous les ${G.LEGEND_PITY} boosters (3 000 ouvertures)`, maxGap < G.LEGEND_PITY, { plus_longue_série: maxGap });
  t.check(`une carte dorée au plus tous les ${G.GOLD_EVERY} boosters`, maxGold < G.GOLD_EVERY, { plus_longue_série: maxGold });
  t.check("compteurs remis à zéro après une Légendaire (ou mieux) ou une dorée", reset);
  let forcedOk = true;
  for (let i = 0; i < 200; i++) {
    const s1 = G.freshSave(T0); s1.sinceLegend = G.LEGEND_PITY - 1; s1.sinceGold = G.GOLD_EVERY - 1;
    const r = G.takeAndOpenS(s1, "vilains", false, cfg, null, rng, T0);
    if (!r.cards.some((c) => rank(G.CARD_BY_ID[c.id].rar) >= 4) || !r.cards.some((c) => c.gold) || s1.sinceLegend || s1.sinceGold) forcedOk = false;
  }
  t.check(`au ${G.LEGEND_PITY}e booster sans Légendaire, elle arrive (même dans un thème), avec la dorée garantie`, forcedOk);
  t.check("la Mythique n'est jamais garantie", G.MYTHIC_PITY === 0 && G.SUMMON_PITY_M === 0);
  const s3 = G.freshSave(T0); s3.sinceMythic = 5000; let m3 = 0;
  for (let i = 0; i < 300; i++) { s3.free = 1; s3.sinceLegend = 0; const r = G.takeAndOpenS(s3, "mix", false, cfg, null, rng, T0); m3 += r.cards.filter((c) => G.CARD_BY_ID[c.id].rar === "m").length; }
  t.check("même après des milliers de boosters sans Mythique, rien n'est forcé", m3 < 300 * 0.1, { mythiques_par_booster: +(m3 / 300).toFixed(3) });
}

t.section("Économie");
{
  const cfg = G.configFrom({ def: 1 }), s = G.freshSave(T0); s.chakra = 10000;
  t.check("Saison 1 ne s'achète pas (seulement avec un booster gratuit)", !!G.takeAndOpenS(s, "saison1", true, cfg, null, rng, T0).error && s.chakra === 10000);
  t.check("Saison 1 s'ouvre avec un booster gratuit", !G.takeAndOpenS(s, "saison1", false, cfg, null, rng, T0).error);
  t.check("un identifiant de booster inconnu ne permet pas d'acheter l'édition limitée", !!G.takeAndOpenS(s, "inconnu", true, cfg, null, rng, T0).error && s.chakra === 10000);
  const s3 = G.freshSave(T0); s3.free = 0; s3.freeTs = T0;
  G.regenS(s3, T0 + G.REGEN * 10);
  t.check(`recharge : +1 toutes les ${G.REGEN / 3600e3} h, réserve plafonnée à ${G.FREE_MAX}`, s3.free === G.FREE_MAX);
  t.check("valeurs de recyclage C/PC/R/E/L/M", RANKS.map((r) => G.RAR[r].chakra).join("/") === "1/3/6/15/40/100", RANKS.map((r) => G.RAR[r].chakra).join("/"));
}

t.section("Constantes partagées avec le serveur");
{
  const src = ["index.js", "game-api.js", "sync.js"].map((f) => readFileSync(join(ROOT, "worker", f), "utf8")).join("\n");
  const used = [...new Set([...src.matchAll(/\bG\.([A-Za-z_]\w*)/g)].map((m) => m[1]))];
  const missing = used.filter((k) => G[k] === undefined);
  t.check(`toutes les règles utilisées par le serveur sont exportées (${used.length})`, !missing.length, missing);
  const gameSrc = readFileSync(join(ROOT, "src/game.js"), "utf8");
  const multi = gameSrc.split("\n").filter((l) => /^(const|let) \w+ = [^;=]*?, *[A-Za-z_]\w* = /.test(l) && !/=>/.test(l));
  t.check("une seule constante par ligne dans src/game.js (sinon build.py n'exporte que la première)", !multi.length, multi);
}
t.done();
