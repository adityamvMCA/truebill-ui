import apiClient from "../apiClient";

const warehouseStockApi = {
  getAll: (params = {}) =>
    apiClient.get("/warehouse-stock", {
      params,
    }),

  getByProduct: (productCode, params = {}) =>
    apiClient.get(
      `/warehouse-stock/product/${encodeURIComponent(productCode)}`,
      {
        params,
      },
    ),
};

export default warehouseStockApi;
