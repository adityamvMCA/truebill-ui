import {
  useEffect,
  useId,
  useRef,
} from "react";

import { createPortal } from "react-dom";
import { X } from "lucide-react";

import "./section-modal.css";

const SectionModal = ({
  show = false,
  onClose,

  title,
  subtitle,
  icon: HeaderIcon,

  sections = [],
  activeSection,
  onSectionChange,

  children,

  onSave,
  onSecondary,

  saveText = "Save",
  secondaryText = "Save Draft",

  showSecondary = false,

  saveLoading = false,
  saving = false,
  saveDisabled = false,

  showFooter = true,

  className = "",
}) => {
  const titleId = useId();
  const subtitleId = useId();

  const closeButtonRef = useRef(null);

  const busy = saveLoading || saving;

  const interactionRef = useRef({
    busy,
    onClose,
  });

  useEffect(() => {
    interactionRef.current = {
      busy,
      onClose,
    };
  }, [busy, onClose]);

  useEffect(() => {
    if (
      !show ||
      typeof document === "undefined"
    ) {
      return undefined;
    }

    const previousOverflow =
      document.body.style.overflow;

    const previousFocus =
      document.activeElement;

    document.body.style.overflow =
      "hidden";

    const handleEscape = (event) => {
      if (
        event.key !== "Escape" ||
        event.defaultPrevented
      ) {
        return;
      }

      if (
        document.querySelector(".confirm-modal")
      ) {
        return;
      }

      if (!interactionRef.current.busy) {
        event.preventDefault();
        interactionRef.current.onClose?.();
      }
    };

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    const timer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(timer);

      document.removeEventListener(
        "keydown",
        handleEscape,
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
  }, [show]);

  if (
    !show ||
    typeof document === "undefined"
  ) {
    return null;
  }

  const handleClose = () => {
    if (!busy) {
      onClose?.();
    }
  };

  const handleOverlayClick = (event) => {
    if (
      event.target === event.currentTarget
    ) {
      handleClose();
    }
  };

  const changeSection = (section) => {
    if (!busy && !section.disabled) {
      onSectionChange?.(section.id);
    }
  };

  const renderSectionButtons = (
    mobile = false,
  ) =>
    sections.map((section) => {
      const Icon = section.icon;

      const isActive =
        activeSection === section.id;

      return (
        <button
          key={section.id}
          type="button"
          className={
            mobile
              ? [
                  "section-modal-mobile-item",
                  isActive
                    ? "section-modal-mobile-active"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")
              : [
                  "section-modal-menu-item",
                  isActive
                    ? "section-modal-menu-active"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")
          }
          aria-current={
            isActive ? "step" : undefined
          }
          disabled={
            busy || section.disabled
          }
          onClick={() =>
            changeSection(section)
          }
        >
          {Icon && (
            <span className="section-modal-menu-icon">
              <Icon
                size={mobile ? 15 : 17}
                strokeWidth={2}
                aria-hidden="true"
              />
            </span>
          )}

          <span className="section-modal-menu-content">
            <span className="section-modal-menu-label">
              {section.label}
            </span>

            {!mobile &&
              section.description && (
                <span className="section-modal-menu-description">
                  {section.description}
                </span>
              )}
          </span>
        </button>
      );
    });

  return createPortal(
    <div
      className="section-modal-overlay"
      onMouseDown={handleOverlayClick}
    >
      <div
        className={`section-modal ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={
          subtitle ? subtitleId : undefined
        }
        aria-busy={busy}
      >
        <div className="section-modal-header">
          <div className="section-modal-title-wrapper">
            {HeaderIcon && (
              <div className="section-modal-title-icon">
                <HeaderIcon
                  size={19}
                  strokeWidth={2}
                  aria-hidden="true"
                />
              </div>
            )}

            <div className="section-modal-title-copy">
              <h2 id={titleId}>
                {title}
              </h2>

              {subtitle && (
                <p id={subtitleId}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            className="section-modal-close"
            onClick={handleClose}
            disabled={busy}
            aria-label="Close"
          >
            <X
              size={19}
              aria-hidden="true"
            />
          </button>
        </div>

        <div className="section-modal-body">
          {sections.length > 0 && (
            <aside className="section-modal-sidebar">
              <div className="section-modal-sidebar-title">
                Sections
              </div>

              <nav
                className="section-modal-menu"
                aria-label="Form sections"
              >
                {renderSectionButtons()}
              </nav>
            </aside>
          )}

          <div className="section-modal-content">
            {sections.length > 0 && (
              <nav
                className="section-modal-mobile-nav"
                aria-label="Form sections"
              >
                {renderSectionButtons(true)}
              </nav>
            )}

            <div className="section-modal-form">
              {children}
            </div>
          </div>
        </div>

        {showFooter && (
          <div className="section-modal-footer">
            <button
              type="button"
              className="section-modal-cancel"
              onClick={handleClose}
              disabled={busy}
            >
              {typeof onSave === "function"
                ? "Cancel"
                : "Close"}
            </button>

            <div className="section-modal-footer-right">
              {showSecondary &&
                typeof onSecondary === "function" && (
                  <button
                    type="button"
                    className="section-modal-secondary"
                    onClick={onSecondary}
                    disabled={
                      busy || saveDisabled
                    }
                  >
                    {secondaryText}
                  </button>
                )}

              {typeof onSave === "function" && (
                <button
                  type="button"
                  className="section-modal-primary"
                  onClick={onSave}
                  disabled={
                    busy || saveDisabled
                  }
                >
                  {busy && (
                    <span
                      className="section-modal-spinner"
                      aria-hidden="true"
                    />
                  )}

                  <span>
                    {busy
                      ? "Saving..."
                      : saveText}
                  </span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default SectionModal;