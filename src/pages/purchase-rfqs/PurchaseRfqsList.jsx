// import { Plus } from "lucide-react";

// import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// import { useNavigate } from "react-router-dom";
// import toast from "react-hot-toast";

// import DataList from "../../components/common/DataList/DataList";
// import StatusField from "../../components/common/StatusField/StatusField";
// import ConfirmModal from "../../components/common/ConfirmModal/ConfirmModal";

// import api from "../../services/api";

// import {
//   RFQ_BASE,
//   fetchAllPages,
//   formatDate,
//   getDocument,
//   getErrorMessage,
//   rfqPath,
// } from "./purchaseRfq.utils";

// import "./PurchaseRfqs.css";

// const HEX_ID = /^[a-f\d]{24}$/i;

// // Populated user object ({ name }) or plain string; raw ObjectIds are not names.
// const getUserName = (value) => {
//   if (!value) return "";

//   if (typeof value === "string") {
//     return HEX_ID.test(value) ? "" : value;
//   }

//   return value.name || value.fullName || value.username || value.email || "";
// };

// function PurchaseRfqsList() {
//   const navigate = useNavigate();

//   const [loading, setLoading] = useState(true);
//   const [rfqs, setRfqs] = useState([]);

//   const [deleteTarget, setDeleteTarget] = useState(null);
//   const [deleting, setDeleting] = useState(false);

//   const [actionTarget, setActionTarget] = useState(null);
//   const [actionType, setActionType] = useState("");
//   const [actionReason, setActionReason] = useState("");
//   const [actionLoading, setActionLoading] = useState(false);

//   const loadSequence = useRef(0);
//   const deleteLock = useRef(false);
//   const actionLock = useRef(false);
//   const mountedRef = useRef(false);

//   const loadRfqs = useCallback(async () => {
//     const sequence = ++loadSequence.current;

//     try {
//       setLoading(true);

//       const records = await fetchAllPages(api.purchaseRfq.getAll, "rfqs");

//       if (sequence !== loadSequence.current) return;

//       setRfqs(records);
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
//     mountedRef.current = true;
//     loadRfqs();

//     return () => {
//       mountedRef.current = false;
//       loadSequence.current += 1;
//     };
//   }, [loadRfqs]);

//   const handleView = useCallback(
//     (row) => {
//       if (!row.rfqNumber) {
//         toast.error("RFQ number is missing.");
//         return;
//       }

//       navigate(rfqPath(row.rfqNumber));
//     },
//     [navigate],
//   );

//   const handleEdit = (row) => {
//     if (row.status !== "CREATED") {
//       toast.error("Only CREATED RFQs can be edited.");
//       return;
//     }

//     navigate(rfqPath(row.rfqNumber, "edit"));
//   };

//   const handleDelete = async (row) => {
//     if (deleteLock.current) return;

//     if (row.status !== "CREATED") {
//       toast.error("Only CREATED RFQs can be deleted.");
//       return;
//     }

//     try {
//       deleteLock.current = true;

//       const response = await api.purchaseRfq.getByNumber(row.rfqNumber);

//       const latest = getDocument(response);

//       if (
//         !latest ||
//         latest.status !== "CREATED" ||
//         !Number.isSafeInteger(latest.__v)
//       ) {
//         throw new Error("The RFQ changed. Refresh the list.");
//       }

//       if (mountedRef.current) {
//         setDeleteTarget(latest);
//       }
//     } catch (error) {
//       if (mountedRef.current) {
//         toast.error(getErrorMessage(error));
//       }
//     } finally {
//       deleteLock.current = false;
//     }
//   };

//   const confirmDelete = async () => {
//     if (deleteLock.current || !deleteTarget) return;

//     try {
//       deleteLock.current = true;
//       setDeleting(true);

//       await api.purchaseRfq.delete(deleteTarget.rfqNumber, {
//         version: deleteTarget.__v,
//       });

//       if (!mountedRef.current) return;

//       setRfqs((previous) =>
//         previous.filter((record) => record._id !== deleteTarget._id),
//       );

//       setDeleteTarget(null);
//       toast.success("RFQ deleted successfully.");
//     } catch (error) {
//       if (mountedRef.current) {
//         toast.error(getErrorMessage(error));
//       }
//     } finally {
//       deleteLock.current = false;

//       if (mountedRef.current) {
//         setDeleting(false);
//       }
//     }
//   };

//   const openAction = async (row, type) => {
//     if (actionLock.current) return;

//     if (!["approve", "reject"].includes(type)) return;

//     if (row.status !== "CREATED") {
//       toast.error("Only CREATED RFQs can be approved or rejected.");
//       return;
//     }

//     try {
//       actionLock.current = true;

//       const response = await api.purchaseRfq.getByNumber(row.rfqNumber);

