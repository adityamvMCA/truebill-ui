// import { Plus } from "lucide-react";
// import { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import toast from "react-hot-toast";

// import DataList from "../../components/common/DataList/DataList";
// import StatusField from "../../components/common/StatusField/StatusField";

// import api from "../../services/api";
// import routes from "../../config/routes";

// const PAYMENT_METHOD_LABELS = {
//   CASH: "Cash",
//   BANK_TRANSFER: "Bank Transfer",
//   UPI: "UPI",
//   CHEQUE: "Cheque",
//   CARD: "Card",
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
//   if (!value) return "N/A";

//   const date = new Date(value);

//   if (Number.isNaN(date.getTime())) return "N/A";

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
//     "Unable to load supplier payments."
//   );
// };

// const getPaymentList = (response) => {
//   const records = response?.data?.data;

//   if (!Array.isArray(records)) {
//     throw new Error(
//       "The supplier payment list response must contain a data array.",
//     );
//   }

//   return records;
// };

// const FILTERS = [
//   {
//     key: "paymentMethod",
//     label: "Payment Method",
//     type: "select",
//     options: ["CASH", "BANK_TRANSFER", "UPI", "CHEQUE", "CARD"],
//   },

//   {
//     key: "paymentLedgerType",
//     label: "Paid From",
//     type: "select",
//     options: ["CASH", "BANK"],
//   },

//   {
//     key: "status",
//     label: "Status",
//     type: "select",
//     options: ["POSTED"],
//   },
// ];

// const QUICK_FILTERS = [
//   {
//     key: "paymentMethod",
//     value: "",
//     label: "All",
//   },

//   {
//     key: "paymentMethod",
//     value: "CASH",
//     label: "Cash",
//   },

//   {
//     key: "paymentMethod",
//     value: "BANK_TRANSFER",
//     label: "Bank Transfer",
//   },

//   {
//     key: "paymentMethod",
//     value: "UPI",
//     label: "UPI",
//   },
// ];

// function SupplierPaymentsList() {
//   const navigate = useNavigate();

//   const [loading, setLoading] = useState(true);
//   const [payments, setPayments] = useState([]);

//   const requestVersion = useRef(0);

//   const loadPayments = useCallback(async () => {
//     const version = ++requestVersion.current;

//     const isCurrent = () => version === requestVersion.current;

//     setLoading(true);

//     try {
//       const firstResponse = await api.supplierPayments.getAll({
//         page: 1,
//         limit: 100,
//       });

//       if (!isCurrent()) return;

//       const records = [...getPaymentList(firstResponse)];

//       const totalPages = Math.max(
//         1,
//         Number(firstResponse?.data?.pagination?.totalPages) || 1,
//       );

//       // DataList receives a local array, so load every page.
//       for (let page = 2; page <= totalPages; page += 1) {
//         if (!isCurrent()) return;

//         const response = await api.supplierPayments.getAll({
//           page,
//           limit: 100,
//         });

//         if (!isCurrent()) return;

//         records.push(...getPaymentList(response));
//       }

//       const uniqueRecords = Array.from(
//         new Map(
//           records.map((payment) => [
//             payment._id || payment.paymentNumber,
//             payment,
//           ]),
//         ).values(),
//       );

//       if (isCurrent()) {
//         setPayments(uniqueRecords);
//       }
//     } catch (error) {
//       if (isCurrent()) {
//         console.error("Unable to load supplier payments:", error);

//         toast.error(getErrorMessage(error));
//       }
//     } finally {
//       if (isCurrent()) {
//         setLoading(false);
//       }
//     }
//   }, []);

//   useEffect(() => {
//     loadPayments();

//     return () => {
//       requestVersion.current += 1;
//     };
//   }, [loadPayments]);

//   const columns = useMemo(
//     () => [
//       {
//         key: "paymentNumber",
//         label: "Payment Number",
//         sortable: true,
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
//         key: "paymentDate",
//         label: "Payment Date",
//         sortable: true,
//         render: formatDate,
//       },

//       {
//         key: "paymentLedgerName",
//         label: "Paid From",
//         sortable: true,

