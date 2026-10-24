import apiClient from "../apiClient";

const tdsApi = {
  getNatures: () => apiClient.get("/tds/natures"),
  createNature: (data) => apiClient.post("/tds/natures", data),
  preview: (data) => apiClient.post("/tds/preview", data),
  deduct: (data) => apiClient.post("/tds/deductions", data),
  payChallan: (data) => apiClient.post("/tds/challans", data),
  getRegister: (params = {}) => apiClient.get("/tds/register", { params }),
};

export default tdsApi;
