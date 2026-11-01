// import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// import { useNavigate } from "react-router-dom";
// import { Plus } from "lucide-react";
// import toast from "react-hot-toast";

// import DataList from "../../../components/common/DataList/DataList";
// import StatusField from "../../../components/common/StatusField/StatusField";
// import ConfirmModal from "../../../components/common/ConfirmModal/ConfirmModal";
// import Button from "../../../components/common/Form/Button";

// import api from "../../../services/api";
// import routes, { buildRoute } from "../../../config/routes";

// const quotationApi = api.salesQuotations;

// const STATUSES = ["DRAFT", "ISSUED", "ACCEPTED", "REJECTED", "CANCELLED"];

// const STATUS_LABELS = {
//   DRAFT: "Drafts",
//   ISSUED: "Issued",
//   ACCEPTED: "Accepted",
//   REJECTED: "Rejected",
//   CANCELLED: "Cancelled",
// };

// const FILTERS = [
//   {
//     key: "status",
//     label: "Quotation Status",
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

// const ACTIONS = {
//   issue: {
//     label: "Issue",
//     title: "Issue quotation?",
//     confirmText: "Issue Quotation",
//     allowedStatus: "DRAFT",
//     description:
//       "This issues the quotation. Further changes require a revision.",
//   },

//   accept: {
//     label: "Accept",
//     title: "Accept quotation?",
//     confirmText: "Accept Quotation",
//     allowedStatus: "ISSUED",
//     description: "Record this quotation as accepted by the customer.",
//   },

//   reject: {
//     label: "Reject",
//     title: "Reject quotation?",
//     confirmText: "Reject Quotation",
//     allowedStatus: "ISSUED",
//     description: "Record this quotation as rejected by the customer.",
//   },

//   cancel: {
//     label: "Cancel",
//     title: "Cancel quotation?",
//     confirmText: "Cancel Quotation",
//     allowedStatus: "DRAFT",
//     description: "This cancels the draft quotation.",
//   },

//   delete: {
//     label: "Delete",
//     title: "Delete quotation draft?",
//     confirmText: "Delete Draft",
//     allowedStatus: "DRAFT",
//     description: "This draft will be marked as deleted.",
//   },
// };

// const emptyConfirmState = () => ({
//   open: false,
//   action: "",
//   quotation: null,
// });

// const currencyFormatter = new Intl.NumberFormat("en-IN", {
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
//     ? currencyFormatter.format(amount / 100)
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

//   return body?.message || error?.message || "Unable to complete the request.";
// };

// const assertSuccess = (response) => {
//   if (response?.data?.success !== true) {
//     throw new Error(response?.data?.message || "Request failed");
//   }
// };

// const extractList = (response) => {
//   assertSuccess(response);

//   if (!Array.isArray(response.data.data)) {
//     throw new Error("Invalid quotation list response");
//   }

//   return response.data.data;
// };

// const extractQuotation = (response) => {
//   assertSuccess(response);

//   const quotation = response.data.data;

//   if (!quotation?._id || !quotation.quotationNumber) {
//     throw new Error("Invalid quotation response");
//   }

//   return quotation;
// };

// const assertVersion = (quotation) => {
//   if (!Number.isSafeInteger(quotation.__v) || quotation.__v < 0) {
//     throw new Error("Quotation version is missing. Refresh the list.");
//   }
// };

// const getRouteParams = (quotation) => {
//   const quotationNumber = quotation?.quotationNumber?.trim();

//   if (!quotationNumber) {
//     throw new Error("Quotation number is missing.");
//   }

//   if (!Number.isSafeInteger(quotation.revision) || quotation.revision < 1) {
//     throw new Error("Quotation revision is missing.");
//   }

//   return {
//     quotationNumber: encodeURIComponent(quotationNumber),
//     revision: String(quotation.revision),
//   };
// };

// const documentLabel = (quotation) =>
//   `${quotation.quotationNumber} / R${quotation.revision}`;

// function SalesQuotationsList() {
//   const navigate = useNavigate();

//   const [quotations, setQuotations] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [loadError, setLoadError] = useState("");

//   const [confirmState, setConfirmState] = useState(emptyConfirmState);

//   const [confirmLoading, setConfirmLoading] = useState(false);

//   const mountedRef = useRef(false);
//   const requestRef = useRef(0);
//   const mutationLockRef = useRef(false);

//   useEffect(() => {
//     mountedRef.current = true;

//     return () => {
//       mountedRef.current = false;
//       requestRef.current += 1;
//     };
//   }, []);

//   const loadQuotations = useCallback(async () => {
//     const requestId = ++requestRef.current;

//     setLoading(true);
//     setLoadError("");

//     try {
//       if (typeof quotationApi?.getAll !== "function") {
//         throw new Error("Configure api.salesQuotations.getAll first.");
//       }

//       const firstResponse = await quotationApi.getAll({
//         page: 1,
//         limit: 100,
//       });

//       const records = [...extractList(firstResponse)];

