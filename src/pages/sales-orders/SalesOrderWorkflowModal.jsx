import { useEffect, useId, useRef } from "react";

import {
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  PackageCheck,
  ShieldCheck,
  Truck,
  X,
  XCircle,
} from "lucide-react";

import "./sales-order-workflow.css";

const STEPS = [
  {
    key: "DRAFT",
    label: "Created",
    dateField: "createdAt",
    Icon: FileText,
  },
  {
    key: "CONFIRMED",
    label: "Confirmed",
    dateField: "confirmedAt",
    Icon: ShieldCheck,
  },
  {
    key: "IN_PROGRESS",
    label: "Processing",
    dateField: "startedAt",
    Icon: Truck,
  },
  {
    key: "COMPLETED",
    label: "Completed",
    dateField: "completedAt",
    Icon: PackageCheck,
  },
];

const STATUS_CONFIG = {
  DRAFT: {
    label: "Draft",
    title: "Waiting for confirmation",
    description:
      "The order is saved. An authorized user can confirm it.",
    next: "Confirm order",
    theme: "draft",
  },

  CONFIRMED: {
    label: "Confirmed",
    title: "Confirmed and ready",
    description:
      "Confirmation is complete. Processing has not started yet.",
    next: "Start processing",
    theme: "confirmed",
  },

  IN_PROGRESS: {
    label: "In Progress",
    title: "Order is being processed",
    description:
      "Processing has started. Completion is the next step.",
    next: "Mark as completed",
    theme: "processing",
  },

  COMPLETED: {
    label: "Completed",
    title: "Workflow completed",
    description:
      "The order was manually marked as completed.",
    next: "No pending action",
    theme: "completed",
  },

  CANCELLED: {
    label: "Cancelled",
    title: "Order cancelled",
    description:
      "The workflow has stopped for this order.",
    next: "No pending action",
    theme: "cancelled",
  },
};

const formatDateTime = (value) => {
  if (!value) {
    return "Time not recorded";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Time not recorded";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function WorkflowIllustration({ status }) {
  if (status === "DRAFT") {
    return (
      <div className="sow-scene sow-document-scene" aria-hidden="true">
        <div className="sow-document-shadow" />

        <div className="sow-moving-document">
          <FileText size={44} strokeWidth={1.6} />

          <span className="sow-document-clock">
            <Clock3 size={15} />
          </span>
        </div>
      </div>
    );
  }

  if (
    status === "CONFIRMED" ||
    status === "IN_PROGRESS"
  ) {
    return (
      <div className="sow-scene sow-truck-scene" aria-hidden="true">
        <div className="sow-truck-travel">
          <div className="sow-truck-bounce">
            <Truck size={52} strokeWidth={1.6} />
          </div>
        </div>

        <div className="sow-road">
          <div className="sow-road-marks" />
        </div>
      </div>
    );
  }

  return (
    <div className="sow-scene" aria-hidden="true">
      <div className="sow-result-icon">
        {status === "COMPLETED" ? (
          <CheckCircle2 size={48} strokeWidth={1.6} />
        ) : status === "CANCELLED" ? (
          <XCircle size={48} strokeWidth={1.6} />
        ) : (
          <Clock3 size={44} strokeWidth={1.6} />
        )}
      </div>
    </div>
  );
}

function SalesOrderWorkflowModal({
  order,
  onClose,
}) {
  const closeRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!order) {
      return undefined;
    }

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }

      // Close is the only interactive control in this dialog.
      if (event.key === "Tab") {
        event.preventDefault();
        closeRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;

      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );

      if (previousFocus?.isConnected) {
        previousFocus.focus?.();
      }
    };
  }, [order, onClose]);

  if (!order) {
    return null;
  }

  const config = STATUS_CONFIG[order.status] || {
    label: order.status || "Unknown",
    title: "Workflow status unavailable",
    description: "Refresh the list to get the latest order.",
    next: "Review order",
    theme: "draft",
  };

  const cancelled = order.status === "CANCELLED";

  const statusIndex = STEPS.findIndex(
    (step) => step.key === order.status,
  );

  const reachedIndex = cancelled
    ? STEPS.reduce(
        (latest, step, index) =>
          order[step.dateField] ? index : latest,
        -1,
      )
    : statusIndex;

  return (
    <div
      className="sow-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className={`sow-modal sow-theme-${config.theme}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <header className="sow-header">
          <div className="sow-header-copy">
            <h2 id={titleId}>Order Workflow</h2>

            <p>
              <strong>{order.orderNumber}</strong>
              <span aria-hidden="true">•</span>
              {order.customerName}
            </p>
          </div>

          <button
            ref={closeRef}
            type="button"
            className="sow-close"
            aria-label="Close workflow"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </header>

        <div className="sow-body">
          <div className="sow-hero">
            <WorkflowIllustration status={order.status} />

            <span className="sow-status-pill">
              <span className="sow-status-dot" />
              {config.label}
            </span>

            <h3>{config.title}</h3>

            <p id={descriptionId}>
              {config.description}
            </p>
          </div>

          <ol className="sow-steps" aria-label="Order milestones">
            {STEPS.map((step, index) => {
              const reached = index <= reachedIndex;

              const current =
                !cancelled &&
                index === statusIndex;

              const pending =
                !cancelled &&
                statusIndex >= 0 &&
                index === statusIndex + 1;

              const state = reached
                ? "done"
                : pending
                  ? "pending"
                  : "future";

              const StepIcon = step.Icon;

              const stepLabel = reached
                ? current
                  ? "Current"
                  : "Done"
                : cancelled
                  ? "Not reached"
                  : pending
                    ? "Pending next"
                    : "Upcoming";

              return (
                <li
                  key={step.key}
                  className={`sow-step is-${state} ${
                    current ? "is-current" : ""
                  }`}
                  aria-current={current ? "step" : undefined}
                >
                  <div className="sow-step-icon" aria-hidden="true">
                    {reached ? (
                      <Check size={17} strokeWidth={2.5} />
                    ) : (
                      <StepIcon size={17} />
                    )}
                  </div>

                  <div className="sow-step-copy">
                    <div className="sow-step-title">
                      <strong>{step.label}</strong>

                      <span className="sow-step-state">
                        {stepLabel}
                      </span>
                    </div>

                    <small>
                      {reached
                        ? formatDateTime(order[step.dateField])
                        : cancelled
                          ? "Workflow stopped"
                          : pending
                            ? "Waiting for the next action"
                            : "After the previous step"}
                    </small>
                  </div>
                </li>
              );
            })}
          </ol>

          {cancelled && (
            <div className="sow-cancel-note">
              <XCircle size={17} />

              <div>
                <strong>
                  Cancelled · {formatDateTime(order.cancelledAt)}
                </strong>

                {order.cancellationReason && (
                  <p>{order.cancellationReason}</p>
                )}
              </div>
            </div>
          )}

          <div className="sow-next">
            <span>Next action</span>
            <strong>{config.next}</strong>
          </div>

          <p className="sow-footnote">
            Workflow only—not live delivery or payment tracking.
          </p>
        </div>
      </section>
    </div>
  );
}

export default SalesOrderWorkflowModal;