// import { useEffect, useMemo, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { ArrowLeft, Download, RefreshCw, Search } from "lucide-react";

// import ledgerApi from "../../../../services/modules/ledger.api";
// // Adjust import if your file is named vendorApi / supplierApi differently:
// // import supplierApi from "../../services/modules/vendorApi";
// import supplierApi from "../../../../services/modules/supplierApi";

// import "./SupplierLedger.css";

// const toLocalDate = (date) => {
//   const y = date.getFullYear();
//   const m = String(date.getMonth() + 1).padStart(2, "0");
//   const d = String(date.getDate()).padStart(2, "0");
//   return `${y}-${m}-${d}`;
// };
// const getToday = () => toLocalDate(new Date());
// const getMonthStart = () => toLocalDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

// const currencyFmt = new Intl.NumberFormat("en-IN", {
//   style: "currency",
//   currency: "INR",
//   minimumFractionDigits: 2,
//   maximumFractionDigits: 2,
// });
// const money = (v) => currencyFmt.format(Math.abs(Number(v || 0)));

// const formatDate = (value) => {
//   if (!value) return "—";
//   const d = new Date(value);
//   if (Number.isNaN(d.getTime())) return "—";
//   return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
// };

// // Supplier is LIABILITY (CREDIT normal) — mirror of Customer (ASSET)
// const getBalanceType = (value, explicitType) => {
//   const a = Number(value || 0);
//   if (a > 0) return "Dr";
//   if (a < 0) return "Cr";
//   return explicitType === "CREDIT" ? "Cr" : "Dr";
// };

// const voucherLabels = {
//   PURCHASE_BILL: "Purchase",
//   SUPPLIER_PAYMENT: "Payment",
//   MANUAL_JOURNAL: "Journal",
//   SALES_INVOICE: "Sales",
//   CUSTOMER_RECEIPT: "Receipt",
//   SALES_RETURN: "Return",
// };

// const getVoucherLabel = (item) => voucherLabels[item.sourceType || item.voucherType] || item.sourceType || "Journal";
// const getDocumentNumber = (item) => item.sourceNumber || item.reference || item.journalNumber || "—";
// const getDescription = (item) => item.description || item.narration || item.counterAccount || "—";
// const getErrorMessage = (error) => error?.response?.data?.message || error?.message || "Unable to load data.";

// const readLedgerResponse = (response) => {
//   const body = response?.data;
//   if (!body?.success || !body?.data || !Array.isArray(body.transactions)) {
//     throw new Error(body?.message || "Invalid ledger response.");
//   }
//   return body;
// };

// const getPageCount = (pagination) => {
//   const pages = Number(pagination?.totalPages ?? 1);
//   if (!Number.isSafeInteger(pages) || pages < 0) throw new Error("Invalid pagination response.");
//   return Math.max(1, pages);
// };

// const csvCell = (value) => {
//   let text = String(value ?? "");
//   if (/^\s*[=+\-@]/.test(text)) text = `'${text}`;
//   return `"${text.replace(/"/g, '""')}"`;
// };

// function Balance({ value, type, className = "" }) {
//   return (
//     <span className={`sl-balance ${className}`}>
//       {money(value)}<small>{getBalanceType(value, type)}</small>
//     </span>
//   );
// }

// // Supplier doc has ledgerId (ObjectId) — same as Customer CU001 pattern
// const getLedgerId = (s) => String(s?.ledgerId || s?.ledger_id || "").trim();
// const getSupplierLabel = (s) => s?.supplierName || s?.name || s?.vendorName || s?.displayName || "Unnamed";
// const getSupplierCode = (s) => s?.supplierCode || s?.vendorCode || s?.code || "";

// export default function SupplierLedger() {
//   const navigate = useNavigate();

//   const [suppliers, setSuppliers] = useState([]);
//   const [ledgerId, setLedgerId] = useState("");

//   const [startDate, setStartDate] = useState(getMonthStart);
//   const [endDate, setEndDate] = useState(getToday);
//   const [search, setSearch] = useState("");

//   const [summary, setSummary] = useState(null);
//   const [transactions, setTransactions] = useState([]);

//   const [suppliersLoading, setSuppliersLoading] = useState(true);
//   const [ledgerLoading, setLedgerLoading] = useState(false);
//   const [supplierError, setSupplierError] = useState("");
//   const [ledgerError, setLedgerError] = useState("");
//   const [refreshKey, setRefreshKey] = useState(0);

//   // Load suppliers — uses your supplierApi.getAll (apiClient.get("/suppliers"))
//   useEffect(() => {
//     let cancelled = false;

//     const loadSuppliers = async () => {
//       setSuppliersLoading(true);
//       setSupplierError("");

//       try {
//         const collected = [];
//         let page = 1;
//         let totalPages = 1;

