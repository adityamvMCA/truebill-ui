import apiClient from "../apiClient";

const ledgerInsightApi = {
  getLedgers: (params) => apiClient.get("/accounting/ledgers", { params }),
  getInsights: (ledgerCode, params) =>
    apiClient.get(`/accounting/ledgers/${encodeURIComponent(ledgerCode)}/insights`, { params }),
  getTransactions: (ledgerCode, params) =>
    apiClient.get(`/accounting/ledgers/${encodeURIComponent(ledgerCode)}/transactions`, { params }),
};

export default ledgerInsightApi;