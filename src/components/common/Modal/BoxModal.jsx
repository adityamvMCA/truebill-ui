import {
  useEffect,
  useRef,
} from "react";

import {
  X,
} from "lucide-react";
import "./box-modal.css";
const BoxModal = ({
  show = false,
  onClose,

  title = "",
  subtitle = "",

  icon: Icon,

  children,

  footer,

  width = "1120px",

  closeOnOverlay = true,
  closeOnEsc = true,

  showClose = true,

  className = "",
  contentClassName = "",

  bodyScrollable = true,

  zIndex = 99999,
}) => {
  const modalRef = useRef(null);

  /* =====================================================
     ESC CLOSE
  ===================================================== */

  useEffect(() => {
    if (!show || !closeOnEsc) {
      return;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    show,
    closeOnEsc,
    onClose,
  ]);

  /* =====================================================
     BODY SCROLL LOCK
  ===================================================== */

  useEffect(() => {
    if (!show) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [show]);

  /* =====================================================
     OVERLAY CLICK
  ===================================================== */

  const handleOverlayClick = (
    event
  ) => {
    if (
      !closeOnOverlay ||
      event.target !== event.currentTarget
    ) {
      return;
    }

    onClose?.();
  };

  /* =====================================================
     DON'T RENDER
  ===================================================== */

  if (!show) {
    return null;
  }

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div
      className="box-modal-overlay"
      style={{
        zIndex,
      }}
      onMouseDown={
        handleOverlayClick
      }
    >
      <div
        ref={modalRef}
        className={`box-modal ${className}`}
        style={{
          "--box-modal-width": width,
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={
          title
            ? "box-modal-title"
            : undefined
        }
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="box-modal-header">
          <div className="box-modal-title-wrapper">

            {Icon && (
              <div className="box-modal-title-icon">
                <Icon size={20} />
              </div>
            )}

            <div className="box-modal-title-content">

              {title && (
                <h2 id="box-modal-title">
                  {title}
                </h2>
              )}

              {subtitle && (
                <span>
                  {subtitle}
                </span>
              )}

            </div>

          </div>

          {showClose && (
            <button
              type="button"
              className="box-modal-close"
              onClick={onClose}
              aria-label="Close modal"
            >
              <X size={19} />
            </button>
          )}
        </div>

        {/* =================================================
            BODY
        ================================================= */}

        <div
          className={`box-modal-body ${
            bodyScrollable
              ? "box-modal-body-scroll"
              : ""
          } ${
            contentClassName
          }`}
        >
          {children}
        </div>

        {/* =================================================
            FOOTER
        ================================================= */}

        {footer && (
          <div className="box-modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default BoxModal;