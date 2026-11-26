import { Capacitor } from "@capacitor/core";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import { LocalNotifications } from "@capacitor/local-notifications";
import apiClient from "./apiClient";

let notificationListenerRegistered = false;
let notificationChannelCreated = false;

/**
 * Configure the Android notification channel for TrueBill.
 */
async function setupNotificationChannel() {
  if (Capacitor.getPlatform() !== "android" || notificationChannelCreated) {
    return;
  }

  try {
    await LocalNotifications.createChannel({
      id: "default",
      name: "TrueBill Notifications",
      description: "TrueBill alerts and business updates",
      importance: 5,
      visibility: 1,
      sound: "default",
      vibration: true,
      lights: true,
      lightColor: "#2563EB",
    });
    notificationChannelCreated = true;
  } catch (err) {
    console.warn("Failed to create Android notification channel:", err);
  }
}

/**
 * Register FCM push notifications and sync device token with backend.
 */
export async function registerFcmToken() {
  if (Capacitor.getPlatform() !== "android") {
    return null;
  }

  const authToken = localStorage.getItem("token");
  if (!authToken) {
    console.log("FCM skipped: User not logged in.");
    return null;
  }

  try {
    // 1. Request Firebase push notification permissions safely
    const permission = await FirebaseMessaging.requestPermissions().catch((err) => {
      console.warn("FirebaseMessaging requestPermissions warning:", err);
      return null;
    });

    // 2. Request LocalNotifications permission (required on Android 13+)
    await LocalNotifications.requestPermissions().catch((err) => {
      console.warn("LocalNotifications requestPermissions warning:", err);
    });

    // 3. Set up the Android notification channel
    await setupNotificationChannel();

    // 4. Register foreground and action listeners once
    if (!notificationListenerRegistered) {
      // Foreground notification received: display local notification banner with icon
      await FirebaseMessaging.addListener("notificationReceived", async (event) => {
        try {
          const notification = event.notification || {};
          const notifData = notification.data || event.data || {};
          const iconColor = notifData.color || "#2563EB";

          if (!notification.title && !notification.body && !notifData.title) {
            return;
          }

          const title = notification.title || notifData.title || "TrueBill";
          const body = notification.body || notifData.body || "";

          await LocalNotifications.schedule({
            notifications: [
              {
                id: Math.floor(Date.now() % 2147483647),
                title,
                body,
                smallIcon: "ic_stat_truebill",
                iconColor: iconColor,
                largeIcon: "ic_stat_truebill",
                channelId: "default",
                extra: notifData,
                schedule: {
                  at: new Date(Date.now() + 200),
                },
              },
            ],
          });
        } catch (error) {
          console.error("Failed to display foreground mobile notification:", error);
        }
      });

      // Tapped notification action: navigate to notification route if provided
      await FirebaseMessaging.addListener("notificationActionPerformed", (event) => {
        const notifData = event.notification?.data || {};
        if (notifData.route && typeof window !== "undefined") {
          window.location.hash = notifData.route;
        }
      });

      await LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
        const extra = action.notification?.extra || {};
        if (extra.route && typeof window !== "undefined") {
          window.location.hash = extra.route;
        }
      });

      // Token rotation listener: sync new token whenever Firebase refreshes it
      await FirebaseMessaging.addListener("tokenReceived", async (event) => {
        if (event?.token) {
          try {
            await apiClient.post("/device-tokens", {
              token: event.token,
              platform: "ANDROID",
            });
            console.log("Refreshed FCM token synced with backend.");
          } catch (err) {
            console.warn("Failed to sync refreshed FCM token:", err.message);
          }
        }
      });

      notificationListenerRegistered = true;
    }

    // 5. Retrieve device token from Firebase
    const { token } = await FirebaseMessaging.getToken();
    if (!token) {
      console.warn("Firebase did not return a device token.");
      return null;
    }

    // 6. Sync device token with backend using standard apiClient
    await apiClient.post("/device-tokens", {
      token,
      platform: "ANDROID",
    });

    console.log("FCM device token registered successfully with backend:", token.slice(0, 15) + "...");
    return token;
  } catch (error) {
    console.error("FCM registration error:", error.message || error);
    return null;
  }
}
