import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Crown, X, AlertTriangle, Percent, ArrowRight, ShieldCheck, Check } from "lucide-react";
import toast from "react-hot-toast";

import { useSubscription } from "../../../context/SubscriptionContext";
import billingApi from "../../../services/modules/billingApi";
import {
  TRIAL_EXPIRED_EVENT,
  isSubscriptionOrTrialExpired,
  isAdSnoozed,
  snoozeAdForTwoDays,
  clearAdSnooze,
} from "../../../utils/trialExpired";
import "./TrialExpiredModal.css";

// Plan options matching the user's reference image
const EXPIRY_PLANS = [
  {
    key: "basic",
    name: "Plus",
    crownColor: "#f59e0b", // Amber/Gold
    themeColor: "#f59e0b",
    strikethrough: "₹ 449",
    effectivePrice: "291",
    period: "/ month",
    yearlyTotal: "Pay ₹ 3,490 every year",
    startsAt: false,
    recommended: false,
    orderPlanKey: "basic",
  },
  {
    key: "standard",
    name: "Pro",
    crownColor: "#4f46e5", // Indigo/Royal Blue
    themeColor: "#6366f1",
    strikethrough: "₹ 599",
    effectivePrice: "333",
    period: "/ month",
    yearlyTotal: "Pay ₹ 3,990 every year",
    startsAt: false,
    recommended: true,
    orderPlanKey: "standard",
  },
  {
    key: "premium",
    name: "Pro Max",
    crownColor: "#10b981", // Emerald/Teal
    themeColor: "#10b981",
    strikethrough: "₹ 1,026",
    effectivePrice: "570",
    period: "/ month",
    yearlyTotal: "Pay ₹ 6,840 every year",
    startsAt: true,
    recommended: false,
    orderPlanKey: "premium",
  },
];

