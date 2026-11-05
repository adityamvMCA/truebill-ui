import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  Check, CloudOff, Flashlight, LogOut, Minus, Plus, RefreshCw, SwitchCamera, Undo2, Wifi,
} from "lucide-react";

import { apiError } from "./barcodeApi";
import { catalogStatus, flushUnknown, reportUnknownSafe, syncCatalog } from "./barcodeCatalog";
import { feedbackOk, feedbackUnknown } from "./feedback";
import { countPending, discardScan, enqueueScan, flushQueue, listPending } from "./pendingQueue";
import { createScannerSocket, emitAck } from "./scannerSocket";
import useBarcodeEngine from "./useBarcodeEngine";
import useCameraScanner from "./useCameraScanner";
import useKeyboardWedge from "./useKeyboardWedge";
import LinkBarcodeForm from "./LinkBarcodeForm";
import QuickAddProduct from "./QuickAddProduct";
import "./barcode.css";

const qtyFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 });

export default function MobileScannerPage() {
  const [phase, setPhase] = useState("pair"); // pair | scan
  const [session, setSession] = useState(null); // { sessionId, documentType }
  const [items, setItems] = useState([]);
  const [devices, setDevices] = useState(0);
  const [socketUp, setSocketUp] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState([]);
  const [catalog, setCatalog] = useState({ count: 0, done: false, syncing: false });
  const [confirm, setConfirm] = useState(null);
  const [unknown, setUnknown] = useState(null);
  const [linking, setLinking] = useState(false);
  const [adding, setAdding] = useState(false);
  const [flash, setFlash] = useState("");
  const [manual, setManual] = useState("");
  const [pairText, setPairText] = useState("");
  const [lastScan, setLastScan] = useState(null);

  const socketRef = useRef(null);
  const sessionRef = useRef(null);
  const deviceTokenRef = useRef(null);
  const joinRef = useRef(null);

  /* ---------------- pending queue ---------------- */
  const refreshPending = useCallback(async () => {
    const sid = sessionRef.current?.sessionId;
    if (!sid) return;
    setPending(await countPending(sid));
    setFailed((await listPending(sid)).filter((s) => s.error));
  }, []);

  const flush = useCallback(() =>
    flushQueue({
      socket: socketRef.current, sessionId: sessionRef.current?.sessionId,
      deviceToken: deviceTokenRef.current, onChange: refreshPending,
    }), [refreshPending]);

  /* ---------------- socket ---------------- */
  const upsertItem = useCallback(({ item, product }) => {
    setItems((prev) => {
      const rest = prev.filter((i) => i._id !== item._id);
      return item.quantity > 0 ? [{ ...item, product: product || prev.find((i) => i._id === item._id)?.product }, ...rest] : rest;
    });
  }, []);

  useEffect(() => {
    const socket = createScannerSocket();
    socketRef.current = socket;

    const rejoin = () => {
      const s = sessionRef.current;
      if (s && deviceTokenRef.current) socket.emit("scanner:join", { deviceToken: deviceTokenRef.current });
    };

    socket.on("connect", () => { setSocketUp(true); rejoin(); });
    socket.on("disconnect", () => setSocketUp(false));
    socket.on("connect_error", () => setSocketUp(false));

    socket.on("scanner:joined", (p) => {
      deviceTokenRef.current = p.deviceToken || deviceTokenRef.current;
      sessionRef.current = { sessionId: p.sessionId, documentType: p.documentType };
      setSession(sessionRef.current);
      setItems(p.items || []);
      setDevices(p.devices || 0);
      setPhase("scan");
      refreshPending().then(flush);
    });
    socket.on("scanner:quantity-updated", upsertItem);
    socket.on("scanner:sync", (p) => {
      if (typeof p.devices === "number") setDevices(p.devices);
      if (p.event === "item-removed") setItems((prev) => prev.filter((i) => i._id !== p.itemId));
    });
    socket.on("scanner:error", (p) => toast.error(p.message));

    const goOnline = () => { setOnline(true); flush(); flushUnknown(); };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      socket.disconnect();
    };
  }, [flush, refreshPending, upsertItem]);

  // retry queues periodically (covers silent socket recovery)
  useEffect(() => {
    if (phase !== "scan") return undefined;
    const t = setInterval(() => { flush(); flushUnknown(); }, 10000);
    return () => clearInterval(t);
  }, [phase, flush]);

  /* ---------------- catalogue ---------------- */
  const runCatalogSync = useCallback(async (reset = false) => {
    setCatalog((c) => ({ ...c, syncing: true }));
    try {
      await syncCatalog({ reset, onProgress: (count) => setCatalog((c) => ({ ...c, count })) });
      setCatalog(await catalogStatus().then((s) => ({ ...s, syncing: false })));
    } catch (e) {
      setCatalog((c) => ({ ...c, syncing: false }));
      toast.error(`Catalogue sync failed: ${apiError(e)}`);
    }
  }, []);

  useEffect(() => {
    catalogStatus().then((s) => {
      setCatalog({ ...s, syncing: false });
      if (!s.done && navigator.onLine) runCatalogSync(false);
    });
    flushUnknown();
  }, [runCatalogSync]);

  /* ---------------- pairing ---------------- */
  const pairFrom = useCallback((text) => {
    try {
      const p = JSON.parse(text);
      if (p?.v !== 1 || !p.s || !p.t) return false;
      if (joinRef.current === p.t) return true;
      joinRef.current = p.t;
      socketRef.current?.emit("scanner:join", { sessionId: p.s, joinToken: p.t });
      return true;
    } catch { return false; }
  }, []);

  /* ---------------- scan handling (shared engine) ---------------- */
  const flashFor = (kind) => { setFlash(kind); setTimeout(() => setFlash(""), 450); };

  const engine = useBarcodeEngine({
    enabled: phase === "scan" && !confirm && !unknown,
    onFound: (f) => { feedbackOk(); flashFor("ok"); setConfirm({ ...f, qty: 1 }); },
    onUnknown: (u) => {
      feedbackUnknown(); flashFor("bad"); setUnknown(u);
      reportUnknownSafe(u.barcode); // server inbox when online, offline queue otherwise (reported once)
    },
  });

  const paused = Boolean(confirm || unknown || linking || adding);

  const camera = useCameraScanner({
    active: !paused,
    onBarcode: (code) => {
      if (phase === "pair") pairFrom(code);
      else engine(code, "camera");
    },
  });
  useKeyboardWedge((code) => engine(code, "wedge"), { enabled: phase === "scan" });

  const confirmScan = async () => {
    if (!confirm || !session) return;
    const quantity = Number(confirm.qty);
    if (!(quantity > 0)) return toast.error("Enter a valid quantity");
    const scan = await enqueueScan({ sessionId: session.sessionId, barcode: confirm.barcode, quantity });
    setLastScan({ barcode: confirm.barcode, quantity, scanId: scan.scanId, name: confirm.product.name });
    setConfirm(null);
    await refreshPending();
    flush();
  };

  const undoLast = async () => {
    if (!lastScan || !session) return;
    await enqueueScan({ sessionId: session.sessionId, barcode: lastScan.barcode, quantity: -lastScan.quantity });
    toast.success(`Undid ${qtyFmt.format(lastScan.quantity)} × ${lastScan.name}`);
    setLastScan(null);
    await refreshPending();
    flush();
  };

  const setQty = (q) => setConfirm((c) => ({ ...c, qty: Math.max(0, Math.round(Number(q || 0) * 1000) / 1000) }));

  /** After the barcode was linked / product created: re-run the scan so the confirm card appears. */
  const rescan = (code) => {
    setLinking(false); setAdding(false); setUnknown(null);
    setTimeout(() => engine(code, "manual"), 80);
  };

  const skipUnknown = () => { setLinking(false); setAdding(false); setUnknown(null); };

  const leave = async () => {
    try { await emitAck(socketRef.current, "scanner:leave", {}); } catch { /* ignore */ }
    sessionRef.current = null; deviceTokenRef.current = null; joinRef.current = null;
    setSession(null); setItems([]); setPhase("pair"); setLastScan(null);
  };

  const totalQty = useMemo(() => items.reduce((s, i) => s + (i.quantity || 0), 0), [items]);
  const scanning = !paused;

  /* ---------------- render ---------------- */
  return (
    <div className={`bcx-page ${scanning ? "is-scanning" : ""} ${flash ? `flash-${flash}` : ""}`}>
      <header className="bcx-top bcx-ui">
        <div className="bcx-status">
          <span className={`bcx-dot ${socketUp ? "ok" : "bad"}`} />
          {online ? <Wifi size={15} /> : <CloudOff size={15} />}
          <span>{phase === "scan" ? `${devices} device${devices === 1 ? "" : "s"}` : "Not paired"}</span>
          {pending > 0 && <span className="bcx-badge">{pending} pending</span>}
        </div>
        <div className="bcx-status">
          <button type="button" className="bcx-chip" onClick={() => runCatalogSync(true)} disabled={catalog.syncing || !online}>
            <RefreshCw size={13} className={catalog.syncing ? "spin" : ""} />
            {catalog.syncing ? `${catalog.count.toLocaleString("en-IN")} loaded` : `${catalog.count.toLocaleString("en-IN")} cached`}
          </button>
          {phase === "scan" && <button type="button" className="bcx-icon-btn" onClick={leave} aria-label="Leave session"><LogOut size={18} /></button>}
        </div>
      </header>

      <section className="bcx-viewport">
        {camera.supported && camera.permission !== "denied" ? (
          <div className="bcx-frame" aria-hidden="true"><span className="bcx-laser" /></div>
        ) : (
          <div className="bcx-ui bcx-cam-off">
            <p>{camera.permission === "denied" ? "Camera permission denied. Enable it in Android settings." : "Camera scanning runs in the Android app."}</p>
            <p className="bcx-hint">You can still use a Bluetooth scanner or type the barcode below.</p>
          </div>
        )}
        {camera.supported && (
          <div className="bcx-cam-tools bcx-ui">
            {camera.torchAvailable && <button type="button" className={`bcx-icon-btn ${camera.torchOn ? "is-on" : ""}`} onClick={camera.toggleTorch} aria-label="Flashlight"><Flashlight size={20} /></button>}
            <button type="button" className="bcx-icon-btn" onClick={camera.flipCamera} aria-label="Switch camera"><SwitchCamera size={20} /></button>
          </div>
        )}
      </section>

      <section className="bcx-bottom bcx-ui">
        {phase === "pair" ? (
          <div className="bcx-pair">
            <h2>Pair with desktop</h2>
            <p className="bcx-hint">Point the camera at the QR code shown in Purchase Entry (or any scanning screen) on your computer.</p>
            <details>
              <summary>QR not scanning? Paste pairing text</summary>
              <textarea className="bcx-input" rows={3} value={pairText} onChange={(e) => setPairText(e.target.value)} />
              <button type="button" className="bcx-btn is-primary" onClick={() => !pairFrom(pairText) && toast.error("Invalid pairing text")}>Join</button>
            </details>
            {!socketUp && <p className="bcx-hint">Connecting to server…</p>}
          </div>
        ) : (
          <>
            <form className="bcx-manual" onSubmit={(e) => { e.preventDefault(); engine(manual, "manual"); setManual(""); }}>
              <input className="bcx-input" data-wedge="1" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Type or scan barcode" autoComplete="off" />
              <button type="submit" className="bcx-btn is-primary" disabled={!manual.trim()}>Add</button>
            </form>

            <div className="bcx-listhead">
              <strong>{items.length} item{items.length === 1 ? "" : "s"} · {qtyFmt.format(totalQty)} qty</strong>
              <button type="button" className="bcx-btn" onClick={undoLast} disabled={!lastScan}><Undo2 size={15} /> Undo last</button>
            </div>

            {failed.length > 0 && (
              <div className="bcx-alert">
                <strong>{failed.length} scan(s) could not sync</strong>
                {failed.map((s) => (
                  <div key={s.scanId} className="bcx-failed">
                    <span>{s.barcode} × {s.quantity} — {s.error}</span>
                    <button type="button" className="bcx-link" onClick={async () => { await discardScan(s.scanId); refreshPending(); }}>Discard</button>
                  </div>
                ))}
              </div>
            )}

            <ul className="bcx-items">
              {items.map((i) => (
                <li key={i._id}>
                  <div>
                    <strong>{i.product?.name || i.barcode}</strong>
                    <span>{i.barcode}{i.packaging && i.packaging !== "Unit" ? ` · ${i.packaging}` : ""}</span>
                  </div>
                  <b>{qtyFmt.format(i.quantity)} <small>{i.unit || ""}</small></b>
                </li>
              ))}
              {!items.length && <li className="bcx-empty">Scan a product to begin.</li>}
            </ul>
          </>
        )}
      </section>

      {/* Product confirmation */}
      {confirm && (
        <div className="bcx-sheet bcx-ui" role="dialog" aria-label="Confirm product">
          <div className="bcx-sheet-card is-found">
            <div className="bcx-sheet-tag ok"><Check size={14} /> Product found</div>
            <h3>{confirm.product.name}</h3>
            <p className="bcx-meta">
              {confirm.product.productCode} · {confirm.barcode}
              {confirm.packaging?.packagingName && confirm.packaging.packagingName !== "Unit" ? ` · ${confirm.packaging.packagingName}` : ""}
            </p>
            <div className="bcx-qty">
              <button type="button" className="bcx-icon-btn" onClick={() => setQty(Number(confirm.qty) - 1)} aria-label="Decrease"><Minus size={18} /></button>
              <input className="bcx-input" type="number" inputMode="decimal" min="0" step="any" value={confirm.qty}
                onChange={(e) => setConfirm((c) => ({ ...c, qty: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && confirmScan()} aria-label="Quantity" />
              <button type="button" className="bcx-icon-btn" onClick={() => setQty(Number(confirm.qty) + 1)} aria-label="Increase"><Plus size={18} /></button>
            </div>
            {confirm.packaging?.conversionQuantity > 1 && (
              <p className="bcx-hint">
                {qtyFmt.format(Number(confirm.qty || 0))} {confirm.packaging.packagingName} = {qtyFmt.format(Number(confirm.qty || 0) * confirm.packaging.conversionQuantity)} {confirm.product.unit}
              </p>
            )}
            <div className="bcx-actions">
              <button type="button" className="bcx-btn" onClick={() => setConfirm(null)}>Cancel</button>
              <button type="button" className="bcx-btn is-primary" onClick={confirmScan}>Confirm &amp; send</button>
            </div>
          </div>
        </div>
      )}

      {/* Unknown barcode */}
      {unknown && (
        <div className="bcx-sheet bcx-ui" role="dialog" aria-label="Unknown product">
          <div className="bcx-sheet-card is-unknown">
            <div className="bcx-sheet-tag bad">Unknown product</div>
            <h3 className="bcx-code">{unknown.barcode}</h3>
            {unknown.offline && <p className="bcx-hint">You are offline. This barcode is not in the cached catalogue and will be reported when you are back online.</p>}

            {linking ? (
              <LinkBarcodeForm
                barcode={unknown.barcode} lockBarcode
                onCancel={() => setLinking(false)}
                onDone={() => rescan(unknown.barcode)}
              />
            ) : adding ? (
              <QuickAddProduct
                barcode={unknown.barcode}
                onCancel={() => setAdding(false)}
                onDone={() => rescan(unknown.barcode)}
              />
            ) : (
              <div className="bcx-stack">
                <button type="button" className="bcx-btn is-primary" onClick={() => setAdding(true)} disabled={!online}>Create new product</button>
                <button type="button" className="bcx-btn" onClick={() => setLinking(true)} disabled={!online}>Link to existing product</button>
                <button type="button" className="bcx-btn" onClick={skipUnknown}>Skip – handle later</button>
                {!online && <p className="bcx-hint">Creating or linking needs internet. Tap Skip and it will wait in the Unknown Barcodes list.</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}