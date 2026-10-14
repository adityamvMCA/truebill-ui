// import {
//   useEffect,
//   useMemo,
//   useRef,
//   useState,
// } from "react";

// import { createPortal } from "react-dom";

// import {
//   Search,
//   Filter,
//   Download,
//   Upload,
//   RefreshCw,
//   ChevronDown,
//   ChevronLeft,
//   ChevronRight,
//   MoreHorizontal,
//   Eye,
//   Edit,
//   Trash2,
//   Copy,
//   Printer,
//   Columns3,
//   ArrowUp,
//   ArrowDown,
//   ArrowUpDown,
//   X,
// } from "lucide-react";

// import "./data-list.css";

// const DEFAULT_PAGE_SIZE = 10;

// const normalize = (value) =>
//   String(value ?? "")
//     .toLowerCase()
//     .trim();

// const formatCurrency = (value) => {
//   if (
//     value === null ||
//     value === undefined ||
//     value === ""
//   ) {
//     return "-";
//   }

//   return `₹${Number(value).toLocaleString(
//     "en-IN"
//   )}`;
// };

// const formatDate = (value) => {
//   if (!value) {
//     return "-";
//   }

//   const date = new Date(`${value}T00:00:00`);

//   if (Number.isNaN(date.getTime())) {
//     return value;
//   }

//   return date.toLocaleDateString("en-IN", {
//     day: "2-digit",
//     month: "short",
//     year: "numeric",
//   });
// };

// const escapeCsvValue = (value) => {
//   const text = String(value ?? "");

//   return `"${text.replace(/"/g, '""')}"`;
// };

// function StatusBadge({ value }) {
//   const normalized = normalize(value).replace(
//     /\s+/g,
//     "-"
//   );

//   return (
//     <span
//       className={`dl-status dl-status-${normalized}`}
//     >
//       <span className="dl-status-dot" />

//       {value || "-"}
//     </span>
//   );
// }

// function formatValue(value, column, row) {
//   if (column?.render) {
//     return column.render(value, row);
//   }

//   if (
//     value === null ||
//     value === undefined ||
//     value === ""
//   ) {
//     return "-";
//   }

//   switch (column?.type) {
//     case "currency":
//       return formatCurrency(value);

//     case "date":
//       return formatDate(value);

//     case "number":
//       return Number(value).toLocaleString(
//         "en-IN"
//       );

//     case "boolean":
//       return value ? "Yes" : "No";

//     case "status":
//       return <StatusBadge value={value} />;

//     default:
//       return String(value);
//   }
// }

// function SortIcon({ direction }) {
//   if (direction === "asc") {
//     return <ArrowUp size={13} />;
//   }

//   if (direction === "desc") {
//     return <ArrowDown size={13} />;
//   }

//   return <ArrowUpDown size={13} />;
// }

// function ActionMenu({
//   row,
//   actions,
//   anchor,
//   onClose,
// }) {
//   const menuRef = useRef(null);

//   const menuActions = [];

//   if (actions.view) {
//     menuActions.push({
//       key: "view",
//       label: "View",
//       icon: <Eye size={15} />,
//       action: actions.view,
//     });
//   }

//   if (actions.edit) {
//     menuActions.push({
//       key: "edit",
//       label: "Edit",
//       icon: <Edit size={15} />,
//       action: actions.edit,
//     });
//   }

//   if (actions.duplicate) {
//     menuActions.push({
//       key: "duplicate",
//       label: "Duplicate",
//       icon: <Copy size={15} />,
//       action: actions.duplicate,
//     });
//   }

//   if (actions.print) {
//     menuActions.push({
//       key: "print",
//       label: "Print",
//       icon: <Printer size={15} />,
//       action: actions.print,
//     });
//   }

//   if (actions.delete) {
//     menuActions.push({
//       key: "delete",
//       label: "Delete",
//       icon: <Trash2 size={15} />,
//       action: actions.delete,
//       danger: true,
//     });
//   }

//   useEffect(() => {
//     const handleOutside = (event) => {
//       if (
//         menuRef.current &&
//         !menuRef.current.contains(event.target)
//       ) {
//         onClose();
//       }
//     };

//     const handleEscape = (event) => {
//       if (event.key === "Escape") {
//         onClose();
//       }
//     };

//     document.addEventListener(
//       "mousedown",
//       handleOutside
//     );

//     document.addEventListener(
//       "keydown",
//       handleEscape
//     );

//     return () => {
//       document.removeEventListener(
//         "mousedown",
//         handleOutside
//       );

//       document.removeEventListener(
//         "keydown",
//         handleEscape
//       );
//     };
//   }, [onClose]);

//   useEffect(() => {
//     const handleScroll = () => {
//       onClose();
//     };

//     const handleResize = () => {
//       onClose();
//     };

//     window.addEventListener(
//       "scroll",
//       handleScroll,
//       true
//     );

//     window.addEventListener(
//       "resize",
//       handleResize
//     );

//     return () => {
//       window.removeEventListener(
//         "scroll",
//         handleScroll,
//         true
//       );

//       window.removeEventListener(
//         "resize",
//         handleResize
//       );
//     };
//   }, [onClose]);

//   if (
//     !anchor ||
//     menuActions.length === 0
//   ) {
//     return null;
//   }

//   const menuWidth = 170;

//   const menuHeight =
//     menuActions.length * 36 + 12;

//   const viewportWidth = window.innerWidth;

//   const viewportHeight = window.innerHeight;

//   let left = anchor.right - menuWidth;

//   if (
//     left + menuWidth >
//     viewportWidth - 10
//   ) {
//     left =
//       viewportWidth -
//       menuWidth -
//       10;
//   }

//   left = Math.max(10, left);

//   const spaceBelow =
//     viewportHeight - anchor.bottom;

//   const openAbove =
//     spaceBelow < menuHeight &&
//     anchor.top > menuHeight;

//   let top = openAbove
//     ? anchor.top - menuHeight - 5
//     : anchor.bottom + 5;

//   top = Math.max(10, top);

//   return createPortal(
//     <div
//       ref={menuRef}
//       className="dl-fixed-action-menu"
//       style={{
//         top,
//         left,
//         width: menuWidth,
//       }}
//     >
//       {menuActions.map((item) => (
//         <button
//           key={item.key}
//           type="button"
//           className={
//             item.danger ? "danger" : ""
//           }
//           onClick={() => {
//             item.action(row);
//             onClose();
//           }}
//         >
//           {item.icon}

//           <span>{item.label}</span>
//         </button>
//       ))}
//     </div>,
//     document.body
//   );
// }

// function DataList({
//   title,
//   subtitle,

//   columns = [],
//   data = [],

//   loading = false,
//   error = "",

//   rowKey = "id",

//   showCase = "list",

//   searchable = true,
//   filterable = true,
//   sortable = true,
//   selectable = true,
//   columnVisibility = true,
//   pagination = true,

//   filters = [],
//   quickFilters = [],

//   actions = {},
//   bulkActions = [],

//   onRefresh,
//   onExport,
//   onImport,

//   importConfig = null,

//   serverMode = false,
//   total: serverTotal,

//   page: controlledPage,
//   pageSize: controlledPageSize,

//   onPageChange,
//   onPageSizeChange,
//   onSearch,
//   onSort,
//   onFilterChange,

//   searchPlaceholder = "Search...",
//   pageSizeOptions = [
//     10,
//     20,
//     50,
//     100,
//   ],

//   storageKey,

//   addButton,
//   toolbarActions,

//   emptyTitle = "No records found",
//   emptyMessage =
//     "There are no records to display.",

//   getRowClassName,
// }) {
//   const fileInputRef = useRef(null);

//   const importWrapperRef = useRef(null);

//   const [localSearch, setLocalSearch] =
//     useState("");

//   const [localFilters, setLocalFilters] =
//     useState({});

//   const [showFilters, setShowFilters] =
//     useState(false);

//   const [showColumns, setShowColumns] =
//     useState(false);

//   const [showImportMenu, setShowImportMenu] =
//     useState(false);

//   const [selectedRows, setSelectedRows] =
//     useState([]);

//   const [localPage, setLocalPage] =
//     useState(1);

//   const [localPageSize, setLocalPageSize] =
//     useState(DEFAULT_PAGE_SIZE);

//   const [sort, setSort] = useState({
//     key: "",
//     direction: "",
//   });

//   const [actionMenu, setActionMenu] =
//     useState(null);

