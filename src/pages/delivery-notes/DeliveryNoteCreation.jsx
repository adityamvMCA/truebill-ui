
// import {
//   useEffect,
//   useMemo,
//   useRef,
//   useState,
// } from "react";

// import { useNavigate } from "react-router-dom";

// import {
//   ArrowLeft,
//   CheckCircle2,
//   ChevronDown,
//   ClipboardList,
//   Plus,
//   Save,
//   StickyNote,
//   Trash2,
//   Truck,
// } from "lucide-react";

// import toast from "react-hot-toast";

// import Input from "../../components/common/Form/Input";
// import Textarea from "../../components/common/Form/Textarea";
// import Button from "../../components/common/Form/Button";

// import EntitySearchPicker from "../../components/common/EntitySearchPicker/EntitySearchPicker";
// import useKeyboardOpen from "../../hooks/useKeyboardOpen";

// import api from "../../services/api";
// import apiClient from "../../services/apiClient";

// import "../../styles/invoice-common1.css";
// import "./delivery-note-creation.css";
// import "./delivery-note-creation-responsive.css";

// /* ------------------------------------------------------------------ */
// /* Constants and helpers                                               */
// /* ------------------------------------------------------------------ */

// const DEFAULT_LIST_PATH = "/sales/delivery-notes";

// const localDate = () => {
//   const date = new Date();

//   return [
//     date.getFullYear(),
//     String(date.getMonth() + 1).padStart(2, "0"),
//     String(date.getDate()).padStart(2, "0"),
//   ].join("-");
// };

// const initialForm = () => ({
//   customerId: "",
//   deliveryDate: localDate(),
//   expectedDeliveryDate: "",

//   contactPerson: "",
//   contactPhone: "",
//   billingAddress: "",
//   shippingAddress: "",

//   customerReference: "",
//   transporterName: "",
//   vehicleNumber: "",
//   trackingNumber: "",

//   transportDocumentNumber: "",
//   transportDocumentDate: "",
//   eWayBillNumber: "",

//   notes: "",
//   termsAndConditions: "",
// });

// let rowSequence = 0;

// const newItem = () => ({
//   rowId: `delivery-item-${++rowSequence}`,
//   productId: "",
//   quantity: "1",
//   specification: "",
//   notes: "",
// });

// const recordId = (value) => {
//   if (!value) return "";

//   if (typeof value === "object") {
//     return String(
//       value._id || value.id || "",
//     );
//   }

//   return String(value);
// };

// const getErrors = (error) => {
//   const body = error?.response?.data;

//   if (
//     Array.isArray(body?.errors) &&
//     body.errors.length
//   ) {
//     return body.errors.map((item) =>
//       typeof item === "string"
//         ? item
//         : item?.message ||
//           item?.msg ||
//           String(item),
//     );
//   }

//   return [
//     body?.message ||
//       error?.message ||
//       "Unable to complete the request.",
//   ];
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

//   const data = Array.isArray(body?.data)
//     ? body.data
//     : Array.isArray(body?.data?.[resourceName])
//       ? body.data[resourceName]
//       : Array.isArray(body?.[resourceName])
//         ? body[resourceName]
//         : Array.isArray(body)
//           ? body
//           : null;

//   if (!data) {
//     throw new Error(
//       `Invalid ${resourceName} response.`,
//     );
//   }

//   const pagination =
//     body?.pagination ||
//     body?.data?.pagination;

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
//     data,
//     total: Number(rawTotal),
//   };
// };

// const parseQuantity = (value) => {
//   const input = String(value ?? "").trim();

//   if (!/^\d+(?:\.\d{1,3})?$/.test(input)) {
//     return null;
//   }

//   const quantity = Number(input);

//   if (
//     !Number.isFinite(quantity) ||
//     quantity < 0.001 ||
//     quantity > 1000000
//   ) {
//     return null;
//   }

//   return quantity;
// };

// const validDate = (value) => {
//   if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
//     return false;
//   }

//   const date = new Date(
//     `${value}T00:00:00.000Z`,
//   );

//   return (
//     !Number.isNaN(date.getTime()) &&
//     date.toISOString().slice(0, 10) === value
//   );
// };

// const addressText = (customer, type) => {
//   if (!customer) return "";

//   const address =
//     type === "shipping"
//       ? customer.shippingAddress ||
//         customer.billingAddress
//       : customer.billingAddress;

//   return [
//     address,
//     customer.city,
//     customer.state,
//     customer.pincode,
//     customer.country,
//   ]
//     .filter(Boolean)
//     .join(", ");
// };

// const customerLabel = (customer) =>
//   customer
//     ? `${customer.customerName || "Customer"}${
//         customer.customerCode
//           ? ` (${customer.customerCode})`
//           : ""
//       }`
//     : "";

// const productLabel = (product) =>
//   product
//     ? `${product.name || product.productCode || "Product"}${
//         product.name && product.productCode
//           ? ` (${product.productCode})`
//           : ""
//       }`
//     : "";

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

// const fetchGoodsProductOptions = async ({
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
//         type: "GOODS",
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
//   recordId(customer);

// const getCustomerOptionLabel = (customer) =>
//   customer.customerName ||
//   customer.customerCode ||
//   "Customer";

// const getCustomerOptionSubtitle = (customer) =>
//   [
//     customer.customerCode,
//     customer.gstNo,
//   ]
//     .filter(Boolean)
//     .join(" · ");

// const getProductOptionId = (product) =>
//   recordId(product);

// const getProductOptionLabel = (product) =>
//   product.name ||
//   product.productCode ||
//   "Product";

// const getProductOptionSubtitle = (product) =>
//   [
//     product.productCode,
//     product.unit,
//     product.trackInventory
//       ? `Stock: ${product.currentStock ?? 0}`
//       : "Inventory not tracked",
//   ]
//     .filter(Boolean)
//     .join(" · ");

// /* ------------------------------------------------------------------ */
// /* Component                                                           */
// /* ------------------------------------------------------------------ */

// function DeliveryNoteCreation({
//   listPath = DEFAULT_LIST_PATH,
// }) {
//   const navigate = useNavigate();
//   const keyboardOpen = useKeyboardOpen();

//   const [form, setForm] =
//     useState(initialForm);

//   const [items, setItems] = useState(
//     () => [newItem()],
//   );

//   // Cache selected records only.
//   const [customerRecords, setCustomerRecords] =
//     useState({});

//   const [productRecords, setProductRecords] =
//     useState({});

//   const [saving, setSaving] =
//     useState(false);

//   const [errors, setErrors] =
//     useState([]);

//   const [showNotes, setShowNotes] =
//     useState(false);

//   const [showTerms, setShowTerms] =
//     useState(false);

//   const [createdNote, setCreatedNote] =
//     useState(null);

//   const [uncertain, setUncertain] =
//     useState(false);

//   const submitLock = useRef(false);
//   const mountedRef = useRef(false);
//   const dirtyRef = useRef(false);

//   const locked =
//     saving ||
//     uncertain ||
//     Boolean(createdNote);

//   useEffect(() => {
//     mountedRef.current = true;

//     return () => {
//       mountedRef.current = false;
//     };
//   }, []);

//   useEffect(() => {
//     const handleBeforeUnload = (event) => {
//       if (
//         !createdNote &&
//         (
//           dirtyRef.current ||
//           uncertain ||
//           saving
//         )
//       ) {
//         event.preventDefault();
//         event.returnValue = "";
//       }
//     };

//     window.addEventListener(
//       "beforeunload",
//       handleBeforeUnload,
//     );

//     return () => {
//       window.removeEventListener(
//         "beforeunload",
//         handleBeforeUnload,
//       );
//     };
//   }, [createdNote, uncertain, saving]);

//   /* ---------------------------------------------------------------- */
//   /* Derived values                                                    */
//   /* ---------------------------------------------------------------- */

//   const selectedCustomer =
//     customerRecords[form.customerId] || null;

//   const productMap = useMemo(
//     () =>
//       new Map(
//         Object.entries(productRecords),
//       ),
//     [productRecords],
//   );

//   const selectedItemCount = items.filter(
//     (item) => item.productId,
//   ).length;

//   const quantityByUnit = useMemo(() => {
//     const totals = new Map();

//     for (const item of items) {
//       const product =
//         productMap.get(item.productId);

//       const quantity =
//         parseQuantity(item.quantity);

//       if (!product || quantity === null) {
//         continue;
//       }

//       const unit = product.unit || "Units";
//       const milli = Math.round(quantity * 1000);

//       totals.set(
//         unit,
//         (totals.get(unit) || 0) + milli,
//       );
//     }

//     return Array.from(
//       totals,
//       ([unit, milli]) => ({
//         unit,
//         quantity: milli / 1000,
//       }),
//     );
//   }, [items, productMap]);

//   /* ---------------------------------------------------------------- */
//   /* Form handlers                                                     */
//   /* ---------------------------------------------------------------- */

//   const markDirty = () => {
//     dirtyRef.current = true;
//     setErrors([]);
//   };

//   const handleFieldChange = (event) => {
//     if (locked) return;

//     const { name, value } = event.target;

//     markDirty();

//     setForm((previous) => ({
//       ...previous,
//       [name]: value,
//     }));
//   };

//   const selectCustomer = (
//     customerId,
//     customerRecord,
//   ) => {
//     if (locked) return;

//     const id = customerId
//       ? String(customerId)
//       : "";

//     if (id && customerRecord) {
//       setCustomerRecords((previous) => ({
//         ...previous,
//         [id]: customerRecord,
//       }));
//     }

//     // Preserve manually edited contact/address fields if
//     // the same customer is selected again.
//     if (id === form.customerId) {
//       return;
//     }

//     markDirty();

