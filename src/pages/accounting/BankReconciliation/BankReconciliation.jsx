import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  Banknote,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  History,
  Landmark,
  RefreshCw,
  Scale,
  Search,
  Undo2,
  Wallet,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import api from "../../../services/api";
import "./BankReconciliation.css";

const STATUS_TABS = [
  { key: "OPEN", label: "Open" },
  { key: "UNCLEARED", label: "Uncleared" },
  { key: "CLEARED", label: "Cleared" },
  { key: "RECONCILED", label: "Reconciled" },
];

const STATE_STYLES = {
  UNCLEARED: { label: "Uncleared", className: "dl-status-pending" },
  CLEARED: { label: "Cleared", className: "dl-status-created" },
  RECONCILED: { label: "Reconciled", className: "dl-status-active" },
};

const SOURCE_LABELS = {
  SALES_INVOICE: "Sales Invoice",
  SALES_RETURN: "Sales Return",
  PURCHASE_BILL: "Purchase Bill",
  MANUAL_JOURNAL: "Manual Journal",
  SUPPLIER_PAYMENT: "Supplier Payment",
  CUSTOMER_RECEIPT: "Customer Receipt",
};

const BALANCE_PATTERN = /^-?\d{1,12}(\.\d{1,2})?$/;

const pad = (value) => String(value).padStart(2, "0");

const toDateInput = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const rupeeFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
});

const money = (paise) => rupeeFormatter.format((Number(paise) || 0) / 100);

const signedMoney = (paise) => {
  const value = Number(paise) || 0;

  if (value === 0) return money(0);

  return `${value > 0 ? "+" : "-"}${money(Math.abs(value))}`;
};

const balanceLabel = (paise) => {
  if (paise === null || paise === undefined) return "Not entered";

  return `${money(Math.abs(paise))} ${paise < 0 ? "Cr" : "Dr"}`;
};

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : "-";

const getErrorMessage = (error) => {
  const data = error?.response?.data;

  if (typeof data?.message === "string") return data.message;
  if (typeof data?.error === "string") return data.error;

  return error?.message || "Something went wrong. Please try again.";
};

const getPageNumbers = (page, totalPages) => {
  const size = 5;
  let start = Math.max(page - Math.floor(size / 2), 1);
  const end = Math.min(start + size - 1, totalPages);

  start = Math.max(end - size + 1, 1);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
};

const getRowKey = (row) => `${row.journalId}:${row.lineIndex}`;

function SummaryCard({ icon, label, value, note }) {
  return (
    <div className="br-card">
      <div className="br-card-icon">{icon}</div>

      <div className="br-card-body">
        <span className="br-card-label">{label}</span>
        <span className="br-card-value">{value}</span>
        <span className="br-card-note">{note}</span>
      </div>
    </div>
  );
}

function StateBadge({ state }) {
  const style = STATE_STYLES[state] || STATE_STYLES.UNCLEARED;

  return (
    <span className={`dl-status ${style.className}`}>
      <span className="dl-status-dot" />
      {style.label}
    </span>
  );
}

function LoadingSkeleton({ columns = 8, rows = 5 }) {
  const template = `repeat(${columns}, 1fr)`;

  return (
    <div className="dl-loading">
      <div className="dl-loading-head" style={{ gridTemplateColumns: template }}>
        {Array.from({ length: columns }, (_, index) => (
          <span key={index} />
        ))}
      </div>

      {Array.from({ length: rows }, (_, rowIndex) => (
        <div
          key={rowIndex}
          className="dl-loading-row"
          style={{ gridTemplateColumns: template }}
        >
          {Array.from({ length: columns }, (_, index) => (
            <span key={index} />
          ))}
        </div>
      ))}
    </div>
  );
}

