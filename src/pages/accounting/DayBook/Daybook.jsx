// import { useEffect, useMemo, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { ArrowLeft, Download, RefreshCw, Search } from "lucide-react";

// import journalApi from "../../../services/modules/journalApi";
// import "./daybook.css";

// // ---------- date helpers (local calendar, UTC storage) ----------
// const toLocalDate = (date) => {
//   const y = date.getFullYear();
//   const m = String(date.getMonth() + 1).padStart(2, "0");
//   const d = String(date.getDate()).padStart(2, "0");
//   return `${y}-${m}-${d}`;
// };

// const getToday = () => toLocalDate(new Date());
// const getMonthStart = () =>
//   toLocalDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

// // ---------- formatters ----------
// const currencyFmt = new Intl.NumberFormat("en-IN", {
//   style: "currency",
//   currency: "INR",
//   minimumFractionDigits: 2,
//   maximumFractionDigits: 2,
// });

// const money = (paiseOrRupees, isPaise = false) => {
//   const rupees = isPaise
//     ? Number(paiseOrRupees || 0) / 100
//     : Number(paiseOrRupees || 0);
//   return currencyFmt.format(Math.abs(rupees));
// };

// const formatDate = (value) => {
//   if (!value) return "—";
//   const d = new Date(value);
//   if (Number.isNaN(d.getTime())) return "—";
//   return d.toLocaleDateString("en-IN", {
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//     timeZone: "UTC",
//   });
// };

// const getErrorMessage = (error) =>
//   error?.response?.data?.message ||
//   error?.message ||
//   "Unable to load day book.";

// const readDayBookResponse = (response) => {
//   const body = response?.data;
//   if (!body?.success || !Array.isArray(body?.transactions) || !body?.data) {
//     throw new Error(body?.message || "Invalid day book response.");
//   }
//   return body;
// };

// const voucherLabels = {
//   PURCHASE_BILL: "Purchase",
//   SUPPLIER_PAYMENT: "Payment",
//   MANUAL_JOURNAL: "Journal",
//   SALES_INVOICE: "Sales",
//   CUSTOMER_RECEIPT: "Receipt",
//   SALES_RETURN: "Sales Return",
// };

// const voucherOptions = [
//   { value: "", label: "All Vouchers" },
//   { value: "SALES_INVOICE", label: "Sales" },
//   { value: "PURCHASE_BILL", label: "Purchase" },
//   { value: "CUSTOMER_RECEIPT", label: "Receipt" },
//   { value: "SUPPLIER_PAYMENT", label: "Payment" },
//   { value: "MANUAL_JOURNAL", label: "Journal" },
//   { value: "SALES_RETURN", label: "Sales Return" },
// ];

// const chipTypes = [
//   { value: "", label: "All" },
//   { value: "SALES_INVOICE", label: "Sales" },
//   { value: "PURCHASE_BILL", label: "Purchase" },
//   { value: "CUSTOMER_RECEIPT", label: "Receipt" },
//   { value: "SUPPLIER_PAYMENT", label: "Payment" },
//   { value: "MANUAL_JOURNAL", label: "Journal" },
// ];

// const getVoucherLabel = (item) => {
//   const t = item.sourceType || item.voucherType;
//   return voucherLabels[t] || t || "Journal";
// };

// const getParticulars = (item) => {
//   if (item.narration) return item.narration;
//   // fallback: join ledger names
//   if (Array.isArray(item.lines) && item.lines.length) {
//     return item.lines
//       .map((l) => l.ledgerName)
//       .filter(Boolean)
//       .join(" / ");
//   }
//   if (item.description) return item.description;
//   return item.sourceNumber || "—";
// };

// const getCounterSummary = (item) => {
//   if (!Array.isArray(item.lines)) return "";
//   return item.lines
//     .map((l) => `${l.ledgerName} ${l.debitPaise ? "Dr" : "Cr"}`)
//     .join(", ");
// };

// const csvCell = (value) => {
//   let text = String(value ?? "");
//   if (/^\s*[=+\-@]/.test(text)) text = `'${text}`;
//   return `"${text.replace(/"/g, '""')}"`;
// };

// export default function Daybook() {
//   const navigate = useNavigate();

//   const [startDate, setStartDate] = useState(getMonthStart);
//   const [endDate, setEndDate] = useState(getToday);
//   const [search, setSearch] = useState("");
//   const [sourceType, setSourceType] = useState("");

