// import { Plus } from "lucide-react";
// import { useCallback, useEffect, useMemo, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import toast from "react-hot-toast";

// import DataList from "../../components/common/DataList/DataList";
// import StatusField from "../../components/common/StatusField/StatusField";
// import ConfirmModal from "../../components/common/ConfirmModal/ConfirmModal";

// import api from "../../services/api";
// import routes, { buildRoute } from "../../config/routes";

// const INITIAL_CONFIRM_STATE = {
//   open: false,
//   type: "danger",
//   title: "",
//   message: "",
//   confirmText: "Confirm",
//   onConfirm: null,
// };

// // const PURCHASE_BILL_ROUTES = {
// //   create: routes.purchase.createInvoice,

// //   view: (billNumber) =>
// //     buildRoute(routes.purchase.viewInvoice, {
// //       id: encodeURIComponent(billNumber),
// //     }),

// //   edit: (billNumber) =>
// //     buildRoute(routes.purchase.editInvoice, {
// //       id: encodeURIComponent(billNumber),
// //     }),
// // };
// const PURCHASE_BILL_ROUTES = {
//   create: routes.purchase.createInvoice,

//   view: (billNumber) =>
//     `/purchase/invoices/view/${encodeURIComponent(billNumber)}`,

//   edit: (billNumber) =>
//     buildRoute(routes.purchase.editInvoice, {
//       id: encodeURIComponent(billNumber),
//     }),
// };
// const currencyFormatter = new Intl.NumberFormat("en-IN", {
//   style: "currency",
//   currency: "INR",
//   minimumFractionDigits: 2,
//   maximumFractionDigits: 2,
// });

// const formatPaise = (value) =>
//   currencyFormatter.format((Number(value) || 0) / 100);

// const formatDate = (value) => {
//   if (!value) {
//     return "N/A";
//   }

//   const date = new Date(value);

//   if (Number.isNaN(date.getTime())) {
//     return "N/A";
//   }

//   return date.toLocaleDateString("en-IN", {
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//     timeZone: "UTC",
//   });
// };

// const getErrorMessage = (error) => {
//   const responseData = error?.response?.data;

//   if (Array.isArray(responseData?.errors) && responseData.errors.length > 0) {
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

// const getBillList = (response) =>
//   Array.isArray(response?.data?.data) ? response.data.data : [];

// const isDraft = (bill) => bill?.status === "DRAFT";

// function PurchaseBillsList() {
//   const navigate = useNavigate();

//   const [loading, setLoading] = useState(true);
//   const [bills, setBills] = useState([]);

//   const [confirmState, setConfirmState] = useState(INITIAL_CONFIRM_STATE);

//   const [confirmLoading, setConfirmLoading] = useState(false);

//   const loadBills = useCallback(async () => {
//     try {
//       setLoading(true);

//       // DataList currently receives a local array.
//       // Load all pages rather than silently show only the first 100 bills.
//       const firstResponse = await api.purchaseBills.getAll({
//         page: 1,
//         limit: 100,
//       });

//       const records = [...getBillList(firstResponse)];

//       const totalPages = Math.max(
//         1,
//         Number(firstResponse?.data?.pagination?.totalPages) || 1,
//       );

//       for (let page = 2; page <= totalPages; page += 1) {
//         const response = await api.purchaseBills.getAll({
//           page,
//           limit: 100,
//         });

//         records.push(...getBillList(response));
//       }

//       const uniqueRecords = Array.from(
//         new Map(
//           records.map((bill) => [bill._id || bill.billNumber, bill]),
//         ).values(),
//       );

//       setBills(uniqueRecords);
//     } catch (error) {
//       console.error("Unable to load purchase bills:", error);
//       toast.error(getErrorMessage(error));
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     loadBills();
//   }, [loadBills]);

//   const handleView = useCallback(
//   (row) => {
//     if (!row.billNumber) {
//       toast.error("Purchase bill number is missing.");
//       return;
//     }

//     navigate(PURCHASE_BILL_ROUTES.view(row.billNumber));
//   },
//   [navigate],
// );

//   const columns = useMemo(
//     () => [
//       // {
//       //   key: "billNumber",
//       //   label: "Bill Number",
//       //   sortable: true,
//       // },
//       {
//         key: "billNumber",
//         label: "Bill Number",
//         sortable: true,

//         render: (value, row) => (
//           <button
//             type="button"
//             className="doc-link-button"
//             aria-label={`View purchase bill ${value}`}
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
//         key: "supplierName",
//         label: "Supplier",
//         sortable: true,

//         render: (value, row) => (
//           <div className="dl-customer">
//             <strong>{value || "N/A"}</strong>
//             <span>{row.supplierCode || "N/A"}</span>
//           </div>
//         ),
//       },

//       {
//         key: "supplierInvoiceNumber",
//         label: "Supplier Invoice",
//         sortable: true,
//       },

//       {
//         key: "billDate",
//         label: "Bill Date",
//         sortable: true,
//         render: formatDate,
//       },

//       {
//         key: "dueDate",
//         label: "Due Date",
//         sortable: true,
//         render: formatDate,
//       },

//       {
//         key: "totalAmountPaise",
//         label: "Total",
//         type: "number",
//         sortable: true,
//         render: formatPaise,
//       },

