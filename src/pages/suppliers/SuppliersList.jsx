// import { Plus } from "lucide-react";
// import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import toast from "react-hot-toast";

// import DataList from "../../components/common/DataList/DataList";
// import StatusField from "../../components/common/StatusField/StatusField";
// import ConfirmModal from "../../components/common/ConfirmModal/ConfirmModal";
// import ImportPreviewModal from "../../components/common/DataList/ImportPreviewModal";
// import { saveCsvFile } from "../../components/common/DataList/fileDownload";
// import SupplierRegistration from "./SupplierRegistration";
// import useCsvImport from "../../hooks/useCsvImport";
// import api from "../../services/api";

// const INITIAL_CONFIRM_STATE = {
//   open: false,
//   type: "danger",
//   title: "",
//   message: "",
//   confirmText: "Delete",
//   onConfirm: null,
// };

// const EMPTY_STATS = {
//   all: 0,
//   active: 0,
//   inactive: 0,
//   business: 0,
//   individual: 0,
// };

// const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
// const EXPORT_BATCH = 100;

// const STATE_OPTIONS = [
//   "Andhra Pradesh",
//   "Delhi",
//   "Goa",
//   "Gujarat",
//   "Karnataka",
//   "Kerala",
//   "Maharashtra",
//   "Tamil Nadu",
//   "Telangana",
// ];

// const getErrorMessage = (error) => {
//   const responseData = error?.response?.data;

//   if (typeof responseData?.message === "string") return responseData.message;
//   if (typeof responseData?.error === "string") return responseData.error;

//   if (Array.isArray(responseData?.errors) && responseData.errors.length > 0) {
//     return responseData.errors
//       .map((item) =>
//         typeof item === "string"
//           ? item
//           : item?.message || item?.msg || String(item),
//       )
//       .join(", ");
//   }

//   return error?.message || "Something went wrong. Please try again.";
// };

// const getSupplierList = (response) => {
//   if (Array.isArray(response?.data?.data?.suppliers))
//     return response.data.data.suppliers;
//   if (Array.isArray(response?.data?.suppliers)) return response.data.suppliers;
//   if (Array.isArray(response?.data?.data)) return response.data.data;
//   if (Array.isArray(response?.data)) return response.data;
//   return [];
// };

// const getTotal = (response, fallback) => {
//   const p = response?.data?.pagination;
//   return Number(p?.total ?? p?.totalRecords ?? p?.totalItems ?? fallback) || 0;
// };

// const getSingleSupplier = (response) =>
//   response?.data?.supplier || response?.data?.data || response?.data || null;

// const renderOptionalText = (value) =>
//   value || <span className="dl-muted-value">N/A</span>;

// const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

// const validateSupplierRow = (row) => {
//   const errors = [];
//   const isNum = (v) => v === "" || v == null || !Number.isNaN(Number(v));
//   const upper = (v) => String(v || "").toUpperCase();

//   if (!row.supplierName || row.supplierName.trim().length < 2)
//     errors.push("supplierName is required (min 2 characters)");

//   if (
//     row.supplierType &&
//     !["BUSINESS", "INDIVIDUAL"].includes(upper(row.supplierType))
//   )
//     errors.push("supplierType must be Business or Individual");

//   if (row.status && !["ACTIVE", "INACTIVE"].includes(upper(row.status)))
//     errors.push("status must be Active or Inactive");

//   if (
//     row.openingBalanceType &&
//     !["DEBIT", "CREDIT"].includes(upper(row.openingBalanceType))
//   )
//     errors.push("openingBalanceType must be DEBIT or CREDIT");

//   if (
//     row.gstNo &&
//     !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(upper(row.gstNo))
//   )
//     errors.push("invalid gstNo");

//   if (row.pincode && !/^[0-9]{6}$/.test(row.pincode))
//     errors.push("pincode must be 6 digits");

//   ["creditLimit", "creditDays", "openingBalance"].forEach((key) => {
//     if (!isNum(row[key])) errors.push(`${key} must be a number`);
//   });

//   return errors;
// };

// function SuppliersList() {
//   const [loading, setLoading] = useState(true);
//   const [suppliers, setSuppliers] = useState([]);
//   const [total, setTotal] = useState(0);
//   const [stats, setStats] = useState(EMPTY_STATS);

//   // Server-side query state
//   const [page, setPage] = useState(1);
//   const [pageSize, setPageSize] = useState(20);
//   const [search, setSearch] = useState("");
//   const [sort, setSort] = useState({ key: "", direction: "" });
//   const [filters, setFilters] = useState({});

//   const [showSupplierModal, setShowSupplierModal] = useState(false);
//   // null => create mode, object => edit mode
//   const [editingSupplier, setEditingSupplier] = useState(null);
//   const editLoadingRef = useRef(false);

//   const [confirmState, setConfirmState] = useState(INITIAL_CONFIRM_STATE);
//   const [confirmLoading, setConfirmLoading] = useState(false);

//   const requestIdRef = useRef(0);

//   /* ---------------------------------------------------------------- */
//   /* Data loading                                                      */
//   /* ---------------------------------------------------------------- */

//   const buildParams = useCallback(
//     (extra = {}) => {
//       const params = { ...extra };

//       if (search.trim()) params.search = search.trim();

//       if (sort.key && sort.direction) {
//         params.sortBy = sort.key;
//         params.sortOrder = sort.direction;
//       }

//       Object.entries(filters).forEach(([key, value]) => {
//         if (value) params[key] = value;
//       });

