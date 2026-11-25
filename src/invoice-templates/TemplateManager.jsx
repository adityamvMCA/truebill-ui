import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import ShareInvoiceButton from "../components/common/ShareInvoice/ShareInvoiceButton";
import {
  INVOICE_TEMPLATES,
  EWAY_TEMPLATES,
  DELIVERY_TEMPLATES,
  PURCHASE_BILL_TEMPLATES,
  PURCHASE_RETURN_TEMPLATES,
  SALES_RETURN_TEMPLATES,
  GOODS_RECEIPT_TEMPLATES,
  DEFAULT_SELECTED,
  STORAGE_KEY,
  PAPERS,
  DEFAULTS,
} from "./templates.config";
import InvoiceTemplate from "./InvoiceTemplate";
import EwayBillTemplate from "./EwayBillTemplate";
import DeliveryNoteTemplate from "./DeliveryNoteTemplate";
import PurchaseBillTemplate from "./PurchaseBillTemplate";
import PurchaseReturnTemplate from "./PurchaseReturnTemplate";
import SalesReturnTemplate from "./SalesReturnTemplate";
import GoodsReceiptTemplate from "./GoodsReceiptTemplate";
import {
  SAMPLE_INVOICE,
  SAMPLE_PURCHASE_BILL,
  SAMPLE_PURCHASE_RETURN,
  SAMPLE_SALES_RETURN,
  SAMPLE_GOODS_RECEIPT,
} from "./sampleData";
import toast from "react-hot-toast";
import documentApi from "../services/modules/documentApi";

const KINDS = {
  invoice: {
    label: "Sales invoice",
    list: INVOICE_TEMPLATES,
    Doc: InvoiceTemplate,
    sample: SAMPLE_INVOICE,
  },
  eway: {
    label: "E-way bill",
    list: EWAY_TEMPLATES,
    Doc: EwayBillTemplate,
    sample: SAMPLE_INVOICE,
  },
  delivery: {
    label: "Delivery note",
    list: DELIVERY_TEMPLATES,
    Doc: DeliveryNoteTemplate,
    sample: SAMPLE_INVOICE,
  },
  purchaseBill: {
    label: "Purchase bill",
    list: PURCHASE_BILL_TEMPLATES,
    Doc: PurchaseBillTemplate,
    sample: SAMPLE_PURCHASE_BILL,
  },
  purchaseReturn: {
    label: "Purchase return",
    list: PURCHASE_RETURN_TEMPLATES,
    Doc: PurchaseReturnTemplate,
    sample: SAMPLE_PURCHASE_RETURN,
  },
  salesReturn: {
    label: "Sales return",
    list: SALES_RETURN_TEMPLATES,
    Doc: SalesReturnTemplate,
    sample: SAMPLE_SALES_RETURN,
  },
  goodsReceipt: {
    label: "Goods receipt",
    list: GOODS_RECEIPT_TEMPLATES,
    Doc: GoodsReceiptTemplate,
    sample: SAMPLE_GOODS_RECEIPT,
  },
};

const mm = (v) => (v * 96) / 25.4;
const dims = (t) => {
  const P = PAPERS[t.paper || DEFAULTS.paper] || PAPERS.A4;
  return { w: mm(P.w), h: mm(P.h) };
};

/* ---------- small media-query hook ---------- */
function useMedia(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    setMatches(mq.matches);

    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, [query]);

  return matches;
}

/* Server copy of the selected templates, cached per tenant */
const serverCache = new Map();
const tenantKey = () => sessionStorage.getItem("selectedTenantId") || "current";

const loadServerTemplates = () => {
  const key = tenantKey();
  if (!serverCache.has(key)) {
    serverCache.set(
      key,
      documentApi
        .getPrintTemplates()
        .then((r) => r?.data?.templates || {})
        .catch(() => ({})),
    );
  }
  return serverCache.get(key);
};