//       {
//         key: "paidAmountPaise",
//         label: "Paid",
//         type: "number",
//         sortable: true,
//         render: formatPaise,
//       },

//       {
//         key: "outstandingAmountPaise",
//         label: "Pending Amount",
//         type: "number",
//         sortable: true,

//         render: (value, row) =>
//           isDraft(row) ? (
//             <span className="dl-muted-value">Not posted</span>
//           ) : (
//             formatPaise(value)
//           ),
//       },

//       {
//         key: "status",
//         label: "Status",
//         sortable: true,
//         render: (value) => <StatusField value={value} />,
//       },

//       {
//         key: "paymentStatus",
//         label: "Payment Status",
//         sortable: true,

//         render: (value, row) =>
//           isDraft(row) ? (
//             <span className="dl-muted-value">N/A</span>
//           ) : (
//             <StatusField value={value} />
//           ),
//       },

//       {
//         key: "paymentTerms",
//         label: "Payment Terms",
//         sortable: true,
//         visible: false,
//       },

//       {
//         key: "taxMode",
//         label: "Tax Mode",
//         sortable: true,
//         visible: false,
//       },

//       {
//         key: "taxableAmountPaise",
//         label: "Taxable Amount",
//         type: "number",
//         sortable: true,
//         visible: false,
//         render: formatPaise,
//       },

//       {
//         key: "discountAmountPaise",
//         label: "Discount",
//         type: "number",
//         sortable: true,
//         visible: false,
//         render: formatPaise,
//       },

//       {
//         key: "cgstAmountPaise",
//         label: "CGST",
//         type: "number",
//         sortable: true,
//         visible: false,
//         render: formatPaise,
//       },

//       {
//         key: "sgstAmountPaise",
//         label: "SGST",
//         type: "number",
//         sortable: true,
//         visible: false,
//         render: formatPaise,
//       },

//       {
//         key: "igstAmountPaise",
//         label: "IGST",
//         type: "number",
//         sortable: true,
//         visible: false,
//         render: formatPaise,
//       },

//       {
//         key: "updateStock",
//         label: "Receive Stock",
//         sortable: true,
//         visible: false,
//         render: (value) => (value ? "Yes" : "No"),
//       },

//       {
//         key: "postedAt",
//         label: "Posted On",
//         sortable: true,
//         visible: false,
//         render: formatDate,
//       },

//       {
//         key: "notes",
//         label: "Notes",
//         visible: false,

//         render: (value) => value || <span className="dl-muted-value">N/A</span>,
//       },
//     ],
//     [],
//   );

//   const filters = [
//     {
//       key: "status",
//       label: "Bill Status",
//       type: "select",
//       options: ["DRAFT", "POSTED", "CANCELLED"],
//     },

//     {
//       key: "paymentStatus",
//       label: "Payment Status",
//       type: "select",
//       options: ["UNPAID", "PARTIALLY_PAID", "PAID"],
//     },

//     {
//       key: "taxMode",
//       label: "Tax Mode",
//       type: "select",
//       options: ["NONE", "INTRA_STATE", "INTER_STATE"],
//     },

//     {
//       key: "updateStock",
//       label: "Receive Stock",
//       type: "select",
//       options: [
//         { label: "Yes", value: true },
//         { label: "No", value: false },
//       ],
//     },
//   ];

//   const quickFilters = [
//     {
//       key: "status",
//       value: "",
//       label: "All",
//     },

//     {
//       key: "status",
//       value: "DRAFT",
//       label: "Drafts",
//     },

//     {
//       key: "status",
//       value: "POSTED",
//       label: "Posted",
//     },

//     {
//       key: "status",
//       value: "CANCELLED",
//       label: "Cancelled",
//     },
//   ];

//   // const handleView = (row) => {
//   //   navigate(PURCHASE_BILL_ROUTES.view(row.billNumber));
//   // };

//   const handleEdit = (row) => {
//     if (!isDraft(row)) {
//       toast.error("Only draft purchase bills can be edited.");
//       return;
//     }

//     navigate(PURCHASE_BILL_ROUTES.edit(row.billNumber));
//   };

//   const closeConfirmModal = () => {
//     if (confirmLoading) {
//       return;
//     }

//     setConfirmState(INITIAL_CONFIRM_STATE);
//   };

//   const openConfirmModal = ({
//     type = "danger",
//     title,
//     message,
//     confirmText,
//     onConfirm,
//   }) => {
//     setConfirmState({
//       open: true,
//       type,
//       title,
//       message,
//       confirmText,
//       onConfirm,
//     });
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
//       // The action displays its own error toast.
//       // Leave confirmation open for single-action failures.
//       console.error("Purchase bill action failed:", error);
//     } finally {
//       setConfirmLoading(false);
//     }
//   };

//   const handleDelete = (row) => {
//     if (!isDraft(row)) {
//       toast.error("Only draft purchase bills can be deleted.");
//       return;
//     }

//     openConfirmModal({
//       type: "danger",
//       title: "Delete purchase bill draft?",
//       message:
//         `Delete ${row.billNumber} for ${row.supplierName}? ` +
//         "This draft will be marked as deleted.",
//       confirmText: "Delete Draft",

//       onConfirm: async () => {
//         try {
//           await api.purchaseBills.delete(row.billNumber);

//           setBills((previous) =>
//             previous.filter((bill) => bill._id !== row._id),
//           );

