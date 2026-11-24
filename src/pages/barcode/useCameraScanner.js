import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { BarcodeFormat, BarcodeScanner, LensFacing } from "@capacitor-mlkit/barcode-scanning";
import { Html5Qrcode } from "html5-qrcode";

const FORMATS = [
  BarcodeFormat.Ean13, BarcodeFormat.Ean8, BarcodeFormat.UpcA, BarcodeFormat.UpcE,
  BarcodeFormat.Code128, BarcodeFormat.Code39, BarcodeFormat.Itf, BarcodeFormat.QrCode,
];

/** Fast camera scanner supporting both Native (ML Kit) and Web Browser (BarcodeDetector / Html5Qrcode). */
export default function useCameraScanner({ active, onBarcode }) {
  const [state, setState] = useState({
    supported: true,
    permission: "unknown",
    torchAvailable: false,
    error: "",
  });
  const [torchOn, setTorchOn] = useState(false);
  const [lens, setLens] = useState(LensFacing.Back);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const cb = useRef(onBarcode);
  cb.current = onBarcode;

  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;
    let scanInterval = null;
    let handle = null;
    let html5Qr = null;

    const start = async () => {
      // ----------------------------------------------------------------------
      // 1. NATIVE PLATFORM (Capacitor ML Kit)
      // ----------------------------------------------------------------------
      if (isNative) {
        const sup = await BarcodeScanner.isSupported().catch(() => ({ supported: false }));
        if (!sup.supported) return setState((s) => ({ ...s, supported: false }));

        let perm = await BarcodeScanner.checkPermissions();
        if (perm.camera !== "granted") perm = await BarcodeScanner.requestPermissions();
        if (cancelled) return;
        if (perm.camera !== "granted") return setState((s) => ({ ...s, permission: "denied" }));
        setState((s) => ({ ...s, permission: "granted", supported: true, error: "" }));

        handle = await BarcodeScanner.addListener("barcodesScanned", ({ barcodes }) => {
          const b = barcodes?.[0];
          if (b?.rawValue) cb.current(b.rawValue, b.format);
        });
        if (cancelled) { handle.remove(); return; }

        document.body.classList.add("barcode-scanner-active");
        await BarcodeScanner.startScan({ formats: FORMATS, lensFacing: lens });
        const torch = await BarcodeScanner.isTorchAvailable().catch(() => ({ available: false }));
        if (!cancelled) setState((s) => ({ ...s, torchAvailable: torch.available }));
        return;
      }

      // ----------------------------------------------------------------------
      // 2. WEB BROWSER (Fast Hardware BarcodeDetector / Lightweight scan)
      // ----------------------------------------------------------------------
      if (!navigator?.mediaDevices?.getUserMedia) {
        return setState((s) => ({ ...s, supported: false }));
      }

      try {
        const constraints = {
          video: {
            facingMode: lens === LensFacing.Back ? { ideal: "environment" } : { ideal: "user" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        // Check if torch is supported on this track
        const track = stream.getVideoTracks()[0];
        const caps = track?.getCapabilities ? track.getCapabilities() : {};
        const torchAvailable = Boolean(caps?.torch);

        if (!cancelled) {
          setState((s) => ({
            ...s,
            supported: true,
            permission: "granted",
            torchAvailable,
            error: "",
          }));
        }

        // Check for native BarcodeDetector API (Chrome, Edge, Opera, Android Webview)
        let detector = null;
        if (typeof window !== "undefined" && "BarcodeDetector" in window) {
          try {
            detector = new window.BarcodeDetector({
              formats: ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "qr_code", "itf"],
            });
          } catch (e) {
            detector = null;
          }
        }

        let isScanning = false;
        let lastScanned = "";
        let lastTime = 0;

        // If BarcodeDetector is supported, scan at 60fps / 80ms interval (<2ms detection overhead)
        if (detector) {
          scanInterval = setInterval(async () => {
            if (cancelled || isScanning) return;
            const video = videoRef.current;
            if (!video || video.readyState < 2) return;

            isScanning = true;
            try {
              const barcodes = await detector.detect(video);
              if (barcodes?.length > 0) {
                const val = barcodes[0].rawValue;
                const now = Date.now();
                if (val && (val !== lastScanned || now - lastTime > 1200)) {
                  lastScanned = val;
                  lastTime = now;
                  cb.current(val, barcodes[0].format);
                }
              }
            } catch {
              // Frame skip
            } finally {
              isScanning = false;
            }
          }, 80);
        } else {
          // Fallback: fast scan via canvas
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d", { willReadFrequently: true });

          scanInterval = setInterval(async () => {
            if (cancelled || isScanning) return;
            const video = videoRef.current;
            if (!video || video.readyState < 2 || !video.videoWidth) return;

            isScanning = true;
            try {
              canvas.width = Math.min(640, video.videoWidth);
              canvas.height = Math.min(480, video.videoHeight);
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              
              if (!html5Qr) {
                html5Qr = new Html5Qrcode("bcx-scanner-hidden", { verbose: false });
              }
              const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.7));
              if (blob) {
                const file = new File([blob], "frame.jpg", { type: "image/jpeg" });
                const res = await html5Qr.scanFileV2(file, false).catch(() => null);
                if (res?.decodedText) {
                  const now = Date.now();
                  if (res.decodedText !== lastScanned || now - lastTime > 1200) {
                    lastScanned = res.decodedText;
                    lastTime = now;
                    cb.current(res.decodedText, res.result?.format?.formatName);
                  }
                }
              }
            } catch {
              // Frame miss
            } finally {
              isScanning = false;
            }
          }, 200);
        }
      } catch (err) {
        if (!cancelled) {
          console.warn("Web camera error:", err);
          setState((s) => ({
            ...s,
            permission: err?.name === "NotAllowedError" ? "denied" : "unknown",
            error: err?.message || "Camera access failed",
          }));
        }
      }
    };

    start().catch((e) => !cancelled && setState((s) => ({ ...s, error: e?.message || "Camera error" })));

    return () => {
      cancelled = true;
      if (scanInterval) clearInterval(scanInterval);
      if (handle) handle.remove();

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      document.body.classList.remove("barcode-scanner-active");
      if (isNative) {
        BarcodeScanner.stopScan().catch(() => {});
      }
      setTorchOn(false);
    };
  }, [active, lens, isNative]);

  const toggleTorch = useCallback(async () => {
    try {
      if (isNative) {
        await BarcodeScanner.toggleTorch();
        setTorchOn((v) => !v);
      } else if (streamRef.current) {
        const track = streamRef.current.getVideoTracks()[0];
        if (track && track.applyConstraints) {
          const next = !torchOn;
          await track.applyConstraints({ advanced: [{ torch: next }] });
          setTorchOn(next);
        }
      }
    } catch { /* ignore */ }
  }, [isNative, torchOn]);

  const flipCamera = useCallback(
    () => setLens((l) => (l === LensFacing.Back ? LensFacing.Front : LensFacing.Back)),
    []
  );

  return { ...state, torchOn, toggleTorch, flipCamera, videoRef, isWeb: !isNative };
}
