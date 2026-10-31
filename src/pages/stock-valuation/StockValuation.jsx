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

const PAGE_SIZES = [20, 50, 100];
const SEARCH_DEBOUNCE_MS = 400;

const INITIAL_QUERY = {
  page: 1,
  limit: 20,
  search: "",
  category: "",
  brand: "",
  stockState: "",
  valuationState: "",
  sortBy: "",
  sortDir: "",
};

const integerFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

const quantityFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 3,
});

const formatPaise = (value) => {
  if (value === null || value === undefined) {
    return "—";
  }

  const paise = BigInt(value);
  const rupees = paise / 100n;
  const fraction = String(paise % 100n).padStart(2, "0");

  return `₹${integerFormatter.format(rupees)}.${fraction}`;
};

const rupeesToPaise = (value, label) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a valid non-negative amount.`);
  }

  const scaled = value * 100;
  const paise = Math.round(scaled);

  if (!Number.isSafeInteger(paise) || Math.abs(scaled - paise) > 0.000001) {
    throw new Error(
      `${label} exceeds the supported range or contains more than two decimal places.`,
    );
  }

  return paise;
};

const getErrorMessage = (error) => {
  const body = error?.response?.data;

  if (Array.isArray(body?.errors) && body.errors.length) {
    return body.errors
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.message || item?.msg || "Validation failed",
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
    record.purchasePrice !== null && record.purchasePrice !== undefined;

  const hasValue =
    record.stockValue !== null && record.stockValue !== undefined;

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
    rowId: String(record._id || record.productCode),
    category: record.category || "Uncategorized",
    brand: record.brand || "Not specified",
    unit: record.unit || "",
    stockState:
      record.currentStock > 0 ? "IN_STOCK" : "OUT_OF_STOCK",
    valuationState: hasValue ? "VALUED" : "UNVALUED",
    valuationRatePaise,
    stockValuePaise,
    valuationMethod: "Current Product purchase price",
  };
};

function StockValuation() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loadedAt, setLoadedAt] = useState(null);

  const [query, setQuery] = useState(INITIAL_QUERY);
  const [searchText, setSearchText] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [summary, setSummary] = useState({
    totalProducts: 0,
    totalQuantity: 0,
    totalStockValue: 0,
  });

  const requestIdRef = useRef(0);

  const loadValuation = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    const isCurrent = () => requestId === requestIdRef.current;

    setLoading(true);
    setError("");

    try {
      const params = {};

      Object.entries(query).forEach(([key, value]) => {
        if (value !== "" && value != null) params[key] = value;
      });

      const response = await stockValuationApi.getAll(params);

      if (!isCurrent()) return;

      const body = response?.data;

      if (!Array.isArray(body?.data) || !body?.pagination) {
        throw new Error(
          "Invalid stock valuation response. Expected data to be an array.",
        );
      }

      const normalized = body.data.map(normalizeRow);

      const identifiers = new Set(normalized.map((r) => r.rowId));

      if (identifiers.size !== normalized.length) {
        throw new Error(
          "The report returned duplicate Product rows. Refresh and try again.",
        );
      }

      setRecords(normalized);
      setPagination(body.pagination);

      if (body.summary) {
        setSummary(body.summary);
      }

      setSelectedRecord(null);
      setLoadedAt(new Date());
    } catch (requestError) {
      if (isCurrent()) {
        setRecords([]);
        setSelectedRecord(null);
        setLoadedAt(null);
        setError(getErrorMessage(requestError));
      }
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    loadValuation();

    return () => {
      requestIdRef.current += 1;
    };
  }, [loadValuation]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery((previous) =>
        previous.search === searchText.trim()
          ? previous
          : { ...previous, search: searchText.trim(), page: 1 },
      );
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchText]);

  const handlePageChange = useCallback((page) => {
    const next = Number(page) || 1;

    setQuery((previous) =>
      previous.page === next ? previous : { ...previous, page: next },
    );
  }, []);

  const handlePageSizeChange = useCallback((limit) => {
    const size = PAGE_SIZES.includes(Number(limit)) ? Number(limit) : 20;

    setQuery((previous) => ({ ...previous, limit: size, page: 1 }));
  }, []);

  const handleSearch = useCallback((value) => {
    setSearchText(String(value ?? ""));
  }, []);

  const handleSortChange = useCallback((sort) => {
    const key = sort?.key || "";
    const direction = sort?.direction === "desc" ? "desc" : key ? "asc" : "";

    setQuery((previous) => ({
      ...previous,
      sortBy: key,
      sortDir: direction,
      page: 1,
    }));
  }, []);
const handleFilterChange = useCallback((filters = {}) => {
  setQuery((previous) => ({
    ...previous,
    category: filters.category || "",
    brand: filters.brand || "",
    page: 1,
  }));
}, []);

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

        render: (value) => quantityFormatter.format(value),
      },
      {
        key: "valuationRatePaise",
        label: "Valuation Rate",
        type: "number",
        sortable: false,
        render: formatPaise,
      },
      {
        key: "stockValuePaise",
        label: "Stock Value",
        type: "number",
        sortable: false,
        render: formatPaise,
      },
      {
        key: "valuationState",
        label: "Valuation Status",
        sortable: false,

        render: (value) => <StatusField value={value} />,
      },
      {
        key: "valuationMethod",
        label: "Valuation Method",
        sortable: false,
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
        sortable: false,
        visible: false,

        render: (value) =>
          value === "IN_STOCK" ? "In Stock" : "Out of Stock",
      },
    ],
    [],
  );

  const filters = useMemo(
    () => [
      {
        key: "stockState",
        label: "Stock Status",
        type: "select",
        options: [
          { value: "IN_STOCK", label: "In Stock" },
          { value: "OUT_OF_STOCK", label: "Out of Stock" },
        ],
      },
      {
        key: "valuationState",
        label: "Valuation Status",
        type: "select",
        options: [
          { value: "VALUED", label: "Valued" },
          { value: "UNVALUED", label: "Missing Valuation" },
        ],
      },
    ],
    [],
  );

  const quickFilters = useMemo(
    () => [
      {
        key: "stockState",
        value: "",
        label: "All",
        count: summary.totalProducts,
      },
      {
        key: "stockState",
        value: "IN_STOCK",
        label: "In Stock",
        count: summary.inStockProducts ?? 0,
      },
      {
        key: "stockState",
        value: "OUT_OF_STOCK",
        label: "Out of Stock",
        count:
          (summary.totalProducts ?? 0) - (summary.inStockProducts ?? 0),
      },
      {
        key: "valuationState",
        value: "UNVALUED",
        label: "Missing Valuation",
        count: summary.unvaluedProducts ?? 0,
      },
    ],
    [summary],
  );

  return (
    <>
      {error && (
        <div className="section-form-api-error" role="alert">
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
        serverMode
        total={pagination.total}
        page={query.page}
        pageSize={query.limit}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onSearch={handleSearch}
        onSort={handleSortChange}
        onFilterChange={handleFilterChange}
        filters={filters}
        quickFilters={quickFilters}
        storageKey="trustiq-stock-valuation"
        searchPlaceholder="Search Product code or name..."
        actions={{
          view: (row) => setSelectedRecord(row),
        }}
        onRefresh={loadValuation}
      />

      <BoxModal
        show={Boolean(selectedRecord)}
        onClose={() => setSelectedRecord(null)}
        title="Stock Valuation Details"
        subtitle={selectedRecord?.productCode || ""}
        width="min(680px, calc(100vw - 24px))"
        footer={
          <Button
            type="button"
            variant="secondary"
            onClick={() => setSelectedRecord(null)}
          >
            Close
          </Button>
        }
      >
        {selectedRecord && (
          <div className="box-modal-form-grid">
            <Input label="Product Code" value={selectedRecord.productCode} readOnly />
            <Input label="Product Name" value={selectedRecord.name} readOnly />
            <Input label="Category" value={selectedRecord.category} readOnly />
            <Input label="Brand" value={selectedRecord.brand} readOnly />
            <Input
              label="Stock Quantity"
              value={`${quantityFormatter.format(selectedRecord.currentStock)} ${selectedRecord.unit}`}
              readOnly
            />
            <Input
              label="Valuation Rate"
              value={formatPaise(selectedRecord.valuationRatePaise)}
              readOnly
            />
            <Input
              label="Stock Value"
              value={formatPaise(selectedRecord.stockValuePaise)}
              readOnly
            />
            <Input
              label="Valuation Method"
              value={selectedRecord.valuationMethod}
              readOnly
            />
          </div>
        )}
      </BoxModal>
    </>
  );
}

export default StockValuation;