import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { ArrowLeft, FileText, Send, StickyNote, Wallet } from "lucide-react";

import toast from "react-hot-toast";

import api from "../../services/api";
import routes from "../../config/routes";

import Button from "../../components/common/Form/Button";
import StatusField from "../../components/common/StatusField/StatusField";
import ConfirmModal from "../../components/common/ConfirmModal/ConfirmModal";

import "../../styles/invoice-common1.css";
import PurchaseBillPaymentHistory from "./PurchaseBillPaymentHistory";

const formatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatPaise = (value) => formatter.format((Number(value) || 0) / 100);

const formatDate = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

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

  return body?.message || error?.message || "Unable to complete the request.";
};

const TAX_LABELS = {
  NONE: "No GST",
  INTRA_STATE: "CGST + SGST",
  INTER_STATE: "IGST",
};

// function DetailField({ label, children }) {
//   return (
//     <div>
//       <p className="doc-note">{label}</p>
//       <div>{children ?? "N/A"}</div>
//     </div>
//   );
// }
function DetailField({ label, children }) {
  return (
    <div className="doc-detail-field">
      <div className="doc-detail-label">{label}</div>

      <div className="doc-detail-value">
        {children ?? "N/A"}
      </div>
    </div>
  );
}
function PurchaseBillDetail() {
  const navigate = useNavigate();
  const params = useParams();

  // Your earlier Purchase Bills list uses an :id route parameter.
  const billNumber = params.billNumber || params.id;

  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postNeedsReview, setPostNeedsReview] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadBill = async () => {
      setLoading(true);
      setError("");
      setBill(null);

      try {
        if (!billNumber) {
          throw new Error("Bill number is missing from the route.");
        }

        const response = await api.purchaseBills.getByNumber(billNumber);

        const record = response?.data?.bill;

        if (!record?.billNumber) {
          throw new Error("The server did not return a valid purchase bill.");
        }

        if (!cancelled) {
          setBill(record);
          setPostNeedsReview(false);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(getErrorMessage(requestError));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadBill();

    return () => {
      cancelled = true;
    };
  }, [billNumber, reloadKey]);

  const isDraft = bill?.status === "DRAFT";
  const isPosted = bill?.status === "POSTED";

  const hasOutstanding = Number(bill?.outstandingAmountPaise) > 0;

  const items = Array.isArray(bill?.items) ? bill.items : [];

  const journalId =
    typeof bill?.journalId === "object" ? bill.journalId?._id : bill?.journalId;

  const goBack = () => {
    if (posting) return;
    navigate(routes.purchase.invoices);
  };

  const handleRecordPayment = () => {
    if (!isPosted || !hasOutstanding) return;

    const supplierId =
      typeof bill.supplierId === "object"
        ? bill.supplierId?._id
        : bill.supplierId;

    if (!supplierId) {
      toast.error("The bill has no supplier ID.");
      return;
    }

    navigate(
      `${routes.supplierPayments.create}?supplierId=${encodeURIComponent(
        supplierId,
      )}`,
    );
  };

  const handlePost = async () => {
    if (posting || !isDraft || postNeedsReview) return;

    setPosting(true);

    try {
      const response = await api.purchaseBills.post(bill.billNumber);

      const updatedBill = response?.data?.bill;

      if (!updatedBill?.billNumber || updatedBill.status !== "POSTED") {
        throw new Error(
          "The server did not confirm posting. Reload the bill before trying again.",
        );
      }

      setBill(updatedBill);
      setConfirmOpen(false);

      toast.success(`${updatedBill.billNumber} posted successfully`);
    } catch (requestError) {
      // Reload before any new posting attempt, including uncertain outcomes.
      setConfirmOpen(false);
      setPostNeedsReview(true);
      toast.error(getErrorMessage(requestError));
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="doc-page doc-detail-page">
      <header className="doc-header">
        <div className="doc-header-left">
          <Button
            variant="secondary"
            icon={ArrowLeft}
            disabled={posting}
            onClick={goBack}
          >
            Back
          </Button>

          <div className="doc-title">
            <FileText size={18} />

            <span>
              {bill?.billNumber
                ? `Purchase Bill · ${bill.billNumber}`
                : "Purchase Bill"}
            </span>
          </div>
        </div>

        <div className="doc-header-actions">
          {bill && <StatusField value={bill.status} />}

          {isDraft && (
            <Button
              icon={Send}
              disabled={posting || postNeedsReview}
              loading={posting}
              onClick={() => setConfirmOpen(true)}
            >
              Post Draft
            </Button>
          )}

          {isPosted && hasOutstanding && (
            <Button icon={Wallet} onClick={handleRecordPayment}>
              Record Payment
            </Button>
          )}
        </div>
      </header>

      {loading && (
        <div className="doc-alerts">
          <div className="doc-alert" role="status">
            Loading purchase bill...
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="doc-alerts">
          <div className="doc-alert doc-alert-error" role="alert">
            <p>{error}</p>

            <Button
              variant="secondary"
              onClick={() => setReloadKey((value) => value + 1)}
            >
              Retry Loading
            </Button>
          </div>
        </div>
      )}

      {postNeedsReview && (
        <div className="doc-alerts">
          <div className="doc-alert" role="alert">
            The posting attempt did not return a confirmed result. Reload the
            bill to check its current status before trying again.
            <Button
              variant="secondary"
              onClick={() => setReloadKey((value) => value + 1)}
            >
              Reload Bill
            </Button>
          </div>
        </div>
      )}

      {!loading && !error && bill && (
        <main className="doc-main">
          <section className="doc-top">
            <div className="doc-panel doc-party-panel">
              <h2 className="doc-panel-title">Bill From</h2>

              <div className="doc-party-card">
                <div className="doc-avatar">
                  {bill.supplierName?.charAt(0).toUpperCase() || "S"}
                </div>

                <div className="doc-party-copy">
                  <h3>{bill.supplierName || "N/A"}</h3>
                  <p>{bill.supplierCode || "N/A"}</p>

                  <p>
                    <span>GSTIN:</span> {bill.supplierGstNo || "Not provided"}
                  </p>

                  <p>
                    <span>Supplier Invoice:</span>{" "}
                    {bill.supplierInvoiceNumber || "N/A"}
                  </p>
                </div>
              </div>

              <p className="doc-note">
                Supplier information shown here is stored with the bill.
              </p>
            </div>

            <div className="doc-panel">
              <h2 className="doc-panel-title">Bill Details</h2>

              <div className="doc-fields-grid">
                <DetailField label="Bill Number">{bill.billNumber}</DetailField>

                <DetailField label="Supplier Invoice No.">
                  {bill.supplierInvoiceNumber || "N/A"}
                </DetailField>

                <DetailField label="Bill Date">
                  {formatDate(bill.billDate)}
                </DetailField>

                <DetailField label="Due Date">
                  {formatDate(bill.dueDate)}
                </DetailField>

                <DetailField label="Payment Terms">
                  {bill.paymentTerms || "N/A"}
                </DetailField>

                <DetailField label="Tax Treatment">
                  {TAX_LABELS[bill.taxMode] || bill.taxMode || "N/A"}
                </DetailField>

                <DetailField label="Receive Stock on Posting">
                  {bill.updateStock ? "Yes" : "No"}
                </DetailField>

                <DetailField label="Payment Status">
                  {isPosted ? (
                    <StatusField value={bill.paymentStatus} />
                  ) : (
                    "N/A — bill is not posted"
                  )}
                </DetailField>

                <DetailField label="Posted On">
                  {formatDate(bill.postedAt)}
                </DetailField>

                <DetailField label="Currency">
                  {bill.currency || "N/A"}
                </DetailField>
              </div>
            </div>
          </section>

          <section className="doc-items">
            <div className="doc-table-wrap">
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Item</th>
                    <th>HSN / SAC</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>Discount</th>
                    <th>GST</th>
                    <th>Amount</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item, index) => (
                    <tr key={`${item.productCode}-${index}`}>
                      <td data-label="No." className="doc-cell-no">
                        {index + 1}
                      </td>

                      <td data-label="Item" className="doc-cell-item">
                        <div>{item.productName || "N/A"}</div>

                        <small className="doc-item-meta">
                          {item.productCode || "N/A"}
                          {item.unit ? ` · ${item.unit}` : ""}
                          {item.trackInventory ? " · Stock tracked" : ""}
                        </small>
                      </td>

                      <td data-label="HSN / SAC" className="doc-cell-hsn">
                        {item.hsnSacCode || "—"}
                      </td>

                      <td data-label="Quantity">
                        {item.quantity} {item.unit}
                      </td>

                      <td data-label="Rate" className="doc-cell-amount">
                        {formatPaise(item.unitRatePaise)}
                      </td>

                      <td data-label="Discount">
                        <div>{item.discountPercent || 0}%</div>
                        <small className="doc-item-meta">
                          {formatPaise(item.discountAmountPaise)}
                        </small>
                      </td>

                      <td data-label="GST">
                        <div>{item.gstRate || 0}%</div>

                        <small className="doc-item-meta">
                          {item.taxCreditEligible
                            ? "Input credit selected"
                            : "No input credit selected"}
                        </small>
                      </td>

                      <td data-label="Amount" className="doc-cell-amount">
                        {formatPaise(item.totalAmountPaise)}
                      </td>
                    </tr>
                  ))}

                  {!items.length && (
                    <tr>
                      <td colSpan={8}>No bill items were returned.</td>
                    </tr>
                  )}
                </tbody>

                <tfoot>
                  <tr>
                    <td colSpan={7} className="doc-subtotal-label">
                      Total
                    </td>

                    <td className="doc-subtotal-value">
                      {formatPaise(bill.totalAmountPaise)}
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
                  {bill.notes || "No notes added."}
                </p>
              </div>

              <div className="doc-panel">
                <h2 className="doc-panel-title">Accounting Journal</h2>

                <p style={{ overflowWrap: "anywhere" }}>
                  {journalId ||
                    (isDraft
                      ? "A journal is created when this draft is posted."
                      : "No journal ID returned.")}
                </p>

                {isPosted && hasOutstanding && (
                  <p className="doc-note">
                    Use Record Payment to record money paid against this
                    supplier's purchase bills.
                  </p>
                )}
              </div>
            </div>

            <div className="doc-summary">
              {[
                ["Gross Amount", bill.grossAmountPaise],
                ["Line Discounts", -(bill.discountAmountPaise || 0)],
                ["Taxable Amount", bill.taxableAmountPaise],
                ...(bill.taxMode === "INTRA_STATE"
                  ? [
                      ["CGST", bill.cgstAmountPaise],
                      ["SGST", bill.sgstAmountPaise],
                    ]
                  : []),
                ...(bill.taxMode === "INTER_STATE"
                  ? [["IGST", bill.igstAmountPaise]]
                  : []),
              ].map(([label, amount]) => (
                <div className="doc-summary-row" key={label}>
                  <span>{label}</span>
                  <strong>{formatPaise(amount)}</strong>
                </div>
              ))}

              <div className="doc-summary-total">
                <span>Total Amount:</span>
                <strong>{formatPaise(bill.totalAmountPaise)}</strong>
              </div>

              {isPosted ? (
                <>
                  <div className="doc-summary-row">
                    <span>Paid</span>
                    <strong>{formatPaise(bill.paidAmountPaise)}</strong>
                  </div>

                  <div className="doc-summary-row">
                    <span>Outstanding</span>
                    <strong>{formatPaise(bill.outstandingAmountPaise)}</strong>
                  </div>
                </>
              ) : (
                <p className="doc-note">
                  Payment balances are not shown for unposted bills.
                </p>
              )}
            </div>
          </section>
          {isPosted && (
            <PurchaseBillPaymentHistory
              key={bill.billNumber}
              billNumber={bill.billNumber}
            />
          )}
        </main>
      )}

      <ConfirmModal
        open={confirmOpen}
        type="danger"
        title="Post purchase bill?"
        message={
          `Post ${bill?.billNumber || "this draft"}? ` +
          "This creates accounting entries and receives inventory " +
          "where selected. Posted bills cannot be edited or deleted " +
          "in the current module."
        }
        confirmText="Post Bill"
        cancelText="Cancel"
        loading={posting}
        onCancel={() => {
          if (!posting) setConfirmOpen(false);
        }}
        onConfirm={handlePost}
      />
    </div>
  );
}

export default PurchaseBillDetail;
