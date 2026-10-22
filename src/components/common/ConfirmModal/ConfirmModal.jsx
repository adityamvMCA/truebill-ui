import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  HelpCircle,
  Info,
  LoaderCircle,
  Power,
  PowerOff,
  Trash2,
  X,
} from "lucide-react";

import {
  useEffect,
  useId,
  useRef,
} from "react";

import { createPortal } from "react-dom";

import "./ConfirmModal.css";

const MODAL_TYPES = {
  danger: {
    icon: Trash2,
    buttonIcon: Trash2,
    confirmText: "Delete",
  },

  warning: {
    icon: AlertCircle,
    buttonIcon: ArrowRight,
    confirmText: "Continue",
  },

  success: {
    icon: CheckCircle2,
    buttonIcon: Check,
    confirmText: "Confirm",
  },

  info: {
    icon: Info,
    buttonIcon: ArrowRight,
    confirmText: "Continue",
  },

  question: {
    icon: HelpCircle,
    buttonIcon: Check,
    confirmText: "Confirm",
  },
};

const MODAL_ACTIONS = {
  delete: {
    type: "danger",
    icon: Trash2,
    buttonIcon: Trash2,
    confirmText: "Delete",
  },

  deactivate: {
    type: "warning",
    icon: PowerOff,
    buttonIcon: PowerOff,
    confirmText: "Deactivate",
  },

  activate: {
    type: "success",
    icon: Power,
    buttonIcon: Power,
    confirmText: "Activate",
  },
};

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function ConfirmModal({
  open,
  title = "Are you sure?",
  message = "",
  type = "question",
  action,
  confirmText,
  cancelText = "Cancel",
  loadingText = "Please wait...",
  onConfirm,
  onCancel,
  loading = false,
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
  icon: CustomIcon,
  confirmIcon: CustomConfirmIcon,
  children,
}) {
  const dialogRef = useRef(null);
  const cancelButtonRef = useRef(null);

  const interactionRef = useRef({
    loading,
    closeOnEscape,
    onCancel,
  });

  const titleId = useId();
  const descriptionId = useId();

  const actionConfig =
    MODAL_ACTIONS[action];

  const resolvedType =
    actionConfig?.type ||
    (
      MODAL_TYPES[type]
        ? type
        : "question"
    );

  const modalType =
    MODAL_TYPES[resolvedType];

  const Icon =
    CustomIcon ||
    actionConfig?.icon ||
    modalType.icon;

  const ConfirmIcon =
    CustomConfirmIcon ||
    actionConfig?.buttonIcon ||
    modalType.buttonIcon;

  const resolvedConfirmText =
    confirmText ||
    actionConfig?.confirmText ||
    modalType.confirmText;

  useEffect(() => {
    interactionRef.current = {
      loading,
      closeOnEscape,
      onCancel,
    };
  }, [
    loading,
    closeOnEscape,
    onCancel,
  ]);

  useEffect(() => {
    if (
      !open ||
      typeof document === "undefined"
    ) {
      return undefined;
    }

    const previousFocus =
      document.activeElement;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    const focusTimer =
      window.setTimeout(() => {
        const target =
          cancelButtonRef.current?.disabled
            ? dialogRef.current
            : cancelButtonRef.current;

        target?.focus();
      }, 0);

    const handleKeyDown = (event) => {
      const {
        loading: isLoading,
        closeOnEscape: canEscape,
        onCancel: cancel,
      } = interactionRef.current;

      if (event.key === "Escape") {
        if (canEscape && !isLoading) {
          event.preventDefault();
          event.stopPropagation();
          cancel?.();
        }

        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const dialog =
        dialogRef.current;

      if (!dialog) {
        return;
      }

      const focusable = Array.from(
        dialog.querySelectorAll(
          FOCUSABLE_SELECTOR,
        ),
      ).filter(
        (element) =>
          element.getClientRects().length > 0 &&
          !element.closest("[inert]"),
      );

      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last =
        focusable[focusable.length - 1];

      const active =
        document.activeElement;

      if (
        !dialog.contains(active) ||
        active === dialog
      ) {
        event.preventDefault();

        if (event.shiftKey) {
          last.focus();
        } else {
          first.focus();
        }

        return;
      }

      if (
        event.shiftKey &&
        active === first
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        active === last
      ) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown,
      true,
    );

    return () => {
      window.clearTimeout(focusTimer);

      document.removeEventListener(
        "keydown",
        handleKeyDown,
        true,
      );

      document.body.style.overflow =
        previousOverflow;

      if (
        previousFocus instanceof HTMLElement &&
        previousFocus.isConnected
      ) {
        previousFocus.focus();
      }
    };
  }, [open]);

  if (
    !open ||
    typeof document === "undefined"
  ) {
    return null;
  }

  const handleCancel = () => {
    if (!loading) {
      onCancel?.();
    }
  };

  const handleConfirm = () => {
    if (!loading) {
      onConfirm?.();
    }
  };

  const handleBackdropClick = (event) => {
    if (
      event.target === event.currentTarget &&
      closeOnBackdrop &&
      !loading
    ) {
      onCancel?.();
    }
  };

  return createPortal(
    <div
      className="confirm-modal"
      role="presentation"
      onMouseDown={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        className={[
          "confirm-modal__dialog",
          `confirm-modal__dialog--${resolvedType}`,
          loading ? "is-loading" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={
          message
            ? descriptionId
            : undefined
        }
        aria-busy={loading}
        tabIndex={-1}
      >
        {showCloseButton && (
          <button
            type="button"
            className="confirm-modal__close"
            aria-label="Close confirmation dialog"
            onClick={handleCancel}
            disabled={loading}
          >
            <X
              size={19}
              aria-hidden="true"
            />
          </button>
        )}

        <div
          className={[
            "confirm-modal__icon",
            `confirm-modal__icon--${resolvedType}`,
          ].join(" ")}
          aria-hidden="true"
        >
          <Icon
            size={25}
            strokeWidth={1.9}
          />
        </div>

        <div className="confirm-modal__content">
          <h2
            id={titleId}
            className="confirm-modal__title"
          >
            {title}
          </h2>

          {message && (
            <p
              id={descriptionId}
              className="confirm-modal__message"
            >
              {message}
            </p>
          )}

          {children && (
            <div className="confirm-modal__extra">
              {children}
            </div>
          )}
        </div>

        <div className="confirm-modal__actions">
          <button
            ref={cancelButtonRef}
            type="button"
            className="confirm-modal__button confirm-modal__button--cancel"
            onClick={handleCancel}
            disabled={loading}
          >
            {cancelText}
          </button>

          <button
            type="button"
            className={[
              "confirm-modal__button",
              "confirm-modal__button--confirm",
              `confirm-modal__button--${resolvedType}`,
            ].join(" ")}
            onClick={handleConfirm}
            disabled={
              loading ||
              typeof onConfirm !== "function"
            }
          >
            {loading ? (
              <LoaderCircle
                size={17}
                className="confirm-modal__spinner"
                aria-hidden="true"
              />
            ) : (
              <ConfirmIcon
                size={17}
                aria-hidden="true"
              />
            )}

            <span>
              {loading
                ? loadingText
                : resolvedConfirmText}
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default ConfirmModal;