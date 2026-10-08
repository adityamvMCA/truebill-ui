import React from "react";

const AppUpdateModal = ({ updateInfo }) => {
  if (!updateInfo) {
    return null;
  }

  const handleUpdate = () => {
    if (!updateInfo.downloadUrl) {
      return;
    }

    window.open(updateInfo.downloadUrl, "_blank");
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#fff",
          borderRadius: "16px",
          padding: "30px",
          textAlign: "center",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.25)",
        }}
      >
        <div
          style={{
            width: "60px",
            height: "60px",
            margin: "0 auto 18px",
            borderRadius: "50%",
            background: "#eaf3ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "28px",
          }}
        >
          ↑
        </div>

        <h3
          style={{
            marginBottom: "10px",
            fontSize: "22px",
            fontWeight: "700",
          }}
        >
          New Update Available
        </h3>

        <p
          style={{
            marginBottom: "8px",
            color: "#666",
            fontSize: "14px",
          }}
        >
          A new version of TrueBill is available.
        </p>

        <p
          style={{
            marginBottom: "20px",
            color: "#333",
            fontSize: "13px",
          }}
        >
          Current version: <strong>{updateInfo.installedVersion}</strong>
          <br />
          Latest version: <strong>{updateInfo.latestVersion}</strong>
        </p>

        <button
          type="button"
          onClick={handleUpdate}
          disabled={!updateInfo.downloadUrl}
          style={{
            width: "100%",
            border: "none",
            borderRadius: "8px",
            padding: "12px 18px",
            background: updateInfo.downloadUrl ? "#144988" : "#999",
            color: "#fff",
            fontSize: "15px",
            fontWeight: "600",
            cursor: updateInfo.downloadUrl ? "pointer" : "not-allowed",
          }}
        >
          {updateInfo.downloadUrl ? "Update Now" : "Update Link Not Available"}
        </button>

        {!updateInfo.isMandatory && (
          <p
            style={{
              marginTop: "14px",
              marginBottom: 0,
              fontSize: "12px",
              color: "#888",
            }}
          >
            You can continue using the current version.
          </p>
        )}
      </div>
    </div>
  );
};

export default AppUpdateModal;
