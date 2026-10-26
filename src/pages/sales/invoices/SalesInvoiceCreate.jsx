// import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// import { useNavigate, useParams, useSearchParams } from "react-router-dom";

// import {
//   ArrowLeft,
//   ChevronDown,
//   FileText,
//   Plus,
//   Save,
//   Send,
//   StickyNote,
//   Trash2,
// } from "lucide-react";

// import toast from "react-hot-toast";

// import ConfirmModal from "../../../components/common/ConfirmModal/ConfirmModal";

// import api from "../../../services/api";
// import salesInvoiceApi from "../../../services/modules/salesInvoiceApi";

// import Input from "../../../components/common/Form/Input";
// import Select from "../../../components/common/Form/Select";
// import Textarea from "../../../components/common/Form/Textarea";
// import Button from "../../../components/common/Form/Button";
// import StatusField from "../../../components/common/StatusField/StatusField";
// import EwayBillPanel from "./EwayBillPanel";
// import {
//   SALES_PATHS,
//   GST_RATES,
//   TAX_OPTIONS,
//   EMPTY_TOTALS,
//   addDays,
//   calculatePreview,
//   formatPaise,
//   getErrors,
//   inputDate,
//   itemSnapshot,
//   loadAllPages,
//   localDate,
//   useTenantRevision,
// } from "./salesInvoiceUtils";

// import "../../../styles/invoice-common1.css";

// const customerApi = api.customers || api.customer;
// const productApi = api.products || api.product;
// const salesOrderApi = api.salesOrder || api.salesOrders;

// const ELIGIBLE_ORDER_STATUSES = ["CONFIRMED", "IN_PROGRESS", "COMPLETED"];

// const NUMBER_COLUMNS = [
//   {
//     field: "quantity",
//     label: "Quantity",
//     min: "0.001",
//     max: "1000000",
//     step: "0.001",
//   },
//   {
//     field: "unitRate",
//     label: "Price/Item (₹)",
//     min: "0",
//     max: "1000000000",
//     step: "0.01",
//   },
//   {
//     field: "discountPercent",
//     label: "Discount %",
//     min: "0",
//     max: "100",
//     step: "0.01",
//   },
// ];

// let rowCounter = 0;

// const newItem = () => ({
//   rowId: `sales-item-${++rowCounter}`,
//   productId: "",
//   quantity: "1",
//   unitRate: "0",
//   discountPercent: "0",
//   gstRate: 0,
// });

// const initialForm = () => {
//   const today = localDate();

//   return {
//     customerId: "",
//     invoiceDate: today,
//     dueDate: today,
//     paymentTerms: "Due on Receipt",
//     taxMode: "NONE",
//     updateStock: false,
//     notes: "",
//   };
// };

// const validDate = (value) => {
//   if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
//     return false;
//   }

//   const date = new Date(`${value}T00:00:00.000Z`);

//   return (
//     !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
//   );
// };

// const snapshot = (form, items) =>
//   JSON.stringify({
//     form,
//     items: itemSnapshot(items),
//   });

// const savedTotals = (record) => ({
//   gross: record.grossAmountPaise,
//   discount: record.discountAmountPaise,
//   taxable: record.taxableAmountPaise,
//   cgst: record.cgstAmountPaise,
//   sgst: record.sgstAmountPaise,
//   igst: record.igstAmountPaise,
//   total: record.totalAmountPaise,
// });

// const toFormItems = (record) =>
//   record.items.map((item) => ({
//     ...newItem(),
//     productId: String(item.productId),
//     quantity: String(item.quantity),
//     unitRate: String(item.unitRatePaise / 100),
//     discountPercent: String(item.discountPercent),
//     gstRate: item.gstRate,
//   }));

// const toInvoiceForm = (record) => ({
//   customerId: String(record.customerId),
//   invoiceDate: inputDate(record.invoiceDate),
//   dueDate: inputDate(record.dueDate),
//   paymentTerms: record.paymentTerms || "Due on Receipt",
//   taxMode: record.taxMode,
//   updateStock: Boolean(record.updateStock),
//   notes: record.notes || "",
// });

// const extractInvoice = (response) => {
//   const record = response?.data?.invoice;

//   if (
//     response?.data?.success !== true ||
//     !record?._id ||
//     !record.invoiceNumber ||
//     !Array.isArray(record.items)
//   ) {
//     throw new Error(
//       response?.data?.message || "The server did not return a valid invoice.",
//     );
//   }

//   return record;
// };

// function SalesInvoiceForm({ mode, invoiceNumber, sourceOrderNumber }) {
//   const navigate = useNavigate();

//   const viewing = mode === "view";
//   const editing = mode === "edit";

//   const fromOrder = mode === "create" && Boolean(sourceOrderNumber);

//   const [form, setForm] = useState(initialForm);
//   const [items, setItems] = useState(() => [newItem()]);

//   const [invoice, setInvoice] = useState(null);
//   const [sourceOrder, setSourceOrder] = useState(null);

//   const [customers, setCustomers] = useState([]);
//   const [products, setProducts] = useState([]);

//   const [loading, setLoading] = useState(true);
//   const [loadFailed, setLoadFailed] = useState(false);
//   const [reloadKey, setReloadKey] = useState(0);

//   const [errors, setErrors] = useState([]);
//   const [showNotes, setShowNotes] = useState(false);

//   const [savingAction, setSavingAction] = useState("");
//   const [confirmation, setConfirmation] = useState("");

//   const [uncertainResult, setUncertainResult] = useState(false);
//   const [savedInvoice, setSavedInvoice] = useState(null);

//   const submitLock = useRef(false);
//   const alive = useRef(false);
//   const savedRef = useRef(false);
//   const initialSnapshot = useRef("");

//   const saving = Boolean(savingAction);

//   const transactionLocked =
//     loading || loadFailed || saving || uncertainResult || Boolean(savedInvoice);

//   const formDisabled = transactionLocked || viewing || Boolean(confirmation);

//   const orderFieldsLocked = formDisabled || fromOrder;

//   const displayRecord = invoice || sourceOrder;
//   const fixedLines = viewing || fromOrder;

//   const applyInvoice = useCallback((record) => {
//     const nextForm = toInvoiceForm(record);
//     const nextItems = toFormItems(record);

//     setInvoice(record);
//     setForm(nextForm);
//     setItems(nextItems);
//     setShowNotes(Boolean(nextForm.notes));

//     initialSnapshot.current = snapshot(nextForm, nextItems);
//   }, []);

//   useEffect(() => {
//     alive.current = true;

//     return () => {
//       alive.current = false;
//     };
//   }, []);

//   useEffect(() => {
//     let cancelled = false;

//     const load = async () => {
//       setLoading(true);
//       setLoadFailed(false);
//       setErrors([]);

//       try {
//         if (!["create", "edit", "view"].includes(mode)) {
//           throw new Error("Invalid invoice page mode.");
//         }

//         let loadedInvoice = null;
//         let loadedOrder = null;
//         let customerRecords = [];
//         let productRecords = [];

//         if (viewing || editing) {
//           if (!invoiceNumber) {
//             throw new Error("Invoice number is missing.");
//           }

//           const response = await salesInvoiceApi.getByNumber(invoiceNumber);

//           loadedInvoice = extractInvoice(response);

//           if (editing && loadedInvoice.status !== "CREATED") {
//             throw new Error("Only created sales invoices can be edited.");
//           }

//           if (editing && loadedInvoice.sourceSalesOrderId) {
//             throw new Error(
//               "Order-linked invoices cannot be edited directly. Delete the created invoice and recreate it from the Sales Order.",
//             );
//           }

//           if (editing) {
//             [customerRecords, productRecords] = await Promise.all([
//               loadAllPages(customerApi, "customers"),
//               loadAllPages(productApi, "products"),
//             ]);
//           }
//         } else if (fromOrder) {
//           if (typeof salesOrderApi?.getOrder !== "function") {
//             throw new Error("Configure the Sales Order getOrder API.");
//           }

//           const response = await salesOrderApi.getOrder(sourceOrderNumber);

//           loadedOrder = response?.data?.data;

//           if (
//             response?.data?.success !== true ||
//             !loadedOrder?._id ||
//             !Array.isArray(loadedOrder.items) ||
//             !loadedOrder.items.length
//           ) {
//             throw new Error(
//               response?.data?.message || "Unable to load the Sales Order.",
//             );
//           }

//           if (!ELIGIBLE_ORDER_STATUSES.includes(loadedOrder.status)) {
//             throw new Error(
//               "Confirm the Sales Order before creating an invoice.",
//             );
//           }

//           if (!Number.isSafeInteger(loadedOrder.__v) || loadedOrder.__v < 0) {
//             throw new Error(
//               "Sales Order version is missing. Refresh the order.",
//             );
//           }
//         } else {
//           [customerRecords, productRecords] = await Promise.all([
//             loadAllPages(customerApi, "customers"),
//             loadAllPages(productApi, "products"),
//           ]);
//         }

//         if (cancelled) return;

//         setCustomers(
//           customerRecords.filter(
//             (customer) => customer.status === "Active" && !customer.isDeleted,
//           ),
//         );

//         setProducts(
//           productRecords.filter(
//             (product) => product.status === "ACTIVE" && !product.isDeleted,
//           ),
//         );

//         setSourceOrder(loadedOrder);

//         if (loadedInvoice) {
//           applyInvoice(loadedInvoice);

//           if (loadedInvoice.status === "POSTED") {
//             setUncertainResult(false);
//           }
//         } else {
//           const today = localDate();

//           const sourceDate = loadedOrder
//             ? inputDate(loadedOrder.orderDate)
//             : "";

//           const invoiceDate = sourceDate > today ? sourceDate : today;

//           const nextForm = loadedOrder
//             ? {
//                 customerId: String(loadedOrder.customerId),
//                 invoiceDate,
//                 dueDate: invoiceDate,
//                 paymentTerms: loadedOrder.paymentTerms || "Due on Receipt",
//                 taxMode: loadedOrder.taxMode,
//                 updateStock: false,
//                 notes: loadedOrder.notes || "",
//               }
//             : initialForm();

//           const nextItems = loadedOrder
//             ? toFormItems(loadedOrder)
//             : [newItem()];

//           setInvoice(null);
//           setForm(nextForm);
//           setItems(nextItems);
//           setShowNotes(Boolean(nextForm.notes));

//           initialSnapshot.current = snapshot(nextForm, nextItems);
//         }
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

//     void load();

//     return () => {
//       cancelled = true;
//     };
//   }, [
//     mode,
//     viewing,
//     editing,
//     fromOrder,
//     invoiceNumber,
//     sourceOrderNumber,
//     reloadKey,
//     applyInvoice,
//   ]);

//   const selectedCustomer = useMemo(() => {
//     if (fixedLines && displayRecord) {
//       return {
//         _id: String(displayRecord.customerId),
//         customerName: displayRecord.customerName,
//         customerCode: displayRecord.customerCode,
//         gstNo: displayRecord.customerGstNo,
//         billingAddress: displayRecord.billingAddress,
//         shippingAddress: displayRecord.shippingAddress,
//       };
//     }

//     return (
//       customers.find((customer) => String(customer._id) === form.customerId) ||
//       null
//     );
//   }, [customers, form.customerId, fixedLines, displayRecord]);

//   const customerOptions = useMemo(() => {
//     if (fixedLines && selectedCustomer) {
//       return [
//         {
//           value: selectedCustomer._id,
//           label:
//             `${selectedCustomer.customerName} ` +
//             `(${selectedCustomer.customerCode})`,
//         },
//       ];
//     }

//     const options = customers.map((customer) => ({
//       value: String(customer._id),
//       label: `${customer.customerName} ` + `(${customer.customerCode})`,
//     }));

//     if (
//       invoice &&
//       !options.some((option) => option.value === String(invoice.customerId))
//     ) {
//       options.unshift({
//         value: String(invoice.customerId),
//         label:
//           `${invoice.customerName} ` +
//           `(${invoice.customerCode}) — unavailable`,
//       });
//     }

//     return options;
//   }, [customers, invoice, fixedLines, selectedCustomer]);

//   const productMap = useMemo(
//     () => new Map(products.map((product) => [String(product._id), product])),
//     [products],
//   );

