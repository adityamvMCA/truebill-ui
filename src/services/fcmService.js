
import { Capacitor } from "@capacitor/core";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";

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
