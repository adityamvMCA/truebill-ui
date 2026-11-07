import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  INVOICE_TEMPLATES,
  EWAY_TEMPLATES,
  DEFAULT_SELECTED,
  STORAGE_KEY,
  PAPERS,
  DEFAULTS,
} from "./templates.config";
import InvoiceTemplate from "./InvoiceTemplate";
import EwayBillTemplate from "./EwayBillTemplate";
import { SAMPLE_INVOICE } from "./sampleData";
import { DELIVERY_TEMPLATES } from "./deliveryNote.templates";
import DeliveryNoteTemplate from "./DeliveryNoteTemplate";

const KINDS = {
  invoice: {
    label: "Sales invoice",
    list: INVOICE_TEMPLATES,
    Doc: InvoiceTemplate,
  },
  eway: { label: "E-way bill", list: EWAY_TEMPLATES, Doc: EwayBillTemplate },
  delivery: { label: "Delivery note", list: DELIVERY_TEMPLATES, Doc: DeliveryNoteTemplate },
};

const mm = (v) => (v * 96) / 25.4;
const dims = (t) => {
  const P = PAPERS[t.paper || DEFAULTS.paper];
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
  const choose = (kind, id) => {
    const next = { ...sel, [kind]: id };
    setSel(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
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

export function PrintDocument({ invoice, kind = "invoice", label }) {
  const [sel] = useSelectedTemplates();
  const { Doc } = KINDS[kind];
  return (
    <>
      <button
        className="tm-btn primary"
        onClick={() =>
          printWithTitle(
            `${kind === "eway" ? "EWB" : "Invoice"}-${invoice.invoiceNumber}`,
          )
        }
      >
        {label || (kind === "eway" ? "Print e-way bill" : "Print invoice")}
      </button>
      <PrintPortal>
        <Doc invoice={invoice} templateId={sel[kind]} />
      </PrintPortal>
    </>
  );
}

export function PrintInvoiceButton({
  invoiceNumber,
  fetchInvoice,
  kind = "invoice",
  company,
  label = "Print",
  className = "tm-btn",
}) {
  const [sel] = useSelectedTemplates();
  const [doc, setDoc] = useState(null);
  const [busy, setBusy] = useState(false);
  const { Doc } = KINDS[kind];

  useEffect(() => {
    if (!doc) return undefined;
    const done = () => setDoc(null);
    window.addEventListener("afterprint", done);
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        printWithTitle(
          `${kind === "eway" ? "EWB" : "Invoice"}-${doc.invoiceNumber}`,
        );
      }),
    );
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("afterprint", done);
    };
  }, [doc, kind]);

  const handle = async (e) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      setDoc(await fetchInvoice(invoiceNumber));
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={handle}
        disabled={busy}
        aria-label={`Print ${invoiceNumber}`}
      >
        {busy ? "Loading…" : label}
      </button>
      {doc && (
        <PrintPortal>
          <Doc invoice={doc} templateId={sel[kind]} company={company} />
        </PrintPortal>
      )}
    </>
  );
}

export default function TemplateManager({ invoice }) {
  const [kind, setKind] = useState("invoice");
  const [sel, choose] = useSelectedTemplates();
  const [preview, setPreview] = useState({
    invoice: sel.invoice,
    eway: sel.eway,
  });
  const [live, setLive] = useState(false);
  const [group, setGroup] = useState("All");

  const isMobile = useMedia("(max-width: 900px)");
  const [mobileView, setMobileView] = useState("browse"); // "browse" | "preview"
  const [zoom, setZoom] = useState("fit"); // "fit" | "full"

  const boxRef = useRef(null);
  const [boxW, setBoxW] = useState(520);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => {
      // A hidden panel reports width 0; keep the last good width instead.
      if (entry.contentRect.width > 0) setBoxW(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { list, Doc } = KINDS[kind];
  const data = live && invoice ? invoice : SAMPLE_INVOICE;
  const current = list.find((t) => t.id === preview[kind]) || list[0];
  const cd = dims(current);

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
                      <Doc invoice={SAMPLE_INVOICE} templateId={t.id} />
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
                  Use my invoice
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
                onClick={() =>
                  printWithTitle(`${current.name}-${data.invoiceNumber}`)
                }
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

      <PrintPortal>
        <Doc invoice={data} templateId={current.id} />
      </PrintPortal>
    </div>
  );
}

const TM_CSS = `
.tm{font-family:Inter,"Segoe UI",Arial,sans-serif;color:#111827;padding:20px;max-width:1280px;margin:0 auto;box-sizing:border-box}
.tm *,.tm *::before,.tm *::after{box-sizing:border-box}
.tm h2{margin:0;font-size:22px}.tm p{margin:4px 0 0;color:#6b7280;font-size:14px}
.tm-top{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:flex-end;margin-bottom:16px}
.tm-tabs{display:flex;background:#f3f4f6;border-radius:10px;padding:3px}
.tm-tabs button{border:0;background:none;padding:8px 16px;border-radius:8px;font-size:14px;cursor:pointer;color:#4b5563}
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
  .tm-tabs{width:100%}
  .tm-tabs button{flex:1;padding:10px 8px}

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