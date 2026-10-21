import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  FileText,
  Loader2,
  PackageCheck,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Truck,
} from "lucide-react";

import { useEffect, useMemo, useRef, useState } from "react";

import toast from "react-hot-toast";

import Button from "../../components/common/Form/Button";
import Input from "../../components/common/Form/Input";
import Textarea from "../../components/common/Form/Textarea";
import BoxModal from "../../components/common/Modal/BoxModal";
import StatusField from "../../components/common/StatusField/StatusField";

import api from "../../services/api";

import {
  createRequestId,
  dateInputValue,
  fetchAllPages,
  formatDate,
  formatMoney,
  formatQuantity,
  getDocument,
  getErrorMessage,
  getId,
  isCancelledRequest,
  localToday,
  rupeesToPaise,
  toMilli,
} from "./goodsReceipt.utils";

const initialForm = () => ({
  creationMode: "PURCHASE_ORDER",
  orderNumber: "",
  supplierId: "",
  receiptDate: localToday(),
  supplierDeliveryReference: "",
  notes: "",
});

const newDirectLine = (key) => ({
  key,
  productId: "",
  quantity: "",
  estimatedRate: "",
  notes: "",
});

function GoodsReceiptModal({
  isOpen,
  onClose,
  onSave,
  editData = null,
  mode = "create",
}) {
  const isView = mode === "view";

  const [form, setForm] = useState(initialForm);
  const [order, setOrder] = useState(null);
  const [orderLines, setOrderLines] = useState([]);
  const [directLines, setDirectLines] = useState([]);

  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [document, setDocument] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loadingMasters, setLoadingMasters] = useState(false);
  const [saving, setSaving] = useState(false);

  const [inlineError, setInlineError] = useState("");
  const [retryOnly, setRetryOnly] = useState(false);

  const requestRef = useRef(null);
  const masterRequestRef = useRef(null);
  const attemptRef = useRef(null);

  const savingRef = useRef(false);
  const loadingRef = useRef(false);
  const lineCounterRef = useRef(0);

  const isDirect = form.creationMode === "DIRECT";
  const busy = loading || saving || loadingMasters;
  const locked = busy || retryOnly;

  const productMap = useMemo(
    () => new Map(products.map((product) => [getId(product), product])),
    [products],
  );

  useEffect(() => {
    if (!isOpen) return undefined;

    requestRef.current?.abort();

    const controller = new AbortController();
    requestRef.current = controller;

    setForm(initialForm());
    setOrder(null);
    setOrderLines([]);
    setDocument(null);
    setSuppliers([]);
    setProducts([]);
    setInlineError("");
    setRetryOnly(false);

    lineCounterRef.current = 1;
    setDirectLines([newDirectLine(1)]);

    attemptRef.current = null;
    loadingRef.current = false;

    if (!isView) {
      setLoading(false);
      return () => controller.abort();
    }

    const loadDetails = async () => {
      try {
        setLoading(true);
        loadingRef.current = true;

        if (!editData?.receiptNumber) {
          throw new Error("Receipt number is missing");
        }

        const response = await api.goodsReceipt.getByNumber(
          editData.receiptNumber,
          { signal: controller.signal },
        );

        const result = getDocument(response);

        if (!result?._id) {
          throw new Error("Goods Receipt details were not returned");
        }

        if (!controller.signal.aborted) {
          setDocument(result);
        }
      } catch (error) {
        if (!isCancelledRequest(error) && !controller.signal.aborted) {
          setInlineError(getErrorMessage(error));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          loadingRef.current = false;
        }
      }
    };

    loadDetails();

    return () => controller.abort();
  }, [isOpen, isView, editData?.receiptNumber]);

  useEffect(() => {
    if (!isOpen || isView || !isDirect) {
      setLoadingMasters(false);
      return undefined;
    }

    const controller = new AbortController();
    masterRequestRef.current = controller;

    const loadMasters = async () => {
      try {
        setLoadingMasters(true);
        setInlineError("");

        const [supplierRecords, productRecords] = await Promise.all([
          fetchAllPages(api.goodsReceipt.getSuppliers, {}, controller.signal),

          fetchAllPages(api.goodsReceipt.getProducts, {}, controller.signal),
        ]);

        if (controller.signal.aborted) return;

        setSuppliers(
          supplierRecords.filter(
            (supplier) => !supplier.isDeleted && supplier.status === "Active",
          ),
        );

        setProducts(
          productRecords.filter(
            (product) => !product.isDeleted && product.status === "ACTIVE",
          ),
        );
      } catch (error) {
        if (!isCancelledRequest(error) && !controller.signal.aborted) {
          setInlineError(getErrorMessage(error));
          toast.error(getErrorMessage(error));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingMasters(false);
        }
      }
    };

    loadMasters();

    return () => {
      controller.abort();
    };
  }, [isOpen, isView, isDirect]);

  useEffect(
    () => () => {
      requestRef.current?.abort();
      masterRequestRef.current?.abort();
    },
    [],
  );

  const changeMode = (creationMode) => {
    if (locked || creationMode === form.creationMode) return;

    setForm((previous) => ({
      ...previous,
      creationMode,
      orderNumber: "",
      supplierId: "",
    }));

    setOrder(null);
    setOrderLines([]);
    setInlineError("");
    attemptRef.current = null;
  };

  const changeForm = (event) => {
    if (locked) return;

    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (name === "orderNumber") {
      setOrder(null);
      setOrderLines([]);
    }
  };

  const loadOrder = async () => {
    if (loadingRef.current || savingRef.current || retryOnly) return;

    const orderNumber = form.orderNumber.trim();

    if (!orderNumber) {
      toast.error("Enter a Purchase Order number");
      return;
    }

    requestRef.current?.abort();

    const controller = new AbortController();
    requestRef.current = controller;

    try {
      loadingRef.current = true;
      setLoading(true);
      setInlineError("");
      setOrder(null);
      setOrderLines([]);
      attemptRef.current = null;

      const response = await api.goodsReceipt.getOrderByNumber(orderNumber, {
        signal: controller.signal,
      });

      const loadedOrder = getDocument(response);

      if (!loadedOrder?._id) {
        throw new Error("Purchase Order was not returned");
      }

      if (!["CREATED", "PARTIALLY_RECEIVED"].includes(loadedOrder.status)) {
        throw new Error(
          "Select a CREATED or PARTIALLY_RECEIVED Purchase Order",
        );
      }

      if (
        !Number.isSafeInteger(loadedOrder.__v) ||
        !Array.isArray(loadedOrder.items) ||
        loadedOrder.items.length === 0
      ) {
        throw new Error("The Purchase Order has incomplete receipt data");
      }

      const receipts = await fetchAllPages(
        api.goodsReceipt.getAll,
        { sourceOrderId: loadedOrder._id },
        controller.signal,
      );

      const received = new Map();

      for (const receipt of receipts) {
        if (receipt.status !== "CREATED") continue;

        for (const item of receipt.items || []) {
          const key = getId(item.orderLineId);

          received.set(key, (received.get(key) || 0) + toMilli(item.quantity));
        }
      }

      const prepared = loadedOrder.items.map((item) => {
        const lineId = getId(item.lineId);

        if (!lineId) {
          throw new Error("A Purchase Order line is missing its lineId");
        }

        const orderedMilli = toMilli(item.quantity);
        const receivedMilli = received.get(lineId) || 0;

        if (receivedMilli > orderedMilli) {
          throw new Error(
            `Receipt history is inconsistent for ${item.productName}`,
          );
        }

        return {
          ...item,
          orderLineId: lineId,
          receivedMilli,
          remainingMilli: orderedMilli - receivedMilli,
          selected: false,
          receiveQuantity: "",
          receiptNotes: "",
        };
      });

      if (controller.signal.aborted) return;

      setOrder(loadedOrder);
      setOrderLines(prepared);

      setForm((previous) => ({
        ...previous,
        orderNumber: loadedOrder.orderNumber,

        receiptDate:
          previous.receiptDate < dateInputValue(loadedOrder.orderDate)
            ? dateInputValue(loadedOrder.orderDate)
            : previous.receiptDate,
      }));
    } catch (error) {
      if (!isCancelledRequest(error) && !controller.signal.aborted) {
        setInlineError(getErrorMessage(error));
        toast.error(getErrorMessage(error));
      }
    } finally {
      if (!controller.signal.aborted) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  };

  const changeOrderLine = (orderLineId, updates) => {
    if (locked) return;

    setOrderLines((previous) =>
      previous.map((line) =>
        line.orderLineId === orderLineId ? { ...line, ...updates } : line,
      ),
    );
  };

  const changeDirectLine = (key, updates) => {
    if (locked) return;

    setDirectLines((previous) =>
      previous.map((line) =>
        line.key === key ? { ...line, ...updates } : line,
      ),
    );
  };

  const addDirectLine = () => {
    if (locked || directLines.length >= 200) return;

    lineCounterRef.current += 1;

    setDirectLines((previous) => [
      ...previous,
      newDirectLine(lineCounterRef.current),
    ]);
  };

  const removeDirectLine = (key) => {
    if (locked || directLines.length === 1) return;

    setDirectLines((previous) => previous.filter((line) => line.key !== key));
  };

  const chooseProduct = (key, productId) => {
    changeDirectLine(key, {
      productId,
      estimatedRate: "",
    });
  };

  const selectAllRemaining = () => {
    if (locked) return;

    setOrderLines((previous) =>
      previous.map((line) =>
        line.remainingMilli > 0
          ? {
              ...line,
              selected: true,
              receiveQuantity: String(line.remainingMilli / 1000),
            }
          : line,
      ),
    );
  };

  const selectedCount = isDirect
    ? directLines.filter((line) => line.productId).length
    : orderLines.filter((line) => line.selected).length;

  const buildPayload = () => {
    if (!form.receiptDate) {
      throw new Error("Receipt date is required");
    }

    const common = {
      creationMode: form.creationMode,
      receiptDate: form.receiptDate,
      supplierDeliveryReference: form.supplierDeliveryReference.trim() || null,
      notes: form.notes.trim() || null,
    };

    if (isDirect) {
      if (!form.supplierId) {
        throw new Error("Select a supplier");
      }

      if (!directLines.length || directLines.length > 200) {
        throw new Error("Add between 1 and 200 receipt lines");
      }

      const seen = new Set();

      const items = directLines.map((line, index) => {
        const product = productMap.get(line.productId);

        if (!product) {
          throw new Error(`Select a product on row ${index + 1}`);
        }

        if (seen.has(line.productId)) {
          throw new Error("A product can appear only once in a direct receipt");
        }

        seen.add(line.productId);

        const quantityMilli = toMilli(line.quantity);

        if (quantityMilli <= 0 || quantityMilli > 1000000000) {
          throw new Error(`Enter a valid quantity on row ${index + 1}`);
        }

        return {
          productId: line.productId,
          quantity: quantityMilli / 1000,
          estimatedUnitRatePaise: rupeesToPaise(line.estimatedRate),
          notes: line.notes.trim() || null,
        };
      });

      return {
        ...common,
        supplierId: form.supplierId,
        items,
      };
    }

    if (!order?._id) {
      throw new Error("Load a Purchase Order first");
    }

    if (form.receiptDate < dateInputValue(order.orderDate)) {
      throw new Error("Receipt date cannot precede order date");
    }

    const selected = orderLines.filter((line) => line.selected);

    if (!selected.length) {
      throw new Error("Select at least one order line");
    }

    const items = selected.map((line) => {
      const quantityMilli = toMilli(line.receiveQuantity);

      if (
        quantityMilli <= 0 ||
        quantityMilli > line.remainingMilli ||
        quantityMilli > 1000000000
      ) {
        throw new Error(
          `Enter a valid remaining quantity for ${line.productName}`,
        );
      }

      return {
        orderLineId: line.orderLineId,
        quantity: quantityMilli / 1000,
        notes: line.receiptNotes.trim() || null,
      };
    });

    return {
      ...common,
      sourceOrderId: order._id,
      sourceOrderVersion: order.__v,
      items,
    };
  };

  const handleSave = async () => {
    if (savingRef.current || loadingRef.current || loadingMasters || isView) {
      return;
    }

    let payload;

    try {
      if (retryOnly && attemptRef.current) {
        payload = attemptRef.current.payload;
      } else {
        const data = buildPayload();
        const signature = JSON.stringify(data);

        if (attemptRef.current?.signature !== signature) {
          attemptRef.current = {
            signature,

            payload: {
              ...data,
              requestId: createRequestId(),
            },
          };
        }

        payload = attemptRef.current.payload;
      }
    } catch (error) {
      toast.error(error.message);
      return;
    }

    let savedReceipt;

    try {
      savingRef.current = true;
      setSaving(true);
      setInlineError("");

      const response = await api.goodsReceipt.create(payload);
      savedReceipt = getDocument(response);

      if (!savedReceipt?._id || savedReceipt.status !== "CREATED") {
        throw new Error("The server did not return a valid Goods Receipt");
      }

      setRetryOnly(false);
      attemptRef.current = null;

      toast.success(
        response?.data?.replayed
          ? "This Goods Receipt was already recorded"
          : "Goods Receipt created successfully",
      );
    } catch (error) {
      const status = error?.response?.status;

      const uncertain = !error?.response || status >= 500 || status === 408;

      setRetryOnly(uncertain);
      setInlineError(getErrorMessage(error));
      toast.error(getErrorMessage(error));

      return;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }

    try {
      await onSave?.(savedReceipt);
    } catch (error) {
      console.error("Receipt saved, but list refresh failed:", error);
      toast.error("Receipt was saved. Refresh the list to see it.");
    }

    onClose?.();
  };

  const handleClose = () => {
    if (savingRef.current || loadingRef.current || loadingMasters) return;

    if (retryOnly) {
      toast.error(
        "Retry the same submission first to confirm whether it was recorded.",
      );
      return;
    }

    onClose?.();
  };

  const footer = (
    <div className="gr-modal-footer">
      <span className="gr-footer-note">
        <ShieldCheck size={15} />
        {isView
          ? "Created receipts are read-only"
          : "Stock updates automatically when this receipt is created"}
      </span>

      <div className="gr-footer-actions">
        <Button
          type="button"
          variant="secondary"
          onClick={handleClose}
          disabled={busy || retryOnly}
        >
          {isView ? "Close" : "Cancel"}
        </Button>

        {!isView && (
          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            loading={saving}
            disabled={busy || (!retryOnly && !isDirect && !order)}
          >
            {saving
              ? "Creating Receipt..."
              : retryOnly
                ? "Retry Same Submission"
                : "Create Goods Receipt"}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <BoxModal
      show={isOpen}
      onClose={handleClose}
      title={isView ? "Goods Receipt Details" : "Create Goods Receipt"}
      subtitle={
        isView
          ? "Review the receipt, supplier, and stock movement references"
          : "Receive against a Purchase Order or record a direct receipt"
      }
      width="min(1140px, calc(100vw - 24px))"
      footer={footer}
    >
      <div
        className={`gr-modal-content ${isView ? "gr-modal-content--view" : ""}`}
      >
        {inlineError && (
          <Notice type="error" title="Request could not be completed">
            {inlineError}
          </Notice>
        )}

        {retryOnly && (
          <Notice type="warning" title="Submission status is not confirmed">
            Retry the same submission. Its request ID is preserved while this
            modal remains open to avoid creating another receipt.
          </Notice>
        )}

        {isView ? (
          loading ? (
            <div className="gr-empty-state">
              <Loader2 size={28} className="gr-spin" />
              <p>Loading Goods Receipt...</p>
            </div>
          ) : document ? (
            <>
              <section className="gr-panel">
                <div className="gr-view-heading">
                  <div>
                    <span className="gr-eyebrow">GOODS RECEIPT</span>
                    <h3>{document.receiptNumber}</h3>
                    <p>{document.supplierName}</p>
                  </div>

                  <StatusField value={document.status} />
                </div>

                <div className="gr-detail-grid">
                  <Detail
                    label="Receipt Date"
                    value={formatDate(document.receiptDate)}
                  />

                  <Detail
                    label="Receipt Type"
                    value={
                      document.creationMode === "PURCHASE_ORDER"
                        ? "Purchase Order"
                        : "Direct Receipt"
                    }
                  />

                  <Detail
                    label="Purchase Order"
                    value={document.sourceOrderNumber}
                  />

                  <Detail label="Supplier Code" value={document.supplierCode} />

                  <Detail
                    label="Delivery Reference"
                    value={document.supplierDeliveryReference}
                  />

                  <Detail
                    label="Stock Movements"
                    value={String(document.stockMovementIds?.length || 0)}
                  />
                </div>
              </section>

              <section className="gr-panel">
                <SectionHeading
                  icon={PackageCheck}
                  title="Received Items"
                  subtitle="Tracked goods update inventory; services record acceptance only"
                />

                <div className="gr-view-items">
                  {document.items?.map((item) => (
                    <div className="gr-view-item" key={getId(item.lineId)}>
                      <div className="gr-product-copy">
                        <strong>{item.productName}</strong>
                        <span>
                          {item.productCode} · {item.unit}
                        </span>

                        <span
                          className={`gr-badge ${
                            item.trackInventory
                              ? "gr-badge--green"
                              : "gr-badge--neutral"
                          }`}
                        >
                          {item.trackInventory
                            ? "Inventory received"
                            : item.productType === "SERVICE"
                              ? "Service accepted"
                              : "Non-stock goods"}
                        </span>

                        {item.notes && (
                          <span className="gr-item-note">{item.notes}</span>
                        )}
                      </div>

                      <Metric
                        label="Received"
                        value={`${formatQuantity(item.quantity)} ${item.unit}`}
                      />

                      <Metric
                        label="Estimated Unit Rate"
                        value={formatMoney(item.estimatedUnitRatePaise)}
                      />
                    </div>
                  ))}
                </div>

                <p className="gr-small-note">
                  Receipt rates are provisional and tax-exclusive. This document
                  does not create an accounting journal.
                </p>
              </section>

              {document.notes && (
                <section className="gr-panel">
                  <SectionHeading
                    icon={FileText}
                    title="Receipt Notes"
                    subtitle="Instructions and delivery observations"
                  />

                  <p className="gr-notes-text">{document.notes}</p>
                </section>
              )}
            </>
          ) : null
        ) : (
          <>
            <div className="gr-mode-grid">
              <ModeCard
                icon={ClipboardList}
                title="Against Purchase Order"
                description="Receive ordered items with quantity controls"
                active={!isDirect}
                disabled={locked}
                onClick={() => changeMode("PURCHASE_ORDER")}
              />

              <ModeCard
                icon={Truck}
                title="Direct Receipt"
                description="Record delivery without a Purchase Order"
                active={isDirect}
                disabled={locked}
                onClick={() => changeMode("DIRECT")}
              />
            </div>

            <section className="gr-panel">
              <SectionHeading
                icon={isDirect ? Truck : ClipboardList}
                title={
                  isDirect ? "Supplier Information" : "Select Purchase Order"
                }
                subtitle={
                  isDirect
                    ? "Choose the supplier delivering these items"
                    : "Load an order to see quantities still available for receipt"
                }
              />

              {isDirect ? (
                loadingMasters ? (
                  <div className="gr-inline-loading">
                    <Loader2 size={18} className="gr-spin" />
                    Loading suppliers and products...
                  </div>
                ) : (
                  <SelectField
                    label="Supplier"
                    value={form.supplierId}
                    onChange={(event) =>
                      changeForm({
                        target: {
                          name: "supplierId",
                          value: event.target.value,
                        },
                      })
                    }
                    disabled={locked}
                    required
                  >
                    <option value="">Select supplier</option>

                    {suppliers.map((supplier) => (
                      <option key={getId(supplier)} value={getId(supplier)}>
                        {supplier.supplierCode} — {supplier.supplierName}
                      </option>
                    ))}
                  </SelectField>
                )
              ) : (
                <>
                  <div className="gr-order-search">
                    <Input
                      label="Purchase Order Number"
                      name="orderNumber"
                      value={form.orderNumber}
                      onChange={changeForm}
                      placeholder="Enter the exact Purchase Order number"
                      disabled={locked}
                      required
                    />

                    <Button
                      type="button"
                      variant="primary"
                      onClick={loadOrder}
                      loading={loading}
                      disabled={locked || !form.orderNumber.trim()}
                    >
                      <span className="gr-button-content">
                        <Search size={16} />
                        {loading ? "Loading..." : "Load Order"}
                      </span>
                    </Button>
                  </div>

                  {order && (
                    <div className="gr-source-card">
                      <CheckCircle2 size={21} />

                      <div>
                        <strong>{order.orderNumber}</strong>
                        <span>
                          {formatDate(order.orderDate)} ·{" "}
                          {order.status.replace(/_/g, " ")}
                        </span>

                        <span>Supplier ID: {getId(order.supplierId)}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>

            <section className="gr-panel">
              <SectionHeading
                icon={FileText}
                title="Delivery Information"
                subtitle="Record the receipt date and supplier delivery reference"
              />

              <div className="gr-form-grid">
                <Input
                  label="Receipt Date"
                  type="date"
                  name="receiptDate"
                  value={form.receiptDate}
                  min={
                    !isDirect && order
                      ? dateInputValue(order.orderDate)
                      : undefined
                  }
                  onChange={changeForm}
                  disabled={locked}
                  required
                />

                <Input
                  label="Supplier Delivery Reference"
                  name="supplierDeliveryReference"
                  value={form.supplierDeliveryReference}
                  onChange={changeForm}
                  placeholder="Delivery challan / reference number"
                  maxLength={100}
                  disabled={locked}
                />
              </div>
            </section>

            {isDirect ? (
              <section className="gr-panel">
                <div className="gr-section-toolbar">
                  <SectionHeading
                    icon={PackageCheck}
                    title="Receipt Items"
                    subtitle="Select products and enter quantities actually received"
                  />

                  <button
                    type="button"
                    className="gr-text-button"
                    onClick={addDirectLine}
                    disabled={locked || directLines.length >= 200}
                  >
                    <Plus size={15} />
                    Add Item
                  </button>
                </div>

                <div className="gr-direct-lines">
                  {directLines.map((line, index) => {
                    const product = productMap.get(line.productId);

                    const tracksStock =
                      product?.type === "GOODS" &&
                      Boolean(product?.trackInventory);

                    return (
                      <div className="gr-direct-card" key={line.key}>
                        <div className="gr-direct-card-heading">
                          <strong>Item {index + 1}</strong>

                          <button
                            type="button"
                            className="gr-icon-button gr-icon-button--danger"
                            aria-label={`Remove item ${index + 1}`}
                            onClick={() => removeDirectLine(line.key)}
                            disabled={locked || directLines.length === 1}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="gr-direct-grid">
                          <div className="gr-product-select">
                            <SelectField
                              label="Product / Service"
                              value={line.productId}
                              onChange={(event) =>
                                chooseProduct(line.key, event.target.value)
                              }
                              disabled={locked}
                              required
                            >
                              <option value="">
                                Select product or service
                              </option>

                              {products.map((item) => (
                                <option key={getId(item)} value={getId(item)}>
                                  {item.productCode} — {item.name}
                                </option>
                              ))}
                            </SelectField>

                            {product && (
                              <span
                                className={`gr-product-hint ${
                                  tracksStock ? "gr-product-hint--stock" : ""
                                }`}
                              >
                                {product.unit} ·{" "}
                                {tracksStock
                                  ? "Increases inventory"
                                  : product.type === "SERVICE"
                                    ? "Service acceptance"
                                    : "Non-stock goods"}
                              </span>
                            )}
                          </div>

                          <Input
                            label="Quantity"
                            type="number"
                            min="0.001"
                            max="1000000"
                            step="0.001"
                            value={line.quantity}
                            onChange={(event) =>
                              changeDirectLine(line.key, {
                                quantity: event.target.value,
                              })
                            }
                            disabled={locked}
                            required
                          />

                          <Input
                            label="Est. Unit Rate (₹)"
                            type="number"
                            min="0"
                            max="1000000000"
                            step="0.01"
                            value={line.estimatedRate}
                            onChange={(event) =>
                              changeDirectLine(line.key, {
                                estimatedRate: event.target.value,
                              })
                            }
                            placeholder="0.00"
                            disabled={locked}
                            required
                          />

                          <div className="gr-full-width">
                            <Input
                              label="Item Notes"
                              value={line.notes}
                              onChange={(event) =>
                                changeDirectLine(line.key, {
                                  notes: event.target.value,
                                })
                              }
                              maxLength={500}
                              placeholder="Condition, service acceptance, or delivery observations"
                              disabled={locked}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="gr-small-note">
                  Enter the provisional tax-exclusive rate. The API receives
                  this amount in paise; the form converts it automatically.
                </p>
              </section>
            ) : order ? (
              <section className="gr-panel">
                <div className="gr-section-toolbar">
                  <SectionHeading
                    icon={PackageCheck}
                    title="Order Items"
                    subtitle="Choose which lines to receive in this delivery"
                  />

                  <button
                    type="button"
                    className="gr-text-button"
                    onClick={selectAllRemaining}
                    disabled={locked}
                  >
                    Receive All Remaining
                  </button>
                </div>

                <div className="gr-order-lines">
                  {orderLines.map((line) => {
                    const unavailable = line.remainingMilli === 0;

                    return (
                      <div
                        key={line.orderLineId}
                        className={[
                          "gr-order-card",
                          line.selected ? "gr-order-card--selected" : "",
                          unavailable ? "gr-order-card--disabled" : "",
                        ].join(" ")}
                      >
                        <div className="gr-order-card-top">
                          <div className="gr-order-product">
                            <input
                              type="checkbox"
                              aria-label={`Receive ${line.productName}`}
                              checked={line.selected}
                              disabled={locked || unavailable}
                              onChange={(event) =>
                                changeOrderLine(line.orderLineId, {
                                  selected: event.target.checked,
                                })
                              }
                            />

                            <div className="gr-product-copy">
                              <strong>{line.productName}</strong>
                              <span>
                                {line.productCode} · {line.unit}
                              </span>

                              {line.productType === "SERVICE" && (
                                <span className="gr-badge gr-badge--neutral">
                                  Service acceptance
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="gr-quantity-grid">
                            <Metric
                              label="Ordered"
                              value={formatQuantity(line.quantity)}
                            />

                            <Metric
                              label="Received"
                              value={formatQuantity(line.receivedMilli / 1000)}
                            />

                            <Metric
                              label="Remaining"
                              value={formatQuantity(line.remainingMilli / 1000)}
                              highlighted
                            />
                          </div>
                        </div>

                        <div className="gr-order-entry-grid">
                          <Input
                            label="Receive Now"
                            type="number"
                            min="0.001"
                            max={line.remainingMilli / 1000}
                            step="0.001"
                            value={line.receiveQuantity}
                            onChange={(event) =>
                              changeOrderLine(line.orderLineId, {
                                receiveQuantity: event.target.value,
                              })
                            }
                            disabled={locked || unavailable || !line.selected}
                            placeholder="0.000"
                          />

                          <Input
                            label="Item Notes"
                            value={line.receiptNotes}
                            onChange={(event) =>
                              changeOrderLine(line.orderLineId, {
                                receiptNotes: event.target.value,
                              })
                            }
                            maxLength={500}
                            placeholder="Delivery condition / acceptance notes"
                            disabled={locked || unavailable || !line.selected}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : (
              <div className="gr-empty-state">
                <ClipboardList size={34} />
                <h3>Load a Purchase Order</h3>
                <p>Its remaining quantities will appear here.</p>
              </div>
            )}

            <section className="gr-panel">
              <SectionHeading
                icon={FileText}
                title="Receipt Notes"
                subtitle="Additional delivery instructions or observations"
              />

              <Textarea
                label="Notes"
                name="notes"
                value={form.notes}
                onChange={changeForm}
                rows={3}
                maxLength={2000}
                placeholder="Enter receipt notes..."
                disabled={locked}
              />
            </section>
          </>
        )}
      </div>
    </BoxModal>
  );
}

function SectionHeading({ icon: Icon, title, subtitle }) {
  return (
    <div className="gr-section-heading">
      <div className="gr-section-icon">
        <Icon size={18} />
      </div>

      <div>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function ModeCard({
  icon: Icon,
  title,
  description,
  active,
  disabled,
  onClick,
}) {
  return (
    <button
      type="button"
      className={`gr-mode-card ${active ? "gr-mode-card--active" : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
    >
      <Icon size={22} />

      <div>
        <strong>{title}</strong>
        <span>{description}</span>
      </div>

      <span className="gr-mode-indicator">
        {active && <CheckCircle2 size={18} />}
      </span>
    </button>
  );
}

function SelectField({ label, required, children, ...props }) {
  return (
    <label className="gr-select-field">
      <span>
        {label}
        {required && <em> *</em>}
      </span>

      <select {...props} required={required}>
        {children}
      </select>
    </label>
  );
}

function Notice({ type, title, children }) {
  return (
    <div
      className={`gr-notice gr-notice--${type}`}
      role={type === "error" ? "alert" : "status"}
    >
      {type === "info" ? <ShieldCheck size={19} /> : <AlertCircle size={19} />}

      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="gr-detail">
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

function Metric({ label, value, highlighted = false }) {
  return (
    <div className={`gr-metric ${highlighted ? "gr-metric--highlight" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default GoodsReceiptModal;
