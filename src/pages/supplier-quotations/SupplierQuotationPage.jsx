import { useEffect, useMemo, useRef, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

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

import Input from "../../components/common/Form/Input";
import Select from "../../components/common/Form/Select";
import Textarea from "../../components/common/Form/Textarea";
import Button from "../../components/common/Form/Button";
import StatusField from "../../components/common/StatusField/StatusField";
import BoxModal from "../../components/common/Modal/BoxModal";

import {
  GST_RATES,
  TAX_OPTIONS,
  EMPTY_TOTALS,
  SUPPLIER_QUOTATION_BASE,
  calculatePreview,
  storedPreview,
  dateValue,
  fetchAllPages,
  formatDate,
  formatPaise,
  getDocument,
  getErrorMessage,
  getId,
  localDate,
  scaledInteger,
  supplierQuotationPath,
} from "./supplierQuotation.utils";

import "../../styles/invoice-common1.css";
import "./SupplierQuotations.css";

let rowCounter = 0;

const newItem = () => ({
  rowId: `squ-item-${++rowCounter}`,
  productId: "",
  rfqLineId: "",
  quantity: "1",
  unitRate: "0",
  discountPercent: "0",
  gstRate: 0,
  specification: "",
});

const initialForm = () => ({
  creationMode: "DIRECT",
  rfqNumber: "",
  supplierId: "",
  supplierReferenceNumber: "",
  quotationDate: localDate(),
  validUntil: "",
  taxMode: "NONE",
  paymentTerms: "",
  deliveryTerms: "",
  termsAndConditions: "",
  notes: "",
});

const mapItems = (records = []) =>
  records.map((item) => ({
    ...item,
    rowId: `squ-item-${++rowCounter}`,
    productId: getId(item.productId),
    rfqLineId: getId(item.rfqLineId),
    quantity: String(item.quantity),
    unitRate: String(item.unitRatePaise / 100),
    discountPercent: String(item.discountPercent ?? 0),
    gstRate: item.gstRate ?? 0,
    specification: item.specification || "",
  }));

function SupplierQuotationPage({ mode = "create" }) {
  const navigate = useNavigate();
  const params = useParams();

  const quotationNumber = String(
    params.quotationNumber ?? params.id ?? "",
  ).trim();

  const isCreate = mode === "create";
  const isEdit = mode === "edit";
  const isView = mode === "view";

  const [form, setForm] = useState(initialForm);
  const [items, setItems] = useState(() => [newItem()]);

  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [rfqs, setRfqs] = useState([]);

  const [document, setDocument] = useState(null);
  const [rfq, setRfq] = useState(null);

  const [loading, setLoading] = useState(true);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [uncertainResult, setUncertainResult] = useState(false);

  const [error, setError] = useState("");
  const [showNotes, setShowNotes] = useState(false);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const submitLock = useRef(false);
  const sourceLock = useRef(false);
  const cancelLock = useRef(false);
  const pageVersionRef = useRef(0);

  const rfqBased = form.creationMode === "RFQ";

  const editable = isCreate || (isEdit && document?.status === "CREATED");

  const sourceBlocked = isEdit && rfqBased && rfq?.status !== "ISSUED";

  const busy = loading || sourceLoading || saving || cancelling;

  const disabled =
    busy || loadFailed || uncertainResult || !editable || sourceBlocked;

  useEffect(() => {
    const pageVersion = ++pageVersionRef.current;

    const isCurrent = () => pageVersion === pageVersionRef.current;

    const loadPage = async () => {
      setLoading(true);
      setLoadFailed(false);
      setError("");
      setDirty(false);
      setUncertainResult(false);
      setDocument(null);
      setRfq(null);
      setCancelOpen(false);
      setCancelReason("");

      try {
        if (
          !isCreate &&
          (!quotationNumber ||
            ["undefined", "null"].includes(quotationNumber.toLowerCase()))
        ) {
          throw new Error(
            "Supplier Quotation number is missing from the route.",
          );
        }

        const [supplierRecords, productRecords, response] = await Promise.all([
          fetchAllPages(api.supplierQuotation.getSuppliers, "suppliers"),

          isView
            ? Promise.resolve([])
            : fetchAllPages(api.supplierQuotation.getProducts, "products"),

          isCreate
            ? Promise.resolve(null)
            : api.supplierQuotation.getByNumber(quotationNumber),
        ]);

        if (!isCurrent()) return;

        setSuppliers(supplierRecords);
        setProducts(productRecords);

        if (isCreate) {
          setForm(initialForm());
          setItems([newItem()]);
          setShowNotes(false);
        } else {
          const record = getDocument(response);

          if (!record?._id || !Number.isSafeInteger(record.__v)) {
            throw new Error("The server did not return a valid quotation.");
          }

          let sourceRfq = null;

          if (isEdit && record.creationMode === "RFQ") {
            if (!record.sourceRfqNumber) {
              throw new Error(
                "The quotation is missing its source RFQ number.",
              );
            }

            const rfqResponse = await api.supplierQuotation.getRfqByNumber(
              record.sourceRfqNumber,
            );

            if (!isCurrent()) return;

            sourceRfq = getDocument(rfqResponse);

            if (getId(sourceRfq) !== getId(record.sourceRfqId)) {
              throw new Error("The source RFQ does not match this quotation.");
            }
          }

          setRfq(sourceRfq);
          setDocument(record);

          setForm({
            creationMode: record.creationMode,
            rfqNumber: record.sourceRfqNumber || "",
            supplierId: getId(record.supplierId),
            supplierReferenceNumber: record.supplierReferenceNumber || "",
            quotationDate: dateValue(record.quotationDate),
            validUntil: dateValue(record.validUntil),
            taxMode: record.taxMode,
            paymentTerms: record.paymentTerms || "",
            deliveryTerms: record.deliveryTerms || "",
            termsAndConditions: record.termsAndConditions || "",
            notes: record.notes || "",
          });

          setItems(mapItems(record.items));
          setShowNotes(Boolean(record.notes));

          if (isEdit && record.status !== "CREATED") {
            setError("Only CREATED quotations can be edited.");
          } else if (isEdit && sourceRfq && sourceRfq.status !== "ISSUED") {
            setError(
              "The source RFQ is not ISSUED. This quotation cannot be edited.",
            );
          }
        }
      } catch (requestError) {
        if (!isCurrent()) return;

        setLoadFailed(true);
        setError(getErrorMessage(requestError));
      } finally {
        if (isCurrent()) {
          setLoading(false);
        }
      }
    };

    loadPage();

    return () => {
      pageVersionRef.current += 1;
    };
  }, [isCreate, isEdit, isView, quotationNumber, reloadKey]);

  /* ---------- Load issued RFQs for the dropdown ---------- */

  useEffect(() => {
    if (!isCreate || !rfqBased) {
      setRfqs([]);
      return undefined;
    }

    let cancelled = false;

    (async () => {
      try {
        setSourceLoading(true);

        const records = await fetchAllPages(
          (query) =>
            api.supplierQuotation.getRfqs({ ...query, status: "ISSUED" }),
          "rfqs",
        );

        if (!cancelled) {
          setRfqs(records.filter((record) => record.status === "ISSUED"));
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(getErrorMessage(requestError));
          toast.error(getErrorMessage(requestError));
        }
      } finally {
        if (!cancelled) setSourceLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isCreate, rfqBased]);

  const supplierMap = useMemo(
    () => new Map(suppliers.map((supplier) => [getId(supplier), supplier])),
    [suppliers],
  );

  const selectedSupplier = supplierMap.get(form.supplierId);

  const productMap = useMemo(() => {
    const map = new Map();

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

  const rfqLineMap = useMemo(
    () => new Map((rfq?.items || []).map((item) => [getId(item.lineId), item])),
    [rfq],
  );

  const supplierOptions = useMemo(() => {
    const invited = new Set((rfq?.supplierIds || []).map(getId));

    return suppliers
      .filter((supplier) => {
        const id = getId(supplier);

        if (id === form.supplierId) return true;

        if (supplier.status !== "Active" || supplier.isDeleted) {
          return false;
        }

        return !rfqBased || invited.has(id);
      })
      .map((supplier) => ({
        value: getId(supplier),

        label: `${supplier.supplierName} (${supplier.supplierCode})`,
      }));
  }, [suppliers, rfq, rfqBased, form.supplierId]);

  const rfqOptions = useMemo(
    () =>
      rfqs.map((record) => ({
        value: record.rfqNumber,
        label:
          `${record.rfqNumber}` +
          `${record.rfqDate ? ` · ${formatDate(record.rfqDate)}` : ""}`,
      })),
    [rfqs],
  );

  const previews = useMemo(
    () =>
      items.map((item) =>
        isView ? storedPreview(item) : calculatePreview(item, form.taxMode),
      ),
    [items, form.taxMode, isView],
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

    setForm({
      ...initialForm(),
      creationMode: event.target.value,
    });

    setItems([newItem()]);
    setRfq(null);
    setDirty(true);
    setError("");
  };

  const changeSupplier = (event) => {
    if (disabled || !isCreate) return;

    const supplier = supplierMap.get(event.target.value);

    setForm((previous) => ({
      ...previous,
      supplierId: event.target.value,

      paymentTerms: previous.paymentTerms || supplier?.paymentTerms || "",
    }));

    setDirty(true);
    setError("");
  };

  const changeTaxMode = (event) => {
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
            : (productMap.get(item.productId)?.gstRate ?? item.gstRate ?? 0),
      })),
    );

    setDirty(true);
    setError("");
  };

  const updateItem = (rowId, field, value) => {
    if (disabled) return;

    setItems((previous) =>
      previous.map((item) =>
        item.rowId === rowId ? { ...item, [field]: value } : item,
      ),
    );

    setDirty(true);
    setError("");
  };

  const chooseItem = (rowId, value) => {
    if (disabled) return;

    const source = rfqBased ? rfqLineMap.get(value) : null;

    const productId = rfqBased ? getId(source?.productId) : value;

    const product = productMap.get(productId);

    setItems((previous) =>
      previous.map((item) => {
        if (item.rowId !== rowId) return item;

        const sameSource = rfqBased
          ? item.rfqLineId === value
          : item.productId === productId;

        return {
          ...item,
          lineId: sameSource ? item.lineId : undefined,

          rfqLineId: rfqBased ? value : "",
          productId,

          productCode: source?.productCode || product?.productCode || "",

          productName: source?.productName || product?.name || "",

          productType: source?.productType || product?.type || "",

          unit: source?.unit || product?.unit || "",

          hsnSacCode: product?.hsnSacCode || "",

          quantity: String(source?.quantity ?? 1),
          unitRate: String(product?.purchasePrice ?? 0),
          discountPercent: "0",

          gstRate: form.taxMode === "NONE" ? 0 : (product?.gstRate ?? 0),

          specification: source?.specification || "",
        };
      }),
    );

    setDirty(true);
    setError("");
  };

  // Accepts the number picked in the dropdown.
  const loadRfq = async (numberOverride) => {
    if (sourceLock.current || disabled || !isCreate || !rfqBased) {
      return;
    }

    const number = String(numberOverride ?? form.rfqNumber).trim();

    if (!number) {
      toast.error("Select an RFQ.");
      return;
    }

    const pageVersion = pageVersionRef.current;

    try {
      sourceLock.current = true;
      setSourceLoading(true);
      setError("");

      const response = await api.supplierQuotation.getRfqByNumber(number);

      if (pageVersion !== pageVersionRef.current) {
        return;
      }

      const record = getDocument(response);

      if (
        !record?._id ||
        record.status !== "ISSUED" ||
        !Number.isSafeInteger(record.__v) ||
        !record.items?.length
      ) {
        throw new Error("Select an ISSUED RFQ containing items.");
      }

      setRfq(record);

      setForm((previous) => {
        const rfqDate = dateValue(record.rfqDate);

        return {
          ...previous,
          rfqNumber: record.rfqNumber,
          supplierId: "",

          quotationDate:
            previous.quotationDate < rfqDate ? rfqDate : previous.quotationDate,

          paymentTerms: record.paymentTerms || "",
          deliveryTerms: record.deliveryTerms || "",
          termsAndConditions: record.termsAndConditions || "",
        };
      });

      setItems(
        record.items.map((item) => {
          const product = productMap.get(getId(item.productId));

          return {
            ...newItem(),

            rfqLineId: getId(item.lineId),
            productId: getId(item.productId),

            productCode: item.productCode,
            productName: item.productName,
            productType: item.productType,
            unit: item.unit,
            hsnSacCode: product?.hsnSacCode || "",

            quantity: String(item.quantity),
            unitRate: String(product?.purchasePrice ?? 0),

            gstRate: form.taxMode === "NONE" ? 0 : (product?.gstRate ?? 0),

            specification: item.specification || "",
          };
        }),
      );

      setDirty(true);
    } catch (requestError) {
      if (pageVersion !== pageVersionRef.current) {
        return;
      }

      setRfq(null);
      setForm((previous) => ({ ...previous, rfqNumber: "" }));
      setItems([newItem()]);
      setError(getErrorMessage(requestError));
      toast.error(getErrorMessage(requestError));
    } finally {
      sourceLock.current = false;

      if (pageVersion === pageVersionRef.current) {
        setSourceLoading(false);
      }
    }
  };

  const handleRfqChange = (event) => {
    const number = event.target.value;

    setForm((previous) => ({
      ...previous,
      rfqNumber: number,
      supplierId: "",
    }));

    setRfq(null);
    setItems([newItem()]);
    setDirty(true);
    setError("");

    if (number) loadRfq(number);
  };

  const validateForm = () => {
    if (!form.supplierId) {
      throw new Error("Select a supplier.");
    }

    if (!form.quotationDate) {
      throw new Error("Quotation date is required.");
    }

    if (form.validUntil && form.validUntil < form.quotationDate) {
      throw new Error("Validity date cannot precede quotation date.");
    }

    if (rfqBased) {
      if (!rfq || rfq.status !== "ISSUED") {
        throw new Error("Select an ISSUED RFQ.");
      }

      if (form.quotationDate < dateValue(rfq.rfqDate)) {
        throw new Error("Quotation date cannot precede RFQ date.");
      }

      if (!rfq.supplierIds.some((id) => getId(id) === form.supplierId)) {
        throw new Error("Select a supplier invited to this RFQ.");
      }
    }

    if (!items.length || items.length > 200) {
      throw new Error("Provide between 1 and 200 quotation items.");
    }

    const sourceIds = new Set();

    items.forEach((item, index) => {
      const product = productMap.get(item.productId);

      if (
        !product ||
        product.status !== "ACTIVE" ||
        product.isDeleted ||
        !previews[index].valid
      ) {
        throw new Error(
          `Check the active product, quantity, rate, discount, and GST for item ${index + 1}.`,
        );
      }

      if (rfqBased) {
        const source = rfqLineMap.get(item.rfqLineId);

        if (!source || getId(source.productId) !== item.productId) {
          throw new Error(`Select a valid RFQ line for item ${index + 1}.`);
        }

        if (sourceIds.has(item.rfqLineId)) {
          throw new Error("An RFQ line cannot appear twice.");
        }

        sourceIds.add(item.rfqLineId);

        if (
          scaledInteger(item.quantity, 1000) > Math.round(source.quantity * 1000)
        ) {
          throw new Error(
            `Quoted quantity exceeds the RFQ quantity for ${item.productName}.`,
          );
        }
      }
    });

    if (
      Object.values(totals).some(
        (amount) => !Number.isSafeInteger(amount) || amount < 0,
      )
    ) {
      throw new Error("Quotation amounts exceed the supported range.");
    }
  };

  const buildPayload = () => {
    const payload = {
      supplierReferenceNumber: form.supplierReferenceNumber.trim() || null,

      quotationDate: form.quotationDate,
      validUntil: form.validUntil || null,
      taxMode: form.taxMode,

      items: items.map((item) => ({
        ...(item.lineId ? { lineId: item.lineId } : {}),

        ...(rfqBased ? { rfqLineId: item.rfqLineId } : {}),

        productId: item.productId,
        quantity: Number(item.quantity),

        unitRatePaise: scaledInteger(item.unitRate, 100),

        discountPercent: Number(item.discountPercent),

        gstRate: form.taxMode === "NONE" ? 0 : Number(item.gstRate),

        specification: item.specification.trim() || null,
      })),

      paymentTerms: form.paymentTerms.trim() || null,

      deliveryTerms: form.deliveryTerms.trim() || null,

      termsAndConditions: form.termsAndConditions.trim() || null,

      notes: form.notes.trim() || null,
    };

    if (isEdit) {
      return {
        ...payload,
        version: document.__v,
      };
    }

    return {
      ...payload,
      creationMode: form.creationMode,
      supplierId: form.supplierId,

      ...(rfqBased
        ? {
            sourceRfqId: rfq._id,
            sourceRfqVersion: rfq.__v,
          }
        : {}),
    };
  };

  const saveQuotation = async () => {
    if (disabled || submitLock.current) return;

    let payload;

    try {
      validateForm();
      payload = buildPayload();
    } catch (validationError) {
      setError(validationError.message);
      toast.error(validationError.message);
      return;
    }

    let saved;

    try {
      submitLock.current = true;
      setSaving(true);
      setError("");

      const response = isEdit
        ? await api.supplierQuotation.update(document.quotationNumber, payload)
        : await api.supplierQuotation.create(payload);

      saved = getDocument(response);

      if (!saved?.quotationNumber) {
        throw new Error(
          "The server did not return a quotation number. Check the list before submitting again.",
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
        ? "Supplier Quotation updated successfully."
        : "Supplier Quotation created successfully.",
    );

    navigate(supplierQuotationPath(saved.quotationNumber), { replace: true });
  };

  const confirmCancel = async () => {
    if (cancelLock.current || !document) return;

    if (!cancelReason.trim()) {
      toast.error("Cancellation reason is required.");
      return;
    }

    try {
      cancelLock.current = true;
      setCancelling(true);

      const response = await api.supplierQuotation.cancel(
        document.quotationNumber,
        {
          version: document.__v,
          cancellationReason: cancelReason.trim(),
        },
      );

      const updated = getDocument(response);

      if (!updated?.quotationNumber) {
        throw new Error("Reload the quotation to verify its status.");
      }

      setDocument(updated);
      setCancelOpen(false);
      setCancelReason("");

      toast.success("Supplier Quotation cancelled successfully.");
    } catch (requestError) {
      toast.error(getErrorMessage(requestError));
      setCancelOpen(false);
      setReloadKey((value) => value + 1);
    } finally {
      cancelLock.current = false;
      setCancelling(false);
    }
  };

  const exitPage = () => {
    if (submitLock.current || sourceLock.current || cancelLock.current) {
      return;
    }

    if (
      (dirty || uncertainResult) &&
      !window.confirm(
        uncertainResult
          ? "Open the quotation list to verify the save result?"
          : "Discard unsaved changes and leave?",
      )
    ) {
      return;
    }

    navigate(SUPPLIER_QUOTATION_BASE);
  };

  const saveButton = (
    <Button
      type="button"
      icon={Save}
      disabled={disabled}
      loading={saving}
      onClick={saveQuotation}
    >
      {saving ? "Saving..." : isEdit ? "Update Quotation" : "Create Quotation"}
    </Button>
  );

  return (
    <div
      className={`doc-page squ-document-page ${
        isView ? "doc-detail-page" : ""
      }`}
    >
      <form noValidate onSubmit={(event) => event.preventDefault()}>
        <header className="doc-header">
          <div className="doc-header-left">
            <Button
              type="button"
              variant="secondary"
              icon={ArrowLeft}
              disabled={saving || sourceLoading || cancelling}
              onClick={exitPage}
            >
              Back
            </Button>

            <div className="doc-title">
              <FileText size={19} />

              <span>
                {isView
                  ? document?.quotationNumber || "Supplier Quotation"
                  : isEdit
                    ? "Edit Supplier Quotation"
                    : "Create Supplier Quotation"}
              </span>
            </div>
          </div>

          <div className="doc-header-actions">
            {document && <StatusField value={document.status} />}

            {isView ? (
              <>
                {document?.status === "CREATED" && (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busy}
                      onClick={() =>
                        navigate(
                          supplierQuotationPath(
                            document.quotationNumber,
                            "edit",
                          ),
                        )
                      }
                    >
                      Edit
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => {
                        setCancelReason("");
                        setCancelOpen(true);
                      }}
                    >
                      Cancel Quotation
                    </Button>
                  </>
                )}

                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setReloadKey((value) => value + 1)}
                >
                  Refresh
                </Button>
              </>
            ) : (
              saveButton
            )}
          </div>
        </header>

        {(loading || error) && (
          <div className="doc-alerts">
            {loading && (
              <div className="doc-alert" role="status">
                Loading quotation information...
              </div>
            )}

            {error && (
              <div className="doc-alert doc-alert-error" role="alert">
                <p>{error}</p>

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
                    Check Quotations
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        <fieldset className="doc-fieldset" disabled={disabled}>
          <main className="doc-main">
            {isCreate && (
              <section className="squ-source-section">
                <Select
                  label="Quotation Source"
                  value={form.creationMode}
                  options={[
                    {
                      value: "DIRECT",
                      label: "Direct Supplier Quotation",
                    },
                    {
                      value: "RFQ",
                      label: "Against an Issued RFQ",
                    },
                  ]}
                  onChange={changeMode}
                />

                {rfqBased && (
                  <Select
                    label="RFQ"
                    value={form.rfqNumber}
                    placeholder={
                      sourceLoading && !rfqs.length
                        ? "Loading RFQs..."
                        : "Select issued RFQ"
                    }
                    options={rfqOptions}
                    onChange={handleRfqChange}
                  />
                )}

                {rfq && (
                  <div className="squ-source-confirmation">
                    <strong>{rfq.rfqNumber}</strong>

                    <span>
                      {rfq.items.length} requested lines ·{" "}
                      {rfq.supplierIds.length} invited suppliers
                    </span>
                  </div>
                )}
              </section>
            )}

            <section className="doc-top">
              <div className="doc-panel doc-party-panel">
                <h2 className="doc-panel-title">Quotation From</h2>

                <Select
                  label="Supplier"
                  value={form.supplierId}
                  options={supplierOptions}
                  placeholder={
                    rfqBased ? "Select invited supplier" : "Select supplier"
                  }
                  disabled={!isCreate || (rfqBased && !rfq)}
                  onChange={changeSupplier}
                  required
                />

                {selectedSupplier && (
                  <div className="doc-party-card squ-party-card">
                    <div className="doc-avatar">
                      {selectedSupplier.supplierName
                        ?.charAt(0)
                        .toUpperCase() || "S"}
                    </div>

                    <div className="doc-party-copy">
                      <h3>{selectedSupplier.supplierName}</h3>

                      <p>{selectedSupplier.supplierCode}</p>

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

                {form.rfqNumber && (
                  <p className="doc-note">Source RFQ: {form.rfqNumber}</p>
                )}

                <div className="squ-information">
                  Offers are entered by admin. Saving a quotation does not
                  update stock or create a journal.
                </div>
              </div>

              <div className="doc-panel">
                <h2 className="doc-panel-title">Quotation Details</h2>

                <div className="doc-fields-grid">
                  <Input
                    label="Quotation Number"
                    value={document?.quotationNumber || "Generated after creation"}
                    readOnly
                  />

                  <Input
                    label="Supplier Reference"
                    name="supplierReferenceNumber"
                    value={form.supplierReferenceNumber}
                    onChange={changeField}
                    maxLength={100}
                    placeholder="Supplier's quotation reference"
                  />

                  <Input
                    label="Quotation Date"
                    name="quotationDate"
                    type="date"
                    value={form.quotationDate}
                    min={rfq ? dateValue(rfq.rfqDate) : undefined}
                    onChange={changeField}
                    required
                  />

                  <Input
                    label="Valid Until"
                    name="validUntil"
                    type="date"
                    value={form.validUntil}
                    min={form.quotationDate}
                    onChange={changeField}
                  />

                  <Select
                    label="Tax Treatment"
                    value={form.taxMode}
                    options={TAX_OPTIONS}
                    onChange={changeTaxMode}
                    required
                  />

                  <Input
                    label="Payment Terms"
                    name="paymentTerms"
                    value={form.paymentTerms}
                    onChange={changeField}
                    maxLength={100}
                  />

                  <div className="squ-full-width">
                    <Input
                      label="Delivery Terms"
                      name="deliveryTerms"
                      value={form.deliveryTerms}
                      onChange={changeField}
                      maxLength={1000}
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
                      <th>Product / Service</th>
                      <th>HSN / SAC</th>
                      <th>Qty</th>
                      <th>Unit Rate (₹)</th>
                      <th>Discount %</th>
                      <th>GST</th>
                      <th>Amount</th>
                      {!isView && <th>Remove</th>}
                    </tr>
                  </thead>

                  <tbody>
                    {items.map((item, index) => {
                      const product = productMap.get(item.productId);

                      const source = rfqLineMap.get(item.rfqLineId);

                      const options = rfqBased
                        ? (rfq?.items || []).map((line, sourceIndex) => ({
                            value: getId(line.lineId),

                            label:
                              `${sourceIndex + 1}. ` +
                              `${line.productName} ` +
                              `(${line.productCode})`,
                          }))
                        : Array.from(productMap.values())
                            .filter(
                              (record) =>
                                getId(record) === item.productId ||
                                (record.status === "ACTIVE" &&
                                  !record.isDeleted),
                            )
                            .map((record) => ({
                              value: getId(record),

                              label:
                                `${record.name || record.productCode}` +
                                `${
                                  record.productCode
                                    ? ` (${record.productCode})`
                                    : ""
                                }`,
                            }));

                      return (
                        <tr key={item.rowId}>
                          <td className="doc-cell-no" data-label="No.">
                            {index + 1}
                          </td>

                          <td
                            className="doc-cell-item"
                            data-label="Product / Service"
                          >
                            {isView ? (
                              <div className="squ-document-cell">
                                <strong>{item.productName}</strong>

                                <span>
                                  {item.productCode} · {item.unit}
                                </span>
                              </div>
                            ) : (
                              <>
                                <Select
                                  value={
                                    rfqBased ? item.rfqLineId : item.productId
                                  }
                                  options={options}
                                  placeholder={
                                    rfqBased
                                      ? "Select RFQ line"
                                      : "Select product"
                                  }
                                  onChange={(event) =>
                                    chooseItem(item.rowId, event.target.value)
                                  }
                                  aria-label={`Product ${index + 1}`}
                                />

                                <small className="doc-item-meta">
                                  {item.unit || product?.unit || "—"}
                                  {source
                                    ? ` · Requested ${source.quantity}`
                                    : ""}
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
                                  placeholder="Supplier specification"
                                  aria-label={`Specification ${index + 1}`}
                                />
                              </>
                            )}

                            {isView && item.specification && (
                              <small className="doc-item-meta">
                                {item.specification}
                              </small>
                            )}
                          </td>

                          <td className="doc-cell-hsn" data-label="HSN / SAC">
                            {item.hsnSacCode || product?.hsnSacCode || "—"}
                          </td>

                          {[
                            [
                              "quantity",
                              "Quantity",
                              "0.001",
                              source?.quantity || "1000000",
                              "0.001",
                            ],
                            ["unitRate", "Unit Rate", "0", "1000000000", "0.01"],
                            ["discountPercent", "Discount %", "0", "100", "0.01"],
                          ].map(([field, label, min, max, step]) => (
                            <td key={field} data-label={label}>
                              {isView ? (
                                field === "unitRate" ? (
                                  formatPaise(item.unitRatePaise)
                                ) : field === "discountPercent" ? (
                                  `${item[field]}%`
                                ) : (
                                  item[field]
                                )
                              ) : (
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
                                  aria-label={`${label} ${index + 1}`}
                                />
                              )}
                            </td>
                          ))}

                          <td data-label="GST">
                            {isView ? (
                              `${item.gstRate}%`
                            ) : (
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
                                disabled={form.taxMode === "NONE"}
                                aria-label={`GST ${index + 1}`}
                              />
                            )}
                          </td>

                          <td className="doc-cell-amount" data-label="Amount">
                            {formatPaise(previews[index].total)}
                          </td>

                          {!isView && (
                            <td
                              className="doc-cell-action"
                              data-label="Remove"
                            >
                              <button
                                type="button"
                                className="doc-remove-button"
                                disabled={items.length === 1}
                                aria-label={`Remove item ${index + 1}`}
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

              {!isView && (
                <div className="doc-add-item-row">
                  <button
                    type="button"
                    className="doc-dashed-line"
                    disabled={items.length >= 200 || (rfqBased && !rfq)}
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
                    onChange={changeField}
                    maxLength={5000}
                    rows={4}
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
                    <span>Additional Notes</span>
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
                      maxLength={2000}
                      rows={3}
                    />
                  </div>
                )}

                {document?.cancellationReason && (
                  <div className="doc-panel">
                    <h2 className="doc-panel-title">Cancellation Reason</h2>

                    <p className="squ-text-content">
                      {document.cancellationReason}
                    </p>
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
                  <span>Quoted Amount</span>
                  <strong>{formatPaise(totals.total)}</strong>
                </div>

                <p className="doc-note">
                  {form.validUntil
                    ? `Offer valid until ${formatDate(form.validUntil)}.`
                    : "No validity date specified."}
                </p>
              </div>
            </section>
          </main>
        </fieldset>

        {!isView && (
          <div className="doc-mobile-bar">
            <div className="doc-mobile-total">
              <span>Quotation Total</span>
              <strong>{formatPaise(totals.total)}</strong>
            </div>

            <div className="doc-mobile-actions">{saveButton}</div>
          </div>
        )}
      </form>

      <BoxModal
        show={cancelOpen}
        onClose={() => {
          if (!cancelLock.current) {
            setCancelOpen(false);
          }
        }}
        title="Cancel Supplier Quotation"
        subtitle={document?.quotationNumber || ""}
        width="min(540px, calc(100vw - 24px))"
        footer={
          <div className="squ-modal-actions">
            <Button
              type="button"
              variant="secondary"
              disabled={cancelling}
              onClick={() => setCancelOpen(false)}
            >
              Keep Quotation
            </Button>

            <Button
              type="button"
              loading={cancelling}
              disabled={cancelling || !cancelReason.trim()}
              onClick={confirmCancel}
            >
              Cancel Quotation
            </Button>
          </div>
        }
      >
        <Textarea
          label="Cancellation Reason"
          value={cancelReason}
          onChange={(event) => setCancelReason(event.target.value)}
          maxLength={1000}
          rows={4}
          disabled={cancelling}
          required
        />
      </BoxModal>
    </div>
  );
}

export default SupplierQuotationPage;