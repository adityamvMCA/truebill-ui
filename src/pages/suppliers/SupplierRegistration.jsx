import { useEffect, useRef, useState } from "react";
import { Building2, CreditCard, FileText, MapPin } from "lucide-react";
import toast from "react-hot-toast";

import Button from "../../components/common/Form/Button";
import Input from "../../components/common/Form/Input";
import Select from "../../components/common/Form/Select";
import Textarea from "../../components/common/Form/Textarea";
import BoxModal from "../../components/common/Modal/BoxModal";
import supplierApi from "../../services/modules/supplierApi";

const initialFormData = {
  supplierName: "",
  supplierType: "Business",
  contactPerson: "",
  phone: "",
  alternatePhone: "",
  email: "",
  gstNo: "",
  panNo: "",
  billingAddress: "",
  shippingAddress: "",
  city: "",
  state: "Karnataka",
  pincode: "",
  country: "India",
  paymentTerms: "Due on Receipt",
  creditLimit: "",
  creditDays: "",
  openingBalance: "",
  openingBalanceType: "CREDIT",
  status: "Active",
  notes: "",
};

const supplierTypeOptions = [
  { value: "Business", label: "Business" },
  { value: "Individual", label: "Individual" },
];

const stateOptions = [
  { value: "Karnataka", label: "Karnataka" },
  { value: "Maharashtra", label: "Maharashtra" },
  { value: "Goa", label: "Goa" },
  { value: "Telangana", label: "Telangana" },
  { value: "Tamil Nadu", label: "Tamil Nadu" },
  { value: "Andhra Pradesh", label: "Andhra Pradesh" },
  { value: "Kerala", label: "Kerala" },
  { value: "Gujarat", label: "Gujarat" },
  { value: "Delhi", label: "Delhi" },
];

const paymentTermsOptions = [
  { value: "Due on Receipt", label: "Due on Receipt" },
  { value: "Cash", label: "Cash" },
  { value: "15 Days", label: "15 Days" },
  { value: "30 Days", label: "30 Days" },
  { value: "45 Days", label: "45 Days" },
  { value: "60 Days", label: "60 Days" },
  { value: "90 Days", label: "90 Days" },
];

const openingBalanceTypeOptions = [
  { value: "CREDIT", label: "Credit - We owe supplier" },
  { value: "DEBIT", label: "Debit - Supplier owes us" },
];

const statusOptions = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
];