//   const [columnSettings, setColumnSettings] =
//     useState(() => {
//       const defaults = columns.map((column) => ({
//         ...column,
//         visible: column.visible !== false,
//       }));

//       if (!storageKey) {
//         return defaults;
//       }

//       try {
//         const saved = localStorage.getItem(
//           `${storageKey}-columns`
//         );

//         if (!saved) {
//           return defaults;
//         }

//         const savedColumns = JSON.parse(saved);

//         return columns.map((column) => {
//           const savedColumn = savedColumns.find(
//             (item) => item.key === column.key
//           );

//           return {
//             ...column,
//             visible:
//               savedColumn?.visible ??
//               column.visible !== false,
//           };
//         });
//       } catch {
//         return defaults;
//       }
//     });

//   const displayColumns = columnSettings.filter(
//     (column) => column.visible
//   );

//   const page =
//     controlledPage !== undefined
//       ? controlledPage
//       : localPage;

//   const pageSize =
//     controlledPageSize !== undefined
//       ? controlledPageSize
//       : localPageSize;

//   const hasActions =
//     Object.keys(actions).length > 0;

//   const hasImport =
//     Boolean(importConfig) || Boolean(onImport);

//   const searchableColumns = useMemo(
//     () =>
//       columns.filter(
//         (column) => column.searchable !== false
//       ),
//     [columns]
//   );

//   useEffect(() => {
//     const timer = setTimeout(() => {
//       if (serverMode && onSearch) {
//         onSearch(localSearch);
//       }

//       if (serverMode && onPageChange) {
//         onPageChange(1);
//       }

//       if (!serverMode) {
//         setLocalPage(1);
//       }
//     }, 300);

//     return () => clearTimeout(timer);
//   }, [
//     localSearch,
//     serverMode,
//     onSearch,
//     onPageChange,
//   ]);

//   useEffect(() => {
//     const handleOutsideClick = (event) => {
//       if (
//         importWrapperRef.current &&
//         !importWrapperRef.current.contains(
//           event.target
//         )
//       ) {
//         setShowImportMenu(false);
//       }
//     };

//     const handleEscape = (event) => {
//       if (event.key === "Escape") {
//         setShowImportMenu(false);
//       }
//     };

//     document.addEventListener(
//       "mousedown",
//       handleOutsideClick
//     );

//     document.addEventListener(
//       "keydown",
//       handleEscape
//     );

//     return () => {
//       document.removeEventListener(
//         "mousedown",
//         handleOutsideClick
//       );

//       document.removeEventListener(
//         "keydown",
//         handleEscape
//       );
//     };
//   }, []);

//   const filteredData = useMemo(() => {
//     if (serverMode) {
//       return data;
//     }

//     let result = [...data];

//     const searchValue = normalize(localSearch);

//     if (searchValue) {
//       result = result.filter((row) =>
//         searchableColumns.some((column) =>
//           normalize(row[column.key]).includes(
//             searchValue
//           )
//         )
//       );
//     }

//     Object.entries(localFilters).forEach(
//       ([key, filterValue]) => {
//         if (
//           filterValue === "" ||
//           filterValue === null ||
//           filterValue === undefined
//         ) {
//           return;
//         }

//         result = result.filter(
//           (row) =>
//             normalize(row[key]) ===
//             normalize(filterValue)
//         );
//       }
//     );

//     if (sort.key && sortable) {
//       result.sort((a, b) => {
//         const valueA = a[sort.key];

//         const valueB = b[sort.key];

//         if (
//           typeof valueA === "number" &&
//           typeof valueB === "number"
//         ) {
//           return sort.direction === "asc"
//             ? valueA - valueB
//             : valueB - valueA;
//         }

//         const first = normalize(valueA);

//         const second = normalize(valueB);

//         if (first < second) {
//           return sort.direction === "asc"
//             ? -1
//             : 1;
//         }

//         if (first > second) {
//           return sort.direction === "asc"
//             ? 1
//             : -1;
//         }

//         return 0;
//       });
//     }

//     return result;
//   }, [
//     data,
//     localSearch,
//     localFilters,
//     sort,
//     sortable,
//     serverMode,
//     searchableColumns,
//   ]);

//   const total = serverMode
//     ? Number(serverTotal || 0)
//     : filteredData.length;

//   const totalPages = Math.max(
//     1,
//     Math.ceil(total / pageSize)
//   );

//   const currentPage = Math.min(page, totalPages);

//   const currentData = serverMode
//     ? data
//     : filteredData.slice(
//         (currentPage - 1) * pageSize,
//         currentPage * pageSize
//       );

//   const currentIds = currentData.map(
//     (row) => row[rowKey]
//   );

//   const allSelected =
//     currentData.length > 0 &&
//     currentData.every((row) =>
//       selectedRows.includes(row[rowKey])
//     );

//   const someSelected = currentData.some((row) =>
//     selectedRows.includes(row[rowKey])
//   );

//   const selectedData = data.filter((row) =>
//     selectedRows.includes(row[rowKey])
//   );

//   const filterCount = Object.values(
//     localFilters
//   ).filter(Boolean).length;

//   const updateColumns = (updated) => {
//     setColumnSettings(updated);

//     if (storageKey) {
//       localStorage.setItem(
//         `${storageKey}-columns`,
//         JSON.stringify(updated)
//       );
//     }
//   };

//   const toggleColumn = (key) => {
//     const updated = columnSettings.map((column) =>
//       column.key === key
//         ? {
//             ...column,
//             visible: !column.visible,
//           }
//         : column
//     );

//     updateColumns(updated);
//   };

//   const handleSort = (key) => {
//     let next;

//     if (sort.key !== key) {
//       next = {
//         key,
//         direction: "asc",
//       };
//     } else if (sort.direction === "asc") {
//       next = {
//         key,
//         direction: "desc",
//       };
//     } else {
//       next = {
//         key: "",
//         direction: "",
//       };
//     }

//     setSort(next);

//     if (serverMode && onSort) {
//       onSort(next);
//     }
//   };

//   const handleFilterChange = (key, value) => {
//     const updated = {
//       ...localFilters,
//       [key]: value,
//     };

//     setLocalFilters(updated);

//     if (serverMode && onFilterChange) {
//       onFilterChange(updated);
//     }

//     if (serverMode && onPageChange) {
//       onPageChange(1);
//     }

//     if (!serverMode) {
//       setLocalPage(1);
//     }
//   };

//   const clearFilters = () => {
//     setLocalFilters({});

//     if (serverMode && onFilterChange) {
//       onFilterChange({});
//     }

//     if (serverMode && onPageChange) {
//       onPageChange(1);
//     }

//     if (!serverMode) {
//       setLocalPage(1);
//     }
//   };

//   const changePage = (nextPage) => {
//     const safePage = Math.max(
//       1,
//       Math.min(nextPage, totalPages)
//     );

//     if (serverMode && onPageChange) {
//       onPageChange(safePage);
//     } else {
//       setLocalPage(safePage);
//     }
//   };

//   const changePageSize = (size) => {
//     const value = Number(size);

//     if (serverMode && onPageSizeChange) {
//       onPageSizeChange(value);

//       return;
//     }

//     setLocalPageSize(value);

//     setLocalPage(1);
//   };

//   const toggleRow = (id) => {
//     setSelectedRows((previous) =>
//       previous.includes(id)
//         ? previous.filter((item) => item !== id)
//         : [...previous, id]
//     );
//   };

//   const selectCurrentPage = () => {
//     if (allSelected) {
//       setSelectedRows((previous) =>
//         previous.filter(
//           (id) => !currentIds.includes(id)
//         )
//       );

//       return;
//     }

//     setSelectedRows((previous) => [
//       ...new Set([
//         ...previous,
//         ...currentIds,
//       ]),
//     ]);
//   };

//   const clearSelection = () => {
//     setSelectedRows([]);
//   };

//   const handleExport = () => {
//     const rows = selectedRows.length
//       ? selectedData
//       : filteredData;

//     if (onExport) {
//       onExport(rows);

//       return;
//     }

//     const headers = displayColumns.map(
//       (column) => column.label
//     );

//     const csvRows = rows.map((row) =>
//       displayColumns.map(
//         (column) => row[column.key] ?? ""
//       )
//     );

//     const csv = [headers, ...csvRows]
//       .map((row) =>
//         row
//           .map((value) => escapeCsvValue(value))
//           .join(",")
//       )
//       .join("\n");

