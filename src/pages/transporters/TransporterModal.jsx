import { useEffect, useRef, useState } from "react";
import { FileText, MapPin, Truck } from "lucide-react";
import toast from "react-hot-toast";

import Button from "../../components/common/Form/Button";
import Input from "../../components/common/Form/Input";
import Select from "../../components/common/Form/Select";
import Textarea from "../../components/common/Form/Textarea";
import BoxModal from "../../components/common/Modal/BoxModal";

import transporterApi from "../../services/modules/transporterApi";

const initialFormData = {
  transporterName: "",
  transporterId: "",
  transportMode: "ROAD",
  vehicleNumber: "",
  vehicleType: "REGULAR",
  distanceKm: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  status: "ACTIVE",
  notes: "",
};

const transportModeOptions = [
  { value: "ROAD", label: "Road" },
  { value: "RAIL", label: "Rail" },
  { value: "AIR", label: "Air" },
  { value: "SHIP", label: "Ship" },
];

const vehicleTypeOptions = [
  { value: "REGULAR", label: "Regular" },
  { value: "ODC", label: "Over Dimensional Cargo (ODC)" },
];

const statusOptions = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

export default function TransporterModal({
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
        transporterName: editData.transporterName || editData.name || "",
        transporterId: editData.transporterId || editData.gstin || "",
        transportMode: editData.transportMode || "ROAD",
        vehicleNumber: editData.vehicleNumber || "",
        vehicleType: editData.vehicleType || "REGULAR",
        distanceKm:
          editData.distanceKm !== undefined && editData.distanceKm !== null
            ? String(editData.distanceKm)
            : "",
        phone: editData.phone || "",
        email: editData.email || "",
        address: editData.address || "",
        city: editData.city || "",
        state: editData.state || "",
        pincode: editData.pincode || "",
        status: editData.status || "ACTIVE",
        notes: editData.notes || "",
      });
    } else {
      setFormData({ ...initialFormData });
    }
  }, [isOpen, editData]);

  const handleClose = () => {
    if (!saveLock.current) onClose?.();
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]:
        ["transporterId", "vehicleNumber"].includes(name)
          ? value.toUpperCase()
          : value,
    }));
  };

  const validateForm = () => {
    if (!formData.transporterName.trim()) {
      toast.error("Transporter name is required");
      return false;
    }

    if (!formData.transporterId.trim()) {
      toast.error("Transporter ID / GSTIN / TRANSIN is required");
      return false;
    }

    if (formData.phone && !/^[0-9+\s-]{7,20}$/.test(formData.phone.trim())) {
      toast.error("Enter a valid phone number");
      return false;
    }

    if (
      formData.email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())
    ) {
      toast.error("Enter a valid email address");
      return false;
    }

    if (formData.distanceKm) {
      const distance = Number(formData.distanceKm);
      if (!Number.isFinite(distance) || distance < 0 || distance > 4000) {
        toast.error("Distance must be between 0 and 4000 km");
        return false;
      }
    }

    return true;
  };

  const handleSave = async (event) => {
    event?.preventDefault?.();

    if (saveLock.current || !validateForm()) return;

    saveLock.current = true;
    setSaving(true);

    try {
      const payload = {
        transporterName: formData.transporterName.trim(),
        transporterId: formData.transporterId.trim().toUpperCase(),
        transportMode: formData.transportMode,
        vehicleNumber: formData.vehicleNumber.trim().toUpperCase() || null,
        vehicleType: formData.vehicleType,
        distanceKm: formData.distanceKm ? Number(formData.distanceKm) : 0,
        phone: formData.phone.trim() || null,
        email: formData.email.trim().toLowerCase() || null,
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        state: formData.state.trim() || null,
        pincode: formData.pincode.trim() || null,
        status: formData.status,
        notes: formData.notes.trim() || null,
      };

      let result;
      if (isEdit) {
        result = await transporterApi.update(editData._id, payload);
        toast.success("Transporter updated successfully");
      } else {
        result = await transporterApi.create(payload);
        toast.success("Transporter created successfully");
      }

      onSave?.(result?.data?.transporter || result?.data);
      onClose?.();
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to save transporter";
      toast.error(msg);
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };

  const footer = (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={handleClose}
        disabled={saving}
      >
        Cancel
      </Button>

      <div className="box-modal-footer-actions">
        <Button
          type="button"
          variant="primary"
          onClick={handleSave}
          loading={saving}
          disabled={saving}
        >
          {saving
            ? "Saving..."
            : isEdit
              ? "Update Transporter"
              : "Save Transporter"}
        </Button>
      </div>
    </>
  );

  return (
    <BoxModal
      show={isOpen}
      onClose={handleClose}
      title={isEdit ? "Edit Transporter" : "New Transporter"}
      subtitle={
        isEdit
          ? "Update transporter and vehicle details"
          : "Register a transporter or logistics partner for e-way bill & dispatch"
      }
      width="960px"
      footer={footer}
    >
      {/* SECTION 1: Transporter Info */}
      <div className="box-modal-section">
        <div className="box-modal-section-header">
          <div className="box-modal-section-icon">
            <Truck size={17} />
          </div>

          <div className="box-modal-section-header-content">
            <h3>Transporter Information</h3>
            <p>Identity, mode, and operating status</p>
          </div>
        </div>

        <div className="box-modal-form-grid">
          <Input
            label="Transporter Name"
            name="transporterName"
            value={formData.transporterName}
            onChange={handleChange}
            placeholder="e.g. VRL Logistics / TCI Express"
            maxLength={200}
            required
            disabled={saving}
          />

          <Input
            label="Transporter ID / GSTIN / TRANSIN"
            name="transporterId"
            value={formData.transporterId}
            onChange={handleChange}
            placeholder="e.g. 29ABCDE1234F1Z5 or TRANSIN"
            maxLength={50}
            required
            disabled={saving}
          />

          <Select
            label="Default Transport Mode"
            name="transportMode"
            value={formData.transportMode}
            onChange={handleChange}
            options={transportModeOptions}
            disabled={saving}
          />

          <Select
            label="Status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            options={statusOptions}
            disabled={saving}
          />
        </div>
      </div>

      {/* SECTION 2: Vehicle Details */}
      <div className="box-modal-section">
        <div className="box-modal-section-header">
          <div className="box-modal-section-icon">
            <Truck size={17} />
          </div>

          <div className="box-modal-section-header-content">
            <h3>Vehicle Details</h3>
            <p>Vehicle registration and classification for e-way bill</p>
          </div>
        </div>

        <div className="box-modal-form-grid">
          <Input
            label="Vehicle Number"
            name="vehicleNumber"
            value={formData.vehicleNumber}
            onChange={handleChange}
            placeholder="e.g. KA01AB1234 / MH12DE5678"
            maxLength={30}
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
            label="Default Distance (km)"
            name="distanceKm"
            type="number"
            min="0"
            max="4000"
            value={formData.distanceKm}
            onChange={handleChange}
            placeholder="e.g. 150"
            disabled={saving}
          />
        </div>
      </div>

      {/* SECTION 3: Contact & Address */}
      <div className="box-modal-section">
        <div className="box-modal-section-header">
          <div className="box-modal-section-icon">
            <MapPin size={17} />
          </div>

          <div className="box-modal-section-header-content">
            <h3>Contact & Location</h3>
            <p>Phone, address, city, and pincode</p>
          </div>
        </div>

        <div className="box-modal-form-grid">
          <Input
            label="Phone / Mobile"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="e.g. 9876543210"
            maxLength={20}
            disabled={saving}
          />

          <Input
            label="Email Address"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="e.g. dispatch@transporter.com"
            maxLength={100}
            disabled={saving}
          />

          <Input
            label="Address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Street address or depot"
            maxLength={500}
            disabled={saving}
          />

          <Input
            label="City"
            name="city"
            value={formData.city}
            onChange={handleChange}
            placeholder="e.g. Bengaluru"
            maxLength={100}
            disabled={saving}
          />

          <Input
            label="State"
            name="state"
            value={formData.state}
            onChange={handleChange}
            placeholder="e.g. Karnataka"
            maxLength={100}
            disabled={saving}
          />

          <Input
            label="Pincode"
            name="pincode"
            value={formData.pincode}
            onChange={handleChange}
            placeholder="e.g. 560001"
            maxLength={10}
            disabled={saving}
          />
        </div>
      </div>

      {/* SECTION 4: Notes */}
      <div className="box-modal-section">
        <div className="box-modal-section-header">
          <div className="box-modal-section-icon">
            <FileText size={17} />
          </div>

          <div className="box-modal-section-header-content">
            <h3>Notes</h3>
            <p>Internal instructions or terms with this transporter</p>
          </div>
        </div>

        <div className="box-modal-form-grid">
          <div className="box-modal-form-full">
            <Textarea
              label="Notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="e.g. Contact driver directly before loading..."
              maxLength={1000}
              rows={3}
              disabled={saving}
            />
          </div>
        </div>
      </div>
    </BoxModal>
  );
}