//       const totalPages = Math.max(
//         1,
//         Number(firstResponse.data.pagination?.totalPages) || 1,
//       );

//       for (let page = 2; page <= totalPages; page += 1) {
//         if (!mountedRef.current || requestId !== requestRef.current) {
//           return;
//         }

//         const response = await quotationApi.getAll({
//           page,
//           limit: 100,
//         });

//         records.push(...extractList(response));
//       }

//       if (!mountedRef.current || requestId !== requestRef.current) {
//         return;
//       }

//       setQuotations(
//         Array.from(
//           new Map(
//             records.map((quotation) => [quotation._id, quotation]),
//           ).values(),
//         ),
//       );
//     } catch (error) {
//       if (mountedRef.current && requestId === requestRef.current) {
//         const message = getErrorMessage(error);

//         setLoadError(message);
//         toast.error(message);
//       }
//     } finally {
//       if (mountedRef.current && requestId === requestRef.current) {
//         setLoading(false);
//       }
//     }
//   }, []);

//   useEffect(() => {
//     void loadQuotations();
//   }, [loadQuotations]);

//   const handleView = useCallback(
//     (row) => {
//       if (mutationLockRef.current) return;

//       try {
//         navigate(buildRoute(routes.sales.viewQuotation, getRouteParams(row)));
//       } catch (error) {
//         toast.error(getErrorMessage(error));
//       }
//     },
//     [navigate],
//   );

//   const handleEdit = useCallback(
//     (row) => {
//       if (mutationLockRef.current) return;

//       if (row.status !== "DRAFT") {
//         toast.error("Only draft quotations can be edited.");
//         return;
//       }

//       try {
//         navigate(buildRoute(routes.sales.editQuotation, getRouteParams(row)));
//       } catch (error) {
//         toast.error(getErrorMessage(error));
//       }
//     },
//     [navigate],
//   );

//   const openAction = useCallback((row, action) => {
//     if (mutationLockRef.current) return;

//     const config = ACTIONS[action];

//     if (!config) return;

//     if (row.status !== config.allowedStatus) {
//       toast.error(
//         `This action requires a ${config.allowedStatus.toLowerCase()} quotation.`,
//       );
//       return;
//     }

//     try {
//       if (!row._id) {
//         throw new Error("Quotation record ID is missing.");
//       }

//       assertVersion(row);

//       setConfirmState({
//         open: true,
//         action,
//         quotation: row,
//       });
//     } catch (error) {
//       toast.error(getErrorMessage(error));
//     }
//   }, []);

//   const closeConfirm = () => {
//     if (mutationLockRef.current) return;

//     setConfirmState(emptyConfirmState());
//   };

//   const handleConfirm = async () => {
//     const { action, quotation } = confirmState;
//     const config = ACTIONS[action];

//     if (mutationLockRef.current || !quotation || !config) {
//       return;
//     }

//     mutationLockRef.current = true;
//     requestRef.current += 1;

//     setLoading(false);
//     setConfirmLoading(true);

//     try {
//       if (
//         typeof quotationApi?.getById !== "function" ||
//         typeof quotationApi[action] !== "function"
//       ) {
//         throw new Error("Quotation API methods are not configured.");
//       }

//       // Existing workflow endpoints still identify
//       // the exact database record by its internal ID.
//       const latestResponse = await quotationApi.getById(quotation._id);

//       const latest = extractQuotation(latestResponse);

//       assertVersion(latest);

//       if (
//         latest.__v !== quotation.__v ||
//         latest.status !== quotation.status ||
//         latest.status !== config.allowedStatus
//       ) {
//         throw new Error(
//           "This quotation changed. Review the refreshed list before trying again.",
//         );
//       }

//       const response = await quotationApi[action](quotation._id, {
//         version: quotation.__v,
//       });

//       assertSuccess(response);

//       if (mountedRef.current) {
//         toast.success(
//           response.data.message || "Quotation updated successfully",
//         );
//       }
//     } catch (error) {
//       if (mountedRef.current) {
//         toast.error(getErrorMessage(error));
//       }
//     } finally {
//       if (mountedRef.current) {
//         setConfirmState(emptyConfirmState());
//         await loadQuotations();
//       }

//       mutationLockRef.current = false;

//       if (mountedRef.current) {
//         setConfirmLoading(false);
//       }
//     }
//   };

//   const columns = useMemo(
//     () => [
//       {
//         key: "quotationNumber",
//         label: "Quotation",
//         sortable: true,

//         render: (value, row) => (
//           <button
//             type="button"
//             className="doc-link-button"
//             disabled={confirmLoading}
//             onClick={(event) => {
//               event.stopPropagation();
//               handleView(row);
//             }}
//           >
//             {value || "—"}
//           </button>
//         ),
//       },

//       {
//         key: "revision",
//         label: "Revision",
//         type: "number",
//         sortable: true,
//         render: (value) => `R${value}`,
//       },

//       {
//         key: "customerName",
//         label: "Customer",
//         sortable: true,

