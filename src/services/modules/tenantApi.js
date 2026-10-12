import apiClient from "../apiClient";

const tenantApi = {
  getAll: (params = {}) =>
    apiClient.get("/tenants", {
      params,
    }),

  getById: (tenantId) => apiClient.get(`/tenants/${tenantId}`),

  create: (payload) => apiClient.post("/tenants", payload),

  update: (tenantId, payload) => apiClient.put(`/tenants/${tenantId}`, payload),

  getUsers: (tenantId) => apiClient.get(`/tenants/${tenantId}/users`),

  createUser: (tenantId, payload) =>
    apiClient.post(`/tenants/${tenantId}/users`, payload),

  updateUser: (userId, payload) =>
    apiClient.put(`/tenants/users/${userId}`, payload),

  updateUserStatus: (userId, payload) =>
    apiClient.patch(`/tenants/users/${userId}/status`, payload),
};

export default tenantApi;
