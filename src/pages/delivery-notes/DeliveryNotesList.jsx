import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useNavigate } from "react-router-dom";

import { Plus, X, Truck, PackageCheck, Ban, FileText } from "lucide-react";

import toast from "react-hot-toast";

import DataList from "../../components/common/DataList/DataList";
import StatusField from "../../components/common/StatusField/StatusField";
import ConfirmModal from "../../components/common/ConfirmModal/ConfirmModal";

import Input from "../../components/common/Form/Input";
import Textarea from "../../components/common/Form/Textarea";
import Button from "../../components/common/Form/Button";

import api from "../../services/api";

import "./delivery-notes-list.css";
import routes from "../../config/routes";

const DEFAULT_CREATE_PATH = "/sales/delivery-notes/create";

const STATUS_LABELS = {
  CREATED: "Created",
  DISPATCHED: "Dispatched",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const STATUSES = Object.keys(STATUS_LABELS);

const ACTIONS = {
  dispatch: {
    title: "Dispatch Delivery Note",
    label: "Dispatch",
    permission: "deliveryNote.dispatch",
    allowed: "CREATED",
    Icon: Truck,
    description:
      "Dispatch deducts stock for inventory-tracked Goods. Ensure the same shipment is not also deducted through an invoice.",
  },

  deliver: {
    title: "Record Delivery",
    label: "Mark Delivered",
    permission: "deliveryNote.deliver",
    allowed: "DISPATCHED",
    Icon: PackageCheck,
    description:
      "Record who received the shipment. This does not create an invoice or collect payment.",
  },

  cancel: {
    title: "Cancel Delivery Note",
    label: "Cancel Note",
    permission: "deliveryNote.cancel",
    allowed: "CREATED",
    Icon: Ban,
    description:
      "Only created notes can be cancelled. Dispatched goods require a separate return or reversal workflow.",
  },
};

const FILTERS = [
  {
    key: "status",
    label: "Status",
    type: "select",
    options: STATUSES,
  },
];

const QUICK_FILTERS = [
  {
    key: "status",
    value: "",
    label: "All",
  },
  ...STATUSES.map((status) => ({
    key: "status",
    value: status,
    label: STATUS_LABELS[status],
  })),
];

const formatDate = (value, includeTime = false) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",

    ...(includeTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
        }
      : {
          timeZone: "UTC",
        }),
  });
};

const getErrors = (error) => {
  const body = error?.response?.data;

  if (Array.isArray(body?.errors) && body.errors.length) {
    return body.errors
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.message || item?.msg || String(item),
      )
      .join(", ");
  }

  return body?.message || error?.message || "Unable to complete the request.";
};

const assertSuccess = (response) => {
  if (response?.data?.success !== true) {
    throw new Error(response?.data?.message || "Request failed");
  }
};

const extractNote = (response) => {
  assertSuccess(response);

  const note = response.data.data;

  if (!note?._id || !note.deliveryNoteNumber) {
    throw new Error("Invalid Delivery Note response");
  }

  return note;
};

const extractList = (response) => {
  assertSuccess(response);

  if (!Array.isArray(response.data.data)) {
    throw new Error("Invalid Delivery Note list response");
  }

  return response.data.data;
};

const assertVersion = (note) => {
  if (!Number.isSafeInteger(note.__v) || note.__v < 0) {
    throw new Error("Document version is missing. Refresh the list.");
  }
};

