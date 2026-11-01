// import { Plus, X, FileText, GitBranch } from "lucide-react";

// import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// import { useNavigate } from "react-router-dom";

// import toast from "react-hot-toast";

// import DataList from "../../components/common/DataList/DataList";
// import StatusField from "../../components/common/StatusField/StatusField";
// import ConfirmModal from "../../components/common/ConfirmModal/ConfirmModal";

// import api from "../../services/api";
// import routes from "../../config/routes";

// import SalesOrderWorkflowModal from "./SalesOrderWorkflowModal";
// import SalesOrderApprovalModal from "./SalesOrderApprovalModal";

// import "./sales-orders-list.css";

// const salesOrderApi = api.salesOrder;

// const STATUSES = [
//   "DRAFT",
//   "CONFIRMED",
//   "IN_PROGRESS",
//   "COMPLETED",
//   "CANCELLED",
// ];

// const STATUS_LABELS = {
//   DRAFT: "Draft",
//   CONFIRMED: "Confirmed",
//   IN_PROGRESS: "In Progress",
//   COMPLETED: "Completed",
//   CANCELLED: "Cancelled",
// };

// const WORKFLOWS = {
//   confirm: {
//     label: "Confirm",
//     allowed: ["DRAFT"],
//   },

//   start: {
//     label: "Start",
//     allowed: ["CONFIRMED"],
//   },

//   complete: {
//     label: "Complete",
//     allowed: ["IN_PROGRESS"],
//   },

//   cancel: {
//     label: "Cancel Order",
//     allowed: ["DRAFT", "CONFIRMED", "IN_PROGRESS"],
//   },
// };

// const FILTERS = [
//   {
//     key: "status",
//     label: "Status",
//     type: "select",
//     options: STATUSES,
//   },

//   {
//     key: "taxMode",
//     label: "Tax Mode",
//     type: "select",
//     options: ["NONE", "INTRA_STATE", "INTER_STATE"],
//   },
// ];

// const QUICK_FILTERS = [
//   {
//     key: "status",
//     value: "",
//     label: "All",
//   },

//   ...STATUSES.map((status) => ({
//     key: "status",
//     value: status,
//     label: STATUS_LABELS[status],
//   })),
// ];

// const moneyFormatter = new Intl.NumberFormat("en-IN", {
//   style: "currency",
//   currency: "INR",
//   minimumFractionDigits: 2,
//   maximumFractionDigits: 2,
// });

// const formatPaise = (value) => {
//   if (value === null || value === undefined || value === "") {
//     return "—";
//   }

//   const amount = Number(value);

//   return Number.isSafeInteger(amount)
//     ? moneyFormatter.format(amount / 100)
//     : "—";
// };

// const formatDate = (value) => {
//   if (!value) return "—";

//   const date = new Date(value);

//   if (Number.isNaN(date.getTime())) {
//     return "—";
//   }

//   return date.toLocaleDateString("en-IN", {
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//     timeZone: "UTC",
//   });
// };

// const getErrorMessage = (error) => {
//   const body = error?.response?.data;

//   if (Array.isArray(body?.errors) && body.errors.length) {
//     return body.errors
//       .map((item) =>
//         typeof item === "string"
//           ? item
//           : item?.message || item?.msg || String(item),
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

// const assertSuccess = (response) => {
//   if (response?.data?.success !== true) {
//     throw new Error(response?.data?.message || "Request failed");
//   }
// };

// const extractOrders = (response) => {
//   assertSuccess(response);

//   if (!Array.isArray(response.data.data)) {
//     throw new Error("Invalid Sales Order list response");
//   }

//   return response.data.data;
// };

// const extractOrder = (response) => {
//   assertSuccess(response);

//   const order = response.data.data;

//   if (!order?._id || !order.orderNumber) {
//     throw new Error("Invalid Sales Order response");
//   }

//   return order;
// };

// const assertVersion = (order) => {
//   if (!Number.isSafeInteger(order.__v) || order.__v < 0) {
//     throw new Error("The order version is missing. Refresh the list.");
//   }
// };

// const assertUnchanged = (latest, original) => {
//   assertVersion(latest);
//   assertVersion(original);

//   if (latest.__v !== original.__v || latest.status !== original.status) {
//     throw new Error(
//       "This order changed. Review the updated row and select the action again.",
//     );
//   }
// };

// const emptyConfirmState = () => ({
//   open: false,
//   action: "",
//   rows: [],
//   title: "",
//   message: "",
//   confirmText: "Confirm",
// });

// /* ==========================================
//    READ-ONLY DETAILS
//    ========================================== */

// function SalesOrderDetailsModal({ order, onClose }) {
//   const dialogRef = useRef(null);
//   const closeRef = useRef(null);

//   useEffect(() => {
//     if (!order) return undefined;

//     const previousFocus = document.activeElement;

//     const previousOverflow = document.body.style.overflow;

//     document.body.style.overflow = "hidden";

//     closeRef.current?.focus();

//     return () => {
//       document.body.style.overflow = previousOverflow;

//       if (previousFocus?.isConnected) {
//         previousFocus.focus?.();
//       }
//     };
//   }, [order?._id]);

//   if (!order) return null;

//   const fields = [
//     ["Customer", order.customerName],
//     ["Customer Code", order.customerCode],
//     ["Order Date", formatDate(order.orderDate)],

//     ["Expected Delivery", formatDate(order.expectedDeliveryDate)],

//     ["GSTIN", order.customerGstNo || "Not provided"],

//     ["Billing Address", order.billingAddress || "Not provided"],

//     ["Shipping Address", order.shippingAddress || "Not provided"],

//     ["Payment Terms", order.paymentTerms || "—"],

//     [
//       "Source Quotation",
//       order.sourceQuotationNumber
//         ? `${order.sourceQuotationNumber} / R${
//             order.sourceQuotationRevision ?? "—"
//           }`
//         : "Direct order",
//     ],
//   ];

//   const handleKeyDown = (event) => {
//     if (event.key === "Escape") {
//       event.preventDefault();
//       onClose();
//     }

//     // The details dialog has only one interactive control.
//     if (event.key === "Tab") {
//       event.preventDefault();
//       closeRef.current?.focus();
//     }
//   };

//   return (
//     <div
//       className="sol-modal-overlay"
//       onClick={(event) => {
//         if (event.target === event.currentTarget) {
//           onClose();
//         }
//       }}
//     >
//       <section
//         ref={dialogRef}
//         className="sol-modal"
//         role="dialog"
//         aria-modal="true"
//         aria-labelledby="sol-details-title"
//         tabIndex={-1}
//         onKeyDown={handleKeyDown}
//       >
//         <header className="sol-modal-header">
//           <div>
//             <h2 id="sol-details-title">
//               <FileText size={18} />
//               {order.orderNumber}
//             </h2>

//             <StatusField value={order.status} />
//           </div>

//           <button
//             ref={closeRef}
//             type="button"
//             className="sol-close-button"
//             aria-label="Close sales order details"
//             onClick={onClose}
//           >
//             <X size={18} />
//           </button>
//         </header>

//         <div className="sol-modal-body">
//           <div className="sol-details-grid">
//             {fields.map(([label, value]) => (
//               <div key={label}>
//                 <span>{label}</span>
//                 <strong>{value || "—"}</strong>
//               </div>
//             ))}
//           </div>

//           <div className="sol-details-table-wrap">
//             <table className="sol-details-table">
//               <thead>
//                 <tr>
//                   <th>#</th>
//                   <th>Product / Service</th>
//                   <th>Quantity</th>
//                   <th>Rate</th>
//                   <th>Discount</th>
//                   <th>GST</th>
//                   <th>Total</th>
//                 </tr>
//               </thead>

//               <tbody>
//                 {(order.items || []).map((item, index) => (
//                   <tr key={item.lineId || `${item.productId}-${index}`}>
//                     <td>{index + 1}</td>

//                     <td>
//                       <strong>{item.productName}</strong>

//                       <small>{item.productCode}</small>
//                     </td>

//                     <td>
//                       {item.quantity} {item.unit}
//                     </td>

//                     <td>{formatPaise(item.unitRatePaise)}</td>

//                     <td>{item.discountPercent}%</td>

//                     <td>{item.gstRate}%</td>

//                     <td>{formatPaise(item.totalAmountPaise)}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>

