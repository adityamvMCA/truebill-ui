// import { Plus } from "lucide-react";
// import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import toast from "react-hot-toast";
// import Papa from "papaparse";

// import DataList from "../../components/common/DataList/DataList";
// import StatusField from "../../components/common/StatusField/StatusField";
// import ConfirmModal from "../../components/common/ConfirmModal/ConfirmModal";
// import ImportPreviewModal from "../../components/common/DataList/ImportPreviewModal";

// import api from "../../services/api";

// import ProductModal from "./ProductModal";
// import ProductDetailsModal from "./ProductDetailsModal";

// import "./products-list.css";

// const INITIAL_CONFIRM_STATE = {
//   open: false,
//   type: "question",
//   action: undefined,
//   title: "",
//   message: "",
//   confirmText: "Confirm",
//   onConfirm: null,
// };
// const CSV_MAX_ROWS = 500;

// const REQUIRED_CSV_HEADERS = ["name", "type", "unit"];

// const CSV_HEADER_ALIASES = {
//   name: "name",
//   type: "type",
//   category: "category",
//   brand: "brand",
//   description: "description",
//   unit: "unit",
//   hsnsaccode: "hsnSacCode",
//   hsnsac: "hsnSacCode",
//   gstrate: "gstRate",
//   saleprice: "salePrice",
//   purchaseprice: "purchasePrice",
//   trackinventory: "trackInventory",
//   openingstock: "openingStock",
//   openingstockrate: "openingStockRate",
//   reorderlevel: "reorderLevel",
//   warehouseid: "warehouseId",
//   status: "status",
// };

// const NUMBER_RULES = [
//   {
//     key: "gstRate",
//     label: "GST rate",
//     maximum: 100,
//   },
//   {
//     key: "salePrice",
//     label: "Sale price",
//     maximum: 1000000000,
//     scale: 100,
//   },
//   {
//     key: "purchasePrice",
//     label: "Purchase price",
//     maximum: 1000000000,
//     scale: 100,
//   },
//   {
//     key: "openingStock",
//     label: "Opening stock",
//     maximum: 1000000,
//     scale: 1000,
//   },
//   {
//     key: "openingStockRate",
//     label: "Opening stock rate",
//     maximum: 1000000000,
//     scale: 100,
//   },
//   {
//     key: "reorderLevel",
//     label: "Reorder level",
//     maximum: 1000000,
//     scale: 1000,
//   },
// ];

// const quantityFormatter = new Intl.NumberFormat("en-IN", {
//   maximumFractionDigits: 3,
// });

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

//   return (
//     body?.message ||
//     body?.error ||
//     error?.message ||
//     "Something went wrong. Please try again."
//   );
// };

// const getProductList = (response) => {
//   const body = response?.data;

//   if (Array.isArray(body?.data)) {
//     return body.data;
//   }

//   if (Array.isArray(body?.products)) {
//     return body.products;
//   }

//   if (Array.isArray(body)) {
//     return body;
//   }

//   throw new Error("The server returned an invalid Product list.");
// };

// const getProductRecord = (response) => {
//   const body = response?.data;

//   const product = body?.data || body?.product || body;

//   if (!product?._id || !product?.productCode) {
//     throw new Error(
//       "The server did not return a valid Product. Refresh the list before trying again.",
//     );
//   }

//   return product;
// };

// const tracksInventory = (product) =>
//   product?.type === "GOODS" && product?.trackInventory === true;

// const canonicalHeader = (header) => {
//   const text = String(header ?? "")
//     .replace(/^\uFEFF/, "")
//     .trim();

//   const lookup = text.replace(/[\s_-]+/g, "").toLowerCase();

//   return CSV_HEADER_ALIASES[lookup] || text;
// };

// const isBlank = (value) =>
//   value === undefined || value === null || String(value).trim() === "";

// const parsePreviewBoolean = (value, fallback) => {
//   if (isBlank(value)) {
//     return fallback;
//   }

//   const text = String(value).trim().toLowerCase();

//   if (["true", "yes", "1", "y"].includes(text)) {
//     return true;
//   }

//   if (["false", "no", "0", "n"].includes(text)) {
//     return false;
//   }

//   return null;
// };

// const validateImportRow = (row) => {
//   const errors = [];

//   const name = String(row.name ?? "").trim();

//   const type = String(row.type ?? "")
//     .trim()
//     .toUpperCase();

//   const unit = String(row.unit ?? "")
//     .trim()
//     .toUpperCase();

//   const status = String(row.status || "ACTIVE")
//     .trim()
//     .toUpperCase();

//   if (name.length < 2 || name.length > 200) {
//     errors.push("Name must contain 2–200 characters");
//   }

//   if (!["GOODS", "SERVICE"].includes(type)) {
//     errors.push("Type must be GOODS or SERVICE");
//   }

//   if (!/^[A-Z][A-Z0-9_]{0,19}$/.test(unit)) {
//     errors.push("Unit must be a valid unit code");
//   }

//   if (!["ACTIVE", "INACTIVE"].includes(status)) {
//     errors.push("Status must be ACTIVE or INACTIVE");
//   }

//   for (const [key, maximum] of [
//     ["category", 100],
//     ["brand", 100],
//     ["description", 1000],
//   ]) {
//     if (String(row[key] ?? "").trim().length > maximum) {
//       errors.push(`${key} cannot exceed ${maximum} characters`);
//     }
//   }

//   const hsnSacCode = String(row.hsnSacCode ?? "")
//     .trim()
//     .toUpperCase();

//   if (hsnSacCode && !/^[A-Z0-9]{2,20}$/.test(hsnSacCode)) {
//     errors.push("HSN/SAC must contain 2–20 letters or numbers");
//   }

//   for (const rule of NUMBER_RULES) {
//     if (isBlank(row[rule.key])) {
//       continue;
//     }

//     const number = Number(row[rule.key]);

//     if (!Number.isFinite(number) || number < 0 || number > rule.maximum) {
//       errors.push(`${rule.label} must be between 0 and ${rule.maximum}`);

//       continue;
//     }

//     if (rule.scale) {
//       const scaled = number * rule.scale;
//       const integer = Math.round(scaled);

//       if (
//         !Number.isSafeInteger(integer) ||
//         Math.abs(scaled - integer) > 0.000001
//       ) {
//         errors.push(`${rule.label} has too many decimal places`);
//       }
//     }
//   }

//   const trackInventory = parsePreviewBoolean(
//     row.trackInventory,
//     type === "GOODS",
//   );

//   if (trackInventory === null) {
//     errors.push("trackInventory must be true or false");
//   }

//   if (type === "SERVICE" && trackInventory === true) {
//     errors.push("Services cannot track inventory");
//   }

//   const warehouseId = String(row.warehouseId ?? "").trim();

//   if (warehouseId) {
//     if (!/^[a-fA-F0-9]{24}$/.test(warehouseId)) {
//       errors.push("warehouseId must be a valid ObjectId");
//     }

