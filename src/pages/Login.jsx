import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../services/api";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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

      toast.success(result.message || "Login successful!");

      navigate("/dashboard", {
        replace: true,
      });
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

        <p className="login-footer">© 2026 TrustIQ ERP</p>
      </div>
    </div>
  );
}

export default Login;