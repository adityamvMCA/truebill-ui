import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  ArrowLeft,
  Receipt,
  StickyNote,
} from "lucide-react";

import api from "../../services/api";
import routes from "../../config/routes";

import Button from "../../components/common/Form/Button";
import StatusField from "../../components/common/StatusField/StatusField";

import "../../styles/invoice-common1.css";

const RECEIPT_METHOD_LABELS = {
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

  return (
    body?.message ||
    error?.message ||
    "Unable to load customer receipt."
  );
};

function DetailField({ label, children }) {
  return (
    <div>
      <p className="doc-note">{label}</p>
      <div>{children ?? "N/A"}</div>
    </div>
  );
}

function CustomerReceiptDetail() {
  const navigate = useNavigate();
  const { receiptNumber } = useParams();

  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadReceipt = async () => {
      setLoading(true);
      setError("");
      setReceipt(null);

      try {
        if (!receiptNumber) {
          throw new Error("Receipt number is missing from the route.");
        }

        const response =
          await api.customerReceipts.getByNumber(receiptNumber);

        const record = response?.data?.receipt;

        if (!record?.receiptNumber) {
          throw new Error(
            "The server did not return a valid customer receipt.",
          );
        }

        if (!cancelled) {
          setReceipt(record);
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

    loadReceipt();

    return () => {
      cancelled = true;
    };
  }, [receiptNumber, reloadKey]);

  const goBack = () => {
    navigate(routes.customerReceipts.list);
  };

  const allocations = Array.isArray(receipt?.allocations)
    ? receipt.allocations
    : [];

  const allocatedTotal = allocations.reduce(
    (total, allocation) =>
      total + (Number(allocation.amountPaise) || 0),
    0,
  );

  const journalId =
    typeof receipt?.journalId === "object"
      ? receipt.journalId?._id
      : receipt?.journalId;

  return (
    <div className="doc-page">
      <header className="doc-header">
        <div className="doc-header-left">
          <Button
            variant="secondary"
            icon={ArrowLeft}
            onClick={goBack}
          >
            Back
          </Button>

          <div className="doc-title">
            <Receipt size={18} />

            <span>
              {receipt?.receiptNumber
                ? `Customer Receipt · ${receipt.receiptNumber}`
                : "Customer Receipt"}
            </span>
          </div>
        </div>

        <div className="doc-header-actions">
          {receipt && (
            <StatusField value={receipt.status} />
          )}
        </div>
      </header>

      {loading && (
        <div className="doc-alerts">
          <div className="doc-alert" role="status">
            Loading customer receipt...
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="doc-alerts">
          <div
            className="doc-alert doc-alert-error"
            role="alert"
          >
            <p>{error}</p>

            <Button
              variant="secondary"
              onClick={() =>
                setReloadKey((previous) => previous + 1)
              }
            >
              Retry Loading
            </Button>
          </div>
        </div>
      )}

      {!loading && !error && receipt && (
        <main className="doc-main">
          <section className="doc-top">
            <div className="doc-panel doc-party-panel">
              <h2 className="doc-panel-title">
                Received From
              </h2>

              <div className="doc-party-card">
                <div className="doc-avatar">
                  {receipt.customerName
                    ?.charAt(0)
                    .toUpperCase() || "C"}
                </div>

                <div className="doc-party-copy">
                  <h3>{receipt.customerName || "N/A"}</h3>

                  <p>{receipt.customerCode || "N/A"}</p>

                  <p>
                    <span>Receipt:</span>{" "}
                    {receipt.receiptNumber}
                  </p>

                  <p>
                    <span>Amount received:</span>{" "}
                    {formatPaise(receipt.amountPaise)}
                  </p>
                </div>
              </div>

              <p className="doc-note">
                Customer details shown here were stored with
                this receipt.
              </p>
            </div>

            <div className="doc-panel">
              <h2 className="doc-panel-title">
                Receipt Details
              </h2>

              <div className="doc-fields-grid">
                <DetailField label="Receipt Number">
                  {receipt.receiptNumber}
                </DetailField>

                <DetailField label="Receipt Date">
                  {formatDate(receipt.receiptDate)}
                </DetailField>

                <DetailField label="Received In">
                  {receipt.receiptLedgerName || "N/A"}
                  {receipt.receiptLedgerCode
                    ? ` (${receipt.receiptLedgerCode})`
                    : ""}
                </DetailField>

                <DetailField label="Payment Method">
                  {RECEIPT_METHOD_LABELS[
                    receipt.receiptMethod
                  ] ||
                    receipt.receiptMethod ||
                    "N/A"}
                </DetailField>

                <DetailField label="Reference Number">
                  {receipt.referenceNumber || "N/A"}
                </DetailField>

                <DetailField label="Amount Received">
                  {formatPaise(receipt.amountPaise)}
                </DetailField>

                <DetailField label="Posted On">
                  {formatDate(receipt.postedAt)}
                </DetailField>

                <DetailField label="Currency">
                  {receipt.currency || "INR"}
                </DetailField>
              </div>
            </div>
          </section>

          <section className="doc-items">
            <div className="doc-panel">
              <h2 className="doc-panel-title">
                Invoice Allocations
              </h2>

              <p className="doc-note">
                Amounts allocated by this receipt—not the
                current balances of these invoices.
              </p>
            </div>

            <div className="doc-table-wrap">
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Sales Invoice</th>
                    <th>Amount Received</th>
                  </tr>
                </thead>

                <tbody>
                  {allocations.map((allocation, index) => (
                    <tr
                      key={
                        allocation.salesInvoiceId ||
                        `${allocation.invoiceNumber}-${index}`
                      }
                    >
                      <td
                        data-label="No."
                        className="doc-cell-no"
                      >
                        {index + 1}
                      </td>

                      <td
                        data-label="Sales Invoice"
                        className="doc-cell-item"
                      >
                        {allocation.invoiceNumber || "N/A"}
                      </td>

                      <td
                        data-label="Amount Received"
                        className="doc-cell-amount"
                      >
                        {formatPaise(allocation.amountPaise)}
                      </td>
                    </tr>
                  ))}

                  {!allocations.length && (
                    <tr>
                      <td colSpan={3}>
                        No invoice allocations were returned.
                      </td>
                    </tr>
                  )}
                </tbody>

                <tfoot>
                  <tr>
                    <td
                      colSpan={2}
                      className="doc-subtotal-label"
                    >
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
                  {receipt.notes || "No notes added."}
                </p>
              </div>

              <div className="doc-panel">
                <h2 className="doc-panel-title">
                  Accounting Entry
                </h2>

                <p className="doc-note">
                  Journal ID
                </p>

                <p style={{ overflowWrap: "anywhere" }}>
                  {journalId || "N/A"}
                </p>

                <p className="doc-note">
                  Debit {receipt.receiptLedgerName || "Cash / Bank"};
                  credit {receipt.customerName} receivable.
                </p>
              </div>
            </div>

            <div className="doc-summary">
              <div className="doc-summary-row">
                <span>Receipt Amount</span>
                <strong>
                  {formatPaise(receipt.amountPaise)}
                </strong>
              </div>

              <div className="doc-summary-row">
                <span>Total Allocated</span>
                <strong>
                  {formatPaise(allocatedTotal)}
                </strong>
              </div>

              <div className="doc-summary-row">
                <span>Invoices Allocated</span>
                <strong>{allocations.length}</strong>
              </div>

              <div className="doc-summary-total">
                <span>Total Received:</span>
                <strong>
                  {formatPaise(receipt.amountPaise)}
                </strong>
              </div>

              <p className="doc-note">
                This page is read-only. No edit or delete
                actions are available in the current receipt
                module.
              </p>
            </div>
          </section>
        </main>
      )}
    </div>
  );
}

export default CustomerReceiptDetail;