//     const blob = new Blob([csv], {
//       type: "text/csv;charset=utf-8;",
//     });

//     const url = URL.createObjectURL(blob);

//     const link = document.createElement("a");

//     link.href = url;

//     link.download = "export.csv";

//     document.body.appendChild(link);

//     link.click();

//     link.remove();

//     URL.revokeObjectURL(url);
//   };

//   const handleDownloadTemplate = () => {
//     const templateColumns =
//       importConfig?.columns?.length
//         ? importConfig.columns
//         : columns.map((column) => ({
//             key: column.key,
//             label: column.label,
//             example: "",
//           }));

//     if (!templateColumns.length) {
//       return;
//     }

//     const headerRow = templateColumns.map((column) =>
//       escapeCsvValue(
//         typeof column === "string"
//           ? column
//           : column.key
//       )
//     );

//     const exampleRow = templateColumns.map((column) =>
//       escapeCsvValue(
//         typeof column === "string"
//           ? ""
//           : column.example || ""
//       )
//     );

//     const csv = [headerRow, exampleRow]
//       .map((row) => row.join(","))
//       .join("\n");

//     const blob = new Blob([csv], {
//       type: "text/csv;charset=utf-8;",
//     });

//     const url = URL.createObjectURL(blob);

//     const link = document.createElement("a");

//     link.href = url;

//     link.download =
//       importConfig?.templateFileName ||
//       `${String(title || "data")
//         .toLowerCase()
//         .trim()
//         .replace(/\s+/g, "-")}-template.csv`;

//     document.body.appendChild(link);

//     link.click();

//     link.remove();

//     URL.revokeObjectURL(url);

//     setShowImportMenu(false);
//   };

//   const handleOpenUpload = () => {
//     fileInputRef.current?.click();

//     setShowImportMenu(false);
//   };

//   const handleImport = async (event) => {
//     const file = event.target.files?.[0];

//     event.target.value = "";

//     if (!file) {
//       return;
//     }

//     const isCsv =
//       file.type === "text/csv" ||
//       file.name.toLowerCase().endsWith(".csv");

//     if (!isCsv) {
//       if (importConfig?.onError) {
//         importConfig.onError(
//           "Please select a CSV file."
//         );
//       }

//       return;
//     }

//     if (importConfig?.onUpload) {
//       await importConfig.onUpload(file);

//       return;
//     }

//     if (onImport) {
//       await onImport(file);
//     }
//   };

//   const handleRefresh = () => {
//     setSelectedRows([]);

//     setActionMenu(null);

//     setShowImportMenu(false);

//     if (onRefresh) {
//       onRefresh();
//     }
//   };

//   const openActionMenu = (event, row) => {
//     event.stopPropagation();

//     const rect =
//       event.currentTarget.getBoundingClientRect();

//     setActionMenu({
//       row,
//       anchor: {
//         top: rect.top,
//         bottom: rect.bottom,
//         right: rect.right,
//       },
//     });
//   };

//   const closeActionMenu = () => {
//     setActionMenu(null);
//   };

//   const getQuickFilterCount = (filter) => {
//     if (typeof filter.count === "number") {
//       return filter.count;
//     }

//     if (typeof filter.count === "function") {
//       return filter.count(data);
//     }

//     if (serverMode) {
//       return null;
//     }

//     if (filter.value === "") {
//       return data.length;
//     }

//     return data.filter(
//       (row) =>
//         normalize(row[filter.key]) ===
//         normalize(filter.value)
//     ).length;
//   };

//   return (
//     <div className="data-list">
//       <div className="dl-header">
//         <div className="dl-header-content">
//           <h1>{title}</h1>

//           {subtitle && <p>{subtitle}</p>}
//         </div>

//         {addButton && (
//           <div className="dl-add-button">
//             {addButton}
//           </div>
//         )}
//       </div>

//       <div className="dl-card">
//         <div className="dl-toolbar">
//           {searchable && (
//             <div className="dl-search">
//               <Search size={17} />

//               <input
//                 value={localSearch}
//                 onChange={(event) =>
//                   setLocalSearch(event.target.value)
//                 }
//                 placeholder={searchPlaceholder}
//               />

//               {localSearch && (
//                 <button
//                   type="button"
//                   onClick={() =>
//                     setLocalSearch("")
//                   }
//                 >
//                   <X size={15} />
//                 </button>
//               )}
//             </div>
//           )}

//           <div className="dl-toolbar-actions">
//             {filterable && (
//               <button
//                 type="button"
//                 className={
//                   showFilters
//                     ? "dl-tool active"
//                     : "dl-tool"
//                 }
//                 onClick={() =>
//                   setShowFilters((value) => !value)
//                 }
//               >
//                 <Filter size={16} />

//                 <span>Filters</span>

//                 {filterCount > 0 && (
//                   <b>{filterCount}</b>
//                 )}
//               </button>
//             )}

//             {columnVisibility && (
//               <div className="dl-dropdown-wrapper">
//                 <button
//                   type="button"
//                   className={
//                     showColumns
//                       ? "dl-tool active"
//                       : "dl-tool"
//                   }
//                   onClick={() =>
//                     setShowColumns((value) => !value)
//                   }
//                 >
//                   <Columns3 size={16} />

//                   <span>Columns</span>
//                 </button>

//                 {showColumns && (
//                   <div className="dl-dropdown">
//                     <strong>Columns</strong>

//                     {columnSettings.map((column) => (
//                       <label
//                         key={column.key}
//                         className="dl-column-option"
//                       >
//                         <input
//                           type="checkbox"
//                           checked={column.visible}
//                           onChange={() =>
//                             toggleColumn(column.key)
//                           }
//                         />

//                         {column.label}
//                       </label>
//                     ))}
//                   </div>
//                 )}
//               </div>
//             )}

//             <button
//               type="button"
//               className="dl-tool"
//               onClick={handleExport}
//             >
//               <Download size={16} />

//               <span>Export</span>
//             </button>

//             {hasImport && (
//               <div
//                 ref={importWrapperRef}
//                 className="dl-import-wrapper"
//               >
//                 <button
//                   type="button"
//                   className={[
//                     "dl-import-button",
//                     showImportMenu ? "active" : "",
//                   ]
//                     .filter(Boolean)
//                     .join(" ")}
//                   onClick={() =>
//                     setShowImportMenu(
//                       (previous) => !previous
//                     )
//                   }
//                   disabled={loading}
//                 >
//                   <Upload size={16} />

//                   <span>Import</span>

//                   <ChevronDown
//                     size={15}
//                     className={[
//                       "dl-import-chevron",
//                       showImportMenu ? "open" : "",
//                     ]
//                       .filter(Boolean)
//                       .join(" ")}
//                   />
//                 </button>

//                 {showImportMenu && (
//                   <div className="dl-import-menu">
//                     <button
//                       type="button"
//                       className="dl-import-menu-item"
//                       onClick={handleDownloadTemplate}
//                     >
//                       <Download size={16} />

//                       <span>
//                         Download Template
//                       </span>
//                     </button>

//                     <button
//                       type="button"
//                       className="dl-import-menu-item"
//                       onClick={handleOpenUpload}
//                     >
//                       <Upload size={16} />

//                       <span>Upload CSV</span>
//                     </button>
//                   </div>
//                 )}

//                 <input
//                   ref={fileInputRef}
//                   type="file"
//                   accept=".csv,text/csv"
//                   className="dl-import-file-input"
//                   onChange={handleImport}
//                 />
//               </div>
//             )}

//             {onRefresh && (
//               <button
//                 type="button"
//                 className="dl-tool"
//                 onClick={handleRefresh}
//                 disabled={loading}
//               >
//                 <RefreshCw
//                   size={16}
//                   className={
//                     loading
//                       ? "dl-refresh-icon-spin"
//                       : ""
//                   }
//                 />

//                 <span>Refresh</span>
//               </button>
//             )}

//             {toolbarActions}
//           </div>
//         </div>

//         {quickFilters.length > 0 && (
//           <div className="dl-quick-filters">
//             {quickFilters.map((filter) => {
//               const count =
//                 getQuickFilterCount(filter);

//               const active =
//                 filter.value === ""
//                   ? !localFilters[filter.key]
//                   : localFilters[filter.key] ===
//                     filter.value;

