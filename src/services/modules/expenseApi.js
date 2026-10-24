import apiClient from "../apiClient";

const expenseApi = {
  // Ledgers for the create form: expenseLedgers, paymentLedgers, taxLedgers
  getOptions: () => apiClient.get("/expenses/options"),

  create: (data) => apiClient.post("/expenses", data),

  getAll: (params = {}) =>
    apiClient.get("/expenses", {
      params,
    }),

  getByNumber: (expenseNumber) =>
    apiClient.get(`/expenses/number/${encodeURIComponent(expenseNumber)}`),

  // Admin only
  approve: (expenseNumber) =>
    apiClient.post(
      `/expenses/number/${encodeURIComponent(expenseNumber)}/approve`,
    ),

  // Admin only
  reject: (expenseNumber, reason) =>
    apiClient.post(
      `/expenses/number/${encodeURIComponent(expenseNumber)}/reject`,
      { reason },
    ),

  cancel: (expenseNumber) =>
    apiClient.post(
      `/expenses/number/${encodeURIComponent(expenseNumber)}/cancel`,
    ),
};

export default expenseApi;