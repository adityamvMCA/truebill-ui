// import {
//   useCallback,
//   useEffect,
//   useMemo,
//   useRef,
//   useState,
// } from "react";

// import { useNavigate } from "react-router-dom";

// import {
//   Plus,
//   Truck,
//   IndianRupee,
//   CheckCircle2,
//   Receipt,
//   Printer,
// } from "lucide-react";

// import toast from "react-hot-toast";

// import salesInvoiceApi from "../../../services/modules/salesInvoiceApi";
// import routes from "../../../config/routes";

// import {
//   SALES_PATHS,
//   formatDate,
//   formatPaise,
//   getErrors,
//   useTenantRevision,
// } from "./salesInvoiceUtils";

// import DataList from "../../../components/common/DataList/DataList";
// import ConfirmModal from "../../../components/common/ConfirmModal/ConfirmModal";
// import StatusField from "../../../components/common/StatusField/StatusField";

// import { saveCsvFile } from "../../../components/common/DataList/fileDownload";

// import EwayBillModal from "./EwayBillModal";

// import {
//   PrintInvoiceButton,
// } from "../../../invoice-templates/TemplateManager";

// import "../../../styles/invoice-common1.css";
// import "../../../styles/salesInvoicePayment.css";
// import "./SalesInvoicesList.css";
// import ShareInvoiceButton from "./ShareInvoice";

// /* ------------------------------------------------------------------ */
// /* Configuration                                                       */
// /* ------------------------------------------------------------------ */

// const SERVER_SORTING_ENABLED = false;

// const PAGE_SIZE_OPTIONS = [20, 50, 100];
// const SEARCH_DEBOUNCE_MS = 400;
// const EXPORT_BATCH_SIZE = 100;

// const INVOICE_STATUSES = [
//   "CREATED",
//   "POSTED",
//   "CANCELLED",
// ];

// const SORT_FIELDS = new Set([
//   "invoiceNumber",
//   "invoiceDate",
//   "dueDate",
//   "totalAmountPaise",
//   "paidAmountPaise",
//   "outstandingAmountPaise",
//   "status",
//   "paymentStatus",
//   "paymentTerms",
//   "taxMode",
//   "taxableAmountPaise",
//   "discountAmountPaise",
//   "cgstAmountPaise",
//   "sgstAmountPaise",
//   "igstAmountPaise",
//   "updateStock",
//   "postedAt",
//   "createdAt",
// ]);

// const INITIAL_CONFIRM = {
//   open: false,
//   action: "",
//   rows: [],
// };

// const FILTERS = [
//   {
//     key: "status",
//     label: "Invoice Status",
//     type: "select",
//     options: INVOICE_STATUSES,
//   },
//   {
//     key: "paymentStatus",
//     label: "Payment Status",
//     type: "select",
//     options: [
//       "UNPAID",
//       "PARTIALLY_PAID",
//       "PAID",
//     ],
//   },
//   {
//     key: "taxMode",
//     label: "Tax Mode",
//     type: "select",
//     options: [
//       "NONE",
//       "INTRA_STATE",
//       "INTER_STATE",
//     ],
//   },
//   {
//     key: "updateStock",
//     label: "Deduct Stock",
//     type: "select",
//     options: [
//       { label: "Yes", value: true },
//       { label: "No", value: false },
//     ],
//   },
// ];

// const isCreated = (invoice) =>
//   invoice?.status === "CREATED";

// const canReceivePayment = (row) =>
//   row?.status === "POSTED" &&
//   Number(row?.outstandingAmountPaise) > 0 &&
//   row?.paymentStatus !== "PAID";

// /* ------------------------------------------------------------------ */
// /* Response helpers                                                    */
// /* ------------------------------------------------------------------ */

// const getErrorMessage = (error) => {
//   const messages = getErrors(error);

//   if (
//     Array.isArray(messages) &&
//     messages.length
//   ) {
//     return messages.join(", ");
//   }

//   return (
//     error?.response?.data?.message ||
//     error?.message ||
//     "Unable to complete the request."
//   );
// };

// const assertSuccess = (response) => {
//   if (response?.data?.success !== true) {
//     const error = new Error(
//       response?.data?.message ||
//         "Request failed.",
//     );

//     error.response = response;
//     throw error;
//   }
// };

// const extractInvoiceRecord = (response) => {
//   const body = response?.data;

//   return (
//     body?.invoice ||
//     body?.data?.invoice ||
//     (
//       body?.data?.invoiceNumber
//         ? body.data
//         : null
//     ) ||
//     (
//       body?.invoiceNumber
//         ? body
//         : null
//     )
//   );
// };

// const fetchFullInvoice = async (
//   invoiceNumber,
// ) => {
//   const response =
//     await salesInvoiceApi.getByNumber(
//       invoiceNumber,
//     );

//   if (response?.data?.success === false) {
//     const error = new Error(
//       response.data.message ||
//         "Unable to load invoice.",
//     );

//     error.response = response;
//     throw error;
//   }

//   const invoice =
//     extractInvoiceRecord(response);

//   if (
//     !invoice?._id ||
//     invoice.invoiceNumber !== invoiceNumber
//   ) {
//     throw new Error(
//       "The server did not return the requested invoice.",
//     );
//   }

//   return invoice;
// };

// const readInvoicePage = (response) => {
//   assertSuccess(response);

//   const body = response.data;

//   const records = Array.isArray(body?.data)
//     ? body.data
//     : Array.isArray(body?.data?.invoices)
//       ? body.data.invoices
//       : Array.isArray(body?.invoices)
//         ? body.invoices
//         : null;

//   if (!records) {
//     throw new Error(
//       "Invalid sales invoice list response.",
//     );
//   }

//   const pagination =
//     body?.pagination ||
//     body?.data?.pagination;

//   const rawTotal = pagination?.total;

//   if (
//     rawTotal === undefined ||
//     rawTotal === null ||
//     !Number.isFinite(Number(rawTotal)) ||
//     Number(rawTotal) < 0
//   ) {
//     throw new Error(
//       "Sales invoice list must return pagination.total.",
//     );
//   }

//   return {
//     data: records,
//     total: Number(rawTotal),
//     pagination,
//   };
// };

// const uniqueInvoices = (records) =>
//   Array.from(
//     new Map(
//       records.map((record) => [
//         record._id || record.invoiceNumber,
//         record,
//       ]),
//     ).values(),
//   );

// /* ------------------------------------------------------------------ */
// /* Stored e-way bill state                                             */
// /* ------------------------------------------------------------------ */

// const getEwayState = (row) => {
//   const ewb = row?.ewayBill || {};

//   if (ewb.status === "GENERATED") {
//     const validUntil = ewb.validUntil
//       ? new Date(ewb.validUntil)
//       : null;

//     const expired =
//       validUntil &&
//       !Number.isNaN(validUntil.getTime()) &&
//       validUntil <= new Date();

//     return expired
//       ? "EXPIRED"
//       : "GENERATED";
//   }

//   if (row?.status === "CANCELLED") {
//     return null;
//   }

//   if (ewb.status === "CANCELLED") {
//     return "CANCELLED";
//   }

//   if (!row?.ewayBillRequired) {
//     return null;
//   }

//   return row.status === "POSTED"
//     ? "PENDING"
//     : "AFTER_POSTING";
// };

// const canGenerateEwayBill = (row) =>
//   row?.status === "POSTED" &&
//   Boolean(row?.ewayBillRequired) &&
//   row?.ewayBill?.status !== "GENERATED";

// /* ------------------------------------------------------------------ */
// /* Cell components                                                     */
// /* ------------------------------------------------------------------ */

// function EwayBillCell({
//   row,
//   onGenerate,
//   disabled,
// }) {
//   const state = getEwayState(row);
//   const ewb = row.ewayBill || {};

//   if (
//     state === "GENERATED" ||
//     state === "EXPIRED"
//   ) {
//     return (
//       <small>
//         {state === "EXPIRED"
//           ? "EWB Expired"
//           : `EWB ${ewb.ewbNumber || ""}`}
//       </small>
//     );
//   }

//   if (canGenerateEwayBill(row)) {
//     return (
//       <div>
//         <button
//           type="button"
//           className="so-primary-button"
//           disabled={disabled}
//           onClick={(event) => {
//             event.stopPropagation();
//             onGenerate(row.invoiceNumber);
//           }}
//         >
//           <Truck size={16} />

//           <span>
//             {state === "CANCELLED"
//               ? "Generate Again"
//               : "Generate E-Way Bill"}
//           </span>
//         </button>
//       </div>
//     );
//   }

//   if (state === "AFTER_POSTING") {
//     return <small>Post invoice first</small>;
//   }

//   return (
//     <span className="dl-muted-value">—</span>
//   );
// }

// function PaymentCell({
//   row,
//   onReceive,
//   disabled,
// }) {
//   if (row?.status !== "POSTED") {
//     return (
//       <span className="dl-muted-value">—</span>
//     );
//   }

//   const receipts = Array.isArray(
//     row.receiptNumbers,
//   )
//     ? row.receiptNumbers
//     : [];

//   const latest =
//     receipts[receipts.length - 1];

//   const partial =
//     row.paymentStatus === "PARTIALLY_PAID";

//   return (
//     <div className="sip-cell">
//       {canReceivePayment(row) && (
//         <button
//           type="button"
//           className="sip-btn"
//           disabled={disabled}
//           title={
//             partial
//               ? "Receive remaining balance"
//               : "Receive payment"
//           }
//           aria-label={`Receive payment for ${row.invoiceNumber}`}
//           onClick={(event) => {
//             event.stopPropagation();
//             onReceive(row);
//           }}
//         >
//           <span className="sip-btn-icon">
//             <IndianRupee
//               size={14}
//               strokeWidth={2.8}
//             />
//           </span>

//           <span className="sip-btn-text">
//             {partial
//               ? "Receive Balance"
//               : "Receive"}
//           </span>
//         </button>
//       )}

