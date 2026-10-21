export const PURCHASE_ORDER_BASE = "/purchase/orders/";

export const orderPath = (orderNumber, action = "") =>
  `${PURCHASE_ORDER_BASE}/${encodeURIComponent(orderNumber)}${
    action ? `/${action}` : ""
  }`;

export const GST_RATES = [0, 3, 5, 12, 18, 28];

export const TAX_OPTIONS = [
  { value: "NONE", label: "No GST" },
  { value: "INTRA_STATE", label: "CGST + SGST" },
  { value: "INTER_STATE", label: "IGST" },
];

export const getId = (value) =>
  String(value?._id || value || "");

export const localDate = () => {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

export const dateValue = (value) =>
  String(value || "").match(/^\d{4}-\d{2}-\d{2}/)?.[0] || "";

export const formatDate = (value) => {
  const text = dateValue(value);

  if (!text) return "—";

  const [year, month, day] = text.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatPaise = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format((Number(value) || 0) / 100);

export const getErrorMessage = (error) => {
  const body = error?.response?.data;

  if (Array.isArray(body?.errors) && body.errors.length) {
    return body.errors
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.message || item?.msg || "Validation error",
      )
      .join(", ");
  }

  return body?.message || error?.message || "Unable to complete the request.";
};

export const getDocument = (response) =>
  response?.data?.data || null;

export const fetchAllPages = async (method, key) => {
  const records = [];
  let page = 1;

  while (true) {
    const response = await method({ page, limit: 100 });
    const body = response?.data;

    const rows = Array.isArray(body?.data)
      ? body.data
      : Array.isArray(body?.[key])
        ? body[key]
        : Array.isArray(body)
          ? body
          : null;

    if (!rows) {
      throw new Error(`Invalid ${key} response`);
    }

    records.push(...rows);

    if (!body?.pagination) break;

    const totalPages = Number(body.pagination.totalPages);

    if (!Number.isInteger(totalPages) || totalPages < 0) {
      throw new Error(`Invalid ${key} pagination`);
    }

    if (page >= totalPages || totalPages === 0) break;

    if (!rows.length) {
      throw new Error(`Incomplete ${key} pagination`);
    }

    page += 1;
  }

  return Array.from(
    new Map(records.map((record) => [getId(record), record])).values(),
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
    (BigInt(first) * BigInt(second) + denominator / 2n) /
      denominator,
  );

  if (!Number.isSafeInteger(result)) {
    throw new Error("Amount exceeds the supported range");
  }

  return result;
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

export const calculatePreview = (item, taxMode) => {
  const invalid = { ...EMPTY_TOTALS, valid: false };

  const quantity = scaledInteger(item.quantity, 1000);
  const rate = scaledInteger(item.unitRate, 100);
  const discount = scaledInteger(item.discountPercent, 100);
  const gstRate = taxMode === "NONE" ? 0 : Number(item.gstRate);

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
      taxMode === "INTRA_STATE" ? Math.floor(tax / 2) : 0;

    const sgst =
      taxMode === "INTRA_STATE" ? tax - cgst : 0;

    const igst =
      taxMode === "INTER_STATE" ? tax : 0;

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

export const storedPreview = (item) => ({
  valid: true,
  gross: item.grossAmountPaise || 0,
  discount: item.discountAmountPaise || 0,
  taxable: item.taxableAmountPaise || 0,
  cgst: item.cgstAmountPaise || 0,
  sgst: item.sgstAmountPaise || 0,
  igst: item.igstAmountPaise || 0,
  total: item.totalAmountPaise || 0,
});