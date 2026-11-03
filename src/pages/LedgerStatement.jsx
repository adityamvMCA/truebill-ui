import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  RefreshCw, Search, Download, Printer, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, ArrowUpRight, ArrowDownRight, Scale, Landmark,
  TrendingUp, TrendingDown, Flame, CalendarClock, AlertCircle, ArrowUpDown, BarChart3,
} from "lucide-react";
import ledgerInsightApi from "../services/modules/ledgerInsightApi";
import {
  today, fyStart, formatDateLabel, money, moneyExact, compact, drCr, initials, errMsg,
  COLORS, DEBIT_C, CREDIT_C, LINE_C, Empty, Sk, PRESETS,
  BalanceArea, Donut, WeekdayCols, Rank, LedgerSelect,
} from "./LedgerInsights";
import "./Dashboard.css";
import "./LedgerInsights.css";
import "./LedgerStatement.css";

const PAGE_SIZES = [25, 50, 100, 200];
const signType = (signed, normal) =>
  signed > 0 ? "Dr" : signed < 0 ? "Cr" : normal === "CREDIT" ? "Cr" : "Dr";

const DrCr = ({ type }) => (
  <span className={`lgs-drcr ${String(type).toLowerCase().startsWith("c") ? "cr" : "dr"}`}>
    {String(type).toLowerCase().startsWith("c") ? "Cr" : "Dr"}
  </span>
);

// ---------- CSV ----------
const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const downloadCsv = (filename, rows) => {
  const csv = rows.map((r) => r.map(csvCell).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
const CSV_HEAD = ["Date", "Journal", "Type", "Reference", "Counter Account", "Narration", "Debit", "Credit", "Balance", "Dr/Cr"];
const toCsvRow = (r) => [
  String(r.date).slice(0, 10), r.journalNumber, r.voucherType, r.sourceNumber,
  r.counterAccount, r.description, r.debit, r.credit, Math.abs(r.balance), r.balanceType === "CREDIT" ? "Cr" : "Dr",
];

// ---------- new charts ----------

// Opening -> +Debit -> -Credit -> Closing waterfall
function BalanceBridge({ opening, debit, credit, closing }) {
  const steps = [
    { label: "Opening", from: 0, to: opening, color: "#64748b", text: `${compact(Math.abs(opening))} ${opening < 0 ? "Cr" : "Dr"}` },
    { label: "Debit", from: opening, to: opening + debit, color: DEBIT_C, text: `+${compact(debit)}` },
    { label: "Credit", from: opening + debit, to: opening + debit - credit, color: CREDIT_C, text: `−${compact(credit)}` },
    { label: "Closing", from: 0, to: closing, color: "#16a34a", text: `${compact(Math.abs(closing))} ${closing < 0 ? "Cr" : "Dr"}` },
  ];
  const levels = [0, ...steps.flatMap((s) => [s.from, s.to])];
  const lo = Math.min(...levels), hi = Math.max(...levels);
  const span = hi - lo || 1;
  const W = 420, H = 230, L = 10, R = 10, T = 28, B = 28;
  const slot = (W - L - R) / steps.length;
  const bw = slot * 0.58;
  const y = (v) => T + (H - T - B) * (1 - (v - lo) / span);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Balance bridge">
      <line x1={L} x2={W - R} y1={y(0)} y2={y(0)} stroke="var(--dbd-muted)" strokeDasharray="4 4" />
      {steps.map((s, i) => {
        const x = L + slot * i + (slot - bw) / 2;
        const top = Math.min(y(s.from), y(s.to));
        const h = Math.max(2, Math.abs(y(s.from) - y(s.to)));
        return (
          <g key={s.label}>
            <rect x={x} y={top} width={bw} height={h} rx="5" fill={s.color}>
              <title>{`${s.label}: ${s.text}`}</title>
            </rect>
            <text x={x + bw / 2} y={top - 6} textAnchor="middle" fontSize="10" fontWeight="800" fill="var(--dbd-text)">{s.text}</text>
            <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--dbd-secondary)">{s.label}</text>
            {i < steps.length - 1 && i > 0 && (
              <line x1={x + bw} x2={x + slot} y1={y(s.to)} y2={y(s.to)} stroke="var(--dbd-muted)" strokeDasharray="2 3" />
            )}
          </g>
        );
      })}
    </svg>
  );
}