//       {row.paymentStatus === "PAID" && (
//         <span
//           className="sip-badge sip-badge-paid"
//           title={
//             receipts.length
//               ? `Receipts: ${receipts.join(", ")}`
//               : "Fully received"
//           }
//         >
//           <CheckCircle2 size={14} />
//           <span>{latest || "Received"}</span>

//           {receipts.length > 1 && (
//             <em>+{receipts.length - 1}</em>
//           )}
//         </span>
//       )}

//       {latest &&
//         row.paymentStatus !== "PAID" && (
//           <span
//             className="sip-badge sip-badge-receipt"
//             title={`Receipts: ${receipts.join(", ")}`}
//           >
//             <Receipt size={12} />
//             <span>{latest}</span>

//             {receipts.length > 1 && (
//               <em>+{receipts.length - 1}</em>
//             )}
//           </span>
//         )}
//     </div>
//   );
// }


// const csvCell = (value) => {
//   let text = String(value ?? "");

//   if (/^\s*[=+\-@]/.test(text)) {
//     text = `'${text}`;
//   }

//   return `"${text.replace(/"/g, '""')}"`;
// };

// const csvDate = (value) => {
//   if (!value) return "";

//   const date = new Date(value);

//   return Number.isNaN(date.getTime())
//     ? ""
//     : date.toISOString().slice(0, 10);
// };

// const EXPORT_FIELDS = [
//   ["Invoice Number", (row) => row.invoiceNumber],
//   ["Customer", (row) => row.customerName],
//   ["Customer Code", (row) => row.customerCode],
//   [
//     "Invoice Date",
//     (row) => csvDate(row.invoiceDate),
//   ],
//   [
//     "Due Date",
//     (row) => csvDate(row.dueDate),
//   ],
//   [
//     "Total (Paise)",
//     (row) => row.totalAmountPaise,
//   ],
//   [
//     "Paid (Paise)",
//     (row) =>
//       isCreated(row) ? "" : row.paidAmountPaise,
//   ],
//   [
//     "Outstanding (Paise)",
//     (row) =>
//       isCreated(row)
//         ? ""
//         : row.outstandingAmountPaise,
//   ],
//   ["Status", (row) => row.status],
//   [
//     "Payment Status",
//     (row) =>
//       isCreated(row) ? "" : row.paymentStatus,
//   ],
//   [
//     "Receipt Numbers",
//     (row) =>
//       Array.isArray(row.receiptNumbers)
//         ? row.receiptNumbers.join("; ")
//         : "",
//   ],
//   ["Payment Terms", (row) => row.paymentTerms],
//   ["Tax Mode", (row) => row.taxMode],
//   [
//     "Taxable (Paise)",
//     (row) => row.taxableAmountPaise,
//   ],
//   [
//     "Discount (Paise)",
//     (row) => row.discountAmountPaise,
//   ],
//   ["CGST (Paise)", (row) => row.cgstAmountPaise],
//   ["SGST (Paise)", (row) => row.sgstAmountPaise],
//   ["IGST (Paise)", (row) => row.igstAmountPaise],
//   [
//     "Deduct Stock",
//     (row) => (row.updateStock ? "Yes" : "No"),
//   ],
//   [
//     "Posted On",
//     (row) => csvDate(row.postedAt),
//   ],
//   [
//     "E-Way Bill Required",
//     (row) => (row.ewayBillRequired ? "Yes" : "No"),
//   ],
//   [
//     "E-Way Bill State",
//     (row) => getEwayState(row) || "",
//   ],
//   [
//     "E-Way Bill Number",
//     (row) => row.ewayBill?.ewbNumber,
//   ],
//   [
//     "E-Way Bill Valid Until",
//     (row) => row.ewayBill?.validUntil,
//   ],
//   ["Notes", (row) => row.notes],
// ];

// const createCsv = (records) =>
//   [
//     EXPORT_FIELDS
//       .map(([label]) => csvCell(label))
//       .join(","),

//     ...records.map((row) =>
//       EXPORT_FIELDS
//         .map(([, getter]) =>
//           csvCell(getter(row)),
//         )
//         .join(","),
//     ),
//   ].join("\r\n");

// /* ------------------------------------------------------------------ */
// /* Main list                                                           */
// /* ------------------------------------------------------------------ */

// function SalesInvoicesListContent() {
//   const navigate = useNavigate();

//   const [
//     ewayBillInvoiceNumber,
//     setEwayBillInvoiceNumber,
//   ] = useState("");

//   const [loading, setLoading] =
//     useState(true);

//   const [invoices, setInvoices] =
//     useState([]);

//   const [total, setTotal] =
//     useState(0);

//   const [loadError, setLoadError] =
//     useState("");

//   const [page, setPage] =
//     useState(1);

//   const [pageSize, setPageSize] =
//     useState(20);

//   const [searchInput, setSearchInput] =
//     useState("");

//   const [search, setSearch] =
//     useState("");

//   const [filterValues, setFilterValues] =
//     useState({});

//   const [sort, setSort] = useState({
//     key: "invoiceDate",
//     direction: "desc",
//   });

//   const [stats, setStats] =
//     useState(null);

//   const [confirm, setConfirm] =
//     useState(INITIAL_CONFIRM);

//   const [confirmLoading, setConfirmLoading] =
//     useState(false);

//   const [actionFinished, setActionFinished] =
//     useState(false);

//   const [failures, setFailures] =
//     useState([]);

//   const [progress, setProgress] =
//     useState({
//       done: 0,
//       total: 0,
//     });

//   const mounted = useRef(false);
//   const requestNumber = useRef(0);
//   const statsRequest = useRef(0);
//   const actionLock = useRef(false);
//   const exportLock = useRef(false);
//   const refreshRef = useRef(null);

//   const actionsDisabled =
//     confirmLoading ||
//     confirm.open ||
//     Boolean(ewayBillInvoiceNumber);

//   useEffect(() => {
//     mounted.current = true;

//     return () => {
//       mounted.current = false;
//       requestNumber.current += 1;
//       statsRequest.current += 1;
//     };
//   }, []);

//   /* ---------------------------------------------------------------- */
//   /* Search and filters                                                */
//   /* ---------------------------------------------------------------- */

//   useEffect(() => {
//     const nextSearch = searchInput.trim();

//     if (nextSearch === search) {
//       return undefined;
//     }

//     const timer = window.setTimeout(() => {
//       setSearch(nextSearch);
//       setPage(1);
//     }, SEARCH_DEBOUNCE_MS);

//     return () => window.clearTimeout(timer);
//   }, [searchInput, search]);

//   const buildParams = useCallback(
//     (extra = {}) => {
//       const params = { ...extra };

//       if (search) {
//         params.search = search;
//       }

//       for (const key of [
//         "status",
//         "paymentStatus",
//         "taxMode",
//       ]) {
//         if (filterValues[key]) {
//           params[key] = filterValues[key];
//         }
//       }

//       // Preserve the explicit false value.
//       if (
//         filterValues.updateStock === true ||
//         filterValues.updateStock === "true"
//       ) {
//         params.updateStock = true;
//       } else if (
//         filterValues.updateStock === false ||
//         filterValues.updateStock === "false"
//       ) {
//         params.updateStock = false;
//       }

//       if (SERVER_SORTING_ENABLED) {
//         params.sortBy = sort.key;
//         params.sortOrder = sort.direction;
//       }

//       return params;
//     },
//     [search, filterValues, sort],
//   );

//   /* ---------------------------------------------------------------- */
//   /* Load one page only                                                */
//   /* ---------------------------------------------------------------- */

//   const loadInvoices = useCallback(async () => {
//     if (!mounted.current) return;

//     const request = ++requestNumber.current;

//     const isCurrent = () =>
//       mounted.current &&
//       request === requestNumber.current;

//     setLoading(true);
//     setLoadError("");

//     try {
//       const response =
//         await salesInvoiceApi.getAll(
//           buildParams({
//             page,
//             limit: pageSize,
//           }),
//         );

//       if (!isCurrent()) return;

//       const result = readInvoicePage(response);

//       const lastPage = Math.max(
//         1,
//         Math.ceil(result.total / pageSize),
//       );

//       if (page > lastPage) {
//         setPage(lastPage);
//         return;
//       }

//       setInvoices(result.data);
//       setTotal(result.total);
//     } catch (error) {
//       if (!isCurrent()) return;

//       const message = getErrorMessage(error);

//       setInvoices([]);
//       setTotal(0);
//       setLoadError(message);

//       toast.error(message);
//     } finally {
//       if (isCurrent()) {
//         setLoading(false);
//       }
//     }
//   }, [buildParams, page, pageSize]);

//   useEffect(() => {
//     loadInvoices();

//     return () => {
//       requestNumber.current += 1;
//     };
//   }, [loadInvoices]);

//   /* ---------------------------------------------------------------- */
//   /* Global status counts — no count-loading UI                         */
//   /* ---------------------------------------------------------------- */

//   const loadStats = useCallback(async () => {
//     if (!mounted.current) return;

//     const request = ++statsRequest.current;

//     try {
//       const nextStats = {};

//       for (
//         const status of [
//           "all",
//           ...INVOICE_STATUSES,
//         ]
//       ) {
//         if (
//           !mounted.current ||
//           request !== statsRequest.current
//         ) {
//           return;
//         }

//         const response =
//           await salesInvoiceApi.getAll({
//             page: 1,
//             limit: 20,
//             ...(status === "all"
//               ? {}
//               : { status }),
//           });

//         nextStats[status] =
//           readInvoicePage(response).total;
//       }

//       if (
//         mounted.current &&
//         request === statsRequest.current
//       ) {
//         setStats(nextStats);
//       }
//     } catch (error) {
//       if (
//         mounted.current &&
//         request === statsRequest.current
//       ) {
//         setStats(null);

//         console.warn(
//           "Unable to load invoice counts:",
//           error,
//         );
//       }
//     }
//   }, []);

//   useEffect(() => {
//     loadStats();
//   }, [loadStats]);

//   const refreshAll = useCallback(() => {
//     return Promise.all([
//       loadInvoices(),
//       loadStats(),
//     ]);
//   }, [loadInvoices, loadStats]);

