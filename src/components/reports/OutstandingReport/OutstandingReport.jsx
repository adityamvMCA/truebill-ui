import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Building2, FileText, Users } from "lucide-react";
import toast from "react-hot-toast";

import DataList from "../../common/DataList/DataList";
import StatusField from "../../common/StatusField/StatusField";
import Button from "../../common/Form/Button";

import outstandingApi from "../../../services/modules/outstandingApi";

import "./OutstandingReport.css";
import { useNavigate } from "react-router-dom";

const EMPTY_TOTALS = {
  partyCount: 0,
  documentCount: 0,
  outstandingAmountPaise: 0,
  overdueAmountPaise: 0,
  notDueAmountPaise: 0,
};

const REPORT_CONFIG = {
  customer: {
    title: "Customer Receivables",
    subtitle: "Outstanding against posted sales invoices",
    partyLabel: "Customer",
    documentLabel: "Invoice",
    settledLabel: "Received",
    fetch: outstandingApi.getCustomers,
  },

  supplier: {
    title: "Supplier Payables",
    subtitle: "Outstanding against posted purchase bills",
    partyLabel: "Supplier",
    documentLabel: "Bill",
    settledLabel: "Paid",
    fetch: outstandingApi.getSuppliers,
  },
};

const moneyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatPaise = (value) => {
  if (value === null || value === undefined) return "N/A";

  const amount = Number(value);

  return Number.isFinite(amount) ? moneyFormatter.format(amount / 100) : "N/A";
};

const formatDate = (value) => {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
};

const formatUpdatedAt = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
};

const getErrorMessage = (error) => {
  const data = error?.response?.data;

  if (Array.isArray(data?.errors) && data.errors.length) {
    return data.errors
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.message || item?.msg || "Validation failed",
      )
      .join(", ");
  }

  return (
    data?.message || error?.message || "Unable to load outstanding report."
  );
};

function SummaryCard({ label, value, tone }) {
  return (
    <div className={`outstanding-stat outstanding-stat--${tone}`}>
      <span className="outstanding-stat-label">{label}</span>

      <strong className="outstanding-stat-value">{value}</strong>
    </div>
  );
}

