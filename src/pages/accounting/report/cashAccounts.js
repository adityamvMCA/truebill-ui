
import ledgerApi from "../../../services/modules/ledgerApi";

export const loadCashLedgers = async () => {
  const response = await ledgerApi.getAll({
    type: "CASH",
    isActive: true,
    page: 1,
    limit: 100,
  });

  const body = response?.data;

  const list = Array.isArray(body?.data)
    ? body.data
    : Array.isArray(body?.ledgers)
      ? body.ledgers
      : Array.isArray(body)
        ? body
        : null;

  if (!list) {
    throw new Error(body?.message || "Invalid ledger response.");
  }

  return list.filter(
    (ledger) =>
      ledger &&
      ledger.code &&
      ledger.isActive !== false &&
      (!ledger.type || ledger.type === "CASH"),
  );
};

// Petty cash ledgers are CASH ledgers whose code or name mentions "petty".
export const isPettyCashLedger = (ledger) =>
  /petty/i.test(`${ledger.code || ""} ${ledger.name || ""}`);

export const isMainCashLedger = (ledger) => !isPettyCashLedger(ledger);
