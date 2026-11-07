/* =====================================================================
   DELIVERY NOTE TEMPLATES
   30 ready-made print templates for Delivery Note / Delivery Challan,
   built the same way as INVOICE_TEMPLATES in templates.config.js so they
   plug straight into the existing TemplateManager / DocHeader / DOC_CSS
   system (shared.jsx). No new layouts are introduced — these combine the
   layouts you already have (classic, banner, centered, sidebar, minimal,
   boxed, gst, ribbon, split, thermal) with different table styles,
   accents, fonts, paper sizes and density so every one looks distinct —
   the same recipe Vyapar / myBillbook use for their template galleries.

   Drop this file in next to templates.config.js and re-export from there
   (see the two-line patch at the bottom of this comment), or just merge
   the array into templates.config.js directly.

   ---- integration (templates.config.js) ----
   import { DELIVERY_TEMPLATES, DELIVERY_DEFAULT } from './deliveryNote.templates';
   export { DELIVERY_TEMPLATES };
   // and extend DEFAULT_SELECTED:
   //   export const DEFAULT_SELECTED = { invoice: 'inv01', eway: 'ew01', delivery: DELIVERY_DEFAULT };

   ---- integration (TemplateManager.jsx) ----
   import DeliveryNoteTemplate from './DeliveryNoteTemplate';
   import { DELIVERY_TEMPLATES } from './templates.config';
   const KINDS = {
     invoice: { label: 'Sales invoice', list: INVOICE_TEMPLATES, Doc: InvoiceTemplate },
     eway:    { label: 'E-way bill',    list: EWAY_TEMPLATES,    Doc: EwayBillTemplate },
     delivery:{ label: 'Delivery note', list: DELIVERY_TEMPLATES, Doc: DeliveryNoteTemplate },
   };
   (SAMPLE_INVOICE already has items/addresses so it previews fine as-is.)
   ===================================================================== */

export const DELIVERY_DEFAULT = "dn01";

