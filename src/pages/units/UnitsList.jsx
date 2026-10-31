import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import Papa from "papaparse";

import DataList from "../../components/common/DataList/DataList";
import StatusField from "../../components/common/StatusField/StatusField";
import ConfirmModal from "../../components/common/ConfirmModal/ConfirmModal";
import ImportPreviewModal from "../../components/common/DataList/ImportPreviewModal";

import productUnitApi from "../../services/modules/productUnitApi";

import UnitModal from "./UnitModal";

import "./units.css";

const INITIAL_MODAL = {
  open: false,
  mode: "create",
  record: null,
};

const INITIAL_CONFIRM = {
  open: false,
  action: undefined,
  title: "",
  message: "",
  confirmText: "Confirm",
  onConfirm: null,
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
    body?.error ||
    error?.message ||
    "Unable to complete the request."
  );
};

const extractUnit = (response) => {
  const unit = response?.data?.data || response?.data?.unit;

  if (!unit?._id || !unit?.unitCode) {
    throw new Error("The server did not return a valid unit.");
  }

  return unit;
};

const canonicalHeader = (header) => {
  const text = String(header ?? "")
    .replace(/^\uFEFF/, "")
    .trim();

  const key = text.replace(/[\s_-]+/g, "").toLowerCase();

  return {
    unitcode: "unitCode",
    name: "name",
    symbol: "symbol",
    description: "description",
    status: "status",
  }[key] || text;
};

