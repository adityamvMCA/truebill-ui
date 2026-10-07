import apiClient from "../apiClient";

const ledgerApi = {
  getAll: (params = {}) =>
    apiClient.get("/ledgers", {
      params,
    }),

  getById: (id) => apiClient.get(`/ledgers/${id}`),

  create: (data) => apiClient.post("/ledgers", data),

  update: (id, data) => apiClient.put(`/ledgers/${id}`, data),

  delete: (id) => apiClient.delete(`/ledgers/${id}`),
};

export default ledgerApi;
