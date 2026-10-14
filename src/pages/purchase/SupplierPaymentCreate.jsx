import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  ChevronDown,
  Plus,
  Send,
  StickyNote,
  Trash2,
  Wallet,
} from "lucide-react";

import toast from "react-hot-toast";

import api from "../../services/api";
import routes from "../../config/routes";

import Input from "../../components/common/Form/Input";
import Select from "../../components/common/Form/Select";
import Textarea from "../../components/common/Form/Textarea";
import Button from "../../components/common/Form/Button";

import "../../styles/invoice-common1.css";

const METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "UPI", label: "UPI" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "CARD", label: "Card" },
];

const moneyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatPaise = (value) =>
  moneyFormatter.format((Number(value) || 0) / 100);

const localDate = () => {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
};

const initialForm = () => ({
  supplierId: "",
  paymentLedgerId: "",
  paymentDate: localDate(),
  paymentMethod: "CASH",
  referenceNumber: "",
  amount: "",
  notes: "",
});

let nextRowId = 0;

const newAllocation = () => ({
  rowId: `supplier-payment-${++nextRowId}`,
  purchaseBillId: "",
  amount: "",
});

// Returns null rather than rounding invalid decimal input.
const toPaise = (value) => {
  const text = String(value ?? "").trim();

  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;

  const [whole, decimal = ""] = text.split(".");
  const amount = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));

  return Number.isSafeInteger(amount) ? amount : null;
};

const getErrors = (error) => {
  const body = error?.response?.data;

  if (Array.isArray(body?.errors) && body.errors.length) {
    return body.errors.map((item) =>
      typeof item === "string"
        ? item
        : item?.message || item?.msg || String(item),
    );
  }

  return [body?.message || error?.message || "Unable to complete the request."];
};

const loadAllPages = async (fetchPage, fallbackKey) => {
  const extract = (response) => {
    const body = response?.data;
    const records = body?.data ?? body?.[fallbackKey];

    if (!Array.isArray(records)) {
      throw new Error(`Invalid ${fallbackKey} list response.`);
    }

    return records;
  };

  const first = await fetchPage({ page: 1, limit: 100 });
  const records = [...extract(first)];

  const pages = Math.max(1, Number(first?.data?.pagination?.totalPages) || 1);

  for (let page = 2; page <= pages; page += 1) {
    const response = await fetchPage({ page, limit: 100 });
    records.push(...extract(response));
  }

  return Array.from(
    new Map(records.map((record) => [record._id, record])).values(),
  );
};

const formatAddress = (supplier) =>
  [
    supplier?.billingAddress,
    supplier?.city,
    supplier?.state,
    supplier?.pincode,
    supplier?.country,
  ]
    .filter(Boolean)
    .join(", ");