//   const previews = useMemo(
//     () =>
//       items.map((item, index) => {
//         if (fixedLines && displayRecord?.items[index]) {
//           return {
//             valid: true,
//             ...savedTotals(displayRecord.items[index]),
//           };
//         }

//         return calculatePreview(item, form.taxMode);
//       }),
//     [items, form.taxMode, fixedLines, displayRecord],
//   );

//   const totals = useMemo(() => {
//     if (fixedLines && displayRecord) {
//       return savedTotals(displayRecord);
//     }

//     return previews.reduce(
//       (result, preview) => {
//         const next = { ...result };

//         for (const key of Object.keys(EMPTY_TOTALS)) {
//           next[key] += preview[key];
//         }

//         return next;
//       },
//       { ...EMPTY_TOTALS },
//     );
//   }, [previews, fixedLines, displayRecord]);

//   const isDirty =
//     !loading &&
//     !viewing &&
//     Boolean(initialSnapshot.current) &&
//     snapshot(form, items) !== initialSnapshot.current;

//   useEffect(() => {
//     const beforeUnload = (event) => {
//       if (savedRef.current) return;

//       if (!isDirty && !saving && !uncertainResult) {
//         return;
//       }

//       event.preventDefault();
//       event.returnValue = "";
//     };

//     window.addEventListener("beforeunload", beforeUnload);

//     return () => {
//       window.removeEventListener("beforeunload", beforeUnload);
//     };
//   }, [isDirty, saving, uncertainResult]);

//   const handleFieldChange = (event) => {
//     const { name, value } = event.target;

//     if (formDisabled) return;

//     if (fromOrder && !["invoiceDate", "dueDate"].includes(name)) {
//       return;
//     }

//     setForm((previous) => ({
//       ...previous,
//       [name]: value,
//     }));

//     setErrors([]);
//   };

//   const handleCustomerChange = (event) => {
//     if (formDisabled || fromOrder) return;

//     const customer = customers.find(
//       (record) => String(record._id) === event.target.value,
//     );

//     setForm((previous) => ({
//       ...previous,

//       customerId: customer ? String(customer._id) : "",

//       paymentTerms: customer?.paymentTerms || "Due on Receipt",

//       dueDate: addDays(previous.invoiceDate, customer?.creditDays || 0),
//     }));

//     setErrors([]);
//   };

//   const handleTaxModeChange = (event) => {
//     if (formDisabled || fromOrder) return;

//     const taxMode = event.target.value;

//     setForm((previous) => ({
//       ...previous,
//       taxMode,
//     }));

//     setItems((previous) =>
//       previous.map((item) => ({
//         ...item,

//         gstRate:
//           taxMode === "NONE"
//             ? 0
//             : (productMap.get(item.productId)?.gstRate ?? 0),
//       })),
//     );

//     setErrors([]);
//   };

//   const updateItem = (rowId, field, value) => {
//     if (formDisabled || fixedLines) return;

//     setItems((previous) =>
//       previous.map((item) =>
//         item.rowId === rowId ? { ...item, [field]: value } : item,
//       ),
//     );

//     setErrors([]);
//   };

//   const selectProduct = (rowId, productId) => {
//     if (formDisabled || fixedLines) return;

//     const product = productMap.get(productId);

//     setItems((previous) =>
//       previous.map((item) =>
//         item.rowId === rowId
//           ? {
//               ...item,
//               productId,
//               unitRate: String(product?.salePrice ?? 0),

//               gstRate: form.taxMode === "NONE" ? 0 : (product?.gstRate ?? 0),
//             }
//           : item,
//       ),
//     );

//     setErrors([]);
//   };

//   const validateForm = (action) => {
//     const messages = [];

//     if (!validDate(form.invoiceDate) || !validDate(form.dueDate)) {
//       messages.push("Valid invoice and due dates are required.");
//     } else if (form.dueDate < form.invoiceDate) {
//       messages.push("Due date cannot be before invoice date.");
//     }

//     if (fromOrder) {
//       if (
//         !sourceOrder?._id ||
//         !Number.isSafeInteger(sourceOrder.__v) ||
//         sourceOrder.__v < 0
//       ) {
//         messages.push("Reload the Sales Order before creating the invoice.");
//       }

//       if (sourceOrder && form.invoiceDate < inputDate(sourceOrder.orderDate)) {
//         messages.push("Invoice date cannot be before the Sales Order date.");
//       }

//       if (action !== "SAVE_CREATED") {
//         messages.push("Create the invoice first, then post it separately.");
//       }

//       return messages;
//     }

//     if (
//       !customers.some((customer) => String(customer._id) === form.customerId)
//     ) {
//       messages.push("Select an active customer.");
//     }

//     if (!form.paymentTerms.trim()) {
//       messages.push("Payment terms are required.");
//     }

//     if (
//       form.paymentTerms.trim().length > 100 ||
//       form.notes.trim().length > 1000
//     ) {
//       messages.push("Payment terms or notes exceed the allowed length.");
//     }

//     if (!TAX_OPTIONS.some((option) => option.value === form.taxMode)) {
//       messages.push("Select a valid tax treatment.");
//     }

//     if (!items.length || items.length > 200) {
//       messages.push("Add between 1 and 200 items.");
//     }

//     const ids = items.map((item) => item.productId).filter(Boolean);

//     if (new Set(ids).size !== ids.length) {
//       messages.push("A product can appear only once in a direct invoice.");
//     }

//     items.forEach((item, index) => {
//       if (!productMap.has(item.productId)) {
//         messages.push(`Select an active product for item ${index + 1}.`);
//       } else if (!previews[index]?.valid) {
//         messages.push(
//           `Check quantity, rate, discount, and GST for item ${index + 1}.`,
//         );
//       }
//     });

//     if (
//       Object.values(totals).some(
//         (amount) => !Number.isSafeInteger(amount) || amount < 0,
//       )
//     ) {
//       messages.push("Invoice amounts exceed the supported range.");
//     }

//     if (action === "SAVE_AND_POST" && totals.total <= 0) {
//       messages.push("A posted invoice must have a positive total.");
//     }

//     return messages;
//   };

//   const saveInvoice = async (action, postingConfirmed = false) => {
//     if (
//       transactionLocked ||
//       viewing ||
//       submitLock.current ||
//       savedRef.current ||
//       (confirmation && !postingConfirmed)
//     ) {
//       return;
//     }

//     const messages = validateForm(action);

//     if (messages.length) {
//       setErrors(messages);
//       toast.error(messages[0]);
//       setConfirmation("");
//       return;
//     }

//     if (action === "SAVE_AND_POST" && !postingConfirmed) {
//       setConfirmation("post");
//       return;
//     }

//     submitLock.current = true;
//     setSavingAction(action);
//     setErrors([]);

//     let writeStarted = false;

//     try {
//       let response;

//       if (fromOrder) {
//         const latestResponse = await salesOrderApi.getOrder(
//           sourceOrder.orderNumber,
//         );

//         const latest = latestResponse?.data?.data;

//         if (latestResponse?.data?.success !== true || !latest?._id) {
//           throw new Error("Unable to verify the Sales Order.");
//         }

//         if (
//           latest.__v !== sourceOrder.__v ||
//           latest.status !== sourceOrder.status
//         ) {
//           throw new Error(
//             "The Sales Order changed. Reload it and review before creating the invoice.",
//           );
//         }

//         writeStarted = true;

//         response = await salesInvoiceApi.createFromSalesOrder(
//           sourceOrder.orderNumber,
//           {
//             version: sourceOrder.__v,
//             invoiceDate: form.invoiceDate,
//             dueDate: form.dueDate,
//           },
//         );
//       } else {
//         const payload = {
//           customerId: form.customerId,
//           invoiceDate: form.invoiceDate,
//           dueDate: form.dueDate,
//           paymentTerms: form.paymentTerms.trim(),
//           taxMode: form.taxMode,
//           updateStock: form.updateStock,

//           items: items.map((item) => ({
//             productId: item.productId,
//             quantity: Number(item.quantity),
//             unitRate: Number(item.unitRate),
//             discountPercent: Number(item.discountPercent),

//             gstRate: form.taxMode === "NONE" ? 0 : Number(item.gstRate),
//           })),

//           notes: form.notes.trim(),
//         };

//         writeStarted = true;

//         response = editing
//           ? await salesInvoiceApi.update(invoiceNumber, payload)
//           : await salesInvoiceApi.create({
//               ...payload,
//               action,
//             });
//       }

//       let saved;

//       try {
//         saved = extractInvoice(response);
//       } catch (error) {
//         error.uncertain = true;
//         throw error;
//       }

//       savedRef.current = true;

//       if (!alive.current) return;

//       setSavedInvoice(saved);
//       setConfirmation("");

//       toast.success(
//         saved.status === "POSTED"
//           ? `${saved.invoiceNumber} created and posted successfully`
//           : editing
//             ? `${saved.invoiceNumber} updated successfully`
//             : `${saved.invoiceNumber} created successfully`,
//       );

//       navigate(SALES_PATHS.view(saved.invoiceNumber), { replace: true });
//     } catch (error) {
//       if (!alive.current) return;

//       const status = error?.response?.status;

//       if (
//         !savedRef.current &&
//         writeStarted &&
//         (error.uncertain || !status || status >= 500 || status === 408)
//       ) {
//         setUncertainResult(true);
//       }

//       const messages = getErrors(error);

//       setErrors(messages);
//       setConfirmation("");
//       toast.error(messages[0]);
//     } finally {
//       submitLock.current = false;

//       if (alive.current) {
//         setSavingAction("");
//       }
//     }
//   };

//   /* ==========================================
//      POST AN EXISTING CREATED INVOICE
//      ========================================== */

//   const postExistingInvoice = async () => {
//     if (
//       submitLock.current ||
//       saving ||
//       uncertainResult ||
//       !viewing ||
//       invoice?.status !== "CREATED"
//     ) {
//       return;
//     }

//     const original = invoice;

//     submitLock.current = true;
//     setSavingAction("POST_EXISTING");
//     setErrors([]);

//     let postStarted = false;

//     try {
//       /*
//        * Check that the invoice being reviewed has not
//        * changed before sending the posting request.
//        * Backend validation remains authoritative.
//        */
//       const latestResponse = await salesInvoiceApi.getByNumber(
//         original.invoiceNumber,
//       );

//       const latest = extractInvoice(latestResponse);

//       if (!alive.current) return;

//       if (latest.status === "POSTED") {
//         applyInvoice(latest);
//         setConfirmation("");

//         toast.success(`${latest.invoiceNumber} is already posted.`);

//         return;
//       }

//       if (latest.status !== "CREATED") {
//         applyInvoice(latest);

//         throw new Error("This invoice is no longer available for posting.");
//       }

//       if (latest.__v !== original.__v) {
//         applyInvoice(latest);

//         throw new Error(
//           "This invoice changed. Review the refreshed details before posting.",
//         );
//       }

//       postStarted = true;

//       const response = await salesInvoiceApi.post(original.invoiceNumber);

//       let posted;

//       try {
//         posted = extractInvoice(response);

//         if (posted.status !== "POSTED") {
//           throw new Error("The server did not return a posted invoice.");
//         }
//       } catch (error) {
//         error.uncertain = true;
//         throw error;
//       }

//       if (!alive.current) return;

//       applyInvoice(posted);
//       setConfirmation("");
//       setUncertainResult(false);

//       toast.success(
//         response.data.message || `${posted.invoiceNumber} posted successfully`,
//       );
//     } catch (error) {
//       if (!alive.current) return;

//       const status = error?.response?.status;

//       const unknownResult =
//         postStarted &&
//         (error.uncertain || !status || status >= 500 || status === 408);

//       setConfirmation("");

//       if (postStarted) {
//         try {
//           const response = await salesInvoiceApi.getByNumber(
//             original.invoiceNumber,
//           );

//           const latest = extractInvoice(response);

//           if (!alive.current) return;

//           applyInvoice(latest);

//           if (latest.status === "POSTED") {
//             setErrors([]);
//             setUncertainResult(false);

//             toast.success(`${latest.invoiceNumber} is posted.`);

//             return;
//           }
//         } catch {
//           // Preserve the original posting error.
//         }
//       }

//       if (!alive.current) return;

//       setUncertainResult(Boolean(unknownResult));

