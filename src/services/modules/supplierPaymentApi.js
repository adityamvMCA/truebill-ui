import apiClient from "../apiClient";

const supplierPaymentApi = {
  getAll: (params = {}) =>
    apiClient.get("/supplier-payments", {
      params,
    }),

  getByNumber: (paymentNumber) =>
    apiClient.get(
      `/supplier-payments/number/${encodeURIComponent(
        paymentNumber,
      )}`,
    ),

  getPaymentLedgers: () =>
    apiClient.get("/supplier-payments/payment-ledgers"),

  getUnpaidBills: (params = {}) =>
    apiClient.get("/supplier-payments/unpaid-bills", {
      params,
    }),

  create: (data) =>
    apiClient.post("/supplier-payments", data),
};

export default supplierPaymentApi;