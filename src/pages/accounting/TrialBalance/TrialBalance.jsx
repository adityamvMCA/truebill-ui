// import { useEffect, useMemo, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import {
//   ArrowLeft,
//   Download,
//   RefreshCw,
//   Search,
// } from "lucide-react";

// import journalApi from "../../../services/modules/journalApi";
// import "./TrialBalance.css";

// const toLocalDate = (date) => {
//   const y = date.getFullYear();
//   const m = String(date.getMonth() + 1).padStart(2, "0");
//   const d = String(date.getDate()).padStart(2, "0");
//   return `${y}-${m}-${d}`;
// };

// const getToday = () => toLocalDate(new Date());

// const currencyFmt = new Intl.NumberFormat("en-IN", {
//   style: "currency",
//   currency: "INR",
//   minimumFractionDigits: 2,
//   maximumFractionDigits: 2,
// });

// const money = (value) => currencyFmt.format(Math.abs(Number(value || 0)));

// const getErrorMessage = (error) =>
//   error?.response?.data?.message || error?.message || "Unable to load trial balance.";

// const readTrialResponse = (response) => {
//   const body = response?.data;
//   if (!body?.success || !body?.data || !Array.isArray(body.rows)) {
//     throw new Error(body?.message || "Invalid trial balance response.");
//   }
//   return body;
// };

// const natureOptions = [
//   { value: "", label: "All Natures" },
//   { value: "ASSET", label: "Asset" },
//   { value: "LIABILITY", label: "Liability" },
//   { value: "INCOME", label: "Income" },
//   { value: "EXPENSE", label: "Expense" },
//   { value: "EQUITY", label: "Equity" },
// ];

// const natureChips = [
//   { value: "", label: "All" },
//   { value: "ASSET", label: "Asset" },
//   { value: "LIABILITY", label: "Liability" },
//   { value: "INCOME", label: "Income" },
//   { value: "EXPENSE", label: "Expense" },
//   { value: "EQUITY", label: "Equity" },
// ];

// const csvCell = (value) => {
//   let text = String(value ?? "");
//   if (/^\s*[=+\-@]/.test(text)) text = `'${text}`;
//   return `"${text.replace(/"/g, '""')}"`;
// };

// export default function TrialBalance() {
//   const navigate = useNavigate();

//   const [asOfDate, setAsOfDate] = useState(getToday);
//   const [search, setSearch] = useState("");
//   const [nature, setNature] = useState("");
//   const [includeZero, setIncludeZero] = useState(true);

//   const [rows, setRows] = useState([]);
//   const [totals, setTotals] = useState(null);
//   const [meta, setMeta] = useState(null);

//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const [refreshKey, setRefreshKey] = useState(0);

//   // debounced search is sent to backend
//   const [debouncedSearch, setDebouncedSearch] = useState("");
//   useEffect(() => {
//     const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
//     return () => clearTimeout(t);
//   }, [search]);

//   useEffect(() => {
//     let cancelled = false;

//     const load = async () => {
//       if (!asOfDate) {
//         setError("As of date is required.");
//         return;
//       }
//       setLoading(true);
//       setError("");
//       try {
//         const params = {
//           asOfDate,
//           includeZero: String(includeZero),
//           ...(nature ? { nature } : {}),
//           ...(debouncedSearch ? { search: debouncedSearch } : {}),
//         };

//         const res = await journalApi.getTrialBalance(params);
//         if (cancelled) return;
//         const body = readTrialResponse(res);
//         setRows(body.rows);
//         setTotals(body.data.totals);
//         setMeta(body.data);
//       } catch (err) {
//         if (!cancelled) {
//           setRows([]);
//           setTotals(null);
//           setMeta(null);
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
//   }, [asOfDate, nature, debouncedSearch, includeZero, refreshKey]);

//   const tallied = totals ? Math.abs(Number(totals.debit || 0) - Number(totals.credit || 0)) < 0.005 : false;