function UnitsList() {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [total, setTotal] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  const [unitCounts, setUnitCounts] = useState({
    all: 0,
    active: 0,
    inactive: 0,
    defaults: 0,
    custom: 0,
  });

  const [query, setQuery] = useState({
    page: 1,
    limit: 20,
    search: "",
    sortBy: "",
    sortOrder: "",
    filters: {
      status: "",
      isSystem: "",
    },
  });

  const [modalState, setModalState] = useState(INITIAL_MODAL);
  const [confirmState, setConfirmState] = useState(INITIAL_CONFIRM);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [importPreview, setImportPreview] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importUncertain, setImportUncertain] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [bulkProgress, setBulkProgress] = useState("");

  const loadRequestRef = useRef(0);
  const parseIdRef = useRef(0);
  const mutationLockRef = useRef(false);

  const loadUnits = useCallback(() => {
    setReloadKey((current) => current + 1);
  }, []);

  useEffect(() => {
    const requestId = ++loadRequestRef.current;

    const load = async () => {
      setLoading(true);
      setLoadError("");

      try {
        const params = {
          page: query.page,
          limit: query.limit,
        };

        const searchValue = query.search.trim();

        if (searchValue) {
          params.search = searchValue;
        }

        if (query.sortBy && query.sortOrder) {
          params.sortBy = query.sortBy;
          params.sortOrder = query.sortOrder;
        }

        for (const key of ["status", "isSystem"]) {
          const value = query.filters[key];

          if (value !== undefined && value !== null && value !== "") {
            params[key] = value;
          }
        }

        const response = await productUnitApi.getAll(params);

        if (requestId !== loadRequestRef.current) {
          return;
        }

        const records = response?.data?.data;

        if (!Array.isArray(records)) {
          throw new Error("The server returned an invalid Unit list.");
        }

        if (records.some((unit) => !unit?._id || !unit?.unitCode)) {
          throw new Error("One or more Unit records are invalid.");
        }

        const serverTotal = Number(response?.data?.pagination?.total);
        const serverCounts = response?.data?.counts;

        setUnits(records);

        setTotal(
          Number.isFinite(serverTotal) && serverTotal >= 0
            ? serverTotal
            : records.length,
        );

        if (serverCounts && typeof serverCounts === "object") {
          setUnitCounts({
            all: Number(serverCounts.all) || 0,
            active: Number(serverCounts.active) || 0,
            inactive: Number(serverCounts.inactive) || 0,
            defaults: Number(serverCounts.defaults) || 0,
            custom: Number(serverCounts.custom) || 0,
          });
        }

        setModalState((current) => {
          if (!current.record) {
            return current;
          }

          const updated = records.find(
            (unit) => unit._id === current.record._id,
          );

          return updated
            ? { ...current, record: updated }
            : current;
        });
      } catch (error) {
        if (requestId !== loadRequestRef.current) {
          return;
        }

        const message = getErrorMessage(error);
        setLoadError(message);
        toast.error(message);
      } finally {
        if (requestId === loadRequestRef.current) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      loadRequestRef.current += 1;
      parseIdRef.current += 1;
    };
  }, [query, reloadKey]);

  const handlePageChange = useCallback((page) => {
    setQuery((current) =>
      current.page === page ? current : { ...current, page },
    );
  }, []);

  const handlePageSizeChange = useCallback((limit) => {
    setQuery((current) => ({
      ...current,
      page: 1,
      limit,
    }));
  }, []);

  const handleSearch = useCallback((search) => {
    setQuery((current) => {
      const nextSearch = search ?? "";

      if (current.search === nextSearch && current.page === 1) {
        return current;
      }

      return {
        ...current,
        page: 1,
        search: nextSearch,
      };
    });
  }, []);

  const handleSort = useCallback((sort) => {
    setQuery((current) => ({
      ...current,
      page: 1,
      sortBy: sort?.key || "",
      sortOrder: sort?.direction || "",
    }));
  }, []);

  const handleFilterChange = useCallback((filters) => {
    setQuery((current) => ({
      ...current,
      page: 1,
      filters: {
        status: filters?.status ?? "",
        isSystem: filters?.isSystem ?? "",
      },
    }));
  }, []);

  const upsertUnit = useCallback(
    (record) => {
      if (!record?._id || !record?.unitCode) {
        loadUnits();
        return;
      }

      setUnits((previous) => {
        const exists = previous.some((unit) => unit._id === record._id);

        if (!exists) {
          return previous;
        }

        return previous.map((unit) =>
          unit._id === record._id ? record : unit,
        );
      });

      setModalState((current) =>
        current.record?._id === record._id
          ? { ...current, record }
          : current,
      );

      loadUnits();
    },
    [loadUnits],
  );

  const openUnit = useCallback((record = null, mode = "create") => {
    if (mutationLockRef.current) {
      return;
    }

    setModalState({
      open: true,
      mode,
      record,
    });
  }, []);

  const columns = useMemo(
    () => [
      {
        key: "unitCode",
        label: "Unit Code",
        sortable: true,
        render: (value, row) => (
          <button
            type="button"
            className="doc-link-button"
            aria-label={`View unit ${value || ""}`}
            onClick={() => openUnit(row, "view")}
          >
            {value || "N/A"}
          </button>
        ),
      },
      {
        key: "name",
        label: "Unit Name",
        sortable: true,
        render: (value, row) => (
          <div className="dl-customer">
            <strong>{value || "—"}</strong>
            <span>{row.description || "No description"}</span>
          </div>
        ),
      },
      {
        key: "symbol",
        label: "Symbol",
        sortable: true,
        render: (value) => value || "—",
      },
      {
        key: "isSystem",
        label: "Source",
        sortable: true,
        render: (value) => (
          <span
            className={[
              "unit-source-badge",
              value
                ? "unit-source-badge--default"
                : "unit-source-badge--custom",
            ].join(" ")}
          >
            {value ? "Default" : "Custom"}
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (value) => <StatusField value={value} />,
      },
    ],
    [openUnit],
  );

  const filters = useMemo(
    () => [
      {
        key: "status",
        label: "Status",
        type: "select",
        options: ["ACTIVE", "INACTIVE"],
      },
      {
        key: "isSystem",
        label: "Source",
        type: "select",
        options: [
          {
            label: "Default",
            value: true,
          },
          {
            label: "Custom",
            value: false,
          },
        ],
      },
    ],
    [],
  );

  const quickFilters = useMemo(
    () => [
      {
        key: "status",
        value: "",
        label: "All",
        count: unitCounts.all,
      },
      {
        key: "status",
        value: "ACTIVE",
        label: "Active",
        count: unitCounts.active,
      },
      {
        key: "status",
        value: "INACTIVE",
        label: "Inactive",
        count: unitCounts.inactive,
      },
      {
        key: "isSystem",
        value: true,
        label: "Default",
        count: unitCounts.defaults,
      },
      {
        key: "isSystem",
        value: false,
        label: "Custom",
        count: unitCounts.custom,
      },
    ],
    [unitCounts],
  );

  const openConfirm = (configuration) => {
    if (mutationLockRef.current) {
      return;
    }

    setConfirmState({
      ...INITIAL_CONFIRM,
      ...configuration,
      open: true,
    });
  };

  const closeConfirm = () => {
    if (confirmLoading || mutationLockRef.current) {
      return;
    }

    setConfirmState(INITIAL_CONFIRM);
  };

  const executeBulkStatus = async (rows, status) => {
    const uniqueUnits = [
      ...new Map(
        rows
          .filter((row) => row?.unitCode)
          .map((row) => [row.unitCode, row]),
      ).values(),
    ];

    const unitCodes = uniqueUnits.map((unit) => unit.unitCode);

    if (!unitCodes.length) {
      throw new Error("No valid units were selected.");
    }

    const versions = {};

    uniqueUnits.forEach((unit) => {
      if (Number.isSafeInteger(unit.__v)) {
        versions[unit.unitCode] = unit.__v;
      }
    });

    setBulkProgress(`Processing ${unitCodes.length} units...`);

    const response = await productUnitApi.bulkAction({
      unitCodes,
      status,
      versions,
    });

    const result = response?.data?.data;

    if (!result || !Number.isFinite(Number(result.affectedCount))) {
      throw new Error("The server did not return a confirmed bulk result.");
    }

    toast.success(
      `${result.affectedCount} unit(s) updated successfully.`,
    );

    if (Number(result.unchangedCount) > 0) {
      toast(
        `${result.unchangedCount} unit(s) already had this status.`,
      );
    }

    await loadUnits();
  };

  const confirmStatus = (rows, status) => {
    if (!rows?.length || mutationLockRef.current) {
      return;
    }

    const activate = status === "ACTIVE";
    const label = activate ? "Activate" : "Deactivate";
    const noun = rows.length === 1 ? "unit" : "units";

    openConfirm({
      action: activate ? "activate" : "deactivate",
      title: `${label} selected ${noun}?`,
      message:
        `${label} ${rows.length} selected ${noun}?\n` +
        (activate
          ? "They will be available for new Product assignments."
          : "Existing Product unit codes will remain unchanged."),
      confirmText: `${label} ${rows.length}`,
      onConfirm: () => executeBulkStatus(rows, status),
    });
  };

  const handleConfirm = async () => {
    if (
      mutationLockRef.current ||
      typeof confirmState.onConfirm !== "function"
    ) {
      return;
    }

    mutationLockRef.current = true;
    setConfirmLoading(true);

    try {
      await confirmState.onConfirm();
      setConfirmState(INITIAL_CONFIRM);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      mutationLockRef.current = false;
      setConfirmLoading(false);
      setBulkProgress("");
    }
  };

  const handleCsvUpload = (file) => {
    if (mutationLockRef.current || importUncertain) {
      toast.error(
        importUncertain
          ? "Review the previous import outcome before importing again."
          : "Wait for the current operation to finish.",
      );

      return;
    }

    const parseId = ++parseIdRef.current;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: canonicalHeader,
      transform: (value) =>
        typeof value === "string" ? value.trim() : value,

      complete: (result) => {
        if (parseId !== parseIdRef.current) {
          return;
        }

        if (
          result.errors?.length ||
          Object.keys(result.meta.renamedHeaders || {}).length
        ) {
          toast.error(
            result.errors?.[0]?.message ||
              "The CSV contains duplicate headers.",
          );

          return;
        }

        const rows = result.data || [];
        const csvColumns = result.meta.fields || [];

        if (!["unitCode", "name"].every((field) =>
          csvColumns.includes(field),
        )) {
          toast.error("CSV requires unitCode and name headers.");
          return;
        }

        if (!rows.length || rows.length > 5000) {
          toast.error("Provide between 1 and 5000 unit rows.");
          return;
        }

        const rowErrors = {};
        const seenCodes = new Set();
        const seenNames = new Set();

        rows.forEach((row, index) => {
          const errors = [];

          const code = String(row.unitCode ?? "")
            .trim()
            .toUpperCase();

          const name = String(row.name ?? "")
            .trim()
            .replace(/\s+/g, " ");

          const nameKey = name.toLowerCase();

          if (!/^[A-Z][A-Z0-9_]{0,19}$/.test(code)) {
            errors.push("Invalid unit code");
          }

          if (!name || name.length > 100) {
            errors.push("Name must contain 1–100 characters");
          }

          if (seenCodes.has(code)) {
            errors.push("Duplicate unit code in this file");
          }

          if (seenNames.has(nameKey)) {
            errors.push("Duplicate unit name in this file");
          }

          seenCodes.add(code);
          seenNames.add(nameKey);

          if (String(row.symbol ?? "").length > 20) {
            errors.push("Symbol cannot exceed 20 characters");
          }

          if (String(row.description ?? "").length > 1000) {
            errors.push("Description cannot exceed 1000 characters");
          }

          const status = String(row.status || "ACTIVE")
            .trim()
            .toUpperCase();

          if (!["ACTIVE", "INACTIVE"].includes(status)) {
            errors.push("Status must be ACTIVE or INACTIVE");
          }

          if (errors.length) {
            rowErrors[index] = errors;
          }
        });

        setImportMessage("");

        setImportPreview({
          file,
          columns: csvColumns,
          rows,
          rowErrors,
        });
      },

      error: (error) => {
        if (parseId === parseIdRef.current) {
          toast.error(`Unable to read CSV: ${error.message}`);
        }
      },
    });
  };

