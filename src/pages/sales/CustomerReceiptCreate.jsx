import { useEffect, useMemo, useRef, useState } from "react";

import { useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  Banknote,
  ChevronDown,
  FileText,
  Plus,
  Receipt,
  Save,
  Search,
  Send,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";

import toast from "react-hot-toast";

import api from "../../services/api";
import routes from "../../config/routes";

import Input from "../../components/common/Form/Input";
import Select from "../../components/common/Form/Select";
import Textarea from "../../components/common/Form/Textarea";
import Button from "../../components/common/Form/Button";

import CustomerPicker from "../../components/customer/CustomerPicker";

import "../../styles/invoice-common1.css";

const customerApi = api.customers || api.customer;
const receiptApi = api.customerReceipts;

const RECEIPT_METHODS = [
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
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
};

const initialForm = () => ({
  receiptLedgerId: "",
  receiptDate: localDate(),
  receiptMethod: "CASH",
  referenceNumber: "",
  amount: "",
  notes: "",
});

let nextRowId = 0;

const newAllocation = () => ({
  rowId: `receipt-allocation-${++nextRowId}`,
  salesInvoiceId: "",
  amount: "",
});

const getErrors = (error) => {
  const data = error?.response?.data;

  if (Array.isArray(data?.errors) && data.errors.length) {
    return data.errors.map((item) =>
      typeof item === "string"
        ? item
        : item?.message || item?.msg || String(item),
    );
  }

  return [data?.message || error?.message || "Unable to complete the request."];
};

const extractList = (response, fallbackKey) => {
  const body = response?.data;

  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.[fallbackKey])) {
    return body[fallbackKey];
  }

  if (Array.isArray(body)) return body;

  return [];
};

const loadAllPages = async (service, fallbackKey) => {
  if (!service?.getAll) {
    throw new Error(`The ${fallbackKey} API getAll method is not configured.`);
  }

  const first = await service.getAll({ page: 1, limit: 100 });
  const records = [...extractList(first, fallbackKey)];

  const pages = Math.max(1, Number(first?.data?.pagination?.totalPages) || 1);

  for (let page = 2; page <= pages; page += 1) {
    const response = await service.getAll({
      page,
      limit: 100,
    });

    records.push(...extractList(response, fallbackKey));
  }

  return Array.from(
    new Map(records.map((record) => [record._id, record])).values(),
  );
};

const toPaise = (value) => {
  if (value === "" || value === null || value === undefined) {
    return 0;
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return 0;
  }

  return Math.round(number * 100);
};

/* ---------------------------------------------------------
   Page
--------------------------------------------------------- */

