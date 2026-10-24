import apiClient from "../apiClient";

const stockValuationApi = {
  getAll: (params = {}) =>
    apiClient.get("/stock-valuation", {
      params,
    }),
};

export default stockValuationApi;