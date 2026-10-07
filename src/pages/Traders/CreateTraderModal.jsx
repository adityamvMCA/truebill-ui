import { useState } from "react";
import { Building2, CheckCircle2, UserRound } from "lucide-react";
import toast from "react-hot-toast";

import BoxModal from "../../components/common/Modal/BoxModal";
import Input from "../../components/common/Form/Input";
import Select from "../../components/common/Form/Select";
import Textarea from "../../components/common/Form/Textarea";
import Button from "../../components/common/Form/Button";

import api from "../../services/api";

const initialForm = {
  businessName: "",
  businessType: "Trader",
  email: "",
  phone: "",
  gstNo: "",
  panNo: "",
  address: "",
  city: "",
  state: "Karnataka",
  pincode: "",
  subscriptionPlan: "professional",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
};

function CreateTraderModal({ show, onClose, onSuccess }) {
  const [formData, setFormData] = useState(initialForm);

  const [saving, setSaving] = useState(false);

  /* =====================================================
     HANDLE CHANGE
  ===================================================== */

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  /* =====================================================
     CLOSE
  ===================================================== */

  const handleClose = () => {
    if (saving) return;

    setFormData(initialForm);
    onClose?.();
  };

  /* =====================================================
     SUBMIT
  ===================================================== */

  const handleSubmit = async (event) => {
    event.preventDefault();

    /* =========================
       VALIDATION
    ========================= */

    if (!formData.businessName.trim()) {
      toast.error("Please enter business name");
      return;
    }

    if (!formData.adminName.trim()) {
      toast.error("Please enter admin name");
      return;
    }

    if (!formData.adminEmail.trim()) {
      toast.error("Please enter admin email");
      return;
    }

    if (!formData.adminPassword.trim()) {
      toast.error("Please enter admin password");
      return;
    }

    if (formData.adminPassword.length < 6) {
      toast.error("Admin password must be at least 6 characters");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        businessName: formData.businessName.trim(),

        businessType: formData.businessType,

        email: formData.email.trim(),

        phone: formData.phone.trim(),

        gstNo: formData.gstNo.trim().toUpperCase(),

        panNo: formData.panNo.trim().toUpperCase(),

        address: formData.address.trim(),

        city: formData.city.trim(),

        state: formData.state.trim(),

        pincode: formData.pincode.trim(),

        subscriptionPlan: formData.subscriptionPlan,

        adminName: formData.adminName.trim(),

        adminEmail: formData.adminEmail.trim().toLowerCase(),

        adminPassword: formData.adminPassword,
      };

      /*
       * clientCode is NOT sent.
       *
       * Backend generates:
       * TRD001
       * TRD002
       * TRD003...
       */

      const response = await api.tenants.create(payload);

      const result = response?.data;

      if (!result?.success) {
        throw new Error(result?.message || "Failed to create trader");
      }

      toast.success(
        `${
          result?.tenant?.businessName || formData.businessName
        } created successfully`,
      );

      setFormData(initialForm);

      if (onSuccess) {
        await onSuccess(result?.tenant);
      }

      onClose?.();
    } catch (error) {
      console.error("Create trader error:", error);

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to create trader",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <BoxModal
      show={show}
      onClose={handleClose}
      title="Add Trader"
      subtitle="Register a new trader and administrator"
      icon={<Building2 size={20} />}
      width="1120px"
      footer={
        <div className="box-modal-footer-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={saving}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            form="create-trader-form"
            variant="primary"
            disabled={saving}
          >
            {saving ? "Creating..." : "Create Trader"}
          </Button>
        </div>
      }
    >
      <form id="create-trader-form" onSubmit={handleSubmit}>
        {/* =================================================
            BUSINESS INFORMATION
        ================================================= */}

        <div className="box-modal-section">
          <div className="box-modal-section-header">
            <div className="box-modal-section-icon">
              <Building2 size={17} />
            </div>

            <div className="box-modal-section-header-content">
              <h3>Business Information</h3>

              <p>Enter trader business details</p>
            </div>
          </div>

          <div className="box-modal-form-grid">
            {/* Business Name */}

            <Input
              label="Business Name"
              name="businessName"
              value={formData.businessName}
              onChange={handleChange}
              placeholder="Enter business name"
              required
            />

            {/* Business Type */}

            <Select
              label="Business Type"
              name="businessType"
              value={formData.businessType}
              onChange={handleChange}
              options={[
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
                  value: "Service",
                  label: "Service",
                },
              ]}
            />

            {/* Phone */}

            <Input
              label="Phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter phone number"
            />

            {/* Business Email */}

            <Input
              label="Business Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="business@example.com"
              autoComplete="off"
            />

            {/* GST */}

            <Input
              label="GST Number"
              name="gstNo"
              value={formData.gstNo}
              onChange={handleChange}
              placeholder="Enter GST number"
            />

            {/* PAN */}

            <Input
              label="PAN Number"
              name="panNo"
              value={formData.panNo}
              onChange={handleChange}
              placeholder="Enter PAN number"
            />

            {/* Address */}

            <div className="box-modal-form-full">
              <Textarea
                label="Address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Enter business address"
                rows={2}
              />
            </div>

            {/* City */}

            <Input
              label="City"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="Enter city"
            />

            {/* State */}

            <Input
              label="State"
              name="state"
              value={formData.state}
              onChange={handleChange}
              placeholder="Enter state"
            />

            {/* Pincode */}

            <Input
              label="Pincode"
              name="pincode"
              value={formData.pincode}
              onChange={handleChange}
              placeholder="Enter pincode"
              maxLength={6}
            />
          </div>
        </div>

        {/* =================================================
            SUBSCRIPTION
        ================================================= */}

        <div className="box-modal-section">
          <div className="box-modal-section-header">
            <div className="box-modal-section-icon">
              <CheckCircle2 size={17} />
            </div>

            <div className="box-modal-section-header-content">
              <h3>Subscription</h3>

              <p>Select trader subscription plan</p>
            </div>
          </div>

          <div className="box-modal-form-grid">
            <Select
              label="Subscription Plan"
              name="subscriptionPlan"
              value={formData.subscriptionPlan}
              onChange={handleChange}
              options={[
                {
                  value: "basic",
                  label: "Basic",
                },
                {
                  value: "professional",
                  label: "Professional",
                },
                {
                  value: "enterprise",
                  label: "Enterprise",
                },
              ]}
            />
          </div>
        </div>

        {/* =================================================
            ADMINISTRATOR ACCOUNT
        ================================================= */}

        <div className="box-modal-section">
          <div className="box-modal-section-header">
            <div className="box-modal-section-icon">
              <UserRound size={17} />
            </div>

            <div className="box-modal-section-header-content">
              <h3>Administrator Account</h3>

              <p>Create the trader administrator login</p>
            </div>
          </div>

          <div className="box-modal-form-grid">
            {/* Admin Name */}

            <Input
              label="Admin Name"
              name="adminName"
              value={formData.adminName}
              onChange={handleChange}
              placeholder="Enter admin name"
              required
            />

            {/* Admin Email */}

            <Input
              label="Admin Email"
              name="adminEmail"
              type="email"
              value={formData.adminEmail}
              onChange={handleChange}
              placeholder="admin@example.com"
              autoComplete="new-email"
              required
            />

            {/* Admin Password */}

            <Input
              label="Admin Password"
              name="adminPassword"
              type="password"
              value={formData.adminPassword}
              onChange={handleChange}
              placeholder="Minimum 6 characters"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>
        </div>
      </form>
    </BoxModal>
  );
}

export default CreateTraderModal;
