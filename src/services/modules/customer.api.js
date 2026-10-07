import apiClient from "../apiClient";

const customerApi = {
  getAll: (params = {}) =>
    apiClient.get("/customers", {
      params,
    }),

  getById: (id) =>
    apiClient.get(`/customers/${id}`),

  create: (data) =>
    apiClient.post("/customers", data),

  update: (id, data) =>
    apiClient.put(`/customers/${id}`, data),

  delete: (id) =>
    apiClient.delete(`/customers/${id}`),
};

export default customerApi;