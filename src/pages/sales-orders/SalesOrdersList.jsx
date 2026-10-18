import { Plus, X, FileText, GitBranch } from "lucide-react";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useNavigate } from "react-router-dom";

import toast from "react-hot-toast";

import DataList from "../../components/common/DataList/DataList";
import StatusField from "../../components/common/StatusField/StatusField";
import ConfirmModal from "../../components/common/ConfirmModal/ConfirmModal";

import api from "../../services/api";

import "./sales-orders-list.css";
import routes from "../../config/routes";
import SalesOrderWorkflowModal from "./SalesOrderWorkflowModal";
import SalesOrderApprovalModal from "./SalesOrderApprovalModal";

const CREATE_PATH = "/sales-orders/create";

const STATUSES = [
  "DRAFT",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

const moneyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatPaise = (value) => moneyFormatter.format(Number(value || 0) / 100);

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

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
    body?.error ||
    error?.message ||
    "Something went wrong. Please try again."
  );
};

const extractOrders = (response) => {
  const body = response?.data;

  if (body?.success === false) {
    throw new Error(body.message || "Unable to load Sales Orders");
  }

  if (!Array.isArray(body?.data)) {
    throw new Error("Invalid Sales Order list response");
  }

  return body.data;
};

const extractOrder = (response) => {
  const body = response?.data;

  if (body?.success === false || !body?.data?._id || !body.data.orderNumber) {
    throw new Error(body?.message || "Invalid Sales Order response");
  }

  return body.data;
};

const emptyConfirmState = () => ({
  open: false,
  type: "danger",
  title: "",
  message: "",
  confirmText: "Confirm",
  onConfirm: null,
});

const WORKFLOWS = {
  confirm: {
    label: "Confirm",
    title: "Confirm sales order?",
    message: "Confirming locks the draft against further editing.",
    allowed: ["DRAFT"],
  },

  start: {
    label: "Start",
    title: "Start sales order?",
    message: "This marks the order as in progress.",
    allowed: ["CONFIRMED"],
  },

  complete: {
    label: "Complete",
    title: "Complete sales order?",
    message:
      "This manually marks the order as completed. It does not create an invoice or verify fulfillment.",
    allowed: ["IN_PROGRESS"],
  },

  cancel: {
    label: "Cancel Order",
    title: "Cancel sales order?",
    message:
      "This marks the order as cancelled. It does not reverse invoices or stock movements.",
    allowed: ["DRAFT", "CONFIRMED", "IN_PROGRESS"],
  },
};

