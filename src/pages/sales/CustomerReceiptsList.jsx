import { Plus } from "lucide-react";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import toast from "react-hot-toast";

import DataList from "../../components/common/DataList/DataList";
import StatusField from "../../components/common/StatusField/StatusField";

import api from "../../services/api";
import routes, { buildRoute } from "../../config/routes";

const CUSTOMER_RECEIPT_ROUTES = {
  create: routes.customerReceipts.create,

  view: (receiptNumber) =>
    buildRoute(routes.customerReceipts.view, {
      receiptNumber: encodeURIComponent(receiptNumber),
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

const getReceiptList = (response) =>
  Array.isArray(response?.data?.data) ? response.data.data : [];

const RECEIPT_METHOD_LABELS = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  UPI: "UPI",
  CHEQUE: "Cheque",
  CARD: "Card",
};

function CustomerReceiptsList() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState([]);

  const loadReceipts = useCallback(async () => {
    try {
      setLoading(true);

      const firstResponse = await api.customerReceipts.getAll({
        page: 1,
        limit: 100,
      });

      const records = [...getReceiptList(firstResponse)];

      const totalPages = Math.max(
        1,
        Number(firstResponse?.data?.pagination?.totalPages) || 1,
      );

      for (let page = 2; page <= totalPages; page += 1) {
        const response = await api.customerReceipts.getAll({
          page,
          limit: 100,
        });

        records.push(...getReceiptList(response));
      }

      const uniqueRecords = Array.from(
        new Map(
          records.map((receipt) => [
            receipt._id || receipt.receiptNumber,
            receipt,
          ]),
        ).values(),
      );

      setReceipts(uniqueRecords);
    } catch (error) {
      console.error("Unable to load customer receipts:", error);

      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);

  const columns = useMemo(
    () => [
      {
        key: "receiptNumber",
        label: "Receipt Number",
        sortable: true,
      },

      {
        key: "customerName",
        label: "Customer",
        sortable: true,

        render: (value, row) => (
          <div className="dl-customer">
            <strong>{value || "N/A"}</strong>

            <span>{row.customerCode || "N/A"}</span>
          </div>
        ),
      },

      {
        key: "receiptDate",
        label: "Receipt Date",
        sortable: true,
        render: formatDate,
      },

      {
        key: "receiptLedgerName",
        label: "Received In",
        sortable: true,

        render: (value, row) => (
          <div className="dl-customer">
            <strong>{value || "N/A"}</strong>

            <span>{row.receiptLedgerCode || "N/A"}</span>
          </div>
        ),
      },

      {
        key: "receiptMethod",
        label: "Payment Method",
        sortable: true,

        render: (value) => RECEIPT_METHOD_LABELS[value] || value || "N/A",
      },

      {
        key: "referenceNumber",
        label: "Reference",
        sortable: true,

        render: (value) => value || <span className="dl-muted-value">N/A</span>,
      },

      {
        key: "amountPaise",
        label: "Amount",
        type: "number",
        sortable: true,
        render: formatPaise,
      },

      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (value) => <StatusField value={value} />,
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
      key: "receiptMethod",
      label: "Payment Method",
      type: "select",
      options: ["CASH", "BANK_TRANSFER", "UPI", "CHEQUE", "CARD"],
    },

    {
      key: "status",
      label: "Status",
      type: "select",
      options: ["POSTED"],
    },
  ];

  const quickFilters = [
    {
      key: "receiptMethod",
      value: "",
      label: "All",
    },

    {
      key: "receiptMethod",
      value: "CASH",
      label: "Cash",
    },

    {
      key: "receiptMethod",
      value: "BANK_TRANSFER",
      label: "Bank Transfer",
    },

    {
      key: "receiptMethod",
      value: "UPI",
      label: "UPI",
    },
  ];

  const handleView = (row) => {
    navigate(CUSTOMER_RECEIPT_ROUTES.view(row.receiptNumber));
  };

  return (
    <DataList
      title="Customer Receipts"
      subtitle="Money received from customers against sales invoices"
      columns={columns}
      data={receipts}
      loading={loading}
      rowKey="_id"
      showCase="list"
      searchable
      filterable
      sortable
      columnVisibility
      pagination
      filters={filters}
      quickFilters={quickFilters}
      storageKey="trustiq-customer-receipts"
      searchPlaceholder="Search receipt, customer, customer code, reference..."
      actions={{
        view: handleView,
      }}
      onRefresh={loadReceipts}
      addButton={
        <button
          type="button"
          className="so-primary-button"
          onClick={() => navigate(CUSTOMER_RECEIPT_ROUTES.create)}
        >
          <Plus size={16} />
          <span>New Customer Receipt</span>
        </button>
      }
    />
  );
}

export default CustomerReceiptsList;