//   const [page, setPage] = useState(1);
//   const [limit] = useState(50);

//   const [summary, setSummary] = useState(null);
//   const [rows, setRows] = useState([]);
//   const [pagination, setPagination] = useState(null);

//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const [refreshKey, setRefreshKey] = useState(0);

//   // reset page when filters change
//   useEffect(() => {
//     setPage(1);
//   }, [startDate, endDate, sourceType]);

//   // debounced search -> reset page
//   const [debouncedSearch, setDebouncedSearch] = useState("");
//   useEffect(() => {
//     const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
//     return () => clearTimeout(t);
//   }, [search]);

//   useEffect(() => {
//     setPage(1);
//   }, [debouncedSearch]);

//   useEffect(() => {
//     let cancelled = false;

//     const load = async () => {
//       if (!startDate || !endDate || startDate > endDate) {
//         setError("Choose a valid From and To date.");
//         setLoading(false);
//         return;
//       }

//       setLoading(true);
//       setError("");

//       try {
//         const params = {
//           startDate,
//           endDate,
//           page,
//           limit,
//           ...(sourceType ? { sourceType } : {}),
//           ...(debouncedSearch ? { search: debouncedSearch } : {}),
//           sortBy: "postingDate",
//           sortOrder: "desc",
//         };

//         const res = await journalApi.getDayBook(params);
//         if (cancelled) return;

//         const body = readDayBookResponse(res);

//         setRows(body.transactions);
//         setSummary(body.data);
//         setPagination(body.pagination);
//       } catch (err) {
//         if (!cancelled) {
//           setRows([]);
//           setSummary(null);
//           setPagination(null);
//           setError(getErrorMessage(err));
//         }
//       } finally {
//         if (!cancelled) setLoading(false);
//       }
//     };

//     void load();
//     return () => {
//       cancelled = true;
//     };
//   }, [
//     startDate,
//     endDate,
//     sourceType,
//     debouncedSearch,
//     page,
//     limit,
//     refreshKey,
//   ]);

//   const totalAmount = Number(
//     summary?.totals?.amount ?? summary?.totals?.debit ?? 0,
//   );
//   // backend may send paise; detect: if > 100000 and integer, assume paise
//   // Our backend sends rupees (converted). So use as-is.
//   const totalCount = Number(summary?.totals?.count ?? pagination?.total ?? 0);

//   const typeWise = summary?.typeWise || {};

//   const exportCsv = () => {
//     if (!rows.length || !summary) return;

//     const headerMeta = [
//       ["Day Book", `${startDate} to ${endDate}`],
//       [
//         "Voucher Filter",
//         sourceType ? voucherLabels[sourceType] : "All Vouchers",
//       ],
//       ["Search", debouncedSearch || "—"],
//       ["Total Vouchers", String(totalCount)],
//       ["Total Amount", totalAmount.toFixed(2)],
//       [],
//     ];

//     const columns = [
//       "Date",
//       "Journal No",
//       "Source No",
//       "Particulars",
//       "Voucher Type",
//       "Amount (INR)",
//       "Narration",
//     ];

//     const dataRows = rows.map((j) => [
//       formatDate(j.postingDate || j.date),
//       j.journalNumber || "",
//       j.sourceNumber || j.reference || "",
//       getParticulars(j),
//       getVoucherLabel(j),
//       (
//         Number(j.totalDebitPaise ?? j.totalDebit ?? j.amount ?? 0) /
//         (j.totalDebitPaise ? 100 : 1)
//       ).toFixed(2),
//       (j.narration || "").replace(/\r?\n/g, " "),
//     ]);

//     const all = [...headerMeta, columns, ...dataRows];

//     const csv = all.map((r) => r.map(csvCell).join(",")).join("\r\n");
//     const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8;" });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = `daybook-${startDate}-${endDate}${sourceType ? `-${sourceType}` : ""}.csv`;
//     document.body.appendChild(a);
//     a.click();
//     a.remove();
//     setTimeout(() => URL.revokeObjectURL(url), 1000);
//   };

//   const busy = loading;
//   const ready = Boolean(summary) && !busy && !error;

