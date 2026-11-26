import apiClient from "../apiClient";

const notificationApi = {
  getNotifications: (params = {}) =>
    apiClient.get("/notifications", { params }),

  getUnreadCount: () =>
    apiClient.get("/notifications/unread-count"),

  markAsRead: (id) =>
    apiClient.patch(`/notifications/${encodeURIComponent(id)}/read`),

  markAllAsRead: () =>
    apiClient.patch("/notifications/read-all"),

  triggerDailyStats: () =>
    apiClient.post("/notifications/trigger-daily-stats"),

  triggerLowStock: () =>
    apiClient.post("/notifications/trigger-low-stock"),

  testFcmPush: () =>
    apiClient.post("/notifications/test-fcm"),
};

export default notificationApi;
