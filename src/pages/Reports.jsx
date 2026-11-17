import { useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import "./Reports.css";

const reportGroups = [
  {
    title: "Business Overview",
    description: "Understand your business performance",
    icon: "chart",
    color: "blue",
    reports: [
      { name: "Reports Home", path: "/reports" },
      { name: "Profit & Loss", path: "/profit-loss" },
      { name: "Bill-wise Profit", path: "/bill-wise-profit" },
      { name: "Outstanding Report", path: "/reports/outstanding" },
    ],
  },
  {
    title: "Sales & Inventory",
    description: "Track transactions and stock",
    icon: "box",
    color: "green",
    reports: [
      { name: "Sales Report", path: "/reports/sales" },
      { name: "Purchase Report", path: "/reports/purchase" },
      { name: "Inventory Report", path: "/reports/inventory" },
      { name: "Item Report", path: "/products/report" },
    ],
  },
  {
    title: "Accounting",
    description: "Review accounts and banking",
    icon: "ledger",
    color: "purple",
    reports: [
      { name: "Accounting Report", path: "/reports/accounting" },
      { name: "Bank Ledger", path: "/accounting/bank-ledger" },
      { name: "Ledger Insights", path: "/accounting/ledger-insights" },
      { name: "Audit Trail", path: "/audit-trail" },
    ],
  },
];

function Icon({ name, size = 20, ...props }) {
  const paths = {
    chart: (
      <>
        <path d="M4 4v16h16" />
        <path d="M8 15v-4M12 15V7M16 15v-6" />
      </>
    ),
    box: (
      <>
        <path d="m12 3 9 5-9 5-9-5 9-5Z" />
        <path d="M3 8v9l9 5 9-5V8M12 13v9M7.5 5.5l9 5" />
      </>
    ),
    ledger: (
      <>
        <rect x="5" y="3" width="15" height="18" rx="2" />
        <path d="M9 3v18M3 7h4M3 12h4M3 17h4M12 8h5M12 12h5" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4 4" />
      </>
    ),
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    chevron: <path d="m8 10 4 4 4-4" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}

function ReportColumn({ group, searching }) {
  const [expanded, setExpanded] = useState(false);
  const initialCount = 3;
  const showAll = searching || expanded;

  const visibleReports = showAll
    ? group.reports
    : group.reports.slice(0, initialCount);

  return (
    <section className={`rc-column rc-theme-${group.color}`}>
      <header className="rc-column-header">
        <span className="rc-category-icon">
          <Icon name={group.icon} />
        </span>

        <div className="rc-category-copy">
          <h2>{group.title}</h2>
          <p>{group.description}</p>
        </div>

        <span className="rc-count">{group.reports.length}</span>
      </header>

      <div className="rc-link-list">
        {visibleReports.map((report) => (
          <NavLink
            key={report.path}
            to={report.path}
            end
            className={({ isActive }) =>
              `rc-link${isActive ? " rc-link-active" : ""}`
            }
          >
            <span className="rc-link-dot" aria-hidden="true" />
            <span className="rc-link-name">{report.name}</span>
            <Icon name="arrow" size={16} className="rc-link-arrow" />
          </NavLink>
        ))}
      </div>

      {!searching && group.reports.length > initialCount && (
        <button
          type="button"
          className="rc-toggle"
          onClick={() => setExpanded((previous) => !previous)}
          aria-expanded={expanded}
        >
          {expanded ? "See less" : "See all reports"}
          <Icon
            name="chevron"
            size={15}
            className={expanded ? "rc-chevron-open" : ""}
          />
        </button>
      )}
    </section>
  );
}

export default function Reports() {
  const [query, setQuery] = useState("");
  const searchTerm = query.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!searchTerm) return reportGroups;

    return reportGroups
      .map((group) => ({
        ...group,
        reports: group.reports.filter(
          (report) =>
            report.name.toLowerCase().includes(searchTerm) ||
            group.title.toLowerCase().includes(searchTerm)
        ),
      }))
      .filter((group) => group.reports.length > 0);
  }, [searchTerm]);

  const resultCount = filteredGroups.reduce(
    (total, group) => total + group.reports.length,
    0
  );

  return (
    <main className="rc-page">
      <div className="rc-container">
        <div className="rc-breadcrumb">
          Workspace <span>/</span> <span>Reports</span>
        </div>

        <header className="rc-page-header">
          <div>
            <div className="rc-title-row">
              <h1>Reports Center</h1>
              <span className="rc-badge">Overview</span>
            </div>

            <p className="rc-subtitle">
              Your business insights, neatly organized in one place.
            </p>
          </div>

          <div className="rc-search">
            <Icon name="search" size={18} />

            <input
              type="search"
              aria-label="Search reports"
              placeholder="Find a report..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />

            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
                className="rc-search-clear"
              >
                <Icon name="close" size={15} />
              </button>
            )}
          </div>
        </header>

        <div className="rc-section-label">
          <span>{searchTerm ? "SEARCH RESULTS" : "ALL REPORTS"}</span>
          <span aria-live="polite">
            {resultCount} {resultCount === 1 ? "report" : "reports"}
          </span>
        </div>

        {filteredGroups.length > 0 ? (
          <div className="rc-panel">
            {filteredGroups.map((group) => (
              <ReportColumn
                key={group.title}
                group={group}
                searching={Boolean(searchTerm)}
              />
            ))}
          </div>
        ) : (
          <div className="rc-empty" role="status">
            <span className="rc-empty-icon">
              <Icon name="search" size={26} />
            </span>
            <h2>No reports found</h2>
            <p>Try another keyword, such as sales, stock or ledger.</p>
            <button type="button" onClick={() => setQuery("")}>
              Clear search
            </button>
          </div>
        )}

        <p className="rc-footer-note">
          Select any report to view its details.
        </p>
      </div>
    </main>
  );
}