//     if (
//       type !== "GOODS" ||
//       trackInventory !== true ||
//       !(Number(row.openingStock) > 0)
//     ) {
//       errors.push(
//         "warehouseId requires inventory-tracked Goods with positive opening stock",
//       );
//     }
//   }

//   return errors;
// };

// const getImportResult = (body) => {
//   if (
//     !body ||
//     !Number.isSafeInteger(body.createdCount) ||
//     body.createdCount < 0 ||
//     !Number.isSafeInteger(body.failedCount) ||
//     body.failedCount < 0
//   ) {
//     return null;
//   }

//   return {
//     createdCount: body.createdCount,
//     failedCount: body.failedCount,

//     errors: Array.isArray(body.errors) ? body.errors : [],
//   };
// };

// const describeImportError = (error) => {
//   if (!error) {
//     return "";
//   }

//   if (typeof error === "string") {
//     return error;
//   }

//   const message = error.message || error.msg || "Row could not be imported";

//   return error.row != null ? `Row ${error.row}: ${message}` : message;
// };

// function ProductsList() {
//   const [loading, setLoading] = useState(true);
//   const [loadError, setLoadError] = useState("");
//   const [products, setProducts] = useState([]);

//   const [showProductModal, setShowProductModal] = useState(false);

//   const [selectedProduct, setSelectedProduct] = useState(null);

//   const [productModalMode, setProductModalMode] = useState("view");

//   const [confirmState, setConfirmState] = useState(INITIAL_CONFIRM_STATE);

//   const [confirmLoading, setConfirmLoading] = useState(false);

//   const [importPreview, setImportPreview] = useState(null);

//   const [importLoading, setImportLoading] = useState(false);

//   const [importMessage, setImportMessage] = useState("");

//   const [importUncertain, setImportUncertain] = useState(false);

//   const [bulkProgress, setBulkProgress] = useState("");

//   const loadRequestRef = useRef(0);
//   const mutationLockRef = useRef(false);
//   const csvParseRef = useRef(0);

//   const loadProducts = useCallback(async () => {
//     const requestId = ++loadRequestRef.current;

//     setLoading(true);
//     setLoadError("");

//     try {
//       const firstResponse = await api.product.getAll({
//         page: 1,
//         limit: 100,
//       });

//       const records = [...getProductList(firstResponse)];

//       const totalPages = Number(
//         firstResponse?.data?.pagination?.totalPages ?? 1,
//       );

//       if (!Number.isSafeInteger(totalPages) || totalPages < 0) {
//         throw new Error("The server returned invalid Product pagination.");
//       }

//       for (let page = 2; page <= totalPages; page += 1) {
//         if (requestId !== loadRequestRef.current) {
//           return;
//         }

//         const response = await api.product.getAll({
//           page,
//           limit: 100,
//         });

//         records.push(...getProductList(response));
//       }

//       if (requestId !== loadRequestRef.current) {
//         return;
//       }

//       if (records.some((product) => !product?._id || !product?.productCode)) {
//         throw new Error("One or more Product records are invalid.");
//       }

//       const uniqueRecords = Array.from(
//         new Map(
//           records.map((product) => [String(product._id), product]),
//         ).values(),
//       );

//       setProducts(uniqueRecords);

//       setSelectedProduct((current) => {
//         if (!current) {
//           return null;
//         }

//         return (
//           uniqueRecords.find((product) => product._id === current._id) || null
//         );
//       });
//     } catch (error) {
//       if (requestId !== loadRequestRef.current) {
//         return;
//       }

//       const message = getErrorMessage(error);

//       setLoadError(message);
//       toast.error(message);
//     } finally {
//       if (requestId === loadRequestRef.current) {
//         setLoading(false);
//       }
//     }
//   }, []);

//   useEffect(() => {
//     loadProducts();

//     return () => {
//       loadRequestRef.current += 1;
//       csvParseRef.current += 1;
//     };
//   }, [loadProducts]);

//   const upsertProduct = useCallback((record, prepend = false) => {
//     setProducts((previous) => {
//       const exists = previous.some((product) => product._id === record._id);

//       if (!exists) {
//         return prepend ? [record, ...previous] : [...previous, record];
//       }

//       return previous.map((product) =>
//         product._id === record._id ? record : product,
//       );
//     });

//     setSelectedProduct((current) =>
//       current?._id === record._id ? record : current,
//     );
//   }, []);

//   const removeProduct = useCallback((record) => {
//     setProducts((previous) =>
//       previous.filter((product) => product._id !== record._id),
//     );

//     setSelectedProduct((current) =>
//       current?._id === record._id ? null : current,
//     );
//   }, []);

//   const openProduct = (row, mode) => {
//     if (mutationLockRef.current) {
//       return;
//     }

//     setSelectedProduct(row);
//     setProductModalMode(mode);
//   };

//   const columns = useMemo(
//     () => [
//       {
//         key: "productCode",
//         label: "Code",
//         sortable: true,
//       },

//       {
//         key: "name",
//         label: "Product",
//         sortable: true,

//         render: (value, row) => (
//           <div className="dl-customer">
//             <strong>{value || "—"}</strong>

//             <span>{row.category || "Uncategorized"}</span>
//           </div>
//         ),
//       },

//       {
//         key: "type",
//         label: "Type",
//         sortable: true,

//         render: (value) => <StatusField value={value} />,
//       },

//       {
//         key: "unit",
//         label: "Unit",
//         sortable: true,
//       },

//       {
//         key: "salePrice",
//         label: "Sale Price",
//         type: "currency",
//         sortable: true,
//       },

//       {
//         key: "purchasePrice",
//         label: "Cost",
//         type: "currency",
//         sortable: true,
//       },

//       {
//         key: "currentStock",
//         label: "Stock",
//         type: "number",
//         sortable: true,

//         render: (value, row) => {
//           if (!tracksInventory(row)) {
//             return <span className="dl-muted-value">N/A</span>;
//           }

//           const quantity = Number(value);

//           return Number.isFinite(quantity)
//             ? quantityFormatter.format(quantity)
//             : "—";
//         },
//       },

//       {
//         key: "reorderLevel",
//         label: "Reorder",
//         type: "number",
//         sortable: true,

//         render: (value, row) => {
//           if (!tracksInventory(row)) {
//             return <span className="dl-muted-value">N/A</span>;
//           }

//           const quantity = Number(value);

//           return Number.isFinite(quantity)
//             ? quantityFormatter.format(quantity)
//             : "—";
//         },
//       },

//       {
//         key: "status",
//         label: "Status",
//         sortable: true,

//         render: (value) => <StatusField value={value} />,
//       },

//       {
//         key: "brand",
//         label: "Brand",
//         sortable: true,
//         visible: false,
//       },

//       {
//         key: "category",
//         label: "Category",
//         sortable: true,
//         visible: false,
//       },