//         do {
//           const response = await supplierApi.getAll({ page, limit: 100 });
//           if (cancelled) return;

//           const body = response?.data;
//           const list = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : null;
//           if (!list) throw new Error(body?.message || "Invalid supplier response.");

//           collected.push(...list);

//           const pagination = body?.pagination || body?.meta;
//           totalPages = pagination ? getPageCount(pagination) : 1;
//           page += 1;
//           if (!pagination) break;
//         } while (page <= totalPages);

//         if (cancelled) return;

//         const withLedger = collected.filter((s) => getLedgerId(s));
//         const unique = Array.from(new Map(withLedger.map((s) => [String(s._id), s])).values());

//         setSuppliers(unique);

//         setLedgerId((cur) => {
//           if (cur && unique.some((s) => String(s.ledgerId) === cur)) return cur;
//           return unique[0] ? String(unique[0].ledgerId) : "";
//         });
//       } catch (error) {
//         if (!cancelled) setSupplierError(getErrorMessage(error));
//       } finally {
//         if (!cancelled) setSuppliersLoading(false);
//       }
//     };

//     void loadSuppliers();
//     return () => { cancelled = true; };
//   }, [refreshKey]);

//   // Load ledger — pass ledgerId (ObjectId), backend findLedger handles ObjectId
//   useEffect(() => {
//     let cancelled = false;

//     const loadLedger = async () => {
//       setSummary(null);
//       setTransactions([]);
//       setLedgerError("");

//       if (!ledgerId) {
//         setLedgerLoading(false);
//         return;
//       }

//       if (!startDate || !endDate || startDate > endDate) {
//         setLedgerError("Choose a valid From and To date.");
//         setLedgerLoading(false);
//         return;
//       }

//       setLedgerLoading(true);

//       try {
//         const params = { startDate, endDate, page: 1, limit: 200 };

//         const firstResponse = await ledgerApi.getTransactions(ledgerId, params);
//         if (cancelled) return;

//         const first = readLedgerResponse(firstResponse);
//         const rows = [...first.transactions];
//         const totalPages = getPageCount(first.pagination);

//         for (let p = 2; p <= totalPages; p += 1) {
//           if (cancelled) return;
//           const res = await ledgerApi.getTransactions(ledgerId, { ...params, page: p });
//           if (cancelled) return;
//           const body = readLedgerResponse(res);
//           rows.push(...body.transactions);
//         }

//         if (cancelled) return;
//         setSummary(first.data);
//         setTransactions(rows);
//       } catch (error) {
//         if (!cancelled) {
//           setSummary(null);
//           setTransactions([]);
//           setLedgerError(getErrorMessage(error));
//         }
//       } finally {
//         if (!cancelled) setLedgerLoading(false);
//       }
//     };

//     void loadLedger();
//     return () => { cancelled = true; };
//   }, [ledgerId, startDate, endDate, refreshKey]);

//   const selectedSupplier = useMemo(
//     () => suppliers.find((s) => String(s.ledgerId) === ledgerId),
//     [suppliers, ledgerId]
//   );

//   const visibleTransactions = useMemo(() => {
//     const q = search.trim().toLowerCase();
//     if (!q) return transactions;
//     return transactions.filter((item) =>
//       [getDescription(item), item.counterAccount, item.sourceNumber, item.reference, item.journalNumber, getVoucherLabel(item)]
//         .filter(Boolean).join(" ").toLowerCase().includes(q)
//     );
//   }, [transactions, search]);

//   const opening = Number(summary?.openingBalance || 0);
//   const closing = Number(summary?.closingBalance || 0);
//   const totalDebit = Number(summary?.totals?.debit || 0);
//   const totalCredit = Number(summary?.totals?.credit || 0);

//   const debitCount = useMemo(() => transactions.filter((x) => Number(x.debit) > 0).length, [transactions]);
//   const creditCount = useMemo(() => transactions.filter((x) => Number(x.credit) > 0).length, [transactions]);

//   const busy = suppliersLoading || ledgerLoading;
//   const ready = Boolean(summary) && !busy && !supplierError && !ledgerError;