//       return params;
//     },
//     [search, sort, filters],
//   );

//   const loadSuppliers = useCallback(async () => {
//     const requestId = ++requestIdRef.current;

//     try {
//       setLoading(true);

//       const response = await api.suppliers.getAll(
//         buildParams({ page, limit: pageSize }),
//       );

//       // Ignore stale responses (user typed / paged quickly)
//       if (requestId !== requestIdRef.current) return;

//       const list = getSupplierList(response);

//       setSuppliers(list);
//       setTotal(getTotal(response, list.length));
//     } catch (error) {
//       if (requestId !== requestIdRef.current) return;

//       console.error("Unable to load suppliers:", error);
//       toast.error(getErrorMessage(error));
//       setSuppliers([]);
//       setTotal(0);
//     } finally {
//       if (requestId === requestIdRef.current) {
//         setLoading(false);
//       }
//     }
//   }, [buildParams, page, pageSize]);

//   const loadStats = useCallback(async () => {
//     try {
//       const response = await api.suppliers.getStats();
//       const data = response?.data?.data || response?.data?.stats;

//       if (data && typeof data.all === "number") {
//         setStats({ ...EMPTY_STATS, ...data });
//         return;
//       }

//       throw new Error("Unexpected stats response");
//     } catch (statsError) {
//       // Fallback: ask the list endpoint for 1 row and read pagination.total
//       console.warn("Stats endpoint unavailable, using fallback:", statsError);

//       try {
//         const count = async (extra = {}) => {
//           const res = await api.suppliers.getAll({
//             page: 1,
//             limit: 1,
//             ...extra,
//           });
//           return getTotal(res, 0);
//         };

//         const [all, active, inactive, business, individual] =
//           await Promise.all([
//             count(),
//             count({ status: "Active" }),
//             count({ status: "Inactive" }),
//             count({ supplierType: "Business" }),
//             count({ supplierType: "Individual" }),
//           ]);

//         setStats({ all, active, inactive, business, individual });
//       } catch (fallbackError) {
//         console.error("Unable to load supplier counts:", fallbackError);
//       }
//     }
//   }, []);

//   useEffect(() => {
//     loadSuppliers();
//   }, [loadSuppliers]);

//   useEffect(() => {
//     loadStats();
//   }, [loadStats]);

//   const refreshAll = useCallback(() => {
//     loadSuppliers();
//     loadStats();
//   }, [loadSuppliers, loadStats]);

//   /* ---------------------------------------------------------------- */
//   /* Stable callbacks for DataList (server mode)                       */
//   /* ---------------------------------------------------------------- */

//   const handleSearch = useCallback((value) => setSearch(value), []);

//   const handleSort = useCallback((next) => {
//     setSort(next);
//     setPage(1);
//   }, []);

//   const handleFilterChange = useCallback((next) => setFilters(next), []);

//   const handlePageChange = useCallback((nextPage) => setPage(nextPage), []);

//   const handlePageSizeChange = useCallback((size) => {
//     setPageSize(size);
//     setPage(1);
//   }, []);

//   /* ---------------------------------------------------------------- */
//   /* Import                                                            */
//   /* ---------------------------------------------------------------- */

//   const csvImport = useCsvImport({
//     entityName: "supplier",
//     validateRow: validateSupplierRow,
//     upload: (payload) => api.suppliers.import(payload),
//     onDone: refreshAll,
//   });

//   const supplierImportConfig = {
//     templateFileName: "suppliers-import-template.csv",

//     columns: [
//       { key: "supplierName", example: "Sri Lakshmi Traders" },
//       { key: "supplierType", example: "Business" },
//       { key: "contactPerson", example: "Ravi Kumar" },
//       { key: "phone", example: "9876543210" },
//       { key: "email", example: "ravi@example.com" },
//       { key: "gstNo", example: "29ABCDE1234F1Z5" },
//       { key: "city", example: "Bengaluru" },
//       { key: "state", example: "Karnataka" },
//       { key: "pincode", example: "560001" },
//       { key: "paymentTerms", example: "Net 30" },
//       { key: "creditLimit", example: "100000" },
//       { key: "creditDays", example: "30" },
//       { key: "openingBalance", example: "0" },
//       { key: "openingBalanceType", example: "CREDIT" },
//       { key: "status", example: "Active" },
//     ],

//     onUpload: csvImport.handleFile,
//     onError: (message) => toast.error(message),
//   };

//   /* ---------------------------------------------------------------- */
//   /* Export (all rows matching current search + filters)               */
//   /* ---------------------------------------------------------------- */

//   const handleExport = useCallback(async () => {
//     const toastId = toast.loading("Preparing export...");

//     try {
//       const first = await api.suppliers.getAll(
//         buildParams({ page: 1, limit: EXPORT_BATCH }),
//       );

//       const rows = [...getSupplierList(first)];
//       const totalPages = Math.max(
//         1,
//         Number(first?.data?.pagination?.totalPages) || 1,
//       );

//       const remaining = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);

//       for (let i = 0; i < remaining.length; i += 5) {
//         const responses = await Promise.all(
//           remaining
//             .slice(i, i + 5)
//             .map((p) =>
//               api.suppliers.getAll(buildParams({ page: p, limit: EXPORT_BATCH })),
//             ),
//         );

//         responses.forEach((response) => rows.push(...getSupplierList(response)));
//       }

