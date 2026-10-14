import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  Building2,
  FileText,
  Plus,
  Save,
  Send,
  Trash2,
} from "lucide-react";

import toast from "react-hot-toast";

import api from "../../services/api";
import routes from "../../config/routes";

import Input from "../../components/common/Form/Input";
import Select from "../../components/common/Form/Select";
import Textarea from "../../components/common/Form/Textarea";
import Button from "../../components/common/Form/Button";

import "../../styles/invoice-common.css";

const supplierApi = api.suppliers || api.supplier;
const productApi = api.products || api.product;

const GST_RATES = [0, 3, 5, 12, 18, 28];

const TAX_OPTIONS = [
  { value: "NONE", label: "No GST" },
  { value: "INTRA_STATE", label: "CGST + SGST" },
  { value: "INTER_STATE", label: "IGST" },
];

const moneyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatPaise = (value) =>
  moneyFormatter.format((Number(value) || 0) / 100);

const localDate = () => {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
};

const addDays = (dateValue, days) => {
  const date = new Date(`${dateValue}T00:00:00Z`);

  date.setUTCDate(
    date.getUTCDate() + (Number(days) || 0),
  );

  return date.toISOString().slice(0, 10);
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

let nextRowId = 0;

const newItem = () => ({
  rowId: `purchase-item-${++nextRowId}`,
  productId: "",
  quantity: "1",
  unitRate: "0",
  discountPercent: "0",
  gstRate: 0,
  taxCreditEligible: false,
});

const getErrors = (error) => {
  const data = error?.response?.data;

  if (Array.isArray(data?.errors) && data.errors.length) {
    return data.errors.map((item) =>
      typeof item === "string"
        ? item
        : item?.message || item?.msg || String(item),
    );
  }

  return [
    data?.message ||
      error?.message ||
      "Unable to complete the request.",
  ];
};

const extractList = (response, fallbackKey) => {
  const body = response?.data;

  if (Array.isArray(body?.data)) {
    return body.data;
  }

  if (Array.isArray(body?.[fallbackKey])) {
    return body[fallbackKey];
  }

  if (Array.isArray(body)) {
    return body;
  }

  return [];
};

const loadAllPages = async (service, fallbackKey) => {
  if (!service?.getAll) {
    throw new Error(
      `The ${fallbackKey} API getAll method is not configured.`,
    );
  }

  const first = await service.getAll({
    page: 1,
    limit: 100,
  });

  const records = [...extractList(first, fallbackKey)];

  const pages = Math.max(
    1,
    Number(first?.data?.pagination?.totalPages) || 1,
  );

  for (let page = 2; page <= pages; page += 1) {
    const response = await service.getAll({
      page,
      limit: 100,
    });

    records.push(...extractList(response, fallbackKey));
  }

  return Array.from(
    new Map(
      records.map((record) => [record._id, record]),
    ).values(),
  );
};

// Preview only. The backend remains authoritative.
const scaledInteger = (value, scale) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const number = Number(value);
  const scaled = number * scale;
  const integer = Math.round(scaled);

  if (
    !Number.isFinite(number) ||
    number < 0 ||
    !Number.isSafeInteger(integer) ||
    Math.abs(scaled - integer) > 0.000001
  ) {
    return null;
  }

  return integer;
};

const multiplyDivide = (first, second, divisor) => {
  const denominator = BigInt(divisor);

  const result = Number(
    (BigInt(first) * BigInt(second) + denominator / 2n) /
      denominator,
  );

  if (!Number.isSafeInteger(result)) {
    throw new Error("Amount exceeds the supported range.");
  }

  return result;
};

