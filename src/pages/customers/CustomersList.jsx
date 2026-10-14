import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import DataList from "../../components/common/DataList/DataList";
import StatusField from "../../components/common/StatusField/StatusField";
import ConfirmModal from "../../components/common/ConfirmModal/ConfirmModal";

import api from "../../services/api";
import routes, { buildRoute } from "../../config/routes";
const CUSTOMER_ROUTES = {
  create: routes.customers.create,

  view: (customerCode) =>
    buildRoute(routes.customers.edit, {
      id: encodeURIComponent(customerCode),
    }),

  edit: (customerCode) =>
    buildRoute(routes.customers.edit, {
      id: encodeURIComponent(customerCode),
    }),
};
const INITIAL_CONFIRM_STATE = {
  open: false,
  type: "danger",
  title: "",
  message: "",
  confirmText: "Delete",
  onConfirm: null,
};

const getErrorMessage = (error) => {
  const responseData = error?.response?.data;

  if (Array.isArray(responseData?.errors) && responseData.errors.length) {
    return responseData.errors
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.message || item?.msg || String(item),
      )
      .join(", ");
  }

  if (typeof responseData?.message === "string") {
    return responseData.message;
  }

  if (typeof responseData?.error === "string") {
    return responseData.error;
  }

  return error?.message || "Something went wrong. Please try again.";
};

