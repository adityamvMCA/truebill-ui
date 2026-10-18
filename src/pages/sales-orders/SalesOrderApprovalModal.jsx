import {
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import {
  ShieldCheck,
  Play,
  CheckCircle2,
  Check,
  LoaderCircle,
  X,
} from "lucide-react";

import "./sales-order-approval.css";

const ACTION_CONFIG = {
  confirm: {
    title: "Approve Sales Order",
    subtitle:
      "Review the order and record your approval remarks.",

    remarksLabel: "Approval remarks",

    placeholder:
      "Enter the reason or notes for approving this order...",

    buttonText: "Approve Order",
    loadingText: "Approving...",

    HeaderIcon: ShieldCheck,
    ButtonIcon: Check,

    note:
      "Approval changes the order to Confirmed and locks draft editing. It does not create an invoice or move stock.",
  },

  start: {
    title: "Start Sales Order",
    subtitle:
      "Review the order and record your starting remarks.",

    remarksLabel: "Start remarks",

    placeholder:
      "Enter the work instructions or notes for starting this order...",

    buttonText: "Start Order",
    loadingText: "Starting...",

    HeaderIcon: Play,
    ButtonIcon: Play,

    note:
      "Starting changes the order to In Progress. This action does not create an invoice or move stock.",
  },

  complete: {
    title: "Complete Sales Order",
    subtitle:
      "Review the order and record your completion remarks.",

    remarksLabel: "Completion remarks",

    placeholder:
      "Enter the completion details or final notes for this order...",

    buttonText: "Complete Order",
    loadingText: "Completing...",

    HeaderIcon: CheckCircle2,
    ButtonIcon: Check,

    note:
      "Completion changes the order to Completed. This action does not create an invoice or move stock.",
  },
};

const moneyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatMoney = (paise) => {
  if (
    paise === null ||
    paise === undefined ||
    paise === ""
  ) {
    return "N/A";
  }

  const amount = Number(paise);

  return Number.isSafeInteger(amount)
    ? moneyFormatter.format(amount / 100)
    : "N/A";
};

function SalesOrderApprovalModal({
  order,
  action = "confirm",
  loading = false,
  error = "",
  onClose,
  onApprove,
}) {
  const [remarks, setRemarks] = useState("");

  const dialogRef = useRef(null);
  const remarksRef = useRef(null);
  const submitLockRef = useRef(false);

  const titleId = useId();
  const descriptionId = useId();
  const remarksId = useId();
  const errorId = useId();
  const countId = useId();

  const config = ACTION_CONFIG[action];

  useEffect(() => {
    if (!order) return;

    setRemarks("");
    submitLockRef.current = false;
  }, [order?._id, action]);

  useEffect(() => {
    if (!order) return undefined;

    const previousFocus =
      document.activeElement;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const timeoutId = window.setTimeout(() => {
      remarksRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);

      document.body.style.overflow =
        previousOverflow;

      if (previousFocus?.isConnected) {
        previousFocus.focus?.();
      }
    };
  }, [order?._id, action]);

  if (!order || !config) {
    return null;
  }

  const HeaderIcon = config.HeaderIcon;
  const ButtonIcon = config.ButtonIcon;

  const trimmedRemarks = remarks.trim();

  const closeModal = () => {
    if (
      loading ||
      submitLockRef.current
    ) {
      return;
    }

    onClose?.();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();

      closeModal();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const controls = Array.from(
      dialogRef.current?.querySelectorAll(
        [
          "button:not(:disabled)",
          "textarea:not(:disabled)",
          '[tabindex="0"]',
        ].join(", "),
      ) || [],
    ).filter(
      (element) =>
        element.getClientRects().length > 0,
    );

    if (!controls.length) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }

    const first = controls[0];
    const last =
      controls[controls.length - 1];

    const activeElement =
      document.activeElement;

    if (
      event.shiftKey &&
      (
        activeElement === first ||
        !controls.includes(activeElement)
      )
    ) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      (
        activeElement === last ||
        !controls.includes(activeElement)
      )
    ) {
      event.preventDefault();
      first.focus();
    }
  };

  const submit = async (event) => {
    event.preventDefault();

    if (
      loading ||
      submitLockRef.current ||
      !trimmedRemarks ||
      typeof onApprove !== "function"
    ) {
      return;
    }

    submitLockRef.current = true;

    try {
      await onApprove(trimmedRemarks);
    } catch {
      /*
       * The parent displays the request error through
       * the error prop and keeps this modal open.
       */
    } finally {
      submitLockRef.current = false;
    }
  };

  return (
    <div
      className="soa-overlay"
      onClick={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          closeModal();
        }
      }}
    >
      <section
        ref={dialogRef}
        className="soa-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-busy={loading}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <header className="soa-header">
          <div className="soa-heading">
            <span
              className="soa-icon"
              aria-hidden="true"
            >
              <HeaderIcon size={23} />
            </span>

            <div>
              <h2 id={titleId}>
                {config.title}
              </h2>

              <p id={descriptionId}>
                {config.subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="soa-close"
            aria-label="Close order action"
            disabled={loading}
            onClick={closeModal}
          >
            <X size={18} />
          </button>
        </header>

        <form
          className="soa-form"
          onSubmit={submit}
        >
          <div className="soa-body">
            <div className="soa-order">
              <div>
                <span>Sales Order</span>

                <strong>
                  {order.orderNumber}
                </strong>
              </div>

              <div>
                <span>Customer</span>

                <strong>
                  {order.customerName}
                </strong>
              </div>

              <div>
                <span>Total Amount</span>

                <strong>
                  {formatMoney(
                    order.totalAmountPaise,
                  )}
                </strong>
              </div>
            </div>

            <label
              className="soa-label"
              htmlFor={remarksId}
            >
              {config.remarksLabel}
              {" "}
              <span>*</span>
            </label>

            <textarea
              ref={remarksRef}
              id={remarksId}
              value={remarks}
              onChange={(event) =>
                setRemarks(
                  event.target.value,
                )
              }
              placeholder={
                config.placeholder
              }
              maxLength={1000}
              rows={4}
              required
              readOnly={loading}
              aria-invalid={
                error ? true : undefined
              }
              aria-describedby={[
                countId,
                error ? errorId : "",
              ]
                .filter(Boolean)
                .join(" ")}
            />

            <div
              id={countId}
              className="soa-count"
            >
              {remarks.length}/1000
            </div>

            {error && (
              <p
                id={errorId}
                className="soa-error"
                role="alert"
              >
                {error}
              </p>
            )}

            <p className="soa-note">
              {config.note}
            </p>
          </div>

          <footer className="soa-footer">
            <button
              type="button"
              className="soa-secondary"
              disabled={loading}
              onClick={closeModal}
            >
              Back
            </button>

            <button
              type="submit"
              className="soa-approve"
              disabled={
                loading ||
                !trimmedRemarks
              }
            >
              {loading ? (
                <LoaderCircle
                  size={16}
                  className="soa-spinner"
                  aria-hidden="true"
                />
              ) : (
                <ButtonIcon
                  size={16}
                  aria-hidden="true"
                />
              )}

              {loading
                ? config.loadingText
                : config.buttonText}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export default SalesOrderApprovalModal;