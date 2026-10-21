

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import api from "../services/api";
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
  PieChart,
  ReceiptIndianRupee,
  Settings2,
  Building2,
  ArrowDownCircle,
  ArrowUpCircle,
  ClipboardPen,
  Layers3,
  UserRound,
  CalendarDays,
  Monitor,
  Percent,
  Bell,
} from "lucide-react";

const iconMap = {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Calculator,
  ClipboardList,
  Receipt,
  Users,
  Truck,
  BarChart3,
  ChartIcon: BarChart3,
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
  PieChart,
  ReceiptIndianRupee,
  Settings2,
  Building2,
  ArrowDownCircle,
  ArrowUpCircle,
  ClipboardPen,
  Layers3,
  UserRound,
  CalendarDays,
  Monitor,
  Percent,
  Bell,
  BellIcon: Bell,
};

const getIcon = (iconName) => {
  if (!iconName) {
    return LayoutDashboard;
  }

  return iconMap[iconName] || LayoutDashboard;
};

const normalizePath = (path) => {
  if (!path) {
    return "";
  }

  const trimmed = String(path).trim();

  if (trimmed.length > 1) {
    return trimmed.replace(/\/+$/, "");
  }

  return trimmed;
};

const isPathActive = (menuPath, currentPath) => {
  if (!menuPath) {
    return false;
  }

  return currentPath === menuPath || currentPath.startsWith(`${menuPath}/`);
};

const getMenuItems = (responseData) => {
  const menuGroups = Array.isArray(responseData?.menuGroups)
    ? responseData.menuGroups
    : Array.isArray(responseData?.data?.menuGroups)
      ? responseData.data.menuGroups
      : [];

  return menuGroups
    .flatMap((group) => (Array.isArray(group?.items) ? group.items : []))
    .map((item) => ({
      ...item,
      label: String(item.label || ""),
      path: item.path || null,
      icon: getIcon(item.icon),
      children: (Array.isArray(item.children) ? item.children : [])
        .filter((child) => child && child.isActive !== false)
        .map((child) => ({
          ...child,
          label: String(child.label || ""),
          path: child.path || null,
          icon: getIcon(child.icon),
        }))
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0)),
    }))
    .filter(
      (item) =>
        item.label &&
        item.isActive !== false &&
        (item.path || item.children.length > 0),
    );
};

