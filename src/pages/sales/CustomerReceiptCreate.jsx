// import { useEffect, useMemo, useRef, useState } from "react";

// import { useNavigate, useSearchParams } from "react-router-dom";

// import {
//   ArrowLeft,
//   ChevronDown,
//   Plus,
//   Receipt,
//   Send,
//   StickyNote,
//   Trash2,
// } from "lucide-react";

// import toast from "react-hot-toast";

// import api from "../../services/api";
// import routes from "../../config/routes";

// import Input from "../../components/common/Form/Input";
// import Select from "../../components/common/Form/Select";
// import Textarea from "../../components/common/Form/Textarea";
// import Button from "../../components/common/Form/Button";

// import CustomerPicker from "../../components/customer/CustomerPicker";

// import "../../styles/invoice-common1.css";

// const customerApi = api.customers || api.customer;
// const receiptApi = api.customerReceipts;

// const RECEIPT_METHODS = [
//   { value: "CASH", label: "Cash" },
//   { value: "BANK_TRANSFER", label: "Bank Transfer" },
//   { value: "UPI", label: "UPI" },
//   { value: "CHEQUE", label: "Cheque" },
//   { value: "CARD", label: "Card" },
// ];

// const moneyFormatter = new Intl.NumberFormat("en-IN", {
//   style: "currency",
//   currency: "INR",
//   minimumFractionDigits: 2,
//   maximumFractionDigits: 2,
// });

// const formatPaise = (value) =>
//   moneyFormatter.format((Number(value) || 0) / 100);

// const localDate = () => {
//   const now = new Date();

//   return [
//     now.getFullYear(),
//     String(now.getMonth() + 1).padStart(2, "0"),
//     String(now.getDate()).padStart(2, "0"),
//   ].join("-");
// };

// const initialForm = () => ({
//   customerId: "",
//   receiptLedgerId: "",
//   receiptDate: localDate(),
//   receiptMethod: "CASH",
//   referenceNumber: "",
//   amount: "",
//   notes: "",
// });

// let nextRowId = 0;

// const newAllocation = () => ({
//   rowId: `receipt-allocation-${++nextRowId}`,
//   salesInvoiceId: "",
//   amount: "",
// });

// const getErrors = (error) => {
//   const data = error?.response?.data;

//   if (Array.isArray(data?.errors) && data.errors.length) {
//     return data.errors.map((item) =>
//       typeof item === "string"
//         ? item
//         : item?.message || item?.msg || String(item),
//     );
//   }

//   return [data?.message || error?.message || "Unable to complete the request."];
// };

// const extractList = (response, fallbackKey) => {
//   const body = response?.data;

//   if (Array.isArray(body?.data)) return body.data;
//   if (Array.isArray(body?.[fallbackKey])) {
//     return body[fallbackKey];
//   }

//   if (Array.isArray(body)) return body;

//   return [];
// };

// const loadAllPages = async (service, fallbackKey) => {
//   if (!service?.getAll) {
//     throw new Error(`The ${fallbackKey} API getAll method is not configured.`);
//   }

//   const first = await service.getAll({ page: 1, limit: 100 });
//   const records = [...extractList(first, fallbackKey)];

//   const pages = Math.max(1, Number(first?.data?.pagination?.totalPages) || 1);

//   for (let page = 2; page <= pages; page += 1) {
//     const response = await service.getAll({
//       page,
//       limit: 100,
//     });

//     records.push(...extractList(response, fallbackKey));
//   }

//   return Array.from(
//     new Map(records.map((record) => [record._id, record])).values(),
//   );
// };

// const toPaise = (value) => {
//   if (value === "" || value === null || value === undefined) {
//     return 0;
//   }

//   const number = Number(value);

//   if (!Number.isFinite(number) || number < 0) {
//     return 0;
//   }

//   return Math.round(number * 100);
// };

// const ledgerTypeForMethod = (method) => (method === "CASH" ? "CASH" : "BANK");

// const pickDefaultLedger = (ledgers, method) =>
//   ledgers.find((ledger) => ledger.type === ledgerTypeForMethod(method)) ||
//   null;

// /* ---------------------------------------------------------
//    Page
// --------------------------------------------------------- */

// function CustomerReceiptCreate() {
//   const navigate = useNavigate();
//   const [searchParams] = useSearchParams();

//   const [form, setForm] = useState(initialForm);
//   const [allocations, setAllocations] = useState(() => [newAllocation()]);

//   const [customers, setCustomers] = useState([]);
//   const [receiptLedgers, setReceiptLedgers] = useState([]);
//   const [unpaidInvoices, setUnpaidInvoices] = useState([]);

//   const [loading, setLoading] = useState(true);
//   const [loadFailed, setLoadFailed] = useState(false);
//   const [reloadKey, setReloadKey] = useState(0);

//   const [invoicesLoading, setInvoicesLoading] = useState(false);

//   const [showNotes, setShowNotes] = useState(false);

//   const [saving, setSaving] = useState(false);
//   const [errors, setErrors] = useState([]);

//   const submitLock = useRef(false);
//   const prefillDone = useRef(false);
//   const initialSnapshot = useRef(
//     JSON.stringify({
//       form: initialForm(),
//       allocations: [newAllocation()],
//     }),
//   );

//   const disabled = loading || loadFailed || saving;

//   useEffect(() => {
//     let cancelled = false;

//     const loadOptions = async () => {
//       setLoading(true);
//       setLoadFailed(false);
//       setErrors([]);

//       try {
//         const [customerRecords, ledgerRecords] = await Promise.all([
//           loadAllPages(customerApi, "customers"),
//           receiptApi.getReceiptLedgers(),
//         ]);

//         if (cancelled) return;

//         setCustomers(
//           customerRecords.filter(
//             (customer) => customer.status === "Active" && !customer.isDeleted,
//           ),
//         );

//         setReceiptLedgers(
//           extractList(ledgerRecords, "data").filter(
//             (ledger) => ledger.isActive !== false,
//           ),
//         );
//       } catch (error) {
//         if (cancelled) return;

//         const messages = getErrors(error);

//         setErrors(messages);
//         setLoadFailed(true);
//         toast.error(messages[0]);
//       } finally {
//         if (!cancelled) {
//           setLoading(false);
//         }
//       }
//     };

//     loadOptions();

//     return () => {
//       cancelled = true;
//     };
//   }, [reloadKey]);

//   // Prefill from "Receive Payment" button on the sales invoice list
//   useEffect(() => {
//     if (loading || loadFailed || prefillDone.current) return;

//     const customerId = searchParams.get("customerId");
//     const invoiceId = searchParams.get("invoiceId");

//     if (!customerId || !invoiceId) return;

//     prefillDone.current = true;

//     const customer = customers.find((item) => item._id === customerId);

//     if (!customer) {
//       toast.error("Customer not found or inactive.");
//       return;
//     }

//     let cancelled = false;

//     (async () => {
//       setInvoicesLoading(true);

//       try {
//         const response = await receiptApi.getUnpaidInvoices({
//           customerId,
//           page: 1,
//           limit: 100,
//         });

//         if (cancelled) return;

//         const list = extractList(response, "data").filter(
//           (invoice) => Number(invoice.outstandingAmountPaise) > 0,
//         );

//         setUnpaidInvoices(list);

//         const invoice = list.find((item) => item._id === invoiceId);

//         const balance = invoice
//           ? (Number(invoice.outstandingAmountPaise) / 100).toFixed(2)
//           : "";

//         const defaultLedger = pickDefaultLedger(receiptLedgers, "CASH");

//         setForm((previous) => ({
//           ...previous,
//           customerId,
//           receiptLedgerId:
//             previous.receiptLedgerId || defaultLedger?._id || "",
//           amount: balance,
//         }));

//         setAllocations([
//           {
//             ...newAllocation(),
//             salesInvoiceId: invoice?._id || "",
//             amount: balance,
//           },
//         ]);

//         if (!invoice) {
//           toast.error("This invoice has no outstanding balance.");
//         }
//       } catch (error) {
//         if (cancelled) return;

//         const messages = getErrors(error);

//         setErrors(messages);
//         toast.error(messages[0]);
//       } finally {
//         if (!cancelled) setInvoicesLoading(false);
//       }
//     })();

