// import { useEffect, useMemo, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { ArrowLeft, Download, RefreshCw, Search } from "lucide-react";

// import customerApi from "../../../../services/modules/customer.api";
// import ledgerApi from "../../../../services/modules/ledgerApi";


// import "./CustomerLedger.css";

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

// const getBalanceType = (value, explicitType) => {
//   const a = Number(value || 0);
//   if (a > 0) return "Dr";
//   if (a < 0) return "Cr";
//   return explicitType === "CREDIT" ? "Cr" : "Dr";
// };

// const voucherLabels = {
//   SALES_INVOICE: "Sales",
//   CUSTOMER_RECEIPT: "Receipt",
//   MANUAL_JOURNAL: "Journal",
//   SALES_RETURN: "Return",
//   PURCHASE_BILL: "Purchase",
//   SUPPLIER_PAYMENT: "Payment",
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
//     <span className={`cl-balance ${className}`}>
//       {money(value)}<small>{getBalanceType(value, type)}</small>
//     </span>
//   );
// }

// // Customer doc has ledgerId (ObjectId) — use it directly, NOT customerCode
// const getLedgerId = (c) => String(c?.ledgerId || "").trim();
// const getCustomerLabel = (c) => c?.customerName || c?.name || c?.displayName || "Unnamed";

// export default function CustomerLedger() {
//   const navigate = useNavigate();

//   const [customers, setCustomers] = useState([]);
//   // Store customer's ledgerId (ObjectId), not customerCode
//   const [ledgerId, setLedgerId] = useState("");

//   const [startDate, setStartDate] = useState(getMonthStart);
//   const [endDate, setEndDate] = useState(getToday);
//   const [search, setSearch] = useState("");

//   const [summary, setSummary] = useState(null);
//   const [transactions, setTransactions] = useState([]);

//   const [customersLoading, setCustomersLoading] = useState(true);
//   const [ledgerLoading, setLedgerLoading] = useState(false);
//   const [customerError, setCustomerError] = useState("");
//   const [ledgerError, setLedgerError] = useState("");
//   const [refreshKey, setRefreshKey] = useState(0);

//   // Load customers
//   useEffect(() => {
//     let cancelled = false;

//     const loadCustomers = async () => {
//       setCustomersLoading(true);
//       setCustomerError("");

//       try {
//         const collected = [];
//         let page = 1;
//         let totalPages = 1;

//         do {
//           const response = await customerApi.getAll({ page, limit: 100 });
//           if (cancelled) return;

//           const body = response?.data;
//           const list = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : null;
//           if (!list) throw new Error(body?.message || "Invalid customer response.");

//           collected.push(...list);

//           const pagination = body?.pagination || body?.meta;
//           totalPages = pagination ? getPageCount(pagination) : 1;
//           page += 1;
//           if (!pagination) break;
//         } while (page <= totalPages);

//         if (cancelled) return;

//         // Keep only customers that have a ledgerId (linked accounting ledger)
//         const withLedger = collected.filter((c) => getLedgerId(c));

//         const unique = Array.from(new Map(withLedger.map((c) => [String(c._id), c])).values());

//         setCustomers(unique);

//         setLedgerId((cur) => {
//           if (cur && unique.some((c) => String(c.ledgerId) === cur)) return cur;
//           return unique[0] ? String(unique[0].ledgerId) : "";
//         });
//       } catch (error) {
//         if (!cancelled) setCustomerError(getErrorMessage(error));
//       } finally {
//         if (!cancelled) setCustomersLoading(false);
//       }
//     };

//     void loadCustomers();
//     return () => { cancelled = true; };
//   }, [refreshKey]);

//   // Load ledger — pass ledgerId (ObjectId), backend now resolves it
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

//         // Pass ledgerId ObjectId — backend findLedger now handles ObjectId lookup
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

//   const selectedCustomer = useMemo(
//     () => customers.find((c) => String(c.ledgerId) === ledgerId),
//     [customers, ledgerId]
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

//   const busy = customersLoading || ledgerLoading;
//   const ready = Boolean(summary) && !busy && !customerError && !ledgerError;

