import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Landmark,
  ReceiptText,
  RefreshCw,
  Scale,
  Search,
  Settings2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../../../services/api";
import "./GstSummary.css";

const PERIODS = [
  { key: "thisMonth", label: "This Month" },
  { key: "lastMonth", label: "Last Month" },
  { key: "thisQuarter", label: "This Quarter" },
  { key: "thisFy", label: "This FY" },
  { key: "lastFy", label: "Last FY" },
  { key: "custom", label: "Custom" },
];

const SOURCE_LABELS = {
  SALES_INVOICE: "Sales Invoice",
  SALES_RETURN: "Sales Return",
  PURCHASE_BILL: "Purchase Bill",
  MANUAL_JOURNAL: "Manual Journal",
  SUPPLIER_PAYMENT: "Supplier Payment",
  CUSTOMER_RECEIPT: "Customer Receipt",
};

const SOURCE_OPTIONS = [
  "SALES_INVOICE",
  "SALES_RETURN",
  "PURCHASE_BILL",
  "MANUAL_JOURNAL",
];

const SIDE_STYLES = {
  OUTPUT: { label: "Output", className: "dl-status-pending" },
  INPUT: { label: "Input", className: "dl-status-active" },
  MIXED: { label: "Mixed", className: "dl-status-created" },
};

const pad = (value) => String(value).padStart(2, "0");

const toDateInput = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const getPeriodRange = (key, today = new Date()) => {
  const year = today.getFullYear();
  const month = today.getMonth();
  const fyStartYear = month >= 3 ? year : year - 1;

  let start;
  let end;

  switch (key) {
    case "lastMonth":
      start = new Date(year, month - 1, 1);
      end = new Date(year, month, 0);
      break;

    case "thisQuarter": {
      const quarter = Math.floor(((month + 9) % 12) / 3);
      const startMonth = (3 + quarter * 3) % 12;
      const startYear = startMonth > month ? year - 1 : year;

      start = new Date(startYear, startMonth, 1);
      end = new Date(startYear, startMonth + 3, 0);
      break;
    }

    case "thisFy":
      start = new Date(fyStartYear, 3, 1);
      end = new Date(fyStartYear + 1, 2, 31);
      break;

    case "lastFy":
      start = new Date(fyStartYear - 1, 3, 1);
      end = new Date(fyStartYear, 2, 31);
      break;

    default:
      start = new Date(year, month, 1);
      end = new Date(year, month + 1, 0);
  }

  return { from: toDateInput(start), to: toDateInput(end) };
};

const rupeeFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
});

const money = (paise) => rupeeFormatter.format((Number(paise) || 0) / 100);

const signedMoney = (paise) => {
  const value = Number(paise) || 0;

  if (value === 0) return money(0);

  return `${value > 0 ? "+" : "-"}${money(Math.abs(value))}`;
};

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : "-";

const getNetStatus = (paise) => {
  if (paise > 0) return { label: "Payable", className: "dl-status-pending" };
  if (paise < 0) return { label: "Credit", className: "dl-status-active" };

  return { label: "Nil", className: "dl-status-created" };
};

const getErrorMessage = (error) => {
  const data = error?.response?.data;

  if (typeof data?.message === "string") return data.message;
  if (typeof data?.error === "string") return data.error;

  return error?.message || "Unable to load GST summary. Please try again.";
};

const getPageNumbers = (page, totalPages) => {
  const size = 5;
  let start = Math.max(page - Math.floor(size / 2), 1);
  const end = Math.min(start + size - 1, totalPages);

  start = Math.max(end - size + 1, 1);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
};

function SummaryCard({ icon, label, value, note }) {
  return (
    <div className="gs-card">
      <div className="gs-card-icon">{icon}</div>

      <div className="gs-card-body">
        <span className="gs-card-label">{label}</span>
        <span className="gs-card-value">{value}</span>
        <span className="gs-card-note">{note}</span>
      </div>
    </div>
  );
}

function AmountCell({ paise }) {
  return (
    <span className={paise < 0 ? "gs-credit" : undefined}>
      {signedMoney(paise)}
    </span>
  );
}

