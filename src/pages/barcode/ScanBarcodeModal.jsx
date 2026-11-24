import { useState } from "react";
import { Flashlight, SwitchCamera } from "lucide-react";
import BcxModal from "./BcxModal";
import useBarcodeEngine from "./useBarcodeEngine";
import useCameraScanner from "./useCameraScanner";
import useKeyboardWedge from "./useKeyboardWedge";
import { feedbackOk, feedbackUnknown } from "./feedback";
import "./barcode.css";

/** Reusable scan dialog for Product Master and any module: camera + Bluetooth/USB + manual, one engine. */
export default function ScanBarcodeModal({
  open,
  onClose,
  onFound,
  onUnknown,
  title = "Scan barcode",
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
      onClose?.();
      onUnknown?.(u);
    },
  });

  const camera = useCameraScanner({
    active: open,
    onBarcode: (c) => engine(c, "camera"),
  });

  useKeyboardWedge((c) => engine(c, "wedge"), { enabled: open });

  return (
    <BcxModal open={open} title={title} onClose={onClose} transparentBody>
      <div className="bcx-viewport bcx-viewport--modal">
        {/* Web camera feed */}
        {camera.isWeb && camera.supported && camera.permission !== "denied" && (
          <video
            ref={camera.videoRef}
            playsInline
            muted
            autoPlay
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        )}

        {camera.supported && camera.permission !== "denied" ? (
          <div className="bcx-frame" aria-hidden="true">
            <div className="bcx-laser" />
          </div>
        ) : (
          <p className="bcx-hint bcx-ui">
            {camera.permission === "denied"
              ? "Camera permission denied. Enable it in your browser / app settings."
              : "Camera scanning is available on devices with a webcam or mobile camera. Use a Bluetooth/USB scanner or type the code."}
          </p>
        )}
      </div>

      <div className="bcx-modal-foot bcx-ui">
        <div className="bcx-tools">
          {camera.torchAvailable && (
            <button
              type="button"
              className={`bcx-icon-btn ${camera.torchOn ? "is-on" : ""}`}
              onClick={camera.toggleTorch}
              aria-label="Flashlight"
            >
              <Flashlight size={18} />
            </button>
          )}
          {camera.supported && (
            <button
              type="button"
              className="bcx-icon-btn"
              onClick={camera.flipCamera}
              aria-label="Switch camera"
            >
              <SwitchCamera size={18} />
            </button>
          )}
        </div>

        <form
          className="bcx-manual"
          onSubmit={(e) => {
            e.preventDefault();
            engine(manual, "manual");
            setManual("");
          }}
        >
          <input
            className="bcx-input"
            data-wedge="1"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Type or scan barcode"
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

      <div id="bcx-scanner-hidden" style={{ display: "none" }} />
    </BcxModal>
  );
}
