import { useEffect, useRef, useState } from "react";
import { BookOpen, Wallet, FileText } from "lucide-react";
import toast from "react-hot-toast";

import Button from "../../../components/common/Form/Button";
import Input from "../../../components/common/Form/Input";
import Select from "../../../components/common/Form/Select";
import Textarea from "../../../components/common/Form/Textarea";
import BoxModal from "../../../components/common/Modal/BoxModal";

import ledgerApi from "../../../services/modules/ledgerApi";
import ledgerGroupApi from "../../../services/modules/ledgerGroupApi";

const initialFormData = {
  name: "",
  code: "",
  ledgerGroupId: "",
  type: "ACCOUNT",
  openingBalance: "0",
  openingBalanceType: "CREDIT",
  description: "",
};

const ledgerTypeOptions = [
  { value: "ACCOUNT", label: "Account" },
  { value: "TAX", label: "Tax (GST / TDS)" },
];

const balanceTypeOptions = [
  { value: "DEBIT", label: "Debit" },
  { value: "CREDIT", label: "Credit" },
];

const getErrorMessage = (error) => {
  const data = error?.response?.data;

  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    return data.errors
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.message || item?.msg || "Validation failed",
      )
      .join(", ");
  }

  return (
    data?.message || data?.error || error?.message || "Unable to save ledger."
  );
};

const extractList = (response) => {
  const body = response?.data;
  const list = body?.data ?? body?.ledgerGroups ?? body?.ledgers ?? body;

  if (!Array.isArray(list)) {
    throw new Error(body?.message || "Invalid list response.");
  }

  return list;
};

