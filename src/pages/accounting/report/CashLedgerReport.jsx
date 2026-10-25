import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ArrowLeft, Download, RefreshCw, Search } from "lucide-react";

import ledgerApi from "../../../services/modules/ledgerApi";

// Reuses the existing Bank Ledger styles. Keep this file in the same
// folder as BankLedger.css, or change the path.
import "../BankLedger.css";
// import "../CashLedger.css";

/* ---------- helpers ---------- */

const toLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getToday = () => toLocalDate(new Date());

const getMonthStart = () => {
  const date = new Date();

  return toLocalDate(new Date(date.getFullYear(), date.getMonth(), 1));
};

const amountFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const money = (value) => amountFormatter.format(Math.abs(Number(value || 0)));

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

const getBalanceType = (value, explicitType) => {
  const amount = Number(value || 0);

  if (amount > 0) return "Dr";
  if (amount < 0) return "Cr";

  return explicitType === "CREDIT" ? "Cr" : "Dr";
};

const voucherLabels = {
  SUPPLIER_PAYMENT: "Payment",
  CUSTOMER_RECEIPT: "Receipt",
  MANUAL_JOURNAL: "Journal",
  PURCHASE_BILL: "Purchase",
  SALES_INVOICE: "Sales",
  PURCHASE_RETURN: "Purchase Return",
  SALES_RETURN: "Sales Return",
  CREDIT_NOTE: "Credit Note",
  DEBIT_NOTE: "Debit Note",
  EXPENSE: "Expense",
  TDS_DEDUCTION: "TDS",
  TDS_DEPOSIT: "TDS Deposit",
};

const getVoucherLabel = (item) => {
  const type = item.sourceType || item.voucherType;

  return voucherLabels[type] || type || "Journal";
};

const getDocumentNumber = (item) =>
  item.sourceNumber || item.reference || item.journalNumber || "—";

const getDescription = (item) =>
  item.description || item.narration || item.counterAccount || "—";

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Unable to load the report.";

const readLedgerResponse = (response) => {
  const body = response?.data;

  if (!body?.success || !body?.data || !Array.isArray(body.transactions)) {
    throw new Error(body?.message || "Invalid ledger response.");
  }

  return body;
};

const getPageCount = (pagination) => {
  const pages = Number(pagination?.totalPages ?? 1);

  if (!Number.isSafeInteger(pages) || pages < 0) {
    throw new Error("Invalid pagination response.");
  }

  return Math.max(1, pages);
};

