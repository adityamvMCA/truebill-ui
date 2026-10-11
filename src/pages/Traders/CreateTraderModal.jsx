import { useState } from "react";
import {
  Building2,
  CheckCircle2,
  UserRound,
} from "lucide-react";
import toast from "react-hot-toast";

import BoxModal from "../../components/common/Modal/BoxModal";
import Input from "../../components/common/Form/Input";
import Select from "../../components/common/Form/Select";
import Textarea from "../../components/common/Form/Textarea";
import Button from "../../components/common/Form/Button";

import api from "../../services/api";

const getMinimumSubscriptionDate = () => {
  const tomorrow = new Date();

  tomorrow.setDate(
    tomorrow.getDate() + 1
  );

  return tomorrow
    .toISOString()
    .split("T")[0];
};

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
  subscriptionEnd: "",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
};

function CreateTraderModal({
  show,
  onClose,
  onSuccess,
}) {
  const [formData, setFormData] =
    useState(initialForm);

  const [saving, setSaving] =
    useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleClose = () => {
    if (saving) {
      return;
    }

    setFormData(initialForm);

    onClose?.();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.businessName.trim()) {
      toast.error(
        "Please enter business name"
      );

      return;
    }

    if (!formData.adminName.trim()) {
      toast.error(
        "Please enter admin name"
      );

      return;
    }

    if (!formData.adminEmail.trim()) {
      toast.error(
        "Please enter admin email"
      );

      return;
    }

    if (!formData.adminPassword.trim()) {
      toast.error(
        "Please enter admin password"
      );

      return;
    }

    if (formData.adminPassword.length < 6) {
      toast.error(
        "Admin password must be at least 6 characters"
      );

      return;
    }

    if (!formData.subscriptionEnd) {
      toast.error(
        "Please select subscription end date"
      );

      return;
    }

    const subscriptionEndDate = new Date(
      `${formData.subscriptionEnd}T23:59:59`
    );

    if (
      Number.isNaN(
        subscriptionEndDate.getTime()
      ) ||
      subscriptionEndDate <= new Date()
    ) {
      toast.error(
        "Subscription end date must be in the future"
      );

      return;
    }

    try {
      setSaving(true);

      const payload = {
        businessName:
          formData.businessName.trim(),

        businessType:
          formData.businessType,

        email: formData.email
          .trim()
          .toLowerCase(),

        phone: formData.phone.trim(),

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

        subscriptionPlan:
          formData.subscriptionPlan,

        subscriptionEnd:
          formData.subscriptionEnd,

        adminName:
          formData.adminName.trim(),

        adminEmail: formData.adminEmail
          .trim()
          .toLowerCase(),

        adminPassword:
          formData.adminPassword,
      };

      const response =
        await api.tenants.create(payload);

      const result = response?.data;

      if (!result?.success) {
        throw new Error(
          result?.message ||
            "Failed to create tenant"
        );
      }

      toast.success(
        `${
          result?.tenant?.businessName ||
          formData.businessName
        } created successfully`
      );

      setFormData(initialForm);

      await onSuccess?.(result?.tenant);

      onClose?.();
    } catch (error) {
      console.error(
        "Create tenant error:",
        error
      );

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to create tenant"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <BoxModal
      show={show}
      onClose={handleClose}
      title="Create Tenant"
      subtitle="Register an organization and administrator"
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
            form="create-tenant-form"
            variant="primary"
            disabled={saving}
          >
            {saving
              ? "Creating..."
              : "Create Tenant"}
          </Button>
        </div>
      }
    >
      <form
        id="create-tenant-form"
        onSubmit={handleSubmit}
      >
        <div className="box-modal-section">
          <div className="box-modal-section-header">
            <div className="box-modal-section-icon">
              <Building2 size={17} />
            </div>

            <div className="box-modal-section-header-content">
              <h3>Business Information</h3>

              <p>
                Enter organization business details
              </p>
            </div>
          </div>

          <div className="box-modal-form-grid">
            <Input
              label="Business Name"
              name="businessName"
              value={formData.businessName}
              onChange={handleChange}
              placeholder="Enter business name"
              required
            />

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
                  value: "Service Provider",
                  label: "Service Provider",
                },
              ]}
            />

            <Input
              label="Phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter phone number"
            />

            <Input
              label="Business Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="business@example.com"
              autoComplete="off"
            />

            <Input
              label="GST Number"
              name="gstNo"
              value={formData.gstNo}
              onChange={handleChange}
              placeholder="Enter GST number"
            />

            <Input
              label="PAN Number"
              name="panNo"
              value={formData.panNo}
              onChange={handleChange}
              placeholder="Enter PAN number"
            />

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
        </div>

        <div className="box-modal-section">
          <div className="box-modal-section-header">
            <div className="box-modal-section-icon">
              <CheckCircle2 size={17} />
            </div>

            <div className="box-modal-section-header-content">
              <h3>Subscription</h3>

              <p>
                Select a subscription plan and end date
              </p>
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

            <Input
              label="Subscription End Date"
              name="subscriptionEnd"
              type="date"
              value={formData.subscriptionEnd}
              onChange={handleChange}
              min={getMinimumSubscriptionDate()}
              required
            />
          </div>
        </div>

        <div className="box-modal-section">
          <div className="box-modal-section-header">
            <div className="box-modal-section-icon">
              <UserRound size={17} />
            </div>

            <div className="box-modal-section-header-content">
              <h3>Administrator Account</h3>

              <p>
                Create the tenant administrator login
              </p>
            </div>
          </div>

          <div className="box-modal-form-grid">
            <Input
              label="Admin Name"
              name="adminName"
              value={formData.adminName}
              onChange={handleChange}
              placeholder="Enter admin name"
              required
            />

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