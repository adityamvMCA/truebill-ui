
import apiClient from "../apiClient";

const productApi = {
  getAll: (params = {}) =>
    apiClient.get("/products", {
      params,
    }),

  getByCode: (productCode) =>
    apiClient.get(`/products/code/${encodeURIComponent(productCode)}`),

  create: (data) => apiClient.post("/products", data),

  import: (payload) => apiClient.post("/products/import", payload),

  update: (productCode, data) =>
    apiClient.put(`/products/code/${encodeURIComponent(productCode)}`, data),

  delete: (productCode) =>
    apiClient.delete(`/products/code/${encodeURIComponent(productCode)}`),
};

export default productApi;