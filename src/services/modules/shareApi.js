import apiClient from "../apiClient";

const shareApi = {
  // Send invoice through Email or WhatsApp
  send: (payload) => apiClient.post("/share/send", payload),

  // Dashboard statistics
  stats: (period = "30d") =>
    apiClient.get("/share/stats", {
      params: { period },
    }),

  // Message logs with pagination and search
  logs: (params = {}) =>
    apiClient.get("/share/logs", {
      params,
    }),

  // Messaging settings
  getSettings: () => apiClient.get("/share/settings"),

  saveSettings: (data) => apiClient.put("/share/settings", data),

  // Templates
  listTemplates: (params = {}) =>
    apiClient.get("/share/templates", {
      params,
    }),

  createTemplate: (data) => apiClient.post("/share/templates", data),

  previewTemplate: (data) => apiClient.post("/share/templates/preview", data),

  syncTemplate: (id) => apiClient.post(`/share/templates/${id}/sync`),

  deleteTemplate: (id) => apiClient.delete(`/share/templates/${id}`),
};

export default shareApi;
