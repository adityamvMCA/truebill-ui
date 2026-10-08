import { App } from "@capacitor/app";

const API_URL = "https://truebillapi.trustiqtech.com";

export const checkAppVersion = async () => {
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

checkAppVersion().then((data) => {
  console.log("App Version Info:", data);
});