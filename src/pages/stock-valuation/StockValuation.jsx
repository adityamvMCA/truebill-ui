import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import DataList from "../../components/common/DataList/DataList";
import Input from "../../components/common/Form/Input";
import Button from "../../components/common/Form/Button";
import BoxModal from "../../components/common/Modal/BoxModal";
import StatusField from "../../components/common/StatusField/StatusField";

import stockValuationApi from "../../services/modules/stockValuationApi";

const integerFormatter = new Intl.NumberFormat(
  "en-IN",
  {
    maximumFractionDigits: 0,
  },
);

const quantityFormatter = new Intl.NumberFormat(
  "en-IN",
  {
    maximumFractionDigits: 3,
  },
);

const formatPaise = (value) => {
  if (
    value === null ||
    value === undefined
  ) {
    return "—";
  }

  const paise = BigInt(value);
  const rupees = paise / 100n;

  const fraction = String(
    paise % 100n,
  ).padStart(2, "0");

  return (
    `₹${integerFormatter.format(rupees)}` +
    `.${fraction}`
  );
};

const rupeesToPaise = (value, label) => {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0
  ) {
    throw new Error(
      `${label} must be a valid non-negative amount.`,
    );
  }

  const scaled = value * 100;
  const paise = Math.round(scaled);

  if (
    !Number.isSafeInteger(paise) ||
    Math.abs(scaled - paise) > 0.000001
  ) {
    throw new Error(
      `${label} exceeds the supported range or contains more than two decimal places.`,
    );
  }

  return paise;
};

const getErrorMessage = (error) => {
  const body = error?.response?.data;

  if (
    Array.isArray(body?.errors) &&
    body.errors.length
  ) {
    return body.errors
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.message ||
            item?.msg ||
            "Validation failed",
      )
      .join(", ");
  }

  return (
    body?.message ||
    error?.message ||
    "Unable to load stock valuation."
  );
};

const normalizeRow = (record) => {
  if (
    !record?.productCode ||
    !record?.name ||
    typeof record.currentStock !== "number" ||
    !Number.isFinite(record.currentStock) ||
    record.currentStock < 0
  ) {
    throw new Error(
      "The valuation API returned an invalid Product record.",
    );
  }

  const hasRate =
    record.purchasePrice !== null &&
    record.purchasePrice !== undefined;

  const hasValue =
    record.stockValue !== null &&
    record.stockValue !== undefined;

  const valuationRatePaise = hasRate
    ? rupeesToPaise(
        record.purchasePrice,
        `Purchase price for ${record.productCode}`,
      )
    : null;

  const stockValuePaise = hasValue
    ? rupeesToPaise(
        record.stockValue,
        `Stock value for ${record.productCode}`,
      )
    : null;

  return {
    ...record,

    rowId: String(
      record._id || record.productCode,
    ),

    category:
      record.category || "Uncategorized",

    brand:
      record.brand || "Not specified",

    unit:
      record.unit || "",

    stockState:
      record.currentStock > 0
        ? "IN_STOCK"
        : "OUT_OF_STOCK",

    valuationState:
      hasValue ? "VALUED" : "UNVALUED",

    valuationRatePaise,

    stockValuePaise,

    valuationMethod:
      "Current Product purchase price",
  };
};

