import apiClient from "../apiClient";

const bankReconciliationApi = {
  accounts: () => apiClient.get("/bank-reconciliation/accounts"),

  get: (params = {}) => apiClient.get("/bank-reconciliation", { params }),

  history: (params = {}) =>
    apiClient.get("/bank-reconciliation/history", { params }),

  clear: (data) => apiClient.post("/bank-reconciliation/clear", data),

  finalize: (data) => apiClient.post("/bank-reconciliation/finalize", data),

  undo: (reconciliationId) =>
    apiClient.post(
      `/bank-reconciliation/${encodeURIComponent(reconciliationId)}/undo`,
    ),
};

export default bankReconciliationApi;
