import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Bell, CheckCircle2, RotateCcw, Save } from "lucide-react";

import Select from "../../components/common/Form/Select";
import Button from "../../components/common/Form/Button";

import { getCurrentTenantContext } from "../../utils/tenantContext";

const DEFAULT_PREFERENCES = {
  salesAlerts: true,
  purchaseAlerts: true,
  inventoryAlerts: true,
  paymentAlerts: true,
  approvalAlerts: true,
  subscriptionAlerts: true,
};

const ALERT_FIELDS = [
  {
    name: "salesAlerts",
    label: "Sales Alerts",
    description: "Sales orders, invoices, and quotations",
  },
  {
    name: "purchaseAlerts",
    label: "Purchase Alerts",
    description: "Purchase orders, bills, and requisitions",
  },
  {
    name: "inventoryAlerts",
    label: "Inventory Alerts",
    description: "Low stock, transfers, and stock updates",
  },
  {
    name: "paymentAlerts",
    label: "Payment Alerts",
    description: "Receipts, payments, and outstanding balances",
  },
  {
    name: "approvalAlerts",
    label: "Approval Alerts",
    description: "Requests requiring review or approval",
  },
  {
    name: "subscriptionAlerts",
    label: "Subscription Alerts",
    description: "Subscription expiry and account notices",
  },
];

const ENABLED_OPTIONS = [
  { value: "enabled", label: "Enabled" },
  { value: "disabled", label: "Disabled" },
];

const getPreferencesKey = () => {
  const { tenantId, user } = getCurrentTenantContext();

  const userId = user.id || user._id;

  if (!userId || !tenantId) {
    return null;
  }

  return `notificationPreferences:${tenantId}:${userId}`;
};

const loadPreferences = (key) => {
  if (!key) {
    return { ...DEFAULT_PREFERENCES };
  }

  try {
    const stored = JSON.parse(localStorage.getItem(key) || "{}");

    return Object.fromEntries(
      Object.entries(DEFAULT_PREFERENCES).map(([name, defaultValue]) => [
        name,
        typeof stored?.[name] === "boolean" ? stored[name] : defaultValue,
      ]),
    );
  } catch (error) {
    console.error("Unable to read notification preferences:", error);

    return { ...DEFAULT_PREFERENCES };
  }
};

function Notifications() {
  const storageKey = useMemo(getPreferencesKey, []);

  const [preferences, setPreferences] = useState(() =>
    loadPreferences(storageKey),
  );

  const [savedPreferences, setSavedPreferences] = useState(() =>
    loadPreferences(storageKey),
  );

  const hasChanges = Object.keys(DEFAULT_PREFERENCES).some(
    (name) => preferences[name] !== savedPreferences[name],
  );

  const handleChange = (event) => {
    const { name, value } = event.target;

    setPreferences((previous) => ({
      ...previous,
      [name]: value === "enabled",
    }));
  };

  const handleSave = (event) => {
    event.preventDefault();

    if (!storageKey) {
      toast.error("Sign in to a company account before saving preferences");
      return;
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify(preferences));

      setSavedPreferences({ ...preferences });

      toast.success("Notification preferences saved in this browser");
    } catch (error) {
      console.error("Unable to save notification preferences:", error);

      toast.error("Unable to save preferences");
    }
  };

  const restoreDefaults = () => {
    setPreferences({ ...DEFAULT_PREFERENCES });
    toast("Defaults restored. Click Save to keep them.");
  };

  return (
    <div className="company-settings-page">
      <div className="company-settings-header">
        <div className="page-title-row">
          <div className="page-title-icon">
            <Bell size={22} />
          </div>

          <div>
            <h1>Notifications</h1>
            <p>Manage your local notification preferences</p>
          </div>
        </div>

        <div className="company-settings-header-actions">
          <Button type="button" variant="secondary" onClick={restoreDefaults}>
            <RotateCcw size={16} />
            Restore Defaults
          </Button>
        </div>
      </div>

      <div className="company-settings-content">
        <form onSubmit={handleSave}>
          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-icon">
                <Bell size={18} />
              </div>

              <div>
                <h2>Alert Categories</h2>
                <p>Choose your preferred alert categories</p>
              </div>
            </div>

            <div className="settings-form-grid">
              {ALERT_FIELDS.map((field) => (
                <div key={field.name}>
                  <Select
                    label={field.label}
                    name={field.name}
                    value={preferences[field.name] ? "enabled" : "disabled"}
                    onChange={handleChange}
                    options={ENABLED_OPTIONS}
                  />
                  <p>{field.description}</p>
                </div>
              ))}
            </div>

            <div className="settings-card-footer">
              <div className="settings-info">
                <CheckCircle2 size={16} />
                <span>
                  {hasChanges
                    ? "You have unsaved changes."
                    : "No unsaved changes."}
                </span>
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={!hasChanges || !storageKey}
              >
                <Save size={16} />
                Save Preferences
              </Button>
            </div>
          </div>
        </form>

        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-card-icon">
              <Bell size={18} />
            </div>

            <div>
              <h2>Delivery Integration</h2>
              <p>These preferences are currently browser-local</p>
            </div>
          </div>

          <p>
            Saving these preferences does not enable or disable email, push, or
            server-generated notifications. Those services must read these
            preferences after backend notification settings are implemented.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Notifications;
