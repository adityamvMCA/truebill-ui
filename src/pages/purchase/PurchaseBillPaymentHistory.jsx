import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import api from "../../services/api";
import routes from "../../config/routes";
import StatusField from "../../components/common/StatusField/StatusField";
import Button from "../../components/common/Form/Button";

const METHODS = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  UPI: "UPI",
  CHEQUE: "Cheque",
  CARD: "Card",
};

const moneyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatPaise = (value) =>
  moneyFormatter.format((Number(value) || 0) / 100);

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

function PurchaseBillPaymentHistory({ billNumber }) {
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadPayments = async () => {
      setLoading(true);
      setError("");
      setRecords([]);
      setPagination(null);

      try {
        const response = await api.purchaseBills.getPayments(billNumber, {
          page,
          limit: 20,
        });

        if (!Array.isArray(response?.data?.data)) {
          throw new Error("Invalid payment history response.");
        }

        if (!cancelled) {
          setRecords(response.data.data);
          setPagination(response.data.pagination);
        }
      } catch (requestError) {
        if (!cancelled) {
          const status = requestError?.response?.status;

          setError(
            status === 403
              ? "You do not have permission to view payment history."
              : requestError?.response?.data?.message ||
                  requestError?.message ||
                  "Unable to load payment history.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadPayments();

    return () => {
      cancelled = true;
    };
  }, [billNumber, page, reloadKey]);

  return (
    <section className="doc-items">
      <div className="doc-panel">
        <h2 className="doc-panel-title">Payment History</h2>

        <p className="doc-note">
          Amounts shown are allocated specifically to this bill, not necessarily
          the full payment amounts.
        </p>

        <Button
          variant="secondary"
          disabled={loading}
          onClick={() => setReloadKey((value) => value + 1)}
        >
          Refresh History
        </Button>
      </div>

      {error ? (
        <div className="doc-alerts">
          <div className="doc-alert doc-alert-error" role="alert">
            {error}
          </div>
        </div>
      ) : (
        <div className="doc-table-wrap">
          <table className="doc-table">
            <thead>
              <tr>
                <th>Payment Number</th>
                <th>Date</th>
                <th>Method</th>
                <th>Paid From</th>
                <th>Reference</th>
                <th>Status</th>
                <th>Allocated Amount</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7}>Loading payment history...</td>
                </tr>
              )}

              {!loading && !records.length && (
                <tr>
                  <td colSpan={7}>No payments recorded against this bill.</td>
                </tr>
              )}

              {!loading &&
                records.map((payment) => (
                  <tr key={payment._id}>
                    <td data-label="Payment Number">
                      <Link
                        className="doc-link-button"
                        to={routes.supplierPayments.view.replace(
                          ":paymentNumber",
                          encodeURIComponent(payment.paymentNumber),
                        )}
                      >
                        {payment.paymentNumber}
                      </Link>
                    </td>

                    <td data-label="Date">{formatDate(payment.paymentDate)}</td>

                    <td data-label="Method">
                      {METHODS[payment.paymentMethod] ||
                        payment.paymentMethod ||
                        "N/A"}
                    </td>

                    <td data-label="Paid From">
                      {payment.paymentLedgerName || "N/A"}
                    </td>

                    <td data-label="Reference">
                      {payment.referenceNumber || "N/A"}
                    </td>

                    <td data-label="Status">
                      <StatusField value={payment.status} />
                    </td>

                    <td
                      data-label="Allocated Amount"
                      className="doc-cell-amount"
                    >
                      {formatPaise(payment.allocatedAmountPaise)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && pagination?.total > 0 && (
        <div className="doc-panel">
          <p className="doc-note">
            Page {pagination.page} of {pagination.totalPages}
            {" · "}
            {pagination.total} payment records
          </p>

          <div className="doc-header-actions">
            <Button
              variant="secondary"
              disabled={page <= 1}
              onClick={() => setPage((value) => value - 1)}
            >
              Previous
            </Button>

            <Button
              variant="secondary"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

export default PurchaseBillPaymentHistory;
