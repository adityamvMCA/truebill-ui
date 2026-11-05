import { Camera } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";

export const requestCameraPermission = async () => {
  try {
    // Browser environment
    if (!Capacitor.isNativePlatform()) {
      return {
        granted: true,
        message: "Browser camera permission will be requested by the scanner.",
      };
    }

    // Check existing permission
    let permission = await Camera.checkPermissions();

    if (permission.camera === "granted") {
      return {
        granted: true,
        message: "Camera permission already granted.",
      };
    }

    // Request permission
    permission = await Camera.requestPermissions({
      permissions: ["camera"],
    });

    if (permission.camera === "granted") {
      return {
        granted: true,
        message: "Camera permission granted.",
      };
    }

    return {
      granted: false,
      message:
        permission.camera === "denied"
          ? "Camera permission denied. Please enable camera access in app settings."
          : "Camera permission is required to scan barcodes.",
    };
  } catch (error) {
    console.error("Camera permission error:", error);

    return {
      granted: false,
      message: error.message || "Unable to access camera permission.",
    };
  }
};