import { useCallback, useRef } from "react";
import { barcodeApi } from "./barcodeApi";
import { cacheServerHit, lookupLocal } from "./barcodeCatalog";

/**
 * The ONE processing path for camera, Bluetooth/USB keyboard scanners and manual entry.
 * Modules never implement their own lookup – they pass onFound/onUnknown.
 */
export default function useBarcodeEngine({ onFound, onUnknown, enabled = true, dedupeMs = 1500 }) {
  const last = useRef({ code: "", at: 0 });
  const busy = useRef(false);
  const cb = useRef({});
  cb.current = { onFound, onUnknown, enabled };

  return useCallback(async (raw, source = "camera") => {
    const barcode = String(raw ?? "").trim();
    if (!barcode || barcode.length > 64 || !cb.current.enabled || busy.current) return;

    const now = Date.now();
    if (last.current.code === barcode && now - last.current.at < dedupeMs) return; // accidental re-read
    last.current = { code: barcode, at: now };

    busy.current = true;
    try {
      const local = await lookupLocal(barcode);
      if (local) return cb.current.onFound?.({ barcode, source, ...local });

      if (navigator.onLine) {
        try {
          const { data } = await barcodeApi.lookup(barcode); // catalogue may be stale
          const hit = data?.data;
          if (hit) {
            await cacheServerHit(barcode, hit);
            return cb.current.onFound?.({
              barcode, source, product: hit.product,
              packaging: { packagingName: hit.mapping.packagingName, conversionQuantity: hit.mapping.conversionQuantity },
            });
          }
        } catch (e) {
          // 404 = genuinely unknown; only rethrow real errors so the caller
          // can fall back to onUnknown instead of crashing the scan loop.
          if (e?.response?.status && e.response.status !== 404) throw e;
        }
      }
      return cb.current.onUnknown?.({ barcode, source, offline: !navigator.onLine });
    } finally {
      busy.current = false;
    }
  }, [dedupeMs]);
}
