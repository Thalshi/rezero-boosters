// Prévisualisation de Re Zéro sans serveur : le vrai Worker (worker/index.js, regroupé) tourne dans la page,
// avec une base SQLite propre à ce navigateur (sql.js, gardée dans IndexedDB). Les appels /api/* et /auth/*
// du jeu lui sont envoyés sans jamais quitter le navigateur : aucun lien avec Cloudflare ni la production.
(() => {
  const ENV = { DEV_LOGIN: "1", ADMIN_IDS: "318510456459362306", DEV_IDS: "666024039776518157", DISCORD_CLIENT_ID: "preview", GUILD_ID: "preview" };
  const PERSONAS = [
    { id: "666024039776518157", name: "Reichi", role: "Dev (tous les droits)" },
    { id: "318510456459362306", name: "Billy", role: "Admin" },
    { id: "300000000000000003", name: "Teo", role: "Joueur" },
    { id: "300000000000000004", name: "Aiko", role: "Joueuse" },
    { id: "300000000000000005", name: "Bram", role: "Joueur" },
  ];
  const LS = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } };
  // --- IndexedDB : la base de la prévisualisation survit au rechargement ---
  const idb = () => new Promise((res, rej) => { const r = indexedDB.open("rz-preview", 1); r.onupgradeneeded = () => r.result.createObjectStore("kv"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const idbGet = async (k) => { try { const d = await idb(); return await new Promise((res) => { const q = d.transaction("kv").objectStore("kv").get(k); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); } catch (e) { return null; } };
  const idbSet = async (k, v) => { try { const d = await idb(); await new Promise((res) => { const t = d.transaction("kv", "readwrite"); t.objectStore("kv").put(v, k); t.oncomplete = res; t.onerror = res; }); } catch (e) {} };
  const b64 = (s) => { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };

  // --- base D1 simulée au-dessus de sql.js (mêmes appels que Cloudflare : prepare, bind, first, all, run, batch) ---
  let db = null, saveT = null;
  const dirty = () => { clearTimeout(saveT); saveT = setTimeout(() => idbSet("db", db.export()), 500); };
  const norm = (v) => (v === undefined ? null : typeof v === "boolean" ? (v ? 1 : 0) : v);
  function rows(sql, params) {
    const st = db.prepare(sql); st.bind(params); const out = [];
    while (st.step()) out.push(st.getAsObject());
    st.free();
    if (!/^\s*select/i.test(sql)) dirty();
    return out;
  }
  const stmt = (sql, params = []) => ({
    sql, params,
    bind: (...a) => stmt(sql, a.map(norm)),
    async first(col) { const r = rows(sql, params)[0] || null; return col ? (r ? r[col] : null) : r; },
    async all() { return { results: rows(sql, params), success: true, meta: {} }; },
    async raw() { return rows(sql, params).map((r) => Object.values(r)); },
    async run() { db.run(sql, params); const changes = db.getRowsModified(); dirty(); return { success: true, meta: { changes, last_row_id: db.exec("SELECT last_insert_rowid()")[0].values[0][0] } }; },
  });
  const D1 = {
    prepare: (sql) => stmt(sql),
    async batch(list) {
      db.run("BEGIN");
      try { const out = []; for (const s of list) out.push(/^\s*select/i.test(s.sql) ? await s.all() : await s.run()); db.run("COMMIT"); return out; }
      catch (e) { try { db.run("ROLLBACK"); } catch (e2) {} throw e; }
    },
    async exec(sql) { db.exec(sql); dirty(); return { count: 1 }; },
  };
  ENV.DB = D1; ENV.ASSETS = { fetch: () => new Response("", { status: 404 }) };

  // --- session : on joue « en tant que » une personne de la liste ---
  const token = () => LS("rzp-token");
  async function loginAs(p) {
    const t = [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, "0")).join("");
    await callWorker("/api/me", {}, null); // crée les tables si besoin
    db.run("INSERT OR REPLACE INTO users (id, name, avatar, member, updated) VALUES (?, ?, '', 1, ?)", ["d" + p.id, p.name, Date.now()]);
    db.run("INSERT INTO sessions (token, uid, expires) VALUES (?, ?, ?)", [t, "d" + p.id, Date.now() + 365 * 86400e3]);
    dirty();
    return t;
  }
  // appel direct du Worker (sans passer par fetch), avec la session voulue
  async function callWorker(path, init = {}, tok = token()) {
    const r = new Request("https://preview.re-zero" + path, { method: init.method || "GET", headers: init.headers, body: init.body });
    const req = { url: r.url, method: r.method, headers: { get: (k) => (k.toLowerCase() === "cookie" ? (tok ? "rz_session=" + tok : null) : r.headers.get(k)) }, json: () => r.json(), text: () => r.text() };
    return RZWorker.default.fetch(req, ENV);
  }
  const ready = (async () => {
    const SQL = await initSqlJs({ wasmBinary: b64(window.RZ_WASM) });
    const saved = await idbGet("db");
    db = saved ? new SQL.Database(saved) : new SQL.Database();
    if (!token() || !LS("rzp-who")) { LS("rzp-who", PERSONAS[0].id); LS("rzp-token", await loginAs(PERSONAS[0])); }
    const ok = await callWorker("/api/me");
    if (ok.status === 401) { const p = PERSONAS.find((x) => x.id === LS("rzp-who")) || PERSONAS[0]; LS("rzp-token", await loginAs(p)); }
  })();
  window.RZP = { ready, callWorker, PERSONAS, db: () => db, save: () => idbSet("db", db.export()) };

  // --- tout appel /api/* ou /auth/* du jeu va au Worker de la page ---
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    const u = new URL(typeof input === "string" ? input : input.url, location.href);
    if (u.origin !== location.origin || !(u.pathname.startsWith("/api/") || u.pathname.startsWith("/auth/"))) return realFetch(input, init);
    await ready;
    try { return await callWorker(u.pathname + u.search, init); }
    catch (e) { console.error("prévisualisation", e); return new Response(JSON.stringify({ error: "Erreur dans la prévisualisation : " + e.message, message: e.message }), { status: 500, headers: { "content-type": "application/json" } }); }
  };

  // --- outils de la prévisualisation ---
  const who = () => PERSONAS.find((p) => p.id === LS("rzp-who")) || PERSONAS[0];
  const sqlSet = (uid, sets) => { db.run(`UPDATE players SET data = json_set(data, ${sets}) WHERE uid = ?`, ["d" + uid]); dirty(); };
  async function switchTo(id) { await ready; const p = PERSONAS.find((x) => x.id === id); LS("rzp-who", p.id); LS("rzp-token", await loginAs(p)); await idbSet("db", db.export()); location.hash = "#/boosters"; location.reload(); }
  async function tool(kind) {
    await ready;
    const me = who().id;
    await callWorker("/api/game/state", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    if (kind === "ess") sqlSet(me, "'$.chakra', json_extract(data, '$.chakra') + 5000");
    if (kind === "free") sqlSet(me, "'$.free', 30");
    if (kind === "vet") sqlSet(me, `'$.created', ${Date.now() - 10 * 86400e3}, '$.opened', max(json_extract(data, '$.opened'), 10)`);
    if (kind === "pop") await populate();
    if (kind === "reset") { if (!confirmBox()) return; db = new (await initSqlJs({ wasmBinary: b64(window.RZ_WASM) })).Database(); await idbSet("db", db.export()); LS("rzp-token", null); LS("rzp-who", null); location.reload(); return; }
    await idbSet("db", db.export());
    location.reload();
  }
  const confirmBox = () => { const b = document.getElementById("rzpReset"); if (b.dataset.sure) return true; b.dataset.sure = "1"; b.textContent = "Confirmer : tout effacer"; return false; };
  // remplit le QG : chaque personne ouvre des boosters, a un compte « ancien », et deux joueurs mettent une carte en vente
  async function populate() {
    for (const p of PERSONAS) {
      const t = await loginAs(p), post = (path, body) => callWorker(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body || {}) }, t);
      await post("/api/game/state");
      sqlSet(p.id, `'$.free', 15, '$.chakra', 3000, '$.created', ${Date.now() - 10 * 86400e3}`);
      for (let i = 0; i < 15; i++) await post("/api/game/open", { pack: i % 3 === 2 ? "coffre" : "mix" });
      if (p.name === "Aiko" || p.name === "Bram") {
        const st = await (await post("/api/game/state")).json();
        const dup = Object.entries(st.state.owned).find(([, o]) => o.n > 1);
        if (dup) await post("/api/game/market/sell", { id: dup[0], price: 40 });
      }
    }
    LS("rzp-token", await loginAs(who()));
  }
  function bar() {
    const el = document.createElement("div");
    el.id = "rzpBar";
    el.innerHTML = `<button type="button" id="rzpToggle" aria-expanded="false">Prévisu · <b>${who().name}</b></button>
      <div id="rzpPanel" hidden>
        <p class="rzp-t">Prévisualisation : un serveur de test tourne dans ce navigateur. Rien n'est réel ni partagé, la production n'est jamais touchée.</p>
        <p class="rzp-h">Jouer en tant que</p>
        <div class="rzp-g">${PERSONAS.map((p) => `<button type="button" data-rzp-who="${p.id}" ${p.id === who().id ? 'aria-pressed="true"' : ""}>${p.name}<small>${p.role}</small></button>`).join("")}</div>
        <p class="rzp-h">Outils de test</p>
        <div class="rzp-g">
          <button type="button" data-rzp-tool="ess">+5 000 ◆<small>pour toi</small></button>
          <button type="button" data-rzp-tool="free">30 boosters gratuits<small>pour toi</small></button>
          <button type="button" data-rzp-tool="vet">Compte ancien<small>peut voter au Défilé, marché ouvert</small></button>
          <button type="button" data-rzp-tool="pop">Peupler le QG<small>5 joueurs, cartes, annonces</small></button>
          <button type="button" data-rzp-tool="reset" id="rzpReset">Tout remettre à zéro<small>efface la base de test</small></button>
        </div>
        <p class="rzp-t">Admin : ouvre les nouveautés dans Menu → Admin si besoin. Pour jouer à plusieurs, change de personne ici (une seule fenêtre à la fois).</p>
      </div>`;
    document.body.appendChild(el);
    el.addEventListener("click", (e) => {
      const t = e.target.closest("button"); if (!t) return;
      if (t.id === "rzpToggle") { const p = document.getElementById("rzpPanel"); p.hidden = !p.hidden; t.setAttribute("aria-expanded", !p.hidden); return; }
      if (t.dataset.rzpWho) { t.textContent = "…"; return switchTo(t.dataset.rzpWho); }
      if (t.dataset.rzpTool) { if (t.dataset.rzpTool !== "reset") t.textContent = "…"; return tool(t.dataset.rzpTool); }
    });
  }
  // les liens de connexion Discord ouvrent le choix de la personne
  document.addEventListener("click", (e) => { const a = e.target.closest('a[href^="/auth/"]'); if (!a) return; e.preventDefault(); e.stopPropagation(); const p = document.getElementById("rzpPanel"); if (p) p.hidden = false; }, true);
  const css = document.createElement("style");
  css.textContent = `#rzpBar{position:fixed;left:calc(12px + env(safe-area-inset-left,0px));bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:200;font:500 13px/1.3 system-ui,sans-serif;max-width:calc(100vw - 24px)}
  #rzpToggle{border:1px solid #f5c51888;background:#15141aee;color:#edeae4;border-radius:999px;padding:9px 14px;cursor:pointer;box-shadow:0 6px 18px #0008}
  #rzpToggle b{color:#f5c518}
  #rzpPanel{margin-top:8px;width:min(360px,calc(100vw - 24px));max-height:70vh;overflow:auto;background:#15141a;border:1px solid #2e2b36;border-radius:14px;padding:12px;color:#edeae4;box-shadow:0 12px 30px #000a;display:flex;flex-direction:column;gap:8px;position:absolute;bottom:44px;left:0}
  #rzpPanel[hidden]{display:none}
  .rzp-t{margin:0;color:#b7b2bd;font-size:12px}.rzp-h{margin:4px 0 0;font:600 11px/1 ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;color:#ff4d2e}
  .rzp-g{display:grid;grid-template-columns:1fr 1fr;gap:6px}
  .rzp-g button{display:flex;flex-direction:column;align-items:flex-start;gap:2px;text-align:left;background:#1e1c26;border:1px solid #2e2b36;color:#edeae4;border-radius:10px;padding:8px 10px;cursor:pointer;font:600 13px system-ui,sans-serif}
  .rzp-g button small{font-weight:400;color:#8a8590;font-size:11px}
  .rzp-g button[aria-pressed=true]{border-color:#f5c518}
  .rzp-g button:focus-visible,#rzpToggle:focus-visible{outline:2px solid #4dd6ff;outline-offset:2px}`;
  document.head.appendChild(css);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bar); else bar();
})();
