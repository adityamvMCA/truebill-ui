import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, RefreshCw, Search } from "lucide-react";
import toast from "react-hot-toast";

import {
  formatDate,
  formatPaise,
  getErrors,
  localDate,
} from "../../purchase/purchaseBill.utils";

import "./outstanding-ageing.css";
import outstandingApi from "../../../services/modules/outstandingApi";

const PAGE_SIZES = [25, 50, 100];

const BUCKETS = [
  { key: "notDue", label: "Not Due", tone: "" },
  { key: "d1_30", label: "1–30", tone: "oa-warn" },
  { key: "d31_60", label: "31–60", tone: "oa-warn" },
  { key: "d61_90", label: "61–90", tone: "oa-danger" },
  { key: "d90plus", label: "90+", tone: "oa-danger" },
];

const KINDS = {
  PAYABLE: {
    title: "Payables",
    subtitle: "Amounts owed to suppliers, aged by due date",
    partyLabel: "Supplier",
    docLabel: "Bill",
    totalTone: "oa-danger",
    list: (params) => outstandingApi.getPayables(params),
    party: (id, params) => outstandingApi.getPayableParty(id, params),
  },
  RECEIVABLE: {
    title: "Receivables",
    subtitle: "Amounts customers owe you, aged by due date",
    partyLabel: "Customer",
    docLabel: "Invoice",
    totalTone: "oa-success",
    list: (params) => outstandingApi.getReceivables(params),
    party: (id, params) => outstandingApi.getReceivableParty(id, params),
  },
};

const EMPTY_SUMMARY = {
  partyCount: 0,
  documentCount: 0,
  outstandingAmountPaise: 0,
  overdueAmountPaise: 0,
  ledgerControlPaise: 0,
  ledgerDifferencePaise: 0,
};

const money = (value) => formatPaise(value || 0);

