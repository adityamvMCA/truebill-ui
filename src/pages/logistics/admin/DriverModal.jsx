import { useEffect, useRef, useState } from "react";
import { User, Phone, Truck, Shield, Key } from "lucide-react";
import toast from "react-hot-toast";

import Button from "../../../components/common/Form/Button";
import Input from "../../../components/common/Form/Input";
import Select from "../../../components/common/Form/Select";
import BoxModal from "../../../components/common/Modal/BoxModal";
import logisticsApi from "../../../services/modules/logisticsApi";

const initialFormData = {
  name: "",
  phone: "",
  email: "",
  password: "",
  vehicleNumber: "",
  vehicleType: "VAN",
  licenseNumber: "",
  status: "AVAILABLE",
};

const vehicleTypeOptions = [
  { value: "TRUCK", label: "Truck / Heavy Carrier" },
  { value: "VAN", label: "Van / Mini-Truck" },
  { value: "TEMPO", label: "Tempo / Pick-up" },
  { value: "THREE_WHEELER", label: "3-Wheeler Auto Cargo" },
  { value: "BIKE", label: "Two Wheeler / Scooter" },
];

const statusOptions = [
  { value: "AVAILABLE", label: "Available (Ready for Dispatch)" },
  { value: "ON_TRIP", label: "On Trip (Active Dispatch)" },
  { value: "OFF_DUTY", label: "Off Duty" },
  { value: "INACTIVE", label: "Inactive / Suspended" },
];

export default function DriverModal({
  isOpen,
  onClose,
  onSave,
  editData = null,
}) {
  const [formData, setFormData] = useState(initialFormData);
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const isEdit = Boolean(editData?._id);

  useEffect(() => {
    if (!isOpen) return;

    if (editData) {
      setFormData({
        name: editData.name || "",
        phone: editData.phone || "",
        email: editData.email || "",
        password: "",
        vehicleNumber: editData.vehicleNumber || "",
        vehicleType: editData.vehicleType || "VAN",
        licenseNumber: editData.licenseNumber || "",
        status: editData.status || "AVAILABLE",
      });
    } else {
      setFormData({ ...initialFormData });
    }
  }, [isOpen, editData]);

  const handleClose = () => {
    if (!saveLock.current) onClose?.();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: ["vehicleNumber", "licenseNumber"].includes(name)
        ? value.toUpperCase()
        : value,
    }));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (saveLock.current || saving) return;

    if (!formData.name.trim()) {
      toast.error("Please enter driver name");
      return;
    }
    if (!formData.phone.trim()) {
      toast.error("Please enter driver phone number");
      return;
    }
    if (!isEdit && !formData.password.trim()) {
      toast.error("Please set a login password for the driver");
      return;
    }

    try {
      saveLock.current = true;
      setSaving(true);

      const payload = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        vehicleNumber: formData.vehicleNumber.trim().toUpperCase(),
        vehicleType: formData.vehicleType,
        licenseNumber: formData.licenseNumber.trim().toUpperCase(),
        status: formData.status,
        ...(formData.password.trim() ? { password: formData.password.trim() } : {}),
      };

      if (isEdit) {
        await logisticsApi.updateDriver(editData._id, payload);
        toast.success("Driver updated successfully");
      } else {
        await logisticsApi.createDriver(payload);
        toast.success("Driver registered successfully");
      }

      onSave?.();
      onClose?.();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to save driver details");
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };

  const footer = (
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
        type="button"
        variant="primary"
        onClick={handleSubmit}
        loading={saving}
        disabled={saving}
      >
        {saving ? "Saving..." : isEdit ? "Update Driver" : "Register Driver"}
      </Button>
    </div>
  );

  return (
    <BoxModal
      show={isOpen}
      onClose={handleClose}
      title={isEdit ? "Edit Fleet Driver" : "Register Fleet Driver"}
      subtitle={
        isEdit
          ? "Update driver details, vehicle assignment, or reset password"
          : "Add a new driver to your fleet with mobile GPS portal access"
      }
      width="780px"
      footer={footer}
    >
      {/* SECTION 1: Personal & Login */}
      <div className="box-modal-section">
        <div className="box-modal-section-header">
          <div className="box-modal-section-icon">
            <User size={17} />
          </div>
          <div className="box-modal-section-header-content">
            <h3>Driver Identity & Login Credentials</h3>
            <p>Name and phone used by driver to log in to Driver Portal</p>
          </div>
        </div>

        <div className="box-modal-form-grid">
          <Input
            label="Driver Full Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g. Ramesh Kumar"
            required
            disabled={saving}
          />

          <Input
            label="Phone Number (Login Username)"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            placeholder="e.g. 9876543210"
            required
            disabled={saving}
          />

          <Input
            label={isEdit ? "New Password (Leave blank to keep)" : "Login Password"}
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder={isEdit ? "Enter only to change" : "Password for driver app"}
            required={!isEdit}
            disabled={saving}
          />

          <Input
            label="Email Address (Optional)"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="driver@company.com"
            disabled={saving}
          />
        </div>
      </div>

      {/* SECTION 2: Vehicle & Operations */}
      <div className="box-modal-section">
        <div className="box-modal-section-header">
          <div className="box-modal-section-icon">
            <Truck size={17} />
          </div>
          <div className="box-modal-section-header-content">
            <h3>Assigned Vehicle & Fleet Status</h3>
            <p>Vehicle number plate, type, and current availability</p>
          </div>
        </div>

        <div className="box-modal-form-grid">
          <Input
            label="Assigned Vehicle Number"
            name="vehicleNumber"
            value={formData.vehicleNumber}
            onChange={handleChange}
            placeholder="e.g. MH12AB1234 / KA01C9999"
            disabled={saving}
          />

          <Select
            label="Vehicle Type"
            name="vehicleType"
            value={formData.vehicleType}
            onChange={handleChange}
            options={vehicleTypeOptions}
            disabled={saving}
          />

          <Input
            label="Driving License Number"
            name="licenseNumber"
            value={formData.licenseNumber}
            onChange={handleChange}
            placeholder="e.g. DL-1420110012345"
            disabled={saving}
          />

          <Select
            label="Operational Status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            options={statusOptions}
            disabled={saving}
          />
        </div>
      </div>
    </BoxModal>
  );
}
