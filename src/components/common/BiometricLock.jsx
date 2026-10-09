import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { BiometricAuth } from "@aparajita/capacitor-biometric-auth";
import toast from "react-hot-toast";
import api from "../../services/api";

function BiometricLock({ children }) {
  const isNative = Capacitor.isNativePlatform();
  const isEnabled =
    isNative && localStorage.getItem("biometricLoginEnabled") === "true";

  const [locked, setLocked] = useState(isEnabled);
  const [authenticating, setAuthenticating] = useState(false);
  const [authError, setAuthError] = useState("");
  const authInProgress = useRef(false);
  const mounted = useRef(true);

  const unlockApp = useCallback(async () => {
    if (authInProgress.current) return;

    if (localStorage.getItem("biometricLoginEnabled") !== "true") {
      if (mounted.current) setLocked(false);
      return;
    }

    if (!localStorage.getItem("token")) {
      if (mounted.current) setLocked(false);
      return;
    }

    authInProgress.current = true;

    if (mounted.current) {
      setLocked(true);
      setAuthenticating(true);
      setAuthError("");
    }

    try {
      await BiometricAuth.authenticate({
        reason: "Authenticate to access TrueBill",
        androidTitle: "TrueBill Security",
        androidSubtitle: "Verify your identity to continue",
        allowDeviceCredential: true,
      });

      await api.auth.me();

      if (mounted.current) {
        setLocked(false);
        setAuthError("");
      }
    } catch (error) {
      console.error("Biometric unlock error:", error);

      if (mounted.current) {
        setLocked(true);
        setAuthError(
          error.response?.status
            ? "Your session may have expired. Please sign in again."
            : "Authentication failed. Please try again.",
        );
      }
    } finally {
      authInProgress.current = false;

      if (mounted.current) {
        setAuthenticating(false);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;

    if (!isNative) {
      setLocked(false);
      return () => {
        mounted.current = false;
      };
    }

    if (
      localStorage.getItem("biometricLoginEnabled") === "true" &&
      localStorage.getItem("token")
    ) {
      unlockApp();
    } else {
      setLocked(false);
    }

    let listener;

    const registerListener = async () => {
      listener = await App.addListener("appStateChange", ({ isActive }) => {
        if (!mounted.current) return;

        if (!isActive) {
          if (
            localStorage.getItem("biometricLoginEnabled") === "true" &&
            localStorage.getItem("token")
          ) {
            setLocked(true);
            setAuthError("");
          }
          return;
        }

        if (
          localStorage.getItem("biometricLoginEnabled") === "true" &&
          localStorage.getItem("token")
        ) {
          unlockApp();
        }
      });
    };

    registerListener();

    return () => {
      mounted.current = false;
      listener?.remove();
    };
  }, [isNative, unlockApp]);

  if (!isNative || !locked) {
    return children;
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "#f4f7fb",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "380px",
          padding: "32px 24px",
          borderRadius: "20px",
          background: "#ffffff",
          textAlign: "center",
          boxShadow: "0 12px 40px rgba(15, 23, 42, 0.12)",
        }}
      >
        <div
          style={{
            width: "68px",
            height: "68px",
            margin: "0 auto 20px",
            borderRadius: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#e8f0ff",
            color: "#144988",
            fontSize: "32px",
            fontWeight: 700,
          }}
        >
          T
        </div>

        <h2 style={{ margin: "0 0 10px", color: "#172033" }}>
          TrueBill is locked
        </h2>

        <p style={{ color: "#64748b", lineHeight: 1.6 }}>
          Verify your identity to securely access your account.
        </p>

        {authError && (
          <p role="alert" style={{ color: "#dc2626", fontSize: "14px" }}>
            {authError}
          </p>
        )}

        <button
          type="button"
          onClick={unlockApp}
          disabled={authenticating}
          style={{
            width: "100%",
            marginTop: "16px",
            padding: "14px",
            border: "none",
            borderRadius: "10px",
            background: "#144988",
            color: "#ffffff",
            fontWeight: 600,
            cursor: authenticating ? "wait" : "pointer",
            opacity: authenticating ? 0.7 : 1,
          }}
        >
          {authenticating ? "Verifying..." : "Unlock TrueBill"}
        </button>

        <button
          type="button"
          onClick={() => {
            localStorage.removeItem("biometricLoginEnabled");
            localStorage.removeItem("biometricSetupChoice");
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem("tenant");
            sessionStorage.removeItem("selectedTenantId");
            window.location.replace("/login");
          }}
          style={{
            marginTop: "16px",
            padding: "8px",
            border: "none",
            background: "transparent",
            color: "#64748b",
            cursor: "pointer",
          }}
        >
          Sign in with email and password
        </button>
      </div>
    </div>
  );
}

export default BiometricLock;
