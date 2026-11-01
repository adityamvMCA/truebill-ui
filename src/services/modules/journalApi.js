

// export default journalApi;
import apiClient from "../apiClient";

// `config` lets callers pass { signal } so in-flight requests can be cancelled.
const journalApi = {
  /** Old day book (kept) */
  getDayBook: (params = {}, config = {}) =>
    apiClient.get("/accounting/journals/daybook", { params, ...config }),

  /** FAST: lean paginated list */
  getDayBookList: (params = {}, config = {}) =>
    apiClient.get("/accounting/journals/daybook/list", { params, ...config }),

  /** FAST: totals + type-wise counts in one aggregation */
  getDayBookSummary: (params = {}, config = {}) =>
    apiClient.get("/accounting/journals/daybook/summary", { params, ...config }),

  // FIX: these used apiClient(url, params) which silently ignored params
  getTrialBalance: (params = {}) =>
    apiClient.get("/accounting/reports/trial-balance", { params }),
  getBalanceSheet: (params = {}) =>
    apiClient.get("/accounting/reports/balance-sheet", { params }),

  getCustomerOutstanding: (params = {}) =>
    apiClient.get("/accounting/outstanding/customers", { params }),
  getSupplierOutstanding: (params = {}) =>
    apiClient.get("/accounting/outstanding/suppliers", { params }),
  getAll: (params = {}) => apiClient.get("/accounting/ledgers", { params }),
  list: (params = {}) => apiClient.get("/accounting/ledgers", { params }),
};

export default journalApi;