// import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// import { Plus } from "lucide-react";
// import toast from "react-hot-toast";
// import Papa from "papaparse";

// import DataList from "../../components/common/DataList/DataList";
// import StatusField from "../../components/common/StatusField/StatusField";
// import ConfirmModal from "../../components/common/ConfirmModal/ConfirmModal";
// import ImportPreviewModal from "../../components/common/DataList/ImportPreviewModal";

// import productBrandApi from "../../services/modules/productBrandApi";

// import BrandModal from "./BrandModal";

// const INITIAL_MODAL = {
//   open: false,
//   mode: "create",
//   record: null,
// };

// const INITIAL_CONFIRM = {
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

// const extractBrand = (response) => {
//   const brand = response?.data?.data || response?.data?.brand;

//   if (!brand?._id || !brand?.name) {
//     throw new Error("The server did not return a valid brand.");
//   }

//   return brand;
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

// function BrandsList() {
//   const [brands, setBrands] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [loadError, setLoadError] = useState("");

//   const [modalState, setModalState] = useState(INITIAL_MODAL);
//   const [confirmState, setConfirmState] = useState(INITIAL_CONFIRM);
//   const [confirmLoading, setConfirmLoading] = useState(false);

//   const [importPreview, setImportPreview] = useState(null);
//   const [importLoading, setImportLoading] = useState(false);
//   const [importMessage, setImportMessage] = useState("");
//   const [importUncertain, setImportUncertain] = useState(false);

//   const loadIdRef = useRef(0);
//   const parseIdRef = useRef(0);
//   const mutationLockRef = useRef(false);

//   const loadBrands = useCallback(async () => {
//     const requestId = ++loadIdRef.current;

//     setLoading(true);
//     setLoadError("");

//     try {
//       const first = await productBrandApi.getAll({
//         page: 1,
//         limit: 100,
//       });

//       if (!Array.isArray(first?.data?.data)) {
//         throw new Error("The server returned an invalid brand list.");
//       }

//       const records = [...first.data.data];

//       const pages = Number(first.data.pagination?.totalPages ?? 1);

//       if (!Number.isSafeInteger(pages) || pages < 0) {
//         throw new Error("Invalid brand pagination.");
//       }

//       for (let page = 2; page <= pages; page += 1) {
//         if (requestId !== loadIdRef.current) {
//           return;
//         }

//         const response = await productBrandApi.getAll({
//           page,
//           limit: 100,
//         });

//         if (!Array.isArray(response?.data?.data)) {
//           throw new Error("Unable to read a brand page.");
//         }

//         records.push(...response.data.data);
//       }

//       if (records.some((record) => !record?._id)) {
//         throw new Error("One or more brand records are invalid.");
//       }

//       if (requestId === loadIdRef.current) {
//         setBrands(
//           Array.from(
//             new Map(records.map((record) => [record._id, record])).values(),
//           ),
//         );
//       }
//     } catch (error) {
//       if (requestId === loadIdRef.current) {
//         setLoadError(getErrorMessage(error));
//       }
//     } finally {
//       if (requestId === loadIdRef.current) {
//         setLoading(false);
//       }
//     }
//   }, []);

//   useEffect(() => {
//     loadBrands();

//     return () => {
//       loadIdRef.current += 1;
//       parseIdRef.current += 1;
//     };
//   }, [loadBrands]);

//   const upsertBrand = (record) => {
//     setBrands((previous) => {
//       const exists = previous.some((item) => item._id === record._id);

//       return exists
//         ? previous.map((item) => (item._id === record._id ? record : item))
//         : [record, ...previous];
//     });
//   };

//   const openBrand = useCallback((record = null, mode = "create") => {
//     if (mutationLockRef.current) {
//       return;
//     }

//     setModalState({
//       open: true,
//       mode,
//       record,
//     });
//   }, []);

//   const columns = useMemo(
//     () => [
//       {
//         key: "name",
//         label: "Brand",
//         sortable: true,

//         render: (value, row) => (
//           <button
//             type="button"
//             className="doc-link-button"
//             aria-label={`View brand ${value || ""}`}
//             onClick={(event) => {
//               event.stopPropagation();
//               openBrand(row, "view");
//             }}
//           >
//             {value || "N/A"}
//           </button>
//         ),
//       },
//       {
//         key: "description",
//         label: "Description",
//         sortable: true,

//         render: (value) => value || "No description",
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
//     [openBrand],
//   );