//               return (
//                 <button
//                   key={`${filter.key}-${filter.value}`}
//                   type="button"
//                   className={active ? "active" : ""}
//                   onClick={() =>
//                     handleFilterChange(
//                       filter.key,
//                       active ? "" : filter.value
//                     )
//                   }
//                 >
//                   <span>{filter.label}</span>

//                   {count !== null && (
//                     <span className="dl-quick-count">
//                       {count}
//                     </span>
//                   )}
//                 </button>
//               );
//             })}
//           </div>
//         )}

//         {showFilters && filters.length > 0 && (
//           <div className="dl-filter-panel">
//             <div className="dl-filter-header">
//               <div>
//                 <strong>Filters</strong>

//                 <span>Refine your results</span>
//               </div>

//               {filterCount > 0 && (
//                 <button
//                   type="button"
//                   onClick={clearFilters}
//                 >
//                   Clear filters
//                 </button>
//               )}
//             </div>

//             <div className="dl-filter-grid">
//               {filters.map((filter) => (
//                 <div
//                   className="dl-field"
//                   key={filter.key}
//                 >
//                   <label>{filter.label}</label>

//                   {filter.type === "select" && (
//                     <select
//                       value={
//                         localFilters[filter.key] || ""
//                       }
//                       onChange={(event) =>
//                         handleFilterChange(
//                           filter.key,
//                           event.target.value
//                         )
//                       }
//                     >
//                       <option value="">All</option>

//                       {(filter.options || []).map(
//                         (option) => {
//                           const value =
//                             typeof option === "object"
//                               ? option.value
//                               : option;

//                           const label =
//                             typeof option === "object"
//                               ? option.label
//                               : option;

//                           return (
//                             <option
//                               key={String(value)}
//                               value={value}
//                             >
//                               {label}
//                             </option>
//                           );
//                         }
//                       )}
//                     </select>
//                   )}

//                   {filter.type !== "select" && (
//                     <input
//                       type={filter.type || "text"}
//                       value={
//                         localFilters[filter.key] || ""
//                       }
//                       placeholder={
//                         filter.placeholder || ""
//                       }
//                       onChange={(event) =>
//                         handleFilterChange(
//                           filter.key,
//                           event.target.value
//                         )
//                       }
//                     />
//                   )}
//                 </div>
//               ))}
//             </div>
//           </div>
//         )}

//         {selectedRows.length > 0 && (
//           <div className="dl-bulk-bar">
//             <div>
//               <strong>{selectedRows.length}</strong>{" "}
//               selected

//               <button
//                 type="button"
//                 onClick={clearSelection}
//               >
//                 Clear
//               </button>
//             </div>

//             <div className="dl-bulk-actions">
//               {bulkActions.map((item) => (
//                 <button
//                   key={item.key}
//                   type="button"
//                   className={
//                     item.danger ? "danger" : ""
//                   }
//                   onClick={() =>
//                     item.action(selectedData)
//                   }
//                 >
//                   {item.icon}

//                   {item.label}
//                 </button>
//               ))}
//             </div>
//           </div>
//         )}

//         {loading ? (
//           <DataListLoading
//             columns={displayColumns.length}
//           />
//         ) : error ? (
//           <div className="dl-state">
//             <strong>Something went wrong</strong>

//             <span>{error}</span>

//             {onRefresh && (
//               <button
//                 type="button"
//                 onClick={onRefresh}
//               >
//                 Try again
//               </button>
//             )}
//           </div>
//         ) : currentData.length === 0 ? (
//           <div className="dl-state">
//             <strong>{emptyTitle}</strong>

//             <span>{emptyMessage}</span>
//           </div>
//         ) : (
//           <>
//             <div
//               className={`dl-table-wrapper ${
//                 showCase === "box"
//                   ? "dl-box-mobile"
//                   : "dl-list-mobile"
//               }`}
//             >
//               <table className="dl-table">
//                 <thead>
//                   <tr>
//                     {selectable && (
//                       <th className="dl-checkbox-column">
//                         <input
//                           type="checkbox"
//                           checked={allSelected}
//                           ref={(element) => {
//                             if (element) {
//                               element.indeterminate =
//                                 !allSelected &&
//                                 someSelected;
//                             }
//                           }}
//                           onChange={selectCurrentPage}
//                         />
//                       </th>
//                     )}

//                     {displayColumns.map((column) => (
//                       <th
//                         key={column.key}
//                         style={{
//                           width: column.width,
//                         }}
//                       >
//                         {column.sortable && sortable ? (
//                           <button
//                             type="button"
//                             className="dl-sort"
//                             onClick={() =>
//                               handleSort(column.key)
//                             }
//                           >
//                             <span>{column.label}</span>

//                             <SortIcon
//                               direction={
//                                 sort.key === column.key
//                                   ? sort.direction
//                                   : ""
//                               }
//                             />
//                           </button>
//                         ) : (
//                           column.label
//                         )}
//                       </th>
//                     ))}

//                     {hasActions && (
//                       <th className="dl-action-column">
//                         Actions
//                       </th>
//                     )}
//                   </tr>
//                 </thead>

//                 <tbody>
//                   {currentData.map((row) => (
//                     <tr
//                       key={row[rowKey]}
//                       className={
//                         getRowClassName
//                           ? getRowClassName(row)
//                           : ""
//                       }
//                     >
//                       {selectable && (
//                         <td className="dl-checkbox-column">
//                           <input
//                             type="checkbox"
//                             checked={selectedRows.includes(
//                               row[rowKey]
//                             )}
//                             onChange={() =>
//                               toggleRow(row[rowKey])
//                             }
//                           />
//                         </td>
//                       )}

//                       {displayColumns.map((column) => (
//                         <td key={column.key}>
//                           {formatValue(
//                             row[column.key],
//                             column,
//                             row
//                           )}
//                         </td>
//                       ))}

//                       {hasActions && (
//                         <td className="dl-action-column">
//                           <button
//                             type="button"
//                             className="dl-action-button"
//                             aria-label="Open actions"
//                             onClick={(event) =>
//                               openActionMenu(event, row)
//                             }
//                           >
//                             <MoreHorizontal size={18} />
//                           </button>
//                         </td>
//                       )}
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>

//             {showCase === "box" && (
//               <div className="dl-mobile-box-list">
//                 {currentData.map((row) => (
//                   <div
//                     className="dl-mobile-card"
//                     key={row[rowKey]}
//                   >
//                     <div className="dl-mobile-header">
//                       <div>
//                         <strong>
//                           {formatValue(
//                             row[
//                               displayColumns[0]?.key
//                             ],
//                             displayColumns[0] || {},
//                             row
//                           )}
//                         </strong>

//                         {displayColumns[1] && (
//                           <span>
//                             {formatValue(
//                               row[
//                                 displayColumns[1].key
//                               ],
//                               displayColumns[1],
//                               row
//                             )}
//                           </span>
//                         )}
//                       </div>

//                       {hasActions && (
//                         <button
//                           type="button"
//                           className="dl-action-button"
//                           onClick={(event) =>
//                             openActionMenu(event, row)
//                           }
//                         >
//                           <MoreHorizontal size={18} />
//                         </button>
//                       )}
//                     </div>

//                     <div className="dl-mobile-grid">
//                       {displayColumns
//                         .slice(2)
//                         .map((column) => (
//                           <div key={column.key}>
//                             <span>{column.label}</span>

//                             <strong>
//                               {formatValue(
//                                 row[column.key],
//                                 column,
//                                 row
//                               )}
//                             </strong>
//                           </div>
//                         ))}
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </>
//         )}

//         {pagination && !loading && total > 0 && (
//           <div className="dl-pagination">
//             <div className="dl-pagination-info">
//               <span>
//                 Showing{" "}
//                 <strong>
//                   {(currentPage - 1) * pageSize + 1}
//                 </strong>{" "}
//                 -{" "}
//                 <strong>
//                   {Math.min(
//                     currentPage * pageSize,
//                     total
//                   )}
//                 </strong>{" "}
//                 of <strong>{total}</strong>
//               </span>

//               <select
//                 value={pageSize}
//                 onChange={(event) =>
//                   changePageSize(
//                     event.target.value
//                   )
//                 }
//               >
//                 {pageSizeOptions.map((size) => (
//                   <option
//                     key={size}
//                     value={size}
//                   >
//                     {size} / page
//                   </option>
//                 ))}
//               </select>
//             </div>