//           <div className="sol-summary">
//             {[
//               ["Gross Amount", order.grossAmountPaise],
//               ["Discount", order.discountAmountPaise],
//               ["Taxable Amount", order.taxableAmountPaise],
//               ["CGST", order.cgstAmountPaise],
//               ["SGST", order.sgstAmountPaise],
//               ["IGST", order.igstAmountPaise],
//               ["Total", order.totalAmountPaise],
//             ].map(([label, amount]) => (
//               <div
//                 key={label}
//                 className={label === "Total" ? "sol-summary-total" : ""}
//               >
//                 <span>{label}</span>
//                 <strong>{formatPaise(amount)}</strong>
//               </div>
//             ))}
//           </div>

//           {[
//             ["Delivery Terms", order.deliveryTerms],
//             ["Notes", order.notes],
//             ["Terms & Conditions", order.termsAndConditions],
//             ["Approval Remarks", order.approvalRemarks],
//             ["Start Remarks", order.startRemarks],
//             ["Completion Remarks", order.completionRemarks],
//             ["Cancellation Reason", order.cancellationReason],
//           ]
//             .filter(([, value]) => Boolean(value))
//             .map(([label, value]) => (
//               <div className="sol-text-section" key={label}>
//                 <h3>{label}</h3>
//                 <p>{value}</p>
//               </div>
//             ))}
//         </div>
//       </section>
//     </div>
//   );
// }

// /* ==========================================
//    SALES ORDER LIST
//    ========================================== */

// function SalesOrdersList() {
//   const navigate = useNavigate();

//   const [orders, setOrders] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [loadError, setLoadError] = useState("");

//   const [selectedOrder, setSelectedOrder] = useState(null);

//   const [timelineOrder, setTimelineOrder] = useState(null);

//   /*
//    * One detailed modal handles:
//    * confirm, start, and complete.
//    */
//   const [actionDialog, setActionDialog] = useState(null);

//   const [actionLoading, setActionLoading] = useState(false);

//   const [actionError, setActionError] = useState("");

//   const [confirmState, setConfirmState] = useState(emptyConfirmState);

//   const [confirmLoading, setConfirmLoading] = useState(false);

//   const [readingId, setReadingId] = useState(null);

//   const mountedRef = useRef(false);
//   const loadRequestRef = useRef(0);
//   const readRequestRef = useRef(0);
//   const actionLockRef = useRef(false);

//   const busy = actionLoading || confirmLoading;

//   const dialogOpen = Boolean(
//     selectedOrder || timelineOrder || actionDialog || confirmState.open,
//   );

//   useEffect(() => {
//     mountedRef.current = true;

//     return () => {
//       mountedRef.current = false;
//       loadRequestRef.current += 1;
//       readRequestRef.current += 1;
//     };
//   }, []);

//   const replaceOrder = useCallback((updatedOrder) => {
//     setOrders((previous) =>
//       previous.map((order) =>
//         order._id === updatedOrder._id ? updatedOrder : order,
//       ),
//     );

//     setSelectedOrder((current) =>
//       current?._id === updatedOrder._id ? updatedOrder : current,
//     );

//     setTimelineOrder((current) =>
//       current?._id === updatedOrder._id ? updatedOrder : current,
//     );
//   }, []);

//   const loadOrders = useCallback(async () => {
//     const requestId = ++loadRequestRef.current;

//     setLoading(true);
//     setLoadError("");

//     try {
//       const firstResponse = await salesOrderApi.getOrders({
//         page: 1,
//         limit: 100,
//       });

//       const records = [...extractOrders(firstResponse)];

//       const totalPages = Math.max(
//         1,
//         Number(firstResponse.data.pagination?.totalPages) || 1,
//       );

//       for (let page = 2; page <= totalPages; page += 1) {
//         if (!mountedRef.current || requestId !== loadRequestRef.current) {
//           return;
//         }

//         const response = await salesOrderApi.getOrders({
//           page,
//           limit: 100,
//         });

//         records.push(...extractOrders(response));
//       }

//       if (!mountedRef.current || requestId !== loadRequestRef.current) {
//         return;
//       }

//       setOrders(
//         Array.from(
//           new Map(records.map((order) => [order._id, order])).values(),
//         ),
//       );
//     } catch (error) {
//       if (mountedRef.current && requestId === loadRequestRef.current) {
//         const message = getErrorMessage(error);

//         setLoadError(message);
//         toast.error(message);
//       }
//     } finally {
//       if (mountedRef.current && requestId === loadRequestRef.current) {
//         setLoading(false);
//       }
//     }
//   }, []);

//   useEffect(() => {
//     void loadOrders();
//   }, [loadOrders]);

//   /*
//    * Fetch fresh details before opening any order modal.
//    * One request token prevents older clicks from
//    * opening another dialog after a newer click.
//    */
//   const openOrderDialog = useCallback(
//     async (row, mode, action = "") => {
//       if (actionLockRef.current || dialogOpen) {
//         return;
//       }

//       const config = action ? WORKFLOWS[action] : null;

//       if (action && (!config || !config.allowed.includes(row.status))) {
//         toast.error("This action is not available for the current status.");
//         return;
//       }

//       const requestId = ++readRequestRef.current;

//       setReadingId(row._id);

//       try {
//         const response = await salesOrderApi.getOrder(row.orderNumber);

//         const latest = extractOrder(response);

//         if (!mountedRef.current || requestId !== readRequestRef.current) {
//           return;
//         }

//         // Invalidate an older list fetch.
//         loadRequestRef.current += 1;
//         setLoading(false);

//         replaceOrder(latest);

//         if (config && !config.allowed.includes(latest.status)) {
//           toast.error("The order status changed. Review the updated row.");
//           return;
//         }

//         if (mode === "details") {
//           setSelectedOrder(latest);
//           return;
//         }

//         if (mode === "timeline") {
//           setTimelineOrder(latest);
//           return;
//         }

//         assertVersion(latest);

//         if (action === "cancel") {
//           setConfirmState({
//             open: true,
//             action: "cancel",
//             rows: [latest],
//             title: "Cancel sales order?",
//             message:
//               `${latest.orderNumber} — ${latest.customerName}. ` +
//               "This marks the order as cancelled. It does not reverse invoices or stock movements.",
//             confirmText: "Cancel Order",
//           });

//           return;
//         }

//         setActionError("");

//         setActionDialog({
//           order: latest,
//           action,
//         });
//       } catch (error) {
//         if (mountedRef.current && requestId === readRequestRef.current) {
//           toast.error(getErrorMessage(error));
//         }
//       } finally {
//         if (mountedRef.current && requestId === readRequestRef.current) {
//           setReadingId(null);
//         }
//       }
//     },
//     [dialogOpen, replaceOrder],
//   );

//   const handleView = useCallback(
//     (row) => {
//       void openOrderDialog(row, "details");
//     },
//     [openOrderDialog],
//   );

//   const handleShowWorkflow = useCallback(
//     (row) => {
//       void openOrderDialog(row, "timeline");
//     },
//     [openOrderDialog],
//   );

//   const openWorkflow = useCallback(
//     (row, action) => {
//       void openOrderDialog(row, "action", action);
//     },
//     [openOrderDialog],
//   );
//   const handleCreateInvoice = useCallback(
//     (row) => {
//       if (actionLockRef.current || dialogOpen || readingId !== null) {
//         return;
//       }

//       if (!["CONFIRMED", "IN_PROGRESS", "COMPLETED"].includes(row.status)) {
//         toast.error("Confirm the Sales Order before creating an invoice.");
//         return;
//       }

//       if (!row.orderNumber) {
//         toast.error("Sales Order number is missing.");
//         return;
//       }

//       if (!routes.sales.createInvoice) {
//         toast.error("The Sales Invoice creation route is not configured.");
//         return;
//       }

//       navigate(
//         `${routes.sales.createInvoice}?` +
//           new URLSearchParams({
//             orderNumber: row.orderNumber,
//           }).toString(),
//       );
//     },
//     [navigate, dialogOpen, readingId],
//   );

//   const closeDetails = useCallback(() => {
//     setSelectedOrder(null);
//   }, []);

//   const closeTimeline = useCallback(() => {
//     setTimelineOrder(null);
//   }, []);

//   const closeActionDialog = () => {
//     if (actionLockRef.current) return;

