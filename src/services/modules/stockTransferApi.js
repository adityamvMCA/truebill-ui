import apiClient from "../apiClient";
const stockTransferApi = {
  getAll: (params = {}) => apiClient.get("/stock-transfers", { params }),
  getByNumber: (number) => apiClient.get(`/stock-transfers/${encodeURIComponent(number)}`),
  create: (data) => apiClient.post("/stock-transfers", data),
  enableMultiWarehouse: () => apiClient.post("/stock-transfers/enable-multi-warehouse", { confirm: true }),
};
export default stockTransferApi;