//             <div className="dl-pagination-buttons">
//               <button
//                 type="button"
//                 disabled={currentPage === 1}
//                 onClick={() =>
//                   changePage(currentPage - 1)
//                 }
//               >
//                 <ChevronLeft size={16} />
//               </button>

//               {getPageNumbers(
//                 currentPage,
//                 totalPages
//               ).map((item) => (
//                 <button
//                   key={item}
//                   type="button"
//                   className={
//                     item === currentPage
//                       ? "active"
//                       : ""
//                   }
//                   onClick={() => changePage(item)}
//                 >
//                   {item}
//                 </button>
//               ))}

//               <button
//                 type="button"
//                 disabled={
//                   currentPage === totalPages
//                 }
//                 onClick={() =>
//                   changePage(currentPage + 1)
//                 }
//               >
//                 <ChevronRight size={16} />
//               </button>
//             </div>
//           </div>
//         )}
//       </div>

//       {actionMenu && (
//         <ActionMenu
//           row={actionMenu.row}
//           actions={actions}
//           anchor={actionMenu.anchor}
//           onClose={closeActionMenu}
//         />
//       )}
//     </div>
//   );
// }

// function DataListLoading({
//   columns = 6,
// }) {
//   const count = Math.max(
//     3,
//     Math.min(columns, 10)
//   );

//   return (
//     <div className="dl-loading">
//       <div
//         className="dl-loading-head"
//         style={{
//           gridTemplateColumns: `repeat(${count}, minmax(100px, 1fr))`,
//         }}
//       >
//         {Array.from(
//           {
//             length: count,
//           },
//           (_, index) => (
//             <span key={index} />
//           )
//         )}
//       </div>

//       {Array.from(
//         {
//           length: 8,
//         },
//         (_, row) => (
//           <div
//             className="dl-loading-row"
//             key={row}
//             style={{
//               gridTemplateColumns: `repeat(${count}, minmax(100px, 1fr))`,
//             }}
//           >
//             {Array.from(
//               {
//                 length: count,
//               },
//               (_, column) => (
//                 <span key={column} />
//               )
//             )}
//           </div>
//         )
//       )}
//     </div>
//   );
// }

// function getPageNumbers(current, total) {
//   if (total <= 5) {
//     return Array.from(
//       {
//         length: total,
//       },
//       (_, index) => index + 1
//     );
//   }

//   if (current <= 3) {
//     return [
//       1,
//       2,
//       3,
//       4,
//       5,
//     ];
//   }

//   if (current >= total - 2) {
//     return [
//       total - 4,
//       total - 3,
//       total - 2,
//       total - 1,
//       total,
//     ];
//   }

//   return [
//     current - 2,
//     current - 1,
//     current,
//     current + 1,
//     current + 2,
//   ];
// }

// export default DataList;


import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { createPortal } from "react-dom";

import {
  Search,
  Filter,
  Download,
  Upload,
  RefreshCw,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Copy,
  Printer,
  Columns3,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  X,
} from "lucide-react";

import "./data-list.css";

const DEFAULT_PAGE_SIZE = 10;

const normalize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .trim();

const formatCurrency = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "-";
  }

  return `₹${Number(value).toLocaleString(
    "en-IN"
  )}`;
};

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const escapeCsvValue = (value) => {
  const text = String(value ?? "");

  return `"${text.replace(/"/g, '""')}"`;
};

/*
  Calculates a fixed position for a dropdown menu
  anchored under a toolbar button. Used with portals
  so menus are never clipped by scrollable containers
  (e.g. the horizontally scrollable toolbar on mobile).
*/
const getMenuPosition = (element, width) => {
  if (!element) {
    return null;
  }

  const rect = element.getBoundingClientRect();

  const left = Math.max(
    10,
    Math.min(
      rect.right - width,
      window.innerWidth - width - 10
    )
  );

  return {
    top: rect.bottom + 7,
    left,
    width,
  };
};

function StatusBadge({ value }) {
  const normalized = normalize(value).replace(
    /\s+/g,
    "-"
  );

  return (
    <span
      className={`dl-status dl-status-${normalized}`}
    >
      <span className="dl-status-dot" />

      {value || "-"}
    </span>
  );
}

function formatValue(value, column, row) {
  if (column?.render) {
    return column.render(value, row);
  }

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "-";
  }

  switch (column?.type) {
    case "currency":
      return formatCurrency(value);

    case "date":
      return formatDate(value);

    case "number":
      return Number(value).toLocaleString(
        "en-IN"
      );

    case "boolean":
      return value ? "Yes" : "No";

    case "status":
      return <StatusBadge value={value} />;

    default:
      return String(value);
  }
}

function SortIcon({ direction }) {
  if (direction === "asc") {
    return <ArrowUp size={13} />;
  }

  if (direction === "desc") {
    return <ArrowDown size={13} />;
  }

  return <ArrowUpDown size={13} />;
}

function ActionMenu({
  row,
  actions,
  anchor,
  onClose,
}) {
  const menuRef = useRef(null);

  const menuActions = [];

  if (actions.view) {
    menuActions.push({
      key: "view",
      label: "View",
      icon: <Eye size={15} />,
      action: actions.view,
    });
  }

  if (actions.edit) {
    menuActions.push({
      key: "edit",
      label: "Edit",
      icon: <Edit size={15} />,
      action: actions.edit,
    });
  }

  if (actions.duplicate) {
    menuActions.push({
      key: "duplicate",
      label: "Duplicate",
      icon: <Copy size={15} />,
      action: actions.duplicate,
    });
  }

  if (actions.print) {
    menuActions.push({
      key: "print",
      label: "Print",
      icon: <Printer size={15} />,
      action: actions.print,
    });
  }

  if (actions.delete) {
    menuActions.push({
      key: "delete",
      label: "Delete",
      icon: <Trash2 size={15} />,
      action: actions.delete,
      danger: true,
    });
  }

  useEffect(() => {
    const handleOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutside
    );

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutside
      );

      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [onClose]);

  useEffect(() => {
    const handleScroll = () => {
      onClose();
    };

    const handleResize = () => {
      onClose();
    };

    window.addEventListener(
      "scroll",
      handleScroll,
      true
    );

    window.addEventListener(
      "resize",
      handleResize
    );

    return () => {
      window.removeEventListener(
        "scroll",
        handleScroll,
        true
      );

      window.removeEventListener(
        "resize",
        handleResize
      );
    };
  }, [onClose]);

  if (
    !anchor ||
    menuActions.length === 0
  ) {
    return null;
  }

  const menuWidth = 170;

  const menuHeight =
    menuActions.length * 36 + 12;

  const viewportWidth = window.innerWidth;

  const viewportHeight = window.innerHeight;

  let left = anchor.right - menuWidth;

  if (
    left + menuWidth >
    viewportWidth - 10
  ) {
    left =
      viewportWidth -
      menuWidth -
      10;
  }

  left = Math.max(10, left);

  const spaceBelow =
    viewportHeight - anchor.bottom;

  const openAbove =
    spaceBelow < menuHeight &&
    anchor.top > menuHeight;

  let top = openAbove
    ? anchor.top - menuHeight - 5
    : anchor.bottom + 5;

  top = Math.max(10, top);

  return createPortal(
    <div
      ref={menuRef}
      className="dl-fixed-action-menu"
      style={{
        top,
        left,
        width: menuWidth,
      }}
    >
      {menuActions.map((item) => (
        <button
          key={item.key}
          type="button"
          className={
            item.danger ? "danger" : ""
          }
          onClick={() => {
            item.action(row);
            onClose();
          }}
        >
          {item.icon}

          <span>{item.label}</span>
        </button>
      ))}
    </div>,
    document.body
  );
}

