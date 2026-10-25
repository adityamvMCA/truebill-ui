import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  ChevronDown,
  FileText,
  Plus,
  Save,
  StickyNote,
  Trash2,
} from "lucide-react";

import toast from "react-hot-toast";

import api from "../../services/api";
import routes from "../../config/routes";

import Input from "../../components/common/Form/Input";
import Select from "../../components/common/Form/Select";
import Textarea from "../../components/common/Form/Textarea";
import Button from "../../components/common/Form/Button";

import {
  GST_RATES,
  TAX_OPTIONS,
  EMPTY_TOTALS,
  addDays,
  calculatePreview,
  formatPaise,
  getErrors,
  loadAllPages,
  localDate,
} from "./purchaseBill.utils";

import TdsFields, { emptyTds, buildTdsPayload, validateTds } from "../accounting/tds/TdsFields";

import "../../styles/invoice-common1.css";

const supplierApi = api.suppliers || api.supplier;
const productApi = api.products || api.product;
const goodsReceiptApi = api.goodsReceipts || api.goodsReceipt;
const quotationApi = api.supplierQuotations || api.supplierQuotation;

const SOURCE_OPTIONS = [
  { value: "DIRECT", label: "Direct (no reference)" },
  { value: "RECEIPT", label: "From Goods Receipt" },
  { value: "QUOTATION", label: "From Supplier Quotation" },
];

const VALID_TAX_MODES = ["NONE", "INTRA_STATE", "INTER_STATE"];

const normalizeTaxMode = (value) => {
  const mode = String(value || "NONE")
    .toUpperCase()
    .replace("INTRASTATE", "INTRA_STATE")
    .replace("INTERSTATE", "INTER_STATE");

  return VALID_TAX_MODES.includes(mode) ? mode : "NONE";
};

const initialForm = () => {
  const today = localDate();

  return {
    supplierId: "",
    supplierInvoiceNumber: "",
    billDate: today,
    dueDate: today,
    paymentTerms: "Due on Receipt",
    taxMode: "NONE",
    updateStock: false,
    notes: "",
  };
};

let rowCounter = 0;

const newItem = () => ({
  rowId: `purchase-item-${++rowCounter}`,
  productId: "",
  quantity: "1",
  unitRate: "0",
  discountPercent: "0",
  gstRate: 0,
  taxCreditEligible: false,
});

const itemSnapshot = (items) =>
  items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    unitRate: item.unitRate,
    discountPercent: item.discountPercent,
    gstRate: item.gstRate,
    taxCreditEligible: item.taxCreditEligible,
  }));

