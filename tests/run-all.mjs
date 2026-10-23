// Lance toute la suite, fichier par fichier (chacun a son serveur et sa base temporaires),
// puis affiche le bilan. Usage : node tests/run-all.mjs [--sans-mesure]
import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const reports = join(dir, "reports", new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-"));
mkdirSync(reports, { recursive: true });
const files = ["boosters.mjs", "api-securite.mjs", "api-economie.mjs", "api-confidentialite.mjs", "api-cosmetiques.mjs", "coffre.mjs", "ui-invite.mjs", "ui-cosmetiques.mjs", "ui-coffre.mjs", "ouverture-3d.mjs", "admin-labo.mjs", "defile.mjs", "marche-designs.mjs", "fonctionnalites.mjs", "confront-engine.mjs", "confront-api.mjs", "confront-arene.mjs", "creations.mjs", "titres.mjs", "compte-test.mjs", "retours-ui.mjs", "confront-salon.mjs", "confront-arene-salon.mjs", "campagne-securite.mjs", "campagne.mjs", "preview.mjs", "ui-multijoueur.mjs", "sync-revisions.mjs", ...(process.argv.includes("--sans-mesure") ? [] : ["mesure.mjs"])];
const bilan = [];
for (const [i, f] of files.entries()) {
  const r = spawnSync(process.execPath, [join(dir, f)], { stdio: "inherit", env: { ...process.env, REPORT_DIR: reports, PORT: String(8811 + i) } });
  bilan.push([f, r.status === 0]);
}
console.log("\n===== Bilan");
for (const [f, ok] of bilan) console.log(`${ok ? "✅" : "❌"} ${f}`);
console.log(`Rapports : ${reports}`);
process.exitCode = bilan.every(([, ok]) => ok) ? 0 : 1;
