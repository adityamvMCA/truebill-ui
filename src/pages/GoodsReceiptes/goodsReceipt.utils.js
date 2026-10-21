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

export const getId = (value) => String(value?._id || value || "");

export const getDocument = (response) => response?.data?.data || null;

export const localToday = () => {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

export const dateInputValue = (value) =>
  String(value || "").match(/^\d{4}-\d{2}-\d{2}/)?.[0] || "";

export const formatDate = (value) => {
  const dateOnly = dateInputValue(value);

  if (!dateOnly) return "—";

  const [year, month, day] = dateOnly.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatQuantity = (value) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 3,
  }).format(Number(value) || 0);

export const formatMoney = (paise) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format((Number(paise) || 0) / 100);

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

export const rupeesToPaise = (value) => {
  if (String(value).trim() === "") {
    throw new Error("Estimated unit rate is required");
  }

  const number = Number(value);
  const scaled = number * 100;
  const rounded = Math.round(scaled);

  if (
    !Number.isFinite(number) ||
    number < 0 ||
    number > 1000000000 ||
    !Number.isSafeInteger(rounded) ||
    Math.abs(scaled - rounded) > 0.000001
  ) {
    throw new Error("Estimated unit rate must have at most two decimal places");
  }

  return rounded;
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

const extractRows = (response) => {
  const body = response?.data;

  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.products)) return body.products;
  if (Array.isArray(body?.suppliers)) return body.suppliers;
  if (Array.isArray(body)) return body;

  throw new Error("The server returned an invalid list response");
};

// The supplied DataList usage performs client-side pagination.
// Fetch every advertised API page instead of silently limiting to 100.
export const fetchAllPages = async (method, params = {}, signal) => {
  const records = [];
  let page = 1;

  while (true) {
    const response = await method(
      {
        ...params,
        page,
        limit: 100,
      },
      { signal },
    );

    const rows = extractRows(response);
    records.push(...rows);

    const pagination = response?.data?.pagination;

    // An unpaginated response is treated as the complete list.
    if (!pagination) break;

    const totalPages = Number(pagination.totalPages);

    if (!Number.isInteger(totalPages) || totalPages < 0) {
      throw new Error("The server returned invalid pagination");
    }

    if (page >= totalPages || totalPages === 0) break;

    if (rows.length === 0) {
      throw new Error("The server returned an incomplete paginated list");
    }

    page += 1;
  }

  return records;
};
