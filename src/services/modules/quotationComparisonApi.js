import apiClient from "../apiClient";

const quotationComparisonApi = {
  preview: (data) => apiClient.post("/quotation-comparison/preview", data),

  getRfqs: (params = {}, config = {}) =>
    apiClient.get("/purchase-rfqs", {
      ...config,
      params,
    }),

  getQuotations: (params = {}, config = {}) =>
    apiClient.get("/supplier-quotations", {
      ...config,
      params,
    }),

  getSuppliers: (params = {}, config = {}) =>
    apiClient.get("/suppliers", {
      ...config,
      params,
    }),

  createPurchaseOrder: (data) => apiClient.post("/purchase-orders", data),
};

export default quotationComparisonApi;
