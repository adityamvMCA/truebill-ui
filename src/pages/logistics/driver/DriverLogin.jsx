import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Truck, Eye, EyeOff, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

import logisticsApi from "../../../services/modules/logisticsApi";
import "../../../styles/layout.css";
import "../../../styles/common.css";

export default function DriverLogin() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!phone.trim() || !password.trim()) {
      setErrorMsg("Please enter both phone number and password");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");
      const res = await logisticsApi.driverLogin({
        phone: phone.trim(),
        password: password.trim(),
      });

      if (res.data?.success) {
        const { token, driver } = res.data.data;
        localStorage.setItem("driver_token", token);
        localStorage.setItem("driver_user", JSON.stringify(driver));
        toast.success(`Welcome back, ${driver.name}!`);
        navigate("/driver", { replace: true });
      } else {
        setErrorMsg(res.data?.message || "Login failed");
      }
    } catch (err) {
      console.error("Driver login failed:", err);
      const msg =
        err.response?.data?.message ||
        "Invalid phone number or password. Please try again.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        {/* App Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">
            <Truck size={22} />
          </div>
          <span>
            Trust<small>IQ</small>
          </span>
        </div>

        <h1>Driver Cockpit</h1>
        <p className="login-subtitle">
          Sign in to access assigned delivery trips & GPS tracking
        </p>

        {errorMsg && (
          <div
            style={{
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              fontSize: "13px",
              padding: "10px 14px",
              borderRadius: "8px",
              marginBottom: "18px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Registered Phone Number</label>
            <input
              type="tel"
              placeholder="e.g. 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              autoFocus
              autoComplete="tel"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                  color: "var(--text-secondary)",
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            className="login-button"
            type="submit"
            disabled={loading}
            style={{ marginTop: "12px" }}
          >
            {loading ? "Signing in..." : "Sign In to Driver Cockpit"}
          </button>
        </form>

        <div className="login-footer">
          Assigned by your company fleet dispatcher &bull; TrustIQ Logistics
        </div>
      </div>
    </div>
  );
}
