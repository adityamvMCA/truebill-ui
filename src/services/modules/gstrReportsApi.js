import apiClient from "../apiClient";

const gstrReportsApi = {
  gstr1: (params = {}) => apiClient.get("/gstr-reports/gstr1", { params }),
  gstr3b: (params = {}) => apiClient.get("/gstr-reports/gstr3b", { params }),
};

export default gstrReportsApi;