const getCustomerList = (response) => {
  if (Array.isArray(response?.data?.data)) {
    return response.data.data;
  }

  if (Array.isArray(response?.data?.customers)) {
    return response.data.customers;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
};

const renderOptionalText = (value) =>
  value || <span className="dl-muted-value">N/A</span>;

function CustomersList() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);

  const [confirmState, setConfirmState] = useState(INITIAL_CONFIRM_STATE);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);

      // Your backend currently caps each request at 100 records.
      // Fetch every page so local DataList filtering/export is not
      // restricted to the first 100 customers.
      const firstResponse = await api.customers.getAll({
        page: 1,
        limit: 100,
      });

      const customerList = [...getCustomerList(firstResponse)];

      const totalPages = Math.max(
        1,
        Number(firstResponse?.data?.pagination?.totalPages) || 1,
      );

      for (let page = 2; page <= totalPages; page += 1) {
        const response = await api.customers.getAll({
          page,
          limit: 100,
        });

        customerList.push(...getCustomerList(response));
      }

      const uniqueCustomers = Array.from(
        new Map(
          customerList.map((customer) => [
            customer._id || customer.customerCode,
            customer,
          ]),
        ).values(),
      );

      setCustomers(uniqueCustomers);
    } catch (error) {
      console.error("Unable to load customers:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const columns = useMemo(
    () => [
      {
        key: "customerCode",
        label: "Code",
        sortable: true,
      },
      {
        key: "customerName",
        label: "Customer",
        sortable: true,
        render: (value, row) => (
          <div className="dl-customer">
            <strong>{value}</strong>
            <span>{row.customerType || "Business"}</span>
          </div>
        ),
      },
      {
        key: "contactPerson",
        label: "Contact Person",
        sortable: true,
        render: renderOptionalText,
      },
      {
        key: "phone",
        label: "Phone",
        sortable: true,
        render: renderOptionalText,
      },
      {
        key: "email",
        label: "Email",
        sortable: true,
        render: renderOptionalText,
      },
      {
        key: "gstNo",
        label: "GST Number",
        sortable: true,
        render: renderOptionalText,
      },
      {
        key: "city",
        label: "City",
        sortable: true,
        render: renderOptionalText,
      },
      {
        key: "state",
        label: "State",
        sortable: true,
        render: renderOptionalText,
      },
      {
        key: "paymentTerms",
        label: "Payment Terms",
        sortable: true,
        render: renderOptionalText,
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
        render: (value) => Number(value || 0),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (value) => <StatusField value={value} />,
      },
      {
        key: "customerType",
        label: "Customer Type",
        sortable: true,
        visible: false,
      },
      {
        key: "alternatePhone",
        label: "Alternate Phone",
        sortable: true,
        visible: false,
        render: renderOptionalText,
      },
      {
        key: "panNo",
        label: "PAN Number",
        sortable: true,
        visible: false,
        render: renderOptionalText,
      },
      {
        key: "billingAddress",
        label: "Billing Address",
        visible: false,
        render: renderOptionalText,
      },
      {
        key: "shippingAddress",
        label: "Shipping Address",
        visible: false,
        render: renderOptionalText,
      },
      {
        key: "pincode",
        label: "Pincode",
        sortable: true,
        visible: false,
        render: renderOptionalText,
      },
      {
        key: "country",
        label: "Country",
        sortable: true,
        visible: false,
        render: renderOptionalText,
      },
      {
        key: "openingBalance",
        label: "Opening Balance",
        type: "currency",
        sortable: true,
        visible: false,
      },
      {
        key: "openingBalanceType",
        label: "Opening Balance Type",
        sortable: true,
        visible: false,
      },
      {
        key: "priceList",
        label: "Price List",
        sortable: true,
        visible: false,
        render: renderOptionalText,
      },
      {
        key: "notes",
        label: "Notes",
        visible: false,
        render: renderOptionalText,
      },
    ],
    [],
  );

  const filters = [
    {
      key: "customerType",
      label: "Customer Type",
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
      key: "openingBalanceType",
      label: "Opening Balance Type",
      type: "select",
      options: ["DEBIT", "CREDIT"],
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
      key: "customerType",
      value: "Business",
      label: "Business",
    },
    {
      key: "customerType",
      value: "Individual",
      label: "Individual",
    },
  ];

  const handleView = (row) => {
    navigate(CUSTOMER_ROUTES.view(row.customerCode));
  };

  const handleEdit = (row) => {
    navigate(CUSTOMER_ROUTES.edit(row.customerCode));
  };

  const closeConfirmModal = () => {
    if (confirmLoading) {
      return;
    }

    setConfirmState(INITIAL_CONFIRM_STATE);
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
    if (confirmLoading || typeof confirmState.onConfirm !== "function") {
      return;
    }

    try {
      setConfirmLoading(true);

      await confirmState.onConfirm();

      setConfirmState(INITIAL_CONFIRM_STATE);
    } catch (error) {
      // The action displays its error toast.
      // Keep the confirmation open so the user can retry or cancel.
      console.error("Customer confirmation action failed:", error);
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleDelete = (row) => {
    openConfirmModal({
      title: "Delete customer?",
      message: `Are you sure you want to delete "${row.customerName}" (${row.customerCode})? The customer will be marked as deleted and its linked ledger will be deactivated.`,
      confirmText: "Delete Customer",

      onConfirm: async () => {
        try {
          await api.customers.delete(row.customerCode);

          setCustomers((previous) =>
            previous.filter((customer) => customer._id !== row._id),
          );

          toast.success(`${row.customerName} deleted successfully`);
        } catch (error) {
          toast.error(getErrorMessage(error));
          throw error;
        }
      },
    });
  };

  const handleBulkStatusUpdate = async (rows, status) => {
    if (!rows.length) {
      return;
    }

    try {
      const results = await Promise.allSettled(
        rows.map((row) => api.customers.update(row.customerCode, { status })),
      );

      const successfulIds = new Set(
        rows
          .filter((_, index) => results[index].status === "fulfilled")
          .map((row) => row._id),
      );

      setCustomers((previous) =>
        previous.map((customer) =>
          successfulIds.has(customer._id) ? { ...customer, status } : customer,
        ),
      );

      const successCount = successfulIds.size;
      const failures = results.filter((result) => result.status === "rejected");

      if (successCount) {
        toast.success(
          `${successCount} customer${successCount > 1 ? "s" : ""} ${
            status === "Active" ? "activated" : "deactivated"
          } successfully`,
        );
      }

      if (failures.length) {
        toast.error(
          `${failures.length} customer update${
            failures.length > 1 ? "s" : ""
          } failed: ${getErrorMessage(failures[0].reason)}`,
        );

        await loadCustomers();
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
      await loadCustomers();
    }
  };

  const handleBulkDelete = (rows) => {
    if (!rows.length) {
      return;
    }

    openConfirmModal({
      title: "Delete selected customers?",
      message: `Delete ${rows.length} selected customer${
        rows.length > 1 ? "s" : ""
      }? These customers will be marked as deleted and their linked ledgers will be deactivated.`,
      confirmText: `Delete ${rows.length} Customer${
        rows.length > 1 ? "s" : ""
      }`,

      onConfirm: async () => {
        const results = await Promise.allSettled(
          rows.map((row) => api.customers.delete(row.customerCode)),
        );

        const successfulIds = new Set(
          rows
            .filter((_, index) => results[index].status === "fulfilled")
            .map((row) => row._id),
        );

        setCustomers((previous) =>
          previous.filter((customer) => !successfulIds.has(customer._id)),
        );

        const successCount = successfulIds.size;
        const failures = results.filter(
          (result) => result.status === "rejected",
        );

        if (successCount) {
          toast.success(
            `${successCount} customer${
              successCount > 1 ? "s" : ""
            } deleted successfully`,
          );
        }

        if (failures.length) {
          toast.error(
            `${failures.length} deletion${
              failures.length > 1 ? "s" : ""
            } failed: ${getErrorMessage(failures[0].reason)}`,
          );

          await loadCustomers();
        }
      },
    });
  };

  const handleCustomerCsvUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.customers.import(formData);
      const result = response?.data;

      if (!result?.success) {
        throw new Error(result?.message || "Failed to import customers");
      }

      const createdCount = Number(result.createdCount) || 0;
      const failedCount = Number(result.failedCount) || 0;

      if (createdCount > 0) {
        toast.success(
          `${createdCount} customer${
            createdCount > 1 ? "s" : ""
          } imported successfully`,
        );
      }

      if (failedCount > 0) {
        const firstError = result?.errors?.[0];

        const errorDetail =
          typeof firstError === "string"
            ? firstError
            : firstError
              ? `Row ${firstError.row} — ${firstError.message}`
              : "";

        toast.error(
          `${failedCount} row${failedCount > 1 ? "s" : ""} failed${
            errorDetail ? `: ${errorDetail}` : ""
          }`,
        );
      }

      if (createdCount === 0 && failedCount === 0) {
        toast.error("No customers were imported");
      }

      await loadCustomers();
    } catch (error) {
      console.error("Unable to import customers:", error);

      toast.error(getErrorMessage(error));

      // Refresh in case the server imported some rows before failing.
      await loadCustomers();
    }
  };

  const customerImportConfig = {
    templateFileName: "customers-import-template.csv",

    columns: [
      { key: "customerName", example: "ABC Traders" },
      { key: "customerType", example: "Business" },
      { key: "contactPerson", example: "Aditya" },
      { key: "phone", example: "9876543210" },
      { key: "alternatePhone", example: "" },
      { key: "email", example: "accounts@example.com" },
      { key: "gstNo", example: "" },
      { key: "panNo", example: "" },
      { key: "billingAddress", example: "123 Market Road" },
      { key: "shippingAddress", example: "123 Market Road" },
      { key: "city", example: "Belagavi" },
      { key: "state", example: "Karnataka" },
      { key: "pincode", example: "590001" },
      { key: "country", example: "India" },
      { key: "paymentTerms", example: "Net 30" },
      { key: "creditLimit", example: "50000" },
      { key: "creditDays", example: "30" },
      { key: "openingBalance", example: "0" },
      { key: "openingBalanceType", example: "DEBIT" },
      { key: "priceList", example: "Standard" },
      { key: "status", example: "Active" },
      { key: "notes", example: "" },
    ],

    onUpload: handleCustomerCsvUpload,

    onError: (message) => toast.error(message),
  };

  return (
    <>
      <DataList
        title="Customers"
        subtitle="Manage customers and receivable accounts"
        columns={columns}
        data={customers}
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
        storageKey="trustiq-customers"
        searchPlaceholder="Search code, customer, contact, phone, email, GST, city..."
        actions={{
          view: handleView,
          edit: handleEdit,
          delete: handleDelete,
        }}
        bulkActions={[
          {
            key: "activate",
            label: "Activate",
            action: (rows) => handleBulkStatusUpdate(rows, "Active"),
          },
          {
            key: "deactivate",
            label: "Deactivate",
            action: (rows) => handleBulkStatusUpdate(rows, "Inactive"),
          },
          {
            key: "delete",
            label: "Delete",
            danger: true,
            action: handleBulkDelete,
          },
        ]}
        onRefresh={loadCustomers}
        importConfig={customerImportConfig}
        addButton={
          <button
            type="button"
            className="so-primary-button"
            onClick={() => navigate(CUSTOMER_ROUTES.create)}
          >
            <Plus size={16} />
            <span>New Customer</span>
          </button>
        }
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

export default CustomersList;