//   useEffect(() => {
//     refreshRef.current = refreshAll;
//   }, [refreshAll]);

//   /* ---------------------------------------------------------------- */
//   /* Table callbacks                                                   */
//   /* ---------------------------------------------------------------- */

//   const handleSearch = useCallback((value) => {
//     setSearchInput(String(value ?? ""));
//   }, []);

//   const handleFilterChange = useCallback((next) => {
//     setFilterValues(next || {});
//     setPage(1);
//   }, []);

//   const handleSort = useCallback((next) => {
//     if (!SERVER_SORTING_ENABLED) return;

//     const valid =
//       SORT_FIELDS.has(next?.key) &&
//       ["asc", "desc"].includes(next?.direction);

//     setSort(
//       valid
//         ? {
//             key: next.key,
//             direction: next.direction,
//           }
//         : {
//             key: "invoiceDate",
//             direction: "desc",
//           },
//     );

//     setPage(1);
//   }, []);

//   const handlePageChange = useCallback((next) => {
//     setPage(Math.max(1, Number(next) || 1));
//   }, []);

//   const handlePageSizeChange = useCallback((next) => {
//     const size = Number(next);

//     if (!PAGE_SIZE_OPTIONS.includes(size)) {
//       return;
//     }

//     setPageSize(size);
//     setPage(1);
//   }, []);

//   /* ---------------------------------------------------------------- */
//   /* View, edit, payments, and e-way bills                              */
//   /* ---------------------------------------------------------------- */

//   const handleView = useCallback(
//     (row) => {
//       if (actionLock.current) return;

//       if (!row?.invoiceNumber) {
//         toast.error("Invoice number is missing.");
//         return;
//       }

//       navigate(
//         SALES_PATHS.view(row.invoiceNumber),
//       );
//     },
//     [navigate],
//   );

//   const handleEdit = useCallback(
//     (row) => {
//       if (actionLock.current) return;

//       if (!row?.invoiceNumber) {
//         toast.error("Invoice number is missing.");
//         return;
//       }

//       if (!isCreated(row)) {
//         toast.error(
//           "Only created sales invoices can be edited.",
//         );
//         return;
//       }

//       if (row.sourceSalesOrderId) {
//         toast.error(
//           "Order-linked invoices cannot be edited. Delete and recreate from the Sales Order.",
//         );
//         return;
//       }

//       navigate(
//         SALES_PATHS.edit(row.invoiceNumber),
//       );
//     },
//     [navigate],
//   );

//   const openEwayBill = useCallback(
//     (invoiceNumber) => {
//       if (
//         actionLock.current ||
//         confirm.open ||
//         ewayBillInvoiceNumber
//       ) {
//         return;
//       }

//       if (!invoiceNumber) {
//         toast.error("Invoice number is missing.");
//         return;
//       }

//       setEwayBillInvoiceNumber(invoiceNumber);
//     },
//     [confirm.open, ewayBillInvoiceNumber],
//   );

//   const handleReceivePayment = useCallback(
//     (row) => {
//       if (
//         actionLock.current ||
//         confirm.open ||
//         ewayBillInvoiceNumber
//       ) {
//         return;
//       }

//       if (!canReceivePayment(row)) {
//         toast.error(
//           "This invoice is not eligible to receive payment.",
//         );
//         return;
//       }

//       const customerId =
//         row.customerId?._id ||
//         row.customerId;

//       if (!customerId || !row._id) {
//         toast.error(
//           "Customer or invoice ID is missing.",
//         );
//         return;
//       }

//       const params = new URLSearchParams({
//         customerId: String(customerId),
//         invoiceId: String(row._id),
//       });

//       navigate(
//         `${routes.customerReceipts.create}?${params.toString()}`,
//       );
//     },
//     [
//       navigate,
//       confirm.open,
//       ewayBillInvoiceNumber,
//     ],
//   );

//   const handleEwayBillUpdated = useCallback(
//     (updatedInvoice) => {
//       if (!mounted.current) return;

//       requestNumber.current += 1;
//       setLoading(false);

//       setInvoices((previous) =>
//         previous.map((item) =>
//           item.invoiceNumber ===
//           updatedInvoice.invoiceNumber
//             ? {
//                 ...item,
//                 ...updatedInvoice,
//               }
//             : item,
//         ),
//       );

//       void refreshRef.current?.();
//     },
//     [],
//   );

//   /* ---------------------------------------------------------------- */
//   /* Posting/deletion confirmation                                     */
//   /* ---------------------------------------------------------------- */

//   const openAction = (input, action) => {
//     if (
//       actionLock.current ||
//       confirm.open ||
//       ewayBillInvoiceNumber ||
//       !["post", "delete"].includes(action)
//     ) {
//       return;
//     }

//     const rows = uniqueInvoices(
//       (Array.isArray(input) ? input : [input])
//         .filter(Boolean),
//     );

//     if (!rows.length) {
//       toast.error(
//         "Select at least one sales invoice.",
//       );
//       return;
//     }

//     if (
//       rows.some(
//         (row) =>
//           !row._id ||
//           !row.invoiceNumber,
//       )
//     ) {
//       toast.error(
//         "A selected invoice is missing its ID or number.",
//       );
//       return;
//     }

//     if (rows.some((row) => !isCreated(row))) {
//       toast.error(
//         "Select only created sales invoices.",
//       );
//       return;
//     }

//     setConfirm({
//       open: true,
//       action,
//       rows,
//     });

//     setFailures([]);
//     setActionFinished(false);

//     setProgress({
//       done: 0,
//       total: rows.length,
//     });
//   };

//   const closeConfirm = () => {
//     if (actionLock.current) return;

//     setConfirm(INITIAL_CONFIRM);
//     setFailures([]);
//     setActionFinished(false);
//     setProgress({ done: 0, total: 0 });
//   };

//   const handleConfirm = async () => {
//     if (actionLock.current) return;

//     if (actionFinished) {
//       closeConfirm();
//       return;
//     }

//     const action = confirm.action;
//     const rows = [...confirm.rows];

//     if (
//       !rows.length ||
//       !["post", "delete"].includes(action)
//     ) {
//       return;
//     }

//     if (
//       typeof salesInvoiceApi[action] !==
//       "function"
//     ) {
//       toast.error(
//         `Sales Invoice API "${action}" is not configured.`,
//       );
//       return;
//     }

//     actionLock.current = true;

//     requestNumber.current += 1;
//     statsRequest.current += 1;

//     setLoading(false);
//     setConfirmLoading(true);
//     setFailures([]);

//     setProgress({
//       done: 0,
//       total: rows.length,
//     });

//     let successCount = 0;
//     const failed = [];

//     try {
//       for (let index = 0; index < rows.length; index++) {
//         if (!mounted.current) break;

//         const selected = rows[index];
//         let writeStarted = false;

//         try {
//           const latest =
//             await fetchFullInvoice(
//               selected.invoiceNumber,
//             );

//           if (!mounted.current) break;

//           if (
//             String(latest._id) !==
//             String(selected._id)
//           ) {
//             throw new Error(
//               "The server returned a different invoice.",
//             );
//           }

//           if (!isCreated(latest)) {
//             throw new Error(
//               `Invoice is now ${latest.status}. Only CREATED invoices are eligible.`,
//             );
//           }

//           /*
//            * List projections may omit __v.
//            * Compare versions when the selected row contains it.
//            */
//           if (
//             Number.isSafeInteger(selected.__v) &&
//             latest.__v !== selected.__v
//           ) {
//             throw new Error(
//               "This invoice changed. Review the refreshed invoice before trying again.",
//             );
//           }

//           if (!mounted.current) break;

//           writeStarted = true;

//           // Preserve your original API signatures.
//           const response =
//             await salesInvoiceApi[action](
//               selected.invoiceNumber,
//             );

//           assertSuccess(response);

//           if (action === "post") {
//             let posted =
//               extractInvoiceRecord(response);

//             /*
//              * Some APIs return success without the invoice.
//              * Read it back to verify the posting result.
//              */
//             if (
//               !posted ||
//               posted.invoiceNumber !==
//                 selected.invoiceNumber ||
//               posted.status !== "POSTED"
//             ) {
//               posted = await fetchFullInvoice(
//                 selected.invoiceNumber,
//               );
//             }

//             if (posted.status !== "POSTED") {
//               throw new Error(
//                 "Posting was not confirmed. Verify this invoice before retrying.",
//               );
//             }
//           }

//           successCount += 1;
//         } catch (error) {
//           const status =
//             error?.response?.status;

//           failed.push({
//             id: String(selected._id),
//             invoiceNumber:
//               selected.invoiceNumber,
//             message: getErrorMessage(error),
//             uncertain:
//               writeStarted &&
//               (
//                 !status ||
//                 status >= 500 ||
//                 status === 408
//               ),
//           });
//         } finally {
//           if (mounted.current) {
//             setProgress({
//               done: index + 1,
//               total: rows.length,
//             });
//           }
//         }
//       }

//       if (!mounted.current) return;

//       if (successCount) {
//         toast.success(
//           `${successCount} invoice${
//             successCount === 1 ? "" : "s"
//           } ${
//             action === "post"
//               ? "posted"
//               : "deleted"
//           } successfully.`,
//         );
//       }

//       if (failed.length) {
//         setFailures(failed);
//         setActionFinished(true);

//         toast.error(
//           `${failed.length} action${
//             failed.length === 1 ? "" : "s"
//           } could not be confirmed.`,
//         );
//       } else {
//         setConfirm(INITIAL_CONFIRM);
//       }

//       await refreshRef.current?.();
//     } finally {
//       actionLock.current = false;

//       if (mounted.current) {
//         setConfirmLoading(false);
//       }
//     }
//   };

//   /* ---------------------------------------------------------------- */
//   /* CSV export                                                        */
//   /* ---------------------------------------------------------------- */

//   const handleExportSelected = useCallback(
//     async (rows) => {
//       if (exportLock.current) return;

