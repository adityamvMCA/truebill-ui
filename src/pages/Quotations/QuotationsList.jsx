import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";

import DataList from "../../components/common/DataList/DataList";
import Button from "../../components/common/Form/Button";

import "./quotations-list.css";

/*
 * UI preview data only.
 * Replace this with records from your quotation API.
 *
 * Align status values and field names with your backend
 * before connecting the API.
 */
const DEMO_QUOTATIONS = [
  {
    _id: "demo-quotation-1",
    quotationNumber: "QT001",
    quotationDate: "2026-10-18",
    validUntil: "2026-10-31",
    customerCode: "DEMO001",
    customerName: "Demo Retail Customer",
    contactPerson: "Demo Contact",
    customerReference: "Retail enquiry",
    itemCount: 3,
    taxableAmount: 10000,
    taxAmount: 1800,
    grandTotal: 11800,
    status: "DRAFT",
  },
  {
    _id: "demo-quotation-2",
    quotationNumber: "QT002",
    quotationDate: "2026-10-18",
    validUntil: "2026-11-05",
    customerCode: "DEMO002",
    customerName: "Demo Wholesale Customer",
    contactPerson: "Demo Buyer",
    customerReference: "Bulk purchase enquiry",
    itemCount: 8,
    taxableAmount: 25000,
    taxAmount: 4500,
    grandTotal: 29500,
    status: "SENT",
  },
];

const STATUS_LABELS = {
  DRAFT: "Draft",
  SENT: "Sent",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
};

const STATUSES = Object.keys(STATUS_LABELS);

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

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatMoney = (value) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const amount = Number(value);

  return Number.isFinite(amount)
    ? currencyFormatter.format(amount)
    : "—";
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

function QuotationStatus({ value }) {
  const status = String(value || "").toUpperCase();
  const knownStatus = STATUSES.includes(status);

  return (
    <span
      className={`ql-status ${
        knownStatus
          ? `ql-status-${status.toLowerCase()}`
          : "ql-status-unknown"
      }`}
    >
      <span className="ql-status-dot" aria-hidden="true" />

      {STATUS_LABELS[status] || value || "Unknown"}
    </span>
  );
}

function QuotationsList({
  quotations = DEMO_QUOTATIONS,
  loading = false,
  error = "",
  onRefresh,
  onView,
  createPath = "/sales/quotations/create",
}) {
  const navigate = useNavigate();

  const columns = useMemo(
    () => [
      {
        key: "quotationNumber",
        label: "Quotation",
        sortable: true,

        render: (value, row) => (
          <div className="ql-document">
            <span className="ql-document-number">
              {value || "—"}
            </span>

            <span className="ql-secondary">
              {row.customerReference || "No reference"}
            </span>
          </div>
        ),
      },

      {
        key: "customerName",
        label: "Customer",
        sortable: true,

        render: (value, row) => (
          <div className="ql-customer">
            <strong>{value || "—"}</strong>

            <span className="ql-secondary">
              {row.customerCode || "—"}
            </span>
          </div>
        ),
      },

      {
        key: "quotationDate",
        label: "Quotation Date",
        sortable: true,
        render: (value) => formatDate(value),
      },

      {
        key: "validUntil",
        label: "Valid Until",
        sortable: true,
        render: (value) => formatDate(value),
      },

      {
        key: "itemCount",
        label: "Items",
        sortable: true,
        render: (value) => value ?? "—",
      },

      {
        key: "grandTotal",
        label: "Total Amount",
        sortable: true,

        render: (value) => (
          <span className="ql-total">
            {formatMoney(value)}
          </span>
        ),
      },

      {
        key: "status",
        label: "Status",
        sortable: true,

        render: (value) => (
          <QuotationStatus value={value} />
        ),
      },

      {
        key: "taxableAmount",
        label: "Taxable Amount",
        sortable: true,
        visible: false,
        render: (value) => formatMoney(value),
      },

      {
        key: "taxAmount",
        label: "Tax Amount",
        sortable: true,
        visible: false,
        render: (value) => formatMoney(value),
      },

      {
        key: "contactPerson",
        label: "Contact Person",
        sortable: true,
        visible: false,
      },

      {
        key: "customerReference",
        label: "Customer Reference",
        sortable: true,
        visible: false,
      },
    ],
    [],
  );

  return (
    <div className="ql-page">
      {error && (
        <div className="ql-error" role="alert">
          {error}
        </div>
      )}

      <DataList
        title="Quotations"
        subtitle="Prepare customer quotations and track their progress"
        columns={columns}
        data={quotations}
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
        storageKey="trustiq-quotations"
        searchPlaceholder="Search quotation, customer, reference..."
        actions={
          onView
            ? {
                view: (row) => onView(row),
              }
            : {}
        }
        onRefresh={onRefresh}
        addButton={
          <Button
            icon={Plus}
            onClick={() => navigate(createPath)}
          >
            New Quotation
          </Button>
        }
      />
    </div>
  );
}

export default QuotationsList;