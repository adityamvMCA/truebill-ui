// import { useCallback, useEffect, useRef, useState } from "react";
// import { Capacitor } from "@capacitor/core";
// import { App } from "@capacitor/app";
// import { BiometricAuth } from "@aparajita/capacitor-biometric-auth";
// import toast from "react-hot-toast";
// import api from "../../services/api";

// function BiometricLock({ children }) {
//   const isNative = Capacitor.isNativePlatform();
//   const isEnabled =
//     isNative && localStorage.getItem("biometricLoginEnabled") === "true";

//   const [locked, setLocked] = useState(isEnabled);
//   const [authenticating, setAuthenticating] = useState(false);
//   const [authError, setAuthError] = useState("");
//   const authInProgress = useRef(false);
//   const mounted = useRef(true);

//   const unlockApp = useCallback(async () => {
//     if (authInProgress.current) return;

//     if (localStorage.getItem("biometricLoginEnabled") !== "true") {
//       if (mounted.current) setLocked(false);
//       return;
//     }

//     if (!localStorage.getItem("token")) {
//       if (mounted.current) setLocked(false);
//       return;
//     }

//     authInProgress.current = true;

//     if (mounted.current) {
//       setLocked(true);
//       setAuthenticating(true);
//       setAuthError("");
//     }

//     try {
//       await BiometricAuth.authenticate({
//         reason: "Authenticate to access TrueBill",
//         androidTitle: "TrueBill Security",
//         androidSubtitle: "Verify your identity to continue",
//         allowDeviceCredential: true,
//       });

//       await api.auth.me();

//       if (mounted.current) {
//         setLocked(false);
//         setAuthError("");
//       }
//     } catch (error) {
//       console.error("Biometric unlock error:", error);

//       if (mounted.current) {
//         setLocked(true);
//         setAuthError(
//           error.response?.status
//             ? "Your session may have expired. Please sign in again."
//             : "Authentication failed. Please try again.",
//         );
//       }
//     } finally {
//       authInProgress.current = false;

//       if (mounted.current) {
//         setAuthenticating(false);
//       }
//     }
//   }, []);

//   useEffect(() => {
//     mounted.current = true;

//     if (!isNative) {
//       setLocked(false);
//       return () => {
//         mounted.current = false;
//       };
//     }

//     if (
//       localStorage.getItem("biometricLoginEnabled") === "true" &&
//       localStorage.getItem("token")
//     ) {
//       unlockApp();
//     } else {
//       setLocked(false);
//     }

//     let listener;

//     const registerListener = async () => {
//       listener = await App.addListener("appStateChange", ({ isActive }) => {
//         if (!mounted.current) return;

//         if (!isActive) {
//           if (
//             localStorage.getItem("biometricLoginEnabled") === "true" &&
//             localStorage.getItem("token")
//           ) {
//             setLocked(true);
//             setAuthError("");
//           }
//           return;
//         }

//         if (
//           localStorage.getItem("biometricLoginEnabled") === "true" &&
//           localStorage.getItem("token")
//         ) {
//           unlockApp();
//         }
//       });
//     };

//     registerListener();

//     return () => {
//       mounted.current = false;
//       listener?.remove();
//     };
//   }, [isNative, unlockApp]);

//   if (!isNative || !locked) {
//     return children;
//   }

//   return (
//     <div
//       style={{
//         position: "fixed",
//         inset: 0,
//         zIndex: 99999,
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//         padding: "24px",
//         background: "#f4f7fb",
//       }}
//     >
//       <div
//         style={{
//           width: "100%",
//           maxWidth: "380px",
//           padding: "32px 24px",
//           borderRadius: "20px",
//           background: "#ffffff",
//           textAlign: "center",
//           boxShadow: "0 12px 40px rgba(15, 23, 42, 0.12)",
//         }}
//       >
//         <div
//           style={{
//             width: "68px",
//             height: "68px",
//             margin: "0 auto 20px",
//             borderRadius: "20px",
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center",
//             background: "#e8f0ff",
//             color: "#144988",
//             fontSize: "32px",
//             fontWeight: 700,
//           }}
//         >
//           T
//         </div>

//         <h2 style={{ margin: "0 0 10px", color: "#172033" }}>
//           TrueBill is locked
//         </h2>

//         <p style={{ color: "#64748b", lineHeight: 1.6 }}>
//           Verify your identity to securely access your account.
//         </p>

//         {authError && (
//           <p role="alert" style={{ color: "#dc2626", fontSize: "14px" }}>
//             {authError}
//           </p>
//         )}