//         render: (value, row) => (
//           <div className="dl-customer">
//             <strong>{value || "—"}</strong>
//             <span>{row.customerCode || "—"}</span>
//           </div>
//         ),
//       },

//       {
//         key: "quotationDate",
//         label: "Quotation Date",
//         sortable: true,
//         render: formatDate,
//       },

//       {
//         key: "validUntil",
//         label: "Valid Until",
//         sortable: true,
//         render: formatDate,
//       },

//       {
//         key: "enquiryReference",
//         label: "Enquiry Reference",
//         sortable: true,
//         render: (value) => value || "—",
//       },

//       {
//         key: "totalAmountPaise",
//         label: "Total Amount",
//         type: "number",
//         sortable: true,
//         render: formatPaise,
//       },

//       {
//         key: "conversionStatus",
//         label: "Status",
//         sortable: true,

//         render: (_value, row) => {
//           if (row.conversionStatus === "CONVERTED") {
//             return (
//               <div className="dl-customer">
//                 <strong>Converted</strong>

//                 <span>
//                   {row.existingOrder?.orderNumber || "Sales Order created"}
//                 </span>
//               </div>
//             );
//           }

//           if (row.conversionStatus === "COMPARISON_CLOSED") {
//             return (
//               <div className="dl-customer">
//                 <strong>Comparison Closed</strong>

//                 <span>
//                   {row.groupExistingOrder?.orderNumber ||
//                     "Another customer selected"}
//                 </span>
//               </div>
//             );
//           }

//           return <StatusField value={row.status} />;
//         },
//       },

//       {
//         key: "workflow",
//         label: "Compare Offers",
//         sortable: false,

//         render: (_value, row) => (
//           <Button
//             variant="secondary"
//             disabled={confirmLoading || !row.comparisonGroupId}
//             onClick={(event) => {
//               event?.stopPropagation();

//               navigate(
//                 buildRoute(routes.sales.compareQuotations, {
//                   comparisonGroupId: encodeURIComponent(
//                     String(row.comparisonGroupId),
//                   ),
//                 }),
//               );
//             }}
//           >
//             Compare
//           </Button>
//         ),
//       },

//       {
//         key: "expectedDeliveryDate",
//         label: "Expected Delivery",
//         sortable: true,
//         visible: false,
//         render: formatDate,
//       },

//       {
//         key: "paymentTerms",
//         label: "Payment Terms",
//         sortable: true,
//         visible: false,
//       },

//       {
//         key: "deliveryTerms",
//         label: "Delivery Terms",
//         visible: false,
//       },

//       {
//         key: "taxMode",
//         label: "Tax Mode",
//         sortable: true,
//         visible: false,
//       },

//       ...[
//         ["grossAmountPaise", "Gross Amount"],
//         ["discountAmountPaise", "Discount"],
//         ["taxableAmountPaise", "Taxable Amount"],
//         ["cgstAmountPaise", "CGST"],
//         ["sgstAmountPaise", "SGST"],
//         ["igstAmountPaise", "IGST"],
//       ].map(([key, label]) => ({
//         key,
//         label,
//         type: "number",
//         sortable: true,
//         visible: false,
//         render: formatPaise,
//       })),

//       {
//         key: "issuedAt",
//         label: "Issued On",
//         sortable: true,
//         visible: false,
//         render: formatDate,
//       },

//       {
//         key: "notes",
//         label: "Notes",
//         visible: false,
//         render: (value) => value || "—",
//       },
//     ],
//     [confirmLoading, handleView, openAction],
//   );

//   const selectedQuotation = confirmState.quotation;
//   const selectedAction = ACTIONS[confirmState.action];

//   return (
//     <>
//       {loadError && (
//         <div role="alert">
//           <p>Unable to load quotations: {loadError}</p>

//           <Button
//             variant="secondary"
//             disabled={loading || confirmLoading}
//             onClick={() => void loadQuotations()}
//           >
//             Retry
//           </Button>
//         </div>
//       )}

//       <DataList
//         title="Sales Quotations"
//         subtitle="Manage customer quotations, revisions, and approvals"
//         columns={columns}
//         data={quotations}
//         loading={loading}
//         rowKey="_id"
//         showCase="list"
//         searchable
//         filterable
//         sortable
//         columnVisibility
//         pagination
//         filters={FILTERS}
//         quickFilters={QUICK_FILTERS}
//         storageKey="trustiq-sales-quotations"
//         searchPlaceholder="Search quotation, customer, code, enquiry..."
//         actions={{
//           view: handleView,
//           edit: handleEdit,

//           delete: (row) => {
//             openAction(row, "delete");
//           },
//         }}
//         onRefresh={() => {
//           if (!mutationLockRef.current) {
//             void loadQuotations();
//           }
//         }}
//         addButton={
//           <Button
//             icon={Plus}
//             disabled={confirmLoading}
//             onClick={() => navigate(routes.sales.createQuotation)}
//           >
//             New Quotation
//           </Button>
//         }
//       />

