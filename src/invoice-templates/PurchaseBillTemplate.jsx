import { COMPANY, LABELS as L } from "./templates.config";
import { PURCHASE_BILL_TEMPLATES } from "./purchaseBill.templates";
import { rs, fmtDate, amountInWords, addrText, resolveTemplate } from "./utils";
import { Header, docVars, useDocStyles } from "./shared";
import { getTenantCompany } from "./tenantCompany";

const PB_LABELS = {
  title: "PURCHASE BILL",
  billFrom: "Supplier (Bill From)",
  billTo: "Billed To (Purchaser)",
  billNo: "Bill No.",
  supplierInvoiceNo: "Supplier Inv. No.",
  billDate: "Bill Date",
  invDate: "Supplier Inv. Date",
  dueDate: "Due Date",
  paymentTerms: "Payment Terms",
  taxMode: "Tax Mode",
  sno: "#",
  item: "Item / Service Description",
  hsn: "HSN/SAC",
  qty: "Qty",
  rate: "Price/Item",
  discount: "Disc %",
  tax: "GST %",
  amount: "Amount",
  subTotal: "Gross Amount",
  taxable: "Taxable Value",
  total: "Total Bill Amount",
  paid: "Amount Paid",
  due: "Balance Due",
  inWords: "Amount in Words",
  notes: "Notes / Terms",
  signatory: "Authorised Signatory",
  receivedBy: "Received By / Store Incharge",
  forCompany: "For",
};

const pick = (o, keys) => {
  for (const k of keys) {
    if (o?.[k] !== undefined && o?.[k] !== null && o?.[k] !== "") return o[k];
  }
  return undefined;
};

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const text = (v) => (v && typeof v === "object" ? v.name ?? v.itemName ?? v.title ?? "" : v);

export function buildPurchaseBillVM(bill = {}) {
  const taxable =
    bill.taxableAmountPaise !== undefined
      ? bill.taxableAmountPaise
      : Math.round(num(bill.taxableAmount) * 100);

  const cgst =
    bill.cgstAmountPaise !== undefined
      ? bill.cgstAmountPaise
      : Math.round(num(bill.cgstAmount) * 100);
  const sgst =
    bill.sgstAmountPaise !== undefined
      ? bill.sgstAmountPaise
      : Math.round(num(bill.sgstAmount) * 100);
  const igst =
    bill.igstAmountPaise !== undefined
      ? bill.igstAmountPaise
      : Math.round(num(bill.igstAmount) * 100);

  const inter = bill.taxMode === "INTER_STATE" || bill.taxMode === "INTERSTATE" || igst > 0;

  const rawItems = Array.isArray(bill.items) && bill.items.length
    ? bill.items
    : [
        {
          name: bill.description || "Goods / Services Purchased",
          qty: 1,
          ratePaise: taxable,
          amountPaise: taxable,
        },
      ];

  const items = rawItems.map((i) => {
    const qty = num(pick(i, ["quantity", "qty", "billedQty", "orderedQty"])) || 1;
    let ratePaise = pick(i, ["ratePaise", "unitPricePaise", "pricePaise"]);
    if (ratePaise === undefined) {
      const r = pick(i, ["unitRate", "rate", "price", "unitPrice"]);
      ratePaise = r !== undefined ? Math.round(num(r) * 100) : 0;
    } else {
      ratePaise = Math.round(num(ratePaise));
    }

    let amountPaise = pick(i, ["amountPaise", "totalPaise", "netAmountPaise", "lineTotalPaise"]);
    if (amountPaise === undefined) {
      const a = pick(i, ["amount", "total", "netAmount", "lineTotal"]);
      amountPaise = a !== undefined ? Math.round(num(a) * 100) : Math.round(qty * ratePaise);
    } else {
      amountPaise = Math.round(num(amountPaise));
    }

    const gstRate = num(pick(i, ["gstRate", "taxPercent", "taxRate", "gstPercent"])) || 0;

    return {
      name: text(pick(i, ["name", "productName", "description", "newName", "item"])) || "Purchased Item",
      description: i.description && i.name ? i.description : undefined,
      hsn: pick(i, ["hsnSacCode", "hsn", "hsnCode", "sacCode"]) || "-",
      qty,
      unit: pick(i, ["unit", "unitName", "uom"]) || "NOS",
      ratePaise,
      discountPercent: num(pick(i, ["discountPercent", "discount", "discountRate"])) || 0,
      taxPercent: gstRate,
      amountPaise,
    };
  });

  // HSN summary
  const hsnMap = {};
  items.forEach((it) => {
    const key = `${it.hsn}|${it.taxPercent}`;
    if (!hsnMap[key]) {
      hsnMap[key] = { hsn: it.hsn, rate: it.taxPercent, taxable: 0 };
    }
    hsnMap[key].taxable += it.amountPaise;
  });

  const hsn = Object.values(hsnMap).map((entry) => {
    const tax = Math.round((entry.taxable * entry.rate) / 100);
    return { ...entry, tax, half: Math.round(tax / 2) };
  });

  const gross =
    bill.grossAmountPaise !== undefined
      ? bill.grossAmountPaise
      : Math.round(num(bill.grossAmount) * 100) || taxable;
  const discount =
    bill.discountAmountPaise !== undefined
      ? bill.discountAmountPaise
      : Math.round(num(bill.discountAmount) * 100) || 0;
  const total =
    bill.totalAmountPaise !== undefined
      ? bill.totalAmountPaise
      : Math.round(num(bill.totalAmount) * 100) || taxable + cgst + sgst + igst;
  const paid =
    bill.paidAmountPaise !== undefined
      ? bill.paidAmountPaise
      : Math.round(num(bill.paidAmount) * 100) || 0;
  const due =
    bill.outstandingAmountPaise !== undefined
      ? bill.outstandingAmountPaise
      : Math.round(num(bill.outstandingAmount) * 100) || Math.max(0, total - paid);

  const rows = [
    [PB_LABELS.subTotal, gross],
    discount > 0 && [L.discount, -discount],
    [PB_LABELS.taxable, taxable],
    ...(inter
      ? [[`IGST`, igst]]
      : [
          [`CGST`, cgst],
          [`SGST`, sgst],
        ]),
  ].filter(Boolean);

  return { items, hsn, rows, inter, total, paid, due, gross, discount, taxable };
}

