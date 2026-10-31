import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import Papa from "papaparse";

import DataList from "../../components/common/DataList/DataList";
import StatusField from "../../components/common/StatusField/StatusField";
import ConfirmModal from "../../components/common/ConfirmModal/ConfirmModal";
import ImportPreviewModal from "../../components/common/DataList/ImportPreviewModal";

import taxRateApi from "../../services/modules/taxRateApi";

import TaxRateModal from "./TaxRateModal";

const PAGE_SIZES = [20, 50, 100];
const SEARCH_DEBOUNCE_MS = 400;

const INITIAL_QUERY = {
  page: 1,
  limit: 20,
  search: "",
  status: "",
  taxType: "",
  sortBy: "",
  sortDir: "",
};

const INITIAL_COUNTS = {
  total: 0,
  active: 0,
  inactive: 0,
  taxTypes: { GST: 0, VAT: 0, CUSTOM: 0 },
};

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
    "Unable to complete the request."
  );
};

const canonicalHeader = (header) => {
  const text = String(header ?? "")
    .replace(/^\uFEFF/, "")
    .trim();

  const key = text
    .replace(/[\s_-]+/g, "")
    .toLowerCase();

  return {
    name: "name",
    rate: "rate",
    gstrate: "rate",
    taxtype: "tax_type",
    description: "description",
    status: "status",
  }[key] || text;
};

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

