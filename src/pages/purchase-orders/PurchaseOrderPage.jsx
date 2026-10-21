import { useEffect, useMemo, useRef, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import {
  ArrowLeft,
  ChevronDown,
  FileText,
  LockKeyhole,
  Plus,
  Save,
  Search,
  StickyNote,
  Trash2,
} from "lucide-react";

import toast from "react-hot-toast";

import api from "../../services/api";

import Input from "../../components/common/Form/Input";
import Select from "../../components/common/Form/Select";
import Textarea from "../../components/common/Form/Textarea";
import Button from "../../components/common/Form/Button";
import StatusField from "../../components/common/StatusField/StatusField";

import {
  PURCHASE_ORDER_BASE,
  GST_RATES,
  TAX_OPTIONS,
  EMPTY_TOTALS,
  calculatePreview,
  dateValue,
  fetchAllPages,
  formatPaise,
  getDocument,
  getErrorMessage,
  getId,
  localDate,
  orderPath,
  scaledInteger,
  storedPreview,
} from "./purchaseOrder.utils";

import "../../styles/invoice-common1.css";
import "./PurchaseOrders.css";

let rowCounter = 0;

const newItem = () => ({
  rowId: `po-item-${++rowCounter}`,
  productId: "",
  quantity: "1",
  unitRate: "0",
  discountPercent: "0",
  gstRate: 0,
  specification: "",
});

const initialForm = () => ({
  creationMode: "DIRECT",
  quotationNumber: "",
  supplierId: "",
  orderDate: localDate(),
  expectedDeliveryDate: "",
  taxMode: "NONE",
  paymentTerms: "",
  deliveryTerms: "",
  deliveryAddress: "",
  termsAndConditions: "",
  notes: "",
});

const mapItems = (records = []) =>
  records.map((item) => ({
    ...item,
    rowId: `po-item-${++rowCounter}`,
    productId: getId(item.productId),
    quantity: String(item.quantity),
    unitRate: String(item.unitRatePaise / 100),
    discountPercent: String(item.discountPercent ?? 0),
    gstRate: item.gstRate ?? 0,
    specification: item.specification || "",
  }));

function PurchaseOrderPage({ mode = "create" }) {
  const navigate = useNavigate();
  const { orderNumber } = useParams();

  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isCreate = mode === "create";

  const [form, setForm] = useState(initialForm);
  const [items, setItems] = useState(() => [newItem()]);

  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);

  const [order, setOrder] = useState(null);
  const [quotation, setQuotation] = useState(null);

  const [loading, setLoading] = useState(true);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const [uncertainResult, setUncertainResult] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [dirty, setDirty] = useState(false);

  const submitLock = useRef(false);
  const sourceLock = useRef(false);
  const mountedRef = useRef(false);

  const quotationBased = form.creationMode === "QUOTATION";

  const sourceLocked = quotationBased || isView;

  const editable = isCreate || (isEdit && order?.status === "CREATED");

  const disabled =
    loading ||
    loadFailed ||
    saving ||
    sourceLoading ||
    uncertainResult ||
    !editable;

  useEffect(() => {
    let cancelled = false;
    mountedRef.current = true;

    const loadPage = async () => {
      setLoading(true);
      setLoadFailed(false);
      setError("");
      setOrder(null);
      setQuotation(null);
      setDirty(false);
      setUncertainResult(false);
      setShowNotes(false);

      if (isCreate) {
        setForm(initialForm());
        setItems([newItem()]);
      }

      try {
        const [supplierRecords, productRecords, response] = await Promise.all([
          fetchAllPages(api.purchaseOrder.getSuppliers, "suppliers"),

          isView
            ? Promise.resolve([])
            : fetchAllPages(api.purchaseOrder.getProducts, "products"),

          isCreate
            ? Promise.resolve(null)
            : api.purchaseOrder.getByNumber(orderNumber),
        ]);

        if (cancelled) return;

        setSuppliers(supplierRecords);
        setProducts(productRecords);

        if (!isCreate) {
          const document = getDocument(response);

          if (!document?._id) {
            throw new Error("Purchase Order was not returned");
          }

          setOrder(document);

          setForm({
            creationMode: document.creationMode,
            quotationNumber: document.sourceQuotationNumber || "",
            supplierId: getId(document.supplierId),
            orderDate: dateValue(document.orderDate),
            expectedDeliveryDate: dateValue(document.expectedDeliveryDate),
            taxMode: document.taxMode,
            paymentTerms: document.paymentTerms || "",
            deliveryTerms: document.deliveryTerms || "",
            deliveryAddress: document.deliveryAddress || "",
            termsAndConditions: document.termsAndConditions || "",
            notes: document.notes || "",
          });

          setItems(mapItems(document.items));
          setShowNotes(Boolean(document.notes));

          if (isEdit && document.status !== "CREATED") {
            setError("This order is no longer editable. Open it in view mode.");
          }
        }
      } catch (requestError) {
        if (cancelled) return;

        setLoadFailed(true);
        setError(getErrorMessage(requestError));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPage();

    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, [isCreate, isEdit, isView, orderNumber]);

  const selectedSupplier = useMemo(
    () => suppliers.find((supplier) => getId(supplier) === form.supplierId),
    [suppliers, form.supplierId],
  );

  const productMap = useMemo(() => {
    const map = new Map();

    // Existing snapshots ensure read-only documents remain readable
    // even if a product is now inactive or absent from the master list.
    for (const item of items) {
      if (!item.productId) continue;

      map.set(item.productId, {
        _id: item.productId,
        name: item.productName,
        productCode: item.productCode,
        type: item.productType,
        unit: item.unit,
        hsnSacCode: item.hsnSacCode,
      });
    }

    for (const product of products) {
      map.set(getId(product), product);
    }

    return map;
  }, [products, items]);

  const previews = useMemo(
    () =>
      items.map((item) =>
        sourceLocked
          ? storedPreview(item)
          : calculatePreview(item, form.taxMode),
      ),
    [items, sourceLocked, form.taxMode],
  );

  const totals = useMemo(
    () =>
      previews.reduce(
        (result, preview) => {
          for (const key of Object.keys(EMPTY_TOTALS)) {
            result[key] += preview[key];
          }

          return result;
        },
        { ...EMPTY_TOTALS },
      ),
    [previews],
  );

  const supplierOptions = useMemo(
    () =>
      suppliers
        .filter(
          (supplier) =>
            getId(supplier) === form.supplierId ||
            (supplier.status === "Active" && !supplier.isDeleted),
        )
        .map((supplier) => ({
          value: getId(supplier),
          label: `${supplier.supplierName} (${supplier.supplierCode})`,
        })),
    [suppliers, form.supplierId],
  );

  const changeField = (event) => {
    if (disabled) return;

    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setDirty(true);
    setError("");
  };

  const changeMode = (event) => {
    if (!isCreate || disabled) return;

    const creationMode = event.target.value;

    setForm({
      ...initialForm(),
      creationMode,
    });

    setItems([newItem()]);
    setQuotation(null);
    setDirty(true);
    setError("");
  };

  const changeSupplier = (event) => {
    if (disabled || sourceLocked || !isCreate) return;

    const supplier = suppliers.find(
      (record) => getId(record) === event.target.value,
    );

    setForm((previous) => ({
      ...previous,
      supplierId: event.target.value,
      paymentTerms: supplier?.paymentTerms || "",
    }));

    setDirty(true);
    setError("");
  };

  const changeTaxMode = (event) => {
    if (disabled || sourceLocked) return;

    const taxMode = event.target.value;

    setForm((previous) => ({
      ...previous,
      taxMode,
    }));

    setItems((previous) =>
      previous.map((item) => ({
        ...item,
        gstRate:
          taxMode === "NONE"
            ? 0
            : (productMap.get(item.productId)?.gstRate ?? 0),
      })),
    );

    setDirty(true);
    setError("");
  };

  const updateItem = (rowId, field, value) => {
    if (disabled || sourceLocked) return;

    setItems((previous) =>
      previous.map((item) =>
        item.rowId === rowId ? { ...item, [field]: value } : item,
      ),
    );

    setDirty(true);
    setError("");
  };

  const selectProduct = (rowId, productId) => {
    if (disabled || sourceLocked) return;

    const product = productMap.get(productId);

    setItems((previous) =>
      previous.map((item) =>
        item.rowId === rowId
          ? {
              ...item,

              // A changed product needs a new backend lineId.
              lineId: item.productId === productId ? item.lineId : undefined,

              productId,
              productName: product?.name || "",
              productCode: product?.productCode || "",
              productType: product?.type || "",
              unit: product?.unit || "",
              hsnSacCode: product?.hsnSacCode || "",

              unitRate: String(product?.purchasePrice ?? 0),

              gstRate: form.taxMode === "NONE" ? 0 : (product?.gstRate ?? 0),
            }
          : item,
      ),
    );

    setDirty(true);
    setError("");
  };

  const loadQuotation = async () => {
    if (sourceLock.current || disabled || !isCreate || !quotationBased) {
      return;
    }

    const quotationNumber = form.quotationNumber.trim();

    if (!quotationNumber) {
      toast.error("Enter a Supplier Quotation number");
      return;
    }

    try {
      sourceLock.current = true;
      setSourceLoading(true);
      setError("");

      const response =
        await api.purchaseOrder.getQuotationByNumber(quotationNumber);

      const document = getDocument(response);

      if (
        !document?._id ||
        document.status !== "CREATED" ||
        !Number.isSafeInteger(document.__v)
      ) {
        throw new Error("Select an active CREATED supplier quotation");
      }

      if (!mountedRef.current) return;

      setQuotation(document);

      setForm((previous) => ({
        ...previous,
        quotationNumber: document.quotationNumber,
        supplierId: getId(document.supplierId),
        taxMode: document.taxMode,
        paymentTerms: document.paymentTerms || "",
        deliveryTerms: document.deliveryTerms || "",
        termsAndConditions: document.termsAndConditions || "",

        orderDate:
          previous.orderDate < dateValue(document.quotationDate)
            ? dateValue(document.quotationDate)
            : previous.orderDate,
      }));

      setItems(mapItems(document.items));
      setDirty(true);
    } catch (requestError) {
      if (!mountedRef.current) return;

      setQuotation(null);
      setItems([newItem()]);
      setError(getErrorMessage(requestError));
      toast.error(getErrorMessage(requestError));
    } finally {
      sourceLock.current = false;

      if (mountedRef.current) {
        setSourceLoading(false);
      }
    }
  };

  const validate = () => {
    if (!form.orderDate) {
      throw new Error("Order date is required");
    }

    if (
      form.expectedDeliveryDate &&
      form.expectedDeliveryDate < form.orderDate
    ) {
      throw new Error("Expected delivery date cannot precede order date");
    }

    if (quotationBased && isCreate && !quotation) {
      throw new Error("Load a supplier quotation first");
    }

    if (
      quotation &&
      (form.orderDate < dateValue(quotation.quotationDate) ||
        (quotation.validUntil &&
          form.orderDate > dateValue(quotation.validUntil)))
    ) {
      throw new Error("Order date is outside the quotation validity");
    }

    if (!form.supplierId) {
      throw new Error("Select a supplier");
    }

    if (!items.length || items.length > 200) {
      throw new Error("Provide between 1 and 200 order items");
    }

    if (!quotationBased) {
      items.forEach((item, index) => {
        const product = productMap.get(item.productId);

        if (
          !product ||
          product.status !== "ACTIVE" ||
          product.isDeleted ||
          !previews[index].valid
        ) {
          throw new Error(
            `Check the active product, quantity, price, discount, and GST on item ${index + 1}`,
          );
        }
      });
    }

    if (
      totals.total <= 0 ||
      Object.values(totals).some(
        (amount) => !Number.isSafeInteger(amount) || amount < 0,
      )
    ) {
      throw new Error("The order requires a positive supported total");
    }
  };

  const buildPayload = () => {
    const common = {
      orderDate: form.orderDate,
      expectedDeliveryDate: form.expectedDeliveryDate || null,
      deliveryAddress: form.deliveryAddress.trim() || null,
      notes: form.notes.trim() || null,
    };

    if (isEdit && quotationBased) {
      return {
        ...common,
        version: order.__v,
      };
    }

    if (isCreate && quotationBased) {
      return {
        ...common,
        creationMode: "QUOTATION",
        sourceQuotationId: quotation._id,
        sourceQuotationVersion: quotation.__v,
      };
    }

    const commercial = {
      taxMode: form.taxMode,
      paymentTerms: form.paymentTerms.trim() || null,
      deliveryTerms: form.deliveryTerms.trim() || null,
      termsAndConditions: form.termsAndConditions.trim() || null,

      items: items.map((item) => ({
        ...(item.lineId ? { lineId: item.lineId } : {}),

        productId: item.productId,
        quantity: Number(item.quantity),
        unitRatePaise: scaledInteger(item.unitRate, 100),
        discountPercent: Number(item.discountPercent),
        gstRate: form.taxMode === "NONE" ? 0 : Number(item.gstRate),
        specification: item.specification.trim() || null,
      })),
    };

    return isEdit
      ? {
          ...common,
          ...commercial,
          version: order.__v,
        }
      : {
          ...common,
          ...commercial,
          creationMode: "DIRECT",
          supplierId: form.supplierId,
        };
  };

  const saveOrder = async () => {
    if (disabled || submitLock.current) return;

    let payload;

    try {
      validate();
      payload = buildPayload();
    } catch (validationError) {
      setError(validationError.message);
      toast.error(validationError.message);
      return;
    }

    let savedOrder;

    try {
      submitLock.current = true;
      setSaving(true);
      setError("");

      const response = isEdit
        ? await api.purchaseOrder.update(order.orderNumber, payload)
        : await api.purchaseOrder.create(payload);

      savedOrder = getDocument(response);

      if (!savedOrder?.orderNumber) {
        throw new Error(
          "The server did not return an order number. Verify the order list before resubmitting.",
        );
      }
    } catch (requestError) {
      const status = requestError?.response?.status;

      if (!status || status >= 500 || status === 408) {
        setUncertainResult(true);
      }

      setError(getErrorMessage(requestError));
      toast.error(getErrorMessage(requestError));
      return;
    } finally {
      submitLock.current = false;
      setSaving(false);
    }

    setDirty(false);

    toast.success(
      isEdit
        ? "Purchase Order updated successfully"
        : "Purchase Order created successfully",
    );

    navigate(orderPath(savedOrder.orderNumber), { replace: true });
  };

  const exitPage = () => {
    if (submitLock.current || sourceLock.current) return;

    if (
      dirty &&
      !window.confirm(
        uncertainResult
          ? "The order may already have been saved. Open the list to verify it?"
          : "Discard unsaved changes and return to Purchase Orders?",
      )
    ) {
      return;
    }

    navigate(PURCHASE_ORDER_BASE);
  };

  const saveButton = (
    <Button
      type="button"
      icon={Save}
      disabled={disabled}
      loading={saving}
      onClick={saveOrder}
    >
      {isEdit ? "Update Order" : "Create Order"}
    </Button>
  );

  const address = selectedSupplier
    ? [
        selectedSupplier.billingAddress,
        selectedSupplier.city,
        selectedSupplier.state,
        selectedSupplier.pincode,
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  return (
    <div
      className={`doc-page po-document-page ${isView ? "doc-detail-page" : ""}`}
    >
      <form noValidate onSubmit={(event) => event.preventDefault()}>
        <header className="doc-header">
          <div className="doc-header-left">
            <Button
              type="button"
              variant="secondary"
              icon={ArrowLeft}
              disabled={saving || sourceLoading}
              onClick={exitPage}
            >
              Exit
            </Button>

            <div className="doc-title">
              <FileText size={19} />
              <span>
                {isView
                  ? order?.orderNumber || "Purchase Order"
                  : isEdit
                    ? "Edit Purchase Order"
                    : "Create Purchase Order"}
              </span>
            </div>
          </div>

          <div className="doc-header-actions">
            {order && <StatusField value={order.status} />}

            {isView && order?.status === "CREATED" && (
              <Button
                type="button"
                onClick={() => navigate(orderPath(order.orderNumber, "edit"))}
              >
                Edit Order
              </Button>
            )}

            {!isView && saveButton}
          </div>
        </header>

        {(loading || error || uncertainResult) && (
          <div className="doc-alerts">
            {loading && (
              <div className="doc-alert" role="status">
                Loading Purchase Order information...
              </div>
            )}

            {error && (
              <div className="doc-alert doc-alert-error" role="alert">
                {error}
              </div>
            )}

            {uncertainResult && (
              <div className="doc-alert" role="alert">
                The save result is uncertain. Submission is locked to avoid a
                duplicate. Open the order list and verify the result.
              </div>
            )}
          </div>
        )}

        <fieldset className="doc-fieldset" disabled={disabled}>
          <main className="doc-main">
            {isCreate && (
              <section className="po-source-section">
                <Select
                  label="Create Order"
                  value={form.creationMode}
                  options={[
                    { value: "DIRECT", label: "Direct Purchase Order" },
                    {
                      value: "QUOTATION",
                      label: "From Supplier Quotation",
                    },
                  ]}
                  onChange={changeMode}
                />

                {quotationBased && (
                  <div className="po-source-search">
                    <Input
                      label="Supplier Quotation Number"
                      value={form.quotationNumber}
                      onChange={(event) => {
                        setForm((previous) => ({
                          ...previous,
                          quotationNumber: event.target.value,
                          supplierId: "",
                        }));

                        setQuotation(null);
                        setItems([newItem()]);
                        setDirty(true);
                      }}
                      placeholder="Enter quotation number"
                    />

                    <Button
                      type="button"
                      icon={Search}
                      onClick={loadQuotation}
                      loading={sourceLoading}
                      disabled={disabled || !form.quotationNumber.trim()}
                    >
                      Load Quotation
                    </Button>
                  </div>
                )}

                {quotation && (
                  <div className="po-source-confirmation">
                    <LockKeyhole size={16} />
                    <span>
                      {quotation.quotationNumber} loaded. Items, prices, taxes,
                      and commercial terms are locked to this offer.
                    </span>
                  </div>
                )}
              </section>
            )}

            <section className="doc-top">
              <div className="doc-panel doc-party-panel">
                <h2 className="doc-panel-title">Order To</h2>

                <Select
                  label="Supplier"
                  value={form.supplierId}
                  options={supplierOptions}
                  placeholder="Select supplier"
                  onChange={changeSupplier}
                  disabled={sourceLocked || isEdit}
                  required
                />

                {selectedSupplier && (
                  <div className="doc-party-card po-party-card">
                    <div className="doc-avatar">
                      {selectedSupplier.supplierName?.charAt(0).toUpperCase()}
                    </div>

                    <div className="doc-party-copy">
                      <h3>{selectedSupplier.supplierName}</h3>
                      <p>{selectedSupplier.supplierCode}</p>
                      <p>
                        <span>Address:</span> {address || "Not provided"}
                      </p>
                      <p>
                        <span>GSTIN:</span>{" "}
                        {selectedSupplier.gstNo || "Not provided"}
                      </p>
                      <p>
                        <span>Phone:</span>{" "}
                        {selectedSupplier.phone || "Not provided"}
                      </p>
                    </div>
                  </div>
                )}

                {form.quotationNumber && (
                  <p className="doc-note">
                    Source quotation: {form.quotationNumber}
                  </p>
                )}

                <div className="po-operational-note">
                  <FileText size={16} />
                  <span>
                    An order does not receive stock or post a journal. Record
                    delivery through Goods Receipt.
                  </span>
                </div>
              </div>

              <div className="doc-panel">
                <h2 className="doc-panel-title">Order Details</h2>

                <div className="doc-fields-grid">
                  <Input
                    label="Order Number"
                    value={order?.orderNumber || "Generated after creation"}
                    readOnly
                  />

                  <Input
                    label="Order Date"
                    name="orderDate"
                    type="date"
                    value={form.orderDate}
                    onChange={changeField}
                    required
                  />

                  <Input
                    label="Expected Delivery"
                    name="expectedDeliveryDate"
                    type="date"
                    value={form.expectedDeliveryDate}
                    min={form.orderDate}
                    onChange={changeField}
                  />

                  <Select
                    label="Tax Treatment"
                    value={form.taxMode}
                    options={TAX_OPTIONS}
                    onChange={changeTaxMode}
                    disabled={sourceLocked}
                  />

                  <Input
                    label="Payment Terms"
                    name="paymentTerms"
                    value={form.paymentTerms}
                    maxLength={100}
                    onChange={changeField}
                    disabled={sourceLocked}
                  />

                  <Input
                    label="Delivery Terms"
                    name="deliveryTerms"
                    value={form.deliveryTerms}
                    maxLength={1000}
                    onChange={changeField}
                    disabled={sourceLocked}
                  />

                  <div className="po-full-width">
                    <Textarea
                      label="Delivery Address"
                      name="deliveryAddress"
                      value={form.deliveryAddress}
                      rows={2}
                      maxLength={2000}
                      onChange={changeField}
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="doc-items">
              <div className="doc-table-wrap">
                <table className="doc-table">
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Items</th>
                      <th>HSN / SAC</th>
                      <th>Qty</th>
                      <th>Price / Item (₹)</th>
                      <th>Discount %</th>
                      <th>GST</th>
                      <th>Amount</th>
                      {!sourceLocked && <th>Remove</th>}
                    </tr>
                  </thead>

                  <tbody>
                    {items.map((item, index) => {
                      const product = productMap.get(item.productId);

                      const options = Array.from(productMap.values())
                        .filter(
                          (record) =>
                            getId(record) === item.productId ||
                            (record.status === "ACTIVE" && !record.isDeleted),
                        )
                        .map((record) => ({
                          value: getId(record),
                          label:
                            `${record.name || record.productCode || getId(record)}` +
                            `${record.productCode ? ` (${record.productCode})` : ""}`,
                        }));

                      return (
                        <tr key={item.rowId}>
                          <td className="doc-cell-no" data-label="No.">
                            {index + 1}
                          </td>

                          <td className="doc-cell-item" data-label="Item">
                            <Select
                              value={item.productId}
                              options={options}
                              placeholder="Select product"
                              onChange={(event) =>
                                selectProduct(item.rowId, event.target.value)
                              }
                              disabled={sourceLocked}
                              aria-label={`Product ${index + 1}`}
                            />

                            <small className="doc-item-meta">
                              {item.unit || product?.unit || "—"} ·{" "}
                              {item.productType || product?.type || "—"}
                            </small>

                            <Input
                              value={item.specification}
                              onChange={(event) =>
                                updateItem(
                                  item.rowId,
                                  "specification",
                                  event.target.value,
                                )
                              }
                              maxLength={1000}
                              placeholder="Specification / requirements"
                              disabled={sourceLocked}
                              aria-label={`Specification ${index + 1}`}
                            />
                          </td>

                          <td className="doc-cell-hsn" data-label="HSN / SAC">
                            {item.hsnSacCode || product?.hsnSacCode || "—"}
                          </td>

                          {[
                            [
                              "quantity",
                              "Quantity",
                              "0.001",
                              "1000000",
                              "0.001",
                            ],
                            [
                              "unitRate",
                              "Price / Item",
                              "0",
                              "1000000000",
                              "0.01",
                            ],
                            [
                              "discountPercent",
                              "Discount %",
                              "0",
                              "100",
                              "0.01",
                            ],
                          ].map(([field, label, min, max, step]) => (
                            <td key={field} data-label={label}>
                              <Input
                                type="number"
                                inputMode="decimal"
                                min={min}
                                max={max}
                                step={step}
                                value={item[field]}
                                onChange={(event) =>
                                  updateItem(
                                    item.rowId,
                                    field,
                                    event.target.value,
                                  )
                                }
                                disabled={sourceLocked}
                                aria-label={`${label} ${index + 1}`}
                              />
                            </td>
                          ))}

                          <td data-label="GST">
                            <Select
                              value={item.gstRate}
                              options={GST_RATES.map((rate) => ({
                                value: rate,
                                label: `${rate}%`,
                              }))}
                              onChange={(event) =>
                                updateItem(
                                  item.rowId,
                                  "gstRate",
                                  Number(event.target.value),
                                )
                              }
                              disabled={sourceLocked || form.taxMode === "NONE"}
                              aria-label={`GST ${index + 1}`}
                            />
                          </td>

                          <td className="doc-cell-amount" data-label="Amount">
                            {formatPaise(previews[index].total)}
                          </td>

                          {!sourceLocked && (
                            <td className="doc-cell-action" data-label="Remove">
                              <button
                                type="button"
                                className="doc-remove-button"
                                aria-label={`Remove item ${index + 1}`}
                                disabled={items.length === 1}
                                onClick={() => {
                                  setItems((previous) =>
                                    previous.filter(
                                      (record) => record.rowId !== item.rowId,
                                    ),
                                  );

                                  setDirty(true);
                                }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {!sourceLocked && (
                <div className="doc-add-item-row">
                  <button
                    type="button"
                    className="doc-dashed-line"
                    disabled={items.length >= 200}
                    onClick={() => {
                      setItems((previous) => [...previous, newItem()]);
                      setDirty(true);
                    }}
                  >
                    <Plus size={16} />
                    Add Item
                  </button>
                </div>
              )}
            </section>

            <section className="doc-bottom">
              <div className="doc-extras">
                <div className="doc-panel">
                  <Textarea
                    label="Terms & Conditions"
                    name="termsAndConditions"
                    value={form.termsAndConditions}
                    rows={3}
                    maxLength={5000}
                    onChange={changeField}
                    disabled={sourceLocked}
                  />
                </div>

                {!isView && (
                  <button
                    type="button"
                    className={`doc-extra-row ${showNotes ? "is-open" : ""}`}
                    aria-expanded={showNotes}
                    onClick={() => setShowNotes((previous) => !previous)}
                  >
                    <StickyNote size={16} />
                    <span>Order Notes</span>
                    <ChevronDown size={16} />
                  </button>
                )}

                {(showNotes || isView) && (
                  <div className="doc-extra-content">
                    <Textarea
                      label="Notes"
                      name="notes"
                      value={form.notes}
                      onChange={changeField}
                      rows={3}
                      maxLength={2000}
                      placeholder="Internal order notes..."
                    />
                  </div>
                )}

                {order?.cancellationReason && (
                  <div className="doc-panel">
                    <strong>Cancellation Reason</strong>
                    <p className="doc-note">{order.cancellationReason}</p>
                  </div>
                )}
              </div>

              <div className="doc-summary">
                {[
                  ["Gross Amount", totals.gross],
                  ["Line Discounts", -totals.discount],
                  ["Taxable Amount", totals.taxable],

                  ...(form.taxMode === "INTRA_STATE"
                    ? [
                        ["CGST", totals.cgst],
                        ["SGST", totals.sgst],
                      ]
                    : []),

                  ...(form.taxMode === "INTER_STATE"
                    ? [["IGST", totals.igst]]
                    : []),
                ].map(([label, amount]) => (
                  <div className="doc-summary-row" key={label}>
                    <span>{label}</span>
                    <strong>{formatPaise(amount)}</strong>
                  </div>
                ))}

                <div className="doc-summary-total">
                  <span>Total Order Amount</span>
                  <strong>{formatPaise(totals.total)}</strong>
                </div>

                <p className="doc-note">
                  {isView
                    ? "Recorded Purchase Order amounts."
                    : "Preview only. The backend validates final totals."}
                </p>
              </div>
            </section>
          </main>
        </fieldset>

        {!isView && (
          <div className="doc-mobile-bar">
            <div className="doc-mobile-total">
              <span>Order Total</span>
              <strong>{formatPaise(totals.total)}</strong>
            </div>

            <div className="doc-mobile-actions">{saveButton}</div>
          </div>
        )}
      </form>
    </div>
  );
}

export default PurchaseOrderPage;