function ThermalPurchaseBill({ cfg, co, bill, v, sup }) {
  const s = cfg.show || {};
  return (
    <div className="doc" data-layout="thermal" data-paper={cfg.paper} style={docVars(cfg)}>
      <div className="th-c">
        {s.logo && co.logo && (
          <img
            className="logo"
            src={co.logo}
            alt=""
            style={{ maxHeight: 44, margin: "0 auto" }}
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        )}
        <div className="co-name" style={{ fontSize: "1.25em" }}>
          {co.name}
        </div>
        <div className="sm pre">{co.address}</div>
        {co.gstin && <div className="sm">GSTIN: {co.gstin}</div>}
        <div className="doc-title" style={{ marginTop: 4 }}>
          {cfg.title || PB_LABELS.title}
        </div>
      </div>
      <div className="th-hr" />
      <div className="th-row">
        <span>{PB_LABELS.billNo} {bill.billNumber || "-"}</span>
        <span>{fmtDate(bill.billDate)}</span>
      </div>
      {bill.supplierInvoiceNumber && (
        <div className="th-row sm">
          <span>Supplier Inv:</span>
          <b>{bill.supplierInvoiceNumber}</b>
        </div>
      )}
      <div className="sm" style={{ marginTop: 2 }}>
        <b>Supplier: {sup.name}</b>
        {sup.gstNo && ` (${sup.gstNo})`}
      </div>
      <div className="th-hr" />
      {v.items.map((it, i) => (
        <div key={i} style={{ marginBottom: 4 }}>
          <b>{it.name}</b>
          <div className="th-row sm">
            <span>
              {it.qty} {it.unit} x {rs(it.ratePaise)}
              {it.taxPercent ? ` (+${it.taxPercent}%)` : ""}
            </span>
            <span>₹ {rs(it.amountPaise)}</span>
          </div>
        </div>
      ))}
      <div className="th-hr" />
      {v.rows.map(([k, val]) => (
        <div className="th-row" key={k}>
          <span>{k}</span>
          <span>₹ {rs(val)}</span>
        </div>
      ))}
      <div className="th-row grand">
        <b>Total</b>
        <b>₹ {rs(v.total)}</b>
      </div>
      {v.paid > 0 && (
        <div className="th-row">
          <span>Paid</span>
          <span>₹ {rs(v.paid)}</span>
        </div>
      )}
      <div className="th-row">
        <b>Due</b>
        <b>₹ {rs(v.due)}</b>
      </div>
      <div className="th-hr" />
      <div className="th-c sm">Verified & Stored</div>
    </div>
  );
}

