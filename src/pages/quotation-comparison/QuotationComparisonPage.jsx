import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FileText,
  GitCompareArrows,
  Package,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingCart,
  Trophy,
  Users,
  X,
} from "lucide-react";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import api from "../../services/api";

import Input from "../../components/common/Form/Input";
import Select from "../../components/common/Form/Select";
import Textarea from "../../components/common/Form/Textarea";
import Button from "../../components/common/Form/Button";
import BoxModal from "../../components/common/Modal/BoxModal";

import {
  dateValue,
  fetchAllPages,
  formatDate,
  formatMoney,
  formatQuantity,
  getErrorMessage,
  getId,
  isCancelledRequest,
  localDate,
} from "./quotationComparison.utils";

import "./QuotationComparison.css";
import CreatePurchaseOrderModal from "./CreatePurchaseOrderModal";

const initialOrderForm = () => ({
  orderDate: localDate(),
  expectedDeliveryDate: "",
  deliveryAddress: "",
  notes: "",
});

function QuotationComparisonPage() {
  const navigate = useNavigate();

  const [comparisonMode, setComparisonMode] = useState("RFQ");
  const [selectedRfqId, setSelectedRfqId] = useState("");
  const [selectedQuotationIds, setSelectedQuotationIds] = useState([]);
  const [search, setSearch] = useState("");

  const [rfqs, setRfqs] = useState([]);
  const [directQuotations, setDirectQuotations] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState("");

  const [comparison, setComparison] = useState(null);
  const [showTerms, setShowTerms] = useState(true);

  const [selectedOffer, setSelectedOffer] = useState(null);
  const [orderForm, setOrderForm] = useState(initialOrderForm);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [orderUncertain, setOrderUncertain] = useState(false);

  const [createdOrders, setCreatedOrders] = useState([]);

  const loadControllerRef = useRef(null);
  const comparisonLock = useRef(false);
  const orderLock = useRef(false);
  const mountedRef = useRef(false);

  const busy = loading || comparing || creatingOrder;

  const loadSources = useCallback(async () => {
    loadControllerRef.current?.abort();

    const controller = new AbortController();
    loadControllerRef.current = controller;

    try {
      setLoading(true);
      setError("");
      setComparison(null);

      const [rfqRecords, quotationRecords, supplierRecords] = await Promise.all(
        [
          fetchAllPages(api.quotationComparison.getRfqs, {}, controller.signal),

          fetchAllPages(
            api.quotationComparison.getQuotations,
            {
              creationMode: "DIRECT",
              status: "CREATED",
            },
            controller.signal,
          ),

          fetchAllPages(
            api.quotationComparison.getSuppliers,
            {},
            controller.signal,
          ),
        ],
      );

      if (controller.signal.aborted) return;

      const availableRfqs = rfqRecords.filter(
        (rfq) => ["ISSUED", "CLOSED"].includes(rfq.status) && !rfq.isDeleted,
      );

      setRfqs(availableRfqs);
      setDirectQuotations(quotationRecords);
      setSuppliers(supplierRecords);

      setSelectedRfqId((current) =>
        availableRfqs.some((rfq) => getId(rfq) === current) ? current : "",
      );

      const availableIds = new Set(quotationRecords.map(getId));

      setSelectedQuotationIds((previous) =>
        previous.filter((id) => availableIds.has(id)),
      );
    } catch (requestError) {
      if (!controller.signal.aborted && !isCancelledRequest(requestError)) {
        setError(getErrorMessage(requestError));
        toast.error(getErrorMessage(requestError));
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadSources();

    return () => {
      mountedRef.current = false;
      loadControllerRef.current?.abort();
    };
  }, [loadSources]);

  const supplierMap = useMemo(
    () => new Map(suppliers.map((supplier) => [getId(supplier), supplier])),
    [suppliers],
  );

  const supplierName = (supplierId) =>
    supplierMap.get(getId(supplierId))?.supplierName || "Supplier unavailable";

  const supplierCode = (supplierId) =>
    supplierMap.get(getId(supplierId))?.supplierCode || "";

  const visibleDirectQuotations = useMemo(() => {
    const text = search.trim().toLowerCase();

    return directQuotations.filter((quotation) => {
      const supplier = supplierMap.get(getId(quotation.supplierId));

      return (
        !text ||
        [
          quotation.quotationNumber,
          quotation.supplierReferenceNumber,
          supplier?.supplierName,
          supplier?.supplierCode,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(text)
      );
    });
  }, [directQuotations, search, supplierMap]);

  const selectedSet = useMemo(
    () => new Set(selectedQuotationIds),
    [selectedQuotationIds],
  );

  const offers = useMemo(
    () =>
      [...(comparison?.quotations || [])].sort((first, second) => {
        if (first.eligibleForRanking !== second.eligibleForRanking) {
          return first.eligibleForRanking ? -1 : 1;
        }

        return (
          (first.rank ?? Number.MAX_SAFE_INTEGER) -
            (second.rank ?? Number.MAX_SAFE_INTEGER) ||
          first.totalAmountPaise - second.totalAmountPaise
        );
      }),
    [comparison],
  );

  const statistics = useMemo(() => {
    const eligible = offers.filter((offer) => offer.eligibleForRanking);

    const totals = eligible.map((offer) => offer.totalAmountPaise);

    const lowest = totals.length ? Math.min(...totals) : null;

    const highest = totals.length ? Math.max(...totals) : null;

    return {
      supplierCount: new Set(offers.map((offer) => getId(offer.supplierId)))
        .size,

      eligibleCount: eligible.length,
      lowest,
      spread: lowest !== null && highest !== null ? highest - lowest : null,
    };
  }, [offers]);

  const selectedRfq = rfqs.find((rfq) => getId(rfq) === selectedRfqId);

  const createdForComparison = createdOrders.find(
    (record) =>
      comparison?.comparisonMode === "RFQ" &&
      record.sourceRfqId === getId(comparison.source?.rfqId),
  );

  const isOfferOrdered = (offer) =>
    Boolean(
      createdForComparison ||
      createdOrders.some(
        (record) => record.quotationId === getId(offer.quotationId),
      ),
    );

  const changeMode = (value) => {
    if (busy) return;

    setComparisonMode(value);
    setComparison(null);
    setError("");
  };

  const toggleQuotation = (quotationId) => {
    if (busy) return;

    if (!selectedSet.has(quotationId) && selectedQuotationIds.length >= 20) {
      toast.error("Select no more than 20 quotations.");
      return;
    }

    setSelectedQuotationIds((previous) =>
      previous.includes(quotationId)
        ? previous.filter((id) => id !== quotationId)
        : [...previous, quotationId],
    );

    setComparison(null);
    setError("");
  };

  const compare = async () => {
    if (comparisonLock.current || loading) return;

    if (comparisonMode === "RFQ" && !selectedRfqId) {
      toast.error("Select an issued or closed RFQ.");
      return;
    }

    if (
      comparisonMode === "DIRECT" &&
      (selectedQuotationIds.length < 2 || selectedQuotationIds.length > 20)
    ) {
      toast.error("Select between 2 and 20 direct quotations.");
      return;
    }

    try {
      comparisonLock.current = true;
      setComparing(true);
      setError("");
      setComparison(null);

      const payload =
        comparisonMode === "RFQ"
          ? {
              comparisonMode: "RFQ",
              sourceRfqId: selectedRfqId,
            }
          : {
              comparisonMode: "DIRECT",
              quotationIds: selectedQuotationIds,
            };

      const response = await api.quotationComparison.preview(payload);

      const result = response?.data?.data;

      if (
        !Array.isArray(result?.rows) ||
        !Array.isArray(result?.quotations) ||
        !result?.ranking
      ) {
        throw new Error("Invalid quotation comparison response.");
      }

      if (mountedRef.current) {
        setComparison(result);
      }
    } catch (requestError) {
      if (mountedRef.current) {
        setError(getErrorMessage(requestError));
        toast.error(getErrorMessage(requestError));
      }
    } finally {
      comparisonLock.current = false;

      if (mountedRef.current) {
        setComparing(false);
      }
    }
  };

  const openOrderModal = (offer) => {
    if (busy || !offer.eligibleForRanking || isOfferOrdered(offer)) {
      return;
    }

    const today = localDate();
    const quotationDate = dateValue(offer.quotationDate);

    setSelectedOffer(offer);

    setOrderForm({
      ...initialOrderForm(),
      orderDate: today < quotationDate ? quotationDate : today,
    });

    setOrderError("");
    setOrderUncertain(false);
  };

  const closeOrderModal = () => {
    if (orderLock.current) return;

    setSelectedOffer(null);
    setOrderError("");
    setOrderUncertain(false);
  };

  const createOrder = async () => {
    if (orderLock.current || !selectedOffer || orderUncertain) {
      return;
    }

    if (!orderForm.orderDate) {
      setOrderError("Order date is required.");
      return;
    }

    if (orderForm.orderDate < dateValue(selectedOffer.quotationDate)) {
      setOrderError("Order date cannot precede quotation date.");
      return;
    }

    if (
      selectedOffer.validUntil &&
      orderForm.orderDate > dateValue(selectedOffer.validUntil)
    ) {
      setOrderError("Order date is outside the quotation validity.");
      return;
    }

    if (
      orderForm.expectedDeliveryDate &&
      orderForm.expectedDeliveryDate < orderForm.orderDate
    ) {
      setOrderError("Expected delivery date cannot precede order date.");
      return;
    }

    if (!Number.isSafeInteger(selectedOffer.version)) {
      setOrderError("Quotation version is missing. Refresh the comparison.");
      return;
    }

    try {
      orderLock.current = true;
      setCreatingOrder(true);
      setOrderError("");

      const response = await api.quotationComparison.createPurchaseOrder({
        creationMode: "QUOTATION",
        sourceQuotationId: selectedOffer.quotationId,
        sourceQuotationVersion: selectedOffer.version,
        orderDate: orderForm.orderDate,

        expectedDeliveryDate: orderForm.expectedDeliveryDate || null,

        deliveryAddress: orderForm.deliveryAddress.trim() || null,

        notes: orderForm.notes.trim() || null,
      });

      const order = response?.data?.data;

      if (!order?.orderNumber) {
        throw new Error(
          "Order creation was not confirmed. Check Purchase Orders.",
        );
      }

      if (!mountedRef.current) return;

      setCreatedOrders((previous) => [
        ...previous,

        {
          quotationId: getId(selectedOffer.quotationId),

          sourceRfqId:
            comparison?.comparisonMode === "RFQ"
              ? getId(comparison.source?.rfqId)
              : null,

          orderNumber: order.orderNumber,
        },
      ]);

      setSelectedOffer(null);

      toast.success(`${order.orderNumber} created successfully.`);
    } catch (requestError) {
      if (!mountedRef.current) return;

      const status = requestError?.response?.status;

      if (!status || status >= 500 || status === 408) {
        setOrderUncertain(true);
      }

      setOrderError(getErrorMessage(requestError));
      toast.error(getErrorMessage(requestError));
    } finally {
      orderLock.current = false;

      if (mountedRef.current) {
        setCreatingOrder(false);
      }
    }
  };

  return (
    <div className="qc-page">
      <header className="qc-header">
        <div className="qc-header-copy">
          <div className="qc-eyebrow">
            <GitCompareArrows size={15} />
            PURCHASE WORKSPACE
          </div>

          <h1>Quotation Comparison</h1>

          <p>
            Compare supplier offers, review commercial terms, and choose an
            offer for a Purchase Order.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          icon={RefreshCw}
          onClick={loadSources}
          disabled={busy}
        >
          Refresh Sources
        </Button>
      </header>

      <section className="qc-source-panel">
        <div className="qc-mode-tabs">
          <button
            type="button"
            className={comparisonMode === "RFQ" ? "is-active" : ""}
            onClick={() => changeMode("RFQ")}
            disabled={busy}
            aria-pressed={comparisonMode === "RFQ"}
          >
            <ClipboardList size={17} />
            RFQ Comparison
          </button>

          <button
            type="button"
            className={comparisonMode === "DIRECT" ? "is-active" : ""}
            onClick={() => changeMode("DIRECT")}
            disabled={busy}
            aria-pressed={comparisonMode === "DIRECT"}
          >
            <FileText size={17} />
            Direct Quotations
          </button>
        </div>

        {comparisonMode === "RFQ" ? (
          <div className="qc-rfq-source">
            <Select
              label="Issued / Closed RFQ"
              value={selectedRfqId}
              placeholder="Select an RFQ to compare"
              options={rfqs.map((rfq) => ({
                value: getId(rfq),

                label:
                  `${rfq.rfqNumber} · ${rfq.status}` +
                  ` · ${rfq.items?.length || 0} lines`,
              }))}
              onChange={(event) => {
                setSelectedRfqId(event.target.value);
                setComparison(null);
                setError("");
              }}
              disabled={busy}
            />

            <Button
              type="button"
              icon={GitCompareArrows}
              onClick={compare}
              loading={comparing}
              disabled={busy || !selectedRfqId}
            >
              Compare Offers
            </Button>
          </div>
        ) : (
          <>
            <div className="qc-direct-toolbar">
              <Input
                label="Find Direct Quotations"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search supplier, quotation, or reference..."
                disabled={busy}
              />

              <div className="qc-selection-summary">
                <strong>{selectedQuotationIds.length}</strong>
                <span>of 20 quotations selected</span>
              </div>
            </div>

            <div className="qc-direct-list">
              {visibleDirectQuotations.map((quotation) => {
                const id = getId(quotation);
                const selected = selectedSet.has(id);

                return (
                  <label
                    key={id}
                    className={`qc-pick-card ${
                      selected ? "qc-pick-card--selected" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleQuotation(id)}
                      disabled={
                        busy || (!selected && selectedQuotationIds.length >= 20)
                      }
                    />

                    <div className="qc-pick-copy">
                      <strong>{supplierName(quotation.supplierId)}</strong>

                      <span>
                        {quotation.quotationNumber}
                        {quotation.supplierReferenceNumber
                          ? ` · ${quotation.supplierReferenceNumber}`
                          : ""}
                      </span>

                      <small>
                        Valid until {formatDate(quotation.validUntil)}
                      </small>
                    </div>

                    <strong className="qc-pick-amount">
                      {formatMoney(quotation.totalAmountPaise)}
                    </strong>
                  </label>
                );
              })}

              {!loading && !visibleDirectQuotations.length && (
                <div className="qc-small-empty">
                  No matching direct quotations.
                </div>
              )}
            </div>

            <div className="qc-direct-footer">
              <span>
                Select offers with the same products, units, quantities,
                currency, and tax mode.
              </span>

              <Button
                type="button"
                icon={GitCompareArrows}
                onClick={compare}
                loading={comparing}
                disabled={busy || selectedQuotationIds.length < 2}
              >
                Compare Selected
              </Button>
            </div>
          </>
        )}

        {comparisonMode === "RFQ" && selectedRfq && (
          <div className="qc-source-note">
            <CheckCircle2 size={16} />

            <span>
              {selectedRfq.rfqNumber} ·{" "}
              {selectedRfq.creationMode === "REQUISITION"
                ? "From Purchase Requisition"
                : "Direct RFQ"}
              {" · "}
              {selectedRfq.supplierIds?.length || 0} invited suppliers
            </span>
          </div>
        )}
      </section>

      {error && (
        <div className="qc-error" role="alert">
          {error}
        </div>
      )}

      {loading && (
        <div className="qc-loading" role="status">
          Loading RFQs, supplier offers, and suppliers...
        </div>
      )}

      {comparison ? (
        <>
          <div className="qc-result-heading">
            <div>
              <h2>
                {comparison.source?.rfqNumber || "Direct Offer Comparison"}
              </h2>

              <p>
                {comparison.quotationCount} offers · {comparison.rows.length}{" "}
                product lines · {comparison.taxMode.replace(/_/g, " ")}
              </p>
            </div>

            <span className="qc-preview-badge">
              <ShieldCheck size={14} />
              Read-only comparison
            </span>
          </div>

          {createdForComparison && (
            <div className="qc-created-banner">
              <CheckCircle2 size={18} />

              <span>
                Purchase Order{" "}
                <strong>{createdForComparison.orderNumber}</strong> was created
                from this RFQ.
              </span>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/purchase/orders/${encodeURIComponent(
                      createdForComparison.orderNumber,
                    )}`,
                  )
                }
              >
                View Order
                <ArrowRight size={15} />
              </button>
            </div>
          )}

          <div className="qc-stat-grid">
            <StatCard
              icon={Users}
              label="Suppliers Compared"
              value={statistics.supplierCount}
            />

            <StatCard
              icon={CheckCircle2}
              label="Complete, Unexpired Offers"
              value={statistics.eligibleCount}
            />

            <StatCard
              icon={Trophy}
              label="Lowest Eligible Total"
              value={
                statistics.lowest === null
                  ? "—"
                  : formatMoney(statistics.lowest)
              }
              accent
            />

            <StatCard
              icon={GitCompareArrows}
              label="Eligible Offer Price Spread"
              value={
                statistics.spread === null
                  ? "—"
                  : formatMoney(statistics.spread)
              }
            />
          </div>

          <section className="qc-section">
            <div className="qc-section-heading">
              <div>
                <h2>Supplier Offers</h2>

                <p>
                  Rank is based on recorded totals for complete, unexpired
                  offers—not delivery quality or specifications.
                </p>
              </div>
            </div>

            <div className="qc-offer-grid">
              {offers.map((offer) => {
                const lowest = offer.eligibleForRanking && offer.rank === 1;

                const ordered = isOfferOrdered(offer);

                return (
                  <article
                    key={getId(offer.quotationId)}
                    className={`qc-offer-card ${
                      lowest ? "qc-offer-card--lowest" : ""
                    }`}
                  >
                    <div className="qc-offer-top">
                      <div className="qc-supplier-avatar">
                        {supplierName(offer.supplierId).charAt(0).toUpperCase()}
                      </div>

                      {lowest ? (
                        <span className="qc-lowest-badge">
                          <Trophy size={13} />
                          Lowest total
                        </span>
                      ) : (
                        <span className="qc-rank-badge">
                          {offer.rank ? `Rank ${offer.rank}` : "Not ranked"}
                        </span>
                      )}
                    </div>

                    <h3>{supplierName(offer.supplierId)}</h3>

                    <p className="qc-offer-reference">
                      {supplierCode(offer.supplierId)}
                      {supplierCode(offer.supplierId) ? " · " : ""}
                      {offer.quotationNumber}
                    </p>

                    <div className="qc-offer-price">
                      {formatMoney(offer.totalAmountPaise)}
                    </div>

                    <div className="qc-offer-breakdown">
                      <span>Taxable</span>
                      <strong>{formatMoney(offer.taxableAmountPaise)}</strong>

                      <span>GST</span>
                      <strong>
                        {formatMoney(
                          offer.cgstAmountPaise +
                            offer.sgstAmountPaise +
                            offer.igstAmountPaise,
                        )}
                      </strong>
                    </div>

                    <div className="qc-offer-status">
                      <span
                        className={`qc-tag ${
                          offer.complete ? "qc-tag--success" : "qc-tag--amber"
                        }`}
                      >
                        {offer.complete ? (
                          <Check size={12} />
                        ) : (
                          <Package size={12} />
                        )}

                        {offer.complete ? "Complete offer" : "Partial offer"}
                      </span>

                      {offer.expired && (
                        <span className="qc-tag qc-tag--danger">Expired</span>
                      )}
                    </div>

                    <div className="qc-offer-terms">
                      <MiniDetail label="Payment" value={offer.paymentTerms} />

                      <MiniDetail
                        label="Delivery"
                        value={offer.deliveryTerms}
                      />

                      <MiniDetail
                        label="Valid Until"
                        value={formatDate(offer.validUntil)}
                      />
                    </div>

                    {offer.warnings?.length > 0 && (
                      <ul className="qc-offer-issues">
                        {offer.warnings.map((message, index) => (
                          <li key={`${index}-${message}`}>{message}</li>
                        ))}
                      </ul>
                    )}

                    <button
                      type="button"
                      className="qc-create-order-button"
                      disabled={busy || !offer.eligibleForRanking || ordered}
                      onClick={() => openOrderModal(offer)}
                    >
                      {ordered ? (
                        <CheckCircle2 size={16} />
                      ) : (
                        <ShoppingCart size={16} />
                      )}

                      {ordered
                        ? "Order Already Created"
                        : "Create Purchase Order"}
                    </button>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="qc-section qc-matrix-panel">
            <div className="qc-section-heading">
              <div>
                <h2>Item-by-Item Comparison</h2>
                <p>
                  Scroll horizontally to compare all offers. Missing and partial
                  lines are shown explicitly.
                </p>
              </div>
            </div>

            <div
              className="qc-table-scroll"
              role="region"
              aria-label="Product quotation comparison"
              tabIndex={0}
            >
              <table className="qc-matrix">
                <thead>
                  <tr>
                    <th scope="col" className="qc-sticky-cell">
                      Product / Requirement
                    </th>

                    {offers.map((offer) => (
                      <th
                        scope="col"
                        key={getId(offer.quotationId)}
                        className={offer.rank === 1 ? "qc-lowest-column" : ""}
                      >
                        <strong>{supplierName(offer.supplierId)}</strong>

                        <span>{offer.quotationNumber}</span>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {comparison.rows.map((row) => (
                    <tr key={row.rowKey}>
                      <th scope="row" className="qc-sticky-cell">
                        <strong>{row.productName}</strong>

                        <span>
                          {row.productCode} · {row.unit}
                        </span>

                        <small>
                          Required: {formatQuantity(row.requiredQuantity)}{" "}
                          {row.unit}
                        </small>

                        {row.specification && <p>{row.specification}</p>}
                      </th>

                      {offers.map((offer) => {
                        const item = row.offers.find(
                          (entry) =>
                            getId(entry.quotationId) ===
                            getId(offer.quotationId),
                        );

                        return (
                          <td
                            key={getId(offer.quotationId)}
                            className={
                              offer.rank === 1 ? "qc-lowest-column" : ""
                            }
                          >
                            {item ? (
                              <div className="qc-line-offer">
                                <strong>
                                  {formatMoney(item.totalAmountPaise)}
                                </strong>

                                <span>
                                  Unit rate: {formatMoney(item.unitRatePaise)}
                                </span>

                                <span
                                  className={
                                    item.quantity !== row.requiredQuantity
                                      ? "qc-partial-quantity"
                                      : ""
                                  }
                                >
                                  Qty: {formatQuantity(item.quantity)}{" "}
                                  {row.unit}
                                </span>

                                <span>
                                  Discount: {item.discountPercent}%{" · "}
                                  GST: {item.gstRate}%
                                </span>
                              </div>
                            ) : (
                              <span className="qc-missing">
                                <X size={14} />
                                Not quoted
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  <tr className="qc-matrix-total">
                    <th scope="row" className="qc-sticky-cell">
                      Recorded Offer Total
                    </th>

                    {offers.map((offer) => (
                      <td
                        key={getId(offer.quotationId)}
                        className={offer.rank === 1 ? "qc-lowest-column" : ""}
                      >
                        <strong>{formatMoney(offer.totalAmountPaise)}</strong>

                        {!offer.complete && <small>Partial scope</small>}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="qc-section qc-commercial-panel">
            <button
              type="button"
              className="qc-commercial-toggle"
              aria-expanded={showTerms}
              onClick={() => setShowTerms((previous) => !previous)}
            >
              <span>
                <FileText size={18} />
                Commercial Terms & Notes
              </span>

              {showTerms ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>

            {showTerms && (
              <div className="qc-commercial-grid">
                {offers.map((offer) => (
                  <article key={getId(offer.quotationId)}>
                    <h3>{supplierName(offer.supplierId)}</h3>
                    <span>{offer.quotationNumber}</span>

                    <CommercialDetail
                      label="Supplier Reference"
                      value={offer.supplierReferenceNumber}
                    />

                    <CommercialDetail
                      label="Payment Terms"
                      value={offer.paymentTerms}
                    />

                    <CommercialDetail
                      label="Delivery Terms"
                      value={offer.deliveryTerms}
                    />

                    <CommercialDetail
                      label="Terms & Conditions"
                      value={offer.termsAndConditions}
                    />

                    <CommercialDetail label="Notes" value={offer.notes} />
                  </article>
                ))}
              </div>
            )}
          </section>

          <p className="qc-footnote">
            Comparison uses recorded quotation totals. Freight and additional
            charges are not included unless already represented in those totals.
            Purchase Order creation revalidates the source quotation and its
            version.
          </p>
        </>
      ) : (
        !loading &&
        !comparing && (
          <div className="qc-empty-state">
            <div className="qc-empty-icon">
              <GitCompareArrows size={34} />
            </div>

            <h2>Compare before you order</h2>

            <p>
              Select an issued RFQ or choose direct quotations to review
              pricing, coverage, and commercial terms.
            </p>

            <div className="qc-empty-steps">
              <span>
                <b>1</b> Select offers
              </span>
              <span>
                <b>2</b> Compare details
              </span>
              <span>
                <b>3</b> Create an order
              </span>
            </div>
          </div>
        )
      )}

      <CreatePurchaseOrderModal
        isOpen={Boolean(selectedOffer)}
        offer={selectedOffer}
        supplierName={
          selectedOffer ? supplierName(selectedOffer.supplierId) : ""
        }
        supplierCode={
          selectedOffer ? supplierCode(selectedOffer.supplierId) : ""
        }
        formData={orderForm}
        onFieldChange={(name, value) => {
          setOrderForm((previous) => ({
            ...previous,
            [name]: value,
          }));

          setOrderError("");
        }}
        onSubmit={createOrder}
        onClose={closeOrderModal}
        loading={creatingOrder}
        error={orderError}
        uncertain={orderUncertain}
        onCheckOrders={() => navigate("/purchase/orders")}
      />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent = false }) {
  return (
    <div className={`qc-stat-card ${accent ? "qc-stat-card--accent" : ""}`}>
      <div className="qc-stat-icon">
        <Icon size={20} />
      </div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function MiniDetail({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value || "Not specified"}</strong>
    </div>
  );
}

function CommercialDetail({ label, value }) {
  return (
    <div className="qc-commercial-detail">
      <span>{label}</span>
      <p>{value || "Not specified"}</p>
    </div>
  );
}

export default QuotationComparisonPage;