//           toast.success(`${row.billNumber} draft deleted successfully`);
//         } catch (error) {
//           toast.error(getErrorMessage(error));
//           throw error;
//         }
//       },
//     });
//   };

//   const handleBulkPost = (rows) => {
//     if (!rows?.length) {
//       return;
//     }

//     if (rows.some((row) => !isDraft(row))) {
//       toast.error("Select only draft bills for posting.");
//       return;
//     }

//     openConfirmModal({
//       // Uses the existing ConfirmModal type from your shared example.
//       type: "danger",
//       title: "Post selected purchase bills?",
//       message:
//         `Post ${rows.length} draft bill${rows.length > 1 ? "s" : ""}? ` +
//         "This creates accounting entries and receives stock where selected. " +
//         "Posted bills cannot be edited or deleted in this version.",
//       confirmText: `Post ${rows.length} Bill${rows.length > 1 ? "s" : ""}`,

//       onConfirm: async () => {
//         let successCount = 0;
//         const failures = [];

//         // Process separately; each bill has its own backend transaction.
//         for (const row of rows) {
//           try {
//             const response = await api.purchaseBills.post(row.billNumber);

//             const updatedBill = response?.data?.bill;

//             if (updatedBill) {
//               setBills((previous) =>
//                 previous.map((bill) =>
//                   bill._id === updatedBill._id ? updatedBill : bill,
//                 ),
//               );
//             }

//             successCount += 1;
//           } catch (error) {
//             failures.push({
//               billNumber: row.billNumber,
//               message: getErrorMessage(error),
//             });
//           }
//         }

//         if (successCount > 0) {
//           toast.success(
//             `${successCount} purchase bill${
//               successCount > 1 ? "s" : ""
//             } posted successfully`,
//           );
//         }

//         if (failures.length > 0) {
//           toast.error(
//             `${failures.length} bill${
//               failures.length > 1 ? "s" : ""
//             } failed. ${failures[0].billNumber}: ${failures[0].message}`,
//           );
//         }

//         // Reconcile with server data, including uncertain network results.
//         await loadBills();
//       },
//     });
//   };

//   const handleBulkDelete = (rows) => {
//     if (!rows?.length) {
//       return;
//     }

//     if (rows.some((row) => !isDraft(row))) {
//       toast.error("Select only draft bills for deletion.");
//       return;
//     }

//     openConfirmModal({
//       type: "danger",
//       title: "Delete selected drafts?",
//       message: `Delete ${rows.length} purchase bill draft${
//         rows.length > 1 ? "s" : ""
//       }? These drafts will be marked as deleted.`,
//       confirmText: `Delete ${rows.length} Draft${rows.length > 1 ? "s" : ""}`,

//       onConfirm: async () => {
//         const deletedIds = new Set();
//         const failures = [];

//         for (const row of rows) {
//           try {
//             await api.purchaseBills.delete(row.billNumber);
//             deletedIds.add(row._id);
//           } catch (error) {
//             failures.push({
//               billNumber: row.billNumber,
//               message: getErrorMessage(error),
//             });
//           }
//         }

//         setBills((previous) =>
//           previous.filter((bill) => !deletedIds.has(bill._id)),
//         );

//         if (deletedIds.size > 0) {
//           toast.success(
//             `${deletedIds.size} draft${
//               deletedIds.size > 1 ? "s" : ""
//             } deleted successfully`,
//           );
//         }

//         if (failures.length > 0) {
//           toast.error(
//             `${failures.length} deletion${
//               failures.length > 1 ? "s" : ""
//             } failed. ${failures[0].billNumber}: ${failures[0].message}`,
//           );
//         }

//         await loadBills();
//       },
//     });
//   };

//   return (
//     <>
//       <DataList
//         title="Purchase Bills"
//         subtitle="Manage supplier invoices and purchase postings"
//         columns={columns}
//         data={bills}
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
//         storageKey="trustiq-purchase-bills"
//         searchPlaceholder="Search bill, supplier, supplier code, invoice number..."
//         actions={{
//           view: handleView,
//           edit: handleEdit,
//           delete: handleDelete,
//         }}
//         bulkActions={[
//           {
//             key: "post",
//             label: "Post Drafts",
//             action: handleBulkPost,
//           },

//           {
//             key: "delete",
//             label: "Delete Drafts",
//             danger: true,
//             action: handleBulkDelete,
//           },
//         ]}
//         onRefresh={loadBills}
//         addButton={
//           <button
//             type="button"
//             className="so-primary-button"
//             onClick={() => navigate(PURCHASE_BILL_ROUTES.create)}
//           >
//             <Plus size={16} />
//             <span>New Purchase Bill</span>
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
//     </>
//   );
// }

// export default PurchaseBillsList;

import { Plus } from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import DataList from "../../components/common/DataList/DataList";
import StatusField from "../../components/common/StatusField/StatusField";
import ConfirmModal from "../../components/common/ConfirmModal/ConfirmModal";

import { saveCsvFile } from "../../components/common/DataList/fileDownload";

import api from "../../services/api";
import routes, { buildRoute } from "../../config/routes";

// import "./PurchaseBillsList.css";

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

const SERVER_SORTING_ENABLED = false;

const PAGE_SIZE_OPTIONS = [20, 50, 100];
const SEARCH_DEBOUNCE_MS = 400;
const EXPORT_BATCH_SIZE = 100;

