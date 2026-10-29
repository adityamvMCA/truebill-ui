// import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// import { Plus } from "lucide-react";
// import toast from "react-hot-toast";
// import Papa from "papaparse";

// import DataList from "../../components/common/DataList/DataList";
// import StatusField from "../../components/common/StatusField/StatusField";
// import ConfirmModal from "../../components/common/ConfirmModal/ConfirmModal";
// import ImportPreviewModal from "../../components/common/DataList/ImportPreviewModal";
// import productCategoryApi from "../../services/modules/productCategoryApi";
// import CategoryModal from "./CategoryModal";
// const INITIAL_CONFIRM_STATE = {
//   open: false,
//   action: undefined,
//   title: "",
//   message: "",
//   confirmText: "Confirm",
//   onConfirm: null,
// };

// const getErrorMessage = (error) => {
//   const body = error?.response?.data;

//   if (Array.isArray(body?.errors) && body.errors.length) {
//     return body.errors
//       .map((item) =>
//         typeof item === "string"
//           ? item
//           : item?.message || item?.msg || "Validation failed",
//       )
//       .join(", ");
//   }

//   return body?.message || error?.message || "Unable to complete the request.";
// };

// const extractRecord = (response) => {
//   const category = response?.data?.data || response?.data?.category;

//   if (!category?._id || !category?.categoryCode) {
//     throw new Error("The server did not return a valid category.");
//   }

//   return category;
// };

// const formatDate = (value) => {
//   if (!value) {
//     return "—";
//   }

//   const date = new Date(value);

//   return Number.isNaN(date.getTime())
//     ? "—"
//     : date.toLocaleDateString("en-IN", {
//         day: "2-digit",
//         month: "short",
//         year: "numeric",
//       });
// };

// function CategoriesList() {
//   const [categories, setCategories] = useState([]);

//   const [loading, setLoading] = useState(true);

//   const [loadError, setLoadError] = useState("");

//   const [modalState, setModalState] = useState({
//     open: false,
//     mode: "create",
//     record: null,
//   });

//   const [confirmState, setConfirmState] = useState(INITIAL_CONFIRM_STATE);

//   const [confirmLoading, setConfirmLoading] = useState(false);

//   const [importPreview, setImportPreview] = useState(null);

//   const [importLoading, setImportLoading] = useState(false);

//   const [importUncertain, setImportUncertain] = useState(false);

//   const [importMessage, setImportMessage] = useState("");

//   const mutationLockRef = useRef(false);
//   const loadRequestRef = useRef(0);
//   const parseRequestRef = useRef(0);

//   const loadCategories = useCallback(async () => {
//     const requestId = ++loadRequestRef.current;

//     setLoading(true);
//     setLoadError("");

//     try {
//       const first = await productCategoryApi.getAll({
//         page: 1,
//         limit: 100,
//       });

//       if (!Array.isArray(first?.data?.data)) {
//         throw new Error("The server returned an invalid category list.");
//       }

//       const records = [...first.data.data];

//       const pages = Number(first.data.pagination?.totalPages ?? 1);

//       if (!Number.isSafeInteger(pages) || pages < 0) {
//         throw new Error("Invalid category pagination.");
//       }

//       for (let page = 2; page <= pages; page += 1) {
//         if (requestId !== loadRequestRef.current) {
//           return;
//         }

//         const response = await productCategoryApi.getAll({
//           page,
//           limit: 100,
//         });

//         if (!Array.isArray(response?.data?.data)) {
//           throw new Error("Unable to read a category page.");
//         }

//         records.push(...response.data.data);
//       }

//       if (records.some((record) => !record?._id || !record?.categoryCode)) {
//         throw new Error("Category records must include _id and categoryCode.");
//       }

//       if (requestId === loadRequestRef.current) {
//         setCategories(
//           Array.from(
//             new Map(
//               records.map((record) => [String(record._id), record]),
//             ).values(),
//           ),
//         );
//       }
//     } catch (error) {
//       if (requestId === loadRequestRef.current) {
//         setLoadError(getErrorMessage(error));
//       }
//     } finally {
//       if (requestId === loadRequestRef.current) {
//         setLoading(false);
//       }
//     }
//   }, []);

