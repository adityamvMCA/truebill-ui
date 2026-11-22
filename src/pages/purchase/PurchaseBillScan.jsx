import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  FileText,
  FileUp,
  Plus,
  Save,
  ScanLine,
  Trash2,
  X,
} from "lucide-react";

import toast from "react-hot-toast";

import api from "../../services/api";
import routes from "../../config/routes";

import Input from "../../components/common/Form/Input";
import Select from "../../components/common/Form/Select";
import Textarea from "../../components/common/Form/Textarea";
import Button from "../../components/common/Form/Button";

import EntitySearchPicker from "../../components/common/EntitySearchPicker/EntitySearchPicker";
import useKeyboardOpen from "../../hooks/useKeyboardOpen";

import {
  GST_RATES,
  TAX_OPTIONS,
  addDays,
  formatPaise,
  getErrors,
  localDate,
} from "./purchaseBill.utils";

import "../../styles/invoice-common1.css";
import "./PurchaseBillCreateResponsive.css";
import "./PurchaseBillScan.css";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const supplierApi = api.suppliers || api.supplier;
const productApi = api.products || api.product;

const MAX_FILES = 6;
const MAX_MB = 12;

const ALLOWED_EXTENSIONS = [
  "pdf", "doc", "docx", "xlsx", "csv", "txt",
  "jpg", "jpeg", "png", "webp", "bmp", "tif", "tiff",
];

const ACCEPT = `${ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(",")},image/*,application/pdf`;

const UNIT_OPTIONS = [
  "NOS", "PCS", "BOX", "BAG", "PACK", "SET", "KG", "GRAM", "TON", "LITRE",
  "ML", "METER", "FEET", "SQFT", "SQM", "HOUR", "DAY", "MONTH",
].map((unit) => ({ value: unit, label: unit }));

const TYPE_OPTIONS = [
  { value: "GOODS", label: "Goods" },
  { value: "SERVICE", label: "Service" },
];

const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

// Chrome ignores autocomplete="off" on address-like fields, so use a junk token.
const NO_AUTOFILL = "nope";

const normalizeId = (value) => {
  if (!value) return "";
  if (typeof value === "object") return String(value._id || value.id || "");
  return String(value);
};

const roundTo = (value, digits) => Number(Number(value).toFixed(digits));

/* ---- Local preview maths (all values in paise). The server recalculates on save. ---- */

const VALID_GST_RATES = [0, 3, 5, 12, 18, 28];

const ZERO_TOTALS = {
  gross: 0,
  discount: 0,
  taxable: 0,
  cgst: 0,
  sgst: 0,
  igst: 0,
  total: 0,
};

const previewLine = (item, taxMode) => {
  const quantity = Number(item.quantity);
  const rate = Number(item.unitRate);
  const discountPercent = Number(item.discountPercent || 0);
  const gstRate = taxMode === "NONE" ? 0 : Number(item.gstRate || 0);

  const valid =
    Number.isFinite(quantity) && quantity > 0 &&
    Number.isFinite(rate) && rate >= 0 &&
    Number.isFinite(discountPercent) && discountPercent >= 0 && discountPercent <= 100 &&
    VALID_GST_RATES.includes(gstRate);

  if (!valid) return { ...ZERO_TOTALS, valid: false };

  const gross = Math.round(quantity * rate * 100);
  const discount = Math.round((gross * discountPercent) / 100);
  const taxable = gross - discount;
  const tax = Math.round((taxable * gstRate) / 100);

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (taxMode === "INTRA_STATE" || taxMode === "INTRASTATE") {
    cgst = Math.round(tax / 2);
    sgst = tax - cgst;
  } else if (taxMode === "INTER_STATE" || taxMode === "INTERSTATE") {
    igst = tax;
  }

  return { gross, discount, taxable, cgst, sgst, igst, total: taxable + cgst + sgst + igst, valid: true };
};

/* Indian digit grouping for rupee amounts, e.g. 96,32,000.00 */
const formatRupees = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const errorMessages = (error) => {
  const messages = getErrors(error);

  return Array.isArray(messages) && messages.length
    ? messages
    : [error?.message || "Something went wrong. Please try again."];
};

const parseListResponse = (response, key) => {
  const body = response?.data;

  const data = Array.isArray(body?.data)
    ? body.data
    : Array.isArray(body?.data?.[key])
      ? body.data[key]
      : Array.isArray(body?.[key])
        ? body[key]
        : Array.isArray(body)
          ? body
          : [];

  const pagination = body?.pagination || body?.data?.pagination;
  const total = Number(pagination?.total ?? data.length);

  return { data, total: Number.isFinite(total) ? Math.max(0, total) : data.length };
};

const fileExtension = (name) => String(name || "").split(".").pop().toLowerCase();

/* Stable picker callbacks */
const fetchSupplierOptions = async ({ search, page, limit }) => {
  const response = await supplierApi.getAll({ search, page, limit, status: "Active" });
  return parseListResponse(response, "suppliers");
};

const fetchProductOptions = async ({ search, page, limit }) => {
  const response = await productApi.getAll({ search, page, limit, status: "ACTIVE" });
  return parseListResponse(response, "products");
};