//       {
//         key: "trackInventory",
//         label: "Stock Tracked",
//         sortable: true,
//         visible: false,

//         render: (_, row) => (tracksInventory(row) ? "Yes" : "No"),
//       },

//       {
//         key: "hsnSacCode",
//         label: "HSN / SAC",
//         sortable: true,
//         visible: false,
//       },

//       {
//         key: "gstRate",
//         label: "GST %",
//         type: "number",
//         sortable: true,
//         visible: false,
//       },
//     ],
//     [],
//   );

//   const filters = useMemo(
//     () => [
//       {
//         key: "type",
//         label: "Type",
//         type: "select",
//         options: ["GOODS", "SERVICE"],
//       },

//       {
//         key: "status",
//         label: "Status",
//         type: "select",
//         options: ["ACTIVE", "INACTIVE"],
//       },

//       {
//         key: "trackInventory",
//         label: "Stock Tracked",
//         type: "select",

//         options: [
//           {
//             label: "Yes",
//             value: true,
//           },
//           {
//             label: "No",
//             value: false,
//           },
//         ],
//       },
//     ],
//     [],
//   );

//   const quickFilters = useMemo(
//     () => [
//       {
//         key: "status",
//         value: "",
//         label: "All",
//       },
//       {
//         key: "status",
//         value: "ACTIVE",
//         label: "Active",
//       },
//       {
//         key: "status",
//         value: "INACTIVE",
//         label: "Inactive",
//       },
//       {
//         key: "type",
//         value: "GOODS",
//         label: "Goods",
//       },
//       {
//         key: "type",
//         value: "SERVICE",
//         label: "Services",
//       },
//     ],
//     [],
//   );

//   const openConfirmModal = (configuration) => {
//     if (mutationLockRef.current) {
//       return;
//     }

//     setConfirmState({
//       ...INITIAL_CONFIRM_STATE,
//       ...configuration,
//       open: true,
//     });
//   };

//   const closeConfirmModal = () => {
//     if (confirmLoading || mutationLockRef.current) {
//       return;
//     }

//     setConfirmState(INITIAL_CONFIRM_STATE);
//   };

//   const handleConfirmAction = async () => {
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
//       setBulkProgress("");
//     }
//   };

//   const handleDelete = (row) => {
//     openConfirmModal({
//       action: "delete",

//       title: "Delete product?",

//       message:
//         `Delete "${row.name}" (${row.productCode})?\n` +
//         "It will be removed from the active Product list. Historical transactions will remain.",

//       confirmText: "Delete Product",

//       onConfirm: async () => {
//         try {
//           await api.product.delete(row.productCode);

//           removeProduct(row);

//           toast.success(`${row.name} deleted successfully`);
//         } catch (error) {
//           await loadProducts();
//           throw error;
//         }
//       },
//     });
//   };

//   const executeBulkAction = async (rows, action) => {
//     const uniqueRows = Array.from(
//       new Map(rows.map((row) => [String(row._id), row])).values(),
//     );

//     let successCount = 0;
//     const failures = [];

//     for (let index = 0; index < uniqueRows.length; index += 1) {
//       const row = uniqueRows[index];

//       setBulkProgress(
//         `Processing ${index + 1} of ${uniqueRows.length} Products…`,
//       );

//       try {
//         if (action === "DELETE") {
//           await api.product.delete(row.productCode);

//           removeProduct(row);
//         } else {
//           const response = await api.product.update(row.productCode, {
//             status: action,
//           });

//           upsertProduct(getProductRecord(response));
//         }

//         successCount += 1;
//       } catch (error) {
//         failures.push({
//           productCode: row.productCode,

//           message: getErrorMessage(error),
//         });
//       }
//     }

//     if (successCount > 0) {
//       const label =
//         action === "DELETE"
//           ? "deleted"
//           : action === "ACTIVE"
//             ? "activated"
//             : "deactivated";

//       toast.success(
//         `${successCount} Product${successCount === 1 ? "" : "s"} ${label} successfully`,
//       );
//     }

//     if (failures.length > 0) {
//       toast.error(
//         `${failures.length} Product operation${failures.length === 1 ? "" : "s"} could not be confirmed. ${failures[0].productCode}: ${failures[0].message}`,
//         {
//           duration: 7000,
//         },
//       );
//     }

//     await loadProducts();
//   };

//   const confirmBulkAction = (rows, operation) => {
//     if (!rows?.length) {
//       return;
//     }

//     const count = rows.length;

//     const noun = count === 1 ? "product" : "products";

//     const configuration = {
//       DELETE: {
//         action: "delete",
//         label: "Delete",

//         message:
//           `Delete ${count} selected ${noun}?\n` +
//           "They will be removed from the active Product list. Historical transactions will remain.",
//       },

//       ACTIVE: {
//         action: "activate",
//         label: "Activate",

//         message:
//           `Activate ${count} selected ${noun}?\n` +
//           "They will be marked as active.",
//       },

//       INACTIVE: {
//         action: "deactivate",
//         label: "Deactivate",

//         message:
//           `Deactivate ${count} selected ${noun}?\n` +
//           "They will be marked as inactive. Existing transaction history will remain.",
//       },
//     }[operation];

//     if (!configuration) {
//       return;
//     }

//     openConfirmModal({
//       action: configuration.action,

//       title: `${configuration.label} selected ${noun}?`,

//       message: configuration.message,

//       confirmText: `${configuration.label} ${count} ${count === 1 ? "Product" : "Products"}`,

//       onConfirm: () => executeBulkAction(rows, operation),
//     });
//   };

//   const handleProductCsvUpload = (file) => {
//     if (mutationLockRef.current) {
//       return;
//     }

//     if (importUncertain) {
//       toast.error(
//         "Review the previous import outcome before starting another import.",
//       );

//       return;
//     }

//     const parseId = ++csvParseRef.current;

//     const seenHeaders = new Set();
//     let duplicateHeader = "";

//     setImportMessage("");

//     Papa.parse(file, {
//       header: true,
//       skipEmptyLines: "greedy",

//       transformHeader: (header) => {
//         const canonical = canonicalHeader(header);

//         if (seenHeaders.has(canonical)) {
//           duplicateHeader = canonical;
//         }

//         seenHeaders.add(canonical);

//         return canonical;
//       },

//       transform: (value) => (typeof value === "string" ? value.trim() : value),

//       complete: (result) => {
//         if (parseId !== csvParseRef.current) {
//           return;
//         }

//         if (duplicateHeader) {
//           toast.error(`Duplicate CSV header: ${duplicateHeader}`);

//           return;
//         }

//         if (result.errors?.length) {
//           toast.error(`Unable to parse CSV: ${result.errors[0].message}`);

//           return;
//         }

//         const rows = result.data || [];
//         const columns = result.meta.fields || [];

