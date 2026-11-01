import { useEffect, useMemo, useRef, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import {
  ArrowLeft,
  Check,
  ChevronDown,
  FileText,
  LockKeyhole,
  Plus,
  Save,
  Send,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";

import toast from "react-hot-toast";

import api from "../../services/api";

import Input from "../../components/common/Form/Input";
import Select from "../../components/common/Form/Select";
import Textarea from "../../components/common/Form/Textarea";
import Button from "../../components/common/Form/Button";
import StatusField from "../../components/common/StatusField/StatusField";
import ConfirmModal from "../../components/common/ConfirmModal/ConfirmModal";
import EntitySearchPicker from "../../components/common/EntitySearchPicker/EntitySearchPicker";

import useKeyboardOpen from "../../hooks/useKeyboardOpen";

import {
  RFQ_BASE,
  dateValue,
  formatDate,
  formatQuantity,
  getDocument,
  getErrorMessage,
  getId,
  localDate,
  quantityIsValid,
  rfqPath,
} from "./purchaseRfq.utils";

import "../../styles/invoice-common1.css";
import "./PurchaseRfqs.css";

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

let rowCounter = 0;

const normalizeId = (value) => {
  if (!value) return "";

  const id = getId(value);

  return id ? String(id) : "";
};

const text = (value) => String(value ?? "");

const newItem = () => ({
  rowId: `rfqu-item-${++rowCounter}`,
  productId: "",
  productCode: "",
  productName: "",
  productType: "",
  unit: "",
  quantity: "1",
  specification: "",
});

const initialForm = () => ({
  creationMode: "DIRECT",
  requisitionNumber: "",
  rfqDate: localDate(),
  quotationDueDate: localDate(),
  supplierIds: [],
  deliveryAddress: "",
  paymentTerms: "",
  deliveryTerms: "",
  termsAndConditions: "",
  notes: "",
});

const mapItems = (records = []) =>
  records.map((item) => ({
    ...item,
    rowId: `rfqu-item-${++rowCounter}`,
    productId: normalizeId(item.productId),
    productCode: item.productCode || "",
    productName: item.productName || "",
    productType: item.productType || "",
    unit: item.unit || "",
    quantity: String(item.quantity ?? ""),
    specification: item.specification || "",
  }));

const parseListResponse = (response, key) => {
  const body = response?.data;

  const records = Array.isArray(body?.data)
    ? body.data
    : Array.isArray(body?.data?.[key])
      ? body.data[key]
      : Array.isArray(body?.[key])
        ? body[key]
        : Array.isArray(body)
          ? body
          : [];

  const pagination = body?.pagination || body?.data?.pagination;

  const total = Number(
    pagination?.total ??
      pagination?.totalRecords ??
      pagination?.totalItems ??
      records.length,
  );

  return {
    data: records,
    total: Number.isFinite(total) ? total : records.length,
  };
};

/* ------------------------------------------------------------------ */
/* Stable picker functions                                             */
/* ------------------------------------------------------------------ */

const fetchSupplierOptions = async ({ search, page, limit }) => {
  const response = await api.purchaseRfq.getSuppliers({
    search,
    page,
    limit,
    status: "Active",
  });

  return parseListResponse(response, "suppliers");
};

const fetchProductOptions = async ({ search, page, limit }) => {
  const response = await api.purchaseRfq.getProducts({
    search,
    page,
    limit,
    status: "ACTIVE",
  });

  return parseListResponse(response, "products");
};

const fetchRequisitionOptions = async ({ search, page, limit }) => {
  const response = await api.purchaseRfq.getRequisitions({
    search,
    page,
    limit,
    status: "APPROVED",
  });

  return parseListResponse(response, "requisitions");
};

const getSupplierOptionId = (supplier) => normalizeId(supplier);

const getSupplierOptionLabel = (supplier) =>
  supplier.supplierName || supplier.supplierCode || "Supplier";

const getSupplierOptionSubtitle = (supplier) =>
  [supplier.supplierCode, supplier.gstNo].filter(Boolean).join(" · ");

const getProductOptionId = (product) => normalizeId(product);

const getProductOptionLabel = (product) =>
  product.name || product.productCode || "Product";

const getProductOptionSubtitle = (product) =>
  [product.productCode, product.type, product.unit].filter(Boolean).join(" · ");

const getRequisitionOptionId = (requisition) => requisition.requisitionNumber;

const getRequisitionOptionLabel = (requisition) =>
  requisition.requisitionNumber;

const getRequisitionOptionSubtitle = (requisition) => requisition.purpose || "";

/* ------------------------------------------------------------------ */
/* Workflow configuration                                              */
/* ------------------------------------------------------------------ */

const ACTIONS = {
  issue: {
    type: "success",
    icon: Send,
    title: "Mark RFQ as Issued",
    confirmText: "Mark Issued",
    message:
      "Mark this RFQ as issued? This changes its status only and does not send supplier messages.",
    success: "RFQ marked as issued.",
  },

  close: {
    type: "warning",
    icon: Check,
    title: "Close RFQ",
    confirmText: "Close RFQ",
    message: "Are you sure you want to close this RFQ?",
    success: "RFQ closed successfully.",
  },

  cancel: {
    type: "danger",
    icon: X,
    title: "Cancel RFQ",
    confirmText: "Cancel RFQ",
    message:
      "This RFQ will be cancelled. Please provide a cancellation reason.",
    field: "cancellationReason",
    label: "Cancellation Reason",
    success: "RFQ cancelled successfully.",
  },
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function PurchaseRfqPage({ mode = "create" }) {
  const navigate = useNavigate();
  const params = useParams();

  // Hooks must be called inside the component body.
  const keyboardOpen = useKeyboardOpen();

  const rfqNumber = text(params.rfqNumber ?? params.id).trim();

  const isCreate = mode === "create";
  const isEdit = mode === "edit";
  const isView = mode === "view";

  const [form, setForm] = useState(initialForm);
  const [items, setItems] = useState(() => [newItem()]);

  const [rfqDocument, setRfqDocument] = useState(null);
  const [requisition, setRequisition] = useState(null);

  const [supplierRecords, setSupplierRecords] = useState({});
  const [supplierWarning, setSupplierWarning] = useState("");

  const [loading, setLoading] = useState(true);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [uncertainResult, setUncertainResult] = useState(false);

  const [error, setError] = useState("");
  const [showNotes, setShowNotes] = useState(false);

  const [action, setAction] = useState("");
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [leaveOpen, setLeaveOpen] = useState(false);

  const submitLock = useRef(false);
  const sourceLock = useRef(false);
  const actionLock = useRef(false);

  const pageVersionRef = useRef(0);

  const requisitionBased = form.creationMode === "REQUISITION";

  const editable = isCreate || (isEdit && rfqDocument?.status === "CREATED");

  const busy = loading || saving || sourceLoading || actionLoading;

  const disabled = busy || loadFailed || uncertainResult || !editable;

  const itemsLocked = isView || requisitionBased;

  /* ---------------------------------------------------------------- */
  /* Load RFQ only; do not prefetch entire supplier/product collections */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    const pageVersion = ++pageVersionRef.current;

    const isCurrent = () => pageVersion === pageVersionRef.current;

    const loadPage = async () => {
      setLoading(true);
      setLoadFailed(false);
      setError("");
      setSupplierWarning("");
      setSupplierRecords({});
      setDirty(false);
      setUncertainResult(false);
      setRfqDocument(null);
      setRequisition(null);
      setAction("");
      setActionReason("");
      setSourceLoading(false);

      try {
        if (!["create", "edit", "view"].includes(mode)) {
          throw new Error("Invalid RFQ page mode.");
        }

        if (isCreate) {
          setForm(initialForm());
          setItems([newItem()]);
          setShowNotes(false);
          return;
        }

        if (
          !rfqNumber ||
          ["undefined", "null"].includes(rfqNumber.toLowerCase())
        ) {
          throw new Error("RFQ number is missing. Open the RFQ from the list.");
        }

        const response = await api.purchaseRfq.getByNumber(rfqNumber);

        if (!isCurrent()) return;

        const record = getDocument(response);

        if (!record?._id || !Number.isSafeInteger(record.__v)) {
          throw new Error("The server did not return a valid RFQ.");
        }

        const rawSuppliers = Array.isArray(record.supplierIds)
          ? record.supplierIds
          : [];

        const ids = rawSuppliers.map(normalizeId).filter(Boolean);

        const populatedRecords = {};

        for (const supplier of rawSuppliers) {
          if (
            supplier &&
            typeof supplier === "object" &&
            supplier.supplierName
          ) {
            populatedRecords[normalizeId(supplier)] = supplier;
          }
        }

        setRfqDocument(record);
        setSupplierRecords(populatedRecords);

        setForm({
          creationMode: record.creationMode,
          requisitionNumber: record.sourceRequisitionNumber || "",
          rfqDate: dateValue(record.rfqDate),
          quotationDueDate: dateValue(record.quotationDueDate),
          supplierIds: ids,
          deliveryAddress: record.deliveryAddress || "",
          paymentTerms: record.paymentTerms || "",
          deliveryTerms: record.deliveryTerms || "",
          termsAndConditions: record.termsAndConditions || "",
          notes: record.notes || "",
        });

        setItems(mapItems(record.items || []));
        setShowNotes(Boolean(record.notes));

        if (isEdit && record.status !== "CREATED") {
          setError("This RFQ is no longer editable. Open it in view mode.");
        }

        const missingIds = ids.filter((id) => !populatedRecords[id]);

        if (missingIds.length) {
          try {
            const suppliersResponse = await api.purchaseRfq.getSuppliers({
              ids: missingIds.join(","),
              page: 1,
              limit: 100,
            });

            if (!isCurrent()) return;

            const { data } = parseListResponse(suppliersResponse, "suppliers");

            const requestedIds = new Set(missingIds);
            const hydrated = { ...populatedRecords };

            for (const supplier of data) {
              const id = normalizeId(supplier);

              // Never display unrelated records if the backend
              // ignores the ids query parameter.
              if (requestedIds.has(id)) {
                hydrated[id] = supplier;
              }
            }

            setSupplierRecords(hydrated);

            if (ids.some((id) => !hydrated[id])) {
              setSupplierWarning(
                "Some selected supplier names could not be loaded. Their IDs are preserved. Ensure the supplier endpoint supports the ids filter.",
              );
            }
          } catch {
            if (!isCurrent()) return;

            setSupplierWarning(
              "Selected supplier names could not be loaded. Their IDs are preserved.",
            );
          }
        }
      } catch (requestError) {
        if (!isCurrent()) return;

        setLoadFailed(true);
        setError(getErrorMessage(requestError));
      } finally {
        if (isCurrent()) setLoading(false);
      }
    };

    loadPage();

    return () => {
      pageVersionRef.current += 1;
    };
  }, [mode, isCreate, isEdit, rfqNumber, reloadKey]);

  /* ---------------------------------------------------------------- */
  /* Form changes                                                      */
  /* ---------------------------------------------------------------- */

  const markChanged = () => {
    setDirty(true);
    setError("");
  };

  const changeField = (event) => {
    if (disabled) return;

    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    markChanged();
  };

  const changeMode = (event) => {
    if (!isCreate || disabled) return;

    const creationMode = event.target.value;

    setForm((previous) => ({
      ...previous,
      creationMode,
      requisitionNumber: "",
    }));

    setRequisition(null);
    setItems([newItem()]);
    markChanged();
  };

  /* ---------------------------------------------------------------- */
  /* Requisition selection                                             */
  /* ---------------------------------------------------------------- */

  const loadRequisition = async (selectedNumber) => {
    if (disabled || sourceLock.current || !isCreate || !requisitionBased) {
      return;
    }

    if (!selectedNumber) {
      setRequisition(null);
      setItems([newItem()]);

      setForm((previous) => ({
        ...previous,
        requisitionNumber: "",
      }));

      markChanged();
      return;
    }

    const number = text(selectedNumber).trim();
    const pageVersion = pageVersionRef.current;

    sourceLock.current = true;
    setSourceLoading(true);
    setError("");
    setDirty(true);
    setRequisition(null);
    setItems([newItem()]);

    setForm((previous) => ({
      ...previous,
      requisitionNumber: number,
    }));

    try {
      const response = await api.purchaseRfq.getRequisitionByNumber(number);

      if (pageVersion !== pageVersionRef.current) return;

      const record = getDocument(response);

      if (
        !record?._id ||
        record.status !== "APPROVED" ||
        !Number.isSafeInteger(record.__v) ||
        !Array.isArray(record.items) ||
        record.items.length < 1 ||
        record.items.length > 200
      ) {
        throw new Error(
          "Select an APPROVED requisition containing between 1 and 200 items.",
        );
      }

      setRequisition(record);
      setItems(mapItems(record.items));

      setForm((previous) => {
        const sourceDate = dateValue(record.requisitionDate);

        const rfqDate =
          previous.rfqDate < sourceDate ? sourceDate : previous.rfqDate;

        return {
          ...previous,
          requisitionNumber: record.requisitionNumber,
          rfqDate,
          quotationDueDate:
            previous.quotationDueDate < rfqDate
              ? rfqDate
              : previous.quotationDueDate,
        };
      });
    } catch (requestError) {
      if (pageVersion !== pageVersionRef.current) return;

      setRequisition(null);
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

  /* ---------------------------------------------------------------- */
  /* Suppliers                                                         */
  /* ---------------------------------------------------------------- */

  const toggleSupplier = (supplierId, supplierRecord) => {
    if (disabled) return;

    if (!supplierId) {
      setForm((previous) => ({
        ...previous,
        supplierIds: [],
      }));

      setSupplierRecords({});
      setSupplierWarning("");
      markChanged();
      return;
    }

    const id = String(supplierId);
    const selected = form.supplierIds.includes(id);

    if (!selected && form.supplierIds.length >= 100) {
      toast.error("You can select a maximum of 100 suppliers.");
      return;
    }

    if (supplierRecord) {
      setSupplierRecords((previous) => ({
        ...previous,
        [id]: supplierRecord,
      }));
    }

    setForm((previous) => ({
      ...previous,
      supplierIds: previous.supplierIds.includes(id)
        ? previous.supplierIds.filter((existingId) => existingId !== id)
        : [...previous.supplierIds, id],
    }));

    markChanged();
  };

  /* ---------------------------------------------------------------- */
  /* Items                                                             */
  /* ---------------------------------------------------------------- */

  const updateItem = (rowId, field, value) => {
    if (disabled || itemsLocked) return;

    setItems((previous) =>
      previous.map((item) =>
        item.rowId === rowId ? { ...item, [field]: value } : item,
      ),
    );

    markChanged();
  };

  const selectProduct = (rowId, productId, productRecord) => {
    if (disabled || itemsLocked) return;

    const nextId = productId ? String(productId) : "";

    setItems((previous) =>
      previous.map((item) =>
        item.rowId === rowId
          ? {
              ...item,
              lineId: item.productId === nextId ? item.lineId : undefined,
              productId: nextId,
              productCode: productRecord?.productCode || "",
              productName: productRecord?.name || "",
              productType: productRecord?.type || "",
              unit: productRecord?.unit || "",
            }
          : item,
      ),
    );

    markChanged();
  };

  const addItem = () => {
    if (disabled || itemsLocked || items.length >= 200) {
      return;
    }

    setItems((previous) => [...previous, newItem()]);
    markChanged();
  };

  const removeItem = (rowId) => {
    if (disabled || itemsLocked || items.length <= 1) {
      return;
    }

    setItems((previous) => previous.filter((item) => item.rowId !== rowId));

    markChanged();
  };

  /* ---------------------------------------------------------------- */
  /* Validation and payload                                             */
  /* ---------------------------------------------------------------- */

  const validateForm = () => {
    if (!form.rfqDate || !form.quotationDueDate) {
      throw new Error("RFQ date and quotation due date are required.");
    }

    if (form.quotationDueDate < form.rfqDate) {
      throw new Error("Quotation due date cannot precede RFQ date.");
    }

    if (form.supplierIds.length < 1 || form.supplierIds.length > 100) {
      throw new Error("Select between 1 and 100 suppliers.");
    }

    for (const id of form.supplierIds) {
      if (supplierRecords[id]?.isDeleted) {
        throw new Error("Remove deleted suppliers from the selection.");
      }
    }

    if (requisitionBased && isCreate && !requisition) {
      throw new Error("Select an approved Purchase Requisition first.");
    }

    if (items.length < 1 || items.length > 200) {
      throw new Error("Provide between 1 and 200 RFQ items.");
    }

    if (!requisitionBased) {
      items.forEach((item, index) => {
        if (!item.productId) {
          throw new Error(`Select a product for item ${index + 1}.`);
        }

        if (!quantityIsValid(item.quantity)) {
          throw new Error(
            `Enter a quantity between 0.001 and 1000000 with at most three decimals for item ${index + 1}.`,
          );
        }

        if (text(item.specification).length > 1000) {
          throw new Error(
            `Specification for item ${index + 1} cannot exceed 1000 characters.`,
          );
        }
      });
    }
  };

  const buildPayload = () => {
    const common = {
      rfqDate: form.rfqDate,
      quotationDueDate: form.quotationDueDate,
      supplierIds: form.supplierIds,
      deliveryAddress: text(form.deliveryAddress).trim() || null,
      paymentTerms: text(form.paymentTerms).trim() || null,
      deliveryTerms: text(form.deliveryTerms).trim() || null,
      termsAndConditions: text(form.termsAndConditions).trim() || null,
      notes: text(form.notes).trim() || null,
    };

    const directItems = items.map((item) => ({
      ...(item.lineId ? { lineId: item.lineId } : {}),
      productId: item.productId,
      quantity: Number(item.quantity),
      specification: text(item.specification).trim() || null,
    }));

    if (isEdit) {
      return {
        ...common,
        version: rfqDocument.__v,
        ...(!requisitionBased ? { items: directItems } : {}),
      };
    }

    if (requisitionBased) {
      return {
        ...common,
        creationMode: "REQUISITION",
        sourceRequisitionId: requisition._id,
        sourceRequisitionVersion: requisition.__v,
      };
    }

    return {
      ...common,
      creationMode: "DIRECT",
      items: directItems,
    };
  };

  /* ---------------------------------------------------------------- */
  /* Save                                                              */
  /* ---------------------------------------------------------------- */

  const saveRfq = async () => {
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

    const pageVersion = pageVersionRef.current;
    let saved;

    submitLock.current = true;
    setSaving(true);
    setError("");

    try {
      const response = isEdit
        ? await api.purchaseRfq.update(rfqDocument.rfqNumber, payload)
        : await api.purchaseRfq.create(payload);

      if (pageVersion !== pageVersionRef.current) return;

      saved = getDocument(response);

      if (!saved?.rfqNumber) {
        throw new Error(
          "The server did not return an RFQ number. Check the list before submitting again.",
        );
      }
    } catch (requestError) {
      if (pageVersion !== pageVersionRef.current) return;

      const status = requestError?.response?.status;

      if (!status || status >= 500 || status === 408) {
        setUncertainResult(true);
      }

      setError(getErrorMessage(requestError));
      toast.error(getErrorMessage(requestError));
      return;
    } finally {
      submitLock.current = false;

      if (pageVersion === pageVersionRef.current) {
        setSaving(false);
      }
    }

    if (!saved || pageVersion !== pageVersionRef.current) {
      return;
    }

    setDirty(false);

    toast.success(
      isEdit ? "RFQ updated successfully." : "RFQ created successfully.",
    );

    navigate(rfqPath(saved.rfqNumber), {
      replace: true,
    });
  };

  /* ---------------------------------------------------------------- */
  /* Workflow actions                                                  */
  /* ---------------------------------------------------------------- */

  const openAction = (name) => {
    if (busy || !ACTIONS[name]) return;

    setAction(name);
    setActionReason("");
  };

  const closeAction = () => {
    if (actionLock.current) return;

    setAction("");
    setActionReason("");
  };

  const confirmAction = async () => {
    if (actionLock.current || !rfqDocument || !ACTIONS[action]) {
      return;
    }

    const config = ACTIONS[action];

    if (config.field && !actionReason.trim()) {
      toast.error(`${config.label} is required.`);
      return;
    }

    const method = api.purchaseRfq[action];

    if (typeof method !== "function") {
      toast.error(`The "${action}" API method is not available.`);
      return;
    }

    const pageVersion = pageVersionRef.current;

    actionLock.current = true;
    setActionLoading(true);

    try {
      const response = await method(rfqDocument.rfqNumber, {
        version: rfqDocument.__v,
        ...(config.field ? { [config.field]: actionReason.trim() } : {}),
      });

      if (pageVersion !== pageVersionRef.current) return;

      const updated = getDocument(response);

      if (!updated?.rfqNumber || !Number.isSafeInteger(updated.__v)) {
        throw new Error("Reload the RFQ to verify its current status.");
      }

      setRfqDocument(updated);
      setAction("");
      setActionReason("");
      setError("");

      toast.success(config.success);
    } catch (requestError) {
      if (pageVersion !== pageVersionRef.current) return;

      toast.error(getErrorMessage(requestError));
      setAction("");
      setReloadKey((previous) => previous + 1);
    } finally {
      actionLock.current = false;

      if (pageVersion === pageVersionRef.current) {
        setActionLoading(false);
      }
    }
  };

  /* ---------------------------------------------------------------- */
  /* Navigation                                                        */
  /* ---------------------------------------------------------------- */

  const exitPage = () => {
    if (submitLock.current || sourceLock.current || actionLock.current) {
      return;
    }

    if (dirty || uncertainResult) {
      setLeaveOpen(true);
      return;
    }

    navigate(RFQ_BASE);
  };

  const confirmLeave = () => {
    setLeaveOpen(false);
    setDirty(false);
    navigate(RFQ_BASE);
  };

  const actionConfig = ACTIONS[action];

  const selectedSuppliers = useMemo(
    () =>
      form.supplierIds.map((id) => ({
        id,
        record: supplierRecords[id] || null,
      })),
    [form.supplierIds, supplierRecords],
  );

  /* ---------------------------------------------------------------- */
  /* Buttons                                                           */
  /* ---------------------------------------------------------------- */

  const actionButtons = isView ? (
    <>
      {rfqDocument?.status === "CREATED" && (
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => navigate(rfqPath(rfqDocument.rfqNumber, "edit"))}
        >
          Edit
        </Button>
      )}

      {rfqDocument?.status === "CREATED" && (
        <Button
          type="button"
          icon={Send}
          disabled={busy}
          onClick={() => openAction("issue")}
        >
          Mark Issued
        </Button>
      )}

      {rfqDocument?.status === "ISSUED" && (
        <Button
          type="button"
          icon={Check}
          disabled={busy}
          onClick={() => openAction("close")}
        >
          Close RFQ
        </Button>
      )}

      {["CREATED", "ISSUED"].includes(rfqDocument?.status) && (
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => openAction("cancel")}
        >
          Cancel RFQ
        </Button>
      )}

      <Button
        type="button"
        variant="secondary"
        disabled={busy}
        onClick={() => setReloadKey((previous) => previous + 1)}
      >
        Refresh
      </Button>
    </>
  ) : (
    <Button
      type="button"
      icon={Save}
      loading={saving}
      disabled={disabled}
      onClick={saveRfq}
    >
      {saving ? "Saving..." : isEdit ? "Update RFQ" : "Create RFQ"}
    </Button>
  );

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <div
      className={`doc-page rfqu-document-page rfqu-has-bar ${
        isView ? "doc-detail-page" : ""
      } ${keyboardOpen ? "is-keyboard-open" : ""}`}
    >
      <form noValidate onSubmit={(event) => event.preventDefault()}>
        <header className="doc-header">
          <div className="doc-header-left">
            <Button
              type="button"
              variant="secondary"
              icon={ArrowLeft}
              disabled={saving || sourceLoading || actionLoading}
              onClick={exitPage}
            >
              Back
            </Button>

            <div className="doc-title">
              <FileText size={19} />

              <span>
                {isView
                  ? rfqDocument?.rfqNumber || "RFQ"
                  : isEdit
                    ? "Edit RFQ"
                    : "Create Request for Quotation"}
              </span>
            </div>
          </div>

          <div className="doc-header-actions">
            {rfqDocument && <StatusField value={rfqDocument.status} />}

            <div className="rfqu-header-buttons">{actionButtons}</div>
          </div>
        </header>

        {(loading || sourceLoading || error || supplierWarning) && (
          <div className="doc-alerts">
            {(loading || sourceLoading) && (
              <div className="doc-alert" role="status">
                {sourceLoading
                  ? "Loading requisition items..."
                  : "Loading RFQ information..."}
              </div>
            )}

            {supplierWarning && (
              <div className="doc-alert" role="status">
                {supplierWarning}
              </div>
            )}

            {error && (
              <div className="doc-alert doc-alert-error" role="alert">
                <p>{error}</p>

                {loadFailed && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setReloadKey((previous) => previous + 1)}
                  >
                    Retry Loading
                  </Button>
                )}

                {uncertainResult && (
                  <Button type="button" variant="secondary" onClick={exitPage}>
                    Check RFQs
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        <fieldset className="doc-fieldset" disabled={disabled}>
          <main className="doc-main">
            {isCreate && (
              <section className="rfqu-source-section">
                <Select
                  label="Create RFQ"
                  value={form.creationMode}
                  options={[
                    {
                      value: "DIRECT",
                      label: "Direct RFQ",
                    },
                    {
                      value: "REQUISITION",
                      label: "From Purchase Requisition",
                    },
                  ]}
                  onChange={changeMode}
                />

                {requisitionBased && (
                  <EntitySearchPicker
                    label="Approved Requisition (PR No.)"
                    placeholder="Search approved requisitions..."
                    fetchOptions={fetchRequisitionOptions}
                    getOptionId={getRequisitionOptionId}
                    getOptionLabel={getRequisitionOptionLabel}
                    getOptionSubtitle={getRequisitionOptionSubtitle}
                    selectedIds={
                      form.requisitionNumber ? [form.requisitionNumber] : []
                    }
                    selectedLabel={form.requisitionNumber}
                    onToggle={loadRequisition}
                    multiple={false}
                    disabled={disabled}
                    emptyMessage="No approved requisitions found."
                  />
                )}

                {requisition && (
                  <div className="rfqu-source-confirmation">
                    <LockKeyhole size={17} />

                    <div>
                      <strong>{requisition.requisitionNumber}</strong>

                      <span>{requisition.purpose}</span>

                      <span>
                        Items and quantities come from the approved requisition.
                      </span>
                    </div>
                  </div>
                )}
              </section>
            )}

            <section className="doc-top">
              <div className="doc-panel doc-party-panel">
                <div className="rfqu-section-heading">
                  <h2 className="doc-panel-title">
                    {isView ? "Selected Suppliers" : "Select Suppliers"}
                  </h2>

                  <span className="rfqu-count-badge">
                    {form.supplierIds.length} selected
                  </span>
                </div>

                {!isView && (
                  <EntitySearchPicker
                    label="Search Suppliers"
                    placeholder="Search name, code, GSTIN..."
                    fetchOptions={fetchSupplierOptions}
                    getOptionId={getSupplierOptionId}
                    getOptionLabel={getSupplierOptionLabel}
                    getOptionSubtitle={getSupplierOptionSubtitle}
                    selectedIds={form.supplierIds}
                    onToggle={toggleSupplier}
                    multiple
                    disabled={disabled}
                    emptyMessage="No matching suppliers found."
                  />
                )}

                <div className="rfqu-supplier-list">
                  {selectedSuppliers.map(({ id, record }) => (
                    <label
                      key={id}
                      className="rfqu-supplier-card rfqu-supplier-card--selected"
                    >
                      {!isView && (
                        <input
                          type="checkbox"
                          checked
                          disabled={disabled}
                          onChange={() => toggleSupplier(id, record)}
                        />
                      )}

                      <div className="rfqu-supplier-avatar">
                        {record?.supplierName?.charAt(0).toUpperCase() || "S"}
                      </div>

                      <div className="rfqu-supplier-copy">
                        <strong>
                          {record?.supplierName || "Selected supplier"}
                        </strong>

                        <span>
                          {record?.supplierCode || `ID: ${id}`}

                          {record?.gstNo ? ` · ${record.gstNo}` : ""}
                        </span>

                        {record?.isDeleted && (
                          <span>This supplier is deleted.</span>
                        )}
                      </div>
                    </label>
                  ))}

                  {!selectedSuppliers.length && (
                    <p className="rfqu-empty">
                      {isView
                        ? "No suppliers selected."
                        : "Search and select suppliers above."}
                    </p>
                  )}
                </div>

                <p className="doc-note">
                  Supplier offers are entered by admin. Supplier login is not
                  required.
                </p>
              </div>

              <div className="doc-panel">
                <h2 className="doc-panel-title">RFQ Details</h2>

                <div className="doc-fields-grid">
                  <Input
                    label="RFQ Number"
                    value={rfqDocument?.rfqNumber || "Generated after creation"}
                    readOnly
                  />

                  <Input
                    label="RFQ Date"
                    name="rfqDate"
                    type="date"
                    value={form.rfqDate}
                    onChange={changeField}
                    required
                  />

                  <Input
                    label="Quotation Due Date"
                    name="quotationDueDate"
                    type="date"
                    value={form.quotationDueDate}
                    min={form.rfqDate}
                    onChange={changeField}
                    required
                  />

                  <Input
                    label="Payment Terms"
                    name="paymentTerms"
                    value={form.paymentTerms}
                    onChange={changeField}
                    maxLength={100}
                    placeholder="For example: 30 days"
                  />

                  <div className="rfqu-full-width">
                    <Input
                      label="Delivery Terms"
                      name="deliveryTerms"
                      value={form.deliveryTerms}
                      onChange={changeField}
                      maxLength={1000}
                      placeholder="Expected delivery requirements"
                    />
                  </div>

                  <div className="rfqu-full-width">
                    <Textarea
                      label="Delivery Address"
                      name="deliveryAddress"
                      value={form.deliveryAddress}
                      onChange={changeField}
                      rows={3}
                      maxLength={2000}
                    />
                  </div>
                </div>

                {requisitionBased && (
                  <div className="rfqu-source-reference">
                    <span>Source Requisition</span>

                    <strong>{form.requisitionNumber || "Not loaded"}</strong>
                  </div>
                )}
              </div>
            </section>

            <section className="doc-items">
              <div className="doc-table-wrap">
                <table className="doc-table rfqu-items-table">
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Product / Service</th>
                      <th>Type</th>
                      <th>Unit</th>
                      <th>Quantity</th>
                      <th>Specification</th>
                      {!itemsLocked && <th>Remove</th>}
                    </tr>
                  </thead>

                  <tbody>
                    {items.map((item, index) => (
                      <tr key={item.rowId}>
                        <td className="doc-cell-no" data-label="No.">
                          {index + 1}
                        </td>

                        <td
                          className="doc-cell-item"
                          data-label="Product / Service"
                        >
                          {itemsLocked ? (
                            <div className="rfqu-document-cell">
                              <strong>{item.productName || "—"}</strong>

                              <span>{item.productCode || "—"}</span>
                            </div>
                          ) : (
                            <EntitySearchPicker
                              placeholder="Search product or service..."
                              fetchOptions={fetchProductOptions}
                              getOptionId={getProductOptionId}
                              getOptionLabel={getProductOptionLabel}
                              getOptionSubtitle={getProductOptionSubtitle}
                              selectedIds={
                                item.productId ? [item.productId] : []
                              }
                              selectedLabel={
                                item.productName
                                  ? `${item.productName}${
                                      item.productCode
                                        ? ` (${item.productCode})`
                                        : ""
                                    }`
                                  : item.productCode || ""
                              }
                              onToggle={(productId, productRecord) =>
                                selectProduct(
                                  item.rowId,
                                  productId,
                                  productRecord,
                                )
                              }
                              multiple={false}
                              disabled={disabled || itemsLocked}
                              pageSize={20}
                              debounceMs={350}
                              emptyMessage="No matching products or services found."
                            />
                          )}
                        </td>

                        <td data-label="Type">{item.productType || "—"}</td>

                        <td data-label="Unit">{item.unit || "—"}</td>

                        <td data-label="Quantity">
                          {itemsLocked ? (
                            <strong>{formatQuantity(item.quantity)}</strong>
                          ) : (
                            <Input
                              type="number"
                              inputMode="decimal"
                              min="0.001"
                              max="1000000"
                              step="0.001"
                              value={item.quantity}
                              aria-label={`Quantity ${index + 1}`}
                              onChange={(event) =>
                                updateItem(
                                  item.rowId,
                                  "quantity",
                                  event.target.value,
                                )
                              }
                            />
                          )}
                        </td>

                        <td data-label="Specification">
                          {itemsLocked ? (
                            <span className="rfqu-text-content">
                              {item.specification || "—"}
                            </span>
                          ) : (
                            <Input
                              value={item.specification}
                              maxLength={1000}
                              placeholder="Size, grade, brand, requirements"
                              aria-label={`Specification ${index + 1}`}
                              onChange={(event) =>
                                updateItem(
                                  item.rowId,
                                  "specification",
                                  event.target.value,
                                )
                              }
                            />
                          )}
                        </td>

                        {!itemsLocked && (
                          <td className="doc-cell-action" data-label="Remove">
                            <button
                              type="button"
                              className="doc-remove-button"
                              disabled={disabled || items.length <= 1}
                              aria-label={`Remove item ${index + 1}`}
                              onClick={() => removeItem(item.rowId)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}

                    {!items.length && (
                      <tr>
                        <td
                          colSpan={itemsLocked ? 6 : 7}
                          className="rfqu-empty"
                        >
                          No items available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {!itemsLocked && (
                <div className="doc-add-item-row">
                  <button
                    type="button"
                    className="doc-dashed-line"
                    disabled={disabled || items.length >= 200}
                    onClick={addItem}
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
                    rows={4}
                    maxLength={5000}
                    placeholder="Quotation submission requirements..."
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
                      rows={3}
                      maxLength={2000}
                    />
                  </div>
                )}

                {rfqDocument?.cancellationReason && (
                  <div className="doc-panel">
                    <h2 className="doc-panel-title">Cancellation Reason</h2>

                    <p className="rfqu-text-content">
                      {rfqDocument.cancellationReason}
                    </p>
                  </div>
                )}
              </div>

              <div className="doc-summary">
                <SummaryRow
                  label="Source"
                  value={requisitionBased ? "Purchase Requisition" : "Direct"}
                />

                <SummaryRow
                  label="Selected Suppliers"
                  value={form.supplierIds.length}
                />

                <SummaryRow label="Item Lines" value={items.length} />

                <SummaryRow
                  label="Quotation Due"
                  value={formatDate(form.quotationDueDate)}
                />

                {rfqDocument?.issuedAt && (
                  <SummaryRow
                    label="Issued On"
                    value={formatDate(rfqDocument.issuedAt)}
                  />
                )}

                {rfqDocument?.closedAt && (
                  <SummaryRow
                    label="Closed On"
                    value={formatDate(rfqDocument.closedAt)}
                  />
                )}

                {rfqDocument?.cancelledAt && (
                  <SummaryRow
                    label="Cancelled On"
                    value={formatDate(rfqDocument.cancelledAt)}
                  />
                )}

                {rfqDocument && <WorkflowPanel rfqDocument={rfqDocument} />}

                <p className="doc-note">
                  RFQs do not create stock movements, supplier payables, or
                  accounting journals.
                </p>
              </div>
            </section>
          </main>
        </fieldset>

        <div
          className={`doc-mobile-bar ${isView ? "rfqu-mobile-bar--view" : ""}`}
        >
          {!isView && (
            <div className="doc-mobile-total">
              <span>Selected Suppliers</span>

              <strong>{form.supplierIds.length}</strong>
            </div>
          )}

          <div className="doc-mobile-actions">{actionButtons}</div>
        </div>
      </form>

      <ConfirmModal
        open={Boolean(action)}
        type={actionConfig?.type || "warning"}
        icon={actionConfig?.icon}
        confirmIcon={actionConfig?.icon}
        title={actionConfig?.title || ""}
        message={actionConfig?.message || ""}
        confirmText={actionConfig?.confirmText || "Confirm"}
        cancelText="Back"
        loading={actionLoading}
        loadingText="Processing..."
        onCancel={closeAction}
        onConfirm={confirmAction}
      >
        {actionConfig?.field && (
          <Textarea
            label={actionConfig.label}
            value={actionReason}
            onChange={(event) => setActionReason(event.target.value)}
            rows={4}
            maxLength={1000}
            disabled={actionLoading}
            required
          />
        )}
      </ConfirmModal>

      <ConfirmModal
        open={leaveOpen}
        type="warning"
        title={
          uncertainResult ? "Verify save result?" : "Discard unsaved changes?"
        }
        message={
          uncertainResult
            ? "The save result is uncertain. Open the RFQ list to verify whether it was saved before submitting again."
            : "You have unsaved changes. If you leave now, they will be lost."
        }
        confirmText={uncertainResult ? "Open List" : "Discard & Leave"}
        cancelText="Stay Here"
        onCancel={() => setLeaveOpen(false)}
        onConfirm={confirmLeave}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Workflow panel                                                      */
/* ------------------------------------------------------------------ */

const HEX_ID = /^[a-f\d]{24}$/i;

const getUserName = (value) => {
  if (!value) return "";

  if (typeof value === "string") {
    return HEX_ID.test(value) ? "" : value;
  }

  return value.name || value.fullName || value.username || value.email || "";
};

function WorkflowPanel({ rfqDocument }) {
  const steps = [
    {
      key: "created",
      label: "Created",
      by: rfqDocument.createdBy,
      at: rfqDocument.createdAt,
    },
    {
      key: "approved",
      label: "Approved",
      by: rfqDocument.approvedBy,
      at: rfqDocument.approvedAt,
    },
    {
      key: "rejected",
      label: "Rejected",
      by: rfqDocument.rejectedBy,
      at: rfqDocument.rejectedAt,
      danger: true,
    },
    {
      key: "issued",
      label: "Issued",
      by: rfqDocument.issuedBy,
      at: rfqDocument.issuedAt,
    },
    {
      key: "closed",
      label: "Closed",
      by: rfqDocument.closedBy,
      at: rfqDocument.closedAt,
    },
    {
      key: "cancelled",
      label: "Cancelled",
      by: rfqDocument.cancelledBy,
      at: rfqDocument.cancelledAt,
      danger: true,
    },
  ].filter((step) => step.at || step.by);

  if (!steps.length) return null;

  return (
    <div className="rfqu-workflow">
      <h3 className="rfqu-workflow-title">Workflow</h3>

      <ol className="rfqu-workflow-list">
        {steps.map((step) => (
          <li
            key={step.key}
            className={`rfqu-workflow-step ${step.danger ? "is-danger" : ""}`}
          >
            <span className="rfqu-workflow-dot" />

            <div>
              <strong>{step.label}</strong>

              <span>
                {getUserName(step.by) ? `by ${getUserName(step.by)}` : "by —"}
              </span>

              {step.at && <span>{formatDate(step.at)}</span>}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="doc-summary-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default PurchaseRfqPage;