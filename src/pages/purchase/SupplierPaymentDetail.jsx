import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { ArrowLeft, StickyNote, Wallet } from "lucide-react";

import api from "../../services/api";
import routes from "../../config/routes";

import Button from "../../components/common/Form/Button";
import StatusField from "../../components/common/StatusField/StatusField";

import "../../styles/invoice-common1.css";

const PAYMENT_METHOD_LABELS = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  UPI: "UPI",
  CHEQUE: "Cheque",
  CARD: "Card",
};

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatPaise = (value) =>
  currencyFormatter.format((Number(value) || 0) / 100);

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

  return body?.message || error?.message || "Unable to load supplier payment.";
};

function DetailField({ label, children }) {
  return (
    <div>
      <p className="doc-note">{label}</p>
      <div>{children ?? "N/A"}</div>
    </div>
  );
}

function SupplierPaymentDetail() {
  const navigate = useNavigate();
  const { paymentNumber } = useParams();

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadPayment = async () => {
      setLoading(true);
      setError("");
      setPayment(null);

      try {
        if (!paymentNumber) {
          throw new Error("Payment number is missing from the route.");
        }

        const response = await api.supplierPayments.getByNumber(paymentNumber);

        const record = response?.data?.payment;

        if (!record?.paymentNumber) {
          throw new Error(
            "The server did not return a valid supplier payment.",
          );
        }

        if (!cancelled) {
          setPayment(record);
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

    loadPayment();

    return () => {
      cancelled = true;
    };
  }, [paymentNumber, reloadKey]);

  const goBack = () => {
    navigate(routes.supplierPayments.list);
  };

  const allocations = Array.isArray(payment?.allocations)
    ? payment.allocations
    : [];

  const allocatedTotal = allocations.reduce(
    (total, allocation) => total + (Number(allocation.amountPaise) || 0),
    0,
  );

  const journalId =
    typeof payment?.journalId === "object"
      ? payment.journalId?._id
      : payment?.journalId;
  return (
    <div className="doc-page">
      <header className="doc-header">
        <div className="doc-header-left">
          <Button variant="secondary" icon={ArrowLeft} onClick={goBack}>
            Back
          </Button>

          <div className="doc-title">
            <Wallet size={18} />

            <span>
              {payment?.paymentNumber
                ? `Supplier Payment · ${payment.paymentNumber}`
                : "Supplier Payment"}
            </span>
          </div>
        </div>

        <div className="doc-header-actions">
          {payment && <StatusField value={payment.status} />}
        </div>
      </header>

      {loading && (
        <div className="doc-alerts">
          <div className="doc-alert" role="status">
            Loading supplier payment...
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

      {!loading && !error && payment && (
        <main className="doc-main">
          <section className="doc-top">
            <div className="doc-panel doc-party-panel">
              <h2 className="doc-panel-title">Paid To</h2>

              <div className="doc-party-card">
                <div className="doc-avatar">
                  {payment.supplierName?.charAt(0).toUpperCase() || "S"}
                </div>

                <div className="doc-party-copy">
                  <h3>{payment.supplierName || "N/A"}</h3>

                  <p>{payment.supplierCode || "N/A"}</p>

                  <p>
                    <span>Payment:</span> {payment.paymentNumber}
                  </p>

                  <p>
                    <span>Amount paid:</span> {formatPaise(payment.amountPaise)}
                  </p>
                </div>
              </div>
            </div>

            <div className="doc-panel">
              <h2 className="doc-panel-title">Payment Details</h2>

              <div className="doc-fields-grid">
                <DetailField label="Payment Number">
                  {payment.paymentNumber}
                </DetailField>

                <DetailField label="Payment Date">
                  {formatDate(payment.paymentDate)}
                </DetailField>

                <DetailField label="Paid From">
                  {payment.paymentLedgerName || "N/A"}
                  {payment.paymentLedgerCode
                    ? ` (${payment.paymentLedgerCode})`
                    : ""}
                </DetailField>

                <DetailField label="Payment Method">
                  {PAYMENT_METHOD_LABELS[payment.paymentMethod] ||
                    payment.paymentMethod ||
                    "N/A"}
                </DetailField>

                <DetailField label="Reference Number">
                  {payment.referenceNumber || "N/A"}
                </DetailField>

                <DetailField label="Amount Paid">
                  {formatPaise(payment.amountPaise)}
                </DetailField>

                <DetailField label="Posted On">
                  {formatDate(payment.postedAt)}
                </DetailField>

                <DetailField label="Currency">
                  {payment.currency || "N/A"}
                </DetailField>
              </div>
            </div>
          </section>

          <section className="doc-items">
            <div className="doc-panel">
              <h2 className="doc-panel-title">Bill Allocations</h2>

              <p className="doc-note">
                Amounts allocated by this payment—not the current outstanding
                balances of the bills.
              </p>
            </div>

            <div className="doc-table-wrap">
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Purchase Bill</th>
                    <th>Amount Paid</th>
                  </tr>
                </thead>

                <tbody>
                  {allocations.map((allocation, index) => (
                    <tr key={`${allocation.billNumber || "bill"}-${index}`}>
                      <td data-label="No." className="doc-cell-no">
                        {index + 1}
                      </td>

                      <td data-label="Purchase Bill" className="doc-cell-item">
                        {allocation.billNumber || "N/A"}
                      </td>

                      <td data-label="Amount Paid" className="doc-cell-amount">
                        {formatPaise(allocation.amountPaise)}
                      </td>
                    </tr>
                  ))}

                  {!allocations.length && (
                    <tr>
                      <td colSpan={3}>No bill allocations were returned.</td>
                    </tr>
                  )}
                </tbody>

                <tfoot>
                  <tr>
                    <td colSpan={2} className="doc-subtotal-label">
                      Total Allocated
                    </td>

                    <td className="doc-subtotal-value">
                      {formatPaise(allocatedTotal)}
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
                  {payment.notes || "No notes added."}
                </p>
              </div>

              {/* <div className="doc-panel">
                <h2 className="doc-panel-title">Accounting Entry</h2>

                <p className="doc-note">Journal ID</p>

                <p style={{ overflowWrap: "anywhere" }}>{journalId || "N/A"}</p>

                <p className="doc-note">
                  Supplier payment posting: debit supplier payable and credit
                  the selected Cash or Bank account.
                </p>
              </div> */}
              <div className="doc-panel">
                <h2 className="doc-panel-title">Accounting Entry</h2>

                <p className="doc-note">Journal Number</p>

                <p style={{ overflowWrap: "anywhere" }}>
                  {payment.journalNumber || "Not available"}
                </p>

                <p className="doc-note">
                  Supplier payment posting: debit supplier payable and credit
                  the selected Cash or Bank account.
                </p>
              </div>
            </div>

            <div className="doc-summary">
              <div className="doc-summary-row">
                <span>Payment Amount</span>
                <strong>{formatPaise(payment.amountPaise)}</strong>
              </div>

              <div className="doc-summary-row">
                <span>Total Allocated</span>
                <strong>{formatPaise(allocatedTotal)}</strong>
              </div>

              <div className="doc-summary-row">
                <span>Bills Allocated</span>
                <strong>{allocations.length}</strong>
              </div>

              <div className="doc-summary-total">
                <span>Total Paid:</span>
                <strong>{formatPaise(payment.amountPaise)}</strong>
              </div>

              <p className="doc-note">
                This page is read-only. Edit, delete, and reversal actions are
                not included.
              </p>
            </div>
          </section>
        </main>
      )}
    </div>
  );
}

export default SupplierPaymentDetail;
