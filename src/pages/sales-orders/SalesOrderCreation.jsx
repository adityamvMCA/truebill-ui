// import {
//   useEffect,
//   useMemo,
//   useRef,
//   useState,
// } from "react";

// import { useNavigate } from "react-router-dom";

// import {
//   ArrowLeft,
//   CalendarDays,
//   ChevronDown,
//   CircleHelp,
//   FileText,
//   Plus,
//   Settings,
//   StickyNote,
//   ClipboardList,
//   X,
// } from "lucide-react";

// import salesOrderApi from "../../services/modules/salesOrderApi";
// import apiClient from "../../services/apiClient";

// import EntitySearchPicker from "../../components/common/EntitySearchPicker/EntitySearchPicker";
// import useKeyboardOpen from "../../hooks/useKeyboardOpen";

// import {
//   formatInr,
//   rupeesToPaise,
// } from "../../utils/amount";

// import "./sales-order-creation.css";
// import "./sales-order-creation-responsive.css";

// /* ------------------------------------------------------------------ */
// /* Helpers                                                             */
// /* ------------------------------------------------------------------ */

// const GST_RATES = [0, 3, 5, 12, 18, 28];

// let rowCounter = 0;

// const emptyItem = () => ({
//   // Client-side row identity only; not sent in the payload.
//   lineId: `sales-order-item-${++rowCounter}`,
//   productId: "",
//   productName: "",
//   productCode: "",
//   productType: "GOODS",
//   unit: "NOS",
//   quantity: "1",
//   unitRate: "0",
//   discountPercent: "0",
//   gstRate: 18,
// });

// const normalizeId = (value) => {
//   if (!value) return "";

//   if (typeof value === "object") {
//     return String(value._id || value.id || "");
//   }

//   return String(value);
// };

// const localDate = () => {
//   const now = new Date();

//   return [
//     now.getFullYear(),
//     String(now.getMonth() + 1).padStart(2, "0"),
//     String(now.getDate()).padStart(2, "0"),
//   ].join("-");
// };

// const validDate = (value) => {
//   if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
//     return false;
//   }

//   const date = new Date(`${value}T00:00:00.000Z`);

//   return (
//     !Number.isNaN(date.getTime()) &&
//     date.toISOString().slice(0, 10) === value
//   );
// };

// const validDecimal = (
//   value,
//   scale,
//   min,
//   max = Number.MAX_SAFE_INTEGER,
// ) => {
//   if (String(value ?? "").trim() === "") {
//     return false;
//   }

//   const number = Number(value);
//   const scaled = number * scale;
//   const rounded = Math.round(scaled);

//   return (
//     Number.isFinite(number) &&
//     number >= min &&
//     number <= max &&
//     Number.isSafeInteger(rounded) &&
//     Math.abs(scaled - rounded) <= 0.000001
//   );
// };

// const getErrorMessage = (error) => {
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

// const parsePickerResponse = (
//   response,
//   resourceName,
// ) => {
//   const body = response?.data;

//   if (body?.success === false) {
//     throw new Error(
//       body.message ||
//         `Unable to load ${resourceName}.`,
//     );
//   }

//   const records = Array.isArray(body?.data)
//     ? body.data
//     : Array.isArray(body?.data?.[resourceName])
//       ? body.data[resourceName]
//       : Array.isArray(body?.[resourceName])
//         ? body[resourceName]
//         : Array.isArray(body)
//           ? body
//           : null;

//   if (!records) {
//     throw new Error(
//       `Unexpected ${resourceName} response format.`,
//     );
//   }

//   const pagination =
//     body?.pagination || body?.data?.pagination;

//   const rawTotal =
//     pagination?.total ??
//     pagination?.totalRecords ??
//     pagination?.totalItems;

//   if (
//     rawTotal === undefined ||
//     rawTotal === null ||
//     !Number.isFinite(Number(rawTotal)) ||
//     Number(rawTotal) < 0
//   ) {
//     throw new Error(
//       `The ${resourceName} endpoint must return pagination.total for paginated search.`,
//     );
//   }

//   return {
//     data: records,
//     total: Number(rawTotal),
//   };
// };

// const itemAmount = (item) => {
//   const quantity = Number(item.quantity) || 0;
//   const unitRate = Number(item.unitRate) || 0;
//   const discountPercent =
//     Number(item.discountPercent) || 0;

//   const grossAmount = quantity * unitRate;

//   const discountAmount =
//     (grossAmount * discountPercent) / 100;

//   return grossAmount - discountAmount;
// };

// /* ------------------------------------------------------------------ */
// /* Stable picker callbacks                                             */
// /* ------------------------------------------------------------------ */

// const fetchCustomerOptions = async ({
//   search,
//   page,
//   limit,
//   signal,
// }) => {
//   const response = await apiClient.get(
//     "/customers",
//     {
//       params: {
//         search,
//         page,
//         limit,
//         status: "Active",
//       },
//       signal,
//     },
//   );

//   return parsePickerResponse(
//     response,
//     "customers",
//   );
// };

// const fetchProductOptions = async ({
//   search,
//   page,
//   limit,
//   signal,
// }) => {
//   const response = await apiClient.get(
//     "/products",
//     {
//       params: {
//         search,
//         page,
//         limit,
//         status: "ACTIVE",
//       },
//       signal,
//     },
//   );

//   return parsePickerResponse(
//     response,
//     "products",
//   );
// };

// const getCustomerOptionId = (customer) =>
//   normalizeId(customer);

// const getCustomerOptionLabel = (customer) =>
//   customer.customerName ||
//   customer.customerCode ||
//   "Customer";

// const getCustomerOptionSubtitle = (customer) =>
//   [customer.customerCode, customer.gstNo]
//     .filter(Boolean)
//     .join(" · ");

// const getProductOptionId = (product) =>
//   normalizeId(product);

// const getProductOptionLabel = (product) =>
//   product.name || product.productCode || "Product";

// const getProductOptionSubtitle = (product) =>
//   [product.productCode, product.type, product.unit]
//     .filter(Boolean)
//     .join(" · ");

// const customerLabel = (customer) =>
//   customer
//     ? `${customer.customerName || "Customer"}${
//         customer.customerCode
//           ? ` (${customer.customerCode})`
//           : ""
//       }`
//     : "";

// /* ------------------------------------------------------------------ */
// /* Component                                                           */
// /* ------------------------------------------------------------------ */

// const SalesOrderCreation = () => {
//   const navigate = useNavigate();
//   const keyboardOpen = useKeyboardOpen();

//   // Only selected records are retained.
//   const [customerRecords, setCustomerRecords] =
//     useState({});

//   const [productRecords, setProductRecords] =
//     useState({});

//   const [customerId, setCustomerId] = useState("");

//   const [orderDate, setOrderDate] =
//     useState(localDate);

//   const [
//     expectedDeliveryDate,
//     setExpectedDeliveryDate,
//   ] = useState("");

//   const [taxMode, setTaxMode] =
//     useState("INTRA_STATE");

//   const [paymentTerms, setPaymentTerms] =
//     useState("Due on Receipt");

//   const [deliveryTerms, setDeliveryTerms] =
//     useState("");

//   const [items, setItems] = useState(
//     () => [emptyItem()],
//   );

//   const [notes, setNotes] = useState("");

//   const [
//     termsAndConditions,
//     setTermsAndConditions,
//   ] = useState("");

//   const [showNotes, setShowNotes] =
//     useState(false);

//   const [showTerms, setShowTerms] =
//     useState(false);

//   const [saving, setSaving] =
//     useState(false);

//   const [uncertainResult, setUncertainResult] =
//     useState(false);

//   const [message, setMessage] =
//     useState(null);

//   const [error, setError] =
//     useState(null);

//   const mountedRef = useRef(false);
//   const submitLock = useRef(false);

//   const disabled = saving || uncertainResult;

//   useEffect(() => {
//     mountedRef.current = true;

//     return () => {
//       mountedRef.current = false;
//     };
//   }, []);

//   const selectedCustomer =
//     customerRecords[customerId] || null;

//   /* ---------------------------------------------------------------- */
//   /* Original preview calculations                                     */
//   /* ---------------------------------------------------------------- */

//   const totals = useMemo(() => {
//     let gross = 0;
//     let discount = 0;
//     let taxable = 0;
//     let tax = 0;

