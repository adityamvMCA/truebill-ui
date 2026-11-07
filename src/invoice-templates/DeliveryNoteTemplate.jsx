import { COMPANY, LABELS as L } from "./templates.config";
import { DELIVERY_TEMPLATES } from "./deliveryNote.templates";
import { fmtDate, addrText, resolveTemplate } from "./utils";
import { Header, docVars, useDocStyles } from "./shared";

/* Delivery notes don't carry money by default (no rate/amount columns) —
   flip s.showAmount on a per-call basis if you want a priced challan. */
const DN_LABELS = {
  title: "DELIVERY NOTE",
  challanNo: "Challan no.",
  date: "Date",
  poNo: "Order / PO no.",
  poDate: "Order date",
  dispatchFrom: "Dispatch from",
  deliverTo: "Delivery address",
  vehicleNo: "Vehicle no.",
  transportMode: "Mode of transport",
  transporter: "Transporter",
  deliveredBy: "Delivered by",
  item: "Description of goods",
  hsn: "HSN/SAC",
  qty: "Qty",
  unit: "Unit",
  remarks: "Remarks",
  receiverSign: "Receiver’s signature & stamp",
  receiverName: "Name",
  receivedQty: "Qty received",
  receivedDate: "Date received",
  forCompany: "For",
  signatory: "Authorised signatory",
  notGenerated:
    "This delivery note has not been dispatched yet — draft of the details entered so far.",
};

const KV = ({ rows }) => (
  <div className="kv">
    {rows.map(([k, val]) => [
      <span key={k}>{k}</span>,
      <b key={k + "v"}>{val || "-"}</b>,
    ])}
  </div>
);

/* Normalises invoice.items (same shapes InvoiceTemplate/EwayBillTemplate accept)
   into delivery-note rows: no money, just what's being shipped. */
function deliveryItems(items = []) {
  const pick = (o, keys) => {
    for (const k of keys)
      if (o?.[k] !== undefined && o?.[k] !== null && o?.[k] !== "") return o[k];
    return undefined;
  };
  const text = (v) =>
    v && typeof v === "object" ? (v.name ?? v.itemName ?? v.title ?? "") : v;
  return items.map((i) => ({
    name:
      text(
        pick(i, [
          "name",
          "itemName",
          "productName",
          "item",
          "product",
          "title",
          "description",
        ]),
      ) || L.defaultItemName,
    description: pick(i, ["description"]),
    hsn: pick(i, ["hsn", "hsnCode", "hsnSac", "sacCode", "hsnSacCode"]),
    qty:
      pick(i, [
        "qty",
        "quantity",
        "billedQty",
        "billedQuantity",
        "orderedQty",
        "deliveredQty",
      ]) ?? 1,
    unit: pick(i, ["unit", "uom", "unitName", "unitOfMeasure"]) || "",
    remarks: pick(i, ["remarks", "note", "batch", "batchNo"]),
  }));
}

/* <DeliveryNoteTemplate invoice={payload} templateId="dn01" />
   Reads invoice.deliveryNote (dnNumber, dnDate, vehicleNumber, transportMode,
   transporterName, deliveredBy, status) plus the usual customer / address /
   items fields already used by InvoiceTemplate & EwayBillTemplate, so the
   same invoice payload works across all three documents. */
export default function DeliveryNoteTemplate({
  invoice,
  templateId,
  template,
  company,
}) {
  useDocStyles();
  const cfg = resolveTemplate(DELIVERY_TEMPLATES, templateId, template);
  const co = { ...COMPANY, ...company };
  const dn = invoice.deliveryNote || {};
  const items = deliveryItems(invoice.items);
  const dispatched = dn.status && dn.status !== "NOT_DISPATCHED";
  const showRemarks = items.some((it) => it.remarks);

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
        title={cfg.title || DN_LABELS.title}
        right={
          <div className="sm" style={{ marginTop: 4 }}>
            <span className="chip" data-s={dn.status}>
              {(dn.status || "NOT_DISPATCHED").replace("_", " ")}
            </span>
          </div>
        }
      />

      <section className="parties">
        <div className="box">
          <h4>{DN_LABELS.deliverTo}</h4>
          <b>{invoice.customerName}</b>
          {invoice.customerPhone && (
            <div className="sm">{invoice.customerPhone}</div>
          )}
          <div className="sm pre">
            {addrText(invoice.shippingAddress) ||
              addrText(invoice.billingAddress)}
          </div>
          {invoice.customerGstNo && (
            <div className="sm">
              <b>{L.gstin}:</b> {invoice.customerGstNo}
            </div>
          )}
        </div>
        <div className="box">
          <KV
            rows={[
              [DN_LABELS.challanNo, dn.dnNumber || invoice.invoiceNumber],
              [DN_LABELS.date, fmtDate(dn.dnDate || invoice.invoiceDate)],
              [DN_LABELS.poNo, invoice.poNumber || dn.poNumber],
              [
                DN_LABELS.poDate,
                (invoice.poDate || dn.poDate) &&
                  fmtDate(invoice.poDate || dn.poDate),
              ],
            ]}
          />
        </div>
        <div className="box">
          <KV
            rows={[
              [DN_LABELS.vehicleNo, dn.vehicleNumber],
              [DN_LABELS.transportMode, dn.transportMode],
              [DN_LABELS.transporter, dn.transporterName],
              [DN_LABELS.deliveredBy, dn.deliveredBy],
            ]}
          />
        </div>
      </section>

      <section className="grow">
        <table className="items">
          <thead>
            <tr>
              <th style={{ width: 26 }}>{L.sno}</th>
              <th>{DN_LABELS.item}</th>
              {cfg.show.hsn && <th>{DN_LABELS.hsn}</th>}
              <th className="r">{DN_LABELS.qty}</th>
              <th>{DN_LABELS.unit}</th>
              {showRemarks && <th>{DN_LABELS.remarks}</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>
                  <b>{it.name}</b>
                  {it.description && (
                    <small className="muted sm" style={{ display: "block" }}>
                      {it.description}
                    </small>
                  )}
                </td>
                {cfg.show.hsn && <td>{it.hsn || "-"}</td>}
                <td className="r">{it.qty}</td>
                <td>{it.unit}</td>
                {showRemarks && <td>{it.remarks || "-"}</td>}
              </tr>
            ))}
            <tr className="fill">
              <td
                colSpan={5 + (cfg.show.hsn ? 1 : 0) + (showRemarks ? 1 : 0)}
              />
            </tr>
          </tbody>
        </table>
      </section>

      {!dispatched && <div className="sm muted">{DN_LABELS.notGenerated}</div>}

      {cfg.show.notes && invoice.notes && (
        <div className="sm">
          <b>{L.notes}:</b> {invoice.notes}
        </div>
      )}

      <section className="bottom">
        <div className="box">
          <h4>
            {DN_LABELS.receivedQty} / {DN_LABELS.receivedDate}
          </h4>
          <div className="sm muted">
            To be filled by the receiver on delivery.
          </div>
        </div>
        <div
          className="box"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 16,
          }}
        >
          <div>
            <small className="muted">{DN_LABELS.receiverSign}</small>
            <div className="sm muted" style={{ marginTop: 2 }}>
              {DN_LABELS.receiverName}: ___________
            </div>
          </div>
          <div className="r">
            <b>
              {DN_LABELS.forCompany} {co.name}
            </b>
            <small className="muted" style={{ display: "block" }}>
              {DN_LABELS.signatory}
            </small>
          </div>
        </div>
      </section>
    </div>
  );
}
