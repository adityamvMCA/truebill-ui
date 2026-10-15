import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import DataList from "../../components/common/DataList/DataList";
import StatusField from "../../components/common/StatusField/StatusField";
import ConfirmModal from "../../components/common/ConfirmModal/ConfirmModal";

import api from "../../services/api";
import routes, { buildRoute } from "../../config/routes";

const INITIAL_CONFIRM_STATE = {
  open: false,
  type: "danger",
  title: "",
  message: "",
  confirmText: "Confirm",
  onConfirm: null,
};

// const PURCHASE_BILL_ROUTES = {
//   create: routes.purchase.createInvoice,

//   view: (billNumber) =>
//     buildRoute(routes.purchase.viewInvoice, {
//       id: encodeURIComponent(billNumber),
//     }),

//   edit: (billNumber) =>
//     buildRoute(routes.purchase.editInvoice, {
//       id: encodeURIComponent(billNumber),
//     }),
// };
const PURCHASE_BILL_ROUTES = {
  create: routes.purchase.createInvoice,

  view: (billNumber) =>
    `/purchase/invoices/view/${encodeURIComponent(billNumber)}`,

  edit: (billNumber) =>
    buildRoute(routes.purchase.editInvoice, {
      id: encodeURIComponent(billNumber),
    }),
};
const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatPaise = (value) =>
  currencyFormatter.format((Number(value) || 0) / 100);

