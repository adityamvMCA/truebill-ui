/* Shared stale-while-revalidate cache for list/report hooks (module level). */
const FRESH_MS = 15_000; // within this: no refetch at all
const MAX_AGE_MS = 5 * 60_000; // within this: show instantly, refetch silently
const MAX_ENTRIES = 200;
const cache = new Map();

export const cacheGet = (key) => {
  const hit = cache.get(key);
  if (!hit) return null;
  const age = Date.now() - hit.ts;
  if (age > MAX_AGE_MS) {
    cache.delete(key);
    return null;
  }
  return { value: hit.value, fresh: age < FRESH_MS };
};

export const cacheSet = (key, value) => {
  cache.delete(key);
  cache.set(key, { value, ts: Date.now() });
  if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value);
};

/** Call on logout / tenant switch so one tenant never sees another's data. */
export const clearListCache = (prefix = "") => {
  for (const k of cache.keys()) if (k.startsWith(prefix)) cache.delete(k);
};

export const isCancel = (e) =>
  e?.code === "ERR_CANCELED" || e?.name === "CanceledError" || e?.name === "AbortError";

export const getErrorMessage = (e) =>
  e?.response?.data?.message || e?.message || "Something went wrong.";