function SalesOrderDetailsModal({ order, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!order) {
      return undefined;
    }

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }

      // This dialog has one interactive control.
      if (event.key === "Tab") {
        event.preventDefault();
        closeRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [order, onClose]);

  if (!order) {
    return null;
  }

  return (
    <div
      className="sol-modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="sol-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sol-details-title"
      >
        <header className="sol-modal-header">
          <div>
            <h2 id="sol-details-title">
              <FileText size={18} />
              {order.orderNumber}
            </h2>

            <StatusField value={order.status} />
          </div>

          <button
            ref={closeRef}
            type="button"
            className="sol-close-button"
            aria-label="Close sales order details"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>

        <div className="sol-modal-body">
          <div className="sol-details-grid">
            <div>
              <span>Customer</span>
              <strong>{order.customerName}</strong>
              <small>{order.customerCode}</small>
            </div>

            <div>
              <span>Order Date</span>
              <strong>{formatDate(order.orderDate)}</strong>
            </div>

            <div>
              <span>Expected Delivery</span>
              <strong>{formatDate(order.expectedDeliveryDate)}</strong>
            </div>

            <div>
              <span>GSTIN</span>
              <strong>{order.customerGstNo || "Not provided"}</strong>
            </div>

            <div>
              <span>Billing Address</span>
              <strong>{order.billingAddress || "Not provided"}</strong>
            </div>

            <div>
              <span>Shipping Address</span>
              <strong>{order.shippingAddress || "Not provided"}</strong>
            </div>

            <div>
              <span>Payment Terms</span>
              <strong>{order.paymentTerms || "—"}</strong>
            </div>

            <div>
              <span>Source Quotation</span>
              <strong>
                {order.sourceQuotationNumber
                  ? `${order.sourceQuotationNumber} / Revision ${
                      order.sourceQuotationRevision ?? "—"
                    }`
                  : "Direct order"}
              </strong>
            </div>
          </div>

          <div className="sol-details-table-wrap">
            <table className="sol-details-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product / Service</th>
                  <th>Quantity</th>
                  <th>Rate</th>
                  <th>Discount</th>
                  <th>GST</th>
                  <th>Total</th>
                </tr>
              </thead>

              <tbody>
                {(order.items || []).map((item, index) => (
                  <tr key={item.lineId || `${item.productId}-${index}`}>
                    <td>{index + 1}</td>

                    <td>
                      <strong>{item.productName}</strong>
                      <small>{item.productCode}</small>
                    </td>

                    <td>
                      {item.quantity} {item.unit}
                    </td>

                    <td>{formatPaise(item.unitRatePaise)}</td>

                    <td>{item.discountPercent}%</td>

                    <td>{item.gstRate}%</td>

                    <td>{formatPaise(item.totalAmountPaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sol-summary">
            {[
              ["Gross Amount", order.grossAmountPaise],
              ["Discount", order.discountAmountPaise],
              ["Taxable Amount", order.taxableAmountPaise],
              ["CGST", order.cgstAmountPaise],
              ["SGST", order.sgstAmountPaise],
              ["IGST", order.igstAmountPaise],
              ["Total", order.totalAmountPaise],
            ].map(([label, amount]) => (
              <div
                key={label}
                className={label === "Total" ? "sol-summary-total" : ""}
              >
                <span>{label}</span>
                <strong>{formatPaise(amount)}</strong>
              </div>
            ))}
          </div>

          {order.deliveryTerms && (
            <div className="sol-text-section">
              <h3>Delivery Terms</h3>
              <p>{order.deliveryTerms}</p>
            </div>
          )}

          {order.notes && (
            <div className="sol-text-section">
              <h3>Notes</h3>
              <p>{order.notes}</p>
            </div>
          )}

          {order.termsAndConditions && (
            <div className="sol-text-section">
              <h3>Terms & Conditions</h3>
              <p>{order.termsAndConditions}</p>
            </div>
          )}

          {order.cancellationReason && (
            <div className="sol-text-section">
              <h3>Cancellation Reason</h3>
              <p>{order.cancellationReason}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function SalesOrdersList() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);

  const [selectedOrder, setSelectedOrder] = useState(null);

  const [confirmState, setConfirmState] = useState(emptyConfirmState);

  const [confirmLoading, setConfirmLoading] = useState(false);

  const [approvalOrder, setApprovalOrder] = useState(null);

  const [approvalLoading, setApprovalLoading] = useState(false);

  const [approvalError, setApprovalError] = useState("");

  const [workflowOrder, setWorkflowOrder] = useState(null);

  const [workflowLoadingId, setWorkflowLoadingId] = useState(null);

  const workflowRequestRef = useRef(0);

  const loadRequestRef = useRef(0);
  const detailRequestRef = useRef(0);
  const actionLockRef = useRef(false);

  useEffect(
    () => () => {
      loadRequestRef.current += 1;
      detailRequestRef.current += 1;
    },
    [],
  );
  const closeApprovalModal = () => {
    if (actionLockRef.current) {
      return;
    }

    setApprovalOrder(null);
    setApprovalError("");
  };

  const handleApproveOrder = async (approvalRemarks) => {
    if (actionLockRef.current || !approvalOrder) {
      return;
    }

    const remarks = String(approvalRemarks ?? "").trim();

    if (!remarks || remarks.length > 1000) {
      setApprovalError("Enter approval remarks between 1 and 1000 characters.");
      return;
    }

    if (!Number.isSafeInteger(approvalOrder.__v) || approvalOrder.__v < 0) {
      setApprovalError(
        "The order version is missing. Close this dialog and refresh the list.",
      );
      return;
    }

    const submittedOrder = approvalOrder;

    actionLockRef.current = true;
    setApprovalLoading(true);
    setApprovalError("");

    // Prevent an older list request from overwriting
    // the updated order after approval.
    loadRequestRef.current += 1;
    setLoading(false);

    try {
      const response = await api.salesOrder.confirmOrder(
        submittedOrder.orderNumber,
        submittedOrder.__v,
        remarks,
      );

      const updatedOrder = extractOrder(response);

      replaceOrder(updatedOrder);

      setWorkflowOrder((current) =>
        current?._id === updatedOrder._id ? updatedOrder : current,
      );

      setApprovalOrder(null);

      toast.success(
        response.data.message ||
          `${updatedOrder.orderNumber} approved successfully`,
      );
    } catch (error) {
      const originalMessage = getErrorMessage(error);

      setApprovalError(originalMessage);

      // Reconcile the latest state after a conflict or
      // an uncertain network/server response.
      try {
        const response = await api.salesOrder.getOrder(
          submittedOrder.orderNumber,
        );

        const latest = extractOrder(response);

        replaceOrder(latest);

        if (latest.status !== "DRAFT") {
          setApprovalOrder(null);

          toast(
            `${latest.orderNumber} is now ${latest.status.replace(/_/g, " ")}.`,
          );
        } else {
          setApprovalOrder(latest);

          if (latest.__v !== submittedOrder.__v) {
            setApprovalError(
              "This draft changed. Review the updated order details and remarks before approving again.",
            );
          }
        }
      } catch {
        // Keep the original error and entered remarks.
        setApprovalError(originalMessage);
      }
    } finally {
      actionLockRef.current = false;
      setApprovalLoading(false);
    }
  };
  const loadOrders = useCallback(async () => {
    const requestId = ++loadRequestRef.current;

    setLoading(true);

    try {
      const firstResponse = await api.salesOrder.getOrders({
        page: 1,
        limit: 100,
      });

      const records = [...extractOrders(firstResponse)];

      const totalPages = Math.max(
        1,
        Number(firstResponse?.data?.pagination?.totalPages) || 1,
      );

      // DataList handles client-side filtering and pagination.
      // Load every backend page instead of silently stopping at 100.
      for (let page = 2; page <= totalPages; page += 1) {
        if (requestId !== loadRequestRef.current) {
          return;
        }

        const response = await api.salesOrder.getOrders({
          page,
          limit: 100,
        });

        records.push(...extractOrders(response));
      }

      if (requestId !== loadRequestRef.current) {
        return;
      }

      const uniqueOrders = Array.from(
        new Map(records.map((order) => [order._id, order])).values(),
      );

      setOrders(uniqueOrders);
    } catch (error) {
      if (requestId !== loadRequestRef.current) {
        return;
      }

      toast.error(getErrorMessage(error));
    } finally {
      if (requestId === loadRequestRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const closeDetails = useCallback(() => {
    detailRequestRef.current += 1;
    setSelectedOrder(null);
  }, []);

  const handleView = useCallback(async (row) => {
    const requestId = ++detailRequestRef.current;

    try {
      const response = await api.salesOrder.getOrder(row.orderNumber);

      if (requestId !== detailRequestRef.current) {
        return;
      }

      setSelectedOrder(extractOrder(response));
    } catch (error) {
      if (requestId === detailRequestRef.current) {
        toast.error(getErrorMessage(error));
      }
    }
  }, []);

  const replaceOrder = useCallback((updatedOrder) => {
    setOrders((previous) =>
      previous.map((order) =>
        order._id === updatedOrder._id ? updatedOrder : order,
      ),
    );

    setSelectedOrder((current) =>
      current?._id === updatedOrder._id ? updatedOrder : current,
    );
  }, []);

  const closeConfirmModal = () => {
    if (actionLockRef.current) {
      return;
    }

    setConfirmState(emptyConfirmState());
  };

  const handleConfirmAction = async () => {
    if (actionLockRef.current || typeof confirmState.onConfirm !== "function") {
      return;
    }

    actionLockRef.current = true;
    setConfirmLoading(true);

    try {
      await confirmState.onConfirm();
      setConfirmState(emptyConfirmState());
    } catch (error) {
      toast.error(getErrorMessage(error));

      // The row may have changed, or a network failure
      // may have happened after the server committed.
      setConfirmState(emptyConfirmState());
      await loadOrders();
    } finally {
      actionLockRef.current = false;
      setConfirmLoading(false);
    }
  };

  const openWorkflow = useCallback(
    (row, action) => {
      const config = WORKFLOWS[action];

      if (actionLockRef.current) {
        return;
      }

      if (!config || !config.allowed.includes(row.status)) {
        toast.error("This action is not available for the current status");
        return;
      }

      // Approval uses its own dialog and collects remarks.
      if (action === "confirm") {
        if (!Number.isSafeInteger(row.__v) || row.__v < 0) {
          toast.error("The order version is missing. Refresh the list.");
          return;
        }

        setApprovalError("");
        setApprovalOrder(row);
        return;
      }

      // Other workflow actions keep the existing dialog.
      setConfirmState({
        open: true,
        type: "danger",
        title: config.title,
        message: `${row.orderNumber} — ${row.customerName}. ` + config.message,
        confirmText: config.label,

        onConfirm: async () => {
          const response = await api.salesOrder.getOrder(row.orderNumber);

          const latest = extractOrder(response);

          if (latest.__v !== row.__v || latest.status !== row.status) {
            replaceOrder(latest);

            throw new Error(
              "This order changed. Review the updated row and select the action again.",
            );
          }

          if (!Number.isSafeInteger(latest.__v) || latest.__v < 0) {
            throw new Error("The order version is missing. Reload the list.");
          }

          let actionResponse;

          switch (action) {
            case "start":
              actionResponse = await api.salesOrder.startOrder(
                latest.orderNumber,
                latest.__v,
              );
              break;

            case "complete":
              actionResponse = await api.salesOrder.completeOrder(
                latest.orderNumber,
                latest.__v,
              );
              break;

            case "cancel":
              actionResponse = await api.salesOrder.cancelOrder(
                latest.orderNumber,
                {
                  version: latest.__v,
                  cancellationReason: null,
                },
              );
              break;

            default:
              throw new Error("Unsupported action");
          }

          const updatedOrder = extractOrder(actionResponse);

          replaceOrder(updatedOrder);

          toast.success(
            actionResponse.data.message ||
              `${updatedOrder.orderNumber} updated successfully`,
          );
        },
      });
    },
    [replaceOrder],
  );

  const handleDelete = useCallback((row) => {
    if (row.status !== "DRAFT") {
      toast.error("Only draft sales orders can be deleted");
      return;
    }

    setConfirmState({
      open: true,
      type: "danger",
      title: "Delete sales order draft?",
      message:
        `Delete ${row.orderNumber} for ${row.customerName}? ` +
        "The draft will be soft-deleted and removed from the active list.",
      confirmText: "Delete Draft",

      onConfirm: async () => {
        const response = await api.salesOrder.deleteOrder(row.orderNumber);

        if (response?.data?.success === false) {
          throw new Error(response.data.message || "Deletion failed");
        }

        setOrders((previous) =>
          previous.filter((order) => order._id !== row._id),
        );

        setSelectedOrder((current) =>
          current?._id === row._id ? null : current,
        );

        toast.success(`${row.orderNumber} draft deleted successfully`);
      },
    });
  }, []);

  const handleBulkDelete = (rows) => {
    if (!rows.length) {
      return;
    }

    if (rows.some((row) => row.status !== "DRAFT")) {
      toast.error("Select only draft orders for bulk deletion");
      return;
    }

    setConfirmState({
      open: true,
      type: "danger",
      title: "Delete selected drafts?",
      message:
        `Soft-delete ${rows.length} selected sales order ` +
        `draft${rows.length === 1 ? "" : "s"}? ` +
        "Each deletion is processed independently.",
      confirmText: `Delete ${rows.length} Drafts`,

      onConfirm: async () => {
        const results = await Promise.allSettled(
          rows.map(async (row) => {
            const response = await api.salesOrder.deleteOrder(row.orderNumber);

            if (response?.data?.success === false) {
              throw new Error(response.data.message || "Deletion failed");
            }

            return row._id;
          }),
        );

        const deletedIds = new Set(
          results
            .filter((result) => result.status === "fulfilled")
            .map((result) => result.value),
        );

        setOrders((previous) =>
          previous.filter((order) => !deletedIds.has(order._id)),
        );

        setSelectedOrder((current) =>
          deletedIds.has(current?._id) ? null : current,
        );

        if (deletedIds.size) {
          toast.success(
            `${deletedIds.size} draft${
              deletedIds.size === 1 ? "" : "s"
            } deleted`,
          );
        }

        const failed = results.filter((result) => result.status === "rejected");

        if (failed.length) {
          throw new Error(
            `${failed.length} deletion${
              failed.length === 1 ? "" : "s"
            } failed: ${getErrorMessage(failed[0].reason)}`,
          );
        }
      },
    });
  };

  const closeWorkflow = useCallback(() => {
    workflowRequestRef.current += 1;

    setWorkflowOrder(null);
    setWorkflowLoadingId(null);
  }, []);

  const handleShowWorkflow = useCallback(async (row) => {
    const requestId = ++workflowRequestRef.current;

    setWorkflowLoadingId(row._id);

    try {
      const response = await api.salesOrder.getOrder(row.orderNumber);

      if (requestId !== workflowRequestRef.current) {
        return;
      }

      const latest = extractOrder(response);

      setWorkflowOrder(latest);

      setOrders((previous) =>
        previous.map((order) => (order._id === latest._id ? latest : order)),
      );
    } catch (error) {
      if (requestId === workflowRequestRef.current) {
        toast.error(getErrorMessage(error));
      }
    } finally {
      if (requestId === workflowRequestRef.current) {
        setWorkflowLoadingId(null);
      }
    }
  }, []);
  useEffect(
    () => () => {
      loadRequestRef.current += 1;
      detailRequestRef.current += 1;
      workflowRequestRef.current += 1;
    },
    [],
  );
  const columns = useMemo(
    () => [
      {
        key: "orderNumber",
        label: "Order No.",
        sortable: true,
      },

      {
        key: "customerName",
        label: "Customer",
        sortable: true,

        render: (value, row) => (
          <div className="dl-customer">
            <strong>{value}</strong>
            <span>{row.customerCode}</span>
          </div>
        ),
      },
      {
        key: "workflowTimeline",
        label: "Timeline",
        sortable: false,

        render: (_value, row) => (
          <button
            type="button"
            className="sow-open-button"
            disabled={workflowLoadingId === row._id || confirmLoading}
            onClick={(event) => {
              event.stopPropagation();
              void handleShowWorkflow(row);
            }}
          >
            <GitBranch size={14} />

            <span>
              {workflowLoadingId === row._id ? "Loading..." : "Workflow"}
            </span>
          </button>
        ),
      },

      {
        key: "orderDate",
        label: "Order Date",
        sortable: true,
        render: (value) => formatDate(value),
      },

      {
        key: "expectedDeliveryDate",
        label: "Expected Delivery",
        sortable: true,
        render: (value) => formatDate(value),
      },

      {
        key: "totalAmountPaise",
        label: "Total Amount",
        sortable: true,
        render: (value) => formatPaise(value),
      },

      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (value) => <StatusField value={value} />,
      },

      {
        key: "sourceQuotationNumber",
        label: "Quotation",
        sortable: true,

        render: (value) =>
          value || <span className="dl-muted-value">Direct Order</span>,
      },

      {
        key: "workflow",
        label: "Workflow",
        sortable: false,

        render: (_value, row) => (
          <div className="sol-workflow-actions">
            {Object.entries(WORKFLOWS)
              .filter(([, config]) => config.allowed.includes(row.status))
              .map(([action, config]) => (
                <button
                  key={action}
                  type="button"
                  className={
                    action === "cancel"
                      ? "sol-action-button sol-action-danger"
                      : "sol-action-button"
                  }
                  disabled={confirmLoading}
                  onClick={(event) => {
                    event.stopPropagation();
                    openWorkflow(row, action);
                  }}
                >
                  {config.label}
                </button>
              ))}

            {["COMPLETED", "CANCELLED"].includes(row.status) && (
              <span className="dl-muted-value">No further actions</span>
            )}
          </div>
        ),
      },

      {
        key: "taxableAmountPaise",
        label: "Taxable Amount",
        sortable: true,
        visible: false,
        render: (value) => formatPaise(value),
      },

      {
        key: "paymentTerms",
        label: "Payment Terms",
        sortable: true,
        visible: false,
      },

      {
        key: "taxMode",
        label: "Tax Mode",
        sortable: true,
        visible: false,
      },
    ],
    [confirmLoading, openWorkflow],
  );

  const filters = [
    {
      key: "status",
      label: "Status",
      type: "select",
      options: STATUSES,
    },

    {
      key: "taxMode",
      label: "Tax Mode",
      type: "select",
      options: ["NONE", "INTRA_STATE", "INTER_STATE"],
    },
  ];

  const quickFilters = [
    {
      key: "status",
      value: "",
      label: "All",
    },

    ...STATUSES.map((status) => ({
      key: "status",
      value: status,
      label: {
        DRAFT: "Draft",
        CONFIRMED: "Confirmed",
        IN_PROGRESS: "In Progress",
        COMPLETED: "Completed",
        CANCELLED: "Cancelled",
      }[status],
    })),
  ];

  return (
    <>
      <DataList
        title="Sales Orders"
        subtitle="Manage customer orders and order progress"
        columns={columns}
        data={orders}
        loading={loading}
        rowKey="_id"
        showCase="list"
        searchable
        filterable
        sortable
        selectable
        columnVisibility
        pagination
        filters={filters}
        quickFilters={quickFilters}
        storageKey="trustiq-sales-orders"
        searchPlaceholder="Search order number, customer, quotation..."
        actions={{
          view: handleView,
          delete: handleDelete,
        }}
        bulkActions={[
          {
            key: "delete",
            label: "Delete Drafts",
            danger: true,
            action: handleBulkDelete,
          },
        ]}
        onRefresh={loadOrders}
        addButton={
          <button
            type="button"
            className="sol-primary-button"
            onClick={() => navigate(routes.sales.createOrder)}
          >
            <Plus size={16} />
            <span>New Sales Order</span>
          </button>
        }
      />

      <SalesOrderDetailsModal order={selectedOrder} onClose={closeDetails} />

      <ConfirmModal
        open={confirmState.open}
        type={confirmState.type}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText="Cancel"
        loading={confirmLoading}
        onCancel={closeConfirmModal}
        onConfirm={handleConfirmAction}
      />
      <SalesOrderWorkflowModal order={workflowOrder} onClose={closeWorkflow} />
      <SalesOrderApprovalModal
        order={approvalOrder}
        loading={approvalLoading}
        error={approvalError}
        onClose={closeApprovalModal}
        onApprove={handleApproveOrder}
      />
    </>
  );
}

export default SalesOrdersList;
