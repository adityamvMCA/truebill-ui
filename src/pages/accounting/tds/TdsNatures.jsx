import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import tdsApi from "../../../services/modules/tdsApi";
import { formatDate, money, rupeesToPaise } from "../Note/noteUtils";
import { RATE_TYPES, errMsg, loadLedgers, todayInput } from "./tdsUtils";
import "../Note/Notes.css";
import "./Tds.css";

const emptyRate = () => ({ deducteeType: "ALL", withPan: "", withoutPan: "" });

// Empty box means "no limit"; anything else must be a valid rupee amount.
const optionalPaise = (v) => {
  if (String(v).trim() === "") return 0;
  return rupeesToPaise(v);
};

export default function TdsNatures() {
  const navigate = useNavigate();

  const [natures, setNatures] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [section, setSection] = useState("");
  const [name, setName] = useState("");
  const [paymentCode, setPaymentCode] = useState("");
  const [tdsLedgerId, setTdsLedgerId] = useState("");
  const [rates, setRates] = useState([emptyRate()]);
  const [singleLimit, setSingleLimit] = useState("");
  const [annualLimit, setAnnualLimit] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(todayInput);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [n, l] = await Promise.all([tdsApi.getNatures(), loadLedgers()]);
      setNatures(n?.data?.data || []);
      setLedgers(l);
    } catch (e) {
      toast.error(errMsg(e, "Unable to load nature of payment."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const taxLedgers = useMemo(() => ledgers.filter((l) => l.type === "TAX"), [ledgers]);
  const ledgerName = (id) => ledgers.find((l) => l._id === id)?.name || "-";

  const patchRate = (i, patch) => setRates((c) => c.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;

    const single = optionalPaise(singleLimit);
    const annual = optionalPaise(annualLimit);

    let problem = "";
    if (!section.trim()) problem = "Enter the section.";
    else if (!name.trim()) problem = "Enter a name.";
    else if (!tdsLedgerId) problem = "Choose the TDS payable ledger.";
    else if (single === null || annual === null) problem = "Limits must be valid amounts (up to 2 decimals).";
    else if (rates.some((r) => r.withPan === "" || r.withoutPan === "" || Number.isNaN(Number(r.withPan)) || Number.isNaN(Number(r.withoutPan)))) {
      problem = "Enter both rates (with and without PAN) on every row.";
    } else if (new Set(rates.map((r) => r.deducteeType)).size !== rates.length) {
      problem = "Each deductee type can appear only once.";
    }

    setError(problem);
    if (problem) return;

    setSaving(true);
    try {
      await tdsApi.createNature({
        section: section.trim(),
        name: name.trim(),
        paymentCode: paymentCode.trim() || null,
        tdsLedgerId,
        singleThresholdPaise: single,
        annualThresholdPaise: annual,
        effectiveFrom,
        rates: rates.map((r) => ({
          deducteeType: r.deducteeType,
          withPanPercent: Number(r.withPan),
          withoutPanPercent: Number(r.withoutPan),
        })),
      });
      toast.success("Nature of payment saved");
      setShowForm(false);
      setSection(""); setName(""); setPaymentCode(""); setRates([emptyRate()]);
      setSingleLimit(""); setAnnualLimit("");
      load();
    } catch (e) {
      const message = errMsg(e, "Unable to save.");
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="data-list">
      <div className="dl-header">
        <div className="dl-header-content">
          <h1>TDS Nature of Payment</h1>
          <p>Sections, rates and thresholds used when deducting tax</p>
        </div>
        <div className="td-head-actions">
          <button type="button" className="dl-tool" onClick={() => navigate("/accounting/tds")}>
            <ArrowLeft size={14} /> Register
          </button>
          <button type="button" className="so-primary-button dl-add-button" onClick={() => setShowForm((v) => !v)}>
            <Plus size={14} /> {showForm ? "Close" : "New Nature"}
          </button>
        </div>
      </div>

      {showForm && (
        <form className="cn-form" onSubmit={submit} noValidate>
          {error && <div className="cn-error" role="alert">{error}</div>}

          <section className="dl-card cn-section">
            <h3>Section</h3>
            <div className="cn-grid">
              <div className="dl-field">
                <label htmlFor="tn-section">Section</label>
                <input id="tn-section" value={section} onChange={(e) => setSection(e.target.value)} />
              </div>
              <div className="dl-field">
                <label htmlFor="tn-name">Name</label>
                <input id="tn-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
              </div>
              <div className="dl-field">
                <label htmlFor="tn-code">Payment code (optional)</label>
                <input id="tn-code" value={paymentCode} onChange={(e) => setPaymentCode(e.target.value)} />
              </div>
              <div className="dl-field">
                <label htmlFor="tn-ledger">TDS payable ledger</label>
                <select id="tn-ledger" value={tdsLedgerId} onChange={(e) => setTdsLedgerId(e.target.value)}>
                  <option value="">{taxLedgers.length ? "Select ledger" : "No tax ledgers found"}</option>
                  {taxLedgers.map((l) => <option key={l._id} value={l._id}>{l.name} ({l.code})</option>)}
                </select>
                <span className="cn-hint">A Duties &amp; Taxes ledger of type Tax</span>
              </div>
              <div className="dl-field">
                <label htmlFor="tn-from">Effective from</label>
                <input id="tn-from" type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
              </div>
            </div>
          </section>

          <section className="dl-card cn-section">
            <h3>Rates</h3>
            <div className="dl-table-wrapper">
              <table className="dl-table cn-lines">
                <thead>
                  <tr>
                    <th>Deductee type</th>
                    <th className="gs-num">Rate with PAN (%)</th>
                    <th className="gs-num">Rate without PAN (%)</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {rates.map((r, i) => (
                    <tr key={i}>
                      <td>
                        <select aria-label={`Row ${i + 1} deductee type`} value={r.deducteeType}
                          onChange={(e) => patchRate(i, { deducteeType: e.target.value })}>
                          {RATE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </td>
                      <td><input className="gs-num" inputMode="decimal" aria-label={`Row ${i + 1} rate with PAN`}
                        value={r.withPan} onChange={(e) => patchRate(i, { withPan: e.target.value })} /></td>
                      <td><input className="gs-num" inputMode="decimal" aria-label={`Row ${i + 1} rate without PAN`}
                        value={r.withoutPan} onChange={(e) => patchRate(i, { withoutPan: e.target.value })} /></td>
                      <td>
                        <button type="button" className="cn-icon" aria-label={`Remove row ${i + 1}`}
                          disabled={rates.length === 1} onClick={() => setRates((c) => c.filter((_, j) => j !== i))}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" className="dl-tool cn-add" onClick={() => setRates((c) => [...c, emptyRate()])}>
              <Plus size={14} /> Add deductee type
            </button>
          </section>

          <section className="dl-card cn-section">
            <h3>Thresholds</h3>
            <div className="cn-grid">
              <div className="dl-field">
                <label htmlFor="tn-single">Single payment limit</label>
                <input id="tn-single" inputMode="decimal" value={singleLimit} onChange={(e) => setSingleLimit(e.target.value)} placeholder="No limit" />
              </div>
              <div className="dl-field">
                <label htmlFor="tn-annual">Annual limit per party</label>
                <input id="tn-annual" inputMode="decimal" value={annualLimit} onChange={(e) => setAnnualLimit(e.target.value)} placeholder="No limit" />
              </div>
            </div>
            <span className="cn-hint">TDS starts when a payment is over the single limit or the year's total passes the annual limit.</span>
          </section>

          <div className="cn-actions">
            <button type="button" className="dl-tool" onClick={() => setShowForm(false)} disabled={saving}>Cancel</button>
            <button type="submit" className="so-primary-button" disabled={saving}>{saving ? "Saving..." : "Save nature of payment"}</button>
          </div>
        </form>
      )}

      <div className="dl-card">
        {loading ? (
          <div className="dl-state"><span>Loading...</span></div>
        ) : !natures.length ? (
          <div className="dl-state">
            <strong>No nature of payment yet</strong>
            <span>Add each section you deduct under. Rates are yours to enter and confirm with your CA.</span>
          </div>
        ) : (
          <div className="dl-table-wrapper">
            <table className="dl-table">
              <thead>
                <tr>
                  <th>Section</th>
                  <th>Name</th>
                  <th>Rates (PAN / no PAN)</th>
                  <th className="gs-num">Single limit</th>
                  <th className="gs-num">Annual limit</th>
                  <th>Effective</th>
                  <th>Ledger</th>
                </tr>
              </thead>
              <tbody>
                {natures.map((n) => (
                  <tr key={n._id}>
                    <td><strong>{n.section}</strong></td>
                    <td>{n.name}</td>
                    <td>
                      {n.rates.map((r) => (
                        <span key={r.deducteeType} className="td-rate">
                          {RATE_TYPES.find((t) => t.value === r.deducteeType)?.label}: {r.withPanPercent}% / {r.withoutPanPercent}%
                        </span>
                      ))}
                    </td>
                    <td className="gs-num">{n.singleThresholdPaise ? money(n.singleThresholdPaise) : "-"}</td>
                    <td className="gs-num">{n.annualThresholdPaise ? money(n.annualThresholdPaise) : "-"}</td>
                    <td>{formatDate(n.effectiveFrom)}{n.effectiveTo ? ` to ${formatDate(n.effectiveTo)}` : ""}</td>
                    <td>{ledgerName(n.tdsLedgerId)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