//   const exportCsv = () => {
//     if (!ready) return;
//     const label = getSupplierLabel(selectedSupplier);
//     const rows = [
//       ["Supplier", label],
//       ["Supplier Code", getSupplierCode(selectedSupplier)],
//       ["Ledger Id", ledgerId],
//       ["From", startDate],
//       ["To", endDate],
//       ["Scope", search.trim() ? `Search: ${search.trim()}; totals are for the full period` : "All transactions in the selected period"],
//       [],
//       ["Date", "Document Number", "Journal Number", "Particulars", "Voucher Type", "Debit", "Credit", "Balance", "Balance Type"],
//       ["", "", "", "Opening Balance", "", "", "", Math.abs(opening).toFixed(2), getBalanceType(opening, summary.openingBalanceType)],
//       ...visibleTransactions.map((item) => [
//         formatDate(item.date),
//         getDocumentNumber(item),
//         item.journalNumber || "",
//         getDescription(item),
//         getVoucherLabel(item),
//         Number(item.debit || 0).toFixed(2),
//         Number(item.credit || 0).toFixed(2),
//         Math.abs(Number(item.balance || 0)).toFixed(2),
//         getBalanceType(item.balance, item.balanceType),
//       ]),
//       ["", "", "", "Full Period Totals / Closing Balance", "", totalDebit.toFixed(2), totalCredit.toFixed(2), Math.abs(closing).toFixed(2), getBalanceType(closing, summary.closingBalanceType)],
//     ];
//     const csv = rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
//     const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8;" });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = `${getSupplierCode(selectedSupplier) || ledgerId}-ledger-${startDate}-${endDate}.csv`;
//     document.body.appendChild(a);
//     a.click();
//     a.remove();
//     setTimeout(() => URL.revokeObjectURL(url), 1000);
//   };

//   return (
//     <main className="sl-page">
//       <header className="sl-header">
//         <div className="sl-heading">
//           <button type="button" className="sl-back" aria-label="Go back" onClick={() => navigate(-1)}>
//             <ArrowLeft size={18} />
//           </button>
//           <div className="sl-title">
//             <h1>{getSupplierLabel(selectedSupplier) !== "Unnamed" ? getSupplierLabel(selectedSupplier) : "Supplier Ledger"}</h1>
//             <p>{getSupplierCode(selectedSupplier) || ledgerId || "Select supplier"} · Supplier Ledger · Sundry Creditors</p>
//           </div>
//         </div>
//         <div className="sl-actions">
//           <button type="button" className="sl-button" onClick={exportCsv} disabled={!ready}>
//             <Download size={16} /> Export
//           </button>
//           <button type="button" className="sl-button sl-button-primary" disabled={busy} onClick={() => setRefreshKey((c) => c + 1)}>
//             <RefreshCw size={16} className={busy ? "sl-spin" : ""} /> Refresh
//           </button>
//         </div>
//       </header>

//       <section className="sl-picker">
//         <label htmlFor="sl-supplier">Supplier</label>
//         <select
//           id="sl-supplier"
//           value={ledgerId}
//           disabled={suppliersLoading}
//           onChange={(e) => setLedgerId(e.target.value)}
//         >
//           <option value="">{suppliersLoading ? "Loading suppliers..." : "Select supplier"}</option>
//           {suppliers.map((s) => (
//             <option key={String(s._id)} value={String(s.ledgerId)}>
//               {getSupplierLabel(s)} ({getSupplierCode(s) || String(s.ledgerId).slice(-6)})
//             </option>
//           ))}
//         </select>
//         {selectedSupplier && (
//           <span className="sl-meta">
//             {[
//               getSupplierCode(selectedSupplier),
//               selectedSupplier.phone || selectedSupplier.mobile,
//               selectedSupplier.gstNo || selectedSupplier.gstin,
//               selectedSupplier.payableBalance != null ? `Payable ${currencyFormatter(selectedSupplier.payableBalance)}` : "",
//             ].filter(Boolean).join(" · ")}
//           </span>
//         )}
//       </section>

//       {(supplierError || ledgerError) && <div className="sl-error" role="alert">{supplierError || ledgerError}</div>}

//       <section className="sl-cards" aria-label="Ledger summary">
//         <article className="sl-card">
//           <span>Opening Balance</span>
//           <strong>{ready ? money(opening) : "—"}</strong>
//           <small>{ready ? getBalanceType(opening, summary.openingBalanceType) : " "}</small>
//         </article>
//         <article className="sl-card">
//           <span>Total Debits (Paid)</span>
//           <strong className="sl-in">{ready ? money(totalDebit) : "—"}</strong>
//           <small>{ready ? `${debitCount} payments/journals` : " "}</small>
//         </article>
//         <article className="sl-card">
//           <span>Total Credits (Billed)</span>
//           <strong className="sl-out">{ready ? money(totalCredit) : "—"}</strong>
//           <small>{ready ? `${creditCount} bills` : " "}</small>
//         </article>
//         <article className="sl-card">
//           <span>Closing Balance</span>
//           <strong className="sl-primary-text">{ready ? money(closing) : "—"}</strong>
//           <small>{ready ? `${getBalanceType(closing, summary.closingBalanceType)} · ${closing < 0 ? "Payable" : closing > 0 ? "Advance" : ""}` : " "}</small>
//         </article>
//       </section>

