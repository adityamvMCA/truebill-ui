import { useMemo, useRef, useState } from "react";
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
    CheckCircle,
    XCircle,
    Clock,
    X,
    Plus,
    FileText,
    Columns3,
    ArrowUp,
    ArrowDown,
    ArrowUpDown,
    Copy,
    Printer,
    FileDown,
    LayoutTemplate,
    UserRound,
    Ban,
} from "lucide-react";

import "../styles/sales-orders.css";
import SalesOrderModal from "../components/SalesOrderModal";
import SalesOrderCompactModal from "../components/SalesOrderCompactModal";
import SalesOrderModal1 from "../components/SalesOrderModal1";

const initialOrders = [
    {
        id: 1,
        orderNo: "SAL01",
        orderDate: "2026-09-18",
        customer: "Shree Balaji Constructions",
        customerCode: "CU0101",
        items: 8,
        quantity: 42,
        amount: 485600,
        status: "Confirmed",
        paymentStatus: "Paid",
        deliveryStatus: "Delivered",
        salesPerson: "Aditya",
        invoiceNo: "INV01",
        deliveryNo: "DEL01",
        paymentNo: "PAY01",
    },
    {
        id: 2,
        orderNo: "SAL02",
        orderDate: "2026-09-19",
        customer: "Vijay Steel Industries",
        customerCode: "CU0102",
        items: 5,
        quantity: 28,
        amount: 328750,
        status: "Processing",
        paymentStatus: "Partial",
        deliveryStatus: "Partially Delivered",
        salesPerson: "Rahul",
        invoiceNo: "INV02",
        deliveryNo: "DEL02",
        paymentNo: "",
    },
    {
        id: 3,
        orderNo: "SAL03",
        orderDate: "2026-09-20",
        customer: "Karnataka Electricals",
        customerCode: "CU0103",
        items: 12,
        quantity: 76,
        amount: 694300,
        status: "Confirmed",
        paymentStatus: "Paid",
        deliveryStatus: "Pending",
        salesPerson: "Priya",
        invoiceNo: "INV03",
        deliveryNo: "",
        paymentNo: "PAY03",
    },
    {
        id: 4,
        orderNo: "SAL04",
        orderDate: "2026-09-21",
        customer: "Om Sai Enterprises",
        customerCode: "CU0104",
        items: 3,
        quantity: 15,
        amount: 125800,
        status: "Created",
        paymentStatus: "Pending",
        deliveryStatus: "Pending",
        salesPerson: "Aditya",
        invoiceNo: "",
        deliveryNo: "",
        paymentNo: "",
    },
    {
        id: 5,
        orderNo: "SAL05",
        orderDate: "2026-09-22",
        customer: "Bagalkot Machinery Works",
        customerCode: "CU0105",
        items: 7,
        quantity: 34,
        amount: 562400,
        status: "Delivered",
        paymentStatus: "Paid",
        deliveryStatus: "Delivered",
        salesPerson: "Rahul",
        invoiceNo: "INV05",
        deliveryNo: "DEL05",
        paymentNo: "PAY05",
    },
    {
        id: 6,
        orderNo: "SAL06",
        orderDate: "2026-09-23",
        customer: "Srinivas Hardware",
        customerCode: "CU0106",
        items: 6,
        quantity: 31,
        amount: 198750,
        status: "Confirmed",
        paymentStatus: "Partial",
        deliveryStatus: "Pending",
        salesPerson: "Priya",
        invoiceNo: "INV06",
        deliveryNo: "",
        paymentNo: "PAY06",
    },
    {
        id: 7,
        orderNo: "SAL07",
        orderDate: "2026-09-24",
        customer: "Shivam Traders",
        customerCode: "CU0107",
        items: 10,
        quantity: 58,
        amount: 745900,
        status: "Processing",
        paymentStatus: "Pending",
        deliveryStatus: "Pending",
        salesPerson: "Aditya",
        invoiceNo: "INV07",
        deliveryNo: "",
        paymentNo: "",
    },
    {
        id: 8,
        orderNo: "SAL08",
        orderDate: "2026-09-25",
        customer: "Lakshmi Building Materials",
        customerCode: "CU0108",
        items: 4,
        quantity: 22,
        amount: 174600,
        status: "Confirmed",
        paymentStatus: "Paid",
        deliveryStatus: "Partially Delivered",
        salesPerson: "Rahul",
        invoiceNo: "INV08",
        deliveryNo: "DEL08",
        paymentNo: "PAY08",
    },
    {
        id: 9,
        orderNo: "SAL09",
        orderDate: "2026-09-26",
        customer: "Mahalaxmi Agencies",
        customerCode: "CU0109",
        items: 9,
        quantity: 47,
        amount: 389500,
        status: "Delivered",
        paymentStatus: "Paid",
        deliveryStatus: "Delivered",
        salesPerson: "Priya",
        invoiceNo: "INV09",
        deliveryNo: "DEL09",
        paymentNo: "PAY09",
    },
    {
        id: 10,
        orderNo: "SAL10",
        orderDate: "2026-09-27",
        customer: "Shree Ganesh Industries",
        customerCode: "CU0110",
        items: 14,
        quantity: 63,
        amount: 826400,
        status: "Confirmed",
        paymentStatus: "Partial",
        deliveryStatus: "Pending",
        salesPerson: "Aditya",
        invoiceNo: "INV10",
        deliveryNo: "",
        paymentNo: "PAY10",
    },
    {
        id: 11,
        orderNo: "SAL11",
        orderDate: "2026-09-28",
        customer: "Venkateshwara Traders",
        customerCode: "CU0111",
        items: 5,
        quantity: 26,
        amount: 215700,
        status: "Created",
        paymentStatus: "Pending",
        deliveryStatus: "Pending",
        salesPerson: "Rahul",
        invoiceNo: "",
        deliveryNo: "",
        paymentNo: "",
    },
    {
        id: 12,
        orderNo: "SAL12",
        orderDate: "2026-09-29",
        customer: "National Hardware Mart",
        customerCode: "CU0112",
        items: 11,
        quantity: 54,
        amount: 618900,
        status: "Processing",
        paymentStatus: "Partial",
        deliveryStatus: "Partially Delivered",
        salesPerson: "Priya",
        invoiceNo: "INV12",
        deliveryNo: "DEL12",
        paymentNo: "PAY12",
    },
    {
        id: 13,
        orderNo: "SAL13",
        orderDate: "2026-09-30",
        customer: "Basaveshwar Agencies",
        customerCode: "CU0113",
        items: 6,
        quantity: 33,
        amount: 274500,
        status: "Delivered",
        paymentStatus: "Paid",
        deliveryStatus: "Delivered",
        salesPerson: "Aditya",
        invoiceNo: "INV13",
        deliveryNo: "DEL13",
        paymentNo: "PAY13",
    },
    {
        id: 14,
        orderNo: "SAL14",
        orderDate: "2026-10-01",
        customer: "Sahyadri Engineering Works",
        customerCode: "CU0114",
        items: 8,
        quantity: 41,
        amount: 456800,
        status: "Confirmed",
        paymentStatus: "Paid",
        deliveryStatus: "Pending",
        salesPerson: "Rahul",
        invoiceNo: "INV14",
        deliveryNo: "",
        paymentNo: "PAY14",
    },
    {
        id: 15,
        orderNo: "SAL15",
        orderDate: "2026-10-02",
        customer: "Bharat Industrial Suppliers",
        customerCode: "CU0115",
        items: 13,
        quantity: 69,
        amount: 912500,
        status: "Cancelled",
        paymentStatus: "Refunded",
        deliveryStatus: "Cancelled",
        salesPerson: "Priya",
        invoiceNo: "",
        deliveryNo: "",
        paymentNo: "PAY15",
    },
];