//   useEffect(() => {
//     loadCategories();

//     return () => {
//       loadRequestRef.current += 1;
//       parseRequestRef.current += 1;
//     };
//   }, [loadCategories]);

//   const upsertCategory = (record) => {
//     setCategories((previous) => {
//       const exists = previous.some((item) => item._id === record._id);

//       return exists
//         ? previous.map((item) => (item._id === record._id ? record : item))
//         : [record, ...previous];
//     });
//   };

//   const openCategory = (record = null, mode = "create") => {
//     if (mutationLockRef.current) {
//       return;
//     }

//     setModalState({
//       open: true,
//       mode,
//       record,
//     });
//   };
//   const handleView = useCallback((row) => {
//     if (mutationLockRef.current) {
//       return;
//     }

//     setModalState({
//       open: true,
//       mode: "view",
//       record: row,
//     });
//   }, []);
//   const columns = useMemo(
//     () => [
//       {
//         key: "categoryCode",
//         label: "Category Code",
//         sortable: true,

//         render: (value, row) => (
//           <button
//             type="button"
//             className="doc-link-button"
//             aria-label={`View category ${row.name || value || ""}`}
//             onClick={(event) => {
//               event.stopPropagation();
//               handleView(row);
//             }}
//           >
//             {value || "N/A"}
//           </button>
//         ),
//       },
//       {
//         key: "name",
//         label: "Category",
//         sortable: true,

//         render: (value, row) => (
//           <div className="dl-customer">
//             <strong>{value}</strong>

//             <span className="category-list-description">
//               {row.description || "No description"}
//             </span>
//           </div>
//         ),
//       },
//       {
//         key: "status",
//         label: "Status",
//         sortable: true,

//         render: (value) => <StatusField value={value} />,
//       },
//       {
//         key: "createdAt",
//         label: "Created",
//         sortable: true,
//         render: formatDate,
//       },
//       {
//         key: "updatedAt",
//         label: "Last Updated",
//         sortable: true,
//         visible: false,
//         render: formatDate,
//       },
//     ],
//     [],
//   );

//   const executeStatusUpdate = async (rows, status) => {
//     let successCount = 0;
//     const failures = [];

//     const uniqueRows = Array.from(
//       new Map(rows.map((row) => [row._id, row])).values(),
//     );

//     for (const row of uniqueRows) {
//       try {
//         const freshResponse = await productCategoryApi.getByCode(
//           row.categoryCode,
//         );

//         const fresh = extractRecord(freshResponse);

//         if (fresh.status === status) {
//           upsertCategory(fresh);
//           successCount += 1;
//           continue;
//         }

//         if (!Number.isSafeInteger(fresh.__v) || fresh.__v < 0) {
//           throw new Error("Category version is missing.");
//         }

//         const response = await productCategoryApi.update(fresh.categoryCode, {
//           version: fresh.__v,
//           status,
//         });

//         upsertCategory(extractRecord(response));

//         successCount += 1;
//       } catch (error) {
//         failures.push({
//           name: row.name,
//           message: getErrorMessage(error),
//         });
//       }
//     }

//     if (successCount) {
//       toast.success(
//         `${successCount} categor${successCount === 1 ? "y" : "ies"} ${status === "ACTIVE" ? "active" : "inactive"}`,
//       );
//     }

//     if (failures.length) {
//       toast.error(
//         `${failures.length} operation${failures.length === 1 ? "" : "s"} could not be confirmed. ${failures[0].name}: ${failures[0].message}`,
//         {
//           duration: 7000,
//         },
//       );
//     }

//     await loadCategories();
//   };

//   const confirmStatusUpdate = (rows, status) => {
//     if (!rows?.length || mutationLockRef.current) {
//       return;
//     }

//     const activate = status === "ACTIVE";

//     const label = activate ? "Activate" : "Deactivate";

//     const noun = rows.length === 1 ? "category" : "categories";

