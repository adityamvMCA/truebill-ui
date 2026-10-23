import { useEffect, useId, useRef, useState } from "react";

import { createPortal } from "react-dom";

import { AlertCircle, CheckCircle2, LoaderCircle, X } from "lucide-react";

import "./WorkflowApprovalModal.css";

/*
 * Reusable approval / workflow-action dialog.
 *
 * <WorkflowApprovalModal
 *   open={Boolean(dialog)}
 *   theme="approve"            // approve | issue | close | danger
 *   icon={CheckCircle2}
 *   title="Approve RFQ"
 *   subtitle="RFQ003 • PR004"
 *   headline="Ready for approval"
 *   description="Approving locks the RFQ for editing."
 *   summary={[["Suppliers", 3], ["Item lines", 2]]}
 *   remarksLabel="Approval remarks"
 *   remarksRequired={false}
 *   confirmText="Approve"
 *   loading={loading}
 *   error={error}
 *   onClose={close}
 *   onSubmit={(remarks) => submit(remarks)}
 * />
 */

const FOCUSABLE = [
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "a[href]",
].join(",");

function ApprovalDialog({
  theme = "approve",
  icon: Icon = CheckCircle2,
  title,
  subtitle,
  headline,
  description,
  summary = [],
  remarksLabel = "Remarks",
  remarksPlaceholder = "Add a short note (optional)",
  remarksRequired = false,
  maxLength = 1000,
  confirmText = "Confirm",
  cancelText = "Back",
  loadingText = "Processing...",
  loading = false,
  error = "",
  onClose,
  onSubmit,
}) {
  const [remarks, setRemarks] = useState("");
  const [touched, setTouched] = useState(false);

  const dialogRef = useRef(null);
  const textareaRef = useRef(null);

  const latest = useRef({ loading, onClose });

  const titleId = useId();
  const descriptionId = useId();
  const remarksId = useId();

  useEffect(() => {
    latest.current = { loading, onClose };
  }, [loading, onClose]);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const timer = window.setTimeout(() => {
      (textareaRef.current || dialogRef.current)?.focus();
    }, 0);

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (!latest.current.loading) {
          event.preventDefault();
          event.stopPropagation();
          latest.current.onClose?.();
        }

        return;
      }

      if (event.key !== "Tab") return;

      const dialog = dialogRef.current;

      if (!dialog) return;

      const focusable = Array.from(dialog.querySelectorAll(FOCUSABLE)).filter(
        (element) => element.getClientRects().length > 0,
      );

      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (!dialog.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = previousOverflow;

      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      }
    };
  }, []);

  const trimmed = remarks.trim();
  const missing = remarksRequired && !trimmed;

  const submit = () => {
    if (loading) return;

    if (missing) {
      setTouched(true);
      textareaRef.current?.focus();
      return;
    }

    onSubmit?.(trimmed);
  };

  const rows = summary.filter(
    ([, value]) => value !== undefined && value !== null && value !== "",
  );

  return createPortal(
    <div
      className="wam-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) {
          onClose?.();
        }
      }}
    >
      <section
        ref={dialogRef}
        className={`wam-modal wam-theme-${theme}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        aria-busy={loading}
        tabIndex={-1}
      >
        <header className="wam-header">
          <div className="wam-header-copy">
            <h2 id={titleId}>{title}</h2>

            {subtitle && <p>{subtitle}</p>}
          </div>

          <button
            type="button"
            className="wam-close"
            aria-label="Close dialog"
            disabled={loading}
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </header>

        <div className="wam-body">
          <div className="wam-hero">
            <span className="wam-hero-icon" aria-hidden="true">
              <Icon size={30} strokeWidth={1.8} />
            </span>

            {headline && <h3>{headline}</h3>}

            {description && <p id={descriptionId}>{description}</p>}
          </div>

          {rows.length > 0 && (
            <dl className="wam-summary">
              {rows.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="wam-field">
            <label htmlFor={remarksId}>
              {remarksLabel}
              {remarksRequired && (
                <span className="wam-required" aria-hidden="true">
                  {" "}
                  *
                </span>
              )}
            </label>

            <textarea
              id={remarksId}
              ref={textareaRef}
              rows={4}
              value={remarks}
              maxLength={maxLength}
              disabled={loading}
              placeholder={remarksPlaceholder}
              aria-required={remarksRequired}
              aria-invalid={touched && missing}
              className={touched && missing ? "is-invalid" : ""}
              onChange={(event) => setRemarks(event.target.value)}
            />

            <div className="wam-field-meta">
              <span className="wam-field-error" role="status">
                {touched && missing ? `${remarksLabel} is required.` : ""}
              </span>

              <span>
                {remarks.length}/{maxLength}
              </span>
            </div>
          </div>

          {error && (
            <div className="wam-error" role="alert">
              <AlertCircle size={17} />
              <p>{error}</p>
            </div>
          )}
        </div>

        <footer className="wam-footer">
          <button
            type="button"
            className="wam-button wam-button-cancel"
            disabled={loading}
            onClick={onClose}
          >
            {cancelText}
          </button>

          <button
            type="button"
            className="wam-button wam-button-confirm"
            disabled={loading}
            onClick={submit}
          >
            {loading ? (
              <LoaderCircle
                size={17}
                className="wam-spinner"
                aria-hidden="true"
              />
            ) : (
              <Icon size={17} aria-hidden="true" />
            )}

            <span>{loading ? loadingText : confirmText}</span>
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

function WorkflowApprovalModal({ open, ...props }) {
  if (!open || typeof document === "undefined") {
    return null;
  }

  // Mounted fresh on every open, so remarks always start empty.
  return <ApprovalDialog {...props} />;
}

export default WorkflowApprovalModal;
