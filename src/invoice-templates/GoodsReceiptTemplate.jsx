import { COMPANY, LABELS as L } from "./templates.config";
import { GOODS_RECEIPT_TEMPLATES } from "./goodsReceipt.templates";
import { rs, fmtDate, addrText, resolveTemplate } from "./utils";
import { Header, docVars, useDocStyles } from "./shared";
import { getTenantCompany } from "./tenantCompany";

const GRN_LABELS = {
  title: "GOODS RECEIPT NOTE (GRN)",
  receivedFrom: "Received From (Supplier)",
  receivedAt: "Delivery / Inward Location",
  grnNo: "GRN No.",
  receiptDate: "Receipt Date",
  poNo: "PO Reference",
  poDate: "PO Date",
  supplierInvNo: "Supplier Challan / Inv",
  invDate: "Challan / Inv Date",
  vehicleNo: "Vehicle No.",
  transporter: "Transporter",
  warehouse: "Warehouse / Bay",
  sno: "#",
  item: "Item Description",
  hsn: "HSN/SAC",
  orderedQty: "PO Qty",
  receivedQty: "Recd Qty",
  acceptedQty: "Accepted",
  rejectedQty: "Rejected",
  unit: "Unit",
  rate: "Unit Rate (₹)",
  amount: "Total (₹)",
  batch: "Batch / Lot No.",
  remarks: "Inspection Remarks",
  subTotal: "Total Items Received",
  notes: "Receipt Notes / Weighment Details",
  inspectorSign: "Inspected & Verified By (QC)",
  storeSign: "Store Incharge / Received By",
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

export function buildGoodsReceiptVM(doc = {}) {
  const rawItems = Array.isArray(doc.items) && doc.items.length
    ? doc.items
    : [
        {
          name: doc.description || "Material Received",
          receivedQty: 1,
          acceptedQty: 1,
        },
      ];

  const items = rawItems.map((i) => {
    const orderedQty = num(pick(i, ["orderedQty", "poQty", "orderedQuantity"])) || 0;
    const receivedQty = num(pick(i, ["receivedQty", "quantity", "qty", "billedQty"])) || orderedQty || 1;
    const acceptedQty =
      i.acceptedQty !== undefined ? num(i.acceptedQty) : receivedQty;
    const rejectedQty =
      i.rejectedQty !== undefined ? num(i.rejectedQty) : Math.max(0, receivedQty - acceptedQty);

    let ratePaise = pick(i, ["ratePaise", "unitPricePaise", "pricePaise"]);
    if (ratePaise === undefined) {
      const r = pick(i, ["unitRate", "rate", "price", "unitPrice"]);
      ratePaise = r !== undefined ? Math.round(num(r) * 100) : 0;
    } else {
      ratePaise = Math.round(num(ratePaise));
    }

    let amountPaise = pick(i, ["amountPaise", "totalPaise", "netAmountPaise"]);
    if (amountPaise === undefined) {
      const a = pick(i, ["amount", "total", "netAmount"]);
      amountPaise = a !== undefined ? Math.round(num(a) * 100) : Math.round(acceptedQty * ratePaise);
    } else {
      amountPaise = Math.round(num(amountPaise));
    }

    return {
      name: text(pick(i, ["name", "productName", "description", "item"])) || "Received Item",
      description: i.description && i.name ? i.description : undefined,
      hsn: pick(i, ["hsnSacCode", "hsn", "hsnCode", "sacCode"]) || "-",
      orderedQty,
      receivedQty,
      acceptedQty,
      rejectedQty,
      unit: pick(i, ["unit", "unitName", "uom"]) || "NOS",
      ratePaise,
      amountPaise,
      batch: pick(i, ["batchNumber", "batchNo", "batch", "lotNo", "serialNo"]) || "-",
      remarks: pick(i, ["remarks", "notes", "qcRemarks", "rejectReason"]) || "",
    };
  });

  const totalAccepted = items.reduce((acc, it) => acc + it.acceptedQty, 0);
  const totalReceived = items.reduce((acc, it) => acc + it.receivedQty, 0);
  const totalRejected = items.reduce((acc, it) => acc + it.rejectedQty, 0);
  const totalAmountPaise = items.reduce((acc, it) => acc + it.amountPaise, 0);

  return { items, totalAccepted, totalReceived, totalRejected, totalAmountPaise };
}

function ThermalGoodsReceipt({ cfg, co, doc, v, sup }) {
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
        <div className="doc-title" style={{ marginTop: 4 }}>
          {cfg.title || GRN_LABELS.title}
        </div>
      </div>
      <div className="th-hr" />
      <div className="th-row">
        <span>GRN: {doc.grnNumber || doc.receiptNumber || "-"}</span>
        <span>{fmtDate(doc.receiptDate || doc.date)}</span>
      </div>
      {doc.purchaseOrderNumber && (
        <div className="th-row sm">
          <span>PO Ref:</span>
          <b>{doc.purchaseOrderNumber}</b>
        </div>
      )}
      <div className="sm" style={{ marginTop: 2 }}>
        <b>From: {sup.name}</b>
      </div>
      {doc.warehouseLocation && (
        <div className="sm muted">Location: {doc.warehouseLocation}</div>
      )}
      <div className="th-hr" />
      {v.items.map((it, i) => (
        <div key={i} style={{ marginBottom: 4 }}>
          <b>{it.name}</b>
          <div className="th-row sm">
            <span>
              Recd: {it.receivedQty} | Acc: {it.acceptedQty} {it.unit}
            </span>
            {it.amountPaise > 0 && <span>₹ {rs(it.amountPaise)}</span>}
          </div>
          {it.rejectedQty > 0 && (
            <div className="sm" style={{ color: "#b91c1c" }}>
              Rejected: {it.rejectedQty} {it.unit}
            </div>
          )}
        </div>
      ))}
      <div className="th-hr" />
      <div className="th-row">
        <b>Total Received:</b>
        <b>{v.totalReceived} units</b>
      </div>
      <div className="th-row">
        <b>Total Accepted:</b>
        <b>{v.totalAccepted} units</b>
      </div>
      {v.totalRejected > 0 && (
        <div className="th-row" style={{ color: "#b91c1c" }}>
          <b>Total Rejected:</b>
          <b>{v.totalRejected} units</b>
        </div>
      )}
      <div className="th-hr" />
      <div className="th-c sm">Inward Entry Completed</div>
    </div>
  );
}