//         const missingHeaders = REQUIRED_CSV_HEADERS.filter(
//           (header) => !columns.includes(header),
//         );

//         if (missingHeaders.length) {
//           toast.error(
//             `Missing required CSV headers: ${missingHeaders.join(", ")}`,
//           );

//           return;
//         }

//         if (!rows.length) {
//           toast.error("The CSV file has no data rows");

//           return;
//         }

//         if (rows.length > CSV_MAX_ROWS) {
//           toast.error(
//             `Import supports a maximum of ${CSV_MAX_ROWS} Products per file`,
//           );

//           return;
//         }

//         const rowErrors = {};

//         rows.forEach((row, index) => {
//           const errors = validateImportRow(row);

//           if (errors.length) {
//             rowErrors[index] = errors;
//           }
//         });

//         setImportPreview({
//           file,
//           columns,
//           rows,
//           rowErrors,
//         });
//       },

//       error: (error) => {
//         if (parseId === csvParseRef.current) {
//           toast.error(`Unable to read CSV: ${error.message}`);
//         }
//       },
//     });
//   };

//   const closeImportPreview = () => {
//     if (importLoading) {
//       return;
//     }

//     setImportPreview(null);
//   };

//   const finishImport = async (result) => {
//     if (result.createdCount > 0) {
//       toast.success(
//         `${result.createdCount} Product${result.createdCount === 1 ? "" : "s"} imported successfully`,
//       );
//     }

//     const firstError = describeImportError(result.errors[0]);

//     if (result.failedCount > 0) {
//       const message =
//         `${result.failedCount} row${result.failedCount === 1 ? "" : "s"} failed.` +
//         (firstError ? ` ${firstError}` : "");

//       setImportMessage(message);

//       toast.error(message, {
//         duration: 7000,
//       });
//     } else if (result.createdCount === 0) {
//       setImportMessage("No Products were imported.");

//       toast.error("No Products were imported");
//     } else {
//       setImportMessage("");
//     }

//     setImportPreview(null);

//     await loadProducts();
//   };

//   const confirmProductImport = async () => {
//     if (!importPreview || mutationLockRef.current || importUncertain) {
//       return;
//     }

//     if (Object.keys(importPreview.rowErrors).length > 0) {
//       toast.error(
//         "Fix the highlighted CSV errors and upload the corrected file.",
//       );

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

//       const normalizedFile = new File([csv], importPreview.file.name, {
//         type: "text/csv",
//       });

//       const formData = new FormData();

//       formData.append("file", normalizedFile);

//       const response = await api.product.import(formData);

//       const result = getImportResult(response?.data);

//       if (!result) {
//         throw new Error("The server did not return a confirmed import result.");
//       }

//       await finishImport(result);
//     } catch (error) {
//       const status = error?.response?.status;

//       const reportedResult = getImportResult(error?.response?.data);

//       if (reportedResult && status && status < 500 && status !== 408) {
//         await finishImport(reportedResult);

//         return;
//       }

//       const uncertain = !status || status >= 500 || status === 408;

//       if (uncertain) {
//         setImportUncertain(true);
//         setImportPreview(null);

//         setImportMessage(
//           "The import outcome is uncertain. Some rows may already have been created. Check the Product list and server import results before importing again.",
//         );

//         toast.error("Import result uncertain. Do not resubmit the same file.", {
//           duration: 8000,
//         });

//         await loadProducts();
//       } else {
//         const message = getErrorMessage(error);

//         setImportMessage(message);
//         toast.error(message);
//       }
//     } finally {
//       mutationLockRef.current = false;
//       setImportLoading(false);
//     }
//   };

//   const productImportConfig = {
//     templateFileName: "products-import-template.csv",

//     columns: [
//       {
//         key: "name",
//         example: "Sample Product",
//       },
//       {
//         key: "type",
//         example: "GOODS",
//       },
//       {
//         key: "category",
//         example: "",
//       },
//       {
//         key: "brand",
//         example: "",
//       },
//       {
//         key: "description",
//         example: "",
//       },
//       {
//         key: "unit",
//         example: "PCS",
//       },
//       {
//         key: "hsnSacCode",
//         example: "",
//       },
//       {
//         key: "gstRate",
//         example: "18",
//       },
//       {
//         key: "salePrice",
//         example: "100",
//       },
//       {
//         key: "purchasePrice",
//         example: "80",
//       },
//       {
//         key: "trackInventory",
//         example: "true",
//       },
//       {
//         key: "openingStock",
//         example: "0",
//       },
//       {
//         key: "openingStockRate",
//         example: "0",
//       },
//       {
//         key: "reorderLevel",
//         example: "0",
//       },
//       {
//         key: "warehouseId",
//         example: "",
//       },
//       {
//         key: "status",
//         example: "ACTIVE",
//       },
//     ],

//     onUpload: handleProductCsvUpload,

//     onError: (message) => toast.error(message),
//   };

//   const busy = confirmLoading || importLoading;

//   return (
//     <div className="products-page">
//       {loadError && (
//         <div
//           className="products-list-notice products-list-notice--error"
//           role="alert"
//         >
//           <div className="products-list-notice__copy">
//             <strong>Unable to refresh Products</strong>

//             <p>{loadError}</p>

//             {products.length > 0 && (
//               <p>
//                 Previously loaded records are still displayed and may be out of
//                 date.
//               </p>
//             )}
//           </div>

//           <button
//             type="button"
//             className="products-list-notice__button"
//             disabled={loading || busy}
//             onClick={loadProducts}
//           >
//             Retry
//           </button>
//         </div>
//       )}

//       {importMessage && (
//         <div
//           className="products-list-notice"
//           role={importUncertain ? "alert" : "status"}
//         >
//           <div className="products-list-notice__copy">
//             <strong>
//               {importUncertain ? "Import needs review" : "Import result"}
//             </strong>

//             <p>{importMessage}</p>
//           </div>

//           <button
//             type="button"
//             className="products-list-notice__button"
//             disabled={loading || busy}
//             onClick={loadProducts}
//           >
//             Refresh Products
//           </button>
//         </div>
//       )}

//       {bulkProgress && (
//         <div
//           className="products-list-progress"
//           role="status"
//           aria-live="polite"
//         >
//           {bulkProgress}
//         </div>
//       )}

//       <DataList
//         title="Products"
//         subtitle="Manage goods, services, pricing and combined stock"
//         columns={columns}
//         data={products}
//         loading={loading}
//         rowKey="_id"
//         showCase="list"
//         searchable
//         filterable
//         sortable
//         selectable
//         columnVisibility
//         pagination
//         filters={filters}
//         quickFilters={quickFilters}
//         storageKey="trustiq-products"
//         searchPlaceholder="Search code, product, category, brand, HSN/SAC..."
//         actions={{
//           view: (row) => openProduct(row, "view"),

//           edit: (row) => openProduct(row, "edit"),

