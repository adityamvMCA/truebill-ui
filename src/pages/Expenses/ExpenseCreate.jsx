import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  ChevronDown,
  Plus,
  Receipt,
  Save,
  StickyNote,
  Trash2,
} from "lucide-react";

import toast from "react-hot-toast";

import api from "../../services/api";
import routes from "../../config/routes";

import Input from "../../components/common/Form/Input";
import Select from "../../components/common/Form/Select";
import Textarea from "../../components/common/Form/Textarea";
import Button from "../../components/common/Form/Button";

import {
  EMPTY_EXPENSE_TOTALS,
  EXPENSE_TAX_OPTIONS,
  GST_RATES,
  PAYMENT_METHODS,
  PAYMENT_MODES,
  calculateExpenseLine,
  formatPaise,
  getErrors,
  loadAllPages,
  localDate,
  newRequestId,
} from "./expense.utils";

import "../../styles/invoice-common1.css";
import "./expense.css";
import expenseApi from "../../services/modules/expenseApi";

const supplierApi = api.suppliers || api.supplier;


const initialForm = () => ({
  expenseDate: localDate(),
  paymentMode: "PAID",
  paymentMethod: "CASH",
  paymentLedgerId: "",
  supplierId: "",
  payeeName: "",
  referenceNumber: "",
  taxMode: "NONE",
  inputGstLedgerId: "",
  notes: "",
});

let rowCounter = 0;

const newLine = () => ({
  rowId: `expense-line-${++rowCounter}`,
  expenseLedgerId: "",
  description: "",
  amount: "",
  gstRate: 0,
});

const lineSnapshot = (lines) =>
  lines.map((line) => ({
    expenseLedgerId: line.expenseLedgerId,
    description: line.description,
    amount: line.amount,
    gstRate: line.gstRate,
  }));

