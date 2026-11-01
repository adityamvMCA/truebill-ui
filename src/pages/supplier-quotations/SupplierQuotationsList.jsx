// import { Plus } from "lucide-react";

// import {
//   useCallback,
//   useEffect,
//   useMemo,
//   useRef,
//   useState,
// } from "react";

// import { useNavigate } from "react-router-dom";
// import toast from "react-hot-toast";

// import DataList from "../../components/common/DataList/DataList";
// import StatusField from "../../components/common/StatusField/StatusField";
// import ConfirmModal from "../../components/common/ConfirmModal/ConfirmModal";

// import api from "../../services/api";

// import {
//   SUPPLIER_QUOTATION_BASE,
//   fetchAllPages,
//   formatDate,
//   formatPaise,
//   getDocument,
//   getErrorMessage,
//   getId,
//   supplierQuotationPath,
// } from "./supplierQuotation.utils";

// import "./SupplierQuotations.css";

// function SupplierQuotationsList() {
//   const navigate = useNavigate();

//   const [loading, setLoading] = useState(true);
//   const [quotations, setQuotations] = useState([]);
//   const [suppliers, setSuppliers] = useState([]);

//   const [deleteTarget, setDeleteTarget] = useState(null);
//   const [deleting, setDeleting] = useState(false);

//   const loadSequence = useRef(0);
//   const deleteLock = useRef(false);
//   const mountedRef = useRef(false);

//   const loadQuotations = useCallback(async () => {
//     const sequence = ++loadSequence.current;

//     try {
//       setLoading(true);

//       const [records, supplierRecords] = await Promise.all([
//         fetchAllPages(
//           api.supplierQuotation.getAll,
//           "quotations",
//         ),

//         fetchAllPages(
//           api.supplierQuotation.getSuppliers,
//           "suppliers",
//         ),
//       ]);

//       if (sequence !== loadSequence.current) return;

//       setQuotations(records);
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
//     mountedRef.current = true;
//     loadQuotations();

//     return () => {
//       mountedRef.current = false;
//       loadSequence.current += 1;
//     };
//   }, [loadQuotations]);

//   const supplierMap = useMemo(
//     () =>
//       new Map(
//         suppliers.map((supplier) => [
//           getId(supplier),
//           supplier,
//         ]),
//       ),
//     [suppliers],
//   );

//   const rows = useMemo(
//     () =>
//       quotations.map((quotation) => {
//         const supplier = supplierMap.get(
//           getId(quotation.supplierId),
//         );

//         return {
//           ...quotation,

//           supplierName:
//             quotation.supplierName ||
//             supplier?.supplierName ||
//             "Supplier unavailable",

//           supplierCode:
//             quotation.supplierCode ||
//             supplier?.supplierCode ||
//             "—",
//         };
//       }),
//     [quotations, supplierMap],
//   );

//   const handleView = useCallback(
//     (row) => {
//       if (!row.quotationNumber) {
//         toast.error("Quotation number is missing.");
//         return;
//       }

//       navigate(
//         supplierQuotationPath(row.quotationNumber),
//       );
//     },
//     [navigate],
//   );

//   const handleEdit = (row) => {
//     if (row.status !== "CREATED") {
//       toast.error("Only CREATED quotations can be edited.");
//       return;
//     }

//     navigate(
//       supplierQuotationPath(
//         row.quotationNumber,
//         "edit",
//       ),
//     );
//   };

//   const handleDelete = async (row) => {
//     if (deleteLock.current) return;

//     if (row.status !== "CREATED") {
//       toast.error("Only CREATED quotations can be deleted.");
//       return;
//     }

//     try {
//       deleteLock.current = true;

//       const response =
//         await api.supplierQuotation.getByNumber(
//           row.quotationNumber,
//         );

//       const latest = getDocument(response);

//       if (
//         !latest?._id ||
//         latest.status !== "CREATED" ||
//         !Number.isSafeInteger(latest.__v)
//       ) {
//         throw new Error(
//           "The quotation changed. Refresh the list.",
//         );
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

//       await api.supplierQuotation.delete(
//         deleteTarget.quotationNumber,
//         {
//           version: deleteTarget.__v,
//         },
//       );

