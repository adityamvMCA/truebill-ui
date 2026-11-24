import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  Camera,
  Check,
  CheckCircle2,
  Flashlight,
  PackagePlus,
  Plus,
  RotateCcw,
  ScanBarcode,
  Search,
  Sparkles,
  SwitchCamera,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import BcxModal from "./BcxModal";
import useBarcodeEngine from "./useBarcodeEngine";
import useKeyboardWedge from "./useKeyboardWedge";
import { feedbackOk, feedbackUnknown } from "./feedback";
import QuickAddProduct from "./QuickAddProduct";
import LinkBarcodeForm from "./LinkBarcodeForm";
import "./barcode.css";

const SCANNER_VIEWPORT_ID = "mbb-html5-qrcode-reader";

/**
 * myBillBook Style Barcode Scanner Modal:
 * - Real live camera scanning on Web & Mobile (via Html5Qrcode)
 * - Continuous scanning mode (scan multiple items in a row without reopening)
 * - Hardware USB/Bluetooth scanner support (Keyboard Wedge)
 * - Manual barcode lookup input
 * - Audio feedback (Cashier beep)
 * - Smart unknown barcode handling (+ Quick Add or Link to Existing)
 */
export default function ScanBarcodeModal({
  open,
  onClose,
  onFound,
  onUnknown,
  title = "Scan Barcode (myBillBook style)",
  continuousDefault = true,
}) {
  const [continuous, setContinuous] = useState(continuousDefault);
  const [manual, setManual] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameras, setCameras] = useState([]);
  const [selectedCameraIndex, setSelectedCameraIndex] = useState(0);

  // Continuous scanned feedback badge
  const [lastScannedItem, setLastScannedItem] = useState(null);
  const [scannedCount, setScannedCount] = useState(0);

  // Unknown barcode handling
  const [unknownBarcode, setUnknownBarcode] = useState(null);
  const [unknownAction, setUnknownAction] = useState(null); // 'quick_add' | 'link' | null

  const html5QrCodeRef = useRef(null);
  const isStartingRef = useRef(false);

  // Deduplication ref for camera reads (1200ms)
  const lastCameraReadRef = useRef({ code: "", at: 0 });

  /* ------------------------------------------------------------------------
     1. Unified Barcode Engine (Camera + Wedge + Manual)
     ------------------------------------------------------------------------ */
  const handleItemFound = useCallback(
    (item) => {
      feedbackOk();
      setScannedCount((prev) => prev + 1);

      const prodName = item.product?.name || item.name || "Item";
      const price = item.product?.salePrice ?? item.salePrice;
      const priceStr = price !== undefined ? ` • ₹${price}` : "";

      setLastScannedItem({
        name: prodName,
        barcode: item.barcode,
        info: `${prodName}${priceStr}`,
      });

      // Notify parent
      onFound?.(item);

      if (!continuous) {
        onClose?.();
      }
    },
    [continuous, onFound, onClose]
  );

  const handleItemUnknown = useCallback(
    ({ barcode }) => {
      feedbackUnknown();
      setUnknownBarcode(barcode);
      onUnknown?.({ barcode });
    },
    [onUnknown]
  );

  const engine = useBarcodeEngine({
    enabled: open && !unknownBarcode,
    onFound: handleItemFound,
    onUnknown: handleItemUnknown,
  });

  // Physical Hardware USB / Bluetooth Scanner listener
  useKeyboardWedge(
    (code) => {
      if (!unknownBarcode) {
        engine(code, "wedge");
      }
    },
    { enabled: open }
  );

  /* ------------------------------------------------------------------------
     2. Camera Lifecycle using Html5Qrcode
     ------------------------------------------------------------------------ */
  useEffect(() => {
    if (!open) {
      setLastScannedItem(null);
      setScannedCount(0);
      setUnknownBarcode(null);
      setUnknownAction(null);
      return;
    }

    let isSubscribed = true;
    isStartingRef.current = true;

    const initCamera = async () => {
      try {
        setCameraError("");
        setCameraActive(false);

        // Get available camera devices
        const devices = await Html5Qrcode.getCameras().catch(() => []);
        if (isSubscribed && Array.isArray(devices) && devices.length > 0) {
          setCameras(devices);
        }

        const scanner = new Html5Qrcode(SCANNER_VIEWPORT_ID);
        html5QrCodeRef.current = scanner;

        const config = {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minDim = Math.min(viewfinderWidth, viewfinderHeight);
            return {
              width: Math.floor(minDim * 0.85),
              height: Math.floor(minDim * 0.55),
            };
          },
          aspectRatio: 1.333,
        };

        const cameraId = devices[selectedCameraIndex]?.id;
        const cameraSource = cameraId ? { deviceId: { exact: cameraId } } : { facingMode: "environment" };

        await scanner.start(
          cameraSource,
          config,
          (decodedText) => {
            if (!isSubscribed) return;
            const now = Date.now();
            if (
              lastCameraReadRef.current.code === decodedText &&
              now - lastCameraReadRef.current.at < 1200
            ) {
              return; // deduplicate
            }
            lastCameraReadRef.current = { code: decodedText, at: now };
            engine(decodedText, "camera");
          },
          () => {
            // Frame miss, silent
          }
        );

        if (isSubscribed) {
          setCameraActive(true);
        }
      } catch (err) {
        console.warn("Camera init error:", err);
        if (isSubscribed) {
          setCameraError(
            err?.message ||
              "Camera access denied or unavailable. You can still type barcodes or use a USB scanner."
          );
          setCameraActive(false);
        }
      } finally {
        isStartingRef.current = false;
      }
    };

    // Small delay to ensure modal DOM is mounted
    const timer = setTimeout(() => {
      initCamera();
    }, 150);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current
          .stop()
          .then(() => html5QrCodeRef.current?.clear())
          .catch(() => {});
        html5QrCodeRef.current = null;
      }
    };
  }, [open, selectedCameraIndex, engine]);

  // Flip Camera
  const handleFlipCamera = () => {
    if (cameras.length <= 1) {
      toast("Only one camera device detected");
      return;
    }
    setSelectedCameraIndex((prev) => (prev + 1) % cameras.length);
  };

  /* ------------------------------------------------------------------------
     3. Render
     ------------------------------------------------------------------------ */
  if (!open) return null;

  return (
    <BcxModal
      open={open}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ScanBarcode size={18} className="text-primary" />
          <span>{title}</span>
          {scannedCount > 0 && (
            <span className="mbb-scan-counter-pill">
              {scannedCount} {scannedCount === 1 ? "item" : "items"}
            </span>
          )}
        </div>
      }
      onClose={onClose}
    >
      {/* Unknown Barcode Sheet */}
      {unknownBarcode ? (
        <div style={{ padding: "16px 20px" }}>
          {unknownAction === "quick_add" ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <h4 style={{ margin: 0 }}>+ Quick Add Product</h4>
                <button
                  type="button"
                  className="bcx-icon-btn"
                  onClick={() => setUnknownAction(null)}
                >
                  <X size={16} />
                </button>
              </div>
              <QuickAddProduct
                barcode={unknownBarcode}
                onDone={(product) => {
                  setUnknownBarcode(null);
                  setUnknownAction(null);
                  handleItemFound({ barcode: unknownBarcode, product });
                }}
                onCancel={() => setUnknownAction(null)}
              />
            </div>
          ) : unknownAction === "link" ? (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <h4 style={{ margin: 0 }}>Link Barcode to Product</h4>
                <button
                  type="button"
                  className="bcx-icon-btn"
                  onClick={() => setUnknownAction(null)}
                >
                  <X size={16} />
                </button>
              </div>
              <LinkBarcodeForm
                barcode={unknownBarcode}
                lockBarcode
                onDone={(link, prod) => {
                  setUnknownBarcode(null);
                  setUnknownAction(null);
                  handleItemFound({ barcode: unknownBarcode, product: prod });
                }}
                onCancel={() => setUnknownAction(null)}
              />
            </div>
          ) : (
            <div>
              <div
                style={{
                  background: "#fee2e2",
                  border: "1px solid #fca5a5",
                  borderRadius: 8,
                  padding: "12px 16px",
                  marginBottom: 16,
                  color: "#991b1b",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>Barcode Not Found</div>
                <div style={{ fontSize: "0.85rem", marginTop: 4 }}>
                  Barcode <strong>{unknownBarcode}</strong> is not registered to any product yet.
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                  type="button"
                  className="bcx-btn is-primary"
                  style={{ width: "100%", padding: "10px 14px", justifyContent: "flex-start" }}
                  onClick={() => setUnknownAction("quick_add")}
                >
                  <PackagePlus size={16} />
                  <span>Quick Add New Product</span>
                </button>

                <button
                  type="button"
                  className="bcx-btn"
                  style={{ width: "100%", padding: "10px 14px", justifyContent: "flex-start" }}
                  onClick={() => setUnknownAction("link")}
                >
                  <Search size={16} />
                  <span>Link to Existing Product</span>
                </button>

                <button
                  type="button"
                  className="bcx-btn"
                  style={{ width: "100%", marginTop: 6 }}
                  onClick={() => setUnknownBarcode(null)}
                >
                  Continue Scanning
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Top Controls: Continuous Mode & Camera Flip */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 14px",
              background: "#f8fafc",
              borderBottom: "1px solid var(--border-color, #e2e8f0)",
            }}
          >
            <button
              type="button"
              className={`mbb-mode-toggle ${continuous ? "active" : ""}`}
              onClick={() => setContinuous(!continuous)}
              title="Continuous scanning lets you scan multiple items without closing the camera"
            >
              <Sparkles size={13} />
              <span>Continuous Scan: <strong>{continuous ? "ON" : "OFF"}</strong></span>
            </button>

            {cameras.length > 1 && (
              <button
                type="button"
                className="bcx-icon-btn"
                onClick={handleFlipCamera}
                title="Switch Camera"
                style={{ width: 32, height: 32 }}
              >
                <SwitchCamera size={16} />
              </button>
            )}
          </div>

          {/* Camera Viewport Area */}
          <div className="mbb-scanner-container">
            <div id={SCANNER_VIEWPORT_ID} />

            {/* Reticle Target Frame */}
            {cameraActive && (
              <div className="mbb-scan-reticle">
                <div className="mbb-scan-laser" />
              </div>
            )}

            {/* Error or Fallback Message */}
            {!cameraActive && cameraError && (
              <div
                style={{
                  position: "absolute",
                  inset: 16,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#cbd5e1",
                  textAlign: "center",
                  padding: 16,
                  zIndex: 5,
                }}
              >
                <Camera size={36} style={{ color: "#94a3b8", marginBottom: 8 }} />
                <p style={{ fontSize: "0.84rem", margin: 0 }}>{cameraError}</p>
                <p style={{ fontSize: "0.74rem", color: "#64748b", marginTop: 4 }}>
                  You can type the barcode below or scan with a USB/Bluetooth barcode gun.
                </p>
              </div>
            )}

            {/* Live Scanned Feedback Toast */}
            {lastScannedItem && (
              <div className="mbb-scan-live-banner">
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <CheckCircle2 size={16} />
                  <span>Added: <strong>{lastScannedItem.name}</strong></span>
                </div>
                <span style={{ fontSize: "0.72rem", background: "rgba(0,0,0,0.2)", padding: "2px 6px", borderRadius: 4 }}>
                  ✓ In List
                </span>
              </div>
            )}
          </div>

          {/* Modal Footer: Manual Input & Done Button */}
          <div className="bcx-modal-foot">
            <form
              className="bcx-manual"
              onSubmit={(e) => {
                e.preventDefault();
                if (!manual.trim()) return;
                engine(manual.trim(), "manual");
                setManual("");
              }}
            >
              <input
                className="bcx-input"
                data-wedge="1"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                placeholder="Type barcode / SKU & press Enter"
                inputMode="text"
                autoComplete="off"
              />
              <button
                type="submit"
                className="bcx-btn is-primary"
                disabled={!manual.trim()}
              >
                Look up
              </button>
            </form>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                Tip: Handheld USB scanners work automatically anytime!
              </span>

              <button
                type="button"
                className="bcx-btn is-primary"
                style={{ padding: "6px 18px", fontWeight: 700 }}
                onClick={onClose}
              >
                {scannedCount > 0 ? `Done (${scannedCount} added)` : "Close"}
              </button>
            </div>
          </div>
        </>
      )}
    </BcxModal>
  );
}
