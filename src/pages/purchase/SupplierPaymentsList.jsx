import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import DataList from "../../components/common/DataList/DataList";
import StatusField from "../../components/common/StatusField/StatusField";

import api from "../../services/api";
import routes from "../../config/routes";

const PAYMENT_METHOD_LABELS = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  UPI: "UPI",
  CHEQUE: "Cheque",
  CARD: "Card",
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
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

const getErrorMessage = (error) => {
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

  return (
    body?.message ||
    body?.error ||
    error?.message ||
    "Unable to load supplier payments."
  );
};

const getPaymentList = (response) => {
  const records = response?.data?.data;

  if (!Array.isArray(records)) {
    throw new Error(
      "The supplier payment list response must contain a data array.",
    );
  }

  return records;
};

const FILTERS = [
  {
    key: "paymentMethod",
    label: "Payment Method",
    type: "select",
    options: ["CASH", "BANK_TRANSFER", "UPI", "CHEQUE", "CARD"],
  },

  {
    key: "paymentLedgerType",
    label: "Paid From",
    type: "select",
    options: ["CASH", "BANK"],
  },

  {
    key: "status",
    label: "Status",
    type: "select",
    options: ["POSTED"],
  },
];

const QUICK_FILTERS = [
  {
    key: "paymentMethod",
    value: "",
    label: "All",
  },

  {
    key: "paymentMethod",
    value: "CASH",
    label: "Cash",
  },

  {
    key: "paymentMethod",
    value: "BANK_TRANSFER",
    label: "Bank Transfer",
  },

  {
    key: "paymentMethod",
    value: "UPI",
    label: "UPI",
  },
];

function SupplierPaymentsList() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);

  const requestVersion = useRef(0);

  const loadPayments = useCallback(async () => {
    const version = ++requestVersion.current;

    const isCurrent = () => version === requestVersion.current;

    setLoading(true);

    try {
      const firstResponse = await api.supplierPayments.getAll({
        page: 1,
        limit: 100,
      });

      if (!isCurrent()) return;

      const records = [...getPaymentList(firstResponse)];

      const totalPages = Math.max(
        1,
        Number(firstResponse?.data?.pagination?.totalPages) || 1,
      );

      // DataList receives a local array, so load every page.
      for (let page = 2; page <= totalPages; page += 1) {
        if (!isCurrent()) return;

        const response = await api.supplierPayments.getAll({
          page,
          limit: 100,
        });

        if (!isCurrent()) return;

        records.push(...getPaymentList(response));
      }

      const uniqueRecords = Array.from(
        new Map(
          records.map((payment) => [
            payment._id || payment.paymentNumber,
            payment,
          ]),
        ).values(),
      );

      if (isCurrent()) {
        setPayments(uniqueRecords);
      }
    } catch (error) {
      if (isCurrent()) {
        console.error("Unable to load supplier payments:", error);

        toast.error(getErrorMessage(error));
      }
    } finally {
      if (isCurrent()) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadPayments();

    return () => {
      requestVersion.current += 1;
    };
  }, [loadPayments]);

  const columns = useMemo(
    () => [
      {
        key: "paymentNumber",
        label: "Payment Number",
        sortable: true,
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
        key: "paymentDate",
        label: "Payment Date",
        sortable: true,
        render: formatDate,
      },

      {
        key: "paymentLedgerName",
        label: "Paid From",
        sortable: true,

        render: (value, row) => (
          <div className="dl-customer">
            <strong>{value || "N/A"}</strong>
            <span>{row.paymentLedgerCode || "N/A"}</span>
          </div>
        ),
      },

      {
        key: "paymentMethod",
        label: "Payment Method",
        sortable: true,

        render: (value) => PAYMENT_METHOD_LABELS[value] || value || "N/A",
      },

      {
        key: "referenceNumber",
        label: "Reference",
        sortable: true,

        render: (value) => value || <span className="dl-muted-value">N/A</span>,
      },

      {
        key: "amountPaise",
        label: "Amount Paid",
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
        key: "paymentLedgerType",
        label: "Account Type",
        sortable: true,
        visible: false,
      },

      {
        key: "postedAt",
        label: "Posted On",
        sortable: true,
        visible: false,
        render: formatDate,
      },

      {
        key: "createdAt",
        label: "Created On",
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

  const handleView = (row) => {
    if (!row.paymentNumber) {
      toast.error("This record has no payment number.");
      return;
    }

    navigate(
      routes.supplierPayments.view.replace(
        ":paymentNumber",
        encodeURIComponent(row.paymentNumber),
      ),
    );
  };

  return (
    <DataList
      title="Supplier Payments"
      subtitle="Payments made to suppliers against purchase bills"
      columns={columns}
      data={payments}
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
      storageKey="trustiq-supplier-payments"
      searchPlaceholder="Search payment, supplier, supplier code, reference..."
      actions={{
        view: handleView,
      }}
      onRefresh={loadPayments}
      addButton={
        <button
          type="button"
          className="so-primary-button"
          onClick={() => navigate(routes.supplierPayments.create)}
        >
          <Plus size={16} />
          <span>New Supplier Payment</span>
        </button>
      }
    />
  );
}

export default SupplierPaymentsList;
