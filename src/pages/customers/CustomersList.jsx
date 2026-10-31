// import { Plus } from "lucide-react";
// import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import toast from "react-hot-toast";

// import DataList from "../../components/common/DataList/DataList";
// import StatusField from "../../components/common/StatusField/StatusField";
// import ConfirmModal from "../../components/common/ConfirmModal/ConfirmModal";
// import ImportPreviewModal from "../../components/common/DataList/ImportPreviewModal";
// import { saveCsvFile } from "../../components/common/DataList/fileDownload";
// import useCsvImport from "../../hooks/useCsvImport";
// import api from "../../services/api";
// import routes, { buildRoute } from "../../config/routes";

// const CUSTOMER_ROUTES = {
//   create: routes.customers.create,

//   view: (customerCode) =>
//     buildRoute(routes.customers.edit, {
//       id: encodeURIComponent(customerCode),
//     }),

//   edit: (customerCode) =>
//     buildRoute(routes.customers.edit, {
//       id: encodeURIComponent(customerCode),
//     }),
// };

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

// const getErrorMessage = (error) => {
//   const responseData = error?.response?.data;

//   if (Array.isArray(responseData?.errors) && responseData.errors.length) {
//     return responseData.errors
//       .map((item) =>
//         typeof item === "string"
//           ? item
//           : item?.message || item?.msg || String(item),
//       )
//       .join(", ");
//   }

//   if (typeof responseData?.message === "string") {
//     return responseData.message;
//   }

//   if (typeof responseData?.error === "string") {
//     return responseData.error;
//   }

//   return error?.message || "Something went wrong. Please try again.";
// };

// const getCustomerList = (response) => {
//   if (Array.isArray(response?.data?.data)) return response.data.data;
//   if (Array.isArray(response?.data?.customers)) return response.data.customers;
//   if (Array.isArray(response?.data)) return response.data;
//   return [];
// };

// const getTotal = (response, fallback) => {
//   const p = response?.data?.pagination;
//   return Number(p?.total ?? p?.totalRecords ?? p?.totalItems ?? fallback) || 0;
// };

// const renderOptionalText = (value) =>
//   value || <span className="dl-muted-value">N/A</span>;

// const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

// const validateCustomerRow = (row) => {
//   const errors = [];
//   const isNum = (v) => v === "" || v == null || !Number.isNaN(Number(v));
//   const upper = (v) => String(v || "").toUpperCase();

//   if (!row.customerName || row.customerName.trim().length < 2)
//     errors.push("customerName is required (min 2 characters)");

//   if (
//     row.customerType &&
//     !["BUSINESS", "INDIVIDUAL"].includes(upper(row.customerType))
//   )
//     errors.push("customerType must be Business or Individual");

//   if (row.status && !["ACTIVE", "INACTIVE"].includes(upper(row.status)))
//     errors.push("status must be Active or Inactive");

//   if (
//     row.openingBalanceType &&
//     !["DEBIT", "CREDIT"].includes(upper(row.openingBalanceType))
//   )
//     errors.push("openingBalanceType must be DEBIT or CREDIT");

//   if (row.phone && !/^[0-9+\-() ]{7,20}$/.test(row.phone))
//     errors.push("invalid phone");

//   if (row.email && !/^\S+@\S+\.\S+$/.test(row.email))
//     errors.push("invalid email");

//   if (
//     row.gstNo &&
//     !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(upper(row.gstNo))
//   )
//     errors.push("invalid gstNo");

//   if (row.panNo && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(upper(row.panNo)))
//     errors.push("invalid panNo");

//   if (row.pincode && !/^[0-9]{6}$/.test(row.pincode))
//     errors.push("pincode must be 6 digits");

//   ["creditLimit", "creditDays", "openingBalance"].forEach((key) => {
//     if (!isNum(row[key])) errors.push(`${key} must be a number`);
//   });

//   return errors;
// };

// function CustomersList() {
//   const navigate = useNavigate();

