import { useCallback, useEffect, useRef, useState } from "react";

// Safe dynamic imports — only pulled in when actually on a native platform
let _Capacitor = null;
let _BarcodeScanner = null;
let _BarcodeFormat = null;
let _LensFacing = null;

try {
  // These exist in both web and native bundles but only work on native
  const cap = require("@capacitor/core");
  _Capacitor = cap.Capacitor;
  const mlkit = require("@capacitor-mlkit/barcode-scanning");
  _BarcodeScanner = mlkit.BarcodeScanner;
  _BarcodeFormat = mlkit.BarcodeFormat;
  _LensFacing = mlkit.LensFacing;
} catch {
  // Running in a pure web environment without Capacitor installed
}

const isNativePlatform = () => _Capacitor?.isNativePlatform?.() === true;

const NATIVE_FORMATS = _BarcodeFormat
  ? [
      _BarcodeFormat.Ean13, _BarcodeFormat.Ean8,
      _BarcodeFormat.UpcA,  _BarcodeFormat.UpcE,
      _BarcodeFormat.Code128, _BarcodeFormat.Code39,
      _BarcodeFormat.Itf, _BarcodeFormat.QrCode,
      _BarcodeFormat.DataMatrix,
    ]
  : [];

const WEB_FORMATS = [
  "ean_13", "ean_8", "code_128", "code_39",
  "upc_a", "upc_e", "qr_code", "itf", "data_matrix",
];

/**
 * Unified camera scanner hook.
 *
 * Native (Capacitor Android/iOS):
 *   - Uses @capacitor-mlkit/barcode-scanning
 *   - ML Kit renders camera natively BEHIND the webview
 *   - We add `barcode-scanner-active` to body → CSS hides all UI, only .bcx-ui/.bcx-frame visible
 *
 * Web browser (Chrome/Edge/Safari/Android WebView):
 *   - Uses native BarcodeDetector API when available (fastest, ~5-10ms/frame)
 *   - Falls back to Html5Qrcode canvas decode (500ms interval)
 *   - Streams live <video> into the viewport div
 */
