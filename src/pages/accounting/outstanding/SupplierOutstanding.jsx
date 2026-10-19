import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, RefreshCw, Search } from "lucide-react";
import journalApi from "../../../services/modules/journalApi";
import "./SupplierOutstanding.css";

const toLocalDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const getToday = () => toLocalDate(new Date());
const currencyFmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = (v) => currencyFmt.format(Math.abs(Number(v || 0)));
const getErrorMessage = (e) => e?.response?.data?.message || e?.message || "Unable to load supplier outstanding.";
const csvCell = (v) => {
  let t = String(v ?? "");
  if (/^\s*[=+\-@]/.test(t)) t = `'${t}`;
  return `"${t.replace(/"/g, '""')}"`;
};

export default function SupplierOutstanding() {
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
  useEffect(() => { const t = setTimeout(() => setDebouncedSearch(search.trim()), 400); return () => clearTimeout(t); }, [search]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!asOfDate) return;
      setLoading(true);
      setError("");
      try {
        const res = await journalApi.getSupplierOutstanding({ asOfDate: asOfDate.trim() || getToday() });
        if (cancelled) return;
        const body = res?.data;
        if (!body?.success || !body?.data) throw new Error(body?.message || "Invalid response.");
        setData(body.data);
      } catch (err) {
        if (!cancelled) { setData(null); setError(getErrorMessage(err)); }
      } finally { if (!cancelled) setLoading(false); }
    };
    void load();
    return () => { cancelled = true; };
  }, [asOfDate, refreshKey]);

  const rows = useMemo(() => {
    if (!data?.rows) return [];
    let list = [...data.rows];
    if (!showZero) list = list.filter((r) => Math.abs(Number(r.balance || r.amount || 0)) > 0.005);
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter((r) => [r.code, r.name, r.supplierCode, r.supplierName, r.groupName].filter(Boolean).join(" ").toLowerCase().includes(q));
    }
    if (sortBy === "amount_desc") list.sort((a, b) => Math.abs(Number(b.balance || 0)) - Math.abs(Number(a.balance || 0)));
    if (sortBy === "amount_asc") list.sort((a, b) => Math.abs(Number(a.balance || 0)) - Math.abs(Number(b.balance || 0)));
    if (sortBy === "name_asc") list.sort((a, b) => String(a.name || a.supplierName || "").localeCompare(String(b.name || "")));
    return list;
  }, [data, showZero, debouncedSearch, sortBy]);

  const totals = useMemo(() => {
    if (!data?.totals) return null;
    if (rows.length !== (data.rows || []).length || !showZero) {
      // Supplier balance is negative for payable (Cr). We store payable as -balance.
      // For supplier: negative = payable, positive = advance
      const payable = rows.filter((r) => Number(r.balance || 0) < 0).reduce((a, r) => a + Math.abs(Number(r.balance || 0)), 0);
      const advance = rows.filter((r) => Number(r.balance || 0) > 0).reduce((a, r) => a + Number(r.balance || 0), 0);
      const netPayable = payable - advance; // positive = net payable
      return { totalPayable: payable, totalAdvance: advance, netPayable, count: rows.length };
    }
    return data.totals;
  }, [data, rows, showZero]);

  const ready = Boolean(data) && !loading && !error;
  const busy = loading;

  const exportCsv = () => {
    if (!rows.length || !totals) return;
    const meta = [
      ["Supplier Outstanding", `As of ${asOfDate}`],
      ["Search", debouncedSearch || "—"],
      ["Total Payable", Number(totals.totalPayable || 0).toFixed(2)],
      ["Total Advance", Number(totals.totalAdvance || 0).toFixed(2)],
      ["Net Payable", Number(totals.netPayable || 0).toFixed(2)],
      [],
    ];
    const cols = ["Supplier Code", "Supplier Name", "Ledger Code", "Group", "Payable (INR)", "Advance (INR)", "Net Balance (INR) [negative=payable]"];
    const body = rows.map((r) => {
      const bal = Number(r.balance || 0);
      return [
        r.supplierCode || r.code || "",
        r.supplierName || r.name || "",
        r.code || "",
        r.groupName || "",
        Number(bal < 0 ? Math.abs(bal) : 0).toFixed(2),
        Number(bal > 0 ? bal : 0).toFixed(2),
        Number(bal).toFixed(2),
      ];
    });
    const foot = [[], ["TOTALS", "", "", "", Number(totals.totalPayable || 0).toFixed(2), Number(totals.totalAdvance || 0).toFixed(2), Number(totals.netPayable || 0).toFixed(2)]];
    const all = [...meta, cols, ...body, ...foot];
    const csv = all.map((r) => r.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `supplier-outstanding-${asOfDate}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleRowClick = (r) => {
    const ledgerId = r.ledgerId || r._id || r.code;
    if (ledgerId) navigate(`/accounting/supplier-ledger?ledgerId=${encodeURIComponent(ledgerId)}`);
  };

  return (
    <main className="so-page">
      <header className="so-header">
        <div className="so-heading">
          <button type="button" className="so-back" aria-label="Go back" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
          <div className="so-title">
            <h1>Supplier Outstanding</h1>
            <p>Payables as of {asOfDate} · Sundry Creditors · {ready ? `${rows.length} suppliers` : ""}</p>
          </div>
        </div>
        <div className="so-actions">
          <button type="button" className="so-button" onClick={exportCsv} disabled={!ready || !rows.length}><Download size={16} /> Export</button>
          <button type="button" className="so-button so-button-primary" disabled={busy} onClick={() => setRefreshKey((c) => c + 1)}><RefreshCw size={16} className={busy ? "so-spin" : ""} /> Refresh</button>
        </div>
      </header>

      <section className="so-cards" aria-label="Supplier outstanding summary">
        <article className="so-card">
          <span>Total Payable (Cr)</span>
          <strong style={{ color: "var(--so-danger)" }}>{ready ? money(totals.totalPayable) : "—"}</strong>
          <small>{ready ? `${rows.filter((r) => Number(r.balance) < 0).length} suppliers due` : " "}</small>
        </article>
        <article className="so-card">
          <span>Total Advance (Dr)</span>
          <strong style={{ color: "var(--so-success)" }}>{ready ? money(totals.totalAdvance) : "—"}</strong>
          <small>{ready ? `${rows.filter((r) => Number(r.balance) > 0).length} advances paid` : " "}</small>
        </article>
        <article className="so-card">
          <span>Net Payable</span>
          <strong style={{ color: "var(--so-primary)" }}>{ready ? money(totals.netPayable) : "—"}</strong>
          <small>{ready ? (Number(totals.netPayable || 0) >= 0 ? "You owe" : "Net advance with suppliers") : " "}</small>
        </article>
        <article className="so-card">
          <span>As Of</span>
          <strong>{ready ? asOfDate : "—"}</strong>
          <small>{ready ? data?.timezone || "UTC" : " "} · Click row → ledger</small>
        </article>
      </section>

      <section className="so-filters" aria-label="Outstanding filters">
        <div className="so-search">
          <Search size={17} aria-hidden="true" />
          <input type="search" value={search} aria-label="Search suppliers" placeholder="Search code, name, group..." onChange={(e) => setSearch(e.target.value)} />
        </div>
        <label className="so-date">
          <span>As Of Date</span>
          <input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
        </label>
        <label className="so-select">
          <span>Sort</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="amount_desc">Highest Due First</option>
            <option value="amount_asc">Lowest Due First</option>
            <option value="name_asc">Name A → Z</option>
          </select>
        </label>
        <label className="so-check">
          <input type="checkbox" checked={showZero} onChange={(e) => setShowZero(e.target.checked)} /> Zero balances
        </label>
      </section>

      {error && <div className="so-error" role="alert">{error}</div>}

      <section className="so-table-card" aria-label="Supplier outstanding list" aria-busy={busy}>
        <div className="so-table-scroll" tabIndex={0} role="region" aria-label="Scrollable table">
          <table className="so-table">
            <thead>
              <tr>
                <th scope="col">Supplier</th>
                <th scope="col">Group</th>
                <th scope="col" className="so-num">Payable</th>
                <th scope="col" className="so-num">Advance</th>
                <th scope="col" className="so-num">Net Balance</th>
              </tr>
            </thead>
            <tbody>
              {busy ? (
                <tr><td colSpan={5} className="so-empty">Loading supplier outstanding...</td></tr>
              ) : error ? (
                <tr><td colSpan={5} className="so-empty">Unable to display outstanding.</td></tr>
              ) : !rows.length ? (
                <tr><td colSpan={5} className="so-empty">{search.trim() ? "No suppliers match your search." : "No outstanding as of this date."}</td></tr>
              ) : (
                rows.map((r) => {
                  const bal = Number(r.balance || r.amount || 0);
                  const isPayable = bal < 0;
                  const isAdv = bal > 0;
                  return (
                    <tr key={r.ledgerId || r._id || r.code} onClick={() => handleRowClick(r)} style={{ cursor: "pointer" }}>
                      <td>
                        <span className="so-link">{r.supplierName || r.name}</span>
                        <span className="so-sub">{r.supplierCode || r.code} · {r.phone || r.mobile || ""}</span>
                      </td>
                      <td><span className="so-badge">{r.groupName || r.groupCode || "Sundry Creditors"}</span></td>
                      <td className="so-number" style={{ color: isPayable ? "var(--so-danger)" : "var(--so-muted)" }}>{isPayable ? money(bal) : "—"}</td>
                      <td className="so-number" style={{ color: isAdv ? "var(--so-success)" : "var(--so-muted)" }}>{isAdv ? money(bal) : "—"}</td>
                      <td className="so-number">
                        <span className={`so-badge ${isAdv ? "adv" : isPayable ? "due" : ""}`} style={{ borderRadius: 6 }}>
                          {bal === 0 ? "—" : `${money(bal)} ${bal < 0 ? "Cr" : "Dr"}`}
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
                  <td colSpan={2}>Totals ({rows.length} suppliers)</td>
                  <td className="so-number">{money(totals.totalPayable)}</td>
                  <td className="so-number">{money(totals.totalAdvance)}</td>
                  <td className="so-number">{money(totals.netPayable)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {ready && <footer className="so-footer"><span>{rows.length} suppliers · As of {asOfDate} · Cr = Payable · Dr = Advance paid · Click row to open ledger</span><span>Sundry Creditors · {data?.timezone || "UTC"}</span></footer>}
    </main>
  );
}
