import { useEffect } from 'react';
import { FONTS, DENSITY } from './templates.config';

export const DOC_CSS = `
.doc{--line:#d1d5db;--tint:color-mix(in srgb,var(--accent) 9%,#fff);box-sizing:border-box;padding:10mm;background:#fff;color:#111827;font-family:var(--font);font-size:var(--fs);line-height:1.45;position:relative;display:flex;flex-direction:column;gap:12px;-webkit-print-color-adjust:exact;print-color-adjust:exact;text-align:left}
.doc *{box-sizing:border-box}
.doc .muted{color:#6b7280}.doc .sm{font-size:.88em}.doc .pre{white-space:pre-line}.doc .r{text-align:right}.doc .c{text-align:center}
.doc .hd{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}
.doc .brand{display:flex;gap:12px;align-items:flex-start}
.doc .logo{max-height:64px;max-width:150px;object-fit:contain}
.doc .co-name{font-size:1.5em;font-weight:700;color:var(--accent);line-height:1.2}
.doc .doc-title{font-size:1.25em;font-weight:800;letter-spacing:.06em;color:var(--accent)}
.doc .title-box{text-align:right}
.doc .parties{display:grid;grid-template-columns:1.2fr 1.2fr 1fr;gap:12px}
.doc .box{border:1px solid var(--line);border-radius:var(--radius);padding:var(--pad) calc(var(--pad) + 4px)}
.doc .box h4{margin:0 0 4px;font-size:.85em;font-weight:700;color:var(--accent)}
.doc .kv{display:grid;grid-template-columns:auto 1fr;gap:2px 10px}
.doc .kv>span:nth-child(odd){color:#6b7280}
.doc .kv.two{grid-template-columns:auto 1fr auto 1fr}
.doc .kv.two>span:nth-child(4n+3){color:#6b7280}.doc .kv.two>span:nth-child(4n+1){color:#6b7280}
.doc table{width:100%;border-collapse:collapse}
.doc th,.doc td{padding:var(--pad) 8px;text-align:left;vertical-align:top}
.doc th.r,.doc td.r{text-align:right}
.doc thead{display:table-header-group}.doc tr{break-inside:avoid}
.doc[data-table=grid] :is(.items,.hsn) :is(th,td){border:1px solid var(--line)}
.doc[data-table=grid] :is(.items,.hsn) th{background:var(--tint)}
.doc[data-table=lines] :is(.items,.hsn) th{border-bottom:2px solid var(--accent)}
.doc[data-table=lines] :is(.items,.hsn) td{border-bottom:1px solid var(--line)}
.doc[data-table=zebra] :is(.items,.hsn) th,.doc[data-table=solid] :is(.items,.hsn) th{background:var(--accent);color:#fff}
.doc[data-table=zebra] :is(.items,.hsn) tbody tr:nth-child(even){background:var(--tint)}
.doc[data-table=solid] :is(.items,.hsn) td{border-bottom:1px solid var(--line)}
.doc[data-table=soft] :is(.items,.hsn) th{background:var(--tint);color:var(--accent)}
.doc[data-table=soft] :is(.items,.hsn) td{border-bottom:1px dashed var(--line)}
.doc .grow{flex:1;display:flex;flex-direction:column}
.doc .grow table.items{flex:1}
.doc tr.fill,.doc[data-table] tr.fill{background:transparent!important}
.doc tr.fill td{height:100%;padding:0;border-top:0!important;border-bottom:0!important}
.doc[data-table=grid] tr.fill td:last-child{border-bottom:1px solid var(--line)!important}
.doc .hsn{font-size:.9em}.doc .hsn th,.doc .hsn td{padding:3px 6px}
.doc .row2{display:flex;gap:10px;align-items:flex-start}
.doc .bottom{display:grid;grid-template-columns:1.2fr 1fr;gap:16px;break-inside:avoid}
/* ---- layouts ---- */
.doc[data-layout=banner] .hd{background:var(--accent);padding:14px 16px;border-radius:var(--radius)}
.doc[data-layout=banner] .hd *{color:#fff!important}
.doc[data-layout=centered] .hd{flex-direction:column;align-items:center;text-align:center;border-bottom:2px solid var(--accent);padding-bottom:10px}
.doc[data-layout=centered] .brand{flex-direction:column;align-items:center}
.doc[data-layout=minimal] .hd{border-bottom:1px solid var(--line);padding-bottom:12px;align-items:flex-end}
.doc[data-layout=minimal] .doc-title.big{font-size:2.3em;font-weight:300;letter-spacing:.12em;line-height:1}
.doc[data-layout=minimal] .brand{flex-direction:row-reverse;text-align:right}
.doc[data-layout=sidebar]{padding-left:18mm}
.doc[data-layout=sidebar]::before{content:"";position:absolute;left:7mm;top:7mm;bottom:7mm;width:7px;background:var(--accent)}
.doc[data-layout=boxed],.doc[data-layout=gst]{padding:12mm}
.doc[data-layout=boxed]::before,.doc[data-layout=gst]::before{content:"";position:absolute;inset:7mm;border:1.5px solid #111;pointer-events:none}
.doc[data-layout=gst] .hd{flex-direction:column;gap:8px}
.doc[data-layout=gst] .gst-top{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;border-bottom:1.5px solid #111;padding-bottom:6px;width:100%}
.doc[data-layout=gst] .brand{width:100%}
.doc[data-layout=gst] .brand>div{flex:1;text-align:center}
.doc[data-layout=gst] .doc-title{color:#111}
.doc[data-layout=gst] .box{border-color:#111;border-radius:0}
.doc[data-layout=gst] .totals td,.doc[data-layout=gst] .bottom{font-size:1em}
.doc[data-layout=boxed] .hd{border-bottom:1.5px solid #111;padding-bottom:10px}
.doc[data-layout=boxed] .box{border-color:#111}
.doc[data-layout=ribbon] .doc-title{background:var(--accent);color:#fff;padding:5px 16px 5px 22px;border-radius:999px 0 0 999px;margin-right:-10mm}
.doc[data-layout=split] .brand{background:var(--accent);padding:14px 16px;border-radius:var(--radius);flex:1}
.doc[data-layout=split] .brand *{color:#fff!important}
.doc[data-layout=split] .hd{gap:20px;align-items:stretch}
.doc[data-layout=split] .title-box{display:flex;flex-direction:column;justify-content:center;min-width:34%}
/* ---- paper sizes ---- */
.doc[data-paper=A4]{width:210mm;min-height:297mm}
.doc[data-paper=A5]{width:148mm;min-height:210mm;padding:7mm}
.doc[data-paper=A5][data-layout=gst],.doc[data-paper=A5][data-layout=boxed]{padding:10mm}
.doc[data-paper=A5]::before{inset:4mm!important}
.doc[data-paper=A5] .parties{grid-template-columns:1fr 1fr}
.doc[data-paper=A5] .bottom{grid-template-columns:1fr 1fr;gap:10px}
.doc[data-paper=A4L]{width:297mm;min-height:210mm;padding:8mm}
.doc[data-paper=A4L][data-layout=gst]{padding:11mm}
.doc[data-paper=A4L]::before{inset:5mm!important}
.doc .parties>div:empty{display:none}
/* thermal receipts */
.doc[data-paper=T80],.doc[data-paper=T58]{min-height:0;gap:4px;padding:3mm;line-height:1.35}
.doc[data-paper=T80]{width:80mm}.doc[data-paper=T58]{width:58mm;padding:2mm}
.doc .th-c{text-align:center}
.doc .th-row{display:flex;justify-content:space-between;gap:6px}
.doc .th-hr{border-top:1px dashed #000;margin:2px 0}
.doc .th-row.grand{font-size:1.2em;border-top:1px dashed #000;border-bottom:1px dashed #000;padding:2px 0}
/* ---- print ---- */
#print-root{display:none}
@media print{
  @page{size:A4;margin:0}
  @page a5{size:A5;margin:0}
  @page a4l{size:A4 landscape;margin:0}
  @page t80{size:80mm 297mm;margin:0}
  @page t58{size:58mm 297mm;margin:0}
  html,body{background:#fff!important;margin:0!important;padding:0!important}
  body>*:not(#print-root){display:none!important}
  #print-root{display:block!important}
  .doc{box-decoration-break:clone;-webkit-box-decoration-break:clone}
  .doc[data-paper=A4]{min-height:296mm}
  .doc[data-paper=A5]{page:a5;min-height:209mm}
  .doc[data-paper=A4L]{page:a4l;min-height:209mm}
  .doc[data-paper=T80]{page:t80}
  .doc[data-paper=T58]{page:t58}
}
`;

