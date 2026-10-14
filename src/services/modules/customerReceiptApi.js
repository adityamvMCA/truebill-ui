import api from "../apiClient";

const customerReceiptApi = {
  create: (payload) => api.post("/customer-receipts", payload),

  getAll: (params = {}) =>
    api.get("/customer-receipts", { params }),

  getByNumber: (receiptNumber) =>
    api.get(`/customer-receipts/number/${receiptNumber}`),

  getUnpaidInvoices: (params = {}) =>
    api.get("/customer-receipts/unpaid-invoices", { params }),

  getReceiptLedgers: () =>
    api.get("/customer-receipts/receipt-ledgers"),
};

export default customerReceiptApi;