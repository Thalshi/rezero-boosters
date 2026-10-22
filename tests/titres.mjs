// Titres : gagnés par un coup d'éclat (ouverture, invocation) ou par la progression (Confrontation, Défilé,
// collection, prédictions). Vérifie l'attribution, l'ancienne forme, le choix du titre affiché et sa publication.
import { startServer, player, reporter, IDS } from "./lib.mjs";
import * as G from "../worker/game.js";

const t = reporter("Titres");
t.section("Règles (game.js)");
const fresh = () => G.normalizeSave(G.freshSave());
const ev = (rars, extra = {}) => ({ open: rars.map((r) => ({ rar: r, gold: false })), ...extra });
let s = fresh();
t.check("deux Légendaires dans la même ouverture : « Double couronne »", G.grantTitlesS(s, ev(["c", "l", "r", "l", "c"])).includes("o-2l"));
t.check("un titre ne se gagne qu'une fois", !G.grantTitlesS(s, ev(["l", "l"])).includes("o-2l"));
t.check("le premier titre gagné s'affiche tout seul", s.titleShown === "o-2l");
s = fresh();
const got = G.grantTitlesS(s, ev(["m", "m", "l", "e", "c"]));
t.check("deux Mythiques + une Légendaire : Cœurs jumeaux, Alignement des astres, Trinité", ["o-2m", "o-lm", "o-3e"].every((id) => got.includes(id)), got);
t.check("cinq raretés : Arc-en-ciel", G.grantTitlesS(fresh(), ev(["c", "pc", "r", "e", "l"])).includes("o-rainbow"));
t.check("deux dorées : Pluie d'or", G.grantTitlesS(fresh(), { open: [{ rar: "c", gold: true }, { rar: "r", gold: true }] }).includes("o-2gold"));
t.check("booster divin : Élu des dieux", G.grantTitlesS(fresh(), ev(["c"], { divine: true })).includes("o-divine"));
t.check("une ouverture ne donne pas de titre d'invocation", !G.grantTitlesS(fresh(), ev(["l", "l"])).some((id) => id.startsWith("i-")));
const sm = (rars) => ({ summon: rars.map((r) => ({ rar: r })) });
t.check("invocation : deux Légendaires, deux Mythiques, Mythique en ×1", G.grantTitlesS(fresh(), sm(["l", "l", "c", "c", "r"])).includes("i-2l") && G.grantTitlesS(fresh(), sm(["m", "m", "c", "c", "r"])).includes("i-2m") && G.grantTitlesS(fresh(), sm(["m"])).includes("i-m1"));
t.check("Mythique dans un ×5 : pas « Main bénie »", !G.grantTitlesS(fresh(), sm(["m", "c", "c", "c", "r"])).includes("i-m1"));
s = fresh(); s.counts = { cfWin: 10, cfWin_gardien: 1, cfWin1pv: 1, predwin: 10, summon: 100, defile: 5, defile2: 1 };
const prog = G.grantTitlesS(s);
t.check("compteurs : Confrontation, prédictions, Sanctuaire, Défilé", ["c-win1", "c-win10", "c-gardien", "c-1pv", "p-10", "i-100", "d-part5", "defile-2"].every((id) => prog.includes(id)) && !prog.includes("c-win50") && !prog.includes("defile-1"), prog);
t.check("sans événement : aucun titre de coup d'éclat", !prog.some((id) => id.startsWith("o-")));
const old = G.normalizeSave({ ...G.freshSave(), titles: ["Légende du Défilé", "nimporte quoi"], titleShown: "o-2m" });
t.check("ancienne forme : le nom du Défilé devient son identifiant, l'inconnu disparaît", JSON.stringify(old.titles) === '["defile-1"]' && old.titleShown === null, old.titles);
t.check("afficher un titre qu'on n'a pas : refusé", !!G.showTitleS(fresh(), "o-2l").error);
t.check("chaque titre a un nom, un kanji, une catégorie et une rareté connues", G.TITLES.every((x) => x.name && x.kanji && G.TITLE_CATS[x.cat] && G.RAR[x.rar] && (x.hit || x.val)) && new Set(G.TITLES.map((x) => x.id)).size === G.TITLES.length);
t.check("une vraie ouverture et une vraie invocation renvoient leurs titres", (() => { const z = fresh(); z.chakra = 1e6; z.free = 2; const o = G.openManyS(z, "saison1", false, 2, G.configFrom(null), "u", Math.random); const i = G.summonS(z, 10, Math.random); return Array.isArray(o.titles) && Array.isArray(i.titles); })());

const srv = await startServer({ port: +(process.env.PORT || 8876) });
try {
  t.section("Serveur");
  const P = await player(srv.base, IDS.p1, "Teo"), Q = await player(srv.base, IDS.p2, "Lina");
  await P.api("state"); await Q.api("state");
  srv.sql(`UPDATE players SET data = json_set(data, '$.counts', json('{"predwin":10,"cfWin":1}')) WHERE uid = '${P.id}'`);
  const st = await P.api("state");
  t.check("la progression donne ses titres à la prochaine action", ["p-10", "c-win1"].every((id) => st.state.titles.includes(id)), st.state.titles);
  t.check("une notification annonce chaque titre", srv.rows(`SELECT text FROM notifs WHERE uid = '${P.id}' AND kind = 'titre'`).length === 2);
  t.check("pas de nouveau titre la fois suivante", !(await P.api("state")).titles);
  t.check("choisir un titre qu'on n'a pas : refusé", (await P.api("title", { id: "o-2m" })).status === 400);
  const sh = await P.api("title", { id: "p-10" });
  t.check("choisir son titre affiché", sh.status === 200 && sh.state.titleShown === "p-10");
  const pr = await Q.api("profile", { uid: P.id });
  t.check("les autres voient ses titres et celui affiché", pr.titleShown === "p-10" && pr.titles.includes("c-win1"));
  t.check("le titre affiché est publié pour le classement", JSON.parse(srv.rows(`SELECT data FROM docs WHERE path = 'players/${P.id}'`)[0].data).title === "p-10");
  t.check("ne plus afficher de titre", (await P.api("title", { id: null })).state.titleShown === null);
} catch (e) { t.check("exécution sans erreur", false, String(e.stack || e)); }
finally { t.done(); await srv.stop(); }
