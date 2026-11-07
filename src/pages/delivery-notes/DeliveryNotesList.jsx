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
//   X,
//   Truck,
//   PackageCheck,
//   Ban,
//   FileText,
// } from "lucide-react";

// import toast from "react-hot-toast";

// import DataList from "../../components/common/DataList/DataList";
// import StatusField from "../../components/common/StatusField/StatusField";
// import ConfirmModal from "../../components/common/ConfirmModal/ConfirmModal";

// import Input from "../../components/common/Form/Input";
// import Textarea from "../../components/common/Form/Textarea";
// import Button from "../../components/common/Form/Button";

// import { saveCsvFile } from "../../components/common/DataList/fileDownload";

// import api from "../../services/api";
// import routes from "../../config/routes";

// import "./delivery-notes-list.css";

// /* ------------------------------------------------------------------ */
// /* Configuration                                                       */
// /* ------------------------------------------------------------------ */

// const SERVER_SORTING_ENABLED = false;

// const PAGE_SIZE_OPTIONS = [20, 50, 100];
// const SEARCH_DELAY = 400;
// const EXPORT_BATCH_SIZE = 100;

// const STATUS_LABELS = {
//   CREATED: "Created",
//   DISPATCHED: "Dispatched",
//   DELIVERED: "Delivered",
//   CANCELLED: "Cancelled",
// };

// const STATUSES = Object.keys(STATUS_LABELS);

// const SORT_FIELDS = new Set([
//   "deliveryNoteNumber",
//   "deliveryDate",
//   "expectedDeliveryDate",
//   "sourceSalesOrderNumber",
//   "status",
//   "vehicleNumber",
//   "transporterName",
//   "trackingNumber",
//   "receivedByName",
//   "dispatchedAt",
//   "deliveredAt",
//   "createdAt",
// ]);

// const ACTIONS = {
//   dispatch: {
//     title: "Dispatch Delivery Note",
//     label: "Dispatch",
//     past: "dispatched",
//     allowed: "CREATED",
//     Icon: Truck,
//     description:
//       "Dispatch deducts stock for inventory-tracked Goods. Ensure the same shipment is not also deducted through an invoice.",
//   },

//   deliver: {
//     title: "Record Delivery",
//     label: "Mark Delivered",
//     past: "delivered",
//     allowed: "DISPATCHED",
//     Icon: PackageCheck,
//     description:
//       "Record who received the shipment. This does not create an invoice or collect payment.",
//   },

//   cancel: {
//     title: "Cancel Delivery Note",
//     label: "Cancel Note",
//     past: "cancelled",
//     allowed: "CREATED",
//     Icon: Ban,
//     description:
//       "Only created notes can be cancelled. Dispatched goods require a separate return or reversal workflow.",
//   },

//   delete: {
//     title: "Delete Delivery Note",
//     label: "Delete",
//     past: "deleted",
//     allowed: "CREATED",
//     Icon: X,
//     description:
//       "Only created notes can be soft-deleted.",
//   },
// };

// const FILTERS = [
//   {
//     key: "status",
//     label: "Status",
//     type: "select",
//     options: STATUSES,
//   },
// ];

// const EMPTY_BULK = {
//   open: false,
//   action: "",
//   rows: [],
// };

// /* ------------------------------------------------------------------ */
// /* Helpers                                                             */
// /* ------------------------------------------------------------------ */

// const formatDate = (
//   value,
//   includeTime = false,
// ) => {
//   if (!value) return "—";

//   const date = new Date(value);

//   if (Number.isNaN(date.getTime())) {
//     return "—";
//   }

//   return date.toLocaleString("en-IN", {
//     day: "2-digit",
//     month: "short",
//     year: "numeric",

//     ...(includeTime
//       ? {
//           hour: "2-digit",
//           minute: "2-digit",
//         }
//       : {
//           timeZone: "UTC",
//         }),
//   });
// };

// const csvDate = (value) => {
//   if (!value) return "";

//   const date = new Date(value);

//   return Number.isNaN(date.getTime())
//     ? ""
//     : date.toISOString();
// };

// const csvCell = (value) => {
//   let text = String(value ?? "");

//   if (/^\s*[=+\-@]/.test(text)) {
//     text = `'${text}`;
//   }

//   return `"${text.replace(/"/g, '""')}"`;
// };

// const getErrors = (error) => {
//   const body = error?.response?.data;

//   if (
//     Array.isArray(body?.errors) &&
//     body.errors.length
//   ) {
//     return body.errors
//       .map((item) =>
//         typeof item === "string"
//           ? item
//           : item?.message ||
//             item?.msg ||
//             String(item),
//       )
//       .join(", ");
//   }

//   return (
//     body?.message ||
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

// const extractNote = (response) => {
//   assertSuccess(response);

//   const note = response.data.data;

//   if (
//     !note?._id ||
//     !note.deliveryNoteNumber
//   ) {
//     throw new Error(
//       "Invalid Delivery Note response.",
//     );
//   }

//   return note;
// };

// const readNotePage = (response) => {
//   assertSuccess(response);

//   if (!Array.isArray(response.data.data)) {
//     throw new Error(
//       "Invalid Delivery Note list response.",
//     );
//   }

//   const pagination =
//     response.data.pagination;

//   const rawTotal = pagination?.total;

//   if (
//     rawTotal === undefined ||
//     rawTotal === null ||
//     !Number.isFinite(Number(rawTotal)) ||
//     Number(rawTotal) < 0
//   ) {
//     throw new Error(
//       "Delivery Note list must return pagination.total.",
//     );
//   }

//   return {
//     data: response.data.data,
//     total: Number(rawTotal),
//     pagination,
//   };
// };

// const assertVersion = (note) => {
//   if (
//     !Number.isSafeInteger(note.__v) ||
//     note.__v < 0
//   ) {
//     throw new Error(
//       "Document version is missing. Refresh the list.",
//     );
//   }
// };

// const assertSameNote = (latest, original) => {
//   if (
//     String(latest._id) !== String(original._id) ||
//     latest.deliveryNoteNumber !==
//       original.deliveryNoteNumber
//   ) {
//     throw new Error(
//       "The server returned a different Delivery Note.",
//     );
//   }
// };

// const assertUnchanged = (latest, original) => {
//   assertSameNote(latest, original);
//   assertVersion(latest);
//   assertVersion(original);

//   if (
//     latest.__v !== original.__v ||
//     latest.status !== original.status
//   ) {
//     throw new Error(
//       "This note changed. Review the refreshed record before trying again.",
//     );
//   }
// };

// const uniqueNotes = (records) =>
//   Array.from(
//     new Map(
//       records.map((record) => [
//         String(record._id),
//         record,
//       ]),
//     ).values(),
//   );

// /* ------------------------------------------------------------------ */
// /* CSV                                                                 */
// /* ------------------------------------------------------------------ */

// const EXPORT_FIELDS = [
//   [
//     "Delivery Note Number",
//     (row) => row.deliveryNoteNumber,
//   ],
//   ["Customer", (row) => row.customerName],
//   ["Customer Code", (row) => row.customerCode],
//   [
//     "Note Date",
//     (row) => csvDate(row.deliveryDate),
//   ],
//   [
//     "Expected Delivery",
//     (row) => csvDate(row.expectedDeliveryDate),
//   ],
//   [
//     "Sales Order",
//     (row) => row.sourceSalesOrderNumber,
//   ],
//   ["Status", (row) => row.status],
//   ["Item Lines", (row) => row.items?.length ?? ""],
//   ["Contact", (row) => row.contactPerson],
//   ["Contact Phone", (row) => row.contactPhone],
//   ["Shipping Address", (row) => row.shippingAddress],
//   ["Billing Address", (row) => row.billingAddress],
//   ["Transporter", (row) => row.transporterName],
//   ["Vehicle", (row) => row.vehicleNumber],
//   ["Tracking Number", (row) => row.trackingNumber],
//   [
//     "Transport Document",
//     (row) => row.transportDocumentNumber,
//   ],
//   [
//     "Transport Document Date",
//     (row) => csvDate(row.transportDocumentDate),
//   ],
//   [
//     "E-Way Bill Reference",
//     (row) => row.eWayBillNumber,
//   ],
//   [
//     "Dispatched At",
//     (row) => csvDate(row.dispatchedAt),
//   ],
//   [
//     "Delivered At",
//     (row) => csvDate(row.deliveredAt),
//   ],
//   ["Received By", (row) => row.receivedByName],
//   ["Recipient Phone", (row) => row.receivedByPhone],
//   ["Dispatch Remarks", (row) => row.dispatchRemarks],
//   ["Delivery Remarks", (row) => row.deliveryRemarks],
//   [
//     "Cancellation Reason",
//     (row) => row.cancellationReason,
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
// /* Individual view/action dialog                                       */
// /* ------------------------------------------------------------------ */

// function DeliveryNoteDialog({
//   note,
//   mode,
//   loading,
//   error,
//   onClose,
//   onSubmit,
// }) {
//   const dialogRef = useRef(null);
//   const closeRef = useRef(null);

//   const [remarks, setRemarks] = useState("");
//   const [recipient, setRecipient] = useState("");
//   const [phone, setPhone] = useState("");

//   const config =
//     mode === "view" ? null : ACTIONS[mode];

//   const Icon = config?.Icon || FileText;

//   useEffect(() => {
//     const previousFocus =
//       document.activeElement;

//     const previousOverflow =
//       document.body.style.overflow;

//     document.body.style.overflow = "hidden";
//     closeRef.current?.focus();

//     return () => {
//       document.body.style.overflow =
//         previousOverflow;

//       if (previousFocus?.isConnected) {
//         previousFocus.focus?.();
//       }
//     };
//   }, []);

//   const handleKeyDown = (event) => {
//     if (event.key === "Escape") {
//       event.preventDefault();

//       if (!loading) onClose();

//       return;
//     }

//     if (event.key !== "Tab") return;

//     const controls = Array.from(
//       dialogRef.current?.querySelectorAll(
//         'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
//       ) || [],
//     );

//     if (!controls.length) {
//       event.preventDefault();
//       dialogRef.current?.focus();
//       return;
//     }

//     const first = controls[0];
//     const last = controls[controls.length - 1];
//     const current = document.activeElement;

//     if (
//       event.shiftKey &&
//       (
//         current === first ||
//         !controls.includes(current)
//       )
//     ) {
//       event.preventDefault();
//       last.focus();
//     } else if (
//       !event.shiftKey &&
//       (
//         current === last ||
//         !controls.includes(current)
//       )
//     ) {
//       event.preventDefault();
//       first.focus();
//     }
//   };

//   const submit = (event) => {
//     event.preventDefault();

//     if (loading || !config) return;

//     const cleanedRemarks = remarks.trim();
//     const cleanedRecipient = recipient.trim();

//     if (
//       mode === "cancel" &&
//       !cleanedRemarks
//     ) {
//       return;
//     }

//     if (
//       mode === "deliver" &&
//       !cleanedRecipient
//     ) {
//       return;
//     }

//     void onSubmit({
//       remarks: cleanedRemarks,
//       recipient: cleanedRecipient,
//       phone: phone.trim(),
//     });
//   };

