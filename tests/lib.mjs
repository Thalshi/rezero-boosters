// Outils communs des tests : serveur local isolé, joueurs factices, assertions, rapport.
// Les tests ne touchent jamais la base de production : chaque fichier démarre son propre
// `wrangler dev --local` avec une base D1 temporaire, puis l'efface.
import { spawn, execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TESTS = join(ROOT, "tests");

// wrangler : celui de tests/node_modules (npm install dans tests/), ou WRANGLER=/chemin/vers/wrangler
export function wranglerBin() {
  if (process.env.WRANGLER) return process.env.WRANGLER;
  const local = join(TESTS, "node_modules/.bin/wrangler");
  if (existsSync(local)) return local;
  throw new Error("wrangler introuvable : lance `npm install` dans tests/ ou définis WRANGLER=/chemin/vers/wrangler");
}

// playwright : celui de tests/node_modules, sinon l'installation globale
export async function playwright() {
  try { return await import("playwright"); } catch (e) {}
  const root = execFileSync("npm", ["root", "-g"]).toString().trim();
  return createRequire(import.meta.url)(join(root, "playwright"));
}

// Les identifiants Discord factices des tests (aucun n'est réel)
export const IDS = {
  admin: "100000000000000001",   // joue le rôle de Billy
  dev: "200000000000000002",     // joue le rôle de Reichi
  p1: "300000000000000003",
  p2: "400000000000000004",
  p3: "500000000000000005",
};

/**
 * Démarre un serveur local isolé. `script` permet de lancer une variante du Worker
 * (ex. tests/instrumented-worker.mjs pour la mesure) sans modifier le code du jeu.
 */
export async function startServer({ port, script = null, root = ROOT, persist = null, keep = false } = {}) {
  // un ancien serveur encore lancé sur ce port fausserait tout (vieille base) : on refuse de démarrer
  const busy = await fetch(`http://localhost:${port}/api/me`).then(() => true).catch(() => false);
  if (busy) throw new Error(`Le port ${port} est déjà utilisé (un ancien serveur de test tourne encore ?). Arrête-le avant de relancer.`);
  persist = persist || mkdtempSync(join(tmpdir(), "rezero-test-"));
  const args = ["dev", ...(script ? [script] : []), "--local", "--port", String(port), "--persist-to", persist,
    "--var", "DEV_LOGIN:1", "--var", `ADMIN_IDS:${IDS.admin}`, "--var", `DEV_IDS:${IDS.dev}`];
  const proc = spawn(wranglerBin(), args, { cwd: root, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, WRANGLER_SEND_METRICS: "false" } });
  let log = "";
  proc.stdout.on("data", (d) => (log += d)); proc.stderr.on("data", (d) => (log += d));
  const base = `http://localhost:${port}`;
  for (let i = 0; i < 90; i++) {
    try { const r = await fetch(base + "/"); if (r.ok) break; } catch (e) {}
    await new Promise((r) => setTimeout(r, 1000));
    if (i === 89) { proc.kill(); throw new Error("Le serveur local n'a pas démarré :\n" + log.slice(-2000)); }
  }
  const sql = (command) => execFileSync(wranglerBin(), ["d1", "execute", "rezero-boosters", "--local", "--persist-to", persist, "--command", command], { cwd: root, stdio: "pipe" }).toString();
  const sqlFile = (file) => execFileSync(wranglerBin(), ["d1", "execute", "rezero-boosters", "--local", "--persist-to", persist, "--file", file], { cwd: root, stdio: "pipe" }).toString();
  // résultat d'une requête SQL en tableau d'objets
  const rows = (command) => { const out = sql(command); const i = out.indexOf("["); return i < 0 ? [] : JSON.parse(out.slice(i))[0]?.results || []; };
  const stop = async () => { proc.kill(); await new Promise((r) => setTimeout(r, 800)); if (!keep) try { rmSync(persist, { recursive: true, force: true }); } catch (e) {} };
  return { base, sql, sqlFile, rows, stop, persist, log: () => log };
}

// Un joueur connecté via /auth/dev (connexion factice, active seulement en local)
export async function player(base, id, name) {
  const r = await fetch(`${base}/auth/dev?id=${id}&name=${encodeURIComponent(name)}`, { redirect: "manual" });
  const cookie = r.headers.get("set-cookie").split(";")[0];
  const call = async (method, url, body) => {
    const res = await fetch(base + url, { method, headers: { cookie, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    const json = await res.json().catch(() => null);
    return { status: res.status, ...(json && typeof json === "object" ? json : {}), body: json };
  };
  return {
    id: "d" + id, cookie,
    api: (a, body = {}) => call("POST", "/api/game/" + a, body),
    get: (a) => call("GET", "/api/game/" + a),
    doc: (method, path, body) => call(method, "/api/doc?path=" + encodeURIComponent(path), body),
    coll: (method, path, body) => call(method, "/api/coll?path=" + encodeURIComponent(path), body),
    me: () => call("GET", "/api/me"),
  };
}

// Assertions et rapport
export function reporter(title) {
  const results = [];
  const out = {
    section(name) { console.log(`\n--- ${name}`); results.push({ section: name }); },
    check(name, ok, info) {
      results.push({ name, ok: !!ok, info });
      console.log(`${ok ? "✅" : "❌"} ${name}${info === undefined ? "" : "  " + JSON.stringify(info)}`);
    },
    note(text) { console.log(`ℹ️  ${text}`); results.push({ note: text }); },
    done() {
      const checks = results.filter((r) => "ok" in r), failed = checks.filter((r) => !r.ok);
      console.log(`\n${title} : ${checks.length - failed.length} réussis, ${failed.length} échoués`);
      if (process.env.REPORT_DIR) writeFileSync(join(process.env.REPORT_DIR, title.replace(/\W+/g, "-") + ".json"), JSON.stringify({ title, results }, null, 1));
      process.exitCode = failed.length ? 1 : 0;
      return failed.length;
    },
  };
  console.log(`\n===== ${title}`);
  return out;
}
// Donne des boosters gratuits ou de l'essence à des joueurs de test (base locale uniquement),
// pour les scénarios qui en demandent plus que la réserve normale.
export function grant(srv, players, { free, chakra } = {}) {
  for (const p of [].concat(players)) {
    const sets = [free != null && `'$.free', ${+free}`, chakra != null && `'$.chakra', ${+chakra}`].filter(Boolean).join(", ");
    // la base locale peut être occupée par le serveur (SQLITE_BUSY) : on réessaie quelques fois
    for (let i = 0; ; i++) {
      try { srv.sql(`UPDATE players SET data = json_set(data, ${sets}) WHERE uid = '${p.id}'`); break; }
      catch (e) { if (i >= 5 || !String(e.stderr || e.message).includes("SQLITE_BUSY")) throw e; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 400); }
    }
  }
}
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const total = (s) => Object.values(s.owned || {}).reduce((a, o) => a + o.n + o.gold, 0);

// deux cartes de même rareté (une chez chacun) pour un échange valable : carte contre carte de même rareté
import * as GG from "../worker/game.js";
export function samePair(sa, sb) {
  const a = Object.keys(sa.owned).filter((id) => sa.owned[id].n > 0), b = Object.keys(sb.owned).filter((id) => sb.owned[id].n > 0);
  for (const x of a) { const y = b.find((id) => GG.CARD_BY_ID[id].rar === GG.CARD_BY_ID[x].rar); if (y) return [x, y]; }
  return [a[0], b[0]];
}