//     setActionDialog(null);
//     setActionError("");
//   };

//   const handleWorkflowSubmit = async (value) => {
//     if (actionLockRef.current || !actionDialog) {
//       return;
//     }

//     const remarks = String(value ?? "").trim();

//     if (!remarks || remarks.length > 1000) {
//       setActionError("Enter remarks between 1 and 1,000 characters.");
//       return;
//     }

//     const { order: submittedOrder, action } = actionDialog;

//     const config = WORKFLOWS[action];

//     if (!config || action === "cancel") {
//       setActionError("Unsupported workflow action.");
//       return;
//     }

//     actionLockRef.current = true;

//     loadRequestRef.current += 1;
//     readRequestRef.current += 1;

//     setLoading(false);
//     setActionLoading(true);
//     setActionError("");

//     try {
//       const latestResponse = await salesOrderApi.getOrder(
//         submittedOrder.orderNumber,
//       );

//       const latest = extractOrder(latestResponse);

//       if (!mountedRef.current) return;

//       replaceOrder(latest);

//       assertUnchanged(latest, submittedOrder);

//       if (!config.allowed.includes(latest.status)) {
//         throw new Error("This action is no longer available.");
//       }

//       let response;

//       switch (action) {
//         case "confirm":
//           response = await salesOrderApi.confirmOrder(
//             latest.orderNumber,
//             latest.__v,
//             remarks,
//           );
//           break;

//         case "start":
//           response = await salesOrderApi.startOrder(
//             latest.orderNumber,
//             latest.__v,
//             remarks,
//           );
//           break;

//         case "complete":
//           response = await salesOrderApi.completeOrder(
//             latest.orderNumber,
//             latest.__v,
//             remarks,
//           );
//           break;

//         default:
//           throw new Error("Unsupported workflow action.");
//       }

//       const updated = extractOrder(response);

//       if (!mountedRef.current) return;

//       replaceOrder(updated);

//       /*
//        * Close after this action.
//        * Do not automatically open the next action.
//        */
//       setActionDialog(null);
//       setActionError("");

//       toast.success(
//         response.data.message || `${updated.orderNumber} updated successfully`,
//       );
//     } catch (error) {
//       if (!mountedRef.current) return;

//       const originalMessage = getErrorMessage(error);

//       setActionError(originalMessage);

//       try {
//         const response = await salesOrderApi.getOrder(
//           submittedOrder.orderNumber,
//         );

//         const latest = extractOrder(response);

//         if (!mountedRef.current) return;

//         replaceOrder(latest);

//         if (!config.allowed.includes(latest.status)) {
//           setActionDialog(null);
//           setActionError("");

//           toast(
//             `${latest.orderNumber} is now ${
//               STATUS_LABELS[latest.status] || latest.status
//             }.`,
//           );
//         } else {
//           setActionDialog((current) =>
//             current
//               ? {
//                   ...current,
//                   order: latest,
//                 }
//               : null,
//           );

//           if (latest.__v !== submittedOrder.__v) {
//             setActionError(
//               "This order changed. Review the updated details before submitting again.",
//             );
//           }
//         }
//       } catch {
//         if (mountedRef.current) {
//           setActionError(originalMessage);
//         }
//       }
//     } finally {
//       actionLockRef.current = false;

//       if (mountedRef.current) {
//         setActionLoading(false);
//       }
//     }
//   };

//   const closeConfirmModal = () => {
//     if (actionLockRef.current) return;

//     setConfirmState(emptyConfirmState());
//   };

//   const handleDelete = useCallback(
//     (row) => {
//       if (actionLockRef.current || dialogOpen) {
//         return;
//       }

//       if (row.status !== "DRAFT") {
//         toast.error("Only draft sales orders can be deleted.");
//         return;
//       }

//       try {
//         assertVersion(row);
//       } catch (error) {
//         toast.error(getErrorMessage(error));
//         return;
//       }

//       setConfirmState({
//         open: true,
//         action: "delete",
//         rows: [row],
//         title: "Delete sales order draft?",
//         message:
//           `Delete ${row.orderNumber} for ${row.customerName}? ` +
//           "The draft will be soft-deleted.",
//         confirmText: "Delete Draft",
//       });
//     },
//     [dialogOpen],
//   );

//   const handleBulkDelete = (rows) => {
//     if (actionLockRef.current || dialogOpen || !rows?.length) {
//       return;
//     }

//     if (rows.some((row) => row.status !== "DRAFT")) {
//       toast.error("Select only draft orders for bulk deletion.");
//       return;
//     }

//     try {
//       rows.forEach(assertVersion);
//     } catch (error) {
//       toast.error(getErrorMessage(error));
//       return;
//     }

//     setConfirmState({
//       open: true,
//       action: "delete",
//       rows: [...rows],
//       title: "Delete selected drafts?",
//       message:
//         `Soft-delete ${rows.length} selected draft` +
//         `${rows.length === 1 ? "" : "s"}? ` +
//         "Each deletion is processed independently.",
//       confirmText:
//         `Delete ${rows.length} Draft` + `${rows.length === 1 ? "" : "s"}`,
//     });
//   };

//   const handleConfirmAction = async () => {
//     if (actionLockRef.current || !confirmState.rows.length) {
//       return;
//     }

//     const { action, rows } = confirmState;

//     actionLockRef.current = true;

//     loadRequestRef.current += 1;
//     readRequestRef.current += 1;

//     setLoading(false);
//     setConfirmLoading(true);

//     try {
//       if (action === "cancel") {
//         const original = rows[0];

//         const latestResponse = await salesOrderApi.getOrder(
//           original.orderNumber,
//         );

//         const latest = extractOrder(latestResponse);

//         if (!mountedRef.current) return;

//         replaceOrder(latest);
//         assertUnchanged(latest, original);

//         if (!WORKFLOWS.cancel.allowed.includes(latest.status)) {
//           throw new Error("This order can no longer be cancelled.");
//         }

//         const response = await salesOrderApi.cancelOrder(latest.orderNumber, {
//           version: latest.__v,
//           cancellationReason: null,
//         });

//         const updated = extractOrder(response);

//         if (!mountedRef.current) return;

//         replaceOrder(updated);

//         toast.success(
//           response.data.message || `${updated.orderNumber} cancelled`,
//         );
//       } else if (action === "delete") {
//         const deletedIds = new Set();
//         const failures = [];

//         for (const original of rows) {
//           if (!mountedRef.current) break;

//           try {
//             const latestResponse = await salesOrderApi.getOrder(
//               original.orderNumber,
//             );

//             const latest = extractOrder(latestResponse);

//             assertUnchanged(latest, original);

//             if (latest.status !== "DRAFT") {
//               throw new Error("Only draft orders can be deleted.");
//             }

//             const response = await salesOrderApi.deleteOrder(
//               latest.orderNumber,
//             );

//             assertSuccess(response);

//             deletedIds.add(original._id);
//           } catch (error) {
//             failures.push(`${original.orderNumber}: ${getErrorMessage(error)}`);
//           }
//         }

//         if (!mountedRef.current) return;

//         setOrders((previous) =>
//           previous.filter((order) => !deletedIds.has(order._id)),
//         );

//         if (deletedIds.size) {
//           toast.success(
//             `${deletedIds.size} draft${
//               deletedIds.size === 1 ? "" : "s"
//             } deleted`,
//           );
//         }

//         if (failures.length) {
//           toast.error(
//             `${failures.length} deletion${
//               failures.length === 1 ? "" : "s"
//             } failed. ${failures[0]}`,
//           );
//         }
//       }
//     } catch (error) {
//       if (mountedRef.current) {
//         toast.error(getErrorMessage(error));
//       }
//     } finally {
//       if (mountedRef.current) {
//         setConfirmState(emptyConfirmState());

//         await loadOrders();
//       }

//       actionLockRef.current = false;

//       if (mountedRef.current) {
//         setConfirmLoading(false);
//       }
//     }
//   };

//   const columns = useMemo(
//     () => [
//       {
//         key: "orderNumber",
//         label: "Order No.",
//         sortable: true,
//       },

//       {
//         key: "customerName",
//         label: "Customer",
//         sortable: true,

//         render: (value, row) => (
//           <div className="dl-customer">
//             <strong>{value}</strong>
//             <span>{row.customerCode}</span>
//           </div>
//         ),
//       },

