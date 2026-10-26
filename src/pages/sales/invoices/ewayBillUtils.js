export const EWB_THRESHOLD_PAISE = 5_000_000;

const IST_OFFSET_MS = 330 * 60 * 1000;

export const TRANSPORT_MODE_OPTIONS = [
  { value: "ROAD", label: "Road" },
  { value: "RAIL", label: "Rail" },
  { value: "AIR", label: "Air" },
  { value: "SHIP", label: "Ship" },
];

export const VEHICLE_TYPE_OPTIONS = [
  { value: "REGULAR", label: "Regular" },
  { value: "ODC", label: "Over dimensional cargo" },
];

export const CANCEL_REASON_OPTIONS = [
  { value: "DUPLICATE", label: "Duplicate" },
  { value: "ORDER_CANCELLED", label: "Order cancelled" },
  { value: "DATA_ENTRY_MISTAKE", label: "Data entry mistake" },
  { value: "OTHERS", label: "Others" },
];

export const VEHICLE_REASON_OPTIONS = [
  { value: "BREAKDOWN", label: "Breakdown" },
  { value: "TRANSHIPMENT", label: "Transhipment" },
  { value: "FIRST_TIME", label: "First time" },
  { value: "OTHERS", label: "Others" },
];

export const EXTEND_REASON_OPTIONS = [
  { value: "NATURAL_CALAMITY", label: "Natural calamity" },
  { value: "LAW_AND_ORDER", label: "Law and order" },
  { value: "TRANSSHIPMENT", label: "Transhipment" },
  { value: "ACCIDENT", label: "Accident" },
  { value: "OTHERS", label: "Others" },
];

export const STATE_OPTIONS = [
  ["01", "Jammu and Kashmir"],
  ["02", "Himachal Pradesh"],
  ["03", "Punjab"],
  ["04", "Chandigarh"],
  ["05", "Uttarakhand"],
  ["06", "Haryana"],
  ["07", "Delhi"],
  ["08", "Rajasthan"],
  ["09", "Uttar Pradesh"],
  ["10", "Bihar"],
  ["11", "Sikkim"],
  ["12", "Arunachal Pradesh"],
  ["13", "Nagaland"],
  ["14", "Manipur"],
  ["15", "Mizoram"],
  ["16", "Tripura"],
  ["17", "Meghalaya"],
  ["18", "Assam"],
  ["19", "West Bengal"],
  ["20", "Jharkhand"],
  ["21", "Odisha"],
  ["22", "Chhattisgarh"],
  ["23", "Madhya Pradesh"],
  ["24", "Gujarat"],
  ["26", "Dadra and Nagar Haveli and Daman and Diu"],
  ["27", "Maharashtra"],
  ["29", "Karnataka"],
  ["30", "Goa"],
  ["31", "Lakshadweep"],
  ["32", "Kerala"],
  ["33", "Tamil Nadu"],
  ["34", "Puducherry"],
  ["35", "Andaman and Nicobar Islands"],
  ["36", "Telangana"],
  ["37", "Andhra Pradesh"],
  ["38", "Ladakh"],
  ["97", "Other Territory"],
].map(([value, label]) => ({
  value,
  label: `${label} (${value})`,
}));

/*
 * Returns the goods items on an invoice.
 * An empty array means the invoice does not contain identifiable goods.
 */
export const goodsOf = (invoice) => {
  if (!Array.isArray(invoice?.items)) {
    return [];
  }

  return invoice.items.filter(
    (item) => String(item?.productType || "").trim().toUpperCase() === "GOODS",
  );
};

/*
 * Invoice amounts are stored in paise.
 * Do not use the invoice total here because it can include services.
 */
export const goodsValuePaise = (invoice) =>
  goodsOf(invoice).reduce((sum, item) => {
    const amount = Number(item?.totalAmountPaise);

    return Number.isSafeInteger(amount) && amount >= 0 ? sum + amount : sum;
  }, 0);

/*
 * Mandatory threshold check: goods value must be greater than ₹50,000.
 */
export const isRequired = (invoice) =>
  goodsOf(invoice).length > 0 && goodsValuePaise(invoice) > EWB_THRESHOLD_PAISE;

/*
 * NOT_APPLICABLE | NOT_REQUIRED | PENDING | GENERATED | EXPIRED | CANCELLED
 * Mirrors deriveState in the backend rules file.
 * Needs full invoices (with items), not list rows.
 */
export const deriveState = (invoice, now = new Date()) => {
  const ewb = invoice?.ewayBill || {};

  if (ewb.status === "GENERATED") {
    if (ewb.validUntil) {
      const validUntil = new Date(ewb.validUntil);

      if (!Number.isNaN(validUntil.getTime()) && validUntil <= now) {
        return "EXPIRED";
      }
    }

    return "GENERATED";
  }

  if (goodsOf(invoice).length === 0) {
    return "NOT_APPLICABLE";
  }

  if (ewb.status === "CANCELLED") {
    return "CANCELLED";
  }

  return isRequired(invoice) ? "PENDING" : "NOT_REQUIRED";
};

export const STATE_LABEL = {
  NOT_APPLICABLE: "Not applicable",
  NOT_REQUIRED: "Not required",
  PENDING: "Pending",
  GENERATED: "Generated",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

/*
 * Suggestion only. The validity returned by the government portal
 * is authoritative. Matches the backend computeValidUntil.
 */
export const suggestValidUntil = (generatedAt, distanceKm, vehicleType) => {
  const distance = Number(distanceKm);

  if (!generatedAt || !Number.isFinite(distance) || distance < 1) {
    return null;
  }

  const days = Math.max(
    1,
    Math.ceil(distance / (vehicleType === "ODC" ? 20 : 200)),
  );

  const generatedDate = new Date(generatedAt);

  if (Number.isNaN(generatedDate.getTime())) {
    return null;
  }

  const shifted = new Date(generatedDate.getTime() + IST_OFFSET_MS);

  return new Date(
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate() + days,
      23,
      59,
      59,
      999,
    ) - IST_OFFSET_MS,
  );
};

/* ISO instant -> local value for input[type="datetime-local"] */
export const toLocalInput = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (number) => String(number).padStart(2, "0");

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
};

/* Local datetime input -> ISO instant */
export const fromLocalInput = (value) => {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
};

export const formatDateTime = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const dateOnlyInput = (value) => {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};