//   const [loading, setLoading] = useState(true);
//   const [customers, setCustomers] = useState([]);
//   const [total, setTotal] = useState(0);
//   const [stats, setStats] = useState(EMPTY_STATS);

//   // Server-side query state
//   const [page, setPage] = useState(1);
//   const [pageSize, setPageSize] = useState(20);
//   const [search, setSearch] = useState("");
//   const [sort, setSort] = useState({ key: "", direction: "" });
//   const [filters, setFilters] = useState({});

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

//   const loadCustomers = useCallback(async () => {
//     const requestId = ++requestIdRef.current;

//     try {
//       setLoading(true);

//       const response = await api.customers.getAll(
//         buildParams({ page, limit: pageSize }),
//       );

//       // Ignore stale responses (user typed / paged quickly)
//       if (requestId !== requestIdRef.current) return;

//       const list = getCustomerList(response);

//       setCustomers(list);
//       setTotal(getTotal(response, list.length));
//     } catch (error) {
//       if (requestId !== requestIdRef.current) return;

//       console.error("Unable to load customers:", error);
//       toast.error(getErrorMessage(error));
//     } finally {
//       if (requestId === requestIdRef.current) {
//         setLoading(false);
//       }
//     }
//   }, [buildParams, page, pageSize]);

// const loadStats = useCallback(async () => {
//   try {
//     const response = await api.customers.getStats();
//     const data = response?.data?.data || response?.data?.stats;

//     if (data && typeof data.all === "number") {
//       setStats({ ...EMPTY_STATS, ...data });
//       return;
//     }
//     throw new Error("Unexpected stats response");
//   } catch (statsError) {
//     console.warn("Stats endpoint unavailable, using fallback:", statsError);

//     try {
//       const count = async (extra = {}) => {
//         const res = await api.customers.getAll({ page: 1, limit: 1, ...extra });
//         return getTotal(res, 0);
//       };

//       const [all, active, inactive, business, individual] = await Promise.all([
//         count(),
//         count({ status: "Active" }),
//         count({ status: "Inactive" }),
//         count({ customerType: "Business" }),
//         count({ customerType: "Individual" }),
//       ]);

//       setStats({ all, active, inactive, business, individual });
//     } catch (fallbackError) {
//       console.error("Unable to load customer counts:", fallbackError);
//     }
//   }
// }, []);

//   useEffect(() => {
//     loadCustomers();
//   }, [loadCustomers]);

//   useEffect(() => {
//     loadStats();
//   }, [loadStats]);

//   const refreshAll = useCallback(() => {
//     loadCustomers();
//     loadStats();
//   }, [loadCustomers, loadStats]);

//   /* ---------------------------------------------------------------- */
//   /* Stable callbacks for DataList (server mode)                       */
//   /* ---------------------------------------------------------------- */

//   const handleSearch = useCallback((value) => {
//     setSearch(value);
//   }, []);

//   const handleSort = useCallback((next) => {
//     setSort(next);
//     setPage(1);
//   }, []);

//   const handleFilterChange = useCallback((next) => {
//     setFilters(next);
//   }, []);

//   const handlePageChange = useCallback((nextPage) => {
//     setPage(nextPage);
//   }, []);

//   const handlePageSizeChange = useCallback((size) => {
//     setPageSize(size);
//     setPage(1);
//   }, []);

//   /* ---------------------------------------------------------------- */
//   /* Import                                                            */
//   /* ---------------------------------------------------------------- */

//   const csvImport = useCsvImport({
//     entityName: "customer",
//     validateRow: validateCustomerRow,
//     upload: (payload) => api.customers.bulkImport(payload),
//     onDone: refreshAll,
//   });

//   /* ---------------------------------------------------------------- */
//   /* Export (all rows matching current search + filters)               */
//   /* ---------------------------------------------------------------- */

//   const handleExport = useCallback(async () => {
//     const toastId = toast.loading("Preparing export...");

//     try {
//       const first = await api.customers.getAll(
//         buildParams({ page: 1, limit: EXPORT_BATCH }),
//       );

