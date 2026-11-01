// import { Plus } from "lucide-react";

// import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// import { useNavigate } from "react-router-dom";
// import toast from "react-hot-toast";

// import DataList from "../../components/common/DataList/DataList";
// import StatusField from "../../components/common/StatusField/StatusField";
// import BoxModal from "../../components/common/Modal/BoxModal";
// import Textarea from "../../components/common/Form/Textarea";
// import Button from "../../components/common/Form/Button";

// import api from "../../services/api";

// import {
//   PURCHASE_ORDER_BASE,
//   fetchAllPages,
//   formatDate,
//   formatPaise,
//   getDocument,
//   getErrorMessage,
//   getId,
//   orderPath,
// } from "./purchaseOrder.utils";

// import "./PurchaseOrders.css";

// function PurchaseOrdersList() {
//   const navigate = useNavigate();

//   const [loading, setLoading] = useState(true);
//   const [orders, setOrders] = useState([]);
//   const [suppliers, setSuppliers] = useState([]);

//   const [cancelOrder, setCancelOrder] = useState(null);
//   const [cancelReason, setCancelReason] = useState("");
//   const [cancelling, setCancelling] = useState(false);

//   const loadSequence = useRef(0);
//   const cancelLock = useRef(false);

//   const loadOrders = useCallback(async () => {
//     const sequence = ++loadSequence.current;

//     try {
//       setLoading(true);

//       const [orderRecords, supplierRecords] = await Promise.all([
//         fetchAllPages(api.purchaseOrder.getAll, "orders"),
//         fetchAllPages(api.purchaseOrder.getSuppliers, "suppliers"),
//       ]);

//       if (sequence !== loadSequence.current) return;

//       setOrders(orderRecords);
//       setSuppliers(supplierRecords);
//     } catch (error) {
//       if (sequence !== loadSequence.current) return;

//       toast.error(getErrorMessage(error));
//     } finally {
//       if (sequence === loadSequence.current) {
//         setLoading(false);
//       }
//     }
//   }, []);

//   useEffect(() => {
//     loadOrders();

//     return () => {
//       loadSequence.current += 1;
//     };
//   }, [loadOrders]);

//   const supplierMap = useMemo(
//     () => new Map(suppliers.map((supplier) => [getId(supplier), supplier])),
//     [suppliers],
//   );

//   const openCancel = useCallback(async (row) => {
//     if (row.status !== "CREATED") {
//       toast.error("Only unreceived CREATED orders can be cancelled");
//       return;
//     }

//     try {
//       const response = await api.purchaseOrder.getByNumber(row.orderNumber);
//       const latest = getDocument(response);

//       if (!latest || latest.status !== "CREATED") {
//         throw new Error("This order changed. Refresh the list.");
//       }

//       setCancelOrder(latest);
//       setCancelReason("");
//     } catch (error) {
//       toast.error(getErrorMessage(error));
//     }
//   }, []);

//   const columns = useMemo(
//     () => [
//       {
//         key: "orderNumber",
//         label: "Order Number",
//         sortable: true,

//         render: (value, row) => (
//           <div className="po-document-cell">
//             <button
//               type="button"
//               className="po-document-link"
//               onClick={(event) => {
//                 event.stopPropagation();
//                 navigate(orderPath(row.orderNumber));
//               }}
//             >
//               {value || "—"}
//             </button>

//             <span>{row.sourceQuotationNumber || "Direct purchase order"}</span>
//           </div>
//         ),
//       },

//       {
//         key: "orderDate",
//         label: "Order Date",
//         sortable: true,
//         render: formatDate,
//       },

//       {
//         key: "supplierName",
//         label: "Supplier",
//         sortable: true,

//         render: (value, row) => {
//           // Keep the existing master lookup as a fallback.
//           const supplier = supplierMap.get(getId(row.supplierId));

//           return (
//             <div className="po-document-cell">
//               <strong>
//                 {value || supplier?.supplierName || "Supplier unavailable"}
//               </strong>

//               <span>{row.supplierCode || supplier?.supplierCode || "—"}</span>
//             </div>
//           );
//         },
//       },

//       {
//         key: "expectedDeliveryDate",
//         label: "Expected Delivery",
//         sortable: true,
//         render: formatDate,
//       },

//       {
//         key: "creationMode",
//         label: "Source",
//         sortable: true,

