import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { QRCodeSVG } from "qrcode.react";
import { ScanLine, Smartphone, Trash2 } from "lucide-react";

import { apiError, barcodeApi } from "./barcodeApi";
import { feedbackOk, feedbackUnknown } from "./feedback";
import { newScanId } from "./pendingQueue";
import { createScannerSocket, emitAck } from "./scannerSocket";
import useBarcodeEngine from "./useBarcodeEngine";
import useKeyboardWedge from "./useKeyboardWedge";
import "./barcode.css";

const fmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 });

/**
 * Drop into Purchase / Sales / Stock In-Out / Inventory screens.
 *   <ScanSessionPanel documentType="SALES" onItemsChange={applyLines} onEnd={handleEnd} />
 * lines = [{ itemId, productId, productCode, name, quantity, unit, packaging, barcode, scanCount,
 *            salePrice, purchasePrice, gstRate, productType, status }]
 * `quantity` is already in the product's base unit (box scans are converted).
 */
export default function ScanSessionPanel({
  documentType, documentId = null, onItemsChange, onEnd, disabled = false,
}) {
  const [session, setSession] = useState(null); // { sessionId, sessionCode, joinToken }
  const [items, setItems] = useState({});
  const [devices, setDevices] = useState(0);
  const [connected, setConnected] = useState(false);
  const [starting, setStarting] = useState(false);
  const [drafts, setDrafts] = useState({});
  const socketRef = useRef(null);
  const sessionRef = useRef(null);
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  const upsert = useCallback(({ item, product }) => {
    setItems((prev) => {
      const next = { ...prev };
      if (item.quantity > 0) next[item._id] = { ...item, product: product || prev[item._id]?.product };
      else delete next[item._id];
      return next;
    });
  }, []);

  const connect = useCallback((sessionId) => {
    const socket = createScannerSocket();
    socketRef.current = socket;
    const join = () => socket.emit("scanner:join", { sessionId });

    socket.on("connect", () => { setConnected(true); join(); });
    socket.on("disconnect", () => setConnected(false));
    socket.on("scanner:joined", (p) => {
      setDevices(p.devices || 0);
      setItems(Object.fromEntries((p.items || []).map((i) => [i._id, i])));
    });
    socket.on("scanner:quantity-updated", upsert);
    socket.on("scanner:sync", (p) => {
      if (typeof p.devices === "number") setDevices(p.devices);
      if (p.event === "item-removed") setItems((prev) => { const n = { ...prev }; delete n[p.itemId]; return n; });
    });
    socket.on("scanner:error", (p) => toast.error(p.message));
  }, [upsert]);

  const start = async () => {
    if (starting || disabled) return;
    setStarting(true);
    try {
      const { data } = await barcodeApi.createSession({ documentType, documentId });
      sessionRef.current = data.data;
      setSession(data.data);
      connect(data.data.sessionId);
    } catch (e) { toast.error(apiError(e)); } finally { setStarting(false); }
  };

  const stop = useCallback(() => {
    const s = sessionRef.current;
    socketRef.current?.disconnect();
    socketRef.current = null; sessionRef.current = null;
    // tell the host first so it keeps the scanned rows as normal rows
    onEndRef.current?.();
    setSession(null); setConnected(false); setDevices(0); setItems({});
    if (s) barcodeApi.closeSession(s.sessionId).catch(() => {});
  }, []);

  // page left without pressing "End session": disconnect and close the session on the server
  useEffect(() => () => {
    socketRef.current?.disconnect();
    const s = sessionRef.current;
    if (s) barcodeApi.closeSession(s.sessionId).catch(() => {});
  }, []);

  // QR join token is short-lived: rotate while the panel is open
  useEffect(() => {
    if (!session) return undefined;
    const t = setInterval(async () => {
      try {
        const { data } = await barcodeApi.refreshToken(session.sessionId);
        setSession((s) => (s ? { ...s, joinToken: data.data.joinToken } : s));
      } catch { /* keep old token */ }
    }, 90000);
    return () => clearInterval(t);
  }, [session?.sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // hand lines to the host module
  const lines = useMemo(() => Object.values(items).map((i) => ({
    itemId: i._id,
    productId: String(i.productId),
    productCode: i.product?.productCode,
    name: i.product?.name || i.barcode,
    quantity: i.quantity,
    unit: i.unit || i.product?.unit,
    packaging: i.packaging,
    barcode: i.barcode,
    scanCount: i.scanCount,
    salePrice: i.product?.salePrice,
    purchasePrice: i.product?.purchasePrice,
    gstRate: i.product?.gstRate,
    productType: i.product?.type,
    status: i.product?.status,
  })), [items]);
  const cbRef = useRef(onItemsChange);
  cbRef.current = onItemsChange;
  useEffect(() => { cbRef.current?.(lines); }, [lines]);

  // USB / Bluetooth scanner plugged into the desktop: auto-add qty 1 through the same engine
  const engine = useBarcodeEngine({
    enabled: Boolean(session),
    onFound: async ({ barcode }) => {
      try {
        await emitAck(socketRef.current, "scanner:confirm", { scanId: newScanId(), barcode, quantity: 1 });
        feedbackOk();
      } catch (e) { toast.error(e.message === "offline" ? "Not connected" : e.message); }
    },
    onUnknown: ({ barcode }) => { feedbackUnknown(); toast.error(`Unknown barcode ${barcode}`); barcodeApi.reportUnknown(barcode).catch(() => {}); },
  });
  useKeyboardWedge((c) => engine(c, "wedge"), { enabled: Boolean(session) });

  const commitQty = async (id) => {
    const raw = drafts[id];
    if (raw === undefined) return;
    const q = Number(raw);
    setDrafts((d) => { const n = { ...d }; delete n[id]; return n; });
    if (!Number.isFinite(q) || q < 0 || q === items[id]?.quantity) return;
    try { await emitAck(socketRef.current, "scanner:set-quantity", { itemId: id, quantity: q }); }
    catch (e) { toast.error(e.message); }
  };

  const remove = async (id) => {
    setItems((prev) => { const n = { ...prev }; delete n[id]; return n; });
    try { await emitAck(socketRef.current, "scanner:remove", { itemId: id }); } catch (e) { toast.error(e.message); }
  };

  const qrValue = session ? JSON.stringify({ v: 1, s: session.sessionId, t: session.joinToken }) : "";

  return (
    <section className="bcx-desktop">
      <header className="bcx-desktop-head">
        <h3><ScanLine size={17} /> Barcode scanning</h3>
        {!session ? (
          <button type="button" className="bcx-btn is-primary" onClick={start} disabled={starting || disabled}>
            <Smartphone size={15} /> {starting ? "Starting…" : "Scan with phone"}
          </button>
        ) : (
          <button type="button" className="bcx-btn" onClick={stop}>End session</button>
        )}
      </header>

      {session && (
        <div className="bcx-desktop-body">
          <div className="bcx-qr">
            <QRCodeSVG value={qrValue} size={168} includeMargin />
            <p className="bcx-hint">Open the ERP mobile app → Scanner → scan this code.</p>
            <p className="bcx-hint">Session {session.sessionCode} · {connected ? `${devices} device${devices === 1 ? "" : "s"} connected` : "reconnecting…"}</p>
          </div>

          <div className="bcx-live">
            <table className="bcx-table">
              <thead><tr><th>Product</th><th>Barcode</th><th className="r">Qty</th><th /></tr></thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.itemId}>
                    <td><strong>{l.name}</strong><small>{l.productCode}{l.packaging && l.packaging !== "Unit" ? ` · ${l.packaging}` : ""}</small></td>
                    <td>{l.barcode}</td>
                    <td className="r">
                      <input className="bcx-qty-input" type="number" min="0" step="any"
                        value={drafts[l.itemId] ?? l.quantity}
                        onChange={(e) => setDrafts((d) => ({ ...d, [l.itemId]: e.target.value }))}
                        onBlur={() => commitQty(l.itemId)}
                        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} />
                      <small>{l.unit}</small>
                    </td>
                    <td><button type="button" className="bcx-icon-btn" aria-label={`Remove ${l.name}`} onClick={() => remove(l.itemId)}><Trash2 size={16} /></button></td>
                  </tr>
                ))}
                {!lines.length && <tr><td colSpan={4} className="bcx-empty">Waiting for scans… ({fmt.format(0)} items)</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}