//       const rows = [...getCustomerList(first)];
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
//               api.customers.getAll(buildParams({ page: p, limit: EXPORT_BATCH })),
//             ),
//         );

//         responses.forEach((response) => rows.push(...getCustomerList(response)));
//       }

//       const exportColumns = [
//         ["customerCode", "Code"],
//         ["customerName", "Customer"],
//         ["customerType", "Customer Type"],
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
//         ["priceList", "Price List"],
//         ["status", "Status"],
//       ];

//       const csv = [
//         exportColumns.map(([, label]) => escapeCsv(label)).join(","),
//         ...rows.map((row) =>
//           exportColumns.map(([key]) => escapeCsv(row[key])).join(","),
//         ),
//       ].join("\n");

//       await saveCsvFile("customers-export.csv", csv);

//       toast.success(`Exported ${rows.length} customers`, { id: toastId });
//     } catch (error) {
//       console.error("Customer export failed:", error);
//       toast.error(getErrorMessage(error), { id: toastId });
//     }
//   }, [buildParams]);

//   /* ---------------------------------------------------------------- */
//   /* Table configuration                                               */
//   /* ---------------------------------------------------------------- */

//   const columns = useMemo(
//     () => [
//       { key: "customerCode", label: "Code", sortable: true },
//       {
//         key: "customerName",
//         label: "Customer",
//         sortable: true,
//         render: (value, row) => (
//           <div className="dl-customer">
//             <strong>{value}</strong>
//             <span>{row.customerType || "Business"}</span>
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
//       {
//         key: "paymentTerms",
//         label: "Payment Terms",
//         sortable: true,
//         render: renderOptionalText,
//       },
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
//         render: (value) => Number(value || 0),
//       },
//       {
//         key: "status",
//         label: "Status",
//         sortable: true,
//         render: (value) => <StatusField value={value} />,
//       },
//       {
//         key: "customerType",
//         label: "Customer Type",
//         sortable: true,
//         visible: false,
//       },
//       {
//         key: "alternatePhone",
//         label: "Alternate Phone",
//         sortable: true,
//         visible: false,
//         render: renderOptionalText,
//       },
//       {
//         key: "panNo",
//         label: "PAN Number",
//         sortable: true,
//         visible: false,
//         render: renderOptionalText,
//       },
//       {
//         key: "billingAddress",
//         label: "Billing Address",
//         visible: false,
//         render: renderOptionalText,
//       },
//       {
//         key: "shippingAddress",
//         label: "Shipping Address",
//         visible: false,
//         render: renderOptionalText,
//       },
//       {
//         key: "pincode",
//         label: "Pincode",
//         sortable: true,
//         visible: false,
//         render: renderOptionalText,
//       },
//       {
//         key: "country",
//         label: "Country",
//         sortable: true,
//         visible: false,
//         render: renderOptionalText,
//       },
//       {
//         key: "openingBalance",
//         label: "Opening Balance",
//         type: "currency",
//         sortable: true,
//         visible: false,
//       },
//       {
//         key: "openingBalanceType",
//         label: "Opening Balance Type",
//         sortable: true,
//         visible: false,
//       },
//       {
//         key: "priceList",
//         label: "Price List",
//         sortable: true,
//         visible: false,
//         render: renderOptionalText,
//       },
//       {
//         key: "notes",
//         label: "Notes",
//         visible: false,
//         render: renderOptionalText,
//       },
//     ],
//     [],
//   );

//   const tableFilters = useMemo(
//     () => [
//       {
//         key: "customerType",
//         label: "Customer Type",
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
//         key: "openingBalanceType",
//         label: "Opening Balance Type",
//         type: "select",
//         options: ["DEBIT", "CREDIT"],
//       },
//     ],
//     [],
//   );

//   // Counts come from /customers/stats, not from the current page
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
//         key: "customerType",
//         value: "Business",
//         label: "Business",
//         count: stats.business,
//       },
//       {
//         key: "customerType",
//         value: "Individual",
//         label: "Individual",
//         count: stats.individual,
//       },
//     ],
//     [stats],
//   );

