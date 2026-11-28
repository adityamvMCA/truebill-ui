// // import axios from "axios";

// // const apiClient = axios.create({
// //   baseURL: import.meta.env.VITE_API_BASE_URL,
// //   timeout: 30000,
// //   headers: {
// //     "Content-Type": "application/json",
// //   },
// // });

// // apiClient.interceptors.request.use(
// //   (config) => {
// //     const token = localStorage.getItem("token");

// //     if (token) {
// //       config.headers.Authorization = `Bearer ${token}`;
// //     }

// //     const user = JSON.parse(
// //       localStorage.getItem("user") || "null"
// //     );

// //     if (
// //       user &&
// //       ["developer", "support"].includes(user.platformRole)
// //     ) {
// //       const selectedTenantId =
// //         sessionStorage.getItem("selectedTenantId");

// //       if (selectedTenantId) {
// //         config.headers["x-tenant-id"] = selectedTenantId;
// //       }
// //     }

// //     return config;
// //   },
// //   (error) => Promise.reject(error)
// // );

// // apiClient.interceptors.response.use(
// //   (response) => response,
// //   (error) => {
// //     const status = error.response?.status;
// //     const url = error.config?.url || "";

// //     if (
// //       status === 401 &&
// //       !url.includes("/auth/login")
// //     ) {
// //       localStorage.removeItem("token");
// //       localStorage.removeItem("user");
// //       localStorage.removeItem("tenant");
// //       sessionStorage.removeItem("selectedTenantId");

// //       window.location.replace("/login");
// //     }

// //     return Promise.reject(error);
// //   }
// // );
// // apiClient.interceptors.response.use(
// //   (response) => response,
// //   (error) => {
// //     const status = error?.response?.status;
// //     const code = error?.response?.data?.code;

// //     if (status === 402 && window.location.pathname !== "/billing/renew") {
// //       window.location.assign("/billing/renew");
// //     }
// //     if (status === 403 && code === "FEATURE_NOT_IN_PLAN") {
// //       window.location.assign("/upgrade");
// //     }
// //     return Promise.reject(error);
// //   }
// // );
// // apiClient.interceptors.request.use((config) => {
// //   const token = localStorage.getItem("token");

// //   if (token) {
// //     config.headers.Authorization = `Bearer ${token}`;
// //   }

// //   const selectedTenantId = localStorage.getItem("selectedTenantId");

// //   if (selectedTenantId) {
// //     config.headers["X-Tenant-Id"] = selectedTenantId;
// //   }

// //   return config;
// // });
// // export default apiClient;

// import axios from "axios";

// const apiClient = axios.create({
//   baseURL: import.meta.env.VITE_API_BASE_URL,
//   timeout: 30000,
// });

// apiClient.interceptors.request.use(
//   (config) => {
//     const token = localStorage.getItem("token");

//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }

//     const user = JSON.parse(
//       localStorage.getItem("user") || "null"
//     );

//     if (
//       user &&
//       ["developer", "support"].includes(user.platformRole)
//     ) {
//       const selectedTenantId =
//         sessionStorage.getItem("selectedTenantId");

//       if (selectedTenantId) {
//         config.headers["x-tenant-id"] = selectedTenantId;
//       }
//     }

//     const selectedTenantId =
//       localStorage.getItem("selectedTenantId");

//     if (selectedTenantId) {
//       config.headers["X-Tenant-Id"] = selectedTenantId;
//     }

//     // JSON for normal requests; let browser set multipart boundary for FormData
//     if (config.data instanceof FormData) {
//       delete config.headers["Content-Type"];
//     } else {
//       config.headers["Content-Type"] = "application/json";
//     }

//     return config;
//   },
//   (error) => Promise.reject(error)
// );

// apiClient.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     const status = error.response?.status;
//     const url = error.config?.url || "";

//     if (status === 401 && !url.includes("/auth/login")) {
//       localStorage.removeItem("token");
//       localStorage.removeItem("user");
//       localStorage.removeItem("tenant");
//       sessionStorage.removeItem("selectedTenantId");