//   return (
//     <div
//       className="dnl-overlay"
//       onClick={(event) => {
//         if (
//           event.target === event.currentTarget &&
//           !loading
//         ) {
//           onClose();
//         }
//       }}
//     >
//       <section
//         ref={dialogRef}
//         className={`dnl-modal ${
//           mode === "view"
//             ? "dnl-modal-wide"
//             : ""
//         }`}
//         role="dialog"
//         aria-modal="true"
//         aria-labelledby="dnl-dialog-title"
//         aria-busy={loading}
//         tabIndex={-1}
//         onKeyDown={handleKeyDown}
//       >
//         <header className="dnl-modal-header">
//           <div className="dnl-modal-heading">
//             <span className="dnl-heading-icon">
//               <Icon size={21} />
//             </span>

//             <div>
//               <h2 id="dnl-dialog-title">
//                 {config?.title ||
//                   "Delivery Note Details"}
//               </h2>

//               <p>{note.deliveryNoteNumber}</p>
//             </div>
//           </div>

//           <button
//             ref={closeRef}
//             type="button"
//             className="dnl-close"
//             aria-label="Close dialog"
//             disabled={loading}
//             onClick={onClose}
//           >
//             <X size={19} />
//           </button>
//         </header>

//         <form
//           className="dnl-modal-form"
//           onSubmit={submit}
//         >
//           <div className="dnl-modal-body">
//             <div className="dnl-detail-grid">
//               <div>
//                 <span>Customer</span>
//                 <strong>{note.customerName}</strong>
//                 <small>{note.customerCode}</small>
//               </div>

//               <div>
//                 <span>Status</span>
//                 <StatusField value={note.status} />
//               </div>

//               <div>
//                 <span>Note Date</span>
//                 <strong>
//                   {formatDate(note.deliveryDate)}
//                 </strong>
//               </div>

//               <div>
//                 <span>Expected Delivery</span>
//                 <strong>
//                   {formatDate(
//                     note.expectedDeliveryDate,
//                   )}
//                 </strong>
//               </div>

//               <div>
//                 <span>Sales Order</span>
//                 <strong>
//                   {note.sourceSalesOrderNumber ||
//                     "Standalone"}
//                 </strong>
//               </div>

//               <div>
//                 <span>Shipping Address</span>
//                 <strong>
//                   {note.shippingAddress || "—"}
//                 </strong>
//               </div>
//             </div>

//             <div className="dnl-table-wrap">
//               <table className="dnl-items-table">
//                 <thead>
//                   <tr>
//                     <th>Product</th>
//                     <th>Quantity</th>
//                     <th>Inventory</th>
//                   </tr>
//                 </thead>

//                 <tbody>
//                   {(note.items || []).map(
//                     (item, index) => (
//                       <tr
//                         key={item.lineId || index}
//                       >
//                         <td>
//                           <strong>
//                             {item.productName}
//                           </strong>
//                           <small>
//                             {item.productCode}
//                           </small>
//                         </td>

//                         <td>
//                           {item.quantity} {item.unit}
//                         </td>

//                         <td>
//                           {item.trackInventory
//                             ? "Tracked"
//                             : "Not tracked"}
//                         </td>
//                       </tr>
//                     ),
//                   )}
//                 </tbody>
//               </table>
//             </div>

//             {mode === "view" ? (
//               <>
//                 <div className="dnl-detail-grid dnl-extra-details">
//                   {[
//                     ["GSTIN", note.customerGstNo],
//                     ["Contact", note.contactPerson],
//                     ["Phone", note.contactPhone],
//                     ["Billing Address", note.billingAddress],
//                     ["Transporter", note.transporterName],
//                     ["Vehicle", note.vehicleNumber],
//                     ["Tracking Number", note.trackingNumber],
//                     [
//                       "Transport Document",
//                       note.transportDocumentNumber,
//                     ],
//                     [
//                       "E-Way Bill Reference",
//                       note.eWayBillNumber,
//                     ],
//                     [
//                       "Dispatched",
//                       note.dispatchedAt
//                         ? formatDate(
//                             note.dispatchedAt,
//                             true,
//                           )
//                         : null,
//                     ],
//                     [
//                       "Delivered",
//                       note.deliveredAt
//                         ? formatDate(
//                             note.deliveredAt,
//                             true,
//                           )
//                         : null,
//                     ],
//                     ["Received By", note.receivedByName],
//                     [
//                       "Recipient Phone",
//                       note.receivedByPhone,
//                     ],
//                   ].map(([label, value]) => (
//                     <div key={label}>
//                       <span>{label}</span>
//                       <strong>{value || "—"}</strong>
//                     </div>
//                   ))}
//                 </div>

//                 {[
//                   ["Notes", note.notes],
//                   [
//                     "Terms & Conditions",
//                     note.termsAndConditions,
//                   ],
//                   [
//                     "Dispatch Remarks",
//                     note.dispatchRemarks,
//                   ],
//                   [
//                     "Delivery Remarks",
//                     note.deliveryRemarks,
//                   ],
//                   [
//                     "Cancellation Reason",
//                     note.cancellationReason,
//                   ],
//                 ]
//                   .filter(([, value]) => Boolean(value))
//                   .map(([label, value]) => (
//                     <div
//                       className="dnl-text-block"
//                       key={label}
//                     >
//                       <h3>{label}</h3>
//                       <p>{value}</p>
//                     </div>
//                   ))}
//               </>
//             ) : (
//               <div className="dnl-action-fields">
//                 <p className="dnl-information">
//                   {config.description}
//                 </p>

//                 {mode === "deliver" && (
//                   <div className="dnl-detail-grid">
//                     <Input
//                       label="Recipient Name"
//                       name="receivedByName"
//                       value={recipient}
//                       onChange={(event) =>
//                         setRecipient(event.target.value)
//                       }
//                       maxLength={150}
//                       required
//                       disabled={loading}
//                     />

//                     <Input
//                       label="Recipient Phone"
//                       name="receivedByPhone"
//                       type="tel"
//                       value={phone}
//                       onChange={(event) =>
//                         setPhone(event.target.value)
//                       }
//                       maxLength={30}
//                       disabled={loading}
//                     />
//                   </div>
//                 )}

//                 <Textarea
//                   label={
//                     mode === "cancel"
//                       ? "Cancellation Reason"
//                       : mode === "dispatch"
//                         ? "Dispatch Remarks"
//                         : "Delivery Remarks"
//                   }
//                   name="remarks"
//                   value={remarks}
//                   onChange={(event) =>
//                     setRemarks(event.target.value)
//                   }
//                   rows={4}
//                   maxLength={1000}
//                   required={mode === "cancel"}
//                   disabled={loading}
//                 />
//               </div>
//             )}

//             {error && (
//               <div
//                 className="dnl-error"
//                 role="alert"
//               >
//                 {error}
//               </div>
//             )}
//           </div>

//           <footer className="dnl-modal-footer">
//             <Button
//               type="button"
//               variant="secondary"
//               disabled={loading}
//               onClick={onClose}
//             >
//               {mode === "view" ? "Close" : "Back"}
//             </Button>

//             {config && (
//               <Button
//                 type="submit"
//                 icon={Icon}
//                 variant={
//                   mode === "cancel"
//                     ? "danger"
//                     : "primary"
//                 }
//                 loading={loading}
//                 disabled={
//                   loading ||
//                   (
//                     mode === "cancel" &&
//                     !remarks.trim()
//                   ) ||
//                   (
//                     mode === "deliver" &&
//                     !recipient.trim()
//                   )
//                 }
//               >
//                 {config.label}
//               </Button>
//             )}
//           </footer>
//         </form>
//       </section>
//     </div>
//   );
// }

// /* ------------------------------------------------------------------ */
// /* List component                                                      */
// /* ------------------------------------------------------------------ */

// function DeliveryNotesList() {
//   const navigate = useNavigate();

//   const [notes, setNotes] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [loadError, setLoadError] = useState("");
//   const [total, setTotal] = useState(0);

//   const [page, setPage] = useState(1);
//   const [pageSize, setPageSize] = useState(20);

//   const [searchInput, setSearchInput] =
//     useState("");

//   const [search, setSearch] = useState("");
//   const [filters, setFilters] = useState({});

//   const [sort, setSort] = useState({
//     key: "deliveryDate",
//     direction: "desc",
//   });

//   const [stats, setStats] = useState(null);

//   const [readingId, setReadingId] =
//     useState(null);

//   const [dialog, setDialog] = useState(null);
//   const [dialogLoading, setDialogLoading] =
//     useState(false);

//   const [dialogError, setDialogError] =
//     useState("");

//   const [bulkState, setBulkState] =
//     useState(EMPTY_BULK);

//   const [bulkLoading, setBulkLoading] =
//     useState(false);

//   const [bulkRemarks, setBulkRemarks] =
//     useState("");

//   const [bulkFinished, setBulkFinished] =
//     useState(false);

//   const [failures, setFailures] = useState([]);

//   const [progress, setProgress] = useState({
//     done: 0,
//     total: 0,
//   });

//   const mountedRef = useRef(false);
//   const listRequestRef = useRef(0);
//   const statsRequestRef = useRef(0);
//   const readRequestRef = useRef(0);
//   const mutationLockRef = useRef(false);
//   const exportLockRef = useRef(false);
//   const refreshRef = useRef(null);

//   const busy = dialogLoading || bulkLoading;
//   const modalOpen = Boolean(
//     dialog || bulkState.open,
//   );

//   useEffect(() => {
//     mountedRef.current = true;

//     return () => {
//       mountedRef.current = false;
//       listRequestRef.current += 1;
//       statsRequestRef.current += 1;
//       readRequestRef.current += 1;
//     };
//   }, []);

//   /* ---------------------------------------------------------------- */
//   /* Query state                                                       */
//   /* ---------------------------------------------------------------- */

//   useEffect(() => {
//     const next = searchInput.trim();

//     if (next === search) return undefined;

//     const timer = window.setTimeout(() => {
//       setSearch(next);
//       setPage(1);
//     }, SEARCH_DELAY);

//     return () => window.clearTimeout(timer);
//   }, [searchInput, search]);

//   const buildParams = useCallback(
//     (extra = {}) => ({
//       ...extra,

//       ...(search ? { search } : {}),

//       ...(filters.status
//         ? { status: filters.status }
//         : {}),

//       ...(SERVER_SORTING_ENABLED
//         ? {
//             sortBy: sort.key,
//             sortOrder: sort.direction,
//           }
//         : {}),
//     }),
//     [search, filters, sort],
//   );

//   /* ---------------------------------------------------------------- */
//   /* Load one page                                                     */
//   /* ---------------------------------------------------------------- */

//   const loadNotes = useCallback(async () => {
//     if (!mountedRef.current) return;

//     const requestId = ++listRequestRef.current;

//     const current = () =>
//       mountedRef.current &&
//       requestId === listRequestRef.current;

//     setLoading(true);
//     setLoadError("");

//     try {
//       const response =
//         await api.deliveryNote.getAll(
//           buildParams({
//             page,
//             limit: pageSize,
//           }),
//         );

//       if (!current()) return;

//       const result = readNotePage(response);

//       const lastPage = Math.max(
//         1,
//         Math.ceil(result.total / pageSize),
//       );

//       if (page > lastPage) {
//         setPage(lastPage);
//         return;
//       }

//       setNotes(result.data);
//       setTotal(result.total);
//     } catch (error) {
//       if (!current()) return;

//       const message = getErrors(error);

//       setNotes([]);
//       setTotal(0);
//       setLoadError(message);

//       toast.error(message);
//     } finally {
//       if (current()) setLoading(false);
//     }
//   }, [buildParams, page, pageSize]);

//   useEffect(() => {
//     loadNotes();