//       const exportColumns = [
//         ["supplierCode", "Code"],
//         ["supplierName", "Supplier"],
//         ["supplierType", "Supplier Type"],
//         ["contactPerson", "Contact Person"],
//         ["phone", "Phone"],
//         ["alternatePhone", "Alternate Phone"],
//         ["email", "Email"],
//         ["gstNo", "GST Number"],
//         ["panNo", "PAN Number"],
//         ["billingAddress", "Billing Address"],
//         ["shippingAddress", "Shipping Address"],
//         ["city", "City"],
//         ["state", "State"],
//         ["pincode", "Pincode"],
//         ["country", "Country"],
//         ["paymentTerms", "Payment Terms"],
//         ["creditLimit", "Credit Limit"],
//         ["creditDays", "Credit Days"],
//         ["openingBalance", "Opening Balance"],
//         ["openingBalanceType", "Opening Balance Type"],
//         ["payableBalance", "Payable Balance"],
//         ["status", "Status"],
//       ];

//       const csv = [
//         exportColumns.map(([, label]) => escapeCsv(label)).join(","),
//         ...rows.map((row) =>
//           exportColumns.map(([key]) => escapeCsv(row[key])).join(","),
//         ),
//       ].join("\n");

//       await saveCsvFile("suppliers-export.csv", csv);

//       toast.success(`Exported ${rows.length} suppliers`, { id: toastId });
//     } catch (error) {
//       console.error("Supplier export failed:", error);
//       toast.error(getErrorMessage(error), { id: toastId });
//     }
//   }, [buildParams]);

//   /* ---------------------------------------------------------------- */
//   /* Table configuration                                               */
//   /* ---------------------------------------------------------------- */

//   const columns = useMemo(
//     () => [
//       { key: "supplierCode", label: "Code", sortable: true },
//       {
//         key: "supplierName",
//         label: "Supplier",
//         sortable: true,
//         render: (value, row) => (
//           <div className="dl-customer">
//             <strong>{value}</strong>
//             <span>{row.supplierType || "Business"}</span>
//           </div>
//         ),
//       },
//       {
//         key: "contactPerson",
//         label: "Contact Person",
//         sortable: true,
//         render: renderOptionalText,
//       },
//       {
//         key: "phone",
//         label: "Phone",
//         sortable: true,
//         render: renderOptionalText,
//       },
//       {
//         key: "email",
//         label: "Email",
//         sortable: true,
//         render: renderOptionalText,
//       },
//       {
//         key: "gstNo",
//         label: "GST Number",
//         sortable: true,
//         render: renderOptionalText,
//       },
//       {
//         key: "city",
//         label: "City",
//         sortable: true,
//         render: renderOptionalText,
//       },
//       {
//         key: "state",
//         label: "State",
//         sortable: true,
//         render: renderOptionalText,
//       },
//       { key: "paymentTerms", label: "Payment Terms", sortable: true },
//       {
//         key: "creditLimit",
//         label: "Credit Limit",
//         type: "currency",
//         sortable: true,
//       },
//       {
//         key: "creditDays",
//         label: "Credit Days",
//         type: "number",
//         sortable: true,
//       },
//       {
//         key: "payableBalance",
//         label: "Payable Balance",
//         type: "currency",
//         sortable: true,
//       },
//       {
//         key: "status",
//         label: "Status",
//         sortable: true,
//         render: (value) => <StatusField value={value} />,
//       },
//     ],
//     [],
//   );

//   const tableFilters = useMemo(
//     () => [
//       {
//         key: "supplierType",
//         label: "Supplier Type",
//         type: "select",
//         options: ["Business", "Individual"],
//       },
//       {
//         key: "status",
//         label: "Status",
//         type: "select",
//         options: ["Active", "Inactive"],
//       },
//       {
//         // select (not free text) so a request is not sent on every keystroke
//         key: "state",
//         label: "State",
//         type: "select",
//         options: STATE_OPTIONS,
//       },
//     ],
//     [],
//   );

//   // Counts come from /suppliers/stats, not from the current page
//   const quickFilters = useMemo(
//     () => [
//       { key: "status", value: "", label: "All", count: stats.all },
//       { key: "status", value: "Active", label: "Active", count: stats.active },
//       {
//         key: "status",
//         value: "Inactive",
//         label: "Inactive",
//         count: stats.inactive,
//       },
//       {
//         key: "supplierType",
//         value: "Business",
//         label: "Business",
//         count: stats.business,
//       },
//       {
//         key: "supplierType",
//         value: "Individual",
//         label: "Individual",
//         count: stats.individual,
//       },
//     ],
//     [stats],
//   );

//   /* ---------------------------------------------------------------- */
//   /* Confirm modal                                                     */
//   /* ---------------------------------------------------------------- */

//   const closeConfirmModal = () => {
//     if (confirmLoading) return;
//     setConfirmState(INITIAL_CONFIRM_STATE);
//   };

//   const openConfirmModal = ({
//     type = "danger",
//     title = "Are you sure?",
//     message = "",
//     confirmText = "Confirm",
//     onConfirm,
//   }) => {
//     setConfirmState({ open: true, type, title, message, confirmText, onConfirm });
//   };

//   const handleConfirmAction = async () => {
//     if (confirmLoading || typeof confirmState.onConfirm !== "function") {
//       return;
//     }

//     try {
//       setConfirmLoading(true);
//       await confirmState.onConfirm();
//       setConfirmState(INITIAL_CONFIRM_STATE);
//     } catch (error) {
//       // The action shows its own toast. Keep the dialog open to retry.
//       console.error("Supplier confirmation action failed:", error);
//     } finally {
//       setConfirmLoading(false);
//     }
//   };

