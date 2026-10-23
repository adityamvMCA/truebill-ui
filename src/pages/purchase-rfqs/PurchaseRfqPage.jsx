import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  FileText,
  LockKeyhole,
  Plus,
  Save,
  Search,
  Send,
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
import ConfirmModal from "../../components/common/ConfirmModal/ConfirmModal";

import {
  RFQ_BASE,
  dateValue,
  fetchAllPages,
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

let rowCounter = 0;

const newItem = () => ({
  rowId: `rfqu-item-${++rowCounter}`,
  productId: "",
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
    productId: getId(item.productId),
    quantity: String(item.quantity),
    specification: item.specification || "",
  }));

const ACTION_ICONS = {
  approve: CheckCircle2,
  issue: Send,
  close: Check,
};


const ACTIONS = {
  approve: {
    type: "success",
    title: "Approve RFQ",
    confirmText: "Approve",
    confirmIcon: Check,
    message:
      "Approve this RFQ? Once approved, it can no longer be edited and can be marked as issued.",
    success: "RFQ approved successfully.",
  },

  issue: {
    type: "success",
    title: "Mark RFQ as Issued",
    confirmText: "Mark Issued",
    confirmIcon: Send,
    message:
      "Mark this approved RFQ as issued? This changes its status only and does not send supplier messages.",
    success: "RFQ marked as issued.",
  },

  close: {
    type: "warning",
    title: "Close RFQ",
    confirmText: "Close RFQ",
    confirmIcon: Check,
    message:
      "Close this RFQ? New or edited supplier quotations will no longer be allowed.",
    success: "RFQ closed successfully.",
  },

  cancel: {
    type: "danger",
    title: "Cancel RFQ",
    confirmText: "Cancel RFQ",
    confirmIcon: X,
    message:
      "This RFQ will be cancelled. Please provide a cancellation reason.",
    field: "cancellationReason",
    label: "Cancellation Reason",
    success: "RFQ cancelled successfully.",
  },
};


/* =====================================================
   SEARCHABLE APPROVED-PR DROPDOWN
===================================================== */

