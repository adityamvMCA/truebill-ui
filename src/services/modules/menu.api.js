import apiClient from "../apiClient";

const menuApi = {
  getMenu: (appCode = "truebill") =>
    apiClient.get("/menus", { params: { appCode } }),

  getAll: (appCode = "truebill") =>
    apiClient.get("/menus/all", { params: { appCode } }),

  getByDocumentNumber: (documentNumber) =>
    apiClient.get(`/menus/${documentNumber}`),

  create: (data) => apiClient.post("/menus/create", data),

  update: (documentNumber, data) =>
    apiClient.put(`/menus/update/${documentNumber}`, data),

  addChild: (documentNumber, child) =>
    apiClient.post(`/menus/${documentNumber}/children`, child),

  delete: (documentNumber) =>
    apiClient.delete(`/menus/delete/${documentNumber}`),

  bulkCreate: (menus) =>
    apiClient.post("/menus/bulk-upload", { menus }),
};

export default menuApi;