export const DELIVERY_TEMPLATES = [
  // ---- Classic & minimal ----
  {
    id: "dn01",
    group: "Classic",
    name: "Classic Blue",
    layout: "classic",
    table: "grid",
    accent: "#1d4ed8",
    font: "sans",
  },
  {
    id: "dn02",
    group: "Classic",
    name: "Classic Ink",
    layout: "classic",
    table: "lines",
    accent: "#111827",
    font: "serif",
  },
  {
    id: "dn03",
    group: "Classic",
    name: "Teal Centered",
    layout: "centered",
    table: "soft",
    accent: "#0f766e",
    font: "sans",
  },
  {
    id: "dn04",
    group: "Classic",
    name: "Gold Centered",
    layout: "centered",
    table: "lines",
    accent: "#b45309",
    font: "serif",
  },
  {
    id: "dn05",
    group: "Classic",
    name: "Slate Minimal",
    layout: "minimal",
    table: "lines",
    accent: "#334155",
    font: "sans",
  },
  {
    id: "dn06",
    group: "Classic",
    name: "Violet Minimal",
    layout: "minimal",
    table: "soft",
    accent: "#6d28d9",
    font: "rounded",
  },

  // ---- Boxed / bordered (challan-book look) ----
  {
    id: "dn07",
    group: "Boxed",
    name: "Boxed Black",
    layout: "boxed",
    table: "grid",
    accent: "#111827",
    font: "sans",
  },
  {
    id: "dn08",
    group: "Boxed",
    name: "Boxed Teal",
    layout: "boxed",
    table: "grid",
    accent: "#0f766e",
    font: "sans",
  },
  {
    id: "dn09",
    group: "Boxed",
    name: "Bordered Blue",
    layout: "gst",
    table: "grid",
    accent: "#1d4ed8",
    font: "sans",
    radius: 0,
  },
  {
    id: "dn10",
    group: "Boxed",
    name: "Bordered Green",
    layout: "gst",
    table: "grid",
    accent: "#15803d",
    font: "sans",
    radius: 0,
  },
  {
    id: "dn11",
    group: "Boxed",
    name: "Bordered Maroon",
    layout: "gst",
    table: "grid",
    accent: "#9f1239",
    font: "serif",
    radius: 0,
  },
  {
    id: "dn12",
    group: "Boxed",
    name: "Bordered Compact",
    layout: "gst",
    table: "grid",
    accent: "#1f2937",
    font: "sans",
    radius: 0,
    density: "compact",
  },

  // ---- Modern ----
  {
    id: "dn13",
    group: "Modern",
    name: "Indigo Banner",
    layout: "banner",
    table: "solid",
    accent: "#4338ca",
    font: "sans",
  },
  {
    id: "dn14",
    group: "Modern",
    name: "Emerald Banner",
    layout: "banner",
    table: "zebra",
    accent: "#047857",
    font: "sans",
  },
  {
    id: "dn15",
    group: "Modern",
    name: "Orange Ribbon",
    layout: "ribbon",
    table: "solid",
    accent: "#ea580c",
    font: "sans",
  },
  {
    id: "dn16",
    group: "Modern",
    name: "Purple Ribbon",
    layout: "ribbon",
    table: "zebra",
    accent: "#7e22ce",
    font: "rounded",
  },
  {
    id: "dn17",
    group: "Modern",
    name: "Rose Split",
    layout: "split",
    table: "solid",
    accent: "#e11d48",
    font: "sans",
  },
  {
    id: "dn18",
    group: "Modern",
    name: "Slate Split",
    layout: "split",
    table: "soft",
    accent: "#475569",
    font: "sans",
  },
  {
    id: "dn19",
    group: "Modern",
    name: "Navy Sidebar",
    layout: "sidebar",
    table: "soft",
    accent: "#1e3a8a",
    font: "rounded",
  },
  {
    id: "dn20",
    group: "Modern",
    name: "Amber Sidebar",
    layout: "sidebar",
    table: "lines",
    accent: "#d97706",
    font: "sans",
    density: "roomy",
  },

  // ---- A5 (half-sheet challan pads) ----
  {
    id: "dn21",
    group: "A5",
    name: "A5 Bordered",
    layout: "gst",
    table: "grid",
    accent: "#1d4ed8",
    font: "sans",
    radius: 0,
    paper: "A5",
    density: "compact",
  },
  {
    id: "dn22",
    group: "A5",
    name: "A5 Modern",
    layout: "banner",
    table: "soft",
    accent: "#0369a1",
    font: "sans",
    paper: "A5",
    density: "compact",
  },
  {
    id: "dn23",
    group: "A5",
    name: "A5 Classic",
    layout: "classic",
    table: "lines",
    accent: "#111827",
    font: "sans",
    paper: "A5",
    density: "compact",
  },

  // ---- Landscape A4 (good for many line items / batch-wise delivery) ----
  {
    id: "dn24",
    group: "Landscape",
    name: "Landscape Bordered",
    layout: "gst",
    table: "grid",
    accent: "#111827",
    font: "sans",
    radius: 0,
    paper: "A4L",
  },
  {
    id: "dn25",
    group: "Landscape",
    name: "Landscape Modern",
    layout: "banner",
    table: "zebra",
    accent: "#0891b2",
    font: "sans",
    paper: "A4L",
  },

  // ---- Thermal (handheld delivery / courier print) ----
  {
    id: "dn26",
    group: "Thermal",
    name: "Thermal 80mm",
    layout: "thermal",
    table: "lines",
    accent: "#000000",
    font: "mono",
    paper: "T80",
    density: "compact",
  },
  {
    id: "dn27",
    group: "Thermal",
    name: "Thermal 80mm Sans",
    layout: "thermal",
    table: "lines",
    accent: "#000000",
    font: "sans",
    paper: "T80",
    density: "compact",
  },
  {
    id: "dn28",
    group: "Thermal",
    name: "Thermal 58mm",
    layout: "thermal",
    table: "lines",
    accent: "#000000",
    font: "mono",
    paper: "T58",
    density: "compact",
  },

  // ---- A couple more distinct looks ----
  {
    id: "dn29",
    group: "Classic",
    name: "Crimson Centered",
    layout: "centered",
    table: "zebra",
    accent: "#be123c",
    font: "sans",
  },
  {
    id: "dn30",
    group: "Boxed",
    name: "Forest Boxed",
    layout: "boxed",
    table: "soft",
    accent: "#166534",
    font: "serif",
  },
];
