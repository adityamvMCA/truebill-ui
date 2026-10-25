
import apiClient from "../apiClient";

const ledgerApi = {
  // Get all ledgers
  getAll: (params = {}) =>
    apiClient.get("/accounting/ledgers", { params }),

  // Get a ledger by code
  getByCode: (ledgerCode) =>
    apiClient.get(
      `/accounting/ledgers/${encodeURIComponent(ledgerCode)}`,
    ),

  // Create a new ledger
  create: (data) =>
    apiClient.post("/accounting/ledgers", data),

  // Update an existing ledger
  update: (ledgerCode, data) =>
    apiClient.patch(
      `/accounting/ledgers/${encodeURIComponent(ledgerCode)}`,
      data,
    ),

  // Get ledger transactions
  getTransactions: (ledgerCode, params = {}) =>
    apiClient.get(
      `/accounting/ledgers/${encodeURIComponent(ledgerCode)}/transactions`,
      { params },
    ),
};

export default ledgerApi;