function StockValuation() {
  const [records, setRecords] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [selectedRecord, setSelectedRecord] =
    useState(null);

  const [loadedAt, setLoadedAt] =
    useState(null);

  const requestIdRef = useRef(0);

  const loadValuation = useCallback(async () => {
    const requestId =
      ++requestIdRef.current;

    const isCurrent = () =>
      requestId === requestIdRef.current;

    setLoading(true);
    setError("");

    try {
      const first =
        await stockValuationApi.getAll({
          page: 1,
          limit: 100,
        });

      if (!isCurrent()) {
        return;
      }

      if (
        !Array.isArray(first?.data?.data)
      ) {
        throw new Error(
          "Invalid stock valuation response. Expected data to be an array.",
        );
      }

      const pagination =
        first.data.pagination;

      if (!pagination) {
        throw new Error(
          "The valuation API did not return pagination.",
        );
      }

      const pages = Number(
        pagination.totalPages,
      );

      if (
        !Number.isSafeInteger(pages) ||
        pages < 0
      ) {
        throw new Error(
          "Invalid stock valuation pagination.",
        );
      }

      const rows = [...first.data.data];

      for (
        let page = 2;
        page <= pages;
        page += 1
      ) {
        if (!isCurrent()) {
          return;
        }

        const response =
          await stockValuationApi.getAll({
            page,
            limit: 100,
          });

        if (!isCurrent()) {
          return;
        }

        if (
          !Array.isArray(response?.data?.data)
        ) {
          throw new Error(
            "Unable to read a valuation report page.",
          );
        }

        rows.push(...response.data.data);
      }

      const normalized =
        rows.map(normalizeRow);

      const identifiers = new Set(
        normalized.map(
          (record) => record.rowId,
        ),
      );

      if (
        identifiers.size !==
        normalized.length
      ) {
        throw new Error(
          "The report returned duplicate Product rows. Refresh and try again.",
        );
      }

      if (!isCurrent()) {
        return;
      }

      setRecords(normalized);
      setSelectedRecord(null);
      setLoadedAt(new Date());
    } catch (requestError) {
      if (isCurrent()) {
        setRecords([]);
        setSelectedRecord(null);
        setLoadedAt(null);

        setError(
          getErrorMessage(requestError),
        );
      }
    } finally {
      if (isCurrent()) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadValuation();

    return () => {
      requestIdRef.current += 1;
    };
  }, [loadValuation]);

  const summary = useMemo(() => {
    let totalValuePaise = 0n;
    let inStockProducts = 0;
    let unvaluedProducts = 0;

    for (const record of records) {
      if (record.currentStock > 0) {
        inStockProducts += 1;
      }

      if (
        record.stockValuePaise === null
      ) {
        unvaluedProducts += 1;
      } else {
        totalValuePaise += BigInt(
          record.stockValuePaise,
        );
      }
    }

    return {
      productCount: records.length,
      inStockProducts,
      unvaluedProducts,
      totalValuePaise,
    };
  }, [records]);

  const columns = useMemo(
    () => [
      {
        key: "productCode",
        label: "Product Code",
        sortable: true,

        render: (value, row) => (
          <button
            type="button"
            className="doc-link-button"
            aria-label={`View valuation for ${value}`}
            onClick={(event) => {
              event.stopPropagation();
              setSelectedRecord(row);
            }}
          >
            {value}
          </button>
        ),
      },

      {
        key: "name",
        label: "Product",
        sortable: true,

        render: (value, row) => (
          <div className="dl-customer">
            <strong>{value}</strong>
            <span>{row.category}</span>
          </div>
        ),
      },

      {
        key: "brand",
        label: "Brand",
        sortable: true,
      },

      {
        key: "unit",
        label: "Unit",
        sortable: true,
      },

      {
        key: "currentStock",
        label: "Stock Quantity",
        type: "number",
        sortable: true,

        render: (value) =>
          quantityFormatter.format(value),
      },

      {
        key: "valuationRatePaise",
        label: "Valuation Rate",
        type: "number",
        sortable: true,
        render: formatPaise,
      },

      {
        key: "stockValuePaise",
        label: "Stock Value",
        type: "number",
        sortable: true,
        render: formatPaise,
      },

      {
        key: "valuationState",
        label: "Valuation Status",
        sortable: true,

        render: (value) => (
          <StatusField value={value} />
        ),
      },

      {
        key: "valuationMethod",
        label: "Valuation Method",
        sortable: true,
        visible: false,
      },

      {
        key: "category",
        label: "Category",
        sortable: true,
        visible: false,
      },

      {
        key: "stockState",
        label: "Stock Status",
        sortable: true,
        visible: false,

        render: (value) =>
          value === "IN_STOCK"
            ? "In Stock"
            : "Out of Stock",
      },
    ],
    [],
  );

  return (
    <>
      {error && (
        <div
          className="section-form-api-error"
          role="alert"
        >
          <p>{error}</p>

          <Button
            type="button"
            variant="secondary"
            disabled={loading}
            onClick={loadValuation}
          >
            Retry
          </Button>
        </div>
      )}

      <DataList
        title="Stock Valuation"
        subtitle="Review inventory quantities valued at current Product purchase prices"
        columns={columns}
        data={records}
        loading={loading}
        rowKey="rowId"
        showCase="list"
        searchable
        filterable
        sortable
        selectable={false}
        columnVisibility
        pagination
        storageKey="trustiq-stock-valuation"
        searchPlaceholder="Search Product code, name, category or brand..."
        filters={[
          {
            key: "stockState",
            label: "Stock Status",
            type: "select",

            options: [
              {
                value: "IN_STOCK",
                label: "In Stock",
              },
              {
                value: "OUT_OF_STOCK",
                label: "Out of Stock",
              },
            ],
          },

          {
            key: "valuationState",
            label: "Valuation Status",
            type: "select",

            options: [
              {
                value: "VALUED",
                label: "Valued",
              },
              {
                value: "UNVALUED",
                label: "Missing Valuation",
              },
            ],
          },
        ]}
        quickFilters={[
          {
            key: "stockState",
            value: "",
            label: "All",
          },
          {
            key: "stockState",
            value: "IN_STOCK",
            label: "In Stock",
          },
          {
            key: "stockState",
            value: "OUT_OF_STOCK",
            label: "Out of Stock",
          },
          {
            key: "valuationState",
            value: "UNVALUED",
            label: "Missing Valuation",
          },
        ]}
        actions={{
          view: (row) =>
            setSelectedRecord(row),
        }}
        onRefresh={loadValuation}
      />

      <BoxModal
        show={Boolean(selectedRecord)}
        onClose={() =>
          setSelectedRecord(null)
        }
        title="Stock Valuation Details"
        subtitle={
          selectedRecord?.productCode || ""
        }
        width="min(680px, calc(100vw - 24px))"
        footer={
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setSelectedRecord(null)
            }
          >
            Close
          </Button>
        }
      >
        {selectedRecord && (
          <div className="box-modal-form-grid">
            <Input
              label="Product Code"
              value={
                selectedRecord.productCode
              }
              readOnly
            />

            <Input
              label="Product Name"
              value={selectedRecord.name}
              readOnly
            />

            <Input
              label="Category"
              value={selectedRecord.category}
              readOnly
            />

            <Input
              label="Brand"
              value={selectedRecord.brand}
              readOnly
            />

            <Input
              label="Stock Quantity"
              value={
                `${quantityFormatter.format(
                  selectedRecord.currentStock,
                )} ${selectedRecord.unit}`
              }
              readOnly
            />

            <Input
              label="Valuation Rate"
              value={formatPaise(
                selectedRecord.valuationRatePaise,
              )}
              readOnly
            />

            <Input
              label="Stock Value"
              value={formatPaise(
                selectedRecord.stockValuePaise,
              )}
              readOnly
            />

            <Input
              label="Valuation Method"
              value={
                selectedRecord.valuationMethod
              }
              readOnly
            />
          </div>
        )}
      </BoxModal>
    </>
  );
}

export default StockValuation;