import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Crown,
  Check,
  Zap,
  ShieldCheck,
  Clock,
  CreditCard,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Building2,
  GitBranch,
} from "lucide-react";

import { useSubscription } from "../../context/SubscriptionContext";
import billingApi from "../../services/modules/billingApi";
import "./RenewPage.css";

export default function RenewPage() {
  const navigate = useNavigate();
  const { subscription, refresh } = useSubscription();

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [currentSub, setCurrentSub] = useState(null);
  const [billingCycle, setBillingCycle] = useState("yearly"); // "yearly" | "monthly"
  const [payingPlan, setPayingPlan] = useState(null);
  const [hasKeys, setHasKeys] = useState(true);

  // Load plans & current subscription status directly from backend subscriptionPlans.js
  const loadPlans = async () => {
    setLoading(true);
    try {
      const res = await billingApi.getPlans();
      if (res.data?.success) {
        setPlans(res.data.plans || []);
        setCurrentSub(res.data.currentSubscription || null);
        setHasKeys(res.data.hasKeys ?? true);
      }
    } catch (err) {
      console.error("Failed to fetch billing plans:", err);
      toast.error("Unable to load subscription plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  // Launch REAL Razorpay Checkout Popup
  const handleUpgradePayment = async (planKey) => {
    setPayingPlan(planKey);
    const toastId = toast.loading("Opening Razorpay Gateway...");

    try {
      // 1. Create official Razorpay order on backend
      const orderRes = await billingApi.createOrder({
        plan: planKey,
        billingCycle,
      });

      if (!orderRes.data?.success) {
        throw new Error(orderRes.data?.message || "Order creation failed");
      }

      const orderData = orderRes.data;
      toast.dismiss(toastId);

      // 2. Ensure official Razorpay Checkout SDK is loaded
      if (!window.Razorpay) {
        throw new Error("Razorpay Checkout SDK could not be loaded. Please check your internet connection.");
      }

      // 3. Open real official Razorpay iframe modal
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || "INR",
        name: "TrueBill ERP",
        description: `${planKey.toUpperCase()} Plan Subscription (${billingCycle})`,
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
              billingCycle,
            });

            toast.dismiss(verifyToast);

            if (verifyRes.data?.success) {
              toast.success(`Payment Successful! Upgraded to ${planKey.toUpperCase()} Plan! 🎉`);
              await refresh();
              await loadPlans();
            } else {
              toast.error(verifyRes.data?.message || "Verification failed");
            }
          } catch (vErr) {
            toast.dismiss(verifyToast);
            toast.error(vErr.response?.data?.message || "Payment verification failed");
          } finally {
            setPayingPlan(null);
          }
        },
        prefill: {
          name: "Business Owner",
        },
        theme: {
          color: "#2563eb",
        },
        modal: {
          ondismiss: function () {
            setPayingPlan(null);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response) {
        toast.error(`Payment failed: ${response.error?.description || "Transaction cancelled"}`);
        setPayingPlan(null);
      });
      rzp.open();
    } catch (err) {
      toast.dismiss(toastId);
      const data = err.response?.data;
      if (data?.requiresKeys) {
        toast.error("Please add your RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET in true-backend/.env", {
          duration: 6000,
        });
      } else {
        toast.error(data?.message || err.message || "Failed to initiate payment");
      }
      setPayingPlan(null);
    }
  };

  // Handle Free Trial Activation
  const handleActivateTrial = async () => {
    const toastId = toast.loading("Activating 14-day free trial...");
    try {
      const res = await billingApi.activateTrial();
      toast.dismiss(toastId);
      if (res.data?.success) {
        toast.success(res.data.message || "14-Day Free Trial activated!");
        await refresh();
        await loadPlans();
      }
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(err.response?.data?.message || "Failed to activate trial");
    }
  };

  const paidPlans = plans.filter((p) => p.id !== "trial");
  const activePlanKey = currentSub?.plan || subscription?.plan || "trial";
  const isValid = currentSub?.valid ?? subscription?.valid;

  return (
    <div className="renew-container">
      {/* Header */}
      <div className="renew-header">
        <h1>Subscription & Plans</h1>
        <p>
          Scale your business with multi-company management, multi-branch tracking, e-invoicing, and GST filing.
        </p>
      </div>

      {/* Warning banner if Razorpay API keys are not in .env */}
      {!hasKeys && (
        <div
          style={{
            background: "#fffbeb",
            border: "1px solid #fde68a",
            borderRadius: 10,
            padding: "12px 18px",
            marginBottom: 20,
            fontSize: "0.85rem",
            color: "#92400e",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <span>
            ⚠️ <strong>Razorpay Keys Not Found:</strong> To process real payments, add{" "}
            <code>RAZORPAY_KEY_ID</code> and <code>RAZORPAY_KEY_SECRET</code> in{" "}
            <code>true-backend/.env</code>.
          </span>
        </div>
      )}

      {/* Current Subscription Bar */}
      <div className="current-sub-bar">
        <div className="current-sub-info">
          <div className="current-sub-icon">
            <Crown size={22} />
          </div>
          <div className="current-sub-details">
            <h4>
              Current Plan:{" "}
              <span style={{ textTransform: "uppercase", color: "#2563eb" }}>
                {activePlanKey}
              </span>
            </h4>
            <p>
              {currentSub?.endDate ? (
                <>
                  Valid till:{" "}
                  <strong>
                    {new Date(currentSub.endDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </strong>{" "}
                  ({currentSub.daysLeft} days remaining)
                </>
              ) : (
                "Free Trial / Starter Account"
              )}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className={`status-badge ${isValid ? (activePlanKey === "trial" ? "trial" : "active") : "expired"}`}>
            {isValid ? (activePlanKey === "trial" ? "Trial Active" : "Active Plan") : "Expired"}
          </span>

          <button
            type="button"
            className="trial-footer-btn"
            onClick={loadPlans}
            disabled={loading}
            title="Refresh subscription"
          >
            <RefreshCw size={14} className={loading ? "spin-icon" : ""} />
          </button>
        </div>
      </div>

      {/* Billing Cycle Switcher */}
      <div className="billing-cycle-toggle">
        <div className="cycle-pill-group">
          <button
            type="button"
            className={`cycle-pill-btn ${billingCycle === "yearly" ? "active" : ""}`}
            onClick={() => setBillingCycle("yearly")}
          >
            Yearly Billing
            <span className="save-discount-badge">Save ~20%</span>
          </button>

          <button
            type="button"
            className={`cycle-pill-btn ${billingCycle === "monthly" ? "active" : ""}`}
            onClick={() => setBillingCycle("monthly")}
          >
            Monthly Billing
          </button>
        </div>
      </div>

      {/* Plans Comparison Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>
          <RefreshCw size={24} className="spin-icon" style={{ marginBottom: 8 }} />
          <p>Loading available plans from server...</p>
        </div>
      ) : (
        <div className="plans-grid">
          {paidPlans.map((p) => {
            const isCurrent = activePlanKey === p.id && isValid;
            const price = p.price?.[billingCycle] ?? p.price?.yearly ?? 0;
            const isPopular = p.popular;

            return (
              <div key={p.id} className={`plan-card ${isPopular ? "popular" : ""}`}>
                {isPopular && (
                  <div className="popular-ribbon">
                    <Sparkles size={11} />
                    Most Popular
                  </div>
                )}

                <div className="plan-top">
                  <div className="plan-title-row">
                    <span className="plan-name">{p.name}</span>
                    <span className="plan-badge">{p.badge}</span>
                  </div>
                  <p className="plan-desc">{p.description}</p>
                </div>

                <div className="plan-price-wrap">
                  <span className="plan-price">₹{price.toLocaleString("en-IN")}</span>
                  <span className="plan-duration">
                    / {billingCycle === "monthly" ? "month" : "year"}
                  </span>
                </div>

                <ul className="plan-features-list">
                  {p.highlights?.map((feat, idx) => (
                    <li key={idx} className="plan-feature-item">
                      <Check size={16} className="feature-check" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  className={`plan-cta-btn ${
                    isCurrent ? "current" : isPopular ? "primary" : "secondary"
                  }`}
                  disabled={isCurrent || payingPlan === p.id}
                  onClick={() => handleUpgradePayment(p.id)}
                >
                  {payingPlan === p.id ? (
                    <>
                      <RefreshCw size={16} className="spin-icon" />
                      Opening Razorpay...
                    </>
                  ) : isCurrent ? (
                    "Current Active Plan"
                  ) : (
                    <>
                      <CreditCard size={16} />
                      Pay with Razorpay
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 14-Day Free Trial Footer */}
      <div className="trial-footer-banner">
        <div className="trial-footer-content">
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: "#fef3c7",
              color: "#d97706",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Clock size={20} />
          </div>
          <div>
            <h4 style={{ margin: "0 0 2px", fontSize: "0.95rem", color: "#0f172a", fontWeight: 700 }}>
              Need to evaluate TrueBill first?
            </h4>
            <p style={{ margin: 0, fontSize: "0.8125rem", color: "#64748b" }}>
              Test all sales, billing, inventory, and ledger features with our 14-day free trial.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="trial-footer-btn"
          onClick={handleActivateTrial}
        >
          {activePlanKey === "trial" ? "Extend 14-Day Trial" : "Start 14-Day Free Trial"}
        </button>
      </div>

      {/* Payment Security Badges */}
      <div className="gateway-badges">
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <ShieldCheck size={14} color="#16a34a" />
          Secured by Razorpay Official Checkout (UPI, GPay, PhonePe, Cards & NetBanking)
        </span>
      </div>
    </div>
  );
}