//     items.forEach((item) => {
//       const quantity =
//         Number(item.quantity) || 0;

//       const unitRate =
//         Number(item.unitRate) || 0;

//       const discountPercent =
//         Number(item.discountPercent) || 0;

//       const gstRate =
//         Number(item.gstRate) || 0;

//       const itemGross =
//         quantity * unitRate;

//       const itemDiscount =
//         (itemGross * discountPercent) / 100;

//       const itemTaxable =
//         itemGross - itemDiscount;

//       const itemTax =
//         taxMode === "NONE"
//           ? 0
//           : (itemTaxable * gstRate) / 100;

//       gross += itemGross;
//       discount += itemDiscount;
//       taxable += itemTaxable;
//       tax += itemTax;
//     });

//     return {
//       gross,
//       discount,
//       taxable,
//       tax,
//       total: taxable + tax,
//     };
//   }, [items, taxMode]);

//   const clearFeedback = () => {
//     setError(null);
//     setMessage(null);
//   };

//   /* ---------------------------------------------------------------- */
//   /* Customer and product selection                                    */
//   /* ---------------------------------------------------------------- */

//   const selectCustomer = (
//     nextCustomerId,
//     customerRecord,
//   ) => {
//     if (disabled) return;

//     const id = nextCustomerId
//       ? String(nextCustomerId)
//       : "";

//     if (id && customerRecord) {
//       setCustomerRecords((previous) => ({
//         ...previous,
//         [id]: customerRecord,
//       }));
//     }

//     setCustomerId(id);
//     clearFeedback();
//   };

//   const updateItem = (
//     lineId,
//     field,
//     value,
//   ) => {
//     if (disabled) return;

//     setItems((previous) =>
//       previous.map((item) =>
//         item.lineId === lineId
//           ? {
//               ...item,
//               [field]: value,
//             }
//           : item,
//       ),
//     );

//     clearFeedback();
//   };

//   const handleProductChange = (
//     lineId,
//     productId,
//     productRecord,
//   ) => {
//     if (disabled) return;

//     const id = productId
//       ? String(productId)
//       : "";

//     if (id && productRecord) {
//       setProductRecords((previous) => ({
//         ...previous,
//         [id]: productRecord,
//       }));
//     }

//     setItems((previous) =>
//       previous.map((item) => {
//         if (item.lineId !== lineId) {
//           return item;
//         }

//         // Preserve manually edited pricing if the user
//         // chooses the same product again.
//         if (id && item.productId === id) {
//           return item;
//         }

//         return {
//           ...item,
//           productId: id,
//           productName:
//             productRecord?.name || "",
//           productCode:
//             productRecord?.productCode || "",
//           productType:
//             productRecord?.type || "GOODS",
//           unit:
//             productRecord?.unit || "NOS",
//           unitRate: String(
//             productRecord?.salePrice ?? 0,
//           ),
//           gstRate:
//             productRecord?.gstRate ?? 18,
//         };
//       }),
//     );

//     clearFeedback();
//   };

//   const addItem = () => {
//     if (disabled || items.length >= 200) {
//       return;
//     }

//     setItems((previous) => [
//       ...previous,
//       emptyItem(),
//     ]);

//     clearFeedback();
//   };

//   const removeItem = (lineId) => {
//     if (disabled || items.length <= 1) {
//       return;
//     }

//     setItems((previous) =>
//       previous.filter(
//         (item) => item.lineId !== lineId,
//       ),
//     );

//     clearFeedback();
//   };

//   /* ---------------------------------------------------------------- */
//   /* Validation and payload                                             */
//   /* ---------------------------------------------------------------- */

//   const validateForm = () => {
//     if (!customerId || !selectedCustomer) {
//       return "Please select a customer.";
//     }

//     if (
//       selectedCustomer.isDeleted ||
//       (
//         selectedCustomer.status !== undefined &&
//         selectedCustomer.status !== "Active"
//       )
//     ) {
//       return "Please select an active customer.";
//     }

//     if (!validDate(orderDate)) {
//       return "Please enter a valid order date.";
//     }

//     if (
//       expectedDeliveryDate &&
//       (
//         !validDate(expectedDeliveryDate) ||
//         expectedDeliveryDate < orderDate
//       )
//     ) {
//       return "Expected delivery cannot be before the order date.";
//     }

//     if (
//       !["INTRA_STATE", "INTER_STATE", "NONE"].includes(
//         taxMode,
//       )
//     ) {
//       return "Please select a valid tax mode.";
//     }

//     if (items.length < 1 || items.length > 200) {
//       return "Add between 1 and 200 order items.";
//     }

//     for (let index = 0; index < items.length; index++) {
//       const item = items[index];
//       const product =
//         productRecords[item.productId];

//       if (
//         !item.productId ||
//         !product ||
//         product.isDeleted ||
//         (
//           product.status !== undefined &&
//           product.status !== "ACTIVE"
//         )
//       ) {
//         return `Please select an active product for item ${
//           index + 1
//         }.`;
//       }

//       if (
//         !validDecimal(
//           item.quantity,
//           1000,
//           0.001,
//           1000000,
//         )
//       ) {
//         return `Check the quantity for item ${
//           index + 1
//         }; use at most three decimal places.`;
//       }

//       if (
//         !validDecimal(
//           item.unitRate,
//           100,
//           0,
//         )
//       ) {
//         return `Check the rate for item ${
//           index + 1
//         }; use at most two decimal places.`;
//       }

//       if (
//         !validDecimal(
//           item.discountPercent,
//           100,
//           0,
//           100,
//         )
//       ) {
//         return `Check the discount for item ${
//           index + 1
//         }.`;
//       }

//       if (
//         taxMode !== "NONE" &&
//         !GST_RATES.includes(
//           Number(item.gstRate),
//         )
//       ) {
//         return `Select a valid GST rate for item ${
//           index + 1
//         }.`;
//       }
//     }

//     if (
//       Object.values(totals).some(
//         (amount) =>
//           !Number.isFinite(amount) ||
//           amount < 0,
//       )
//     ) {
//       return "The order totals are invalid.";
//     }

//     return null;
//   };

//   const buildPayload = () => ({
//     customerId,
//     orderDate,

//     expectedDeliveryDate:
//       expectedDeliveryDate || null,

//     taxMode,
//     paymentTerms,

//     deliveryTerms:
//       deliveryTerms || null,

//     items: items.map((item) => ({
//       productId: item.productId,
//       quantity: Number(item.quantity),
//       unitRate: Number(item.unitRate),
//       discountPercent: Number(
//         item.discountPercent,
//       ),
//       gstRate:
//         taxMode === "NONE"
//           ? 0
//           : Number(item.gstRate),
//     })),

//     notes: notes || null,

//     termsAndConditions:
//       termsAndConditions || null,

//     action: "SAVE",
//   });

//   /* ---------------------------------------------------------------- */
//   /* Save                                                              */
//   /* ---------------------------------------------------------------- */

//   const handleSave = async () => {
//     if (disabled || submitLock.current) {
//       return;
//     }

//     setError(null);
//     setMessage(null);

//     const validationError = validateForm();

//     if (validationError) {
//       setError(validationError);
//       return;
//     }

//     submitLock.current = true;
//     setSaving(true);

//     let requestStarted = false;

//     try {
//       const payload = buildPayload();

//       requestStarted = true;

//       const response =
//         await salesOrderApi.createOrder(
//           payload,
//         );

//       const savedOrder =
//         response?.data?.data;

//       if (
//         response?.data?.success === false ||
//         !savedOrder?.orderNumber
//       ) {
//         const responseError = new Error(
//           response?.data?.message ||
//             "The server did not return an order number. Verify the order list before submitting again.",
//         );

//         responseError.uncertainResult = true;
//         throw responseError;
//       }

//       if (!mountedRef.current) return;

//       setMessage(
//         `Sales order ${savedOrder.orderNumber} created successfully`,
//       );

//       // Preserve the original post-save behavior.
//       setItems([emptyItem()]);
//       setCustomerId("");
//       setNotes("");
//       setTermsAndConditions("");

//       setCustomerRecords({});
//       setProductRecords({});
//     } catch (saveError) {
//       if (!mountedRef.current) return;

//       const status =
//         saveError?.response?.status;