//       if (
//         !Array.isArray(rows) ||
//         !rows.length
//       ) {
//         toast.error(
//           "Select at least one invoice.",
//         );
//         return;
//       }

//       exportLock.current = true;

//       const toastId = toast.loading(
//         "Exporting selected invoices...",
//       );

//       try {
//         const records =
//           uniqueInvoices(rows);

//         await saveCsvFile(
//           "sales-invoices-selected.csv",
//           createCsv(records),
//         );

//         toast.success(
//           `Exported ${records.length} invoices.`,
//           { id: toastId },
//         );
//       } catch (error) {
//         toast.error(getErrorMessage(error), {
//           id: toastId,
//         });
//       } finally {
//         exportLock.current = false;
//       }
//     },
//     [],
//   );

//   const handleExport = useCallback(async () => {
//     if (exportLock.current) return;

//     exportLock.current = true;

//     const toastId = toast.loading(
//       "Preparing Sales Invoice export...",
//     );

//     try {
//       const firstResponse =
//         await salesInvoiceApi.getAll(
//           buildParams({
//             page: 1,
//             limit: EXPORT_BATCH_SIZE,
//           }),
//         );

//       const first =
//         readInvoicePage(firstResponse);

//       const actualLimit = Math.max(
//         1,
//         Number(first.pagination?.limit) ||
//           EXPORT_BATCH_SIZE,
//       );

//       const totalPages = Math.max(
//         1,
//         Math.ceil(first.total / actualLimit),
//       );

//       const records = [...first.data];

//       for (
//         let currentPage = 2;
//         currentPage <= totalPages;
//         currentPage++
//       ) {
//         if (!mounted.current) {
//           toast.dismiss(toastId);
//           return;
//         }

//         const response =
//           await salesInvoiceApi.getAll(
//             buildParams({
//               page: currentPage,
//               limit: actualLimit,
//             }),
//           );

//         records.push(
//           ...readInvoicePage(response).data,
//         );

//         toast.loading(
//           `Exporting page ${currentPage} of ${totalPages}...`,
//           { id: toastId },
//         );
//       }

//       if (!mounted.current) {
//         toast.dismiss(toastId);
//         return;
//       }

//       const unique =
//         uniqueInvoices(records);

//       await saveCsvFile(
//         "sales-invoices-export.csv",
//         createCsv(unique),
//       );

//       toast.success(
//         `Exported ${unique.length} Sales Invoices.`,
//         { id: toastId },
//       );
//     } catch (error) {
//       toast.error(getErrorMessage(error), {
//         id: toastId,
//       });
//     } finally {
//       exportLock.current = false;
//     }
//   }, [buildParams]);

//   /* ---------------------------------------------------------------- */
//   /* Columns                                                           */
//   /* ---------------------------------------------------------------- */

//   const columns = useMemo(
//     () => [
//       {
//         key: "invoiceNumber",
//         label: "Invoice Number",
//         sortable: SERVER_SORTING_ENABLED,

//         render: (value, row) => (
//           <button
//             type="button"
//             className="doc-link-button"
//             disabled={confirmLoading}
//             aria-label={`View sales invoice ${value}`}
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
//         key: "customerName",
//         label: "Customer",
//         sortable: false,

//         render: (value, row) => (
//           <div className="dl-customer">
//             <strong>
//               {value || "N/A"}
//             </strong>

//             <span>
//               {row.customerCode || "N/A"}
//             </span>
//           </div>
//         ),
//       },

//       {
//         key: "ewayBill",
//         label: "E-Way Bill",
//         sortable: false,

//         render: (_, row) => (
//           <EwayBillCell
//             row={row}
//             onGenerate={openEwayBill}
//             disabled={actionsDisabled}
//           />
//         ),
//       },

//       {
//         key: "receivePayment",
//         label: "Payment",
//         sortable: false,

//         render: (_, row) => (
//           <PaymentCell
//             row={row}
//             onReceive={
//               handleReceivePayment
//             }
//             disabled={actionsDisabled}
//           />
//         ),
//       },

//       {
//         key: "print",
//         label: "Print",
//         sortable: false,

//         render: (_, row) =>
//           row.status === "CANCELLED" ||
//           actionsDisabled ? (
//             <span className="dl-muted-value">
//               —
//             </span>
//           ) : (
//             <div
//               className="sip-cell"
//               onClick={(event) =>
//                 event.stopPropagation()
//               }
//             >
//               <PrintInvoiceButton
//                 invoiceNumber={
//                   row.invoiceNumber
//                 }
//                 fetchInvoice={
//                   fetchFullInvoice
//                 }
//                 className="sip-btn sip-btn-print"
//                 label={
//                   <>
//                     <span className="sip-btn-icon">
//                       <Printer
//                         size={14}
//                         strokeWidth={2.5}
//                       />
//                     </span>

//                     <span className="sip-btn-text">
//                       Print
//                     </span>
//                   </>
//                 }
//               />
//             </div>
//           ),
//       },
//       {
//         key: "share",
//         label: "Share",
//         sortable: false,

//         render: (_, row) =>
//           row.status === "CANCELLED" ? (
//             <span className="dl-muted-value">—</span>
//           ) : (
//             <div
//               className="sip-cell"
//               onClick={(event) => event.stopPropagation()}
//             >
//               <ShareInvoiceButton
//                 row={row}
//                 disabled={actionsDisabled}
//               />
//             </div>
//           ),
//       },
//       {
//         key: "invoiceDate",
//         label: "Invoice Date",
//         sortable: SERVER_SORTING_ENABLED,
//         render: formatDate,
//       },

//       {
//         key: "dueDate",
//         label: "Due Date",
//         sortable: SERVER_SORTING_ENABLED,
//         render: formatDate,
//       },

//       {
//         key: "totalAmountPaise",
//         label: "Total",
//         type: "number",
//         sortable: SERVER_SORTING_ENABLED,
//         render: formatPaise,
//       },

//       {
//         key: "paidAmountPaise",
//         label: "Paid",
//         type: "number",
//         sortable: SERVER_SORTING_ENABLED,

//         render: (value, row) =>
//           isCreated(row) ? (
//             <span className="dl-muted-value">
//               N/A
//             </span>
//           ) : (
//             formatPaise(value)
//           ),
//       },

//       {
//         key: "outstandingAmountPaise",
//         label: "Pending Amount",
//         type: "number",
//         sortable: SERVER_SORTING_ENABLED,

//         render: (value, row) =>
//           isCreated(row) ? (
//             <span className="dl-muted-value">
//               Not posted
//             </span>
//           ) : (
//             formatPaise(value)
//           ),
//       },

//       {
//         key: "status",
//         label: "Status",
//         sortable: SERVER_SORTING_ENABLED,

//         render: (value) => (
//           <StatusField value={value} />
//         ),
//       },

//       {
//         key: "paymentStatus",
//         label: "Payment Status",
//         sortable: SERVER_SORTING_ENABLED,

//         render: (value, row) =>
//           isCreated(row) ? (
//             <span className="dl-muted-value">
//               N/A
//             </span>
//           ) : (
//             <StatusField value={value} />
//           ),
//       },

//       ...[
//         ["paymentTerms", "Payment Terms"],
//         ["taxMode", "Tax Mode"],
//       ].map(([key, label]) => ({
//         key,
//         label,
//         sortable: SERVER_SORTING_ENABLED,
//         visible: false,
//       })),

//       ...[
//         ["taxableAmountPaise", "Taxable Amount"],
//         ["discountAmountPaise", "Discount"],
//         ["cgstAmountPaise", "CGST"],
//         ["sgstAmountPaise", "SGST"],
//         ["igstAmountPaise", "IGST"],
//       ].map(([key, label]) => ({
//         key,
//         label,
//         type: "number",
//         sortable: SERVER_SORTING_ENABLED,
//         visible: false,
//         render: formatPaise,
//       })),

//       {
//         key: "updateStock",
//         label: "Deduct Stock",
//         sortable: SERVER_SORTING_ENABLED,
//         visible: false,

//         render: (value) =>
//           value ? "Yes" : "No",
//       },

//       {
//         key: "postedAt",
//         label: "Posted On",
//         sortable: SERVER_SORTING_ENABLED,
//         visible: false,
//         render: formatDate,
//       },

//       {
//         key: "createdAt",
//         label: "Created On",
//         sortable: SERVER_SORTING_ENABLED,
//         visible: false,
//         render: formatDate,
//       },

//       {
//         key: "notes",
//         label: "Notes",
//         visible: false,

//         render: (value) =>
//           value || (
//             <span className="dl-muted-value">
//               N/A
//             </span>
//           ),
//       },
//     ],
//     [
//       actionsDisabled,
//       confirmLoading,
//       handleView,
//       openEwayBill,
//       handleReceivePayment,
//     ],
//   );

//   const quickFilters = useMemo(
//     () => [
//       {
//         key: "status",
//         value: "",
//         label: "All",
//         ...(stats !== null
//           ? { count: stats.all }
//           : {}),
//       },
//       {
//         key: "status",
//         value: "CREATED",
//         label: "Created",
//         ...(stats !== null
//           ? { count: stats.CREATED }
//           : {}),
//       },
//       {
//         key: "status",
//         value: "POSTED",
//         label: "Posted",
//         ...(stats !== null
//           ? { count: stats.POSTED }
//           : {}),
//       },
//       {
//         key: "status",
//         value: "CANCELLED",
//         label: "Cancelled",
//         ...(stats !== null
//           ? { count: stats.CANCELLED }
//           : {}),
//       },
//     ],
//     [stats],
//   );

//   const posting = confirm.action === "post";
//   const targetCount = confirm.rows.length;

//   /* ---------------------------------------------------------------- */
//   /* Render                                                            */
//   /* ---------------------------------------------------------------- */

//   return (
//     <div className="sil-list-page">
//       {loadError && (
//         <div
//           className="sil-list-alert"
//           role="alert"
//         >
//           {loadError}
//         </div>
//       )}