export default function OutstandingReport({
  initialKind = "customer",
  showKindTabs = true,
  onOpenDocument,
}) {
  const [kind, setKind] = useState(
    initialKind === "supplier" ? "supplier" : "customer",
  );

  const [view, setView] = useState("party");
  const [selectedParty, setSelectedParty] = useState(null);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const requestVersion = useRef(0);

  const config = REPORT_CONFIG[kind];
  const selectedPartyId = selectedParty?.partyId || "";

  const loadReport = useCallback(async () => {
    const version = ++requestVersion.current;

    setLoading(true);
    setError("");

    try {
      const fetchPage = REPORT_CONFIG[kind].fetch;

      const params = {
        view,
        overdueOnly,
        ...(selectedPartyId ? { partyId: selectedPartyId } : {}),
      };

      const collected = [];

      let firstResult = null;
      let page = 1;
      let totalPages = 1;

      do {
        const response = await fetchPage({
          ...params,
          page,
          limit: 100,
        });

        if (version !== requestVersion.current) return;

        const result = response?.data;

        if (
          result?.success !== true ||
          !Array.isArray(result?.data) ||
          !result?.totals
        ) {
          throw new Error(
            result?.message || "Invalid outstanding report response.",
          );
        }

        const pages = Number(result?.pagination?.totalPages);

        if (!Number.isInteger(pages) || pages < 0) {
          throw new Error("Invalid report pagination.");
        }

        if (!firstResult) {
          firstResult = result;
          totalPages = pages;
        }

        collected.push(...result.data);
        page += 1;
      } while (page <= totalPages);

      if (version !== requestVersion.current) return;

      const uniqueRows = new Map(
        collected.map((row) => [String(row._id), row]),
      );

      setReport({
        kind,
        view,
        partyId: selectedPartyId,
        overdueOnly,
        totals: firstResult.totals,
        generatedAt: firstResult.generatedAt,
        data: [...uniqueRows.values()],
      });
    } catch (requestError) {
      if (version !== requestVersion.current) return;

      const message = getErrorMessage(requestError);

      setReport(null);
      setError(message);

      toast.error(message);
    } finally {
      if (version === requestVersion.current) {
        setLoading(false);
      }
    }
  }, [kind, view, selectedPartyId, overdueOnly]);

  useEffect(() => {
    void loadReport();

    return () => {
      requestVersion.current += 1;
    };
  }, [loadReport]);

  // Do not display records from the previous tab/filter scope.
  const reportMatchesScope =
    report?.kind === kind &&
    report?.view === view &&
    report?.partyId === selectedPartyId &&
    report?.overdueOnly === overdueOnly;

  const rows = reportMatchesScope ? report.data : [];

  const totals = reportMatchesScope ? report.totals : EMPTY_TOTALS;

  const pending = loading || (!error && !reportMatchesScope);

  const handleKindChange = (nextKind) => {
    if (nextKind === kind) return;

    setKind(nextKind);
    setView("party");
    setSelectedParty(null);
    setError("");
  };

  const handleViewChange = (nextView) => {
    setView(nextView);
    setSelectedParty(null);
    setError("");
  };

  const handlePartyView = useCallback((row) => {
    setSelectedParty({
      partyId: String(row.partyId || row._id),
      partyCode: row.partyCode,
      partyName: row.partyName,
    });

    setView("document");
    setError("");
  }, []);

  const handleBackToSummary = () => {
    setSelectedParty(null);
    setView("party");
    setError("");
  };

  const handleSupplierBillView = useCallback(
    (row) => {
      const billNumber = row.documentNumber;

      if (!billNumber) {
        toast.error("Bill number is missing.");
        return;
      }

      navigate(`/purchase/invoices/view/${encodeURIComponent(billNumber)}`);
    },
    [navigate],
  );

  const openDocument = useCallback(
    (row) => {
      onOpenDocument?.({
        ...row,
        kind,
      });
    },
    [kind, onOpenDocument],
  );

  const columns = useMemo(() => {
    const moneyColumn = (key, label) => ({
      key,
      label,
      type: "number",
      sortable: true,
      render: formatPaise,
    });

    const partyColumn = {
      key: "partyName",
      label: config.partyLabel,
      sortable: true,

      render: (value, row) => (
        <div className="dl-customer">
          <strong>{value || "N/A"}</strong>
          <span>{row.partyCode || "N/A"}</span>
        </div>
      ),
    };

    if (view === "party") {
      return [
        {
          key: "partyCode",
          label: "Code",
          sortable: true,

          render: (value, row) => (
            <button
              type="button"
              className="outstanding-link"
              onClick={(event) => {
                event.stopPropagation();
                handlePartyView(row);
              }}
            >
              {value || "View documents"}
            </button>
          ),
        },

        partyColumn,

        {
          key: "documentCount",
          label: "Open Documents",
          type: "number",
          sortable: true,
        },

        moneyColumn("outstandingAmountPaise", "Outstanding"),

        moneyColumn("overdueAmountPaise", "Overdue"),

        moneyColumn("notDueAmountPaise", "Not Yet Due"),

        {
          key: "maxOverdueDays",
          label: "Max Overdue Days",
          type: "number",
          sortable: true,
          render: (value) => value ?? "N/A",
        },

        {
          key: "earliestDueDate",
          label: "Earliest Due",
          sortable: true,
          render: formatDate,
        },

        {
          ...moneyColumn("totalAmountPaise", "Document Total"),
          visible: false,
        },

        {
          ...moneyColumn("paidAmountPaise", config.settledLabel),
          visible: false,
        },
      ];
    }

    return [
      // {
      //   key: "documentNumber",
      //   label: config.documentLabel,
      //   sortable: true,

      //   render: (value, row) =>
      //     typeof onOpenDocument === "function" ? (
      //       <button
      //         type="button"
      //         className="outstanding-link"
      //         onClick={(event) => {
      //           event.stopPropagation();
      //           openDocument(row);
      //         }}
      //       >
      //         {value || "View document"}
      //       </button>
      //     ) : (
      //       value || "N/A"
      //     ),
      // },
      {
        key: "documentNumber",
        label: "Bill Number",
        sortable: true,

        render: (value, row) => (
          <button
            type="button"
            className="doc-link-button"
            onClick={(event) => {
              event.stopPropagation();
              handleSupplierBillView(row);
            }}
          >
            {value || "N/A"}
          </button>
        ),
      },

      partyColumn,

      {
        key: "documentDate",
        label: "Date",
        sortable: true,
        render: formatDate,
      },

      {
        key: "dueDate",
        label: "Due Date",
        sortable: true,
        render: formatDate,
      },

      moneyColumn("totalAmountPaise", "Total"),

      moneyColumn("paidAmountPaise", config.settledLabel),

      moneyColumn("outstandingAmountPaise", "Outstanding"),

      {
        key: "overdueDays",
        label: "Overdue Days",
        type: "number",
        sortable: true,

        render: (value) =>
          value > 0 ? (
            <span className="outstanding-overdue">
              {value} day{value === 1 ? "" : "s"}
            </span>
          ) : value === 0 ? (
            <span className="dl-muted-value">Not overdue</span>
          ) : (
            "N/A"
          ),
      },

      {
        key: "paymentStatus",
        label: "Payment Status",
        sortable: true,
        render: (value) => <StatusField value={value} />,
      },
    ];
  }, [config, view, handlePartyView, openDocument, onOpenDocument]);

  const actions = useMemo(() => {
    if (view === "party") {
      return { view: handlePartyView };
    }

    return typeof onOpenDocument === "function" ? { view: openDocument } : {};
  }, [view, handlePartyView, openDocument, onOpenDocument]);

  const listScope = [
    kind,
    view,
    selectedPartyId || "all",
    overdueOnly ? "overdue" : "all-due",
  ].join("-");

  const summaryValue = (field) =>
    pending || error ? "—" : formatPaise(totals[field]);

  return (
    <section className="outstanding-report" aria-busy={pending}>
      <div className="outstanding-controls">
        {showKindTabs && (
          <div
            className="outstanding-switch"
            role="group"
            aria-label="Outstanding report type"
          >
            <button
              type="button"
              className={kind === "customer" ? "is-active" : ""}
              aria-pressed={kind === "customer"}
              onClick={() => handleKindChange("customer")}
            >
              <Users size={16} />
              <span>Customer Receivables</span>
            </button>

            <button
              type="button"
              className={kind === "supplier" ? "is-active" : ""}
              aria-pressed={kind === "supplier"}
              onClick={() => handleKindChange("supplier")}
            >
              <Building2 size={16} />
              <span>Supplier Payables</span>
            </button>
          </div>
        )}

        <div className="outstanding-options">
          <div
            className="outstanding-switch"
            role="group"
            aria-label="Report view"
          >
            <button
              type="button"
              className={view === "party" ? "is-active" : ""}
              aria-pressed={view === "party"}
              onClick={() => handleViewChange("party")}
            >
              <Users size={15} />
              <span>Party Summary</span>
            </button>

            <button
              type="button"
              className={view === "document" ? "is-active" : ""}
              aria-pressed={view === "document"}
              onClick={() => handleViewChange("document")}
            >
              <FileText size={15} />
              <span>Documents</span>
            </button>
          </div>

          <label className="outstanding-check">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(event) => setOverdueOnly(event.target.checked)}
            />
            <span>Overdue only</span>
          </label>
        </div>
      </div>

      {selectedParty && (
        <div className="outstanding-drilldown">
          <Button
            type="button"
            variant="secondary"
            icon={ArrowLeft}
            onClick={handleBackToSummary}
          >
            All Parties
          </Button>

          <div>
            <strong>{selectedParty.partyName}</strong>
            <span>{selectedParty.partyCode}</span>
          </div>
        </div>
      )}

      <div className="outstanding-stats">
        <SummaryCard
          label="Outstanding"
          value={summaryValue("outstandingAmountPaise")}
          tone="primary"
        />

        <SummaryCard
          label="Overdue"
          value={summaryValue("overdueAmountPaise")}
          tone="danger"
        />

        <SummaryCard
          label="Not Yet Due"
          value={summaryValue("notDueAmountPaise")}
          tone="success"
        />

        <SummaryCard
          label="Open Documents / Parties"
          value={
            pending || error
              ? "—"
              : `${totals.documentCount} / ${totals.partyCount}`
          }
          tone="neutral"
        />
      </div>

      <div className="outstanding-report-note">
        <p>
          Current outstanding against posted documents only. Opening balances,
          advances, and ledger-only adjustments are excluded. Totals follow the
          selected report scope, not the table’s local search.
        </p>

        {reportMatchesScope && !pending && !error && (
          <span>Updated: {formatUpdatedAt(report.generatedAt)} IST</span>
        )}
      </div>

      {error && (
        <div className="outstanding-error" role="alert">
          <span>{error}</span>

          <Button type="button" variant="secondary" onClick={loadReport}>
            Retry
          </Button>
        </div>
      )}

      <DataList
        key={listScope}
        title={config.title}
        subtitle={
          selectedParty
            ? `Outstanding documents — ${selectedParty.partyName}`
            : `${config.subtitle}${overdueOnly ? " — overdue only" : ""}`
        }
        columns={columns}
        data={rows}
        loading={pending}
        rowKey="_id"
        showCase="list"
        searchable
        sortable
        columnVisibility
        pagination
        storageKey={`trustiq-outstanding-${kind}-${view}`}
        searchPlaceholder={
          view === "party"
            ? "Search party name or code..."
            : "Search document, party name or code..."
        }
        actions={actions}
        onRefresh={loadReport}
      />
    </section>
  );
}