//       if (!mountedRef.current) return;

//       setQuotations((previous) =>
//         previous.filter(
//           (quotation) =>
//             quotation._id !== deleteTarget._id,
//         ),
//       );

//       setDeleteTarget(null);

//       toast.success(
//         "Supplier Quotation deleted successfully.",
//       );
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

//   const columns = useMemo(
//     () => [
//       {
//         key: "quotationNumber",
//         label: "Quotation Number",
//         sortable: true,

//         render: (value, row) => (
//           <div className="squ-document-cell">
//             <button
//               type="button"
//               className="squ-document-link"
//               onClick={(event) => {
//                 event.stopPropagation();
//                 handleView(row);
//               }}
//             >
//               {value || "—"}
//             </button>

//             <span>
//               {row.supplierReferenceNumber ||
//                 "No supplier reference"}
//             </span>
//           </div>
//         ),
//       },

//       {
//         key: "supplierName",
//         label: "Supplier",
//         sortable: true,

//         render: (value, row) => (
//           <div className="squ-document-cell">
//             <strong>{value}</strong>
//             <span>{row.supplierCode}</span>
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
//         key: "creationMode",
//         label: "Source",
//         sortable: true,

//         render: (value, row) => (
//           <div className="squ-document-cell">
//             <span className="squ-source-badge">
//               {value === "RFQ" ? "RFQ" : "Direct"}
//             </span>

//             {row.sourceRfqNumber && (
//               <span>{row.sourceRfqNumber}</span>
//             )}
//           </div>
//         ),
//       },

//       {
//         key: "totalAmountPaise",
//         label: "Quoted Amount",
//         type: "number",
//         sortable: true,

//         render: (value) => (
//           <strong className="squ-money">
//             {formatPaise(value)}
//           </strong>
//         ),
//       },

//       {
//         key: "status",
//         label: "Status",
//         sortable: true,

//         render: (value) => (
//           <StatusField value={value || "CREATED"} />
//         ),
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
//         sortable: true,
//         visible: false,
//       },

//       {
//         key: "notes",
//         label: "Notes",
//         visible: false,
//         render: (value) => value || "—",
//       },
//     ],
//     [handleView],
//   );

//   return (
//     <div className="squ-list-page">
//       <DataList
//         title="Supplier Quotations"
//         subtitle="Record supplier offers and prepare them for comparison"
//         columns={columns}
//         data={rows}
//         loading={loading}
//         rowKey="_id"
//         showCase="list"
//         searchable
//         sortable
//         filterable
//         selectable
//         columnVisibility
//         pagination
//         storageKey="trustiq-supplier-quotations"
//         searchPlaceholder="Search quotation, supplier, reference, RFQ..."
//         filters={[
//           {
//             key: "status",
//             label: "Status",
//             type: "select",
//             options: ["CREATED", "CANCELLED"],
//           },
//           {
//             key: "creationMode",
//             label: "Source",
//             type: "select",
//             options: ["DIRECT", "RFQ"],
//           },
//         ]}
//         quickFilters={[
//           { key: "status", value: "", label: "All" },
//           {
//             key: "status",
//             value: "CREATED",
//             label: "Created",
//           },
//           {
//             key: "creationMode",
//             value: "RFQ",
//             label: "RFQ Offers",
//           },
//           {
//             key: "creationMode",
//             value: "DIRECT",
//             label: "Direct",
//           },
//           {
//             key: "status",
//             value: "CANCELLED",
//             label: "Cancelled",
//           },
//         ]}
//         actions={{
//           view: handleView,
//           edit: handleEdit,
//           delete: handleDelete,
//         }}
//         onRefresh={loadQuotations}
//         addButton={
//           <button
//             type="button"
//             className="squ-primary-button"
//             onClick={() =>
//               navigate(
//                 `${SUPPLIER_QUOTATION_BASE}/create`,
//               )
//             }
//           >
//             <Plus size={16} />
//             <span>New Supplier Quotation</span>
//           </button>
//         }
//       />