const BILL_STATUSES = [
  "DRAFT",
  "POSTED",
  "CANCELLED",
];

const SORT_FIELDS = new Set([
  "billNumber",
  "supplierInvoiceNumber",
  "billDate",
  "dueDate",
  "totalAmountPaise",
  "paidAmountPaise",
  "outstandingAmountPaise",
  "status",
  "paymentStatus",
  "paymentTerms",
  "taxMode",
  "taxableAmountPaise",
  "discountAmountPaise",
  "cgstAmountPaise",
  "sgstAmountPaise",
  "igstAmountPaise",
  "updateStock",
  "postedAt",
]);

const PURCHASE_BILL_ROUTES = {
  create: routes.purchase.createInvoice,

  view: (billNumber) =>
    `/purchase/invoices/view/${encodeURIComponent(
      billNumber,
    )}`,

  edit: (billNumber) =>
    buildRoute(routes.purchase.editInvoice, {
      id: encodeURIComponent(billNumber),
    }),
};

const EMPTY_CONFIRM = {
  open: false,
  action: "",
  targets: [],
};

const isDraft = (bill) => bill?.status === "DRAFT";

/* ------------------------------------------------------------------ */
/* Formatting and response helpers                                     */
/* ------------------------------------------------------------------ */

const currencyFormatter = new Intl.NumberFormat(
  "en-IN",
  {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  },
);

const formatPaise = (value) =>
  currencyFormatter.format(
    (Number(value) || 0) / 100,
  );

const formatDate = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

const getErrorMessage = (error) => {
  const data = error?.response?.data;

  if (
    Array.isArray(data?.errors) &&
    data.errors.length
  ) {
    return data.errors
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.message ||
            item?.msg ||
            String(item),
      )
      .join(", ");
  }

  if (typeof data?.message === "string") {
    return data.message;
  }

  if (typeof data?.error === "string") {
    return data.error;
  }

  return (
    error?.message ||
    "Something went wrong. Please try again."
  );
};

const readBillPage = (response) => {
  const body = response?.data;

  const data = Array.isArray(body?.data)
    ? body.data
    : Array.isArray(body?.data?.bills)
      ? body.data.bills
      : Array.isArray(body?.bills)
        ? body.bills
        : [];

  const pagination =
    body?.pagination || body?.data?.pagination;

  const rawTotal = pagination?.total;

  if (
    rawTotal === undefined ||
    rawTotal === null ||
    !Number.isFinite(Number(rawTotal)) ||
    Number(rawTotal) < 0
  ) {
    throw new Error(
      "Purchase Bills API must return pagination.total for server-side pagination.",
    );
  }

  return {
    data,
    total: Number(rawTotal),
    pagination,
  };
};

