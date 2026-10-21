import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
  Boxes,
  Download,
  IndianRupee,
  LayoutGrid,
  List,
  PackageX,
  RefreshCw,
  Repeat,
  Search,
  TrendingDown,
  Warehouse,
} from "lucide-react";
import stockMovementApi from "../../services/modules/stockMovementApi";
import productApi from "../../services/modules/productApi";

/* ================= constants ================= */
const PAGE_SIZE = 10;
const API_LIMIT = 100;
const ACCENT = "#144988";

const NAV = [
  { id: "overview", label: "Overview", icon: Warehouse },
  { id: "summary", label: "Stock Summary", icon: Boxes },
  { id: "movement", label: "Movements", icon: Repeat },
  { id: "ledger", label: "Stock Ledger", icon: BookOpen },
  { id: "lowStock", label: "Low Stock", icon: AlertTriangle },
  { id: "valuation", label: "Valuation", icon: IndianRupee },
];

const MOVEMENT_TYPES = [
  "OPENING", "PURCHASE", "PURCHASE_RETURN", "SALE", "DELIVERY", "SALES_RETURN",
  "ADJUSTMENT_IN", "ADJUSTMENT_OUT", "TRANSFER_IN", "TRANSFER_OUT", "GOODS_RECEIPT",
];

const PRESETS = [
  { id: "7d", label: "7D", days: 7 },
  { id: "30d", label: "30D", days: 30 },
  { id: "90d", label: "90D", days: 90 },
  { id: "year", label: "1Y", days: 365 },
  { id: "all", label: "All", days: 0 },
];

const PALETTE = ["#144988", "#0ea5a4", "#7c3aed", "#f59e0b", "#e11d48", "#0891b2", "#65a30d"];

/* ================= helpers ================= */
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const fmtNum = (v) => num(v).toLocaleString("en-IN", { maximumFractionDigits: 3 });
const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});
const fmtMoney = (v) => inr.format(num(v));
const fmtCompact = (v) => {
  const n = num(v);
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  if (Math.abs(n) >= 1e3) return `₹${(n / 1e3).toFixed(1)}k`;
  return `₹${Math.round(n)}`;
};
const fmtDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};
const toLocalDate = (d) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const label = (t) => String(t || "—").replaceAll("_", " ");

const getApiData = (res) => {
  const body = res?.data ?? res;
  return {
    data: Array.isArray(body?.data) ? body.data : [],
    pagination: body?.pagination ?? null,
  };
};

const fetchAllPages = async (apiMethod) => {
  const first = getApiData(await apiMethod({ page: 1, limit: API_LIMIT }));
  const totalPages = Math.max(1, num(first.pagination?.totalPages) || 1);
  const all = [...first.data];
  for (let page = 2; page <= totalPages; page += 1) {
    const r = getApiData(await apiMethod({ page, limit: API_LIMIT }));
    all.push(...r.data);
    if (!r.pagination && r.data.length < API_LIMIT) break;
  }
  return all;
};