export function useSelectedTemplates() {
  const [sel, setSel] = useState(() => {
    try {
      return {
        ...DEFAULT_SELECTED,
        ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"),
      };
    } catch {
      return DEFAULT_SELECTED;
    }
  });

  // The server is the source of truth, so every device sees the same template
  useEffect(() => {
    let alive = true;
    loadServerTemplates().then((server) => {
      if (alive && Object.keys(server).length) setSel((prev) => ({ ...prev, ...server }));
    });
    return () => {
      alive = false;
    };
  }, []);

  const choose = (kind, id) => {
    const next = { ...sel, [kind]: id };
    setSel(next);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }

    serverCache.set(
      tenantKey(),
      loadServerTemplates().then((s) => ({ ...s, [kind]: id })),
    );

    documentApi
      .put(`/print-templates/${kind}`, { templateId: id })
      .catch(() => toast.error("Could not save the template on the server"));
  };

  return [sel, choose];
}

function PrintPortal({ children }) {
  return createPortal(<div id="print-root">{children}</div>, document.body);
}

function printWithTitle(title) {
  if (typeof window !== "undefined" && window.AndroidPrint?.print) {
    window.AndroidPrint.print(title);
    return;
  }
  const old = document.title;
  document.title = title;
  window.print();
  setTimeout(() => (document.title = old), 500);
}

