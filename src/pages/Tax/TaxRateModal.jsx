import { useEffect, useRef, useState } from "react";

import { FileText, Percent } from "lucide-react";

import toast from "react-hot-toast";

import Button from "../../components/common/Form/Button";
import Input from "../../components/common/Form/Input";
import Select from "../../components/common/Form/Select";
import Textarea from "../../components/common/Form/Textarea";
import BoxModal from "../../components/common/Modal/BoxModal";
import StatusField from "../../components/common/StatusField/StatusField";

import taxRateApi from "../../services/modules/taxRateApi";

const INITIAL_FORM = {
  name: "",
  rate: "",
  taxType: "GST",
  description: "",
  status: "ACTIVE",
};

const TAX_TYPE_OPTIONS = [
  {
    value: "GST",
    label: "GST",
  },
  {
    value: "VAT",
    label: "VAT",
  },
  {
    value: "CUSTOM",
    label: "Custom",
  },
];

const STATUS_OPTIONS = [
  {
    value: "ACTIVE",
    label: "Active",
  },
  {
    value: "INACTIVE",
    label: "Inactive",
  },
];

const normalizeName = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");

const nullableText = (value) => String(value ?? "").trim() || null;

const getErrorMessage = (error) => {
  const body = error?.response?.data;

  if (Array.isArray(body?.errors) && body.errors.length) {
    return body.errors
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.message || item?.msg || "Validation failed",
      )
      .join(", ");
  }

  return body?.message || error?.message || "Unable to complete the request.";
};

const extractTaxRate = (response) => {
  const record = response?.data?.data || response?.data?.taxRate;

  if (!record?._id || !record?.name) {
    throw new Error("The server did not return a valid tax rate.");
  }

  return record;
};

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
};

