import { useCallback, useEffect, useRef, useState } from "react";

import { useNavigate, useParams } from "react-router-dom";

import {
  ArrowLeft,
  FileText,
  Plus,
  RefreshCw,
  ShoppingCart,
} from "lucide-react";

import toast from "react-hot-toast";

import api from "../../../services/api";

import routes, { buildRoute } from "../../../config/routes";

import OfferComparisonTable from "./OfferComparisonTable";

import Button from "../../../components/common/Form/Button";
import Input from "../../../components/common/Form/Input";
import ConfirmModal from "../../../components/common/ConfirmModal/ConfirmModal";

import "../../../styles/invoice-common1.css";

const quotationApi = api.salesQuotations;

const salesOrderApi = api.salesOrders || api.salesOrder;

const moneyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatPaise = (value) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const amount = Number(value);

  return Number.isSafeInteger(amount)
    ? moneyFormatter.format(amount / 100)
    : "—";
};

const todayString = () => {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
};

const isObjectId = (value) =>
  typeof value === "string" && /^[a-fA-F0-9]{24}$/.test(value);

const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
};

const dateOnly = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
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

const labelFor = (quotation) =>
  `${quotation.quotationNumber} / R${quotation.revision}`;

const isActiveOrder = (order) =>
  Boolean(
    order?.orderNumber &&
    order.isDeleted !== true &&
    order.status !== "CANCELLED",
  );

/*
 * Supports:
 * 1. New backend: groupExistingOrder.
 * 2. Older backend: quotation.existingOrder.
 *
 * Regardless of response version, finding an active
 * order closes selection for the entire comparison.
 */
const extractComparison = (response) => {
  const body = response?.data;
  const data = body?.data;

  if (body?.success !== true || !Array.isArray(data?.quotations)) {
    throw new Error(body?.message || "Invalid comparison response.");
  }

  const sourceQuotation = data.quotations.find((quotation) =>
    isActiveOrder(quotation.existingOrder),
  );

  const returnedOrder = isActiveOrder(data.groupExistingOrder)
    ? data.groupExistingOrder
    : sourceQuotation?.existingOrder || null;

  const existingOrder = returnedOrder
    ? {
        ...returnedOrder,

        customerName:
          returnedOrder.customerName || sourceQuotation?.customerName || null,

        quotationNumber:
          returnedOrder.quotationNumber ||
          sourceQuotation?.quotationNumber ||
          null,

        revision: returnedOrder.revision ?? sourceQuotation?.revision ?? null,
      }
    : null;

  const closed = data.conversionClosed === true || Boolean(existingOrder);

  const quotations = data.quotations.map((quotation) => ({
    ...quotation,

    existingOrder: isActiveOrder(quotation.existingOrder)
      ? quotation.existingOrder
      : null,

    canConvert: !closed && quotation.canConvert === true,

    conversionBlockedReason: closed
      ? existingOrder
        ? `Sales Order ${existingOrder.orderNumber} already exists for this comparison.`
        : "This comparison is closed for order creation."
      : quotation.conversionBlockedReason || null,
  }));

  return {
    quotations,
    existingOrder,
    closed,
  };
};

/*
 * Changing the comparison group remounts the page,
 * clearing old selections and pending confirmations.
 */
function SalesQuotationComparison() {
  const { comparisonGroupId } = useParams();

  return (
    <ComparisonPage
      key={comparisonGroupId || "invalid-group"}
      comparisonGroupId={comparisonGroupId}
    />
  );
}

