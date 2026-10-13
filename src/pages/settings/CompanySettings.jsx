import {
  useCallback,
  useEffect,
  useState,
} from "react";

import toast from "react-hot-toast";

import {
  Building2,
  CheckCircle2,
  Palette,
  RefreshCw,
  Save,
} from "lucide-react";

import Input from "../../components/common/Form/Input";
import Select from "../../components/common/Form/Select";
import Textarea from "../../components/common/Form/Textarea";
import Button from "../../components/common/Form/Button";

import api from "../../services/api";

import {
  getCurrentTenantContext,
} from "../../utils/tenantContext";

const THEME_OPTIONS = [
  {
    value: "blue",
    label: "Ocean Blue",
  },
  {
    value: "green",
    label: "Emerald",
  },
  {
    value: "purple",
    label: "Purple",
  },
  {
    value: "orange",
    label: "Orange",
  },
  {
    value: "red",
    label: "Red",
  },
  {
    value: "teal",
    label: "Teal",
  },
  {
    value: "indigo",
    label: "Indigo",
  },
  {
    value: "pink",
    label: "Pink",
  },
  {
    value: "cyan",
    label: "Cyan",
  },
  {
    value: "slate",
    label: "Slate",
  },
];

const BUSINESS_TYPE_OPTIONS = [
  {
    value: "Trader",
    label: "Trader",
  },
  {
    value: "Distributor",
    label: "Distributor",
  },
  {
    value: "Wholesaler",
    label: "Wholesaler",
  },
  {
    value: "Retailer",
    label: "Retailer",
  },
  {
    value: "Manufacturer",
    label: "Manufacturer",
  },
  {
    value: "Service Provider",
    label: "Service Provider",
  },
];

const initialForm = {
  businessName: "",
  businessType: "Trader",
  email: "",
  phone: "",
  gstNo: "",
  panNo: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
};

const EMAIL_REGEX =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PHONE_REGEX =
  /^[6-9]\d{9}$/;

const GST_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const PAN_REGEX =
  /^[A-Z]{5}[0-9]{4}[A-Z]$/;

const PINCODE_REGEX =
  /^[1-9][0-9]{5}$/;

