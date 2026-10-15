import apiClient from "../apiClient";

const encode = (bankCode) => encodeURIComponent(bankCode);

const bankApi = {
  getAll: (params = {}) =>
    apiClient.get("/banks", {
      params,
    }),

  getByCode: (bankCode) =>
    apiClient.get(`/banks/${encode(bankCode)}`),

  create: (data) =>
    apiClient.post("/banks", data),

  update: (bankCode, data) =>
    apiClient.put(`/banks/${encode(bankCode)}`, data),

  // Requires the backend CSV import endpoint.
  import: (formData) =>
    apiClient.post("/banks/import", formData),
};

export default bankApi;