//   // pagination window
//   const pages = useMemo(() => {
//     const totalPages = Number(pagination?.totalPages || 1);
//     const current = Number(pagination?.page || page);
//     const windowSize = 5;
//     let start = Math.max(1, current - Math.floor(windowSize / 2));
//     let end = Math.min(totalPages, start + windowSize - 1);
//     if (end - start + 1 < windowSize) start = Math.max(1, end - windowSize + 1);
//     return {
//       totalPages,
//       current,
//       items: Array.from({ length: end - start + 1 }, (_, i) => start + i),
//     };
//   }, [pagination, page]);

//   return (
//     <main className="db-page">
//       <header className="db-header">
//         <div className="db-heading">
//           <button
//             type="button"
//             className="db-back"
//             aria-label="Go back"
//             onClick={() => navigate(-1)}
//           >
//             <ArrowLeft size={18} />
//           </button>
//           <div className="db-title">
//             <h1>Day Book</h1>
//             <p>
//               {startDate} to {endDate} ·{" "}
//               {sourceType ? voucherLabels[sourceType] : "All Vouchers"}
//               {pagination ? ` · ${pagination.total} entries` : ""}
//             </p>
//           </div>
//         </div>

//         <div className="db-actions">
//           <button
//             type="button"
//             className="db-button"
//             onClick={exportCsv}
//             disabled={!ready || !rows.length}
//           >
//             <Download size={16} />
//             Export
//           </button>
//           <button
//             type="button"
//             className="db-button db-button-primary"
//             disabled={busy}
//             onClick={() => setRefreshKey((c) => c + 1)}
//           >
//             <RefreshCw size={16} className={busy ? "db-spin" : ""} />
//             Refresh
//           </button>
//         </div>
//       </header>

//       {/* Summary cards */}
//       <section className="db-cards" aria-label="Day book summary">
//         <article className="db-card">
//           <span>Total Vouchers</span>
//           <strong>{ready ? String(totalCount) : "—"}</strong>
//           <small>{ready ? `${startDate} to ${endDate}` : " "}</small>
//         </article>
//         <article className="db-card">
//           <span>Total Amount</span>
//           <strong className="db-primary-text">
//             {ready ? currencyFmt.format(totalAmount) : "—"}
//           </strong>
//           <small>{ready ? "Debit = Credit (balanced)" : " "}</small>
//         </article>
//         <article className="db-card">
//           <span>Sales + Purchase</span>
//           <strong>
//             {ready
//               ? String(
//                   Number(typeWise.SALES_INVOICE || 0) +
//                     Number(typeWise.PURCHASE_BILL || 0),
//                 )
//               : "—"}
//           </strong>
//           <small>
//             {ready
//               ? `Sales ${typeWise.SALES_INVOICE || 0} · Purchase ${typeWise.PURCHASE_BILL || 0}`
//               : " "}
//           </small>
//         </article>
//         <article className="db-card">
//           <span>Cash Flow</span>
//           <strong>
//             {ready
//               ? `${typeWise.CUSTOMER_RECEIPT || 0} in · ${typeWise.SUPPLIER_PAYMENT || 0} out`
//               : "—"}
//           </strong>
//           <small>
//             {ready
//               ? `Journal ${typeWise.MANUAL_JOURNAL || 0} · Return ${typeWise.SALES_RETURN || 0}`
//               : " "}
//           </small>
//         </article>
//       </section>

//       {/* Filters */}
//       <section className="db-filters" aria-label="Day book filters">
//         <div className="db-search">
//           <Search size={17} aria-hidden="true" />
//           <input
//             type="search"
//             value={search}
//             aria-label="Search day book"
//             placeholder="Search journal no, source no, narration, ledger..."
//             onChange={(e) => setSearch(e.target.value)}
//           />
//         </div>

//         <label className="db-date">
//           <span>From</span>
//           <input
//             type="date"
//             value={startDate}
//             max={endDate || undefined}
//             onChange={(e) => setStartDate(e.target.value)}
//           />
//         </label>

//         <label className="db-date">
//           <span>To</span>
//           <input
//             type="date"
//             value={endDate}
//             min={startDate || undefined}
//             onChange={(e) => setEndDate(e.target.value)}
//           />
//         </label>

//         <label className="db-select-wrap">
//           <span>Voucher Type</span>
//           <select
//             value={sourceType}
//             onChange={(e) => setSourceType(e.target.value)}
//           >
//             {voucherOptions.map((o) => (
//               <option key={o.value} value={o.value}>
//                 {o.label}
//               </option>
//             ))}
//           </select>
//         </label>
//       </section>

