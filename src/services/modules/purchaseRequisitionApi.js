import apiClient from "../apiClient";

const purchaseRequisitionApi = {
  getAll: (params = {}) => apiClient.get("/purchase-requisitions", { params }),

  getByNumber: (requisitionNumber) =>
    apiClient.get(
      `/purchase-requisitions/${encodeURIComponent(requisitionNumber)}`,
    ),

  create: (data) => apiClient.post("/purchase-requisitions", data),

  update: (requisitionNumber, data) =>
    apiClient.patch(
      `/purchase-requisitions/${encodeURIComponent(requisitionNumber)}`,
      data,
    ),

  approve: (requisitionNumber, data) =>
    apiClient.post(
      `/purchase-requisitions/${encodeURIComponent(requisitionNumber)}/approve`,
      data,
    ),

  reject: (requisitionNumber, data) =>
    apiClient.post(
      `/purchase-requisitions/${encodeURIComponent(requisitionNumber)}/reject`,
      data,
    ),

  cancel: (requisitionNumber, data) =>
    apiClient.post(
      `/purchase-requisitions/${encodeURIComponent(requisitionNumber)}/cancel`,
      data,
    ),

  delete: (requisitionNumber, data) =>
    apiClient.delete(
      `/purchase-requisitions/${encodeURIComponent(requisitionNumber)}`,
      { data },
    ),

  getProducts: (params = {}) => apiClient.get("/products", { params }),
};

export default purchaseRequisitionApi;
