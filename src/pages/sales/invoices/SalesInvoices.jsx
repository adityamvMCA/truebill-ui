import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  FileText,
  Plus,
  Search,
  RefreshCw,
  Eye,
  Pencil,
  Trash2,
  Send,
  X,
  Save,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import toast from "react-hot-toast";

import invoiceApi from "../../../services/modules/salesInvoiceApi";

import "./sales-invoices.css";

const PAGE_SIZE = 20;
const GST_RATES = [0, 3, 5, 12, 18, 28];

const EMPTY_TOTALS = {
  gross: 0,
  discount: 0,
  taxable: 0,
  cgst: 0,
  sgst: 0,
  igst: 0,
  total: 0,
};

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const money = (paise = 0) => currency.format(Number(paise || 0) / 100);

const idOf = (record) => String(record?._id || record?.id || "");

const errorMessage = (error) => {
  const body = error?.response?.data;

  if (Array.isArray(body?.errors) && body.errors.length) {
    return body.errors
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.message || item?.msg || "Invalid field",
      )
      .join("; ");
  }

  return body?.message || error?.message || "Unable to complete the request.";
};

const displayDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

const today = () => {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

const addDays = (day, count) => {
  const date = new Date(`${day}T00:00:00Z`);
  const days = Number(count);

  if (Number.isNaN(date.getTime()) || !Number.isSafeInteger(days) || days < 0) {
    return day;
  }

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
};

const dateInput = (value) =>
  value ? new Date(value).toISOString().slice(0, 10) : "";

let rowSequence = 0;

const newItem = () => ({
  rowId: `sales-row-${++rowSequence}`,
  productId: "",
  quantity: "1",
  unitRate: "0",
  discountPercent: "0",
  gstRate: 0,
});

const newForm = () => ({
  customerId: "",
  invoiceDate: today(),
  dueDate: today(),
  paymentTerms: "Due on Receipt",
  taxMode: "NONE",
  updateStock: false,
  notes: "",
});

const extractRecords = (response, key) => {
  const body = response?.data;

  if (body?.success === false) {
    throw new Error(body.message || "Unable to load records.");
  }

  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.[key])) return body[key];
  if (Array.isArray(body)) return body;

  throw new Error(`Invalid ${key} list response.`);
};

const loadOptions = async (getter, key) => {
  const first = await getter({ page: 1, limit: 100 });
  const records = [...extractRecords(first, key)];

  const pages = Math.max(
    1,
    Number(first?.data?.pagination?.totalPages ?? first?.data?.totalPages ?? 1),
  );

  for (let page = 2; page <= pages; page += 1) {
    const response = await getter({ page, limit: 100 });

    records.push(...extractRecords(response, key));
  }

  return Array.from(
    new Map(records.map((record) => [idOf(record), record])).values(),
  );
};

const scaledInteger = (value, scale) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const number = Number(value);
  const scaled = number * scale;
  const result = Math.round(scaled);

  if (
    !Number.isFinite(number) ||
    number < 0 ||
    !Number.isSafeInteger(result) ||
    Math.abs(scaled - result) > 0.000001
  ) {
    return null;
  }

  return result;
};

const multiplyDivide = (first, second, divisor) => {
  const denominator = BigInt(divisor);

  const result = Number(
    (BigInt(first) * BigInt(second) + denominator / 2n) / denominator,
  );

  if (!Number.isSafeInteger(result)) {
    throw new Error("Amount exceeds the supported range.");
  }

  return result;
};

const previewItem = (item, taxMode) => {
  const invalid = { ...EMPTY_TOTALS, valid: false };

  const quantity = scaledInteger(item.quantity, 1000);
  const rate = scaledInteger(item.unitRate, 100);
  const discount = scaledInteger(item.discountPercent, 100);
  const gst = taxMode === "NONE" ? 0 : Number(item.gstRate);

  if (
    !item.productId ||
    quantity === null ||
    quantity < 1 ||
    quantity > 1000000000 ||
    rate === null ||
    rate > 100000000000 ||
    discount === null ||
    discount > 10000 ||
    !GST_RATES.includes(gst)
  ) {
    return invalid;
  }

  try {
    const gross = multiplyDivide(rate, quantity, 1000);
    const discountAmount = multiplyDivide(gross, discount, 10000);

    const taxable = gross - discountAmount;
    const tax = multiplyDivide(taxable, gst, 100);

    const cgst = taxMode === "INTRA_STATE" ? Math.floor(tax / 2) : 0;

    const sgst = taxMode === "INTRA_STATE" ? tax - cgst : 0;

    const igst = taxMode === "INTER_STATE" ? tax : 0;

    const total = taxable + cgst + sgst + igst;

    if (!Number.isSafeInteger(total)) return invalid;

    return {
      valid: true,
      gross,
      discount: discountAmount,
      taxable,
      cgst,
      sgst,
      igst,
      total,
    };
  } catch {
    return invalid;
  }
};

