export const RFQ_BASE = "/purchase/rfq";

export const rfqPath = (number, action = "") =>
  `${RFQ_BASE}/${encodeURIComponent(number)}${action ? `/${action}` : ""}`;

export const getId = (value) => String(value?._id || value || "");

export const localDate = () => {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
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

export const formatQuantity = (value) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 3,
  }).format(Number(value) || 0);

export const getDocument = (response) => response?.data?.data || null;

export const getErrorMessage = (error) => {
  const body = error?.response?.data;

  if (Array.isArray(body?.errors) && body.errors.length) {
    return body.errors
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.message || item?.msg || "Validation failed",
      )
      .join(", ");
  }

  return (
    body?.message ||
    body?.error ||
    error?.message ||
    "Unable to complete the request."
  );
};

export const quantityIsValid = (value) => {
  if (String(value ?? "").trim() === "") return false;

  const number = Number(value);
  const scaled = number * 1000;
  const rounded = Math.round(scaled);

  return (
    Number.isFinite(number) &&
    number >= 0.001 &&
    number <= 1000000 &&
    Number.isSafeInteger(rounded) &&
    Math.abs(scaled - rounded) <= 0.000001
  );
};

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
      throw new Error(`Invalid ${key} response.`);
    }

    records.push(...rows);

    if (!body?.pagination) break;

    const totalPages = Number(body.pagination.totalPages);

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
      records.map((record) => [record._id || record.rfqNumber, record]),
    ).values(),
  );
};
