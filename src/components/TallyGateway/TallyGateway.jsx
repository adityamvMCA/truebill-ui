import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  BookMarked,
  BookOpen,
  Building2,
  ChevronRight,
  FileText,
  Landmark,
  Layers,
  Package,
  Scale,
  Sheet,
  ShoppingCart,
  Users,
  Wallet,
  Landmark as BankIcon,
} from "lucide-react";

import "./TallyGateway.css";

/*
 * TRUEBILL GATEWAY — Tally-style
 * All sections enabled. Routes match DayBook / TrialBalance / BalanceSheet you added.
 * Update paths here if your router uses different ones.
 */

const MENU_SECTIONS = [
  {
    id: "masters",
    category: "MASTERS",
    items: [
      { id: "customers", label: "Customers", route: "/customers", Icon: Users },
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
        id: "chart-of-accounts",
        label: "Chart of Accounts",
        route: "/accounting/chart-of-accounts",
        Icon: Layers,
      },
      {
        id: "ledger-groups",
        label: "Ledger Groups",
        route: "/accounting/groups",
        Icon: Layers,
      },
      {
        id: "ledgers",
        label: "Ledgers",
        route: "/accounting/ledgers",
        Icon: BookOpen,
      },
      {
        id: "banks",
        label: "Bank Accounts",
        route: "/accounting/banks",
        Icon: Landmark,
      },
    ],
  },
  {
    id: "transactions",
    category: "TRANSACTIONS — VOUCHERS",
    items: [
      {
        id: "sales-invoices",
        label: "Sales Invoices",
        route: "/sales/invoices",
        Icon: FileText,
      },
      {
        id: "purchase-bills",
        label: "Purchase Bills",
        route: "/purchase/invoices",
        Icon: ShoppingCart,
      },
      {
        id: "customer-receipts",
        label: "Customer Receipts",
        route: "/sales/customer-receipts",
        Icon: ArrowDownLeft,
      },
      {
        id: "supplier-payments",
        label: "Supplier Payments",
        route: "/purchase/supplier-payments",
        Icon: ArrowUpRight,
      },
      {
        id: "journal-vouchers",
        label: "Journal Vouchers",
        route: "/accounting/journals",
        Icon: BookOpen,
      },
      {
        id: "sales-returns",
        label: "Sales Returns / Credit Notes",
        route: "/sales/returns",
        Icon: ArrowUpRight,
      },
    ],
  },
  {
    id: "banking",
    category: "BANKING",
    items: [
      {
        id: "bank-ledger",
        label: "Bank Ledger",
        route: "/accounting/bank-ledger",
        Icon: Landmark,
      },
      {
        id: "cash-book",
        label: "Cash Book",
        route: "/accounting/cash-book",
        Icon: Wallet,
      },
      {
        id: "bank-reco",
        label: "Bank Reconciliation",
        route: "/accounting/bank-reconciliation",
        Icon: BankIcon,
      },
    ],
  },
  {
    id: "display",
    category: "DISPLAY — BOOKS & REPORTS",
    items: [
      {
        id: "daybook",
        label: "Day Book",
        route: "/accounting/daybook",
        Icon: BookMarked,
      },
      {
        id: "ledger",
        label: "Ledger Display",
        route: "/accounting/ledgers",
        Icon: BookOpen,
      },
      {
        id: "trial-balance",
        label: "Trial Balance",
        route: "/accounting/trial-balance",
        Icon: Scale,
      },
      {
        id: "profit-loss",
        label: "Profit & Loss A/c",
        route: "/accounting/profit-loss",
        Icon: BarChart3,
      },
      {
        id: "balance-sheet",
        label: "Balance Sheet",
        route: "/accounting/balance-sheet",
        Icon: Sheet,
      },
      {
        id: "gst-reports",
        label: "GST Reports",
        route: "/accounting/gst-reports",
        Icon: FileText,
      },
    ],
  },
];

const ALL_ITEMS = MENU_SECTIONS.flatMap((s) => s.items);

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
      )
        return;
      event.preventDefault();
      const firstItem = ALL_ITEMS[0];
      if (firstItem) {
        gatewayRef.current?.scrollIntoView({ block: "nearest" });
        setActiveItem(firstItem.id);
        itemRefs.current[firstItem.id]?.focus();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const handleMenuKeyDown = (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || !ALL_ITEMS.length)
      return;
    if (!["ArrowDown", "ArrowUp", "Home", "End", "Enter"].includes(event.key))
      return;

    const currentId = event.target
      .closest("[data-gateway-item]")
      ?.getAttribute("data-gateway-item");
    if (!currentId) return;

    if (event.key === "Enter") {
      event.preventDefault();
      const item = ALL_ITEMS.find((x) => x.id === currentId);
      if (item) navigate(item.route);
      return;
    }

    event.preventDefault();
    const currentIndex = Math.max(
      0,
      ALL_ITEMS.findIndex((x) => x.id === currentId),
    );
    let nextIndex = currentIndex;
    if (event.key === "ArrowDown")
      nextIndex = (currentIndex + 1) % ALL_ITEMS.length;
    if (event.key === "ArrowUp")
      nextIndex = (currentIndex - 1 + ALL_ITEMS.length) % ALL_ITEMS.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = ALL_ITEMS.length - 1;
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
                Gateway of Tally — Your business. One workspace.
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
          {MENU_SECTIONS.map((section) => (
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
                      ref={(el) => {
                        itemRefs.current[item.id] = el;
                      }}
                      type="button"
                      data-gateway-item={item.id}
                      className={`tg-item ${activeItem === item.id ? "tg-item-active" : ""}`}
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
          <span className="tg-footer-hint">
            ↑ ↓ Navigate · Enter Open · Tally-like
          </span>
        </footer>
      </section>
    </div>
  );
}
