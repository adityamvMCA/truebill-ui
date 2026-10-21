import { useId, useLayoutEffect, useRef } from "react";

import { createPortal } from "react-dom";

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  FileText,
  Loader2,
  MapPin,
  ShoppingCart,
  X,
} from "lucide-react";

import {
  dateValue,
  formatDate,
  formatMoney,
} from "./quotationComparison.utils";

import "./CreatePurchaseOrderModal.css";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "input:not([disabled])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  "a[href]",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function CreatePurchaseOrderModal({
  isOpen,
  offer,
  supplierName = "",
  supplierCode = "",
  formData,
  onFieldChange,
  onSubmit,
  onClose,
  loading = false,
  error = "",
  uncertain = false,
  onCheckOrders,
}) {
  const titleId = useId();
  const descriptionId = useId();
  const errorId = useId();

  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);
  const loadingRef = useRef(loading);

  useLayoutEffect(() => {
    closeRef.current = onClose;
    loadingRef.current = loading;
  }, [onClose, loading]);

  useLayoutEffect(() => {
    if (!isOpen) return undefined;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const dialog = dialogRef.current;

    dialog?.focus();

    const getFocusableElements = () =>
      Array.from(dialog?.querySelectorAll(FOCUSABLE_SELECTOR) || []).filter(
        (element) =>
          element.getClientRects().length > 0 &&
          element.getAttribute("aria-hidden") !== "true",
      );

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();

        if (!loadingRef.current) {
          closeRef.current?.();
        }

        return;
      }

      if (event.key !== "Tab") return;

      const elements = getFocusableElements();

      if (!elements.length) {
        event.preventDefault();
        dialog?.focus();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      const active = document.activeElement;

      if (
        event.shiftKey &&
        (active === first || active === dialog || !dialog?.contains(active))
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (active === last || active === dialog || !dialog?.contains(active))
      ) {
        event.preventDefault();
        first.focus();
      }
    };

    const keepFocusInside = (event) => {
      if (dialog && !dialog.contains(event.target)) {
        dialog.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("focusin", keepFocusInside);

    return () => {
      document.body.style.overflow = previousOverflow;

      document.removeEventListener("keydown", handleKeyDown, true);

      document.removeEventListener("focusin", keepFocusInside);

      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [isOpen]);

  if (!isOpen || !offer || !formData || typeof document === "undefined") {
    return null;
  }

  const disabled = loading || uncertain;
  const displayName = supplierName || "Selected supplier";

  const changeField = (event) => {
    onFieldChange?.(event.target.name, event.target.value);
  };

  const handleClose = () => {
    if (!loading) {
      onClose?.();
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!disabled) {
      onSubmit?.();
    }
  };

  return createPortal(
    <div
      className="qcpo-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <section
        ref={dialogRef}
        className="qcpo-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-busy={loading}
        tabIndex={-1}
      >
        <header className="qcpo-header">
          <div className="qcpo-header-icon">
            <ShoppingCart size={21} />
          </div>

          <div className="qcpo-heading">
            <span className="qcpo-eyebrow">PURCHASE ORDER</span>

            <h2 id={titleId}>Create from quotation</h2>

            <p id={descriptionId}>
              Confirm the delivery details for this offer.
            </p>
          </div>

          <button
            type="button"
            className="qcpo-close"
            aria-label="Close Create Purchase Order"
            onClick={handleClose}
            disabled={loading}
          >
            <X size={20} />
          </button>
        </header>

        <form className="qcpo-form" onSubmit={handleSubmit}>
          <div className="qcpo-body">
            <div className="qcpo-offer">
              <div className="qcpo-supplier-avatar">
                {displayName.charAt(0).toUpperCase()}
              </div>

              <div className="qcpo-supplier">
                <strong>{displayName}</strong>

                <span>
                  {supplierCode ? `${supplierCode} · ` : ""}
                  {offer.quotationNumber}
                </span>

                {offer.validUntil && (
                  <small>Valid until {formatDate(offer.validUntil)}</small>
                )}
              </div>

              <div className="qcpo-offer-amount">
                <span>Quotation total</span>
                <strong>{formatMoney(offer.totalAmountPaise)}</strong>
              </div>
            </div>

            {error && (
              <div id={errorId} className="qcpo-error" role="alert">
                {error}
              </div>
            )}

            {uncertain && (
              <div className="qcpo-pending" role="status">
                Check Purchase Orders before attempting another creation.
              </div>
            )}

            <fieldset className="qcpo-fields" disabled={disabled}>
              <div className="qcpo-section-label">
                <CalendarDays size={16} />
                <span>Schedule</span>
              </div>

              <div className="qcpo-grid">
                <label className="qcpo-field">
                  <span>
                    Order date <em>*</em>
                  </span>

                  <input
                    type="date"
                    name="orderDate"
                    value={formData.orderDate || ""}
                    min={dateValue(offer.quotationDate)}
                    max={dateValue(offer.validUntil) || undefined}
                    onChange={changeField}
                    required
                  />
                </label>

                <label className="qcpo-field">
                  <span>
                    Expected delivery
                    <small>Optional</small>
                  </span>

                  <input
                    type="date"
                    name="expectedDeliveryDate"
                    value={formData.expectedDeliveryDate || ""}
                    min={formData.orderDate || undefined}
                    onChange={changeField}
                  />
                </label>
              </div>

              <div className="qcpo-section-label qcpo-section-label--spaced">
                <MapPin size={16} />
                <span>Delivery</span>
              </div>

              <label className="qcpo-field">
                <span>
                  Delivery address
                  <small>Optional</small>
                </span>

                <textarea
                  name="deliveryAddress"
                  value={formData.deliveryAddress || ""}
                  onChange={changeField}
                  rows={2}
                  maxLength={2000}
                  placeholder="Building, street, city, and delivery instructions"
                />
              </label>

              <label className="qcpo-field qcpo-notes-field">
                <span>
                  <span className="qcpo-label-icon">
                    <FileText size={14} />
                    Order notes
                  </span>

                  <small>Optional</small>
                </span>

                <textarea
                  name="notes"
                  value={formData.notes || ""}
                  onChange={changeField}
                  rows={2}
                  maxLength={2000}
                  placeholder="Add an internal note for this purchase order"
                />
              </label>
            </fieldset>

            <div className="qcpo-commercial-summary">
              <div>
                <span>Payment terms</span>
                <strong>{offer.paymentTerms || "Not specified"}</strong>
              </div>

              <div>
                <span>Delivery terms</span>
                <strong>{offer.deliveryTerms || "Not specified"}</strong>
              </div>
            </div>

            <div className="qcpo-information">
              <CheckCircle2 size={16} />

              <p>
                Items, prices, taxes, and commercial terms are copied from the
                selected quotation. No stock or payment is recorded here.
              </p>
            </div>
          </div>

          <footer className="qcpo-footer">
            <div className="qcpo-footer-total">
              <span>Order total</span>

              <strong>{formatMoney(offer.totalAmountPaise)}</strong>
            </div>

            <div className="qcpo-footer-actions">
              <button
                type="button"
                className="qcpo-button qcpo-button--secondary"
                onClick={handleClose}
                disabled={loading}
              >
                Cancel
              </button>

              {uncertain ? (
                <button
                  type="button"
                  className="qcpo-button qcpo-button--primary"
                  onClick={onCheckOrders}
                >
                  Check Orders
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  type="submit"
                  className="qcpo-button qcpo-button--primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 size={17} className="qcpo-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={17} />
                      Create Order
                    </>
                  )}
                </button>
              )}
            </div>
          </footer>
        </form>
      </section>
    </div>,
    document.body,
  );
}

export default CreatePurchaseOrderModal;
