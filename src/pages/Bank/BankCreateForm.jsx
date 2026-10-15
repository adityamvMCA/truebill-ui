import { useState } from "react";

import Input from "../../components/form/Input";
import Select from "../../components/form/Select";
import Textarea from "../../components/form/Textarea";
import Button from "../../components/form/Button";

import "./bank-create-form.css";

const createInitialValues = () => ({
  accountName: "",
  bankName: "",
  accountHolderName: "",
  accountNumber: "",
  confirmAccountNumber: "",
  accountType: "CURRENT",
  branchName: "",
  ifscCode: "",
  currency: "INR",
  status: "ACTIVE",
  notes: "",
});

const ACCOUNT_TYPE_OPTIONS = [
  { value: "CURRENT", label: "Current Account" },
  { value: "SAVINGS", label: "Savings Account" },
];

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

const validateForm = (values) => {
  const errors = {};

  if (!values.accountName.trim()) {
    errors.accountName = "Enter an account display name.";
  }

  if (!values.bankName.trim()) {
    errors.bankName = "Enter the bank name.";
  }

  if (!values.accountHolderName.trim()) {
    errors.accountHolderName = "Enter the account holder name.";
  }

  if (!values.accountNumber.trim()) {
    errors.accountNumber = "Enter the account number.";
  } else if (!/^\d+$/.test(values.accountNumber.trim())) {
    errors.accountNumber = "Account number must contain only digits.";
  }

  if (!values.confirmAccountNumber.trim()) {
    errors.confirmAccountNumber = "Confirm the account number.";
  } else if (
    values.accountNumber.trim() !== values.confirmAccountNumber.trim()
  ) {
    errors.confirmAccountNumber = "Account numbers do not match.";
  }

  if (!values.branchName.trim()) {
    errors.branchName = "Enter the branch name.";
  }

  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(values.ifscCode.trim())) {
    errors.ifscCode = "Enter an IFSC in the expected 11-character format.";
  }

  return errors;
};

export default function BankCreateForm({ onSave, onCancel }) {
  const [values, setValues] = useState(createInitialValues);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    const nextValue = name === "ifscCode" ? value.toUpperCase() : value;

    setValues((previous) => ({
      ...previous,
      [name]: nextValue,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: undefined,
      ...(name === "accountNumber" ? { confirmAccountNumber: undefined } : {}),
    }));

    setSubmitError("");
    setSuccessMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) return;

    setSubmitError("");
    setSuccessMessage("");

    const validationErrors = validateForm(values);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    if (typeof onSave !== "function") {
      setSubmitError("Connect the bank save handler before saving.");
      return;
    }

    const payload = {
      accountName: values.accountName.trim(),
      bankName: values.bankName.trim(),
      accountHolderName: values.accountHolderName.trim(),

      // Keep account numbers as strings to preserve leading zeros.
      accountNumber: values.accountNumber.trim(),

      accountType: values.accountType,
      branchName: values.branchName.trim(),
      ifscCode: values.ifscCode.trim().toUpperCase(),
      currency: values.currency,
      status: values.status,
      notes: values.notes.trim() || null,
    };

    setSaving(true);

    try {
      // onSave must reject/throw if the backend does not save the record.
      await onSave(payload);

      setValues(createInitialValues());
      setErrors({});
      setSuccessMessage("Bank account created successfully.");
    } catch (error) {
      setSubmitError(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to create the bank account.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bank-create-page">
      <form
        className="bank-create-card"
        onSubmit={handleSubmit}
        noValidate
        aria-busy={saving}
      >
        <header className="bank-create-header">
          <div>
            <h1>Create Bank Account</h1>
            <p>Add a bank account for receipts and payments.</p>
          </div>
        </header>

        <fieldset className="bank-create-fieldset" disabled={saving}>
          <div className="bank-create-body">
            <section className="bank-create-section">
              <h2>Account Details</h2>

              <div className="bank-create-grid">
                <Input
                  label="Account Display Name"
                  name="accountName"
                  value={values.accountName}
                  onChange={handleChange}
                  placeholder="Example: Demo Bank - Current Account"
                  error={errors.accountName}
                  maxLength={150}
                  required
                />

                <Input
                  label="Bank Name"
                  name="bankName"
                  value={values.bankName}
                  onChange={handleChange}
                  placeholder="Enter bank name"
                  error={errors.bankName}
                  maxLength={150}
                  required
                />

                <Input
                  label="Account Holder Name"
                  name="accountHolderName"
                  value={values.accountHolderName}
                  onChange={handleChange}
                  placeholder="Enter account holder name"
                  error={errors.accountHolderName}
                  maxLength={150}
                  required
                />

                <Select
                  label="Account Type"
                  name="accountType"
                  value={values.accountType}
                  onChange={handleChange}
                  options={ACCOUNT_TYPE_OPTIONS}
                  required
                />

                <Input
                  label="Account Number"
                  name="accountNumber"
                  type="text"
                  inputMode="numeric"
                  value={values.accountNumber}
                  onChange={handleChange}
                  placeholder="Enter account number"
                  error={errors.accountNumber}
                  maxLength={40}
                  required
                />

                <Input
                  label="Confirm Account Number"
                  name="confirmAccountNumber"
                  type="text"
                  inputMode="numeric"
                  value={values.confirmAccountNumber}
                  onChange={handleChange}
                  placeholder="Re-enter account number"
                  error={errors.confirmAccountNumber}
                  maxLength={40}
                  required
                />
              </div>
            </section>

            <section className="bank-create-section">
              <h2>Branch Details</h2>

              <div className="bank-create-grid">
                <Input
                  label="Branch Name"
                  name="branchName"
                  value={values.branchName}
                  onChange={handleChange}
                  placeholder="Enter branch name"
                  error={errors.branchName}
                  maxLength={150}
                  required
                />

                <Input
                  label="IFSC Code"
                  name="ifscCode"
                  value={values.ifscCode}
                  onChange={handleChange}
                  placeholder="Enter IFSC code"
                  error={errors.ifscCode}
                  maxLength={11}
                  required
                />

                <Select
                  label="Currency"
                  name="currency"
                  value={values.currency}
                  onChange={handleChange}
                  options={[{ value: "INR", label: "INR - Indian Rupee" }]}
                  required
                />

                <Select
                  label="Status"
                  name="status"
                  value={values.status}
                  onChange={handleChange}
                  options={STATUS_OPTIONS}
                  required
                />

                <div className="bank-create-full">
                  <Textarea
                    label="Notes"
                    name="notes"
                    value={values.notes}
                    onChange={handleChange}
                    placeholder="Optional notes"
                    maxLength={1000}
                    rows={3}
                  />
                </div>
              </div>
            </section>

            {submitError && (
              <div className="bank-create-error" role="alert">
                {submitError}
              </div>
            )}

            {successMessage && (
              <div className="bank-create-success" role="status">
                {successMessage}
              </div>
            )}
          </div>

          <footer className="bank-create-footer">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={saving || !onCancel}
            >
              Cancel
            </Button>

            <Button type="submit" loading={saving} disabled={saving}>
              {saving ? "Saving..." : "Save Bank Account"}
            </Button>
          </footer>
        </fieldset>
      </form>
    </section>
  );
}
