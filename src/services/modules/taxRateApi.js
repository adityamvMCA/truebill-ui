import apiClient from "../apiClient";

const taxRateApi = {
  getAll: (params = {}) =>
    apiClient.get("/tax-rates", {
      params,
    }),

  getById: (taxRateId) =>
    apiClient.get(`/tax-rates/${encodeURIComponent(taxRateId)}`),

  create: (data) => apiClient.post("/tax-rates", data),

  update: (taxRateId, data) =>
    apiClient.patch(`/tax-rates/${encodeURIComponent(taxRateId)}`, data),

  import: (formData) => apiClient.post("/tax-rates/import", formData),
};

export default taxRateApi;
