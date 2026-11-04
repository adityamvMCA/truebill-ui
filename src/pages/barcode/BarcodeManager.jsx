import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Barcode, Plus, Printer, ScanLine, Wand2 } from "lucide-react";

import { apiError, barcodeApi } from "./barcodeApi";
import BcxModal from "./BcxModal";
import LinkBarcodeForm from "./LinkBarcodeForm";
import ScanBarcodeModal from "./ScanBarcodeModal";
import { LabelPrintDialog } from "./LabelPrint";
import "./barcode.css";

const SOURCE_LABEL = { MANUFACTURER: "Manufacturer", SUPPLIER: "Supplier", INTERNAL: "Internal", GS1_ASSIGNED: "GS1 assigned" };

/** Embed in the Product details / edit modal:  <BarcodeManager product={product} /> */
export default function BarcodeManager({ product }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(null); // { barcode }
  const [scanOpen, setScanOpen] = useState(false);
  const [printRows, setPrintRows] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows((await barcodeApi.byProduct(product._id)).data.data); }
    catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  }, [product._id]);
  useEffect(() => { load(); }, [load]);

  const generate = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await barcodeApi.generateInternal(product._id, { isPrimary: !rows.some((r) => r.isActive) });
      toast.success("Internal Code 128 barcode created");
      load();
    } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); }
  };

  const deactivate = async (row) => {
    if (!window.confirm(`Deactivate barcode ${row.barcode}? Scans will no longer find this product.`)) return;
    try { await barcodeApi.deactivate(row._id); load(); } catch (e) { toast.error(apiError(e)); }
  };

  const labelOf = (r) => ({ name: product.name, sku: product.productCode, packaging: r.packagingName, barcode: r.barcode, price: product.salePrice });
  const active = rows.filter((r) => r.isActive);

  return (
    <section className="bcx-manager">
      <header className="bcx-desktop-head">
        <h3><Barcode size={17} /> Barcodes</h3>
        <div className="bcx-tools">
          <button type="button" className="bcx-btn" onClick={() => setScanOpen(true)}><ScanLine size={15} /> Scan to add</button>
          <button type="button" className="bcx-btn" onClick={() => setAdding({ barcode: "" })}><Plus size={15} /> Add barcode</button>
          <button type="button" className="bcx-btn" onClick={generate} disabled={busy}><Wand2 size={15} /> Generate internal</button>
          <button type="button" className="bcx-btn" onClick={() => setPrintRows(active.map(labelOf))} disabled={!active.length}><Printer size={15} /> Print labels</button>
        </div>
      </header>

      <table className="bcx-table">
        <thead><tr><th>Barcode</th><th>Type</th><th>Source</th><th>Packaging</th><th className="r">Units</th><th>Status</th><th /></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r._id} className={r.isActive ? "" : "is-off"}>
              <td><strong>{r.barcode}</strong>{r.isPrimary && <span className="bcx-badge">Primary</span>}</td>
              <td>{r.barcodeType}</td>
              <td>{SOURCE_LABEL[r.source] || r.source}</td>
              <td>{r.packagingName}</td>
              <td className="r">{r.conversionQuantity}</td>
              <td>{r.isActive ? "Active" : "Inactive"}</td>
              <td className="bcx-row-actions">
                {r.isActive && <button type="button" className="bcx-link" onClick={() => setPrintRows([labelOf(r)])}>Print</button>}
                {r.isActive && <button type="button" className="bcx-link danger" onClick={() => deactivate(r)}>Deactivate</button>}
              </td>
            </tr>
          ))}
          {!loading && !rows.length && <tr><td colSpan={7} className="bcx-empty">No barcodes yet. Scan one, add one, or generate an internal barcode.</td></tr>}
          {loading && <tr><td colSpan={7} className="bcx-empty">Loading…</td></tr>}
        </tbody>
      </table>

      <BcxModal open={Boolean(adding)} title="Add barcode / packaging" onClose={() => setAdding(null)}>
        {adding && <LinkBarcodeForm barcode={adding.barcode} product={product} lockProduct onCancel={() => setAdding(null)} onDone={() => { setAdding(null); load(); }} />}
      </BcxModal>

      <ScanBarcodeModal open={scanOpen} title="Scan barcode to add" onClose={() => setScanOpen(false)}
        onFound={({ barcode, product: p }) => toast.error(`${barcode} is already linked to ${p.name}`)}
        onUnknown={({ barcode }) => setAdding({ barcode })} />

      <LabelPrintDialog open={Boolean(printRows)} labels={printRows || []} onClose={() => setPrintRows(null)} />
    </section>
  );
}