function ComparisonPage({ comparisonGroupId }) {
  const navigate = useNavigate();

  const [quotations, setQuotations] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [groupExistingOrder, setGroupExistingOrder] = useState(null);

  const [conversionClosed, setConversionClosed] = useState(false);

  const [selectedId, setSelectedId] = useState("");

  const [orderDate, setOrderDate] = useState(todayString);

  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");

  const [pendingOrder, setPendingOrder] = useState(null);

  const [creating, setCreating] = useState(false);

  const [uncertain, setUncertain] = useState(false);

  const [createdOrder, setCreatedOrder] = useState(null);

  const mountedRef = useRef(false);
  const requestRef = useRef(0);
  const mutationLockRef = useRef(false);
  const completedRef = useRef(false);

  const validGroup = isObjectId(comparisonGroupId);

  const confirmationOpen = Boolean(pendingOrder);

  const comparisonClosed =
    conversionClosed || Boolean(groupExistingOrder) || Boolean(createdOrder);

  const controlsLocked = creating || confirmationOpen;

  const selectionLocked =
    loading || controlsLocked || uncertain || comparisonClosed;

  const activeOrder = createdOrder || groupExistingOrder;

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      requestRef.current += 1;
    };
  }, []);

  const loadComparison = useCallback(async () => {
    const requestId = ++requestRef.current;

    setLoading(true);
    setError("");
    setSelectedId("");
    setExpectedDeliveryDate("");

    try {
      if (!isObjectId(comparisonGroupId)) {
        throw new Error("Invalid comparison group.");
      }

      if (typeof quotationApi?.compare !== "function") {
        throw new Error("Configure api.salesQuotations.compare first.");
      }

      const response = await quotationApi.compare(comparisonGroupId);

      const comparison = extractComparison(response);

      if (!mountedRef.current || requestId !== requestRef.current) {
        return;
      }

      setGroupExistingOrder(comparison.existingOrder);

      setConversionClosed(comparison.closed);

      setQuotations(comparison.quotations);
    } catch (requestError) {
      if (mountedRef.current && requestId === requestRef.current) {
        setError(getErrorMessage(requestError));
      }
    } finally {
      if (mountedRef.current && requestId === requestRef.current) {
        setLoading(false);
      }
    }
  }, [comparisonGroupId]);

  useEffect(() => {
    void loadComparison();
  }, [loadComparison]);

  const selectedQuotation =
    quotations.find(
      (quotation) => String(quotation._id) === String(selectedId),
    ) || null;

  const navigateToOrder = (order) => {
    if (!order?.orderNumber) {
      toast.error("Sales Order number is missing.");
      return;
    }

    navigate(
      buildRoute(routes.sales.viewOrder, {
        id: encodeURIComponent(order.orderNumber),
      }),
    );
  };

  const openQuotation = (quotation) => {
    if (controlsLocked) return;

    if (
      !quotation?.quotationNumber ||
      !Number.isSafeInteger(quotation.revision) ||
      quotation.revision < 1
    ) {
      toast.error("Quotation number or revision is missing.");
      return;
    }

    navigate(
      buildRoute(routes.sales.viewQuotation, {
        quotationNumber: encodeURIComponent(quotation.quotationNumber),

        revision: String(quotation.revision),
      }),
    );
  };

  const addOffer = () => {
    if (controlsLocked || comparisonClosed || uncertain || !validGroup) {
      return;
    }

    navigate(
      `${routes.sales.createQuotation}?` +
        new URLSearchParams({
          comparisonGroupId,
        }).toString(),
    );
  };

  const selectOffer = (quotation) => {
    if (
      selectionLocked ||
      quotation.canConvert !== true ||
      quotation.existingOrder
    ) {
      return;
    }

    if (String(quotation._id) === String(selectedId)) {
      return;
    }

    setSelectedId(String(quotation._id));

    setExpectedDeliveryDate(dateOnly(quotation.expectedDeliveryDate));
  };

  const validateSelection = () => {
    if (comparisonClosed) {
      return activeOrder
        ? `Sales Order ${activeOrder.orderNumber} already exists for this comparison.`
        : "This comparison is closed for order creation.";
    }

    if (!selectedQuotation) {
      return "Select a customer offer first.";
    }

    if (
      selectedQuotation.canConvert !== true ||
      selectedQuotation.existingOrder
    ) {
      return "This offer is not eligible for conversion.";
    }

    if (!isObjectId(selectedQuotation._id)) {
      return "The selected quotation ID is invalid.";
    }

    if (
      !Number.isSafeInteger(selectedQuotation.__v) ||
      selectedQuotation.__v < 0
    ) {
      return "Quotation version is missing. Refresh the comparison.";
    }

    if (!isValidDate(orderDate)) {
      return "Enter a valid order date.";
    }

    if (
      expectedDeliveryDate &&
      (!isValidDate(expectedDeliveryDate) || expectedDeliveryDate < orderDate)
    ) {
      return "Expected delivery must be a valid date on or after the order date.";
    }

    return "";
  };

  const requestCreation = () => {
    if (mutationLockRef.current || selectionLocked || completedRef.current) {
      return;
    }

    const validationError = validateSelection();

    if (validationError) {
      toast.error(validationError);
      return;
    }

    setPendingOrder({
      quotation: {
        _id: selectedQuotation._id,

        quotationNumber: selectedQuotation.quotationNumber,

        revision: selectedQuotation.revision,

        customerName: selectedQuotation.customerName,

        totalAmountPaise: selectedQuotation.totalAmountPaise,
      },

      payload: {
        version: selectedQuotation.__v,
        comparisonGroupId,
        orderDate,

        expectedDeliveryDate: expectedDeliveryDate || null,

        action: "SAVE",
      },
    });
  };

  const closeConfirmation = () => {
    if (mutationLockRef.current) return;

    setPendingOrder(null);
  };

  const createOrder = async () => {
    if (
      mutationLockRef.current ||
      uncertain ||
      completedRef.current ||
      !pendingOrder
    ) {
      return;
    }

    if (comparisonClosed) {
      toast.error(
        activeOrder
          ? `This comparison already has Sales Order ${activeOrder.orderNumber}.`
          : "This comparison is closed.",
      );

      setPendingOrder(null);
      return;
    }

    if (typeof salesOrderApi?.convertQuotation !== "function") {
      toast.error("Configure the Sales Order conversion API.");
      return;
    }

    const approvedOrder = pendingOrder;

    mutationLockRef.current = true;
    requestRef.current += 1;

    setCreating(true);

    let conversionRequestStarted = false;

    try {
      /*
       * Refresh the group before conversion to detect
       * an order created since this page was loaded.
       * The backend must still enforce the same rule.
       */
      const comparisonResponse = await quotationApi.compare(comparisonGroupId);

      const latestComparison = extractComparison(comparisonResponse);

      if (!mountedRef.current) return;

      setGroupExistingOrder(latestComparison.existingOrder);

      setConversionClosed(latestComparison.closed);

      setQuotations(latestComparison.quotations);

      if (latestComparison.closed) {
        throw new Error(
          latestComparison.existingOrder
            ? `Sales Order ${latestComparison.existingOrder.orderNumber} already exists for this comparison.`
            : "This comparison is closed for order creation.",
        );
      }

      const latestQuotation = latestComparison.quotations.find(
        (quotation) =>
          String(quotation._id) === String(approvedOrder.quotation._id),
      );

      if (
        !latestQuotation ||
        latestQuotation.canConvert !== true ||
        latestQuotation.__v !== approvedOrder.payload.version
      ) {
        throw new Error(
          "The selected offer changed. Review the refreshed comparison before creating an order.",
        );
      }

      conversionRequestStarted = true;

      const response = await salesOrderApi.convertQuotation(
        approvedOrder.quotation._id,
        approvedOrder.payload,
      );

      const order = response?.data?.data;

      if (response?.data?.success !== true || !order?.orderNumber) {
        const invalidResponse = new Error(
          "The server did not return a valid order. Check Sales Orders before retrying.",
        );

        invalidResponse.uncertain = true;
        throw invalidResponse;
      }

      completedRef.current = true;

      if (!mountedRef.current) return;

      const savedOrder = {
        ...order,

        customerName:
          order.customerName || approvedOrder.quotation.customerName,
      };

      setCreatedOrder(savedOrder);
      setGroupExistingOrder(savedOrder);
      setConversionClosed(true);

      setSelectedId("");
      setPendingOrder(null);

      /*
       * Immediately close all offer buttons.
       * Keep the created order attached to its source.
       */
      setQuotations((previous) =>
        previous.map((quotation) => ({
          ...quotation,

          canConvert: false,

          conversionBlockedReason: `Sales Order ${order.orderNumber} already exists for this comparison.`,

          existingOrder:
            String(quotation._id) === String(approvedOrder.quotation._id)
              ? savedOrder
              : quotation.existingOrder,
        })),
      );

      toast.success(
        `${order.orderNumber} created from ${labelFor(
          approvedOrder.quotation,
        )}`,
      );

      navigateToOrder(savedOrder);
    } catch (requestError) {
      if (!mountedRef.current) return;

      if (!completedRef.current) {
        const status = requestError?.response?.status;

        const unknownResult =
          conversionRequestStarted &&
          (requestError.uncertain ||
            !status ||
            status >= 500 ||
            status === 408);

        if (unknownResult) {
          setUncertain(true);
        }

        setPendingOrder(null);

        await loadComparison();
      }

      toast.error(getErrorMessage(requestError));
    } finally {
      mutationLockRef.current = false;

      if (mountedRef.current) {
        setCreating(false);
        setPendingOrder(null);
      }
    }
  };

  const refreshComparison = () => {
    if (mutationLockRef.current || confirmationOpen || completedRef.current) {
      return;
    }

    void loadComparison();
  };

  return (
    <div className="doc-page">
      <header className="doc-header">
        <div className="doc-header-left">
          <Button
            type="button"
            variant="secondary"
            icon={ArrowLeft}
            disabled={creating}
            onClick={() => navigate(routes.sales.quotations)}
          >
            Back
          </Button>

          <div className="doc-title">
            <FileText size={18} />

            <span>Compare Customer Offers</span>
          </div>
        </div>

        <div className="doc-header-actions">
          <Button
            type="button"
            variant="secondary"
            icon={RefreshCw}
            disabled={loading || controlsLocked || Boolean(createdOrder)}
            onClick={refreshComparison}
          >
            Refresh
          </Button>

          <Button
            type="button"
            icon={Plus}
            disabled={
              loading ||
              controlsLocked ||
              comparisonClosed ||
              uncertain ||
              !validGroup
            }
            onClick={addOffer}
          >
            Add Customer Offer
          </Button>
        </div>
      </header>

      {loading && (
        <div className="doc-alerts">
          <div className="doc-alert" role="status">
            Loading customer offers...
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="doc-alerts">
          <div className="doc-alert doc-alert-error" role="alert">
            <p>{error}</p>

            <Button
              type="button"
              variant="secondary"
              disabled={controlsLocked || Boolean(createdOrder)}
              onClick={refreshComparison}
            >
              Retry Loading
            </Button>
          </div>
        </div>
      )}

      {comparisonClosed && activeOrder && (
        <div className="doc-alerts">
          <div className="doc-alert" role="status">
            <p>
              Sales Order <strong>{activeOrder.orderNumber}</strong> has already
              been created
              {activeOrder.customerName
                ? ` for ${activeOrder.customerName}`
                : ""}
              . Other offers in this comparison cannot be converted.
            </p>

            <Button
              type="button"
              variant="secondary"
              disabled={creating}
              onClick={() => navigateToOrder(activeOrder)}
            >
              View Sales Order
            </Button>
          </div>
        </div>
      )}

      {comparisonClosed && !activeOrder && (
        <div className="doc-alerts">
          <div className="doc-alert" role="status">
            This comparison is closed for Sales Order creation. You can still
            review its quotations.
          </div>
        </div>
      )}

      {uncertain && !activeOrder && (
        <div className="doc-alerts">
          <div className="doc-alert" role="alert">
            <p>
              The conversion result is uncertain. Creating another order is
              locked on this page. Check Sales Orders before trying again.
            </p>

            <Button
              type="button"
              variant="secondary"
              disabled={creating}
              onClick={() => navigate(routes.sales.orders)}
            >
              Check Sales Orders
            </Button>
          </div>
        </div>
      )}

      {!loading && !error && (
        <main className="doc-main">
          <OfferComparisonTable
            quotations={quotations}
            selectedId={selectedId}
            disabled={controlsLocked || (uncertain && !activeOrder)}
            onSelect={selectOffer}
            onView={openQuotation}
            onViewOrder={(order) => {
              if (!controlsLocked) {
                navigateToOrder(order);
              }
            }}
          />

          {selectedQuotation && !comparisonClosed && !uncertain && (
            <section
              className="doc-bottom"
              aria-label="Create order from selected offer"
            >
              <div className="doc-panel">
                <h2 className="doc-panel-title">Selected Offer</h2>

                <p>
                  <strong>{selectedQuotation.customerName}</strong>

                  {" · "}

                  {labelFor(selectedQuotation)}
                </p>

                <p className="doc-note">
                  The Sales Order will use this customer's saved products,
                  prices, and terms. No customer login or approval is required.
                </p>

                <div className="doc-fields-grid">
                  <Input
                    label="Order Date"
                    name="orderDate"
                    type="date"
                    value={orderDate}
                    disabled={controlsLocked}
                    onChange={(event) => setOrderDate(event.target.value)}
                    required
                  />

                  <Input
                    label="Expected Delivery"
                    name="expectedDeliveryDate"
                    type="date"
                    value={expectedDeliveryDate}
                    min={orderDate}
                    disabled={controlsLocked}
                    onChange={(event) =>
                      setExpectedDeliveryDate(event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="doc-summary">
                <div className="doc-summary-row">
                  <span>Customer</span>

                  <strong>{selectedQuotation.customerName}</strong>
                </div>

                <div className="doc-summary-row">
                  <span>Quotation</span>

                  <strong>{labelFor(selectedQuotation)}</strong>
                </div>

                <div className="doc-summary-total">
                  <span>Selected Total:</span>

                  <strong>
                    {formatPaise(selectedQuotation.totalAmountPaise)}
                  </strong>
                </div>

                <Button
                  type="button"
                  icon={ShoppingCart}
                  disabled={
                    selectionLocked || selectedQuotation.canConvert !== true
                  }
                  loading={creating}
                  onClick={requestCreation}
                >
                  Create Sales Order
                </Button>

                <p className="doc-note">
                  Creates a draft Sales Order. Review and confirm it separately.
                </p>
              </div>
            </section>
          )}
        </main>
      )}

      <ConfirmModal
        open={confirmationOpen}
        type="info"
        icon={ShoppingCart}
        title="Create Sales Order?"
        message="Create a draft Sales Order from the selected customer offer."
        confirmText="Create Sales Order"
        cancelText="Back"
        loading={creating}
        closeOnBackdrop={!creating}
        closeOnEscape={!creating}
        onCancel={closeConfirmation}
        onConfirm={createOrder}
      >
        {pendingOrder && (
          <div className="sales-order-confirm">
            <div className="sales-order-confirm__row">
              <span>Customer</span>

              <strong>{pendingOrder.quotation.customerName}</strong>
            </div>

            <div className="sales-order-confirm__row">
              <span>Quotation</span>

              <strong>{labelFor(pendingOrder.quotation)}</strong>
            </div>

            <div className="sales-order-confirm__row">
              <span>Order date</span>

              <strong>{pendingOrder.payload.orderDate}</strong>
            </div>

            <div className="sales-order-confirm__row">
              <span>Expected delivery</span>

              <strong>
                {pendingOrder.payload.expectedDeliveryDate || "Not specified"}
              </strong>
            </div>

            <div className="sales-order-confirm__total">
              <span>Total amount</span>

              <strong>
                {formatPaise(pendingOrder.quotation.totalAmountPaise)}
              </strong>
            </div>
          </div>
        )}
      </ConfirmModal>
    </div>
  );
}

export default SalesQuotationComparison;
