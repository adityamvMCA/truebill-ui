import apiClient from "../apiClient";

const productCategoryApi = {
  getAll: (params = {}) =>
    apiClient.get("/product-categories", {
      params,
    }),

  getByCode: (categoryCode) =>
    apiClient.get(`/product-categories/${encodeURIComponent(categoryCode)}`),

  create: (data) => apiClient.post("/product-categories", data),

  update: (categoryCode, data) =>
    apiClient.patch(
      `/product-categories/${encodeURIComponent(categoryCode)}`,
      data,
    ),

  import: (formData) => apiClient.post("/product-categories/import", formData),
};

export default productCategoryApi;