export default function TrialExpiredModal() {
  const navigate = useNavigate();
  const { subscription, refresh } = useSubscription();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedPlanKey, setSelectedPlanKey] = useState("standard"); // Pro recommended by default
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [blockReason, setBlockReason] = useState(null);

  /**
   * Check whether modal should show automatically on mount or subscription update
   */
  const evaluateAutoOpen = useCallback(() => {
    const expired = isSubscriptionOrTrialExpired(subscription);
    if (!expired) {
      setIsOpen(false);
      return;
    }

    // If already snoozed for 2 days, do not passively open
    if (isAdSnoozed()) {
      setIsOpen(false);
      return;
    }

    // Otherwise, show the modal automatically
    setIsOpen(true);
  }, [subscription]);

  useEffect(() => {
    evaluateAutoOpen();
  }, [evaluateAutoOpen]);

  /**
   * Listen for manual or event-driven triggers (e.g. record creation attempt)
   */
  useEffect(() => {
    const handleTrigger = (event) => {
      const detail = event?.detail || {};
      // If force is set (e.g. when user tries to create a record while expired),
      // we bypass the 2-day snooze and show the modal immediately!
      if (detail.force || isSubscriptionOrTrialExpired(subscription)) {
        setBlockReason(detail.reason || "create_blocked");
        setIsOpen(true);
      }
    };

    window.addEventListener(TRIAL_EXPIRED_EVENT, handleTrigger);
    return () => {
      window.removeEventListener(TRIAL_EXPIRED_EVENT, handleTrigger);
    };
  }, [subscription]);

  /**
   * Close modal and snooze for 2 days
   */
  const handleClose = () => {
    snoozeAdForTwoDays();
    setIsOpen(false);
    setBlockReason(null);
    toast("Ad snoozed for 2 days. Record creation remains disabled until plan upgrade.", {
      icon: "ℹ️",
      duration: 4000,
    });
  };

  /**
   * View all plans navigation
   */
  const handleViewPlans = () => {
    setIsOpen(false);
    navigate("/billing/renew");
  };

  /**
   * Handle Razorpay upgrade
   */
  const handleUpgrade = async (planKey = selectedPlanKey) => {
    setIsUpgrading(true);
    const toastId = toast.loading("Connecting to Razorpay Gateway...");

    try {
      // 1. Create order on backend
      const orderRes = await billingApi.createOrder({
        plan: planKey,
        billingCycle: "yearly",
      });

      if (!orderRes.data?.success) {
        throw new Error(orderRes.data?.message || "Order creation failed");
      }

      const orderData = orderRes.data;
      toast.dismiss(toastId);

      // Check SDK availability
      if (!window.Razorpay) {
        toast.error("Razorpay SDK not loaded. Redirecting to billing page...");
        navigate("/billing/renew");
        setIsOpen(false);
        return;
      }

      // 2. Open official Razorpay Checkout modal
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "TrueBill ERP",
        description: `Upgrade to ${planKey.toUpperCase()} Plan (Yearly)`,
        image: "https://truebill.trustiqtech.com/favicon.ico",
        order_id: orderData.orderId,
        handler: async function (response) {
          const verifyToast = toast.loading("Verifying payment with Razorpay...");
          try {
            const verifyRes = await billingApi.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan: planKey,
              billingCycle: "yearly",
            });

            toast.dismiss(verifyToast);

            if (verifyRes.data?.success) {
              clearAdSnooze();
              toast.success("🎉 Payment successful! Plan upgraded and record creation enabled.");
              setIsOpen(false);
              await refresh();
              window.location.reload();
            } else {
              toast.error(verifyRes.data?.message || "Payment verification failed");
            }
          } catch (vErr) {
            toast.dismiss(verifyToast);
            console.error("Payment verification error:", vErr);
            toast.error("Payment verification failed. Please contact support.");
          }
        },
        theme: {
          color: "#4f46e5",
        },
        modal: {
          ondismiss: function () {
            toast("Payment cancelled");
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response) {
        console.error("Razorpay payment failed:", response.error);
        toast.error(`Payment Failed: ${response.error.description || "Transaction declined"}`);
      });
      rzp.open();
    } catch (err) {
      toast.dismiss(toastId);
      console.error("Upgrade order error:", err);
      // Fallback cleanly to billing renew page
      navigate("/billing/renew");
      setIsOpen(false);
    } finally {
      setIsUpgrading(false);
    }
  };

  /**
   * Talk to Sales
   */
  const handleTalkToSales = () => {
    // Open WhatsApp sales or email
    const text = encodeURIComponent(
      "Hi TrueBill Sales Team, my trial has expired and I would like to inquire about multi-year plan discounts."
    );
    window.open(`https://wa.me/919999999999?text=${text}`, "_blank");
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="trial-expired-backdrop" onClick={handleClose}>
      <div
        className="trial-expired-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="trial-modal-title"
      >
        {/* Close Button */}
        <button
          type="button"
          className="trial-expired-close-btn"
          onClick={handleClose}
          aria-label="Close"
          title="Close (Snooze for 2 days)"
        >
          <X size={20} />
        </button>

        {/* Warning Icon Badge */}
        <div className="trial-expired-icon-wrapper">
          <div className="trial-expired-icon-circle">
            <AlertTriangle className="trial-expired-warning-icon" size={32} />
          </div>
        </div>

        {/* Header Titles */}
        <h2 id="trial-modal-title" className="trial-expired-title">
          Your Free Trial has expired
        </h2>
        <p className="trial-expired-subtitle">
          Upgrade plan to continue enjoying all the benefits
        </p>

        {/* Action Blocked Notice (shown if user tried to create record) */}
        {blockReason === "create_blocked" && (
          <div className="trial-expired-blocked-alert">
            <AlertTriangle size={16} />
            <span>
              <strong>Record creation disabled:</strong> Your free trial has ended. Please upgrade to create and edit invoices, items, customers, and bills.
            </span>
          </div>
        )}

        {/* 3 Plan Cards Container */}
        <div className="trial-expired-cards-grid">
          {EXPIRY_PLANS.map((plan) => {
            const isSelected = selectedPlanKey === plan.key;

            return (
              <div
                key={plan.key}
                className={`trial-expired-card ${isSelected ? "selected" : ""} ${
                  plan.recommended ? "recommended-card" : ""
                }`}
                onClick={() => setSelectedPlanKey(plan.key)}
              >
                {/* Recommended Top Badge */}
                {plan.recommended && (
                  <div className="trial-expired-badge-pill">
                    Recommended for you
                  </div>
                )}

                {/* Card Header: Crown + Name + Radio */}
                <div className="trial-expired-card-head">
                  <div className="trial-expired-plan-info">
                    <Crown size={20} style={{ color: plan.crownColor }} />
                    <span className="trial-expired-plan-name" style={{ color: plan.recommended ? "#1e1b4b" : "#1f2937" }}>
                      {plan.name}
                    </span>
                  </div>

                  {/* Custom Radio Button */}
                  <div className={`trial-expired-radio ${isSelected ? "checked" : ""}`}>
                    {isSelected && <div className="trial-expired-radio-inner" />}
                  </div>
                </div>

                {/* Price Section */}
                <div className="trial-expired-price-block">
                  {plan.startsAt && (
                    <div className="trial-expired-starts-at">Starts at</div>
                  )}

                  <div className="trial-expired-price-row">
                    <span className="trial-expired-strike-price">
                      {plan.strikethrough}
                    </span>
                    <span className="trial-expired-curr-price">
                      ₹ {plan.effectivePrice}
                    </span>
                    <span className="trial-expired-period">
                      {plan.period}
                    </span>
                  </div>

                  <div className="trial-expired-yearly-note">
                    {plan.yearlyTotal}
                  </div>
                </div>

                {/* Primary & Secondary Buttons inside card */}
                {isSelected ? (
                  <div className="trial-expired-card-actions">
                    <button
                      type="button"
                      className="trial-expired-btn-upgrade"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpgrade(plan.orderPlanKey);
                      }}
                      disabled={isUpgrading}
                    >
                      {isUpgrading ? "Processing..." : "Upgrade"}
                    </button>

                    <button
                      type="button"
                      className="trial-expired-btn-view-plans"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewPlans();
                      }}
                    >
                      View Plans
                    </button>
                  </div>
                ) : (
                  <div className="trial-expired-card-select-hint">
                    <span>Click to select {plan.name}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Offer & Sales Link */}
        <div className="trial-expired-footer">
          <div className="trial-expired-percent-badge">
            <Percent size={12} strokeWidth={3} />
          </div>
          <span className="trial-expired-discount-text">
            Get up to 65% off on multi-year plans.
          </span>
          <button
            type="button"
            className="trial-expired-sales-link"
            onClick={handleTalkToSales}
          >
            Talk To Sales
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