function Scaled({ w, h, scale, children }) {
  return (
    <div
      style={{
        width: w * scale,
        height: h * scale,
        overflow: "hidden",
        flex: "none",
        background: "#fff",
        boxShadow: "0 1px 4px rgba(0,0,0,.2)",
      }}
    >
      <div
        style={{
          width: w,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          pointerEvents: "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}

const getDocNumber = (doc) =>
  doc?.invoiceNumber ||
  doc?.billNumber ||
  doc?.returnNumber ||
  doc?.creditNoteNumber ||
  doc?.debitNoteNumber ||
  doc?.grnNumber ||
  doc?.receiptNumber ||
  "Doc";

export function PrintDocument({
  invoice,
  kind = "invoice",
  label,
  className = "",
  variant = "primary",
}) {
  const [sel] = useSelectedTemplates();
  const [isPrinting, setIsPrinting] = useState(false);
  const k = KINDS[kind] || KINDS.invoice;
  const { Doc } = k;
  const docNum = getDocNumber(invoice);

  const handlePrint = () => {
    setIsPrinting(true);
    document.body.classList.add("is-printing-portal");
    setTimeout(() => {
      printWithTitle(`${k.label}-${docNum}`);
    }, 150);
  };

  useEffect(() => {
    if (!isPrinting) return undefined;
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      document.body.classList.remove("is-printing-portal");
      setTimeout(() => setIsPrinting(false), 500);
    };

    window.addEventListener("afterprint", cleanup, { once: true });
    const safety = setTimeout(cleanup, 60000);

    return () => {
      clearTimeout(safety);
      window.removeEventListener("afterprint", cleanup);
      document.body.classList.remove("is-printing-portal");
    };
  }, [isPrinting]);

  return (
    <>
      <button
        type="button"
        className={`print-doc-btn tm-btn primary form-button form-button-primary ${className}`}
        onClick={handlePrint}
      >
        <Printer size={15} />
        <span>{label || `Print ${k.label.toLowerCase()}`}</span>
      </button>
      {isPrinting && (
        <PrintPortal>
          <Doc invoice={invoice} templateId={sel[kind] || k.list[0]?.id} />
        </PrintPortal>
      )}
    </>
  );
}

export function PrintInvoiceButton({
  invoiceNumber,
  invoice,
  fetchInvoice,
  kind = "invoice",
  company,
  label,
  className = "sip-btn sip-btn-print",
}) {
  const [sel] = useSelectedTemplates();
  const [doc, setDoc] = useState(null);
  const [busy, setBusy] = useState(false);
  const k = KINDS[kind] || KINDS.invoice;
  const { Doc } = k;

  useEffect(() => {
    if (!doc) return undefined;

    document.body.classList.add("is-printing-portal");

    const timer = setTimeout(() => {
      const docNum = getDocNumber(doc);
      printWithTitle(`${k.label}-${docNum}`);
    }, 150);

    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      document.body.classList.remove("is-printing-portal");
      setTimeout(() => setDoc(null), 500);
    };

    window.addEventListener("afterprint", cleanup, { once: true });
    const safety = setTimeout(cleanup, 60000);

    return () => {
      clearTimeout(timer);
      clearTimeout(safety);
      window.removeEventListener("afterprint", cleanup);
      document.body.classList.remove("is-printing-portal");
    };
  }, [doc, kind, k]);

  const handle = async (e) => {
    e?.stopPropagation?.();
    if (busy) return;
    if (invoice && !fetchInvoice) {
      setDoc(invoice);
      return;
    }
    if (fetchInvoice) {
      setBusy(true);
      try {
        const num = invoiceNumber || getDocNumber(invoice);
        const res = await fetchInvoice(num, invoice);
        if (res) {
          setDoc(res);
        } else if (invoice) {
          setDoc(invoice);
        }
      } catch (err) {
        console.error(err);
        if (invoice) setDoc(invoice);
      } finally {
        setBusy(false);
      }
    } else if (invoice) {
      setDoc(invoice);
    }
  };

  const defaultLabel = (
    <>
      <span className="sip-btn-icon">
        <Printer size={14} strokeWidth={2.5} />
      </span>
      <span className="sip-btn-text">Print</span>
    </>
  );

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={handle}
        disabled={busy}
        aria-label={`Print ${invoiceNumber || getDocNumber(invoice)}`}
      >
        {busy ? "Loading…" : (label ?? defaultLabel)}
      </button>
      {doc && (
        <PrintPortal>
          <Doc invoice={doc} templateId={sel[kind] || k.list[0]?.id} company={company} />
        </PrintPortal>
      )}
    </>
  );
}

export { ShareInvoiceButton };

export default function TemplateManager({ invoice }) {
  const [kind, setKind] = useState("invoice");
  const [sel, choose] = useSelectedTemplates();
  const [preview, setPreview] = useState(() => ({
    ...sel,
  }));
  const [live, setLive] = useState(false);
  const [group, setGroup] = useState("All");
  const [isPrinting, setIsPrinting] = useState(false);

  const isMobile = useMedia("(max-width: 900px)");
  const [mobileView, setMobileView] = useState("browse"); // "browse" | "preview"
  const [zoom, setZoom] = useState("fit"); // "fit" | "full"

  const boxRef = useRef(null);
  const [boxW, setBoxW] = useState(520);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => {
      if (entry.contentRect.width > 0) setBoxW(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const currentKindConfig = KINDS[kind] || KINDS.invoice;
  const { list, Doc, sample } = currentKindConfig;
  const data = live && invoice ? invoice : sample || SAMPLE_INVOICE;
  const current = list.find((t) => t.id === preview[kind]) || list.find((t) => t.id === sel[kind]) || list[0];
  const cd = dims(current);

  const handlePrint = () => {
    setIsPrinting(true);
    document.body.classList.add("is-printing-portal");
    setTimeout(() => {
      printWithTitle(`${current.name}-${getDocNumber(data)}`);
    }, 150);
  };

  useEffect(() => {
    if (!isPrinting) return undefined;
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      document.body.classList.remove("is-printing-portal");
      setTimeout(() => setIsPrinting(false), 500);
    };

    window.addEventListener("afterprint", cleanup, { once: true });
    const safety = setTimeout(cleanup, 60000);

    return () => {
      clearTimeout(safety);
      window.removeEventListener("afterprint", cleanup);
      document.body.classList.remove("is-printing-portal");
    };
  }, [isPrinting]);

  const fitScale = Math.max(0.1, Math.min(1, (boxW - 2) / cd.w));
  const scale = isMobile && zoom === "full" ? 1 : fitScale;

  const groups = ["All", ...new Set(list.map((t) => t.group).filter(Boolean))];
  const shown = list.filter((t) => group === "All" || t.group === group);

  // Thumbnail size (smaller on phones so two fit per row)
  const thumbW = isMobile ? 118 : 150;
  const thumbH = isMobile ? 165 : 205;
  const thumbBox = isMobile ? 180 : 215;

  const pickTemplate = (id) => {
    setPreview({ ...preview, [kind]: id });
    if (isMobile) {
      setZoom("fit");
      setMobileView("preview");
    }
  };

  return (
    <div className="tm" data-view={isMobile ? mobileView : "desktop"}>
      <style>{TM_CSS}</style>

      <div className="tm-top">
        <div>
          <h2>Print templates</h2>
          <p>
            Pick a look for each document. The selected template is used
            whenever you print.
          </p>
        </div>
        <div className="tm-tabs" role="tablist">
          {Object.entries(KINDS).map(([k, v]) => (
            <button
              key={k}
              role="tab"
              aria-selected={kind === k}
              onClick={() => {
                setKind(k);
                setGroup("All");
                if (isMobile) setMobileView("browse");
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile-only: switch between the template list and the preview */}
      <div className="tm-mtabs" role="tablist" aria-label="Templates or preview">
        <button
          role="tab"
          aria-selected={mobileView === "browse"}
          onClick={() => setMobileView("browse")}
        >
          Templates
        </button>
        <button
          role="tab"
          aria-selected={mobileView === "preview"}
          onClick={() => setMobileView("preview")}
        >
          Preview
        </button>
      </div>

      <div className="tm-body">
        <div className="tm-browse">
          {groups.length > 2 && (
            <div className="tm-chips">
              {groups.map((g) => (
                <button
                  key={g}
                  data-on={g === group}
                  onClick={() => setGroup(g)}
                >
                  {g}
                </button>
              ))}
            </div>
          )}
          <div className="tm-grid">
            {shown.map((t) => {
              const d = dims(t);
              return (
                <button
                  key={t.id}
                  className="tm-card"
                  data-active={t.id === current.id}
                  onClick={() => pickTemplate(t.id)}
                >
                  <div className="tm-thumb" style={{ height: thumbBox }}>
                    <Scaled
                      w={d.w}
                      h={d.h}
                      scale={Math.min(thumbW / d.w, thumbH / d.h)}
                    >
                      <Doc invoice={sample || SAMPLE_INVOICE} templateId={t.id} />
                    </Scaled>
                  </div>
                  <span className="tm-name">{t.name}</span>
                  {sel[kind] === t.id && (
                    <span className="tm-badge">In use</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <aside className="tm-side">
          <div className="tm-bar">
            <b className="tm-cur">{current.name}</b>
            <div className="tm-zoom" role="group" aria-label="Preview zoom">
              <button
                data-on={zoom === "fit"}
                onClick={() => setZoom("fit")}
              >
                Fit
              </button>
              <button
                data-on={zoom === "full"}
                onClick={() => setZoom("full")}
              >
                100%
              </button>
            </div>
            <div className="tm-actions">
              {invoice && (
                <label className="tm-sw">
                  <input
                    type="checkbox"
                    checked={live}
                    onChange={(e) => setLive(e.target.checked)}
                  />{" "}
                  Use my document
                </label>
              )}
              <button
                className="tm-btn"
                disabled={sel[kind] === current.id}
                onClick={() => choose(kind, current.id)}
              >
                {sel[kind] === current.id ? "In use" : "Use this template"}
              </button>
              <button
                className="tm-btn primary"
                onClick={handlePrint}
              >
                Print
              </button>
            </div>
          </div>

          <div
            ref={boxRef}
            className="tm-preview"
            data-zoom={isMobile ? zoom : "fit"}
          >
            <Scaled w={cd.w} h={cd.h} scale={scale}>
              <Doc invoice={data} templateId={current.id} />
            </Scaled>
          </div>
        </aside>
      </div>

      {isPrinting && (
        <PrintPortal>
          <Doc invoice={data} templateId={current.id} />
        </PrintPortal>
      )}
    </div>
  );
}

const TM_CSS = `
.tm{font-family:Inter,"Segoe UI",Arial,sans-serif;color:#111827;padding:20px;max-width:1380px;margin:0 auto;box-sizing:border-box}
.tm *,.tm *::before,.tm *::after{box-sizing:border-box}
.tm h2{margin:0;font-size:22px}.tm p{margin:4px 0 0;color:#6b7280;font-size:14px}
.tm-top{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:flex-end;margin-bottom:16px}
.tm-tabs{display:flex;background:#f3f4f6;border-radius:10px;padding:3px;flex-wrap:wrap;gap:2px}
.tm-tabs button{border:0;background:none;padding:7px 13px;border-radius:7px;font-size:13.5px;cursor:pointer;color:#4b5563;white-space:nowrap}
.tm-tabs button[aria-selected=true]{background:#fff;color:#111827;font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,.12)}
.tm-mtabs{display:none}
.tm-body{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);gap:20px;align-items:start}
.tm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:12px}
.tm-card{position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px;border:2px solid #e5e7eb;border-radius:10px;background:#fff;cursor:pointer;font:inherit;min-width:0}
.tm-card:hover{border-color:#9ca3af}
.tm-card[data-active=true]{border-color:#2563eb}
.tm-card:focus-visible,.tm-btn:focus-visible,.tm-tabs button:focus-visible,.tm-mtabs button:focus-visible,.tm-zoom button:focus-visible{outline:2px solid #2563eb;outline-offset:2px}
.tm-thumb{height:215px;width:100%;display:flex;align-items:center;justify-content:center;background:#f3f4f6;border-radius:6px;overflow:hidden}
.tm-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
.tm-chips button{border:1px solid #d1d5db;background:#fff;border-radius:999px;padding:4px 12px;font:inherit;font-size:13px;cursor:pointer}
.tm-chips button[data-on=true]{background:#111827;color:#fff;border-color:#111827}
.tm-name{font-size:13px;font-weight:600;text-align:center}
.tm-badge{position:absolute;top:8px;right:8px;background:#16a34a;color:#fff;font-size:11px;padding:1px 8px;border-radius:999px}
.tm-side{position:sticky;top:12px;min-width:0}
.tm-bar{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px}
.tm-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.tm-sw{font-size:13px;color:#4b5563;display:flex;gap:4px;align-items:center}
.tm-btn{border:1px solid #d1d5db;background:#fff;border-radius:8px;padding:8px 14px;font:inherit;font-size:14px;cursor:pointer}
.tm-btn.primary{background:#2563eb;border-color:#2563eb;color:#fff}
.tm-btn:disabled{opacity:.55;cursor:default}
.tm-preview{background:#e5e7eb;border-radius:10px;padding:0;overflow:hidden}
.tm-zoom{display:none}

@media(max-width:900px){
  .tm{padding:12px 12px 16px}
  .tm h2{font-size:18px}
  .tm p{font-size:13px}
  .tm-top{gap:10px;margin-bottom:10px;align-items:stretch}
  .tm-tabs{width:100%;overflow-x:auto;flex-wrap:nowrap;-webkit-overflow-scrolling:touch;padding:4px}
  .tm-tabs button{flex:none;padding:8px 12px}

  .tm-mtabs{display:flex;background:#f3f4f6;border-radius:10px;padding:3px;margin-bottom:12px}
  .tm-mtabs button{flex:1;border:0;background:none;padding:10px 8px;border-radius:8px;font:inherit;font-size:14px;cursor:pointer;color:#4b5563}
  .tm-mtabs button[aria-selected=true]{background:#fff;color:#111827;font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,.12)}

  .tm-body{grid-template-columns:1fr;gap:0}
  .tm-side{position:static}

  /* one panel at a time */
  .tm[data-view=browse] .tm-side{display:none}
  .tm[data-view=preview] .tm-browse{display:none}

  .tm-chips{flex-wrap:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:4px;margin-left:-2px}
  .tm-chips button{flex:none;padding:6px 14px}
  .tm-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  .tm-card{padding:6px}

  .tm-bar{margin-bottom:8px}
  .tm-cur{font-size:15px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .tm-zoom{display:flex;background:#f3f4f6;border-radius:8px;padding:2px}
  .tm-zoom button{border:0;background:none;padding:6px 12px;border-radius:6px;font:inherit;font-size:13px;cursor:pointer;color:#4b5563}
  .tm-zoom button[data-on=true]{background:#fff;color:#111827;font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,.12)}

  .tm-preview{overflow:auto;-webkit-overflow-scrolling:touch;max-height:calc(100vh - 230px);max-height:calc(100dvh - 230px);touch-action:pan-x pan-y}
  .tm-preview[data-zoom=fit]{overflow:hidden;max-height:none}

  /* fixed bottom action bar on the preview screen */
  .tm[data-view=preview]{padding-bottom:calc(96px + env(safe-area-inset-bottom))}
  .tm[data-view=preview] .tm-actions{
    position:fixed;left:0;right:0;bottom:0;z-index:50;
    background:#fff;border-top:1px solid #e5e7eb;box-shadow:0 -4px 14px rgba(0,0,0,.08);
    padding:10px 12px calc(10px + env(safe-area-inset-bottom));
    display:flex;flex-wrap:wrap;gap:8px
  }
  .tm[data-view=preview] .tm-actions .tm-btn{flex:1 1 0;min-height:44px}
  .tm[data-view=preview] .tm-actions .tm-sw{flex:1 1 100%;padding-bottom:2px}
}

@media(max-width:380px){
  .tm-grid{gap:8px}
  .tm-name{font-size:12px}
}
`;
