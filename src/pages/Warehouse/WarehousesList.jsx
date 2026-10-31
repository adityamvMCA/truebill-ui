import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Plus } from "lucide-react";

import DataList from "../../components/common/DataList/DataList";
import StatusField from "../../components/common/StatusField/StatusField";

import warehouseApi from "../../services/modules/warehouseApi";

import WarehouseModal from "./WarehouseModal";
import toast from "react-hot-toast";

const INITIAL_MODAL = {
  open: false,
  mode: "create",
  record: null,
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

  return body?.message || error?.message || "Unable to load warehouses.";
};

const isSetupMissing = (error) =>
  error?.response?.status === 409 &&
  String(error?.response?.data?.message ?? "").includes(
    "Warehouse setup is missing",
  );

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const PAGE_SIZES = [20, 50, 100];
const SEARCH_DEBOUNCE_MS = 400;

const INITIAL_QUERY = {
  page: 1,
  limit: 20,
  search: "",
  status: "",
  sortBy: "",
  sortDir: "",
};

const INITIAL_COUNTS = { total: 0, active: 0, inactive: 0 };

function WarehousesList() {
  const [warehouses, setWarehouses] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [setupRequired, setSetupRequired] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState("");
  const [modalState, setModalState] = useState(INITIAL_MODAL);

  const [query, setQuery] = useState(INITIAL_QUERY);
  const [searchText, setSearchText] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [counts, setCounts] = useState(INITIAL_COUNTS);

  const loadIdRef = useRef(0);
  const countIdRef = useRef(0);
  const setupLockRef = useRef(false);
  const mountedRef = useRef(false);

  const loadWarehouses = useCallback(async () => {
    const requestId = ++loadIdRef.current;
    const isCurrent = () =>
      mountedRef.current && requestId === loadIdRef.current;

    setLoading(true);
    setLoadError("");
    setSetupError("");

    try {
      const settingsResponse = await warehouseApi.getSettings();

      if (!isCurrent()) return false;

      const inventorySettings = settingsResponse?.data?.data;

      if (
        !inventorySettings?.defaultWarehouseId ||
        typeof inventorySettings.multiWarehouseEnabled !== "boolean"
      ) {
        throw new Error("The server returned invalid inventory settings.");
      }

      const params = {};
      Object.entries(query).forEach(([key, value]) => {
        if (value !== "" && value != null) params[key] = value;
      });

      const response = await warehouseApi.getAll(params);

      if (!isCurrent()) return false;

      const body = response?.data;

      if (!Array.isArray(body?.data) || !body?.pagination) {
        throw new Error("The server returned an invalid warehouse list.");
      }

      if (body.data.some((r) => !r?._id || !r?.warehouseCode)) {
        throw new Error("One or more warehouse records are invalid.");
      }

      const data = body.data.map((warehouse) => ({
        ...warehouse,
        isDefault:
          String(warehouse._id) ===
          String(inventorySettings.defaultWarehouseId),
      }));

      setWarehouses(data);
      setPagination(body.pagination);
      setSettings(inventorySettings);
      setSetupRequired(false);

      return true;
    } catch (error) {
      if (isCurrent()) {
        setWarehouses([]);
        setSettings(null);
        setSetupRequired(isSetupMissing(error));
        setLoadError(getErrorMessage(error));
      }
      return false;
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [query]);

  const loadCounts = useCallback(async () => {
    const requestId = ++countIdRef.current;
    try {
      const response = await warehouseApi.getCounts();
      const next = response?.data?.counts;
      if (requestId === countIdRef.current && next) {
        setCounts({ ...INITIAL_COUNTS, ...next });
      }
    } catch {
      // informational only
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadWarehouses(), loadCounts()]);
  }, [loadWarehouses, loadCounts]);

  useEffect(() => {
    mountedRef.current = true;
    loadWarehouses();

    return () => {
      mountedRef.current = false;
      loadIdRef.current += 1;
      countIdRef.current += 1;
    };
  }, [loadWarehouses]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

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
      status: filters.status || "",
      page: 1,
    }));
  }, []);

  const handleSetupWarehouses = async () => {
    if (loading || setupLoading || setupLockRef.current || !setupRequired) {
      return;
    }

    const confirmed = window.confirm(
      "Set up warehouses for the currently selected company? " +
        "This creates missing default-location settings. " +
        "It does not initialize stock tracking.",
    );

    if (!confirmed) {
      return;
    }

    setupLockRef.current = true;
    setSetupLoading(true);
    setSetupError("");

    try {
      const response = await warehouseApi.setup();

      if (response?.data?.success !== true) {
        throw new Error(
          response?.data?.message || "Warehouse setup was not confirmed.",
        );
      }

      if (!mountedRef.current) {
        return;
      }

      // Verify by reading the same endpoints used
      // by this page, rather than trusting POST alone.
      await loadWarehouses();
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }

      const status = error?.response?.status;

      if (status === 403) {
        setSetupError(
          "Your account does not have warehouse.setup permission. " +
            "Ask a tenant administrator to complete setup.",
        );
      } else if (status === 404) {
        setSetupError(
          "The warehouse setup endpoint was not found. " +
            "Register POST /api/warehouses/setup and restart the backend.",
        );
      } else if (!status || status >= 500) {
        setSetupError(
          `${getErrorMessage(error)} ` +
            "Setup may have completed. Click Retry to check before running setup again.",
        );
      } else {
        setSetupError(getErrorMessage(error));
      }
    } finally {
      setupLockRef.current = false;

      if (mountedRef.current) {
        setSetupLoading(false);
      }
    }
  };

  const busy = loading || setupLoading;

  const openWarehouse = useCallback((record = null, mode = "create") => {
    setModalState({
      open: true,
      mode,
      record,
    });
  }, []);

  const handleSaved = () => {
    refreshAll();
  };

  const columns = useMemo(
    () => [
      {
        key: "warehouseCode",
        label: "Warehouse Code",
        sortable: true,

        render: (value, row) => (
          <button
            type="button"
            className="doc-link-button"
            aria-label={`View warehouse ${value || ""}`}
            onClick={(event) => {
              event.stopPropagation();
              openWarehouse(row, "view");
            }}
          >
            {value || "N/A"}
          </button>
        ),
      },
      {
        key: "name",
        label: "Warehouse Name",
        sortable: true,
      },
      {
        key: "isDefault",
        label: "Location Type",
        sortable: false,

        render: (value) => (value ? "Default Location" : "Additional Location"),
      },
      {
        key: "address",
        label: "Address",
        sortable: false,

        render: (value) => value || "Not provided",
      },
      {
        key: "status",
        label: "Status",
        sortable: true,

        render: (value) => <StatusField value={value} />,
      },
      {
        key: "description",
        label: "Description",
        sortable: true,
        visible: false,

        render: (value) => value || "No description",
      },
      {
        key: "createdAt",
        label: "Created",
        sortable: true,
        visible: false,
        render: formatDate,
      },
      {
        key: "updatedAt",
        label: "Last Updated",
        sortable: true,
        visible: false,
        render: formatDate,
      },
    ],
    [openWarehouse],
  );

  const filters = useMemo(
    () => [
      {
        key: "status",
        label: "Status",
        type: "select",
        options: ["ACTIVE", "INACTIVE"],
      },
    ],
    [],
  );

  const quickFilters = useMemo(
    () => [
      { key: "status", value: "", label: "All", count: counts.total },
      { key: "status", value: "ACTIVE", label: "Active", count: counts.active },
      {
        key: "status",
        value: "INACTIVE",
        label: "Inactive",
        count: counts.inactive,
      },
    ],
    [counts],
  );

  const trackingReady = settings?.warehouseTrackingStatus === "READY";

  const handleRefresh = () => {
    if (!setupLockRef.current && !loading) {
      return loadWarehouses();
    }

    return undefined;
  };
  const confirmBulkStatus = (rows, status) => {
    if (!rows?.length) {
      return;
    }

    const activate = status === "ACTIVE";
    const label = activate ? "Activate" : "Deactivate";
    const noun = rows.length === 1 ? "warehouse" : "warehouses";

    const confirmed = window.confirm(
      `${label} ${rows.length} selected ${noun}?`,
    );

    if (!confirmed) {
      return;
    }

    bulkUpdateStatus(rows, status);
  };

  const bulkUpdateStatus = async (rows, status) => {
    const ids = Array.from(new Set(rows.map((row) => row._id)));

    try {
      const response = await warehouseApi.bulkStatus(ids, status);
      const result = response?.data || {};
      const changed = Number(result.modifiedCount) || 0;
      const skipped = Number(result.skippedCount) || 0;

      if (changed) {
        toast.success(
          `${changed} warehouse${changed === 1 ? "" : "s"} ${status === "ACTIVE" ? "activated" : "deactivated"}`,
        );
      }

      if (skipped) {
        toast(
          `${skipped} skipped (default location or already ${status.toLowerCase()})`,
        );
      }
    } catch (error) {
      toast.error(getErrorMessage(error), { duration: 7000 });
    }

    await refreshAll();
  };
  return (
    <>
      {loadError && (
        <div className="section-form-api-error" role="alert">
          <p>{loadError}</p>

          {setupRequired && (
            <p>
              Complete setup for the currently selected company using the button
              below. Refreshing alone does not create warehouse settings.
            </p>
          )}

          <button
            type="button"
            className="doc-link-button"
            disabled={busy}
            onClick={handleRefresh}
          >
            Retry
          </button>

          {setupRequired && (
            <button
              type="button"
              className="so-primary-button"
              disabled={busy}
              onClick={handleSetupWarehouses}
            >
              {setupLoading
                ? "Setting Up Warehouses..."
                : "Set Up Warehouses for This Company"}
            </button>
          )}
        </div>
      )}

      {setupError && (
        <div className="section-form-api-error" role="alert">
          <p>{setupError}</p>
        </div>
      )}
      <DataList
        title="Warehouses"
        subtitle="Manage shops, godowns and storage locations"
        columns={columns}
        data={warehouses}
        loading={busy}
        rowKey="_id"
        showCase="list"
        searchable
        filterable
        sortable
        selectable
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
        storageKey="trustiq-warehouses"
        searchPlaceholder="Search warehouse code or name..."
        actions={{
          view: (row) => openWarehouse(row, "view"),
          edit: (row) => openWarehouse(row, "edit"),
        }}
        bulkActions={[
          {
            key: "activate",
            label: "Activate",
            action: (rows) => confirmBulkStatus(rows, "ACTIVE"),
          },
          {
            key: "deactivate",
            label: "Deactivate",
            action: (rows) => confirmBulkStatus(rows, "INACTIVE"),
          },
        ]}
        onRefresh={refreshAll}
      />

      <WarehouseModal
        isOpen={modalState.open}
        warehouse={modalState.record}
        mode={modalState.mode}
        onClose={() => setModalState(INITIAL_MODAL)}
        onSave={handleSaved}
      />
    </>
  );
}

export default WarehousesList;
