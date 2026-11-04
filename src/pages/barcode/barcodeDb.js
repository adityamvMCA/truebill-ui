// Tiny IndexedDB wrapper: catalogue cache + durable pending-scan queue. No dependencies.
const DB_NAME = "erp-barcode";
let dbPromise;

const open = () =>
  dbPromise ||
  (dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      db.createObjectStore("catalog", { keyPath: "k" });
      db.createObjectStore("pending", { keyPath: "scanId" }).createIndex("bySession", "sessionId");
      db.createObjectStore("meta", { keyPath: "key" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));

const run = async (store, mode, fn) => {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    let out;
    Promise.resolve(fn(tx.objectStore(store))).then((v) => (out = v), reject);
    tx.oncomplete = () => resolve(out);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
};
const wrap = (req) => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });

/** Tenant isolation on shared devices. ADAPT to however you store the logged-in tenant. */
export const getTenantKey = () => {
  try {
    const token = localStorage.getItem("token") || localStorage.getItem("accessToken");
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return String(payload.tenantId || payload.tid || "default");
  } catch { return "default"; }
};

export const catalogPutMany = (rows) =>
  run("catalog", "readwrite", (s) => { rows.forEach((r) => s.put(r)); });
export const catalogGet = (key) => run("catalog", "readonly", (s) => wrap(s.get(key)));
export const catalogCount = () => run("catalog", "readonly", (s) => wrap(s.count()));
export const catalogClear = () => run("catalog", "readwrite", (s) => { s.clear(); });

export const metaGet = async (key) => (await run("meta", "readonly", (s) => wrap(s.get(key))))?.value;
export const metaSet = (key, value) => run("meta", "readwrite", (s) => { s.put({ key, value }); });

export const pendingAdd = (scan) => run("pending", "readwrite", (s) => { s.put(scan); });
export const pendingDelete = (scanId) => run("pending", "readwrite", (s) => { s.delete(scanId); });
export const pendingList = async (sessionId) => {
  const all = await run("pending", "readonly", (s) => wrap(s.index("bySession").getAll(sessionId)));
  return all.sort((a, b) => a.createdAt - b.createdAt);
};
export const pendingCount = async (sessionId) =>
  run("pending", "readonly", (s) => wrap(s.index("bySession").count(sessionId)));
