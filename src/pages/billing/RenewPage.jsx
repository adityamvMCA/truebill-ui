// pages/billing/RenewPage.jsx
import React from "react";
import { useSubscription } from "../../context/SubscriptionContext";


const RenewPage = () => {
  const { subscription } = useSubscription();

  return (
    <div style={{ padding: 32, maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
      <h2>{subscription?.valid ? "Manage subscription" : "Subscription expired"}</h2>
      <p>
        Plan: <strong>{subscription?.plan || "-"}</strong>
        {subscription?.subscriptionEnd &&
          ` | Ends: ${new Date(subscription.subscriptionEnd).toLocaleDateString("en-IN")}`}
      </p>
      <p>Plan selection and payment will appear here once billing is connected.</p>
    </div>
  );
};

export default RenewPage;