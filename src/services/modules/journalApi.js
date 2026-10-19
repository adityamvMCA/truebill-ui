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
};

export default journalApi;
