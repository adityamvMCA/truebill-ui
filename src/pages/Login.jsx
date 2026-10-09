// import { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import toast from "react-hot-toast";
// import {
//   BiometricAuth,
//   BiometryType,
// } from "@aparajita/capacitor-biometric-auth";
// import api from "../services/api";

// function Login() {
//   const navigate = useNavigate();

//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [showPassword, setShowPassword] = useState(false);
//   const [loading, setLoading] = useState(false);

//   const setupBiometric = async () => {
//     try {
//       const result = await BiometricAuth.checkBiometry();

//       if (!result.deviceIsSecure) {
//         return;
//       }

//       if (!result.isAvailable && !result.deviceIsSecure) {
//         return;
//       }

//       let authenticationName = "Device lock";

//       if (result.biometryType === BiometryType.fingerprintAuthentication) {
//         authenticationName = "Fingerprint";
//       } else if (result.biometryType === BiometryType.faceAuthentication) {
//         authenticationName = "Face";
//       }

//       const shouldEnable = window.confirm(
//         `Enable ${authenticationName} login for TrueBill on this device?`,
//       );

//       if (!shouldEnable) {
//         return;
//       }

//       await BiometricAuth.authenticate({
//         reason: "Confirm to enable quick login for TrueBill",
//         androidTitle: "Enable TrueBill Login",
//         androidSubtitle: "Use fingerprint, face, PIN, pattern or password",
//         allowDeviceCredential: true,
//       });

//       localStorage.setItem("biometricLoginEnabled", "true");

//       toast.success("Biometric login enabled on this device");
//     } catch (error) {
//       console.error("Biometric setup error:", error);
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     if (!email.trim() || !password.trim()) {
//       toast.error("Please enter email and password");
//       return;
//     }

//     setLoading(true);

//     try {
//       const response = await api.auth.login({
//         email: email.trim(),
//         password,
//       });

//       const result = response.data;

//       if (!result?.success || !result?.token) {
//         toast.error(result?.message || "Login failed");
//         return;
//       }

//       localStorage.setItem("token", result.token);

//       localStorage.setItem("user", JSON.stringify(result.user));

//       if (localStorage.getItem("biometricLoginEnabled") !== "true") {
//         await setupBiometric();
//       }

//       if (result.tenant) {
//         localStorage.setItem("tenant", JSON.stringify(result.tenant));
//       } else {
//         localStorage.removeItem("tenant");
//       }

//       sessionStorage.removeItem("selectedTenantId");

//       toast.success(result.message || "Login successful!");

//       navigate("/dashboard", {
//         replace: true,
//       });
//     } catch (error) {
//       console.error("Login error:", error);

//       const status = error.response?.status;
//       const message = error.response?.data?.message;

//       if (status === 401) {
//         toast.error(message || "Invalid email or password");
//       } else if (status === 403) {
//         toast.error(message || "Your account is not allowed to login");
//       } else {
//         toast.error(message || "Unable to login. Please try again.");
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="login-page">
//       <div className="login-card">
//         <div className="login-logo">
//           <div className="login-logo-icon">T</div>

//           <div>
//             <span>TrustIQ</span>
//             <small>ERP</small>
//           </div>
//         </div>

//         <h1>Welcome back</h1>

//         <p className="login-subtitle">Sign in to continue to TrustIQ ERP</p>

//         <form onSubmit={handleSubmit}>
//           <div className="form-group">
//             <label>Email</label>

//             <input
//               type="email"
//               placeholder="admin@example.com"
//               value={email}
//               onChange={(e) => setEmail(e.target.value)}
//               required
//               autoComplete="email"
//               disabled={loading}
//             />
//           </div>

//           <div className="form-group">
//             <label>Password</label>

//             <div
//               style={{
//                 position: "relative",
//                 width: "100%",
//               }}
//             >
//               <input
//                 type={showPassword ? "text" : "password"}
//                 placeholder="Enter your password"
//                 value={password}
//                 onChange={(e) => setPassword(e.target.value)}
//                 required
//                 autoComplete="current-password"
//                 disabled={loading}
//                 style={{
//                   width: "100%",
//                   paddingRight: "42px",
//                 }}
//               />

//               <button
//                 type="button"
//                 onClick={() => setShowPassword((prev) => !prev)}
//                 disabled={loading}
//                 aria-label={showPassword ? "Hide password" : "Show password"}
//                 style={{
//                   position: "absolute",
//                   right: "10px",
//                   top: "50%",
//                   transform: "translateY(-50%)",
//                   border: "none",
//                   background: "transparent",
//                   cursor: loading ? "not-allowed" : "pointer",
//                   padding: "4px",
//                   display: "flex",
//                   alignItems: "center",
//                   justifyContent: "center",
//                 }}
//               >
//                 <svg
//                   width="20"
//                   height="20"
//                   viewBox="0 0 24 24"
//                   fill="none"
//                   stroke="currentColor"
//                   strokeWidth="1.8"
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                 >
//                   {showPassword ? (
//                     <>
//                       <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
//                       <circle cx="12" cy="12" r="3" />
//                     </>
//                   ) : (
//                     <>
//                       <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
//                       <circle cx="12" cy="12" r="3" />
//                       <path d="M3 3l18 18" />
//                     </>
//                   )}
//                 </svg>
//               </button>
//             </div>
//           </div>

//           <div className="login-options">
//             <label>
//               <input type="checkbox" disabled={loading} />
//               Remember me
//             </label>

//             <button
//               type="button"
//               className="forgot-button"
//               onClick={() => toast("Forgot password feature coming soon")}
//               disabled={loading}
//             >
//               Forgot password?
//             </button>
//           </div>

//           <button className="login-button" type="submit" disabled={loading}>
//             {loading ? "Signing in..." : "Sign In"}
//           </button>
//         </form>

//         <p className="login-footer">© 2026 TrustIQ ERP</p>
//       </div>
//     </div>
//   );
// }

// export default Login;

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Capacitor } from "@capacitor/core";
import {
  BiometricAuth,
  BiometryType,
} from "@aparajita/capacitor-biometric-auth";
import api from "../services/api";
import { registerFcmToken } from "../services/fcmService";
function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [pendingLogin, setPendingLogin] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(true);
  const [biometricName, setBiometricName] = useState("Biometric");