//         render: (value) => (
//           <span className="po-source-badge">
//             {value === "QUOTATION" ? "Supplier Quotation" : "Direct"}
//           </span>
//         ),
//       },

//       {
//         key: "totalAmountPaise",
//         label: "Order Amount",
//         sortable: true,

//         render: (value) => (
//           <strong className="po-money">{formatPaise(value)}</strong>
//         ),
//       },

//       {
//         key: "status",
//         label: "Status",
//         sortable: true,

//         render: (value) => <StatusField value={value || "CREATED"} />,
//       },
//     ],
//     [navigate, supplierMap],
//   );

//   const handleCancel = async () => {
//     if (cancelLock.current || !cancelOrder) return;

//     if (!cancelReason.trim()) {
//       toast.error("Cancellation reason is required");
//       return;
//     }

//     try {
//       cancelLock.current = true;
//       setCancelling(true);

//       await api.purchaseOrder.cancel(cancelOrder.orderNumber, {
//         version: cancelOrder.__v,
//         cancellationReason: cancelReason.trim(),
//       });

//       toast.success("Purchase Order cancelled successfully");

//       setCancelOrder(null);
//       setCancelReason("");

//       await loadOrders();
//     } catch (error) {
//       toast.error(getErrorMessage(error));
//     } finally {
//       cancelLock.current = false;
//       setCancelling(false);
//     }
//   };

//   return (
//     <div className="po-list-page">
//       <DataList
//         title="Purchase Orders"
//         subtitle="Manage direct orders and orders created from supplier quotations"
//         columns={columns}
//         data={orders}
//         loading={loading}
//         rowKey="_id"
//         showCase="list"
//         searchable
//         sortable
//         filterable
//         selectable
//         columnVisibility
//         pagination
//         storageKey="trustiq-purchase-orders"
//         searchPlaceholder="Search order number, quotation, status..."
//         filters={[
//           {
//             key: "status",
//             label: "Status",
//             type: "select",

//             options: ["CREATED", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"],
//           },
//         ]}
//         quickFilters={[
//           { key: "status", value: "", label: "All Orders" },
//           { key: "status", value: "CREATED", label: "Created" },
//           {
//             key: "status",
//             value: "PARTIALLY_RECEIVED",
//             label: "Partially Received",
//           },
//           { key: "status", value: "RECEIVED", label: "Received" },
//         ]}
//         actions={{
//           view: (row) => navigate(orderPath(row.orderNumber)),

//           edit: (row) => {
//             if (row.status !== "CREATED") {
//               toast.error("Only CREATED orders can be edited");
//               return;
//             }

//             navigate(orderPath(row.orderNumber, "edit"));
//           },
//         }}
//         onRefresh={loadOrders}
//         addButton={
//           <button
//             type="button"
//             className="po-primary-button"
//             onClick={() => navigate(`${PURCHASE_ORDER_BASE}/create`)}
//           >
//             <Plus size={16} />
//             New Purchase Order
//           </button>
//         }
//       />

//       {/* Separate cancellation picker avoids assuming
//           custom-action support in your DataList component. */}
//       <div className="po-list-cancel">
//         <label htmlFor="po-cancel-picker">Cancel an unreceived order</label>

//         <select
//           id="po-cancel-picker"
//           value=""
//           onChange={(event) => {
//             const row = orders.find(
//               (order) => order.orderNumber === event.target.value,
//             );

//             if (row) openCancel(row);
//           }}
//           disabled={loading || cancelling}
//         >
//           <option value="">Select a CREATED order...</option>

//           {orders
//             .filter((order) => order.status === "CREATED")
//             .map((order) => (
//               <option key={order._id} value={order.orderNumber}>
//                 {order.orderNumber} — {formatPaise(order.totalAmountPaise)}
//               </option>
//             ))}
//         </select>
//       </div>

//       <BoxModal
//         show={Boolean(cancelOrder)}
//         onClose={() => {
//           if (!cancelLock.current) setCancelOrder(null);
//         }}
//         title="Cancel Purchase Order"
//         subtitle={cancelOrder?.orderNumber || ""}
//         width="min(520px, calc(100vw - 24px))"
//         footer={
//           <div className="po-cancel-actions">
//             <Button
//               type="button"
//               variant="secondary"
//               onClick={() => setCancelOrder(null)}
//               disabled={cancelling}
//             >
//               Keep Order
//             </Button>