function RequisitionSelect({
  options,
  value,
  loading,
  disabled,
  onSelect,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const close = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();

    return options.filter(
      (option) =>
        !search ||
        `${option.requisitionNumber} ${option.purpose || ""}`
          .toLowerCase()
          .includes(search),
    );
  }, [options, query]);

  return (
    <div className="rfqu-combo" ref={rootRef}>
      <span className="rfqu-combo-label">
        Approved Requisition (PR No.)
      </span>

      <button
        type="button"
        className="rfqu-combo-trigger"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((previous) => !previous)}
      >
        <span className={value ? "" : "rfqu-combo-placeholder"}>
          {loading
            ? "Loading requisitions..."
            : value || "Select PR number"}
        </span>

        <ChevronDown size={16} />
      </button>

      {open && (
        <div className="rfqu-combo-menu">
          <div className="rfqu-combo-search">
            <Search size={15} />

            <input
              autoFocus
              value={query}
              placeholder="Search PR number or purpose..."
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <ul role="listbox" className="rfqu-combo-list">
            {filtered.map((option) => {
              const selected =
                option.requisitionNumber === value;

              return (
                <li key={option._id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={`rfqu-combo-option ${
                      selected ? "is-selected" : ""
                    }`}
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                      onSelect(option.requisitionNumber);
                    }}
                  >
                    <strong>{option.requisitionNumber}</strong>

                    {option.purpose && (
                      <span>{option.purpose}</span>
                    )}
                  </button>
                </li>
              );
            })}

            {!filtered.length && (
              <li className="rfqu-empty">
                {loading
                  ? "Loading..."
                  : "No approved requisitions found."}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

/* =====================================================
   PAGE
===================================================== */

function PurchaseRfqPage({ mode = "create" }) {
  const navigate = useNavigate();
  const params = useParams();

  const rfqNumber = String(
    params.rfqNumber ?? params.id ?? "",
  ).trim();

  const isCreate = mode === "create";
  const isEdit = mode === "edit";
  const isView = mode === "view";

  const [form, setForm] = useState(initialForm);
  const [items, setItems] = useState(() => [newItem()]);

  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);

  const [document, setDocument] = useState(null);
  const [requisition, setRequisition] = useState(null);

  const [requisitionOptions, setRequisitionOptions] = useState([]);
  const [requisitionsLoading, setRequisitionsLoading] =
    useState(false);

  const [supplierSearch, setSupplierSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [saving, setSaving] = useState(false);
  const [uncertainResult, setUncertainResult] = useState(false);
  const [dirty, setDirty] = useState(false);

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

  const requisitionBased =
    form.creationMode === "REQUISITION";

  const editable =
    isCreate ||
    (isEdit && document?.status === "CREATED");

  const busy =
    loading ||
    saving ||
    sourceLoading ||
    actionLoading;

  const disabled =
    busy ||
    loadFailed ||
    uncertainResult ||
    !editable;

  const itemsLocked =
    isView || requisitionBased;

  /* ---------- load page ---------- */

  useEffect(() => {
    const pageVersion = ++pageVersionRef.current;

    const isCurrent = () =>
      pageVersion === pageVersionRef.current;

    const loadPage = async () => {
      setLoading(true);
      setLoadFailed(false);
      setError("");
      setDirty(false);
      setUncertainResult(false);
      setDocument(null);
      setRequisition(null);
      setAction("");
      setActionReason("");
      setSupplierSearch("");

      try {
        if (!["create", "view", "edit"].includes(mode)) {
          throw new Error("Invalid RFQ page mode.");
        }

        if (
          !isCreate &&
          (!rfqNumber ||
            ["undefined", "null"].includes(
              rfqNumber.toLowerCase(),
            ))
        ) {
          throw new Error(
            "RFQ number is missing from the route. Open the RFQ from the list and check that the route parameter is named :rfqNumber or :id.",
          );
        }

        const [supplierRecords, productRecords, response] =
          await Promise.all([
            fetchAllPages(
              api.purchaseRfq.getSuppliers,
              "suppliers",
            ),

            isView
              ? Promise.resolve([])
              : fetchAllPages(
                  api.purchaseRfq.getProducts,
                  "products",
                ),

            isCreate
              ? Promise.resolve(null)
              : api.purchaseRfq.getByNumber(rfqNumber),
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

          if (
            !record?._id ||
            !Number.isSafeInteger(record.__v)
          ) {
            throw new Error(
              "The server did not return a valid RFQ.",
            );
          }

          setDocument(record);

          setForm({
            creationMode: record.creationMode,
            requisitionNumber:
              record.sourceRequisitionNumber || "",
            rfqDate: dateValue(record.rfqDate),
            quotationDueDate: dateValue(
              record.quotationDueDate,
            ),
            supplierIds: (record.supplierIds || []).map(getId),
            deliveryAddress: record.deliveryAddress || "",
            paymentTerms: record.paymentTerms || "",
            deliveryTerms: record.deliveryTerms || "",
            termsAndConditions:
              record.termsAndConditions || "",
            notes: record.notes || "",
          });

          setItems(mapItems(record.items));
          setShowNotes(Boolean(record.notes));

          if (isEdit && record.status !== "CREATED") {
            setError(
              "This RFQ is no longer editable. Open it in view mode.",
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
  }, [
    isCreate,
    isEdit,
    isView,
    rfqNumber,
    reloadKey,
    mode,
  ]);

  /* ---------- load approved PR list for dropdown ---------- */

  useEffect(() => {
    if (!isCreate || !requisitionBased) return undefined;

    let active = true;

    (async () => {
      try {
        setRequisitionsLoading(true);

        const records = await fetchAllPages(
          (queryParams) =>
            api.purchaseRfq.getRequisitions({
              ...queryParams,
              status: "APPROVED",
            }),
          // use the key your /purchase-requisitions list returns
          "requisitions",
        );

        if (active) {
          setRequisitionOptions(
            records.filter(
              (record) => record.status === "APPROVED",
            ),
          );
        }
      } catch (requestError) {
        if (active) toast.error(getErrorMessage(requestError));
      } finally {
        if (active) setRequisitionsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [isCreate, requisitionBased, reloadKey]);

  /* ---------- derived data ---------- */

  const supplierMap = useMemo(
    () =>
      new Map(
        suppliers.map((supplier) => [
          getId(supplier),
          supplier,
        ]),
      ),
    [suppliers],
  );

  const selectedSupplierSet = useMemo(
    () => new Set(form.supplierIds),
    [form.supplierIds],
  );

  const visibleSuppliers = useMemo(() => {
    const search = supplierSearch.trim().toLowerCase();

    return suppliers.filter((supplier) => {
      const id = getId(supplier);
      const selected = selectedSupplierSet.has(id);

      const available =
        selected ||
        (supplier.status === "Active" && !supplier.isDeleted);

      if (!available) return false;
      if (isView && !selected) return false;

      return (
        !search ||
        [
          supplier.supplierName,
          supplier.supplierCode,
          supplier.gstNo,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(search)
      );
    });
  }, [suppliers, supplierSearch, selectedSupplierSet, isView]);

  const missingSupplierIds = form.supplierIds.filter(
    (id) => !supplierMap.has(id),
  );

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
      });
    }

    for (const product of products) {
      map.set(getId(product), product);
    }

    return map;
  }, [products, items]);

  /* ---------- handlers ---------- */

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

    setForm((previous) => ({
      ...previous,
      creationMode,
      requisitionNumber: "",
    }));

    setRequisition(null);
    setItems([newItem()]);
    setDirty(true);
    setError("");
  };

  const loadRequisition = async (selectedNumber) => {
    if (
      sourceLock.current ||
      disabled ||
      !isCreate ||
      !requisitionBased
    ) {
      return;
    }

    const number = String(selectedNumber || "").trim();

    if (!number) return;

    setForm((previous) => ({
      ...previous,
      requisitionNumber: number,
    }));

    setRequisition(null);
    setItems([newItem()]);

    const pageVersion = pageVersionRef.current;

    try {
      sourceLock.current = true;
      setSourceLoading(true);
      setError("");

      const response =
        await api.purchaseRfq.getRequisitionByNumber(number);

      if (pageVersion !== pageVersionRef.current) return;

      const record = getDocument(response);

      if (
        !record?._id ||
        record.status !== "APPROVED" ||
        !Number.isSafeInteger(record.__v) ||
        !Array.isArray(record.items) ||
        !record.items.length
      ) {
        throw new Error(
          "Select an APPROVED requisition containing items.",
        );
      }

      setRequisition(record);
      setItems(mapItems(record.items));

      setForm((previous) => {
        const sourceDate = dateValue(record.requisitionDate);

        const rfqDate =
          previous.rfqDate < sourceDate
            ? sourceDate
            : previous.rfqDate;

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

      setDirty(true);
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

  const toggleSupplier = (supplierId) => {
    if (disabled) return;

    setForm((previous) => {
      const selected = previous.supplierIds.includes(supplierId);

      if (!selected && previous.supplierIds.length >= 100) {
        return previous;
      }

      return {
        ...previous,

        supplierIds: selected
          ? previous.supplierIds.filter((id) => id !== supplierId)
          : [...previous.supplierIds, supplierId],
      };
    });

    setDirty(true);
    setError("");
  };

  const updateItem = (rowId, field, value) => {
    if (disabled || itemsLocked) return;

    setItems((previous) =>
      previous.map((item) =>
        item.rowId === rowId
          ? { ...item, [field]: value }
          : item,
      ),
    );

    setDirty(true);
    setError("");
  };

  const selectProduct = (rowId, productId) => {
    if (disabled || itemsLocked) return;

    const product = productMap.get(productId);

    setItems((previous) =>
      previous.map((item) =>
        item.rowId === rowId
          ? {
              ...item,

              lineId:
                item.productId === productId
                  ? item.lineId
                  : undefined,

              productId,
              productCode: product?.productCode || "",
              productName: product?.name || "",
              productType: product?.type || "",
              unit: product?.unit || "",
            }
          : item,
      ),
    );

    setDirty(true);
    setError("");
  };

  const validateForm = () => {
    if (!form.rfqDate || !form.quotationDueDate) {
      throw new Error(
        "RFQ date and quotation due date are required.",
      );
    }

    if (form.quotationDueDate < form.rfqDate) {
      throw new Error(
        "Quotation due date cannot precede RFQ date.",
      );
    }

    if (
      !form.supplierIds.length ||
      form.supplierIds.length > 100
    ) {
      throw new Error("Select between 1 and 100 suppliers.");
    }

    for (const supplierId of form.supplierIds) {
      const supplier = supplierMap.get(supplierId);

      if (!supplier || supplier.isDeleted) {
        throw new Error(
          "Remove unavailable suppliers from the selection.",
        );
      }
    }

    if (requisitionBased && isCreate && !requisition) {
      throw new Error(
        "Select an approved Purchase Requisition first.",
      );
    }

    if (!items.length || items.length > 200) {
      throw new Error("Provide between 1 and 200 RFQ items.");
    }

    if (!requisitionBased) {
      items.forEach((item, index) => {
        const product = productMap.get(item.productId);

        if (
          !product ||
          product.status !== "ACTIVE" ||
          product.isDeleted
        ) {
          throw new Error(
            `Select an active product for item ${index + 1}.`,
          );
        }

        if (!quantityIsValid(item.quantity)) {
          throw new Error(
            `Enter a valid quantity with at most three decimals for item ${index + 1}.`,
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
      deliveryAddress: form.deliveryAddress.trim() || null,
      paymentTerms: form.paymentTerms.trim() || null,
      deliveryTerms: form.deliveryTerms.trim() || null,
      termsAndConditions:
        form.termsAndConditions.trim() || null,
      notes: form.notes.trim() || null,
    };

    const directItems = () =>
      items.map((item) => ({
        ...(item.lineId ? { lineId: item.lineId } : {}),
        productId: item.productId,
        quantity: Number(item.quantity),
        specification: item.specification.trim() || null,
      }));

    if (isEdit) {
      return {
        ...common,
        version: document.__v,

        ...(!requisitionBased ? { items: directItems() } : {}),
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
      items: directItems(),
    };
  };

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

    let saved;

    try {
      submitLock.current = true;
      setSaving(true);
      setError("");

      const response = isEdit
        ? await api.purchaseRfq.update(
            document.rfqNumber,
            payload,
          )
        : await api.purchaseRfq.create(payload);

      saved = getDocument(response);

      if (!saved?.rfqNumber) {
        throw new Error(
          "The server did not return an RFQ number. Check the list before submitting again.",
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
        ? "RFQ updated successfully."
        : "RFQ created successfully.",
    );

    navigate(rfqPath(saved.rfqNumber), {
      replace: true,
    });
  };

  const closeAction = () => {
    if (actionLock.current) return;

    setAction("");
    setActionReason("");
  };


const confirmAction = async () => {
  if (actionLock.current || !document || !ACTIONS[action]) {
    return;
  }

  const config = ACTIONS[action];

  if (config.field && !actionReason.trim()) {
    toast.error(`${config.label} is required.`);
    return;
  }

  const actionMethods = {
    approve: api.purchaseRfq.approve,
    issue: api.purchaseRfq.issue,
    close: api.purchaseRfq.close,
    cancel: api.purchaseRfq.cancel,
  };

  const actionMethod = actionMethods[action];

  if (typeof actionMethod !== "function") {
    toast.error(
      `The "${action}" action is not available in the Purchase RFQ API.`
    );
    return;
  }

  try {
    actionLock.current = true;
    setActionLoading(true);

    const response = await actionMethod(
      document.rfqNumber,
      {
        version: document.__v,
        ...(config.field
          ? { [config.field]: actionReason.trim() }
          : {}),
      }
    );

    const updated = getDocument(response);

    if (!updated?.rfqNumber) {
      throw new Error(
        "Reload the RFQ to verify its current status."
      );
    }

    setDocument(updated);
    setAction("");
    setActionReason("");
    setError("");

    toast.success(config.success);
  } catch (requestError) {
    toast.error(getErrorMessage(requestError));
    setAction("");
    setReloadKey((value) => value + 1);
  } finally {
    actionLock.current = false;
    setActionLoading(false);
  }
};


  const openAction = (name) => {
    setAction(name);
    setActionReason("");
  };

  const exitPage = () => {
    if (
      submitLock.current ||
      sourceLock.current ||
      actionLock.current
    ) {
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

  /* ---------- action buttons (header on desktop, sticky bar on mobile) ---------- */

  const saveButton = (
    <Button
      type="button"
      icon={Save}
      onClick={saveRfq}
      loading={saving}
      disabled={disabled}
    >
      {saving
        ? "Saving..."
        : isEdit
          ? "Update RFQ"
          : "Create RFQ"}
    </Button>
  );

  const viewButtons = (
    <>
      {document?.status === "CREATED" && (
        <>
          <Button
            type="button"
            variant="secondary"
            disabled={actionLoading}
            onClick={() =>
              navigate(rfqPath(document.rfqNumber, "edit"))
            }
          >
            Edit
          </Button>

          <Button
            type="button"
            icon={CheckCircle2}
            disabled={actionLoading}
            onClick={() => openAction("approve")}
          >
            Approve
          </Button>
        </>
      )}

      {document?.status === "APPROVED" && (
        <Button
          type="button"
          icon={Send}
          disabled={actionLoading}
          onClick={() => openAction("issue")}
        >
          Mark Issued
        </Button>
      )}

      {document?.status === "ISSUED" && (
        <Button
          type="button"
          icon={Check}
          disabled={actionLoading}
          onClick={() => openAction("close")}
        >
          Close RFQ
        </Button>
      )}

      {["CREATED", "APPROVED", "ISSUED"].includes(document?.status) && (
        <Button
          type="button"
          variant="secondary"
          disabled={actionLoading}
          onClick={() => openAction("cancel")}
        >
          Cancel RFQ
        </Button>
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
  );

  const actionButtons = isView ? viewButtons : saveButton;

  const modalType =
    action === "cancel"
      ? "danger"
      : action === "close"
        ? "warning"
        : "success";

  return (
    <div
      className={`doc-page rfqu-document-page rfqu-has-bar ${
        isView ? "doc-detail-page" : ""
      }`}
    >
      <form
        noValidate
        onSubmit={(event) => event.preventDefault()}
      >
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
                  ? document?.rfqNumber || "RFQ"
                  : isEdit
                    ? "Edit RFQ"
                    : "Create Request for Quotation"}
              </span>
            </div>
          </div>

          <div className="doc-header-actions">
            {document && <StatusField value={document.status} />}

            <div className="rfqu-header-buttons">
              {actionButtons}
            </div>
          </div>
        </header>

        {(loading || error) && (
          <div className="doc-alerts">
            {loading && (
              <div className="doc-alert" role="status">
                Loading RFQ information...
              </div>
            )}

            {error && (
              <div
                className="doc-alert doc-alert-error"
                role="alert"
              >
                <p>{error}</p>

                {loadFailed && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      setReloadKey((value) => value + 1)
                    }
                  >
                    Retry Loading
                  </Button>
                )}

                {uncertainResult && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={exitPage}
                  >
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
                    { value: "DIRECT", label: "Direct RFQ" },
                    {
                      value: "REQUISITION",
                      label: "From Purchase Requisition",
                    },
                  ]}
                  onChange={changeMode}
                />

                {requisitionBased && (
                  <RequisitionSelect
                    options={requisitionOptions}
                    value={form.requisitionNumber}
                    loading={requisitionsLoading}
                    disabled={disabled}
                    onSelect={loadRequisition}
                  />
                )}

                {requisition && (
                  <div className="rfqu-source-confirmation">
                    <LockKeyhole size={17} />

                    <div>
                      <strong>
                        {requisition.requisitionNumber}
                      </strong>

                      <span>{requisition.purpose}</span>

                      <span>
                        Items and quantities come from the
                        approved requisition.
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
                    {isView
                      ? "Selected Suppliers"
                      : "Select Suppliers"}
                  </h2>

                  <span className="rfqu-count-badge">
                    {form.supplierIds.length} selected
                  </span>
                </div>

                {!isView && (
                  <Input
                    label="Search Suppliers"
                    value={supplierSearch}
                    onChange={(event) =>
                      setSupplierSearch(event.target.value)
                    }
                    placeholder="Search name, code, GSTIN..."
                  />
                )}

                <div className="rfqu-supplier-list">
                  {visibleSuppliers.map((supplier) => {
                    const id = getId(supplier);
                    const selected = selectedSupplierSet.has(id);

                    return (
                      <label
                        key={id}
                        className={`rfqu-supplier-card ${
                          selected
                            ? "rfqu-supplier-card--selected"
                            : ""
                        }`}
                      >
                        {!isView && (
                          <input
                            type="checkbox"
                            checked={selected}
                            disabled={
                              disabled ||
                              (!selected &&
                                form.supplierIds.length >= 100)
                            }
                            onChange={() => toggleSupplier(id)}
                          />
                        )}

                        <div className="rfqu-supplier-avatar">
                          {supplier.supplierName
                            ?.charAt(0)
                            .toUpperCase() || "S"}
                        </div>

                        <div className="rfqu-supplier-copy">
                          <strong>
                            {supplier.supplierName || "Supplier"}
                          </strong>

                          <span>
                            {supplier.supplierCode || "—"}
                            {supplier.gstNo
                              ? ` · ${supplier.gstNo}`
                              : ""}
                          </span>
                        </div>
                      </label>
                    );
                  })}

                  {!visibleSuppliers.length && (
                    <p className="rfqu-empty">
                      No matching suppliers.
                    </p>
                  )}

                  {missingSupplierIds.length > 0 && (
                    <p className="rfqu-empty">
                      {missingSupplierIds.length} selected supplier
                      record(s) are unavailable in the supplier list.
                    </p>
                  )}
                </div>

                <p className="doc-note">
                  Supplier offers are entered by admin. Supplier
                  login is not required.
                </p>
              </div>

              <div className="doc-panel">
                <h2 className="doc-panel-title">RFQ Details</h2>

                <div className="doc-fields-grid">
                  <Input
                    label="RFQ Number"
                    value={
                      document?.rfqNumber ||
                      "Generated after creation"
                    }
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
                      maxLength={2000}
                      rows={3}
                    />
                  </div>
                </div>

                {requisitionBased && (
                  <div className="rfqu-source-reference">
                    <span>Source Requisition</span>
                    <strong>
                      {form.requisitionNumber || "Not loaded"}
                    </strong>
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
                    {items.map((item, index) => {
                      const product = productMap.get(item.productId);

                      const options = Array.from(
                        productMap.values(),
                      )
                        .filter(
                          (record) =>
                            getId(record) === item.productId ||
                            (record.status === "ACTIVE" &&
                              !record.isDeleted),
                        )
                        .map((record) => ({
                          value: getId(record),

                          label:
                            `${
                              record.name ||
                              record.productCode ||
                              getId(record)
                            }` +
                            `${
                              record.productCode
                                ? ` (${record.productCode})`
                                : ""
                            }`,
                        }));

                      return (
                        <tr key={item.rowId}>
                          <td
                            className="doc-cell-no"
                            data-label="No."
                          >
                            {index + 1}
                          </td>

                          <td
                            className="doc-cell-item"
                            data-label="Product / Service"
                          >
                            {itemsLocked ? (
                              <div className="rfqu-document-cell">
                                <strong>
                                  {item.productName || "—"}
                                </strong>

                                <span>
                                  {item.productCode || "—"}
                                </span>
                              </div>
                            ) : (
                              <Select
                                value={item.productId}
                                options={options}
                                placeholder="Select product or service"
                                aria-label={`Product ${index + 1}`}
                                onChange={(event) =>
                                  selectProduct(
                                    item.rowId,
                                    event.target.value,
                                  )
                                }
                              />
                            )}
                          </td>

                          <td data-label="Type">
                            {item.productType ||
                              product?.type ||
                              "—"}
                          </td>

                          <td data-label="Unit">
                            {item.unit || product?.unit || "—"}
                          </td>

                          <td data-label="Quantity">
                            {itemsLocked ? (
                              <strong>
                                {formatQuantity(item.quantity)}
                              </strong>
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
                                      (record) =>
                                        record.rowId !== item.rowId,
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

              {!itemsLocked && (
                <div className="doc-add-item-row">
                  <button
                    type="button"
                    className="doc-dashed-line"
                    disabled={items.length >= 200}
                    onClick={() => {
                      setItems((previous) => [
                        ...previous,
                        newItem(),
                      ]);

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
                    rows={4}
                    maxLength={5000}
                    placeholder="Quotation submission requirements..."
                  />
                </div>

                {!isView && (
                  <button
                    type="button"
                    className={`doc-extra-row ${
                      showNotes ? "is-open" : ""
                    }`}
                    aria-expanded={showNotes}
                    onClick={() =>
                      setShowNotes((previous) => !previous)
                    }
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

                {document?.cancellationReason && (
                  <div className="doc-panel">
                    <h2 className="doc-panel-title">
                      Cancellation Reason
                    </h2>

                    <p className="rfqu-text-content">
                      {document.cancellationReason}
                    </p>
                  </div>
                )}
              </div>

              <div className="doc-summary">
                <SummaryRow
                  label="Source"
                  value={
                    requisitionBased
                      ? "Purchase Requisition"
                      : "Direct"
                  }
                />

                <SummaryRow
                  label="Selected Suppliers"
                  value={form.supplierIds.length}
                />

                <SummaryRow
                  label="Item Lines"
                  value={items.length}
                />

                <SummaryRow
                  label="Quotation Due"
                  value={formatDate(form.quotationDueDate)}
                />

                {document?.issuedAt && (
                  <SummaryRow
                    label="Issued On"
                    value={formatDate(document.issuedAt)}
                  />
                )}

                {document?.closedAt && (
                  <SummaryRow
                    label="Closed On"
                    value={formatDate(document.closedAt)}
                  />
                )}

                {document?.cancelledAt && (
                  <SummaryRow
                    label="Cancelled On"
                    value={formatDate(document.cancelledAt)}
                  />
                )}

                {document && <WorkflowPanel document={document} />}

                <p className="doc-note">
                  RFQs do not create stock movements, supplier
                  payables, or accounting journals.
                </p>
              </div>
            </section>
          </main>
        </fieldset>

        {/* Sticky bottom bar on mobile (hidden on desktop by CSS) */}
        <div
          className={`doc-mobile-bar ${
            isView ? "rfqu-mobile-bar--view" : ""
          }`}
        >
          {!isView && (
            <div className="doc-mobile-total">
              <span>Selected Suppliers</span>
              <strong>{form.supplierIds.length}</strong>
            </div>
          )}

          <div className="doc-mobile-actions">
            {actionButtons}
          </div>
        </div>
      </form>

      <ConfirmModal
        open={Boolean(action)}
        type={modalType}
        icon={ACTION_ICONS[action]}
        confirmIcon={ACTION_ICONS[action]}
        title={ACTIONS[action]?.title || ""}
        message={ACTIONS[action]?.message || ""}
        confirmText={ACTIONS[action]?.button}
        cancelText="Back"
        loading={actionLoading}
        loadingText="Processing..."
        onCancel={closeAction}
        onConfirm={confirmAction}
      >
        {ACTIONS[action]?.field && (
          <Textarea
            label={ACTIONS[action].label}
            value={actionReason}
            onChange={(event) =>
              setActionReason(event.target.value)
            }
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
          uncertainResult
            ? "Verify save result?"
            : "Discard unsaved changes?"
        }
        message={
          uncertainResult
            ? "The save result is uncertain. Open the RFQ list to verify whether it was saved."
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

const HEX_ID = /^[a-f\d]{24}$/i;

// Accepts a populated user object ({ name }) or a plain string.
// A raw ObjectId string is not a readable name, so it returns "".
const getUserName = (value) => {
  if (!value) return "";

  if (typeof value === "string") {
    return HEX_ID.test(value) ? "" : value;
  }

  return (
    value.name ||
    value.fullName ||
    value.username ||
    value.email ||
    ""
  );
};

function WorkflowPanel({ document }) {
  const steps = [
    {
      key: "created",
      label: "Created",
      by: document.createdBy,
      at: document.createdAt,
    },
    {
      key: "approved",
      label: "Approved",
      by: document.approvedBy,
      at: document.approvedAt,
    },
    {
      key: "issued",
      label: "Issued",
      by: document.issuedBy,
      at: document.issuedAt,
    },
    {
      key: "closed",
      label: "Closed",
      by: document.closedBy,
      at: document.closedAt,
    },
    {
      key: "cancelled",
      label: "Cancelled",
      by: document.cancelledBy,
      at: document.cancelledAt,
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
            className={`rfqu-workflow-step ${
              step.danger ? "is-danger" : ""
            }`}
          >
            <span className="rfqu-workflow-dot" />

            <div>
              <strong>{step.label}</strong>

              <span>
                {getUserName(step.by)
                  ? `by ${getUserName(step.by)}`
                  : "by —"}
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