//       <DataList
//         title="Sales Invoices"
//         subtitle="Manage customer invoices and sales postings"
//         columns={columns}
//         data={invoices}
//         loading={loading}
//         rowKey="_id"
//         showCase="list"
//         searchable
//         filterable
//         sortable={SERVER_SORTING_ENABLED}
//         selectable
//         columnVisibility
//         pagination
//         serverMode
//         total={total}
//         page={page}
//         pageSize={pageSize}
//         pageSizeOptions={
//           PAGE_SIZE_OPTIONS
//         }
//         onPageChange={
//           handlePageChange
//         }
//         onPageSizeChange={
//           handlePageSizeChange
//         }
//         onSearch={handleSearch}
//         onSort={handleSort}
//         onFilterChange={
//           handleFilterChange
//         }
//         filters={FILTERS}
//         quickFilters={quickFilters}
//         storageKey={`trustiq-sales-invoices-${
//           sessionStorage.getItem(
//             "selectedTenantId",
//           ) || "current"
//         }`}
//         searchPlaceholder="Search invoice, customer, customer code..."
//         actions={{
//           view: handleView,
//           edit: handleEdit,
//           delete: (row) =>
//             openAction(
//               [row],
//               "delete",
//             ),
//         }}
//         bulkActions={[
//           {
//             key: "post",
//             label: "Post Invoices",
//             action: (rows) =>
//               openAction(
//                 rows,
//                 "post",
//               ),
//           },
//           {
//             key: "delete",
//             label: "Delete Created",
//             danger: true,
//             action: (rows) =>
//               openAction(
//                 rows,
//                 "delete",
//               ),
//           },
//           {
//             key: "export",
//             label: "Export Selected",
//             action:
//               handleExportSelected,
//           },
//         ]}
//         onRefresh={() => {
//           if (
//             !actionLock.current &&
//             !confirm.open &&
//             !ewayBillInvoiceNumber
//           ) {
//             return refreshAll();
//           }
//         }}
//         onExport={handleExport}
//         addButton={
//           <button
//             type="button"
//             className="so-primary-button"
//             disabled={actionsDisabled}
//             onClick={() =>
//               navigate(
//                 SALES_PATHS.create,
//               )
//             }
//           >
//             <Plus size={16} />
//             <span>
//               New Sales Invoice
//             </span>
//           </button>
//         }
//       />

//       <ConfirmModal
//         open={confirm.open}
//         type="danger"
//         title={
//           actionFinished
//             ? "Sales Invoice action results"
//             : posting
//               ? "Post selected sales invoices?"
//               : "Delete created sales invoices?"
//         }
//         message={
//           actionFinished
//             ? "Review the results below. The list and global counts have been refreshed."
//             : posting
//               ? `Post ${targetCount} invoice(s)? This creates accounting entries and deducts tracked stock where selected. Do not post stock again for goods already dispatched through a Delivery Note.`
//               : `Delete ${targetCount} created sales invoice(s)? They will be marked as deleted.`
//         }
//         confirmText={
//           actionFinished
//             ? "Close"
//             : posting
//               ? `Post ${targetCount} Invoice${
//                   targetCount === 1
//                     ? ""
//                     : "s"
//                 }`
//               : `Delete ${targetCount} Invoice${
//                   targetCount === 1
//                     ? ""
//                     : "s"
//                 }`
//         }
//         cancelText="Back"
//         loading={confirmLoading}
//         loadingText={`Processing ${progress.done}/${progress.total}...`}
//         onCancel={closeConfirm}
//         onConfirm={handleConfirm}
//       >
//         <div className="sil-confirm-content">
//           {!actionFinished && (
//             <p className="sil-confirm-note">
//               Each invoice is processed
//               separately. Only CREATED invoices
//               are eligible. The backend performs
//               the final accounting, stock, and
//               status checks.
//             </p>
//           )}

//           {confirmLoading && (
//             <p role="status">
//               Processed {progress.done} of{" "}
//               {progress.total}.
//             </p>
//           )}

//           {failures.length > 0 && (
//             <div
//               className="sil-action-errors"
//               role="alert"
//             >
//               <strong>
//                 Some actions could not be
//                 confirmed
//               </strong>

//               <ul>
//                 {failures.map(
//                   (failure) => (
//                     <li
//                       key={failure.id}
//                     >
//                       <span>
//                         {
//                           failure.invoiceNumber
//                         }
//                       </span>
//                       {": "}
//                       {failure.message}

//                       {failure.uncertain && (
//                         <small>
//                           This request may have
//                           reached the server.
//                           Verify the invoice,
//                           journal, and stock
//                           result before retrying.
//                         </small>
//                       )}
//                     </li>
//                   ),
//                 )}
//               </ul>

//               <p>
//                 No automatic retry was
//                 performed. Close this dialog,
//                 review the refreshed invoices,
//                 and select any remaining
//                 eligible records again if
//                 appropriate.
//               </p>
//             </div>
//           )}
//         </div>
//       </ConfirmModal>

//       {ewayBillInvoiceNumber && (
//         <EwayBillModal
//           key={ewayBillInvoiceNumber}
//           invoiceNumber={
//             ewayBillInvoiceNumber
//           }
//           onClose={() =>
//             setEwayBillInvoiceNumber("")
//           }
//           onUpdated={
//             handleEwayBillUpdated
//           }
//         />
//       )}
//     </div>
//   );
// }

// /* ------------------------------------------------------------------ */
// /* Tenant-based remount                                                 */
// /* ------------------------------------------------------------------ */

// export default function SalesInvoicesList() {
//   const revision = useTenantRevision();

//   return (
//     <SalesInvoicesListContent
//       key={revision}
//     />
//   );
// }

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  Plus,
  Truck,
  IndianRupee,
  CheckCircle2,
  Receipt,
  Printer,
  Send,
} from "lucide-react";

import toast from "react-hot-toast";

import salesInvoiceApi from "../../../services/modules/salesInvoiceApi";
import routes from "../../../config/routes";

import {
  SALES_PATHS,
  formatDate,
  formatPaise,
  getErrors,
  useTenantRevision,
} from "./salesInvoiceUtils";

import DataList from "../../../components/common/DataList/DataList";
import ConfirmModal from "../../../components/common/ConfirmModal/ConfirmModal";
import StatusField from "../../../components/common/StatusField/StatusField";

import { saveCsvFile } from "../../../components/common/DataList/fileDownload";

import EwayBillModal from "./EwayBillModal";

import {
  PrintInvoiceButton,
} from "../../../invoice-templates/TemplateManager";

import "../../../styles/invoice-common1.css";
import "../../../styles/salesInvoicePayment.css";
import "./SalesInvoicesList.css";
import ShareInvoiceButton from "./ShareInvoice";

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

const SERVER_SORTING_ENABLED = false;

const PAGE_SIZE_OPTIONS = [20, 50, 100];
const SEARCH_DEBOUNCE_MS = 400;
const EXPORT_BATCH_SIZE = 100;

const INVOICE_STATUSES = [
  "CREATED",
  "POSTED",
  "CANCELLED",
];

const SORT_FIELDS = new Set([
  "invoiceNumber",
  "invoiceDate",
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
  "createdAt",
]);

const INITIAL_CONFIRM = {
  open: false,
  action: "",
  rows: [],
};

const FILTERS = [
  {
    key: "status",
    label: "Invoice Status",
    type: "select",
    options: INVOICE_STATUSES,
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
    label: "Deduct Stock",
    type: "select",
    options: [
      { label: "Yes", value: true },
      { label: "No", value: false },
    ],
  },
];

const isCreated = (invoice) =>
  invoice?.status === "CREATED";

const canReceivePayment = (row) =>
  row?.status === "POSTED" &&
  Number(row?.outstandingAmountPaise) > 0 &&
  row?.paymentStatus !== "PAID";

/* ------------------------------------------------------------------ */
/* Response helpers                                                    */
/* ------------------------------------------------------------------ */

const getErrorMessage = (error) => {
  const messages = getErrors(error);

  if (
    Array.isArray(messages) &&
    messages.length
  ) {
    return messages.join(", ");
  }

  return (
    error?.response?.data?.message ||
    error?.message ||
    "Unable to complete the request."
  );
};

const assertSuccess = (response) => {
  if (response?.data?.success !== true) {
    const error = new Error(
      response?.data?.message ||
        "Request failed.",
    );

    error.response = response;
    throw error;
  }
};

const extractInvoiceRecord = (response) => {
  const body = response?.data;

  return (
    body?.invoice ||
    body?.data?.invoice ||
    (
      body?.data?.invoiceNumber
        ? body.data
        : null
    ) ||
    (
      body?.invoiceNumber
        ? body
        : null
    )
  );
};

const fetchFullInvoice = async (
  invoiceNumber,
) => {
  const response =
    await salesInvoiceApi.getByNumber(
      invoiceNumber,
    );

  if (response?.data?.success === false) {
    const error = new Error(
      response.data.message ||
        "Unable to load invoice.",
    );

    error.response = response;
    throw error;
  }

  const invoice =
    extractInvoiceRecord(response);

  if (
    !invoice?._id ||
    invoice.invoiceNumber !== invoiceNumber
  ) {
    throw new Error(
      "The server did not return the requested invoice.",
    );
  }

  return invoice;
};

const readInvoicePage = (response) => {
  assertSuccess(response);

  const body = response.data;

  const records = Array.isArray(body?.data)
    ? body.data
    : Array.isArray(body?.data?.invoices)
      ? body.data.invoices
      : Array.isArray(body?.invoices)
        ? body.invoices
        : null;

  if (!records) {
    throw new Error(
      "Invalid sales invoice list response.",
    );
  }

  const pagination =
    body?.pagination ||
    body?.data?.pagination;

  const rawTotal = pagination?.total;

  if (
    rawTotal === undefined ||
    rawTotal === null ||
    !Number.isFinite(Number(rawTotal)) ||
    Number(rawTotal) < 0
  ) {
    throw new Error(
      "Sales invoice list must return pagination.total.",
    );
  }

  return {
    data: records,
    total: Number(rawTotal),
    pagination,
  };
};