//       const messages = getErrors(error);

//       setErrors(messages);
//       toast.error(messages[0]);
//     } finally {
//       submitLock.current = false;

//       if (alive.current) {
//         setSavingAction("");
//         setConfirmation("");
//       }
//     }
//   };

//   const exitPage = () => {
//     if (saving || submitLock.current) {
//       return;
//     }

//     if (savedRef.current) {
//       navigate(SALES_PATHS.list);
//       return;
//     }

//     if (isDirty || uncertainResult) {
//       setConfirmation("exit");
//       return;
//     }

//     navigate(SALES_PATHS.list);
//   };

//   const closeConfirmation = useCallback(() => {
//     if (submitLock.current) return;

//     setConfirmation("");
//   }, []);

//   const handleConfirmation = () => {
//     if (saving || submitLock.current) return;

//     if (confirmation === "post-existing") {
//       void postExistingInvoice();
//       return;
//     }

//     if (confirmation === "post") {
//       void saveInvoice("SAVE_AND_POST", true);

//       return;
//     }

//     if (confirmation === "exit") {
//       setConfirmation("");
//       navigate(SALES_PATHS.list);
//     }
//   };

//   /* ==========================================
//      HEADER / MOBILE ACTIONS
//      ========================================== */

//   const actionButtons = viewing ? (
//     invoice?.status === "CREATED" ? (
//       <>
//         {!invoice.sourceSalesOrderId && (
//           <Button
//             type="button"
//             variant="secondary"
//             icon={Save}
//             disabled={
//               loading ||
//               loadFailed ||
//               saving ||
//               uncertainResult ||
//               Boolean(confirmation)
//             }
//             onClick={() => navigate(SALES_PATHS.edit(invoice.invoiceNumber))}
//           >
//             Edit Invoice
//           </Button>
//         )}

//         <Button
//           type="button"
//           icon={Send}
//           disabled={
//             loading ||
//             loadFailed ||
//             saving ||
//             uncertainResult ||
//             Boolean(confirmation)
//           }
//           loading={savingAction === "POST_EXISTING"}
//           onClick={() => {
//             setErrors([]);
//             setConfirmation("post-existing");
//           }}
//         >
//           Post Invoice
//         </Button>
//       </>
//     ) : null
//   ) : (
//     <>
//       <Button
//         type="button"
//         variant="secondary"
//         icon={Save}
//         disabled={formDisabled}
//         loading={savingAction === "SAVE_CREATED"}
//         onClick={() => void saveInvoice("SAVE_CREATED")}
//       >
//         {editing ? "Save Changes" : "Create Invoice"}
//       </Button>

//       {!editing && !fromOrder && (
//         <Button
//           type="button"
//           icon={Send}
//           disabled={formDisabled}
//           loading={savingAction === "SAVE_AND_POST"}
//           onClick={() => void saveInvoice("SAVE_AND_POST")}
//         >
//           Create & Post
//         </Button>
//       )}
//     </>
//   );

//   const address = selectedCustomer
//     ? fixedLines
//       ? selectedCustomer.billingAddress || ""
//       : [
//           selectedCustomer.billingAddress,
//           selectedCustomer.city,
//           selectedCustomer.state,
//           selectedCustomer.pincode,
//           selectedCustomer.country,
//         ]
//           .filter((value) => typeof value === "string" && value.trim())
//           .join(", ")
//     : "";

//   const sourceNumber =
//     sourceOrder?.orderNumber || invoice?.sourceSalesOrderNumber || "";

//   const isPostingConfirmation =
//     confirmation === "post" || confirmation === "post-existing";

//   const postingUpdatesStock =
//     confirmation === "post-existing"
//       ? Boolean(invoice?.updateStock)
//       : Boolean(form.updateStock);

//   const confirmationTitle = isPostingConfirmation
//     ? "Post sales invoice?"
//     : uncertainResult
//       ? "Check invoice status?"
//       : "Discard invoice changes?";

//   const confirmationMessage = isPostingConfirmation
//     ? postingUpdatesStock
//       ? "This creates accounting entries and deducts inventory-tracked goods. Do not continue if the same goods have already been deducted through a Delivery Note."
//       : "This creates accounting entries without deducting stock. The invoice becomes Posted and can no longer be edited or deleted."
//     : uncertainResult
//       ? "The previous request may already have completed. Open Sales Invoices and verify the result before trying again."
//       : "Your unsaved changes will be lost. Leave this page?";

//   return (
//     <div className="doc-page">
//       <form noValidate onSubmit={(event) => event.preventDefault()}>
//         <header className="doc-header">
//           <div className="doc-header-left">
//             <Button
//               type="button"
//               variant="secondary"
//               icon={ArrowLeft}
//               disabled={saving || Boolean(confirmation)}
//               onClick={exitPage}
//             >
//               Exit
//             </Button>

//             <div className="doc-title">
//               <FileText size={18} />

//               <span>
//                 {viewing
//                   ? `Sales Invoice ${invoiceNumber}`
//                   : editing
//                     ? `Edit Sales Invoice ${invoiceNumber}`
//                     : fromOrder
//                       ? `Create Invoice · ${sourceOrderNumber}`
//                       : "Create Sales Invoice"}
//               </span>
//             </div>
//           </div>

//           <div className="doc-header-actions">{actionButtons}</div>
//         </header>

//         {(loading || errors.length > 0 || uncertainResult || savedInvoice) && (
//           <div className="doc-alerts">
//             {loading && (
//               <div className="doc-alert" role="status">
//                 {fromOrder
//                   ? "Loading Sales Order..."
//                   : viewing
//                     ? "Loading sales invoice..."
//                     : "Loading invoice details and options..."}
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
//                     type="button"
//                     variant="secondary"
//                     disabled={saving}
//                     onClick={() => setReloadKey((value) => value + 1)}
//                   >
//                     Retry Loading
//                   </Button>
//                 )}

//                 {fromOrder &&
//                   !loadFailed &&
//                   !uncertainResult &&
//                   !savedInvoice && (
//                     <Button
//                       type="button"
//                       variant="secondary"
//                       disabled={saving}
//                       onClick={() => setReloadKey((value) => value + 1)}
//                     >
//                       Reload Sales Order
//                     </Button>
//                   )}
//               </div>
//             )}

//             {uncertainResult && (
//               <div className="doc-alert" role="alert">
//                 <p>
//                   The request result is uncertain. Further submission is locked.
//                   Check the invoice list before trying again.
//                 </p>

//                 <Button
//                   type="button"
//                   variant="secondary"
//                   disabled={saving || Boolean(confirmation)}
//                   onClick={exitPage}
//                 >
//                   Check Sales Invoices
//                 </Button>
//               </div>
//             )}

//             {savedInvoice && (
//               <div className="doc-alert" role="status">
//                 <p>{savedInvoice.invoiceNumber} was saved successfully.</p>

//                 <Button
//                   type="button"
//                   variant="secondary"
//                   onClick={() =>
//                     navigate(SALES_PATHS.view(savedInvoice.invoiceNumber), {
//                       replace: true,
//                     })
//                   }
//                 >
//                   Open Invoice
//                 </Button>
//               </div>
//             )}
//           </div>
//         )}

//         {(invoice || sourceNumber) && (
//           <div className="doc-alerts">
//             <div className="doc-alert">
//               {invoice && <StatusField value={invoice.status} />}

//               {invoice?.status === "POSTED" && (
//                 <>
//                   {" "}
//                   <StatusField value={invoice.paymentStatus} />
//                 </>
//               )}

//               {sourceNumber && (
//                 <p>
//                   Source Sales Order: <strong>{sourceNumber}</strong>
//                 </p>
//               )}

//               {fromOrder && (
//                 <p>
//                   Customer, products, quantities, prices, and tax treatment come
//                   from the saved Sales Order. Enter invoice dates to continue.
//                 </p>
//               )}

//               {viewing && invoice?.status === "CREATED" && (
//                 <p>
//                   This invoice is created but not posted. Use Post Invoice to
//                   create its accounting entry.
//                 </p>
//               )}
//             </div>
//           </div>
//         )}

//         <fieldset className="doc-fieldset" disabled={formDisabled}>
//           <main className="doc-main">
//             <section className="doc-top">
//               <div className="doc-panel doc-party-panel">
//                 <h2 className="doc-panel-title">Bill To</h2>

//                 <Select
//                   label="Customer"
//                   name="customerId"
//                   value={form.customerId}
//                   placeholder="Select customer"
//                   options={customerOptions}
//                   disabled={orderFieldsLocked}
//                   onChange={handleCustomerChange}
//                   required
//                 />

//                 {selectedCustomer && (
//                   <div className="doc-party-card">
//                     <div className="doc-avatar">
//                       {selectedCustomer.customerName?.charAt(0).toUpperCase() ||
//                         "C"}
//                     </div>

//                     <div className="doc-party-copy">
//                       <h3>{selectedCustomer.customerName}</h3>

//                       <p>{selectedCustomer.customerCode}</p>

//                       <p>
//                         <span>Address:</span> {address || "Not provided"}
//                       </p>

//                       {fixedLines && selectedCustomer.shippingAddress && (
//                         <p>
//                           <span>Shipping:</span>{" "}
//                           {selectedCustomer.shippingAddress}
//                         </p>
//                       )}

//                       <p>
//                         <span>GSTIN:</span>{" "}
//                         {selectedCustomer.gstNo || "Not provided"}
//                       </p>

//                       {!fixedLines && (
//                         <p>
//                           <span>Phone:</span>{" "}
//                           {selectedCustomer.phone || "Not provided"}
//                         </p>
//                       )}
//                     </div>
//                   </div>
//                 )}
//               </div>

//               <div className="doc-panel">
//                 <h2 className="doc-panel-title">Invoice Details</h2>

//                 <div className="doc-fields-grid">
//                   <Input
//                     label="Invoice Number"
//                     name="invoiceNumber"
//                     value={invoice?.invoiceNumber || "Generated after saving"}
//                     readOnly
//                   />

//                   {sourceNumber && (
//                     <Input
//                       label="Sales Order"
//                       name="sourceSalesOrderNumber"
//                       value={sourceNumber}
//                       readOnly
//                     />
//                   )}

//                   <Input
//                     label="Invoice Date"
//                     name="invoiceDate"
//                     type="date"
//                     value={form.invoiceDate}
//                     min={
//                       fromOrder && sourceOrder
//                         ? inputDate(sourceOrder.orderDate)
//                         : undefined
//                     }
//                     onChange={handleFieldChange}
//                     required
//                   />

//                   <Input
//                     label="Due Date"
//                     name="dueDate"
//                     type="date"
//                     value={form.dueDate}
//                     min={form.invoiceDate}
//                     onChange={handleFieldChange}
//                     required
//                   />

//                   <Input
//                     label="Payment Terms"
//                     name="paymentTerms"
//                     value={form.paymentTerms}
//                     readOnly={fromOrder}
//                     onChange={handleFieldChange}
//                     maxLength={100}
//                     required
//                   />

//                   <Select
//                     label="Tax Treatment"
//                     name="taxMode"
//                     value={form.taxMode}
//                     options={TAX_OPTIONS}
//                     disabled={orderFieldsLocked}
//                     onChange={handleTaxModeChange}
//                   />
//                 </div>

//                 {fromOrder || invoice?.sourceSalesOrderId ? (
//                   <p className="doc-note">
//                     This invoice does not deduct stock. Record goods dispatch
//                     through Delivery Notes.
//                   </p>
//                 ) : (
//                   <label className="doc-check">
//                     <input
//                       type="checkbox"
//                       checked={form.updateStock}
//                       onChange={(event) => {
//                         const checked = event.target.checked;

//                         setForm((previous) => ({
//                           ...previous,
//                           updateStock: checked,
//                         }));
//                       }}
//                     />

//                     <span>
//                       Deduct inventory-tracked goods when posting
//                       <small>
//                         Do not select this if the same goods have already been
//                         deducted through a Delivery Note.
//                       </small>
//                     </span>
//                   </label>
//                 )}
//               </div>
//             </section>