//       if (
//         requestStarted &&
//         (
//           saveError.uncertainResult ||
//           !status ||
//           status >= 500 ||
//           status === 408
//         )
//       ) {
//         setUncertainResult(true);
//       }

//       setError(
//         getErrorMessage(saveError),
//       );
//     } finally {
//       submitLock.current = false;

//       if (mountedRef.current) {
//         setSaving(false);
//       }
//     }
//   };

//   const handleExit = () => {
//     if (submitLock.current) return;

//     const hasChanges =
//       customerId ||
//       notes ||
//       termsAndConditions ||
//       deliveryTerms ||
//       items.length > 1 ||
//       items.some(
//         (item) =>
//           item.productId ||
//           String(item.quantity) !== "1" ||
//           Number(item.unitRate) !== 0 ||
//           Number(item.discountPercent) !== 0,
//       );

//     if (
//       (hasChanges || uncertainResult) &&
//       !window.confirm(
//         uncertainResult
//           ? "The order may already have been saved. Leave this form and verify the order list before creating another order?"
//           : "Discard unsaved changes and leave?",
//       )
//     ) {
//       return;
//     }

//     // No new route constant is assumed.
//     navigate(-1);
//   };

//   const saveLabel = saving
//     ? "Saving..."
//     : "Save";

//   /* ---------------------------------------------------------------- */
//   /* Render — original UI classes retained                             */
//   /* ---------------------------------------------------------------- */

//   return (
//     <div
//       className={`sales-order-page ${
//         keyboardOpen
//           ? "is-keyboard-open"
//           : ""
//       }`}
//     >
//       <header className="sales-order-header">
//         <div className="sales-order-header-left">
//           <button
//             type="button"
//             className="sales-order-exit-btn"
//             disabled={saving}
//             onClick={handleExit}
//           >
//             <ArrowLeft size={14} />
//             <span>Exit</span>
//           </button>

//           <div className="sales-order-page-title">
//             <FileText size={16} />
//             <span>Create Sales Order</span>
//           </div>
//         </div>

//         <div className="sales-order-header-actions">
//           <button
//             type="button"
//             className="sales-order-icon-button"
//             aria-label="Order settings"
//             disabled={disabled}
//           >
//             <Settings size={15} />
//           </button>

//           <button
//             type="button"
//             className="sales-order-save-button"
//             onClick={handleSave}
//             disabled={disabled}
//           >
//             {saveLabel}
//           </button>
//         </div>
//       </header>

//       {(error || message) && (
//         <div
//           className={
//             error
//               ? "sales-order-alert error"
//               : "sales-order-alert success"
//           }
//           role={error ? "alert" : "status"}
//         >
//           {error || message}
//         </div>
//       )}

//       {uncertainResult && (
//         <div
//           className="sales-order-alert error"
//           role="alert"
//         >
//           The save result is uncertain. Submission is
//           locked to avoid creating a duplicate.
//           Verify the Sales Order list before creating
//           another order.
//         </div>
//       )}

//       <main className="sales-order-main">
//         <section className="sales-order-top-section">
//           <div className="sales-order-customer-section">
//             <div className="sales-order-section-heading">
//               <span>Bill To</span>

//               <button
//                 type="button"
//                 className="sales-order-small-settings-btn"
//                 aria-label="Customer settings"
//                 disabled={disabled}
//               >
//                 <Settings size={13} />
//               </button>
//             </div>

//             <EntitySearchPicker
//               placeholder="Search customer, code, GSTIN..."
//               fetchOptions={
//                 fetchCustomerOptions
//               }
//               getOptionId={
//                 getCustomerOptionId
//               }
//               getOptionLabel={
//                 getCustomerOptionLabel
//               }
//               getOptionSubtitle={
//                 getCustomerOptionSubtitle
//               }
//               selectedIds={
//                 customerId
//                   ? [customerId]
//                   : []
//               }
//               selectedLabel={
//                 customerLabel(
//                   selectedCustomer,
//                 )
//               }
//               onToggle={selectCustomer}
//               multiple={false}
//               disabled={disabled}
//               pageSize={20}
//               debounceMs={350}
//               emptyMessage="No matching customers found."
//             />

//             {selectedCustomer && (
//               <div className="sales-order-selected-customer">
//                 <strong>
//                   {
//                     selectedCustomer.customerName
//                   }
//                 </strong>

//                 <span>
//                   {
//                     selectedCustomer.customerCode
//                   }
//                 </span>

//                 {selectedCustomer.billingAddress && (
//                   <span>
//                     {
//                       selectedCustomer.billingAddress
//                     }
//                   </span>
//                 )}

//                 {selectedCustomer.gstNo && (
//                   <span>
//                     GSTIN:{" "}
//                     {
//                       selectedCustomer.gstNo
//                     }
//                   </span>
//                 )}
//               </div>
//             )}
//           </div>

//           <div className="sales-order-details-section">
//             <div className="sales-order-details-heading">
//               <span>Order Details</span>
//             </div>

//             <div className="sales-order-details-grid">
//               <label className="sales-order-field">
//                 <span>Order Date</span>

//                 <div className="sales-order-date-input">
//                   <input
//                     type="date"
//                     value={orderDate}
//                     disabled={disabled}
//                     onChange={(event) => {
//                       setOrderDate(
//                         event.target.value,
//                       );
//                       clearFeedback();
//                     }}
//                   />

//                   <CalendarDays size={14} />
//                 </div>
//               </label>

//               <label className="sales-order-field">
//                 <span>Expected Delivery</span>

//                 <div className="sales-order-date-input">
//                   <input
//                     type="date"
//                     value={
//                       expectedDeliveryDate
//                     }
//                     min={orderDate}
//                     disabled={disabled}
//                     onChange={(event) => {
//                       setExpectedDeliveryDate(
//                         event.target.value,
//                       );
//                       clearFeedback();
//                     }}
//                   />

//                   <CalendarDays size={14} />
//                 </div>
//               </label>

//               <label className="sales-order-field">
//                 <span>Tax Mode</span>

//                 <select
//                   value={taxMode}
//                   disabled={disabled}
//                   onChange={(event) => {
//                     setTaxMode(
//                       event.target.value,
//                     );
//                     clearFeedback();
//                   }}
//                 >
//                   <option value="INTRA_STATE">
//                     Intra-State
//                   </option>

//                   <option value="INTER_STATE">
//                     Inter-State
//                   </option>

//                   <option value="NONE">
//                     No GST
//                   </option>
//                 </select>
//               </label>

//               <label className="sales-order-field">
//                 <span>Payment Terms</span>

//                 <input
//                   value={paymentTerms}
//                   disabled={disabled}
//                   onChange={(event) => {
//                     setPaymentTerms(
//                       event.target.value,
//                     );
//                     clearFeedback();
//                   }}
//                 />
//               </label>
//             </div>
//           </div>
//         </section>

//         <section className="sales-order-items-section">
//           <div className="sales-order-table-wrapper">
//             <table className="sales-order-items-table">
//               <thead>
//                 <tr>
//                   <th>#</th>
//                   <th>Item</th>
//                   <th>Qty</th>
//                   <th>Rate</th>
//                   <th>Discount %</th>
//                   <th>GST %</th>
//                   <th>Amount</th>
//                   <th>
//                     <span className="sales-order-sr-only">
//                       Remove
//                     </span>
//                   </th>
//                 </tr>
//               </thead>

//               <tbody>
//                 {items.map((item, index) => (
//                   <tr key={item.lineId}>
//                     <td data-label="Item No.">
//                       {index + 1}
//                     </td>

//                     <td
//                       data-label="Item"
//                       className="sales-order-product-cell"
//                     >
//                       <EntitySearchPicker
//                         placeholder="Search product or service..."
//                         fetchOptions={
//                           fetchProductOptions
//                         }
//                         getOptionId={
//                           getProductOptionId
//                         }
//                         getOptionLabel={
//                           getProductOptionLabel
//                         }
//                         getOptionSubtitle={
//                           getProductOptionSubtitle
//                         }
//                         selectedIds={
//                           item.productId
//                             ? [item.productId]
//                             : []
//                         }
//                         selectedLabel={
//                           item.productName
//                             ? `${item.productName}${
//                                 item.productCode
//                                   ? ` (${item.productCode})`
//                                   : ""
//                               }`
//                             : ""
//                         }
//                         onToggle={(
//                           productId,
//                           productRecord,
//                         ) =>
//                           handleProductChange(
//                             item.lineId,
//                             productId,
//                             productRecord,
//                           )
//                         }
//                         multiple={false}
//                         disabled={disabled}
//                         pageSize={20}
//                         debounceMs={350}
//                         emptyMessage="No matching products or services found."
//                       />

