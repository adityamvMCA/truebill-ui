import apiClient from "../apiClient";

const tenantApi = {
  getAll: (params = {}) =>
    apiClient.get("/tenants", {
      params,
    }),

  getById: (tenantId) =>
    apiClient.get(`/tenants/${tenantId}`),

  create: (payload) =>
    apiClient.post("/tenants", payload),

  update: (tenantId, payload) =>
    apiClient.put(
      `/tenants/${tenantId}`,
      payload,
    ),

  getUsers: (tenantId) =>
    apiClient.get(
      `/tenants/${tenantId}/users`,
    ),

  createUser: (tenantId, payload) =>
    apiClient.post(
      `/tenants/${tenantId}/users`,
      payload,
    ),

  updateUser: (
    tenantId,
    userId,
    payload,
  ) =>
    apiClient.put(
      `/tenants/${tenantId}/users/${userId}`,
      payload,
    ),

  updateUserStatus: (
    tenantId,
    userId,
    payload,
  ) =>
    apiClient.patch(
      `/tenants/${tenantId}/users/${userId}/status`,
      payload,
    ),
};

export default tenantApi;