//             <section className="doc-items">
//               <div className="doc-table-wrap">
//                 <table className="doc-table">
//                   <thead>
//                     <tr>
//                       <th>No</th>
//                       <th>Items</th>
//                       <th>HSN / SAC</th>
//                       <th>Qty</th>
//                       <th>Price/Item (₹)</th>
//                       <th>Discount %</th>
//                       <th>GST</th>
//                       <th>Amount</th>
//                       <th>
//                         <span className="doc-sr-only">Remove</span>
//                       </th>
//                     </tr>
//                   </thead>

//                   <tbody>
//                     {items.map((item, index) => {
//                       const savedItem = fixedLines
//                         ? displayRecord?.items[index]
//                         : null;

//                       const product = productMap.get(item.productId);

//                       const options = products
//                         .filter(
//                           (record) =>
//                             String(record._id) === item.productId ||
//                             !items.some(
//                               (other) => other.productId === String(record._id),
//                             ),
//                         )
//                         .map((record) => ({
//                           value: String(record._id),
//                           label: `${record.name} ` + `(${record.productCode})`,
//                         }));

//                       if (
//                         !fixedLines &&
//                         item.productId &&
//                         !options.some(
//                           (option) => option.value === item.productId,
//                         )
//                       ) {
//                         const original = invoice?.items.find(
//                           (record) =>
//                             String(record.productId) === item.productId,
//                         );

//                         options.unshift({
//                           value: item.productId,
//                           label: original
//                             ? `${original.productName} (unavailable)`
//                             : "Unavailable product",
//                         });
//                       }

//                       return (
//                         <tr key={item.rowId}>
//                           <td data-label="No." className="doc-cell-no">
//                             {index + 1}
//                           </td>

//                           <td data-label="Item" className="doc-cell-item">
//                             {fixedLines ? (
//                               <div>
//                                 <strong>{savedItem?.productName}</strong>

//                                 <small className="doc-item-meta">
//                                   {savedItem?.productCode}
//                                   {" · "}
//                                   {savedItem?.unit}
//                                 </small>

//                                 {savedItem?.specification && (
//                                   <p className="doc-note">
//                                     {savedItem.specification}
//                                   </p>
//                                 )}
//                               </div>
//                             ) : (
//                               <>
//                                 <Select
//                                   name={`product-${item.rowId}`}
//                                   aria-label={`Product ${index + 1}`}
//                                   value={item.productId}
//                                   placeholder="Select product"
//                                   options={options}
//                                   onChange={(event) =>
//                                     selectProduct(
//                                       item.rowId,
//                                       event.target.value,
//                                     )
//                                   }
//                                 />

//                                 {product && (
//                                   <small className="doc-item-meta">
//                                     {product.unit}
//                                     {" · "}
//                                     {product.type}
//                                     {product.trackInventory
//                                       ? " · Stock tracked"
//                                       : ""}
//                                   </small>
//                                 )}
//                               </>
//                             )}
//                           </td>

//                           <td data-label="HSN / SAC" className="doc-cell-hsn">
//                             {savedItem?.hsnSacCode ||
//                               product?.hsnSacCode ||
//                               "—"}
//                           </td>

//                           {NUMBER_COLUMNS.map((column) => (
//                             <td key={column.field} data-label={column.label}>
//                               {fixedLines ? (
//                                 column.field === "unitRate" ? (
//                                   formatPaise(savedItem?.unitRatePaise)
//                                 ) : (
//                                   item[column.field]
//                                 )
//                               ) : (
//                                 <Input
//                                   name={`${column.field}-${item.rowId}`}
//                                   aria-label={`${column.label} ${index + 1}`}
//                                   type="number"
//                                   inputMode="decimal"
//                                   min={column.min}
//                                   max={column.max}
//                                   step={column.step}
//                                   value={item[column.field]}
//                                   onChange={(event) =>
//                                     updateItem(
//                                       item.rowId,
//                                       column.field,
//                                       event.target.value,
//                                     )
//                                   }
//                                 />
//                               )}
//                             </td>
//                           ))}

//                           <td data-label="GST">
//                             {fixedLines ? (
//                               `${item.gstRate}%`
//                             ) : (
//                               <Select
//                                 name={`gst-${item.rowId}`}
//                                 aria-label={`GST ${index + 1}`}
//                                 value={item.gstRate}
//                                 disabled={
//                                   formDisabled || form.taxMode === "NONE"
//                                 }
//                                 options={GST_RATES.map((rate) => ({
//                                   value: rate,
//                                   label: `${rate}%`,
//                                 }))}
//                                 onChange={(event) =>
//                                   updateItem(
//                                     item.rowId,
//                                     "gstRate",
//                                     Number(event.target.value),
//                                   )
//                                 }
//                               />
//                             )}
//                           </td>

//                           <td data-label="Amount" className="doc-cell-amount">
//                             {previews[index]?.valid
//                               ? formatPaise(previews[index].total)
//                               : "—"}
//                           </td>

//                           <td data-label="Remove" className="doc-cell-action">
//                             {!fixedLines && (
//                               <button
//                                 type="button"
//                                 className="doc-remove-button"
//                                 aria-label={`Remove item ${index + 1}`}
//                                 disabled={items.length === 1}
//                                 onClick={() => {
//                                   setItems((previous) =>
//                                     previous.filter(
//                                       (record) => record.rowId !== item.rowId,
//                                     ),
//                                   );

//                                   setErrors([]);
//                                 }}
//                               >
//                                 <Trash2 size={16} />
//                               </button>
//                             )}
//                           </td>
//                         </tr>
//                       );
//                     })}
//                   </tbody>

//                   <tfoot>
//                     <tr>
//                       <td colSpan={5} className="doc-subtotal-label">
//                         Subtotal
//                       </td>

//                       <td className="doc-subtotal-value">
//                         {formatPaise(totals.discount)}
//                       </td>

//                       <td className="doc-subtotal-value">
//                         {formatPaise(totals.cgst + totals.sgst + totals.igst)}
//                       </td>

//                       <td className="doc-subtotal-value">
//                         {formatPaise(totals.total)}
//                       </td>

//                       <td />
//                     </tr>
//                   </tfoot>
//                 </table>
//               </div>

//               {!fixedLines && (
//                 <div className="doc-add-item-row">
//                   <button
//                     type="button"
//                     className="doc-dashed-line"
//                     disabled={items.length >= 200}
//                     onClick={() => {
//                       setItems((previous) => [...previous, newItem()]);

//                       setErrors([]);
//                     }}
//                   >
//                     <Plus size={15} />
//                     Add Item
//                   </button>
//                 </div>
//               )}
//             </section>

//             <section className="doc-bottom">
//               <div className="doc-extras">
//                 {fixedLines ? (
//                   <div className="doc-panel">
//                     <h2 className="doc-panel-title">Notes</h2>

//                     <p style={{ whiteSpace: "pre-wrap" }}>
//                       {form.notes || "No notes added."}
//                     </p>

//                     {displayRecord?.deliveryTerms && (
//                       <>
//                         <h3>Delivery Terms</h3>

//                         <p style={{ whiteSpace: "pre-wrap" }}>
//                           {displayRecord.deliveryTerms}
//                         </p>
//                       </>
//                     )}

//                     {displayRecord?.termsAndConditions && (
//                       <>
//                         <h3>Terms and Conditions</h3>

//                         <p style={{ whiteSpace: "pre-wrap" }}>
//                           {displayRecord.termsAndConditions}
//                         </p>
//                       </>
//                     )}
//                   </div>
//                 ) : (
//                   <>
//                     <button
//                       type="button"
//                       className={`doc-extra-row ${showNotes ? "is-open" : ""}`}
//                       aria-expanded={showNotes}
//                       onClick={() => setShowNotes((previous) => !previous)}
//                     >
//                       <StickyNote size={16} />
//                       <span>Add Notes</span>
//                       <ChevronDown size={16} />
//                     </button>

//                     {showNotes && (
//                       <div className="doc-extra-content">
//                         <Textarea
//                           name="notes"
//                           value={form.notes}
//                           onChange={handleFieldChange}
//                           maxLength={1000}
//                           rows={4}
//                           placeholder="Customer instructions or sales notes..."
//                         />
//                       </div>
//                     )}
//                   </>
//                 )}

//                 <p className="doc-note">
//                   Payments are recorded separately through Customer Receipts.
//                   Creating or posting an invoice does not mark it as paid.
//                 </p>

//                 {(fromOrder || editing) && (
//                   <p className="doc-note">
//                     Save the invoice with status Created, then open it and click
//                     Post Invoice.
//                   </p>
//                 )}
//               </div>

//               <div className="doc-summary">
//                 {[
//                   ["Gross Amount", totals.gross],
//                   ["Line Discounts", -totals.discount],
//                   ["Taxable Amount", totals.taxable],

//                   ...(form.taxMode === "INTRA_STATE"
//                     ? [
//                         ["CGST", totals.cgst],
//                         ["SGST", totals.sgst],
//                       ]
//                     : []),

//                   ...(form.taxMode === "INTER_STATE"
//                     ? [["IGST", totals.igst]]
//                     : []),
//                 ].map(([label, amount]) => (
//                   <div className="doc-summary-row" key={label}>
//                     <span>{label}</span>

//                     <strong>{formatPaise(amount)}</strong>
//                   </div>
//                 ))}

//                 <div className="doc-summary-total">
//                   <span>Total Amount:</span>

//                   <strong>{formatPaise(totals.total)}</strong>
//                 </div>

//                 {viewing && invoice?.status === "POSTED" && (
//                   <>
//                     <div className="doc-summary-row">
//                       <span>Paid Amount</span>

//                       <strong>{formatPaise(invoice.paidAmountPaise)}</strong>
//                     </div>

//                     <div className="doc-summary-row">
//                       <span>Outstanding Amount</span>

//                       <strong>
//                         {formatPaise(invoice.outstandingAmountPaise)}
//                       </strong>
//                     </div>
//                   </>
//                 )}

//                 <p className="doc-note">
//                   {viewing
//                     ? "Amounts shown are the saved invoice totals."
//                     : fromOrder
//                       ? "Amounts come from the saved Sales Order. The backend verifies them before creating the invoice."
//                       : "Preview only. The server calculates final totals."}
//                 </p>
//               </div>
//             </section>
//           </main>
//         </fieldset>
//         {viewing && invoice && (
//           <EwayBillPanel
//             invoice={invoice}
//             disabled={saving || uncertainResult || Boolean(confirmation)}
//             onUpdated={applyInvoice}
//           />
//         )}
//         <div className="doc-mobile-bar">
//           <div className="doc-mobile-total">
//             <span>Total</span>

//             <strong>{formatPaise(totals.total)}</strong>
//           </div>

//           <div className="doc-mobile-actions">{actionButtons}</div>
//         </div>
//       </form>

//       <ConfirmModal
//         open={Boolean(confirmation)}
//         type={isPostingConfirmation ? "info" : "warning"}
//         icon={isPostingConfirmation ? Send : undefined}
//         title={confirmationTitle}
//         message={confirmationMessage}
//         confirmText={
//           isPostingConfirmation
//             ? "Post Invoice"
//             : uncertainResult
//               ? "Open Invoice List"
//               : "Discard & Leave"
//         }
//         cancelText={isPostingConfirmation ? "Back" : "Stay on Page"}
//         loading={saving}
//         closeOnBackdrop={!saving}
//         closeOnEscape={!saving}
//         onCancel={closeConfirmation}
//         onConfirm={handleConfirmation}
//       />
//     </div>
//   );
// }

// export default function SalesInvoiceCreate({ mode = "create" }) {
//   const params = useParams();
//   const [searchParams] = useSearchParams();

//   const tenantRevision = useTenantRevision();

//   const invoiceNumber = params.invoiceNumber || params.id || "";

//   const sourceOrderNumber =
//     mode === "create" ? (searchParams.get("orderNumber") || "").trim() : "";

//   return (
//     <SalesInvoiceForm
//       key={
//         `${tenantRevision}-` +
//         `${mode}-` +
//         `${invoiceNumber}-` +
//         sourceOrderNumber
//       }
//       mode={mode}
//       invoiceNumber={invoiceNumber}
//       sourceOrderNumber={sourceOrderNumber}
//     />
//   );
// }

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import {
  ArrowLeft,
  ChevronDown,
  FileText,
  Plus,
  Save,
  Send,
  StickyNote,
  Trash2,
} from "lucide-react";

import toast from "react-hot-toast";

