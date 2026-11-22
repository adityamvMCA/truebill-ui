import apiClient from "../apiClient";

const developerEmailApi = {
  getTemplates: () => apiClient.get("/developer/emails/templates"),

  preview: (type, data = {}) =>
    apiClient.post("/developer/emails/preview", { type, data }),

  send: (payload) => apiClient.post("/developer/emails/send", payload),

  runLifecycleCheck: () => apiClient.post("/developer/emails/run-lifecycle-check"),

  getLogs: (params = {}) =>
    apiClient.get("/developer/emails/logs", { params }),
};

export default developerEmailApi;