//     return () => {
//       cancelled = true;
//       prefillDone.current = false;
//     };
//   }, [loading, loadFailed, customers, receiptLedgers, searchParams]);

//   const selectedCustomer = useMemo(
//     () => customers.find((customer) => customer._id === form.customerId),
//     [customers, form.customerId],
//   );

//   const selectedLedger = useMemo(
//     () => receiptLedgers.find((ledger) => ledger._id === form.receiptLedgerId),
//     [receiptLedgers, form.receiptLedgerId],
//   );

//   const ledgerOptions = useMemo(
//     () =>
//       receiptLedgers
//         .filter(
//           (ledger) => ledger.type === ledgerTypeForMethod(form.receiptMethod),
//         )
//         .map((ledger) => ({
//           value: ledger._id,
//           label: `${ledger.name} (${ledger.code})`,
//         })),
//     [receiptLedgers, form.receiptMethod],
//   );

//   const invoiceMap = useMemo(
//     () => new Map(unpaidInvoices.map((invoice) => [invoice._id, invoice])),
//     [unpaidInvoices],
//   );

//   const allocationPreviews = useMemo(
//     () =>
//       allocations.map((allocation) => {
//         const invoice = invoiceMap.get(allocation.salesInvoiceId);

//         const amountPaise = toPaise(allocation.amount);
//         const outstandingPaise = Number(invoice?.outstandingAmountPaise || 0);

//         return {
//           invoice,
//           amountPaise,
//           valid:
//             Boolean(invoice) &&
//             amountPaise > 0 &&
//             amountPaise <= outstandingPaise,
//         };
//       }),
//     [allocations, invoiceMap],
//   );

//   const allocatedTotal = useMemo(
//     () =>
//       allocationPreviews.reduce(
//         (total, allocation) => total + allocation.amountPaise,
//         0,
//       ),
//     [allocationPreviews],
//   );

//   const receiptAmountPaise = toPaise(form.amount);

//   const totalsMatch =
//     allocatedTotal > 0 && allocatedTotal === receiptAmountPaise;

//   const isDirty =
//     JSON.stringify({ form, allocations }) !== initialSnapshot.current;

//   const handleFieldChange = (event) => {
//     const { name, value } = event.target;

//     setForm((previous) => {
//       const next = { ...previous, [name]: value };

//       if (name === "receiptMethod") {
//         const current = receiptLedgers.find(
//           (ledger) => ledger._id === previous.receiptLedgerId,
//         );

//         if (current?.type !== ledgerTypeForMethod(value)) {
//           next.receiptLedgerId =
//             pickDefaultLedger(receiptLedgers, value)?._id || "";
//         }
//       }

//       return next;
//     });

//     setErrors([]);
//   };

//   const handleCustomerSelect = async (customer) => {
//     setForm((previous) => ({
//       ...previous,
//       customerId: customer?._id || "",
//     }));

//     setAllocations([newAllocation()]);
//     setUnpaidInvoices([]);
//     setErrors([]);

//     if (!customer?._id) {
//       return;
//     }

//     setInvoicesLoading(true);

//     try {
//       const response = await receiptApi.getUnpaidInvoices({
//         customerId: customer._id,
//         page: 1,
//         limit: 100,
//       });

//       setUnpaidInvoices(
//         extractList(response, "data").filter(
//           (invoice) => Number(invoice.outstandingAmountPaise) > 0,
//         ),
//       );
//     } catch (error) {
//       const messages = getErrors(error);

//       setErrors(messages);
//       toast.error(messages[0]);
//     } finally {
//       setInvoicesLoading(false);
//     }
//   };

//   const updateAllocation = (rowId, field, value) => {
//     setAllocations((previous) =>
//       previous.map((allocation) =>
//         allocation.rowId === rowId
//           ? { ...allocation, [field]: value }
//           : allocation,
//       ),
//     );

//     setErrors([]);
//   };

//   const selectInvoice = (rowId, salesInvoiceId) => {
//     const invoice = invoiceMap.get(salesInvoiceId);

//     setAllocations((previous) =>
//       previous.map((allocation) =>
//         allocation.rowId === rowId
//           ? {
//               ...allocation,
//               salesInvoiceId,
//               amount: invoice
//                 ? (Number(invoice.outstandingAmountPaise) / 100).toFixed(2)
//                 : "",
//             }
//           : allocation,
//       ),
//     );

//     setErrors([]);
//   };

//   const removeAllocation = (rowId) => {
//     setAllocations((previous) =>
//       previous.filter((allocation) => allocation.rowId !== rowId),
//     );
//   };

//   const validateForm = () => {
//     const messages = [];

//     if (!selectedCustomer) {
//       messages.push("Select a customer.");
//     } else if (!selectedCustomer.ledgerId) {
//       messages.push("The selected customer has no linked accounting ledger.");
//     }

//     if (!selectedLedger) {
//       messages.push(
//         "Select the Cash or Bank account that received the payment.",
//       );
//     }

//     if (!form.receiptDate) {
//       messages.push("Receipt date is required.");
//     }

//     if (receiptAmountPaise <= 0) {
//       messages.push("Receipt amount must be greater than zero.");
//     }

//     if (!allocations.length) {
//       messages.push("Allocate the receipt to at least one sales invoice.");
//     }

//     const selectedInvoiceIds = allocations
//       .map((allocation) => allocation.salesInvoiceId)
//       .filter(Boolean);

//     if (new Set(selectedInvoiceIds).size !== selectedInvoiceIds.length) {
//       messages.push("A sales invoice can appear only once in a receipt.");
//     }

//     allocations.forEach((allocation, index) => {
//       if (!allocation.salesInvoiceId) {
//         messages.push(`Select a sales invoice for allocation ${index + 1}.`);
//       } else if (!allocationPreviews[index].valid) {
//         messages.push(
//           `Check the amount for allocation ${index + 1}. It cannot exceed the invoice balance.`,
//         );
//       }
//     });

//     if (!totalsMatch) {
//       messages.push("Allocated amounts must equal the receipt amount.");
//     }

//     return messages;
//   };

//   const saveReceipt = async () => {
//     if (disabled || submitLock.current) {
//       return;
//     }

//     const messages = validateForm();

//     if (messages.length) {
//       setErrors(messages);
//       toast.error(messages[0]);
//       window.scrollTo?.({ top: 0, behavior: "smooth" });
//       return;
//     }

//     submitLock.current = true;
//     setSaving(true);
//     setErrors([]);

//     try {
//       const payload = {
//         requestId: crypto.randomUUID(),

//         customerId: form.customerId,
//         receiptLedgerId: form.receiptLedgerId,
//         receiptDate: form.receiptDate,
//         receiptMethod: form.receiptMethod,
//         referenceNumber: form.referenceNumber.trim(),
//         amount: Number(form.amount),

//         allocations: allocations.map((allocation) => ({
//           salesInvoiceId: allocation.salesInvoiceId,
//           amount: Number(allocation.amount),
//         })),

//         notes: form.notes.trim(),
//       };

//       const response = await receiptApi.create(payload);

//       const receipt = response?.data?.receipt;

//       if (!receipt?.receiptNumber) {
//         throw new Error(
//           "The server did not return a receipt number. Check the list before retrying.",
//         );
//       }

//       toast.success(`${receipt.receiptNumber} recorded successfully`);

//       navigate(routes.sales.invoices, {
//         replace: true,
//       });
//     } catch (error) {
//       const messages = getErrors(error);

//       setErrors(messages);
//       toast.error(messages[0]);
//     } finally {
//       submitLock.current = false;
//       setSaving(false);
//     }
//   };

//   const exitPage = () => {
//     if (saving) {
//       return;
//     }

//     if (
//       isDirty &&
//       !window.confirm("Discard this customer receipt and leave the page?")
//     ) {
//       return;
//     }

//     navigate(routes.sales.invoices);
//   };

//   const actionButtons = (
//     <>
//       <Button
//         variant="secondary"
//         icon={ArrowLeft}
//         disabled={saving}
//         onClick={exitPage}
//       >
//         Exit
//       </Button>

//       <Button
//         icon={Send}
//         disabled={disabled || !totalsMatch}
//         loading={saving}
//         onClick={saveReceipt}
//       >
//         Save & Post
//       </Button>
//     </>
//   );

