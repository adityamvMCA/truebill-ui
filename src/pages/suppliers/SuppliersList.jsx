import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import DataList from "../../components/common/DataList/DataList";
import StatusField from "../../components/common/StatusField/StatusField";
import api from "../../services/api";


import ConfirmModal from "../../components/common/ConfirmModal/ConfirmModal";
import SupplierRegistration from "./SupplierRegistration";

function SuppliersList() {
  const [loading, setLoading] = useState(true);

  const [suppliers, setSuppliers] = useState([]);

  const [showSupplierModal, setShowSupplierModal] = useState(false);

  const [confirmState, setConfirmState] = useState({
    open: false,
    type: "danger",
    title: "",
    message: "",
    confirmText: "Delete",
    onConfirm: null,
  });

  const [confirmLoading, setConfirmLoading] = useState(false);

  const getErrorMessage = (error) => {
    const responseData = error?.response?.data;

    if (typeof responseData?.message === "string") {
      return responseData.message;
    }

    if (typeof responseData?.error === "string") {
      return responseData.error;
    }

    if (
      Array.isArray(responseData?.errors) &&
      responseData.errors.length > 0
    ) {
      return responseData.errors
        .map((item) =>
          typeof item === "string"
            ? item
            : item?.message || item?.msg || String(item),
        )
        .join(", ");
    }

    return (
      error?.message ||
      "Something went wrong. Please try again."
    );
  };

  const getSupplierList = (response) => {
    if (Array.isArray(response?.data?.data?.suppliers)) {
      return response.data.data.suppliers;
    }

    if (Array.isArray(response?.data?.suppliers)) {
      return response.data.suppliers;
    }

    if (Array.isArray(response?.data?.data)) {
      return response.data.data;
    }

    if (Array.isArray(response?.data)) {
      return response.data;
    }

    return [];
  };

  const loadSuppliers = useCallback(async () => {
    try {
      setLoading(true);

      const response = await api.suppliers.getAll({
        page: 1,
        limit: 100,
      });

      const supplierList = getSupplierList(response);

      setSuppliers(supplierList);
    } catch (error) {
      console.error("Unable to load suppliers:", error);

      toast.error(getErrorMessage(error));

      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const columns = useMemo(
    () => [
      {
        key: "supplierCode",
        label: "Code",
        sortable: true,
      },

      {
        key: "supplierName",
        label: "Supplier",
        sortable: true,

        render: (value, row) => (
          <div className="dl-customer">
            <strong>{value}</strong>

            <span>
              {row.supplierType || "Business"}
            </span>
          </div>
        ),
      },

      {
        key: "contactPerson",
        label: "Contact Person",
        sortable: true,

        render: (value) =>
          value || (
            <span className="dl-muted-value">
              N/A
            </span>
          ),
      },

      {
        key: "phone",
        label: "Phone",
        sortable: true,

        render: (value) =>
          value || (
            <span className="dl-muted-value">
              N/A
            </span>
          ),
      },

      {
        key: "email",
        label: "Email",
        sortable: true,

        render: (value) =>
          value || (
            <span className="dl-muted-value">
              N/A
            </span>
          ),
      },

      {
        key: "gstNo",
        label: "GST Number",
        sortable: true,

        render: (value) =>
          value || (
            <span className="dl-muted-value">
              N/A
            </span>
          ),
      },

      {
        key: "city",
        label: "City",
        sortable: true,

        render: (value) =>
          value || (
            <span className="dl-muted-value">
              N/A
            </span>
          ),
      },

      {
        key: "state",
        label: "State",
        sortable: true,

        render: (value) =>
          value || (
            <span className="dl-muted-value">
              N/A
            </span>
          ),
      },

      {
        key: "paymentTerms",
        label: "Payment Terms",
        sortable: true,
      },

      {
        key: "creditLimit",
        label: "Credit Limit",
        type: "currency",
        sortable: true,
      },

      {
        key: "creditDays",
        label: "Credit Days",
        type: "number",
        sortable: true,
      },

      {
        key: "payableBalance",
        label: "Payable Balance",
        type: "currency",
        sortable: true,
      },

      {
        key: "status",
        label: "Status",
        sortable: true,

        render: (value) => (
          <StatusField value={value} />
        ),
      },
    ],
    [],
  );

  const filters = [
    {
      key: "supplierType",
      label: "Supplier Type",
      type: "select",
      options: ["Business", "Individual"],
    },

    {
      key: "status",
      label: "Status",
      type: "select",
      options: ["Active", "Inactive"],
    },

    {
      key: "state",
      label: "State",
      type: "text",
    },
  ];

  const quickFilters = [
    {
      key: "status",
      value: "",
      label: "All",
    },

    {
      key: "status",
      value: "Active",
      label: "Active",
    },

    {
      key: "status",
      value: "Inactive",
      label: "Inactive",
    },

    {
      key: "supplierType",
      value: "Business",
      label: "Business",
    },

    {
      key: "supplierType",
      value: "Individual",
      label: "Individual",
    },
  ];

  const closeConfirmModal = () => {
    if (confirmLoading) {
      return;
    }

    setConfirmState({
      open: false,
      type: "danger",
      title: "",
      message: "",
      confirmText: "Delete",
      onConfirm: null,
    });
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

  const handleConfirmAction = async () => {
    if (
      confirmLoading ||
      typeof confirmState.onConfirm !== "function"
    ) {
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

  const handleDelete = (row) => {
    openConfirmModal({
      type: "danger",
      title: "Delete supplier?",
      message: `Are you sure you want to delete "${row.supplierName}" (${row.supplierCode})? This action cannot be undone.`,
      confirmText: "Delete Supplier",

      onConfirm: async () => {
        try {
          await api.suppliers.delete(row.supplierCode);

          setSuppliers((previous) =>
            previous.filter(
              (supplier) =>
                supplier._id !== row._id,
            ),
          );

          toast.success(
            `${row.supplierName} deleted successfully`,
          );
        } catch (error) {
          console.error(
            "Unable to delete supplier:",
            error,
          );

          toast.error(getErrorMessage(error));

          throw error;
        }
      },
    });
  };

  const handleBulkStatusUpdate = async (
    rows,
    status,
  ) => {
    if (!rows.length) {
      return;
    }

    try {
      await Promise.all(
        rows.map((row) =>
          api.suppliers.update(row.supplierCode, {
            status,
          }),
        ),
      );

      const selectedIds = rows.map(
        (row) => row._id,
      );

      setSuppliers((previous) =>
        previous.map((supplier) =>
          selectedIds.includes(supplier._id)
            ? {
                ...supplier,
                status,
              }
            : supplier,
        ),
      );

      toast.success(
        `${rows.length} supplier${
          rows.length > 1 ? "s" : ""
        } ${
          status === "Active"
            ? "activated"
            : "deactivated"
        } successfully`,
      );
    } catch (error) {
      console.error(
        "Unable to update suppliers:",
        error,
      );

      toast.error(getErrorMessage(error));

      await loadSuppliers();
    }
  };

  const handleBulkDelete = (rows) => {
    if (!rows.length) {
      return;
    }

    openConfirmModal({
      type: "danger",
      title: "Delete selected suppliers?",
      message: `You are about to delete ${rows.length} selected supplier${
        rows.length > 1 ? "s" : ""
      }. This action cannot be undone.`,
      confirmText: `Delete ${rows.length} Supplier${
        rows.length > 1 ? "s" : ""
      }`,

      onConfirm: async () => {
        try {
          await Promise.all(
            rows.map((row) =>
              api.suppliers.delete(
                row.supplierCode,
              ),
            ),
          );

          const selectedIds = rows.map(
            (row) => row._id,
          );

          setSuppliers((previous) =>
            previous.filter(
              (supplier) =>
                !selectedIds.includes(
                  supplier._id,
                ),
            ),
          );

          toast.success(
            `${rows.length} supplier${
              rows.length > 1 ? "s" : ""
            } deleted successfully`,
          );
        } catch (error) {
          console.error(
            "Unable to delete suppliers:",
            error,
          );

          toast.error(getErrorMessage(error));

          await loadSuppliers();

          throw error;
        }
      },
    });
  };

  const handleBulkActivate = async (rows) => {
    await handleBulkStatusUpdate(rows, "Active");
  };

  const handleBulkDeactivate = async (rows) => {
    await handleBulkStatusUpdate(rows, "Inactive");
  };

  const handleRefresh = async () => {
    await loadSuppliers();
  };

  const handleSupplierCreated = (createdSupplier) => {
    setSuppliers((previous) => {
      if (!createdSupplier?._id) {
        return previous;
      }

      const alreadyExists = previous.some(
        (supplier) =>
          supplier._id === createdSupplier._id,
      );

      if (alreadyExists) {
        return previous;
      }

      return [createdSupplier, ...previous];
    });
  };

  return (
    <>
      <DataList
        title="Suppliers"
        subtitle="Manage suppliers and payable accounts"
        columns={columns}
        data={suppliers}
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
        storageKey="trustiq-suppliers"
        searchPlaceholder="Search code, supplier, contact, phone, email, GST, city..."
        actions={{
          delete: handleDelete,
        }}
        bulkActions={[
          {
            key: "activate",
            label: "Activate",
            action: handleBulkActivate,
          },

          {
            key: "deactivate",
            label: "Deactivate",
            action: handleBulkDeactivate,
          },

          {
            key: "delete",
            label: "Delete",
            danger: true,
            action: handleBulkDelete,
          },
        ]}
        onRefresh={handleRefresh}
        addButton={
          <button
            type="button"
            className="so-primary-button"
            onClick={() =>
              setShowSupplierModal(true)
            }
          >
            <Plus size={16} />

            <span>New Supplier</span>
          </button>
        }
      />

      <SupplierRegistration
        isOpen={showSupplierModal}
        onClose={() =>
          setShowSupplierModal(false)
        }
        onSave={handleSupplierCreated}
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

export default SuppliersList;