import { memo, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import outstandingApi from "../../../services/modules/outstandingApi";
import useOutstandingList from "../../../hooks/useOutstandingList";
import {
  formatDate,
  formatPaise,
  getErrors,
} from "../../purchase/purchaseBill.utils";

import "./outstanding-ageing.css";
import VoucherListPage from "../../../components/common/VoucherListPage/VoucherListPage";

/* ------------------------------ constants ------------------------------ */
const DOC_PAGE_SIZE = 20;

const BUCKETS = [
  { key: "notDue", label: "Not Due", tone: "" },
  { key: "d1_30", label: "1–30", tone: "oa-warn" },
  { key: "d31_60", label: "31–60", tone: "oa-warn" },
  { key: "d61_90", label: "61–90", tone: "oa-danger" },
  { key: "d90plus", label: "90+", tone: "oa-danger" },
];

const SHOW_OPTIONS = [
  { value: "", label: "All balances" },
  { value: "OVERDUE", label: "Overdue only" },
];

const KINDS = {
  PAYABLE: {
    namespace: "outstanding-payables",
    title: "Payables",
    subtitle: "Amounts owed to suppliers, aged by due date",
    partyLabel: "Supplier",
    docLabel: "Bill",
    list: outstandingApi.getSupplierOutstanding,
    summary: outstandingApi.getSupplierOutstandingSummary,
  },
  RECEIVABLE: {
    namespace: "outstanding-receivables",
    title: "Receivables",
    subtitle: "Amounts customers owe you, aged by due date",
    partyLabel: "Customer",
    docLabel: "Invoice",
    list: outstandingApi.getCustomerOutstanding,
    summary: outstandingApi.getCustomerOutstandingSummary,
  },
};

/* ------------------------------ helpers ------------------------------ */
const money = (v) => formatPaise(v || 0);

const toLocalDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// For this page endDate = "As of Date" (startDate is unused).
const initialFilters = () => {
  const today = toLocalDate(new Date());
  return { startDate: today, endDate: today, type: "", search: "" };
};

const validate = (f) => (!f.endDate ? "Choose a valid As of date." : "");

const buildParams = (f) => ({
  view: "party",
  asOfDate: f.endDate,
  overdueOnly: f.type === "OVERDUE" ? true : undefined,
  search: f.search?.trim() || undefined,
});

const getTypeLabel = (v) => (v === "OVERDUE" ? "Overdue only" : "All balances");
const getRowKey = (r) => String(r.partyId);

// The hook stores the summary response body; accept the common shapes.
const readSummary = (summary) =>
  summary?.data ?? summary?.totals ?? summary ?? null;

/* ------------------------------ drill-down modal ------------------------------ */
function DocsModal({ cfg, row, onClose }) {
  const [page, setPage] = useState(1);
  const [state, setState] = useState({
    loading: true,
    error: "",
    rows: [],
    total: 0,
    totalPages: 1,
  });

  useEffect(() => {
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: "" }));

    cfg
      .list(
        {
          view: "document",
          partyId: row.partyId,
          asOfDate: row.asOfDate,
          page,
          limit: DOC_PAGE_SIZE,
        },
        { signal: controller.signal },
      )
      .then((res) => {
        const body = res?.data || {};
        setState({
          loading: false,
          error: "",
          rows: Array.isArray(body.data) ? body.data : [],
          total: body.pagination?.total || 0,
          totalPages: Math.max(1, body.pagination?.totalPages || 1),
        });
      })
      .catch((err) => {
        if (
          controller.signal.aborted ||
          err?.code === "ERR_CANCELED" ||
          err?.name === "CanceledError"
        ) {
          return;
        }
        setState({
          loading: false,
          error: getErrors(err)[0],
          rows: [],
          total: 0,
          totalPages: 1,
        });
      });

    return () => controller.abort();
  }, [cfg, row.partyId, row.asOfDate, page]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const docWord = cfg.docLabel.toLowerCase();
  const { loading, error, rows, total, totalPages } = state;

  return createPortal(
    <div className="oa-modal-backdrop" onMouseDown={onClose}>
      <div
        className="oa-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${row.partyName} open ${docWord}s`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="oa-modal-head">
          <div>
            <h2>
              {row.partyName} — open {docWord}s
            </h2>
            <small>
              Outstanding {money(row.outstandingAmountPaise)} · as of{" "}
              {formatDate(row.asOfDate)}
            </small>
          </div>
          <button
            type="button"
            className="oa-modal-close"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>

        {error && (
          <div className="oa-error" role="alert">
            {error}
          </div>
        )}

        <div className="oa-scroll" tabIndex={0}>
          <table className="oa-table oa-table-detail">
            <thead>
              <tr>
                <th>{cfg.docLabel}</th>
                <th>Date</th>
                <th>Due Date</th>
                <th className="oa-num">Total</th>
                <th className="oa-num">Settled</th>
                <th className="oa-num">Outstanding</th>
                <th className="oa-num">Days Overdue</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td className="oa-empty" colSpan={7}>
                    Loading...
                  </td>
                </tr>
              )}
              {!loading && !error && rows.length === 0 && (
                <tr>
                  <td className="oa-empty" colSpan={7}>
                    No open {docWord}s.
                  </td>
                </tr>
              )}
              {!loading &&
                rows.map((doc) => (
                  <tr key={doc._id}>
                    <td className="oa-party">
                      <span className="oa-voucher">{doc.documentNumber}</span>
                    </td>
                    <td className="oa-nowrap">
                      {formatDate(doc.documentDate)}
                    </td>
                    <td className="oa-nowrap">{formatDate(doc.dueDate)}</td>
                    <td className="oa-num">{money(doc.totalAmountPaise)}</td>
                    <td className="oa-num">{money(doc.paidAmountPaise)}</td>
                    <td className="oa-num oa-strong">
                      {money(doc.outstandingAmountPaise)}
                    </td>
                    <td
                      className={`oa-num ${
                        doc.overdueDays > 0 ? "oa-danger oa-strong" : ""
                      }`}
                    >
                      {doc.overdueDays > 0 ? doc.overdueDays : "Not due"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {total > DOC_PAGE_SIZE && (
          <div className="oa-modal-pager">
            <span>
              Page {page} of {totalPages} · {total} {docWord}s
            </span>
            <div>
              <button
                type="button"
                className="oa-button"
                disabled={loading || page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Prev
              </button>
              <button
                type="button"
                className="oa-button"
                disabled={loading || page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {loading && <Loader2 size={16} className="oa-spin oa-modal-spinner" />}
      </div>
    </div>,
    document.body,
  );
}

/* Each row owns its own modal state, so nothing is fetched until the name is clicked. */
const PartyCell = memo(function PartyCell({ row, cfg }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className="oa-link" onClick={() => setOpen(true)}>
        {row.partyName || "N/A"}
      </button>
      <span className="oa-subtext">{row.partyCode}</span>
      {open && <DocsModal cfg={cfg} row={row} onClose={() => setOpen(false)} />}
    </>
  );
});

/* ------------------------------ page config (module level = stable identities) ------------------------------ */
const buildPageProps = (cfg) => {
  const columns = [
    {
      key: "party",
      label: cfg.partyLabel,
      render: (r) => <PartyCell row={r} cfg={cfg} />,
    },
    {
      key: "docs",
      label: `${cfg.docLabel}s`,
      thClassName: "oa-num",
      tdClassName: "oa-num",
      render: (r) => r.documentCount,
    },
    {
      key: "outstanding",
      label: "Outstanding",
      thClassName: "oa-num",
      tdClassName: "oa-num oa-strong",
      nowrap: true,
      render: (r) => money(r.outstandingAmountPaise),
    },
    {
      key: "overdue",
      label: "Overdue",
      thClassName: "oa-num",
      tdClassName: "oa-num",
      nowrap: true,
      render: (r) =>
        r.overdueAmountPaise > 0 ? (
          <span className="oa-danger oa-strong">
            {money(r.overdueAmountPaise)}
          </span>
        ) : (
          "—"
        ),
    },
    ...BUCKETS.map(({ key, label, tone }) => ({
      key,
      label,
      thClassName: "oa-num",
      tdClassName: "oa-num",
      nowrap: true,
      render: (r) =>
        r[key] > 0 ? (
          <span className={tone}>{money(r[key])}</span>
        ) : (
          <span className="oa-zero">—</span>
        ),
    })),
    {
      key: "oldest",
      label: "Oldest Due",
      nowrap: true,
      render: (r) => formatDate(r.oldestDueDate),
    },
  ];

  const cards = ({ summary, total }) => {
    const s = readSummary(summary);
    const has = Boolean(s);

    return [
      {
        label: `Total ${cfg.title}`,
        value: has ? money(s.outstandingAmountPaise) : "—",
        hint: has
          ? `${s.documentCount} open ${cfg.docLabel.toLowerCase()}s`
          : "",
        accent: true,
      },
      {
        label: "Overdue",
        value: has ? money(s.overdueAmountPaise) : "—",
        hint: "Past due date",
      },
      {
        label: `${cfg.partyLabel}s`,
        value: has ? s.partyCount : (total ?? "—"),
        hint: "With a balance",
      },
      {
        label: "90+ Days",
        value: has ? money(s.d90plus) : "—",
        hint: "Needs follow-up",
      },
    ];
  };

  return {
    title: cfg.title,
    namespace: cfg.namespace,
    fetchList: (params, opts) => cfg.list(params, opts),
    fetchSummary: (params, opts) => cfg.summary(params, opts),
    useList: useOutstandingList,
    buildParams,
    validate,
    columns,
    cards,
    cardCount: 4,
    typeOptions: SHOW_OPTIONS,
    chipTypes: SHOW_OPTIONS,
    getTypeLabel,
    typeLabel: "Show",
    dateMode: "asOf",
    showTypeSelect: false,
    searchPlaceholder: `Search ${cfg.partyLabel.toLowerCase()} name, code or ${cfg.docLabel.toLowerCase()} no...`,
    pageSize: 50,
    initialFilters: initialFilters(),
    footerText: ({ total, filters }) =>
      `${total} ${cfg.partyLabel.toLowerCase()}s · as of ${filters.endDate} · only posted documents`,
    footerNote: `Click a ${cfg.partyLabel.toLowerCase()} to see open ${cfg.docLabel.toLowerCase()}s`,
    emptyText: "No outstanding balances found.",
    getRowKey,
  };
};

const PAGE_PROPS = {
  PAYABLE: buildPageProps(KINDS.PAYABLE),
  RECEIVABLE: buildPageProps(KINDS.RECEIVABLE),
};

/* ------------------------------ page ------------------------------ */
export default function OutstandingAgeing({ kind = "PAYABLE" }) {
  return <VoucherListPage {...(PAGE_PROPS[kind] || PAGE_PROPS.RECEIVABLE)} />;
}
