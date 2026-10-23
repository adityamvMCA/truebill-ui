import apiClient from "../apiClient";

const supplierQuotationApi = {
  getAll: (params = {}) => apiClient.get("/supplier-quotations", { params }),

  getByNumber: (quotationNumber) =>
    apiClient.get(
      `/supplier-quotations/${encodeURIComponent(quotationNumber)}`,
    ),

  create: (data) => apiClient.post("/supplier-quotations", data),

  update: (quotationNumber, data) =>
    apiClient.patch(
      `/supplier-quotations/${encodeURIComponent(quotationNumber)}`,
      data,
    ),

  cancel: (quotationNumber, data) =>
    apiClient.post(
      `/supplier-quotations/${encodeURIComponent(quotationNumber)}/cancel`,
      data,
    ),

  delete: (quotationNumber, data) =>
    apiClient.delete(
      `/supplier-quotations/${encodeURIComponent(quotationNumber)}`,
      { data },
    ),

  getRfqByNumber: (rfqNumber) =>
    apiClient.get(`/purchase-rfqs/${encodeURIComponent(rfqNumber)}`),

  getSuppliers: (params = {}) => apiClient.get("/suppliers", { params }),

  getProducts: (params = {}) => apiClient.get("/products", { params }),
};

export default supplierQuotationApi;