//   return (
//     <div className="doc-page">
//       <form noValidate onSubmit={(event) => event.preventDefault()}>
//         <header className="doc-header">
//           <div className="doc-header-left">
//             <Button
//               variant="secondary"
//               icon={ArrowLeft}
//               disabled={saving}
//               onClick={exitPage}
//               aria-label="Exit to customer receipts"
//             >
//               Exit
//             </Button>

//             <div className="doc-title">
//               <Receipt size={18} />
//               <span>Create Customer Receipt</span>
//             </div>
//           </div>

//           <div className="doc-header-actions">{actionButtons}</div>
//         </header>

//         {(loading || errors.length > 0) && (
//           <div className="doc-alerts">
//             {loading && (
//               <div className="doc-alert" role="status">
//                 Loading customers and receipt accounts...
//               </div>
//             )}

//             {errors.length > 0 && (
//               <div className="doc-alert doc-alert-error" role="alert">
//                 <strong>Please review the following</strong>

//                 <ul>
//                   {errors.map((message, index) => (
//                     <li key={`${index}-${message}`}>{message}</li>
//                   ))}
//                 </ul>

//                 {loadFailed && (
//                   <Button
//                     variant="secondary"
//                     onClick={() => setReloadKey((previous) => previous + 1)}
//                   >
//                     Retry Loading
//                   </Button>
//                 )}
//               </div>
//             )}
//           </div>
//         )}

//         <fieldset className="doc-fieldset" disabled={disabled}>
//           <main className="doc-main">
//             <section className="doc-top">
//               <div className="doc-panel doc-party-panel">
//                 <h2 className="doc-panel-title">Received From</h2>

//                 <CustomerPicker
//                   customers={customers}
//                   selected={selectedCustomer}
//                   disabled={disabled}
//                   loading={loading}
//                   onSelect={handleCustomerSelect}
//                 />
//               </div>

//               <div className="doc-panel">
//                 <h2 className="doc-panel-title">Receipt Details</h2>

//                 <div className="doc-fields-grid">
//                   <Input
//                     label="Receipt Number"
//                     name="receiptNumber"
//                     value="Generated after saving"
//                     readOnly
//                   />

//                   <Input
//                     label="Receipt Date"
//                     name="receiptDate"
//                     type="date"
//                     value={form.receiptDate}
//                     onChange={handleFieldChange}
//                     required
//                   />

//                   <Select
//                     label="Received In"
//                     name="receiptLedgerId"
//                     value={form.receiptLedgerId}
//                     placeholder="Select Cash / Bank account"
//                     options={ledgerOptions}
//                     onChange={handleFieldChange}
//                   />

//                   <Select
//                     label="Payment Method"
//                     name="receiptMethod"
//                     value={form.receiptMethod}
//                     options={RECEIPT_METHODS}
//                     onChange={handleFieldChange}
//                   />

//                   <Input
//                     label="Reference Number"
//                     name="referenceNumber"
//                     value={form.referenceNumber}
//                     onChange={handleFieldChange}
//                     placeholder="UTR, cheque number, transaction ID"
//                     maxLength={100}
//                   />

//                   <Input
//                     label="Receipt Amount (₹)"
//                     name="amount"
//                     type="number"
//                     inputMode="decimal"
//                     min="0"
//                     step="0.01"
//                     value={form.amount}
//                     onChange={handleFieldChange}
//                     required
//                   />
//                 </div>
//               </div>
//             </section>

//             <section className="doc-items">
//               <div className="doc-table-wrap">
//                 <table className="doc-table">
//                   <thead>
//                     <tr>
//                       <th>No</th>
//                       <th>Sales Invoice</th>
//                       <th>Invoice Date</th>
//                       <th>Due Date</th>
//                       <th>Invoice Total</th>
//                       <th>Balance</th>
//                       <th>Amount Received (₹)</th>
//                       <th>
//                         <span className="doc-sr-only">Remove</span>
//                       </th>
//                     </tr>
//                   </thead>

//                   <tbody>
//                     {invoicesLoading && (
//                       <tr>
//                         <td colSpan={8} className="doc-cell-no">
//                           Loading unpaid invoices...
//                         </td>
//                       </tr>
//                     )}

//                     {!invoicesLoading &&
//                       allocations.map((allocation, index) => {
//                         const preview = allocationPreviews[index];

//                         const invoiceOptions = unpaidInvoices
//                           .filter(
//                             (invoice) =>
//                               invoice._id === allocation.salesInvoiceId ||
//                               !allocations.some(
//                                 (other) => other.salesInvoiceId === invoice._id,
//                               ),
//                           )
//                           .map((invoice) => ({
//                             value: invoice._id,
//                             label: `${invoice.invoiceNumber} · Balance ${formatPaise(
//                               invoice.outstandingAmountPaise,
//                             )}`,
//                           }));

//                         return (
//                           <tr key={allocation.rowId}>
//                             <td data-label="No." className="doc-cell-no">
//                               {index + 1}
//                             </td>

//                             <td data-label="Invoice" className="doc-cell-item">
//                               <Select
//                                 name={`invoice-${allocation.rowId}`}
//                                 aria-label={`Sales invoice ${index + 1}`}
//                                 value={allocation.salesInvoiceId}
//                                 placeholder="Select invoice"
//                                 options={invoiceOptions}
//                                 onChange={(event) =>
//                                   selectInvoice(
//                                     allocation.rowId,
//                                     event.target.value,
//                                   )
//                                 }
//                               />

//                               {preview.invoice && (
//                                 <small className="doc-item-meta">
//                                   {preview.invoice.paymentStatus}
//                                 </small>
//                               )}
//                             </td>

//                             <td
//                               data-label="Invoice Date"
//                               className="doc-cell-no"
//                             >
//                               {preview.invoice?.invoiceDate
//                                 ? new Date(
//                                     preview.invoice.invoiceDate,
//                                   ).toLocaleDateString("en-IN")
//                                 : "—"}
//                             </td>

//                             <td data-label="Due Date" className="doc-cell-no">
//                               {preview.invoice?.dueDate
//                                 ? new Date(
//                                     preview.invoice.dueDate,
//                                   ).toLocaleDateString("en-IN")
//                                 : "—"}
//                             </td>

//                             <td
//                               data-label="Invoice Total"
//                               className="doc-cell-amount"
//                             >
//                               {preview.invoice
//                                 ? formatPaise(preview.invoice.totalAmountPaise)
//                                 : "—"}
//                             </td>

//                             <td
//                               data-label="Balance"
//                               className="doc-cell-amount"
//                             >
//                               {preview.invoice
//                                 ? formatPaise(
//                                     preview.invoice.outstandingAmountPaise,
//                                   )
//                                 : "—"}
//                             </td>

//                             <td data-label="Amount Received (₹)">
//                               <Input
//                                 name={`amount-${allocation.rowId}`}
//                                 aria-label={`Amount received ${index + 1}`}
//                                 type="number"
//                                 inputMode="decimal"
//                                 min="0"
//                                 step="0.01"
//                                 value={allocation.amount}
//                                 onChange={(event) =>
//                                   updateAllocation(
//                                     allocation.rowId,
//                                     "amount",
//                                     event.target.value,
//                                   )
//                                 }
//                               />
//                             </td>

//                             <td data-label="Remove" className="doc-cell-action">
//                               <button
//                                 type="button"
//                                 className="doc-remove-button"
//                                 aria-label={`Remove allocation ${index + 1}`}
//                                 onClick={() =>
//                                   removeAllocation(allocation.rowId)
//                                 }
//                               >
//                                 <Trash2 size={16} />
//                               </button>
//                             </td>
//                           </tr>
//                         );
//                       })}
//                   </tbody>

//                   <tfoot>
//                     <tr>
//                       <td colSpan={6} className="doc-subtotal-label">
//                         Total Allocated
//                       </td>

//                       <td className="doc-subtotal-value">
//                         {formatPaise(allocatedTotal)}
//                       </td>

//                       <td />
//                     </tr>
//                   </tfoot>
//                 </table>
//               </div>

//               <div className="doc-add-item-row">
//                 <button
//                   type="button"
//                   className="doc-dashed-line"
//                   disabled={allocations.length >= 200 || !selectedCustomer}
//                   onClick={() =>
//                     setAllocations((previous) => [...previous, newAllocation()])
//                   }
//                 >
//                   <Plus size={15} />
//                   Add Invoice Allocation
//                 </button>
//               </div>
//             </section>

