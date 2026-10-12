import apiClient from "../apiClient";

const supplierApi = {
  getAll: (params = {}) =>
    apiClient.get("/suppliers", {
      params,
    }),

  create: (data) => apiClient.post("/suppliers", data),

  getByCode: (supplierCode) => apiClient.get(`/suppliers/code/${supplierCode}`),

  update: (supplierCode, data) =>
    apiClient.put(`/suppliers/code/${supplierCode}`, data),

  delete: (supplierCode) => apiClient.delete(`/suppliers/code/${supplierCode}`),
};

export default supplierApi;
