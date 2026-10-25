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
  const [loadingMasters, setLoadingMasters] = useState(true);
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

    const loadMasters = async () => {
      setLoadingMasters(true);

      try {
        const [natureResponse, ledgerResponse] = await Promise.all([
          tdsApi.getNatures(),
          loadLedgers(),
        ]);

        if (cancelled) return;

        const body = natureResponse?.data;
        const natureList = Array.isArray(body?.data)
          ? body.data
          : Array.isArray(body?.natures)
            ? body.natures
            : [];

        setNatures(natureList);
        setLedgers(Array.isArray(ledgerResponse) ? ledgerResponse : []);
      } catch (e) {
        if (!cancelled) {
          const message = errMsg(e, "Unable to load TDS masters.");
          setError(message);
          toast.error(message);
          console.error("TDS master loading error:", e);
        }
      } finally {
        if (!cancelled) setLoadingMasters(false);
      }
    };

    loadMasters();

    return () => {
      cancelled = true;
    };
  }, []);

  const parties = useMemo(
    () =>
      ledgers.filter(
        (ledger) =>
          String(ledger.type || "").toUpperCase() === "SUPPLIER" &&
          ledger.isActive !== false,
      ),
    [ledgers],
  );

  const party = parties.find((ledger) => ledger._id === partyLedgerId);
  const basePaise = rupeesToPaise(amount);

  const invalidatePreview = () => {
    setPreview(null);
    setError("");
  };

  const touch = (setter) => (event) => {
    setter(event.target.value);
    invalidatePreview();
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
      ? {
          number: certNumber.trim(),
          ratePercent: Number(certRate),
        }
      : null,
  });

  const validate = () => {
    if (!natureId) return "Choose the nature of payment.";
    if (!partyLedgerId) return "Choose the supplier.";
    if (!date) return "Choose the deduction date.";

    if (pan.trim() && !PAN_RE.test(pan.trim().toUpperCase())) {
      return "Invalid PAN. Expected format: ABCDE1234F.";
    }

    if (!Number.isSafeInteger(basePaise) || basePaise <= 0) {
      return "Enter an amount greater than zero, with up to 2 decimals.";
    }

    if (originalDocDate && originalDocDate > date) {
      return "Original bill date cannot be after the deduction date.";
    }

    if (
      hasCertificate &&
      (!certNumber.trim() ||
        certRate.trim() === "" ||
        !Number.isFinite(Number(certRate)) ||
        Number(certRate) < 0 ||
        Number(certRate) > 100)
    ) {
      return "Enter a certificate number and a rate between 0 and 100.";
    }

    return "";
  };

  const check = async () => {
    console.log("CHECK TDS BUTTON CLICKED");
    if (checking || saving) return;

    const problem = validate();
    console.log("Starting TDS preview validation");
    setError("");
    setPreview(null);

    if (problem) {
      setError(problem);
      toast.error(problem);
      return;
    }

    setChecking(true);

    console.log("TDS PREVIEW PAYLOAD:", buildPayload());

    try {
      const response = await tdsApi.preview(buildPayload());

      console.log(
        "TDS PREVIEW RESPONSE:",
        JSON.stringify(response?.data, null, 2),
      );

      const body = response?.data;

      const previewData =
        body?.data?.tdsPaise !== undefined
          ? body.data
          : body?.data?.data?.tdsPaise !== undefined
            ? body.data.data
            : body?.tdsPaise !== undefined
              ? body
              : null;

      if (!previewData) {
        console.error("Unexpected TDS preview response:", body);
        setPreview(null);
        setError("Preview response is missing tdsPaise. Check the console.");
        return;
      }

      setPreview(previewData);
      setError("");
    } catch (error) {
      console.error("TDS PREVIEW ERROR:", error);
      console.error("HTTP STATUS:", error?.response?.status);
      console.error("API ERROR BODY:", error?.response?.data);

      setPreview(null);
      setError(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to calculate TDS.",
      );
    } finally {
      setChecking(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();

    console.log("Deduct TDS form submitted.");

    if (saving || checking) return;

    const problem = validate();

    if (problem) {
      setError(problem);
      toast.error(problem);
      return;
    }

    if (!preview) {
      const message = "Click Check TDS and verify the calculation first.";
      setError(message);
      toast.error(message);
      return;
    }

    if (
      !Number.isFinite(Number(preview.tdsPaise)) ||
      Number(preview.tdsPaise) < 1
    ) {
      const message = "No valid positive TDS amount is available to deduct.";
      setError(message);
      toast.error(message);
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = buildPayload();

      console.log("POST /tds/deductions payload:", payload);

      const response = await tdsApi.deduct(payload);

      console.log("TDS deduction saved:", response?.data);

      toast.success(response?.data?.message || "TDS deducted successfully.");

      navigate("/accounting/tds");
    } catch (e) {
      console.error("TDS deduction failed:", e);

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
          <div className="cn-error" role="alert" aria-live="assertive">
            {error}
          </div>
        )}

        {loadingMasters && (
          <p className="cn-hint">Loading TDS sections and suppliers...</p>
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
                disabled={loadingMasters || saving || checking}
              >
                <option value="">
                  {natures.length ? "Select section" : "No sections set up"}
                </option>
                {natures.map((nature) => (
                  <option key={nature._id} value={nature._id}>
                    {nature.section} - {nature.name}
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
                disabled={loadingMasters || saving || checking}
              >
                <option value="">
                  {parties.length
                    ? "Select supplier"
                    : "No supplier ledgers found"}
                </option>
                {parties.map((ledger) => (
                  <option key={ledger._id} value={ledger._id}>
                    {ledger.name} ({ledger.code})
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
                disabled={saving || checking}
              >
                {DEDUCTEE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
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
                autoCapitalize="characters"
                onChange={(event) => {
                  setPan(event.target.value.toUpperCase());
                  invalidatePreview();
                }}
                disabled={saving || checking}
              />
              <span className="cn-hint">
                Enter the supplier's PAN to calculate the applicable rate.
              </span>
            </div>

            <div className="dl-field">
              <label htmlFor="td-date">Date</label>
              <input
                id="td-date"
                type="date"
                value={date}
                onChange={touch(setDate)}
                disabled={saving || checking}
              />
            </div>

            <div className="dl-field">
              <label htmlFor="td-amount">Amount to deduct on (₹)</label>
              <input
                id="td-amount"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={amount}
                placeholder="50000.00"
                onChange={touch(setAmount)}
                disabled={saving || checking}
              />
              <span className="cn-hint">
                Taxable value of the bill or payment.
              </span>
            </div>

            <div className="dl-field">
              <label htmlFor="td-odoc">Original bill no.</label>
              <input
                id="td-odoc"
                value={originalDocNumber}
                maxLength={50}
                onChange={touch(setOriginalDocNumber)}
                disabled={saving || checking}
              />
            </div>

            <div className="dl-field">
              <label htmlFor="td-odate">Original bill date</label>
              <input
                id="td-odate"
                type="date"
                value={originalDocDate}
                max={date || undefined}
                onChange={touch(setOriginalDocDate)}
                disabled={saving || checking}
              />
            </div>
          </div>

          <label className="cn-check">
            <input
              type="checkbox"
              checked={hasCertificate}
              onChange={(event) => {
                setHasCertificate(event.target.checked);
                invalidatePreview();
              }}
              disabled={saving || checking}
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
                  disabled={saving || checking}
                />
              </div>

              <div className="dl-field">
                <label htmlFor="td-crate">Rate on certificate (%)</label>
                <input
                  id="td-crate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={certRate}
                  onChange={touch(setCertRate)}
                  disabled={saving || checking}
                />
              </div>
            </div>
          )}

          <button
            type="button"
            className="dl-tool cn-add"
            onClick={check}
            disabled={checking || saving || loadingMasters}
          >
            {checking ? "Calculating..." : "Check TDS"}
          </button>
        </section>

        {preview && (
          <section className="dl-card cn-section">
            <h3>Result for section {preview.section || "-"}</h3>

            <dl className="cn-totals td-result">
              <div>
                <dt>Financial year</dt>
                <dd>{preview.financialYear || "-"}</dd>
              </div>

              <div>
                <dt>Paid to date this year</dt>
                <dd>{money(preview.cumulativeBasePaise ?? 0)}</dd>
              </div>

              <div>
                <dt>Rate applied</dt>
                <dd>{preview.ratePercent ?? 0}%</dd>
              </div>

              <div>
                <dt>Taxable base</dt>
                <dd>{money(preview.taxableBasePaise ?? 0)}</dd>
              </div>

              <div>
                <dt>Basis</dt>
                <dd>
                  {REASON_LABELS[preview.reason] || preview.reason || "-"}
                </dd>
              </div>

              <div className="cn-grand">
                <dt>TDS to deduct</dt>
                <dd>{money(preview.tdsPaise ?? 0)}</dd>
              </div>
            </dl>

            {Number(preview.tdsPaise) < 1 && (
              <p className="cn-hint">
                No TDS is deductible according to the current calculation.
              </p>
            )}

            {Number(preview.undeductedBasePaise) > 0 &&
              Number(preview.taxableBasePaise) > basePaise && (
                <p className="cn-hint">
                  Earlier payments of {money(preview.undeductedBasePaise)} are
                  included because the annual threshold was crossed.
                </p>
              )}
          </section>
        )}

        <div className="cn-actions">
          <button
            type="button"
            className="dl-tool"
            onClick={() => navigate(-1)}
            disabled={saving || checking}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="so-primary-button"
            disabled={saving || checking || loadingMasters}
          >
            {saving ? "Posting..." : "Deduct TDS"}
          </button>
        </div>
      </form>
    </div>
  );
}
