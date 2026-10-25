import CashLedgerReport from "./CashLedgerReport";

import { isMainCashLedger, loadCashLedgers } from "./cashAccounts";

export default function CashBook() {
  return (
    <CashLedgerReport
      title="Cash Book"
      reportName="Cash Book"
      exportPrefix="cash-book"
      accountLabel="Cash account"
      inLabel="Receipts"
      outLabel="Payments"
      emptyAccountsMessage="No active cash accounts found."
      loadAccounts={loadCashLedgers}
      filterAccount={isMainCashLedger}
    />
  );
}