//     return () => {
//       listRequestRef.current += 1;
//     };
//   }, [loadNotes]);

//   /* ---------------------------------------------------------------- */
//   /* Global counts — no count-loading UI                                */
//   /* ---------------------------------------------------------------- */

//   const loadStats = useCallback(async () => {
//     if (!mountedRef.current) return;

//     const version = ++statsRequestRef.current;

//     try {
//       const nextStats = {};

//       for (const status of ["all", ...STATUSES]) {
//         if (
//           !mountedRef.current ||
//           version !== statsRequestRef.current
//         ) {
//           return;
//         }

//         const response =
//           await api.deliveryNote.getAll({
//             page: 1,
//             limit: 20,
//             ...(status === "all"
//               ? {}
//               : { status }),
//           });

//         nextStats[status] =
//           readNotePage(response).total;
//       }

//       if (
//         mountedRef.current &&
//         version === statsRequestRef.current
//       ) {
//         setStats(nextStats);
//       }
//     } catch (error) {
//       if (
//         mountedRef.current &&
//         version === statsRequestRef.current
//       ) {
//         setStats(null);

//         console.warn(
//           "Unable to load Delivery Note counts:",
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
//       loadNotes(),
//       loadStats(),
//     ]);
//   }, [loadNotes, loadStats]);

//   useEffect(() => {
//     refreshRef.current = refreshAll;
//   }, [refreshAll]);

//   const replaceNote = useCallback((updated) => {
//     setNotes((previous) =>
//       previous.map((note) =>
//         String(note._id) === String(updated._id)
//           ? updated
//           : note,
//       ),
//     );
//   }, []);

//   /* ---------------------------------------------------------------- */
//   /* Table callbacks                                                   */
//   /* ---------------------------------------------------------------- */

//   const handleSearch = useCallback((value) => {
//     setSearchInput(String(value ?? ""));
//   }, []);

//   const handleFilterChange = useCallback((next) => {
//     setFilters({
//       status: next?.status || "",
//     });

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
//             key: "deliveryDate",
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

//     if (!PAGE_SIZE_OPTIONS.includes(size)) return;

//     setPageSize(size);
//     setPage(1);
//   }, []);

//   /* ---------------------------------------------------------------- */
//   /* Action API adapter                                                */
//   /* ---------------------------------------------------------------- */

//   const executeAction = async (
//     action,
//     note,
//     {
//       remarks = "",
//       recipient = "",
//       phone = "",
//     } = {},
//   ) => {
//     switch (action) {
//       case "dispatch":
//         return api.deliveryNote.dispatch(
//           note.deliveryNoteNumber,
//           {
//             version: note.__v,
//             dispatchRemarks: remarks || null,
//           },
//         );

//       case "deliver":
//         return api.deliveryNote.deliver(
//           note.deliveryNoteNumber,
//           {
//             version: note.__v,
//             receivedByName: recipient,
//             receivedByPhone: phone || null,
//             deliveryRemarks: remarks || null,
//           },
//         );

//       case "cancel":
//         return api.deliveryNote.cancel(
//           note.deliveryNoteNumber,
//           {
//             version: note.__v,
//             cancellationReason: remarks,
//           },
//         );

//       case "delete":
//         // Preserve the supplied API signature.
//         return api.deliveryNote.delete(
//           note.deliveryNoteNumber,
//           note.__v,
//         );

//       default:
//         throw new Error("Unsupported action.");
//     }
//   };

//   /* ---------------------------------------------------------------- */
//   /* Open individual view/action dialog                                 */
//   /* ---------------------------------------------------------------- */

//   const openDialog = useCallback(
//     async (row, mode) => {
//       if (
//         mutationLockRef.current ||
//         modalOpen ||
//         readingId !== null
//       ) {
//         return;
//       }

//       const config =
//         mode === "view" ? null : ACTIONS[mode];

//       if (mode !== "view" && !config) {
//         toast.error("Unsupported action.");
//         return;
//       }

//       if (!row?.deliveryNoteNumber) {
//         toast.error(
//           "Delivery Note number is missing.",
//         );
//         return;
//       }

//       const requestId = ++readRequestRef.current;
//       setReadingId(row._id);

//       try {
//         const response =
//           await api.deliveryNote.getByNumber(
//             row.deliveryNoteNumber,
//           );

//         const latest = extractNote(response);

//         if (
//           !mountedRef.current ||
//           requestId !== readRequestRef.current
//         ) {
//           return;
//         }

//         assertSameNote(latest, row);

//         listRequestRef.current += 1;
//         setLoading(false);
//         replaceNote(latest);

//         if (
//           config &&
//           latest.status !== config.allowed
//         ) {
//           toast.error(
//             "The note status changed. Review the updated row.",
//           );
//           return;
//         }

//         if (config) assertVersion(latest);

//         setDialogError("");

//         setDialog({
//           note: latest,
//           mode,
//           key: `${latest._id}-${mode}-${requestId}`,
//         });
//       } catch (error) {
//         if (
//           mountedRef.current &&
//           requestId === readRequestRef.current
//         ) {
//           toast.error(getErrors(error));
//         }
//       } finally {
//         if (
//           mountedRef.current &&
//           requestId === readRequestRef.current
//         ) {
//           setReadingId(null);
//         }
//       }
//     },
//     [modalOpen, readingId, replaceNote],
//   );

//   const closeDialog = () => {
//     if (mutationLockRef.current) return;

//     readRequestRef.current += 1;
//     setDialog(null);
//     setDialogError("");
//   };

//   /* ---------------------------------------------------------------- */
//   /* Individual dispatch / delivery / cancellation                      */
//   /* ---------------------------------------------------------------- */

//   const submitAction = async ({
//     remarks,
//     recipient,
//     phone,
//   }) => {
//     if (
//       mutationLockRef.current ||
//       !dialog
//     ) {
//       return;
//     }

//     const { note, mode } = dialog;
//     const config = ACTIONS[mode];

//     if (!config || mode === "delete") {
//       setDialogError("Unsupported action.");
//       return;
//     }

//     const cleaned = {
//       remarks: String(remarks ?? "").trim(),
//       recipient: String(recipient ?? "").trim(),
//       phone: String(phone ?? "").trim(),
//     };

//     if (
//       cleaned.remarks.length > 1000 ||
//       cleaned.recipient.length > 150 ||
//       cleaned.phone.length > 30
//     ) {
//       setDialogError(
//         "One or more action fields exceed the supported length.",
//       );
//       return;
//     }

//     if (
//       mode === "cancel" &&
//       !cleaned.remarks
//     ) {
//       setDialogError(
//         "Cancellation reason is required.",
//       );
//       return;
//     }

//     if (
//       mode === "deliver" &&
//       !cleaned.recipient
//     ) {
//       setDialogError(
//         "Recipient name is required.",
//       );
//       return;
//     }

//     mutationLockRef.current = true;
//     listRequestRef.current += 1;
//     readRequestRef.current += 1;

//     setLoading(false);
//     setDialogLoading(true);
//     setDialogError("");

//     try {
//       const latestResponse =
//         await api.deliveryNote.getByNumber(
//           note.deliveryNoteNumber,
//         );

//       const latest = extractNote(latestResponse);

//       if (!mountedRef.current) return;

//       replaceNote(latest);
//       assertUnchanged(latest, note);

//       if (latest.status !== config.allowed) {
//         throw new Error(
//           "This action is no longer available.",
//         );
//       }

//       const response = await executeAction(
//         mode,
//         latest,
//         cleaned,
//       );

//       const updated = extractNote(response);
//       assertSameNote(updated, note);

//       if (!mountedRef.current) return;

//       replaceNote(updated);
//       setDialog(null);

//       toast.success(
//         response.data.message ||
//           "Delivery Note updated successfully.",
//       );

//       await refreshRef.current?.();
//     } catch (error) {
//       if (!mountedRef.current) return;

//       const message = getErrors(error);
//       setDialogError(message);

//       try {
//         const response =
//           await api.deliveryNote.getByNumber(
//             note.deliveryNoteNumber,
//           );

//         const latest = extractNote(response);
//         assertSameNote(latest, note);

//         if (!mountedRef.current) return;

//         replaceNote(latest);

//         if (latest.status !== config.allowed) {
//           setDialog(null);

//           toast(
//             `${latest.deliveryNoteNumber} is now ${
//               STATUS_LABELS[latest.status] ||
//               latest.status
//             }.`,
//           );
//         } else {
//           setDialog((current) =>
//             current
//               ? {
//                   ...current,
//                   note: latest,
//                 }
//               : current,
//           );

//           if (latest.__v !== note.__v) {
//             setDialogError(
//               "This note changed. Review the updated details before submitting again.",
//             );
//           }
//         }

//         await refreshRef.current?.();
//       } catch {
//         // Keep the original action error.
//       }
//     } finally {
//       mutationLockRef.current = false;

//       if (mountedRef.current) {
//         setDialogLoading(false);
//       }
//     }
//   };

//   /* ---------------------------------------------------------------- */
//   /* Single deletion and bulk actions                                  */
//   /* ---------------------------------------------------------------- */

//   const openBulkAction = useCallback(
//     (input, action) => {
//       if (
//         mutationLockRef.current ||
//         modalOpen ||
//         readingId !== null
//       ) {
//         return;
//       }

//       if (
//         !["dispatch", "cancel", "delete"].includes(
//           action,
//         )
//       ) {
//         return;
//       }

//       const config = ACTIONS[action];

//       const rows = uniqueNotes(
//         (Array.isArray(input) ? input : [input])
//           .filter(Boolean),
//       );

//       if (!rows.length) {
//         toast.error(
//           "Select at least one Delivery Note.",
//         );
//         return;
//       }

//       if (
//         rows.some(
//           (row) => row.status !== config.allowed,
//         )
//       ) {
//         toast.error(
//           "Select only CREATED notes for this action.",
//         );
//         return;
//       }

//       try {
//         for (const row of rows) {
//           if (!row._id || !row.deliveryNoteNumber) {
//             throw new Error(
//               "A selected note is missing its ID or number.",
//             );
//           }

//           assertVersion(row);
//         }

//         setBulkState({
//           open: true,
//           action,
//           rows,
//         });

//         setBulkRemarks("");
//         setFailures([]);
//         setBulkFinished(false);

//         setProgress({
//           done: 0,
//           total: rows.length,
//         });
//       } catch (error) {
//         toast.error(getErrors(error));
//       }
//     },
//     [modalOpen, readingId],
//   );

//   const closeBulk = () => {
//     if (mutationLockRef.current) return;

//     setBulkState(EMPTY_BULK);
//     setBulkRemarks("");
//     setFailures([]);
//     setBulkFinished(false);
//     setProgress({ done: 0, total: 0 });
//   };

//   const confirmBulk = async () => {
//     if (mutationLockRef.current) return;

//     if (bulkFinished) {
//       closeBulk();
//       return;
//     }

//     const { action } = bulkState;
//     const rows = [...bulkState.rows];
//     const config = ACTIONS[action];
//     const remarks = bulkRemarks.trim();

//     if (!config || !rows.length) return;

//     if (
//       action === "cancel" &&
//       !remarks
//     ) {
//       toast.error(
//         "Cancellation reason is required.",
//       );
//       return;
//     }

//     if (remarks.length > 1000) {
//       toast.error(
//         "Remarks cannot exceed 1,000 characters.",
//       );
//       return;
//     }

//     mutationLockRef.current = true;

//     listRequestRef.current += 1;
//     readRequestRef.current += 1;

