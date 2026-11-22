import { COMPANY, LABELS as L } from "./templates.config";
import { SALES_RETURN_TEMPLATES } from "./salesReturn.templates";
import { rs, fmtDate, amountInWords, addrText, resolveTemplate } from "./utils";
import { Header, docVars, useDocStyles } from "./shared";
import { getTenantCompany } from "./tenantCompany";

const SR_LABELS = {
  title: "CREDIT NOTE / SALES RETURN",
  billTo: "Customer (Issued To)",
  issuer: "Issued By (Seller)",
  creditNoteNo: "Credit Note No.",
  creditNoteDate: "Credit Note Date",
  originalInvoiceNo: "Against Tax Invoice",
  originalInvoiceDate: "Invoice Date",
  reason: "Reason for Credit Note",
  sno: "#",
  item: "Item Description",
  hsn: "HSN/SAC",
  qty: "Returned Qty",
  rate: "Rate (₹)",
  discount: "Disc %",
  tax: "GST %",
  amount: "Taxable Value",
  subTotal: "Gross Amount",
  taxable: "Taxable Amount",
  total: "Total Credit Amount",
  inWords: "Amount in Words",
  notes: "Notes / Terms",
  signatory: "Authorised Signatory",
  receiver: "Customer Signature / Acceptance",
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

export function buildSalesReturnVM(doc = {}) {
  const taxable =
    doc.taxableAmountPaise !== undefined
      ? doc.taxableAmountPaise
      : Math.round(num(doc.taxableAmount) * 100);

  const cgst =
    doc.cgstAmountPaise !== undefined
      ? doc.cgstAmountPaise
      : Math.round(num(doc.cgstAmount) * 100);
  const sgst =
    doc.sgstAmountPaise !== undefined
      ? doc.sgstAmountPaise
      : Math.round(num(doc.sgstAmount) * 100);
  const igst =
    doc.igstAmountPaise !== undefined
      ? doc.igstAmountPaise
      : Math.round(num(doc.igstAmount) * 100);

  const inter = doc.taxMode === "INTER_STATE" || doc.taxMode === "INTERSTATE" || igst > 0;

  const rawItems = Array.isArray(doc.items) && doc.items.length
    ? doc.items
    : [
        {
          name: doc.description || "Goods Returned by Customer",
          qty: 1,
          ratePaise: taxable,
          amountPaise: taxable,
        },
      ];

  const items = rawItems.map((i) => {
    const qty = num(pick(i, ["quantity", "qty", "returnedQty", "returnQuantity"])) || 1;
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
      name: text(pick(i, ["name", "productName", "description", "item"])) || "Returned Product",
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
    doc.grossAmountPaise !== undefined
      ? doc.grossAmountPaise
      : Math.round(num(doc.grossAmount) * 100) || taxable;
  const discount =
    doc.discountAmountPaise !== undefined
      ? doc.discountAmountPaise
      : Math.round(num(doc.discountAmount) * 100) || 0;
  const total =
    doc.totalAmountPaise !== undefined
      ? doc.totalAmountPaise
      : Math.round(num(doc.totalAmount) * 100) || taxable + cgst + sgst + igst;

  const rows = [
    [SR_LABELS.subTotal, gross],
    discount > 0 && [L.discount, -discount],
    [SR_LABELS.taxable, taxable],
    ...(inter
      ? [[`IGST`, igst]]
      : [
          [`CGST`, cgst],
          [`SGST`, sgst],
        ]),
  ].filter(Boolean);

  return { items, hsn, rows, inter, total, gross, discount, taxable };
}

function ThermalSalesReturn({ cfg, co, doc, v, cust }) {
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
          {cfg.title || SR_LABELS.title}
        </div>
      </div>
      <div className="th-hr" />
      <div className="th-row">
        <span>Credit Note: {doc.creditNoteNumber || doc.returnNumber || "-"}</span>
        <span>{fmtDate(doc.creditNoteDate || doc.returnDate)}</span>
      </div>
      {doc.originalInvoiceNumber && (
        <div className="th-row sm">
          <span>Against Inv:</span>
          <b>{doc.originalInvoiceNumber}</b>
        </div>
      )}
      <div className="sm" style={{ marginTop: 2 }}>
        <b>Customer: {cust.name}</b>
        {cust.gstNo && ` (${cust.gstNo})`}
      </div>
      {doc.reason && (
        <div className="sm muted" style={{ marginTop: 2 }}>
          Reason: {doc.reason}
        </div>
      )}
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
        <b>Credit Total</b>
        <b>₹ {rs(v.total)}</b>
      </div>
      <div className="th-hr" />
      <div className="th-c sm">Credit Applied to Customer Ledger</div>
    </div>
  );
}

export default function SalesReturnTemplate({ invoice, templateId, template, company }) {
  useDocStyles();
  const cfg = resolveTemplate(SALES_RETURN_TEMPLATES, templateId, template);
  const tenant = getTenantCompany();
  const co = { ...COMPANY, ...tenant, ...company };

  const custObj = invoice?.customer || {};
  const cust = {
    name: custObj.customerName || custObj.name || invoice?.customerName || "Customer",
    code: custObj.customerCode || invoice?.customerCode || "",
    gstNo: custObj.gstNo || custObj.gstin || invoice?.customerGstNo || "",
    phone: custObj.phone || invoice?.customerPhone || "",
    address:
      addrText(custObj.billingAddress || custObj.address || invoice?.billingAddress) ||
      [custObj.city, custObj.state, custObj.pincode].filter(Boolean).join(", "),
  };

  const v = buildSalesReturnVM(invoice);

  if (cfg.layout === "thermal") {
    return <ThermalSalesReturn cfg={cfg} co={co} doc={invoice} v={v} cust={cust} />;
  }

  const s = cfg.show || {};
  const sellerAddress = addrText(co.address);

  const cols = [
    { k: "sno", h: SR_LABELS.sno, w: 28, c: (_, i) => i + 1 },
    {
      k: "item",
      h: SR_LABELS.item,
      c: (it) => (
        <>
          <b>{it.name}</b>
          {it.description && <div className="muted sm">{it.description}</div>}
        </>
      ),
    },
    s.hsn && { k: "hsn", h: SR_LABELS.hsn, c: (it) => it.hsn || "-" },
    s.qty && { k: "qty", h: SR_LABELS.qty, r: 1, c: (it) => `${it.qty} ${it.unit}` },
    s.rate && { k: "rate", h: SR_LABELS.rate, r: 1, c: (it) => rs(it.ratePaise) },
    { k: "discount", h: SR_LABELS.discount, r: 1, c: (it) => `${it.discountPercent}%` },
    s.taxPercent && { k: "tax", h: SR_LABELS.tax, r: 1, c: (it) => `${it.taxPercent}%` },
    { k: "amt", h: SR_LABELS.amount, r: 1, c: (it) => rs(it.amountPaise) },
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
        title={cfg.title || SR_LABELS.title}
        right={
          <div className="muted sm">
            <span>Customer Credit</span>
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
        {/* Customer (Issued To) */}
        <div className="box">
          <h4>{SR_LABELS.billTo}</h4>
          <b>{cust.name}</b>
          {cust.code && <div className="sm muted">Code: {cust.code}</div>}
          {cust.phone && <div className="sm">Ph: {cust.phone}</div>}
          {cust.address && <div className="pre sm">{cust.address}</div>}
          {cust.gstNo && (
            <div className="sm">
              <b>GSTIN:</b> {cust.gstNo}
            </div>
          )}
        </div>

        {/* Issued By: Our Company */}
        <div className="box">
          <h4>{SR_LABELS.issuer}</h4>
          <b>{co.name}</b>
          {sellerAddress && <div className="pre sm">{sellerAddress}</div>}
          {co.gstin && (
            <div className="sm">
              <b>GSTIN:</b> {co.gstin}
            </div>
          )}
          {co.phone && <div className="sm">Ph: {co.phone}</div>}
        </div>

        {/* Note Details */}
        <div className="box">
          <h4>Credit Details</h4>
          <div className="kv">
            <span>{SR_LABELS.creditNoteNo}</span>
            <b>{invoice?.creditNoteNumber || invoice?.returnNumber || "-"}</b>
            <span>{SR_LABELS.creditNoteDate}</span>
            <span>{fmtDate(invoice?.creditNoteDate || invoice?.returnDate)}</span>
            <span>{SR_LABELS.originalInvoiceNo}</span>
            <b>{invoice?.originalInvoiceNumber || "-"}</b>
            {invoice?.originalInvoiceDate && (
              <>
                <span>{SR_LABELS.originalInvoiceDate}</span>
                <span>{fmtDate(invoice.originalInvoiceDate)}</span>
              </>
            )}
          </div>
        </div>
      </section>

      {invoice?.reason && (
        <section className="box" style={{ background: "color-mix(in srgb, var(--accent) 5%, #fff)" }}>
          <div className="sm">
            <b>{SR_LABELS.reason}:</b> {invoice.reason}
          </div>
        </section>
      )}

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
              <div className="muted sm">{SR_LABELS.inWords}</div>
              <b>{amountInWords(v.total)}</b>
            </div>
          )}
          {invoice?.notes && (
            <div className="sm" style={{ marginTop: 8 }}>
              <div className="muted">{SR_LABELS.notes}</div>
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
              <td>{SR_LABELS.total}</td>
              <td className="r">₹ {rs(v.total)}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="sign">
        <div>
          <small>{SR_LABELS.receiver}</small>
        </div>
        <div>
          <b>
            {SR_LABELS.forCompany} {co.name}
          </b>
          <small>{SR_LABELS.signatory}</small>
        </div>
      </section>
    </div>
  );
}
