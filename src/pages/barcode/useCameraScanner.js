import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { BarcodeFormat, BarcodeScanner, LensFacing } from "@capacitor-mlkit/barcode-scanning";

const FORMATS = [
  BarcodeFormat.Ean13, BarcodeFormat.Ean8, BarcodeFormat.UpcA, BarcodeFormat.UpcE,
  BarcodeFormat.Code128, BarcodeFormat.Code39, BarcodeFormat.Itf, BarcodeFormat.QrCode,
];

/** Continuous native camera scanning (ML Kit). Host element must stay transparent – see barcode.css. */
export default function useCameraScanner({ active, onBarcode }) {
  const [state, setState] = useState({ supported: true, permission: "unknown", torchAvailable: false, error: "" });
  const [torchOn, setTorchOn] = useState(false);
  const [lens, setLens] = useState(LensFacing.Back);
  const cb = useRef(onBarcode);
  cb.current = onBarcode;

  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;
    let handle;

    const start = async () => {
      if (!Capacitor.isNativePlatform()) return setState((s) => ({ ...s, supported: false }));
      const sup = await BarcodeScanner.isSupported();
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
    };

    start().catch((e) => !cancelled && setState((s) => ({ ...s, error: e?.message || "Camera error" })));

    return () => {
      cancelled = true;
      handle?.remove();
      document.body.classList.remove("barcode-scanner-active");
      BarcodeScanner.stopScan().catch(() => {});
      setTorchOn(false);
    };
  }, [active, lens]);

  const toggleTorch = useCallback(async () => {
    try { await BarcodeScanner.toggleTorch(); setTorchOn((v) => !v); } catch { /* ignore */ }
  }, []);
  const flipCamera = useCallback(
    () => setLens((l) => (l === LensFacing.Back ? LensFacing.Front : LensFacing.Back)), [],
  );

  return { ...state, torchOn, toggleTorch, flipCamera };
}
