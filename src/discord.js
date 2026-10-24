// Version Cloudflare : remplace les capacités `db` et `user` de claude.ai par le serveur
// de l'app (connexion Discord + base D1). Même interface, pour que le jeu n'ait rien à changer.
(() => {
  if (window.claude?.use) return;
  const POLL = 20000;
  // économie d'appels : onglet caché ou personne n'a touché la page depuis 10 min → on ne vérifie plus que toutes les 5 min
  let lastAct = Date.now();
  const asleep = () => document.hidden || Date.now() - lastAct > 10 * 60e3;
  window.__asleep = asleep;
  for (const ev of ["pointerdown", "keydown", "wheel", "touchstart"]) addEventListener(ev, () => { const was = asleep(); lastAct = Date.now(); if (was) dispatchEvent(new Event("rz-wake")); }, { passive: true, capture: true });
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { lastAct = Date.now(); dispatchEvent(new Event("rz-wake")); } });
  let mePromise = null;
  const me = () => (mePromise ||= fetch("/api/me", { credentials: "same-origin" }).then((r) => (r.ok ? r.json() : null)).catch(() => null));
  const api = async (method, url, body) => {
    const r = await fetch(url, { method, credentials: "same-origin", headers: body ? { "content-type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
    const out = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(out.message || "Erreur serveur"); e.code = out.code || "unavailable"; throw e; }
    return out;
  };
  const enc = encodeURIComponent;
  const snapDoc = (d) => ({ id: d.id, exists: !!d.exists, data: () => (d.exists ? d.data : undefined), metadata: { fromCache: false, hasPendingWrites: false } });
  const snapQuery = (docs) => ({ docs: docs.map(snapDoc), size: docs.length, empty: !docs.length, docChanges: () => [], metadata: { fromCache: false, hasPendingWrites: false } });
  // Synchro (étape 2) : un seul appel régulier, /api/sync, renvoie les compteurs de version de chaque section
  // (market, players, feed…). On ne recharge que les abonnements dont la section a changé, plus une resynchro
  // complète de secours toutes les minutes. Si /api/sync ne répond pas, chaque abonnement se recharge comme avant.
  const FULL = 10 * 60000, subs = new Set();
  let timer = null, running = false, syncOk = true;
  const sectionOf = (path) => String(path || "").split("/")[0];
  async function reload(sub, rev) {
    sub.rev = rev; sub.at = Date.now();
    try { const v = await sub.load(); const key = JSON.stringify(v); if (key !== sub.last) { sub.last = key; sub.next(v); } }
    catch (e) { if (e.code === "not_signed_in") { sub.stop(); sub.error?.(e); } else sub.rev = undefined; }
  }
  async function tick(force) {
    clearTimeout(timer); timer = null;
    if (running || !subs.size) { schedule(); return; }
    running = true;
    let revs = null;
    if (syncOk) { try { revs = (await api("GET", "/api/sync")).revs; } catch (e) { if (e.code !== "not_signed_in") { syncOk = false; setTimeout(() => (syncOk = true), 5 * 60000); } } }
    const now = Date.now();
    await Promise.all([...subs].map((sub) => {
      const rev = revs ? revs[sub.section] || 0 : undefined;
      if (force || !revs || sub.rev === undefined || sub.rev !== rev || now - sub.at > FULL) return reload(sub, rev);
    }));
    running = false;
    schedule();
  }
  function schedule() { if (!timer && subs.size) timer = setTimeout(tick, asleep() ? 5 * 60e3 : POLL); }
  addEventListener("rz-wake", () => tick());
  function poll(load, next, error, path) {
    const sub = { load, next, error, section: sectionOf(path), last: null, rev: undefined, at: 0, stop: () => subs.delete(sub) };
    subs.add(sub);
    reload(sub, undefined).then(schedule);
    return sub.stop;
  }
  const refreshSoon = () => setTimeout(() => tick(true), 50);

  function docRef(path) {
    const id = path.split("/").pop();
    const get = () => api("GET", "/api/doc?path=" + enc(path)).then(snapDoc);
    return {
      id, path, get,
      set: (data) => api("PUT", "/api/doc?path=" + enc(path), data).then(refreshSoon),
      update: (data) => api("PATCH", "/api/doc?path=" + enc(path), data).then(refreshSoon),
      delete: () => api("DELETE", "/api/doc?path=" + enc(path)).then(refreshSoon),
      acquire: (o) => api("POST", "/api/acquire", { path, holder: o.holder, ttlMs: o.ttlMs }),
      onSnapshot: (next, error) => poll(() => api("GET", "/api/doc?path=" + enc(path)), (d) => next(snapDoc(d)), error, path),
      collection: (sub) => collRef(path + "/" + sub),
    };
  }
  function query(path, opts) {
    const url = () => `/api/coll?path=${enc(path)}${opts.orderBy ? `&orderBy=${enc(opts.orderBy)}&dir=${opts.dir}` : ""}${opts.limit ? `&limit=${opts.limit}` : ""}`;
    return {
      orderBy: (f, dir = "asc") => query(path, { ...opts, orderBy: f, dir }),
      limit: (n) => query(path, { ...opts, limit: n }),
      where: () => query(path, opts),
      get: () => api("GET", url()).then((r) => snapQuery(r.docs)),
      onSnapshot: (next, error) => poll(() => api("GET", url()).then((r) => r.docs), (docs) => next(snapQuery(docs)), error, path),
    };
  }
  function collRef(path) {
    return {
      ...query(path, {}), path,
      doc: (id) => docRef(path + "/" + (id || crypto.randomUUID().replace(/-/g, "").slice(0, 20))),
      add: (data) => api("POST", "/api/coll?path=" + enc(path), data).then((r) => { refreshSoon(); return docRef(path + "/" + r.id); }),
    };
  }
  const db = { doc: docRef, collection: collRef };

  const profileCache = {};
  const user = {
    id: async () => (await me())?.id ?? null,
    isOwner: async () => !!(await me())?.admin,
    canEdit: async () => !!(await me())?.admin,
    can: async () => { const m = await me(); return m ? m.member || m.admin : false; },
    me: async () => { const m = await me(); return { id: m?.id ?? null, name: m?.name || "", avatarUrl: m?.avatar || "", color: "#0ac8b9", email: null, isOwner: !!m?.admin, canEdit: !!m?.admin }; },
    async profiles(ids) {
      ids = [...new Set([].concat(ids))];
      const missing = ids.filter((i) => !profileCache[i]);
      if (missing.length) {
        const got = await api("GET", "/api/profiles?ids=" + missing.map(enc).join(",")).catch(() => ({}));
        for (const i of missing) profileCache[i] = got[i] || { name: "", avatar: "https://cdn.discordapp.com/embed/avatars/0.png" };
      }
      const myId = (await me())?.id;
      return Object.fromEntries(ids.map((i) => [i, { id: i, name: profileCache[i].name, avatarUrl: profileCache[i].avatar, color: "#0ac8b9", email: null, isMe: i === myId, guest: false }]));
    },
  };

  window.DISCORD_LOGIN = true;
  window.discordMe = me;
  window.claude = { use: async (name) => ((await me()) ? (name === "db" ? db : name === "user" ? user : null) : null) };
})();
