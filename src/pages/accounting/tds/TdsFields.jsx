import { useEffect, useState } from "react";

import tdsApi from "../../../services/modules/tdsApi";
import { DEDUCTEE_TYPES, PAN_RE, errMsg } from "./tdsUtils";
import "../Note/Notes.css";
import "./Tds.css";
import { money } from "../Note/noteUtils";

export const emptyTds = () => ({
  enabled: false,
  natureId: "",
  deducteeType: "COMPANY",
  pan: "",
});

// What to send to the API as `tds`. null means "no TDS".
export const buildTdsPayload = (value) =>
  value?.enabled
    ? {
        natureId: value.natureId,
        deducteeType: value.deducteeType,
        pan: value.pan.trim().toUpperCase() || null,
      }
    : null;

// Returns an error message, or "" when fine.
export const validateTds = (value) => {
  if (!value?.enabled) return "";
  if (!value.natureId) return "Choose the TDS section.";
  if (value.pan.trim() && !PAN_RE.test(value.pan.trim().toUpperCase())) {
    return "TDS: PAN is not valid. It looks like ABCDE1234F.";
  }
  return "";
};

/**
 * Drop into a purchase bill or expense form.
 *
 * props
 *   supplierLedgerId   ledger id of the chosen supplier (supplier.ledgerId)
 *   baseAmountPaise    taxable value the TDS is calculated on (before GST)
 *   date               bill or expense date, YYYY-MM-DD
 *   value / onChange   state from emptyTds()
 *   onPreview          optional, called with the preview result or null
 */
export default function TdsFields({
  supplierLedgerId,
  baseAmountPaise,
  date,
  value,
  onChange,
  onPreview,
}) {
  const [natures, setNatures] = useState([]);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");

  const patch = (changes) => onChange({ ...value, ...changes });

  useEffect(() => {
    if (!value.enabled || natures.length) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await tdsApi.getNatures();
        if (!cancelled) setNatures(res?.data?.data || []);
      } catch (e) {
        if (!cancelled) setError(errMsg(e, "Unable to load TDS sections."));
      }
    })();
    return () => { cancelled = true; };
  }, [value.enabled, natures.length]);

  const pan = value.pan.trim().toUpperCase();
  const ready =
    value.enabled &&
    value.natureId &&
    supplierLedgerId &&
    date &&
    Number.isSafeInteger(baseAmountPaise) &&
    baseAmountPaise > 0 &&
    (!pan || PAN_RE.test(pan));

  useEffect(() => {
    if (!ready) {
      setPreview(null);
      setError("");
      onPreview?.(null);
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await tdsApi.preview({
          natureId: value.natureId,
          partyLedgerId: supplierLedgerId,
          deducteeType: value.deducteeType,
          pan: pan || null,
          date,
          baseAmountPaise,
        });
        if (cancelled) return;
        const data = res?.data?.data || null;
        setPreview(data);
        setError("");
        onPreview?.(data);
      } catch (e) {
        if (cancelled) return;
        setPreview(null);
        setError(errMsg(e, "Unable to calculate TDS."));
        onPreview?.(null);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, value.natureId, value.deducteeType, pan, supplierLedgerId, date, baseAmountPaise]);

  return (
    <section className="dl-card cn-section">
      <label className="cn-check" style={{ marginTop: 0 }}>
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(e) => patch({ enabled: e.target.checked })}
        />
        Deduct TDS on this entry
      </label>

      {value.enabled && (
        <>
          <div className="cn-grid" style={{ marginTop: 12 }}>
            <div className="dl-field">
              <label htmlFor="tf-nature">Nature of payment</label>
              <select id="tf-nature" value={value.natureId} onChange={(e) => patch({ natureId: e.target.value })}>
                <option value="">{natures.length ? "Select section" : "No sections set up"}</option>
                {natures.map((n) => (
                  <option key={n._id} value={n._id}>{n.section} - {n.name}</option>
                ))}
              </select>
            </div>

            <div className="dl-field">
              <label htmlFor="tf-type">Deductee type</label>
              <select id="tf-type" value={value.deducteeType} onChange={(e) => patch({ deducteeType: e.target.value })}>
                {DEDUCTEE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div className="dl-field">
              <label htmlFor="tf-pan">Supplier PAN</label>
              <input id="tf-pan" maxLength={10} value={value.pan}
                onChange={(e) => patch({ pan: e.target.value.toUpperCase() })} />
              <span className="cn-hint">Without a valid PAN the higher rate applies</span>
            </div>
          </div>

          {error && <p className="cn-error" role="alert" style={{ marginTop: 12 }}>{error}</p>}

          {preview && (
            <dl className="cn-totals td-result" style={{ marginTop: 12 }}>
              <div><dt>TDS base (before GST)</dt><dd>{money(preview.taxableBasePaise)}</dd></div>
              <div><dt>Rate</dt><dd>{preview.ratePercent}%</dd></div>
              <div className="cn-grand"><dt>TDS to deduct</dt><dd>{money(preview.tdsPaise)}</dd></div>
              {preview.tdsPaise < 1 && (
                <p className="cn-hint">Under the section's limits, so nothing is deducted yet.</p>
              )}
            </dl>
          )}
        </>
      )}
    </section>
  );
}