//       const latest = getDocument(response);

//       if (
//         !latest ||
//         latest.status !== "CREATED" ||
//         !Number.isSafeInteger(latest.__v)
//       ) {
//         throw new Error("The RFQ changed. Refresh the list.");
//       }

//       if (!mountedRef.current) return;

//       setActionTarget(latest);
//       setActionType(type);
//       setActionReason("");
//     } catch (error) {
//       if (mountedRef.current) {
//         toast.error(getErrorMessage(error));
//       }
//     } finally {
//       actionLock.current = false;
//     }
//   };

//   const closeAction = () => {
//     if (actionLock.current || actionLoading) return;

//     setActionTarget(null);
//     setActionType("");
//     setActionReason("");
//   };

//   const confirmAction = async () => {
//     if (actionLock.current || !actionTarget || !actionType) return;

//     if (actionType === "reject" && !actionReason.trim()) {
//       toast.error("Rejection reason is required.");
//       return;
//     }

//     try {
//       actionLock.current = true;
//       setActionLoading(true);

//       const method =
//         actionType === "approve"
//           ? api.purchaseRfq.approve
//           : api.purchaseRfq.reject;

//       const response = await method(actionTarget.rfqNumber, {
//         version: actionTarget.__v,
//         ...(actionType === "reject"
//           ? { rejectionReason: actionReason.trim() }
//           : {}),
//       });

//       const updated = getDocument(response);

//       if (!mountedRef.current) return;

//       setRfqs((previous) =>
//         previous.map((record) => {
//           if (record._id !== actionTarget._id) return record;

//           if (updated?._id) {
//             return {
//               ...record,
//               ...updated,
//             };
//           }

//           return {
//             ...record,
//             status: actionType === "approve" ? "APPROVED" : "REJECTED",
//           };
//         }),
//       );

//       setActionTarget(null);
//       setActionType("");
//       setActionReason("");

//       toast.success(
//         actionType === "approve"
//           ? "RFQ approved successfully."
//           : "RFQ rejected successfully.",
//       );
//     } catch (error) {
//       if (mountedRef.current) {
//         toast.error(getErrorMessage(error));
//         loadRfqs();
//       }
//     } finally {
//       actionLock.current = false;

//       if (mountedRef.current) {
//         setActionLoading(false);
//       }
//     }
//   };

//   const columns = useMemo(
//     () => [
//       {
//         key: "rfqNumber",
//         label: "RFQ Number",
//         sortable: true,

//         render: (value, row) => (
//           <div className="rfqu-document-cell">
//             <button
//               type="button"
//               className="rfqu-document-link"
//               onClick={(event) => {
//                 event.stopPropagation();
//                 handleView(row);
//               }}
//             >
//               {value || "—"}
//             </button>

//             <span>{row.sourceRequisitionNumber || "Direct RFQ"}</span>
//           </div>
//         ),
//       },

//       {
//         key: "rfqDate",
//         label: "RFQ Date",
//         sortable: true,
//         render: formatDate,
//       },

//       {
//         key: "quotationDueDate",
//         label: "Quotation Due",
//         sortable: true,
//         render: formatDate,
//       },

//       {
//         key: "creationMode",
//         label: "Source",
//         sortable: true,

//         render: (value) => (
//           <span className="rfqu-source-badge">
//             {value === "REQUISITION" ? "Purchase Requisition" : "Direct"}
//           </span>
//         ),
//       },

//       {
//         key: "supplierIds",
//         label: "Suppliers",
//         sortable: false,
//         render: (value) => value?.length || 0,
//       },

//       {
//         key: "items",
//         label: "Item Lines",
//         sortable: false,
//         render: (value) => value?.length || 0,
//       },

//       {
//         key: "status",
//         label: "Status",
//         sortable: true,

//         render: (value) => <StatusField value={value || "CREATED"} />,
//       },
      

//       {
//         key: "createdBy",
//         label: "Created By",
//         sortable: false,
//         visible: false,
//         render: (value) => getUserName(value) || "—",
//       },

//       {
//         key: "approvedBy",
//         label: "Approved By",
//         sortable: false,
//         visible: false,
//         render: (value) => getUserName(value) || "—",
//       },

//       {
//         key: "rejectedBy",
//         label: "Rejected By",
//         sortable: false,
//         visible: false,
//         render: (value) => getUserName(value) || "—",
//       },

//       {
//         key: "rejectionReason",
//         label: "Rejection Reason",
//         sortable: false,
//         visible: false,
//         render: (value) => value || "—",
//       },

//       {
//         key: "cancelledBy",
//         label: "Cancelled By",
//         sortable: false,
//         visible: false,
//         render: (value) => getUserName(value) || "—",
//       },