export default function GoodsReceiptTemplate({ invoice, templateId, template, company }) {
  useDocStyles();
  const cfg = resolveTemplate(GOODS_RECEIPT_TEMPLATES, templateId, template);
  const tenant = getTenantCompany();
  const co = { ...COMPANY, ...tenant, ...company };

  const supObj = invoice?.supplier || {};
  const sup = {
    name: supObj.supplierName || supObj.name || invoice?.supplierName || "Supplier",
    code: supObj.supplierCode || invoice?.supplierCode || "",
    gstNo: supObj.gstNo || supObj.gstin || invoice?.supplierGstNo || "",
    phone: supObj.phone || invoice?.supplierPhone || "",
    address:
      addrText(supObj.billingAddress || supObj.address || invoice?.supplierAddress) ||
      [supObj.city, supObj.state, supObj.pincode].filter(Boolean).join(", "),
  };

  const v = buildGoodsReceiptVM(invoice);

  if (cfg.layout === "thermal") {
    return <ThermalGoodsReceipt cfg={cfg} co={co} doc={invoice} v={v} sup={sup} />;
  }

  const hasPricing = v.items.some((it) => it.ratePaise > 0);
  const hasBatches = v.items.some((it) => it.batch && it.batch !== "-");
  const hasRemarks = v.items.some((it) => it.remarks);

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
        title={cfg.title || GRN_LABELS.title}
        right={
          <div className="muted sm">
            <span>Inward Verification</span>
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
        {/* Received From: Supplier */}
        <div className="box">
          <h4>{GRN_LABELS.receivedFrom}</h4>
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

        {/* Inward Location / Warehouse */}
        <div className="box">
          <h4>{GRN_LABELS.receivedAt}</h4>
          <b>{co.name}</b>
          <div className="sm pre">{addrText(co.address)}</div>
          {invoice?.warehouseLocation && (
            <div className="sm" style={{ marginTop: 4 }}>
              <b>{GRN_LABELS.warehouse}:</b> {invoice.warehouseLocation}
            </div>
          )}
          {invoice?.receivedBy && (
            <div className="sm">
              <b>Store Officer:</b> {invoice.receivedBy}
            </div>
          )}
        </div>

        {/* Reference & Tracking Details */}
        <div className="box">
          <h4>Receipt Details</h4>
          <div className="kv">
            <span>{GRN_LABELS.grnNo}</span>
            <b>{invoice?.grnNumber || invoice?.receiptNumber || "-"}</b>
            <span>{GRN_LABELS.receiptDate}</span>
            <span>{fmtDate(invoice?.receiptDate || invoice?.date)}</span>
            <span>{GRN_LABELS.poNo}</span>
            <b>{invoice?.purchaseOrderNumber || "-"}</b>
            {invoice?.supplierInvoiceNumber && (
              <>
                <span>{GRN_LABELS.supplierInvNo}</span>
                <b>{invoice.supplierInvoiceNumber}</b>
              </>
            )}
            {invoice?.vehicleNumber && (
              <>
                <span>{GRN_LABELS.vehicleNo}</span>
                <span>{invoice.vehicleNumber}</span>
              </>
            )}
            {invoice?.transporterName && (
              <>
                <span>{GRN_LABELS.transporter}</span>
                <span>{invoice.transporterName}</span>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="grow">
        <table className="items">
          <thead>
            <tr>
              <th style={{ width: 26 }}>{GRN_LABELS.sno}</th>
              <th>{GRN_LABELS.item}</th>
              {cfg.show?.hsn && <th>{GRN_LABELS.hsn}</th>}
              <th className="r">{GRN_LABELS.orderedQty}</th>
              <th className="r">{GRN_LABELS.receivedQty}</th>
              <th className="r">{GRN_LABELS.acceptedQty}</th>
              <th className="r">{GRN_LABELS.rejectedQty}</th>
              <th>{GRN_LABELS.unit}</th>
              {hasBatches && <th>{GRN_LABELS.batch}</th>}
              {hasPricing && <th className="r">{GRN_LABELS.rate}</th>}
              {hasPricing && <th className="r">{GRN_LABELS.amount}</th>}
              {hasRemarks && <th>{GRN_LABELS.remarks}</th>}
            </tr>
          </thead>
          <tbody>
            {v.items.map((it, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>
                  <b>{it.name}</b>
                  {it.description && <div className="muted sm">{it.description}</div>}
                </td>
                {cfg.show?.hsn && <td>{it.hsn || "-"}</td>}
                <td className="r">{it.orderedQty || "-"}</td>
                <td className="r">{it.receivedQty}</td>
                <td className="r">
                  <b>{it.acceptedQty}</b>
                </td>
                <td className="r" style={{ color: it.rejectedQty > 0 ? "#b91c1c" : undefined }}>
                  {it.rejectedQty}
                </td>
                <td>{it.unit}</td>
                {hasBatches && <td>{it.batch}</td>}
                {hasPricing && <td className="r">₹ {rs(it.ratePaise)}</td>}
                {hasPricing && <td className="r">₹ {rs(it.amountPaise)}</td>}
                {hasRemarks && <td>{it.remarks || "-"}</td>}
              </tr>
            ))}
            <tr className="fill">
              <td
                colSpan={
                  8 +
                  (cfg.show?.hsn ? 1 : 0) +
                  (hasBatches ? 1 : 0) +
                  (hasPricing ? 2 : 0) +
                  (hasRemarks ? 1 : 0)
                }
              />
            </tr>
          </tbody>
        </table>
      </section>

      <section className="bottom">
        <div className="stack">
          <div className="box">
            <h4>Material Verification Summary</h4>
            <div className="kv" style={{ gridTemplateColumns: "auto 1fr" }}>
              <span>Total Received Qty:</span>
              <b>{v.totalReceived} units</b>
              <span>Total Accepted Qty:</span>
              <b style={{ color: "#15803d" }}>{v.totalAccepted} units</b>
              {v.totalRejected > 0 && (
                <>
                  <span>Total Rejected Qty:</span>
                  <b style={{ color: "#b91c1c" }}>{v.totalRejected} units</b>
                </>
              )}
            </div>
          </div>
          {invoice?.notes && (
            <div className="sm" style={{ marginTop: 8 }}>
              <div className="muted">{GRN_LABELS.notes}</div>
              <div>{invoice.notes}</div>
            </div>
          )}
        </div>

        {hasPricing && v.totalAmountPaise > 0 ? (
          <table className="totals">
            <tbody>
              <tr className="grand">
                <td>Accepted Valuation</td>
                <td className="r">₹ {rs(v.totalAmountPaise)}</td>
              </tr>
            </tbody>
          </table>
        ) : (
          <div
            className="box"
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <div className="sm muted">Quality Inspection Complete</div>
            <div style={{ marginTop: 6, fontWeight: 700, color: "#15803d" }}>
              {v.totalRejected === 0 ? "100% INWARD ACCEPTED" : "PARTIALLY ACCEPTED"}
            </div>
          </div>
        )}
      </section>

      <section className="sign">
        <div>
          <small>{GRN_LABELS.inspectorSign}</small>
          {invoice?.inspectedBy && (
            <div className="sm" style={{ marginTop: 4 }}>
              <b>{invoice.inspectedBy}</b>
            </div>
          )}
        </div>
        <div>
          <small>{GRN_LABELS.storeSign}</small>
          {invoice?.receivedBy && (
            <div className="sm" style={{ marginTop: 4 }}>
              <b>{invoice.receivedBy}</b>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