//                       {item.productId && (
//                         <small className="sales-order-item-meta">
//                           {item.unit}
//                           {" · "}
//                           {item.productType}
//                         </small>
//                       )}
//                     </td>

//                     <td data-label="Qty">
//                       <input
//                         type="number"
//                         inputMode="decimal"
//                         min="0.001"
//                         max="1000000"
//                         step="0.001"
//                         value={item.quantity}
//                         disabled={disabled}
//                         aria-label={`Quantity ${
//                           index + 1
//                         }`}
//                         onChange={(event) =>
//                           updateItem(
//                             item.lineId,
//                             "quantity",
//                             event.target.value,
//                           )
//                         }
//                       />
//                     </td>

//                     <td data-label="Rate">
//                       <input
//                         type="number"
//                         inputMode="decimal"
//                         min="0"
//                         step="0.01"
//                         value={item.unitRate}
//                         disabled={disabled}
//                         aria-label={`Rate ${
//                           index + 1
//                         }`}
//                         onChange={(event) =>
//                           updateItem(
//                             item.lineId,
//                             "unitRate",
//                             event.target.value,
//                           )
//                         }
//                       />
//                     </td>

//                     <td data-label="Discount %">
//                       <input
//                         type="number"
//                         inputMode="decimal"
//                         min="0"
//                         max="100"
//                         step="0.01"
//                         value={
//                           item.discountPercent
//                         }
//                         disabled={disabled}
//                         aria-label={`Discount ${
//                           index + 1
//                         }`}
//                         onChange={(event) =>
//                           updateItem(
//                             item.lineId,
//                             "discountPercent",
//                             event.target.value,
//                           )
//                         }
//                       />
//                     </td>

//                     <td data-label="GST %">
//                       <select
//                         value={item.gstRate}
//                         disabled={
//                           disabled ||
//                           taxMode === "NONE"
//                         }
//                         aria-label={`GST ${
//                           index + 1
//                         }`}
//                         onChange={(event) =>
//                           updateItem(
//                             item.lineId,
//                             "gstRate",
//                             Number(
//                               event.target.value,
//                             ),
//                           )
//                         }
//                       >
//                         {GST_RATES.map(
//                           (rate) => (
//                             <option
//                               key={rate}
//                               value={rate}
//                             >
//                               {rate}%
//                             </option>
//                           ),
//                         )}
//                       </select>
//                     </td>

//                     <td
//                       data-label="Amount"
//                       className="sales-order-item-amount"
//                     >
//                       {formatInr(
//                         rupeesToPaise(
//                           itemAmount(item),
//                         ),
//                       )}
//                     </td>

//                     <td
//                       data-label="Remove"
//                       className="sales-order-remove-cell"
//                     >
//                       <button
//                         type="button"
//                         className="sales-order-delete-item-btn"
//                         disabled={
//                           disabled ||
//                           items.length <= 1
//                         }
//                         aria-label={`Remove item ${
//                           index + 1
//                         }`}
//                         onClick={() =>
//                           removeItem(
//                             item.lineId,
//                           )
//                         }
//                       >
//                         <X size={13} />
//                       </button>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>

//           <button
//             type="button"
//             className="sales-order-add-item-line"
//             disabled={
//               disabled ||
//               items.length >= 200
//             }
//             onClick={addItem}
//           >
//             <Plus size={13} />
//             <span>Add Item</span>
//           </button>
//         </section>

//         <section className="sales-order-bottom-section">
//           <div className="sales-order-extra-section">
//             <button
//               type="button"
//               className="sales-order-extra-row"
//               disabled={disabled}
//               aria-expanded={showNotes}
//               onClick={() =>
//                 setShowNotes(
//                   (previous) => !previous,
//                 )
//               }
//             >
//               <StickyNote size={14} />
//               <span>Add Notes</span>

//               <ChevronDown
//                 size={14}
//                 className={
//                   showNotes
//                     ? "rotate-icon"
//                     : ""
//                 }
//               />
//             </button>

//             {showNotes && (
//               <textarea
//                 value={notes}
//                 disabled={disabled}
//                 placeholder="Enter notes..."
//                 aria-label="Order notes"
//                 onChange={(event) => {
//                   setNotes(
//                     event.target.value,
//                   );
//                   clearFeedback();
//                 }}
//               />
//             )}

//             <button
//               type="button"
//               className="sales-order-extra-row"
//               disabled={disabled}
//               aria-expanded={showTerms}
//               onClick={() =>
//                 setShowTerms(
//                   (previous) => !previous,
//                 )
//               }
//             >
//               <ClipboardList size={14} />
//               <span>
//                 Add Terms & Conditions
//               </span>

//               <ChevronDown
//                 size={14}
//                 className={
//                   showTerms
//                     ? "rotate-icon"
//                     : ""
//                 }
//               />
//             </button>

//             {showTerms && (
//               <textarea
//                 value={
//                   termsAndConditions
//                 }
//                 disabled={disabled}
//                 placeholder="Enter terms and conditions..."
//                 aria-label="Terms and conditions"
//                 onChange={(event) => {
//                   setTermsAndConditions(
//                     event.target.value,
//                   );
//                   clearFeedback();
//                 }}
//               />
//             )}
//           </div>

//           <div className="sales-order-totals-section">
//             {[
//               ["Gross Amount", totals.gross],
//               ["Discount", totals.discount],
//               ["Taxable Amount", totals.taxable],
//               ["GST", totals.tax],
//             ].map(([label, value]) => (
//               <div
//                 key={label}
//                 className="sales-order-total-row"
//               >
//                 <span>{label}</span>

//                 <strong>
//                   {formatInr(
//                     rupeesToPaise(value),
//                   )}
//                 </strong>
//               </div>
//             ))}

//             <div className="sales-order-grand-total-row">
//               <strong>Total Amount</strong>

//               <strong>
//                 {formatInr(
//                   rupeesToPaise(
//                     totals.total,
//                   ),
//                 )}
//               </strong>
//             </div>
//           </div>
//         </section>
//       </main>

//       <div
//         className="sales-order-mobile-bar"
//         hidden={keyboardOpen}
//       >
//         <div className="sales-order-mobile-total">
//           <span>Total Amount</span>

//           <strong>
//             {formatInr(
//               rupeesToPaise(
//                 totals.total,
//               ),
//             )}
//           </strong>
//         </div>

//         <button
//           type="button"
//           className="sales-order-save-button"
//           disabled={disabled}
//           onClick={handleSave}
//         >
//           {saveLabel}
//         </button>
//       </div>

//       <button
//         type="button"
//         className="sales-order-help-button"
//         aria-label="Help"
//       >
//         <CircleHelp size={17} />
//       </button>
//     </div>
//   );
// };

// export default SalesOrderCreation;

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Capacitor } from "@capacitor/core";

import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  FileText,
  Plus,
  ScanBarcode,
  Settings,
  StickyNote,
  ClipboardList,
  X,
} from "lucide-react";

import salesOrderApi from "../../services/modules/salesOrderApi";
import apiClient from "../../services/apiClient";
import { requestCameraPermission } from "../../utils/cameraPermission";

import EntitySearchPicker from "../../components/common/EntitySearchPicker/EntitySearchPicker";
import useKeyboardOpen from "../../hooks/useKeyboardOpen";

import ScanBarcodeModal from "../barcode/ScanBarcodeModal";
import ScanSessionPanel from "../barcode/ScanSessionPanel";
import ScanConfirmSheet from "../barcode/ScanConfirmSheet";
import { barcodeApi } from "../barcode/barcodeApi";

import {
  formatInr,
  rupeesToPaise,
} from "../../utils/amount";

import "./sales-order-creation.css";
import "./sales-order-creation-responsive.css";
import "../barcode/barcode.css";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const GST_RATES = [0, 3, 5, 12, 18, 28];

