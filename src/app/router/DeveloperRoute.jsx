import React from "react";
import { Navigate } from "react-router-dom";

const DeveloperRoute = ({ children }) => {
  let user = {};
  try {
    user = JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    user = {};
  }

  if (user.platformRole !== "developer") {
    return <Navigate to="/" replace />;
  }
  return children;
};

export default DeveloperRoute;