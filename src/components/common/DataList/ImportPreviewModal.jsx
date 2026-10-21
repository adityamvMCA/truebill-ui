import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";

import "./ImportPreviewModal.css";

const getMessage = (percent, done) => {
  if (done) return "Import complete!";
  if (percent < 15) return "Reading your file...";
  if (percent < 50) return "Validating rows...";
  if (percent < 90) return "Saving to your database...";
  return "Almost there...";
};

function UploadingAnimation() {
  return (
    <svg
      className="ua-svg"
      viewBox="0 0 320 220"
      role="img"
      aria-label="Uploading data"
    >
      <ellipse cx="115" cy="205" rx="100" ry="7" className="ua-shadow" />

      <g className="ua-cloud">
        <circle cx="235" cy="58" r="16" />
        <circle cx="258" cy="46" r="22" />
        <circle cx="282" cy="58" r="15" />
        <rect x="235" y="58" width="47" height="16" />
        <path
          d="M258 67 V49 M250 57 L258 49 L266 57"
          className="ua-cloud-arrow"
        />
      </g>

      <g className="ua-doc ua-doc-1">
        <rect x="132" y="96" width="18" height="22" rx="3" />
        <path d="M136 103 H146 M136 108 H146 M136 113 H142" />
      </g>
      <g className="ua-doc ua-doc-2">
        <rect x="132" y="96" width="18" height="22" rx="3" />
        <path d="M136 103 H146 M136 108 H146 M136 113 H142" />
      </g>
      <g className="ua-doc ua-doc-3">
        <rect x="132" y="96" width="18" height="22" rx="3" />
        <path d="M136 103 H146 M136 108 H146 M136 113 H142" />
      </g>

      <rect x="28" y="148" width="175" height="8" rx="4" className="ua-desk" />
      <rect x="42" y="156" width="6" height="45" className="ua-desk" />
      <rect x="182" y="156" width="6" height="45" className="ua-desk" />

      <rect x="30" y="120" width="8" height="50" rx="4" className="ua-chair" />
      <rect x="30" y="166" width="42" height="7" rx="3" className="ua-chair" />
      <rect x="36" y="173" width="5" height="28" className="ua-chair" />

      <rect x="52" y="168" width="48" height="9" rx="4" className="ua-pants" />
      <rect x="92" y="170" width="9" height="30" rx="4" className="ua-pants" />
      <rect x="92" y="196" width="18" height="6" rx="3" className="ua-shoe" />
      <rect
        x="50"
        y="104"
        width="34"
        height="68"
        rx="14"
        className="ua-shirt"
      />
      <circle cx="68" cy="86" r="15" className="ua-skin" />
      <path
        d="M53 84 a15 15 0 0 1 30 0 q-8 -9 -15 -6 q-8 -4 -15 6z"
        className="ua-hair"
      />
      <line
        x1="76"
        y1="122"
        x2="118"
        y2="143"
        className="ua-arm"
        strokeWidth="9"
        strokeLinecap="round"
      />

      <rect
        x="110"
        y="102"
        width="62"
        height="40"
        rx="4"
        className="ua-screen"
      />
      <rect
        x="118"
        y="112"
        width="46"
        height="5"
        rx="2.5"
        className="ua-screen-line"
      />
      <rect
        x="118"
        y="122"
        width="46"
        height="5"
        rx="2.5"
        className="ua-screen-line"
      />
      <rect
        x="118"
        y="132"
        width="46"
        height="5"
        rx="2.5"
        className="ua-screen-bar"
      />
      <rect
        x="102"
        y="142"
        width="78"
        height="6"
        rx="3"
        className="ua-laptop-base"
      />
    </svg>
  );
}

function SuccessCheck() {
  return (
    <svg
      className="ua-success"
      viewBox="0 0 120 120"
      role="img"
      aria-label="Upload complete"
    >
      <circle className="ua-success-circle" cx="60" cy="60" r="52" />
      <path className="ua-success-tick" d="M36 62 L54 80 L86 44" />
    </svg>
  );
}

