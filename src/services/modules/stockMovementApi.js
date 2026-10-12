import apiClient from "../apiClient";

const stockMovementApi = {
  getAll: (params = {}) =>
    apiClient.get("/stock-movements", {
      params,
    }),

  createAdjustment: (productCode, data) =>
    apiClient.post(
      `/stock-movements/product/${encodeURIComponent(
        productCode
      )}/adjustment`,
      data
    ),

  backfillOpeningStock: (productCode) =>
    apiClient.post(
      `/stock-movements/product/${encodeURIComponent(
        productCode
      )}/opening-backfill`
    ),
};

export default stockMovementApi;