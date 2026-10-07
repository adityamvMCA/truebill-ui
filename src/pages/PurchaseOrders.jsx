import { useState } from "react";
import { Plus } from "lucide-react";

import SalesOrderModal1 from "../components/SalesOrderModal1";
const PurchaseOrders = () => {
  const [
    showPurchaseOrderModal,
    setShowPurchaseOrderModal,
  ] = useState(false);

  const [
    purchaseOrders,
    setPurchaseOrders,
  ] = useState([]);

  const handlePurchaseOrderSave = (
    orderData
  ) => {
    console.log(
      "Purchase Order Created:",
      orderData
    );

    const newOrder = {
      id: Date.now(),

      orderNo:
        orderData.purchaseOrderNo,

      orderDate:
        orderData.orderDate,

      supplier:
        orderData.supplier,

      amount:
        orderData.grandTotal,

      status:
        orderData.status || "Created",
    };

    setPurchaseOrders((previous) => [
      newOrder,
      ...previous,
    ]);

    setShowPurchaseOrderModal(false);
  };

  return (
    <div className="page-container">

      {/* ========================================
          PAGE HEADER
      ======================================== */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "20px",
              fontWeight: 600,
            }}
          >
            Purchase Orders
          </h1>

          <p
            style={{
              margin: "5px 0 0",
              color: "#94a3b8",
              fontSize: "12px",
            }}
          >
            Manage and track purchase orders
          </p>
        </div>

        <button
          type="button"
          className="so-primary-button"
          onClick={() =>
            setShowPurchaseOrderModal(
              true
            )
          }
        >
          <Plus size={16} />

          <span>
            New Purchase Order
          </span>
        </button>
      </div>

      {/* ========================================
          SAMPLE DATA
      ======================================== */}

      <div
        style={{
          background:
            "var(--card-bg, #ffffff)",
          border:
            "1px solid var(--border-color, #e5e7eb)",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  padding: "12px",
                  textAlign: "left",
                  fontSize: "11px",
                  color: "#64748b",
                  background: "#f8fafc",
                }}
              >
                PO No
              </th>

              <th
                style={{
                  padding: "12px",
                  textAlign: "left",
                  fontSize: "11px",
                  color: "#64748b",
                  background: "#f8fafc",
                }}
              >
                Date
              </th>

              <th
                style={{
                  padding: "12px",
                  textAlign: "left",
                  fontSize: "11px",
                  color: "#64748b",
                  background: "#f8fafc",
                }}
              >
                Supplier
              </th>

              <th
                style={{
                  padding: "12px",
                  textAlign: "left",
                  fontSize: "11px",
                  color: "#64748b",
                  background: "#f8fafc",
                }}
              >
                Amount
              </th>

              <th
                style={{
                  padding: "12px",
                  textAlign: "left",
                  fontSize: "11px",
                  color: "#64748b",
                  background: "#f8fafc",
                }}
              >
                Status
              </th>
            </tr>
          </thead>

          <tbody>
            {purchaseOrders.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{
                    padding: "40px",
                    textAlign: "center",
                    color: "#94a3b8",
                    fontSize: "12px",
                  }}
                >
                  No purchase orders found
                </td>
              </tr>
            ) : (
              purchaseOrders.map(
                (order) => (
                  <tr key={order.id}>
                    <td
                      style={{
                        padding: "12px",
                        fontSize: "12px",
                      }}
                    >
                      {order.orderNo}
                    </td>

                    <td
                      style={{
                        padding: "12px",
                        fontSize: "12px",
                      }}
                    >
                      {order.orderDate}
                    </td>

                    <td
                      style={{
                        padding: "12px",
                        fontSize: "12px",
                      }}
                    >
                      {order.supplier}
                    </td>

                    <td
                      style={{
                        padding: "12px",
                        fontSize: "12px",
                      }}
                    >
                      ₹
                      {Number(
                        order.amount || 0
                      ).toFixed(2)}
                    </td>

                    <td
                      style={{
                        padding: "12px",
                        fontSize: "12px",
                      }}
                    >
                      {order.status}
                    </td>
                  </tr>
                )
              )
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================
          PURCHASE ORDER MODAL
      ======================================== */}

      <SalesOrderModal1
        isOpen={
          showPurchaseOrderModal
        }
        onClose={() =>
          setShowPurchaseOrderModal(
            false
          )
        }
        onSave={
          handlePurchaseOrderSave
        }
      />
    </div>
  );
};

export default PurchaseOrders;