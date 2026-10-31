import apiClient from "../apiClient";

const productUnitApi = {
  getAll: (params = {}) =>
    apiClient.get("/product-units", { params }),

  getByCode: (unitCode) =>
    apiClient.get(
      `/product-units/${encodeURIComponent(unitCode)}`
    ),

  create: (data) =>
    apiClient.post("/product-units", data),

  update: (unitCode, data) =>
    apiClient.patch(
      `/product-units/${encodeURIComponent(unitCode)}`,
      data
    ),

  bulkAction: (payload) =>
    apiClient.post("/product-units/bulk-status", payload),

  import: (payload) =>
    apiClient.post("/product-units/import", payload),
};

export default productUnitApi;