function ExpenseCreate() {
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [lines, setLines] = useState(() => [newLine()]);

  const [suppliers, setSuppliers] = useState([]);
  const [options, setOptions] = useState({
    expenseLedgers: [],
    paymentLedgers: [],
    taxLedgers: [],
  });

  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [errors, setErrors] = useState([]);
  const [showNotes, setShowNotes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uncertainResult, setUncertainResult] = useState(false);

  const submitLock = useRef(false);

  // One key per create attempt. The server returns the same expense if a
  // request is retried with the same key.
  const requestId = useRef(newRequestId());

  const initialSnapshot = useRef(
    JSON.stringify({ form, lines: lineSnapshot(lines) }),
  );

  const disabled = loading || loadFailed || saving || uncertainResult;
  const isPaid = form.paymentMode === "PAID";

  /* ---------- Load ledgers and suppliers ---------- */

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadFailed(false);
      setErrors([]);

      try {
        const [optionsResponse, supplierRecords] = await Promise.all([
          expenseApi.getOptions(),
          loadAllPages(supplierApi, "suppliers"),
        ]);

        if (cancelled) return;

        const data = optionsResponse?.data?.data || {};

        setOptions({
          expenseLedgers: data.expenseLedgers || [],
          paymentLedgers: data.paymentLedgers || [],
          taxLedgers: data.taxLedgers || [],
        });

        setSuppliers(
          supplierRecords.filter(
            (supplier) => supplier.status === "Active" && !supplier.isDeleted,
          ),
        );
      } catch (error) {
        if (cancelled) return;

        const messages = getErrors(error);

        setErrors(messages);
        setLoadFailed(true);
        toast.error(messages[0]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  /* ---------- Derived data ---------- */

  const selectedSupplier = useMemo(
    () => suppliers.find((supplier) => supplier._id === form.supplierId),
    [suppliers, form.supplierId],
  );

  // CASH method -> cash ledgers; every other method -> bank ledgers.
  const paymentLedgerOptions = useMemo(() => {
    const wanted = form.paymentMethod === "CASH" ? "CASH" : "BANK";

    return options.paymentLedgers
      .filter((ledger) => ledger.type === wanted)
      .map((ledger) => ({
        value: ledger._id,
        label: `${ledger.name} (${ledger.code})`,
      }));
  }, [options.paymentLedgers, form.paymentMethod]);

  const selectedPaymentLedger = useMemo(
    () =>
      options.paymentLedgers.find(
        (ledger) => ledger._id === form.paymentLedgerId,
      ),
    [options.paymentLedgers, form.paymentLedgerId],
  );

  const previews = useMemo(
    () => lines.map((line) => calculateExpenseLine(line, form.taxMode)),
    [lines, form.taxMode],
  );

  const totals = useMemo(
    () =>
      previews.reduce(
        (result, preview) => ({
          taxable: result.taxable + preview.taxable,
          tax: result.tax + preview.tax,
          total: result.total + preview.total,
        }),
        { ...EMPTY_EXPENSE_TOTALS },
      ),
    [previews],
  );

  const isDirty =
    JSON.stringify({ form, lines: lineSnapshot(lines) }) !==
    initialSnapshot.current;

  /* ---------- Handlers ---------- */

  const handleFieldChange = (event) => {
    if (disabled) return;

    const { name, value } = event.target;

    setForm((previous) => ({ ...previous, [name]: value }));
    setErrors([]);
  };

  const handlePaymentModeChange = (event) => {
    if (disabled) return;

    const paymentMode = event.target.value;

    setForm((previous) => ({
      ...previous,
      paymentMode,
      paymentLedgerId: "",
      supplierId: "",
    }));

    setErrors([]);
  };

  const handlePaymentMethodChange = (event) => {
    if (disabled) return;

    // Cash and bank ledgers differ, so clear the chosen ledger.
    setForm((previous) => ({
      ...previous,
      paymentMethod: event.target.value,
      paymentLedgerId: "",
    }));

    setErrors([]);
  };

  const handleTaxModeChange = (event) => {
    if (disabled) return;

    const taxMode = event.target.value;

    setForm((previous) => ({
      ...previous,
      taxMode,
      inputGstLedgerId: taxMode === "NONE" ? "" : previous.inputGstLedgerId,
    }));

    if (taxMode === "NONE") {
      setLines((previous) =>
        previous.map((line) => ({ ...line, gstRate: 0 })),
      );
    }

    setErrors([]);
  };

  const updateLine = (rowId, field, value) => {
    if (disabled) return;

    setLines((previous) =>
      previous.map((line) =>
        line.rowId === rowId ? { ...line, [field]: value } : line,
      ),
    );

    setErrors([]);
  };

  /* ---------- Validation and save ---------- */

  const validateForm = () => {
    const messages = [];

    if (!form.expenseDate) messages.push("Expense date is required.");

    if (isPaid) {
      if (!form.paymentLedgerId) {
        messages.push(
          form.paymentMethod === "CASH"
            ? "Select the cash ledger used for payment."
            : "Select the bank ledger used for payment.",
        );
      }
    } else if (!selectedSupplier) {
      messages.push("Select a supplier for a pay-later expense.");
    } else if (!selectedSupplier.ledgerId) {
      messages.push("The selected supplier has no linked accounting ledger.");
    }

    if (!lines.length || lines.length > 100) {
      messages.push("Add between 1 and 100 expense lines.");
    }

    lines.forEach((line, index) => {
      if (!line.expenseLedgerId) {
        messages.push(`Select an expense account for line ${index + 1}.`);
      }

      if (!line.description.trim()) {
        messages.push(`Enter a description for line ${index + 1}.`);
      }

      if (!previews[index].valid) {
        messages.push(`Check the amount and GST for line ${index + 1}.`);
      }
    });

    if (totals.tax > 0 && !form.inputGstLedgerId) {
      messages.push("Select the Input GST ledger.");
    }

    if (!Number.isSafeInteger(totals.total) || totals.total <= 0) {
      messages.push("The expense must have a positive total.");
    }

    if (
      isPaid &&
      selectedPaymentLedger &&
      selectedPaymentLedger.currentBalanceType === "DEBIT" &&
      Math.round(selectedPaymentLedger.currentBalance * 100) < totals.total
    ) {
      // Warning only: the balance is enforced again when it is approved.
      toast(`${selectedPaymentLedger.name} may not have enough balance.`, {
        icon: "⚠️",
      });
    }

    return messages;
  };

  const saveExpense = async () => {
    if (disabled || submitLock.current) return;

    const messages = validateForm();

    if (messages.length) {
      setErrors(messages);
      toast.error(messages[0]);
      return;
    }

    submitLock.current = true;
    setSaving(true);
    setErrors([]);

    let saved;

    try {
      const payload = {
        requestId: requestId.current,
        expenseDate: form.expenseDate,
        paymentMode: form.paymentMode,

        ...(isPaid
          ? {
              paymentMethod: form.paymentMethod,
              paymentLedgerId: form.paymentLedgerId,
            }
          : { supplierId: form.supplierId }),

        payeeName: form.payeeName.trim() || null,
        referenceNumber: form.referenceNumber.trim() || null,

        taxMode: form.taxMode,
        inputGstLedgerId:
          form.taxMode === "GST" && totals.tax > 0
            ? form.inputGstLedgerId
            : null,

        lines: lines.map((line) => ({
          expenseLedgerId: line.expenseLedgerId,
          description: line.description.trim(),
          amount: Number(line.amount),
          gstRate: form.taxMode === "GST" ? Number(line.gstRate) : 0,
        })),

        notes: form.notes.trim() || null,
      };

      const response = await expenseApi.create(payload);

      saved = response?.data?.data;

      if (!saved?.expenseNumber || saved.status !== "NEW") {
        throw new Error(
          "The server did not confirm the expense. Check the expense list before submitting again.",
        );
      }
    } catch (error) {
      const status = error?.response?.status;

      if (!status || status >= 500 || status === 408) {
        setUncertainResult(true);
      }

      const requestErrors = getErrors(error);

      setErrors(requestErrors);
      toast.error(requestErrors[0]);

      return;
    } finally {
      submitLock.current = false;
      setSaving(false);
    }

    toast.success(`${saved.expenseNumber} created and sent for approval`);

    navigate(routes.expenses?.list || "/expenses", { replace: true });
  };

  const exitPage = () => {
    if (submitLock.current) return;

    const message = uncertainResult
      ? "Open Expenses to verify whether this expense was created?"
      : "Discard this expense and leave?";

    if ((isDirty || uncertainResult) && !window.confirm(message)) return;

    navigate(routes.expenses?.list || "/expenses");
  };

  const actionButtons = (
    <Button
      type="button"
      icon={Save}
      disabled={disabled}
      loading={saving}
      onClick={saveExpense}
    >
      {saving ? "Creating..." : "Create Expense"}
    </Button>
  );

  const supplierAddress = selectedSupplier
    ? [
        selectedSupplier.billingAddress,
        selectedSupplier.city,
        selectedSupplier.state,
        selectedSupplier.pincode,
      ]
        .filter(Boolean)
        .join(", ")
    : "";

  return (
    <div className="doc-page">
      <form noValidate onSubmit={(event) => event.preventDefault()}>
        <header className="doc-header">
          <div className="doc-header-left">
            <Button
              type="button"
              variant="secondary"
              icon={ArrowLeft}
              disabled={saving}
              onClick={exitPage}
            >
              Exit
            </Button>

            <div className="doc-title">
              <Receipt size={18} />
              <span>Create Expense</span>
            </div>
          </div>

          <div className="doc-header-actions">{actionButtons}</div>
        </header>

        {(loading || errors.length > 0) && (
          <div className="doc-alerts">
            {loading && (
              <div className="doc-alert" role="status">
                Loading ledgers and suppliers...
              </div>
            )}

            {errors.length > 0 && (
              <div className="doc-alert doc-alert-error" role="alert">
                <strong>Please review the following</strong>

                <ul>
                  {errors.map((message, index) => (
                    <li key={`${index}-${message}`}>{message}</li>
                  ))}
                </ul>

                {loadFailed && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setReloadKey((value) => value + 1)}
                  >
                    Retry Loading
                  </Button>
                )}

                {uncertainResult && (
                  <Button type="button" variant="secondary" onClick={exitPage}>
                    Check Expenses
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        <fieldset className="doc-fieldset" disabled={disabled}>
          <main className="doc-main">
            <section className="doc-top">
              {/* ---------- Payment ---------- */}
              <div className="doc-panel doc-party-panel">
                <h2 className="doc-panel-title">Payment</h2>

                <div className="doc-fields-grid">
                  <Select
                    label="Payment"
                    name="paymentMode"
                    value={form.paymentMode}
                    options={PAYMENT_MODES}
                    onChange={handlePaymentModeChange}
                  />

                  {isPaid && (
                    <Select
                      label="Payment Method"
                      name="paymentMethod"
                      value={form.paymentMethod}
                      options={PAYMENT_METHODS}
                      onChange={handlePaymentMethodChange}
                    />
                  )}
                </div>

                {isPaid ? (
                  <>
                    <div className="doc-fields-grid" style={{ marginTop: 16 }}>
                      <Select
                        label={
                          form.paymentMethod === "CASH"
                            ? "Paid From (Cash)"
                            : "Paid From (Bank)"
                        }
                        name="paymentLedgerId"
                        value={form.paymentLedgerId}
                        placeholder="Select ledger"
                        options={paymentLedgerOptions}
                        onChange={handleFieldChange}
                        required
                      />

                      <Input
                        label="Paid To (optional)"
                        name="payeeName"
                        value={form.payeeName}
                        onChange={handleFieldChange}
                        maxLength={150}
                        placeholder="Shop / person name"
                      />
                    </div>

                    {selectedPaymentLedger && (
                      <p className="exp-balance-hint">
                        Recorded balance:{" "}
                        {formatPaise(
                          Math.round(selectedPaymentLedger.currentBalance * 100),
                        )}{" "}
                        {selectedPaymentLedger.currentBalanceType === "DEBIT"
                          ? "Dr"
                          : "Cr"}
                      </p>
                    )}
                  </>
                ) : (
                  <div style={{ marginTop: 16 }}>
                    <Select
                      label="Supplier"
                      name="supplierId"
                      value={form.supplierId}
                      placeholder="Select supplier"
                      options={suppliers.map((supplier) => ({
                        value: supplier._id,
                        label: `${supplier.supplierName} (${supplier.supplierCode})`,
                      }))}
                      onChange={handleFieldChange}
                      required
                    />

                    {selectedSupplier && (
                      <div className="doc-party-card" style={{ marginTop: 14 }}>
                        <div className="doc-avatar">
                          {selectedSupplier.supplierName
                            ?.charAt(0)
                            .toUpperCase()}
                        </div>

                        <div className="doc-party-copy">
                          <h3>{selectedSupplier.supplierName}</h3>
                          <p>{selectedSupplier.supplierCode}</p>
                          <p>
                            <span>Address:</span>{" "}
                            {supplierAddress || "Not provided"}
                          </p>
                          <p>
                            <span>GSTIN:</span>{" "}
                            {selectedSupplier.gstNo || "Not provided"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ---------- Details ---------- */}
              <div className="doc-panel">
                <h2 className="doc-panel-title">Expense Details</h2>

                <div className="exp-info">
                  New expenses wait for admin approval. No accounting entry is
                  made until an admin approves.
                </div>

                <div className="doc-fields-grid">
                  <Input
                    label="Expense Number"
                    name="expenseNumber"
                    value="Generated after creation"
                    readOnly
                  />

                  <Input
                    label="Expense Date"
                    name="expenseDate"
                    type="date"
                    value={form.expenseDate}
                    onChange={handleFieldChange}
                    required
                  />

                  <Input
                    label="Reference / Bill No."
                    name="referenceNumber"
                    value={form.referenceNumber}
                    onChange={handleFieldChange}
                    maxLength={100}
                    placeholder="Receipt or bill reference"
                  />

                  <Select
                    label="Tax Treatment"
                    name="taxMode"
                    value={form.taxMode}
                    options={EXPENSE_TAX_OPTIONS}
                    onChange={handleTaxModeChange}
                  />

                  {form.taxMode === "GST" && (
                    <Select
                      label="Input GST Ledger"
                      name="inputGstLedgerId"
                      value={form.inputGstLedgerId}
                      placeholder="Select Input GST ledger"
                      options={options.taxLedgers.map((ledger) => ({
                        value: ledger._id,
                        label: `${ledger.name} (${ledger.code})`,
                      }))}
                      onChange={handleFieldChange}
                    />
                  )}
                </div>
              </div>
            </section>

            {/* ---------- Lines ---------- */}
            <section className="doc-items">
              <div className="doc-table-wrap">
                <table className="doc-table exp-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Expense Account</th>
                      <th>Description</th>
                      <th>Amount (₹)</th>
                      <th>GST</th>
                      <th>Total</th>
                      <th>
                        <span className="doc-sr-only">Remove</span>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {lines.map((line, index) => (
                      <tr key={line.rowId}>
                        <td data-label="No." className="doc-cell-no">
                          {index + 1}
                        </td>

                        <td data-label="Expense Account" className="doc-cell-item">
                          <Select
                            name={`ledger-${line.rowId}`}
                            aria-label={`Expense account ${index + 1}`}
                            value={line.expenseLedgerId}
                            placeholder="Select expense account"
                            options={options.expenseLedgers.map((ledger) => ({
                              value: ledger._id,
                              label: `${ledger.name} (${ledger.code})`,
                            }))}
                            onChange={(event) =>
                              updateLine(
                                line.rowId,
                                "expenseLedgerId",
                                event.target.value,
                              )
                            }
                          />
                        </td>

                        <td data-label="Description" className="doc-cell-item">
                          <Input
                            name={`description-${line.rowId}`}
                            aria-label={`Description ${index + 1}`}
                            value={line.description}
                            maxLength={300}
                            placeholder="What was this for?"
                            onChange={(event) =>
                              updateLine(
                                line.rowId,
                                "description",
                                event.target.value,
                              )
                            }
                          />
                        </td>

                        <td data-label="Amount (₹)">
                          <Input
                            name={`amount-${line.rowId}`}
                            aria-label={`Amount ${index + 1}`}
                            type="number"
                            inputMode="decimal"
                            min="0.01"
                            max="1000000000"
                            step="0.01"
                            value={line.amount}
                            placeholder="0.00"
                            onChange={(event) =>
                              updateLine(
                                line.rowId,
                                "amount",
                                event.target.value,
                              )
                            }
                          />
                        </td>

                        <td data-label="GST">
                          <Select
                            name={`gst-${line.rowId}`}
                            aria-label={`GST ${index + 1}`}
                            value={line.gstRate}
                            disabled={form.taxMode === "NONE"}
                            options={GST_RATES.map((rate) => ({
                              value: rate,
                              label: `${rate}%`,
                            }))}
                            onChange={(event) =>
                              updateLine(
                                line.rowId,
                                "gstRate",
                                Number(event.target.value),
                              )
                            }
                          />
                        </td>

                        <td data-label="Total" className="doc-cell-amount">
                          {formatPaise(previews[index].total)}
                        </td>

                        <td data-label="Remove" className="doc-cell-action">
                          <button
                            type="button"
                            className="doc-remove-button"
                            aria-label={`Remove line ${index + 1}`}
                            disabled={lines.length === 1}
                            onClick={() => {
                              setLines((previous) =>
                                previous.filter(
                                  (record) => record.rowId !== line.rowId,
                                ),
                              );

                              setErrors([]);
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  <tfoot>
                    <tr>
                      <td colSpan={3} className="doc-subtotal-label">
                        Subtotal
                      </td>
                      <td className="doc-subtotal-value">
                        {formatPaise(totals.taxable)}
                      </td>
                      <td className="doc-subtotal-value">
                        {formatPaise(totals.tax)}
                      </td>
                      <td className="doc-subtotal-value">
                        {formatPaise(totals.total)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="doc-add-item-row">
                <button
                  type="button"
                  className="doc-dashed-line"
                  disabled={lines.length >= 100}
                  onClick={() => {
                    setLines((previous) => [...previous, newLine()]);
                    setErrors([]);
                  }}
                >
                  <Plus size={15} />
                  Add Expense Line
                </button>
              </div>
            </section>

            {/* ---------- Notes + summary ---------- */}
            <section className="doc-bottom">
              <div className="doc-extras">
                <button
                  type="button"
                  className={`doc-extra-row ${showNotes ? "is-open" : ""}`}
                  aria-expanded={showNotes}
                  onClick={() => setShowNotes((previous) => !previous)}
                >
                  <StickyNote size={16} />
                  <span>Add Notes</span>
                  <ChevronDown size={16} />
                </button>

                {showNotes && (
                  <div className="doc-extra-content">
                    <Textarea
                      name="notes"
                      value={form.notes}
                      onChange={handleFieldChange}
                      maxLength={1000}
                      rows={4}
                      placeholder="Anything the approver should know..."
                    />
                  </div>
                )}

                <p className="doc-note">
                  {isPaid
                    ? "On approval, the amount is deducted from the selected cash or bank ledger."
                    : "On approval, the amount is added to the supplier's payable balance. Pay it later through Supplier Payments."}
                </p>
              </div>

              <div className="doc-summary">
                <div className="doc-summary-row">
                  <span>Amount (before GST)</span>
                  <strong>{formatPaise(totals.taxable)}</strong>
                </div>

                {form.taxMode === "GST" && (
                  <div className="doc-summary-row">
                    <span>Input GST</span>
                    <strong>{formatPaise(totals.tax)}</strong>
                  </div>
                )}

                <div className="doc-summary-total">
                  <span>Total Amount:</span>
                  <strong>{formatPaise(totals.total)}</strong>
                </div>

                <p className="doc-note">The server calculates final totals.</p>
              </div>
            </section>
          </main>
        </fieldset>

        <div className="doc-mobile-bar">
          <div className="doc-mobile-total">
            <span>Total</span>
            <strong>{formatPaise(totals.total)}</strong>
          </div>

          <div className="doc-mobile-actions">{actionButtons}</div>
        </div>
      </form>
    </div>
  );
}

export default ExpenseCreate;
