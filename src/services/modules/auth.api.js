import apiClient from "../apiClient";

const authApi = {
  login: (data) =>
    apiClient.post("/auth/login", data),

  me: () =>
    apiClient.get("/auth/me"),
};

export default authApi;