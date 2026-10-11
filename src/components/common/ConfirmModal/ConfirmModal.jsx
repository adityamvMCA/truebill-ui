import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Info,
  LoaderCircle,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef } from "react";

import "./ConfirmModal.css";

const MODAL_TYPES = {
  danger: {
    icon: AlertTriangle,
    iconClassName: "confirm-modal__icon--danger",
    confirmText: "Delete",
  },

  warning: {
    icon: AlertCircle,
    iconClassName: "confirm-modal__icon--warning",
    confirmText: "Continue",
  },

  success: {
    icon: CheckCircle2,
    iconClassName: "confirm-modal__icon--success",
    confirmText: "Confirm",
  },

  info: {
    icon: Info,
    iconClassName: "confirm-modal__icon--info",
    confirmText: "Confirm",
  },

  question: {
    icon: HelpCircle,
    iconClassName: "confirm-modal__icon--question",
    confirmText: "Yes, Continue",
  },
};

function ConfirmModal({
  open,
  title = "Are you sure?",
  message = "",
  type = "question",
  confirmText,
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  loading = false,
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
  icon: CustomIcon,
  children,
}) {
  const cancelButtonRef = useRef(null);

  const modalType = MODAL_TYPES[type] || MODAL_TYPES.question;

  const Icon = CustomIcon || modalType.icon;

  const resolvedConfirmText = confirmText || modalType.confirmText;

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && closeOnEscape && !loading) {
        onCancel?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    const timeoutId = window.setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 0);

    return () => {
      document.body.style.overflow = previousOverflow;

      window.removeEventListener("keydown", handleKeyDown);

      window.clearTimeout(timeoutId);
    };
  }, [closeOnEscape, loading, onCancel, open]);

  if (!open) {
    return null;
  }

  const handleBackdropClick = (event) => {
    if (event.target !== event.currentTarget || !closeOnBackdrop || loading) {
      return;
    }

    onCancel?.();
  };

  const handleCancel = () => {
    if (loading) {
      return;
    }

    onCancel?.();
  };

  const handleConfirm = () => {
    if (loading) {
      return;
    }

    onConfirm?.();
  };

  return (
    <div
      className="confirm-modal"
      role="presentation"
      onMouseDown={handleBackdropClick}
    >
      <div
        className="confirm-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-description"
      >
        {showCloseButton && (
          <button
            type="button"
            className="confirm-modal__close"
            aria-label="Close confirmation dialog"
            onClick={handleCancel}
            disabled={loading}
          >
            <X size={20} />
          </button>
        )}

        <div
          className={`confirm-modal__icon ${modalType.iconClassName}`}
          aria-hidden="true"
        >
          <Icon size={28} strokeWidth={2} />
        </div>

        <div className="confirm-modal__content">
          <h2 id="confirm-modal-title" className="confirm-modal__title">
            {title}
          </h2>

          {message && (
            <p
              id="confirm-modal-description"
              className="confirm-modal__message"
            >
              {message}
            </p>
          )}

          {children && <div className="confirm-modal__extra">{children}</div>}
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
            className={`confirm-modal__button confirm-modal__button--confirm confirm-modal__button--${type}`}
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <LoaderCircle size={17} className="confirm-modal__spinner" />

                <span>Please wait...</span>
              </>
            ) : (
              <>
                {type === "danger" && <Trash2 size={17} />}

                <span>{resolvedConfirmText}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;

{
  /**
    Delete confirmation

    <ConfirmModal
  open={showDeleteConfirm}
  type="danger"
  title="Delete product?"
  message="This action permanently removes the product and cannot be undone."
  confirmText="Delete Product"
  onCancel={() => setShowDeleteConfirm(false)}
  onConfirm={handleDelete}
/>

    Warning confirmation

    <ConfirmModal
  open={showDeactivateConfirm}
  type="warning"
  title="Deactivate product?"
  message="The product will no longer be available for new transactions."
  confirmText="Deactivate"
  onCancel={() => setShowDeactivateConfirm(false)}
  onConfirm={handleDeactivate}
/>

Status change confirmation

<ConfirmModal
  open={showStatusConfirm}
  type="question"
  title="Activate selected products?"
  message="The selected products will be available for use immediately."
  confirmText="Activate"
  onCancel={() => setShowStatusConfirm(false)}
  onConfirm={handleBulkActivate}
/>

Success/information acknowledgement

<ConfirmModal
  open={showInfoModal}
  type="success"
  title="Products imported"
  message="Your product CSV file has been imported successfully."
  confirmText="Done"
  cancelText="Close"
  onCancel={() => setShowInfoModal(false)}
  onConfirm={() => setShowInfoModal(false)}
/>
    */
}
