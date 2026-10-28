/* Caja Familiar — almacenamiento local en IndexedDB (los datos nunca salen del teléfono). */
(function (g) {
  "use strict";
  const NAME = "caja-familiar", VERSION = 1;
  const STORES = ["config", "items", "planes", "movs", "cuentas", "deudas", "metas"];
  let dbp = null;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise((res, rej) => {
      const rq = indexedDB.open(NAME, VERSION);
      rq.onupgradeneeded = () => { const db = rq.result; for (const s of STORES) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: "id" }); };
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => rej(rq.error);
      rq.onblocked = () => rej(new Error("La base de datos está bloqueada por otra pestaña abierta."));
    });
    return dbp;
  }
  function tx(stores, mode, fn) {
    return open().then(db => new Promise((res, rej) => {
      const t = db.transaction(stores, mode); let out;
      t.oncomplete = () => res(out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error || new Error("abortada"));
      out = fn(t);
    }));
  }
  const clone = o => JSON.parse(JSON.stringify(o));
  const Store = {
    STORES,
    async loadAll() {
      const out = {};
      await tx(STORES, "readonly", t => { for (const s of STORES) { const r = t.objectStore(s).getAll(); r.onsuccess = () => { out[s] = r.result; }; } });
      return out;
    },
    put(store, obj) { const o = clone(obj); return tx([store], "readwrite", t => { t.objectStore(store).put(o); }).then(() => o); },
    del(store, id) { return tx([store], "readwrite", t => { t.objectStore(store).delete(id); }); },
    /** Varias escrituras en una sola transacción: todo o nada. ops = [[store, obj]|[store, id, "del"]] */
    batch(ops) {
      const stores = [...new Set(ops.map(o => o[0]))];
      return tx(stores, "readwrite", t => { for (const [s, v, del] of ops) del ? t.objectStore(s).delete(v) : t.objectStore(s).put(clone(v)); });
    },
    /** Reemplaza TODO el contenido (restaurar respaldo), en una transacción. */
    replaceAll(data) {
      return tx(STORES, "readwrite", t => {
        for (const s of STORES) t.objectStore(s).clear();
        if (data.config) t.objectStore("config").put({ ...clone(data.config), id: "main" });
        for (const [s, k] of [["items", "items"], ["planes", "planes"], ["movs", "movs"], ["cuentas", "cuentas"], ["deudas", "deudas"], ["metas", "metas"]])
          for (const o of data[k] || []) t.objectStore(s).put(clone(o));
      });
    },
    async persist() { try { if (navigator.storage && navigator.storage.persist) { if (await navigator.storage.persisted()) return true; return await navigator.storage.persist(); } } catch (e) {} return false; },
  };
  g.Store = Store;
})(this);
