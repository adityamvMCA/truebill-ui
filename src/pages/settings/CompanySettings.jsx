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
  GitBranch,
  MapPin,
  Plus,
  Crown,
  Phone,
  Mail,
  FileText,
} from "lucide-react";

import Input from "../../components/common/Form/Input";
import Select from "../../components/common/Form/Select";
import Textarea from "../../components/common/Form/Textarea";
import Button from "../../components/common/Form/Button";

import api from "../../services/api";
import businessApi from "../../services/modules/businessApi";
import AddBranchModal from "../../components/common/BusinessModals/AddBranchModal";
import AddBusinessModal from "../../components/common/BusinessModals/AddBusinessModal";
import { UpgradeAdModal } from "../../components/common/UpgradeAdBanner/UpgradeAdBanner";

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

  // Branch & Multi-Company management state
  const [branches, setBranches] = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchLimits, setBranchLimits] = useState(null);
  const [isAddBranchOpen, setIsAddBranchOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeBannerData, setUpgradeBannerData] = useState(null);

  // Multi-Company list & modal state
  const [myBusinesses, setMyBusinesses] = useState([]);
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);

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

  const fetchBranches = useCallback(async () => {
    setBranchesLoading(true);
    try {
      const [branchRes, bizRes] = await Promise.allSettled([
        businessApi.getBranches(),
        businessApi.getMyBusinesses(),
      ]);

      if (branchRes.status === "fulfilled" && branchRes.value.data?.success) {
        setBranches(branchRes.value.data.branches || []);
      }
      if (bizRes.status === "fulfilled" && bizRes.value.data?.success) {
        setBranchLimits(bizRes.value.data.planLimits || null);
        setMyBusinesses(bizRes.value.data.businesses || []);
      }
    } catch (err) {
      console.error("Error loading branches/companies:", err);
    } finally {
      setBranchesLoading(false);
    }
  }, []);

  const handleAddCompanyClick = () => {
    const currentPlan = (branchLimits?.plan || tenant?.subscriptionPlan || "basic").toLowerCase();

    // Premium: unlimited companies
    if (currentPlan === "premium") {
      setIsAddCompanyOpen(true);
      return;
    }

    // Standard: allows up to 3 companies
    if (currentPlan === "standard" && myBusinesses.length < 3) {
      setIsAddCompanyOpen(true);
      return;
    }

    // Basic / Trial (or limit reached): Show MyBillBook-style Upgrade Ad Modal!
    setIsUpgradeModalOpen(true);
  };

  const handleSwitchCompany = async (targetId, name) => {
    if (targetId === tenant?._id) return;
    try {
      const res = await businessApi.switchBusiness(targetId);
      if (res.data?.success && res.data.token) {
        localStorage.setItem("token", res.data.token);
        if (res.data.tenant) {
          localStorage.setItem("tenant", JSON.stringify(res.data.tenant));
        }
        if (res.data.user) {
          localStorage.setItem("user", JSON.stringify(res.data.user));
        }
      }
      sessionStorage.setItem("selectedTenantId", targetId);
      sessionStorage.setItem("selectedTenant", JSON.stringify({ _id: targetId, businessName: name }));
      localStorage.setItem("selectedTenantId", targetId);
      window.dispatchEvent(new Event("tenantChanged"));
      window.dispatchEvent(new Event("userChanged"));
      toast.success(`Switched to ${name}`);
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to switch company");
    }
  };

  const handleAddBranchClick = () => {
    const currentPlan = (branchLimits?.plan || tenant?.subscriptionPlan || "basic").toLowerCase();

    // 1. Premium subscription has UNLIMITED branches: Never block, never show upgrade banner
    if (currentPlan === "premium") {
      setIsAddBranchOpen(true);
      return;
    }

    // 2. Standard subscription allows up to 5 branches
    if (currentPlan === "standard") {
      if (branches.length < 5) {
        setIsAddBranchOpen(true);
        return;
      }
    }

    // 3. Basic / Trial (or limit reached): Show in-app Upgrade Ad Modal on the page
    // (Stays on Company Settings page without navigating away until user clicks Upgrade to Pro)
    setUpgradeBannerData({
      badge: "PRO FEATURE",
      title: "Unlock Multiple Branches & Locations",
      subtitle: `Your current ${currentPlan.toUpperCase()} plan allows ${currentPlan === "standard" ? 5 : 1} branch. Upgrade to TrueBill Standard or Premium to add multiple showrooms and warehouses!`,
      highlights: [
        "Create unlimited branches and warehouses",
        "Dedicated branch codes, GSTINs and invoices",
        "Branch-wise inventory and sales tracking",
        "Seamless 1-click branch switching",
      ],
      plans: [
        { name: "Standard", price: "₹4,999/yr", features: "Up to 5 Branches" },
        { name: "Premium", price: "₹8,999/yr", features: "Unlimited Branches" },
      ],
      actionText: "Upgrade to Pro",
      actionUrl: "/billing/renew",
    });
    setIsUpgradeModalOpen(true);
  };

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    loadCompanySettings();
    fetchBranches();
  }, [loadCompanySettings, fetchBranches]);

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
          {/* My Companies & Sub-Companies Card */}
          <div className="settings-card">
            <div
              className="settings-card-header"
              style={{
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div
                  className="settings-card-icon"
                  style={{ background: "#ede9fe", color: "#6d28d9" }}
                >
                  <Building2 size={18} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h2>My Companies ({myBusinesses.length})</h2>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        padding: "2px 8px",
                        borderRadius: 12,
                        background: "#ede9fe",
                        color: "#6d28d9",
                        fontWeight: 700,
                      }}
                    >
                      {branchLimits?.plan?.toUpperCase() || "PLAN"}
                    </span>
                  </div>
                  <p>
                    Manage all your business entities and sub-companies under your account with separate books
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {branchLimits && (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "#64748b",
                      fontWeight: 500,
                    }}
                  >
                    Limit:{" "}
                    {branchLimits.businesses === null
                      ? "Unlimited"
                      : `${myBusinesses.length} / ${branchLimits.businesses}`}
                  </span>
                )}
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleAddCompanyClick}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 14px",
                    fontSize: "0.875rem",
                    background: "#00ab55",
                    borderColor: "#00ab55",
                  }}
                >
                  <Plus size={15} />
                  Add Company
                </Button>
              </div>
            </div>

            {myBusinesses.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 12,
                  marginTop: 8,
                }}
              >
                {myBusinesses.map((b) => {
                  const isCurrent = String(b.id || b._id) === String(tenant?._id);
                  return (
                    <div
                      key={b.id || b._id}
                      style={{
                        border: isCurrent ? "1.5px solid #6d28d9" : "1px solid #e2e8f0",
                        background: isCurrent ? "#fbfbfe" : "#ffffff",
                        borderRadius: 10,
                        padding: "14px 16px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>
                              {b.businessName}
                            </span>
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 2 }}>
                            Code: {b.clientCode} {b.businessType ? `· ${b.businessType}` : ""}
                          </div>
                        </div>

                        {isCurrent ? (
                          <span
                            style={{
                              fontSize: "0.7rem",
                              background: "#ede9fe",
                              color: "#6d28d9",
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 12,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <CheckCircle2 size={11} />
                            Active
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSwitchCompany(b.id || b._id, b.businessName)}
                            style={{
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              padding: "4px 9px",
                              borderRadius: 6,
                              background: "#f1f5f9",
                              color: "#334155",
                              border: "1px solid #cbd5e1",
                              cursor: "pointer",
                            }}
                          >
                            Switch to this
                          </button>
                        )}
                      </div>

                      {b.gstNo && (
                        <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                          GST: <strong>{b.gstNo}</strong>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

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

          {/* Branches & Multiple Locations */}
          <div className="settings-card">
            <div
              className="settings-card-header"
              style={{
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div
                  className="settings-card-icon"
                  style={{ background: "#f0fdf4", color: "#16a34a" }}
                >
                  <GitBranch size={18} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h2>Branches & Locations</h2>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        padding: "2px 8px",
                        borderRadius: 12,
                        background: "#f1f5f9",
                        color: "#475569",
                        fontWeight: 600,
                      }}
                    >
                      {branches.length} {branches.length === 1 ? "Branch" : "Branches"}
                    </span>
                  </div>
                  <p>
                    Manage physical branches, warehouses, showrooms, and city stores for this company
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {branchLimits && (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "#64748b",
                      fontWeight: 500,
                    }}
                  >
                    Limit:{" "}
                    {branchLimits.branches === null
                      ? "Unlimited"
                      : `${branches.length} / ${branchLimits.branches}`}{" "}
                    ({branchLimits.plan?.toUpperCase()})
                  </span>
                )}
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleAddBranchClick}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 14px",
                    fontSize: "0.875rem",
                  }}
                >
                  <Plus size={15} />
                  Add Branch
                </Button>
              </div>
            </div>

            {branchesLoading ? (
              <div
                style={{
                  padding: "24px 0",
                  textAlign: "center",
                  color: "#64748b",
                  fontSize: "0.875rem",
                }}
              >
                <RefreshCw
                  size={18}
                  className="spin-icon"
                  style={{
                    display: "inline-block",
                    marginRight: 8,
                    verticalAlign: "middle",
                  }}
                />
                Loading branches...
              </div>
            ) : branches.length === 0 ? (
              <div
                style={{
                  padding: "32px 16px",
                  textAlign: "center",
                  background: "#f8fafc",
                  borderRadius: 8,
                  border: "1px dashed #cbd5e1",
                }}
              >
                <GitBranch
                  size={28}
                  style={{ color: "#94a3b8", margin: "0 auto 8px" }}
                />
                <p
                  style={{
                    margin: "0 0 4px",
                    fontWeight: 600,
                    color: "#334155",
                  }}
                >
                  No branches found
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.8125rem",
                    color: "#64748b",
                  }}
                >
                  Create your first branch to organize multiple outlets and locations.
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: 12,
                  marginTop: 8,
                }}
              >
                {branches.map((b) => (
                  <div
                    key={b._id}
                    style={{
                      border: b.isMain
                        ? "1.5px solid #16a34a"
                        : "1px solid #e2e8f0",
                      background: b.isMain ? "#f0fdf4" : "#ffffff",
                      borderRadius: 10,
                      padding: "14px 16px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: "0.95rem",
                              color: "#0f172a",
                            }}
                          >
                            {b.name}
                          </span>
                          {b.code && (
                            <span
                              style={{
                                fontSize: "0.7rem",
                                background: "#e2e8f0",
                                color: "#475569",
                                padding: "1px 6px",
                                borderRadius: 4,
                                fontWeight: 600,
                              }}
                            >
                              {b.code}
                            </span>
                          )}
                        </div>
                        {b.isMain && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: "0.7rem",
                              background: "#dcfce7",
                              color: "#15803d",
                              padding: "2px 8px",
                              borderRadius: 12,
                              fontWeight: 700,
                              marginTop: 4,
                            }}
                          >
                            <CheckCircle2 size={11} />
                            Main Head Branch
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: "0.8125rem",
                        color: "#475569",
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        marginTop: 4,
                      }}
                    >
                      {(b.phone || b.email) && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          {b.phone && (
                            <span
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <Phone size={12} color="#64748b" />
                              {b.phone}
                            </span>
                          )}
                          {b.email && (
                            <span
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <Mail size={12} color="#64748b" />
                              {b.email}
                            </span>
                          )}
                        </div>
                      )}

                      {b.gstNo && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <FileText size={12} color="#64748b" />
                          <span>GST: {b.gstNo}</span>
                        </div>
                      )}

                      {(b.address?.city || b.address?.state) && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <MapPin size={12} color="#64748b" />
                          <span>
                            {[
                              b.address?.street,
                              b.address?.city,
                              b.address?.state,
                              b.address?.pincode,
                            ]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Plan limit upgrade banner prompt if basic */}
            {branchLimits?.plan === "basic" && (
              <div
                style={{
                  marginTop: 14,
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "#fffbeb",
                  border: "1px solid #fef3c7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Crown size={16} color="#d97706" />
                  <span
                    style={{
                      fontSize: "0.8125rem",
                      color: "#92400e",
                      fontWeight: 500,
                    }}
                  >
                    Basic Plan allows 1 branch. Upgrade to Standard or Premium to add multiple branches & warehouses!
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddBranchClick}
                  style={{
                    background: "#d97706",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 6,
                    padding: "4px 10px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  View Plans
                </button>
              </div>
            )}
          </div>

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

      {/* Add Business / Company Modal */}
      <AddBusinessModal
        isOpen={isAddCompanyOpen}
        onClose={() => setIsAddCompanyOpen(false)}
        onSuccess={() => {
          fetchBranches();
          loadCompanySettings();
        }}
        onLimitReached={() => setIsUpgradeModalOpen(true)}
      />

      {/* Add Branch Modal */}
      <AddBranchModal
        isOpen={isAddBranchOpen}
        onClose={() => setIsAddBranchOpen(false)}
        onSuccess={fetchBranches}
        onLimitReached={(banner) => {
          setUpgradeBannerData(banner);
          setIsUpgradeModalOpen(true);
        }}
      />

      {/* Upgrade Ad Modal (shown when Basic plan limit reached) */}
      <UpgradeAdModal
        isOpen={isUpgradeModalOpen}
        banner={upgradeBannerData}
        onClose={() => setIsUpgradeModalOpen(false)}
      />
    </div>
  );
}

export default CompanySettings;