//     setLoading(false);
//     setBulkLoading(true);
//     setFailures([]);

//     setProgress({
//       done: 0,
//       total: rows.length,
//     });

//     let successCount = 0;
//     const failed = [];

//     try {
//       // Each note is processed independently.
//       for (let index = 0; index < rows.length; index++) {
//         if (!mountedRef.current) break;

//         const original = rows[index];
//         let writeStarted = false;

//         try {
//           const latestResponse =
//             await api.deliveryNote.getByNumber(
//               original.deliveryNoteNumber,
//             );

//           const latest = extractNote(latestResponse);

//           if (!mountedRef.current) break;

//           replaceNote(latest);
//           assertUnchanged(latest, original);

//           if (latest.status !== config.allowed) {
//             throw new Error(
//               "This action is no longer available.",
//             );
//           }

//           writeStarted = true;

//           const response = await executeAction(
//             action,
//             latest,
//             { remarks },
//           );

//           assertSuccess(response);

//           if (action !== "delete") {
//             const updated = extractNote(response);
//             assertSameNote(updated, original);

//             if (mountedRef.current) {
//               replaceNote(updated);
//             }
//           }

//           successCount += 1;
//         } catch (error) {
//           const status =
//             error?.response?.status;

//           failed.push({
//             id: String(original._id),
//             number: original.deliveryNoteNumber,
//             message: getErrors(error),
//             uncertain:
//               writeStarted &&
//               (
//                 !status ||
//                 status >= 500 ||
//                 status === 408
//               ),
//           });
//         } finally {
//           if (mountedRef.current) {
//             setProgress({
//               done: index + 1,
//               total: rows.length,
//             });
//           }
//         }
//       }

//       if (!mountedRef.current) return;

//       if (successCount) {
//         toast.success(
//           `${successCount} Delivery Note${
//             successCount === 1 ? "" : "s"
//           } ${config.past} successfully.`,
//         );
//       }

//       if (failed.length) {
//         setFailures(failed);
//         setBulkFinished(true);

//         toast.error(
//           `${failed.length} action${
//             failed.length === 1 ? "" : "s"
//           } could not be confirmed.`,
//         );
//       } else {
//         setBulkState(EMPTY_BULK);
//         setBulkRemarks("");
//       }

//       await refreshRef.current?.();
//     } finally {
//       mutationLockRef.current = false;

//       if (mountedRef.current) {
//         setBulkLoading(false);
//       }
//     }
//   };

//   /* ---------------------------------------------------------------- */
//   /* CSV export                                                        */
//   /* ---------------------------------------------------------------- */

//   const handleExportSelected = useCallback(
//     async (rows) => {
//       if (exportLockRef.current) return;

//       if (!Array.isArray(rows) || !rows.length) {
//         toast.error(
//           "Select at least one Delivery Note.",
//         );
//         return;
//       }

//       exportLockRef.current = true;

//       const toastId = toast.loading(
//         "Exporting selected notes...",
//       );

//       try {
//         const records = uniqueNotes(rows);

//         await saveCsvFile(
//           "delivery-notes-selected.csv",
//           createCsv(records),
//         );

//         toast.success(
//           `Exported ${records.length} notes.`,
//           { id: toastId },
//         );
//       } catch (error) {
//         toast.error(getErrors(error), {
//           id: toastId,
//         });
//       } finally {
//         exportLockRef.current = false;
//       }
//     },
//     [],
//   );

//   const handleExport = useCallback(async () => {
//     if (exportLockRef.current) return;

//     exportLockRef.current = true;

//     const toastId = toast.loading(
//       "Preparing Delivery Note export...",
//     );

//     try {
//       const firstResponse =
//         await api.deliveryNote.getAll(
//           buildParams({
//             page: 1,
//             limit: EXPORT_BATCH_SIZE,
//           }),
//         );

//       const first = readNotePage(firstResponse);

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
//         if (!mountedRef.current) {
//           toast.dismiss(toastId);
//           return;
//         }

//         const response =
//           await api.deliveryNote.getAll(
//             buildParams({
//               page: currentPage,
//               limit: actualLimit,
//             }),
//           );

//         records.push(
//           ...readNotePage(response).data,
//         );

//         toast.loading(
//           `Exporting page ${currentPage} of ${totalPages}...`,
//           { id: toastId },
//         );
//       }

//       if (!mountedRef.current) {
//         toast.dismiss(toastId);
//         return;
//       }

//       const unique = uniqueNotes(records);

//       await saveCsvFile(
//         "delivery-notes-export.csv",
//         createCsv(unique),
//       );

//       toast.success(
//         `Exported ${unique.length} Delivery Notes.`,
//         { id: toastId },
//       );
//     } catch (error) {
//       toast.error(getErrors(error), {
//         id: toastId,
//       });
//     } finally {
//       exportLockRef.current = false;
//     }
//   }, [buildParams]);

//   /* ---------------------------------------------------------------- */
//   /* Columns                                                           */
//   /* ---------------------------------------------------------------- */

//   const columns = useMemo(
//     () => [
//       {
//         key: "deliveryNoteNumber",
//         label: "Delivery Note",
//         sortable: SERVER_SORTING_ENABLED,

//         render: (value, row) => (
//           <button
//             type="button"
//             className="dnl-document-link"
//             disabled={
//               busy ||
//               modalOpen ||
//               readingId !== null
//             }
//             onClick={(event) => {
//               event.stopPropagation();
//               void openDialog(row, "view");
//             }}
//           >
//             {value || "—"}
//           </button>
//         ),
//       },
//       {
//         key: "customerName",
//         label: "Customer",
//         sortable: false,

//         render: (value, row) => (
//           <div className="dl-customer">
//             <strong>{value || "—"}</strong>
//             <span>{row.customerCode || "—"}</span>
//           </div>
//         ),
//       },
//       {
//         key: "deliveryDate",
//         label: "Note Date",
//         sortable: SERVER_SORTING_ENABLED,
//         render: (value) => formatDate(value),
//       },
//       {
//         key: "expectedDeliveryDate",
//         label: "Expected Delivery",
//         sortable: SERVER_SORTING_ENABLED,
//         render: (value) => formatDate(value),
//       },
//       {
//         key: "sourceSalesOrderNumber",
//         label: "Sales Order",
//         sortable: SERVER_SORTING_ENABLED,

//         render: (value) =>
//           value || (
//             <span className="dl-muted-value">
//               Standalone
//             </span>
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
//         key: "vehicleNumber",
//         label: "Vehicle",
//         sortable: SERVER_SORTING_ENABLED,
//         render: (value) => value || "—",
//       },
//       {
//         key: "workflow",
//         label: "Next Actions",
//         sortable: false,

//         render: (_value, row) => {
//           const available = [
//             "dispatch",
//             "deliver",
//             "cancel",
//           ].filter(
//             (mode) =>
//               row.status === ACTIONS[mode].allowed,
//           );

//           return (
//             <div className="dnl-row-actions">
//               {available.map((mode) => {
//                 const config = ACTIONS[mode];
//                 const Icon = config.Icon;

//                 return (
//                   <button
//                     key={mode}
//                     type="button"
//                     className={`dnl-action ${
//                       mode === "cancel"
//                         ? "is-danger"
//                         : ""
//                     }`}
//                     disabled={
//                       busy ||
//                       modalOpen ||
//                       readingId !== null
//                     }
//                     onClick={(event) => {
//                       event.stopPropagation();
//                       void openDialog(row, mode);
//                     }}
//                   >
//                     <Icon size={14} />
//                     {config.label}
//                   </button>
//                 );
//               })}

//               {!available.length && (
//                 <span className="dl-muted-value">
//                   No further actions
//                 </span>
//               )}
//             </div>
//           );
//         },
//       },

//       ...[
//         ["transporterName", "Transporter"],
//         ["trackingNumber", "Tracking Number"],
//         ["receivedByName", "Received By"],
//       ].map(([key, label]) => ({
//         key,
//         label,
//         sortable: SERVER_SORTING_ENABLED,
//         visible: false,
//         render: (value) => value || "—",
//       })),

//       {
//         key: "dispatchedAt",
//         label: "Dispatched On",
//         sortable: SERVER_SORTING_ENABLED,
//         visible: false,
//         render: (value) => formatDate(value, true),
//       },
//       {
//         key: "deliveredAt",
//         label: "Delivered On",
//         sortable: SERVER_SORTING_ENABLED,
//         visible: false,
//         render: (value) => formatDate(value, true),
//       },
//       {
//         key: "createdAt",
//         label: "Created On",
//         sortable: SERVER_SORTING_ENABLED,
//         visible: false,
//         render: (value) => formatDate(value, true),
//       },
//     ],
//     [busy, modalOpen, readingId, openDialog],
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

//       ...STATUSES.map((status) => ({
//         key: "status",
//         value: status,
//         label: STATUS_LABELS[status],
//         ...(stats !== null
//           ? { count: stats[status] }
//           : {}),
//       })),
//     ],
//     [stats],
//   );

//   const bulkConfig = ACTIONS[bulkState.action];
//   const bulkCount = bulkState.rows.length;

//   /* ---------------------------------------------------------------- */
//   /* Render                                                            */
//   /* ---------------------------------------------------------------- */

//   return (
//     <div className="dnl-list-page">
//       {loadError && (
//         <div
//           className="dnl-error dnl-list-error"
//           role="alert"
//         >
//           Unable to load Delivery Notes: {loadError}
//         </div>
//       )}

//       <DataList
//         title="Delivery Notes"
//         subtitle="Manage shipments and delivery acknowledgments"
//         columns={columns}
//         data={notes}
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
//         pageSizeOptions={PAGE_SIZE_OPTIONS}
//         onPageChange={handlePageChange}
//         onPageSizeChange={handlePageSizeChange}
//         onSearch={handleSearch}
//         onSort={handleSort}
//         onFilterChange={handleFilterChange}
//         filters={FILTERS}
//         quickFilters={quickFilters}
//         storageKey="trustiq-delivery-notes"
//         searchPlaceholder="Search note, customer, order, vehicle..."
//         actions={{
//           view: (row) => {
//             void openDialog(row, "view");
//           },
//           delete: (row) =>
//             openBulkAction(row, "delete"),
//         }}
//         bulkActions={[
//           {
//             key: "dispatch",
//             label: "Dispatch Created",
//             action: (rows) =>
//               openBulkAction(rows, "dispatch"),
//           },
//           {
//             key: "cancel",
//             label: "Cancel Created",
//             danger: true,
//             action: (rows) =>
//               openBulkAction(rows, "cancel"),
//           },
//           {
//             key: "delete",
//             label: "Delete Created",
//             danger: true,
//             action: (rows) =>
//               openBulkAction(rows, "delete"),
//           },
//           {
//             key: "export",
//             label: "Export Selected",
//             action: handleExportSelected,
//           },
//         ]}
//         onRefresh={() => {
//           if (
//             !mutationLockRef.current &&
//             !modalOpen
//           ) {
//             return refreshAll();
//           }
//         }}
//         onExport={handleExport}
//         addButton={
//           <Button
//             type="button"
//             icon={Plus}
//             disabled={busy || modalOpen}
//             onClick={() =>
//               navigate(routes.sales.createDelivery)
//             }
//           >
//             New Delivery Note
//           </Button>
//         }
//       />