const uniqueInvoices = (records) =>
  Array.from(
    new Map(
      records.map((record) => [
        record._id || record.invoiceNumber,
        record,
      ]),
    ).values(),
  );

/* ------------------------------------------------------------------ */
/* Stored e-way bill state                                             */
/* ------------------------------------------------------------------ */

const getEwayState = (row) => {
  const ewb = row?.ewayBill || {};

  if (ewb.status === "GENERATED") {
    const validUntil = ewb.validUntil
      ? new Date(ewb.validUntil)
      : null;

    const expired =
      validUntil &&
      !Number.isNaN(validUntil.getTime()) &&
      validUntil <= new Date();

    return expired
      ? "EXPIRED"
      : "GENERATED";
  }

  if (row?.status === "CANCELLED") {
    return null;
  }

  if (ewb.status === "CANCELLED") {
    return "CANCELLED";
  }

  if (!row?.ewayBillRequired) {
    return null;
  }

  return row.status === "POSTED"
    ? "PENDING"
    : "AFTER_POSTING";
};

const canGenerateEwayBill = (row) =>
  row?.status === "POSTED" &&
  Boolean(row?.ewayBillRequired) &&
  row?.ewayBill?.status !== "GENERATED";

/* ------------------------------------------------------------------ */
/* Cell components                                                     */
/* ------------------------------------------------------------------ */

function EwayBillCell({
  row,
  onGenerate,
  disabled,
}) {
  const state = getEwayState(row);
  const ewb = row.ewayBill || {};

  if (
    state === "GENERATED" ||
    state === "EXPIRED"
  ) {
    return (
      <small>
        {state === "EXPIRED"
          ? "EWB Expired"
          : `EWB ${ewb.ewbNumber || ""}`}
      </small>
    );
  }

  if (canGenerateEwayBill(row)) {
    return (
      <div>
        <button
          type="button"
          className="so-primary-button"
          disabled={disabled}
          onClick={(event) => {
            event.stopPropagation();
            onGenerate(row.invoiceNumber);
          }}
        >
          <Truck size={16} />

          <span>
            {state === "CANCELLED"
              ? "Generate Again"
              : "Generate E-Way Bill"}
          </span>
        </button>
      </div>
    );
  }

  if (state === "AFTER_POSTING") {
    return <small>Post invoice first</small>;
  }

  return (
    <span className="dl-muted-value">—</span>
  );
}