function Badge({ value }) {
  return (
    <span className={`si-badge si-${String(value || "").toLowerCase()}`}>
      {String(value || "—").replaceAll("_", " ")}
    </span>
  );
}

function SalesInvoiceEditor({ invoice, onClose, onSaved }) {
  const editing = Boolean(invoice);

  const [form, setForm] = useState(() =>
    invoice
      ? {
          customerId: String(invoice.customerId),
          invoiceDate: dateInput(invoice.invoiceDate),
          dueDate: dateInput(invoice.dueDate),
          paymentTerms: invoice.paymentTerms || "Due on Receipt",
          taxMode: invoice.taxMode,
          updateStock: Boolean(invoice.updateStock),
          notes: invoice.notes || "",
        }
      : newForm(),
  );

  const [items, setItems] = useState(() =>
    invoice
      ? invoice.items.map((item) => ({
          ...newItem(),
          productId: String(item.productId),
          quantity: String(item.quantity),
          unitRate: String(item.unitRatePaise / 100),
          discountPercent: String(item.discountPercent),
          gstRate: item.gstRate,
        }))
      : [newItem()],
  );

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const [saving, setSaving] = useState("");
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);

  const submitLock = useRef(false);
  const initialSnapshot = useRef(JSON.stringify({ form, items }));

  const dirty = JSON.stringify({ form, items }) !== initialSnapshot.current;

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setLoadFailed(false);
      setError("");

      try {
        const [customerRecords, productRecords] = await Promise.all([
          loadOptions(invoiceApi.getCustomers, "customers"),
          loadOptions(invoiceApi.getProducts, "products"),
        ]);

        if (cancelled) return;

        setCustomers(
          customerRecords.filter(
            (customer) => customer.status === "Active" && !customer.isDeleted,
          ),
        );

        setProducts(
          productRecords.filter(
            (product) => product.status === "ACTIVE" && !product.isDeleted,
          ),
        );
      } catch (loadError) {
        if (cancelled) return;

        setError(errorMessage(loadError));
        setLoadFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [reload]);

  useEffect(() => {
    const warnBeforeUnload = (event) => {
      if (!dirty && !saving && !uncertain) return;

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warnBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", warnBeforeUnload);
    };
  }, [dirty, saving, uncertain]);

  const productMap = useMemo(
    () => new Map(products.map((product) => [idOf(product), product])),
    [products],
  );

  const selectedCustomer = customers.find(
    (customer) => idOf(customer) === form.customerId,
  );

  const previews = useMemo(
    () => items.map((item) => previewItem(item, form.taxMode)),
    [items, form.taxMode],
  );

  const totals = useMemo(
    () =>
      previews.reduce(
        (result, preview) => {
          const next = { ...result };

          for (const key of Object.keys(EMPTY_TOTALS)) {
            next[key] += preview[key];
          }

          return next;
        },
        { ...EMPTY_TOTALS },
      ),
    [previews],
  );

  const disabled = loading || loadFailed || Boolean(saving) || uncertain;

  const changeField = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  const changeCustomer = (event) => {
    const customer = customers.find(
      (record) => idOf(record) === event.target.value,
    );

    setForm((previous) => ({

      
      ...previous,
      customerId: customer ? idOf(customer) : "",
      paymentTerms: customer?.paymentTerms || "Due on Receipt",
      dueDate: addDays(previous.invoiceDate, customer?.creditDays || 0),
    }));

    setError("");
  };

  const changeTaxMode = (event) => {
    const taxMode = event.target.value;

    setForm((previous) => ({ ...previous, taxMode }));

    setItems((previous) =>
      previous.map((item) => ({
        ...item,
        gstRate:
          taxMode === "NONE"
            ? 0
            : (productMap.get(item.productId)?.gstRate ?? 0),
      })),
    );

    setError("");
  };

  const updateItem = (rowId, field, value) => {
    setItems((previous) =>
      previous.map((item) =>
        item.rowId === rowId ? { ...item, [field]: value } : item,
      ),
    );

    setError("");
  };

  const selectProduct = (rowId, productId) => {
    const product = productMap.get(productId);

    setItems((previous) =>
      previous.map((item) =>
        item.rowId === rowId
          ? {
              ...item,
              productId,
              unitRate: String(product?.salePrice ?? 0),
              gstRate: form.taxMode === "NONE" ? 0 : (product?.gstRate ?? 0),
            }
          : item,
      ),
    );

    setError("");
  };

  const closeEditor = () => {
    if (saving) return;

    if (
      (dirty || uncertain) &&
      !window.confirm(
        uncertain
          ? "The request may have completed. Close and check the invoice list before trying again?"
          : "Discard your unsaved changes?",
      )
    ) {
      return;
    }

    onClose();
  };

  const validate = (action) => {
    if (!selectedCustomer) return "Select an active customer.";

    if (!form.invoiceDate || !form.dueDate) {
      return "Invoice date and due date are required.";
    }

    if (form.dueDate < form.invoiceDate) {
      return "Due date cannot be before invoice date.";
    }

    if (!form.paymentTerms.trim()) {
      return "Payment terms are required.";
    }

    if (!items.length || items.length > 200) {
      return "Add between 1 and 200 items.";
    }

    const ids = items.map((item) => item.productId);

    if (new Set(ids).size !== ids.length) {
      return "A product can appear only once in an invoice.";
    }

    for (let index = 0; index < items.length; index += 1) {
      if (!productMap.has(items[index].productId)) {
        return `Select an active product for item ${index + 1}.`;
      }

      if (!previews[index].valid) {
        return `Check quantity, price, discount and GST for item ${index + 1}.`;
      }
    }

    if (
      Object.values(totals).some(
        (amount) => !Number.isSafeInteger(amount) || amount < 0,
      )
    ) {
      return "Invoice amounts exceed the supported range.";
    }

    if (action === "SAVE_AND_POST" && totals.total <= 0) {
      return "A posted invoice must have a positive total.";
    }

    return "";
  };

  const save = async (action) => {
    if (disabled || submitLock.current) return;

    const validationError = validate(action);

    if (validationError) {
      setError(validationError);
      return;
    }

    if (
      action === "SAVE_AND_POST" &&
      !window.confirm(
        "Post this invoice? This creates accounting entries and deducts tracked stock if selected. Posted invoices cannot be edited.",
      )
    ) {
      return;
    }

    submitLock.current = true;
    setSaving(action);
    setError("");

    try {
      const payload = {
        customerId: form.customerId,
        invoiceDate: form.invoiceDate,
        dueDate: form.dueDate,
        paymentTerms: form.paymentTerms.trim(),
        taxMode: form.taxMode,
        updateStock: form.updateStock,
        notes: form.notes.trim(),
        items: items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitRate: Number(item.unitRate),
          discountPercent: Number(item.discountPercent),
          gstRate: form.taxMode === "NONE" ? 0 : Number(item.gstRate),
        })),
      };

      const response = editing
        ? await invoiceApi.update(invoice.invoiceNumber, payload)
        : await invoiceApi.create({
            ...payload,
            action,
          });

      const saved = response?.data?.invoice;

      if (!saved?.invoiceNumber) {
        setUncertain(true);

        throw new Error(
          "No invoice number returned. Check the list before submitting again.",
        );
      }

      toast.success(
        saved.status === "POSTED"
          ? `${saved.invoiceNumber} posted successfully`
          : `${saved.invoiceNumber} draft saved`,
      );

      onSaved();
    } catch (saveError) {
      const status = saveError?.response?.status;

      if (!status || status >= 500 || status === 408) {
        setUncertain(true);
      }

      setError(errorMessage(saveError));
    } finally {
      submitLock.current = false;
      setSaving("");
    }
  };

  return (
    <div className="si-overlay">
      <section
        className="si-dialog si-editor"
        role="dialog"
        aria-modal="true"
        aria-labelledby="si-editor-title"
      >
        <header className="si-dialog-header">
          <div>
            <h2 id="si-editor-title">
              {editing
                ? `Edit ${invoice.invoiceNumber}`
                : "Create Sales Invoice"}
            </h2>
            <p>Customer billing, GST and optional stock posting</p>
          </div>

          <button
            type="button"
            className="si-icon-button"
            aria-label="Close invoice editor"
            disabled={Boolean(saving)}
            onClick={closeEditor}
          >
            <X size={20} />
          </button>
        </header>

        <div className="si-dialog-body">
          {loading && (
            <div className="si-notice" role="status">
              Loading customers and products...
            </div>
          )}

          {error && (
            <div className="si-error" role="alert">
              {error}
            </div>
          )}

          {loadFailed && (
            <button
              type="button"
              className="si-button"
              onClick={() => setReload((value) => value + 1)}
            >
              Retry Loading
            </button>
          )}

          {uncertain && (
            <div className="si-notice" role="status">
              Submission is locked because the request may have completed. Close
              this editor and refresh the list before creating another invoice.
            </div>
          )}

          <form onSubmit={(event) => event.preventDefault()}>
            <fieldset disabled={disabled} className="si-fieldset">
              <div className="si-form-grid">
                <label className="si-field si-span-two">
                  <span>Customer *</span>
                  <select
                    name="customerId"
                    value={form.customerId}
                    onChange={changeCustomer}
                  >
                    <option value="">Select customer</option>

                    {customers.map((customer) => (
                      <option key={idOf(customer)} value={idOf(customer)}>
                        {customer.customerName} — {customer.customerCode}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="si-field">
                  <span>Invoice Number</span>
                  <input
                    value={invoice?.invoiceNumber || "Generated after saving"}
                    readOnly
                  />
                </label>

                <label className="si-field">
                  <span>Invoice Date *</span>
                  <input
                    type="date"
                    name="invoiceDate"
                    value={form.invoiceDate}
                    onChange={changeField}
                  />
                </label>

                <label className="si-field">
                  <span>Due Date *</span>
                  <input
                    type="date"
                    name="dueDate"
                    min={form.invoiceDate}
                    value={form.dueDate}
                    onChange={changeField}
                  />
                </label>

                <label className="si-field">
                  <span>Payment Terms *</span>
                  <input
                    name="paymentTerms"
                    maxLength={100}
                    value={form.paymentTerms}
                    onChange={changeField}
                  />
                </label>

                <label className="si-field">
                  <span>Tax Treatment</span>
                  <select
                    name="taxMode"
                    value={form.taxMode}
                    onChange={changeTaxMode}
                  >
                    <option value="NONE">No GST</option>
                    <option value="INTRA_STATE">CGST + SGST</option>
                    <option value="INTER_STATE">IGST</option>
                  </select>
                </label>
              </div>

              {selectedCustomer && (
                <div className="si-customer-card">
                  <strong>{selectedCustomer.customerName}</strong>
                  <span>GSTIN: {selectedCustomer.gstNo || "Not provided"}</span>
                  <span>Phone: {selectedCustomer.phone || "Not provided"}</span>
                  <span>
                    {[
                      selectedCustomer.billingAddress,
                      selectedCustomer.city,
                      selectedCustomer.state,
                      selectedCustomer.pincode,
                    ]
                      .filter((value) => typeof value === "string" && value)
                      .join(", ") || "Address not provided"}
                  </span>
                </div>
              )}

              <label className="si-checkbox">
                <input
                  type="checkbox"
                  checked={form.updateStock}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      updateStock: event.target.checked,
                    }))
                  }
                />
                Deduct inventory-tracked goods when posting
              </label>

              <div className="si-table-wrap">
                <table className="si-table si-items-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Product / Service</th>
                      <th>Qty</th>
                      <th>Price ₹</th>
                      <th>Discount %</th>
                      <th>GST %</th>
                      <th className="si-right">Amount</th>
                      <th>
                        <span className="si-sr-only">Remove</span>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {items.map((item, index) => {
                      const product = productMap.get(item.productId);

                      return (
                        <tr key={item.rowId}>
                          <td>{index + 1}</td>

                          <td>
                            <select
                              aria-label={`Product ${index + 1}`}
                              value={item.productId}
                              onChange={(event) =>
                                selectProduct(item.rowId, event.target.value)
                              }
                            >
                              <option value="">Select product</option>

                              {products.map((record) => (
                                <option
                                  key={idOf(record)}
                                  value={idOf(record)}
                                  disabled={items.some(
                                    (other) =>
                                      other.rowId !== item.rowId &&
                                      other.productId === idOf(record),
                                  )}
                                >
                                  {record.name} — {record.productCode}
                                </option>
                              ))}
                            </select>

                            {product && (
                              <small>
                                {product.unit} · HSN/SAC:{" "}
                                {product.hsnSacCode || "—"}
                              </small>
                            )}
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
                              label: "Price",
                              min: "0",
                              max: "1000000000",
                              step: "0.01",
                            },
                            {
                              field: "discountPercent",
                              label: "Discount",
                              min: "0",
                              max: "100",
                              step: "0.01",
                            },
                          ].map((column) => (
                            <td key={column.field}>
                              <input
                                type="number"
                                aria-label={`${column.label} ${index + 1}`}
                                min={column.min}
                                max={column.max}
                                step={column.step}
                                value={item[column.field]}
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

                          <td>
                            <select
                              aria-label={`GST ${index + 1}`}
                              disabled={form.taxMode === "NONE"}
                              value={item.gstRate}
                              onChange={(event) =>
                                updateItem(
                                  item.rowId,
                                  "gstRate",
                                  Number(event.target.value),
                                )
                              }
                            >
                              {GST_RATES.map((rate) => (
                                <option key={rate} value={rate}>
                                  {rate}%
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="si-right">
                            {previews[index].valid
                              ? money(previews[index].total)
                              : "—"}
                          </td>

                          <td>
                            <button
                              type="button"
                              className="si-icon-button si-danger"
                              aria-label={`Remove item ${index + 1}`}
                              disabled={items.length === 1}
                              onClick={() =>
                                setItems((previous) =>
                                  previous.filter(
                                    (record) => record.rowId !== item.rowId,
                                  ),
                                )
                              }
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                className="si-button"
                disabled={items.length >= 200}
                onClick={() => setItems((previous) => [...previous, newItem()])}
              >
                <Plus size={16} />
                Add Item
              </button>

              <div className="si-bottom-grid">
                <div>
                  <label className="si-field">
                    <span>Notes</span>
                    <textarea
                      name="notes"
                      rows={4}
                      maxLength={1000}
                      placeholder="Invoice notes..."
                      value={form.notes}
                      onChange={changeField}
                    />
                  </label>

                  <p className="si-muted">
                    Customer Receipts record payments separately. Saving this
                    invoice does not mark it as paid.
                  </p>
                </div>

                <div className="si-totals">
                  {[
                    ["Gross amount", totals.gross],
                    ["Discount", -totals.discount],
                    ["Taxable amount", totals.taxable],
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
                    <div key={label}>
                      <span>{label}</span>
                      <strong>{money(amount)}</strong>
                    </div>
                  ))}

                  <div className="si-grand-total">
                    <span>Total</span>
                    <strong>{money(totals.total)}</strong>
                  </div>

                  <small>
                    Preview only. The server calculates final amounts.
                  </small>
                </div>
              </div>
            </fieldset>
          </form>
        </div>

        <footer className="si-dialog-footer">
          <button
            type="button"
            className="si-button"
            disabled={Boolean(saving)}
            onClick={closeEditor}
          >
            {uncertain ? "Close and Check List" : "Cancel"}
          </button>

          <button
            type="button"
            className="si-button"
            disabled={disabled}
            onClick={() => save("SAVE_DRAFT")}
          >
            <Save size={16} />
            {saving === "SAVE_DRAFT"
              ? "Saving..."
              : editing
                ? "Save Changes"
                : "Save Draft"}
          </button>

          {!editing && (
            <button
              type="button"
              className="si-button si-primary"
              disabled={disabled}
              onClick={() => save("SAVE_AND_POST")}
            >
              <Send size={16} />
              {saving === "SAVE_AND_POST" ? "Posting..." : "Save & Post"}
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}

function InvoiceDetails({ invoice, onClose }) {
  return (
    <div className="si-overlay">
      <section
        className="si-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="si-detail-title"
      >
        <header className="si-dialog-header">
          <div>
            <h2 id="si-detail-title">{invoice.invoiceNumber}</h2>
            <p>
              {invoice.customerName} · {invoice.customerCode}
            </p>
          </div>

          <button
            type="button"
            className="si-icon-button"
            aria-label="Close invoice details"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>

        <div className="si-dialog-body">
          <div className="si-details-meta">
            <span>Invoice: {displayDate(invoice.invoiceDate)}</span>
            <span>Due: {displayDate(invoice.dueDate)}</span>
            <Badge value={invoice.status} />
            {invoice.status === "POSTED" && (
              <Badge value={invoice.paymentStatus} />
            )}
          </div>

          <div className="si-table-wrap">
            <table className="si-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Discount</th>
                  <th>GST</th>
                  <th className="si-right">Total</th>
                </tr>
              </thead>

              <tbody>
                {(invoice.items || []).map((item, index) => (
                  <tr key={`${item.productId}-${index}`}>
                    <td>
                      <strong>{item.productName}</strong>
                      <small>{item.productCode}</small>
                    </td>
                    <td>
                      {item.quantity} {item.unit}
                    </td>
                    <td>{money(item.unitRatePaise)}</td>
                    <td>{item.discountPercent}%</td>
                    <td>{item.gstRate}%</td>
                    <td className="si-right">{money(item.totalAmountPaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="si-bottom-grid">
            <div className="si-muted">
              <p>Payment terms: {invoice.paymentTerms}</p>
              <p>Tax mode: {invoice.taxMode?.replaceAll("_", " ")}</p>
              <p>Update stock: {invoice.updateStock ? "Yes" : "No"}</p>
              {invoice.notes && <p className="si-notes">{invoice.notes}</p>}
            </div>

            <div className="si-totals">
              {[
                ["Gross", invoice.grossAmountPaise],
                ["Discount", -invoice.discountAmountPaise],
                ["Taxable", invoice.taxableAmountPaise],
                ["CGST", invoice.cgstAmountPaise],
                ["SGST", invoice.sgstAmountPaise],
                ["IGST", invoice.igstAmountPaise],
              ].map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{money(value)}</strong>
                </div>
              ))}

              <div className="si-grand-total">
                <span>Total</span>
                <strong>{money(invoice.totalAmountPaise)}</strong>
              </div>

              {invoice.status === "POSTED" && (
                <>
                  <div>
                    <span>Paid</span>
                    <strong>{money(invoice.paidAmountPaise)}</strong>
                  </div>
                  <div>
                    <span>Outstanding</span>
                    <strong>{money(invoice.outstandingAmountPaise)}</strong>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <footer className="si-dialog-footer">
          <button type="button" className="si-button" onClick={onClose}>
            Close
          </button>
        </footer>
      </section>
    </div>
  );
}

function SalesInvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    search: "",
    status: "",
    paymentStatus: "",
    page: 1,
  });

  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
  });

  const [refresh, setRefresh] = useState(0);
  const [editor, setEditor] = useState(null);
  const [details, setDetails] = useState(null);
  const [busy, setBusy] = useState(false);

  const actionLock = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const value = search.trim();

      setFilters((previous) =>
        previous.search === value
          ? previous
          : { ...previous, search: value, page: 1 },
      );
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await invoiceApi.getAll({
          page: filters.page,
          limit: PAGE_SIZE,
          search: filters.search || undefined,
          status: filters.status || undefined,
          paymentStatus: filters.paymentStatus || undefined,
        });

        if (cancelled) return;

        if (
          response?.data?.success !== true ||
          !Array.isArray(response?.data?.data)
        ) {
          throw new Error(
            response?.data?.message || "Invalid invoice list response.",
          );
        }

        const serverPagination = response.data.pagination;

        if (filters.page > 1 && response.data.data.length === 0) {
          setFilters((previous) => ({
            ...previous,
            page: previous.page - 1,
          }));
          return;
        }

        setInvoices(response.data.data);
        setPagination({
          total: Number(serverPagination?.total || 0),
          totalPages: Number(serverPagination?.totalPages || 0),
        });
      } catch (loadError) {
        if (cancelled) return;

        setInvoices([]);
        setError(errorMessage(loadError));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [filters, refresh]);

  const reload = () => setRefresh((value) => value + 1);

  const pageTotals = useMemo(
    () =>
      invoices.reduce(
        (result, invoice) => {
          if (invoice.status === "POSTED") {
            result.posted += Number(invoice.totalAmountPaise || 0);
            result.outstanding += Number(invoice.outstandingAmountPaise || 0);
          }

          if (invoice.status === "DRAFT") {
            result.drafts += 1;
          }

          return result;
        },
        { posted: 0, outstanding: 0, drafts: 0 },
      ),
    [invoices],
  );

  const openInvoice = async (row, mode) => {
    if (actionLock.current) return;

    actionLock.current = true;
    setBusy(true);

    try {
      const response = await invoiceApi.getByNumber(row.invoiceNumber);

      if (!mounted.current) return;

      const invoice = response?.data?.invoice;

      if (!invoice?.invoiceNumber) {
        throw new Error("Unable to load invoice details.");
      }

      if (mode === "edit") {
        if (invoice.status !== "DRAFT") {
          throw new Error("Only draft invoices can be edited.");
        }

        setEditor({ invoice });
      } else {
        setDetails(invoice);
      }
    } catch (loadError) {
      if (mounted.current) {
        toast.error(errorMessage(loadError));
      }
    } finally {
      actionLock.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  const actOnDraft = async (row, action) => {
    if (actionLock.current || row.status !== "DRAFT") return;

    const posting = action === "post";

    if (
      !window.confirm(
        posting
          ? `Post ${row.invoiceNumber}? Accounting entries will be created and tracked stock deducted if selected.`
          : `Delete draft ${row.invoiceNumber}?`,
      )
    ) {
      return;
    }

    actionLock.current = true;
    setBusy(true);

    try {
      const response = posting
        ? await invoiceApi.post(row.invoiceNumber)
        : await invoiceApi.delete(row.invoiceNumber);

      if (response?.data?.success !== true) {
        throw new Error(response?.data?.message || "Action failed.");
      }

      if (mounted.current) {
        toast.success(`${row.invoiceNumber} ${posting ? "posted" : "deleted"}`);
      }
    } catch (actionError) {
      if (mounted.current) {
        toast.error(errorMessage(actionError));
      }
    } finally {
      actionLock.current = false;

      if (mounted.current) {
        setBusy(false);
        reload();
      }
    }
  };

  return (
    <div className="si-page">
      <header className="si-page-header">
        <div className="si-title">
          <div className="si-title-icon">
            <FileText size={24} />
          </div>
          <div>
            <h1>Sales Invoices</h1>
            <p>Manage customer invoices and sales postings</p>
          </div>
        </div>

        <div className="si-actions">
          <button
            type="button"
            className="si-button"
            disabled={loading || busy}
            onClick={reload}
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            type="button"
            className="si-button si-primary"
            disabled={busy}
            onClick={() => setEditor({ invoice: null })}
          >
            <Plus size={17} />
            New Invoice
          </button>
        </div>
      </header>

      <section className="si-cards">
        {[
          ["Matching invoices", pagination.total],
          ["Drafts on page", pageTotals.drafts],
          ["Posted total on page", money(pageTotals.posted)],
          ["Outstanding on page", money(pageTotals.outstanding)],
        ].map(([label, value]) => (
          <div className="si-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </section>

      <section className="si-list">
        <div className="si-toolbar">
          <div className="si-search">
            <Search size={17} />
            <input
              aria-label="Search invoices"
              placeholder="Search invoice, customer or customer code..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <select
            aria-label="Invoice status"
            value={filters.status}
            onChange={(event) =>
              setFilters((previous) => ({
                ...previous,
                status: event.target.value,
                page: 1,
              }))
            }
          >
            <option value="">All invoice statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="POSTED">Posted</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            aria-label="Payment status"
            value={filters.paymentStatus}
            onChange={(event) =>
              setFilters((previous) => ({
                ...previous,
                paymentStatus: event.target.value,
                page: 1,
              }))
            }
          >
            <option value="">All payment statuses</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PARTIALLY_PAID">Partially Paid</option>
            <option value="PAID">Paid</option>
          </select>
        </div>

        {error ? (
          <div className="si-error" role="alert">
            {error}
            <button type="button" className="si-button" onClick={reload}>
              Retry
            </button>
          </div>
        ) : loading ? (
          <div className="si-empty" role="status">
            Loading invoices...
          </div>
        ) : invoices.length === 0 ? (
          <div className="si-empty">
            <FileText size={32} />
            <h3>No invoices found</h3>
            <p>Create an invoice or change your filters.</p>
          </div>
        ) : (
          <div className="si-table-wrap">
            <table className="si-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Invoice Date</th>
                  <th>Due Date</th>
                  <th className="si-right">Total</th>
                  <th className="si-right">Paid</th>
                  <th className="si-right">Outstanding</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {invoices.map((invoice) => (
                  <tr key={idOf(invoice)}>
                    <td>
                      <button
                        type="button"
                        className="si-link"
                        disabled={busy}
                        onClick={() => openInvoice(invoice, "view")}
                      >
                        {invoice.invoiceNumber}
                      </button>
                    </td>

                    <td>
                      <strong>{invoice.customerName}</strong>
                      <small>{invoice.customerCode}</small>
                    </td>

                    <td>{displayDate(invoice.invoiceDate)}</td>
                    <td>{displayDate(invoice.dueDate)}</td>

                    <td className="si-right">
                      {money(invoice.totalAmountPaise)}
                    </td>

                    <td className="si-right">
                      {invoice.status === "POSTED"
                        ? money(invoice.paidAmountPaise)
                        : "—"}
                    </td>

                    <td className="si-right">
                      {invoice.status === "POSTED"
                        ? money(invoice.outstandingAmountPaise)
                        : "Not posted"}
                    </td>

                    <td>
                      <Badge value={invoice.status} />
                    </td>

                    <td>
                      {invoice.status === "POSTED" ? (
                        <Badge value={invoice.paymentStatus} />
                      ) : (
                        "—"
                      )}
                    </td>

                    <td>
                      <div className="si-row-actions">
                        <button
                          type="button"
                          className="si-icon-button"
                          title="View"
                          aria-label={`View ${invoice.invoiceNumber}`}
                          disabled={busy}
                          onClick={() => openInvoice(invoice, "view")}
                        >
                          <Eye size={16} />
                        </button>

                        {invoice.status === "DRAFT" && (
                          <>
                            <button
                              type="button"
                              className="si-icon-button"
                              title="Edit draft"
                              aria-label={`Edit ${invoice.invoiceNumber}`}
                              disabled={busy}
                              onClick={() => openInvoice(invoice, "edit")}
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              type="button"
                              className="si-icon-button"
                              title="Post draft"
                              aria-label={`Post ${invoice.invoiceNumber}`}
                              disabled={busy}
                              onClick={() => actOnDraft(invoice, "post")}
                            >
                              <Send size={16} />
                            </button>

                            <button
                              type="button"
                              className="si-icon-button si-danger"
                              title="Delete draft"
                              aria-label={`Delete ${invoice.invoiceNumber}`}
                              disabled={busy}
                              onClick={() => actOnDraft(invoice, "delete")}
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <footer className="si-pagination">
          <span>
            {pagination.total} matching invoices · Page {filters.page} of{" "}
            {Math.max(1, pagination.totalPages)}
          </span>

          <div className="si-actions">
            <button
              type="button"
              className="si-button"
              disabled={loading || busy || filters.page <= 1}
              onClick={() =>
                setFilters((previous) => ({
                  ...previous,
                  page: previous.page - 1,
                }))
              }
            >
              <ChevronLeft size={16} />
              Previous
            </button>

            <button
              type="button"
              className="si-button"
              disabled={
                loading || busy || filters.page >= pagination.totalPages
              }
              onClick={() =>
                setFilters((previous) => ({
                  ...previous,
                  page: previous.page + 1,
                }))
              }
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </footer>
      </section>

      {editor && (
        <SalesInvoiceEditor
          invoice={editor.invoice}
          onClose={() => {
            setEditor(null);
            reload();
          }}
          onSaved={() => {
            setEditor(null);
            reload();
          }}
        />
      )}

      {details && (
        <InvoiceDetails invoice={details} onClose={() => setDetails(null)} />
      )}
    </div>
  );
}

export default function SalesInvoices() {
  const [tenantRevision, setTenantRevision] = useState(0);

  const resetTenant = useCallback(() => {
    setTenantRevision((value) => value + 1);
  }, []);

  useEffect(() => {
    window.addEventListener("tenantChanged", resetTenant);

    return () => {
      window.removeEventListener("tenantChanged", resetTenant);
    };
  }, [resetTenant]);

  return <SalesInvoicesPage key={tenantRevision} />;
}
