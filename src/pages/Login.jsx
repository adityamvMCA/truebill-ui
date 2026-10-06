import { useState } from "react";

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

const handleSubmit = (e) => {
  e.preventDefault();

  if (
    email === "admin@trustiq.com" &&
    password === "Admin@123"
  ) {
    onLogin();
  } else {
    alert("Invalid email or password");
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
            />
          </div>

          <div className="form-group">
            <label>Password</label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="login-options">
            <label>
              <input type="checkbox" />
              Remember me
            </label>

            <button type="button" className="forgot-button">
              Forgot password?
            </button>
          </div>

          <button className="login-button" type="submit">
            Sign In
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