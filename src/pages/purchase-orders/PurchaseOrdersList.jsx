import { Plus } from "lucide-react";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import DataList from "../../components/common/DataList/DataList";
import StatusField from "../../components/common/StatusField/StatusField";
import BoxModal from "../../components/common/Modal/BoxModal";
import Textarea from "../../components/common/Form/Textarea";
import Button from "../../components/common/Form/Button";

import api from "../../services/api";

import {
  PURCHASE_ORDER_BASE,
  fetchAllPages,
  formatDate,
  formatPaise,
  getDocument,
  getErrorMessage,
  getId,
  orderPath,
} from "./purchaseOrder.utils";

import "./PurchaseOrders.css";

function PurchaseOrdersList() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [cancelOrder, setCancelOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const loadSequence = useRef(0);
  const cancelLock = useRef(false);

  const loadOrders = useCallback(async () => {
    const sequence = ++loadSequence.current;

    try {
      setLoading(true);

      const [orderRecords, supplierRecords] = await Promise.all([
        fetchAllPages(api.purchaseOrder.getAll, "orders"),
        fetchAllPages(api.purchaseOrder.getSuppliers, "suppliers"),
      ]);

      if (sequence !== loadSequence.current) return;

      setOrders(orderRecords);
      setSuppliers(supplierRecords);
    } catch (error) {
      if (sequence !== loadSequence.current) return;

      toast.error(getErrorMessage(error));
    } finally {
      if (sequence === loadSequence.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadOrders();

    return () => {
      loadSequence.current += 1;
    };
  }, [loadOrders]);

  const supplierMap = useMemo(
    () => new Map(suppliers.map((supplier) => [getId(supplier), supplier])),
    [suppliers],
  );

  const openCancel = useCallback(async (row) => {
    if (row.status !== "CREATED") {
      toast.error("Only unreceived CREATED orders can be cancelled");
      return;
    }

    try {
      const response = await api.purchaseOrder.getByNumber(row.orderNumber);
      const latest = getDocument(response);

      if (!latest || latest.status !== "CREATED") {
        throw new Error("This order changed. Refresh the list.");
      }

      setCancelOrder(latest);
      setCancelReason("");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, []);

  const columns = useMemo(
    () => [
      {
        key: "orderNumber",
        label: "Order Number",
        sortable: true,

        render: (value, row) => (
          <div className="po-document-cell">
            <button
              type="button"
              className="po-document-link"
              onClick={(event) => {
                event.stopPropagation();
                navigate(orderPath(row.orderNumber));
              }}
            >
              {value || "—"}
            </button>

            <span>{row.sourceQuotationNumber || "Direct purchase order"}</span>
          </div>
        ),
      },

      {
        key: "orderDate",
        label: "Order Date",
        sortable: true,
        render: formatDate,
      },

      {
        key: "supplierName",
        label: "Supplier",
        sortable: true,

        render: (value, row) => {
          // Keep the existing master lookup as a fallback.
          const supplier = supplierMap.get(getId(row.supplierId));

          return (
            <div className="po-document-cell">
              <strong>
                {value || supplier?.supplierName || "Supplier unavailable"}
              </strong>

              <span>{row.supplierCode || supplier?.supplierCode || "—"}</span>
            </div>
          );
        },
      },

      {
        key: "expectedDeliveryDate",
        label: "Expected Delivery",
        sortable: true,
        render: formatDate,
      },

      {
        key: "creationMode",
        label: "Source",
        sortable: true,

        render: (value) => (
          <span className="po-source-badge">
            {value === "QUOTATION" ? "Supplier Quotation" : "Direct"}
          </span>
        ),
      },

      {
        key: "totalAmountPaise",
        label: "Order Amount",
        sortable: true,

        render: (value) => (
          <strong className="po-money">{formatPaise(value)}</strong>
        ),
      },

      {
        key: "status",
        label: "Status",
        sortable: true,

        render: (value) => <StatusField value={value || "CREATED"} />,
      },
    ],
    [navigate, supplierMap],
  );

  const handleCancel = async () => {
    if (cancelLock.current || !cancelOrder) return;

    if (!cancelReason.trim()) {
      toast.error("Cancellation reason is required");
      return;
    }

    try {
      cancelLock.current = true;
      setCancelling(true);

      await api.purchaseOrder.cancel(cancelOrder.orderNumber, {
        version: cancelOrder.__v,
        cancellationReason: cancelReason.trim(),
      });

      toast.success("Purchase Order cancelled successfully");

      setCancelOrder(null);
      setCancelReason("");

      await loadOrders();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      cancelLock.current = false;
      setCancelling(false);
    }
  };

  return (
    <div className="po-list-page">
      <DataList
        title="Purchase Orders"
        subtitle="Manage direct orders and orders created from supplier quotations"
        columns={columns}
        data={orders}
        loading={loading}
        rowKey="_id"
        showCase="list"
        searchable
        sortable
        filterable
        selectable
        columnVisibility
        pagination
        storageKey="trustiq-purchase-orders"
        searchPlaceholder="Search order number, quotation, status..."
        filters={[
          {
            key: "status",
            label: "Status",
            type: "select",

            options: ["CREATED", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"],
          },
        ]}
        quickFilters={[
          { key: "status", value: "", label: "All Orders" },
          { key: "status", value: "CREATED", label: "Created" },
          {
            key: "status",
            value: "PARTIALLY_RECEIVED",
            label: "Partially Received",
          },
          { key: "status", value: "RECEIVED", label: "Received" },
        ]}
        actions={{
          view: (row) => navigate(orderPath(row.orderNumber)),

          edit: (row) => {
            if (row.status !== "CREATED") {
              toast.error("Only CREATED orders can be edited");
              return;
            }

            navigate(orderPath(row.orderNumber, "edit"));
          },
        }}
        onRefresh={loadOrders}
        addButton={
          <button
            type="button"
            className="po-primary-button"
            onClick={() => navigate(`${PURCHASE_ORDER_BASE}/create`)}
          >
            <Plus size={16} />
            New Purchase Order
          </button>
        }
      />

      {/* Separate cancellation picker avoids assuming
          custom-action support in your DataList component. */}
      <div className="po-list-cancel">
        <label htmlFor="po-cancel-picker">Cancel an unreceived order</label>

        <select
          id="po-cancel-picker"
          value=""
          onChange={(event) => {
            const row = orders.find(
              (order) => order.orderNumber === event.target.value,
            );

            if (row) openCancel(row);
          }}
          disabled={loading || cancelling}
        >
          <option value="">Select a CREATED order...</option>

          {orders
            .filter((order) => order.status === "CREATED")
            .map((order) => (
              <option key={order._id} value={order.orderNumber}>
                {order.orderNumber} — {formatPaise(order.totalAmountPaise)}
              </option>
            ))}
        </select>
      </div>

      <BoxModal
        show={Boolean(cancelOrder)}
        onClose={() => {
          if (!cancelLock.current) setCancelOrder(null);
        }}
        title="Cancel Purchase Order"
        subtitle={cancelOrder?.orderNumber || ""}
        width="min(520px, calc(100vw - 24px))"
        footer={
          <div className="po-cancel-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setCancelOrder(null)}
              disabled={cancelling}
            >
              Keep Order
            </Button>

            <Button
              type="button"
              onClick={handleCancel}
              loading={cancelling}
              disabled={cancelling || !cancelReason.trim()}
            >
              Confirm Cancellation
            </Button>
          </div>
        }
      >
        <Textarea
          label="Cancellation Reason"
          value={cancelReason}
          onChange={(event) => setCancelReason(event.target.value)}
          maxLength={1000}
          rows={4}
          disabled={cancelling}
          required
        />
      </BoxModal>
    </div>
  );
}

export default PurchaseOrdersList;
