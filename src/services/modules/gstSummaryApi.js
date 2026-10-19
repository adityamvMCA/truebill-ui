import apiClient from "../apiClient";

const gstSummaryApi = {
  get: (params = {}) => apiClient.get("/gst-summary", { params }),
};

export default gstSummaryApi;