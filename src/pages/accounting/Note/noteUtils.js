// Shared by the list and the form. Mirrors computeLine() in note.service.js
// so the live preview always matches what the server will post.

export const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28];

export const REASONS = [
  { value: "SALES_RETURN", label: "Sales return", goods: true },
  { value: "PURCHASE_RETURN", label: "Purchase return", goods: true },
  { value: "DAMAGED_GOODS", label: "Damaged goods", goods: true },
  { value: "QUANTITY_SHORTAGE", label: "Quantity shortage", goods: true },
  { value: "PRICE_ADJUSTMENT", label: "Price adjustment", goods: false },
  { value: "DISCOUNT", label: "Post-sale discount", goods: false },
  { value: "RATE_DIFFERENCE", label: "Rate difference", goods: false },
  { value: "TAX_CORRECTION", label: "Tax correction", goods: false },
  { value: "OTHER", label: "Other", goods: false },
];

export const NOTE_LABELS = {
  CREDIT_NOTE: "Credit Note",
  DEBIT_NOTE: "Debit Note",
};

// What the note does to the books, shown as a hint under the type picker.
export const EFFECTS = {
  "CUSTOMER:CREDIT_NOTE": "Reduces what the customer owes and your output GST.",
  "CUSTOMER:DEBIT_NOTE":
    "Increases what the customer owes and your output GST.",
  "SUPPLIER:DEBIT_NOTE":
    "Reduces what you owe the supplier and reverses input credit.",
  "SUPPLIER:CREDIT_NOTE":
    "Increases what you owe the supplier and adds input credit.",
};

export const rupeeFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
});

export const money = (paise) =>
  rupeeFormatter.format((Number(paise) || 0) / 100);

// "1,234.50" -> 123450. Returns null for anything that is not a valid amount.
export const rupeesToPaise = (input) => {
  const cleaned = String(input ?? "")
    .replace(/,/g, "")
    .trim();
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  const paise = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  return Number.isSafeInteger(paise) ? paise : null;
};

export const computeTax = (taxablePaise, gstRate, isInterState) => {
  const tax = Math.round((taxablePaise * gstRate) / 100);
  if (isInterState) return { cgst: 0, sgst: 0, igst: tax };
  const cgst = Math.floor(tax / 2);
  return { cgst, sgst: tax - cgst, igst: 0 };
};

export const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : "-";

// RFC 4122 UUID v4. crypto.randomUUID needs HTTPS/localhost, so fall back to getRandomValues.
export const uuidv4 = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // variant 10xx
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};
