import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { ArrowLeft, FileText, StickyNote } from "lucide-react";

import api from "../../../services/api";

import Button from "../../../components/common/Form/Button";
import StatusField from "../../../components/common/StatusField/StatusField";

import "../../../styles/invoice-common1.css";

const TAX_MODE_LABELS = {
  NONE: "No GST",
  INTRA_STATE: "CGST + SGST",
  INTER_STATE: "IGST",
};

const currencyFormatter = new Intl.NumberFormat("en-IN", {
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
    return "N/A";
  }

  const amount = Number(value);

  return Number.isSafeInteger(amount)
    ? currencyFormatter.format(amount / 100)
    : "N/A";
};

const formatQuantity = (value) => {
  if (value === null || value === undefined) {
    return "N/A";
  }

  const quantity = Number(value);

  return Number.isFinite(quantity) ? quantityFormatter.format(quantity) : "N/A";
};

const formatDate = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

const getErrorMessage = (error) => {
  const body = error?.response?.data;

  if (Array.isArray(body?.errors) && body.errors.length) {
    return body.errors
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.message || item?.msg || String(item),
      )
      .join(", ");
  }

  return body?.message || error?.message || "Unable to load quotation.";
};

function DetailField({ label, children }) {
  return (
    <div>
      <p className="doc-note">{label}</p>
      <div>{children ?? "N/A"}</div>
    </div>
  );
}

