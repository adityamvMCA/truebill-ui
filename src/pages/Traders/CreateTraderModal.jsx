import { useRef, useState } from "react";
import { Building2, CheckCircle2, UserRound, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

import BoxModal from "../../components/common/Modal/BoxModal";
import Input from "../../components/common/Form/Input";
import Select from "../../components/common/Form/Select";
import Textarea from "../../components/common/Form/Textarea";
import Button from "../../components/common/Form/Button";
import tenantProvisioningApi from "../../services/modules/tenantProvisioningApi";
import "./CreateTraderModal.css";

const getMinimumSubscriptionDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return [
    tomorrow.getFullYear(),
    String(tomorrow.getMonth() + 1).padStart(2, "0"),
    String(tomorrow.getDate()).padStart(2, "0"),
  ].join("-");
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
  subscriptionPlan: "basic",
  subscriptionEnd: "",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
};

const subscriptionOptions = [
  { value: "trial", label: "Trial" },
  { value: "basic", label: "Basic" },
  { value: "standard", label: "Standard" },
  { value: "premium", label: "Premium" },
];

const businessTypeOptions = [
  "Trader", "Distributor", "Wholesaler", "Retailer", "Manufacturer", "Service Provider",
].map((value) => ({ value, label: value }));

const emailIsValid = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const getErrorMessage = (error) => {
  const body = error?.response?.data;
  if (Array.isArray(body?.errors) && body.errors.length) {
    return body.errors.map((item) => typeof item === "string" ? item : item?.message || item?.msg || "Validation failed").join(", ");
  }
  return body?.message || error?.message || "Failed to create trader";
};

