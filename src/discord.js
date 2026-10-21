// Version Cloudflare : remplace les capacités `db` et `user` de claude.ai par le serveur
// de l'app (connexion Discord + base D1). Même interface, pour que le jeu n'ait rien à changer.
(() => {
  if (window.claude?.use) return;
  const POLL = 6000;
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
  function poll(load, next, error) {
    let last = null, stopped = false, timer;
    const tick = async () => {
      if (stopped) return;
      try { const v = await load(); const key = JSON.stringify(v); if (key !== last) { last = key; next(v); } }
      catch (e) { if (e.code === "not_signed_in") { stopped = true; error?.(e); return; } }
      if (!stopped) timer = setTimeout(tick, document.hidden ? POLL * 3 : POLL);
    };
    tick();
    poll.refreshers.add(() => { clearTimeout(timer); tick(); });
    return () => { stopped = true; clearTimeout(timer); };
  }
  poll.refreshers = new Set();
  const refreshSoon = () => setTimeout(() => poll.refreshers.forEach((f) => f()), 50);

  function docRef(path) {
    const id = path.split("/").pop();
    const get = () => api("GET", "/api/doc?path=" + enc(path)).then(snapDoc);
    return {
      id, path, get,
      set: (data) => api("PUT", "/api/doc?path=" + enc(path), data).then(refreshSoon),
      update: (data) => api("PATCH", "/api/doc?path=" + enc(path), data).then(refreshSoon),
      delete: () => api("DELETE", "/api/doc?path=" + enc(path)).then(refreshSoon),
      acquire: (o) => api("POST", "/api/acquire", { path, holder: o.holder, ttlMs: o.ttlMs }),
      onSnapshot: (next, error) => poll(() => api("GET", "/api/doc?path=" + enc(path)), (d) => next(snapDoc(d)), error),
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
      onSnapshot: (next, error) => poll(() => api("GET", url()).then((r) => r.docs), (docs) => next(snapQuery(docs)), error),
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