//       <ConfirmModal
//         open={confirmState.open}
//         type="danger"
//         title={selectedAction?.title || ""}
//         message={
//           selectedQuotation && selectedAction
//             ? `${documentLabel(selectedQuotation)} for ${
//                 selectedQuotation.customerName
//               }. ${selectedAction.description}`
//             : ""
//         }
//         confirmText={selectedAction?.confirmText || "Confirm"}
//         cancelText="Back"
//         loading={confirmLoading}
//         onCancel={closeConfirm}
//         onConfirm={handleConfirm}
//       />
//     </>
//   );
// }

// export default SalesQuotationsList;

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";

import DataList from "../../../components/common/DataList/DataList";
import StatusField from "../../../components/common/StatusField/StatusField";
import ConfirmModal from "../../../components/common/ConfirmModal/ConfirmModal";
import Button from "../../../components/common/Form/Button";

import { saveCsvFile } from "../../../components/common/DataList/fileDownload";

import api from "../../../services/api";
import routes, {
  buildRoute,
} from "../../../config/routes";

import "./SalesQuotationsList.css";

const quotationApi = api.salesQuotations;

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

const SERVER_SORTING_ENABLED = false;

const PAGE_SIZE_OPTIONS = [20, 50, 100];
const SEARCH_DEBOUNCE_MS = 400;
const EXPORT_BATCH_SIZE = 100;

const STATUSES = [
  "DRAFT",
  "ISSUED",
  "ACCEPTED",
  "REJECTED",
  "CANCELLED",
];