function SupplierPaymentCreate() {
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [allocations, setAllocations] = useState(() => [newAllocation()]);

  const [suppliers, setSuppliers] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [bills, setBills] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [billsLoading, setBillsLoading] = useState(false);
  const [billsFailed, setBillsFailed] = useState(false);
  const [billReloadKey, setBillReloadKey] = useState(0);

  const [saving, setSaving] = useState(false);
  const [retryPending, setRetryPending] = useState(false);
  const [errors, setErrors] = useState([]);
  const [showNotes, setShowNotes] = useState(false);

  const submitLock = useRef(false);
  const pendingPayload = useRef(null);
  const initialSnapshot = useRef(JSON.stringify(form));

  const disabled = loading || loadFailed || saving || retryPending;

  useEffect(() => {
    let cancelled = false;

    const loadOptions = async () => {
      setLoading(true);
      setLoadFailed(false);
      setErrors([]);

      try {
        const [supplierRecords, ledgerResponse] = await Promise.all([
          loadAllPages((params) => api.suppliers.getAll(params), "suppliers"),
          api.supplierPayments.getPaymentLedgers(),
        ]);

        if (cancelled) return;

        if (!Array.isArray(ledgerResponse?.data?.data)) {
          throw new Error("Invalid payment ledger response.");
        }

        setSuppliers(
          supplierRecords.filter(
            (supplier) => supplier.status === "Active" && !supplier.isDeleted,
          ),
        );

        setLedgers(
          ledgerResponse.data.data.filter(
            (ledger) => ledger.isActive !== false,
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

    loadOptions();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    let cancelled = false;

    setBills([]);
    setBillsFailed(false);

    if (!form.supplierId) {
      setBillsLoading(false);
      return undefined;
    }

    const loadBills = async () => {
      setBillsLoading(true);

      try {
        const records = await loadAllPages(
          (params) =>
            api.supplierPayments.getUnpaidBills({
              ...params,
              supplierId: form.supplierId,
            }),
          "bills",
        );

        if (!cancelled) {
          setBills(
            records.filter((bill) => Number(bill.outstandingAmountPaise) > 0),
          );
        }
      } catch (error) {
        if (cancelled) return;

        const messages = getErrors(error);
        setErrors(messages);
        setBillsFailed(true);
        toast.error(messages[0]);
      } finally {
        if (!cancelled) setBillsLoading(false);
      }
    };

    loadBills();

    return () => {
      cancelled = true;
    };
  }, [form.supplierId, billReloadKey]);

  const selectedSupplier = useMemo(
    () => suppliers.find((item) => item._id === form.supplierId),
    [suppliers, form.supplierId],
  );

  const expectedLedgerType = form.paymentMethod === "CASH" ? "CASH" : "BANK";

  const availableLedgers = useMemo(
    () => ledgers.filter((item) => item.type === expectedLedgerType),
    [ledgers, expectedLedgerType],
  );

  const billMap = useMemo(
    () => new Map(bills.map((bill) => [bill._id, bill])),
    [bills],
  );

  const paymentPaise = toPaise(form.amount);

  const allocatedPaise = allocations.reduce(
    (total, allocation) => total + (toPaise(allocation.amount) ?? 0),
    0,
  );

  const totalsMatch =
    paymentPaise !== null &&
    paymentPaise > 0 &&
    paymentPaise === allocatedPaise;

  const isDirty =
    JSON.stringify(form) !== initialSnapshot.current ||
    allocations.length !== 1 ||
    allocations.some(
      (allocation) => allocation.purchaseBillId || allocation.amount,
    );

  const handleFieldChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
      ...(name === "paymentMethod" ? { paymentLedgerId: "" } : {}),
    }));

    setErrors([]);
  };

  const handleSupplierChange = (event) => {
    setForm((previous) => ({
      ...previous,
      supplierId: event.target.value,
    }));

    setAllocations([newAllocation()]);
    setErrors([]);
  };

  const updateAllocation = (rowId, field, value) => {
    setAllocations((previous) =>
      previous.map((allocation) => {
        if (allocation.rowId !== rowId) return allocation;

        if (field === "purchaseBillId") {
          const bill = billMap.get(value);

          return {
            ...allocation,
            purchaseBillId: value,
            amount: bill ? (bill.outstandingAmountPaise / 100).toFixed(2) : "",
          };
        }

        return { ...allocation, [field]: value };
      }),
    );

    setErrors([]);
  };

  const validateForm = () => {
    const messages = [];

    if (!selectedSupplier) {
      messages.push("Select a supplier.");
    } else if (!selectedSupplier.ledgerId) {
      messages.push("The supplier has no linked accounting ledger.");
    }

    if (
      !availableLedgers.some((ledger) => ledger._id === form.paymentLedgerId)
    ) {
      messages.push(`Select an active ${expectedLedgerType} payment account.`);
    }

    if (!form.paymentDate) {
      messages.push("Payment date is required.");
    }

    if (
      paymentPaise === null ||
      paymentPaise <= 0 ||
      paymentPaise > 100000000000
    ) {
      messages.push(
        "Enter a positive payment up to ₹1,000,000,000 with at most two decimal places.",
      );
    }

    if (!allocations.length || allocations.length > 200) {
      messages.push("Add between 1 and 200 allocations.");
    }

    const selectedIds = allocations
      .map((allocation) => allocation.purchaseBillId)
      .filter(Boolean);

    if (new Set(selectedIds).size !== selectedIds.length) {
      messages.push("A purchase bill can appear only once.");
    }

    allocations.forEach((allocation, index) => {
      const bill = billMap.get(allocation.purchaseBillId);
      const amount = toPaise(allocation.amount);

      if (!bill) {
        messages.push(`Select a bill for allocation ${index + 1}.`);
        return;
      }

      if (
        amount === null ||
        amount <= 0 ||
        amount > 100000000000 ||
        amount > bill.outstandingAmountPaise
      ) {
        messages.push(
          `Check the allocation for ${bill.billNumber}; it must be positive and cannot exceed the balance.`,
        );
      }
    });

    if (!totalsMatch) {
      messages.push("Allocated amounts must equal the payment amount.");
    }

    return messages;
  };

  const savePayment = async () => {
    if (
      submitLock.current ||
      (!pendingPayload.current && (disabled || billsLoading || billsFailed))
    ) {
      return;
    }

    if (!pendingPayload.current) {
      const messages = validateForm();

      if (messages.length) {
        setErrors(messages);
        toast.error(messages[0]);
        return;
      }

      if (!globalThis.crypto?.randomUUID) {
        setErrors(["UUID generation is unavailable. Use localhost or HTTPS."]);
        return;
      }

      pendingPayload.current = {
        requestId: globalThis.crypto.randomUUID(),
        supplierId: form.supplierId,
        paymentLedgerId: form.paymentLedgerId,
        paymentDate: form.paymentDate,
        paymentMethod: form.paymentMethod,
        referenceNumber: form.referenceNumber.trim(),
        amount: paymentPaise / 100,
        allocations: allocations.map((allocation) => ({
          purchaseBillId: allocation.purchaseBillId,
          amount: toPaise(allocation.amount) / 100,
        })),
        notes: form.notes.trim(),
      };
    }

    submitLock.current = true;
    setSaving(true);
    setErrors([]);

    try {
      const response = await api.supplierPayments.create(
        pendingPayload.current,
      );

      const payment = response?.data?.payment;

      if (!payment?.paymentNumber) {
        throw new Error(
          "No payment number was returned. Retry the same submission or check the payment list.",
        );
      }

      toast.success(
        response.data.replayed
          ? `${payment.paymentNumber} was already recorded`
          : `${payment.paymentNumber} posted successfully`,
      );

      navigate(routes.supplierPayments.list, { replace: true });
    } catch (error) {
      const status = error?.response?.status;

      // Keep the exact payload after uncertain network/server outcomes.
      const uncertain = !status || status >= 500 || status === 408;

      if (!uncertain) {
        pendingPayload.current = null;
      }

      setRetryPending(uncertain);

      const messages = getErrors(error);
      setErrors(messages);
      toast.error(messages[0]);
    } finally {
      submitLock.current = false;
      setSaving(false);
    }
  };

  const exitPage = () => {
    if (saving) return;

    const message = retryPending
      ? "The payment result is uncertain. Check the payment list before creating another payment. Leave this form?"
      : "Discard this supplier payment and leave?";

    if (isDirty && !window.confirm(message)) return;

    navigate(routes.supplierPayments.list);
  };

  const actionButtons = (
    <Button
      icon={Send}
      loading={saving}
      disabled={
        saving ||
        (!retryPending &&
          (disabled || billsLoading || billsFailed || !totalsMatch))
      }
      onClick={savePayment}
    >
      {retryPending ? "Retry Same Payment" : "Save & Post"}
    </Button>
  );

  return (
    <div className="doc-page">
      <form noValidate onSubmit={(event) => event.preventDefault()}>
        <header className="doc-header">
          <div className="doc-header-left">
            <Button
              variant="secondary"
              icon={ArrowLeft}
              disabled={saving}
              onClick={exitPage}
            >
              Exit
            </Button>

            <div className="doc-title">
              <Wallet size={18} />
              <span>Create Supplier Payment</span>
            </div>
          </div>

          <div className="doc-header-actions">{actionButtons}</div>
        </header>

        {(loading || errors.length > 0 || retryPending) && (
          <div className="doc-alerts">
            {loading && (
              <div className="doc-alert" role="status">
                Loading suppliers and payment accounts...
              </div>
            )}

            {retryPending && (
              <div className="doc-alert" role="status">
                The previous submission may have reached the server. Fields are
                locked so retry sends the exact same request ID and payment
                details. This retry is retained only while this page remains
                open.
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
                    variant="secondary"
                    onClick={() => setReloadKey((value) => value + 1)}
                  >
                    Retry Loading
                  </Button>
                )}

                {billsFailed && !retryPending && (
                  <Button
                    variant="secondary"
                    onClick={() => setBillReloadKey((value) => value + 1)}
                  >
                    Retry Bills
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        <fieldset className="doc-fieldset" disabled={disabled}>
          <main className="doc-main">
            <section className="doc-top">
              <div className="doc-panel doc-party-panel">
                <h2 className="doc-panel-title">Paid To</h2>

                <Select
                  label="Supplier"
                  name="supplierId"
                  value={form.supplierId}
                  placeholder="Select supplier"
                  options={suppliers.map((supplier) => ({
                    value: supplier._id,
                    label: `${supplier.supplierName} (${supplier.supplierCode})`,
                  }))}
                  onChange={handleSupplierChange}
                  required
                />

                {selectedSupplier && (
                  <div className="doc-party-card">
                    <div className="doc-avatar">
                      {selectedSupplier.supplierName?.charAt(0).toUpperCase()}
                    </div>

                    <div className="doc-party-copy">
                      <h3>{selectedSupplier.supplierName}</h3>
                      <p>{selectedSupplier.supplierCode}</p>
                      <p>
                        <span>Address:</span>{" "}
                        {formatAddress(selectedSupplier) || "Not provided"}
                      </p>
                      <p>
                        <span>GSTIN:</span>{" "}
                        {selectedSupplier.gstNo || "Not provided"}
                      </p>
                      <p>
                        <span>Phone:</span>{" "}
                        {selectedSupplier.phone || "Not provided"}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="doc-panel">
                <h2 className="doc-panel-title">Payment Details</h2>

                <div className="doc-fields-grid">
                  <Input
                    label="Payment Number"
                    name="paymentNumber"
                    value="Generated after saving"
                    readOnly
                  />

                  <Input
                    label="Payment Date"
                    name="paymentDate"
                    type="date"
                    value={form.paymentDate}
                    onChange={handleFieldChange}
                    required
                  />

                  <Select
                    label="Payment Method"
                    name="paymentMethod"
                    value={form.paymentMethod}
                    options={METHODS}
                    onChange={handleFieldChange}
                    required
                  />

                  <Select
                    label="Paid From"
                    name="paymentLedgerId"
                    value={form.paymentLedgerId}
                    placeholder={`Select ${expectedLedgerType === "CASH" ? "Cash" : "Bank"} account`}
                    options={availableLedgers.map((ledger) => ({
                      value: ledger._id,
                      label: `${ledger.name} (${ledger.code})`,
                    }))}
                    onChange={handleFieldChange}
                    required
                  />

                  <Input
                    label="Reference Number"
                    name="referenceNumber"
                    value={form.referenceNumber}
                    onChange={handleFieldChange}
                    maxLength={100}
                    placeholder="UTR, cheque number, transaction ID"
                  />

                  <Input
                    label="Payment Amount (₹)"
                    name="amount"
                    type="number"
                    min="0.01"
                    max="1000000000"
                    step="0.01"
                    inputMode="decimal"
                    value={form.amount}
                    onChange={handleFieldChange}
                    required
                  />
                </div>
              </div>
            </section>

            <section className="doc-items">
              <div className="doc-table-wrap">
                <table className="doc-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Purchase Bill</th>
                      <th>Bill Date</th>
                      <th>Due Date</th>
                      <th>Balance</th>
                      <th>Amount Paid (₹)</th>
                      <th>
                        <span className="doc-sr-only">Remove</span>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {billsLoading ? (
                      <tr>
                        <td colSpan={7}>Loading unpaid bills...</td>
                      </tr>
                    ) : (
                      allocations.map((allocation, index) => {
                        const bill = billMap.get(allocation.purchaseBillId);

                        const options = bills
                          .filter(
                            (record) =>
                              record._id === allocation.purchaseBillId ||
                              !allocations.some(
                                (other) => other.purchaseBillId === record._id,
                              ),
                          )
                          .map((record) => ({
                            value: record._id,
                            label: `${record.billNumber} · ${formatPaise(record.outstandingAmountPaise)}`,
                          }));

                        return (
                          <tr key={allocation.rowId}>
                            <td data-label="No." className="doc-cell-no">
                              {index + 1}
                            </td>

                            <td
                              data-label="Purchase Bill"
                              className="doc-cell-item"
                            >
                              <Select
                                name={`bill-${allocation.rowId}`}
                                aria-label={`Purchase bill ${index + 1}`}
                                value={allocation.purchaseBillId}
                                placeholder="Select unpaid bill"
                                options={options}
                                disabled={!form.supplierId || billsFailed}
                                onChange={(event) =>
                                  updateAllocation(
                                    allocation.rowId,
                                    "purchaseBillId",
                                    event.target.value,
                                  )
                                }
                              />

                              {bill?.supplierInvoiceNumber && (
                                <small className="doc-item-meta">
                                  Supplier invoice: {bill.supplierInvoiceNumber}
                                </small>
                              )}
                            </td>

                            <td data-label="Bill Date">
                              {formatDate(bill?.billDate)}
                            </td>

                            <td data-label="Due Date">
                              {formatDate(bill?.dueDate)}
                            </td>

                            <td
                              data-label="Balance"
                              className="doc-cell-amount"
                            >
                              {bill
                                ? formatPaise(bill.outstandingAmountPaise)
                                : "—"}
                            </td>

                            <td data-label="Amount Paid (₹)">
                              <Input
                                name={`amount-${allocation.rowId}`}
                                aria-label={`Allocation ${index + 1} amount`}
                                type="number"
                                min="0.01"
                                max={
                                  bill
                                    ? bill.outstandingAmountPaise / 100
                                    : undefined
                                }
                                step="0.01"
                                inputMode="decimal"
                                value={allocation.amount}
                                onChange={(event) =>
                                  updateAllocation(
                                    allocation.rowId,
                                    "amount",
                                    event.target.value,
                                  )
                                }
                              />
                            </td>

                            <td data-label="Remove" className="doc-cell-action">
                              <button
                                type="button"
                                className="doc-remove-button"
                                aria-label={`Remove allocation ${index + 1}`}
                                onClick={() =>
                                  setAllocations((previous) =>
                                    previous.filter(
                                      (item) => item.rowId !== allocation.rowId,
                                    ),
                                  )
                                }
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}

                    {!billsLoading &&
                      !billsFailed &&
                      form.supplierId &&
                      !bills.length && (
                        <tr>
                          <td colSpan={7}>
                            No unpaid posted bills were returned for this
                            supplier.
                          </td>
                        </tr>
                      )}
                  </tbody>

                  <tfoot>
                    <tr>
                      <td colSpan={5} className="doc-subtotal-label">
                        Total Allocated
                      </td>
                      <td className="doc-subtotal-value">
                        {formatPaise(allocatedPaise)}
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
                  disabled={
                    billsLoading ||
                    billsFailed ||
                    !form.supplierId ||
                    allocations.length >= Math.min(200, bills.length)
                  }
                  onClick={() =>
                    setAllocations((previous) => [...previous, newAllocation()])
                  }
                >
                  <Plus size={15} />
                  Add Bill Allocation
                </button>
              </div>
            </section>

            <section className="doc-bottom">
              <div className="doc-extras">
                <button
                  type="button"
                  className={`doc-extra-row ${showNotes ? "is-open" : ""}`}
                  aria-expanded={showNotes}
                  onClick={() => setShowNotes((value) => !value)}
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
                      placeholder="Supplier payment notes..."
                    />
                  </div>
                )}

                <p className="doc-note">
                  Posting debits supplier payable and credits the selected Cash
                  or Bank account. The server validates balances and
                  allocations.
                </p>
              </div>

              <div className="doc-summary">
                <div className="doc-summary-row">
                  <span>Payment Amount</span>
                  <strong>{formatPaise(paymentPaise)}</strong>
                </div>

                <div className="doc-summary-row">
                  <span>Total Allocated</span>
                  <strong>{formatPaise(allocatedPaise)}</strong>
                </div>

                <div className="doc-summary-row">
                  <span>Unallocated / Overallocated Difference</span>
                  <strong>
                    {formatPaise(
                      Math.abs((paymentPaise ?? 0) - allocatedPaise),
                    )}
                  </strong>
                </div>

                <div className="doc-summary-total">
                  <span>Allocation:</span>
                  <strong>{totalsMatch ? "Balanced" : "Not balanced"}</strong>
                </div>

                <p className="doc-note">
                  Balanced amounts alone do not guarantee posting; the server
                  performs the final checks.
                </p>
              </div>
            </section>
          </main>
        </fieldset>

        <div className="doc-mobile-bar">
          <div className="doc-mobile-total">
            <span>Payment</span>
            <strong>{formatPaise(paymentPaise)}</strong>
          </div>

          <div className="doc-mobile-actions">{actionButtons}</div>
        </div>
      </form>
    </div>
  );
}

export default SupplierPaymentCreate;
