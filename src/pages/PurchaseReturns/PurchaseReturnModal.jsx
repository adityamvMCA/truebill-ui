import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  PackageCheck,
  ReceiptText,
  Search,
  ShieldCheck,
} from "lucide-react";

import { useEffect, useMemo, useRef, useState } from "react";

import toast from "react-hot-toast";

import Button from "../../components/common/Form/Button";
import Input from "../../components/common/Form/Input";
import Textarea from "../../components/common/Form/Textarea";
import BoxModal from "../../components/common/Modal/BoxModal";
import StatusField from "../../components/common/StatusField/StatusField";

import api from "../../services/api";

import {
  createRequestId,
  dateInputValue,
  fetchAllReturns,
  formatDate,
  formatMoney,
  formatQuantity,
  getBill,
  getErrorMessage,
  getId,
  getReturn,
  isCancelledRequest,
  localToday,
  previewReturnLine,
  toMilli,
} from "./purchaseReturn.utils";

const initialForm = () => ({
  billNumber: "",
  returnDate: localToday(),
  reason: "",
});

function PurchaseReturnModal({
  isOpen,
  onClose,
  onSave,
  editData = null,
  mode = "create",
}) {
  const isView = mode === "view";

  const [form, setForm] = useState(initialForm);
  const [bill, setBill] = useState(null);
  const [lines, setLines] = useState([]);
  const [document, setDocument] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inlineError, setInlineError] = useState("");

  // After a network/server failure, retry the same payload
  // before modifying it: the first submission may have committed.
  const [retryOnly, setRetryOnly] = useState(false);

  const loadingRef = useRef(false);
  const savingRef = useRef(false);
  const requestRef = useRef(null);
  const attemptRef = useRef(null);

  const busy = loading || saving;
  const locked = busy || retryOnly;

  useEffect(() => {
    if (!isOpen) return undefined;

    requestRef.current?.abort();

    const controller = new AbortController();
    requestRef.current = controller;

    setForm(initialForm());
    setBill(null);
    setLines([]);
    setDocument(null);
    setInlineError("");
    setRetryOnly(false);

    attemptRef.current = null;
    loadingRef.current = false;

    if (!isView) {
      setLoading(false);
      return () => controller.abort();
    }

    const loadDetails = async () => {
      try {
        setLoading(true);
        loadingRef.current = true;

        if (!editData?.returnNumber) {
          throw new Error("Return number is missing");
        }

        const response = await api.purchaseReturn.getByNumber(
          editData.returnNumber,
          { signal: controller.signal },
        );

        const result = getReturn(response);

        if (!result?._id) {
          throw new Error("Purchase Return details were not returned");
        }

        if (!controller.signal.aborted) {
          setDocument(result);
        }
      } catch (error) {
        if (!isCancelledRequest(error) && !controller.signal.aborted) {
          setInlineError(getErrorMessage(error));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          loadingRef.current = false;
        }
      }
    };

    loadDetails();

    return () => controller.abort();
  }, [isOpen, isView, editData?.returnNumber]);

  const loadBill = async () => {
    if (loadingRef.current || savingRef.current || retryOnly || isView) {
      return;
    }

    const billNumber = form.billNumber.trim();

    if (!billNumber) {
      toast.error("Enter a Purchase Bill number");
      return;
    }

    requestRef.current?.abort();

    const controller = new AbortController();
    requestRef.current = controller;

    try {
      loadingRef.current = true;
      setLoading(true);
      setInlineError("");
      setBill(null);
      setLines([]);
      attemptRef.current = null;

      const response = await api.purchaseReturn.getBillByNumber(billNumber, {
        signal: controller.signal,
      });

      const loadedBill = getBill(response);

      if (!loadedBill?._id) {
        throw new Error("Purchase Bill was not returned");
      }

      if (loadedBill.status !== "POSTED") {
        throw new Error("Only POSTED Purchase Bills can be returned");
      }

      if (
        !Number.isSafeInteger(loadedBill.__v) ||
        !Array.isArray(loadedBill.items) ||
        loadedBill.items.length === 0
      ) {
        throw new Error("The Purchase Bill has incomplete return data");
      }

      const previousReturns = await fetchAllReturns(
        api.purchaseReturn.getAll,
        { purchaseBillId: loadedBill._id },
        controller.signal,
      );

      const returned = new Map();

      for (const purchaseReturn of previousReturns) {
        if (purchaseReturn.status !== "POSTED") continue;

        for (const item of purchaseReturn.items || []) {
          const key = getId(item.productId);

          returned.set(key, (returned.get(key) || 0) + toMilli(item.quantity));
        }
      }

      const preparedLines = loadedBill.items.map((item) => {
        const productId = getId(item.productId);
        const originalMilli = toMilli(item.quantity);
        const returnedMilli = returned.get(productId) || 0;

        if (returnedMilli > originalMilli) {
          throw new Error(
            `Return history is inconsistent for ${item.productName}`,
          );
        }

        return {
          ...item,
          productId,
          returnedMilli,
          remainingMilli: originalMilli - returnedMilli,
          selected: false,
          returnQuantity: "",
        };
      });

      if (controller.signal.aborted) return;

      setBill(loadedBill);
      setLines(preparedLines);

      setForm((previous) => ({
        ...previous,
        billNumber: loadedBill.billNumber,
        returnDate:
          previous.returnDate < dateInputValue(loadedBill.billDate)
            ? dateInputValue(loadedBill.billDate)
            : previous.returnDate,
      }));

      if (preparedLines.every((item) => item.remainingMilli === 0)) {
        toast.error("All quantities on this bill have already been returned");
      }
    } catch (error) {
      if (!isCancelledRequest(error) && !controller.signal.aborted) {
        const message = getErrorMessage(error);
        setInlineError(message);
        toast.error(message);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        loadingRef.current = false;
      }
    }
  };

  const preview = useMemo(() => {
    const selected = lines.filter((line) => line.selected);

    const result = {
      selectedCount: selected.length,
      taxableAmountPaise: 0,
      taxAmountPaise: 0,
      totalAmountPaise: 0,
      errors: [],
    };

    for (const line of selected) {
      try {
        const values = previewReturnLine(line, line.returnQuantity);

        result.taxableAmountPaise += values.taxableAmountPaise;
        result.taxAmountPaise += values.taxAmountPaise;
        result.totalAmountPaise += values.totalAmountPaise;
      } catch (error) {
        result.errors.push(error.message);
      }
    }

    return result;
  }, [lines]);

  const settlement = useMemo(() => {
    const total = Number(bill?.totalAmountPaise || 0);
    const paid = Number(bill?.paidAmountPaise || 0);
    const returned = Number(bill?.returnedAmountPaise || 0);

    const remaining = total - paid - returned - preview.totalAmountPaise;

    const currentCredit = Number(bill?.supplierCreditAmountPaise || 0);

    const nextCredit = Math.max(-remaining, 0);

    return {
      outstandingAfterPaise: Math.max(remaining, 0),
      creditAfterPaise: nextCredit,
      additionalCreditPaise: Math.max(nextCredit - currentCredit, 0),
    };
  }, [bill, preview.totalAmountPaise]);

  const stockWasReceived = Boolean(
    bill?.updateStock || bill?.sourceGoodsReceiptId,
  );

  const handleFormChange = (event) => {
    if (locked) return;

    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    // Changing the entered bill number invalidates the loaded source.
    if (name === "billNumber") {
      setBill(null);
      setLines([]);
      setInlineError("");
    }
  };

  const changeLine = (productId, updates) => {
    if (locked) return;

    setLines((previous) =>
      previous.map((line) =>
        line.productId === productId ? { ...line, ...updates } : line,
      ),
    );
  };

  const toggleAll = () => {
    if (locked) return;

    const available = lines.filter((line) => line.remainingMilli > 0);
    const allSelected =
      available.length > 0 && available.every((line) => line.selected);

    setLines((previous) =>
      previous.map((line) =>
        line.remainingMilli > 0 ? { ...line, selected: !allSelected } : line,
      ),
    );
  };

  const useRemainingQuantity = (line) => {
    changeLine(line.productId, {
      selected: true,
      returnQuantity: String(Math.min(line.remainingMilli, 1000000000) / 1000),
    });
  };

  const handleClose = () => {
    if (loadingRef.current || savingRef.current) return;

    if (retryOnly) {
      toast.error(
        "Retry the pending submission first to confirm whether it was recorded.",
      );
      return;
    }

    onClose?.();
  };

  const buildPayload = () => {
    if (!bill?._id) {
      throw new Error("Load a posted Purchase Bill first");
    }

    if (!form.returnDate) {
      throw new Error("Return date is required");
    }

    if (form.returnDate < dateInputValue(bill.billDate)) {
      throw new Error("Return date cannot precede the bill date");
    }

    if (!form.reason.trim()) {
      throw new Error("Return reason is required");
    }

    if (!preview.selectedCount) {
      throw new Error("Select at least one product to return");
    }

    if (preview.errors.length) {
      throw new Error(preview.errors[0]);
    }

    if (preview.totalAmountPaise <= 0) {
      throw new Error("The selected return must have a positive value");
    }

    return {
      purchaseBillId: bill._id,
      billVersion: bill.__v,
      returnDate: form.returnDate,
      reason: form.reason.trim(),

      items: lines
        .filter((line) => line.selected)
        .map((line) => ({
          productId: line.productId,
          quantity: toMilli(line.returnQuantity) / 1000,
        }))
        .sort((a, b) => a.productId.localeCompare(b.productId)),
    };
  };

  const handleSave = async () => {
    if (savingRef.current || loadingRef.current || isView) return;

    let payload;

    try {
      if (retryOnly && attemptRef.current) {
        payload = attemptRef.current.payload;
      } else {
        const data = buildPayload();
        const signature = JSON.stringify(data);

        if (attemptRef.current?.signature !== signature) {
          attemptRef.current = {
            signature,

            payload: {
              ...data,
              requestId: createRequestId(),
            },
          };
        }

        payload = attemptRef.current.payload;
      }
    } catch (error) {
      toast.error(error.message);
      return;
    }

    let savedReturn;

    try {
      savingRef.current = true;
      setSaving(true);
      setInlineError("");

      const response = await api.purchaseReturn.create(payload);
      savedReturn = getReturn(response);

      if (!savedReturn?._id || savedReturn.status !== "POSTED") {
        throw new Error("The server did not return a posted Purchase Return");
      }

      setRetryOnly(false);
      attemptRef.current = null;

      toast.success(
        response?.data?.replayed
          ? "This Purchase Return was already recorded"
          : "Purchase Return created and posted successfully",
      );
    } catch (error) {
      const message = getErrorMessage(error);
      const status = error?.response?.status;

      // A missing response or server error may leave the
      // transaction result unknown to this browser.
      const uncertain = !error?.response || status >= 500 || status === 408;

      setRetryOnly(uncertain);
      setInlineError(message);
      toast.error(message);

      return;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }

    // Do not treat a list refresh failure as a failed creation.
    try {
      await onSave?.(savedReturn);
    } catch (error) {
      console.error("Return saved, but refresh failed:", error);
      toast.error("Return was saved. Refresh the list to see it.");
    }

    onClose?.();
  };

  const allAvailableSelected =
    lines.some((line) => line.remainingMilli > 0) &&
    lines
      .filter((line) => line.remainingMilli > 0)
      .every((line) => line.selected);

  const footer = (
    <div className="pr-modal-footer">
      <span className="pr-footer-note">
        <ShieldCheck size={15} />
        {isView
          ? "Posted returns are read-only"
          : "Journal and stock changes are applied together"}
      </span>

      <div className="pr-footer-actions">
        <Button
          type="button"
          variant="secondary"
          onClick={handleClose}
          disabled={busy || retryOnly}
        >
          {isView ? "Close" : "Cancel"}
        </Button>

        {!isView && (
          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            loading={saving}
            disabled={
              busy ||
              (!retryOnly &&
                (!bill || !preview.selectedCount || preview.errors.length > 0))
            }
          >
            {saving
              ? "Creating & Posting..."
              : retryOnly
                ? "Retry Same Submission"
                : "Create & Post Return"}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <BoxModal
      show={isOpen}
      onClose={handleClose}
      title={isView ? "Purchase Return Details" : "Create Purchase Return"}
      subtitle={
        isView
          ? "Review the posted return, journal reference, and returned items"
          : "Select a posted bill and return eligible quantities to the supplier"
      }
      width="min(1120px, calc(100vw - 24px))"
      footer={footer}
    >
      <div className="pr-modal-content">
        {inlineError && (
          <div className="pr-notice pr-notice--error" role="alert">
            <AlertCircle size={18} />
            <div>
              <strong>Unable to complete the request</strong>
              <p>{inlineError}</p>
            </div>
          </div>
        )}

        {retryOnly && (
          <div className="pr-notice pr-notice--warning" role="status">
            <AlertCircle size={18} />
            <div>
              <strong>Submission status is not confirmed</strong>
              <p>
                Retry the same submission. Its request ID is preserved while
                this modal remains open to prevent duplicate returns.
              </p>
            </div>
          </div>
        )}

        {loading && isView ? (
          <div className="pr-loading-state">
            <Loader2 className="pr-spin" size={28} />
            <span>Loading Purchase Return...</span>
          </div>
        ) : isView ? (
          document && (
            <>
              <section className="pr-panel">
                <div className="pr-view-heading">
                  <div>
                    <span className="pr-eyebrow">PURCHASE RETURN</span>
                    <h3>{document.returnNumber}</h3>
                    <p>{document.supplierName}</p>
                  </div>

                  <StatusField value={document.status} />
                </div>

                <div className="pr-detail-grid">
                  <Detail label="Purchase Bill" value={document.billNumber} />
                  <Detail
                    label="Return Date"
                    value={formatDate(document.returnDate)}
                  />
                  <Detail label="Supplier Code" value={document.supplierCode} />
                  <Detail
                    label="Tax Mode"
                    value={document.taxMode?.replace(/_/g, " ")}
                  />
                  <Detail
                    label="Posted On"
                    value={formatDate(document.postedAt)}
                  />
                  <Detail
                    label="Journal ID"
                    value={getId(document.journalId)}
                  />
                </div>
              </section>

              <section className="pr-panel">
                <SectionHeading
                  icon={PackageCheck}
                  title="Returned Items"
                  subtitle="Amounts are copied and allocated from the original Purchase Bill"
                />

                <div className="pr-view-items">
                  {document.items?.map((item) => (
                    <div className="pr-view-item" key={getId(item.productId)}>
                      <div className="pr-product-copy">
                        <strong>{item.productName}</strong>
                        <span>
                          {item.productCode} · {item.unit}
                        </span>

                        <span
                          className={`pr-mini-badge ${
                            item.stockReturned ? "pr-mini-badge--stock" : ""
                          }`}
                        >
                          {item.stockReturned
                            ? "Stock returned"
                            : "No inventory movement"}
                        </span>
                      </div>

                      <div className="pr-view-item-metric">
                        <span>Quantity</span>
                        <strong>{formatQuantity(item.quantity)}</strong>
                      </div>

                      <div className="pr-view-item-metric">
                        <span>Taxable</span>
                        <strong>{formatMoney(item.taxableAmountPaise)}</strong>
                      </div>

                      <div className="pr-view-item-metric">
                        <span>Total</span>
                        <strong>{formatMoney(item.totalAmountPaise)}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="pr-panel">
                <SectionHeading
                  icon={FileText}
                  title="Return Reason"
                  subtitle="Recorded when this return was posted"
                />

                <p className="pr-reason-text">{document.reason || "—"}</p>
              </section>

              <div className="pr-total-banner">
                <div>
                  <span>Posted return amount</span>
                  <p>Includes the original bill's allocated taxes</p>
                </div>
                <strong>{formatMoney(document.totalAmountPaise)}</strong>
              </div>
            </>
          )
        ) : (
          <>
            <section className="pr-panel">
              <SectionHeading
                icon={ReceiptText}
                title="Select Purchase Bill"
                subtitle="Load a posted bill to see the remaining returnable quantities"
              />

              <div className="pr-bill-search">
                <Input
                  label="Purchase Bill Number"
                  name="billNumber"
                  value={form.billNumber}
                  onChange={handleFormChange}
                  placeholder="Enter the exact bill number"
                  disabled={locked}
                  required
                />

                <Button
                  type="button"
                  variant="primary"
                  onClick={loadBill}
                  loading={loading}
                  disabled={locked || !form.billNumber.trim()}
                >
                  <span className="pr-button-content">
                    <Search size={16} />
                    {loading ? "Loading..." : "Load Bill"}
                  </span>
                </Button>
              </div>

              {bill && (
                <div className="pr-source-card">
                  <div>
                    <CheckCircle2 size={19} />
                    <div className="pr-source-copy">
                      <strong>{bill.supplierName}</strong>
                      <span>
                        {bill.billNumber} · {formatDate(bill.billDate)}
                      </span>
                    </div>
                  </div>

                  <div className="pr-source-amount">
                    <span>Current outstanding</span>
                    <strong>{formatMoney(bill.outstandingAmountPaise)}</strong>
                  </div>
                </div>
              )}
            </section>

            {bill ? (
              <>
                <section className="pr-panel">
                  <SectionHeading
                    icon={FileText}
                    title="Return Information"
                    subtitle="Provide the return date and a clear reason"
                  />

                  <div className="pr-form-grid">
                    <Input
                      label="Return Date"
                      name="returnDate"
                      type="date"
                      min={dateInputValue(bill.billDate)}
                      value={form.returnDate}
                      onChange={handleFormChange}
                      disabled={locked}
                      required
                    />

                    <Input
                      label="Supplier Invoice"
                      value={bill.supplierInvoiceNumber || ""}
                      disabled
                    />

                    <div className="pr-full-width">
                      <Textarea
                        label="Return Reason"
                        name="reason"
                        value={form.reason}
                        onChange={handleFormChange}
                        placeholder="For example: damaged goods, incorrect supply, or rejected quality..."
                        rows={3}
                        maxLength={1000}
                        disabled={locked}
                        required
                      />
                    </div>
                  </div>
                </section>

                <section className="pr-panel">
                  <div className="pr-items-heading">
                    <SectionHeading
                      icon={PackageCheck}
                      title="Select Return Items"
                      subtitle="Only quantities not already returned can be selected"
                    />

                    <button
                      type="button"
                      className="pr-text-button"
                      onClick={toggleAll}
                      disabled={locked}
                    >
                      {allAvailableSelected
                        ? "Clear selection"
                        : "Select available"}
                    </button>
                  </div>

                  <div className="pr-item-list">
                    {lines.map((line) => {
                      const unavailable = line.remainingMilli === 0;

                      let linePreview = null;

                      if (line.selected && line.returnQuantity !== "") {
                        try {
                          linePreview = previewReturnLine(
                            line,
                            line.returnQuantity,
                          );
                        } catch {
                          // The form-level validation reports invalid quantities.
                        }
                      }

                      return (
                        <div
                          key={line.productId}
                          className={[
                            "pr-item-card",
                            line.selected ? "pr-item-card--selected" : "",
                            unavailable ? "pr-item-card--disabled" : "",
                          ].join(" ")}
                        >
                          <div className="pr-item-main">
                            <input
                              type="checkbox"
                              aria-label={`Return ${line.productName}`}
                              checked={line.selected}
                              disabled={locked || unavailable}
                              onChange={(event) =>
                                changeLine(line.productId, {
                                  selected: event.target.checked,
                                })
                              }
                            />

                            <div className="pr-product-copy">
                              <strong>{line.productName}</strong>
                              <span>
                                {line.productCode} · {line.unit}
                              </span>

                              <span className="pr-item-stock-note">
                                {stockWasReceived && line.trackInventory
                                  ? "Inventory will decrease"
                                  : "Accounting adjustment only"}
                              </span>
                            </div>
                          </div>

                          <div className="pr-quantity-summary">
                            <div>
                              <span>Purchased</span>
                              <strong>{formatQuantity(line.quantity)}</strong>
                            </div>

                            <div>
                              <span>Returned</span>
                              <strong>
                                {formatQuantity(line.returnedMilli / 1000)}
                              </strong>
                            </div>

                            <div className="pr-available">
                              <span>Available</span>
                              <strong>
                                {formatQuantity(line.remainingMilli / 1000)}
                              </strong>
                            </div>
                          </div>

                          <div className="pr-item-entry">
                            <Input
                              label="Return Quantity"
                              type="number"
                              min="0.001"
                              max={
                                Math.min(line.remainingMilli, 1000000000) / 1000
                              }
                              step="0.001"
                              value={line.returnQuantity}
                              onChange={(event) =>
                                changeLine(line.productId, {
                                  returnQuantity: event.target.value,
                                })
                              }
                              placeholder="0.000"
                              disabled={locked || unavailable || !line.selected}
                            />

                            <button
                              type="button"
                              className="pr-text-button"
                              onClick={() => useRemainingQuantity(line)}
                              disabled={locked || unavailable}
                            >
                              Use available
                            </button>
                          </div>

                          <div className="pr-line-total">
                            <span>Return value</span>
                            <strong>
                              {linePreview
                                ? formatMoney(linePreview.totalAmountPaise)
                                : "—"}
                            </strong>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {preview.errors.length > 0 && (
                    <div className="pr-field-error" role="alert">
                      {preview.errors[0]}
                    </div>
                  )}
                </section>

                <div className="pr-bottom-grid">
                  <div className="pr-notice pr-notice--info">
                    <ShieldCheck size={20} />
                    <div>
                      <strong>Automatic posting</strong>
                      <p>
                        Creating this return posts its journal immediately.
                        Posted returns cannot be edited or deleted.
                      </p>
                      <p>
                        Supplier credit is recorded when returns exceed the
                        unpaid balance. Refunds and credit application are
                        separate workflows.
                      </p>
                    </div>
                  </div>

                  <section className="pr-totals-card">
                    <h4>Return Summary</h4>

                    <SummaryRow
                      label="Selected products"
                      value={preview.selectedCount}
                    />

                    <SummaryRow
                      label="Taxable amount"
                      value={formatMoney(preview.taxableAmountPaise)}
                    />

                    <SummaryRow
                      label="Tax adjustment"
                      value={formatMoney(preview.taxAmountPaise)}
                    />

                    <div className="pr-summary-total">
                      <span>Total return</span>
                      <strong>{formatMoney(preview.totalAmountPaise)}</strong>
                    </div>

                    <SummaryRow
                      label="Outstanding after return"
                      value={formatMoney(settlement.outstandingAfterPaise)}
                    />

                    <SummaryRow
                      label="Additional supplier credit"
                      value={formatMoney(settlement.additionalCreditPaise)}
                    />

                    <p className="pr-preview-note">
                      Preview only. The backend validates quantities, balances,
                      stock, and final amounts again.
                    </p>
                  </section>
                </div>
              </>
            ) : (
              !loading && (
                <div className="pr-empty-state">
                  <ReceiptText size={35} />
                  <h3>Start with a Purchase Bill</h3>
                  <p>
                    Load a posted bill to select the items you want to return.
                  </p>
                </div>
              )
            )}
          </>
        )}
      </div>
    </BoxModal>
  );
}

function SectionHeading({ icon: Icon, title, subtitle }) {
  return (
    <div className="pr-section-heading">
      <div className="pr-section-icon">
        <Icon size={18} />
      </div>

      <div>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="pr-detail">
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="pr-summary-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default PurchaseReturnModal;
