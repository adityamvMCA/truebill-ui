// import { useEffect, useMemo, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import {
//   ArrowLeft,
//   Download,
//   Plus,
//   RefreshCw,
//   Search,
//   Trash2,
//   X,
// } from "lucide-react";
// import journalApi from "../../../services/modules/journalApi";
// import ledgerApi from "../../../services/modules/ledgerApi";
// import "./JournalVouchers.css";

// const toLocalDate = (d) => {
//   const y = d.getFullYear();
//   const m = String(d.getMonth() + 1).padStart(2, "0");
//   const day = String(d.getDate()).padStart(2, "0");
//   return `${y}-${m}-${day}`;
// };
// const getToday = () => toLocalDate(new Date());
// const getMonthStart = () =>
//   toLocalDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

// const currencyFmt = new Intl.NumberFormat("en-IN", {
//   style: "currency",
//   currency: "INR",
//   minimumFractionDigits: 2,
//   maximumFractionDigits: 2,
// });
// const money = (v) => currencyFmt.format(Math.abs(Number(v || 0)));
// const formatDate = (v) => {
//   if (!v) return "—";
//   const d = new Date(v);
//   if (Number.isNaN(d.getTime())) return "—";
//   return d.toLocaleDateString("en-IN", {
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//     timeZone: "UTC",
//   });
// };
// const getErrorMessage = (e) =>
//   e?.response?.data?.message || e?.message || "Something went wrong.";

// const voucherOptions = [
//   { value: "", label: "All Vouchers" },
//   { value: "MANUAL_JOURNAL", label: "Journal" },
//   { value: "SALES_INVOICE", label: "Sales" },
//   { value: "PURCHASE_BILL", label: "Purchase" },
//   { value: "CUSTOMER_RECEIPT", label: "Receipt" },
//   { value: "SUPPLIER_PAYMENT", label: "Payment" },
//   { value: "SALES_RETURN", label: "Sales Return" },
// ];

// const chipTypes = [
//   { value: "", label: "All" },
//   { value: "MANUAL_JOURNAL", label: "Journal" },
//   { value: "SALES_INVOICE", label: "Sales" },
//   { value: "PURCHASE_BILL", label: "Purchase" },
//   { value: "CUSTOMER_RECEIPT", label: "Receipt" },
//   { value: "SUPPLIER_PAYMENT", label: "Payment" },
// ];

// const getVoucherLabel = (s) =>
//   ({
//     PURCHASE_BILL: "Purchase",
//     SALES_INVOICE: "Sales",
//     CUSTOMER_RECEIPT: "Receipt",
//     SUPPLIER_PAYMENT: "Payment",
//     MANUAL_JOURNAL: "Journal",
//     SALES_RETURN: "Return",
//   })[s] ||
//   s ||
//   "—";
// const getParticulars = (j) =>
//   j.narration ||
//   (Array.isArray(j.lines)
//     ? j.lines
//         .map((l) => `${l.ledgerName} ${l.debitPaise ? "Dr" : "Cr"}`)
//         .join(" / ")
//     : "—");
// const csvCell = (v) => {
//   let t = String(v ?? "");
//   if (/^\s*[=+\-@]/.test(t)) t = `'${t}`;
//   return `"${t.replace(/"/g, '""')}"`;
// };

// export default function JournalVouchers() {
//   const navigate = useNavigate();

//   const [startDate, setStartDate] = useState(getMonthStart);
//   const [endDate, setEndDate] = useState(getToday);
//   const [search, setSearch] = useState("");
//   const [sourceType, setSourceType] = useState("");
//   const [page, setPage] = useState(1);
//   const [limit] = useState(50);

//   const [rows, setRows] = useState([]);
//   const [pagination, setPagination] = useState(null);
//   const [summary, setSummary] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const [refreshKey, setRefreshKey] = useState(0);

//   const [showCreate, setShowCreate] = useState(false);

//   const [debouncedSearch, setDebouncedSearch] = useState("");
//   useEffect(() => {
//     const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
//     return () => clearTimeout(t);
//   }, [search]);
//   useEffect(() => {
//     setPage(1);
//   }, [startDate, endDate, sourceType, debouncedSearch]);