export default function useCameraScanner({ active, onBarcode }) {
  const isNative = isNativePlatform();

  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState("unknown"); // "unknown"|"granted"|"denied"
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [facingBack, setFacingBack] = useState(true);
  const [error, setError] = useState("");

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const nativeListenerRef = useRef(null);
  const html5QrRef = useRef(null);
  const cbRef = useRef(onBarcode);
  cbRef.current = onBarcode;

  // ─── CLEANUP helper ───────────────────────────────────────────────────────
  const stopAll = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (nativeListenerRef.current) { nativeListenerRef.current.remove?.(); nativeListenerRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) { videoRef.current.srcObject = null; }
    document.body.classList.remove("barcode-scanner-active");
    if (isNative && _BarcodeScanner) {
      _BarcodeScanner.stopScan().catch(() => {});
    }
    setTorchOn(false);
  }, [isNative]);

  // ─── NATIVE (Capacitor ML Kit) ────────────────────────────────────────────
  const startNative = useCallback(async () => {
    if (!_BarcodeScanner) { setSupported(false); return; }

    const sup = await _BarcodeScanner.isSupported().catch(() => ({ supported: false }));
    if (!sup.supported) { setSupported(false); return; }

    let perm = await _BarcodeScanner.checkPermissions().catch(() => ({ camera: "denied" }));
    if (perm.camera !== "granted") {
      perm = await _BarcodeScanner.requestPermissions().catch(() => ({ camera: "denied" }));
    }
    if (perm.camera !== "granted") { setPermission("denied"); return; }

    setPermission("granted");
    setSupported(true);
    setError("");

    nativeListenerRef.current = await _BarcodeScanner.addListener(
      "barcodesScanned",
      ({ barcodes }) => {
        const b = barcodes?.[0];
        if (b?.rawValue) cbRef.current?.(b.rawValue, b.format);
      }
    );

    // This is the critical step: makes body transparent → native camera visible
    document.body.classList.add("barcode-scanner-active");

    await _BarcodeScanner.startScan({
      formats: NATIVE_FORMATS,
      lensFacing: facingBack ? _LensFacing.Back : _LensFacing.Front,
    });

    const torch = await _BarcodeScanner.isTorchAvailable().catch(() => ({ available: false }));
    setTorchAvailable(torch.available);
  }, [facingBack]);

  // ─── WEB BROWSER ─────────────────────────────────────────────────────────
  const startWeb = useCallback(async () => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      setSupported(false);
      return;
    }

    try {
      const constraints = {
        video: {
          facingMode: facingBack ? { ideal: "environment" } : { ideal: "user" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Attach stream to video element
      const vid = videoRef.current;
      if (vid) {
        vid.srcObject = stream;
        vid.setAttribute("playsinline", "");
        vid.setAttribute("muted", "");
        // Explicit play (needed for iOS Safari & Android WebView)
        await vid.play().catch(() => {});
      }

      // Check torch
      const track = stream.getVideoTracks()[0];
      const caps = track?.getCapabilities?.() ?? {};
      setTorchAvailable(Boolean(caps?.torch));
      setPermission("granted");
      setSupported(true);
      setError("");

      // ── Detection loop ──────────────────────────────────────────────────
      let lastCode = "";
      let lastTime = 0;
      let scanning = false;

      const emit = (code, format) => {
        const now = Date.now();
        if (code && (code !== lastCode || now - lastTime > 1500)) {
          lastCode = code;
          lastTime = now;
          cbRef.current?.(code, format);
        }
      };

      // Prefer native BarcodeDetector (Chrome 83+, Edge, Android WebView, Opera)
      let detector = null;
      if (typeof window !== "undefined" && "BarcodeDetector" in window) {
        try {
          detector = new window.BarcodeDetector({ formats: WEB_FORMATS });
        } catch {
          detector = null;
        }
      }

      if (detector) {
        // Fast path: hardware-accelerated, ~80ms interval is plenty
        intervalRef.current = setInterval(async () => {
          if (scanning) return;
          const v = videoRef.current;
          if (!v || v.readyState < 2 || v.paused) return;
          scanning = true;
          try {
            const results = await detector.detect(v);
            if (results?.length) emit(results[0].rawValue, results[0].format);
          } catch { /* skip bad frame */ } finally {
            scanning = false;
          }
        }, 80);
      } else {
        // Fallback: Html5Qrcode canvas decode — heavier, use 500ms interval
        let Html5Qrcode;
        try {
          Html5Qrcode = (await import("html5-qrcode")).Html5Qrcode;
        } catch {
          setError("Barcode library unavailable. Use a physical scanner or type the code.");
          return;
        }

        // Hidden div for Html5Qrcode file scan trick
        let hiddenEl = document.getElementById("bcx-scanner-hidden");
        if (!hiddenEl) {
          hiddenEl = document.createElement("div");
          hiddenEl.id = "bcx-scanner-hidden";
          hiddenEl.style.display = "none";
          document.body.appendChild(hiddenEl);
        }

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        intervalRef.current = setInterval(async () => {
          if (scanning) return;
          const v = videoRef.current;
          if (!v || v.readyState < 2 || !v.videoWidth || v.paused) return;
          scanning = true;
          try {
            canvas.width = Math.min(640, v.videoWidth);
            canvas.height = Math.min(480, v.videoHeight);
            ctx.drawImage(v, 0, 0, canvas.width, canvas.height);

            if (!html5QrRef.current) {
              html5QrRef.current = new Html5Qrcode("bcx-scanner-hidden", { verbose: false });
            }

            const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.8));
            if (!blob) return;
            const file = new File([blob], "frame.jpg", { type: "image/jpeg" });
            const result = await html5QrRef.current.scanFileV2(file, false).catch(() => null);
            if (result?.decodedText) emit(result.decodedText, result.result?.format?.formatName);
          } catch { /* skip */ } finally {
            scanning = false;
          }
        }, 500);
      }
    } catch (err) {
      const denied = err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError";
      setPermission(denied ? "denied" : "unknown");
      setError(err?.message || "Camera access failed");
    }
  }, [facingBack]);

  // ─── Main effect ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!active) {
      stopAll();
      return;
    }

    if (isNative) {
      startNative();
    } else {
      startWeb();
    }

    return () => stopAll();
  }, [active, isNative, startNative, startWeb, stopAll]);

  // ─── Torch ───────────────────────────────────────────────────────────────
  const toggleTorch = useCallback(async () => {
    try {
      if (isNative && _BarcodeScanner) {
        await _BarcodeScanner.toggleTorch();
        setTorchOn((v) => !v);
      } else if (streamRef.current) {
        const track = streamRef.current.getVideoTracks()[0];
        if (track?.applyConstraints) {
          const next = !torchOn;
          await track.applyConstraints({ advanced: [{ torch: next }] });
          setTorchOn(next);
        }
      }
    } catch { /* ignore */ }
  }, [isNative, torchOn]);

  // ─── Flip camera ─────────────────────────────────────────────────────────
  const flipCamera = useCallback(() => {
    stopAll();
    setFacingBack((f) => !f);
  }, [stopAll]);

  return {
    supported,
    permission,
    torchAvailable,
    torchOn,
    error,
    toggleTorch,
    flipCamera,
    videoRef,
    isNative,
    isWeb: !isNative,
  };
}
