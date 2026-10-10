import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, ArrowLeft, SearchX } from "lucide-react";

const NotFound = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#f8fafc",
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: 460,
          background: "#fff",
          borderRadius: 16,
          padding: "40px 32px",
          boxShadow: "0 8px 30px rgba(15, 23, 42, 0.08)",
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "#eef2ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <SearchX size={34} color="#4f46e5" />
        </div>

        <h1 style={{ fontSize: 56, margin: 0, color: "#1e293b" }}>404</h1>
        <h2 style={{ margin: "8px 0 12px", color: "#334155" }}>
          Page not found
        </h2>

        <p style={{ color: "#64748b", margin: "0 0 8px" }}>
          The page you are looking for doesn't exist or has been moved.
        </p>
        <p
          style={{
            color: "#94a3b8",
            fontSize: 13,
            margin: "0 0 24px",
            wordBreak: "break-all",
          }}
        >
          Requested path: {location.pathname}
        </p>

        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => navigate(-1)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: "#334155",
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={16} />
            Go back
          </button>

          <button
            onClick={() => navigate("/")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              borderRadius: 10,
              border: "none",
              background: "#4f46e5",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            <Home size={16} />
            Go to dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;