function OutstandingAgeing({ kind = "PAYABLE" }) {
  const cfg = KINDS[kind] || KINDS.PAYABLE;
  const navigate = useNavigate();

  const [asOfDate, setAsOfDate] = useState(localDate());
  const [show, setShow] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);

  const [selected, setSelected] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);

  const listRequest = useRef(0);
  const docsRequest = useRef(0);
  const detailRef = useRef(null);

  const load = useCallback(async () => {
    const requestId = ++listRequest.current;

    try {
      setLoading(true);
      setError("");
      setSelected(null);
      setDocuments([]);

      const response = await cfg.list({
        asOfDate,
        overdueOnly: show === "OVERDUE",
      });

      if (requestId !== listRequest.current) return;

      const body = response?.data || {};

      setRows(Array.isArray(body.data) ? body.data : []);
      setSummary({ ...EMPTY_SUMMARY, ...(body.summary || {}) });
      setPage(1);
    } catch (err) {
      if (requestId !== listRequest.current) return;

      const message = getErrors(err)[0];

      setError(message);
      setRows([]);
      setSummary(EMPTY_SUMMARY);
      toast.error(message);
    } finally {
      if (requestId === listRequest.current) setLoading(false);
    }
  }, [cfg, asOfDate, show]);

  useEffect(() => {
    load();
  }, [load]);

  const openParty = useCallback(
    async (row) => {
      const requestId = ++docsRequest.current;

      setSelected(row);
      setDocuments([]);

      try {
        setDocsLoading(true);

        const response = await cfg.party(row.partyId, { asOfDate });

        if (requestId !== docsRequest.current) return;

        setDocuments(
          Array.isArray(response?.data?.data) ? response.data.data : [],
        );
      } catch (err) {
        if (requestId === docsRequest.current) toast.error(getErrors(err)[0]);
      } finally {
        if (requestId === docsRequest.current) setDocsLoading(false);
      }
    },
    [cfg, asOfDate],
  );

  // Bring the detail section into view, which matters on mobile.
  useEffect(() => {
    if (selected && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selected]);

  const filteredRows = useMemo(() => {
    const text = search.trim().toLowerCase();

    if (!text) return rows;

    return rows.filter(
      (row) =>
        String(row.partyName || "").toLowerCase().includes(text) ||
        String(row.partyCode || "").toLowerCase().includes(text),
    );
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const pagedRows = useMemo(
    () =>
      filteredRows.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize,
      ),
    [filteredRows, currentPage, pageSize],
  );

  // Totals cover every filtered row, not just the visible page.
  const totals = useMemo(() => {
    const result = {
      documentCount: 0,
      outstanding: 0,
      overdue: 0,
      buckets: Object.fromEntries(BUCKETS.map(({ key }) => [key, 0])),
    };

    for (const row of filteredRows) {
      result.documentCount += row.documentCount || 0;
      result.outstanding += row.outstandingAmountPaise || 0;
      result.overdue += row.overdueAmountPaise || 0;

      BUCKETS.forEach(({ key }) => {
        result.buckets[key] += row[key] || 0;
      });
    }

    return result;
  }, [filteredRows]);

  const difference = summary.ledgerDifferencePaise || 0;
  const docWord = cfg.docLabel.toLowerCase();
  const columnCount = 5 + BUCKETS.length;

  return (
    <div className="oa-page">
      <header className="oa-header">
        <div className="oa-heading">
          <button
            type="button"
            className="oa-back"
            aria-label="Go back"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={18} />
          </button>

          <div className="oa-title">
            <h1>{cfg.title}</h1>
            <p>{cfg.subtitle}</p>
          </div>
        </div>

        <button
          type="button"
          className="oa-button oa-button-primary"
          onClick={load}
          disabled={loading}
        >
          {loading ? (
            <Loader2 size={16} className="oa-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
          Refresh
        </button>
      </header>

      {error && (
        <div className="oa-error" role="alert">
          {error}
        </div>
      )}

      <section className="oa-cards" aria-label="Summary">
        <div className="oa-card">
          <span>Total {cfg.title}</span>
          <strong className={cfg.totalTone}>
            {money(summary.outstandingAmountPaise)}
          </strong>
          <small>
            {summary.documentCount} open {docWord}
            {summary.documentCount === 1 ? "" : "s"}
          </small>
        </div>

        <div className="oa-card">
          <span>Overdue</span>
          <strong
            className={summary.overdueAmountPaise > 0 ? "oa-danger" : undefined}
          >
            {money(summary.overdueAmountPaise)}
          </strong>
          <small>Past due date as of {formatDate(asOfDate)}</small>
        </div>

        <div className="oa-card">
          <span>{cfg.partyLabel}s</span>
          <strong className="oa-accent">{summary.partyCount}</strong>
          <small>With a balance</small>
        </div>

        <div className="oa-card">
          <span>Ledger Balance</span>
          <strong>{money(summary.ledgerControlPaise)}</strong>
          <small>
            {difference === 0
              ? "Matches open documents"
              : `Differs by ${money(Math.abs(difference))}`}
          </small>
        </div>
      </section>

      <section className="oa-filters" aria-label="Filters">
        <label className="oa-search">
          <Search size={16} />
          <input
            type="search"
            value={search}
            placeholder={`Search ${cfg.partyLabel.toLowerCase()} name or code`}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            aria-label={`Search ${cfg.partyLabel.toLowerCase()}`}
          />
        </label>

        <label className="oa-field">
          <span>As of Date</span>
          <input
            type="date"
            value={asOfDate}
            onChange={(event) => setAsOfDate(event.target.value || localDate())}
          />
        </label>

        <label className="oa-field">
          <span>Show</span>
          <select
            value={show}
            onChange={(event) => {
              setShow(event.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">All balances</option>
            <option value="OVERDUE">Overdue only</option>
          </select>
        </label>

        <div className="oa-count">
          <span>Showing</span>
          <strong>
            {filteredRows.length} of {rows.length}
          </strong>
        </div>
      </section>

      {difference !== 0 && (
        <p className="oa-note">
          The ledger balance differs from open {docWord}s. This usually means
          advances, opening balances or manual journals.
        </p>
      )}

      <div className="oa-table-card">
        <div className="oa-scroll" tabIndex={0}>
          <table className="oa-table">
            <thead>
              <tr>
                <th>{cfg.partyLabel}</th>
                <th className="oa-num">{cfg.docLabel}s</th>
                <th className="oa-num">Outstanding</th>
                <th className="oa-num">Overdue</th>
                {BUCKETS.map(({ key, label }) => (
                  <th key={key} className="oa-num">
                    {label}
                  </th>
                ))}
                <th>Oldest Due</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td className="oa-empty" colSpan={columnCount}>
                    Loading...
                  </td>
                </tr>
              )}

              {!loading && filteredRows.length === 0 && (
                <tr>
                  <td className="oa-empty" colSpan={columnCount}>
                    No outstanding balances found.
                  </td>
                </tr>
              )}

              {!loading &&
                pagedRows.map((row) => (
                  <tr
                    key={row.partyId}
                    className={
                      selected?.partyId === row.partyId
                        ? "oa-row-active"
                        : undefined
                    }
                  >
                    <td className="oa-party" data-label={cfg.partyLabel}>
                      <button
                        type="button"
                        className="oa-link"
                        onClick={() => openParty(row)}
                      >
                        {row.partyName || "N/A"}
                      </button>
                      <span className="oa-subtext">{row.partyCode}</span>
                    </td>

                    <td className="oa-num" data-label={`${cfg.docLabel}s`}>
                      {row.documentCount}
                    </td>

                    <td className="oa-num oa-strong" data-label="Outstanding">
                      {money(row.outstandingAmountPaise)}
                    </td>

                    <td
                      className={`oa-num ${
                        row.overdueAmountPaise > 0 ? "oa-danger oa-strong" : ""
                      }`}
                      data-label="Overdue"
                    >
                      {money(row.overdueAmountPaise)}
                    </td>

                    {BUCKETS.map(({ key, label, tone }) => (
                      <td
                        key={key}
                        className={`oa-num ${row[key] > 0 ? tone : "oa-zero"}`}
                        data-label={label}
                      >
                        {row[key] > 0 ? money(row[key]) : "—"}
                      </td>
                    ))}

                    <td className="oa-nowrap" data-label="Oldest Due">
                      {formatDate(row.oldestDueDate)}
                    </td>
                  </tr>
                ))}

              {!loading && filteredRows.length > 0 && (
                <tr className="oa-total-row">
                  <td className="oa-party" data-label="Total">
                    Total
                  </td>
                  <td className="oa-num" data-label={`${cfg.docLabel}s`}>
                    {totals.documentCount}
                  </td>
                  <td className="oa-num" data-label="Outstanding">
                    {money(totals.outstanding)}
                  </td>
                  <td
                    className={`oa-num ${totals.overdue > 0 ? "oa-danger" : ""}`}
                    data-label="Overdue"
                  >
                    {money(totals.overdue)}
                  </td>
                  {BUCKETS.map(({ key, label }) => (
                    <td key={key} className="oa-num" data-label={label}>
                      {money(totals.buckets[key])}
                    </td>
                  ))}
                  <td data-label="Oldest Due">—</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && filteredRows.length > pageSize && (
        <nav className="oa-pager" aria-label="Pagination">
          <span>
            {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, filteredRows.length)} of{" "}
            {filteredRows.length}
          </span>

          <div className="oa-pager-controls">
            <select
              value={pageSize}
              aria-label="Rows per page"
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>

            <button
              type="button"
              className="oa-button"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
            >
              Prev
            </button>

            <span className="oa-pager-page">
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              className="oa-button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
            >
              Next
            </button>
          </div>
        </nav>
      )}

      {selected && (
        <>
          <div className="oa-detail-title" ref={detailRef}>
            <h2>
              {selected.partyName} — open {docWord}s
              <small>Outstanding {money(selected.outstandingAmountPaise)}</small>
            </h2>

            <button
              type="button"
              className="oa-button"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>

          <div className="oa-table-card">
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
                  {docsLoading && (
                    <tr>
                      <td className="oa-empty" colSpan={7}>
                        Loading...
                      </td>
                    </tr>
                  )}

                  {!docsLoading && documents.length === 0 && (
                    <tr>
                      <td className="oa-empty" colSpan={7}>
                        No open {docWord}s.
                      </td>
                    </tr>
                  )}

                  {!docsLoading &&
                    documents.map((doc) => (
                      <tr key={doc._id}>
                        <td className="oa-party" data-label={cfg.docLabel}>
                          <span className="oa-voucher">{doc.number}</span>
                        </td>
                        <td className="oa-nowrap" data-label="Date">
                          {formatDate(doc.documentDate)}
                        </td>
                        <td className="oa-nowrap" data-label="Due Date">
                          {formatDate(doc.dueDate)}
                        </td>
                        <td className="oa-num" data-label="Total">
                          {money(doc.totalAmountPaise)}
                        </td>
                        <td className="oa-num" data-label="Settled">
                          {money(doc.paidAmountPaise)}
                        </td>
                        <td
                          className="oa-num oa-strong"
                          data-label="Outstanding"
                        >
                          {money(doc.outstandingAmountPaise)}
                        </td>
                        <td
                          className={`oa-num ${
                            doc.daysOverdue > 0 ? "oa-danger oa-strong" : ""
                          }`}
                          data-label="Days Overdue"
                        >
                          {doc.daysOverdue > 0 ? doc.daysOverdue : "Not due"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="oa-footer">
        <span>
          As of {formatDate(asOfDate)}. Only posted documents are included.
        </span>
        <span>
          Click a {cfg.partyLabel.toLowerCase()} to see open {docWord}s.
        </span>
      </div>
    </div>
  );
}

export default OutstandingAgeing;