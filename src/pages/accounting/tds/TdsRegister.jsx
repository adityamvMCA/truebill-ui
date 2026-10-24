import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Landmark, RefreshCw, Settings2 } from "lucide-react";
import toast from "react-hot-toast";

import tdsApi from "../../../services/modules/tdsApi";
import bankApi from "../../../services/modules/bankApi";
import { formatDate, money } from "../Note/noteUtils";
import {
  STATUS_LABELS, deducteeLabel, errMsg, fyOf, fyOptions, todayInput,
} from "./tdsUtils";
import "../Note/Notes.css";
import "./Tds.css";

const TABS = [
  { key: "", label: "All" },
  { key: "PENDING", label: "To deposit" },
  { key: "DEPOSITED", label: "Deposited" },
];

function Card({ label, value, note }) {
  return (
    <div className="gs-card">
      <div className="gs-card-body">
        <span className="gs-card-label">{label}</span>
        <span className="gs-card-value">{value}</span>
        <span className="gs-card-note">{note}</span>
      </div>
    </div>
  );
}

export default function TdsRegister() {
  const navigate = useNavigate();

  const [fy, setFy] = useState(fyOf);
  const [status, setStatus] = useState("");
  const [section, setSection] = useState("");
  const [page, setPage] = useState(1);

  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ deductedPaise: 0, depositedPaise: 0, pendingDepositPaise: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selected, setSelected] = useState(() => new Set());
  const [banks, setBanks] = useState([]);
  const [showDeposit, setShowDeposit] = useState(false);
  const [bankLedgerId, setBankLedgerId] = useState("");
  const [bsrCode, setBsrCode] = useState("");
  const [serial, setSerial] = useState("");
  const [depositDate, setDepositDate] = useState(todayInput);
  const [depositError, setDepositError] = useState("");
  const [depositing, setDepositing] = useState(false);

  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestRef.current;
    try {
      setLoading(true);
      setError("");
      const res = await tdsApi.getRegister({
        fy, page, limit: 25,
        depositStatus: status || undefined,
        section: section.trim() || undefined,
      });
      if (id !== requestRef.current) return;
      const body = res?.data;
      if (!body?.success || !Array.isArray(body.data)) throw new Error(body?.message || "Invalid register response.");
      setRows(body.data);
      setTotals(body.totals);
      setPagination(body.pagination);
    } catch (e) {
      if (id !== requestRef.current) return;
      setRows([]);
      setError(errMsg(e, "Unable to load the TDS register."));
    } finally {
      if (id === requestRef.current) setLoading(false);
    }
  }, [fy, status, section, page]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await bankApi.getAll({ status: "ACTIVE", limit: 100 });
        if (!cancelled && Array.isArray(res?.data?.data)) setBanks(res.data.data);
      } catch {
        /* banks are only needed for the deposit panel */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Selection only makes sense within the current filter and page.
  useEffect(() => { setSelected(new Set()); }, [fy, status, section, page]);

  const pendingRows = useMemo(() => rows.filter((r) => r.depositStatus === "PENDING"), [rows]);
  const selectedTotal = useMemo(
    () => rows.filter((r) => selected.has(r._id)).reduce((t, r) => t + r.tdsPaise, 0),
    [rows, selected],
  );

  const toggle = (id) =>
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected((cur) => (cur.size === pendingRows.length ? new Set() : new Set(pendingRows.map((r) => r._id))));

  const deposit = async (event) => {
    event.preventDefault();
    if (depositing) return;

    let problem = "";
    if (!bankLedgerId) problem = "Choose the bank account.";
    else if (!/^\d{7}$/.test(bsrCode)) problem = "BSR code must be 7 digits.";
    else if (!serial.trim()) problem = "Enter the challan serial number.";
    setDepositError(problem);
    if (problem) return;

    setDepositing(true);
    try {
      const res = await tdsApi.payChallan({
        deductionIds: [...selected],
        bankLedgerId,
        bsrCode,
        challanSerialNo: serial.trim(),
        depositDate,
      });
      toast.success(res?.data?.message || "Deposit recorded");
      setShowDeposit(false);
      setSelected(new Set());
      setBsrCode(""); setSerial("");
      load();
    } catch (e) {
      const message = errMsg(e, "Unable to record the deposit.");
      setDepositError(message);
      toast.error(message);
    } finally {
      setDepositing(false);
    }
  };

  return (
    <div className="data-list">
      <div className="dl-header">
        <div className="dl-header-content">
          <h1>TDS Register</h1>
          <p>Tax deducted from suppliers and what is still to be deposited</p>
        </div>
        <div className="td-head-actions">
          <button type="button" className="dl-tool" onClick={() => navigate("/accounting/tds/natures")}>
            <Settings2 size={14} /> Nature of payment
          </button>
          <button type="button" className="so-primary-button dl-add-button" onClick={() => navigate("/accounting/tds/deduct")}>
            Deduct TDS
          </button>
        </div>
      </div>

      <div className="gs-cards">
        <Card label="Deducted" value={money(totals.deductedPaise)} note={`Financial year ${fy}`} />
        <Card label="Deposited" value={money(totals.depositedPaise)} note="Paid to the government" />
        <Card label="To deposit" value={money(totals.pendingDepositPaise)} note="Deducted, not yet deposited" />
      </div>

      <div className="dl-card">
        <div className="dl-toolbar">
          <div className="dl-toolbar-actions td-filters">
            <select className="cn-inline-select" value={fy} onChange={(e) => { setFy(e.target.value); setPage(1); }} aria-label="Financial year">
              {fyOptions().map((o) => <option key={o} value={o}>FY {o}</option>)}
            </select>
            <input className="cn-inline-select" value={section} placeholder="Section"
              onChange={(e) => { setSection(e.target.value); setPage(1); }} aria-label="Filter by section" />
            <button type="button" className="dl-tool" onClick={load} disabled={loading}>
              <RefreshCw size={14} className={loading ? "dl-refresh-icon-spin" : undefined} /> Refresh
            </button>
          </div>

          {selected.size > 0 && (
            <button type="button" className="so-primary-button" onClick={() => setShowDeposit(true)}>
              Deposit {selected.size} selected - {money(selectedTotal)}
            </button>
          )}
        </div>

        <div className="dl-quick-filters">
          {TABS.map((t) => (
            <button key={t.key || "all"} type="button" className={status === t.key ? "active" : ""}
              onClick={() => { setStatus(t.key); setPage(1); }}>
              {t.label}
            </button>
          ))}
        </div>

        {showDeposit && (
          <form className="td-deposit" onSubmit={deposit} noValidate>
            <h3>Record deposit - {money(selectedTotal)}</h3>
            {depositError && <div className="cn-error" role="alert">{depositError}</div>}
            <div className="cn-grid">
              <div className="dl-field">
                <label htmlFor="dp-bank">Paid from</label>
                <select id="dp-bank" value={bankLedgerId} onChange={(e) => setBankLedgerId(e.target.value)}>
                  <option value="">{banks.length ? "Select bank" : "No bank accounts"}</option>
                  {banks.map((b) => <option key={b._id} value={b.ledgerId}>{b.accountName} ({b.bankCode})</option>)}
                </select>
              </div>
              <div className="dl-field">
                <label htmlFor="dp-bsr">BSR code</label>
                <input id="dp-bsr" inputMode="numeric" maxLength={7} value={bsrCode} onChange={(e) => setBsrCode(e.target.value.replace(/\D/g, ""))} />
              </div>
              <div className="dl-field">
                <label htmlFor="dp-serial">Challan serial no.</label>
                <input id="dp-serial" value={serial} onChange={(e) => setSerial(e.target.value)} />
              </div>
              <div className="dl-field">
                <label htmlFor="dp-date">Deposit date</label>
                <input id="dp-date" type="date" value={depositDate} onChange={(e) => setDepositDate(e.target.value)} />
              </div>
            </div>
            <div className="cn-actions">
              <button type="button" className="dl-tool" onClick={() => setShowDeposit(false)} disabled={depositing}>Cancel</button>
              <button type="submit" className="so-primary-button" disabled={depositing}>
                {depositing ? "Posting..." : "Record deposit"}
              </button>
            </div>
          </form>
        )}

        {error ? (
          <div className="dl-state">
            <strong>Unable to load the register</strong>
            <span>{error}</span>
            <button type="button" onClick={load}>Try again</button>
          </div>
        ) : loading && !rows.length ? (
          <div className="dl-state"><span>Loading...</span></div>
        ) : !rows.length ? (
          <div className="dl-state">
            <Landmark size={26} />
            <strong>No TDS entries</strong>
            <span>Nothing has been deducted for these filters.</span>
          </div>
        ) : (
          <div className="dl-table-wrapper" style={{ opacity: loading ? 0.6 : 1 }}>
            <table className="dl-table">
              <thead>
                <tr>
                  <th>
                    <input type="checkbox" aria-label="Select all pending"
                      disabled={!pendingRows.length}
                      checked={pendingRows.length > 0 && selected.size === pendingRows.length}
                      onChange={toggleAll} />
                  </th>
                  <th>Date</th>
                  <th>Deduction</th>
                  <th>Supplier</th>
                  <th>Section</th>
                  <th className="gs-num">Base</th>
                  <th className="gs-num">Rate</th>
                  <th className="gs-num">TDS</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const st = STATUS_LABELS[r.depositStatus] || STATUS_LABELS.PENDING;
                  return (
                    <tr key={r._id}>
                      <td>
                        <input type="checkbox" aria-label={`Select ${r.deductionNumber}`}
                          disabled={r.depositStatus !== "PENDING"}
                          checked={selected.has(r._id)} onChange={() => toggle(r._id)} />
                      </td>
                      <td>{formatDate(r.deductionDate)}</td>
                      <td>
                        <div className="dl-customer">
                          <strong>{r.deductionNumber}</strong>
                          <span>{r.sourceNumber}</span>
                        </div>
                      </td>
                      <td>
                        <div className="dl-customer">
                          <strong>{r.partyName}</strong>
                          <span>{deducteeLabel(r.deducteeType)}{r.pan ? ` · ${r.pan}` : " · No PAN"}</span>
                        </div>
                      </td>
                      <td>{r.section}</td>
                      <td className="gs-num">{money(r.baseAmountPaise)}</td>
                      <td className="gs-num">{r.ratePercent}%</td>
                      <td className="gs-num"><strong>{money(r.tdsPaise)}</strong></td>
                      <td>
                        <span className={`dl-status ${st.className}`}>
                          <span className="dl-status-dot" />{st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!error && pagination.total > 0 && (
          <div className="dl-pagination">
            <div className="dl-pagination-info">
              <span>{pagination.total} entries</span>
            </div>
            <div className="dl-pagination-buttons">
              <button type="button" onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={pagination.page <= 1}>
                <ChevronLeft size={14} />
              </button>
              <button type="button" className="active">{pagination.page}</button>
              <button type="button" onClick={() => setPage((p) => Math.min(p + 1, pagination.totalPages))}
                disabled={pagination.page >= pagination.totalPages}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