//     setConfirmState({
//       open: true,

//       action: activate ? "activate" : "deactivate",

//       title: `${label} selected ${noun}?`,

//       message:
//         `${label} ${rows.length} selected ${noun}?\n` +
//         (activate
//           ? "They will become available for new Product assignments."
//           : "Existing Product category values will remain unchanged."),

//       confirmText: `${label} ${rows.length}`,

//       onConfirm: () => executeStatusUpdate(rows, status),
//     });
//   };

//   const handleConfirm = async () => {
//     if (
//       mutationLockRef.current ||
//       typeof confirmState.onConfirm !== "function"
//     ) {
//       return;
//     }

//     mutationLockRef.current = true;
//     setConfirmLoading(true);

//     try {
//       await confirmState.onConfirm();

//       setConfirmState(INITIAL_CONFIRM_STATE);
//     } catch (error) {
//       toast.error(getErrorMessage(error));
//     } finally {
//       mutationLockRef.current = false;
//       setConfirmLoading(false);
//     }
//   };

//   const handleCsvUpload = (file) => {
//     if (mutationLockRef.current || importUncertain) {
//       toast.error(
//         importUncertain
//           ? "Review the previous import outcome before importing again."
//           : "Wait for the current operation to finish.",
//       );

//       return;
//     }

//     const parseId = ++parseRequestRef.current;

//     Papa.parse(file, {
//       header: true,
//       skipEmptyLines: "greedy",

//       transformHeader: (header) =>
//         String(header)
//           .replace(/^\uFEFF/, "")
//           .trim()
//           .toLowerCase(),

//       transform: (value) => (typeof value === "string" ? value.trim() : value),

//       complete: (result) => {
//         if (parseId !== parseRequestRef.current) {
//           return;
//         }

//         if (
//           result.errors.length ||
//           Object.keys(result.meta.renamedHeaders || {}).length
//         ) {
//           toast.error(
//             result.errors[0]?.message || "The CSV contains duplicate headers.",
//           );

//           return;
//         }

//         const rows = result.data || [];
//         const columns = result.meta.fields || [];

//         if (!columns.includes("name")) {
//           toast.error("The CSV requires a name header.");

//           return;
//         }

//         if (!rows.length || rows.length > 5000) {
//           toast.error("Provide between 1 and 5000 category rows.");

//           return;
//         }

//         const seenNames = new Set();
//         const rowErrors = {};

//         rows.forEach((row, index) => {
//           const errors = [];

//           const name = String(row.name ?? "")
//             .trim()
//             .replace(/\s+/g, " ");

//           const normalized = name.toLowerCase();

//           const status = String(row.status || "ACTIVE")
//             .trim()
//             .toUpperCase();

//           if (!name || name.length > 100) {
//             errors.push("Name must contain 1–100 characters");
//           }

//           if (seenNames.has(normalized)) {
//             errors.push("Duplicate category name in this file");
//           }

//           seenNames.add(normalized);

//           if (String(row.description ?? "").length > 1000) {
//             errors.push("Description cannot exceed 1000 characters");
//           }

//           if (!["ACTIVE", "INACTIVE"].includes(status)) {
//             errors.push("Status must be ACTIVE or INACTIVE");
//           }

//           if (errors.length) {
//             rowErrors[index] = errors;
//           }
//         });

//         setImportMessage("");

//         setImportPreview({
//           file,
//           rows,
//           columns,
//           rowErrors,
//         });
//       },

//       error: (error) => toast.error(`Unable to read CSV: ${error.message}`),
//     });
//   };

//   const finishImport = async (body) => {
//     const created =
//       body.createdCount ?? body.successCount ?? body.importedCount;

//     const failed = body.failedCount ?? body.failureCount;

//     if (
//       !Number.isSafeInteger(created) ||
//       created < 0 ||
//       !Number.isSafeInteger(failed) ||
//       failed < 0
//     ) {
//       return false;
//     }

//     if (created > 0) {
//       toast.success(
//         `${created} categor${created === 1 ? "y" : "ies"} imported`,
//       );
//     }

