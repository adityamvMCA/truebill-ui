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
  // Body uses action: "SAVE_AND_POST" (drafts are not supported by the server)
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
    apiClient.get(`/purchase-bills/number/${encode(billNumber)}/payments`, {
      params,
    }),

  // POST /api/purchase-bills/scan  (multipart, field name "files")
  // Reads the uploaded bill and returns extracted details. Saves nothing.
  // `config` accepts { signal } so the user can cancel a slow scan.
  scan: (formData, config = {}) =>
    apiClient.post("/purchase-bills/scan", formData, {
      timeout: 180000, // free LLMs can take a while
      ...config,
      headers: {
        "Content-Type": "multipart/form-data",
        ...(config.headers || {}),
      },
    }),

  // POST /api/purchase-bills/scan/confirm
  // Creates missing supplier/products, then creates and posts the bill.
  confirmScan: (data) =>
    apiClient.post("/purchase-bills/scan/confirm", data, {
      timeout: 120000,
    }),
};

export default purchaseBillApi;