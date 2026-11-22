import { Component, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
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

  return (
    <div ref={ref} style={{ margin: 0, background: "#fff" }}>
      <Guard>
        <Doc invoice={data.document} templateId={data.templateId} company={data.company} />
      </Guard>
    </div>
  );
}