import { Check, Minus, Plus } from "lucide-react";
import "./barcode.css";

const fmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 });

/**
 * Reusable "product found – confirm quantity" sheet.
 *   pending = { barcode, product, packaging: { packagingName, conversionQuantity }, qty }
 *   onChange(qty)         – quantity edited
 *   onCancel()            – dismiss
 *   onConfirm(scanNext)   – add; scanNext=true re-opens the scanner
 */
export default function ScanConfirmSheet({ pending, onChange, onCancel, onConfirm, confirmText = "Add" }) {
  if (!pending) return null;
  const { product, packaging, barcode } = pending;
  const conv = Number(packaging?.conversionQuantity) || 1;
  const qty = Number(pending.qty) || 0;
  const set = (q) => onChange(Math.max(0, Math.round(Number(q || 0) * 1000) / 1000));

  return (
    <div className="bcx-sheet bcx-ui" role="dialog" aria-label="Confirm product">
      <div className="bcx-sheet-card is-found">
        <div className="bcx-sheet-tag ok"><Check size={14} /> Product found</div>
        <h3>{product.name}</h3>
        <p className="bcx-meta">
          {product.productCode} · {barcode}
          {packaging?.packagingName && packaging.packagingName !== "Unit" ? ` · ${packaging.packagingName}` : ""}
        </p>

        <div className="bcx-qty">
          <button type="button" className="bcx-icon-btn" onClick={() => set(qty - 1)} aria-label="Decrease"><Minus size={18} /></button>
          <input className="bcx-input" type="number" inputMode="decimal" min="0" step="any" value={pending.qty}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onConfirm(false)} aria-label="Quantity" />
          <button type="button" className="bcx-icon-btn" onClick={() => set(qty + 1)} aria-label="Increase"><Plus size={18} /></button>
        </div>

        {conv > 1 && (
          <p className="bcx-hint">
            {fmt.format(qty)} {packaging.packagingName} = {fmt.format(qty * conv)} {product.unit}
          </p>
        )}

        <div className="bcx-actions">
          <button type="button" className="bcx-btn" onClick={onCancel}>Cancel</button>
          <button type="button" className="bcx-btn" onClick={() => onConfirm(true)}>{confirmText} &amp; scan next</button>
          <button type="button" className="bcx-btn is-primary" onClick={() => onConfirm(false)}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}