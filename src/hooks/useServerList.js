import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/* ---------- tiny stale-while-revalidate cache (module level) ---------- */
const FRESH_MS = 15_000; // within this: no refetch at all
const MAX_AGE_MS = 5 * 60_000; // within this: show instantly, refetch silently
const MAX_ENTRIES = 200;
const cache = new Map();

const cacheGet = (key) => {
  const hit = cache.get(key);
  if (!hit) return null;
  const age = Date.now() - hit.ts;
  if (age > MAX_AGE_MS) {
    cache.delete(key);
    return null;
  }
  return { value: hit.value, fresh: age < FRESH_MS };
};
const cacheSet = (key, value) => {
  cache.delete(key);
  cache.set(key, { value, ts: Date.now() });
  if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value);
};
/** Call on logout / tenant switch so one tenant never sees another's data. */
export const clearListCache = (prefix = "") => {
  for (const k of cache.keys()) if (k.startsWith(prefix)) cache.delete(k);
};

const isCancel = (e) =>
  e?.code === "ERR_CANCELED" || e?.name === "CanceledError" || e?.name === "AbortError";
const getErrorMessage = (e) =>
  e?.response?.data?.message || e?.message || "Something went wrong.";

const defaultParseList = (res) => {
  const b = res?.data;
  if (!b?.success || !Array.isArray(b?.transactions))
    throw new Error(b?.message || "Invalid response.");
  return b.transactions;
};
const defaultParseSummary = (res) => {
  const b = res?.data;
  if (!b?.success) throw new Error(b?.message || "Invalid response.");
  return b.data || null;
};

/**
 * Generic server-driven list: filters + debounced search + pagination,
 * request cancellation, SWR cache, next-page prefetch.
 *  rows === null     -> first load for this key (show skeleton)
 *  summary === null  -> first load of summary   (show card skeleton)
 */
export default function useServerList({
  namespace,
  fetchList,
  fetchSummary,
  buildParams,
  validate,
  parseList = defaultParseList,
  parseSummary = defaultParseSummary,
  initialFilters,
  pageSize = 50,
}) {
  const cfg = useRef({});
  cfg.current = { fetchList, fetchSummary, buildParams, validate, parseList, parseSummary };

  const [searchInput, setSearchInput] = useState(initialFilters.search || "");
  const [filters, setFilters] = useState(() => ({
    ...initialFilters,
    search: (initialFilters.search || "").trim(),
  }));
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState(null);
  const [summary, setSummary] = useState(null);
  const [listFetching, setListFetching] = useState(true);
  const [summaryFetching, setSummaryFetching] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  /* debounced search -> filters (and page reset in the SAME batch) */
  const searchRef = useRef((initialFilters.search || "").trim());
  useEffect(() => {
    const t = setTimeout(() => {
      const v = searchInput.trim();
      if (v === searchRef.current) return;
      searchRef.current = v;
      setFilters((f) => ({ ...f, search: v }));
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  /* changing any filter resets the page in the same render -> ONE request */
  const updateFilter = useCallback((patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }, []);

  const baseParams = useMemo(() => cfg.current.buildParams(filters), [filters]);
  const listParams = useMemo(
    () => ({ ...baseParams, page, limit: pageSize }),
    [baseParams, page, pageSize],
  );
  const validationError = useMemo(
    () => cfg.current.validate?.(filters) || "",
    [filters],
  );

  /* ---------------- LIST ---------------- */
  const listSeen = useRef(0);
  useEffect(() => {
    if (validationError) {
      setError(validationError);
      setRows([]);
      setListFetching(false);
      return undefined;
    }
    const forced = refreshKey !== listSeen.current;
    listSeen.current = refreshKey;

    const key = `${namespace}:list:${JSON.stringify(listParams)}`;
    const cached = cacheGet(key);
    setError("");
    if (cached) {
      setRows(cached.value);
      if (cached.fresh && !forced) {
        setListFetching(false);
        return undefined;
      }
    } else {
      setRows(null);
    }

    setListFetching(true);
    const ctrl = new AbortController();
    cfg.current
      .fetchList(listParams, { signal: ctrl.signal })
      .then((res) => {
        const list = cfg.current.parseList(res);
        cacheSet(key, list);
        setRows(list);
      })
      .catch((err) => {
        if (ctrl.signal.aborted || isCancel(err)) return;
        setRows([]);
        setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setListFetching(false);
      });
    return () => ctrl.abort();
  }, [namespace, listParams, validationError, refreshKey]);

  /* ---------------- SUMMARY (only when filters change, NOT on page change) ---------------- */
  const summarySeen = useRef(0);
  useEffect(() => {
    if (validationError || !cfg.current.fetchSummary) {
      setSummary(null);
      setSummaryFetching(false);
      return undefined;
    }
    const forced = refreshKey !== summarySeen.current;
    summarySeen.current = refreshKey;

    const key = `${namespace}:summary:${JSON.stringify(baseParams)}`;
    const cached = cacheGet(key);
    if (cached) {
      setSummary(cached.value);
      if (cached.fresh && !forced) {
        setSummaryFetching(false);
        return undefined;
      }
    }
    setSummaryFetching(true);
    const ctrl = new AbortController();
    cfg.current
      .fetchSummary(baseParams, { signal: ctrl.signal })
      .then((res) => {
        const data = cfg.current.parseSummary(res);
        cacheSet(key, data);
        setSummary(data);
      })
      .catch((err) => {
        if (ctrl.signal.aborted || isCancel(err)) return;
        setSummary(null);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setSummaryFetching(false);
      });
    return () => ctrl.abort();
  }, [namespace, baseParams, validationError, refreshKey]);

  /* ---------------- derived pagination ---------------- */
  const total = summary?.totals?.count ?? null;
  const totalPages = total === null ? null : Math.max(1, Math.ceil(total / pageSize));
  const hasNext = totalPages !== null ? page < totalPages : (rows?.length || 0) === pageSize;

  /* ---------------- prefetch next page (makes "Next" instant) ---------------- */
  useEffect(() => {
    if (!rows || listFetching || validationError || !hasNext) return undefined;
    const next = { ...listParams, page: page + 1 };
    const key = `${namespace}:list:${JSON.stringify(next)}`;
    if (cacheGet(key)) return undefined;
    const t = setTimeout(() => {
      cfg.current
        .fetchList(next, {})
        .then((res) => cacheSet(key, cfg.current.parseList(res)))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [rows, listFetching, validationError, hasNext, listParams, page, namespace]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return {
    filters, updateFilter, searchInput, setSearchInput,
    page, setPage, pageSize,
    rows, summary, total, totalPages, hasNext,
    listFetching, summaryFetching, error, refresh,
  };
}