import ConfirmModal from "../../../components/common/ConfirmModal/ConfirmModal";

import api from "../../../services/api";
import salesInvoiceApi from "../../../services/modules/salesInvoiceApi";

import Input from "../../../components/common/Form/Input";
import Select from "../../../components/common/Form/Select";
import Textarea from "../../../components/common/Form/Textarea";
import Button from "../../../components/common/Form/Button";
import StatusField from "../../../components/common/StatusField/StatusField";
import EwayBillPanel from "./EwayBillPanel";
import {
  SALES_PATHS,
  GST_RATES,
  TAX_OPTIONS,
  EMPTY_TOTALS,
  addDays,
  calculatePreview,
  formatDate,
  formatPaise,
  getErrors,
  inputDate,
  itemSnapshot,
  loadAllPages,
  localDate,
  useTenantRevision,
} from "./salesInvoiceUtils";

import "../../../styles/invoice-common1.css";

const customerApi = api.customers || api.customer;
const productApi = api.products || api.product;
const salesOrderApi = api.salesOrder || api.salesOrders;

const ELIGIBLE_ORDER_STATUSES = ["CONFIRMED", "IN_PROGRESS", "COMPLETED"];

const NO_ORDER = "__NO_ORDER__";

const NUMBER_COLUMNS = [
  {
    field: "quantity",
    label: "Quantity",
    min: "0.001",
    max: "1000000",
    step: "0.001",
  },
  {
    field: "unitRate",
    label: "Price/Item (₹)",
    min: "0",
    max: "1000000000",
    step: "0.01",
  },
  {
    field: "discountPercent",
    label: "Discount %",
    min: "0",
    max: "100",
    step: "0.01",
  },
];

let rowCounter = 0;

const newItem = () => ({
  rowId: `sales-item-${++rowCounter}`,
  productId: "",
  quantity: "1",
  unitRate: "0",
  discountPercent: "0",
  gstRate: 0,
});

const initialForm = () => {
  const today = localDate();

  return {
    customerId: "",
    invoiceDate: today,
    dueDate: today,
    paymentTerms: "Due on Receipt",
    taxMode: "NONE",
    updateStock: false,
    notes: "",
  };
};

const validDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
};

const snapshot = (form, items) =>
  JSON.stringify({
    form,
    items: itemSnapshot(items),
  });

const savedTotals = (record) => ({
  gross: record.grossAmountPaise,
  discount: record.discountAmountPaise,
  taxable: record.taxableAmountPaise,
  cgst: record.cgstAmountPaise,
  sgst: record.sgstAmountPaise,
  igst: record.igstAmountPaise,
  total: record.totalAmountPaise,
});

const toFormItems = (record) =>
  record.items.map((item) => ({
    ...newItem(),
    productId: String(item.productId),
    quantity: String(item.quantity),
    unitRate: String(item.unitRatePaise / 100),
    discountPercent: String(item.discountPercent),
    gstRate: item.gstRate,
  }));

const toInvoiceForm = (record) => ({
  customerId: String(record.customerId),
  invoiceDate: inputDate(record.invoiceDate),
  dueDate: inputDate(record.dueDate),
  paymentTerms: record.paymentTerms || "Due on Receipt",
  taxMode: record.taxMode,
  updateStock: Boolean(record.updateStock),
  notes: record.notes || "",
});

const extractInvoice = (response) => {
  const record = response?.data?.invoice;

  if (
    response?.data?.success !== true ||
    !record?._id ||
    !record.invoiceNumber ||
    !Array.isArray(record.items)
  ) {
    throw new Error(
      response?.data?.message || "The server did not return a valid invoice.",
    );
  }

  return record;
};

/*
 * Loads every Sales Order header page by page. The response shape is read
 * defensively because list endpoints differ between modules.
 */
const fetchAllOrders = async () => {
  if (typeof salesOrderApi?.getOrders !== "function") {
    throw new Error("Configure the Sales Order getOrders API.");
  }

  const rows = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await salesOrderApi.getOrders({ page, limit: 100 });
    const body = response?.data;

    const batch = Array.isArray(body?.data)
      ? body.data
      : Array.isArray(body?.orders)
        ? body.orders
        : Array.isArray(body)
          ? body
          : [];

    rows.push(...batch);

    totalPages = Number(body?.pagination?.totalPages) || 1;
    page += 1;
  } while (page <= totalPages && page <= 50);

  return rows;
};

