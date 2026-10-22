import { ArrowDownToLine, ArrowUpFromLine, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import DataList from "../../components/common/DataList/DataList";
import StatusField from "../../components/common/StatusField/StatusField";
import api from "../../services/api";

import "./stock-movements.css";
import routes from "../../config/routes";

const MOVEMENT_TYPE_LABELS = {
  OPENING: "Opening Stock",
  PURCHASE: "Purchase",
  PURCHASE_RETURN: "Purchase Return",
  SALE: "Sale",
  SALES_RETURN: "Sales Return",
  ADJUSTMENT_IN: "Stock Added",
  ADJUSTMENT_OUT: "Stock Removed",
  TRANSFER_IN: "Transfer In",
  TRANSFER_OUT: "Transfer Out",
};

const REFERENCE_TYPE_LABELS = {
  OPENING: "Opening Stock",
  SALES_INVOICE: "Sales Invoice",
  PURCHASE_BILL: "Purchase Bill",
  SALES_RETURN: "Sales Return",
  PURCHASE_RETURN: "Purchase Return",
  STOCK_ADJUSTMENT: "Stock Adjustment",
  STOCK_TRANSFER: "Stock Transfer",
};

const MOVEMENT_TYPE_OPTIONS = [
  {
    value: "OPENING",
    label: "Opening Stock",
  },
  {
    value: "PURCHASE",
    label: "Purchase",
  },
  {
    value: "PURCHASE_RETURN",
    label: "Purchase Return",
  },
  {
    value: "SALE",
    label: "Sale",
  },
  {
    value: "SALES_RETURN",
    label: "Sales Return",
  },
  {
    value: "ADJUSTMENT_IN",
    label: "Stock Added",
  },
  {
    value: "ADJUSTMENT_OUT",
    label: "Stock Removed",
  },
  {
    value: "TRANSFER_IN",
    label: "Transfer In",
  },
  {
    value: "TRANSFER_OUT",
    label: "Transfer Out",
  },
];

const DIRECTION_OPTIONS = [
  {
    value: "IN",
    label: "Stock In",
  },
  {
    value: "OUT",
    label: "Stock Out",
  },
];

const getApiErrorMessage = (apiError) => {
  const responseData = apiError?.response?.data;

  if (typeof responseData?.message === "string") {
    return responseData.message;
  }

  if (typeof responseData?.error === "string") {
    return responseData.error;
  }

  return (
    apiError?.message || "Unable to load stock movements. Please try again."
  );
};

const getMovementList = (response) => {
  if (Array.isArray(response?.data?.data)) {
    return response.data.data;
  }

  if (Array.isArray(response?.data?.movements)) {
    return response.data.movements;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
};

const formatCurrency = (value) => {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatQuantity = (value) => {
  return Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 3,
  });
};

const getMovementLabel = (value) => {
  if (!value) {
    return "-";
  }

  return MOVEMENT_TYPE_LABELS[value] || String(value).replace(/_/g, " ");
};

const getReferenceLabel = (value) => {
  if (!value) {
    return "-";
  }

  return REFERENCE_TYPE_LABELS[value] || String(value).replace(/_/g, " ");
};

function DirectionField({ value }) {
  const isStockIn = value === "IN";

  return (
    <span
      className={
        isStockIn
          ? "stock-movement-direction stock-movement-direction--in"
          : "stock-movement-direction stock-movement-direction--out"
      }
    >
      {isStockIn ? (
        <ArrowDownToLine size={13} />
      ) : (
        <ArrowUpFromLine size={13} />
      )}

      <span>{isStockIn ? "Stock In" : "Stock Out"}</span>
    </span>
  );
}

function StockMovementsList() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

  const [movements, setMovements] = useState([]);

  const loadStockMovements = useCallback(async () => {
    const response = await api.stockMovement.getAll({
      page: 1,
      limit: 100,
    });

    return getMovementList(response);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchStockMovements = async () => {
      try {
        const movementList = await loadStockMovements();

        if (!cancelled) {
          setMovements(movementList);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Unable to load stock movements:", error);

          toast.error(getApiErrorMessage(error));

          setMovements([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchStockMovements();

    return () => {
      cancelled = true;
    };
  }, [loadStockMovements]);

  const handleRefresh = async () => {
    try {
      setLoading(true);

      const movementList = await loadStockMovements();

      setMovements(movementList);
    } catch (error) {
      console.error("Unable to refresh stock movements:", error);

      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "movementDate",
        label: "Date & Time",
        sortable: true,

        render: (value) => (
          <span className="stock-movement-date">{formatDateTime(value)}</span>
        ),
      },

      {
        key: "productCode",
        label: "Product",
        sortable: true,

        render: (value, row) => (
          <div className="dl-customer">
            <strong>{row.productId?.name || value}</strong>

            <span>
              {value}
              {row.productId?.unit ? ` · ${row.productId.unit}` : ""}
            </span>
          </div>
        ),
      },

      {
        key: "movementType",
        label: "Movement",
        sortable: true,

        render: (value) => <StatusField value={getMovementLabel(value)} />,
      },

      {
        key: "direction",
        label: "Direction",
        sortable: true,

        render: (value) => <DirectionField value={value} />,
      },

      {
        key: "quantity",
        label: "Quantity",
        type: "number",
        sortable: true,

        render: (value, row) => {
          const isStockIn = row.direction === "IN";

          return (
            <strong
              className={
                isStockIn
                  ? "stock-movement-quantity stock-movement-quantity--in"
                  : "stock-movement-quantity stock-movement-quantity--out"
              }
            >
              {isStockIn ? "+" : "-"}
              {formatQuantity(value)}
            </strong>
          );
        },
      },

      {
        key: "unitRate",
        label: "Rate",
        type: "currency",
        sortable: true,

        render: (value) => formatCurrency(value),
      },

      {
        key: "totalValue",
        label: "Value",
        type: "currency",
        sortable: true,

        render: (value) => <strong>{formatCurrency(value)}</strong>,
      },

      {
        key: "stockAfter",
        label: "Stock After",
        type: "number",
        sortable: true,

        render: (value, row) => (
          <span>
            {formatQuantity(value)}
            {row.productId?.unit ? ` ${row.productId.unit}` : ""}
          </span>
        ),
      },

      {
        key: "referenceNumber",
        label: "Reference",
        sortable: true,

        render: (value, row) => (
          <div className="stock-movement-reference">
            <strong>{value || "-"}</strong>

            <span>{getReferenceLabel(row.referenceType)}</span>
          </div>
        ),
      },

      {
        key: "notes",
        label: "Notes",
        sortable: true,
        visible: false,

        render: (value) => (
          <span className="stock-movement-notes">{value || "-"}</span>
        ),
      },

      {
        key: "stockBefore",
        label: "Stock Before",
        type: "number",
        sortable: true,
        visible: false,

        render: (value, row) => (
          <span>
            {formatQuantity(value)}
            {row.productId?.unit ? ` ${row.productId.unit}` : ""}
          </span>
        ),
      },

      {
        key: "referenceType",
        label: "Reference Type",
        sortable: true,
        visible: false,

        render: (value) => getReferenceLabel(value),
      },

      {
        key: "createdAt",
        label: "Created At",
        sortable: true,
        visible: false,

        render: (value) => formatDateTime(value),
      },
    ],
    [],
  );

  const filters = [
    {
      key: "movementType",
      label: "Movement Type",
      type: "select",
      options: MOVEMENT_TYPE_OPTIONS,
    },

    {
      key: "direction",
      label: "Direction",
      type: "select",
      options: DIRECTION_OPTIONS,
    },
  ];

  const quickFilters = [
    {
      key: "direction",
      value: "",
      label: "All",
    },

    {
      key: "direction",
      value: "IN",
      label: "Stock In",
    },

    {
      key: "direction",
      value: "OUT",
      label: "Stock Out",
    },

    {
      key: "movementType",
      value: "ADJUSTMENT_IN",
      label: "Added",
    },

    {
      key: "movementType",
      value: "ADJUSTMENT_OUT",
      label: "Removed",
    },
  ];

  const handleView = (row) => {
    navigate(`/stock-movements/${row._id}`, {
      state: {
        movement: row,
      },
    });
  };

  return (
    <DataList
      title="Stock Movements"
      subtitle="Track every inventory change and stock adjustment"
      columns={columns}
      data={movements}
      loading={loading}
      rowKey="_id"
      showCase="list"
      searchable
      filterable
      sortable
      selectable={false}
      columnVisibility
      pagination
      filters={filters}
      quickFilters={quickFilters}
      storageKey="trustiq-stock-movements"
      searchPlaceholder="Search product code, product, reference..."
      actions={{
        view: handleView,
      }}
      onRefresh={handleRefresh}
      emptyTitle="No stock movements found"
      emptyMessage="Stock movements will appear here when opening stock, purchases, sales, returns or adjustments are recorded."
      addButton={
        <button
          type="button"
          className="so-primary-button"
          onClick={() => navigate(routes.inventory.adjustment)}
        >
          <Plus size={16} />

          <span>New Adjustment</span>
        </button>
      }
    />
  );
}

export default StockMovementsList;