const calculatePreview = (item, taxMode) => {
  const zero = {
    valid: false,
    gross: 0,
    discount: 0,
    taxable: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    total: 0,
  };

  const quantity = scaledInteger(item.quantity, 1000);
  const rate = scaledInteger(item.unitRate, 100);
  const discount = scaledInteger(item.discountPercent, 100);

  if (
    !item.productId ||
    quantity === null ||
    quantity <= 0 ||
    quantity > 1000000000 ||
    rate === null ||
    rate > 100000000000 ||
    discount === null ||
    discount > 10000
  ) {
    return zero;
  }

  try {
    const gross = multiplyDivide(rate, quantity, 1000);
    const discountAmount = multiplyDivide(
      gross,
      discount,
      10000,
    );

    const taxable = gross - discountAmount;
    const gstRate = taxMode === "NONE" ? 0 : Number(item.gstRate);

    const tax = multiplyDivide(taxable, gstRate, 100);

    const cgst =
      taxMode === "INTRA_STATE" ? Math.floor(tax / 2) : 0;

    const sgst =
      taxMode === "INTRA_STATE" ? tax - cgst : 0;

    const igst =
      taxMode === "INTER_STATE" ? tax : 0;

    const total = taxable + cgst + sgst + igst;

    if (!Number.isSafeInteger(total)) {
      return zero;
    }

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
    return zero;
  }
};

