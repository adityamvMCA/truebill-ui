import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSubscription } from "../../context/SubscriptionContext";

const UpgradePage = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { subscription } = useSubscription();

  const feature = state?.feature;
  const plan = subscription?.plan || "current";

  return (
    <div
      style={{
        padding: 32,
        maxWidth: 520,
        margin: "0 auto",
        textAlign: "center",
      }}
    >
      <h2>Upgrade required</h2>

      <p>
        {feature
          ? `"${feature}" is not included in your ${plan} plan.`
          : "This feature is not included in your current plan."}
      </p>

      <button type="button" onClick={() => navigate("/billing/renew")}>
        View plans
      </button>

      <button
        type="button"
        onClick={() => navigate(-1)}
        style={{ marginLeft: 8 }}
      >
        Go back
      </button>
    </div>
  );
};

export default UpgradePage;