// import apiClient from "../apiClient";

// const ledgerApi = {
//   getTransactions: (ledgerCode, params = {}) =>
//     apiClient.get(
//       `/accounting/ledgers/${encodeURIComponent(
//         ledgerCode,
//       )}/transactions`,
//       { params },
//     ),
// };

// export default ledgerApi;

import apiClient from "../apiClient";

const ledgerApi = {
  // NEW: list ledgers (used by the credit/debit note form).
  // Use the same URL your Ledgers / Chart of Accounts page already calls.
  getAll: (params = {}) =>
    apiClient.get("/accounting/ledgers", { params }),

  getTransactions: (ledgerCode, params = {}) =>
    apiClient.get(
      `/accounting/ledgers/${encodeURIComponent(ledgerCode)}/transactions`,
      { params },
    ),
};

export default ledgerApi;