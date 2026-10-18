import { useEffect, useState } from "react";

export const SALES_PATHS = {
  list: "/sales/invoices",
  create: "/sales/invoices/create",

  view: (number) =>
    `/sales/invoices/view/${encodeURIComponent(number)}`,

  edit: (number) =>
    `/sales/invoices/edit/${encodeURIComponent(number)}`,
};

export const GST_RATES = [0, 3, 5, 12, 18, 28];

export const TAX_OPTIONS = [
  { value: "NONE", label: "No GST" },
  { value: "INTRA_STATE", label: "CGST + SGST" },
  { value: "INTER_STATE", label: "IGST" },
];

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

export const inputDate = (value) => {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : date.toISOString().slice(0, 10);
};

export const localDate = () => {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

export const addDays = (value, days) => {
  const date = new Date(`${value}T00:00:00Z`);
  const count = Number(days);

  if (
    Number.isNaN(date.getTime()) ||
    !Number.isSafeInteger(count) ||
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
        : item?.message || item?.msg || "Invalid field",
    );
  }

  return [
    body?.message ||
      error?.message ||
      "Unable to complete the request.",
  ];
};

export const extractList = (response, key) => {
  const body = response?.data;

  if (body?.success === false) {
    throw new Error(body.message || `Unable to load ${key}.`);
  }

  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.[key])) return body[key];
  if (Array.isArray(body)) return body;

  throw new Error(`Invalid ${key} list response.`);
};

export const loadAllPages = async (service, key) => {
  if (typeof service?.getAll !== "function") {
    throw new Error(`The ${key} API is not configured.`);
  }

  const first = await service.getAll({
    page: 1,
    limit: 100,
  });

  const records = [...extractList(first, key)];

  const pages = Math.max(
    1,
    Number(
      first?.data?.pagination?.totalPages ??
        first?.data?.totalPages ??
        1,
    ) || 1,
  );

  for (let page = 2; page <= pages; page += 1) {
    const response = await service.getAll({
      page,
      limit: 100,
    });

    records.push(...extractList(response, key));
  }

  return Array.from(
    new Map(
      records.map((record) => [
        String(record._id || record.id),
        record,
      ]),
    ).values(),
  );
};

const scaledInteger = (value, scale) => {
  if (
    value === "" ||
    value === null ||
    value === undefined
  ) {
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
    (
      BigInt(first) * BigInt(second) +
      denominator / 2n
    ) / denominator,
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
    !GST_RATES.includes(gstRate) ||
    !TAX_OPTIONS.some((option) => option.value === taxMode)
  ) {
    return invalid;
  }

  try {
    const gross = multiplyDivide(rate, quantity, 1000);

    const discountAmount = multiplyDivide(
      gross,
      discount,
      10000,
    );

    const taxable = gross - discountAmount;
    const tax = multiplyDivide(taxable, gstRate, 100);

    const cgst =
      taxMode === "INTRA_STATE" ? Math.floor(tax / 2) : 0;

    const sgst =
      taxMode === "INTRA_STATE" ? tax - cgst : 0;

    const igst = taxMode === "INTER_STATE" ? tax : 0;
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

export const itemSnapshot = (items) =>
  items.map(({ rowId, ...item }) => item);

export const useTenantRevision = () => {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const change = () => {
      setRevision((value) => value + 1);
    };

    window.addEventListener("tenantChanged", change);

    return () => {
      window.removeEventListener("tenantChanged", change);
    };
  }, []);

  return revision;
};