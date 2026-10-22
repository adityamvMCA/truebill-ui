import apiClient from "../apiClient";

const hsnSacCodeApi = {
  getAll: (params = {}) =>
    apiClient.get("/hsn-sac-codes", {
      params,
    }),

  getByCode: (code) =>
    apiClient.get(`/hsn-sac-codes/${encodeURIComponent(code)}`),

  create: (data) => apiClient.post("/hsn-sac-codes", data),

  update: (code, data) =>
    apiClient.patch(`/hsn-sac-codes/${encodeURIComponent(code)}`, data),

  import: (formData) => apiClient.post("/hsn-sac-codes/import", formData),
};

export default hsnSacCodeApi;