function TaxRatesList() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [query, setQuery] = useState(INITIAL_QUERY);
  const [searchText, setSearchText] = useState("");

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  const [counts, setCounts] = useState(INITIAL_COUNTS);

  const [modalState, setModalState] = useState(INITIAL_MODAL);
  const [confirmState, setConfirmState] = useState(INITIAL_CONFIRM);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [importPreview, setImportPreview] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [importUncertain, setImportUncertain] = useState(false);

  const loadIdRef = useRef(0);
  const countIdRef = useRef(0);
  const parseIdRef = useRef(0);
  const mutationLockRef = useRef(false);

  const loadRecords = useCallback(async () => {
    const requestId = ++loadIdRef.current;

    setLoading(true);
    setLoadError("");

    try {
      const params = {};

      Object.entries(query).forEach(([key, value]) => {
        if (value !== "" && value != null) {
          params[key] = value;
        }
      });

      const response = await taxRateApi.getAll(params);

      if (requestId !== loadIdRef.current) {
        return;
      }

      const body = response?.data;

      if (!Array.isArray(body?.data) || !body?.pagination) {
        throw new Error("The server returned an invalid tax rate list.");
      }

      if (body.data.some((item) => !item?._id)) {
        throw new Error("One or more tax rate records are invalid.");
      }

      setRecords(body.data);
      setPagination(body.pagination);
    } catch (error) {
      if (requestId === loadIdRef.current) {
        setLoadError(getErrorMessage(error));
      }
    } finally {
      if (requestId === loadIdRef.current) {
        setLoading(false);
      }
    }
  }, [query]);

  const loadCounts = useCallback(async () => {
    const requestId = ++countIdRef.current;

    try {
      const response = await taxRateApi.getCounts();
      const next = response?.data?.counts;

      if (requestId === countIdRef.current && next) {
        setCounts({ ...INITIAL_COUNTS, ...next });
      }
    } catch {
      // Counts are informational; the list stays usable
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadRecords(), loadCounts()]);
  }, [loadRecords, loadCounts]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    loadCounts();

    return () => {
      loadIdRef.current += 1;
      countIdRef.current += 1;
      parseIdRef.current += 1;
    };
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

  const handleSearch = useCallback((value) => {
    setSearchText(String(value ?? ""));
  }, []);

  const handlePageSizeChange = useCallback((limit) => {
    const size = PAGE_SIZES.includes(Number(limit)) ? Number(limit) : 20;

    setQuery((previous) => ({ ...previous, limit: size, page: 1 }));
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
      taxType: filters.taxType || "",
      page: 1,
    }));
  }, []);

  const openRecord = useCallback((record = null, mode = "create") => {
    if (mutationLockRef.current) {
      return;
    }

    setModalState({ open: true, mode, record });
  }, []);

  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "Tax Name",
        sortable: true,

        render: (value, row) => (
          <button
            type="button"
            className="doc-link-button"
            aria-label={`View tax rate ${value || ""}`}
            onClick={(event) => {
              event.stopPropagation();
              openRecord(row, "view");
            }}
          >
            {value || "N/A"}
          </button>
        ),
      },
      {
        key: "rate",
        label: "Rate",
        type: "number",
        sortable: true,
        render: (value) => (value == null ? "—" : `${value}%`),
      },
      {
        key: "taxType",
        label: "Tax Type",
        sortable: true,
      },
      {
        key: "description",
        label: "Description",
        sortable: false,
        render: (value) => value || "No description",
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (value) => <StatusField value={value} />,
      },
      {
        key: "isSystem",
        label: "Source",
        sortable: false,
        visible: false,
        render: (value) => (value ? "System" : "Custom"),
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
    [openRecord],
  );

  const filters = useMemo(
    () => [
      { key: "status", label: "Status", type: "select", options: ["ACTIVE", "INACTIVE"] },
      { key: "taxType", label: "Tax Type", type: "select", options: ["GST", "VAT", "CUSTOM"] },
    ],
    [],
  );

  const quickFilters = useMemo(
    () => [
      { key: "status", value: "", label: "All", count: counts.total },
      { key: "status", value: "ACTIVE", label: "Active", count: counts.active },
      { key: "status", value: "INACTIVE", label: "Inactive", count: counts.inactive },
      { key: "taxType", value: "GST", label: "GST", count: counts.taxTypes?.GST ?? 0 },
      { key: "taxType", value: "VAT", label: "VAT", count: counts.taxTypes?.VAT ?? 0 },
      { key: "taxType", value: "CUSTOM", label: "Custom", count: counts.taxTypes?.CUSTOM ?? 0 },
    ],
    [counts],
  );

  const updateStatuses = async (rows, status) => {
    const ids = Array.from(new Set(rows.map((row) => row._id)));

    try {
      const response = await taxRateApi.bulkStatus(ids, status);
      const result = response?.data || {};
      const changed = Number(result.modifiedCount) || 0;
      const skipped = Number(result.skippedCount) || 0;

      if (changed) {
        toast.success(
          `${changed} tax rate${changed === 1 ? "" : "s"} ${status === "ACTIVE" ? "activated" : "deactivated"}`,
        );
      }

      if (skipped) {
        toast(`${skipped} already ${status === "ACTIVE" ? "active" : "inactive"}`);
      }
    } catch (error) {
      toast.error(getErrorMessage(error), { duration: 7000 });
    }

    await refreshAll();
  };

  const confirmStatus = (rows, status) => {
    if (!rows?.length || mutationLockRef.current) {
      return;
    }

    const activate = status === "ACTIVE";
    const label = activate ? "Activate" : "Deactivate";
    const noun = rows.length === 1 ? "tax rate" : "tax rates";

    setConfirmState({
      open: true,
      action: activate ? "activate" : "deactivate",
      title: `${label} selected ${noun}?`,
      message:
        `${label} ${rows.length} selected ${noun}?\n` +
        (activate
          ? "They will become available for new assignments."
          : "Existing Product and transaction rates will remain unchanged."),
      confirmText: `${label} ${rows.length}`,
      onConfirm: () => updateStatuses(rows, status),
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
    }
  };

  const handleCsvUpload = (file) => {
    if (
      mutationLockRef.current ||
      importUncertain
    ) {
      toast.error(
        importUncertain
          ? "Review the previous import outcome before importing again."
          : "Wait for the current operation to finish.",
      );

      return;
    }

    const parseId =
      ++parseIdRef.current;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: canonicalHeader,

      transform: (value) =>
        typeof value === "string"
          ? value.trim()
          : value,

      complete: (result) => {
        if (
          parseId !== parseIdRef.current
        ) {
          return;
        }

        if (
          result.errors.length ||
          Object.keys(
            result.meta.renamedHeaders || {},
          ).length
        ) {
          toast.error(
            result.errors[0]?.message ||
              "The CSV contains duplicate headers.",
          );

          return;
        }

        const rows =
          result.data || [];

        const columns =
          result.meta.fields || [];

        if (
          !["name", "rate"].every(
            (field) =>
              columns.includes(field),
          )
        ) {
          toast.error(
            "CSV requires name and rate headers.",
          );

          return;
        }

        if (
          !rows.length ||
          rows.length > 5000
        ) {
          toast.error(
            "Provide between 1 and 5000 tax rate rows.",
          );

          return;
        }

        const rowErrors = {};
        const seenNames = new Set();
        const seenRates = new Set();

        rows.forEach((row, index) => {
          const errors = [];

          const name = String(
            row.name ?? "",
          )
            .trim()
            .replace(/\s+/g, " ");

          const nameKey =
            name.toLowerCase();

          const rateText =
            String(row.rate ?? "").trim();

          const rate =
            Number(rateText);

          const taxType = String(
            row.tax_type || "GST",
          )
            .trim()
            .toUpperCase();

          const rateKey =
            `${taxType}:${rate}`;

          if (
            !name ||
            name.length > 100
          ) {
            errors.push(
              "Name must contain 1–100 characters",
            );
          }

          if (seenNames.has(nameKey)) {
            errors.push(
              "Duplicate tax name in this file",
            );
          }

          seenNames.add(nameKey);

          if (
            !rateText ||
            !Number.isFinite(rate) ||
            rate < 0 ||
            rate > 100
          ) {
            errors.push(
              "Rate must be between 0 and 100",
            );
          }

          if (
            !["GST", "VAT", "CUSTOM"].includes(
              taxType,
            )
          ) {
            errors.push(
              "Tax type must be GST, VAT or CUSTOM",
            );
          }

          if (seenRates.has(rateKey)) {
            errors.push(
              "Duplicate rate for the same tax type",
            );
          }

          seenRates.add(rateKey);

          if (
            String(row.description ?? "")
              .length > 1000
          ) {
            errors.push(
              "Description cannot exceed 1000 characters",
            );
          }

          const status = String(
            row.status || "ACTIVE",
          )
            .trim()
            .toUpperCase();

          if (
            !["ACTIVE", "INACTIVE"].includes(
              status,
            )
          ) {
            errors.push(
              "Status must be ACTIVE or INACTIVE",
            );
          }

          if (errors.length) {
            rowErrors[index] = errors;
          }
        });

        setImportMessage("");

        setImportPreview({
          file,
          columns,
          rows,
          rowErrors,
        });
      },

      error: (error) => {
        if (
          parseId === parseIdRef.current
        ) {
          toast.error(
            `Unable to read CSV: ${error.message}`,
          );
        }
      },
    });
  };

  const finishImport = async (body) => {
    const created =
      body.createdCount ??
      body.successCount ??
      body.importedCount;

    const failed =
      body.failedCount ??
      body.failureCount;

    if (
      !Number.isSafeInteger(created) ||
      created < 0 ||
      !Number.isSafeInteger(failed) ||
      failed < 0
    ) {
      return false;
    }

    if (created > 0) {
      toast.success(
        `${created} tax rate${created === 1 ? "" : "s"} imported successfully`,
      );
    }

    const firstError =
      body.errors?.[0];

    const detail =
      typeof firstError === "string"
        ? firstError
        : firstError?.message || "";

    const message =
      failed > 0
        ? `${failed} row${failed === 1 ? "" : "s"} failed. ${detail}`
        : created === 0
          ? "No tax rates were imported."
          : "";

    setImportMessage(message);

    if (message) {
      toast.error(message);
    }

    setImportPreview(null);
    await refreshAll();

    return true;
  };

