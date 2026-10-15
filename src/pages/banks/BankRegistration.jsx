import { useEffect, useRef, useState } from "react";
import { Building2, CreditCard, FileText } from "lucide-react";
import toast from "react-hot-toast";

import Button from "../../components/common/Form/Button";
import Input from "../../components/common/Form/Input";
import Select from "../../components/common/Form/Select";
import Textarea from "../../components/common/Form/Textarea";
import BoxModal from "../../components/common/Modal/BoxModal";

import bankApi from "../../services/modules/bankApi";
import { extractBank, getBankError } from "./bankHelpers";

const initialFormData = {
  accountName: "",
  bankName: "",
  accountHolderName: "",
  accountNumber: "",
  confirmAccountNumber: "",
  accountType: "CURRENT",
  branchName: "",
  ifscCode: "",
  openingBalance: "",
  status: "ACTIVE",
  notes: "",
};

const accountTypeOptions = [
  { value: "CURRENT", label: "Current Account" },
  { value: "SAVINGS", label: "Savings Account" },
];

const statusOptions = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

export default function BankRegistration({
  isOpen,
  onClose,
  onSave,
  editData = null,
}) {
  const [formData, setFormData] = useState(initialFormData);
  const [saving, setSaving] = useState(false);

  const saveLock = useRef(false);
  const isEdit = Boolean(editData?.bankCode);

  useEffect(() => {
    if (!isOpen) return;

    setFormData(
      editData
        ? {
            ...initialFormData,
            accountName: editData.accountName || "",
            bankName: editData.bankName || "",
            accountHolderName: editData.accountHolderName || "",
            accountNumber: editData.accountNumber || "",
            accountType: editData.accountType || "CURRENT",
            branchName: editData.branchName || "",
            ifscCode: editData.ifscCode || "",
            status: editData.status || "ACTIVE",
            notes: editData.notes || "",
          }
        : { ...initialFormData },
    );
  }, [isOpen, editData]);

  const handleClose = () => {
    if (!saveLock.current) onClose?.();
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: name === "ifscCode" ? value.toUpperCase() : value,
    }));
  };

  const validateForm = () => {
    const requiredFields = [
      ["accountName", "Account display name"],
      ["bankName", "Bank name"],
      ["accountHolderName", "Account holder name"],
      ["branchName", "Branch name"],
    ];

    for (const [key, label] of requiredFields) {
      if (!formData[key].trim()) {
        toast.error(`${label} is required`);
        return false;
      }
    }

    if (
      !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode.trim().toUpperCase())
    ) {
      toast.error("Enter an IFSC in the expected 11-character format");
      return false;
    }

    if (!isEdit) {
      if (!/^\d{6,30}$/.test(formData.accountNumber.trim())) {
        toast.error("Account number must contain 6–30 digits");
        return false;
      }

      if (
        formData.accountNumber.trim() !== formData.confirmAccountNumber.trim()
      ) {
        toast.error("Account numbers do not match");
        return false;
      }

      const amountText = formData.openingBalance.trim();

      if (amountText && !/^\d+(\.\d{1,2})?$/.test(amountText)) {
        toast.error(
          "Opening balance must be non-negative with at most two decimal places",
        );
        return false;
      }

      const openingBalance = Number(amountText || 0);

      if (
        !Number.isFinite(openingBalance) ||
        openingBalance < 0 ||
        openingBalance > 1000000000
      ) {
        toast.error("Opening balance is outside the supported range");
        return false;
      }
    }

    return true;
  };

  const handleSave = async () => {
    if (saveLock.current || !validateForm()) return;

    saveLock.current = true;
    setSaving(true);

    let savedBank;

    try {
      const payload = {
        accountName: formData.accountName.trim(),
        bankName: formData.bankName.trim(),
        accountHolderName: formData.accountHolderName.trim(),
        accountType: formData.accountType,
        branchName: formData.branchName.trim(),
        ifscCode: formData.ifscCode.trim().toUpperCase(),
        status: formData.status,
        notes: formData.notes.trim() || null,
      };

      if (!isEdit) {
        payload.accountNumber = formData.accountNumber.trim();
        payload.openingBalance = Number(formData.openingBalance || 0);
      }

      const response = isEdit
        ? await bankApi.update(editData.bankCode, payload)
        : await bankApi.create(payload);

      savedBank = extractBank(response);
    } catch (error) {
      toast.error(getBankError(error));
      return;
    } finally {
      saveLock.current = false;
      setSaving(false);
    }

    toast.success(
      isEdit
        ? "Bank account updated successfully"
        : "Bank account created successfully",
    );

    onClose?.();
    onSave?.(savedBank);
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
          {saving ? "Saving..." : isEdit ? "Update Bank" : "Save Bank"}
        </Button>
      </div>
    </>
  );

  return (
    <BoxModal
      show={isOpen}
      onClose={handleClose}
      title={isEdit ? "Edit Bank Account" : "Bank Registration"}
      subtitle={
        isEdit
          ? "Update bank account information"
          : "Create a bank account with a linked Bank Accounts ledger"
      }
      width="1100px"
      footer={footer}
    >
      <div className="box-modal-section">
        <div className="box-modal-section-header">
          <div className="box-modal-section-icon">
            <Building2 size={17} />
          </div>

          <div className="box-modal-section-header-content">
            <h3>Bank Information</h3>
            <p>Bank, account holder, and branch details</p>
          </div>
        </div>

        <div className="box-modal-form-grid">
          <Input
            label="Account Display Name"
            name="accountName"
            value={formData.accountName}
            onChange={handleChange}
            placeholder="Example: Main Bank - Current Account"
            maxLength={150}
            required
            disabled={saving}
          />

          <Input
            label="Bank Name"
            name="bankName"
            value={formData.bankName}
            onChange={handleChange}
            placeholder="Enter bank name"
            maxLength={150}
            required
            disabled={saving}
          />

          <Input
            label="Account Holder Name"
            name="accountHolderName"
            value={formData.accountHolderName}
            onChange={handleChange}
            placeholder="Enter account holder name"
            maxLength={150}
            required
            disabled={saving}
          />

          <Select
            label="Account Type"
            name="accountType"
            value={formData.accountType}
            onChange={handleChange}
            options={accountTypeOptions}
            disabled={saving}
          />

          <Input
            label="Branch Name"
            name="branchName"
            value={formData.branchName}
            onChange={handleChange}
            placeholder="Enter branch name"
            maxLength={150}
            required
            disabled={saving}
          />

          <Input
            label="IFSC Code"
            name="ifscCode"
            value={formData.ifscCode}
            onChange={handleChange}
            placeholder="Enter IFSC code"
            maxLength={11}
            required
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

      <div className="box-modal-section">
        <div className="box-modal-section-header">
          <div className="box-modal-section-icon">
            <CreditCard size={17} />
          </div>

          <div className="box-modal-section-header-content">
            <h3>Account Details</h3>
            <p>
              {isEdit
                ? "Account number and opening balance cannot be changed here"
                : "Account number and initial recorded balance"}
            </p>
          </div>
        </div>

        <div className="box-modal-form-grid">
          <Input
            label="Account Number"
            name="accountNumber"
            type="text"
            inputMode="numeric"
            value={formData.accountNumber}
            onChange={handleChange}
            placeholder="Enter account number"
            maxLength={30}
            required
            disabled={saving || isEdit}
          />

          {!isEdit && (
            <Input
              label="Confirm Account Number"
              name="confirmAccountNumber"
              type="text"
              inputMode="numeric"
              value={formData.confirmAccountNumber}
              onChange={handleChange}
              placeholder="Re-enter account number"
              maxLength={30}
              required
              disabled={saving}
            />
          )}

          {!isEdit && (
            <Input
              label="Opening Balance (₹)"
              name="openingBalance"
              type="number"
              min="0"
              max="1000000000"
              step="0.01"
              value={formData.openingBalance}
              onChange={handleChange}
              placeholder="0.00"
              disabled={saving}
            />
          )}

          <Input
            label="Currency"
            name="currency"
            value="INR"
            readOnly
            disabled
          />
        </div>
      </div>

      <div className="box-modal-section">
        <div className="box-modal-section-header">
          <div className="box-modal-section-icon">
            <FileText size={17} />
          </div>

          <div className="box-modal-section-header-content">
            <h3>Additional Information</h3>
            <p>Notes about this bank account</p>
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
              maxLength={1000}
              rows={4}
              disabled={saving}
            />
          </div>
        </div>
      </div>
    </BoxModal>
  );
}