const finishLogin = () => {
  setShowBiometricModal(false);
  setPendingLogin(false);

  toast.success("Login successful!");

  registerFcmToken().catch((error) => {
    console.error("FCM registration failed:", error);
  });

  navigate("/dashboard", { replace: true });
};

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error("Please enter email and password");
      return;
    }

    setLoading(true);

    try {
      const response = await api.auth.login({
        email: email.trim(),
        password,
      });

      const result = response.data;

      if (!result?.success || !result?.token) {
        toast.error(result?.message || "Login failed");
        return;
      }

      localStorage.setItem("token", result.token);
      localStorage.setItem("user", JSON.stringify(result.user));

      if (result.tenant) {
        localStorage.setItem("tenant", JSON.stringify(result.tenant));
      } else {
        localStorage.removeItem("tenant");
      }

      sessionStorage.removeItem("selectedTenantId");

      if (
        Capacitor.isNativePlatform() &&
        !localStorage.getItem("biometricSetupChoice")
      ) {
        setPendingLogin(true);

        try {
          const availability = await BiometricAuth.checkBiometry();

          const name =
            availability.biometryType ===
            BiometryType.fingerprintAuthentication
              ? "Fingerprint"
              : availability.biometryType ===
                  BiometryType.faceAuthentication
                ? "Face recognition"
                : "Device authentication";

          setBiometricName(name);
          setBiometricAvailable(
            availability.deviceIsSecure &&
              (availability.isAvailable || availability.deviceIsSecure)
          );
        } catch {
          setBiometricAvailable(false);
        }

        setShowBiometricModal(true);
        return;
      }

      finishLogin();
    } catch (error) {
      console.error("Login error:", error);

      const status = error.response?.status;
      const message = error.response?.data?.message;

      if (status === 401) {
        toast.error(message || "Invalid email or password");
      } else if (status === 403) {
        toast.error(message || "Your account is not allowed to login");
      } else {
        toast.error(message || "Unable to login. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const enableBiometric = async () => {
    try {
      const availability = await BiometricAuth.checkBiometry();

      if (!availability.deviceIsSecure) {
        toast.error("Set a PIN, pattern or password on your device first.");
        return;
      }

      await BiometricAuth.authenticate({
        reason: "Enable secure login for TrueBill",
        androidTitle: "Secure TrueBill",
        androidSubtitle: "Confirm your device identity",
        allowDeviceCredential: true,
      });

      localStorage.setItem("biometricLoginEnabled", "true");
      localStorage.setItem("biometricSetupChoice", "enabled");

      toast.success("Secure login enabled!");
      finishLogin();
    } catch (error) {
      console.error("Biometric enrollment error:", error);
      toast.error("Verification cancelled or unsuccessful. Try again.");
    }
  };

  const skipBiometric = () => {
    localStorage.setItem("biometricSetupChoice", "skipped");
    localStorage.removeItem("biometricLoginEnabled");
    finishLogin();
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">T</div>
          <div>
            <span>TrustIQ</span>
            <small>ERP</small>
          </div>
        </div>

        <h1>Welcome back</h1>
        <p className="login-subtitle">
          Sign in to continue to TrustIQ ERP
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Password</label>

            <div style={{ position: "relative", width: "100%" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={loading}
                style={{ width: "100%", paddingRight: "42px" }}
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                disabled={loading}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  cursor: loading ? "not-allowed" : "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {showPassword ? (
                    <>
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  ) : (
                    <>
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                      <circle cx="12" cy="12" r="3" />
                      <path d="M3 3l18 18" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>

          <div className="login-options">
            <label>
              <input type="checkbox" disabled={loading} />
              Remember me
            </label>

            <button
              type="button"
              className="forgot-button"
              onClick={() => toast("Forgot password feature coming soon")}
              disabled={loading}
            >
              Forgot password?
            </button>
          </div>

          <button className="login-button" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="login-footer">© 2026 TrustIQ ERP</p>
      </div>

      {showBiometricModal && pendingLogin && (
        <div
          className="biometric-modal-backdrop"
          role="presentation"
        >
          <section
            className="biometric-setup-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="biometric-modal-title"
          >
            <button
              type="button"
              className="biometric-modal-close"
              onClick={skipBiometric}
              aria-label="Close biometric setup"
            >
              ×
            </button>

            <div className="biometric-modal-brand">
              <div className="biometric-modal-logo">T</div>
              <span>TrustIQ <small>ERP</small></span>
            </div>

            <div className="biometric-hero-icon">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2 4 5v6c0 5 3.4 8.6 8 11 4.6-2.4 8-6 8-11V5l-8-3Z" />
                <path d="M8 12h8" />
                <path d="M12 8v8" />
              </svg>
            </div>

            <span className="biometric-modal-eyebrow">
              EXTRA SECURITY
            </span>

            <h2 id="biometric-modal-title">
              Secure your account
            </h2>

            <p className="biometric-modal-description">
              Make signing in easier. Use your device's supported
              fingerprint, face recognition or screen lock to protect
              your TrueBill account.
            </p>

            <div className="biometric-feature-list">
              <div>
                <span className="biometric-feature-icon">✓</span>
                <span>Quick and secure access</span>
              </div>
              <div>
                <span className="biometric-feature-icon">✓</span>
                <span>Device PIN or pattern fallback</span>
              </div>
              <div>
                <span className="biometric-feature-icon">✓</span>
                <span>Your biometric data stays on your device</span>
              </div>
            </div>

            {!biometricAvailable && (
              <p className="biometric-unavailable">
                Your device may need a screen lock or enrolled biometrics
                before this feature can be enabled.
              </p>
            )}

            <button
              type="button"
              className="biometric-enable-button"
              onClick={enableBiometric}
            >
              Enable secure login
            </button>

            <button
              type="button"
              className="biometric-skip-button"
              onClick={skipBiometric}
            >
              Maybe later
            </button>

            <p className="biometric-modal-footnote">
              You can continue with your normal sign-in if you skip.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}

export default Login;