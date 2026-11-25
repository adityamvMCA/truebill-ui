import { Component, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Printer, Download } from "lucide-react";
import {
  INVOICE_TEMPLATES,
  EWAY_TEMPLATES,
  DELIVERY_TEMPLATES,
  PURCHASE_BILL_TEMPLATES,
  PURCHASE_RETURN_TEMPLATES,
  SALES_RETURN_TEMPLATES,
  GOODS_RECEIPT_TEMPLATES,
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

/* Same keys as the backend printKind */
const DOCS = {
  invoice: { list: INVOICE_TEMPLATES, Doc: InvoiceTemplate },
  eway: { list: EWAY_TEMPLATES, Doc: EwayBillTemplate },
  delivery: { list: DELIVERY_TEMPLATES, Doc: DeliveryNoteTemplate },
  purchaseBill: { list: PURCHASE_BILL_TEMPLATES, Doc: PurchaseBillTemplate },
  purchaseReturn: { list: PURCHASE_RETURN_TEMPLATES, Doc: PurchaseReturnTemplate },
  salesReturn: { list: SALES_RETURN_TEMPLATES, Doc: SalesReturnTemplate },
  goodsReceipt: { list: GOODS_RECEIPT_TEMPLATES, Doc: GoodsReceiptTemplate },
};

/* e.g. http://localhost:5001  (no trailing slash, no /api) */
const ORIGIN = (import.meta.env.VITE_BACKEND_ORIGIN || "").replace(/\/$/, "");

const fail = (message) => {
  window.__PDF_ERROR_MSG__ = String(message || "");
  window.__PDF_ERROR__ = true;
  console.error("Print page error:", message);
};

const frames = () =>
  new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

/* Any template crash fails fast instead of leaving the server waiting */
class Guard extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    fail(error?.message || "Template render failed");
  }
  render() {
    return this.state.failed ? <p>Document unavailable.</p> : this.props.children;
  }
}

export default function PublicDocumentPrint() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    document.body.style.margin = "0";

    if (!ORIGIN) {
      fail("VITE_BACKEND_ORIGIN is not set");
      setData({ error: true });
      return;
    }

    fetch(`${ORIGIN}/public/document-data/${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Data request failed: HTTP ${r.status}`))))
      .then(setData)
      .catch((e) => {
        fail(e.message);
        setData({ error: true });
      });
  }, [token]);

  useEffect(() => {
    if (!data || data.error) return;

    if (!DOCS[data.printKind]) {
      fail(`Unknown document kind: ${data.printKind}`);
      return;
    }

    (async () => {
      try {
        await frames();
        const el = ref.current;
        if (!el) throw new Error("Document element missing");

        await Promise.all(
          [...el.querySelectorAll("img")].map((img) =>
            img.complete
              ? null
              : new Promise((res) => {
                  img.onload = img.onerror = res;
                  setTimeout(res, 5000); // never wait forever for a slow logo
                }),
          ),
        );
        if (document.fonts?.ready) await document.fonts.ready;

        const { list } = DOCS[data.printKind];
        const cfg = list.find((t) => t.id === data.templateId) || list[0];
        const paper = PAPERS[cfg.paper || DEFAULTS.paper];
        const thermal = cfg.layout === "thermal";

        window.__PDF_PAPER__ = {
          w: paper.w,
          // Thermal receipts become one tall page measured from the content
          h: thermal ? Math.ceil((el.scrollHeight * 25.4) / 96) + 2 : paper.h,
        };
        window.__PDF_READY__ = true;
      } catch (e) {
        fail(e?.message);
      }
    })();
  }, [data]);

  if (!data) return null;
  if (data.error || !DOCS[data.printKind]) return <p>Document unavailable.</p>;

  const { Doc } = DOCS[data.printKind];

  const docNum =
    data.document?.invoiceNumber ||
    data.document?.billNumber ||
    data.document?.returnNumber ||
    data.document?.receiptNumber ||
    "";

  const kindLabel =
    data.printKind === "invoice"
      ? "Sales Invoice"
      : data.printKind === "purchaseBill"
        ? "Purchase Bill"
        : data.printKind === "delivery"
          ? "Delivery Note"
          : data.printKind === "eway"
            ? "E-Way Bill"
            : data.printKind;

  return (
    <div className="public-doc-container" style={{ margin: 0, padding: 0, background: "#f8fafc", minHeight: "100vh" }}>
      <style>{`
        .public-doc-toolbar {
          position: sticky;
          top: 0;
          z-index: 9999;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          padding: 12px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
          font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .public-doc-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .public-doc-badge {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
          border-radius: 9999px;
          padding: 3px 10px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .public-doc-title {
          font-size: 16px;
          font-weight: 700;
          color: #0f172a;
        }
        .public-doc-btns {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .public-doc-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 18px;
          border-radius: 6px;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
          border: 1px solid transparent;
        }
        .public-doc-btn.print {
          background: #2563eb;
          color: #ffffff;
          border-color: #2563eb;
        }
        .public-doc-btn.print:hover {
          background: #1d4ed8;
        }
        .public-doc-btn.download {
          background: #ffffff;
          color: #0f172a;
          border-color: #cbd5e1;
        }
        .public-doc-btn.download:hover {
          background: #f8fafc;
        }
        .public-doc-body {
          max-width: 860px;
          margin: 24px auto;
          background: #ffffff;
          border-radius: 8px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.08);
          overflow: hidden;
        }
        @media print {
          body > #root {
            display: block !important;
          }
          .public-doc-toolbar, .no-print {
            display: none !important;
          }
          .public-doc-container {
            background: transparent !important;
            padding: 0 !important;
            min-height: auto !important;
          }
          .public-doc-body {
            max-width: 100% !important;
            margin: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      <div className="public-doc-toolbar no-print">
        <div className="public-doc-info">
          <span className="public-doc-badge">{kindLabel}</span>
          <span className="public-doc-title">{docNum}</span>
        </div>
        <div className="public-doc-btns">
          <button
            type="button"
            className="public-doc-btn print"
            onClick={() => window.print()}
          >
            <Printer size={15} />
            <span>Print</span>
          </button>
          <button
            type="button"
            className="public-doc-btn download"
            onClick={() => window.print()}
            title="In the print dialog, select 'Save as PDF' to download"
          >
            <Download size={15} />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      <div className="public-doc-body">
        <div ref={ref} style={{ margin: 0, background: "#fff" }}>
          <Guard>
            <Doc invoice={data.document} templateId={data.templateId} company={data.company} />
          </Guard>
        </div>
      </div>
    </div>
  );
}