//       {
//         key: "sourceRequisitionNumber",
//         label: "Requisition",
//         sortable: true,
//         visible: false,
//         render: (value) => value || "—",
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
//         sortable: false,
//         visible: false,
//       },

//       {
//         key: "notes",
//         label: "Notes",
//         sortable: false,
//         visible: false,
//       },
//     ],
//     [handleView],
//   );

//   return (
//     <div className="rfqu-list-page">
//       <DataList
//         title="Requests for Quotation"
//         subtitle="Request supplier offers directly or against approved requisitions"
//         columns={columns}
//         data={rfqs}
//         loading={loading}
//         rowKey="_id"
//         showCase="list"
//         searchable
//         filterable
//         sortable
//         selectable
//         columnVisibility
//         pagination
//         storageKey="trustiq-purchase-rfqs"
//         searchPlaceholder="Search RFQ, requisition, status..."
//         filters={[
//           {
//             key: "status",
//             label: "Status",
//             type: "select",
//             options: [
//               "CREATED",
//               "APPROVED",
//               "REJECTED",
//               "ISSUED",
//               "CLOSED",
//               "CANCELLED",
//             ],
//           },
//           {
//             key: "creationMode",
//             label: "Source",
//             type: "select",
//             options: ["DIRECT", "REQUISITION"],
//           },
//         ]}
//         quickFilters={[
//           { key: "status", value: "", label: "All" },
//           { key: "status", value: "CREATED", label: "Created" },
//           { key: "status", value: "APPROVED", label: "Approved" },
//           { key: "status", value: "REJECTED", label: "Rejected" },
//           { key: "status", value: "ISSUED", label: "Issued" },
//           { key: "status", value: "CLOSED", label: "Closed" },
//           { key: "status", value: "CANCELLED", label: "Cancelled" },
//         ]}
//         actions={{
//           view: handleView,
//           edit: handleEdit,
//           delete: handleDelete,
//           approve: (row) => openAction(row, "approve"),
//           reject: (row) => openAction(row, "reject"),
//         }}
//         onRefresh={loadRfqs}
//         addButton={
//           <button
//             type="button"
//             className="rfqu-primary-button"
//             onClick={() => navigate(`${RFQ_BASE}/create`)}
//           >
//             <Plus size={16} />
//             <span>New RFQ</span>
//           </button>
//         }
//       />

//       <ConfirmModal
//         open={Boolean(deleteTarget)}
//         type="danger"
//         title="Delete RFQ?"
//         message={`Delete ${deleteTarget?.rfqNumber || "this RFQ"}?`}
//         confirmText="Delete RFQ"
//         cancelText="Keep RFQ"
//         loading={deleting}
//         onCancel={() => {
//           if (!deleteLock.current) {
//             setDeleteTarget(null);
//           }
//         }}
//         onConfirm={confirmDelete}
//       />

//       <ConfirmModal
//         open={Boolean(actionTarget) && actionType === "approve"}
//         type="success"
//         title="Approve RFQ?"
//         message={`Approve ${
//           actionTarget?.rfqNumber || "this RFQ"
//         }? Approved RFQs can be marked as issued.`}
//         confirmText="Approve RFQ"
//         cancelText="Back"
//         loading={actionLoading}
//         loadingText="Approving..."
//         onCancel={closeAction}
//         onConfirm={confirmAction}
//       />

//       <ConfirmModal
//         open={Boolean(actionTarget) && actionType === "reject"}
//         type="danger"
//         title="Reject RFQ?"
//         message={`Reject ${
//           actionTarget?.rfqNumber || "this RFQ"
//         }? Please provide a rejection reason.`}
//         confirmText="Reject RFQ"
//         cancelText="Back"
//         loading={actionLoading}
//         loadingText="Rejecting..."
//         onCancel={closeAction}
//         onConfirm={confirmAction}
//       >
//         <textarea
//           className="rfqu-rejection-reason"
//           rows={4}
//           maxLength={1000}
//           placeholder="Enter rejection reason..."
//           value={actionReason}
//           disabled={actionLoading}
//           onChange={(event) => setActionReason(event.target.value)}
//           required
//         />
//       </ConfirmModal>
//     </div>
//   );
// }

// export default PurchaseRfqsList;


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
import ConfirmModal from "../../components/common/ConfirmModal/ConfirmModal";

import { saveCsvFile } from "../../components/common/DataList/fileDownload";

import api from "../../services/api";

import {
  RFQ_BASE,
  formatDate,
  getDocument,
  getErrorMessage,
  rfqPath,
} from "./purchaseRfq.utils";

import "./PurchaseRfqs.css";

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const SEARCH_DEBOUNCE_MS = 400;
const EXPORT_BATCH_SIZE = 100;
const ACTION_CONCURRENCY = 3;

const HEX_ID = /^[a-f\d]{24}$/i;

