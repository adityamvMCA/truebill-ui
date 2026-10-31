import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, X } from "lucide-react";

import "./EntitySearchPicker.css";

const EMPTY_IDS = [];
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_DEBOUNCE_MS = 350;

function EntitySearchPicker({
  label,
  placeholder = "Search...",
  fetchOptions,
  getOptionId,
  getOptionLabel,
  getOptionSubtitle,
  selectedIds = EMPTY_IDS,
  selectedLabel = "",
  onToggle,
  multiple = true,
  disabled = false,
  minQueryLength = 0,
  pageSize = DEFAULT_PAGE_SIZE,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  emptyMessage = "No matches found.",
}) {
  const componentId = useId();
  const panelId = `${componentId}-panel`;
  const inputId = `${componentId}-input`;

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [options, setOptions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [panelPosition, setPanelPosition] = useState(null);

  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const fetchRef = useRef(fetchOptions);
  const requestRef = useRef(0);
  const abortRef = useRef(null);

  const safePageSize = Number.isFinite(Number(pageSize))
    ? Math.max(1, Math.floor(Number(pageSize)))
    : DEFAULT_PAGE_SIZE;

  const safeDebounceMs = Number.isFinite(Number(debounceMs))
    ? Math.max(0, Number(debounceMs))
    : DEFAULT_DEBOUNCE_MS;

  const safeMinQueryLength = Math.max(
    0,
    Number(minQueryLength) || 0,
  );

  const normalizedIds = Array.isArray(selectedIds)
    ? selectedIds
        .filter((id) => id !== null && id !== undefined)
        .map(String)
    : [];

  const selectedSet = new Set(normalizedIds);
  const query = search.trim();

  const totalPages = Math.max(
    1,
    Math.ceil(total / safePageSize),
  );

  useLayoutEffect(() => {
    fetchRef.current = fetchOptions;
  }, [fetchOptions]);

  const invalidateRequest = useCallback(() => {
    requestRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const closePanel = useCallback(
    (restoreFocus = false) => {
      invalidateRequest();

      setOpen(false);
      setLoading(false);

      if (restoreFocus) {
        triggerRef.current?.focus({
          preventScroll: true,
        });
      }
    },
    [invalidateRequest],
  );

  /* -------------------------------------------------------------- */
  /* Position the portal inside the visible viewport                 */
  /* -------------------------------------------------------------- */

  const measurePosition = useCallback(() => {
    const trigger = triggerRef.current;

    if (!trigger) return null;

    const rect = trigger.getBoundingClientRect();
    const viewport = window.visualViewport;

    const viewportLeft = viewport?.offsetLeft ?? 0;
    const viewportTop = viewport?.offsetTop ?? 0;

    const viewportWidth =
      viewport?.width ?? window.innerWidth;

    const viewportHeight =
      viewport?.height ?? window.innerHeight;

    const viewportRight = viewportLeft + viewportWidth;
    const viewportBottom = viewportTop + viewportHeight;

    const margin = 10;
    const gap = 6;

    const mobile = window.matchMedia(
      "(max-width: 600px)",
    ).matches;

    const availableWidth = Math.max(
      0,
      viewportWidth - margin * 2,
    );

    const availableHeight = Math.max(
      0,
      viewportHeight - margin * 2,
    );

    const width = mobile
      ? availableWidth
      : Math.min(
          Math.max(rect.width, 340),
          availableWidth,
        );

    const left = mobile
      ? viewportLeft + margin
      : Math.max(
          viewportLeft + margin,
          Math.min(
            rect.left,
            viewportRight - width - margin,
          ),
        );

    const spaceBelow = Math.max(
      0,
      viewportBottom - rect.bottom - gap - margin,
    );

    const spaceAbove = Math.max(
      0,
      rect.top - viewportTop - gap - margin,
    );

    const preferredHeight = Math.min(420, availableHeight);

    let height;
    let top;

    if (mobile) {
      height = preferredHeight;

      top = Math.max(
        viewportTop + margin,
        Math.min(
          rect.bottom + gap,
          viewportBottom - height - margin,
        ),
      );
    } else {
      const openAbove =
        spaceBelow < 280 && spaceAbove > spaceBelow;

      const anchorSpace = openAbove
        ? spaceAbove
        : spaceBelow;

      // If the trigger is partly offscreen or space around it is
      // very limited, keep the panel visible inside the viewport.
      height =
        anchorSpace >= 160
          ? Math.min(preferredHeight, anchorSpace)
          : preferredHeight;

      const proposedTop = openAbove
        ? rect.top - gap - height
        : rect.bottom + gap;

      top = Math.max(
        viewportTop + margin,
        Math.min(
          proposedTop,
          viewportBottom - height - margin,
        ),
      );
    }

    return {
      position: "fixed",
      top,
      left,
      width,
      height,
      maxHeight: height,
    };
  }, []);

  useLayoutEffect(() => {
    if (!open || disabled) return undefined;

    let frameId = null;

    const updatePosition = () => {
      const position = measurePosition();

      if (position) {
        setPanelPosition(position);
      }
    };

    const schedulePosition = () => {
      if (frameId !== null) return;

      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        updatePosition();
      });
    };

    const handleScroll = (event) => {
      if (panelRef.current?.contains(event.target)) {
        return;
      }

      schedulePosition();
    };

    updatePosition();

    window.addEventListener("resize", schedulePosition);
    window.addEventListener("scroll", handleScroll, true);

    const viewport = window.visualViewport;

    viewport?.addEventListener(
      "resize",
      schedulePosition,
    );

    viewport?.addEventListener(
      "scroll",
      schedulePosition,
    );

    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(schedulePosition)
        : null;

    if (triggerRef.current) {
      observer?.observe(triggerRef.current);
    }

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      window.removeEventListener(
        "resize",
        schedulePosition,
      );

      window.removeEventListener(
        "scroll",
        handleScroll,
        true,
      );

      viewport?.removeEventListener(
        "resize",
        schedulePosition,
      );

      viewport?.removeEventListener(
        "scroll",
        schedulePosition,
      );

      observer?.disconnect();
    };
  }, [open, disabled, measurePosition]);

  /* -------------------------------------------------------------- */
  /* Focus only after the portal has mounted                         */
  /* -------------------------------------------------------------- */

  useEffect(() => {
    if (!open || disabled) return undefined;

    const frameId = window.requestAnimationFrame(() => {
      inputRef.current?.focus({
        preventScroll: true,
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [open, disabled]);

  /* -------------------------------------------------------------- */
  /* Outside pointer and Escape                                      */
  /* No document focusin listener: it can close a mounting portal.    */
  /* -------------------------------------------------------------- */

  useEffect(() => {
    if (!open || disabled) return undefined;

    const isInside = (event) => {
      const path = event.composedPath?.() || [];

      return (
        path.includes(rootRef.current) ||
        path.includes(panelRef.current) ||
        rootRef.current?.contains(event.target) ||
        panelRef.current?.contains(event.target)
      );
    };

    const handlePointerDown = (event) => {
      if (!isInside(event)) {
        closePanel();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePanel(true);
      }
    };

    document.addEventListener(
      "pointerdown",
      handlePointerDown,
      true,
    );

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown,
        true,
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [open, disabled, closePanel]);

  useEffect(() => {
    if (disabled) closePanel();
  }, [disabled, closePanel]);

  /* -------------------------------------------------------------- */
  /* Server-side search                                              */
  /* -------------------------------------------------------------- */

  useEffect(() => {
    if (!open || disabled) return undefined;

    const requestId = ++requestRef.current;
    const controller = new AbortController();

    abortRef.current = controller;

    let active = true;

    setOptions([]);
    setError("");

    if (query.length < safeMinQueryLength) {
      setTotal(0);
      setLoading(false);

      return () => {
        active = false;
        controller.abort();

        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      };
    }

    setLoading(true);

    const timer = window.setTimeout(async () => {
      try {
        if (typeof fetchRef.current !== "function") {
          throw new Error(
            "EntitySearchPicker requires a fetchOptions function.",
          );
        }

        const result = await fetchRef.current({
          search: query,
          page,
          limit: safePageSize,
          signal: controller.signal,
        });

        if (
          !active ||
          controller.signal.aborted ||
          requestId !== requestRef.current
        ) {
          return;
        }

        if (!Array.isArray(result?.data)) {
          throw new Error(
            "fetchOptions must return { data: [...], total: number }.",
          );
        }

        const records = result.data;
        const resultTotal = Number(result.total);

        const nextTotal = Number.isFinite(resultTotal)
          ? Math.max(0, resultTotal)
          : records.length;

        const lastPage = Math.max(
          1,
          Math.ceil(nextTotal / safePageSize),
        );

        setTotal(nextTotal);

        if (page > lastPage) {
          setPage(lastPage);
          return;
        }

        setOptions(records);

        if (listRef.current) {
          listRef.current.scrollTop = 0;
        }
      } catch (requestError) {
        if (
          !active ||
          controller.signal.aborted ||
          requestId !== requestRef.current
        ) {
          return;
        }

        setOptions([]);
        setTotal(0);

        setError(
          requestError?.response?.data?.message ||
            requestError?.message ||
            "Unable to load results. Please try again.",
        );
      } finally {
        if (
          active &&
          !controller.signal.aborted &&
          requestId === requestRef.current
        ) {
          setLoading(false);
        }

        if (abortRef.current === controller) {
          abortRef.current = null;
        }
      }
    }, safeDebounceMs);

    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.abort();

      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    };
  }, [
    open,
    disabled,
    query,
    page,
    safePageSize,
    safeDebounceMs,
    safeMinQueryLength,
    retryKey,
  ]);

  /* -------------------------------------------------------------- */
  /* Actions                                                         */
  /* -------------------------------------------------------------- */

  const handleOpen = () => {
    if (disabled) return;

    if (open) {
      closePanel();
      return;
    }

    invalidateRequest();

    // Calculate immediately so the portal exists on the first
    // open render, before we try focusing its search input.
    setPanelPosition(measurePosition());

    setSearch("");
    setPage(1);
    setOptions([]);
    setTotal(0);
    setError("");
    setLoading(true);
    setOpen(true);
  };

  const handleSearch = (event) => {
    const nextSearch = event.target.value;
    const nextQuery = nextSearch.trim();

    if (nextSearch === search) return;

    if (nextQuery === query) {
      setSearch(nextSearch);
      return;
    }

    invalidateRequest();

    setSearch(nextSearch);
    setPage(1);
    setOptions([]);
    setTotal(0);
    setError("");
    setLoading(nextQuery.length >= safeMinQueryLength);
  };

  const handlePageChange = (nextPage) => {
    if (
      loading ||
      nextPage === page ||
      nextPage < 1 ||
      nextPage > totalPages
    ) {
      return;
    }

    invalidateRequest();

    setPage(nextPage);
    setOptions([]);
    setError("");
    setLoading(true);
  };

  const handleRetry = () => {
    invalidateRequest();
    setError("");
    setLoading(true);
    setRetryKey((value) => value + 1);
  };

  const handleSelect = (option) => {
    if (disabled) return;

    const rawId = getOptionId(option);

    if (rawId === null || rawId === undefined) return;

    onToggle?.(String(rawId), option);

    if (!multiple) {
      closePanel(true);
    }
  };

  const handleClear = () => {
    if (disabled) return;

    onToggle?.(null, null);
    closePanel(true);
  };

  const selectedText =
    !multiple && selectedLabel
      ? selectedLabel
      : normalizedIds.length
        ? `${normalizedIds.length} selected`
        : placeholder;

  const menu =
    open && !disabled && panelPosition ? (
      <div
        id={panelId}
        ref={panelRef}
        className="esp-panel esp-panel--portal"
        style={panelPosition}
        role="region"
        aria-label={label || placeholder}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="esp-search">
          <Search size={16} aria-hidden="true" />

          <input
            ref={inputRef}
            id={inputId}
            type="search"
            value={search}
            placeholder={placeholder}
            aria-label={label || placeholder}
            autoComplete="off"
            onChange={handleSearch}
          />

          <button
            type="button"
            className="esp-panel-close"
            aria-label="Close search"
            onClick={() => closePanel(true)}
          >
            <X size={18} />
          </button>
        </div>

        <div
          ref={listRef}
          className="esp-list"
          aria-busy={loading}
        >
          {loading && (
            <div className="esp-empty" role="status">
              Searching...
            </div>
          )}

          {!loading && error && (
            <div className="esp-error" role="alert">
              <span>{error}</span>

              <button
                type="button"
                onClick={handleRetry}
              >
                Retry
              </button>
            </div>
          )}

          {!loading &&
            !error &&
            query.length < safeMinQueryLength && (
              <div className="esp-empty">
                Enter at least {safeMinQueryLength} characters.
              </div>
            )}

          {!loading &&
            !error &&
            query.length >= safeMinQueryLength &&
            options.length === 0 && (
              <div className="esp-empty">
                {emptyMessage}
              </div>
            )}

          {!loading &&
            !error &&
            options.map((option) => {
              const rawId = getOptionId(option);

              if (
                rawId === null ||
                rawId === undefined
              ) {
                return null;
              }

              const id = String(rawId);
              const selected = selectedSet.has(id);

              return (
                <button
                  key={id}
                  type="button"
                  className={`esp-option ${
                    selected ? "is-selected" : ""
                  }`}
                  aria-pressed={selected}
                  onClick={() => handleSelect(option)}
                >
                  <span className="esp-option-copy">
                    <span className="esp-option-main">
                      {getOptionLabel(option)}
                    </span>

                    {getOptionSubtitle && (
                      <span className="esp-option-sub">
                        {getOptionSubtitle(option)}
                      </span>
                    )}
                  </span>

                  {selected && (
                    <Check
                      size={17}
                      className="esp-check"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
        </div>

        {query.length >= safeMinQueryLength && !error && (
          <div className="esp-pagination">
            <button
              type="button"
              disabled={loading || page <= 1}
              onClick={() => handlePageChange(page - 1)}
            >
              Prev
            </button>

            <span aria-live="polite">
              {loading ? (
                "Loading..."
              ) : (
                <>
                  Page {page} of {totalPages}
                  <small>
                    {total.toLocaleString()} results
                  </small>
                </>
              )}
            </span>

            <button
              type="button"
              disabled={loading || page >= totalPages}
              onClick={() => handlePageChange(page + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    ) : null;

  return (
    <div className="esp-wrapper" ref={rootRef}>
      {label && (
        <span className="esp-label">{label}</span>
      )}

      <div className="esp-control">
        <button
          ref={triggerRef}
          type="button"
          className={`esp-trigger ${
            normalizedIds.length ? "has-value" : ""
          }`}
          disabled={disabled}
          aria-expanded={open && !disabled}
          aria-controls={open ? panelId : undefined}
          aria-label={label || placeholder}
          title={selectedText}
          onClick={handleOpen}
        >
          <Search size={15} aria-hidden="true" />

          <span>{selectedText}</span>

          <ChevronDown
            size={15}
            aria-hidden="true"
          />
        </button>

        {normalizedIds.length > 0 && !disabled && (
          <button
            type="button"
            className="esp-clear"
            aria-label="Clear selection"
            onClick={handleClear}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {menu &&
        typeof document !== "undefined" &&
        createPortal(menu, document.body)}
    </div>
  );
}

export default EntitySearchPicker;