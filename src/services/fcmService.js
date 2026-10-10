import { Capacitor } from "@capacitor/core";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import { LocalNotifications } from "@capacitor/local-notifications";

let notificationListenerRegistered = false;
let notificationChannelCreated = false;

async function setupNotificationChannel() {
  if (Capacitor.getPlatform() !== "android" || notificationChannelCreated) {
    return;
  }

  await LocalNotifications.createChannel({
    id: "default",
    name: "TrueBill Notifications",
    description: "TrueBill alerts and updates",
    importance: 5,
    visibility: 1,
    sound: "default",
  });

  notificationChannelCreated = true;
}

export async function registerFcmToken() {
  if (Capacitor.getPlatform() !== "android") {
    return null;
  }

  const authToken = localStorage.getItem("token");

  if (!authToken) {
    throw new Error("Please log in before registering FCM.");
  }

  const permission = await FirebaseMessaging.requestPermissions();

  if (permission.receive !== "granted") {
    throw new Error("Notification permission was not granted.");
  }

  const localPermission = await LocalNotifications.requestPermissions();

  if (localPermission.display !== "granted") {
    console.warn("Local notification permission was not granted.");
  }

  await setupNotificationChannel();

  if (!notificationListenerRegistered) {
    await FirebaseMessaging.addListener(
      "notificationReceived",
      async (event) => {
        try {
          const notification = event.notification;

          if (!notification?.title && !notification?.body) {
            return;
          }

          await LocalNotifications.schedule({
            notifications: [
              {
                id: Math.floor(Date.now() % 2147483647),
                title: notification.title || "TrueBill",
                body: notification.body || "",
                smallIcon: "ic_stat_truebill",
                channelId: "default",
                schedule: {
                  at: new Date(Date.now() + 500),
                },
              },
            ],
          });
        } catch (error) {
          console.error("Failed to display foreground notification:", error);
        }
      },
    );

    notificationListenerRegistered = true;
  }

  const { token } = await FirebaseMessaging.getToken();

  if (!token) {
    throw new Error("Firebase did not return a device token.");
  }

  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  const response = await fetch(`${apiBaseUrl}/device-tokens`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({
      token,
      platform: "ANDROID",
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Failed to register the FCM token.");
  }

  return token;
}
