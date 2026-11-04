import { barcodeApi } from "./barcodeApi";
import { pendingAdd, pendingCount, pendingDelete, pendingList } from "./barcodeDb";
import { emitAck } from "./scannerSocket";

export const newScanId = () =>
  (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`).slice(0, 64);

/** Persist FIRST (never lose a confirmed scan), then try to send. */
export const enqueueScan = async ({ sessionId, barcode, quantity }) => {
  const scan = { scanId: newScanId(), sessionId, barcode, quantity, createdAt: Date.now(), error: "" };
  await pendingAdd(scan);
  return scan;
};

let flushing = false;

/**
 * Send queued scans in order. Prefers the socket; falls back to REST batch (with device token)
 * when the socket is down but the network is up. Server rejects duplicate scanIds, so retries are safe.
 */
export async function flushQueue({ socket, sessionId, deviceToken, onChange }) {
  if (flushing || !sessionId) return;
  flushing = true;
  try {
    let list = await pendingList(sessionId);
    if (!list.length) return;

    if (socket?.connected) {
      for (const scan of list) {
        try {
          const res = await emitAck(socket, "scanner:confirm", {
            scanId: scan.scanId, barcode: scan.barcode, quantity: scan.quantity,
          });
          if (res.status === "OK" || res.status === "DUPLICATE" || res.status === "NOT_FOUND") {
            await pendingDelete(scan.scanId);
          }
        } catch (e) {
          if (e.server) await pendingAdd({ ...scan, error: e.message }); // keep, flag (e.g. session expired)
          else break; // connectivity problem – stop, retry later
        }
        onChange?.();
      }
    } else if (navigator.onLine && deviceToken) {
      list = list.filter((s) => !s.error);
      for (let i = 0; i < list.length; i += 100) {
        const chunk = list.slice(i, i + 100);
        try {
          const { data } = await barcodeApi.syncScans(
            sessionId,
            chunk.map(({ scanId, barcode, quantity }) => ({ scanId, barcode, quantity })),
            deviceToken,
          );
          for (const r of data.results) {
            if (r.status === "ERROR") {
              const orig = chunk.find((c) => c.scanId === r.scanId);
              await pendingAdd({ ...orig, error: r.message });
            } else await pendingDelete(r.scanId);
          }
        } catch { break; }
        onChange?.();
      }
    }
  } finally {
    flushing = false;
    onChange?.();
  }
}

export const countPending = pendingCount;
export const listPending = pendingList;
export const discardScan = pendingDelete;