//     const firstError = body.errors?.[0];

//     const errorText =
//       typeof firstError === "string" ? firstError : firstError?.message || "";

//     const message =
//       failed > 0
//         ? `${failed} row${failed === 1 ? "" : "s"} failed. ${errorText}`
//         : created === 0
//           ? "No categories were imported."
//           : "";

//     setImportMessage(message);

//     if (message) {
//       toast.error(message);
//     }

//     setImportPreview(null);

//     await loadCategories();

//     return true;
//   };

//   const confirmImport = async () => {
//     if (!importPreview || mutationLockRef.current || importUncertain) {
//       return;
//     }

//     if (Object.keys(importPreview.rowErrors).length) {
//       toast.error("Correct the highlighted rows and upload the file again.");

//       return;
//     }

//     mutationLockRef.current = true;
//     setImportLoading(true);

//     try {
//       const csv = Papa.unparse({
//         fields: importPreview.columns,

//         data: importPreview.rows.map((row) =>
//           importPreview.columns.map((column) => row[column] ?? ""),
//         ),
//       });

//       const formData = new FormData();

//       formData.append(
//         "file",
//         new File([csv], importPreview.file.name, { type: "text/csv" }),
//       );

//       const response = await productCategoryApi.import(formData);

//       const handled = await finishImport(response?.data || {});

//       if (!handled) {
//         throw new Error("The import result was not confirmed.");
//       }
//     } catch (error) {
//       const status = error?.response?.status;

//       if (status && status < 500 && status !== 408) {
//         const handled = await finishImport(error.response?.data || {});

//         if (handled) {
//           return;
//         }

//         toast.error(getErrorMessage(error));

//         return;
//       }

//       setImportUncertain(true);
//       setImportPreview(null);

//       setImportMessage(
//         "The import result is uncertain. Some categories may already have been created. Review the list and server results before importing again.",
//       );

//       toast.error("Import outcome uncertain. Do not resubmit the file.");

//       await loadCategories();
//     } finally {
//       mutationLockRef.current = false;
//       setImportLoading(false);
//     }
//   };

//   return (
//     <div className="categories-page">
//       {loadError && (
//         <div className="category-notice category-notice--error" role="alert">
//           <p>{loadError}</p>

//           <button
//             type="button"
//             className="category-notice-button"
//             disabled={loading || confirmLoading || importLoading}
//             onClick={loadCategories}
//           >
//             Retry
//           </button>
//         </div>
//       )}

//       {importMessage && (
//         <div className="category-notice" role="status">
//           {importMessage}
//         </div>
//       )}

//       <DataList
//         title="Categories"
//         subtitle="Organize your Products and services"
//         columns={columns}
//         data={categories}
//         loading={loading}
//         rowKey="_id"
//         showCase="list"
//         searchable
//         filterable
//         sortable
//         selectable
//         columnVisibility
//         pagination
//         storageKey="trustiq-product-categories"
//         searchPlaceholder="Search category code, name or description..."
//         filters={[
//           {
//             key: "status",
//             label: "Status",
//             type: "select",
//             options: ["ACTIVE", "INACTIVE"],
//           },
//         ]}
//         quickFilters={[
//           {
//             key: "status",
//             value: "",
//             label: "All",
//           },
//           {
//             key: "status",
//             value: "ACTIVE",
//             label: "Active",
//           },
//           {
//             key: "status",
//             value: "INACTIVE",
//             label: "Inactive",
//           },
//         ]}
//         actions={{
//           view: (row) => openCategory(row, "view"),

//           edit: (row) => openCategory(row, "edit"),
//         }}
//         bulkActions={[
//           {
//             key: "activate",
//             label: "Activate",

//             action: (rows) => confirmStatusUpdate(rows, "ACTIVE"),
//           },
//           {
//             key: "deactivate",
//             label: "Deactivate",

//             action: (rows) => confirmStatusUpdate(rows, "INACTIVE"),
//           },
//         ]}
//         onRefresh={loadCategories}
//         importConfig={{
//           templateFileName: "categories-import-template.csv",

