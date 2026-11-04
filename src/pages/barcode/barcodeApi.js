// ADAPT: point `http` at your existing axios instance (the one used by api.product.getAll).
// Base URL is expected to already include "/api".
import api from "../../services/api";

const http = api.client || api.http || api.axios;
if (!http) {
  // eslint-disable-next-line no-console
  console.error("barcodeApi: set `http` to your axios instance");
}

export const barcodeApi = {
  lookup: (barcode) => http.get(`/barcodes/lookup/${encodeURIComponent(barcode)}`),
  catalog: (after, limit = 5000) => http.get("/barcodes/catalog", { params: { after, limit } }),
  register: (body) => http.post("/barcodes", body),
  generateInternal: (productId, body = {}) => http.post(`/barcodes/internal/${productId}`, body),
  byProduct: (productId) => http.get(`/barcodes/product/${productId}`),
  deactivate: (id) => http.patch(`/barcodes/${id}/deactivate`),
  unknown: (params) => http.get("/barcodes/unknown", { params }),
  reportUnknown: (barcode) => http.post("/barcodes/unknown", { barcode }),
  createSession: (body) => http.post("/barcodes/sessions", body),
  refreshToken: (id) => http.post(`/barcodes/sessions/${id}/token`),
  sessionItems: (id) => http.get(`/barcodes/sessions/${id}/items`),
  closeSession: (id) => http.delete(`/barcodes/sessions/${id}`),
  syncScans: (id, scans, deviceToken) =>
    http.post(`/barcodes/sessions/${id}/sync`, { scans }, { headers: { "x-scan-device-token": deviceToken } }),
};

export const searchProducts = (search) => api.product.getAll({ search, page: 1, limit: 10, status: "ACTIVE" });

export const apiError = (e) =>
  e?.response?.data?.errors?.join?.(", ") || e?.response?.data?.message || e?.message || "Something went wrong";
