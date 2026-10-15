import apiClient from "../apiClient";

const encode = (billNumber) => encodeURIComponent(billNumber);

const purchaseBillApi = {
  // GET /api/purchase-bills
  // Params: page, limit, search, supplierId, status,
  // paymentStatus, fromDate, toDate
  getAll: (params = {}) =>
    apiClient.get("/purchase-bills", {
      params,
    }),

  // GET /api/purchase-bills/number/PB001
  getByNumber: (billNumber) =>
    apiClient.get(`/purchase-bills/number/${encode(billNumber)}`),

  // POST /api/purchase-bills
  // Body includes action: "SAVE_DRAFT" or "SAVE_AND_POST"
  create: (data) => apiClient.post("/purchase-bills", data),

  // PUT /api/purchase-bills/number/PB001
  // Replaces a full draft. Do not send "action".
  update: (billNumber, data) =>
    apiClient.put(`/purchase-bills/number/${encode(billNumber)}`, data),

  // POST /api/purchase-bills/number/PB001/post
  post: (billNumber) =>
    apiClient.post(`/purchase-bills/number/${encode(billNumber)}/post`, {}),
  delete: (billNumber) =>
    apiClient.delete(`/purchase-bills/number/${encode(billNumber)}`),

  getPayments: (billNumber, params = {}) =>
    apiClient.get(
      `/purchase-bills/number/${encodeURIComponent(billNumber)}/payments`,
      { params },
    ),
};

export default purchaseBillApi;
