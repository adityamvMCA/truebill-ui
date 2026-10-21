export async function runBatchedImport({
  rows,
  upload,
  batchSize = 1000,
  onBatchStart,
  onProgress,
}) {
  const summary = {
    total: rows.length,
    createdCount: 0,
    failedCount: 0,
    errors: [],
  };

  for (let start = 0; start < rows.length; start += batchSize) {
    const batch = rows.slice(start, start + batchSize);

    onBatchStart?.({ start, size: batch.length, total: rows.length });

    try {
      const response = await upload({ rows: batch, rowOffset: start });
      const result = response?.data || {};

      summary.createdCount += Number(result.createdCount) || 0;
      summary.failedCount += Number(result.failedCount) || 0;
      summary.errors.push(...(result.errors || []));
    } catch (error) {
      const message =
        error?.response?.data?.message || error?.message || "Batch failed";

      summary.failedCount += batch.length;

      batch.forEach((_, i) => {
        summary.errors.push({ row: start + i + 2, message });
      });
    }

    onProgress?.({
      processed: Math.min(start + batch.length, rows.length),
      total: rows.length,
      createdCount: summary.createdCount,
      failedCount: summary.failedCount,
    });
  }

  return summary;
}