//   const exportCsv = () => {
//     if (!ready) return;
//     const label = getCustomerLabel(selectedCustomer);
//     const rows = [
//       ["Customer", label],
//       ["Customer Code", selectedCustomer?.customerCode || ""],
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
//     a.download = `${selectedCustomer?.customerCode || ledgerId}-ledger-${startDate}-${endDate}.csv`;
//     document.body.appendChild(a);
//     a.click();
//     a.remove();
//     setTimeout(() => URL.revokeObjectURL(url), 1000);
//   };

//   return (
//     <main className="cl-page">
//       <header className="cl-header">
//         <div className="cl-heading">
//           <button type="button" className="cl-back" aria-label="Go back" onClick={() => navigate(-1)}>
//             <ArrowLeft size={18} />
//           </button>
//           <div className="cl-title">
//             <h1>{getCustomerLabel(selectedCustomer) !== "Unnamed" ? getCustomerLabel(selectedCustomer) : "Customer Ledger"}</h1>
//             <p>{selectedCustomer?.customerCode || ledgerId || "Select customer"} · Customer Ledger · Sundry Debtors</p>
//           </div>
//         </div>
//         <div className="cl-actions">
//           <button type="button" className="cl-button" onClick={exportCsv} disabled={!ready}>
//             <Download size={16} /> Export
//           </button>
//           <button type="button" className="cl-button cl-button-primary" disabled={busy} onClick={() => setRefreshKey((c) => c + 1)}>
//             <RefreshCw size={16} className={busy ? "cl-spin" : ""} /> Refresh
//           </button>
//         </div>
//       </header>

//       <section className="cl-picker">
//         <label htmlFor="cl-customer">Customer</label>
//         <select
//           id="cl-customer"
//           value={ledgerId}
//           disabled={customersLoading}
//           onChange={(e) => setLedgerId(e.target.value)}
//         >
//           <option value="">{customersLoading ? "Loading customers..." : "Select customer"}</option>
//           {customers.map((c) => (
//             <option key={String(c._id)} value={String(c.ledgerId)}>
//               {getCustomerLabel(c)} ({c.customerCode})
//             </option>
//           ))}
//         </select>
//         {selectedCustomer && (
//           <span className="cl-meta">
//             {[
//               selectedCustomer.customerCode,
//               selectedCustomer.phone || selectedCustomer.mobile,
//               selectedCustomer.gstNo || selectedCustomer.gstin,
//               selectedCustomer.receivableBalance != null ? `Receivable ${currencyFormatter(selectedCustomer.receivableBalance)}` : "",
//             ].filter(Boolean).join(" · ")}
//           </span>
//         )}
//       </section>

//       {(customerError || ledgerError) && <div className="cl-error" role="alert">{customerError || ledgerError}</div>}

//       <section className="cl-cards" aria-label="Ledger summary">
//         <article className="cl-card">
//           <span>Opening Balance</span>
//           <strong>{ready ? money(opening) : "—"}</strong>
//           <small>{ready ? getBalanceType(opening, summary.openingBalanceType) : " "}</small>
//         </article>
//         <article className="cl-card">
//           <span>Total Debits (Due)</span>
//           <strong className="cl-out">{ready ? money(totalDebit) : "—"}</strong>
//           <small>{ready ? `${debitCount} invoices/journals` : " "}</small>
//         </article>
//         <article className="cl-card">
//           <span>Total Credits (Received)</span>
//           <strong className="cl-in">{ready ? money(totalCredit) : "—"}</strong>
//           <small>{ready ? `${creditCount} receipts` : " "}</small>
//         </article>
//         <article className="cl-card">
//           <span>Closing Balance</span>
//           <strong className="cl-primary-text">{ready ? money(closing) : "—"}</strong>
//           <small>{ready ? `${getBalanceType(closing, summary.closingBalanceType)} · ${closing > 0 ? "Receivable" : closing < 0 ? "Advance" : ""}` : " "}</small>
//         </article>
//       </section>

