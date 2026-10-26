import { COMPANY, LABELS as L, EWAY_TEMPLATES } from './templates.config';
import { rs, fmtDate, addrText, resolveTemplate, buildInvoiceVM } from './utils';
import { Header, docVars, useDocStyles } from './shared';

const KV = ({ rows }) => (
  <div className="kv">
    {rows.map(([k, val]) => [<span key={k}>{k}</span>, <b key={k + 'v'}>{val || '-'}</b>])}
  </div>
);

/* <EwayBillTemplate invoice={payload} templateId="ew02" /> — reads invoice.ewayBill */
export default function EwayBillTemplate({ invoice, templateId, template, company }) {
  useDocStyles();
  const cfg = resolveTemplate(EWAY_TEMPLATES, templateId, template);
  const co = { ...COMPANY, ...company };
  const e = invoice.ewayBill || {};
  const v = buildInvoiceVM(invoice);
  const generated = e.status && e.status !== 'NOT_GENERATED';

  return (
    <div className="doc" data-layout={cfg.layout} data-table={cfg.table} data-paper={cfg.paper} style={docVars(cfg)}>
      <Header cfg={cfg} co={co} title={cfg.title || L.ewayTitle}
        right={<div className="sm" style={{ marginTop: 4 }}><span className="chip" data-s={e.status}>{(e.status || 'NOT_GENERATED').replace('_', ' ')}</span></div>} />

      <section className="parties" style={{ gridTemplateColumns: '1fr auto' }}>
        <div className="box">
          <KV rows={[
            ['E-Way Bill No.', e.ewbNumber],
            ['Generated on', e.ewbDate && fmtDate(e.ewbDate)],
            ['Valid until', e.validUntil && fmtDate(e.validUntil)],
          ]} />
        </div>
        <div className="qr">{e.ewbNumber ? 'QR' : 'No QR'}</div>
      </section>

      <section className="box">
        <h4>Part A — Supply details</h4>
        <KV rows={[
          ['Supplier', co.name],
          ['Supplier GSTIN', co.gstin],
          ['Recipient', invoice.customerName],
          ['Recipient GSTIN', invoice.customerGstNo],
          ['Document no.', invoice.invoiceNumber],
          ['Document date', fmtDate(invoice.invoiceDate)],
          ['Dispatch from', [e.fromPlace, e.fromPincode].filter(Boolean).join(' - ')],
          ['Deliver to', [e.toPlace, e.toPincode].filter(Boolean).join(' - ') || addrText(invoice.shippingAddress).replace(/\n/g, ', ')],
          ['Taxable value', `₹ ${rs(invoice.taxableAmountPaise)}`],
          ['Total value', `₹ ${rs(invoice.totalAmountPaise)}`],
        ]} />
      </section>

      <section className="box">
        <h4>Part B — Transport details</h4>
        <KV rows={[
          ['Mode', e.transportMode],
          ['Vehicle type', e.vehicleType],
          ['Vehicle no.', e.vehicleNumber],
          ['Distance', e.distanceKm != null ? `${e.distanceKm} km` : ''],
          ['Transporter', e.transporterName],
          ['Transporter ID', e.transporterId],
          ['Transport doc no.', e.transportDocNumber],
          ['Transport doc date', e.transportDocDate && fmtDate(e.transportDocDate)],
        ]} />
      </section>

      <section className="grow">
        <table className="items">
          <thead><tr><th>{L.item}</th><th>{L.hsn}</th><th className="r">{L.qty}</th><th className="r">Taxable value</th><th className="r">{L.taxPercent}</th></tr></thead>
          <tbody>
            {v.items.map((it, i) => (
              <tr key={i}>
                <td>{it.name}</td><td>{it.hsn || '-'}</td>
                <td className="r">{it.qty} {it.unit || ''}</td>
                <td className="r">{rs(it.amountPaise)}</td><td className="r">{it.taxPercent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {!generated && <div className="sm muted">E-way bill is not generated yet — this is a draft of the details entered so far.</div>}
      <section className="sign">
        <div><small>Driver / transporter signature</small></div>
        <div><b>{L.forCompany} {co.name}</b><small>{L.signatory}</small></div>
      </section>
    </div>
  );
}