//         <button
//           type="button"
//           onClick={unlockApp}
//           disabled={authenticating}
//           style={{
//             width: "100%",
//             marginTop: "16px",
//             padding: "14px",
//             border: "none",
//             borderRadius: "10px",
//             background: "#144988",
//             color: "#ffffff",
//             fontWeight: 600,
//             cursor: authenticating ? "wait" : "pointer",
//             opacity: authenticating ? 0.7 : 1,
//           }}
//         >
//           {authenticating ? "Verifying..." : "Unlock TrueBill"}
//         </button>

//         <button
//           type="button"
//           onClick={() => {
//             localStorage.removeItem("biometricLoginEnabled");
//             localStorage.removeItem("biometricSetupChoice");
//             localStorage.removeItem("token");
//             localStorage.removeItem("user");
//             localStorage.removeItem("tenant");
//             sessionStorage.removeItem("selectedTenantId");
//             window.location.replace("/login");
//           }}
//           style={{
//             marginTop: "16px",
//             padding: "8px",
//             border: "none",
//             background: "transparent",
//             color: "#64748b",
//             cursor: "pointer",
//           }}
//         >
//           Sign in with email and password
//         </button>
//       </div>
//     </div>
//   );
// }

// export default BiometricLock;

import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { BiometricAuth } from "@aparajita/capacitor-biometric-auth";
import api from "../../services/api";

/* 0 = lock as soon as the app goes to the background (same as before).
   Raise it (e.g. 30000) to allow a grace period before re-locking. */
const LOCK_AFTER_MS = 0;
const PICKER_WINDOW_MS = 10000; // background right after a file click = picker
const AUTH_GRACE_MS = 1500; // ignore app-state noise caused by the prompt itself

let suppressUntil = 0;

/** Call right before opening a camera / share sheet / other external screen. */
export const suppressNextLock = () => {
  suppressUntil = Date.now() + PICKER_WINDOW_MS;
};

const lockRequired = () =>
  localStorage.getItem("biometricLoginEnabled") === "true" &&
  !!localStorage.getItem("token");

function BiometricLock({ children }) {
  const isNative = Capacitor.isNativePlatform();

  const [locked, setLocked] = useState(() => isNative && lockRequired());
  const [authenticating, setAuthenticating] = useState(false);
  const [authError, setAuthError] = useState("");

  const authInProgress = useRef(false);
  const ignoreUntil = useRef(0);
  const hiddenAt = useRef(null);
  const skipResume = useRef(false);
  const mounted = useRef(true);

  const unlockApp = useCallback(async () => {
    if (authInProgress.current) return;

    if (!lockRequired()) {
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
      ignoreUntil.current = Date.now() + AUTH_GRACE_MS;

      if (mounted.current) setAuthenticating(false);
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

    if (lockRequired()) {
      unlockApp();
    } else {
      setLocked(false);
    }

    // Any file input click (CSV import, bulk upload, attachments, anywhere in
    // the app) marks the next background event as "file picker", not "leaving".
    const onFileClick = (event) => {
      const el = event.target;
      if (el && el.tagName === "INPUT" && el.type === "file") {
        suppressNextLock();
      }
    };
    document.addEventListener("click", onFileClick, true);

    let listener;
    let cancelled = false;

    App.addListener("appStateChange", ({ isActive }) => {
      if (!mounted.current) return;
      if (authInProgress.current || Date.now() < ignoreUntil.current) return;
      if (!lockRequired()) return;

      if (!isActive) {
        // going to background
        if (Date.now() < suppressUntil) {
          suppressUntil = 0;
          skipResume.current = true; // returning from picker: do not lock
          return;
        }

        hiddenAt.current = Date.now();

        if (LOCK_AFTER_MS === 0) {
          setLocked(true); // hides content in the recent-apps preview
          setAuthError("");
        }
        return;
      }

      // coming back to foreground
      if (skipResume.current) {
        skipResume.current = false;
        return;
      }

      if (hiddenAt.current === null) return;

      const away = Date.now() - hiddenAt.current;
      hiddenAt.current = null;

      if (away >= LOCK_AFTER_MS) unlockApp();
    }).then((handle) => {
      if (cancelled) handle.remove();
      else listener = handle;
    });

    return () => {
      cancelled = true;
      mounted.current = false;
      document.removeEventListener("click", onFileClick, true);
      listener?.remove();
    };
  }, [isNative, unlockApp]);

  return (
    <>
      {/* ALWAYS rendered and never unmounted, so forms and uploads keep state */}
      {children}

      {isNative && locked && (
        <div
          role="dialog"
          aria-modal="true"
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
      )}
    </>
  );
}

export default BiometricLock;