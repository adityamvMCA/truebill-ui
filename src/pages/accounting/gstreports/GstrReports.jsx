import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  FileText,
  Landmark,
  ReceiptText,
  RefreshCw,
  Scale,
  Search,
  Settings2,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../../../services/api";
import "./GstrReports.css";

const REPORTS = [
  { key: "GSTR1", label: "GSTR-1" },
  { key: "GSTR3B", label: "GSTR-3B" },
];

const PERIODS = [
  { key: "thisMonth", label: "This Month" },
  { key: "lastMonth", label: "Last Month" },
  { key: "thisQuarter", label: "This Quarter" },
  { key: "thisFy", label: "This FY" },
  { key: "lastFy", label: "Last FY" },
  { key: "custom", label: "Custom" },
];

const SECTION_TABS = [
  { key: "B2B", label: "B2B" },
  { key: "B2C", label: "B2C" },
  { key: "CDNR", label: "Credit Notes" },
  { key: "HSN", label: "HSN Summary" },
];

const KIND_LABELS = {
  B2B: "B2B Invoice",
  B2C: "B2C Invoice",
  CREDIT_NOTE: "Credit Note",
};

const KIND_STYLES = {
  B2B: "dl-status-active",
  B2C: "dl-status-pending",
  CREDIT_NOTE: "dl-status-cancelled",
};

const EMPTY_SUMMARY = {
  invoiceCount: 0,
  creditNoteCount: 0,
  taxablePaise: 0,
  cgstPaise: 0,
  sgstPaise: 0,
  igstPaise: 0,
  totalTaxPaise: 0,
  invoiceValuePaise: 0,
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

const rupees = (paise) => Number(((Number(paise) || 0) / 100).toFixed(2));

const formatQuantity = (value) =>
  Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 4 });

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : "-";

const formatPeriodLabel = (period) =>
  period
    ? `${formatDate(`${period.fromDate}T00:00:00.000Z`)} to ${formatDate(`${period.toDate}T00:00:00.000Z`)}`
    : "Selected period";

const getNetStatus = (paise) => {
  if (paise > 0) return { label: "Payable", className: "dl-status-pending" };
  if (paise < 0) return { label: "Credit", className: "dl-status-active" };

  return { label: "Nil", className: "dl-status-created" };
};

const getErrorMessage = (error) => {
  const data = error?.response?.data;

  if (typeof data?.message === "string") return data.message;
  if (typeof data?.error === "string") return data.error;

  return error?.message || "Unable to load GSTR report. Please try again.";
};

const getPageNumbers = (page, totalPages) => {
  const size = 5;
  let start = Math.max(page - Math.floor(size / 2), 1);
  const end = Math.min(start + size - 1, totalPages);

  start = Math.max(end - size + 1, 1);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
};

