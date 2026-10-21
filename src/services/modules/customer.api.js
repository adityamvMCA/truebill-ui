import apiClient from "../apiClient";

const customerApi = {
  getAll: (params = {}) =>
    apiClient.get("/customers", {
      params,
    }),

  // Keep the existing method name for backward compatibility.
  // Pass customerCode, not MongoDB _id.
  getById: (customerCode) =>
    apiClient.get(`/customers/code/${encodeURIComponent(customerCode)}`),

  getByCode: (customerCode) =>
    apiClient.get(`/customers/code/${encodeURIComponent(customerCode)}`),

  create: (data) => apiClient.post("/customers", data),

  update: (customerCode, data) =>
    apiClient.put(`/customers/code/${encodeURIComponent(customerCode)}`, data),

  delete: (customerCode) =>
    apiClient.delete(`/customers/code/${encodeURIComponent(customerCode)}`),

  import: (formData) => apiClient.post("/customers/import", formData),

  bulkImport: (data) =>
    apiClient.post("/customers/bulk-import", data, { timeout: 120000 }),
};

export default customerApi;
