import { useCallback, useEffect, useRef, useState } from "react";



import "./async-search-select.css";
import Input from "../Form/Input";

const CACHE_TTL_MS = 60 * 1000;

/*
  Reusable server-side search select.

  Instead of loading every record up front, it asks the server for a small
  page of matches (first on focus, then as the user types, debounced).

  Props
  - label, name, placeholder, required, disabled : same as the other form fields
  - value          : id of the selected record (string)
  - selectedLabel  : text to show for the selected record
  - onSelect(opt)  : called with the full option object ({ value, label, data })
  - fetchOptions(query) : async, returns [{ value, label, sublabel?, data? }]
  - limit          : the page size used by fetchOptions (enables the
                     "type to narrow" hint when the list is full)
*/
function AsyncSearchSelect({
  label,
  name,
  value = "",
  selectedLabel = "",
  onSelect,
  fetchOptions,
  placeholder = "Search...",
  disabled = false,
  required = false,
  debounceMs = 300,
  minChars = 0,
  limit = 0,
  emptyMessage = "No results found",
}) {
  const wrapperRef = useRef(null);
  const requestIdRef = useRef(0);
  const fetchRef = useRef(fetchOptions);
  const cacheRef = useRef(new Map());

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    fetchRef.current = fetchOptions;
  }, [fetchOptions]);

  const close = useCallback(() => {
    requestIdRef.current += 1; // ignore any request still in flight
    setOpen(false);
    setQuery("");
    setHighlight(-1);
    setLoading(false);
  }, []);

  const runSearch = useCallback(async (text, force = false) => {
    const key = text.toLowerCase();
    const cached = cacheRef.current.get(key);

    if (!force && cached && Date.now() - cached.at < CACHE_TTL_MS) {
      setOptions(cached.options);
      setFailed(false);
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;

    setLoading(true);
    setFailed(false);

    try {
      const result = await fetchRef.current(text);

      // A newer request (or closing the menu) makes this response stale
      if (requestId !== requestIdRef.current) return;

      const list = Array.isArray(result) ? result : [];

      cacheRef.current.set(key, { at: Date.now(), options: list });

      setOptions(list);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;

      console.error("Search failed:", error);

      setOptions([]);
      setFailed(true);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Load / search while the menu is open
  useEffect(() => {
    if (!open) return undefined;

    const text = query.trim();

    if (text.length > 0 && text.length < minChars) {
      setOptions([]);
      return undefined;
    }

    const timer = setTimeout(
      () => runSearch(text, retryKey > 0 && failed),
      text ? debounceMs : 0,
    );

    return () => clearTimeout(timer);
    // `failed` intentionally omitted: it must not retrigger the search
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query, debounceMs, minChars, runSearch, retryKey]);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return undefined;

    const handleOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        close();
      }
    };

    document.addEventListener("mousedown", handleOutside);

    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open, close]);

  // Never leave the menu open when the field becomes disabled
  useEffect(() => {
    if (disabled && open) close();
  }, [disabled, open, close]);

  const choose = (option) => {
    onSelect?.(option);
    close();
  };

  const handleKeyDown = (event) => {
    if (disabled) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();

      if (!open) {
        setOpen(true);
        return;
      }

      setHighlight((current) =>
        options.length ? (current + 1) % options.length : -1,
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      setHighlight((current) =>
        options.length ? (current <= 0 ? options.length - 1 : current - 1) : -1,
      );
      return;
    }

    if (event.key === "Enter" && open) {
      event.preventDefault();

      if (highlight >= 0 && options[highlight]) {
        choose(options[highlight]);
      }
      return;
    }

    if (event.key === "Escape" && open) {
      event.preventDefault();
      close();
      return;
    }

    if (event.key === "Tab" && open) {
      close();
    }
  };

  const handleChange = (event) => {
    setQuery(event.target.value);
    setHighlight(-1);

    if (!open) setOpen(true);
  };

  const showHint = limit > 0 && options.length >= limit && !loading;

  return (
    <div className="async-select" ref={wrapperRef} onKeyDown={handleKeyDown}>
      <Input
        label={label}
        name={name}
        value={open ? query : selectedLabel}
        onChange={handleChange}
        onFocus={() => {
          if (!disabled && !open) setOpen(true);
        }}
        placeholder={open && selectedLabel ? selectedLabel : placeholder}
        disabled={disabled}
        required={required}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-haspopup="listbox"
        data-selected-value={value}
      />

      {open && (
        <div className="async-select-menu" role="presentation">
          {loading && (
            <div className="async-select-status" role="status">
              Searching...
            </div>
          )}

          {!loading && failed && (
            <div className="async-select-status" role="alert">
              Unable to load results.{" "}
              <button
                type="button"
                className="async-select-retry"
                onMouseDown={(event) => {
                  event.preventDefault();
                  cacheRef.current.clear();
                  setRetryKey((current) => current + 1);
                }}
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !failed && options.length === 0 && (
            <div className="async-select-status">{emptyMessage}</div>
          )}

          {options.length > 0 && (
            <ul className="async-select-list" role="listbox">
              {options.map((option, index) => {
                const selected = option.value === value;

                return (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={selected}
                    className={[
                      "async-select-option",
                      index === highlight ? "is-highlighted" : "",
                      selected ? "is-selected" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onMouseEnter={() => setHighlight(index)}
                    onMouseDown={(event) => {
                      event.preventDefault(); // keep focus on the input
                      choose(option);
                    }}
                  >
                    <span className="async-select-option-label">
                      {option.label}
                    </span>

                    {option.sublabel && (
                      <small className="async-select-option-sub">
                        {option.sublabel}
                      </small>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {showHint && (
            <div className="async-select-hint">
              Showing the first {options.length} results. Keep typing to narrow
              them down.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AsyncSearchSelect;
