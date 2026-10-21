import apiClient from "../apiClient";

const purchaseOrderApi = {
  getAll: (params = {}, config = {}) =>
    apiClient.get("/purchase-orders", {
      ...config,
      params,
    }),

  getByNumber: (orderNumber, config = {}) =>
    apiClient.get(
      `/purchase-orders/${encodeURIComponent(orderNumber)}`,
      config,
    ),

  create: (data) => apiClient.post("/purchase-orders", data),

  update: (orderNumber, data) =>
    apiClient.patch(
      `/purchase-orders/${encodeURIComponent(orderNumber)}`,
      data,
    ),

  cancel: (orderNumber, data) =>
    apiClient.post(
      `/purchase-orders/${encodeURIComponent(orderNumber)}/cancel`,
      data,
    ),

  getQuotationByNumber: (quotationNumber, config = {}) =>
    apiClient.get(
      `/supplier-quotations/${encodeURIComponent(quotationNumber)}`,
      config,
    ),

  getSuppliers: (params = {}, config = {}) =>
    apiClient.get("/suppliers", {
      ...config,
      params,
    }),

  getProducts: (params = {}, config = {}) =>
    apiClient.get("/products", {
      ...config,
      params,
    }),
};

export default purchaseOrderApi;
