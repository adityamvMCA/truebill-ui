// import { Plus } from "lucide-react";

// import { useCallback, useEffect, useMemo, useState } from "react";

// import { useNavigate } from "react-router-dom";

// import toast from "react-hot-toast";

// import DataList from "../../components/common/DataList/DataList";
// import StatusField from "../../components/common/StatusField/StatusField";

// import api from "../../services/api";
// import routes, { buildRoute } from "../../config/routes";

// const CUSTOMER_RECEIPT_ROUTES = {
//   create: routes.customerReceipts.create,

//   view: (receiptNumber) =>
//     buildRoute(routes.customerReceipts.view, {
//       receiptNumber: encodeURIComponent(receiptNumber),
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

// const getReceiptList = (response) =>
//   Array.isArray(response?.data?.data) ? response.data.data : [];

// const RECEIPT_METHOD_LABELS = {
//   CASH: "Cash",
//   BANK_TRANSFER: "Bank Transfer",
//   UPI: "UPI",
//   CHEQUE: "Cheque",
//   CARD: "Card",
// };

// function CustomerReceiptsList() {
//   const navigate = useNavigate();

//   const [loading, setLoading] = useState(true);
//   const [receipts, setReceipts] = useState([]);

//   const loadReceipts = useCallback(async () => {
//     try {
//       setLoading(true);

//       const firstResponse = await api.customerReceipts.getAll({
//         page: 1,
//         limit: 100,
//       });

//       const records = [...getReceiptList(firstResponse)];

//       const totalPages = Math.max(
//         1,
//         Number(firstResponse?.data?.pagination?.totalPages) || 1,
//       );

//       for (let page = 2; page <= totalPages; page += 1) {
//         const response = await api.customerReceipts.getAll({
//           page,
//           limit: 100,
//         });

//         records.push(...getReceiptList(response));
//       }

//       const uniqueRecords = Array.from(
//         new Map(
//           records.map((receipt) => [
//             receipt._id || receipt.receiptNumber,
//             receipt,
//           ]),
//         ).values(),
//       );

//       setReceipts(uniqueRecords);
//     } catch (error) {
//       console.error("Unable to load customer receipts:", error);

//       toast.error(getErrorMessage(error));
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     loadReceipts();
//   }, [loadReceipts]);

//   const columns = useMemo(
//     () => [
//       {
//         key: "receiptNumber",
//         label: "Receipt Number",
//         sortable: true,
//       },

//       {
//         key: "customerName",
//         label: "Customer",
//         sortable: true,

//         render: (value, row) => (
//           <div className="dl-customer">
//             <strong>{value || "N/A"}</strong>

//             <span>{row.customerCode || "N/A"}</span>
//           </div>
//         ),
//       },

//       {
//         key: "receiptDate",
//         label: "Receipt Date",
//         sortable: true,
//         render: formatDate,
//       },

//       {
//         key: "receiptLedgerName",
//         label: "Received In",
//         sortable: true,

//         render: (value, row) => (
//           <div className="dl-customer">
//             <strong>{value || "N/A"}</strong>

//             <span>{row.receiptLedgerCode || "N/A"}</span>
//           </div>
//         ),
//       },

//       {
//         key: "receiptMethod",
//         label: "Payment Method",
//         sortable: true,

//         render: (value) => RECEIPT_METHOD_LABELS[value] || value || "N/A",
//       },

//       {
//         key: "referenceNumber",
//         label: "Reference",
//         sortable: true,

//         render: (value) => value || <span className="dl-muted-value">N/A</span>,
//       },

//       {
//         key: "amountPaise",
//         label: "Amount",
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
//       key: "receiptMethod",
//       label: "Payment Method",
//       type: "select",
//       options: ["CASH", "BANK_TRANSFER", "UPI", "CHEQUE", "CARD"],
//     },

//     {
//       key: "status",
//       label: "Status",
//       type: "select",
//       options: ["POSTED"],
//     },
//   ];

//   const quickFilters = [
//     {
//       key: "receiptMethod",
//       value: "",
//       label: "All",
//     },

