import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import DataList from "../../../components/common/DataList/DataList";
import StatusField from "../../../components/common/StatusField/StatusField";
import ConfirmModal from "../../../components/common/ConfirmModal/ConfirmModal";
import api from "../../../services/api";

import SalesReturnModal from "./SalesReturnModal";

const getErrorMessage = (error) => {
  const data = error?.response?.data;

  if (typeof data?.message === "string") return data.message;
  if (typeof data?.error === "string") return data.error;

  if (Array.isArray(data?.errors) && data.errors.length) {
    return data.errors
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.message || item?.msg || String(item),
      )
      .join(", ");
  }

  return error?.message || "Something went wrong. Please try again.";
};

const getSalesReturns = (response) => {
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.data?.salesReturns)) {
    return response.data.salesReturns;
  }
  if (Array.isArray(response?.data?.returns)) return response.data.returns;
  if (Array.isArray(response?.data)) return response.data;

  return [];
};

const getReturnNumber = (row) =>
  row?.returnNumber || row?.salesReturnNumber || row?.documentNumber || "";

const getAmount = (row) =>
  Number(
    row?.totalAmount ?? row?.returnTotal ?? row?.grandTotal ?? row?.total ?? 0,
  );

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

function SalesReturnsList() {
  const [loading, setLoading] = useState(true);
  const [salesReturns, setSalesReturns] = useState([]);

  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [modalMode, setModalMode] = useState("create");

  const [confirmState, setConfirmState] = useState({
    open: false,
    type: "danger",
    title: "",
    message: "",
    confirmText: "Delete",
    onConfirm: null,
  });

  const [confirmLoading, setConfirmLoading] = useState(false);

  const loadSalesReturns = useCallback(async () => {
    try {
      setLoading(true);

      const response = await api.salesReturn.getAll({
        page: 1,
        limit: 100,
      });

      setSalesReturns(getSalesReturns(response));
    } catch (error) {
      console.error("Unable to load sales returns:", error);

      toast.error(getErrorMessage(error));
      setSalesReturns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSalesReturns();
  }, [loadSalesReturns]);

  const columns = useMemo(
    () => [
      {
        key: "returnNumber",
        label: "Return Number",
        sortable: true,
        render: (value, row) => (
          <div className="dl-customer">
            <strong>{getReturnNumber(row) || value || "—"}</strong>
            <span>
              {row.sourceInvoiceNumber ||
                row.invoiceNumber ||
                "No invoice reference"}
            </span>
          </div>
        ),
      },

      {
        key: "sourceInvoiceNumber",
        label: "Invoice Number",
        sortable: true,
        render: (value, row) =>
          row.sourceInvoiceNumber || row.invoiceNumber || "—",
      },

      {
        key: "returnDate",
        label: "Return Date",
        sortable: true,
        render: (value) => formatDate(value),
      },

      {
        key: "customerName",
        label: "Customer",
        sortable: true,
        render: (value, row) =>
          value || row.customer?.name || row.partyName || row.ledgerName || "—",
      },

      {
        key: "totalAmountPaise",
        label: "Return Amount",
        sortable: true,
        render: (value, row) => {
          const amountPaise =
            row.totalAmountPaise ??
            row.totalAmount ??
            row.returnTotal ??
            row.grandTotal ??
            0;

          // Backend stores monetary values in paise.
          const amount =
            row.totalAmountPaise != null
              ? Number(amountPaise) / 100
              : Number(amountPaise);

          return formatCurrency(amount);
        },
      },

      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (value) => <StatusField value={value || "CREATED"} />,
      },

      {
        key: "updateStock",
        label: "Stock Update",
        sortable: true,
        visible: false,
        render: (value) => (value === false ? "No" : "Yes"),
      },

      {
        key: "notes",
        label: "Notes",
        sortable: false,
        visible: false,
        render: (value) => value || "—",
      },
    ],
    [],
  );

  const filters = [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: ["CREATED", "POSTED", "CANCELLED"],
    },
  ];

  const quickFilters = [
    {
      key: "status",
      value: "",
      label: "All Returns",
    },
    {
      key: "status",
      value: "CREATED",
      label: "Created",
    },
    {
      key: "status",
      value: "POSTED",
      label: "Posted",
    },
    {
      key: "status",
      value: "CANCELLED",
      label: "Cancelled",
    },
  ];

  const openReturnModal = (mode, row = null) => {
    setSelectedReturn(row);
    setModalMode(mode);
    setShowReturnModal(true);
  };

  const closeReturnModal = () => {
    setShowReturnModal(false);
    setSelectedReturn(null);
  };

  const handleReturnSaved = async () => {
    await loadSalesReturns();
  };

  const openConfirmModal = ({
    type = "danger",
    title = "Are you sure?",
    message = "",
    confirmText = "Confirm",
    onConfirm,
  }) => {
    setConfirmState({
      open: true,
      type,
      title,
      message,
      confirmText,
      onConfirm,
    });
  };

  const closeConfirmModal = () => {
    if (confirmLoading) return;

    setConfirmState({
      open: false,
      type: "danger",
      title: "",
      message: "",
      confirmText: "Delete",
      onConfirm: null,
    });
  };

  const handleConfirmAction = async () => {
    if (confirmLoading || typeof confirmState.onConfirm !== "function") {
      return;
    }

    try {
      setConfirmLoading(true);

      await confirmState.onConfirm();

      setConfirmState({
        open: false,
        type: "danger",
        title: "",
        message: "",
        confirmText: "Delete",
        onConfirm: null,
      });
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleView = (row) => {
    openReturnModal("view", row);
  };

  const handleEdit = (row) => {
    if (String(row.status || "CREATED").toUpperCase() !== "CREATED") {
      toast.error("Only created sales returns can be edited");
      return;
    }

    openReturnModal("edit", row);
  };

  const handleDelete = (row) => {
    if (String(row.status || "CREATED").toUpperCase() !== "CREATED") {
      toast.error("Only created sales returns can be deleted");
      return;
    }

    const returnNumber = getReturnNumber(row);

    if (!returnNumber) {
      toast.error("Return number is missing");
      return;
    }

    openConfirmModal({
      type: "danger",
      title: "Delete Sales Return?",
      message: `Are you sure you want to delete "${returnNumber}"? This action cannot be undone.`,
      confirmText: "Delete Return",

      onConfirm: async () => {
        try {
          await api.salesReturn.delete(returnNumber);

          setSalesReturns((previous) =>
            previous.filter(
              (item) =>
                item._id !== row._id && getReturnNumber(item) !== returnNumber,
            ),
          );

          toast.success("Sales return deleted successfully");
        } catch (error) {
          console.error("Unable to delete sales return:", error);

          toast.error(getErrorMessage(error));

          throw error;
        }
      },
    });
  };

  const handleRefresh = async () => {
    await loadSalesReturns();
  };

  return (
    <>
      <DataList
        title="Sales Returns"
        subtitle="Manage customer returns and returned invoice items"
        columns={columns}
        data={salesReturns}
        loading={loading}
        rowKey="_id"
        showCase="list"
        searchable
        filterable
        sortable
        selectable
        columnVisibility
        pagination
        filters={filters}
        quickFilters={quickFilters}
        storageKey="trustiq-sales-returns"
        searchPlaceholder="Search return number, invoice, customer..."
        actions={{
          view: handleView,
          edit: handleEdit,
          delete: handleDelete,
        }}
        onRefresh={handleRefresh}
        addButton={
          <button
            type="button"
            className="so-primary-button"
            onClick={() => openReturnModal("create")}
          >
            <Plus size={16} />
            <span>New Sales Return</span>
          </button>
        }
      />

      <SalesReturnModal
        isOpen={showReturnModal}
        onClose={closeReturnModal}
        onSave={handleReturnSaved}
        editData={selectedReturn}
        mode={modalMode}
      />

      <ConfirmModal
        open={confirmState.open}
        type={confirmState.type}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText="Cancel"
        loading={confirmLoading}
        onCancel={closeConfirmModal}
        onConfirm={handleConfirmAction}
      />
    </>
  );
}

export default SalesReturnsList;
