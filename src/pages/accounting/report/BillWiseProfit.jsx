import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import {
  ArrowLeft,
  Building2,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import EntitySearchPicker from "../../../components/common/EntitySearchPicker/EntitySearchPicker"; // adjust path
import billProfitApi from "../../../services/modules/billProfitApi"; // adjust path

import "./BillWiseProfit.css";

/* ---------- constants ---------- */

const PAGE_SIZE = 25;
const SKELETON_ROWS = 8;

const EMPTY_REPORT = {
  rows: [],
  summary: null,
  pagination: { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 },
};

const PRESETS = [
  { key: "7", label: "Last 7 Days" },
  { key: "30", label: "Last 30 Days" },
  { key: "month", label: "This Month" },
  { key: "fy", label: "This Financial Year" },
  { key: "custom", label: "Custom" },
];

const SORTS = [
  { key: "invoiceDate", label: "Date" },
  { key: "revenuePaise", label: "Sales" },
  { key: "profitPaise", label: "Profit" },
  { key: "marginPercent", label: "Margin" },
];

const COST_LABELS = {
  PURCHASE_BILL: "Last purchase rate",
  PRODUCT_PRICE: "Product cost price",
  SERVICE: "Service, no cost",
  NONE: "No cost found",
};

// Fixed widths so skeleton rows look natural without randomness.
const SKELETON_WIDTHS = ["72%", "58%", "84%", "64%", "78%", "52%", "68%", "88%"];

/* ---------- helpers ---------- */

const toLocalDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toLocalDate(date);
};

const presetRange = (key) => {
  const now = new Date();

  if (key === "month") {
    return [toLocalDate(new Date(now.getFullYear(), now.getMonth(), 1)), toLocalDate(now)];
  }

  if (key === "fy") {
    const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    return [`${year}-04-01`, toLocalDate(now)];
  }

  return [daysAgo(Number(key)), toLocalDate(now)];
};

const inrFormat = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inr = (paise) => inrFormat.format((Number(paise) || 0) / 100);
const percent = (value) => `${(Number(value) || 0).toFixed(1)}%`;

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    })
    .replace(/\//g, "-");
};

const tone = (profitPaise, margin) =>
  profitPaise < 0 ? "loss" : margin < 10 ? "low" : "good";

const profitClass = (profitPaise) =>
  profitPaise < 0 ? "bwp-out" : profitPaise > 0 ? "bwp-in" : "";

const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || "Unable to load report.";

const isCancelled = (error) =>
  error?.code === "ERR_CANCELED" || error?.name === "CanceledError";