function TaxRateModal({
  isOpen,
  onClose,
  onSave,
  taxRate = null,
  mode = "create",
}) {
  const isCreateMode = mode === "create";
  const isViewMode = mode === "view";
  const isEditMode = mode === "edit";

  const taxRateId = taxRate?._id;

  const [record, setRecord] = useState(null);

  const [formData, setFormData] = useState({
    ...INITIAL_FORM,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [needsReload, setNeedsReload] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const submitLockRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    let cancelled = false;

    setRecord(null);
    setFormData({ ...INITIAL_FORM });
    setLoadError("");
    setError("");
    setNeedsReload(false);
    setUncertain(false);

    if (isCreateMode) {
      setLoading(false);
      return undefined;
    }

    const loadRecord = async () => {
      setLoading(true);

      try {
        if (!taxRateId) {
          throw new Error("Tax rate ID is missing.");
        }

        const response = await taxRateApi.getById(taxRateId);

        const current = extractTaxRate(response);

        if (cancelled) {
          return;
        }

        setRecord(current);

        setFormData({
          name: current.name ?? "",
          rate: String(current.rate),
          taxType: current.taxType,
          description: current.description ?? "",
          status: current.status,
        });
      } catch (requestError) {
        if (!cancelled) {
          setLoadError(getErrorMessage(requestError));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadRecord();

    return () => {
      cancelled = true;
    };
  }, [isOpen, taxRateId, isCreateMode, mode, reloadKey]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  const handleClose = () => {
    if (!saving && !submitLockRef.current) {
      onClose?.();
    }
  };

  const buildPayload = () => {
    const name = normalizeName(formData.name);

    const description = nullableText(formData.description);

    if (!name || name.length > 100) {
      throw new Error("Tax rate name must contain 1–100 characters.");
    }

    if (description && description.length > 1000) {
      throw new Error("Description cannot exceed 1000 characters.");
    }

    if (!["ACTIVE", "INACTIVE"].includes(formData.status)) {
      throw new Error("Select a valid status.");
    }

    if (isCreateMode) {
      const rateText = String(formData.rate).trim();

      const rate = Number(formData.rate);

      if (!rateText || !Number.isFinite(rate) || rate < 0 || rate > 100) {
        throw new Error("Tax rate must be between 0 and 100.");
      }

      if (!["GST", "VAT", "CUSTOM"].includes(formData.taxType)) {
        throw new Error("Select a valid tax type.");
      }

      return {
        name,
        rate,
        taxType: formData.taxType,
        description,
        status: formData.status,
      };
    }

    if (!record || !Number.isSafeInteger(record.__v) || record.__v < 0) {
      throw new Error("Tax rate version is missing. Reload the record.");
    }

    const payload = {
      version: record.__v,
    };

    if (name !== normalizeName(record.name)) {
      payload.name = name;
    }

    if (description !== nullableText(record.description)) {
      payload.description = description;
    }

    if (formData.status !== record.status) {
      payload.status = formData.status;
    }

    if (Object.keys(payload).length === 1) {
      throw new Error("No changes to save.");
    }

    return payload;
  };

  const handleSave = async () => {
    if (
      isViewMode ||
      loading ||
      saving ||
      loadError ||
      needsReload ||
      uncertain ||
      submitLockRef.current
    ) {
      return;
    }

    let payload;

    try {
      payload = buildPayload();
    } catch (validationError) {
      setError(validationError.message);

      return;
    }

    submitLockRef.current = true;
    setSaving(true);
    setError("");

    let confirmed = false;

    try {
      const response = isCreateMode
        ? await taxRateApi.create(payload)
        : await taxRateApi.update(record._id, payload);

      const savedRecord = extractTaxRate(response);

      confirmed = true;

      onSave?.(savedRecord);

      toast.success(
        isCreateMode
          ? "Tax rate created successfully"
          : "Tax rate updated successfully",
      );

      onClose?.();
    } catch (requestError) {
      const status = requestError?.response?.status;

      if (confirmed || !status || status >= 500 || status === 408) {
        setUncertain(true);

        const message =
          "The save may already have completed. Close this modal and refresh Tax Rates before submitting again.";

        setError(message);
        toast.error(message);
      } else {
        if (isEditMode && status === 409) {
          setNeedsReload(true);
        }

        const message = getErrorMessage(requestError);

        setError(message);
        toast.error(message);
      }
    } finally {
      submitLockRef.current = false;
      setSaving(false);
    }
  };

  const disabled =
    loading || saving || Boolean(loadError) || needsReload || uncertain;

  const footer = (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={handleClose}
        disabled={saving}
      >
        {isViewMode ? "Close" : "Cancel"}
      </Button>

      {!isViewMode && (
        <div className="box-modal-footer-actions">
          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            loading={saving}
            disabled={disabled}
          >
            {saving
              ? "Saving..."
              : isEditMode
                ? "Update Tax Rate"
                : "Save Tax Rate"}
          </Button>
        </div>
      )}
    </>
  );

  return (
    <BoxModal
      show={isOpen}
      onClose={handleClose}
      title={
        isViewMode
          ? "Tax Rate Details"
          : isEditMode
            ? "Edit Tax Rate"
            : "New Tax Rate"
      }
      subtitle={
        isCreateMode
          ? "Configure a tax percentage"
          : record?.name || "Tax information"
      }
      width="min(620px, calc(100vw - 24px))"
      footer={footer}
    >
      {loading && (
        <div className="section-info-box" role="status">
          Loading latest tax rate information…
        </div>
      )}

      {loadError && (
        <div className="section-form-api-error" role="alert">
          <p>{loadError}</p>

          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={() => setReloadKey((value) => value + 1)}
          >
            Retry
          </Button>
        </div>
      )}

      {error && (
        <div className="section-form-api-error" role="alert">
          <p>{error}</p>

          {needsReload && !uncertain && (
            <>
              <p>
                Reloading replaces unsaved changes with the latest saved values.
              </p>

              <Button
                type="button"
                variant="secondary"
                disabled={saving}
                onClick={() => setReloadKey((value) => value + 1)}
              >
                Reload Latest Tax Rate
              </Button>
            </>
          )}
        </div>
      )}

      {!loading && !loadError && (
        <>
          <div className="box-modal-section">
            <div className="box-modal-section-header">
              <div className="box-modal-section-icon">
                <Percent size={17} />
              </div>

              <div className="box-modal-section-header-content">
                <h3>Tax Information</h3>
                <p>Name, percentage and tax type</p>
              </div>
            </div>

            <div className="box-modal-form-grid">
              <Input
                label="Tax Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter tax name"
                maxLength={100}
                required
                readOnly={isViewMode}
                disabled={!isViewMode && disabled}
              />

              <Input
                label="Rate (%)"
                name="rate"
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                step="any"
                value={formData.rate}
                onChange={handleChange}
                required
                disabled={disabled || isEditMode || isViewMode}
              />

              <Select
                label="Tax Type"
                name="taxType"
                value={formData.taxType}
                options={TAX_TYPE_OPTIONS}
                onChange={handleChange}
                disabled={disabled || isEditMode || isViewMode}
              />

              {isViewMode ? (
                <div className="form-field">
                  <span>Status</span>

                  <div>
                    <StatusField value={record?.status} />
                  </div>
                </div>
              ) : (
                <Select
                  label="Status"
                  name="status"
                  value={formData.status}
                  options={STATUS_OPTIONS}
                  onChange={handleChange}
                  disabled={disabled}
                />
              )}

              <div className="box-modal-form-full">
                <Textarea
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter tax description..."
                  rows={4}
                  maxLength={1000}
                  readOnly={isViewMode}
                  disabled={!isViewMode && disabled}
                />
              </div>
            </div>
          </div>

          {isEditMode && (
            <div className="section-info-box">
              <p>
                The rate and tax type cannot be changed. Create another record
                for a different rate or tax type.
              </p>
            </div>
          )}

          {record && (
            <div className="box-modal-section">
              <div className="box-modal-section-header">
                <div className="box-modal-section-icon">
                  <FileText size={17} />
                </div>

                <div className="box-modal-section-header-content">
                  <h3>Record Information</h3>
                  <p>Creation and update history</p>
                </div>
              </div>

              <div className="box-modal-form-grid">
                <Input
                  label="Source"
                  value={record.isSystem ? "System" : "Custom"}
                  readOnly
                />

                <Input
                  label="Created At"
                  value={formatDate(record.createdAt)}
                  readOnly
                />

                <Input
                  label="Last Updated"
                  value={formatDate(record.updatedAt)}
                  readOnly
                />
              </div>
            </div>
          )}
        </>
      )}
    </BoxModal>
  );
}

export default TaxRateModal;
