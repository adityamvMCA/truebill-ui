import ledgerApi from "../../../services/modules/ledgerApi";

export const DEDUCTEE_TYPES = [
  { value: "INDIVIDUAL_HUF", label: "Individual / HUF" },
  { value: "COMPANY", label: "Company" },
  { value: "FIRM", label: "Firm" },
  { value: "OTHER", label: "Other" },
];

export const RATE_TYPES = [{ value: "ALL", label: "All deductee types" }, ...DEDUCTEE_TYPES];

export const REASON_LABELS = {
  DEDUCTED: "Deducted",
  BELOW_THRESHOLD: "Below threshold",
  LOWER_RATE_CERTIFICATE: "Lower-rate certificate",
};

export const STATUS_LABELS = {
  PENDING: { label: "To deposit", className: "dl-status-pending" },
  DEPOSITED: { label: "Deposited", className: "dl-status-active" },
  NOT_DUE: { label: "Nil", className: "dl-status-created" },
};

export const deducteeLabel = (v) => DEDUCTEE_TYPES.find((d) => d.value === v)?.label || v;

// Indian financial year, April to March.
export const fyOf = (d = new Date()) => {
  const start = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `${start}-${String(start + 1).slice(2)}`;
};

export const fyOptions = () => {
  const now = new Date();
  return [0, 1, 2].map((back) => fyOf(new Date(now.getFullYear() - back, now.getMonth(), 1)));
};

export const todayInput = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const errMsg = (e, fallback) =>
  e?.response?.data?.errors?.[0] || e?.response?.data?.message || e?.message || fallback;

export const PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/;

// Loads every ledger (paged) so dropdowns can filter by type.
export const loadLedgers = async () => {
  const all = [];
  let page = 1;
  let totalPages = 1;
  do {
    const res = await ledgerApi.getAll({ page, limit: 100 });
    const body = res?.data;
    const list = body?.data ?? body?.ledgers ?? body;
    if (!Array.isArray(list)) throw new Error(body?.message || "Invalid ledger response.");
    all.push(...list);
    totalPages = Number(body?.pagination?.totalPages) || 1;
    page += 1;
  } while (page <= totalPages && page <= 50);
  return all.filter((l) => l.isActive !== false);
};