const csvCell = (value) => {
  let text = String(value ?? "");
  if (/^\s*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

/* Bill finder: server-side search over posted sales invoices. */
const fetchInvoiceOptions = async ({ search, page, limit, signal }) => {
  const response = await billProfitApi.searchInvoices(
    { search, page, limit },
    { signal },
  );

  const body = response?.data;
  const data = Array.isArray(body?.data) ? body.data : [];
  const total = Number(body?.pagination?.total);

  return {
    data,
    total: Number.isFinite(total) && total >= 0 ? total : data.length,
  };
};

/* ---------- small pieces ---------- */

const Skel = ({ w, className = "" }) => (
  <span className={`bwp-skel ${className}`} style={w ? { "--w": w } : undefined} />
);

const MarginCell = ({ profitPaise, marginPercent }) => (
  <div className={`bwp-margin bwp-tone-${tone(profitPaise, marginPercent)}`}>
    <span className="bwp-pill">{percent(marginPercent)}</span>
    <span className="bwp-bar" aria-hidden="true">
      <b style={{ width: `${Math.min(100, Math.abs(marginPercent))}%` }} />
    </span>
  </div>
);

/* ---------- component ---------- */

export default function BillWiseProfit() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // The open bill lives in the URL (?bill=SI001) so it can be shared.
  const selected = (searchParams.get("bill") || "").trim().toUpperCase();

  const selectBill = useCallback(
    (invoiceNumber) => {
      setSearchParams((previous) => {
        const next = new URLSearchParams(previous);
        if (invoiceNumber) next.set("bill", String(invoiceNumber).toUpperCase());
        else next.delete("bill");
        return next;
      });
    },
    [setSearchParams],
  );

  const [preset, setPreset] = useState("30");
  const [[startDate, endDate], setRange] = useState(() => presetRange("30"));

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ by: "invoiceDate", order: "desc" });

  const [report, setReport] = useState(EMPTY_REPORT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");

  const [exporting, setExporting] = useState(false);

  /* ----- filters ----- */

  const onPreset = (key) => {
    setPreset(key);
    setPage(1);
    if (key !== "custom") setRange(presetRange(key));
  };

  const onDate = (which, value) => {
    setPreset("custom");
    setPage(1);
    setRange(([from, to]) => (which === "from" ? [value, to] : [from, value]));
  };

  const toggleSort = (key) => {
    setPage(1);
    setSort((current) =>
      current.by === key
        ? { by: key, order: current.order === "desc" ? "asc" : "desc" }
        : { by: key, order: "desc" },
    );
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  /* ----- load list ----- */

  useEffect(() => {
    if (!startDate || !endDate || startDate > endDate) {
      setReport(EMPTY_REPORT);
      setLoading(false);
      setError("Choose a valid From and To date.");
      return undefined;
    }

    let cancelled = false;
    const controller = new AbortController();

    const run = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await billProfitApi.getReport(
          {
            startDate,
            endDate,
            search: search || undefined,
            page,
            limit: PAGE_SIZE,
            sortBy: sort.by,
            sortOrder: sort.order,
          },
          { signal: controller.signal },
        );

        const body = response?.data;

        if (!body?.success || !Array.isArray(body.rows)) {
          throw new Error(body?.message || "Invalid report response.");
        }

        if (!cancelled) {
          setReport({
            rows: body.rows,
            summary: body.summary,
            pagination: body.pagination || EMPTY_REPORT.pagination,
          });
        }
      } catch (err) {
        if (cancelled || isCancelled(err)) return;
        setReport(EMPTY_REPORT);
        setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [startDate, endDate, search, page, sort, refreshKey]);

  /* ----- load selected bill ----- */

  useEffect(() => {
    if (!selected) {
      setDetail(null);
      setDetailError("");
      setDetailLoading(false);
      return undefined;
    }

    let cancelled = false;
    const controller = new AbortController();

    const run = async () => {
      setDetailLoading(true);
      setDetailError("");

      try {
        const response = await billProfitApi.getBill(selected, {
          signal: controller.signal,
        });

        const bill = response?.data?.bill;
        if (!bill) throw new Error("Bill not found.");
        if (!cancelled) setDetail(bill);
      } catch (err) {
        if (cancelled || isCancelled(err)) return;
        setDetail(null);
        setDetailError(getErrorMessage(err));
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [selected, refreshKey]);

  /* ----- export (all bills in range, not just this page) ----- */

  const exportCsv = async () => {
    setExporting(true);

    try {
      const response = await billProfitApi.getReport({
        startDate,
        endDate,
        search: search || undefined,
        sortBy: sort.by,
        sortOrder: sort.order,
        all: "true",
      });

      const rows = response?.data?.rows;
      if (!Array.isArray(rows)) throw new Error("Invalid report response.");

      const header = [
        "Invoice",
        "Date",
        "Customer",
        "Sales (excl. GST)",
        "Cost",
        "Profit",
        "Margin %",
        "Cost missing",
      ];

      const body = rows.map((r) => [
        r.invoiceNumber,
        formatDate(r.invoiceDate),
        r.customerName,
        (r.revenuePaise / 100).toFixed(2),
        (r.costPaise / 100).toFixed(2),
        (r.profitPaise / 100).toFixed(2),
        r.marginPercent,
        r.costMissing ? "Yes" : "No",
      ]);

      const csv = [header, ...body]
        .map((row) => row.map(csvCell).join(","))
        .join("\r\n");

      const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = `bill-wise-profit-${startDate}-to-${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  /* ----- derived ----- */

  const { rows, summary, pagination } = report;
  const busy = loading || detailLoading;

  const cards = [
    {
      label: "Sales (excl. GST)",
      value: summary ? inr(summary.revenuePaise) : "",
      note: summary ? `${summary.invoiceCount} bill(s)` : "",
    },
    {
      label: "Cost of goods sold",
      value: summary ? inr(summary.costPaise) : "",
      note: "Latest purchase rate",
    },
    {
      label: "Profit",
      value: summary ? inr(summary.profitPaise) : "",
      note: summary ? `${percent(summary.marginPercent)} margin` : "",
      valueClass: summary ? profitClass(summary.profitPaise) : "",
    },
    {
      label: "Loss-making bills",
      value: summary ? String(summary.lossBills) : "",
      note: summary
        ? summary.costMissingBills
          ? `${summary.costMissingBills} without cost`
          : "All bills costed"
        : "",
      valueClass: summary?.lossBills ? "bwp-out" : "",
      isLoss: Boolean(summary?.lossBills),
    },
  ];

  /* ----- table body ----- */

  const renderBody = () => {
    if (loading) {
      return Array.from({ length: SKELETON_ROWS }, (_, i) => (
        <tr key={`skeleton-${i}`} aria-hidden="true">
          <td>
            <div className="bwp-skel-stack">
              <Skel w="70px" />
              <Skel w="56px" className="" />
            </div>
          </td>
          <td>
            <Skel w={SKELETON_WIDTHS[i % SKELETON_WIDTHS.length]} />
          </td>
          <td className="bwp-number"><Skel w="84px" className="is-end" /></td>
          <td className="bwp-number"><Skel w="84px" className="is-end" /></td>
          <td className="bwp-number"><Skel w="84px" className="is-end" /></td>
          <td>
            <div className="bwp-skel-stack">
              <Skel w="52px" className="is-pill" />
              <Skel w="88px" />
            </div>
          </td>
        </tr>
      ));
    }

    if (error) {
      return (
        <tr>
          <td colSpan={6} className="bwp-empty">Unable to display report.</td>
        </tr>
      );
    }

    if (!rows.length) {
      return (
        <tr>
          <td colSpan={6} className="bwp-empty">No posted bills in this period.</td>
        </tr>
      );
    }

    return rows.map((row) => (
      <tr
        key={row._id}
        className={`bwp-row ${row.invoiceNumber === selected ? "is-active" : ""}`}
        tabIndex={0}
        aria-selected={row.invoiceNumber === selected}
        onClick={() => selectBill(row.invoiceNumber)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            selectBill(row.invoiceNumber);
          }
        }}
      >
        <td>
          <strong className="bwp-doc">{row.invoiceNumber}</strong>
          <span className="bwp-subtext">{formatDate(row.invoiceDate)}</span>
        </td>
        <td className="bwp-party">
          {row.customerName}
          {row.costMissing && (
            <>
              <br />
              <span className="bwp-flag">Cost missing</span>
            </>
          )}
        </td>
        <td className="bwp-number">{inr(row.revenuePaise)}</td>
        <td className="bwp-number">{inr(row.costPaise)}</td>
        <td className={`bwp-number bwp-profit ${profitClass(row.profitPaise)}`}>
          {inr(row.profitPaise)}
        </td>
        <td>
          <MarginCell profitPaise={row.profitPaise} marginPercent={row.marginPercent} />
        </td>
      </tr>
    ));
  };

  /* ----- detail panel ----- */

  const renderDetail = () => (
    <aside className="bwp-detail" aria-label="Bill profit details" aria-busy={detailLoading}>
      <header className="bwp-detail-head">
        <div>
          <h2>{selected}</h2>
          <p>
            {detail
              ? `${detail.customerName} · ${formatDate(detail.invoiceDate)}`
              : detailLoading
                ? "Loading bill..."
                : "Bill"}
          </p>
        </div>

        <button
          type="button"
          className="bwp-close"
          aria-label="Close bill details"
          onClick={() => selectBill(null)}
        >
          <X size={17} />
        </button>
      </header>

      {detailLoading && (
        <div className="bwp-detail-skel" aria-hidden="true">
          <Skel className="is-block" />
          <div className="bwp-skel-stack">
            <Skel w="60%" />
            <Skel w="45%" />
            <Skel w="70%" />
          </div>
          <Skel className="is-block" />
          <Skel className="is-block" />
        </div>
      )}

      {!detailLoading && detailError && (
        <div className="bwp-error" role="alert">{detailError}</div>
      )}

      {!detailLoading && detail && (
        <>
          <div className={`bwp-result bwp-tone-${tone(detail.profitPaise, detail.marginPercent)}`}>
            <span>Profit on this bill</span>
            <strong>{inr(detail.profitPaise)}</strong>
            <em>{percent(detail.marginPercent)} margin</em>
          </div>

          <dl className="bwp-facts">
            <div>
              <dt>Sales (excl. GST)</dt>
              <dd>{inr(detail.revenuePaise)}</dd>
            </div>
            <div>
              <dt>Cost</dt>
              <dd>{inr(detail.costPaise)}</dd>
            </div>
            <div>
              <dt>GST</dt>
              <dd>{inr(detail.taxPaise)}</dd>
            </div>
            <div>
              <dt>Bill total</dt>
              <dd>{inr(detail.totalAmountPaise)}</dd>
            </div>
          </dl>

          {detail.costMissing && (
            <div className="bwp-warning" role="status">
              Some items have no cost yet, so their profit equals their sales. Post a
              purchase bill or set a cost price to get an accurate figure.
            </div>
          )}

          <ul className="bwp-lines">
            {detail.lines.map((line, index) => (
              <li
                key={`${line.productId}-${index}`}
                className={`bwp-line bwp-tone-${tone(line.profitPaise, line.marginPercent)}`}
              >
                <div className="bwp-line-title">
                  <strong>{line.productName}</strong>
                  <span>{line.productCode}</span>
                </div>

                <p className="bwp-line-meta">
                  {line.quantity} {line.unit} × {inr(line.unitRatePaise)}
                  {line.discountPercent ? ` (−${line.discountPercent}%)` : ""}
                </p>

                <div className="bwp-line-grid">
                  <div>
                    <span>Sales</span>
                    <b>{inr(line.revenuePaise)}</b>
                  </div>
                  <div>
                    <span>Cost</span>
                    <b>{inr(line.costPaise)}</b>
                  </div>
                  <div>
                    <span>Profit</span>
                    <b className={profitClass(line.profitPaise)}>{inr(line.profitPaise)}</b>
                  </div>
                </div>

                <p className={`bwp-source ${line.costSource === "NONE" ? "is-none" : ""}`}>
                  {COST_LABELS[line.costSource]}
                  {line.costSource === "PURCHASE_BILL" &&
                    ` ${line.costRef} · ${inr(line.unitCostPaise)} per ${line.unit}`}
                  {line.costSource === "PRODUCT_PRICE" &&
                    ` · ${inr(line.unitCostPaise)} per ${line.unit}`}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </aside>
  );

  /* ----- render ----- */

  return (
    <main className="bwp-page">
      <header className="bwp-header">
        <div className="bwp-heading">
          <button type="button" className="bwp-back" aria-label="Go back" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
          </button>

          <div className="bwp-title">
            <h1>Bill Wise Profit</h1>
            <p>Profit on every posted sales bill, from sales rate and purchase cost</p>
          </div>
        </div>

        <div className="bwp-actions">
          <button
            type="button"
            className="bwp-button"
            onClick={exportCsv}
            disabled={exporting || loading || !rows.length}
          >
            <Download size={16} />
            {exporting ? "Preparing..." : "Download"}
          </button>

          <button
            type="button"
            className="bwp-button bwp-button-primary"
            disabled={busy}
            onClick={() => setRefreshKey((n) => n + 1)}
          >
            <RefreshCw size={16} className={busy ? "bwp-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      <section className="bwp-cards" aria-label="Totals for the selected period" aria-busy={loading}>
        {cards.map((card) => (
          <article key={card.label} className={`bwp-card ${card.isLoss ? "is-loss" : ""}`}>
            <span>{card.label}</span>
            {loading ? (
              <>
                <Skel w="68%" className="is-big" />
                <Skel w="44%" />
              </>
            ) : (
              <>
                <strong className={card.valueClass}>{card.value || "—"}</strong>
                <small>{card.note}</small>
              </>
            )}
          </article>
        ))}
      </section>

      <section className="bwp-filters" aria-label="Report filters">
        <div className="bwp-search">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            value={searchInput}
            placeholder="Filter by bill or customer..."
            aria-label="Filter bills"
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <label className="bwp-select-wrap">
          <span>Period</span>
          <select value={preset} onChange={(e) => onPreset(e.target.value)}>
            {PRESETS.map((p) => (
              <option key={p.key} value={p.key}>{p.label}</option>
            ))}
          </select>
        </label>

        <label className="bwp-date">
          <span>From</span>
          <input
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(e) => onDate("from", e.target.value)}
          />
        </label>

        <label className="bwp-date">
          <span>To</span>
          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => onDate("to", e.target.value)}
          />
        </label>

        <div className="bwp-finder">
          <EntitySearchPicker
            placeholder="Find a bill by number or customer"
            multiple={false}
            fetchOptions={fetchInvoiceOptions}
            getOptionId={(invoice) => invoice.invoiceNumber}
            getOptionLabel={(invoice) => invoice.invoiceNumber}
            getOptionSubtitle={(invoice) =>
              `${invoice.customerName} · ${formatDate(invoice.invoiceDate)} · ${inr(invoice.totalAmountPaise)}`
            }
            selectedIds={selected ? [selected] : []}
            selectedLabel={selected}
            onToggle={(code) => selectBill(code)}
          />
        </div>
      </section>

      <div className="bwp-chips" role="group" aria-label="Sort bills">
        <span className="bwp-chips-label">Sort by</span>
        {SORTS.map((s) => (
          <button
            key={s.key}
            type="button"
            className={`bwp-chip ${sort.by === s.key ? "is-active" : ""}`}
            aria-pressed={sort.by === s.key}
            onClick={() => toggleSort(s.key)}
          >
            {s.label}
            {sort.by === s.key && (sort.order === "desc" ? "↓" : "↑")}
          </button>
        ))}
      </div>

      {error && (
        <div className="bwp-error" role="alert">{error}</div>
      )}

      <div className={`bwp-layout ${selected ? "has-detail" : ""}`}>
        <section className="bwp-table-card" aria-busy={loading}>
          {loading && <span className="bwp-sr" role="status">Loading bills...</span>}

          <div className="bwp-table-scroll" tabIndex={0}>
            <table className="bwp-table">
              <thead>
                <tr>
                  <th>Bill</th>
                  <th>Customer</th>
                  <th className="bwp-num">Sales</th>
                  <th className="bwp-num">Cost</th>
                  <th className="bwp-num">Profit</th>
                  <th>Margin</th>
                </tr>
              </thead>

              <tbody>{renderBody()}</tbody>

              {!loading && !error && summary && rows.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={2}>Total · {summary.invoiceCount} bill(s)</td>
                    <td className="bwp-number">{inr(summary.revenuePaise)}</td>
                    <td className="bwp-number">{inr(summary.costPaise)}</td>
                    <td className={`bwp-number ${profitClass(summary.profitPaise)}`}>
                      {inr(summary.profitPaise)}
                    </td>
                    <td>
                      <MarginCell
                        profitPaise={summary.profitPaise}
                        marginPercent={summary.marginPercent}
                      />
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {!error && pagination.total > 0 && (
            <footer className="bwp-pager">
              <button
                type="button"
                aria-label="Previous page"
                disabled={loading || page <= 1}
                onClick={() => setPage((n) => Math.max(1, n - 1))}
              >
                <ChevronLeft size={16} />
              </button>

              <span aria-live="polite">
                Page {pagination.page} of {pagination.totalPages} · {pagination.total} bill(s)
              </span>

              <button
                type="button"
                aria-label="Next page"
                disabled={loading || page >= pagination.totalPages}
                onClick={() => setPage((n) => n + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </footer>
          )}
        </section>

        {selected && renderDetail()}
      </div>

      {!loading && !error && (
        <footer className="bwp-footer">
          <span>
            <Building2 size={12} style={{ verticalAlign: "-2px" }} /> {pagination.total} bill(s) ·{" "}
            {startDate} to {endDate}
          </span>
          <span>Profit = sales excl. GST − cost at the last purchase rate before the bill date</span>
        </footer>
      )}
    </main>
  );
}