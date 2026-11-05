import { useState } from "react";
import JsBarcode from "jsbarcode";
import BcxModal from "./BcxModal";

export const LABEL_PRESETS = {
  "50x25": { name: "Thermal 50 × 25 mm", w: 50, h: 25, cols: 1, page: "50mm 25mm" },
  "38x25": { name: "Thermal 38 × 25 mm", w: 38, h: 25, cols: 1, page: "38mm 25mm" },
  "100x50": { name: "Thermal 100 × 50 mm", w: 100, h: 50, cols: 1, page: "100mm 50mm" },
  "a4-3x8": { name: "A4 sheet 3 × 8 (70 × 37 mm)", w: 70, h: 37, cols: 3, page: "A4" },
  "a4-4x12": { name: "A4 sheet 4 × 12 (48.5 × 25.4 mm)", w: 48.5, h: 25.4, cols: 4, page: "A4" },
};

const DEFAULTS = {
  preset: "50x25", copies: 1, showName: true, showSku: true, showPackaging: true, showPrice: true,
  barHeight: 40, fontSize: 11,
};

// stored barcodeType -> JsBarcode format
const FORMAT_BY_TYPE = { EAN13: "EAN13", EAN8: "EAN8", UPC_A: "UPC", ITF14: "ITF14", CODE128: "CODE128" };

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const barcodeSvg = (code, cfg, type) => {
  const make = (format) => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(svg, code, {
      format, displayValue: true, height: cfg.barHeight, width: 1.6, margin: 0, fontSize: cfg.fontSize,
    });
    return svg;
  };
  let svg;
  try { svg = make(FORMAT_BY_TYPE[type] || "CODE128"); }
  catch { svg = make("CODE128"); } // invalid for its own format -> still printable
  const w = svg.getAttribute("width"); const h = svg.getAttribute("height");
  svg.setAttribute("viewBox", `0 0 ${parseFloat(w)} ${parseFloat(h)}`);
  svg.removeAttribute("width"); svg.removeAttribute("height");
  svg.setAttribute("style", "width:100%;max-height:60%");
  return svg.outerHTML;
};

/** Pack text shown on the label: "Box ×100"; single units show nothing. */
export const packLabel = (packagingName, conversionQuantity) => {
  const q = Number(conversionQuantity) || 1;
  if (q > 1) return `${packagingName && packagingName !== "Unit" ? packagingName : "Pack"} ×${q}`;
  return packagingName && packagingName !== "Unit" ? packagingName : "";
};

/** labels: [{ name, sku, packaging, barcode, barcodeType, price }] */
export function buildLabelHtml(labels, userCfg = {}) {
  const cfg = { ...DEFAULTS, ...userCfg };
  const p = LABEL_PRESETS[cfg.preset] || LABEL_PRESETS["50x25"];
  const copies = Math.min(500, Math.max(1, Number(cfg.copies) || 1));
  const cells = [];

  for (const l of labels) {
    if (!l?.barcode) continue;
    const svg = barcodeSvg(l.barcode, cfg, l.barcodeType);
    const meta = [cfg.showSku && l.sku, cfg.showPackaging && l.packaging].filter(Boolean).join(" · ");
    const html = `<div class="label">
      ${cfg.showName ? `<div class="n">${esc(l.name)}</div>` : ""}
      ${svg}
      ${meta ? `<div class="m">${esc(meta)}</div>` : ""}
      ${cfg.showPrice && l.price != null ? `<div class="p">₹${Number(l.price).toFixed(2)}</div>` : ""}
    </div>`;
    for (let i = 0; i < copies; i += 1) cells.push(html);
  }

  const sheet = p.page === "A4";
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page{size:${p.page};margin:${sheet ? "8mm 6mm" : "0"}}
    *{box-sizing:border-box} body{margin:0;font-family:Arial,sans-serif;color:#000}
    .grid{display:grid;grid-template-columns:repeat(${p.cols},${p.w}mm);${sheet ? "" : "grid-auto-rows:" + p.h + "mm;"}}
    .label{width:${p.w}mm;height:${p.h}mm;padding:1.5mm 2mm;overflow:hidden;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;page-break-inside:avoid;${sheet ? "" : "page-break-after:always;"}}
    .n{font-size:${cfg.fontSize}px;font-weight:700;line-height:1.1;max-height:2.4em;overflow:hidden;width:100%}
    .m{font-size:${Math.max(7, cfg.fontSize - 3)}px}
    .p{font-size:${cfg.fontSize + 2}px;font-weight:700}
  </style></head><body><div class="grid">${cells.join("")}</div></body></html>`;
}

/** Browser printing. In the print dialog choose "Save as PDF" for a PDF file. */
export function printLabels(labels, cfg) {
  const html = buildLabelHtml(labels, cfg);
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  doc.open(); doc.write(html); doc.close();
  const cleanup = () => setTimeout(() => frame.remove(), 500);
  frame.contentWindow.onafterprint = cleanup;
  setTimeout(() => { frame.contentWindow.focus(); frame.contentWindow.print(); setTimeout(cleanup, 60000); }, 250);
}

export function LabelPrintDialog({ open, labels, onClose }) {
  const [cfg, setCfg] = useState(DEFAULTS);
  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }));
  const count = labels.filter((l) => l.barcode).length * (Number(cfg.copies) || 1);

  return (
    <BcxModal open={open} title="Print barcode labels" onClose={onClose}>
      <div className="bcx-form">
        <label>Label size
          <select className="bcx-input" value={cfg.preset} onChange={(e) => set("preset", e.target.value)}>
            {Object.entries(LABEL_PRESETS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
          </select>
        </label>
        <div className="bcx-row">
          <label>Copies per product
            <input className="bcx-input" type="number" min="1" max="500" value={cfg.copies} onChange={(e) => set("copies", e.target.value)} />
          </label>
          <label>Bar height
            <input className="bcx-input" type="number" min="15" max="120" value={cfg.barHeight} onChange={(e) => set("barHeight", Number(e.target.value))} />
          </label>
          <label>Font size
            <input className="bcx-input" type="number" min="7" max="20" value={cfg.fontSize} onChange={(e) => set("fontSize", Number(e.target.value))} />
          </label>
        </div>
        <div className="bcx-checks">
          {[["showName", "Product name"], ["showSku", "SKU"], ["showPackaging", "Packaging"], ["showPrice", "Selling price"]].map(([k, l]) => (
            <label key={k} className="bcx-check"><input type="checkbox" checked={cfg[k]} onChange={(e) => set(k, e.target.checked)} /> {l}</label>
          ))}
        </div>
        <p className="bcx-hint">{count} label(s). Choose “Save as PDF” in the print dialog to export a PDF.</p>
        <div className="bcx-actions">
          <button type="button" className="bcx-btn" onClick={onClose}>Close</button>
          <button type="button" className="bcx-btn is-primary" disabled={!count} onClick={() => printLabels(labels, cfg)}>Print</button>
        </div>
      </div>
    </BcxModal>
  );
}