//   const updateStatuses = async (rows, status) => {
//     const uniqueRows = Array.from(
//       new Map(rows.map((row) => [String(row._id), row])).values(),
//     );

//     if (!uniqueRows.length) {
//       return;
//     }

//     const brandIds = [];
//     const versions = {};

//     for (const row of uniqueRows) {
//       const id = String(row._id || "");

//       if (!/^[a-f\d]{24}$/i.test(id)) {
//         throw new Error("A selected brand has an invalid ID. Refresh the list.");
//       }

//       if (!Number.isSafeInteger(row.__v) || row.__v < 0) {
//         throw new Error(
//           `Version is missing for ${row.name || "a selected brand"}. Refresh the list.`,
//         );
//       }

//       brandIds.push(id);
//       versions[id] = row.__v;
//     }

//     const response = await productBrandApi.bulkAction({
//       brandIds,
//       status,
//       versions,
//     });

//     const result = response?.data?.data;

//     if (
//       !response?.data?.success ||
//       !result ||
//       !Number.isSafeInteger(result.affectedCount) ||
//       !Number.isSafeInteger(result.unchangedCount)
//     ) {
//       throw new Error(
//         response?.data?.message ||
//           "The bulk status update could not be confirmed.",
//       );
//     }

//     if (result.affectedCount > 0) {
//       toast.success(
//         `${result.affectedCount} brand${
//           result.affectedCount === 1 ? "" : "s"
//         } ${status === "ACTIVE" ? "activated" : "deactivated"} successfully`,
//       );
//     }

//     if (result.unchangedCount > 0) {
//       toast.success(
//         `${result.unchangedCount} brand${
//           result.unchangedCount === 1 ? "" : "s"
//         } already had this status`,
//       );
//     }

//     await loadBrands();
//   };

//   const confirmStatus = (rows, status) => {
//     if (!rows?.length || mutationLockRef.current) {
//       return;
//     }

//     const activate = status === "ACTIVE";
//     const label = activate ? "Activate" : "Deactivate";
//     const noun = rows.length === 1 ? "brand" : "brands";

//     setConfirmState({
//       open: true,
//       action: activate ? "activate" : "deactivate",
//       title: `${label} selected ${noun}?`,

//       message:
//         `${label} ${rows.length} selected ${noun}?\n` +
//         (activate
//           ? "They will become available for new Product assignments."
//           : "Existing Product brand values will remain unchanged."),

//       confirmText: `${label} ${rows.length}`,

//       onConfirm: () => updateStatuses(rows, status),
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
//       setConfirmState(INITIAL_CONFIRM);
//     } catch (error) {
//       toast.error(getErrorMessage(error));

//       if (error?.response?.status === 409) {
//         await loadBrands();
//       }
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

//     const parseId = ++parseIdRef.current;

//     Papa.parse(file, {
//       header: true,
//       skipEmptyLines: "greedy",

//       transformHeader: (header) =>
//         String(header)
//           .replace(/^\uFEFF/, "")
//           .trim()
//           .toLowerCase(),

//       transform: (value) =>
//         typeof value === "string" ? value.trim() : value,

//       complete: (result) => {
//         if (parseId !== parseIdRef.current) {
//           return;
//         }

//         if (
//           result.errors.length ||
//           Object.keys(result.meta.renamedHeaders || {}).length
//         ) {
//           toast.error(
//             result.errors[0]?.message ||
//               "The CSV contains duplicate headers.",
//           );

//           return;
//         }

//         const rows = result.data || [];
//         const columns = result.meta.fields || [];

//         if (!columns.includes("name")) {
//           toast.error("CSV requires a name header.");
//           return;
//         }

//         if (!rows.length || rows.length > 5000) {
//           toast.error("Provide between 1 and 5000 brand rows.");
//           return;
//         }

//         const rowErrors = {};
//         const seenNames = new Set();

//         rows.forEach((row, index) => {
//           const errors = [];

//           const name = String(row.name ?? "")
//             .trim()
//             .replace(/\s+/g, " ");

//           const nameKey = name.toLowerCase();

//           if (!name || name.length > 100) {
//             errors.push("Name must contain 1–100 characters");
//           }

//           if (seenNames.has(nameKey)) {
//             errors.push("Duplicate brand name in this file");
//           }

//           seenNames.add(nameKey);

//           if (String(row.description ?? "").length > 1000) {
//             errors.push("Description cannot exceed 1000 characters");
//           }

