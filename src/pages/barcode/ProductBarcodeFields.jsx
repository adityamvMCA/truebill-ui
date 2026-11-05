import { useState } from "react";
import toast from "react-hot-toast";
import { ScanLine } from "lucide-react";
import ScanBarcodeModal from "./ScanBarcodeModal";
import "./barcode.css";

export const emptyBarcodeFields = {
  barcode: "",
  source: "MANUFACTURER",
  isBox: false,
  packName: "Box",
  units: "12",
};

/** Merge into the create-product payload: { ...form, ...barcodePayload(barcodeFields) } */
export const barcodePayload = (v) => {
  const code = String(v?.barcode || "").trim();
  if (!code) return {};
  return {
    barcode: code,
    barcodeSource: v.source,
    barcodePackagingName: v.isBox ? String(v.packName || "").trim() || "Box" : "Unit",
    barcodeUnitsPerPack: v.isBox ? Number(v.units) || 1 : 1,
  };
};

/** Validate before submit; returns an error string or "". */
export const barcodeFieldsError = (v) => {
  if (v?.barcode?.trim() && v.isBox && !(Number(v.units) > 1)) {
    return "Units per box must be more than 1";
  }
  return "";
};

export default function ProductBarcodeFields({ value, onChange }) {
  const [scanOpen, setScanOpen] = useState(false);
  const set = (patch) => onChange({ ...value, ...patch });

  return (
    <fieldset
      className="bcx-form"
      style={{ border: "1px solid var(--bcx-border)", borderRadius: 12 }}
    >
      <legend>Barcode (optional)</legend>

      <label>
        Barcode
        <div className="bcx-manual">
          <input
            className="bcx-input"
            value={value.barcode}
            maxLength={64}
            placeholder="Scan or type. Leave empty to auto-create an internal label"
            onChange={(e) => set({ barcode: e.target.value })}
          />
          <button type="button" className="bcx-btn" onClick={() => setScanOpen(true)}>
            <ScanLine size={15} /> Scan
          </button>
        </div>
      </label>

      {value.barcode.trim() && (
        <>
          <label>
            Source
            <select
              className="bcx-input"
              value={value.source}
              onChange={(e) => set({ source: e.target.value })}
            >
              <option value="MANUFACTURER">Manufacturer (printed on the product)</option>
              <option value="SUPPLIER">Supplier</option>
              <option value="GS1_ASSIGNED">GS1 assigned to my own product</option>
            </select>
          </label>

          <label className="bcx-check">
            <input
              type="checkbox"
              checked={value.isBox}
              onChange={(e) => set({ isBox: e.target.checked })}
            />
            This barcode is on a box / carton (many units)
          </label>

          {value.isBox && (
            <div className="bcx-row">
              <label>
                Pack name
                <input
                  className="bcx-input"
                  value={value.packName}
                  maxLength={60}
                  onChange={(e) => set({ packName: e.target.value })}
                />
              </label>
              <label>
                Units in pack
                <input
                  className="bcx-input"
                  type="number"
                  min="2"
                  step="any"
                  value={value.units}
                  onChange={(e) => set({ units: e.target.value })}
                />
              </label>
            </div>
          )}
        </>
      )}

      <ScanBarcodeModal
        open={scanOpen}
        title="Scan barcode"
        onClose={() => setScanOpen(false)}
        onFound={({ barcode, product }) =>
          toast.error(`${barcode} already belongs to ${product.name}`)
        }
        onUnknown={({ barcode }) => set({ barcode })}
      />
    </fieldset>
  );
}