const STATUS_LABELS = {
  DRAFT: "Drafts",
  ISSUED: "Issued",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

const SORT_FIELDS = new Set([
  "quotationNumber",
  "revision",
  "quotationDate",
  "validUntil",
  "enquiryReference",
  "totalAmountPaise",
  "status",
  "expectedDeliveryDate",
  "paymentTerms",
  "taxMode",
  "grossAmountPaise",
  "discountAmountPaise",
  "taxableAmountPaise",
  "cgstAmountPaise",
  "sgstAmountPaise",
  "igstAmountPaise",
  "issuedAt",
  "createdAt",
]);

const FILTERS = [
  {
    key: "status",
    label: "Quotation Status",
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

const ACTIONS = {
  issue: {
    label: "Issue",
    title: "Issue quotation?",
    allowedStatus: "DRAFT",
    past: "issued",
    description:
      "This issues the quotation. Further changes require a revision.",
  },

  accept: {
    label: "Accept",
    title: "Accept quotation?",
    allowedStatus: "ISSUED",
    past: "accepted",
    description:
      "Record the quotation as accepted by the customer.",
  },

  reject: {
    label: "Reject",
    title: "Reject quotation?",
    allowedStatus: "ISSUED",
    past: "rejected",
    description:
      "Record the quotation as rejected by the customer.",
  },

  cancel: {
    label: "Cancel",
    title: "Cancel quotation?",
    allowedStatus: "DRAFT",
    past: "cancelled",
    description:
      "This cancels the draft quotation.",
  },

  delete: {
    label: "Delete",
    title: "Delete quotation draft?",
    allowedStatus: "DRAFT",
    past: "deleted",
    description:
      "The draft will be marked as deleted.",
  },
};

const EMPTY_CONFIRM = {
  open: false,
  action: "",
  targets: [],
};

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
    ? currencyFormatter.format(amount / 100)
    : "—";
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
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

const normalizeId = (value) => {
  if (!value) return "";

  if (typeof value === "object") {
    return String(
      value._id || value.id || "",
    );
  }

  return String(value);
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

const extractQuotation = (response) => {
  assertSuccess(response);

  const quotation = response.data.data;

  if (
    !quotation?._id ||
    !quotation.quotationNumber
  ) {
    throw new Error(
      "Invalid quotation response.",
    );
  }

  return quotation;
};

const readQuotationPage = (response) => {
  assertSuccess(response);

  if (!Array.isArray(response.data.data)) {
    throw new Error(
      "Invalid quotation list response.",
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
      "The quotation list endpoint must return pagination.total.",
    );
  }

  return {
    data: response.data.data,
    total: Number(rawTotal),
    pagination,
  };
};

const assertVersion = (quotation) => {
  if (
    !Number.isSafeInteger(quotation.__v) ||
    quotation.__v < 0
  ) {
    throw new Error(
      "Quotation version is missing. Refresh the list.",
    );
  }
};

const getRouteParams = (quotation) => {
  const quotationNumber =
    quotation?.quotationNumber?.trim();

  if (!quotationNumber) {
    throw new Error(
      "Quotation number is missing.",
    );
  }

  if (
    !Number.isSafeInteger(quotation.revision) ||
    quotation.revision < 1
  ) {
    throw new Error(
      "Quotation revision is missing.",
    );
  }

  return {
    quotationNumber:
      encodeURIComponent(quotationNumber),
    revision: String(quotation.revision),
  };
};

const documentLabel = (quotation) =>
  `${quotation.quotationNumber} / R${quotation.revision}`;

const uniqueQuotations = (records) =>
  Array.from(
    new Map(
      records.map((record) => [
        String(record._id),
        record,
      ]),
    ).values(),
  );

/* ------------------------------------------------------------------ */
/* CSV fields                                                          */
/* ------------------------------------------------------------------ */

const EXPORT_FIELDS = [
  ["Quotation Number", (row) => row.quotationNumber],
  ["Revision", (row) => row.revision],
  ["Customer", (row) => row.customerName],
  ["Customer Code", (row) => row.customerCode],
  [
    "Quotation Date",
    (row) => csvDate(row.quotationDate),
  ],
  [
    "Valid Until",
    (row) => csvDate(row.validUntil),
  ],
  [
    "Expected Delivery",
    (row) => csvDate(row.expectedDeliveryDate),
  ],
  ["Enquiry Reference", (row) => row.enquiryReference],
  ["Status", (row) => row.status],
  ["Conversion Status", (row) => row.conversionStatus],
  [
    "Comparison Group",
    (row) => normalizeId(row.comparisonGroupId),
  ],
  [
    "Sales Order",
    (row) => row.existingOrder?.orderNumber,
  ],
  [
    "Comparison Sales Order",
    (row) => row.groupExistingOrder?.orderNumber,
  ],
  ["Payment Terms", (row) => row.paymentTerms],
  ["Delivery Terms", (row) => row.deliveryTerms],
  ["Tax Mode", (row) => row.taxMode],
  ["Gross (Paise)", (row) => row.grossAmountPaise],
  ["Discount (Paise)", (row) => row.discountAmountPaise],
  ["Taxable (Paise)", (row) => row.taxableAmountPaise],
  ["CGST (Paise)", (row) => row.cgstAmountPaise],
  ["SGST (Paise)", (row) => row.sgstAmountPaise],
  ["IGST (Paise)", (row) => row.igstAmountPaise],
  ["Total (Paise)", (row) => row.totalAmountPaise],
  [
    "Issued On",
    (row) => csvDate(row.issuedAt),
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
/* Component                                                           */
/* ------------------------------------------------------------------ */

function SalesQuotationsList() {
  const navigate = useNavigate();

  const [quotations, setQuotations] = useState([]);
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
    key: "quotationDate",
    direction: "desc",
  });

  const [stats, setStats] = useState(null);

  const [confirmState, setConfirmState] =
    useState(EMPTY_CONFIRM);

  const [confirmLoading, setConfirmLoading] =
    useState(false);

  const [actionFinished, setActionFinished] =
    useState(false);

  const [failures, setFailures] = useState([]);

  const [progress, setProgress] = useState({
    done: 0,
    total: 0,
  });

  const mountedRef = useRef(false);
  const requestRef = useRef(0);
  const statsRef = useRef(0);
  const mutationLockRef = useRef(false);
  const exportLockRef = useRef(false);
  const refreshRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      requestRef.current += 1;
      statsRef.current += 1;
    };
  }, []);

  /* ---------------------------------------------------------------- */
  /* Search and request parameters                                     */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    const next = searchInput.trim();

    if (next === search) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setSearch(next);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

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
  /* Load one page                                                     */
  /* ---------------------------------------------------------------- */

  const loadQuotations = useCallback(async () => {
    if (!mountedRef.current) return;

    const requestId = ++requestRef.current;

    const current = () =>
      mountedRef.current &&
      requestId === requestRef.current;

    setLoading(true);
    setLoadError("");

    try {
      if (
        typeof quotationApi?.getAll !== "function"
      ) {
        throw new Error(
          "Configure api.salesQuotations.getAll first.",
        );
      }

      const response = await quotationApi.getAll(
        buildParams({
          page,
          limit: pageSize,
        }),
      );

      if (!current()) return;

      const result = readQuotationPage(response);

      const lastPage = Math.max(
        1,
        Math.ceil(result.total / pageSize),
      );

      if (page > lastPage) {
        setPage(lastPage);
        return;
      }

      setQuotations(result.data);
      setTotal(result.total);
    } catch (error) {
      if (!current()) return;

      const message = getErrorMessage(error);

      setQuotations([]);
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
    loadQuotations();

    return () => {
      requestRef.current += 1;
    };
  }, [loadQuotations]);

  /* ---------------------------------------------------------------- */
  /* Global workflow-status counts                                     */
  /* No count-loading message.                                         */
  /* ---------------------------------------------------------------- */

  const loadStats = useCallback(async () => {
    if (!mountedRef.current) return;

    const version = ++statsRef.current;

    try {
      const nextStats = {};

      for (const status of ["all", ...STATUSES]) {
        if (
          !mountedRef.current ||
          version !== statsRef.current
        ) {
          return;
        }

        const response = await quotationApi.getAll({
          page: 1,
          limit: 20,
          ...(status === "all"
            ? {}
            : { status }),
        });

        nextStats[status] =
          readQuotationPage(response).total;
      }

      if (
        mountedRef.current &&
        version === statsRef.current
      ) {
        setStats(nextStats);
      }
    } catch (error) {
      if (
        mountedRef.current &&
        version === statsRef.current
      ) {
        setStats(null);

        console.warn(
          "Unable to load quotation counts:",
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
      loadQuotations(),
      loadStats(),
    ]);
  }, [loadQuotations, loadStats]);

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
            key: "quotationDate",
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
  /* Navigation                                                        */
  /* ---------------------------------------------------------------- */

  const handleView = useCallback(
    (row) => {
      if (mutationLockRef.current) return;

      try {
        navigate(
          buildRoute(
            routes.sales.viewQuotation,
            getRouteParams(row),
          ),
        );
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [navigate],
  );

  const handleEdit = useCallback(
    (row) => {
      if (mutationLockRef.current) return;

      if (row.status !== "DRAFT") {
        toast.error(
          "Only draft quotations can be edited.",
        );
        return;
      }

      try {
        navigate(
          buildRoute(
            routes.sales.editQuotation,
            getRouteParams(row),
          ),
        );
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [navigate],
  );

  const handleCompare = useCallback(
    (row) => {
      if (mutationLockRef.current) return;

      const groupId = normalizeId(
        row.comparisonGroupId,
      );

      if (
        !groupId ||
        !routes.sales.compareQuotations
      ) {
        toast.error(
          "The comparison group or route is missing.",
        );
        return;
      }

      navigate(
        buildRoute(
          routes.sales.compareQuotations,
          {
            comparisonGroupId:
              encodeURIComponent(groupId),
          },
        ),
      );
    },
    [navigate],
  );

  /* ---------------------------------------------------------------- */
  /* Single and bulk actions                                           */
  /* ---------------------------------------------------------------- */

  const openAction = (input, action) => {
    if (
      mutationLockRef.current ||
      confirmState.open
    ) {
      return;
    }

    const config = ACTIONS[action];

    if (!config) return;

    const rows = Array.isArray(input)
      ? input
      : [input];

    const targets = uniqueQuotations(
      rows.filter(Boolean),
    );

    if (!targets.length) {
      toast.error(
        "Select at least one quotation.",
      );
      return;
    }

    if (
      targets.some(
        (row) =>
          row.status !== config.allowedStatus,
      )
    ) {
      toast.error(
        `Select only ${config.allowedStatus.toLowerCase()} quotations for this action.`,
      );
      return;
    }

    try {
      for (const row of targets) {
        if (!row._id) {
          throw new Error(
            "Quotation record ID is missing.",
          );
        }

        assertVersion(row);
        getRouteParams(row);
      }

      setConfirmState({
        open: true,
        action,
        targets,
      });

      setFailures([]);
      setActionFinished(false);

      setProgress({
        done: 0,
        total: targets.length,
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const closeConfirm = () => {
    if (mutationLockRef.current) return;

    setConfirmState(EMPTY_CONFIRM);
    setFailures([]);
    setActionFinished(false);
    setProgress({ done: 0, total: 0 });
  };

  const handleConfirm = async () => {
    if (mutationLockRef.current) return;

    if (actionFinished) {
      closeConfirm();
      return;
    }

    const { action } = confirmState;
    const targets = [...confirmState.targets];
    const config = ACTIONS[action];

    if (!config || !targets.length) {
      return;
    }

    if (
      typeof quotationApi?.getById !== "function" ||
      typeof quotationApi[action] !== "function"
    ) {
      toast.error(
        "Quotation API methods are not configured.",
      );
      return;
    }

    mutationLockRef.current = true;

    // Invalidate pre-action list and count requests.
    requestRef.current += 1;
    statsRef.current += 1;

    setLoading(false);
    setConfirmLoading(true);
    setFailures([]);

    setProgress({
      done: 0,
      total: targets.length,
    });

    let successCount = 0;
    const failed = [];

    try {
      // Each document has its own backend transaction.
      for (let index = 0; index < targets.length; index++) {
        if (!mountedRef.current) break;

        const selected = targets[index];
        let writeStarted = false;

        try {
          const latestResponse =
            await quotationApi.getById(
              selected._id,
            );

          const latest =
            extractQuotation(latestResponse);

          assertVersion(latest);

          if (
            String(latest._id) !==
              String(selected._id) ||
            latest.quotationNumber !==
              selected.quotationNumber ||
            latest.revision !==
              selected.revision ||
            latest.__v !== selected.__v ||
            latest.status !== selected.status ||
            latest.status !== config.allowedStatus
          ) {
            throw new Error(
              "This quotation changed. Review the refreshed list before trying again.",
            );
          }

          if (!mountedRef.current) break;

          writeStarted = true;

          const response =
            await quotationApi[action](
              selected._id,
              {
                version: selected.__v,
              },
            );

          assertSuccess(response);
          successCount += 1;
        } catch (error) {
          const status =
            error?.response?.status;

          failed.push({
            id: String(selected._id),
            label: documentLabel(selected),
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
              total: targets.length,
            });
          }
        }
      }

      if (!mountedRef.current) return;

      if (successCount) {
        toast.success(
          `${successCount} quotation${
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
      }

      await refreshRef.current?.();
    } finally {
      mutationLockRef.current = false;

      if (mountedRef.current) {
        setConfirmLoading(false);
      }
    }
  };

  /* ---------------------------------------------------------------- */
  /* Export selected records                                           */
  /* ---------------------------------------------------------------- */

  const handleExportSelected = useCallback(
    async (rows) => {
      if (exportLockRef.current) return;

      if (!Array.isArray(rows) || !rows.length) {
        toast.error(
          "Select at least one quotation.",
        );
        return;
      }

      exportLockRef.current = true;

      const toastId = toast.loading(
        "Exporting selected quotations...",
      );

      try {
        const records = uniqueQuotations(rows);

        await saveCsvFile(
          "sales-quotations-selected.csv",
          createCsv(records),
        );

        toast.success(
          `Exported ${records.length} quotations.`,
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

  /* ---------------------------------------------------------------- */
  /* Export all matching records                                       */
  /* ---------------------------------------------------------------- */

  const handleExport = useCallback(async () => {
    if (exportLockRef.current) return;

    exportLockRef.current = true;

    const toastId = toast.loading(
      "Preparing quotation export...",
    );

    try {
      const firstResponse =
        await quotationApi.getAll(
          buildParams({
            page: 1,
            limit: EXPORT_BATCH_SIZE,
          }),
        );

      const first =
        readQuotationPage(firstResponse);

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
          await quotationApi.getAll(
            buildParams({
              page: currentPage,
              limit: actualLimit,
            }),
          );

        records.push(
          ...readQuotationPage(response).data,
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

      const uniqueRecords =
        uniqueQuotations(records);

      await saveCsvFile(
        "sales-quotations-export.csv",
        createCsv(uniqueRecords),
      );

      toast.success(
        `Exported ${uniqueRecords.length} quotations.`,
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
        key: "quotationNumber",
        label: "Quotation",
        sortable: SERVER_SORTING_ENABLED,

        render: (value, row) => (
          <button
            type="button"
            className="doc-link-button"
            disabled={confirmLoading}
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
        key: "revision",
        label: "Revision",
        type: "number",
        sortable: SERVER_SORTING_ENABLED,
        render: (value) => `R${value}`,
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
        key: "quotationDate",
        label: "Quotation Date",
        sortable: SERVER_SORTING_ENABLED,
        render: formatDate,
      },
      {
        key: "validUntil",
        label: "Valid Until",
        sortable: SERVER_SORTING_ENABLED,
        render: formatDate,
      },
      {
        key: "enquiryReference",
        label: "Enquiry Reference",
        sortable: SERVER_SORTING_ENABLED,
        render: (value) => value || "—",
      },
      {
        key: "totalAmountPaise",
        label: "Total Amount",
        type: "number",
        sortable: SERVER_SORTING_ENABLED,
        render: formatPaise,
      },
      {
        key: "conversionStatus",
        label: "Status",
        sortable: false,

        render: (_value, row) => {
          if (row.conversionStatus === "CONVERTED") {
            return (
              <div className="dl-customer">
                <strong>Converted</strong>
                <span>
                  {row.existingOrder?.orderNumber ||
                    "Sales Order created"}
                </span>
              </div>
            );
          }

          if (
            row.conversionStatus ===
            "COMPARISON_CLOSED"
          ) {
            return (
              <div className="dl-customer">
                <strong>Comparison Closed</strong>
                <span>
                  {row.groupExistingOrder?.orderNumber ||
                    "Another customer selected"}
                </span>
              </div>
            );
          }

          return (
            <StatusField value={row.status} />
          );
        },
      },
      {
        key: "status",
        label: "Workflow Status",
        sortable: SERVER_SORTING_ENABLED,
        visible: false,
        render: (value) => (
          <StatusField value={value} />
        ),
      },
      {
        key: "workflow",
        label: "Compare Offers",
        sortable: false,

        render: (_value, row) => (
          <Button
            type="button"
            variant="secondary"
            disabled={
              confirmLoading ||
              !row.comparisonGroupId
            }
            onClick={(event) => {
              event?.stopPropagation();
              handleCompare(row);
            }}
          >
            Compare
          </Button>
        ),
      },
      {
        key: "workflowAction",
        label: "Workflow Action",
        sortable: false,

        render: (_value, row) => (
          <select
            className="sql-workflow-select"
            aria-label={`Workflow action for ${documentLabel(row)}`}
            value=""
            disabled={confirmLoading}
            onClick={(event) =>
              event.stopPropagation()
            }
            onChange={(event) => {
              const action = event.target.value;

              if (action) {
                openAction(row, action);
              }
            }}
          >
            <option value="">Choose action...</option>

            {Object.entries(ACTIONS)
              .filter(
                ([, config]) =>
                  row.status === config.allowedStatus,
              )
              .map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
          </select>
        ),
      },
      {
        key: "expectedDeliveryDate",
        label: "Expected Delivery",
        sortable: SERVER_SORTING_ENABLED,
        visible: false,
        render: formatDate,
      },
      {
        key: "paymentTerms",
        label: "Payment Terms",
        sortable: SERVER_SORTING_ENABLED,
        visible: false,
      },
      {
        key: "deliveryTerms",
        label: "Delivery Terms",
        sortable: false,
        visible: false,
      },
      {
        key: "taxMode",
        label: "Tax Mode",
        sortable: SERVER_SORTING_ENABLED,
        visible: false,
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
        sortable: SERVER_SORTING_ENABLED,
        visible: false,
        render: formatPaise,
      })),

      {
        key: "issuedAt",
        label: "Issued On",
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
        render: (value) => value || "—",
      },
    ],
    [
      confirmLoading,
      handleView,
      handleCompare,
      // Refresh the workflow handlers with the current dialog state.
      confirmState.open,
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

  const selectedAction =
    ACTIONS[confirmState.action];

  const targetCount =
    confirmState.targets.length;

  const confirmMessage = actionFinished
    ? "Review the results below. The list and global counts have been refreshed."
    : selectedAction && targetCount === 1
      ? `${documentLabel(
          confirmState.targets[0],
        )} for ${
          confirmState.targets[0].customerName ||
          "this customer"
        }. ${selectedAction.description}`
      : `${selectedAction?.label || "Update"} ${targetCount} selected quotations? ${
          selectedAction?.description || ""
        } Each quotation is processed separately.`;

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <div className="sql-list-page">
      {loadError && (
        <div
          className="sql-list-alert"
          role="alert"
        >
          <p>
            Unable to load quotations: {loadError}
          </p>

          <Button
            type="button"
            variant="secondary"
            disabled={loading || confirmLoading}
            onClick={refreshAll}
          >
            Retry
          </Button>
        </div>
      )}

      <DataList
        title="Sales Quotations"
        subtitle="Manage customer quotations, revisions, and approvals"
        columns={columns}
        data={quotations}
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
        storageKey="trustiq-sales-quotations"
        searchPlaceholder="Search quotation, customer, code, enquiry..."
        actions={{
          view: handleView,
          edit: handleEdit,
          delete: (row) =>
            openAction(row, "delete"),
        }}
        bulkActions={[
          {
            key: "issue",
            label: "Issue Drafts",
            action: (rows) =>
              openAction(rows, "issue"),
          },
          {
            key: "accept",
            label: "Accept Issued",
            action: (rows) =>
              openAction(rows, "accept"),
          },
          {
            key: "reject",
            label: "Reject Issued",
            danger: true,
            action: (rows) =>
              openAction(rows, "reject"),
          },
          {
            key: "cancel",
            label: "Cancel Drafts",
            danger: true,
            action: (rows) =>
              openAction(rows, "cancel"),
          },
          {
            key: "delete",
            label: "Delete Drafts",
            danger: true,
            action: (rows) =>
              openAction(rows, "delete"),
          },
          {
            key: "export",
            label: "Export Selected",
            action: handleExportSelected,
          },
        ]}
        onRefresh={() => {
          if (!mutationLockRef.current) {
            return refreshAll();
          }
        }}
        onExport={handleExport}
        addButton={
          <Button
            type="button"
            icon={Plus}
            disabled={confirmLoading}
            onClick={() =>
              navigate(
                routes.sales.createQuotation,
              )
            }
          >
            New Quotation
          </Button>
        }
      />

      <ConfirmModal
        open={confirmState.open}
        type="danger"
        title={
          actionFinished
            ? "Quotation action results"
            : targetCount > 1
              ? `${selectedAction?.label || "Update"} selected quotations?`
              : selectedAction?.title || ""
        }
        message={confirmMessage}
        confirmText={
          actionFinished
            ? "Close"
            : `${selectedAction?.label || "Confirm"} ${
                targetCount
              } Quotation${
                targetCount === 1 ? "" : "s"
              }`
        }
        cancelText="Back"
        loading={confirmLoading}
        loadingText={`Processing ${progress.done}/${progress.total}...`}
        onCancel={closeConfirm}
        onConfirm={handleConfirm}
      >
        <div className="sql-confirm-content">
          {!actionFinished && (
            <p className="sql-confirm-note">
              The exact revision and version selected
              will be checked before each change.
              Changed quotations will not be submitted.
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
              className="sql-action-errors"
              role="alert"
            >
              <strong>
                Some actions could not be confirmed
              </strong>

              <ul>
                {failures.map((failure) => (
                  <li key={failure.id}>
                    <span>{failure.label}</span>
                    {": "}
                    {failure.message}

                    {failure.uncertain && (
                      <small>
                        This write may have reached the
                        server. Verify the quotation
                        before retrying.
                      </small>
                    )}
                  </li>
                ))}
              </ul>

              <p>
                No automatic retry was performed.
                Close this dialog, review the refreshed
                records, and select eligible quotations
                again if appropriate.
              </p>
            </div>
          )}
        </div>
      </ConfirmModal>
    </div>
  );
}

export default SalesQuotationsList;