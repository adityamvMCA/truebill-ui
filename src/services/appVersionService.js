import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

const API_URL = "https://truebillapi.trustiqtech.com";

export const checkAppVersion = async () => {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  try {
    const appInfo = await App.getInfo();

    const installedVersion = appInfo.version;

    const response = await fetch(`${API_URL}/api/app-version`);

    if (!response.ok) {
      throw new Error("Failed to fetch app version");
    }

    const result = await response.json();

    return {
      installedVersion,
      ...result.data,
    };
  } catch (error) {
    console.error("App version check failed:", error);

    return null;
  }
};