//   /* ---------------------------------------------------------------- */
//   /* Create / Edit modal                                               */
//   /* ---------------------------------------------------------------- */

//   const handleOpenCreate = () => {
//     setEditingSupplier(null);
//     setShowSupplierModal(true);
//   };

//   const handleEdit = async (row) => {
//     if (!row?.supplierCode || editLoadingRef.current) {
//       return;
//     }

//     editLoadingRef.current = true;

//     const toastId = toast.loading("Loading supplier...");

//     try {
//       // The list omits some fields (e.g. notes), so fetch the full record
//       const response = await api.suppliers.getByCode(row.supplierCode);
//       const fullSupplier = getSingleSupplier(response);

//       if (!fullSupplier?._id) {
//         throw new Error("Supplier details could not be loaded");
//       }

//       toast.dismiss(toastId);

//       setEditingSupplier(fullSupplier);
//       setShowSupplierModal(true);
//     } catch (error) {
//       console.error("Unable to load supplier for editing:", error);
//       toast.error(getErrorMessage(error), { id: toastId });
//     } finally {
//       editLoadingRef.current = false;
//     }
//   };

//   const handleCloseSupplierModal = () => {
//     setShowSupplierModal(false);
//     setEditingSupplier(null);
//   };

//   // Called after a successful create OR update. The page only holds one
//   // slice of the data, so re-query instead of patching local state.
//   const handleSupplierSaved = () => {
//     refreshAll();
//   };

//   /* ---------------------------------------------------------------- */
//   /* Delete + bulk actions                                             */
//   /* ---------------------------------------------------------------- */

//   const handleDelete = (row) => {
//     openConfirmModal({
//       type: "danger",
//       title: "Delete supplier?",
//       message: `Are you sure you want to delete "${row.supplierName}" (${row.supplierCode})? The supplier will be marked as deleted and its linked ledger will be deactivated.`,
//       confirmText: "Delete Supplier",

//       onConfirm: async () => {
//         try {
//           await api.suppliers.delete(row.supplierCode);
//           toast.success(`${row.supplierName} deleted successfully`);
//           refreshAll();
//         } catch (error) {
//           console.error("Unable to delete supplier:", error);
//           toast.error(getErrorMessage(error));
//           throw error;
//         }
//       },
//     });
//   };

//   const handleBulkStatusUpdate = async (rows, status) => {
//     if (!rows.length) return;

//     try {
//       const results = await Promise.allSettled(
//         rows.map((row) => api.suppliers.update(row.supplierCode, { status })),
//       );

//       const successCount = results.filter((r) => r.status === "fulfilled").length;
//       const failures = results.filter((r) => r.status === "rejected");

//       if (successCount) {
//         toast.success(
//           `${successCount} supplier${successCount > 1 ? "s" : ""} ${
//             status === "Active" ? "activated" : "deactivated"
//           } successfully`,
//         );
//       }

//       if (failures.length) {
//         toast.error(
//           `${failures.length} update${
//             failures.length > 1 ? "s" : ""
//           } failed: ${getErrorMessage(failures[0].reason)}`,
//         );
//       }
//     } catch (error) {
//       toast.error(getErrorMessage(error));
//     } finally {
//       refreshAll();
//     }
//   };

//   const handleBulkDelete = (rows) => {
//     if (!rows.length) return;

//     openConfirmModal({
//       type: "danger",
//       title: "Delete selected suppliers?",
//       message: `Delete ${rows.length} selected supplier${
//         rows.length > 1 ? "s" : ""
//       }? These suppliers will be marked as deleted and their linked ledgers will be deactivated.`,
//       confirmText: `Delete ${rows.length} Supplier${rows.length > 1 ? "s" : ""}`,

//       onConfirm: async () => {
//         const results = await Promise.allSettled(
//           rows.map((row) => api.suppliers.delete(row.supplierCode)),
//         );

//         const successCount = results.filter((r) => r.status === "fulfilled").length;
//         const failures = results.filter((r) => r.status === "rejected");

//         if (successCount) {
//           toast.success(
//             `${successCount} supplier${
//               successCount > 1 ? "s" : ""
//             } deleted successfully`,
//           );
//         }

//         if (failures.length) {
//           toast.error(
//             `${failures.length} deletion${
//               failures.length > 1 ? "s" : ""
//             } failed: ${getErrorMessage(failures[0].reason)}`,
//           );
//         }

//         refreshAll();
//       },
//     });
//   };

//   return (
//     <>
//       <DataList
//         title="Suppliers"
//         subtitle="Manage suppliers and payable accounts"
//         columns={columns}
//         data={suppliers}
//         loading={loading}
//         rowKey="_id"
//         showCase="list"
//         searchable
//         filterable
//         sortable
//         selectable
//         columnVisibility
//         pagination
//         filters={tableFilters}
//         quickFilters={quickFilters}
//         storageKey="trustiq-suppliers"
//         searchPlaceholder="Search code, supplier, contact, phone, email, GST, city..."
//         /* server-side mode */
//         serverMode
//         total={total}
//         page={page}
//         pageSize={pageSize}
//         pageSizeOptions={PAGE_SIZE_OPTIONS}
//         onPageChange={handlePageChange}
//         onPageSizeChange={handlePageSizeChange}
//         onSearch={handleSearch}
//         onSort={handleSort}
//         onFilterChange={handleFilterChange}
//         onExport={handleExport}
//         onRefresh={refreshAll}
//         importConfig={supplierImportConfig}
//         actions={{
//           edit: handleEdit,
//           delete: handleDelete,
//         }}
//         bulkActions={[
//           {
//             key: "activate",
//             label: "Activate",
//             action: (rows) => handleBulkStatusUpdate(rows, "Active"),
//           },
//           {
//             key: "deactivate",
//             label: "Deactivate",
//             action: (rows) => handleBulkStatusUpdate(rows, "Inactive"),
//           },
//           {
//             key: "delete",
//             label: "Delete",
//             danger: true,
//             action: handleBulkDelete,
//           },
//         ]}
//         addButton={
//           <button
//             type="button"
//             className="so-primary-button"
//             onClick={handleOpenCreate}
//           >
//             <Plus size={16} />
//             <span>New Supplier</span>
//           </button>
//         }
//       />

