import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error(
        "Please enter email and password"
      );

      return;
    }

    setLoading(true);

    try {
      /*
       * Temporary login.
       *
       * Later replace this with:
       *
       * const response = await loginApi({
       *   email,
       *   password
       * });
       *
       * localStorage.setItem(
       *   "token",
       *   response.data.token
       * );
       */

      if (
        email ===
          "admin@trustiq.com" &&
        password === "Admin@123"
      ) {
        localStorage.setItem(
          "token",
          "test-token"
        );

        toast.success(
          "Login successful!"
        );

        navigate(
          "/dashboard",
          {
            replace: true,
          }
        );
      } else {
        toast.error(
          "Invalid email or password"
        );
      }
    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      toast.error(
        "Unable to login. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">
            T
          </div>

          <div>
            <span>
              TrustIQ
            </span>

            <small>
              ERP
            </small>
          </div>
        </div>

        <h1>
          Welcome back
        </h1>

        <p className="login-subtitle">
          Sign in to continue to
          TrustIQ ERP
        </p>

        <form
          onSubmit={
            handleSubmit
          }
        >
          <div className="form-group">
            <label>
              Email
            </label>

            <input
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label>
              Password
            </label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
              required
              autoComplete="current-password"
            />
          </div>

          <div className="login-options">
            <label>
              <input
                type="checkbox"
              />

              Remember me
            </label>

            <button
              type="button"
              className="forgot-button"
              onClick={() =>
                toast(
                  "Forgot password feature coming soon"
                )
              }
            >
              Forgot password?
            </button>
          </div>

          <button
            className="login-button"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Signing in..."
              : "Sign In"}
          </button>
        </form>

        <p className="login-footer">
          © 2026 TrustIQ ERP
        </p>
      </div>
    </div>
  );
}

export default Login;