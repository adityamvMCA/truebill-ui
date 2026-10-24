import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  Receipt,
  XCircle,
} from "lucide-react";

import toast from "react-hot-toast";

import routes from "../../config/routes";
import expenseApi from "../../services/modules/expenseApi";

import Button from "../../components/common/Form/Button";
import Textarea from "../../components/common/Form/Textarea";
import ConfirmModal from "../../components/common/ConfirmModal/ConfirmModal";

import { STATUS_LABELS, formatPaise, getErrors } from "./expense.utils";

import "../../styles/invoice-common1.css";
import "./expense.css";

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const METHOD_LABELS = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  UPI: "UPI",
  CHEQUE: "Cheque",
  CARD: "Card",
};

// Which confirmation dialog is open: null | "approve" | "reject" | "cancel"
const DIALOGS = {
  approve: {
    type: "success",
    icon: CheckCircle2,
    confirmIcon: CheckCircle2,
    title: "Approve this expense?",
    confirmText: "Approve",
    cancelText: "Not Now",
    loadingText: "Approving...",
  },

  reject: {
    type: "danger",
    icon: XCircle,
    confirmIcon: XCircle,
    title: "Reject this expense?",
    confirmText: "Reject",
    cancelText: "Not Now",
    loadingText: "Rejecting...",
  },

  cancel: {
    type: "warning",
    icon: Ban,
    confirmIcon: Ban,
    title: "Cancel this expense?",
    confirmText: "Cancel Expense",
    cancelText: "Keep Expense",
    loadingText: "Cancelling...",
  },
};

function Field({ label, children }) {
  return (
    <div className="doc-detail-field">
      <p className="doc-detail-label">{label}</p>
      <div className="doc-detail-value">{children || "—"}</div>
    </div>
  );
}

