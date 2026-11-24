import React from "react";
import { Crown, Check, ArrowRight, X, ArrowLeftRight, Building2, Store, Warehouse } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./UpgradeAdBanner.css";

export function UpgradeAdBanner({ banner, onClose, onUpgrade }) {
  const navigate = useNavigate();

  const handleAction = () => {
    if (onUpgrade) {
      onUpgrade();
      return;
    }
    navigate("/billing/renew");
  };

  const title = banner?.title || "Manage multiple companies in one TrueBill account";
  const subtitle =
    banner?.subtitle ||
    "Upgrade to add another company and keep its billing, inventory and business records separate.";

  return (
    <div className="uab-body-grid">
      {/* Left Column */}
      <div className="uab-col-left">
        {/* Top Illustration / Multi-Company Org Chart Preview */}
        <div className="uab-illustration-box">
          <div className="uab-org-tree">
            <div className="uab-tree-node">
              <Store size={18} color="#2563eb" />
              <span className="uab-node-label">Retail Store</span>
            </div>

            <div className="uab-tree-connector" />

            <div className="uab-tree-node active-node">
              <Building2 size={18} color="#10b981" />
              <span className="uab-node-label">Main Company</span>
            </div>

            <div className="uab-tree-connector" />

            <div className="uab-tree-node">
              <Warehouse size={18} color="#d97706" />
              <span className="uab-node-label">Warehouse</span>
            </div>
          </div>
        </div>

        {/* Text Details */}
        <div className="uab-tagline">MANAGE MORE THAN ONE BUSINESS</div>
        <h2 className="uab-main-title">{title}</h2>
        <p className="uab-main-desc">{subtitle}</p>

        {/* Bullet checklist matching user request */}
        <div className="uab-bullets-head">
          Buy a <Crown size={15} color="#d97706" /> Pro Plan to:
        </div>

        <div className="uab-bullets-list">
          <div className="uab-bullet-item">
            <div className="uab-green-check">
              <Check size={12} strokeWidth={3} />
            </div>
            <span>Add and manage multiple companies</span>
          </div>

          <div className="uab-bullet-item">
            <div className="uab-green-check">
              <Check size={12} strokeWidth={3} />
            </div>
            <span>Switch between companies within same account</span>
          </div>

          <div className="uab-bullet-item">
            <div className="uab-green-check">
              <Check size={12} strokeWidth={3} />
            </div>
            <span>Keep each company’s invoices, stock and reports separate</span>
          </div>
        </div>
      </div>

      {/* Right Column: Pricing & Switch Widget */}
      <div className="uab-col-right">
        {/* Recommended Plan Outline Box */}
        <div className="uab-plan-box">
          <div className="uab-plan-pill">Recommended for you</div>
          <div className="uab-plan-name-row">
            <Crown size={18} color="#059669" />
            <span>Standard Plan</span>
          </div>
          <div className="uab-plan-price-large">
            ₹4,999 <span>/ year</span>
          </div>
          <div className="uab-plan-subtext">Billed yearly · Cancel anytime</div>
        </div>

        {/* Middle Switcher Visual Widget */}
        <div>
          <div className="uab-switch-divider">All Your Businesses. One Account.</div>
          <div className="uab-switch-widget">
            <div className="uab-switch-avatars">
              <div className="uab-co-badge a">
                <span>A</span>
                <span className="uab-co-sub">COMPANY</span>
              </div>
              <div className="uab-switch-arrow">
                <ArrowLeftRight size={11} strokeWidth={2.5} />
              </div>
              <div className="uab-co-badge b">
                <span>B</span>
                <span className="uab-co-sub">COMPANY</span>
              </div>
            </div>

            <div className="uab-switch-text">
              <strong>Switch between companies</strong>
              <span>Keep each business separate</span>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div>
          <button type="button" className="uab-main-cta" onClick={handleAction}>
            <span>Upgrade to Pro</span>
            <ArrowRight size={17} />
          </button>
          {onClose && (
            <div className="uab-maybe-later">
              <button type="button" className="uab-maybe-later-btn" onClick={onClose}>
                Maybe Later
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function UpgradeAdModal({ isOpen, banner, onClose, onUpgrade }) {
  if (!isOpen) return null;

  return (
    <div className="uab-overlay" onClick={onClose}>
      <div className="uab-modal" onClick={(e) => e.stopPropagation()}>
        {onClose && (
          <button
            type="button"
            className="uab-close-corner"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        )}
        <UpgradeAdBanner
          banner={banner}
          onClose={onClose}
          onUpgrade={onUpgrade}
        />
      </div>
    </div>
  );
}

export default UpgradeAdBanner;
