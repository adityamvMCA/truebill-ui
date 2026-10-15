import apiClient from "../apiClient";

const outstandingApi = {
  getCustomers: (params = {}) =>
    apiClient.get("/outstanding/customers", {
      params,
    }),

  getSuppliers: (params = {}) =>
    apiClient.get("/outstanding/suppliers", {
      params,
    }),
};

export default outstandingApi;