//       <SupplierRegistration
//         isOpen={showSupplierModal}
//         editData={editingSupplier}
//         onClose={handleCloseSupplierModal}
//         onSave={handleSupplierSaved}
//       />

//       <ConfirmModal
//         open={confirmState.open}
//         type={confirmState.type}
//         title={confirmState.title}
//         message={confirmState.message}
//         confirmText={confirmState.confirmText}
//         cancelText="Cancel"
//         loading={confirmLoading}
//         onCancel={closeConfirmModal}
//         onConfirm={handleConfirmAction}
//       />

//       <ImportPreviewModal
//         isOpen={Boolean(csvImport.preview)}
//         entityName="supplier"
//         fileName={csvImport.preview?.file?.name}
//         columns={csvImport.preview?.columns || []}
//         rows={csvImport.preview?.rows || []}
//         rowErrors={csvImport.preview?.rowErrors || {}}
//         loading={csvImport.loading}
//         progress={csvImport.progress}
//         onCancel={csvImport.cancel}
//         onConfirm={csvImport.confirm}
//       />
//     </>
//   );
// }

// export default SuppliersList;

import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import DataList from "../../components/common/DataList/DataList";
import StatusField from "../../components/common/StatusField/StatusField";
import ConfirmModal from "../../components/common/ConfirmModal/ConfirmModal";
import ImportPreviewModal from "../../components/common/DataList/ImportPreviewModal";
import { saveCsvFile } from "../../components/common/DataList/fileDownload";
import SupplierRegistration from "./SupplierRegistration";
import useCsvImport from "../../hooks/useCsvImport";
import api from "../../services/api";

const INITIAL_CONFIRM_STATE = {
  open: false,
  type: "danger",
  title: "",
  message: "",
  confirmText: "Delete",
  onConfirm: null,
};

const EMPTY_STATS = {
  all: 0,
  active: 0,
  inactive: 0,
  business: 0,
  individual: 0,
};

const PAGE_SIZE_OPTIONS = [20, 50, 100];
const SEARCH_DEBOUNCE_MS = 400;
const EXPORT_BATCH = 100;

const STATE_OPTIONS = [
  "Andhra Pradesh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Karnataka",
  "Kerala",
  "Maharashtra",
  "Tamil Nadu",
  "Telangana",
];

const getErrorMessage = (error) => {
  const responseData = error?.response?.data;

  if (typeof responseData?.message === "string") return responseData.message;
  if (typeof responseData?.error === "string") return responseData.error;

  if (Array.isArray(responseData?.errors) && responseData.errors.length > 0) {
    return responseData.errors
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.message || item?.msg || String(item),
      )
      .join(", ");
  }

  return error?.message || "Something went wrong. Please try again.";
};

