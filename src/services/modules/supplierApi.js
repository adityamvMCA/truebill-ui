// import apiClient from "../apiClient";

// const supplierApi = {
//   getAll: (params = {}) =>
//     apiClient.get("/suppliers", {
//       params,
//     }),

//   create: (data) => apiClient.post("/suppliers", data),

//   getByCode: (supplierCode) => apiClient.get(`/suppliers/code/${supplierCode}`),

//   update: (supplierCode, data) =>
//     apiClient.put(`/suppliers/code/${supplierCode}`, data),

//   delete: (supplierCode) => apiClient.delete(`/suppliers/code/${supplierCode}`),

//   import: (data) =>
//     apiClient.post("/suppliers/import", data, { timeout: 120000 }),
// };

// export default supplierApi;


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
};

export default supplierApi;