//   const exportCsv = () => {
//     if (!rows.length || !totals) return;
//     const headerMeta = [
//       ["Trial Balance", `As of ${asOfDate}`],
//       ["Nature Filter", nature || "All"],
//       ["Include Zero", includeZero ? "Yes" : "No"],
//       ["Search", debouncedSearch || "—"],
//       ["Totalled", tallied ? "Balanced" : "Not Balanced"],
//       [],
//     ];
//     const columns = ["Ledger Code", "Ledger Name", "Group", "Nature", "Debit (INR)", "Credit (INR)", "Balance Type"];
//     const dataRows = rows.map((r) => [
//       r.code,
//       r.name,
//       r.groupName || "",
//       r.nature || "",
//       Number(r.debit || 0).toFixed(2),
//       Number(r.credit || 0).toFixed(2),
//       r.balanceType || "",
//     ]);
//     const footer = [
//       [],
//       ["TOTALS", "", "", "", Number(totals.debit || 0).toFixed(2), Number(totals.credit || 0).toFixed(2), tallied ? "Tally OK" : "Mismatch"],
//     ];
//     const all = [...headerMeta, columns, ...dataRows, ...footer];
//     const csv = all.map((r) => r.map(csvCell).join(",")).join("\r\n");
//     const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8;" });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = `trial-balance-${asOfDate}${nature ? `-${nature}` : ""}.csv`;
//     document.body.appendChild(a);
//     a.click();
//     a.remove();
//     setTimeout(() => URL.revokeObjectURL(url), 1000);
//   };

//   const busy = loading;
//   const ready = Boolean(totals) && !busy && !error;

//   return (
//     <main className="tb-page">
//       <header className="tb-header">
//         <div className="tb-heading">
//           <button type="button" className="tb-back" aria-label="Go back" onClick={() => navigate(-1)}>
//             <ArrowLeft size={18} />
//           </button>
//           <div className="tb-title">
//             <h1>Trial Balance</h1>
//             <p>
//               As of {asOfDate} · {nature || "All ledgers"} · {meta ? `${rows.length} ledgers` : ""}
//               {totals && !tallied ? " · Not tallied" : ""}
//             </p>
//           </div>
//         </div>

//         <div className="tb-actions">
//           <button type="button" className="tb-button" onClick={exportCsv} disabled={!ready || !rows.length}>
//             <Download size={16} />
//             Export
//           </button>
//           <button
//             type="button"
//             className="tb-button tb-button-primary"
//             disabled={busy}
//             onClick={() => setRefreshKey((c) => c + 1)}
//           >
//             <RefreshCw size={16} className={busy ? "tb-spin" : ""} />
//             Refresh
//           </button>
//         </div>
//       </header>

//       {/* Summary */}
//       <section className="tb-cards" aria-label="Trial balance summary">
//         <article className={`tb-card ${ready ? (tallied ? "tally-ok" : "tally-bad") : ""}`}>
//           <span>Total Debits</span>
//           <strong className="tb-out">{ready ? money(totals.debit) : "—"}</strong>
//           <small>{ready ? (tallied ? "Tallied" : "Mismatch") : " "}</small>
//         </article>
//         <article className={`tb-card ${ready ? (tallied ? "tally-ok" : "tally-bad") : ""}`}>
//           <span>Total Credits</span>
//           <strong className="tb-in">{ready ? money(totals.credit) : "—"}</strong>
//           <small>{ready ? `${rows.length} ledgers` : " "}</small>
//         </article>
//         <article className="tb-card">
//           <span>Difference</span>
//           <strong className={tallied ? "tb-primary-text" : "tb-out"}>
//             {ready ? money(Math.abs(Number(totals.debit || 0) - Number(totals.credit || 0))) : "—"}
//           </strong>
//           <small>{ready ? (tallied ? "Balanced ✓" : "Needs review") : " "}</small>
//         </article>
//         <article className="tb-card">
//           <span>As Of</span>
//           <strong className="tb-primary-text">{ready ? asOfDate : "—"}</strong>
//           <small>{ready ? meta?.timezone || "UTC" : " "}</small>
//         </article>
//       </section>

//       {/* Filters */}
//       <section className="tb-filters" aria-label="Trial balance filters">
//         <div className="tb-search">
//           <Search size={17} aria-hidden="true" />
//           <input
//             type="search"
//             value={search}
//             aria-label="Search ledgers"
//             placeholder="Search code, name, group..."
//             onChange={(e) => setSearch(e.target.value)}
//           />
//         </div>

//         <label className="tb-date">
//           <span>As Of Date</span>
//           <input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
//         </label>

