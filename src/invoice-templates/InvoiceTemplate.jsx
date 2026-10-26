import { QRCodeSVG } from 'qrcode.react'; // npm i qrcode.react
import { COMPANY, LABELS as L, INVOICE_TEMPLATES } from './templates.config';
import { rs, fmtDate, amountInWords, addrText, resolveTemplate, buildInvoiceVM, upiLink } from './utils';
import { Header, docVars, useDocStyles } from './shared';
import { getTenantCompany } from './tenantCompany';
import Design, { isDesign } from './designs';

const hideBroken = (e) => (e.currentTarget.style.display = 'none');

function Thermal({ cfg, co, invoice, v }) {
  const s = cfg.show;
  return (
    <div className="doc" data-layout="thermal" data-paper={cfg.paper} style={docVars(cfg)}>
      <div className="th-c">
        {s.logo && co.logo && <img className="logo" src={co.logo} alt="" style={{ maxHeight: 48, margin: '0 auto' }} onError={hideBroken} />}
        <div className="co-name" style={{ fontSize: '1.3em' }}>{co.name}</div>
        <div className="sm pre">{co.address}</div>
        {co.phone && <div className="sm">Ph: {co.phone}</div>}
        {co.gstin && <div className="sm">GSTIN: {co.gstin}</div>}
        <div className="doc-title" style={{ marginTop: 4 }}>{cfg.title || L.invoiceTitle}</div>
      </div>
      <div className="th-hr" />
      <div className="th-row"><span>{L.invoiceNo} {invoice.invoiceNumber}</span><span>{fmtDate(invoice.invoiceDate)}</span></div>
      <div className="sm"><b>{invoice.customerName}</b>{invoice.customerGstNo && ` (${invoice.customerGstNo})`}</div>
      <div className="th-hr" />
      {v.items.map((it, i) => (
        <div key={i}>
          <b>{it.name}</b>
          <div className="th-row sm">
            <span>{it.qty} x {rs(it.ratePaise)}{s.taxPercent && ` (+${it.taxPercent}%)`}</span>
            <span>{rs(it.amountPaise)}</span>
          </div>
        </div>
      ))}
      <div className="th-hr" />
      {v.rows.map(([k, val]) => <div className="th-row" key={k}><span>{k}</span><span>{rs(val)}</span></div>)}
      <div className="th-row grand"><b>{L.total}</b><b>₹ {rs(v.total)}</b></div>
      <div className="th-row"><span>{L.paid}</span><span>{rs(v.paid)}</span></div>
      <div className="th-row"><b>{L.balance}</b><b>{rs(v.due)}</b></div>
      {s.amountInWords && <div className="sm">{amountInWords(v.total)}</div>}
      {s.qr && co.upi && (
        <div className="th-c" style={{ marginTop: 4 }}>
          <QRCodeSVG value={upiLink(co, invoice, v)} size={cfg.paper === 'T58' ? 80 : 100} />
          <div className="sm">{L.scanToPay}</div>
        </div>
      )}
      <div className="th-c sm">{L.thankYou}</div>
    </div>
  );
}

/* <InvoiceTemplate invoice={payload} templateId="inv08" company={{ logo: customerLogoUrl }} />
   Company priority: company prop > logged-in tenant > .env defaults */