//       <section className="sl-filters" aria-label="Ledger filters">
//         <div className="sl-search">
//           <Search size={17} aria-hidden="true" />
//           <input type="search" value={search} aria-label="Search transactions" placeholder="Search particulars, document, note..." onChange={(e) => setSearch(e.target.value)} />
//         </div>
//         <label className="sl-date">
//           <span>From</span>
//           <input type="date" value={startDate} max={endDate || undefined} onChange={(e) => setStartDate(e.target.value)} />
//         </label>
//         <label className="sl-date">
//           <span>To</span>
//           <input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} />
//         </label>
//         <div className="sl-opening-chip">
//           <span>Opening Bal</span>
//           {ready ? <Balance value={opening} type={summary.openingBalanceType} /> : <strong>—</strong>}
//         </div>
//       </section>

//       {search.trim() && ready && (
//         <p className="sl-search-note">Showing {visibleTransactions.length} of {transactions.length} entries. Balances and totals remain for the full selected period.</p>
//       )}

//       <section className="sl-table-card" aria-label="Supplier transactions" aria-busy={busy}>
//         <div className="sl-table-scroll" tabIndex={0} role="region" aria-label="Scrollable supplier ledger table">
//           <table className="sl-table">
//             <thead>
//               <tr>
//                 <th scope="col">Date</th>
//                 <th scope="col">Doc No</th>
//                 <th scope="col">Particulars</th>
//                 <th scope="col">Vch Type</th>
//                 <th scope="col" className="sl-number sl-in-heading">Debit</th>
//                 <th scope="col" className="sl-number sl-out-heading">Credit</th>
//                 <th scope="col" className="sl-number">Balance</th>
//               </tr>
//             </thead>
//             <tbody>
//               {ready && (
//                 <tr className="sl-opening-row">
//                   <td colSpan={6}>Opening Balance</td>
//                   <td className="sl-number"><Balance value={opening} type={summary.openingBalanceType} /></td>
//                 </tr>
//               )}
//               {busy ? (
//                 <tr><td colSpan={7} className="sl-empty">Loading supplier transactions...</td></tr>
//               ) : !ready ? (
//                 <tr><td colSpan={7} className="sl-empty">{supplierError || ledgerError ? "Unable to display transactions." : suppliers.length ? "Select a supplier." : "No suppliers with ledgers found."}</td></tr>
//               ) : !visibleTransactions.length ? (
//                 <tr><td colSpan={7} className="sl-empty">{search.trim() ? "No transactions match your search." : "No transactions found for this period."}</td></tr>
//               ) : (
//                 visibleTransactions.map((item) => {
//                   const description = getDescription(item);
//                   return (
//                     <tr key={item._id}>
//                       <td className="sl-nowrap">{formatDate(item.date)}</td>
//                       <td>
//                         <strong className="sl-doc">{getDocumentNumber(item)}</strong>
//                         {item.journalNumber && item.journalNumber !== getDocumentNumber(item) && <small className="sl-subtext">{item.journalNumber}</small>}
//                       </td>
//                       <td className="sl-particulars">
//                         <span>{description}</span>
//                         {item.counterAccount && item.counterAccount !== description && <small className="sl-subtext">{item.counterAccount}</small>}
//                       </td>
//                       <td><span className="sl-voucher">{getVoucherLabel(item)}</span></td>
//                       <td className="sl-number sl-in">{Number(item.debit) ? money(item.debit) : "—"}</td>
//                       <td className="sl-number sl-out">{Number(item.credit) ? money(item.credit) : "—"}</td>
//                       <td className="sl-number"><Balance value={item.balance} type={item.balanceType} /></td>
//                     </tr>
//                   );
//                 })
//               )}
//             </tbody>
//             {ready && (
//               <tfoot>
//                 <tr className="sl-closing-row">
//                   <td colSpan={4}>Period Totals / Closing Balance</td>
//                   <td className="sl-number sl-in">{money(totalDebit)}</td>
//                   <td className="sl-number sl-out">{money(totalCredit)}</td>
//                   <td className="sl-number"><Balance value={closing} type={summary.closingBalanceType} className="sl-primary-text" /></td>
//                 </tr>
//               </tfoot>
//             )}
//           </table>
//         </div>
//       </section>

//       {ready && (
//         <footer className="sl-footer">
//           <span>{transactions.length} entries · {startDate} to {endDate} · Sundry Creditors</span>
//           <span>Debit = paid/advance to supplier · Credit = billed/payable · Cr = Payable</span>
//         </footer>
//       )}
//     </main>
//   );
// }

// const currencyFormatter = (v) => {
//   try { return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Math.abs(Number(v || 0))); }
//   catch { return String(v); }
// };


import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Download, RefreshCw, Search } from "lucide-react";

