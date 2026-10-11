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

  CONFIRMED: {
    label: "Confirmed",
    icon: CheckCircle2,
    tone: "success",
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

  PARTIAL: {
    label: "Partial",
    icon: Clock3,
    tone: "warning",
  },

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

  REFUNDED: {
    label: "Refunded",
    icon: RotateCcw,
    tone: "purple",
  },

  CANCELLED: {
    label: "Cancelled",
    icon: XCircle,
    tone: "danger",
  },

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

  PARTIALLY_RECEIVED: {
    label: "Partially Received",
    icon: PackageCheck,
    tone: "warning",
  },

  RECEIVED: {
    label: "Received",
    icon: PackageCheck,
    tone: "success",
  },

  OPENING: {
    label: "Opening",
    icon: PackageCheck,
    tone: "info",
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
};

const toStatusKey = (value) => {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
};

const toLabel = (value) => {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

function StatusField({ value, label, className = "", size = 14 }) {
  const key = toStatusKey(value);

  const config = STATUS_CONFIG[key] || {
    label: label || toLabel(value) || "Unknown",
    icon: Info,
    tone: "neutral",
  };

  const Icon = config.icon || Circle;

  return (
    <span
      className={["status-field", `status-field-${config.tone}`, className]
        .filter(Boolean)
        .join(" ")}
      title={config.label}
    >
      <Icon
        size={size}
        strokeWidth={2}
        className={config.spin ? "status-field-spin" : ""}
      />

      <span className="status-field-label">{label || config.label}</span>
    </span>
  );
}

export default StatusField;