const STATUSES = [
  "CREATED",
  "APPROVED",
  "REJECTED",
  "ISSUED",
  "CLOSED",
  "CANCELLED",
];

const EMPTY_STATS = {
  all: 0,
  CREATED: 0,
  APPROVED: 0,
  REJECTED: 0,
  ISSUED: 0,
  CLOSED: 0,
  CANCELLED: 0,
};

const EMPTY_CONFIRM = {
  open: false,
  type: "",
  targets: [],
  skipped: 0,
};

const ACTION_CONFIG = {
  approve: {
    modalType: "success",
    title: "Approve RFQ",
    pluralTitle: "Approve selected RFQs",
    confirmText: "Approve",
    past: "approved",
  },

  reject: {
    modalType: "danger",
    title: "Reject RFQ",
    pluralTitle: "Reject selected RFQs",
    confirmText: "Reject",
    past: "rejected",
  },

  delete: {
    modalType: "danger",
    title: "Delete RFQ",
    pluralTitle: "Delete selected RFQs",
    confirmText: "Delete",
    past: "deleted",
  },
};

const SORTABLE_FIELDS = new Set([
  "rfqNumber",
  "rfqDate",
  "quotationDueDate",
  "creationMode",
  "status",
  "sourceRequisitionNumber",
  "paymentTerms",
  "createdAt",
]);

const getUserName = (value) => {
  if (!value) return "";

  if (typeof value === "string") {
    return HEX_ID.test(value) ? "" : value;
  }

  return (
    value.name ||
    value.fullName ||
    value.username ||
    value.email ||
    ""
  );
};

const getListResult = (response) => {
  const body = response?.data;

  const data = Array.isArray(body?.data)
    ? body.data
    : Array.isArray(body?.data?.rfqs)
      ? body.data.rfqs
      : Array.isArray(body?.rfqs)
        ? body.rfqs
        : [];

  const pagination =
    body?.pagination || body?.data?.pagination;

  const rawTotal = Number(pagination?.total);

  return {
    data,
    total: Number.isFinite(rawTotal)
      ? Math.max(0, rawTotal)
      : data.length,
    pagination,
  };
};

const escapeCsv = (value) => {
  let result = String(value ?? "");

  // Reduce spreadsheet formula interpretation for exported text.
  if (/^[\s]*[=+\-@]/.test(result)) {
    result = `'${result}`;
  }

  return `"${result.replace(/"/g, '""')}"`;
};

const exportDate = (value) => {
  if (!value) return "";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : date.toISOString().slice(0, 10);
};

async function runLimited(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  const runners = Array.from(
    {
      length: Math.min(concurrency, items.length),
    },
    async () => {
      while (cursor < items.length) {
        const index = cursor++;

        try {
          const value = await worker(items[index], index);

          results[index] = {
            status: "fulfilled",
            value,
          };
        } catch (reason) {
          results[index] = {
            status: "rejected",
            reason,
          };
        }
      }
    },
  );

  await Promise.all(runners);

  return results;
}

