import { useRef, useState } from "react";
import { Flashlight, SwitchCamera, X } from "lucide-react";
import useBarcodeEngine from "./useBarcodeEngine";
import useCameraScanner from "./useCameraScanner";
import useKeyboardWedge from "./useKeyboardWedge";
import { feedbackOk, feedbackUnknown } from "./feedback";
import "./barcode.css";

/**
 * Full-screen barcode scan modal.
 *
 * Native (Capacitor Android/iOS):
 *   - ML Kit renders camera natively behind the webview.
 *   - body gets `barcode-scanner-active` class → CSS makes everything transparent
 *     so the native camera feed is visible through it.
 *   - Only the scan frame / laser / controls are shown over it.
 *
 * Web browser:
 *   - <video> element fills the viewport, BarcodeDetector (or Html5Qrcode fallback) decodes frames.
 */
export default function ScanBarcodeModal({
  open,
  onClose,
  onFound,
  onUnknown,
  title = "Scan Barcode",
}) {
  const [manual, setManual] = useState("");

  const engine = useBarcodeEngine({
    enabled: open,
    onFound: (f) => {
      feedbackOk();
      onClose?.();
      onFound?.(f);
    },
    onUnknown: (u) => {
      feedbackUnknown();
      onUnknown?.(u);
    },
  });

  const camera = useCameraScanner({
    active: open,
    onBarcode: (code, format) => engine(code, "camera"),
  });

  useKeyboardWedge((code) => engine(code, "wedge"), { enabled: open });

  if (!open) return null;

  const denied = camera.permission === "denied";
  const noCamera = !camera.supported || denied;

  return (
    /*
     * On native: body is transparent, this dialog must also be transparent
     * so the ML Kit camera feed shows through.
     * .bcx-modal-backdrop sets background only on web.
     */
    <div
      className={`bcx-scan-modal-root bcx-ui${camera.isNative ? " is-native" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="bcx-scan-topbar bcx-ui">
        <span className="bcx-scan-title">{title}</span>
        <button
          type="button"
          className="bcx-scan-close bcx-icon-btn"
          aria-label="Close"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>

      {/* ── Viewport ─────────────────────────────────────────────────────── */}
      <div className="bcx-scan-viewport">
        {/* Web: live video feed */}
        {camera.isWeb && camera.supported && !denied && (
          <video
            ref={camera.videoRef}
            className="bcx-scan-video"
            playsInline
            muted
            autoPlay
          />
        )}

        {/* Scan frame + laser (shown on both native and web) */}
        {!noCamera && (
          <div className="bcx-scan-frame" aria-hidden="true">
            <span className="bcx-scan-corner tl" />
            <span className="bcx-scan-corner tr" />
            <span className="bcx-scan-corner bl" />
            <span className="bcx-scan-corner br" />
            <div className="bcx-scan-laser" />
          </div>
        )}

        {/* Camera tool buttons overlaid top-right of viewport */}
        {!noCamera && (
          <div className="bcx-scan-cam-tools">
            {camera.torchAvailable && (
              <button
                type="button"
                className={`bcx-icon-btn bcx-scan-tool-btn${camera.torchOn ? " is-on" : ""}`}
                onClick={camera.toggleTorch}
                aria-label="Flashlight"
              >
                <Flashlight size={20} />
              </button>
            )}
            <button
              type="button"
              className="bcx-icon-btn bcx-scan-tool-btn"
              onClick={camera.flipCamera}
              aria-label="Switch camera"
            >
              <SwitchCamera size={20} />
            </button>
          </div>
        )}

        {/* Error / permission denied state */}
        {noCamera && (
          <div className="bcx-scan-no-camera bcx-ui">
            <p>
              {denied
                ? "📷 Camera permission denied. Enable it in Settings and reload."
                : camera.error
                ? `⚠️ ${camera.error}`
                : "Camera not available. Use Bluetooth/USB scanner or type the code below."}
            </p>
          </div>
        )}

        {/* Hint text at bottom of viewport */}
        {!noCamera && (
          <p className="bcx-scan-hint-overlay">
            Point camera at a barcode
          </p>
        )}
      </div>

      {/* ── Bottom: manual entry ─────────────────────────────────────────── */}
      <div className="bcx-scan-footer bcx-ui">
        <form
          className="bcx-manual"
          onSubmit={(e) => {
            e.preventDefault();
            if (manual.trim()) {
              engine(manual.trim(), "manual");
              setManual("");
            }
          }}
        >
          <input
            className="bcx-input"
            data-wedge="1"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Or type / paste barcode here"
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
      </div>

      {/* Required hidden container for Html5Qrcode fallback */}
      <div id="bcx-scanner-hidden" style={{ display: "none" }} />
    </div>
  );
}