//       {dialog && (
//         <DeliveryNoteDialog
//           key={dialog.key}
//           note={dialog.note}
//           mode={dialog.mode}
//           loading={dialogLoading}
//           error={dialogError}
//           onClose={closeDialog}
//           onSubmit={submitAction}
//         />
//       )}

//       <ConfirmModal
//         open={bulkState.open}
//         type="danger"
//         title={
//           bulkFinished
//             ? "Delivery Note action results"
//             : `${bulkConfig?.label || "Update"} ${
//                 bulkCount > 1
//                   ? "selected Delivery Notes"
//                   : "Delivery Note"
//               }?`
//         }
//         message={
//           bulkFinished
//             ? "Review the results below. The list and global counts have been refreshed."
//             : `${bulkCount} note${
//                 bulkCount === 1 ? "" : "s"
//               }. ${bulkConfig?.description || ""} Each note is processed independently.`
//         }
//         confirmText={
//           bulkFinished
//             ? "Close"
//             : `${bulkConfig?.label || "Confirm"} ${
//                 bulkCount
//               } Note${
//                 bulkCount === 1 ? "" : "s"
//               }`
//         }
//         cancelText="Back"
//         loading={bulkLoading}
//         loadingText={`Processing ${progress.done}/${progress.total}...`}
//         onCancel={closeBulk}
//         onConfirm={confirmBulk}
//       >
//         <div className="dnl-bulk-content">
//           {!bulkFinished &&
//             ["dispatch", "cancel"].includes(
//               bulkState.action,
//             ) && (
//               <label className="dnl-bulk-remarks">
//                 <span>
//                   {bulkState.action === "cancel"
//                     ? "Cancellation Reason"
//                     : "Dispatch Remarks (optional)"}
//                 </span>

//                 <textarea
//                   rows={4}
//                   maxLength={1000}
//                   value={bulkRemarks}
//                   disabled={bulkLoading}
//                   required={
//                     bulkState.action === "cancel"
//                   }
//                   onChange={(event) =>
//                     setBulkRemarks(event.target.value)
//                   }
//                 />

//                 {bulkCount > 1 && (
//                   <small>
//                     The same text applies to every
//                     selected note.
//                   </small>
//                 )}
//               </label>
//             )}

//           {!bulkFinished && (
//             <p className="dnl-bulk-note">
//               Each note is reloaded and its selected
//               version checked before the action.
//               Changed notes are not submitted.
//             </p>
//           )}

//           {bulkLoading && (
//             <p role="status">
//               Processed {progress.done} of{" "}
//               {progress.total}.
//             </p>
//           )}

//           {failures.length > 0 && (
//             <div
//               className="dnl-bulk-errors"
//               role="alert"
//             >
//               <strong>
//                 Some actions could not be confirmed
//               </strong>

//               <ul>
//                 {failures.map((failure) => (
//                   <li key={failure.id}>
//                     <span>{failure.number}</span>
//                     {": "}
//                     {failure.message}

//                     {failure.uncertain && (
//                       <small>
//                         This action may have reached the
//                         server. Verify the note and stock
//                         outcome before retrying.
//                       </small>
//                     )}
//                   </li>
//                 ))}
//               </ul>

//               <p>
//                 No automatic retry was performed.
//                 Close this dialog and review the
//                 refreshed notes before selecting
//                 another action.
//               </p>
//             </div>
//           )}
//         </div>
//       </ConfirmModal>
//     </div>
//   );
// }

// export default DeliveryNotesList;

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
  X,
  Truck,
  PackageCheck,
  Ban,
  FileText,
} from "lucide-react";

import toast from "react-hot-toast";

import DataList from "../../components/common/DataList/DataList";
import StatusField from "../../components/common/StatusField/StatusField";
import ConfirmModal from "../../components/common/ConfirmModal/ConfirmModal";

import Input from "../../components/common/Form/Input";
import Textarea from "../../components/common/Form/Textarea";
import Button from "../../components/common/Form/Button";

import { saveCsvFile } from "../../components/common/DataList/fileDownload";

/* ---- NEW: print (TemplateManager) + share (ShareDeliveryNoteButton) ---- */

import api from "../../services/api";
import routes from "../../config/routes";

import "./delivery-notes-list.css";
import { PrintInvoiceButton } from "../../invoice-templates/TemplateManager";
import ShareDeliveryNoteButton from "../../components/billing/ShareDelivery/ShareDeliveryNoteButton";

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

const SERVER_SORTING_ENABLED = false;

const PAGE_SIZE_OPTIONS = [20, 50, 100];
const SEARCH_DELAY = 400;
const EXPORT_BATCH_SIZE = 100;

const STATUS_LABELS = {
  CREATED: "Created",
  DISPATCHED: "Dispatched",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

const STATUSES = Object.keys(STATUS_LABELS);

const SORT_FIELDS = new Set([
  "deliveryNoteNumber",
  "deliveryDate",
  "expectedDeliveryDate",
  "sourceSalesOrderNumber",
  "status",
  "vehicleNumber",
  "transporterName",
  "trackingNumber",
  "receivedByName",
  "dispatchedAt",
  "deliveredAt",
  "createdAt",
]);

const ACTIONS = {
  dispatch: {
    title: "Dispatch Delivery Note",
    label: "Dispatch",
    past: "dispatched",
    allowed: "CREATED",
    Icon: Truck,
    description:
      "Dispatch deducts stock for inventory-tracked Goods. Ensure the same shipment is not also deducted through an invoice.",
  },

  deliver: {
    title: "Record Delivery",
    label: "Mark Delivered",
    past: "delivered",
    allowed: "DISPATCHED",
    Icon: PackageCheck,
    description:
      "Record who received the shipment. This does not create an invoice or collect payment.",
  },

  cancel: {
    title: "Cancel Delivery Note",
    label: "Cancel Note",
    past: "cancelled",
    allowed: "CREATED",
    Icon: Ban,
    description:
      "Only created notes can be cancelled. Dispatched goods require a separate return or reversal workflow.",
  },

  delete: {
    title: "Delete Delivery Note",
    label: "Delete",
    past: "deleted",
    allowed: "CREATED",
    Icon: X,
    description:
      "Only created notes can be soft-deleted.",
  },
};

const FILTERS = [
  {
    key: "status",
    label: "Status",
    type: "select",
    options: STATUSES,
  },
];

const EMPTY_BULK = {
  open: false,
  action: "",
  rows: [],
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const formatDate = (
  value,
  includeTime = false,
) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",

    ...(includeTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
        }
      : {
          timeZone: "UTC",
        }),
  });
};

const csvDate = (value) => {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : date.toISOString();
};

