import { useState } from "react";

import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Calculator,
  ClipboardList,
  Receipt,
  Users,
  Truck,
  BarChart3,
  ReceiptText,
  Landmark,
  Wallet,
  Factory,
  UsersRound,
  Box,
  Settings,
  X,
  ChevronRight,

  FileText,
  ShoppingBag,
  Truck as DeliveryIcon,
  RotateCcw,

  ClipboardCheck,
  Send,
  GitCompare,
  ClipboardPlus,

  Warehouse,
  ArrowLeftRight,
  SlidersHorizontal,
  CircleDollarSign,

  BookOpen,
  BookText,
  HandCoins,
  CreditCard,
  RefreshCcw,

  PlusCircle,
  CheckCircle,

  FilePlus,
  FileMinus,

  UserPlus,
  Users2,

  Tags,
  Ruler,
  List,

  BarChart3 as ChartIcon,
  PieChart,

  ReceiptIndianRupee,
  Settings2,

  Building2,
  ArrowDownCircle,
  ArrowUpCircle,

  ReceiptIndianRupee as ExpenseIcon,

  ClipboardPen,
  Layers3,

  UserRound,
  CalendarDays,

  Monitor,
  Percent,
} from "lucide-react";

const menuItems = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
  },

  {
    label: "Sales",
    icon: ShoppingCart,
    children: [
      {
        label: "Quotations",
        icon: FileText,
      },
      {
        label: "Sales Orders",
        icon: ShoppingBag,
      },
      {
        label: "Delivery",
        icon: DeliveryIcon,
      },
      {
        label: "Invoices",
        icon: Receipt,
      },
      {
        label: "Sales Returns",
        icon: RotateCcw,
      },
    ],
  },

  {
    label: "Purchase",
    icon: ShoppingCart,
    children: [
      {
        label: "Purchase Requisitions",
        icon: ClipboardCheck,
      },
      {
        label: "RFQ",
        icon: Send,
      },
      {
        label: "Supplier Quotations",
        icon: FileText,
      },
      {
        label: "Quotation Comparison",
        icon: GitCompare,
      },
      {
        label: "Purchase Orders",
        icon: ClipboardPlus,
      },
      {
        label: "GRN",
        icon: Package,
      },
      {
        label: "Purchase Invoices",
        icon: Receipt,
      },
      {
        label: "Purchase Returns",
        icon: RotateCcw,
      },
    ],
  },

  {
    label: "Inventory",
    icon: Package,
    children: [
      {
        label: "Stock",
        icon: Box,
      },
      {
        label: "Warehouses",
        icon: Warehouse,
      },
      {
        label: "Stock Transfer",
        icon: ArrowLeftRight,
      },
      {
        label: "Stock Adjustment",
        icon: SlidersHorizontal,
      },
      {
        label: "Stock Valuation",
        icon: CircleDollarSign,
      },
    ],
  },

  {
    label: "Accounting",
    icon: Calculator,
    children: [
      {
        label: "Chart of Accounts",
        icon: BookOpen,
      },
      {
        label: "Journal",
        icon: BookText,
      },
      {
        label: "Ledger",
        icon: ClipboardList,
      },
      {
        label: "Receivables",
        icon: HandCoins,
      },
      {
        label: "Payables",
        icon: CreditCard,
      },
      {
        label: "Bank Reconciliation",
        icon: RefreshCcw,
      },
    ],
  },

  {
    label: "Entry Sheet",
    icon: ClipboardList,
    children: [
      {
        label: "All Entries",
        icon: List,
      },
      {
        label: "New Entry",
        icon: PlusCircle,
      },
      {
        label: "Entry Approval",
        icon: CheckCircle,
      },
    ],
  },

  {
    label: "Invoice & Billing",
    icon: Receipt,
    children: [
      {
        label: "Sales Invoices",
        icon: FilePlus,
      },
      {
        label: "Purchase Invoices",
        icon: Receipt,
      },
      {
        label: "Credit Notes",
        icon: FileMinus,
      },
      {
        label: "Debit Notes",
        icon: FileMinus,
      },
    ],
  },

  {
    label: "Customers",
    icon: Users,
    children: [
      {
        label: "All Customers",
        icon: Users2,
      },
      {
        label: "Add Customer",
        icon: UserPlus,
      },
      {
        label: "Customer Groups",
        icon: Users2,
      },
      {
        label: "Customer Outstanding",
        icon: HandCoins,
      },
    ],
  },

  {
    label: "Suppliers",
    icon: Truck,
    children: [
      {
        label: "All Suppliers",
        icon: Truck,
      },
      {
        label: "Add Supplier",
        icon: UserPlus,
      },
      {
        label: "Supplier Groups",
        icon: Users2,
      },
      {
        label: "Supplier Outstanding",
        icon: HandCoins,
      },
    ],
  },

  {
    label: "Products",
    icon: Box,
    children: [
      {
        label: "All Products",
        icon: Box,
      },
      {
        label: "Categories",
        icon: Tags,
      },
      {
        label: "Units",
        icon: Ruler,
      },
      {
        label: "Price Lists",
        icon: List,
      },
    ],
  },

  {
    label: "Reports",
    icon: BarChart3,
    children: [
      {
        label: "Sales Reports",
        icon: ChartIcon,
      },
      {
        label: "Purchase Reports",
        icon: ChartIcon,
      },
      {
        label: "Inventory Reports",
        icon: BarChart3,
      },
      {
        label: "Accounting Reports",
        icon: PieChart,
      },
    ],
  },

  {
    label: "GST & Tax",
    icon: ReceiptText,
    children: [
      {
        label: "GST Summary",
        icon: ReceiptIndianRupee,
      },
      {
        label: "GSTR Reports",
        icon: ChartIcon,
      },
      {
        label: "Tax Configuration",
        icon: Settings2,
      },
    ],
  },

  {
    label: "Bank & Payments",
    icon: Landmark,
    children: [
      {
        label: "Bank Accounts",
        icon: Building2,
      },
      {
        label: "Receipts",
        icon: ArrowDownCircle,
      },
      {
        label: "Payments",
        icon: ArrowUpCircle,
      },
      {
        label: "Bank Transfer",
        icon: ArrowLeftRight,
      },
    ],
  },

  {
    label: "Expenses",
    icon: Wallet,
    children: [
      {
        label: "All Expenses",
        icon: ExpenseIcon,
      },
      {
        label: "Expense Categories",
        icon: Tags,
      },
      {
        label: "Expense Approval",
        icon: CheckCircle,
      },
    ],
  },

  {
    label: "Production",
    icon: Factory,
    children: [
      {
        label: "Production Orders",
        icon: ClipboardPen,
      },
      {
        label: "Bill of Materials",
        icon: Layers3,
      },
      {
        label: "Work Orders",
        icon: ClipboardList,
      },
      {
        label: "Production Reports",
        icon: BarChart3,
      },
    ],
  },

  {
    label: "HR & Payroll",
    icon: UsersRound,
    children: [
      {
        label: "Employees",
        icon: UserRound,
      },
      {
        label: "Attendance",
        icon: CalendarDays,
      },
      {
        label: "Leave",
        icon: CalendarDays,
      },
      {
        label: "Payroll",
        icon: CircleDollarSign,
      },
    ],
  },

  {
    label: "Assets",
    icon: Box,
    children: [
      {
        label: "All Assets",
        icon: Monitor,
      },
      {
        label: "Asset Categories",
        icon: Tags,
      },
      {
        label: "Depreciation",
        icon: Percent,
      },
      {
        label: "Asset Reports",
        icon: BarChart3,
      },
    ],
  },

  {
    label: "Settings",
    icon: Settings,
    children: [
      {
        label: "Company Settings",
        icon: Building2,
      },
      {
        label: "Users",
        icon: Users,
      },
      {
        label: "Roles & Permissions",
        icon: UsersRound,
      },
      {
        label: "Appearance",
        icon: Settings2,
      },
      {
        label: "Notifications",
        icon: BellIcon,
      },
    ],
  },
];