//       <ConfirmModal
//         open={Boolean(deleteTarget)}
//         type="danger"
//         title="Delete Supplier Quotation?"
//         message={`Delete ${
//           deleteTarget?.quotationNumber || "this quotation"
//         }?`}
//         confirmText="Delete Quotation"
//         cancelText="Keep Quotation"
//         loading={deleting}
//         onCancel={() => {
//           if (!deleteLock.current) {
//             setDeleteTarget(null);
//           }
//         }}
//         onConfirm={confirmDelete}
//       />
//     </div>
//   );
// }

// export default SupplierQuotationsList;

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
  SUPPLIER_QUOTATION_BASE,
  formatDate,
  formatPaise,
  getDocument,
  getErrorMessage,
  getId,
  supplierQuotationPath,
} from "./supplierQuotation.utils";

import "./SupplierQuotations.css";

const PAGE_SIZES = [20, 50, 100];
const SEARCH_DELAY = 400;
const EXPORT_LIMIT = 100;
const DELETE_CONCURRENCY = 3;

const EMPTY_CONFIRM = {
  open: false,
  targets: [],
  skipped: 0,
};

const SORT_FIELDS = new Set([
  "quotationNumber",
  "quotationDate",
  "validUntil",
  "creationMode",
  "totalAmountPaise",
  "status",
  "paymentTerms",
  "deliveryTerms",
  "createdAt",
]);

const normalizeId = (value) => {
  if (!value) return "";

  const id = getId(value);

  return id ? String(id) : "";
};