const confirmImport = async () => {
  if (!importPreview || mutationLockRef.current || importUncertain) {
    return;
  }

  if (Object.keys(importPreview.rowErrors).length) {
    toast.error("Correct the highlighted errors and upload the file again.");

    return;
  }

  mutationLockRef.current = true;
  setImportLoading(true);

  try {
    const response = await taxRateApi.import({
      rows: importPreview.rows,
      rowOffset: 0,
    });

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
      "The import outcome is uncertain. Some tax rates may already have been created. Review the list and server results before importing again.",
    );

    toast.error("Import outcome uncertain. Do not resubmit the file.");

    await refreshAll();
  } finally {
    mutationLockRef.current = false;
    setImportLoading(false);
  }
};

  return (
    <>
      {loadError && (
        <div
          className="section-form-api-error"
          role="alert"
        >
          <p>{loadError}</p>

          <button
            type="button"
            className="doc-link-button"
            disabled={
              loading ||
              confirmLoading ||
              importLoading
            }
            onClick={refreshAll}
          >
            Retry
          </button>
        </div>
      )}

      {importMessage && (
        <div
          className="section-info-box"
          role="status"
        >
          {importMessage}
        </div>
      )}

      <DataList
        title="Tax Rates"
        subtitle="Manage GST, VAT and custom tax configurations"
        columns={columns}
        data={records}
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
        storageKey="trustiq-tax-rates"
        searchPlaceholder="Search tax name..."
        actions={{
          view: (row) =>
            openRecord(row, "view"),

          edit: (row) =>
            openRecord(row, "edit"),
        }}
        bulkActions={[
          {
            key: "activate",
            label: "Activate",

            action: (rows) =>
              confirmStatus(
                rows,
                "ACTIVE",
              ),
          },
          {
            key: "deactivate",
            label: "Deactivate",

            action: (rows) =>
              confirmStatus(
                rows,
                "INACTIVE",
              ),
          },
        ]}
        onRefresh={refreshAll}
        importConfig={{
          templateFileName:
            "tax-rates-import-template.csv",

          columns: [
            {
              key: "name",
              example: "Example Custom Tax",
            },
            {
              key: "rate",
              example: "7.5",
            },
            {
              key: "tax_type",
              example: "CUSTOM",
            },
            {
              key: "description",
              example: "Example configuration",
            },
            {
              key: "status",
              example: "ACTIVE",
            },
          ],

          onUpload:
            handleCsvUpload,

          onError: (message) =>
            toast.error(message),
        }}
        addButton={
          <button
            type="button"
            className="so-primary-button"
            disabled={
              confirmLoading ||
              importLoading
            }
            onClick={() =>
              openRecord()
            }
          >
            <Plus size={16} />
            <span>New Tax Rate</span>
          </button>
        }
      />

      <TaxRateModal
        isOpen={modalState.open}
        taxRate={modalState.record}
        mode={modalState.mode}
        onClose={() =>
          setModalState(
            INITIAL_MODAL,
          )
        }
        onSave={refreshAll}
      />

      <ConfirmModal
        open={confirmState.open}
        action={confirmState.action}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText="Cancel"
        loading={confirmLoading}
        onCancel={() => {
          if (!mutationLockRef.current) {
            setConfirmState(
              INITIAL_CONFIRM,
            );
          }
        }}
        onConfirm={handleConfirm}
      />

      <ImportPreviewModal
        isOpen={Boolean(importPreview)}
        fileName={importPreview?.file?.name}
        columns={
          importPreview?.columns || []
        }
        rows={
          importPreview?.rows || []
        }
        rowErrors={
          importPreview?.rowErrors || {}
        }
        loading={importLoading}
        onCancel={() => {
          if (!importLoading) {
            setImportPreview(null);
          }
        }}
        onConfirm={confirmImport}
      />
    </>
  );
}

export default TaxRatesList;