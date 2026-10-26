import { useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { LABELS as L } from './templates.config';
import { rs, fmtDate, amountInWords, addrText, upiLink } from './utils';
import { docVars } from './shared';

/* ---------- styles (own style tag, does not touch shared DOC_CSS) ---------- */
export const DESIGN_CSS = `
.doc.xd{--ink:#0f172a;--dark:color-mix(in srgb,var(--accent) 68%,#000);color:var(--ink)}
.xd h5{margin:0 0 4px;font-size:.72em;letter-spacing:.12em;text-transform:uppercase;font-weight:700;opacity:.7}
.xd .xd-brand{display:flex;gap:10px;align-items:center}
.xd .xd-logo{max-height:52px;max-width:130px;object-fit:contain;background:#fff;border-radius:6px;padding:3px}
.xd .xd-co{font-size:1.35em;font-weight:800;line-height:1.2}
.xd .xd-sub{font-size:.85em;opacity:.75}
.xd .xd-lines{font-size:.85em;line-height:1.5;white-space:pre-line;opacity:.9}
.xd .xd-pre{white-space:pre-line}
.xd .sm{font-size:.88em}
.xd .r{text-align:right}
.xd .xd-grow{flex:1}
.xd .xd-items{width:100%;border-collapse:collapse}
.xd .xd-items th{padding:7px 8px;text-align:left;font-size:.8em;text-transform:uppercase;letter-spacing:.06em}
.xd .xd-items td{padding:7px 8px;vertical-align:top;border-bottom:1px solid #e5e7eb}
.xd .xd-items th.r,.xd .xd-items td.r{text-align:right}
.xd .xd-items td small{display:block;opacity:.6}
.xd .xd-totals{width:100%;border-collapse:collapse}
.xd .xd-totals td{padding:4px 0}
.xd .xd-totals tr.g td{font-weight:800;font-size:1.15em;padding-top:8px;border-top:1px solid currentColor}
.xd .xd-totals tr.d td{font-weight:800}
.xd .xd-qr{text-align:center;font-size:.75em;width:max-content}
.xd .xd-qr div{opacity:.7;margin-top:2px}
.xd .xd-bank{font-size:.88em;line-height:1.5}
.xd .xd-chip{display:inline-block;padding:2px 10px;border-radius:999px;font-size:.78em;font-weight:700;background:var(--tint);color:var(--accent)}
.xd .xd-sign{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;min-height:56px;break-inside:avoid;font-size:.88em}
.xd .xd-sign>div:last-child{text-align:right}
.xd .xd-sign small{display:block;opacity:.65}
.xd .xd-terms{font-size:.82em;break-inside:avoid}
.xd .xd-stamp{position:absolute;top:44%;left:50%;transform:translate(-50%,-50%) rotate(-18deg);font-size:60px;font-weight:800;letter-spacing:.1em;color:rgba(22,163,74,.14);border:6px solid rgba(22,163,74,.14);border-radius:12px;padding:0 22px;pointer-events:none}

/* Aurora */
.doc[data-layout=x-aurora]{padding:0;display:grid;grid-template-columns:64mm 1fr;gap:0;align-items:stretch}
.au-side{background:linear-gradient(180deg,var(--accent),var(--dark));color:#fff;padding:12mm 7mm;display:flex;flex-direction:column;gap:14px}
.au-side section{border-top:1px solid rgba(255,255,255,.28);padding-top:10px}
.au-side .xd-qr{background:#fff;color:var(--ink);padding:6px;border-radius:8px}
.au-main{padding:12mm 10mm 10mm;display:flex;flex-direction:column;gap:14px;min-width:0}
.au-top{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid var(--accent);padding-bottom:8px}
.au-top .t{font-size:2em;font-weight:800;color:var(--accent);letter-spacing:.04em;line-height:1}
.au-top .n{font-size:1.2em;font-weight:700}
.au-meta{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.au-meta>div{background:var(--tint);border-radius:var(--radius);padding:6px 10px}
.au-meta small{display:block;opacity:.6;font-size:.72em;text-transform:uppercase;letter-spacing:.08em}
.doc[data-layout=x-aurora] .xd-items th{border-bottom:2px solid var(--accent);color:var(--accent)}
.au-bottom{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}
.au-bottom .xd-totals tr.d td{color:var(--accent);font-size:1.1em}

/* Executive */
.doc[data-layout=x-exec]{padding:0;gap:0}
.ex-band{background:linear-gradient(120deg,var(--dark),var(--accent));color:#fff;padding:12mm 12mm 17mm;display:flex;justify-content:space-between;gap:16px;align-items:flex-start}
.ex-band .big{font-size:2.6em;font-weight:800;letter-spacing:.06em;line-height:1;text-align:right}
.ex-band .no{text-align:right;margin-top:6px;font-size:1.05em;opacity:.95}
.ex-body{padding:0 12mm 8mm;display:flex;flex-direction:column;gap:14px;flex:1;margin-top:-9mm}
.ex-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.ex-card{background:#fff;border:1px solid var(--line);border-top:4px solid var(--accent);border-radius:var(--radius);padding:10px 12px;box-shadow:0 6px 16px rgba(15,23,42,.08)}
.ex-card .kv{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;font-size:.9em}
.ex-card .kv span:nth-child(odd){opacity:.6}
.doc[data-layout=x-exec] .xd-items th{background:var(--accent);color:#fff}
.doc[data-layout=x-exec] .xd-items th:first-child{border-radius:var(--radius) 0 0 var(--radius)}
.doc[data-layout=x-exec] .xd-items th:last-child{border-radius:0 var(--radius) var(--radius) 0}
.doc[data-layout=x-exec] .xd-items tbody tr:nth-child(even){background:var(--tint)}
.ex-bottom{display:grid;grid-template-columns:1.1fr 1fr;gap:16px;align-items:start}
.ex-tot{background:var(--tint);border-radius:var(--radius);padding:10px 14px}
.ex-tot .xd-totals tr.d td{background:var(--accent);color:#fff;padding:7px 10px}
.ex-tot .xd-totals tr.d td:first-child{border-radius:6px 0 0 6px}.ex-tot .xd-totals tr.d td:last-child{border-radius:0 6px 6px 0}
.ex-foot{background:var(--dark);color:#fff;text-align:center;padding:6px;font-size:.85em}

/* Receipt card */
.doc[data-layout=x-card]{background:var(--tint);padding:10mm;gap:12px}
.cd-box{background:#fff;border-radius:calc(var(--radius) * 2);padding:14px 16px;box-shadow:0 2px 10px rgba(15,23,42,.06)}
.cd-head{display:flex;justify-content:space-between;align-items:center;gap:12px}
.cd-hero{text-align:center;background:linear-gradient(135deg,var(--accent),var(--dark));color:#fff}
.cd-hero .lbl{font-size:.8em;letter-spacing:.14em;text-transform:uppercase;opacity:.85}
.cd-hero .amt{font-size:2.8em;font-weight:800;line-height:1.15}
.cd-hero .xd-chip{background:rgba(255,255,255,.2);color:#fff;margin-top:4px}
.cd-hero .sub{opacity:.85;font-size:.9em;margin-top:4px}
.cd-two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.cd-row{display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px dashed var(--line)}
.cd-row:last-child{border-bottom:0}
.cd-row small{display:block;opacity:.6}
.cd-row .a{font-weight:700;white-space:nowrap}
.cd-sum{display:flex;justify-content:space-between;padding:3px 0}
.cd-sum.g{font-weight:800;font-size:1.2em;color:var(--accent);border-top:2px solid var(--accent);margin-top:6px;padding-top:8px}
.cd-foot{display:flex;justify-content:space-between;gap:14px;align-items:center}

/* Editorial */
.doc[data-layout=x-editorial]{padding:14mm 14mm 12mm;gap:16px}
.ed-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;border-bottom:1px solid var(--ink);padding-bottom:12px;position:relative;margin-bottom:4px}
.ed-head::after{content:"";position:absolute;left:0;right:0;bottom:-5px;border-bottom:1px solid var(--ink)}
.ed-title{font-size:3em;font-weight:300;line-height:1;font-style:italic;color:var(--accent)}
.ed-no{margin-top:6px;letter-spacing:.14em;text-transform:uppercase;font-size:.85em}
.ed-head .rt{text-align:right}
.ed-meta{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.ed-meta small{display:block;font-size:.7em;letter-spacing:.14em;text-transform:uppercase;opacity:.6}
.ed-parties{display:grid;grid-template-columns:1fr 1fr;gap:24px}
.doc[data-layout=x-editorial] .xd-items th{border-top:1px solid var(--ink);border-bottom:1px solid var(--ink);font-weight:600}
.doc[data-layout=x-editorial] .xd-items td{border-bottom:1px dotted #9ca3af}
.ed-foot{display:grid;grid-template-columns:1fr 1fr;gap:28px;align-items:start}
.ed-total{display:flex;justify-content:space-between;align-items:baseline;border-top:1px solid var(--ink);border-bottom:1px solid var(--ink);padding:8px 0;margin-top:6px}
.ed-total b{font-size:1.9em;color:var(--accent);font-weight:400;font-style:italic}

/* Prism */
.doc[data-layout=x-prism]{padding:0;gap:0}
.pr-top{background:var(--accent);color:#fff;padding:12mm 12mm 20mm;clip-path:polygon(0 0,100% 0,100% 72%,0 100%);display:flex;justify-content:space-between;gap:16px;align-items:flex-start}
.pr-top .t{font-size:2.2em;font-weight:800;letter-spacing:.08em;text-align:right;line-height:1}
.pr-body{padding:0 12mm 8mm;display:flex;flex-direction:column;gap:14px;flex:1;margin-top:-5mm}
.pr-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.pr-strip>div{border:1px solid var(--line);border-radius:999px;padding:6px 12px;text-align:center;background:#fff}
.pr-strip small{display:block;font-size:.68em;letter-spacing:.1em;text-transform:uppercase;opacity:.6}
.pr-parties{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.pr-parties>div{background:var(--tint);border-radius:calc(var(--radius) * 2);padding:10px 14px}
.doc[data-layout=x-prism] .xd-items th{background:var(--tint);color:var(--accent)}
.doc[data-layout=x-prism] .xd-items th:first-child{border-radius:999px 0 0 999px}
.doc[data-layout=x-prism] .xd-items th:last-child{border-radius:0 999px 999px 0}
.doc[data-layout=x-prism] .xd-items tbody tr:nth-child(even) td{background:color-mix(in srgb,var(--accent) 5%,#fff)}
.pr-bottom{display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start}
.pr-tot{background:var(--tint);border-radius:calc(var(--radius) * 2);padding:10px 16px}
.pr-tot .xd-totals tr.d td{color:var(--accent);font-size:1.15em}
.pr-bar{height:8px;background:linear-gradient(90deg,var(--accent),var(--dark))}
`;

export function useDesignStyles() {
  useEffect(() => {
    let s = document.getElementById('doc-design-css');
    if (!s) {
      s = document.createElement('style');
      s.id = 'doc-design-css';
      document.head.appendChild(s);
    }
    if (s.textContent !== DESIGN_CSS) s.textContent = DESIGN_CSS;
  }, []);
}

/* ---------- shared pieces ---------- */
const hide = (e) => (e.currentTarget.style.display = 'none');

function prep({ cfg, co, invoice }) {
  const s = cfg.show;
  const bill = addrText(invoice.billingAddress);
  const b = co.bank || {};
  return {
    s,
    b,
    bill,
    ship: addrText(invoice.shippingAddress) || bill,
    terms: invoice.termsAndConditions || co.terms,
    title: cfg.title || L.invoiceTitle,
    hasBank: s.bank && (b.accountNo || b.name),
  };
}

const root = (cfg) => ({
  className: 'doc xd',
  'data-layout': cfg.layout,
  'data-paper': cfg.paper,
  style: docVars(cfg),
});

const Brand = ({ co, cfg }) => (
  <div className="xd-brand">
    {cfg.show.logo && co.logo && <img className="xd-logo" src={co.logo} alt="" onError={hide} />}
    <div>
      <div className="xd-co">{co.name}</div>
      {co.tagline && <div className="xd-sub">{co.tagline}</div>}
    </div>
  </div>
);

const CoLines = ({ co }) => (
  <div className="xd-lines">
    {co.address}
    {'\n'}
    {[co.phone && `Ph: ${co.phone}`, co.email].filter(Boolean).join('  |  ')}
    {co.gstin ? `\nGSTIN: ${co.gstin}` : ''}
  </div>
);

const BillBlock = ({ invoice, c }) => (
  <>
    <b>{invoice.customerName}</b>
    {invoice.customerPhone && <div className="sm">{invoice.customerPhone}</div>}
    {c.bill && <div className="sm xd-pre">{c.bill}</div>}
    {invoice.customerGstNo && <div className="sm"><b>{L.gstin}:</b> {invoice.customerGstNo}</div>}
  </>
);

const Bank = ({ c, co }) =>
  c.hasBank ? (
    <div className="xd-bank">
      <h5>{L.bank}</h5>
      {c.b.name} {c.b.branch && `- ${c.b.branch}`}<br />
      A/c: {c.b.accountNo}<br />IFSC: {c.b.ifsc}
      {c.s.upi && co.upi && <div>{L.upi}: {co.upi}</div>}
    </div>
  ) : null;

const Qr = ({ c, co, invoice, v, size = 84 }) =>
  c.s.qr && co.upi ? (
    <div className="xd-qr">
      <QRCodeSVG value={upiLink(co, invoice, v)} size={size} />
      <div>{L.scanToPay}</div>
    </div>
  ) : null;

function Items({ v, s }) {
  return (
    <table className="xd-items">
      <thead>
        <tr>
          <th style={{ width: 26 }}>#</th>
          <th>{L.item}</th>
          {s.hsn && <th>{L.hsn}</th>}
          {s.qty && <th className="r">{L.qty}</th>}
          {s.rate && <th className="r">{L.rate}</th>}
          {s.taxPercent && <th className="r">{L.taxPercent}</th>}
          <th className="r">{L.amount}</th>
        </tr>
      </thead>
      <tbody>
        {v.items.map((it, i) => (
          <tr key={i}>
            <td>{i + 1}</td>
            <td><b>{it.name}</b>{it.description && <small>{it.description}</small>}</td>
            {s.hsn && <td>{it.hsn || '-'}</td>}
            {s.qty && <td className="r">{it.qty} {it.unit || ''}</td>}
            {s.rate && <td className="r">{rs(it.ratePaise)}</td>}
            {s.taxPercent && <td className="r">{it.taxPercent}%</td>}
            <td className="r">{rs(it.amountPaise)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const Totals = ({ v }) => (
  <table className="xd-totals">
    <tbody>
      {v.rows.map(([k, val]) => <tr key={k}><td>{k}</td><td className="r">{rs(val)}</td></tr>)}
      <tr className="g"><td>{L.total}</td><td className="r">₹ {rs(v.total)}</td></tr>
      <tr><td>{L.paid}</td><td className="r">{rs(v.paid)}</td></tr>
      <tr className="d"><td>{L.balance}</td><td className="r">{rs(v.due)}</td></tr>
    </tbody>
  </table>
);

const Terms = ({ c }) =>
  c.s.terms && c.terms ? (
    <div className="xd-terms"><h5>{L.terms}</h5><div className="xd-pre">{c.terms}</div></div>
  ) : null;

const Sign = ({ c, co }) =>
  c.s.signature ? (
    <div className="xd-sign">
      <div><small>{L.receiver}</small></div>
      <div><b>{L.forCompany} {co.name}</b><small>{L.signatory}</small></div>
    </div>
  ) : null;

const Stamp = ({ c, invoice }) =>
  c.s.paidStamp && invoice.paymentStatus === 'PAID' ? <div className="xd-stamp">{L.paidStamp}</div> : null;

const Status = ({ c, invoice }) =>
  c.s.status && invoice.paymentStatus ? <span className="xd-chip">{invoice.paymentStatus}</span> : null;

/* ---------- 1. Aurora: dark sidebar + wide content ---------- */
function Aurora({ cfg, co, invoice, v, c }) {
  return (
    <div {...root(cfg)}>
      <aside className="au-side">
        <Brand co={co} cfg={cfg} />
        <CoLines co={co} />
        <section><h5>{L.billTo}</h5><BillBlock invoice={invoice} c={c} /></section>
        {c.s.shipTo && <section><h5>{L.shipTo}</h5><div className="sm xd-pre">{c.ship || '-'}</div></section>}
        {c.hasBank && <section><Bank c={c} co={co} /></section>}
        <div style={{ flex: 1 }} />
        <Qr c={c} co={co} invoice={invoice} v={v} size={78} />
      </aside>
      <main className="au-main">
        <div className="au-top">
          <div className="t">{c.title}</div>
          <div className="n">#{invoice.invoiceNumber}</div>
        </div>
        <div className="au-meta">
          <div><small>{L.date}</small>{fmtDate(invoice.invoiceDate)}</div>
          <div><small>{L.dueDate}</small>{fmtDate(invoice.dueDate)}</div>
          <div><small>{L.paymentTerms}</small>{invoice.paymentTerms || '-'} <Status c={c} invoice={invoice} /></div>
        </div>
        <div className="xd-grow"><Items v={v} s={c.s} /></div>
        <div className="au-bottom">
          <div>
            {c.s.amountInWords && <><h5>{L.inWords}</h5><b>{amountInWords(v.total)}</b></>}
            {c.s.notes && invoice.notes && <div className="sm" style={{ marginTop: 8 }}><h5>{L.notes}</h5>{invoice.notes}</div>}
          </div>
          <Totals v={v} />
        </div>
        <Terms c={c} />
        <Sign c={c} co={co} />
      </main>
      <Stamp c={c} invoice={invoice} />
    </div>
  );
}

/* ---------- 2. Executive: banner + overlapping cards ---------- */
function Executive({ cfg, co, invoice, v, c }) {
  return (
    <div {...root(cfg)}>
      <header className="ex-band">
        <div><Brand co={co} cfg={cfg} /><div style={{ marginTop: 8 }}><CoLines co={co} /></div></div>
        <div><div className="big">{c.title}</div><div className="no">{L.invoiceNo} {invoice.invoiceNumber}</div></div>
      </header>
      <div className="ex-body">
        <div className="ex-cards">
          <div className="ex-card"><h5>{L.billTo}</h5><BillBlock invoice={invoice} c={c} /></div>
          {c.s.shipTo ? <div className="ex-card"><h5>{L.shipTo}</h5><div className="sm xd-pre">{c.ship || '-'}</div></div> : <div />}
          <div className="ex-card">
            <h5>{L.details}</h5>
            <div className="kv">
              <span>{L.date}</span><b>{fmtDate(invoice.invoiceDate)}</b>
              <span>{L.dueDate}</span><b>{fmtDate(invoice.dueDate)}</b>
              {invoice.paymentTerms && <><span>{L.paymentTerms}</span><b>{invoice.paymentTerms}</b></>}
            </div>
            <div style={{ marginTop: 6 }}><Status c={c} invoice={invoice} /></div>
          </div>
        </div>
        <div className="xd-grow"><Items v={v} s={c.s} /></div>
        <div className="ex-bottom">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {c.s.amountInWords && <div><h5>{L.inWords}</h5><b>{amountInWords(v.total)}</b></div>}
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <Bank c={c} co={co} />
              <Qr c={c} co={co} invoice={invoice} v={v} size={76} />
            </div>
          </div>
          <div className="ex-tot"><Totals v={v} /></div>
        </div>
        <Terms c={c} />
        <Sign c={c} co={co} />
      </div>
      <footer className="ex-foot">{L.thankYou}</footer>
      <Stamp c={c} invoice={invoice} />
    </div>
  );
}

/* ---------- 3. Receipt card: hero amount + item list ---------- */
function ReceiptCard({ cfg, co, invoice, v, c }) {
  const settled = v.due <= 0;
  return (
    <div {...root(cfg)}>
      <div className="cd-box cd-head">
        <div><Brand co={co} cfg={cfg} /><div style={{ marginTop: 6, color: '#475569' }}><CoLines co={co} /></div></div>
        <div className="r"><b style={{ color: 'var(--accent)', letterSpacing: '.08em' }}>{c.title}</b><div className="sm">#{invoice.invoiceNumber}</div></div>
      </div>

      <div className="cd-box cd-hero">
        <div className="lbl">{settled ? 'Paid in full' : L.balance}</div>
        <div className="amt">₹ {rs(settled ? v.total : v.due)}</div>
        <Status c={c} invoice={invoice} />
        <div className="sub">{L.date} {fmtDate(invoice.invoiceDate)} · {L.dueDate} {fmtDate(invoice.dueDate)}{invoice.paymentTerms ? ` · ${invoice.paymentTerms}` : ''}</div>
      </div>

      <div className="cd-two">
        <div className="cd-box"><h5>{L.billTo}</h5><BillBlock invoice={invoice} c={c} /></div>
        {c.s.shipTo ? <div className="cd-box"><h5>{L.shipTo}</h5><div className="sm xd-pre">{c.ship || '-'}</div></div> : <div />}
      </div>

      <div className="cd-box xd-grow">
        <h5>{L.item}s</h5>
        {v.items.map((it, i) => (
          <div className="cd-row" key={i}>
            <div>
              <b>{it.name}</b>
              <small>
                {it.qty} {it.unit || ''}{c.s.rate && ` × ${rs(it.ratePaise)}`}{c.s.taxPercent && ` · ${it.taxPercent}% tax`}{c.s.hsn && it.hsn ? ` · HSN ${it.hsn}` : ''}
              </small>
            </div>
            <div className="a">₹ {rs(it.amountPaise)}</div>
          </div>
        ))}
        <div style={{ marginTop: 8 }}>
          {v.rows.map(([k, val]) => <div className="cd-sum" key={k}><span>{k}</span><span>{rs(val)}</span></div>)}
          <div className="cd-sum g"><span>{L.total}</span><span>₹ {rs(v.total)}</span></div>
          <div className="cd-sum"><span>{L.paid}</span><span>{rs(v.paid)}</span></div>
        </div>
        {c.s.amountInWords && <div className="sm" style={{ marginTop: 6, opacity: 0.75 }}>{amountInWords(v.total)}</div>}
      </div>

      <div className="cd-box cd-foot">
        <Bank c={c} co={co} />
        <Qr c={c} co={co} invoice={invoice} v={v} size={74} />
      </div>
      <Terms c={c} />
      <Sign c={c} co={co} />
      <Stamp c={c} invoice={invoice} />
    </div>
  );
}

/* ---------- 4. Editorial: serif, ruled, airy ---------- */
function Editorial({ cfg, co, invoice, v, c }) {
  return (
    <div {...root(cfg)}>
      <header className="ed-head">
        <div>
          <div className="ed-title">{c.title.toLowerCase().replace(/^./, (m) => m.toUpperCase())}</div>
          <div className="ed-no">No. {invoice.invoiceNumber}</div>
        </div>
        <div className="rt">
          <div className="xd-co" style={{ color: 'var(--accent)' }}>{co.name}</div>
          <CoLines co={co} />
        </div>
      </header>

      <div className="ed-meta">
        <div><small>{L.date}</small>{fmtDate(invoice.invoiceDate)}</div>
        <div><small>{L.dueDate}</small>{fmtDate(invoice.dueDate)}</div>
        <div><small>{L.paymentTerms}</small>{invoice.paymentTerms || '-'}</div>
        <div><small>Status</small>{invoice.paymentStatus || '-'}</div>
      </div>

      <div className="ed-parties">
        <div><h5>{L.billTo}</h5><BillBlock invoice={invoice} c={c} /></div>
        {c.s.shipTo && <div><h5>{L.shipTo}</h5><div className="sm xd-pre">{c.ship || '-'}</div></div>}
      </div>

      <div className="xd-grow"><Items v={v} s={c.s} /></div>

      <div className="ed-foot">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {c.s.amountInWords && <div><h5>{L.inWords}</h5><i>{amountInWords(v.total)}</i></div>}
          <Bank c={c} co={co} />
          <Qr c={c} co={co} invoice={invoice} v={v} size={70} />
          {c.s.notes && invoice.notes && <div className="sm"><h5>{L.notes}</h5>{invoice.notes}</div>}
        </div>
        <div>
          <table className="xd-totals">
            <tbody>
              {v.rows.map(([k, val]) => <tr key={k}><td>{k}</td><td className="r">{rs(val)}</td></tr>)}
              <tr><td>{L.paid}</td><td className="r">{rs(v.paid)}</td></tr>
              <tr><td>{L.balance}</td><td className="r">{rs(v.due)}</td></tr>
            </tbody>
          </table>
          <div className="ed-total"><span>{L.total}</span><b>₹ {rs(v.total)}</b></div>
        </div>
      </div>
      <Terms c={c} />
      <Sign c={c} co={co} />
      <Stamp c={c} invoice={invoice} />
    </div>
  );
}

/* ---------- 5. Prism: slanted header, pill strip, rounded rows ---------- */
function Prism({ cfg, co, invoice, v, c }) {
  return (
    <div {...root(cfg)}>
      <header className="pr-top">
        <div><Brand co={co} cfg={cfg} /><div style={{ marginTop: 8 }}><CoLines co={co} /></div></div>
        <div className="t">{c.title}</div>
      </header>
      <div className="pr-body">
        <div className="pr-strip">
          <div><small>{L.invoiceNo}</small><b>{invoice.invoiceNumber}</b></div>
          <div><small>{L.date}</small>{fmtDate(invoice.invoiceDate)}</div>
          <div><small>{L.dueDate}</small>{fmtDate(invoice.dueDate)}</div>
          <div><small>{L.paymentTerms}</small>{invoice.paymentTerms || '-'}</div>
        </div>
        <div className="pr-parties">
          <div><h5>{L.billTo}</h5><BillBlock invoice={invoice} c={c} /></div>
          {c.s.shipTo ? <div><h5>{L.shipTo}</h5><div className="sm xd-pre">{c.ship || '-'}</div></div> : <div />}
        </div>
        <div className="xd-grow"><Items v={v} s={c.s} /></div>
        <div className="pr-bottom">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {c.s.amountInWords && <div><h5>{L.inWords}</h5><b>{amountInWords(v.total)}</b></div>}
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <Bank c={c} co={co} />
              <Qr c={c} co={co} invoice={invoice} v={v} size={74} />
            </div>
          </div>
          <div className="pr-tot"><Totals v={v} /></div>
        </div>
        <Terms c={c} />
        <Sign c={c} co={co} />
      </div>
      <div className="pr-bar" />
      <Stamp c={c} invoice={invoice} />
    </div>
  );
}

const LAYOUTS = {
  'x-aurora': Aurora,
  'x-exec': Executive,
  'x-card': ReceiptCard,
  'x-editorial': Editorial,
  'x-prism': Prism,
};

export const isDesign = (layout) => Object.prototype.hasOwnProperty.call(LAYOUTS, layout);

export default function Design(props) {
  useDesignStyles();
  const Layout = LAYOUTS[props.cfg.layout];
  return <Layout {...props} c={prep(props)} />;
}