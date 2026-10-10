import React from "react";
import { Navigate } from "react-router-dom";
import { useSubscription } from "../../context/SubscriptionContext";

const FeatureRoute = ({ feature, children }) => {
  const { subscription, hasFeature } = useSubscription();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  if (user.platformRole === "developer") return children;
  if (subscription && !subscription.valid) return <Navigate to="/billing/renew" replace />;
  if (!hasFeature(feature)) return <Navigate to="/upgrade" replace state={{ feature }} />;

  return children;
};

export default FeatureRoute;