function SupplierRegistration({
  isOpen,
  onClose,
  onSave,
  editData = null,
}) {
  const [formData, setFormData] = useState(initialFormData);
  const [saving, setSaving] = useState(false);
  const saveLockRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (editData) {
      setFormData({
        ...initialFormData,
        supplierName: editData.supplierName || "",
        supplierType: editData.supplierType || "Business",
        contactPerson: editData.contactPerson || "",
        phone: editData.phone || "",
        alternatePhone: editData.alternatePhone || "",
        email: editData.email || "",
        gstNo: editData.gstNo || "",
        panNo: editData.panNo || "",
        billingAddress: editData.billingAddress || "",
        shippingAddress: editData.shippingAddress || "",
        city: editData.city || "",
        state: editData.state || "Karnataka",
        pincode: editData.pincode || "",
        country: editData.country || "India",
        paymentTerms: editData.paymentTerms || "Due on Receipt",
        creditLimit: editData.creditLimit?.toString() || "",
        creditDays: editData.creditDays?.toString() || "",
        openingBalance: editData.openingBalance?.toString() || "",
        openingBalanceType: editData.openingBalanceType || "CREDIT",
        status: editData.status || "Active",
        notes: editData.notes || "",
      });
      return;
    }

    setFormData(initialFormData);
  }, [editData, isOpen]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    let updatedValue = value;

    if (name === "gstNo" || name === "panNo") {
      updatedValue = value.toUpperCase();
    }

    setFormData((previous) => ({
      ...previous,
      [name]: updatedValue,
    }));
  };

  const getErrorMessage = (error) => {
    const responseData = error?.response?.data;

    const nestedError =
      responseData?.error && typeof responseData.error === "object"
        ? responseData.error
        : null;

    const rawMessage =
      (typeof responseData?.message === "string" &&
        responseData.message) ||
      (typeof responseData?.error === "string" &&
        responseData.error) ||
      nestedError?.message ||
      error?.message ||
      "";

    const code =
      responseData?.code ?? nestedError?.code ?? error?.code;

    const isDuplicate =
      Number(code) === 11000 ||
      /E11000|duplicate key/i.test(rawMessage);

    if (isDuplicate) {
      const keyValue =
        responseData?.keyValue ??
        nestedError?.keyValue ??
        error?.keyValue ??
        {};

      const keyPattern =
        responseData?.keyPattern ??
        nestedError?.keyPattern ??
        error?.keyPattern ??
        {};

      const field =
        Object.keys(keyValue)[0] ||
        Object.keys(keyPattern)[0] ||
        responseData?.field ||
        "";

      const fieldLabels = {
        supplierName: "Supplier name",
        supplierCode: "Supplier code",
        phone: "Phone number",
        alternatePhone: "Alternate phone number",
        email: "Email address",
        gstNo: "GST number",
        panNo: "PAN number",
      };

      if (field) {
        const label = fieldLabels[field] || field;
        const value = keyValue[field];

        if (value === null || value === "") {
          return `${label} is blank, but the database is treating it as unique. Please check the supplier database index.`;
        }

        return `${label} already exists. Please use a different value or edit the existing supplier.`;
      }

      return "A supplier with the same unique details already exists. Check supplier code, phone, email, GST, or PAN.";
    }

    if (
      Array.isArray(responseData?.errors) &&
      responseData.errors.length > 0
    ) {
      return responseData.errors
        .map((item) =>
          typeof item === "string"
            ? item
            : item?.message ||
              item?.msg ||
              "Invalid supplier information",
        )
        .join(", ");
    }

    return rawMessage || "Unable to save supplier. Please try again.";
  };

  const validateForm = () => {
    if (!formData.supplierName.trim()) {
      toast.error("Supplier name is required");
      return false;
    }

    if (
      formData.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        formData.email.trim(),
      )
    ) {
      toast.error("Enter a valid email address");
      return false;
    }

    if (
      formData.gstNo.trim() &&
      formData.gstNo.trim().length !== 15
    ) {
      toast.error("GST number must contain 15 characters");
      return false;
    }

    if (
      formData.panNo.trim() &&
      formData.panNo.trim().length !== 10
    ) {
      toast.error("PAN number must contain 10 characters");
      return false;
    }

    if (
      formData.pincode.trim() &&
      !/^\d{6}$/.test(formData.pincode.trim())
    ) {
      toast.error("Pincode must contain 6 digits");
      return false;
    }

    if (Number(formData.creditLimit || 0) < 0) {
      toast.error("Credit limit cannot be negative");
      return false;
    }

    if (Number(formData.creditDays || 0) < 0) {
      toast.error("Credit days cannot be negative");
      return false;
    }

    if (Number(formData.openingBalance || 0) < 0) {
      toast.error("Opening balance cannot be negative");
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (saveLockRef.current || saving) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    saveLockRef.current = true;
    setSaving(true);

    let savedSupplier;

    try {
      const payload = {
        supplierName: formData.supplierName.trim(),
        supplierType: formData.supplierType,
        contactPerson: formData.contactPerson.trim() || null,
        phone: formData.phone.trim() || null,
        alternatePhone: formData.alternatePhone.trim() || null,
        email: formData.email.trim().toLowerCase() || null,
        gstNo: formData.gstNo.trim().toUpperCase() || null,
        panNo: formData.panNo.trim().toUpperCase() || null,
        billingAddress: formData.billingAddress.trim() || null,
        shippingAddress: formData.shippingAddress.trim() || null,
        city: formData.city.trim() || null,
        state: formData.state.trim() || null,
        pincode: formData.pincode.trim() || null,
        country: formData.country.trim() || "India",
        paymentTerms:
          formData.paymentTerms.trim() || "Due on Receipt",
        creditLimit: Number(formData.creditLimit || 0),
        creditDays: Number(formData.creditDays || 0),
        openingBalance: Number(formData.openingBalance || 0),
        openingBalanceType: formData.openingBalanceType,
        status: formData.status,
        notes: formData.notes.trim() || null,
      };

      const response = editData?.supplierCode
        ? await supplierApi.update(
            editData.supplierCode,
            payload,
          )
        : await supplierApi.create(payload);

      savedSupplier =
        response?.data?.supplier ||
        response?.data?.data ||
        response?.data;

      // Correct syntax: no backslash before _id.
      if (!savedSupplier?._id) {
        throw new Error(
          "The server did not return the saved supplier. Check the supplier list before trying again.",
        );
      }
    } catch (error) {
      console.error("Unable to save supplier:", {
        status: error?.response?.status,
        response: error?.response?.data,
        message: error?.message,
      });

      toast.error(getErrorMessage(error), {
        id: "supplier-save-result",
      });

      return;
    } finally {
      saveLockRef.current = false;
      setSaving(false);
    }

    toast.success(
      editData
        ? "Supplier updated successfully"
        : "Supplier registered successfully",
      {
        id: "supplier-save-result",
      },
    );

    // A parent callback failure must not be reported as an API save failure.
    try {
      await onSave?.(savedSupplier);
    } catch (callbackError) {
      console.error(
        "Supplier saved, but onSave failed:",
        callbackError,
      );

      toast.error(
        "Supplier was saved, but the page could not refresh. Reload the supplier list; do not save again.",
        {
          id: "supplier-refresh-error",
        },
      );
    }

    try {
      onClose?.();
    } catch (closeError) {
      console.error(
        "Supplier saved, but closing the modal failed:",
        closeError,
      );
    }
  };

  const footer = (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={onClose}
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
            : editData
              ? "Update Supplier"
              : "Save Supplier"}
        </Button>
      </div>
    </>
  );

  return (
    <BoxModal
      show={isOpen}
      onClose={onClose}
      title={
        editData ? "Edit Supplier" : "Supplier Registration"
      }
      subtitle={
        editData
          ? "Update supplier information"
          : "Create a supplier under Sundry Creditors"
      }
      width="1100px"
      footer={footer}
    >
      {/* SUPPLIER INFORMATION */}
      <div className="box-modal-section">
        <div className="box-modal-section-header">
          <div className="box-modal-section-icon">
            <Building2 size={17} />
          </div>

          <div className="box-modal-section-header-content">
            <h3>Supplier Information</h3>
            <p>Basic supplier and contact details</p>
          </div>
        </div>

        <div className="box-modal-form-grid">
          <Input
            label="Supplier Name"
            name="supplierName"
            value={formData.supplierName}
            onChange={handleChange}
            placeholder="Enter supplier or business name"
            required
            disabled={saving}
          />

          <Select
            label="Supplier Type"
            name="supplierType"
            value={formData.supplierType}
            onChange={handleChange}
            options={supplierTypeOptions}
            disabled={saving}
          />

          <Input
            label="Contact Person"
            name="contactPerson"
            value={formData.contactPerson}
            onChange={handleChange}
            placeholder="Enter contact person"
            disabled={saving}
          />

          <Input
            label="Phone"
            name="phone"
            type="tel"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Enter phone number"
            disabled={saving}
          />

          <Input
            label="Alternate Phone"
            name="alternatePhone"
            type="tel"
            value={formData.alternatePhone}
            onChange={handleChange}
            placeholder="Enter alternate number"
            disabled={saving}
          />

          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="supplier@example.com"
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

      {/* TAX INFORMATION */}
      <div className="box-modal-section">
        <div className="box-modal-section-header">
          <div className="box-modal-section-icon">
            <CreditCard size={17} />
          </div>

          <div className="box-modal-section-header-content">
            <h3>Tax Information</h3>
            <p>GST and PAN registration information</p>
          </div>
        </div>

        <div className="box-modal-form-grid">
          <Input
            label="GST Number"
            name="gstNo"
            value={formData.gstNo}
            onChange={handleChange}
            placeholder="29XXXXXXXXXXXXXX"
            maxLength={15}
            disabled={saving}
          />

          <Input
            label="PAN Number"
            name="panNo"
            value={formData.panNo}
            onChange={handleChange}
            placeholder="ABCDE1234F"
            maxLength={10}
            disabled={saving}
          />
        </div>
      </div>

      {/* ADDRESS DETAILS */}
      <div className="box-modal-section">
        <div className="box-modal-section-header">
          <div className="box-modal-section-icon">
            <MapPin size={17} />
          </div>

          <div className="box-modal-section-header-content">
            <h3>Address Details</h3>
            <p>Billing and shipping information</p>
          </div>
        </div>

        <div className="box-modal-form-grid">
          <div className="box-modal-form-full">
            <Textarea
              label="Billing Address"
              name="billingAddress"
              value={formData.billingAddress}
              onChange={handleChange}
              placeholder="Enter billing address"
              rows={3}
              disabled={saving}
            />
          </div>

          <div className="box-modal-form-full">
            <Textarea
              label="Shipping Address"
              name="shippingAddress"
              value={formData.shippingAddress}
              onChange={handleChange}
              placeholder="Enter shipping address"
              rows={3}
              disabled={saving}
            />
          </div>

          <Input
            label="City"
            name="city"
            value={formData.city}
            onChange={handleChange}
            placeholder="Enter city"
            disabled={saving}
          />

          <Select
            label="State"
            name="state"
            value={formData.state}
            onChange={handleChange}
            options={stateOptions}
            disabled={saving}
          />

          <Input
            label="Pincode"
            name="pincode"
            value={formData.pincode}
            onChange={handleChange}
            placeholder="587101"
            maxLength={6}
            disabled={saving}
          />

          <Input
            label="Country"
            name="country"
            value={formData.country}
            onChange={handleChange}
            placeholder="India"
            disabled={saving}
          />
        </div>
      </div>

      {/* FINANCIAL INFORMATION */}
      <div className="box-modal-section">
        <div className="box-modal-section-header">
          <div className="box-modal-section-icon">
            <CreditCard size={17} />
          </div>

          <div className="box-modal-section-header-content">
            <h3>Financial Information</h3>
            <p>Credit terms and opening payable balance</p>
          </div>
        </div>

        <div className="box-modal-form-grid">
          <Select
            label="Payment Terms"
            name="paymentTerms"
            value={formData.paymentTerms}
            onChange={handleChange}
            options={paymentTermsOptions}
            disabled={saving}
          />

          <Input
            label="Credit Limit"
            name="creditLimit"
            type="number"
            min="0"
            step="0.01"
            value={formData.creditLimit}
            onChange={handleChange}
            placeholder="0.00"
            disabled={saving}
          />

          <Input
            label="Credit Days"
            name="creditDays"
            type="number"
            min="0"
            step="1"
            value={formData.creditDays}
            onChange={handleChange}
            placeholder="0"
            disabled={saving}
          />

          <Input
            label="Opening Balance"
            name="openingBalance"
            type="number"
            min="0"
            step="0.01"
            value={formData.openingBalance}
            onChange={handleChange}
            placeholder="0.00"
            disabled={saving}
          />

          <Select
            label="Opening Balance Type"
            name="openingBalanceType"
            value={formData.openingBalanceType}
            onChange={handleChange}
            options={openingBalanceTypeOptions}
            disabled={saving}
          />
        </div>
      </div>

      {/* NOTES */}
      <div className="box-modal-section">
        <div className="box-modal-section-header">
          <div className="box-modal-section-icon">
            <FileText size={17} />
          </div>

          <div className="box-modal-section-header-content">
            <h3>Additional Information</h3>
            <p>Notes and special instructions</p>
          </div>
        </div>

        <div className="box-modal-form-grid">
          <div className="box-modal-form-full">
            <Textarea
              label="Notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Enter notes..."
              rows={4}
              maxLength={500}
              disabled={saving}
            />
          </div>
        </div>
      </div>
    </BoxModal>
  );
}

export default SupplierRegistration;