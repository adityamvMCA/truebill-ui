import apiClient from "../apiClient";

const warehouseApi = {
  getAll: (params = {}) =>
    apiClient.get("/warehouses", { params }),

  getByCode: (warehouseCode) =>
    apiClient.get(
      `/warehouses/${encodeURIComponent(warehouseCode)}`,
    ),

  getSettings: () =>
    apiClient.get("/warehouses/settings"),

  setup: () =>
    apiClient.post("/warehouses/setup", {}),

  create: (data) =>
    apiClient.post("/warehouses", data),

  update: (warehouseCode, data) =>
    apiClient.patch(
      `/warehouses/${encodeURIComponent(warehouseCode)}`,
      data,
    ),
};

export default warehouseApi;