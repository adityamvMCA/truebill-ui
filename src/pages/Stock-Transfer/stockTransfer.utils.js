export const TRANSFER_BASE = "/inventory/stock-transfer";
export const getId = (value) => value && typeof value === "object" ? String(value._id ?? "") : value == null ? "" : String(value);
export const getErrorMessage = (error) => {
  const body = error?.response?.data;
  if (Array.isArray(body?.errors) && body.errors.length) return body.errors.map((item) => typeof item === "string" ? item : item?.message || item?.msg || "Validation failed").join(", ");
  return body?.message || error?.message || "Unable to complete the request.";
};
export const quantityIsValid = (value) => {
  if (String(value ?? "").trim() === "") return false;
  const number = Number(value), scaled = number * 1000, integer = Math.round(scaled);
  return Number.isFinite(number) && number >= 0.001 && number <= 1000000 && Number.isSafeInteger(integer) && Math.abs(scaled - integer) <= 0.000001;
};
export const formatQuantity = (value) => typeof value === "number" && Number.isFinite(value)
  ? value.toLocaleString("en-IN", { maximumFractionDigits: 3 }) : "—";
export const formatPaise = (value) => {
  if (value == null) return "—";
  if (typeof value !== "bigint" && !Number.isSafeInteger(value)) return "—";
  const integer = BigInt(value);
  const sign = integer < 0n ? "-" : "";
  const absolute = integer < 0n ? -integer : integer;
  return `${sign}₹${(absolute / 100n).toLocaleString("en-IN")}.${String(absolute % 100n).padStart(2, "0")}`;
};
export const localDate = () => {
  const date = new Date();
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0")].join("-");
};
export const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }) : "—";
};
export const loadAllPages = async (getter, isCurrent = () => true) => {
  const first = await getter({ page: 1, limit: 100 });
  if (!isCurrent()) return null;
  if (!Array.isArray(first?.data?.data)) throw new Error("The server returned an invalid list response.");
  const records = [...first.data.data];
  const pages = Number(first.data.pagination?.totalPages ?? 1);
  if (!Number.isSafeInteger(pages) || pages < 0) throw new Error("Invalid pagination response.");
  for (let page = 2; page <= pages; page += 1) {
    if (!isCurrent()) return null;
    const response = await getter({ page, limit: 100 });
    if (!isCurrent()) return null;
    if (!Array.isArray(response?.data?.data)) throw new Error("Unable to read a report page.");
    records.push(...response.data.data);
  }
  return records;
};
export const stockBalanceIsValid = (value) => {
  const scaled = value * 1000;
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && Number.isSafeInteger(Math.round(scaled)) && Math.abs(scaled - Math.round(scaled)) <= 0.000001;
};
