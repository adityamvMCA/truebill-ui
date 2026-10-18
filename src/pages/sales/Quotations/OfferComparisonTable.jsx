import { useMemo, useState } from "react";

import {
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
} from "lucide-react";

import StatusField from "../../../components/common/StatusField/StatusField";

import "./offer-comparison-table.css";

const moneyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const quantityFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 3,
});

const formatPaise = (value) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const amount = Number(value);

  return Number.isSafeInteger(amount)
    ? moneyFormatter.format(amount / 100)
    : "—";
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

const formatQuantity = (value) => {
  const quantity = Number(value);

  return Number.isFinite(quantity) ? quantityFormatter.format(quantity) : "—";
};

const TAX_LABELS = {
  NONE: "No GST",
  INTRA_STATE: "CGST + SGST",
  INTER_STATE: "IGST",
};

const normalizedText = (value) => String(value ?? "").trim();

/*
 * Match product + unit + specification.
 * Repeated identical lines are kept separately by occurrence.
 *
 * Quotation line IDs are not used for matching because
 * separate customer offers have different line IDs.
 */
const buildProductRows = (quotations) => {
  const rows = new Map();

  for (const quotation of quotations) {
    const occurrences = new Map();

    for (const item of quotation.items || []) {
      const signature = JSON.stringify([
        String(item.productId || item.productCode || ""),
        normalizedText(item.unit).toUpperCase(),
        normalizedText(item.specification),
      ]);

      const occurrence = (occurrences.get(signature) || 0) + 1;

      occurrences.set(signature, occurrence);

      const key = JSON.stringify([signature, occurrence]);

      if (!rows.has(key)) {
        rows.set(key, {
          key,
          productName: item.productName || "Unnamed product",
          productCode: item.productCode || "",
          unit: item.unit || "",
          specification: item.specification || "",
          occurrence,
          offers: new Map(),
        });
      }

      rows.get(key).offers.set(String(quotation._id), item);
    }
  }

  return Array.from(rows.values());
};

