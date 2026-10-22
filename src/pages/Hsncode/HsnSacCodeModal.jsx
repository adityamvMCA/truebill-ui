import { useEffect, useRef, useState } from "react";

import { FileText, Hash } from "lucide-react";

import toast from "react-hot-toast";

import Button from "../../components/common/Form/Button";
import Input from "../../components/common/Form/Input";
import Select from "../../components/common/Form/Select";
import Textarea from "../../components/common/Form/Textarea";
import BoxModal from "../../components/common/Modal/BoxModal";
import StatusField from "../../components/common/StatusField/StatusField";

import hsnSacCodeApi from "../../services/modules/hsnSacCodeApi";

const INITIAL_FORM = {
  code: "",
  description: "",
  defaultGstRate: "0",
  status: "ACTIVE",
};

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

const extractRecord = (response) => {
  const record = response?.data?.data || response?.data?.hsnSacCode;

  if (!record?._id || !record?.code) {
    throw new Error("The server did not return a valid HSN/SAC record.");
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

function HsnSacCodeModal({
  isOpen,
  onClose,
  onSave,
  record: selectedRecord = null,
  mode = "create",
}) {
  const isCreateMode = mode === "create";
  const isViewMode = mode === "view";
  const isEditMode = mode === "edit";

  const selectedCode = selectedRecord?.code;

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
        if (!selectedCode) {
          throw new Error("HSN/SAC code is missing.");
        }

        const response = await hsnSacCodeApi.getByCode(selectedCode);

        const current = extractRecord(response);

        if (cancelled) {
          return;
        }

        setRecord(current);

        setFormData({
          code: current.code,
          description: current.description ?? "",
          defaultGstRate: String(current.defaultGstRate ?? 0),
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
  }, [isOpen, selectedCode, isCreateMode, mode, reloadKey]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,

      [name]: name === "code" ? value.toUpperCase() : value,
    }));

    setError("");
  };

  const handleClose = () => {
    if (!saving && !submitLockRef.current) {
      onClose?.();
    }
  };

  const buildPayload = () => {
    const code = formData.code.trim().toUpperCase();

    const description = nullableText(formData.description);

    const rateText = String(formData.defaultGstRate).trim();

    const defaultGstRate = Number(formData.defaultGstRate);

    if (!/^[A-Z0-9]{2,20}$/.test(code)) {
      throw new Error("Code must contain 2–20 letters or numbers.");
    }

    if (description && description.length > 500) {
      throw new Error("Description cannot exceed 500 characters.");
    }

    if (
      !rateText ||
      !Number.isFinite(defaultGstRate) ||
      defaultGstRate < 0 ||
      defaultGstRate > 100
    ) {
      throw new Error("Default GST rate must be between 0 and 100.");
    }

    if (!["ACTIVE", "INACTIVE"].includes(formData.status)) {
      throw new Error("Select a valid status.");
    }

    const values = {
      code,
      description,
      defaultGstRate,
      status: formData.status,
    };

    if (isCreateMode) {
      return values;
    }

    if (!record || !Number.isSafeInteger(record.__v) || record.__v < 0) {
      throw new Error("Record version is missing. Reload the code.");
    }

    const originalValues = {
      description: nullableText(record.description),
      defaultGstRate: record.defaultGstRate,
      status: record.status,
    };

    const payload = {
      version: record.__v,
    };

    for (const field of ["description", "defaultGstRate", "status"]) {
      if (values[field] !== originalValues[field]) {
        payload[field] = values[field];
      }
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
        ? await hsnSacCodeApi.create(payload)
        : await hsnSacCodeApi.update(record.code, payload);

      const savedRecord = extractRecord(response);

      confirmed = true;

      onSave?.(savedRecord);

      toast.success(
        isCreateMode
          ? "HSN/SAC code created successfully"
          : "HSN/SAC code updated successfully",
      );

      onClose?.();
    } catch (requestError) {
      const status = requestError?.response?.status;

      if (confirmed || !status || status >= 500 || status === 408) {
        setUncertain(true);

        const message =
          "The save may already have completed. Close this modal and refresh the list before submitting again.";

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
            {saving ? "Saving..." : isEditMode ? "Update Code" : "Save Code"}
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
          ? "HSN/SAC Details"
          : isEditMode
            ? "Edit HSN/SAC Code"
            : "New HSN/SAC Code"
      }
      subtitle={
        isCreateMode
          ? "Add a code to your Product master"
          : selectedCode || "Code information"
      }
      width="min(620px, calc(100vw - 24px))"
      footer={footer}
    >
      {loading && (
        <div className="section-info-box" role="status">
          Loading latest HSN/SAC information…
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
                Reloading replaces your unsaved changes with the latest saved
                values.
              </p>

              <Button
                type="button"
                variant="secondary"
                disabled={saving}
                onClick={() => setReloadKey((value) => value + 1)}
              >
                Reload Latest Code
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
                <Hash size={17} />
              </div>

              <div className="box-modal-section-header-content">
                <h3>Code Information</h3>
                <p>Description and default GST rate</p>
              </div>
            </div>

            <div className="box-modal-form-grid">
              <Input
                label="HSN/SAC Code"
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="Enter code"
                maxLength={20}
                required
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

              <Input
                label="Default GST Rate (%)"
                name="defaultGstRate"
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                step="any"
                value={formData.defaultGstRate}
                onChange={handleChange}
                readOnly={isViewMode}
                disabled={!isViewMode && disabled}
              />

              <div className="box-modal-form-full">
                <Textarea
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter code description..."
                  rows={4}
                  maxLength={500}
                  readOnly={isViewMode}
                  disabled={!isViewMode && disabled}
                />
              </div>
            </div>
          </div>

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

export default HsnSacCodeModal;