//           columns: [
//             {
//               key: "name",
//               example: "Electronics",
//             },
//             {
//               key: "description",
//               example: "Electronic Products and accessories",
//             },
//             {
//               key: "status",
//               example: "ACTIVE",
//             },
//           ],

//           onUpload: handleCsvUpload,

//           onError: (message) => toast.error(message),
//         }}
//         addButton={
//           <button
//             type="button"
//             className="so-primary-button"
//             disabled={confirmLoading || importLoading}
//             onClick={() => openCategory()}
//           >
//             <Plus size={16} />
//             <span>New Category</span>
//           </button>
//         }
//       />

//       <CategoryModal
//         isOpen={modalState.open}
//         mode={modalState.mode}
//         editData={modalState.record}
//         onClose={() =>
//           setModalState({
//             open: false,
//             mode: "create",
//             record: null,
//           })
//         }
//         onSave={upsertCategory}
//       />

//       <ConfirmModal
//         open={confirmState.open}
//         action={confirmState.action}
//         title={confirmState.title}
//         message={confirmState.message}
//         confirmText={confirmState.confirmText}
//         cancelText="Cancel"
//         loading={confirmLoading}
//         onCancel={() => {
//           if (!mutationLockRef.current) {
//             setConfirmState(INITIAL_CONFIRM_STATE);
//           }
//         }}
//         onConfirm={handleConfirm}
//       />

//       <ImportPreviewModal
//         isOpen={Boolean(importPreview)}
//         fileName={importPreview?.file?.name}
//         columns={importPreview?.columns || []}
//         rows={importPreview?.rows || []}
//         rowErrors={importPreview?.rowErrors || {}}
//         loading={importLoading}
//         onCancel={() => {
//           if (!importLoading) {
//             setImportPreview(null);
//           }
//         }}
//         onConfirm={confirmImport}
//       />
//     </div>
//   );
// }

// export default CategoriesList;


import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

  return body?.message || error?.message || "Unable to complete the request.";
};

