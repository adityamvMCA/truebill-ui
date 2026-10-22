import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Plus } from "lucide-react";

import DataList from "../../components/common/DataList/DataList";
import StatusField from "../../components/common/StatusField/StatusField";

import warehouseApi from "../../services/modules/warehouseApi";

import WarehouseModal from "./WarehouseModal";

const INITIAL_MODAL = {
  open: false,
  mode: "create",
  record: null,
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
    "Unable to load warehouses."
  );
};

const isSetupMissing = (error) =>
  error?.response?.status === 409 &&
  String(
    error?.response?.data?.message ?? "",
  ).includes("Warehouse setup is missing");

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

const sortWarehouses = (records) =>
  [...records].sort((first, second) => {
    if (
      Boolean(first.isDefault) !==
      Boolean(second.isDefault)
    ) {
      return first.isDefault ? -1 : 1;
    }

    return String(first.name ?? "").localeCompare(
      String(second.name ?? ""),
    );
  });

function WarehousesList() {
  const [warehouses, setWarehouses] =
    useState([]);

  const [settings, setSettings] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState("");

  const [setupRequired, setSetupRequired] =
    useState(false);

  const [setupLoading, setSetupLoading] =
    useState(false);

  const [setupError, setSetupError] =
    useState("");

  const [modalState, setModalState] =
    useState(INITIAL_MODAL);

  const loadIdRef = useRef(0);
  const setupLockRef = useRef(false);
  const mountedRef = useRef(false);

  const loadWarehouses = useCallback(async () => {
    const requestId = ++loadIdRef.current;

    const isCurrentRequest = () =>
      mountedRef.current &&
      requestId === loadIdRef.current;

    setLoading(true);
    setLoadError("");
    setSetupError("");

    try {
      // Read settings first so missing setup does not
      // trigger a second, redundant failing list request.
      const settingsResponse =
        await warehouseApi.getSettings();

      if (!isCurrentRequest()) {
        return false;
      }

      const inventorySettings =
        settingsResponse?.data?.data;

      if (
        !inventorySettings?.defaultWarehouseId ||
        typeof inventorySettings.multiWarehouseEnabled !==
          "boolean"
      ) {
        throw new Error(
          "The server returned invalid inventory settings.",
        );
      }

      const first = await warehouseApi.getAll({
        page: 1,
        limit: 100,
      });

      if (!isCurrentRequest()) {
        return false;
      }

      if (!Array.isArray(first?.data?.data)) {
        throw new Error(
          "The server returned an invalid warehouse list.",
        );
      }

      const records = [...first.data.data];

      const pages = Number(
        first.data.pagination?.totalPages ?? 1,
      );

      if (
        !Number.isSafeInteger(pages) ||
        pages < 0
      ) {
        throw new Error(
          "Invalid warehouse pagination.",
        );
      }

      for (
        let page = 2;
        page <= pages;
        page += 1
      ) {
        if (!isCurrentRequest()) {
          return false;
        }

        const response =
          await warehouseApi.getAll({
            page,
            limit: 100,
          });

        if (!isCurrentRequest()) {
          return false;
        }

        if (
          !Array.isArray(response?.data?.data)
        ) {
          throw new Error(
            "Unable to read a warehouse page.",
          );
        }

        records.push(...response.data.data);
      }

      if (
        records.some(
          (record) =>
            !record?._id ||
            !record?.warehouseCode,
        )
      ) {
        throw new Error(
          "One or more warehouse records are invalid.",
        );
      }

      if (!isCurrentRequest()) {
        return false;
      }

      const uniqueRecords = Array.from(
        new Map(
          records.map((record) => [
            String(record._id),
            {
              ...record,

              isDefault:
                String(record._id) ===
                String(
                  inventorySettings.defaultWarehouseId,
                ),
            },
          ]),
        ).values(),
      );

      setWarehouses(
        sortWarehouses(uniqueRecords),
      );

      setSettings(inventorySettings);
      setSetupRequired(false);

      return true;
    } catch (error) {
      if (isCurrentRequest()) {
        setWarehouses([]);
        setSettings(null);
        setSetupRequired(
          isSetupMissing(error),
        );
        setLoadError(
          getErrorMessage(error),
        );
      }

      return false;
    } finally {
      if (isCurrentRequest()) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    loadWarehouses();

    return () => {
      mountedRef.current = false;
      loadIdRef.current += 1;
    };
  }, [loadWarehouses]);

  const handleSetupWarehouses = async () => {
    if (
      loading ||
      setupLoading ||
      setupLockRef.current ||
      !setupRequired
    ) {
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
      const response =
        await warehouseApi.setup();

      if (
        response?.data?.success !== true
      ) {
        throw new Error(
          response?.data?.message ||
            "Warehouse setup was not confirmed.",
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

      const status =
        error?.response?.status;

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
      } else if (
        !status ||
        status >= 500
      ) {
        setSetupError(
          `${getErrorMessage(error)} ` +
            "Setup may have completed. Click Retry to check before running setup again.",
        );
      } else {
        setSetupError(
          getErrorMessage(error),
        );
      }
    } finally {
      setupLockRef.current = false;

      if (mountedRef.current) {
        setSetupLoading(false);
      }
    }
  };

  const busy = loading || setupLoading;

  const openWarehouse = useCallback(
    (record = null, mode = "create") => {
      setModalState({
        open: true,
        mode,
        record,
      });
    },
    [],
  );

  const handleSaved = (savedWarehouse) => {
    if (!savedWarehouse?._id) {
      return;
    }

    setWarehouses((previous) => {
      const existing = previous.find(
        (record) =>
          String(record._id) ===
          String(savedWarehouse._id),
      );

      const merged = {
        ...existing,
        ...savedWarehouse,

        isDefault:
          String(savedWarehouse._id) ===
          String(settings?.defaultWarehouseId),
      };

      const next = existing
        ? previous.map((record) =>
            String(record._id) ===
            String(merged._id)
              ? merged
              : record,
          )
        : [...previous, merged];

      return sortWarehouses(next);
    });

    if (
      String(savedWarehouse._id) ===
      String(settings?.defaultWarehouseId)
    ) {
      setSettings((previous) =>
        previous
          ? {
              ...previous,

              defaultWarehouse: {
                ...previous.defaultWarehouse,
                ...savedWarehouse,
              },
            }
          : previous,
      );
    }
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
        sortable: true,

        render: (value) =>
          value
            ? "Default Location"
            : "Additional Location",
      },
      {
        key: "address",
        label: "Address",
        sortable: true,

        render: (value) =>
          value || "Not provided",
      },
      {
        key: "status",
        label: "Status",
        sortable: true,

        render: (value) => (
          <StatusField value={value} />
        ),
      },
      {
        key: "description",
        label: "Description",
        sortable: true,
        visible: false,

        render: (value) =>
          value || "No description",
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

  const trackingReady =
    settings?.warehouseTrackingStatus === "READY";

  const handleRefresh = () => {
    if (
      !setupLockRef.current &&
      !loading
    ) {
      return loadWarehouses();
    }

    return undefined;
  };

  return (
    <>
      {loadError && (
        <div
          className="section-form-api-error"
          role="alert"
        >
          <p>{loadError}</p>

          {setupRequired && (
            <p>
              Complete setup for the currently
              selected company using the button
              below. Refreshing alone does not
              create warehouse settings.
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
        <div
          className="section-form-api-error"
          role="alert"
        >
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
        columnVisibility
        pagination
        storageKey="trustiq-warehouses"
        searchPlaceholder="Search warehouse code, name or address..."
        filters={[
          {
            key: "status",
            label: "Status",
            type: "select",
            options: ["ACTIVE", "INACTIVE"],
          },
          {
            key: "isDefault",
            label: "Location Type",
            type: "select",

            options: [
              {
                label: "Default Location",
                value: true,
              },
              {
                label: "Additional Location",
                value: false,
              },
            ],
          },
        ]}
        quickFilters={[
          {
            key: "status",
            value: "",
            label: "All",
          },
          {
            key: "status",
            value: "ACTIVE",
            label: "Active",
          },
          {
            key: "status",
            value: "INACTIVE",
            label: "Inactive",
          },
        ]}
        actions={{
          view: (row) =>
            openWarehouse(row, "view"),

          edit: (row) =>
            openWarehouse(row, "edit"),
        }}
        onRefresh={handleRefresh}
        addButton={
          <button
            type="button"
            className="so-primary-button"
            disabled={
              busy ||
              Boolean(loadError) ||
              !settings
            }
            onClick={() =>
              openWarehouse()
            }
          >
            <Plus size={16} />
            <span>New Warehouse</span>
          </button>
        }
      />

      <WarehouseModal
        isOpen={modalState.open}
        warehouse={modalState.record}
        mode={modalState.mode}
        onClose={() =>
          setModalState(INITIAL_MODAL)
        }
        onSave={handleSaved}
      />
    </>
  );
}

export default WarehousesList;