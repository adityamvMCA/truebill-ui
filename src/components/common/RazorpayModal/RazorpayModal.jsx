import React, { useState } from "react";
import {
  X,
  ShieldCheck,
  CreditCard,
  QrCode,
  Building2,
  Lock,
  CheckCircle2,
  RefreshCw,
  Smartphone,
} from "lucide-react";
import toast from "react-hot-toast";
import billingApi from "../../../services/modules/billingApi";
import "./RazorpayModal.css";

export default function RazorpayModal({ isOpen, order, onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState("upi"); // "upi" | "card" | "netbanking"
  const [processing, setProcessing] = useState(false);
  const [stepText, setStepText] = useState("");

  // Card form
  const [cardData, setCardData] = useState({
    number: "",
    expiry: "",
    cvv: "",
    name: "Business Owner",
  });

  // UPI form
  const [upiId, setUpiId] = useState("");

  if (!isOpen || !order) return null;

  const handleFillTestCard = () => {
    setCardData({
      number: "4111 1111 1111 1111",
      expiry: "12/28",
      cvv: "123",
      name: "Test Merchant",
    });
    toast.success("Test card details filled!");
  };

  const handlePayment = async () => {
    setProcessing(true);
    setStepText("Connecting to Razorpay gateway...");

    try {
      await new Promise((r) => setTimeout(r, 800));
      setStepText("Authorizing transaction with bank...");
      await new Promise((r) => setTimeout(r, 800));

      const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const verifyRes = await billingApi.verifyPayment({
        razorpay_order_id: order.orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: "mock_rzp_verified_signature",
        plan: order.plan,
        billingCycle: order.billingCycle || "yearly",
      });

      if (verifyRes.data?.success) {
        setStepText("Payment Verified Successfully!");
        toast.success(
          verifyRes.data.message || `Upgraded to ${order.plan.toUpperCase()} Plan! 🎉`
        );
        onSuccess?.(verifyRes.data.subscription);
        onClose();
      } else {
        throw new Error(verifyRes.data?.message || "Payment verification failed");
      }
    } catch (err) {
      console.error("Payment error:", err);
      toast.error(err.response?.data?.message || err.message || "Payment failed");
    } finally {
      setProcessing(false);
      setStepText("");
    }
  };

  return (
    <div className="rzp-overlay" onClick={processing ? undefined : onClose}>
      <div className="rzp-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="rzp-header">
          <div className="rzp-brand">
            <span className="rzp-logo-badge">R</span>
            <div>
              <h4 className="rzp-header-title">Razorpay Secure Checkout</h4>
              <p className="rzp-header-subtitle">TrueBill ERP · Trusted Business</p>
            </div>
          </div>
          {!processing && (
            <button
              type="button"
              className="rzp-close-btn"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Order Summary Strip */}
        <div className="rzp-summary-bar">
          <div>
            <span className="rzp-plan-name">
              {order.plan?.toUpperCase()} Plan ({order.billingCycle || "yearly"})
            </span>
            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
              Order ID: {order.orderId?.substring(0, 18)}...
            </div>
          </div>
          <div className="rzp-amount">₹{order.amountRupees?.toLocaleString("en-IN")}</div>
        </div>

        {/* Payment Method Tabs */}
        <div className="rzp-tabs">
          <button
            type="button"
            className={`rzp-tab-btn ${activeTab === "upi" ? "active" : ""}`}
            onClick={() => setActiveTab("upi")}
          >
            <QrCode size={16} />
            UPI / QR Code
          </button>
          <button
            type="button"
            className={`rzp-tab-btn ${activeTab === "card" ? "active" : ""}`}
            onClick={() => setActiveTab("card")}
          >
            <CreditCard size={16} />
            Cards
          </button>
          <button
            type="button"
            className={`rzp-tab-btn ${activeTab === "netbanking" ? "active" : ""}`}
            onClick={() => setActiveTab("netbanking")}
          >
            <Building2 size={16} />
            NetBanking
          </button>
        </div>

        {/* Tab Body */}
        <div className="rzp-body">
          {activeTab === "upi" && (
            <div className="rzp-upi-wrap">
              {/* Dynamic QR Code Mockup */}
              <div className="rzp-qr-box">
                <svg
                  width="110"
                  height="110"
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect x="5" y="5" width="30" height="30" rx="3" stroke="#0f172a" strokeWidth="6" />
                  <rect x="13" y="13" width="14" height="14" fill="#0f172a" />
                  <rect x="65" y="5" width="30" height="30" rx="3" stroke="#0f172a" strokeWidth="6" />
                  <rect x="73" y="13" width="14" height="14" fill="#0f172a" />
                  <rect x="5" y="65" width="30" height="30" rx="3" stroke="#0f172a" strokeWidth="6" />
                  <rect x="13" y="73" width="14" height="14" fill="#0f172a" />
                  <rect x="45" y="15" width="10" height="10" fill="#2563eb" />
                  <rect x="45" y="45" width="10" height="10" fill="#0f172a" />
                  <rect x="65" y="45" width="10" height="10" fill="#2563eb" />
                  <rect x="45" y="75" width="10" height="10" fill="#0f172a" />
                  <rect x="75" y="75" width="15" height="15" fill="#0f172a" />
                </svg>
                <span style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 600 }}>
                  Scan with any UPI App
                </span>
              </div>

              <div className="rzp-apps-row">
                <span className="rzp-app-pill">Google Pay</span>
                <span className="rzp-app-pill">PhonePe</span>
                <span className="rzp-app-pill">Paytm</span>
                <span className="rzp-app-pill">BHIM</span>
              </div>

              <div style={{ width: "100%", textAlign: "left" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569" }}>
                  Or enter your UPI ID:
                </span>
                <div className="rzp-upi-input-group">
                  <input
                    type="text"
                    className="rzp-upi-input"
                    placeholder="username@okhdfcbank"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                  />
                  <button
                    type="button"
                    style={{
                      background: "#f1f5f9",
                      border: "1px solid #cbd5e1",
                      borderRadius: 6,
                      padding: "8px 12px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                    onClick={() => setUpiId("merchant@razorpay")}
                  >
                    Use Sample
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "card" && (
            <div className="rzp-card-form">
              <button
                type="button"
                className="rzp-test-card-btn"
                onClick={handleFillTestCard}
              >
                ✨ Click to auto-fill Razorpay Test Card
              </button>

              <div className="rzp-form-group">
                <label>Card Number</label>
                <input
                  type="text"
                  placeholder="4111 1111 1111 1111"
                  value={cardData.number}
                  onChange={(e) =>
                    setCardData({ ...cardData, number: e.target.value })
                  }
                  maxLength={19}
                />
              </div>

              <div className="rzp-card-row">
                <div className="rzp-form-group" style={{ flex: 1 }}>
                  <label>Expiry (MM/YY)</label>
                  <input
                    type="text"
                    placeholder="12/28"
                    value={cardData.expiry}
                    onChange={(e) =>
                      setCardData({ ...cardData, expiry: e.target.value })
                    }
                    maxLength={5}
                  />
                </div>
                <div className="rzp-form-group" style={{ flex: 1 }}>
                  <label>CVV</label>
                  <input
                    type="password"
                    placeholder="123"
                    value={cardData.cvv}
                    onChange={(e) =>
                      setCardData({ ...cardData, cvv: e.target.value })
                    }
                    maxLength={4}
                  />
                </div>
              </div>

              <div className="rzp-form-group">
                <label>Name on Card</label>
                <input
                  type="text"
                  placeholder="Cardholder Name"
                  value={cardData.name}
                  onChange={(e) =>
                    setCardData({ ...cardData, name: e.target.value })
                  }
                />
              </div>
            </div>
          )}

          {activeTab === "netbanking" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {["HDFC Bank", "State Bank of India", "ICICI Bank", "Axis Bank", "Kotak Mahindra", "Punjab National Bank"].map((bank, i) => (
                <div
                  key={i}
                  style={{
                    padding: "12px 14px",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    fontSize: "0.825rem",
                    fontWeight: 600,
                    color: "#334155",
                    cursor: "pointer",
                    background: i === 0 ? "#eff6ff" : "#ffffff",
                    borderColor: i === 0 ? "#2563eb" : "#e2e8f0",
                  }}
                  onClick={() => toast.success(`${bank} selected`)}
                >
                  {bank}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="rzp-footer">
          <button
            type="button"
            className="rzp-pay-btn"
            disabled={processing}
            onClick={handlePayment}
          >
            {processing ? (
              <>
                <RefreshCw size={16} className="spin-icon" />
                <span>{stepText || "Processing Payment..."}</span>
              </>
            ) : (
              <>
                <Lock size={15} />
                <span>Pay ₹{order.amountRupees?.toLocaleString("en-IN")} Securely</span>
              </>
            )}
          </button>

          <div className="rzp-security-note">
            <ShieldCheck size={14} color="#16a34a" />
            <span>256-bit SSL encrypted · Razorpay Payments Pvt Ltd</span>
          </div>
        </div>
      </div>
    </div>
  );
}
