// src/components/TallyGateway/TallyGateway.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./TallyGateway.css";

const COMPANY = {
  name: "Trust BillBook Demo Company",
  period: "1-Apr-2026 to 31-Mar-2027",
  currentDate: "Tuesday, 13-Oct-2026",
  lastEntry: "13-Oct-2026",
};

const MENU_GROUPS = [
  {
    title: "MASTERS",
    items: [
      { id: "customers", label: "Customers", route: "/customers" },
      { id: "suppliers", label: "Suppliers", route: "/suppliers" },
      { id: "products", label: "Products / Items", route: "/products" },
      {
        id: "accounts",
        label: "Chart of Accounts",
        route: "/accounts",
      },
    ],
  },
  {
    title: "TRANSACTIONS",
    items: [
      {
        id: "receipts",
        label: "Receipts / Vouchers",
        route: "/receipts",
      },
      {
        id: "journal",
        label: "Journal Entries",
        route: "/journal",
      },
      {
        id: "bank",
        label: "Banking",
        route: "/bank",
      },
    ],
  },
  {
    title: "CAMPUS",
    items: [
      {
        id: "students",
        label: "Student Ledger",
        route: "/student-class-cards",
      },
      { id: "fees", label: "Fee List", route: "/fee-list" },
      {
        id: "applications",
        label: "Application Payment",
        route: "/app-payment",
      },
      {
        id: "payroll",
        label: "Payroll Processing",
        route: "/payroll",
      },
      {
        id: "salaries",
        label: "Employee Salaries",
        route: "/emp-sal",
      },
    ],
  },
  {
    title: "REPORTS",
    items: [
      {
        id: "balance",
        label: "Balance Sheet",
        route: "/finance/reports",
      },
      {
        id: "profit",
        label: "Profit & Loss A/c",
        route: "/finance/reports",
      },
      {
        id: "stock",
        label: "Stock Summary",
        route: "/reports/stock-summary",
      },
      {
        id: "more",
        label: "Display More Reports",
        route: "/finance/reports",
      },
    ],
  },
  {
    title: "",
    items: [
      { id: "quit", label: "Quit", route: "/logout" },
    ],
  },
];

const ALL_ITEMS = MENU_GROUPS.flatMap((group) => group.items);

const TallyGateway = () => {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState(ALL_ITEMS[0].id);
  const itemRefs = useRef({});

  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target;
      const isEditing =
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

      if (isEditing || event.ctrlKey || event.metaKey) return;

      if (event.altKey && event.key.toLowerCase() === "g") {
        event.preventDefault();
        itemRefs.current[ALL_ITEMS[0].id]?.focus();
        return;
      }

      if (event.altKey) return;

      if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
        event.preventDefault();

        const currentIndex = ALL_ITEMS.findIndex(
          (item) => item.id === selectedId,
        );

        let nextIndex = currentIndex;

        if (event.key === "ArrowDown") {
          nextIndex = (currentIndex + 1) % ALL_ITEMS.length;
        }

        if (event.key === "ArrowUp") {
          nextIndex =
            (currentIndex - 1 + ALL_ITEMS.length) % ALL_ITEMS.length;
        }

        if (event.key === "Home") nextIndex = 0;
        if (event.key === "End") nextIndex = ALL_ITEMS.length - 1;

        const nextItem = ALL_ITEMS[nextIndex];
        setSelectedId(nextItem.id);
        itemRefs.current[nextItem.id]?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedId]);

  return (
    <div className="bb-gateway">
      <header className="bb-command-bar">
        <div className="bb-brand">
          <strong>Trust BillBook</strong>
          <span>ACCOUNTING WORKSPACE</span>
        </div>

        <nav className="bb-command-links" aria-label="Quick navigation">
          <button type="button" onClick={() => navigate("/accounts")}>
            Accounts
          </button>

          <button type="button" onClick={() => navigate("/journal")}>
            Journal
          </button>

          <button type="button" onClick={() => navigate("/receipts")}>
            Vouchers
          </button>
        </nav>

        <button
          type="button"
          className="bb-goto"
          onClick={() => itemRefs.current[selectedId]?.focus()}
        >
          Go To <span>Alt + G</span>
        </button>
      </header>

      <div className="bb-title-strip">
        <span>Business Gateway</span>
        <span>Trust BillBook</span>
      </div>

      <main className="bb-workspace">
        <section className="bb-company-pane" aria-label="Company information">
          <div className="bb-period-row">
            <div>
              <span className="bb-field-label">Current period</span>
              <strong>{COMPANY.period}</strong>
            </div>

            <div className="bb-date-field">
              <span className="bb-field-label">Current date</span>
              <strong>{COMPANY.currentDate}</strong>
            </div>
          </div>

          <div className="bb-company-table">
            <div className="bb-company-table-head">
              <span>Name of company</span>
              <span>Date of last entry</span>
            </div>

            <div className="bb-company-table-row">
              <strong>{COMPANY.name}</strong>
              <span>{COMPANY.lastEntry}</span>
            </div>
          </div>

          <div className="bb-company-caption">
            <span>Active company</span>
            <p>
              Select a master, transaction or report from the gateway
              to continue.
            </p>
          </div>
        </section>

        <section className="bb-menu-pane" aria-label="Gateway navigation">
          <div className="bb-menu">
            <h1 className="bb-menu-title">Business Gateway</h1>

            <nav className="bb-menu-body" aria-label="Business modules">
              {MENU_GROUPS.map((group, groupIndex) => (
                <div
                  key={group.title || "utilities"}
                  className={`bb-menu-group ${
                    !group.title ? "bb-menu-group-last" : ""
                  }`}
                >
                  {group.title && (
                    <h2 id={`bb-group-${groupIndex}`}>
                      {group.title}
                    </h2>
                  )}

                  <div
                    role="group"
                    aria-labelledby={
                      group.title ? `bb-group-${groupIndex}` : undefined
                    }
                    aria-label={!group.title ? "Utilities" : undefined}
                  >
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        ref={(element) => {
                          itemRefs.current[item.id] = element;
                        }}
                        type="button"
                        className={`bb-menu-item ${
                          selectedId === item.id ? "is-selected" : ""
                        }`}
                        onFocus={() => setSelectedId(item.id)}
                        onMouseEnter={() => setSelectedId(item.id)}
                        onClick={() => navigate(item.route)}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          </div>

          <p className="bb-menu-help">
            ↑ ↓ Select <span>•</span> Enter Open
          </p>
        </section>
      </main>

      <footer className="bb-status-bar">
        <span>Business Gateway</span>
        <span>Alt + G — Focus menu</span>
      </footer>
    </div>
  );
};

export default TallyGateway;