function CustomerReceiptCreate() {
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [allocations, setAllocations] = useState(() => [newAllocation()]);

  const [customers, setCustomers] = useState([]);
  const [receiptLedgers, setReceiptLedgers] = useState([]);
  const [unpaidInvoices, setUnpaidInvoices] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [invoicesLoading, setInvoicesLoading] = useState(false);

  const [showNotes, setShowNotes] = useState(false);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);

  const submitLock = useRef(false);
  const initialSnapshot = useRef(
    JSON.stringify({
      form: initialForm(),
      allocations: [newAllocation()],
    }),
  );

  const disabled = loading || loadFailed || saving;

  useEffect(() => {
    let cancelled = false;

    const loadOptions = async () => {
      setLoading(true);
      setLoadFailed(false);
      setErrors([]);

      try {
        const [customerRecords, ledgerRecords] = await Promise.all([
          loadAllPages(customerApi, "customers"),
          receiptApi.getReceiptLedgers(),
        ]);

        if (cancelled) return;

        setCustomers(
          customerRecords.filter(
            (customer) => customer.status === "Active" && !customer.isDeleted,
          ),
        );

        setReceiptLedgers(
          extractList(ledgerRecords, "data").filter(
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
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadOptions();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer._id === form.customerId),
    [customers, form.customerId],
  );

  const selectedLedger = useMemo(
    () => receiptLedgers.find((ledger) => ledger._id === form.receiptLedgerId),
    [receiptLedgers, form.receiptLedgerId],
  );

  const invoiceMap = useMemo(
    () => new Map(unpaidInvoices.map((invoice) => [invoice._id, invoice])),
    [unpaidInvoices],
  );

  const allocationPreviews = useMemo(
    () =>
      allocations.map((allocation) => {
        const invoice = invoiceMap.get(allocation.salesInvoiceId);

        const amountPaise = toPaise(allocation.amount);
        const outstandingPaise = Number(invoice?.outstandingAmountPaise || 0);

        return {
          invoice,
          amountPaise,
          valid:
            Boolean(invoice) &&
            amountPaise > 0 &&
            amountPaise <= outstandingPaise,
        };
      }),
    [allocations, invoiceMap],
  );

  const allocatedTotal = useMemo(
    () =>
      allocationPreviews.reduce(
        (total, allocation) => total + allocation.amountPaise,
        0,
      ),
    [allocationPreviews],
  );

  const receiptAmountPaise = toPaise(form.amount);

  const totalsMatch =
    allocatedTotal > 0 && allocatedTotal === receiptAmountPaise;

  const isDirty =
    JSON.stringify({ form, allocations }) !== initialSnapshot.current;

  const handleFieldChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors([]);
  };

  const handleCustomerSelect = async (customer) => {
    setForm((previous) => ({
      ...previous,
      customerId: customer?._id || "",
    }));

    setAllocations([newAllocation()]);
    setUnpaidInvoices([]);
    setErrors([]);

    if (!customer?._id) {
      return;
    }

    setInvoicesLoading(true);

    try {
      const response = await receiptApi.getUnpaidInvoices({
        customerId: customer._id,
        page: 1,
        limit: 100,
      });

      setUnpaidInvoices(
        extractList(response, "data").filter(
          (invoice) => Number(invoice.outstandingAmountPaise) > 0,
        ),
      );
    } catch (error) {
      const messages = getErrors(error);

      setErrors(messages);
      toast.error(messages[0]);
    } finally {
      setInvoicesLoading(false);
    }
  };

  const updateAllocation = (rowId, field, value) => {
    setAllocations((previous) =>
      previous.map((allocation) =>
        allocation.rowId === rowId
          ? { ...allocation, [field]: value }
          : allocation,
      ),
    );

    setErrors([]);
  };

  const selectInvoice = (rowId, salesInvoiceId) => {
    const invoice = invoiceMap.get(salesInvoiceId);

    setAllocations((previous) =>
      previous.map((allocation) =>
        allocation.rowId === rowId
          ? {
              ...allocation,
              salesInvoiceId,
              amount: invoice
                ? (Number(invoice.outstandingAmountPaise) / 100).toFixed(2)
                : "",
            }
          : allocation,
      ),
    );

    setErrors([]);
  };

  const removeAllocation = (rowId) => {
    setAllocations((previous) =>
      previous.filter((allocation) => allocation.rowId !== rowId),
    );
  };

  const validateForm = () => {
    const messages = [];

    if (!selectedCustomer) {
      messages.push("Select a customer.");
    } else if (!selectedCustomer.ledgerId) {
      messages.push("The selected customer has no linked accounting ledger.");
    }

    if (!selectedLedger) {
      messages.push(
        "Select the Cash or Bank account that received the payment.",
      );
    }

    if (!form.receiptDate) {
      messages.push("Receipt date is required.");
    }

    if (receiptAmountPaise <= 0) {
      messages.push("Receipt amount must be greater than zero.");
    }

    if (!allocations.length) {
      messages.push("Allocate the receipt to at least one sales invoice.");
    }

    const selectedInvoiceIds = allocations
      .map((allocation) => allocation.salesInvoiceId)
      .filter(Boolean);

    if (new Set(selectedInvoiceIds).size !== selectedInvoiceIds.length) {
      messages.push("A sales invoice can appear only once in a receipt.");
    }

    allocations.forEach((allocation, index) => {
      if (!allocation.salesInvoiceId) {
        messages.push(`Select a sales invoice for allocation ${index + 1}.`);
      } else if (!allocationPreviews[index].valid) {
        messages.push(
          `Check the amount for allocation ${index + 1}. It cannot exceed the invoice balance.`,
        );
      }
    });

    if (!totalsMatch) {
      messages.push("Allocated amounts must equal the receipt amount.");
    }

    return messages;
  };

  const saveReceipt = async () => {
    if (disabled || submitLock.current) {
      return;
    }

    const messages = validateForm();

    if (messages.length) {
      setErrors(messages);
      toast.error(messages[0]);
      window.scrollTo?.({ top: 0, behavior: "smooth" });
      return;
    }

    submitLock.current = true;
    setSaving(true);
    setErrors([]);

    try {
      const payload = {
        requestId: crypto.randomUUID(),

        customerId: form.customerId,
        receiptLedgerId: form.receiptLedgerId,
        receiptDate: form.receiptDate,
        receiptMethod: form.receiptMethod,
        referenceNumber: form.referenceNumber.trim(),
        amount: Number(form.amount),

        allocations: allocations.map((allocation) => ({
          salesInvoiceId: allocation.salesInvoiceId,
          amount: Number(allocation.amount),
        })),

        notes: form.notes.trim(),
      };

      const response = await receiptApi.create(payload);

      const receipt = response?.data?.receipt;

      if (!receipt?.receiptNumber) {
        throw new Error(
          "The server did not return a receipt number. Check the list before retrying.",
        );
      }

      toast.success(`${receipt.receiptNumber} recorded successfully`);

      navigate(routes.sales.invoices, {
        replace: true,
      });
    } catch (error) {
      const messages = getErrors(error);

      setErrors(messages);
      toast.error(messages[0]);
    } finally {
      submitLock.current = false;
      setSaving(false);
    }
  };

  const exitPage = () => {
    if (saving) {
      return;
    }

    if (
      isDirty &&
      !window.confirm("Discard this customer receipt and leave the page?")
    ) {
      return;
    }

    navigate(routes.sales.invoices);
  };

  const actionButtons = (
    <>
      <Button
        variant="secondary"
        icon={ArrowLeft}
        disabled={saving}
        onClick={exitPage}
      >
        Exit
      </Button>

      <Button
        icon={Send}
        disabled={disabled || !totalsMatch}
        loading={saving}
        onClick={saveReceipt}
      >
        Save & Post
      </Button>
    </>
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
              aria-label="Exit to customer receipts"
            >
              Exit
            </Button>

            <div className="doc-title">
              <Receipt size={18} />
              <span>Create Customer Receipt</span>
            </div>
          </div>

          <div className="doc-header-actions">{actionButtons}</div>
        </header>

        {(loading || errors.length > 0) && (
          <div className="doc-alerts">
            {loading && (
              <div className="doc-alert" role="status">
                Loading customers and receipt accounts...
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
                    onClick={() => setReloadKey((previous) => previous + 1)}
                  >
                    Retry Loading
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
                <h2 className="doc-panel-title">Received From</h2>

                <CustomerPicker
                  customers={customers}
                  selected={selectedCustomer}
                  disabled={disabled}
                  loading={loading}
                  onSelect={handleCustomerSelect}
                />
              </div>

              <div className="doc-panel">
                <h2 className="doc-panel-title">Receipt Details</h2>

                <div className="doc-fields-grid">
                  <Input
                    label="Receipt Number"
                    name="receiptNumber"
                    value="Generated after saving"
                    readOnly
                  />

                  <Input
                    label="Receipt Date"
                    name="receiptDate"
                    type="date"
                    value={form.receiptDate}
                    onChange={handleFieldChange}
                    required
                  />

                  <Select
                    label="Received In"
                    name="receiptLedgerId"
                    value={form.receiptLedgerId}
                    placeholder="Select Cash / Bank account"
                    options={receiptLedgers.map((ledger) => ({
                      value: ledger._id,
                      label: `${ledger.name} (${ledger.code})`,
                    }))}
                    onChange={handleFieldChange}
                  />

                  <Select
                    label="Payment Method"
                    name="receiptMethod"
                    value={form.receiptMethod}
                    options={RECEIPT_METHODS}
                    onChange={handleFieldChange}
                  />

                  <Input
                    label="Reference Number"
                    name="referenceNumber"
                    value={form.referenceNumber}
                    onChange={handleFieldChange}
                    placeholder="UTR, cheque number, transaction ID"
                    maxLength={100}
                  />

                  <Input
                    label="Receipt Amount (₹)"
                    name="amount"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
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
                      <th>Sales Invoice</th>
                      <th>Invoice Date</th>
                      <th>Due Date</th>
                      <th>Invoice Total</th>
                      <th>Balance</th>
                      <th>Amount Received (₹)</th>
                      <th>
                        <span className="doc-sr-only">Remove</span>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {invoicesLoading && (
                      <tr>
                        <td colSpan={8} className="doc-cell-no">
                          Loading unpaid invoices...
                        </td>
                      </tr>
                    )}

                    {!invoicesLoading &&
                      allocations.map((allocation, index) => {
                        const preview = allocationPreviews[index];

                        const invoiceOptions = unpaidInvoices
                          .filter(
                            (invoice) =>
                              invoice._id === allocation.salesInvoiceId ||
                              !allocations.some(
                                (other) => other.salesInvoiceId === invoice._id,
                              ),
                          )
                          .map((invoice) => ({
                            value: invoice._id,
                            label: `${invoice.invoiceNumber} · Balance ${formatPaise(
                              invoice.outstandingAmountPaise,
                            )}`,
                          }));

                        return (
                          <tr key={allocation.rowId}>
                            <td data-label="No." className="doc-cell-no">
                              {index + 1}
                            </td>

                            <td data-label="Invoice" className="doc-cell-item">
                              <Select
                                name={`invoice-${allocation.rowId}`}
                                aria-label={`Sales invoice ${index + 1}`}
                                value={allocation.salesInvoiceId}
                                placeholder="Select invoice"
                                options={invoiceOptions}
                                onChange={(event) =>
                                  selectInvoice(
                                    allocation.rowId,
                                    event.target.value,
                                  )
                                }
                              />

                              {preview.invoice && (
                                <small className="doc-item-meta">
                                  {preview.invoice.paymentStatus}
                                </small>
                              )}
                            </td>

                            <td
                              data-label="Invoice Date"
                              className="doc-cell-no"
                            >
                              {preview.invoice?.invoiceDate
                                ? new Date(
                                    preview.invoice.invoiceDate,
                                  ).toLocaleDateString("en-IN")
                                : "—"}
                            </td>

                            <td data-label="Due Date" className="doc-cell-no">
                              {preview.invoice?.dueDate
                                ? new Date(
                                    preview.invoice.dueDate,
                                  ).toLocaleDateString("en-IN")
                                : "—"}
                            </td>

                            <td
                              data-label="Invoice Total"
                              className="doc-cell-amount"
                            >
                              {preview.invoice
                                ? formatPaise(preview.invoice.totalAmountPaise)
                                : "—"}
                            </td>

                            <td
                              data-label="Balance"
                              className="doc-cell-amount"
                            >
                              {preview.invoice
                                ? formatPaise(
                                    preview.invoice.outstandingAmountPaise,
                                  )
                                : "—"}
                            </td>

                            <td data-label="Amount Received (₹)">
                              <Input
                                name={`amount-${allocation.rowId}`}
                                aria-label={`Amount received ${index + 1}`}
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="0.01"
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
                                  removeAllocation(allocation.rowId)
                                }
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>

                  <tfoot>
                    <tr>
                      <td colSpan={6} className="doc-subtotal-label">
                        Total Allocated
                      </td>

                      <td className="doc-subtotal-value">
                        {formatPaise(allocatedTotal)}
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
                  disabled={allocations.length >= 200 || !selectedCustomer}
                  onClick={() =>
                    setAllocations((previous) => [...previous, newAllocation()])
                  }
                >
                  <Plus size={15} />
                  Add Invoice Allocation
                </button>
              </div>
            </section>

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
                      placeholder="Receipt notes..."
                    />
                  </div>
                )}

                <p className="doc-note">
                  This receipt will debit the selected Cash or Bank account and
                  credit the customer receivable ledger.
                </p>
              </div>

              <div className="doc-summary">
                <div className="doc-summary-row">
                  <span>Receipt Amount</span>

                  <strong>{formatPaise(receiptAmountPaise)}</strong>
                </div>

                <div className="doc-summary-row">
                  <span>Total Allocated</span>

                  <strong>{formatPaise(allocatedTotal)}</strong>
                </div>

                <div className="doc-summary-row">
                  <span>Difference</span>

                  <strong>
                    {formatPaise(Math.abs(receiptAmountPaise - allocatedTotal))}
                  </strong>
                </div>

                <div
                  className={`doc-summary-total ${
                    totalsMatch ? "" : "is-invalid"
                  }`}
                >
                  <span>Status:</span>

                  <strong>
                    {totalsMatch ? "Ready to post" : "Allocation mismatch"}
                  </strong>
                </div>

                <p className="doc-note">
                  Preview only. The server validates final amounts and posts the
                  accounting journal.
                </p>
              </div>
            </section>
          </main>
        </fieldset>

        <div className="doc-mobile-bar">
          <div className="doc-mobile-total">
            <span>Receipt</span>

            <strong>{formatPaise(receiptAmountPaise)}</strong>
          </div>

          <div className="doc-mobile-actions">{actionButtons}</div>
        </div>
      </form>
    </div>
  );
}

export default CustomerReceiptCreate;
