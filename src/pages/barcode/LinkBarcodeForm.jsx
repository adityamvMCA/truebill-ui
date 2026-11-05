import { useState } from "react";
import toast from "react-hot-toast";
import { apiError, barcodeApi } from "./barcodeApi";
import ProductPicker from "./ProductPicker";

const SOURCES = [
  { v: "MANUFACTURER", l: "Manufacturer (printed on the product)" },
  { v: "SUPPLIER", l: "Supplier" },
  { v: "GS1_ASSIGNED", l: "GS1 assigned to my own product" },
  { v: "INTERNAL", l: "Internal (not a GS1 barcode)" },
];

// quick fill for the most common packagings – the user can still edit both fields
const PRESETS = [["Unit", 1], ["Pack", 10], ["Box", 12], ["Carton", 100]];

export default function LinkBarcodeForm({ barcode = "", lockBarcode = false, product = null, lockProduct = false, onDone, onCancel }) {
  const [code, setCode] = useState(barcode);
  const [picked, setPicked] = useState(product);
  const [source, setSource] = useState("MANUFACTURER");
  const [packagingName, setPackagingName] = useState("Unit");
  const [qty, setQty] = useState("1");
  const [primary, setPrimary] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!picked?._id) return toast.error("Select a product");
    if (!code.trim()) return toast.error("Enter a barcode");
    const conversionQuantity = Number(qty);
    if (!(conversionQuantity > 0)) return toast.error("Units in this pack must be positive");

    setSaving(true);
    try {
      const { data } = await barcodeApi.register({
        productId: picked._id, barcode: code.trim(), source,
        packagingName: packagingName.trim() || "Unit", conversionQuantity, isPrimary: primary,
      });
      toast.success("Barcode linked");
      onDone?.(data.data, picked);
    } catch (err) {
      toast.error(apiError(err));
    } finally { setSaving(false); }
  };

  return (
    <form className="bcx-form" onSubmit={submit}>
      <label>Barcode
        <input className="bcx-input" value={code} onChange={(e) => setCode(e.target.value)} disabled={lockBarcode || saving} maxLength={64} />
      </label>
      <label>Product
        <ProductPicker value={picked} onChange={setPicked} disabled={lockProduct || saving} />
      </label>
      <label>Source
        <select className="bcx-input" value={source} onChange={(e) => setSource(e.target.value)} disabled={saving}>
          {SOURCES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
        </select>
      </label>
      {source === "GS1_ASSIGNED" && <p className="bcx-hint">Enter only GTINs officially assigned to you by GS1. Never type made-up EAN-13 numbers.</p>}

      <div className="bcx-tools">
        {PRESETS.map(([n, q]) => (
          <button key={n} type="button" className="bcx-chip" disabled={saving}
            onClick={() => { setPackagingName(n); setQty(String(q)); }}>
            {n}
          </button>
        ))}
      </div>

      <div className="bcx-row">
        <label>Packaging
          <input className="bcx-input" value={packagingName} onChange={(e) => setPackagingName(e.target.value)} maxLength={60} placeholder="Unit, Pack 200g, Carton of 20" disabled={saving} />
        </label>
        <label>Units in this pack
          <input className="bcx-input" type="number" min="0.001" step="0.001" value={qty} onChange={(e) => setQty(e.target.value)} disabled={saving} />
        </label>
      </div>
      <p className="bcx-hint">Example: a box barcode holding 100 pieces → Packaging “Box”, Units 100. Each scan adds 100 pieces.</p>

      <label className="bcx-check">
        <input type="checkbox" checked={primary} onChange={(e) => setPrimary(e.target.checked)} /> Primary barcode for this product
      </label>
      <div className="bcx-actions">
        {onCancel && <button type="button" className="bcx-btn" onClick={onCancel} disabled={saving}>Cancel</button>}
        <button type="submit" className="bcx-btn is-primary" disabled={saving}>{saving ? "Saving…" : "Link barcode"}</button>
      </div>
    </form>
  );
}