//       {
//         key: "workflowTimeline",
//         label: "Timeline",
//         sortable: false,

//         render: (_value, row) => (
//           <button
//             type="button"
//             className="sow-open-button"
//             disabled={busy || dialogOpen || readingId !== null}
//             onClick={(event) => {
//               event.stopPropagation();
//               handleShowWorkflow(row);
//             }}
//           >
//             <GitBranch size={14} />

//             <span>{readingId === row._id ? "Loading..." : "Workflow"}</span>
//           </button>
//         ),
//       },

//       {
//         key: "orderDate",
//         label: "Order Date",
//         sortable: true,
//         render: formatDate,
//       },

//       {
//         key: "expectedDeliveryDate",
//         label: "Expected Delivery",
//         sortable: true,
//         render: formatDate,
//       },

//       {
//         key: "totalAmountPaise",
//         label: "Total Amount",
//         type: "number",
//         sortable: true,
//         render: formatPaise,
//       },

//       {
//         key: "status",
//         label: "Status",
//         sortable: true,

//         render: (value) => <StatusField value={value} />,
//       },

//       {
//         key: "sourceQuotationNumber",
//         label: "Quotation",
//         sortable: true,
//         render: (value) =>
//           value || <span className="dl-muted-value">Direct Order</span>,
//       },
//       {
//         key: "invoiceAction",
//         label: "Invoice",
//         sortable: false,

//         render: (_value, row) => {
//           // Invoice already exists
//           if (row.invoiceNumber) {
//             return <span className="dl-muted-value">{row.invoiceNumber}</span>;
//           }

//           const canCreateInvoice = [
//             "CONFIRMED",
//             "IN_PROGRESS",
//             "COMPLETED",
//           ].includes(row.status);

//           if (!canCreateInvoice) {
//             return (
//               <span className="dl-muted-value">
//                 {row.status === "DRAFT" ? "Confirm first" : "Not available"}
//               </span>
//             );
//           }

//           return (
//             <button
//               type="button"
//               className="sol-action-button"
//               disabled={busy || dialogOpen || readingId !== null}
//               onClick={(event) => {
//                 event.stopPropagation();
//                 handleCreateInvoice(row);
//               }}
//             >
//               <FileText size={14} /> Create Invoice
//             </button>
//           );
//         },
//       },
//       {
//         key: "workflow",
//         label: "Workflow",
//         sortable: false,

//         render: (_value, row) => (
//           <div className="sol-workflow-actions">
//             {Object.entries(WORKFLOWS)
//               .filter(([, config]) => config.allowed.includes(row.status))
//               .map(([action, config]) => (
//                 <button
//                   key={action}
//                   type="button"
//                   className={
//                     action === "cancel"
//                       ? "sol-action-button sol-action-danger"
//                       : "sol-action-button"
//                   }
//                   disabled={busy || dialogOpen || readingId !== null}
//                   onClick={(event) => {
//                     event.stopPropagation();

//                     openWorkflow(row, action);
//                   }}
//                 >
//                   {config.label}
//                 </button>
//               ))}

//             {["COMPLETED", "CANCELLED"].includes(row.status) && (
//               <span className="dl-muted-value">No further actions</span>
//             )}
//           </div>
//         ),
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
//     ],
//     [
//       busy,
//       dialogOpen,
//       readingId,
//       handleShowWorkflow,
//       handleCreateInvoice,
//       openWorkflow,
//     ],
//   );

//   return (
//     <>
//       {loadError && (
//         <div role="alert">Unable to load Sales Orders: {loadError}</div>
//       )}

//       <DataList
//         title="Sales Orders"
//         subtitle="Manage customer orders and order progress"
//         columns={columns}
//         data={orders}
//         loading={loading}
//         rowKey="_id"
//         showCase="list"
//         searchable
//         filterable
//         sortable
//         selectable
//         columnVisibility
//         pagination
//         filters={FILTERS}
//         quickFilters={QUICK_FILTERS}
//         storageKey="trustiq-sales-orders"
//         searchPlaceholder="Search order number, customer, quotation..."
//         actions={{
//           view: handleView,
//           delete: handleDelete,
//         }}
//         bulkActions={[
//           {
//             key: "delete",
//             label: "Delete Drafts",
//             danger: true,
//             action: handleBulkDelete,
//           },
//         ]}
//         onRefresh={() => {
//           if (!actionLockRef.current && !dialogOpen) {
//             void loadOrders();
//           }
//         }}
//         addButton={
//           <button
//             type="button"
//             className="sol-primary-button"
//             disabled={busy || dialogOpen}
//             onClick={() => navigate(routes.sales.createOrder)}
//           >
//             <Plus size={16} />
//             <span>New Sales Order</span>
//           </button>
//         }
//       />

//       <SalesOrderDetailsModal order={selectedOrder} onClose={closeDetails} />

//       <SalesOrderWorkflowModal order={timelineOrder} onClose={closeTimeline} />

//       <SalesOrderApprovalModal
//         key={
//           actionDialog
//             ? `${actionDialog.order._id}-${actionDialog.action}`
//             : "closed"
//         }
//         order={actionDialog?.order || null}
//         action={actionDialog?.action || "confirm"}
//         loading={actionLoading}
//         error={actionError}
//         onClose={closeActionDialog}
//         onApprove={handleWorkflowSubmit}
//       />

//       <ConfirmModal
//         open={confirmState.open}
//         type="danger"
//         title={confirmState.title}
//         message={confirmState.message}
//         confirmText={confirmState.confirmText}
//         cancelText="Back"
//         loading={confirmLoading}
//         onCancel={closeConfirmModal}
//         onConfirm={handleConfirmAction}
//       />
//     </>
//   );
// }

// export default SalesOrdersList;


import {
  Plus,
  X,
  FileText,
  GitBranch,
} from "lucide-react";

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
import routes from "../../config/routes";

import SalesOrderWorkflowModal from "./SalesOrderWorkflowModal";
import SalesOrderApprovalModal from "./SalesOrderApprovalModal";

import "./sales-orders-list.css";

const salesOrderApi = api.salesOrder;

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

const SERVER_SORTING_ENABLED = false;

const PAGE_SIZE_OPTIONS = [20, 50, 100];
const SEARCH_DELAY = 400;
const EXPORT_BATCH_SIZE = 100;

const STATUSES = [
  "DRAFT",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

const STATUS_LABELS = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const SORT_FIELDS = new Set([
  "orderNumber",
  "orderDate",
  "expectedDeliveryDate",
  "totalAmountPaise",
  "status",
  "sourceQuotationNumber",
  "taxableAmountPaise",
  "paymentTerms",
  "taxMode",
  "createdAt",
]);

const WORKFLOWS = {
  confirm: {
    label: "Confirm",
    allowed: ["DRAFT"],
    past: "confirmed",
    requiresRemarks: true,
  },

  start: {
    label: "Start",
    allowed: ["CONFIRMED"],
    past: "started",
    requiresRemarks: true,
  },

  complete: {
    label: "Complete",
    allowed: ["IN_PROGRESS"],
    past: "completed",
    requiresRemarks: true,
  },

  cancel: {
    label: "Cancel Order",
    allowed: [
      "DRAFT",
      "CONFIRMED",
      "IN_PROGRESS",
    ],
    past: "cancelled",
    requiresRemarks: false,
  },
};

const FILTERS = [
  {
    key: "status",
    label: "Status",
    type: "select",
    options: STATUSES,
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
];

const EMPTY_CONFIRM = {
  open: false,
  action: "",
  rows: [],
};

const actionConfig = (action) =>
  action === "delete"
    ? {
        label: "Delete Drafts",
        allowed: ["DRAFT"],
        past: "deleted",
        requiresRemarks: false,
      }
    : WORKFLOWS[action];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const moneyFormatter = new Intl.NumberFormat(
  "en-IN",
  {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  },
);

const formatPaise = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  const amount = Number(value);

  return Number.isSafeInteger(amount)
    ? moneyFormatter.format(amount / 100)
    : "—";
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
        timeZone: "UTC",
      });
};

const csvDate = (value) => {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : date.toISOString().slice(0, 10);
};

