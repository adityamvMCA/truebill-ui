import { Plus } from "lucide-react";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import DataList from "../../components/common/DataList/DataList";
import StatusField from "../../components/common/StatusField/StatusField";
import ConfirmModal from "../../components/common/ConfirmModal/ConfirmModal";

import api from "../../services/api";

import {
  RFQ_BASE,
  fetchAllPages,
  formatDate,
  getDocument,
  getErrorMessage,
  rfqPath,
} from "./purchaseRfq.utils";

import "./PurchaseRfqs.css";

const HEX_ID = /^[a-f\d]{24}$/i;

// Populated user object ({ name }) or plain string; raw ObjectIds are not names.
const getUserName = (value) => {
  if (!value) return "";

  if (typeof value === "string") {
    return HEX_ID.test(value) ? "" : value;
  }

  return value.name || value.fullName || value.username || value.email || "";
};

function PurchaseRfqsList() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [rfqs, setRfqs] = useState([]);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [actionTarget, setActionTarget] = useState(null);
  const [actionType, setActionType] = useState("");
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const loadSequence = useRef(0);
  const deleteLock = useRef(false);
  const actionLock = useRef(false);
  const mountedRef = useRef(false);

  const loadRfqs = useCallback(async () => {
    const sequence = ++loadSequence.current;

    try {
      setLoading(true);

      const records = await fetchAllPages(api.purchaseRfq.getAll, "rfqs");

      if (sequence !== loadSequence.current) return;

      setRfqs(records);
    } catch (error) {
      if (sequence !== loadSequence.current) return;

      toast.error(getErrorMessage(error));
    } finally {
      if (sequence === loadSequence.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadRfqs();

    return () => {
      mountedRef.current = false;
      loadSequence.current += 1;
    };
  }, [loadRfqs]);

  const handleView = useCallback(
    (row) => {
      if (!row.rfqNumber) {
        toast.error("RFQ number is missing.");
        return;
      }

      navigate(rfqPath(row.rfqNumber));
    },
    [navigate],
  );

  const handleEdit = (row) => {
    if (row.status !== "CREATED") {
      toast.error("Only CREATED RFQs can be edited.");
      return;
    }

    navigate(rfqPath(row.rfqNumber, "edit"));
  };

  const handleDelete = async (row) => {
    if (deleteLock.current) return;

    if (row.status !== "CREATED") {
      toast.error("Only CREATED RFQs can be deleted.");
      return;
    }

    try {
      deleteLock.current = true;

      const response = await api.purchaseRfq.getByNumber(row.rfqNumber);

      const latest = getDocument(response);

      if (
        !latest ||
        latest.status !== "CREATED" ||
        !Number.isSafeInteger(latest.__v)
      ) {
        throw new Error("The RFQ changed. Refresh the list.");
      }

      if (mountedRef.current) {
        setDeleteTarget(latest);
      }
    } catch (error) {
      if (mountedRef.current) {
        toast.error(getErrorMessage(error));
      }
    } finally {
      deleteLock.current = false;
    }
  };

  const confirmDelete = async () => {
    if (deleteLock.current || !deleteTarget) return;

    try {
      deleteLock.current = true;
      setDeleting(true);

      await api.purchaseRfq.delete(deleteTarget.rfqNumber, {
        version: deleteTarget.__v,
      });

      if (!mountedRef.current) return;

      setRfqs((previous) =>
        previous.filter((record) => record._id !== deleteTarget._id),
      );

      setDeleteTarget(null);
      toast.success("RFQ deleted successfully.");
    } catch (error) {
      if (mountedRef.current) {
        toast.error(getErrorMessage(error));
      }
    } finally {
      deleteLock.current = false;

      if (mountedRef.current) {
        setDeleting(false);
      }
    }
  };

  const openAction = async (row, type) => {
    if (actionLock.current) return;

    if (!["approve", "reject"].includes(type)) return;

    if (row.status !== "CREATED") {
      toast.error("Only CREATED RFQs can be approved or rejected.");
      return;
    }

    try {
      actionLock.current = true;

      const response = await api.purchaseRfq.getByNumber(row.rfqNumber);

      const latest = getDocument(response);

      if (
        !latest ||
        latest.status !== "CREATED" ||
        !Number.isSafeInteger(latest.__v)
      ) {
        throw new Error("The RFQ changed. Refresh the list.");
      }

      if (!mountedRef.current) return;

      setActionTarget(latest);
      setActionType(type);
      setActionReason("");
    } catch (error) {
      if (mountedRef.current) {
        toast.error(getErrorMessage(error));
      }
    } finally {
      actionLock.current = false;
    }
  };

  const closeAction = () => {
    if (actionLock.current || actionLoading) return;

    setActionTarget(null);
    setActionType("");
    setActionReason("");
  };

  const confirmAction = async () => {
    if (actionLock.current || !actionTarget || !actionType) return;

    if (actionType === "reject" && !actionReason.trim()) {
      toast.error("Rejection reason is required.");
      return;
    }

    try {
      actionLock.current = true;
      setActionLoading(true);

      const method =
        actionType === "approve"
          ? api.purchaseRfq.approve
          : api.purchaseRfq.reject;

      const response = await method(actionTarget.rfqNumber, {
        version: actionTarget.__v,
        ...(actionType === "reject"
          ? { rejectionReason: actionReason.trim() }
          : {}),
      });

      const updated = getDocument(response);

      if (!mountedRef.current) return;

      setRfqs((previous) =>
        previous.map((record) => {
          if (record._id !== actionTarget._id) return record;

          if (updated?._id) {
            return {
              ...record,
              ...updated,
            };
          }

          return {
            ...record,
            status: actionType === "approve" ? "APPROVED" : "REJECTED",
          };
        }),
      );

      setActionTarget(null);
      setActionType("");
      setActionReason("");

      toast.success(
        actionType === "approve"
          ? "RFQ approved successfully."
          : "RFQ rejected successfully.",
      );
    } catch (error) {
      if (mountedRef.current) {
        toast.error(getErrorMessage(error));
        loadRfqs();
      }
    } finally {
      actionLock.current = false;

      if (mountedRef.current) {
        setActionLoading(false);
      }
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "rfqNumber",
        label: "RFQ Number",
        sortable: true,

        render: (value, row) => (
          <div className="rfqu-document-cell">
            <button
              type="button"
              className="rfqu-document-link"
              onClick={(event) => {
                event.stopPropagation();
                handleView(row);
              }}
            >
              {value || "—"}
            </button>

            <span>{row.sourceRequisitionNumber || "Direct RFQ"}</span>
          </div>
        ),
      },

      {
        key: "rfqDate",
        label: "RFQ Date",
        sortable: true,
        render: formatDate,
      },

      {
        key: "quotationDueDate",
        label: "Quotation Due",
        sortable: true,
        render: formatDate,
      },

      {
        key: "creationMode",
        label: "Source",
        sortable: true,

        render: (value) => (
          <span className="rfqu-source-badge">
            {value === "REQUISITION" ? "Purchase Requisition" : "Direct"}
          </span>
        ),
      },

      {
        key: "supplierIds",
        label: "Suppliers",
        sortable: false,
        render: (value) => value?.length || 0,
      },

      {
        key: "items",
        label: "Item Lines",
        sortable: false,
        render: (value) => value?.length || 0,
      },

      {
        key: "status",
        label: "Status",
        sortable: true,

        render: (value) => <StatusField value={value || "CREATED"} />,
      },
      

      {
        key: "createdBy",
        label: "Created By",
        sortable: false,
        visible: false,
        render: (value) => getUserName(value) || "—",
      },

      {
        key: "approvedBy",
        label: "Approved By",
        sortable: false,
        visible: false,
        render: (value) => getUserName(value) || "—",
      },

      {
        key: "rejectedBy",
        label: "Rejected By",
        sortable: false,
        visible: false,
        render: (value) => getUserName(value) || "—",
      },

      {
        key: "rejectionReason",
        label: "Rejection Reason",
        sortable: false,
        visible: false,
        render: (value) => value || "—",
      },

      {
        key: "cancelledBy",
        label: "Cancelled By",
        sortable: false,
        visible: false,
        render: (value) => getUserName(value) || "—",
      },

      {
        key: "sourceRequisitionNumber",
        label: "Requisition",
        sortable: true,
        visible: false,
        render: (value) => value || "—",
      },

      {
        key: "paymentTerms",
        label: "Payment Terms",
        sortable: true,
        visible: false,
      },

      {
        key: "deliveryTerms",
        label: "Delivery Terms",
        sortable: false,
        visible: false,
      },

      {
        key: "notes",
        label: "Notes",
        sortable: false,
        visible: false,
      },
    ],
    [handleView],
  );

  return (
    <div className="rfqu-list-page">
      <DataList
        title="Requests for Quotation"
        subtitle="Request supplier offers directly or against approved requisitions"
        columns={columns}
        data={rfqs}
        loading={loading}
        rowKey="_id"
        showCase="list"
        searchable
        filterable
        sortable
        selectable
        columnVisibility
        pagination
        storageKey="trustiq-purchase-rfqs"
        searchPlaceholder="Search RFQ, requisition, status..."
        filters={[
          {
            key: "status",
            label: "Status",
            type: "select",
            options: [
              "CREATED",
              "APPROVED",
              "REJECTED",
              "ISSUED",
              "CLOSED",
              "CANCELLED",
            ],
          },
          {
            key: "creationMode",
            label: "Source",
            type: "select",
            options: ["DIRECT", "REQUISITION"],
          },
        ]}
        quickFilters={[
          { key: "status", value: "", label: "All" },
          { key: "status", value: "CREATED", label: "Created" },
          { key: "status", value: "APPROVED", label: "Approved" },
          { key: "status", value: "REJECTED", label: "Rejected" },
          { key: "status", value: "ISSUED", label: "Issued" },
          { key: "status", value: "CLOSED", label: "Closed" },
          { key: "status", value: "CANCELLED", label: "Cancelled" },
        ]}
        actions={{
          view: handleView,
          edit: handleEdit,
          delete: handleDelete,
          approve: (row) => openAction(row, "approve"),
          reject: (row) => openAction(row, "reject"),
        }}
        onRefresh={loadRfqs}
        addButton={
          <button
            type="button"
            className="rfqu-primary-button"
            onClick={() => navigate(`${RFQ_BASE}/create`)}
          >
            <Plus size={16} />
            <span>New RFQ</span>
          </button>
        }
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        type="danger"
        title="Delete RFQ?"
        message={`Delete ${deleteTarget?.rfqNumber || "this RFQ"}?`}
        confirmText="Delete RFQ"
        cancelText="Keep RFQ"
        loading={deleting}
        onCancel={() => {
          if (!deleteLock.current) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={confirmDelete}
      />

      <ConfirmModal
        open={Boolean(actionTarget) && actionType === "approve"}
        type="success"
        title="Approve RFQ?"
        message={`Approve ${
          actionTarget?.rfqNumber || "this RFQ"
        }? Approved RFQs can be marked as issued.`}
        confirmText="Approve RFQ"
        cancelText="Back"
        loading={actionLoading}
        loadingText="Approving..."
        onCancel={closeAction}
        onConfirm={confirmAction}
      />

      <ConfirmModal
        open={Boolean(actionTarget) && actionType === "reject"}
        type="danger"
        title="Reject RFQ?"
        message={`Reject ${
          actionTarget?.rfqNumber || "this RFQ"
        }? Please provide a rejection reason.`}
        confirmText="Reject RFQ"
        cancelText="Back"
        loading={actionLoading}
        loadingText="Rejecting..."
        onCancel={closeAction}
        onConfirm={confirmAction}
      >
        <textarea
          className="rfqu-rejection-reason"
          rows={4}
          maxLength={1000}
          placeholder="Enter rejection reason..."
          value={actionReason}
          disabled={actionLoading}
          onChange={(event) => setActionReason(event.target.value)}
          required
        />
      </ConfirmModal>
    </div>
  );
}

export default PurchaseRfqsList;