const getSupplierList = (response) => {
  if (Array.isArray(response?.data?.data?.suppliers))
    return response.data.data.suppliers;
  if (Array.isArray(response?.data?.suppliers)) return response.data.suppliers;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const getTotal = (response, fallback) => {
  const p = response?.data?.pagination;
  return Number(p?.total ?? p?.totalRecords ?? p?.totalItems ?? fallback) || 0;
};

const getSingleSupplier = (response) =>
  response?.data?.supplier || response?.data?.data || response?.data || null;

const renderOptionalText = (value) =>
  value || <span className="dl-muted-value">N/A</span>;

const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

const validateSupplierRow = (row) => {
  const errors = [];
  const isNum = (v) => v === "" || v == null || !Number.isNaN(Number(v));
  const upper = (v) => String(v || "").toUpperCase();

  if (!row.supplierName || row.supplierName.trim().length < 2)
    errors.push("supplierName is required (min 2 characters)");

  if (
    row.supplierType &&
    !["BUSINESS", "INDIVIDUAL"].includes(upper(row.supplierType))
  )
    errors.push("supplierType must be Business or Individual");

  if (row.status && !["ACTIVE", "INACTIVE"].includes(upper(row.status)))
    errors.push("status must be Active or Inactive");

  if (
    row.openingBalanceType &&
    !["DEBIT", "CREDIT"].includes(upper(row.openingBalanceType))
  )
    errors.push("openingBalanceType must be DEBIT or CREDIT");

  if (
    row.gstNo &&
    !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(upper(row.gstNo))
  )
    errors.push("invalid gstNo");

  if (row.pincode && !/^[0-9]{6}$/.test(row.pincode))
    errors.push("pincode must be 6 digits");

  ["creditLimit", "creditDays", "openingBalance"].forEach((key) => {
    if (!isNum(row[key])) errors.push(`${key} must be a number`);
  });

  return errors;
};

function SuppliersList() {
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(EMPTY_STATS);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ key: "", direction: "" });
  const [filters, setFilters] = useState({});

  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const editLoadingRef = useRef(false);

  const [confirmState, setConfirmState] = useState(INITIAL_CONFIRM_STATE);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const requestIdRef = useRef(0);
  const bulkLoadingRef = useRef(false);

  const buildParams = useCallback(
    (extra = {}) => {
      const params = { ...extra };

      if (search.trim()) params.search = search.trim();

      if (sort.key && sort.direction) {
        params.sortBy = sort.key;
        params.sortOrder = sort.direction;
      }

      Object.entries(filters).forEach(([key, value]) => {
        if (value) params[key] = value;
      });

      return params;
    },
    [search, sort, filters],
  );

  const loadSuppliers = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    try {
      setLoading(true);

      const response = await api.suppliers.getAll(
        buildParams({ page, limit: pageSize }),
      );

      if (requestId !== requestIdRef.current) return;

      const list = getSupplierList(response);

      setSuppliers(list);
      setTotal(getTotal(response, list.length));
    } catch (error) {
      if (requestId !== requestIdRef.current) return;

      console.error("Unable to load suppliers:", error);
      toast.error(getErrorMessage(error));
      setSuppliers([]);
      setTotal(0);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [buildParams, page, pageSize]);

  const loadStats = useCallback(async () => {
    try {
      const response = await api.suppliers.getStats();
      const data = response?.data?.data || response?.data?.stats;

      if (data && typeof data.all === "number") {
        setStats({ ...EMPTY_STATS, ...data });
        return;
      }

      throw new Error("Unexpected stats response");
    } catch (statsError) {
      console.warn("Stats endpoint unavailable, using fallback:", statsError);

      try {
        const count = async (extra = {}) => {
          const res = await api.suppliers.getAll({
            page: 1,
            limit: 1,
            ...extra,
          });
          return getTotal(res, 0);
        };

        const [all, active, inactive, business, individual] = await Promise.all(
          [
            count(),
            count({ status: "Active" }),
            count({ status: "Inactive" }),
            count({ supplierType: "Business" }),
            count({ supplierType: "Individual" }),
          ],
        );

        setStats({ all, active, inactive, business, individual });
      } catch (fallbackError) {
        console.error("Unable to load supplier counts:", fallbackError);
      }
    }
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const refreshAll = useCallback(() => {
    loadSuppliers();
    loadStats();
  }, [loadSuppliers, loadStats]);

  // Debounced search: avoids a request per keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [search]);

  const handleSearch = useCallback((value) => setSearch(value), []);

  const handleSort = useCallback((next) => {
    setSort(next);
    setPage(1);
  }, []);

  const handleFilterChange = useCallback((next) => {
    setFilters(next);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((nextPage) => setPage(nextPage), []);

  const handlePageSizeChange = useCallback((size) => {
    setPageSize(size);
    setPage(1);
  }, []);

  const csvImport = useCsvImport({
    entityName: "supplier",
    validateRow: validateSupplierRow,
    upload: (payload) => api.suppliers.import(payload),
    onDone: refreshAll,
  });

  const supplierImportConfig = {
    templateFileName: "suppliers-import-template.csv",

    columns: [
      { key: "supplierName", example: "Sri Lakshmi Traders" },
      { key: "supplierType", example: "Business" },
      { key: "contactPerson", example: "Ravi Kumar" },
      { key: "phone", example: "9876543210" },
      { key: "email", example: "ravi@example.com" },
      { key: "gstNo", example: "29ABCDE1234F1Z5" },
      { key: "city", example: "Bengaluru" },
      { key: "state", example: "Karnataka" },
      { key: "pincode", example: "560001" },
      { key: "paymentTerms", example: "Net 30" },
      { key: "creditLimit", example: "100000" },
      { key: "creditDays", example: "30" },
      { key: "openingBalance", example: "0" },
      { key: "openingBalanceType", example: "CREDIT" },
      { key: "status", example: "Active" },
    ],

    onUpload: csvImport.handleFile,
    onError: (message) => toast.error(message),
  };

  const handleExport = useCallback(async () => {
    const toastId = toast.loading("Preparing export...");

    try {
      const first = await api.suppliers.getAll(
        buildParams({ page: 1, limit: EXPORT_BATCH }),
      );

      const rows = [...getSupplierList(first)];
      const totalPages = Math.max(
        1,
        Number(first?.data?.pagination?.totalPages) || 1,
      );

      const remaining = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);

      for (let i = 0; i < remaining.length; i += 5) {
        const responses = await Promise.all(
          remaining
            .slice(i, i + 5)
            .map((p) =>
              api.suppliers.getAll(
                buildParams({ page: p, limit: EXPORT_BATCH }),
              ),
            ),
        );

        responses.forEach((response) =>
          rows.push(...getSupplierList(response)),
        );
      }

      const exportColumns = [
        ["supplierCode", "Code"],
        ["supplierName", "Supplier"],
        ["supplierType", "Supplier Type"],
        ["contactPerson", "Contact Person"],
        ["phone", "Phone"],
        ["alternatePhone", "Alternate Phone"],
        ["email", "Email"],
        ["gstNo", "GST Number"],
        ["panNo", "PAN Number"],
        ["billingAddress", "Billing Address"],
        ["shippingAddress", "Shipping Address"],
        ["city", "City"],
        ["state", "State"],
        ["pincode", "Pincode"],
        ["country", "Country"],
        ["paymentTerms", "Payment Terms"],
        ["creditLimit", "Credit Limit"],
        ["creditDays", "Credit Days"],
        ["openingBalance", "Opening Balance"],
        ["openingBalanceType", "Opening Balance Type"],
        ["payableBalance", "Payable Balance"],
        ["status", "Status"],
      ];

      const csv = [
        exportColumns.map(([, label]) => escapeCsv(label)).join(","),
        ...rows.map((row) =>
          exportColumns.map(([key]) => escapeCsv(row[key])).join(","),
        ),
      ].join("\n");

      await saveCsvFile("suppliers-export.csv", csv);

      toast.success(`Exported ${rows.length} suppliers`, { id: toastId });
    } catch (error) {
      console.error("Supplier export failed:", error);
      toast.error(getErrorMessage(error), { id: toastId });
    }
  }, [buildParams]);

  const columns = useMemo(
    () => [
      { key: "supplierCode", label: "Code", sortable: true },
      {
        key: "supplierName",
        label: "Supplier",
        sortable: true,
        render: (value, row) => (
          <div className="dl-customer">
            <strong>{value}</strong>
            <span>{row.supplierType || "Business"}</span>
          </div>
        ),
      },
      {
        key: "contactPerson",
        label: "Contact Person",
        sortable: true,
        render: renderOptionalText,
      },
      {
        key: "phone",
        label: "Phone",
        sortable: true,
        render: renderOptionalText,
      },
      {
        key: "email",
        label: "Email",
        sortable: true,
        render: renderOptionalText,
      },
      {
        key: "gstNo",
        label: "GST Number",
        sortable: true,
        render: renderOptionalText,
      },
      {
        key: "city",
        label: "City",
        sortable: true,
        render: renderOptionalText,
      },
      {
        key: "state",
        label: "State",
        sortable: true,
        render: renderOptionalText,
      },
      { key: "paymentTerms", label: "Payment Terms", sortable: true },
      {
        key: "creditLimit",
        label: "Credit Limit",
        type: "currency",
        sortable: true,
      },
      {
        key: "creditDays",
        label: "Credit Days",
        type: "number",
        sortable: true,
      },
      {
        key: "payableBalance",
        label: "Payable Balance",
        type: "currency",
        sortable: true,
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (value) => <StatusField value={value} />,
      },
    ],
    [],
  );

  const tableFilters = useMemo(
    () => [
      {
        key: "supplierType",
        label: "Supplier Type",
        type: "select",
        options: ["Business", "Individual"],
      },
      {
        key: "status",
        label: "Status",
        type: "select",
        options: ["Active", "Inactive"],
      },
      {
        key: "state",
        label: "State",
        type: "select",
        options: STATE_OPTIONS,
      },
    ],
    [],
  );

  const quickFilters = useMemo(
    () => [
      { key: "status", value: "", label: "All", count: stats.all },
      { key: "status", value: "Active", label: "Active", count: stats.active },
      {
        key: "status",
        value: "Inactive",
        label: "Inactive",
        count: stats.inactive,
      },
      {
        key: "supplierType",
        value: "Business",
        label: "Business",
        count: stats.business,
      },
      {
        key: "supplierType",
        value: "Individual",
        label: "Individual",
        count: stats.individual,
      },
    ],
    [stats],
  );

  const closeConfirmModal = () => {
    if (confirmLoading) return;
    setConfirmState(INITIAL_CONFIRM_STATE);
  };

  const openConfirmModal = ({
    type = "danger",
    title = "Are you sure?",
    message = "",
    confirmText = "Confirm",
    onConfirm,
  }) => {
    setConfirmState({
      open: true,
      type,
      title,
      message,
      confirmText,
      onConfirm,
    });
  };

  const handleConfirmAction = async () => {
    if (confirmLoading || typeof confirmState.onConfirm !== "function") {
      return;
    }

    try {
      setConfirmLoading(true);
      await confirmState.onConfirm();
      setConfirmState(INITIAL_CONFIRM_STATE);
    } catch (error) {
      console.error("Supplier confirmation action failed:", error);
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingSupplier(null);
    setShowSupplierModal(true);
  };

  const handleEdit = async (row) => {
    if (!row?.supplierCode || editLoadingRef.current) {
      return;
    }

    editLoadingRef.current = true;

    const toastId = toast.loading("Loading supplier...");

    try {
      const response = await api.suppliers.getByCode(row.supplierCode);
      const fullSupplier = getSingleSupplier(response);

      if (!fullSupplier?._id) {
        throw new Error("Supplier details could not be loaded");
      }

      toast.dismiss(toastId);

      setEditingSupplier(fullSupplier);
      setShowSupplierModal(true);
    } catch (error) {
      console.error("Unable to load supplier for editing:", error);
      toast.error(getErrorMessage(error), { id: toastId });
    } finally {
      editLoadingRef.current = false;
    }
  };

  const handleCloseSupplierModal = () => {
    setShowSupplierModal(false);
    setEditingSupplier(null);
  };

  const handleSupplierSaved = () => {
    refreshAll();
  };

  const handleDelete = (row) => {
    openConfirmModal({
      type: "danger",
      title: "Delete supplier?",
      message: `Are you sure you want to delete "${row.supplierName}" (${row.supplierCode})? The supplier will be marked as deleted and its linked ledger will be deactivated.`,
      confirmText: "Delete Supplier",

      onConfirm: async () => {
        try {
          await api.suppliers.delete(row.supplierCode);
          toast.success(`${row.supplierName} deleted successfully`);
          refreshAll();
        } catch (error) {
          console.error("Unable to delete supplier:", error);
          toast.error(getErrorMessage(error));
          throw error;
        }
      },
    });
  };

  // One bulk request instead of one update per row
  const handleBulkStatusUpdate = (rows, status) => {
    if (!rows.length) return;

    const ids = rows.map((row) => row._id).filter(Boolean);

    if (!ids.length) {
      toast.error("Select suppliers before changing status.");
      return;
    }

    const isActivate = status === "Active";

    openConfirmModal({
      type: isActivate ? "info" : "warning",
      title: isActivate ? "Activate suppliers?" : "Deactivate suppliers?",
      message: `Are you sure you want to ${
        isActivate ? "activate" : "deactivate"
      } ${rows.length} selected supplier${
        rows.length > 1 ? "s" : ""
      }? Their linked ledgers will also be ${
        isActivate ? "reactivated" : "deactivated"
      }.`,
      confirmText: isActivate
        ? `Activate ${rows.length} Supplier${rows.length > 1 ? "s" : ""}`
        : `Deactivate ${rows.length} Supplier${rows.length > 1 ? "s" : ""}`,

      onConfirm: async () => {
        if (bulkLoadingRef.current) return;
        bulkLoadingRef.current = true;

        try {
          const response = await api.suppliers.bulkStatus(ids, status);
          const result = response?.data || {};
          const changed = Number(result.updated ?? result.modifiedCount) || 0;

          if (changed) {
            toast.success(
              `${changed} supplier${changed === 1 ? "" : "s"} ${
                isActivate ? "activated" : "deactivated"
              } successfully`,
            );
          } else {
            toast("No suppliers needed a status change");
          }
        } catch (error) {
          console.error("Bulk status update failed:", error);
          toast.error(getErrorMessage(error), { duration: 7000 });
          throw error;
        } finally {
          bulkLoadingRef.current = false;
          refreshAll();
        }
      },
    });
  };

  const handleBulkDelete = (rows) => {
    if (!rows.length) return;

    openConfirmModal({
      type: "danger",
      title: "Delete selected suppliers?",
      message: `Delete ${rows.length} selected supplier${
        rows.length > 1 ? "s" : ""
      }? These suppliers will be marked as deleted and their linked ledgers will be deactivated.`,
      confirmText: `Delete ${rows.length} Supplier${rows.length > 1 ? "s" : ""}`,

      onConfirm: async () => {
        const results = await Promise.allSettled(
          rows.map((row) => api.suppliers.delete(row.supplierCode)),
        );

        const successCount = results.filter(
          (r) => r.status === "fulfilled",
        ).length;
        const failures = results.filter((r) => r.status === "rejected");

        if (successCount) {
          toast.success(
            `${successCount} supplier${
              successCount > 1 ? "s" : ""
            } deleted successfully`,
          );
        }

        if (failures.length) {
          toast.error(
            `${failures.length} deletion${
              failures.length > 1 ? "s" : ""
            } failed: ${getErrorMessage(failures[0].reason)}`,
          );
        }

        refreshAll();
      },
    });
  };

  return (
    <>
      <DataList
        title="Suppliers"
        subtitle="Manage suppliers and payable accounts"
        columns={columns}
        data={suppliers}
        loading={loading}
        rowKey="_id"
        showCase="list"
        searchable
        filterable
        sortable
        selectable
        columnVisibility
        pagination
        filters={tableFilters}
        quickFilters={quickFilters}
        storageKey="trustiq-suppliers"
        searchPlaceholder="Search code, supplier, contact, phone, email, GST, city..."
        serverMode
        total={total}
        page={page}
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZE_OPTIONS}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onSearch={handleSearch}
        onSort={handleSort}
        onFilterChange={handleFilterChange}
        onExport={handleExport}
        onRefresh={refreshAll}
        importConfig={supplierImportConfig}
        actions={{
          edit: handleEdit,
          delete: handleDelete,
        }}
        bulkActions={[
          {
            key: "activate",
            label: "Activate",
            action: (rows) => handleBulkStatusUpdate(rows, "Active"),
          },
          {
            key: "deactivate",
            label: "Deactivate",
            action: (rows) => handleBulkStatusUpdate(rows, "Inactive"),
          },
          {
            key: "delete",
            label: "Delete",
            danger: true,
            action: handleBulkDelete,
          },
        ]}
        addButton={
          <button
            type="button"
            className="so-primary-button"
            onClick={handleOpenCreate}
          >
            <Plus size={16} />
            <span>New Supplier</span>
          </button>
        }
      />

      <SupplierRegistration
        isOpen={showSupplierModal}
        editData={editingSupplier}
        onClose={handleCloseSupplierModal}
        onSave={handleSupplierSaved}
      />

      <ConfirmModal
        open={confirmState.open}
        type={confirmState.type}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText="Cancel"
        loading={confirmLoading}
        onCancel={closeConfirmModal}
        onConfirm={handleConfirmAction}
      />

      <ImportPreviewModal
        isOpen={Boolean(csvImport.preview)}
        entityName="supplier"
        fileName={csvImport.preview?.file?.name}
        columns={csvImport.preview?.columns || []}
        rows={csvImport.preview?.rows || []}
        rowErrors={csvImport.preview?.rowErrors || {}}
        loading={csvImport.loading}
        progress={csvImport.progress}
        onCancel={csvImport.cancel}
        onConfirm={csvImport.confirm}
      />
    </>
  );
}

export default SuppliersList;
