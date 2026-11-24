import apiClient from "../apiClient";

const billingApi = {
  getPlans: () => apiClient.get("/billing/plans"),
  createOrder: (payload) => apiClient.post("/billing/create-order", payload),
  verifyPayment: (payload) => apiClient.post("/billing/verify-payment", payload),
  activateTrial: () => apiClient.post("/billing/activate-trial"),
};

export default billingApi;