//             <section className="doc-bottom">
//               <div className="doc-extras">
//                 <button
//                   type="button"
//                   className={`doc-extra-row ${showNotes ? "is-open" : ""}`}
//                   aria-expanded={showNotes}
//                   onClick={() => setShowNotes((previous) => !previous)}
//                 >
//                   <StickyNote size={16} />
//                   <span>Add Notes</span>
//                   <ChevronDown size={16} />
//                 </button>

//                 {showNotes && (
//                   <div className="doc-extra-content">
//                     <Textarea
//                       name="notes"
//                       value={form.notes}
//                       onChange={handleFieldChange}
//                       maxLength={1000}
//                       rows={4}
//                       placeholder="Receipt notes..."
//                     />
//                   </div>
//                 )}

//                 <p className="doc-note">
//                   This receipt will debit the selected Cash or Bank account and
//                   credit the customer receivable ledger.
//                 </p>
//               </div>

//               <div className="doc-summary">
//                 <div className="doc-summary-row">
//                   <span>Receipt Amount</span>

//                   <strong>{formatPaise(receiptAmountPaise)}</strong>
//                 </div>

//                 <div className="doc-summary-row">
//                   <span>Total Allocated</span>

//                   <strong>{formatPaise(allocatedTotal)}</strong>
//                 </div>

//                 <div className="doc-summary-row">
//                   <span>Difference</span>

//                   <strong>
//                     {formatPaise(Math.abs(receiptAmountPaise - allocatedTotal))}
//                   </strong>
//                 </div>

//                 <div
//                   className={`doc-summary-total ${
//                     totalsMatch ? "" : "is-invalid"
//                   }`}
//                 >
//                   <span>Status:</span>

//                   <strong>
//                     {totalsMatch ? "Ready to post" : "Allocation mismatch"}
//                   </strong>
//                 </div>

//                 <p className="doc-note">
//                   Preview only. The server validates final amounts and posts the
//                   accounting journal.
//                 </p>
//               </div>
//             </section>
//           </main>
//         </fieldset>

//         <div className="doc-mobile-bar">
//           <div className="doc-mobile-total">
//             <span>Receipt</span>

//             <strong>{formatPaise(receiptAmountPaise)}</strong>
//           </div>

//           <div className="doc-mobile-actions">{actionButtons}</div>
//         </div>
//       </form>
//     </div>
//   );
// }

// export default CustomerReceiptCreate;

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import {
  ArrowLeft,
  ChevronDown,
  Plus,
  Receipt,
  Send,
  StickyNote,
  Trash2,
} from "lucide-react";

import toast from "react-hot-toast";

import api from "../../services/api";
import routes from "../../config/routes";

import Input from "../../components/common/Form/Input";
import Select from "../../components/common/Form/Select";
import Textarea from "../../components/common/Form/Textarea";
import Button from "../../components/common/Form/Button";

import EntitySearchPicker from "../../components/common/EntitySearchPicker/EntitySearchPicker";
import useKeyboardOpen from "../../hooks/useKeyboardOpen";

import "../../styles/invoice-common1.css";
import "./CustomerReceiptCreateResponsive.css";

const customerApi = api.customers || api.customer;
const receiptApi = api.customerReceipts;

const MAX_ALLOCATIONS = 200;

const RECEIPT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "UPI", label: "UPI" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "CARD", label: "Card" },
];

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

const formatPaise = (value) =>
  moneyFormatter.format(
    (Number(value) || 0) / 100,
  );

const normalizeId = (value) => {
  if (!value) return "";

  if (typeof value === "object") {
    return String(value._id || value.id || "");
  }

  return String(value);
};

const localDate = () => {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
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

const validDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(
    `${value}T00:00:00.000Z`,
  );

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
};

const initialForm = () => ({
  customerId: "",
  receiptLedgerId: "",
  receiptDate: localDate(),
  receiptMethod: "CASH",
  referenceNumber: "",
  amount: "",
  notes: "",
});

let nextRowId = 0;

const newAllocation = () => ({
  rowId: `receipt-allocation-${++nextRowId}`,
  salesInvoiceId: "",
  amount: "",
});

const formSnapshot = (form, allocations) =>
  JSON.stringify({
    form,
    allocations: allocations.map(
      ({ rowId, ...allocation }) => allocation,
    ),
  });

const getErrors = (error) => {
  const data = error?.response?.data;

  if (
    Array.isArray(data?.errors) &&
    data.errors.length
  ) {
    return data.errors.map((item) =>
      typeof item === "string"
        ? item
        : item?.message ||
          item?.msg ||
          String(item),
    );
  }

  return [
    data?.message ||
      error?.message ||
      "Unable to complete the request.",
  ];
};

/*
 * Reject invalid decimal input instead of silently rounding.
 * Empty/invalid input returns null.
 */
const toPaise = (value) => {
  const input = String(value ?? "").trim();

  if (!/^\d+(?:\.\d{1,2})?$/.test(input)) {
    return null;
  }

  const [whole, fraction = ""] = input.split(".");

  const amount =
    BigInt(whole) * 100n +
    BigInt(fraction.padEnd(2, "0"));

  if (
    amount > BigInt(Number.MAX_SAFE_INTEGER)
  ) {
    return null;
  }

  return Number(amount);
};

const ledgerTypeForMethod = (method) =>
  method === "CASH" ? "CASH" : "BANK";

const pickDefaultLedger = (ledgers, method) =>
  ledgers.find(
    (ledger) =>
      ledger.type === ledgerTypeForMethod(method),
  ) || null;

const extractList = (response, key) => {
  const body = response?.data;

  if (body?.success === false) {
    throw new Error(
      body.message ||
        `Unable to load ${key}.`,
    );
  }

  if (Array.isArray(body?.data)) {
    return body.data;
  }

  if (Array.isArray(body?.data?.[key])) {
    return body.data[key];
  }

  if (Array.isArray(body?.[key])) {
    return body[key];
  }

  if (Array.isArray(body)) {
    return body;
  }

  throw new Error(
    `Invalid ${key} response.`,
  );
};

const readPage = (response, key) => {
  const data = extractList(response, key);
  const body = response?.data;

  const pagination =
    body?.pagination ||
    body?.data?.pagination;

  const rawTotal =
    pagination?.total ??
    pagination?.totalRecords ??
    pagination?.totalItems;

  if (
    rawTotal === undefined ||
    rawTotal === null ||
    !Number.isFinite(Number(rawTotal)) ||
    Number(rawTotal) < 0
  ) {
    throw new Error(
      `The ${key} endpoint must return pagination.total.`,
    );
  }

  return {
    data,
    total: Number(rawTotal),
    pagination,
  };
};

const customerLabel = (customer) =>
  customer
    ? `${customer.customerName || "Customer"}${
        customer.customerCode
          ? ` (${customer.customerCode})`
          : ""
      }`
    : "";

const customerAddress = (customer) =>
  [
    customer?.billingAddress,
    customer?.city,
    customer?.state,
    customer?.pincode,
    customer?.country,
  ]
    .filter(Boolean)
    .join(", ");

/* ------------------------------------------------------------------ */
/* Picker callbacks                                                    */
/* ------------------------------------------------------------------ */

const fetchCustomerOptions = async ({
  search,
  page,
  limit,
}) => {
  const response = await customerApi.getAll({
    search,
    page,
    limit,
    status: "Active",
  });

  return readPage(response, "customers");
};

const getCustomerOptionId = (customer) =>
  normalizeId(customer);

const getCustomerOptionLabel = (customer) =>
  customer.customerName ||
  customer.customerCode ||
  "Customer";

const getCustomerOptionSubtitle = (customer) =>
  [
    customer.customerCode,
    customer.phone,
    customer.gstNo,
  ]
    .filter(Boolean)
    .join(" · ");

const getInvoiceOptionId = (invoice) =>
  normalizeId(invoice);

const getInvoiceOptionLabel = (invoice) =>
  invoice.invoiceNumber || "Sales Invoice";

const getInvoiceOptionSubtitle = (invoice) =>
  [
    `Balance: ${formatPaise(
      invoice.outstandingAmountPaise,
    )}`,
    invoice.dueDate
      ? `Due: ${formatDate(invoice.dueDate)}`
      : "",
    invoice.paymentStatus,
  ]
    .filter(Boolean)
    .join(" · ");

