import apiClient from "../apiClient";

const tenantApi = {
  getAll: () =>
    apiClient.get("/tenants"),

  getById: (tenantId) =>
    apiClient.get(`/tenants/${tenantId}`),

  create: (data) =>
    apiClient.post("/tenants", data),

  createUser: (tenantId, data) =>
    apiClient.post(`/tenants/${tenantId}/users`, data),
};

export default tenantApi;