//   useEffect(() => {
//     let cancelled = false;
//     const load = async () => {
//       if (!startDate || !endDate || startDate > endDate) {
//         setError("Choose a valid From and To date.");
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
//         const body = res?.data;
//         if (!body?.success || !Array.isArray(body?.transactions))
//           throw new Error(body?.message || "Invalid response.");
//         setRows(body.transactions);
//         setPagination(body.pagination || null);
//         setSummary(body.data || null);
//       } catch (err) {
//         if (!cancelled) {
//           setRows([]);
//           setPagination(null);
//           setSummary(null);
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

//   const pages = useMemo(() => {
//     const totalPages = Number(pagination?.totalPages || 1);
//     const cur = Number(pagination?.page || page);
//     const win = 5;
//     let s = Math.max(1, cur - Math.floor(win / 2));
//     let e = Math.min(totalPages, s + win - 1);
//     if (e - s + 1 < win) s = Math.max(1, e - win + 1);
//     return {
//       totalPages,
//       cur,
//       items: Array.from({ length: e - s + 1 }, (_, i) => s + i),
//     };
//   }, [pagination, page]);

//   const exportCsv = () => {
//     if (!rows.length) return;
//     const meta = [
//       ["Journal Vouchers", `${startDate} to ${endDate}`],
//       ["Filter", sourceType || "All"],
//       ["Search", debouncedSearch || "—"],
//       [],
//     ];
//     const cols = [
//       "Date",
//       "Journal No",
//       "Source No",
//       "Voucher Type",
//       "Particulars",
//       "Amount (INR)",
//     ];
//     const body = rows.map((j) => [
//       formatDate(j.postingDate || j.date),
//       j.journalNumber || "",
//       j.sourceNumber || "",
//       getVoucherLabel(j.sourceType),
//       (j.narration || getParticulars(j)).replace(/\r?\n/g, " "),
//       (Number(j.totalDebitPaise ?? 0) / 100).toFixed(2),
//     ]);
//     const csv = [...meta, cols, ...body]
//       .map((r) => r.map(csvCell).join(","))
//       .join("\r\n");
//     const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8;" });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = `journal-vouchers-${startDate}-${endDate}${sourceType ? `-${sourceType}` : ""}.csv`;
//     document.body.appendChild(a);
//     a.click();
//     a.remove();
//     setTimeout(() => URL.revokeObjectURL(url), 1000);
//   };

//   const busy = loading;
//   const ready = !busy && !error;

//   return (
//     <main className="jv-page">
//       <header className="jv-header">
//         <div className="jv-heading">
//           <button
//             type="button"
//             className="jv-back"
//             aria-label="Go back"
//             onClick={() => navigate(-1)}
//           >
//             <ArrowLeft size={18} />
//           </button>
//           <div className="jv-title">
//             <h1>Journal Vouchers</h1>
//             <p>
//               {startDate} to {endDate} ·{" "}
//               {sourceType ? getVoucherLabel(sourceType) : "All vouchers"} ·{" "}
//               {pagination?.total ?? rows.length} entries
//             </p>
//           </div>
//         </div>
//         <div className="jv-actions">
//           <button
//             type="button"
//             className="jv-button"
//             onClick={exportCsv}
//             disabled={!rows.length}
//           >
//             <Download size={16} /> Export
//           </button>
//           <button
//             type="button"
//             className="jv-button"
//             disabled={busy}
//             onClick={() => setRefreshKey((c) => c + 1)}
//           >
//             <RefreshCw size={16} className={busy ? "jv-spin" : ""} /> Refresh
//           </button>
//           {/* <button
//             type="button"
//             className="jv-button jv-button-primary"
//             onClick={() => setShowCreate(true)}
//           >
//             <Plus size={16} /> New Journal
//           </button> */}
//         </div>
//       </header>