// Diverging bars: net (debit − credit) per bucket
function NetFlowChart({ data }) {
  if (!data?.length || !data.some((d) => d.net)) return <Empty h={190} text="No net movement" />;
  const W = 640, H = 190, L = 44, R = 12, T = 14, B = 26;
  const pw = W - L - R, ph = H - T - B;
  const hi = Math.max(1, ...data.map((d) => Math.abs(d.net)));
  const mid = T + ph / 2;
  const slot = pw / data.length;
  const bw = Math.min(22, Math.max(3, slot * 0.6));
  const every = Math.ceil(data.length / 12);
  return (
    <div className="dbd-trend-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Net flow">
        <line x1={L} x2={W - R} y1={mid} y2={mid} stroke="var(--dbd-muted)" />
        <text x={L - 6} y={T + 4} textAnchor="end" fontSize="9" fill="var(--dbd-muted)">{compact(hi).replace("₹", "")}</text>
        <text x={L - 6} y={H - B + 2} textAnchor="end" fontSize="9" fill="var(--dbd-muted)">-{compact(hi).replace("₹", "")}</text>
        {data.map((d, i) => {
          const h = (Math.abs(d.net) / hi) * (ph / 2);
          const cx = L + slot * i + slot / 2;
          return (
            <g key={d.key}>
              <rect x={cx - bw / 2} y={d.net >= 0 ? mid - h : mid} width={bw} height={Math.max(d.net ? 2 : 0, h)} rx="3"
                fill={d.net >= 0 ? DEBIT_C : CREDIT_C}>
                <title>{`${d.label} • Net ${moneyExact(Math.abs(d.net))} ${d.net >= 0 ? "Dr" : "Cr"}`}</title>
              </rect>
              {i % every === 0 && <text x={cx} y={H - 8} textAnchor="middle" fontSize="9" fill="var(--dbd-secondary)">{d.label}</text>}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Cumulative debit vs cumulative credit lines
function CumulativeChart({ data }) {
  if (!data?.length || !data.some((d) => d.debit || d.credit)) return <Empty h={190} text="No movement" />;
  let cd = 0, cc = 0;
  const pts = data.map((d) => { cd += d.debit; cc += d.credit; return { ...d, cd, cc }; });
  const W = 640, H = 190, L = 44, R = 12, T = 14, B = 26;
  const pw = W - L - R, ph = H - T - B;
  const max = Math.max(1, cd, cc);
  const step = pts.length === 1 ? pw : pw / (pts.length - 1);
  const x = (i) => L + i * step;
  const y = (v) => T + ph - (v / max) * ph;
  const line = (k) => pts.map((p, i) => `${x(i)},${y(p[k])}`).join(" ");
  const every = Math.ceil(pts.length / 10);
  return (
    <div className="dbd-trend-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Cumulative debit and credit">
        {[0, 1, 2, 3, 4].map((t) => (
          <line key={t} x1={L} x2={W - R} y1={T + (ph * t) / 4} y2={T + (ph * t) / 4} stroke="var(--dbd-border)" opacity="0.7" />
        ))}
        {[0, 2, 4].map((t) => (
          <text key={t} x={L - 6} y={T + (ph * t) / 4 + 3} textAnchor="end" fontSize="9" fill="var(--dbd-muted)">
            {compact(max - (max * t) / 4).replace("₹", "")}
          </text>
        ))}
        <polyline fill="none" stroke={DEBIT_C} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" points={line("cd")} />
        <polyline fill="none" stroke={CREDIT_C} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" points={line("cc")} />
        {pts.map((p, i) => (
          <g key={p.key}>
            <circle cx={x(i)} cy={y(p.cd)} r="2.6" fill={DEBIT_C}><title>{`${p.label} • Cum. debit ${moneyExact(p.cd)}`}</title></circle>
            <circle cx={x(i)} cy={y(p.cc)} r="2.6" fill={CREDIT_C}><title>{`${p.label} • Cum. credit ${moneyExact(p.cc)}`}</title></circle>
            {i % every === 0 && <text x={x(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="var(--dbd-secondary)">{p.label}</text>}
          </g>
        ))}
      </svg>
    </div>
  );
}

// GitHub-style calendar (daily) or month tiles
function ActivityHeatmap({ trend, granularity }) {
  if (!trend?.some((b) => b.count)) return <Empty h={120} text="No activity in this period" />;
  const max = Math.max(1, ...trend.map((b) => b.count));
  const shade = (c) =>
    c === 0 ? "var(--dbd-border)" : `color-mix(in srgb, #2563eb ${25 + Math.round((c / max) * 75)}%, var(--dbd-card))`;

  const legend = (
    <div className="lgs-heat-legend">
      Less {[0, 0.25, 0.5, 0.75, 1].map((p) => <i key={p} style={{ background: shade(Math.ceil(p * max)) }} />)} More
    </div>
  );

  if (granularity === "month") {
    return (
      <>
        <div className="lgs-tiles">
          {trend.map((b) => (
            <div key={b.key} className="lgs-tile" style={{ background: shade(b.count) }} title={`${b.label} • ${b.count} txns`}>
              <span>{b.label}</span><strong>{b.count}</strong>
            </div>
          ))}
        </div>
        {legend}
      </>
    );
  }

  const offset = new Date(`${trend[0].key}T00:00:00Z`).getUTCDay();
  const cells = [...Array(offset).fill(null), ...trend];
  return (
    <>
      <div className="lgs-heat-wrap">
        <div className="lgs-heat">
          {cells.map((b, i) =>
            b ? <i key={b.key} style={{ background: shade(b.count) }} title={`${b.label} • ${b.count} txns • Net ${moneyExact(b.net)}`} />
              : <i key={`e${i}`} style={{ background: "transparent" }} />
          )}
        </div>
      </div>
      {legend}
    </>
  );
}

function Sparkline({ values, color = LINE_C }) {
  if (!values || values.length < 2) return null;
  const W = 110, H = 28, lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * W},${H - 3 - ((v - lo) / span) * (H - 6)}`).join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" points={pts} />
    </svg>
  );
}

// ---------- pagination ----------
function Pager({ page, totalPages, onPage }) {
  const pages = [];
  const from = Math.max(1, Math.min(page - 2, totalPages - 4));
  const to = Math.min(totalPages, from + 4);
  for (let p = from; p <= to; p++) pages.push(p);
  return (
    <div className="lgs-pager-btns">
      <button className="lgs-pg" disabled={page <= 1} onClick={() => onPage(1)} title="First"><ChevronsLeft size={14} /></button>
      <button className="lgs-pg" disabled={page <= 1} onClick={() => onPage(page - 1)} title="Previous"><ChevronLeft size={14} /></button>
      {pages.map((p) => (
        <button key={p} className={`lgs-pg ${p === page ? "on" : ""}`} onClick={() => onPage(p)}>{p}</button>
      ))}
      <button className="lgs-pg" disabled={page >= totalPages} onClick={() => onPage(page + 1)} title="Next"><ChevronRight size={14} /></button>
      <button className="lgs-pg" disabled={page >= totalPages} onClick={() => onPage(totalPages)} title="Last"><ChevronsRight size={14} /></button>
    </div>
  );
}

// ---------- main ----------
export default function LedgerStatement() {
  const navigate = useNavigate();
  const { ledgerCode } = useParams();
  const [sp] = useSearchParams();
  const code = ledgerCode || "";

  const [ledgers, setLedgers] = useState([]);
  const [ledgersLoading, setLedgersLoading] = useState(true);
  const [startDate, setStartDate] = useState(sp.get("startDate") || fyStart());
  const [endDate, setEndDate] = useState(sp.get("endDate") || today());
  const [preset, setPreset] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [refreshKey, setRefreshKey] = useState(0);

  const [stmt, setStmt] = useState(null);
  const [stmtLoading, setStmtLoading] = useState(false);
  const [ins, setIns] = useState(null);
  const [insLoading, setInsLoading] = useState(false);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [newestFirst, setNewestFirst] = useState(false);
  const [openRow, setOpenRow] = useState(null);
  const [exporting, setExporting] = useState(false);

  const invalid = startDate && endDate && startDate > endDate;

  // ledger list for the switcher
  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const res = await ledgerInsightApi.getLedgers();
        if (!off) setLedgers(Array.isArray(res?.data?.data) ? res.data.data : []);
      } catch { /* dropdown is optional here */ }
      finally { if (!off) setLedgersLoading(false); }
    })();
    return () => { off = true; };
  }, []);

  // statement (paginated)
  useEffect(() => {
    if (!code || invalid) return;
    let off = false;
    (async () => {
      setStmtLoading(true);
      setError("");
      try {
        const res = await ledgerInsightApi.getTransactions(code, { startDate, endDate, page, limit });
        if (off) return;
        if (!res?.data?.success) throw new Error(res?.data?.message || "Invalid response");
        setStmt(res.data);
        setOpenRow(null);
      } catch (e) {
        if (!off) { setError(errMsg(e)); setStmt(null); }
      } finally {
        if (!off) setStmtLoading(false);
      }
    })();
    return () => { off = true; };
  }, [code, startDate, endDate, page, limit, refreshKey, invalid]);

  // charts (independent of page)
  useEffect(() => {
    if (!code || invalid) return;
    let off = false;
    (async () => {
      setInsLoading(true);
      try {
        const res = await ledgerInsightApi.getInsights(code, { startDate, endDate });
        if (!off && res?.data?.success) setIns(res.data.data);
      } catch { if (!off) setIns(null); }
      finally { if (!off) setInsLoading(false); }
    })();
    return () => { off = true; };
  }, [code, startDate, endDate, refreshKey, invalid]);

  const d = stmt?.data;
  const pg = stmt?.pagination;
  const normal = d?.ledger?.normalBalance;
  const txs = useMemo(() => stmt?.transactions || [], [stmt]);

  const typesOnPage = useMemo(() => ["ALL", ...new Set(txs.map((t) => t.voucherType))], [txs]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let rows = txs.filter((t) => typeFilter === "ALL" || t.voucherType === typeFilter);
    if (needle) {
      rows = rows.filter((t) =>
        `${t.journalNumber} ${t.sourceNumber} ${t.description} ${t.counterAccount} ${t.voucherType}`.toLowerCase().includes(needle));
    }
    return newestFirst ? [...rows].reverse() : rows;
  }, [txs, q, typeFilter, newestFirst]);

  const pageDebit = visible.reduce((s, t) => s + t.debit, 0);
  const pageCredit = visible.reduce((s, t) => s + t.credit, 0);

  // derived stats from insights trend
  const trend = ins?.trend || [];
  const derived = useMemo(() => {
    if (!trend.length) return null;
    const peak = trend.reduce((a, b) => (b.closing > a.closing ? b : a));
    const low = trend.reduce((a, b) => (b.closing < a.closing ? b : a));
    const busy = trend.reduce((a, b) => (b.count > a.count ? b : a));
    const last = [...trend].reverse().find((b) => b.count > 0);
    return { peak, low, busy, last };
  }, [trend]);

  const voucherItems = useMemo(
    () => (ins?.byVoucherType || []).map((v) => ({ name: v.type.replaceAll("_", " "), value: v.count })),
    [ins],
  );

  // ----- actions -----
  const changeLedger = (c) => {
    setPage(1); setQ(""); setTypeFilter("ALL");
    navigate(`/accounting/ledger/${encodeURIComponent(c)}?startDate=${startDate}&endDate=${endDate}`);
  };
  const applyPreset = (p) => {
    const [s, e] = p.range();
    setStartDate(s); setEndDate(e); setPreset(p.id); setPage(1);
  };
  const exportPage = () => {
    if (!d) return;
    downloadCsv(`${d.ledger.code}_${startDate}_${endDate}_page${page}.csv`, [CSV_HEAD, ...visible.map(toCsvRow)]);
  };
  const exportAll = async () => {
    if (!d) return;
    setExporting(true);
    try {
      const all = [];
      let p = 1, totalPages = 1;
      do {
        const res = await ledgerInsightApi.getTransactions(code, { startDate, endDate, page: p, limit: 200 });
        all.push(...(res?.data?.transactions || []));
        totalPages = Number(res?.data?.pagination?.totalPages) || 1;
        p += 1;
      } while (p <= totalPages && p <= 50);
      downloadCsv(`${d.ledger.code}_${startDate}_${endDate}_full.csv`, [
        [`Ledger: ${d.ledger.name} (${d.ledger.code})`],
        [`Period: ${startDate} to ${endDate}`],
        [`Opening: ${Math.abs(d.openingBalance)} ${signType(d.openingBalance, normal)}`],
        CSV_HEAD,
        ...all.map(toCsvRow),
        [`Closing: ${Math.abs(d.closingBalance)} ${signType(d.closingBalance, normal)}`],
      ]);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setExporting(false);
    }
  };

  // table items incl. brought-forward / carried-forward rows
  const items = useMemo(() => {
    if (!d) return [];
    const bf = { kind: "bf", signed: d.pageOpeningBalance };
    const cf = pg && page >= pg.totalPages ? { kind: "cf", signed: d.closingBalance } : null;
    const body = visible.map((r) => ({ kind: "row", r }));
    return newestFirst ? [...(cf ? [cf] : []), ...body, bf] : [bf, ...body, ...(cf ? [cf] : [])];
  }, [d, pg, page, visible, newestFirst]);

  const loadingS = stmtLoading || !d;
  const loadingI = insLoading || !ins;

  return (
    <div className="dbd-page lgi-page lgs-page">
      {/* Header */}
      <div className="dbd-header">
        <div className="dbd-title">
          <h1>Ledger Statement</h1>
          <p>Complete transaction history with running balance, analytics and export.</p>
        </div>
        <div className="dbd-controls no-print">
          <button type="button" className="dbd-btn" onClick={() => navigate(`/accounting/ledger-insights`)}>
            <BarChart3 size={14} /> Insights
          </button>
          <button type="button" className="dbd-btn" onClick={() => setRefreshKey((k) => k + 1)} disabled={stmtLoading}>
            <RefreshCw size={14} style={{ animation: stmtLoading ? "lgsSpin .9s linear infinite" : "none" }} /> Refresh
          </button>
          <button type="button" className="dbd-btn" onClick={exportPage} disabled={!d}><Download size={14} /> Page CSV</button>
          <button type="button" className="dbd-btn" onClick={exportAll} disabled={!d || exporting}>
            <Download size={14} /> {exporting ? "Exporting…" : "Export all"}
          </button>
          <button type="button" className="dbd-btn dbd-btn-primary" onClick={() => window.print()} disabled={!d}>
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      {/* Picker */}
      <div className="lgi-picker-bar no-print">
        <LedgerSelect ledgers={ledgers} loading={ledgersLoading} value={d?.ledger?.code || code} onChange={changeLedger} />
        <label className="dbd-date"><span>From</span>
          <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPreset(""); setPage(1); }} />
        </label>
        <label className="dbd-date"><span>To</span>
          <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPreset(""); setPage(1); }} />
        </label>
        <div className="lgi-chips" style={{ flex: "1 1 100%" }}>
          {PRESETS.map((p) => (
            <button key={p.id} type="button" className={`lgi-chip ${preset === p.id ? "on" : ""}`} onClick={() => applyPreset(p)}>{p.label}</button>
          ))}
        </div>
      </div>

      {(invalid || error) && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 12px", borderRadius: 10, border: "1px solid #fecaca", background: "#fef2f2", color: "#991b1b", fontSize: 12, marginBottom: 12 }}>
          <AlertCircle size={14} /> {invalid ? "Start date cannot be after end date." : error}
        </div>
      )}

      {/* Hero */}
      <div className="lgi-hero">
        {loadingS ? (
          <><Sk w={44} h={44} style={{ borderRadius: 12 }} /><div style={{ flex: 1 }}><Sk w="40%" h={16} /><Sk w="25%" h={10} style={{ marginTop: 8 }} /></div></>
        ) : (
          <>
            <div className="lgi-avatar" style={{ width: 44, height: 44, fontSize: 15, borderRadius: 12 }}>{initials(d.ledger.name)}</div>
            <div style={{ minWidth: 0, flex: "1 1 200px" }}>
              <h2>{d.ledger.name}</h2>
              <p>{d.ledger.code} • {d.ledger.group?.name || "—"} • {formatDateLabel(startDate)} — {formatDateLabel(endDate)}</p>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span className="lgi-tag">{d.ledger.nature}</span>
              <span className="lgi-tag">{d.ledger.type}</span>
              <span className="lgi-tag">Normal {d.ledger.normalBalance}</span>
            </div>
          </>
        )}
      </div>

      {/* Cards row 1 — statement totals */}
      <div className="dbd-cards">
        <div className="dbd-card opening">
          <span><Scale size={12} style={{ marginRight: 4 }} /> Opening Balance</span>
          {loadingS ? <Sk /> : <strong>{money(Math.abs(d.openingBalance))} {signType(d.openingBalance, normal)}</strong>}
          <small>{loadingS ? <Sk w={90} h={10} /> : <>as of {formatDateLabel(startDate)}</>}</small>
        </div>
        <div className="dbd-card debit">
          <span><ArrowUpRight size={12} style={{ marginRight: 4 }} /> Total Debit</span>
          {loadingS ? <Sk /> : <strong>{money(d.totals.debit)}</strong>}
          <small>{loadingS ? <Sk w={90} h={10} /> : <>{pg.total} transactions</>}</small>
        </div>
        <div className="dbd-card credit">
          <span><ArrowDownRight size={12} style={{ marginRight: 4 }} /> Total Credit</span>
          {loadingS ? <Sk /> : <strong>{money(d.totals.credit)}</strong>}
          <small>{loadingS ? <Sk w={90} h={10} /> : <>Net <span className={d.totals.debit >= d.totals.credit ? "dbd-up" : "dbd-down"}>{money(Math.abs(d.totals.debit - d.totals.credit))} {d.totals.debit >= d.totals.credit ? "Dr" : "Cr"}</span></>}</small>
        </div>
        <div className="dbd-card closing">
          <span><Landmark size={12} style={{ marginRight: 4 }} /> Closing Balance</span>
          {loadingS ? <Sk /> : <strong style={{ color: "var(--dbd-success)" }}>{money(Math.abs(d.closingBalance))} {signType(d.closingBalance, normal)}</strong>}
          <small>{loadingS ? <Sk w={90} h={10} /> : <>as of {formatDateLabel(endDate)}</>}</small>
        </div>
      </div>

      {/* Cards row 2 — derived */}
      <div className="dbd-cards">
        <div className="dbd-card peak">
          <span><TrendingUp size={12} style={{ marginRight: 4 }} /> Peak Balance</span>
          {loadingI ? <Sk /> : <strong>{money(derived?.peak.closing || 0)}</strong>}
          <small>{loadingI ? <Sk w={90} h={10} /> : <>{derived?.peak.label || "—"}</>}</small>
        </div>
        <div className="dbd-card low">
          <span><TrendingDown size={12} style={{ marginRight: 4 }} /> Lowest Balance</span>
          {loadingI ? <Sk /> : <strong>{money(derived?.low.closing || 0)}</strong>}
          <small>{loadingI ? <Sk w={90} h={10} /> : <>{derived?.low.label || "—"}</>}</small>
        </div>
        <div className="dbd-card busy">
          <span><Flame size={12} style={{ marginRight: 4 }} /> Busiest {ins?.period.granularity || "period"}</span>
          {loadingI ? <Sk w="50%" /> : <strong>{derived?.busy.label || "—"}</strong>}
          <small>{loadingI ? <Sk w={90} h={10} /> : <>{derived?.busy.count || 0} transactions</>}</small>
        </div>
        <div className="dbd-card last">
          <span><CalendarClock size={12} style={{ marginRight: 4 }} /> Last Activity</span>
          {loadingI ? <Sk w="50%" /> : <strong>{derived?.last?.label || "—"}</strong>}
          <small>{loadingI ? <Sk w={90} h={10} /> : <>Avg {money(ins?.totals.avgTransaction)} / txn</>}</small>
        </div>
      </div>

      {/* Bridge + running balance */}
      <div className="dbd-graphs no-print">
        <div className="dbd-panel">
          <div className="dbd-panel-head"><h3>Running Balance</h3><small>Closing per {ins?.period.granularity || "bucket"}</small></div>
          <div className="dbd-panel-body">{loadingI ? <Sk w="100%" h={180} /> : <BalanceArea data={trend} />}</div>
        </div>
        <div className="dbd-panel">
          <div className="dbd-panel-head"><h3>Balance Bridge</h3><small>Opening → Closing</small></div>
          <div className="dbd-panel-body">
            {loadingS ? <Sk w="100%" h={220} /> : (
              <BalanceBridge opening={d.openingBalance} debit={d.totals.debit} credit={d.totals.credit} closing={d.closingBalance} />
            )}
          </div>
        </div>
      </div>

      {/* Net flow, cumulative, voucher mix */}
      <div className="dbd-graphs dbd-graphs-three no-print">
        <div className="dbd-panel">
          <div className="dbd-panel-head"><h3>Net Flow</h3><small>Debit − Credit</small></div>
          <div className="dbd-panel-body">
            <div className="dbd-legend">
              <span><span className="dbd-dot" style={{ background: DEBIT_C }} /> Net debit</span>
              <span><span className="dbd-dot" style={{ background: CREDIT_C }} /> Net credit</span>
            </div>
            {loadingI ? <Sk w="100%" h={190} /> : <NetFlowChart data={trend} />}
          </div>
        </div>
        <div className="dbd-panel">
          <div className="dbd-panel-head"><h3>Cumulative Flow</h3><small>Debit vs credit</small></div>
          <div className="dbd-panel-body">
            <div className="dbd-legend">
              <span><span className="dbd-dot" style={{ background: DEBIT_C }} /> Debit</span>
              <span><span className="dbd-dot" style={{ background: CREDIT_C }} /> Credit</span>
            </div>
            {loadingI ? <Sk w="100%" h={190} /> : <CumulativeChart data={trend} />}
          </div>
        </div>
        <div className="dbd-panel">
          <div className="dbd-panel-head"><h3>Voucher Mix</h3><small>By count</small></div>
          <div className="dbd-panel-body">{loadingI ? <Sk w="100%" h={160} /> : <Donut items={voucherItems} centerLabel="Txns" emptyText="No vouchers" />}</div>
        </div>
      </div>

      {/* Heatmap, weekday, counter accounts */}
      <div className="dbd-graphs dbd-graphs-three no-print">
        <div className="dbd-panel">
          <div className="dbd-panel-head"><h3>Activity Heatmap</h3><small>Transactions per {ins?.period.granularity || "day"}</small></div>
          <div className="dbd-panel-body">{loadingI ? <Sk w="100%" h={120} /> : <ActivityHeatmap trend={trend} granularity={ins.period.granularity} />}</div>
        </div>
        <div className="dbd-panel">
          <div className="dbd-panel-head"><h3>By Weekday</h3><small>Debit vs credit</small></div>
          <div className="dbd-panel-body">{loadingI ? <Sk w="100%" h={140} /> : <WeekdayCols data={ins.weekday} />}</div>
        </div>
        <div className="dbd-panel">
          <div className="dbd-panel-head"><h3>Top Counter Accounts</h3><small>By volume</small></div>
          <div className="dbd-panel-body">{loadingI ? <Sk w="100%" h={160} /> : <Rank rows={ins.topCounterAccounts} emptyText="No counter accounts" />}</div>
        </div>
      </div>

      {/* Statement table */}
      <div className="dbd-panel" style={{ marginBottom: 14 }}>
        <div className="dbd-panel-head">
          <h3>Statement</h3>
          <small style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            {!loadingS && <Sparkline values={txs.map((t) => t.balance)} />}
            {pg ? `${pg.total} entries • page ${pg.page} of ${Math.max(1, pg.totalPages)}` : ""}
          </small>
        </div>

        <div className="lgs-toolbar no-print">
          <div className="lgs-searchbox">
            <Search size={14} />
            <input placeholder="Search voucher, narration, counter account…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="lgi-chips">
            {typesOnPage.map((t) => (
              <button key={t} type="button" className={`lgi-chip ${typeFilter === t ? "on" : ""}`} onClick={() => setTypeFilter(t)}>
                {t === "ALL" ? "All" : t.replaceAll("_", " ")}
              </button>
            ))}
          </div>
          <button type="button" className="dbd-btn" style={{ minHeight: 32 }} onClick={() => setNewestFirst((v) => !v)}>
            <ArrowUpDown size={13} /> {newestFirst ? "Newest first" : "Oldest first"}
          </button>
        </div>

        <div className="dbd-panel-body" style={{ padding: 0 }}>
          <div className="dbd-table-wrap">
            <table className="dbd-table lgs-table">
              <thead>
                <tr>
                  <th>Date</th><th>Voucher</th><th>Particulars</th>
                  <th className="num">Debit</th><th className="num">Credit</th><th className="num">Balance</th>
                </tr>
              </thead>
              <tbody>
                {loadingS ? (
                  <tr><td colSpan={6} style={{ padding: 18 }}>
                    {[0, 1, 2, 3, 4, 5].map((i) => <Sk key={i} w="100%" h={14} style={{ marginTop: i ? 10 : 0 }} />)}
                  </td></tr>
                ) : visible.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 20, textAlign: "center", color: "var(--dbd-muted)" }}>
                    {txs.length ? "No entries match your filters on this page" : "No transactions in this period"}
                  </td></tr>
                ) : (
                  items.map((it, idx) => {
                    if (it.kind !== "row") {
                      const label = it.kind === "bf" ? (page > 1 ? "Brought forward" : "Opening balance") : "Closing balance (carried forward)";
                      return (
                        <tr key={`${it.kind}-${idx}`} className={it.kind === "bf" ? "lgs-bf" : "lgs-cf"}>
                          <td colSpan={5}>{label}</td>
                          <td className="num">{moneyExact(Math.abs(it.signed))}<DrCr type={signType(it.signed, normal)} /></td>
                        </tr>
                      );
                    }
                    const r = it.r;
                    const open = openRow === r._id;
                    return (
                      <FragmentRow key={r._id} r={r} open={open} onToggle={() => setOpenRow(open ? null : r._id)} />
                    );
                  })
                )}
              </tbody>
              {!loadingS && visible.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={3}>Page total{typeFilter !== "ALL" || q ? " (filtered)" : ""}</td>
                    <td className="num" style={{ color: DEBIT_C }}>{moneyExact(pageDebit)}</td>
                    <td className="num" style={{ color: "#d97706" }}>{moneyExact(pageCredit)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        <div className="lgs-pager no-print">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            Rows
            <select className="lgs-select" value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            {pg && <>Showing {pg.total ? (pg.page - 1) * pg.limit + 1 : 0}–{Math.min(pg.page * pg.limit, pg.total)} of {pg.total}</>}
          </span>
          {pg && pg.totalPages > 1 && <Pager page={page} totalPages={pg.totalPages} onPage={setPage} />}
        </div>
      </div>
    </div>
  );
}

// Row + expandable detail
function FragmentRow({ r, open, onToggle }) {
  return (
    <>
      <tr className="lgs-row" onClick={onToggle}>
        <td style={{ whiteSpace: "nowrap" }}>{formatDateLabel(r.date)}</td>
        <td>
          <strong>{r.journalNumber}</strong>
          <div style={{ fontSize: 10, color: "var(--dbd-muted)" }}>{String(r.voucherType).replaceAll("_", " ")}</div>
        </td>
        <td style={{ maxWidth: 280 }}>
          <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.counterAccount}>{r.counterAccount || "—"}</div>
          {r.description && r.description !== r.counterAccount && (
            <div style={{ fontSize: 11, color: "var(--dbd-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.description}</div>
          )}
        </td>
        <td className="num" style={{ color: r.debit ? DEBIT_C : "var(--dbd-muted)", fontWeight: 700 }}>{r.debit ? moneyExact(r.debit) : "—"}</td>
        <td className="num" style={{ color: r.credit ? "#d97706" : "var(--dbd-muted)", fontWeight: 700 }}>{r.credit ? moneyExact(r.credit) : "—"}</td>
        <td className="num" style={{ fontWeight: 700 }}>{moneyExact(Math.abs(r.balance))}<DrCr type={r.balanceType} /></td>
      </tr>
      {open && (
        <tr className="lgs-detail">
          <td colSpan={6}>
            <strong style={{ color: "var(--dbd-text)" }}>Reference:</strong> {r.sourceNumber || "—"} &nbsp;•&nbsp;
            <strong style={{ color: "var(--dbd-text)" }}>Journal:</strong> {r.journalNumber} &nbsp;•&nbsp;
            <strong style={{ color: "var(--dbd-text)" }}>Counter:</strong> {r.counterAccount || "—"}
            <div style={{ marginTop: 4 }}><strong style={{ color: "var(--dbd-text)" }}>Narration:</strong> {r.description || "—"}</div>
          </td>
        </tr>
      )}
    </>
  );
}