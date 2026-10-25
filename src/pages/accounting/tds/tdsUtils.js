
import ledgerApi from "../../../services/modules/ledgerApi";

export const DEDUCTEE_TYPES = [
  { value: "INDIVIDUAL_HUF", label: "Individual / HUF" },
  { value: "COMPANY", label: "Company" },
  { value: "FIRM", label: "Firm" },
  { value: "OTHER", label: "Other" },
];

export const RATE_TYPES = [
  { value: "ALL", label: "All deductee types" },
  ...DEDUCTEE_TYPES,
];

export const REASON_LABELS = {
  DEDUCTED: "Deducted",
  BELOW_THRESHOLD: "Below threshold",
  LOWER_RATE_CERTIFICATE: "Lower-rate certificate",
};

export const STATUS_LABELS = {
  PENDING: {
    label: "To deposit",
    className: "dl-status-pending",
  },
  DEPOSITED: {
    label: "Deposited",
    className: "dl-status-active",
  },
  NOT_DUE: {
    label: "Nil",
    className: "dl-status-created",
  },
};

export const deducteeLabel = (value) =>
  DEDUCTEE_TYPES.find((item) => item.value === value)?.label || value;

// Indian financial year: April to March.
export const fyOf = (date = new Date()) => {
  const start =
    date.getMonth() >= 3
      ? date.getFullYear()
      : date.getFullYear() - 1;

  return `${start}-${String(start + 1).slice(2)}`;
};

export const fyOptions = () => {
  const now = new Date();

  return [0, 1, 2].map((back) =>
    fyOf(
      new Date(
        now.getFullYear() - back,
        now.getMonth(),
        1,
      ),
    ),
  );
};

export const todayInput = () => {
  const date = new Date();
  const pad = (number) => String(number).padStart(2, "0");

  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1,
  )}-${pad(date.getDate())}`;
};

export const errMsg = (error, fallback) =>
  error?.response?.data?.errors?.[0] ||
  error?.response?.data?.message ||
  error?.message ||
  fallback;

// Indian PAN format.
export const PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/;

// Supports the ledger response shape:
// { success: true, count: 33, data: [...] }
const extractLedgerArray = (response) => {
  const body = response?.data;

  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.ledgers)) return body.ledgers;

  throw new Error(
    body?.message || "Invalid ledger API response.",
  );
};

// Loads all ledgers returned by the backend.
// The backend currently returns { success, count, data },
// so this does not depend on pagination metadata.
export const loadLedgers = async () => {
  const response = await ledgerApi.getAll();
  const ledgers = extractLedgerArray(response);

  return ledgers.filter(
    (ledger) => ledger?.isActive !== false,
  );
};

// Use this helper for the TDS payable ledger dropdown.
export const getTdsPayableLedgers = (ledgers = []) =>
  ledgers.filter((ledger) => {
    const group = ledger?.ledgerGroupId;

    const groupNature =
      typeof group === "object" && group !== null
        ? group.nature
        : undefined;

    return (
      String(ledger?.type || "").toUpperCase() === "TAX" &&
      String(ledger?.nature || "").toUpperCase() ===
        "LIABILITY" &&
      ledger?.isActive !== false &&
      (
        !groupNature ||
        String(groupNature).toUpperCase() === "LIABILITY"
      )
    );
  });