function CompanySettings() {
  const [formData, setFormData] =
    useState(initialForm);

  const [tenant, setTenant] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [theme, setTheme] = useState(
    () =>
      localStorage.getItem("theme") ||
      "blue",
  );

  const applyTheme = (selectedTheme) => {
    document.documentElement.setAttribute(
      "data-theme",
      selectedTheme,
    );

    localStorage.setItem(
      "theme",
      selectedTheme,
    );
  };

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleThemeChange = (event) => {
    const selectedTheme =
      event.target.value;

    setTheme(selectedTheme);
    applyTheme(selectedTheme);

    const selectedLabel =
      event.target.selectedOptions?.[0]
        ?.label || "Theme";

    toast.success(
      `${selectedLabel} applied`,
    );
  };

  const loadCompanySettings =
    useCallback(async () => {
      const { tenantId } =
        getCurrentTenantContext();

      if (!tenantId) {
        setTenant(null);
        setFormData(initialForm);
        setLoading(false);

        toast.error(
          "Your account is not linked to a company",
        );

        return;
      }

      setLoading(true);

      try {
        const response =
          await api.tenants.getById(
            tenantId,
          );

        const result = response?.data;

        if (
          !result?.success ||
          !result?.tenant
        ) {
          throw new Error(
            result?.message ||
              "Unable to load company settings",
          );
        }

        const loadedTenant =
          result.tenant;

        setTenant(loadedTenant);

        setFormData({
          businessName:
            loadedTenant.businessName || "",
          businessType:
            loadedTenant.businessType ||
            "Trader",
          email: loadedTenant.email || "",
          phone: loadedTenant.phone || "",
          gstNo: loadedTenant.gstNo || "",
          panNo: loadedTenant.panNo || "",
          address:
            loadedTenant.address || "",
          city: loadedTenant.city || "",
          state: loadedTenant.state || "",
          pincode:
            loadedTenant.pincode || "",
        });
      } catch (error) {
        console.error(
          "Load company settings error:",
          error,
        );

        setTenant(null);

        toast.error(
          error?.response?.data?.message ||
            error?.message ||
            "Unable to load company settings",
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    loadCompanySettings();
  }, [loadCompanySettings]);

  const validateForm = () => {
    const normalizedEmail = formData.email
      .trim()
      .toLowerCase();

    const normalizedPhone = formData.phone
      .replace(/\D/g, "")
      .slice(-10);

    const normalizedGst = formData.gstNo
      .trim()
      .toUpperCase();

    const normalizedPan = formData.panNo
      .trim()
      .toUpperCase();

    const normalizedPincode =
      formData.pincode.trim();

    if (!formData.businessName.trim()) {
      toast.error(
        "Please enter business name",
      );

      return false;
    }

    if (
      normalizedEmail &&
      !EMAIL_REGEX.test(normalizedEmail)
    ) {
      toast.error(
        "Please enter a valid business email",
      );

      return false;
    }

    if (
      normalizedPhone &&
      !PHONE_REGEX.test(normalizedPhone)
    ) {
      toast.error(
        "Please enter a valid phone number",
      );

      return false;
    }

    if (
      normalizedGst &&
      !GST_REGEX.test(normalizedGst)
    ) {
      toast.error(
        "Please enter a valid GST number",
      );

      return false;
    }

    if (
      normalizedPan &&
      !PAN_REGEX.test(normalizedPan)
    ) {
      toast.error(
        "Please enter a valid PAN number",
      );

      return false;
    }

    if (
      normalizedPincode &&
      !PINCODE_REGEX.test(
        normalizedPincode,
      )
    ) {
      toast.error(
        "Please enter a valid pincode",
      );

      return false;
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const { tenantId } =
      getCurrentTenantContext();

    if (!tenantId) {
      toast.error(
        "Your account is not linked to a company",
      );

      return;
    }

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const payload = {
        businessName:
          formData.businessName.trim(),
        businessType:
          formData.businessType,
        email: formData.email
          .trim()
          .toLowerCase(),
        phone: formData.phone
          .replace(/\D/g, "")
          .slice(-10),
        gstNo: formData.gstNo
          .trim()
          .toUpperCase(),
        panNo: formData.panNo
          .trim()
          .toUpperCase(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
      };

      const response =
        await api.tenants.update(
          tenantId,
          payload,
        );

      const result = response?.data;

      if (!result?.success) {
        throw new Error(
          result?.message ||
            "Failed to update company settings",
        );
      }

      const updatedTenant =
        result.tenant || {
          ...tenant,
          ...payload,
        };

      setTenant(updatedTenant);

      toast.success(
        "Company settings updated successfully",
      );
    } catch (error) {
      console.error(
        "Update company settings error:",
        error,
      );

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to update company settings",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="company-settings-page">
      <div className="company-settings-header">
        <div className="page-title-row">
          <div className="page-title-icon">
            <Building2 size={22} />
          </div>

          <div>
            <h1>Company Settings</h1>

            <p>
              Manage your business profile
              and application appearance
            </p>
          </div>
        </div>

        <div className="company-settings-header-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={loadCompanySettings}
            disabled={loading || saving}
          >
            <RefreshCw
              size={16}
              className={
                loading
                  ? "spin-icon"
                  : ""
              }
            />

            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="company-settings-loading">
          <RefreshCw
            size={24}
            className="spin-icon"
          />

          <span>
            Loading company settings...
          </span>
        </div>
      ) : (
        <div className="company-settings-content">
          <form onSubmit={handleSubmit}>
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-icon">
                  <Building2 size={18} />
                </div>

                <div>
                  <h2>
                    Business Information
                  </h2>

                  <p>
                    Update your organization
                    details
                  </p>
                </div>
              </div>

              <div className="settings-form-grid">
                <Input
                  label="Business Name"
                  name="businessName"
                  value={
                    formData.businessName
                  }
                  onChange={handleChange}
                  placeholder="Enter business name"
                  required
                />

                <Select
                  label="Business Type"
                  name="businessType"
                  value={
                    formData.businessType
                  }
                  onChange={handleChange}
                  options={
                    BUSINESS_TYPE_OPTIONS
                  }
                />

                <Input
                  label="Business Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="business@example.com"
                />

                <Input
                  label="Phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                  maxLength={10}
                />

                <Input
                  label="GST Number"
                  name="gstNo"
                  value={formData.gstNo}
                  onChange={handleChange}
                  placeholder="Enter GST number"
                  maxLength={15}
                />

                <Input
                  label="PAN Number"
                  name="panNo"
                  value={formData.panNo}
                  onChange={handleChange}
                  placeholder="Enter PAN number"
                  maxLength={10}
                />

                <div className="settings-form-full">
                  <Textarea
                    label="Address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Enter business address"
                    rows={3}
                  />
                </div>

                <Input
                  label="City"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Enter city"
                />

                <Input
                  label="State"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="Enter state"
                />

                <Input
                  label="Pincode"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  placeholder="Enter pincode"
                  maxLength={6}
                />
              </div>

              <div className="settings-card-footer">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={saving || loading}
                >
                  <Save size={16} />

                  {saving
                    ? "Saving..."
                    : "Save Company Settings"}
                </Button>
              </div>
            </div>
          </form>

          <div className="settings-card">
            <div className="settings-card-header">
              <div className="settings-card-icon">
                <Palette size={18} />
              </div>

              <div>
                <h2>Appearance</h2>

                <p>
                  Choose your application
                  theme
                </p>
              </div>
            </div>

            <div className="settings-form-grid">
              <Select
                label="Theme"
                name="theme"
                value={theme}
                onChange={handleThemeChange}
                options={THEME_OPTIONS}
              />

              <div className="theme-preview">
                <div className="theme-preview-primary" />

                <div className="theme-preview-soft" />

                <div className="theme-preview-text">
                  <strong>
                    {theme} theme
                  </strong>

                  <span>
                    Applied across the
                    application
                  </span>
                </div>
              </div>
            </div>

            <div className="settings-card-footer">
              <div className="settings-info">
                <CheckCircle2 size={16} />

                <span>
                  Theme is saved on this
                  device and applied
                  globally.
                </span>
              </div>
            </div>
          </div>

          {tenant && (
            <div className="settings-card">
              <div className="settings-card-header">
                <div className="settings-card-icon">
                  <CheckCircle2 size={18} />
                </div>

                <div>
                  <h2>Subscription</h2>

                  <p>
                    Current company
                    subscription details
                  </p>
                </div>
              </div>

              <div className="subscription-details">
                <div>
                  <span>Client Code</span>

                  <strong>
                    {tenant.clientCode ||
                      "-"}
                  </strong>
                </div>

                <div>
                  <span>Plan</span>

                  <strong>
                    {tenant.subscriptionPlan ||
                      "-"}
                  </strong>
                </div>

                <div>
                  <span>Status</span>

                  <strong>
                    {tenant.status || "-"}
                  </strong>
                </div>

                <div>
                  <span>Valid Till</span>

                  <strong>
                    {tenant.subscriptionEnd
                      ? new Date(
                          tenant.subscriptionEnd,
                        ).toLocaleDateString(
                          "en-IN",
                        )
                      : "-"}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CompanySettings;