export const getErrorMessage = (error) => {
  const data = error?.response?.data;

  if (Array.isArray(data?.errors) && data.errors.length) {
    return data.errors
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.message || item?.msg || "Validation error",
      )
      .join(", ");
  }

  if (typeof data?.message === "string") return data.message;
  if (typeof data?.error === "string") return data.error;

  return error?.message || "Something went wrong. Please try again.";
};

export const isCancelledRequest = (error) =>
  error?.code === "ERR_CANCELED" ||
  error?.name === "CanceledError" ||
  error?.name === "AbortError";

export const getReturn = (response) =>
  response?.data?.data || response?.data?.purchaseReturn || null;

export const getBill = (response) =>
  response?.data?.bill || response?.data?.data || null;

export const getId = (value) => String(value?._id || value || "");

export const formatMoney = (paise) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format((Number(paise) || 0) / 100);

export const formatQuantity = (value) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 3,
  }).format(Number(value) || 0);

export const formatDate = (value) => {
  if (!value) return "—";

  // Preserve date-only document dates without timezone conversion.
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);

  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const dateInputValue = (value) => {
  if (!value) return "";

  const match = String(value).match(/^\d{4}-\d{2}-\d{2}/);

  return match?.[0] || "";
};

export const localToday = () => {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

export const createRequestId = () => {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  if (!globalThis.crypto?.getRandomValues) {
    throw new Error(
      "Secure request ID generation is unavailable. Open the app over HTTPS.",
    );
  }

  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0"));

  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
};

export const toMilli = (value) => {
  const number = Number(value);
  const scaled = number * 1000;
  const rounded = Math.round(scaled);

  if (
    !Number.isFinite(number) ||
    number < 0 ||
    !Number.isSafeInteger(rounded) ||
    Math.abs(scaled - rounded) > 0.000001
  ) {
    throw new Error("Quantity must have at most three decimal places");
  }

  return rounded;
};

// DataList integration below uses client-side filtering/pagination.
// Load every API page rather than silently showing only the first 100.
export const fetchAllReturns = async (apiMethod, params = {}, signal) => {
  const records = [];
  const limit = 100;

  let page = 1;

  while (true) {
    const response = await apiMethod(
      {
        ...params,
        page,
        limit,
      },
      { signal },
    );

    const rows = response?.data?.data;
    const pagination = response?.data?.pagination;

    if (!Array.isArray(rows)) {
      throw new Error("Invalid Purchase Returns response");
    }

    records.push(...rows);

    const totalPages = Number(pagination?.totalPages);

    if (pagination && Number.isInteger(totalPages) && totalPages >= 0) {
      if (page >= totalPages || totalPages === 0) break;

      if (rows.length === 0) {
        throw new Error("Purchase Returns pagination is inconsistent");
      }
    } else if (rows.length < limit) {
      break;
    }

    page += 1;
  }

  return records;
};

const proportionalAmount = (amount, quantity, totalQuantity) => {
  if (
    !Number.isSafeInteger(amount) ||
    amount < 0 ||
    !Number.isSafeInteger(quantity) ||
    quantity < 0 ||
    !Number.isSafeInteger(totalQuantity) ||
    totalQuantity <= 0
  ) {
    throw new Error("Invalid source bill amounts");
  }

  const numerator = BigInt(amount) * BigInt(quantity);
  const denominator = BigInt(totalQuantity);

  const result = Number((numerator + denominator / 2n) / denominator);

  if (!Number.isSafeInteger(result)) {
    throw new Error("Amount exceeds the supported range");
  }

  return result;
};

export const previewReturnLine = (line, quantity) => {
  const requestedMilli = toMilli(quantity);

  if (
    requestedMilli <= 0 ||
    requestedMilli > line.remainingMilli ||
    requestedMilli > 1000000000
  ) {
    throw new Error(`Enter a valid available quantity for ${line.productName}`);
  }

  const previousMilli = line.returnedMilli;
  const cumulativeMilli = previousMilli + requestedMilli;
  const originalMilli = toMilli(line.quantity);

  const amounts = {};

  for (const field of [
    "discountAmountPaise",
    "taxableAmountPaise",
    "cgstAmountPaise",
    "sgstAmountPaise",
    "igstAmountPaise",
  ]) {
    amounts[field] =
      proportionalAmount(line[field], cumulativeMilli, originalMilli) -
      proportionalAmount(line[field], previousMilli, originalMilli);
  }

  amounts.grossAmountPaise =
    amounts.taxableAmountPaise + amounts.discountAmountPaise;

  amounts.taxAmountPaise =
    amounts.cgstAmountPaise + amounts.sgstAmountPaise + amounts.igstAmountPaise;

  amounts.totalAmountPaise =
    amounts.taxableAmountPaise + amounts.taxAmountPaise;

  return {
    ...amounts,
    quantity: requestedMilli / 1000,
  };
};