//           delete: handleDelete,
//         }}
//         bulkActions={[
//           {
//             key: "activate",
//             label: "Activate",

//             action: (rows) => confirmBulkAction(rows, "ACTIVE"),
//           },
//           {
//             key: "deactivate",
//             label: "Deactivate",

//             action: (rows) => confirmBulkAction(rows, "INACTIVE"),
//           },
//           {
//             key: "delete",
//             label: "Delete",
//             danger: true,

//             action: (rows) => confirmBulkAction(rows, "DELETE"),
//           },
//         ]}
//         onRefresh={loadProducts}
//         importConfig={productImportConfig}
//         addButton={
//           <button
//             type="button"
//             className="so-primary-button products-list-add"
//             disabled={busy}
//             onClick={() => setShowProductModal(true)}
//           >
//             <Plus size={16} />

//             <span>New Product</span>
//           </button>
//         }
//       />

//       <ProductModal
//         isOpen={showProductModal}
//         onClose={() => setShowProductModal(false)}
//         onSave={(createdProduct) => upsertProduct(createdProduct, true)}
//       />

//       <ProductDetailsModal
//         isOpen={Boolean(selectedProduct)}
//         product={selectedProduct}
//         mode={productModalMode}
//         onClose={() => setSelectedProduct(null)}
//         onUpdated={(updatedProduct) => upsertProduct(updatedProduct)}
//       />

//       <ConfirmModal
//         open={confirmState.open}
//         type={confirmState.type}
//         action={confirmState.action}
//         title={confirmState.title}
//         message={confirmState.message}
//         confirmText={confirmState.confirmText}
//         cancelText="Cancel"
//         loading={confirmLoading}
//         onCancel={closeConfirmModal}
//         onConfirm={handleConfirmAction}
//       />
//       <ImportPreviewModal
//         isOpen={Boolean(importPreview)}
//         fileName={importPreview?.file?.name}
//         columns={importPreview?.columns || []}
//         rows={importPreview?.rows || []}
//         rowErrors={importPreview?.rowErrors || {}}
//         loading={importLoading}
//         onCancel={closeImportPreview}
//         onConfirm={confirmProductImport}
//       />
//     </div>
//   );
// }

// export default ProductsList;

import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import Papa from "papaparse";

import DataList from "../../components/common/DataList/DataList";
import StatusField from "../../components/common/StatusField/StatusField";
import ConfirmModal from "../../components/common/ConfirmModal/ConfirmModal";
import ImportPreviewModal from "../../components/common/DataList/ImportPreviewModal";

import api from "../../services/api";

import ProductModal from "./ProductModal";
import ProductDetailsModal from "./ProductDetailsModal";

import "./products-list.css";

const INITIAL_CONFIRM_STATE = {
  open: false,
  type: "question",
  action: undefined,
  title: "",
  message: "",
  confirmText: "Confirm",
  onConfirm: null,
};

const CSV_MAX_ROWS = 500;

const REQUIRED_CSV_HEADERS = ["name", "type", "unit"];

const CSV_HEADER_ALIASES = {
  name: "name",
  type: "type",
  category: "category",
  brand: "brand",
  description: "description",
  unit: "unit",
  hsnsaccode: "hsnSacCode",
  hsnsac: "hsnSacCode",
  gstrate: "gstRate",
  saleprice: "salePrice",
  purchaseprice: "purchasePrice",
  trackinventory: "trackInventory",
  openingstock: "openingStock",
  openingstockrate: "openingStockRate",
  reorderlevel: "reorderLevel",
  warehouseid: "warehouseId",
  status: "status",
};

const NUMBER_RULES = [
  {
    key: "gstRate",
    label: "GST rate",
    maximum: 100,
  },
  {
    key: "salePrice",
    label: "Sale price",
    maximum: 1000000000,
    scale: 100,
  },
  {
    key: "purchasePrice",
    label: "Purchase price",
    maximum: 1000000000,
    scale: 100,
  },
  {
    key: "openingStock",
    label: "Opening stock",
    maximum: 1000000,
    scale: 1000,
  },
  {
    key: "openingStockRate",
    label: "Opening stock rate",
    maximum: 1000000000,
    scale: 100,
  },
  {
    key: "reorderLevel",
    label: "Reorder level",
    maximum: 1000000,
    scale: 1000,
  },
];

const quantityFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 3,
});

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
    "Something went wrong. Please try again."
  );
};

const getProductList = (response) => {
  const body = response?.data;

  if (Array.isArray(body?.data)) {
    return body.data;
  }

  if (Array.isArray(body?.products)) {
    return body.products;
  }

  if (Array.isArray(body)) {
    return body;
  }

  throw new Error("The server returned an invalid Product list.");
};

const getProductRecord = (response) => {
  const body = response?.data;

  const product = body?.data || body?.product || body;

  if (!product?._id || !product?.productCode) {
    throw new Error(
      "The server did not return a valid Product. Refresh the list before trying again."
    );
  }

  return product;
};

const tracksInventory = (product) =>
  product?.type === "GOODS" && product?.trackInventory === true;

const canonicalHeader = (header) => {
  const text = String(header ?? "")
    .replace(/^\uFEFF/, "")
    .trim();

  const lookup = text.replace(/[\s_-]+/g, "").toLowerCase();

  return CSV_HEADER_ALIASES[lookup] || text;
};

const isBlank = (value) =>
  value === undefined || value === null || String(value).trim() === "";

const parsePreviewBoolean = (value, fallback) => {
  if (isBlank(value)) {
    return fallback;
  }

  const text = String(value).trim().toLowerCase();

  if (["true", "yes", "1", "y"].includes(text)) {
    return true;
  }

  if (["false", "no", "0", "n"].includes(text)) {
    return false;
  }

  return null;
};