let rowCounter = 0;

const emptyItem = () => ({
  // Client-side row identity only; not sent in the payload.
  lineId: `sales-order-item-${++rowCounter}`,
  productId: "",
  productName: "",
  productCode: "",
  productType: "GOODS",
  unit: "NOS",
  quantity: "1",
  unitRate: "0",
  discountPercent: "0",
  gstRate: 18,
  // set only on rows that are controlled by a phone scan session
  scanKey: "",
});

const round3 = (value) => Math.round(Number(value) * 1000) / 1000;

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

const validDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
};

const validDecimal = (
  value,
  scale,
  min,
  max = Number.MAX_SAFE_INTEGER,
) => {
  if (String(value ?? "").trim() === "") {
    return false;
  }

  const number = Number(value);
  const scaled = number * scale;
  const rounded = Math.round(scaled);

  return (
    Number.isFinite(number) &&
    number >= min &&
    number <= max &&
    Number.isSafeInteger(rounded) &&
    Math.abs(scaled - rounded) <= 0.000001
  );
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
    error?.message ||
    "Unable to complete the request."
  );
};

const parsePickerResponse = (
  response,
  resourceName,
) => {
  const body = response?.data;

  if (body?.success === false) {
    throw new Error(
      body.message ||
        `Unable to load ${resourceName}.`,
    );
  }

  const records = Array.isArray(body?.data)
    ? body.data
    : Array.isArray(body?.data?.[resourceName])
      ? body.data[resourceName]
      : Array.isArray(body?.[resourceName])
        ? body[resourceName]
        : Array.isArray(body)
          ? body
          : null;

  if (!records) {
    throw new Error(
      `Unexpected ${resourceName} response format.`,
    );
  }

  const pagination =
    body?.pagination || body?.data?.pagination;

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
      `The ${resourceName} endpoint must return pagination.total for paginated search.`,
    );
  }

  return {
    data: records,
    total: Number(rawTotal),
  };
};

const itemAmount = (item) => {
  const quantity = Number(item.quantity) || 0;
  const unitRate = Number(item.unitRate) || 0;
  const discountPercent =
    Number(item.discountPercent) || 0;

  const grossAmount = quantity * unitRate;

  const discountAmount =
    (grossAmount * discountPercent) / 100;

  return grossAmount - discountAmount;
};

/* ------------------------------------------------------------------ */
/* Stable picker callbacks                                             */
/* ------------------------------------------------------------------ */

const fetchCustomerOptions = async ({
  search,
  page,
  limit,
  signal,
}) => {
  const response = await apiClient.get(
    "/customers",
    {
      params: {
        search,
        page,
        limit,
        status: "Active",
      },
      signal,
    },
  );

  return parsePickerResponse(
    response,
    "customers",
  );
};

const fetchProductOptions = async ({
  search,
  page,
  limit,
  signal,
}) => {
  const response = await apiClient.get(
    "/products",
    {
      params: {
        search,
        page,
        limit,
        status: "ACTIVE",
      },
      signal,
    },
  );

  return parsePickerResponse(
    response,
    "products",
  );
};

const getCustomerOptionId = (customer) =>
  normalizeId(customer);

const getCustomerOptionLabel = (customer) =>
  customer.customerName ||
  customer.customerCode ||
  "Customer";

const getCustomerOptionSubtitle = (customer) =>
  [customer.customerCode, customer.gstNo]
    .filter(Boolean)
    .join(" · ");

const getProductOptionId = (product) =>
  normalizeId(product);

const getProductOptionLabel = (product) =>
  product.name || product.productCode || "Product";

const getProductOptionSubtitle = (product) =>
  [product.productCode, product.type, product.unit]
    .filter(Boolean)
    .join(" · ");

const customerLabel = (customer) =>
  customer
    ? `${customer.customerName || "Customer"}${
        customer.customerCode
          ? ` (${customer.customerCode})`
          : ""
      }`
    : "";

const IS_NATIVE = Capacitor.isNativePlatform();

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

