import React from "react";
import { AlertTriangle, Crown, ArrowRight, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "../../../context/SubscriptionContext";
import {
  isSubscriptionOrTrialExpired,
  triggerTrialExpiredModal,
} from "../../../utils/trialExpired";
import "./TrialExpiredBanner.css";

export default function TrialExpiredBanner() {
  const navigate = useNavigate();
  const { subscription } = useSubscription();

  const isExpired = isSubscriptionOrTrialExpired(subscription);

  if (!isExpired) return null;

  const handleOpenAd = () => {
    triggerTrialExpiredModal({
      force: true,
      reason: "manual_click",
    });
  };

  const handleViewPlans = () => {
    navigate("/billing/renew");
  };

  return (
    <div className="trial-expired-banner-strip">
      <div className="trial-expired-banner-left">
        <div className="trial-expired-banner-icon">
          <AlertTriangle size={18} />
        </div>
        <div className="trial-expired-banner-text">
          <span className="trial-expired-banner-badge">READ-ONLY MODE</span>
          <span className="trial-expired-banner-msg">
            <strong>Free trial has expired.</strong> Creating and editing invoices, stock, customers and bills is disabled until payment.
          </span>
        </div>
      </div>

      <div className="trial-expired-banner-actions">
        <button
          type="button"
          className="trial-expired-banner-btn-upgrade"
          onClick={handleOpenAd}
        >
          <Crown size={15} />
          <span>Upgrade Plan</span>
        </button>
        <button
          type="button"
          className="trial-expired-banner-btn-view"
          onClick={handleViewPlans}
        >
          <span>View Plans</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