import ledgerApi from "../../../../services/modules/ledger.api"; // <- same file your Customer ledger uses
import supplierApi from "../../../../services/modules/supplierApi";


import "./SupplierLedger.css";
import EntitySearchPicker from "../../../../components/common/EntitySearchPicker/EntitySearchPicker";

/* ------------------------------ constants ------------------------------ */
const PAGE_SIZE = 50;
const EXPORT_PAGE_SIZE = 200; // backend max
const PICKER_PAGE_SIZE = 20;

/* ------------------------------ helpers ------------------------------ */
const toLocalDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
const getToday = () => toLocalDate(new Date());
const getMonthStart = () => {
  const n = new Date();
  return toLocalDate(new Date(n.getFullYear(), n.getMonth(), 1));
};

const currencyFmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const money = (v) => currencyFmt.format(Math.abs(Number(v || 0)));

const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

// Supplier is a LIABILITY (credit normal). Positive = Dr, negative = Cr.
const getBalanceType = (value, explicitType) => {
  const a = Number(value || 0);
  if (a > 0) return "Dr";
  if (a < 0) return "Cr";
  return explicitType === "CREDIT" ? "Cr" : "Dr";
};

const voucherLabels = {
  PURCHASE_BILL: "Purchase",
  SUPPLIER_PAYMENT: "Payment",
  MANUAL_JOURNAL: "Journal",
  SALES_INVOICE: "Sales",
  CUSTOMER_RECEIPT: "Receipt",
  SALES_RETURN: "Return",
  PURCHASE_RETURN: "Purch. Return",
};
const getVoucherLabel = (item) =>
  voucherLabels[item.sourceType || item.voucherType] || item.sourceType || "Journal";
const getDocumentNumber = (item) =>
  item.sourceNumber || item.reference || item.journalNumber || "—";
const getDescription = (item) =>
  item.description || item.narration || item.counterAccount || "—";
const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || "Unable to load data.";

const readLedgerResponse = (response) => {
  const body = response?.data;
  if (!body?.success || !body?.data || !Array.isArray(body.transactions)) {
    throw new Error(body?.message || "Invalid ledger response.");
  }
  return body;
};

const getPageCount = (pagination) => {
  const pages = Number(pagination?.totalPages ?? 1);
  if (!Number.isSafeInteger(pages) || pages < 0) {
    throw new Error("Invalid pagination response.");
  }
  return Math.max(1, pages);
};

