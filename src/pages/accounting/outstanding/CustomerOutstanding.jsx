import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, RefreshCw, Search } from "lucide-react";
import journalApi from "../../../services/modules/journalApi";
import "./CustomerOutstanding.css";

const toLocalDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const getToday = () => toLocalDate(new Date());

const currencyFmt = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const money = (v) => currencyFmt.format(Math.abs(Number(v || 0)));
const getErrorMessage = (e) =>
  e?.response?.data?.message ||
  e?.message ||
  "Unable to load customer outstanding.";

const csvCell = (v) => {
  let t = String(v ?? "");
  if (/^\s*[=+\-@]/.test(t)) t = `'${t}`;
  return `"${t.replace(/"/g, '""')}"`;
};

export default function CustomerOutstanding() {
  const navigate = useNavigate();

  const [asOfDate, setAsOfDate] = useState(getToday);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("amount_desc");
  const [showZero, setShowZero] = useState(false);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!asOfDate) return;
      setLoading(true);
      setError("");
      try {
        const res = await journalApi.getCustomerOutstanding({
          asOfDate: asOfDate.trim() || getToday(),
          search: debouncedSearch || undefined,
          // showZero and sort handled client-side for instant UX; backend returns all
        });
        if (cancelled) return;
        const body = res?.data;
        if (!body?.success || !body?.data)
          throw new Error(body?.message || "Invalid response.");
        setData(body.data);
      } catch (err) {
        if (!cancelled) {
          setData(null);
          setError(getErrorMessage(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [asOfDate, debouncedSearch, refreshKey]);

  const rows = useMemo(() => {
    if (!data?.rows) return [];
    let list = [...data.rows];
    if (!showZero)
      list = list.filter(
        (r) => Math.abs(Number(r.balance || r.amount || 0)) > 0.005,
      );
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter((r) =>
        [r.code, r.name, r.customerCode, r.customerName, r.groupName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }
    if (sortBy === "amount_desc")
      list.sort(
        (a, b) =>
          Math.abs(Number(b.balance || 0)) - Math.abs(Number(a.balance || 0)),
      );
    if (sortBy === "amount_asc")
      list.sort(
        (a, b) =>
          Math.abs(Number(a.balance || 0)) - Math.abs(Number(b.balance || 0)),
      );
    if (sortBy === "name_asc")
      list.sort((a, b) =>
        String(a.name || a.customerName || "").localeCompare(
          String(b.name || ""),
        ),
      );
    if (sortBy === "days_desc")
      list.sort(
        (a, b) =>
          Number(b.overdueDays || b.daysDue || 0) - Number(a.overdueDays || 0),
      );
    return list;
  }, [data, showZero, debouncedSearch, sortBy]);

  const totals = useMemo(() => {
    if (!data?.totals) return null;
    // Recompute visible totals if filtered
    if (rows.length !== (data.rows || []).length || !showZero) {
      const sum = rows.reduce(
        (acc, r) => acc + Number(r.balance || r.amount || 0),
        0,
      );
      const receivable = rows
        .filter((r) => Number(r.balance || 0) > 0)
        .reduce((a, r) => a + Number(r.balance || 0), 0);
      const advance = rows
        .filter((r) => Number(r.balance || 0) < 0)
        .reduce((a, r) => a + Math.abs(Number(r.balance || 0)), 0);
      return {
        totalReceivable: receivable,
        totalAdvance: advance,
        netReceivable: sum,
        count: rows.length,
      };
    }
    return data.totals;
  }, [data, rows, showZero]);

  const ready = Boolean(data) && !loading && !error;
  const busy = loading;

  const exportCsv = () => {
    if (!rows.length || !totals) return;
    const meta = [
      ["Customer Outstanding", `As of ${asOfDate}`],
      ["Search", debouncedSearch || "—"],
      ["Total Receivable", Number(totals.totalReceivable || 0).toFixed(2)],
      ["Total Advance", Number(totals.totalAdvance || 0).toFixed(2)],
      ["Net Receivable", Number(totals.netReceivable || 0).toFixed(2)],
      [],
    ];
    const cols = [
      "Customer Code",
      "Customer Name",
      "Ledger Code",
      "Group",
      "Receivable (INR)",
      "Advance (INR)",
      "Net Balance (INR)",
      "Due Days",
    ];
    const body = rows.map((r) => [
      r.customerCode || r.code || "",
      r.customerName || r.name || "",
      r.code || "",
      r.groupName || "",
      Number(r.balance > 0 ? r.balance : 0).toFixed(2),
      Number(r.balance < 0 ? Math.abs(r.balance) : 0).toFixed(2),
      Number(r.balance || 0).toFixed(2),
      String(r.overdueDays ?? r.daysDue ?? ""),
    ]);
    const foot = [
      [],
      [
        "TOTALS",
        "",
        "",
        "",
        Number(totals.totalReceivable || 0).toFixed(2),
        Number(totals.totalAdvance || 0).toFixed(2),
        Number(totals.netReceivable || 0).toFixed(2),
        "",
      ],
    ];
    const all = [...meta, cols, ...body, ...foot];
    const csv = all.map((r) => r.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customer-outstanding-${asOfDate}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleRowClick = (r) => {
    const ledgerId = r.ledgerId || r._id || r.code;
    if (ledgerId)
      navigate(
        `/accounting/customer-ledger?ledgerId=${encodeURIComponent(ledgerId)}`,
      );
  };

  return (
    <main className="co-page">
      <header className="co-header">
        <div className="co-heading">
          <button
            type="button"
            className="co-back"
            aria-label="Go back"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={18} />
          </button>
          <div className="co-title">
            <h1>Customer Outstanding</h1>
            <p>
              Receivables as of {asOfDate} · Sundry Debtors ·{" "}
              {ready ? `${rows.length} customers` : ""}
            </p>
          </div>
        </div>
        <div className="co-actions">
          <button
            type="button"
            className="co-button"
            onClick={exportCsv}
            disabled={!ready || !rows.length}
          >
            <Download size={16} /> Export
          </button>
          <button
            type="button"
            className="co-button co-button-primary"
            disabled={busy}
            onClick={() => setRefreshKey((c) => c + 1)}
          >
            <RefreshCw size={16} className={busy ? "co-spin" : ""} /> Refresh
          </button>
        </div>
      </header>

      <section className="co-cards" aria-label="Customer outstanding summary">
        <article className="co-card">
          <span>Total Receivable (Dr)</span>
          <strong style={{ color: "var(--co-danger)" }}>
            {ready ? money(totals.totalReceivable) : "—"}
          </strong>
          <small>
            {ready
              ? `${rows.filter((r) => Number(r.balance) > 0).length} customers owe`
              : " "}
          </small>
        </article>
        <article className="co-card">
          <span>Total Advance (Cr)</span>
          <strong style={{ color: "var(--co-success)" }}>
            {ready ? money(totals.totalAdvance) : "—"}
          </strong>
          <small>
            {ready
              ? `${rows.filter((r) => Number(r.balance) < 0).length} advances`
              : " "}
          </small>
        </article>
        <article className="co-card">
          <span>Net Receivable</span>
          <strong style={{ color: "var(--co-primary)" }}>
            {ready ? money(totals.netReceivable) : "—"}
          </strong>
          <small>
            {ready
              ? Number(totals.netReceivable || 0) >= 0
                ? "Due to you"
                : "Net advance held"
              : " "}
          </small>
        </article>
        <article className="co-card">
          <span>As Of</span>
          <strong>{ready ? asOfDate : "—"}</strong>
          <small>
            {ready ? data?.timezone || "UTC" : " "} · Click row → ledger
          </small>
        </article>
      </section>

      <section className="co-filters" aria-label="Outstanding filters">
        <div className="co-search">
          <Search size={17} aria-hidden="true" />
          <input
            type="search"
            value={search}
            aria-label="Search customers"
            placeholder="Search code, name, group..."
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="co-date">
          <span>As Of Date</span>
          <input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
          />
        </label>
        <label className="co-select">
          <span>Sort</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="amount_desc">Highest Due First</option>
            <option value="amount_asc">Lowest Due First</option>
            <option value="name_asc">Name A → Z</option>
            <option value="days_desc">Overdue Days</option>
          </select>
        </label>
        <label className="co-check">
          <input
            type="checkbox"
            checked={showZero}
            onChange={(e) => setShowZero(e.target.checked)}
          />{" "}
          Zero balances
        </label>
      </section>

      {error && (
        <div className="co-error" role="alert">
          {error}
        </div>
      )}

      <section
        className="co-table-card"
        aria-label="Customer outstanding list"
        aria-busy={busy}
      >
        <div
          className="co-table-scroll"
          tabIndex={0}
          role="region"
          aria-label="Scrollable table"
        >
          <table className="co-table">
            <thead>
              <tr>
                <th scope="col">Customer</th>
                <th scope="col">Group</th>
                <th scope="col" className="co-num">
                  Receivable
                </th>
                <th scope="col" className="co-num">
                  Advance
                </th>
                <th scope="col" className="co-num">
                  Net Balance
                </th>
              </tr>
            </thead>
            <tbody>
              {busy ? (
                <tr>
                  <td colSpan={5} className="co-empty">
                    Loading customer outstanding...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="co-empty">
                    Unable to display outstanding.
                  </td>
                </tr>
              ) : !rows.length ? (
                <tr>
                  <td colSpan={5} className="co-empty">
                    {search.trim()
                      ? "No customers match your search."
                      : "No outstanding as of this date."}
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const bal = Number(r.balance || r.amount || 0);
                  const isAdv = bal < 0;
                  const isDue = bal > 0;
                  return (
                    <tr
                      key={r.ledgerId || r._id || r.code}
                      onClick={() => handleRowClick(r)}
                      style={{ cursor: "pointer" }}
                    >
                      <td>
                        <span className="co-link">
                          {r.customerName || r.name}
                        </span>
                        <span className="co-sub">
                          {r.customerCode || r.code} ·{" "}
                          {r.phone || r.mobile || ""}
                        </span>
                      </td>
                      <td>
                        <span className="co-badge">
                          {r.groupName || r.groupCode || "Sundry Debtors"}
                        </span>
                      </td>
                      <td
                        className="co-number"
                        style={{
                          color: isDue ? "var(--co-danger)" : "var(--co-muted)",
                        }}
                      >
                        {isDue ? money(bal) : "—"}
                      </td>
                      <td
                        className="co-number"
                        style={{
                          color: isAdv
                            ? "var(--co-success)"
                            : "var(--co-muted)",
                        }}
                      >
                        {isAdv ? money(bal) : "—"}
                      </td>
                      <td className="co-number">
                        <span
                          className={`co-badge ${isAdv ? "adv" : isDue ? "due" : ""}`}
                          style={{ borderRadius: 6 }}
                        >
                          {bal === 0
                            ? "—"
                            : `${money(bal)} ${bal > 0 ? "Dr" : "Cr"}`}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {ready && (
              <tfoot>
                <tr>
                  <td colSpan={2}>Totals ({rows.length} customers)</td>
                  <td className="co-number">{money(totals.totalReceivable)}</td>
                  <td className="co-number">{money(totals.totalAdvance)}</td>
                  <td className="co-number">{money(totals.netReceivable)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {ready && (
        <footer className="co-footer">
          <span>
            {rows.length} customers · As of {asOfDate} · Dr = Receivable · Cr =
            Advance · Click row to open ledger
          </span>
          <span>Sundry Debtors · {data?.timezone || "UTC"}</span>
        </footer>
      )}
    </main>
  );
}
