export const COMPARISON_BASE = "/purchase/quotation-comparison";

export const getId = (value) => String(value?._id || value || "");

export const dateValue = (value) =>
  String(value || "").match(/^\d{4}-\d{2}-\d{2}/)?.[0] || "";

export const localDate = () => {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

export const formatDate = (value) => {
  const text = dateValue(value);

  if (!text) return "Not specified";

  const [year, month, day] = text.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format((Number(value) || 0) / 100);

export const formatQuantity = (value) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 3,
  }).format(Number(value) || 0);

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

export const isCancelledRequest = (error) =>
  error?.code === "ERR_CANCELED" ||
  error?.name === "CanceledError" ||
  error?.name === "AbortError";

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

    const body = response?.data;

    const rows = Array.isArray(body?.data)
      ? body.data
      : Array.isArray(body?.suppliers)
        ? body.suppliers
        : Array.isArray(body)
          ? body
          : null;

    if (!rows) {
      throw new Error("Invalid list response.");
    }

    records.push(...rows);

    if (!body?.pagination) break;

    const totalPages = Number(body.pagination.totalPages);

    if (!Number.isInteger(totalPages) || totalPages < 0) {
      throw new Error("Invalid list pagination.");
    }

    if (totalPages === 0 || page >= totalPages) break;

    if (!rows.length) {
      throw new Error("Incomplete list response.");
    }

    page += 1;
  }

  return Array.from(
    new Map(records.map((record) => [getId(record), record])).values(),
  );
};
