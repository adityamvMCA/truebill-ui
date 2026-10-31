import apiClient from "../apiClient";

const warehouseApi = {
  getAll: (params = {}) => apiClient.get("/warehouses", { params }),

  getByCode: (warehouseCode) =>
    apiClient.get(`/warehouses/${encodeURIComponent(warehouseCode)}`),

  getSettings: () => apiClient.get("/warehouses/settings"),

  setup: () => apiClient.post("/warehouses/setup", {}),

  create: (data) => apiClient.post("/warehouses", data),

  update: (warehouseCode, data) =>
    apiClient.patch(`/warehouses/${encodeURIComponent(warehouseCode)}`, data),
  getCounts: () => apiClient.get("/warehouses/counts"),

  bulkStatus: (ids, status) =>
    apiClient.patch("/warehouses/bulk-status", { ids, status }),
};

export default warehouseApi;