//     setForm((previous) => ({
//       ...previous,
//       customerId: id,
//       contactPerson:
//         customerRecord?.contactPerson || "",
//       contactPhone:
//         customerRecord?.phone || "",
//       billingAddress: customerRecord
//         ? addressText(customerRecord, "billing")
//         : "",
//       shippingAddress: customerRecord
//         ? addressText(customerRecord, "shipping")
//         : "",
//     }));
//   };

//   const selectProduct = (
//     rowId,
//     productId,
//     productRecord,
//   ) => {
//     if (locked) return;

//     const id = productId
//       ? String(productId)
//       : "";

//     if (id) {
//       if (
//         !productRecord ||
//         productRecord.type !== "GOODS" ||
//         productRecord.isDeleted ||
//         (
//           productRecord.status !== undefined &&
//           productRecord.status !== "ACTIVE"
//         )
//       ) {
//         toast.error(
//           "Select an active Goods product.",
//         );
//         return;
//       }

//       if (
//         items.some(
//           (item) =>
//             item.rowId !== rowId &&
//             item.productId === id,
//         )
//       ) {
//         toast.error(
//           "This product is already included in the Delivery Note.",
//         );
//         return;
//       }

//       setProductRecords((previous) => ({
//         ...previous,
//         [id]: productRecord,
//       }));
//     }

//     markDirty();

//     setItems((previous) =>
//       previous.map((item) =>
//         item.rowId === rowId
//           ? {
//               ...item,
//               productId: id,
//             }
//           : item,
//       ),
//     );
//   };

//   const updateItem = (
//     rowId,
//     field,
//     value,
//   ) => {
//     if (locked) return;

//     markDirty();

//     setItems((previous) =>
//       previous.map((item) =>
//         item.rowId === rowId
//           ? {
//               ...item,
//               [field]: value,
//             }
//           : item,
//       ),
//     );
//   };

//   const addItem = () => {
//     if (locked || items.length >= 200) {
//       return;
//     }

//     markDirty();

//     setItems((previous) => [
//       ...previous,
//       newItem(),
//     ]);
//   };

//   const removeItem = (rowId) => {
//     if (locked || items.length <= 1) {
//       return;
//     }

//     markDirty();

//     setItems((previous) =>
//       previous.filter(
//         (item) => item.rowId !== rowId,
//       ),
//     );
//   };

//   /* ---------------------------------------------------------------- */
//   /* Validation                                                        */
//   /* ---------------------------------------------------------------- */

//   const validateForm = () => {
//     const messages = [];

//     if (
//       !selectedCustomer ||
//       selectedCustomer.isDeleted ||
//       (
//         selectedCustomer.status !== undefined &&
//         selectedCustomer.status !== "Active"
//       )
//     ) {
//       messages.push(
//         "Select an active customer.",
//       );
//     }

//     if (!validDate(form.deliveryDate)) {
//       messages.push(
//         "A valid Delivery Note date is required.",
//       );
//     }

//     if (form.expectedDeliveryDate) {
//       if (!validDate(form.expectedDeliveryDate)) {
//         messages.push(
//           "Expected delivery date is invalid.",
//         );
//       } else if (
//         form.expectedDeliveryDate <
//         form.deliveryDate
//       ) {
//         messages.push(
//           "Expected delivery date cannot be before Delivery Note date.",
//         );
//       }
//     }

//     if (
//       form.transportDocumentDate &&
//       !validDate(form.transportDocumentDate)
//     ) {
//       messages.push(
//         "Transport document date is invalid.",
//       );
//     }

//     if (!form.shippingAddress.trim()) {
//       messages.push(
//         "Shipping address is required.",
//       );
//     }

//     if (
//       items.length < 1 ||
//       items.length > 200
//     ) {
//       messages.push(
//         "Add between 1 and 200 items.",
//       );
//     }

//     const selectedIds = new Set();

//     items.forEach((item, index) => {
//       const product =
//         productMap.get(item.productId);

//       if (
//         !product ||
//         product.type !== "GOODS" ||
//         product.isDeleted ||
//         (
//           product.status !== undefined &&
//           product.status !== "ACTIVE"
//         )
//       ) {
//         messages.push(
//           `Select an active Goods product for item ${
//             index + 1
//           }.`,
//         );
//       } else if (
//         selectedIds.has(item.productId)
//       ) {
//         messages.push(
//           `Item ${
//             index + 1
//           }: a product can appear only once.`,
//         );
//       }

//       if (item.productId) {
//         selectedIds.add(item.productId);
//       }

//       if (
//         parseQuantity(item.quantity) === null
//       ) {
//         messages.push(
//           `Item ${
//             index + 1
//           }: enter quantity from 0.001 to 1,000,000 with at most three decimal places.`,
//         );
//       }

//       if (
//         item.specification.trim().length > 1000
//       ) {
//         messages.push(
//           `Item ${
//             index + 1
//           }: specification cannot exceed 1,000 characters.`,
//         );
//       }

//       if (item.notes.trim().length > 500) {
//         messages.push(
//           `Item ${
//             index + 1
//           }: notes cannot exceed 500 characters.`,
//         );
//       }
//     });

//     const textLimits = [
//       ["contactPerson", 150, "Contact person"],
//       ["contactPhone", 30, "Contact phone"],
//       ["billingAddress", 2000, "Billing address"],
//       ["shippingAddress", 2000, "Shipping address"],
//       ["customerReference", 100, "Customer reference"],
//       ["transporterName", 200, "Transporter"],
//       ["vehicleNumber", 30, "Vehicle number"],
//       ["trackingNumber", 100, "Tracking number"],
//       [
//         "transportDocumentNumber",
//         100,
//         "Transport document number",
//       ],
//       ["eWayBillNumber", 50, "E-way bill reference"],
//       ["notes", 1000, "Notes"],
//       [
//         "termsAndConditions",
//         5000,
//         "Terms and conditions",
//       ],
//     ];

//     for (
//       const [field, maxLength, label]
//       of textLimits
//     ) {
//       if (
//         form[field].trim().length > maxLength
//       ) {
//         messages.push(
//           `${label} cannot exceed ${maxLength} characters.`,
//         );
//       }
//     }

//     return [...new Set(messages)];
//   };

//   /* ---------------------------------------------------------------- */
//   /* Payload and save                                                  */
//   /* ---------------------------------------------------------------- */

//   const buildPayload = () => ({
//     customerId: form.customerId,

//     deliveryDate: form.deliveryDate,
//     expectedDeliveryDate:
//       form.expectedDeliveryDate || null,

//     contactPerson:
//       form.contactPerson.trim() || null,

//     contactPhone:
//       form.contactPhone.trim() || null,

//     billingAddress:
//       form.billingAddress.trim() || null,

//     shippingAddress:
//       form.shippingAddress.trim(),

//     customerReference:
//       form.customerReference.trim() || null,

//     transporterName:
//       form.transporterName.trim() || null,

//     vehicleNumber:
//       form.vehicleNumber.trim().toUpperCase() ||
//       null,

//     trackingNumber:
//       form.trackingNumber.trim() || null,

//     transportDocumentNumber:
//       form.transportDocumentNumber.trim() ||
//       null,

//     transportDocumentDate:
//       form.transportDocumentDate || null,

//     eWayBillNumber:
//       form.eWayBillNumber.trim() || null,

//     items: items.map((item) => ({
//       productId: item.productId,
//       quantity: parseQuantity(item.quantity),
//       specification:
//         item.specification.trim() || null,
//       notes: item.notes.trim() || null,
//     })),

//     notes: form.notes.trim() || null,

//     termsAndConditions:
//       form.termsAndConditions.trim() || null,
//   });

//   const handleSave = async () => {
//     if (submitLock.current || locked) {
//       return;
//     }

//     const messages = validateForm();

//     if (messages.length) {
//       setErrors(messages);
//       toast.error(messages[0]);
//       return;
//     }

//     submitLock.current = true;
//     setSaving(true);
//     setErrors([]);

//     let requestStarted = false;

//     try {
//       if (
//         typeof api.deliveryNote?.create !==
//         "function"
//       ) {
//         throw new Error(
//           "Configure api.deliveryNote.create first.",
//         );
//       }

//       const payload = buildPayload();

//       requestStarted = true;

//       const response =
//         await api.deliveryNote.create(payload);

//       const note = response?.data?.data;

//       if (
//         response?.data?.success !== true ||
//         !note?._id ||
//         !note.deliveryNoteNumber
//       ) {
//         const error = new Error(
//           response?.data?.message ||
//             "The server did not return a Delivery Note number. Check the list before creating another note.",
//         );

//         error.uncertainResult = true;
//         throw error;
//       }

//       if (!mountedRef.current) return;

//       dirtyRef.current = false;
//       setCreatedNote(note);

//       toast.success(
//         `${note.deliveryNoteNumber} created successfully`,
//       );
//     } catch (error) {
//       if (!mountedRef.current) return;

//       const status = error?.response?.status;

//       const resultUncertain =
//         requestStarted &&
//         (
//           error.uncertainResult ||
//           !status ||
//           status >= 500 ||
//           status === 408
//         );

//       setUncertain(Boolean(resultUncertain));

//       const messages = getErrors(error);

//       setErrors(messages);
//       toast.error(messages[0]);
//     } finally {
//       submitLock.current = false;

//       if (mountedRef.current) {
//         setSaving(false);
//       }
//     }
//   };

//   const exitPage = () => {
//     if (submitLock.current) return;

//     if (
//       !createdNote &&
//       (dirtyRef.current || uncertain)
//     ) {
//       const message = uncertain
//         ? "The previous save may have reached the server. Check the Delivery Note list before creating another. Leave this page?"
//         : "Discard the unsaved Delivery Note and leave?";

//       if (!window.confirm(message)) {
//         return;
//       }
//     }

//     navigate(listPath);
//   };

//   const saveButton = (
//     <Button
//       type="button"
//       icon={Save}
//       loading={saving}
//       disabled={locked}
//       onClick={handleSave}
//     >
//       {saving
//         ? "Saving..."
//         : "Save Delivery Note"}
//     </Button>
//   );