const csvCell = (value) => {
  let text = String(value ?? "");
  if (/^\s*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

/* ---- supplier helpers (ledgerId is the ObjectId of the linked ledger) ---- */
const getLedgerId = (s) => String(s?.ledgerId || s?.ledger_id || "").trim();
const getSupplierLabel = (s) =>
  s?.supplierName || s?.name || s?.vendorName || s?.displayName || "Unnamed";
const getSupplierCode = (s) => s?.supplierCode || s?.vendorCode || s?.code || "";
const getPickerLabel = (s) => {
  if (!s) return "";
  const code = getSupplierCode(s);
  return `${getSupplierLabel(s)}${code ? ` (${code})` : ""}`;
};

/* Normalise any supplier list response into { data, total } */
const readSupplierResponse = (response) => {
  const body = response?.data;
  const list = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : null;
  if (!list) throw new Error(body?.message || "Invalid supplier response.");

  const pg = body?.pagination || body?.meta || {};
  const total = Number(pg.total ?? pg.totalItems ?? pg.count ?? body?.total ?? list.length);

  return {
    // only suppliers with a linked accounting ledger can be viewed
    data: list.filter((s) => getLedgerId(s)),
    total: Number.isFinite(total) ? total : list.length,
  };
};

/*
  Module-level so its identity never changes.
  EntitySearchPicker calls: fetchOptions({ search, page, limit, signal })
  and expects:               { data: [...], total: number }
*/
const fetchSupplierOptions = async ({ search, page, limit }) => {
  const response = await supplierApi.getAll({
    page,
    limit,
    search: search || undefined,
  });
  return readSupplierResponse(response);
};
const getSupplierOptionId = (s) => getLedgerId(s);
const getSupplierOptionSubtitle = (s) =>
  [getSupplierCode(s), s.phone || s.mobile, s.gstNo || s.gstin].filter(Boolean).join(" · ");

function Balance({ value, type, className = "" }) {
  return (
    <span className={`sl-balance ${className}`}>
      {money(value)}
      <small>{getBalanceType(value, type)}</small>
    </span>
  );
}

/* ------------------------------ page ------------------------------ */
export default function SupplierLedger() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const ledgerId = getLedgerId(selectedSupplier) || searchParams.get("ledgerId") || "";

  const [startDate, setStartDate] = useState(getMonthStart);
  const [endDate, setEndDate] = useState(getToday);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [summary, setSummary] = useState(null);
  const [pageOpening, setPageOpening] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState(null);

  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerError, setLedgerError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  /* If opened with ?ledgerId=..., resolve that one supplier (single small request) */
  useEffect(() => {
    const idFromUrl = searchParams.get("ledgerId");
    if (!idFromUrl || selectedSupplier) return undefined;

    let cancelled = false;
    supplierApi
      .getAll({ page: 1, limit: 1, ledgerId: idFromUrl })
      .then((res) => {
        if (cancelled) return;
        const found = readSupplierResponse(res).data.find(
          (s) => getLedgerId(s) === idFromUrl,
        );
        if (found) setSelectedSupplier(found);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* EntitySearchPicker -> onToggle(id, option); (null, null) means "clear" */
  const handleSupplierToggle = useCallback(
    (id, option) => {
      setPage(1);
      setSearch("");

      if (!id || !option) {
        setSelectedSupplier(null);
        setSummary(null);
        setTransactions([]);
        setPagination(null);
        setLedgerError("");
        setSearchParams({}, { replace: true });
        return;
      }

      setSelectedSupplier(option);
      setSearchParams({ ledgerId: id }, { replace: true });
    },
    [setSearchParams],
  );

  /* Reset to page 1 when the date range changes */
  useEffect(() => {
    setPage(1);
  }, [startDate, endDate]);

  /* Load ONE page of the ledger (totals + balances come with every response) */
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLedgerError("");

      if (!ledgerId) {
        setSummary(null);
        setTransactions([]);
        setPagination(null);
        return;
      }
      if (!startDate || !endDate || startDate > endDate) {
        setLedgerError("Choose a valid From and To date.");
        return;
      }

      setLedgerLoading(true);
      try {
        const res = await ledgerApi.getTransactions(ledgerId, {
          startDate,
          endDate,
          page,
          limit: PAGE_SIZE,
        });
        if (cancelled) return;

        const body = readLedgerResponse(res);
        setSummary(body.data);
        setPageOpening(Number(body.data.pageOpeningBalance || 0));
        setTransactions(body.transactions);
        setPagination(body.pagination);
      } catch (error) {
        if (cancelled) return;
        setSummary(null);
        setTransactions([]);
        setPagination(null);
        setLedgerError(getErrorMessage(error));
      } finally {
        if (!cancelled) setLedgerLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [ledgerId, startDate, endDate, page, refreshKey]);

  /* ---------- derived ---------- */
  const visibleTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter((item) =>
      [
        getDescription(item),
        item.counterAccount,
        item.sourceNumber,
        item.reference,
        item.journalNumber,
        getVoucherLabel(item),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [transactions, search]);

  const opening = Number(summary?.openingBalance || 0);
  const closing = Number(summary?.closingBalance || 0);
  const totalDebit = Number(summary?.totals?.debit || 0);
  const totalCredit = Number(summary?.totals?.credit || 0);
  const totalEntries = Number(pagination?.total || 0);
  const totalPages = pagination ? getPageCount(pagination) : 1;

  const busy = ledgerLoading;
  const ready = Boolean(summary) && !busy && !ledgerError;
  const isFirstPage = page <= 1;

  const pageWindow = useMemo(() => {
    const win = 5;
    let s = Math.max(1, page - Math.floor(win / 2));
    const e = Math.min(totalPages, s + win - 1);
    if (e - s + 1 < win) s = Math.max(1, e - win + 1);
    return Array.from({ length: e - s + 1 }, (_, i) => s + i);
  }, [page, totalPages]);

  /* ---------- export (fetches ALL pages only when clicked) ---------- */
  const exportCsv = async () => {
    if (!ready || exporting) return;
    setExporting(true);
    try {
      const params = { startDate, endDate, limit: EXPORT_PAGE_SIZE };
      const first = readLedgerResponse(
        await ledgerApi.getTransactions(ledgerId, { ...params, page: 1 }),
      );
      const pages = getPageCount(first.pagination);
      const all = [...first.transactions];

      const rest = Array.from({ length: Math.max(0, pages - 1) }, (_, i) => i + 2);
      const BATCH = 4;
      for (let i = 0; i < rest.length; i += BATCH) {
        const chunk = rest.slice(i, i + BATCH);
        const results = await Promise.all(
          chunk.map((p) =>
            ledgerApi
              .getTransactions(ledgerId, { ...params, page: p })
              .then(readLedgerResponse),
          ),
        );
        results.forEach((r) => all.push(...r.transactions));
      }

      const s = first.data;
      const o = Number(s.openingBalance || 0);
      const c = Number(s.closingBalance || 0);

      const rows = [
        ["Supplier", getSupplierLabel(selectedSupplier)],
        ["Supplier Code", getSupplierCode(selectedSupplier)],
        ["Ledger Id", ledgerId],
        ["From", startDate],
        ["To", endDate],
        ["Scope", "All transactions in the selected period"],
        [],
        ["Date", "Document Number", "Journal Number", "Particulars", "Voucher Type", "Debit", "Credit", "Balance", "Balance Type"],
        ["", "", "", "Opening Balance", "", "", "", Math.abs(o).toFixed(2), getBalanceType(o, s.openingBalanceType)],
        ...all.map((item) => [
          formatDate(item.date),
          getDocumentNumber(item),
          item.journalNumber || "",
          getDescription(item),
          getVoucherLabel(item),
          Number(item.debit || 0).toFixed(2),
          Number(item.credit || 0).toFixed(2),
          Math.abs(Number(item.balance || 0)).toFixed(2),
          getBalanceType(item.balance, item.balanceType),
        ]),
        [
          "", "", "", "Period Totals / Closing Balance", "",
          Number(s.totals?.debit || 0).toFixed(2),
          Number(s.totals?.credit || 0).toFixed(2),
          Math.abs(c).toFixed(2),
          getBalanceType(c, s.closingBalanceType),
        ],
      ];

      const csv = rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
      const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${getSupplierCode(selectedSupplier) || ledgerId}-ledger-${startDate}-${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setLedgerError(getErrorMessage(error));
    } finally {
      setExporting(false);
    }
  };

  const title =
    selectedSupplier && getSupplierLabel(selectedSupplier) !== "Unnamed"
      ? getSupplierLabel(selectedSupplier)
      : "Supplier Ledger";

  /* ------------------------------ render ------------------------------ */
  return (
    <main className="sl-page">
      <header className="sl-header">
        <div className="sl-heading">
          <button type="button" className="sl-back" aria-label="Go back" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
          </button>
          <div className="sl-title">
            <h1>{title}</h1>
            <p>
              {getSupplierCode(selectedSupplier) || ledgerId || "Select supplier"} · Supplier Ledger · Sundry Creditors
            </p>
          </div>
        </div>
        <div className="sl-actions">
          <button type="button" className="sl-button" onClick={exportCsv} disabled={!ready || exporting}>
            <Download size={16} /> {exporting ? "Exporting..." : "Export"}
          </button>
          <button
            type="button"
            className="sl-button sl-button-primary"
            disabled={busy || !ledgerId}
            onClick={() => setRefreshKey((c) => c + 1)}
          >
            <RefreshCw size={16} className={busy ? "sl-spin" : ""} /> Refresh
          </button>
        </div>
      </header>

      <section className="sl-picker">
        <EntitySearchPicker
          label="Supplier"
          placeholder="Search supplier by name, code or phone..."
          multiple={false}
          fetchOptions={fetchSupplierOptions}
          getOptionId={getSupplierOptionId}
          getOptionLabel={getPickerLabel}
          getOptionSubtitle={getSupplierOptionSubtitle}
          selectedIds={ledgerId ? [ledgerId] : undefined}
          selectedLabel={getPickerLabel(selectedSupplier)}
          onToggle={handleSupplierToggle}
          pageSize={PICKER_PAGE_SIZE}
          emptyMessage="No suppliers found."
        />
        {selectedSupplier && (
          <span className="sl-meta">
            {[
              getSupplierCode(selectedSupplier),
              selectedSupplier.phone || selectedSupplier.mobile,
              selectedSupplier.gstNo || selectedSupplier.gstin,
              selectedSupplier.payableBalance != null
                ? `Payable ${money(selectedSupplier.payableBalance)}`
                : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        )}
      </section>

      {ledgerError && <div className="sl-error" role="alert">{ledgerError}</div>}

      <section className="sl-cards" aria-label="Ledger summary">
        <article className="sl-card">
          <span>Opening Balance</span>
          <strong>{ready ? money(opening) : "—"}</strong>
          <small>{ready ? getBalanceType(opening, summary.openingBalanceType) : " "}</small>
        </article>
        <article className="sl-card">
          <span>Total Debits (Paid)</span>
          <strong className="sl-in">{ready ? money(totalDebit) : "—"}</strong>
          <small>{ready ? `${totalEntries} entries in period` : " "}</small>
        </article>
        <article className="sl-card">
          <span>Total Credits (Billed)</span>
          <strong className="sl-out">{ready ? money(totalCredit) : "—"}</strong>
          <small>{ready ? "Bills / purchases" : " "}</small>
        </article>
        <article className="sl-card">
          <span>Closing Balance</span>
          <strong className="sl-primary-text">{ready ? money(closing) : "—"}</strong>
          <small>
            {ready
              ? `${getBalanceType(closing, summary.closingBalanceType)} · ${
                  closing < 0 ? "Payable" : closing > 0 ? "Advance" : ""
                }`
              : " "}
          </small>
        </article>
      </section>

      <section className="sl-filters" aria-label="Ledger filters">
        <div className="sl-search">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            value={search}
            aria-label="Search transactions"
            placeholder="Filter this page: particulars, document, note..."
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="sl-date">
          <span>From</span>
          <input type="date" value={startDate} max={endDate || undefined} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label className="sl-date">
          <span>To</span>
          <input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} />
        </label>
        <div className="sl-opening-chip">
          <span>Opening Bal</span>
          {ready ? <Balance value={opening} type={summary.openingBalanceType} /> : <strong>—</strong>}
        </div>
      </section>

      {search.trim() && ready && (
        <p className="sl-search-note">
          Showing {visibleTransactions.length} of {transactions.length} entries on this page. Balances and totals
          remain for the full selected period.
        </p>
      )}

      <section className="sl-table-card" aria-label="Supplier transactions" aria-busy={busy}>
        <div className="sl-table-scroll" tabIndex={0} role="region" aria-label="Scrollable supplier ledger table">
          <table className="sl-table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Doc No</th>
                <th scope="col">Particulars</th>
                <th scope="col">Vch Type</th>
                <th scope="col" className="sl-number sl-in-heading">Debit</th>
                <th scope="col" className="sl-number sl-out-heading">Credit</th>
                <th scope="col" className="sl-number">Balance</th>
              </tr>
            </thead>
            <tbody>
              {ready && (
                <tr className="sl-opening-row">
                  <td colSpan={6}>{isFirstPage ? "Opening Balance" : "Brought Forward"}</td>
                  <td className="sl-number">
                    {isFirstPage ? (
                      <Balance value={opening} type={summary.openingBalanceType} />
                    ) : (
                      <Balance value={pageOpening} />
                    )}
                  </td>
                </tr>
              )}
              {busy ? (
                <tr><td colSpan={7} className="sl-empty">Loading transactions...</td></tr>
              ) : !ledgerId ? (
                <tr><td colSpan={7} className="sl-empty">Search and select a supplier to view the ledger.</td></tr>
              ) : !ready ? (
                <tr><td colSpan={7} className="sl-empty">Unable to display transactions.</td></tr>
              ) : !visibleTransactions.length ? (
                <tr>
                  <td colSpan={7} className="sl-empty">
                    {search.trim() ? "No transactions match your search." : "No transactions found for this period."}
                  </td>
                </tr>
              ) : (
                visibleTransactions.map((item) => {
                  const description = getDescription(item);
                  return (
                    <tr key={item._id}>
                      <td className="sl-nowrap">{formatDate(item.date)}</td>
                      <td>
                        <strong className="sl-doc">{getDocumentNumber(item)}</strong>
                        {item.journalNumber && item.journalNumber !== getDocumentNumber(item) && (
                          <small className="sl-subtext">{item.journalNumber}</small>
                        )}
                      </td>
                      <td className="sl-particulars">
                        <span>{description}</span>
                        {item.counterAccount && item.counterAccount !== description && (
                          <small className="sl-subtext">{item.counterAccount}</small>
                        )}
                      </td>
                      <td><span className="sl-voucher">{getVoucherLabel(item)}</span></td>
                      <td className="sl-number sl-in">{Number(item.debit) ? money(item.debit) : "—"}</td>
                      <td className="sl-number sl-out">{Number(item.credit) ? money(item.credit) : "—"}</td>
                      <td className="sl-number"><Balance value={item.balance} type={item.balanceType} /></td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {ready && page >= totalPages && (
              <tfoot>
                <tr className="sl-closing-row">
                  <td colSpan={4}>Period Totals / Closing Balance</td>
                  <td className="sl-number sl-in">{money(totalDebit)}</td>
                  <td className="sl-number sl-out">{money(totalCredit)}</td>
                  <td className="sl-number">
                    <Balance value={closing} type={summary.closingBalanceType} className="sl-primary-text" />
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {ready && totalEntries > 0 && (
          <div className="sl-pagination">
            <span>Page {page} of {totalPages} · {totalEntries} entries</span>
            <div className="sl-pager">
              <button type="button" disabled={page <= 1 || busy} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Prev
              </button>
              {pageWindow.map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={busy}
                  className={p === page ? "is-active" : ""}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button type="button" disabled={page >= totalPages || busy} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {ready && (
        <footer className="sl-footer">
          <span>{totalEntries} entries · {startDate} to {endDate} · Sundry Creditors</span>
          <span>Debit = paid/advance to supplier · Credit = billed/payable · Cr = Payable</span>
        </footer>
      )}
    </main>
  );
}