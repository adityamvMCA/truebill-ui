import { useEffect, useMemo, useRef, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import {
  ArrowLeft,
  Ban,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Plus,
  Save,
  StickyNote,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

import toast from "react-hot-toast";

import api from "../../services/api";

import Input from "../../components/common/Form/Input";
import Select from "../../components/common/Form/Select";
import Textarea from "../../components/common/Form/Textarea";
import Button from "../../components/common/Form/Button";
import StatusField from "../../components/common/StatusField/StatusField";
// Adjust this path to where your ConfirmModal lives
import ConfirmModal from "../../components/common/ConfirmModal/ConfirmModal";

import {
  PRIORITIES,
  REQUISITION_BASE,
  dateValue,
  fetchAllPages,
  formatDate,
  formatQuantity,
  getDocument,
  getErrorMessage,
  getId,
  localDate,
  quantityIsValid,
  requisitionPath,
} from "./purchaseRequisition.utils";

import "../../styles/invoice-common1.css";
import "./PurchaseRequisitions.css";

let rowCounter = 0;

const newItem = () => ({
  rowId: `preq-item-${++rowCounter}`,
  productId: "",
  quantity: "1",
  specification: "",
});

const initialForm = () => ({
  requisitionDate: localDate(),
  requiredByDate: "",
  department: "",
  purpose: "",
  priority: "NORMAL",
  notes: "",
});

const mapItems = (records = []) =>
  records.map((item) => ({
    ...item,
    rowId: `preq-item-${++rowCounter}`,
    productId: getId(item.productId),
    quantity: String(item.quantity),
    specification: item.specification || "",
  }));

/* Each action maps straight onto ConfirmModal props */
const ACTION_CONFIG = {
  approve: {
    type: "success",
    icon: CheckCircle2,
    confirmIcon: Check,
    title: "Approve requisition?",
    message: "This purchase requirement will be approved.",
    confirmText: "Approve",
    cancelText: "Go Back",
    success: "Purchase Requisition approved successfully.",
  },

  reject: {
    type: "danger",
    icon: XCircle,
    confirmIcon: X,
    title: "Reject requisition?",
    message: "Tell the requester why this requisition is rejected.",
    confirmText: "Reject",
    cancelText: "Go Back",
    field: "rejectionReason",
    label: "Rejection Reason",
    success: "Purchase Requisition rejected successfully.",
  },

  cancel: {
    type: "warning",
    icon: Ban,
    confirmIcon: Ban,
    title: "Cancel requisition?",
    message: "Tell the team why this requisition is cancelled.",
    confirmText: "Cancel Requisition",
    cancelText: "Go Back",
    field: "cancellationReason",
    label: "Cancellation Reason",
    success: "Purchase Requisition cancelled successfully.",
  },
};

function PurchaseRequisitionPage({ mode = "create" }) {
  const navigate = useNavigate();
  const params = useParams();

  const requisitionNumber = params.requisitionNumber || params.id;

  const isCreate = mode === "create";
  const isEdit = mode === "edit";
  const isView = mode === "view";

  const [form, setForm] = useState(initialForm);
  const [items, setItems] = useState(() => [newItem()]);
  const [products, setProducts] = useState([]);
  const [document, setDocument] = useState(null);

  const [loading, setLoading] = useState(true);
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
  const actionLock = useRef(false);

  const activeAction = ACTION_CONFIG[action];

  const editable = isCreate || (isEdit && document?.status === "CREATED");

  const disabled =
    loading ||
    loadFailed ||
    saving ||
    actionLoading ||
    uncertainResult ||
    !editable;

  useEffect(() => {
    let cancelled = false;

    const loadPage = async () => {
      setLoading(true);
      setLoadFailed(false);
      setError("");
      setDocument(null);
      setDirty(false);
      setUncertainResult(false);
      setAction("");
      setActionReason("");
      setLeaveOpen(false);

      try {
        const [productRecords, response] = await Promise.all([
          isView
            ? Promise.resolve([])
            : fetchAllPages(api.purchaseRequisition.getProducts, "products"),

          isCreate
            ? Promise.resolve(null)
            : api.purchaseRequisition.getByNumber(requisitionNumber),
        ]);

        if (cancelled) return;

        setProducts(productRecords);

        if (isCreate) {
          setForm(initialForm());
          setItems([newItem()]);
          setShowNotes(false);
        } else {
          const record = getDocument(response);

          if (!record?._id || !Number.isSafeInteger(record.__v)) {
            throw new Error("The server did not return a valid requisition.");
          }

          setDocument(record);

          setForm({
            requisitionDate: dateValue(record.requisitionDate),
            requiredByDate: dateValue(record.requiredByDate),
            department: record.department || "",
            purpose: record.purpose || "",
            priority: record.priority || "NORMAL",
            notes: record.notes || "",
          });

          setItems(mapItems(record.items));
          setShowNotes(Boolean(record.notes));

          if (isEdit && record.status !== "CREATED") {
            setError(
              "This requisition is no longer editable. Open it in view mode.",
            );
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
    };
  }, [isCreate, isEdit, isView, requisitionNumber, reloadKey]);

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

  const uniqueProductCount = new Set(
    items.map((item) => item.productId).filter(Boolean),
  ).size;

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

  const selectProduct = (rowId, productId) => {
    if (disabled) return;

    const product = productMap.get(productId);

    setItems((previous) =>
      previous.map((item) =>
        item.rowId === rowId
          ? {
              ...item,

              lineId: item.productId === productId ? item.lineId : undefined,

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
    if (!form.requisitionDate) {
      throw new Error("Requisition date is required.");
    }

    if (form.requiredByDate && form.requiredByDate < form.requisitionDate) {
      throw new Error("Required-by date cannot precede requisition date.");
    }

    if (!form.purpose.trim()) {
      throw new Error("Purchase purpose is required.");
    }

    if (!items.length || items.length > 200) {
      throw new Error("Provide between 1 and 200 items.");
    }

    items.forEach((item, index) => {
      const product = productMap.get(item.productId);

      if (!product || product.status !== "ACTIVE" || product.isDeleted) {
        throw new Error(`Select an active product for item ${index + 1}.`);
      }

      if (!quantityIsValid(item.quantity)) {
        throw new Error(
          `Enter a valid quantity with at most three decimals for item ${index + 1}.`,
        );
      }
    });
  };

  const saveRequisition = async () => {
    if (disabled || submitLock.current) return;

    let payload;

    try {
      validateForm();

      payload = {
        requisitionDate: form.requisitionDate,
        requiredByDate: form.requiredByDate || null,
        department: form.department.trim() || null,
        purpose: form.purpose.trim(),
        priority: form.priority,
        notes: form.notes.trim() || null,

        items: items.map((item) => ({
          ...(item.lineId ? { lineId: item.lineId } : {}),
          productId: item.productId,
          quantity: Number(item.quantity),
          specification: item.specification.trim() || null,
        })),

        ...(isEdit ? { version: document.__v } : {}),
      };
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
        ? await api.purchaseRequisition.update(
            document.requisitionNumber,
            payload,
          )
        : await api.purchaseRequisition.create(payload);

      saved = getDocument(response);

      if (!saved?.requisitionNumber) {
        throw new Error(
          "The server did not return a requisition number. Check the list before submitting again.",
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
        ? "Purchase Requisition updated successfully."
        : "Purchase Requisition created successfully.",
    );

    navigate(requisitionPath(saved.requisitionNumber), { replace: true });
  };

  const openAction = (name) => {
    setAction(name);
    setActionReason("");
  };

  const closeAction = () => {
    if (actionLock.current) return;

    setAction("");
    setActionReason("");
  };

  const confirmAction = async () => {
    if (actionLock.current || !document || !activeAction) {
      return;
    }

    if (activeAction.field && !actionReason.trim()) {
      toast.error(`${activeAction.label} is required.`);
      return;
    }

    try {
      actionLock.current = true;
      setActionLoading(true);

      const payload = {
        version: document.__v,

        ...(activeAction.field
          ? { [activeAction.field]: actionReason.trim() }
          : {}),
      };

      const response = await api.purchaseRequisition[action](
        document.requisitionNumber,
        payload,
      );

      const updated = getDocument(response);

      if (!updated?.requisitionNumber) {
        throw new Error("Reload the requisition to verify its current status.");
      }

      setDocument(updated);
      setAction("");
      setActionReason("");
      setError("");

      toast.success(activeAction.success);
    } catch (requestError) {
      toast.error(getErrorMessage(requestError));
      setAction("");
      setReloadKey((value) => value + 1);
    } finally {
      actionLock.current = false;
      setActionLoading(false);
    }
  };

  /* Uses ConfirmModal instead of window.confirm, which is unreliable in
     Capacitor WebViews (especially iOS). */
  const exitPage = () => {
    if (submitLock.current || actionLock.current) return;

    if (dirty || uncertainResult) {
      setLeaveOpen(true);
      return;
    }

    navigate(REQUISITION_BASE);
  };

  const confirmLeave = () => {
    setLeaveOpen(false);
    navigate(REQUISITION_BASE);
  };

  const saveButton = (
    <Button
      type="button"
      icon={Save}
      onClick={saveRequisition}
      disabled={disabled}
      loading={saving}
    >
      {saving
        ? "Saving..."
        : isEdit
          ? "Update Requisition"
          : "Create Requisition"}
    </Button>
  );

  const statusActions =
    isView && document?.status === "CREATED" ? (
      <>
        <Button
          type="button"
          variant="secondary"
          disabled={actionLoading}
          onClick={() =>
            navigate(requisitionPath(document.requisitionNumber, "edit"))
          }
        >
          Edit
        </Button>

        <Button
          type="button"
          variant="secondary"
          icon={X}
          disabled={actionLoading}
          onClick={() => openAction("reject")}
        >
          Reject
        </Button>

        <Button
          type="button"
          variant="secondary"
          disabled={actionLoading}
          onClick={() => openAction("cancel")}
        >
          Cancel Requisition
        </Button>

        <Button
          type="button"
          icon={Check}
          disabled={actionLoading}
          onClick={() => openAction("approve")}
        >
          Approve
        </Button>
      </>
    ) : null;

  return (
    <div
      className={`doc-page preq-document-page ${
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
              disabled={saving || actionLoading}
              onClick={exitPage}
            >
              Back
            </Button>

            <div className="doc-title">
              <ClipboardList size={19} />

              <span>
                {isView
                  ? document?.requisitionNumber || "Purchase Requisition"
                  : isEdit
                    ? "Edit Purchase Requisition"
                    : "Create Purchase Requisition"}
              </span>
            </div>
          </div>

          <div className="doc-header-actions">
            {document && <StatusField value={document.status} />}

            {isView ? (
              <>
                {statusActions}

                <Button
                  type="button"
                  variant="secondary"
                  disabled={loading || actionLoading}
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
                Loading requisition information...
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
                    Check Requisitions
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
                <h2 className="doc-panel-title">Purchase Requirement</h2>

                <Textarea
                  label="Purpose"
                  name="purpose"
                  value={form.purpose}
                  onChange={changeField}
                  rows={4}
                  maxLength={1000}
                  placeholder="Explain why these products or services are required..."
                  required
                />

                <div className="preq-requirement-note">
                  <ClipboardList size={18} />

                  <span>
                    This requisition records an internal requirement. It does
                    not update stock, create supplier dues, or post a journal.
                  </span>
                </div>

                {document?.status === "APPROVED" && (
                  <div className="preq-approved-message">
                    Approved and available as a source for requisition-based RFQ
                    creation.
                  </div>
                )}
              </div>

              <div className="doc-panel">
                <h2 className="doc-panel-title">Requisition Details</h2>

                <div className="doc-fields-grid">
                  <Input
                    label="Requisition Number"
                    value={
                      document?.requisitionNumber || "Generated after creation"
                    }
                    readOnly
                  />

                  <Input
                    label="Requisition Date"
                    name="requisitionDate"
                    type="date"
                    value={form.requisitionDate}
                    onChange={changeField}
                    required
                  />

                  <Input
                    label="Required By"
                    name="requiredByDate"
                    type="date"
                    value={form.requiredByDate}
                    min={form.requisitionDate}
                    onChange={changeField}
                  />

                  <Select
                    label="Priority"
                    name="priority"
                    value={form.priority}
                    options={PRIORITIES}
                    onChange={changeField}
                    required
                  />

                  <div className="preq-full-width">
                    <Input
                      label="Department"
                      name="department"
                      value={form.department}
                      onChange={changeField}
                      maxLength={100}
                      placeholder="Administration, Maintenance, Academics..."
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="doc-items">
              <div className="doc-table-wrap">
                <table className="doc-table preq-items-table">
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Product / Service</th>
                      <th>Type</th>
                      <th>Unit</th>
                      <th>Quantity</th>
                      <th>Specification</th>
                      {!isView && <th>Remove</th>}
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
                            `${
                              record.name || record.productCode || getId(record)
                            }` +
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
                              <div className="preq-document-cell">
                                <strong>{item.productName || "—"}</strong>

                                <span>{item.productCode || "—"}</span>
                              </div>
                            ) : (
                              <Select
                                value={item.productId}
                                options={options}
                                placeholder="Select product or service"
                                aria-label={`Product ${index + 1}`}
                                onChange={(event) =>
                                  selectProduct(item.rowId, event.target.value)
                                }
                              />
                            )}
                          </td>

                          <td data-label="Type">
                            {item.productType || product?.type || "—"}
                          </td>

                          <td data-label="Unit">
                            {item.unit || product?.unit || "—"}
                          </td>

                          <td data-label="Quantity">
                            {isView ? (
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
                            {isView ? (
                              <span className="preq-specification">
                                {item.specification || "—"}
                              </span>
                            ) : (
                              <Input
                                value={item.specification}
                                maxLength={1000}
                                placeholder="Size, grade, brand, or requirements"
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

                          {!isView && (
                            <td className="doc-cell-action" data-label="Remove">
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
                      rows={4}
                      maxLength={2000}
                      placeholder="Additional purchase requirements..."
                    />
                  </div>
                )}

                {document?.rejectionReason && (
                  <div className="doc-panel">
                    <h2 className="doc-panel-title">Rejection Reason</h2>

                    <p className="preq-reason">{document.rejectionReason}</p>
                  </div>
                )}

                {document?.cancellationReason && (
                  <div className="doc-panel">
                    <h2 className="doc-panel-title">Cancellation Reason</h2>

                    <p className="preq-reason">{document.cancellationReason}</p>
                  </div>
                )}
              </div>

              <div className="doc-summary">
                <SummaryRow label="Item Lines" value={items.length} />

                <SummaryRow
                  label="Unique Products"
                  value={uniqueProductCount}
                />

                <SummaryRow label="Priority" value={form.priority} />

                <SummaryRow
                  label="Required By"
                  value={formatDate(form.requiredByDate)}
                />

                {document?.approvedAt && (
                  <SummaryRow
                    label="Approved On"
                    value={formatDate(document.approvedAt)}
                  />
                )}

                {document?.rejectedAt && (
                  <SummaryRow
                    label="Rejected On"
                    value={formatDate(document.rejectedAt)}
                  />
                )}

                {document?.cancelledAt && (
                  <SummaryRow
                    label="Cancelled On"
                    value={formatDate(document.cancelledAt)}
                  />
                )}
              </div>
            </section>
          </main>
        </fieldset>

        {!isView && (
          <div className="doc-mobile-bar">
            <div className="doc-mobile-total">
              <span>Requisition Items</span>
              <strong>{items.length}</strong>
            </div>

            <div className="doc-mobile-actions">{saveButton}</div>
          </div>
        )}
      </form>

      {/* Approve / Reject / Cancel */}
      <ConfirmModal
        open={Boolean(activeAction)}
        type={activeAction?.type}
        icon={activeAction?.icon}
        confirmIcon={activeAction?.confirmIcon}
        title={activeAction?.title}
        message={
          activeAction
            ? `${document?.requisitionNumber || ""}${
                document?.requisitionNumber ? " · " : ""
              }${activeAction.message}`
            : ""
        }
        confirmText={activeAction?.confirmText}
        cancelText={activeAction?.cancelText}
        loadingText="Please wait..."
        loading={actionLoading}
        onConfirm={confirmAction}
        onCancel={closeAction}
      >
        {activeAction?.field && (
          <div className="preq-modal-reason">
            <Textarea
              label={activeAction.label}
              value={actionReason}
              onChange={(event) => setActionReason(event.target.value)}
              maxLength={1000}
              rows={4}
              disabled={actionLoading}
              required
            />
          </div>
        )}
      </ConfirmModal>

      {/* Unsaved changes / uncertain save */}
      <ConfirmModal
        open={leaveOpen}
        type="warning"
        title={uncertainResult ? "Verify save result?" : "Discard changes?"}
        message={
          uncertainResult
            ? "Open the requisition list to check whether this requisition was saved."
            : "You have unsaved changes. If you leave now, they will be lost."
        }
        confirmText={uncertainResult ? "Open List" : "Discard & Leave"}
        cancelText="Stay Here"
        onConfirm={confirmLeave}
        onCancel={() => setLeaveOpen(false)}
      />
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

export default PurchaseRequisitionPage;