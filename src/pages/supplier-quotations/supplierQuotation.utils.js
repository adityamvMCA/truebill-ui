export {
  GST_RATES,
  TAX_OPTIONS,
  EMPTY_TOTALS,
  calculatePreview,
  storedPreview,
  dateValue,
  fetchAllPages,
  formatDate,
  formatPaise,
  getDocument,
  getErrorMessage,
  getId,
  localDate,
  scaledInteger,
} from "../purchase-orders/purchaseOrder.utils";

export const SUPPLIER_QUOTATION_BASE = "/purchase/supplier-quotations";

export const supplierQuotationPath = (quotationNumber, action = "") => {
  const number = String(quotationNumber ?? "").trim();

  if (!number || ["undefined", "null"].includes(number.toLowerCase())) {
    throw new Error("Supplier Quotation number is required.");
  }

  return (
    `${SUPPLIER_QUOTATION_BASE}/${encodeURIComponent(number)}` +
    (action ? `/${action}` : "")
  );
};

