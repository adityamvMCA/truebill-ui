import { useCallback, useState } from "react";
import Papa from "papaparse";
import toast from "react-hot-toast";

import { runBatchedImport } from "../utils/runBatchedImport";

function useCsvImport({
  entityName = "record",
  validateRow,
  upload,
  batchSize = 1000,
  maxRows = 5000,
  onDone,
}) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);

  const handleFile = useCallback(
    (file) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
        transform: (v) => (typeof v === "string" ? v.trim() : v),
        complete: (result) => {
          const rows = result.data;
          const columns = result.meta.fields || [];

          if (!rows.length) {
            toast.error("The CSV file has no data rows");
            return;
          }

          if (rows.length > maxRows) {
            toast.error(`Maximum ${maxRows} rows allowed per file`);
            return;
          }

          const rowErrors = {};

          rows.forEach((row, i) => {
            const errs = validateRow ? validateRow(row) : [];
            if (errs.length) rowErrors[i] = errs;
          });

          setPreview({ file, columns, rows, rowErrors });
        },
        error: (err) => toast.error(`Unable to read CSV: ${err.message}`),
      });
    },
    [maxRows, validateRow],
  );

  const cancel = useCallback(() => {
    if (!loading) setPreview(null);
  }, [loading]);

  const confirm = useCallback(async () => {
    if (!preview) return;

    try {
      setLoading(true);
      setProgress({ processed: 0, total: preview.rows.length });

      const summary = await runBatchedImport({
        rows: preview.rows,
        upload,
        batchSize,
        onProgress: setProgress,
      });

      if (summary.createdCount > 0) {
        toast.success(
          `${summary.createdCount} ${entityName}${
            summary.createdCount > 1 ? "s" : ""
          } imported successfully`,
        );
      }

      if (summary.failedCount > 0) {
        const first = summary.errors[0];

        toast.error(
          `${summary.failedCount} row${summary.failedCount > 1 ? "s" : ""} failed${
            first ? `: Row ${first.row} — ${first.message}` : ""
          }`,
        );
      }

      setPreview(null);
      await onDone?.();
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, [preview, upload, batchSize, entityName, onDone]);

  return { preview, loading, progress, handleFile, cancel, confirm };
}

export default useCsvImport;