function PaymentCell({
  row,
  onReceive,
  onPost,
  disabled,
}) {
  if (row?.status === "CREATED") {
    return (
      <button
        type="button"
        className="sip-btn sip-btn-post"
        disabled={disabled}
        title="Post this sales invoice"
        aria-label={`Post sales invoice ${row.invoiceNumber}`}
        onClick={(event) => {
          event.stopPropagation();
          onPost(row);
        }}
      >
        <Send size={14} strokeWidth={2.5} />
        <span className="sip-btn-text">Post</span>
      </button>
    );
  }
  if (row?.status !== "POSTED") {
    return (
      <span className="dl-muted-value">—</span>
    );
  }

  const receipts = Array.isArray(
    row.receiptNumbers,
  )
    ? row.receiptNumbers
    : [];

  const latest =
    receipts[receipts.length - 1];

  const partial =
    row.paymentStatus === "PARTIALLY_PAID";

  return (
    <div className="sip-cell">
      {canReceivePayment(row) && (
        <button
          type="button"
          className="sip-btn"
          disabled={disabled}
          title={
            partial
              ? "Receive remaining balance"
              : "Receive payment"
          }
          aria-label={`Receive payment for ${row.invoiceNumber}`}
          onClick={(event) => {
            event.stopPropagation();
            onReceive(row);
          }}
        >
          <span className="sip-btn-icon">
            <IndianRupee
              size={14}
              strokeWidth={2.8}
            />
          </span>

          <span className="sip-btn-text">
            {partial
              ? "Receive Balance"
              : "Receive"}
          </span>
        </button>
      )}

      {row.paymentStatus === "PAID" && (
        <span
          className="sip-badge sip-badge-paid"
          title={
            receipts.length
              ? `Receipts: ${receipts.join(", ")}`
              : "Fully received"
          }
        >
          <CheckCircle2 size={14} />
          <span>{latest || "Received"}</span>

          {receipts.length > 1 && (
            <em>+{receipts.length - 1}</em>
          )}
        </span>
      )}

      {latest &&
        row.paymentStatus !== "PAID" && (
          <span
            className="sip-badge sip-badge-receipt"
            title={`Receipts: ${receipts.join(", ")}`}
          >
            <Receipt size={12} />
            <span>{latest}</span>

            {receipts.length > 1 && (
              <em>+{receipts.length - 1}</em>
            )}
          </span>
        )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* CSV helpers                                                         */
/* ------------------------------------------------------------------ */

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

const EXPORT_FIELDS = [
  ["Invoice Number", (row) => row.invoiceNumber],
  ["Customer", (row) => row.customerName],
  ["Customer Code", (row) => row.customerCode],
  [
    "Invoice Date",
    (row) => csvDate(row.invoiceDate),
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
    (row) =>
      isCreated(row) ? "" : row.paidAmountPaise,
  ],
  [
    "Outstanding (Paise)",
    (row) =>
      isCreated(row)
        ? ""
        : row.outstandingAmountPaise,
  ],
  ["Status", (row) => row.status],
  [
    "Payment Status",
    (row) =>
      isCreated(row) ? "" : row.paymentStatus,
  ],
  [
    "Receipt Numbers",
    (row) =>
      Array.isArray(row.receiptNumbers)
        ? row.receiptNumbers.join("; ")
        : "",
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
  ["CGST (Paise)", (row) => row.cgstAmountPaise],
  ["SGST (Paise)", (row) => row.sgstAmountPaise],
  ["IGST (Paise)", (row) => row.igstAmountPaise],
  [
    "Deduct Stock",
    (row) => (row.updateStock ? "Yes" : "No"),
  ],
  [
    "Posted On",
    (row) => csvDate(row.postedAt),
  ],
  [
    "E-Way Bill Required",
    (row) => (row.ewayBillRequired ? "Yes" : "No"),
  ],
  [
    "E-Way Bill State",
    (row) => getEwayState(row) || "",
  ],
  [
    "E-Way Bill Number",
    (row) => row.ewayBill?.ewbNumber,
  ],
  [
    "E-Way Bill Valid Until",
    (row) => row.ewayBill?.validUntil,
  ],
  ["Notes", (row) => row.notes],
];

const createCsv = (records) =>
  [
    EXPORT_FIELDS
      .map(([label]) => csvCell(label))
      .join(","),

    ...records.map((row) =>
      EXPORT_FIELDS
        .map(([, getter]) =>
          csvCell(getter(row)),
        )
        .join(","),
    ),
  ].join("\r\n");

/* ------------------------------------------------------------------ */
/* Main list                                                           */
/* ------------------------------------------------------------------ */

function SalesInvoicesListContent() {
  const navigate = useNavigate();

  const [
    ewayBillInvoiceNumber,
    setEwayBillInvoiceNumber,
  ] = useState("");

  const [loading, setLoading] =
    useState(true);

  const [invoices, setInvoices] =
    useState([]);

  const [total, setTotal] =
    useState(0);

  const [loadError, setLoadError] =
    useState("");

  const [page, setPage] =
    useState(1);

  const [pageSize, setPageSize] =
    useState(20);

  const [searchInput, setSearchInput] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [filterValues, setFilterValues] =
    useState({});

  const [sort, setSort] = useState({
    key: "invoiceDate",
    direction: "desc",
  });

  const [stats, setStats] =
    useState(null);

  const [confirm, setConfirm] =
    useState(INITIAL_CONFIRM);

  const [confirmLoading, setConfirmLoading] =
    useState(false);

  const [actionFinished, setActionFinished] =
    useState(false);

  const [failures, setFailures] =
    useState([]);

  const [progress, setProgress] =
    useState({
      done: 0,
      total: 0,
    });

  const mounted = useRef(false);
  const requestNumber = useRef(0);
  const statsRequest = useRef(0);
  const actionLock = useRef(false);
  const exportLock = useRef(false);
  const refreshRef = useRef(null);

  const actionsDisabled =
    confirmLoading ||
    confirm.open ||
    Boolean(ewayBillInvoiceNumber);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
      requestNumber.current += 1;
      statsRequest.current += 1;
    };
  }, []);

  /* ---------------------------------------------------------------- */
  /* Search and filters                                                */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    const nextSearch = searchInput.trim();

    if (nextSearch === search) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setSearch(nextSearch);
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

      // Preserve the explicit false value.
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
  /* Load one page only                                                */
  /* ---------------------------------------------------------------- */

  const loadInvoices = useCallback(async () => {
    if (!mounted.current) return;

    const request = ++requestNumber.current;

    const isCurrent = () =>
      mounted.current &&
      request === requestNumber.current;

    setLoading(true);
    setLoadError("");

    try {
      const response =
        await salesInvoiceApi.getAll(
          buildParams({
            page,
            limit: pageSize,
          }),
        );

      if (!isCurrent()) return;

      const result = readInvoicePage(response);

      const lastPage = Math.max(
        1,
        Math.ceil(result.total / pageSize),
      );

      if (page > lastPage) {
        setPage(lastPage);
        return;
      }

      setInvoices(result.data);
      setTotal(result.total);
    } catch (error) {
      if (!isCurrent()) return;

      const message = getErrorMessage(error);

      setInvoices([]);
      setTotal(0);
      setLoadError(message);

      toast.error(message);
    } finally {
      if (isCurrent()) {
        setLoading(false);
      }
    }
  }, [buildParams, page, pageSize]);

  useEffect(() => {
    loadInvoices();

    return () => {
      requestNumber.current += 1;
    };
  }, [loadInvoices]);

  /* ---------------------------------------------------------------- */
  /* Global status counts — no count-loading UI                         */
  /* ---------------------------------------------------------------- */

  const loadStats = useCallback(async () => {
    if (!mounted.current) return;

    const request = ++statsRequest.current;

    try {
      const nextStats = {};

      for (
        const status of [
          "all",
          ...INVOICE_STATUSES,
        ]
      ) {
        if (
          !mounted.current ||
          request !== statsRequest.current
        ) {
          return;
        }

        const response =
          await salesInvoiceApi.getAll({
            page: 1,
            limit: 20,
            ...(status === "all"
              ? {}
              : { status }),
          });

        nextStats[status] =
          readInvoicePage(response).total;
      }

      if (
        mounted.current &&
        request === statsRequest.current
      ) {
        setStats(nextStats);
      }
    } catch (error) {
      if (
        mounted.current &&
        request === statsRequest.current
      ) {
        setStats(null);

        console.warn(
          "Unable to load invoice counts:",
          error,
        );
      }
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const refreshAll = useCallback(() => {
    return Promise.all([
      loadInvoices(),
      loadStats(),
    ]);
  }, [loadInvoices, loadStats]);

  useEffect(() => {
    refreshRef.current = refreshAll;
  }, [refreshAll]);

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
            key: "invoiceDate",
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

    if (!PAGE_SIZE_OPTIONS.includes(size)) {
      return;
    }

    setPageSize(size);
    setPage(1);
  }, []);

  /* ---------------------------------------------------------------- */
  /* View, edit, payments, and e-way bills                              */
  /* ---------------------------------------------------------------- */

  const handleView = useCallback(
    (row) => {
      if (actionLock.current) return;

      if (!row?.invoiceNumber) {
        toast.error("Invoice number is missing.");
        return;
      }

      navigate(
        SALES_PATHS.view(row.invoiceNumber),
      );
    },
    [navigate],
  );

  const handleEdit = useCallback(
    (row) => {
      if (actionLock.current) return;

      if (!row?.invoiceNumber) {
        toast.error("Invoice number is missing.");
        return;
      }

      if (!isCreated(row)) {
        toast.error(
          "Only created sales invoices can be edited.",
        );
        return;
      }

      if (row.sourceSalesOrderId) {
        toast.error(
          "Order-linked invoices cannot be edited. Delete and recreate from the Sales Order.",
        );
        return;
      }

      navigate(
        SALES_PATHS.edit(row.invoiceNumber),
      );
    },
    [navigate],
  );

  const openEwayBill = useCallback(
    (invoiceNumber) => {
      if (
        actionLock.current ||
        confirm.open ||
        ewayBillInvoiceNumber
      ) {
        return;
      }

      if (!invoiceNumber) {
        toast.error("Invoice number is missing.");
        return;
      }

      setEwayBillInvoiceNumber(invoiceNumber);
    },
    [confirm.open, ewayBillInvoiceNumber],
  );

  const handleReceivePayment = useCallback(
    (row) => {
      if (
        actionLock.current ||
        confirm.open ||
        ewayBillInvoiceNumber
      ) {
        return;
      }

      if (!canReceivePayment(row)) {
        toast.error(
          "This invoice is not eligible to receive payment.",
        );
        return;
      }

      const customerId =
        row.customerId?._id ||
        row.customerId;

      if (!customerId || !row._id) {
        toast.error(
          "Customer or invoice ID is missing.",
        );
        return;
      }

      const params = new URLSearchParams({
        customerId: String(customerId),
        invoiceId: String(row._id),
      });

      navigate(
        `${routes.customerReceipts.create}?${params.toString()}`,
      );
    },
    [
      navigate,
      confirm.open,
      ewayBillInvoiceNumber,
    ],
  );

  const handlePostSingle = useCallback(
    (row) => {
      if (
        actionLock.current ||
        confirm.open ||
        ewayBillInvoiceNumber
      ) {
        return;
      }

      if (!row?.invoiceNumber) {
        toast.error("Invoice number is missing.");
        return;
      }

      if (!isCreated(row)) {
        toast.error(
          "Only created sales invoices can be posted.",
        );
        return;
      }

      openAction([row], "post");
    },
    [
      actionLock,
      confirm.open,
      ewayBillInvoiceNumber,
    ],
  );

  const handleEwayBillUpdated = useCallback(
    (updatedInvoice) => {
      if (!mounted.current) return;

      requestNumber.current += 1;
      setLoading(false);

      setInvoices((previous) =>
        previous.map((item) =>
          item.invoiceNumber ===
          updatedInvoice.invoiceNumber
            ? {
                ...item,
                ...updatedInvoice,
              }
            : item,
        ),
      );

      void refreshRef.current?.();
    },
    [],
  );

  /* ---------------------------------------------------------------- */
  /* Posting/deletion confirmation                                     */
  /* ---------------------------------------------------------------- */

  const openAction = (input, action) => {
    if (
      actionLock.current ||
      confirm.open ||
      ewayBillInvoiceNumber ||
      !["post", "delete"].includes(action)
    ) {
      return;
    }

    const rows = uniqueInvoices(
      (Array.isArray(input) ? input : [input])
        .filter(Boolean),
    );

    if (!rows.length) {
      toast.error(
        "Select at least one sales invoice.",
      );
      return;
    }

    if (
      rows.some(
        (row) =>
          !row._id ||
          !row.invoiceNumber,
      )
    ) {
      toast.error(
        "A selected invoice is missing its ID or number.",
      );
      return;
    }

    if (rows.some((row) => !isCreated(row))) {
      toast.error(
        "Select only created sales invoices.",
      );
      return;
    }

    setConfirm({
      open: true,
      action,
      rows,
    });

    setFailures([]);
    setActionFinished(false);

    setProgress({
      done: 0,
      total: rows.length,
    });
  };

  const closeConfirm = () => {
    if (actionLock.current) return;

    setConfirm(INITIAL_CONFIRM);
    setFailures([]);
    setActionFinished(false);
    setProgress({ done: 0, total: 0 });
  };

  const handleConfirm = async () => {
    if (actionLock.current) return;

    if (actionFinished) {
      closeConfirm();
      return;
    }

    const action = confirm.action;
    const rows = [...confirm.rows];

    if (
      !rows.length ||
      !["post", "delete"].includes(action)
    ) {
      return;
    }

    if (
      typeof salesInvoiceApi[action] !==
      "function"
    ) {
      toast.error(
        `Sales Invoice API "${action}" is not configured.`,
      );
      return;
    }

    actionLock.current = true;

    requestNumber.current += 1;
    statsRequest.current += 1;

    setLoading(false);
    setConfirmLoading(true);
    setFailures([]);

    setProgress({
      done: 0,
      total: rows.length,
    });

    let successCount = 0;
    const failed = [];

    try {
      for (let index = 0; index < rows.length; index++) {
        if (!mounted.current) break;

        const selected = rows[index];
        let writeStarted = false;

        try {
          const latest =
            await fetchFullInvoice(
              selected.invoiceNumber,
            );

          if (!mounted.current) break;

          if (
            String(latest._id) !==
            String(selected._id)
          ) {
            throw new Error(
              "The server returned a different invoice.",
            );
          }

          if (!isCreated(latest)) {
            throw new Error(
              `Invoice is now ${latest.status}. Only CREATED invoices are eligible.`,
            );
          }

          /*
           * List projections may omit __v.
           * Compare versions when the selected row contains it.
           */
          if (
            Number.isSafeInteger(selected.__v) &&
            latest.__v !== selected.__v
          ) {
            throw new Error(
              "This invoice changed. Review the refreshed invoice before trying again.",
            );
          }

          if (!mounted.current) break;

          writeStarted = true;

          // Preserve your original API signatures.
          const response =
            await salesInvoiceApi[action](
              selected.invoiceNumber,
            );

          assertSuccess(response);

          if (action === "post") {
            let posted =
              extractInvoiceRecord(response);

            /*
             * Some APIs return success without the invoice.
             * Read it back to verify the posting result.
             */
            if (
              !posted ||
              posted.invoiceNumber !==
                selected.invoiceNumber ||
              posted.status !== "POSTED"
            ) {
              posted = await fetchFullInvoice(
                selected.invoiceNumber,
              );
            }

            if (posted.status !== "POSTED") {
              throw new Error(
                "Posting was not confirmed. Verify this invoice before retrying.",
              );
            }
          }

          successCount += 1;
        } catch (error) {
          const status =
            error?.response?.status;

          failed.push({
            id: String(selected._id),
            invoiceNumber:
              selected.invoiceNumber,
            message: getErrorMessage(error),
            uncertain:
              writeStarted &&
              (
                !status ||
                status >= 500 ||
                status === 408
              ),
          });
        } finally {
          if (mounted.current) {
            setProgress({
              done: index + 1,
              total: rows.length,
            });
          }
        }
      }

      if (!mounted.current) return;

      if (successCount) {
        toast.success(
          `${successCount} invoice${
            successCount === 1 ? "" : "s"
          } ${
            action === "post"
              ? "posted"
              : "deleted"
          } successfully.`,
        );
      }

      if (failed.length) {
        setFailures(failed);
        setActionFinished(true);

        toast.error(
          `${failed.length} action${
            failed.length === 1 ? "" : "s"
          } could not be confirmed.`,
        );
      } else {
        setConfirm(INITIAL_CONFIRM);
      }

      await refreshRef.current?.();
    } finally {
      actionLock.current = false;

      if (mounted.current) {
        setConfirmLoading(false);
      }
    }
  };

  /* ---------------------------------------------------------------- */
  /* CSV export                                                        */
  /* ---------------------------------------------------------------- */

  const handleExportSelected = useCallback(
    async (rows) => {
      if (exportLock.current) return;

      if (
        !Array.isArray(rows) ||
        !rows.length
      ) {
        toast.error(
          "Select at least one invoice.",
        );
        return;
      }

      exportLock.current = true;

      const toastId = toast.loading(
        "Exporting selected invoices...",
      );

      try {
        const records =
          uniqueInvoices(rows);

        await saveCsvFile(
          "sales-invoices-selected.csv",
          createCsv(records),
        );

        toast.success(
          `Exported ${records.length} invoices.`,
          { id: toastId },
        );
      } catch (error) {
        toast.error(getErrorMessage(error), {
          id: toastId,
        });
      } finally {
        exportLock.current = false;
      }
    },
    [],
  );

  const handleExport = useCallback(async () => {
    if (exportLock.current) return;

    exportLock.current = true;

    const toastId = toast.loading(
      "Preparing Sales Invoice export...",
    );

    try {
      const firstResponse =
        await salesInvoiceApi.getAll(
          buildParams({
            page: 1,
            limit: EXPORT_BATCH_SIZE,
          }),
        );

      const first =
        readInvoicePage(firstResponse);

      const actualLimit = Math.max(
        1,
        Number(first.pagination?.limit) ||
          EXPORT_BATCH_SIZE,
      );

      const totalPages = Math.max(
        1,
        Math.ceil(first.total / actualLimit),
      );

      const records = [...first.data];

      for (
        let currentPage = 2;
        currentPage <= totalPages;
        currentPage++
      ) {
        if (!mounted.current) {
          toast.dismiss(toastId);
          return;
        }

        const response =
          await salesInvoiceApi.getAll(
            buildParams({
              page: currentPage,
              limit: actualLimit,
            }),
          );

        records.push(
          ...readInvoicePage(response).data,
        );

        toast.loading(
          `Exporting page ${currentPage} of ${totalPages}...`,
          { id: toastId },
        );
      }

      if (!mounted.current) {
        toast.dismiss(toastId);
        return;
      }

      const unique =
        uniqueInvoices(records);

      await saveCsvFile(
        "sales-invoices-export.csv",
        createCsv(unique),
      );

      toast.success(
        `Exported ${unique.length} Sales Invoices.`,
        { id: toastId },
      );
    } catch (error) {
      toast.error(getErrorMessage(error), {
        id: toastId,
      });
    } finally {
      exportLock.current = false;
    }
  }, [buildParams]);

  /* ---------------------------------------------------------------- */
  /* Columns                                                           */
  /* ---------------------------------------------------------------- */

  const columns = useMemo(
    () => [
      {
        key: "invoiceNumber",
        label: "Invoice Number",
        sortable: SERVER_SORTING_ENABLED,

        render: (value, row) => (
          <button
            type="button"
            className="doc-link-button"
            disabled={confirmLoading}
            aria-label={`View sales invoice ${value}`}
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
        key: "customerName",
        label: "Customer",
        sortable: false,

        render: (value, row) => (
          <div className="dl-customer">
            <strong>
              {value || "N/A"}
            </strong>

            <span>
              {row.customerCode || "N/A"}
            </span>
          </div>
        ),
      },

      {
        key: "ewayBill",
        label: "E-Way Bill",
        sortable: false,

        render: (_, row) => (
          <EwayBillCell
            row={row}
            onGenerate={openEwayBill}
            disabled={actionsDisabled}
          />
        ),
      },

      {
        key: "receivePayment",
        label: "Payment",
        sortable: false,

        render: (_, row) => (
          <PaymentCell
            row={row}
            onReceive={
              handleReceivePayment
            }
            onPost={handlePostSingle}
            disabled={actionsDisabled}
          />
        ),
      },

      {
        key: "print",
        label: "Print",
        sortable: false,

        render: (_, row) =>
          row.status === "CANCELLED" ||
          actionsDisabled ? (
            <span className="dl-muted-value">
              —
            </span>
          ) : (
            <div
              className="sip-cell"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <PrintInvoiceButton
                invoiceNumber={
                  row.invoiceNumber
                }
                fetchInvoice={
                  fetchFullInvoice
                }
                className="sip-btn sip-btn-print"
                label={
                  <>
                    <span className="sip-btn-icon">
                      <Printer
                        size={14}
                        strokeWidth={2.5}
                      />
                    </span>

                    <span className="sip-btn-text">
                      Print
                    </span>
                  </>
                }
              />
            </div>
          ),
      },
      {
        key: "share",
        label: "Share",
        sortable: false,

        render: (_, row) =>
          row.status === "CANCELLED" ? (
            <span className="dl-muted-value">—</span>
          ) : (
            <div
              className="sip-cell"
              onClick={(event) => event.stopPropagation()}
            >
              <ShareInvoiceButton
                row={row}
                disabled={actionsDisabled}
              />
            </div>
          ),
      },
      {
        key: "invoiceDate",
        label: "Invoice Date",
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

        render: (value, row) =>
          isCreated(row) ? (
            <span className="dl-muted-value">
              N/A
            </span>
          ) : (
            formatPaise(value)
          ),
      },

      {
        key: "outstandingAmountPaise",
        label: "Pending Amount",
        type: "number",
        sortable: SERVER_SORTING_ENABLED,

        render: (value, row) =>
          isCreated(row) ? (
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
          isCreated(row) ? (
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
        label: "Deduct Stock",
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
        key: "createdAt",
        label: "Created On",
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
    [
      actionsDisabled,
      confirmLoading,
      handleView,
      openEwayBill,
      handleReceivePayment,
      handlePostSingle,
    ],
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
        value: "CREATED",
        label: "Created",
        ...(stats !== null
          ? { count: stats.CREATED }
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

  const posting = confirm.action === "post";
  const targetCount = confirm.rows.length;

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <div className="sil-list-page">
      {loadError && (
        <div
          className="sil-list-alert"
          role="alert"
        >
          {loadError}
        </div>
      )}

      <DataList
        title="Sales Invoices"
        subtitle="Manage customer invoices and sales postings"
        columns={columns}
        data={invoices}
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
        pageSizeOptions={
          PAGE_SIZE_OPTIONS
        }
        onPageChange={
          handlePageChange
        }
        onPageSizeChange={
          handlePageSizeChange
        }
        onSearch={handleSearch}
        onSort={handleSort}
        onFilterChange={
          handleFilterChange
        }
        filters={FILTERS}
        quickFilters={quickFilters}
        storageKey={`trustiq-sales-invoices-${
          sessionStorage.getItem(
            "selectedTenantId",
          ) || "current"
        }`}
        searchPlaceholder="Search invoice, customer, customer code..."
        actions={{
          view: handleView,
          edit: handleEdit,
          delete: (row) =>
            openAction(
              [row],
              "delete",
            ),
        }}
        bulkActions={[
          {
            key: "post",
            label: "Post Invoices",
            action: (rows) =>
              openAction(
                rows,
                "post",
              ),
          },
          {
            key: "delete",
            label: "Delete Created",
            danger: true,
            action: (rows) =>
              openAction(
                rows,
                "delete",
              ),
          },
          {
            key: "export",
            label: "Export Selected",
            action:
              handleExportSelected,
          },
        ]}
        onRefresh={() => {
          if (
            !actionLock.current &&
            !confirm.open &&
            !ewayBillInvoiceNumber
          ) {
            return refreshAll();
          }
        }}
        onExport={handleExport}
        addButton={
          <button
            type="button"
            className="so-primary-button"
            disabled={actionsDisabled}
            onClick={() =>
              navigate(
                SALES_PATHS.create,
              )
            }
          >
            <Plus size={16} />
            <span>
              New Sales Invoice
            </span>
          </button>
        }
      />

      <ConfirmModal
        open={confirm.open}
        type="post"
        title={
          actionFinished
            ? "Sales Invoice action results"
            : posting
              ? "Post selected sales invoices?"
              : "Delete created sales invoices?"
        }
        message={
          actionFinished
            ? "Review the results below. The list and global counts have been refreshed."
            : posting
              ? `Post ${targetCount} invoice(s)? This creates accounting entries and deducts tracked stock where selected. Do not post stock again for goods already dispatched through a Delivery Note.`
              : `Delete ${targetCount} created sales invoice(s)? They will be marked as deleted.`
        }
        confirmText={
          actionFinished
            ? "Close"
            : posting
              ? `Post ${targetCount} Invoice${
                  targetCount === 1
                    ? ""
                    : "s"
                }`
              : `Delete ${targetCount} Invoice${
                  targetCount === 1
                    ? ""
                    : "s"
                }`
        }
        cancelText="Back"
        loading={confirmLoading}
        loadingText={`Processing ${progress.done}/${progress.total}...`}
        onCancel={closeConfirm}
        onConfirm={handleConfirm}
      >
        <div className="sil-confirm-content">
          {!actionFinished && (
            <p className="sil-confirm-note">
              Each invoice is processed
              separately. Only CREATED invoices
              are eligible. The backend performs
              the final accounting, stock, and
              status checks.
            </p>
          )}

          {confirmLoading && (
            <p role="status">
              Processed {progress.done} of{" "}
              {progress.total}.
            </p>
          )}

          {failures.length > 0 && (
            <div
              className="sil-action-errors"
              role="alert"
            >
              <strong>
                Some actions could not be
                confirmed
              </strong>

              <ul>
                {failures.map(
                  (failure) => (
                    <li
                      key={failure.id}
                    >
                      <span>
                        {
                          failure.invoiceNumber
                        }
                      </span>
                      {": "}
                      {failure.message}

                      {failure.uncertain && (
                        <small>
                          This request may have
                          reached the server.
                          Verify the invoice,
                          journal, and stock
                          result before retrying.
                        </small>
                      )}
                    </li>
                  ),
                )}
              </ul>

              <p>
                No automatic retry was
                performed. Close this dialog,
                review the refreshed invoices,
                and select any remaining
                eligible records again if
                appropriate.
              </p>
            </div>
          )}
        </div>
      </ConfirmModal>

      {ewayBillInvoiceNumber && (
        <EwayBillModal
          key={ewayBillInvoiceNumber}
          invoiceNumber={
            ewayBillInvoiceNumber
          }
          onClose={() =>
            setEwayBillInvoiceNumber("")
          }
          onUpdated={
            handleEwayBillUpdated
          }
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tenant-based remount                                                 */
/* ------------------------------------------------------------------ */

export default function SalesInvoicesList() {
  const revision = useTenantRevision();

  return (
    <SalesInvoicesListContent
      key={revision}
    />
  );
}