export default function InvoiceTemplate({ invoice, templateId, template, company }) {
  useDocStyles();
  const cfg = resolveTemplate(INVOICE_TEMPLATES, templateId, template);
  const tenant = getTenantCompany();
  const co = {
    ...COMPANY,
    ...tenant,
    ...company,
    bank: { ...COMPANY.bank, ...tenant.bank, ...company?.bank },
  };
  const v = buildInvoiceVM(invoice);
  if (cfg.layout === 'thermal') return <Thermal cfg={cfg} co={co} invoice={invoice} v={v} />;
  if (isDesign(cfg.layout)) return <Design cfg={cfg} co={co} invoice={invoice} v={v} />;

  const s = cfg.show;
  const bill = addrText(invoice.billingAddress);
  const ship = addrText(invoice.shippingAddress) || bill;
  const terms = invoice.termsAndConditions || co.terms;
  const b = co.bank;
  const hasBank = s.bank && (b.accountNo || b.name);
  const small = cfg.paper === 'A5';

  const cols = [
    { k: 'sno', h: L.sno, w: 28, c: (_, i) => i + 1 },
    { k: 'item', h: L.item, c: (it) => <><b>{it.name}</b>{it.description && <div className="muted sm">{it.description}</div>}</> },
    s.hsn && { k: 'hsn', h: L.hsn, c: (it) => it.hsn || '-' },
    s.qty && { k: 'qty', h: L.qty, r: 1, c: (it) => `${it.qty} ${it.unit || ''}` },
    s.rate && { k: 'rate', h: L.rate, r: 1, c: (it) => rs(it.ratePaise) },
    s.taxPercent && { k: 'tax', h: L.taxPercent, r: 1, c: (it) => `${it.taxPercent}%` },
    { k: 'amt', h: L.amount, r: 1, c: (it) => rs(it.amountPaise) },
  ].filter(Boolean);

  return (
    <div className="doc" data-layout={cfg.layout} data-table={cfg.table} data-paper={cfg.paper} style={docVars(cfg)}>
      <Header cfg={cfg} co={co} title={cfg.title || L.invoiceTitle}
        right={<div className="muted sm">{L.copyLine}</div>} />

      <section className="parties">
        <div className="box">
          <h4>{L.billTo}</h4>
          <b>{invoice.customerName}</b>
          {invoice.customerPhone && <div className="sm">{invoice.customerPhone}</div>}
          {bill && <div className="pre sm">{bill}</div>}
          {invoice.customerGstNo && <div className="sm"><b>{L.gstin}:</b> {invoice.customerGstNo}</div>}
        </div>
        {s.shipTo ? (
          <div className="box"><h4>{L.shipTo}</h4><div className="pre sm">{ship || '-'}</div></div>
        ) : <div />}
        <div className="box">
          <h4>{L.details}</h4>
          <div className="kv">
            <span>{L.invoiceNo}</span><b>{invoice.invoiceNumber}</b>
            <span>{L.date}</span><span>{fmtDate(invoice.invoiceDate)}</span>
            <span>{L.dueDate}</span><span>{fmtDate(invoice.dueDate)}</span>
            {invoice.paymentTerms && <><span>{L.paymentTerms}</span><span>{invoice.paymentTerms}</span></>}
          </div>
          {s.status && invoice.paymentStatus && (
            <div style={{ marginTop: 6 }}><span className="chip" data-s={invoice.paymentStatus}>{invoice.paymentStatus}</span></div>
          )}
        </div>
      </section>

      <section className="grow">
        <table className="items">
          <thead>
            <tr>{cols.map((c) => <th key={c.k} className={c.r ? 'r' : ''} style={c.w ? { width: c.w } : undefined}>{c.h}</th>)}</tr>
          </thead>
          <tbody>
            {v.items.map((it, i) => (
              <tr key={i}>{cols.map((c) => <td key={c.k} className={c.r ? 'r' : ''}>{c.c(it, i)}</td>)}</tr>
            ))}
            <tr className="fill">{cols.map((c) => <td key={c.k} />)}</tr>
          </tbody>
        </table>
      </section>

      {s.hsnSummary && (
        <table className="hsn" style={{ breakInside: 'avoid' }}>
          <thead>
            <tr>
              <th>{L.hsn}</th><th className="r">{L.taxableValue}</th>
              {v.inter
                ? <><th className="r">IGST %</th><th className="r">Amt</th></>
                : <><th className="r">CGST %</th><th className="r">Amt</th><th className="r">SGST %</th><th className="r">Amt</th></>}
              <th className="r">{L.totalTax}</th>
            </tr>
          </thead>
          <tbody>
            {v.hsn.map((h) => (
              <tr key={h.hsn + h.rate}>
                <td>{h.hsn}</td><td className="r">{rs(h.taxable)}</td>
                {v.inter
                  ? <><td className="r">{h.rate}%</td><td className="r">{rs(h.tax)}</td></>
                  : <><td className="r">{h.rate / 2}%</td><td className="r">{rs(h.half)}</td><td className="r">{h.rate / 2}%</td><td className="r">{rs(h.tax - h.half)}</td></>}
                <td className="r">{rs(h.tax)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <section className="bottom">
        <div className="stack">
          {s.amountInWords && <div><div className="muted sm">{L.inWords}</div><b>{amountInWords(v.total)}</b></div>}
          <div className="row2">
            {hasBank && (
              <div className="sm">
                <div className="muted">{L.bank}</div>
                {b.name} {b.branch && `- ${b.branch}`}<br />
                A/c: {b.accountNo}<br />IFSC: {b.ifsc}
                {s.upi && co.upi && <div><span className="muted">{L.upi}:</span> {co.upi}</div>}
              </div>
            )}
            {s.qr && co.upi && (
              <div className="sm c">
                <QRCodeSVG value={upiLink(co, invoice, v)} size={small ? 64 : 80} />
                <div className="muted">{L.scanToPay}</div>
              </div>
            )}
          </div>
          {s.notes && invoice.notes && <div className="sm"><div className="muted">{L.notes}</div>{invoice.notes}</div>}
        </div>
        <table className="totals">
          <tbody>
            {v.rows.map(([k, val]) => <tr key={k}><td>{k}</td><td className="r">{rs(val)}</td></tr>)}
            <tr className="grand"><td>{L.total}</td><td className="r">₹ {rs(v.total)}</td></tr>
            <tr><td>{L.paid}</td><td className="r">{rs(v.paid)}</td></tr>
            <tr className="due"><td>{L.balance}</td><td className="r">{rs(v.due)}</td></tr>
          </tbody>
        </table>
      </section>

      {s.terms && terms && (
        <section className="sm" style={{ breakInside: 'avoid' }}>
          <div className="muted">{L.terms}</div><div className="pre">{terms}</div>
        </section>
      )}
      {s.signature && (
        <section className="sign">
          <div><small>{L.receiver}</small></div>
          <div><b>{L.forCompany} {co.name}</b><small>{L.signatory}</small></div>
        </section>
      )}
      {s.paidStamp && invoice.paymentStatus === 'PAID' && <div className="stamp">{L.paidStamp}</div>}
    </div>
  );
}