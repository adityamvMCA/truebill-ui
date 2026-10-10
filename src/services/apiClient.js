import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const user = JSON.parse(
      localStorage.getItem("user") || "null"
    );

    if (
      user &&
      ["developer", "support"].includes(user.platformRole)
    ) {
      const selectedTenantId =
        sessionStorage.getItem("selectedTenantId");

      if (selectedTenantId) {
        config.headers["x-tenant-id"] = selectedTenantId;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";

    if (
      status === 401 &&
      !url.includes("/auth/login")
    ) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("tenant");
      sessionStorage.removeItem("selectedTenantId");

      window.location.replace("/login");
    }

    return Promise.reject(error);
  }
);
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const code = error?.response?.data?.code;

    if (status === 402 && window.location.pathname !== "/billing/renew") {
      window.location.assign("/billing/renew");
    }
    if (status === 403 && code === "FEATURE_NOT_IN_PLAN") {
      window.location.assign("/upgrade");
    }
    return Promise.reject(error);
  }
);
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const selectedTenantId = localStorage.getItem("selectedTenantId");

  if (selectedTenantId) {
    config.headers["X-Tenant-Id"] = selectedTenantId;
  }

  return config;
});
export default apiClient;