function PurchaseBillCreate1() {
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [items, setItems] = useState(() => [newItem()]);
  const [tds, setTds] = useState(emptyTds);

  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [errors, setErrors] = useState([]);
  const [showNotes, setShowNotes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uncertainResult, setUncertainResult] = useState(false);

  const [sourceType, setSourceType] = useState("DIRECT");
  const [receipts, setReceipts] = useState([]);
  const [receiptId, setReceiptId] = useState("");
  const [quotations, setQuotations] = useState([]);
  const [quotationNumber, setQuotationNumber] = useState("");
  const [sourceLoading, setSourceLoading] = useState(false);

  const submitLock = useRef(false);

  // Receipt-linked bills must match the receipt exactly.
  const linkedToReceipt = sourceType === "RECEIPT" && Boolean(receiptId);

  const initialSnapshot = useRef(
    JSON.stringify({
      form,
      items: itemSnapshot(items),
      tds,
      sourceType,
      receiptId,
      quotationNumber,
    }),
  );

  const disabled = loading || loadFailed || saving || uncertainResult;

  /* ---------- Load suppliers and products ---------- */

  useEffect(() => {
    let cancelled = false;

    const loadOptions = async () => {
      setLoading(true);
      setLoadFailed(false);
      setErrors([]);

      try {
        const [supplierRecords, productRecords] = await Promise.all([
          loadAllPages(supplierApi, "suppliers"),
          loadAllPages(productApi, "products"),
        ]);

        if (cancelled) return;

        setSuppliers(
          supplierRecords.filter(
            (supplier) => supplier.status === "Active" && !supplier.isDeleted,
          ),
        );

        setProducts(
          productRecords.filter(
            (product) => product.status === "ACTIVE" && !product.isDeleted,
          ),
        );
      } catch (error) {
        if (cancelled) return;

        const messages = getErrors(error);

        setErrors(messages);
        setLoadFailed(true);
        toast.error(messages[0]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadOptions();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  /* ---------- Load goods receipts for selected supplier ---------- */

  useEffect(() => {
    if (sourceType !== "RECEIPT" || !form.supplierId) {
      setReceipts([]);
      return undefined;
    }

    let cancelled = false;

    (async () => {
      try {
        setSourceLoading(true);

        const records = await loadAllPages(goodsReceiptApi, "goodsReceipts", {
          supplierId: form.supplierId,
          status: "CREATED",
        });

        if (!cancelled) setReceipts(records);
      } catch (error) {
        if (!cancelled) {
          const messages = getErrors(error);
          setErrors(messages);
          toast.error(messages[0]);
        }
      } finally {
        if (!cancelled) setSourceLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sourceType, form.supplierId]);

  /* ---------- Load supplier quotations ---------- */

  useEffect(() => {
    if (sourceType !== "QUOTATION") {
      setQuotations([]);
      return undefined;
    }

    let cancelled = false;

    (async () => {
      try {
        setSourceLoading(true);

        // Add a status filter if you only want accepted quotations,
        // e.g. { status: "ACCEPTED" }. Use the value your backend uses.
        const records = await loadAllPages(quotationApi, "quotations");

        if (!cancelled) setQuotations(records);
      } catch (error) {
        if (!cancelled) {
          const messages = getErrors(error);
          setErrors(messages);
          toast.error(messages[0]);
        }
      } finally {
        if (!cancelled) setSourceLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sourceType]);

  /* ---------- Derived data ---------- */

  const selectedSupplier = useMemo(
    () => suppliers.find((supplier) => supplier._id === form.supplierId),
    [suppliers, form.supplierId],
  );

  const productMap = useMemo(
    () => new Map(products.map((product) => [product._id, product])),
    [products],
  );

  const previews = useMemo(
    () => items.map((item) => calculatePreview(item, form.taxMode)),
    [items, form.taxMode],
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

  const quotationOptions = useMemo(
    () =>
      quotations
        .filter(
          (quotation) =>
            !form.supplierId ||
            String(quotation.supplierId?._id || quotation.supplierId) ===
              form.supplierId,
        )
        .map((quotation) => ({
          value: quotation.quotationNumber,
          label: `${quotation.quotationNumber} - ${
            quotation.supplierName || "Supplier"
          }`,
        })),
    [quotations, form.supplierId],
  );

  const isDirty =
    JSON.stringify({
      form,
      items: itemSnapshot(items),
      tds,
      sourceType,
      receiptId,
      quotationNumber,
    }) !== initialSnapshot.current;

  /* ---------- Handlers ---------- */

  const handleFieldChange = (event) => {
    if (disabled) return;

    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors([]);
  };

  const handleSupplierChange = (event) => {
    if (disabled || linkedToReceipt) return;

    const supplier = suppliers.find(
      (record) => record._id === event.target.value,
    );

    setForm((previous) => ({
      ...previous,
      supplierId: supplier?._id || "",
      paymentTerms: supplier?.paymentTerms || "Due on Receipt",
      dueDate: addDays(previous.billDate, supplier?.creditDays || 0),
    }));

    // Receipts and quotations belong to one supplier,
    // so drop any stale selection.
    setReceiptId("");
    setQuotationNumber("");

    if (sourceType === "RECEIPT" || sourceType === "QUOTATION") {
      setItems([newItem()]);
    } else {
      setItems((previous) =>
        previous.map((item) => ({
          ...item,
          taxCreditEligible: false,
        })),
      );
    }

    setErrors([]);
  };

  const handleTaxModeChange = (event) => {
    if (disabled) return;

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
        taxCreditEligible: false,
      })),
    );

    setErrors([]);
  };

  const updateItem = (rowId, field, value) => {
    if (disabled) return;

    setItems((previous) =>
      previous.map((item) => {
        if (item.rowId !== rowId) return item;

        return {
          ...item,
          [field]: value,

          ...(field === "gstRate" && Number(value) === 0
            ? { taxCreditEligible: false }
            : {}),
        };
      }),
    );

    setErrors([]);
  };

  const selectProduct = (rowId, productId) => {
    if (disabled || linkedToReceipt) return;

    const product = productMap.get(productId);

    setItems((previous) =>
      previous.map((item) =>
        item.rowId === rowId
          ? {
              ...item,
              productId,
              unitRate: String(product?.purchasePrice ?? 0),
              gstRate: form.taxMode === "NONE" ? 0 : (product?.gstRate ?? 0),
              taxCreditEligible: false,
            }
          : item,
      ),
    );

    setErrors([]);
  };

  /* ---------- Source handlers ---------- */

  const linesToItems = (lines = [], taxMode) => {
    const missing = [];

    const mapped = lines.map((line) => {
      const productId = String(line.productId?._id || line.productId || "");
      const product = productMap.get(productId);

      if (!product) {
        missing.push(line.productName || productId);
        return null;
      }

      const rate =
        line.unitRatePaise != null
          ? line.unitRatePaise / 100
          : (line.unitRate ?? product.purchasePrice ?? 0);

      return {
        ...newItem(),
        productId,
        quantity: String(line.quantity ?? 1),
        unitRate: String(rate),
        discountPercent: String(line.discountPercent ?? 0),
        gstRate:
          taxMode === "NONE" ? 0 : (line.gstRate ?? product.gstRate ?? 0),
        taxCreditEligible: false,
      };
    });

    if (missing.length) {
      toast.error(
        `Inactive or missing products skipped: ${missing.join(", ")}`,
      );
    }

    return mapped.filter(Boolean);
  };

  const handleSourceTypeChange = (event) => {
    if (disabled) return;

    setSourceType(event.target.value);
    setReceiptId("");
    setQuotationNumber("");
    setItems([newItem()]);
    setForm((previous) => ({ ...previous, updateStock: false }));
    setErrors([]);
  };

  const handleReceiptChange = (event) => {
    if (disabled) return;

    const id = event.target.value;
    const receipt = receipts.find((record) => record._id === id);

    setReceiptId(id);

    if (!receipt) {
      setItems([newItem()]);
      return;
    }

    const next = linesToItems(receipt.items, form.taxMode);

    setItems(next.length ? next : [newItem()]);

    // The Goods Receipt already handled stock.
    setForm((previous) => ({ ...previous, updateStock: false }));
    setErrors([]);
  };

  const handleQuotationChange = async (event) => {
    if (disabled) return;

    const number = event.target.value;

    setQuotationNumber(number);
    setErrors([]);

    if (!number) {
      setItems([newItem()]);
      return;
    }

    try {
      setSourceLoading(true);

      const response = await quotationApi.getByNumber(number);
      const quotation = response?.data?.quotation || response?.data?.data;

      if (!quotation) throw new Error("Quotation not found.");

      const supplierId = String(
        quotation.supplierId?._id || quotation.supplierId || "",
      );

      const supplier = suppliers.find((record) => record._id === supplierId);

      if (!supplier) {
        throw new Error("The quotation's supplier is not active.");
      }

      const taxMode = normalizeTaxMode(quotation.taxMode);
      const next = linesToItems(quotation.items, taxMode);

      if (!next.length) throw new Error("No usable items in this quotation.");

      setForm((previous) => ({
        ...previous,
        supplierId,
        taxMode,
        paymentTerms: supplier.paymentTerms || previous.paymentTerms,
        dueDate: addDays(previous.billDate, supplier.creditDays || 0),
        notes: quotation.notes || previous.notes,
      }));

      setItems(next);
      toast.success(`Loaded items from ${number}. Review before creating.`);
    } catch (error) {
      setQuotationNumber("");

      const messages = getErrors(error);
      setErrors(messages);
      toast.error(messages[0]);
    } finally {
      setSourceLoading(false);
    }
  };

  /* ---------- Validation and save ---------- */

  const validateForm = () => {
    const messages = [];

    if (sourceType === "RECEIPT" && !receiptId) {
      messages.push("Select a Goods Receipt, or switch to Direct.");
    }

    if (sourceType === "QUOTATION" && !quotationNumber) {
      messages.push("Select a Supplier Quotation, or switch to Direct.");
    }

    if (!selectedSupplier) {
      messages.push("Select a supplier.");
    } else if (!selectedSupplier.ledgerId) {
      messages.push("The selected supplier has no linked accounting ledger.");
    }

    if (!form.supplierInvoiceNumber.trim()) {
      messages.push("Supplier invoice number is required.");
    }

    if (!form.billDate || !form.dueDate) {
      messages.push("Bill date and due date are required.");
    } else if (form.dueDate < form.billDate) {
      messages.push("Due date cannot be before bill date.");
    }

    if (!items.length || items.length > 200) {
      messages.push("Add between 1 and 200 items.");
    }

    const ids = items.map((item) => item.productId).filter(Boolean);

    if (new Set(ids).size !== ids.length) {
      messages.push("A product can appear only once in a bill.");
    }

    items.forEach((item, index) => {
      if (!productMap.has(item.productId)) {
        messages.push(`Select an active product for item ${index + 1}.`);
      } else if (!previews[index].valid) {
        messages.push(
          `Check quantity, rate, discount, and GST for item ${index + 1}.`,
        );
      }

      if (item.taxCreditEligible && !selectedSupplier?.gstNo) {
        messages.push(
          `Supplier GSTIN is required for item ${index + 1} input credit.`,
        );
      }
    });

    if (
      Object.values(totals).some(
        (amount) => !Number.isSafeInteger(amount) || amount < 0,
      )
    ) {
      messages.push("The bill amounts exceed the supported range.");
    }

    if (totals.total <= 0) {
      messages.push("A purchase bill must have a positive total.");
    }

    const tdsError = validateTds(tds);
    if (tdsError) {
      messages.push(tdsError);
    }

    return messages;
  };

  const saveBill = async () => {
    if (disabled || submitLock.current) return;

    const messages = validateForm();

    if (messages.length) {
      setErrors(messages);
      toast.error(messages[0]);
      return;
    }

    submitLock.current = true;
    setSaving(true);
    setErrors([]);

    let savedBill;

    try {
      const payload = {
        supplierId: form.supplierId,

        supplierInvoiceNumber: form.supplierInvoiceNumber.trim(),

        billDate: form.billDate,
        dueDate: form.dueDate,

        paymentTerms: form.paymentTerms.trim() || "Due on Receipt",
        taxMode: form.taxMode,

        // TDS is optional; buildTdsPayload returns null when disabled.
        tds: buildTdsPayload(tds),

        // Receipt-linked bills must never update stock.
        updateStock: linkedToReceipt ? false : form.updateStock,

        ...(linkedToReceipt ? { sourceGoodsReceiptId: receiptId } : {}),

        items: items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitRate: Number(item.unitRate),
          discountPercent: Number(item.discountPercent),

          gstRate: form.taxMode === "NONE" ? 0 : Number(item.gstRate),

          taxCreditEligible:
            form.taxMode !== "NONE" &&
            Number(item.gstRate) > 0 &&
            Boolean(item.taxCreditEligible),
        })),

        notes: form.notes.trim() || null,
        action: "SAVE_AND_POST",
      };

      const response = await api.purchaseBills.create(payload);

      savedBill = response?.data?.bill;

      if (
        !savedBill?.billNumber ||
        savedBill.status !== "POSTED" ||
        !savedBill.journalId
      ) {
        throw new Error(
          "The server did not confirm a posted purchase bill. Check the bill list before submitting again.",
        );
      }
    } catch (error) {
      const status = error?.response?.status;

      if (!status || status >= 500 || status === 408) {
        setUncertainResult(true);
      }

      const requestErrors = getErrors(error);

      setErrors(requestErrors);
      toast.error(requestErrors[0]);

      return;
    } finally {
      submitLock.current = false;
      setSaving(false);
    }

    toast.success(`${savedBill.billNumber} created and posted successfully`);

    navigate(routes.purchase.invoices, {
      replace: true,
    });
  };

  const exitPage = () => {
    if (submitLock.current) return;

    const message = uncertainResult
      ? "Open Purchase Bills to verify whether this bill was created?"
      : "Discard this purchase bill and leave?";

    if ((isDirty || uncertainResult) && !window.confirm(message)) {
      return;
    }

    navigate(routes.purchase.invoices);
  };

  const actionButtons = (
    <Button
      type="button"
      icon={Save}
      disabled={disabled}
      loading={saving}
      onClick={saveBill}
    >
      {saving ? "Creating..." : "Create Purchase Bill"}
    </Button>
  );

  const address = selectedSupplier
    ? [
        selectedSupplier.billingAddress,
        selectedSupplier.city,
        selectedSupplier.state,
        selectedSupplier.pincode,
        selectedSupplier.country,
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  return (
    <div className="doc-page">
      <form noValidate onSubmit={(event) => event.preventDefault()}>
        <header className="doc-header">
          <div className="doc-header-left">
            <Button
              type="button"
              variant="secondary"
              icon={ArrowLeft}
              disabled={saving}
              onClick={exitPage}
            >
              Exit
            </Button>

            <div className="doc-title">
              <FileText size={18} />
              <span>Create Purchase Bill</span>
            </div>
          </div>

          <div className="doc-header-actions">{actionButtons}</div>
        </header>

        {(loading || errors.length > 0) && (
          <div className="doc-alerts">
            {loading && (
              <div className="doc-alert" role="status">
                Loading suppliers and products...
              </div>
            )}

            {errors.length > 0 && (
              <div className="doc-alert doc-alert-error" role="alert">
                <strong>Please review the following</strong>

                <ul>
                  {errors.map((message, index) => (
                    <li key={`${index}-${message}`}>{message}</li>
                  ))}
                </ul>

                {loadFailed && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setReloadKey((value) => value + 1)}
                  >
                    Retry Loading
                  </Button>
                )}

                {uncertainResult && (
                  <Button type="button" variant="secondary" onClick={exitPage}>
                    Check Purchase Bills
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        <fieldset className="doc-fieldset" disabled={disabled}>
          <main className="doc-main">
            <section className="doc-top">
              <div className="doc-panel doc-party-panel">
                <h2 className="doc-panel-title">Bill From</h2>

                <Select
                  label="Supplier"
                  name="supplierId"
                  value={form.supplierId}
                  placeholder="Select supplier"
                  options={suppliers.map((supplier) => ({
                    value: supplier._id,
                    label: `${supplier.supplierName} (${supplier.supplierCode})`,
                  }))}
                  onChange={handleSupplierChange}
                  disabled={linkedToReceipt}
                  required
                />

                {selectedSupplier && (
                  <div className="doc-party-card">
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
              </div>

              <div className="doc-panel">
                <h2 className="doc-panel-title">Bill Details</h2>

                <div className="doc-fields-grid">
                  <Select
                    label="Create From"
                    name="sourceType"
                    value={sourceType}
                    options={SOURCE_OPTIONS}
                    onChange={handleSourceTypeChange}
                  />

                  {sourceType === "RECEIPT" && (
                    <Select
                      label="Goods Receipt"
                      name="receiptId"
                      value={receiptId}
                      placeholder={
                        form.supplierId
                          ? "Select receipt"
                          : "Select supplier first"
                      }
                      options={receipts.map((receipt) => ({
                        value: receipt._id,
                        label:
                          receipt.receiptNumber ||
                          receipt.grnNumber ||
                          receipt._id,
                      }))}
                      onChange={handleReceiptChange}
                      disabled={!form.supplierId || sourceLoading}
                    />
                  )}

                  {sourceType === "QUOTATION" && (
                    <Select
                      label="Supplier Quotation"
                      name="quotationNumber"
                      value={quotationNumber}
                      placeholder="Select quotation"
                      options={quotationOptions}
                      onChange={handleQuotationChange}
                      disabled={sourceLoading}
                    />
                  )}
                </div>

                <div className="doc-fields-grid">
                  <Input
                    label="Bill Number"
                    name="billNumber"
                    value="Generated after creation"
                    readOnly
                  />

                  <Input
                    label="Supplier Invoice No."
                    name="supplierInvoiceNumber"
                    value={form.supplierInvoiceNumber}
                    onChange={handleFieldChange}
                    maxLength={100}
                    placeholder="Supplier's invoice reference"
                    required
                  />

                  <Input
                    label="Bill Date"
                    name="billDate"
                    type="date"
                    value={form.billDate}
                    onChange={handleFieldChange}
                    required
                  />

                  <Input
                    label="Due Date"
                    name="dueDate"
                    type="date"
                    value={form.dueDate}
                    min={form.billDate}
                    onChange={handleFieldChange}
                    required
                  />

                  <Input
                    label="Payment Terms"
                    name="paymentTerms"
                    value={form.paymentTerms}
                    onChange={handleFieldChange}
                    maxLength={100}
                  />

                  <Select
                    label="Tax Treatment"
                    name="taxMode"
                    value={form.taxMode}
                    options={TAX_OPTIONS}
                    onChange={handleTaxModeChange}
                  />
                </div>

                <label className="doc-check">
                  <input
                    type="checkbox"
                    checked={linkedToReceipt ? false : form.updateStock}
                    disabled={linkedToReceipt}
                    onChange={(event) => {
                      setForm((previous) => ({
                        ...previous,
                        updateStock: event.target.checked,
                      }));

                      setErrors([]);
                    }}
                  />

                  <span>
                    Receive inventory-tracked goods when creating this bill
                    <small>
                      Select only when goods have actually been received and
                      stock has not already been recorded through a Goods
                      Receipt.
                    </small>
                  </span>
                </label>
              </div>
            </section>

            <section className="doc-items">
              <div className="doc-table-wrap">
                <table className="doc-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Items</th>
                      <th>HSN / SAC</th>
                      <th>Qty</th>
                      <th>Price/Item (₹)</th>
                      <th>Discount %</th>
                      <th>GST</th>
                      <th>Amount</th>

                      <th>
                        <span className="doc-sr-only">Remove</span>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {items.map((item, index) => {
                      const product = productMap.get(item.productId);

                      const options = products
                        .filter(
                          (record) =>
                            record._id === item.productId ||
                            !items.some(
                              (other) => other.productId === record._id,
                            ),
                        )
                        .map((record) => ({
                          value: record._id,
                          label: `${record.name} (${record.productCode})`,
                        }));

                      return (
                        <tr key={item.rowId}>
                          <td data-label="No." className="doc-cell-no">
                            {index + 1}
                          </td>

                          <td data-label="Item" className="doc-cell-item">
                            <Select
                              name={`product-${item.rowId}`}
                              aria-label={`Product ${index + 1}`}
                              value={item.productId}
                              placeholder="Select product"
                              options={options}
                              disabled={linkedToReceipt}
                              onChange={(event) =>
                                selectProduct(item.rowId, event.target.value)
                              }
                            />

                            {product && (
                              <small className="doc-item-meta">
                                {product.unit} · {product.type}
                                {product.type === "GOODS" &&
                                product.trackInventory
                                  ? " · Stock tracked"
                                  : ""}
                              </small>
                            )}
                          </td>

                          <td data-label="HSN / SAC" className="doc-cell-hsn">
                            {product?.hsnSacCode || "—"}
                          </td>

                          {[
                            {
                              field: "quantity",
                              label: "Quantity",
                              min: "0.001",
                              max: "1000000",
                              step: "0.001",
                            },
                            {
                              field: "unitRate",
                              label: "Price/Item (₹)",
                              min: "0",
                              max: "1000000000",
                              step: "0.01",
                            },
                            {
                              field: "discountPercent",
                              label: "Discount %",
                              min: "0",
                              max: "100",
                              step: "0.01",
                            },
                          ].map((column) => (
                            <td key={column.field} data-label={column.label}>
                              <Input
                                name={`${column.field}-${item.rowId}`}
                                aria-label={`${column.label} ${index + 1}`}
                                type="number"
                                inputMode="decimal"
                                min={column.min}
                                max={column.max}
                                step={column.step}
                                value={item[column.field]}
                                disabled={
                                  linkedToReceipt && column.field === "quantity"
                                }
                                onChange={(event) =>
                                  updateItem(
                                    item.rowId,
                                    column.field,
                                    event.target.value,
                                  )
                                }
                              />
                            </td>
                          ))}

                          <td data-label="GST">
                            <Select
                              name={`gst-${item.rowId}`}
                              aria-label={`GST ${index + 1}`}
                              value={item.gstRate}
                              disabled={form.taxMode === "NONE"}
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
                            />

                            <label className="doc-check doc-check-small">
                              <input
                                type="checkbox"
                                checked={item.taxCreditEligible}
                                disabled={
                                  form.taxMode === "NONE" ||
                                  !selectedSupplier?.gstNo ||
                                  Number(item.gstRate) === 0
                                }
                                onChange={(event) =>
                                  updateItem(
                                    item.rowId,
                                    "taxCreditEligible",
                                    event.target.checked,
                                  )
                                }
                              />

                              <span>Input credit eligible</span>
                            </label>
                          </td>

                          <td data-label="Amount" className="doc-cell-amount">
                            {formatPaise(previews[index].total)}
                          </td>

                          <td data-label="Remove" className="doc-cell-action">
                            <button
                              type="button"
                              className="doc-remove-button"
                              aria-label={`Remove item ${index + 1}`}
                              disabled={items.length === 1 || linkedToReceipt}
                              onClick={() => {
                                setItems((previous) =>
                                  previous.filter(
                                    (record) => record.rowId !== item.rowId,
                                  ),
                                );

                                setErrors([]);
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  <tfoot>
                    <tr>
                      <td colSpan={5} className="doc-subtotal-label">
                        Subtotal
                      </td>

                      <td className="doc-subtotal-value">
                        {formatPaise(totals.discount)}
                      </td>

                      <td className="doc-subtotal-value">
                        {formatPaise(totals.cgst + totals.sgst + totals.igst)}
                      </td>

                      <td className="doc-subtotal-value">
                        {formatPaise(totals.total)}
                      </td>

                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="doc-add-item-row">
                <button
                  type="button"
                  className="doc-dashed-line"
                  disabled={items.length >= 200 || linkedToReceipt}
                  onClick={() => {
                    setItems((previous) => [...previous, newItem()]);

                    setErrors([]);
                  }}
                >
                  <Plus size={15} />
                  Add Item
                </button>
              </div>
            </section>

            <section className="doc-panel purchase-bill-tds-panel">
              <h2 className="doc-panel-title">Tax Deducted at Source (TDS)</h2>
              <TdsFields
                supplierLedgerId={selectedSupplier?.ledgerId}
                baseAmountPaise={totals.taxable}
                date={form.billDate}
                value={tds}
                onChange={(nextTds) => {
                  setTds(nextTds);
                  setErrors([]);
                }}
              />
            </section>

            <section className="doc-bottom">
              <div className="doc-extras">
                <button
                  type="button"
                  className={`doc-extra-row ${showNotes ? "is-open" : ""}`}
                  aria-expanded={showNotes}
                  onClick={() => setShowNotes((previous) => !previous)}
                >
                  <StickyNote size={16} />
                  <span>Add Notes</span>
                  <ChevronDown size={16} />
                </button>

                {showNotes && (
                  <div className="doc-extra-content">
                    <Textarea
                      name="notes"
                      value={form.notes}
                      onChange={handleFieldChange}
                      maxLength={1000}
                      rows={4}
                      placeholder="Supplier instructions or purchase notes..."
                    />
                  </div>
                )}

                <p className="doc-note">
                  Payments are recorded separately through Supplier Payments.
                  Creating this bill does not mark it as paid.
                </p>
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
                  <span>Total Amount:</span>
                  <strong>{formatPaise(totals.total)}</strong>
                </div>

                <p className="doc-note">The server calculates final totals.</p>
              </div>
            </section>
          </main>
        </fieldset>

        <div className="doc-mobile-bar">
          <div className="doc-mobile-total">
            <span>Total</span>
            <strong>{formatPaise(totals.total)}</strong>
          </div>

          <div className="doc-mobile-actions">{actionButtons}</div>
        </div>
      </form>
    </div>
  );
}

export default PurchaseBillCreate1;