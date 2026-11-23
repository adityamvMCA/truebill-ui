import apiClient from "../apiClient";

const authApi = {
  login: (data) =>
    apiClient.post("/auth/login", data),

  sendOtp: (data) =>
    apiClient.post("/auth/otp/send", data),

  verifyOtp: (data) =>
    apiClient.post("/auth/otp/verify", data),

  me: () =>
    apiClient.get("/auth/me"),
};

export default authApi;