//       <div className="db-chips" role="tablist" aria-label="Voucher type filter">
//         {chipTypes.map((c) => (
//           <button
//             key={c.value}
//             type="button"
//             role="tab"
//             aria-selected={sourceType === c.value}
//             className={`db-chip ${sourceType === c.value ? "is-active" : ""}`}
//             onClick={() => setSourceType(c.value)}
//           >
//             {c.label}
//             {ready && typeWise[c.value] !== undefined && c.value ? (
//               <small>· {typeWise[c.value]}</small>
//             ) : null}
//           </button>
//         ))}
//       </div>

//       {error && (
//         <div className="db-error" role="alert">
//           {error}
//         </div>
//       )}

//       {/* Table */}
//       <section
//         className="db-table-card"
//         aria-label="Day book entries"
//         aria-busy={busy}
//       >
//         <div
//           className="db-table-scroll"
//           tabIndex={0}
//           role="region"
//           aria-label="Scrollable day book table"
//         >
//           <table className="db-table">
//             <thead>
//               <tr>
//                 <th scope="col">Date</th>
//                 <th scope="col">Journal No</th>
//                 <th scope="col">Doc No</th>
//                 <th scope="col">Particulars</th>
//                 <th scope="col">Vch Type</th>
//                 <th scope="col" className="db-num">
//                   Amount
//                 </th>
//               </tr>
//             </thead>
//             <tbody>
//               {busy ? (
//                 <tr>
//                   <td colSpan={6} className="db-empty">
//                     Loading day book...
//                   </td>
//                 </tr>
//               ) : error ? (
//                 <tr>
//                   <td colSpan={6} className="db-empty">
//                     Unable to display entries.
//                   </td>
//                 </tr>
//               ) : !rows.length ? (
//                 <tr>
//                   <td colSpan={6} className="db-empty">
//                     {debouncedSearch || sourceType
//                       ? "No vouchers match your filters."
//                       : "No vouchers found for this period."}
//                   </td>
//                 </tr>
//               ) : (
//                 rows.map((item) => {
//                   const amountPaise = Number(item.totalDebitPaise ?? 0);
//                   const amountRupees = amountPaise
//                     ? amountPaise / 100
//                     : Number(item.totalDebit ?? item.amount ?? 0);
//                   const particulars = getParticulars(item);
//                   const counter = getCounterSummary(item);
//                   return (
//                     <tr key={item._id || item.journalNumber}>
//                       <td className="db-nowrap">
//                         {formatDate(item.postingDate || item.date)}
//                       </td>
//                       <td>
//                         <strong className="db-doc">
//                           {item.journalNumber || "—"}
//                         </strong>
//                         {item.sourceNumber &&
//                           item.sourceNumber !== item.journalNumber && (
//                             <small className="db-subtext">
//                               {item.sourceNumber}
//                             </small>
//                           )}
//                       </td>
//                       <td>
//                         <strong className="db-doc">
//                           {item.sourceNumber || item.reference || "—"}
//                         </strong>
//                         {item.sourceId && (
//                           <small
//                             className="db-subtext"
//                             title={String(item.sourceId)}
//                           >
//                             {String(item.sourceId).slice(-6)}
//                           </small>
//                         )}
//                       </td>
//                       <td className="db-particulars">
//                         <span>{particulars}</span>
//                         {counter && counter !== particulars && (
//                           <small className="db-subtext">{counter}</small>
//                         )}
//                       </td>
//                       <td>
//                         <span className={`db-voucher is-${item.sourceType}`}>
//                           {getVoucherLabel(item)}
//                         </span>
//                       </td>
//                       <td className="db-number">
//                         {currencyFmt.format(amountRupees)}
//                       </td>
//                     </tr>
//                   );
//                 })
//               )}
//             </tbody>
//           </table>
//         </div>