//     {
//       key: "receiptMethod",
//       value: "CASH",
//       label: "Cash",
//     },

//     {
//       key: "receiptMethod",
//       value: "BANK_TRANSFER",
//       label: "Bank Transfer",
//     },

//     {
//       key: "receiptMethod",
//       value: "UPI",
//       label: "UPI",
//     },
//   ];

//   const handleView = (row) => {
//     navigate(CUSTOMER_RECEIPT_ROUTES.view(row.receiptNumber));
//   };

//   return (
//     <DataList
//       title="Customer Receipts"
//       subtitle="Money received from customers against sales invoices"
//       columns={columns}
//       data={receipts}
//       loading={loading}
//       rowKey="_id"
//       showCase="list"
//       searchable
//       filterable
//       sortable
//       columnVisibility
//       pagination
//       filters={filters}
//       quickFilters={quickFilters}
//       storageKey="trustiq-customer-receipts"
//       searchPlaceholder="Search receipt, customer, customer code, reference..."
//       actions={{
//         view: handleView,
//       }}
//       onRefresh={loadReceipts}
//       addButton={
//         <button
//           type="button"
//           className="so-primary-button"
//           onClick={() => navigate(CUSTOMER_RECEIPT_ROUTES.create)}
//         >
//           <Plus size={16} />
//           <span>New Customer Receipt</span>
//         </button>
//       }
//     />
//   );
// }

// export default CustomerReceiptsList;


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
import routes, {
  buildRoute,
} from "../../config/routes";

import "./CustomerReceiptsList.css";

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

/*
 * Enable these only after the backend validates AND applies
 * the corresponding parameters.
 */
const SERVER_SORTING_ENABLED = false;
const STATUS_FILTER_ENABLED = false;

const PAGE_SIZE_OPTIONS = [20, 50, 100];
const SEARCH_DEBOUNCE_MS = 400;
const EXPORT_BATCH_SIZE = 100;

const CUSTOMER_RECEIPT_ROUTES = {
  create: routes.customerReceipts.create,

  view: (receiptNumber) =>
    buildRoute(
      routes.customerReceipts.view,
      {
        receiptNumber:
          encodeURIComponent(
            receiptNumber,
          ),
      },
    ),
};

const RECEIPT_METHOD_LABELS = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  UPI: "UPI",
  CHEQUE: "Cheque",
  CARD: "Card",
};

const RECEIPT_METHODS = Object.keys(
  RECEIPT_METHOD_LABELS,
);

const SORT_FIELDS = new Set([
  "receiptNumber",
  "receiptDate",
  "receiptMethod",
  "referenceNumber",
  "amountPaise",
  "status",
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
    <span className="dl-muted-value">
      N/A
    </span>
  );

/* ------------------------------------------------------------------ */
/* Error and response helpers                                          */
/* ------------------------------------------------------------------ */

const getErrorMessage = (error) => {
  const responseData =
    error?.response?.data;

  if (
    Array.isArray(
      responseData?.errors,
    ) &&
    responseData.errors.length
  ) {
    return responseData.errors
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.message ||
            item?.msg ||
            String(item),
      )
      .join(", ");
  }

  if (
    typeof responseData?.message ===
    "string"
  ) {
    return responseData.message;
  }

  if (
    typeof responseData?.error ===
    "string"
  ) {
    return responseData.error;
  }

  return (
    error?.message ||
    "Something went wrong. Please try again."
  );
};

const readReceiptPage = (response) => {
  const body = response?.data;

  if (body?.success === false) {
    throw new Error(
      body.message ||
        "Unable to load customer receipts.",
    );
  }

  const data = Array.isArray(body?.data)
    ? body.data
    : Array.isArray(body?.data?.receipts)
      ? body.data.receipts
      : Array.isArray(body?.receipts)
        ? body.receipts
        : null;

  if (!data) {
    throw new Error(
      "The customer receipt response must contain a data array.",
    );
  }

  const pagination =
    body?.pagination ||
    body?.data?.pagination;

  const rawTotal =
    pagination?.total;

  if (
    rawTotal === undefined ||
    rawTotal === null ||
    !Number.isFinite(Number(rawTotal)) ||
    Number(rawTotal) < 0
  ) {
    throw new Error(
      "The customer receipt endpoint must return pagination.total.",
    );
  }

  return {
    data,
    total: Number(rawTotal),
    pagination,
  };
};