function DataList({
  title,
  subtitle,

  columns = [],
  data = [],

  loading = false,
  error = "",

  rowKey = "id",

  showCase = "list",

  searchable = true,
  filterable = true,
  sortable = true,
  selectable = true,
  columnVisibility = true,
  pagination = true,

  filters = [],
  quickFilters = [],

  actions = {},
  bulkActions = [],

  onRefresh,
  onExport,
  onImport,

  importConfig = null,

  serverMode = false,
  total: serverTotal,

  page: controlledPage,
  pageSize: controlledPageSize,

  onPageChange,
  onPageSizeChange,
  onSearch,
  onSort,
  onFilterChange,

  searchPlaceholder = "Search...",
  pageSizeOptions = [
    10,
    20,
    50,
    100,
  ],

  storageKey,

  addButton,
  toolbarActions,

  emptyTitle = "No records found",
  emptyMessage =
    "There are no records to display.",

  getRowClassName,
}) {
  const fileInputRef = useRef(null);

  const importWrapperRef = useRef(null);

  const importButtonRef = useRef(null);

  const importMenuRef = useRef(null);

  const columnsButtonRef = useRef(null);

  const columnsMenuRef = useRef(null);

  const [localSearch, setLocalSearch] =
    useState("");

  const [localFilters, setLocalFilters] =
    useState({});

  const [showFilters, setShowFilters] =
    useState(false);

  const [showColumns, setShowColumns] =
    useState(false);

  const [showImportMenu, setShowImportMenu] =
    useState(false);

  const [importMenuPos, setImportMenuPos] =
    useState(null);

  const [columnsMenuPos, setColumnsMenuPos] =
    useState(null);

  const [selectedRows, setSelectedRows] =
    useState([]);

  const [localPage, setLocalPage] =
    useState(1);

  const [localPageSize, setLocalPageSize] =
    useState(DEFAULT_PAGE_SIZE);

  const [sort, setSort] = useState({
    key: "",
    direction: "",
  });

  const [actionMenu, setActionMenu] =
    useState(null);

  const [columnSettings, setColumnSettings] =
    useState(() => {
      const defaults = columns.map((column) => ({
        ...column,
        visible: column.visible !== false,
      }));

      if (!storageKey) {
        return defaults;
      }

      try {
        const saved = localStorage.getItem(
          `${storageKey}-columns`
        );

        if (!saved) {
          return defaults;
        }

        const savedColumns = JSON.parse(saved);

        return columns.map((column) => {
          const savedColumn = savedColumns.find(
            (item) => item.key === column.key
          );

          return {
            ...column,
            visible:
              savedColumn?.visible ??
              column.visible !== false,
          };
        });
      } catch {
        return defaults;
      }
    });

  const displayColumns = columnSettings.filter(
    (column) => column.visible
  );

  const page =
    controlledPage !== undefined
      ? controlledPage
      : localPage;

  const pageSize =
    controlledPageSize !== undefined
      ? controlledPageSize
      : localPageSize;

  const hasActions =
    Object.keys(actions).length > 0;

  const hasImport =
    Boolean(importConfig) || Boolean(onImport);

  const searchableColumns = useMemo(
    () =>
      columns.filter(
        (column) => column.searchable !== false
      ),
    [columns]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (serverMode && onSearch) {
        onSearch(localSearch);
      }

      if (serverMode && onPageChange) {
        onPageChange(1);
      }

      if (!serverMode) {
        setLocalPage(1);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [
    localSearch,
    serverMode,
    onSearch,
    onPageChange,
  ]);

  /*
    Toolbar dropdowns (Import + Columns) are rendered
    in portals, so they live outside their wrapper
    elements. Outside-click detection must check both
    the trigger and the portal menu.
  */
  useEffect(() => {
    const isInside = (event, ...refs) =>
      refs.some(
        (ref) =>
          ref.current &&
          ref.current.contains(event.target)
      );

    const handleOutsideClick = (event) => {
      if (
        !isInside(
          event,
          importWrapperRef,
          importMenuRef
        )
      ) {
        setShowImportMenu(false);
      }

      if (
        !isInside(
          event,
          columnsButtonRef,
          columnsMenuRef
        )
      ) {
        setShowColumns(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setShowImportMenu(false);

        setShowColumns(false);
      }
    };

    const handleClose = () => {
      setShowImportMenu(false);

      setShowColumns(false);
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    document.addEventListener(
      "keydown",
      handleEscape
    );

    window.addEventListener(
      "scroll",
      handleClose,
      true
    );

    window.addEventListener(
      "resize",
      handleClose
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );

      document.removeEventListener(
        "keydown",
        handleEscape
      );

      window.removeEventListener(
        "scroll",
        handleClose,
        true
      );

      window.removeEventListener(
        "resize",
        handleClose
      );
    };
  }, []);

  const filteredData = useMemo(() => {
    if (serverMode) {
      return data;
    }

    let result = [...data];

    const searchValue = normalize(localSearch);

    if (searchValue) {
      result = result.filter((row) =>
        searchableColumns.some((column) =>
          normalize(row[column.key]).includes(
            searchValue
          )
        )
      );
    }

    Object.entries(localFilters).forEach(
      ([key, filterValue]) => {
        if (
          filterValue === "" ||
          filterValue === null ||
          filterValue === undefined
        ) {
          return;
        }

        result = result.filter(
          (row) =>
            normalize(row[key]) ===
            normalize(filterValue)
        );
      }
    );

    if (sort.key && sortable) {
      result.sort((a, b) => {
        const valueA = a[sort.key];

        const valueB = b[sort.key];

        if (
          typeof valueA === "number" &&
          typeof valueB === "number"
        ) {
          return sort.direction === "asc"
            ? valueA - valueB
            : valueB - valueA;
        }

        const first = normalize(valueA);

        const second = normalize(valueB);

        if (first < second) {
          return sort.direction === "asc"
            ? -1
            : 1;
        }

        if (first > second) {
          return sort.direction === "asc"
            ? 1
            : -1;
        }

        return 0;
      });
    }

    return result;
  }, [
    data,
    localSearch,
    localFilters,
    sort,
    sortable,
    serverMode,
    searchableColumns,
  ]);

  const total = serverMode
    ? Number(serverTotal || 0)
    : filteredData.length;

  const totalPages = Math.max(
    1,
    Math.ceil(total / pageSize)
  );

  const currentPage = Math.min(page, totalPages);

  const currentData = serverMode
    ? data
    : filteredData.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
      );

  const currentIds = currentData.map(
    (row) => row[rowKey]
  );

  const allSelected =
    currentData.length > 0 &&
    currentData.every((row) =>
      selectedRows.includes(row[rowKey])
    );

  const someSelected = currentData.some((row) =>
    selectedRows.includes(row[rowKey])
  );

  const selectedData = data.filter((row) =>
    selectedRows.includes(row[rowKey])
  );

  const filterCount = Object.values(
    localFilters
  ).filter(Boolean).length;

  const updateColumns = (updated) => {
    setColumnSettings(updated);

    if (storageKey) {
      localStorage.setItem(
        `${storageKey}-columns`,
        JSON.stringify(updated)
      );
    }
  };

  const toggleColumn = (key) => {
    const updated = columnSettings.map((column) =>
      column.key === key
        ? {
            ...column,
            visible: !column.visible,
          }
        : column
    );

    updateColumns(updated);
  };

  const toggleColumnsMenu = () => {
    if (showColumns) {
      setShowColumns(false);

      return;
    }

    setShowImportMenu(false);

    setColumnsMenuPos(
      getMenuPosition(
        columnsButtonRef.current,
        195
      )
    );

    setShowColumns(true);
  };

  const toggleImportMenu = () => {
    if (showImportMenu) {
      setShowImportMenu(false);

      return;
    }

    setShowColumns(false);

    setImportMenuPos(
      getMenuPosition(
        importButtonRef.current,
        210
      )
    );

    setShowImportMenu(true);
  };

  const handleSort = (key) => {
    let next;

    if (sort.key !== key) {
      next = {
        key,
        direction: "asc",
      };
    } else if (sort.direction === "asc") {
      next = {
        key,
        direction: "desc",
      };
    } else {
      next = {
        key: "",
        direction: "",
      };
    }

    setSort(next);

    if (serverMode && onSort) {
      onSort(next);
    }
  };

  const handleFilterChange = (key, value) => {
    const updated = {
      ...localFilters,
      [key]: value,
    };

    setLocalFilters(updated);

    if (serverMode && onFilterChange) {
      onFilterChange(updated);
    }

    if (serverMode && onPageChange) {
      onPageChange(1);
    }

    if (!serverMode) {
      setLocalPage(1);
    }
  };

  const clearFilters = () => {
    setLocalFilters({});

    if (serverMode && onFilterChange) {
      onFilterChange({});
    }

    if (serverMode && onPageChange) {
      onPageChange(1);
    }

    if (!serverMode) {
      setLocalPage(1);
    }
  };

  const changePage = (nextPage) => {
    const safePage = Math.max(
      1,
      Math.min(nextPage, totalPages)
    );

    if (serverMode && onPageChange) {
      onPageChange(safePage);
    } else {
      setLocalPage(safePage);
    }
  };

  const changePageSize = (size) => {
    const value = Number(size);

    if (serverMode && onPageSizeChange) {
      onPageSizeChange(value);

      return;
    }

    setLocalPageSize(value);

    setLocalPage(1);
  };

  const toggleRow = (id) => {
    setSelectedRows((previous) =>
      previous.includes(id)
        ? previous.filter((item) => item !== id)
        : [...previous, id]
    );
  };

  const selectCurrentPage = () => {
    if (allSelected) {
      setSelectedRows((previous) =>
        previous.filter(
          (id) => !currentIds.includes(id)
        )
      );

      return;
    }

    setSelectedRows((previous) => [
      ...new Set([
        ...previous,
        ...currentIds,
      ]),
    ]);
  };

  const clearSelection = () => {
    setSelectedRows([]);
  };

  const handleExport = () => {
    const rows = selectedRows.length
      ? selectedData
      : filteredData;

    if (onExport) {
      onExport(rows);

      return;
    }

    const headers = displayColumns.map(
      (column) => column.label
    );

    const csvRows = rows.map((row) =>
      displayColumns.map(
        (column) => row[column.key] ?? ""
      )
    );

    const csv = [headers, ...csvRows]
      .map((row) =>
        row
          .map((value) => escapeCsvValue(value))
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = "export.csv";

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);
  };

  const handleDownloadTemplate = () => {
    const templateColumns =
      importConfig?.columns?.length
        ? importConfig.columns
        : columns.map((column) => ({
            key: column.key,
            label: column.label,
            example: "",
          }));

    if (!templateColumns.length) {
      return;
    }

    const headerRow = templateColumns.map((column) =>
      escapeCsvValue(
        typeof column === "string"
          ? column
          : column.key
      )
    );

    const exampleRow = templateColumns.map((column) =>
      escapeCsvValue(
        typeof column === "string"
          ? ""
          : column.example || ""
      )
    );

    const csv = [headerRow, exampleRow]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download =
      importConfig?.templateFileName ||
      `${String(title || "data")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")}-template.csv`;

    document.body.appendChild(link);

    link.click();

    link.remove();

    URL.revokeObjectURL(url);

    setShowImportMenu(false);
  };

  const handleOpenUpload = () => {
    fileInputRef.current?.click();

    setShowImportMenu(false);
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    const isCsv =
      file.type === "text/csv" ||
      file.name.toLowerCase().endsWith(".csv");

    if (!isCsv) {
      if (importConfig?.onError) {
        importConfig.onError(
          "Please select a CSV file."
        );
      }

      return;
    }

    if (importConfig?.onUpload) {
      await importConfig.onUpload(file);

      return;
    }

    if (onImport) {
      await onImport(file);
    }
  };

  const handleRefresh = () => {
    setSelectedRows([]);

    setActionMenu(null);

    setShowImportMenu(false);

    setShowColumns(false);

    if (onRefresh) {
      onRefresh();
    }
  };

  const openActionMenu = (event, row) => {
    event.stopPropagation();

    const rect =
      event.currentTarget.getBoundingClientRect();

    setActionMenu({
      row,
      anchor: {
        top: rect.top,
        bottom: rect.bottom,
        right: rect.right,
      },
    });
  };

  const closeActionMenu = () => {
    setActionMenu(null);
  };

  const getQuickFilterCount = (filter) => {
    if (typeof filter.count === "number") {
      return filter.count;
    }

    if (typeof filter.count === "function") {
      return filter.count(data);
    }

    if (serverMode) {
      return null;
    }

    if (filter.value === "") {
      return data.length;
    }

    return data.filter(
      (row) =>
        normalize(row[filter.key]) ===
        normalize(filter.value)
    ).length;
  };

  return (
    <div className="data-list">
      <div className="dl-header">
        <div className="dl-header-content">
          <h1>{title}</h1>

          {subtitle && <p>{subtitle}</p>}
        </div>

        {addButton && (
          <div className="dl-add-button">
            {addButton}
          </div>
        )}
      </div>

      <div className="dl-card">
        <div className="dl-toolbar">
          {searchable && (
            <div className="dl-search">
              <Search size={17} />

              <input
                value={localSearch}
                onChange={(event) =>
                  setLocalSearch(event.target.value)
                }
                placeholder={searchPlaceholder}
              />

              {localSearch && (
                <button
                  type="button"
                  onClick={() =>
                    setLocalSearch("")
                  }
                >
                  <X size={15} />
                </button>
              )}
            </div>
          )}

          <div className="dl-toolbar-actions">
            {filterable && (
              <button
                type="button"
                className={
                  showFilters
                    ? "dl-tool active"
                    : "dl-tool"
                }
                onClick={() =>
                  setShowFilters((value) => !value)
                }
              >
                <Filter size={16} />

                <span>Filters</span>

                {filterCount > 0 && (
                  <b>{filterCount}</b>
                )}
              </button>
            )}

            {columnVisibility && (
              <div className="dl-dropdown-wrapper">
                <button
                  ref={columnsButtonRef}
                  type="button"
                  className={
                    showColumns
                      ? "dl-tool active"
                      : "dl-tool"
                  }
                  onClick={toggleColumnsMenu}
                >
                  <Columns3 size={16} />

                  <span>Columns</span>
                </button>

                {showColumns &&
                  columnsMenuPos &&
                  createPortal(
                    <div
                      ref={columnsMenuRef}
                      className="dl-dropdown dl-dropdown-fixed"
                      style={{
                        top: columnsMenuPos.top,
                        left: columnsMenuPos.left,
                        width: columnsMenuPos.width,
                      }}
                    >
                      <strong>Columns</strong>

                      {columnSettings.map((column) => (
                        <label
                          key={column.key}
                          className="dl-column-option"
                        >
                          <input
                            type="checkbox"
                            checked={column.visible}
                            onChange={() =>
                              toggleColumn(column.key)
                            }
                          />

                          {column.label}
                        </label>
                      ))}
                    </div>,
                    document.body
                  )}
              </div>
            )}

            <button
              type="button"
              className="dl-tool"
              onClick={handleExport}
            >
              <Download size={16} />

              <span>Export</span>
            </button>

            {hasImport && (
              <div
                ref={importWrapperRef}
                className="dl-import-wrapper"
              >
                <button
                  ref={importButtonRef}
                  type="button"
                  className={[
                    "dl-import-button",
                    showImportMenu ? "active" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={toggleImportMenu}
                  disabled={loading}
                >
                  <Upload size={16} />

                  <span>Import</span>

                  <ChevronDown
                    size={15}
                    className={[
                      "dl-import-chevron",
                      showImportMenu ? "open" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  />
                </button>

                {showImportMenu &&
                  importMenuPos &&
                  createPortal(
                    <div
                      ref={importMenuRef}
                      className="dl-import-menu dl-import-menu-fixed"
                      style={{
                        top: importMenuPos.top,
                        left: importMenuPos.left,
                        width: importMenuPos.width,
                      }}
                    >
                      <button
                        type="button"
                        className="dl-import-menu-item"
                        onClick={handleDownloadTemplate}
                      >
                        <Download size={16} />

                        <span>
                          Download Template
                        </span>
                      </button>

                      <button
                        type="button"
                        className="dl-import-menu-item"
                        onClick={handleOpenUpload}
                      >
                        <Upload size={16} />

                        <span>Upload CSV</span>
                      </button>
                    </div>,
                    document.body
                  )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv,text/comma-separated-values,application/vnd.ms-excel"
                  className="dl-import-file-input"
                  onChange={handleImport}
                />
              </div>
            )}

            {onRefresh && (
              <button
                type="button"
                className="dl-tool"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw
                  size={16}
                  className={
                    loading
                      ? "dl-refresh-icon-spin"
                      : ""
                  }
                />

                <span>Refresh</span>
              </button>
            )}

            {toolbarActions}
          </div>
        </div>

        {quickFilters.length > 0 && (
          <div className="dl-quick-filters">
            {quickFilters.map((filter) => {
              const count =
                getQuickFilterCount(filter);

              const active =
                filter.value === ""
                  ? !localFilters[filter.key]
                  : localFilters[filter.key] ===
                    filter.value;

              return (
                <button
                  key={`${filter.key}-${filter.value}`}
                  type="button"
                  className={active ? "active" : ""}
                  onClick={() =>
                    handleFilterChange(
                      filter.key,
                      active ? "" : filter.value
                    )
                  }
                >
                  <span>{filter.label}</span>

                  {count !== null && (
                    <span className="dl-quick-count">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {showFilters && filters.length > 0 && (
          <div className="dl-filter-panel">
            <div className="dl-filter-header">
              <div>
                <strong>Filters</strong>

                <span>Refine your results</span>
              </div>

              {filterCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                >
                  Clear filters
                </button>
              )}
            </div>

            <div className="dl-filter-grid">
              {filters.map((filter) => (
                <div
                  className="dl-field"
                  key={filter.key}
                >
                  <label>{filter.label}</label>

                  {filter.type === "select" && (
                    <select
                      value={
                        localFilters[filter.key] || ""
                      }
                      onChange={(event) =>
                        handleFilterChange(
                          filter.key,
                          event.target.value
                        )
                      }
                    >
                      <option value="">All</option>

                      {(filter.options || []).map(
                        (option) => {
                          const value =
                            typeof option === "object"
                              ? option.value
                              : option;

                          const label =
                            typeof option === "object"
                              ? option.label
                              : option;

                          return (
                            <option
                              key={String(value)}
                              value={value}
                            >
                              {label}
                            </option>
                          );
                        }
                      )}
                    </select>
                  )}

                  {filter.type !== "select" && (
                    <input
                      type={filter.type || "text"}
                      value={
                        localFilters[filter.key] || ""
                      }
                      placeholder={
                        filter.placeholder || ""
                      }
                      onChange={(event) =>
                        handleFilterChange(
                          filter.key,
                          event.target.value
                        )
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedRows.length > 0 && (
          <div className="dl-bulk-bar">
            <div>
              <strong>{selectedRows.length}</strong>{" "}
              selected

              <button
                type="button"
                onClick={clearSelection}
              >
                Clear
              </button>
            </div>

            <div className="dl-bulk-actions">
              {bulkActions.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={
                    item.danger ? "danger" : ""
                  }
                  onClick={() =>
                    item.action(selectedData)
                  }
                >
                  {item.icon}

                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <DataListLoading
            columns={displayColumns.length}
          />
        ) : error ? (
          <div className="dl-state">
            <strong>Something went wrong</strong>

            <span>{error}</span>

            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
              >
                Try again
              </button>
            )}
          </div>
        ) : currentData.length === 0 ? (
          <div className="dl-state">
            <strong>{emptyTitle}</strong>

            <span>{emptyMessage}</span>
          </div>
        ) : (
          <>
            <div
              className={`dl-table-wrapper ${
                showCase === "box"
                  ? "dl-box-mobile"
                  : "dl-list-mobile"
              }`}
            >
              <table className="dl-table">
                <thead>
                  <tr>
                    {selectable && (
                      <th className="dl-checkbox-column">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(element) => {
                            if (element) {
                              element.indeterminate =
                                !allSelected &&
                                someSelected;
                            }
                          }}
                          onChange={selectCurrentPage}
                        />
                      </th>
                    )}

                    {displayColumns.map((column) => (
                      <th
                        key={column.key}
                        style={{
                          width: column.width,
                        }}
                      >
                        {column.sortable && sortable ? (
                          <button
                            type="button"
                            className="dl-sort"
                            onClick={() =>
                              handleSort(column.key)
                            }
                          >
                            <span>{column.label}</span>

                            <SortIcon
                              direction={
                                sort.key === column.key
                                  ? sort.direction
                                  : ""
                              }
                            />
                          </button>
                        ) : (
                          column.label
                        )}
                      </th>
                    ))}

                    {hasActions && (
                      <th className="dl-action-column">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {currentData.map((row) => (
                    <tr
                      key={row[rowKey]}
                      className={
                        getRowClassName
                          ? getRowClassName(row)
                          : ""
                      }
                    >
                      {selectable && (
                        <td className="dl-checkbox-column">
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(
                              row[rowKey]
                            )}
                            onChange={() =>
                              toggleRow(row[rowKey])
                            }
                          />
                        </td>
                      )}

                      {displayColumns.map((column) => (
                        <td key={column.key}>
                          {formatValue(
                            row[column.key],
                            column,
                            row
                          )}
                        </td>
                      ))}

                      {hasActions && (
                        <td className="dl-action-column">
                          <button
                            type="button"
                            className="dl-action-button"
                            aria-label="Open actions"
                            onClick={(event) =>
                              openActionMenu(event, row)
                            }
                          >
                            <MoreHorizontal size={18} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {showCase === "box" && (
              <div className="dl-mobile-box-list">
                {currentData.map((row) => (
                  <div
                    className="dl-mobile-card"
                    key={row[rowKey]}
                  >
                    <div className="dl-mobile-header">
                      <div>
                        <strong>
                          {formatValue(
                            row[
                              displayColumns[0]?.key
                            ],
                            displayColumns[0] || {},
                            row
                          )}
                        </strong>

                        {displayColumns[1] && (
                          <span>
                            {formatValue(
                              row[
                                displayColumns[1].key
                              ],
                              displayColumns[1],
                              row
                            )}
                          </span>
                        )}
                      </div>

                      {hasActions && (
                        <button
                          type="button"
                          className="dl-action-button"
                          onClick={(event) =>
                            openActionMenu(event, row)
                          }
                        >
                          <MoreHorizontal size={18} />
                        </button>
                      )}
                    </div>

                    <div className="dl-mobile-grid">
                      {displayColumns
                        .slice(2)
                        .map((column) => (
                          <div key={column.key}>
                            <span>{column.label}</span>

                            <strong>
                              {formatValue(
                                row[column.key],
                                column,
                                row
                              )}
                            </strong>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {pagination && !loading && total > 0 && (
          <div className="dl-pagination">
            <div className="dl-pagination-info">
              <span>
                Showing{" "}
                <strong>
                  {(currentPage - 1) * pageSize + 1}
                </strong>{" "}
                -{" "}
                <strong>
                  {Math.min(
                    currentPage * pageSize,
                    total
                  )}
                </strong>{" "}
                of <strong>{total}</strong>
              </span>

              <select
                value={pageSize}
                onChange={(event) =>
                  changePageSize(
                    event.target.value
                  )
                }
              >
                {pageSizeOptions.map((size) => (
                  <option
                    key={size}
                    value={size}
                  >
                    {size} / page
                  </option>
                ))}
              </select>
            </div>

            <div className="dl-pagination-buttons">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() =>
                  changePage(currentPage - 1)
                }
              >
                <ChevronLeft size={16} />
              </button>

              {getPageNumbers(
                currentPage,
                totalPages
              ).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={
                    item === currentPage
                      ? "active"
                      : ""
                  }
                  onClick={() => changePage(item)}
                >
                  {item}
                </button>
              ))}

              <button
                type="button"
                disabled={
                  currentPage === totalPages
                }
                onClick={() =>
                  changePage(currentPage + 1)
                }
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {actionMenu && (
        <ActionMenu
          row={actionMenu.row}
          actions={actions}
          anchor={actionMenu.anchor}
          onClose={closeActionMenu}
        />
      )}
    </div>
  );
}

function DataListLoading({
  columns = 6,
}) {
  const count = Math.max(
    3,
    Math.min(columns, 10)
  );

  return (
    <div className="dl-loading">
      <div
        className="dl-loading-head"
        style={{
          gridTemplateColumns: `repeat(${count}, minmax(100px, 1fr))`,
        }}
      >
        {Array.from(
          {
            length: count,
          },
          (_, index) => (
            <span key={index} />
          )
        )}
      </div>

      {Array.from(
        {
          length: 8,
        },
        (_, row) => (
          <div
            className="dl-loading-row"
            key={row}
            style={{
              gridTemplateColumns: `repeat(${count}, minmax(100px, 1fr))`,
            }}
          >
            {Array.from(
              {
                length: count,
              },
              (_, column) => (
                <span key={column} />
              )
            )}
          </div>
        )
      )}
    </div>
  );
}

function getPageNumbers(current, total) {
  if (total <= 5) {
    return Array.from(
      {
        length: total,
      },
      (_, index) => index + 1
    );
  }

  if (current <= 3) {
    return [
      1,
      2,
      3,
      4,
      5,
    ];
  }

  if (current >= total - 2) {
    return [
      total - 4,
      total - 3,
      total - 2,
      total - 1,
      total,
    ];
  }

  return [
    current - 2,
    current - 1,
    current,
    current + 1,
    current + 2,
  ];
}

export default DataList;