const getSupplierOptionId = (record) => normalizeId(record);
const getSupplierOptionLabel = (record) => record.supplierName || record.supplierCode || "Supplier";
const getSupplierOptionSubtitle = (record) =>
  [record.supplierCode, record.gstNo].filter(Boolean).join(" · ");

const getProductOptionId = (record) => normalizeId(record);
const getProductOptionLabel = (record) => record.name || record.productCode || "Product";
const getProductOptionSubtitle = (record) =>
  [record.productCode, record.type, record.unit].filter(Boolean).join(" · ");

const productLabel = (product) =>
  product ? `${product.name}${product.productCode ? ` (${product.productCode})` : ""}` : "";

let rowCounter = 0;

const blankItem = () => ({
  rowId: `scan-item-${++rowCounter}`,
  description: "",
  mode: "NEW",
  productId: "",
  productRecord: null,
  candidates: [],
  newName: "",
  unit: "NOS",
  productType: "GOODS",
  hsnSacCode: "",
  quantity: "1",
  unitRate: "0",
  discountPercent: "0",
  gstRate: 0,
  productGstRate: 0,
  taxCreditEligible: false,
  flags: [],
});

const emptySupplier = () => ({
  supplierName: "",
  gstNo: "",
  phone: "",
  email: "",
  billingAddress: "",
  city: "",
  state: "",
  pincode: "",
});

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function PurchaseBillScan() {
  const navigate = useNavigate();
  const keyboardOpen = useKeyboardOpen();

  const [step, setStep] = useState("upload"); // upload | scanning | review
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);

  const [scan, setScan] = useState(null);

  const [supplierMode, setSupplierMode] = useState("NEW");
  const [supplierRecord, setSupplierRecord] = useState(null);
  const [newSupplier, setNewSupplier] = useState(emptySupplier);

  const [form, setForm] = useState({
    supplierInvoiceNumber: "",
    billDate: localDate(),
    dueDate: localDate(),
    paymentTerms: "Due on Receipt",
    taxMode: "NONE",
    updateStock: false,
    notes: "",
  });

  const [items, setItems] = useState([]);
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const abortRef = useRef(null);
  const submitLock = useRef(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  /* ---------------- file previews ---------------- */

  const previews = useMemo(
    () =>
      files.map((file) => ({
        file,
        url: file.type?.startsWith("image/") ? URL.createObjectURL(file) : null,
      })),
    [files],
  );

  useEffect(
    () => () => previews.forEach((preview) => preview.url && URL.revokeObjectURL(preview.url)),
    [previews],
  );

  /* ---------------- derived ---------------- */

  const busy = saving || step === "scanning";

  const supplierHasGstin =
    supplierMode === "EXISTING"
      ? Boolean(supplierRecord?.gstNo)
      : GSTIN_RE.test(newSupplier.gstNo.trim().toUpperCase());

  const rowPreviews = useMemo(
    () => items.map((item) => previewLine(item, form.taxMode)),
    [items, form.taxMode],
  );

  const totals = useMemo(
    () =>
      rowPreviews.reduce(
        (result, preview) => {
          for (const key of Object.keys(ZERO_TOTALS)) {
            result[key] += Number(preview?.[key]) || 0;
          }
          return result;
        },
        { ...ZERO_TOTALS },
      ),
    [rowPreviews],
  );

  const noPrices = items.length > 0 && items.every((item) => Number(item.unitRate) === 0);

  const invalidRowCount = rowPreviews.filter((preview) => !preview?.valid).length;

  const scannedTotal = scan?.totals?.total;
  const totalMismatch =
    typeof scannedTotal === "number" &&
    items.length > 0 &&
    Math.abs(scannedTotal - totals.total / 100) > 1.5;

  const scanWarnings = scan?.warnings || [];

  /* ---------------- upload step ---------------- */

  const addFiles = (incoming, inputRef) => {
    const list = Array.from(incoming || []);

    // Always reset the input that triggered this call so the same
    // file / photo can be selected again after removal.
    if (inputRef?.current) {
      // Defer the reset so the browser finishes reading the FileList first.
      setTimeout(() => {
        if (inputRef.current) inputRef.current.value = "";
      }, 0);
    }

    if (!list.length) return;

    const problems = [];
    const accepted = [];

    for (const file of list) {
      if (!ALLOWED_EXTENSIONS.includes(fileExtension(file.name)) && !file.type?.startsWith("image/")) {
        problems.push(`"${file.name}" is not a supported file type.`);
      } else if (file.size > MAX_MB * 1024 * 1024) {
        problems.push(`"${file.name}" is larger than ${MAX_MB} MB.`);
      } else {
        accepted.push(file);
      }
    }

    setFiles((previous) => {
      const merged = [...previous, ...accepted];

      if (merged.length > MAX_FILES) {
        problems.push(`Only ${MAX_FILES} files can be scanned at once.`);
      }

      return merged.slice(0, MAX_FILES);
    });

    setErrors(problems);
  };

  const removeFile = (index) => setFiles((previous) => previous.filter((_, i) => i !== index));

  const applyScan = (data) => {
    const match = data.supplierMatch || {};
    const autoSupplier =
      ["MATCHED_GSTIN", "MATCHED_NAME"].includes(match.status) && match.supplier ? match.supplier : null;

    const billDate = data.invoice?.date || localDate();

    setScan(data);
    setSupplierMode(autoSupplier ? "EXISTING" : "NEW");
    setSupplierRecord(autoSupplier);

    setNewSupplier({
      supplierName: data.supplier?.name || "",
      gstNo: data.supplier?.gstin || "",
      phone: data.supplier?.phone || "",
      email: data.supplier?.email || "",
      billingAddress: data.supplier?.address || "",
      city: data.supplier?.city || "",
      state: data.supplier?.state || "",
      pincode: data.supplier?.pincode || "",
    });

    setForm({
      supplierInvoiceNumber: data.invoice?.number || "",
      billDate,
      dueDate: data.invoice?.dueDate || addDays(billDate, autoSupplier?.creditDays || 0),
      paymentTerms: data.invoice?.paymentTerms || autoSupplier?.paymentTerms || "Due on Receipt",
      taxMode: data.taxMode || "NONE",
      updateStock: false,
      notes: data.notes || "",
    });

    setItems(
      (data.items || []).map((item) => {
        const matched = item.match?.status === "MATCHED" ? item.match.product : null;

        return {
          ...blankItem(),
          description: item.description,
          mode: matched ? "EXISTING" : "NEW",
          productId: matched ? normalizeId(matched) : "",
          productRecord: matched || null,
          candidates: item.match?.candidates || [],
          newName: item.description,
          unit: item.unit || "NOS",
          productType: item.suggestedType || "GOODS",
          hsnSacCode: item.hsnSac || "",
          quantity: String(item.quantity),
          unitRate: String(item.unitRate),
          discountPercent: String(item.discountPercent),
          gstRate: data.taxMode === "NONE" ? 0 : Number(item.gstRate) || 0,
          productGstRate: Number(item.gstRate) || 0,
          flags: item.flags || [],
        };
      }),
    );
  };

  const startScan = async () => {
    if (!files.length || busy) return;

    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const controller = new AbortController();
    abortRef.current = controller;

    setErrors([]);
    setStep("scanning");

    try {
      const response = await api.purchaseBills.scan(formData, { signal: controller.signal });
      const data = response?.data?.data;

      if (!data) throw new Error("The scanner returned no data.");
      if (!mountedRef.current) return;

      applyScan(data);
      setStep("review");
    } catch (error) {
      if (!mountedRef.current) return;

      if (error?.code === "ERR_CANCELED" || error?.name === "CanceledError") {
        setStep("upload");
        return;
      }

      const messages = errorMessages(error);
      setErrors(messages);
      toast.error(messages[0]);
      setStep("upload");
    } finally {
      abortRef.current = null;
    }
  };

  const cancelScan = () => abortRef.current?.abort();

  const rescan = () => {
    if (saving) return;
    if (!window.confirm("Discard the scanned data and scan again?")) return;

    setScan(null);
    setItems([]);
    setErrors([]);
    setStep("upload");
  };

  const exitPage = () => {
    if (busy) return;

    if (step === "review" && !window.confirm("Discard this scanned bill and leave?")) return;

    navigate(routes.purchase.invoices);
  };

  /* ---------------- review handlers ---------------- */

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setErrors([]);
  };

  const handleSupplierField = (event) => {
    const { name, value } = event.target;
    setNewSupplier((previous) => ({ ...previous, [name]: value }));
    setErrors([]);
  };

  const chooseSupplier = (supplierId, record) => {
    if (!supplierId || !record) return;

    setSupplierMode("EXISTING");
    setSupplierRecord(record);

    setForm((previous) => ({
      ...previous,
      paymentTerms: scan?.invoice?.paymentTerms || record.paymentTerms || previous.paymentTerms,
      dueDate: scan?.invoice?.dueDate || addDays(previous.billDate, record.creditDays || 0),
    }));

    // Input credit needs a supplier GSTIN; reset when the supplier changes.
    setItems((previous) => previous.map((item) => ({ ...item, taxCreditEligible: false })));
    setErrors([]);
  };

  const patchItem = (rowId, patch) => {
    setItems((previous) => previous.map((item) => (item.rowId === rowId ? { ...item, ...patch } : item)));
    setErrors([]);
  };

  const selectProduct = (rowId, productId, record) => {
    const id = productId ? String(productId) : "";
    if (!id || !record) return;

    if (items.some((item) => item.rowId !== rowId && item.productId === id && item.mode === "EXISTING")) {
      toast.error("This product is already on another line. Merge the lines first.");
      return;
    }

    patchItem(rowId, { mode: "EXISTING", productId: id, productRecord: record });
  };

  const handleTaxModeChange = (event) => {
    const taxMode = event.target.value;

    setForm((previous) => ({ ...previous, taxMode }));

    setItems((previous) =>
      previous.map((item) => ({
        ...item,
        gstRate: taxMode === "NONE" ? 0 : item.productGstRate || item.gstRate || 0,
        taxCreditEligible: false,
      })),
    );

    setErrors([]);
  };

  const updateGstRate = (rowId, rate) => {
    const value = Number(rate);

    setItems((previous) =>
      previous.map((item) =>
        item.rowId === rowId
          ? {
              ...item,
              gstRate: value,
              productGstRate: value,
              taxCreditEligible: value === 0 ? false : item.taxCreditEligible,
            }
          : item,
      ),
    );

    setErrors([]);
  };

  const markAllEligible = () => {
    setItems((previous) =>
      previous.map((item) => ({
        ...item,
        taxCreditEligible: form.taxMode !== "NONE" && Number(item.gstRate) > 0 && supplierHasGstin,
      })),
    );
  };

  const addItem = () => {
    if (items.length >= 200) return;
    setItems((previous) => [...previous, blankItem()]);
  };

  const removeItem = (rowId) => {
    setItems((previous) => previous.filter((item) => item.rowId !== rowId));
    setErrors([]);
  };

  /* ---------------- validation + save ---------------- */

  const validateForm = () => {
    const messages = [];

    if (supplierMode === "EXISTING") {
      if (!supplierRecord) messages.push("Select a supplier.");
    } else {
      if (newSupplier.supplierName.trim().length < 2) messages.push("Enter the supplier name.");

      const gstin = newSupplier.gstNo.trim().toUpperCase();
      if (gstin && !GSTIN_RE.test(gstin)) messages.push("The supplier GSTIN is not valid.");
    }

    if (!form.supplierInvoiceNumber.trim()) messages.push("Supplier invoice number is required.");

    if (!form.billDate || !form.dueDate) {
      messages.push("Bill date and due date are required.");
    } else if (form.dueDate < form.billDate) {
      messages.push("Due date cannot be before bill date.");
    }

    if (items.length < 1) messages.push("Add at least one item.");

    const existingIds = items.filter((item) => item.mode === "EXISTING" && item.productId).map((item) => item.productId);
    if (new Set(existingIds).size !== existingIds.length) {
      messages.push("A product can appear only once in a bill. Merge duplicate lines.");
    }

    const newNames = items.filter((item) => item.mode === "NEW").map((item) => item.newName.trim().toLowerCase());
    if (new Set(newNames).size !== newNames.length) {
      messages.push("Two new products have the same name. Merge those lines.");
    }

    items.forEach((item, index) => {
      const row = index + 1;

      if (item.mode === "EXISTING" && !item.productId) {
        messages.push(`Select a product for item ${row}, or switch it to New.`);
      }

      if (item.mode === "NEW" && item.newName.trim().length < 2) {
        messages.push(`Enter a product name for item ${row}.`);
      }

      if (item.mode === "NEW" && item.hsnSacCode && !/^[A-Za-z0-9]{2,20}$/.test(item.hsnSacCode.trim())) {
        messages.push(`HSN/SAC for item ${row} must be 2–20 letters or numbers.`);
      }

      if (!rowPreviews[index]?.valid) {
        messages.push(`Check quantity, rate, discount and GST for item ${row}.`);
      }

      if (item.taxCreditEligible && !supplierHasGstin) {
        messages.push(`A supplier GSTIN is required for item ${row} input credit.`);
      }
    });

    if (totals.total <= 0) messages.push("A purchase bill must have a positive total.");

    return messages;
  };

  const buildPayload = () => {
    const taxed = form.taxMode !== "NONE";

    return {
      supplier:
        supplierMode === "EXISTING"
          ? { mode: "EXISTING", supplierId: normalizeId(supplierRecord) }
          : {
              mode: "NEW",
              data: {
                ...Object.fromEntries(
                  Object.entries(newSupplier).map(([key, value]) => [key, String(value).trim()]),
                ),
                gstNo: newSupplier.gstNo.trim().toUpperCase(),
                paymentTerms: form.paymentTerms.trim() || "Due on Receipt",
              },
            },

      supplierInvoiceNumber: form.supplierInvoiceNumber.trim(),
      billDate: form.billDate,
      dueDate: form.dueDate,
      paymentTerms: form.paymentTerms.trim() || "Due on Receipt",
      taxMode: form.taxMode,
      updateStock: form.updateStock,
      notes: form.notes.trim() || null,

      items: items.map((item) => ({
        product:
          item.mode === "EXISTING"
            ? { mode: "EXISTING", productId: item.productId }
            : {
                mode: "NEW",
                data: {
                  name: item.newName.trim(),
                  unit: item.unit,
                  type: item.productType,
                  hsnSacCode: item.hsnSacCode.trim().toUpperCase(),
                  gstRate: Number(item.productGstRate) || 0,
                },
              },
        quantity: roundTo(item.quantity, 3),
        unitRate: roundTo(item.unitRate, 2),
        discountPercent: roundTo(item.discountPercent || 0, 2),
        gstRate: taxed ? Number(item.gstRate) : 0,
        taxCreditEligible: taxed && Number(item.gstRate) > 0 && supplierHasGstin && Boolean(item.taxCreditEligible),
      })),
    };
  };

  const saveBill = async () => {
    if (busy || submitLock.current) return;

    const messages = validateForm();

    if (messages.length) {
      setErrors(messages);
      toast.error(messages[0]);
      return;
    }

    submitLock.current = true;
    setSaving(true);
    setErrors([]);

    let result;

    try {
      const response = await api.purchaseBills.confirmScan(buildPayload());
      result = response?.data;

      if (!result?.bill?.billNumber || result.bill.status !== "POSTED") {
        throw new Error("The server did not confirm a posted purchase bill. Check the bill list before saving again.");
      }
    } catch (error) {
      if (!mountedRef.current) return;

      const status = error?.response?.status;
      const messages = errorMessages(error);

      if (!status || status >= 500) {
        messages.push("The result is uncertain. Open Purchase Bills to check before saving again.");
      }

      setErrors(messages);
      toast.error(messages[0]);
      return;
    } finally {
      submitLock.current = false;
      if (mountedRef.current) setSaving(false);
    }

    const createdParts = [];
    if (result.created?.supplier) createdParts.push(`supplier ${result.created.supplier.supplierName}`);
    if (result.created?.products?.length) createdParts.push(`${result.created.products.length} new product(s)`);

    toast.success(
      `${result.bill.billNumber} posted${createdParts.length ? ` · created ${createdParts.join(" and ")}` : ""}`,
    );

    (result.warnings || []).forEach((warning) => toast(warning, { duration: 7000 }));

    navigate(routes.purchase.invoices, { replace: true });
  };

  const saveButton = (
    <Button type="button" icon={Save} disabled={busy} loading={saving} onClick={saveBill}>
      {saving ? "Saving..." : "Save & Post Bill"}
    </Button>
  );

  /* ---------------- render ---------------- */

  const address = supplierRecord
    ? [supplierRecord.billingAddress, supplierRecord.city, supplierRecord.state, supplierRecord.pincode]
        .filter(Boolean)
        .join(", ")
    : "";

  const showWarnings =
    scanWarnings.length > 0 || totalMismatch || noPrices || invalidRowCount > 0 || scan?.duplicateBill;

  return (
    <div className={`doc-page purchase-bill-document-page scan-page ${keyboardOpen ? "is-keyboard-open" : ""}`}>
      <form noValidate autoComplete="off" onSubmit={(event) => event.preventDefault()}>
        <header className="doc-header">
          <div className="doc-header-left">
            <Button type="button" variant="secondary" icon={ArrowLeft} disabled={busy} onClick={exitPage}>
              Exit
            </Button>

            <div className="doc-title">
              <ScanLine size={18} />
              <span>Scan Purchase Bill</span>
            </div>
          </div>

          <div className="doc-header-actions">
            {step === "review" && (
              <>
                <Button type="button" variant="secondary" disabled={busy} onClick={rescan}>
                  Scan again
                </Button>
                {saveButton}
              </>
            )}
          </div>
        </header>

        {errors.length > 0 && (
          <div className="doc-alerts">
            <div className="doc-alert doc-alert-error" role="alert">
              <strong>Please review the following</strong>
              <ul>
                {errors.map((message, index) => (
                  <li key={`${index}-${message}`}>{message}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ============================ UPLOAD ============================ */}
        {step !== "review" && (
          <main className="doc-main">
            <section className="scan-card">
              <div
                className={`scan-drop ${dragging ? "is-drag" : ""}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  if (step === "upload") addFiles(event.dataTransfer.files);
                }}
              >
                <ScanLine size={36} />
                <h2>Upload or capture a purchase bill</h2>
                <p>
                  PDF, Word, Excel, CSV, text, or photos (JPG, PNG, WebP). Up to {MAX_FILES} files,{" "}
                  {MAX_MB} MB each. Several photos can be pages of the same bill.
                </p>

                <div className="scan-drop-actions">
                  <Button
                    type="button"
                    icon={FileUp}
                    disabled={busy}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choose files
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    icon={Camera}
                    disabled={busy}
                    onClick={() => cameraInputRef.current?.click()}
                  >
                    Take photo
                  </Button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT}
                  multiple
                  hidden
                  onChange={(event) => addFiles(event.target.files, fileInputRef)}
                />

                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  hidden
                  onChange={(event) => {
                    // On mobile cameras the FileList is populated synchronously
                    // but React recycles the synthetic event. Grab the files
                    // before yielding so we never read an empty list.
                    const files = event.target.files;
                    addFiles(files, cameraInputRef);
                  }}
                />
              </div>

              {previews.length > 0 && (
                <ul className="scan-files">
                  {previews.map(({ file, url }, index) => (
                    <li key={`${file.name}-${index}`}>
                      {url ? <img src={url} alt="" /> : <FileText size={28} />}

                      <div>
                        <strong title={file.name}>{file.name}</strong>
                        <small>{(file.size / 1024 / 1024).toFixed(2)} MB</small>
                      </div>

                      <button
                        type="button"
                        className="doc-remove-button"
                        aria-label={`Remove ${file.name}`}
                        disabled={busy}
                        onClick={() => removeFile(index)}
                      >
                        <X size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {step === "scanning" ? (
                <div className="scan-progress" role="status">
                  <span className="scan-spinner" />
                  <div>
                    <strong>Reading your bill…</strong>
                    <p>Extracting text, then details. This can take up to a minute.</p>
                  </div>
                  <Button type="button" variant="secondary" onClick={cancelScan}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  icon={ScanLine}
                  disabled={!files.length}
                  onClick={startScan}
                >
                  Scan bill
                </Button>
              )}

              <p className="doc-note">
                Nothing is saved until you review the details and press “Save &amp; Post Bill”. Always check
                numbers against the original bill.
              </p>
            </section>
          </main>
        )}

        {/* ============================ REVIEW ============================ */}
        {step === "review" && (
          <fieldset className="doc-fieldset" disabled={busy}>
            <main className="doc-main">
              {showWarnings && (
                <div className="scan-warnings" role="alert">
                  <AlertTriangle size={18} />
                  <ul>
                    {scanWarnings.map((warning, index) => (
                      <li key={`${index}-${warning}`}>{warning}</li>
                    ))}

                    {noPrices && (
                      <li>
                        No item price could be read. Enter the Price/Item for each line from the original bill.
                      </li>
                    )}

                    {invalidRowCount > 0 && (
                      <li>
                        {invalidRowCount} item line(s) have a quantity, rate, discount or GST value that cannot
                        be calculated. Check each line.
                      </li>
                    )}

                    {totalMismatch && (
                      <li>
                        Calculated total {formatPaise(totals.total)} differs from the scanned total{" "}
                        {formatRupees(scannedTotal)}. Check quantities, rates and GST.
                      </li>
                    )}
                  </ul>
                </div>
              )}

              <p className="scan-meta">
                Scanned with {scan?.meta?.method === "VISION" ? "vision model" : scan?.meta?.method === "OCR" ? "OCR" : "document text"}{" "}
                · {scan?.meta?.files?.join(", ")}. Edit anything below before saving.
              </p>

              <section className="doc-top">
                {/* ---------- Supplier ---------- */}
                <div className="doc-panel doc-party-panel">
                  <h2 className="doc-panel-title">Bill From</h2>

                  <div className="scan-seg" role="group" aria-label="Supplier source">
                    <button
                      type="button"
                      className={supplierMode === "EXISTING" ? "is-active" : ""}
                      onClick={() => setSupplierMode("EXISTING")}
                    >
                      Existing supplier
                    </button>
                    <button
                      type="button"
                      className={supplierMode === "NEW" ? "is-active" : ""}
                      onClick={() => {
                        setSupplierMode("NEW");
                        setItems((previous) => previous.map((item) => ({ ...item, taxCreditEligible: false })));
                      }}
                    >
                      Create new
                    </button>
                  </div>

                  {supplierMode === "EXISTING" ? (
                    <>
                      <EntitySearchPicker
                        label="Supplier"
                        placeholder="Search name, code, GSTIN..."
                        fetchOptions={fetchSupplierOptions}
                        getOptionId={getSupplierOptionId}
                        getOptionLabel={getSupplierOptionLabel}
                        getOptionSubtitle={getSupplierOptionSubtitle}
                        selectedIds={supplierRecord ? [normalizeId(supplierRecord)] : []}
                        selectedLabel={
                          supplierRecord
                            ? `${supplierRecord.supplierName}${supplierRecord.supplierCode ? ` (${supplierRecord.supplierCode})` : ""}`
                            : ""
                        }
                        onToggle={chooseSupplier}
                        multiple={false}
                        pageSize={20}
                        debounceMs={350}
                        emptyMessage="No matching suppliers found."
                      />

                      {scan?.supplierMatch?.candidates?.length > 0 && !supplierRecord && (
                        <div className="scan-chips">
                          Possible matches:
                          {scan.supplierMatch.candidates.map((candidate) => (
                            <button
                              key={normalizeId(candidate)}
                              type="button"
                              className="scan-chip"
                              onClick={() => chooseSupplier(normalizeId(candidate), candidate)}
                            >
                              {candidate.supplierName} · {Math.round(candidate.score * 100)}%
                            </button>
                          ))}
                        </div>
                      )}

                      {supplierRecord && (
                        <div className="doc-party-card">
                          <div className="doc-avatar">
                            {supplierRecord.supplierName?.charAt(0).toUpperCase() || "S"}
                          </div>

                          <div className="doc-party-copy">
                            <h3>{supplierRecord.supplierName}</h3>
                            <p>{supplierRecord.supplierCode}</p>
                            <p><span>Address:</span> {address || "Not provided"}</p>
                            <p><span>GSTIN:</span> {supplierRecord.gstNo || "Not provided"}</p>
                            <p><span>Phone:</span> {supplierRecord.phone || "Not provided"}</p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="doc-fields-grid">
                      <Input label="Supplier Name" name="supplierName" autoComplete={NO_AUTOFILL} value={newSupplier.supplierName} onChange={handleSupplierField} maxLength={150} required />
                      <Input label="GSTIN" name="gstNo" autoComplete={NO_AUTOFILL} value={newSupplier.gstNo} onChange={handleSupplierField} maxLength={15} />
                      <Input label="Phone" name="phone" autoComplete={NO_AUTOFILL} value={newSupplier.phone} onChange={handleSupplierField} maxLength={20} />
                      <Input label="Email" name="email" autoComplete={NO_AUTOFILL} value={newSupplier.email} onChange={handleSupplierField} maxLength={120} />
                      <Input label="Address" name="billingAddress" autoComplete={NO_AUTOFILL} value={newSupplier.billingAddress} onChange={handleSupplierField} maxLength={300} />
                      <Input label="City" name="city" autoComplete={NO_AUTOFILL} value={newSupplier.city} onChange={handleSupplierField} maxLength={80} />
                      <Input label="State" name="state" autoComplete={NO_AUTOFILL} value={newSupplier.state} onChange={handleSupplierField} maxLength={80} />
                      <Input label="Pincode" name="pincode" autoComplete={NO_AUTOFILL} value={newSupplier.pincode} onChange={handleSupplierField} maxLength={10} />
                    </div>
                  )}

                  {supplierMode === "NEW" && (
                    <p className="doc-note">A new supplier and its ledger will be created when you save.</p>
                  )}
                </div>

                {/* ---------- Bill details ---------- */}
                <div className="doc-panel">
                  <h2 className="doc-panel-title">Bill Details</h2>

                  <div className="doc-fields-grid">
                    <Input label="Bill Number" name="billNumber" value="Generated after creation" readOnly />

                    <Input
                      label="Supplier Invoice No."
                      name="supplierInvoiceNumber"
                      autoComplete={NO_AUTOFILL}
                      value={form.supplierInvoiceNumber}
                      onChange={handleFieldChange}
                      maxLength={100}
                      required
                    />

                    <Input label="Bill Date" name="billDate" type="date" value={form.billDate} onChange={handleFieldChange} required />

                    <Input label="Due Date" name="dueDate" type="date" value={form.dueDate} min={form.billDate} onChange={handleFieldChange} required />

                    <Input label="Payment Terms" name="paymentTerms" autoComplete={NO_AUTOFILL} value={form.paymentTerms} onChange={handleFieldChange} maxLength={100} />

                    <Select label="Tax Treatment" name="taxMode" value={form.taxMode} options={TAX_OPTIONS} onChange={handleTaxModeChange} />
                  </div>

                  <label className="doc-check">
                    <input
                      type="checkbox"
                      checked={form.updateStock}
                      onChange={(event) => setForm((previous) => ({ ...previous, updateStock: event.target.checked }))}
                    />
                    <span>
                      Receive inventory-tracked goods when creating this bill
                      <small>Select only if goods were received and no Goods Receipt recorded them.</small>
                    </span>
                  </label>
                </div>
              </section>

              {/* ---------- Items ---------- */}
              <section className="doc-items">
                <div className="doc-table-wrap">
                  <table className="doc-table">
                    <thead>
                      <tr>
                        <th>No</th>
                        <th>Item</th>
                        <th>HSN / SAC</th>
                        <th>Qty</th>
                        <th>Price/Item (₹)</th>
                        <th>Discount %</th>
                        <th>GST</th>
                        <th>Amount</th>
                        <th><span className="doc-sr-only">Remove</span></th>
                      </tr>
                    </thead>

                    <tbody>
                      {items.map((item, index) => (
                        <tr key={item.rowId}>
                          <td data-label="No." className="doc-cell-no">{index + 1}</td>

                          <td data-label="Item" className="doc-cell-item">
                            {item.description && (
                              <p className="scan-source-line" title={item.description}>
                                Bill text: {item.description}
                              </p>
                            )}

                            <div className="scan-seg scan-seg-small" role="group" aria-label={`Product source ${index + 1}`}>
                              <button type="button" className={item.mode === "EXISTING" ? "is-active" : ""} onClick={() => patchItem(item.rowId, { mode: "EXISTING" })}>
                                Existing
                              </button>
                              <button type="button" className={item.mode === "NEW" ? "is-active" : ""} onClick={() => patchItem(item.rowId, { mode: "NEW" })}>
                                New
                              </button>
                            </div>

                            {item.mode === "EXISTING" ? (
                              <EntitySearchPicker
                                placeholder="Search product or service..."
                                fetchOptions={fetchProductOptions}
                                getOptionId={getProductOptionId}
                                getOptionLabel={getProductOptionLabel}
                                getOptionSubtitle={getProductOptionSubtitle}
                                selectedIds={item.productId ? [item.productId] : []}
                                selectedLabel={productLabel(item.productRecord)}
                                onToggle={(productId, record) => selectProduct(item.rowId, productId, record)}
                                multiple={false}
                                pageSize={20}
                                debounceMs={350}
                                emptyMessage="No matching products found."
                              />
                            ) : (
                              <div className="scan-new-product">
                                <Input
                                  name={`newName-${item.rowId}`}
                                  aria-label={`New product name ${index + 1}`}
                                  autoComplete={NO_AUTOFILL}
                                  value={item.newName}
                                  maxLength={200}
                                  placeholder="New product name"
                                  onChange={(event) => patchItem(item.rowId, { newName: event.target.value })}
                                />

                                <div className="scan-inline">
                                  <Select
                                    name={`unit-${item.rowId}`}
                                    aria-label={`Unit ${index + 1}`}
                                    value={item.unit}
                                    options={UNIT_OPTIONS}
                                    onChange={(event) => patchItem(item.rowId, { unit: event.target.value })}
                                  />

                                  <Select
                                    name={`type-${item.rowId}`}
                                    aria-label={`Type ${index + 1}`}
                                    value={item.productType}
                                    options={TYPE_OPTIONS}
                                    onChange={(event) => patchItem(item.rowId, { productType: event.target.value })}
                                  />
                                </div>

                                <small className="doc-item-meta">A new product will be created on save</small>
                              </div>
                            )}

                            {item.mode === "NEW" && item.candidates.length > 0 && (
                              <div className="scan-chips">
                                Similar:
                                {item.candidates.slice(0, 3).map((candidate) => (
                                  <button
                                    key={normalizeId(candidate)}
                                    type="button"
                                    className="scan-chip"
                                    onClick={() => selectProduct(item.rowId, normalizeId(candidate), candidate)}
                                  >
                                    {candidate.name} · {Math.round(candidate.score * 100)}%
                                  </button>
                                ))}
                              </div>
                            )}

                            {item.flags.length > 0 && (
                              <small className="scan-flag">{item.flags.join(" · ")}</small>
                            )}
                          </td>

                          <td data-label="HSN / SAC" className="doc-cell-hsn">
                            {item.mode === "NEW" ? (
                              <Input
                                name={`hsn-${item.rowId}`}
                                aria-label={`HSN or SAC ${index + 1}`}
                                autoComplete={NO_AUTOFILL}
                                value={item.hsnSacCode}
                                maxLength={20}
                                onChange={(event) => patchItem(item.rowId, { hsnSacCode: event.target.value })}
                              />
                            ) : (
                              item.productRecord?.hsnSacCode || "—"
                            )}
                          </td>

                          {[
                            { field: "quantity", label: "Quantity", min: "0.001", max: "1000000", step: "0.001" },
                            { field: "unitRate", label: "Price/Item (₹)", min: "0", max: "1000000000", step: "0.01" },
                            { field: "discountPercent", label: "Discount %", min: "0", max: "100", step: "0.01" },
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
                                onChange={(event) => patchItem(item.rowId, { [column.field]: event.target.value })}
                              />
                            </td>
                          ))}

                          <td data-label="GST">
                            <Select
                              name={`gst-${item.rowId}`}
                              aria-label={`GST ${index + 1}`}
                              value={item.gstRate}
                              disabled={form.taxMode === "NONE"}
                              options={GST_RATES.map((rate) => ({ value: rate, label: `${rate}%` }))}
                              onChange={(event) => updateGstRate(item.rowId, event.target.value)}
                            />

                            <label className="doc-check doc-check-small">
                              <input
                                type="checkbox"
                                checked={item.taxCreditEligible}
                                disabled={form.taxMode === "NONE" || !supplierHasGstin || Number(item.gstRate) === 0}
                                onChange={(event) => patchItem(item.rowId, { taxCreditEligible: event.target.checked })}
                              />
                              <span>Input credit eligible</span>
                            </label>
                          </td>

                          <td data-label="Amount" className="doc-cell-amount">
                            {formatPaise(rowPreviews[index]?.total || 0)}
                          </td>

                          <td data-label="Remove" className="doc-cell-action">
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
                      ))}
                    </tbody>

                    <tfoot>
                      <tr>
                        <td colSpan={5} className="doc-subtotal-label">Subtotal</td>
                        <td className="doc-subtotal-value">{formatPaise(totals.discount)}</td>
                        <td className="doc-subtotal-value">{formatPaise(totals.cgst + totals.sgst + totals.igst)}</td>
                        <td className="doc-subtotal-value">{formatPaise(totals.total)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="doc-add-item-row scan-add-row">
                  <button type="button" className="doc-dashed-line" disabled={items.length >= 200} onClick={addItem}>
                    <Plus size={15} />
                    Add Item
                  </button>

                  {form.taxMode !== "NONE" && supplierHasGstin && (
                    <button type="button" className="scan-link" onClick={markAllEligible}>
                      Mark all taxed items input-credit eligible
                    </button>
                  )}
                </div>
              </section>

              {/* ---------- Notes + summary ---------- */}
              <section className="doc-bottom">
                <div className="doc-extras">
                  <Textarea
                    name="notes"
                    label="Notes"
                    value={form.notes}
                    onChange={handleFieldChange}
                    maxLength={1000}
                    rows={4}
                    placeholder="Supplier instructions or purchase notes..."
                  />

                  <p className="doc-note">
                    Payments are recorded separately through Supplier Payments. TDS can be handled from the normal
                    Create Purchase Bill screen.
                  </p>
                </div>

                <div className="doc-summary">
                  {[
                    ["Gross Amount", totals.gross],
                    ["Line Discounts", -totals.discount],
                    ["Taxable Amount", totals.taxable],
                    ...(form.taxMode === "INTRA_STATE" ? [["CGST", totals.cgst], ["SGST", totals.sgst]] : []),
                    ...(form.taxMode === "INTER_STATE" ? [["IGST", totals.igst]] : []),
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

                  {typeof scannedTotal === "number" && (
                    <p className="doc-note">Scanned bill total: {formatRupees(scannedTotal)}</p>
                  )}

                  <p className="doc-note">The server calculates final totals.</p>
                </div>
              </section>
            </main>
          </fieldset>
        )}

        {step === "review" && (
          <div className="doc-mobile-bar" hidden={keyboardOpen}>
            <div className="doc-mobile-total">
              <span>Total</span>
              <strong>{formatPaise(totals.total)}</strong>
            </div>

            <div className="doc-mobile-actions">{saveButton}</div>
          </div>
        )}
      </form>
    </div>
  );
}

export default PurchaseBillScan;