import { BiometricAuth } from "@aparajita/capacitor-biometric-auth";

export const checkBiometricAvailability = async () => {
  return await BiometricAuth.checkBiometry();
};

export const authenticateWithBiometric = async () => {
  await BiometricAuth.authenticate({
    reason: "Authenticate to access TrueBill",
    androidTitle: "TrueBill Authentication",
    androidSubtitle: "Use fingerprint, face, PIN, pattern or password",
    allowDeviceCredential: true,
  });

  return true;
};