const csvCell = (value) => {
  let text = String(value ?? "");

  if (/^\s*[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
};

function Balance({ value, type, className = "" }) {
  return (
    <span className={`bl-balance ${className}`}>
      {money(value)}

      <small>{getBalanceType(value, type)}</small>
    </span>
  );
}

/* ---------- component ---------- */

/**
 * Props
 *  - title:           page heading fallback, e.g. "Cash Book"
 *  - reportName:      subtitle text, e.g. "Cash Book"
 *  - exportPrefix:    CSV file prefix, e.g. "cash-book"
 *  - accountLabel:    label above the selector, e.g. "Cash account"
 *  - inLabel/outLabel: wording for debit/credit columns and cards
 *  - emptyAccountsMessage
 *  - loadAccounts:    async () => ledger[]        (MUST be a stable reference)
 *  - filterAccount:   (ledger) => boolean         (MUST be a stable reference)
 */
export default function CashLedgerReport({
  title,
  reportName,
  exportPrefix,
  accountLabel = "Cash account",
  inLabel = "Cash In",
  outLabel = "Cash Out",
  emptyAccountsMessage = "No cash accounts found.",
  loadAccounts,
  filterAccount,
}) {
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState([]);
  const [accountCode, setAccountCode] = useState("");

  const [startDate, setStartDate] = useState(getMonthStart);
  const [endDate, setEndDate] = useState(getToday);

  const [search, setSearch] = useState("");

  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);

  const [accountsLoading, setAccountsLoading] = useState(true);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const [accountsError, setAccountsError] = useState("");
  const [ledgerError, setLedgerError] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);

  /* ----- load cash accounts ----- */

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setAccountsLoading(true);
      setAccountsError("");

      try {
        const all = await loadAccounts();

        if (cancelled) return;

        const unique = Array.from(
          new Map(
            all
              .filter(filterAccount)
              .map((ledger) => [String(ledger._id || ledger.code), ledger]),
          ).values(),
        ).sort((a, b) => String(a.name).localeCompare(String(b.name)));

        setAccounts(unique);

        setAccountCode((current) =>
          unique.some((ledger) => ledger.code === current)
            ? current
            : unique[0]?.code || "",
        );
      } catch (error) {
        if (!cancelled) {
          setAccountsError(getErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setAccountsLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [loadAccounts, filterAccount, refreshKey]);

  /* ----- load ledger for selected account ----- */

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setSummary(null);
      setTransactions([]);
      setLedgerError("");

      if (!accountCode) {
        setLedgerLoading(false);
        return;
      }

      if (!startDate || !endDate || startDate > endDate) {
        setLedgerError("Choose a valid From and To date.");
        setLedgerLoading(false);
        return;
      }

      setLedgerLoading(true);

      try {
        const params = { startDate, endDate, page: 1, limit: 200 };

        const firstResponse = await ledgerApi.getTransactions(
          accountCode,
          params,
        );

        if (cancelled) return;

        const first = readLedgerResponse(firstResponse);
        const rows = [...first.transactions];
        const totalPages = getPageCount(first.pagination);

        for (let page = 2; page <= totalPages; page += 1) {
          if (cancelled) return;

          const response = await ledgerApi.getTransactions(accountCode, {
            ...params,
            page,
          });

          if (cancelled) return;

          rows.push(...readLedgerResponse(response).transactions);
        }

        if (cancelled) return;

        setSummary(first.data);
        setTransactions(rows);
      } catch (error) {
        if (!cancelled) {
          setSummary(null);
          setTransactions([]);
          setLedgerError(getErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setLedgerLoading(false);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [accountCode, startDate, endDate, refreshKey]);

  /* ----- derived ----- */

  const selectedAccount = useMemo(
    () => accounts.find((ledger) => ledger.code === accountCode),
    [accounts, accountCode],
  );

  const visibleTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return transactions;

    return transactions.filter((item) =>
      [
        getDescription(item),
        item.counterAccount,
        item.sourceNumber,
        item.reference,
        item.journalNumber,
        getVoucherLabel(item),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [transactions, search]);

  const inCount = useMemo(
    () => transactions.filter((item) => Number(item.debit) > 0).length,
    [transactions],
  );

  const outCount = useMemo(
    () => transactions.filter((item) => Number(item.credit) > 0).length,
    [transactions],
  );

  // Running balance goes negative when cash paid out exceeds cash on hand.
  const lowestBalance = useMemo(() => {
    if (!transactions.length) return 0;

    return Math.min(...transactions.map((item) => Number(item.balance || 0)));
  }, [transactions]);

  const opening = Number(summary?.openingBalance || 0);
  const closing = Number(summary?.closingBalance || 0);
  const totalDebit = Number(summary?.totals?.debit || 0);
  const totalCredit = Number(summary?.totals?.credit || 0);

  const busy = accountsLoading || ledgerLoading;

  const ready =
    Boolean(summary) && !busy && !accountsError && !ledgerError;

  const wentNegative = ready && (lowestBalance < 0 || closing < 0 || opening < 0);

  /* ----- export ----- */

  const exportCsv = () => {
    if (!ready) return;

    const rows = [
      ["Report", reportName],
      ["Account", selectedAccount?.name || ""],
      ["Ledger Code", accountCode],
      ["From", startDate],
      ["To", endDate],
      [
        "Scope",
        search.trim()
          ? `Search: ${search.trim()}; totals are for the full period`
          : "All transactions in the selected period",
      ],
      [],
      [
        "Date",
        "Document Number",
        "Journal Number",
        "Particulars",
        "Voucher Type",
        `${inLabel} (Debit)`,
        `${outLabel} (Credit)`,
        "Balance",
        "Balance Type",
      ],
      [
        "",
        "",
        "",
        "Opening Balance",
        "",
        "",
        "",
        Math.abs(opening).toFixed(2),
        getBalanceType(opening, summary.openingBalanceType),
      ],
      ...visibleTransactions.map((item) => [
        formatDate(item.date),
        getDocumentNumber(item),
        item.journalNumber || "",
        getDescription(item),
        getVoucherLabel(item),
        Number(item.debit || 0).toFixed(2),
        Number(item.credit || 0).toFixed(2),
        Math.abs(Number(item.balance || 0)).toFixed(2),
        getBalanceType(item.balance, item.balanceType),
      ]),
      [
        "",
        "",
        "",
        "Full Period Totals / Closing Balance",
        "",
        totalDebit.toFixed(2),
        totalCredit.toFixed(2),
        Math.abs(closing).toFixed(2),
        getBalanceType(closing, summary.closingBalanceType),
      ],
    ];

    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `${exportPrefix}-${accountCode}-${startDate}-${endDate}.csv`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  /* ----- render ----- */

  return (
    <main className="bl-page">
      <header className="bl-header">
        <div className="bl-heading">
          <button
            type="button"
            className="bl-back"
            aria-label="Go back"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={18} />
          </button>

          <div className="bl-title">
            <h1>{selectedAccount?.name || title}</h1>

            <p>
              {accountCode || "Select account"}
              {" · "}
              {reportName}
            </p>
          </div>
        </div>

        <div className="bl-actions">
          <button
            type="button"
            className="bl-button"
            onClick={exportCsv}
            disabled={!ready}
          >
            <Download size={16} />
            Export
          </button>

          <button
            type="button"
            className="bl-button bl-button-primary"
            disabled={busy}
            onClick={() => setRefreshKey((current) => current + 1)}
          >
            <RefreshCw size={16} className={busy ? "bl-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      <section className="bl-account-picker">
        <label htmlFor="bl-account">{accountLabel}</label>

        <select
          id="bl-account"
          value={accountCode}
          disabled={accountsLoading}
          onChange={(event) => setAccountCode(event.target.value)}
        >
          <option value="">
            {accountsLoading ? "Loading accounts..." : "Select account"}
          </option>

          {accounts.map((ledger) => (
            <option key={ledger._id || ledger.code} value={ledger.code}>
              {ledger.name} ({ledger.code})
            </option>
          ))}
        </select>
      </section>

      {(accountsError || ledgerError) && (
        <div className="bl-error" role="alert">
          {accountsError || ledgerError}
        </div>
      )}

      {wentNegative && (
        <div className="bl-warning" role="status">
          This cash account shows a credit (negative) balance at some point in
          the period. Cash paid out is more than the cash recorded as received,
          so check for a missing receipt, deposit, or opening balance.
        </div>
      )}

      <section className="bl-cards" aria-label="Report summary">
        <article className="bl-card">
          <span>Opening Balance</span>

          <strong>{ready ? money(opening) : "—"}</strong>

          <small>
            {ready ? getBalanceType(opening, summary.openingBalanceType) : " "}
          </small>
        </article>

        <article className="bl-card">
          <span>Total {inLabel}</span>

          <strong className="bl-in">{ready ? money(totalDebit) : "—"}</strong>

          <small>{ready ? `${inCount} entries` : " "}</small>
        </article>

        <article className="bl-card">
          <span>Total {outLabel}</span>

          <strong className="bl-out">
            {ready ? money(totalCredit) : "—"}
          </strong>

          <small>{ready ? `${outCount} entries` : " "}</small>
        </article>

        <article className="bl-card">
          <span>Closing Balance</span>

          <strong className="bl-primary">{ready ? money(closing) : "—"}</strong>

          <small>
            {ready ? getBalanceType(closing, summary.closingBalanceType) : " "}
          </small>
        </article>
      </section>

      <section className="bl-filters" aria-label="Report filters">
        <div className="bl-search">
          <Search size={17} aria-hidden="true" />

          <input
            type="search"
            value={search}
            aria-label="Search transactions"
            placeholder="Search particulars, document, note..."
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <label className="bl-date">
          <span>From</span>

          <input
            type="date"
            value={startDate}
            max={endDate || undefined}
            onChange={(event) => setStartDate(event.target.value)}
          />
        </label>

        <label className="bl-date">
          <span>To</span>

          <input
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </label>

        <div className="bl-opening-chip">
          <span>Opening Bal</span>

          {ready ? (
            <Balance value={opening} type={summary.openingBalanceType} />
          ) : (
            <strong>—</strong>
          )}
        </div>
      </section>

      {search.trim() && ready && (
        <p className="bl-search-note">
          Showing {visibleTransactions.length} of {transactions.length} entries.
          Balances and totals remain for the full selected period.
        </p>
      )}

      <section
        className="bl-table-card"
        aria-label={reportName}
        aria-busy={busy}
      >
        <div
          className="bl-table-scroll"
          tabIndex={0}
          role="region"
          aria-label={`Scrollable ${reportName} table`}
        >
          <table className="bl-table">
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Doc No</th>
                <th scope="col">Particulars</th>
                <th scope="col">Vch Type</th>

                <th scope="col" className="bl-number bl-in-heading">
                  {inLabel} (Dr)
                </th>

                <th scope="col" className="bl-number bl-out-heading">
                  {outLabel} (Cr)
                </th>

                <th scope="col" className="bl-number">
                  Balance
                </th>
              </tr>
            </thead>

            <tbody>
              {ready && (
                <tr className="bl-opening-row">
                  <td colSpan={6}>Opening Balance</td>

                  <td className="bl-number">
                    <Balance value={opening} type={summary.openingBalanceType} />
                  </td>
                </tr>
              )}

              {busy ? (
                <tr>
                  <td colSpan={7} className="bl-empty">
                    Loading transactions...
                  </td>
                </tr>
              ) : !ready ? (
                <tr>
                  <td colSpan={7} className="bl-empty">
                    {accountsError || ledgerError
                      ? "Unable to display transactions."
                      : accounts.length
                        ? "Select an account."
                        : emptyAccountsMessage}
                  </td>
                </tr>
              ) : !visibleTransactions.length ? (
                <tr>
                  <td colSpan={7} className="bl-empty">
                    {search.trim()
                      ? "No transactions match your search."
                      : "No transactions found for this period."}
                  </td>
                </tr>
              ) : (
                visibleTransactions.map((item) => {
                  const description = getDescription(item);

                  return (
                    <tr key={item._id}>
                      <td className="bl-nowrap">{formatDate(item.date)}</td>

                      <td>
                        <strong className="bl-doc">
                          {getDocumentNumber(item)}
                        </strong>

                        {item.journalNumber &&
                          item.journalNumber !== getDocumentNumber(item) && (
                            <small className="bl-subtext">
                              {item.journalNumber}
                            </small>
                          )}
                      </td>

                      <td className="bl-particulars">
                        <span>{description}</span>

                        {item.counterAccount &&
                          item.counterAccount !== description && (
                            <small className="bl-subtext">
                              {item.counterAccount}
                            </small>
                          )}
                      </td>

                      <td>
                        <span className="bl-voucher">
                          {getVoucherLabel(item)}
                        </span>
                      </td>

                      <td className="bl-number bl-in">
                        {Number(item.debit) ? money(item.debit) : "—"}
                      </td>

                      <td className="bl-number bl-out">
                        {Number(item.credit) ? money(item.credit) : "—"}
                      </td>

                      <td className="bl-number">
                        <Balance value={item.balance} type={item.balanceType} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            {ready && (
              <tfoot>
                <tr className="bl-closing-row">
                  <td colSpan={4}>Period Totals / Closing Balance</td>

                  <td className="bl-number bl-in">{money(totalDebit)}</td>

                  <td className="bl-number bl-out">{money(totalCredit)}</td>

                  <td className="bl-number">
                    <Balance
                      value={closing}
                      type={summary.closingBalanceType}
                      className="bl-primary"
                    />
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {ready && (
        <footer className="bl-footer">
          <span>
            {transactions.length} entries
            {" · "}
            {startDate} to {endDate}
          </span>

          <span>
            Debit = {inLabel.toLowerCase()} · Credit = {outLabel.toLowerCase()}
            {" · "}
            Dr/Cr indicates the ledger balance.
          </span>
        </footer>
      )}
    </main>
  );
}