//       <section className="jv-cards" aria-label="Summary">
//         <article className="jv-card">
//           <span>Total Vouchers</span>
//           <strong>{pagination?.total ?? rows.length}</strong>
//           <small>
//             {pagination ? `Page ${pages.cur} of ${pages.totalPages}` : " "}
//           </small>
//         </article>
//         <article className="jv-card">
//           <span>Total Amount</span>
//           <strong style={{ color: "var(--jv-primary)" }}>
//             {summary
//               ? money(summary?.totals?.amount ?? summary?.totals?.debit ?? 0)
//               : money(
//                   rows.reduce(
//                     (a, r) => a + Number(r.totalDebitPaise || 0) / 100,
//                     0,
//                   ),
//                 )}
//           </strong>
//           <small>Debit = Credit (balanced)</small>
//         </article>
//         <article className="jv-card">
//           <span>Journal Vouchers</span>
//           <strong>
//             {summary?.typeWise?.MANUAL_JOURNAL ??
//               rows.filter((r) => r.sourceType === "MANUAL_JOURNAL").length}
//           </strong>
//           <small>Manual entries</small>
//         </article>
//         <article className="jv-card">
//           <span>Other Vouchers</span>
//           <strong>
//             {pagination
//               ? Number(pagination.total || 0) -
//                 Number(summary?.typeWise?.MANUAL_JOURNAL || 0)
//               : rows.filter((r) => r.sourceType !== "MANUAL_JOURNAL").length}
//           </strong>
//           <small>Sales · Purchase · Receipts</small>
//         </article>
//       </section>

//       <section className="jv-filters" aria-label="Filters">
//         <div className="jv-search">
//           <Search size={17} aria-hidden="true" />
//           <input
//             type="search"
//             value={search}
//             aria-label="Search vouchers"
//             placeholder="Search journal no, source no, narration, ledger..."
//             onChange={(e) => setSearch(e.target.value)}
//           />
//         </div>
//         <label className="jv-date">
//           <span>From</span>
//           <input
//             type="date"
//             value={startDate}
//             max={endDate || undefined}
//             onChange={(e) => setStartDate(e.target.value)}
//           />
//         </label>
//         <label className="jv-date">
//           <span>To</span>
//           <input
//             type="date"
//             value={endDate}
//             min={startDate || undefined}
//             onChange={(e) => setEndDate(e.target.value)}
//           />
//         </label>
//         <label className="jv-select">
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

//       <div className="jv-chips" role="tablist" aria-label="Voucher type">
//         {chipTypes.map((c) => (
//           <button
//             key={c.value}
//             type="button"
//             role="tab"
//             aria-selected={sourceType === c.value}
//             className={`jv-chip ${sourceType === c.value ? "is-active" : ""}`}
//             onClick={() => setSourceType(c.value)}
//           >
//             {c.label}
//           </button>
//         ))}
//       </div>

//       {error && (
//         <div className="jv-error" role="alert">
//           {error}
//         </div>
//       )}

//       <section
//         className="jv-table-card"
//         aria-label="Vouchers table"
//         aria-busy={busy}
//       >
//         <div
//           className="jv-table-scroll"
//           tabIndex={0}
//           role="region"
//           aria-label="Scrollable table"
//         >
//           <table className="jv-table">
//             <thead>
//               <tr>
//                 <th scope="col">Date</th>
//                 <th scope="col">Journal No</th>
//                 <th scope="col">Doc No</th>
//                 <th scope="col">Particulars</th>
//                 <th scope="col">Vch Type</th>
//                 <th scope="col" className="jv-num">
//                   Amount
//                 </th>
//               </tr>
//             </thead>
//             <tbody>
//               {busy ? (
//                 <tr>
//                   <td colSpan={6} className="jv-empty">
//                     Loading vouchers...
//                   </td>
//                 </tr>
//               ) : error ? (
//                 <tr>
//                   <td colSpan={6} className="jv-empty">
//                     Unable to display vouchers.
//                   </td>
//                 </tr>
//               ) : !rows.length ? (
//                 <tr>
//                   <td colSpan={6} className="jv-empty">
//                     {debouncedSearch || sourceType
//                       ? "No vouchers match your filters."
//                       : "No vouchers for this period."}
//                   </td>
//                 </tr>
//               ) : (
//                 rows.map((j) => (
//                   <tr key={j._id || j.journalNumber}>
//                     <td style={{ whiteSpace: "nowrap" }}>
//                       {formatDate(j.postingDate || j.date)}
//                     </td>
//                     <td>
//                       <strong className="jv-doc">
//                         {j.journalNumber || "—"}
//                       </strong>
//                       <span className="jv-sub">
//                         {j._id ? String(j._id).slice(-6) : ""}
//                       </span>
//                     </td>
//                     <td>
//                       <strong className="jv-doc">
//                         {j.sourceNumber || j.reference || "—"}
//                       </strong>
//                     </td>
//                     <td className="jv-particulars">
//                       <span>{getParticulars(j)}</span>
//                       {Array.isArray(j.lines) && (
//                         <span className="jv-sub">
//                           {j.lines
//                             .map(
//                               (l) =>
//                                 `${l.ledgerCode} ${l.debitPaise ? "Dr" : "Cr"}`,
//                             )
//                             .join(" · ")}
//                         </span>
//                       )}
//                     </td>
//                     <td>
//                       <span className={`jv-voucher is-${j.sourceType}`}>
//                         {getVoucherLabel(j.sourceType)}
//                       </span>
//                     </td>
//                     <td className="jv-number">
//                       {money(Number(j.totalDebitPaise ?? 0) / 100)}
//                     </td>
//                   </tr>
//                 ))
//               )}
//             </tbody>
//           </table>
//         </div>

