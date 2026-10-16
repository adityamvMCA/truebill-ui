import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
  Building2,
  ChevronRight,
  ClipboardList,
  FileText,
  Landmark,
  Layers,
  Package,
  ShoppingCart,
  Users,
  Wallet,
} from "lucide-react";

import "./TallyGateway.css";

/*
 * Hardcoded paths.
 *
 * The paths below match the routes discussed in this conversation
 * where their exact values are known.
 *
 * Check /customers, /suppliers, and /products against your route
 * configuration if those pages use a different path.
 */
const MENU_SECTIONS = [
  {
    id: "masters",
    category: "MASTERS",
    items: [
      {
        id: "customers",
        label: "Customers",
        route: "/customers",
        Icon: Users,
      },
      {
        id: "suppliers",
        label: "Suppliers",
        route: "/suppliers",
        Icon: Building2,
      },
      {
        id: "products",
        label: "Products / Items",
        route: "/products",
        Icon: Package,
      },
      {
        id: "banks",
        label: "Bank Accounts",
        route: "/accounting/banks",
        Icon: Landmark,
      },
        {
        id: "bank-ledger",
        label: "Bank Ledger",
        route: "/accounting/bank-ledger",
        Icon: Landmark,
      },
    ],
  },
  {
    id: "sales",
    category: "SALES",
    items: [
      {
        id: "sales-invoices",
        label: "Sales Invoices",
        route: "/sales/invoices",
        Icon: FileText,
      },
      {
        id: "customer-receipts",
        label: "Customer Receipts",
        route: "/sales/customer-receipts",
        Icon: ArrowDownLeft,
      },
    ],
  },
  {
    id: "purchase",
    category: "PURCHASE",
    items: [
      {
        id: "purchase-bills",
        label: "Purchase Bills",
        route: "/purchase/invoices",
        Icon: ShoppingCart,
      },
      {
        id: "supplier-payments",
        label: "Supplier Payments",
        route: "/purchase/supplier-payments",
        Icon: ArrowUpRight,
      },
    ],
  },
];

/*
 * These extra paths are proposed frontend paths.
 * Set enabled: true only after registering the matching pages,
 * or replace their routes with your actual registered paths.
 */
const ADDITIONAL_SECTIONS = [
  {
    id: "inventory",
    category: "INVENTORY",
    enabled: false,
    items: [
      {
        id: "stock-movements",
        label: "Stock Movements",
        route: "/inventory/stock-movements",
        Icon: ClipboardList,
      },
    ],
  },
  {
    id: "outstanding",
    category: "OUTSTANDING",
    enabled: false,
    items: [
      {
        id: "customer-outstanding",
        label: "Customer Outstanding",
        route: "/outstanding/customers",
        Icon: Users,
      },
      {
        id: "supplier-outstanding",
        label: "Supplier Outstanding",
        route: "/outstanding/suppliers",
        Icon: Wallet,
      },
      {
        id: "bank-ledger",
        label: "Bank Ledger",
        route: "/accounting/bank-ledger",
        Icon: Landmark,
      },
    ],
  },
  {
    id: "accounting",
    category: "ACCOUNTING",
    enabled: false,
    items: [
      {
        id: "chart-of-accounts",
        label: "Chart of Accounts",
        route: "/accounting/ledgers",
        Icon: Layers,
      },
      {
        id: "journal-entries",
        label: "Journal Entries",
        route: "/accounting/journals",
        Icon: BookOpen,
      },
    ],
  },
];

const SECTIONS = [
  ...MENU_SECTIONS,
  ...ADDITIONAL_SECTIONS.filter((section) => section.enabled),
];

const ALL_ITEMS = SECTIONS.flatMap((section) => section.items);

