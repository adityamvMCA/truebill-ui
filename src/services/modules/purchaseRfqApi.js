import apiClient from "../apiClient";

const purchaseRfqApi = {
  getAll: (params = {}) => apiClient.get("/purchase-rfqs", { params }),

  getByNumber: (rfqNumber) =>
    apiClient.get(`/purchase-rfqs/${encodeURIComponent(rfqNumber)}`),

  create: (data) => apiClient.post("/purchase-rfqs", data),

  update: (rfqNumber, data) =>
    apiClient.patch(`/purchase-rfqs/${encodeURIComponent(rfqNumber)}`, data),

  issue: (rfqNumber, data) =>
    apiClient.post(
      `/purchase-rfqs/${encodeURIComponent(rfqNumber)}/issue`,
      data,
    ),

  close: (rfqNumber, data) =>
    apiClient.post(
      `/purchase-rfqs/${encodeURIComponent(rfqNumber)}/close`,
      data,
    ),

  cancel: (rfqNumber, data) =>
    apiClient.post(
      `/purchase-rfqs/${encodeURIComponent(rfqNumber)}/cancel`,
      data,
    ),

  delete: (rfqNumber, data) =>
    apiClient.delete(`/purchase-rfqs/${encodeURIComponent(rfqNumber)}`, {
      data,
    }),

  getRequisitions: (params = {}) =>
    apiClient.get("/purchase-requisitions", { params }),

  getRequisitionByNumber: (requisitionNumber) =>
    apiClient.get(
      `/purchase-requisitions/${encodeURIComponent(requisitionNumber)}`,
    ),

  getSuppliers: (params = {}) => apiClient.get("/suppliers", { params }),

  getProducts: (params = {}) => apiClient.get("/products", { params }),

  approve: (rfqNumber, data) =>
  apiClient.post(
    `/purchase-rfqs/${encodeURIComponent(rfqNumber)}/approve`,
    data,
  ),

reject: (rfqNumber, data) =>
  apiClient.post(
    `/purchase-rfqs/${encodeURIComponent(rfqNumber)}/reject`,
    data,
  ),
};

export default purchaseRfqApi;
