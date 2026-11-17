import { memo, useDeferredValue, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, RefreshCw, Search } from "lucide-react";

import profitLossApi from "../../../services/modules/profitLossApi";
import useReport from "../../../hooks/useReport";
import { downloadCsv } from "../../../components/common/VoucherListPage/csv";

import "./ProfitLoss.css";
import {
  CardsSkeleton,
  TableSkeletonRows,
} from "../../../components/common/Skeleton/ListPageSkeleton";

// Change this to your ledger statement route.
const LEDGER_ROUTE = (code) => `/accounting/ledgers/${encodeURIComponent(code)}`;

const pad = (value) => String(value).padStart(2, "0");

const toLocalDate = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const getPeriodRange = (key, today = new Date()) => {
  const year = today.getFullYear();
  const month = today.getMonth();
  const fyStartYear = month >= 3 ? year : year - 1;

  switch (key) {
    case "lastMonth":
      return {
        from: toLocalDate(new Date(year, month - 1, 1)),
        to: toLocalDate(new Date(year, month, 0)),
      };

    case "thisQuarter": {
      const quarter = Math.floor(((month + 9) % 12) / 3);
      const startMonth = (3 + quarter * 3) % 12;
      const startYear = startMonth > month ? year - 1 : year;

      return {
        from: toLocalDate(new Date(startYear, startMonth, 1)),
        to: toLocalDate(new Date(startYear, startMonth + 3, 0)),
      };
    }

    case "thisMonth":
      return {
        from: toLocalDate(new Date(year, month, 1)),
        to: toLocalDate(new Date(year, month + 1, 0)),
      };

    case "lastFy":
      return {
        from: toLocalDate(new Date(fyStartYear - 1, 3, 1)),
        to: toLocalDate(new Date(fyStartYear, 2, 31)),
      };

    default:
      // This FY, from 1 April up to today
      return {
        from: toLocalDate(new Date(fyStartYear, 3, 1)),
        to: toLocalDate(today),
      };
  }
};

const PERIODS = [
  { key: "thisMonth", label: "This Month" },
  { key: "lastMonth", label: "Last Month" },
  { key: "thisQuarter", label: "This Quarter" },
  { key: "thisFy", label: "This FY" },
  { key: "lastFy", label: "Last FY" },
  { key: "custom", label: "Custom" },
];

const SECTION_OPTIONS = [
  { value: "ALL", label: "All sections" },
  { value: "SALES", label: "Sales" },
  { value: "DIRECT_INCOME", label: "Direct income" },
  { value: "PURCHASE", label: "Purchases" },
  { value: "DIRECT_EXPENSE", label: "Direct expenses" },
  { value: "INDIRECT_INCOME", label: "Indirect income" },
  { value: "INDIRECT_EXPENSE", label: "Indirect expenses" },
];

const SECTION_TITLES = {
  SALES: ["Sales", "Net Sales"],
  DIRECT_INCOME: ["Direct Income", "Total Direct Income"],
  PURCHASE: ["Purchases", "Net Purchases"],
  DIRECT_EXPENSE: ["Direct Expenses", "Total Direct Expenses"],
  INDIRECT_INCOME: ["Indirect Income", "Total Indirect Income"],
  INDIRECT_EXPENSE: ["Indirect Expenses", "Total Indirect Expenses"],
};

const MAX_RANGE_DAYS = 400;

const currencyFmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// P&L amounts can be negative (loss), so keep the sign.
const money = (paise) => {
  const value = (Number(paise) || 0) / 100;

  return value < 0
    ? `-${currencyFmt.format(Math.abs(value))}`
    : currencyFmt.format(value);
};

const rupeeNumber = (paise) => ((Number(paise) || 0) / 100).toFixed(2);

const percent = (part, whole) =>
  whole ? `${((part / whole) * 100).toFixed(1)}%` : "—";

const changeText = (current, previous) => {
  if (!previous) return "—";

  const pct = ((current - previous) / Math.abs(previous)) * 100;

  return `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`;
};