/* injects the CSS once, so every template works stand-alone */
export function useDocStyles() {
  useEffect(() => {
    if (document.getElementById('doc-css')) return;
    const s = document.createElement('style');
    s.id = 'doc-css';
    s.textContent = DOC_CSS;
    document.head.appendChild(s);
  }, []);
}

export const docVars = (cfg) => ({
  '--accent': cfg.accent,
  '--font': FONTS[cfg.font] || FONTS.sans,
  '--fs': `${DENSITY[cfg.density].fs}px`,
  '--pad': `${DENSITY[cfg.density].pad}px`,
  '--radius': `${cfg.radius}px`,
});

export function Header({ cfg, co, title, right }) {
  const brand = (
    <div className="brand">
      {cfg.show.logo && co.logo && (
        <img className="logo" src={co.logo} alt="" onError={(e) => (e.currentTarget.style.display = 'none')} />
      )}
      <div>
        <div className="co-name">{co.name}</div>
        {co.tagline && <div className="muted sm">{co.tagline}</div>}
        <div className="muted sm pre">{co.address}</div>
        <div className="muted sm">{[co.phone && `Ph: ${co.phone}`, co.email].filter(Boolean).join('  |  ')}</div>
        {co.gstin && <div className="sm"><b>GSTIN:</b> {co.gstin}</div>}
      </div>
    </div>
  );
  const titleBox = (
    <div className="title-box">
      <div className="doc-title">{title}</div>
      {right}
    </div>
  );
  if (cfg.layout === 'gst')
    return (
      <header className="hd">
        <div className="gst-top"><span /><div className="doc-title">{title}</div><div className="r">{right}</div></div>
        {brand}
      </header>
    );
  if (cfg.layout === 'minimal')
    return <header className="hd"><div><div className="doc-title big">{title}</div>{right}</div>{brand}</header>;
  if (cfg.layout === 'centered')
    return <header className="hd">{brand}<div className="doc-title">{title}</div>{right}</header>;
  return <header className="hd">{brand}{titleBox}</header>;
}