const extractRecord = (response) => {
  const category = response?.data?.data || response?.data?.category;

  if (!category?._id || !category?.categoryCode) {
    throw new Error("The server did not return a valid category.");
  }

  return category;
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


const getCreatedTimestamp = (record) => {
  const createdAt = record?.createdAt
    ? new Date(record.createdAt).getTime()
    : NaN;

  if (Number.isFinite(createdAt)) {
    return createdAt;
  }

  // Fallback for legacy records without createdAt.
  const id = String(record?._id || "");
  if (/^[a-f\d]{24}$/i.test(id)) {
    return parseInt(id.slice(0, 8), 16) * 1000;
  }

  return 0;
};

const sortCategoriesNewestFirst = (records) =>
  [...records].sort((a, b) => {
    const difference = getCreatedTimestamp(b) - getCreatedTimestamp(a);

    if (difference !== 0) {
      return difference;
    }

    return String(b?.categoryCode || "").localeCompare(
      String(a?.categoryCode || ""),
      undefined,
      { numeric: true, sensitivity: "base" },
    );
  });

function CategoriesList() {
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);

  const [loadError, setLoadError] = useState("");

  const [modalState, setModalState] = useState({
    open: false,
    mode: "create",
    record: null,
  });

  const [confirmState, setConfirmState] = useState(INITIAL_CONFIRM_STATE);

  const [confirmLoading, setConfirmLoading] = useState(false);

  const [importPreview, setImportPreview] = useState(null);

  const [importLoading, setImportLoading] = useState(false);

  const [importUncertain, setImportUncertain] = useState(false);

  const [importMessage, setImportMessage] = useState("");

  const mutationLockRef = useRef(false);
  const loadRequestRef = useRef(0);
  const parseRequestRef = useRef(0);

  const loadCategories = useCallback(async () => {
    const requestId = ++loadRequestRef.current;

    setLoading(true);
    setLoadError("");

    try {
      const first = await productCategoryApi.getAll({
        page: 1,
        limit: 100,
        sortBy: "createdAt",
        sortOrder: "desc",
      });

      if (!Array.isArray(first?.data?.data)) {
        throw new Error("The server returned an invalid category list.");
      }

      const records = [...first.data.data];

      const pages = Number(first.data.pagination?.totalPages ?? 1);

      if (!Number.isSafeInteger(pages) || pages < 0) {
        throw new Error("Invalid category pagination.");
      }

      for (let page = 2; page <= pages; page += 1) {
        if (requestId !== loadRequestRef.current) {
          return;
        }

        const response = await productCategoryApi.getAll({
          page,
          limit: 100,
          sortBy: "createdAt",
          sortOrder: "desc",
        });

        if (!Array.isArray(response?.data?.data)) {
          throw new Error("Unable to read a category page.");
        }

        records.push(...response.data.data);
      }

      if (records.some((record) => !record?._id || !record?.categoryCode)) {
        throw new Error("Category records must include _id and categoryCode.");
      }

      if (requestId === loadRequestRef.current) {
        setCategories(
          sortCategoriesNewestFirst(
            Array.from(
              new Map(
                records.map((record) => [String(record._id), record]),
              ).values(),
            ),
          ),
        );
      }
    } catch (error) {
      if (requestId === loadRequestRef.current) {
        setLoadError(getErrorMessage(error));
      }
    } finally {
      if (requestId === loadRequestRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadCategories();

    return () => {
      loadRequestRef.current += 1;
      parseRequestRef.current += 1;
    };
  }, [loadCategories]);

  const upsertCategory = (record) => {
    setCategories((previous) => {
      const exists = previous.some((item) => item._id === record._id);

      return sortCategoriesNewestFirst(
        exists
          ? previous.map((item) => (item._id === record._id ? record : item))
          : [record, ...previous],
      );
    });
  };

  const openCategory = (record = null, mode = "create") => {
    if (mutationLockRef.current) {
      return;
    }

    setModalState({
      open: true,
      mode,
      record,
    });
  };
  const handleView = useCallback((row) => {
    if (mutationLockRef.current) {
      return;
    }

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
            <strong>{value}</strong>

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
    [],
  );

  const executeStatusUpdate = async (rows, status) => {
    let successCount = 0;
    const failures = [];

    const uniqueRows = Array.from(
      new Map(rows.map((row) => [row._id, row])).values(),
    );

    for (const row of uniqueRows) {
      try {
        const freshResponse = await productCategoryApi.getByCode(
          row.categoryCode,
        );

        const fresh = extractRecord(freshResponse);

        if (fresh.status === status) {
          upsertCategory(fresh);
          successCount += 1;
          continue;
        }

        if (!Number.isSafeInteger(fresh.__v) || fresh.__v < 0) {
          throw new Error("Category version is missing.");
        }

        const response = await productCategoryApi.update(fresh.categoryCode, {
          version: fresh.__v,
          status,
        });

        upsertCategory(extractRecord(response));

        successCount += 1;
      } catch (error) {
        failures.push({
          name: row.name,
          message: getErrorMessage(error),
        });
      }
    }

    if (successCount) {
      toast.success(
        `${successCount} categor${successCount === 1 ? "y" : "ies"} ${status === "ACTIVE" ? "active" : "inactive"}`,
      );
    }

    if (failures.length) {
      toast.error(
        `${failures.length} operation${failures.length === 1 ? "" : "s"} could not be confirmed. ${failures[0].name}: ${failures[0].message}`,
        {
          duration: 7000,
        },
      );
    }

    await loadCategories();
  };

  const confirmStatusUpdate = (rows, status) => {
    if (!rows?.length || mutationLockRef.current) {
      return;
    }

    const activate = status === "ACTIVE";

    const label = activate ? "Activate" : "Deactivate";

    const noun = rows.length === 1 ? "category" : "categories";

    setConfirmState({
      open: true,

      action: activate ? "activate" : "deactivate",

      title: `${label} selected ${noun}?`,

      message:
        `${label} ${rows.length} selected ${noun}?\n` +
        (activate
          ? "They will become available for new Product assignments."
          : "Existing Product category values will remain unchanged."),

      confirmText: `${label} ${rows.length}`,

      onConfirm: () => executeStatusUpdate(rows, status),
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

      transform: (value) => (typeof value === "string" ? value.trim() : value),

      complete: (result) => {
        if (parseId !== parseRequestRef.current) {
          return;
        }

        if (
          result.errors.length ||
          Object.keys(result.meta.renamedHeaders || {}).length
        ) {
          toast.error(
            result.errors[0]?.message || "The CSV contains duplicate headers.",
          );

          return;
        }

        const rows = result.data || [];
        const columns = result.meta.fields || [];

        if (!columns.includes("name")) {
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
          columns,
          rowErrors,
        });
      },

      error: (error) => toast.error(`Unable to read CSV: ${error.message}`),
    });
  };

  const finishImport = async (body) => {
    const created =
      body.createdCount ?? body.successCount ?? body.importedCount;

    const failed = body.failedCount ?? body.failureCount;

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
        `${created} categor${created === 1 ? "y" : "ies"} imported`,
      );
    }

    const firstError = body.errors?.[0];

    const errorText =
      typeof firstError === "string" ? firstError : firstError?.message || "";

    const message =
      failed > 0
        ? `${failed} row${failed === 1 ? "" : "s"} failed. ${errorText}`
        : created === 0
          ? "No categories were imported."
          : "";

    setImportMessage(message);

    if (message) {
      toast.error(message);
    }

    setImportPreview(null);

    await loadCategories();

    return true;
  };

  const confirmImport = async () => {
    if (!importPreview || mutationLockRef.current || importUncertain) {
      return;
    }

    if (Object.keys(importPreview.rowErrors).length) {
      toast.error("Correct the highlighted rows and upload the file again.");

      return;
    }

    mutationLockRef.current = true;
    setImportLoading(true);

    try {
      const csv = Papa.unparse({
        fields: importPreview.columns,

        data: importPreview.rows.map((row) =>
          importPreview.columns.map((column) => row[column] ?? ""),
        ),
      });

      const formData = new FormData();

      formData.append(
        "file",
        new File([csv], importPreview.file.name, { type: "text/csv" }),
      );

      const response = await productCategoryApi.import(formData);

      const handled = await finishImport(response?.data || {});

      if (!handled) {
        throw new Error("The import result was not confirmed.");
      }
    } catch (error) {
      const status = error?.response?.status;

      if (status && status < 500 && status !== 408) {
        const handled = await finishImport(error.response?.data || {});

        if (handled) {
          return;
        }

        toast.error(getErrorMessage(error));

        return;
      }

      setImportUncertain(true);
      setImportPreview(null);

      setImportMessage(
        "The import result is uncertain. Some categories may already have been created. Review the list and server results before importing again.",
      );

      toast.error("Import outcome uncertain. Do not resubmit the file.");

      await loadCategories();
    } finally {
      mutationLockRef.current = false;
      setImportLoading(false);
    }
  };

  return (
    <div className="categories-page">
      {loadError && (
        <div className="category-notice category-notice--error" role="alert">
          <p>{loadError}</p>

          <button
            type="button"
            className="category-notice-button"
            disabled={loading || confirmLoading || importLoading}
            onClick={loadCategories}
          >
            Retry
          </button>
        </div>
      )}

      {importMessage && (
        <div className="category-notice" role="status">
          {importMessage}
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
          view: (row) => openCategory(row, "view"),

          edit: (row) => openCategory(row, "edit"),
        }}
        bulkActions={[
          {
            key: "activate",
            label: "Activate",

            action: (rows) => confirmStatusUpdate(rows, "ACTIVE"),
          },
          {
            key: "deactivate",
            label: "Deactivate",

            action: (rows) => confirmStatusUpdate(rows, "INACTIVE"),
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
            disabled={confirmLoading || importLoading}
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
        onSave={upsertCategory}
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
            setConfirmState(INITIAL_CONFIRM_STATE);
          }
        }}
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
