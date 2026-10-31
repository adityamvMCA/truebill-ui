
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

import productCategoryApi from "../../services/modules/productCategoryApi";
import CategoryModal from "./CategoryModal";

const INITIAL_CONFIRM_STATE = {
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

const extractRecord = (response) => {
  const category =
    response?.data?.data ||
    response?.data?.category;

  if (!category?._id || !category?.categoryCode) {
    throw new Error("The server did not return a valid category.");
  }

  return category;
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

function CategoriesList() {
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);

  const [categoryCounts, setCategoryCounts] = useState({
    all: 0,
    active: 0,
    inactive: 0,
  });

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [query, setQuery] = useState({
    page: 1,
    limit: 20,
    search: "",
    sortBy: "",
    sortOrder: "",
    filters: {
      status: "",
    },
  });

  const [modalState, setModalState] = useState({
    open: false,
    mode: "create",
    record: null,
  });

  const [confirmState, setConfirmState] = useState(
    INITIAL_CONFIRM_STATE,
  );

  const [confirmLoading, setConfirmLoading] = useState(false);

  const [importPreview, setImportPreview] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importUncertain, setImportUncertain] = useState(false);
  const [importMessage, setImportMessage] = useState("");

  const mutationLockRef = useRef(false);
  const loadRequestRef = useRef(0);
  const parseRequestRef = useRef(0);

  const loadCategories = useCallback(() => {
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

        if (query.search.trim()) {
          params.search = query.search.trim();
        }

        if (query.sortBy && query.sortOrder) {
          params.sortBy = query.sortBy;
          params.sortOrder = query.sortOrder;
        }

        if (query.filters.status) {
          params.status = query.filters.status;
        }

        const response = await productCategoryApi.getAll(params);

        if (requestId !== loadRequestRef.current) return;

        const records = response?.data?.data;

        if (!Array.isArray(records)) {
          throw new Error("The server returned an invalid category list.");
        }

        if (
          records.some(
            (record) => !record?._id || !record?.categoryCode,
          )
        ) {
          throw new Error(
            "Category records must include _id and categoryCode.",
          );
        }

        const pagination = response?.data?.pagination || {};
        const counts = response?.data?.counts || {};

        const serverTotal = Number(pagination.total);

        setCategories(records);

        setTotal(
          Number.isFinite(serverTotal) && serverTotal >= 0
            ? serverTotal
            : records.length,
        );

        setCategoryCounts({
          all: Number(counts.all) || 0,
          active: Number(counts.active) || 0,
          inactive: Number(counts.inactive) || 0,
        });
      } catch (error) {
        if (requestId !== loadRequestRef.current) return;

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
    };
  }, [query, reloadKey]);

  const handlePageChange = useCallback((page) => {
    setQuery((current) => ({
      ...current,
      page,
    }));
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

      if (
        current.search === nextSearch &&
        current.page === 1
      ) {
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
      },
    }));
  }, []);

  const upsertCategory = useCallback((record) => {
    if (!record?._id) return;

    setCategories((previous) =>
      previous.map((item) =>
        String(item._id) === String(record._id)
          ? record
          : item,
      ),
    );

    setModalState((current) => {
      if (
        current.record &&
        String(current.record._id) === String(record._id)
      ) {
        return {
          ...current,
          record,
        };
      }

      return current;
    });
  }, []);

  const openCategory = (record = null, mode = "create") => {
    if (mutationLockRef.current) return;

    setModalState({
      open: true,
      mode,
      record,
    });
  };

  const handleView = useCallback((row) => {
    if (mutationLockRef.current) return;

    setModalState({
      open: true,
      mode: "view",
      record: row,
    });
  }, []);

  const columns = useMemo(
    () => [
      {
        key: "categoryCode",
        label: "Category Code",
        sortable: true,
        render: (value, row) => (
          <button
            type="button"
            className="doc-link-button"
            aria-label={`View category ${row.name || value || ""}`}
            onClick={(event) => {
              event.stopPropagation();
              handleView(row);
            }}
          >
            {value || "N/A"}
          </button>
        ),
      },
      {
        key: "name",
        label: "Category",
        sortable: true,
        render: (value, row) => (
          <div className="dl-customer">
            <strong>{value || "—"}</strong>
            <span className="category-list-description">
              {row.description || "No description"}
            </span>
          </div>
        ),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (value) => <StatusField value={value} />,
      },
      {
        key: "createdAt",
        label: "Created",
        sortable: true,
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
    [handleView],
  );

const executeStatusUpdate = async (rows, status) => {
  if (!rows?.length) {
    toast.error("Please select categories");
    return;
  }

  const categoryCodes = [
    ...new Set(
      rows
        .map((row) =>
          String(row.categoryCode || "").trim().toUpperCase(),
        )
        .filter(Boolean),
    ),
  ];

  if (!categoryCodes.length) {
    toast.error("No valid categories selected");
    return;
  }

  try {
    const response = await productCategoryApi.bulkUpdateStatus({
      categoryCodes,
      status,
    });

    const result = response?.data?.data;

    if (!result) {
      throw new Error("Invalid bulk update response");
    }

    toast.success(
      `${result.affectedCount} categories ${
        status === "ACTIVE" ? "activated" : "deactivated"
      } successfully`,
    );

    setConfirmState(INITIAL_CONFIRM_STATE);
    loadCategories();
  } catch (error) {
    toast.error(getErrorMessage(error));
  }
};

  const confirmStatusUpdate = (rows, status) => {
    if (!rows?.length || mutationLockRef.current) return;

    const uniqueRows = Array.from(
      new Map(
        rows.map((row) => [String(row._id), row]),
      ).values(),
    );

    const categoryCodes = uniqueRows
      .map((row) => row.categoryCode)
      .filter(Boolean);

    if (!categoryCodes.length) {
      toast.error("No valid categories selected.");
      return;
    }

    const activate = status === "ACTIVE";
    const label = activate ? "Activate" : "Deactivate";
    const noun =
      uniqueRows.length === 1 ? "category" : "categories";

    setConfirmState({
      open: true,
      action: activate ? "activate" : "deactivate",
      title: `${label} selected ${noun}?`,
      message: activate
        ? `Are you sure you want to activate ${uniqueRows.length} selected ${noun}?`
        : `Are you sure you want to deactivate ${uniqueRows.length} selected ${noun}? Existing product category values will remain unchanged.`,
      confirmText: `${label} ${uniqueRows.length}`,
      onConfirm: () =>
        executeStatusUpdate(uniqueRows, status),
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
      setConfirmState(INITIAL_CONFIRM_STATE);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      mutationLockRef.current = false;
      setConfirmLoading(false);
    }
  };

  const closeConfirm = () => {
    if (mutationLockRef.current) return;
    setConfirmState(INITIAL_CONFIRM_STATE);
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

    const parseId = ++parseRequestRef.current;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: "greedy",

      transformHeader: (header) =>
        String(header)
          .replace(/^\uFEFF/, "")
          .trim()
          .toLowerCase(),

      transform: (value) =>
        typeof value === "string"
          ? value.trim()
          : value,

      complete: (result) => {
        if (parseId !== parseRequestRef.current) return;

        if (
          result.errors.length ||
          Object.keys(result.meta.renamedHeaders || {}).length
        ) {
          toast.error(
            result.errors[0]?.message ||
              "The CSV contains duplicate headers.",
          );
          return;
        }

        const rows = result.data || [];
        const csvColumns = result.meta.fields || [];

        if (!csvColumns.includes("name")) {
          toast.error("The CSV requires a name header.");
          return;
        }

        if (!rows.length || rows.length > 5000) {
          toast.error("Provide between 1 and 5000 category rows.");
          return;
        }

        const seenNames = new Set();
        const rowErrors = {};

        rows.forEach((row, index) => {
          const errors = [];

          const name = String(row.name ?? "")
            .trim()
            .replace(/\s+/g, " ");

          const normalized = name.toLowerCase();

          const status = String(row.status || "ACTIVE")
            .trim()
            .toUpperCase();

          if (!name || name.length > 100) {
            errors.push("Name must contain 1–100 characters");
          }

          if (seenNames.has(normalized)) {
            errors.push("Duplicate category name in this file");
          }

          seenNames.add(normalized);

          if (String(row.description ?? "").length > 1000) {
            errors.push("Description cannot exceed 1000 characters");
          }

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
          rows,
          columns: csvColumns,
          rowErrors,
        });
      },

      error: (error) => {
        toast.error(`Unable to read CSV: ${error.message}`);
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
        `${created} categor${
          created === 1 ? "y" : "ies"
        } imported`,
      );
    }

    const firstError = body.errors?.[0];

    const errorText =
      typeof firstError === "string"
        ? firstError
        : firstError?.message || "";

    const message =
      failed > 0
        ? `${failed} row${
            failed === 1 ? "" : "s"
          } failed. ${errorText}`
        : created === 0
          ? "No categories were imported."
          : "";

    setImportMessage(message);

    if (message) {
      toast.error(message);
    }

    setImportPreview(null);
    loadCategories();

    return true;
  };

  const confirmImport = async () => {
    if (
      !importPreview ||
      mutationLockRef.current ||
      importUncertain
    ) {
      return;
    }

    if (Object.keys(importPreview.rowErrors).length) {
      toast.error(
        "Correct the highlighted rows and upload the file again.",
      );
      return;
    }

    mutationLockRef.current = true;
    setImportLoading(true);

    try {
      const csv = Papa.unparse({
        fields: importPreview.columns,
        data: importPreview.rows.map((row) =>
          importPreview.columns.map(
            (column) => row[column] ?? "",
          ),
        ),
      });

      const formData = new FormData();

      formData.append(
        "file",
        new File([csv], importPreview.file.name, {
          type: "text/csv",
        }),
      );

      const response = await productCategoryApi.import(formData);

      const handled = await finishImport(
        response?.data || {},
      );

      if (!handled) {
        throw new Error("The import result was not confirmed.");
      }
    } catch (error) {
      const status = error?.response?.status;

      if (status && status < 500 && status !== 408) {
        const handled = await finishImport(
          error.response?.data || {},
        );

        if (handled) return;

        toast.error(getErrorMessage(error));
        return;
      }

      setImportUncertain(true);
      setImportPreview(null);

      setImportMessage(
        "The import result is uncertain. Some categories may already have been created. Review the list and server results before importing again.",
      );

      toast.error(
        "Import outcome uncertain. Do not resubmit the file.",
      );

      loadCategories();
    } finally {
      mutationLockRef.current = false;
      setImportLoading(false);
    }
  };

  const busy = confirmLoading || importLoading;

  return (
    <div className="categories-page">
      {loadError && (
        <div
          className="category-notice category-notice--error"
          role="alert"
        >
          <p>{loadError}</p>

          <button
            type="button"
            className="category-notice-button"
            disabled={loading || busy}
            onClick={loadCategories}
          >
            Retry
          </button>
        </div>
      )}

      {importMessage && (
        <div className="category-notice" role="status">
          {importMessage}

          <button
            type="button"
            className="category-notice-button"
            disabled={loading || busy}
            onClick={loadCategories}
          >
            Refresh Categories
          </button>
        </div>
      )}

      <DataList
        title="Categories"
        subtitle="Organize your Products and services"
        columns={columns}
        data={categories}
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
        storageKey="trustiq-product-categories"
        searchPlaceholder="Search category code, name or description..."
        filters={[
          {
            key: "status",
            label: "Status",
            type: "select",
            options: ["ACTIVE", "INACTIVE"],
          },
        ]}
        quickFilters={[
          {
            key: "status",
            value: "",
            label: "All",
            count: categoryCounts.all,
          },
          {
            key: "status",
            value: "ACTIVE",
            label: "Active",
            count: categoryCounts.active,
          },
          {
            key: "status",
            value: "INACTIVE",
            label: "Inactive",
            count: categoryCounts.inactive,
          },
        ]}
        actions={{
          view: (row) => openCategory(row, "view"),
          edit: (row) => openCategory(row, "edit"),
        }}
        bulkActions={[
          {
            key: "activate",
            label: "Activate",
            action: (rows) =>
              confirmStatusUpdate(rows, "ACTIVE"),
          },
          {
            key: "deactivate",
            label: "Deactivate",
            action: (rows) =>
              confirmStatusUpdate(rows, "INACTIVE"),
          },
        ]}
        onRefresh={loadCategories}
        importConfig={{
          templateFileName: "categories-import-template.csv",
          columns: [
            {
              key: "name",
              example: "Electronics",
            },
            {
              key: "description",
              example: "Electronic Products and accessories",
            },
            {
              key: "status",
              example: "ACTIVE",
            },
          ],
          onUpload: handleCsvUpload,
          onError: (message) => toast.error(message),
        }}
        addButton={
          <button
            type="button"
            className="so-primary-button"
            disabled={busy}
            onClick={() => openCategory()}
          >
            <Plus size={16} />
            <span>New Category</span>
          </button>
        }
      />

      <CategoryModal
        isOpen={modalState.open}
        mode={modalState.mode}
        editData={modalState.record}
        onClose={() =>
          setModalState({
            open: false,
            mode: "create",
            record: null,
          })
        }
        onSave={(record) => {
          upsertCategory(record);

          setQuery((current) => ({
            ...current,
            page: 1,
          }));

          loadCategories();
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

export default CategoriesList;
