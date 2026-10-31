
import apiClient from "../apiClient";

const supplierApi = {
  getAll: (params = {}) =>
    apiClient.get("/suppliers", {
      params,
    }),

  // Counts for the quick-filter chips (All / Active / Inactive / ...)
  getStats: () => apiClient.get("/suppliers/stats"),

  create: (data) => apiClient.post("/suppliers", data),

  getByCode: (supplierCode) =>
    apiClient.get(`/suppliers/code/${encodeURIComponent(supplierCode)}`),

  update: (supplierCode, data) =>
    apiClient.put(`/suppliers/code/${encodeURIComponent(supplierCode)}`, data),

  delete: (supplierCode) =>
    apiClient.delete(`/suppliers/code/${encodeURIComponent(supplierCode)}`),

  import: (data) =>
    apiClient.post("/suppliers/import", data, { timeout: 120000 }),
  bulkStatus: (ids, status) =>
  apiClient.patch("/suppliers/bulk-status", { ids, status }),
};

export default supplierApi;