import { useEffect, useState } from "react";
import BoxModal from "../../components/common/Modal/BoxModal";
import Input from "../../components/common/Form/Input";
import Textarea from "../../components/common/Form/Textarea";
import Button from "../../components/common/Form/Button";
import stockTransferApi from "../../services/modules/stockTransferApi";
import { formatDate, formatPaise, formatQuantity, getErrorMessage } from "./stockTransfer.utils";

function StockTransferDetailsModal({ isOpen, transferNumber, onClose }) {
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    if (!isOpen || !transferNumber) return undefined;
    let cancelled = false;
    const load = async () => {
      setLoading(true); setError(""); setRecord(null);
      try {
        const response = await stockTransferApi.getByNumber(transferNumber);
        const data = response?.data?.data;
        if (!data?._id || !data.transferNumber || !Array.isArray(data.items)) throw new Error("The server returned invalid transfer details.");
        if (!cancelled) setRecord(data);
      } catch (requestError) { if (!cancelled) setError(getErrorMessage(requestError)); }
      finally { if (!cancelled) setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [isOpen, transferNumber, reloadKey]);
  return (
    <BoxModal show={isOpen} onClose={onClose} title="Stock Transfer Details" subtitle={transferNumber || ""} width="min(900px, calc(100vw - 24px))"
      footer={<Button type="button" variant="secondary" onClick={onClose}>Close</Button>}>
      {loading && <div className="section-info-box" role="status">Loading stock transfer…</div>}
      {error && <div className="section-form-api-error" role="alert"><p>{error}</p><Button type="button" variant="secondary" onClick={() => setReloadKey((value) => value + 1)}>Retry</Button></div>}
      {record && <>
        <div className="box-modal-section">
          <div className="box-modal-form-grid">
            <Input label="Transfer Number" value={record.transferNumber} readOnly />
            <Input label="Transfer Date" value={formatDate(record.transferDate)} readOnly />
            <Input label="Source Warehouse" value={`${record.fromWarehouseCode} — ${record.fromWarehouseName}`} readOnly />
            <Input label="Destination Warehouse" value={`${record.toWarehouseCode} — ${record.toWarehouseName}`} readOnly />
            <Input label="Status" value={record.status} readOnly />
            <Input label="Reference Value" value={formatPaise(record.totalValuePaise)} readOnly />
          </div>
        </div>
        {record.items.map((item, index) => <div className="box-modal-section" key={String(item.productId)}>
          <div className="box-modal-section-header"><div className="box-modal-section-header-content"><h3>{index + 1}. {item.productName}</h3><p>{item.productCode}</p></div></div>
          <div className="box-modal-form-grid">
            <Input label="Transferred Quantity" value={`${formatQuantity(item.quantity)} ${item.unit}`} readOnly />
            <Input label="Reference Unit Rate" value={formatPaise(item.unitRatePaise)} readOnly />
            <Input label="Source Before" value={`${formatQuantity(item.sourceStockBefore)} ${item.unit}`} readOnly />
            <Input label="Source After" value={`${formatQuantity(item.sourceStockAfter)} ${item.unit}`} readOnly />
            <Input label="Destination Before" value={`${formatQuantity(item.destinationStockBefore)} ${item.unit}`} readOnly />
            <Input label="Destination After" value={`${formatQuantity(item.destinationStockAfter)} ${item.unit}`} readOnly />
            <Input label="Product Total — Unchanged" value={`${formatQuantity(item.aggregateStock)} ${item.unit}`} readOnly />
            <Input label="Line Reference Value" value={formatPaise(item.totalValuePaise)} readOnly />
          </div>
        </div>)}
        {record.notes && <Textarea label="Notes" value={record.notes} rows={3} readOnly />}
      </>}
    </BoxModal>
  );
}
export default StockTransferDetailsModal;
