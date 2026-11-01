import { memo, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, RefreshCw, Search } from "lucide-react";
import useServerList from "../../../hooks/useServerList";

import "./VoucherListPage.css"; // = your old JournalVouchers.css (keep jv-* class names)
import { CardsSkeleton, TableSkeletonRows } from "../Skeleton/ListPageSkeleton";

/* ---------- defaults ---------- */
const toLocalDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const defaultFilters = () => {
  const now = new Date();
  return {
    startDate: toLocalDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    endDate: toLocalDate(now),
    type: "",
    search: "",
  };
};
const defaultValidate = (f) =>
  !f.startDate || !f.endDate || f.startDate > f.endDate
    ? "Choose a valid From and To date."
    : "";

/* ---------- memoised row: re-renders only if the row itself changes ---------- */
const DataRow = memo(function DataRow({ row, columns }) {
  return (
    <tr>
      {columns.map((c) => (
        <td
          key={c.key}
          className={c.tdClassName}
          style={c.nowrap ? { whiteSpace: "nowrap" } : undefined}
        >
          {c.render(row)}
        </td>
      ))}
    </tr>
  );
});

/**
 * Reusable voucher / report list page.
 * Everything that differs between pages is passed as props (see JournalVouchers.jsx).
 */
export default function VoucherListPage({
  title,
  namespace, // unique cache key, e.g. "journal-vouchers"
  fetchList, // (params, { signal }) => axios promise
  fetchSummary, // optional
  buildParams, // (filters) => api params (module-level, stable)
  validate = defaultValidate,
  columns, // module-level, stable
  cards, // ({ summary, total, page, totalPages }) => [{ label, value, hint, accent }]
  cardCount = 4,
  typeOptions, // select options [{ value, label }]
  chipTypes, // chips [{ value, label }]
  getTypeLabel = (v) => v || "All",
  searchPlaceholder = "Search...",
  pageSize = 50,
  initialFilters,
  exportConfig, // { fileName(filters), columns: [{ header, value(row) }] }
  footerText,
  emptyText = "No records for this period.",
  getRowKey = (r) => r._id,
}) {
  const navigate = useNavigate();

  const {
    filters,
    updateFilter,
    searchInput,
    setSearchInput,
    page,
    setPage,
    rows,
    summary,
    total,
    totalPages,
    hasNext,
    listFetching,
    summaryFetching,
    error,
    refresh,
  } = useServerList({
    namespace,
    fetchList,
    fetchSummary,
    buildParams,
    validate,
    initialFilters: initialFilters || defaultFilters(),
    pageSize,
  });

  const busy = listFetching || summaryFetching;

  const pageWindow = useMemo(() => {
    if (!totalPages) return [];
    const win = 5;
    let s = Math.max(1, page - Math.floor(win / 2));
    const e = Math.min(totalPages, s + win - 1);
    if (e - s + 1 < win) s = Math.max(1, e - win + 1);
    return Array.from({ length: e - s + 1 }, (_, i) => s + i);
  }, [totalPages, page]);

  const cardItems = cards({ summary, total, page, totalPages });
  const showCardSkeleton = summary === null && summaryFetching;

  const handleExport = () => {
    if (!rows?.length || !exportConfig) return;
    // downloadCsv({
    //   fileName: exportConfig.fileName(filters),
    //   meta: [
    //     [title, `${filters.startDate} to ${filters.endDate}`],
    //     ["Filter", filters.type || "All"],
    //     ["Search", filters.search || "—"],
    //     [],
    //   ],
    //   columns: exportConfig.columns,
    //   rows,
    // });
  };

  return (
    <main className="jv-page">
      <header className="jv-header">
        <div className="jv-heading">
          <button
            type="button"
            className="jv-back"
            aria-label="Go back"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={18} />
          </button>
          <div className="jv-title">
            <h1>{title}</h1>
            <p>
              {filters.startDate} to {filters.endDate} ·{" "}
              {getTypeLabel(filters.type)} · {total ?? "…"} entries
            </p>
          </div>
        </div>
        <div className="jv-actions">
          {exportConfig && (
            <button
              type="button"
              className="jv-button"
              onClick={handleExport}
              disabled={!rows?.length}
            >
              <Download size={16} /> Export
            </button>
          )}
          <button
            type="button"
            className="jv-button"
            disabled={busy}
            onClick={refresh}
          >
            <RefreshCw size={16} className={busy ? "jv-spin" : ""} /> Refresh
          </button>
        </div>
      </header>

      <section
        className="jv-cards"
        aria-label="Summary"
        aria-busy={showCardSkeleton}
      >
        {showCardSkeleton ? (
          <CardsSkeleton count={cardCount} />
        ) : (
          cardItems.map((c) => (
            <article
              className="jv-card"
              key={c.label}
              style={{
                opacity: summaryFetching ? 0.6 : 1,
                transition: "opacity .15s",
              }}
            >
              <span>{c.label}</span>
              <strong
                style={c.accent ? { color: "var(--jv-primary)" } : undefined}
              >
                {c.value}
              </strong>
              <small>{c.hint || " "}</small>
            </article>
          ))
        )}
      </section>

      <section className="jv-filters" aria-label="Filters">
        <div className="jv-search">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            value={searchInput}
            aria-label="Search"
            placeholder={searchPlaceholder}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <label className="jv-date">
          <span>From</span>
          <input
            type="date"
            value={filters.startDate}
            max={filters.endDate || undefined}
            onChange={(e) => updateFilter({ startDate: e.target.value })}
          />
        </label>
        <label className="jv-date">
          <span>To</span>
          <input
            type="date"
            value={filters.endDate}
            min={filters.startDate || undefined}
            onChange={(e) => updateFilter({ endDate: e.target.value })}
          />
        </label>
        <label className="jv-select">
          <span>Voucher Type</span>
          <select
            value={filters.type}
            onChange={(e) => updateFilter({ type: e.target.value })}
          >
            {typeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <div className="jv-chips" role="tablist" aria-label="Voucher type">
        {chipTypes.map((c) => (
          <button
            key={c.value}
            type="button"
            role="tab"
            aria-selected={filters.type === c.value}
            className={`jv-chip ${filters.type === c.value ? "is-active" : ""}`}
            onClick={() => updateFilter({ type: c.value })}
          >
            {c.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="jv-error" role="alert">
          {error}
        </div>
      )}

      <section
        className="jv-table-card"
        aria-label="Table"
        aria-busy={rows === null}
      >
        <div
          className="jv-table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Scrollable table"
        >
          <table className="jv-table">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key} scope="col" className={c.thClassName}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows === null ? (
                <TableSkeletonRows columns={columns.length} rows={10} />
              ) : error ? (
                <tr>
                  <td colSpan={columns.length} className="jv-empty">
                    Unable to display data.
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="jv-empty">
                    {filters.search || filters.type
                      ? "Nothing matches your filters."
                      : emptyText}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <DataRow key={getRowKey(r)} row={r} columns={columns} />
                ))
              )}
            </tbody>
          </table>
        </div>

        {rows !== null && !error && rows.length > 0 && (
          <div className="jv-pagination">
            <span>
              {totalPages
                ? `Page ${page} of ${totalPages} · ${total} records`
                : `Page ${page}`}
            </span>
            <div className="jv-pager">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>
              {pageWindow.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={p === page ? "is-active" : ""}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                disabled={!hasNext}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {footerText && total !== null && (
        <footer className="jv-footer">
          <span>{footerText({ total, filters })}</span>
          <span>Balanced · Paise-safe</span>
        </footer>
      )}
    </main>
  );
}
