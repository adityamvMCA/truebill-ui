import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeftRight, Boxes, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Input from "../../components/common/Form/Input";
import Select from "../../components/common/Form/Select";
import Textarea from "../../components/common/Form/Textarea";
import Button from "../../components/common/Form/Button";
import { FormCard, FormFooter, FormFull, FormGrid, PageHeader, SummaryPanel } from "../../components/common/FormPage";
import api from "../../services/api";
import warehouseApi from "../../services/modules/warehouseApi";
import warehouseStockApi from "../../services/modules/warehouseStockApi";
import stockTransferApi from "../../services/modules/stockTransferApi";
import { TRANSFER_BASE, getId, getErrorMessage, loadAllPages, localDate, quantityIsValid, stockBalanceIsValid, formatQuantity, formatPaise } from "./stockTransfer.utils";

let rowCounter = 0;
const newItem = () => ({ rowId: `transfer-item-${++rowCounter}`, productId: "", quantity: "" });
const newForm = () => ({ transferDate: localDate(), fromWarehouseId: "", toWarehouseId: "", notes: "" });

function StockTransferCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState(newForm);
  const [items, setItems] = useState(() => [newItem()]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [balances, setBalances] = useState(new Map());
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState("");
  const [balanceKey, setBalanceKey] = useState("");
  const [balanceReload, setBalanceReload] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState("");
  const submitLock = useRef(false);
  const requestId = useRef("");
  const lastAttempt = useRef(null);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  useEffect(() => {
    let cancelled = false;
    const current = () => !cancelled;
    const load = async () => {
      setLoading(true); setLoadError(""); setProducts([]); setWarehouses([]); setSettings(null);
      try {
        const response = await warehouseApi.getSettings();
        const inventory = response?.data?.data;
        if (!current()) return;
        if (!inventory?.defaultWarehouseId || !["READY", "NOT_INITIALIZED"].includes(inventory.warehouseTrackingStatus) || typeof inventory.multiWarehouseEnabled !== "boolean") throw new Error("Invalid inventory settings response.");
        setSettings(inventory);
        if (inventory.warehouseTrackingStatus !== "READY" || !inventory.multiWarehouseEnabled) return;
        const [productRows, warehouseRows] = await Promise.all([
          loadAllPages((params) => api.product.getAll(params), current),
          loadAllPages((params) => warehouseApi.getAll(params), current),
        ]);
        if (!current() || !productRows || !warehouseRows) return;
        const productList = productRows.filter((record) => record.type === "GOODS" && record.trackInventory === true && record.status === "ACTIVE" && !record.isDeleted);
        const warehouseList = warehouseRows.filter((record) => record.status === "ACTIVE");
        if (warehouseList.length < 2) throw new Error("At least two active warehouses are required.");
        setProducts(Array.from(new Map(productList.map((record) => [getId(record), record])).values()));
        setWarehouses(warehouseList);
        setForm((previous) => ({
          ...previous,
          fromWarehouseId: warehouseList.some((record) => getId(record) === previous.fromWarehouseId)
            ? previous.fromWarehouseId : getId(inventory.defaultWarehouseId),
          toWarehouseId: warehouseList.some((record) => getId(record) === previous.toWarehouseId) ? previous.toWarehouseId : "",
        }));
        if (!requestId.current) {
          if (!globalThis.crypto?.randomUUID) throw new Error("A secure browser context supporting crypto.randomUUID is required.");
          requestId.current = globalThis.crypto.randomUUID();
        }
      } catch (requestError) { if (current()) setLoadError(getErrorMessage(requestError)); }
      finally { if (current()) setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [reloadKey]);

  const productMap = useMemo(() => new Map(products.map((product) => [getId(product), product])), [products]);
  const source = warehouses.find((record) => getId(record) === form.fromWarehouseId);
  const destination = warehouses.find((record) => getId(record) === form.toWarehouseId);
  const ready = settings?.warehouseTrackingStatus === "READY" && settings?.multiWarehouseEnabled === true;
  const disabled = loading || saving || uncertain || Boolean(loadError) || !ready;
  const chosenIds = [...new Set(items.map((item) => item.productId).filter(Boolean))].sort().join(",");
  const expectedBalanceKey = `${form.fromWarehouseId}|${chosenIds}`;

  useEffect(() => {
    let cancelled = false;
    const current = () => !cancelled;
    const key = `${form.fromWarehouseId}|${chosenIds}`;
    setBalances(new Map()); setBalanceError(""); setBalanceKey("");
    if (!ready || !form.fromWarehouseId || !chosenIds || loading) { setBalanceLoading(false); return undefined; }
    const load = async () => {
      setBalanceLoading(true);
      try {
        const result = new Map();
        for (const id of chosenIds.split(",")) {
          const product = productMap.get(id);
          if (!product?.productCode) throw new Error("Selected Product is unavailable.");
          const rows = await loadAllPages((params) => warehouseStockApi.getByProduct(product.productCode, params), current);
          if (!current() || !rows) return;
          const matching = rows.filter((row) => getId(row.warehouseId) === form.fromWarehouseId);
          if (matching.length > 1) throw new Error(`Duplicate source balances for ${product.productCode}.`);
          const quantity = matching.length ? matching[0].currentStock : 0;
          if (!stockBalanceIsValid(quantity)) throw new Error(`Invalid source balance for ${product.productCode}.`);
          result.set(id, quantity);
        }
        if (current()) { setBalances(result); setBalanceKey(key); }
      } catch (requestError) { if (current()) setBalanceError(getErrorMessage(requestError)); }
      finally { if (current()) setBalanceLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [chosenIds, form.fromWarehouseId, productMap, ready, loading, balanceReload]);

  const sourceOptions = [{ value: "", label: "Select source warehouse" }, ...warehouses.map((record) => ({ value: getId(record), label: `${record.warehouseCode} — ${record.name}` }))];
  const destinationOptions = [{ value: "", label: "Select destination warehouse" }, ...warehouses.filter((record) => getId(record) !== form.fromWarehouseId).map((record) => ({ value: getId(record), label: `${record.warehouseCode} — ${record.name}` }))];
  const changeField = (event) => {
    if (disabled || submitLock.current) return;
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value, ...(name === "fromWarehouseId" && value === previous.toWarehouseId ? { toWarehouseId: "" } : {}) }));
    setError("");
  };
  const updateItem = (rowId, field, value) => {
    if (disabled || submitLock.current) return;
    setItems((previous) => previous.map((item) => item.rowId === rowId ? { ...item, [field]: value } : item));
    setError("");
  };
  let previewValue = 0n;
  let validPreview = true;
  for (const item of items) {
    const product = productMap.get(item.productId);
    const price = product?.purchasePrice;
    if (!quantityIsValid(item.quantity) || typeof price !== "number" || !Number.isFinite(price) || price < 0 || price > 1000000000 || !Number.isSafeInteger(Math.round(price * 100)) || Math.abs(price * 100 - Math.round(price * 100)) > 0.000001) { validPreview = false; continue; }
    previewValue += (BigInt(Math.round(Number(item.quantity) * 1000)) * BigInt(Math.round(price * 100)) + 500n) / 1000n;
  }

  const validateAndBuild = () => {
    if (!ready || loading || loadError) throw new Error("Load a ready multi-warehouse inventory before posting.");
    if (!source || !destination || form.fromWarehouseId === form.toWarehouseId) throw new Error("Select different active source and destination warehouses.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.transferDate)) throw new Error("Select a transfer date.");
    const date = new Date(`${form.transferDate}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== form.transferDate || form.transferDate > localDate()) throw new Error("Select a valid, non-future transfer date.");
    if (items.length < 1 || items.length > 100) throw new Error("Provide between 1 and 100 Products.");
    const seen = new Set();
    if (balanceLoading || balanceError || balanceKey !== expectedBalanceKey) throw new Error(balanceError || "Wait for source stock balances to load.");
    for (const [index, item] of items.entries()) {
      const product = productMap.get(item.productId);
      if (!product) throw new Error(`Select a Product for line ${index + 1}.`);
      if (seen.has(item.productId)) throw new Error("A Product can appear only once.");
      seen.add(item.productId);
      if (!quantityIsValid(item.quantity)) throw new Error(`Enter a valid quantity with at most three decimals for line ${index + 1}.`);
      if (!balances.has(item.productId)) throw new Error(`Source stock is unavailable for ${product.productCode}.`);
      if (Math.round(Number(item.quantity) * 1000) > Math.round(balances.get(item.productId) * 1000)) throw new Error(`Insufficient source stock for ${product.productCode}.`);
    }
    if (!validPreview || previewValue > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Check Product purchase prices and transfer reference value.");
    if (form.notes.trim().length > 500) throw new Error("Notes cannot exceed 500 characters.");
    if (!requestId.current) throw new Error("Transfer request ID is unavailable. Reload the form before submitting.");
    return {
      requestId: requestId.current,
      transferDate: form.transferDate,
      fromWarehouseId: form.fromWarehouseId,
      toWarehouseId: form.toWarehouseId,
      items: items.map((item) => ({ productId: item.productId, quantity: Number(item.quantity) })),
      notes: form.notes.trim() || null,
    };
  };

  const postPayload = async (payload) => {
    if (submitLock.current) return;
    submitLock.current = true; setSaving(true); setError("");
    lastAttempt.current = payload;
    let confirmed = false;
    try {
      const response = await stockTransferApi.create(payload);
      const record = response?.data?.data;
      if (response?.data?.success !== true || !record?._id || !record.transferNumber) {
        const responseError = new Error("The server did not return a confirmed transfer.");
        responseError.uncertainSave = true; throw responseError;
      }
      confirmed = true;
      toast.success(record.replayed ? `${record.transferNumber} was already posted; stock was not moved again` : `${record.transferNumber} posted successfully`);
      navigate(TRANSFER_BASE, { replace: true });
    } catch (requestError) {
      if (!mounted.current) return;
      const status = requestError?.response?.status;
      const unknown = confirmed || requestError.uncertainSave || !status || status === 408 || status >= 500;
      if (unknown) setUncertain(true);
      else if (!uncertain) setBalanceReload((previous) => previous + 1);
      const message = unknown
        ? "The transfer result is uncertain. Keep this form open and retry the exact same request, or inspect Stock Transfers before creating another one."
        : getErrorMessage(requestError);
      setError(message); toast.error(message);
    } finally {
      submitLock.current = false;
      if (mounted.current) setSaving(false);
    }
  };
  const handleSave = () => {
    if (disabled || submitLock.current) return;
    try { const payload = validateAndBuild(); return postPayload(payload); }
    catch (validationError) { setError(validationError.message); return undefined; }
  };
  const exit = () => {
    if (saving || submitLock.current) return;
    const dirty = items.some((item) => item.productId || item.quantity) || form.notes.trim();
    if ((dirty || uncertain) && !window.confirm(uncertain ? "Open the transfer list to verify the previous result? Do not create another transfer until it is verified." : "Discard this transfer and return to the list?")) return;
    navigate(TRANSFER_BASE);
  };

  return <div className="fp-page">
    <PageHeader title="New Stock Transfer" subtitle="Move stock between warehouses. Saving posts the transfer immediately." onBack={exit} />
    {loadError && <div className="section-form-api-error" role="alert"><p>{loadError}</p><Button type="button" variant="secondary" disabled={loading || saving || uncertain} onClick={() => setReloadKey((value) => value + 1)}>Retry Loading</Button></div>}
    {!loading && settings && !ready && <div className="section-form-api-error" role="alert">
      <p>{settings.warehouseTrackingStatus !== "READY" ? "Warehouse stock is not initialized. Complete controlled stock initialization before transferring." : "Multi-warehouse mode is disabled. An administrator must verify all stock-posting workflows and explicitly enable it before transfers can be created."}</p>
      <Button type="button" variant="secondary" onClick={() => navigate("/inventory/warehouses")}>View Warehouses</Button>
    </div>}
    <div className="fp-layout">
      <main className="fp-main">
        <FormCard title="Transfer Details" description="Choose source, destination and document date" icon={ArrowLeftRight}>
          <FormGrid columns={2}>
            <Select label="From Warehouse" name="fromWarehouseId" value={form.fromWarehouseId} options={sourceOptions} onChange={changeField} disabled={disabled} required />
            <Select label="To Warehouse" name="toWarehouseId" value={form.toWarehouseId} options={destinationOptions} onChange={changeField} disabled={disabled} required />
            <Input label="Transfer Date" name="transferDate" type="date" max={localDate()} value={form.transferDate} onChange={changeField} disabled={disabled} required />
            <Input label="Transfer Number" value="Auto-generated on save" readOnly />
          </FormGrid>
        </FormCard>
        {items.map((item, index) => {
          const product = productMap.get(item.productId);
          const quantity = Number(item.quantity);
          const available = balanceKey === expectedBalanceKey && balances.has(item.productId) ? balances.get(item.productId) : null;
          const insufficient = available !== null && quantityIsValid(item.quantity) && quantity > available;
          const options = [{ value: "", label: "Select Product" }, ...products.filter((record) => getId(record) === item.productId || !items.some((other) => other.rowId !== item.rowId && other.productId === getId(record))).map((record) => ({ value: getId(record), label: `${record.productCode} — ${record.name}` }))];
          return <FormCard key={item.rowId} title={`Product ${index + 1}`} description="Quantity is deducted from the source and added to the destination" icon={Boxes}>
            <FormGrid columns={2}>
              <FormFull><Select label="Product" value={item.productId} options={options} onChange={(event) => updateItem(item.rowId, "productId", event.target.value)} disabled={disabled} required /></FormFull>
              <Input label="Transfer Quantity" type="number" min="0.001" max="1000000" step="0.001" value={item.quantity} onChange={(event) => updateItem(item.rowId, "quantity", event.target.value)} disabled={disabled} required />
              <Input label="Source Available Stock" value={!product ? "—" : balanceLoading ? "Loading..." : available === null ? "—" : `${formatQuantity(available)} ${product.unit}`} readOnly />
              <Input label="Source Stock After" value={available !== null && quantityIsValid(item.quantity) ? `${formatQuantity((Math.round(available * 1000) - Math.round(quantity * 1000)) / 1000)} ${product?.unit || ""}` : "—"} readOnly />
              <Input label="Unit" value={product?.unit || "—"} readOnly />
              {insufficient && <FormFull><p className="fp-stock-warning">Insufficient source stock for this quantity.</p></FormFull>}
              <FormFull><Button type="button" variant="secondary" disabled={disabled || items.length === 1} onClick={() => { setItems((previous) => previous.filter((row) => row.rowId !== item.rowId)); setError(""); }}>Remove Product</Button></FormFull>
            </FormGrid>
          </FormCard>;
        })}
        {balanceError && <div className="section-form-api-error" role="alert"><p>{balanceError}</p><Button type="button" variant="secondary" disabled={disabled || balanceLoading} onClick={() => setBalanceReload((value) => value + 1)}>Retry Source Balances</Button></div>}
        <Button type="button" variant="secondary" disabled={disabled || items.length >= 100} onClick={() => setItems((previous) => [...previous, newItem()])}>Add Product</Button>
        <FormCard title="Notes" description="Optional transfer reason or handling information" icon={FileText}>
          <FormGrid columns={1}><Textarea label="Notes" name="notes" value={form.notes} onChange={changeField} rows={4} maxLength={500} disabled={disabled} placeholder="Example: Replenish shop stock from MAIN." /></FormGrid>
        </FormCard>
      </main>
      <SummaryPanel title="Transfer Summary" rows={[
        { label: "From", value: source?.name || "—" },
        { label: "To", value: destination?.name || "—" },
        { label: "Products", value: items.filter((item) => item.productId).length },
        { label: "Status After Save", value: "Posted" },
        { label: "Product Total Stock", value: "Unchanged" },
      ]} highlight={{ label: "Reference Value Preview", value: validPreview ? formatPaise(previewValue) : "—" }}>
        <p className="fp-stock-warning">Reference value uses current purchase prices. The server verifies stock and calculates final values when posting.</p>
        {uncertain && <>
          <Button type="button" variant="secondary" disabled={saving || !lastAttempt.current} onClick={() => postPayload(lastAttempt.current)}>Retry Same Request</Button>
          <Button type="button" variant="secondary" disabled={saving} onClick={exit}>Check Stock Transfers</Button>
        </>}
      </SummaryPanel>
    </div>
    <FormFooter onCancel={exit} onSubmit={handleSave} submitText={uncertain ? "Verify Previous Request" : "Post Stock Transfer"} saving={saving} error={error} />
  </div>;
}
export default StockTransferCreate;