function PurchaseRfqsList() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [rfqs, setRfqs] = useState([]);
  const [total, setTotal] = useState(0);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [filters, setFilters] = useState({});
  const [sort, setSort] = useState({
    key: "rfqDate",
    direction: "desc",
  });

  const [stats, setStats] = useState(EMPTY_STATS);
  const [statsReady, setStatsReady] = useState(false);

  const [confirm, setConfirm] = useState(EMPTY_CONFIRM);
  const [actionReason, setActionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionFailures, setActionFailures] = useState([]);

  const [progress, setProgress] = useState({
    done: 0,
    total: 0,
  });

  const [exporting, setExporting] = useState(false);

  const mountedRef = useRef(false);
  const loadSequence = useRef(0);
  const statsSequence = useRef(0);
  const actionLock = useRef(false);
  const exportLock = useRef(false);

  /* -------------------------------------------------------------- */
  /* Mount lifecycle                                                 */
  /* -------------------------------------------------------------- */

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      loadSequence.current += 1;
      statsSequence.current += 1;
    };
  }, []);

  /* -------------------------------------------------------------- */
  /* Debounced search                                                */
  /* -------------------------------------------------------------- */

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
    (extra = {}) => {
      const params = {
        sortBy: sort.key || "rfqDate",
        sortOrder: sort.direction || "desc",
        ...extra,
      };

      if (search) params.search = search;

      if (filters.status) {
        params.status = filters.status;
      }

      if (filters.creationMode) {
        params.creationMode = filters.creationMode;
      }

      return params;
    },
    [search, filters, sort],
  );

  /* -------------------------------------------------------------- */
  /* Paginated list                                                  */
  /* -------------------------------------------------------------- */

  const loadRfqs = useCallback(async () => {
    if (!mountedRef.current) return;

    const sequence = ++loadSequence.current;

    setLoading(true);

    try {
      const response = await api.purchaseRfq.getAll(
        buildParams({
          page,
          limit: pageSize,
        }),
      );

      if (
        !mountedRef.current ||
        sequence !== loadSequence.current
      ) {
        return;
      }

      const result = getListResult(response);

      const lastPage = Math.max(
        1,
        Math.ceil(result.total / pageSize),
      );

      if (page > lastPage) {
        setPage(lastPage);
        return;
      }

      setRfqs(result.data);
      setTotal(result.total);
    } catch (error) {
      if (
        !mountedRef.current ||
        sequence !== loadSequence.current
      ) {
        return;
      }

      setRfqs([]);
      setTotal(0);

      toast.error(getErrorMessage(error));
    } finally {
      if (
        mountedRef.current &&
        sequence === loadSequence.current
      ) {
        setLoading(false);
      }
    }
  }, [buildParams, page, pageSize]);

  useEffect(() => {
    loadRfqs();

    return () => {
      loadSequence.current += 1;
    };
  }, [loadRfqs]);

  /* -------------------------------------------------------------- */
  /* Global status counts                                            */
  /* Uses existing list endpoint; no new stats endpoint required.     */
  /* -------------------------------------------------------------- */

  const loadStats = useCallback(async () => {
    const sequence = ++statsSequence.current;

    try {
      const count = async (status) => {
        const response = await api.purchaseRfq.getAll({
          page: 1,
          limit: 1,
          ...(status ? { status } : {}),
        });

        const result = getListResult(response);

        if (result.pagination?.total === undefined) {
          throw new Error(
            "RFQ list response must include pagination.total.",
          );
        }

        return result.total;
      };

      const results = await runLimited(
        ["all", ...STATUSES],
        3,
        async (key) => [
          key,
          await count(key === "all" ? "" : key),
        ],
      );

      if (
        !mountedRef.current ||
        sequence !== statsSequence.current
      ) {
        return;
      }

      const failed = results.find(
        (result) => result.status === "rejected",
      );

      if (failed) throw failed.reason;

      setStats(
        Object.fromEntries(
          results.map((result) => result.value),
        ),
      );

      setStatsReady(true);
    } catch (error) {
      if (
        mountedRef.current &&
        sequence === statsSequence.current
      ) {
        setStatsReady(false);
        console.warn("Unable to load RFQ counts:", error);
      }
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const refreshAll = useCallback(() => {
    return Promise.all([
      loadRfqs(),
      loadStats(),
    ]);
  }, [loadRfqs, loadStats]);

  /* -------------------------------------------------------------- */
  /* Table callbacks                                                 */
  /* -------------------------------------------------------------- */

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
    const valid =
      SORTABLE_FIELDS.has(next?.key) &&
      ["asc", "desc"].includes(next?.direction);

    setSort(
      valid
        ? {
            key: next.key,
            direction: next.direction,
          }
        : {
            key: "rfqDate",
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

  /* -------------------------------------------------------------- */
  /* Navigation                                                      */
  /* -------------------------------------------------------------- */

  const handleView = useCallback(
    (row) => {
      if (!row?.rfqNumber) {
        toast.error("RFQ number is missing.");
        return;
      }

      navigate(rfqPath(row.rfqNumber));
    },
    [navigate],
  );

  const handleEdit = useCallback(
    (row) => {
      if (!row?.rfqNumber) {
        toast.error("RFQ number is missing.");
        return;
      }

      if (row.status !== "CREATED") {
        toast.error("Only CREATED RFQs can be edited.");
        return;
      }

      navigate(rfqPath(row.rfqNumber, "edit"));
    },
    [navigate],
  );

  /* -------------------------------------------------------------- */
  /* Single and bulk confirmation                                    */
  /* -------------------------------------------------------------- */

  const openAction = (rows, type) => {
    if (
      actionLock.current ||
      confirm.open ||
      !ACTION_CONFIG[type]
    ) {
      return;
    }

    const uniqueRows = Array.from(
      new Map(
        (Array.isArray(rows) ? rows : [rows])
          .filter((row) => row?.rfqNumber)
          .map((row) => [row.rfqNumber, row]),
      ).values(),
    );

    if (!uniqueRows.length) {
      toast.error("Select at least one RFQ.");
      return;
    }

    const eligible = uniqueRows.filter(
      (row) => row.status === "CREATED",
    );

    if (!eligible.length) {
      toast.error(
        "Only CREATED RFQs are eligible for this action.",
      );
      return;
    }

    setConfirm({
      open: true,
      type,
      targets: eligible,
      skipped: uniqueRows.length - eligible.length,
    });

    setActionReason("");
    setActionFailures([]);
    setProgress({
      done: 0,
      total: eligible.length,
    });
  };

  const closeConfirm = () => {
    if (actionLock.current) return;

    setConfirm(EMPTY_CONFIRM);
    setActionReason("");
    setActionFailures([]);
    setProgress({ done: 0, total: 0 });
  };

  const confirmAction = async () => {
    if (
      actionLock.current ||
      !confirm.targets.length ||
      !ACTION_CONFIG[confirm.type]
    ) {
      return;
    }

    const type = confirm.type;
    const reason = actionReason.trim();
    const targets = [...confirm.targets];

    if (type === "reject" && !reason) {
      toast.error("Rejection reason is required.");
      return;
    }

    if (reason.length > 1000) {
      toast.error(
        "Rejection reason cannot exceed 1000 characters.",
      );
      return;
    }

    if (typeof api.purchaseRfq[type] !== "function") {
      toast.error(
        `The "${type}" API method is not available.`,
      );
      return;
    }

    actionLock.current = true;
    setActionLoading(true);
    setActionFailures([]);
    setProgress({ done: 0, total: targets.length });

    let completed = 0;

    try {
      const results = await runLimited(
        targets,
        ACTION_CONCURRENCY,
        async (target) => {
          try {
            if (!mountedRef.current) {
              throw new Error("The page was closed.");
            }

            const response =
              await api.purchaseRfq.getByNumber(
                target.rfqNumber,
              );

            const latest = getDocument(response);

            if (
              latest?.rfqNumber !== target.rfqNumber ||
              !Number.isSafeInteger(latest.__v)
            ) {
              throw new Error(
                "Unable to load the latest RFQ version.",
              );
            }

            if (latest.status !== "CREATED") {
              throw new Error(
                `RFQ is now ${latest.status}; only CREATED RFQs are eligible.`,
              );
            }

            if (!mountedRef.current) {
              throw new Error("The page was closed.");
            }

            const writeResponse =
              await api.purchaseRfq[type](
                latest.rfqNumber,
                {
                  version: latest.__v,
                  ...(type === "reject"
                    ? { rejectionReason: reason }
                    : {}),
                },
              );

            if (writeResponse?.data?.success === false) {
              throw new Error(
                writeResponse.data.message ||
                  "The server reported an unsuccessful action.",
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

      const failures = results.flatMap(
        (result, index) =>
          result.status === "rejected"
            ? [
                {
                  target: targets[index],
                  message: getErrorMessage(result.reason),
                },
              ]
            : [],
      );

      const successCount =
        targets.length - failures.length;

      if (successCount) {
        toast.success(
          `${successCount} RFQ${
            successCount === 1 ? "" : "s"
          } ${ACTION_CONFIG[type].past} successfully.`,
        );
      }

      if (failures.length) {
        toast.error(
          `${failures.length} RFQ${
            failures.length === 1 ? "" : "s"
          } failed. Review the details before retrying.`,
        );

        // Successful RFQs are removed from the pending action.
        setConfirm((previous) => ({
          ...previous,
          targets: failures.map(
            (failure) => failure.target,
          ),
          skipped: 0,
        }));

        setActionFailures(failures);
      } else {
        setConfirm(EMPTY_CONFIRM);
        setActionReason("");
        setActionFailures([]);
      }

      await refreshAll();
    } catch (error) {
      if (mountedRef.current) {
        toast.error(getErrorMessage(error));
      }
    } finally {
      actionLock.current = false;

      if (mountedRef.current) {
        setActionLoading(false);
      }
    }
  };

  /* -------------------------------------------------------------- */
  /* CSV export of all matching records                               */
  /* -------------------------------------------------------------- */

  const handleExport = useCallback(async () => {
    if (exportLock.current) return;

    exportLock.current = true;
    setExporting(true);

    const toastId = toast.loading("Preparing RFQ export...");

    try {
      const firstResponse =
        await api.purchaseRfq.getAll(
          buildParams({
            page: 1,
            limit: EXPORT_BATCH_SIZE,
          }),
        );

      const first = getListResult(firstResponse);

      if (first.pagination?.total === undefined) {
        throw new Error(
          "CSV export requires pagination.total from the backend.",
        );
      }

      const rows = [...first.data];

      const actualLimit = Math.max(
        1,
        Number(first.pagination?.limit) ||
          EXPORT_BATCH_SIZE,
      );

      const pages = Math.max(
        1,
        Math.ceil(first.total / actualLimit),
      );

      for (let nextPage = 2; nextPage <= pages; nextPage++) {
        if (!mountedRef.current) {
          toast.dismiss(toastId);
          return;
        }

        const response = await api.purchaseRfq.getAll(
          buildParams({
            page: nextPage,
            limit: actualLimit,
          }),
        );

        rows.push(...getListResult(response).data);

        toast.loading(
          `Preparing RFQ export: page ${nextPage} of ${pages}`,
          { id: toastId },
        );
      }

      const uniqueRows = Array.from(
        new Map(
          rows.map((row) => [
            row._id || row.rfqNumber,
            row,
          ]),
        ).values(),
      );

      const fields = [
        ["RFQ Number", (row) => row.rfqNumber],
        ["RFQ Date", (row) => exportDate(row.rfqDate)],
        [
          "Quotation Due Date",
          (row) => exportDate(row.quotationDueDate),
        ],
        ["Source", (row) => row.creationMode],
        [
          "Source Requisition",
          (row) => row.sourceRequisitionNumber,
        ],
        ["Suppliers", (row) => row.supplierIds?.length || 0],
        ["Item Lines", (row) => row.items?.length || 0],
        ["Status", (row) => row.status],
        ["Payment Terms", (row) => row.paymentTerms],
        ["Delivery Terms", (row) => row.deliveryTerms],
        ["Delivery Address", (row) => row.deliveryAddress],
        ["Rejection Reason", (row) => row.rejectionReason],
        [
          "Cancellation Reason",
          (row) => row.cancellationReason,
        ],
        ["Created By", (row) => getUserName(row.createdBy)],
        ["Created On", (row) => exportDate(row.createdAt)],
        ["Notes", (row) => row.notes],
      ];

      const csv = [
        fields.map(([label]) => escapeCsv(label)).join(","),
        ...uniqueRows.map((row) =>
          fields
            .map(([, getter]) => escapeCsv(getter(row)))
            .join(","),
        ),
      ].join("\r\n");

      await saveCsvFile("purchase-rfqs-export.csv", csv);

      toast.success(
        `Exported ${uniqueRows.length} RFQs.`,
        { id: toastId },
      );
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

  /* -------------------------------------------------------------- */
  /* Table configuration                                             */
  /* -------------------------------------------------------------- */

  const columns = useMemo(
    () => [
      {
        key: "rfqNumber",
        label: "RFQ Number",
        sortable: true,
        render: (value, row) => (
          <div className="rfqu-document-cell">
            <button
              type="button"
              className="rfqu-document-link"
              onClick={(event) => {
                event.stopPropagation();
                handleView(row);
              }}
            >
              {value || "—"}
            </button>

            <span>
              {row.sourceRequisitionNumber || "Direct RFQ"}
            </span>
          </div>
        ),
      },
      {
        key: "rfqDate",
        label: "RFQ Date",
        sortable: true,
        render: formatDate,
      },
      {
        key: "quotationDueDate",
        label: "Quotation Due",
        sortable: true,
        render: formatDate,
      },
      {
        key: "creationMode",
        label: "Source",
        sortable: true,
        render: (value) => (
          <span className="rfqu-source-badge">
            {value === "REQUISITION"
              ? "Purchase Requisition"
              : "Direct"}
          </span>
        ),
      },
      {
        key: "supplierIds",
        label: "Suppliers",
        sortable: false,
        render: (value) => value?.length || 0,
      },
      {
        key: "items",
        label: "Item Lines",
        sortable: false,
        render: (value) => value?.length || 0,
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (value) => (
          <StatusField value={value || "CREATED"} />
        ),
      },
      ...[
        ["createdBy", "Created By"],
        ["approvedBy", "Approved By"],
        ["rejectedBy", "Rejected By"],
        ["issuedBy", "Issued By"],
        ["closedBy", "Closed By"],
        ["cancelledBy", "Cancelled By"],
      ].map(([key, label]) => ({
        key,
        label,
        sortable: false,
        visible: false,
        render: (value) => getUserName(value) || "—",
      })),
      {
        key: "sourceRequisitionNumber",
        label: "Requisition",
        sortable: true,
        visible: false,
        render: (value) => value || "—",
      },
      {
        key: "paymentTerms",
        label: "Payment Terms",
        sortable: true,
        visible: false,
        render: (value) => value || "—",
      },
      ...[
        ["deliveryTerms", "Delivery Terms"],
        ["rejectionReason", "Rejection Reason"],
        ["cancellationReason", "Cancellation Reason"],
        ["notes", "Notes"],
      ].map(([key, label]) => ({
        key,
        label,
        sortable: false,
        visible: false,
        render: (value) => value || "—",
      })),
      {
        key: "createdAt",
        label: "Created On",
        sortable: true,
        visible: false,
        render: formatDate,
      },
    ],
    [handleView],
  );

  const tableFilters = useMemo(
    () => [
      {
        key: "status",
        label: "Status",
        type: "select",
        options: STATUSES,
      },
      {
        key: "creationMode",
        label: "Source",
        type: "select",
        options: ["DIRECT", "REQUISITION"],
      },
    ],
    [],
  );

  const quickFilters = useMemo(
    () => [
      {
        key: "status",
        value: "",
        label: "All",
        ...(statsReady ? { count: stats.all } : {}),
      },
      ...STATUSES.map((status) => ({
        key: "status",
        value: status,
        label:
          status.charAt(0) +
          status.slice(1).toLowerCase(),
        ...(statsReady
          ? { count: stats[status] }
          : {}),
      })),
    ],
    [stats, statsReady],
  );

  const config = ACTION_CONFIG[confirm.type];
  const targetCount = confirm.targets.length;

  return (
    <div className="rfqu-list-page">
      {exporting && (
        <p className="rfqu-list-notice" role="status">
          Exporting matching RFQs. You can continue viewing the list.
        </p>
      )}

      <DataList
        title="Requests for Quotation"
        subtitle="Request supplier offers directly or against approved requisitions"
        columns={columns}
        data={rfqs}
        loading={loading}
        rowKey="_id"
        showCase="list"
        searchable
        filterable
        sortable
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
        filters={tableFilters}
        quickFilters={quickFilters}
        storageKey="trustiq-purchase-rfqs"
        searchPlaceholder="Search RFQ or requisition number..."
        actions={{
          view: handleView,
          edit: handleEdit,
          delete: (row) => openAction(row, "delete"),
          approve: (row) => openAction(row, "approve"),
          reject: (row) => openAction(row, "reject"),
        }}
        bulkActions={[
          {
            key: "approve",
            label: "Approve",
            action: (rows) => openAction(rows, "approve"),
          },
          {
            key: "reject",
            label: "Reject",
            danger: true,
            action: (rows) => openAction(rows, "reject"),
          },
          {
            key: "delete",
            label: "Delete",
            danger: true,
            action: (rows) => openAction(rows, "delete"),
          },
        ]}
        onRefresh={refreshAll}
        onExport={handleExport}
        addButton={
          <button
            type="button"
            className="rfqu-primary-button"
            onClick={() => navigate(`${RFQ_BASE}/create`)}
          >
            <Plus size={16} />
            <span>New RFQ</span>
          </button>
        }
      />

      <ConfirmModal
        open={confirm.open}
        type={config?.modalType || "warning"}
        title={
          targetCount > 1
            ? `${config?.pluralTitle || "Confirm"}?`
            : `${config?.title || "Confirm"}?`
        }
        message={
          targetCount === 1
            ? `${config?.confirmText || "Update"} ${
                confirm.targets[0]?.rfqNumber || "this RFQ"
              }?`
            : `${config?.confirmText || "Update"} ${targetCount} selected RFQs?`
        }
        confirmText={
          actionFailures.length
            ? `Retry ${targetCount} Failed`
            : `${config?.confirmText || "Confirm"}${
                targetCount > 1 ? ` ${targetCount} RFQs` : " RFQ"
              }`
        }
        cancelText="Back"
        loading={actionLoading}
        loadingText={`Processing ${progress.done}/${progress.total}...`}
        onCancel={closeConfirm}
        onConfirm={confirmAction}
      >
        <div className="rfqu-confirm-content">
          <p className="rfqu-confirm-note">
            Only CREATED RFQs are eligible. Each RFQ is
            checked again before the action is submitted.
          </p>

          {confirm.skipped > 0 && (
            <p className="rfqu-confirm-note">
              {confirm.skipped} selected RFQ
              {confirm.skipped === 1 ? "" : "s"} will be
              skipped because they are not CREATED.
            </p>
          )}

          {confirm.type === "reject" && (
            <label className="rfqu-reason-field">
              <span>Rejection reason</span>

              <textarea
                className="rfqu-rejection-reason"
                rows={4}
                maxLength={1000}
                placeholder="Enter the reason for rejection..."
                value={actionReason}
                disabled={actionLoading}
                onChange={(event) =>
                  setActionReason(event.target.value)
                }
                required
              />

              <small>
                The same reason applies to every RFQ in
                this action.
              </small>
            </label>
          )}

          {actionLoading && (
            <p role="status">
              Processed {progress.done} of {progress.total}.
            </p>
          )}

          {actionFailures.length > 0 && (
            <div
              className="rfqu-action-errors"
              role="alert"
            >
              <strong>Some RFQs could not be processed</strong>

              <ul>
                {actionFailures.map((failure) => (
                  <li key={failure.target.rfqNumber}>
                    <span>{failure.target.rfqNumber}</span>
                    {": "}
                    {failure.message}
                  </li>
                ))}
              </ul>

              <p>
                Successful records will not be submitted
                again. If a request timed out, verify that
                RFQ before retrying.
              </p>
            </div>
          )}
        </div>
      </ConfirmModal>
    </div>
  );
}

export default PurchaseRfqsList;