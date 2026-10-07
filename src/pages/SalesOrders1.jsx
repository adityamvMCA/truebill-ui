import { Plus } from "lucide-react";
import { useEffect, useState } from "react";

import DataList from "../components/common/DataList/DataList";
import SalesOrderModal from "../components/SalesOrderModal";

function SalesOrders1() {
  /* ========================================
     STATE
  ======================================== */

  const [loading, setLoading] = useState(true);

  const [showSalesOrderModal, setShowSalesOrderModal] =
    useState(false);

  const [orders, setOrders] = useState([
    {
      id: 1,
      orderNo: "SAL01",
      orderDate: "2026-09-18",
      customer: "Shree Balaji Constructions",
      customerCode: "CU0101",
      items: 8,
      quantity: 42,
      amount: 485600,
      status: "Confirmed",
      paymentStatus: "Paid",
      deliveryStatus: "Delivered",
      salesPerson: "Aditya",
    },

    {
      id: 2,
      orderNo: "SAL02",
      orderDate: "2026-09-19",
      customer: "Vijay Steel Industries",
      customerCode: "CU0102",
      items: 5,
      quantity: 28,
      amount: 328750,
      status: "Processing",
      paymentStatus: "Partial",
      deliveryStatus: "Partially Delivered",
      salesPerson: "Rahul",
    },

    {
      id: 3,
      orderNo: "SAL03",
      orderDate: "2026-09-20",
      customer: "Karnataka Electricals",
      customerCode: "CU0103",
      items: 12,
      quantity: 76,
      amount: 694300,
      status: "Confirmed",
      paymentStatus: "Paid",
      deliveryStatus: "Pending",
      salesPerson: "Priya",
    },

    {
      id: 4,
      orderNo: "SAL04",
      orderDate: "2026-09-21",
      customer: "Om Sai Enterprises",
      customerCode: "CU0104",
      items: 3,
      quantity: 15,
      amount: 125800,
      status: "Created",
      paymentStatus: "Pending",
      deliveryStatus: "Pending",
      salesPerson: "Aditya",
    },

    {
      id: 5,
      orderNo: "SAL05",
      orderDate: "2026-09-22",
      customer: "Sri Sai Traders",
      customerCode: "CU0105",
      items: 6,
      quantity: 34,
      amount: 245600,
      status: "Delivered",
      paymentStatus: "Paid",
      deliveryStatus: "Delivered",
      salesPerson: "Rahul",
    },
  ]);

  /* ========================================
     INITIAL LOADING
  ======================================== */

  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true);

      try {
        // API call later

        await new Promise((resolve) =>
          setTimeout(resolve, 1000)
        );
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, []);

  /* ========================================
     COLUMNS
  ======================================== */

  const columns = [
    {
      key: "orderNo",
      label: "Order No",
      sortable: true,
    },

    {
      key: "orderDate",
      label: "Order Date",
      type: "date",
      sortable: true,
    },

    {
      key: "customer",
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
      key: "items",
      label: "Items",
      type: "number",
      sortable: true,
    },

    {
      key: "quantity",
      label: "Quantity",
      type: "number",
      sortable: true,
    },

    {
      key: "amount",
      label: "Amount",
      type: "currency",
      sortable: true,
    },

    {
      key: "status",
      label: "Status",
      type: "status",
      sortable: true,
    },

    {
      key: "paymentStatus",
      label: "Payment",
      type: "status",
      sortable: true,
    },

    {
      key: "deliveryStatus",
      label: "Delivery",
      type: "status",
      sortable: true,
    },

    {
      key: "salesPerson",
      label: "Sales Person",
      sortable: true,
      visible: false,
    },
  ];

  /* ========================================
     FILTERS
  ======================================== */

  const filters = [
    {
      key: "status",
      label: "Status",
      type: "select",

      options: [
        "Created",
        "Confirmed",
        "Processing",
        "Delivered",
        "Cancelled",
      ],
    },

    {
      key: "paymentStatus",
      label: "Payment",
      type: "select",

      options: [
        "Pending",
        "Partial",
        "Paid",
        "Refunded",
      ],
    },

    {
      key: "deliveryStatus",
      label: "Delivery",
      type: "select",

      options: [
        "Pending",
        "Partially Delivered",
        "Delivered",
        "Cancelled",
      ],
    },

    {
      key: "salesPerson",
      label: "Sales Person",
      type: "select",

      options: [
        "Aditya",
        "Rahul",
        "Priya",
      ],
    },

    {
      key: "orderDate",
      label: "Order Date",
      type: "date",
    },
  ];

  /* ========================================
     QUICK FILTERS
  ======================================== */

  const quickFilters = [
    {
      key: "status",
      value: "",
      label: "All",
    },

    {
      key: "status",
      value: "Created",
      label: "Created",
    },

    {
      key: "status",
      value: "Confirmed",
      label: "Confirmed",
    },

    {
      key: "status",
      value: "Processing",
      label: "Processing",
    },

    {
      key: "status",
      value: "Delivered",
      label: "Delivered",
    },

    {
      key: "status",
      value: "Cancelled",
      label: "Cancelled",
    },
  ];

  /* ========================================
     VIEW
  ======================================== */

  const handleView = (row) => {
    console.log("View:", row);
  };

  /* ========================================
     EDIT
  ======================================== */

  const handleEdit = (row) => {
    console.log("Edit:", row);
  };

  /* ========================================
     DELETE
  ======================================== */

  const handleDelete = (row) => {
    const confirmed = window.confirm(
      `Delete ${row.orderNo}?`
    );

    if (!confirmed) {
      return;
    }

    setOrders((previous) =>
      previous.filter(
        (item) => item.id !== row.id
      )
    );
  };

  /* ========================================
     DUPLICATE
  ======================================== */

  const handleDuplicate = (row) => {
    const duplicate = {
      ...row,

      id: Date.now(),

      orderNo: `${row.orderNo}-COPY`,

      status: "Created",

      paymentStatus: "Pending",

      deliveryStatus: "Pending",
    };

    setOrders((previous) => [
      duplicate,
      ...previous,
    ]);
  };

  /* ========================================
     PRINT
  ======================================== */

  const handlePrint = (row) => {
    console.log("Print:", row);
  };

  /* ========================================
     BULK DELETE
  ======================================== */

  const handleBulkDelete = (rows) => {
    const ids = rows.map(
      (row) => row.id
    );

    setOrders((previous) =>
      previous.filter(
        (row) => !ids.includes(row.id)
      )
    );
  };

  /* ========================================
     BULK CONFIRM
  ======================================== */

  const handleBulkConfirm = (rows) => {
    const ids = rows.map(
      (row) => row.id
    );

    setOrders((previous) =>
      previous.map((row) =>
        ids.includes(row.id)
          ? {
              ...row,
              status: "Confirmed",
            }
          : row
      )
    );
  };

  /* ========================================
     REFRESH
  ======================================== */

  const handleRefresh = async () => {
    setLoading(true);

    try {
      // API call later

      await new Promise((resolve) =>
        setTimeout(resolve, 1000)
      );
    } finally {
      setLoading(false);
    }
  };

  /* ========================================
     SALES ORDER CREATED
  ======================================== */

  const handleSalesOrderCreated = (orderData) => {
    console.log(
      "Sales order created:",
      orderData
    );

    /*
      SalesOrderModal3 returns:

      {
        orderNo,
        orderDate,
        customer,
        customerPhone,
        billingAddress,
        shippingAddress,
        paymentTerms,
        priceList,
        warehouse,
        deliveryDate,
        deliveryStatus,
        deliveryAddress,
        notes,
        products,
        subtotal,
        taxAmount,
        grandTotal
      }
    */

    const newOrder = {
      id: Date.now(),

      orderNo:
        orderData.orderNo ||
        `SAL${orders.length + 1}`,

      orderDate:
        orderData.orderDate,

      customer:
        orderData.customer,

      customerCode:
        orderData.customerCode || "",

      items:
        orderData.products?.length || 0,

      quantity:
        orderData.products?.reduce(
          (sum, item) =>
            sum + Number(item.qty || 0),
          0
        ) || 0,

      amount:
        Number(orderData.grandTotal) || 0,

      status:
        orderData.status || "Created",

      paymentStatus: "Pending",

      deliveryStatus:
        orderData.deliveryStatus ||
        "Pending",

      salesPerson: "Aditya",
    };

    setOrders((previous) => [
      newOrder,
      ...previous,
    ]);

    setShowSalesOrderModal(false);
  };

  /* ========================================
     RENDER
  ======================================== */

  return (
    <>
      <DataList
        title="Sales Orders"
        subtitle="Manage and track all sales orders"

        columns={columns}

        data={orders}

        loading={loading}

        rowKey="id"

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

        searchPlaceholder="Search order no, customer, code..."

        actions={{
          view: handleView,
          edit: handleEdit,
          duplicate: handleDuplicate,
          print: handlePrint,
          delete: handleDelete,
        }}

        bulkActions={[
          {
            key: "confirm",
            label: "Confirm",
            action: handleBulkConfirm,
          },

          {
            key: "delete",
            label: "Delete",
            danger: true,
            action: handleBulkDelete,
          },
        ]}

        onRefresh={handleRefresh}

        addButton={
          <button
            type="button"
            className="so-primary-button"
            onClick={() =>
              setShowSalesOrderModal(true)
            }
          >
            <Plus size={16} />

            <span>
              New Sales Order
            </span>
          </button>
        }
      />

      {/* ========================================
          SALES ORDER MODAL
      ======================================== */}

      <SalesOrderModal
        isOpen={showSalesOrderModal}
        onClose={() =>
          setShowSalesOrderModal(false)
        }
        onSave={handleSalesOrderCreated}
      />
    </>
  );
}

export default SalesOrders1;