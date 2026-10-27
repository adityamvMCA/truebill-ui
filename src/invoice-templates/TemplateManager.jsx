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

const KINDS = {
  invoice: {
    label: "Sales invoice",
    list: INVOICE_TEMPLATES,
    Doc: InvoiceTemplate,
  },
  eway: { label: "E-way bill", list: EWAY_TEMPLATES, Doc: EwayBillTemplate },
};
const mm = (v) => (v * 96) / 25.4;
const dims = (t) => {
  const P = PAPERS[t.paper || DEFAULTS.paper];
  return { w: mm(P.w), h: mm(P.h) };
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
  const boxRef = useRef(null);
  const [boxW, setBoxW] = useState(520);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setBoxW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { list, Doc } = KINDS[kind];
  const data = live && invoice ? invoice : SAMPLE_INVOICE;
  const current = list.find((t) => t.id === preview[kind]) || list[0];
  const cd = dims(current);
  const scale = Math.min(1, (boxW - 2) / cd.w);
  const groups = ["All", ...new Set(list.map((t) => t.group).filter(Boolean))];
  const shown = list.filter((t) => group === "All" || t.group === group);

  return (
    <div className="tm">
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
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="tm-body">
        <div>
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
                  onClick={() => setPreview({ ...preview, [kind]: t.id })}
                >
                  <div className="tm-thumb">
                    <Scaled
                      w={d.w}
                      h={d.h}
                      scale={Math.min(150 / d.w, 205 / d.h)}
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
            <b>{current.name}</b>
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
          <div ref={boxRef} className="tm-preview">
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
.tm{font-family:Inter,"Segoe UI",Arial,sans-serif;color:#111827;padding:20px;max-width:1280px;margin:0 auto}
.tm h2{margin:0;font-size:22px}.tm p{margin:4px 0 0;color:#6b7280;font-size:14px}
.tm-top{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:flex-end;margin-bottom:16px}
.tm-tabs{display:flex;background:#f3f4f6;border-radius:10px;padding:3px}
.tm-tabs button{border:0;background:none;padding:8px 16px;border-radius:8px;font-size:14px;cursor:pointer;color:#4b5563}
.tm-tabs button[aria-selected=true]{background:#fff;color:#111827;font-weight:600;box-shadow:0 1px 2px rgba(0,0,0,.12)}
.tm-body{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);gap:20px;align-items:start}
.tm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(168px,1fr));gap:12px}
.tm-card{position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px;border:2px solid #e5e7eb;border-radius:10px;background:#fff;cursor:pointer;font:inherit}
.tm-card:hover{border-color:#9ca3af}
.tm-card[data-active=true]{border-color:#2563eb}
.tm-card:focus-visible,.tm-btn:focus-visible,.tm-tabs button:focus-visible{outline:2px solid #2563eb;outline-offset:2px}
.tm-thumb{height:215px;width:100%;display:flex;align-items:center;justify-content:center;background:#f3f4f6;border-radius:6px}
.tm-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
.tm-chips button{border:1px solid #d1d5db;background:#fff;border-radius:999px;padding:4px 12px;font:inherit;font-size:13px;cursor:pointer}
.tm-chips button[data-on=true]{background:#111827;color:#fff;border-color:#111827}
.tm-name{font-size:13px;font-weight:600}
.tm-badge{position:absolute;top:8px;right:8px;background:#16a34a;color:#fff;font-size:11px;padding:1px 8px;border-radius:999px}
.tm-side{position:sticky;top:12px}
.tm-bar{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px}
.tm-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.tm-sw{font-size:13px;color:#4b5563;display:flex;gap:4px;align-items:center}
.tm-btn{border:1px solid #d1d5db;background:#fff;border-radius:8px;padding:8px 14px;font:inherit;font-size:14px;cursor:pointer}
.tm-btn.primary{background:#2563eb;border-color:#2563eb;color:#fff}
.tm-btn:disabled{opacity:.55;cursor:default}
.tm-preview{background:#e5e7eb;border-radius:10px;padding:0;overflow:hidden}
@media(max-width:900px){.tm-body{grid-template-columns:1fr}.tm-side{position:static}}
`;