function CreateTraderModal({ show, onClose, onSuccess }) {
  const [formData, setFormData] = useState({ ...initialForm });
  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const submitLockRef = useRef(false);
  const busy = saving || finishing;

  const handleChange = (event) => {
    if (busy || uncertain || submitLockRef.current) return;
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
    setSubmitError("");
  };

  const handleClose = () => {
    if (busy || submitLockRef.current) return;
    if (uncertain) {
      setFormData((previous) => ({ ...previous, adminPassword: "" }));
    } else {
      setFormData({ ...initialForm });
      setSubmitError("");
    }
    onClose?.();
  };

  const validate = () => {
    if (!formData.businessName.trim()) return "Please enter business name";
    if (formData.businessName.trim().length > 200) return "Business name cannot exceed 200 characters";
    if (!formData.adminName.trim()) return "Please enter admin name";
    if (!emailIsValid(formData.adminEmail.trim())) return "Please enter a valid admin email";
    if (formData.email.trim() && !emailIsValid(formData.email.trim())) return "Please enter a valid business email";
    if (!formData.adminPassword.trim()) return "Please enter admin password";
    if (formData.adminPassword.length < 6) return "Admin password must be at least 6 characters";
    if (new TextEncoder().encode(formData.adminPassword).length > 72) return "Admin password must not exceed 72 UTF-8 bytes";
    if (!subscriptionOptions.some((item) => item.value === formData.subscriptionPlan)) return "Please select a subscription plan";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.subscriptionEnd)) return "Please select subscription end date";
    const calendar = new Date(`${formData.subscriptionEnd}T00:00:00.000Z`);
    if (Number.isNaN(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== formData.subscriptionEnd) return "Invalid subscription end date";
    const end = new Date(`${formData.subscriptionEnd}T23:59:59.999+05:30`);
    if (end <= new Date()) return "Subscription end date must be in the future";
    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (busy || uncertain || submitLockRef.current) return;
    const validationError = validate();
    if (validationError) {
      setSubmitError(validationError);
      toast.error(validationError, { id: "create-tenant-validation" });
      return;
    }
    const payload = {
      businessName: formData.businessName.trim(),
      businessType: formData.businessType,
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim(),
      gstNo: formData.gstNo.trim().toUpperCase(),
      panNo: formData.panNo.trim().toUpperCase(),
      address: formData.address.trim(),
      city: formData.city.trim(),
      state: formData.state.trim(),
      pincode: formData.pincode.trim(),
      subscriptionPlan: formData.subscriptionPlan.trim().toLowerCase(),
      subscriptionEnd: formData.subscriptionEnd,
      adminName: formData.adminName.trim(),
      adminEmail: formData.adminEmail.trim().toLowerCase(),
      adminPassword: formData.adminPassword,
    };
    submitLockRef.current = true;
    setSaving(true);
    setSubmitError("");
    const toastId = toast.loading("Creating tenant and setting up its database. Please wait…", { id: "create-tenant" });
    let confirmedTenant = null;
    try {
      const response = await tenantProvisioningApi.create(payload);
      const result = response?.data;
      if (result?.success !== true || !result?.tenant?._id || result.tenant.provisioningStatus !== "READY") {
        const error = new Error(result?.message || "The server did not confirm that tenant setup is ready.");
        error.uncertainResult = true;
        throw error;
      }
      confirmedTenant = result.tenant;
      setFinishing(true);
      toast.success(`${confirmedTenant.businessName} created successfully`, { id: toastId, duration: 5000 });
    } catch (error) {
      const status = error?.response?.status;
      const body = error?.response?.data;
      const unknownResult = error?.uncertainResult || !status || status === 408 || status >= 500 || body?.code === "TENANT_PROVISIONING_INCOMPLETE";
      let message;
      if (unknownResult) {
        setUncertain(true);
        setFormData((previous) => ({ ...previous, adminPassword: "" }));
        message = "The final result is not confirmed. The tenant may already exist or still be provisioning. Close this form and refresh the tenant list before creating it again.";
        if (body?.tenantId) message += ` Tenant ID: ${body.tenantId}.`;
      } else {
        message = getErrorMessage(error);
      }
      setSubmitError(message);
      toast.error(message, { id: toastId, duration: unknownResult ? 10000 : 6000 });
    } finally {
      submitLockRef.current = false;
      setSaving(false);
    }
    if (!confirmedTenant) return;
    try {
      try {
        await onSuccess?.(confirmedTenant);
      } catch {
        toast.error("Tenant created successfully, but the list could not refresh. Refresh the tenant list manually.", { id: "tenant-list-refresh", duration: 7000 });
      }
      setFormData({ ...initialForm });
      setSubmitError("");
      setUncertain(false);
      onClose?.();
    } finally {
      setFinishing(false);
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
        <div className="box-modal-footer-actions create-trader-footer">
          <Button type="button" variant="secondary" onClick={handleClose} disabled={busy}>
            {uncertain ? "Close & Check Tenant List" : "Cancel"}
          </Button>
          <Button type="submit" form="create-tenant-form" variant="primary" disabled={busy || uncertain}>
            {saving ? "Creating & Setting Up..." : finishing ? "Refreshing List..." : uncertain ? "Verify Existing Request" : "Create Trader"}
          </Button>
        </div>
      }
    >
      <form id="create-tenant-form" onSubmit={handleSubmit}>
        {submitError && (
          <div className="create-trader-notice create-trader-notice--error" role="alert">
            <AlertCircle size={18} />
            <span>{submitError}</span>
          </div>
        )}
        {saving && (
          <div className="create-trader-notice" role="status">
            Creating the tenant database, indexes, ledgers, warehouse and default master records. Please wait; database setup can take longer than 30 seconds.
          </div>
        )}
        <fieldset className="create-trader-fieldset" disabled={busy || uncertain}>
          <div className="box-modal-section">
            <div className="box-modal-section-header">
              <div className="box-modal-section-icon"><Building2 size={17} /></div>
              <div className="box-modal-section-header-content">
                <h3>Business Information</h3><p>Enter organization business details</p>
              </div>
            </div>
            <div className="box-modal-form-grid">
              <Input label="Business Name" name="businessName" value={formData.businessName} onChange={handleChange} placeholder="Enter business name" maxLength={200} required />
              <Select label="Business Type" name="businessType" value={formData.businessType} onChange={handleChange} options={businessTypeOptions} />
              <Input label="Phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="Enter phone number" />
              <Input label="Business Email" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="business@example.com" autoComplete="off" />
              <Input label="GST Number" name="gstNo" value={formData.gstNo} onChange={handleChange} placeholder="Enter GST number" />
              <Input label="PAN Number" name="panNo" value={formData.panNo} onChange={handleChange} placeholder="Enter PAN number" />
              <div className="box-modal-form-full">
                <Textarea label="Address" name="address" value={formData.address} onChange={handleChange} placeholder="Enter business address" rows={2} />
              </div>
              <Input label="City" name="city" value={formData.city} onChange={handleChange} placeholder="Enter city" />
              <Input label="State" name="state" value={formData.state} onChange={handleChange} placeholder="Enter state" />
              <Input label="Pincode" name="pincode" value={formData.pincode} onChange={handleChange} placeholder="Enter pincode" maxLength={6} />
            </div>
          </div>
          <div className="box-modal-section">
            <div className="box-modal-section-header">
              <div className="box-modal-section-icon"><CheckCircle2 size={17} /></div>
              <div className="box-modal-section-header-content">
                <h3>Subscription</h3><p>Select a subscription plan and end date</p>
              </div>
            </div>
            <div className="box-modal-form-grid">
              <Select label="Subscription Plan" name="subscriptionPlan" value={formData.subscriptionPlan} onChange={handleChange} options={subscriptionOptions} required />
              <Input label="Subscription End Date" name="subscriptionEnd" type="date" value={formData.subscriptionEnd} onChange={handleChange} min={getMinimumSubscriptionDate()} required />
            </div>
          </div>
          <div className="box-modal-section">
            <div className="box-modal-section-header">
              <div className="box-modal-section-icon"><UserRound size={17} /></div>
              <div className="box-modal-section-header-content">
                <h3>Administrator Account</h3><p>Create the tenant administrator login</p>
              </div>
            </div>
            <div className="box-modal-form-grid">
              <Input label="Admin Name" name="adminName" value={formData.adminName} onChange={handleChange} placeholder="Enter admin name" required />
              <Input label="Admin Email" name="adminEmail" type="email" value={formData.adminEmail} onChange={handleChange} placeholder="admin@example.com" autoComplete="off" required />
              <Input label="Admin Password" name="adminPassword" type="password" value={formData.adminPassword} onChange={handleChange} placeholder="Minimum 6 characters" autoComplete="new-password" minLength={6} required />
            </div>
          </div>
        </fieldset>
      </form>
    </BoxModal>
  );
}

export default CreateTraderModal;
