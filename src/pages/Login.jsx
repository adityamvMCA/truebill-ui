import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Capacitor } from "@capacitor/core";
import {
  BiometricAuth,
  BiometryType,
} from "@aparajita/capacitor-biometric-auth";

import api from "../services/api";
import logisticsApi from "../services/modules/logisticsApi";
import { registerFcmToken } from "../services/fcmService";
import { getDefaultRoute } from "../config/routes";

function Login() {
  const navigate = useNavigate();

  // Mode: "password" or "otp"
  const [loginMode, setLoginMode] = useState("password");

  // Password Login State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // WhatsApp OTP Login State
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpStep, setOtpStep] = useState("phone"); // "phone" | "otp"
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [maskedPhone, setMaskedPhone] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Biometric Modal State
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [pendingLogin, setPendingLogin] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(true);
  const [biometricName, setBiometricName] = useState("Biometric");

  // Timer for OTP resend cooldown
  useEffect(() => {
    let timer = null;
    if (resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendCountdown]);

  const finishLogin = () => {
    setShowBiometricModal(false);
    setPendingLogin(false);

    toast.success("Login successful!");

    registerFcmToken().catch((error) => {
      console.error("FCM registration failed:", error);
    });

    let user = {};

    try {
      user = JSON.parse(localStorage.getItem("user") || "{}");
    } catch (error) {
      console.error("Invalid stored user:", error);
    }

    const destination = getDefaultRoute(user);

    navigate(destination, { replace: true });
  };

  const handleLoginSuccess = async (result) => {
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

    if (result.subscription) {
      localStorage.setItem("subscription", JSON.stringify(result.subscription));
    }

    sessionStorage.removeItem("selectedTenantId");
    sessionStorage.removeItem("selectedClientCode");
    sessionStorage.removeItem("selectedTenant");

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
            (availability.isAvailable || availability.deviceIsSecure),
        );
      } catch (error) {
        console.error("Biometric availability error:", error);

        setBiometricAvailable(false);
      }

      setShowBiometricModal(true);
      return;
    }

    finishLogin();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const inputVal = email.trim();
    if (!inputVal || !password.trim()) {
      toast.error("Please enter email/phone and password");
      return;
    }

    setLoading(true);

    try {
      const response = await api.auth.login({
        email: inputVal,
        password,
      });

      // If this account is a driver, set driver session
      if (
        response.data?.user?.role?.toLowerCase() === "driver" ||
        response.data?.user?.isDriver
      ) {
        localStorage.setItem("driver_token", response.data.token);
        localStorage.setItem(
          "driver_user",
          JSON.stringify(response.data.user),
        );
      }

      await handleLoginSuccess(response.data);
    } catch (error) {
      // If ERP login fails, seamlessly attempt driver portal login if input resembles a phone number or username
      const cleanPhone = inputVal.replace(/\D/g, "");
      if (cleanPhone.length >= 10 || !inputVal.includes("@")) {
        try {
          const driverRes = await logisticsApi.driverLogin({
            phone: cleanPhone || inputVal,
            password: password.trim(),
          });

          if (driverRes.data?.success) {
            const { token, driver } = driverRes.data.data;
            localStorage.setItem("driver_token", token);
            localStorage.setItem("driver_user", JSON.stringify(driver));
            toast.success(`Welcome back, Driver ${driver.name}!`);
            navigate("/driver", { replace: true });
            return;
          }
        } catch (driverErr) {
          // Fall through to display original error
        }
      }

      console.error("Login error:", error);

      const status = error.response?.status;
      const message = error.response?.data?.message;

      if (status === 401) {
        toast.error(message || "Invalid email/phone or password");
      } else if (status === 403) {
        toast.error(message || "Your account is not allowed to login");
      } else {
        toast.error(message || "Unable to login. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (event) => {
    if (event) event.preventDefault();

    const cleanNumber = phone.replace(/\D/g, "");
    if (!cleanNumber || cleanNumber.length < 10) {
      toast.error("Please enter a valid 10-digit registered mobile number");
      return;
    }

    setSendingOtp(true);

    try {
      const response = await api.auth.sendOtp({
        phone: cleanNumber,
      });

      const data = response.data;

      if (data?.success) {
        setMaskedPhone(data.maskedPhone || `+91 ${cleanNumber}`);
        if (data.userId) setSelectedUserId(data.userId);
        setOtpStep("otp");
        setResendCountdown(data.cooldownSeconds || 30);
        setOtp("");
        toast.success("OTP sent to your WhatsApp!");
      } else {
        toast.error(data?.message || "Failed to send OTP. Please try again.");
      }
    } catch (error) {
      console.error("Send OTP error:", error);
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to send OTP to WhatsApp.";
      toast.error(message);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (event) => {
    event.preventDefault();

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length < 4) {
      toast.error("Please enter the verification code");
      return;
    }

    setVerifyingOtp(true);

    try {
      const cleanNumber = phone.replace(/\D/g, "");
      const response = await api.auth.verifyOtp({
        phone: cleanNumber,
        otp: cleanOtp,
        userId: selectedUserId || undefined,
      });

      await handleLoginSuccess(response.data);
    } catch (error) {
      console.error("Verify OTP error:", error);
      const message =
        error.response?.data?.message ||
        error.message ||
        "OTP verification failed. Please try again.";
      toast.error(message);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const enableBiometric = async () => {
    try {
      const availability = await BiometricAuth.checkBiometry();

      if (!availability.deviceIsSecure) {
        toast.error(
          "Set a PIN, pattern or password on your device first.",
        );
        return;
      }

      await BiometricAuth.authenticate({
        reason: "Enable secure login for TrustIQ ERP",
        androidTitle: "Secure TrustIQ ERP",
        androidSubtitle: "Confirm your device identity",
        allowDeviceCredential: true,
      });

      localStorage.setItem("biometricLoginEnabled", "true");
      localStorage.setItem("biometricSetupChoice", "enabled");

      toast.success("Secure login enabled!");

      finishLogin();
    } catch (error) {
      console.error("Biometric enrollment error:", error);

      toast.error(
        "Verification cancelled or unsuccessful. Try again.",
      );
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

        {/* Method Switcher Tabs */}
        <div className="login-method-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={loginMode === "password"}
            className={`login-tab-btn ${loginMode === "password" ? "active" : ""}`}
            onClick={() => setLoginMode("password")}
            disabled={loading || sendingOtp || verifyingOtp}
          >
            Password
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={loginMode === "otp"}
            className={`login-tab-btn ${loginMode === "otp" ? "active" : ""}`}
            onClick={() => setLoginMode("otp")}
            disabled={loading || sendingOtp || verifyingOtp}
          >
            WhatsApp OTP
          </button>
        </div>

        {/* Password Login Form */}
        {loginMode === "password" && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>

              <input
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label>Password</label>

              <div
                style={{
                  position: "relative",
                  width: "100%",
                }}
              >
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={loading}
                  style={{
                    width: "100%",
                    paddingRight: "42px",
                  }}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((previous) => !previous)}
                  disabled={loading}
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
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
                <input
                  type="checkbox"
                  disabled={loading}
                />

                Remember me
              </label>

              <button
                type="button"
                className="forgot-button"
                onClick={() =>
                  toast("Forgot password feature coming soon")
                }
                disabled={loading}
              >
                Forgot password?
              </button>
            </div>

            <button
              className="login-button"
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        )}

        {/* WhatsApp OTP Login */}
        {loginMode === "otp" && (
          <div>
            {/* Step 1: Mobile Number Input */}
            {otpStep === "phone" && (
              <form onSubmit={handleSendOtp}>
                <div className="form-group">
                  <label>Registered Mobile Number</label>
                  <div className="login-phone-row">
                    <span className="login-phone-prefix">+91</span>
                    <input
                      type="tel"
                      placeholder="Enter 10-digit mobile number"
                      value={phone}
                      onChange={(event) =>
                        setPhone(
                          event.target.value.replace(/\D/g, "").slice(0, 10),
                        )
                      }
                      required
                      autoFocus
                      autoComplete="tel"
                      disabled={sendingOtp}
                    />
                  </div>
                  <small
                    style={{
                      display: "block",
                      marginTop: "7px",
                      color: "var(--text-secondary)",
                      fontSize: "12px",
                      lineHeight: "1.4",
                    }}
                  >
                    We'll send a 6-digit verification code directly to your WhatsApp.
                  </small>
                </div>

                <button
                  className="login-button"
                  type="submit"
                  disabled={sendingOtp || phone.replace(/\D/g, "").length < 10}
                  style={{ marginTop: "14px" }}
                >
                  {sendingOtp ? "Sending code to WhatsApp..." : "Get OTP on WhatsApp"}
                </button>
              </form>
            )}

            {/* Step 2: Enter OTP Code */}
            {otpStep === "otp" && (
              <form onSubmit={handleVerifyOtp}>
                <div className="login-otp-info">
                  <span>
                    OTP sent to <strong>{maskedPhone || `+91 ${phone}`}</strong> on WhatsApp
                  </span>
                  <button
                    type="button"
                    className="change-btn"
                    onClick={() => {
                      setOtpStep("phone");
                      setOtp("");
                    }}
                  >
                    Change
                  </button>
                </div>

                <div className="form-group">
                  <label>Enter 6-Digit OTP</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength="6"
                    placeholder="• • • • • •"
                    value={otp}
                    onChange={(event) =>
                      setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    className="login-otp-input"
                    required
                    autoFocus
                    autoComplete="one-time-code"
                    disabled={verifyingOtp}
                  />
                </div>

                <div className="login-resend-row">
                  <span>Didn't receive code?</span>
                  <button
                    type="button"
                    className="login-resend-btn"
                    onClick={() => handleSendOtp()}
                    disabled={resendCountdown > 0 || sendingOtp || verifyingOtp}
                  >
                    {resendCountdown > 0
                      ? `Resend in ${resendCountdown}s`
                      : "Resend on WhatsApp"}
                  </button>
                </div>

                <button
                  className="login-button"
                  type="submit"
                  disabled={verifyingOtp || otp.length < 4}
                >
                  {verifyingOtp ? "Verifying OTP..." : "Verify & Sign In"}
                </button>

                <div style={{ textAlign: "center", marginTop: "14px" }}>
                  <button
                    type="button"
                    className="forgot-button"
                    onClick={() => {
                      setOtpStep("phone");
                      setOtp("");
                    }}
                  >
                    ← Back to mobile number
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Quick Driver Login option */}
        <div style={{ marginTop: "18px", textAlign: "center", borderTop: "1px dashed var(--border-color, #e2e8f0)", paddingTop: "14px" }}>
          <button
            type="button"
            onClick={() => navigate("/driver/login")}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--primary-color, #2563EB)",
              fontWeight: 600,
              fontSize: "13px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            🚚 Are you a Driver? Driver Portal Login →
          </button>
        </div>

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

              <span>
                TrustIQ <small>ERP</small>
              </span>
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
              your TrustIQ ERP account.
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

                <span>
                  Your biometric data stays on your device
                </span>
              </div>
            </div>

            {!biometricAvailable && (
              <p className="biometric-unavailable">
                Your device may need a screen lock or enrolled
                biometrics before this feature can be enabled.
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