function SalesQuotationDetail({ listPath = "/sales/quotations" }) {
  const navigate = useNavigate();
  // const { id } = useParams();
  const { quotationNumber, revision } = useParams();

  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadQuotation = async () => {
      setLoading(true);
      setError("");
      setQuotation(null);

      try {
        const revisionNumber = Number(revision);

        if (!quotationNumber?.trim()) {
          throw new Error("Quotation number is missing from the route.");
        }

        if (!Number.isSafeInteger(revisionNumber) || revisionNumber < 1) {
          throw new Error("Quotation revision is invalid.");
        }

        if (typeof api.salesQuotations?.getByNumber !== "function") {
          throw new Error("The quotation number lookup API is not configured.");
        }

        const response = await api.salesQuotations.getByNumber(
          quotationNumber,
          revisionNumber,
        );

        const record = response?.data?.data;

        if (
          response?.data?.success !== true ||
          !record?._id ||
          !record.quotationNumber ||
          record.quotationNumber !== quotationNumber.trim().toUpperCase() ||
          record.revision !== revisionNumber
        ) {
          throw new Error(
            response?.data?.message ||
              "The server did not return the requested quotation revision.",
          );
        }

        if (!cancelled) {
          setQuotation(record);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(getErrorMessage(requestError));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadQuotation();

    return () => {
      cancelled = true;
    };
  }, [quotationNumber, revision, reloadKey]);

  const goBack = () => {
    navigate(listPath);
  };

  const items = Array.isArray(quotation?.items) ? quotation.items : [];

  const summaryRows = quotation
    ? [
        ["Gross Amount", quotation.grossAmountPaise],
        ["Line Discounts", quotation.discountAmountPaise],
        ["Taxable Amount", quotation.taxableAmountPaise],

        ...(quotation.taxMode === "INTRA_STATE"
          ? [
              ["CGST", quotation.cgstAmountPaise],
              ["SGST", quotation.sgstAmountPaise],
            ]
          : []),

        ...(quotation.taxMode === "INTER_STATE"
          ? [["IGST", quotation.igstAmountPaise]]
          : []),
      ]
    : [];

  return (
    <div className="doc-page">
      <header className="doc-header">
        <div className="doc-header-left">
          <Button variant="secondary" icon={ArrowLeft} onClick={goBack}>
            Back
          </Button>

          <div className="doc-title">
            <FileText size={18} />

            <span>
              {quotation
                ? `Quotation · ${quotation.quotationNumber} / R${quotation.revision}`
                : "Quotation"}
            </span>
          </div>
        </div>

        <div className="doc-header-actions">
          {quotation && <StatusField value={quotation.status} />}
        </div>
      </header>

      {loading && (
        <div className="doc-alerts">
          <div className="doc-alert" role="status">
            Loading quotation...
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="doc-alerts">
          <div className="doc-alert doc-alert-error" role="alert">
            <p>{error}</p>

            <Button
              variant="secondary"
              onClick={() => setReloadKey((previous) => previous + 1)}
            >
              Retry Loading
            </Button>
          </div>
        </div>
      )}

      {!loading && !error && quotation && (
        <main className="doc-main">
          <section className="doc-top">
            <div className="doc-panel doc-party-panel">
              <h2 className="doc-panel-title">Quote To</h2>

              <div className="doc-party-card">
                <div className="doc-avatar">
                  {quotation.customerName?.charAt(0).toUpperCase() || "C"}
                </div>

                <div className="doc-party-copy">
                  <h3>{quotation.customerName || "N/A"}</h3>

                  <p>{quotation.customerCode || "N/A"}</p>

                  <p>
                    <span>GSTIN:</span>{" "}
                    {quotation.customerGstNo || "Not provided"}
                  </p>

                  <p>
                    <span>Billing Address:</span>{" "}
                    {quotation.billingAddress || "Not provided"}
                  </p>

                  <p>
                    <span>Shipping Address:</span>{" "}
                    {quotation.shippingAddress || "Not provided"}
                  </p>
                </div>
              </div>
            </div>

            <div className="doc-panel">
              <h2 className="doc-panel-title">Quotation Details</h2>

              <div className="doc-fields-grid">
                <DetailField label="Quotation Number">
                  {quotation.quotationNumber}
                </DetailField>

                <DetailField label="Revision">
                  {`R${quotation.revision}`}
                </DetailField>

                <DetailField label="Quotation Date">
                  {formatDate(quotation.quotationDate)}
                </DetailField>

                <DetailField label="Valid Until">
                  {formatDate(quotation.validUntil)}
                </DetailField>

                <DetailField label="Expected Delivery">
                  {formatDate(quotation.expectedDeliveryDate)}
                </DetailField>

                <DetailField label="Enquiry Reference">
                  {quotation.enquiryReference || "N/A"}
                </DetailField>

                <DetailField label="Payment Terms">
                  {quotation.paymentTerms || "N/A"}
                </DetailField>

                <DetailField label="Tax Treatment">
                  {TAX_MODE_LABELS[quotation.taxMode] ||
                    quotation.taxMode ||
                    "N/A"}
                </DetailField>

                <DetailField label="Currency">
                  {quotation.currency || "N/A"}
                </DetailField>

                <DetailField label="Issued On">
                  {formatDate(quotation.issuedAt)}
                </DetailField>
              </div>
            </div>
          </section>

          <section className="doc-items">
            <div className="doc-panel">
              <h2 className="doc-panel-title">Quotation Items</h2>

              <p className="doc-note">
                Product details and amounts saved with this quotation revision.
              </p>
            </div>

            <div className="doc-table-wrap">
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Items</th>
                    <th>HSN / SAC</th>
                    <th>Qty</th>
                    <th>Price/Item</th>
                    <th>Discount</th>
                    <th>GST</th>
                    <th>Amount</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item, index) => (
                    <tr key={item.lineId || index}>
                      <td data-label="No." className="doc-cell-no">
                        {index + 1}
                      </td>

                      <td data-label="Item" className="doc-cell-item">
                        <div>
                          <strong>{item.productName || "N/A"}</strong>
                        </div>

                        <small className="doc-item-meta">
                          {item.productCode || "N/A"}
                          {item.productType ? ` · ${item.productType}` : ""}
                        </small>

                        {item.specification && (
                          <p className="doc-note">{item.specification}</p>
                        )}
                      </td>

                      <td data-label="HSN / SAC" className="doc-cell-hsn">
                        {item.hsnSacCode || "N/A"}
                      </td>

                      <td data-label="Quantity">
                        {formatQuantity(item.quantity)}
                        {item.unit ? ` ${item.unit}` : ""}
                      </td>

                      <td data-label="Price/Item">
                        {formatPaise(item.unitRatePaise)}
                      </td>

                      <td data-label="Discount">
                        <div>{item.discountPercent ?? 0}%</div>

                        <small className="doc-item-meta">
                          {formatPaise(item.discountAmountPaise)}
                        </small>
                      </td>

                      <td data-label="GST">
                        <div>{item.gstRate ?? 0}%</div>

                        {quotation.taxMode === "INTRA_STATE" && (
                          <>
                            <small className="doc-item-meta">
                              CGST: {formatPaise(item.cgstAmountPaise)}
                            </small>

                            <div>
                              <small className="doc-item-meta">
                                SGST: {formatPaise(item.sgstAmountPaise)}
                              </small>
                            </div>
                          </>
                        )}

                        {quotation.taxMode === "INTER_STATE" && (
                          <small className="doc-item-meta">
                            IGST: {formatPaise(item.igstAmountPaise)}
                          </small>
                        )}
                      </td>

                      <td data-label="Amount" className="doc-cell-amount">
                        {formatPaise(item.totalAmountPaise)}
                      </td>
                    </tr>
                  ))}

                  {!items.length && (
                    <tr>
                      <td colSpan={8}>No quotation items were returned.</td>
                    </tr>
                  )}
                </tbody>

                <tfoot>
                  <tr>
                    <td colSpan={7} className="doc-subtotal-label">
                      Quotation Total
                    </td>

                    <td className="doc-subtotal-value">
                      {formatPaise(quotation.totalAmountPaise)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <section className="doc-bottom">
            <div className="doc-extras">
              <div className="doc-panel">
                <h2 className="doc-panel-title">
                  <StickyNote size={16} /> Notes
                </h2>

                <p style={{ whiteSpace: "pre-wrap" }}>
                  {quotation.notes || "No notes added."}
                </p>
              </div>

              <div className="doc-panel">
                <h2 className="doc-panel-title">Delivery Terms</h2>

                <p style={{ whiteSpace: "pre-wrap" }}>
                  {quotation.deliveryTerms || "No delivery terms added."}
                </p>
              </div>

              <div className="doc-panel">
                <h2 className="doc-panel-title">Terms and Conditions</h2>

                <p style={{ whiteSpace: "pre-wrap" }}>
                  {quotation.termsAndConditions ||
                    "No terms and conditions added."}
                </p>
              </div>

              {quotation.revision > 1 && (
                <div className="doc-panel">
                  <h2 className="doc-panel-title">Revision Details</h2>

                  <p className="doc-note">Revision Reason</p>

                  <p style={{ whiteSpace: "pre-wrap" }}>
                    {quotation.revisionReason || "No revision reason provided."}
                  </p>
                </div>
              )}

              <div className="doc-panel">
                <h2 className="doc-panel-title">Document Activity</h2>

                <div className="doc-fields-grid">
                  <DetailField label="Created On">
                    {formatDate(quotation.createdAt)}
                  </DetailField>

                  <DetailField label="Updated On">
                    {formatDate(quotation.updatedAt)}
                  </DetailField>

                  {quotation.acceptedAt && (
                    <DetailField label="Accepted On">
                      {formatDate(quotation.acceptedAt)}
                    </DetailField>
                  )}

                  {quotation.acceptanceReference && (
                    <DetailField label="Acceptance Reference">
                      {quotation.acceptanceReference}
                    </DetailField>
                  )}

                  {quotation.rejectedAt && (
                    <DetailField label="Rejected On">
                      {formatDate(quotation.rejectedAt)}
                    </DetailField>
                  )}

                  {quotation.rejectionReason && (
                    <DetailField label="Rejection Reason">
                      {quotation.rejectionReason}
                    </DetailField>
                  )}

                  {quotation.cancelledAt && (
                    <DetailField label="Cancelled On">
                      {formatDate(quotation.cancelledAt)}
                    </DetailField>
                  )}

                  {quotation.cancellationReason && (
                    <DetailField label="Cancellation Reason">
                      {quotation.cancellationReason}
                    </DetailField>
                  )}
                </div>
              </div>
            </div>

            <div className="doc-summary">
              {summaryRows.map(([label, amount]) => (
                <div className="doc-summary-row" key={label}>
                  <span>{label}</span>
                  <strong>{formatPaise(amount)}</strong>
                </div>
              ))}

              <div className="doc-summary-row">
                <span>Item Lines</span>
                <strong>{items.length}</strong>
              </div>

              <div className="doc-summary-total">
                <span>Total Amount:</span>

                <strong>{formatPaise(quotation.totalAmountPaise)}</strong>
              </div>

              <p className="doc-note">
                This page is read-only. Amounts shown are the saved
                server-calculated totals for this revision.
              </p>
            </div>
          </section>
        </main>
      )}
    </div>
  );
}

export default SalesQuotationDetail;
