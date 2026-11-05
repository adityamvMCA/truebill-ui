import { barcodeApi } from "./barcodeApi";
import {
  catalogClear, catalogCount, catalogGet, catalogPutMany, getTenantKey, metaGet, metaSet,
} from "./barcodeDb";

const toRow = (tenant, it) => ({ k: `${tenant}:${it.b}`, b: it.b, pk: it.pk, q: it.q, p: it.p });

/** Download (or resume downloading) the whole catalogue in cursor pages. 1 lakh barcodes ≈ 20 pages. */
export async function syncCatalog({ onProgress, reset = false } = {}) {
  const tenant = getTenantKey();
  if (reset) {
    await catalogClear();
    await metaSet(`cursor:${tenant}`, null);
    await metaSet(`done:${tenant}`, false);
  }
  let cursor = (await metaGet(`cursor:${tenant}`)) || undefined;
  let loaded = await catalogCount();

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data } = await barcodeApi.catalog({ after: cursor, limit: 5000 });
    if (data.items.length) {
      await catalogPutMany(data.items.map((it) => toRow(tenant, it)));
      loaded += data.items.length;
    }
    cursor = data.nextCursor || null;
    await metaSet(`cursor:${tenant}`, cursor);
    onProgress?.(loaded);
    if (!cursor) break;
  }
  await metaSet(`done:${tenant}`, true);
  await metaSet(`syncedAt:${tenant}`, Date.now());
  return loaded;
}

export const catalogStatus = async () => {
  const tenant = getTenantKey();
  return {
    count: await catalogCount(),
    done: Boolean(await metaGet(`done:${tenant}`)),
    syncedAt: await metaGet(`syncedAt:${tenant}`),
  };
};

/** O(log n) key lookup on-device – no network, no full scan. */
export async function lookupLocal(barcode) {
  const row = await catalogGet(`${getTenantKey()}:${barcode}`);
  return row ? { product: row.p, packaging: { packagingName: row.pk, conversionQuantity: row.q } } : null;
}

export const cacheServerHit = async (barcode, { product, mapping }) =>
  catalogPutMany([toRow(getTenantKey(), {
    b: barcode, pk: mapping.packagingName, q: mapping.conversionQuantity, p: product,
  })]);

/* ---------------- unknown-barcode offline queue (uses the existing `meta` store) ---------------- */
const unknownKey = () => `unknownQ:${getTenantKey()}`;
let flushingUnknown = false;

export async function queueUnknown(code) {
  const q = (await metaGet(unknownKey())) || [];
  if (!q.includes(code)) await metaSet(unknownKey(), [...q, code].slice(-500));
}

/** Report to server when online, otherwise remember it until we are. */
export async function reportUnknownSafe(code) {
  if (navigator.onLine) {
    try {
      await barcodeApi.reportUnknown(code);
      return;
    } catch (e) {
      const status = e?.response?.status;
      if (status && status >= 400 && status < 500) return; // permanent rejection – don't queue
    }
  }
  await queueUnknown(code);
}

export async function flushUnknown() {
  if (flushingUnknown || !navigator.onLine) return;
  flushingUnknown = true;
  try {
    const q = (await metaGet(unknownKey())) || [];
    if (!q.length) return;
    const left = [];
    for (const code of q) {
      try {
        await barcodeApi.reportUnknown(code);
      } catch (e) {
        const status = e?.response?.status;
        if (!(status && status >= 400 && status < 500)) left.push(code); // drop permanent failures
      }
    }
    await metaSet(unknownKey(), left);
  } finally {
    flushingUnknown = false;
  }
}