//         {pagination && (
//           <div className="jv-pagination">
//             <span>
//               Page {pages.cur} of {pages.totalPages} · {pagination.total}{" "}
//               vouchers
//             </span>
//             <div className="jv-pager">
//               <button
//                 type="button"
//                 disabled={pages.cur <= 1 || busy}
//                 onClick={() => setPage((p) => Math.max(1, p - 1))}
//               >
//                 Prev
//               </button>
//               {pages.items.map((p) => (
//                 <button
//                   key={p}
//                   type="button"
//                   className={p === pages.cur ? "is-active" : ""}
//                   disabled={busy}
//                   onClick={() => setPage(p)}
//                 >
//                   {p}
//                 </button>
//               ))}
//               <button
//                 type="button"
//                 disabled={pages.cur >= pages.totalPages || busy}
//                 onClick={() => setPage((p) => p + 1)}
//               >
//                 Next
//               </button>
//             </div>
//           </div>
//         )}
//       </section>

//       {pagination && (
//         <footer className="jv-footer">
//           <span>
//             {pagination.total} vouchers · {startDate} to {endDate} · Tally-style
//             daybook under the hood
//           </span>
//           <span>Balanced · Paise-safe</span>
//         </footer>
//       )}

//       {/* {showCreate && (
//         <CreateJournalModal
//           onClose={() => setShowCreate(false)}
//           onCreated={() => { setShowCreate(false); setRefreshKey((c) => c + 1); }}
//         />
//       )} */}
//     </main>
//   );
// }


// Everything below is CONFIG. For the next page (Sales Vouchers, Receipts, ...)
// copy this file and change: namespace, API calls, columns, cards, export.
import journalApi from "../../../services/modules/journalApi";
import VoucherListPage from "../../../components/common/VoucherListPage/VoucherListPage";

/* ---------- formatters ---------- */
const currencyFmt = new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2,
});
const money = (v) => currencyFmt.format(Math.abs(Number(v || 0)));
const formatDate = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
};

const VOUCHER_LABELS = {
  PURCHASE_BILL: "Purchase",
  SALES_INVOICE: "Sales",
  CUSTOMER_RECEIPT: "Receipt",
  SUPPLIER_PAYMENT: "Payment",
  MANUAL_JOURNAL: "Journal",
  SALES_RETURN: "Sales Return",
  PURCHASE_RETURN: "Purchase Return",
  EXPENSE: "Expense",
  CREDIT_NOTE: "Credit Note",
  DEBIT_NOTE: "Debit Note",
  TDS_DEDUCTION: "TDS Deduction",
  TDS_PAYMENT: "TDS Payment",
};
const getVoucherLabel = (s) => VOUCHER_LABELS[s] || s || "—";
const getTypeLabel = (v) => (v ? getVoucherLabel(v) : "All vouchers");