const finishImport = async () => {
  try {
    if (!importPreview?.rows?.length) {
      toast.error("No records available to import");
      return;
    }

    const response = await productUnitApi.import({
      rows: importPreview.rows,
      rowOffset: 0,
    });

    const result = response.data;

    if (!result.success) {
      toast.error(result.message || "Import failed");
      return;
    }

    toast.success(result.message || "Product units imported successfully");

    setImportModalOpen(false);
    setImportPreview(null);

    await fetchUnits();
  } catch (error) {
    toast.error(
      error.response?.data?.message || "Unable to import product units"
    );
  }
};

  const confirmImport = async () => {
    if (!importPreview || mutationLockRef.current || importUncertain) {
      return;
    }

    if (Object.keys(importPreview.rowErrors).length) {
      toast.error(
        "Correct the highlighted errors and upload the file again.",
      );

      return;
    }

    mutationLockRef.current = true;
    setImportLoading(true);

    try {
      const csv = Papa.unparse({
        fields: importPreview.columns,
        data: importPreview.rows.map((row) =>
          importPreview.columns.map((field) => row[field] ?? ""),
        ),
      });

      const formData = new FormData();

      formData.append(
        "file",
        new File([csv], importPreview.file.name, {
          type: "text/csv",
        }),
      );

      const response = await productUnitApi.import(formData);

      if (!(await finishImport(response?.data || {}))) {
        throw new Error("The import result was not confirmed.");
      }
    } catch (error) {
      const status = error?.response?.status;

      if (status && status < 500 && status !== 408) {
        if (await finishImport(error.response?.data || {})) {
          return;
        }

        toast.error(getErrorMessage(error));
        return;
      }

      setImportUncertain(true);
      setImportPreview(null);

      setImportMessage(
        "The import outcome is uncertain. Some units may already have been created. Review the list and server results before importing again.",
      );

      toast.error(
        "Import outcome uncertain. Do not resubmit the file.",
      );

      await loadUnits();
    } finally {
      mutationLockRef.current = false;
      setImportLoading(false);
    }
  };

  const importConfig = {
    templateFileName: "units-import-template.csv",
    columns: [
      {
        key: "unitCode",
        example: "BUNDLE",
      },
      {
        key: "name",
        example: "Bundle",
      },
      {
        key: "symbol",
        example: "bundle",
      },
      {
        key: "description",
        example: "Products supplied as bundles",
      },
      {
        key: "status",
        example: "ACTIVE",
      },
    ],
    onUpload: handleCsvUpload,
    onError: (message) => toast.error(message),
  };

  const busy = confirmLoading || importLoading;

  return (
    <div className="units-page">
      {loadError && (
        <div
          className="unit-notice unit-notice--error"
          role="alert"
        >
          <p>{loadError}</p>

          <button
            type="button"
            className="unit-notice-button"
            disabled={loading || busy}
            onClick={loadUnits}
          >
            Retry
          </button>
        </div>
      )}

      {importMessage && (
        <div className="unit-notice" role="status">
          {importMessage}
        </div>
      )}

      {bulkProgress && (
        <div className="unit-notice" role="status" aria-live="polite">
          {bulkProgress}
        </div>
      )}

      <DataList
        title="Units"
        subtitle="Default and custom measurement units"
        columns={columns}
        data={units}
        loading={loading}
        rowKey="_id"
        showCase="list"
        searchable
        filterable
        sortable
        selectable
        columnVisibility
        pagination
        serverMode
        total={total}
        page={query.page}
        pageSize={query.limit}
        pageSizeOptions={[10, 20, 50, 100]}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onSearch={handleSearch}
        onSort={handleSort}
        onFilterChange={handleFilterChange}
        filters={filters}
        quickFilters={quickFilters}
        storageKey="trustiq-product-units"
        searchPlaceholder="Search unit code, name, symbol or description..."
        actions={{
          view: (row) => openUnit(row, "view"),
          edit: (row) => openUnit(row, "edit"),
        }}
        bulkActions={[
          {
            key: "activate",
            label: "Activate",
            action: (rows) => confirmStatus(rows, "ACTIVE"),
          },
          {
            key: "deactivate",
            label: "Deactivate",
            action: (rows) => confirmStatus(rows, "INACTIVE"),
          },
        ]}
        onRefresh={loadUnits}
        importConfig={importConfig}
        addButton={
          <button
            type="button"
            className="so-primary-button"
            disabled={busy}
            onClick={() => openUnit()}
          >
            <Plus size={16} />
            <span>New Unit</span>
          </button>
        }
      />

      <UnitModal
        isOpen={modalState.open}
        unit={modalState.record}
        mode={modalState.mode}
        onClose={() => setModalState(INITIAL_MODAL)}
        onSave={(record) => {
          upsertUnit(record);
          setModalState(INITIAL_MODAL);
        }}
      />

      <ConfirmModal
        open={confirmState.open}
        action={confirmState.action}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText="Cancel"
        loading={confirmLoading}
        onCancel={closeConfirm}
        onConfirm={handleConfirm}
      />

      <ImportPreviewModal
        isOpen={Boolean(importPreview)}
        fileName={importPreview?.file?.name}
        columns={importPreview?.columns || []}
        rows={importPreview?.rows || []}
        rowErrors={importPreview?.rowErrors || {}}
        loading={importLoading}
        onCancel={() => {
          if (!importLoading) {
            setImportPreview(null);
          }
        }}
        onConfirm={confirmImport}
      />
    </div>
  );
}

export default UnitsList;