const uniqueReceipts = (records) =>
  Array.from(
    new Map(
      records.map((receipt) => [
        receipt._id ||
          receipt.receiptNumber,
        receipt,
      ]),
    ).values(),
  );

/* ------------------------------------------------------------------ */
/* CSV configuration                                                   */
/* ------------------------------------------------------------------ */

const EXPORT_FIELDS = [
  [
    "Receipt Number",
    (row) => row.receiptNumber,
  ],
  [
    "Customer",
    (row) => row.customerName,
  ],
  [
    "Customer Code",
    (row) => row.customerCode,
  ],
  [
    "Receipt Date",
    (row) => csvDate(row.receiptDate),
  ],
  [
    "Received In",
    (row) => row.receiptLedgerName,
  ],
  [
    "Account Code",
    (row) => row.receiptLedgerCode,
  ],
  [
    "Payment Method",
    (row) =>
      RECEIPT_METHOD_LABELS[
        row.receiptMethod
      ] ||
      row.receiptMethod,
  ],
  [
    "Reference",
    (row) => row.referenceNumber,
  ],
  [
    "Amount (Paise)",
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
      .map(([label]) =>
        csvCell(label),
      )
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

function CustomerReceiptsList() {
  const navigate = useNavigate();

  const [loading, setLoading] =
    useState(true);

  const [receipts, setReceipts] =
    useState([]);

  const [total, setTotal] =
    useState(0);

  const [loadError, setLoadError] =
    useState("");

  const [page, setPage] =
    useState(1);

  const [pageSize, setPageSize] =
    useState(20);

  const [
    searchInput,
    setSearchInput,
  ] = useState("");

  const [search, setSearch] =
    useState("");

  const [
    filterValues,
    setFilterValues,
  ] = useState({});

  const [sort, setSort] = useState({
    key: "receiptDate",
    direction: "desc",
  });

  const [stats, setStats] =
    useState(null);

  const mountedRef = useRef(false);
  const requestRef = useRef(0);
  const statsRequestRef = useRef(0);
  const exportLockRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      requestRef.current += 1;
      statsRequestRef.current += 1;
    };
  }, []);

  /* ---------------------------------------------------------------- */
  /* Debounced search                                                  */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    const nextSearch =
      searchInput.trim();

    if (nextSearch === search) {
      return undefined;
    }

    const timer =
      window.setTimeout(() => {
        setSearch(nextSearch);
        setPage(1);
      }, SEARCH_DEBOUNCE_MS);

    return () =>
      window.clearTimeout(timer);
  }, [searchInput, search]);

  const buildParams = useCallback(
    (extra = {}) => {
      const params = { ...extra };

      if (search) {
        params.search = search;
      }

      if (
        filterValues.receiptMethod
      ) {
        params.receiptMethod =
          filterValues.receiptMethod;
      }

      if (
        STATUS_FILTER_ENABLED &&
        filterValues.status
      ) {
        params.status =
          filterValues.status;
      }

      if (
        SERVER_SORTING_ENABLED
      ) {
        params.sortBy = sort.key;
        params.sortOrder =
          sort.direction;
      }

      return params;
    },
    [
      search,
      filterValues,
      sort,
    ],
  );

  /* ---------------------------------------------------------------- */
  /* Load one page only                                                */
  /* ---------------------------------------------------------------- */

  const loadReceipts =
    useCallback(async () => {
      if (!mountedRef.current) {
        return;
      }

      const request =
        ++requestRef.current;

      const isCurrent = () =>
        mountedRef.current &&
        request ===
          requestRef.current;

      setLoading(true);
      setLoadError("");

      try {
        const response =
          await api.customerReceipts.getAll(
            buildParams({
              page,
              limit: pageSize,
            }),
          );

        if (!isCurrent()) return;

        const result =
          readReceiptPage(response);

        const lastPage =
          Math.max(
            1,
            Math.ceil(
              result.total /
                pageSize,
            ),
          );

        if (page > lastPage) {
          setPage(lastPage);
          return;
        }

        setReceipts(result.data);
        setTotal(result.total);
      } catch (error) {
        if (!isCurrent()) return;

        const message =
          getErrorMessage(error);

        setReceipts([]);
        setTotal(0);
        setLoadError(message);

        toast.error(message);
      } finally {
        if (isCurrent()) {
          setLoading(false);
        }
      }
    }, [
      buildParams,
      page,
      pageSize,
    ]);

  useEffect(() => {
    loadReceipts();

    return () => {
      requestRef.current += 1;
    };
  }, [loadReceipts]);

  /* ---------------------------------------------------------------- */
  /* Global counts — no count-loading message                           */
  /* ---------------------------------------------------------------- */

  const loadStats =
    useCallback(async () => {
      if (!mountedRef.current) {
        return;
      }

      const request =
        ++statsRequestRef.current;

      try {
        const countRequests = [
          ["all", {}],

          ...RECEIPT_METHODS.map(
            (method) => [
              method,
              {
                receiptMethod:
                  method,
              },
            ],
          ),

          ...(STATUS_FILTER_ENABLED
            ? [
                [
                  "POSTED",
                  {
                    status:
                      "POSTED",
                  },
                ],
              ]
            : []),
        ];

        const nextStats = {};

        for (
          const [key, extra]
          of countRequests
        ) {
          if (
            !mountedRef.current ||
            request !==
              statsRequestRef.current
          ) {
            return;
          }

          const response =
            await api.customerReceipts.getAll({
              page: 1,
              limit: 20,
              ...extra,
            });

          nextStats[key] =
            readReceiptPage(
              response,
            ).total;
        }

        if (
          mountedRef.current &&
          request ===
            statsRequestRef.current
        ) {
          setStats(nextStats);
        }
      } catch (error) {
        if (
          mountedRef.current &&
          request ===
            statsRequestRef.current
        ) {
          // Do not display misleading zero counts.
          setStats(null);

          console.warn(
            "Unable to load receipt counts:",
            error,
          );
        }
      }
    }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const refreshAll =
    useCallback(() => {
      return Promise.all([
        loadReceipts(),
        loadStats(),
      ]);
    }, [
      loadReceipts,
      loadStats,
    ]);

  /* ---------------------------------------------------------------- */
  /* Table callbacks                                                   */
  /* ---------------------------------------------------------------- */

  const handleSearch =
    useCallback((value) => {
      setSearchInput(
        String(value ?? ""),
      );
    }, []);

  const handleFilterChange =
    useCallback((next) => {
      setFilterValues(
        next || {},
      );

      setPage(1);
    }, []);

  const handleSort =
    useCallback((next) => {
      if (
        !SERVER_SORTING_ENABLED
      ) {
        return;
      }

      const valid =
        SORT_FIELDS.has(
          next?.key,
        ) &&
        ["asc", "desc"].includes(
          next?.direction,
        );

      setSort(
        valid
          ? {
              key:
                next.key,
              direction:
                next.direction,
            }
          : {
              key:
                "receiptDate",
              direction:
                "desc",
            },
      );

      setPage(1);
    }, []);

  const handlePageChange =
    useCallback((next) => {
      setPage(
        Math.max(
          1,
          Number(next) || 1,
        ),
      );
    }, []);

  const handlePageSizeChange =
    useCallback((next) => {
      const size = Number(next);

      if (
        !PAGE_SIZE_OPTIONS.includes(
          size,
        )
      ) {
        return;
      }

      setPageSize(size);
      setPage(1);
    }, []);

  /* ---------------------------------------------------------------- */
  /* View                                                              */
  /* ---------------------------------------------------------------- */

  const handleView =
    useCallback(
      (row) => {
        if (
          !row?.receiptNumber
        ) {
          toast.error(
            "Receipt number is missing.",
          );
          return;
        }

        navigate(
          CUSTOMER_RECEIPT_ROUTES.view(
            row.receiptNumber,
          ),
        );
      },
      [navigate],
    );

  /* ---------------------------------------------------------------- */
  /* Export selected                                                   */
  /* ---------------------------------------------------------------- */

  const handleExportSelected =
    useCallback(
      async (rows) => {
        if (
          exportLockRef.current
        ) {
          return;
        }

        if (
          !Array.isArray(rows) ||
          !rows.length
        ) {
          toast.error(
            "Select at least one receipt.",
          );
          return;
        }

        exportLockRef.current =
          true;

        const toastId =
          toast.loading(
            "Exporting selected receipts...",
          );

        try {
          const records =
            uniqueReceipts(
              rows,
            );

          await saveCsvFile(
            "customer-receipts-selected.csv",
            createCsv(
              records,
            ),
          );

          toast.success(
            `Exported ${records.length} receipt${
              records.length === 1
                ? ""
                : "s"
            }.`,
            {
              id:
                toastId,
            },
          );
        } catch (error) {
          toast.error(
            getErrorMessage(
              error,
            ),
            {
              id:
                toastId,
            },
          );
        } finally {
          exportLockRef.current =
            false;
        }
      },
      [],
    );

  /* ---------------------------------------------------------------- */
  /* Export all matching records                                       */
  /* ---------------------------------------------------------------- */

  const handleExport =
    useCallback(async () => {
      if (
        exportLockRef.current
      ) {
        return;
      }

      exportLockRef.current =
        true;

      const toastId =
        toast.loading(
          "Preparing customer receipt export...",
        );

      try {
        const firstResponse =
          await api.customerReceipts.getAll(
            buildParams({
              page: 1,
              limit:
                EXPORT_BATCH_SIZE,
            }),
          );

        const first =
          readReceiptPage(
            firstResponse,
          );

        const actualLimit =
          Math.max(
            1,
            Number(
              first.pagination?.limit,
            ) ||
              EXPORT_BATCH_SIZE,
          );

        const totalPages =
          Math.max(
            1,
            Math.ceil(
              first.total /
                actualLimit,
            ),
          );

        const records = [
          ...first.data,
        ];

        for (
          let currentPage = 2;
          currentPage <=
          totalPages;
          currentPage++
        ) {
          if (
            !mountedRef.current
          ) {
            toast.dismiss(
              toastId,
            );
            return;
          }

          const response =
            await api.customerReceipts.getAll(
              buildParams({
                page:
                  currentPage,
                limit:
                  actualLimit,
              }),
            );

          records.push(
            ...readReceiptPage(
              response,
            ).data,
          );

          toast.loading(
            `Exporting page ${currentPage} of ${totalPages}...`,
            {
              id:
                toastId,
            },
          );
        }

        if (
          !mountedRef.current
        ) {
          toast.dismiss(
            toastId,
          );
          return;
        }

        const unique =
          uniqueReceipts(
            records,
          );

        await saveCsvFile(
          "customer-receipts-export.csv",
          createCsv(unique),
        );

        toast.success(
          `Exported ${unique.length} customer receipts.`,
          {
            id:
              toastId,
          },
        );
      } catch (error) {
        toast.error(
          getErrorMessage(
            error,
          ),
          {
            id:
              toastId,
          },
        );
      } finally {
        exportLockRef.current =
          false;
      }
    }, [buildParams]);

  /* ---------------------------------------------------------------- */
  /* Columns                                                           */
  /* ---------------------------------------------------------------- */

  const columns = useMemo(
    () => [
      {
        key: "receiptNumber",
        label: "Receipt Number",
        sortable:
          SERVER_SORTING_ENABLED,

        render: (value, row) => (
          <button
            type="button"
            className="cr-list-document-link"
            aria-label={`View receipt ${
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
        key: "customerName",
        label: "Customer",
        sortable: false,

        render: (value, row) => (
          <div className="dl-customer">
            <strong>
              {value || "N/A"}
            </strong>

            <span>
              {row.customerCode ||
                "N/A"}
            </span>
          </div>
        ),
      },

      {
        key: "receiptDate",
        label: "Receipt Date",
        sortable:
          SERVER_SORTING_ENABLED,
        render: formatDate,
      },

      {
        key: "receiptLedgerName",
        label: "Received In",
        sortable: false,

        render: (value, row) => (
          <div className="dl-customer">
            <strong>
              {value || "N/A"}
            </strong>

            <span>
              {row.receiptLedgerCode ||
                "N/A"}
            </span>
          </div>
        ),
      },

      {
        key: "receiptMethod",
        label: "Payment Method",
        sortable:
          SERVER_SORTING_ENABLED,

        render: (value) =>
          RECEIPT_METHOD_LABELS[
            value
          ] ||
          value ||
          "N/A",
      },

      {
        key: "referenceNumber",
        label: "Reference",
        sortable:
          SERVER_SORTING_ENABLED,
        render:
          renderOptionalText,
      },

      {
        key: "amountPaise",
        label: "Amount",
        type: "number",
        sortable:
          SERVER_SORTING_ENABLED,
        render: formatPaise,
      },

      {
        key: "status",
        label: "Status",
        sortable:
          SERVER_SORTING_ENABLED,

        render: (value) => (
          <StatusField
            value={value}
          />
        ),
      },

      {
        key: "postedAt",
        label: "Posted On",
        sortable:
          SERVER_SORTING_ENABLED,
        visible: false,
        render: formatDate,
      },

      {
        key: "createdAt",
        label: "Created On",
        sortable:
          SERVER_SORTING_ENABLED,
        visible: false,
        render: formatDate,
      },

      {
        key: "notes",
        label: "Notes",
        visible: false,
        render:
          renderOptionalText,
      },
    ],
    [handleView],
  );

  /* ---------------------------------------------------------------- */
  /* Filters/counts                                                    */
  /* ---------------------------------------------------------------- */

  const filters = useMemo(
    () => [
      {
        key: "receiptMethod",
        label: "Payment Method",
        type: "select",
        options:
          RECEIPT_METHODS,
      },

      ...(STATUS_FILTER_ENABLED
        ? [
            {
              key: "status",
              label: "Status",
              type: "select",
              options: [
                "POSTED",
              ],
            },
          ]
        : []),
    ],
    [],
  );

  const quickFilters =
    useMemo(
      () => [
        {
          key:
            "receiptMethod",
          value: "",
          label: "All",

          ...(stats !== null
            ? {
                count:
                  stats.all,
              }
            : {}),
        },

        ...RECEIPT_METHODS.map(
          (method) => ({
            key:
              "receiptMethod",
            value: method,
            label:
              RECEIPT_METHOD_LABELS[
                method
              ],

            ...(stats !== null
              ? {
                  count:
                    stats[
                      method
                    ],
                }
              : {}),
          }),
        ),

        ...(STATUS_FILTER_ENABLED
          ? [
              {
                key:
                  "status",
                value:
                  "POSTED",
                label:
                  "Posted",

                ...(stats !== null
                  ? {
                      count:
                        stats.POSTED,
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
    <div className="cr-list-page">
      {loadError && (
        <div
          className="cr-list-alert"
          role="alert"
        >
          {loadError}
        </div>
      )}

      <DataList
        title="Customer Receipts"
        subtitle="Money received from customers against sales invoices"
        columns={columns}
        data={receipts}
        loading={loading}
        rowKey="_id"
        showCase="list"
        searchable
        filterable
        sortable={
          SERVER_SORTING_ENABLED
        }
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
        filters={filters}
        quickFilters={
          quickFilters
        }
        storageKey="trustiq-customer-receipts"
        searchPlaceholder="Search receipt, customer, customer code, reference..."
        actions={{
          view:
            handleView,
        }}
        bulkActions={[
          {
            key: "export",
            label:
              "Export Selected",
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
                CUSTOMER_RECEIPT_ROUTES.create,
              )
            }
          >
            <Plus size={16} />

            <span>
              New Customer Receipt
            </span>
          </button>
        }
      />
    </div>
  );
}

export default CustomerReceiptsList;