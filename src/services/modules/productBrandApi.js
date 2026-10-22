import apiClient from "../apiClient";

const productBrandApi = {
  getAll: (params = {}) =>
    apiClient.get("/product-brands", {
      params,
    }),

  getById: (brandId) =>
    apiClient.get(
      `/product-brands/${encodeURIComponent(brandId)}`,
    ),

  create: (data) =>
    apiClient.post("/product-brands", data),

  update: (brandId, data) =>
    apiClient.patch(
      `/product-brands/${encodeURIComponent(brandId)}`,
      data,
    ),

  import: (formData) =>
    apiClient.post(
      "/product-brands/import",
      formData,
    ),
};

export default productBrandApi;