function GstSummary() {
  const navigate = useNavigate();

  const initialRange = useMemo(() => getPeriodRange("thisMonth"), []);

  const [period, setPeriod] = useState("thisMonth");
  const [fromDate, setFromDate] = useState(initialRange.from);
  const [toDate, setToDate] = useState(initialRange.to);
  const [sourceType, setSourceType] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [showFilters, setShowFilters] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const requestRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    if (!fromDate || !toDate || fromDate > toDate) {
      setLoading(false);
      return;
    }

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    try {
      setLoading(true);
      setError("");

      const response = await api.gstSummary.get({
        fromDate,
        toDate,
        sourceType: sourceType || undefined,
        search: search || undefined,
        page,
        limit,
      });

      console.log("gst summary response:", response);
      if (requestId !== requestRef.current) return;

      setData(response?.data || null);
    } catch (requestError) {
      if (requestId !== requestRef.current) return;

      console.error("Unable to load GST summary:", requestError);

      const message = getErrorMessage(requestError);

      setData(null);
      setError(message);
      toast.error(message);
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [fromDate, toDate, sourceType, search, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  const selectPeriod = (key) => {
    setPeriod(key);
    setPage(1);

    if (key === "custom") {
      setShowFilters(true);
      return;
    }

    const range = getPeriodRange(key);

    setFromDate(range.from);
    setToDate(range.to);
  };

  const handleDateChange = (name, value) => {
    setPeriod("custom");
    setPage(1);

    if (name === "fromDate") setFromDate(value);
    else setToDate(value);
  };

  const clearFilters = () => {
    const range = getPeriodRange("thisMonth");

    setPeriod("thisMonth");
    setFromDate(range.from);
    setToDate(range.to);
    setSourceType("");
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  const configured = data?.configured !== false;
  const summary = data?.summary || [];
  const totals = data?.totals || { outputPaise: 0, inputPaise: 0, netPaise: 0 };
  const rows = data?.rows || [];

  const pagination = data?.pagination || {
    page: 1,
    limit,
    total: 0,
    totalPages: 0,
  };

  const netStatus = getNetStatus(totals.netPaise);
  const dateRangeInvalid = fromDate && toDate && fromDate > toDate;

  const showingFrom = pagination.total
    ? (pagination.page - 1) * pagination.limit + 1
    : 0;

  const showingTo = Math.min(
    pagination.page * pagination.limit,
    pagination.total,
  );

  const skeletonColumns = "repeat(8, 1fr)";

  return (
    <div className="data-list">
      <div className="dl-header">
        <div className="dl-header-content">
          <h1>GST Summary</h1>
          <p>
            Output tax, input tax credit and net GST for the selected period
          </p>
        </div>

        <button
          type="button"
          className="so-primary-button dl-add-button"
          onClick={() => navigate("/gst-tax/configuration")}
        >
          <Settings2 size={14} />
          Tax Configuration
        </button>
      </div>

      {data && !configured && (
        <div className="gs-notice">
          <div>
            <strong>GST ledgers are not configured</strong>
            <span>
              Map your output and input tax ledgers first. Without them, no GST
              can be calculated.
            </span>
          </div>

          <button
            type="button"
            className="so-primary-button"
            onClick={() => navigate("/gst-tax/configuration")}
          >
            Configure Now
          </button>
        </div>
      )}

      <div className="gs-cards">
        <SummaryCard
          icon={<TrendingUp size={19} />}
          label="Output Tax"
          value={money(totals.outputPaise)}
          note="Collected on sales, net of returns"
        />

        <SummaryCard
          icon={<TrendingDown size={19} />}
          label="Input Tax Credit"
          value={money(totals.inputPaise)}
          note="Paid on purchases"
        />

        <SummaryCard
          icon={<Scale size={19} />}
          label={
            totals.netPaise < 0 ? "Net Credit Available" : "Net GST Payable"
          }
          value={money(Math.abs(totals.netPaise))}
          note={`Output minus input · ${netStatus.label}`}
        />

        <SummaryCard
          icon={<ReceiptText size={19} />}
          label="Tax Entries"
          value={pagination.total}
          note="Journals in this period"
        />
      </div>

      {data && configured && (
        <div className="dl-card gs-block">
          <div className="gs-block-title">
            <h3>Tax Head Breakdown</h3>
            <p>
              {data.period
                ? `${formatDate(`${data.period.fromDate}T00:00:00.000Z`)} to ${formatDate(`${data.period.toDate}T00:00:00.000Z`)}`
                : "Selected period"}
            </p>
          </div>

          <div className="dl-table-wrapper">
            <table className="dl-table gs-table">
              <thead>
                <tr>
                  <th>Tax Head</th>
                  <th className="gs-num">Output Tax</th>
                  <th className="gs-num">Input Credit</th>
                  <th className="gs-num">Net</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {summary.map((row) => {
                  const unmapped = !row.mapped.output && !row.mapped.input;
                  const status = unmapped
                    ? { label: "Not mapped", className: "dl-status-inactive" }
                    : getNetStatus(row.netPaise);

                  return (
                    <tr key={row.taxHead}>
                      <td>
                        <strong>{row.taxHead}</strong>
                      </td>
                      <td className="gs-num">{money(row.outputPaise)}</td>
                      <td className="gs-num">{money(row.inputPaise)}</td>
                      <td className="gs-num">
                        <AmountCell paise={row.netPaise} />
                      </td>
                      <td>
                        <span className={`dl-status ${status.className}`}>
                          <span className="dl-status-dot" />
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                <tr className="gs-total-row">
                  <td>Total</td>
                  <td className="gs-num">{money(totals.outputPaise)}</td>
                  <td className="gs-num">{money(totals.inputPaise)}</td>
                  <td className="gs-num">
                    <AmountCell paise={totals.netPaise} />
                  </td>
                  <td>
                    <span className={`dl-status ${netStatus.className}`}>
                      <span className="dl-status-dot" />
                      {netStatus.label}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="dl-card">
        <div className="dl-toolbar">
          <div className="dl-search">
            <Search size={15} />

            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search journal, source number or narration..."
            />

            {searchInput && (
              <button type="button" onClick={() => setSearchInput("")}>
                <X size={14} />
              </button>
            )}
          </div>

          <div className="dl-toolbar-actions">
            <button
              type="button"
              className={`dl-tool ${showFilters ? "active" : ""}`}
              onClick={() => setShowFilters((previous) => !previous)}
            >
              <Filter size={14} />
              Filters
              {sourceType && <b>1</b>}
            </button>

            <button
              type="button"
              className="dl-tool"
              onClick={load}
              disabled={loading}
            >
              <RefreshCw
                size={14}
                className={loading ? "dl-refresh-icon-spin" : undefined}
              />
              Refresh
            </button>
          </div>
        </div>

        <div className="dl-quick-filters">
          {PERIODS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={period === item.key ? "active" : ""}
              onClick={() => selectPeriod(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {showFilters && (
          <div className="dl-filter-panel">
            <div className="dl-filter-header">
              <div>
                <strong>Filters</strong>
                <span>Narrow the GST entries shown below</span>
              </div>

              <button type="button" onClick={clearFilters}>
                Clear all
              </button>
            </div>

            <div className="dl-filter-grid">
              <div className="dl-field">
                <label htmlFor="gs-from-date">From Date</label>
                <input
                  id="gs-from-date"
                  type="date"
                  value={fromDate}
                  max={toDate || undefined}
                  onChange={(event) =>
                    handleDateChange("fromDate", event.target.value)
                  }
                />
              </div>

              <div className="dl-field">
                <label htmlFor="gs-to-date">To Date</label>
                <input
                  id="gs-to-date"
                  type="date"
                  value={toDate}
                  min={fromDate || undefined}
                  onChange={(event) =>
                    handleDateChange("toDate", event.target.value)
                  }
                />
              </div>

              <div className="dl-field">
                <label htmlFor="gs-source-type">Source</label>
                <select
                  id="gs-source-type"
                  value={sourceType}
                  onChange={(event) => {
                    setSourceType(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All sources</option>
                  {SOURCE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {SOURCE_LABELS[option]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {dateRangeInvalid ? (
          <div className="dl-state">
            <strong>Invalid date range</strong>
            <span>From date cannot be after to date.</span>
          </div>
        ) : loading && !data ? (
          <div className="dl-loading">
            <div
              className="dl-loading-head"
              style={{ gridTemplateColumns: skeletonColumns }}
            >
              {Array.from({ length: 8 }, (_, index) => (
                <span key={index} />
              ))}
            </div>

            {Array.from({ length: 5 }, (_, rowIndex) => (
              <div
                key={rowIndex}
                className="dl-loading-row"
                style={{ gridTemplateColumns: skeletonColumns }}
              >
                {Array.from({ length: 8 }, (_, index) => (
                  <span key={index} />
                ))}
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="dl-state">
            <strong>Unable to load GST summary</strong>
            <span>{error}</span>
            <button type="button" onClick={load}>
              Try again
            </button>
          </div>
        ) : !rows.length ? (
          <div className="dl-state">
            <Landmark size={26} />
            <strong>No GST entries found</strong>
            <span>
              {configured
                ? "No tax postings match this period or filter."
                : "Configure your tax ledgers to start seeing GST entries."}
            </span>
            <button type="button" onClick={clearFilters}>
              Reset filters
            </button>
          </div>
        ) : (
          <>
            <div
              className="dl-table-wrapper dl-box-mobile"
              style={{ opacity: loading ? 0.6 : 1 }}
            >
              <table className="dl-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Journal</th>
                    <th>Source</th>
                    <th>Side</th>
                    <th className="gs-num">CGST</th>
                    <th className="gs-num">SGST</th>
                    <th className="gs-num">IGST</th>
                    <th className="gs-num">Net Effect</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row) => {
                    const side = SIDE_STYLES[row.side] || SIDE_STYLES.OUTPUT;

                    return (
                      <tr key={row.journalId}>
                        <td>{formatDate(row.postingDate)}</td>

                        <td>
                          <strong>{row.journalNumber}</strong>
                        </td>

                        <td>
                          <div className="dl-customer">
                            <strong>{row.sourceNumber}</strong>
                            <span>
                              {SOURCE_LABELS[row.sourceType] || row.sourceType}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span className={`dl-status ${side.className}`}>
                            <span className="dl-status-dot" />
                            {side.label}
                          </span>
                        </td>

                        <td className="gs-num">
                          <AmountCell paise={row.cgstPaise} />
                        </td>
                        <td className="gs-num">
                          <AmountCell paise={row.sgstPaise} />
                        </td>
                        <td className="gs-num">
                          <AmountCell paise={row.igstPaise} />
                        </td>
                        <td className="gs-num">
                          <strong>
                            <AmountCell paise={row.netPaise} />
                          </strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="dl-mobile-box-list">
              {rows.map((row) => {
                const side = SIDE_STYLES[row.side] || SIDE_STYLES.OUTPUT;

                return (
                  <div className="dl-mobile-card" key={row.journalId}>
                    <div className="dl-mobile-header">
                      <div>
                        <strong>{row.sourceNumber}</strong>
                        <span>
                          {SOURCE_LABELS[row.sourceType] || row.sourceType} ·{" "}
                          {formatDate(row.postingDate)}
                        </span>
                      </div>

                      <span className={`dl-status ${side.className}`}>
                        <span className="dl-status-dot" />
                        {side.label}
                      </span>
                    </div>

                    <div className="dl-mobile-grid">
                      <div>
                        <span>Journal</span>
                        <strong>{row.journalNumber}</strong>
                      </div>

                      <div>
                        <span>Net Effect</span>
                        <strong className={row.netPaise < 0 ? "gs-credit" : ""}>
                          {signedMoney(row.netPaise)}
                        </strong>
                      </div>

                      <div>
                        <span>CGST</span>
                        <strong>{signedMoney(row.cgstPaise)}</strong>
                      </div>

                      <div>
                        <span>SGST</span>
                        <strong>{signedMoney(row.sgstPaise)}</strong>
                      </div>

                      <div>
                        <span>IGST</span>
                        <strong>{signedMoney(row.igstPaise)}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="gs-legend">
              A positive amount increases GST payable (sales). A negative amount
              reduces it (purchases and sales returns).
            </div>
          </>
        )}

        {!dateRangeInvalid && !error && pagination.total > 0 && (
          <div className="dl-pagination">
            <div className="dl-pagination-info">
              <span>
                Showing <strong>{showingFrom}</strong> to{" "}
                <strong>{showingTo}</strong> of{" "}
                <strong>{pagination.total}</strong>
              </span>

              <select
                value={limit}
                onChange={(event) => {
                  setLimit(Number(event.target.value));
                  setPage(1);
                }}
              >
                {[10, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size} / page
                  </option>
                ))}
              </select>
            </div>

            <div className="dl-pagination-buttons">
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={pagination.page <= 1}
              >
                <ChevronsLeft size={14} />
              </button>

              <button
                type="button"
                onClick={() => setPage((previous) => Math.max(previous - 1, 1))}
                disabled={pagination.page <= 1}
              >
                <ChevronLeft size={14} />
              </button>

              {getPageNumbers(pagination.page, pagination.totalPages).map(
                (number) => (
                  <button
                    key={number}
                    type="button"
                    className={number === pagination.page ? "active" : ""}
                    onClick={() => setPage(number)}
                  >
                    {number}
                  </button>
                ),
              )}

              <button
                type="button"
                onClick={() =>
                  setPage((previous) =>
                    Math.min(previous + 1, pagination.totalPages),
                  )
                }
                disabled={pagination.page >= pagination.totalPages}
              >
                <ChevronRight size={14} />
              </button>

              <button
                type="button"
                onClick={() => setPage(pagination.totalPages)}
                disabled={pagination.page >= pagination.totalPages}
              >
                <ChevronsRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GstSummary;