const typeOptions = [
  { value: "", label: "All Vouchers" },
  ...Object.entries(VOUCHER_LABELS).map(([value, label]) => ({ value, label })),
];
const chipTypes = [
  { value: "", label: "All" },
  { value: "MANUAL_JOURNAL", label: "Journal" },
  { value: "SALES_INVOICE", label: "Sales" },
  { value: "PURCHASE_BILL", label: "Purchase" },
  { value: "CUSTOMER_RECEIPT", label: "Receipt" },
  { value: "SUPPLIER_PAYMENT", label: "Payment" },
];

/* ---------- API wiring (module level = stable references) ---------- */
const buildParams = (f) => ({
  startDate: f.startDate,
  endDate: f.endDate,
  sortBy: "postingDate",
  sortOrder: "desc",
  ...(f.type ? { sourceType: f.type } : {}),
  ...(f.search ? { search: f.search } : {}),
});

/* ---------- table columns ---------- */
const columns = [
  { key: "date", label: "Date", nowrap: true, render: (j) => formatDate(j.postingDate) },
  {
    key: "journalNo",
    label: "Journal No",
    render: (j) => (
      <>
        <strong className="jv-doc">{j.journalNumber || "—"}</strong>
        <span className="jv-sub">{j._id ? String(j._id).slice(-6) : ""}</span>
      </>
    ),
  },
  {
    key: "docNo",
    label: "Doc No",
    render: (j) => <strong className="jv-doc">{j.sourceNumber || "—"}</strong>,
  },
  {
    key: "particulars",
    label: "Particulars",
    tdClassName: "jv-particulars",
    render: (j) => (
      <>
        <span>{j.particulars || "—"}</span>
        {j.ledgerCodes ? <span className="jv-sub">{j.ledgerCodes}</span> : null}
      </>
    ),
  },
  {
    key: "type",
    label: "Vch Type",
    render: (j) => <span className={`jv-voucher is-${j.sourceType}`}>{getVoucherLabel(j.sourceType)}</span>,
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
const cards = ({ summary, total, page, totalPages }) => {
  const manual = summary?.typeWise?.MANUAL_JOURNAL ?? 0;
  const balanced = summary ? summary.totals.debitPaise === summary.totals.creditPaise : true;
  return [
    {
      label: "Total Vouchers",
      value: total ?? "—",
      hint: totalPages ? `Page ${page} of ${totalPages}` : "",
    },
    {
      label: "Total Amount",
      value: summary ? money(summary.totals.amount) : "—",
      hint: balanced ? "Debit = Credit (balanced)" : "Debit ≠ Credit — check books",
      accent: true,
    },
    { label: "Journal Vouchers", value: summary ? manual : "—", hint: "Manual entries" },
    {
      label: "Other Vouchers",
      value: summary ? Number(total || 0) - manual : "—",
      hint: "Sales · Purchase · Receipts",
    },
  ];
};

/* ---------- CSV export (current page) ---------- */
const exportConfig = {
  fileName: (f) => `journal-vouchers-${f.startDate}-${f.endDate}${f.type ? `-${f.type}` : ""}.csv`,
  columns: [
    { header: "Date", value: (j) => formatDate(j.postingDate) },
    { header: "Journal No", value: (j) => j.journalNumber || "" },
    { header: "Source No", value: (j) => j.sourceNumber || "" },
    { header: "Voucher Type", value: (j) => getVoucherLabel(j.sourceType) },
    { header: "Particulars", value: (j) => String(j.particulars || "").replace(/\r?\n/g, " ") },
    { header: "Amount (INR)", value: (j) => (Number(j.totalDebitPaise ?? 0) / 100).toFixed(2) },
  ],
};

export default function JournalVouchers() {
  return (
    <VoucherListPage
      title="Journal Vouchers"
      namespace="journal-vouchers"
      fetchList={journalApi.getDayBookList}
      fetchSummary={journalApi.getDayBookSummary}
      buildParams={buildParams}
      columns={columns}
      cards={cards}
      typeOptions={typeOptions}
      chipTypes={chipTypes}
      getTypeLabel={getTypeLabel}
      searchPlaceholder="Search journal no, source no, narration, ledger..."
      exportConfig={exportConfig}
      emptyText="No vouchers for this period."
      footerText={({ total, filters }) =>
        `${total} vouchers · ${filters.startDate} to ${filters.endDate} · Tally-style daybook`
      }
    />
  );
}