//   /* ---------------------------------------------------------------- */
//   /* Row actions                                                       */
//   /* ---------------------------------------------------------------- */

//   const handleView = (row) => navigate(CUSTOMER_ROUTES.view(row.customerCode));
//   const handleEdit = (row) => navigate(CUSTOMER_ROUTES.edit(row.customerCode));

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
//       // The action shows its own error toast. Keep the dialog open to retry.
//       console.error("Customer confirmation action failed:", error);
//     } finally {
//       setConfirmLoading(false);
//     }
//   };

//   const handleDelete = (row) => {
//     openConfirmModal({
//       title: "Delete customer?",
//       message: `Are you sure you want to delete "${row.customerName}" (${row.customerCode})? The customer will be marked as deleted and its linked ledger will be deactivated.`,
//       confirmText: "Delete Customer",

//       onConfirm: async () => {
//         try {
//           await api.customers.delete(row.customerCode);
//           toast.success(`${row.customerName} deleted successfully`);
//           refreshAll();
//         } catch (error) {
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
//         rows.map((row) => api.customers.update(row.customerCode, { status })),
//       );

//       const successCount = results.filter((r) => r.status === "fulfilled").length;
//       const failures = results.filter((r) => r.status === "rejected");

//       if (successCount) {
//         toast.success(
//           `${successCount} customer${successCount > 1 ? "s" : ""} ${
//             status === "Active" ? "activated" : "deactivated"
//           } successfully`,
//         );
//       }

//       if (failures.length) {
//         toast.error(
//           `${failures.length} customer update${
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
//       title: "Delete selected customers?",
//       message: `Delete ${rows.length} selected customer${
//         rows.length > 1 ? "s" : ""
//       }? These customers will be marked as deleted and their linked ledgers will be deactivated.`,
//       confirmText: `Delete ${rows.length} Customer${rows.length > 1 ? "s" : ""}`,

//       onConfirm: async () => {
//         const results = await Promise.allSettled(
//           rows.map((row) => api.customers.delete(row.customerCode)),
//         );

//         const successCount = results.filter((r) => r.status === "fulfilled").length;
//         const failures = results.filter((r) => r.status === "rejected");

//         if (successCount) {
//           toast.success(
//             `${successCount} customer${
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

//   /* ---------------------------------------------------------------- */
//   /* Import template config                                            */
//   /* ---------------------------------------------------------------- */

//   const customerImportConfig = {
//     templateFileName: "customers-import-template.csv",

//     columns: [
//       { key: "customerName", example: "ABC Traders" },
//       { key: "customerType", example: "Business" },
//       { key: "contactPerson", example: "Aditya" },
//       { key: "phone", example: "9876543210" },
//       { key: "alternatePhone", example: "" },
//       { key: "email", example: "accounts@example.com" },
//       { key: "gstNo", example: "" },
//       { key: "panNo", example: "" },
//       { key: "billingAddress", example: "123 Market Road" },
//       { key: "shippingAddress", example: "123 Market Road" },
//       { key: "city", example: "Belagavi" },
//       { key: "state", example: "Karnataka" },
//       { key: "pincode", example: "590001" },
//       { key: "country", example: "India" },
//       { key: "paymentTerms", example: "Net 30" },
//       { key: "creditLimit", example: "50000" },
//       { key: "creditDays", example: "30" },
//       { key: "openingBalance", example: "0" },
//       { key: "openingBalanceType", example: "DEBIT" },
//       { key: "priceList", example: "Standard" },
//       { key: "status", example: "Active" },
//       { key: "notes", example: "" },
//     ],

//     onUpload: csvImport.handleFile,
//     onError: (message) => toast.error(message),
//   };

//   return (
//     <>
//       <DataList
//         title="Customers"
//         subtitle="Manage customers and receivable accounts"
//         columns={columns}
//         data={customers}
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
//         storageKey="trustiq-customers"
//         searchPlaceholder="Search code, customer, contact, phone, email, GST, city..."
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
//         actions={{
//           view: handleView,
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
//         onRefresh={refreshAll}
//         importConfig={customerImportConfig}
//         addButton={
//           <button
//             type="button"
//             className="so-primary-button"
//             onClick={() => navigate(CUSTOMER_ROUTES.create)}
//           >
//             <Plus size={16} />
//             <span>New Customer</span>
//           </button>
//         }
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
//         entityName="customer"
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