//         {pagination && (
//           <div className="db-pagination">
//             <span>
//               Page {pages.current} of {pages.totalPages} · {pagination.total}{" "}
//               vouchers · {limit} per page
//             </span>
//             <div className="db-pager">
//               <button
//                 type="button"
//                 disabled={pages.current <= 1 || busy}
//                 onClick={() => setPage((p) => Math.max(1, p - 1))}
//               >
//                 Prev
//               </button>
//               {pages.items.map((p) => (
//                 <button
//                   key={p}
//                   type="button"
//                   className={p === pages.current ? "is-active" : ""}
//                   disabled={busy}
//                   onClick={() => setPage(p)}
//                 >
//                   {p}
//                 </button>
//               ))}
//               <button
//                 type="button"
//                 disabled={pages.current >= pages.totalPages || busy}
//                 onClick={() => setPage((p) => p + 1)}
//               >
//                 Next
//               </button>
//             </div>
//           </div>
//         )}
//       </section>

//       {ready && (
//         <footer className="db-footer">
//           <span>
//             {pagination?.total ?? 0} vouchers · {startDate} to {endDate} · UTC
//           </span>
//           <span>
//             Each voucher is balanced · Debit = Credit · Amount shows total value
//           </span>
//         </footer>
//       )}
//     </main>
//   );
// }

// Day Book = same reusable VoucherListPage, only the config below differs.
// daybook.css is no longer needed (shared VoucherListPage.css is used).
import journalApi from "../../../services/modules/journalApi";
import VoucherListPage from "../../../components/common/VoucherListPage/VoucherListPage";

/* ---------- formatters ---------- */
const currencyFmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const money = (rupees) => currencyFmt.format(Math.abs(Number(rupees || 0)));
const formatDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

const voucherLabels = {
  PURCHASE_BILL: "Purchase",
  SUPPLIER_PAYMENT: "Payment",
  MANUAL_JOURNAL: "Journal",
  SALES_INVOICE: "Sales",
  CUSTOMER_RECEIPT: "Receipt",
  SALES_RETURN: "Sales Return",
};
const getVoucherLabel = (item) => {
  const t = item.sourceType || item.voucherType;
  return voucherLabels[t] || t || "Journal";
};
const getTypeLabel = (v) => (v ? voucherLabels[v] || v : "All Vouchers");

const typeOptions = [
  { value: "", label: "All Vouchers" },
  { value: "SALES_INVOICE", label: "Sales" },
  { value: "PURCHASE_BILL", label: "Purchase" },
  { value: "CUSTOMER_RECEIPT", label: "Receipt" },
  { value: "SUPPLIER_PAYMENT", label: "Payment" },
  { value: "MANUAL_JOURNAL", label: "Journal" },
  { value: "SALES_RETURN", label: "Sales Return" },
];
const chipTypes = [
  { value: "", label: "All" },
  { value: "SALES_INVOICE", label: "Sales" },
  { value: "PURCHASE_BILL", label: "Purchase" },
  { value: "CUSTOMER_RECEIPT", label: "Receipt" },
  { value: "SUPPLIER_PAYMENT", label: "Payment" },
  { value: "MANUAL_JOURNAL", label: "Journal" },
];

/* ---------- API wiring ---------- */
const buildParams = (f) => ({
  startDate: f.startDate,
  endDate: f.endDate,
  sortBy: "postingDate",
  sortOrder: "desc",
  ...(f.type ? { sourceType: f.type } : {}),
  ...(f.search ? { search: f.search } : {}),
});

/* ---------- row helpers (same logic as your old page) ---------- */
const getParticulars = (item) =>
  item.narration ||
  item.ledgerNames ||
  item.description ||
  item.sourceNumber ||
  "—";

/* ---------- table columns ---------- */
const columns = [
  {
    key: "date",
    label: "Date",
    nowrap: true,
    render: (j) => formatDate(j.postingDate),
  },
  {
    key: "journalNo",
    label: "Journal No",
    render: (j) => (
      <>
        <strong className="jv-doc">{j.journalNumber || "—"}</strong>
        {j.sourceNumber && j.sourceNumber !== j.journalNumber && (
          <small className="jv-sub">{j.sourceNumber}</small>
        )}
      </>
    ),
  },
  {
    key: "docNo",
    label: "Doc No",
    render: (j) => (
      <>
        <strong className="jv-doc">{j.sourceNumber || "—"}</strong>
        {j.sourceId && (
          <small className="jv-sub" title={String(j.sourceId)}>
            {String(j.sourceId).slice(-6)}
          </small>
        )}
      </>
    ),
  },
  {
    key: "particulars",
    label: "Particulars",
    tdClassName: "jv-particulars",
    render: (j) => {
      const particulars = getParticulars(j);
      const counter = j.ledgerSummary;
      return (
        <>
          <span>{particulars}</span>
          {counter && counter !== particulars && (
            <small className="jv-sub">{counter}</small>
          )}
        </>
      );
    },
  },
  {
    key: "type",
    label: "Vch Type",
    render: (j) => (
      <span className={`jv-voucher is-${j.sourceType}`}>
        {getVoucherLabel(j)}
      </span>
    ),
  },
  {
    key: "amount",
    label: "Amount",
    thClassName: "jv-num",
    tdClassName: "jv-number",
    render: (j) => money(Number(j.totalDebitPaise ?? 0) / 100),
  },
];