//           const status = String(row.status || "ACTIVE")
//             .trim()
//             .toUpperCase();

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
//           columns,
//           rows,
//           rowErrors,
//         });
//       },

//       error: (error) => {
//         if (parseId === parseIdRef.current) {
//           toast.error(`Unable to read CSV: ${error.message}`);
//         }
//       },
//     });
//   };

//   const finishImport = async (body) => {
//     if (body.requiresVerification) {
//       setImportUncertain(true);
//       setImportMessage(
//         body.message ||
//           "The import outcome is uncertain. Review the brand list before retrying.",
//       );
//       setImportPreview(null);

//       toast.error("Import outcome uncertain. Do not resubmit the file.");

//       await loadBrands();

//       return true;
//     }

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
//         `${created} brand${created === 1 ? "" : "s"} imported successfully`,
//       );
//     }

//     const firstError = body.errors?.[0];

//     const detail =
//       typeof firstError === "string"
//         ? firstError
//         : firstError?.message || "";

//     const message =
//       failed > 0
//         ? `${failed} row${failed === 1 ? "" : "s"} failed. ${detail}`
//         : created === 0
//           ? "No brands were imported."
//           : "";

//     setImportMessage(message);

//     if (message) {
//       toast.error(message);
//     }

//     setImportPreview(null);

//     await loadBrands();

//     return true;
//   };

//   const confirmImport = async () => {
//     if (!importPreview || mutationLockRef.current || importUncertain) {
//       return;
//     }

//     if (Object.keys(importPreview.rowErrors).length) {
//       toast.error("Correct the highlighted errors and upload the file again.");
//       return;
//     }

//     mutationLockRef.current = true;
//     setImportLoading(true);

//     try {
//       const payload = {
//         rows: importPreview.rows.map((row) => ({
//           name: String(row.name ?? "")
//             .trim()
//             .replace(/\s+/g, " "),
//           description: String(row.description ?? "").trim(),
//           status: String(row.status || "ACTIVE")
//             .trim()
//             .toUpperCase(),
//         })),
//       };

//       const response = await productBrandApi.import(payload);

//       const body = response?.data || {};

//       const handled = await finishImport(body);

//       if (!handled) {
//         throw new Error("The import result was not confirmed.");
//       }
//     } catch (error) {
//       const status = error?.response?.status;
//       const responseBody = error?.response?.data || {};

//       if (responseBody.requiresVerification) {
//         await finishImport(responseBody);
//         return;
//       }

//       if (status && status < 500 && status !== 408) {
//         const handled = await finishImport(responseBody);

//         if (handled) {
//           return;
//         }

//         toast.error(getErrorMessage(error));
//         return;
//       }

//       setImportUncertain(true);
//       setImportPreview(null);

//       setImportMessage(
//         "The import outcome is uncertain. Some brands may already have been created. Review the list and server results before importing again.",
//       );

//       toast.error("Import outcome uncertain. Do not resubmit the file.");

//       await loadBrands();
//     } finally {
//       mutationLockRef.current = false;
//       setImportLoading(false);
//     }
//   };

//   return (
//     <>
//       {loadError && (
//         <div className="section-form-api-error" role="alert">
//           <p>{loadError}</p>

//           <button
//             type="button"
//             className="doc-link-button"
//             disabled={loading || confirmLoading || importLoading}
//             onClick={loadBrands}
//           >
//             Retry
//           </button>
//         </div>
//       )}

//       {importMessage && (
//         <div className="section-info-box" role="status">
//           {importMessage}
//         </div>
//       )}

//       <DataList
//         title="Brands"
//         subtitle="Manage Product brands and availability"
//         columns={columns}
//         data={brands}
//         loading={loading}
//         rowKey="_id"
//         showCase="list"
//         searchable
//         filterable
//         sortable
//         selectable
//         columnVisibility
//         pagination
//         storageKey="trustiq-product-brands"
//         searchPlaceholder="Search brand name or description..."
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
//           view: (row) => openBrand(row, "view"),
//           edit: (row) => openBrand(row, "edit"),
//         }}
//         bulkActions={[
//           {
//             key: "activate",
//             label: "Activate",
//             action: (rows) => confirmStatus(rows, "ACTIVE"),
//           },
//           {
//             key: "deactivate",
//             label: "Deactivate",
//             action: (rows) => confirmStatus(rows, "INACTIVE"),
//           },
//         ]}
//         onRefresh={loadBrands}
//         importConfig={{
//           templateFileName: "brands-import-template.csv",
//           columns: [
//             {
//               key: "name",
//               example: "Sample Brand",
//             },
//             {
//               key: "description",
//               example: "Product brand",
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
//             onClick={() => openBrand()}
//           >
//             <Plus size={16} />
//             <span>New Brand</span>
//           </button>
//         }
//       />

