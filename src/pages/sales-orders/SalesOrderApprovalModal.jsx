import {
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import {
  ShieldCheck,
  Check,
  LoaderCircle,
  X,
} from "lucide-react";

import "./sales-order-approval.css";

const formatMoney = (paise) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(Number(paise || 0) / 100);

function SalesOrderApprovalModal({
  order,
  loading,
  error,
  onClose,
  onApprove,
}) {
  const [remarks, setRemarks] = useState("");

  const dialogRef = useRef(null);
  const remarksRef = useRef(null);

  const titleId = useId();
  const remarksId = useId();
  const errorId = useId();

  useEffect(() => {
    if (!order) {
      return;
    }

    setRemarks("");
    remarksRef.current?.focus();
  }, [order?._id]);

  useEffect(() => {
    if (!order) {
      return undefined;
    }

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;

      if (previousFocus?.isConnected) {
        previousFocus.focus?.();
      }
    };
  }, [order?._id]);

  if (!order) {
    return null;
  }

  const trimmedRemarks = remarks.trim();

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      if (!loading) {
        onClose();
      }

      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const controls = Array.from(
      dialogRef.current?.querySelectorAll(
        'button:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
      ) || [],
    );

    if (!controls.length) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }

    const first = controls[0];
    const last = controls[controls.length - 1];

    if (
      event.shiftKey &&
      (document.activeElement === first ||
        !controls.includes(document.activeElement))
    ) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      (document.activeElement === last ||
        !controls.includes(document.activeElement))
    ) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="soa-overlay"
      onClick={(event) => {
        if (
          event.target === event.currentTarget &&
          !loading
        ) {
          onClose();
        }
      }}
    >
      <section
        ref={dialogRef}
        className="soa-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={loading}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <header className="soa-header">
          <div className="soa-heading">
            <span className="soa-icon">
              <ShieldCheck size={23} />
            </span>

            <div>
              <h2 id={titleId}>Approve Sales Order</h2>
              <p>Review the order and record your remarks.</p>
            </div>
          </div>

          <button
            type="button"
            className="soa-close"
            aria-label="Close approval"
            disabled={loading}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>

        <form
          className="soa-form"
          onSubmit={(event) => {
            event.preventDefault();

            if (!loading && trimmedRemarks) {
              void onApprove(trimmedRemarks);
            }
          }}
        >
          <div className="soa-body">
            <div className="soa-order">
              <div>
                <span>Sales Order</span>
                <strong>{order.orderNumber}</strong>
              </div>

              <div>
                <span>Customer</span>
                <strong>{order.customerName}</strong>
              </div>

              <div>
                <span>Total Amount</span>
                <strong>{formatMoney(order.totalAmountPaise)}</strong>
              </div>
            </div>

            <label className="soa-label" htmlFor={remarksId}>
              Approval remarks <span>*</span>
            </label>

            <textarea
              ref={remarksRef}
              id={remarksId}
              value={remarks}
              onChange={(event) =>
                setRemarks(event.target.value)
              }
              placeholder="Enter the reason or notes for approving this order..."
              maxLength={1000}
              rows={4}
              required
              readOnly={loading}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
            />

            <div className="soa-count">
              {remarks.length}/1000
            </div>

            {error && (
              <p id={errorId} className="soa-error" role="alert">
                {error}
              </p>
            )}

            <p className="soa-note">
              Approval changes the order to Confirmed and locks
              draft editing. It does not create an invoice or
              move stock.
            </p>
          </div>

          <footer className="soa-footer">
            <button
              type="button"
              className="soa-secondary"
              disabled={loading}
              onClick={onClose}
            >
              Back
            </button>

            <button
              type="submit"
              className="soa-approve"
              disabled={loading || !trimmedRemarks}
            >
              {loading ? (
                <LoaderCircle size={16} className="soa-spinner" />
              ) : (
                <Check size={16} />
              )}

              {loading ? "Approving..." : "Approve Order"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export default SalesOrderApprovalModal;