import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  ChevronDown,
  FileText,
  Plus,
  Save,
  Search,
  Send,
  StickyNote,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";

import toast from "react-hot-toast";

import api from "../../services/api";
import routes from "../../config/routes";

import Input from "../../components/common/Form/Input";
import Select from "../../components/common/Form/Select";
import Textarea from "../../components/common/Form/Textarea";
import Button from "../../components/common/Form/Button";

import "../../styles/invoice-common1.css";

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
  date.setUTCDate(date.getUTCDate() + (Number(days) || 0));
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

  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.[fallbackKey])) return body[fallbackKey];
  if (Array.isArray(body)) return body;

  return [];
};

const loadAllPages = async (service, fallbackKey) => {
  if (!service?.getAll) {
    throw new Error(
      `The ${fallbackKey} API getAll method is not configured.`,
    );
  }

  const first = await service.getAll({ page: 1, limit: 100 });
  const records = [...extractList(first, fallbackKey)];

  const pages = Math.max(
    1,
    Number(first?.data?.pagination?.totalPages) || 1,
  );

  for (let page = 2; page <= pages; page += 1) {
    const response = await service.getAll({ page, limit: 100 });
    records.push(...extractList(response, fallbackKey));
  }

  return Array.from(
    new Map(records.map((record) => [record._id, record])).values(),
  );
};

const formatAddress = (supplier) =>
  [
    supplier.billingAddress,
    supplier.city,
    supplier.state,
    supplier.pincode,
    supplier.country,
  ]
    .filter(Boolean)
    .join(", ");

/* Preview calculation only. The backend remains authoritative. */

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

const EMPTY_PREVIEW = {
  valid: false,
  gross: 0,
  discount: 0,
  taxable: 0,
  cgst: 0,
  sgst: 0,
  igst: 0,
  total: 0,
};

const calculatePreview = (item, taxMode) => {
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
    return EMPTY_PREVIEW;
  }

  try {
    const gross = multiplyDivide(rate, quantity, 1000);
    const discountAmount = multiplyDivide(gross, discount, 10000);
    const taxable = gross - discountAmount;

    const gstRate = taxMode === "NONE" ? 0 : Number(item.gstRate);
    const tax = multiplyDivide(taxable, gstRate, 100);

    const cgst = taxMode === "INTRA_STATE" ? Math.floor(tax / 2) : 0;
    const sgst = taxMode === "INTRA_STATE" ? tax - cgst : 0;
    const igst = taxMode === "INTER_STATE" ? tax : 0;

    const total = taxable + cgst + sgst + igst;

    if (!Number.isSafeInteger(total)) {
      return EMPTY_PREVIEW;
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
    return EMPTY_PREVIEW;
  }
};

/* ---------------------------------------------------------
   Supplier dropdown
--------------------------------------------------------- */

