import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Circle,
  Clock3,
  FileText,
  Info,
  LoaderCircle,
  PackageCheck,
  RotateCcw,
  Truck,
  XCircle,
} from "lucide-react";

import "./statusField.css";

const STATUS_CONFIG = {
  // General statuses
  ACTIVE: {
    label: "Active",
    icon: CheckCircle2,
    tone: "success",
  },

  INACTIVE: {
    label: "Inactive",
    icon: Ban,
    tone: "neutral",
  },

  ENABLED: {
    label: "Enabled",
    icon: CheckCircle2,
    tone: "success",
  },

  DISABLED: {
    label: "Disabled",
    icon: Ban,
    tone: "neutral",
  },

  SUSPENDED: {
    label: "Suspended",
    icon: Ban,
    tone: "danger",
  },

  EXPIRED: {
    label: "Expired",
    icon: AlertCircle,
    tone: "danger",
  },

  TRIAL: {
    label: "Trial",
    icon: Clock3,
    tone: "purple",
  },

  ARCHIVED: {
    label: "Archived",
    icon: FileText,
    tone: "neutral",
  },

  DELETED: {
    label: "Deleted",
    icon: XCircle,
    tone: "danger",
  },

  ON_HOLD: {
    label: "On Hold",
    icon: Clock3,
    tone: "warning",
  },

  // Product types
  GOODS: {
    label: "Goods",
    icon: PackageCheck,
    tone: "info",
  },

  SERVICE: {
    label: "Service",
    icon: FileText,
    tone: "purple",
  },

  // Stock states
  IN_STOCK: {
    label: "In Stock",
    icon: PackageCheck,
    tone: "success",
  },

  OUT_OF_STOCK: {
    label: "Out of Stock",
    icon: AlertCircle,
    tone: "danger",
  },

  LOW_STOCK: {
    label: "Low Stock",
    icon: AlertCircle,
    tone: "warning",
  },

  // Valuation states
  VALUED: {
    label: "Valued",
    icon: CheckCircle2,
    tone: "success",
  },

  UNVALUED: {
    label: "Missing Valuation",
    icon: AlertCircle,
    tone: "warning",
  },

  // Document and accounting statuses
  DRAFT: {
    label: "Draft",
    icon: FileText,
    tone: "neutral",
  },

  CREATED: {
    label: "Created",
    icon: FileText,
    tone: "info",
  },

  POSTED: {
    label: "Posted",
    icon: CheckCircle2,
    tone: "success",
  },

  CONFIRMED: {
    label: "Confirmed",
    icon: CheckCircle2,
    tone: "success",
  },

  APPROVED: {
    label: "Approved",
    icon: CheckCircle2,
    tone: "success",
  },

  REJECTED: {
    label: "Rejected",
    icon: XCircle,
    tone: "danger",
  },

  PENDING_APPROVAL: {
    label: "Pending Approval",
    icon: Clock3,
    tone: "warning",
  },

  PROCESSING: {
    label: "Processing",
    icon: LoaderCircle,
    tone: "warning",
    spin: true,
  },

  PENDING: {
    label: "Pending",
    icon: Clock3,
    tone: "warning",
  },

  COMPLETED: {
    label: "Completed",
    icon: CheckCircle2,
    tone: "success",
  },

  CANCELLED: {
    label: "Cancelled",
    icon: XCircle,
    tone: "danger",
  },

  VOIDED: {
    label: "Voided",
    icon: Ban,
    tone: "danger",
  },

  REVERSED: {
    label: "Reversed",
    icon: RotateCcw,
    tone: "purple",
  },

  FAILED: {
    label: "Failed",
    icon: AlertCircle,
    tone: "danger",
  },

  OPEN: {
    label: "Open",
    icon: FileText,
    tone: "info",
  },

  CLOSED: {
    label: "Closed",
    icon: CheckCircle2,
    tone: "neutral",
  },

  // Payment statuses
  PAID: {
    label: "Paid",
    icon: CheckCircle2,
    tone: "success",
  },

  UNPAID: {
    label: "Unpaid",
    icon: Clock3,
    tone: "danger",
  },

  PARTIAL: {
    label: "Partial",
    icon: Clock3,
    tone: "warning",
  },

  PARTIALLY_PAID: {
    label: "Partially Paid",
    icon: Clock3,
    tone: "warning",
  },

  OVERDUE: {
    label: "Overdue",
    icon: AlertCircle,
    tone: "danger",
  },

  REFUNDED: {
    label: "Refunded",
    icon: RotateCcw,
    tone: "purple",
  },

  PARTIALLY_REFUNDED: {
    label: "Partially Refunded",
    icon: RotateCcw,
    tone: "warning",
  },

  PARTIALLY_INVOICED: {
    label: "Partially Invoiced",
    icon: FileText,
    tone: "warning",
  },

  // Delivery and receiving statuses
  DELIVERED: {
    label: "Delivered",
    icon: Truck,
    tone: "success",
  },

  PARTIALLY_DELIVERED: {
    label: "Partially Delivered",
    icon: Truck,
    tone: "warning",
  },

  SHIPPED: {
    label: "Shipped",
    icon: Truck,
    tone: "info",
  },

  IN_TRANSIT: {
    label: "In Transit",
    icon: Truck,
    tone: "info",
  },

  RECEIVED: {
    label: "Received",
    icon: PackageCheck,
    tone: "success",
  },

  PARTIALLY_RECEIVED: {
    label: "Partially Received",
    icon: PackageCheck,
    tone: "warning",
  },

  NOT_RECEIVED: {
    label: "Not Received",
    icon: Clock3,
    tone: "warning",
  },

  RETURNED: {
    label: "Returned",
    icon: RotateCcw,
    tone: "purple",
  },

  PARTIALLY_RETURNED: {
    label: "Partially Returned",
    icon: RotateCcw,
    tone: "warning",
  },

  // Stock movement types
  OPENING: {
    label: "Opening",
    icon: PackageCheck,
    tone: "info",
  },

  PURCHASE: {
    label: "Purchase",
    icon: PackageCheck,
    tone: "info",
  },

  SALE: {
    label: "Sale",
    icon: Truck,
    tone: "info",
  },

  SALES_RETURN: {
    label: "Sales Return",
    icon: RotateCcw,
    tone: "purple",
  },

  PURCHASE_RETURN: {
    label: "Purchase Return",
    icon: RotateCcw,
    tone: "purple",
  },

  ADJUSTMENT_IN: {
    label: "Adjustment In",
    icon: PackageCheck,
    tone: "success",
  },

  ADJUSTMENT_OUT: {
    label: "Adjustment Out",
    icon: AlertCircle,
    tone: "danger",
  },

  TRANSFER_IN: {
    label: "Transfer In",
    icon: Truck,
    tone: "info",
  },

  TRANSFER_OUT: {
    label: "Transfer Out",
    icon: Truck,
    tone: "warning",
  },

  IN: {
    label: "In",
    icon: PackageCheck,
    tone: "success",
  },

  OUT: {
    label: "Out",
    icon: AlertCircle,
    tone: "danger",
  },
};

const toStatusKey = (value) =>
  String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

const toLabel = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

function StatusField({
  value,
  label,
  className = "",
  size = 14,
}) {
  const key = toStatusKey(value);

  const config = STATUS_CONFIG[key] || {
    label: toLabel(value) || "Unknown",
    icon: Info,
    tone: "neutral",
  };

  const Icon = config.icon || Circle;
  const displayLabel = label || config.label;

  return (
    <span
      className={[
        "status-field",
        `status-field-${config.tone}`,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      title={displayLabel}
    >
      <Icon
        size={size}
        strokeWidth={2}
        aria-hidden="true"
        className={config.spin ? "status-field-spin" : ""}
      />

      <span className="status-field-label">
        {displayLabel}
      </span>
    </span>
  );
}

export default StatusField;