const csvCell = (value) => {
  let text = String(value ?? "");

  if (/^\s*[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
};

const getErrors = (error) => {
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
            String(item),
      )
      .join(", ");
  }

  return (
    body?.message ||
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

const extractNote = (response) => {
  assertSuccess(response);

  const note = response.data.data;

  if (
    !note?._id ||
    !note.deliveryNoteNumber
  ) {
    throw new Error(
      "Invalid Delivery Note response.",
    );
  }

  return note;
};

const readNotePage = (response) => {
  assertSuccess(response);

  if (!Array.isArray(response.data.data)) {
    throw new Error(
      "Invalid Delivery Note list response.",
    );
  }

  const pagination =
    response.data.pagination;

  const rawTotal = pagination?.total;

  if (
    rawTotal === undefined ||
    rawTotal === null ||
    !Number.isFinite(Number(rawTotal)) ||
    Number(rawTotal) < 0
  ) {
    throw new Error(
      "Delivery Note list must return pagination.total.",
    );
  }

  return {
    data: response.data.data,
    total: Number(rawTotal),
    pagination,
  };
};

const assertVersion = (note) => {
  if (
    !Number.isSafeInteger(note.__v) ||
    note.__v < 0
  ) {
    throw new Error(
      "Document version is missing. Refresh the list.",
    );
  }
};

const assertSameNote = (latest, original) => {
  if (
    String(latest._id) !== String(original._id) ||
    latest.deliveryNoteNumber !==
      original.deliveryNoteNumber
  ) {
    throw new Error(
      "The server returned a different Delivery Note.",
    );
  }
};

const assertUnchanged = (latest, original) => {
  assertSameNote(latest, original);
  assertVersion(latest);
  assertVersion(original);

  if (
    latest.__v !== original.__v ||
    latest.status !== original.status
  ) {
    throw new Error(
      "This note changed. Review the refreshed record before trying again.",
    );
  }
};

const uniqueNotes = (records) =>
  Array.from(
    new Map(
      records.map((record) => [
        String(record._id),
        record,
      ]),
    ).values(),
  );

/* ------------------------------------------------------------------ */
/* CSV                                                                 */
/* ------------------------------------------------------------------ */

const EXPORT_FIELDS = [
  [
    "Delivery Note Number",
    (row) => row.deliveryNoteNumber,
  ],
  ["Customer", (row) => row.customerName],
  ["Customer Code", (row) => row.customerCode],
  [
    "Note Date",
    (row) => csvDate(row.deliveryDate),
  ],
  [
    "Expected Delivery",
    (row) => csvDate(row.expectedDeliveryDate),
  ],
  [
    "Sales Order",
    (row) => row.sourceSalesOrderNumber,
  ],
  ["Status", (row) => row.status],
  ["Item Lines", (row) => row.items?.length ?? ""],
  ["Contact", (row) => row.contactPerson],
  ["Contact Phone", (row) => row.contactPhone],
  ["Shipping Address", (row) => row.shippingAddress],
  ["Billing Address", (row) => row.billingAddress],
  ["Transporter", (row) => row.transporterName],
  ["Vehicle", (row) => row.vehicleNumber],
  ["Tracking Number", (row) => row.trackingNumber],
  [
    "Transport Document",
    (row) => row.transportDocumentNumber,
  ],
  [
    "Transport Document Date",
    (row) => csvDate(row.transportDocumentDate),
  ],
  [
    "E-Way Bill Reference",
    (row) => row.eWayBillNumber,
  ],
  [
    "Dispatched At",
    (row) => csvDate(row.dispatchedAt),
  ],
  [
    "Delivered At",
    (row) => csvDate(row.deliveredAt),
  ],
  ["Received By", (row) => row.receivedByName],
  ["Recipient Phone", (row) => row.receivedByPhone],
  ["Dispatch Remarks", (row) => row.dispatchRemarks],
  ["Delivery Remarks", (row) => row.deliveryRemarks],
  [
    "Cancellation Reason",
    (row) => row.cancellationReason,
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
/* Individual view/action dialog                                       */
/* ------------------------------------------------------------------ */

function DeliveryNoteDialog({
  note,
  mode,
  loading,
  error,
  onClose,
  onSubmit,
}) {
  const dialogRef = useRef(null);
  const closeRef = useRef(null);

  const [remarks, setRemarks] = useState("");
  const [recipient, setRecipient] = useState("");
  const [phone, setPhone] = useState("");

  const config =
    mode === "view" ? null : ACTIONS[mode];

  const Icon = config?.Icon || FileText;

  useEffect(() => {
    const previousFocus =
      document.activeElement;

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow =
        previousOverflow;

      if (previousFocus?.isConnected) {
        previousFocus.focus?.();
      }
    };
  }, []);

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();

      if (!loading) onClose();

      return;
    }

    if (event.key !== "Tab") return;

    const controls = Array.from(
      dialogRef.current?.querySelectorAll(
        'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
      ) || [],
    );

    if (!controls.length) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }

    const first = controls[0];
    const last = controls[controls.length - 1];
    const current = document.activeElement;

    if (
      event.shiftKey &&
      (
        current === first ||
        !controls.includes(current)
      )
    ) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      (
        current === last ||
        !controls.includes(current)
      )
    ) {
      event.preventDefault();
      first.focus();
    }
  };

  const submit = (event) => {
    event.preventDefault();

    if (loading || !config) return;

    const cleanedRemarks = remarks.trim();
    const cleanedRecipient = recipient.trim();

    if (
      mode === "cancel" &&
      !cleanedRemarks
    ) {
      return;
    }

    if (
      mode === "deliver" &&
      !cleanedRecipient
    ) {
      return;
    }

    void onSubmit({
      remarks: cleanedRemarks,
      recipient: cleanedRecipient,
      phone: phone.trim(),
    });
  };

  return (
    <div
      className="dnl-overlay"
      onClick={(event) => {
        if (
          event.target === event.currentTarget &&
          !loading
        ) {
          onClose();
        }
      }}
    >
      <section
        ref={dialogRef}
        className={`dnl-modal ${
          mode === "view"
            ? "dnl-modal-wide"
            : ""
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dnl-dialog-title"
        aria-busy={loading}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <header className="dnl-modal-header">
          <div className="dnl-modal-heading">
            <span className="dnl-heading-icon">
              <Icon size={21} />
            </span>

            <div>
              <h2 id="dnl-dialog-title">
                {config?.title ||
                  "Delivery Note Details"}
              </h2>

              <p>{note.deliveryNoteNumber}</p>
            </div>
          </div>

          <button
            ref={closeRef}
            type="button"
            className="dnl-close"
            aria-label="Close dialog"
            disabled={loading}
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </header>

        <form
          className="dnl-modal-form"
          onSubmit={submit}
        >
          <div className="dnl-modal-body">
            <div className="dnl-detail-grid">
              <div>
                <span>Customer</span>
                <strong>{note.customerName}</strong>
                <small>{note.customerCode}</small>
              </div>

              <div>
                <span>Status</span>
                <StatusField value={note.status} />
              </div>

              <div>
                <span>Note Date</span>
                <strong>
                  {formatDate(note.deliveryDate)}
                </strong>
              </div>

              <div>
                <span>Expected Delivery</span>
                <strong>
                  {formatDate(
                    note.expectedDeliveryDate,
                  )}
                </strong>
              </div>

              <div>
                <span>Sales Order</span>
                <strong>
                  {note.sourceSalesOrderNumber ||
                    "Standalone"}
                </strong>
              </div>

              <div>
                <span>Shipping Address</span>
                <strong>
                  {note.shippingAddress || "—"}
                </strong>
              </div>
            </div>

            <div className="dnl-table-wrap">
              <table className="dnl-items-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Inventory</th>
                  </tr>
                </thead>

                <tbody>
                  {(note.items || []).map(
                    (item, index) => (
                      <tr
                        key={item.lineId || index}
                      >
                        <td>
                          <strong>
                            {item.productName}
                          </strong>
                          <small>
                            {item.productCode}
                          </small>
                        </td>

                        <td>
                          {item.quantity} {item.unit}
                        </td>

                        <td>
                          {item.trackInventory
                            ? "Tracked"
                            : "Not tracked"}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>

            {mode === "view" ? (
              <>
                <div className="dnl-detail-grid dnl-extra-details">
                  {[
                    ["GSTIN", note.customerGstNo],
                    ["Contact", note.contactPerson],
                    ["Phone", note.contactPhone],
                    ["Billing Address", note.billingAddress],
                    ["Transporter", note.transporterName],
                    ["Vehicle", note.vehicleNumber],
                    ["Tracking Number", note.trackingNumber],
                    [
                      "Transport Document",
                      note.transportDocumentNumber,
                    ],
                    [
                      "E-Way Bill Reference",
                      note.eWayBillNumber,
                    ],
                    [
                      "Dispatched",
                      note.dispatchedAt
                        ? formatDate(
                            note.dispatchedAt,
                            true,
                          )
                        : null,
                    ],
                    [
                      "Delivered",
                      note.deliveredAt
                        ? formatDate(
                            note.deliveredAt,
                            true,
                          )
                        : null,
                    ],
                    ["Received By", note.receivedByName],
                    [
                      "Recipient Phone",
                      note.receivedByPhone,
                    ],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <strong>{value || "—"}</strong>
                    </div>
                  ))}
                </div>

                {[
                  ["Notes", note.notes],
                  [
                    "Terms & Conditions",
                    note.termsAndConditions,
                  ],
                  [
                    "Dispatch Remarks",
                    note.dispatchRemarks,
                  ],
                  [
                    "Delivery Remarks",
                    note.deliveryRemarks,
                  ],
                  [
                    "Cancellation Reason",
                    note.cancellationReason,
                  ],
                ]
                  .filter(([, value]) => Boolean(value))
                  .map(([label, value]) => (
                    <div
                      className="dnl-text-block"
                      key={label}
                    >
                      <h3>{label}</h3>
                      <p>{value}</p>
                    </div>
                  ))}
              </>
            ) : (
              <div className="dnl-action-fields">
                <p className="dnl-information">
                  {config.description}
                </p>

                {mode === "deliver" && (
                  <div className="dnl-detail-grid">
                    <Input
                      label="Recipient Name"
                      name="receivedByName"
                      value={recipient}
                      onChange={(event) =>
                        setRecipient(event.target.value)
                      }
                      maxLength={150}
                      required
                      disabled={loading}
                    />

                    <Input
                      label="Recipient Phone"
                      name="receivedByPhone"
                      type="tel"
                      value={phone}
                      onChange={(event) =>
                        setPhone(event.target.value)
                      }
                      maxLength={30}
                      disabled={loading}
                    />
                  </div>
                )}

                <Textarea
                  label={
                    mode === "cancel"
                      ? "Cancellation Reason"
                      : mode === "dispatch"
                        ? "Dispatch Remarks"
                        : "Delivery Remarks"
                  }
                  name="remarks"
                  value={remarks}
                  onChange={(event) =>
                    setRemarks(event.target.value)
                  }
                  rows={4}
                  maxLength={1000}
                  required={mode === "cancel"}
                  disabled={loading}
                />
              </div>
            )}

            {error && (
              <div
                className="dnl-error"
                role="alert"
              >
                {error}
              </div>
            )}
          </div>

          <footer className="dnl-modal-footer">
            <Button
              type="button"
              variant="secondary"
              disabled={loading}
              onClick={onClose}
            >
              {mode === "view" ? "Close" : "Back"}
            </Button>

            {config && (
              <Button
                type="submit"
                icon={Icon}
                variant={
                  mode === "cancel"
                    ? "danger"
                    : "primary"
                }
                loading={loading}
                disabled={
                  loading ||
                  (
                    mode === "cancel" &&
                    !remarks.trim()
                  ) ||
                  (
                    mode === "deliver" &&
                    !recipient.trim()
                  )
                }
              >
                {config.label}
              </Button>
            )}
          </footer>
        </form>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* List component                                                      */
/* ------------------------------------------------------------------ */

function DeliveryNotesList() {
  const navigate = useNavigate();

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [total, setTotal] = useState(0);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [searchInput, setSearchInput] =
    useState("");

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});

  const [sort, setSort] = useState({
    key: "deliveryDate",
    direction: "desc",
  });

  const [stats, setStats] = useState(null);

  const [readingId, setReadingId] =
    useState(null);

  const [dialog, setDialog] = useState(null);
  const [dialogLoading, setDialogLoading] =
    useState(false);

  const [dialogError, setDialogError] =
    useState("");

  const [bulkState, setBulkState] =
    useState(EMPTY_BULK);

  const [bulkLoading, setBulkLoading] =
    useState(false);

  const [bulkRemarks, setBulkRemarks] =
    useState("");

  const [bulkFinished, setBulkFinished] =
    useState(false);

  const [failures, setFailures] = useState([]);

  const [progress, setProgress] = useState({
    done: 0,
    total: 0,
  });

  const mountedRef = useRef(false);
  const listRequestRef = useRef(0);
  const statsRequestRef = useRef(0);
  const readRequestRef = useRef(0);
  const mutationLockRef = useRef(false);
  const exportLockRef = useRef(false);
  const refreshRef = useRef(null);

  const busy = dialogLoading || bulkLoading;
  const modalOpen = Boolean(
    dialog || bulkState.open,
  );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      listRequestRef.current += 1;
      statsRequestRef.current += 1;
      readRequestRef.current += 1;
    };
  }, []);

  /* ---------------------------------------------------------------- */
  /* Query state                                                       */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    const next = searchInput.trim();

    if (next === search) return undefined;

    const timer = window.setTimeout(() => {
      setSearch(next);
      setPage(1);
    }, SEARCH_DELAY);

    return () => window.clearTimeout(timer);
  }, [searchInput, search]);

  const buildParams = useCallback(
    (extra = {}) => ({
      ...extra,

      ...(search ? { search } : {}),

      ...(filters.status
        ? { status: filters.status }
        : {}),

      ...(SERVER_SORTING_ENABLED
        ? {
            sortBy: sort.key,
            sortOrder: sort.direction,
          }
        : {}),
    }),
    [search, filters, sort],
  );

  /* ---------------------------------------------------------------- */
  /* Load one page                                                     */
  /* ---------------------------------------------------------------- */

  const loadNotes = useCallback(async () => {
    if (!mountedRef.current) return;

    const requestId = ++listRequestRef.current;

    const current = () =>
      mountedRef.current &&
      requestId === listRequestRef.current;

    setLoading(true);
    setLoadError("");

    try {
      const response =
        await api.deliveryNote.getAll(
          buildParams({
            page,
            limit: pageSize,
          }),
        );

      if (!current()) return;

      const result = readNotePage(response);

      const lastPage = Math.max(
        1,
        Math.ceil(result.total / pageSize),
      );

      if (page > lastPage) {
        setPage(lastPage);
        return;
      }

      setNotes(result.data);
      setTotal(result.total);
    } catch (error) {
      if (!current()) return;

      const message = getErrors(error);

      setNotes([]);
      setTotal(0);
      setLoadError(message);

      toast.error(message);
    } finally {
      if (current()) setLoading(false);
    }
  }, [buildParams, page, pageSize]);

  useEffect(() => {
    loadNotes();

    return () => {
      listRequestRef.current += 1;
    };
  }, [loadNotes]);

  /* ---------------------------------------------------------------- */
  /* Global counts — no count-loading UI                                */
  /* ---------------------------------------------------------------- */

  const loadStats = useCallback(async () => {
    if (!mountedRef.current) return;

    const version = ++statsRequestRef.current;

    try {
      const nextStats = {};

      for (const status of ["all", ...STATUSES]) {
        if (
          !mountedRef.current ||
          version !== statsRequestRef.current
        ) {
          return;
        }

        const response =
          await api.deliveryNote.getAll({
            page: 1,
            limit: 20,
            ...(status === "all"
              ? {}
              : { status }),
          });

        nextStats[status] =
          readNotePage(response).total;
      }

      if (
        mountedRef.current &&
        version === statsRequestRef.current
      ) {
        setStats(nextStats);
      }
    } catch (error) {
      if (
        mountedRef.current &&
        version === statsRequestRef.current
      ) {
        setStats(null);

        console.warn(
          "Unable to load Delivery Note counts:",
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
      loadNotes(),
      loadStats(),
    ]);
  }, [loadNotes, loadStats]);

  useEffect(() => {
    refreshRef.current = refreshAll;
  }, [refreshAll]);

  const replaceNote = useCallback((updated) => {
    setNotes((previous) =>
      previous.map((note) =>
        String(note._id) === String(updated._id)
          ? updated
          : note,
      ),
    );
  }, []);

  /* ---------------------------------------------------------------- */
  /* Table callbacks                                                   */
  /* ---------------------------------------------------------------- */

  const handleSearch = useCallback((value) => {
    setSearchInput(String(value ?? ""));
  }, []);

  const handleFilterChange = useCallback((next) => {
    setFilters({
      status: next?.status || "",
    });

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
            key: "deliveryDate",
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
  /* Action API adapter                                                */
  /* ---------------------------------------------------------------- */

  const executeAction = async (
    action,
    note,
    {
      remarks = "",
      recipient = "",
      phone = "",
    } = {},
  ) => {
    switch (action) {
      case "dispatch":
        return api.deliveryNote.dispatch(
          note.deliveryNoteNumber,
          {
            version: note.__v,
            dispatchRemarks: remarks || null,
          },
        );

      case "deliver":
        return api.deliveryNote.deliver(
          note.deliveryNoteNumber,
          {
            version: note.__v,
            receivedByName: recipient,
            receivedByPhone: phone || null,
            deliveryRemarks: remarks || null,
          },
        );

      case "cancel":
        return api.deliveryNote.cancel(
          note.deliveryNoteNumber,
          {
            version: note.__v,
            cancellationReason: remarks,
          },
        );

      case "delete":
        // Preserve the supplied API signature.
        return api.deliveryNote.delete(
          note.deliveryNoteNumber,
          note.__v,
        );

      default:
        throw new Error("Unsupported action.");
    }
  };

  /* ---------------------------------------------------------------- */
  /* Open individual view/action dialog                                 */
  /* ---------------------------------------------------------------- */

  const openDialog = useCallback(
    async (row, mode) => {
      if (
        mutationLockRef.current ||
        modalOpen ||
        readingId !== null
      ) {
        return;
      }

      const config =
        mode === "view" ? null : ACTIONS[mode];

      if (mode !== "view" && !config) {
        toast.error("Unsupported action.");
        return;
      }

      if (!row?.deliveryNoteNumber) {
        toast.error(
          "Delivery Note number is missing.",
        );
        return;
      }

      const requestId = ++readRequestRef.current;
      setReadingId(row._id);

      try {
        const response =
          await api.deliveryNote.getByNumber(
            row.deliveryNoteNumber,
          );

        const latest = extractNote(response);

        if (
          !mountedRef.current ||
          requestId !== readRequestRef.current
        ) {
          return;
        }

        assertSameNote(latest, row);

        listRequestRef.current += 1;
        setLoading(false);
        replaceNote(latest);

        if (
          config &&
          latest.status !== config.allowed
        ) {
          toast.error(
            "The note status changed. Review the updated row.",
          );
          return;
        }

        if (config) assertVersion(latest);

        setDialogError("");

        setDialog({
          note: latest,
          mode,
          key: `${latest._id}-${mode}-${requestId}`,
        });
      } catch (error) {
        if (
          mountedRef.current &&
          requestId === readRequestRef.current
        ) {
          toast.error(getErrors(error));
        }
      } finally {
        if (
          mountedRef.current &&
          requestId === readRequestRef.current
        ) {
          setReadingId(null);
        }
      }
    },
    [modalOpen, readingId, replaceNote],
  );

  const closeDialog = () => {
    if (mutationLockRef.current) return;

    readRequestRef.current += 1;
    setDialog(null);
    setDialogError("");
  };

  /* ---------------------------------------------------------------- */
  /* Individual dispatch / delivery / cancellation                      */
  /* ---------------------------------------------------------------- */

  const submitAction = async ({
    remarks,
    recipient,
    phone,
  }) => {
    if (
      mutationLockRef.current ||
      !dialog
    ) {
      return;
    }

    const { note, mode } = dialog;
    const config = ACTIONS[mode];

    if (!config || mode === "delete") {
      setDialogError("Unsupported action.");
      return;
    }

    const cleaned = {
      remarks: String(remarks ?? "").trim(),
      recipient: String(recipient ?? "").trim(),
      phone: String(phone ?? "").trim(),
    };

    if (
      cleaned.remarks.length > 1000 ||
      cleaned.recipient.length > 150 ||
      cleaned.phone.length > 30
    ) {
      setDialogError(
        "One or more action fields exceed the supported length.",
      );
      return;
    }

    if (
      mode === "cancel" &&
      !cleaned.remarks
    ) {
      setDialogError(
        "Cancellation reason is required.",
      );
      return;
    }

    if (
      mode === "deliver" &&
      !cleaned.recipient
    ) {
      setDialogError(
        "Recipient name is required.",
      );
      return;
    }

    mutationLockRef.current = true;
    listRequestRef.current += 1;
    readRequestRef.current += 1;

    setLoading(false);
    setDialogLoading(true);
    setDialogError("");

    try {
      const latestResponse =
        await api.deliveryNote.getByNumber(
          note.deliveryNoteNumber,
        );

      const latest = extractNote(latestResponse);

      if (!mountedRef.current) return;

      replaceNote(latest);
      assertUnchanged(latest, note);

      if (latest.status !== config.allowed) {
        throw new Error(
          "This action is no longer available.",
        );
      }

      const response = await executeAction(
        mode,
        latest,
        cleaned,
      );

      const updated = extractNote(response);
      assertSameNote(updated, note);

      if (!mountedRef.current) return;

      replaceNote(updated);
      setDialog(null);

      toast.success(
        response.data.message ||
          "Delivery Note updated successfully.",
      );

      await refreshRef.current?.();
    } catch (error) {
      if (!mountedRef.current) return;

      const message = getErrors(error);
      setDialogError(message);

      try {
        const response =
          await api.deliveryNote.getByNumber(
            note.deliveryNoteNumber,
          );

        const latest = extractNote(response);
        assertSameNote(latest, note);

        if (!mountedRef.current) return;

        replaceNote(latest);

        if (latest.status !== config.allowed) {
          setDialog(null);

          toast(
            `${latest.deliveryNoteNumber} is now ${
              STATUS_LABELS[latest.status] ||
              latest.status
            }.`,
          );
        } else {
          setDialog((current) =>
            current
              ? {
                  ...current,
                  note: latest,
                }
              : current,
          );

          if (latest.__v !== note.__v) {
            setDialogError(
              "This note changed. Review the updated details before submitting again.",
            );
          }
        }

        await refreshRef.current?.();
      } catch {
        // Keep the original action error.
      }
    } finally {
      mutationLockRef.current = false;

      if (mountedRef.current) {
        setDialogLoading(false);
      }
    }
  };

  /* ---------------------------------------------------------------- */
  /* Single deletion and bulk actions                                  */
  /* ---------------------------------------------------------------- */

  const openBulkAction = useCallback(
    (input, action) => {
      if (
        mutationLockRef.current ||
        modalOpen ||
        readingId !== null
      ) {
        return;
      }

      if (
        !["dispatch", "cancel", "delete"].includes(
          action,
        )
      ) {
        return;
      }

      const config = ACTIONS[action];

      const rows = uniqueNotes(
        (Array.isArray(input) ? input : [input])
          .filter(Boolean),
      );

      if (!rows.length) {
        toast.error(
          "Select at least one Delivery Note.",
        );
        return;
      }

      if (
        rows.some(
          (row) => row.status !== config.allowed,
        )
      ) {
        toast.error(
          "Select only CREATED notes for this action.",
        );
        return;
      }

      try {
        for (const row of rows) {
          if (!row._id || !row.deliveryNoteNumber) {
            throw new Error(
              "A selected note is missing its ID or number.",
            );
          }

          assertVersion(row);
        }

        setBulkState({
          open: true,
          action,
          rows,
        });

        setBulkRemarks("");
        setFailures([]);
        setBulkFinished(false);

        setProgress({
          done: 0,
          total: rows.length,
        });
      } catch (error) {
        toast.error(getErrors(error));
      }
    },
    [modalOpen, readingId],
  );

  const closeBulk = () => {
    if (mutationLockRef.current) return;

    setBulkState(EMPTY_BULK);
    setBulkRemarks("");
    setFailures([]);
    setBulkFinished(false);
    setProgress({ done: 0, total: 0 });
  };

  const confirmBulk = async () => {
    if (mutationLockRef.current) return;

    if (bulkFinished) {
      closeBulk();
      return;
    }

    const { action } = bulkState;
    const rows = [...bulkState.rows];
    const config = ACTIONS[action];
    const remarks = bulkRemarks.trim();

    if (!config || !rows.length) return;

    if (
      action === "cancel" &&
      !remarks
    ) {
      toast.error(
        "Cancellation reason is required.",
      );
      return;
    }

    if (remarks.length > 1000) {
      toast.error(
        "Remarks cannot exceed 1,000 characters.",
      );
      return;
    }

    mutationLockRef.current = true;

    listRequestRef.current += 1;
    readRequestRef.current += 1;

    setLoading(false);
    setBulkLoading(true);
    setFailures([]);

    setProgress({
      done: 0,
      total: rows.length,
    });

    let successCount = 0;
    const failed = [];

    try {
      // Each note is processed independently.
      for (let index = 0; index < rows.length; index++) {
        if (!mountedRef.current) break;

        const original = rows[index];
        let writeStarted = false;

        try {
          const latestResponse =
            await api.deliveryNote.getByNumber(
              original.deliveryNoteNumber,
            );

          const latest = extractNote(latestResponse);

          if (!mountedRef.current) break;

          replaceNote(latest);
          assertUnchanged(latest, original);

          if (latest.status !== config.allowed) {
            throw new Error(
              "This action is no longer available.",
            );
          }

          writeStarted = true;

          const response = await executeAction(
            action,
            latest,
            { remarks },
          );

          assertSuccess(response);

          if (action !== "delete") {
            const updated = extractNote(response);
            assertSameNote(updated, original);

            if (mountedRef.current) {
              replaceNote(updated);
            }
          }

          successCount += 1;
        } catch (error) {
          const status =
            error?.response?.status;

          failed.push({
            id: String(original._id),
            number: original.deliveryNoteNumber,
            message: getErrors(error),
            uncertain:
              writeStarted &&
              (
                !status ||
                status >= 500 ||
                status === 408
              ),
          });
        } finally {
          if (mountedRef.current) {
            setProgress({
              done: index + 1,
              total: rows.length,
            });
          }
        }
      }

      if (!mountedRef.current) return;

      if (successCount) {
        toast.success(
          `${successCount} Delivery Note${
            successCount === 1 ? "" : "s"
          } ${config.past} successfully.`,
        );
      }

      if (failed.length) {
        setFailures(failed);
        setBulkFinished(true);

        toast.error(
          `${failed.length} action${
            failed.length === 1 ? "" : "s"
          } could not be confirmed.`,
        );
      } else {
        setBulkState(EMPTY_BULK);
        setBulkRemarks("");
      }

      await refreshRef.current?.();
    } finally {
      mutationLockRef.current = false;

      if (mountedRef.current) {
        setBulkLoading(false);
      }
    }
  };

  /* ---------------------------------------------------------------- */
  /* CSV export                                                        */
  /* ---------------------------------------------------------------- */

  const handleExportSelected = useCallback(
    async (rows) => {
      if (exportLockRef.current) return;

      if (!Array.isArray(rows) || !rows.length) {
        toast.error(
          "Select at least one Delivery Note.",
        );
        return;
      }

      exportLockRef.current = true;

      const toastId = toast.loading(
        "Exporting selected notes...",
      );

      try {
        const records = uniqueNotes(rows);

        await saveCsvFile(
          "delivery-notes-selected.csv",
          createCsv(records),
        );

        toast.success(
          `Exported ${records.length} notes.`,
          { id: toastId },
        );
      } catch (error) {
        toast.error(getErrors(error), {
          id: toastId,
        });
      } finally {
        exportLockRef.current = false;
      }
    },
    [],
  );

  const handleExport = useCallback(async () => {
    if (exportLockRef.current) return;

    exportLockRef.current = true;

    const toastId = toast.loading(
      "Preparing Delivery Note export...",
    );

    try {
      const firstResponse =
        await api.deliveryNote.getAll(
          buildParams({
            page: 1,
            limit: EXPORT_BATCH_SIZE,
          }),
        );

      const first = readNotePage(firstResponse);

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
        if (!mountedRef.current) {
          toast.dismiss(toastId);
          return;
        }

        const response =
          await api.deliveryNote.getAll(
            buildParams({
              page: currentPage,
              limit: actualLimit,
            }),
          );

        records.push(
          ...readNotePage(response).data,
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

      const unique = uniqueNotes(records);

      await saveCsvFile(
        "delivery-notes-export.csv",
        createCsv(unique),
      );

      toast.success(
        `Exported ${unique.length} Delivery Notes.`,
        { id: toastId },
      );
    } catch (error) {
      toast.error(getErrors(error), {
        id: toastId,
      });
    } finally {
      exportLockRef.current = false;
    }
  }, [buildParams]);

  /* ---------------------------------------------------------------- */
  /* Print — reuses TemplateManager's generic fetch-then-print button.   */
  /* fetchDeliveryNoteForPrint resolves with the same note shape         */
  /* ShareDeliveryNoteButton / DeliveryNoteTemplate expect.              */
  /* ---------------------------------------------------------------- */

  const fetchDeliveryNoteForPrint = useCallback(async (deliveryNoteNumber) => {
    const response = await api.deliveryNote.getByNumber(deliveryNoteNumber);
    return extractNote(response);
  }, []);

  /* ---------------------------------------------------------------- */
  /* Columns                                                           */
  /* ---------------------------------------------------------------- */

  const columns = useMemo(
    () => [
      {
        key: "deliveryNoteNumber",
        label: "Delivery Note",
        sortable: SERVER_SORTING_ENABLED,

        render: (value, row) => (
          <button
            type="button"
            className="dnl-document-link"
            disabled={
              busy ||
              modalOpen ||
              readingId !== null
            }
            onClick={(event) => {
              event.stopPropagation();
              void openDialog(row, "view");
            }}
          >
            {value || "—"}
          </button>
        ),
      },
      {
        key: "customerName",
        label: "Customer",
        sortable: false,

        render: (value, row) => (
          <div className="dl-customer">
            <strong>{value || "—"}</strong>
            <span>{row.customerCode || "—"}</span>
          </div>
        ),
      },
      {
        key: "deliveryDate",
        label: "Note Date",
        sortable: SERVER_SORTING_ENABLED,
        render: (value) => formatDate(value),
      },
      {
        key: "expectedDeliveryDate",
        label: "Expected Delivery",
        sortable: SERVER_SORTING_ENABLED,
        render: (value) => formatDate(value),
      },
      {
        key: "sourceSalesOrderNumber",
        label: "Sales Order",
        sortable: SERVER_SORTING_ENABLED,

        render: (value) =>
          value || (
            <span className="dl-muted-value">
              Standalone
            </span>
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
        key: "vehicleNumber",
        label: "Vehicle",
        sortable: SERVER_SORTING_ENABLED,
        render: (value) => value || "—",
      },
      /* ---- NEW: Print + Share column ---- */
      {
        key: "documents",
        label: "Print & Share",
        sortable: false,

        render: (_value, row) => (
          <div
            className="dnl-row-actions"
            onClick={(event) => event.stopPropagation()}
          >
            <PrintInvoiceButton
              invoiceNumber={row.deliveryNoteNumber}
              fetchInvoice={fetchDeliveryNoteForPrint}
              kind="delivery"
              label="Print"
              className="dnl-action"
            />

            <ShareDeliveryNoteButton
              row={row}
              disabled={busy || modalOpen || readingId !== null}
            />
          </div>
        ),
      },
      {
        key: "workflow",
        label: "Next Actions",
        sortable: false,

        render: (_value, row) => {
          const available = [
            "dispatch",
            "deliver",
            "cancel",
          ].filter(
            (mode) =>
              row.status === ACTIONS[mode].allowed,
          );

          return (
            <div className="dnl-row-actions">
              {available.map((mode) => {
                const config = ACTIONS[mode];
                const Icon = config.Icon;

                return (
                  <button
                    key={mode}
                    type="button"
                    className={`dnl-action ${
                      mode === "cancel"
                        ? "is-danger"
                        : ""
                    }`}
                    disabled={
                      busy ||
                      modalOpen ||
                      readingId !== null
                    }
                    onClick={(event) => {
                      event.stopPropagation();
                      void openDialog(row, mode);
                    }}
                  >
                    <Icon size={14} />
                    {config.label}
                  </button>
                );
              })}

              {!available.length && (
                <span className="dl-muted-value">
                  No further actions
                </span>
              )}
            </div>
          );
        },
      },

      ...[
        ["transporterName", "Transporter"],
        ["trackingNumber", "Tracking Number"],
        ["receivedByName", "Received By"],
      ].map(([key, label]) => ({
        key,
        label,
        sortable: SERVER_SORTING_ENABLED,
        visible: false,
        render: (value) => value || "—",
      })),

      {
        key: "dispatchedAt",
        label: "Dispatched On",
        sortable: SERVER_SORTING_ENABLED,
        visible: false,
        render: (value) => formatDate(value, true),
      },
      {
        key: "deliveredAt",
        label: "Delivered On",
        sortable: SERVER_SORTING_ENABLED,
        visible: false,
        render: (value) => formatDate(value, true),
      },
      {
        key: "createdAt",
        label: "Created On",
        sortable: SERVER_SORTING_ENABLED,
        visible: false,
        render: (value) => formatDate(value, true),
      },
    ],
    [busy, modalOpen, readingId, openDialog, fetchDeliveryNoteForPrint],
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

      ...STATUSES.map((status) => ({
        key: "status",
        value: status,
        label: STATUS_LABELS[status],
        ...(stats !== null
          ? { count: stats[status] }
          : {}),
      })),
    ],
    [stats],
  );

  const bulkConfig = ACTIONS[bulkState.action];
  const bulkCount = bulkState.rows.length;

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <div className="dnl-list-page">
      {loadError && (
        <div
          className="dnl-error dnl-list-error"
          role="alert"
        >
          Unable to load Delivery Notes: {loadError}
        </div>
      )}

      <DataList
        title="Delivery Notes"
        subtitle="Manage shipments and delivery acknowledgments"
        columns={columns}
        data={notes}
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
        filters={FILTERS}
        quickFilters={quickFilters}
        storageKey="trustiq-delivery-notes"
        searchPlaceholder="Search note, customer, order, vehicle..."
        actions={{
          view: (row) => {
            void openDialog(row, "view");
          },
          delete: (row) =>
            openBulkAction(row, "delete"),
        }}
        bulkActions={[
          {
            key: "dispatch",
            label: "Dispatch Created",
            action: (rows) =>
              openBulkAction(rows, "dispatch"),
          },
          {
            key: "cancel",
            label: "Cancel Created",
            danger: true,
            action: (rows) =>
              openBulkAction(rows, "cancel"),
          },
          {
            key: "delete",
            label: "Delete Created",
            danger: true,
            action: (rows) =>
              openBulkAction(rows, "delete"),
          },
          {
            key: "export",
            label: "Export Selected",
            action: handleExportSelected,
          },
        ]}
        onRefresh={() => {
          if (
            !mutationLockRef.current &&
            !modalOpen
          ) {
            return refreshAll();
          }
        }}
        onExport={handleExport}
        addButton={
          <Button
            type="button"
            icon={Plus}
            disabled={busy || modalOpen}
            onClick={() =>
              navigate(routes.sales.createDelivery)
            }
          >
            New Delivery Note
          </Button>
        }
      />

      {dialog && (
        <DeliveryNoteDialog
          key={dialog.key}
          note={dialog.note}
          mode={dialog.mode}
          loading={dialogLoading}
          error={dialogError}
          onClose={closeDialog}
          onSubmit={submitAction}
        />
      )}

      <ConfirmModal
        open={bulkState.open}
        type="danger"
        title={
          bulkFinished
            ? "Delivery Note action results"
            : `${bulkConfig?.label || "Update"} ${
                bulkCount > 1
                  ? "selected Delivery Notes"
                  : "Delivery Note"
              }?`
        }
        message={
          bulkFinished
            ? "Review the results below. The list and global counts have been refreshed."
            : `${bulkCount} note${
                bulkCount === 1 ? "" : "s"
              }. ${bulkConfig?.description || ""} Each note is processed independently.`
        }
        confirmText={
          bulkFinished
            ? "Close"
            : `${bulkConfig?.label || "Confirm"} ${
                bulkCount
              } Note${
                bulkCount === 1 ? "" : "s"
              }`
        }
        cancelText="Back"
        loading={bulkLoading}
        loadingText={`Processing ${progress.done}/${progress.total}...`}
        onCancel={closeBulk}
        onConfirm={confirmBulk}
      >
        <div className="dnl-bulk-content">
          {!bulkFinished &&
            ["dispatch", "cancel"].includes(
              bulkState.action,
            ) && (
              <label className="dnl-bulk-remarks">
                <span>
                  {bulkState.action === "cancel"
                    ? "Cancellation Reason"
                    : "Dispatch Remarks (optional)"}
                </span>

                <textarea
                  rows={4}
                  maxLength={1000}
                  value={bulkRemarks}
                  disabled={bulkLoading}
                  required={
                    bulkState.action === "cancel"
                  }
                  onChange={(event) =>
                    setBulkRemarks(event.target.value)
                  }
                />

                {bulkCount > 1 && (
                  <small>
                    The same text applies to every
                    selected note.
                  </small>
                )}
              </label>
            )}

          {!bulkFinished && (
            <p className="dnl-bulk-note">
              Each note is reloaded and its selected
              version checked before the action.
              Changed notes are not submitted.
            </p>
          )}

          {bulkLoading && (
            <p role="status">
              Processed {progress.done} of{" "}
              {progress.total}.
            </p>
          )}

          {failures.length > 0 && (
            <div
              className="dnl-bulk-errors"
              role="alert"
            >
              <strong>
                Some actions could not be confirmed
              </strong>

              <ul>
                {failures.map((failure) => (
                  <li key={failure.id}>
                    <span>{failure.number}</span>
                    {": "}
                    {failure.message}

                    {failure.uncertain && (
                      <small>
                        This action may have reached the
                        server. Verify the note and stock
                        outcome before retrying.
                      </small>
                    )}
                  </li>
                ))}
              </ul>

              <p>
                No automatic retry was performed.
                Close this dialog and review the
                refreshed notes before selecting
                another action.
              </p>
            </div>
          )}
        </div>
      </ConfirmModal>
    </div>
  );
}

export default DeliveryNotesList;