// export default CustomersList;


import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import DataList from "../../components/common/DataList/DataList";
import StatusField from "../../components/common/StatusField/StatusField";
import ConfirmModal from "../../components/common/ConfirmModal/ConfirmModal";
import ImportPreviewModal from "../../components/common/DataList/ImportPreviewModal";
import { saveCsvFile } from "../../components/common/DataList/fileDownload";
import useCsvImport from "../../hooks/useCsvImport";
import api from "../../services/api";
import routes, { buildRoute } from "../../config/routes";

const CUSTOMER_ROUTES = {
  create: routes.customers.create,
  view: (customerCode) =>
    buildRoute(routes.customers.edit, {
      id: encodeURIComponent(customerCode),
    }),
  edit: (customerCode) =>
    buildRoute(routes.customers.edit, {
      id: encodeURIComponent(customerCode),
    }),
};

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

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const EXPORT_BATCH = 100;
const SEARCH_DEBOUNCE_MS = 400;

const getErrorMessage = (error) => {
  const responseData = error?.response?.data;

  if (Array.isArray(responseData?.errors) && responseData.errors.length) {
    return responseData.errors
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.message || item?.msg || String(item)
      )
      .join(", ");
  }

  if (typeof responseData?.message === "string") {
    return responseData.message;
  }

  if (typeof responseData?.error === "string") {
    return responseData.error;
  }

  return error?.message || "Something went wrong. Please try again.";
};

const getCustomerList = (response) => {
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.data?.customers)) return response.data.customers;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const getTotal = (response, fallback) => {
  const p = response?.data?.pagination;
  return Number(p?.total ?? p?.totalRecords ?? p?.totalItems ?? fallback) || 0;
};

const renderOptionalText = (value) =>
  value || <span className="dl-muted-value">N/A</span>;

const escapeCsv = (value) =>
  `"${String(value ?? "").replace(/"/g, '""')}"`;

const validateCustomerRow = (row) => {
  const errors = [];
  const isNum = (v) => v === "" || v == null || !Number.isNaN(Number(v));
  const upper = (v) => String(v || "").toUpperCase();

  if (!row.customerName || row.customerName.trim().length < 2)
    errors.push("customerName is required (min 2 characters)");

  if (
    row.customerType &&
    !["BUSINESS", "INDIVIDUAL"].includes(upper(row.customerType))
  )
    errors.push("customerType must be Business or Individual");

  if (row.status && !["ACTIVE", "INACTIVE"].includes(upper(row.status)))
    errors.push("status must be Active or Inactive");

  if (
    row.openingBalanceType &&
    !["DEBIT", "CREDIT"].includes(upper(row.openingBalanceType))
  )
    errors.push("openingBalanceType must be DEBIT or CREDIT");

  if (row.phone && !/^[0-9+\-() ]{7,20}$/.test(row.phone))
    errors.push("invalid phone");

  if (row.email && !/^\S+@\S+\.\S+$/.test(row.email))
    errors.push("invalid email");

  if (
    row.gstNo &&
    !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/.test(upper(row.gstNo))
  )
    errors.push("invalid gstNo");

  if (row.panNo && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(upper(row.panNo)))
    errors.push("invalid panNo");

  if (row.pincode && !/^[0-9]{6}$/.test(row.pincode))
    errors.push("pincode must be 6 digits");

  ["creditLimit", "creditDays", "openingBalance"].forEach((key) => {
    if (!isNum(row[key])) errors.push(`${key} must be a number`);
  });

  return errors;
};

