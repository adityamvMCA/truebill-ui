
export const RATE_LIMIT_EVENT = "app:rate-limited";

const DEFAULT_WAIT_SECONDS = 30;
const MIN_WAIT_SECONDS = 3;
const MAX_WAIT_SECONDS = 15 * 60;

// Difference between backend clock and device clock.
let serverClockOffsetMs = 0;
let hasServerClockSync = false;

const readHeader = (headers, name) => {
  if (!headers) return undefined;

  if (typeof headers.get === "function") {
    return headers.get(name) ?? undefined;
  }

  return (
    headers[name] ??
    headers[name.toLowerCase()]
  );
};

/**
 * Synchronize frontend clock with backend Date header.
 */
export const syncServerClock = (headers) => {
  const serverDate = readHeader(headers, "date");

  if (!serverDate) return false;

  const serverTimestamp = Date.parse(serverDate);

  if (!Number.isFinite(serverTimestamp)) return false;

  serverClockOffsetMs = serverTimestamp - Date.now();
  hasServerClockSync = true;

  return true;
};

/**
 * Get backend-synchronized current time.
 */
export const getServerNow = () => {
  return Date.now() + serverClockOffsetMs;
};

export const isServerClockSynced = () => hasServerClockSync;

const clamp = (seconds) =>
  Math.min(
    MAX_WAIT_SECONDS,
    Math.max(MIN_WAIT_SECONDS, Math.ceil(seconds)),
  );

/**
 * Get waiting time from backend rate-limit headers.
 */
export const getRetryAfterSeconds = (headers) => {
  const retryAfter = readHeader(headers, "retry-after");

  if (
    retryAfter !== undefined &&
    retryAfter !== null &&
    retryAfter !== ""
  ) {
    const asNumber = Number(retryAfter);

    if (Number.isFinite(asNumber)) {
      return clamp(asNumber);
    }

    const asDate = Date.parse(retryAfter);

    if (Number.isFinite(asDate)) {
      return clamp((asDate - getServerNow()) / 1000);
    }
  }

  const reset =
    readHeader(headers, "ratelimit-reset") ??
    readHeader(headers, "x-ratelimit-reset");

  if (
    reset !== undefined &&
    reset !== null &&
    reset !== ""
  ) {
    const value = Number(reset);

    if (Number.isFinite(value)) {
      // Unix timestamp or seconds from now.
      return clamp(
        value > 1e9
          ? value - getServerNow() / 1000
          : value,
      );
    }
  }

  return DEFAULT_WAIT_SECONDS;
};

/**
 * Notify application about rate limiting.
 */
export const notifyRateLimited = (
  seconds = DEFAULT_WAIT_SECONDS,
) => {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(RATE_LIMIT_EVENT, {
      detail: {
        seconds: clamp(seconds),
        serverTime: getServerNow(),
        synced: hasServerClockSync,
      },
    }),
  );
};

/**
 * Setup Axios response interceptor.
 */
export const setupRateLimitInterceptor = (instance) => {
  if (!instance?.interceptors?.response) {
    return () => {};
  }

  const id = instance.interceptors.response.use(
    (response) => {
      // Keep backend clock synchronized on successful responses too.
      syncServerClock(response.headers);

      return response;
    },

    (error) => {
      const headers = error?.response?.headers;

      // Synchronize before calculating Retry-After.
      syncServerClock(headers);

      if (error?.response?.status === 429) {
        error.isRateLimited = true;

        error.message =
          "Too many requests. Please wait a moment and try again.";

        notifyRateLimited(
          getRetryAfterSeconds(headers),
        );
      }

      return Promise.reject(error);
    },
  );

  return () => {
    instance.interceptors.response.eject(id);
  };
};
