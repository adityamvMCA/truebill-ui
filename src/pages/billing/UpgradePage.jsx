// pages/billing/UpgradePage.jsx
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSubscription } from "../../context/SubscriptionContext";


const UpgradePage = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { subscription } = useSubscription();

  return (
    <div style={{ padding: 32, maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
      <h2>Upgrade required</h2>
      <p>
        {state?.feature
          ? `"${state.feature}" is not included in your ${subscription?.plan || "current"} plan.`
          : "This feature is not included in your current plan."}
      </p>
      <button onClick={() => navigate("/billing/renew")}>View plans</button>
      <button onClick={() => navigate(-1)} style={{ marginLeft: 8 }}>Go back</button>
    </div>
  );
};

export default UpgradePage;