function CustomersList() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(EMPTY_STATS);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ key: "", direction: "" });
  const [filters, setFilters] = useState({});

  const [confirmState, setConfirmState] = useState(INITIAL_CONFIRM_STATE);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const requestIdRef = useRef(0);
  const bulkLoadingRef = useRef(false);

  /* ---------------------------------------------------------------- */
  /* Data loading                                                      */
  /* ---------------------------------------------------------------- */

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
    [search, sort, filters]
  );

  const loadCustomers = useCallback(async () => {
    const requestId = ++requestIdRef.current;

    try {
      setLoading(true);

      const response = await api.customers.getAll(
        buildParams({ page, limit: pageSize })
      );

      if (requestId !== requestIdRef.current) return;

      const list = getCustomerList(response);

      setCustomers(list);
      setTotal(getTotal(response, list.length));
    } catch (error) {
      if (requestId !== requestIdRef.current) return;

      console.error("Unable to load customers:", error);
      toast.error(getErrorMessage(error));
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [buildParams, page, pageSize]);

  const loadStats = useCallback(async () => {
    try {
      const response = await api.customers.getStats();
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
          const res = await api.customers.getAll({
            page: 1,
            limit: 1,
            ...extra,
          });
          return getTotal(res, 0);
        };

        const [all, active, inactive, business, individual] =
          await Promise.all([
            count(),
            count({ status: "Active" }),
            count({ status: "Inactive" }),
            count({ customerType: "Business" }),
            count({ customerType: "Individual" }),
          ]);

        setStats({ all, active, inactive, business, individual });
      } catch (fallbackError) {
        console.error("Unable to load customer counts:", fallbackError);
      }
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const refreshAll = useCallback(() => {
    loadCustomers();
    loadStats();
  }, [loadCustomers, loadStats]);

  // Debounced search: resets to page 1 after the user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [search]);

  /* ---------------------------------------------------------------- */
  /* Stable callbacks for DataList (server mode)                       */
  /* ---------------------------------------------------------------- */

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

  /* ---------------------------------------------------------------- */
  /* Import                                                            */
  /* ---------------------------------------------------------------- */

  const csvImport = useCsvImport({
    entityName: "customer",
    validateRow: validateCustomerRow,
    upload: (payload) => api.customers.bulkImport(payload),
    onDone: refreshAll,
  });

  /* ---------------------------------------------------------------- */
  /* Export                                                            */
  /* ---------------------------------------------------------------- */

  const handleExport = useCallback(async () => {
    const toastId = toast.loading("Preparing export...");

    try {
      const first = await api.customers.getAll(
        buildParams({ page: 1, limit: EXPORT_BATCH })
      );

      const rows = [...getCustomerList(first)];
      const totalPages = Math.max(
        1,
        Number(first?.data?.pagination?.totalPages) || 1
      );

      const remaining = Array.from(
        { length: totalPages - 1 },
        (_, i) => i + 2
      );

      for (let i = 0; i < remaining.length; i += 5) {
        const responses = await Promise.all(
          remaining
            .slice(i, i + 5)
            .map((p) =>
              api.customers.getAll(
                buildParams({ page: p, limit: EXPORT_BATCH })
              )
            )
        );

        responses.forEach((response) =>
          rows.push(...getCustomerList(response))
        );
      }

      const exportColumns = [
        ["customerCode", "Code"],
        ["customerName", "Customer"],
        ["customerType", "Customer Type"],
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
        ["priceList", "Price List"],
        ["receivableBalance", "Receivable Balance"],
        ["status", "Status"],
      ];

      const csv = [
        exportColumns.map(([, label]) => escapeCsv(label)).join(","),
        ...rows.map((row) =>
          exportColumns.map(([key]) => escapeCsv(row[key])).join(",")
        ),
      ].join("\n");

      await saveCsvFile("customers-export.csv", csv);

      toast.success(`Exported ${rows.length} customers`, { id: toastId });
    } catch (error) {
      console.error("Customer export failed:", error);
      toast.error(getErrorMessage(error), { id: toastId });
    }
  }, [buildParams]);

  /* ---------------------------------------------------------------- */
  /* Table configuration                                               */
  /* ---------------------------------------------------------------- */

  const columns = useMemo(
    () => [
      { key: "customerCode", label: "Code", sortable: true },
      {
        key: "customerName",
        label: "Customer",
        sortable: true,
        render: (value, row) => (
          <div className="dl-customer">
            <strong>{value}</strong>
            <span>{row.customerType || "Business"}</span>
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
      {
        key: "paymentTerms",
        label: "Payment Terms",
        sortable: true,
        render: renderOptionalText,
      },
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
        render: (value) => Number(value || 0),
      },
      {
        key: "receivableBalance",
        label: "Receivable Balance",
        type: "currency",
        sortable: true,
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (value) => <StatusField value={value} />,
      },
      {
        key: "customerType",
        label: "Customer Type",
        sortable: true,
        visible: false,
      },
      {
        key: "alternatePhone",
        label: "Alternate Phone",
        sortable: true,
        visible: false,
        render: renderOptionalText,
      },
      {
        key: "panNo",
        label: "PAN Number",
        sortable: true,
        visible: false,
        render: renderOptionalText,
      },
      {
        key: "billingAddress",
        label: "Billing Address",
        visible: false,
        render: renderOptionalText,
      },
      {
        key: "shippingAddress",
        label: "Shipping Address",
        visible: false,
        render: renderOptionalText,
      },
      {
        key: "pincode",
        label: "Pincode",
        sortable: true,
        visible: false,
        render: renderOptionalText,
      },
      {
        key: "country",
        label: "Country",
        sortable: true,
        visible: false,
      },
      {
        key: "openingBalance",
        label: "Opening Balance",
        type: "currency",
        sortable: true,
        visible: false,
      },
      {
        key: "openingBalanceType",
        label: "Opening Balance Type",
        sortable: true,
        visible: false,
      },
      {
        key: "priceList",
        label: "Price List",
        sortable: true,
        visible: false,
        render: renderOptionalText,
      },
      {
        key: "notes",
        label: "Notes",
        visible: false,
        render: renderOptionalText,
      },
    ],
    []
  );

  const tableFilters = useMemo(
    () => [
      {
        key: "customerType",
        label: "Customer Type",
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
        key: "openingBalanceType",
        label: "Opening Balance Type",
        type: "select",
        options: ["DEBIT", "CREDIT"],
      },
    ],
    []
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
        key: "customerType",
        value: "Business",
        label: "Business",
        count: stats.business,
      },
      {
        key: "customerType",
        value: "Individual",
        label: "Individual",
        count: stats.individual,
      },
    ],
    [stats]
  );

  /* ---------------------------------------------------------------- */
  /* Row actions                                                       */
  /* ---------------------------------------------------------------- */

  const handleView = (row) => navigate(CUSTOMER_ROUTES.view(row.customerCode));
  const handleEdit = (row) => navigate(CUSTOMER_ROUTES.edit(row.customerCode));

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
      console.error("Customer confirmation action failed:", error);
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleDelete = (row) => {
    openConfirmModal({
      title: "Delete customer?",
      message: `Are you sure you want to delete "${row.customerName}" (${row.customerCode})? The customer will be marked as deleted and its linked ledger will be deactivated.`,
      confirmText: "Delete Customer",

      onConfirm: async () => {
        try {
          await api.customers.delete(row.customerCode);
          toast.success(`${row.customerName} deleted successfully`);
          refreshAll();
        } catch (error) {
          toast.error(getErrorMessage(error));
          throw error;
        }
      },
    });
  };

  /* ---------------------------------------------------------------- */
  /* Bulk status update (single request + confirmation modal)          */
  /* ---------------------------------------------------------------- */

  const handleBulkStatusUpdate = (rows, status) => {
    if (!rows.length) return;

    const ids = rows.map((row) => row._id).filter(Boolean);

    if (!ids.length) {
      toast.error("Select customers before changing status.");
      return;
    }

    const isActivate = status === "Active";

    openConfirmModal({
      type: isActivate ? "info" : "warning",
      title: isActivate ? "Activate customers?" : "Deactivate customers?",
      message: `Are you sure you want to ${
        isActivate ? "activate" : "deactivate"
      } ${rows.length} selected customer${
        rows.length > 1 ? "s" : ""
      }? Their linked ledgers will also be ${
        isActivate ? "reactivated" : "deactivated"
      }.`,
      confirmText: isActivate
        ? `Activate ${rows.length} Customer${rows.length > 1 ? "s" : ""}`
        : `Deactivate ${rows.length} Customer${rows.length > 1 ? "s" : ""}`,

      onConfirm: async () => {
        if (bulkLoadingRef.current) return;
        bulkLoadingRef.current = true;

        try {
          const response = await api.customers.bulkStatus(ids, status);
          const result = response?.data || {};
          const changed = Number(result.updated ?? result.modifiedCount) || 0;
          const skipped = Number(result.skippedCount) || 0;

          if (changed) {
            toast.success(
              `${changed} customer${changed === 1 ? "" : "s"} ${
                isActivate ? "activated" : "deactivated"
              } successfully`
            );
          }

          if (skipped) {
            toast(`${skipped} skipped (already ${status.toLowerCase()})`);
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
      title: "Delete selected customers?",
      message: `Delete ${rows.length} selected customer${
        rows.length > 1 ? "s" : ""
      }? These customers will be marked as deleted and their linked ledgers will be deactivated.`,
      confirmText: `Delete ${rows.length} Customer${rows.length > 1 ? "s" : ""}`,

      onConfirm: async () => {
        const results = await Promise.allSettled(
          rows.map((row) => api.customers.delete(row.customerCode))
        );

        const successCount = results.filter(
          (r) => r.status === "fulfilled"
        ).length;
        const failures = results.filter((r) => r.status === "rejected");

        if (successCount) {
          toast.success(
            `${successCount} customer${
              successCount > 1 ? "s" : ""
            } deleted successfully`
          );
        }

        if (failures.length) {
          toast.error(
            `${failures.length} deletion${
              failures.length > 1 ? "s" : ""
            } failed: ${getErrorMessage(failures[0].reason)}`
          );
        }

        refreshAll();
      },
    });
  };

  /* ---------------------------------------------------------------- */
  /* Import template config                                            */
  /* ---------------------------------------------------------------- */

  const customerImportConfig = {
    templateFileName: "customers-import-template.csv",

    columns: [
      { key: "customerName", example: "ABC Traders" },
      { key: "customerType", example: "Business" },
      { key: "contactPerson", example: "Aditya" },
      { key: "phone", example: "9876543210" },
      { key: "alternatePhone", example: "" },
      { key: "email", example: "accounts@example.com" },
      { key: "gstNo", example: "" },
      { key: "panNo", example: "" },
      { key: "billingAddress", example: "123 Market Road" },
      { key: "shippingAddress", example: "123 Market Road" },
      { key: "city", example: "Belagavi" },
      { key: "state", example: "Karnataka" },
      { key: "pincode", example: "590001" },
      { key: "country", example: "India" },
      { key: "paymentTerms", example: "Net 30" },
      { key: "creditLimit", example: "50000" },
      { key: "creditDays", example: "30" },
      { key: "openingBalance", example: "0" },
      { key: "openingBalanceType", example: "DEBIT" },
      { key: "priceList", example: "Standard" },
      { key: "status", example: "Active" },
      { key: "notes", example: "" },
    ],

    onUpload: csvImport.handleFile,
    onError: (message) => toast.error(message),
  };

  return (
    <>
      <DataList
        title="Customers"
        subtitle="Manage customers and receivable accounts"
        columns={columns}
        data={customers}
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
        storageKey="trustiq-customers"
        searchPlaceholder="Search code, customer, contact, phone, email, GST, city..."
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
        importConfig={customerImportConfig}
        actions={{
          view: handleView,
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
            onClick={() => navigate(CUSTOMER_ROUTES.create)}
          >
            <Plus size={16} />
            <span>New Customer</span>
          </button>
        }
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
        entityName="customer"
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

export default CustomersList;