//             <Button
//               type="button"
//               onClick={handleCancel}
//               loading={cancelling}
//               disabled={cancelling || !cancelReason.trim()}
//             >
//               Confirm Cancellation
//             </Button>
//           </div>
//         }
//       >
//         <Textarea
//           label="Cancellation Reason"
//           value={cancelReason}
//           onChange={(event) => setCancelReason(event.target.value)}
//           maxLength={1000}
//           rows={4}
//           disabled={cancelling}
//           required
//         />
//       </BoxModal>
//     </div>
//   );
// }

// export default PurchaseOrdersList;


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
import BoxModal from "../../components/common/Modal/BoxModal";
import Textarea from "../../components/common/Form/Textarea";
import Button from "../../components/common/Form/Button";

import { saveCsvFile } from "../../components/common/DataList/fileDownload";

import api from "../../services/api";

import {
  PURCHASE_ORDER_BASE,
  formatDate,
  formatPaise,
  getDocument,
  getErrorMessage,
  getId,
  orderPath,
} from "./purchaseOrder.utils";

import "./PurchaseOrders.css";

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

const SERVER_SORTING_ENABLED = false;

const PAGE_SIZE_OPTIONS = [20, 50, 100];
const SEARCH_DEBOUNCE_MS = 400;
const EXPORT_BATCH_SIZE = 100;
const CANCEL_CONCURRENCY = 3;

const STATUS_OPTIONS = [
  "CREATED",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CANCELLED",
];

const SORT_FIELDS = new Set([
  "orderNumber",
  "orderDate",
  "expectedDeliveryDate",
  "creationMode",
  "totalAmountPaise",
  "status",
  "createdAt",
]);

const EMPTY_CANCEL = {
  open: false,
  targets: [],
  skipped: 0,
};

/* ------------------------------------------------------------------ */
/* Response helpers                                                    */
/* ------------------------------------------------------------------ */

const normalizeId = (value) => {
  if (!value) return "";

  const id = getId(value);

  return id ? String(id) : "";
};

const parseList = (response, key) => {
  const body = response?.data;

  const data = Array.isArray(body?.data)
    ? body.data
    : Array.isArray(body?.data?.[key])
      ? body.data[key]
      : Array.isArray(body?.[key])
        ? body[key]
        : [];

  return {
    data,
    pagination:
      body?.pagination || body?.data?.pagination,
  };
};

const parseOrderPage = (response) => {
  const result = parseList(response, "orders");
  const rawTotal = result.pagination?.total;

  if (
    rawTotal === undefined ||
    rawTotal === null ||
    !Number.isFinite(Number(rawTotal)) ||
    Number(rawTotal) < 0
  ) {
    throw new Error(
      "The Purchase Order endpoint must return pagination.total.",
    );
  }

  return {
    ...result,
    total: Number(rawTotal),
  };
};

const enrichOrders = (records, suppliers = {}) =>
  records.map((record) => {
    const populatedSupplier =
      record.supplierId &&
      typeof record.supplierId === "object"
        ? record.supplierId
        : null;

    const supplier =
      suppliers[normalizeId(record.supplierId)] ||
      populatedSupplier;

    return {
      ...record,
      supplierName:
        record.supplierName ||
        supplier?.supplierName ||
        "Supplier unavailable",
      supplierCode:
        record.supplierCode ||
        supplier?.supplierCode ||
        "—",
    };
  });

async function loadSuppliersForOrders(
  records,
  supplierCache = {},
) {
  const missingIds = [
    ...new Set(
      records
        .filter(
          (record) =>
            !record.supplierName &&
            !(
              record.supplierId &&
              typeof record.supplierId === "object" &&
              record.supplierId.supplierName
            ),
        )
        .map((record) =>
          normalizeId(record.supplierId),
        )
        .filter(
          (id) => id && !supplierCache[id],
        ),
    ),
  ];

  for (
    let start = 0;
    start < missingIds.length;
    start += 100
  ) {
    const ids = missingIds.slice(start, start + 100);
    const requested = new Set(ids);

    const response =
      await api.purchaseOrder.getSuppliers({
        ids: ids.join(","),
        page: 1,
        limit: 100,
      });

    const { data } = parseList(response, "suppliers");

    for (const supplier of data) {
      const id = normalizeId(supplier);

      // Ignore unrelated records if the endpoint ignores ids.
      if (requested.has(id)) {
        supplierCache[id] = supplier;
      }
    }
  }

  return enrichOrders(records, supplierCache);
}