const csvCell = (value) => {
  let text = String(value ?? "");

  if (/^\s*[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
};

const csvDate = (value) => {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : date.toISOString().slice(0, 10);
};

const isUncertainRequest = (error) => {
  const status = error?.response?.status;

  return !status || status >= 500 || status === 408;
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

function PurchaseBillsList() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState([]);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [filterValues, setFilterValues] =
    useState({});

  const [sort, setSort] = useState({
    key: "billDate",
    direction: "desc",
  });

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] =
    useState(true);
  const [statsError, setStatsError] = useState("");

  const [confirm, setConfirm] =
    useState(EMPTY_CONFIRM);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [actionFinished, setActionFinished] =
    useState(false);

  const [actionFailures, setActionFailures] =
    useState([]);

  const [progress, setProgress] = useState({
    done: 0,
    total: 0,
  });

  const [exporting, setExporting] = useState(false);

  const mountedRef = useRef(false);
  const loadSequence = useRef(0);
  const statsSequence = useRef(0);
  const actionLock = useRef(false);
  const exportLock = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      loadSequence.current += 1;
      statsSequence.current += 1;
    };
  }, []);

  /* ---------------------------------------------------------------- */
  /* Debounced search                                                  */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    const next = searchInput.trim();

    if (next === search) return undefined;

    const timer = window.setTimeout(() => {
      setSearch(next);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [searchInput, search]);

  const buildParams = useCallback(
    (extra = {}) => {
      const params = { ...extra };

      if (search) {
        params.search = search;
      }

      for (const key of [
        "status",
        "paymentStatus",
        "taxMode",
      ]) {
        if (filterValues[key]) {
          params[key] = filterValues[key];
        }
      }

      /*
       * Preserve false: a truthiness check would drop
       * the "Receive Stock: No" filter.
       */
      if (
        filterValues.updateStock === true ||
        filterValues.updateStock === "true"
      ) {
        params.updateStock = true;
      } else if (
        filterValues.updateStock === false ||
        filterValues.updateStock === "false"
      ) {
        params.updateStock = false;
      }

      if (SERVER_SORTING_ENABLED) {
        params.sortBy = sort.key;
        params.sortOrder = sort.direction;
      }

      return params;
    },
    [search, filterValues, sort],
  );

  /* ---------------------------------------------------------------- */
  /* Load only the requested page                                      */
  /* ---------------------------------------------------------------- */

  const loadBills = useCallback(async () => {
    if (!mountedRef.current) return;

    const sequence = ++loadSequence.current;

    const current = () =>
      mountedRef.current &&
      sequence === loadSequence.current;

    setLoading(true);
    setLoadError("");

    try {
      const response =
        await api.purchaseBills.getAll(
          buildParams({
            page,
            limit: pageSize,
          }),
        );

      if (!current()) return;

      const result = readBillPage(response);

      const lastPage = Math.max(
        1,
        Math.ceil(result.total / pageSize),
      );

      if (page > lastPage) {
        setPage(lastPage);
        return;
      }

      setBills(result.data);
      setTotal(result.total);
    } catch (error) {
      if (!current()) return;

      const message = getErrorMessage(error);

      setBills([]);
      setTotal(0);
      setLoadError(message);

      toast.error(message);
    } finally {
      if (current()) {
        setLoading(false);
      }
    }
  }, [buildParams, page, pageSize]);

  useEffect(() => {
    loadBills();

    return () => {
      loadSequence.current += 1;
    };
  }, [loadBills]);

  /* ---------------------------------------------------------------- */
  /* Global quick-filter counts                                        */
  /* ---------------------------------------------------------------- */

  const loadStats = useCallback(async () => {
    if (!mountedRef.current) return;

    const sequence = ++statsSequence.current;

    setStatsLoading(true);
    setStatsError("");

    try {
      const nextStats = {};

      // Sequential bounded requests; list rendering does not wait.
      for (const status of ["all", ...BILL_STATUSES]) {
        if (
          !mountedRef.current ||
          sequence !== statsSequence.current
        ) {
          return;
        }

        const response =
          await api.purchaseBills.getAll({
            page: 1,
            limit: 20,
            ...(status === "all"
              ? {}
              : { status }),
          });

        nextStats[status] =
          readBillPage(response).total;
      }

      if (
        mountedRef.current &&
        sequence === statsSequence.current
      ) {
        setStats(nextStats);
      }
    } catch (error) {
      if (
        mountedRef.current &&
        sequence === statsSequence.current
      ) {
        setStats(null);
        setStatsError(
          "Bill counts could not be loaded. Refresh to retry.",
        );

        console.error(
          "Unable to load bill counts:",
          error,
        );
      }
    } finally {
      if (
        mountedRef.current &&
        sequence === statsSequence.current
      ) {
        setStatsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const refreshAll = useCallback(() => {
    return Promise.all([
      loadBills(),
      loadStats(),
    ]);
  }, [loadBills, loadStats]);

  /* ---------------------------------------------------------------- */
  /* Table callbacks                                                   */
  /* ---------------------------------------------------------------- */

  const handleSearch = useCallback((value) => {
    setSearchInput(String(value ?? ""));
  }, []);

  const handleFilterChange = useCallback((next) => {
    setFilterValues(next || {});
    setPage(1);
  }, []);

  const handleSort = useCallback((next) => {
    if (!SERVER_SORTING_ENABLED) return;

    const valid =
      SORT_FIELDS.has(next?.key) &&
      ["asc", "desc"].includes(next?.direction);

    setSort(
      valid
        ? {
            key: next.key,
            direction: next.direction,
          }
        : {
            key: "billDate",
            direction: "desc",
          },
    );

    setPage(1);
  }, []);

  const handlePageChange = useCallback((next) => {
    setPage(Math.max(1, Number(next) || 1));
  }, []);

  const handlePageSizeChange = useCallback((next) => {
    const size = Number(next);

    if (!PAGE_SIZE_OPTIONS.includes(size)) return;

    setPageSize(size);
    setPage(1);
  }, []);

  /* ---------------------------------------------------------------- */
  /* Navigation                                                        */
  /* ---------------------------------------------------------------- */

  const handleView = useCallback(
    (row) => {
      if (!row?.billNumber) {
        toast.error(
          "Purchase bill number is missing.",
        );
        return;
      }

      navigate(
        PURCHASE_BILL_ROUTES.view(row.billNumber),
      );
    },
    [navigate],
  );

  const handleEdit = useCallback(
    (row) => {
      if (!row?.billNumber) {
        toast.error(
          "Purchase bill number is missing.",
        );
        return;
      }

      if (!isDraft(row)) {
        toast.error(
          "Only draft purchase bills can be edited.",
        );
        return;
      }

      navigate(
        PURCHASE_BILL_ROUTES.edit(row.billNumber),
      );
    },
    [navigate],
  );

  /* ---------------------------------------------------------------- */
  /* Draft posting and deletion                                        */
  /* ---------------------------------------------------------------- */

  const openAction = (input, action) => {
    if (
      actionLock.current ||
      confirm.open ||
      !["post", "delete"].includes(action)
    ) {
      return;
    }

    const rows = Array.isArray(input)
      ? input
      : [input];

    const targets = Array.from(
      new Map(
        rows
          .filter((row) => row?.billNumber)
          .map((row) => [
            row.billNumber,
            row,
          ]),
      ).values(),
    );

    if (!targets.length) {
      toast.error(
        "Select at least one purchase bill.",
      );
      return;
    }

    // Preserve your original all-drafts requirement.
    if (targets.some((row) => !isDraft(row))) {
      toast.error(
        action === "post"
          ? "Select only draft bills for posting."
          : "Select only draft bills for deletion.",
      );
      return;
    }

    setConfirm({
      open: true,
      action,
      targets,
    });

    setActionFinished(false);
    setActionFailures([]);

    setProgress({
      done: 0,
      total: targets.length,
    });
  };

  const closeConfirm = () => {
    if (actionLock.current) return;

    setConfirm(EMPTY_CONFIRM);
    setActionFailures([]);
    setActionFinished(false);
    setProgress({ done: 0, total: 0 });
  };

  const handleConfirmAction = async () => {
    if (actionLock.current) return;

    if (actionFinished) {
      closeConfirm();
      return;
    }

    const { action } = confirm;
    const targets = [...confirm.targets];

    if (
      !targets.length ||
      !["post", "delete"].includes(action)
    ) {
      return;
    }

    if (
      typeof api.purchaseBills[action] !== "function"
    ) {
      toast.error(
        `Purchase Bills API "${action}" is not configured.`,
      );
      return;
    }

    actionLock.current = true;
    setActionLoading(true);
    setActionFailures([]);

    setProgress({
      done: 0,
      total: targets.length,
    });

    let successCount = 0;
    const failures = [];

    try {
      /*
       * Each operation has its own backend transaction.
       * Preserve existing API signatures: no invented
       * version or bulk-endpoint payloads.
       */
      for (let index = 0; index < targets.length; index++) {
        if (!mountedRef.current) break;

        const row = targets[index];

        try {
          const response =
            await api.purchaseBills[action](
              row.billNumber,
            );

          if (response?.data?.success === false) {
            const error = new Error(
              response.data.message ||
                "The server reported an unsuccessful action.",
            );

            error.response = response;
            throw error;
          }

          if (action === "post") {
            const updated = response?.data?.bill;

            if (
              updated?.billNumber !== row.billNumber ||
              updated.status !== "POSTED" ||
              !updated.journalId
            ) {
              throw new Error(
                "The server did not confirm a posted bill with a journal. Verify this bill before retrying.",
              );
            }
          }

          successCount += 1;
        } catch (error) {
          failures.push({
            billNumber: row.billNumber,
            message: getErrorMessage(error),
            uncertain: isUncertainRequest(error),
          });
        } finally {
          if (mountedRef.current) {
            setProgress({
              done: index + 1,
              total: targets.length,
            });
          }
        }
      }

      if (!mountedRef.current) return;

      if (successCount) {
        toast.success(
          `${successCount} purchase bill${
            successCount === 1 ? "" : "s"
          } ${
            action === "post"
              ? "posted"
              : "deleted"
          } successfully.`,
        );
      }

      if (failures.length) {
        setActionFailures(failures);
        setActionFinished(true);

        toast.error(
          `${failures.length} bill${
            failures.length === 1 ? "" : "s"
          } could not be confirmed. Review the results.`,
        );
      } else {
        setConfirm(EMPTY_CONFIRM);
      }

      await refreshAll();
    } finally {
      actionLock.current = false;

      if (mountedRef.current) {
        setActionLoading(false);
      }
    }
  };

  /* ---------------------------------------------------------------- */
  /* CSV export                                                        */
  /* ---------------------------------------------------------------- */

  const handleExport = useCallback(async () => {
    if (exportLock.current) return;

    exportLock.current = true;
    setExporting(true);

    const toastId = toast.loading(
      "Preparing Purchase Bills export...",
    );

    try {
      const firstResponse =
        await api.purchaseBills.getAll(
          buildParams({
            page: 1,
            limit: EXPORT_BATCH_SIZE,
          }),
        );

      const first = readBillPage(firstResponse);

      const actualLimit = Math.max(
        1,
        Number(first.pagination?.limit) ||
          EXPORT_BATCH_SIZE,
      );

      const totalPages = Math.max(
        1,
        Math.ceil(first.total / actualLimit),
      );

      const rows = [...first.data];

      for (
        let currentPage = 2;
        currentPage <= totalPages;
        currentPage++
      ) {
        if (!mountedRef.current) {
          toast.dismiss(toastId);
          return;
        }

        const response =
          await api.purchaseBills.getAll(
            buildParams({
              page: currentPage,
              limit: actualLimit,
            }),
          );

        rows.push(
          ...readBillPage(response).data,
        );

        toast.loading(
          `Exporting page ${currentPage} of ${totalPages}...`,
          { id: toastId },
        );
      }

      if (!mountedRef.current) {
        toast.dismiss(toastId);
        return;
      }

      const uniqueRows = Array.from(
        new Map(
          rows.map((row) => [
            row._id || row.billNumber,
            row,
          ]),
        ).values(),
      );

      const fields = [
        ["Bill Number", (row) => row.billNumber],
        ["Supplier", (row) => row.supplierName],
        ["Supplier Code", (row) => row.supplierCode],
        [
          "Supplier Invoice",
          (row) => row.supplierInvoiceNumber,
        ],
        [
          "Bill Date",
          (row) => csvDate(row.billDate),
        ],
        [
          "Due Date",
          (row) => csvDate(row.dueDate),
        ],
        [
          "Total (Paise)",
          (row) => row.totalAmountPaise,
        ],
        [
          "Paid (Paise)",
          (row) => row.paidAmountPaise,
        ],
        [
          "Outstanding (Paise)",
          (row) =>
            isDraft(row)
              ? ""
              : row.outstandingAmountPaise,
        ],
        ["Status", (row) => row.status],
        [
          "Payment Status",
          (row) =>
            isDraft(row)
              ? ""
              : row.paymentStatus,
        ],
        ["Payment Terms", (row) => row.paymentTerms],
        ["Tax Mode", (row) => row.taxMode],
        [
          "Taxable (Paise)",
          (row) => row.taxableAmountPaise,
        ],
        [
          "Discount (Paise)",
          (row) => row.discountAmountPaise,
        ],
        [
          "CGST (Paise)",
          (row) => row.cgstAmountPaise,
        ],
        [
          "SGST (Paise)",
          (row) => row.sgstAmountPaise,
        ],
        [
          "IGST (Paise)",
          (row) => row.igstAmountPaise,
        ],
        [
          "Receive Stock",
          (row) => (row.updateStock ? "Yes" : "No"),
        ],
        [
          "Posted On",
          (row) => csvDate(row.postedAt),
        ],
        ["Notes", (row) => row.notes],
      ];

      const csv = [
        fields
          .map(([label]) => csvCell(label))
          .join(","),

        ...uniqueRows.map((row) =>
          fields
            .map(([, getter]) =>
              csvCell(getter(row)),
            )
            .join(","),
        ),
      ].join("\r\n");

      await saveCsvFile(
        "purchase-bills-export.csv",
        csv,
      );

      toast.success(
        `Exported ${uniqueRows.length} purchase bills.`,
        { id: toastId },
      );
    } catch (error) {
      toast.error(getErrorMessage(error), {
        id: toastId,
      });
    } finally {
      exportLock.current = false;

      if (mountedRef.current) {
        setExporting(false);
      }
    }
  }, [buildParams]);

  /* ---------------------------------------------------------------- */
  /* Columns                                                           */
  /* ---------------------------------------------------------------- */

  const columns = useMemo(
    () => [
      {
        key: "billNumber",
        label: "Bill Number",
        sortable: SERVER_SORTING_ENABLED,

        render: (value, row) => (
          <button
            type="button"
            className="doc-link-button"
            aria-label={`View purchase bill ${value}`}
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
        key: "supplierName",
        label: "Supplier",

        // Enable only if the backend supports global
        // supplier-name sorting.
        sortable: false,

        render: (value, row) => (
          <div className="dl-customer">
            <strong>{value || "N/A"}</strong>
            <span>{row.supplierCode || "N/A"}</span>
          </div>
        ),
      },

      {
        key: "supplierInvoiceNumber",
        label: "Supplier Invoice",
        sortable: SERVER_SORTING_ENABLED,
      },

      {
        key: "billDate",
        label: "Bill Date",
        sortable: SERVER_SORTING_ENABLED,
        render: formatDate,
      },

      {
        key: "dueDate",
        label: "Due Date",
        sortable: SERVER_SORTING_ENABLED,
        render: formatDate,
      },

      {
        key: "totalAmountPaise",
        label: "Total",
        type: "number",
        sortable: SERVER_SORTING_ENABLED,
        render: formatPaise,
      },

      {
        key: "paidAmountPaise",
        label: "Paid",
        type: "number",
        sortable: SERVER_SORTING_ENABLED,
        render: formatPaise,
      },

      {
        key: "outstandingAmountPaise",
        label: "Pending Amount",
        type: "number",
        sortable: SERVER_SORTING_ENABLED,

        render: (value, row) =>
          isDraft(row) ? (
            <span className="dl-muted-value">
              Not posted
            </span>
          ) : (
            formatPaise(value)
          ),
      },

      {
        key: "status",
        label: "Status",
        sortable: SERVER_SORTING_ENABLED,
        render: (value) => (
          <StatusField value={value} />
        ),
      },

      {
        key: "paymentStatus",
        label: "Payment Status",
        sortable: SERVER_SORTING_ENABLED,

        render: (value, row) =>
          isDraft(row) ? (
            <span className="dl-muted-value">
              N/A
            </span>
          ) : (
            <StatusField value={value} />
          ),
      },

      ...[
        ["paymentTerms", "Payment Terms"],
        ["taxMode", "Tax Mode"],
      ].map(([key, label]) => ({
        key,
        label,
        sortable: SERVER_SORTING_ENABLED,
        visible: false,
      })),

      ...[
        ["taxableAmountPaise", "Taxable Amount"],
        ["discountAmountPaise", "Discount"],
        ["cgstAmountPaise", "CGST"],
        ["sgstAmountPaise", "SGST"],
        ["igstAmountPaise", "IGST"],
      ].map(([key, label]) => ({
        key,
        label,
        type: "number",
        sortable: SERVER_SORTING_ENABLED,
        visible: false,
        render: formatPaise,
      })),

      {
        key: "updateStock",
        label: "Receive Stock",
        sortable: SERVER_SORTING_ENABLED,
        visible: false,
        render: (value) =>
          value ? "Yes" : "No",
      },

      {
        key: "postedAt",
        label: "Posted On",
        sortable: SERVER_SORTING_ENABLED,
        visible: false,
        render: formatDate,
      },

      {
        key: "notes",
        label: "Notes",
        visible: false,

        render: (value) =>
          value || (
            <span className="dl-muted-value">
              N/A
            </span>
          ),
      },
    ],
    [handleView],
  );

  const tableFilters = useMemo(
    () => [
      {
        key: "status",
        label: "Bill Status",
        type: "select",
        options: BILL_STATUSES,
      },
      {
        key: "paymentStatus",
        label: "Payment Status",
        type: "select",
        options: [
          "UNPAID",
          "PARTIALLY_PAID",
          "PAID",
        ],
      },
      {
        key: "taxMode",
        label: "Tax Mode",
        type: "select",
        options: [
          "NONE",
          "INTRA_STATE",
          "INTER_STATE",
        ],
      },
      {
        key: "updateStock",
        label: "Receive Stock",
        type: "select",
        options: [
          { label: "Yes", value: true },
          { label: "No", value: false },
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
        ...(stats !== null
          ? { count: stats.all }
          : {}),
      },
      {
        key: "status",
        value: "DRAFT",
        label: "Drafts",
        ...(stats !== null
          ? { count: stats.DRAFT }
          : {}),
      },
      {
        key: "status",
        value: "POSTED",
        label: "Posted",
        ...(stats !== null
          ? { count: stats.POSTED }
          : {}),
      },
      {
        key: "status",
        value: "CANCELLED",
        label: "Cancelled",
        ...(stats !== null
          ? { count: stats.CANCELLED }
          : {}),
      },
    ],
    [stats],
  );

  const targetCount = confirm.targets.length;
  const posting = confirm.action === "post";

  const confirmTitle = actionFinished
    ? "Purchase Bill action results"
    : posting
      ? "Post selected purchase bills?"
      : "Delete purchase bill drafts?";

  const confirmMessage = actionFinished
    ? "Review the results below. The list and counts have been refreshed."
    : posting
      ? `Post ${targetCount} draft bill${
          targetCount === 1 ? "" : "s"
        }? This creates accounting entries and receives stock where selected.`
      : `Delete ${targetCount} draft bill${
          targetCount === 1 ? "" : "s"
        }? These drafts will be marked as deleted.`;

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <div className="pb-list-page">
      {loadError && (
        <div
          className="pb-list-alert"
          role="alert"
        >
          {loadError}
        </div>
      )}

      {statsError && (
        <div
          className="pb-list-alert"
          role="status"
        >
          {statsError}
        </div>
      )}

      {exporting && (
        <p
          className="pb-list-notice"
          role="status"
        >
          Exporting matching purchase bills...
        </p>
      )}

      <DataList
        title="Purchase Bills"
        subtitle="Manage supplier invoices and purchase postings"
        columns={columns}
        data={bills}
        loading={loading}
        rowKey="_id"
        showCase="list"
        searchable
        filterable
        sortable={SERVER_SORTING_ENABLED}
        selectable
        columnVisibility
        pagination
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
        filters={tableFilters}
        quickFilters={quickFilters}
        storageKey="trustiq-purchase-bills"
        searchPlaceholder="Search bill, supplier, supplier code, invoice number..."
        actions={{
          view: handleView,
          edit: handleEdit,
          delete: (row) =>
            openAction(row, "delete"),
        }}
        bulkActions={[
          {
            key: "post",
            label: "Post Drafts",
            action: (rows) =>
              openAction(rows, "post"),
          },
          {
            key: "delete",
            label: "Delete Drafts",
            danger: true,
            action: (rows) =>
              openAction(rows, "delete"),
          },
        ]}
        onRefresh={refreshAll}
        onExport={handleExport}
        addButton={
          <button
            type="button"
            className="so-primary-button"
            onClick={() =>
              navigate(
                PURCHASE_BILL_ROUTES.create,
              )
            }
          >
            <Plus size={16} />
            <span>New Purchase Bill</span>
          </button>
        }
      />

      <ConfirmModal
        open={confirm.open}
        type="danger"
        title={confirmTitle}
        message={confirmMessage}
        confirmText={
          actionFinished
            ? "Close"
            : `${posting ? "Post" : "Delete"} ${
                targetCount
              } ${posting ? "Bill" : "Draft"}${
                targetCount === 1 ? "" : "s"
              }`
        }
        cancelText="Back"
        loading={actionLoading}
        loadingText={`Processing ${progress.done}/${progress.total}...`}
        onCancel={closeConfirm}
        onConfirm={handleConfirmAction}
      >
        <div className="pb-confirm-content">
          {!actionFinished && posting && (
            <p className="pb-confirm-note">
              Each bill is processed separately.
              Posted bills cannot be edited or deleted
              through these draft actions.
            </p>
          )}

          {actionLoading && (
            <p role="status">
              Processed {progress.done} of{" "}
              {progress.total}.
            </p>
          )}

          {actionFailures.length > 0 && (
            <div
              className="pb-action-errors"
              role="alert"
            >
              <strong>
                Some actions could not be confirmed
              </strong>

              <ul>
                {actionFailures.map((failure) => (
                  <li key={failure.billNumber}>
                    <span>
                      {failure.billNumber}
                    </span>
                    {": "}
                    {failure.message}

                    {failure.uncertain && (
                      <small>
                        Result may be uncertain. Open
                        this bill to verify its status
                        before retrying.
                      </small>
                    )}
                  </li>
                ))}
              </ul>

              <p>
                No automatic retry was performed.
                Close this dialog, verify the affected
                bills, and select any remaining drafts
                again if appropriate.
              </p>
            </div>
          )}
        </div>
      </ConfirmModal>
    </div>
  );
}

export default PurchaseBillsList;