//   const renderInput = (
//     label,
//     name,
//     extra = {},
//   ) => (
//     <Input
//       key={name}
//       label={label}
//       name={name}
//       value={form[name]}
//       onChange={handleFieldChange}
//       {...extra}
//     />
//   );

//   /* ---------------------------------------------------------------- */
//   /* Render                                                            */
//   /* ---------------------------------------------------------------- */

//   return (
//     <div
//       className={`doc-page dn-create-page ${
//         keyboardOpen
//           ? "is-keyboard-open"
//           : ""
//       }`}
//     >
//       <form
//         noValidate
//         onSubmit={(event) => {
//           event.preventDefault();
//           void handleSave();
//         }}
//       >
//         <header className="doc-header">
//           <div className="doc-header-left">
//             <Button
//               type="button"
//               variant="secondary"
//               icon={ArrowLeft}
//               disabled={saving}
//               onClick={exitPage}
//             >
//               Exit
//             </Button>

//             <div className="doc-title">
//               <Truck size={19} />
//               <span>
//                 Create Delivery Note
//               </span>
//             </div>
//           </div>

//           <div className="doc-header-actions">
//             {saveButton}
//           </div>
//         </header>

//         {(errors.length > 0 ||
//           createdNote ||
//           uncertain) && (
//           <div className="doc-alerts dn-alert-stack">
//             {createdNote && (
//               <div
//                 className="doc-alert dn-success"
//                 role="status"
//               >
//                 <CheckCircle2 size={18} />

//                 <div>
//                   <strong>
//                     {
//                       createdNote.deliveryNoteNumber
//                     }{" "}
//                     created
//                   </strong>

//                   <p>
//                     Status:{" "}
//                     {createdNote.status ||
//                       "CREATED"}
//                     . Dispatch is handled
//                     separately.
//                   </p>

//                   <Button
//                     type="button"
//                     variant="secondary"
//                     onClick={() =>
//                       navigate(listPath)
//                     }
//                   >
//                     Go to Delivery Notes
//                   </Button>
//                 </div>
//               </div>
//             )}

//             {uncertain && (
//               <div
//                 className="doc-alert"
//                 role="status"
//               >
//                 The save result is uncertain.
//                 The form is locked to prevent an
//                 accidental duplicate. Check the
//                 Delivery Note list before
//                 submitting again.
//               </div>
//             )}

//             {errors.length > 0 && (
//               <div
//                 className="doc-alert doc-alert-error"
//                 role="alert"
//               >
//                 <ul>
//                   {errors.map(
//                     (message, index) => (
//                       <li
//                         key={`${index}-${message}`}
//                       >
//                         {message}
//                       </li>
//                     ),
//                   )}
//                 </ul>

//                 {uncertain && (
//                   <Button
//                     type="button"
//                     variant="secondary"
//                     onClick={exitPage}
//                   >
//                     Check Delivery Note List
//                   </Button>
//                 )}
//               </div>
//             )}
//           </div>
//         )}

//         <fieldset
//           className="doc-fieldset"
//           disabled={locked}
//         >
//           <main className="doc-main">
//             <section className="doc-top">
//               <div className="doc-panel doc-party-panel">
//                 <h2 className="doc-panel-title">
//                   Deliver To
//                 </h2>

//                 <EntitySearchPicker
//                   label="Customer"
//                   placeholder="Search customer, code, GSTIN..."
//                   fetchOptions={
//                     fetchCustomerOptions
//                   }
//                   getOptionId={
//                     getCustomerOptionId
//                   }
//                   getOptionLabel={
//                     getCustomerOptionLabel
//                   }
//                   getOptionSubtitle={
//                     getCustomerOptionSubtitle
//                   }
//                   selectedIds={
//                     form.customerId
//                       ? [form.customerId]
//                       : []
//                   }
//                   selectedLabel={
//                     customerLabel(
//                       selectedCustomer,
//                     )
//                   }
//                   onToggle={selectCustomer}
//                   multiple={false}
//                   disabled={locked}
//                   pageSize={20}
//                   debounceMs={350}
//                   emptyMessage="No matching customers found."
//                 />

//                 {selectedCustomer && (
//                   <div className="doc-party-card dn-party-card">
//                     <div className="doc-avatar">
//                       {selectedCustomer.customerName
//                         ?.charAt(0)
//                         .toUpperCase() || "C"}
//                     </div>

//                     <div className="doc-party-copy">
//                       <h3>
//                         {
//                           selectedCustomer.customerName
//                         }
//                       </h3>

//                       <p>
//                         {
//                           selectedCustomer.customerCode
//                         }
//                       </p>

//                       <p>
//                         <span>GSTIN:</span>{" "}
//                         {selectedCustomer.gstNo ||
//                           "Not provided"}
//                       </p>

//                       <p>
//                         <span>Phone:</span>{" "}
//                         {selectedCustomer.phone ||
//                           "Not provided"}
//                       </p>

//                       <p>
//                         <span>
//                           Customer Address:
//                         </span>{" "}
//                         {addressText(
//                           selectedCustomer,
//                           "billing",
//                         ) || "Not provided"}
//                       </p>
//                     </div>
//                   </div>
//                 )}

//                 <div className="dn-address-fields">
//                   <Textarea
//                     label="Shipping Address"
//                     name="shippingAddress"
//                     value={
//                       form.shippingAddress
//                     }
//                     onChange={
//                       handleFieldChange
//                     }
//                     maxLength={2000}
//                     rows={3}
//                     required
//                   />

//                   <Textarea
//                     label="Billing Address"
//                     name="billingAddress"
//                     value={
//                       form.billingAddress
//                     }
//                     onChange={
//                       handleFieldChange
//                     }
//                     maxLength={2000}
//                     rows={3}
//                   />
//                 </div>
//               </div>

//               <div className="doc-panel">
//                 <h2 className="doc-panel-title">
//                   Delivery Note Details
//                 </h2>

//                 <div className="doc-fields-grid">
//                   <Input
//                     label="Delivery Note Number"
//                     name="deliveryNoteNumber"
//                     value="Generated after saving"
//                     readOnly
//                   />

//                   {renderInput(
//                     "Delivery Note Date",
//                     "deliveryDate",
//                     {
//                       type: "date",
//                       required: true,
//                     },
//                   )}

//                   {renderInput(
//                     "Expected Delivery",
//                     "expectedDeliveryDate",
//                     {
//                       type: "date",
//                       min: form.deliveryDate,
//                     },
//                   )}

//                   {renderInput(
//                     "Customer Reference",
//                     "customerReference",
//                     {
//                       maxLength: 100,
//                     },
//                   )}

//                   {renderInput(
//                     "Contact Person",
//                     "contactPerson",
//                     {
//                       maxLength: 150,
//                     },
//                   )}

//                   {renderInput(
//                     "Contact Phone",
//                     "contactPhone",
//                     {
//                       type: "tel",
//                       maxLength: 30,
//                     },
//                   )}
//                 </div>
//               </div>
//             </section>

//             <section className="doc-items">
//               <div className="doc-table-wrap">
//                 <table className="doc-table dn-items-table">
//                   <thead>
//                     <tr>
//                       <th>No.</th>
//                       <th>Goods Product</th>
//                       <th>Unit</th>
//                       <th>Quantity</th>
//                       <th>Specification</th>
//                       <th>Notes</th>
//                       <th>
//                         <span className="doc-sr-only">
//                           Remove
//                         </span>
//                       </th>
//                     </tr>
//                   </thead>

//                   <tbody>
//                     {items.map(
//                       (item, index) => {
//                         const product =
//                           productMap.get(
//                             item.productId,
//                           );

//                         return (
//                           <tr
//                             key={item.rowId}
//                           >
//                             <td
//                               className="doc-cell-no"
//                               data-label="No."
//                             >
//                               {index + 1}
//                             </td>

//                             <td
//                               className="doc-cell-item"
//                               data-label="Goods Product"
//                             >
//                               <EntitySearchPicker
//                                 placeholder="Search Goods product..."
//                                 fetchOptions={
//                                   fetchGoodsProductOptions
//                                 }
//                                 getOptionId={
//                                   getProductOptionId
//                                 }
//                                 getOptionLabel={
//                                   getProductOptionLabel
//                                 }
//                                 getOptionSubtitle={
//                                   getProductOptionSubtitle
//                                 }
//                                 selectedIds={
//                                   item.productId
//                                     ? [
//                                         item.productId,
//                                       ]
//                                     : []
//                                 }
//                                 selectedLabel={
//                                   productLabel(
//                                     product,
//                                   )
//                                 }
//                                 onToggle={(
//                                   productId,
//                                   productRecord,
//                                 ) =>
//                                   selectProduct(
//                                     item.rowId,
//                                     productId,
//                                     productRecord,
//                                   )
//                                 }
//                                 multiple={false}
//                                 disabled={locked}
//                                 pageSize={20}
//                                 debounceMs={350}
//                                 emptyMessage="No matching Goods products found."
//                               />

//                               {product && (
//                                 <small className="doc-item-meta">
//                                   {product.trackInventory
//                                     ? `Current stock: ${
//                                         product.currentStock ??
//                                         0
//                                       } ${
//                                         product.unit ||
//                                         ""
//                                       }`
//                                     : "Inventory not tracked"}
//                                 </small>
//                               )}
//                             </td>

//                             <td data-label="Unit">
//                               <Input
//                                 name={`unit-${item.rowId}`}
//                                 aria-label={`Unit ${
//                                   index + 1
//                                 }`}
//                                 value={
//                                   product?.unit ||
//                                   "—"
//                                 }
//                                 readOnly
//                               />
//                             </td>

