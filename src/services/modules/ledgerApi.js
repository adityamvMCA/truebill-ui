import apiClient from "../apiClient";

const ledgerApi = {
  getTransactions: (ledgerCode, params = {}) =>
    apiClient.get(
      `/accounting/ledgers/${encodeURIComponent(
        ledgerCode,
      )}/transactions`,
      { params },
    ),
};

export default ledgerApi;