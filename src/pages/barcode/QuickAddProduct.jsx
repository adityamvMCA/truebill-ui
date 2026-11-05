import { useState } from "react";
import toast from "react-hot-toast";
import { apiError, createProductQuick } from "./barcodeApi";

/**
 * Create a product from an unknown scanned barcode WITHOUT leaving the scanner session.
 * - "Single item" barcode -> one unit barcode
 * - "Box / carton" barcode -> pack of N units; an internal Code 128 unit label is auto-created
 * Needs the `product.create` permission and a unit that exists in your Unit master.
 */
export default function QuickAddProduct({ barcode, onDone, onCancel }) {
  const [f, setF] = useState({ name: "", unit: "PCS", salePrice: "", purchasePrice: "" });
  const [isBox, setIsBox] = useState(false);
  const [packName, setPackName] = useState("Box");
  const [units, setUnits] = useState("100");
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (f.name.trim().length < 2) return toast.error("Enter product name");
    if (!f.unit.trim()) return toast.error("Enter unit");
    if (isBox && !(Number(units) > 1)) return toast.error("Units per box must be more than 1");

    setSaving(true);
    try {
      const { data } = await createProductQuick({
        name: f.name.trim(),
        type: "GOODS",
        unit: f.unit.trim().toUpperCase(),
        salePrice: Number(f.salePrice) || 0,
        purchasePrice: Number(f.purchasePrice) || 0,
        barcode,
        barcodeSource: "MANUFACTURER",
        barcodePackagingName: isBox ? packName.trim() || "Box" : "Unit",
        barcodeUnitsPerPack: isBox ? Number(units) : 1,
      });
      toast.success("Product created");
      onDone?.(data.data);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="bcx-form" onSubmit={submit}>
      <label>Product name
        <input className="bcx-input" value={f.name} onChange={set("name")} maxLength={200} autoFocus />
      </label>

      <div className="bcx-row">
        <label>Unit
          <input className="bcx-input" value={f.unit} onChange={set("unit")} maxLength={20} />
        </label>
        <label>Sale price
          <input className="bcx-input" type="number" inputMode="decimal" min="0" step="0.01" value={f.salePrice} onChange={set("salePrice")} />
        </label>
        <label>Purchase price
          <input className="bcx-input" type="number" inputMode="decimal" min="0" step="0.01" value={f.purchasePrice} onChange={set("purchasePrice")} />
        </label>
      </div>

      <label className="bcx-check">
        <input type="checkbox" checked={isBox} onChange={(e) => setIsBox(e.target.checked)} />
        This barcode is on a box / carton (contains many units)
      </label>

      {isBox && (
        <>
          <div className="bcx-tools">
            {[["Box", 12], ["Carton", 100], ["Pack", 10]].map(([n, q]) => (
              <button key={n} type="button" className="bcx-chip" onClick={() => { setPackName(n); setUnits(String(q)); }}>
                {n}
              </button>
            ))}
          </div>
          <div className="bcx-row">
            <label>Pack name
              <input className="bcx-input" value={packName} onChange={(e) => setPackName(e.target.value)} maxLength={60} />
            </label>
            <label>Units in pack
              <input className="bcx-input" type="number" inputMode="decimal" min="2" step="any" value={units} onChange={(e) => setUnits(e.target.value)} />
            </label>
          </div>
          <p className="bcx-hint">
            Scanning this barcode will add {units || "N"} {f.unit || "units"} per scan. A separate internal label
            is also created so single items can be labelled.
          </p>
        </>
      )}

      <div className="bcx-actions">
        <button type="button" className="bcx-btn" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="bcx-btn is-primary" disabled={saving}>{saving ? "Saving…" : "Create & continue"}</button>
      </div>
    </form>
  );
}