import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  RefreshCw, Search, ChevronDown, BookOpen, ArrowUpRight, ArrowDownRight,
  Scale, Hash, Gauge, AlertCircle, Landmark, Trophy,
} from "lucide-react";
import ledgerInsightApi from "../services/modules/ledgerInsightApi";
import "./Dashboard.css";
import "./LedgerInsights.css";

// ---------- helpers ----------
const toLocalDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const today = () => toLocalDate(new Date());
const monthStart = () => {
  const n = new Date();
  return toLocalDate(new Date(n.getFullYear(), n.getMonth(), 1));
};
export const fyStart = () => {
  const n = new Date();
  const y = n.getMonth() >= 3 ? n.getFullYear() : n.getFullYear() - 1;
  return `${y}-04-01`;
};
const quarterStart = () => {
  const n = new Date();
  return toLocalDate(new Date(n.getFullYear(), Math.floor(n.getMonth() / 3) * 3, 1));
};
const daysAgo = (k) => {
  const d = new Date();
  d.setDate(d.getDate() - k);
  return toLocalDate(d);
};

export const formatDateLabel = (v) => {
  if (!v) return "—";
  const d = new Date(String(v).length === 10 ? `${v}T00:00:00.000Z` : v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
};

const money0 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 0 });
const money2 = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const money = (v) => money0.format(Math.round(Number(v || 0)));
export const moneyExact = (v) => money2.format(Number(v || 0));
export const compact = (v) => {
  const n = Number(v || 0);
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)} k`;
  return money(n);
};
export const drCr = (type) => (type === "CREDIT" ? "Cr" : "Dr");
export const initials = (s) => String(s || "?").trim().slice(0, 2).toUpperCase();
export const errMsg = (e) =>
  e?.response?.data?.message || e?.message || "Unable to load ledger insights.";

export const COLORS = ["#2563eb", "#f59e0b", "#8b5cf6", "#16a34a", "#dc2626", "#64748b", "#0ea5e9", "#ec4899"];
export const DEBIT_C = "#2563eb";
export const CREDIT_C = "#f59e0b";
export const LINE_C = "#16a34a";

export const Empty = ({ h = 160, text }) => (
  <div style={{ height: h, display: "grid", placeItems: "center", color: "var(--dbd-muted)", fontSize: 12 }}>
    {text}
  </div>
);

export const Sk = ({ w = "60%", h = 18, style }) => (
  <div className="dbd-skeleton" style={{ width: w, height: h, ...style }} />
);

// ---------- charts (pure SVG / CSS, theme-aware) ----------

// Debit & credit bars per bucket + closing balance line (own scale)
export function MovementChart({ data }) {
  if (!data?.length || !data.some((d) => d.debit || d.credit))
    return <Empty h={200} text="No movement in this period" />;
  const W = 720, H = 210, L = 40, R = 12, T = 14, B = 26;
  const pw = W - L - R, ph = H - T - B;
  const max = Math.max(1, ...data.map((d) => Math.max(d.debit, d.credit)));
  const slot = pw / data.length;
  const bw = Math.min(18, Math.max(3, slot * 0.34));
  const cx = (i) => L + slot * i + slot / 2;
  const y = (v) => T + ph - (v / max) * ph;

  const cl = data.map((d) => d.closing);
  const lo = Math.min(...cl), hi = Math.max(...cl);
  const span = hi - lo || 1;
  const yl = (v) => T + ph - ((v - lo) / span) * ph;
  const line = data.map((d, i) => `${cx(i)},${yl(d.closing)}`).join(" ");
  const every = Math.ceil(data.length / 14);

  return (
    <div className="dbd-trend-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Debit, credit and closing balance">
        {[0, 1, 2, 3, 4].map((t) => (
          <line key={t} x1={L} x2={W - R} y1={T + (ph * t) / 4} y2={T + (ph * t) / 4} stroke="var(--dbd-border)" opacity="0.7" />
        ))}
        {[0, 2, 4].map((t) => (
          <text key={t} x={L - 6} y={T + (ph * t) / 4 + 3} textAnchor="end" fontSize="9" fill="var(--dbd-muted)">
            {compact(max - (max * t) / 4).replace("₹", "")}
          </text>
        ))}
        {data.map((d, i) => (
          <g key={d.key}>
            <rect x={cx(i) - bw - 1} y={y(d.debit)} width={bw} height={Math.max(0, T + ph - y(d.debit))} rx="3" fill={DEBIT_C}>
              <title>{`${d.label} • Debit ${moneyExact(d.debit)}`}</title>
            </rect>
            <rect x={cx(i) + 1} y={y(d.credit)} width={bw} height={Math.max(0, T + ph - y(d.credit))} rx="3" fill={CREDIT_C}>
              <title>{`${d.label} • Credit ${moneyExact(d.credit)}`}</title>
            </rect>
            {i % every === 0 && (
              <text x={cx(i)} y={H - 8} textAnchor="middle" fontSize="9" fill="var(--dbd-secondary)">{d.label}</text>
            )}
          </g>
        ))}
        <polyline fill="none" stroke={LINE_C} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" points={line} />
        {data.map((d, i) => (
          <circle key={d.key} cx={cx(i)} cy={yl(d.closing)} r="2.8" fill={LINE_C} stroke="white" strokeWidth="1">
            <title>{`${d.label} • Closing ${moneyExact(d.closing)}`}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}

// Running balance area chart with zero baseline
export function BalanceArea({ data }) {
  if (!data?.length) return <Empty h={180} text="No data" />;
  const W = 640, H = 180, L = 44, R = 12, T = 12, B = 24;
  const pw = W - L - R, ph = H - T - B;
  const vals = data.map((d) => d.closing);
  const lo = Math.min(0, ...vals), hi = Math.max(0, ...vals);
  const span = hi - lo || 1;
  const step = data.length === 1 ? pw : pw / (data.length - 1);
  const x = (i) => L + i * step;
  const y = (v) => T + ph - ((v - lo) / span) * ph;
  const zero = y(0);
  const pts = data.map((d, i) => `${x(i)},${y(d.closing)}`).join(" ");
  const area = `M ${x(0)},${zero} ${data.map((d, i) => `L ${x(i)},${y(d.closing)}`).join(" ")} L ${x(data.length - 1)},${zero} Z`;
  const every = Math.ceil(data.length / 10);
  return (
    <div className="dbd-trend-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Running balance">
        <defs>
          <linearGradient id="lgiArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <line x1={L} x2={W - R} y1={zero} y2={zero} stroke="var(--dbd-muted)" strokeDasharray="4 4" />
        <text x={L - 6} y={y(hi) + 3} textAnchor="end" fontSize="9" fill="var(--dbd-muted)">{compact(hi).replace("₹", "")}</text>
        <text x={L - 6} y={zero + 3} textAnchor="end" fontSize="9" fill="var(--dbd-muted)">0</text>
        {lo < 0 && (
          <text x={L - 6} y={y(lo) + 3} textAnchor="end" fontSize="9" fill="var(--dbd-muted)">{compact(lo).replace("₹", "")}</text>
        )}
        <path d={area} fill="url(#lgiArea)" />
        <polyline fill="none" stroke="#8b5cf6" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" points={pts} />
        {data.map((d, i) => (
          <g key={d.key}>
            <circle cx={x(i)} cy={y(d.closing)} r="3" fill="#8b5cf6" stroke="white" strokeWidth="1.2">
              <title>{`${d.label} • ${moneyExact(d.closing)}`}</title>
            </circle>
            {i % every === 0 && (
              <text x={x(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="var(--dbd-secondary)">{d.label}</text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

export function Donut({ items, centerLabel, emptyText }) {
  const total = (items || []).reduce((s, i) => s + Math.max(0, Number(i.value || 0)), 0);
  if (!items?.length || total === 0) return <Empty text={emptyText} />;
  const r = 62, stroke = 18, C = 2 * Math.PI * r;
  let used = 0;
  return (
    <div className="dbd-outstanding-wrap">
      <svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label={centerLabel} style={{ flex: "0 0 auto" }}>
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--dbd-border)" strokeWidth={stroke} />
        {items.map((it, i) => {
          const len = (C * Math.max(0, it.value)) / total;
          const c = (
            <circle
              key={it.name} cx="70" cy="70" r={r} fill="none"
              stroke={COLORS[i % COLORS.length]} strokeWidth={stroke}
              strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-used}
              transform="rotate(-90 70 70)"
            />
          );
          used += len;
          return c;
        })}
        <text x="70" y="68" textAnchor="middle" fontSize="13" fontWeight="800" fill="var(--dbd-text)">{total}</text>
        <text x="70" y="82" textAnchor="middle" fontSize="9" fill="var(--dbd-muted)">{centerLabel}</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 12, minWidth: 0, flex: "1 1 120px" }}>
        {items.map((it, i) => (
          <div key={it.name} style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span className="dbd-dot" style={{ background: COLORS[i % COLORS.length] }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: "1 1 auto" }}>{it.name}</span>
            <strong style={{ fontVariantNumeric: "tabular-nums" }}>{Math.round((it.value / total) * 100)}%</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SplitBar({ debit, credit }) {
  const total = debit + credit;
  if (!total) return <Empty h={60} text="No movement" />;
  const dp = (debit / total) * 100;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="lgi-split">
        <div style={{ width: `${dp}%`, background: DEBIT_C }} />
        <div style={{ width: `${100 - dp}%`, background: CREDIT_C }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, flexWrap: "wrap" }}>
        <span>
          <span className="dbd-dot" style={{ background: DEBIT_C }} /> Debit <strong>{dp.toFixed(1)}%</strong> • {moneyExact(debit)}
        </span>
        <span>
          <span className="dbd-dot" style={{ background: CREDIT_C }} /> Credit <strong>{(100 - dp).toFixed(1)}%</strong> • {moneyExact(credit)}
        </span>
      </div>
    </div>
  );
}

export function WeekdayCols({ data }) {
  if (!data?.some((d) => d.count)) return <Empty h={140} text="No activity" />;
  const max = Math.max(1, ...data.map((d) => Math.max(d.debit, d.credit)));
  return (
    <div className="lgi-cols">
      {data.map((d) => (
        <div
          className="lgi-col" key={d.day}
          title={`${d.day} • ${d.count} txns • Dr ${moneyExact(d.debit)} • Cr ${moneyExact(d.credit)}`}
        >
          <div className="bars">
            <i style={{ height: `${(d.debit / max) * 100}%`, background: DEBIT_C }} />
            <i style={{ height: `${(d.credit / max) * 100}%`, background: CREDIT_C }} />
          </div>
          <span>{d.day}</span>
          <em>{d.count}</em>
        </div>
      ))}
    </div>
  );
}

export function Rank({ rows, emptyText }) {
  if (!rows?.length) return <Empty h={100} text={emptyText} />;
  const max = Math.max(1, ...rows.map((r) => r.volume));
  return (
    <div className="lgi-rank">
      {rows.map((r, i) => (
        <div key={r._id} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div className="lgi-rank-row">
            <div className="lgi-rank-n">{i + 1}</div>
            <div className="lgi-rank-main">
              <strong title={r.name}>{r.name}</strong>
              <small>{r.code} • {r.count} entries</small>
            </div>
            <div className="lgi-rank-amt">{moneyExact(r.volume)}</div>
          </div>
          <div style={{ height: 6, borderRadius: 999, background: "var(--dbd-border)", overflow: "hidden" }}>
            <div
              style={{
                width: `${Math.max(4, (r.volume / max) * 100)}%`,
                height: "100%",
                background: COLORS[i % COLORS.length],
                borderRadius: 999,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------- ledger dropdown ----------
export function LedgerSelect({ ledgers, loading, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const selected = ledgers.find((l) => l.code === value);

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = needle
      ? ledgers.filter((l) =>
          `${l.code} ${l.name} ${l.ledgerGroupId?.name || ""}`.toLowerCase().includes(needle),
        )
      : ledgers;
    const map = new Map();
    for (const l of filtered) {
      const g = l.ledgerGroupId?.name || "Other";
      if (!map.has(g)) map.set(g, []);
      map.get(g).push(l);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [ledgers, q]);

  return (
    <div className={`lgi-select ${open ? "open" : ""}`} ref={ref}>
      <button type="button" className="lgi-select-btn" onClick={() => setOpen((o) => !o)} disabled={loading}>
        <div className="lgi-avatar">{selected ? initials(selected.name) : <BookOpen size={15} />}</div>
        <div className="lgi-select-text">
          <strong>{loading ? "Loading ledgers…" : selected ? selected.name : "Select a ledger"}</strong>
          <small>
            {selected
              ? `${selected.code} • ${selected.ledgerGroupId?.name || selected.nature}`
              : "Search by name, code or group"}
          </small>
        </div>
        <ChevronDown size={16} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
      </button>

      {open && (
        <div className="lgi-pop">
          <div className="lgi-search">
            <Search size={14} />
            <input autoFocus placeholder="Search ledger…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="lgi-list">
            {groups.length === 0 && <div className="lgi-empty">No ledgers found</div>}
            {groups.map(([g, items]) => (
              <div key={g}>
                <div className="lgi-group">{g}</div>
                {items.map((l) => (
                  <button
                    type="button"
                    key={l._id}
                    className={`lgi-item ${l.code === value ? "active" : ""}`}
                    onClick={() => {
                      onChange(l.code);
                      setOpen(false);
                      setQ("");
                    }}
                  >
                    <div className="lgi-avatar" style={{ width: 28, height: 28, fontSize: 11 }}>{initials(l.name)}</div>
                    <div className="lgi-select-text">
                      <strong>{l.name}</strong>
                      <small>{l.code}</small>
                    </div>
                    <span className="bal" style={{ color: l.currentBalanceType === "CREDIT" ? "#d97706" : "#2563eb" }}>
                      {moneyExact(l.currentBalance)} {drCr(l.currentBalanceType)}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- presets ----------
export const PRESETS = [
  { id: "month", label: "This month", range: () => [monthStart(), today()] },
  { id: "quarter", label: "This quarter", range: () => [quarterStart(), today()] },
  { id: "fy", label: "Financial year", range: () => [fyStart(), today()] },
  { id: "30", label: "Last 30 days", range: () => [daysAgo(29), today()] },
];

// ---------- main ----------
export default function LedgerInsights() {
  const navigate = useNavigate();
  const [ledgers, setLedgers] = useState([]);
  const [ledgersLoading, setLedgersLoading] = useState(true);
  const [code, setCode] = useState("");
  const [startDate, setStartDate] = useState(fyStart);
  const [endDate, setEndDate] = useState(today);
  const [preset, setPreset] = useState("fy");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const invalid = startDate && endDate && startDate > endDate;

  // ledger list
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await ledgerInsightApi.getLedgers();
        if (!cancelled) setLedgers(Array.isArray(res?.data?.data) ? res.data.data : []);
      } catch (e) {
        if (!cancelled) setError(errMsg(e));
      } finally {
        if (!cancelled) setLedgersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // one API call -> everything
  useEffect(() => {
    if (!code || invalid) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await ledgerInsightApi.getInsights(code, { startDate, endDate });
        if (cancelled) return;
        if (!res?.data?.success) throw new Error(res?.data?.message || "Invalid response");
        setData(res.data.data);
      } catch (e) {
        if (!cancelled) {
          setError(errMsg(e));
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, startDate, endDate, refreshKey, invalid]);

  const applyPreset = (p) => {
    const [s, e] = p.range();
    setStartDate(s);
    setEndDate(e);
    setPreset(p.id);
  };

  const t = data?.totals;
  const voucherItems = useMemo(
    () => (data?.byVoucherType || []).map((v) => ({ name: v.type.replaceAll("_", " "), value: v.count })),
    [data],
  );
  const counterRows = data?.topCounterAccounts || [];
  const showSkeleton = loading;

  return (
    <div className="dbd-page lgi-page">
      {/* Header */}
      <div className="dbd-header">
        <div className="dbd-title">
          <h1>Ledger Insights</h1>
          <p>Pick a ledger — balances, movement, trends and top accounts load automatically.</p>
        </div>
        <div className="dbd-controls">
          <button
            type="button" className="dbd-btn"
            onClick={() => setRefreshKey((k) => k + 1)}
            disabled={loading || !code}
          >
            <RefreshCw size={14} style={{ animation: loading ? "lgiSpin .9s linear infinite" : "none" }} /> Refresh
          </button>
          {code && (
            <button
              type="button" className="dbd-btn dbd-btn-primary"
              onClick={() =>
                navigate(
                  `/accounting/ledger/${encodeURIComponent(code)}?startDate=${startDate}&endDate=${endDate}`,
                )
              }
            >
              Full Statement
            </button>
          )}
        </div>
      </div>

      {/* Picker bar */}
      <div className="lgi-picker-bar">
        <LedgerSelect ledgers={ledgers} loading={ledgersLoading} value={code} onChange={setCode} />
        <label className="dbd-date">
          <span>From</span>
          <input
            type="date" value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPreset("");
            }}
          />
        </label>
        <label className="dbd-date">
          <span>To</span>
          <input
            type="date" value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPreset("");
            }}
          />
        </label>
        <div className="lgi-chips" style={{ flex: "1 1 100%" }}>
          {PRESETS.map((p) => (
            <button
              key={p.id} type="button"
              className={`lgi-chip ${preset === p.id ? "on" : ""}`}
              onClick={() => applyPreset(p)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {(invalid || error) && (
        <div
          style={{
            display: "flex", gap: 8, alignItems: "center", padding: "10px 12px",
            borderRadius: 10, border: "1px solid #fecaca", background: "#fef2f2",
            color: "#991b1b", fontSize: 12, marginBottom: 12,
          }}
        >
          <AlertCircle size={14} /> {invalid ? "Start date cannot be after end date." : error}
        </div>
      )}

      {!code ? (
        <div className="lgi-hint">
          <Landmark size={34} color="var(--dbd-primary)" />
          <h3>Select a ledger to begin</h3>
          <span style={{ fontSize: 12 }}>
            Opening and closing balance, debit vs credit, monthly trend, voucher mix and more — in one view.
          </span>
        </div>
      ) : (
        <>
          {/* Ledger hero */}
          <div className="lgi-hero">
            {showSkeleton || !data ? (
              <>
                <Sk w={44} h={44} style={{ borderRadius: 12 }} />
                <div style={{ flex: 1 }}>
                  <Sk w="40%" h={16} />
                  <Sk w="25%" h={10} style={{ marginTop: 8 }} />
                </div>
              </>
            ) : (
              <>
                <div className="lgi-avatar" style={{ width: 44, height: 44, fontSize: 15, borderRadius: 12 }}>
                  {initials(data.ledger.name)}
                </div>
                <div style={{ minWidth: 0, flex: "1 1 200px" }}>
                  <h2>{data.ledger.name}</h2>
                  <p>
                    {data.ledger.code} • {data.ledger.group?.name || "—"} •{" "}
                    {formatDateLabel(data.period.startDate)} — {formatDateLabel(data.period.endDate)} (
                    {data.period.days} days)
                  </p>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span className="lgi-tag">{data.ledger.nature}</span>
                  <span className="lgi-tag">{data.ledger.type}</span>
                  {!data.ledger.isActive && (
                    <span className="lgi-tag" style={{ color: "#dc2626" }}>Inactive</span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Stat cards row 1 */}
          <div className="dbd-cards">
            <div className="dbd-card opening">
              <span><Scale size={12} style={{ marginRight: 4 }} /> Opening Balance</span>
              {showSkeleton || !data ? (
                <Sk />
              ) : (
                <strong>{money(data.opening.amount)} {drCr(data.opening.type)}</strong>
              )}
              <small>
                {showSkeleton || !data ? <Sk w={90} h={10} /> : <>as of {formatDateLabel(data.period.startDate)}</>}
              </small>
            </div>
            <div className="dbd-card debit">
              <span><ArrowUpRight size={12} style={{ marginRight: 4 }} /> Total Debit</span>
              {showSkeleton || !t ? <Sk /> : <strong>{money(t.debit)}</strong>}
              <small>
                {showSkeleton || !t ? <Sk w={90} h={10} /> : <>{t.debitBuckets} active {data.period.granularity}s</>}
              </small>
            </div>
            <div className="dbd-card credit">
              <span><ArrowDownRight size={12} style={{ marginRight: 4 }} /> Total Credit</span>
              {showSkeleton || !t ? <Sk /> : <strong>{money(t.credit)}</strong>}
              <small>
                {showSkeleton || !t ? (
                  <Sk w={90} h={10} />
                ) : (
                  <>
                    Net{" "}
                    <span className={t.net >= 0 ? "dbd-up" : "dbd-down"}>
                      {money(Math.abs(t.net))} {t.net >= 0 ? "Dr" : "Cr"}
                    </span>
                  </>
                )}
              </small>
            </div>
            <div className="dbd-card closing">
              <span><Landmark size={12} style={{ marginRight: 4 }} /> Closing Balance</span>
              {showSkeleton || !data ? (
                <Sk />
              ) : (
                <strong style={{ color: "var(--dbd-success)" }}>
                  {money(data.closing.amount)} {drCr(data.closing.type)}
                </strong>
              )}
              <small>
                {showSkeleton || !data ? <Sk w={90} h={10} /> : <>as of {formatDateLabel(data.period.endDate)}</>}
              </small>
            </div>
          </div>

          {/* Stat cards row 2 */}
          <div className="dbd-cards">
            <div className="dbd-card count">
              <span><Hash size={12} style={{ marginRight: 4 }} /> Transactions</span>
              {showSkeleton || !t ? <Sk w="40%" /> : <strong>{t.count}</strong>}
              <small>
                {showSkeleton || !t ? <Sk w={90} h={10} /> : <>{t.activeBuckets} active {data.period.granularity}s</>}
              </small>
            </div>
            <div className="dbd-card avg">
              <span><Gauge size={12} style={{ marginRight: 4 }} /> Avg per Transaction</span>
              {showSkeleton || !t ? <Sk /> : <strong>{money(t.avgTransaction)}</strong>}
              <small>
                {showSkeleton || !t ? (
                  <Sk w={90} h={10} />
                ) : (
                  <span style={{ color: "var(--dbd-muted)" }}>debit + credit volume</span>
                )}
              </small>
            </div>
            <div className="dbd-card debit">
              <span><Trophy size={12} style={{ marginRight: 4 }} /> Largest Debit</span>
              {showSkeleton || !t ? <Sk /> : <strong>{money(t.maxDebit)}</strong>}
              <small>
                {showSkeleton || !t ? (
                  <Sk w={90} h={10} />
                ) : (
                  <span style={{ color: "var(--dbd-muted)" }}>single entry</span>
                )}
              </small>
            </div>
            <div className="dbd-card credit">
              <span><Trophy size={12} style={{ marginRight: 4 }} /> Largest Credit</span>
              {showSkeleton || !t ? <Sk /> : <strong>{money(t.maxCredit)}</strong>}
              <small>
                {showSkeleton || !t ? (
                  <Sk w={90} h={10} />
                ) : (
                  <span style={{ color: "var(--dbd-muted)" }}>single entry</span>
                )}
              </small>
            </div>
          </div>

          {/* Movement + split */}
          <div className="dbd-graphs">
            <div className="dbd-panel">
              <div className="dbd-panel-head">
                <h3>Movement &amp; Closing Balance</h3>
                <small>{data ? `per ${data.period.granularity}` : ""}</small>
              </div>
              <div className="dbd-panel-body">
                <div className="dbd-legend">
                  <span><span className="dbd-dot" style={{ background: DEBIT_C }} /> Debit</span>
                  <span><span className="dbd-dot" style={{ background: CREDIT_C }} /> Credit</span>
                  <span><span className="dbd-dot" style={{ background: LINE_C }} /> Closing balance (own scale)</span>
                </div>
                {showSkeleton || !data ? <Sk w="100%" h={200} /> : <MovementChart data={data.trend} />}
              </div>
            </div>

            <div className="dbd-panel">
              <div className="dbd-panel-head">
                <h3>Debit vs Credit</h3>
                <small>Share of volume</small>
              </div>
              <div className="dbd-panel-body">
                {showSkeleton || !t ? <Sk w="100%" h={60} /> : <SplitBar debit={t.debit} credit={t.credit} />}
                <div
                  style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
                    textTransform: "uppercase", color: "var(--dbd-secondary)", marginTop: 6,
                  }}
                >
                  By weekday
                </div>
                {showSkeleton || !data ? <Sk w="100%" h={140} /> : <WeekdayCols data={data.weekday} />}
              </div>
            </div>
          </div>

          {/* Three charts */}
          <div className="dbd-graphs dbd-graphs-three">
            <div className="dbd-panel">
              <div className="dbd-panel-head">
                <h3>Running Balance</h3>
                <small>Closing per {data?.period.granularity || "bucket"}</small>
              </div>
              <div className="dbd-panel-body">
                {showSkeleton || !data ? <Sk w="100%" h={180} /> : <BalanceArea data={data.trend} />}
              </div>
            </div>
            <div className="dbd-panel">
              <div className="dbd-panel-head">
                <h3>Voucher Mix</h3>
                <small>By transaction count</small>
              </div>
              <div className="dbd-panel-body">
                {showSkeleton || !data ? (
                  <Sk w="100%" h={160} />
                ) : (
                  <Donut items={voucherItems} centerLabel="Txns" emptyText="No vouchers" />
                )}
              </div>
            </div>
            <div className="dbd-panel">
              <div className="dbd-panel-head">
                <h3>Top Counter Accounts</h3>
                <small>By volume</small>
              </div>
              <div className="dbd-panel-body">
                {showSkeleton || !data ? (
                  <Sk w="100%" h={160} />
                ) : (
                  <Rank rows={counterRows} emptyText="No counter accounts" />
                )}
              </div>
            </div>
          </div>

          {/* Tables */}
          <div className="dbd-graphs dbd-graphs-even">
            {[
              { title: "Recent Transactions", sub: "Latest 8", rows: data?.recent },
              { title: "Largest Transactions", sub: "Top 5 by amount", rows: data?.largest },
            ].map((tbl) => (
              <div className="dbd-panel" key={tbl.title}>
                <div className="dbd-panel-head">
                  <h3>{tbl.title}</h3>
                  <small>{tbl.sub}</small>
                </div>
                <div className="dbd-panel-body" style={{ padding: 0 }}>
                  <div className="dbd-table-wrap">
                    <table className="dbd-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Voucher</th>
                          <th>Counter</th>
                          <th className="num">Debit</th>
                          <th className="num">Credit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {showSkeleton || !data ? (
                          <tr>
                            <td colSpan={5} style={{ padding: 18 }}>
                              {[0, 1, 2].map((i) => (
                                <Sk key={i} w="100%" h={14} style={{ marginTop: i ? 8 : 0 }} />
                              ))}
                            </td>
                          </tr>
                        ) : !tbl.rows?.length ? (
                          <tr>
                            <td colSpan={5} style={{ padding: 16, textAlign: "center", color: "var(--dbd-muted)" }}>
                              No transactions in this period
                            </td>
                          </tr>
                        ) : (
                          tbl.rows.map((r) => (
                            <tr key={r._id}>
                              <td style={{ whiteSpace: "nowrap" }}>{formatDateLabel(r.date)}</td>
                              <td>
                                <strong>{r.journalNumber}</strong>
                                <div style={{ fontSize: 10, color: "var(--dbd-muted)" }}>
                                  {r.sourceType.replaceAll("_", " ")}
                                </div>
                              </td>
                              <td
                                style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                                title={r.counterAccount}
                              >
                                {r.counterAccount || "—"}
                              </td>
                              <td
                                className="num"
                                style={{ color: r.debit ? DEBIT_C : "var(--dbd-muted)", fontWeight: 700 }}
                              >
                                {r.debit ? moneyExact(r.debit) : "—"}
                              </td>
                              <td
                                className="num"
                                style={{ color: r.credit ? "#d97706" : "var(--dbd-muted)", fontWeight: 700 }}
                              >
                                {r.credit ? moneyExact(r.credit) : "—"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <style>{`@keyframes lgiSpin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}