/* ---------- summary cards ---------- */
const cards = ({ summary, total }) => {
  const t = summary?.typeWise || {};
  const balanced = summary
    ? summary.totals.debitPaise === summary.totals.creditPaise
    : true;
  const ready = Boolean(summary);
  return [
    {
      label: "Total Vouchers",
      value: ready ? String(total ?? 0) : "—",
      hint: ready
        ? `${summary.period.startDate} to ${summary.period.endDate}`
        : "",
    },
    {
      label: "Total Amount",
      value: ready ? money(summary.totals.amount) : "—",
      hint: ready
        ? balanced
          ? "Debit = Credit (balanced)"
          : "Debit ≠ Credit — check books"
        : "",
      accent: true,
    },
    {
      label: "Sales + Purchase",
      value: ready
        ? String(Number(t.SALES_INVOICE || 0) + Number(t.PURCHASE_BILL || 0))
        : "—",
      hint: ready
        ? `Sales ${t.SALES_INVOICE || 0} · Purchase ${t.PURCHASE_BILL || 0}`
        : "",
    },
    {
      label: "Cash Flow",
      value: ready
        ? `${t.CUSTOMER_RECEIPT || 0} in · ${t.SUPPLIER_PAYMENT || 0} out`
        : "—",
      hint: ready
        ? `Journal ${t.MANUAL_JOURNAL || 0} · Return ${t.SALES_RETURN || 0}`
        : "",
    },
  ];
};

/* ---------- CSV export (current page) ---------- */
const exportConfig = {
  fileName: (f) =>
    `daybook-${f.startDate}-${f.endDate}${f.type ? `-${f.type}` : ""}.csv`,
  meta: ({ filters, total, summary }) => [
    ["Day Book", `${filters.startDate} to ${filters.endDate}`],
    [
      "Voucher Filter",
      filters.type
        ? voucherLabels[filters.type] || filters.type
        : "All Vouchers",
    ],
    ["Search", filters.search || "—"],
    ["Total Vouchers", String(total ?? 0)],
    ["Total Amount", Number(summary?.totals?.amount ?? 0).toFixed(2)],
    [],
  ],
  columns: [
    { header: "Date", value: (j) => formatDate(j.postingDate) },
    { header: "Journal No", value: (j) => j.journalNumber || "" },
    { header: "Source No", value: (j) => j.sourceNumber || "" },
    { header: "Particulars", value: (j) => getParticulars(j) },
    { header: "Voucher Type", value: (j) => getVoucherLabel(j) },
    {
      header: "Amount (INR)",
      value: (j) => (Number(j.totalDebitPaise ?? 0) / 100).toFixed(2),
    },
    {
      header: "Narration",
      value: (j) => String(j.narration || "").replace(/\r?\n/g, " "),
    },
  ],
};

export default function Daybook() {
  return (
    <VoucherListPage
      title="Day Book"
      namespace="daybook"
      fetchList={journalApi.getDayBookList}
      fetchSummary={journalApi.getDayBookSummary}
      buildParams={buildParams}
      columns={columns}
      cards={cards}
      typeOptions={typeOptions}
      chipTypes={chipTypes}
      getTypeLabel={getTypeLabel}
      getChipCount={(value, summary) =>
        value ? summary?.typeWise?.[value] : undefined
      }
      searchPlaceholder="Search journal no, source no, narration, ledger..."
      exportConfig={exportConfig}
      emptyText="No vouchers found for this period."
      footerText={({ total, filters }) =>
        `${total} vouchers · ${filters.startDate} to ${filters.endDate} · UTC`
      }
      footerNote="Each voucher is balanced · Debit = Credit · Amount shows total value"
    />
  );
}
