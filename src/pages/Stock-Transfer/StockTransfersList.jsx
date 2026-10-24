import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import DataList from "../../components/common/DataList/DataList";
import Button from "../../components/common/Form/Button";
import StatusField from "../../components/common/StatusField/StatusField";
import stockTransferApi from "../../services/modules/stockTransferApi";
import StockTransferDetailsModal from "./StockTransferDetailsModal";
import { TRANSFER_BASE, formatDate, formatPaise, getErrorMessage, loadAllPages } from "./stockTransfer.utils";

function StockTransfersList() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedNumber, setSelectedNumber] = useState("");
  const requestRef = useRef(0);
  const load = useCallback(async () => {
    const requestId = ++requestRef.current;
    const current = () => requestId === requestRef.current;
    setLoading(true); setError("");
    try {
      const rows = await loadAllPages((params) => stockTransferApi.getAll(params), current);
      if (!current() || !rows) return;
      if (rows.some((record) => !record._id || !record.transferNumber)) throw new Error("Invalid stock transfer list.");
      const ids = new Set(rows.map((record) => String(record._id)));
      if (ids.size !== rows.length) throw new Error("Duplicate report rows were returned. Refresh the list.");
      setRecords(rows);
    } catch (requestError) { if (current()) { setRecords([]); setError(getErrorMessage(requestError)); } }
    finally { if (current()) setLoading(false); }
  }, []);
  useEffect(() => { load(); return () => { requestRef.current += 1; }; }, [load]);
  const columns = useMemo(() => [
    { key: "transferNumber", label: "Transfer Number", sortable: true, render: (value) => <button type="button" className="doc-link-button" onClick={(event) => { event.stopPropagation(); setSelectedNumber(value); }}>{value}</button> },
    { key: "transferDate", label: "Transfer Date", sortable: true, render: formatDate },
    { key: "fromWarehouseName", label: "From Warehouse", sortable: true, render: (value, row) => <div className="dl-customer"><strong>{value}</strong><span>{row.fromWarehouseCode}</span></div> },
    { key: "toWarehouseName", label: "To Warehouse", sortable: true, render: (value, row) => <div className="dl-customer"><strong>{value}</strong><span>{row.toWarehouseCode}</span></div> },
    { key: "itemCount", label: "Products", type: "number", sortable: true },
    { key: "totalValuePaise", label: "Reference Value", type: "number", sortable: true, render: formatPaise },
    { key: "status", label: "Status", sortable: true, render: (value) => <StatusField value={value} /> },
    { key: "notes", label: "Notes", visible: false, render: (value) => value || "—" },
  ], []);
  return <>
    {error && <div className="section-form-api-error" role="alert"><p>{error}</p><Button type="button" variant="secondary" disabled={loading} onClick={load}>Retry</Button></div>}
    <DataList title="Stock Transfers" subtitle="Move inventory between warehouses without changing total Product stock"
      columns={columns} data={records} loading={loading} rowKey="_id" showCase="list"
      searchable filterable sortable selectable={false} columnVisibility pagination storageKey="trustiq-stock-transfers"
      searchPlaceholder="Search transfer number, warehouse or notes..."
      actions={{ view: (row) => setSelectedNumber(row.transferNumber) }} onRefresh={load}
      addButton={<button type="button" className="so-primary-button" disabled={loading} onClick={() => navigate(`${TRANSFER_BASE}/new`)}><Plus size={16} /><span>New Stock Transfer</span></button>} />
    <StockTransferDetailsModal isOpen={Boolean(selectedNumber)} transferNumber={selectedNumber} onClose={() => setSelectedNumber("")} />
  </>;
}
export default StockTransfersList;
