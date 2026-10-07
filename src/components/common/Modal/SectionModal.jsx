import { useEffect } from "react";
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

  showFooter = true,

  className = "",
}) => {
  useEffect(() => {
    if (!show) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    document.addEventListener("keydown", handleEscape);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [show, onClose]);

  if (!show) return null;

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  };

  return createPortal(
    <div
      className="section-modal-overlay"
      onMouseDown={handleOverlayClick}
    >
      <div
        className={`section-modal ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="section-modal-title"
      >
        {/* =========================
            HEADER
        ========================= */}
        <div className="section-modal-header">
          <div className="section-modal-title-wrapper">
            {HeaderIcon && (
              <div className="section-modal-title-icon">
                <HeaderIcon size={19} strokeWidth={2} />
              </div>
            )}

            <div>
              <h2 id="section-modal-title">
                {title}
              </h2>

              {subtitle && (
                <p>{subtitle}</p>
              )}
            </div>
          </div>

          <button
            type="button"
            className="section-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={19} />
          </button>
        </div>

        {/* =========================
            BODY
        ========================= */}
        <div className="section-modal-body">

          {/* Desktop Sidebar */}
          {sections.length > 0 && (
            <aside className="section-modal-sidebar">

              <div className="section-modal-sidebar-title">
                Sections
              </div>

              <nav className="section-modal-menu">
                {sections.map((section) => {
                  const Icon = section.icon;

                  const isActive =
                    activeSection === section.id;

                  return (
                    <button
                      key={section.id}
                      type="button"
                      className={`section-modal-menu-item ${
                        isActive
                          ? "section-modal-menu-active"
                          : ""
                      }`}
                      onClick={() =>
                        onSectionChange?.(section.id)
                      }
                    >
                      {Icon && (
                        <span className="section-modal-menu-icon">
                          <Icon
                            size={17}
                            strokeWidth={2}
                          />
                        </span>
                      )}

                      <span className="section-modal-menu-content">
                        <span className="section-modal-menu-label">
                          {section.label}
                        </span>

                        {section.description && (
                          <span className="section-modal-menu-description">
                            {section.description}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </aside>
          )}

          {/* Main Content */}
          <main className="section-modal-content">

            {/* Mobile Section Navigation */}
            {sections.length > 0 && (
              <div className="section-modal-mobile-nav">
                {sections.map((section) => {
                  const Icon = section.icon;

                  const isActive =
                    activeSection === section.id;

                  return (
                    <button
                      key={section.id}
                      type="button"
                      className={`section-modal-mobile-item ${
                        isActive
                          ? "section-modal-mobile-active"
                          : ""
                      }`}
                      onClick={() =>
                        onSectionChange?.(section.id)
                      }
                    >
                      {Icon && (
                        <Icon
                          size={15}
                          strokeWidth={2}
                        />
                      )}

                      <span>
                        {section.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="section-modal-form">
              {children}
            </div>
          </main>
        </div>

        {/* =========================
            FOOTER
        ========================= */}
        {showFooter && (
          <div className="section-modal-footer">

            <button
              type="button"
              className="section-modal-cancel"
              onClick={onClose}
              disabled={saveLoading}
            >
              Cancel
            </button>

            <div className="section-modal-footer-right">

              {showSecondary && (
                <button
                  type="button"
                  className="section-modal-secondary"
                  onClick={onSecondary}
                  disabled={saveLoading}
                >
                  {secondaryText}
                </button>
              )}

              <button
                type="button"
                className="section-modal-primary"
                onClick={onSave}
                disabled={saveLoading}
              >
                {saveLoading && (
                  <span className="section-modal-spinner" />
                )}

                {saveLoading
                  ? "Saving..."
                  : saveText}
              </button>

            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default SectionModal;