function ImportPreviewModal({
  isOpen,
  entityName = "product",
  fileName,
  columns,
  rows,
  rowErrors,
  loading,
  progress,
  previewLimit = 200,
  onCancel,
  onConfirm,
}) {
  // Close on Escape (blocked while importing)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !loading) {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onCancel]);

  // Rows with errors first, capped so 5000 rows don't freeze the modal
  const previewIndexes = useMemo(() => {
    const withErrors = [];
    const clean = [];

    rows.forEach((_, i) => (rowErrors[i] ? withErrors : clean).push(i));

    return [...withErrors, ...clean].slice(0, previewLimit);
  }, [rows, rowErrors, previewLimit]);

  if (!isOpen) return null;

  const errorCount = Object.keys(rowErrors).length;
  const validCount = rows.length - errorCount;

  // progress is optional: pages that don't pass it get an indeterminate bar
  const hasProgress = progress != null;
  const percent = progress?.percent ?? 0;
  const done = Boolean(progress?.done);
  const total = progress?.total ?? rows.length;
  const shownRows = Math.min(total, Math.round((percent / 100) * total));

  const summary = progress?.summary;

  const doneText = summary
    ? `${summary.createdCount} ${entityName}${
        summary.createdCount !== 1 ? "s" : ""
      } imported${
        summary.failedCount
          ? ` · ${summary.failedCount} row${
              summary.failedCount !== 1 ? "s" : ""
            } skipped`
          : ""
      }`
    : "";

  return createPortal(
    <div className="ip-overlay" onClick={() => !loading && onCancel()}>
      <div className="ip-modal" onClick={(e) => e.stopPropagation()}>
        {loading && (
          <div
            className={`ip-loading ${done ? "ip-loading-done" : ""}`}
            role="status"
            aria-live="polite"
          >
            {done ? <SuccessCheck /> : <UploadingAnimation />}

            <h3>
              {done ? "Upload complete" : `Uploading your ${entityName}s`}
            </h3>

            <p key={getMessage(percent, done)} className="ip-loading-message">
              {getMessage(percent, done)}
            </p>

            <div
              className="ip-progress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={hasProgress ? percent : undefined}
            >
              <span
                className={`ip-progress-fill ${
                  hasProgress ? "" : "is-indeterminate"
                }`}
                style={hasProgress ? { width: `${percent}%` } : undefined}
              />
            </div>

            {hasProgress ? (
              <div className="ip-progress-meta">
                <strong>{percent}%</strong>

                <small>
                  {done ? doneText : `${shownRows} / ${total} rows`}
                </small>
              </div>
            ) : (
              <small>Please don't close this window.</small>
            )}
          </div>
        )}

        <div className="ip-header">
          <div>
            <h3>Confirm import</h3>
            <p>
              {fileName} — {rows.length} row{rows.length !== 1 ? "s" : ""}
            </p>
          </div>

          <button type="button" onClick={onCancel} disabled={loading}>
            <X size={18} />
          </button>
        </div>

        <div className="ip-summary">
          <span className="ip-ok">
            <CheckCircle2 size={14} /> {validCount} valid
          </span>

          {errorCount > 0 && (
            <span className="ip-bad">
              <AlertTriangle size={14} /> {errorCount} with errors
            </span>
          )}
        </div>

        <div className="ip-table-wrap">
          <table className="ip-table">
            <thead>
              <tr>
                <th>#</th>
                {columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
                <th>Issues</th>
              </tr>
            </thead>

            <tbody>
              {previewIndexes.map((i) => {
                const row = rows[i];
                const errs = rowErrors[i];

                return (
                  <tr key={i} className={errs ? "ip-row-error" : ""}>
                    <td>{i + 2}</td>

                    {columns.map((c) => (
                      <td key={c}>{row[c]}</td>
                    ))}

                    <td className="ip-issues">
                      {errs ? errs.join("; ") : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {rows.length > previewLimit && (
          <div className="ip-more">
            Showing {previewLimit} of {rows.length} rows (rows with issues are
            listed first)
          </div>
        )}

        <div className="ip-footer">
          <button
            type="button"
            className="ip-cancel"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>

          <button
            type="button"
            className="so-primary-button"
            onClick={onConfirm}
            disabled={loading || rows.length === 0 || errorCount > 0}
          >
            {`Import ${validCount} ${entityName}${validCount !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default ImportPreviewModal;