function SalesInvoiceForm({
  mode,
  invoiceNumber,
  sourceOrderNumber: initialOrderNumber,
}) {
  const navigate = useNavigate();

  const viewing = mode === "view";
  const editing = mode === "edit";
  const creating = mode === "create";

  const [activeOrderNumber, setActiveOrderNumber] = useState(
    creating ? initialOrderNumber : "",
  );
  const [pendingOrderNumber, setPendingOrderNumber] = useState("");

  const fromOrder = creating && Boolean(activeOrderNumber);

  const [form, setForm] = useState(initialForm);
  const [items, setItems] = useState(() => [newItem()]);

  const [invoice, setInvoice] = useState(null);
  const [sourceOrder, setSourceOrder] = useState(null);

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  const [eligibleOrders, setEligibleOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersFailed, setOrdersFailed] = useState(false);
  const [ordersReloadKey, setOrdersReloadKey] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [errors, setErrors] = useState([]);
  const [showNotes, setShowNotes] = useState(false);

  const [savingAction, setSavingAction] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const [uncertainResult, setUncertainResult] = useState(false);
  const [savedInvoice, setSavedInvoice] = useState(null);

  const submitLock = useRef(false);
  const alive = useRef(false);
  const savedRef = useRef(false);
  const initialSnapshot = useRef("");

  const saving = Boolean(savingAction);

  const transactionLocked =
    loading || loadFailed || saving || uncertainResult || Boolean(savedInvoice);

  const formDisabled = transactionLocked || viewing || Boolean(confirmation);

  const orderFieldsLocked = formDisabled || fromOrder;

  const orderPickerDisabled =
    saving || uncertainResult || Boolean(savedInvoice) || Boolean(confirmation);

  const displayRecord = invoice || sourceOrder;
  const fixedLines = viewing || fromOrder;

  const applyInvoice = useCallback((record) => {
    const nextForm = toInvoiceForm(record);
    const nextItems = toFormItems(record);

    setInvoice(record);
    setForm(nextForm);
    setItems(nextItems);
    setShowNotes(Boolean(nextForm.notes));

    initialSnapshot.current = snapshot(nextForm, nextItems);
  }, []);

  useEffect(() => {
    alive.current = true;

    return () => {
      alive.current = false;
    };
  }, []);

  /* ==========================================
     ELIGIBLE SALES ORDERS (create mode only)
     ========================================== */

  useEffect(() => {
    if (!creating) return undefined;

    let cancelled = false;

    const loadOrders = async () => {
      setOrdersLoading(true);
      setOrdersFailed(false);

      try {
        const orderRows = await fetchAllOrders();

        // Hide orders that already have an active invoice. If the invoice
        // list cannot be read, the backend still blocks duplicates.
        const invoiced = new Set();

        try {
          const invoiceRows = await loadAllPages(salesInvoiceApi, "invoices");

          invoiceRows.forEach((row) => {
            if (row.status !== "CANCELLED" && row.sourceSalesOrderNumber) {
              invoiced.add(String(row.sourceSalesOrderNumber).toUpperCase());
            }
          });
        } catch {
          // Ignore: backend validation remains authoritative.
        }

        if (cancelled) return;

        setEligibleOrders(
          orderRows.filter(
            (order) =>
              order?.orderNumber &&
              !order.isDeleted &&
              ELIGIBLE_ORDER_STATUSES.includes(order.status) &&
              !invoiced.has(String(order.orderNumber).toUpperCase()),
          ),
        );
      } catch (error) {
        if (cancelled) return;

        setEligibleOrders([]);
        setOrdersFailed(true);
        toast.error(getErrors(error)[0]);
      } finally {
        if (!cancelled) setOrdersLoading(false);
      }
    };

    void loadOrders();

    return () => {
      cancelled = true;
    };
  }, [creating, ordersReloadKey]);

  /* ==========================================
     MAIN LOAD
     ========================================== */

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadFailed(false);
      setErrors([]);

      try {
        if (!["create", "edit", "view"].includes(mode)) {
          throw new Error("Invalid invoice page mode.");
        }

        let loadedInvoice = null;
        let loadedOrder = null;
        let customerRecords = [];
        let productRecords = [];

        if (viewing || editing) {
          if (!invoiceNumber) {
            throw new Error("Invoice number is missing.");
          }

          const response = await salesInvoiceApi.getByNumber(invoiceNumber);

          loadedInvoice = extractInvoice(response);

          if (editing && loadedInvoice.status !== "CREATED") {
            throw new Error("Only created sales invoices can be edited.");
          }

          if (editing && loadedInvoice.sourceSalesOrderId) {
            throw new Error(
              "Order-linked invoices cannot be edited directly. Delete the created invoice and recreate it from the Sales Order.",
            );
          }

          if (editing) {
            [customerRecords, productRecords] = await Promise.all([
              loadAllPages(customerApi, "customers"),
              loadAllPages(productApi, "products"),
            ]);
          }
        } else if (fromOrder) {
          if (typeof salesOrderApi?.getOrder !== "function") {
            throw new Error("Configure the Sales Order getOrder API.");
          }

          const response = await salesOrderApi.getOrder(activeOrderNumber);

          loadedOrder = response?.data?.data;

          if (
            response?.data?.success !== true ||
            !loadedOrder?._id ||
            !Array.isArray(loadedOrder.items) ||
            !loadedOrder.items.length
          ) {
            throw new Error(
              response?.data?.message || "Unable to load the Sales Order.",
            );
          }

          if (!ELIGIBLE_ORDER_STATUSES.includes(loadedOrder.status)) {
            throw new Error(
              "Confirm the Sales Order before creating an invoice.",
            );
          }

          if (!Number.isSafeInteger(loadedOrder.__v) || loadedOrder.__v < 0) {
            throw new Error(
              "Sales Order version is missing. Refresh the order.",
            );
          }
        } else {
          [customerRecords, productRecords] = await Promise.all([
            loadAllPages(customerApi, "customers"),
            loadAllPages(productApi, "products"),
          ]);
        }

        if (cancelled) return;

        setCustomers(
          customerRecords.filter(
            (customer) => customer.status === "Active" && !customer.isDeleted,
          ),
        );

        setProducts(
          productRecords.filter(
            (product) => product.status === "ACTIVE" && !product.isDeleted,
          ),
        );

        setSourceOrder(loadedOrder);

        if (loadedInvoice) {
          applyInvoice(loadedInvoice);

          if (loadedInvoice.status === "POSTED") {
            setUncertainResult(false);
          }
        } else {
          const today = localDate();

          const sourceDate = loadedOrder
            ? inputDate(loadedOrder.orderDate)
            : "";

          const invoiceDate = sourceDate > today ? sourceDate : today;

          const nextForm = loadedOrder
            ? {
                customerId: String(loadedOrder.customerId),
                invoiceDate,
                dueDate: invoiceDate,
                paymentTerms: loadedOrder.paymentTerms || "Due on Receipt",
                taxMode: loadedOrder.taxMode,
                updateStock: false,
                notes: loadedOrder.notes || "",
              }
            : initialForm();

          const nextItems = loadedOrder
            ? toFormItems(loadedOrder)
            : [newItem()];

          setInvoice(null);
          setForm(nextForm);
          setItems(nextItems);
          setShowNotes(Boolean(nextForm.notes));

          initialSnapshot.current = snapshot(nextForm, nextItems);
        }
      } catch (error) {
        if (cancelled) return;

        const messages = getErrors(error);

        setErrors(messages);
        setLoadFailed(true);
        toast.error(messages[0]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [
    mode,
    viewing,
    editing,
    fromOrder,
    invoiceNumber,
    activeOrderNumber,
    reloadKey,
    applyInvoice,
  ]);

  const selectedCustomer = useMemo(() => {
    if (fixedLines && displayRecord) {
      return {
        _id: String(displayRecord.customerId),
        customerName: displayRecord.customerName,
        customerCode: displayRecord.customerCode,
        gstNo: displayRecord.customerGstNo,
        billingAddress: displayRecord.billingAddress,
        shippingAddress: displayRecord.shippingAddress,
      };
    }

    return (
      customers.find((customer) => String(customer._id) === form.customerId) ||
      null
    );
  }, [customers, form.customerId, fixedLines, displayRecord]);

  const customerOptions = useMemo(() => {
    if (fixedLines && selectedCustomer) {
      return [
        {
          value: selectedCustomer._id,
          label:
            `${selectedCustomer.customerName} ` +
            `(${selectedCustomer.customerCode})`,
        },
      ];
    }

    const options = customers.map((customer) => ({
      value: String(customer._id),
      label: `${customer.customerName} ` + `(${customer.customerCode})`,
    }));

    if (
      invoice &&
      !options.some((option) => option.value === String(invoice.customerId))
    ) {
      options.unshift({
        value: String(invoice.customerId),
        label:
          `${invoice.customerName} ` +
          `(${invoice.customerCode}) — unavailable`,
      });
    }

    return options;
  }, [customers, invoice, fixedLines, selectedCustomer]);

  const orderOptions = useMemo(() => {
    const options = eligibleOrders.map((order) => ({
      value: String(order.orderNumber),
      label:
        `${order.orderNumber}` +
        `${order.customerName ? ` · ${order.customerName}` : ""}` +
        `${
          Number.isSafeInteger(order.totalAmountPaise)
            ? ` · ${formatPaise(order.totalAmountPaise)}`
            : ""
        }`,
    }));

    // Keep the active order visible even if it is not in the eligible list.
    if (
      activeOrderNumber &&
      !options.some((option) => option.value === activeOrderNumber)
    ) {
      options.unshift({
        value: activeOrderNumber,
        label: activeOrderNumber,
      });
    }

    return [
      { value: NO_ORDER, label: "No Sales Order (direct invoice)" },
      ...options,
    ];
  }, [eligibleOrders, activeOrderNumber]);

  const productMap = useMemo(
    () => new Map(products.map((product) => [String(product._id), product])),
    [products],
  );

  const previews = useMemo(
    () =>
      items.map((item, index) => {
        if (fixedLines && displayRecord?.items[index]) {
          return {
            valid: true,
            ...savedTotals(displayRecord.items[index]),
          };
        }

        return calculatePreview(item, form.taxMode);
      }),
    [items, form.taxMode, fixedLines, displayRecord],
  );

  const totals = useMemo(() => {
    if (fixedLines && displayRecord) {
      return savedTotals(displayRecord);
    }

    return previews.reduce(
      (result, preview) => {
        const next = { ...result };

        for (const key of Object.keys(EMPTY_TOTALS)) {
          next[key] += preview[key];
        }

        return next;
      },
      { ...EMPTY_TOTALS },
    );
  }, [previews, fixedLines, displayRecord]);

  const isDirty =
    !loading &&
    !viewing &&
    Boolean(initialSnapshot.current) &&
    snapshot(form, items) !== initialSnapshot.current;

  useEffect(() => {
    const beforeUnload = (event) => {
      if (savedRef.current) return;

      if (!isDirty && !saving && !uncertainResult) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", beforeUnload);

    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [isDirty, saving, uncertainResult]);

  /* ==========================================
     SALES ORDER PICKER
     ========================================== */

  const applyOrderSelection = (orderNumber) => {
    setActiveOrderNumber(orderNumber);
    setSourceOrder(null);
    setInvoice(null);
    setErrors([]);
    setPendingOrderNumber("");
  };

  const handleOrderChange = (event) => {
    if (orderPickerDisabled) return;

    const value = event.target.value === NO_ORDER ? "" : event.target.value;

    if (value === activeOrderNumber) return;

    if (isDirty) {
      setPendingOrderNumber(value);
      setConfirmation("switch");
      return;
    }

    applyOrderSelection(value);
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;

    if (formDisabled) return;

    if (fromOrder && !["invoiceDate", "dueDate"].includes(name)) {
      return;
    }

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors([]);
  };

  const handleCustomerChange = (event) => {
    if (formDisabled || fromOrder) return;

    const customer = customers.find(
      (record) => String(record._id) === event.target.value,
    );

    setForm((previous) => ({
      ...previous,

      customerId: customer ? String(customer._id) : "",

      paymentTerms: customer?.paymentTerms || "Due on Receipt",

      dueDate: addDays(previous.invoiceDate, customer?.creditDays || 0),
    }));

    setErrors([]);
  };

  const handleTaxModeChange = (event) => {
    if (formDisabled || fromOrder) return;

    const taxMode = event.target.value;

    setForm((previous) => ({
      ...previous,
      taxMode,
    }));

    setItems((previous) =>
      previous.map((item) => ({
        ...item,

        gstRate:
          taxMode === "NONE"
            ? 0
            : (productMap.get(item.productId)?.gstRate ?? 0),
      })),
    );

    setErrors([]);
  };

  const updateItem = (rowId, field, value) => {
    if (formDisabled || fixedLines) return;

    setItems((previous) =>
      previous.map((item) =>
        item.rowId === rowId ? { ...item, [field]: value } : item,
      ),
    );

    setErrors([]);
  };

  const selectProduct = (rowId, productId) => {
    if (formDisabled || fixedLines) return;

    const product = productMap.get(productId);

    setItems((previous) =>
      previous.map((item) =>
        item.rowId === rowId
          ? {
              ...item,
              productId,
              unitRate: String(product?.salePrice ?? 0),

              gstRate: form.taxMode === "NONE" ? 0 : (product?.gstRate ?? 0),
            }
          : item,
      ),
    );

    setErrors([]);
  };

  const validateForm = (action) => {
    const messages = [];

    if (!validDate(form.invoiceDate) || !validDate(form.dueDate)) {
      messages.push("Valid invoice and due dates are required.");
    } else if (form.dueDate < form.invoiceDate) {
      messages.push("Due date cannot be before invoice date.");
    }

    if (fromOrder) {
      if (
        !sourceOrder?._id ||
        !Number.isSafeInteger(sourceOrder.__v) ||
        sourceOrder.__v < 0
      ) {
        messages.push("Reload the Sales Order before creating the invoice.");
      }

      if (sourceOrder && form.invoiceDate < inputDate(sourceOrder.orderDate)) {
        messages.push("Invoice date cannot be before the Sales Order date.");
      }

      if (action !== "SAVE_CREATED") {
        messages.push("Create the invoice first, then post it separately.");
      }

      return messages;
    }

    if (
      !customers.some((customer) => String(customer._id) === form.customerId)
    ) {
      messages.push("Select an active customer.");
    }

    if (!form.paymentTerms.trim()) {
      messages.push("Payment terms are required.");
    }

    if (
      form.paymentTerms.trim().length > 100 ||
      form.notes.trim().length > 1000
    ) {
      messages.push("Payment terms or notes exceed the allowed length.");
    }

    if (!TAX_OPTIONS.some((option) => option.value === form.taxMode)) {
      messages.push("Select a valid tax treatment.");
    }

    if (!items.length || items.length > 200) {
      messages.push("Add between 1 and 200 items.");
    }

    const ids = items.map((item) => item.productId).filter(Boolean);

    if (new Set(ids).size !== ids.length) {
      messages.push("A product can appear only once in a direct invoice.");
    }

    items.forEach((item, index) => {
      if (!productMap.has(item.productId)) {
        messages.push(`Select an active product for item ${index + 1}.`);
      } else if (!previews[index]?.valid) {
        messages.push(
          `Check quantity, rate, discount, and GST for item ${index + 1}.`,
        );
      }
    });

    if (
      Object.values(totals).some(
        (amount) => !Number.isSafeInteger(amount) || amount < 0,
      )
    ) {
      messages.push("Invoice amounts exceed the supported range.");
    }

    if (action === "SAVE_AND_POST" && totals.total <= 0) {
      messages.push("A posted invoice must have a positive total.");
    }

    return messages;
  };

  const saveInvoice = async (action, postingConfirmed = false) => {
    if (
      transactionLocked ||
      viewing ||
      submitLock.current ||
      savedRef.current ||
      (confirmation && !postingConfirmed)
    ) {
      return;
    }

    const messages = validateForm(action);

    if (messages.length) {
      setErrors(messages);
      toast.error(messages[0]);
      setConfirmation("");
      return;
    }

    if (action === "SAVE_AND_POST" && !postingConfirmed) {
      setConfirmation("post");
      return;
    }

    submitLock.current = true;
    setSavingAction(action);
    setErrors([]);

    let writeStarted = false;

    try {
      let response;

      if (fromOrder) {
        const latestResponse = await salesOrderApi.getOrder(
          sourceOrder.orderNumber,
        );

        const latest = latestResponse?.data?.data;

        if (latestResponse?.data?.success !== true || !latest?._id) {
          throw new Error("Unable to verify the Sales Order.");
        }

        if (
          latest.__v !== sourceOrder.__v ||
          latest.status !== sourceOrder.status
        ) {
          throw new Error(
            "The Sales Order changed. Reload it and review before creating the invoice.",
          );
        }

        writeStarted = true;

        response = await salesInvoiceApi.createFromSalesOrder(
          sourceOrder.orderNumber,
          {
            version: sourceOrder.__v,
            invoiceDate: form.invoiceDate,
            dueDate: form.dueDate,
          },
        );
      } else {
        const payload = {
          customerId: form.customerId,
          invoiceDate: form.invoiceDate,
          dueDate: form.dueDate,
          paymentTerms: form.paymentTerms.trim(),
          taxMode: form.taxMode,
          updateStock: form.updateStock,

          items: items.map((item) => ({
            productId: item.productId,
            quantity: Number(item.quantity),
            unitRate: Number(item.unitRate),
            discountPercent: Number(item.discountPercent),

            gstRate: form.taxMode === "NONE" ? 0 : Number(item.gstRate),
          })),

          notes: form.notes.trim(),
        };

        writeStarted = true;

        response = editing
          ? await salesInvoiceApi.update(invoiceNumber, payload)
          : await salesInvoiceApi.create({
              ...payload,
              action,
            });
      }

      let saved;

      try {
        saved = extractInvoice(response);
      } catch (error) {
        error.uncertain = true;
        throw error;
      }

      savedRef.current = true;

      if (!alive.current) return;

      setSavedInvoice(saved);
      setConfirmation("");

      toast.success(
        saved.status === "POSTED"
          ? `${saved.invoiceNumber} created and posted successfully`
          : editing
            ? `${saved.invoiceNumber} updated successfully`
            : `${saved.invoiceNumber} created successfully`,
      );

      navigate(SALES_PATHS.view(saved.invoiceNumber), { replace: true });
    } catch (error) {
      if (!alive.current) return;

      const status = error?.response?.status;

      if (
        !savedRef.current &&
        writeStarted &&
        (error.uncertain || !status || status >= 500 || status === 408)
      ) {
        setUncertainResult(true);
      }

      const messages = getErrors(error);

      setErrors(messages);
      setConfirmation("");
      toast.error(messages[0]);
    } finally {
      submitLock.current = false;

      if (alive.current) {
        setSavingAction("");
      }
    }
  };

  /* ==========================================
     POST AN EXISTING CREATED INVOICE
     ========================================== */

  const postExistingInvoice = async () => {
    if (
      submitLock.current ||
      saving ||
      uncertainResult ||
      !viewing ||
      invoice?.status !== "CREATED"
    ) {
      return;
    }

    const original = invoice;

    submitLock.current = true;
    setSavingAction("POST_EXISTING");
    setErrors([]);

    let postStarted = false;

    try {
      /*
       * Check that the invoice being reviewed has not
       * changed before sending the posting request.
       * Backend validation remains authoritative.
       */
      const latestResponse = await salesInvoiceApi.getByNumber(
        original.invoiceNumber,
      );

      const latest = extractInvoice(latestResponse);

      if (!alive.current) return;

      if (latest.status === "POSTED") {
        applyInvoice(latest);
        setConfirmation("");

        toast.success(`${latest.invoiceNumber} is already posted.`);

        return;
      }

      if (latest.status !== "CREATED") {
        applyInvoice(latest);

        throw new Error("This invoice is no longer available for posting.");
      }

      if (latest.__v !== original.__v) {
        applyInvoice(latest);

        throw new Error(
          "This invoice changed. Review the refreshed details before posting.",
        );
      }

      postStarted = true;

      const response = await salesInvoiceApi.post(original.invoiceNumber);

      let posted;

      try {
        posted = extractInvoice(response);

        if (posted.status !== "POSTED") {
          throw new Error("The server did not return a posted invoice.");
        }
      } catch (error) {
        error.uncertain = true;
        throw error;
      }

      if (!alive.current) return;

      applyInvoice(posted);
      setConfirmation("");
      setUncertainResult(false);

      toast.success(
        response.data.message || `${posted.invoiceNumber} posted successfully`,
      );
    } catch (error) {
      if (!alive.current) return;

      const status = error?.response?.status;

      const unknownResult =
        postStarted &&
        (error.uncertain || !status || status >= 500 || status === 408);

      setConfirmation("");

      if (postStarted) {
        try {
          const response = await salesInvoiceApi.getByNumber(
            original.invoiceNumber,
          );

          const latest = extractInvoice(response);

          if (!alive.current) return;

          applyInvoice(latest);

          if (latest.status === "POSTED") {
            setErrors([]);
            setUncertainResult(false);

            toast.success(`${latest.invoiceNumber} is posted.`);

            return;
          }
        } catch {
          // Preserve the original posting error.
        }
      }

      if (!alive.current) return;

      setUncertainResult(Boolean(unknownResult));

      const messages = getErrors(error);

      setErrors(messages);
      toast.error(messages[0]);
    } finally {
      submitLock.current = false;

      if (alive.current) {
        setSavingAction("");
        setConfirmation("");
      }
    }
  };

  const exitPage = () => {
    if (saving || submitLock.current) {
      return;
    }

    if (savedRef.current) {
      navigate(SALES_PATHS.list);
      return;
    }

    if (isDirty || uncertainResult) {
      setConfirmation("exit");
      return;
    }

    navigate(SALES_PATHS.list);
  };

  const closeConfirmation = useCallback(() => {
    if (submitLock.current) return;

    setConfirmation("");
    setPendingOrderNumber("");
  }, []);

  const handleConfirmation = () => {
    if (saving || submitLock.current) return;

    if (confirmation === "post-existing") {
      void postExistingInvoice();
      return;
    }

    if (confirmation === "post") {
      void saveInvoice("SAVE_AND_POST", true);

      return;
    }

    if (confirmation === "switch") {
      setConfirmation("");
      applyOrderSelection(pendingOrderNumber);
      return;
    }

    if (confirmation === "exit") {
      setConfirmation("");
      navigate(SALES_PATHS.list);
    }
  };

  /* ==========================================
     HEADER / MOBILE ACTIONS
     ========================================== */

  const actionButtons = viewing ? (
    invoice?.status === "CREATED" ? (
      <>
        {!invoice.sourceSalesOrderId && (
          <Button
            type="button"
            variant="secondary"
            icon={Save}
            disabled={
              loading ||
              loadFailed ||
              saving ||
              uncertainResult ||
              Boolean(confirmation)
            }
            onClick={() => navigate(SALES_PATHS.edit(invoice.invoiceNumber))}
          >
            Edit Invoice
          </Button>
        )}

        <Button
          type="button"
          icon={Send}
          disabled={
            loading ||
            loadFailed ||
            saving ||
            uncertainResult ||
            Boolean(confirmation)
          }
          loading={savingAction === "POST_EXISTING"}
          onClick={() => {
            setErrors([]);
            setConfirmation("post-existing");
          }}
        >
          Post Invoice
        </Button>
      </>
    ) : null
  ) : (
    <>
      <Button
        type="button"
        variant="secondary"
        icon={Save}
        disabled={formDisabled}
        loading={savingAction === "SAVE_CREATED"}
        onClick={() => void saveInvoice("SAVE_CREATED")}
      >
        {editing ? "Save Changes" : "Create Invoice"}
      </Button>

      {!editing && !fromOrder && (
        <Button
          type="button"
          icon={Send}
          disabled={formDisabled}
          loading={savingAction === "SAVE_AND_POST"}
          onClick={() => void saveInvoice("SAVE_AND_POST")}
        >
          Create & Post
        </Button>
      )}
    </>
  );

  const address = selectedCustomer
    ? fixedLines
      ? selectedCustomer.billingAddress || ""
      : [
          selectedCustomer.billingAddress,
          selectedCustomer.city,
          selectedCustomer.state,
          selectedCustomer.pincode,
          selectedCustomer.country,
        ]
          .filter((value) => typeof value === "string" && value.trim())
          .join(", ")
    : "";

  const sourceNumber =
    sourceOrder?.orderNumber || invoice?.sourceSalesOrderNumber || "";

  const isPostingConfirmation =
    confirmation === "post" || confirmation === "post-existing";

  const isSwitchConfirmation = confirmation === "switch";

  const postingUpdatesStock =
    confirmation === "post-existing"
      ? Boolean(invoice?.updateStock)
      : Boolean(form.updateStock);

  const confirmationTitle = isPostingConfirmation
    ? "Post sales invoice?"
    : isSwitchConfirmation
      ? "Change Sales Order?"
      : uncertainResult
        ? "Check invoice status?"
        : "Discard invoice changes?";

  const confirmationMessage = isPostingConfirmation
    ? postingUpdatesStock
      ? "This creates accounting entries and deducts inventory-tracked goods. Do not continue if the same goods have already been deducted through a Delivery Note."
      : "This creates accounting entries without deducting stock. The invoice becomes Posted and can no longer be edited or deleted."
    : isSwitchConfirmation
      ? "Your unsaved changes will be replaced by the details of the selected option. Continue?"
      : uncertainResult
        ? "The previous request may already have completed. Open Sales Invoices and verify the result before trying again."
        : "Your unsaved changes will be lost. Leave this page?";

  const confirmationConfirmText = isPostingConfirmation
    ? "Post Invoice"
    : isSwitchConfirmation
      ? "Change & Replace"
      : uncertainResult
        ? "Open Invoice List"
        : "Discard & Leave";

  return (
    <div className="doc-page">
      <form noValidate onSubmit={(event) => event.preventDefault()}>
        <header className="doc-header">
          <div className="doc-header-left">
            <Button
              type="button"
              variant="secondary"
              icon={ArrowLeft}
              disabled={saving || Boolean(confirmation)}
              onClick={exitPage}
            >
              Exit
            </Button>

            <div className="doc-title">
              <FileText size={18} />

              <span>
                {viewing
                  ? `Sales Invoice ${invoiceNumber}`
                  : editing
                    ? `Edit Sales Invoice ${invoiceNumber}`
                    : fromOrder
                      ? `Create Invoice · ${activeOrderNumber}`
                      : "Create Sales Invoice"}
              </span>
            </div>
          </div>

          <div className="doc-header-actions">{actionButtons}</div>
        </header>

        {(loading || errors.length > 0 || uncertainResult || savedInvoice) && (
          <div className="doc-alerts">
            {loading && (
              <div className="doc-alert" role="status">
                {fromOrder
                  ? "Loading Sales Order..."
                  : viewing
                    ? "Loading sales invoice..."
                    : "Loading invoice details and options..."}
              </div>
            )}

            {errors.length > 0 && (
              <div className="doc-alert doc-alert-error" role="alert">
                <strong>Please review the following</strong>

                <ul>
                  {errors.map((message, index) => (
                    <li key={`${index}-${message}`}>{message}</li>
                  ))}
                </ul>

                {loadFailed && (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={saving}
                    onClick={() => setReloadKey((value) => value + 1)}
                  >
                    Retry Loading
                  </Button>
                )}

                {fromOrder &&
                  !loadFailed &&
                  !uncertainResult &&
                  !savedInvoice && (
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={saving}
                      onClick={() => setReloadKey((value) => value + 1)}
                    >
                      Reload Sales Order
                    </Button>
                  )}
              </div>
            )}

            {uncertainResult && (
              <div className="doc-alert" role="alert">
                <p>
                  The request result is uncertain. Further submission is locked.
                  Check the invoice list before trying again.
                </p>

                <Button
                  type="button"
                  variant="secondary"
                  disabled={saving || Boolean(confirmation)}
                  onClick={exitPage}
                >
                  Check Sales Invoices
                </Button>
              </div>
            )}

            {savedInvoice && (
              <div className="doc-alert" role="status">
                <p>{savedInvoice.invoiceNumber} was saved successfully.</p>

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    navigate(SALES_PATHS.view(savedInvoice.invoiceNumber), {
                      replace: true,
                    })
                  }
                >
                  Open Invoice
                </Button>
              </div>
            )}
          </div>
        )}

        {/* CREATE FROM SALES ORDER */}
        {creating && (
          <div className="doc-alerts">
            <div className="doc-panel">
              <h2 className="doc-panel-title">Create From Sales Order</h2>

              <Select
                label="Sales Order (optional)"
                name="sourceOrder"
                value={activeOrderNumber || NO_ORDER}
                options={orderOptions}
                disabled={orderPickerDisabled}
                onChange={handleOrderChange}
              />

              {ordersLoading && (
                <p className="doc-note" role="status">
                  Loading Sales Orders...
                </p>
              )}

              {ordersFailed && !ordersLoading && (
                <p className="doc-note" role="alert">
                  Unable to load Sales Orders.{" "}
                  <button
                    type="button"
                    className="doc-link-button"
                    onClick={() => setOrdersReloadKey((value) => value + 1)}
                  >
                    Retry
                  </button>
                </p>
              )}

              {!ordersLoading &&
                !ordersFailed &&
                eligibleOrders.length === 0 && (
                  <p className="doc-note">
                    No confirmed Sales Orders are waiting to be invoiced. You
                    can still create a direct invoice.
                  </p>
                )}

              {!fromOrder && !ordersLoading && eligibleOrders.length > 0 && (
                <p className="doc-note">
                  Select a Sales Order to fill the customer, items, taxes and
                  totals automatically.
                </p>
              )}

              {fromOrder && sourceOrder && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: "10px",
                    marginTop: "12px",
                  }}
                >
                  <strong>{sourceOrder.orderNumber}</strong>

                  <StatusField value={sourceOrder.status} />

                  <strong>{formatPaise(sourceOrder.totalAmountPaise)}</strong>
                </div>
              )}
            </div>
          </div>
        )}

        {(invoice || sourceNumber) && (
          <div className="doc-alerts">
            <div className="doc-alert">
              {invoice && <StatusField value={invoice.status} />}

              {invoice?.status === "POSTED" && (
                <>
                  {" "}
                  <StatusField value={invoice.paymentStatus} />
                </>
              )}

              {viewing && invoice?.status === "CREATED" && (
                <p>
                  This invoice is created but not posted. Use Post Invoice to
                  create its accounting entry.
                </p>
              )}
            </div>
          </div>
        )}

        <fieldset className="doc-fieldset" disabled={formDisabled}>
          <main className="doc-main">
            <section className="doc-top">
              <div className="doc-panel doc-party-panel">
                <h2 className="doc-panel-title">Bill To</h2>

                <Select
                  label="Customer"
                  name="customerId"
                  value={form.customerId}
                  placeholder="Select customer"
                  options={customerOptions}
                  disabled={orderFieldsLocked}
                  onChange={handleCustomerChange}
                  required
                />

                {selectedCustomer && (
                  <div className="doc-party-card">
                    <div className="doc-avatar">
                      {selectedCustomer.customerName?.charAt(0).toUpperCase() ||
                        "C"}
                    </div>

                    <div className="doc-party-copy">
                      <h3>{selectedCustomer.customerName}</h3>

                      <p>{selectedCustomer.customerCode}</p>

                      <p>
                        <span>Address:</span> {address || "Not provided"}
                      </p>

                      {fixedLines && selectedCustomer.shippingAddress && (
                        <p>
                          <span>Shipping:</span>{" "}
                          {selectedCustomer.shippingAddress}
                        </p>
                      )}

                      <p>
                        <span>GSTIN:</span>{" "}
                        {selectedCustomer.gstNo || "Not provided"}
                      </p>

                      {!fixedLines && (
                        <p>
                          <span>Phone:</span>{" "}
                          {selectedCustomer.phone || "Not provided"}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="doc-panel">
                <h2 className="doc-panel-title">Invoice Details</h2>

                <div className="doc-fields-grid">
                  <Input
                    label="Invoice Number"
                    name="invoiceNumber"
                    value={invoice?.invoiceNumber || "Generated after saving"}
                    readOnly
                  />

                  {sourceNumber && (
                    <Input
                      label="Sales Order"
                      name="sourceSalesOrderNumber"
                      value={sourceNumber}
                      readOnly
                    />
                  )}

                  <Input
                    label="Invoice Date"
                    name="invoiceDate"
                    type="date"
                    value={form.invoiceDate}
                    min={
                      fromOrder && sourceOrder
                        ? inputDate(sourceOrder.orderDate)
                        : undefined
                    }
                    onChange={handleFieldChange}
                    required
                  />

                  <Input
                    label="Due Date"
                    name="dueDate"
                    type="date"
                    value={form.dueDate}
                    min={form.invoiceDate}
                    onChange={handleFieldChange}
                    required
                  />

                  <Input
                    label="Payment Terms"
                    name="paymentTerms"
                    value={form.paymentTerms}
                    readOnly={fromOrder}
                    onChange={handleFieldChange}
                    maxLength={100}
                    required
                  />

                  <Select
                    label="Tax Treatment"
                    name="taxMode"
                    value={form.taxMode}
                    options={TAX_OPTIONS}
                    disabled={orderFieldsLocked}
                    onChange={handleTaxModeChange}
                  />
                </div>

                {fromOrder || invoice?.sourceSalesOrderId ? (
                  <p className="doc-note">
                    This invoice does not deduct stock. Record goods dispatch
                    through Delivery Notes.
                  </p>
                ) : (
                  <label className="doc-check">
                    <input
                      type="checkbox"
                      checked={form.updateStock}
                      onChange={(event) => {
                        const checked = event.target.checked;

                        setForm((previous) => ({
                          ...previous,
                          updateStock: checked,
                        }));
                      }}
                    />

                    <span>
                      Deduct inventory-tracked goods when posting
                      <small>
                        Do not select this if the same goods have already been
                        deducted through a Delivery Note.
                      </small>
                    </span>
                  </label>
                )}
              </div>
            </section>

            <section className="doc-items">
              <div className="doc-table-wrap">
                <table className="doc-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Items</th>
                      <th>HSN / SAC</th>
                      <th>Qty</th>
                      <th>Price/Item (₹)</th>
                      <th>Discount %</th>
                      <th>GST</th>
                      <th>Amount</th>
                      <th>
                        <span className="doc-sr-only">Remove</span>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {items.map((item, index) => {
                      const savedItem = fixedLines
                        ? displayRecord?.items[index]
                        : null;

                      const product = productMap.get(item.productId);

                      const options = products
                        .filter(
                          (record) =>
                            String(record._id) === item.productId ||
                            !items.some(
                              (other) => other.productId === String(record._id),
                            ),
                        )
                        .map((record) => ({
                          value: String(record._id),
                          label: `${record.name} ` + `(${record.productCode})`,
                        }));

                      if (
                        !fixedLines &&
                        item.productId &&
                        !options.some(
                          (option) => option.value === item.productId,
                        )
                      ) {
                        const original = invoice?.items.find(
                          (record) =>
                            String(record.productId) === item.productId,
                        );

                        options.unshift({
                          value: item.productId,
                          label: original
                            ? `${original.productName} (unavailable)`
                            : "Unavailable product",
                        });
                      }

                      return (
                        <tr key={item.rowId}>
                          <td data-label="No." className="doc-cell-no">
                            {index + 1}
                          </td>

                          <td data-label="Item" className="doc-cell-item">
                            {fixedLines ? (
                              <div>
                                <strong>{savedItem?.productName}</strong>

                                <small className="doc-item-meta">
                                  {savedItem?.productCode}
                                  {" · "}
                                  {savedItem?.unit}
                                </small>

                                {savedItem?.specification && (
                                  <p className="doc-note">
                                    {savedItem.specification}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <>
                                <Select
                                  name={`product-${item.rowId}`}
                                  aria-label={`Product ${index + 1}`}
                                  value={item.productId}
                                  placeholder="Select product"
                                  options={options}
                                  onChange={(event) =>
                                    selectProduct(
                                      item.rowId,
                                      event.target.value,
                                    )
                                  }
                                />

                                {product && (
                                  <small className="doc-item-meta">
                                    {product.unit}
                                    {" · "}
                                    {product.type}
                                    {product.trackInventory
                                      ? " · Stock tracked"
                                      : ""}
                                  </small>
                                )}
                              </>
                            )}
                          </td>

                          <td data-label="HSN / SAC" className="doc-cell-hsn">
                            {savedItem?.hsnSacCode ||
                              product?.hsnSacCode ||
                              "—"}
                          </td>

                          {NUMBER_COLUMNS.map((column) => (
                            <td key={column.field} data-label={column.label}>
                              {fixedLines ? (
                                column.field === "unitRate" ? (
                                  formatPaise(savedItem?.unitRatePaise)
                                ) : (
                                  item[column.field]
                                )
                              ) : (
                                <Input
                                  name={`${column.field}-${item.rowId}`}
                                  aria-label={`${column.label} ${index + 1}`}
                                  type="number"
                                  inputMode="decimal"
                                  min={column.min}
                                  max={column.max}
                                  step={column.step}
                                  value={item[column.field]}
                                  onChange={(event) =>
                                    updateItem(
                                      item.rowId,
                                      column.field,
                                      event.target.value,
                                    )
                                  }
                                />
                              )}
                            </td>
                          ))}

                          <td data-label="GST">
                            {fixedLines ? (
                              `${item.gstRate}%`
                            ) : (
                              <Select
                                name={`gst-${item.rowId}`}
                                aria-label={`GST ${index + 1}`}
                                value={item.gstRate}
                                disabled={
                                  formDisabled || form.taxMode === "NONE"
                                }
                                options={GST_RATES.map((rate) => ({
                                  value: rate,
                                  label: `${rate}%`,
                                }))}
                                onChange={(event) =>
                                  updateItem(
                                    item.rowId,
                                    "gstRate",
                                    Number(event.target.value),
                                  )
                                }
                              />
                            )}
                          </td>

                          <td data-label="Amount" className="doc-cell-amount">
                            {previews[index]?.valid
                              ? formatPaise(previews[index].total)
                              : "—"}
                          </td>

                          <td data-label="Remove" className="doc-cell-action">
                            {!fixedLines && (
                              <button
                                type="button"
                                className="doc-remove-button"
                                aria-label={`Remove item ${index + 1}`}
                                disabled={items.length === 1}
                                onClick={() => {
                                  setItems((previous) =>
                                    previous.filter(
                                      (record) => record.rowId !== item.rowId,
                                    ),
                                  );

                                  setErrors([]);
                                }}
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  <tfoot>
                    <tr>
                      <td colSpan={5} className="doc-subtotal-label">
                        Subtotal
                      </td>

                      <td className="doc-subtotal-value">
                        {formatPaise(totals.discount)}
                      </td>

                      <td className="doc-subtotal-value">
                        {formatPaise(totals.cgst + totals.sgst + totals.igst)}
                      </td>

                      <td className="doc-subtotal-value">
                        {formatPaise(totals.total)}
                      </td>

                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {!fixedLines && (
                <div className="doc-add-item-row">
                  <button
                    type="button"
                    className="doc-dashed-line"
                    disabled={items.length >= 200}
                    onClick={() => {
                      setItems((previous) => [...previous, newItem()]);

                      setErrors([]);
                    }}
                  >
                    <Plus size={15} />
                    Add Item
                  </button>
                </div>
              )}
            </section>

            <section className="doc-bottom">
              <div className="doc-extras">
                {fixedLines ? (
                  <div className="doc-panel">
                    <h2 className="doc-panel-title">Notes</h2>

                    <p style={{ whiteSpace: "pre-wrap" }}>
                      {form.notes || "No notes added."}
                    </p>

                    {displayRecord?.deliveryTerms && (
                      <>
                        <h3>Delivery Terms</h3>

                        <p style={{ whiteSpace: "pre-wrap" }}>
                          {displayRecord.deliveryTerms}
                        </p>
                      </>
                    )}

                    {displayRecord?.termsAndConditions && (
                      <>
                        <h3>Terms and Conditions</h3>

                        <p style={{ whiteSpace: "pre-wrap" }}>
                          {displayRecord.termsAndConditions}
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      className={`doc-extra-row ${showNotes ? "is-open" : ""}`}
                      aria-expanded={showNotes}
                      onClick={() => setShowNotes((previous) => !previous)}
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
                          placeholder="Customer instructions or sales notes..."
                        />
                      </div>
                    )}
                  </>
                )}

                <p className="doc-note">
                  Payments are recorded separately through Customer Receipts.
                  Creating or posting an invoice does not mark it as paid.
                </p>

                {(fromOrder || editing) && (
                  <p className="doc-note">
                    Save the invoice with status Created, then open it and click
                    Post Invoice.
                  </p>
                )}
              </div>

              <div className="doc-summary">
                {[
                  ["Gross Amount", totals.gross],
                  ["Line Discounts", -totals.discount],
                  ["Taxable Amount", totals.taxable],

                  ...(form.taxMode === "INTRA_STATE"
                    ? [
                        ["CGST", totals.cgst],
                        ["SGST", totals.sgst],
                      ]
                    : []),

                  ...(form.taxMode === "INTER_STATE"
                    ? [["IGST", totals.igst]]
                    : []),
                ].map(([label, amount]) => (
                  <div className="doc-summary-row" key={label}>
                    <span>{label}</span>

                    <strong>{formatPaise(amount)}</strong>
                  </div>
                ))}

                <div className="doc-summary-total">
                  <span>Total Amount:</span>

                  <strong>{formatPaise(totals.total)}</strong>
                </div>

                {viewing && invoice?.status === "POSTED" && (
                  <>
                    <div className="doc-summary-row">
                      <span>Paid Amount</span>

                      <strong>{formatPaise(invoice.paidAmountPaise)}</strong>
                    </div>

                    <div className="doc-summary-row">
                      <span>Outstanding Amount</span>

                      <strong>
                        {formatPaise(invoice.outstandingAmountPaise)}
                      </strong>
                    </div>
                  </>
                )}

                <p className="doc-note">
                  {viewing
                    ? "Amounts shown are the saved invoice totals."
                    : fromOrder
                      ? "Amounts come from the saved Sales Order. The backend verifies them before creating the invoice."
                      : "Preview only. The server calculates final totals."}
                </p>
              </div>
            </section>
          </main>
        </fieldset>

        {viewing && invoice && (
          <EwayBillPanel
            invoice={invoice}
            disabled={saving || uncertainResult || Boolean(confirmation)}
            onUpdated={applyInvoice}
          />
        )}

        <div className="doc-mobile-bar">
          <div className="doc-mobile-total">
            <span>Total</span>

            <strong>{formatPaise(totals.total)}</strong>
          </div>

          <div className="doc-mobile-actions">{actionButtons}</div>
        </div>
      </form>

      <ConfirmModal
        open={Boolean(confirmation)}
        type={isPostingConfirmation ? "info" : "warning"}
        icon={isPostingConfirmation ? Send : undefined}
        title={confirmationTitle}
        message={confirmationMessage}
        confirmText={confirmationConfirmText}
        cancelText={isPostingConfirmation ? "Back" : "Stay on Page"}
        loading={saving}
        closeOnBackdrop={!saving}
        closeOnEscape={!saving}
        onCancel={closeConfirmation}
        onConfirm={handleConfirmation}
      />
    </div>
  );
}

export default function SalesInvoiceCreate({ mode = "create" }) {
  const params = useParams();
  const [searchParams] = useSearchParams();

  const tenantRevision = useTenantRevision();

  const invoiceNumber = params.invoiceNumber || params.id || "";

  const sourceOrderNumber =
    mode === "create" ? (searchParams.get("orderNumber") || "").trim() : "";

  return (
    <SalesInvoiceForm
      key={
        `${tenantRevision}-` +
        `${mode}-` +
        `${invoiceNumber}-` +
        sourceOrderNumber
      }
      mode={mode}
      invoiceNumber={invoiceNumber}
      sourceOrderNumber={sourceOrderNumber}
    />
  );
}