//                             <td data-label="Quantity">
//                               <Input
//                                 name={`quantity-${item.rowId}`}
//                                 aria-label={`Quantity ${
//                                   index + 1
//                                 }`}
//                                 type="number"
//                                 min="0.001"
//                                 max="1000000"
//                                 step="0.001"
//                                 inputMode="decimal"
//                                 value={
//                                   item.quantity
//                                 }
//                                 onChange={(
//                                   event,
//                                 ) =>
//                                   updateItem(
//                                     item.rowId,
//                                     "quantity",
//                                     event.target.value,
//                                   )
//                                 }
//                               />
//                             </td>

//                             <td data-label="Specification">
//                               <Input
//                                 name={`specification-${item.rowId}`}
//                                 aria-label={`Specification ${
//                                   index + 1
//                                 }`}
//                                 value={
//                                   item.specification
//                                 }
//                                 maxLength={
//                                   1000
//                                 }
//                                 onChange={(
//                                   event,
//                                 ) =>
//                                   updateItem(
//                                     item.rowId,
//                                     "specification",
//                                     event.target.value,
//                                   )
//                                 }
//                               />
//                             </td>

//                             <td data-label="Item Notes">
//                               <Input
//                                 name={`notes-${item.rowId}`}
//                                 aria-label={`Notes ${
//                                   index + 1
//                                 }`}
//                                 value={
//                                   item.notes
//                                 }
//                                 maxLength={
//                                   500
//                                 }
//                                 onChange={(
//                                   event,
//                                 ) =>
//                                   updateItem(
//                                     item.rowId,
//                                     "notes",
//                                     event.target.value,
//                                   )
//                                 }
//                               />
//                             </td>

//                             <td
//                               className="doc-cell-action"
//                               data-label="Remove"
//                             >
//                               <button
//                                 type="button"
//                                 className="doc-remove-button"
//                                 aria-label={`Remove item ${
//                                   index + 1
//                                 }`}
//                                 disabled={
//                                   locked ||
//                                   items.length <= 1
//                                 }
//                                 onClick={() =>
//                                   removeItem(
//                                     item.rowId,
//                                   )
//                                 }
//                               >
//                                 <Trash2
//                                   size={16}
//                                 />
//                               </button>
//                             </td>
//                           </tr>
//                         );
//                       },
//                     )}
//                   </tbody>
//                 </table>
//               </div>

//               <div className="doc-add-item-row">
//                 <button
//                   type="button"
//                   className="doc-dashed-line"
//                   onClick={addItem}
//                   disabled={
//                     locked ||
//                     items.length >= 200
//                   }
//                 >
//                   <Plus size={16} />
//                   Add Item
//                 </button>
//               </div>
//             </section>

//             <section className="doc-panel dn-transport-panel">
//               <h2 className="doc-panel-title">
//                 Transport Details
//               </h2>

//               <div className="doc-fields-grid dn-transport-grid">
//                 {renderInput(
//                   "Transporter",
//                   "transporterName",
//                   {
//                     maxLength: 200,
//                   },
//                 )}

//                 {renderInput(
//                   "Vehicle Number",
//                   "vehicleNumber",
//                   {
//                     maxLength: 30,
//                   },
//                 )}

//                 {renderInput(
//                   "Tracking Number",
//                   "trackingNumber",
//                   {
//                     maxLength: 100,
//                   },
//                 )}

//                 {renderInput(
//                   "Transport Document Number",
//                   "transportDocumentNumber",
//                   {
//                     maxLength: 100,
//                   },
//                 )}

//                 {renderInput(
//                   "Transport Document Date",
//                   "transportDocumentDate",
//                   {
//                     type: "date",
//                   },
//                 )}

//                 {renderInput(
//                   "E-Way Bill Reference",
//                   "eWayBillNumber",
//                   {
//                     maxLength: 50,
//                   },
//                 )}
//               </div>

//               <p className="doc-note">
//                 E-way bill reference is
//                 informational. This screen does
//                 not generate an e-way bill.
//               </p>
//             </section>

//             <section className="doc-bottom">
//               <div className="doc-extras">
//                 <button
//                   type="button"
//                   className={`doc-extra-row ${
//                     showNotes
//                       ? "is-open"
//                       : ""
//                   }`}
//                   aria-expanded={showNotes}
//                   onClick={() =>
//                     setShowNotes(
//                       (value) => !value,
//                     )
//                   }
//                 >
//                   <StickyNote size={16} />
//                   <span>Notes</span>
//                   <ChevronDown size={16} />
//                 </button>

//                 {showNotes && (
//                   <div className="doc-extra-content">
//                     <Textarea
//                       name="notes"
//                       aria-label="Delivery Note notes"
//                       value={form.notes}
//                       onChange={
//                         handleFieldChange
//                       }
//                       maxLength={1000}
//                       rows={3}
//                     />
//                   </div>
//                 )}

//                 <button
//                   type="button"
//                   className={`doc-extra-row ${
//                     showTerms
//                       ? "is-open"
//                       : ""
//                   }`}
//                   aria-expanded={showTerms}
//                   onClick={() =>
//                     setShowTerms(
//                       (value) => !value,
//                     )
//                   }
//                 >
//                   <ClipboardList size={16} />
//                   <span>
//                     Terms & Conditions
//                   </span>
//                   <ChevronDown size={16} />
//                 </button>

//                 {showTerms && (
//                   <div className="doc-extra-content">
//                     <Textarea
//                       name="termsAndConditions"
//                       aria-label="Delivery terms and conditions"
//                       value={
//                         form.termsAndConditions
//                       }
//                       onChange={
//                         handleFieldChange
//                       }
//                       maxLength={5000}
//                       rows={4}
//                     />
//                   </div>
//                 )}
//               </div>

//               <div className="doc-summary">
//                 <div className="doc-summary-row">
//                   <span>Creation Status</span>
//                   <strong>
//                     {createdNote?.status ||
//                       "CREATED"}
//                   </strong>
//                 </div>

//                 <div className="doc-summary-row">
//                   <span>Selected Products</span>
//                   <strong>
//                     {selectedItemCount}
//                   </strong>
//                 </div>

//                 {quantityByUnit.map(
//                   (entry) => (
//                     <div
//                       className="doc-summary-row"
//                       key={entry.unit}
//                     >
//                       <span>
//                         Quantity (
//                         {entry.unit})
//                       </span>

//                       <strong>
//                         {entry.quantity}
//                       </strong>
//                     </div>
//                   ),
//                 )}

//                 <p className="doc-note">
//                   Quantities with different units
//                   are not added together. Saving
//                   creates the document only.
//                   Stock is checked and deducted
//                   at dispatch.
//                 </p>
//               </div>
//             </section>
//           </main>
//         </fieldset>

//         <div
//           className="doc-mobile-bar dn-mobile-save-bar"
//           hidden={keyboardOpen}
//         >
//           <div className="doc-mobile-total">
//             <span>
//               {createdNote
//                 ? createdNote.deliveryNoteNumber
//                 : "Delivery Note"}
//             </span>

//             <strong>
//               {createdNote
//                 ? createdNote.status ||
//                   "CREATED"
//                 : `${selectedItemCount} items`}
//             </strong>
//           </div>

//           <div className="doc-mobile-actions">
//             <Button
//               type="button"
//               variant="secondary"
//               icon={ArrowLeft}
//               disabled={saving}
//               onClick={exitPage}
//             >
//               Exit
//             </Button>

//             {createdNote || uncertain ? (
//               <Button
//                 type="button"
//                 disabled={saving}
//                 onClick={exitPage}
//               >
//                 {uncertain
//                   ? "Check List"
//                   : "Go to List"}
//               </Button>
//             ) : (
//               <Button
//                 type="button"
//                 icon={Save}
//                 loading={saving}
//                 disabled={locked}
//                 onClick={handleSave}
//               >
//                 Save Delivery Note
//               </Button>
//             )}
//           </div>
//         </div>
//       </form>
//     </div>
//   );
// }

// export default DeliveryNoteCreation;


