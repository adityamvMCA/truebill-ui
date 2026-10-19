import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  TrendingUp,
  Wallet,
  ShoppingCart,
  ArrowLeftRight,
  AlertCircle,
  Calendar,
} from "lucide-react";
import journalApi from "../services/modules/journalApi";
import "./Dashboard.css";

// ---------- date helpers ----------
const toLocalDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const getToday = () => toLocalDate(new Date());
const getMonthStart = () => toLocalDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
const formatDateLabel = (v) => {
  if (!v) return "—";
  const d = new Date(`${v}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
};
const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
};

// ---------- formatters ----------
const currencyFmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});
const money = (v) => currencyFmt.format(Math.round(Number(v || 0)));
const money2 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const moneyExact = (v) => money2.format(Number(v || 0));
const compactMoney = (v) => {
  const n = Number(v || 0);
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)} k`;
  return money(n);
};
const getErrorMessage = (e) => e?.response?.data?.message || e?.message || "Unable to load dashboard.";

// ---------- response readers (tolerant) ----------
const readDayBook = (res) => {
  const b = res?.data;
  if (!b) throw new Error("Empty response");
  // success shape: {success:true, data:{period,totals,typeWise}, transactions, pagination}
  if (b.success && b.data && Array.isArray(b.transactions)) return b;
  // sometimes nested .data.data
  if (b.data?.success) return b.data;
  throw new Error(b.message || "Invalid day book response");
};
const readOutstanding = (res) => {
  const b = res?.data;
  if (!b) return null;
  if (b.success && b.data) return b.data;
  if (b.data?.success) return b.data.data;
  return null;
};

// ---------- tiny SVG charts (no deps, theme-aware) ----------
function TrendAreaChart({ data }) {
  // data: [{label, sales, purchase}]
  if (!data || data.length === 0) {
    return <div style={{ height: 180, display: "grid", placeItems: "center", color: "var(--dbd-muted)", fontSize: 12 }}>No transactions in this period</div>;
  }
  const W = 640, H = 180, PAD_L = 34, PAD_R = 12, PAD_T = 12, PAD_B = 24;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const max = Math.max(1, ...data.map((d) => Math.max(d.sales, d.purchase)));
  const stepX = data.length === 1 ? plotW : plotW / (data.length - 1);
  const x = (i) => PAD_L + i * stepX;
  const y = (v) => PAD_T + plotH - (Number(v || 0) / max) * plotH;

  const salesPts = data.map((d, i) => `${x(i)},${y(d.sales)}`).join(" ");
  const purchasePts = data.map((d, i) => `${x(i)},${y(d.purchase)}`).join(" ");

  const salesArea = `M ${x(0)},${y(data[0].sales)} ${data.map((d, i) => `L ${x(i)},${y(d.sales)}`).join(" ")} L ${x(data.length - 1)},${PAD_T + plotH} L ${x(0)},${PAD_T + plotH} Z`;
  const purchaseArea = `M ${x(0)},${y(data[0].purchase)} ${data.map((d, i) => `L ${x(i)},${y(d.purchase)}`).join(" ")} L ${x(data.length - 1)},${PAD_T + plotH} L ${x(0)},${PAD_T + plotH} Z`;

  // y grid
  const ticks = 4;
  return (
    <div className="dbd-trend-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Sales vs Purchase trend">
        {/* grid */}
        {[0, 1, 2, 3, 4].map((t) => {
          const yy = PAD_T + (plotH * t) / ticks;
          return <line key={t} x1={PAD_L} y1={yy} x2={W - PAD_R} y2={yy} stroke="var(--dbd-border)" strokeWidth="1" opacity="0.7" />;
        })}
        {/* y labels */}
        {[0, 1, 2].map((k) => {
          const val = (max * (ticks - k * 2)) / ticks;
          if (k === 1 && max < 100) return null;
          const yy = PAD_T + (plotH * k * 2) / ticks;
          return (
            <text key={k} x={PAD_L - 6} y={yy + 3} textAnchor="end" fontSize="9" fill="var(--dbd-muted)">
              {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : Math.round(val)}
            </text>
          );
        })}
        {/* areas */}
        <path d={purchaseArea} fill="#f59e0b" opacity="0.12" />
        <path d={salesArea} fill="#2563eb" opacity="0.12" />
        {/* lines */}
        <polyline fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" points={purchasePts} />
        <polyline fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" points={salesPts} />
        {/* dots */}
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(d.sales)} r="3.2" fill="#2563eb" stroke="white" strokeWidth="1.2" />
            <circle cx={x(i)} cy={y(d.purchase)} r="3.2" fill="#f59e0b" stroke="white" strokeWidth="1.2" />
          </g>
        ))}
        {/* x labels */}
        {data.map((d, i) => {
          if (data.length > 14 && i % 2 === 1) return null;
          return (
            <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="var(--dbd-secondary)">
              {d.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function DonutChart({ receivable, payable }) {
  const total = Math.abs(Number(receivable || 0)) + Math.abs(Number(payable || 0));
  if (total === 0) {
    return <div style={{ height: 160, display: "grid", placeItems: "center", color: "var(--dbd-muted)", fontSize: 12 }}>No outstanding</div>;
  }
  const r = 62, stroke = 18, C = 2 * Math.PI * r;
  const recPct = Math.abs(Number(receivable || 0)) / total;
  const recLen = C * recPct;
  const payLen = C - recLen;
  return (
    <div className="dbd-outstanding-wrap">
      <svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label="Receivable vs Payable" style={{ flex: "0 0 auto" }}>
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--dbd-border)" strokeWidth={stroke} />
        <circle
          cx="70" cy="70" r={r} fill="none" stroke="#dc2626" strokeWidth={stroke}
          strokeDasharray={`${recLen} ${C}`} strokeDashoffset={C * 0.25} strokeLinecap="round"
          transform="rotate(-90 70 70)"
        />
        <circle
          cx="70" cy="70" r={r} fill="none" stroke="#16a34a" strokeWidth={stroke}
          strokeDasharray={`${payLen} ${C}`} strokeDashoffset={C * 0.25 - recLen} strokeLinecap="round"
          transform="rotate(-90 70 70)" opacity="0.95"
        />
        <text x="70" y="68" textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--dbd-text)">{total >= 100000 ? compactMoney(total) : money(total)}</text>
        <text x="70" y="82" textAnchor="middle" fontSize="9" fill="var(--dbd-muted)">Total O/S</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="dbd-dot" style={{ background: "#dc2626" }} /> Receivable <strong style={{ marginLeft: 6 }}>{moneyExact(receivable)}</strong></div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="dbd-dot" style={{ background: "#16a34a" }} /> Payable <strong style={{ marginLeft: 6 }}>{moneyExact(payable)}</strong></div>
        <div style={{ color: "var(--dbd-muted)", fontSize: 11 }}>Net {Number(receivable || 0) - Number(payable || 0) >= 0 ? "Receivable" : "Payable"}: <strong style={{ color: "var(--dbd-text)" }}>{moneyExact(Math.abs(Number(receivable || 0) - Number(payable || 0)))}</strong></div>
      </div>
    </div>
  );
}

function BarList({ rows, max }) {
  if (!rows || rows.length === 0) return <div style={{ color: "var(--dbd-muted)", fontSize: 12, padding: "8px 0" }}>No data</div>;
  const m = max || Math.max(...rows.map((r) => Math.abs(Number(r.balance || r.amount || 0))), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {rows.map((r) => {
        const amt = Number(r.balance ?? r.amount ?? 0);
        const pct = Math.max(6, (Math.abs(amt) / m) * 100);
        return (
          <div key={String(r._id || r.code)} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12 }}>
              <span style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>{r.customerName || r.supplierName || r.name || r.code}</span>
              <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, color: amt < 0 ? "#16a34a" : "#dc2626" }}>{moneyExact(Math.abs(amt))}</span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: "var(--dbd-border)", overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: amt < 0 ? "#16a34a" : "#dc2626", borderRadius: 999 }} />
            </div>
            <div style={{ fontSize: 11, color: "var(--dbd-muted)" }}>{r.customerCode || r.supplierCode || r.code || ""}{r.phone ? ` • ${r.phone}` : ""}</div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- main ----------
export default function Dashboard() {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState(getMonthStart);
  const [endDate, setEndDate] = useState(getToday);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [stats, setStats] = useState({ sales: 0, purchase: 0, receivable: 0, payable: 0, salesCount: 0, purchaseCount: 0, totalCount: 0 });
  const [trend, setTrend] = useState([]);
  const [topReceivables, setTopReceivables] = useState([]);
  const [topPayables, setTopPayables] = useState([]);
  const [recent, setRecent] = useState([]);
  const [netSeries, setNetSeries] = useState({ receivable: 0, payable: 0 });

  const periodLabel = useMemo(() => `${formatDateLabel(startDate)} — ${formatDateLabel(endDate)}`, [startDate, endDate]);
  const isInvalidRange = useMemo(() => startDate && endDate && startDate > endDate, [startDate, endDate]);

  // fetch
  useEffect(() => {
    if (isInvalidRange) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        // 4 parallel: all vouchers (for recent + trend) + filtered sales + filtered purchase + outstanding (2)
        const [allRes, salesRes, purchaseRes, custRes, suppRes] = await Promise.all([
          journalApi.getDayBook({ startDate, endDate, limit: 50, page: 1, sortBy: "postingDate", sortOrder: "desc" }),
          journalApi.getDayBook({ startDate, endDate, sourceType: "SALES_INVOICE", limit: 1, page: 1 }),
          journalApi.getDayBook({ startDate, endDate, sourceType: "PURCHASE_BILL", limit: 1, page: 1 }),
          journalApi.getCustomerOutstanding({ asOfDate: endDate }).catch(() => null),
          journalApi.getSupplierOutstanding({ asOfDate: endDate }).catch(() => null),
        ]);
        if (cancelled) return;

        const allBody = readDayBook(allRes);
        const salesBody = readDayBook(salesRes);
        const purchaseBody = readDayBook(purchaseRes);
        const custData = custRes ? readOutstanding(custRes) : null;
        const suppData = suppRes ? readOutstanding(suppRes) : null;

        const salesTotal = Number(salesBody.data?.totals?.amount ?? salesBody.data?.totals?.debit ?? 0);
        const purchaseTotal = Number(purchaseBody.data?.totals?.amount ?? purchaseBody.data?.totals?.debit ?? 0);
        const salesCount = Number(salesBody.data?.totals?.count ?? 0);
        const purchaseCount = Number(purchaseBody.data?.totals?.count ?? 0);
        const totalCount = Number(allBody.data?.totals?.count ?? 0);

        // outstanding totals: support both shapes
        const receivable = Number(custData?.totals?.netReceivable ?? custData?.totals?.totalReceivable ?? 0);
        const recAlt = Number(custData?.totals?.netReceivablePaise ?? 0) / 100;
        const payable = Number(suppData?.totals?.netPayable ?? suppData?.totals?.totalPayable ?? 0);
        const payAlt = Number(suppData?.totals?.netPayablePaise ?? 0) / 100;
        const recVal = receivable || recAlt || 0;
        const payVal = payable || payAlt || 0;

        setStats({ sales: salesTotal, purchase: purchaseTotal, receivable: recVal, payable: payVal, salesCount, purchaseCount, totalCount });
        setNetSeries({ receivable: recVal, payable: payVal });

        // trend: group all transactions by date
        const txs = Array.isArray(allBody.transactions) ? allBody.transactions : [];
        setRecent(txs.slice(0, 5));

        // Build daily buckets for the selected period
        const buckets = new Map();
        // init buckets for each day in range
        const s = new Date(`${startDate}T00:00:00.000Z`);
        const e = new Date(`${endDate}T00:00:00.000Z`);
        const days = Math.round((e - s) / 86400000) + 1;
        const useMonthly = days > 62;
        if (useMonthly) {
          // monthly buckets YYYY-MM
          const cur = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), 1));
          const endM = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), 1));
          while (cur <= endM) {
            const k = `${cur.getUTCFullYear()}-${String(cur.getUTCMonth() + 1).padStart(2, "0")}`;
            const label = cur.toLocaleDateString("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" });
            buckets.set(k, { label, sales: 0, purchase: 0 });
            cur.setUTCMonth(cur.getUTCMonth() + 1);
          }
          for (const t of txs) {
            const d = new Date(t.postingDate || t.date || t.createdAt);
            if (Number.isNaN(d.getTime())) continue;
            const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
            const b = buckets.get(k);
            if (!b) continue;
            const amt = Number(t.amount ?? t.totalDebit ?? t.totalDebitPaise / 100 ?? 0);
            if (t.sourceType === "SALES_INVOICE") b.sales += amt;
            if (t.sourceType === "PURCHASE_BILL") b.purchase += amt;
          }
        } else {
          for (let i = 0; i < days; i++) {
            const d = new Date(s);
            d.setUTCDate(s.getUTCDate() + i);
            const k = d.toISOString().slice(0, 10);
            const label = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", timeZone: "UTC" });
            buckets.set(k, { label, sales: 0, purchase: 0 });
          }
          for (const t of txs) {
            const d = new Date(t.postingDate || t.date || t.createdAt);
            if (Number.isNaN(d.getTime())) continue;
            const k = d.toISOString().slice(0, 10);
            const b = buckets.get(k);
            if (!b) continue;
            const amt = Number(t.amount ?? t.totalDebit ?? (Number(t.totalDebitPaise || 0) / 100) ?? 0);
            if (t.sourceType === "SALES_INVOICE") b.sales += Math.abs(amt);
            else if (t.sourceType === "PURCHASE_BILL") b.purchase += Math.abs(amt);
          }
        }
        setTrend(Array.from(buckets.values()));

        // top outstanding
        const custRows = Array.isArray(custData?.rows) ? custData.rows : [];
        const suppRows = Array.isArray(suppData?.rows) ? suppData.rows : [];
        // keep only non-zero, sorted by abs
        const topR = [...custRows].filter((r) => Math.abs(Number(r.balance ?? r.amount ?? 0)) > 0.005).sort((a, b) => Math.abs(Number(b.balance ?? 0)) - Math.abs(Number(a.balance ?? 0))).slice(0, 5);
        const topP = [...suppRows].filter((r) => Math.abs(Number(r.balance ?? r.amount ?? 0)) > 0.005).sort((a, b) => Math.abs(Number(b.balance ?? 0)) - Math.abs(Number(a.balance ?? 0))).slice(0, 5);
        setTopReceivables(topR);
        setTopPayables(topP);
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err));
          // keep previous stats but clear trend/recent if first load
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [startDate, endDate, refreshKey, isInvalidRange]);

  const grossProfit = useMemo(() => Number(stats.sales || 0) - Number(stats.purchase || 0), [stats]);
  const profitPositive = grossProfit >= 0;

  return (
    <div className="dbd-page">
      {/* Header */}
      <div className="dbd-header">
        <div className="dbd-title">
          <h1>{greeting()}, Admin!</h1>
          <p>Here is what is happening with your business today — <strong style={{ color: "var(--dbd-text)" }}>{periodLabel}</strong></p>
        </div>
        <div className="dbd-controls">
          <label className="dbd-date" title="Start date">
            <span>From</span>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label className="dbd-date" title="End date">
            <span>To</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </label>
          <button type="button" className="dbd-btn" onClick={() => setRefreshKey((k) => k + 1)} disabled={loading} title="Refresh">
            <RefreshCw size={14} style={{ animation: loading ? "spin 0.9s linear infinite" : "none" }} /> Refresh
          </button>
        </div>
      </div>

      {isInvalidRange && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 12px", borderRadius: 10, border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", fontSize: 12, marginBottom: 12 }}>
          <AlertCircle size={14} /> Start date cannot be after end date.
        </div>
      )}
      {error && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 12px", borderRadius: 10, border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", fontSize: 12, marginBottom: 12 }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Stat cards — real data */}
      <div className="dbd-cards">
        <div className="dbd-card sales">
          <span><ShoppingCart size={12} style={{ display: "inline", verticalAlign: "-1px", marginRight: 4 }} /> Total Sales</span>
          {loading ? <div className="dbd-skeleton" style={{ width: "60%" }} /> : <strong>{money(stats.sales)}</strong>}
          <small>
            {loading ? <span className="dbd-skeleton" style={{ width: 90, height: 10 }} /> : (
              <>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                  <TrendingUp size={12} /> {stats.salesCount} invoices
                </span>
                <span style={{ color: "var(--dbd-muted)" }}>in period</span>
              </>
            )}
          </small>
        </div>
        <div className="dbd-card purchase">
          <span><Wallet size={12} style={{ display: "inline", verticalAlign: "-1px", marginRight: 4 }} /> Total Purchase</span>
          {loading ? <div className="dbd-skeleton" style={{ width: "60%" }} /> : <strong>{money(stats.purchase)}</strong>}
          <small>
            {loading ? <span className="dbd-skeleton" style={{ width: 90, height: 10 }} /> : (
              <>
                {stats.purchaseCount} bills
                <span className={profitPositive ? "dbd-up" : "dbd-down"} style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                  {profitPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />} {profitPositive ? "Margin" : "Loss"} {money(Math.abs(grossProfit))}
                </span>
              </>
            )}
          </small>
        </div>
        <div className="dbd-card receivable">
          <span><ArrowLeftRight size={12} style={{ display: "inline", verticalAlign: "-1px", marginRight: 4 }} /> Receivables</span>
          {loading ? <div className="dbd-skeleton" style={{ width: "55%" }} /> : <strong>{money(stats.receivable)}</strong>}
          <small>
            {loading ? <span className="dbd-skeleton" style={{ width: 90, height: 10 }} /> : (
              <>
                <span className="dbd-down">To collect</span> as of {formatDateLabel(endDate)}
              </>
            )}
          </small>
        </div>
        <div className="dbd-card payable">
          <span><Calendar size={12} style={{ display: "inline", verticalAlign: "-1px", marginRight: 4 }} /> Payables</span>
          {loading ? <div className="dbd-skeleton" style={{ width: "55%" }} /> : <strong>{money(stats.payable)}</strong>}
          <small>
            {loading ? <span className="dbd-skeleton" style={{ width: 90, height: 10 }} /> : (
              <>
                <span className="dbd-up">To pay</span> as of {formatDateLabel(endDate)}
              </>
            )}
          </small>
        </div>
      </div>

      {/* Graphs */}
      <div className="dbd-graphs">
        <div className="dbd-panel">
          <div className="dbd-panel-head">
            <h3>Sales vs Purchase</h3>
            <small>{trend.length ? `${trend.length} ${trend.length > 31 ? "months" : "days"}` : ""} • {periodLabel}</small>
          </div>
          <div className="dbd-panel-body">
            <div className="dbd-legend">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span className="dbd-dot" style={{ background: "#2563eb" }} /> Sales</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span className="dbd-dot" style={{ background: "#f59e0b" }} /> Purchase</span>
              <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700, color: profitPositive ? "var(--dbd-success)" : "var(--dbd-danger)" }}>
                {profitPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />} Gross {profitPositive ? "Profit" : "Loss"} {money(Math.abs(grossProfit))}
              </span>
            </div>
            {loading ? <div className="dbd-skeleton" style={{ height: 180 }} /> : <TrendAreaChart data={trend} />}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 11, color: "var(--dbd-muted)" }}>
              <span>Total vouchers in period: <strong style={{ color: "var(--dbd-text)" }}>{stats.totalCount}</strong></span>
              <span>•</span>
              <span>Sales {stats.salesCount} • Purchase {stats.purchaseCount}</span>
            </div>
          </div>
        </div>

        <div className="dbd-panel">
          <div className="dbd-panel-head">
            <h3>Outstanding</h3>
            <small>As of {formatDateLabel(endDate)}</small>
          </div>
          <div className="dbd-panel-body">
            {loading ? <div className="dbd-skeleton" style={{ height: 160 }} /> : <DonutChart receivable={netSeries.receivable} payable={netSeries.payable} />}
            <div className="dbd-outstanding-grid">
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--dbd-secondary)", marginBottom: 8 }}>Top Receivables</div>
                {loading ? <div className="dbd-skeleton" style={{ height: 80 }} /> : <BarList rows={topReceivables} />}
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--dbd-secondary)", marginBottom: 8 }}>Top Payables</div>
                {loading ? <div className="dbd-skeleton" style={{ height: 80 }} /> : <BarList rows={topPayables} />}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent vouchers + Quick links */}
      <div className="dbd-graphs dbd-graphs-bottom">
        <div className="dbd-panel">
          <div className="dbd-panel-head">
            <h3>Recent Vouchers</h3>
            <small style={{ display: "inline-flex", gap: 6 }}>
              <button type="button" className="dbd-btn" style={{ minHeight: 28, padding: "0 10px", fontSize: 11 }} onClick={() => navigate("/accounting/daybook")}>View Day Book</button>
            </small>
          </div>
          <div className="dbd-panel-body" style={{ padding: 0 }}>
            <div className="dbd-table-wrap">
              <table className="dbd-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Voucher</th>
                    <th>Type</th>
                    <th className="num">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4} style={{ padding: 18 }}><div className="dbd-skeleton" style={{ height: 14 }} /><div className="dbd-skeleton" style={{ height: 14, marginTop: 8 }} /></td></tr>
                  ) : recent.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: 16, textAlign: "center", color: "var(--dbd-muted)" }}>No vouchers in this period</td></tr>
                  ) : (
                    recent.map((r) => (
                      <tr key={String(r._id)}>
                        <td style={{ whiteSpace: "nowrap" }}>{formatDateLabel((r.postingDate || r.date || "").toString().slice(0, 10))}</td>
                        <td style={{ fontWeight: 600 }}>{r.journalNumber || r.sourceNumber || "—"}</td>
                        <td><span style={{ display: "inline-block", padding: "2px 7px", borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", background: r.sourceType === "SALES_INVOICE" ? "#eff6ff" : r.sourceType === "PURCHASE_BILL" ? "#fef3c7" : r.sourceType === "MANUAL_JOURNAL" ? "#f3f4f6" : "#f0fdf4", color: "var(--dbd-secondary)", border: "1px solid var(--dbd-border)" }}>{String(r.sourceType || "").replaceAll("_", " ")}</span></td>
                        <td className="num" style={{ fontWeight: 700 }}>{moneyExact(r.amount ?? r.totalDebit ?? (Number(r.totalDebitPaise || 0) / 100))}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="dbd-panel">
          <div className="dbd-panel-head">
            <h3>Quick Links</h3>
            <small>Jump to reports</small>
          </div>
          <div className="dbd-panel-body">
            <div className="dbd-quick dbd-quick-compact">
              <a href="#/accounting/daybook" onClick={(e) => { e.preventDefault(); navigate("/accounting/daybook"); }}><Calendar size={14} /> Day Book</a>
              <a href="#/accounting/journal" onClick={(e) => { e.preventDefault(); navigate("/accounting/journal"); }}><ArrowLeftRight size={14} /> Journals</a>
              <a href="#/accounting/trial-balance" onClick={(e) => { e.preventDefault(); navigate("/accounting/trial-balance"); }}><TrendingUp size={14} /> Trial Balance</a>
              <a href="#/accounting/balance-sheet" onClick={(e) => { e.preventDefault(); navigate("/accounting/balance-sheet"); }}><Wallet size={14} /> Balance Sheet</a>
              <a href="#/accounting/outstanding/customers" onClick={(e) => { e.preventDefault(); navigate("/accounting/outstanding/customers"); }}><ArrowUpRight size={14} /> Receivables</a>
              <a href="#/accounting/outstanding/suppliers" onClick={(e) => { e.preventDefault(); navigate("/accounting/outstanding/suppliers"); }}><ArrowDownRight size={14} /> Payables</a>
            </div>
            <div style={{ marginTop: 12, padding: 10, borderRadius: 10, background: "color-mix(in srgb, var(--dbd-primary) 7%, var(--dbd-card))", border: "1px solid var(--dbd-border)", fontSize: 11, color: "var(--dbd-secondary)", lineHeight: 1.5 }}>
              <strong style={{ color: "var(--dbd-text)" }}>Paise-safe ledger.</strong> All amounts are stored as integers (×100) and balanced per Journal. Outstanding is as-of <strong style={{ color: "var(--dbd-text)" }}>{formatDateLabel(endDate)}</strong> (UTC).
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}