const csvCell = (value) => {
  let text = String(value ?? "");

  if (/^\s*[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
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
            String(item),
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

const extractOrder = (response) => {
  assertSuccess(response);

  const order = response.data.data;

  if (!order?._id || !order.orderNumber) {
    throw new Error(
      "Invalid Sales Order response.",
    );
  }

  return order;
};

const readOrderPage = (response) => {
  assertSuccess(response);

  if (!Array.isArray(response.data.data)) {
    throw new Error(
      "Invalid Sales Order list response.",
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
      "Sales Order list must return pagination.total.",
    );
  }

  return {
    data: response.data.data,
    total: Number(rawTotal),
    pagination,
  };
};

const assertVersion = (order) => {
  if (
    !Number.isSafeInteger(order.__v) ||
    order.__v < 0
  ) {
    throw new Error(
      "The order version is missing. Refresh the list.",
    );
  }
};

const assertUnchanged = (latest, original) => {
  assertVersion(latest);
  assertVersion(original);

  if (
    String(latest._id) !== String(original._id) ||
    latest.orderNumber !== original.orderNumber ||
    latest.__v !== original.__v ||
    latest.status !== original.status
  ) {
    throw new Error(
      "This order changed. Review the updated row and select the action again.",
    );
  }
};

const uniqueOrders = (records) =>
  Array.from(
    new Map(
      records.map((record) => [
        String(record._id),
        record,
      ]),
    ).values(),
  );

const EXPORT_FIELDS = [
  ["Order Number", (row) => row.orderNumber],
  ["Customer", (row) => row.customerName],
  ["Customer Code", (row) => row.customerCode],
  ["Order Date", (row) => csvDate(row.orderDate)],
  [
    "Expected Delivery",
    (row) => csvDate(row.expectedDeliveryDate),
  ],
  ["Status", (row) => row.status],
  ["Source Quotation", (row) => row.sourceQuotationNumber],
  ["Source Revision", (row) => row.sourceQuotationRevision],
  ["Invoice Number", (row) => row.invoiceNumber],
  ["Tax Mode", (row) => row.taxMode],
  ["Gross (Paise)", (row) => row.grossAmountPaise],
  ["Discount (Paise)", (row) => row.discountAmountPaise],
  ["Taxable (Paise)", (row) => row.taxableAmountPaise],
  ["CGST (Paise)", (row) => row.cgstAmountPaise],
  ["SGST (Paise)", (row) => row.sgstAmountPaise],
  ["IGST (Paise)", (row) => row.igstAmountPaise],
  ["Total (Paise)", (row) => row.totalAmountPaise],
  ["Payment Terms", (row) => row.paymentTerms],
  ["Delivery Terms", (row) => row.deliveryTerms],
  ["Approval Remarks", (row) => row.approvalRemarks],
  ["Start Remarks", (row) => row.startRemarks],
  ["Completion Remarks", (row) => row.completionRemarks],
  ["Cancellation Reason", (row) => row.cancellationReason],
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
/* Read-only details modal                                             */
/* ------------------------------------------------------------------ */

function SalesOrderDetailsModal({
  order,
  onClose,
}) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!order) return undefined;

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
  }, [order?._id]);

  if (!order) return null;

  const fields = [
    ["Customer", order.customerName],
    ["Customer Code", order.customerCode],
    ["Order Date", formatDate(order.orderDate)],
    [
      "Expected Delivery",
      formatDate(order.expectedDeliveryDate),
    ],
    ["GSTIN", order.customerGstNo || "Not provided"],
    [
      "Billing Address",
      order.billingAddress || "Not provided",
    ],
    [
      "Shipping Address",
      order.shippingAddress || "Not provided",
    ],
    ["Payment Terms", order.paymentTerms || "—"],
    [
      "Source Quotation",
      order.sourceQuotationNumber
        ? `${order.sourceQuotationNumber} / R${
            order.sourceQuotationRevision ?? "—"
          }`
        : "Direct order",
    ],
  ];

  return (
    <div
      className="sol-modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="sol-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sol-details-title"
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          }

          // This dialog has one interactive control.
          if (event.key === "Tab") {
            event.preventDefault();
            closeRef.current?.focus();
          }
        }}
      >
        <header className="sol-modal-header">
          <div>
            <h2 id="sol-details-title">
              <FileText size={18} />
              {order.orderNumber}
            </h2>

            <StatusField value={order.status} />
          </div>

          <button
            ref={closeRef}
            type="button"
            className="sol-close-button"
            aria-label="Close sales order details"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>

        <div className="sol-modal-body">
          <div className="sol-details-grid">
            {fields.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value || "—"}</strong>
              </div>
            ))}
          </div>

          <div className="sol-details-table-wrap">
            <table className="sol-details-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product / Service</th>
                  <th>Quantity</th>
                  <th>Rate</th>
                  <th>Discount</th>
                  <th>GST</th>
                  <th>Total</th>
                </tr>
              </thead>

              <tbody>
                {(order.items || []).map(
                  (item, index) => (
                    <tr
                      key={
                        item.lineId ||
                        `${item.productId}-${index}`
                      }
                    >
                      <td>{index + 1}</td>

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
                        {formatPaise(
                          item.unitRatePaise,
                        )}
                      </td>

                      <td>
                        {item.discountPercent}%
                      </td>

                      <td>{item.gstRate}%</td>

                      <td>
                        {formatPaise(
                          item.totalAmountPaise,
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>

          <div className="sol-summary">
            {[
              ["Gross Amount", order.grossAmountPaise],
              ["Discount", order.discountAmountPaise],
              ["Taxable Amount", order.taxableAmountPaise],
              ["CGST", order.cgstAmountPaise],
              ["SGST", order.sgstAmountPaise],
              ["IGST", order.igstAmountPaise],
              ["Total", order.totalAmountPaise],
            ].map(([label, amount]) => (
              <div
                key={label}
                className={
                  label === "Total"
                    ? "sol-summary-total"
                    : ""
                }
              >
                <span>{label}</span>
                <strong>
                  {formatPaise(amount)}
                </strong>
              </div>
            ))}
          </div>

          {[
            ["Delivery Terms", order.deliveryTerms],
            ["Notes", order.notes],
            ["Terms & Conditions", order.termsAndConditions],
            ["Approval Remarks", order.approvalRemarks],
            ["Start Remarks", order.startRemarks],
            ["Completion Remarks", order.completionRemarks],
            ["Cancellation Reason", order.cancellationReason],
          ]
            .filter(([, value]) => Boolean(value))
            .map(([label, value]) => (
              <div
                className="sol-text-section"
                key={label}
              >
                <h3>{label}</h3>
                <p>{value}</p>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main list                                                           */
/* ------------------------------------------------------------------ */

function SalesOrdersList() {
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [total, setTotal] = useState(0);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});

  const [sort, setSort] = useState({
    key: "orderDate",
    direction: "desc",
  });

  const [stats, setStats] = useState(null);

  const [selectedOrder, setSelectedOrder] =
    useState(null);

  const [timelineOrder, setTimelineOrder] =
    useState(null);

  const [actionDialog, setActionDialog] =
    useState(null);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [actionError, setActionError] =
    useState("");

  const [confirmState, setConfirmState] =
    useState(EMPTY_CONFIRM);

  const [confirmLoading, setConfirmLoading] =
    useState(false);

  const [bulkRemarks, setBulkRemarks] =
    useState("");

  const [actionFinished, setActionFinished] =
    useState(false);

  const [failures, setFailures] = useState([]);

  const [progress, setProgress] = useState({
    done: 0,
    total: 0,
  });

  const [readingId, setReadingId] = useState(null);

  const mountedRef = useRef(false);
  const loadRequestRef = useRef(0);
  const statsRequestRef = useRef(0);
  const readRequestRef = useRef(0);
  const actionLockRef = useRef(false);
  const exportLockRef = useRef(false);
  const refreshRef = useRef(null);

  const busy = actionLoading || confirmLoading;

  const dialogOpen = Boolean(
    selectedOrder ||
      timelineOrder ||
      actionDialog ||
      confirmState.open,
  );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      loadRequestRef.current += 1;
      statsRequestRef.current += 1;
      readRequestRef.current += 1;
    };
  }, []);

  /* ---------------------------------------------------------------- */
  /* Search/query                                                      */
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

      ...(filters.taxMode
        ? { taxMode: filters.taxMode }
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
  /* One-page loading                                                  */
  /* ---------------------------------------------------------------- */

  const loadOrders = useCallback(async () => {
    if (!mountedRef.current) return;

    const requestId = ++loadRequestRef.current;

    const current = () =>
      mountedRef.current &&
      requestId === loadRequestRef.current;

    setLoading(true);
    setLoadError("");

    try {
      const response =
        await salesOrderApi.getOrders(
          buildParams({
            page,
            limit: pageSize,
          }),
        );

      if (!current()) return;

      const result = readOrderPage(response);

      const lastPage = Math.max(
        1,
        Math.ceil(result.total / pageSize),
      );

      if (page > lastPage) {
        setPage(lastPage);
        return;
      }

      setOrders(result.data);
      setTotal(result.total);
    } catch (error) {
      if (!current()) return;

      const message = getErrorMessage(error);

      setOrders([]);
      setTotal(0);
      setLoadError(message);
      toast.error(message);
    } finally {
      if (current()) setLoading(false);
    }
  }, [buildParams, page, pageSize]);

  useEffect(() => {
    loadOrders();

    return () => {
      loadRequestRef.current += 1;
    };
  }, [loadOrders]);

  /* ---------------------------------------------------------------- */
  /* Global status counts — no separate loading UI                      */
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
          await salesOrderApi.getOrders({
            page: 1,
            limit: 20,
            ...(status === "all"
              ? {}
              : { status }),
          });

        nextStats[status] =
          readOrderPage(response).total;
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
          "Unable to load Sales Order counts:",
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
      loadOrders(),
      loadStats(),
    ]);
  }, [loadOrders, loadStats]);

  useEffect(() => {
    refreshRef.current = refreshAll;
  }, [refreshAll]);

  const replaceOrder = useCallback((updated) => {
    setOrders((previous) =>
      previous.map((order) =>
        String(order._id) === String(updated._id)
          ? updated
          : order,
      ),
    );

    setSelectedOrder((current) =>
      current &&
      String(current._id) === String(updated._id)
        ? updated
        : current,
    );

    setTimelineOrder((current) =>
      current &&
      String(current._id) === String(updated._id)
        ? updated
        : current,
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
      taxMode: next?.taxMode || "",
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
            key: "orderDate",
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
  /* API workflow adapter — preserves your existing signatures          */
  /* ---------------------------------------------------------------- */

  const executeAction = async (
    action,
    latest,
    remarks = "",
  ) => {
    switch (action) {
      case "confirm":
        return salesOrderApi.confirmOrder(
          latest.orderNumber,
          latest.__v,
          remarks,
        );

      case "start":
        return salesOrderApi.startOrder(
          latest.orderNumber,
          latest.__v,
          remarks,
        );

      case "complete":
        return salesOrderApi.completeOrder(
          latest.orderNumber,
          latest.__v,
          remarks,
        );

      case "cancel":
        return salesOrderApi.cancelOrder(
          latest.orderNumber,
          {
            version: latest.__v,
            cancellationReason: remarks || null,
          },
        );

      case "delete":
        return salesOrderApi.deleteOrder(
          latest.orderNumber,
        );

      default:
        throw new Error(
          "Unsupported Sales Order action.",
        );
    }
  };

  /* ---------------------------------------------------------------- */
  /* Read before opening an order modal                                */
  /* ---------------------------------------------------------------- */

  const openOrderDialog = useCallback(
    async (row, mode, action = "") => {
      if (
        actionLockRef.current ||
        dialogOpen ||
        readingId !== null
      ) {
        return;
      }

      if (!row?.orderNumber) {
        toast.error("Sales Order number is missing.");
        return;
      }

      const config = action
        ? WORKFLOWS[action]
        : null;

      if (
        action &&
        (
          !config ||
          !config.allowed.includes(row.status)
        )
      ) {
        toast.error(
          "This action is not available for the current status.",
        );
        return;
      }

      const requestId = ++readRequestRef.current;
      setReadingId(row._id);

      try {
        const response =
          await salesOrderApi.getOrder(
            row.orderNumber,
          );

        const latest = extractOrder(response);

        if (
          !mountedRef.current ||
          requestId !== readRequestRef.current
        ) {
          return;
        }

        if (
          latest.orderNumber !== row.orderNumber ||
          String(latest._id) !== String(row._id)
        ) {
          throw new Error(
            "The server returned a different order.",
          );
        }

        loadRequestRef.current += 1;
        setLoading(false);
        replaceOrder(latest);

        if (
          config &&
          !config.allowed.includes(latest.status)
        ) {
          toast.error(
            "The order status changed. Review the updated row.",
          );
          return;
        }

        if (mode === "details") {
          setSelectedOrder(latest);
          return;
        }

        if (mode === "timeline") {
          setTimelineOrder(latest);
          return;
        }

        assertVersion(latest);

        if (action === "cancel") {
          setConfirmState({
            open: true,
            action,
            rows: [latest],
          });

          setBulkRemarks("");
          setFailures([]);
          setActionFinished(false);
          setProgress({ done: 0, total: 1 });
          return;
        }

        setActionError("");
        setActionDialog({
          order: latest,
          action,
        });
      } catch (error) {
        if (
          mountedRef.current &&
          requestId === readRequestRef.current
        ) {
          toast.error(getErrorMessage(error));
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
    [dialogOpen, readingId, replaceOrder],
  );

  const handleView = useCallback(
    (row) => {
      void openOrderDialog(row, "details");
    },
    [openOrderDialog],
  );

  const handleShowWorkflow = useCallback(
    (row) => {
      void openOrderDialog(row, "timeline");
    },
    [openOrderDialog],
  );

  const openWorkflow = useCallback(
    (row, action) => {
      void openOrderDialog(row, "action", action);
    },
    [openOrderDialog],
  );

  const handleCreateInvoice = useCallback(
    (row) => {
      if (
        actionLockRef.current ||
        dialogOpen ||
        readingId !== null
      ) {
        return;
      }

      if (row.invoiceNumber) {
        toast.error(
          "This order already has an invoice.",
        );
        return;
      }

      if (
        ![
          "CONFIRMED",
          "IN_PROGRESS",
          "COMPLETED",
        ].includes(row.status)
      ) {
        toast.error(
          "Confirm the Sales Order before creating an invoice.",
        );
        return;
      }

      if (
        !row.orderNumber ||
        !routes.sales.createInvoice
      ) {
        toast.error(
          "The order number or invoice route is missing.",
        );
        return;
      }

      navigate(
        `${routes.sales.createInvoice}?` +
          new URLSearchParams({
            orderNumber: row.orderNumber,
          }).toString(),
      );
    },
    [navigate, dialogOpen, readingId],
  );

  const closeDetails = useCallback(() => {
    setSelectedOrder(null);
  }, []);

  const closeTimeline = useCallback(() => {
    setTimelineOrder(null);
  }, []);

  const closeActionDialog = () => {
    if (actionLockRef.current) return;

    setActionDialog(null);
    setActionError("");
  };

  /* ---------------------------------------------------------------- */
  /* Single detailed workflow action                                   */
  /* ---------------------------------------------------------------- */

  const handleWorkflowSubmit = async (value) => {
    if (
      actionLockRef.current ||
      !actionDialog
    ) {
      return;
    }

    const remarks = String(value ?? "").trim();

    if (!remarks || remarks.length > 1000) {
      setActionError(
        "Enter remarks between 1 and 1,000 characters.",
      );
      return;
    }

    const {
      order: submittedOrder,
      action,
    } = actionDialog;

    const config = WORKFLOWS[action];

    if (!config || action === "cancel") {
      setActionError(
        "Unsupported workflow action.",
      );
      return;
    }

    actionLockRef.current = true;
    loadRequestRef.current += 1;
    readRequestRef.current += 1;

    setLoading(false);
    setActionLoading(true);
    setActionError("");

    try {
      const latestResponse =
        await salesOrderApi.getOrder(
          submittedOrder.orderNumber,
        );

      const latest = extractOrder(latestResponse);

      if (!mountedRef.current) return;

      replaceOrder(latest);
      assertUnchanged(latest, submittedOrder);

      if (!config.allowed.includes(latest.status)) {
        throw new Error(
          "This action is no longer available.",
        );
      }

      const response = await executeAction(
        action,
        latest,
        remarks,
      );

      const updated = extractOrder(response);

      if (!mountedRef.current) return;

      replaceOrder(updated);
      setActionDialog(null);
      setActionError("");

      toast.success(
        response.data.message ||
          `${updated.orderNumber} updated successfully`,
      );

      await refreshRef.current?.();
    } catch (error) {
      if (!mountedRef.current) return;

      const originalMessage =
        getErrorMessage(error);

      setActionError(originalMessage);

      try {
        const response =
          await salesOrderApi.getOrder(
            submittedOrder.orderNumber,
          );

        const latest = extractOrder(response);

        if (!mountedRef.current) return;

        replaceOrder(latest);

        if (!config.allowed.includes(latest.status)) {
          setActionDialog(null);
          setActionError("");

          toast(
            `${latest.orderNumber} is now ${
              STATUS_LABELS[latest.status] ||
              latest.status
            }.`,
          );
        } else {
          setActionDialog((current) =>
            current
              ? {
                  ...current,
                  order: latest,
                }
              : null,
          );

          if (
            latest.__v !== submittedOrder.__v
          ) {
            setActionError(
              "This order changed. Review the updated details before submitting again.",
            );
          }
        }

        await refreshRef.current?.();
      } catch {
        if (mountedRef.current) {
          setActionError(originalMessage);
        }
      }
    } finally {
      actionLockRef.current = false;

      if (mountedRef.current) {
        setActionLoading(false);
      }
    }
  };

  /* ---------------------------------------------------------------- */
  /* Single delete / bulk workflow confirmation                         */
  /* ---------------------------------------------------------------- */

  const openBulkAction = useCallback(
    (input, action) => {
      if (
        actionLockRef.current ||
        dialogOpen ||
        readingId !== null
      ) {
        return;
      }

      const config = actionConfig(action);

      if (!config) return;

      const rows = uniqueOrders(
        (Array.isArray(input) ? input : [input])
          .filter(Boolean),
      );

      if (!rows.length) {
        toast.error(
          "Select at least one Sales Order.",
        );
        return;
      }

      if (
        rows.some(
          (row) =>
            !config.allowed.includes(row.status),
        )
      ) {
        toast.error(
          `Select only orders eligible for ${config.label.toLowerCase()}. Allowed statuses: ${config.allowed.join(", ")}.`,
        );
        return;
      }

      try {
        for (const row of rows) {
          if (!row._id || !row.orderNumber) {
            throw new Error(
              "An order is missing its ID or number.",
            );
          }

          assertVersion(row);
        }

        setConfirmState({
          open: true,
          action,
          rows,
        });

        setBulkRemarks("");
        setFailures([]);
        setActionFinished(false);

        setProgress({
          done: 0,
          total: rows.length,
        });
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [dialogOpen, readingId],
  );

  const handleDelete = useCallback(
    (row) => openBulkAction(row, "delete"),
    [openBulkAction],
  );

  const closeConfirmModal = () => {
    if (actionLockRef.current) return;

    setConfirmState(EMPTY_CONFIRM);
    setBulkRemarks("");
    setFailures([]);
    setActionFinished(false);
    setProgress({ done: 0, total: 0 });
  };

  const handleConfirmAction = async () => {
    if (actionLockRef.current) return;

    if (actionFinished) {
      closeConfirmModal();
      return;
    }

    const { action } = confirmState;
    const rows = [...confirmState.rows];
    const config = actionConfig(action);
    const remarks = bulkRemarks.trim();

    if (!config || !rows.length) return;

    if (
      config.requiresRemarks &&
      (!remarks || remarks.length > 1000)
    ) {
      toast.error(
        "Enter remarks between 1 and 1,000 characters.",
      );
      return;
    }

    if (remarks.length > 1000) {
      toast.error(
        "Remarks cannot exceed 1,000 characters.",
      );
      return;
    }

    actionLockRef.current = true;

    loadRequestRef.current += 1;
    readRequestRef.current += 1;

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
      // Independent sequential operations; not an atomic batch.
      for (let index = 0; index < rows.length; index++) {
        if (!mountedRef.current) break;

        const original = rows[index];
        let writeStarted = false;

        try {
          const latestResponse =
            await salesOrderApi.getOrder(
              original.orderNumber,
            );

          const latest =
            extractOrder(latestResponse);

          if (!mountedRef.current) break;

          replaceOrder(latest);
          assertUnchanged(latest, original);

          if (
            !config.allowed.includes(latest.status)
          ) {
            throw new Error(
              "This action is no longer available.",
            );
          }

          writeStarted = true;

          const response = await executeAction(
            action,
            latest,
            remarks,
          );

          assertSuccess(response);

          if (action !== "delete") {
            const updated = extractOrder(response);

            if (mountedRef.current) {
              replaceOrder(updated);
            }
          }

          successCount += 1;
        } catch (error) {
          const status =
            error?.response?.status;

          failed.push({
            id: String(original._id),
            orderNumber: original.orderNumber,
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
          `${successCount} Sales Order${
            successCount === 1 ? "" : "s"
          } ${config.past} successfully.`,
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
        setConfirmState(EMPTY_CONFIRM);
        setBulkRemarks("");
      }

      await refreshRef.current?.();
    } finally {
      actionLockRef.current = false;

      if (mountedRef.current) {
        setConfirmLoading(false);
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
          "Select at least one Sales Order.",
        );
        return;
      }

      exportLockRef.current = true;
      const toastId = toast.loading(
        "Exporting selected orders...",
      );

      try {
        const records = uniqueOrders(rows);

        await saveCsvFile(
          "sales-orders-selected.csv",
          createCsv(records),
        );

        toast.success(
          `Exported ${records.length} orders.`,
          { id: toastId },
        );
      } catch (error) {
        toast.error(getErrorMessage(error), {
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
      "Preparing Sales Order export...",
    );

    try {
      const firstResponse =
        await salesOrderApi.getOrders(
          buildParams({
            page: 1,
            limit: EXPORT_BATCH_SIZE,
          }),
        );

      const first = readOrderPage(firstResponse);

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
          await salesOrderApi.getOrders(
            buildParams({
              page: currentPage,
              limit: actualLimit,
            }),
          );

        records.push(
          ...readOrderPage(response).data,
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

      const unique = uniqueOrders(records);

      await saveCsvFile(
        "sales-orders-export.csv",
        createCsv(unique),
      );

      toast.success(
        `Exported ${unique.length} Sales Orders.`,
        { id: toastId },
      );
    } catch (error) {
      toast.error(getErrorMessage(error), {
        id: toastId,
      });
    } finally {
      exportLockRef.current = false;
    }
  }, [buildParams]);

  /* ---------------------------------------------------------------- */
  /* Columns                                                           */
  /* ---------------------------------------------------------------- */

  const columns = useMemo(
    () => [
      {
        key: "orderNumber",
        label: "Order No.",
        sortable: SERVER_SORTING_ENABLED,
        render: (value, row) => (
          <button
            type="button"
            className="sol-document-link"
            disabled={busy || dialogOpen}
            onClick={(event) => {
              event.stopPropagation();
              handleView(row);
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
        key: "workflowTimeline",
        label: "Timeline",
        sortable: false,
        render: (_value, row) => (
          <button
            type="button"
            className="sow-open-button"
            disabled={
              busy ||
              dialogOpen ||
              readingId !== null
            }
            onClick={(event) => {
              event.stopPropagation();
              handleShowWorkflow(row);
            }}
          >
            <GitBranch size={14} />
            <span>
              {readingId === row._id
                ? "Loading..."
                : "Workflow"}
            </span>
          </button>
        ),
      },
      {
        key: "orderDate",
        label: "Order Date",
        sortable: SERVER_SORTING_ENABLED,
        render: formatDate,
      },
      {
        key: "expectedDeliveryDate",
        label: "Expected Delivery",
        sortable: SERVER_SORTING_ENABLED,
        render: formatDate,
      },
      {
        key: "totalAmountPaise",
        label: "Total Amount",
        type: "number",
        sortable: SERVER_SORTING_ENABLED,
        render: formatPaise,
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
        key: "sourceQuotationNumber",
        label: "Quotation",
        sortable: SERVER_SORTING_ENABLED,
        render: (value) =>
          value || (
            <span className="dl-muted-value">
              Direct Order
            </span>
          ),
      },
      {
        key: "invoiceAction",
        label: "Invoice",
        sortable: false,
        render: (_value, row) => {
          if (row.invoiceNumber) {
            return (
              <span className="dl-muted-value">
                {row.invoiceNumber}
              </span>
            );
          }

          const canCreate = [
            "CONFIRMED",
            "IN_PROGRESS",
            "COMPLETED",
          ].includes(row.status);

          if (!canCreate) {
            return (
              <span className="dl-muted-value">
                {row.status === "DRAFT"
                  ? "Confirm first"
                  : "Not available"}
              </span>
            );
          }

          return (
            <button
              type="button"
              className="sol-action-button"
              disabled={
                busy ||
                dialogOpen ||
                readingId !== null
              }
              onClick={(event) => {
                event.stopPropagation();
                handleCreateInvoice(row);
              }}
            >
              <FileText size={14} />
              Create Invoice
            </button>
          );
        },
      },
      {
        key: "workflow",
        label: "Workflow",
        sortable: false,
        render: (_value, row) => (
          <div className="sol-workflow-actions">
            {Object.entries(WORKFLOWS)
              .filter(([, config]) =>
                config.allowed.includes(row.status),
              )
              .map(([action, config]) => (
                <button
                  key={action}
                  type="button"
                  className={
                    action === "cancel"
                      ? "sol-action-button sol-action-danger"
                      : "sol-action-button"
                  }
                  disabled={
                    busy ||
                    dialogOpen ||
                    readingId !== null
                  }
                  onClick={(event) => {
                    event.stopPropagation();
                    openWorkflow(row, action);
                  }}
                >
                  {config.label}
                </button>
              ))}

            {["COMPLETED", "CANCELLED"].includes(
              row.status,
            ) && (
              <span className="dl-muted-value">
                No further actions
              </span>
            )}
          </div>
        ),
      },

      ...[
        ["grossAmountPaise", "Gross Amount"],
        ["discountAmountPaise", "Discount"],
        ["taxableAmountPaise", "Taxable Amount"],
        ["cgstAmountPaise", "CGST"],
        ["sgstAmountPaise", "SGST"],
        ["igstAmountPaise", "IGST"],
      ].map(([key, label]) => ({
        key,
        label,
        type: "number",
        sortable:
          SERVER_SORTING_ENABLED &&
          SORT_FIELDS.has(key),
        visible: false,
        render: formatPaise,
      })),

      {
        key: "paymentTerms",
        label: "Payment Terms",
        sortable: SERVER_SORTING_ENABLED,
        visible: false,
      },
      {
        key: "taxMode",
        label: "Tax Mode",
        sortable: SERVER_SORTING_ENABLED,
        visible: false,
      },
      {
        key: "createdAt",
        label: "Created On",
        sortable: SERVER_SORTING_ENABLED,
        visible: false,
        render: formatDate,
      },
    ],
    [
      busy,
      dialogOpen,
      readingId,
      handleView,
      handleShowWorkflow,
      handleCreateInvoice,
      openWorkflow,
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

  const selectedConfig =
    actionConfig(confirmState.action);

  const targetCount =
    confirmState.rows.length;

  const confirmTitle = actionFinished
    ? "Sales Order action results"
    : `${selectedConfig?.label || "Update"}${
        targetCount > 1
          ? " selected Sales Orders?"
          : "?"
      }`;

  const confirmMessage = actionFinished
    ? "Review the results below. The list and global counts have been refreshed."
    : confirmState.action === "delete"
      ? `Soft-delete ${targetCount} draft order${
          targetCount === 1 ? "" : "s"
        }? Each deletion is processed independently.`
      : confirmState.action === "cancel"
        ? `Cancel ${targetCount} order${
            targetCount === 1 ? "" : "s"
          }? This does not reverse invoices or stock movements.`
        : `${selectedConfig?.label || "Update"} ${targetCount} order${
            targetCount === 1 ? "" : "s"
          }? The same remarks will apply to every selected order.`;

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <div className="sol-list-page">
      {loadError && (
        <div className="sol-list-alert" role="alert">
          Unable to load Sales Orders: {loadError}
        </div>
      )}

      <DataList
        title="Sales Orders"
        subtitle="Manage customer orders and order progress"
        columns={columns}
        data={orders}
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
        storageKey="trustiq-sales-orders"
        searchPlaceholder="Search order number, customer, quotation..."
        actions={{
          view: handleView,
          delete: handleDelete,
        }}
        bulkActions={[
          {
            key: "confirm",
            label: "Confirm Drafts",
            action: (rows) =>
              openBulkAction(rows, "confirm"),
          },
          {
            key: "start",
            label: "Start Confirmed",
            action: (rows) =>
              openBulkAction(rows, "start"),
          },
          {
            key: "complete",
            label: "Complete In-Progress",
            action: (rows) =>
              openBulkAction(rows, "complete"),
          },
          {
            key: "cancel",
            label: "Cancel Orders",
            danger: true,
            action: (rows) =>
              openBulkAction(rows, "cancel"),
          },
          {
            key: "delete",
            label: "Delete Drafts",
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
            !actionLockRef.current &&
            !dialogOpen
          ) {
            return refreshAll();
          }
        }}
        onExport={handleExport}
        addButton={
          <button
            type="button"
            className="sol-primary-button"
            disabled={busy || dialogOpen}
            onClick={() =>
              navigate(routes.sales.createOrder)
            }
          >
            <Plus size={16} />
            <span>New Sales Order</span>
          </button>
        }
      />

      <SalesOrderDetailsModal
        order={selectedOrder}
        onClose={closeDetails}
      />

      <SalesOrderWorkflowModal
        order={timelineOrder}
        onClose={closeTimeline}
      />

      <SalesOrderApprovalModal
        key={
          actionDialog
            ? `${actionDialog.order._id}-${actionDialog.action}`
            : "closed"
        }
        order={actionDialog?.order || null}
        action={actionDialog?.action || "confirm"}
        loading={actionLoading}
        error={actionError}
        onClose={closeActionDialog}
        onApprove={handleWorkflowSubmit}
      />

      <ConfirmModal
        open={confirmState.open}
        type="danger"
        title={confirmTitle}
        message={confirmMessage}
        confirmText={
          actionFinished
            ? "Close"
            : `${selectedConfig?.label || "Confirm"} ${
                targetCount
              } Order${
                targetCount === 1 ? "" : "s"
              }`
        }
        cancelText="Back"
        loading={confirmLoading}
        loadingText={`Processing ${progress.done}/${progress.total}...`}
        onCancel={closeConfirmModal}
        onConfirm={handleConfirmAction}
      >
        <div className="sol-bulk-content">
          {!actionFinished &&
            (
              selectedConfig?.requiresRemarks ||
              confirmState.action === "cancel"
            ) && (
              <label className="sol-bulk-remarks">
                <span>
                  {confirmState.action === "cancel"
                    ? "Cancellation reason (optional)"
                    : "Remarks"}
                </span>

                <textarea
                  rows={4}
                  maxLength={1000}
                  value={bulkRemarks}
                  disabled={confirmLoading}
                  required={
                    selectedConfig?.requiresRemarks
                  }
                  onChange={(event) =>
                    setBulkRemarks(event.target.value)
                  }
                  placeholder={
                    confirmState.action === "cancel"
                      ? "Reason for cancellation..."
                      : "Remarks for all selected orders..."
                  }
                />
              </label>
            )}

          {!actionFinished && (
            <p className="sol-bulk-note">
              Each order is reloaded and its selected
              version checked before the action.
              Changed orders are not submitted.
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
              className="sol-bulk-errors"
              role="alert"
            >
              <strong>
                Some actions could not be confirmed
              </strong>

              <ul>
                {failures.map((failure) => (
                  <li key={failure.id}>
                    <span>{failure.orderNumber}</span>
                    {": "}
                    {failure.message}

                    {failure.uncertain && (
                      <small>
                        The write may have reached the
                        server. Verify this order before
                        retrying.
                      </small>
                    )}
                  </li>
                ))}
              </ul>

              <p>
                No automatic retry was performed.
                Close this dialog, verify the updated
                orders, then select eligible records
                again if appropriate.
              </p>
            </div>
          )}
        </div>
      </ConfirmModal>
    </div>
  );
}

export default SalesOrdersList;