//         <label className="tb-select-wrap">
//           <span>Nature</span>
//           <select value={nature} onChange={(e) => setNature(e.target.value)}>
//             {natureOptions.map((o) => (
//               <option key={o.value} value={o.value}>
//                 {o.label}
//               </option>
//             ))}
//           </select>
//         </label>

//         <label className="tb-select-wrap">
//           <span>View</span>
//           <select
//             value={includeZero ? "all" : "nonzero"}
//             onChange={(e) => setIncludeZero(e.target.value === "all")}
//           >
//             <option value="all">All ledgers</option>
//             <option value="nonzero">Non-zero only</option>
//           </select>
//         </label>

//         <label className="tb-check" title="Include ledgers with zero balance">
//           <input type="checkbox" checked={includeZero} onChange={(e) => setIncludeZero(e.target.checked)} />
//           Zero balances
//         </label>
//       </section>

//       <div className="tb-chips" role="tablist" aria-label="Nature filter">
//         {natureChips.map((c) => (
//           <button
//             key={c.value}
//             type="button"
//             role="tab"
//             aria-selected={nature === c.value}
//             className={`tb-chip ${nature === c.value ? "is-active" : ""}`}
//             onClick={() => setNature(c.value)}
//           >
//             {c.label}
//           </button>
//         ))}
//       </div>

//       {error && (
//         <div className="tb-error" role="alert">
//           {error}
//         </div>
//       )}

//       {/* Table */}
//       <section className="tb-table-card" aria-label="Trial balance rows" aria-busy={busy}>
//         <div className="tb-table-scroll" tabIndex={0} role="region" aria-label="Scrollable trial balance table">
//           <table className="tb-table">
//             <thead>
//               <tr>
//                 <th scope="col">Code</th>
//                 <th scope="col">Ledger</th>
//                 <th scope="col">Nature</th>
//                 <th scope="col" className="tb-num tb-out-heading">
//                   Debit
//                 </th>
//                 <th scope="col" className="tb-num tb-in-heading">
//                   Credit
//                 </th>
//                 <th scope="col" className="tb-num">
//                   Balance
//                 </th>
//               </tr>
//             </thead>
//             <tbody>
//               {busy ? (
//                 <tr>
//                   <td colSpan={6} className="tb-empty">
//                     Loading trial balance...
//                   </td>
//                 </tr>
//               ) : error ? (
//                 <tr>
//                   <td colSpan={6} className="tb-empty">
//                     Unable to display trial balance.
//                   </td>
//                 </tr>
//               ) : !rows.length ? (
//                 <tr>
//                   <td colSpan={6} className="tb-empty">
//                     No ledgers match your filters.
//                   </td>
//                 </tr>
//               ) : (
//                 rows.map((r) => {
//                   const hasDebit = Number(r.debit || 0) !== 0;
//                   const hasCredit = Number(r.credit || 0) !== 0;
//                   const isZero = !hasDebit && !hasCredit;
//                   return (
//                     <tr key={r._id || r.code}>
//                       <td className="tb-code">{r.code}</td>
//                       <td className="tb-particulars">
//                         <span>{r.name}</span>
//                         {r.groupName && <small className="tb-subtext">{r.groupName}</small>}
//                       </td>
//                       <td>
//                         <span className={`tb-nature is-${r.nature}`}>{r.nature || "—"}</span>
//                       </td>
//                       <td className={`tb-number ${isZero ? "tb-zero" : ""}`}>{hasDebit ? money(r.debit) : "—"}</td>
//                       <td className={`tb-number ${isZero ? "tb-zero" : ""}`}>{hasCredit ? money(r.credit) : "—"}</td>
//                       <td className="tb-number">
//                         <span className={`tb-balance ${isZero ? "tb-zero" : ""}`}>
//                           {isZero ? "—" : money(hasDebit ? r.debit : r.credit)}
//                           {!isZero && <small>{r.balanceType}</small>}
//                         </span>
//                       </td>
//                     </tr>
//                   );
//                 })
//               )}
//             </tbody>
//             {ready && (
//               <tfoot>
//                 <tr>
//                   <td colSpan={3}>Totals</td>
//                   <td className="tb-number">{money(totals.debit)}</td>
//                   <td className="tb-number">{money(totals.credit)}</td>
//                   <td className="tb-number">
//                     <span className="tb-balance">
//                       {money(Math.abs(Number(totals.debit || 0) - Number(totals.credit || 0)))}
//                       <small>{tallied ? "Tally OK" : "Diff"}</small>
//                     </span>
//                   </td>
//                 </tr>
//               </tfoot>
//             )}
//           </table>
//         </div>
//       </section>