const defaultColumns = [
    {
        key: "orderNo",
        label: "Order No",
        visible: true,
    },
    {
        key: "orderDate",
        label: "Order Date",
        visible: true,
    },
    {
        key: "customer",
        label: "Customer",
        visible: true,
    },
    {
        key: "items",
        label: "Items",
        visible: true,
    },
    {
        key: "quantity",
        label: "Quantity",
        visible: true,
    },
    {
        key: "amount",
        label: "Amount",
        visible: true,
    },
    {
        key: "status",
        label: "Status",
        visible: true,
    },
    {
        key: "paymentStatus",
        label: "Payment",
        visible: true,
    },
    {
        key: "deliveryStatus",
        label: "Delivery",
        visible: true,
    },
    {
        key: "salesPerson",
        label: "Sales Person",
        visible: false,
    },
];

const statusOptions = [
    "Created",
    "Confirmed",
    "Processing",
    "Delivered",
    "Cancelled",
];

const customers = [
    "Shree Balaji Constructions",
    "Vijay Steel Industries",
    "Karnataka Electricals",
    "Om Sai Enterprises",
    "Bagalkot Machinery Works",
    "Srinivas Hardware",
    "Shivam Traders",
    "Lakshmi Building Materials",
    "Mahalaxmi Agencies",
    "Shree Ganesh Industries",
    "Venkateshwara Traders",
    "National Hardware Mart",
    "Basaveshwar Agencies",
    "Sahyadri Engineering Works",
    "Bharat Industrial Suppliers",
];

const salesPersons = [
    "Aditya",
    "Rahul",
    "Priya",
];

function formatCurrency(value) {
    return `₹${Number(value).toLocaleString("en-IN")}`;
}