function BankReconciliation() {
  const [accounts, setAccounts] = useState([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [bankLedgerId, setBankLedgerId] = useState("");
  const [statementDate, setStatementDate] = useState(() =>
    toDateInput(new Date()),
  );
  const [balanceInput, setBalanceInput] = useState("");
  const [appliedBalance, setAppliedBalance] = useState("");
  const [status, setStatus] = useState("OPEN");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState({});
  const [acting, setActing] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const requestRef = useRef(0);

  const trimmedBalance = balanceInput.trim();
  const balanceInvalid = trimmedBalance !== "" && !BALANCE_PATTERN.test(trimmedBalance);
  const balanceForRequest = BALANCE_PATTERN.test(appliedBalance)
    ? appliedBalance
    : "";

  useEffect(() => {
    let active = true;

    const loadAccounts = async () => {
      try {
        setAccountsLoading(true);

        const response = await api.bankReconciliation.accounts();
        const list = Array.isArray(response?.data?.data)
          ? response.data.data
          : [];

        if (!active) return;

        setAccounts(list);
        setBankLedgerId((previous) => previous || list[0]?._id || "");
      } catch (accountsError) {
        console.error("Unable to load bank accounts:", accountsError);
        toast.error(getErrorMessage(accountsError));
      } finally {
        if (active) setAccountsLoading(false);
      }
    };

    loadAccounts();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAppliedBalance(trimmedBalance);
      setPage(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [trimmedBalance]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setSelected({});
  }, [bankLedgerId, statementDate, status, search, page, limit]);

  const load = useCallback(async () => {
    if (!bankLedgerId || !statementDate) {
      setLoading(false);
      return;
    }

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;

    try {
      setLoading(true);
      setError("");

      const response = await api.bankReconciliation.get({
        bankLedgerId,
        statementDate,
        statementBalance: balanceForRequest || undefined,
        status,
        search: search || undefined,
        page,
        limit,
      });

      const payload = response?.data;

      if (!payload || !payload.summary || !Array.isArray(payload.rows)) {
        throw new Error(
          "Bank reconciliation response is invalid. Check the bankReconciliation API route.",
        );
      }

      if (requestId !== requestRef.current) return;

      setData(payload);
    } catch (requestError) {
      if (requestId !== requestRef.current) return;

      console.error("Unable to load bank reconciliation:", requestError);

      const message = getErrorMessage(requestError);

      setData(null);
      setError(message);
      toast.error(message);
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [
    bankLedgerId,
    statementDate,
    balanceForRequest,
    status,
    search,
    page,
    limit,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  const loadHistory = useCallback(async () => {
    if (!bankLedgerId) {
      setHistory([]);
      return;
    }

    try {
      setHistoryLoading(true);

      const response = await api.bankReconciliation.history({
        bankLedgerId,
        limit: 10,
      });

      setHistory(Array.isArray(response?.data?.data) ? response.data.data : []);
    } catch (historyError) {
      console.error("Unable to load reconciliation history:", historyError);
    } finally {
      setHistoryLoading(false);
    }
  }, [bankLedgerId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const summary = data?.summary || null;
  const rows = data?.rows || [];

  const pagination = data?.pagination || {
    page: 1,
    limit,
    total: 0,
    totalPages: 0,
  };

  const showingFrom = pagination.total
    ? (pagination.page - 1) * pagination.limit + 1
    : 0;

  const showingTo = Math.min(
    pagination.page * pagination.limit,
    pagination.total,
  );

  const selectedList = Object.values(selected);
  const toClear = selectedList.filter((item) => item.state === "UNCLEARED");
  const toUnclear = selectedList.filter((item) => item.state === "CLEARED");

  const selectableRows = rows.filter((row) => row.state !== "RECONCILED");

  const allSelected =
    selectableRows.length > 0 &&
    selectableRows.every((row) => selected[getRowKey(row)]);

  const tabCount = useMemo(() => {
    if (!summary) return {};

    return {
      OPEN: summary.unclearedCount + summary.clearedCount,
      UNCLEARED: summary.unclearedCount,
      CLEARED: summary.clearedCount,
      RECONCILED: summary.reconciledCount,
    };
  }, [summary]);

  const difference = summary?.differencePaise;
  const hasStatement = difference !== null && difference !== undefined;
  const balanced = hasStatement && difference === 0;

  const canFinalize =
    Boolean(summary) &&
    balanced &&
    summary.clearedCount > 0 &&
    !balanceInvalid &&
    !acting &&
    !loading;

  const latestCompletedId = history.find(
    (item) => item.status === "COMPLETED",
  )?._id;

  const toggleRow = (row) => {
    if (row.state === "RECONCILED") return;

    const key = getRowKey(row);

    setSelected((previous) => {
      const next = { ...previous };

      if (next[key]) {
        delete next[key];
      } else {
        next[key] = {
          journalId: row.journalId,
          lineIndex: row.lineIndex,
          state: row.state,
        };
      }

      return next;
    });
  };

  const toggleAll = () => {
    setSelected((previous) => {
      const next = { ...previous };

      if (allSelected) {
        for (const row of selectableRows) delete next[getRowKey(row)];
      } else {
        for (const row of selectableRows) {
          next[getRowKey(row)] = {
            journalId: row.journalId,
            lineIndex: row.lineIndex,
            state: row.state,
          };
        }
      }

      return next;
    });
  };

  const refreshAll = async () => {
    await Promise.all([load(), loadHistory()]);
  };

  const applyClear = async (clear) => {
    const list = clear ? toClear : toUnclear;

    if (!list.length || acting) return;

    try {
      setActing(true);

      await api.bankReconciliation.clear({
        bankLedgerId,
        clear,
        clearedDate: statementDate,
        items: list.map(({ journalId, lineIndex }) => ({
          journalId,
          lineIndex,
        })),
      });

      toast.success(
        clear
          ? `${list.length} transaction(s) marked as cleared`
          : `${list.length} transaction(s) marked as uncleared`,
      );

      setSelected({});
      await load();
    } catch (actionError) {
      console.error("Unable to update transactions:", actionError);
      toast.error(getErrorMessage(actionError));
    } finally {
      setActing(false);
    }
  };

  const handleFinalize = async () => {
    if (!canFinalize) return;

    const confirmed = window.confirm(
      `Complete the reconciliation for ${data?.bank?.name || "this account"} as of ${formatDate(`${statementDate}T00:00:00.000Z`)}? Cleared transactions will be locked until you undo it.`,
    );

    if (!confirmed) return;

    try {
      setActing(true);

      const response = await api.bankReconciliation.finalize({
        bankLedgerId,
        statementDate,
        statementBalance: balanceForRequest,
      });

      const number = response?.data?.reconciliation?.reconciliationNumber;

      toast.success(
        number
          ? `Reconciliation ${number} completed`
          : "Reconciliation completed",
      );

      await refreshAll();
    } catch (actionError) {
      console.error("Unable to complete reconciliation:", actionError);
      toast.error(getErrorMessage(actionError));
    } finally {
      setActing(false);
    }
  };

  const handleUndo = async (item) => {
    if (acting) return;

    const confirmed = window.confirm(
      `Undo reconciliation ${item.reconciliationNumber}? Its transactions will go back to cleared (not locked).`,
    );

    if (!confirmed) return;

    try {
      setActing(true);

      await api.bankReconciliation.undo(item._id);

      toast.success(`Reconciliation ${item.reconciliationNumber} reversed`);

      await refreshAll();
    } catch (actionError) {
      console.error("Unable to undo reconciliation:", actionError);
      toast.error(getErrorMessage(actionError));
    } finally {
      setActing(false);
    }
  };

  const selectStatus = (key) => {
    setStatus(key);
    setPage(1);
  };

  const resetFilters = () => {
    setStatus("OPEN");
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  const bannerClass = !hasStatement ? "" : balanced ? "ok" : "warn";

  let bannerContent;

  if (!hasStatement) {
    bannerContent = (
      <span>
        <strong>Enter your statement balance.</strong> Type the closing balance
        from your bank statement to start reconciling.
      </span>
    );
  } else if (balanced && summary.clearedCount > 0) {
    bannerContent = (
      <span>
        <strong>Balanced.</strong> Your cleared transactions agree with the bank
        statement. You can complete the reconciliation.
      </span>
    );
  } else if (balanced) {
    bannerContent = (
      <span>
        <strong>Balanced, but nothing is marked cleared.</strong> Mark the
        transactions that appear on the statement as cleared.
      </span>
    );
  } else {
    bannerContent = (
      <span>
        <strong>Difference of {money(Math.abs(difference))}.</strong> Mark the
        transactions that appear on your statement as cleared until this reaches
        zero.
      </span>
    );
  }

  const noAccounts = !accountsLoading && accounts.length === 0;

  return (
    <div className="data-list">
      <div className="dl-header">
        <div className="dl-header-content">
          <h1>Bank Reconciliation</h1>
          <p>
            Match your bank ledger against the bank statement and clear
            differences
          </p>
        </div>

        <button
          type="button"
          className="so-primary-button dl-add-button br-primary-button"
          onClick={handleFinalize}
          disabled={!canFinalize}
        >
          <BadgeCheck size={14} />
          {acting ? "Working..." : "Complete Reconciliation"}
        </button>
      </div>

      {noAccounts ? (
        <div className="dl-card br-block">
          <div className="dl-state">
            <Landmark size={26} />
            <strong>No bank accounts found</strong>
            <span>
              Create a bank account first. Bank ledgers are detected by their
              code (BK...).
            </span>
          </div>
        </div>
      ) : (
        <>
          <div className="dl-card br-block">
            <div className="dl-filter-panel br-setup">
              <div className="dl-filter-header">
                <div>
                  <strong>Statement Details</strong>
                  <span>Choose the account and enter the statement figures</span>
                </div>

                <button type="button" onClick={refreshAll} disabled={loading}>
                  Refresh
                </button>
              </div>

              <div className="br-setup-grid">
                <div className="dl-field">
                  <label htmlFor="br-bank">Bank Account</label>
                  <select
                    id="br-bank"
                    value={bankLedgerId}
                    disabled={accountsLoading || acting}
                    onChange={(event) => {
                      setBankLedgerId(event.target.value);
                      setPage(1);
                    }}
                  >
                    {accounts.map((account) => (
                      <option key={account._id} value={account._id}>
                        {account.code} · {account.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="dl-field">
                  <label htmlFor="br-date">Statement Date</label>
                  <input
                    id="br-date"
                    type="date"
                    value={statementDate}
                    disabled={acting}
                    onChange={(event) => {
                      setStatementDate(event.target.value);
                      setPage(1);
                    }}
                  />
                </div>

                <div className="dl-field">
                  <label htmlFor="br-balance">Statement Closing Balance</label>
                  <input
                    id="br-balance"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={balanceInput}
                    disabled={acting}
                    onChange={(event) => setBalanceInput(event.target.value)}
                  />

                  {balanceInvalid ? (
                    <span className="br-error">
                      Enter a valid amount with up to two decimals.
                    </span>
                  ) : (
                    <span className="br-hint">
                      Use a minus sign for an overdraft.
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="br-cards">
            <SummaryCard
              icon={<Banknote size={19} />}
              label="Statement Balance"
              value={balanceLabel(summary?.statementBalancePaise)}
              note={`Closing balance on ${formatDate(`${statementDate}T00:00:00.000Z`)}`}
            />

            <SummaryCard
              icon={<Wallet size={19} />}
              label="Book Balance"
              value={summary ? balanceLabel(summary.bookBalancePaise) : "-"}
              note="Per your ledger on that date"
            />

            <SummaryCard
              icon={<CheckCheck size={19} />}
              label="Cleared Balance"
              value={summary ? balanceLabel(summary.clearedBalancePaise) : "-"}
              note={
                summary
                  ? `Book balance less ${summary.unclearedCount} uncleared item(s)`
                  : "Book balance less uncleared items"
              }
            />

            <SummaryCard
              icon={<Scale size={19} />}
              label="Difference"
              value={hasStatement ? money(Math.abs(difference)) : "-"}
              note={
                !hasStatement
                  ? "Enter the statement balance"
                  : balanced
                    ? "Balanced"
                    : "Statement minus cleared balance"
              }
            />
          </div>

          <div className={`br-banner ${bannerClass}`}>
            {balanced ? <BadgeCheck size={18} /> : <Scale size={18} />}
            {bannerContent}
          </div>

          <div className="dl-card br-block">
            <div className="dl-toolbar">
              <div className="dl-search">
                <Search size={15} />

                <input
                  type="text"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search journal, source number or narration..."
                />

                {searchInput && (
                  <button type="button" onClick={() => setSearchInput("")}>
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="dl-toolbar-actions">
                <button
                  type="button"
                  className="dl-tool"
                  onClick={load}
                  disabled={loading}
                >
                  <RefreshCw
                    size={14}
                    className={loading ? "dl-refresh-icon-spin" : undefined}
                  />
                  Refresh
                </button>
              </div>
            </div>

            <div className="dl-quick-filters">
              {STATUS_TABS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={status === item.key ? "active" : ""}
                  onClick={() => selectStatus(item.key)}
                >
                  {item.label}
                  <span className="dl-quick-count">
                    {tabCount[item.key] ?? 0}
                  </span>
                </button>
              ))}
            </div>

            {selectedList.length > 0 && (
              <div className="dl-bulk-bar">
                <div>
                  {selectedList.length} selected
                  <button type="button" onClick={() => setSelected({})}>
                    <X size={13} />
                  </button>
                </div>

                <div className="dl-bulk-actions">
                  {toClear.length > 0 && (
                    <button
                      type="button"
                      onClick={() => applyClear(true)}
                      disabled={acting}
                    >
                      <CheckCheck size={13} />
                      Mark {toClear.length} cleared
                    </button>
                  )}

                  {toUnclear.length > 0 && (
                    <button
                      type="button"
                      className="danger"
                      onClick={() => applyClear(false)}
                      disabled={acting}
                    >
                      <Undo2 size={13} />
                      Mark {toUnclear.length} uncleared
                    </button>
                  )}
                </div>
              </div>
            )}

            {loading && !data ? (
              <LoadingSkeleton columns={8} />
            ) : error ? (
              <div className="dl-state">
                <strong>Unable to load bank reconciliation</strong>
                <span>{error}</span>
                <button type="button" onClick={load}>
                  Try again
                </button>
              </div>
            ) : !rows.length ? (
              <div className="dl-state">
                <Landmark size={26} />
                <strong>No transactions found</strong>
                <span>
                  No bank transactions match this status, date or search.
                </span>
                <button type="button" onClick={resetFilters}>
                  Reset filters
                </button>
              </div>
            ) : (
              <>
                <div
                  className="dl-table-wrapper dl-box-mobile"
                  style={{ opacity: loading ? 0.6 : 1 }}
                >
                  <table className="dl-table">
                    <thead>
                      <tr>
                        <th className="dl-checkbox-column">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            disabled={!selectableRows.length || acting}
                            onChange={toggleAll}
                          />
                        </th>
                        <th>Date</th>
                        <th>Transaction</th>
                        <th>Particulars</th>
                        <th className="br-num">Deposit (In)</th>
                        <th className="br-num">Withdrawal (Out)</th>
                        <th>Status</th>
                        <th>Cleared On</th>
                      </tr>
                    </thead>

                    <tbody>
                      {rows.map((row) => {
                        const key = getRowKey(row);
                        const isSelected = Boolean(selected[key]);
                        const locked = row.state === "RECONCILED";

                        return (
                          <tr
                            key={key}
                            className={isSelected ? "br-row-selected" : undefined}
                          >
                            <td className="dl-checkbox-column">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={locked || acting}
                                onChange={() => toggleRow(row)}
                              />
                            </td>

                            <td>{formatDate(row.postingDate)}</td>

                            <td>
                              <div className="dl-customer">
                                <strong>{row.journalNumber}</strong>
                                <span>
                                  {SOURCE_LABELS[row.sourceType] ||
                                    row.sourceType}{" "}
                                  · {row.sourceNumber}
                                </span>
                              </div>
                            </td>

                            <td className="br-particulars">
                              {row.narration || "-"}
                            </td>

                            <td className="br-num">
                              {row.debitPaise ? (
                                <span className="br-in">
                                  {money(row.debitPaise)}
                                </span>
                              ) : (
                                "-"
                              )}
                            </td>

                            <td className="br-num">
                              {row.creditPaise ? (
                                <span className="br-out">
                                  {money(row.creditPaise)}
                                </span>
                              ) : (
                                "-"
                              )}
                            </td>

                            <td>
                              <StateBadge state={row.state} />
                            </td>

                            <td>{formatDate(row.clearedDate)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="dl-mobile-box-list">
                  {rows.map((row) => {
                    const key = getRowKey(row);
                    const locked = row.state === "RECONCILED";

                    return (
                      <div className="dl-mobile-card" key={key}>
                        <div className="dl-mobile-header">
                          <div className="br-mobile-title">
                            <input
                              type="checkbox"
                              checked={Boolean(selected[key])}
                              disabled={locked || acting}
                              onChange={() => toggleRow(row)}
                            />

                            <div>
                              <strong>{row.journalNumber}</strong>
                              <span>
                                {SOURCE_LABELS[row.sourceType] || row.sourceType}{" "}
                                · {formatDate(row.postingDate)}
                              </span>
                            </div>
                          </div>

                          <StateBadge state={row.state} />
                        </div>

                        <div className="dl-mobile-grid">
                          <div>
                            <span>Deposit (In)</span>
                            <strong className={row.debitPaise ? "br-in" : ""}>
                              {row.debitPaise ? money(row.debitPaise) : "-"}
                            </strong>
                          </div>

                          <div>
                            <span>Withdrawal (Out)</span>
                            <strong className={row.creditPaise ? "br-out" : ""}>
                              {row.creditPaise ? money(row.creditPaise) : "-"}
                            </strong>
                          </div>

                          <div>
                            <span>Reference</span>
                            <strong>{row.sourceNumber}</strong>
                          </div>

                          <div>
                            <span>Cleared On</span>
                            <strong>{formatDate(row.clearedDate)}</strong>
                          </div>

                          <div>
                            <span>Particulars</span>
                            <strong>{row.narration || "-"}</strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {summary && (
                  <div className="br-legend">
                    Deposits in transit (uncleared receipts):{" "}
                    <strong>{money(summary.unclearedDebitPaise)}</strong> ·
                    Outstanding payments (uncleared payments):{" "}
                    <strong>{money(summary.unclearedCreditPaise)}</strong>
                  </div>
                )}
              </>
            )}

            {!error && pagination.total > 0 && (
              <div className="dl-pagination">
                <div className="dl-pagination-info">
                  <span>
                    Showing <strong>{showingFrom}</strong> to{" "}
                    <strong>{showingTo}</strong> of{" "}
                    <strong>{pagination.total}</strong>
                  </span>

                  <select
                    value={limit}
                    onChange={(event) => {
                      setLimit(Number(event.target.value));
                      setPage(1);
                    }}
                  >
                    {[10, 25, 50, 100].map((size) => (
                      <option key={size} value={size}>
                        {size} / page
                      </option>
                    ))}
                  </select>
                </div>

                <div className="dl-pagination-buttons">
                  <button
                    type="button"
                    onClick={() => setPage(1)}
                    disabled={pagination.page <= 1}
                  >
                    <ChevronsLeft size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setPage((previous) => Math.max(previous - 1, 1))
                    }
                    disabled={pagination.page <= 1}
                  >
                    <ChevronLeft size={14} />
                  </button>

                  {getPageNumbers(pagination.page, pagination.totalPages).map(
                    (number) => (
                      <button
                        key={number}
                        type="button"
                        className={number === pagination.page ? "active" : ""}
                        onClick={() => setPage(number)}
                      >
                        {number}
                      </button>
                    ),
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      setPage((previous) =>
                        Math.min(previous + 1, pagination.totalPages),
                      )
                    }
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    <ChevronRight size={14} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setPage(pagination.totalPages)}
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    <ChevronsRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="dl-card br-block">
            <div className="br-block-title">
              <h3>
                <History
                  size={14}
                  style={{ marginRight: 6, verticalAlign: "-2px" }}
                />
                Reconciliation History
              </h3>
              <p>Only the latest completed reconciliation can be undone</p>
            </div>

            {historyLoading && !history.length ? (
              <LoadingSkeleton columns={6} rows={3} />
            ) : !history.length ? (
              <div className="dl-state">
                <strong>No reconciliations yet</strong>
                <span>Completed reconciliations for this account appear here.</span>
              </div>
            ) : (
              <div className="dl-table-wrapper">
                <table className="dl-table br-history-table">
                  <thead>
                    <tr>
                      <th>Reconciliation</th>
                      <th>Statement Date</th>
                      <th className="br-num">Statement Balance</th>
                      <th className="br-num">Cleared Items</th>
                      <th>Status</th>
                      <th className="br-num">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {history.map((item) => (
                      <tr key={item._id}>
                        <td>
                          <strong>{item.reconciliationNumber}</strong>
                        </td>
                        <td>{formatDate(item.statementDate)}</td>
                        <td className="br-num">
                          {balanceLabel(item.statementBalancePaise)}
                        </td>
                        <td className="br-num">{item.clearedCount}</td>
                        <td>
                          <span
                            className={`dl-status ${
                              item.status === "COMPLETED"
                                ? "dl-status-active"
                                : "dl-status-cancelled"
                            }`}
                          >
                            <span className="dl-status-dot" />
                            {item.status === "COMPLETED"
                              ? "Completed"
                              : "Reversed"}
                          </span>
                        </td>
                        <td className="br-num">
                          {item._id === latestCompletedId ? (
                            <button
                              type="button"
                              className="br-link-button"
                              onClick={() => handleUndo(item)}
                              disabled={acting}
                            >
                              <Undo2 size={12} />
                              Undo
                            </button>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default BankReconciliation;