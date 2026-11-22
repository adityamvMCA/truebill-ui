import apiClient from "../apiClient";

const transporterApi = {
  getAll: (params = {}) =>
    apiClient.get("/transporters", {
      params,
    }),

  getById: (id) => apiClient.get(`/transporters/${id}`),

  create: (data) => apiClient.post("/transporters", data),

  update: (id, data) => apiClient.put(`/transporters/${id}`, data),

  delete: (id) => apiClient.delete(`/transporters/${id}`),
};

export default transporterApi;
