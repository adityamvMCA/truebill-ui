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

const extractUnit = (response) => {
  const unit =
    response?.data?.data ||
    response?.data?.unit;

  if (!unit?._id || !unit?.unitCode) {
    throw new Error(
      "The server did not return a valid unit.",
    );
  }

  return unit;
};

const canonicalHeader = (header) => {
  const text = String(header ?? "")
    .replace(/^\uFEFF/, "")
    .trim();

  const key = text
    .replace(/[\s_-]+/g, "")
    .toLowerCase();

  return {
    unitcode: "unitCode",
    name: "name",
    symbol: "symbol",
    description: "description",
    status: "status",
  }[key] || text;
};

function UnitsList() {
  const [units, setUnits] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState("");

  const [modalState, setModalState] =
    useState(INITIAL_MODAL);

  const [confirmState, setConfirmState] =
    useState(INITIAL_CONFIRM);

  const [confirmLoading, setConfirmLoading] =
    useState(false);

  const [importPreview, setImportPreview] =
    useState(null);

  const [importLoading, setImportLoading] =
    useState(false);

  const [importUncertain, setImportUncertain] =
    useState(false);

  const [importMessage, setImportMessage] =
    useState("");

  const loadIdRef = useRef(0);
  const parseIdRef = useRef(0);
  const mutationLockRef = useRef(false);

  const loadUnits = useCallback(async () => {
    const requestId =
      ++loadIdRef.current;

    setLoading(true);
    setLoadError("");

    try {
      const first =
        await productUnitApi.getAll({
          page: 1,
          limit: 100,
        });

      if (
        !Array.isArray(first?.data?.data)
      ) {
        throw new Error(
          "The server returned an invalid unit list.",
        );
      }

      const records = [
        ...first.data.data,
      ];

      const pages = Number(
        first.data.pagination?.totalPages ?? 1,
      );

      if (
        !Number.isSafeInteger(pages) ||
        pages < 0
      ) {
        throw new Error(
          "Invalid unit pagination.",
        );
      }

      for (
        let page = 2;
        page <= pages;
        page += 1
      ) {
        if (
          requestId !== loadIdRef.current
        ) {
          return;
        }

        const response =
          await productUnitApi.getAll({
            page,
            limit: 100,
          });

        if (
          !Array.isArray(response?.data?.data)
        ) {
          throw new Error(
            "Unable to read a unit page.",
          );
        }

        records.push(
          ...response.data.data,
        );
      }

      if (
        records.some(
          (item) =>
            !item?._id ||
            !item?.unitCode,
        )
      ) {
        throw new Error(
          "Unit records require _id and unitCode.",
        );
      }

      if (
        requestId === loadIdRef.current
      ) {
        setUnits(
          Array.from(
            new Map(
              records.map((item) => [
                item._id,
                item,
              ]),
            ).values(),
          ),
        );
      }
    } catch (error) {
      if (
        requestId === loadIdRef.current
      ) {
        setLoadError(
          getErrorMessage(error),
        );
      }
    } finally {
      if (
        requestId === loadIdRef.current
      ) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadUnits();

    return () => {
      loadIdRef.current += 1;
      parseIdRef.current += 1;
    };
  }, [loadUnits]);

  const upsertUnit = (record) => {
    setUnits((previous) => {
      const exists = previous.some(
        (item) =>
          item._id === record._id,
      );

      return exists
        ? previous.map((item) =>
            item._id === record._id
              ? record
              : item,
          )
        : [record, ...previous];
    });
  };

  const openUnit = useCallback(
    (record = null, mode = "create") => {
      if (mutationLockRef.current) {
        return;
      }

      setModalState({
        open: true,
        mode,
        record,
      });
    },
    [],
  );

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
            onClick={(event) => {
              event.stopPropagation();
              openUnit(row, "view");
            }}
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
            <strong>{value}</strong>

            <span>
              {row.description ||
                "No description"}
            </span>
          </div>
        ),
      },

      {
        key: "symbol",
        label: "Symbol",
        sortable: true,

        render: (value) =>
          value || "—",
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
            {value
              ? "Default"
              : "Custom"}
          </span>
        ),
      },

      {
        key: "status",
        label: "Status",
        sortable: true,

        render: (value) => (
          <StatusField value={value} />
        ),
      },
    ],
    [openUnit],
  );

  const updateStatuses = async (
    rows,
    status,
  ) => {
    let successCount = 0;
    const failures = [];

    const uniqueRows = Array.from(
      new Map(
        rows.map((row) => [
          row._id,
          row,
        ]),
      ).values(),
    );

    for (const row of uniqueRows) {
      try {
        const current =
          extractUnit(
            await productUnitApi.getByCode(
              row.unitCode,
            ),
          );

        if (current.status === status) {
          upsertUnit(current);
          successCount += 1;
          continue;
        }

        if (
          !Number.isSafeInteger(current.__v) ||
          current.__v < 0
        ) {
          throw new Error(
            "Unit version is missing.",
          );
        }

        const response =
          await productUnitApi.update(
            current.unitCode,
            {
              version: current.__v,
              status,
            },
          );

        upsertUnit(
          extractUnit(response),
        );

        successCount += 1;
      } catch (error) {
        failures.push({
          code: row.unitCode,
          message:
            getErrorMessage(error),
        });
      }
    }

    if (successCount) {
      toast.success(
        `${successCount} unit${successCount === 1 ? "" : "s"} ${status === "ACTIVE" ? "active" : "inactive"}`,
      );
    }

    if (failures.length) {
      toast.error(
        `${failures.length} operation${failures.length === 1 ? "" : "s"} could not be confirmed. ${failures[0].code}: ${failures[0].message}`,
        {
          duration: 7000,
        },
      );
    }

    await loadUnits();
  };

  const confirmStatus = (
    rows,
    status,
  ) => {
    if (
      !rows?.length ||
      mutationLockRef.current
    ) {
      return;
    }

    const activate =
      status === "ACTIVE";

    const label =
      activate
        ? "Activate"
        : "Deactivate";

    const noun =
      rows.length === 1
        ? "unit"
        : "units";

    setConfirmState({
      open: true,

      action:
        activate
          ? "activate"
          : "deactivate",

      title:
        `${label} selected ${noun}?`,

      message:
        `${label} ${rows.length} selected ${noun}?\n` +
        (
          activate
            ? "They will be available for new Product assignments."
            : "Existing Product unit codes will remain unchanged."
        ),

      confirmText:
        `${label} ${rows.length}`,

      onConfirm: () =>
        updateStatuses(
          rows,
          status,
        ),
    });
  };

  const handleConfirm = async () => {
    if (
      mutationLockRef.current ||
      typeof confirmState.onConfirm !==
        "function"
    ) {
      return;
    }

    mutationLockRef.current = true;
    setConfirmLoading(true);

    try {
      await confirmState.onConfirm();

      setConfirmState(
        INITIAL_CONFIRM,
      );
    } catch (error) {
      toast.error(
        getErrorMessage(error),
      );
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

        const rows = result.data || [];
        const columns =
          result.meta.fields || [];

        if (
          !["unitCode", "name"].every(
            (field) =>
              columns.includes(field),
          )
        ) {
          toast.error(
            "CSV requires unitCode and name headers.",
          );

          return;
        }

        if (
          !rows.length ||
          rows.length > 5000
        ) {
          toast.error(
            "Provide between 1 and 5000 unit rows.",
          );

          return;
        }

        const rowErrors = {};
        const seenCodes = new Set();
        const seenNames = new Set();

        rows.forEach((row, index) => {
          const errors = [];

          const code = String(
            row.unitCode ?? "",
          )
            .trim()
            .toUpperCase();

          const name = String(
            row.name ?? "",
          )
            .trim()
            .replace(/\s+/g, " ");

          const nameKey =
            name.toLowerCase();

          if (
            !/^[A-Z][A-Z0-9_]{0,19}$/.test(code)
          ) {
            errors.push(
              "Invalid unit code",
            );
          }

          if (
            !name ||
            name.length > 100
          ) {
            errors.push(
              "Name must contain 1–100 characters",
            );
          }

          if (seenCodes.has(code)) {
            errors.push(
              "Duplicate unit code in this file",
            );
          }

          if (seenNames.has(nameKey)) {
            errors.push(
              "Duplicate unit name in this file",
            );
          }

          seenCodes.add(code);
          seenNames.add(nameKey);

          if (
            String(row.symbol ?? "").length > 20
          ) {
            errors.push(
              "Symbol cannot exceed 20 characters",
            );
          }

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
        `${created} unit${created === 1 ? "" : "s"} imported successfully`,
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
          ? "No units were imported."
          : "";

    setImportMessage(message);

    if (message) {
      toast.error(message);
    }

    setImportPreview(null);
    await loadUnits();

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

    if (
      Object.keys(
        importPreview.rowErrors,
      ).length
    ) {
      toast.error(
        "Correct the highlighted errors and upload the file again.",
      );

      return;
    }

    mutationLockRef.current = true;
    setImportLoading(true);

    try {
      const csv = Papa.unparse({
        fields:
          importPreview.columns,

        data: importPreview.rows.map(
          (row) =>
            importPreview.columns.map(
              (field) =>
                row[field] ?? "",
            ),
        ),
      });

      const formData = new FormData();

      formData.append(
        "file",
        new File(
          [csv],
          importPreview.file.name,
          {
            type: "text/csv",
          },
        ),
      );

      const response =
        await productUnitApi.import(
          formData,
        );

      if (
        !(await finishImport(
          response?.data || {},
        ))
      ) {
        throw new Error(
          "The import result was not confirmed.",
        );
      }
    } catch (error) {
      const status =
        error?.response?.status;

      if (
        status &&
        status < 500 &&
        status !== 408
      ) {
        if (
          await finishImport(
            error.response?.data || {},
          )
        ) {
          return;
        }

        toast.error(
          getErrorMessage(error),
        );

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
            disabled={
              loading ||
              confirmLoading ||
              importLoading
            }
            onClick={loadUnits}
          >
            Retry
          </button>
        </div>
      )}

      {importMessage && (
        <div
          className="unit-notice"
          role="status"
        >
          {importMessage}
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
        storageKey="trustiq-product-units"
        searchPlaceholder="Search unit code, name, symbol or description..."
        filters={[
          {
            key: "status",
            label: "Status",
            type: "select",
            options: [
              "ACTIVE",
              "INACTIVE",
            ],
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
            openUnit(row, "view"),

          edit: (row) =>
            openUnit(row, "edit"),
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
        onRefresh={loadUnits}
        importConfig={{
          templateFileName:
            "units-import-template.csv",

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
              example:
                "Products supplied as bundles",
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
              openUnit()
            }
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
        onClose={() =>
          setModalState(
            INITIAL_MODAL,
          )
        }
        onSave={upsertUnit}
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
    </div>
  );
}

export default UnitsList;