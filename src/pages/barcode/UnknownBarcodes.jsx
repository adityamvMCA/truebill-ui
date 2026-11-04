import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { apiError, barcodeApi } from "./barcodeApi";
import BcxModal from "./BcxModal";
import LinkBarcodeForm from "./LinkBarcodeForm";
import "./barcode.css";

/** Pending unknown-barcode inbox for later processing. */
export default function UnknownBarcodes() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ data: [], pagination: { totalPages: 1, total: 0 } });
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData((await barcodeApi.unknown({ page, limit: 20 })).data); }
    catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  }, [page]);
  useEffect(() => { load(); }, [load]);

  return (
    <section className="bcx-manager">
      <header className="bcx-desktop-head"><h3>Unknown barcodes ({data.pagination.total})</h3></header>
      <table className="bcx-table">
        <thead><tr><th>Barcode</th><th className="r">Times scanned</th><th>Last seen</th><th /></tr></thead>
        <tbody>
          {data.data.map((u) => (
            <tr key={u._id}>
              <td><strong>{u.barcode}</strong></td>
              <td className="r">{u.seenCount}</td>
              <td>{new Date(u.updatedAt).toLocaleString("en-IN")}</td>
              <td className="bcx-row-actions">
                <button type="button" className="bcx-link" onClick={() => setLinking(u.barcode)}>Link to product</button>
                <button type="button" className="bcx-link" onClick={() => navigate("/products", { state: { newBarcode: u.barcode } })}>Create product</button>
              </td>
            </tr>
          ))}
          {!loading && !data.data.length && <tr><td colSpan={4} className="bcx-empty">No pending unknown barcodes.</td></tr>}
        </tbody>
      </table>
      <div className="bcx-pager">
        <button type="button" className="bcx-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
        <span>Page {page} of {Math.max(1, data.pagination.totalPages)}</span>
        <button type="button" className="bcx-btn" disabled={page >= data.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>
      <BcxModal open={Boolean(linking)} title="Link barcode to product" onClose={() => setLinking(null)}>
        {linking && <LinkBarcodeForm barcode={linking} lockBarcode onCancel={() => setLinking(null)} onDone={() => { setLinking(null); load(); }} />}
      </BcxModal>
    </section>
  );
}
