import apiClient from "../apiClient";

const productBrandApi = {
  getAll: (params = {}) =>
    apiClient.get("/product-brands", {
      params,
    }),

  getById: (brandId) =>
    apiClient.get(`/product-brands/${encodeURIComponent(brandId)}`),

  create: (data) =>
    apiClient.post("/product-brands", data),

  update: (brandId, data) =>
    apiClient.patch(
      `/product-brands/${encodeURIComponent(brandId)}`,
      data,
    ),

  bulkAction: (payload) =>
    apiClient.post("/product-brands/bulk-status", payload),

  import: (payload) =>
    apiClient.post("/product-brands/import", payload),
};

export default productBrandApi;