/*
 * Compatibility helper for URL prefill.
 * Reads one page at a time and stops when the requested ID is found.
 * It does not retain an entire customer/invoice collection.
 */
async function findRecordById(
  fetchPage,
  key,
  id,
  isCurrent,
) {
  let page = 1;
  let totalPages = 1;

  do {
    if (!isCurrent()) return null;

    const response = await fetchPage({
      page,
      limit: 100,
    });

    if (!isCurrent()) return null;

    const result = readPage(response, key);

    const match = result.data.find(
      (record) =>
        normalizeId(record) === id,
    );

    if (match) return match;

    if (!result.data.length) return null;

    const actualLimit = Math.max(
      1,
      Number(result.pagination?.limit) || 100,
    );

    totalPages = Math.max(
      1,
      Math.ceil(result.total / actualLimit),
    );

    page += 1;
  } while (page <= totalPages);

  return null;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

function CustomerReceiptCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const keyboardOpen = useKeyboardOpen();

  const prefillCustomerId =
    searchParams.get("customerId") || "";

  const prefillInvoiceId =
    searchParams.get("invoiceId") || "";

  const [form, setForm] = useState(initialForm);

  const [allocations, setAllocations] =
    useState(() => [newAllocation()]);

  const [customerRecords, setCustomerRecords] =
    useState({});

  const [invoiceRecords, setInvoiceRecords] =
    useState({});

  const [receiptLedgers, setReceiptLedgers] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [loadFailed, setLoadFailed] =
    useState(false);

  const [reloadKey, setReloadKey] =
    useState(0);

  const [prefillLoading, setPrefillLoading] =
    useState(false);

  const [prefillFailed, setPrefillFailed] =
    useState(false);

  const [prefillReloadKey, setPrefillReloadKey] =
    useState(0);

  const [showNotes, setShowNotes] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [retryPending, setRetryPending] =
    useState(false);

  const [errors, setErrors] =
    useState([]);

  const submitLock = useRef(false);
  const pendingPayload = useRef(null);
  const mountedRef = useRef(false);
  const prefillCompletedKey = useRef("");

  const initialSnapshot = useRef(
    formSnapshot(form, allocations),
  );

  const disabled =
    loading ||
    loadFailed ||
    prefillLoading ||
    saving ||
    retryPending;

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* ---------------------------------------------------------------- */
  /* Only receipt accounts load initially                              */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    let active = true;

    const loadLedgers = async () => {
      setLoading(true);
      setLoadFailed(false);
      setErrors([]);

      try {
        const response =
          await receiptApi.getReceiptLedgers();

        if (!active) return;

        const records = extractList(
          response,
          "ledgers",
        );

        setReceiptLedgers(
          records.filter(
            (ledger) =>
              ledger.isActive !== false,
          ),
        );
      } catch (error) {
        if (!active) return;

        const messages = getErrors(error);

        setErrors(messages);
        setLoadFailed(true);
        toast.error(messages[0]);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadLedgers();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  /* ---------------------------------------------------------------- */
  /* Receive Payment URL prefill                                       */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (
      loading ||
      loadFailed ||
      !prefillCustomerId ||
      !prefillInvoiceId
    ) {
      return undefined;
    }

    const key =
      `${prefillCustomerId}:${prefillInvoiceId}`;

    if (prefillCompletedKey.current === key) {
      return undefined;
    }

    let active = true;

    const isCurrent = () =>
      active && mountedRef.current;

    const prefill = async () => {
      setPrefillLoading(true);
      setPrefillFailed(false);
      setErrors([]);

      try {
        const customer = await findRecordById(
          (params) =>
            customerApi.getAll({
              ...params,
              status: "Active",
            }),
          "customers",
          prefillCustomerId,
          isCurrent,
        );

        if (!isCurrent()) return;

        if (
          !customer ||
          customer.isDeleted ||
          (
            customer.status !== undefined &&
            customer.status !== "Active"
          )
        ) {
          throw new Error(
            "The linked customer was not found or is inactive. Select a customer manually.",
          );
        }

        setCustomerRecords((previous) => ({
          ...previous,
          [prefillCustomerId]: customer,
        }));

        const invoice = await findRecordById(
          (params) =>
            receiptApi.getUnpaidInvoices({
              ...params,
              customerId: prefillCustomerId,
            }),
          "invoices",
          prefillInvoiceId,
          isCurrent,
        );

        if (!isCurrent()) return;

        const defaultLedger =
          pickDefaultLedger(
            receiptLedgers,
            "CASH",
          );

        if (
          !invoice ||
          !Number.isSafeInteger(
            Number(
              invoice.outstandingAmountPaise,
            ),
          ) ||
          Number(
            invoice.outstandingAmountPaise,
          ) <= 0
        ) {
          setForm((previous) => ({
            ...previous,
            customerId: prefillCustomerId,
            receiptLedgerId:
              previous.receiptLedgerId ||
              normalizeId(defaultLedger),
            amount: "",
          }));

          setAllocations([newAllocation()]);

          prefillCompletedKey.current = key;

          throw new Error(
            "The linked invoice is no longer in the unpaid list. Search and select an eligible invoice.",
          );
        }

        const invoiceCustomerId =
          normalizeId(invoice.customerId);

        if (
          invoiceCustomerId &&
          invoiceCustomerId !==
            prefillCustomerId
        ) {
          throw new Error(
            "The linked invoice belongs to a different customer.",
          );
        }

        if (
          invoice.status !== undefined &&
          invoice.status !== "POSTED"
        ) {
          throw new Error(
            "Only unpaid POSTED invoices can receive an allocation.",
          );
        }

        const balance = (
          Number(
            invoice.outstandingAmountPaise,
          ) / 100
        ).toFixed(2);

        setInvoiceRecords({
          [prefillInvoiceId]: invoice,
        });

        setForm((previous) => ({
          ...previous,
          customerId: prefillCustomerId,
          receiptLedgerId:
            previous.receiptLedgerId ||
            normalizeId(defaultLedger),
          amount: balance,
        }));

        setAllocations([
          {
            ...newAllocation(),
            salesInvoiceId:
              prefillInvoiceId,
            amount: balance,
          },
        ]);

        prefillCompletedKey.current = key;
      } catch (error) {
        if (!isCurrent()) return;

        const messages = getErrors(error);

        setErrors(messages);
        setPrefillFailed(
          prefillCompletedKey.current !== key,
        );

        toast.error(messages[0]);
      } finally {
        if (isCurrent()) {
          setPrefillLoading(false);
        }
      }
    };

    void prefill();

    return () => {
      active = false;
    };
  }, [
    loading,
    loadFailed,
    prefillCustomerId,
    prefillInvoiceId,
    receiptLedgers,
    prefillReloadKey,
  ]);

  /* ---------------------------------------------------------------- */
  /* Invoice picker: customer-scoped server search                      */
  /* ---------------------------------------------------------------- */

  const fetchUnpaidInvoiceOptions = useCallback(
    async ({ search, page, limit }) => {
      if (!form.customerId) {
        return {
          data: [],
          total: 0,
        };
      }

      const response =
        await receiptApi.getUnpaidInvoices({
          customerId: form.customerId,
          search,
          page,
          limit,
        });

      return readPage(
        response,
        "invoices",
      );
    },
    [form.customerId],
  );

  /* ---------------------------------------------------------------- */
  /* Derived values                                                    */
  /* ---------------------------------------------------------------- */

  const selectedCustomer =
    customerRecords[form.customerId] || null;

  const selectedLedger = useMemo(
    () =>
      receiptLedgers.find(
        (ledger) =>
          normalizeId(ledger) ===
          form.receiptLedgerId,
      ) || null,
    [receiptLedgers, form.receiptLedgerId],
  );

  const expectedLedgerType =
    ledgerTypeForMethod(
      form.receiptMethod,
    );

  const ledgerOptions = useMemo(
    () =>
      receiptLedgers
        .filter(
          (ledger) =>
            ledger.type ===
            expectedLedgerType,
        )
        .map((ledger) => ({
          value: normalizeId(ledger),
          label: `${ledger.name} (${ledger.code})`,
        })),
    [receiptLedgers, expectedLedgerType],
  );

  const allocationPreviews = useMemo(
    () =>
      allocations.map((allocation) => {
        const invoice =
          invoiceRecords[
            allocation.salesInvoiceId
          ];

        const amountPaise =
          toPaise(allocation.amount);

        const outstandingPaise = Number(
          invoice?.outstandingAmountPaise,
        );

        return {
          invoice,
          amountPaise,
          valid:
            Boolean(invoice) &&
            amountPaise !== null &&
            amountPaise > 0 &&
            Number.isSafeInteger(
              outstandingPaise,
            ) &&
            amountPaise <= outstandingPaise,
        };
      }),
    [allocations, invoiceRecords],
  );

  const allocatedTotal = useMemo(
    () =>
      allocationPreviews.reduce(
        (total, allocation) =>
          total +
          (allocation.amountPaise ?? 0),
        0,
      ),
    [allocationPreviews],
  );

  const receiptAmountPaise =
    toPaise(form.amount);

  const totalsMatch =
    receiptAmountPaise !== null &&
    receiptAmountPaise > 0 &&
    Number.isSafeInteger(allocatedTotal) &&
    allocatedTotal === receiptAmountPaise;

  const isDirty =
    formSnapshot(form, allocations) !==
    initialSnapshot.current;

  /* ---------------------------------------------------------------- */
  /* Form handlers                                                     */
  /* ---------------------------------------------------------------- */

  const handleFieldChange = (event) => {
    if (disabled) return;

    const { name, value } = event.target;

    setForm((previous) => {
      const next = {
        ...previous,
        [name]: value,
      };

      if (name === "receiptMethod") {
        const current =
          receiptLedgers.find(
            (ledger) =>
              normalizeId(ledger) ===
              previous.receiptLedgerId,
          );

        if (
          current?.type !==
          ledgerTypeForMethod(value)
        ) {
          next.receiptLedgerId =
            normalizeId(
              pickDefaultLedger(
                receiptLedgers,
                value,
              ),
            );
        }
      }

      return next;
    });

    setErrors([]);
  };

  const selectCustomer = (
    customerId,
    customer,
  ) => {
    if (disabled) return;

    const id = customerId
      ? String(customerId)
      : "";

    if (id && customer) {
      setCustomerRecords((previous) => ({
        ...previous,
        [id]: customer,
      }));
    }

    if (id === form.customerId) {
      return;
    }

    // A manual selection takes precedence over URL prefill.
    prefillCompletedKey.current =
      `${prefillCustomerId}:${prefillInvoiceId}`;

    setForm((previous) => ({
      ...previous,
      customerId: id,
      amount: "",
    }));

    setAllocations([newAllocation()]);
    setInvoiceRecords({});
    setPrefillFailed(false);
    setErrors([]);
  };

  const updateAllocationAmount = (
    rowId,
    value,
  ) => {
    if (disabled) return;

    setAllocations((previous) =>
      previous.map((allocation) =>
        allocation.rowId === rowId
          ? {
              ...allocation,
              amount: value,
            }
          : allocation,
      ),
    );

    setErrors([]);
  };

  const selectInvoice = (
    rowId,
    salesInvoiceId,
    invoice,
  ) => {
    if (disabled || !form.customerId) {
      return;
    }

    const id = salesInvoiceId
      ? String(salesInvoiceId)
      : "";

    if (id) {
      if (!invoice) {
        toast.error(
          "Invoice details could not be loaded.",
        );
        return;
      }

      if (
        allocations.some(
          (allocation) =>
            allocation.rowId !== rowId &&
            allocation.salesInvoiceId === id,
        )
      ) {
        toast.error(
          "This invoice is already allocated.",
        );
        return;
      }

      const balance = Number(
        invoice.outstandingAmountPaise,
      );

      if (
        !Number.isSafeInteger(balance) ||
        balance <= 0
      ) {
        toast.error(
          "Select an invoice with a positive outstanding balance.",
        );
        return;
      }

      const invoiceCustomerId =
        normalizeId(invoice.customerId);

      if (
        invoiceCustomerId &&
        invoiceCustomerId !== form.customerId
      ) {
        toast.error(
          "This invoice belongs to another customer.",
        );
        return;
      }

      if (
        invoice.status !== undefined &&
        invoice.status !== "POSTED"
      ) {
        toast.error(
          "Only unpaid POSTED invoices can be allocated.",
        );
        return;
      }

      setInvoiceRecords((previous) => ({
        ...previous,
        [id]: invoice,
      }));
    }

    setAllocations((previous) =>
      previous.map((allocation) => {
        if (allocation.rowId !== rowId) {
          return allocation;
        }

        if (
          id &&
          allocation.salesInvoiceId === id
        ) {
          return allocation;
        }

        return {
          ...allocation,
          salesInvoiceId: id,
          amount: id
            ? (
                Number(
                  invoice.outstandingAmountPaise,
                ) / 100
              ).toFixed(2)
            : "",
        };
      }),
    );

    setErrors([]);
  };

  const addAllocation = () => {
    if (
      disabled ||
      !selectedCustomer ||
      allocations.length >= MAX_ALLOCATIONS
    ) {
      return;
    }

    setAllocations((previous) => [
      ...previous,
      newAllocation(),
    ]);

    setErrors([]);
  };

  const removeAllocation = (rowId) => {
    if (disabled) return;

    setAllocations((previous) =>
      previous.filter(
        (allocation) =>
          allocation.rowId !== rowId,
      ),
    );

    setErrors([]);
  };

  /* ---------------------------------------------------------------- */
  /* Validation                                                        */
  /* ---------------------------------------------------------------- */

  const validateForm = () => {
    const messages = [];

    if (!selectedCustomer) {
      messages.push("Select a customer.");
    } else {
      if (
        selectedCustomer.isDeleted ||
        (
          selectedCustomer.status !== undefined &&
          selectedCustomer.status !== "Active"
        )
      ) {
        messages.push(
          "Select an active customer.",
        );
      }

      if (!selectedCustomer.ledgerId) {
        messages.push(
          "The selected customer has no linked accounting ledger.",
        );
      }
    }

    if (
      !selectedLedger ||
      selectedLedger.isActive === false ||
      selectedLedger.type !==
        expectedLedgerType
    ) {
      messages.push(
        `Select an active ${expectedLedgerType} account that received the payment.`,
      );
    }

    if (!validDate(form.receiptDate)) {
      messages.push(
        "A valid receipt date is required.",
      );
    }

    if (
      !RECEIPT_METHODS.some(
        (method) =>
          method.value ===
          form.receiptMethod,
      )
    ) {
      messages.push(
        "Select a valid payment method.",
      );
    }

    if (
      receiptAmountPaise === null ||
      receiptAmountPaise <= 0
    ) {
      messages.push(
        "Enter a positive receipt amount with at most two decimal places.",
      );
    }

    if (
      allocations.length < 1 ||
      allocations.length > MAX_ALLOCATIONS
    ) {
      messages.push(
        "Add between 1 and 200 invoice allocations.",
      );
    }

    const selectedIds = allocations
      .map(
        (allocation) =>
          allocation.salesInvoiceId,
      )
      .filter(Boolean);

    if (
      new Set(selectedIds).size !==
      selectedIds.length
    ) {
      messages.push(
        "A sales invoice can appear only once in a receipt.",
      );
    }

    allocations.forEach(
      (allocation, index) => {
        const preview =
          allocationPreviews[index];

        if (
          !allocation.salesInvoiceId ||
          !preview.invoice
        ) {
          messages.push(
            `Select a sales invoice for allocation ${
              index + 1
            }.`,
          );
          return;
        }

        if (!preview.valid) {
          messages.push(
            `Check the amount for allocation ${
              index + 1
            }. It must be positive and cannot exceed the invoice balance.`,
          );
        }

        const customerId =
          normalizeId(
            preview.invoice.customerId,
          );

        if (
          customerId &&
          customerId !== form.customerId
        ) {
          messages.push(
            `Allocation ${
              index + 1
            } belongs to another customer.`,
          );
        }

        if (
          preview.invoice.status !== undefined &&
          preview.invoice.status !== "POSTED"
        ) {
          messages.push(
            `Allocation ${
              index + 1
            } is not a POSTED invoice.`,
          );
        }
      },
    );

    if (!totalsMatch) {
      messages.push(
        "Allocated amounts must equal the receipt amount.",
      );
    }

    if (form.referenceNumber.trim().length > 100) {
      messages.push(
        "Reference number cannot exceed 100 characters.",
      );
    }

    if (form.notes.trim().length > 1000) {
      messages.push(
        "Notes cannot exceed 1,000 characters.",
      );
    }

    return [...new Set(messages)];
  };

  /* ---------------------------------------------------------------- */
  /* Save / exact-payload retry                                         */
  /* ---------------------------------------------------------------- */

  const saveReceipt = async () => {
    if (
      submitLock.current ||
      (
        !pendingPayload.current &&
        disabled
      )
    ) {
      return;
    }

    if (!pendingPayload.current) {
      const messages = validateForm();

      if (messages.length) {
        setErrors(messages);
        toast.error(messages[0]);

        window.scrollTo?.({
          top: 0,
          behavior: "smooth",
        });

        return;
      }

      if (!globalThis.crypto?.randomUUID) {
        setErrors([
          "UUID generation is unavailable. Use localhost or HTTPS.",
        ]);
        return;
      }

      pendingPayload.current = {
        requestId:
          globalThis.crypto.randomUUID(),

        customerId: form.customerId,
        receiptLedgerId:
          form.receiptLedgerId,
        receiptDate:
          form.receiptDate,
        receiptMethod:
          form.receiptMethod,
        referenceNumber:
          form.referenceNumber.trim(),

        amount:
          receiptAmountPaise / 100,

        allocations: allocations.map(
          (allocation) => ({
            salesInvoiceId:
              allocation.salesInvoiceId,
            amount:
              toPaise(allocation.amount) /
              100,
          }),
        ),

        notes: form.notes.trim(),
      };
    }

    submitLock.current = true;
    setSaving(true);
    setErrors([]);

    try {
      const response =
        await receiptApi.create(
          pendingPayload.current,
        );

      const receipt =
        response?.data?.receipt;

      if (!receipt?.receiptNumber) {
        throw new Error(
          "The server did not return a receipt number. Retry the same submission or verify the invoice list.",
        );
      }

      if (!mountedRef.current) return;

      toast.success(
        response?.data?.replayed
          ? `${receipt.receiptNumber} was already recorded`
          : `${receipt.receiptNumber} recorded successfully`,
      );

      navigate(routes.sales.invoices, {
        replace: true,
      });
    } catch (error) {
      if (!mountedRef.current) return;

      const status = error?.response?.status;

      const uncertain =
        !status ||
        status >= 500 ||
        status === 408;

      if (!uncertain) {
        pendingPayload.current = null;
      }

      setRetryPending(uncertain);

      const messages = getErrors(error);

      setErrors(messages);
      toast.error(messages[0]);
    } finally {
      submitLock.current = false;

      if (mountedRef.current) {
        setSaving(false);
      }
    }
  };

  const exitPage = () => {
    if (submitLock.current) return;

    const message = retryPending
      ? "The receipt result is uncertain. Verify the invoice or receipt list before creating another receipt. Leave this page?"
      : "Discard this customer receipt and leave the page?";

    if (
      (isDirty || retryPending) &&
      !window.confirm(message)
    ) {
      return;
    }

    navigate(routes.sales.invoices);
  };

  const actionButtons = (
    <>
      <Button
        type="button"
        variant="secondary"
        icon={ArrowLeft}
        disabled={saving}
        onClick={exitPage}
      >
        Exit
      </Button>

      <Button
        type="button"
        icon={Send}
        disabled={
          saving ||
          (
            !retryPending &&
            (
              disabled ||
              !totalsMatch
            )
          )
        }
        loading={saving}
        onClick={saveReceipt}
      >
        {retryPending
          ? "Retry Same Receipt"
          : "Save & Post"}
      </Button>
    </>
  );

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <div
      className={`doc-page customer-receipt-document-page ${
        keyboardOpen
          ? "is-keyboard-open"
          : ""
      }`}
    >
      <form
        noValidate
        onSubmit={(event) =>
          event.preventDefault()
        }
      >
        <header className="doc-header">
          <div className="doc-header-left">
            <Button
              type="button"
              variant="secondary"
              icon={ArrowLeft}
              disabled={saving}
              onClick={exitPage}
            >
              Exit
            </Button>

            <div className="doc-title">
              <Receipt size={18} />
              <span>
                Create Customer Receipt
              </span>
            </div>
          </div>

          <div className="doc-header-actions">
            {actionButtons}
          </div>
        </header>

        {(loading ||
          prefillLoading ||
          errors.length > 0 ||
          retryPending) && (
          <div className="doc-alerts">
            {(loading || prefillLoading) && (
              <div
                className="doc-alert"
                role="status"
              >
                {prefillLoading
                  ? "Loading the linked customer and invoice..."
                  : "Loading receipt accounts..."}
              </div>
            )}

            {retryPending && (
              <div
                className="doc-alert"
                role="status"
              >
                The previous submission may have
                reached the server. Fields are
                locked so retry uses the same
                request ID and payload. This
                retry is retained only while
                this page remains open.
              </div>
            )}

            {errors.length > 0 && (
              <div
                className="doc-alert doc-alert-error"
                role="alert"
              >
                <strong>
                  Please review the following
                </strong>

                <ul>
                  {errors.map(
                    (message, index) => (
                      <li
                        key={`${index}-${message}`}
                      >
                        {message}
                      </li>
                    ),
                  )}
                </ul>

                {loadFailed && !retryPending && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      setReloadKey(
                        (value) => value + 1,
                      )
                    }
                  >
                    Retry Account Loading
                  </Button>
                )}

                {prefillFailed &&
                  !prefillLoading &&
                  !retryPending && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        setPrefillReloadKey(
                          (value) => value + 1,
                        )
                      }
                    >
                      Retry Linked Invoice
                    </Button>
                  )}
              </div>
            )}
          </div>
        )}

        <fieldset
          className="doc-fieldset"
          disabled={disabled}
        >
          <main className="doc-main">
            <section className="doc-top">
              <div className="doc-panel doc-party-panel">
                <h2 className="doc-panel-title">
                  Received From
                </h2>

                <EntitySearchPicker
                  label="Customer"
                  placeholder="Search customer, code, phone..."
                  fetchOptions={
                    fetchCustomerOptions
                  }
                  getOptionId={
                    getCustomerOptionId
                  }
                  getOptionLabel={
                    getCustomerOptionLabel
                  }
                  getOptionSubtitle={
                    getCustomerOptionSubtitle
                  }
                  selectedIds={
                    form.customerId
                      ? [form.customerId]
                      : []
                  }
                  selectedLabel={
                    customerLabel(
                      selectedCustomer,
                    )
                  }
                  onToggle={selectCustomer}
                  multiple={false}
                  disabled={disabled}
                  pageSize={20}
                  debounceMs={350}
                  emptyMessage="No matching customers found."
                />

                {selectedCustomer && (
                  <div className="doc-party-card">
                    <div className="doc-avatar">
                      {selectedCustomer.customerName
                        ?.charAt(0)
                        .toUpperCase() || "C"}
                    </div>

                    <div className="doc-party-copy">
                      <h3>
                        {
                          selectedCustomer.customerName
                        }
                      </h3>

                      <p>
                        {
                          selectedCustomer.customerCode
                        }
                      </p>

                      <p>
                        <span>Address:</span>{" "}
                        {customerAddress(
                          selectedCustomer,
                        ) || "Not provided"}
                      </p>

                      <p>
                        <span>Phone:</span>{" "}
                        {selectedCustomer.phone ||
                          "Not provided"}
                      </p>

                      <p>
                        <span>GSTIN:</span>{" "}
                        {selectedCustomer.gstNo ||
                          "Not provided"}
                      </p>
                    </div>
                  </div>
                )}

                {!form.customerId && (
                  <p className="doc-note">
                    Select a customer to search their
                    unpaid posted sales invoices.
                  </p>
                )}
              </div>

              <div className="doc-panel">
                <h2 className="doc-panel-title">
                  Receipt Details
                </h2>

                <div className="doc-fields-grid">
                  <Input
                    label="Receipt Number"
                    name="receiptNumber"
                    value="Generated after saving"
                    readOnly
                  />

                  <Input
                    label="Receipt Date"
                    name="receiptDate"
                    type="date"
                    value={form.receiptDate}
                    onChange={handleFieldChange}
                    required
                  />

                  <Select
                    label="Received In"
                    name="receiptLedgerId"
                    value={
                      form.receiptLedgerId
                    }
                    placeholder="Select Cash / Bank account"
                    options={ledgerOptions}
                    onChange={handleFieldChange}
                    required
                  />

                  <Select
                    label="Payment Method"
                    name="receiptMethod"
                    value={
                      form.receiptMethod
                    }
                    options={
                      RECEIPT_METHODS
                    }
                    onChange={handleFieldChange}
                    required
                  />

                  <Input
                    label="Reference Number"
                    name="referenceNumber"
                    value={
                      form.referenceNumber
                    }
                    onChange={handleFieldChange}
                    placeholder="UTR, cheque number, transaction ID"
                    maxLength={100}
                  />

                  <Input
                    label="Receipt Amount (₹)"
                    name="amount"
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onChange={handleFieldChange}
                    required
                  />
                </div>
              </div>
            </section>

            <section className="doc-items">
              <div className="doc-table-wrap">
                <table className="doc-table cr-allocation-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Sales Invoice</th>
                      <th>Invoice Date</th>
                      <th>Due Date</th>
                      <th>Invoice Total</th>
                      <th>Balance</th>
                      <th>
                        Amount Received (₹)
                      </th>
                      <th>
                        <span className="doc-sr-only">
                          Remove
                        </span>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {allocations.map(
                      (allocation, index) => {
                        const preview =
                          allocationPreviews[index];

                        const invoice =
                          preview.invoice;

                        return (
                          <tr
                            key={allocation.rowId}
                          >
                            <td
                              data-label="No."
                              className="doc-cell-no"
                            >
                              {index + 1}
                            </td>

                            <td
                              data-label="Invoice"
                              className="doc-cell-item"
                            >
                              <EntitySearchPicker
                                key={`${form.customerId}-${allocation.rowId}`}
                                placeholder={
                                  form.customerId
                                    ? "Search unpaid sales invoice..."
                                    : "Select customer first"
                                }
                                fetchOptions={
                                  fetchUnpaidInvoiceOptions
                                }
                                getOptionId={
                                  getInvoiceOptionId
                                }
                                getOptionLabel={
                                  getInvoiceOptionLabel
                                }
                                getOptionSubtitle={
                                  getInvoiceOptionSubtitle
                                }
                                selectedIds={
                                  allocation.salesInvoiceId
                                    ? [
                                        allocation.salesInvoiceId,
                                      ]
                                    : []
                                }
                                selectedLabel={
                                  invoice?.invoiceNumber ||
                                  ""
                                }
                                onToggle={(
                                  invoiceId,
                                  invoiceRecord,
                                ) =>
                                  selectInvoice(
                                    allocation.rowId,
                                    invoiceId,
                                    invoiceRecord,
                                  )
                                }
                                multiple={false}
                                disabled={
                                  disabled ||
                                  !form.customerId
                                }
                                pageSize={20}
                                debounceMs={350}
                                emptyMessage="No matching unpaid invoices found."
                              />

                              {invoice && (
                                <small className="doc-item-meta">
                                  {
                                    invoice.paymentStatus
                                  }
                                </small>
                              )}
                            </td>

                            <td data-label="Invoice Date">
                              {formatDate(
                                invoice?.invoiceDate,
                              )}
                            </td>

                            <td data-label="Due Date">
                              {formatDate(
                                invoice?.dueDate,
                              )}
                            </td>

                            <td
                              data-label="Invoice Total"
                              className="doc-cell-amount"
                            >
                              {invoice
                                ? formatPaise(
                                    invoice.totalAmountPaise,
                                  )
                                : "—"}
                            </td>

                            <td
                              data-label="Balance"
                              className="doc-cell-amount"
                            >
                              {invoice
                                ? formatPaise(
                                    invoice.outstandingAmountPaise,
                                  )
                                : "—"}
                            </td>

                            <td data-label="Amount Received (₹)">
                              <Input
                                name={`amount-${allocation.rowId}`}
                                aria-label={`Amount received ${
                                  index + 1
                                }`}
                                type="number"
                                inputMode="decimal"
                                min="0.01"
                                max={
                                  invoice
                                    ? Number(
                                        invoice.outstandingAmountPaise,
                                      ) / 100
                                    : undefined
                                }
                                step="0.01"
                                value={
                                  allocation.amount
                                }
                                onChange={(event) =>
                                  updateAllocationAmount(
                                    allocation.rowId,
                                    event.target.value,
                                  )
                                }
                              />
                            </td>

                            <td
                              data-label="Remove"
                              className="doc-cell-action"
                            >
                              <button
                                type="button"
                                className="doc-remove-button"
                                aria-label={`Remove allocation ${
                                  index + 1
                                }`}
                                disabled={disabled}
                                onClick={() =>
                                  removeAllocation(
                                    allocation.rowId,
                                  )
                                }
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      },
                    )}

                    {!allocations.length && (
                      <tr>
                        <td colSpan={8}>
                          Add an invoice allocation
                          to continue.
                        </td>
                      </tr>
                    )}
                  </tbody>

                  <tfoot>
                    <tr>
                      <td
                        colSpan={6}
                        className="doc-subtotal-label"
                      >
                        Total Allocated
                      </td>

                      <td className="doc-subtotal-value">
                        {formatPaise(
                          allocatedTotal,
                        )}
                      </td>

                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="doc-add-item-row">
                <button
                  type="button"
                  className="doc-dashed-line"
                  disabled={
                    disabled ||
                    allocations.length >=
                      MAX_ALLOCATIONS ||
                    !selectedCustomer
                  }
                  onClick={addAllocation}
                >
                  <Plus size={15} />
                  Add Invoice Allocation
                </button>
              </div>
            </section>

            <section className="doc-bottom">
              <div className="doc-extras">
                <button
                  type="button"
                  className={`doc-extra-row ${
                    showNotes ? "is-open" : ""
                  }`}
                  aria-expanded={showNotes}
                  onClick={() =>
                    setShowNotes(
                      (previous) => !previous,
                    )
                  }
                >
                  <StickyNote size={16} />
                  <span>Add Notes</span>
                  <ChevronDown size={16} />
                </button>

                {showNotes && (
                  <div className="doc-extra-content">
                    <Textarea
                      name="notes"
                      value={form.notes}
                      onChange={handleFieldChange}
                      maxLength={1000}
                      rows={4}
                      placeholder="Receipt notes..."
                    />
                  </div>
                )}

                <p className="doc-note">
                  This receipt will debit the selected
                  Cash or Bank account and credit the
                  customer receivable ledger.
                </p>
              </div>

              <div className="doc-summary">
                <div className="doc-summary-row">
                  <span>Receipt Amount</span>

                  <strong>
                    {formatPaise(
                      receiptAmountPaise,
                    )}
                  </strong>
                </div>

                <div className="doc-summary-row">
                  <span>Total Allocated</span>

                  <strong>
                    {formatPaise(
                      allocatedTotal,
                    )}
                  </strong>
                </div>

                <div className="doc-summary-row">
                  <span>Difference</span>

                  <strong>
                    {formatPaise(
                      Math.abs(
                        (receiptAmountPaise ?? 0) -
                          allocatedTotal,
                      ),
                    )}
                  </strong>
                </div>

                <div
                  className={`doc-summary-total ${
                    totalsMatch
                      ? ""
                      : "is-invalid"
                  }`}
                >
                  <span>Status:</span>

                  <strong>
                    {totalsMatch
                      ? "Balanced"
                      : "Allocation mismatch"}
                  </strong>
                </div>

                <p className="doc-note">
                  Preview only. Outstanding balances
                  may change. The server validates
                  final amounts and posts the
                  accounting journal.
                </p>
              </div>
            </section>
          </main>
        </fieldset>

        <div
          className="doc-mobile-bar"
          hidden={keyboardOpen}
        >
          <div className="doc-mobile-total">
            <span>Receipt</span>

            <strong>
              {formatPaise(
                receiptAmountPaise,
              )}
            </strong>
          </div>

          <div className="doc-mobile-actions">
            {actionButtons}
          </div>
        </div>
      </form>
    </div>
  );
}

export default CustomerReceiptCreate;