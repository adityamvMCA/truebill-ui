import apiClient from "../apiClient";

const barcodeApi = {
  lookup: (barcode) =>
    apiClient.get(`/barcodes/lookup/${encodeURIComponent(barcode)}`),

  catalog: (params = {}, config = {}) =>
    apiClient.get("/barcodes/catalog", { ...config, params }),

  register: (data) => apiClient.post("/barcodes", data),

  generateInternal: (productId, data = {}) =>
    apiClient.post(`/barcodes/internal/${encodeURIComponent(productId)}`, data),

  byProduct: (productId) =>
    apiClient.get(`/barcodes/product/${encodeURIComponent(productId)}`),

  deactivate: (id) =>
    apiClient.patch(`/barcodes/${encodeURIComponent(id)}/deactivate`),

  unknown: (params = {}, config = {}) =>
    apiClient.get("/barcodes/unknown", { ...config, params }),

  reportUnknown: (data) => apiClient.post("/barcodes/unknown", data),

  createSession: (data) => apiClient.post("/barcodes/sessions", data),

  refreshToken: (id) =>
    apiClient.post(`/barcodes/sessions/${encodeURIComponent(id)}/token`),

  sessionItems: (id) =>
    apiClient.get(`/barcodes/sessions/${encodeURIComponent(id)}/items`),

  closeSession: (id) =>
    apiClient.delete(`/barcodes/sessions/${encodeURIComponent(id)}`),

  syncScans: (id, data, config = {}) =>
    apiClient.post(
      `/barcodes/sessions/${encodeURIComponent(id)}/sync`,
      data,
      config,
    ),
};

export default barcodeApi;