const validateImportRow = (row) => {
  const errors = [];

  const name = String(row.name ?? "").trim();
  const type = String(row.type ?? "").trim().toUpperCase();
  const unit = String(row.unit ?? "").trim().toUpperCase();
  const status = String(row.status || "ACTIVE").trim().toUpperCase();

  if (name.length < 2 || name.length > 200) {
    errors.push("Name must contain 2–200 characters");
  }

  if (!["GOODS", "SERVICE"].includes(type)) {
    errors.push("Type must be GOODS or SERVICE");
  }

  if (!/^[A-Z][A-Z0-9_]{0,19}$/.test(unit)) {
    errors.push("Unit must be a valid unit code");
  }

  if (!["ACTIVE", "INACTIVE"].includes(status)) {
    errors.push("Status must be ACTIVE or INACTIVE");
  }

  for (const [key, maximum] of [
    ["category", 100],
    ["brand", 100],
    ["description", 1000],
  ]) {
    if (String(row[key] ?? "").trim().length > maximum) {
      errors.push(`${key} cannot exceed ${maximum} characters`);
    }
  }

  const hsnSacCode = String(row.hsnSacCode ?? "")
    .trim()
    .toUpperCase();

  if (hsnSacCode && !/^[A-Z0-9]{2,20}$/.test(hsnSacCode)) {
    errors.push("HSN/SAC must contain 2–20 letters or numbers");
  }

  for (const rule of NUMBER_RULES) {
    if (isBlank(row[rule.key])) {
      continue;
    }

    const number = Number(row[rule.key]);

    if (!Number.isFinite(number) || number < 0 || number > rule.maximum) {
      errors.push(`${rule.label} must be between 0 and ${rule.maximum}`);
      continue;
    }

    if (rule.scale) {
      const scaled = number * rule.scale;
      const integer = Math.round(scaled);

      if (
        !Number.isSafeInteger(integer) ||
        Math.abs(scaled - integer) > 0.000001
      ) {
        errors.push(`${rule.label} has too many decimal places`);
      }
    }
  }

  const trackInventory = parsePreviewBoolean(
    row.trackInventory,
    type === "GOODS"
  );

  if (trackInventory === null) {
    errors.push("trackInventory must be true or false");
  }

  if (type === "SERVICE" && trackInventory === true) {
    errors.push("Services cannot track inventory");
  }

  const warehouseId = String(row.warehouseId ?? "").trim();

  if (warehouseId) {
    if (!/^[a-fA-F0-9]{24}$/.test(warehouseId)) {
      errors.push("warehouseId must be a valid ObjectId");
    }

    if (
      type !== "GOODS" ||
      trackInventory !== true ||
      !(Number(row.openingStock) > 0)
    ) {
      errors.push(
        "warehouseId requires inventory-tracked Goods with positive opening stock"
      );
    }
  }

  return errors;
};

const getImportResult = (body) => {
  if (
    !body ||
    !Number.isSafeInteger(body.createdCount) ||
    body.createdCount < 0 ||
    !Number.isSafeInteger(body.failedCount) ||
    body.failedCount < 0
  ) {
    return null;
  }

  return {
    createdCount: body.createdCount,
    failedCount: body.failedCount,
    errors: Array.isArray(body.errors) ? body.errors : [],
  };
};

const describeImportError = (error) => {
  if (!error) {
    return "";
  }

  if (typeof error === "string") {
    return error;
  }

  const message = error.message || error.msg || "Row could not be imported";

  return error.row != null ? `Row ${error.row}: ${message}` : message;
};

