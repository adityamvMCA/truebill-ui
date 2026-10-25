import CashLedgerReport from "./CashLedgerReport";

import { isPettyCashLedger, loadCashLedgers } from "./cashAccounts";

export default function PettyCash() {
  return (
    <CashLedgerReport
      title="Petty Cash"
      reportName="Petty Cash Book"
      exportPrefix="petty-cash"
      accountLabel="Petty cash account"
      inLabel="Replenishments"
      outLabel="Expenses"
      emptyAccountsMessage='No petty cash account found. Create a CASH ledger with "Petty" in its name or code.'
      loadAccounts={loadCashLedgers}
      filterAccount={isPettyCashLedger}
    />
  );
}