function OfferComparisonTable({
  quotations = [],
  selectedId = "",
  disabled = false,
  onSelect,
  onView,
  onViewOrder,
}) {
  const [showDetails, setShowDetails] = useState(false);

  const productRows = useMemo(() => buildProductRows(quotations), [quotations]);

  const selectedQuotation = quotations.find(
    (quotation) => String(quotation._id) === String(selectedId),
  );

  const tableWidth = 220 + quotations.length * 280;

  const cellClass = (quotation, extra = "") =>
    [
      "oc-cell",
      String(quotation._id) === String(selectedId) ? "oc-cell-selected" : "",
      extra,
    ]
      .filter(Boolean)
      .join(" ");

  const summaryRows = [
    {
      label: "Taxable amount",
      render: (quotation) => formatPaise(quotation.taxableAmountPaise),
    },

    {
      label: "Discount",
      render: (quotation) => formatPaise(quotation.discountAmountPaise),
    },

    {
      label: "Tax treatment",
      render: (quotation) =>
        TAX_LABELS[quotation.taxMode] || quotation.taxMode || "—",
    },
  ];

  const detailRows = [
    {
      label: "Quotation date",
      render: (quotation) => formatDate(quotation.quotationDate),
    },

    {
      label: "Offer valid until",
      render: (quotation) => formatDate(quotation.validUntil),
    },

    {
      label: "Expected delivery",
      render: (quotation) => formatDate(quotation.expectedDeliveryDate),
    },

    {
      label: "Delivery terms",
      render: (quotation) => quotation.deliveryTerms || "—",
    },

    {
      label: "Enquiry reference",
      render: (quotation) => quotation.enquiryReference || "—",
    },

    {
      label: "CGST",
      render: (quotation) => formatPaise(quotation.cgstAmountPaise),
    },

    {
      label: "SGST",
      render: (quotation) => formatPaise(quotation.sgstAmountPaise),
    },

    {
      label: "IGST",
      render: (quotation) => formatPaise(quotation.igstAmountPaise),
    },

    {
      label: "Call notes",
      render: (quotation) => quotation.notes || "—",
    },

    {
      label: "Terms and conditions",
      render: (quotation) => quotation.termsAndConditions || "—",
    },
  ];

  if (!quotations.length) {
    return (
      <section className="oc-empty">
        <span className="oc-empty-icon">
          <FileText size={24} />
        </span>

        <h2>No customer offers yet</h2>

        <p>Add a customer offer to start this comparison.</p>
      </section>
    );
  }

  return (
    <section className="oc-card">
      <div className="oc-toolbar">
        <div>
          <div className="oc-heading-line">
            <h2>Compare offers</h2>

            <span className="oc-count">{quotations.length} offers</span>
          </div>

          <p>Review prices and terms, then select a customer.</p>
        </div>

        <button
          type="button"
          className="oc-details-toggle"
          aria-expanded={showDetails}
          onClick={() => setShowDetails((previous) => !previous)}
        >
          {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}

          {showDetails ? "Less details" : "More details"}
        </button>
      </div>

      <div
        className="oc-scroll"
        role="region"
        aria-label="Customer offer comparison"
        tabIndex={0}
      >
        <table
          className="oc-table"
          style={{
            width: `max(100%, ${tableWidth}px)`,
          }}
        >
          <caption className="oc-sr-only">
            Compare customer quotations by product, offered price, quantity,
            total, and terms.
          </caption>

          <colgroup>
            <col style={{ width: 220 }} />

            {quotations.map((quotation) => (
              <col key={quotation._id} />
            ))}
          </colgroup>

          <thead>
            <tr>
              <th scope="col" className="oc-label oc-corner">
                <span className="oc-eyebrow">CUSTOMER OFFERS</span>

                <span className="oc-corner-title">Choose your offer</span>

                <span className="oc-muted">Compare before selecting</span>
              </th>

              {quotations.map((quotation) => {
                const selected = String(quotation._id) === String(selectedId);

                return (
                  <th
                    scope="col"
                    key={quotation._id}
                    className={cellClass(quotation, "oc-customer-header")}
                  >
                    <div className="oc-customer-top">
                      <span className="oc-avatar">
                        {quotation.customerName
                          ?.trim()
                          .charAt(0)
                          .toUpperCase() || "C"}
                      </span>

                      {selected && (
                        <span className="oc-selected-badge">
                          <Check size={12} />
                          Selected
                        </span>
                      )}
                    </div>

                    <div className="oc-customer-name">
                      {quotation.customerName || "Customer"}
                    </div>

                    <div className="oc-customer-code">
                      {quotation.customerCode || "—"}
                    </div>

                    <div className="oc-header-bottom">
                      <button
                        type="button"
                        className="oc-document-link"
                        disabled={disabled}
                        onClick={() => onView?.(quotation)}
                      >
                        {quotation.quotationNumber}
                        {" / R"}
                        {quotation.revision}

                        <ExternalLink size={12} />
                      </button>

                      <StatusField value={quotation.status} />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {productRows.map((row) => (
              <tr key={row.key}>
                <th scope="row" className="oc-label oc-product-label">
                  <span className="oc-product-name">{row.productName}</span>

                  <span className="oc-muted">
                    {row.productCode}
                    {row.unit ? ` · ${row.unit}` : ""}
                  </span>

                  {row.specification && (
                    <span className="oc-specification">
                      {row.specification}
                    </span>
                  )}

                  {row.occurrence > 1 && (
                    <span className="oc-muted">
                      Additional line {row.occurrence}
                    </span>
                  )}
                </th>

                {quotations.map((quotation) => {
                  const item = row.offers.get(String(quotation._id));

                  return (
                    <td key={quotation._id} className={cellClass(quotation)}>
                      {item ? (
                        <div className="oc-price-block">
                          <div className="oc-price-top">
                            <span className="oc-price">
                              {formatPaise(item.unitRatePaise)}
                            </span>

                            <span className="oc-quantity">
                              {formatQuantity(item.quantity)} {item.unit}
                            </span>
                          </div>

                          <div className="oc-price-meta">
                            <span>Discount {item.discountPercent ?? 0}%</span>

                            <span>GST {item.gstRate ?? 0}%</span>
                          </div>

                          <div className="oc-line-total">
                            <span>Line total</span>

                            <span>{formatPaise(item.totalAmountPaise)}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="oc-not-quoted">Not quoted</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}

            {summaryRows.map((row) => (
              <tr key={row.label}>
                <th scope="row" className="oc-label">
                  {row.label}
                </th>

                {quotations.map((quotation) => (
                  <td key={quotation._id} className={cellClass(quotation)}>
                    {row.render(quotation)}
                  </td>
                ))}
              </tr>
            ))}

            <tr className="oc-total-row">
              <th scope="row" className="oc-label">
                <span>Total offer</span>

                <span className="oc-muted">Including applicable taxes</span>
              </th>

              {quotations.map((quotation) => (
                <td key={quotation._id} className={cellClass(quotation)}>
                  <span className="oc-grand-total">
                    {formatPaise(quotation.totalAmountPaise)}
                  </span>
                </td>
              ))}
            </tr>

            <tr>
              <th scope="row" className="oc-label">
                Payment terms
              </th>

              {quotations.map((quotation) => (
                <td key={quotation._id} className={cellClass(quotation)}>
                  {quotation.paymentTerms || "—"}
                </td>
              ))}
            </tr>

            {showDetails &&
              detailRows.map((row) => (
                <tr key={row.label} className="oc-detail-row">
                  <th scope="row" className="oc-label">
                    {row.label}
                  </th>

                  {quotations.map((quotation) => (
                    <td
                      key={quotation._id}
                      className={cellClass(quotation, "oc-text-cell")}
                    >
                      {row.render(quotation)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>

          <tfoot>
            <tr>
              <th scope="row" className="oc-label">
                Select customer
                <span className="oc-muted">
                  The admin makes the final choice
                </span>
              </th>

              {quotations.map((quotation) => {
                const selected = String(quotation._id) === String(selectedId);

                return (
                  <td key={quotation._id} className={cellClass(quotation)}>
                    {quotation.existingOrder ? (
                      <button
                        type="button"
                        className="oc-order-button"
                        disabled={disabled}
                        onClick={() => onViewOrder?.(quotation.existingOrder)}
                      >
                        View {quotation.existingOrder.orderNumber}
                        <ExternalLink size={14} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={`oc-select-button ${
                          selected ? "is-selected" : ""
                        }`}
                        disabled={disabled || quotation.canConvert !== true}
                        aria-pressed={selected}
                        onClick={() => onSelect?.(quotation)}
                      >
                        <span
                          className="oc-selection-indicator"
                          aria-hidden="true"
                        >
                          {selected && <Check size={12} />}
                        </span>

                        {selected
                          ? "Offer selected"
                          : quotation.canConvert
                            ? "Select offer"
                            : "Not eligible"}
                      </button>
                    )}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="oc-bottom-note" role="status" aria-live="polite">
        {selectedQuotation ? (
          <>
            <span className="oc-note-check">
              <Check size={14} />
            </span>

            <span>
              <strong>{selectedQuotation.customerName}</strong> selected. Review
              the order dates below to create the Sales Order.
            </span>
          </>
        ) : (
          <span>
            Select an offer to continue. Compare the quantities and
            specifications—not only the total amount.
          </span>
        )}
      </div>
    </section>
  );
}

export default OfferComparisonTable;
