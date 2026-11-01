import { useCallback, useEffect, useRef, useState } from "react";
import { cacheGet, cacheSet, isCancel, getErrorMessage } from "../utils/swrCache";

/**
 * One-request report loader (Trial Balance, Balance Sheet, ...):
 * SWR cache, request cancellation, forced refresh.
 *   data === null && !error  -> first load (show skeleton)
 *   data !== null && fetching -> stale data being refreshed in the background
 */
export default function useReport({ namespace, fetchData, params, parse, enabled = true }) {
  const cfg = useRef({});
  cfg.current = { fetchData, parse };

  const [data, setData] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const seen = useRef(0);

  const paramsKey = JSON.stringify(params);

  useEffect(() => {
    if (!enabled) {
      setFetching(false);
      return undefined;
    }
    const forced = refreshKey !== seen.current;
    seen.current = refreshKey;

    const key = `${namespace}:report:${paramsKey}`;
    const cached = cacheGet(key);
    setError("");
    if (cached) {
      setData(cached.value);
      if (cached.fresh && !forced) {
        setFetching(false);
        return undefined;
      }
    } else {
      setData(null);
    }

    setFetching(true);
    const ctrl = new AbortController();
    cfg.current
      .fetchData(JSON.parse(paramsKey), { signal: ctrl.signal })
      .then((res) => {
        const value = cfg.current.parse(res);
        cacheSet(key, value);
        setData(value);
      })
      .catch((err) => {
        if (ctrl.signal.aborted || isCancel(err)) return;
        setData(null);
        setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setFetching(false);
      });
    return () => ctrl.abort();
  }, [namespace, paramsKey, enabled, refreshKey]);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return { data, fetching, error, refresh };
}