const readList = (response, key) => {
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

const readQuotationPage = (response) => {
  const result = readList(response, "quotations");
  const rawTotal = result.pagination?.total;

  if (
    rawTotal === undefined ||
    rawTotal === null ||
    !Number.isFinite(Number(rawTotal)) ||
    Number(rawTotal) < 0
  ) {
    throw new Error(
      "The quotation endpoint must return pagination.total for server-side pagination.",
    );
  }

  return {
    ...result,
    total: Number(rawTotal),
  };
};

const enrichQuotations = (quotations, supplierMap) =>
  quotations.map((quotation) => {
    const populatedSupplier =
      quotation.supplierId &&
      typeof quotation.supplierId === "object"
        ? quotation.supplierId
        : null;

    const supplier =
      supplierMap[normalizeId(quotation.supplierId)] ||
      populatedSupplier;

    return {
      ...quotation,
      supplierName:
        quotation.supplierName ||
        supplier?.supplierName ||
        "Supplier unavailable",
      supplierCode:
        quotation.supplierCode ||
        supplier?.supplierCode ||
        "—",
    };
  });

async function hydrateQuotationSuppliers(quotations) {
  const missingIds = [
    ...new Set(
      quotations
        .filter(
          (quotation) =>
            !quotation.supplierName &&
            !(
              quotation.supplierId &&
              typeof quotation.supplierId === "object" &&
              quotation.supplierId.supplierName
            ),
        )
        .map((quotation) =>
          normalizeId(quotation.supplierId),
        )
        .filter(Boolean),
    ),
  ];

  if (!missingIds.length) {
    return enrichQuotations(quotations, {});
  }

  // Current pages and export batches contain at most 100 records.
  const response =
    await api.supplierQuotation.getSuppliers({
      ids: missingIds.join(","),
      page: 1,
      limit: 100,
    });

  const { data } = readList(response, "suppliers");
  const requestedIds = new Set(missingIds);
  const supplierMap = {};

  for (const supplier of data) {
    const id = normalizeId(supplier);

    // Ignore unrelated records if the backend ignores ids.
    if (requestedIds.has(id)) {
      supplierMap[id] = supplier;
    }
  }

  return enrichQuotations(quotations, supplierMap);
}

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

function SupplierQuotationsList() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [quotations, setQuotations] = useState([]);
  const [total, setTotal] = useState(0);
  const [loadError, setLoadError] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});

  const [sort, setSort] = useState({
    key: "quotationDate",
    direction: "desc",
  });

  const [confirm, setConfirm] = useState(EMPTY_CONFIRM);
  const [deleting, setDeleting] = useState(false);
  const [failures, setFailures] = useState([]);
  const [progress, setProgress] = useState({
    done: 0,
    total: 0,
  });

  const [exporting, setExporting] = useState(false);

  const mountedRef = useRef(false);
  const sequenceRef = useRef(0);
  const deleteLock = useRef(false);
  const exportLock = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      sequenceRef.current += 1;
    };
  }, []);

  /* -------------------------------------------------------------- */
  /* Search and query state                                          */
  /* -------------------------------------------------------------- */

  useEffect(() => {
    const nextSearch = searchInput.trim();

    if (nextSearch === search) return undefined;

    const timer = window.setTimeout(() => {
      setSearch(nextSearch);
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
      ...(filters.creationMode
        ? { creationMode: filters.creationMode }
        : {}),
      sortBy: sort.key,
      sortOrder: sort.direction,
    }),
    [search, filters, sort],
  );

  /* -------------------------------------------------------------- */
  /* Page loading                                                    */
  /* -------------------------------------------------------------- */

  const loadQuotations = useCallback(async () => {
    if (!mountedRef.current) return;

    const sequence = ++sequenceRef.current;

    const current = () =>
      mountedRef.current &&
      sequence === sequenceRef.current;

    setLoading(true);
    setLoadError("");

    try {
      const response =
        await api.supplierQuotation.getAll(
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

      // Display quotation snapshots immediately.
      setQuotations(
        enrichQuotations(result.data, {}),
      );
      setTotal(result.total);

      try {
        const hydrated =
          await hydrateQuotationSuppliers(result.data);

        if (current()) {
          setQuotations(hydrated);
        }
      } catch (supplierError) {
        // A supplier lookup failure must not hide quotations.
        console.warn(
          "Unable to load supplier names:",
          supplierError,
        );
      }
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
      sequenceRef.current += 1;
    };
  }, [loadQuotations]);

  const handleSearch = useCallback((value) => {
    setSearchInput(String(value ?? ""));
  }, []);

  const handleSort = useCallback((next) => {
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

  const handleFilterChange = useCallback((next) => {
    setFilters({
      status: next?.status || "",
      creationMode: next?.creationMode || "",
    });

    setPage(1);
  }, []);

  const handlePageChange = useCallback((next) => {
    setPage(Math.max(1, Number(next) || 1));
  }, []);

  const handlePageSizeChange = useCallback((next) => {
    const size = Number(next);

    if (!PAGE_SIZES.includes(size)) return;

    setPageSize(size);
    setPage(1);
  }, []);

  /* -------------------------------------------------------------- */
  /* View and edit                                                   */
  /* -------------------------------------------------------------- */

  const handleView = useCallback(
    (row) => {
      if (!row?.quotationNumber) {
        toast.error("Quotation number is missing.");
        return;
      }

      navigate(
        supplierQuotationPath(row.quotationNumber),
      );
    },
    [navigate],
  );

  const handleEdit = useCallback(
    (row) => {
      if (!row?.quotationNumber) {
        toast.error("Quotation number is missing.");
        return;
      }

      if (row.status !== "CREATED") {
        toast.error(
          "Only CREATED quotations can be edited.",
        );
        return;
      }

      navigate(
        supplierQuotationPath(
          row.quotationNumber,
          "edit",
        ),
      );
    },
    [navigate],
  );

  /* -------------------------------------------------------------- */
  /* Single and bulk deletion                                        */
  /* -------------------------------------------------------------- */

  const openDelete = (input) => {
    if (deleteLock.current || confirm.open) return;

    const rows = Array.isArray(input)
      ? input
      : [input];

    const unique = Array.from(
      new Map(
        rows
          .filter((row) => row?.quotationNumber)
          .map((row) => [
            row.quotationNumber,
            row,
          ]),
      ).values(),
    );

    if (!unique.length) {
      toast.error("Select at least one quotation.");
      return;
    }

    const eligible = unique.filter(
      (row) => row.status === "CREATED",
    );

    if (!eligible.length) {
      toast.error(
        "Only CREATED quotations can be deleted.",
      );
      return;
    }

    setConfirm({
      open: true,
      targets: eligible,
      skipped: unique.length - eligible.length,
    });

    setFailures([]);
    setProgress({
      done: 0,
      total: eligible.length,
    });
  };

  const closeDelete = () => {
    if (deleteLock.current) return;

    setConfirm(EMPTY_CONFIRM);
    setFailures([]);
    setProgress({ done: 0, total: 0 });
  };

  const confirmDelete = async () => {
    if (
      deleteLock.current ||
      !confirm.targets.length
    ) {
      return;
    }

    const targets = [...confirm.targets];

    deleteLock.current = true;
    setDeleting(true);
    setFailures([]);
    setProgress({
      done: 0,
      total: targets.length,
    });

    let completed = 0;

    try {
      const results = await runLimited(
        targets,
        DELETE_CONCURRENCY,
        async (target) => {
          try {
            if (!mountedRef.current) {
              throw new Error("The page was closed.");
            }

            const response =
              await api.supplierQuotation.getByNumber(
                target.quotationNumber,
              );

            const latest = getDocument(response);

            if (
              !latest?._id ||
              latest.quotationNumber !==
                target.quotationNumber ||
              !Number.isSafeInteger(latest.__v)
            ) {
              throw new Error(
                "Unable to load the latest quotation version.",
              );
            }

            if (latest.status !== "CREATED") {
              throw new Error(
                `Quotation is now ${latest.status}. Only CREATED quotations can be deleted.`,
              );
            }

            if (!mountedRef.current) {
              throw new Error("The page was closed.");
            }

            const deleted =
              await api.supplierQuotation.delete(
                latest.quotationNumber,
                {
                  version: latest.__v,
                },
              );

            if (deleted?.data?.success === false) {
              throw new Error(
                deleted.data.message ||
                  "Deletion was not successful.",
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

      const deletedCount =
        targets.length - failed.length;

      if (deletedCount) {
        toast.success(
          `${deletedCount} quotation${
            deletedCount === 1 ? "" : "s"
          } deleted successfully.`,
        );
      }

      if (failed.length) {
        setFailures(failed);

        setConfirm({
          open: true,
          targets: failed.map(
            (failure) => failure.target,
          ),
          skipped: 0,
        });

        toast.error(
          `${failed.length} deletion${
            failed.length === 1 ? "" : "s"
          } failed. Review the details.`,
        );
      } else {
        setConfirm(EMPTY_CONFIRM);
      }

      await loadQuotations();
    } catch (error) {
      if (mountedRef.current) {
        toast.error(getErrorMessage(error));
      }
    } finally {
      deleteLock.current = false;

      if (mountedRef.current) {
        setDeleting(false);
      }
    }
  };

  /* -------------------------------------------------------------- */
  /* Export matching quotations                                      */
  /* -------------------------------------------------------------- */

  const handleExport = useCallback(async () => {
    if (exportLock.current) return;

    exportLock.current = true;
    setExporting(true);

    const toastId = toast.loading(
      "Preparing quotation export...",
    );

    try {
      const firstResponse =
        await api.supplierQuotation.getAll(
          buildParams({
            page: 1,
            limit: EXPORT_LIMIT,
          }),
        );

      const first = readQuotationPage(firstResponse);

      const actualLimit = Math.max(
        1,
        Number(first.pagination?.limit) ||
          EXPORT_LIMIT,
      );

      const totalPages = Math.max(
        1,
        Math.ceil(first.total / actualLimit),
      );

      const exportedRows = [];
      const supplierCache = {};

      const addBatch = async (records) => {
        const ids = [
          ...new Set(
            records
              .filter(
                (row) =>
                  !row.supplierName &&
                  !(
                    row.supplierId &&
                    typeof row.supplierId === "object" &&
                    row.supplierId.supplierName
                  ),
              )
              .map((row) =>
                normalizeId(row.supplierId),
              )
              .filter(
                (id) => id && !supplierCache[id],
              ),
          ),
        ];

        if (ids.length) {
          const response =
            await api.supplierQuotation.getSuppliers({
              ids: ids.join(","),
              page: 1,
              limit: 100,
            });

          const { data } = readList(
            response,
            "suppliers",
          );

          const requested = new Set(ids);

          for (const supplier of data) {
            const id = normalizeId(supplier);

            if (requested.has(id)) {
              supplierCache[id] = supplier;
            }
          }
        }

        exportedRows.push(
          ...enrichQuotations(
            records,
            supplierCache,
          ),
        );
      };

      await addBatch(first.data);

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
          await api.supplierQuotation.getAll(
            buildParams({
              page: currentPage,
              limit: actualLimit,
            }),
          );

        const result = readQuotationPage(response);

        await addBatch(result.data);

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
          exportedRows.map((row) => [
            row._id || row.quotationNumber,
            row,
          ]),
        ).values(),
      );

      const fields = [
        ["Quotation Number", (row) => row.quotationNumber],
        ["Supplier", (row) => row.supplierName],
        ["Supplier Code", (row) => row.supplierCode],
        [
          "Supplier Reference",
          (row) => row.supplierReferenceNumber,
        ],
        [
          "Quotation Date",
          (row) => csvDate(row.quotationDate),
        ],
        ["Valid Until", (row) => csvDate(row.validUntil)],
        ["Source", (row) => row.creationMode],
        ["Source RFQ", (row) => row.sourceRfqNumber],
        [
          "Quoted Amount (Paise)",
          (row) => row.totalAmountPaise,
        ],
        ["Status", (row) => row.status],
        ["Payment Terms", (row) => row.paymentTerms],
        ["Delivery Terms", (row) => row.deliveryTerms],
        ["Notes", (row) => row.notes],
      ];

      const csv = [
        fields
          .map(([name]) => csvCell(name))
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
        "supplier-quotations-export.csv",
        csv,
      );

      toast.success(
        `Exported ${uniqueRows.length} quotations.`,
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
  /* Columns and filters                                             */
  /* -------------------------------------------------------------- */

  const columns = useMemo(
    () => [
      {
        key: "quotationNumber",
        label: "Quotation Number",
        sortable: true,
        render: (value, row) => (
          <div className="squ-document-cell">
            <button
              type="button"
              className="squ-document-link"
              onClick={(event) => {
                event.stopPropagation();
                handleView(row);
              }}
            >
              {value || "—"}
            </button>

            <span>
              {row.supplierReferenceNumber ||
                "No supplier reference"}
            </span>
          </div>
        ),
      },
      {
        key: "supplierName",
        label: "Supplier",

        // Names are hydrated after the quotation query.
        // Enable only when the backend can sort by supplier name.
        sortable: false,

        render: (value, row) => (
          <div className="squ-document-cell">
            <strong>{value}</strong>
            <span>{row.supplierCode}</span>
          </div>
        ),
      },
      {
        key: "quotationDate",
        label: "Quotation Date",
        sortable: true,
        render: formatDate,
      },
      {
        key: "validUntil",
        label: "Valid Until",
        sortable: true,
        render: formatDate,
      },
      {
        key: "creationMode",
        label: "Source",
        sortable: true,
        render: (value, row) => (
          <div className="squ-document-cell">
            <span className="squ-source-badge">
              {value === "RFQ" ? "RFQ" : "Direct"}
            </span>

            {row.sourceRfqNumber && (
              <span>{row.sourceRfqNumber}</span>
            )}
          </div>
        ),
      },
      {
        key: "totalAmountPaise",
        label: "Quoted Amount",
        type: "number",
        sortable: true,
        render: (value) => (
          <strong className="squ-money">
            {formatPaise(value)}
          </strong>
        ),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (value) => (
          <StatusField
            value={value || "CREATED"}
          />
        ),
      },
      {
        key: "paymentTerms",
        label: "Payment Terms",
        sortable: true,
        visible: false,
      },
      {
        key: "deliveryTerms",
        label: "Delivery Terms",
        sortable: true,
        visible: false,
      },
      {
        key: "notes",
        label: "Notes",
        visible: false,
        render: (value) => value || "—",
      },
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
        options: ["CREATED", "CANCELLED"],
      },
      {
        key: "creationMode",
        label: "Source",
        type: "select",
        options: ["DIRECT", "RFQ"],
      },
    ],
    [],
  );

  const quickFilters = useMemo(
    () => [
      { key: "status", value: "", label: "All" },
      {
        key: "status",
        value: "CREATED",
        label: "Created",
      },
      {
        key: "creationMode",
        value: "RFQ",
        label: "RFQ Offers",
      },
      {
        key: "creationMode",
        value: "DIRECT",
        label: "Direct",
      },
      {
        key: "status",
        value: "CANCELLED",
        label: "Cancelled",
      },
    ],
    [],
  );

  const targetCount = confirm.targets.length;

  return (
    <div className="squ-list-page">
      {loadError && (
        <div
          className="squ-list-alert"
          role="alert"
        >
          {loadError}
        </div>
      )}

      {exporting && (
        <p
          className="squ-list-notice"
          role="status"
        >
          Exporting matching quotations...
        </p>
      )}

      <DataList
        title="Supplier Quotations"
        subtitle="Record supplier offers and prepare them for comparison"
        columns={columns}
        data={quotations}
        loading={loading}
        rowKey="_id"
        showCase="list"
        searchable
        sortable
        filterable
        selectable
        columnVisibility
        pagination
        serverMode
        total={total}
        page={page}
        pageSize={pageSize}
        pageSizeOptions={PAGE_SIZES}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onSearch={handleSearch}
        onSort={handleSort}
        onFilterChange={handleFilterChange}
        storageKey="trustiq-supplier-quotations"
        searchPlaceholder="Search quotation, reference, RFQ..."
        filters={tableFilters}
        quickFilters={quickFilters}
        actions={{
          view: handleView,
          edit: handleEdit,
          delete: openDelete,
        }}
        bulkActions={[
          {
            key: "delete",
            label: "Delete",
            danger: true,
            action: openDelete,
          },
        ]}
        onRefresh={loadQuotations}
        onExport={handleExport}
        addButton={
          <button
            type="button"
            className="squ-primary-button"
            onClick={() =>
              navigate(
                `${SUPPLIER_QUOTATION_BASE}/create`,
              )
            }
          >
            <Plus size={16} />
            <span>New Supplier Quotation</span>
          </button>
        }
      />

      <ConfirmModal
        open={confirm.open}
        type="danger"
        title={
          targetCount > 1
            ? "Delete selected quotations?"
            : "Delete Supplier Quotation?"
        }
        message={
          targetCount === 1
            ? `Delete ${
                confirm.targets[0]?.quotationNumber ||
                "this quotation"
              }?`
            : `Delete ${targetCount} selected quotations?`
        }
        confirmText={
          failures.length
            ? `Retry ${targetCount} Failed`
            : targetCount > 1
              ? `Delete ${targetCount} Quotations`
              : "Delete Quotation"
        }
        cancelText="Keep Quotations"
        loading={deleting}
        loadingText={`Deleting ${progress.done}/${progress.total}...`}
        onCancel={closeDelete}
        onConfirm={confirmDelete}
      >
        <div className="squ-confirm-content">
          <p>
            Only CREATED quotations can be deleted.
            Each quotation is checked again before
            deletion.
          </p>

          {confirm.skipped > 0 && (
            <p>
              {confirm.skipped} selected quotation
              {confirm.skipped === 1 ? "" : "s"} will
              be skipped because they are not CREATED.
            </p>
          )}

          {deleting && (
            <p role="status">
              Processed {progress.done} of{" "}
              {progress.total}.
            </p>
          )}

          {failures.length > 0 && (
            <div
              className="squ-delete-errors"
              role="alert"
            >
              <strong>Some deletions failed</strong>

              <ul>
                {failures.map((failure) => (
                  <li
                    key={
                      failure.target.quotationNumber
                    }
                  >
                    {failure.target.quotationNumber}
                    {": "}
                    {failure.message}
                  </li>
                ))}
              </ul>

              <p>
                Successful deletions will not be
                submitted again. Verify timed-out
                requests before retrying.
              </p>
            </div>
          )}
        </div>
      </ConfirmModal>
    </div>
  );
}

export default SupplierQuotationsList;