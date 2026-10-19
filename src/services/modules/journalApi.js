import apiClient from "../apiClient";

const journalApi = {
  // existing: createManualJournal, getJournals, etc.

  /** Day Book — paginated, filtered across all vouchers */
  getDayBook: (params = {}) => {
    return apiClient.get("/accounting/journals/daybook", { params });
  },
  getTrialBalance: (params = {}) =>
    apiClient("/accounting/reports/trial-balance", params),
  getBalanceSheet: (params = {}) =>
    apiClient("/accounting/reports/balance-sheet", params),
  getCustomerOutstanding: (params = {}) =>
    apiClient.get("/accounting/outstanding/customers", { params }),
  getSupplierOutstanding: (params = {}) =>
    apiClient.get("/accounting/outstanding/suppliers", { params }),
  getAll: (params = {}) => apiClient.get("/accounting/ledgers", { params }),
  list: (params = {}) => apiClient.get("/accounting/ledgers", { params }),
};

export default journalApi;
