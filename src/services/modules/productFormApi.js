import apiClient from "../apiClient";

const productFormApi = {
  getCategories: (params = {}) =>
    apiClient.get("/product-categories", {
      params,
    }),

  getBrands: (params = {}) =>
    apiClient.get("/product-brands", {
      params,
    }),

  getUnits: (params = {}) =>
    apiClient.get("/product-units", {
      params,
    }),

  getHsnSacCodes: (params = {}) =>
    apiClient.get("/hsn-sac-codes", {
      params,
    }),

  getTaxRates: (params = {}) =>
    apiClient.get("/tax-rates", {
      params,
    }),

  getWarehouses: (params = {}) =>
    apiClient.get("/warehouses", {
      params,
    }),

  getInventorySettings: () => apiClient.get("/warehouses/settings"),
};

export default productFormApi;