function SupplierPicker({
  suppliers,
  selected,
  disabled,
  loading,
  onSelect,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const rootRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onPointerDown = (event) => {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    searchRef.current?.focus();

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const matches = needle
      ? suppliers.filter((supplier) =>
          [
            supplier.supplierName,
            supplier.supplierCode,
            supplier.gstNo,
            supplier.phone,
            supplier.city,
          ]
            .filter(Boolean)
            .some((value) =>
              String(value).toLowerCase().includes(needle),
            ),
        )
      : suppliers;

    return matches;
  }, [suppliers, query]);

  const visible = filtered.slice(0, 100);

  const choose = (supplier) => {
    onSelect(supplier);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="doc-picker" ref={rootRef}>
      {selected ? (
        <div className="doc-party-card">
          <div className="doc-avatar">
            {selected.supplierName?.charAt(0).toUpperCase()}
          </div>

          <div className="doc-party-copy">
            <h3>{selected.supplierName}</h3>
            <p>{selected.supplierCode}</p>

            <p>
              <span>Address:</span>{" "}
              {formatAddress(selected) || "Not provided"}
            </p>

            <p>
              <span>GSTIN:</span>{" "}
              {selected.gstNo || "Not provided"}
            </p>

            <p>
              <span>Phone:</span>{" "}
              {selected.phone || "Not provided"}
            </p>

            <button
              type="button"
              className="doc-link-button"
              disabled={disabled}
              onClick={() => setOpen((previous) => !previous)}
            >
              Change supplier
            </button>
          </div>

          <button
            type="button"
            className="doc-icon-button"
            disabled={disabled}
            aria-label="Remove supplier"
            onClick={() => onSelect(null)}
          >
            <X size={15} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="doc-dashed-box"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((previous) => !previous)}
        >
          <UserPlus size={19} />
          <span>{loading ? "Loading suppliers..." : "+ Select Supplier"}</span>
        </button>
      )}

      {open && (
        <div className="doc-picker-panel">
          <div className="doc-picker-search">
            <Search size={15} />

            <input
              ref={searchRef}
              type="search"
              value={query}
              placeholder="Search name, code, GST, phone..."
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search suppliers"
            />
          </div>

          <div className="doc-picker-list" role="listbox">
            {visible.map((supplier) => (
              <button
                key={supplier._id}
                type="button"
                role="option"
                aria-selected={selected?._id === supplier._id}
                className="doc-picker-option"
                onClick={() => choose(supplier)}
              >
                <strong>{supplier.supplierName}</strong>

                <span>
                  {supplier.supplierCode}
                  {supplier.gstNo ? ` · ${supplier.gstNo}` : ""}
                  {supplier.city ? ` · ${supplier.city}` : ""}
                </span>
              </button>
            ))}

            {!visible.length && (
              <p className="doc-picker-empty">
                {suppliers.length
                  ? "No suppliers match your search."
                  : "No active suppliers found. Create a supplier first."}
              </p>
            )}

            {filtered.length > visible.length && (
              <p className="doc-picker-empty">
                Showing the first {visible.length} matches. Refine
                your search.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   Page
--------------------------------------------------------- */

function PurchaseBillCreate1() {
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [items, setItems] = useState(() => [newItem()]);

  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [showNotes, setShowNotes] = useState(false);

  const [savingAction, setSavingAction] = useState("");
  const [errors, setErrors] = useState([]);

  const submitLock = useRef(false);
  const initialSnapshot = useRef(JSON.stringify(initialForm()));

  const saving = Boolean(savingAction);
  const disabled = loading || loadFailed || saving;

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
            (supplier) =>
              supplier.status === "Active" && !supplier.isDeleted,
          ),
        );

        setProducts(
          productRecords.filter(
            (product) =>
              product.status === "ACTIVE" && !product.isDeleted,
          ),
        );
      } catch (error) {
        if (cancelled) return;

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

  const taxTotal = totals.cgst + totals.sgst + totals.igst;

  const isDirty =
    JSON.stringify(form) !== initialSnapshot.current ||
    items.length !== 1 ||
    items.some((item) => item.productId);

  const handleFieldChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({ ...previous, [name]: value }));
    setErrors([]);
  };

  const handleSupplierSelect = (supplier) => {
    setForm((previous) => ({
      ...previous,
      supplierId: supplier?._id || "",
      paymentTerms: supplier?.paymentTerms || "Due on Receipt",
      dueDate: addDays(previous.billDate, supplier?.creditDays || 0),
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

    setForm((previous) => ({ ...previous, taxMode }));

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
        item.rowId === rowId ? { ...item, [field]: value } : item,
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
                form.taxMode === "NONE" ? 0 : product?.gstRate ?? 0,
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

      if (item.taxCreditEligible && !selectedSupplier?.gstNo) {
        messages.push(
          `Supplier GST number is required for item ${index + 1} input credit.`,
        );
      }
    });

    if (!Number.isSafeInteger(totals.total) || totals.total < 0) {
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
      window.scrollTo?.({ top: 0, behavior: "smooth" });
      return;
    }

    submitLock.current = true;
    setSavingAction(action);
    setErrors([]);

    try {
      const payload = {
        supplierId: form.supplierId,
        supplierInvoiceNumber: form.supplierInvoiceNumber.trim(),
        billDate: form.billDate,
        dueDate: form.dueDate,
        paymentTerms: form.paymentTerms.trim() || "Due on Receipt",
        taxMode: form.taxMode,
        updateStock: form.updateStock,
        items: items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitRate: Number(item.unitRate),
          discountPercent: Number(item.discountPercent),
          gstRate: form.taxMode === "NONE" ? 0 : Number(item.gstRate),
          taxCreditEligible:
            form.taxMode !== "NONE" && Boolean(item.taxCreditEligible),
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

      navigate(routes.purchase.invoices, { replace: true });
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
    if (saving) {
      return;
    }

    if (
      isDirty &&
      !window.confirm("Discard this purchase bill and leave the page?")
    ) {
      return;
    }

    navigate(routes.purchase.invoices);
  };

  const actionButtons = (
    <>
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
    </>
  );

  return (
    <div className="doc-page">
      <form
        noValidate
        onSubmit={(event) => event.preventDefault()}
      >
        <header className="doc-header">
          <div className="doc-header-left">
            <Button
              variant="secondary"
              icon={ArrowLeft}
              disabled={saving}
              onClick={exitPage}
              aria-label="Exit to purchase bills"
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
          </div>
        )}

        <fieldset className="doc-fieldset" disabled={disabled}>
          <main className="doc-main">
            {/* TOP */}

            <section className="doc-top">
              <div className="doc-panel doc-party-panel">
                <h2 className="doc-panel-title">Bill From</h2>

                <SupplierPicker
                  suppliers={suppliers}
                  selected={selectedSupplier}
                  disabled={disabled}
                  loading={loading}
                  onSelect={handleSupplierSelect}
                />
              </div>

              <div className="doc-panel">
                <h2 className="doc-panel-title">Bill Details</h2>

                <div className="doc-fields-grid">
                  <Input
                    label="Bill Number"
                    name="billNumber"
                    value="Generated after saving"
                    readOnly
                  />

                  <Input
                    label="Supplier Invoice No."
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

                <label className="doc-check">
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
                    <small>
                      Select only when the goods have actually been
                      received. Saving a draft never changes stock.
                    </small>
                  </span>
                </label>
              </div>
            </section>

            {/* ITEMS */}

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
                      <th>Tax</th>
                      <th>Amount (₹)</th>
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
                              (other) =>
                                other.productId === record._id,
                            ),
                        )
                        .map((record) => ({
                          value: record._id,
                          label: `${record.name} (${record.productCode})`,
                        }));

                      return (
                        <tr key={item.rowId}>
                          <td
                            data-label="No."
                            className="doc-cell-no"
                          >
                            {index + 1}
                          </td>

                          <td
                            data-label="Item"
                            className="doc-cell-item"
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
                              <small className="doc-item-meta">
                                {product.unit} · {product.type}
                                {product.trackInventory
                                  ? " · Stock tracked"
                                  : ""}
                              </small>
                            )}
                          </td>

                          <td
                            data-label="HSN / SAC"
                            className="doc-cell-hsn"
                          >
                            {product?.hsnSacCode || "—"}
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

                          <td data-label="Price/Item (₹)">
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

                          <td data-label="Tax (GST %)">
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

                          <td
                            data-label="Amount (₹)"
                            className="doc-cell-amount"
                          >
                            {formatPaise(previews[index].total)}
                          </td>

                          <td
                            data-label="Remove"
                            className="doc-cell-action"
                          >
                            <button
                              type="button"
                              className="doc-remove-button"
                              aria-label={`Remove item ${index + 1}`}
                              onClick={() => removeItem(item.rowId)}
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
                        {formatPaise(taxTotal)}
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
                  disabled={items.length >= 200}
                  onClick={() =>
                    setItems((previous) => [...previous, newItem()])
                  }
                >
                  <Plus size={15} />
                  Add Item
                </button>
              </div>
            </section>

            {/* BOTTOM */}

            <section className="doc-bottom">
              <div className="doc-extras">
                <button
                  type="button"
                  className={`doc-extra-row ${
                    showNotes ? "is-open" : ""
                  }`}
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
                  Payments are recorded separately. This form does not
                  mark a bill as paid.
                </p>
              </div>

              <div className="doc-summary">
                <div className="doc-summary-row">
                  <span>Gross Amount</span>
                  <strong>{formatPaise(totals.gross)}</strong>
                </div>

                <div className="doc-summary-row">
                  <span>Line Discounts</span>
                  <strong>− {formatPaise(totals.discount)}</strong>
                </div>

                <div className="doc-summary-row">
                  <span>Taxable Amount</span>
                  <strong>{formatPaise(totals.taxable)}</strong>
                </div>

                {form.taxMode === "INTRA_STATE" && (
                  <>
                    <div className="doc-summary-row">
                      <span>CGST</span>
                      <strong>{formatPaise(totals.cgst)}</strong>
                    </div>

                    <div className="doc-summary-row">
                      <span>SGST</span>
                      <strong>{formatPaise(totals.sgst)}</strong>
                    </div>
                  </>
                )}

                {form.taxMode === "INTER_STATE" && (
                  <div className="doc-summary-row">
                    <span>IGST</span>
                    <strong>{formatPaise(totals.igst)}</strong>
                  </div>
                )}

                <div className="doc-summary-total">
                  <span>Total Amount:</span>
                  <strong>{formatPaise(totals.total)}</strong>
                </div>

                <p className="doc-note">
                  Preview only. The server calculates final totals.
                </p>
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