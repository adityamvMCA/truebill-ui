import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, RefreshCw, Search } from "lucide-react";
import journalApi from "../../../services/modules/journalApi";
import "./BalanceSheet.css";

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
const money = (v) => currencyFmt.format(Math.abs(Number(v || 0)));
const getErrorMessage = (e) => e?.response?.data?.message || e?.message || "Unable to load balance sheet.";
const readBS = (res) => {
  const b = res?.data;
  if (!b?.success || !b?.data) throw new Error(b?.message || "Invalid balance sheet response.");
  return b;
};
const csvCell = (v) => {
  let t = String(v ?? "");
  if (/^\s*[=+\-@]/.test(t)) t = `'${t}`;
  return `"${t.replace(/"/g, '""')}"`;
};

export default function BalanceSheet() {
  const navigate = useNavigate();
  const [asOfDate, setAsOfDate] = useState(getToday);
  const [search, setSearch] = useState("");
  const [includeZero, setIncludeZero] = useState(false);

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
        const params = {
          asOfDate: asOfDate.trim() || getToday(),
          includeZero: String(includeZero),
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
        };
        const res = await journalApi.getBalanceSheet(params);
        if (cancelled) return;
        const body = readBS(res);
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
    return () => { cancelled = true; };
  }, [asOfDate, debouncedSearch, includeZero, refreshKey]);

  const tallied = data ? Math.abs(Number(data.totals.assets || 0) - Number(data.totals.liabilitiesPlusEquity || 0)) < 0.005 : false;

  const exportCsv = () => {
    if (!data) return;
    const meta = [
      ["Balance Sheet", `As of ${data.asOfDate}`],
      ["Search", debouncedSearch || "—"],
      ["Include Zero", includeZero ? "Yes" : "No"],
      [],
    ];
    const header = ["Side", "Ledger Code", "Ledger Name", "Group", "Amount (INR)"];

    const liabilityRows = (data.liabilities || []).map((r) => ["Liabilities", r.code, r.name, r.groupName || "", Number(r.amount || 0).toFixed(2)]);
    const equityRows = (data.equity || []).map((r) => ["Equity", r.code, r.name, r.groupName || "", Number(r.amount || 0).toFixed(2)]);
    const assetRows = (data.assets || []).map((r) => ["Assets", r.code, r.name, r.groupName || "", Number(r.amount || 0).toFixed(2)]);

    const totals = [
      [],
      ["Total Liabilities", "", "", "", Number(data.totals.liabilities || 0).toFixed(2)],
      ["Total Equity", "", "", "", Number(data.totals.equity || 0).toFixed(2)],
      ["Profit / (Loss) for period", "", "", "", Number(data.profitAndLoss?.netProfit || 0).toFixed(2)],
      ["Total Liabilities + Equity", "", "", "", Number(data.totals.liabilitiesPlusEquity || 0).toFixed(2)],
      ["Total Assets", "", "", "", Number(data.totals.assets || 0).toFixed(2)],
      ["Difference", "", "", "", Number(Math.abs(Number(data.totals.assets || 0) - Number(data.totals.liabilitiesPlusEquity || 0))).toFixed(2)],
      ["Tallied", tallied ? "Yes" : "No"],
    ];

    const all = [...meta, header, ...liabilityRows, ...equityRows, ...assetRows, ...totals];
    const csv = all.map((r) => r.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `balance-sheet-${data.asOfDate}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const busy = loading;
  const ready = Boolean(data) && !busy && !error;

  return (
    <main className="bs-page">
      <header className="bs-header">
        <div className="bs-heading">
          <button type="button" className="bs-back" aria-label="Go back" onClick={() => navigate(-1)}>
            <ArrowLeft size={18} />
          </button>
          <div className="bs-title">
            <h1>Balance Sheet</h1>
            <p>As of {asOfDate} · {tallied ? "Tallied" : data ? "Not tallied" : ""}</p>
          </div>
        </div>
        <div className="bs-actions">
          <button type="button" className="bs-button" onClick={exportCsv} disabled={!ready}>
            <Download size={16} /> Export
          </button>
          <button type="button" className="bs-button bs-button-primary" disabled={busy} onClick={() => setRefreshKey((c) => c + 1)}>
            <RefreshCw size={16} className={busy ? "bs-spin" : ""} /> Refresh
          </button>
        </div>
      </header>

      <section className="bs-cards" aria-label="Balance sheet summary">
        <article className={`bs-card ${ready ? (tallied ? "ok" : "bad") : ""}`}>
          <span>Total Assets</span>
          <strong>{ready ? money(data.totals.assets) : "—"}</strong>
          <small>{ready ? `${(data.assets || []).length} ledgers` : " "}</small>
        </article>
        <article className={`bs-card ${ready ? (tallied ? "ok" : "bad") : ""}`}>
          <span>Total Liabilities</span>
          <strong>{ready ? money(data.totals.liabilities) : "—"}</strong>
          <small>{ready ? `${(data.liabilities || []).length} ledgers` : " "}</small>
        </article>
        <article className={`bs-card ${ready ? (tallied ? "ok" : "bad") : ""}`}>
          <span>Equity + P&amp;L</span>
          <strong>{ready ? money(Number(data.totals.equity || 0) + Number(data.profitAndLoss?.netProfit || 0)) : "—"}</strong>
          <small>{ready ? `Equity ${money(data.totals.equity)} · P&L ${money(data.profitAndLoss?.netProfit || 0)}` : " "}</small>
        </article>
        <article className={`bs-card ${ready ? (tallied ? "ok" : "bad") : ""}`}>
          <span>{tallied ? "Tallied" : "Difference"}</span>
          <strong>{ready ? (tallied ? "Balanced ✓" : money(Math.abs(Number(data.totals.assets || 0) - Number(data.totals.liabilitiesPlusEquity || 0)))) : "—"}</strong>
          <small>{ready ? (tallied ? "Assets = Liabilities + Equity" : "Needs review") : " "}</small>
        </article>
      </section>

      <section className="bs-filters" aria-label="Balance sheet filters">
        <div className="bs-search">
          <Search size={17} aria-hidden="true" />
          <input type="search" value={search} aria-label="Search ledgers" placeholder="Search code, name, group..." onChange={(e) => setSearch(e.target.value)} />
        </div>
        <label className="bs-date">
          <span>As Of Date</span>
          <input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
        </label>
        <label className="bs-check" title="Show zero-balance ledgers">
          <input type="checkbox" checked={includeZero} onChange={(e) => setIncludeZero(e.target.checked)} />
          Zero balances
        </label>
      </section>

      {error && <div className="bs-error" role="alert">{error}</div>}

      {ready ? (
        <section className="bs-grid" aria-label="Balance sheet tables">
          {/* Liabilities + Equity */}
          <div className="bs-panel">
            <div className="bs-panel-head">
              <h2>Liabilities & Equity</h2>
              <strong>{money(data.totals.liabilitiesPlusEquity)}</strong>
            </div>
            <table className="bs-table">
              <thead>
                <tr>
                  <th>Ledger</th>
                  <th className="bs-num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(data.liabilities || []).map((r) => (
                  <tr key={r._id || r.code}>
                    <td>
                      <span className="bs-ledger">{r.name}</span>
                      <span className="bs-sub">{r.code} · {r.groupName || r.groupCode}</span>
                    </td>
                    <td className="bs-num">{money(r.amount)}</td>
                  </tr>
                ))}
                {(data.equity || []).map((r) => (
                  <tr key={r._id || r.code}>
                    <td>
                      <span className="bs-ledger">{r.name}</span>
                      <span className="bs-sub">{r.code} · {r.groupName || r.groupCode}</span>
                    </td>
                    <td className="bs-num">{money(r.amount)}</td>
                  </tr>
                ))}
                <tr className="bs-profit-row">
                  <td>
                    <span className="bs-ledger">Profit & Loss {Number(data.profitAndLoss?.netProfit || 0) >= 0 ? "(Profit)" : "(Loss)"}</span>
                    <span className="bs-sub">Transferred from income & expenses</span>
                  </td>
                  <td className="bs-num">{money(data.profitAndLoss?.netProfit || 0)}</td>
                </tr>
                {!data.liabilities?.length && !data.equity?.length && (
                  <tr><td colSpan={2} className="bs-empty">No liabilities or equity balances as of this date.</td></tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bs-total-row">
                  <td>Total Liabilities + Equity</td>
                  <td className="bs-num">{money(data.totals.liabilitiesPlusEquity)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Assets */}
          <div className="bs-panel">
            <div className="bs-panel-head">
              <h2>Assets</h2>
              <strong>{money(data.totals.assets)}</strong>
            </div>
            <table className="bs-table">
              <thead>
                <tr>
                  <th>Ledger</th>
                  <th className="bs-num">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(data.assets || []).map((r) => (
                  <tr key={r._id || r.code}>
                    <td>
                      <span className="bs-ledger">{r.name}</span>
                      <span className="bs-sub">{r.code} · {r.groupName || r.groupCode}</span>
                    </td>
                    <td className="bs-num">{money(r.amount)}</td>
                  </tr>
                ))}
                {!data.assets?.length && (
                  <tr><td colSpan={2} className="bs-empty">No asset balances as of this date.</td></tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bs-total-row">
                  <td>Total Assets</td>
                  <td className="bs-num">{money(data.totals.assets)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      ) : (
        <section className="bs-panel" aria-busy={busy}>
          <div style={{ padding: 32, textAlign: "center", color: "var(--bs-muted)" }}>
            {busy ? "Loading balance sheet..." : error ? "Unable to display balance sheet." : "Choose a date to view the balance sheet."}
          </div>
        </section>
      )}

      {ready && (
        <div className={`bs-diff ${tallied ? "ok" : "bad"}`}>
          <span>Equation check: <strong>Assets ({money(data.totals.assets)})</strong> = <strong>Liabilities ({money(data.totals.liabilities)})</strong> + <strong>Equity ({money(data.totals.equity)})</strong> + <strong>P&amp;L ({money(data.profitAndLoss?.netProfit || 0)})</strong></span>
          <strong>{tallied ? "✓ Tallied" : `Difference ${money(Math.abs(Number(data.totals.assets || 0) - Number(data.totals.liabilitiesPlusEquity || 0)))}`}</strong>
        </div>
      )}

      {ready && (
        <footer className="bs-footer">
          <span>As of {data.asOfDate} · UTC · Paise-safe totals · Profit & Loss auto-carried to equity</span>
          <span>Assets = Liabilities + Equity + P&amp;L</span>
        </footer>
      )}
    </main>
  );
}