function ExpenseDetail() {
  const { expenseNumber } = useParams();
  const navigate = useNavigate();

  const [expense, setExpense] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);

  const [dialog, setDialog] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [acting, setActing] = useState(false);

  const backToList = () => navigate(routes.expenses?.list || "/expenses");

  const load = useCallback(async () => {
    setLoading(true);
    setErrors([]);

    try {
      const response = await expenseApi.getByNumber(expenseNumber);

      setExpense(response?.data?.data || null);
      setPermissions(response?.data?.permissions || {});
    } catch (error) {
      const messages = getErrors(error);

      setErrors(messages);
      toast.error(messages[0]);
    } finally {
      setLoading(false);
    }
  }, [expenseNumber]);

  useEffect(() => {
    load();
  }, [load]);

  /* ---------- Dialog handling ---------- */

  const openDialog = (name) => {
    if (acting) return;

    setRejectReason("");
    setReasonError("");
    setErrors([]);
    setDialog(name);
  };

  const closeDialog = () => {
    if (acting) return;

    setDialog(null);
    setRejectReason("");
    setReasonError("");
  };

  const confirmDialog = async () => {
    if (acting || !dialog) return;

    let request;
    let successMessage;

    if (dialog === "approve") {
      request = () => expenseApi.approve(expenseNumber);
      successMessage = `${expenseNumber} approved and posted`;
    } else if (dialog === "reject") {
      const reason = rejectReason.trim();

      if (!reason) {
        setReasonError("Enter a reason for rejecting this expense.");
        return;
      }

      request = () => expenseApi.reject(expenseNumber, reason);
      successMessage = `${expenseNumber} rejected`;
    } else {
      request = () => expenseApi.cancel(expenseNumber);
      successMessage = `${expenseNumber} cancelled`;
    }

    setActing(true);
    setErrors([]);

    try {
      await request();

      toast.success(successMessage);

      setDialog(null);
      setRejectReason("");
      setReasonError("");

      await load();
    } catch (error) {
      const messages = getErrors(error);

      // Close the dialog so the error is visible on the page.
      setDialog(null);
      setErrors(messages);
      toast.error(messages[0]);

      // The expense may have changed (for example approved by another
      // admin), so refresh the status and available actions.
      await load();
    } finally {
      setActing(false);
    }
  };

  const dialogConfig = dialog ? DIALOGS[dialog] : null;

  const dialogMessage = expense
    ? dialog === "approve"
      ? `${expense.expenseNumber} for ${formatPaise(expense.totalAmountPaise)} will be posted to the accounts. This cannot be undone.`
      : dialog === "reject"
        ? `${expense.expenseNumber} for ${formatPaise(expense.totalAmountPaise)} will be rejected. No accounting entry will be made.`
        : `${expense.expenseNumber} for ${formatPaise(expense.totalAmountPaise)} will be cancelled. No accounting entry will be made.`
    : "";

  /* ---------- Render ---------- */

  const status = expense?.status;

  const statusBadge = status && (
    <span className={`exp-status exp-status-${status.toLowerCase()}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );

  const actions = (
    <>
      {permissions.canApprove && (
        <Button
          type="button"
          icon={CheckCircle2}
          disabled={acting}
          onClick={() => openDialog("approve")}
        >
          Approve
        </Button>
      )}

      {permissions.canReject && (
        <Button
          type="button"
          variant="secondary"
          icon={XCircle}
          disabled={acting}
          onClick={() => openDialog("reject")}
        >
          Reject
        </Button>
      )}

      {permissions.canCancel && (
        <Button
          type="button"
          variant="secondary"
          icon={Ban}
          disabled={acting}
          onClick={() => openDialog("cancel")}
        >
          Cancel
        </Button>
      )}
    </>
  );

  const hasActions =
    permissions.canApprove || permissions.canReject || permissions.canCancel;

  return (
    <div className="doc-page doc-detail-page">
      <header className="doc-header">
        <div className="doc-header-left">
          <Button
            type="button"
            variant="secondary"
            icon={ArrowLeft}
            onClick={backToList}
          >
            Back
          </Button>

          <div className="doc-title exp-header-title">
            <Receipt size={18} />
            <span>{expense?.expenseNumber || expenseNumber}</span>
            {statusBadge}
          </div>
        </div>

        <div className="doc-header-actions">{actions}</div>
      </header>

      {(loading || errors.length > 0) && (
        <div className="doc-alerts">
          {loading && (
            <div className="doc-alert" role="status">
              Loading expense...
            </div>
          )}

          {errors.length > 0 && (
            <div className="doc-alert doc-alert-error" role="alert">
              <strong>Something went wrong</strong>

              <ul>
                {errors.map((message, index) => (
                  <li key={`${index}-${message}`}>{message}</li>
                ))}
              </ul>

              <Button type="button" variant="secondary" onClick={load}>
                Retry
              </Button>
            </div>
          )}
        </div>
      )}

      {expense && (
        <main className="doc-main">
          <section className="doc-top">
            <div className="doc-panel doc-party-panel">
              <h2 className="doc-panel-title">
                {expense.paymentMode === "PAID" ? "Paid From" : "Payable To"}
              </h2>

              {expense.paymentMode === "PAID" ? (
                <div className="doc-party-card">
                  <div className="doc-avatar">
                    {(expense.paymentLedgerName || "?").charAt(0).toUpperCase()}
                  </div>

                  <div className="doc-party-copy">
                    <h3>{expense.paymentLedgerName}</h3>
                    <p>{expense.paymentLedgerCode}</p>
                    <p>
                      <span>Method:</span>{" "}
                      {METHOD_LABELS[expense.paymentMethod] ||
                        expense.paymentMethod}
                    </p>
                    <p>
                      <span>Paid to:</span> {expense.payeeName || "Not provided"}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="doc-party-card">
                  <div className="doc-avatar">
                    {(expense.supplierName || "?").charAt(0).toUpperCase()}
                  </div>

                  <div className="doc-party-copy">
                    <h3>{expense.supplierName}</h3>
                    <p>{expense.supplierCode}</p>
                    <p>Pay later through Supplier Payments.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="doc-panel">
              <h2 className="doc-panel-title">Expense Details</h2>

              {status === "REJECTED" && expense.rejectionReason && (
                <div className="exp-reason">
                  <strong>Rejected:</strong> {expense.rejectionReason}
                </div>
              )}

              <div className="doc-fields-grid">
                <Field label="Expense Number">{expense.expenseNumber}</Field>
                <Field label="Status">{statusBadge}</Field>
                <Field label="Expense Date">
                  {formatDate(expense.expenseDate)}
                </Field>
                <Field label="Reference">{expense.referenceNumber}</Field>
                <Field label="Tax Treatment">
                  {expense.taxMode === "GST" ? "GST (input credit)" : "No GST"}
                </Field>
                <Field label="Created">{formatDateTime(expense.createdAt)}</Field>

                {status === "APPROVED" && (
                  <>
                    <Field label="Approved On">
                      {formatDateTime(expense.approvedAt)}
                    </Field>
                    <Field label="Journal">{expense.journalNumber}</Field>
                  </>
                )}

                {status === "REJECTED" && (
                  <Field label="Rejected On">
                    {formatDateTime(expense.rejectedAt)}
                  </Field>
                )}

                {status === "CANCELLED" && (
                  <Field label="Cancelled On">
                    {formatDateTime(expense.cancelledAt)}
                  </Field>
                )}
              </div>
            </div>
          </section>

          <section className="doc-items">
            <div className="doc-table-wrap">
              <table className="doc-table exp-table exp-table-detail">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Expense Account</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>GST</th>
                    <th>Total</th>
                  </tr>
                </thead>

                <tbody>
                  {(expense.lines || []).map((line, index) => (
                    <tr key={`${line.ledgerCode}-${index}`}>
                      <td data-label="No." className="doc-cell-no">
                        {index + 1}
                      </td>

                      <td data-label="Expense Account" className="doc-cell-item">
                        {line.ledgerName}
                        <small className="doc-item-meta">{line.ledgerCode}</small>
                      </td>

                      <td data-label="Description" className="doc-cell-item">
                        {line.description}
                      </td>

                      <td data-label="Amount">{formatPaise(line.amountPaise)}</td>

                      <td data-label="GST">
                        {formatPaise(line.taxPaise)}
                        {line.gstRate ? (
                          <small className="doc-item-meta">{line.gstRate}%</small>
                        ) : null}
                      </td>

                      <td data-label="Total" className="doc-cell-amount">
                        {formatPaise(line.totalPaise)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="doc-bottom">
            <div className="doc-extras">
              <div className="doc-panel">
                <h2 className="doc-panel-title">Notes</h2>
                <div className="doc-detail-value">{expense.notes || "—"}</div>
              </div>
            </div>

            <div className="doc-summary">
              <div className="doc-summary-row">
                <span>Amount (before GST)</span>
                <strong>{formatPaise(expense.taxableTotalPaise)}</strong>
              </div>

              {expense.taxMode === "GST" && (
                <div className="doc-summary-row">
                  <span>Input GST</span>
                  <strong>{formatPaise(expense.taxTotalPaise)}</strong>
                </div>
              )}

              <div className="doc-summary-total">
                <span>Total Amount:</span>
                <strong>{formatPaise(expense.totalAmountPaise)}</strong>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* Mobile footer actions (the header actions are shown on desktop). */}
      {expense && hasActions && (
        <div className="doc-mobile-bar">
          <div className="doc-mobile-total">
            <span>Total</span>
            <strong>{formatPaise(expense.totalAmountPaise)}</strong>
          </div>

          <div className="doc-mobile-actions">{actions}</div>
        </div>
      )}

      {/* ---------- Confirmation dialogs ---------- */}
      <ConfirmModal
        open={Boolean(dialogConfig)}
        type={dialogConfig?.type}
        icon={dialogConfig?.icon}
        confirmIcon={dialogConfig?.confirmIcon}
        title={dialogConfig?.title}
        message={dialogMessage}
        confirmText={dialogConfig?.confirmText}
        cancelText={dialogConfig?.cancelText}
        loadingText={dialogConfig?.loadingText}
        loading={acting}
        closeOnBackdrop={!acting}
        onConfirm={confirmDialog}
        onCancel={closeDialog}
      >
        {dialog === "reject" && (
          <div className="exp-reject-reason">
            <Textarea
              label="Reason for rejection"
              name="rejectReason"
              value={rejectReason}
              onChange={(event) => {
                setRejectReason(event.target.value);
                setReasonError("");
              }}
              maxLength={500}
              rows={3}
              placeholder="Tell the creator why this was rejected..."
              disabled={acting}
              required
            />

            {reasonError && (
              <p className="exp-reason-error" role="alert">
                {reasonError}
              </p>
            )}
          </div>
        )}
      </ConfirmModal>
    </div>
  );
}

export default ExpenseDetail;