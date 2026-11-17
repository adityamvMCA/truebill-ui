import apiClient from "../apiClient";

const profitLossApi = {
  getProfitLoss: (params, config = {}) =>
    apiClient.get("/profit-loss", { ...config, params }),
};

export default profitLossApi;