//         render: (value, row) => (
//           <div className="dl-customer">
//             <strong>{value || "N/A"}</strong>
//             <span>{row.paymentLedgerCode || "N/A"}</span>
//           </div>
//         ),
//       },

//       {
//         key: "paymentMethod",
//         label: "Payment Method",
//         sortable: true,

//         render: (value) => PAYMENT_METHOD_LABELS[value] || value || "N/A",
//       },

//       {
//         key: "referenceNumber",
//         label: "Reference",
//         sortable: true,

//         render: (value) => value || <span className="dl-muted-value">N/A</span>,
//       },

//       {
//         key: "amountPaise",
//         label: "Amount Paid",
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
//         key: "paymentLedgerType",
//         label: "Account Type",
//         sortable: true,
//         visible: false,
//       },

//       {
//         key: "postedAt",
//         label: "Posted On",
//         sortable: true,
//         visible: false,
//         render: formatDate,
//       },

//       {
//         key: "createdAt",
//         label: "Created On",
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

//   const handleView = (row) => {
//     if (!row.paymentNumber) {
//       toast.error("This record has no payment number.");
//       return;
//     }

//     navigate(
//       routes.supplierPayments.view.replace(
//         ":paymentNumber",
//         encodeURIComponent(row.paymentNumber),
//       ),
//     );
//   };

//   return (
//     <DataList
//       title="Supplier Payments"
//       subtitle="Payments made to suppliers against purchase bills"
//       columns={columns}
//       data={payments}
//       loading={loading}
//       rowKey="_id"
//       showCase="list"
//       searchable
//       filterable
//       sortable
//       columnVisibility
//       pagination
//       filters={FILTERS}
//       quickFilters={QUICK_FILTERS}
//       storageKey="trustiq-supplier-payments"
//       searchPlaceholder="Search payment, supplier, supplier code, reference..."
//       actions={{
//         view: handleView,
//       }}
//       onRefresh={loadPayments}
//       addButton={
//         <button
//           type="button"
//           className="so-primary-button"
//           onClick={() => navigate(routes.supplierPayments.create)}
//         >
//           <Plus size={16} />
//           <span>New Supplier Payment</span>
//         </button>
//       }
//     />
//   );
// }

// export default SupplierPaymentsList;


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

import { saveCsvFile } from "../../components/common/DataList/fileDownload";

import api from "../../services/api";
import routes from "../../config/routes";

import "./SupplierPaymentsList.css";

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

/*
 * Enable these only after the backend validates AND applies
 * the corresponding parameters.
 */
const SERVER_SORTING_ENABLED = false;
const ACCOUNT_TYPE_FILTER_ENABLED = false;
const STATUS_FILTER_ENABLED = false;

const PAGE_SIZE_OPTIONS = [20, 50, 100];
const SEARCH_DEBOUNCE_MS = 400;
const EXPORT_BATCH_SIZE = 100;

const PAYMENT_METHOD_LABELS = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  UPI: "UPI",
  CHEQUE: "Cheque",
  CARD: "Card",
};

const PAYMENT_METHODS = Object.keys(
  PAYMENT_METHOD_LABELS,
);

const SORT_FIELDS = new Set([
  "paymentNumber",
  "paymentDate",
  "paymentMethod",
  "referenceNumber",
  "amountPaise",
  "status",
  "paymentLedgerType",
  "postedAt",
  "createdAt",
]);

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
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

const renderOptionalText = (value) =>
  value || (
    <span className="dl-muted-value">N/A</span>
  );

/* ------------------------------------------------------------------ */
/* Response helpers                                                    */
/* ------------------------------------------------------------------ */

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

  if (typeof body?.message === "string") {
    return body.message;
  }

  if (typeof body?.error === "string") {
    return body.error;
  }

  return (
    error?.message ||
    "Unable to complete the supplier payment request."
  );
};

const readPaymentPage = (response) => {
  const body = response?.data;

  const records = Array.isArray(body?.data)
    ? body.data
    : Array.isArray(body?.data?.payments)
      ? body.data.payments
      : Array.isArray(body?.payments)
        ? body.payments
        : null;

  if (!records) {
    throw new Error(
      "The supplier payment response must contain a data array.",
    );
  }

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
      "The supplier payment endpoint must return pagination.total.",
    );
  }

  return {
    data: records,
    total: Number(rawTotal),
    pagination,
  };
};