const SalesOrderCreation = () => {
  const navigate = useNavigate();
  const keyboardOpen = useKeyboardOpen();

  // Only selected records are retained.
  const [customerRecords, setCustomerRecords] =
    useState({});

  const [productRecords, setProductRecords] =
    useState({});

  const [customerId, setCustomerId] = useState("");

  const [orderDate, setOrderDate] =
    useState(localDate);

  const [
    expectedDeliveryDate,
    setExpectedDeliveryDate,
  ] = useState("");

  const [taxMode, setTaxMode] =
    useState("INTRA_STATE");

  const [paymentTerms, setPaymentTerms] =
    useState("Due on Receipt");

  const [deliveryTerms, setDeliveryTerms] =
    useState("");

  const [items, setItems] = useState(
    () => [emptyItem()],
  );

  const [notes, setNotes] = useState("");

  const [
    termsAndConditions,
    setTermsAndConditions,
  ] = useState("");

  const [showNotes, setShowNotes] =
    useState(false);

  const [showTerms, setShowTerms] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [uncertainResult, setUncertainResult] =
    useState(false);

  const [message, setMessage] =
    useState(null);

  const [error, setError] =
    useState(null);

  // barcode scanning
  const [scanOpen, setScanOpen] = useState(false);
  const [scanPending, setScanPending] = useState(null);
  const [panelKey, setPanelKey] = useState(0);

  const mountedRef = useRef(false);
  const submitLock = useRef(false);

  const disabled = saving || uncertainResult;

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const selectedCustomer =
    customerRecords[customerId] || null;

  /* ---------------------------------------------------------------- */
  /* Original preview calculations                                     */
  /* ---------------------------------------------------------------- */

  const totals = useMemo(() => {
    let gross = 0;
    let discount = 0;
    let taxable = 0;
    let tax = 0;

    items.forEach((item) => {
      const quantity =
        Number(item.quantity) || 0;

      const unitRate =
        Number(item.unitRate) || 0;

      const discountPercent =
        Number(item.discountPercent) || 0;

      const gstRate =
        Number(item.gstRate) || 0;

      const itemGross =
        quantity * unitRate;

      const itemDiscount =
        (itemGross * discountPercent) / 100;

      const itemTaxable =
        itemGross - itemDiscount;

      const itemTax =
        taxMode === "NONE"
          ? 0
          : (itemTaxable * gstRate) / 100;

      gross += itemGross;
      discount += itemDiscount;
      taxable += itemTaxable;
      tax += itemTax;
    });

    return {
      gross,
      discount,
      taxable,
      tax,
      total: taxable + tax,
    };
  }, [items, taxMode]);

  const clearFeedback = () => {
    setError(null);
    setMessage(null);
  };

  /* ---------------------------------------------------------------- */
  /* Customer and product selection                                    */
  /* ---------------------------------------------------------------- */

  const selectCustomer = (
    nextCustomerId,
    customerRecord,
  ) => {
    if (disabled) return;

    const id = nextCustomerId
      ? String(nextCustomerId)
      : "";

    if (id && customerRecord) {
      setCustomerRecords((previous) => ({
        ...previous,
        [id]: customerRecord,
      }));
    }

    setCustomerId(id);
    clearFeedback();
  };

  const updateItem = (
    lineId,
    field,
    value,
  ) => {
    if (disabled) return;

    setItems((previous) =>
      previous.map((item) =>
        item.lineId === lineId
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );

    clearFeedback();
  };

  const handleProductChange = (
    lineId,
    productId,
    productRecord,
  ) => {
    if (disabled) return;

    const id = productId
      ? String(productId)
      : "";

    if (id && productRecord) {
      setProductRecords((previous) => ({
        ...previous,
        [id]: productRecord,
      }));
    }

    setItems((previous) =>
      previous.map((item) => {
        if (item.lineId !== lineId) {
          return item;
        }

        // Preserve manually edited pricing if the user
        // chooses the same product again.
        if (id && item.productId === id) {
          return item;
        }

        return {
          ...item,
          productId: id,
          productName:
            productRecord?.name || "",
          productCode:
            productRecord?.productCode || "",
          productType:
            productRecord?.type || "GOODS",
          unit:
            productRecord?.unit || "NOS",
          unitRate: String(
            productRecord?.salePrice ?? 0,
          ),
          gstRate:
            productRecord?.gstRate ?? 18,
        };
      }),
    );

    clearFeedback();
  };

  const addItem = () => {
    if (disabled || items.length >= 200) {
      return;
    }

    setItems((previous) => [
      ...previous,
      emptyItem(),
    ]);

    clearFeedback();
  };

  const removeItem = (lineId) => {
    if (disabled || items.length <= 1) {
      return;
    }

    setItems((previous) => {
      const next = previous.filter(
        (item) => item.lineId !== lineId,
      );

      return next.length ? next : [emptyItem()];
    });

    clearFeedback();
  };

  /* ---------------------------------------------------------------- */
  /* BARCODE: phone → browser live sync                                 */
  /* ---------------------------------------------------------------- */

  /**
   * Lines come from the scan session (quantities already in the product's base unit).
   * Scan rows are upserted by product; manual rows are left untouched.
   * Price / discount / GST edits the user made on a scan row are preserved.
   */
  const applyScanLines = useCallback((lines) => {
    const byProduct = new Map();

    for (const line of lines) {
      const group = byProduct.get(line.productId);

      if (group) {
        group.quantity += Number(line.quantity) || 0;
      } else {
        byProduct.set(line.productId, {
          ...line,
          quantity: Number(line.quantity) || 0,
        });
      }
    }

    const groups = [...byProduct.values()].filter(
      (group) => group.quantity > 0,
    );

    setProductRecords((previous) => {
      const next = { ...previous };

      for (const group of groups) {
        next[group.productId] = {
          _id: group.productId,
          name: group.name,
          productCode: group.productCode,
          type: group.productType,
          unit: group.unit,
          salePrice: group.salePrice,
          gstRate: group.gstRate,
          status: group.status,
        };
      }

      return next;
    });

    setItems((previous) => {
      const hadScanRows = previous.some(
        (item) => item.scanKey,
      );

      if (!groups.length && !hadScanRows) {
        return previous;
      }

      const manual = previous.filter(
        (item) => !item.scanKey,
      );

      const scanned = groups.map((group) => {
        const key = `scan-${group.productId}`;

        const existing = previous.find(
          (item) => item.scanKey === key,
        );

        return {
          ...(existing || emptyItem()),
          scanKey: key,
          productId: group.productId,
          productName: group.name || "",
          productCode: group.productCode || "",
          productType: group.productType || "GOODS",
          unit: group.unit || "NOS",
          quantity: String(round3(group.quantity)),
          unitRate: existing
            ? existing.unitRate
            : String(group.salePrice ?? 0),
          discountPercent: existing
            ? existing.discountPercent
            : "0",
          gstRate: existing
            ? existing.gstRate
            : (group.gstRate ?? 18),
        };
      });

      // drop untouched blank placeholder rows once real rows exist
      const keptManual = scanned.length
        ? manual.filter((item) => item.productId)
        : manual;

      const next = [...keptManual, ...scanned];

      return next.length ? next : [emptyItem()];
    });

    clearFeedback();
  }, []);

  // scan session ended: keep rows, but make them normal editable rows
  const endScanSession = useCallback(() => {
    setItems((previous) =>
      previous.map((item) =>
        item.scanKey
          ? { ...item, scanKey: "" }
          : item,
      ),
    );
  }, []);

  /* ---------------------------------------------------------------- */
  /* BARCODE: scan directly in the mobile app                           */
  /* ---------------------------------------------------------------- */

  const openScanner = useCallback(async () => {
    if (disabled) return;

    try {
      const result = await requestCameraPermission();

      if (!result?.granted) {
        toast.error(
          result?.message ||
            "Camera permission is required to scan barcodes.",
        );
        return;
      }

      setScanOpen(true);
    } catch {
      toast.error(
        "Unable to access the camera. Please check app permissions.",
      );
    }
  }, [disabled]);

  const handleScanFound = async ({
    barcode,
    product,
    packaging,
  } = {}) => {
    setScanOpen(false);

    let record = product;

    // older cached catalogue rows have no GST rate: fetch the fresh record
    if (
      record &&
      record.gstRate === undefined &&
      navigator.onLine
    ) {
      try {
        const { data } =
          await barcodeApi.lookup(barcode);

        record = data?.data?.product || record;
      } catch {
        /* keep cached record */
      }
    }

    if (!record?._id) {
      toast.error(
        "The scanned barcode is linked to an invalid product.",
      );
      return;
    }

    if (record.status && record.status !== "ACTIVE") {
      toast.error(`${record.name} is inactive.`);
      return;
    }

    setScanPending({
      barcode,
      product: record,
      packaging,
      qty: 1,
    });
  };

  const handleScanUnknown = ({ barcode } = {}) => {
    setScanOpen(false);

    toast.error(
      `Barcode ${barcode || ""} is not registered. Register it in Products first.`,
    );
  };

  const confirmScanned = (scanNext) => {
    if (!scanPending) return;

    const { product, packaging } = scanPending;
    const qty = Number(scanPending.qty);

    if (!validDecimal(qty, 1000, 0.001, 1000000)) {
      toast.error(
        "Enter a valid quantity (up to 3 decimals).",
      );
      return;
    }

    const base = round3(
      qty * (Number(packaging?.conversionQuantity) || 1),
    );

    const productId = String(product._id);

    if (
      items.length >= 200 &&
      !items.some((item) => item.productId === productId)
    ) {
      toast.error("An order can have at most 200 items.");
      return;
    }

    setProductRecords((previous) => ({
      ...previous,
      [productId]: product,
    }));

    setItems((previous) => {
      const index = previous.findIndex(
        (item) =>
          item.productId === productId &&
          !item.scanKey,
      );

      // same product already on the order → add to its quantity
      if (index >= 0) {
        return previous.map((item, position) =>
          position === index
            ? {
                ...item,
                quantity: String(
                  round3(
                    (Number(item.quantity) || 0) + base,
                  ),
                ),
              }
            : item,
        );
      }

      const row = {
        ...emptyItem(),
        productId,
        productName: product.name || "",
        productCode: product.productCode || "",
        productType: product.type || "GOODS",
        unit: product.unit || "NOS",
        quantity: String(base),
        unitRate: String(product.salePrice ?? 0),
        gstRate: product.gstRate ?? 18,
      };

      // replace blank placeholder rows
      const kept = previous.filter(
        (item) => item.productId || item.scanKey,
      );

      return [...kept, row];
    });

    toast.success(
      `${product.name} × ${base} ${product.unit || ""} added`,
    );

    clearFeedback();
    setScanPending(null);

    if (scanNext) {
      setTimeout(() => setScanOpen(true), 150);
    }
  };

  /* ---------------------------------------------------------------- */
  /* Validation and payload                                             */
  /* ---------------------------------------------------------------- */

  const validateForm = () => {
    if (!customerId || !selectedCustomer) {
      return "Please select a customer.";
    }

    if (
      selectedCustomer.isDeleted ||
      (
        selectedCustomer.status !== undefined &&
        selectedCustomer.status !== "Active"
      )
    ) {
      return "Please select an active customer.";
    }

    if (!validDate(orderDate)) {
      return "Please enter a valid order date.";
    }

    if (
      expectedDeliveryDate &&
      (
        !validDate(expectedDeliveryDate) ||
        expectedDeliveryDate < orderDate
      )
    ) {
      return "Expected delivery cannot be before the order date.";
    }

    if (
      !["INTRA_STATE", "INTER_STATE", "NONE"].includes(
        taxMode,
      )
    ) {
      return "Please select a valid tax mode.";
    }

    if (items.length < 1 || items.length > 200) {
      return "Add between 1 and 200 order items.";
    }

    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const product =
        productRecords[item.productId];

      if (
        !item.productId ||
        !product ||
        product.isDeleted ||
        (
          product.status !== undefined &&
          product.status !== "ACTIVE"
        )
      ) {
        return `Please select an active product for item ${
          index + 1
        }.`;
      }

      if (
        !validDecimal(
          item.quantity,
          1000,
          0.001,
          1000000,
        )
      ) {
        return `Check the quantity for item ${
          index + 1
        }; use at most three decimal places.`;
      }

      if (
        !validDecimal(
          item.unitRate,
          100,
          0,
        )
      ) {
        return `Check the rate for item ${
          index + 1
        }; use at most two decimal places.`;
      }

      if (
        !validDecimal(
          item.discountPercent,
          100,
          0,
          100,
        )
      ) {
        return `Check the discount for item ${
          index + 1
        }.`;
      }

      if (
        taxMode !== "NONE" &&
        !GST_RATES.includes(
          Number(item.gstRate),
        )
      ) {
        return `Select a valid GST rate for item ${
          index + 1
        }.`;
      }
    }

    if (
      Object.values(totals).some(
        (amount) =>
          !Number.isFinite(amount) ||
          amount < 0,
      )
    ) {
      return "The order totals are invalid.";
    }

    return null;
  };

  const buildPayload = () => ({
    customerId,
    orderDate,

    expectedDeliveryDate:
      expectedDeliveryDate || null,

    taxMode,
    paymentTerms,

    deliveryTerms:
      deliveryTerms || null,

    items: items.map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
      unitRate: Number(item.unitRate),
      discountPercent: Number(
        item.discountPercent,
      ),
      gstRate:
        taxMode === "NONE"
          ? 0
          : Number(item.gstRate),
    })),

    notes: notes || null,

    termsAndConditions:
      termsAndConditions || null,

    action: "SAVE",
  });

  /* ---------------------------------------------------------------- */
  /* Save                                                              */
  /* ---------------------------------------------------------------- */

  const handleSave = async () => {
    if (disabled || submitLock.current) {
      return;
    }

    setError(null);
    setMessage(null);

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    submitLock.current = true;
    setSaving(true);

    let requestStarted = false;

    try {
      const payload = buildPayload();

      requestStarted = true;

      const response =
        await salesOrderApi.createOrder(
          payload,
        );

      const savedOrder =
        response?.data?.data;

      if (
        response?.data?.success === false ||
        !savedOrder?.orderNumber
      ) {
        const responseError = new Error(
          response?.data?.message ||
            "The server did not return an order number. Verify the order list before submitting again.",
        );

        responseError.uncertainResult = true;
        throw responseError;
      }

      if (!mountedRef.current) return;

      setMessage(
        `Sales order ${savedOrder.orderNumber} created successfully`,
      );

      // Preserve the original post-save behavior.
      setItems([emptyItem()]);
      setCustomerId("");
      setNotes("");
      setTermsAndConditions("");

      setCustomerRecords({});
      setProductRecords({});

      // remount the scan panel: closes the old session, next order starts fresh
      setPanelKey((value) => value + 1);
    } catch (saveError) {
      if (!mountedRef.current) return;

      const status =
        saveError?.response?.status;

      if (
        requestStarted &&
        (
          saveError.uncertainResult ||
          !status ||
          status >= 500 ||
          status === 408
        )
      ) {
        setUncertainResult(true);
      }

      setError(
        getErrorMessage(saveError),
      );
    } finally {
      submitLock.current = false;

      if (mountedRef.current) {
        setSaving(false);
      }
    }
  };

  const handleExit = () => {
    if (submitLock.current) return;

    const hasChanges =
      customerId ||
      notes ||
      termsAndConditions ||
      deliveryTerms ||
      items.length > 1 ||
      items.some(
        (item) =>
          item.productId ||
          String(item.quantity) !== "1" ||
          Number(item.unitRate) !== 0 ||
          Number(item.discountPercent) !== 0,
      );

    if (
      (hasChanges || uncertainResult) &&
      !window.confirm(
        uncertainResult
          ? "The order may already have been saved. Leave this form and verify the order list before creating another order?"
          : "Discard unsaved changes and leave?",
      )
    ) {
      return;
    }

    // No new route constant is assumed.
    navigate(-1);
  };

  const saveLabel = saving
    ? "Saving..."
    : "Save";

  /* ---------------------------------------------------------------- */
  /* Render — original UI classes retained                             */
  /* ---------------------------------------------------------------- */

  return (
    <div
      className={`sales-order-page ${
        keyboardOpen
          ? "is-keyboard-open"
          : ""
      }`}
    >
      <header className="sales-order-header">
        <div className="sales-order-header-left">
          <button
            type="button"
            className="sales-order-exit-btn"
            disabled={saving}
            onClick={handleExit}
          >
            <ArrowLeft size={14} />
            <span>Exit</span>
          </button>

          <div className="sales-order-page-title">
            <FileText size={16} />
            <span>Create Sales Order</span>
          </div>
        </div>

        <div className="sales-order-header-actions">
          <button
            type="button"
            className="sales-order-icon-button"
            aria-label="Order settings"
            disabled={disabled}
          >
            <Settings size={15} />
          </button>

          <button
            type="button"
            className="sales-order-save-button"
            onClick={handleSave}
            disabled={disabled}
          >
            {saveLabel}
          </button>
        </div>
      </header>

      {(error || message) && (
        <div
          className={
            error
              ? "sales-order-alert error"
              : "sales-order-alert success"
          }
          role={error ? "alert" : "status"}
        >
          {error || message}
        </div>
      )}

      {uncertainResult && (
        <div
          className="sales-order-alert error"
          role="alert"
        >
          The save result is uncertain. Submission is
          locked to avoid creating a duplicate.
          Verify the Sales Order list before creating
          another order.
        </div>
      )}

      <main className="sales-order-main">
        <section className="sales-order-top-section">
          <div className="sales-order-customer-section">
            <div className="sales-order-section-heading">
              <span>Bill To</span>

              <button
                type="button"
                className="sales-order-small-settings-btn"
                aria-label="Customer settings"
                disabled={disabled}
              >
                <Settings size={13} />
              </button>
            </div>

            <EntitySearchPicker
              placeholder="Search customer, code, GSTIN..."
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
                customerId
                  ? [customerId]
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
              <div className="sales-order-selected-customer">
                <strong>
                  {
                    selectedCustomer.customerName
                  }
                </strong>

                <span>
                  {
                    selectedCustomer.customerCode
                  }
                </span>

                {selectedCustomer.billingAddress && (
                  <span>
                    {
                      selectedCustomer.billingAddress
                    }
                  </span>
                )}

                {selectedCustomer.gstNo && (
                  <span>
                    GSTIN:{" "}
                    {
                      selectedCustomer.gstNo
                    }
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="sales-order-details-section">
            <div className="sales-order-details-heading">
              <span>Order Details</span>
            </div>

            <div className="sales-order-details-grid">
              <label className="sales-order-field">
                <span>Order Date</span>

                <div className="sales-order-date-input">
                  <input
                    type="date"
                    value={orderDate}
                    disabled={disabled}
                    onChange={(event) => {
                      setOrderDate(
                        event.target.value,
                      );
                      clearFeedback();
                    }}
                  />

                  <CalendarDays size={14} />
                </div>
              </label>

              <label className="sales-order-field">
                <span>Expected Delivery</span>

                <div className="sales-order-date-input">
                  <input
                    type="date"
                    value={
                      expectedDeliveryDate
                    }
                    min={orderDate}
                    disabled={disabled}
                    onChange={(event) => {
                      setExpectedDeliveryDate(
                        event.target.value,
                      );
                      clearFeedback();
                    }}
                  />

                  <CalendarDays size={14} />
                </div>
              </label>

              <label className="sales-order-field">
                <span>Tax Mode</span>

                <select
                  value={taxMode}
                  disabled={disabled}
                  onChange={(event) => {
                    setTaxMode(
                      event.target.value,
                    );
                    clearFeedback();
                  }}
                >
                  <option value="INTRA_STATE">
                    Intra-State
                  </option>

                  <option value="INTER_STATE">
                    Inter-State
                  </option>

                  <option value="NONE">
                    No GST
                  </option>
                </select>
              </label>

              <label className="sales-order-field">
                <span>Payment Terms</span>

                <input
                  value={paymentTerms}
                  disabled={disabled}
                  onChange={(event) => {
                    setPaymentTerms(
                      event.target.value,
                    );
                    clearFeedback();
                  }}
                />
              </label>
            </div>
          </div>
        </section>

        {/* BARCODE: mobile app → camera; web browser → phone sync panel */}
        <section className="sales-order-scan-section">
          {IS_NATIVE ? (
            <button
              type="button"
              className="bcx-btn is-primary"
              style={{ width: "100%" }}
              disabled={disabled}
              onClick={openScanner}
            >
              <ScanBarcode size={16} />
              Scan product
            </button>
          ) : (
            <ScanSessionPanel
              key={panelKey}
              documentType="SALES"
              disabled={disabled}
              onItemsChange={applyScanLines}
              onEnd={endScanSession}
            />
          )}
        </section>

        <section className="sales-order-items-section">
          <div className="sales-order-table-wrapper">
            <table className="sales-order-items-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Discount %</th>
                  <th>GST %</th>
                  <th>Amount</th>
                  <th>
                    <span className="sales-order-sr-only">
                      Remove
                    </span>
                  </th>
                </tr>
              </thead>

              <tbody>
                {items.map((item, index) => (
                  <tr key={item.lineId}>
                    <td data-label="Item No.">
                      {index + 1}
                    </td>

                    <td
                      data-label="Item"
                      className="sales-order-product-cell"
                    >
                      <EntitySearchPicker
                        placeholder="Search product or service..."
                        fetchOptions={
                          fetchProductOptions
                        }
                        getOptionId={
                          getProductOptionId
                        }
                        getOptionLabel={
                          getProductOptionLabel
                        }
                        getOptionSubtitle={
                          getProductOptionSubtitle
                        }
                        selectedIds={
                          item.productId
                            ? [item.productId]
                            : []
                        }
                        selectedLabel={
                          item.productName
                            ? `${item.productName}${
                                item.productCode
                                  ? ` (${item.productCode})`
                                  : ""
                              }`
                            : ""
                        }
                        onToggle={(
                          productId,
                          productRecord,
                        ) =>
                          handleProductChange(
                            item.lineId,
                            productId,
                            productRecord,
                          )
                        }
                        multiple={false}
                        disabled={
                          disabled ||
                          Boolean(item.scanKey)
                        }
                        pageSize={20}
                        debounceMs={350}
                        emptyMessage="No matching products or services found."
                      />

                      {item.productId && (
                        <small className="sales-order-item-meta">
                          {item.unit}
                          {" · "}
                          {item.productType}
                          {item.scanKey
                            ? " · Scanned (edit qty in scan panel)"
                            : ""}
                        </small>
                      )}
                    </td>

                    <td data-label="Qty">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0.001"
                        max="1000000"
                        step="0.001"
                        value={item.quantity}
                        disabled={
                          disabled ||
                          Boolean(item.scanKey)
                        }
                        aria-label={`Quantity ${
                          index + 1
                        }`}
                        onChange={(event) =>
                          updateItem(
                            item.lineId,
                            "quantity",
                            event.target.value,
                          )
                        }
                      />
                    </td>

                    <td data-label="Rate">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={item.unitRate}
                        disabled={disabled}
                        aria-label={`Rate ${
                          index + 1
                        }`}
                        onChange={(event) =>
                          updateItem(
                            item.lineId,
                            "unitRate",
                            event.target.value,
                          )
                        }
                      />
                    </td>

                    <td data-label="Discount %">
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        max="100"
                        step="0.01"
                        value={
                          item.discountPercent
                        }
                        disabled={disabled}
                        aria-label={`Discount ${
                          index + 1
                        }`}
                        onChange={(event) =>
                          updateItem(
                            item.lineId,
                            "discountPercent",
                            event.target.value,
                          )
                        }
                      />
                    </td>

                    <td data-label="GST %">
                      <select
                        value={item.gstRate}
                        disabled={
                          disabled ||
                          taxMode === "NONE"
                        }
                        aria-label={`GST ${
                          index + 1
                        }`}
                        onChange={(event) =>
                          updateItem(
                            item.lineId,
                            "gstRate",
                            Number(
                              event.target.value,
                            ),
                          )
                        }
                      >
                        {GST_RATES.map(
                          (rate) => (
                            <option
                              key={rate}
                              value={rate}
                            >
                              {rate}%
                            </option>
                          ),
                        )}
                      </select>
                    </td>

                    <td
                      data-label="Amount"
                      className="sales-order-item-amount"
                    >
                      {formatInr(
                        rupeesToPaise(
                          itemAmount(item),
                        ),
                      )}
                    </td>

                    <td
                      data-label="Remove"
                      className="sales-order-remove-cell"
                    >
                      <button
                        type="button"
                        className="sales-order-delete-item-btn"
                        disabled={
                          disabled ||
                          Boolean(item.scanKey) ||
                          items.length <= 1
                        }
                        title={
                          item.scanKey
                            ? "Remove it in the scan panel"
                            : undefined
                        }
                        aria-label={`Remove item ${
                          index + 1
                        }`}
                        onClick={() =>
                          removeItem(
                            item.lineId,
                          )
                        }
                      >
                        <X size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            className="sales-order-add-item-line"
            disabled={
              disabled ||
              items.length >= 200
            }
            onClick={addItem}
          >
            <Plus size={13} />
            <span>Add Item</span>
          </button>
        </section>

        <section className="sales-order-bottom-section">
          <div className="sales-order-extra-section">
            <button
              type="button"
              className="sales-order-extra-row"
              disabled={disabled}
              aria-expanded={showNotes}
              onClick={() =>
                setShowNotes(
                  (previous) => !previous,
                )
              }
            >
              <StickyNote size={14} />
              <span>Add Notes</span>

              <ChevronDown
                size={14}
                className={
                  showNotes
                    ? "rotate-icon"
                    : ""
                }
              />
            </button>

            {showNotes && (
              <textarea
                value={notes}
                disabled={disabled}
                placeholder="Enter notes..."
                aria-label="Order notes"
                onChange={(event) => {
                  setNotes(
                    event.target.value,
                  );
                  clearFeedback();
                }}
              />
            )}

            <button
              type="button"
              className="sales-order-extra-row"
              disabled={disabled}
              aria-expanded={showTerms}
              onClick={() =>
                setShowTerms(
                  (previous) => !previous,
                )
              }
            >
              <ClipboardList size={14} />
              <span>
                Add Terms & Conditions
              </span>

              <ChevronDown
                size={14}
                className={
                  showTerms
                    ? "rotate-icon"
                    : ""
                }
              />
            </button>

            {showTerms && (
              <textarea
                value={
                  termsAndConditions
                }
                disabled={disabled}
                placeholder="Enter terms and conditions..."
                aria-label="Terms and conditions"
                onChange={(event) => {
                  setTermsAndConditions(
                    event.target.value,
                  );
                  clearFeedback();
                }}
              />
            )}
          </div>

          <div className="sales-order-totals-section">
            {[
              ["Gross Amount", totals.gross],
              ["Discount", totals.discount],
              ["Taxable Amount", totals.taxable],
              ["GST", totals.tax],
            ].map(([label, value]) => (
              <div
                key={label}
                className="sales-order-total-row"
              >
                <span>{label}</span>

                <strong>
                  {formatInr(
                    rupeesToPaise(value),
                  )}
                </strong>
              </div>
            ))}

            <div className="sales-order-grand-total-row">
              <strong>Total Amount</strong>

              <strong>
                {formatInr(
                  rupeesToPaise(
                    totals.total,
                  ),
                )}
              </strong>
            </div>
          </div>
        </section>
      </main>

      <div
        className="sales-order-mobile-bar"
        hidden={keyboardOpen}
      >
        <div className="sales-order-mobile-total">
          <span>Total Amount</span>

          <strong>
            {formatInr(
              rupeesToPaise(
                totals.total,
              ),
            )}
          </strong>
        </div>

        <button
          type="button"
          className="sales-order-save-button"
          disabled={disabled}
          onClick={handleSave}
        >
          {saveLabel}
        </button>
      </div>

      <button
        type="button"
        className="sales-order-help-button"
        aria-label="Help"
      >
        <CircleHelp size={17} />
      </button>

      {/* BARCODE: camera scanner + confirm sheet (mobile app) */}
      <ScanBarcodeModal
        open={scanOpen}
        title="Scan product"
        onClose={() => setScanOpen(false)}
        onFound={handleScanFound}
        onUnknown={handleScanUnknown}
      />

      <ScanConfirmSheet
        pending={scanPending}
        confirmText="Add to order"
        onChange={(qty) =>
          setScanPending((current) =>
            current ? { ...current, qty } : current,
          )
        }
        onCancel={() => setScanPending(null)}
        onConfirm={confirmScanned}
      />
    </div>
  );
};

export default SalesOrderCreation;