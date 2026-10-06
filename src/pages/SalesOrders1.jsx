import { Plus } from "lucide-react";
import { useState } from "react";

import DataList from "../components/common/DataList/DataList";

function SalesOrders1() {
  const [loading, setLoading] = useState(false);

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
  ]);

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
    },

    {
      key: "deliveryStatus",
      label: "Delivery",
      type: "status",
    },

    {
      key: "salesPerson",
      label: "Sales Person",
      sortable: true,
      visible: false,
    },
  ];

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

  const quickFilters = [
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
  ];

  const handleView = (row) => {
    console.log("View:", row);
  };

  const handleEdit = (row) => {
    console.log("Edit:", row);
  };

  const handleDelete = (row) => {
    const confirmed = window.confirm(
      `Delete ${row.orderNo}?`
    );

    if (!confirmed) return;

    setOrders((previous) =>
      previous.filter(
        (item) => item.id !== row.id
      )
    );
  };

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

  const handlePrint = (row) => {
    console.log("Print:", row);
  };

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

  const handleRefresh = async () => {
    setLoading(true);

    try {
      // API call later
    } finally {
      setLoading(false);
    }
  };

  return (
    <DataList
  title="Sales Orders"
  subtitle="Manage and track all sales orders"

  columns={columns}
  data={orders}

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
//   onExport={handleExport}
//   onImport={handleImport}

  addButton={
    <button
      type="button"
      className="so-primary-button"
    //   onClick={handleCreate}
    >
      <Plus size={16} />
      New Sales Order
    </button>
  }
/>
  );
}

export default SalesOrders1;