const uniquePayments = (records) =>
  Array.from(
    new Map(
      records.map((record) => [
        record._id || record.paymentNumber,
        record,
      ]),
    ).values(),
  );

/* ------------------------------------------------------------------ */
/* CSV fields                                                          */
/* ------------------------------------------------------------------ */

const EXPORT_FIELDS = [
  [
    "Payment Number",
    (row) => row.paymentNumber,
  ],
  [
    "Supplier",
    (row) => row.supplierName,
  ],
  [
    "Supplier Code",
    (row) => row.supplierCode,
  ],
  [
    "Payment Date",
    (row) => csvDate(row.paymentDate),
  ],
  [
    "Paid From",
    (row) => row.paymentLedgerName,
  ],
  [
    "Account Code",
    (row) => row.paymentLedgerCode,
  ],
  [
    "Account Type",
    (row) => row.paymentLedgerType,
  ],
  [
    "Payment Method",
    (row) =>
      PAYMENT_METHOD_LABELS[row.paymentMethod] ||
      row.paymentMethod,
  ],
  [
    "Reference",
    (row) => row.referenceNumber,
  ],
  [
    "Amount Paid (Paise)",
    (row) => row.amountPaise,
  ],
  [
    "Status",
    (row) => row.status,
  ],
  [
    "Posted On",
    (row) => csvDate(row.postedAt),
  ],
  [
    "Created On",
    (row) => csvDate(row.createdAt),
  ],
  [
    "Notes",
    (row) => row.notes,
  ],
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

function SupplierPaymentsList() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [searchInput, setSearchInput] =
    useState("");

  const [search, setSearch] = useState("");

  const [filterValues, setFilterValues] =
    useState({});

  const [sort, setSort] = useState({
    key: "paymentDate",
    direction: "desc",
  });

  const [stats, setStats] = useState(null);

  const [loadError, setLoadError] =
    useState("");

  const mountedRef = useRef(false);
  const requestVersion = useRef(0);
  const statsVersion = useRef(0);
  const exportLock = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      requestVersion.current += 1;
      statsVersion.current += 1;
    };
  }, []);

  /* ---------------------------------------------------------------- */
  /* Debounced search                                                  */
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

      if (filterValues.paymentMethod) {
        params.paymentMethod =
          filterValues.paymentMethod;
      }

      if (
        ACCOUNT_TYPE_FILTER_ENABLED &&
        filterValues.paymentLedgerType
      ) {
        params.paymentLedgerType =
          filterValues.paymentLedgerType;
      }

      if (
        STATUS_FILTER_ENABLED &&
        filterValues.status
      ) {
        params.status = filterValues.status;
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
  /* Load one payment page                                             */
  /* ---------------------------------------------------------------- */

  const loadPayments = useCallback(async () => {
    if (!mountedRef.current) return;

    const version = ++requestVersion.current;

    const isCurrent = () =>
      mountedRef.current &&
      version === requestVersion.current;

    setLoading(true);
    setLoadError("");

    try {
      const response =
        await api.supplierPayments.getAll(
          buildParams({
            page,
            limit: pageSize,
          }),
        );

      if (!isCurrent()) return;

      const result = readPaymentPage(response);

      const lastPage = Math.max(
        1,
        Math.ceil(result.total / pageSize),
      );

      if (page > lastPage) {
        setPage(lastPage);
        return;
      }

      setPayments(result.data);
      setTotal(result.total);
    } catch (error) {
      if (!isCurrent()) return;

      const message = getErrorMessage(error);

      setPayments([]);
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
    loadPayments();

    return () => {
      requestVersion.current += 1;
    };
  }, [loadPayments]);

  /* ---------------------------------------------------------------- */
  /* Global counts                                                     */
  /* No separate count-loading UI.                                     */
  /* ---------------------------------------------------------------- */

  const loadStats = useCallback(async () => {
    if (!mountedRef.current) return;

    const version = ++statsVersion.current;

    try {
      const countRequests = [
        ["all", {}],

        ...PAYMENT_METHODS.map((method) => [
          method,
          { paymentMethod: method },
        ]),

        ...(STATUS_FILTER_ENABLED
          ? [["POSTED", { status: "POSTED" }]]
          : []),
      ];

      const nextStats = {};

      // Bounded sequential requests; the visible list
      // does not wait for these counts.
      for (const [key, extra] of countRequests) {
        if (
          !mountedRef.current ||
          version !== statsVersion.current
        ) {
          return;
        }

        const response =
          await api.supplierPayments.getAll({
            page: 1,
            limit: 20,
            ...extra,
          });

        nextStats[key] =
          readPaymentPage(response).total;
      }

      if (
        mountedRef.current &&
        version === statsVersion.current
      ) {
        setStats(nextStats);
      }
    } catch (error) {
      if (
        mountedRef.current &&
        version === statsVersion.current
      ) {
        // Do not show misleading zero counts.
        setStats(null);

        console.warn(
          "Unable to load supplier payment counts:",
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
      loadPayments(),
      loadStats(),
    ]);
  }, [loadPayments, loadStats]);

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
            key: "paymentDate",
            direction: "desc",
          },
    );

    setPage(1);
  }, []);

  const handlePageChange = useCallback((next) => {
    setPage(
      Math.max(1, Number(next) || 1),
    );
  }, []);

  const handlePageSizeChange = useCallback((next) => {
    const size = Number(next);

    if (
      !PAGE_SIZE_OPTIONS.includes(size)
    ) {
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
      if (!row?.paymentNumber) {
        toast.error(
          "This record has no payment number.",
        );
        return;
      }

      navigate(
        routes.supplierPayments.view.replace(
          ":paymentNumber",
          encodeURIComponent(row.paymentNumber),
        ),
      );
    },
    [navigate],
  );

  /* ---------------------------------------------------------------- */
  /* Export selected records                                           */
  /* ---------------------------------------------------------------- */

  const handleExportSelected = useCallback(
    async (rows) => {
      if (exportLock.current) return;

      if (!Array.isArray(rows) || !rows.length) {
        toast.error(
          "Select at least one payment to export.",
        );
        return;
      }

      exportLock.current = true;

      const toastId = toast.loading(
        "Exporting selected payments...",
      );

      try {
        const records = uniquePayments(rows);

        await saveCsvFile(
          "supplier-payments-selected.csv",
          createCsv(records),
        );

        toast.success(
          `Exported ${records.length} selected payment${
            records.length === 1 ? "" : "s"
          }.`,
          { id: toastId },
        );
      } catch (error) {
        toast.error(
          getErrorMessage(error),
          { id: toastId },
        );
      } finally {
        exportLock.current = false;
      }
    },
    [],
  );

  /* ---------------------------------------------------------------- */
  /* Export all matching records                                       */
  /* ---------------------------------------------------------------- */

  const handleExport = useCallback(async () => {
    if (exportLock.current) return;

    exportLock.current = true;

    const toastId = toast.loading(
      "Preparing supplier payment export...",
    );

    try {
      const firstResponse =
        await api.supplierPayments.getAll(
          buildParams({
            page: 1,
            limit: EXPORT_BATCH_SIZE,
          }),
        );

      const first =
        readPaymentPage(firstResponse);

      const actualLimit = Math.max(
        1,
        Number(first.pagination?.limit) ||
          EXPORT_BATCH_SIZE,
      );

      const totalPages = Math.max(
        1,
        Math.ceil(
          first.total / actualLimit,
        ),
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
          await api.supplierPayments.getAll(
            buildParams({
              page: currentPage,
              limit: actualLimit,
            }),
          );

        records.push(
          ...readPaymentPage(response).data,
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
        uniquePayments(records);

      await saveCsvFile(
        "supplier-payments-export.csv",
        createCsv(uniqueRecords),
      );

      toast.success(
        `Exported ${uniqueRecords.length} supplier payments.`,
        { id: toastId },
      );
    } catch (error) {
      toast.error(
        getErrorMessage(error),
        { id: toastId },
      );
    } finally {
      exportLock.current = false;
    }
  }, [buildParams]);

  /* ---------------------------------------------------------------- */
  /* Table columns                                                     */
  /* ---------------------------------------------------------------- */

  const columns = useMemo(
    () => [
      {
        key: "paymentNumber",
        label: "Payment Number",
        sortable: SERVER_SORTING_ENABLED,

        render: (value, row) => (
          <button
            type="button"
            className="sp-list-document-link"
            aria-label={`View supplier payment ${
              value || ""
            }`}
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
        sortable: false,

        render: (value, row) => (
          <div className="dl-customer">
            <strong>
              {value || "N/A"}
            </strong>

            <span>
              {row.supplierCode || "N/A"}
            </span>
          </div>
        ),
      },

      {
        key: "paymentDate",
        label: "Payment Date",
        sortable: SERVER_SORTING_ENABLED,
        render: formatDate,
      },

      {
        key: "paymentLedgerName",
        label: "Paid From",
        sortable: false,

        render: (value, row) => (
          <div className="dl-customer">
            <strong>
              {value || "N/A"}
            </strong>

            <span>
              {row.paymentLedgerCode ||
                "N/A"}
            </span>
          </div>
        ),
      },

      {
        key: "paymentMethod",
        label: "Payment Method",
        sortable: SERVER_SORTING_ENABLED,

        render: (value) =>
          PAYMENT_METHOD_LABELS[value] ||
          value ||
          "N/A",
      },

      {
        key: "referenceNumber",
        label: "Reference",
        sortable: SERVER_SORTING_ENABLED,
        render: renderOptionalText,
      },

      {
        key: "amountPaise",
        label: "Amount Paid",
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
        key: "paymentLedgerType",
        label: "Account Type",
        sortable: SERVER_SORTING_ENABLED,
        visible: false,
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
        render: renderOptionalText,
      },
    ],
    [handleView],
  );

  /* ---------------------------------------------------------------- */
  /* Filters and global-count badges                                   */
  /* ---------------------------------------------------------------- */

  const filters = useMemo(
    () => [
      {
        key: "paymentMethod",
        label: "Payment Method",
        type: "select",
        options: PAYMENT_METHODS,
      },

      ...(ACCOUNT_TYPE_FILTER_ENABLED
        ? [
            {
              key: "paymentLedgerType",
              label: "Paid From",
              type: "select",
              options: ["CASH", "BANK"],
            },
          ]
        : []),

      ...(STATUS_FILTER_ENABLED
        ? [
            {
              key: "status",
              label: "Status",
              type: "select",
              options: ["POSTED"],
            },
          ]
        : []),
    ],
    [],
  );

  const quickFilters = useMemo(
    () => [
      {
        key: "paymentMethod",
        value: "",
        label: "All",

        ...(stats !== null
          ? { count: stats.all }
          : {}),
      },

      ...PAYMENT_METHODS.map(
        (method) => ({
          key: "paymentMethod",
          value: method,
          label:
            PAYMENT_METHOD_LABELS[method],

          ...(stats !== null
            ? { count: stats[method] }
            : {}),
        }),
      ),

      ...(STATUS_FILTER_ENABLED
        ? [
            {
              key: "status",
              value: "POSTED",
              label: "Posted",

              ...(stats !== null
                ? {
                    count: stats.POSTED,
                  }
                : {}),
            },
          ]
        : []),
    ],
    [stats],
  );

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <div className="sp-list-page">
      {loadError && (
        <div
          className="sp-list-alert"
          role="alert"
        >
          {loadError}
        </div>
      )}

      <DataList
        title="Supplier Payments"
        subtitle="Payments made to suppliers against purchase bills"
        columns={columns}
        data={payments}
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
        onPageSizeChange={
          handlePageSizeChange
        }
        onSearch={handleSearch}
        onSort={handleSort}
        onFilterChange={
          handleFilterChange
        }
        filters={filters}
        quickFilters={quickFilters}
        storageKey="trustiq-supplier-payments"
        searchPlaceholder="Search payment, supplier, supplier code, reference..."
        actions={{
          view: handleView,
        }}
        bulkActions={[
          {
            key: "export",
            label: "Export Selected",
            action:
              handleExportSelected,
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
                routes.supplierPayments.create,
              )
            }
          >
            <Plus size={16} />
            <span>
              New Supplier Payment
            </span>
          </button>
        }
      />
    </div>
  );
}

export default SupplierPaymentsList;