// import apiClient from "../apiClient";

// const ledgerApi = {
//   getAll: (params = {}) =>
//     apiClient.get("/ledgers", {
//       params,
//     }),

//   getById: (id) => apiClient.get(`/ledgers/${id}`),

//   create: (data) => apiClient.post("/ledgers", data),

//   update: (id, data) => apiClient.put(`/ledgers/${id}`, data),

//   delete: (id) => apiClient.delete(`/ledgers/${id}`),
// };

// export default ledgerApi;


import apiClient from "../apiClient";

const ledgerApi = {
  getAll: (params = {}) =>
    apiClient.get("/accounting/ledgers", { params }),

  getById: (id) =>
    apiClient.get(`/accounting/ledgers/${encodeURIComponent(id)}`),

  getTransactions: (ledgerCode, params = {}) =>
    apiClient.get(
      `/accounting/ledgers/${encodeURIComponent(ledgerCode)}/transactions`,
      { params },
    ),

  create: (data) =>
    apiClient.post("/accounting/ledgers", data),

  update: (id, data) =>
    apiClient.put(`/accounting/ledgers/${encodeURIComponent(id)}`, data),

  delete: (id) =>
    apiClient.delete(`/accounting/ledgers/${encodeURIComponent(id)}`),
};

export default ledgerApi;