//       window.location.replace("/login");
//     }

//     return Promise.reject(error);
//   }
// );

// apiClient.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     const status = error?.response?.status;
//     const code = error?.response?.data?.code;

//     if (status === 402 && window.location.pathname !== "/billing/renew") {
//       window.location.assign("/billing/renew");
//     }

//     if (status === 403 && code === "FEATURE_NOT_IN_PLAN") {
//       window.location.assign("/upgrade");
//     }

//     return Promise.reject(error);
//   }
// );

// export default apiClient;

import axios from "axios";

import { setupRateLimitInterceptor } from "../utils/rateLimit";
import {
  isSubscriptionOrTrialExpired,
  triggerTrialExpiredModal,
} from "../utils/trialExpired";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
});

/* ------------------------------------------------------------------ */
/* Request: auth token, tenant headers, content type                    */
/* ------------------------------------------------------------------ */

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const user = JSON.parse(localStorage.getItem("user") || "null");

    if (user && ["developer", "support"].includes(user.platformRole)) {
      const selectedTenantId = sessionStorage.getItem("selectedTenantId");

      if (selectedTenantId) {
        config.headers["x-tenant-id"] = selectedTenantId;
      }
    } else if (user) {
      // For tenant users, only send X-Tenant-Id if deliberately switched to a sub-company
      const activeUserTenantId = user.tenantId || user.tenant?.id || user.tenant?._id;
      const selectedTenantId =
        sessionStorage.getItem("selectedTenantId") ||
        localStorage.getItem("selectedTenantId");

      if (
        selectedTenantId &&
        activeUserTenantId &&
        String(selectedTenantId) !== String(activeUserTenantId)
      ) {
        config.headers["X-Tenant-Id"] = selectedTenantId;
      }
    }

    // JSON for normal requests; let browser set multipart boundary for FormData
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    } else {
      config.headers["Content-Type"] = "application/json";
    }

    // Block record mutations if trial or subscription is expired
    const method = (config.method || "").toLowerCase();
    const isMutation = ["post", "put", "patch", "delete"].includes(method);
    const url = config.url || "";
    const isExempt =
      url.includes("/billing") ||
      url.includes("/auth") ||
      url.includes("/payment") ||
      url.includes("/razorpay");

    if (isMutation && !isExempt && isSubscriptionOrTrialExpired()) {
      triggerTrialExpiredModal({ force: true, reason: "create_blocked" });
      const error = new Error(
        "Free trial has expired. Record creation is disabled until plan upgrade."
      );
      error.response = {
        status: 402,
        data: {
          success: false,
          code: "SUBSCRIPTION_EXPIRED",
          message:
            "Free trial has expired. Record creation is disabled until plan upgrade.",
        },
      };
      return Promise.reject(error);
    }

    return config;
  },
  (error) => Promise.reject(error),
);

/* ------------------------------------------------------------------ */
/* Response: 429 rate limit -> global "Too many requests" modal         */
/* ------------------------------------------------------------------ */

setupRateLimitInterceptor(apiClient);

/* ------------------------------------------------------------------ */
/* Response: expired session                                            */
/* ------------------------------------------------------------------ */

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || "";

    if (status === 401 && !url.includes("/auth/login")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("tenant");
      sessionStorage.removeItem("selectedTenantId");

      window.location.replace("/login");
    }

    return Promise.reject(error);
  },
);

/* ------------------------------------------------------------------ */
/* Response: subscription / plan redirects                              */
/* ------------------------------------------------------------------ */

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const code = error?.response?.data?.code;

    // If subscription is expired, pop the Trial Expired Modal instead of hard redirecting
    if (
      status === 402 &&
      code === "SUBSCRIPTION_EXPIRED"
    ) {
      triggerTrialExpiredModal({ force: true, reason: "create_blocked" });
      return Promise.reject(error);
    }

    if (status === 403 && code === "FEATURE_NOT_IN_PLAN") {
      window.location.assign("/upgrade");
    }

    return Promise.reject(error);
  },
);

export default apiClient;