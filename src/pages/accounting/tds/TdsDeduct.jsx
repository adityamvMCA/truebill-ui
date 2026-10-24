import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

import tdsApi from "../../../services/modules/tdsApi";
import {
  DEDUCTEE_TYPES,
  PAN_RE,
  REASON_LABELS,
  errMsg,
  loadLedgers,
  todayInput,
} from "./tdsUtils";
import "../Note/Notes.css";
import "./Tds.css";
import { money, rupeesToPaise } from "../Note/noteUtils";

export default function TdsDeduct() {
  const navigate = useNavigate();

  const [natures, setNatures] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);

  const [natureId, setNatureId] = useState("");
  const [partyLedgerId, setPartyLedgerId] = useState("");
  const [deducteeType, setDeducteeType] = useState("COMPANY");
  const [pan, setPan] = useState("");
  const [date, setDate] = useState(todayInput);
  const [amount, setAmount] = useState("");
  const [originalDocNumber, setOriginalDocNumber] = useState("");
  const [originalDocDate, setOriginalDocDate] = useState("");
  const [hasCertificate, setHasCertificate] = useState(false);
  const [certNumber, setCertNumber] = useState("");
  const [certRate, setCertRate] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [n, l] = await Promise.all([tdsApi.getNatures(), loadLedgers()]);
        if (cancelled) return;
        setNatures(n?.data?.data || []);
        setLedgers(l);
      } catch (e) {
        if (!cancelled) toast.error(errMsg(e, "Unable to load masters."));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const parties = useMemo(
    () => ledgers.filter((l) => l.type === "SUPPLIER"),
    [ledgers],
  );
  const party = parties.find((l) => l._id === partyLedgerId);
  const basePaise = rupeesToPaise(amount);

  // Any input change invalidates the last preview.
  const touch = (setter) => (e) => {
    setter(e.target.value);
    setPreview(null);
  };

  const buildPayload = () => ({
    natureId,
    partyLedgerId,
    partyName: party?.name || "",
    deducteeType,
    pan: pan.trim().toUpperCase() || null,
    date,
    baseAmountPaise: basePaise,
    originalDocNumber: originalDocNumber.trim() || null,
    originalDocDate: originalDocDate || null,
    certificate: hasCertificate
      ? { number: certNumber.trim(), ratePercent: Number(certRate) }
      : null,
  });

  const validate = () => {
    if (!natureId) return "Choose the nature of payment.";
    if (!partyLedgerId) return "Choose the supplier.";
    if (pan && !PAN_RE.test(pan.toUpperCase()))
      return "PAN is not valid. It looks like ABCDE1234F.";
    if (!basePaise) return "Enter a valid amount (up to 2 decimals).";
    if (
      hasCertificate &&
      (!certNumber.trim() || certRate === "" || Number.isNaN(Number(certRate)))
    ) {
      return "Enter the certificate number and its rate.";
    }
    return "";
  };

  const check = async () => {
    const problem = validate();
    setError(problem);
    if (problem) return;
    setChecking(true);
    try {
      const res = await tdsApi.preview(buildPayload());
      setPreview(res?.data?.data || null);
    } catch (e) {
      const message = errMsg(e, "Unable to calculate TDS.");
      setError(message);
      setPreview(null);
    } finally {
      setChecking(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (!preview) return setError("Check the TDS first.");
    if (preview.tdsPaise < 1)
      return setError("No TDS is deductible on this amount.");

    setSaving(true);
    try {
      const res = await tdsApi.deduct(buildPayload());
      toast.success(res?.data?.message || "TDS deducted");
      navigate("/accounting/tds");
    } catch (e) {
      const message = errMsg(e, "Unable to deduct TDS.");
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
          <h1>Deduct TDS</h1>
          <p>Reduces what you owe the supplier and adds to TDS payable</p>
        </div>
        <button
          type="button"
          className="dl-tool"
          onClick={() => navigate("/accounting/tds")}
        >
          <ArrowLeft size={14} /> Back
        </button>
      </div>

      <form className="cn-form" onSubmit={submit} noValidate>
        {error && (
          <div className="cn-error" role="alert">
            {error}
          </div>
        )}

        <section className="dl-card cn-section">
          <h3>Payment</h3>
          <div className="cn-grid">
            <div className="dl-field">
              <label htmlFor="td-nature">Nature of payment</label>
              <select
                id="td-nature"
                value={natureId}
                onChange={touch(setNatureId)}
              >
                <option value="">
                  {natures.length ? "Select section" : "No sections set up"}
                </option>
                {natures.map((n) => (
                  <option key={n._id} value={n._id}>
                    {n.section} - {n.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="dl-field">
              <label htmlFor="td-party">Supplier</label>
              <select
                id="td-party"
                value={partyLedgerId}
                onChange={touch(setPartyLedgerId)}
              >
                <option value="">
                  {parties.length
                    ? "Select supplier"
                    : "No supplier ledgers found"}
                </option>
                {parties.map((l) => (
                  <option key={l._id} value={l._id}>
                    {l.name} ({l.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="dl-field">
              <label htmlFor="td-type">Deductee type</label>
              <select
                id="td-type"
                value={deducteeType}
                onChange={touch(setDeducteeType)}
              >
                {DEDUCTEE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="dl-field">
              <label htmlFor="td-pan">PAN</label>
              <input
                id="td-pan"
                value={pan}
                maxLength={10}
                onChange={(e) => {
                  setPan(e.target.value.toUpperCase());
                  setPreview(null);
                }}
              />
              <span className="cn-hint">
                Without a valid PAN the higher rate applies
              </span>
            </div>
            <div className="dl-field">
              <label htmlFor="td-date">Date</label>
              <input
                id="td-date"
                type="date"
                value={date}
                onChange={touch(setDate)}
              />
            </div>
            <div className="dl-field">
              <label htmlFor="td-amount">Amount to deduct on</label>
              <input
                id="td-amount"
                inputMode="decimal"
                value={amount}
                placeholder="0.00"
                onChange={touch(setAmount)}
              />
              <span className="cn-hint">
                Taxable value of the bill or payment
              </span>
            </div>
            <div className="dl-field">
              <label htmlFor="td-odoc">Original bill no.</label>
              <input
                id="td-odoc"
                value={originalDocNumber}
                onChange={(e) => setOriginalDocNumber(e.target.value)}
                maxLength={50}
              />
            </div>
            <div className="dl-field">
              <label htmlFor="td-odate">Original bill date</label>
              <input
                id="td-odate"
                type="date"
                value={originalDocDate}
                max={date}
                onChange={(e) => setOriginalDocDate(e.target.value)}
              />
            </div>
          </div>

          <label className="cn-check">
            <input
              type="checkbox"
              checked={hasCertificate}
              onChange={(e) => {
                setHasCertificate(e.target.checked);
                setPreview(null);
              }}
            />
            Lower or nil deduction certificate (section 197)
          </label>

          {hasCertificate && (
            <div className="cn-grid td-cert">
              <div className="dl-field">
                <label htmlFor="td-cnum">Certificate number</label>
                <input
                  id="td-cnum"
                  value={certNumber}
                  onChange={touch(setCertNumber)}
                />
              </div>
              <div className="dl-field">
                <label htmlFor="td-crate">Rate on certificate (%)</label>
                <input
                  id="td-crate"
                  inputMode="decimal"
                  value={certRate}
                  onChange={touch(setCertRate)}
                />
              </div>
            </div>
          )}

          <button
            type="button"
            className="dl-tool cn-add"
            onClick={check}
            disabled={checking}
          >
            {checking ? "Calculating..." : "Check TDS"}
          </button>
        </section>

        {preview && (
          <section className="dl-card cn-section">
            <h3>Result for section {preview.section}</h3>
            <dl className="cn-totals td-result">
              <div>
                <dt>Financial year</dt>
                <dd>{preview.financialYear}</dd>
              </div>
              <div>
                <dt>Paid to date this year</dt>
                <dd>{money(preview.cumulativeBasePaise)}</dd>
              </div>
              <div>
                <dt>Rate applied</dt>
                <dd>{preview.ratePercent}%</dd>
              </div>
              <div>
                <dt>Taxable base</dt>
                <dd>{money(preview.taxableBasePaise)}</dd>
              </div>
              <div>
                <dt>Basis</dt>
                <dd>{REASON_LABELS[preview.reason] || preview.reason}</dd>
              </div>
              <div className="cn-grand">
                <dt>TDS to deduct</dt>
                <dd>{money(preview.tdsPaise)}</dd>
              </div>
            </dl>
            {preview.tdsPaise < 1 && (
              <p className="cn-hint">
                This amount is under the section's limits, so nothing is
                deducted yet.
              </p>
            )}
            {preview.undeductedBasePaise > 0 &&
              preview.taxableBasePaise > Number(basePaise) && (
                <p className="cn-hint">
                  The annual limit is crossed, so earlier payments of{" "}
                  {money(preview.undeductedBasePaise)} are included.
                </p>
              )}
          </section>
        )}

        <div className="cn-actions">
          <button
            type="button"
            className="dl-tool"
            onClick={() => navigate(-1)}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="so-primary-button"
            disabled={saving || !preview || preview.tdsPaise < 1}
          >
            {saving ? "Posting..." : "Deduct TDS"}
          </button>
        </div>
      </form>
    </div>
  );
}