const toPaise = (value) => {
  const number = Number(value);

  return Number.isFinite(number) && number > 0 ? Math.round(number * 100) : 0;
};

const daysBetween = (from, to) =>
  (new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / 86400000;

/* ---------- API wiring (module level = stable) ---------- */
const fetchProfitLoss = (params, config) =>
  profitLossApi.getProfitLoss(params, config);

const parseProfitLoss = (response) => {
  const body = response?.data;

  if (!body?.success || !body?.data || !Array.isArray(body.rows)) {
    throw new Error(body?.message || "Invalid profit and loss response.");
  }

  return { rows: body.rows, meta: body.data };
};

/* ---------- totals ---------- */
const sumSection = (rows, section, key) =>
  rows
    .filter((row) => row.section === section)
    .reduce((total, row) => total + (Number(row[key]) || 0), 0);

// Stock is not posted in the books, so it is an input. Previous-period figures
// are computed without stock adjustments.
const computeMetrics = (rows, key, stock) => {
  const sales = sumSection(rows, "SALES", key);
  const directIncome = sumSection(rows, "DIRECT_INCOME", key);
  const purchases = sumSection(rows, "PURCHASE", key);
  const directExpense = sumSection(rows, "DIRECT_EXPENSE", key);
  const indirectIncome = sumSection(rows, "INDIRECT_INCOME", key);
  const indirectExpense = sumSection(rows, "INDIRECT_EXPENSE", key);

  const cogs = stock.opening + purchases + directExpense - stock.closing;
  const gross = sales + directIncome - cogs;
  const net = gross + indirectIncome - indirectExpense;

  return {
    SALES: sales,
    DIRECT_INCOME: directIncome,
    PURCHASE: purchases,
    DIRECT_EXPENSE: directExpense,
    INDIRECT_INCOME: indirectIncome,
    INDIRECT_EXPENSE: indirectExpense,
    cogs,
    gross,
    net,
    totalExpense: cogs + indirectExpense,
  };
};

/* ---------- memoised row ---------- */
const PlRow = memo(function PlRow({
  line,
  compare,
  netSales,
  onOpenLedger,
}) {
  if (line.kind === "header") {
    return (
      <tr className="pl-row-header">
        <td colSpan={compare ? 5 : 3}>{line.label}</td>
      </tr>
    );
  }

  if (line.kind === "empty") {
    return (
      <tr className="pl-row-empty">
        <td colSpan={compare ? 5 : 3}>{line.label}</td>
      </tr>
    );
  }

  const isResult = line.kind === "result";
  const negative = line.cur < 0;

  const rowClass = {
    ledger: "pl-row-ledger",
    stock: "pl-row-ledger",
    subtotal: "pl-row-subtotal",
    total: "pl-row-total",
    result: `pl-row-result ${negative ? "is-loss" : "is-profit"}`,
  }[line.kind];

  return (
    <tr className={rowClass}>
      <td className="pl-particulars">
        {line.code ? (
          <button
            type="button"
            className="pl-link"
            onClick={() => onOpenLedger(line.code)}
          >
            {line.label}
          </button>
        ) : (
          <span>{line.label}</span>
        )}
        {line.sub && <small className="pl-subtext">{line.sub}</small>}
      </td>

      <td className={`pl-number ${line.cur === 0 ? "pl-zero" : ""}`}>
        {line.cur === 0 && line.kind === "ledger" ? "—" : money(line.cur)}
      </td>

      {!compare && (
        <td className="pl-number pl-muted">
          {line.kind === "stock" ? "—" : percent(line.cur, netSales)}
        </td>
      )}

      {compare && (
        <>
          <td className="pl-number pl-muted">{percent(line.cur, netSales)}</td>
          <td className="pl-number">{money(line.prev)}</td>
          <td
            className={`pl-number ${
              line.cur - line.prev >= 0 ? "pl-up" : "pl-down"
            }`}
          >
            {isResult || line.kind === "total" || line.kind === "subtotal"
              ? `${money(line.cur - line.prev)} (${changeText(line.cur, line.prev)})`
              : changeText(line.cur, line.prev)}
          </td>
        </>
      )}
    </tr>
  );
});

/* ---------- T-format (Trading A/c + P&L A/c, Dr left / Cr right) ---------- */
const sumItems = (items) => items.reduce((total, item) => total + item.amount, 0);

const TCell = ({ item, onOpenLedger }) =>
  item ? (
    <>
      <td className={`pl-t-label ${item.strong ? "is-strong" : ""}`}>
        {item.code ? (
          <button
            type="button"
            className="pl-link"
            onClick={() => onOpenLedger(item.code)}
          >
            {item.label}
          </button>
        ) : (
          <span>{item.label}</span>
        )}
        {item.sub && <small className="pl-subtext">{item.sub}</small>}
      </td>
      <td className={`pl-number ${item.strong ? "is-strong" : ""}`}>
        {money(item.amount)}
      </td>
    </>
  ) : (
    <>
      <td />
      <td />
    </>
  );

function TAccount({ title, left, right, onOpenLedger }) {
  const size = Math.max(left.length, right.length);
  const totalLeft = sumItems(left);
  const totalRight = sumItems(right);

  return (
    <section className="pl-table-card pl-t-card" aria-label={title}>
      <div className="pl-table-scroll" tabIndex={0} role="region" aria-label={`${title} table`}>
        <table className="pl-table pl-t-table">
          <thead>
            <tr>
              <th scope="col">Dr · Particulars</th>
              <th scope="col" className="pl-num">Amount</th>
              <th scope="col">Cr · Particulars</th>
              <th scope="col" className="pl-num">Amount</th>
            </tr>
          </thead>

          <tbody>
            <tr className="pl-row-header">
              <td colSpan={4}>{title}</td>
            </tr>

            {Array.from({ length: size }, (_, index) => (
              <tr key={index} className="pl-t-row">
                <TCell item={left[index]} onOpenLedger={onOpenLedger} />
                <TCell item={right[index]} onOpenLedger={onOpenLedger} />
              </tr>
            ))}

            {size === 0 && (
              <tr>
                <td colSpan={4} className="pl-empty">No entries</td>
              </tr>
            )}

            <tr className="pl-row-total">
              <td>Total</td>
              <td className="pl-number">{money(totalLeft)}</td>
              <td>Total</td>
              <td className="pl-number">{money(totalRight)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TFormat({ rows, cur, stock, onOpenLedger }) {
  // Every ledger with activity is shown so both sides always tally.
  const active = rows.filter((row) => row.amountPaise !== 0);

  const ledgerItems = (section) =>
    active
      .filter((row) => row.section === section)
      .map((row) => ({
        id: row._id,
        label: row.name,
        sub: row.groupName || row.code,
        code: row.code,
        amount: row.amountPaise,
      }));

  const gross = cur.gross;
  const net = cur.net;

  const tradingLeft = [
    ...(stock.opening ? [{ id: "os", label: "Opening Stock", amount: stock.opening }] : []),
    ...ledgerItems("PURCHASE"),
    ...ledgerItems("DIRECT_EXPENSE"),
    ...(gross >= 0
      ? [{ id: "gp", label: "Gross Profit c/d", amount: gross, strong: true }]
      : []),
  ];

  const tradingRight = [
    ...ledgerItems("SALES"),
    ...ledgerItems("DIRECT_INCOME"),
    ...(stock.closing ? [{ id: "cs", label: "Closing Stock", amount: stock.closing }] : []),
    ...(gross < 0
      ? [{ id: "gl", label: "Gross Loss c/d", amount: -gross, strong: true }]
      : []),
  ];

  const plLeft = [
    ...(gross < 0
      ? [{ id: "glb", label: "Gross Loss b/d", amount: -gross, strong: true }]
      : []),
    ...ledgerItems("INDIRECT_EXPENSE"),
    ...(net >= 0
      ? [{ id: "np", label: "Net Profit c/d", amount: net, strong: true }]
      : []),
  ];

  const plRight = [
    ...(gross > 0
      ? [{ id: "gpb", label: "Gross Profit b/d", amount: gross, strong: true }]
      : []),
    ...ledgerItems("INDIRECT_INCOME"),
    ...(net < 0
      ? [{ id: "nl", label: "Net Loss c/d", amount: -net, strong: true }]
      : []),
  ];

  return (
    <>
      <TAccount
        title="Trading Account"
        left={tradingLeft}
        right={tradingRight}
        onOpenLedger={onOpenLedger}
      />

      <div className="pl-t-gap" />

      <TAccount
        title="Profit & Loss Account"
        left={plLeft}
        right={plRight}
        onOpenLedger={onOpenLedger}
      />
    </>
  );
}

export default function ProfitLoss() {
  const navigate = useNavigate();

  const initial = useMemo(() => getPeriodRange("thisFy"), []);

  const [period, setPeriod] = useState("thisFy");
  const [fromDate, setFromDate] = useState(initial.from);
  const [toDate, setToDate] = useState(initial.to);
  const [search, setSearch] = useState("");
  const [section, setSection] = useState("ALL");
  const [includeZero, setIncludeZero] = useState(false);
  const [compare, setCompare] = useState(false);
  const [view, setView] = useState("STATEMENT");
  const [openingStock, setOpeningStock] = useState("");
  const [closingStock, setClosingStock] = useState("");

  const rangeError = useMemo(() => {
    if (!fromDate || !toDate) return "From and to dates are required.";
    if (fromDate > toDate) return "From date cannot be after to date.";
    if (daysBetween(fromDate, toDate) + 1 > MAX_RANGE_DAYS) {
      return `Choose a period of at most ${MAX_RANGE_DAYS} days.`;
    }

    return "";
  }, [fromDate, toDate]);

  // ONE request per period / compare toggle. Search, section, zero-balance
  // and stock inputs are applied locally, so they never refetch.
  const {
    data,
    fetching,
    error: loadError,
    refresh,
  } = useReport({
    namespace: "profit-loss",
    fetchData: fetchProfitLoss,
    parse: parseProfitLoss,
    params: { fromDate, toDate, compare },
    enabled: !rangeError,
  });

  const error = rangeError || loadError;
  const query = useDeferredValue(search).trim().toLowerCase();

  const stock = useMemo(
    () => ({ opening: toPaise(openingStock), closing: toPaise(closingStock) }),
    [openingStock, closingStock],
  );

  const hasCompare = Boolean(data?.meta?.compare);

  const metrics = useMemo(() => {
    if (!data) return null;

    return {
      cur: computeMetrics(data.rows, "amountPaise", stock),
      prev: computeMetrics(data.rows, "previousPaise", { opening: 0, closing: 0 }),
    };
  }, [data, stock]);

  const visibleRows = useMemo(() => {
    if (!data) return [];

    return data.rows.filter((row) => {
      if (!includeZero && row.amountPaise === 0 && row.previousPaise === 0) {
        return false;
      }

      if (!query) return true;

      return (
        (row.code || "").toLowerCase().includes(query) ||
        (row.name || "").toLowerCase().includes(query) ||
        (row.groupName || "").toLowerCase().includes(query)
      );
    });
  }, [data, includeZero, query]);

  const lines = useMemo(() => {
    if (!data || !metrics) return [];

    const { cur, prev } = metrics;
    const output = [];

    const addBlock = (key) => {
      const list = visibleRows.filter((row) => row.section === key);

      if (!list.length && cur[key] === 0 && prev[key] === 0) return;

      output.push({ id: `h-${key}`, kind: "header", label: SECTION_TITLES[key][0] });

      for (const row of list) {
        output.push({
          id: row._id,
          kind: "ledger",
          label: row.name,
          sub: row.groupName || row.code,
          code: row.code,
          cur: row.amountPaise,
          prev: row.previousPaise,
        });
      }

      output.push({
        id: `t-${key}`,
        kind: "subtotal",
        label: SECTION_TITLES[key][1],
        cur: cur[key],
        prev: prev[key],
      });
    };

    if (section !== "ALL") {
      addBlock(section);
      return output;
    }

    addBlock("SALES");
    addBlock("DIRECT_INCOME");
    addBlock("PURCHASE");
    addBlock("DIRECT_EXPENSE");

    if (stock.opening || stock.closing) {
      output.push({ id: "h-stock", kind: "header", label: "Stock Adjustment" });
      output.push({
        id: "stock-open",
        kind: "stock",
        label: "Opening Stock",
        sub: "Entered manually",
        cur: stock.opening,
        prev: 0,
      });
      output.push({
        id: "stock-close",
        kind: "stock",
        label: "Less: Closing Stock",
        sub: "Entered manually",
        cur: -stock.closing,
        prev: 0,
      });
    }

    output.push({
      id: "cogs",
      kind: "total",
      label: "Cost of Goods Sold",
      cur: cur.cogs,
      prev: prev.cogs,
    });
    output.push({
      id: "gross",
      kind: "result",
      label: cur.gross < 0 ? "Gross Loss" : "Gross Profit",
      cur: cur.gross,
      prev: prev.gross,
    });

    addBlock("INDIRECT_INCOME");
    addBlock("INDIRECT_EXPENSE");

    output.push({
      id: "net",
      kind: "result",
      label: cur.net < 0 ? "Net Loss" : "Net Profit",
      cur: cur.net,
      prev: prev.net,
    });

    return output;
  }, [data, metrics, visibleRows, section, stock]);

  const ready = Boolean(data) && !error;
  const showSkeleton = data === null && !error;
  const dim = fetching && ready ? { opacity: 0.6, transition: "opacity .15s" } : undefined;

  const cur = metrics?.cur;
  const prev = metrics?.prev;
  const netSales = cur?.SALES || 0;
  const colCount = hasCompare ? 5 : 3;

  const selectPeriod = (key) => {
    setPeriod(key);

    if (key === "custom") return;

    const range = getPeriodRange(key);

    setFromDate(range.from);
    setToDate(range.to);
  };

  const changeDate = (name, value) => {
    setPeriod("custom");

    if (name === "from") setFromDate(value);
    else setToDate(value);
  };

  const openLedger = (code) =>
    navigate(`${LEDGER_ROUTE(code)}?startDate=${fromDate}&endDate=${toDate}`);

  const exportCsv = () => {
    if (!ready || !lines.length) return;

    const exportLines = lines.filter(
      (line) => line.kind !== "header" && line.kind !== "empty",
    );

    downloadCsv({
      fileName: `profit-and-loss-${fromDate}-to-${toDate}.csv`,
      meta: [
        ["Profit & Loss", `${fromDate} to ${toDate}`],
        ["Section", section === "ALL" ? "All" : section],
        ["Opening Stock (INR)", rupeeNumber(stock.opening)],
        ["Closing Stock (INR)", rupeeNumber(stock.closing)],
        [],
      ],
      columns: [
        { header: "Particulars", value: (line) => line.label },
        { header: "Group / Note", value: (line) => line.sub || "" },
        { header: "Amount (INR)", value: (line) => rupeeNumber(line.cur) },
        {
          header: "% of Net Sales",
          value: (line) => percent(line.cur, netSales),
        },
        ...(hasCompare
          ? [
              {
                header: "Previous Period (INR)",
                value: (line) => rupeeNumber(line.prev),
              },
              {
                header: "Change %",
                value: (line) => changeText(line.cur, line.prev),
              },
            ]
          : []),
      ],
      rows: exportLines,
      footer: [[], ["NET PROFIT / (LOSS)", "", rupeeNumber(cur.net)]],
    });
  };

  const trend = (current, previous) =>
    hasCompare ? `${changeText(current, previous)} vs previous period` : " ";

  return (
    <main className="pl-page">
      <header className="pl-header">
        <div className="pl-heading">
          <button
            type="button"
            className="pl-back"
            aria-label="Go back"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={18} />
          </button>

          <div className="pl-title">
            <h1>Profit &amp; Loss</h1>
            <p>
              {fromDate} to {toDate}
              {hasCompare && data?.meta?.previousPeriod
                ? ` · vs ${data.meta.previousPeriod.fromDate} to ${data.meta.previousPeriod.toDate}`
                : ""}
              {ready ? ` · ${visibleRows.length} ledgers` : ""}
            </p>
          </div>
        </div>

        <div className="pl-actions">
          <button
            type="button"
            className="pl-button"
            onClick={exportCsv}
            disabled={!ready || !lines.length}
          >
            <Download size={16} />
            Export
          </button>

          <button
            type="button"
            className="pl-button pl-button-primary"
            disabled={fetching || Boolean(rangeError)}
            onClick={refresh}
          >
            <RefreshCw size={16} className={fetching ? "pl-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      {/* Summary */}
      <section className="pl-cards" aria-label="Profit and loss summary" aria-busy={showSkeleton}>
        {showSkeleton ? (
          <CardsSkeleton count={4} className="pl-card" />
        ) : (
          <>
            <article className="pl-card" style={dim}>
              <span>Net Sales</span>
              <strong className="pl-primary-text">{ready ? money(cur.SALES) : "—"}</strong>
              <small>{ready ? trend(cur.SALES, prev.SALES) : " "}</small>
            </article>

            <article className={`pl-card ${ready ? (cur.gross < 0 ? "is-loss" : "is-profit") : ""}`} style={dim}>
              <span>{ready && cur.gross < 0 ? "Gross Loss" : "Gross Profit"}</span>
              <strong className={ready && cur.gross < 0 ? "pl-out" : "pl-in"}>
                {ready ? money(cur.gross) : "—"}
              </strong>
              <small>
                {ready
                  ? `${percent(cur.gross, netSales)} margin${hasCompare ? ` · ${changeText(cur.gross, prev.gross)}` : ""}`
                  : " "}
              </small>
            </article>

            <article className="pl-card" style={dim}>
              <span>Total Expenses</span>
              <strong className="pl-out">{ready ? money(cur.totalExpense) : "—"}</strong>
              <small>{ready ? trend(cur.totalExpense, prev.totalExpense) : " "}</small>
            </article>

            <article className={`pl-card ${ready ? (cur.net < 0 ? "is-loss" : "is-profit") : ""}`} style={dim}>
              <span>{ready && cur.net < 0 ? "Net Loss" : "Net Profit"}</span>
              <strong className={ready && cur.net < 0 ? "pl-out" : "pl-in"}>
                {ready ? money(cur.net) : "—"}
              </strong>
              <small>
                {ready
                  ? `${percent(cur.net, netSales)} margin${hasCompare ? ` · ${changeText(cur.net, prev.net)}` : ""}`
                  : " "}
              </small>
            </article>
          </>
        )}
      </section>

      {/* Filters */}
      <section className="pl-filters" aria-label="Profit and loss filters">
        <div className="pl-search">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            value={search}
            aria-label="Search ledgers"
            placeholder="Search code, name, group..."
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <label className="pl-date">
          <span>From Date</span>
          <input
            type="date"
            value={fromDate}
            max={toDate || undefined}
            onChange={(event) => changeDate("from", event.target.value)}
          />
        </label>

        <label className="pl-date">
          <span>To Date</span>
          <input
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(event) => changeDate("to", event.target.value)}
          />
        </label>

        <label className="pl-select-wrap">
          <span>Section</span>
          <select value={section} onChange={(event) => setSection(event.target.value)}>
            {SECTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="pl-check" title="Show ledgers with no activity">
          <input
            type="checkbox"
            checked={includeZero}
            onChange={(event) => setIncludeZero(event.target.checked)}
          />
          Zero ledgers
        </label>

        <label className="pl-check" title="Compare with the previous period of the same length">
          <input
            type="checkbox"
            checked={compare}
            onChange={(event) => setCompare(event.target.checked)}
          />
          Compare
        </label>
      </section>

      <div className="pl-chips" role="tablist" aria-label="Period">
        {PERIODS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={period === item.key}
            className={`pl-chip ${period === item.key ? "is-active" : ""}`}
            onClick={() => selectPeriod(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="pl-view" role="tablist" aria-label="Report layout">
        {[
          { key: "STATEMENT", label: "Statement" },
          { key: "T", label: "T-Format" },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={view === item.key}
            className={view === item.key ? "is-active" : ""}
            onClick={() => setView(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <section className="pl-stock" aria-label="Stock valuation">
        <div className="pl-stock-text">
          <strong>Stock valuation</strong>
          <span>
            Stock is not posted in the books. Enter the values to get the right
            gross profit.
          </span>
        </div>

        <label className="pl-date">
          <span>Opening Stock (₹)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={openingStock}
            placeholder="0.00"
            onChange={(event) => setOpeningStock(event.target.value)}
          />
        </label>

        <label className="pl-date">
          <span>Closing Stock (₹)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={closingStock}
            placeholder="0.00"
            onChange={(event) => setClosingStock(event.target.value)}
          />
        </label>
      </section>

      {error && (
        <div className="pl-error" role="alert">
          {error}
        </div>
      )}

      {/* Statement / T-format */}
      {view === "T" && ready ? (
        <TFormat
          rows={data.rows}
          cur={cur}
          stock={stock}
          onOpenLedger={openLedger}
        />
      ) : (
      <section className="pl-table-card" aria-label="Profit and loss statement" aria-busy={showSkeleton}>
        <div className="pl-table-scroll" tabIndex={0} role="region" aria-label="Scrollable profit and loss table">
          <table className={`pl-table ${hasCompare ? "has-compare" : ""}`}>
            <thead>
              <tr>
                <th scope="col">Particulars</th>
                <th scope="col" className="pl-num">
                  Amount
                </th>
                <th scope="col" className="pl-num">
                  % of Net Sales
                </th>
                {hasCompare && (
                  <>
                    <th scope="col" className="pl-num">
                      Previous
                    </th>
                    <th scope="col" className="pl-num">
                      Change
                    </th>
                  </>
                )}
              </tr>
            </thead>

            <tbody style={dim}>
              {showSkeleton ? (
                <TableSkeletonRows columns={colCount} rows={12} />
              ) : error ? (
                <tr>
                  <td colSpan={colCount} className="pl-empty">
                    Unable to display profit and loss.
                  </td>
                </tr>
              ) : !lines.length ? (
                <tr>
                  <td colSpan={colCount} className="pl-empty">
                    No income or expense entries in this period.
                  </td>
                </tr>
              ) : (
                lines.map((line) => (
                  <PlRow
                    key={line.id}
                    line={line}
                    compare={hasCompare}
                    netSales={netSales}
                    onOpenLedger={openLedger}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
      )}

      {ready && (
        <footer className="pl-footer">
          <span>
            {fromDate} to {toDate} · Subtotals include every ledger, even when
            search hides some rows
            {stock.opening || stock.closing
              ? ""
              : " · No stock entered, so cost of goods sold uses purchases only"}
          </span>
          <span>
            Gross Profit = Net Sales + Direct Income − (Opening Stock +
            Purchases + Direct Expenses − Closing Stock)
            {hasCompare ? " · Previous period excludes stock" : ""}
          </span>
        </footer>
      )}
    </main>
  );
}