const escapeCell = (value) => {
  let text = value === null || value === undefined ? "" : String(value);

  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) {
    text = `'${text}`;
  }

  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const downloadCsv = (filename, headers, rows) => {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(","));

  const blob = new Blob([`\uFEFF${lines.join("\r\n")}`], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

const amount = (key) => ({
  num: true,
  cell: (row) => money(row[key]),
  csv: (row) => rupees(row[key]),
});

const DOC_COLUMNS = [
  {
    label: "Date",
    cell: (row) => formatDate(row.documentDate),
    csv: (row) => formatDate(row.documentDate),
  },
  {
    label: "Document",
    cell: (row) => (
      <div className="dl-customer">
        <strong>{row.documentNumber}</strong>
        <span>{KIND_LABELS[row.kind] || row.kind}</span>
      </div>
    ),
    csv: (row) => row.documentNumber,
  },
  {
    label: "Customer",
    cell: (row) => row.customerName || "-",
    csv: (row) => row.customerName || "",
  },
  {
    label: "GSTIN",
    cell: (row) => row.gstin || "-",
    csv: (row) => row.gstin || "",
  },
  { label: "Taxable Value", ...amount("taxablePaise") },
  { label: "CGST", ...amount("cgstPaise") },
  { label: "SGST", ...amount("sgstPaise") },
  { label: "IGST", ...amount("igstPaise") },
  { label: "Total Value", ...amount("totalPaise") },
];

const HSN_COLUMNS = [
  {
    label: "HSN / SAC",
    cell: (row) => <strong>{row.hsnSacCode}</strong>,
    csv: (row) => row.hsnSacCode,
  },
  {
    label: "Unit",
    cell: (row) => row.unit,
    csv: (row) => row.unit,
  },
  {
    label: "Quantity",
    num: true,
    cell: (row) => formatQuantity(row.quantity),
    csv: (row) => row.quantity,
  },
  {
    label: "GST Rate",
    num: true,
    cell: (row) => `${row.gstRate}%`,
    csv: (row) => row.gstRate,
  },
  { label: "Taxable Value", ...amount("taxablePaise") },
  { label: "CGST", ...amount("cgstPaise") },
  { label: "SGST", ...amount("sgstPaise") },
  { label: "IGST", ...amount("igstPaise") },
  { label: "Total Value", ...amount("totalPaise") },
];

const getRowKey = (row) =>
  row.documentNumber
    ? `${row.kind}-${row.documentNumber}`
    : `${row.hsnSacCode}-${row.unit}-${row.gstRate}`;

function SummaryCard({ icon, label, value, note }) {
  return (
    <div className="gr-card">
      <div className="gr-card-icon">{icon}</div>

      <div className="gr-card-body">
        <span className="gr-card-label">{label}</span>
        <span className="gr-card-value">{value}</span>
        <span className="gr-card-note">{note}</span>
      </div>
    </div>
  );
}

function StatusBadge({ className, label }) {
  return (
    <span className={`dl-status ${className}`}>
      <span className="dl-status-dot" />
      {label}
    </span>
  );
}

function LoadingSkeleton({ columns = 8, rows = 5 }) {
  const template = `repeat(${columns}, 1fr)`;

  return (
    <div className="dl-loading">
      <div className="dl-loading-head" style={{ gridTemplateColumns: template }}>
        {Array.from({ length: columns }, (_, index) => (
          <span key={index} />
        ))}
      </div>

      {Array.from({ length: rows }, (_, rowIndex) => (
        <div
          key={rowIndex}
          className="dl-loading-row"
          style={{ gridTemplateColumns: template }}
        >
          {Array.from({ length: columns }, (_, index) => (
            <span key={index} />
          ))}
        </div>
      ))}
    </div>
  );
}

function GstrReports() {
  const navigate = useNavigate();

  const initialRange = useMemo(() => getPeriodRange("thisMonth"), []);

  const [report, setReport] = useState("GSTR1");
  const [period, setPeriod] = useState("thisMonth");
  const [fromDate, setFromDate] = useState(initialRange.from);
  const [toDate, setToDate] = useState(initialRange.to);
  const [section, setSection] = useState("B2B");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
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

      let payload;

      if (report === "GSTR1") {
        const response = await api.gstrReports.gstr1({
          fromDate,
          toDate,
          section,
          search: search || undefined,
          page,
          limit,
        });

        payload = response?.data;

        if (!payload || !payload.summary || !Array.isArray(payload.rows)) {
          throw new Error(
            "GSTR-1 response is invalid. Check the gstrReports API route.",
          );
        }
      } else {
        const response = await api.gstrReports.gstr3b({ fromDate, toDate });

        payload = response?.data;

        if (!payload || !Array.isArray(payload.payable)) {
          throw new Error(
            "GSTR-3B response is invalid. Check the gstrReports API route.",
          );
        }
      }

      if (requestId !== requestRef.current) return;

      setData(payload);
    } catch (requestError) {
      if (requestId !== requestRef.current) return;

      console.error("Unable to load GSTR report:", requestError);

      const message = getErrorMessage(requestError);

      setData(null);
      setError(message);
      toast.error(message);
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [report, fromDate, toDate, section, search, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  const switchReport = (key) => {
    if (key === report) return;

    setReport(key);
    setData(null);
    setError("");
    setPage(1);
  };

  const selectPeriod = (key) => {
    setPeriod(key);
    setPage(1);

    if (key === "custom") return;

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

  const selectSection = (key) => {
    setSection(key);
    setPage(1);
  };

  const clearFilters = () => {
    const range = getPeriodRange("thisMonth");

    setPeriod("thisMonth");
    setFromDate(range.from);
    setToDate(range.to);
    setSearchInput("");
    setSearch("");
    setSection("B2B");
    setPage(1);
  };

  const dateRangeInvalid = Boolean(fromDate && toDate && fromDate > toDate);

  const g1 = data && data.summary ? data : null;
  const g3 = data && data.payable ? data : null;

  const summary = g1?.summary || EMPTY_SUMMARY;
  const rateSummary = g1?.rateSummary || [];
  const rows = g1?.rows || [];
  const columns = section === "HSN" ? HSN_COLUMNS : DOC_COLUMNS;

  const pagination = g1?.pagination || {
    page: 1,
    limit,
    total: 0,
    totalPages: 0,
  };

  const showingFrom = pagination.total
    ? (pagination.page - 1) * pagination.limit + 1
    : 0;

  const showingTo = Math.min(
    pagination.page * pagination.limit,
    pagination.total,
  );

  const reconciliationMismatch = g3
    ? g3.reconciliation.filter((row) => row.differencePaise !== 0).length
    : 0;

  const netStatus = getNetStatus(g3?.totals?.netPaise || 0);

  const handleExport = async () => {
    if (exporting || loading || dateRangeInvalid) return;

    try {
      setExporting(true);

      if (report === "GSTR1") {
        const response = await api.gstrReports.gstr1({
          fromDate,
          toDate,
          section,
          search: search || undefined,
          exportAll: true,
        });

        const exportRows = response?.data?.rows || [];

        if (!exportRows.length) {
          toast.error("There is nothing to export for this selection");
          return;
        }

        downloadCsv(
          `GSTR1_${section}_${fromDate}_${toDate}.csv`,
          columns.map((column) => column.label),
          exportRows.map((row) => columns.map((column) => column.csv(row))),
        );
      } else {
        if (!g3) {
          toast.error("Load the report before exporting");
          return;
        }

        const headRows = g3.payable.map((row, index) => {
          const check = g3.reconciliation[index];

          return [
            row.taxHead,
            "",
            rupees(row.outputPaise),
            rupees(check?.ledgerPaise),
            rupees(check?.differencePaise),
            rupees(row.itcPaise),
            rupees(row.netPaise),
          ];
        });

        downloadCsv(
          `GSTR3B_${fromDate}_${toDate}.csv`,
          [
            "Tax Head",
            "Taxable Value",
            "Output Tax (Documents)",
            "Output Tax (Ledger)",
            "Difference",
            "ITC",
            "Net Payable",
          ],
          [
            ...headRows,
            [
              "Total",
              rupees(g3.outward.taxablePaise),
              rupees(g3.totals.outputPaise),
              "",
              "",
              rupees(g3.totals.itcPaise),
              rupees(g3.totals.netPaise),
            ],
          ],
        );
      }

      toast.success("Export ready");
    } catch (exportError) {
      console.error("Unable to export GSTR report:", exportError);
      toast.error(getErrorMessage(exportError));
    } finally {
      setExporting(false);
    }
  };

  const renderMobileCard = (row) => {
    if (section === "HSN") {
      return (
        <div className="dl-mobile-card" key={getRowKey(row)}>
          <div className="dl-mobile-header">
            <div>
              <strong>{row.hsnSacCode}</strong>
              <span>
                {row.unit} · {row.gstRate}% GST
              </span>
            </div>
          </div>

          <div className="dl-mobile-grid">
            <div>
              <span>Quantity</span>
              <strong>{formatQuantity(row.quantity)}</strong>
            </div>

            <div>
              <span>Taxable Value</span>
              <strong>{money(row.taxablePaise)}</strong>
            </div>

            <div>
              <span>CGST</span>
              <strong>{money(row.cgstPaise)}</strong>
            </div>

            <div>
              <span>SGST</span>
              <strong>{money(row.sgstPaise)}</strong>
            </div>

            <div>
              <span>IGST</span>
              <strong>{money(row.igstPaise)}</strong>
            </div>

            <div>
              <span>Total Value</span>
              <strong>{money(row.totalPaise)}</strong>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="dl-mobile-card" key={getRowKey(row)}>
        <div className="dl-mobile-header">
          <div>
            <strong>{row.documentNumber}</strong>
            <span>
              {KIND_LABELS[row.kind] || row.kind} ·{" "}
              {formatDate(row.documentDate)}
            </span>
          </div>

          <StatusBadge
            className={KIND_STYLES[row.kind] || "dl-status-created"}
            label={row.kind === "CREDIT_NOTE" ? "Credit" : row.kind}
          />
        </div>

        <div className="dl-mobile-grid">
          <div>
            <span>Customer</span>
            <strong>{row.customerName || "-"}</strong>
          </div>

          <div>
            <span>GSTIN</span>
            <strong>{row.gstin || "-"}</strong>
          </div>

          <div>
            <span>Taxable Value</span>
            <strong>{money(row.taxablePaise)}</strong>
          </div>

          <div>
            <span>Total Value</span>
            <strong>{money(row.totalPaise)}</strong>
          </div>

          <div>
            <span>CGST</span>
            <strong>{money(row.cgstPaise)}</strong>
          </div>

          <div>
            <span>SGST</span>
            <strong>{money(row.sgstPaise)}</strong>
          </div>

          <div>
            <span>IGST</span>
            <strong>{money(row.igstPaise)}</strong>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="data-list">
      <div className="dl-header">
        <div className="dl-header-content">
          <h1>GSTR Reports</h1>
          <p>GSTR-1 outward supplies and GSTR-3B tax summary for the period</p>
        </div>

        <button
          type="button"
          className="so-primary-button dl-add-button"
          onClick={handleExport}
          disabled={exporting || loading || dateRangeInvalid}
        >
          <Download size={14} />
          {exporting ? "Exporting..." : "Export CSV"}
        </button>
      </div>

      <div className="gr-switch">
        {REPORTS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={report === item.key ? "active" : ""}
            onClick={() => switchReport(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="dl-card gr-block">
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

          <button
            type="button"
            className="gr-refresh"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw
              size={13}
              className={loading ? "dl-refresh-icon-spin" : undefined}
            />
            Refresh
          </button>
        </div>

        {period === "custom" && (
          <div className="dl-filter-panel">
            <div className="dl-filter-header">
              <div>
                <strong>Custom Period</strong>
                <span>Choose the dates to report on</span>
              </div>

              <button type="button" onClick={clearFilters}>
                Reset
              </button>
            </div>

            <div className="dl-filter-grid">
              <div className="dl-field">
                <label htmlFor="gr-from-date">From Date</label>
                <input
                  id="gr-from-date"
                  type="date"
                  value={fromDate}
                  max={toDate || undefined}
                  onChange={(event) =>
                    handleDateChange("fromDate", event.target.value)
                  }
                />
              </div>

              <div className="dl-field">
                <label htmlFor="gr-to-date">To Date</label>
                <input
                  id="gr-to-date"
                  type="date"
                  value={toDate}
                  min={fromDate || undefined}
                  onChange={(event) =>
                    handleDateChange("toDate", event.target.value)
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {dateRangeInvalid && (
        <div className="dl-card gr-block">
          <div className="dl-state">
            <strong>Invalid date range</strong>
            <span>From date cannot be after to date.</span>
          </div>
        </div>
      )}

      {!dateRangeInvalid && report === "GSTR1" && (
        <>
          <div className="gr-cards">
            <SummaryCard
              icon={<FileText size={19} />}
              label="Invoices"
              value={summary.invoiceCount}
              note={`${summary.creditNoteCount} credit note(s) in this period`}
            />

            <SummaryCard
              icon={<ReceiptText size={19} />}
              label="Taxable Value"
              value={money(summary.taxablePaise)}
              note="Net of credit notes"
            />

            <SummaryCard
              icon={<TrendingUp size={19} />}
              label="Total Tax"
              value={money(summary.totalTaxPaise)}
              note={`CGST ${money(summary.cgstPaise)} · SGST ${money(summary.sgstPaise)} · IGST ${money(summary.igstPaise)}`}
            />

            <SummaryCard
              icon={<Scale size={19} />}
              label="Invoice Value"
              value={money(summary.invoiceValuePaise)}
              note="Taxable value plus tax"
            />
          </div>

          {rateSummary.length > 0 && (
            <div className="dl-card gr-block">
              <div className="gr-block-title">
                <h3>Rate-wise Summary</h3>
                <p>{formatPeriodLabel(g1?.period)}</p>
              </div>

              <div className="dl-table-wrapper">
                <table className="dl-table gr-table">
                  <thead>
                    <tr>
                      <th>GST Rate</th>
                      <th className="gr-num">Taxable Value</th>
                      <th className="gr-num">CGST</th>
                      <th className="gr-num">SGST</th>
                      <th className="gr-num">IGST</th>
                      <th className="gr-num">Total Tax</th>
                    </tr>
                  </thead>

                  <tbody>
                    {rateSummary.map((row) => (
                      <tr key={row.gstRate}>
                        <td>
                          <strong>{row.gstRate}%</strong>
                        </td>
                        <td className="gr-num">{money(row.taxablePaise)}</td>
                        <td className="gr-num">{money(row.cgstPaise)}</td>
                        <td className="gr-num">{money(row.sgstPaise)}</td>
                        <td className="gr-num">{money(row.igstPaise)}</td>
                        <td className="gr-num">{money(row.totalTaxPaise)}</td>
                      </tr>
                    ))}

                    <tr className="gr-total-row">
                      <td>Total</td>
                      <td className="gr-num">{money(summary.taxablePaise)}</td>
                      <td className="gr-num">{money(summary.cgstPaise)}</td>
                      <td className="gr-num">{money(summary.sgstPaise)}</td>
                      <td className="gr-num">{money(summary.igstPaise)}</td>
                      <td className="gr-num">
                        {money(summary.totalTaxPaise)}
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
                  placeholder={
                    section === "HSN"
                      ? "Search HSN / SAC or unit..."
                      : "Search document, customer or GSTIN..."
                  }
                />

                {searchInput && (
                  <button type="button" onClick={() => setSearchInput("")}>
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="dl-quick-filters">
              {SECTION_TABS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={section === item.key ? "active" : ""}
                  onClick={() => selectSection(item.key)}
                >
                  {item.label}
                  <span className="dl-quick-count">
                    {g1?.sectionCounts?.[item.key] ?? 0}
                  </span>
                </button>
              ))}
            </div>

            {loading && !g1 ? (
              <LoadingSkeleton columns={9} />
            ) : error ? (
              <div className="dl-state">
                <strong>Unable to load GSTR-1</strong>
                <span>{error}</span>
                <button type="button" onClick={load}>
                  Try again
                </button>
              </div>
            ) : !rows.length ? (
              <div className="dl-state">
                <Landmark size={26} />
                <strong>No records found</strong>
                <span>
                  No {SECTION_TABS.find((tab) => tab.key === section)?.label}{" "}
                  entries match this period or search.
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
                        {columns.map((column) => (
                          <th
                            key={column.label}
                            className={column.num ? "gr-num" : undefined}
                          >
                            {column.label}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {rows.map((row) => (
                        <tr key={getRowKey(row)}>
                          {columns.map((column) => (
                            <td
                              key={column.label}
                              className={column.num ? "gr-num" : undefined}
                            >
                              {column.cell(row)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="dl-mobile-box-list">
                  {rows.map((row) => renderMobileCard(row))}
                </div>

                {section === "CDNR" && (
                  <div className="gr-legend">
                    Credit notes are posted sales returns. They are deducted
                    from the totals above.
                  </div>
                )}
              </>
            )}

            {!error && pagination.total > 0 && (
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
                    onClick={() =>
                      setPage((previous) => Math.max(previous - 1, 1))
                    }
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
        </>
      )}

      {!dateRangeInvalid && report === "GSTR3B" && (
        <>
          {g3 && !g3.configured && (
            <div className="gr-notice">
              <div>
                <strong>GST ledgers are not configured</strong>
                <span>
                  Input tax credit and reconciliation need your tax ledgers
                  mapped in Tax Configuration.
                </span>
              </div>

              <button
                type="button"
                className="so-primary-button"
                onClick={() => navigate("/gst-tax/configuration")}
              >
                <Settings2 size={14} />
                Configure Now
              </button>
            </div>
          )}

          <div className="gr-cards">
            <SummaryCard
              icon={<TrendingUp size={19} />}
              label="Output Tax"
              value={money(g3?.totals?.outputPaise)}
              note="From invoices, net of credit notes"
            />

            <SummaryCard
              icon={<TrendingDown size={19} />}
              label="Input Tax Credit"
              value={money(g3?.totals?.itcPaise)}
              note="From the input tax ledgers"
            />

            <SummaryCard
              icon={<Scale size={19} />}
              label={
                (g3?.totals?.netPaise || 0) < 0
                  ? "Net Credit Available"
                  : "Net Tax Payable"
              }
              value={money(Math.abs(g3?.totals?.netPaise || 0))}
              note={`Output minus ITC · ${netStatus.label}`}
            />

            <SummaryCard
              icon={<ShieldCheck size={19} />}
              label="Reconciliation"
              value={
                !g3
                  ? "-"
                  : reconciliationMismatch
                    ? `${reconciliationMismatch} mismatch`
                    : "Matched"
              }
              note="Documents against ledgers"
            />
          </div>

          {loading && !g3 && (
            <div className="dl-card gr-block">
              <LoadingSkeleton columns={5} rows={3} />
            </div>
          )}

          {error && (
            <div className="dl-card gr-block">
              <div className="dl-state">
                <strong>Unable to load GSTR-3B</strong>
                <span>{error}</span>
                <button type="button" onClick={load}>
                  Try again
                </button>
              </div>
            </div>
          )}

          {g3 && !error && (
            <>
              <div className="dl-card gr-block">
                <div className="gr-block-title">
                  <h3>3.1 Outward Supplies</h3>
                  <p>{formatPeriodLabel(g3.period)}</p>
                </div>

                <div className="dl-table-wrapper">
                  <table className="dl-table gr-table">
                    <thead>
                      <tr>
                        <th>Nature of Supplies</th>
                        <th className="gr-num">Taxable Value</th>
                        <th className="gr-num">IGST</th>
                        <th className="gr-num">CGST</th>
                        <th className="gr-num">SGST</th>
                      </tr>
                    </thead>

                    <tbody>
                      <tr>
                        <td>
                          <strong>Outward taxable supplies</strong>
                        </td>
                        <td className="gr-num">
                          {money(g3.outward.taxablePaise)}
                        </td>
                        <td className="gr-num">{money(g3.outward.igstPaise)}</td>
                        <td className="gr-num">{money(g3.outward.cgstPaise)}</td>
                        <td className="gr-num">{money(g3.outward.sgstPaise)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="dl-card gr-block">
                <div className="gr-block-title">
                  <h3>4. Eligible Input Tax Credit</h3>
                  <p>Net of reversals, from the input tax ledgers</p>
                </div>

                <div className="dl-table-wrapper">
                  <table className="dl-table gr-table">
                    <thead>
                      <tr>
                        <th>Details</th>
                        <th className="gr-num">IGST</th>
                        <th className="gr-num">CGST</th>
                        <th className="gr-num">SGST</th>
                        <th className="gr-num">Total</th>
                      </tr>
                    </thead>

                    <tbody>
                      <tr>
                        <td>
                          <strong>ITC available</strong>
                        </td>
                        <td className="gr-num">{money(g3.itc.igstPaise)}</td>
                        <td className="gr-num">{money(g3.itc.cgstPaise)}</td>
                        <td className="gr-num">{money(g3.itc.sgstPaise)}</td>
                        <td className="gr-num">{money(g3.itc.totalPaise)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="dl-card gr-block">
                <div className="gr-block-title">
                  <h3>Tax Payable</h3>
                  <p>Output tax minus input tax credit for each tax head</p>
                </div>

                <div className="dl-table-wrapper">
                  <table className="dl-table gr-table">
                    <thead>
                      <tr>
                        <th>Tax Head</th>
                        <th className="gr-num">Output Tax</th>
                        <th className="gr-num">ITC</th>
                        <th className="gr-num">Net</th>
                        <th>Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {g3.payable.map((row) => {
                        const status = getNetStatus(row.netPaise);

                        return (
                          <tr key={row.taxHead}>
                            <td>
                              <strong>{row.taxHead}</strong>
                            </td>
                            <td className="gr-num">{money(row.outputPaise)}</td>
                            <td className="gr-num">{money(row.itcPaise)}</td>
                            <td className="gr-num">
                              {signedMoney(row.netPaise)}
                            </td>
                            <td>
                              <StatusBadge
                                className={status.className}
                                label={status.label}
                              />
                            </td>
                          </tr>
                        );
                      })}

                      <tr className="gr-total-row">
                        <td>Total</td>
                        <td className="gr-num">
                          {money(g3.totals.outputPaise)}
                        </td>
                        <td className="gr-num">{money(g3.totals.itcPaise)}</td>
                        <td className="gr-num">
                          {signedMoney(g3.totals.netPaise)}
                        </td>
                        <td>
                          <StatusBadge
                            className={netStatus.className}
                            label={netStatus.label}
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="gr-legend">
                  Credit of one tax head is not used against another. IGST
                  credit cross-utilisation is not applied here.
                </div>
              </div>

              <div className="dl-card gr-block">
                <div className="gr-block-title">
                  <h3>Output Tax Reconciliation</h3>
                  <p>Tax on invoices and credit notes against the ledgers</p>
                </div>

                <div className="dl-table-wrapper">
                  <table className="dl-table gr-table">
                    <thead>
                      <tr>
                        <th>Tax Head</th>
                        <th className="gr-num">Per Documents</th>
                        <th className="gr-num">Per Ledger</th>
                        <th className="gr-num">Difference</th>
                        <th>Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {g3.reconciliation.map((row) => {
                        const matched = row.differencePaise === 0;

                        return (
                          <tr key={row.taxHead}>
                            <td>
                              <strong>{row.taxHead}</strong>
                            </td>
                            <td className="gr-num">
                              {money(row.documentPaise)}
                            </td>
                            <td className="gr-num">{money(row.ledgerPaise)}</td>
                            <td
                              className={
                                matched ? "gr-num" : "gr-num gr-diff"
                              }
                            >
                              {signedMoney(row.differencePaise)}
                            </td>
                            <td>
                              {!row.mapped ? (
                                <StatusBadge
                                  className="dl-status-inactive"
                                  label="Not mapped"
                                />
                              ) : (
                                <StatusBadge
                                  className={
                                    matched
                                      ? "dl-status-active"
                                      : "dl-status-cancelled"
                                  }
                                  label={matched ? "Matched" : "Mismatch"}
                                />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="gr-legend">
                  A mismatch means tax on invoices was not posted to the mapped
                  output tax ledger, or was posted to a different ledger.
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default GstrReports;