function Sidebar({ collapsed = false, mobileOpen = false, onMobileClose }) {
  const [openMenu, setOpenMenu] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = useMemo(
    () => normalizePath(location.pathname),
    [location.pathname],
  );

  const loadMenu = useCallback(async () => {
    try {
      setMenuLoading(true);

      const response = await api.menu.getMenu("truebill");

      setMenuItems(getMenuItems(response?.data));
    } catch (error) {
      console.error("Failed to load sidebar menu:", error);

      toast.error(error?.response?.data?.message || "Unable to load menu");

      setMenuItems([]);
    } finally {
      setMenuLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  useEffect(() => {
    const activeParentIndex = menuItems.findIndex((item) => {
      const parentPath = normalizePath(item.path);

      const hasActiveChild = item.children.some((child) =>
        isPathActive(normalizePath(child.path), currentPath),
      );

      return hasActiveChild || isPathActive(parentPath, currentPath);
    });

    if (activeParentIndex !== -1) {
      setOpenMenu(activeParentIndex);
    }
  }, [currentPath, menuItems]);

  const closeMobileSidebar = () => {
    if (window.innerWidth < 768 && onMobileClose) {
      onMobileClose();
    }
  };

  const handleParentClick = (item, index) => {
    const hasChildren = item.children.length > 0;

    if (hasChildren) {
      // Only expand / collapse the submenu.
      // Keep the sidebar open on mobile so the user can pick a sub menu item.
      // The sidebar closes in handleChildClick after a sub menu is selected.
      setOpenMenu((previous) => (previous === index ? null : index));

      return;
    }

    if (item.path) {
      navigate(item.path);
    }

    closeMobileSidebar();
  };

  const handleMouseEnter = (item, index) => {
    if (collapsed && window.innerWidth >= 768 && item.children.length > 0) {
      setOpenMenu(index);
    }
  };

  const handleMouseLeave = (item) => {
    if (collapsed && window.innerWidth >= 768 && item.children.length > 0) {
      setOpenMenu(null);
    }
  };

  const handleChildClick = (child) => {
    if (child.path) {
      navigate(child.path);
    }

    closeMobileSidebar();
  };

  return (
    <aside
      className={`sidebar ${collapsed ? "sidebar-collapsed" : ""} ${
        mobileOpen ? "sidebar-mobile-open" : ""
      }`}
    >
      <div className="sidebar-logo">
        <div className="logo-icon">T</div>

        <div className="logo-text">
          <span className="logo-main">TrustIQ</span>

          <span className="logo-erp">ERP</span>
        </div>

        <button
          type="button"
          className="sidebar-close-button"
          onClick={onMobileClose}
          aria-label="Close sidebar"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="sidebar-menu">
        {menuLoading && menuItems.length === 0 ? (
          <div className="sidebar-loading">
            <RefreshCcw size={20} className="spin-icon" />

            <span>Loading menu...</span>
          </div>
        ) : menuItems.length === 0 ? (
          <div className="sidebar-empty">
            <span>No menus available</span>
          </div>
        ) : (
          menuItems.map((item, index) => {
            const Icon = item.icon || LayoutDashboard;

            const isOpen = openMenu === index;

            const parentPath = normalizePath(item.path);

            const childIsActive = item.children.some((child) =>
              isPathActive(normalizePath(child.path), currentPath),
            );

            const parentIsActive =
              isPathActive(parentPath, currentPath) || childIsActive;

            const hasChildren = item.children.length > 0;

            return (
              <div
                key={item._id || item.id || `${item.label}-${index}`}
                className="sidebar-menu-group"
                onMouseEnter={() => handleMouseEnter(item, index)}
                onMouseLeave={() => handleMouseLeave(item)}
              >
                <div
                  role="button"
                  tabIndex={0}
                  aria-expanded={hasChildren ? isOpen : undefined}
                  className={`sidebar-item ${
                    parentIsActive ? "sidebar-item-active" : ""
                  } ${isOpen ? "sidebar-item-open" : ""}`}
                  title={collapsed ? item.label : ""}
                  onClick={() => handleParentClick(item, index)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();

                      handleParentClick(item, index);
                    }
                  }}
                >
                  <Icon size={19} strokeWidth={1.8} />

                  <span className="sidebar-item-label">{item.label}</span>

                  {hasChildren && (
                    <ChevronRight
                      size={16}
                      className={`sidebar-chevron ${
                        isOpen ? "sidebar-chevron-open" : ""
                      }`}
                    />
                  )}
                </div>

                {hasChildren && (
                  <div
                    className={`sidebar-submenu ${
                      isOpen ? "sidebar-submenu-open" : ""
                    }`}
                  >
                    {item.children.map((child, childIndex) => {
                      const ChildIcon = child.icon || LayoutDashboard;

                      const childPath = normalizePath(child.path);

                      const childIsCurrent = isPathActive(
                        childPath,
                        currentPath,
                      );

                      return (
                        <div
                          key={
                            child.id ||
                            child._id ||
                            `${child.label}-${childIndex}`
                          }
                          role="button"
                          tabIndex={0}
                          className={`sidebar-submenu-item ${
                            childIsCurrent ? "sidebar-submenu-item-active" : ""
                          }`}
                          title={child.label}
                          onClick={() => handleChildClick(child)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();

                              handleChildClick(child);
                            }
                          }}
                        >
                          <ChildIcon
                            size={15}
                            strokeWidth={1.8}
                            className="submenu-icon"
                          />

                          <span>{child.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </nav>
    </aside>
  );
}

export default Sidebar;