import apiClient from "../apiClient";

const purchaseReturnApi = {
  getAll: (params = {}, config = {}) =>
    apiClient.get("/purchase-returns", {
      ...config,
      params,
    }),

  getByNumber: (returnNumber, config = {}) =>
    apiClient.get(
      `/purchase-returns/${encodeURIComponent(returnNumber)}`,
      config,
    ),

  create: (data) => apiClient.post("/purchase-returns", data),

  // Matches your existing Purchase Bill route.
  getBillByNumber: (billNumber, config = {}) =>
    apiClient.get(
      `/purchase-bills/number/${encodeURIComponent(billNumber)}`,
      config,
    ),
};

export default purchaseReturnApi;