export default function LedgerRegistration({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState(initialFormData);
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [saving, setSaving] = useState(false);

  const saveLock = useRef(false);

  useEffect(() => {
    if (!isOpen) return undefined;

    let cancelled = false;

    const loadGroups = async () => {
      setLoadingGroups(true);

      try {
        let response = await ledgerGroupApi.getAll({});
        let allGroups = extractList(response);

        // If this tenant has no ledger groups, seed the defaults.
        if (allGroups.length === 0) {
          await ledgerGroupApi.seed({});
          response = await ledgerGroupApi.getAll({});
          allGroups = extractList(response);
        }

        if (cancelled) return;

        setGroups(allGroups.filter((group) => group.isActive !== false));

        if (allGroups.length === 0) {
          toast.error(
            "No ledger groups found. Check the default ledger group seed configuration.",
          );
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(getErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setLoadingGroups(false);
        }
      }
    };

    setFormData({ ...initialFormData });
    setGroups([]);

    void loadGroups();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => {
      const next = { ...previous, [name]: value };

      if (name === "type" && value === "TAX") {
        next.openingBalanceType = "CREDIT";

        const currentGroup = groups.find(
          (group) => group._id === previous.ledgerGroupId,
        );

        if (
          currentGroup &&
          String(currentGroup.nature).toUpperCase() !== "LIABILITY"
        ) {
          next.ledgerGroupId = "";
        }
      }

      return next;
    });
  };

  const isTaxLedger = formData.type === "TAX";

  const availableGroups = groups.filter((group) => {
    if (!isTaxLedger) return true;

    return String(group.nature).toUpperCase() === "LIABILITY";
  });

  const selectedGroup = groups.find(
    (group) => group._id === formData.ledgerGroupId,
  );

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error("Ledger name is required.");
      return false;
    }

    if (!formData.code.trim()) {
      toast.error("Ledger code is required.");
      return false;
    }

    if (!/^[A-Z0-9_-]+$/i.test(formData.code.trim())) {
      toast.error(
        "Ledger code can contain only letters, numbers, hyphens and underscores.",
      );
      return false;
    }

    if (!formData.ledgerGroupId) {
      toast.error("Select a ledger group.");
      return false;
    }

    if (!selectedGroup || selectedGroup.isActive === false) {
      toast.error("Select a valid active ledger group.");
      return false;
    }

    if (
      isTaxLedger &&
      String(selectedGroup.nature).toUpperCase() !== "LIABILITY"
    ) {
      toast.error("A TDS payable ledger must belong to a liability group.");
      return false;
    }

    const amountText = String(formData.openingBalance).trim();

    if (!/^\d+(\.\d{1,2})?$/.test(amountText)) {
      toast.error(
        "Opening balance must be non-negative with up to two decimal places.",
      );
      return false;
    }

    const amount = Number(amountText);

    if (!Number.isFinite(amount) || amount > 1000000000) {
      toast.error("Opening balance is outside the supported range.");
      return false;
    }

    return true;
  };

  const handleClose = () => {
    if (!saveLock.current) {
      onClose?.();
    }
  };

  const handleSave = async () => {
    if (saveLock.current || saving || !validateForm()) {
      return;
    }

    saveLock.current = true;
    setSaving(true);

    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        ledgerGroupId: formData.ledgerGroupId,
        type: formData.type,
        openingBalance: Number(formData.openingBalance || 0),
        openingBalanceType: isTaxLedger
          ? "CREDIT"
          : formData.openingBalanceType,
        description: formData.description.trim() || null,
      };

      const response = await ledgerApi.create(payload);
      const body = response?.data;
      const ledger = body?.data?.ledger ?? body?.data;

      if (body?.success === false || !ledger?._id) {
        throw new Error(
          body?.message || "The server did not return the created ledger.",
        );
      }

      toast.success("Ledger created successfully.");

      onClose?.();
      onSave?.(ledger);
    } catch (error) {
      toast.error(getErrorMessage(error));
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
          disabled={saving || loadingGroups}
        >
          {saving ? "Saving..." : "Save Ledger"}
        </Button>
      </div>
    </>
  );

  return (
    <BoxModal
      show={isOpen}
      onClose={handleClose}
      title="Ledger Registration"
      subtitle="Create an accounting ledger, including a TDS payable ledger."
      width="1000px"
      footer={footer}
    >
      <div className="box-modal-section">
        <div className="box-modal-section-header">
          <div className="box-modal-section-icon">
            <BookOpen size={17} />
          </div>

          <div className="box-modal-section-header-content">
            <h3>Ledger Information</h3>
            <p>Enter the ledger name, code and accounting group.</p>
          </div>
        </div>

        <div className="box-modal-form-grid">
          <Input
            label="Ledger Name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder={
              isTaxLedger ? "TDS Payable - Contractors" : "Enter ledger name"
            }
            maxLength={150}
            required
            disabled={saving}
          />

          <Input
            label="Ledger Code"
            name="code"
            value={formData.code}
            onChange={handleChange}
            placeholder={
              isTaxLedger ? "TDS-CONTRACTOR" : "Enter unique ledger code"
            }
            maxLength={50}
            required
            disabled={saving}
          />

          <Select
            label="Ledger Type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            options={ledgerTypeOptions}
            disabled={saving}
          />

          <Select
            label="Ledger Group"
            name="ledgerGroupId"
            value={formData.ledgerGroupId}
            onChange={handleChange}
            options={availableGroups.map((group) => ({
              value: group._id,
              label: `${group.name} (${group.code})`,
            }))}
            disabled={saving || loadingGroups}
          />

          {loadingGroups && <p role="status">Loading ledger groups...</p>}

          {!loadingGroups && availableGroups.length === 0 && (
            <p role="status">
              {isTaxLedger
                ? "No active liability groups are available. Create or activate a liability group first."
                : "No active ledger groups are available. Create or activate a ledger group first."}
            </p>
          )}
        </div>
      </div>

      <div className="box-modal-section">
        <div className="box-modal-section-header">
          <div className="box-modal-section-icon">
            <Wallet size={17} />
          </div>

          <div className="box-modal-section-header-content">
            <h3>Opening Balance</h3>
            <p>
              {isTaxLedger
                ? "TDS payable normally carries a credit balance."
                : "Enter the opening balance, if any."}
            </p>
          </div>
        </div>

        <div className="box-modal-form-grid">
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

          <Select
            label="Balance Type"
            name="openingBalanceType"
            value={isTaxLedger ? "CREDIT" : formData.openingBalanceType}
            onChange={handleChange}
            options={balanceTypeOptions}
            disabled={saving || isTaxLedger}
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
            <p>Optional notes about this ledger.</p>
          </div>
        </div>

        <div className="box-modal-form-grid">
          <div className="box-modal-form-full">
            <Textarea
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter ledger description..."
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