export default function PurchaseBillTemplate({ invoice, templateId, template, company }) {
  useDocStyles();
  const cfg = resolveTemplate(PURCHASE_BILL_TEMPLATES, templateId, template);
  const tenant = getTenantCompany();
  const co = { ...COMPANY, ...tenant, ...company };

  // Supplier info can be inside invoice.supplier (object) or flattened
  const supObj = invoice?.supplier || {};
  const sup = {
    name: supObj.supplierName || supObj.name || invoice?.supplierName || "Supplier",
    code: supObj.supplierCode || invoice?.supplierCode || "",
    gstNo: supObj.gstNo || supObj.gstin || invoice?.supplierGstNo || "",
    phone: supObj.phone || invoice?.supplierPhone || "",
    email: supObj.email || invoice?.supplierEmail || "",
    address:
      addrText(supObj.billingAddress || supObj.address || invoice?.supplierAddress) ||
      [supObj.city, supObj.state, supObj.pincode].filter(Boolean).join(", "),
  };

  const v = buildPurchaseBillVM(invoice);

  if (cfg.layout === "thermal") {
    return <ThermalPurchaseBill cfg={cfg} co={co} bill={invoice} v={v} sup={sup} />;
  }

  const s = cfg.show || {};
  const buyerAddress = addrText(co.address);

  const cols = [
    { k: "sno", h: PB_LABELS.sno, w: 28, c: (_, i) => i + 1 },
    {
      k: "item",
      h: PB_LABELS.item,
      c: (it) => (
        <>
          <b>{it.name}</b>
          {it.description && <div className="muted sm">{it.description}</div>}
        </>
      ),
    },
    s.hsn && { k: "hsn", h: PB_LABELS.hsn, c: (it) => it.hsn || "-" },
    s.qty && { k: "qty", h: PB_LABELS.qty, r: 1, c: (it) => `${it.qty} ${it.unit}` },
    s.rate && { k: "rate", h: PB_LABELS.rate, r: 1, c: (it) => rs(it.ratePaise) },
    { k: "discount", h: PB_LABELS.discount, r: 1, c: (it) => `${it.discountPercent}%` },
    s.taxPercent && { k: "tax", h: PB_LABELS.tax, r: 1, c: (it) => `${it.taxPercent}%` },
    { k: "amt", h: PB_LABELS.amount, r: 1, c: (it) => rs(it.amountPaise) },
  ].filter(Boolean);

  return (
    <div
      className="doc"
      data-layout={cfg.layout}
      data-table={cfg.table}
      data-paper={cfg.paper}
      style={docVars(cfg)}
    >
      <Header
        cfg={cfg}
        co={co}
        title={cfg.title || PB_LABELS.title}
        right={
          <div className="muted sm">
            <span>Purchase Record</span>
            {invoice?.status && (
              <div style={{ marginTop: 4 }}>
                <span className="chip" data-s={invoice.status}>
                  {invoice.status}
                </span>
              </div>
            )}
          </div>
        }
      />

      <section className="parties">
        {/* Bill From: Supplier */}
        <div className="box">
          <h4>{PB_LABELS.billFrom}</h4>
          <b>{sup.name}</b>
          {sup.code && <div className="sm muted">Code: {sup.code}</div>}
          {sup.phone && <div className="sm">Ph: {sup.phone}</div>}
          {sup.address && <div className="pre sm">{sup.address}</div>}
          {sup.gstNo && (
            <div className="sm">
              <b>GSTIN:</b> {sup.gstNo}
            </div>
          )}
        </div>

        {/* Bill To: Our Company */}
        <div className="box">
          <h4>{PB_LABELS.billTo}</h4>
          <b>{co.name}</b>
          {buyerAddress && <div className="pre sm">{buyerAddress}</div>}
          {co.gstin && (
            <div className="sm">
              <b>GSTIN:</b> {co.gstin}
            </div>
          )}
          {co.phone && <div className="sm">Ph: {co.phone}</div>}
        </div>

        {/* Bill Details */}
        <div className="box">
          <h4>Bill Details</h4>
          <div className="kv">
            <span>{PB_LABELS.billNo}</span>
            <b>{invoice?.billNumber || "-"}</b>
            <span>{PB_LABELS.supplierInvoiceNo}</span>
            <b>{invoice?.supplierInvoiceNumber || "-"}</b>
            <span>{PB_LABELS.billDate}</span>
            <span>{fmtDate(invoice?.billDate)}</span>
            <span>{PB_LABELS.dueDate}</span>
            <span>{fmtDate(invoice?.dueDate)}</span>
            {invoice?.paymentTerms && (
              <>
                <span>{PB_LABELS.paymentTerms}</span>
                <span>{invoice.paymentTerms}</span>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="grow">
        <table className="items">
          <thead>
            <tr>
              {cols.map((c) => (
                <th
                  key={c.k}
                  className={c.r ? "r" : ""}
                  style={c.w ? { width: c.w } : undefined}
                >
                  {c.h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {v.items.map((it, i) => (
              <tr key={i}>
                {cols.map((c) => (
                  <td key={c.k} className={c.r ? "r" : ""}>
                    {c.c(it, i)}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="fill">
              {cols.map((c) => (
                <td key={c.k} />
              ))}
            </tr>
          </tbody>
        </table>
      </section>

      {s.hsnSummary && v.hsn.length > 0 && (
        <table className="hsn" style={{ breakInside: "avoid" }}>
          <thead>
            <tr>
              <th>HSN/SAC</th>
              <th className="r">Taxable Value</th>
              {v.inter ? (
                <>
                  <th className="r">IGST %</th>
                  <th className="r">Amt</th>
                </>
              ) : (
                <>
                  <th className="r">CGST %</th>
                  <th className="r">Amt</th>
                  <th className="r">SGST %</th>
                  <th className="r">Amt</th>
                </>
              )}
              <th className="r">Total Tax</th>
            </tr>
          </thead>
          <tbody>
            {v.hsn.map((h) => (
              <tr key={h.hsn + h.rate}>
                <td>{h.hsn}</td>
                <td className="r">₹ {rs(h.taxable)}</td>
                {v.inter ? (
                  <>
                    <td className="r">{h.rate}%</td>
                    <td className="r">₹ {rs(h.tax)}</td>
                  </>
                ) : (
                  <>
                    <td className="r">{h.rate / 2}%</td>
                    <td className="r">₹ {rs(h.half)}</td>
                    <td className="r">{h.rate / 2}%</td>
                    <td className="r">₹ {rs(h.tax - h.half)}</td>
                  </>
                )}
                <td className="r">₹ {rs(h.tax)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <section className="bottom">
        <div className="stack">
          {s.amountInWords && (
            <div>
              <div className="muted sm">{PB_LABELS.inWords}</div>
              <b>{amountInWords(v.total)}</b>
            </div>
          )}
          {invoice?.notes && (
            <div className="sm" style={{ marginTop: 8 }}>
              <div className="muted">{PB_LABELS.notes}</div>
              <div>{invoice.notes}</div>
            </div>
          )}
        </div>

        <table className="totals">
          <tbody>
            {v.rows.map(([k, val]) => (
              <tr key={k}>
                <td>{k}</td>
                <td className="r">₹ {rs(val)}</td>
              </tr>
            ))}
            <tr className="grand">
              <td>{PB_LABELS.total}</td>
              <td className="r">₹ {rs(v.total)}</td>
            </tr>
            {v.paid > 0 && (
              <tr>
                <td>{PB_LABELS.paid}</td>
                <td className="r">₹ {rs(v.paid)}</td>
              </tr>
            )}
            <tr className="due">
              <td>{PB_LABELS.due}</td>
              <td className="r">₹ {rs(v.due)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="sign">
        <div>
          <small>{PB_LABELS.receivedBy}</small>
        </div>
        <div>
          <b>
            {PB_LABELS.forCompany} {co.name}
          </b>
          <small>{PB_LABELS.signatory}</small>
        </div>
      </section>
    </div>
  );
}
