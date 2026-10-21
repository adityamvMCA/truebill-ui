import apiClient from "../apiClient";

const goodsReceiptApi = {
  getAll: (params = {}, config = {}) =>
    apiClient.get("/goods-receipts", {
      ...config,
      params,
    }),

  getByNumber: (receiptNumber, config = {}) =>
    apiClient.get(
      `/goods-receipts/${encodeURIComponent(receiptNumber)}`,
      config,
    ),

  create: (data) => apiClient.post("/goods-receipts", data),

  getOrderByNumber: (orderNumber, config = {}) =>
    apiClient.get(
      `/purchase-orders/${encodeURIComponent(orderNumber)}`,
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

export default goodsReceiptApi;