const emptyDeleteState = () => ({
  open: false,
  note: null,
});
function DeliveryNoteDialog({ note, mode, loading, error, onClose, onSubmit }) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);

  const [remarks, setRemarks] = useState("");
  const [recipient, setRecipient] = useState("");
  const [phone, setPhone] = useState("");

  const config = mode === "view" ? null : ACTIONS[mode];
  const Icon = config?.Icon || FileText;

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;

      if (previousFocus?.isConnected) {
        previousFocus.focus?.();
      }
    };
  }, []);

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      if (!loading) onClose();
      return;
    }

    if (event.key !== "Tab") return;

    const controls = Array.from(
      dialogRef.current?.querySelectorAll(
        'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
      ) || [],
    );

    if (!controls.length) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }

    const first = controls[0];
    const last = controls[controls.length - 1];
    const current = document.activeElement;

    if (event.shiftKey && (current === first || !controls.includes(current))) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      (current === last || !controls.includes(current))
    ) {
      event.preventDefault();
      first.focus();
    }
  };

  const submit = (event) => {
    event.preventDefault();

    if (loading || !config) return;

    const cleanedRemarks = remarks.trim();
    const cleanedRecipient = recipient.trim();

    if (mode === "cancel" && !cleanedRemarks) return;
    if (mode === "deliver" && !cleanedRecipient) return;

    void onSubmit({
      remarks: cleanedRemarks,
      recipient: cleanedRecipient,
      phone: phone.trim(),
    });
  };

  return (
    <div
      className="dnl-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <section
        ref={dialogRef}
        className={`dnl-modal ${mode === "view" ? "dnl-modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dnl-dialog-title"
        aria-busy={loading}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <header className="dnl-modal-header">
          <div className="dnl-modal-heading">
            <span className="dnl-heading-icon">
              <Icon size={21} />
            </span>

            <div>
              <h2 id="dnl-dialog-title">
                {config?.title || "Delivery Note Details"}
              </h2>

              <p>{note.deliveryNoteNumber}</p>
            </div>
          </div>

          <button
            ref={closeRef}
            type="button"
            className="dnl-close"
            aria-label="Close dialog"
            disabled={loading}
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </header>

        <form className="dnl-modal-form" onSubmit={submit}>
          <div className="dnl-modal-body">
            <div className="dnl-detail-grid">
              <div>
                <span>Customer</span>
                <strong>{note.customerName}</strong>
                <small>{note.customerCode}</small>
              </div>

              <div>
                <span>Status</span>
                <StatusField value={note.status} />
              </div>

              <div>
                <span>Note Date</span>
                <strong>{formatDate(note.deliveryDate)}</strong>
              </div>

              <div>
                <span>Expected Delivery</span>
                <strong>{formatDate(note.expectedDeliveryDate)}</strong>
              </div>

              <div>
                <span>Sales Order</span>
                <strong>{note.sourceSalesOrderNumber || "Standalone"}</strong>
              </div>

              <div>
                <span>Shipping Address</span>
                <strong>{note.shippingAddress || "—"}</strong>
              </div>
            </div>

            <div className="dnl-table-wrap">
              <table className="dnl-items-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Inventory</th>
                  </tr>
                </thead>

                <tbody>
                  {(note.items || []).map((item, index) => (
                    <tr key={item.lineId || index}>
                      <td>
                        <strong>{item.productName}</strong>
                        <small>{item.productCode}</small>
                      </td>

                      <td>
                        {item.quantity} {item.unit}
                      </td>

                      <td>{item.trackInventory ? "Tracked" : "Not tracked"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {mode === "view" ? (
              <>
                <div className="dnl-detail-grid dnl-extra-details">
                  {[
                    ["GSTIN", note.customerGstNo],
                    ["Contact", note.contactPerson],
                    ["Phone", note.contactPhone],
                    ["Billing Address", note.billingAddress],
                    ["Transporter", note.transporterName],
                    ["Vehicle", note.vehicleNumber],
                    ["Tracking Number", note.trackingNumber],
                    ["Transport Document", note.transportDocumentNumber],
                    ["E-Way Bill Reference", note.eWayBillNumber],
                    [
                      "Dispatched",
                      note.dispatchedAt
                        ? formatDate(note.dispatchedAt, true)
                        : null,
                    ],
                    [
                      "Delivered",
                      note.deliveredAt
                        ? formatDate(note.deliveredAt, true)
                        : null,
                    ],
                    ["Received By", note.receivedByName],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <strong>{value || "—"}</strong>
                    </div>
                  ))}
                </div>

                {[
                  ["Notes", note.notes],
                  ["Terms & Conditions", note.termsAndConditions],
                  ["Dispatch Remarks", note.dispatchRemarks],
                  ["Delivery Remarks", note.deliveryRemarks],
                  ["Cancellation Reason", note.cancellationReason],
                ]
                  .filter(([, value]) => Boolean(value))
                  .map(([label, value]) => (
                    <div className="dnl-text-block" key={label}>
                      <h3>{label}</h3>
                      <p>{value}</p>
                    </div>
                  ))}
              </>
            ) : (
              <div className="dnl-action-fields">
                <p className="dnl-information">{config.description}</p>

                {mode === "deliver" && (
                  <div className="dnl-detail-grid">
                    <Input
                      label="Recipient Name"
                      name="receivedByName"
                      value={recipient}
                      onChange={(event) => setRecipient(event.target.value)}
                      maxLength={150}
                      required
                      disabled={loading}
                    />

                    <Input
                      label="Recipient Phone"
                      name="receivedByPhone"
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      maxLength={30}
                      disabled={loading}
                    />
                  </div>
                )}

                <Textarea
                  label={
                    mode === "cancel"
                      ? "Cancellation Reason"
                      : mode === "dispatch"
                        ? "Dispatch Remarks"
                        : "Delivery Remarks"
                  }
                  name="remarks"
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  rows={4}
                  maxLength={1000}
                  required={mode === "cancel"}
                  disabled={loading}
                />
              </div>
            )}

            {error && (
              <div className="dnl-error" role="alert">
                {error}
              </div>
            )}
          </div>

          <footer className="dnl-modal-footer">
            <Button variant="secondary" disabled={loading} onClick={onClose}>
              {mode === "view" ? "Close" : "Back"}
            </Button>

            {config && (
              <Button
                type="submit"
                icon={Icon}
                variant={mode === "cancel" ? "danger" : "primary"}
                loading={loading}
                disabled={
                  loading ||
                  (mode === "cancel" && !remarks.trim()) ||
                  (mode === "deliver" && !recipient.trim())
                }
              >
                {config.label}
              </Button>
            )}
          </footer>
        </form>
      </section>
    </div>
  );
}

/* ==========================================
   LIST
   ========================================== */

function DeliveryNotesList() {
  const navigate = useNavigate();

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [readingId, setReadingId] = useState(null);

  const [dialog, setDialog] = useState(null);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [dialogError, setDialogError] = useState("");

  const [deleteState, setDeleteState] = useState(emptyDeleteState);

  const [deleteLoading, setDeleteLoading] = useState(false);

  const mountedRef = useRef(false);
  const listRequestRef = useRef(0);
  const readRequestRef = useRef(0);
  const mutationLockRef = useRef(false);

  const busy = dialogLoading || deleteLoading;

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      listRequestRef.current += 1;
      readRequestRef.current += 1;
    };
  }, []);

  const replaceNote = useCallback((updated) => {
    // Invalidate older list responses.
    listRequestRef.current += 1;
    setLoading(false);

    setNotes((previous) =>
      previous.map((note) => (note._id === updated._id ? updated : note)),
    );
  }, []);

  /* ==========================================
     LOAD ALL BACKEND PAGES

     DataList handles client-side filtering,
     sorting, and pagination.
     ========================================== */

  const loadNotes = useCallback(async () => {
    const requestId = ++listRequestRef.current;

    setLoading(true);
    setLoadError("");

    try {
      const first = await api.deliveryNote.getAll({
        page: 1,
        limit: 100,
      });

      const records = [...extractList(first)];

      const pages = Math.max(1, Number(first.data.pagination?.totalPages) || 1);

      for (let page = 2; page <= pages; page += 1) {
        if (!mountedRef.current || requestId !== listRequestRef.current) {
          return;
        }

        const response = await api.deliveryNote.getAll({
          page,
          limit: 100,
        });

        records.push(...extractList(response));
      }

      if (!mountedRef.current || requestId !== listRequestRef.current) {
        return;
      }

      setNotes(
        Array.from(new Map(records.map((note) => [note._id, note])).values()),
      );
    } catch (error) {
      if (mountedRef.current && requestId === listRequestRef.current) {
        const message = getErrors(error);

        setLoadError(message);
        toast.error(message);
      }
    } finally {
      if (mountedRef.current && requestId === listRequestRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  /* ==========================================
     VIEW / OPEN ACTION DIALOG
     ========================================== */

  const openDialog = useCallback(
    async (row, mode) => {
      if (mutationLockRef.current) {
        return;
      }

      const config = mode === "view" ? null : ACTIONS[mode];

      if (mode !== "view" && !config) {
        toast.error("Unsupported action");
        return;
      }

      const requestId = ++readRequestRef.current;

      setReadingId(row._id);

      try {
        const response = await api.deliveryNote.getByNumber(
          row.deliveryNoteNumber,
        );

        const latest = extractNote(response);

        if (!mountedRef.current || requestId !== readRequestRef.current) {
          return;
        }

        replaceNote(latest);

        if (config && latest.status !== config.allowed) {
          toast.error("The note status changed. Review the updated row.");
          return;
        }

        if (config) {
          assertVersion(latest);
        }

        setDialogError("");

        setDialog({
          note: latest,
          mode,
          key: `${latest._id}-${mode}-${requestId}`,
        });
      } catch (error) {
        if (mountedRef.current && requestId === readRequestRef.current) {
          toast.error(getErrors(error));
        }
      } finally {
        if (mountedRef.current && requestId === readRequestRef.current) {
          setReadingId(null);
        }
      }
    },
    [replaceNote],
  );

  const closeDialog = () => {
    if (mutationLockRef.current) {
      return;
    }

    readRequestRef.current += 1;
    setDialog(null);
    setDialogError("");
  };

  /* ==========================================
     DISPATCH / DELIVER / CANCEL
     ========================================== */

  const submitAction = async ({ remarks, recipient, phone }) => {
    if (mutationLockRef.current || !dialog) {
      return;
    }

    const { note, mode } = dialog;
    const config = ACTIONS[mode];

    if (!config) {
      setDialogError("Unsupported action");
      return;
    }

    const cleanedRemarks = String(remarks ?? "").trim();
    const cleanedRecipient = String(recipient ?? "").trim();
    const cleanedPhone = String(phone ?? "").trim();

    if (mode === "cancel" && !cleanedRemarks) {
      setDialogError("Cancellation reason is required");
      return;
    }

    if (mode === "deliver" && !cleanedRecipient) {
      setDialogError("Recipient name is required");
      return;
    }

    mutationLockRef.current = true;
    listRequestRef.current += 1;

    setLoading(false);
    setDialogLoading(true);
    setDialogError("");

    try {
      assertVersion(note);

      let response;

      switch (mode) {
        case "dispatch":
          response = await api.deliveryNote.dispatch(note.deliveryNoteNumber, {
            version: note.__v,
            dispatchRemarks: cleanedRemarks || null,
          });
          break;

        case "deliver":
          response = await api.deliveryNote.deliver(note.deliveryNoteNumber, {
            version: note.__v,
            receivedByName: cleanedRecipient,
            receivedByPhone: cleanedPhone || null,
            deliveryRemarks: cleanedRemarks || null,
          });
          break;

        case "cancel":
          response = await api.deliveryNote.cancel(note.deliveryNoteNumber, {
            version: note.__v,
            cancellationReason: cleanedRemarks,
          });
          break;

        default:
          throw new Error("Unsupported action");
      }

      const updated = extractNote(response);

      if (mountedRef.current) {
        replaceNote(updated);
        setDialog(null);

        toast.success(
          response.data.message || "Delivery Note updated successfully",
        );
      }
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }

      const message = getErrors(error);
      setDialogError(message);

      // Reconcile a stale version or uncertain result.
      try {
        const response = await api.deliveryNote.getByNumber(
          note.deliveryNoteNumber,
        );

        const latest = extractNote(response);

        if (!mountedRef.current) {
          return;
        }

        replaceNote(latest);

        if (latest.status !== config.allowed) {
          setDialog(null);

          toast(
            `${latest.deliveryNoteNumber} is now ${
              STATUS_LABELS[latest.status] || latest.status
            }.`,
          );
        } else {
          setDialog((current) =>
            current ? { ...current, note: latest } : current,
          );

          if (latest.__v !== note.__v) {
            setDialogError(
              "This note changed. Review the updated details before submitting again.",
            );
          }
        }
      } catch {
        // Preserve the original action error.
      }
    } finally {
      mutationLockRef.current = false;

      if (mountedRef.current) {
        setDialogLoading(false);
      }
    }
  };

  /* ==========================================
     SOFT DELETE
     ========================================== */

  const handleDelete = useCallback((row) => {
    if (mutationLockRef.current) {
      return;
    }

    if (row.status !== "CREATED") {
      toast.error("Only created Delivery Notes can be deleted");
      return;
    }

    try {
      assertVersion(row);

      setDeleteState({
        open: true,
        note: row,
      });
    } catch (error) {
      toast.error(getErrors(error));
    }
  }, []);

  const confirmDelete = async () => {
    if (mutationLockRef.current || !deleteState.note) {
      return;
    }

    const note = deleteState.note;

    mutationLockRef.current = true;
    listRequestRef.current += 1;

    setLoading(false);
    setDeleteLoading(true);

    try {
      assertVersion(note);

      const response = await api.deliveryNote.delete(
        note.deliveryNoteNumber,
        note.__v,
      );

      assertSuccess(response);

      if (mountedRef.current) {
        setNotes((previous) =>
          previous.filter((item) => item._id !== note._id),
        );

        setDeleteState(emptyDeleteState());

        toast.success(`${note.deliveryNoteNumber} deleted successfully`);
      }
    } catch (error) {
      if (mountedRef.current) {
        setDeleteState(emptyDeleteState());
        toast.error(getErrors(error));
        await loadNotes();
      }
    } finally {
      mutationLockRef.current = false;

      if (mountedRef.current) {
        setDeleteLoading(false);
      }
    }
  };

  /* ==========================================
     COLUMNS
     ========================================== */

  const columns = useMemo(
    () => [
      {
        key: "deliveryNoteNumber",
        label: "Delivery Note",
        sortable: true,
      },

      {
        key: "customerName",
        label: "Customer",
        sortable: true,

        render: (value, row) => (
          <div className="dl-customer">
            <strong>{value}</strong>
            <span>{row.customerCode}</span>
          </div>
        ),
      },

      {
        key: "deliveryDate",
        label: "Note Date",
        sortable: true,
        render: (value) => formatDate(value),
      },

      {
        key: "expectedDeliveryDate",
        label: "Expected Delivery",
        sortable: true,
        render: (value) => formatDate(value),
      },

      {
        key: "sourceSalesOrderNumber",
        label: "Sales Order",
        sortable: true,

        render: (value) =>
          value || <span className="dl-muted-value">Standalone</span>,
      },

      {
        key: "status",
        label: "Status",
        sortable: true,

        render: (value) => <StatusField value={value} />,
      },

      {
        key: "vehicleNumber",
        label: "Vehicle",
        sortable: true,
        render: (value) => value || "—",
      },

      {
        key: "workflow",
        label: "Next Actions",
        sortable: false,

        render: (_value, row) => {
          const available = Object.entries(ACTIONS).filter(
            ([, config]) => row.status === config.allowed,
          );

          return (
            <div className="dnl-row-actions">
              {available.map(([mode, config]) => {
                const Icon = config.Icon;

                return (
                  <button
                    key={mode}
                    type="button"
                    className={`dnl-action ${
                      mode === "cancel" ? "is-danger" : ""
                    }`}
                    disabled={busy || readingId === row._id}
                    onClick={(event) => {
                      event.stopPropagation();
                      void openDialog(row, mode);
                    }}
                  >
                    <Icon size={14} />
                    {config.label}
                  </button>
                );
              })}

              {!available.length && (
                <span className="dl-muted-value">No further actions</span>
              )}
            </div>
          );
        },
      },

      {
        key: "transporterName",
        label: "Transporter",
        sortable: true,
        visible: false,
      },

      {
        key: "trackingNumber",
        label: "Tracking Number",
        sortable: true,
        visible: false,
      },

      {
        key: "receivedByName",
        label: "Received By",
        sortable: true,
        visible: false,
      },
    ],
    [busy, readingId, openDialog],
  );

  return (
    <>
      {loadError && (
        <div
          className="dnl-error"
          role="alert"
          style={{ margin: "14px 20px 0" }}
        >
          Unable to load Delivery Notes: {loadError}
        </div>
      )}

      <DataList
        title="Delivery Notes"
        subtitle="Manage shipments and delivery acknowledgments"
        columns={columns}
        data={notes}
        loading={loading}
        rowKey="_id"
        showCase="list"
        searchable
        filterable
        sortable
        columnVisibility
        pagination
        filters={FILTERS}
        quickFilters={QUICK_FILTERS}
        storageKey="trustiq-delivery-notes"
        searchPlaceholder="Search note, customer, order, vehicle..."
        actions={{
          view: (row) => {
            if (!busy) {
              void openDialog(row, "view");
            }
          },

          delete: (row) => {
            if (!busy) {
              handleDelete(row);
            }
          },
        }}
        onRefresh={() => {
          if (!mutationLockRef.current) {
            void loadNotes();
          }
        }}
        addButton={
          <Button
            icon={Plus}
            disabled={busy}
            onClick={() => navigate(routes.sales.createDelivery)}
          >
            New Delivery Note
          </Button>
        }
      />

      {dialog && (
        <DeliveryNoteDialog
          key={dialog.key}
          note={dialog.note}
          mode={dialog.mode}
          loading={dialogLoading}
          error={dialogError}
          onClose={closeDialog}
          onSubmit={submitAction}
        />
      )}

      <ConfirmModal
        open={deleteState.open}
        type="danger"
        title="Delete Delivery Note?"
        message={
          deleteState.note
            ? `${deleteState.note.deliveryNoteNumber} will be soft-deleted. Only created notes can be deleted.`
            : ""
        }
        confirmText="Delete Note"
        cancelText="Back"
        loading={deleteLoading}
        onCancel={() => {
          if (!mutationLockRef.current) {
            setDeleteState(emptyDeleteState());
          }
        }}
        onConfirm={confirmDelete}
      />
    </>
  );
}

export default DeliveryNotesList;