const formatDate = (value) => {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

const getErrorMessage = (error) => {
  const responseData = error?.response?.data;

  if (Array.isArray(responseData?.errors) && responseData.errors.length > 0) {
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

const getBillList = (response) =>
  Array.isArray(response?.data?.data) ? response.data.data : [];

const isDraft = (bill) => bill?.status === "DRAFT";

function PurchaseBillsList() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState([]);

  const [confirmState, setConfirmState] = useState(INITIAL_CONFIRM_STATE);

  const [confirmLoading, setConfirmLoading] = useState(false);

  const loadBills = useCallback(async () => {
    try {
      setLoading(true);

      // DataList currently receives a local array.
      // Load all pages rather than silently show only the first 100 bills.
      const firstResponse = await api.purchaseBills.getAll({
        page: 1,
        limit: 100,
      });

      const records = [...getBillList(firstResponse)];

      const totalPages = Math.max(
        1,
        Number(firstResponse?.data?.pagination?.totalPages) || 1,
      );

      for (let page = 2; page <= totalPages; page += 1) {
        const response = await api.purchaseBills.getAll({
          page,
          limit: 100,
        });

        records.push(...getBillList(response));
      }

      const uniqueRecords = Array.from(
        new Map(
          records.map((bill) => [bill._id || bill.billNumber, bill]),
        ).values(),
      );

      setBills(uniqueRecords);
    } catch (error) {
      console.error("Unable to load purchase bills:", error);
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  const handleView = useCallback(
  (row) => {
    if (!row.billNumber) {
      toast.error("Purchase bill number is missing.");
      return;
    }

    navigate(PURCHASE_BILL_ROUTES.view(row.billNumber));
  },
  [navigate],
);

  const columns = useMemo(
    () => [
      // {
      //   key: "billNumber",
      //   label: "Bill Number",
      //   sortable: true,
      // },
      {
        key: "billNumber",
        label: "Bill Number",
        sortable: true,

        render: (value, row) => (
          <button
            type="button"
            className="doc-link-button"
            aria-label={`View purchase bill ${value}`}
            onClick={(event) => {
              event.stopPropagation();
              handleView(row);
            }}
          >
            {value || "N/A"}
          </button>
        ),
      },

      {
        key: "supplierName",
        label: "Supplier",
        sortable: true,

        render: (value, row) => (
          <div className="dl-customer">
            <strong>{value || "N/A"}</strong>
            <span>{row.supplierCode || "N/A"}</span>
          </div>
        ),
      },

      {
        key: "supplierInvoiceNumber",
        label: "Supplier Invoice",
        sortable: true,
      },

      {
        key: "billDate",
        label: "Bill Date",
        sortable: true,
        render: formatDate,
      },

      {
        key: "dueDate",
        label: "Due Date",
        sortable: true,
        render: formatDate,
      },

      {
        key: "totalAmountPaise",
        label: "Total",
        type: "number",
        sortable: true,
        render: formatPaise,
      },

      {
        key: "paidAmountPaise",
        label: "Paid",
        type: "number",
        sortable: true,
        render: formatPaise,
      },

      {
        key: "outstandingAmountPaise",
        label: "Pending Amount",
        type: "number",
        sortable: true,

        render: (value, row) =>
          isDraft(row) ? (
            <span className="dl-muted-value">Not posted</span>
          ) : (
            formatPaise(value)
          ),
      },

      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (value) => <StatusField value={value} />,
      },

      {
        key: "paymentStatus",
        label: "Payment Status",
        sortable: true,

        render: (value, row) =>
          isDraft(row) ? (
            <span className="dl-muted-value">N/A</span>
          ) : (
            <StatusField value={value} />
          ),
      },

      {
        key: "paymentTerms",
        label: "Payment Terms",
        sortable: true,
        visible: false,
      },

      {
        key: "taxMode",
        label: "Tax Mode",
        sortable: true,
        visible: false,
      },

      {
        key: "taxableAmountPaise",
        label: "Taxable Amount",
        type: "number",
        sortable: true,
        visible: false,
        render: formatPaise,
      },

      {
        key: "discountAmountPaise",
        label: "Discount",
        type: "number",
        sortable: true,
        visible: false,
        render: formatPaise,
      },

      {
        key: "cgstAmountPaise",
        label: "CGST",
        type: "number",
        sortable: true,
        visible: false,
        render: formatPaise,
      },

      {
        key: "sgstAmountPaise",
        label: "SGST",
        type: "number",
        sortable: true,
        visible: false,
        render: formatPaise,
      },

      {
        key: "igstAmountPaise",
        label: "IGST",
        type: "number",
        sortable: true,
        visible: false,
        render: formatPaise,
      },

      {
        key: "updateStock",
        label: "Receive Stock",
        sortable: true,
        visible: false,
        render: (value) => (value ? "Yes" : "No"),
      },

      {
        key: "postedAt",
        label: "Posted On",
        sortable: true,
        visible: false,
        render: formatDate,
      },

      {
        key: "notes",
        label: "Notes",
        visible: false,

        render: (value) => value || <span className="dl-muted-value">N/A</span>,
      },
    ],
    [],
  );

  const filters = [
    {
      key: "status",
      label: "Bill Status",
      type: "select",
      options: ["DRAFT", "POSTED", "CANCELLED"],
    },

    {
      key: "paymentStatus",
      label: "Payment Status",
      type: "select",
      options: ["UNPAID", "PARTIALLY_PAID", "PAID"],
    },

    {
      key: "taxMode",
      label: "Tax Mode",
      type: "select",
      options: ["NONE", "INTRA_STATE", "INTER_STATE"],
    },

    {
      key: "updateStock",
      label: "Receive Stock",
      type: "select",
      options: [
        { label: "Yes", value: true },
        { label: "No", value: false },
      ],
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
      value: "DRAFT",
      label: "Drafts",
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

  // const handleView = (row) => {
  //   navigate(PURCHASE_BILL_ROUTES.view(row.billNumber));
  // };

  const handleEdit = (row) => {
    if (!isDraft(row)) {
      toast.error("Only draft purchase bills can be edited.");
      return;
    }

    navigate(PURCHASE_BILL_ROUTES.edit(row.billNumber));
  };

  const closeConfirmModal = () => {
    if (confirmLoading) {
      return;
    }

    setConfirmState(INITIAL_CONFIRM_STATE);
  };

  const openConfirmModal = ({
    type = "danger",
    title,
    message,
    confirmText,
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
      // The action displays its own error toast.
      // Leave confirmation open for single-action failures.
      console.error("Purchase bill action failed:", error);
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleDelete = (row) => {
    if (!isDraft(row)) {
      toast.error("Only draft purchase bills can be deleted.");
      return;
    }

    openConfirmModal({
      type: "danger",
      title: "Delete purchase bill draft?",
      message:
        `Delete ${row.billNumber} for ${row.supplierName}? ` +
        "This draft will be marked as deleted.",
      confirmText: "Delete Draft",

      onConfirm: async () => {
        try {
          await api.purchaseBills.delete(row.billNumber);

          setBills((previous) =>
            previous.filter((bill) => bill._id !== row._id),
          );

          toast.success(`${row.billNumber} draft deleted successfully`);
        } catch (error) {
          toast.error(getErrorMessage(error));
          throw error;
        }
      },
    });
  };

  const handleBulkPost = (rows) => {
    if (!rows?.length) {
      return;
    }

    if (rows.some((row) => !isDraft(row))) {
      toast.error("Select only draft bills for posting.");
      return;
    }

    openConfirmModal({
      // Uses the existing ConfirmModal type from your shared example.
      type: "danger",
      title: "Post selected purchase bills?",
      message:
        `Post ${rows.length} draft bill${rows.length > 1 ? "s" : ""}? ` +
        "This creates accounting entries and receives stock where selected. " +
        "Posted bills cannot be edited or deleted in this version.",
      confirmText: `Post ${rows.length} Bill${rows.length > 1 ? "s" : ""}`,

      onConfirm: async () => {
        let successCount = 0;
        const failures = [];

        // Process separately; each bill has its own backend transaction.
        for (const row of rows) {
          try {
            const response = await api.purchaseBills.post(row.billNumber);

            const updatedBill = response?.data?.bill;

            if (updatedBill) {
              setBills((previous) =>
                previous.map((bill) =>
                  bill._id === updatedBill._id ? updatedBill : bill,
                ),
              );
            }

            successCount += 1;
          } catch (error) {
            failures.push({
              billNumber: row.billNumber,
              message: getErrorMessage(error),
            });
          }
        }

        if (successCount > 0) {
          toast.success(
            `${successCount} purchase bill${
              successCount > 1 ? "s" : ""
            } posted successfully`,
          );
        }

        if (failures.length > 0) {
          toast.error(
            `${failures.length} bill${
              failures.length > 1 ? "s" : ""
            } failed. ${failures[0].billNumber}: ${failures[0].message}`,
          );
        }

        // Reconcile with server data, including uncertain network results.
        await loadBills();
      },
    });
  };

  const handleBulkDelete = (rows) => {
    if (!rows?.length) {
      return;
    }

    if (rows.some((row) => !isDraft(row))) {
      toast.error("Select only draft bills for deletion.");
      return;
    }

    openConfirmModal({
      type: "danger",
      title: "Delete selected drafts?",
      message: `Delete ${rows.length} purchase bill draft${
        rows.length > 1 ? "s" : ""
      }? These drafts will be marked as deleted.`,
      confirmText: `Delete ${rows.length} Draft${rows.length > 1 ? "s" : ""}`,

      onConfirm: async () => {
        const deletedIds = new Set();
        const failures = [];

        for (const row of rows) {
          try {
            await api.purchaseBills.delete(row.billNumber);
            deletedIds.add(row._id);
          } catch (error) {
            failures.push({
              billNumber: row.billNumber,
              message: getErrorMessage(error),
            });
          }
        }

        setBills((previous) =>
          previous.filter((bill) => !deletedIds.has(bill._id)),
        );

        if (deletedIds.size > 0) {
          toast.success(
            `${deletedIds.size} draft${
              deletedIds.size > 1 ? "s" : ""
            } deleted successfully`,
          );
        }

        if (failures.length > 0) {
          toast.error(
            `${failures.length} deletion${
              failures.length > 1 ? "s" : ""
            } failed. ${failures[0].billNumber}: ${failures[0].message}`,
          );
        }

        await loadBills();
      },
    });
  };

  return (
    <>
      <DataList
        title="Purchase Bills"
        subtitle="Manage supplier invoices and purchase postings"
        columns={columns}
        data={bills}
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
        storageKey="trustiq-purchase-bills"
        searchPlaceholder="Search bill, supplier, supplier code, invoice number..."
        actions={{
          view: handleView,
          edit: handleEdit,
          delete: handleDelete,
        }}
        bulkActions={[
          {
            key: "post",
            label: "Post Drafts",
            action: handleBulkPost,
          },

          {
            key: "delete",
            label: "Delete Drafts",
            danger: true,
            action: handleBulkDelete,
          },
        ]}
        onRefresh={loadBills}
        addButton={
          <button
            type="button"
            className="so-primary-button"
            onClick={() => navigate(PURCHASE_BILL_ROUTES.create)}
          >
            <Plus size={16} />
            <span>New Purchase Bill</span>
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

export default PurchaseBillsList;
