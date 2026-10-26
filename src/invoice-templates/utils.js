import { DEFAULTS, LABELS } from './templates.config';

export const rs = (paise = 0) =>
  (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const two = (n) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : ''));
const three = (n) => (n > 99 ? ONES[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' : '') : '') + (n % 100 ? two(n % 100) : '');

export function amountInWords(paise = 0) {
  const r = Math.floor(paise / 100), p = paise % 100;
  if (!r && !p) return 'Zero Rupees Only';
  const parts = [];
  const cr = Math.floor(r / 1e7), lk = Math.floor(r / 1e5) % 100, th = Math.floor(r / 1e3) % 100, rest = r % 1000;
  if (cr) parts.push(three(cr) + ' Crore');
  if (lk) parts.push(two(lk) + ' Lakh');
  if (th) parts.push(two(th) + ' Thousand');
  if (rest) parts.push(three(rest));
  let s = 'Rupees ' + (parts.join(' ') || 'Zero');
  if (p) s += ' and ' + two(p) + ' Paise';
  return s + ' Only';
}

/* address can be a string or an object { line1, line2, city, state, pincode } */
export function addrText(a) {
  if (!a) return '';
  if (typeof a === 'string') return a;
  return [a.line1 || a.street, a.line2, [a.city, a.state].filter(Boolean).join(', '), a.pincode || a.pin]
    .filter(Boolean).join('\n');
}

export function hsnSummary(items) {
  const m = {};
  items.forEach((it) => {
    const key = `${it.hsn || '-'}|${it.taxPercent}`;
    const x = (m[key] = m[key] || { hsn: it.hsn || '-', rate: it.taxPercent, taxable: 0 });
    x.taxable += it.amountPaise;
  });
  return Object.values(m).map((x) => {
    const tax = Math.round((x.taxable * x.rate) / 100);
    return { ...x, tax, half: Math.round(tax / 2) };
  });
}

export const upiLink = (co, inv, v) =>
  `upi://pay?pa=${encodeURIComponent(co.upi)}&pn=${encodeURIComponent(co.name)}` +
  `${v.due > 0 ? `&am=${(v.due / 100).toFixed(2)}` : ''}&cu=INR&tn=${encodeURIComponent('Invoice ' + inv.invoiceNumber)}`;

export function resolveTemplate(list, id, override = {}) {
  const base = list.find((t) => t.id === id) || list[0];
  return { ...DEFAULTS, ...base, ...override, show: { ...DEFAULTS.show, ...base.show, ...override.show } };
}

/* ---- line item normaliser ----
   Accepts several common key names. Money is expected in paise.
   If your items carry rupees (rate / amount), they are converted. */
const pick = (o, keys) => {
  for (const k of keys) if (o?.[k] !== undefined && o?.[k] !== null && o?.[k] !== '') return o[k];
  return undefined;
};
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const text = (v) => (v && typeof v === 'object' ? v.name ?? v.itemName ?? v.title ?? '' : v);

function normaliseItem(i, fallbackRate) {
  const qty = num(pick(i, ['qty', 'quantity', 'billedQty', 'billedQuantity', 'orderedQty'])) || 1;

  const paise = (paiseKeys, rupeeKeys) => {
    const p = pick(i, paiseKeys);
    if (p !== undefined) return Math.round(num(p));
    const r = pick(i, rupeeKeys);
    return r !== undefined ? Math.round(num(r) * 100) : undefined;
  };

  let ratePaise = paise(
    ['ratePaise', 'unitPricePaise', 'pricePaise', 'sellingPricePaise', 'unitRatePaise'],
    ['rate', 'unitPrice', 'price', 'sellingPrice'],
  );
  let amountPaise = paise(
    ['amountPaise', 'taxableAmountPaise', 'taxableValuePaise', 'lineTotalPaise', 'netAmountPaise', 'totalPaise'],
    ['amount', 'taxableAmount', 'lineTotal', 'netAmount', 'total'],
  );

  if (ratePaise === undefined && amountPaise !== undefined) ratePaise = Math.round(amountPaise / qty);
  if (amountPaise === undefined) amountPaise = Math.round(qty * (ratePaise || 0));

  return {
    ...i,
    name: text(pick(i, ['name', 'itemName', 'productName', 'item', 'product', 'title', 'description'])) || LABELS.defaultItemName,
    description: i.name || i.itemName ? i.description : undefined,
    hsn: pick(i, ['hsn', 'hsnCode', 'hsnSac', 'sacCode', 'hsnSacCode']),
    qty,
    unit: pick(i, ['unit', 'uom', 'unitName', 'unitOfMeasure']) || '',
    ratePaise: ratePaise || 0,
    taxPercent: num(pick(i, ['taxPercent', 'gstPercent', 'gstRate', 'taxRate', 'taxPct'])) || fallbackRate,
    amountPaise,
  };
}

/* Turns the API payload into what the templates print.
   If invoice.items is missing/empty, one summary row is shown. */
export function buildInvoiceVM(inv = {}) {
  const taxable = inv.taxableAmountPaise || 0;
  const cgst = inv.cgstAmountPaise || 0, sgst = inv.sgstAmountPaise || 0, igst = inv.igstAmountPaise || 0;
  const rate = taxable ? +(((cgst + sgst + igst) / taxable) * 100).toFixed(2) : 0;
  const inter = inv.taxMode === 'INTER_STATE' || igst > 0;
  const raw = Array.isArray(inv.items) && inv.items.length
    ? inv.items
    : [{ name: LABELS.defaultItemName, qty: 1, ratePaise: taxable, amountPaise: taxable }];
  const items = raw.map((i) => normaliseItem(i, rate));
  const rows = [
    [LABELS.subTotal, inv.grossAmountPaise ?? taxable],
    inv.discountAmountPaise > 0 && [LABELS.discount, -inv.discountAmountPaise],
    [LABELS.taxable, taxable],
    ...(inter
      ? [[`IGST (${rate}%)`, igst]]
      : [[`CGST (${rate / 2}%)`, cgst], [`SGST (${rate / 2}%)`, sgst]]),
  ].filter(Boolean);
  return { items, hsn: hsnSummary(items), rows, rate, inter, total: inv.totalAmountPaise || 0, paid: inv.paidAmountPaise || 0, due: inv.outstandingAmountPaise || 0 };
}