import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const SEARCH_DEBOUNCE_MS = 350;

const getErrorMessage = (error) => {
  const data = error?.response?.data;
  if (Array.isArray(data?.errors) && data.errors.length) {
    return data.errors
      .map((e) => (typeof e === "string" ? e : e?.message || e?.msg || "Validation failed"))
      .join(", ");
  }
  return data?.message || error?.message || "Unable to load data.";
};

const isCanceled = (error) =>
  error?.code === "ERR_CANCELED" || error?.name === "CanceledError";

/**
 * Same return shape as useServerList, but reads the outstanding API directly:
 *   list    -> { success, data: [...], pagination: { total, totalPages } }
 *   summary -> { success, data: { ...totals } }
 */
export default function useOutstandingList({
  fetchList,
  fetchSummary,
  buildParams,
  validate,
  initialFilters,
  pageSize = 50,
}) {
  const [filters, setFilters] = useState(initialFilters);
  const [searchInput, setSearchInput] = useState(initialFilters?.search || "");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const [rows, setRows] = useState(null);
  const [total, setTotal] = useState(null);
  const [summary, setSummary] = useState(null);
  const [listFetching, setListFetching] = useState(true);
  const [summaryFetching, setSummaryFetching] = useState(Boolean(fetchSummary));
  const [error, setError] = useState("");

  const fns = useRef({ fetchList, fetchSummary, buildParams });
  fns.current = { fetchList, fetchSummary, buildParams };

  // Debounce the search box into filters.search
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = searchInput.trim();
      setFilters((f) => (f.search === next ? f : { ...f, search: next }));
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const updateFilter = useCallback((patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }, []);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const validationError = validate ? validate(filters) : "";
  const paramsKey = useMemo(
    () => JSON.stringify(buildParams(filters)),
    [buildParams, filters],
  );

  /* ---------- list: one page per request ---------- */
  useEffect(() => {
    if (validationError) {
      setError(validationError);
      setRows([]);
      setListFetching(false);
      return undefined;
    }

    const controller = new AbortController();
    setListFetching(true);
    setError("");

    fns.current
      .fetchList(
        { ...JSON.parse(paramsKey), page, limit: pageSize },
        { signal: controller.signal },
      )
      .then((res) => {
        const body = res?.data ?? res;
        const list = Array.isArray(body?.data)
          ? body.data
          : Array.isArray(body?.rows)
            ? body.rows
            : Array.isArray(body?.items)
              ? body.items
              : null;

        if (!list) throw new Error(body?.message || "Unexpected response from the server.");

        const count = Number(body?.pagination?.total ?? body?.total);
        setRows(list);
        setTotal(Number.isFinite(count) ? count : list.length);
        setListFetching(false);
      })
      .catch((err) => {
        if (controller.signal.aborted || isCanceled(err)) return;
        setRows([]);
        setTotal(0);
        setError(getErrorMessage(err));
        setListFetching(false);
      });

    return () => controller.abort();
  }, [paramsKey, page, refreshKey, validationError, pageSize]);

  /* ---------- summary: separate request, does not depend on page ---------- */
  useEffect(() => {
    if (!fns.current.fetchSummary || validationError) {
      setSummaryFetching(false);
      return undefined;
    }

    const controller = new AbortController();
    setSummaryFetching(true);

    fns.current
      .fetchSummary(JSON.parse(paramsKey), { signal: controller.signal })
      .then((res) => {
        setSummary(res?.data ?? res ?? null);
        setSummaryFetching(false);
      })
      .catch((err) => {
        if (controller.signal.aborted || isCanceled(err)) return;
        setSummaryFetching(false);
      });

    return () => controller.abort();
  }, [paramsKey, refreshKey, validationError]);

  const totalPages = total === null ? 0 : Math.max(1, Math.ceil(total / pageSize));

  return {
    filters: { ...filters, search: filters.search || "" },
    updateFilter,
    searchInput,
    setSearchInput,
    page,
    setPage,
    rows,
    summary,
    total,
    totalPages,
    hasNext: page < totalPages,
    listFetching,
    summaryFetching,
    error,
    refresh,
  };
}