import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  FileText,
  LoaderCircle,
  ClipboardList,
  Plus,
  Save,
  StickyNote,
  Trash2,
  Truck,
} from "lucide-react";
import toast from "react-hot-toast";
import Input from "../../components/common/Form/Input";
import Textarea from "../../components/common/Form/Textarea";
import Button from "../../components/common/Form/Button";
import EntitySearchPicker from "../../components/common/EntitySearchPicker/EntitySearchPicker";
import useKeyboardOpen from "../../hooks/useKeyboardOpen";
import api from "../../services/api";
import apiClient from "../../services/apiClient";
import salesOrderApi from "../../services/modules/salesOrderApi";
import deliveryNoteApi from "../../services/modules/deliveryNoteApi";
import "../../styles/invoice-common1.css";
import "./delivery-note-creation.css";
import "./delivery-note-creation-responsive.css";
import "./delivery-note-creation-sales-order.css";
import routes from "../../config/routes";
/* ------------------------------------------------------------------ */
/* Constants and helpers                                               */
/* ------------------------------------------------------------------ */
const DEFAULT_LIST_PATH = routes.sales.delivery
const localDate = () => {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};
const initialForm = () => ({
  customerId: "",
  deliveryDate: localDate(),
  expectedDeliveryDate: "",
  contactPerson: "",
  contactPhone: "",
  billingAddress: "",
  shippingAddress: "",
  customerReference: "",
  transporterName: "",
  vehicleNumber: "",
  trackingNumber: "",
  transportDocumentNumber: "",
  transportDocumentDate: "",
  eWayBillNumber: "",
  notes: "",
  termsAndConditions: "",
});
let rowSequence = 0;
const newItem = () => ({
  rowId: `delivery-item-${++rowSequence}`,
  productId: "",
  quantity: "1",
  specification: "",
  notes: "",
});
const recordId = (value) => {
  if (!value) return "";
  if (typeof value === "object") {
    return String(
      value._id || value.id || "",
    );
  }
  return String(value);
};
const getErrors = (error) => {
  const body = error?.response?.data;
  if (
    Array.isArray(body?.errors) &&
    body.errors.length
  ) {
    return body.errors.map((item) =>
      typeof item === "string"
        ? item
        : item?.message ||
          item?.msg ||
          String(item),
    );
  }
  return [
    body?.message ||
      error?.message ||
      "Unable to complete the request.",
  ];
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
  const data = Array.isArray(body?.data)
    ? body.data
    : Array.isArray(body?.data?.[resourceName])
      ? body.data[resourceName]
      : Array.isArray(body?.[resourceName])
        ? body[resourceName]
        : Array.isArray(body)
          ? body
          : null;
  if (!data) {
    throw new Error(
      `Invalid ${resourceName} response.`,
    );
  }
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
      `The ${resourceName} endpoint must return pagination.total for paginated search.`,
    );
  }
  return {
    data,
    total: Number(rawTotal),
  };
};
const parseQuantity = (value) => {
  const input = String(value ?? "").trim();
  if (!/^\d+(?:\.\d{1,3})?$/.test(input)) {
    return null;
  }
  const quantity = Number(input);
  if (
    !Number.isFinite(quantity) ||
    quantity < 0.001 ||
    quantity > 1000000
  ) {
    return null;
  }
  return quantity;
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
const addressText = (customer, type) => {
  if (!customer) return "";
  const address =
    type === "shipping"
      ? customer.shippingAddress ||
        customer.billingAddress
      : customer.billingAddress;
  return [
    address,
    customer.city,
    customer.state,
    customer.pincode,
    customer.country,
  ]
    .filter(Boolean)
    .join(", ");
};
const customerLabel = (customer) =>
  customer
    ? `${customer.customerName || "Customer"}${
        customer.customerCode
          ? ` (${customer.customerCode})`
          : ""
      }`
    : "";
const productLabel = (product) =>
  product
    ? `${product.name || product.productCode || "Product"}${
        product.name && product.productCode
          ? ` (${product.productCode})`
          : ""
      }`
    : "";
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
const fetchGoodsProductOptions = async ({
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
        type: "GOODS",
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
  recordId(customer);
const getCustomerOptionLabel = (customer) =>
  customer.customerName ||
  customer.customerCode ||
  "Customer";
const getCustomerOptionSubtitle = (customer) =>
  [
    customer.customerCode,
    customer.gstNo,
  ]
    .filter(Boolean)
    .join(" · ");
const getProductOptionId = (product) =>
  recordId(product);
const getProductOptionLabel = (product) =>
  product.name ||
  product.productCode ||
  "Product";
const getProductOptionSubtitle = (product) =>
  [
    product.productCode,
    product.unit,
    product.trackInventory
      ? `Stock: ${product.currentStock ?? 0}`
      : "Inventory not tracked",
  ]
    .filter(Boolean)
    .join(" · ");
/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
const unwrapRecord = (response, keys = []) => {
  const body = response?.data;
  if (body?.success === false) {
    throw new Error(body.message || "Unable to load the selected record.");
  }

  const candidates = [
    body?.data?.order,
    body?.data?.salesOrder,
    body?.data,
    ...keys.map((key) => body?.[key]),
    body,
  ];
  return candidates.find((value) => value && !Array.isArray(value) && typeof value === "object") || null;
};

const unwrapOrderList = (response) => {
  const body = response?.data;
  if (body?.success === false) {
    throw new Error(body.message || "Unable to load Sales Orders.");
  }

  const records = Array.isArray(body?.data)
    ? body.data
    : Array.isArray(body?.data?.orders)
      ? body.data.orders
      : Array.isArray(body?.data?.data)
      ? body.data.data
      : Array.isArray(body?.orders)
        ? body.orders
        : Array.isArray(body)
          ? body
          : null;

  if (!records) {
    throw new Error("Invalid Sales Order list response.");
  }

  return records;
};

const moneyFromPaise = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format((Number(value) || 0) / 100);

const orderDateLabel = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-IN");
};

function DeliveryNoteCreation({
  listPath = DEFAULT_LIST_PATH,
}) {
  const navigate = useNavigate();
  const keyboardOpen = useKeyboardOpen();
  const [form, setForm] =
    useState(initialForm);

  const [createFrom, setCreateFrom] = useState("DIRECT");
  const [salesOrders, setSalesOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrderNumber, setSelectedOrderNumber] = useState("");
  const [selectedSalesOrder, setSelectedSalesOrder] = useState(null);
  const [orderLoading, setOrderLoading] = useState(false);

  const [items, setItems] = useState(
    () => [newItem()],
  );
  // Cache selected records only.
  const [customerRecords, setCustomerRecords] =
    useState({});
  const [productRecords, setProductRecords] =
    useState({});
  const [saving, setSaving] =
    useState(false);
  const [errors, setErrors] =
    useState([]);
  const [showNotes, setShowNotes] =
    useState(false);
  const [showTerms, setShowTerms] =
    useState(false);
  const [createdNote, setCreatedNote] =
    useState(null);
  const [uncertain, setUncertain] =
    useState(false);
  const submitLock = useRef(false);
  const mountedRef = useRef(false);
  const dirtyRef = useRef(false);
  const locked =
    saving ||
    uncertain ||
    Boolean(createdNote);
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadSalesOrders = async () => {
      setOrdersLoading(true);
      try {
        const response = await salesOrderApi.getOrders({
          page: 1,
          limit: 100,
        });
        if (!active) return;

        const records = unwrapOrderList(response).filter((order) =>
          ["CONFIRMED", "IN_PROGRESS"].includes(order.status),
        );
        setSalesOrders(records);
      } catch (error) {
        if (active) {
          setSalesOrders([]);
          toast.error(error?.message || "Unable to load Sales Orders.");
        }
      } finally {
        if (active) setOrdersLoading(false);
      }
    };

    void loadSalesOrders();
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (
        !createdNote &&
        (
          dirtyRef.current ||
          uncertain ||
          saving
        )
      ) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener(
      "beforeunload",
      handleBeforeUnload,
    );
    return () => {
      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload,
      );
    };
  }, [createdNote, uncertain, saving]);
  /* ---------------------------------------------------------------- */
  /* Derived values                                                    */
  /* ---------------------------------------------------------------- */
  const selectedCustomer =
    customerRecords[form.customerId] || null;
  const productMap = useMemo(
    () =>
      new Map(
        Object.entries(productRecords),
      ),
    [productRecords],
  );
  const selectedItemCount = items.filter(
    (item) => item.productId,
  ).length;
  const quantityByUnit = useMemo(() => {
    const totals = new Map();
    for (const item of items) {
      const product =
        productMap.get(item.productId);
      const quantity =
        parseQuantity(item.quantity);
      if (!product || quantity === null) {
        continue;
      }
      const unit = product.unit || "Units";
      const milli = Math.round(quantity * 1000);
      totals.set(
        unit,
        (totals.get(unit) || 0) + milli,
      );
    }
    return Array.from(
      totals,
      ([unit, milli]) => ({
        unit,
        quantity: milli / 1000,
      }),
    );
  }, [items, productMap]);
  /* ---------------------------------------------------------------- */
  /* Form handlers                                                     */
  /* ---------------------------------------------------------------- */
  const markDirty = () => {
    dirtyRef.current = true;
    setErrors([]);
  };
  const handleFieldChange = (event) => {
    if (locked) return;
    const { name, value } = event.target;
    markDirty();
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };
  const resetToDirect = () => {
    if (locked) return;
    markDirty();
    setCreateFrom("DIRECT");
    setSelectedOrderNumber("");
    setSelectedSalesOrder(null);
    setForm(initialForm());
    setCustomerRecords({});
    setProductRecords({});
    setItems([newItem()]);
  };

  const handleCreateFromChange = (event) => {
    const value = event.target.value;
    if (locked) return;

    if (value === "DIRECT") {
      resetToDirect();
      return;
    }

    markDirty();
    setCreateFrom("SALES_ORDER");
    setSelectedOrderNumber("");
    setSelectedSalesOrder(null);
    setForm(initialForm());
    setCustomerRecords({});
    setProductRecords({});
    setItems([]);
  };

  const handleSalesOrderChange = async (event) => {
    const orderNumber = event.target.value;
    if (locked) return;

    setSelectedOrderNumber(orderNumber);
    setSelectedSalesOrder(null);
    setItems([]);
    setForm(initialForm());
    setCustomerRecords({});
    setProductRecords({});
    setErrors([]);

    if (!orderNumber) return;

    setOrderLoading(true);
    try {
      const response = await salesOrderApi.getOrder(orderNumber);
      const order = unwrapRecord(response, ["order", "salesOrder"]);

      if (!order?._id || order.orderNumber !== orderNumber) {
        throw new Error("The server did not return the selected Sales Order.");
      }

      if (!["CONFIRMED", "IN_PROGRESS"].includes(order.status)) {
        throw new Error("Only confirmed or in-progress Sales Orders can create Delivery Notes.");
      }

      const customerId = recordId(order.customerId);
      if (!customerId) {
        throw new Error("The Sales Order does not contain a valid customer.");
      }

      const customer = {
        _id: customerId,
        customerName: order.customerName || "Customer",
        customerCode: order.customerCode || "",
        gstNo: order.customerGstNo || "",
        billingAddress: order.billingAddress || "",
        shippingAddress: order.shippingAddress || order.billingAddress || "",
        status: "Active",
        isDeleted: false,
      };

      const goodsLines = (Array.isArray(order.items) ? order.items : [])
        .filter((line) => line.productType === "GOODS")
        .map((line) => ({
          ...line,
          lineId: recordId(line.lineId || line._id),
        }))
        .filter((line) => line.lineId && recordId(line.productId));

      if (!goodsLines.length) {
        throw new Error("This Sales Order has no Goods items available for delivery.");
      }

      const nextProducts = {};
      const nextItems = goodsLines.map((line) => {
        const productId = recordId(line.productId);
        nextProducts[productId] = {
          _id: productId,
          name: line.productName || "Product",
          productCode: line.productCode || "",
          unit: line.unit || "",
          type: "GOODS",
          hsnSacCode: line.hsnSacCode || "",
          trackInventory: false,
        };

        return {
          ...newItem(),
          productId,
          salesOrderLineId: line.lineId,
          quantity: String(line.quantity ?? ""),
          orderedQuantity: Number(line.quantity) || 0,
          unitRatePaise: Number(line.unitRatePaise) || 0,
          gstRate: Number(line.gstRate) || 0,
          hsnSacCode: line.hsnSacCode || "",
          taxableAmountPaise: Number(line.taxableAmountPaise) || 0,
          totalAmountPaise: Number(line.totalAmountPaise) || 0,
          specification: line.specification || "",
          notes: "",
        };
      });

      setSelectedSalesOrder(order);
      setCustomerRecords({ [customerId]: customer });
      setProductRecords(nextProducts);
      setItems(nextItems);
      setForm((previous) => ({
        ...previous,
        customerId,
        billingAddress: order.billingAddress || "",
        shippingAddress: order.shippingAddress || order.billingAddress || "",
        customerReference: order.orderNumber || "",
      }));
      dirtyRef.current = true;
    } catch (error) {
      setSelectedOrderNumber("");
      setSelectedSalesOrder(null);
      setItems([]);
      toast.error(error?.message || "Unable to load Sales Order details.");
    } finally {
      setOrderLoading(false);
    }
  };

  const selectCustomer = (
    customerId,
    customerRecord,
  ) => {
    if (locked) return;
    const id = customerId
      ? String(customerId)
      : "";
    if (id && customerRecord) {
      setCustomerRecords((previous) => ({
        ...previous,
        [id]: customerRecord,
      }));
    }
    // Preserve manually edited contact/address fields if
    // the same customer is selected again.
    if (id === form.customerId) {
      return;
    }
    markDirty();
    setForm((previous) => ({
      ...previous,
      customerId: id,
      contactPerson:
        customerRecord?.contactPerson || "",
      contactPhone:
        customerRecord?.phone || "",
      billingAddress: customerRecord
        ? addressText(customerRecord, "billing")
        : "",
      shippingAddress: customerRecord
        ? addressText(customerRecord, "shipping")
        : "",
    }));
  };
  const selectProduct = (
    rowId,
    productId,
    productRecord,
  ) => {
    if (locked) return;
    const id = productId
      ? String(productId)
      : "";
    if (id) {
      if (
        !productRecord ||
        productRecord.type !== "GOODS" ||
        productRecord.isDeleted ||
        (
          productRecord.status !== undefined &&
          productRecord.status !== "ACTIVE"
        )
      ) {
        toast.error(
          "Select an active Goods product.",
        );
        return;
      }
      if (
        items.some(
          (item) =>
            item.rowId !== rowId &&
            item.productId === id,
        )
      ) {
        toast.error(
          "This product is already included in the Delivery Note.",
        );
        return;
      }
      setProductRecords((previous) => ({
        ...previous,
        [id]: productRecord,
      }));
    }
    markDirty();
    setItems((previous) =>
      previous.map((item) =>
        item.rowId === rowId
          ? {
              ...item,
              productId: id,
            }
          : item,
      ),
    );
  };
  const updateItem = (
    rowId,
    field,
    value,
  ) => {
    if (locked) return;
    markDirty();
    setItems((previous) =>
      previous.map((item) =>
        item.rowId === rowId
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  };
  const addItem = () => {
    if (locked || items.length >= 200) {
      return;
    }
    markDirty();
    setItems((previous) => [
      ...previous,
      newItem(),
    ]);
  };
  const removeItem = (rowId) => {
    if (locked || items.length <= 1) {
      return;
    }
    markDirty();
    setItems((previous) =>
      previous.filter(
        (item) => item.rowId !== rowId,
      ),
    );
  };
  /* ---------------------------------------------------------------- */
  /* Validation                                                        */
  /* ---------------------------------------------------------------- */
  const validateForm = () => {
    const messages = [];
    if (
      !selectedCustomer ||
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

    if (createFrom === "SALES_ORDER" && !selectedSalesOrder) {
      messages.push("Select a Sales Order before saving.");
    }
    if (!validDate(form.deliveryDate)) {
      messages.push(
        "A valid Delivery Note date is required.",
      );
    }
    if (form.expectedDeliveryDate) {
      if (!validDate(form.expectedDeliveryDate)) {
        messages.push(
          "Expected delivery date is invalid.",
        );
      } else if (
        form.expectedDeliveryDate <
        form.deliveryDate
      ) {
        messages.push(
          "Expected delivery date cannot be before Delivery Note date.",
        );
      }
    }
    if (
      form.transportDocumentDate &&
      !validDate(form.transportDocumentDate)
    ) {
      messages.push(
        "Transport document date is invalid.",
      );
    }
    if (!form.shippingAddress.trim()) {
      messages.push(
        "Shipping address is required.",
      );
    }
    if (
      items.length < 1 ||
      items.length > 200
    ) {
      messages.push(
        "Add between 1 and 200 items.",
      );
    }
    const selectedIds = new Set();
    items.forEach((item, index) => {
      const product =
        productMap.get(item.productId);
      if (
        !product ||
        product.type !== "GOODS" ||
        product.isDeleted ||
        (
          product.status !== undefined &&
          product.status !== "ACTIVE"
        )
      ) {
        messages.push(
          `Select an active Goods product for item ${
            index + 1
          }.`,
        );
      } else if (
        selectedIds.has(item.productId)
      ) {
        messages.push(
          `Item ${
            index + 1
          }: a product can appear only once.`,
        );
      }
      if (item.productId) {
        selectedIds.add(item.productId);
      }
      if (
        parseQuantity(item.quantity) === null
      ) {
        messages.push(
          `Item ${
            index + 1
          }: enter quantity from 0.001 to 1,000,000 with at most three decimal places.`,
        );
      }

      if (
        createFrom === "SALES_ORDER" &&
        parseQuantity(item.quantity) !== null &&
        parseQuantity(item.quantity) > Number(item.orderedQuantity || 0)
      ) {
        messages.push(
          `Item ${index + 1}: quantity cannot exceed the Sales Order quantity (${item.orderedQuantity}).`,
        );
      }

      if (createFrom === "SALES_ORDER" && !item.salesOrderLineId) {
        messages.push(`Item ${index + 1}: Sales Order line reference is missing.`);
      }
      if (
        item.specification.trim().length > 1000
      ) {
        messages.push(
          `Item ${
            index + 1
          }: specification cannot exceed 1,000 characters.`,
        );
      }
      if (item.notes.trim().length > 500) {
        messages.push(
          `Item ${
            index + 1
          }: notes cannot exceed 500 characters.`,
        );
      }
    });
    const textLimits = [
      ["contactPerson", 150, "Contact person"],
      ["contactPhone", 30, "Contact phone"],
      ["billingAddress", 2000, "Billing address"],
      ["shippingAddress", 2000, "Shipping address"],
      ["customerReference", 100, "Customer reference"],
      ["transporterName", 200, "Transporter"],
      ["vehicleNumber", 30, "Vehicle number"],
      ["trackingNumber", 100, "Tracking number"],
      [
        "transportDocumentNumber",
        100,
        "Transport document number",
      ],
      ["eWayBillNumber", 50, "E-way bill reference"],
      ["notes", 1000, "Notes"],
      [
        "termsAndConditions",
        5000,
        "Terms and conditions",
      ],
    ];
    for (
      const [field, maxLength, label]
      of textLimits
    ) {
      if (
        form[field].trim().length > maxLength
      ) {
        messages.push(
          `${label} cannot exceed ${maxLength} characters.`,
        );
      }
    }
    return [...new Set(messages)];
  };
  /* ---------------------------------------------------------------- */
  /* Payload and save                                                  */
  /* ---------------------------------------------------------------- */
  const buildPayload = () => {
    const common = {
      deliveryDate: form.deliveryDate,
      expectedDeliveryDate: form.expectedDeliveryDate || null,
      contactPerson: form.contactPerson.trim() || null,
      contactPhone: form.contactPhone.trim() || null,
      billingAddress: form.billingAddress.trim() || null,
      shippingAddress: form.shippingAddress.trim(),
      customerReference: form.customerReference.trim() || null,
      transporterName: form.transporterName.trim() || null,
      vehicleNumber: form.vehicleNumber.trim().toUpperCase() || null,
      trackingNumber: form.trackingNumber.trim() || null,
      transportDocumentNumber: form.transportDocumentNumber.trim() || null,
      transportDocumentDate: form.transportDocumentDate || null,
      eWayBillNumber: form.eWayBillNumber.trim() || null,
      notes: form.notes.trim() || null,
      termsAndConditions: form.termsAndConditions.trim() || null,
    };

    if (createFrom === "SALES_ORDER") {
      return {
        ...common,
        items: items.map((item) => ({
          salesOrderLineId: item.salesOrderLineId,
          quantity: parseQuantity(item.quantity),
          notes: item.notes.trim() || null,
        })),
      };
    }

    return {
      ...common,
      customerId: form.customerId,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: parseQuantity(item.quantity),
        specification: item.specification.trim() || null,
        notes: item.notes.trim() || null,
      })),
    };
  };
  const handleSave = async () => {
    if (submitLock.current || locked) {
      return;
    }
    const messages = validateForm();
    if (messages.length) {
      setErrors(messages);
      toast.error(messages[0]);
      return;
    }
    submitLock.current = true;
    setSaving(true);
    setErrors([]);
    let requestStarted = false;
    try {
      const payload = buildPayload();

      requestStarted = true;

      const response = createFrom === "SALES_ORDER"
        ? await deliveryNoteApi.createFromOrder(
            selectedSalesOrder.orderNumber,
            payload,
          )
        : await api.deliveryNote.create(payload);
      const note = response?.data?.data;
      if (
        response?.data?.success !== true ||
        !note?._id ||
        !note.deliveryNoteNumber
      ) {
        const error = new Error(
          response?.data?.message ||
            "The server did not return a Delivery Note number. Check the list before creating another note.",
        );
        error.uncertainResult = true;
        throw error;
      }
      if (!mountedRef.current) return;
      dirtyRef.current = false;
      setCreatedNote(note);
      toast.success(
        `${note.deliveryNoteNumber} created successfully`,
      );
    } catch (error) {
      if (!mountedRef.current) return;
      const status = error?.response?.status;
      const resultUncertain =
        requestStarted &&
        (
          error.uncertainResult ||
          !status ||
          status >= 500 ||
          status === 408
        );
      setUncertain(Boolean(resultUncertain));
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
    if (
      !createdNote &&
      (dirtyRef.current || uncertain)
    ) {
      const message = uncertain
        ? "The previous save may have reached the server. Check the Delivery Note list before creating another. Leave this page?"
        : "Discard the unsaved Delivery Note and leave?";
      if (!window.confirm(message)) {
        return;
      }
    }
    navigate(listPath);
  };
  const saveButton = (
    <Button
      type="button"
      icon={Save}
      loading={saving}
      disabled={locked || orderLoading || (createFrom === "SALES_ORDER" && !selectedSalesOrder)}
      onClick={handleSave}
    >
      {saving
        ? "Saving..."
        : "Save Delivery Note"}
    </Button>
  );
  const renderInput = (
    label,
    name,
    extra = {},
  ) => (
    <Input
      key={name}
      label={label}
      name={name}
      value={form[name]}
      onChange={handleFieldChange}
      {...extra}
    />
  );
  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */
  return (
    <div
      className={`doc-page dn-create-page ${
        keyboardOpen
          ? "is-keyboard-open"
          : ""
      }`}
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void handleSave();
        }}
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
              <Truck size={19} />
              <span>
                Create Delivery Note
              </span>
            </div>
          </div>
          <div className="doc-header-actions">
            {saveButton}
          </div>
        </header>
        {(errors.length > 0 ||
          createdNote ||
          uncertain) && (
          <div className="doc-alerts dn-alert-stack">
            {createdNote && (
              <div
                className="doc-alert dn-success"
                role="status"
              >
                <CheckCircle2 size={18} />
                <div>
                  <strong>
                    {
                      createdNote.deliveryNoteNumber
                    }{" "}
                    created
                  </strong>
                  <p>
                    Status:{" "}
                    {createdNote.status ||
                      "CREATED"}
                    . Dispatch is handled
                    separately.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      navigate(listPath)
                    }
                  >
                    Go to Delivery Notes
                  </Button>
                </div>
              </div>
            )}
            {uncertain && (
              <div
                className="doc-alert"
                role="status"
              >
                The save result is uncertain.
                The form is locked to prevent an
                accidental duplicate. Check the
                Delivery Note list before
                submitting again.
              </div>
            )}
            {errors.length > 0 && (
              <div
                className="doc-alert doc-alert-error"
                role="alert"
              >
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
                {uncertain && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={exitPage}
                  >
                    Check Delivery Note List
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
        <fieldset
          className="doc-fieldset"
          disabled={locked}
        >
          <main className="doc-main">
            <section className="doc-panel dn-source-panel">
              <div className="dn-source-heading">
                <div>
                  <h2 className="doc-panel-title">Create From</h2>
                  <p className="dn-source-help">Create a Delivery Note directly or load it from a confirmed Sales Order.</p>
                </div>
                <FileText size={21} aria-hidden="true" />
              </div>

              <div className="dn-source-controls">
                <label className="dn-source-label" htmlFor="dn-create-from">Reference Type</label>
                <select
                  id="dn-create-from"
                  className="dn-source-select"
                  value={createFrom}
                  onChange={handleCreateFromChange}
                  disabled={locked}
                >
                  <option value="DIRECT">Direct (no reference)</option>
                  <option value="SALES_ORDER">Based on Sales Order</option>
                </select>

                {createFrom === "SALES_ORDER" && (
                  <>
                    <label className="dn-source-label" htmlFor="dn-sales-order">Sales Order Number</label>
                    <select
                      id="dn-sales-order"
                      className="dn-source-select"
                      value={selectedOrderNumber}
                      onChange={handleSalesOrderChange}
                      disabled={locked || ordersLoading || orderLoading}
                    >
                      <option value="">
                        {ordersLoading ? "Loading Sales Orders..." : "Select Sales Order"}
                      </option>
                      {salesOrders.map((order) => (
                        <option key={order._id} value={order.orderNumber}>
                          {order.orderNumber} — {order.customerName || "Customer"} ({order.status})
                        </option>
                      ))}
                    </select>
                    {ordersLoading && <span className="dn-source-loading"><LoaderCircle size={14} /> Loading orders...</span>}
                    {!ordersLoading && salesOrders.length === 0 && (
                      <span className="dn-source-help">No confirmed or in-progress Sales Orders found.</span>
                    )}
                    {orderLoading && <span className="dn-source-loading"><LoaderCircle size={14} /> Loading Sales Order details...</span>}
                  </>
                )}
              </div>

              {selectedSalesOrder && (
                <div className="dn-order-summary">
                  <div className="dn-order-summary-top">
                    <div>
                      <span className="dn-order-eyebrow">Selected Sales Order</span>
                      <strong>{selectedSalesOrder.orderNumber}</strong>
                    </div>
                    <span className="dn-order-status">{selectedSalesOrder.status}</span>
                  </div>
                  <div className="dn-order-summary-grid">
                    <div><span>Customer</span><strong>{selectedSalesOrder.customerName || "—"}</strong></div>
                    <div><span>Customer Code</span><strong>{selectedSalesOrder.customerCode || "—"}</strong></div>
                    <div><span>Order Date</span><strong>{orderDateLabel(selectedSalesOrder.orderDate)}</strong></div>
                    <div><span>GSTIN</span><strong>{selectedSalesOrder.customerGstNo || "—"}</strong></div>
                    <div><span>Expected Delivery</span><strong>{orderDateLabel(selectedSalesOrder.expectedDeliveryDate)}</strong></div>
                    <div><span>Tax Mode</span><strong>{selectedSalesOrder.taxMode || "—"}</strong></div>
                    <div><span>Payment Terms</span><strong>{selectedSalesOrder.paymentTerms || "—"}</strong></div>
                    <div><span>Taxable Amount</span><strong>{moneyFromPaise(selectedSalesOrder.taxableAmountPaise)}</strong></div>
                    <div><span>CGST / SGST / IGST</span><strong>{moneyFromPaise(selectedSalesOrder.cgstAmountPaise)} / {moneyFromPaise(selectedSalesOrder.sgstAmountPaise)} / {moneyFromPaise(selectedSalesOrder.igstAmountPaise)}</strong></div>
                    <div><span>Order Total</span><strong>{moneyFromPaise(selectedSalesOrder.totalAmountPaise)}</strong></div>
                  </div>
                  <p className="dn-order-hint">Customer, addresses and Goods items are loaded from this order. You can adjust delivery quantities, but cannot change the linked products.</p>
                </div>
              )}
            </section>

            <section className="doc-top">
              <div className="doc-panel doc-party-panel">
                <h2 className="doc-panel-title">
                  {createFrom === "SALES_ORDER" ? "Deliver To (from Sales Order)" : "Deliver To"}
                </h2>
                <EntitySearchPicker
                  label="Customer"
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
                  disabled={locked || createFrom === "SALES_ORDER"}
                  pageSize={20}
                  debounceMs={350}
                  emptyMessage="No matching customers found."
                />
                {selectedCustomer && (
                  <div className="doc-party-card dn-party-card">
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
                        <span>GSTIN:</span>{" "}
                        {selectedCustomer.gstNo ||
                          "Not provided"}
                      </p>
                      <p>
                        <span>Phone:</span>{" "}
                        {selectedCustomer.phone ||
                          "Not provided"}
                      </p>
                      <p>
                        <span>
                          Customer Address:
                        </span>{" "}
                        {addressText(
                          selectedCustomer,
                          "billing",
                        ) || "Not provided"}
                      </p>
                    </div>
                  </div>
                )}
                <div className="dn-address-fields">
                  <Textarea
                    label="Shipping Address"
                    name="shippingAddress"
                    value={
                      form.shippingAddress
                    }
                    onChange={
                      handleFieldChange
                    }
                    maxLength={2000}
                    rows={3}
                    required
                    readOnly={createFrom === "SALES_ORDER"}
                  />
                  <Textarea
                    label="Billing Address"
                    name="billingAddress"
                    value={
                      form.billingAddress
                    }
                    onChange={
                      handleFieldChange
                    }
                    maxLength={2000}
                    rows={3}
                    readOnly={createFrom === "SALES_ORDER"}
                  />
                </div>
              </div>
              <div className="doc-panel">
                <h2 className="doc-panel-title">
                  Delivery Note Details
                </h2>
                <div className="doc-fields-grid">
                  <Input
                    label="Delivery Note Number"
                    name="deliveryNoteNumber"
                    value="Generated after saving"
                    readOnly
                  />
                  {renderInput(
                    "Delivery Note Date",
                    "deliveryDate",
                    {
                      type: "date",
                      required: true,
                    },
                  )}
                  {renderInput(
                    "Expected Delivery",
                    "expectedDeliveryDate",
                    {
                      type: "date",
                      min: form.deliveryDate,
                    },
                  )}
                  {renderInput(
                    "Customer Reference",
                    "customerReference",
                    {
                      maxLength: 100,
                    },
                  )}
                  {renderInput(
                    "Contact Person",
                    "contactPerson",
                    {
                      maxLength: 150,
                    },
                  )}
                  {renderInput(
                    "Contact Phone",
                    "contactPhone",
                    {
                      type: "tel",
                      maxLength: 30,
                    },
                  )}
                </div>
              </div>
            </section>
            <section className="doc-items">
              <div className="doc-table-wrap">
                <table className="doc-table dn-items-table">
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Goods Product</th>
                      <th>Unit</th>
                      <th>Quantity</th>
                      <th>Specification</th>
                      <th>Notes</th>
                      <th>
                        <span className="doc-sr-only">
                          Remove
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(
                      (item, index) => {
                        const product =
                          productMap.get(
                            item.productId,
                          );
                        return (
                          <tr
                            key={item.rowId}
                          >
                            <td
                              className="doc-cell-no"
                              data-label="No."
                            >
                              {index + 1}
                            </td>
                            <td
                              className="doc-cell-item"
                              data-label="Goods Product"
                            >
                              {createFrom === "SALES_ORDER" ? (
                                <div className="dn-linked-product">
                                  <strong>{product?.name || "Product"}</strong>
                                  <small>{product?.productCode || ""}</small>
                                  <small>HSN/SAC: {item.hsnSacCode || "—"}</small>
                                  <small>Rate: {moneyFromPaise(item.unitRatePaise)} · GST: {item.gstRate}%</small>
                                  <small>Taxable: {moneyFromPaise(item.taxableAmountPaise)} · Line Total: {moneyFromPaise(item.totalAmountPaise)}</small>
                                  <small>Order line: {item.salesOrderLineId}</small>
                                </div>
                              ) : (
                                <EntitySearchPicker
                                  placeholder="Search Goods product..."
                                  fetchOptions={fetchGoodsProductOptions}
                                  getOptionId={getProductOptionId}
                                  getOptionLabel={getProductOptionLabel}
                                  getOptionSubtitle={getProductOptionSubtitle}
                                  selectedIds={item.productId ? [item.productId] : []}
                                  selectedLabel={productLabel(product)}
                                  onToggle={(productId, productRecord) =>
                                    selectProduct(item.rowId, productId, productRecord)
                                  }
                                  multiple={false}
                                  disabled={locked}
                                  pageSize={20}
                                  debounceMs={350}
                                  emptyMessage="No matching Goods products found."
                                />
                              )}
                              {product && (
                                <small className="doc-item-meta">
                                  {product.trackInventory
                                    ? `Current stock: ${
                                        product.currentStock ??
                                        0
                                      } ${
                                        product.unit ||
                                        ""
                                      }`
                                    : "Inventory not tracked"}
                                </small>
                              )}
                            </td>
                            <td data-label="Unit">
                              <Input
                                name={`unit-${item.rowId}`}
                                aria-label={`Unit ${
                                  index + 1
                                }`}
                                value={
                                  product?.unit ||
                                  "—"
                                }
                                readOnly
                              />
                            </td>
                            <td data-label="Quantity">
                              <Input
                                name={`quantity-${item.rowId}`}
                                aria-label={`Quantity ${
                                  index + 1
                                }`}
                                type="number"
                                min="0.001"
                                max="1000000"
                                step="0.001"
                                inputMode="decimal"
                                value={
                                  item.quantity
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateItem(
                                    item.rowId,
                                    "quantity",
                                    event.target.value,
                                  )
                                }
                              />
                              {createFrom === "SALES_ORDER" && (
                                <small className="dn-quantity-limit">
                                  Ordered: {item.orderedQuantity} {product?.unit || ""}
                                </small>
                              )}
                            </td>
                            <td data-label="Specification">
                              <Input
                                name={`specification-${item.rowId}`}
                                aria-label={`Specification ${
                                  index + 1
                                }`}
                                value={
                                  item.specification
                                }
                                maxLength={
                                  1000
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateItem(
                                    item.rowId,
                                    "specification",
                                    event.target.value,
                                  )
                                }
                                readOnly={createFrom === "SALES_ORDER"}
                              />
                            </td>
                            <td data-label="Item Notes">
                              <Input
                                name={`notes-${item.rowId}`}
                                aria-label={`Notes ${
                                  index + 1
                                }`}
                                value={
                                  item.notes
                                }
                                maxLength={
                                  500
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateItem(
                                    item.rowId,
                                    "notes",
                                    event.target.value,
                                  )
                                }
                              />
                            </td>
                            <td
                              className="doc-cell-action"
                              data-label="Remove"
                            >
                              <button
                                type="button"
                                className="doc-remove-button"
                                aria-label={`Remove item ${
                                  index + 1
                                }`}
                                disabled={
                                  locked ||
                                  items.length <= 1
                                }
                                onClick={() =>
                                  removeItem(
                                    item.rowId,
                                  )
                                }
                              >
                                <Trash2
                                  size={16}
                                />
                              </button>
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>
              <div className="doc-add-item-row">
                <button
                  type="button"
                  className="doc-dashed-line"
                  onClick={addItem}
                  disabled={
                    locked ||
                    items.length >= 200
                  }
                >
                  <Plus size={16} />
                  Add Item
                </button>
              </div>
            </section>
            <section className="doc-panel dn-transport-panel">
              <h2 className="doc-panel-title">
                Transport Details
              </h2>
              <div className="doc-fields-grid dn-transport-grid">
                {renderInput(
                  "Transporter",
                  "transporterName",
                  {
                    maxLength: 200,
                  },
                )}
                {renderInput(
                  "Vehicle Number",
                  "vehicleNumber",
                  {
                    maxLength: 30,
                  },
                )}
                {renderInput(
                  "Tracking Number",
                  "trackingNumber",
                  {
                    maxLength: 100,
                  },
                )}
                {renderInput(
                  "Transport Document Number",
                  "transportDocumentNumber",
                  {
                    maxLength: 100,
                  },
                )}
                {renderInput(
                  "Transport Document Date",
                  "transportDocumentDate",
                  {
                    type: "date",
                  },
                )}
                {renderInput(
                  "E-Way Bill Reference",
                  "eWayBillNumber",
                  {
                    maxLength: 50,
                  },
                )}
              </div>
              <p className="doc-note">
                E-way bill reference is
                informational. This screen does
                not generate an e-way bill.
              </p>
            </section>
            <section className="doc-bottom">
              <div className="doc-extras">
                <button
                  type="button"
                  className={`doc-extra-row ${
                    showNotes
                      ? "is-open"
                      : ""
                  }`}
                  aria-expanded={showNotes}
                  onClick={() =>
                    setShowNotes(
                      (value) => !value,
                    )
                  }
                >
                  <StickyNote size={16} />
                  <span>Notes</span>
                  <ChevronDown size={16} />
                </button>
                {showNotes && (
                  <div className="doc-extra-content">
                    <Textarea
                      name="notes"
                      aria-label="Delivery Note notes"
                      value={form.notes}
                      onChange={
                        handleFieldChange
                      }
                      maxLength={1000}
                      rows={3}
                    />
                  </div>
                )}
                <button
                  type="button"
                  className={`doc-extra-row ${
                    showTerms
                      ? "is-open"
                      : ""
                  }`}
                  aria-expanded={showTerms}
                  onClick={() =>
                    setShowTerms(
                      (value) => !value,
                    )
                  }
                >
                  <ClipboardList size={16} />
                  <span>
                    Terms & Conditions
                  </span>
                  <ChevronDown size={16} />
                </button>
                {showTerms && (
                  <div className="doc-extra-content">
                    <Textarea
                      name="termsAndConditions"
                      aria-label="Delivery terms and conditions"
                      value={
                        form.termsAndConditions
                      }
                      onChange={
                        handleFieldChange
                      }
                      maxLength={5000}
                      rows={4}
                    />
                  </div>
                )}
              </div>
              <div className="doc-summary">
                <div className="doc-summary-row">
                  <span>Creation Status</span>
                  <strong>
                    {createdNote?.status ||
                      "CREATED"}
                  </strong>
                </div>
                <div className="doc-summary-row">
                  <span>Selected Products</span>
                  <strong>
                    {selectedItemCount}
                  </strong>
                </div>
                {quantityByUnit.map(
                  (entry) => (
                    <div
                      className="doc-summary-row"
                      key={entry.unit}
                    >
                      <span>
                        Quantity (
                        {entry.unit})
                      </span>
                      <strong>
                        {entry.quantity}
                      </strong>
                    </div>
                  ),
                )}
                <p className="doc-note">
                  Quantities with different units
                  are not added together. Saving
                  creates the document only.
                  Stock is checked and deducted
                  at dispatch.
                </p>
              </div>
            </section>
          </main>
        </fieldset>
        <div
          className="doc-mobile-bar dn-mobile-save-bar"
          hidden={keyboardOpen}
        >
          <div className="doc-mobile-total">
            <span>
              {createdNote
                ? createdNote.deliveryNoteNumber
                : "Delivery Note"}
            </span>
            <strong>
              {createdNote
                ? createdNote.status ||
                  "CREATED"
                : `${selectedItemCount} items`}
            </strong>
          </div>
          <div className="doc-mobile-actions">
            <Button
              type="button"
              variant="secondary"
              icon={ArrowLeft}
              disabled={saving}
              onClick={exitPage}
            >
              Exit
            </Button>
            {createdNote || uncertain ? (
              <Button
                type="button"
                disabled={saving}
                onClick={exitPage}
              >
                {uncertain
                  ? "Check List"
                  : "Go to List"}
              </Button>
            ) : (
              <Button
                type="button"
                icon={Save}
                loading={saving}
                disabled={locked || orderLoading || (createFrom === "SALES_ORDER" && !selectedSalesOrder)}
                onClick={handleSave}
              >
                Save Delivery Note
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
export default DeliveryNoteCreation;