//       <section className="cl-filters" aria-label="Ledger filters">
//         <div className="cl-search">
//           <Search size={17} aria-hidden="true" />
//           <input type="search" value={search} aria-label="Search transactions" placeholder="Search particulars, document, note..." onChange={(e) => setSearch(e.target.value)} />
//         </div>
//         <label className="cl-date">
//           <span>From</span>
//           <input type="date" value={startDate} max={endDate || undefined} onChange={(e) => setStartDate(e.target.value)} />
//         </label>
//         <label className="cl-date">
//           <span>To</span>
//           <input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} />
//         </label>
//         <div className="cl-opening-chip">
//           <span>Opening Bal</span>
//           {ready ? <Balance value={opening} type={summary.openingBalanceType} /> : <strong>—</strong>}
//         </div>
//       </section>

//       {search.trim() && ready && (
//         <p className="cl-search-note">Showing {visibleTransactions.length} of {transactions.length} entries. Balances and totals remain for the full selected period.</p>
//       )}

//       <section className="cl-table-card" aria-label="Customer transactions" aria-busy={busy}>
//         <div className="cl-table-scroll" tabIndex={0} role="region" aria-label="Scrollable customer ledger table">
//           <table className="cl-table">
//             <thead>
//               <tr>
//                 <th scope="col">Date</th>
//                 <th scope="col">Doc No</th>
//                 <th scope="col">Particulars</th>
//                 <th scope="col">Vch Type</th>
//                 <th scope="col" className="cl-number cl-out-heading">Debit</th>
//                 <th scope="col" className="cl-number cl-in-heading">Credit</th>
//                 <th scope="col" className="cl-number">Balance</th>
//               </tr>
//             </thead>
//             <tbody>
//               {ready && (
//                 <tr className="cl-opening-row">
//                   <td colSpan={6}>Opening Balance</td>
//                   <td className="cl-number"><Balance value={opening} type={summary.openingBalanceType} /></td>
//                 </tr>
//               )}
//               {busy ? (
//                 <tr><td colSpan={7} className="cl-empty">Loading customer transactions...</td></tr>
//               ) : !ready ? (
//                 <tr><td colSpan={7} className="cl-empty">{customerError || ledgerError ? "Unable to display transactions." : customers.length ? "Select a customer." : "No customers with ledgers found."}</td></tr>
//               ) : !visibleTransactions.length ? (
//                 <tr><td colSpan={7} className="cl-empty">{search.trim() ? "No transactions match your search." : "No transactions found for this period."}</td></tr>
//               ) : (
//                 visibleTransactions.map((item) => {
//                   const description = getDescription(item);
//                   return (
//                     <tr key={item._id}>
//                       <td className="cl-nowrap">{formatDate(item.date)}</td>
//                       <td>
//                         <strong className="cl-doc">{getDocumentNumber(item)}</strong>
//                         {item.journalNumber && item.journalNumber !== getDocumentNumber(item) && <small className="cl-subtext">{item.journalNumber}</small>}
//                       </td>
//                       <td className="cl-particulars">
//                         <span>{description}</span>
//                         {item.counterAccount && item.counterAccount !== description && <small className="cl-subtext">{item.counterAccount}</small>}
//                       </td>
//                       <td><span className="cl-voucher">{getVoucherLabel(item)}</span></td>
//                       <td className="cl-number cl-out">{Number(item.debit) ? money(item.debit) : "—"}</td>
//                       <td className="cl-number cl-in">{Number(item.credit) ? money(item.credit) : "—"}</td>
//                       <td className="cl-number"><Balance value={item.balance} type={item.balanceType} /></td>
//                     </tr>
//                   );
//                 })
//               )}
//             </tbody>
//             {ready && (
//               <tfoot>
//                 <tr className="cl-closing-row">
//                   <td colSpan={4}>Period Totals / Closing Balance</td>
//                   <td className="cl-number cl-out">{money(totalDebit)}</td>
//                   <td className="cl-number cl-in">{money(totalCredit)}</td>
//                   <td className="cl-number"><Balance value={closing} type={summary.closingBalanceType} className="cl-primary-text" /></td>
//                 </tr>
//               </tfoot>
//             )}
//           </table>
//         </div>
//       </section>