/* ------------------------------------------------------------------ */
/* Concurrency and CSV helpers                                         */
/* ------------------------------------------------------------------ */

async function runLimited(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  await Promise.all(
    Array.from(
      {
        length: Math.min(concurrency, items.length),
      },
      async () => {
        while (cursor < items.length) {
          const index = cursor++;

          try {
            results[index] = {
              status: "fulfilled",
              value: await worker(items[index]),
            };
          } catch (reason) {
            results[index] = {
              status: "rejected",
              reason,
            };
          }
        }
      },
    ),
  );

  return results;
}

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

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

function PurchaseOrdersList() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState("");

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
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");

  const [cancelState, setCancelState] =
    useState(EMPTY_CANCEL);

  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelFailures, setCancelFailures] = useState([]);

  const [progress, setProgress] = useState({
    done: 0,
    total: 0,
  });

  const [exporting, setExporting] = useState(false);

  const mountedRef = useRef(false);
  const loadSequence = useRef(0);
  const statsSequence = useRef(0);

  const cancelLock = useRef(false);
  const exportLock = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      loadSequence.current += 1;
      statsSequence.current += 1;
    };
  }, []);

  /* ---------------------------------------------------------------- */
  /* Debounced search                                                  */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    const nextSearch = searchInput.trim();

    if (nextSearch === search) return undefined;

    const timer = window.setTimeout(() => {
      setSearch(nextSearch);
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

      ...(filters.creationMode
        ? { creationMode: filters.creationMode }
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
  /* Paginated list loading                                            */
  /* ---------------------------------------------------------------- */

  const loadOrders = useCallback(async () => {
    if (!mountedRef.current) return;

    const sequence = ++loadSequence.current;

    const isCurrent = () =>
      mountedRef.current &&
      sequence === loadSequence.current;

    setLoading(true);
    setLoadError("");

    try {
      const response =
        await api.purchaseOrder.getAll(
          buildParams({
            page,
            limit: pageSize,
          }),
        );

      if (!isCurrent()) return;

      const result = parseOrderPage(response);

      const lastPage = Math.max(
        1,
        Math.ceil(result.total / pageSize),
      );

      if (page > lastPage) {
        setPage(lastPage);
        return;
      }

      // Display orders before optional supplier hydration finishes.
      setOrders(enrichOrders(result.data));
      setTotal(result.total);
      setLoading(false);

      try {
        const hydrated =
          await loadSuppliersForOrders(result.data);

        if (isCurrent()) {
          setOrders(hydrated);
        }
      } catch (supplierError) {
        console.warn(
          "Unable to load Purchase Order supplier names:",
          supplierError,
        );
      }
    } catch (error) {
      if (!isCurrent()) return;

      const message = getErrorMessage(error);

      setOrders([]);
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
    loadOrders();

    return () => {
      loadSequence.current += 1;
    };
  }, [loadOrders]);

  /* ---------------------------------------------------------------- */
  /* Global quick-filter counts                                        */
  /* ---------------------------------------------------------------- */

  const loadStats = useCallback(async () => {
    if (!mountedRef.current) return;

    const sequence = ++statsSequence.current;

    setStatsLoading(true);
    setStatsError("");

    try {
      const requests = [
        ["all", ""],
        ["CREATED", "CREATED"],
        ["PARTIALLY_RECEIVED", "PARTIALLY_RECEIVED"],
        ["RECEIVED", "RECEIVED"],
        ["CANCELLED", "CANCELLED"],
      ];

      const results = await runLimited(
        requests,
        2,
        async ([key, status]) => {
          const response =
            await api.purchaseOrder.getAll({
              page: 1,
              limit: 20,
              ...(status ? { status } : {}),
            });

          const result = parseOrderPage(response);

          return [key, result.total];
        },
      );

      if (
        !mountedRef.current ||
        sequence !== statsSequence.current
      ) {
        return;
      }

      const failure = results.find(
        (result) => result.status === "rejected",
      );

      if (failure) {
        throw failure.reason;
      }

      setStats(
        Object.fromEntries(
          results.map((result) => result.value),
        ),
      );
    } catch (error) {
      if (
        !mountedRef.current ||
        sequence !== statsSequence.current
      ) {
        return;
      }

      setStats(null);

      setStatsError(
        "Order counts could not be loaded. Use Refresh to retry.",
      );

      console.error(
        "Unable to load Purchase Order counts:",
        error,
      );
    } finally {
      if (
        mountedRef.current &&
        sequence === statsSequence.current
      ) {
        setStatsLoading(false);
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

  /* ---------------------------------------------------------------- */
  /* Table callbacks                                                   */
  /* ---------------------------------------------------------------- */

  const handleSearch = useCallback((value) => {
    setSearchInput(String(value ?? ""));
  }, []);

  const handleFilterChange = useCallback((next) => {
    setFilters({
      status: next?.status || "",
      creationMode: next?.creationMode || "",
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
  /* Navigation                                                        */
  /* ---------------------------------------------------------------- */

  const handleView = useCallback(
    (row) => {
      if (!row?.orderNumber) {
        toast.error("Order number is missing.");
        return;
      }

      navigate(orderPath(row.orderNumber));
    },
    [navigate],
  );

  const handleEdit = useCallback(
    (row) => {
      if (!row?.orderNumber) {
        toast.error("Order number is missing.");
        return;
      }

      if (row.status !== "CREATED") {
        toast.error(
          "Only CREATED orders can be edited.",
        );
        return;
      }

      navigate(
        orderPath(row.orderNumber, "edit"),
      );
    },
    [navigate],
  );

  /* ---------------------------------------------------------------- */
  /* Single and bulk cancellation                                      */
  /* ---------------------------------------------------------------- */

  const openCancel = (input) => {
    if (
      cancelLock.current ||
      cancelState.open
    ) {
      return;
    }

    const rows = Array.isArray(input)
      ? input
      : [input];

    const unique = Array.from(
      new Map(
        rows
          .filter((row) => row?.orderNumber)
          .map((row) => [
            row.orderNumber,
            row,
          ]),
      ).values(),
    );

    if (!unique.length) {
      toast.error("Select at least one order.");
      return;
    }

    const eligible = unique.filter(
      (row) => row.status === "CREATED",
    );

    if (!eligible.length) {
      toast.error(
        "Only unreceived CREATED orders can be cancelled.",
      );
      return;
    }

    setCancelState({
      open: true,
      targets: eligible,
      skipped: unique.length - eligible.length,
    });

    setCancelReason("");
    setCancelFailures([]);

    setProgress({
      done: 0,
      total: eligible.length,
    });
  };

  const closeCancel = () => {
    if (cancelLock.current) return;

    setCancelState(EMPTY_CANCEL);
    setCancelReason("");
    setCancelFailures([]);
    setProgress({ done: 0, total: 0 });
  };

  const handleCancel = async () => {
    if (
      cancelLock.current ||
      !cancelState.targets.length
    ) {
      return;
    }

    const reason = cancelReason.trim();

    if (!reason) {
      toast.error(
        "Cancellation reason is required.",
      );
      return;
    }

    if (reason.length > 1000) {
      toast.error(
        "Cancellation reason cannot exceed 1000 characters.",
      );
      return;
    }

    const targets = [...cancelState.targets];

    cancelLock.current = true;
    setCancelling(true);
    setCancelFailures([]);

    setProgress({
      done: 0,
      total: targets.length,
    });

    let completed = 0;

    try {
      const results = await runLimited(
        targets,
        CANCEL_CONCURRENCY,
        async (target) => {
          try {
            if (!mountedRef.current) {
              throw new Error("The page was closed.");
            }

            const response =
              await api.purchaseOrder.getByNumber(
                target.orderNumber,
              );

            const latest = getDocument(response);

            if (
              !latest?._id ||
              latest.orderNumber !==
                target.orderNumber ||
              !Number.isSafeInteger(latest.__v)
            ) {
              throw new Error(
                "Unable to load the latest order version.",
              );
            }

            if (latest.status !== "CREATED") {
              throw new Error(
                `Order is now ${latest.status}. Only unreceived CREATED orders can be cancelled.`,
              );
            }

            if (!mountedRef.current) {
              throw new Error("The page was closed.");
            }

            const responseCancel =
              await api.purchaseOrder.cancel(
                latest.orderNumber,
                {
                  version: latest.__v,
                  cancellationReason: reason,
                },
              );

            if (
              responseCancel?.data?.success === false
            ) {
              throw new Error(
                responseCancel.data.message ||
                  "Cancellation was not successful.",
              );
            }

            return target;
          } finally {
            completed += 1;

            if (mountedRef.current) {
              setProgress({
                done: completed,
                total: targets.length,
              });
            }
          }
        },
      );

      if (!mountedRef.current) return;

      const failed = results.flatMap(
        (result, index) =>
          result.status === "rejected"
            ? [{
                target: targets[index],
                message: getErrorMessage(
                  result.reason,
                ),
              }]
            : [],
      );

      const successCount =
        targets.length - failed.length;

      if (successCount) {
        toast.success(
          `${successCount} Purchase Order${
            successCount === 1 ? "" : "s"
          } cancelled successfully.`,
        );
      }

      if (failed.length) {
        setCancelFailures(failed);

        setCancelState({
          open: true,
          targets: failed.map(
            (failure) => failure.target,
          ),
          skipped: 0,
        });

        toast.error(
          `${failed.length} cancellation${
            failed.length === 1 ? "" : "s"
          } failed. Review the details.`,
        );
      } else {
        setCancelState(EMPTY_CANCEL);
        setCancelReason("");
        setCancelFailures([]);
      }

      // Refresh both the current page and global status counts.
      await refreshAll();
    } catch (error) {
      if (mountedRef.current) {
        toast.error(getErrorMessage(error));
      }
    } finally {
      cancelLock.current = false;

      if (mountedRef.current) {
        setCancelling(false);
      }
    }
  };

  /* ---------------------------------------------------------------- */
  /* Export matching orders                                            */
  /* ---------------------------------------------------------------- */

  const handleExport = useCallback(async () => {
    if (exportLock.current) return;

    exportLock.current = true;
    setExporting(true);

    const toastId = toast.loading(
      "Preparing Purchase Order export...",
    );

    try {
      const firstResponse =
        await api.purchaseOrder.getAll(
          buildParams({
            page: 1,
            limit: EXPORT_BATCH_SIZE,
          }),
        );

      const first = parseOrderPage(firstResponse);

      const actualLimit = Math.max(
        1,
        Number(first.pagination?.limit) ||
          EXPORT_BATCH_SIZE,
      );

      const totalPages = Math.max(
        1,
        Math.ceil(first.total / actualLimit),
      );

      const rows = [];
      const supplierCache = {};
      let supplierLookupFailed = false;

      const appendPage = async (records) => {
        try {
          const hydrated =
            await loadSuppliersForOrders(
              records,
              supplierCache,
            );

          rows.push(...hydrated);
        } catch (error) {
          supplierLookupFailed = true;

          rows.push(
            ...enrichOrders(
              records,
              supplierCache,
            ),
          );

          console.warn(
            "Supplier lookup failed during export:",
            error,
          );
        }
      };

      await appendPage(first.data);

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
          await api.purchaseOrder.getAll(
            buildParams({
              page: currentPage,
              limit: actualLimit,
            }),
          );

        await appendPage(
          parseOrderPage(response).data,
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

      const uniqueRows = Array.from(
        new Map(
          rows.map((row) => [
            row._id || row.orderNumber,
            row,
          ]),
        ).values(),
      );

      const fields = [
        ["Order Number", (row) => row.orderNumber],
        [
          "Order Date",
          (row) => csvDate(row.orderDate),
        ],
        ["Supplier", (row) => row.supplierName],
        ["Supplier Code", (row) => row.supplierCode],
        [
          "Supplier ID",
          (row) => normalizeId(row.supplierId),
        ],
        [
          "Expected Delivery",
          (row) => csvDate(row.expectedDeliveryDate),
        ],
        ["Source", (row) => row.creationMode],
        [
          "Source Quotation",
          (row) => row.sourceQuotationNumber,
        ],
        [
          "Order Amount (Paise)",
          (row) => row.totalAmountPaise,
        ],
        ["Status", (row) => row.status],
        ["Payment Terms", (row) => row.paymentTerms],
        ["Delivery Terms", (row) => row.deliveryTerms],
        [
          "Delivery Address",
          (row) => row.deliveryAddress,
        ],
        [
          "Cancellation Reason",
          (row) => row.cancellationReason,
        ],
        ["Notes", (row) => row.notes],
        [
          "Created On",
          (row) => csvDate(row.createdAt),
        ],
      ];

      const csv = [
        fields
          .map(([label]) => csvCell(label))
          .join(","),

        ...uniqueRows.map((row) =>
          fields
            .map(([, getter]) =>
              csvCell(getter(row)),
            )
            .join(","),
        ),
      ].join("\r\n");

      await saveCsvFile(
        "purchase-orders-export.csv",
        csv,
      );

      toast.success(
        `Exported ${uniqueRows.length} orders.`,
        { id: toastId },
      );

      if (supplierLookupFailed) {
        toast(
          "Some supplier names could not be loaded. Supplier IDs are included in the export.",
          { duration: 7000 },
        );
      }
    } catch (error) {
      toast.error(getErrorMessage(error), {
        id: toastId,
      });
    } finally {
      exportLock.current = false;

      if (mountedRef.current) {
        setExporting(false);
      }
    }
  }, [buildParams]);

  /* ---------------------------------------------------------------- */
  /* Table configuration                                               */
  /* ---------------------------------------------------------------- */

  const columns = useMemo(
    () => [
      {
        key: "orderNumber",
        label: "Order Number",
        sortable: SERVER_SORTING_ENABLED,

        render: (value, row) => (
          <div className="po-document-cell">
            <button
              type="button"
              className="po-document-link"
              onClick={(event) => {
                event.stopPropagation();
                handleView(row);
              }}
            >
              {value || "—"}
            </button>

            <span>
              {row.sourceQuotationNumber ||
                "Direct purchase order"}
            </span>
          </div>
        ),
      },
      {
        key: "orderDate",
        label: "Order Date",
        sortable: SERVER_SORTING_ENABLED,
        render: formatDate,
      },
      {
        key: "supplierName",
        label: "Supplier",
        sortable: false,

        render: (value, row) => (
          <div className="po-document-cell">
            <strong>
              {value || "Supplier unavailable"}
            </strong>

            <span>
              {row.supplierCode || "—"}
            </span>
          </div>
        ),
      },
      {
        key: "expectedDeliveryDate",
        label: "Expected Delivery",
        sortable: SERVER_SORTING_ENABLED,
        render: formatDate,
      },
      {
        key: "creationMode",
        label: "Source",
        sortable: SERVER_SORTING_ENABLED,

        render: (value) => (
          <span className="po-source-badge">
            {value === "QUOTATION"
              ? "Supplier Quotation"
              : "Direct"}
          </span>
        ),
      },
      {
        key: "totalAmountPaise",
        label: "Order Amount",
        sortable: SERVER_SORTING_ENABLED,

        render: (value) => (
          <strong className="po-money">
            {formatPaise(value)}
          </strong>
        ),
      },
      {
        key: "status",
        label: "Status",
        sortable: SERVER_SORTING_ENABLED,

        render: (value) => (
          <StatusField
            value={value || "CREATED"}
          />
        ),
      },
      {
        key: "createdAt",
        label: "Created On",
        sortable: SERVER_SORTING_ENABLED,
        visible: false,
        render: formatDate,
      },

      ...[
        ["sourceQuotationNumber", "Source Quotation"],
        ["paymentTerms", "Payment Terms"],
        ["deliveryTerms", "Delivery Terms"],
        ["cancellationReason", "Cancellation Reason"],
        ["notes", "Notes"],
      ].map(([key, label]) => ({
        key,
        label,
        visible: false,
        sortable: false,
        render: (value) => value || "—",
      })),
    ],
    [handleView],
  );

  const tableFilters = useMemo(
    () => [
      {
        key: "status",
        label: "Status",
        type: "select",
        options: STATUS_OPTIONS,
      },
      {
        key: "creationMode",
        label: "Source",
        type: "select",
        options: ["DIRECT", "QUOTATION"],
      },
    ],
    [],
  );

  const quickFilters = useMemo(
    () => [
      {
        key: "status",
        value: "",
        label: "All Orders",
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
        value: "PARTIALLY_RECEIVED",
        label: "Partially Received",
        ...(stats !== null
          ? { count: stats.PARTIALLY_RECEIVED }
          : {}),
      },
      {
        key: "status",
        value: "RECEIVED",
        label: "Received",
        ...(stats !== null
          ? { count: stats.RECEIVED }
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

  const targetCount = cancelState.targets.length;

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <div className="po-list-page">
      {loadError && (
        <div
          className="po-list-alert"
          role="alert"
        >
          {loadError}
        </div>
      )}

      {statsError && (
        <div
          className="po-list-alert"
          role="status"
        >
          {statsError}
        </div>
      )}

      {statsLoading && stats === null && (
        <p
          className="po-list-notice"
          role="status"
        >
          Loading order counts...
        </p>
      )}

      {exporting && (
        <p
          className="po-list-notice"
          role="status"
        >
          Exporting matching Purchase Orders...
        </p>
      )}

      <DataList
        title="Purchase Orders"
        subtitle="Manage direct orders and orders created from supplier quotations"
        columns={columns}
        data={orders}
        loading={loading}
        rowKey="_id"
        showCase="list"
        searchable
        sortable={SERVER_SORTING_ENABLED}
        filterable
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
        storageKey="trustiq-purchase-orders"
        searchPlaceholder="Search order or quotation number..."
        filters={tableFilters}
        quickFilters={quickFilters}
        actions={{
          view: handleView,
          edit: handleEdit,
        }}
        bulkActions={[
          {
            key: "cancel",
            label: "Cancel Orders",
            danger: true,
            action: openCancel,
          },
        ]}
        onRefresh={refreshAll}
        onExport={handleExport}
        addButton={
          <button
            type="button"
            className="po-primary-button"
            onClick={() =>
              navigate(
                `${PURCHASE_ORDER_BASE}/create`,
              )
            }
          >
            <Plus size={16} />
            <span>New Purchase Order</span>
          </button>
        }
      />

      <div className="po-list-cancel">
        <label htmlFor="po-cancel-picker">
          Cancel an unreceived order on this page
        </label>

        <select
          id="po-cancel-picker"
          value=""
          disabled={
            loading ||
            cancelling ||
            cancelState.open
          }
          onChange={(event) => {
            const row = orders.find(
              (order) =>
                order.orderNumber ===
                event.target.value,
            );

            if (row) {
              openCancel(row);
            }
          }}
        >
          <option value="">
            Select a CREATED order...
          </option>

          {orders
            .filter(
              (order) =>
                order.status === "CREATED",
            )
            .map((order) => (
              <option
                key={order._id}
                value={order.orderNumber}
              >
                {order.orderNumber}
                {" — "}
                {formatPaise(
                  order.totalAmountPaise,
                )}
              </option>
            ))}
        </select>
      </div>

      <BoxModal
        show={cancelState.open}
        onClose={closeCancel}
        title={
          targetCount > 1
            ? "Cancel selected Purchase Orders"
            : "Cancel Purchase Order"
        }
        subtitle={
          targetCount === 1
            ? cancelState.targets[0]?.orderNumber || ""
            : `${targetCount} selected orders`
        }
        width="min(560px, calc(100vw - 24px))"
        footer={
          <div className="po-cancel-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={closeCancel}
              disabled={cancelling}
            >
              Keep Orders
            </Button>

            <Button
              type="button"
              onClick={handleCancel}
              loading={cancelling}
              disabled={
                cancelling ||
                !cancelReason.trim()
              }
            >
              {cancelling
                ? `Processing ${progress.done}/${progress.total}`
                : cancelFailures.length
                  ? `Retry ${targetCount} Failed`
                  : "Confirm Cancellation"}
            </Button>
          </div>
        }
      >
        <div className="po-cancel-content">
          <p className="po-cancel-note">
            Only unreceived CREATED orders can be
            cancelled. Each order is checked again
            before cancellation.
          </p>

          {cancelState.skipped > 0 && (
            <p className="po-cancel-note">
              {cancelState.skipped} selected order
              {cancelState.skipped === 1 ? "" : "s"}{" "}
              will be skipped because they are not
              CREATED.
            </p>
          )}

          <Textarea
            label="Cancellation Reason"
            value={cancelReason}
            onChange={(event) =>
              setCancelReason(event.target.value)
            }
            maxLength={1000}
            rows={4}
            disabled={cancelling}
            required
          />

          {targetCount > 1 && (
            <p className="po-cancel-note">
              The same reason will be applied to
              every order in this action.
            </p>
          )}

          {cancelling && (
            <p role="status">
              Processed {progress.done} of{" "}
              {progress.total}.
            </p>
          )}

          {cancelFailures.length > 0 && (
            <div
              className="po-cancel-errors"
              role="alert"
            >
              <strong>
                Some orders could not be cancelled
              </strong>

              <ul>
                {cancelFailures.map((failure) => (
                  <li
                    key={
                      failure.target.orderNumber
                    }
                  >
                    {failure.target.orderNumber}
                    {": "}
                    {failure.message}
                  </li>
                ))}
              </ul>

              <p>
                Successful cancellations will not be
                submitted again. Verify timed-out
                requests before retrying.
              </p>
            </div>
          )}
        </div>
      </BoxModal>
    </div>
  );
}

export default PurchaseOrdersList;