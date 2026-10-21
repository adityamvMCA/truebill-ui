import { Plus } from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import DataList from "../../components/common/DataList/DataList";
import StatusField from "../../components/common/StatusField/StatusField";
import ConfirmModal from "../../components/common/ConfirmModal/ConfirmModal";

import api from "../../services/api";

import {
  REQUISITION_BASE,
  fetchAllPages,
  formatDate,
  getDocument,
  getErrorMessage,
  requisitionPath,
} from "./purchaseRequisition.utils";

import "./PurchaseRequisitions.css";

function PurchaseRequisitionsList() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [requisitions, setRequisitions] = useState([]);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const loadSequence = useRef(0);
  const deleteLock = useRef(false);
  const mountedRef = useRef(false);

  const loadRequisitions = useCallback(async () => {
    const sequence = ++loadSequence.current;

    try {
      setLoading(true);

      const records = await fetchAllPages(
        api.purchaseRequisition.getAll,
        "requisitions",
      );

      if (sequence !== loadSequence.current) return;

      setRequisitions(records);
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
    loadRequisitions();

    return () => {
      mountedRef.current = false;
      loadSequence.current += 1;
    };
  }, [loadRequisitions]);

  const handleView = useCallback(
    (row) => {
      if (!row.requisitionNumber) {
        toast.error("Requisition number is missing.");
        return;
      }

      navigate(requisitionPath(row.requisitionNumber));
    },
    [navigate],
  );

  const handleEdit = (row) => {
    if (row.status !== "CREATED") {
      toast.error("Only CREATED requisitions can be edited.");
      return;
    }

    navigate(
      requisitionPath(row.requisitionNumber, "edit"),
    );
  };

  const handleDelete = async (row) => {
    if (deleteLock.current) return;

    if (row.status !== "CREATED") {
      toast.error("Only CREATED requisitions can be deleted.");
      return;
    }

    try {
      deleteLock.current = true;
      setLoadingDelete(true);

      const response =
        await api.purchaseRequisition.getByNumber(
          row.requisitionNumber,
        );

      const latest = getDocument(response);

      if (
        !latest ||
        latest.status !== "CREATED" ||
        !Number.isSafeInteger(latest.__v)
      ) {
        throw new Error(
          "This requisition changed. Refresh the list.",
        );
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

      if (mountedRef.current) {
        setLoadingDelete(false);
      }
    }
  };

  const confirmDelete = async () => {
    if (deleteLock.current || !deleteTarget) return;

    try {
      deleteLock.current = true;
      setDeleting(true);

      await api.purchaseRequisition.delete(
        deleteTarget.requisitionNumber,
        {
          version: deleteTarget.__v,
        },
      );

      if (!mountedRef.current) return;

      setRequisitions((previous) =>
        previous.filter(
          (record) => record._id !== deleteTarget._id,
        ),
      );

      setDeleteTarget(null);

      toast.success("Purchase Requisition deleted successfully.");
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

  const columns = useMemo(
    () => [
      {
        key: "requisitionNumber",
        label: "Requisition Number",
        sortable: true,

        render: (value, row) => (
          <div className="preq-document-cell">
            <button
              type="button"
              className="preq-document-link"
              onClick={(event) => {
                event.stopPropagation();
                handleView(row);
              }}
            >
              {value || "—"}
            </button>

            <span>
              {row.department || "No department"}
            </span>
          </div>
        ),
      },

      {
        key: "requisitionDate",
        label: "Requisition Date",
        sortable: true,
        render: formatDate,
      },

      {
        key: "requiredByDate",
        label: "Required By",
        sortable: true,
        render: formatDate,
      },

      {
        key: "purpose",
        label: "Purpose",
        sortable: true,

        render: (value) => (
          <span className="preq-purpose-cell" title={value || ""}>
            {value || "—"}
          </span>
        ),
      },

      {
        key: "priority",
        label: "Priority",
        sortable: true,

        render: (value) => (
          <span
            className={`preq-priority preq-priority--${String(
              value || "NORMAL",
            ).toLowerCase()}`}
          >
            {value || "NORMAL"}
          </span>
        ),
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

        render: (value) => (
          <StatusField value={value || "CREATED"} />
        ),
      },

      {
        key: "department",
        label: "Department",
        sortable: true,
        visible: false,
      },

      {
        key: "notes",
        label: "Notes",
        sortable: false,
        visible: false,
        render: (value) => value || "—",
      },
    ],
    [handleView],
  );

  return (
    <div className="preq-list-page">
      <DataList
        title="Purchase Requisitions"
        subtitle="Manage internal purchase requirements and approvals"
        columns={columns}
        data={requisitions}
        loading={loading}
        rowKey="_id"
        showCase="list"
        searchable
        filterable
        sortable
        selectable
        columnVisibility
        pagination
        storageKey="trustiq-purchase-requisitions"
        searchPlaceholder="Search requisition, department, purpose..."
        filters={[
          {
            key: "status",
            label: "Status",
            type: "select",
            options: [
              "CREATED",
              "APPROVED",
              "REJECTED",
              "CANCELLED",
            ],
          },
          {
            key: "priority",
            label: "Priority",
            type: "select",
            options: [
              "LOW",
              "NORMAL",
              "HIGH",
              "URGENT",
            ],
          },
        ]}
        quickFilters={[
          { key: "status", value: "", label: "All" },
          { key: "status", value: "CREATED", label: "Created" },
          { key: "status", value: "APPROVED", label: "Approved" },
          { key: "status", value: "REJECTED", label: "Rejected" },
          { key: "status", value: "CANCELLED", label: "Cancelled" },
        ]}
        actions={{
          view: handleView,
          edit: handleEdit,
          delete: handleDelete,
        }}
        onRefresh={loadRequisitions}
        addButton={
          <button
            type="button"
            className="preq-primary-button"
            onClick={() =>
              navigate(`${REQUISITION_BASE}/create`)
            }
          >
            <Plus size={16} />
            <span>New Requisition</span>
          </button>
        }
      />

      {loadingDelete && (
        <p className="preq-loading-note" role="status">
          Checking requisition...
        </p>
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        type="danger"
        title="Delete Purchase Requisition?"
        message={`Delete ${
          deleteTarget?.requisitionNumber || "this requisition"
        }?`}
        confirmText="Delete Requisition"
        cancelText="Keep Requisition"
        loading={deleting}
        onCancel={() => {
          if (!deleteLock.current) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

export default PurchaseRequisitionsList;