function formatDate(value) {
    if (!value) return "-";

    const date = new Date(`${value}T00:00:00`);

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function StatusBadge({ status }) {
    const normalized = String(status)
        .toLowerCase()
        .replace(/\s+/g, "-");

    let icon = null;

    if (
        status === "Confirmed" ||
        status === "Delivered" ||
        status === "Paid"
    ) {
        icon = <CheckCircle size={13} />;
    }

    if (
        status === "Cancelled" ||
        status === "Refunded"
    ) {
        icon = <XCircle size={13} />;
    }

    if (
        status === "Processing" ||
        status === "Partial"
    ) {
        icon = <Clock size={13} />;
    }

    return (
        <span
            className={`so-status so-status-${normalized}`}
        >
            {icon}
            {status}
        </span>
    );
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

function SalesOrders() {
    const [orders, setOrders] =
        useState(initialOrders);

    const [showSalesOrderModal, setShowSalesOrderModal] = useState(false);

    const [search, setSearch] =
        useState("");

    const [activeStatus, setActiveStatus] =
        useState("All");

    const [filters, setFilters] =
        useState({
            customer: "",
            paymentStatus: "",
            deliveryStatus: "",
            salesPerson: "",
            fromDate: "",
            toDate: "",
            minAmount: "",
            maxAmount: "",
        });

    const [showFilters, setShowFilters] =
        useState(false);

    const [showColumns, setShowColumns] =
        useState(false);

    const [showBulkMenu, setShowBulkMenu] =
        useState(false);

    const [showAssignMenu, setShowAssignMenu] =
        useState(false);

    const [columns, setColumns] =
        useState(() => {
            try {
                const saved =
                    localStorage.getItem(
                        "trustiq-sales-order-columns"
                    );

                return saved
                    ? JSON.parse(saved)
                    : defaultColumns;
            } catch {
                return defaultColumns;
            }
        });

    const [selectedRows, setSelectedRows] =
        useState([]);

    const [page, setPage] =
        useState(1);

    const [pageSize, setPageSize] =
        useState(10);

    const [sort, setSort] =
        useState({
            key: "orderDate",
            direction: "desc",
        });

    const [openAction, setOpenAction] =
        useState(null);

    const fileInputRef =
        useRef(null);

    const filteredOrders = useMemo(() => {
        const result = orders.filter(
            (order) => {
                const searchValue =
                    search
                        .toLowerCase()
                        .trim();

                const matchesSearch =
                    !searchValue ||
                    order.orderNo
                        .toLowerCase()
                        .includes(searchValue) ||
                    order.customer
                        .toLowerCase()
                        .includes(searchValue) ||
                    order.customerCode
                        .toLowerCase()
                        .includes(searchValue) ||
                    order.salesPerson
                        .toLowerCase()
                        .includes(searchValue);

                const matchesStatus =
                    activeStatus === "All" ||
                    order.status ===
                    activeStatus;

                const matchesCustomer =
                    !filters.customer ||
                    order.customer ===
                    filters.customer;

                const matchesPayment =
                    !filters.paymentStatus ||
                    order.paymentStatus ===
                    filters.paymentStatus;

                const matchesDelivery =
                    !filters.deliveryStatus ||
                    order.deliveryStatus ===
                    filters.deliveryStatus;

                const matchesSalesPerson =
                    !filters.salesPerson ||
                    order.salesPerson ===
                    filters.salesPerson;

                const matchesFromDate =
                    !filters.fromDate ||
                    order.orderDate >=
                    filters.fromDate;

                const matchesToDate =
                    !filters.toDate ||
                    order.orderDate <=
                    filters.toDate;

                const matchesMinAmount =
                    !filters.minAmount ||
                    order.amount >=
                    Number(
                        filters.minAmount
                    );

                const matchesMaxAmount =
                    !filters.maxAmount ||
                    order.amount <=
                    Number(
                        filters.maxAmount
                    );

                return (
                    matchesSearch &&
                    matchesStatus &&
                    matchesCustomer &&
                    matchesPayment &&
                    matchesDelivery &&
                    matchesSalesPerson &&
                    matchesFromDate &&
                    matchesToDate &&
                    matchesMinAmount &&
                    matchesMaxAmount
                );
            }
        );

        result.sort((a, b) => {
            const valueA =
                a[sort.key];

            const valueB =
                b[sort.key];

            if (
                typeof valueA ===
                "number"
            ) {
                return sort.direction ===
                    "asc"
                    ? valueA - valueB
                    : valueB - valueA;
            }

            const first =
                String(
                    valueA ?? ""
                ).toLowerCase();

            const second =
                String(
                    valueB ?? ""
                ).toLowerCase();

            if (first < second) {
                return sort.direction ===
                    "asc"
                    ? -1
                    : 1;
            }

            if (first > second) {
                return sort.direction ===
                    "asc"
                    ? 1
                    : -1;
            }

            return 0;
        });

        return result;
    }, [
        orders,
        search,
        activeStatus,
        filters,
        sort,
    ]);

    const totalPages = Math.max(
        1,
        Math.ceil(
            filteredOrders.length /
            pageSize
        )
    );

    const currentPage = Math.min(
        page,
        totalPages
    );

    const startIndex =
        (currentPage - 1) *
        pageSize;

    const currentOrders =
        filteredOrders.slice(
            startIndex,
            startIndex + pageSize
        );

    const visibleColumns =
        columns.filter(
            (column) =>
                column.visible
        );

    const currentIds =
        currentOrders.map(
            (order) => order.id
        );

    const allCurrentPageSelected =
        currentOrders.length > 0 &&
        currentOrders.every(
            (order) =>
                selectedRows.includes(
                    order.id
                )
        );

    const someCurrentPageSelected =
        currentOrders.some(
            (order) =>
                selectedRows.includes(
                    order.id
                )
        );

    const selectedOrders =
        orders.filter((order) =>
            selectedRows.includes(
                order.id
            )
        );

    const updateColumns = (
        updated
    ) => {
        setColumns(updated);

        localStorage.setItem(
            "trustiq-sales-order-columns",
            JSON.stringify(updated)
        );
    };

    const toggleColumn = (
        key
    ) => {
        const updated =
            columns.map(
                (column) =>
                    column.key === key
                        ? {
                            ...column,
                            visible:
                                !column.visible,
                        }
                        : column
            );

        updateColumns(updated);
    };

    const handleSort = (
        key
    ) => {
        setSort((previous) => {
            if (previous.key !== key) {
                return {
                    key,
                    direction: "asc",
                };
            }

            if (
                previous.direction ===
                "asc"
            ) {
                return {
                    key,
                    direction: "desc",
                };
            }

            return {
                key: "orderDate",
                direction: "desc",
            };
        });
    };

    const updateFilter = (
        key,
        value
    ) => {
        setFilters((previous) => ({
            ...previous,
            [key]: value,
        }));

        setPage(1);
    };

    const clearFilters = () => {
        setFilters({
            customer: "",
            paymentStatus: "",
            deliveryStatus: "",
            salesPerson: "",
            fromDate: "",
            toDate: "",
            minAmount: "",
            maxAmount: "",
        });

        setSearch("");
        setActiveStatus("All");
        setPage(1);
    };

    const selectAllCurrentPage =
        () => {
            if (
                allCurrentPageSelected
            ) {
                setSelectedRows(
                    (previous) =>
                        previous.filter(
                            (id) =>
                                !currentIds.includes(
                                    id
                                )
                        )
                );
            } else {
                setSelectedRows(
                    (previous) => [
                        ...new Set([
                            ...previous,
                            ...currentIds,
                        ]),
                    ]
                );
            }
        };

    const toggleRow = (id) => {
        setSelectedRows(
            (previous) =>
                previous.includes(id)
                    ? previous.filter(
                        (rowId) =>
                            rowId !== id
                    )
                    : [...previous, id]
        );
    };

    const clearSelection = () => {
        setSelectedRows([]);
    };

    const handleRefresh = () => {
        setOrders([
            ...initialOrders,
        ]);

        setSelectedRows([]);
        setPage(1);
        setSearch("");
        setActiveStatus("All");
        clearFilters();
    };

    const handleBulkStatus = (
        status
    ) => {
        setOrders((previous) =>
            previous.map((order) =>
                selectedRows.includes(
                    order.id
                )
                    ? {
                        ...order,
                        status,
                    }
                    : order
            )
        );

        clearSelection();
        setShowBulkMenu(false);
    };

    const handleAssignSalesPerson =
        (salesPerson) => {
            setOrders((previous) =>
                previous.map((order) =>
                    selectedRows.includes(
                        order.id
                    )
                        ? {
                            ...order,
                            salesPerson,
                        }
                        : order
                )
            );

            clearSelection();
            setShowAssignMenu(false);
        };

    const handleDeleteSelected =
        () => {
            if (!selectedRows.length) {
                return;
            }

            const confirmed =
                window.confirm(
                    `Delete ${selectedRows.length} selected order(s)?`
                );

            if (!confirmed) return;

            setOrders((previous) =>
                previous.filter(
                    (order) =>
                        !selectedRows.includes(
                            order.id
                        )
                )
            );

            clearSelection();
        };

    const getNextOrderNo = () => {
        const numbers = orders
            .map((order) =>
                Number(
                    order.orderNo.replace(
                        "SAL",
                        ""
                    )
                )
            )
            .filter((number) =>
                Number.isFinite(number)
            );

        const nextNumber =
            Math.max(
                0,
                ...numbers
            ) + 1;

        return `SAL${String(
            nextNumber
        ).padStart(2, "0")}`;
    };

    const duplicateOrder = (
        order
    ) => {
        const duplicated = {
            ...order,
            id:
                Date.now(),
            orderNo:
                getNextOrderNo(),
            orderDate:
                new Date()
                    .toISOString()
                    .slice(0, 10),
            status: "Created",
            paymentStatus:
                "Pending",
            deliveryStatus:
                "Pending",
            invoiceNo: "",
            deliveryNo: "",
            paymentNo: "",
        };

        setOrders((previous) => [
            duplicated,
            ...previous,
        ]);

        setOpenAction(null);
    };

    const deleteOrder = (
        order
    ) => {
        const confirmed =
            window.confirm(
                `Delete ${order.orderNo}?`
            );

        if (!confirmed) {
            return;
        }

        setOrders((previous) =>
            previous.filter(
                (item) =>
                    item.id !== order.id
            )
        );

        setOpenAction(null);
    };

    const handleExport = (
        rows = filteredOrders
    ) => {
        const headers = [
            "Order No",
            "Order Date",
            "Customer",
            "Customer Code",
            "Items",
            "Quantity",
            "Amount",
            "Status",
            "Payment Status",
            "Delivery Status",
            "Sales Person",
            "Invoice No",
            "Delivery No",
            "Payment No",
        ];

        const data = rows.map(
            (order) => [
                order.orderNo,
                order.orderDate,
                order.customer,
                order.customerCode,
                order.items,
                order.quantity,
                order.amount,
                order.status,
                order.paymentStatus,
                order.deliveryStatus,
                order.salesPerson,
                order.invoiceNo,
                order.deliveryNo,
                order.paymentNo,
            ]
        );

        const csv = [
            headers,
            ...data,
        ]
            .map((row) =>
                row
                    .map((value) =>
                        `"${String(
                            value ?? ""
                        ).replace(
                            /"/g,
                            '""'
                        )}"`
                    )
                    .join(",")
            )
            .join("\n");

        const blob = new Blob(
            [csv],
            {
                type: "text/csv;charset=utf-8;",
            }
        );

        const url =
            URL.createObjectURL(
                blob
            );

        const link =
            document.createElement(
                "a"
            );

        link.href = url;

        link.download =
            "sales-orders.csv";

        link.click();

        URL.revokeObjectURL(url);
    };

    const downloadTemplate =
        () => {
            const headers = [
                "orderNo",
                "orderDate",
                "customer",
                "customerCode",
                "items",
                "quantity",
                "amount",
                "status",
                "paymentStatus",
                "deliveryStatus",
                "salesPerson",
            ];

            const sample = [
                "SAL16",
                "2026-10-06",
                "Sample Customer",
                "CU0116",
                "5",
                "20",
                "150000",
                "Created",
                "Pending",
                "Pending",
                "Aditya",
            ];

            const csv = [
                headers,
                sample,
            ]
                .map((row) =>
                    row.join(",")
                )
                .join("\n");

            const blob = new Blob(
                [csv],
                {
                    type: "text/csv;charset=utf-8;",
                }
            );

            const url =
                URL.createObjectURL(
                    blob
                );

            const link =
                document.createElement(
                    "a"
                );

            link.href = url;

            link.download =
                "sales-order-import-template.csv";

            link.click();

            URL.revokeObjectURL(url);
        };

    const handleBulkUpload = (
        event
    ) => {
        const file =
            event.target.files?.[0];

        if (!file) return;

        const reader =
            new FileReader();

        reader.onload = (e) => {
            const text =
                e.target?.result;

            if (
                typeof text !==
                "string"
            ) {
                return;
            }

            const lines = text
                .split(/\r?\n/)
                .filter((line) =>
                    line.trim()
                );

            if (lines.length < 2) {
                alert(
                    "CSV file does not contain data."
                );
                return;
            }

            const headers =
                lines[0]
                    .split(",")
                    .map((header) =>
                        header
                            .replace(
                                /^"|"$/g,
                                ""
                            )
                            .trim()
                    );

            const importedOrders =
                [];

            const errors = [];

            lines
                .slice(1)
                .forEach(
                    (
                        line,
                        index
                    ) => {
                        const values =
                            line
                                .split(",")
                                .map(
                                    (value) =>
                                        value
                                            .replace(
                                                /^"|"$/g,
                                                ""
                                            )
                                            .trim()
                                );

                        const row = {};

                        headers.forEach(
                            (
                                header,
                                headerIndex
                            ) => {
                                row[header] =
                                    values[
                                    headerIndex
                                    ] || "";
                            }
                        );

                        const rowNumber =
                            index + 2;

                        const customer =
                            row.customer ||
                            row.Customer;

                        const amount =
                            row.amount ||
                            row.Amount;

                        const orderDate =
                            row.orderDate ||
                            row["Order Date"];

                        if (!customer) {
                            errors.push(
                                `Row ${rowNumber}: Customer is required`
                            );

                            return;
                        }

                        if (!orderDate) {
                            errors.push(
                                `Row ${rowNumber}: Order date is required`
                            );

                            return;
                        }

                        if (
                            amount &&
                            Number.isNaN(
                                Number(amount)
                            )
                        ) {
                            errors.push(
                                `Row ${rowNumber}: Invalid amount`
                            );

                            return;
                        }

                        importedOrders.push(
                            {
                                id:
                                    Date.now() +
                                    index,

                                orderNo:
                                    row.orderNo ||
                                    row["Order No"] ||
                                    getNextOrderNo(),

                                orderDate,

                                customer,

                                customerCode:
                                    row.customerCode ||
                                    row["Customer Code"] ||
                                    "",

                                items: Number(
                                    row.items ||
                                    row.Items ||
                                    0
                                ),

                                quantity: Number(
                                    row.quantity ||
                                    row.Quantity ||
                                    0
                                ),

                                amount: Number(
                                    amount || 0
                                ),

                                status:
                                    statusOptions.includes(
                                        row.status ||
                                        row.Status
                                    )
                                        ? row.status ||
                                        row.Status
                                        : "Created",

                                paymentStatus:
                                    row.paymentStatus ||
                                    row["Payment Status"] ||
                                    "Pending",

                                deliveryStatus:
                                    row.deliveryStatus ||
                                    row["Delivery Status"] ||
                                    "Pending",

                                salesPerson:
                                    row.salesPerson ||
                                    row["Sales Person"] ||
                                    "Aditya",

                                invoiceNo: "",

                                deliveryNo: "",

                                paymentNo: "",
                            }
                        );
                    }
                );

            if (
                importedOrders.length
            ) {
                setOrders((previous) => [
                    ...importedOrders,
                    ...previous,
                ]);

                setPage(1);
            }

            let message = `${importedOrders.length} order(s) imported successfully.`;

            if (errors.length) {
                message += `\n\n${errors.length} row(s) failed:\n${errors
                    .slice(0, 10)
                    .join("\n")}`;
            }

            alert(message);
        };

        reader.readAsText(file);

        event.target.value = "";
    };

    const printOrder = (
        order
    ) => {
        const printWindow =
            window.open(
                "",
                "_blank",
                "width=900,height=700"
            );

        if (!printWindow) {
            return;
        }

        printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${order.orderNo}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              color: #111827;
            }

            h1 {
              margin: 0 0 5px;
            }

            .subtitle {
              color: #64748b;
              margin-bottom: 30px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 25px;
            }

            th,
            td {
              padding: 10px;
              border: 1px solid #e2e8f0;
              text-align: left;
            }

            th {
              background: #f8fafc;
            }

            .amount {
              font-size: 20px;
              font-weight: bold;
            }
          </style>
        </head>

        <body>
          <h1>Sales Order</h1>
          <div class="subtitle">
            ${order.orderNo}
          </div>

          <table>
            <tr>
              <th>Order No</th>
              <td>${order.orderNo}</td>
            </tr>

            <tr>
              <th>Order Date</th>
              <td>${formatDate(
            order.orderDate
        )}</td>
            </tr>

            <tr>
              <th>Customer</th>
              <td>${order.customer}</td>
            </tr>

            <tr>
              <th>Customer Code</th>
              <td>${order.customerCode}</td>
            </tr>

            <tr>
              <th>Items</th>
              <td>${order.items}</td>
            </tr>

            <tr>
              <th>Quantity</th>
              <td>${order.quantity}</td>
            </tr>

            <tr>
              <th>Amount</th>
              <td class="amount">
                ${formatCurrency(
            order.amount
        )}
              </td>
            </tr>

            <tr>
              <th>Status</th>
              <td>${order.status}</td>
            </tr>

            <tr>
              <th>Payment</th>
              <td>${order.paymentStatus}</td>
            </tr>

            <tr>
              <th>Delivery</th>
              <td>${order.deliveryStatus}</td>
            </tr>

            <tr>
              <th>Sales Person</th>
              <td>${order.salesPerson}</td>
            </tr>
          </table>

          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

        printWindow.document.close();

        setOpenAction(null);
    };

    const renderCell = (
        order,
        column
    ) => {
        switch (column.key) {
            case "orderNo":
                return (
                    <div className="so-order-number">
                        {order.orderNo}
                    </div>
                );

            case "orderDate":
                return formatDate(
                    order.orderDate
                );

            case "customer":
                return (
                    <div className="so-customer-cell">
                        <strong>
                            {order.customer}
                        </strong>

                        <span>
                            {order.customerCode}
                        </span>
                    </div>
                );

            case "items":
                return order.items;

            case "quantity":
                return order.quantity;

            case "amount":
                return (
                    <strong className="so-amount">
                        {formatCurrency(
                            order.amount
                        )}
                    </strong>
                );

            case "status":
                return (
                    <StatusBadge
                        status={order.status}
                    />
                );

            case "paymentStatus":
                return (
                    <StatusBadge
                        status={
                            order.paymentStatus
                        }
                    />
                );

            case "deliveryStatus":
                return (
                    <StatusBadge
                        status={
                            order.deliveryStatus
                        }
                    />
                );

            case "salesPerson":
                return order.salesPerson;

            default:
                return "-";
        }
    };

    return (
        <div className="sales-orders-page">
            <div className="so-page-header">
                <div>
                    <div className="so-breadcrumb">
                        Sales
                        <ChevronRight size={14} />
                        Sales Orders
                    </div>

                    <h1>Sales Orders</h1>

                    <p>
                        Manage and track all sales
                        orders
                    </p>
                </div>

                <button
                    type="button"
                    className="sales-orders-primary-btn"
                    onClick={() => setShowSalesOrderModal(true)}
                >
                    <Plus size={16} />
                    New Sales Order
                </button>
            </div>

            <div className="so-card">
                <div className="so-toolbar">
                    <div className="so-search-box">
                        <Search size={17} />

                        <input
                            type="text"
                            placeholder="Search order no, customer, code..."
                            value={search}
                            onChange={(e) => {
                                setSearch(
                                    e.target.value
                                );
                                setPage(1);
                            }}
                        />

                        {search && (
                            <button
                                type="button"
                                className="so-search-clear"
                                onClick={() => {
                                    setSearch("");
                                    setPage(1);
                                }}
                            >
                                <X size={15} />
                            </button>
                        )}
                    </div>

                    <div className="so-toolbar-actions">
                        <button
                            type="button"
                            className={`so-tool-button ${showFilters
                                ? "active"
                                : ""
                                }`}
                            onClick={() =>
                                setShowFilters(
                                    (previous) =>
                                        !previous
                                )
                            }
                        >
                            <Filter size={16} />
                            Filters

                            {Object.values(
                                filters
                            ).filter(Boolean)
                                .length > 0 && (
                                    <span className="so-filter-count">
                                        {
                                            Object.values(
                                                filters
                                            ).filter(
                                                Boolean
                                            ).length
                                        }
                                    </span>
                                )}
                        </button>

                        <div className="so-dropdown-wrapper">
                            <button
                                type="button"
                                className={`so-tool-button ${showColumns
                                    ? "active"
                                    : ""
                                    }`}
                                onClick={() =>
                                    setShowColumns(
                                        (previous) =>
                                            !previous
                                    )
                                }
                            >
                                <Columns3 size={16} />
                                Columns
                            </button>

                            {showColumns && (
                                <div className="so-dropdown so-columns-dropdown">
                                    <div className="so-dropdown-title">
                                        Show Columns
                                    </div>

                                    {columns.map(
                                        (column) => (
                                            <label
                                                key={
                                                    column.key
                                                }
                                                className="so-column-option"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        column.visible
                                                    }
                                                    onChange={() =>
                                                        toggleColumn(
                                                            column.key
                                                        )
                                                    }
                                                />

                                                <span>
                                                    {
                                                        column.label
                                                    }
                                                </span>
                                            </label>
                                        )
                                    )}
                                </div>
                            )}
                        </div>

                        <button
                            type="button"
                            className="so-tool-button"
                            onClick={() =>
                                handleExport(
                                    selectedRows.length
                                        ? selectedOrders
                                        : filteredOrders
                                )
                            }
                        >
                            <Download size={16} />

                            {selectedRows.length
                                ? "Export Selected"
                                : "Export"}
                        </button>

                        <button
                            type="button"
                            className="so-tool-button"
                            onClick={
                                handleRefresh
                            }
                        >
                            <RefreshCw size={16} />
                            Refresh
                        </button>

                        <div className="so-dropdown-wrapper">
                            <button
                                type="button"
                                className="so-tool-button"
                                onClick={() =>
                                    setShowBulkMenu(
                                        (previous) =>
                                            !previous
                                    )
                                }
                            >
                                <Upload size={16} />
                                Import
                                <ChevronDown
                                    size={14}
                                />
                            </button>

                            {showBulkMenu && (
                                <div className="so-dropdown so-import-dropdown">
                                    <button
                                        type="button"
                                        onClick={
                                            downloadTemplate
                                        }
                                    >
                                        <LayoutTemplate
                                            size={15}
                                        />
                                        Download Template
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            fileInputRef.current?.click()
                                        }
                                    >
                                        <Upload
                                            size={15}
                                        />
                                        Upload CSV
                                    </button>
                                </div>
                            )}
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            hidden
                            onChange={
                                handleBulkUpload
                            }
                        />
                    </div>
                </div>

                <div className="so-quick-filters">
                    <button
                        type="button"
                        className={
                            activeStatus === "All"
                                ? "active"
                                : ""
                        }
                        onClick={() => {
                            setActiveStatus("All");
                            setPage(1);
                        }}
                    >
                        All
                        <span>
                            {orders.length}
                        </span>
                    </button>

                    {statusOptions.map(
                        (status) => {
                            const count =
                                orders.filter(
                                    (order) =>
                                        order.status ===
                                        status
                                ).length;

                            return (
                                <button
                                    type="button"
                                    key={status}
                                    className={
                                        activeStatus ===
                                            status
                                            ? "active"
                                            : ""
                                    }
                                    onClick={() => {
                                        setActiveStatus(
                                            status
                                        );
                                        setPage(1);
                                    }}
                                >
                                    {status}
                                    <span>
                                        {count}
                                    </span>
                                </button>
                            );
                        }
                    )}
                </div>

                {showFilters && (
                    <div className="so-filter-panel">
                        <div className="so-filter-header">
                            <div>
                                <strong>
                                    Advanced Filters
                                </strong>

                                <span>
                                    Filter sales orders using
                                    multiple conditions
                                </span>
                            </div>

                            <button
                                type="button"
                                className="so-clear-filter"
                                onClick={
                                    clearFilters
                                }
                            >
                                Clear All
                            </button>
                        </div>

                        <div className="so-filter-grid">
                            <div className="so-field">
                                <label>
                                    Customer
                                </label>

                                <select
                                    value={
                                        filters.customer
                                    }
                                    onChange={(e) =>
                                        updateFilter(
                                            "customer",
                                            e.target.value
                                        )
                                    }
                                >
                                    <option value="">
                                        All Customers
                                    </option>

                                    {customers.map(
                                        (customer) => (
                                            <option
                                                key={customer}
                                                value={customer}
                                            >
                                                {customer}
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>

                            <div className="so-field">
                                <label>
                                    Payment
                                </label>

                                <select
                                    value={
                                        filters.paymentStatus
                                    }
                                    onChange={(e) =>
                                        updateFilter(
                                            "paymentStatus",
                                            e.target.value
                                        )
                                    }
                                >
                                    <option value="">
                                        All Payment
                                    </option>

                                    <option value="Paid">
                                        Paid
                                    </option>

                                    <option value="Partial">
                                        Partial
                                    </option>

                                    <option value="Pending">
                                        Pending
                                    </option>

                                    <option value="Refunded">
                                        Refunded
                                    </option>
                                </select>
                            </div>

                            <div className="so-field">
                                <label>
                                    Delivery
                                </label>

                                <select
                                    value={
                                        filters.deliveryStatus
                                    }
                                    onChange={(e) =>
                                        updateFilter(
                                            "deliveryStatus",
                                            e.target.value
                                        )
                                    }
                                >
                                    <option value="">
                                        All Delivery
                                    </option>

                                    <option value="Pending">
                                        Pending
                                    </option>

                                    <option value="Partially Delivered">
                                        Partially Delivered
                                    </option>

                                    <option value="Delivered">
                                        Delivered
                                    </option>

                                    <option value="Cancelled">
                                        Cancelled
                                    </option>
                                </select>
                            </div>

                            <div className="so-field">
                                <label>
                                    Sales Person
                                </label>

                                <select
                                    value={
                                        filters.salesPerson
                                    }
                                    onChange={(e) =>
                                        updateFilter(
                                            "salesPerson",
                                            e.target.value
                                        )
                                    }
                                >
                                    <option value="">
                                        All Sales Persons
                                    </option>

                                    {salesPersons.map(
                                        (person) => (
                                            <option
                                                key={person}
                                                value={person}
                                            >
                                                {person}
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>

                            <div className="so-field">
                                <label>
                                    From Date
                                </label>

                                <input
                                    type="date"
                                    value={
                                        filters.fromDate
                                    }
                                    onChange={(e) =>
                                        updateFilter(
                                            "fromDate",
                                            e.target.value
                                        )
                                    }
                                />
                            </div>

                            <div className="so-field">
                                <label>
                                    To Date
                                </label>

                                <input
                                    type="date"
                                    value={
                                        filters.toDate
                                    }
                                    onChange={(e) =>
                                        updateFilter(
                                            "toDate",
                                            e.target.value
                                        )
                                    }
                                />
                            </div>

                            <div className="so-field">
                                <label>
                                    Minimum Amount
                                </label>

                                <input
                                    type="number"
                                    placeholder="₹ Minimum"
                                    value={
                                        filters.minAmount
                                    }
                                    onChange={(e) =>
                                        updateFilter(
                                            "minAmount",
                                            e.target.value
                                        )
                                    }
                                />
                            </div>

                            <div className="so-field">
                                <label>
                                    Maximum Amount
                                </label>

                                <input
                                    type="number"
                                    placeholder="₹ Maximum"
                                    value={
                                        filters.maxAmount
                                    }
                                    onChange={(e) =>
                                        updateFilter(
                                            "maxAmount",
                                            e.target.value
                                        )
                                    }
                                />
                            </div>
                        </div>
                    </div>
                )}

                {selectedRows.length > 0 && (
                    <div className="so-bulk-bar">
                        <div className="so-selected-info">
                            <CheckCircle size={17} />

                            <strong>
                                {selectedRows.length}
                            </strong>

                            <span>
                                selected
                            </span>

                            <button
                                type="button"
                                onClick={
                                    clearSelection
                                }
                            >
                                Clear
                            </button>
                        </div>

                        <div className="so-bulk-actions">
                            <div className="so-dropdown-wrapper">
                                <button
                                    type="button"
                                    className="so-tool-button"
                                    onClick={() =>
                                        setShowBulkMenu(
                                            (previous) =>
                                                !previous
                                        )
                                    }
                                >
                                    Status
                                    <ChevronDown
                                        size={14}
                                    />
                                </button>

                                {showBulkMenu && (
                                    <div className="so-dropdown">
                                        {statusOptions.map(
                                            (status) => (
                                                <button
                                                    type="button"
                                                    key={status}
                                                    onClick={() =>
                                                        handleBulkStatus(
                                                            status
                                                        )
                                                    }
                                                >
                                                    <CheckCircle
                                                        size={14}
                                                    />
                                                    {status}
                                                </button>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="so-dropdown-wrapper">
                                <button
                                    type="button"
                                    className="so-tool-button"
                                    onClick={() =>
                                        setShowAssignMenu(
                                            (previous) =>
                                                !previous
                                        )
                                    }
                                >
                                    <UserRound size={14} />
                                    Assign
                                    <ChevronDown
                                        size={14}
                                    />
                                </button>

                                {showAssignMenu && (
                                    <div className="so-dropdown">
                                        {salesPersons.map(
                                            (person) => (
                                                <button
                                                    type="button"
                                                    key={person}
                                                    onClick={() =>
                                                        handleAssignSalesPerson(
                                                            person
                                                        )
                                                    }
                                                >
                                                    <UserRound
                                                        size={14}
                                                    />
                                                    {person}
                                                </button>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>

                            <button
                                type="button"
                                className="so-tool-button"
                                onClick={() =>
                                    handleExport(
                                        selectedOrders
                                    )
                                }
                            >
                                <Download size={14} />
                                Export
                            </button>

                            <button
                                type="button"
                                className="so-tool-button danger"
                                onClick={
                                    handleDeleteSelected
                                }
                            >
                                <Trash2 size={14} />
                                Delete
                            </button>
                        </div>
                    </div>
                )}

                <div className="so-table-wrapper">
                    <table className="so-table">
                        <thead>
                            <tr>
                                <th className="so-checkbox-column">
                                    <input
                                        type="checkbox"
                                        checked={
                                            allCurrentPageSelected
                                        }
                                        ref={(element) => {
                                            if (element) {
                                                element.indeterminate =
                                                    !allCurrentPageSelected &&
                                                    someCurrentPageSelected;
                                            }
                                        }}
                                        onChange={
                                            selectAllCurrentPage
                                        }
                                    />
                                </th>

                                {visibleColumns.map(
                                    (column) => (
                                        <th
                                            key={
                                                column.key
                                            }
                                        >
                                            <button
                                                type="button"
                                                className="so-sort-button"
                                                onClick={() =>
                                                    handleSort(
                                                        column.key
                                                    )
                                                }
                                            >
                                                <span>
                                                    {
                                                        column.label
                                                    }
                                                </span>

                                                <SortIcon
                                                    direction={
                                                        sort.key ===
                                                            column.key
                                                            ? sort.direction
                                                            : null
                                                    }
                                                />
                                            </button>
                                        </th>
                                    )
                                )}

                                <th className="so-action-column">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {currentOrders.length >
                                0 ? (
                                currentOrders.map(
                                    (order) => (
                                        <tr
                                            key={
                                                order.id
                                            }
                                            className={
                                                selectedRows.includes(
                                                    order.id
                                                )
                                                    ? "so-row-selected"
                                                    : ""
                                            }
                                        >
                                            <td className="so-checkbox-column">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedRows.includes(
                                                        order.id
                                                    )}
                                                    onChange={() =>
                                                        toggleRow(
                                                            order.id
                                                        )
                                                    }
                                                />
                                            </td>

                                            {visibleColumns.map(
                                                (column) => (
                                                    <td
                                                        key={
                                                            column.key
                                                        }
                                                    >
                                                        {renderCell(
                                                            order,
                                                            column
                                                        )}
                                                    </td>
                                                )
                                            )}

                                            <td className="so-action-column">
                                                <div className="so-action-wrapper">
                                                    <button
                                                        type="button"
                                                        className="so-action-button"
                                                        onClick={() =>
                                                            setOpenAction(
                                                                openAction ===
                                                                    order.id
                                                                    ? null
                                                                    : order.id
                                                            )
                                                        }
                                                    >
                                                        <MoreHorizontal
                                                            size={18}
                                                        />
                                                    </button>

                                                    {openAction ===
                                                        order.id && (
                                                            <div className="so-row-menu">
                                                                <button type="button">
                                                                    <Eye
                                                                        size={15}
                                                                    />
                                                                    View
                                                                </button>

                                                                <button type="button">
                                                                    <Edit
                                                                        size={15}
                                                                    />
                                                                    Edit
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        duplicateOrder(
                                                                            order
                                                                        )
                                                                    }
                                                                >
                                                                    <Copy
                                                                        size={15}
                                                                    />
                                                                    Duplicate
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        printOrder(
                                                                            order
                                                                        )
                                                                    }
                                                                >
                                                                    <Printer
                                                                        size={15}
                                                                    />
                                                                    Print
                                                                </button>

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleExport(
                                                                            [order]
                                                                        )
                                                                    }
                                                                >
                                                                    <FileDown
                                                                        size={15}
                                                                    />
                                                                    Export
                                                                </button>

                                                                <div className="so-row-menu-divider" />

                                                                <div className="so-related-title">
                                                                    Related Documents
                                                                </div>

                                                                <button type="button">
                                                                    <FileText
                                                                        size={15}
                                                                    />
                                                                    {order.invoiceNo ||
                                                                        "No Invoice"}
                                                                </button>

                                                                <button type="button">
                                                                    <FileText
                                                                        size={15}
                                                                    />
                                                                    {order.deliveryNo ||
                                                                        "No Delivery"}
                                                                </button>

                                                                <button type="button">
                                                                    <FileText
                                                                        size={15}
                                                                    />
                                                                    {order.paymentNo ||
                                                                        "No Payment"}
                                                                </button>

                                                                <div className="so-row-menu-divider" />

                                                                <button
                                                                    type="button"
                                                                    className="danger"
                                                                    onClick={() =>
                                                                        deleteOrder(
                                                                            order
                                                                        )
                                                                    }
                                                                >
                                                                    <Trash2
                                                                        size={15}
                                                                    />
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                )
                            ) : (
                                <tr>
                                    <td
                                        colSpan={
                                            visibleColumns.length +
                                            2
                                        }
                                        className="so-empty-state"
                                    >
                                        <div>
                                            <Ban
                                                size={40}
                                            />

                                            <strong>
                                                No sales orders found
                                            </strong>

                                            <span>
                                                Try changing your
                                                search or filters.
                                            </span>

                                            <button
                                                type="button"
                                                onClick={
                                                    clearFilters
                                                }
                                            >
                                                Clear Filters
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="so-pagination">
                    <div className="so-pagination-left">
                        <span>
                            Showing{" "}
                            <strong>
                                {filteredOrders.length
                                    ? startIndex + 1
                                    : 0}
                            </strong>{" "}
                            to{" "}
                            <strong>
                                {Math.min(
                                    startIndex +
                                    currentOrders.length,
                                    filteredOrders.length
                                )}
                            </strong>{" "}
                            of{" "}
                            <strong>
                                {
                                    filteredOrders.length
                                }
                            </strong>{" "}
                            orders
                        </span>

                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(
                                    Number(
                                        e.target.value
                                    )
                                );
                                setPage(1);
                            }}
                        >
                            <option value={10}>
                                10 / page
                            </option>

                            <option value={20}>
                                20 / page
                            </option>

                            <option value={30}>
                                30 / page
                            </option>

                            <option value={50}>
                                50 / page
                            </option>
                        </select>
                    </div>

                    <div className="so-pagination-right">
                        <button
                            type="button"
                            disabled={
                                currentPage === 1
                            }
                            onClick={() =>
                                setPage(
                                    currentPage - 1
                                )
                            }
                        >
                            <ChevronLeft size={16} />
                        </button>

                        {Array.from(
                            {
                                length: totalPages,
                            },
                            (_, index) =>
                                index + 1
                        )
                            .slice(
                                Math.max(
                                    0,
                                    currentPage - 3
                                ),
                                Math.min(
                                    totalPages,
                                    currentPage + 2
                                )
                            )
                            .map(
                                (pageNumber) => (
                                    <button
                                        type="button"
                                        key={
                                            pageNumber
                                        }
                                        className={
                                            currentPage ===
                                                pageNumber
                                                ? "active"
                                                : ""
                                        }
                                        onClick={() =>
                                            setPage(
                                                pageNumber
                                            )
                                        }
                                    >
                                        {
                                            pageNumber
                                        }
                                    </button>
                                )
                            )}

                        <button
                            type="button"
                            disabled={
                                currentPage ===
                                totalPages
                            }
                            onClick={() =>
                                setPage(
                                    currentPage + 1
                                )
                            }
                        >
                            <ChevronRight
                                size={16}
                            />
                        </button>
                    </div>
                </div>
            </div>
            <SalesOrderModal1
                isOpen={showSalesOrderModal}
                onClose={() =>
                    setShowSalesOrderModal(false)
                }
                onSave={(orderData) => {
                    const newOrder = {
                        id: Date.now(),

                        orderNo:
                            getNextOrderNo(),

                        orderDate:
                            orderData.orderDate,

                        customer:
                            orderData.customer,

                        customerCode:
                            orderData.customerCode,

                        items:
                            orderData.items.length,

                        quantity:
                            orderData.items.reduce(
                                (sum, item) =>
                                    sum +
                                    Number(
                                        item.quantity || 0
                                    ),
                                0
                            ),

                        amount:
                            orderData.grandTotal,

                        status:
                            orderData.status,

                        paymentStatus:
                            "Pending",

                        deliveryStatus:
                            "Pending",

                        salesPerson:
                            "Aditya",

                        invoiceNo: "",

                        deliveryNo: "",

                        paymentNo: "",
                    };

                    setOrders((previous) => [
                        newOrder,
                        ...previous,
                    ]);

                    setPage(1);
                }}
            />
        </div>

    );
}

export default SalesOrders;