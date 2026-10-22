import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Calculator,
  Download,
  Lock,
  Receipt,
  RefreshCw,
  Search,
  Undo2,
  Wallet,
} from "lucide-react";
import journalApi from "../../services/modules/journalApi";
import "../Dashboard.css";
import "./Reportdashboard.css";

/* ---------- date helpers ---------- */
const toLocalDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const parseUTC = (v) => new Date(`${v}T00:00:00.000Z`);
const formatDateLabel = (v) => {
  if (!v) return "—";
  const d = parseUTC(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

const PRESETS = [
  {
    key: "today",
    label: "Today",
    range: () => {
      const t = toLocalDate(new Date());
      return [t, t];
    },
  },
  {
    key: "week",
    label: "7 Days",
    range: () => {
      const n = new Date();
      const s = new Date(n);
      s.setDate(n.getDate() - 6);
      return [toLocalDate(s), toLocalDate(n)];
    },
  },
  {
    key: "month",
    label: "This Month",
    range: () => {
      const n = new Date();
      return [
        toLocalDate(new Date(n.getFullYear(), n.getMonth(), 1)),
        toLocalDate(n),
      ];
    },
  },
  {
    key: "lastMonth",
    label: "Last Month",
    range: () => {
      const n = new Date();
      return [
        toLocalDate(new Date(n.getFullYear(), n.getMonth() - 1, 1)),
        toLocalDate(new Date(n.getFullYear(), n.getMonth(), 0)),
      ];
    },
  },
  {
    key: "fy",
    label: "This FY",
    range: () => {
      const n = new Date();
      const startYear =
        n.getMonth() >= 3 ? n.getFullYear() : n.getFullYear() - 1; // Indian FY: Apr–Mar
      return [toLocalDate(new Date(startYear, 3, 1)), toLocalDate(n)];
    },
  },
];

/* ---------- formatters ---------- */
const inr0 = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const inr2 = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const money = (v) => inr0.format(Math.round(Number(v || 0)));
const moneyExact = (v) => inr2.format(Number(v || 0));
const compact = (v) => {
  const n = Number(v || 0);
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)} k`;
  return money(n);
};
const getErrorMessage = (e) =>
  e?.response?.data?.message || e?.message || "Unable to load report.";

/* ---------- response helpers ---------- */
const readDayBook = (res) => {
  const b = res?.data;
  if (!b) throw new Error("Empty response");
  if (b.success && b.data && Array.isArray(b.transactions)) return b;
  if (b.data?.success) return b.data;
  throw new Error(b.message || "Invalid day book response");
};
const txAmount = (t) =>
  Math.abs(
    Number(
      t.amount ?? t.totalDebit ?? Number(t.totalDebitPaise || 0) / 100 ?? 0,
    ),
  );
const txParty = (t) => t.partyName || t.customerName || t.supplierName || "";
const txDate = (t) => new Date(t.postingDate || t.date || t.createdAt);
const totalsAmount = (body) =>
  Number(body?.data?.totals?.amount ?? body?.data?.totals?.debit ?? 0);
const totalsCount = (body) => Number(body?.data?.totals?.count ?? 0);
const pctChange = (cur, prev) =>
  prev > 0 ? ((cur - prev) / prev) * 100 : null;

/* ---------- charts ---------- */
function TrendChart({ data, color, label }) {
  if (!data?.length) {
    return (
      <div className="rpt-empty" style={{ height: 200 }}>
        No transactions in this period
      </div>
    );
  }
  const W = 640,
    H = 200,
    L = 40,
    R = 12,
    T = 12,
    B = 26;
  const pw = W - L - R,
    ph = H - T - B;
  const max = Math.max(1, ...data.map((d) => d.value));
  const step = data.length === 1 ? pw : pw / (data.length - 1);
  const x = (i) => L + (data.length === 1 ? pw / 2 : i * step);
  const y = (v) => T + ph - (v / max) * ph;
  const line = data.map((d, i) => `${x(i)},${y(d.value)}`).join(" ");
  const area = `M ${x(0)},${y(data[0].value)} ${data.map((d, i) => `L ${x(i)},${y(d.value)}`).join(" ")} L ${x(data.length - 1)},${T + ph} L ${x(0)},${T + ph} Z`;
  const every = Math.ceil(data.length / 10);
  return (
    <div className="dbd-trend-wrap">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${label} trend`}
        style={{ height: 200 }}
      >
        {[0, 1, 2, 3, 4].map((t) => {
          const yy = T + (ph * t) / 4;
          const val = max - (max * t) / 4;
          return (
            <g key={t}>
              <line
                x1={L}
                y1={yy}
                x2={W - R}
                y2={yy}
                stroke="var(--dbd-border)"
                opacity="0.7"
              />
              <text
                x={L - 6}
                y={yy + 3}
                textAnchor="end"
                fontSize="9"
                fill="var(--dbd-muted)"
              >
                {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : Math.round(val)}
              </text>
            </g>
          );
        })}
        <path d={area} fill={color} opacity="0.14" />
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2.2"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={line}
        />
        {data.map((d, i) => (
          <g key={i}>
            <circle
              cx={x(i)}
              cy={y(d.value)}
              r="3"
              fill={color}
              stroke="white"
              strokeWidth="1.2"
            >
              <title>{`${d.label}: ${moneyExact(d.value)} (${d.count})`}</title>
            </circle>
            {i % every === 0 && (
              <text
                x={x(i)}
                y={H - 8}
                textAnchor="middle"
                fontSize="9"
                fill="var(--dbd-secondary)"
              >
                {d.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

function TopParties({ rows, color, total }) {
  if (!rows.length) return <div className="rpt-empty">No party data</div>;
  const max = rows[0].amount || 1;
  return (
    <div className="rpt-bars">
      {rows.map((r) => (
        <div key={r.name} className="rpt-bar-row">
          <div className="rpt-bar-top">
            <span className="rpt-bar-name" title={r.name}>
              {r.name}
            </span>
            <span className="rpt-bar-amt">{moneyExact(r.amount)}</span>
          </div>
          <div className="rpt-bar-track">
            <div
              className="rpt-bar-fill"
              style={{
                width: `${Math.max(4, (r.amount / max) * 100)}%`,
                background: color,
              }}
            />
          </div>
          <div className="rpt-bar-sub">
            {r.count} {r.count === 1 ? "voucher" : "vouchers"} •{" "}
            {total ? ((r.amount / total) * 100).toFixed(1) : 0}% of total
          </div>
        </div>
      ))}
    </div>
  );
}

function Delta({ value, goodWhenUp = true }) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return <span className="rpt-delta rpt-flat">no prior data</span>;
  }
  const up = value >= 0;
  const good = up === goodWhenUp;
  return (
    <span className={`rpt-delta ${good ? "dbd-up" : "dbd-down"}`}>
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{" "}
      {Math.abs(value).toFixed(1)}% vs previous period
    </span>
  );
}

/* ---------- CSV ---------- */
const csvCell = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
const exportCsv = (rows, filename) => {
  const head = ["Date", "Voucher", "Source No", "Party", "Narration", "Amount"];
  const lines = rows.map((r) =>
    [
      toLocalDate(txDate(r)),
      r.journalNumber,
      r.sourceNumber,
      txParty(r),
      r.narration,
      txAmount(r).toFixed(2),
    ]
      .map(csvCell)
      .join(","),
  );
  const blob = new Blob([[head.join(","), ...lines].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const PAGE_SIZE = 12;
const FETCH_LIMIT = 200;

/**
 * config: { title, subtitle, sourceType, returnType, color, partyLabel, docLabel, icon }
 */
export default function ReportDashboard({ config }) {
  const {
    title,
    subtitle,
    sourceType,
    returnType,
    color,
    partyLabel,
    docLabel,
  } = config;
  const Icon = config.icon || Receipt;

  const [preset, setPreset] = useState("month");
  const [[startDate, endDate], setRange] = useState(PRESETS[2].range);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [totals, setTotals] = useState({
    amount: 0,
    count: 0,
    returns: 0,
    returnCount: 0,
    prev: 0,
  });
  const [rows, setRows] = useState([]);
  const [scope, setScope] = useState("all"); // "own" when the server restricts to the current user
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const isInvalidRange = startDate > endDate;
  const periodLabel = `${formatDateLabel(startDate)} — ${formatDateLabel(endDate)}`;

  const applyPreset = (p) => {
    setPreset(p.key);
    setRange(p.range());
    setPage(1);
  };
  const onDate = (which, v) => {
    setPreset("custom");
    setRange(([s, e]) => (which === "s" ? [v, e] : [s, v]));
    setPage(1);
  };

  const load = useCallback(
    async (signal) => {
      setLoading(true);
      setError("");
      try {
        const s = parseUTC(startDate),
          e = parseUTC(endDate);
        const days = Math.round((e - s) / 86400000) + 1;
        const prevEnd = new Date(s);
        prevEnd.setUTCDate(prevEnd.getUTCDate() - 1);
        const prevStart = new Date(prevEnd);
        prevStart.setUTCDate(prevStart.getUTCDate() - (days - 1));

        const [listRes, retRes, prevRes] = await Promise.all([
          journalApi.getDayBook({
            startDate,
            endDate,
            sourceType,
            limit: FETCH_LIMIT,
            page: 1,
            sortBy: "postingDate",
            sortOrder: "desc",
          }),
          returnType
            ? journalApi
                .getDayBook({
                  startDate,
                  endDate,
                  sourceType: returnType,
                  limit: 1,
                  page: 1,
                })
                .catch(() => null)
            : Promise.resolve(null),
          journalApi
            .getDayBook({
              startDate: prevStart.toISOString().slice(0, 10),
              endDate: prevEnd.toISOString().slice(0, 10),
              sourceType,
              limit: 1,
              page: 1,
            })
            .catch(() => null),
        ]);
        if (signal.cancelled) return;

        const list = readDayBook(listRes);
        const ret = retRes ? readDayBook(retRes) : null;
        const prev = prevRes ? readDayBook(prevRes) : null;

        setTotals({
          amount: totalsAmount(list),
          count: totalsCount(list),
          returns: totalsAmount(ret),
          returnCount: totalsCount(ret),
          prev: totalsAmount(prev),
        });
        setScope(list.data?.scope === "own" ? "own" : "all");
        setRows(Array.isArray(list.transactions) ? list.transactions : []);
      } catch (err) {
        if (!signal.cancelled) setError(getErrorMessage(err));
      } finally {
        if (!signal.cancelled) setLoading(false);
      }
    },
    [startDate, endDate, sourceType, returnType],
  );

  useEffect(() => {
    if (isInvalidRange) return undefined;
    const signal = { cancelled: false };
    void load(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [load, refreshKey, isInvalidRange]);

  /* derived */
  const trend = useMemo(() => {
    if (isInvalidRange) return [];
    const s = parseUTC(startDate),
      e = parseUTC(endDate);
    const days = Math.round((e - s) / 86400000) + 1;
    const monthly = days > 62;
    const buckets = new Map();
    if (monthly) {
      const cur = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), 1));
      const endM = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), 1));
      while (cur <= endM) {
        const k = `${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, "0")}`;
        buckets.set(k, {
          label: cur.toLocaleDateString("en-IN", {
            month: "short",
            year: "2-digit",
            timeZone: "UTC",
          }),
          value: 0,
          count: 0,
        });
        cur.setUTCMonth(cur.getUTCMonth() + 1);
      }
    } else {
      for (let i = 0; i < days; i++) {
        const d = new Date(s);
        d.setUTCDate(s.getUTCDate() + i);
        buckets.set(d.toISOString().slice(0, 10), {
          label: d.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            timeZone: "UTC",
          }),
          value: 0,
          count: 0,
        });
      }
    }
    for (const t of rows) {
      const d = txDate(t);
      if (Number.isNaN(d.getTime())) continue;
      const k = monthly
        ? `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
        : d.toISOString().slice(0, 10);
      const b = buckets.get(k);
      if (!b) continue;
      b.value += txAmount(t);
      b.count += 1;
    }
    return Array.from(buckets.values());
  }, [rows, startDate, endDate, isInvalidRange]);

  const topParties = useMemo(() => {
    const m = new Map();
    for (const t of rows) {
      const name = txParty(t);
      if (!name) continue;
      const cur = m.get(name) || { name, amount: 0, count: 0 };
      cur.amount += txAmount(t);
      cur.count += 1;
      m.set(name, cur);
    }
    return [...m.values()].sort((a, b) => b.amount - a.amount).slice(0, 6);
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.journalNumber, r.sourceNumber, txParty(r), r.narration].some((v) =>
        String(v || "")
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [rows, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const net = totals.amount - totals.returns;
  const avg = totals.count ? totals.amount / totals.count : 0;
  const peak = trend.reduce(
    (a, b) => (b.value > (a?.value ?? -1) ? b : a),
    null,
  );
  const truncated = totals.count > rows.length;
  const goodWhenUp = sourceType === "SALES_INVOICE";

  return (
    <div className="dbd-page" style={{ "--rpt-color": color }}>
      <div className="dbd-header">
        <div className="dbd-title">
          <h1>{title}</h1>
          <p>
            {subtitle} —{" "}
            <strong style={{ color: "var(--dbd-text)" }}>{periodLabel}</strong>
            {scope === "own" && (
              <span className="rpt-scope">
                <Lock size={11} /> Showing only your {docLabel.toLowerCase()}s
              </span>
            )}
          </p>
        </div>
        <div className="dbd-controls">
          <label className="dbd-date">
            <span>From</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => onDate("s", e.target.value)}
            />
          </label>
          <label className="dbd-date">
            <span>To</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onDate("e", e.target.value)}
            />
          </label>
          <button
            type="button"
            className="dbd-btn"
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? "rpt-spin" : ""} />{" "}
            Refresh
          </button>
        </div>
      </div>

      <div className="rpt-presets">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            className={`rpt-chip ${preset === p.key ? "active" : ""}`}
            onClick={() => applyPreset(p)}
          >
            {p.label}
          </button>
        ))}
      </div>

      {isInvalidRange && (
        <div className="rpt-alert">
          <AlertCircle size={14} /> Start date cannot be after end date.
        </div>
      )}
      {error && (
        <div className="rpt-alert">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* KPI cards */}
      <div className="dbd-cards">
        <div className="dbd-card rpt-k1">
          <span>
            <Icon size={12} className="rpt-ic" /> Gross{" "}
            {title.replace(" Report", "")}
          </span>
          {loading ? (
            <div className="dbd-skeleton" style={{ width: "60%" }} />
          ) : (
            <strong>{money(totals.amount)}</strong>
          )}
          <small>
            {loading ? (
              <span
                className="dbd-skeleton"
                style={{ width: 100, height: 10 }}
              />
            ) : (
              <Delta
                value={pctChange(totals.amount, totals.prev)}
                goodWhenUp={goodWhenUp}
              />
            )}
          </small>
        </div>
        <div className="dbd-card rpt-k2">
          <span>
            <Undo2 size={12} className="rpt-ic" /> Returns
          </span>
          {loading ? (
            <div className="dbd-skeleton" style={{ width: "55%" }} />
          ) : (
            <strong>{money(totals.returns)}</strong>
          )}
          <small>
            {totals.returnCount} return{" "}
            {totals.returnCount === 1 ? "voucher" : "vouchers"}
          </small>
        </div>
        <div className="dbd-card rpt-k3">
          <span>
            <Wallet size={12} className="rpt-ic" /> Net{" "}
            {title.replace(" Report", "")}
          </span>
          {loading ? (
            <div className="dbd-skeleton" style={{ width: "55%" }} />
          ) : (
            <strong>{money(net)}</strong>
          )}
          <small>Gross minus returns</small>
        </div>
        <div className="dbd-card rpt-k4">
          <span>
            <Calculator size={12} className="rpt-ic" /> Avg / {docLabel}
          </span>
          {loading ? (
            <div className="dbd-skeleton" style={{ width: "55%" }} />
          ) : (
            <strong>{money(avg)}</strong>
          )}
          <small>
            {totals.count} {docLabel.toLowerCase()}s
            {peak && peak.value > 0 ? ` • peak ${peak.label}` : ""}
          </small>
        </div>
      </div>

      {/* Trend + top parties */}
      <div className="dbd-graphs">
        <div className="dbd-panel">
          <div className="dbd-panel-head">
            <h3>{title.replace(" Report", "")} Trend</h3>
            <small>
              {trend.length} {trend.length > 31 ? "months" : "days"}
            </small>
          </div>
          <div className="dbd-panel-body">
            {loading ? (
              <div className="dbd-skeleton" style={{ height: 200 }} />
            ) : (
              <TrendChart data={trend} color={color} label={title} />
            )}
            {truncated && (
              <div className="rpt-note">
                Chart and table use the latest {rows.length} of {totals.count}{" "}
                vouchers. KPI cards cover the full period.
              </div>
            )}
          </div>
        </div>

        <div className="dbd-panel">
          <div className="dbd-panel-head">
            <h3>Top {partyLabel}s</h3>
            <small>By amount</small>
          </div>
          <div className="dbd-panel-body">
            {loading ? (
              <div className="dbd-skeleton" style={{ height: 200 }} />
            ) : (
              <TopParties
                rows={topParties}
                color={color}
                total={rows.reduce((a, t) => a + txAmount(t), 0)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="dbd-panel">
        <div className="dbd-panel-head">
          <h3>{docLabel} Register</h3>
          <div className="rpt-tools">
            <label className="rpt-search">
              <Search size={13} />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder={`Search ${docLabel.toLowerCase()}, ${partyLabel.toLowerCase()}…`}
              />
            </label>
            <button
              type="button"
              className="dbd-btn"
              disabled={!filtered.length}
              onClick={() =>
                exportCsv(
                  filtered,
                  `${sourceType.toLowerCase()}_${startDate}_to_${endDate}.csv`,
                )
              }
            >
              <Download size={14} /> CSV
            </button>
          </div>
        </div>
        <div className="dbd-panel-body" style={{ padding: 0 }}>
          <div className="dbd-table-wrap">
            <table className="dbd-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>{docLabel} No</th>
                  <th>Voucher</th>
                  <th>{partyLabel}</th>
                  <th className="num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} style={{ padding: 18 }}>
                      <div className="dbd-skeleton" style={{ height: 14 }} />
                      <div
                        className="dbd-skeleton"
                        style={{ height: 14, marginTop: 8 }}
                      />
                    </td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="rpt-empty"
                      style={{ padding: 18 }}
                    >
                      No records found
                    </td>
                  </tr>
                ) : (
                  pageRows.map((r) => (
                    <tr key={String(r._id)}>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {formatDateLabel(toLocalDate(txDate(r)))}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {r.sourceNumber || "—"}
                      </td>
                      <td>{r.journalNumber || "—"}</td>
                      <td>{txParty(r) || "—"}</td>
                      <td className="num" style={{ fontWeight: 700 }}>
                        {moneyExact(txAmount(r))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {!loading && pageRows.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={4} style={{ fontWeight: 700 }}>
                      Filtered total ({filtered.length})
                    </td>
                    <td className="num" style={{ fontWeight: 800 }}>
                      {moneyExact(
                        filtered.reduce((a, t) => a + txAmount(t), 0),
                      )}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {pageCount > 1 && (
            <div className="rpt-pager">
              <button
                type="button"
                className="dbd-btn"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
              >
                Prev
              </button>
              <span>
                Page {safePage} of {pageCount}
              </span>
              <button
                type="button"
                className="dbd-btn"
                disabled={safePage >= pageCount}
                onClick={() => setPage(safePage + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="rpt-foot">
        Total in period: {compact(totals.amount)} • Amounts in INR
      </div>
    </div>
  );
}
