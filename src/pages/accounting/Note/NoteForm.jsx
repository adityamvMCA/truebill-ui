import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import noteApi from "../../../services/modules/noteApi";
// ASSUMPTION: ledgerApi.getAll({ search, limit }) returns { data: { success, data: [{ _id, code, name }] } }.
// Point this at whichever call you already use to list ledgers.
import ledgerApi from "../../../services/modules/ledgerApi";
import {
  EFFECTS,
  GST_RATES,
  NOTE_LABELS,
  REASONS,
  computeTax,
  money,
  rupeesToPaise,
  uuidv4,
} from "./noteUtils";
import "./Notes.css";

const today = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const emptyLine = () => ({ description: "", hsnSac: "", amount: "", gstRate: 18 });

const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export default function NoteForm() {
  const navigate = useNavigate();

  // One id per submit attempt. A retry after a network error reuses it;
  // it is replaced only after the note posts successfully.
  const requestIdRef = useRef(uuidv4());

  const [ledgers, setLedgers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [noteType, setNoteType] = useState("CREDIT_NOTE");
  const [partyType, setPartyType] = useState("CUSTOMER");
  const [partyName, setPartyName] = useState("");
  const [partyGstin, setPartyGstin] = useState("");
  const [partyLedgerId, setPartyLedgerId] = useState("");
  const [adjustmentLedgerId, setAdjustmentLedgerId] = useState("");
  const [noteDate, setNoteDate] = useState(today);
  const [reason, setReason] = useState("PRICE_ADJUSTMENT");
  const [originalDocNumber, setOriginalDocNumber] = useState("");
  const [originalDocDate, setOriginalDocDate] = useState("");
  const [isInterState, setIsInterState] = useState(false);
  const [narration, setNarration] = useState("");
  const [lines, setLines] = useState([emptyLine()]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = [];
        let page = 1;
        let totalPages = 1;

        do {
          const res = await ledgerApi.getAll({ page, limit: 100 });
          if (cancelled) return;

          const body = res?.data;
          const list = body?.data ?? body?.ledgers ?? body;
          if (!Array.isArray(list)) throw new Error(body?.message || "Invalid ledger response.");

          all.push(...list);
          totalPages = Number(body?.pagination?.totalPages) || 1;
          page += 1;
        } while (page <= totalPages && page <= 50);

        setLedgers(all.filter((l) => l.isActive !== false));
      } catch (e) {
        if (!cancelled) {
          toast.error(e?.response?.data?.message || e?.message || "Unable to load ledgers.");
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const preview = useMemo(() => {
    const rows = lines.map((l) => {
      const taxable = rupeesToPaise(l.amount);
      if (!taxable) return { valid: false, taxable: 0, cgst: 0, sgst: 0, igst: 0 };
      return { valid: true, taxable, ...computeTax(taxable, Number(l.gstRate), isInterState) };
    });
    const sum = (k) => rows.reduce((t, r) => t + r[k], 0);
    const taxable = sum("taxable");
    const cgst = sum("cgst");
    const sgst = sum("sgst");
    const igst = sum("igst");
    return { rows, taxable, cgst, sgst, igst, total: taxable + cgst + sgst + igst };
  }, [lines, isInterState]);

  // Customer notes post to a CUSTOMER ledger, supplier notes to a SUPPLIER ledger.
  const partyLedgers = useMemo(
    () => ledgers.filter((l) => l.type === partyType),
    [ledgers, partyType],
  );

  // Sales returns / discounts / purchase returns: plain income or expense ledgers.
  const adjustmentLedgers = useMemo(
    () =>
      ledgers.filter(
        (l) =>
          ["INCOME", "EXPENSE"].includes(l.nature) &&
          ["ACCOUNT", "SYSTEM"].includes(l.type),
      ),
    [ledgers],
  );

  const patchLine = (index, patch) =>
    setLines((cur) => cur.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  const validate = () => {
    if (!partyName.trim()) return "Enter the party name.";
    if (!partyLedgerId) return "Choose the party's ledger.";
    if (!adjustmentLedgerId) return "Choose the adjustment ledger.";
    if (partyLedgerId === adjustmentLedgerId) return "Party and adjustment ledgers must differ.";
    if (partyGstin && !GSTIN_RE.test(partyGstin.toUpperCase())) return "GSTIN is not valid.";
    if (partyGstin && !originalDocNumber.trim()) {
      return `Enter the original ${partyType === "CUSTOMER" ? "invoice" : "bill"} number for a GST-registered party.`;
    }
    if (originalDocDate && originalDocDate > noteDate) return "Original date cannot be after the note date.";
    if (lines.some((l) => !l.description.trim())) return "Every line needs a description.";
    if (preview.rows.some((r) => !r.valid)) return "Every line needs a valid amount (up to 2 decimals).";
    return "";
  };

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;

    const problem = validate();
    setError(problem);
    if (problem) return;

    setSaving(true);
    try {
      const res = await noteApi.create({
        requestId: requestIdRef.current,
        noteType,
        partyType,
        partyName: partyName.trim(),
        partyGstin: partyGstin.trim().toUpperCase() || null,
        partyLedgerId,
        adjustmentLedgerId,
        noteDate,
        reason,
        isInterState,
        originalDocNumber: originalDocNumber.trim() || null,
        originalDocDate: originalDocDate || null,
        narration: narration.trim() || null,
        lines: lines.map((l, i) => ({
          description: l.description.trim(),
          hsnSac: l.hsnSac.trim() || null,
          taxablePaise: preview.rows[i].taxable,
          gstRate: Number(l.gstRate),
        })),
      });
      requestIdRef.current = uuidv4();
      toast.success(res?.data?.message || "Note posted");
      navigate("/accounting/notes");
    } catch (e) {
      const message = e?.response?.data?.message || e?.message || "Unable to post note.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const adjustmentHint =
    partyType === "CUSTOMER" ? "e.g. Sales Returns, Sales Discounts" : "e.g. Purchase Returns, Purchase Adjustments";

  return (
    <div className="data-list">
      <div className="dl-header">
        <div className="dl-header-content">
          <h1>New {NOTE_LABELS[noteType]}</h1>
          <p>{EFFECTS[`${partyType}:${noteType}`]}</p>
        </div>
        <button type="button" className="dl-tool" onClick={() => navigate(-1)}>
          <ArrowLeft size={14} /> Back
        </button>
      </div>

      <form className="cn-form" onSubmit={submit} noValidate>
        {error && <div className="cn-error" role="alert">{error}</div>}

        <section className="dl-card cn-section">
          <h3>Note</h3>
          <div className="cn-grid">
            <div className="dl-field">
              <label>Note type</label>
              <div className="cn-segment">
                {Object.entries(NOTE_LABELS).map(([value, label]) => (
                  <button key={value} type="button" className={noteType === value ? "active" : ""} onClick={() => setNoteType(value)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="dl-field">
              <label>Issued for</label>
              <div className="cn-segment">
                {[["CUSTOMER", "Customer"], ["SUPPLIER", "Supplier"]].map(([value, label]) => (
                  <button key={value} type="button" className={partyType === value ? "active" : ""} onClick={() => { setPartyType(value); setPartyLedgerId(""); }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="dl-field">
              <label htmlFor="cn-date">Note date</label>
              <input id="cn-date" type="date" value={noteDate} onChange={(e) => setNoteDate(e.target.value)} />
            </div>

            <div className="dl-field">
              <label htmlFor="cn-reason">Reason</label>
              <select id="cn-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
                <optgroup label="Goods">
                  {REASONS.filter((r) => r.goods).map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </optgroup>
                <optgroup label="Not tied to goods">
                  {REASONS.filter((r) => !r.goods).map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </optgroup>
              </select>
            </div>
          </div>
        </section>

        <section className="dl-card cn-section">
          <h3>{partyType === "CUSTOMER" ? "Customer" : "Supplier"} and original document</h3>
          <div className="cn-grid">
            <div className="dl-field">
              <label htmlFor="cn-party">Name</label>
              <input id="cn-party" value={partyName} onChange={(e) => setPartyName(e.target.value)} maxLength={200} />
            </div>

            <div className="dl-field">
              <label htmlFor="cn-gstin">GSTIN (if registered)</label>
              <input id="cn-gstin" value={partyGstin} onChange={(e) => setPartyGstin(e.target.value.toUpperCase())} maxLength={15} />
            </div>

            <div className="dl-field">
              <label htmlFor="cn-pledger">Party ledger</label>
              <select id="cn-pledger" value={partyLedgerId} onChange={(e) => setPartyLedgerId(e.target.value)}>
                <option value="">
                  {partyLedgers.length ? "Select ledger" : `No ${partyType.toLowerCase()} ledgers found`}
                </option>
                {partyLedgers.map((l) => <option key={l._id} value={l._id}>{l.name} ({l.code})</option>)}
              </select>
            </div>

            <div className="dl-field">
              <label htmlFor="cn-aledger">Adjustment ledger</label>
              <select id="cn-aledger" value={adjustmentLedgerId} onChange={(e) => setAdjustmentLedgerId(e.target.value)}>
                <option value="">
                  {adjustmentLedgers.length ? "Select ledger" : "No income or expense ledgers found"}
                </option>
                {adjustmentLedgers.map((l) => <option key={l._id} value={l._id}>{l.name} ({l.code})</option>)}
              </select>
              <span className="cn-hint">{adjustmentHint}</span>
            </div>

            <div className="dl-field">
              <label htmlFor="cn-odoc">Original {partyType === "CUSTOMER" ? "invoice" : "bill"} no.</label>
              <input id="cn-odoc" value={originalDocNumber} onChange={(e) => setOriginalDocNumber(e.target.value)} maxLength={50} />
            </div>

            <div className="dl-field">
              <label htmlFor="cn-odate">Original date</label>
              <input id="cn-odate" type="date" value={originalDocDate} max={noteDate} onChange={(e) => setOriginalDocDate(e.target.value)} />
            </div>
          </div>

          <label className="cn-check">
            <input type="checkbox" checked={isInterState} onChange={(e) => setIsInterState(e.target.checked)} />
            Inter-state supply (charge IGST instead of CGST + SGST)
          </label>
        </section>

        <section className="dl-card cn-section">
          <h3>Adjustment lines</h3>
          <div className="dl-table-wrapper">
            <table className="dl-table cn-lines">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>HSN / SAC</th>
                  <th className="gs-num">Taxable amount</th>
                  <th>GST %</th>
                  <th className="gs-num">Tax</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => {
                  const r = preview.rows[i];
                  return (
                    <tr key={i}>
                      <td>
                        <input aria-label={`Line ${i + 1} description`} value={line.description} maxLength={300}
                          onChange={(e) => patchLine(i, { description: e.target.value })}
                          placeholder={reason === "PRICE_ADJUSTMENT" ? "Rate reduced from 120 to 110" : "Description"} />
                      </td>
                      <td>
                        <input aria-label={`Line ${i + 1} HSN or SAC`} value={line.hsnSac} maxLength={8}
                          onChange={(e) => patchLine(i, { hsnSac: e.target.value })} />
                      </td>
                      <td>
                        <input className="gs-num" aria-label={`Line ${i + 1} taxable amount`} inputMode="decimal"
                          value={line.amount} onChange={(e) => patchLine(i, { amount: e.target.value })} placeholder="0.00" />
                      </td>
                      <td>
                        <select aria-label={`Line ${i + 1} GST rate`} value={line.gstRate}
                          onChange={(e) => patchLine(i, { gstRate: Number(e.target.value) })}>
                          {GST_RATES.map((rate) => <option key={rate} value={rate}>{rate}%</option>)}
                        </select>
                      </td>
                      <td className="gs-num">{r.valid ? money(r.cgst + r.sgst + r.igst) : "-"}</td>
                      <td>
                        <button type="button" className="cn-icon" aria-label={`Remove line ${i + 1}`}
                          disabled={lines.length === 1} onClick={() => setLines((c) => c.filter((_, j) => j !== i))}>
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button type="button" className="dl-tool cn-add" onClick={() => setLines((c) => [...c, emptyLine()])}>
            <Plus size={14} /> Add line
          </button>

          <dl className="cn-totals">
            <div><dt>Taxable value</dt><dd>{money(preview.taxable)}</dd></div>
            {isInterState ? (
              <div><dt>IGST</dt><dd>{money(preview.igst)}</dd></div>
            ) : (
              <>
                <div><dt>CGST</dt><dd>{money(preview.cgst)}</dd></div>
                <div><dt>SGST</dt><dd>{money(preview.sgst)}</dd></div>
              </>
            )}
            <div className="cn-grand"><dt>Note total</dt><dd>{money(preview.total)}</dd></div>
          </dl>
        </section>

        <section className="dl-card cn-section">
          <div className="dl-field">
            <label htmlFor="cn-narr">Narration</label>
            <input id="cn-narr" value={narration} maxLength={1000} onChange={(e) => setNarration(e.target.value)} />
          </div>
        </section>

        <div className="cn-actions">
          <button type="button" className="dl-tool" onClick={() => navigate(-1)} disabled={saving}>Cancel</button>
          <button type="submit" className="so-primary-button" disabled={saving}>
            {saving ? "Posting..." : `Post ${NOTE_LABELS[noteType]}`}
          </button>
        </div>
      </form>
    </div>
  );
}