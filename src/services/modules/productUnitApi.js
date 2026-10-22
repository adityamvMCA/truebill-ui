import apiClient from "../apiClient";

const productUnitApi = {
  getAll: (params = {}) =>
    apiClient.get("/product-units", {
      params,
    }),

  getByCode: (unitCode) =>
    apiClient.get(`/product-units/${encodeURIComponent(unitCode)}`),

  create: (data) => apiClient.post("/product-units", data),

  update: (unitCode, data) =>
    apiClient.patch(`/product-units/${encodeURIComponent(unitCode)}`, data),

  import: (formData) => apiClient.post("/product-units/import", formData),
};

export default productUnitApi;