const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const downloadCsv = (filename, columns, rows) => {
  if (!rows.length) {
    window.alert("No data available to export.");
    return;
  }
  const head = columns.map((c) => csvCell(c.label));
  const body = rows.map((r) => columns.map((c) => csvCell(c.csv ? c.csv(r) : r[c.key])));
  const csv = [head, ...body].map((r) => r.join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const isTracked = (p) => p?.type === "GOODS" && p?.trackInventory !== false;
const prodName = (m) => m?.name || m?.productId?.name || "Unknown Product";
const prodCode = (m) => m?.productCode || m?.productId?.productCode || "—";
const qtyIn = (m) => (m?.direction === "IN" ? num(m.quantity) : 0);
const qtyOut = (m) => (m?.direction === "OUT" ? num(m.quantity) : 0);
const closing = (m) =>
  m?.stockAfter !== undefined ? num(m.stockAfter) : num(m.stockBefore) + qtyIn(m) - qtyOut(m);

const stockState = (stock, reorder) => {
  if (stock <= 0) return "out";
  if (reorder > 0 && stock <= reorder) return "low";
  return "ok";
};
const meterPct = (stock, reorder) => {
  if (stock <= 0) return 0;
  if (reorder > 0) return Math.min(100, (stock / (reorder * 2)) * 100);
  return 100;
};

/* ================= visual components ================= */
function Donut({ segments, centerTop, centerBottom }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const R = 52;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="iv-donut">
      <svg viewBox="0 0 140 140" role="img" aria-label="Stock health">
        <circle cx="70" cy="70" r={R} fill="none" stroke="var(--iv-line)" strokeWidth="16" />
        {total > 0 &&
          segments.map((s) => {
            const len = (s.value / total) * C;
            const el = (
              <circle
                key={s.name}
                cx="70"
                cy="70"
                r={R}
                fill="none"
                stroke={s.color}
                strokeWidth="16"
                strokeDasharray={`${len} ${C - len}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 70 70)"
              >
                <title>{`${s.name}: ${s.value}`}</title>
              </circle>
            );
            offset += len;
            return el;
          })}
      </svg>
      <div className="iv-donut-center">
        <strong>{centerTop}</strong>
        <span>{centerBottom}</span>
      </div>
    </div>
  );
}

function FlowChart({ data }) {
  if (!data.length || data.every((d) => d.in === 0 && d.out === 0)) {
    return <div className="iv-muted-box">No stock movement in this period</div>;
  }
  const W = 640, H = 210, L = 38, R = 10, T = 12, B = 26;
  const pw = W - L - R, ph = H - T - B;
  const max = Math.max(1, ...data.flatMap((d) => [d.in, d.out]));
  const x = (i) => L + (data.length === 1 ? pw / 2 : (i * pw) / (data.length - 1));
  const y = (v) => T + ph - (v / max) * ph;
  const pts = (k) => data.map((d, i) => `${x(i)},${y(d[k])}`).join(" ");
  const area = (k) =>
    `M ${x(0)},${y(data[0][k])} ${data.map((d, i) => `L ${x(i)},${y(d[k])}`).join(" ")} L ${x(data.length - 1)},${T + ph} L ${x(0)},${T + ph} Z`;
  const every = Math.ceil(data.length / 8);
  return (
    <svg className="iv-flow" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Stock in and out trend">
      <defs>
        <linearGradient id="ivIn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#16a34a" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="ivOut" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e11d48" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#e11d48" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3].map((t) => {
        const yy = T + (ph * t) / 3;
        const val = max - (max * t) / 3;
        return (
          <g key={t}>
            <line x1={L} x2={W - R} y1={yy} y2={yy} stroke="var(--iv-line)" strokeDasharray="3 4" />
            <text x={L - 6} y={yy + 3} textAnchor="end" fontSize="9" fill="var(--iv-muted)">
              {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : Math.round(val)}
            </text>
          </g>
        );
      })}
      <path d={area("in")} fill="url(#ivIn)" />
      <path d={area("out")} fill="url(#ivOut)" />
      <polyline points={pts("in")} fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinejoin="round" />
      <polyline points={pts("out")} fill="none" stroke="#e11d48" strokeWidth="2.2" strokeLinejoin="round" />
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d.in)} r="2.6" fill="#16a34a">
            <title>{`${d.label} · In ${fmtNum(d.in)}`}</title>
          </circle>
          <circle cx={x(i)} cy={y(d.out)} r="2.6" fill="#e11d48">
            <title>{`${d.label} · Out ${fmtNum(d.out)}`}</title>
          </circle>
          {i % every === 0 && (
            <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="9" fill="var(--iv-muted)">
              {d.label}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

const Meter = ({ stock, reorder }) => {
  const st = stockState(stock, reorder);
  return (
    <div className="iv-meter" title={`${fmtNum(stock)} in stock`}>
      <div className={`iv-meter-fill iv-m-${st}`} style={{ width: `${Math.max(st === "out" ? 0 : 4, meterPct(stock, reorder))}%` }} />
    </div>
  );
};

const Pill = ({ type = "neutral", children }) => <span className={`iv-pill iv-pill-${type}`}>{children}</span>;

const StatusPill = ({ stock, reorder }) => {
  const s = stockState(stock, reorder);
  if (s === "out") return <Pill type="bad">Out of stock</Pill>;
  if (s === "low") return <Pill type="warn">Low stock</Pill>;
  return <Pill type="good">In stock</Pill>;
};

const Skeleton = ({ h = 14, w = "100%", style }) => <div className="iv-skel" style={{ height: h, width: w, ...style }} />;

const Empty = ({ text }) => (
  <div className="iv-empty">
    <PackageX size={30} />
    <strong>Nothing to show</strong>
    <span>{text}</span>
  </div>
);

function DataTable({ columns, rows, page, onPage, emptyText, footer }) {
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const p = Math.min(page, pages);
  const slice = rows.slice((p - 1) * PAGE_SIZE, p * PAGE_SIZE);
  if (!rows.length) return <Empty text={emptyText} />;
  return (
    <>
      <div className="iv-scroll">
        <table className="iv-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={c.align === "right" ? "r" : ""}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slice.map((r, i) => (
              <tr key={r._id || r.id || `${p}-${i}`}>
                {columns.map((c) => (
                  <td key={c.key} className={c.align === "right" ? "r" : ""}>
                    {c.render ? c.render(r) : (r[c.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {footer && (
            <tfoot>
              <tr>
                {footer.map((f, i) => (
                  <td key={i} className={f.align === "right" ? "r" : ""}>{f.value}</td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="iv-pager">
        <span>{rows.length} records</span>
        <div>
          <button type="button" className="iv-btn" disabled={p <= 1} onClick={() => onPage(p - 1)}>‹</button>
          <b>{p} / {pages}</b>
          <button type="button" className="iv-btn" disabled={p >= pages} onClick={() => onPage(p + 1)}>›</button>
        </div>
      </div>
    </>
  );
}

/* ================= main ================= */
export default function InventoryReport() {
  const [view, setView] = useState("overview");
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [updatedAt, setUpdatedAt] = useState(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [mType, setMType] = useState("ALL");
  const [direction, setDirection] = useState("ALL");
  const [preset, setPreset] = useState("30d");
  const [[fromDate, toDate], setRange] = useState(() => {
    const e = new Date();
    const s = new Date(e);
    s.setDate(e.getDate() - 29);
    return [toLocalDate(s), toLocalDate(e)];
  });
  const [layout, setLayout] = useState("table");
  const [page, setPage] = useState(1);

  /* ---- load ---- */
  const load = useCallback(async (signal) => {
    setLoading(true);
    setError("");
    try {
      const [p, m] = await Promise.all([
        fetchAllPages((params) => productApi.getAll({ ...params, status: "ACTIVE", trackInventory: true })),
        fetchAllPages((params) => stockMovementApi.getAll(params)),
      ]);
      if (signal.cancelled) return;
      setProducts(p.filter(isTracked));
      setMovements(m);
      setUpdatedAt(new Date());
    } catch (err) {
      if (!signal.cancelled)
        setError(err?.response?.data?.message || err?.message || "Failed to load inventory data.");
    } finally {
      if (!signal.cancelled) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const signal = { cancelled: false };
    void load(signal);
    return () => {
      signal.cancelled = true;
    };
  }, [load, refreshKey]);

  useEffect(() => setPage(1), [view, search, category, mType, direction, fromDate, toDate, layout]);

  const applyPreset = (p) => {
    setPreset(p.id);
    if (!p.days) return setRange(["", ""]);
    const e = new Date();
    const s = new Date(e);
    s.setDate(e.getDate() - (p.days - 1));
    setRange([toLocalDate(s), toLocalDate(e)]);
  };
  const onDate = (which, v) => {
    setPreset("custom");
    setRange(([s, e]) => (which === "s" ? [v, e] : [s, v]));
  };

  /* ---- derived: products ---- */
  const enriched = useMemo(
    () =>
      products.map((p) => {
        const stock = num(p.currentStock);
        const reorder = num(p.reorderLevel);
        const price = num(p.purchasePrice);
        return { ...p, currentStock: stock, reorderLevel: reorder, purchasePrice: price, value: stock * price, state: stockState(stock, reorder) };
      }),
    [products],
  );

  const categories = useMemo(
    () => [...new Set(enriched.map((p) => p.category).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [enriched],
  );

  const q = search.trim().toLowerCase();

  const productRows = useMemo(
    () =>
      enriched.filter((p) => {
        const okQ = !q || [p.name, p.productCode, p.category, p.brand].some((v) => String(v || "").toLowerCase().includes(q));
        return okQ && (category === "ALL" || p.category === category);
      }),
    [enriched, q, category],
  );
  const lowRows = useMemo(() => productRows.filter((p) => p.state === "low"), [productRows]);

  /* ---- derived: movements ---- */
  const inRange = useMemo(
    () =>
      movements.filter((m) => {
        const d = m.movementDate ? new Date(m.movementDate) : null;
        const bad = !d || Number.isNaN(d.getTime());
        if (fromDate && (bad || d < new Date(`${fromDate}T00:00:00`))) return false;
        if (toDate && (bad || d > new Date(`${toDate}T23:59:59.999`))) return false;
        return true;
      }),
    [movements, fromDate, toDate],
  );

  const movementRows = useMemo(
    () =>
      inRange
        .filter((m) => {
          if (mType !== "ALL" && m.movementType !== mType) return false;
          if (direction !== "ALL" && m.direction !== direction) return false;
          return (
            !q ||
            [m.productCode, m.productId?.name, m.referenceNumber, m.movementType, m.notes].some((v) =>
              String(v || "").toLowerCase().includes(q),
            )
          );
        })
        .sort((a, b) => new Date(b.movementDate) - new Date(a.movementDate)),
    [inRange, q, mType, direction],
  );

  const ledgerRows = useMemo(
    () => movementRows.map((m) => ({ ...m, inward: qtyIn(m), outward: qtyOut(m), closingStock: closing(m) })),
    [movementRows],
  );

  /* ---- derived: stats ---- */
  const stats = useMemo(() => {
    const value = enriched.reduce((s, p) => s + p.value, 0);
    const qty = enriched.reduce((s, p) => s + p.currentStock, 0);
    const ok = enriched.filter((p) => p.state === "ok").length;
    const low = enriched.filter((p) => p.state === "low").length;
    const out = enriched.filter((p) => p.state === "out").length;
    const negative = enriched.filter((p) => p.currentStock < 0).length;
    const totalIn = inRange.reduce((s, m) => s + qtyIn(m), 0);
    const totalOut = inRange.reduce((s, m) => s + qtyOut(m), 0);
    return { value, qty, ok, low, out, negative, totalIn, totalOut, count: enriched.length };
  }, [enriched, inRange]);

  const flow = useMemo(() => {
    if (!inRange.length) return [];
    let s, e;
    if (fromDate && toDate) {
      s = new Date(`${fromDate}T00:00:00`);
      e = new Date(`${toDate}T00:00:00`);
    } else {
      const ts = inRange.map((m) => new Date(m.movementDate).getTime()).filter(Number.isFinite);
      s = new Date(Math.min(...ts));
      e = new Date(Math.max(...ts));
      s.setHours(0, 0, 0, 0);
      e.setHours(0, 0, 0, 0);
    }
    const days = Math.round((e - s) / 86400000) + 1;
    const monthly = days > 62;
    const keyOf = (d) => (monthly ? `${d.getFullYear()}-${d.getMonth()}` : toLocalDate(d));
    const buckets = new Map();
    if (monthly) {
      const cur = new Date(s.getFullYear(), s.getMonth(), 1);
      while (cur <= e) {
        buckets.set(keyOf(cur), {
          label: cur.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
          in: 0,
          out: 0,
        });
        cur.setMonth(cur.getMonth() + 1);
      }
    } else {
      for (let i = 0; i < days; i += 1) {
        const d = new Date(s);
        d.setDate(s.getDate() + i);
        buckets.set(keyOf(d), { label: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }), in: 0, out: 0 });
      }
    }
    inRange.forEach((m) => {
      const d = new Date(m.movementDate);
      if (Number.isNaN(d.getTime())) return;
      const b = buckets.get(keyOf(d));
      if (!b) return;
      b.in += qtyIn(m);
      b.out += qtyOut(m);
    });
    return [...buckets.values()];
  }, [inRange, fromDate, toDate]);

  const recent = useMemo(
    () => [...inRange].sort((a, b) => new Date(b.movementDate) - new Date(a.movementDate)).slice(0, 7),
    [inRange],
  );

  const attention = useMemo(
    () =>
      enriched
        .filter((p) => p.state !== "ok")
        .sort((a, b) => meterPct(a.currentStock, a.reorderLevel) - meterPct(b.currentStock, b.reorderLevel))
        .slice(0, 6),
    [enriched],
  );

  const topValue = useMemo(
    () => [...enriched].filter((p) => p.value > 0).sort((a, b) => b.value - a.value).slice(0, 6),
    [enriched],
  );

  const categoryShare = useMemo(() => {
    const m = new Map();
    productRows.forEach((p) => {
      const k = p.category || "Uncategorised";
      const c = m.get(k) || { name: k, value: 0, count: 0 };
      c.value += Math.max(0, p.value);
      c.count += 1;
      m.set(k, c);
    });
    return [...m.values()].sort((a, b) => b.value - a.value).slice(0, 7);
  }, [productRows]);

  const valTotal = productRows.reduce((s, p) => s + p.value, 0);
  const valQty = productRows.reduce((s, p) => s + p.currentStock, 0);

  /* ---- columns ---- */
  const cols = {
    summary: [
      { key: "productCode", label: "Code" },
      { key: "name", label: "Product", render: (r) => <b>{r.name}</b>, csv: (r) => r.name },
      { key: "category", label: "Category", render: (r) => r.category || "—", csv: (r) => r.category || "" },
      { key: "unit", label: "Unit" },
      { key: "currentStock", label: "Stock", align: "right", render: (r) => <b>{fmtNum(r.currentStock)}</b>, csv: (r) => r.currentStock },
      { key: "level", label: "Level", render: (r) => <Meter stock={r.currentStock} reorder={r.reorderLevel} />, csv: (r) => `${Math.round(meterPct(r.currentStock, r.reorderLevel))}%` },
      { key: "reorderLevel", label: "Reorder at", align: "right", render: (r) => fmtNum(r.reorderLevel), csv: (r) => r.reorderLevel },
      { key: "state", label: "Status", render: (r) => <StatusPill stock={r.currentStock} reorder={r.reorderLevel} />, csv: (r) => ({ out: "Out of stock", low: "Low stock", ok: "In stock" })[r.state] },
    ],
    movement: [
      { key: "movementDate", label: "Date", render: (r) => fmtDate(r.movementDate), csv: (r) => fmtDate(r.movementDate) },
      { key: "code", label: "Code", render: prodCode, csv: prodCode },
      { key: "product", label: "Product", render: (r) => <b>{prodName(r)}</b>, csv: prodName },
      { key: "movementType", label: "Type", render: (r) => <Pill>{label(r.movementType)}</Pill>, csv: (r) => label(r.movementType) },
      {
        key: "direction",
        label: "Flow",
        render: (r) =>
          r.direction === "IN" ? (
            <span className="iv-flow-tag in"><ArrowDownLeft size={12} /> In</span>
          ) : (
            <span className="iv-flow-tag out"><ArrowUpRight size={12} /> Out</span>
          ),
        csv: (r) => r.direction,
      },
      { key: "quantity", label: "Qty", align: "right", render: (r) => fmtNum(r.quantity), csv: (r) => r.quantity },
      { key: "stockAfter", label: "Stock after", align: "right", render: (r) => fmtNum(r.stockAfter), csv: (r) => r.stockAfter },
      { key: "referenceNumber", label: "Reference", render: (r) => r.referenceNumber || "—", csv: (r) => r.referenceNumber || "" },
    ],
    ledger: [
      { key: "movementDate", label: "Date", render: (r) => fmtDate(r.movementDate), csv: (r) => fmtDate(r.movementDate) },
      { key: "code", label: "Code", render: prodCode, csv: prodCode },
      { key: "product", label: "Product", render: (r) => <b>{prodName(r)}</b>, csv: prodName },
      { key: "movementType", label: "Particulars", render: (r) => label(r.movementType), csv: (r) => label(r.movementType) },
      { key: "stockBefore", label: "Opening", align: "right", render: (r) => fmtNum(r.stockBefore), csv: (r) => r.stockBefore },
      { key: "inward", label: "Inward", align: "right", render: (r) => <span className="iv-pos">{r.inward ? `+${fmtNum(r.inward)}` : "—"}</span>, csv: (r) => r.inward },
      { key: "outward", label: "Outward", align: "right", render: (r) => <span className="iv-neg">{r.outward ? `−${fmtNum(r.outward)}` : "—"}</span>, csv: (r) => r.outward },
      { key: "closingStock", label: "Closing", align: "right", render: (r) => <b>{fmtNum(r.closingStock)}</b>, csv: (r) => r.closingStock },
    ],
    lowStock: [
      { key: "productCode", label: "Code" },
      { key: "name", label: "Product", render: (r) => <b>{r.name}</b>, csv: (r) => r.name },
      { key: "category", label: "Category", render: (r) => r.category || "—", csv: (r) => r.category || "" },
      { key: "currentStock", label: "Available", align: "right", render: (r) => fmtNum(r.currentStock), csv: (r) => r.currentStock },
      { key: "level", label: "Level", render: (r) => <Meter stock={r.currentStock} reorder={r.reorderLevel} />, csv: (r) => `${Math.round(meterPct(r.currentStock, r.reorderLevel))}%` },
      { key: "reorderLevel", label: "Reorder at", align: "right", render: (r) => fmtNum(r.reorderLevel), csv: (r) => r.reorderLevel },
      { key: "need", label: "Shortfall", align: "right", render: (r) => <b className="iv-neg">{fmtNum(Math.max(0, r.reorderLevel - r.currentStock))}</b>, csv: (r) => Math.max(0, r.reorderLevel - r.currentStock) },
    ],
    valuation: [
      { key: "productCode", label: "Code" },
      { key: "name", label: "Product", render: (r) => <b>{r.name}</b>, csv: (r) => r.name },
      { key: "category", label: "Category", render: (r) => r.category || "—", csv: (r) => r.category || "" },
      { key: "currentStock", label: "Qty", align: "right", render: (r) => fmtNum(r.currentStock), csv: (r) => r.currentStock },
      { key: "purchasePrice", label: "Unit cost", align: "right", render: (r) => fmtMoney(r.purchasePrice), csv: (r) => r.purchasePrice },
      { key: "share", label: "Share", align: "right", render: (r) => (valTotal ? `${((r.value / valTotal) * 100).toFixed(1)}%` : "0%"), csv: (r) => (valTotal ? ((r.value / valTotal) * 100).toFixed(2) : 0) },
      { key: "value", label: "Value", align: "right", render: (r) => <b>{fmtMoney(r.value)}</b>, csv: (r) => r.value },
    ],
  };

  const dataByView = {
    summary: productRows,
    movement: movementRows,
    ledger: ledgerRows,
    lowStock: lowRows,
    valuation: [...productRows].sort((a, b) => b.value - a.value),
  };

  const exportNow = () => downloadCsv(`inventory-${view}.csv`, cols[view], dataByView[view]);

  const badge = { summary: stats.count, movement: inRange.length, lowStock: stats.low + stats.out };
  const isProductView = ["summary", "lowStock", "valuation"].includes(view);
  const isMoveView = ["movement", "ledger"].includes(view);
  const current = NAV.find((n) => n.id === view);

  /* ---- toolbar ---- */
  const Toolbar = ({ subtitle, canToggle }) => (
    <div className="iv-bar">
      <div>
        <h2>{current.label}</h2>
        <p>{subtitle}</p>
      </div>
      <div className="iv-bar-tools">
        {isProductView && (
          <select className="iv-select" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="ALL">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
        {isMoveView && (
          <>
            <select className="iv-select" value={mType} onChange={(e) => setMType(e.target.value)}>
              <option value="ALL">All types</option>
              {MOVEMENT_TYPES.map((t) => (
                <option key={t} value={t}>{label(t)}</option>
              ))}
            </select>
            <div className="iv-seg">
              {["ALL", "IN", "OUT"].map((d) => (
                <button key={d} type="button" className={direction === d ? "on" : ""} onClick={() => setDirection(d)}>
                  {d === "ALL" ? "All" : d === "IN" ? "In" : "Out"}
                </button>
              ))}
            </div>
          </>
        )}
        {canToggle && (
          <div className="iv-seg">
            <button type="button" className={layout === "table" ? "on" : ""} onClick={() => setLayout("table")} aria-label="Table view"><List size={14} /></button>
            <button type="button" className={layout === "cards" ? "on" : ""} onClick={() => setLayout("cards")} aria-label="Card view"><LayoutGrid size={14} /></button>
          </div>
        )}
        <button type="button" className="iv-btn iv-btn-solid" onClick={exportNow}>
          <Download size={14} /> CSV
        </button>
      </div>
    </div>
  );

  const renderTable = (v, subtitle, emptyText, footer, canToggle = false) => (
    <section className="iv-card iv-flush">
      <Toolbar subtitle={subtitle} canToggle={canToggle} />
      {loading ? (
        <div className="iv-pad">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} h={16} style={{ marginBottom: 12 }} />
          ))}
        </div>
      ) : canToggle && layout === "cards" ? (
        <ProductCards rows={dataByView[v]} page={page} onPage={setPage} />
      ) : (
        <DataTable columns={cols[v]} rows={dataByView[v]} page={page} onPage={setPage} emptyText={emptyText} footer={footer} />
      )}
    </section>
  );

  /* ---- product card grid ---- */
  function ProductCards({ rows, page: pg, onPage }) {
    const size = 12;
    const pages = Math.max(1, Math.ceil(rows.length / size));
    const p = Math.min(pg, pages);
    if (!rows.length) return <Empty text="No products match your filters." />;
    return (
      <>
        <div className="iv-grid-cards">
          {rows.slice((p - 1) * size, p * size).map((r) => (
            <article key={r._id || r.id || r.productCode} className={`iv-pcard st-${r.state}`}>
              <div className="iv-pcard-top">
                <span className="iv-code">{r.productCode || "—"}</span>
                <StatusPill stock={r.currentStock} reorder={r.reorderLevel} />
              </div>
              <h4>{r.name}</h4>
              <small>{r.category || "Uncategorised"}</small>
              <div className="iv-pcard-qty">
                <strong>{fmtNum(r.currentStock)}</strong>
                <span>{r.unit || "units"}</span>
              </div>
              <Meter stock={r.currentStock} reorder={r.reorderLevel} />
              <div className="iv-pcard-foot">
                <span>Reorder at {fmtNum(r.reorderLevel)}</span>
                <b>{fmtCompact(r.value)}</b>
              </div>
            </article>
          ))}
        </div>
        <div className="iv-pager">
          <span>{rows.length} products</span>
          <div>
            <button type="button" className="iv-btn" disabled={p <= 1} onClick={() => onPage(p - 1)}>‹</button>
            <b>{p} / {pages}</b>
            <button type="button" className="iv-btn" disabled={p >= pages} onClick={() => onPage(p + 1)}>›</button>
          </div>
        </div>
      </>
    );
  }

  /* ================= render ================= */
  return (
    <div className="iv-root" style={{ "--iv-accent": ACCENT }}>
      <style>{`
        .iv-root{
          --iv-bg: var(--dbd-bg, #f4f6fa);
          --iv-card: var(--dbd-card, #ffffff);
          --iv-text: var(--dbd-text, #14213d);
          --iv-sub: var(--dbd-secondary, #5b6678);
          --iv-muted: var(--dbd-muted, #8a94a6);
          --iv-line: var(--dbd-border, #e6eaf1);
          --iv-good:#16a34a; --iv-warn:#f59e0b; --iv-bad:#e11d48;
          display:grid; grid-template-columns: 232px minmax(0,1fr); gap:18px; width:100%; min-width:0;
          color:var(--iv-text); font-size:13px;
        }
        .iv-root *,.iv-root *::before,.iv-root *::after{box-sizing:border-box}
        .iv-root h1,.iv-root h2,.iv-root h3,.iv-root h4,.iv-root p{margin:0}
        .iv-root button{font:inherit}

        /* sidebar */
        .iv-side{position:sticky; top:12px; align-self:start; background:var(--iv-card); border:1px solid var(--iv-line); border-radius:18px; padding:14px; display:flex; flex-direction:column; gap:4px}
        .iv-brand{display:flex; align-items:center; gap:10px; padding:6px 8px 14px; border-bottom:1px dashed var(--iv-line); margin-bottom:8px}
        .iv-brand-ic{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,var(--iv-accent),#3b8fe0)}
        .iv-brand b{display:block;font-size:14px} .iv-brand span{font-size:11px;color:var(--iv-muted)}
        .iv-nav{display:flex;align-items:center;gap:10px;width:100%;padding:10px 11px;border:0;border-radius:11px;background:transparent;color:var(--iv-sub);font-weight:600;cursor:pointer;text-align:left;transition:.18s}
        .iv-nav:hover{background:color-mix(in srgb,var(--iv-accent) 7%,transparent);color:var(--iv-accent)}
        .iv-nav.on{background:var(--iv-accent);color:#fff;box-shadow:0 6px 14px color-mix(in srgb,var(--iv-accent) 32%,transparent)}
        .iv-nav span{flex:1}
        .iv-count{font-size:10px;font-weight:700;min-width:22px;text-align:center;padding:2px 7px;border-radius:999px;background:var(--iv-line);color:var(--iv-sub)}
        .iv-nav.on .iv-count{background:rgba(255,255,255,.25);color:#fff}
        .iv-count.alert{background:#fee2e2;color:#b91c1c}
        .iv-nav.on .iv-count.alert{background:#fff;color:#b91c1c}
        .iv-side-foot{margin-top:10px;padding:10px 8px 2px;border-top:1px dashed var(--iv-line);font-size:11px;color:var(--iv-muted)}

        /* main */
        .iv-main{min-width:0;display:flex;flex-direction:column;gap:16px}
        .iv-top{display:flex;gap:12px;align-items:center;flex-wrap:wrap;justify-content:space-between}
        .iv-search{display:flex;align-items:center;gap:8px;flex:1 1 280px;max-width:460px;min-height:42px;padding:0 14px;background:var(--iv-card);border:1px solid var(--iv-line);border-radius:999px;color:var(--iv-muted);transition:.18s}
        .iv-search:focus-within{border-color:var(--iv-accent);box-shadow:0 0 0 4px color-mix(in srgb,var(--iv-accent) 12%,transparent)}
        .iv-search input{flex:1;border:0;background:transparent;outline:none;color:var(--iv-text);font-size:13px;min-width:0}
        .iv-top-right{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
        .iv-updated{font-size:11px;color:var(--iv-muted)}

        .iv-btn{min-height:34px;padding:0 12px;border:1px solid var(--iv-line);border-radius:10px;background:var(--iv-card);color:var(--iv-text);font-size:12px;font-weight:650;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:.18s}
        .iv-btn:hover:not(:disabled){border-color:var(--iv-accent);color:var(--iv-accent)}
        .iv-btn:disabled{opacity:.4;cursor:not-allowed}
        .iv-btn-solid{background:var(--iv-accent);border-color:var(--iv-accent);color:#fff}
        .iv-btn-solid:hover:not(:disabled){color:#fff;filter:brightness(.92)}
        .iv-spin{animation:iv-spin .9s linear infinite}
        @keyframes iv-spin{to{transform:rotate(360deg)}}

        /* range bar */
        .iv-range{display:flex;gap:10px;align-items:center;flex-wrap:wrap;padding:10px 12px;background:var(--iv-card);border:1px solid var(--iv-line);border-radius:14px}
        .iv-range-lbl{font-size:11px;font-weight:700;color:var(--iv-muted);text-transform:uppercase;letter-spacing:.05em}
        .iv-seg{display:inline-flex;padding:3px;background:var(--iv-bg);border:1px solid var(--iv-line);border-radius:10px;gap:2px}
        .iv-seg button{border:0;background:transparent;min-height:26px;padding:0 11px;border-radius:7px;font-size:12px;font-weight:650;color:var(--iv-sub);cursor:pointer;display:inline-flex;align-items:center}
        .iv-seg button.on{background:var(--iv-card);color:var(--iv-accent);box-shadow:0 1px 4px rgba(16,24,40,.12)}
        .iv-date{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:var(--iv-muted);font-weight:650}
        .iv-date input{min-height:30px;padding:0 8px;border:1px solid var(--iv-line);border-radius:8px;background:var(--iv-card);color:var(--iv-text);font-size:12px}
        .iv-select{min-height:34px;padding:0 10px;border:1px solid var(--iv-line);border-radius:10px;background:var(--iv-card);color:var(--iv-text);font-size:12px}

        .iv-alert{display:flex;gap:10px;align-items:center;padding:11px 14px;border-radius:12px;background:#fef2f2;border:1px solid #fecaca;color:#991b1b}
        .iv-alert span{flex:1}

        /* ribbon */
        .iv-ribbon{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));background:var(--iv-card);border:1px solid var(--iv-line);border-radius:18px;overflow:hidden}
        .iv-stat{padding:18px 20px;border-right:1px solid var(--iv-line);min-width:0;position:relative}
        .iv-stat:last-child{border-right:0}
        .iv-stat small{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;color:var(--iv-muted);text-transform:uppercase;letter-spacing:.05em}
        .iv-stat strong{display:block;margin:8px 0 4px;font-size:clamp(20px,2.2vw,28px);font-weight:800;letter-spacing:-.5px;overflow-wrap:anywhere}
        .iv-stat em{font-style:normal;font-size:11px;color:var(--iv-muted)}
        .iv-stat .dot{width:8px;height:8px;border-radius:50%}

        /* cards & grids */
        .iv-card{background:var(--iv-card);border:1px solid var(--iv-line);border-radius:18px;padding:18px;min-width:0}
        .iv-flush{padding:0;overflow:hidden}
        .iv-pad{padding:18px}
        .iv-card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:14px}
        .iv-card-head h3{font-size:14px;font-weight:750}
        .iv-card-head p{font-size:11px;color:var(--iv-muted);margin-top:3px}
        .iv-two{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:16px}
        .iv-two-b{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px}

        .iv-legend{display:flex;gap:14px;flex-wrap:wrap;font-size:11px;color:var(--iv-sub);font-weight:650}
        .iv-legend i{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:6px;vertical-align:-1px}
        .iv-flow{width:100%;height:auto;display:block}
        .iv-muted-box{display:grid;place-items:center;height:190px;color:var(--iv-muted);font-size:12px;border:1px dashed var(--iv-line);border-radius:12px}

        .iv-donut-row{display:flex;gap:18px;align-items:center;flex-wrap:wrap;justify-content:center}
        .iv-donut{position:relative;width:150px;height:150px;flex-shrink:0}
        .iv-donut svg{width:100%;height:100%}
        .iv-donut-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
        .iv-donut-center strong{font-size:24px;font-weight:800}
        .iv-donut-center span{font-size:10px;color:var(--iv-muted);text-transform:uppercase;letter-spacing:.06em}
        .iv-donut-legend{display:flex;flex-direction:column;gap:10px;min-width:130px}
        .iv-donut-legend div{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:650}
        .iv-donut-legend i{width:10px;height:10px;border-radius:3px}
        .iv-donut-legend b{margin-left:auto;padding-left:14px}

        /* feed */
        .iv-feed{display:flex;flex-direction:column}
        .iv-feed-item{display:flex;gap:12px;align-items:center;padding:11px 0;border-bottom:1px dashed var(--iv-line)}
        .iv-feed-item:last-child{border-bottom:0}
        .iv-feed-ic{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;flex-shrink:0}
        .iv-feed-ic.in{background:#dcfce7;color:#15803d} .iv-feed-ic.out{background:#ffe4e6;color:#be123c}
        .iv-feed-body{flex:1;min-width:0}
        .iv-feed-body b{display:block;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .iv-feed-body span{font-size:11px;color:var(--iv-muted)}
        .iv-feed-qty{text-align:right;font-weight:800;font-size:13px}
        .iv-feed-qty small{display:block;font-weight:500;font-size:10px;color:var(--iv-muted)}

        /* attention list & value bars */
        .iv-attn{display:flex;flex-direction:column;gap:14px}
        .iv-attn-row-top{display:flex;justify-content:space-between;gap:10px;margin-bottom:6px;font-size:12px}
        .iv-attn-row-top b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .iv-attn-row-top span{color:var(--iv-muted);white-space:nowrap}
        .iv-meter{height:7px;border-radius:999px;background:var(--iv-line);overflow:hidden;min-width:70px}
        .iv-meter-fill{height:100%;border-radius:999px;transition:width .5s}
        .iv-m-ok{background:linear-gradient(90deg,#4ade80,#16a34a)} .iv-m-low{background:linear-gradient(90deg,#fcd34d,#f59e0b)} .iv-m-out{background:var(--iv-bad)}
        .iv-vbar-top{display:flex;justify-content:space-between;gap:10px;font-size:12px;margin-bottom:5px}
        .iv-vbar-top b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60%}
        .iv-vbar-track{height:8px;border-radius:999px;background:var(--iv-line);overflow:hidden}
        .iv-vbar-fill{height:100%;border-radius:999px}

        /* share bar */
        .iv-share{display:flex;height:16px;border-radius:999px;overflow:hidden;background:var(--iv-line);margin-bottom:14px}
        .iv-share i{display:block;height:100%}
        .iv-share-legend{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px 18px;font-size:12px}
        .iv-share-legend div{display:flex;align-items:center;gap:8px}
        .iv-share-legend i{width:10px;height:10px;border-radius:3px;flex-shrink:0}
        .iv-share-legend span{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .iv-share-legend b{font-variant-numeric:tabular-nums}

        /* toolbar + table */
        .iv-bar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:16px 18px;border-bottom:1px solid var(--iv-line)}
        .iv-bar h2{font-size:15px;font-weight:750} .iv-bar p{font-size:11px;color:var(--iv-muted);margin-top:3px}
        .iv-bar-tools{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
        .iv-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}
        .iv-table{width:100%;border-collapse:separate;border-spacing:0;min-width:720px;font-size:12px}
        .iv-table th{position:sticky;top:0;text-align:left;padding:11px 16px;font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--iv-muted);background:var(--iv-bg);border-bottom:1px solid var(--iv-line);white-space:nowrap}
        .iv-table td{padding:12px 16px;border-bottom:1px solid var(--iv-line);white-space:nowrap}
        .iv-table tbody tr{transition:.12s} .iv-table tbody tr:hover{background:color-mix(in srgb,var(--iv-accent) 4%,transparent)}
        .iv-table tbody tr:last-child td{border-bottom:0}
        .iv-table tfoot td{font-weight:800;background:var(--iv-bg);border-top:2px solid var(--iv-line);border-bottom:0}
        .iv-table .r{text-align:right}
        .iv-pager{display:flex;justify-content:space-between;align-items:center;padding:12px 18px;border-top:1px solid var(--iv-line);font-size:12px;color:var(--iv-sub)}
        .iv-pager>div{display:flex;gap:10px;align-items:center}

        .iv-pill{display:inline-flex;align-items:center;padding:3px 10px;border-radius:999px;font-size:10px;font-weight:750;background:var(--iv-bg);color:var(--iv-sub);border:1px solid var(--iv-line)}
        .iv-pill-good{background:#dcfce7;color:#15803d;border-color:#bbf7d0}
        .iv-pill-warn{background:#fef3c7;color:#b45309;border-color:#fde68a}
        .iv-pill-bad{background:#ffe4e6;color:#be123c;border-color:#fecdd3}
        .iv-flow-tag{display:inline-flex;align-items:center;gap:3px;font-weight:750;font-size:11px}
        .iv-flow-tag.in{color:#15803d} .iv-flow-tag.out{color:#be123c}
        .iv-pos{color:#15803d;font-weight:700} .iv-neg{color:#be123c;font-weight:700}

        /* product cards */
        .iv-grid-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px;padding:18px}
        .iv-pcard{border:1px solid var(--iv-line);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:6px;border-top:3px solid var(--iv-good);transition:.18s;background:var(--iv-card)}
        .iv-pcard:hover{transform:translateY(-3px);box-shadow:0 10px 22px rgba(16,24,40,.09)}
        .iv-pcard.st-low{border-top-color:var(--iv-warn)} .iv-pcard.st-out{border-top-color:var(--iv-bad)}
        .iv-pcard-top{display:flex;justify-content:space-between;align-items:center;gap:6px}
        .iv-code{font-size:10px;font-weight:800;color:var(--iv-muted);letter-spacing:.05em}
        .iv-pcard h4{font-size:13px;font-weight:750;line-height:1.35}
        .iv-pcard small{color:var(--iv-muted);font-size:11px}
        .iv-pcard-qty{display:flex;align-items:baseline;gap:6px;margin-top:6px}
        .iv-pcard-qty strong{font-size:24px;font-weight:800} .iv-pcard-qty span{font-size:11px;color:var(--iv-muted)}
        .iv-pcard-foot{display:flex;justify-content:space-between;font-size:11px;color:var(--iv-muted);margin-top:4px}
        .iv-pcard-foot b{color:var(--iv-text)}

        .iv-empty{display:flex;flex-direction:column;align-items:center;gap:6px;padding:44px 16px;color:var(--iv-muted);text-align:center}
        .iv-empty strong{color:var(--iv-text);font-size:14px}
        .iv-skel{border-radius:8px;background:linear-gradient(90deg,var(--iv-line) 25%,color-mix(in srgb,var(--iv-line) 40%,var(--iv-card)) 50%,var(--iv-line) 75%);background-size:200% 100%;animation:iv-shimmer 1.3s infinite}
        @keyframes iv-shimmer{to{background-position:-200% 0}}

        @media (max-width:1100px){
          .iv-two,.iv-two-b{grid-template-columns:minmax(0,1fr)}
          .iv-ribbon{grid-template-columns:repeat(2,minmax(0,1fr))}
          .iv-stat:nth-child(2){border-right:0} .iv-stat:nth-child(-n+2){border-bottom:1px solid var(--iv-line)}
        }
        @media (max-width:900px){
          .iv-root{grid-template-columns:minmax(0,1fr)}
          .iv-side{position:static;flex-direction:row;overflow-x:auto;padding:8px;border-radius:14px;scrollbar-width:none}
          .iv-brand,.iv-side-foot{display:none}
          .iv-nav{width:auto;flex-shrink:0;white-space:nowrap}
        }
        @media (max-width:520px){
          .iv-ribbon{grid-template-columns:minmax(0,1fr)}
          .iv-stat{border-right:0;border-bottom:1px solid var(--iv-line)} .iv-stat:last-child{border-bottom:0}
          .iv-search{max-width:none}
        }
      `}</style>

      {/* ---------- sidebar ---------- */}
      <aside className="iv-side">
        <div className="iv-brand">
          <div className="iv-brand-ic"><Warehouse size={19} /></div>
          <div>
            <b>Inventory</b>
            <span>Reports & insights</span>
          </div>
        </div>
        {NAV.map((n) => {
          const NavIcon = n.icon;
          const c = badge[n.id];
          return (
            <button key={n.id} type="button" className={`iv-nav ${view === n.id ? "on" : ""}`} onClick={() => setView(n.id)}>
              <NavIcon size={16} />
              <span>{n.label}</span>
              {c !== undefined && <em className={`iv-count ${n.id === "lowStock" && c > 0 ? "alert" : ""}`} style={{ fontStyle: "normal" }}>{c}</em>}
            </button>
          );
        })}
        <div className="iv-side-foot">
          {updatedAt ? `Synced ${updatedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : "Syncing…"}
        </div>
      </aside>

      {/* ---------- main ---------- */}
      <div className="iv-main">
        <div className="iv-top">
          <label className="iv-search">
            <Search size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product, code, reference…"
            />
          </label>
          <div className="iv-top-right">
            <button type="button" className="iv-btn" onClick={() => setRefreshKey((k) => k + 1)} disabled={loading}>
              <RefreshCw size={14} className={loading ? "iv-spin" : ""} /> Refresh
            </button>
          </div>
        </div>

        {(view === "overview" || isMoveView) && (
          <div className="iv-range">
            <span className="iv-range-lbl">Period</span>
            <div className="iv-seg">
              {PRESETS.map((p) => (
                <button key={p.id} type="button" className={preset === p.id ? "on" : ""} onClick={() => applyPreset(p)}>
                  {p.label}
                </button>
              ))}
            </div>
            <label className="iv-date">
              From
              <input type="date" value={fromDate} max={toDate || undefined} onChange={(e) => onDate("s", e.target.value)} />
            </label>
            <label className="iv-date">
              To
              <input type="date" value={toDate} min={fromDate || undefined} onChange={(e) => onDate("e", e.target.value)} />
            </label>
          </div>
        )}

        {error && (
          <div className="iv-alert">
            <AlertTriangle size={16} />
            <span>{error}</span>
            <button type="button" className="iv-btn" onClick={() => setRefreshKey((k) => k + 1)}>Retry</button>
          </div>
        )}

        {/* ===== OVERVIEW ===== */}
        {view === "overview" && (
          <>
            <div className="iv-ribbon">
              <div className="iv-stat">
                <small><Boxes size={13} /> Products</small>
                {loading ? <Skeleton h={28} w="60%" style={{ margin: "8px 0" }} /> : <strong>{fmtNum(stats.count)}</strong>}
                <em>{fmtNum(stats.qty)} units on hand</em>
              </div>
              <div className="iv-stat">
                <small><IndianRupee size={13} /> Stock value</small>
                {loading ? <Skeleton h={28} w="60%" style={{ margin: "8px 0" }} /> : <strong>{fmtCompact(stats.value)}</strong>}
                <em>{fmtMoney(stats.value)}</em>
              </div>
              <div className="iv-stat">
                <small><ArrowDownLeft size={13} color="#16a34a" /> Stock in</small>
                {loading ? <Skeleton h={28} w="60%" style={{ margin: "8px 0" }} /> : <strong style={{ color: "#15803d" }}>+{fmtNum(stats.totalIn)}</strong>}
                <em>In selected period</em>
              </div>
              <div className="iv-stat">
                <small><ArrowUpRight size={13} color="#e11d48" /> Stock out</small>
                {loading ? <Skeleton h={28} w="60%" style={{ margin: "8px 0" }} /> : <strong style={{ color: "#be123c" }}>−{fmtNum(stats.totalOut)}</strong>}
                <em>Net {stats.totalIn - stats.totalOut >= 0 ? "+" : ""}{fmtNum(stats.totalIn - stats.totalOut)}</em>
              </div>
            </div>

            <div className="iv-two">
              <section className="iv-card">
                <div className="iv-card-head">
                  <div>
                    <h3>Stock In vs Out</h3>
                    <p>{flow.length} {flow.length > 31 ? "months" : "days"} of activity</p>
                  </div>
                  <div className="iv-legend">
                    <span><i style={{ background: "#16a34a" }} />In</span>
                    <span><i style={{ background: "#e11d48" }} />Out</span>
                  </div>
                </div>
                {loading ? <Skeleton h={190} /> : <FlowChart data={flow} />}
              </section>

              <section className="iv-card">
                <div className="iv-card-head">
                  <div>
                    <h3>Stock Health</h3>
                    <p>Current status of all products</p>
                  </div>
                </div>
                {loading ? (
                  <Skeleton h={150} />
                ) : (
                  <div className="iv-donut-row">
                    <Donut
                      centerTop={stats.count}
                      centerBottom="products"
                      segments={[
                        { name: "In stock", value: stats.ok, color: "#16a34a" },
                        { name: "Low stock", value: stats.low, color: "#f59e0b" },
                        { name: "Out of stock", value: stats.out, color: "#e11d48" },
                      ]}
                    />
                    <div className="iv-donut-legend">
                      <div><i style={{ background: "#16a34a" }} />In stock<b>{stats.ok}</b></div>
                      <div><i style={{ background: "#f59e0b" }} />Low stock<b>{stats.low}</b></div>
                      <div><i style={{ background: "#e11d48" }} />Out of stock<b>{stats.out}</b></div>
                      {stats.negative > 0 && (
                        <div><TrendingDown size={12} color="#e11d48" />Negative<b>{stats.negative}</b></div>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </div>

            <div className="iv-two-b">
              <section className="iv-card">
                <div className="iv-card-head">
                  <div>
                    <h3>Needs Attention</h3>
                    <p>Lowest stock levels first</p>
                  </div>
                  <button type="button" className="iv-btn" onClick={() => setView("lowStock")}>View all</button>
                </div>
                {loading ? (
                  <Skeleton h={160} />
                ) : attention.length === 0 ? (
                  <Empty text="Every product is comfortably stocked." />
                ) : (
                  <div className="iv-attn">
                    {attention.map((p) => (
                      <div key={p._id || p.productCode}>
                        <div className="iv-attn-row-top">
                          <b title={p.name}>{p.name}</b>
                          <span>{fmtNum(p.currentStock)} / {fmtNum(p.reorderLevel)} {p.unit || ""}</span>
                        </div>
                        <Meter stock={p.currentStock} reorder={p.reorderLevel} />
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="iv-card">
                <div className="iv-card-head">
                  <div>
                    <h3>Recent Activity</h3>
                    <p>Latest stock movements in period</p>
                  </div>
                  <button type="button" className="iv-btn" onClick={() => setView("movement")}>View all</button>
                </div>
                {loading ? (
                  <Skeleton h={160} />
                ) : recent.length === 0 ? (
                  <Empty text="No movements in this period." />
                ) : (
                  <div className="iv-feed">
                    {recent.map((m, i) => (
                      <div key={m._id || i} className="iv-feed-item">
                        <div className={`iv-feed-ic ${m.direction === "IN" ? "in" : "out"}`}>
                          {m.direction === "IN" ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                        </div>
                        <div className="iv-feed-body">
                          <b>{prodName(m)}</b>
                          <span>{label(m.movementType)}{m.referenceNumber ? ` · ${m.referenceNumber}` : ""}</span>
                        </div>
                        <div className="iv-feed-qty" style={{ color: m.direction === "IN" ? "#15803d" : "#be123c" }}>
                          {m.direction === "IN" ? "+" : "−"}{fmtNum(m.quantity)}
                          <small>{fmtDate(m.movementDate)}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <section className="iv-card">
              <div className="iv-card-head">
                <div>
                  <h3>Most Valuable Stock</h3>
                  <p>Top products by quantity × purchase price</p>
                </div>
                <button type="button" className="iv-btn" onClick={() => setView("valuation")}>Valuation</button>
              </div>
              {loading ? (
                <Skeleton h={120} />
              ) : topValue.length === 0 ? (
                <Empty text="No valued stock yet." />
              ) : (
                <div className="iv-attn">
                  {topValue.map((p, i) => (
                    <div key={p._id || p.productCode}>
                      <div className="iv-vbar-top">
                        <b title={p.name}>{p.name}</b>
                        <span>{fmtMoney(p.value)}</span>
                      </div>
                      <div className="iv-vbar-track">
                        <div className="iv-vbar-fill" style={{ width: `${Math.max(3, (p.value / topValue[0].value) * 100)}%`, background: PALETTE[i % PALETTE.length] }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* ===== SUMMARY ===== */}
        {view === "summary" &&
          renderTable(
            "summary",
            `${productRows.length} products · ${fmtNum(valQty)} units`,
            "No inventory products match your filters.",
            [
              { value: "Total" }, { value: `${productRows.length} items` }, { value: "" }, { value: "" },
              { value: fmtNum(valQty), align: "right" }, { value: "" }, { value: "" }, { value: "" },
            ],
            true,
          )}

        {/* ===== MOVEMENT ===== */}
        {view === "movement" &&
          renderTable("movement", `${movementRows.length} transactions in period`, "No stock movements match your filters.")}

        {/* ===== LEDGER ===== */}
        {view === "ledger" &&
          renderTable(
            "ledger",
            `${ledgerRows.length} entries · opening, inward, outward, closing`,
            "No ledger entries match your filters.",
            [
              { value: "Total" }, { value: "" }, { value: "" }, { value: "" }, { value: "" },
              { value: `+${fmtNum(ledgerRows.reduce((s, r) => s + r.inward, 0))}`, align: "right" },
              { value: `−${fmtNum(ledgerRows.reduce((s, r) => s + r.outward, 0))}`, align: "right" },
              { value: "" },
            ],
          )}

        {/* ===== LOW STOCK ===== */}
        {view === "lowStock" &&
          renderTable("lowStock", `${lowRows.length} products at or below reorder level`, "No low-stock products match your filters.")}

        {/* ===== VALUATION ===== */}
        {view === "valuation" && (
          <>
            <section className="iv-card">
              <div className="iv-card-head">
                <div>
                  <h3>Value by Category</h3>
                  <p>Total {fmtMoney(valTotal)} across {productRows.length} products</p>
                </div>
              </div>
              {loading ? (
                <Skeleton h={60} />
              ) : categoryShare.length === 0 ? (
                <Empty text="No valued stock to display." />
              ) : (
                <>
                  <div className="iv-share">
                    {categoryShare.map((c, i) => (
                      <i key={c.name} title={`${c.name}: ${fmtMoney(c.value)}`} style={{ width: `${valTotal ? (c.value / valTotal) * 100 : 0}%`, background: PALETTE[i % PALETTE.length] }} />
                    ))}
                  </div>
                  <div className="iv-share-legend">
                    {categoryShare.map((c, i) => (
                      <div key={c.name}>
                        <i style={{ background: PALETTE[i % PALETTE.length] }} />
                        <span title={c.name}>{c.name}</span>
                        <b>{valTotal ? ((c.value / valTotal) * 100).toFixed(1) : 0}%</b>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            {renderTable(
              "valuation",
              `${productRows.length} products · valued at purchase price`,
              "No valuation records match your filters.",
              [
                { value: "Total" }, { value: "" }, { value: "" },
                { value: fmtNum(valQty), align: "right" }, { value: "" }, { value: "100%", align: "right" },
                { value: fmtMoney(valTotal), align: "right" },
              ],
            )}
          </>
        )}
      </div>
    </div>
  );
}