//       {ready && (
//         <footer className="tb-footer">
//           <span>
//             {rows.length} ledgers · As of {asOfDate} · {tallied ? "Balanced" : "Not balanced — check unposted or zero-balance entries"}
//           </span>
//           <span>Debit = Assets & Expenses · Credit = Liabilities, Income & Equity · Paise-safe totals</span>
//         </footer>
//       )}
//     </main>
//   );
// }


import { memo, useDeferredValue, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, RefreshCw, Search } from "lucide-react";

import journalApi from "../../../services/modules/journalApi";
import useReport from "../../../hooks/useReport";
import { downloadCsv } from "../../../components/common/VoucherListPage/csv";

import "./TrialBalance.css"; // your existing CSS, unchanged
import { CardsSkeleton, TableSkeletonRows } from "../../../components/common/Skeleton/ListPageSkeleton";

const toLocalDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};
const getToday = () => toLocalDate(new Date());

const currencyFmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const money = (value) => currencyFmt.format(Math.abs(Number(value || 0)));

const natureOptions = [
  { value: "", label: "All Natures" },
  { value: "ASSET", label: "Asset" },
  { value: "LIABILITY", label: "Liability" },
  { value: "INCOME", label: "Income" },
  { value: "EXPENSE", label: "Expense" },
  { value: "EQUITY", label: "Equity" },
];
const natureChips = [
  { value: "", label: "All" },
  { value: "ASSET", label: "Asset" },
  { value: "LIABILITY", label: "Liability" },
  { value: "INCOME", label: "Income" },
  { value: "EXPENSE", label: "Expense" },
  { value: "EQUITY", label: "Equity" },
];

/* ---------- API wiring (module level = stable) ---------- */
const fetchTrialBalance = (params, config) => journalApi.getTrialBalance(params, config);
const parseTrial = (response) => {
  const body = response?.data;
  if (!body?.success || !body?.data || !Array.isArray(body.rows)) {
    throw new Error(body?.message || "Invalid trial balance response.");
  }
  return { rows: body.rows, totals: body.data.totals, meta: body.data };
};

/* ---------- memoised row ---------- */
const TbRow = memo(function TbRow({ r }) {
  const hasDebit = Number(r.debit || 0) !== 0;
  const hasCredit = Number(r.credit || 0) !== 0;
  const isZero = !hasDebit && !hasCredit;
  return (
    <tr>
      <td className="tb-code">{r.code}</td>
      <td className="tb-particulars">
        <span>{r.name}</span>
        {r.groupName && <small className="tb-subtext">{r.groupName}</small>}
      </td>
      <td>
        <span className={`tb-nature is-${r.nature}`}>{r.nature || "—"}</span>
      </td>
      <td className={`tb-number ${isZero ? "tb-zero" : ""}`}>{hasDebit ? money(r.debit) : "—"}</td>
      <td className={`tb-number ${isZero ? "tb-zero" : ""}`}>{hasCredit ? money(r.credit) : "—"}</td>
      <td className="tb-number">
        <span className={`tb-balance ${isZero ? "tb-zero" : ""}`}>
          {isZero ? "—" : money(hasDebit ? r.debit : r.credit)}
          {!isZero && <small>{r.balanceType}</small>}
        </span>
      </td>
    </tr>
  );
});