export default function TallyGateway() {
  const navigate = useNavigate();

  const [activeItem, setActiveItem] = useState(ALL_ITEMS[0]?.id || null);

  const gatewayRef = useRef(null);
  const itemRefs = useRef({});

  useEffect(() => {
    const handleShortcut = (event) => {
      const target = event.target;

      const isEditing =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

      if (
        isEditing ||
        event.ctrlKey ||
        event.metaKey ||
        !event.altKey ||
        event.key.toLowerCase() !== "g"
      ) {
        return;
      }

      event.preventDefault();

      const firstItem = ALL_ITEMS[0];

      if (firstItem) {
        gatewayRef.current?.scrollIntoView({
          block: "nearest",
        });

        setActiveItem(firstItem.id);
        itemRefs.current[firstItem.id]?.focus();
      }
    };

    window.addEventListener("keydown", handleShortcut);

    return () => {
      window.removeEventListener("keydown", handleShortcut);
    };
  }, []);

  const handleMenuKeyDown = (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || !ALL_ITEMS.length) {
      return;
    }

    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      return;
    }

    const currentId = event.target
      .closest("[data-gateway-item]")
      ?.getAttribute("data-gateway-item");

    if (!currentId) return;

    event.preventDefault();

    const currentIndex = Math.max(
      0,
      ALL_ITEMS.findIndex((item) => item.id === currentId),
    );

    let nextIndex = currentIndex;

    if (event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % ALL_ITEMS.length;
    }

    if (event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + ALL_ITEMS.length) % ALL_ITEMS.length;
    }

    if (event.key === "Home") {
      nextIndex = 0;
    }

    if (event.key === "End") {
      nextIndex = ALL_ITEMS.length - 1;
    }

    const nextItem = ALL_ITEMS[nextIndex];

    setActiveItem(nextItem.id);
    itemRefs.current[nextItem.id]?.focus();
  };

  const handleNavigate = (item) => {
    setActiveItem(item.id);
    navigate(item.route);
  };

  return (
    <div className="tg-page" ref={gatewayRef}>
      <section className="tg-container" aria-labelledby="tg-title">
        <header className="tg-header">
          <div className="tg-header-inner">
            <span className="tg-brand-icon">
              <Layers size={23} className="tg-header-icon" aria-hidden="true" />
            </span>

            <div className="tg-header-copy">
              <h1 id="tg-title" className="tg-header-title">
                TrueBill Gateway
              </h1>

              <p className="tg-header-subtitle">
                Your business. One workspace.
              </p>
            </div>
          </div>

          <div className="tg-header-bar" />
        </header>

        <nav
          className="tg-body"
          aria-label="TrueBill modules"
          onKeyDown={handleMenuKeyDown}
        >
          {SECTIONS.map((section) => (
            <section
              key={section.id}
              className="tg-section"
              aria-labelledby={`tg-section-${section.id}`}
            >
              <div className="tg-section-header">
                <span className="tg-section-bar" aria-hidden="true" />

                <h2
                  id={`tg-section-${section.id}`}
                  className="tg-section-title"
                >
                  {section.category}
                </h2>

                <span className="tg-section-count">{section.items.length}</span>
              </div>

              <div className="tg-items">
                {section.items.map((item) => {
                  const Icon = item.Icon;

                  return (
                    <button
                      key={item.id}
                      ref={(element) => {
                        itemRefs.current[item.id] = element;
                      }}
                      type="button"
                      data-gateway-item={item.id}
                      className={`tg-item ${
                        activeItem === item.id ? "tg-item-active" : ""
                      }`}
                      onFocus={() => setActiveItem(item.id)}
                      onMouseEnter={() => setActiveItem(item.id)}
                      onClick={() => handleNavigate(item)}
                    >
                      <span className="tg-item-left">
                        <span className="tg-item-icon-wrap">
                          <Icon
                            size={18}
                            className="tg-icon"
                            aria-hidden="true"
                          />
                        </span>

                        <span className="tg-item-label">{item.label}</span>
                      </span>

                      <ChevronRight
                        size={16}
                        className="tg-item-arrow"
                        aria-hidden="true"
                      />
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>

        <footer className="tg-footer">
          <div className="tg-shortcut">
            <kbd className="tg-kbd">Alt + G</kbd>

            <span className="tg-shortcut-text">Focus gateway</span>
          </div>

          <span className="tg-footer-hint">↑ ↓ Navigate · Enter Open</span>
        </footer>
      </section>
    </div>
  );
}
