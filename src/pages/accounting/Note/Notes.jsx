import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  FilePlus2,
  FileText,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import noteApi from "../../../services/modules/noteApi";
import { NOTE_LABELS, REASONS, formatDate, money } from "./noteUtils";
import "./Notes.css";

const TABS = [
  { key: "", label: "All" },
  { key: "CREDIT_NOTE", label: "Credit Notes" },
  { key: "DEBIT_NOTE", label: "Debit Notes" },
];

const PARTIES = [
  { key: "", label: "All parties" },
  { key: "CUSTOMER", label: "Customers" },
  { key: "SUPPLIER", label: "Suppliers" },
];

const reasonLabel = (value) =>
  REASONS.find((r) => r.value === value)?.label || value;

const errorMessage = (error) =>
  error?.response?.data?.message || error?.message || "Unable to load notes.";

export default function Notes() {
  const navigate = useNavigate();

  const [noteType, setNoteType] = useState("");
  const [partyType, setPartyType] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const requestRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    const requestId = ++requestRef.current;

    try {
      setLoading(true);
      setError("");

      const response = await noteApi.getAll({
        noteType: noteType || undefined,
        partyType: partyType || undefined,
        search: search || undefined,
        page,
        limit,
      });

      if (requestId !== requestRef.current) return;

      const body = response?.data;
      if (!body?.success || !Array.isArray(body.data)) {
        throw new Error(body?.message || "Invalid notes response.");
      }

      setRows(body.data);
      setPagination(body.pagination);
    } catch (requestError) {
      if (requestId !== requestRef.current) return;
      const message = errorMessage(requestError);
      setRows([]);
      setError(message);
      toast.error(message);
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [noteType, partyType, search, page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  const resetFilters = () => {
    setNoteType("");
    setPartyType("");
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  const showingFrom = pagination.total ? (pagination.page - 1) * pagination.limit + 1 : 0;
  const showingTo = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <div className="data-list">
      <div className="dl-header">
        <div className="dl-header-content">
          <h1>Credit &amp; Debit Notes</h1>
          <p>Adjust sales and purchase invoices for returns, discounts and price changes</p>
        </div>

        <button
          type="button"
          className="so-primary-button dl-add-button"
          onClick={() => navigate("/accounting/notes/new")}
        >
          <FilePlus2 size={14} />
          New Note
        </button>
      </div>

      <div className="dl-card">
        <div className="dl-toolbar">
          <div className="dl-search">
            <Search size={15} />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search note, party, invoice or journal number..."
            />
            {searchInput && (
              <button type="button" onClick={() => setSearchInput("")}>
                <X size={14} />
              </button>
            )}
          </div>

          <div className="dl-toolbar-actions">
            <select
              className="cn-inline-select"
              value={partyType}
              onChange={(e) => {
                setPartyType(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by party"
            >
              {PARTIES.map((p) => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>

            <button type="button" className="dl-tool" onClick={load} disabled={loading}>
              <RefreshCw size={14} className={loading ? "dl-refresh-icon-spin" : undefined} />
              Refresh
            </button>
          </div>
        </div>

        <div className="dl-quick-filters">
          {TABS.map((tab) => (
            <button
              key={tab.key || "all"}
              type="button"
              className={noteType === tab.key ? "active" : ""}
              onClick={() => {
                setNoteType(tab.key);
                setPage(1);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error ? (
          <div className="dl-state">
            <strong>Unable to load notes</strong>
            <span>{error}</span>
            <button type="button" onClick={load}>Try again</button>
          </div>
        ) : loading && !rows.length ? (
          <div className="dl-state"><span>Loading notes...</span></div>
        ) : !rows.length ? (
          <div className="dl-state">
            <FileText size={26} />
            <strong>No notes found</strong>
            <span>
              {search || noteType || partyType
                ? "No notes match these filters."
                : "Create your first credit or debit note to adjust an invoice."}
            </span>
            {search || noteType || partyType ? (
              <button type="button" onClick={resetFilters}>Reset filters</button>
            ) : (
              <button type="button" onClick={() => navigate("/accounting/notes/new")}>
                New note
              </button>
            )}
          </div>
        ) : (
          <div className="dl-table-wrapper" style={{ opacity: loading ? 0.6 : 1 }}>
            <table className="dl-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Note</th>
                  <th>Party</th>
                  <th>Against</th>
                  <th>Reason</th>
                  <th className="gs-num">Taxable</th>
                  <th className="gs-num">GST</th>
                  <th className="gs-num">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row._id}>
                    <td>{formatDate(row.noteDate)}</td>
                    <td>
                      <div className="dl-customer">
                        <strong>{row.noteNumber}</strong>
                        <span className={`cn-pill cn-${row.noteType === "CREDIT_NOTE" ? "credit" : "debit"}`}>
                          {NOTE_LABELS[row.noteType]}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="dl-customer">
                        <strong>{row.partyName}</strong>
                        <span>{row.partyType === "CUSTOMER" ? "Customer" : "Supplier"}</span>
                      </div>
                    </td>
                    <td>{row.originalDocNumber || "-"}</td>
                    <td>
                      {reasonLabel(row.reason)}
                      {!row.isGoodsRelated && <span className="cn-sub">No goods</span>}
                    </td>
                    <td className="gs-num">{money(row.totalTaxablePaise)}</td>
                    <td className="gs-num">{money(row.totalTaxPaise)}</td>
                    <td className="gs-num"><strong>{money(row.totalAmountPaise)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!error && pagination.total > 0 && (
          <div className="dl-pagination">
            <div className="dl-pagination-info">
              <span>
                Showing <strong>{showingFrom}</strong> to <strong>{showingTo}</strong> of{" "}
                <strong>{pagination.total}</strong>
              </span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
              >
                {[10, 25, 50, 100].map((s) => (
                  <option key={s} value={s}>{s} / page</option>
                ))}
              </select>
            </div>

            <div className="dl-pagination-buttons">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={pagination.page <= 1}
              >
                <ChevronLeft size={14} />
              </button>
              <button type="button" className="active">{pagination.page}</button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(p + 1, pagination.totalPages))}
                disabled={pagination.page >= pagination.totalPages}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