function BellIcon(props) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function Sidebar({
  collapsed = false,
  mobileOpen = false,
  onMobileClose,
}) {
  const [openMenu, setOpenMenu] = useState(null);

  const handleParentClick = (item, index) => {
    if (!item.children) {
      if (window.innerWidth < 768 && onMobileClose) {
        onMobileClose();
      }

      return;
    }

    if (window.innerWidth >= 768 && collapsed) {
      setOpenMenu((previous) =>
        previous === index ? null : index
      );

      return;
    }

    setOpenMenu((previous) =>
      previous === index ? null : index
    );
  };

  const handleMouseEnter = (item, index) => {
    if (
      collapsed &&
      window.innerWidth >= 768 &&
      item.children
    ) {
      setOpenMenu(index);
    }
  };

  const handleMouseLeave = (item) => {
    if (
      collapsed &&
      window.innerWidth >= 768 &&
      item.children
    ) {
      setOpenMenu(null);
    }
  };

  const handleChildClick = () => {
    if (
      window.innerWidth < 768 &&
      onMobileClose
    ) {
      onMobileClose();
    }
  };

  return (
    <aside
      className={`sidebar
        ${collapsed ? "sidebar-collapsed" : ""}
        ${mobileOpen ? "sidebar-mobile-open" : ""}
      `}
    >
      <div className="sidebar-logo">
        <div className="logo-icon">
          T
        </div>

        <div className="logo-text">
          <span className="logo-main">
            TrustIQ
          </span>

          <span className="logo-erp">
            ERP
          </span>
        </div>

        <button
          type="button"
          className="sidebar-close-button"
          onClick={onMobileClose}
        >
          <X size={20} />
        </button>
      </div>

      <nav className="sidebar-menu">
        {menuItems.map((item, index) => {
          const Icon = item.icon;

          const isOpen =
            openMenu === index;

          return (
            <div
              key={item.label}
              className="sidebar-menu-group"
              onMouseEnter={() =>
                handleMouseEnter(item, index)
              }
              onMouseLeave={() =>
                handleMouseLeave(item)
              }
            >
              <div
                className={`sidebar-item ${
                  index === 0
                    ? "sidebar-item-active"
                    : ""
                } ${
                  isOpen
                    ? "sidebar-item-open"
                    : ""
                }`}
                title={
                  collapsed
                    ? item.label
                    : ""
                }
                onClick={() =>
                  handleParentClick(
                    item,
                    index
                  )
                }
              >
                <Icon
                  size={19}
                  strokeWidth={1.8}
                />

                <span className="sidebar-item-label">
                  {item.label}
                </span>

                {item.children && (
                  <ChevronRight
                    size={16}
                    className={`sidebar-chevron ${
                      isOpen
                        ? "sidebar-chevron-open"
                        : ""
                    }`}
                  />
                )}
              </div>

              {item.children && (
                <div
                  className={`sidebar-submenu ${
                    isOpen
                      ? "sidebar-submenu-open"
                      : ""
                  }`}
                >
                  {item.children.map(
                    (child) => {
                      const ChildIcon =
                        child.icon;

                      return (
                        <div
                          key={child.label}
                          className="sidebar-submenu-item"
                          onClick={
                            handleChildClick
                          }
                        >
                          <ChildIcon
                            size={15}
                            strokeWidth={1.8}
                            className="submenu-icon"
                          />

                          <span>
                            {child.label}
                          </span>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;