export default function TrialBalance() {
  const navigate = useNavigate();

  const [asOfDate, setAsOfDate] = useState(getToday);
  const [search, setSearch] = useState("");
  const [nature, setNature] = useState("");
  const [includeZero, setIncludeZero] = useState(true);

  // ONE request per as-of date. Search / nature / zero-balance filtering
  // happens locally on the cached rows -> typing and chips are instant.
  const { data, fetching, error: loadError, refresh } = useReport({
    namespace: "trial-balance",
    fetchData: fetchTrialBalance,
    parse: parseTrial,
    params: { asOfDate },
    enabled: Boolean(asOfDate),
  });

  const error = !asOfDate ? "As of date is required." : loadError;
  const query = useDeferredValue(search).trim().toLowerCase();

  const visible = useMemo(() => {
    if (!data) return null;
    return data.rows.filter((r) => {
      if (nature && r.nature !== nature) return false;
      if (!includeZero && r.isZero) return false;
      if (!query) return true;
      return (
        (r.code || "").toLowerCase().includes(query) ||
        (r.name || "").toLowerCase().includes(query) ||
        (r.groupName || "").toLowerCase().includes(query) ||
        (r.groupCode || "").toLowerCase().includes(query)
      );
    });
  }, [data, nature, includeZero, query]);

  // totals of what is on screen (sum of integer paise = exact)
  const shown = useMemo(() => {
    if (!visible) return null;
    let debitPaise = 0;
    let creditPaise = 0;
    for (const r of visible) {
      debitPaise += Number(r.debitPaise || 0);
      creditPaise += Number(r.creditPaise || 0);
    }
    return {
      debit: debitPaise / 100,
      credit: creditPaise / 100,
      diff: Math.abs(debitPaise - creditPaise) / 100,
    };
  }, [visible]);

  // the BOOKS are tallied or not -> always judged on the full, unfiltered totals
  const tallied = data ? data.totals.debitPaise === data.totals.creditPaise : false;
  const isFiltered = Boolean(nature || query);

  const ready = Boolean(data) && !error;
  const showSkeleton = data === null && !error;
  const dim = fetching && ready ? { opacity: 0.6, transition: "opacity .15s" } : undefined;

  const exportCsv = () => {
    if (!visible?.length || !shown) return;
    downloadCsv({
      fileName: `trial-balance-${asOfDate}${nature ? `-${nature}` : ""}.csv`,
      meta: [
        ["Trial Balance", `As of ${asOfDate}`],
        ["Nature Filter", nature || "All"],
        ["Include Zero", includeZero ? "Yes" : "No"],
        ["Search", search.trim() || "—"],
        ["Totalled", tallied ? "Balanced" : "Not Balanced"],
        [],
      ],
      columns: [
        { header: "Ledger Code", value: (r) => r.code },
        { header: "Ledger Name", value: (r) => r.name },
        { header: "Group", value: (r) => r.groupName || "" },
        { header: "Nature", value: (r) => r.nature || "" },
        { header: "Debit (INR)", value: (r) => Number(r.debit || 0).toFixed(2) },
        { header: "Credit (INR)", value: (r) => Number(r.credit || 0).toFixed(2) },
        { header: "Balance Type", value: (r) => r.balanceType || "" },
      ],
      rows: visible,
      footer: [
        [],
        ["TOTALS", "", "", "", shown.debit.toFixed(2), shown.credit.toFixed(2), tallied ? "Tally OK" : "Mismatch"],
      ],
    });
  };

  return (
    <main className="tb-page">
      <header className="tb-header">
        <div className="tb-heading">
          <button type="button" className="tb-back" aria-label="Go back" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
          </button>
          <div className="tb-title">
            <h1>Trial Balance</h1>
            <p>
              As of {asOfDate} · {nature || "All ledgers"} · {visible ? `${visible.length} ledgers` : "…"}
              {data && !tallied ? " · Not tallied" : ""}
            </p>
          </div>
        </div>

        <div className="tb-actions">
          <button type="button" className="tb-button" onClick={exportCsv} disabled={!ready || !visible?.length}>
            <Download size={16} />
            Export
          </button>
          <button type="button" className="tb-button tb-button-primary" disabled={fetching} onClick={refresh}>
            <RefreshCw size={16} className={fetching ? "tb-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      {/* Summary */}
      <section className="tb-cards" aria-label="Trial balance summary" aria-busy={showSkeleton}>
        {showSkeleton ? (
          <CardsSkeleton count={4} className="tb-card" />
        ) : (
          <>
            <article className={`tb-card ${ready ? (tallied ? "tally-ok" : "tally-bad") : ""}`} style={dim}>
              <span>Total Debits</span>
              <strong className="tb-out">{ready ? money(shown.debit) : "—"}</strong>
              <small>{ready ? (isFiltered ? "Filtered view" : tallied ? "Tallied" : "Mismatch") : " "}</small>
            </article>
            <article className={`tb-card ${ready ? (tallied ? "tally-ok" : "tally-bad") : ""}`} style={dim}>
              <span>Total Credits</span>
              <strong className="tb-in">{ready ? money(shown.credit) : "—"}</strong>
              <small>{ready ? `${visible.length} ledgers` : " "}</small>
            </article>
            <article className="tb-card" style={dim}>
              <span>Difference</span>
              <strong className={!isFiltered && tallied ? "tb-primary-text" : "tb-out"}>
                {ready ? money(shown.diff) : "—"}
              </strong>
              <small>{ready ? (isFiltered ? "Filtered view" : tallied ? "Balanced ✓" : "Needs review") : " "}</small>
            </article>
            <article className="tb-card" style={dim}>
              <span>As Of</span>
              <strong className="tb-primary-text">{ready ? asOfDate : "—"}</strong>
              <small>{ready ? data.meta?.timezone || "UTC" : " "}</small>
            </article>
          </>
        )}
      </section>

      {/* Filters */}
      <section className="tb-filters" aria-label="Trial balance filters">
        <div className="tb-search">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            value={search}
            aria-label="Search ledgers"
            placeholder="Search code, name, group..."
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <label className="tb-date">
          <span>As Of Date</span>
          <input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
        </label>

        <label className="tb-select-wrap">
          <span>Nature</span>
          <select value={nature} onChange={(e) => setNature(e.target.value)}>
            {natureOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="tb-select-wrap">
          <span>View</span>
          <select value={includeZero ? "all" : "nonzero"} onChange={(e) => setIncludeZero(e.target.value === "all")}>
            <option value="all">All ledgers</option>
            <option value="nonzero">Non-zero only</option>
          </select>
        </label>

        <label className="tb-check" title="Include ledgers with zero balance">
          <input type="checkbox" checked={includeZero} onChange={(e) => setIncludeZero(e.target.checked)} />
          Zero balances
        </label>
      </section>

      <div className="tb-chips" role="tablist" aria-label="Nature filter">
        {natureChips.map((c) => (
          <button
            key={c.value}
            type="button"
            role="tab"
            aria-selected={nature === c.value}
            className={`tb-chip ${nature === c.value ? "is-active" : ""}`}
            onClick={() => setNature(c.value)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="tb-error" role="alert">
          {error}
        </div>
      )}

      {/* Table */}
      <section className="tb-table-card" aria-label="Trial balance rows" aria-busy={showSkeleton}>
        <div className="tb-table-scroll" tabIndex={0} role="region" aria-label="Scrollable trial balance table">
          <table className="tb-table">
            <thead>
              <tr>
                <th scope="col">Code</th>
                <th scope="col">Ledger</th>
                <th scope="col">Nature</th>
                <th scope="col" className="tb-num tb-out-heading">
                  Debit
                </th>
                <th scope="col" className="tb-num tb-in-heading">
                  Credit
                </th>
                <th scope="col" className="tb-num">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody style={dim}>
              {showSkeleton ? (
                <TableSkeletonRows columns={6} rows={12} />
              ) : error ? (
                <tr>
                  <td colSpan={6} className="tb-empty">
                    Unable to display trial balance.
                  </td>
                </tr>
              ) : !visible.length ? (
                <tr>
                  <td colSpan={6} className="tb-empty">
                    No ledgers match your filters.
                  </td>
                </tr>
              ) : (
                visible.map((r) => <TbRow key={r._id || r.code} r={r} />)
              )}
            </tbody>
            {ready && visible.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={3}>Totals</td>
                  <td className="tb-number">{money(shown.debit)}</td>
                  <td className="tb-number">{money(shown.credit)}</td>
                  <td className="tb-number">
                    <span className="tb-balance">
                      {money(shown.diff)}
                      <small>{isFiltered ? "Filtered" : tallied ? "Tally OK" : "Diff"}</small>
                    </span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {ready && (
        <footer className="tb-footer">
          <span>
            {visible.length} ledgers · As of {asOfDate} ·{" "}
            {tallied ? "Balanced" : "Not balanced — check unposted or zero-balance entries"}
          </span>
          <span>Debit = Assets & Expenses · Credit = Liabilities, Income & Equity · Paise-safe totals</span>
        </footer>
      )}
    </main>
  );
}