function PurchaseBillCreate() {
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [items, setItems] = useState(() => [newItem()]);

  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [savingAction, setSavingAction] = useState("");
  const [errors, setErrors] = useState([]);

  const submitLock = useRef(false);

  const saving = Boolean(savingAction);
  const disabled = loading || loadFailed || saving;

  useEffect(() => {
    let cancelled = false;

    const loadOptions = async () => {
      setLoading(true);
      setLoadFailed(false);
      setErrors([]);

      try {
        const [supplierRecords, productRecords] =
          await Promise.all([
            loadAllPages(supplierApi, "suppliers"),
            loadAllPages(productApi, "products"),
          ]);

        if (cancelled) {
          return;
        }

        setSuppliers(
          supplierRecords.filter(
            (supplier) =>
              supplier.status === "Active" &&
              !supplier.isDeleted,
          ),
        );

        setProducts(
          productRecords.filter(
            (product) =>
              product.status === "ACTIVE" &&
              !product.isDeleted,
          ),
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        const messages = getErrors(error);

        setErrors(messages);
        setLoadFailed(true);
        toast.error(messages[0]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadOptions();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const selectedSupplier = useMemo(
    () =>
      suppliers.find(
        (supplier) => supplier._id === form.supplierId,
      ),
    [suppliers, form.supplierId],
  );

  const productMap = useMemo(
    () =>
      new Map(
        products.map((product) => [product._id, product]),
      ),
    [products],
  );

  const previews = useMemo(
    () =>
      items.map((item) =>
        calculatePreview(item, form.taxMode),
      ),
    [items, form.taxMode],
  );

  const totals = useMemo(
    () =>
      previews.reduce(
        (result, item) => ({
          gross: result.gross + item.gross,
          discount: result.discount + item.discount,
          taxable: result.taxable + item.taxable,
          cgst: result.cgst + item.cgst,
          sgst: result.sgst + item.sgst,
          igst: result.igst + item.igst,
          total: result.total + item.total,
        }),
        {
          gross: 0,
          discount: 0,
          taxable: 0,
          cgst: 0,
          sgst: 0,
          igst: 0,
          total: 0,
        },
      ),
    [previews],
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

  const handleFieldChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors([]);
  };

  const handleSupplierChange = (event) => {
    const supplier = suppliers.find(
      (record) => record._id === event.target.value,
    );

    setForm((previous) => ({
      ...previous,
      supplierId: supplier?._id || "",
      paymentTerms:
        supplier?.paymentTerms || "Due on Receipt",
      dueDate: addDays(
        previous.billDate,
        supplier?.creditDays || 0,
      ),
    }));

    if (!supplier?.gstNo) {
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
            : productMap.get(item.productId)?.gstRate ?? 0,
        taxCreditEligible: false,
      })),
    );

    setErrors([]);
  };

  const updateItem = (rowId, field, value) => {
    setItems((previous) =>
      previous.map((item) =>
        item.rowId === rowId
          ? { ...item, [field]: value }
          : item,
      ),
    );

    setErrors([]);
  };

  const selectProduct = (rowId, productId) => {
    const product = productMap.get(productId);

    setItems((previous) =>
      previous.map((item) =>
        item.rowId === rowId
          ? {
              ...item,
              productId,
              unitRate: String(product?.purchasePrice ?? 0),
              gstRate:
                form.taxMode === "NONE"
                  ? 0
                  : product?.gstRate ?? 0,
              taxCreditEligible: false,
            }
          : item,
      ),
    );

    setErrors([]);
  };

  const removeItem = (rowId) => {
    setItems((previous) =>
      previous.filter((item) => item.rowId !== rowId),
    );
  };

  const validateForm = (action) => {
    const messages = [];

    if (!selectedSupplier) {
      messages.push("Select a supplier.");
    } else if (!selectedSupplier.ledgerId) {
      messages.push(
        "The selected supplier has no linked accounting ledger.",
      );
    }

    if (!form.supplierInvoiceNumber.trim()) {
      messages.push("Supplier invoice number is required.");
    }

    if (!form.billDate || !form.dueDate) {
      messages.push("Bill date and due date are required.");
    } else if (form.dueDate < form.billDate) {
      messages.push("Due date cannot be before bill date.");
    }

    if (!items.length) {
      messages.push("Add at least one product.");
    }

    const selectedIds = items
      .map((item) => item.productId)
      .filter(Boolean);

    if (new Set(selectedIds).size !== selectedIds.length) {
      messages.push("A product can appear only once in a bill.");
    }

    items.forEach((item, index) => {
      if (!item.productId) {
        messages.push(`Select a product for item ${index + 1}.`);
      } else if (!previews[index].valid) {
        messages.push(
          `Check quantity, rate, and discount for item ${index + 1}.`,
        );
      }

      if (
        item.taxCreditEligible &&
        !selectedSupplier?.gstNo
      ) {
        messages.push(
          `Supplier GST number is required for item ${
            index + 1
          } input tax credit.`,
        );
      }
    });

    if (
      !Number.isSafeInteger(totals.total) ||
      totals.total < 0
    ) {
      messages.push("The bill total exceeds the supported range.");
    }

    if (action === "SAVE_AND_POST" && totals.total <= 0) {
      messages.push("A posted bill must have a positive total.");
    }

    return messages;
  };

  const saveBill = async (action) => {
    if (disabled || submitLock.current) {
      return;
    }

    const messages = validateForm(action);

    if (messages.length) {
      setErrors(messages);
      toast.error(messages[0]);
      return;
    }

    submitLock.current = true;
    setSavingAction(action);
    setErrors([]);

    try {
      const payload = {
        supplierId: form.supplierId,
        supplierInvoiceNumber:
          form.supplierInvoiceNumber.trim(),
        billDate: form.billDate,
        dueDate: form.dueDate,
        paymentTerms:
          form.paymentTerms.trim() || "Due on Receipt",
        taxMode: form.taxMode,
        updateStock: form.updateStock,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitRate: Number(item.unitRate),
          discountPercent: Number(item.discountPercent),
          gstRate:
            form.taxMode === "NONE"
              ? 0
              : Number(item.gstRate),
          taxCreditEligible:
            form.taxMode !== "NONE" &&
            Boolean(item.taxCreditEligible),
        })),
        notes: form.notes.trim(),
        action,
      };

      const response = await api.purchaseBills.create(payload);
      const bill = response?.data?.bill;

      if (!bill?.billNumber) {
        throw new Error(
          "The server did not return a bill number. Check the list before retrying.",
        );
      }

      toast.success(
        bill.status === "POSTED"
          ? `${bill.billNumber} created and posted successfully`
          : `${bill.billNumber} draft saved successfully`,
      );

      navigate(routes.purchase.invoices, {
        replace: true,
      });
    } catch (error) {
      const messages = getErrors(error);

      setErrors(messages);
      toast.error(messages[0]);
    } finally {
      submitLock.current = false;
      setSavingAction("");
    }
  };

  const exitPage = () => {
    if (!saving) {
      navigate(routes.purchase.invoices);
    }
  };

  const supplierOptions = suppliers.map((supplier) => ({
    value: supplier._id,
    label: `${supplier.supplierName} (${supplier.supplierCode})`,
  }));

  return (
   <div className="document-page document-responsive">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          saveBill("SAVE_DRAFT");
        }}
        noValidate
      >
        <header className="document-header">
          <div className="document-heading">
            <Button
              variant="secondary"
              icon={ArrowLeft}
              onClick={exitPage}
              disabled={saving}
              aria-label="Exit to purchase bills"
            >
              Exit
            </Button>

            <div className="document-title">
              <FileText size={20} />

              <div>
                <h1>Create Purchase Bill</h1>
                <p>Record a supplier invoice</p>
              </div>
            </div>
          </div>

          <div className="document-actions">
            <Button
              variant="secondary"
              icon={Save}
              disabled={disabled}
              loading={savingAction === "SAVE_DRAFT"}
              onClick={() => saveBill("SAVE_DRAFT")}
            >
              Save Draft
            </Button>

            <Button
              icon={Send}
              disabled={disabled}
              loading={savingAction === "SAVE_AND_POST"}
              onClick={() => saveBill("SAVE_AND_POST")}
            >
              Save & Post
            </Button>
          </div>
        </header>

        <main className="document-main">
          {loading && (
            <div className="document-notice" role="status">
              Loading suppliers and products...
            </div>
          )}

          {errors.length > 0 && (
            <div
              className="document-notice document-notice-error"
              role="alert"
            >
              <strong>Please review the following</strong>

              <ul>
                {errors.map((message, index) => (
                  <li key={`${index}-${message}`}>
                    {message}
                  </li>
                ))}
              </ul>

              {loadFailed && (
                <Button
                  variant="secondary"
                  onClick={() =>
                    setReloadKey((previous) => previous + 1)
                  }
                >
                  Retry Loading
                </Button>
              )}
            </div>
          )}

          <fieldset
            className="document-fieldset"
            disabled={disabled}
          >
            <section className="document-card document-top-grid">
              <div className="document-party-section">
                <h2 className="document-section-title">
                  <Building2 size={18} />
                  Supplier / Bill From
                </h2>

                <Select
                  label="Select Supplier"
                  name="supplierId"
                  value={form.supplierId}
                  onChange={handleSupplierChange}
                  options={supplierOptions}
                  placeholder="Choose a supplier"
                  required
                />

                {selectedSupplier ? (
                  <div className="document-party-card">
                    <div className="document-avatar">
                      {selectedSupplier.supplierName
                        ?.charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="document-party-copy">
                      <h3>{selectedSupplier.supplierName}</h3>

                      <p>{selectedSupplier.supplierCode}</p>

                      <p>
                        <span>Address:</span>{" "}
                        {address || "Not provided"}
                      </p>

                      <p>
                        <span>GSTIN:</span>{" "}
                        {selectedSupplier.gstNo || "Not provided"}
                      </p>

                      <p>
                        <span>Phone:</span>{" "}
                        {selectedSupplier.phone || "Not provided"}
                      </p>

                      {selectedSupplier.email && (
                        <p>{selectedSupplier.email}</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="document-empty-party">
                    Select a supplier to view its address and GST details.
                  </div>
                )}

                {!loading && !suppliers.length && (
                  <p className="document-hint">
                    No active suppliers found. Create a supplier first.
                  </p>
                )}
              </div>

              <div className="document-details-section">
                <h2 className="document-section-title">
                  Bill Details
                </h2>

                <div className="document-fields-grid">
                  <Input
                    label="Bill Number"
                    name="billNumber"
                    value="Generated after saving"
                    readOnly
                  />

                  <Input
                    label="Supplier Invoice Number"
                    name="supplierInvoiceNumber"
                    value={form.supplierInvoiceNumber}
                    onChange={handleFieldChange}
                    placeholder="Example: MANJU-002"
                    maxLength={100}
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
                    onChange={handleTaxModeChange}
                    options={TAX_OPTIONS}
                  />
                </div>

                <label className="document-check">
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

                  <span>
                    Receive inventory-tracked goods when posting
                  </span>
                </label>

                <p className="document-hint">
                  Select this only when the goods have actually been
                  received. Draft saving does not change stock.
                </p>
              </div>
            </section>

            <section className="document-card">
              <div className="document-card-heading">
                <div>
                  <h2>Items</h2>
                  <p>Select products and enter supplier invoice rates.</p>
                </div>

                <Button
                  variant="secondary"
                  icon={Plus}
                  disabled={items.length >= 200}
                  onClick={() =>
                    setItems((previous) => [
                      ...previous,
                      newItem(),
                    ])
                  }
                >
                  Add Item
                </Button>
              </div>

              <div className="document-table-wrap">
                <table className="document-items-table">
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Rate (₹)</th>
                      <th>Discount %</th>
                      <th>GST %</th>
                      <th>Input Credit</th>
                      <th>Amount</th>
                      <th>
                        <span className="document-sr-only">
                          Remove
                        </span>
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
                              (other) =>
                                other.productId === record._id,
                            ),
                        )
                        .map((record) => ({
                          value: record._id,
                          label:
                            `${record.name} (${record.productCode})`,
                        }));

                      return (
                        <tr key={item.rowId}>
                          <td
                            data-label="Item"
                            className="document-item-number"
                          >
                            {index + 1}
                          </td>

                          <td
                            data-label="Product"
                            className="document-product-cell"
                          >
                            <Select
                              name={`product-${item.rowId}`}
                              aria-label={`Product ${index + 1}`}
                              value={item.productId}
                              placeholder="Select product"
                              options={options}
                              onChange={(event) =>
                                selectProduct(
                                  item.rowId,
                                  event.target.value,
                                )
                              }
                            />

                            {product && (
                              <small className="document-item-meta">
                                {product.unit}
                                {" · "}
                                HSN/SAC: {product.hsnSacCode || "N/A"}
                                {" · "}
                                {product.type}
                              </small>
                            )}
                          </td>

                          <td data-label="Quantity">
                            <Input
                              name={`quantity-${item.rowId}`}
                              aria-label={`Quantity ${index + 1}`}
                              type="number"
                              inputMode="decimal"
                              min="0.001"
                              max="1000000"
                              step="0.001"
                              value={item.quantity}
                              onChange={(event) =>
                                updateItem(
                                  item.rowId,
                                  "quantity",
                                  event.target.value,
                                )
                              }
                            />
                          </td>

                          <td data-label="Rate (₹)">
                            <Input
                              name={`rate-${item.rowId}`}
                              aria-label={`Rate ${index + 1}`}
                              type="number"
                              inputMode="decimal"
                              min="0"
                              max="1000000000"
                              step="0.01"
                              value={item.unitRate}
                              onChange={(event) =>
                                updateItem(
                                  item.rowId,
                                  "unitRate",
                                  event.target.value,
                                )
                              }
                            />
                          </td>

                          <td data-label="Discount %">
                            <Input
                              name={`discount-${item.rowId}`}
                              aria-label={`Discount ${index + 1}`}
                              type="number"
                              inputMode="decimal"
                              min="0"
                              max="100"
                              step="0.01"
                              value={item.discountPercent}
                              onChange={(event) =>
                                updateItem(
                                  item.rowId,
                                  "discountPercent",
                                  event.target.value,
                                )
                              }
                            />
                          </td>

                          <td data-label="GST %">
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
                          </td>

                          <td data-label="Input Credit">
                            <label className="document-check">
                              <input
                                type="checkbox"
                                checked={item.taxCreditEligible}
                                disabled={
                                  form.taxMode === "NONE" ||
                                  !selectedSupplier?.gstNo ||
                                  Number(item.gstRate) === 0
                                }
                                aria-label={`Input tax credit ${index + 1}`}
                                onChange={(event) =>
                                  updateItem(
                                    item.rowId,
                                    "taxCreditEligible",
                                    event.target.checked,
                                  )
                                }
                              />

                              <span>Eligible</span>
                            </label>
                          </td>

                          <td
                            data-label="Amount"
                            className="document-item-amount"
                          >
                            {formatPaise(previews[index].total)}
                          </td>

                          <td data-label="Remove">
                            <button
                              type="button"
                              className="document-remove-button"
                              aria-label={`Remove item ${index + 1}`}
                              onClick={() => removeItem(item.rowId)}
                            >
                              <Trash2 size={17} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {!items.length && (
                      <tr>
                        <td
                          colSpan={9}
                          className="document-empty-items"
                        >
                          No items added. Use “Add Item” to begin.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <p className="document-table-note">
                Amounts include line discounts and GST. Select input
                credit only after verifying eligibility.
              </p>
            </section>

            <section className="document-bottom-grid">
              <div className="document-card document-notes">
                <Textarea
                  label="Internal Notes"
                  name="notes"
                  value={form.notes}
                  onChange={handleFieldChange}
                  maxLength={1000}
                  rows={5}
                  placeholder="Supplier instructions or purchase notes..."
                />

                <p className="document-hint">
                  Payments are recorded separately. This form does
                  not mark a bill as paid.
                </p>
              </div>

              <div className="document-card document-summary">
                <h2>Bill Summary</h2>

                <div className="document-summary-row">
                  <span>Gross amount</span>
                  <strong>{formatPaise(totals.gross)}</strong>
                </div>

                <div className="document-summary-row">
                  <span>Line discounts</span>
                  <strong>− {formatPaise(totals.discount)}</strong>
                </div>

                <div className="document-summary-row">
                  <span>Taxable amount</span>
                  <strong>{formatPaise(totals.taxable)}</strong>
                </div>

                {form.taxMode === "INTRA_STATE" && (
                  <>
                    <div className="document-summary-row">
                      <span>CGST</span>
                      <strong>{formatPaise(totals.cgst)}</strong>
                    </div>

                    <div className="document-summary-row">
                      <span>SGST</span>
                      <strong>{formatPaise(totals.sgst)}</strong>
                    </div>
                  </>
                )}

                {form.taxMode === "INTER_STATE" && (
                  <div className="document-summary-row">
                    <span>IGST</span>
                    <strong>{formatPaise(totals.igst)}</strong>
                  </div>
                )}

                <div className="document-summary-total">
                  <span>Total amount</span>
                  <strong>{formatPaise(totals.total)}</strong>
                </div>

                <p className="document-hint">
                  Preview only. Final totals are calculated by the server.
                </p>
              </div>
            </section>
          </fieldset>

          <footer className="document-footer">
            <p>
              Drafts do not affect stock or accounting. Posting
              finalizes the bill.
            </p>

            <div className="document-actions">
              <Button
                variant="secondary"
                icon={Save}
                disabled={disabled}
                loading={savingAction === "SAVE_DRAFT"}
                onClick={() => saveBill("SAVE_DRAFT")}
              >
                Save Draft
              </Button>

              <Button
                icon={Send}
                disabled={disabled}
                loading={savingAction === "SAVE_AND_POST"}
                onClick={() => saveBill("SAVE_AND_POST")}
              >
                Save & Post
              </Button>
            </div>
          </footer>
        </main>
      </form>
    </div>
  );
}

export default PurchaseBillCreate;