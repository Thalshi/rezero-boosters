// Construit la page de prévisualisation : le site (public/index.html) + le Worker regroupé + SQLite (sql.js) + la cale.
// Usage : python3 build.py && node tools/preview/build.mjs [sortie.html]
// Aucune donnée réelle : la base est créée vide dans le navigateur de chaque testeur.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// esbuild : celui du projet, ou celui indiqué par ESBUILD (chemin vers son dossier dans node_modules)
const { build } = await import(process.env.ESBUILD ? join(process.env.ESBUILD, "lib/main.js") : "esbuild").then((m) => m.default || m);
const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = join(HERE, "../..");
const out = process.argv[2] || join(ROOT, "tools/preview/dist/re-zero-preview.html");
const bundle = await build({ entryPoints: [join(ROOT, "worker/index.js")], bundle: true, format: "iife", globalName: "RZWorker", write: false, platform: "browser", target: "es2022", minify: true });
const worker = bundle.outputFiles[0].text;
const sqljs = readFileSync(join(HERE, "sql-wasm.js"), "utf8");
const wasm = readFileSync(join(HERE, "sql-wasm.wasm")).toString("base64");
const shim = readFileSync(join(HERE, "shim.js"), "utf8");
let page = readFileSync(join(ROOT, "public/index.html"), "utf8");
// le lecteur de claude.ai peut avoir son propre window.claude : le jeu passe par un nom à lui dans la prévisualisation
page = page.replaceAll("window.claude", "window.rzClaude");
page = page.replace(/<title>[^<]*<\/title>/, "<title>Re Zéro Prévisu</title>");
const head = `<script>${sqljs}</script>\n<script>window.RZ_WASM = "${wasm}";</script>\n<script>${worker}</script>\n<script>${shim}</script>\n`;
const i = page.indexOf("<script>");
if (i < 0) throw new Error("pas de <script> dans public/index.html");
page = page.slice(0, i) + head + page.slice(i);
// la base JS du jeu ne doit jamais contenir un </script> brut venu des fichiers insérés
if ((worker + shim + sqljs).includes("</script")) throw new Error("</script> dans un fichier inséré");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, page);
console.log(`${out} · ${(page.length / 1e6).toFixed(2)} Mo`);