//       {ready && (
//         <footer className="cl-footer">
//           <span>{transactions.length} entries · {startDate} to {endDate} · Sundry Debtors</span>
//           <span>Debit = due from customer · Credit = receipt/advance · Dr = Receivable</span>
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

import customerApi from "../../../../services/modules/customer.api";
import ledgerApi from "../../../../services/modules/ledgerApi";


import "./CustomerLedger.css";
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

const getBalanceType = (value, explicitType) => {
  const a = Number(value || 0);
  if (a > 0) return "Dr";
  if (a < 0) return "Cr";
  return explicitType === "CREDIT" ? "Cr" : "Dr";
};

const voucherLabels = {
  SALES_INVOICE: "Sales",
  CUSTOMER_RECEIPT: "Receipt",
  MANUAL_JOURNAL: "Journal",
  SALES_RETURN: "Return",
  PURCHASE_BILL: "Purchase",
  SUPPLIER_PAYMENT: "Payment",
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

/* ---- customer helpers (ledgerId is the ObjectId of the linked ledger) ---- */
const getLedgerId = (c) => String(c?.ledgerId || "").trim();
const getCustomerLabel = (c) =>
  c?.customerName || c?.name || c?.displayName || "Unnamed";
const getPickerLabel = (c) =>
  c ? `${getCustomerLabel(c)}${c.customerCode ? ` (${c.customerCode})` : ""}` : "";

/* Normalise any customer list response into { data, total } */
const readCustomerResponse = (response) => {
  const body = response?.data;
  const list = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : null;
  if (!list) throw new Error(body?.message || "Invalid customer response.");

  const pg = body?.pagination || body?.meta || {};
  const total = Number(pg.total ?? pg.totalItems ?? pg.count ?? body?.total ?? list.length);

  return {
    // only customers that have a linked accounting ledger can be viewed
    data: list.filter((c) => getLedgerId(c)),
    total: Number.isFinite(total) ? total : list.length,
  };
};

/*
  Module-level so its identity never changes.
  EntitySearchPicker calls: fetchOptions({ search, page, limit, signal })
  and expects:               { data: [...], total: number }
*/
const fetchCustomerOptions = async ({ search, page, limit }) => {
  const response = await customerApi.getAll({
    page,
    limit,
    search: search || undefined,
  });
  return readCustomerResponse(response);
};
const getCustomerOptionId = (c) => getLedgerId(c);
const getCustomerOptionSubtitle = (c) =>
  [c.customerCode, c.phone || c.mobile, c.gstNo || c.gstin].filter(Boolean).join(" · ");

function Balance({ value, type, className = "" }) {
  return (
    <span className={`cl-balance ${className}`}>
      {money(value)}
      <small>{getBalanceType(value, type)}</small>
    </span>
  );
}

/* ------------------------------ page ------------------------------ */
export default function CustomerLedger() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const ledgerId = getLedgerId(selectedCustomer) || searchParams.get("ledgerId") || "";

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

  /* If opened with ?ledgerId=..., resolve that one customer (single small request) */
  useEffect(() => {
    const idFromUrl = searchParams.get("ledgerId");
    if (!idFromUrl || selectedCustomer) return undefined;

    let cancelled = false;
    customerApi
      .getAll({ page: 1, limit: 1, ledgerId: idFromUrl })
      .then((res) => {
        if (cancelled) return;
        const found = readCustomerResponse(res).data.find(
          (c) => getLedgerId(c) === idFromUrl,
        );
        if (found) setSelectedCustomer(found);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* EntitySearchPicker -> onToggle(id, option); (null, null) means "clear" */
  const handleCustomerToggle = useCallback(
    (id, option) => {
      setPage(1);
      setSearch("");

      if (!id || !option) {
        setSelectedCustomer(null);
        setSummary(null);
        setTransactions([]);
        setPagination(null);
        setLedgerError("");
        setSearchParams({}, { replace: true });
        return;
      }

      setSelectedCustomer(option);
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

      const label = getCustomerLabel(selectedCustomer);
      const s = first.data;
      const o = Number(s.openingBalance || 0);
      const c = Number(s.closingBalance || 0);

      const rows = [
        ["Customer", label],
        ["Customer Code", selectedCustomer?.customerCode || ""],
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
      a.download = `${selectedCustomer?.customerCode || ledgerId}-ledger-${startDate}-${endDate}.csv`;
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
    selectedCustomer && getCustomerLabel(selectedCustomer) !== "Unnamed"
      ? getCustomerLabel(selectedCustomer)
      : "Customer Ledger";

  /* ------------------------------ render ------------------------------ */
  return (
    <main className="cl-page">
      <header className="cl-header">
        <div className="cl-heading">
          <button type="button" className="cl-back" aria-label="Go back" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
          </button>
          <div className="cl-title">
            <h1>{title}</h1>
            <p>
              {selectedCustomer?.customerCode || ledgerId || "Select customer"} · Customer Ledger · Sundry Debtors
            </p>
          </div>
        </div>
        <div className="cl-actions">
          <button type="button" className="cl-button" onClick={exportCsv} disabled={!ready || exporting}>
            <Download size={16} /> {exporting ? "Exporting..." : "Export"}
          </button>
          <button
            type="button"
            className="cl-button cl-button-primary"
            disabled={busy || !ledgerId}
            onClick={() => setRefreshKey((c) => c + 1)}
          >
            <RefreshCw size={16} className={busy ? "cl-spin" : ""} /> Refresh
          </button>
        </div>
      </header>

      <section className="cl-picker">
        <EntitySearchPicker
          label="Customer"
          placeholder="Search customer by name, code or phone..."
          multiple={false}
          fetchOptions={fetchCustomerOptions}
          getOptionId={getCustomerOptionId}
          getOptionLabel={getPickerLabel}
          getOptionSubtitle={getCustomerOptionSubtitle}
          selectedIds={ledgerId ? [ledgerId] : undefined}
          selectedLabel={getPickerLabel(selectedCustomer)}
          onToggle={handleCustomerToggle}
          pageSize={PICKER_PAGE_SIZE}
          emptyMessage="No customers found."
        />
        {selectedCustomer && (
          <span className="cl-meta">
            {[
              selectedCustomer.customerCode,
              selectedCustomer.phone || selectedCustomer.mobile,
              selectedCustomer.gstNo || selectedCustomer.gstin,
              selectedCustomer.receivableBalance != null
                ? `Receivable ${money(selectedCustomer.receivableBalance)}`
                : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
        )}
      </section>

      {ledgerError && <div className="cl-error" role="alert">{ledgerError}</div>}

      <section className="cl-cards" aria-label="Ledger summary">
        <article className="cl-card">
          <span>Opening Balance</span>
          <strong>{ready ? money(opening) : "—"}</strong>
          <small>{ready ? getBalanceType(opening, summary.openingBalanceType) : " "}</small>
        </article>
        <article className="cl-card">
          <span>Total Debits (Due)</span>
          <strong className="cl-out">{ready ? money(totalDebit) : "—"}</strong>
          <small>{ready ? `${totalEntries} entries in period` : " "}</small>
        </article>
        <article className="cl-card">
          <span>Total Credits (Received)</span>
          <strong className="cl-in">{ready ? money(totalCredit) : "—"}</strong>
          <small>{ready ? "Receipts / advances" : " "}</small>
        </article>
        <article className="cl-card">
          <span>Closing Balance</span>
          <strong className="cl-primary-text">{ready ? money(closing) : "—"}</strong>
          <small>
            {ready
              ? `${getBalanceType(closing, summary.closingBalanceType)} · ${
                  closing > 0 ? "Receivable" : closing < 0 ? "Advance" : ""
                }`
              : " "}
          </small>
        </article>
      </section>

      <section className="cl-filters" aria-label="Ledger filters">
        <div className="cl-search">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            value={search}
            aria-label="Search transactions"
            placeholder="Filter this page: particulars, document, note..."
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="cl-date">
          <span>From</span>
          <input type="date" value={startDate} max={endDate || undefined} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label className="cl-date">
          <span>To</span>
          <input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} />
        </label>
        <div className="cl-opening-chip">
          <span>Opening Bal</span>
          {ready ? <Balance value={opening} type={summary.openingBalanceType} /> : <strong>—</strong>}
        </div>
      </section>

      {search.trim() && ready && (
        <p className="cl-search-note">
          Showing {visibleTransactions.length} of {transactions.length} entries on this page. Balances and totals
          remain for the full selected period.
        </p>
      )}

      <section className="cl-table-card" aria-label="Customer transactions" aria-busy={busy}>
        <div className="cl-table-scroll" tabIndex={0} role="region" aria-label="Scrollable customer ledger table">
          <table className="cl-table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Doc No</th>
                <th scope="col">Particulars</th>
                <th scope="col">Vch Type</th>
                <th scope="col" className="cl-number cl-out-heading">Debit</th>
                <th scope="col" className="cl-number cl-in-heading">Credit</th>
                <th scope="col" className="cl-number">Balance</th>
              </tr>
            </thead>
            <tbody>
              {ready && (
                <tr className="cl-opening-row">
                  <td colSpan={6}>{isFirstPage ? "Opening Balance" : "Brought Forward"}</td>
                  <td className="cl-number">
                    {isFirstPage ? (
                      <Balance value={opening} type={summary.openingBalanceType} />
                    ) : (
                      <Balance value={pageOpening} />
                    )}
                  </td>
                </tr>
              )}
              {busy ? (
                <tr><td colSpan={7} className="cl-empty">Loading transactions...</td></tr>
              ) : !ledgerId ? (
                <tr><td colSpan={7} className="cl-empty">Search and select a customer to view the ledger.</td></tr>
              ) : !ready ? (
                <tr><td colSpan={7} className="cl-empty">Unable to display transactions.</td></tr>
              ) : !visibleTransactions.length ? (
                <tr>
                  <td colSpan={7} className="cl-empty">
                    {search.trim() ? "No transactions match your search." : "No transactions found for this period."}
                  </td>
                </tr>
              ) : (
                visibleTransactions.map((item) => {
                  const description = getDescription(item);
                  return (
                    <tr key={item._id}>
                      <td className="cl-nowrap">{formatDate(item.date)}</td>
                      <td>
                        <strong className="cl-doc">{getDocumentNumber(item)}</strong>
                        {item.journalNumber && item.journalNumber !== getDocumentNumber(item) && (
                          <small className="cl-subtext">{item.journalNumber}</small>
                        )}
                      </td>
                      <td className="cl-particulars">
                        <span>{description}</span>
                        {item.counterAccount && item.counterAccount !== description && (
                          <small className="cl-subtext">{item.counterAccount}</small>
                        )}
                      </td>
                      <td><span className="cl-voucher">{getVoucherLabel(item)}</span></td>
                      <td className="cl-number cl-out">{Number(item.debit) ? money(item.debit) : "—"}</td>
                      <td className="cl-number cl-in">{Number(item.credit) ? money(item.credit) : "—"}</td>
                      <td className="cl-number"><Balance value={item.balance} type={item.balanceType} /></td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {ready && page >= totalPages && (
              <tfoot>
                <tr className="cl-closing-row">
                  <td colSpan={4}>Period Totals / Closing Balance</td>
                  <td className="cl-number cl-out">{money(totalDebit)}</td>
                  <td className="cl-number cl-in">{money(totalCredit)}</td>
                  <td className="cl-number">
                    <Balance value={closing} type={summary.closingBalanceType} className="cl-primary-text" />
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {ready && totalEntries > 0 && (
          <div className="cl-pagination">
            <span>Page {page} of {totalPages} · {totalEntries} entries</span>
            <div className="cl-pager">
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
        <footer className="cl-footer">
          <span>{totalEntries} entries · {startDate} to {endDate} · Sundry Debtors</span>
          <span>Debit = due from customer · Credit = receipt/advance · Dr = Receivable</span>
        </footer>
      )}
    </main>
  );
}