//       <BrandModal
//         isOpen={modalState.open}
//         brand={modalState.record}
//         mode={modalState.mode}
//         onClose={() => setModalState(INITIAL_MODAL)}
//         onSave={upsertBrand}
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
//             setConfirmState(INITIAL_CONFIRM);
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
//     </>
//   );
// }

// export default BrandsList;



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

import productBrandApi from "../../services/modules/productBrandApi";

import BrandModal from "./BrandModal";

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

const INITIAL_QUERY = {
  page: 1,
  limit: 20,
  search: "",
  sortBy: "createdAt",
  sortOrder: "desc",
  filters: {
    status: "",
  },
};

const getErrorMessage = (error) => {
  const body = error?.response?.data;

  if (Array.isArray(body?.errors) && body.errors.length) {
    return body.errors
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.message || item?.msg || "Validation failed"
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

const extractBrand = (response) => {
  const brand = response?.data?.data || response?.data?.brand;

  if (!brand?._id || !brand?.name) {
    throw new Error("The server did not return a valid brand.");
  }

  return brand;
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

function BrandsList() {
  const [brands, setBrands] = useState([]);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [query, setQuery] = useState(INITIAL_QUERY);
  const [reloadKey, setReloadKey] = useState(0);

  const [modalState, setModalState] = useState(INITIAL_MODAL);

  const [confirmState, setConfirmState] = useState(INITIAL_CONFIRM);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [importPreview, setImportPreview] = useState(null);
  const [importLoading, setImportLoading] = useState(false);

  const [importMessage, setImportMessage] = useState("");
  const [importUncertain, setImportUncertain] = useState(false);

  const loadIdRef = useRef(0);
  const parseIdRef = useRef(0);
  const mutationLockRef = useRef(false);

  // --------------------------------------------------
  // SERVER-SIDE REFRESH
  // --------------------------------------------------

  const loadBrands = useCallback(() => {
    setReloadKey((current) => current + 1);
  }, []);

  // --------------------------------------------------
  // SERVER-SIDE LIST API
  // Only current page is fetched.
  // --------------------------------------------------

  useEffect(() => {
    const requestId = ++loadIdRef.current;

    const load = async () => {
      setLoading(true);
      setLoadError("");

      try {
        const params = {
          page: query.page,
          limit: query.limit,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
        };

        if (query.search.trim()) {
          params.search = query.search.trim();
        }

        if (query.filters.status) {
          params.status = query.filters.status;
        }

        const response = await productBrandApi.getAll(params);

        if (requestId !== loadIdRef.current) return;

        const records = response?.data?.data;

        if (!Array.isArray(records)) {
          throw new Error("Invalid brand list response.");
        }

        if (records.some((record) => !record?._id)) {
          throw new Error("One or more brand records are invalid.");
        }

        const serverTotal = Number(
          response?.data?.pagination?.total
        );

        setBrands(records);

        setTotal(
          Number.isSafeInteger(serverTotal) && serverTotal >= 0
            ? serverTotal
            : records.length
        );
      } catch (error) {
        if (requestId === loadIdRef.current) {
          setLoadError(getErrorMessage(error));
        }
      } finally {
        if (requestId === loadIdRef.current) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      loadIdRef.current += 1;
    };
  }, [query, reloadKey]);

  // --------------------------------------------------
  // SERVER-SIDE PAGINATION
  // --------------------------------------------------

  const handlePageChange = useCallback((page) => {
    setQuery((previous) => ({
      ...previous,
      page,
    }));
  }, []);

  const handlePageSizeChange = useCallback((limit) => {
    setQuery((previous) => ({
      ...previous,
      page: 1,
      limit: Number(limit),
    }));
  }, []);

  // --------------------------------------------------
  // SERVER-SIDE SEARCH
  // --------------------------------------------------

  const handleSearch = useCallback((search) => {
    setQuery((previous) => ({
      ...previous,
      page: 1,
      search: search ?? "",
    }));
  }, []);

  // --------------------------------------------------
  // SERVER-SIDE SORT
  // DataList sends { key, direction }
  // --------------------------------------------------

  const handleSort = useCallback((sort) => {
    setQuery((previous) => ({
      ...previous,
      page: 1,
      sortBy: sort?.key || "createdAt",
      sortOrder: sort?.direction || "desc",
    }));
  }, []);

  // --------------------------------------------------
  // SERVER-SIDE FILTER
  // DataList sends complete filters object.
  // --------------------------------------------------

  const handleFilterChange = useCallback((filters) => {
    setQuery((previous) => ({
      ...previous,
      page: 1,
      filters: {
        ...previous.filters,
        ...filters,
      },
    }));
  }, []);

  // --------------------------------------------------
  // UPSERT BRAND
  // --------------------------------------------------

  const upsertBrand = useCallback(
    async (record) => {
      if (!record?._id) {
        setModalState(INITIAL_MODAL);
        setQuery((previous) => ({
          ...previous,
          page: 1,
        }));
        loadBrands();
        return;
      }

      setBrands((previous) =>
        previous.map((item) =>
          String(item._id) === String(record._id)
            ? record
            : item
        )
      );

      setModalState(INITIAL_MODAL);
      loadBrands();
    },
    [loadBrands]
  );

  // --------------------------------------------------
  // OPEN BRAND MODAL
  // --------------------------------------------------

  const openBrand = useCallback(
    (record = null, mode = "create") => {
      if (mutationLockRef.current) return;

      setModalState({
        open: true,
        mode,
        record,
      });
    },
    []
  );

  // --------------------------------------------------
  // TABLE COLUMNS
  // --------------------------------------------------

  const columns = useMemo(
    () => [
      {
        key: "brandCode",
        label: "Brand Code",
        sortable: true,
        render: (value) => value || "—",
      },
      {
        key: "name",
        label: "Brand",
        sortable: true,
        render: (value, row) => (
          <button
            type="button"
            className="doc-link-button"
            aria-label={`View brand ${value || ""}`}
            onClick={(event) => {
              event.stopPropagation();
              openBrand(row, "view");
            }}
          >
            {value || "N/A"}
          </button>
        ),
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
    [openBrand]
  );

  // --------------------------------------------------
  // BULK STATUS UPDATE
  // One API request for all selected brands.
  // --------------------------------------------------

  const updateStatuses = async (rows, status) => {
    const uniqueRows = Array.from(
      new Map(
        rows.map((row) => [String(row._id), row])
      ).values()
    );

    const brandIds = uniqueRows.map((row) =>
      String(row._id)
    );

    const versions = {};

    for (const row of uniqueRows) {
      if (
        !Number.isSafeInteger(row.__v) ||
        row.__v < 0
      ) {
        throw new Error(
          `Brand version missing for ${row.name}. Refresh and try again.`
        );
      }

      versions[String(row._id)] = row.__v;
    }

    const response = await productBrandApi.bulkAction({
      brandIds,
      status,
      versions,
    });

    const result = response?.data;

    if (
      !result ||
      !Number.isSafeInteger(result.affectedCount) ||
      !Number.isSafeInteger(result.unchangedCount)
    ) {
      throw new Error(
        "The server returned an invalid bulk update result."
      );
    }

    toast.success(
      `${result.affectedCount} brand(s) updated. ${result.unchangedCount} already had this status.`
    );

    await loadBrands();
  };

  // --------------------------------------------------
  // CONFIRM BULK STATUS
  // --------------------------------------------------

  const confirmStatus = (rows, status) => {
    if (!rows?.length || mutationLockRef.current) return;

    const activate = status === "ACTIVE";
    const label = activate ? "Activate" : "Deactivate";
    const noun = rows.length === 1 ? "brand" : "brands";

    setConfirmState({
      open: true,
      action: activate ? "activate" : "deactivate",
      title: `${label} selected ${noun}?`,
      message:
        `${label} ${rows.length} selected ${noun}?\n` +
        (activate
          ? "They will become available for new Product assignments."
          : "Existing Product brand values will remain unchanged."),
      confirmText: `${label} ${rows.length}`,
      onConfirm: () => updateStatuses(rows, status),
    });
  };

  // --------------------------------------------------
  // CONFIRM MODAL
  // --------------------------------------------------

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

      if (error?.response?.status === 409) {
        await loadBrands();
      }
    } finally {
      mutationLockRef.current = false;
      setConfirmLoading(false);
    }
  };

  // --------------------------------------------------
  // CSV UPLOAD AND VALIDATION
  // --------------------------------------------------

  const handleCsvUpload = (file) => {
    if (mutationLockRef.current || importUncertain) {
      toast.error(
        importUncertain
          ? "Review the previous import outcome before importing again."
          : "Wait for the current operation to finish."
      );
      return;
    }

    const parseId = ++parseIdRef.current;

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
        if (parseId !== parseIdRef.current) return;

        if (
          result.errors.length ||
          Object.keys(result.meta.renamedHeaders || {}).length
        ) {
          toast.error(
            result.errors[0]?.message ||
              "The CSV contains duplicate headers."
          );
          return;
        }

        const rows = result.data || [];
        const csvColumns = result.meta.fields || [];

        if (!csvColumns.includes("name")) {
          toast.error("CSV requires a name header.");
          return;
        }

        if (!rows.length || rows.length > 5000) {
          toast.error("Provide between 1 and 5000 brand rows.");
          return;
        }

        const rowErrors = {};
        const seenNames = new Set();

        rows.forEach((row, index) => {
          const errors = [];

          const name = String(row.name ?? "")
            .trim()
            .replace(/\s+/g, " ");

          const nameKey = name.toLowerCase();

          if (!name || name.length > 100) {
            errors.push("Name must contain 1–100 characters");
          }

          if (seenNames.has(nameKey)) {
            errors.push("Duplicate brand name in this file");
          }

          seenNames.add(nameKey);

          if (
            String(row.description ?? "").length > 1000
          ) {
            errors.push(
              "Description cannot exceed 1000 characters"
            );
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

  // --------------------------------------------------
  // IMPORT RESULT
  // --------------------------------------------------

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
        `${created} brand(s) imported successfully`
      );
    }

    const firstError = body.errors?.[0];

    const detail =
      typeof firstError === "string"
        ? firstError
        : firstError?.message || "";

    const message =
      failed > 0
        ? `${failed} row(s) failed. ${detail}`
        : created === 0
          ? "No brands were imported."
          : "";

    setImportMessage(message);

    if (message) {
      toast.error(message);
    }

    setImportPreview(null);

    await loadBrands();

    return true;
  };

  // --------------------------------------------------
  // CONFIRM CSV IMPORT
  // --------------------------------------------------

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
        "Correct the highlighted errors and upload the file again."
      );
      return;
    }

    mutationLockRef.current = true;
    setImportLoading(true);

    try {
      const rows = importPreview.rows.map((row) => ({
        name: String(row.name ?? "")
          .trim()
          .replace(/\s+/g, " "),
        description: String(row.description ?? "").trim(),
        status: String(row.status || "ACTIVE")
          .trim()
          .toUpperCase(),
      }));

      const response = await productBrandApi.import({
        rows,
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
        "The import outcome is uncertain. Some brands may already have been created. Review the list and server results before importing again."
      );

      toast.error(
        "Import outcome uncertain. Do not resubmit the file."
      );

      await loadBrands();
    } finally {
      mutationLockRef.current = false;
      setImportLoading(false);
    }
  };

  const busy = confirmLoading || importLoading;

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

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
            disabled={loading || busy}
            onClick={loadBrands}
          >
            Retry
          </button>
        </div>
      )}

      {importMessage && (
        <div
          className="section-info-box"
          role={importUncertain ? "alert" : "status"}
        >
          {importMessage}

          {importUncertain && (
            <button
              type="button"
              className="doc-link-button"
              disabled={loading || busy}
              onClick={loadBrands}
            >
              Refresh Brands
            </button>
          )}
        </div>
      )}

      <DataList
        title="Brands"
        subtitle="Manage Product brands and availability"
        columns={columns}
        data={brands}
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
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onSearch={handleSearch}
        onSort={handleSort}
        onFilterChange={handleFilterChange}
        storageKey="trustiq-product-brands"
        searchPlaceholder="Search brand code, name or description..."
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
          view: (row) => openBrand(row, "view"),
          edit: (row) => openBrand(row, "edit"),
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
        onRefresh={loadBrands}
        importConfig={{
          templateFileName: "brands-import-template.csv",
          columns: [
            {
              key: "name",
              example: "Sample Brand",
            },
            {
              key: "description",
              example: "Product brand",
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
            onClick={() => openBrand()}
          >
            <Plus size={16} />
            <span>New Brand</span>
          </button>
        }
      />

      <BrandModal
        isOpen={modalState.open}
        brand={modalState.record}
        mode={modalState.mode}
        onClose={() => setModalState(INITIAL_MODAL)}
        onSave={upsertBrand}
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
            setConfirmState(INITIAL_CONFIRM);
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
    </>
  );
}

export default BrandsList;
