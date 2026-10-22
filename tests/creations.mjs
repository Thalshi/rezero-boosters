// Créations depuis l'app : Billy (admin) et Reichi (dev) ajoutent ou retouchent persos, cartes et cosmétiques,
// publiés directement. Vérifie les droits, la validation, l'absence de spoil, les images, l'historique, les
// notifications, et que le reste du jeu (Boutique, branches de Confrontation) utilise bien les créations.
import { startServer, player, reporter, IDS, grant } from "./lib.mjs";
import * as G from "../worker/game.js";

const srv = await startServer({ port: +(process.env.PORT || 8875) });
const t = reporter("Créations · persos, cartes et cosmétiques");
// une petite image jpeg valide (1×1)
const IMG = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==";
try {
  const B = await player(srv.base, IDS.admin, "Billy"), R = await player(srv.base, IDS.dev, "Reichi"), P = await player(srv.base, IDS.p1, "Teo");
  for (const p of [B, R, P]) await p.api("state");

  t.section("Droits");
  const c0 = await P.api("creations");
  t.check("tout joueur lit le catalogue (vide au départ)", c0.status === 200 && c0.v === 0 && !c0.log);
  t.check("un joueur ne peut pas créer", (await P.api("creations/save", { kind: "perso", data: { name: "X", fac: "irl", rar: "c" } })).status === 403);
  t.check("l'API des documents ne donne ni le catalogue ni les images", (await P.doc("GET", "creations/catalog")).body?.exists === false && (await P.doc("GET", "creaimg/x")).body?.exists === false);
  t.check("l'API des documents refuse d'écrire le catalogue, même à l'admin", (await B.doc("PUT", "creations/catalog", { people: {} })).status >= 400);

  t.section("Validation");
  const bad = [
    [{ kind: "perso", data: { fac: "irl", rar: "c" } }, "nom manquant"],
    [{ kind: "perso", data: { name: "X", fac: "pirates", rar: "c" } }, "faction inconnue"],
    [{ kind: "perso", data: { name: "X", fac: "irl" } }, "rareté de carte manquante"],
    [{ kind: "perso", data: { name: "X", fac: "irl", rar: "c", color: "rouge" } }, "couleur invalide"],
    [{ kind: "perso", data: { name: "X", fac: "irl", rar: "c", ep: 40 } }, "épisode hors limites"],
    [{ kind: "perso", data: { name: "X", fac: "irl", rar: "c" }, image: "data:text/html;base64,PHNjcmlwdD4=" }, "image qui n'est pas une image"],
    [{ kind: "perso", data: { name: "X", fac: "irl", rar: "c" }, image: "data:image/jpeg;base64," + "A".repeat(500000) }, "image trop lourde"],
    [{ kind: "carte", data: { who: "personne", title: "T", rar: "c" } }, "carte d'un perso inconnu"],
    [{ kind: "cos", data: { slot: "aura", k: "laser", name: "A", rar: "r" } }, "effet inexistant"],
    [{ kind: "perso", id: "pas-un-perso", data: { name: "Y" } }, "retouche d'un perso inexistant"],
  ];
  for (const [b, why] of bad) { const r = await B.api("creations/save", b); if (r.status !== 400 && r.status !== 404) t.check(`refusé : ${why}`, false, r.status); }
  t.check("10 envois invalides refusés (nom, faction, rareté, couleur, épisode, image, poids, perso, effet, id)", true);
  t.check("rien n'a été écrit", (await P.api("creations")).v === 0);

  t.section("Créer un perso (Billy) : visible tout de suite, avec sa carte, ses skins et sa branche");
  const z = await B.api("creations/save", { kind: "perso", data: { name: "Zéphyr", fac: "irl", rar: "r", tag: "Vent du QG", ep: 1, branche: "chance", color: "#3366ff", kanji: "風", power: "Il souffle fort" }, image: IMG });
  t.check("création publiée, identifiant tiré du nom", z.status === 200 && z.id === "c-zephyr" && z.people["c-zephyr"].name === "Zéphyr");
  t.check("sa carte principale existe (titre et rareté donnés)", z.cards["c-zephyr"]?.rar === "r" && z.cards["c-zephyr"].title === "Vent du QG");
  const cz = await P.api("creations");
  t.check("un joueur le voit (épisode 1 atteint), image comprise", cz.people["c-zephyr"]?.name === "Zéphyr" && cz.imgs["c-zephyr"] === 1);
  t.check("l'image se charge", (await P.api("creations/img", { k: "c-zephyr" })).uri === IMG);
  const br = await R.api("confront/branches");
  t.check("le serveur connaît la carte et ses 6 skins (perso du QG)", br.proposees["c-zephyr"] === "chance" && br.proposees["c-zephyr-sk-prestige"] === "chance");
  t.check("historique : visible de l'équipe seulement", cz.log === undefined && (await R.api("creations")).log?.[0]?.text.includes("Zéphyr"));
  const notifs = srv.rows(`SELECT text FROM notifs WHERE uid = '${R.id}'`);
  t.check("Reichi est prévenu de ce que Billy publie", notifs.some((n) => n.text.includes("Zéphyr")), notifs.map((n) => n.text));
  t.check("un nom déjà pris donne un autre identifiant", (await R.api("creations/save", { kind: "perso", data: { name: "Zéphyr", fac: "neu", rar: "c" } })).id === "c-zephyr-2");

  t.section("Pas de spoil : un perso d'un épisode pas encore atteint");
  const s = await B.api("creations/save", { kind: "perso", data: { name: "Secret", fac: "anta", rar: "e", tag: "Le prochain méchant", ep: 6 }, image: IMG });
  const cs = await P.api("creations");
  t.check("le joueur ne voit ni le nom, ni le titre, ni l'image", cs.people[s.id]?.name === "???" && cs.cards[s.id]?.title === "???" && cs.imgs[s.id] === undefined);
  t.check("l'image est refusée au joueur", (await P.api("creations/img", { k: s.id })).status === 404);
  t.check("l'équipe le voit en entier", (await R.api("creations")).people[s.id].name === "Secret");

  t.section("Cartes : nouvelle variante et retouche d'une carte existante");
  const v = await R.api("creations/save", { kind: "carte", data: { who: "c-zephyr", title: "Tempête", rar: "l", pos: "50% 30%", zoom: 1.2 }, image: IMG });
  t.check("nouvelle carte d'un perso, avec sa propre image", v.status === 200 && v.cards[v.id]?.rar === "l" && v.cards[v.id].img === "cr-" + v.id);
  const m = await B.api("creations/save", { kind: "carte", id: "seb", data: { title: "Seb retouché" } });
  t.check("retouche d'une carte du jeu de base", m.status === 200 && (await P.api("creations")).cards.seb?.title === "Seb retouché");
  const back = await B.api("creations/reset", { kind: "carte", id: "seb" });
  t.check("revenir à l'original", back.status === 200 && !back.cards.seb);
  t.check("une création publiée ne se « remet pas d'origine »", (await B.api("creations/reset", { kind: "perso", id: "c-zephyr" })).status === 400);

  t.section("Cosmétique créé : en Boutique, achetable");
  const a = await B.api("creations/save", { kind: "cos", data: { slot: "aura", k: "pulse", name: "Aura du vent", rar: "r", c1: "#33ccff", coll: "givre" } });
  t.check("cosmétique publié", a.status === 200 && a.cos[a.id]?.name === "Aura du vent");
  grant(srv, [P], { chakra: 5000 });
  const buy = await P.api("shop/buy", { id: a.id });
  t.check("un joueur l'achète au prix de sa rareté", buy.status === 200 && buy.state.cos.own[a.id] && buy.state.chakra === 5000 - G.COS_PRICE.r, { status: buy.status, err: buy.error });
  const sa = await B.api("creations/save", { kind: "cos", data: { slot: "holo", k: "glitch", name: "Faille 2", rar: "m", only: "sanctuaire" } });
  t.check("réservé au Sanctuaire : refusé en Boutique", (await P.api("shop/buy", { id: sa.id })).status === 400);

  t.section("Concurrence et cohérence");
  const burst = await Promise.all([1, 2, 3, 4].map((i) => (i % 2 ? B : R).api("creations/save", { kind: "carte", data: { who: "c-zephyr", title: "Rafale " + i, rar: "c" } })));
  const fin = await R.api("creations");
  t.check("4 publications simultanées : aucune perdue", burst.every((x) => x.status === 200) && [1, 2, 3, 4].every((i) => Object.values(fin.cards).some((c) => c.title === "Rafale " + i)), burst.map((x) => x.status));
  t.check("le joueur garde ses cartes et son état après toutes ces publications", (await P.api("state")).status === 200);
} catch (e) { t.check("exécution sans erreur", false, String(e.stack || e)); }
finally { t.done(); await srv.stop(); }
