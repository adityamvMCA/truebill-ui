import api from "../apiClient";

export default {
  shareWhatsApp: (docType, ref, body = {}) =>
    api.post(`/documents/${docType}/${encodeURIComponent(ref)}/whatsapp`, body),

  getPrintTemplates: () => api.get("/print-templates"),
  savePrintTemplate: (kind, templateId) =>
    api.put(`/print-templates/${kind}`, { templateId }),

  getMessagingSettings: () => api.get("/messaging-settings"),
  saveMessagingSettings: (settings) => api.put("/messaging-settings", settings),
};