function ProductsList() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [products, setProducts] = useState([]);

  const [showProductModal, setShowProductModal] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productModalMode, setProductModalMode] = useState("view");

  const [confirmState, setConfirmState] = useState(INITIAL_CONFIRM_STATE);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [importPreview, setImportPreview] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importMessage, setImportMessage] = useState("");
  const [importUncertain, setImportUncertain] = useState(false);

  const [bulkProgress, setBulkProgress] = useState("");

  const loadRequestRef = useRef(0);
  const mutationLockRef = useRef(false);
  const csvParseRef = useRef(0);

  const loadProducts = useCallback(async () => {
    const requestId = ++loadRequestRef.current;

    setLoading(true);
    setLoadError("");

    try {
      const firstResponse = await api.product.getAll({
        page: 1,
        limit: 100,
      });

      const records = [...getProductList(firstResponse)];

      const totalPages = Number(
        firstResponse?.data?.pagination?.totalPages ?? 1
      );

      if (!Number.isSafeInteger(totalPages) || totalPages < 0) {
        throw new Error("The server returned invalid Product pagination.");
      }

      for (let page = 2; page <= totalPages; page += 1) {
        if (requestId !== loadRequestRef.current) {
          return;
        }

        const response = await api.product.getAll({
          page,
          limit: 100,
        });

        records.push(...getProductList(response));
      }

      if (requestId !== loadRequestRef.current) {
        return;
      }

      if (records.some((product) => !product?._id || !product?.productCode)) {
        throw new Error("One or more Product records are invalid.");
      }

      const uniqueRecords = Array.from(
        new Map(records.map((product) => [String(product._id), product])).values()
      );

      setProducts(uniqueRecords);

      setSelectedProduct((current) => {
        if (!current) {
          return null;
        }

        return (
          uniqueRecords.find((product) => product._id === current._id) || null
        );
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
  }, []);

  useEffect(() => {
    loadProducts();

    return () => {
      loadRequestRef.current += 1;
      csvParseRef.current += 1;
    };
  }, [loadProducts]);

  const upsertProduct = useCallback((record, prepend = false) => {
    setProducts((previous) => {
      const exists = previous.some((product) => product._id === record._id);

      if (!exists) {
        return prepend ? [record, ...previous] : [...previous, record];
      }

      return previous.map((product) =>
        product._id === record._id ? record : product
      );
    });

    setSelectedProduct((current) =>
      current?._id === record._id ? record : current
    );
  }, []);

  const removeProduct = useCallback((record) => {
    setProducts((previous) =>
      previous.filter((product) => product._id !== record._id)
    );

    setSelectedProduct((current) =>
      current?._id === record._id ? null : current
    );
  }, []);

  const openProduct = (row, mode) => {
    if (mutationLockRef.current) {
      return;
    }

    setSelectedProduct(row);
    setProductModalMode(mode);
  };

  const columns = useMemo(
    () => [
      {
        key: "productCode",
        label: "Code",
        sortable: true,
      },
      {
        key: "name",
        label: "Product",
        sortable: true,
        render: (value, row) => (
          <div className="dl-customer">
            <strong>{value || "—"}</strong>
            <span>{row.category || "Uncategorized"}</span>
          </div>
        ),
      },
      {
        key: "type",
        label: "Type",
        sortable: true,
        render: (value) => <StatusField value={value} />,
      },
      {
        key: "unit",
        label: "Unit",
        sortable: true,
      },
      {
        key: "salePrice",
        label: "Sale Price",
        type: "currency",
        sortable: true,
      },
      {
        key: "purchasePrice",
        label: "Cost",
        type: "currency",
        sortable: true,
      },
      {
        key: "currentStock",
        label: "Stock",
        type: "number",
        sortable: true,
        render: (value, row) => {
          if (!tracksInventory(row)) {
            return <span className="dl-muted-value">N/A</span>;
          }

          const quantity = Number(value);

          return Number.isFinite(quantity)
            ? quantityFormatter.format(quantity)
            : "—";
        },
      },
      {
        key: "reorderLevel",
        label: "Reorder",
        type: "number",
        sortable: true,
        render: (value, row) => {
          if (!tracksInventory(row)) {
            return <span className="dl-muted-value">N/A</span>;
          }

          const quantity = Number(value);

          return Number.isFinite(quantity)
            ? quantityFormatter.format(quantity)
            : "—";
        },
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (value) => <StatusField value={value} />,
      },
      {
        key: "brand",
        label: "Brand",
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
        key: "trackInventory",
        label: "Stock Tracked",
        sortable: true,
        visible: false,
        render: (_, row) => (tracksInventory(row) ? "Yes" : "No"),
      },
      {
        key: "hsnSacCode",
        label: "HSN / SAC",
        sortable: true,
        visible: false,
      },
      {
        key: "gstRate",
        label: "GST %",
        type: "number",
        sortable: true,
        visible: false,
      },
    ],
    []
  );

  const filters = useMemo(
    () => [
      {
        key: "type",
        label: "Type",
        type: "select",
        options: ["GOODS", "SERVICE"],
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: ["ACTIVE", "INACTIVE"],
      },
      {
        key: "trackInventory",
        label: "Stock Tracked",
        type: "select",
        options: [
          {
            label: "Yes",
            value: true,
          },
          {
            label: "No",
            value: false,
          },
        ],
      },
    ],
    []
  );

  const quickFilters = useMemo(
    () => [
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
      {
        key: "type",
        value: "GOODS",
        label: "Goods",
      },
      {
        key: "type",
        value: "SERVICE",
        label: "Services",
      },
    ],
    []
  );

  const openConfirmModal = (configuration) => {
    if (mutationLockRef.current) {
      return;
    }

    setConfirmState({
      ...INITIAL_CONFIRM_STATE,
      ...configuration,
      open: true,
    });
  };

  const closeConfirmModal = () => {
    if (confirmLoading || mutationLockRef.current) {
      return;
    }

    setConfirmState(INITIAL_CONFIRM_STATE);
  };

  const handleConfirmAction = async () => {
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
      setBulkProgress("");
    }
  };

  const handleDelete = (row) => {
    openConfirmModal({
      action: "delete",
      title: "Delete product?",
      message:
        `Delete "${row.name}" (${row.productCode})?\n` +
        "It will be removed from the active Product list. Historical transactions will remain.",
      confirmText: "Delete Product",
      onConfirm: async () => {
        try {
          await api.product.delete(row.productCode);

          removeProduct(row);

          toast.success(`${row.name} deleted successfully`);
        } catch (error) {
          await loadProducts();
          throw error;
        }
      },
    });
  };

  const executeBulkAction = async (rows, action) => {
    const uniqueRows = Array.from(
      new Map(rows.map((row) => [String(row._id), row])).values()
    );

    let successCount = 0;
    const failures = [];

    for (let index = 0; index < uniqueRows.length; index += 1) {
      const row = uniqueRows[index];

      setBulkProgress(
        `Processing ${index + 1} of ${uniqueRows.length} Products…`
      );

      try {
        if (action === "DELETE") {
          await api.product.delete(row.productCode);

          removeProduct(row);
        } else {
          const response = await api.product.update(row.productCode, {
            status: action,
          });

          upsertProduct(getProductRecord(response));
        }

        successCount += 1;
      } catch (error) {
        failures.push({
          productCode: row.productCode,
          message: getErrorMessage(error),
        });
      }
    }

    if (successCount > 0) {
      const label =
        action === "DELETE"
          ? "deleted"
          : action === "ACTIVE"
          ? "activated"
          : "deactivated";

      toast.success(
        `${successCount} Product${
          successCount === 1 ? "" : "s"
        } ${label} successfully`
      );
    }

    if (failures.length > 0) {
      toast.error(
        `${failures.length} Product operation${
          failures.length === 1 ? "" : "s"
        } could not be confirmed. ${failures[0].productCode}: ${
          failures[0].message
        }`,
        {
          duration: 7000,
        }
      );
    }

    await loadProducts();
  };

  const confirmBulkAction = (rows, operation) => {
    if (!rows?.length) {
      return;
    }

    const count = rows.length;
    const noun = count === 1 ? "product" : "products";

    const configuration = {
      DELETE: {
        action: "delete",
        label: "Delete",
        message:
          `Delete ${count} selected ${noun}?\n` +
          "They will be removed from the active Product list. Historical transactions will remain.",
      },
      ACTIVE: {
        action: "activate",
        label: "Activate",
        message: `Activate ${count} selected ${noun}?\nThey will be marked as active.`,
      },
      INACTIVE: {
        action: "deactivate",
        label: "Deactivate",
        message:
          `Deactivate ${count} selected ${noun}?\n` +
          "They will be marked as inactive. Existing transaction history will remain.",
      },
    }[operation];

    if (!configuration) {
      return;
    }

    openConfirmModal({
      action: configuration.action,
      title: `${configuration.label} selected ${noun}?`,
      message: configuration.message,
      confirmText: `${configuration.label} ${count} ${
        count === 1 ? "Product" : "Products"
      }`,
      onConfirm: () => executeBulkAction(rows, operation),
    });
  };

  const handleProductCsvUpload = (file) => {
    if (mutationLockRef.current) {
      return;
    }

    if (importUncertain) {
      toast.error(
        "Review the previous import outcome before starting another import."
      );

      return;
    }

    const parseId = ++csvParseRef.current;

    const seenHeaders = new Set();
    let duplicateHeader = "";

    setImportMessage("");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: "greedy",

      transformHeader: (header) => {
        const canonical = canonicalHeader(header);

        if (seenHeaders.has(canonical)) {
          duplicateHeader = canonical;
        }

        seenHeaders.add(canonical);

        return canonical;
      },

      transform: (value) => (typeof value === "string" ? value.trim() : value),

      complete: (result) => {
        if (parseId !== csvParseRef.current) {
          return;
        }

        if (duplicateHeader) {
          toast.error(`Duplicate CSV header: ${duplicateHeader}`);
          return;
        }

        if (result.errors?.length) {
          toast.error(`Unable to parse CSV: ${result.errors[0].message}`);
          return;
        }

        const rows = result.data || [];
        const columns = result.meta.fields || [];

        const missingHeaders = REQUIRED_CSV_HEADERS.filter(
          (header) => !columns.includes(header)
        );

        if (missingHeaders.length) {
          toast.error(
            `Missing required CSV headers: ${missingHeaders.join(", ")}`
          );

          return;
        }

        if (!rows.length) {
          toast.error("The CSV file has no data rows");
          return;
        }

        if (rows.length > CSV_MAX_ROWS) {
          toast.error(
            `Import supports a maximum of ${CSV_MAX_ROWS} Products per file`
          );

          return;
        }

        const rowErrors = {};

        rows.forEach((row, index) => {
          const errors = validateImportRow(row);

          if (errors.length) {
            rowErrors[index] = errors;
          }
        });

        setImportPreview({
          file,
          columns,
          rows,
          rowErrors,
        });
      },

      error: (error) => {
        if (parseId === csvParseRef.current) {
          toast.error(`Unable to read CSV: ${error.message}`);
        }
      },
    });
  };

  const closeImportPreview = () => {
    if (importLoading) {
      return;
    }

    setImportPreview(null);
  };

  const finishImport = async (result) => {
    if (result.createdCount > 0) {
      toast.success(
        `${result.createdCount} Product${
          result.createdCount === 1 ? "" : "s"
        } imported successfully`
      );
    }

    const firstError = describeImportError(result.errors[0]);

    if (result.failedCount > 0) {
      const message =
        `${result.failedCount} row${
          result.failedCount === 1 ? "" : "s"
        } failed.` + (firstError ? ` ${firstError}` : "");

      setImportMessage(message);

      toast.error(message, {
        duration: 7000,
      });
    } else if (result.createdCount === 0) {
      setImportMessage("No Products were imported.");

      toast.error("No Products were imported");
    } else {
      setImportMessage("");
    }

    setImportPreview(null);

    await loadProducts();
  };

  const confirmProductImport = async () => {
    if (!importPreview || mutationLockRef.current || importUncertain) {
      return;
    }

    if (Object.keys(importPreview.rowErrors).length > 0) {
      toast.error(
        "Fix the highlighted CSV errors and upload the corrected file."
      );

      return;
    }

    mutationLockRef.current = true;
    setImportLoading(true);

    try {
      // Send parsed CSV rows as JSON, matching the working supplier import flow.
      const response = await api.product.import({
        rows: importPreview.rows,
      });

      const result = getImportResult(response?.data);

      if (!result) {
        throw new Error("The server did not return a confirmed import result.");
      }

      await finishImport(result);
    } catch (error) {
      const status = error?.response?.status;

      const reportedResult = getImportResult(error?.response?.data);

      if (reportedResult && status && status < 500 && status !== 408) {
        await finishImport(reportedResult);

        return;
      }

      const uncertain = !status || status >= 500 || status === 408;

      if (uncertain) {
        setImportUncertain(true);
        setImportPreview(null);

        setImportMessage(
          "The import outcome is uncertain. Some rows may already have been created. Check the Product list and server import results before importing again."
        );

        toast.error("Import result uncertain. Do not resubmit the same file.", {
          duration: 8000,
        });

        await loadProducts();
      } else {
        const message = getErrorMessage(error);

        setImportMessage(message);
        toast.error(message);
      }
    } finally {
      mutationLockRef.current = false;
      setImportLoading(false);
    }
  };

  const productImportConfig = {
    templateFileName: "products-import-template.csv",

    columns: [
      {
        key: "name",
        example: "Sample Product",
      },
      {
        key: "type",
        example: "GOODS",
      },
      {
        key: "category",
        example: "",
      },
      {
        key: "brand",
        example: "",
      },
      {
        key: "description",
        example: "",
      },
      {
        key: "unit",
        example: "PCS",
      },
      {
        key: "hsnSacCode",
        example: "",
      },
      {
        key: "gstRate",
        example: "18",
      },
      {
        key: "salePrice",
        example: "100",
      },
      {
        key: "purchasePrice",
        example: "80",
      },
      {
        key: "trackInventory",
        example: "true",
      },
      {
        key: "openingStock",
        example: "0",
      },
      {
        key: "openingStockRate",
        example: "0",
      },
      {
        key: "reorderLevel",
        example: "0",
      },
      {
        key: "warehouseId",
        example: "",
      },
      {
        key: "status",
        example: "ACTIVE",
      },
    ],

    onUpload: handleProductCsvUpload,
    onError: (message) => toast.error(message),
  };

  const busy = confirmLoading || importLoading;

  return (
    <div className="products-page">
      {loadError && (
        <div
          className="products-list-notice products-list-notice--error"
          role="alert"
        >
          <div className="products-list-notice__copy">
            <strong>Unable to refresh Products</strong>

            <p>{loadError}</p>

            {products.length > 0 && (
              <p>
                Previously loaded records are still displayed and may be out of
                date.
              </p>
            )}
          </div>

          <button
            type="button"
            className="products-list-notice__button"
            disabled={loading || busy}
            onClick={loadProducts}
          >
            Retry
          </button>
        </div>
      )}

      {importMessage && (
        <div
          className="products-list-notice"
          role={importUncertain ? "alert" : "status"}
        >
          <div className="products-list-notice__copy">
            <strong>
              {importUncertain ? "Import needs review" : "Import result"}
            </strong>

            <p>{importMessage}</p>
          </div>

          <button
            type="button"
            className="products-list-notice__button"
            disabled={loading || busy}
            onClick={loadProducts}
          >
            Refresh Products
          </button>
        </div>
      )}

      {bulkProgress && (
        <div className="products-list-progress" role="status" aria-live="polite">
          {bulkProgress}
        </div>
      )}

      <DataList
        title="Products"
        subtitle="Manage goods, services, pricing and combined stock"
        columns={columns}
        data={products}
        loading={loading}
        rowKey="_id"
        showCase="list"
        searchable
        filterable
        sortable
        selectable
        columnVisibility
        pagination
        filters={filters}
        quickFilters={quickFilters}
        storageKey="trustiq-products"
        searchPlaceholder="Search code, product, category, brand, HSN/SAC..."
        actions={{
          view: (row) => openProduct(row, "view"),
          edit: (row) => openProduct(row, "edit"),
          delete: handleDelete,
        }}
        bulkActions={[
          {
            key: "activate",
            label: "Activate",
            action: (rows) => confirmBulkAction(rows, "ACTIVE"),
          },
          {
            key: "deactivate",
            label: "Deactivate",
            action: (rows) => confirmBulkAction(rows, "INACTIVE"),
          },
          {
            key: "delete",
            label: "Delete",
            danger: true,
            action: (rows) => confirmBulkAction(rows, "DELETE"),
          },
        ]}
        onRefresh={loadProducts}
        importConfig={productImportConfig}
        addButton={
          <button
            type="button"
            className="so-primary-button products-list-add"
            disabled={busy}
            onClick={() => setShowProductModal(true)}
          >
            <Plus size={16} />

            <span>New Product</span>
          </button>
        }
      />

      <ProductModal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        onSave={(createdProduct) => upsertProduct(createdProduct, true)}
      />

      <ProductDetailsModal
        isOpen={Boolean(selectedProduct)}
        product={selectedProduct}
        mode={productModalMode}
        onClose={() => setSelectedProduct(null)}
        onUpdated={(updatedProduct) => upsertProduct(updatedProduct)}
      />

      <ConfirmModal
        open={confirmState.open}
        type={confirmState.type}
        action={confirmState.action}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText="Cancel"
        loading={confirmLoading}
        onCancel={closeConfirmModal}
        onConfirm={handleConfirmAction}
      />

      <ImportPreviewModal
        isOpen={Boolean(importPreview)}
        fileName={importPreview?.file?.name}
        columns={importPreview?.columns || []}
        rows={importPreview?.rows || []}
        rowErrors={importPreview?.rowErrors || {}}
        loading={importLoading}
        onCancel={closeImportPreview}
        onConfirm={confirmProductImport}
      />
    </div>
  );
}

export default ProductsList;