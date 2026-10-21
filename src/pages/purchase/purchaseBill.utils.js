export const GST_RATES = [0, 3, 5, 12, 18, 28];

export const TAX_OPTIONS = [
  { value: "NONE", label: "No GST" },
  { value: "INTRA_STATE", label: "CGST + SGST" },
  { value: "INTER_STATE", label: "IGST" },
];

export const TAX_LABELS = {
  NONE: "No GST",
  INTRA_STATE: "CGST + SGST",
  INTRASTATE: "CGST + SGST",
  INTER_STATE: "IGST",
  INTERSTATE: "IGST",
};

export const EMPTY_TOTALS = {
  gross: 0,
  discount: 0,
  taxable: 0,
  cgst: 0,
  sgst: 0,
  igst: 0,
  total: 0,
};

const formatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatPaise = (value) =>
  formatter.format((Number(value) || 0) / 100);

export const formatDate = (value) => {
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

export const normalizeTaxMode = (value) => {
  const normalized = String(value || "").replace(/_/g, "").toUpperCase();

  if (normalized === "INTRASTATE") return "INTRA_STATE";
  if (normalized === "INTERSTATE") return "INTER_STATE";

  return normalized;
};

export const localDate = () => {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
};

export const addDays = (value, days) => {
  const date = new Date(`${value}T00:00:00Z`);
  const count = Number(days);

  if (
    Number.isNaN(date.getTime()) ||
    !Number.isInteger(count) ||
    count < 0
  ) {
    return value;
  }

  date.setUTCDate(date.getUTCDate() + count);

  return date.toISOString().slice(0, 10);
};

export const getErrors = (error) => {
  const body = error?.response?.data;

  if (Array.isArray(body?.errors) && body.errors.length) {
    return body.errors.map((item) =>
      typeof item === "string"
        ? item
        : item?.message || item?.msg || "Validation failed",
    );
  }

  return [
    body?.message ||
      body?.error ||
      error?.message ||
      "Unable to complete the request.",
  ];
};

export const getErrorMessage = (error) => getErrors(error).join(", ");

export const extractList = (response, key) => {
  const body = response?.data;

  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.[key])) return body[key];
  if (Array.isArray(body)) return body;

  throw new Error(`Invalid ${key} response.`);
};

export const loadAllPages = async (service, key) => {
  if (typeof service?.getAll !== "function") {
    throw new Error(`The ${key} API is not configured.`);
  }

  const records = [];
  let page = 1;

  while (true) {
    const response = await service.getAll({
      page,
      limit: 100,
    });

    const rows = extractList(response, key);

    records.push(...rows);

    const pagination = response?.data?.pagination;

    if (!pagination) break;

    const totalPages = Number(pagination.totalPages);

    if (!Number.isInteger(totalPages) || totalPages < 0) {
      throw new Error(`Invalid ${key} pagination.`);
    }

    if (totalPages === 0 || page >= totalPages) break;

    if (!rows.length) {
      throw new Error(`Incomplete ${key} response.`);
    }

    page += 1;
  }

  return Array.from(
    new Map(
      records.map((record) => [
        record._id ||
          record.billNumber ||
          record.productCode ||
          record.supplierCode,
        record,
      ]),
    ).values(),
  );
};

export const scaledInteger = (value, scale) => {
  if (value === "" || value === null || value === undefined) {
    return null;
  }

  const number = Number(value);
  const scaled = number * scale;
  const integer = Math.round(scaled);

  if (
    !Number.isFinite(number) ||
    number < 0 ||
    !Number.isSafeInteger(integer) ||
    Math.abs(scaled - integer) > 0.000001
  ) {
    return null;
  }

  return integer;
};

const multiplyDivide = (first, second, divisor) => {
  const denominator = BigInt(divisor);

  const result = Number(
    (BigInt(first) * BigInt(second) + denominator / 2n) / denominator,
  );

  if (!Number.isSafeInteger(result)) {
    throw new Error("Amount exceeds the supported range.");
  }

  return result;
};

export const calculatePreview = (item, taxMode) => {
  const invalid = { ...EMPTY_TOTALS, valid: false };

  const quantity = scaledInteger(item.quantity, 1000);
  const rate = scaledInteger(item.unitRate, 100);
  const discount = scaledInteger(item.discountPercent, 100);

  const normalizedTaxMode = normalizeTaxMode(taxMode);

  const gstRate =
    normalizedTaxMode === "NONE" ? 0 : Number(item.gstRate);

  if (
    !item.productId ||
    quantity === null ||
    quantity <= 0 ||
    quantity > 1000000000 ||
    rate === null ||
    rate > 100000000000 ||
    discount === null ||
    discount > 10000 ||
    !GST_RATES.includes(gstRate)
  ) {
    return invalid;
  }

  try {
    const gross = multiplyDivide(rate, quantity, 1000);
    const discountAmount = multiplyDivide(gross, discount, 10000);
    const taxable = gross - discountAmount;
    const tax = multiplyDivide(taxable, gstRate, 100);

    const cgst =
      normalizedTaxMode === "INTRA_STATE" ? Math.floor(tax / 2) : 0;

    const sgst =
      normalizedTaxMode === "INTRA_STATE" ? tax - cgst : 0;

    const igst =
      normalizedTaxMode === "INTER_STATE" ? tax : 0;

    const total = taxable + cgst + sgst + igst;

    if (!Number.isSafeInteger(total)) return invalid;

    return {
      valid: true,
      gross,
      discount: discountAmount,
      taxable,
      cgst,
      sgst,
      igst,
      total,
    };
  } catch {
    return invalid;
  }
};

export const isUnposted = (bill) =>
  ["CREATED", "DRAFT"].includes(bill?.status);