import { useEffect, useRef, useState } from "react";

import { Building2, FileText, MapPin } from "lucide-react";

import toast from "react-hot-toast";

import Button from "../../components/common/Form/Button";
import Input from "../../components/common/Form/Input";
import Textarea from "../../components/common/Form/Textarea";
import BoxModal from "../../components/common/Modal/BoxModal";
import StatusField from "../../components/common/StatusField/StatusField";

import warehouseApi from "../../services/modules/warehouseApi";

const INITIAL_FORM = {
  warehouseCode: "",
  name: "",
  address: "",
  description: "",
};

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

const extractWarehouse = (response) => {
  const warehouse = response?.data?.data || response?.data?.warehouse;

  if (!warehouse?._id || !warehouse?.warehouseCode) {
    throw new Error("The server did not return a valid warehouse.");
  }

  return warehouse;
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

function WarehouseModal({
  isOpen,
  onClose,
  onSave,
  warehouse = null,
  mode = "create",
}) {
  const isCreateMode = mode === "create";
  const isViewMode = mode === "view";
  const isEditMode = mode === "edit";

  const selectedCode = warehouse?.warehouseCode;

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

    const loadWarehouse = async () => {
      setLoading(true);

      try {
        if (!selectedCode) {
          throw new Error("Warehouse code is missing.");
        }

        const response = await warehouseApi.getByCode(selectedCode);

        const current = extractWarehouse(response);

        if (cancelled) {
          return;
        }

        setRecord(current);

        setFormData({
          warehouseCode: current.warehouseCode,
          name: current.name ?? "",
          address: current.address ?? "",
          description: current.description ?? "",
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

    loadWarehouse();

    return () => {
      cancelled = true;
    };
  }, [isOpen, selectedCode, isCreateMode, mode, reloadKey]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (isViewMode || !["name", "address", "description"].includes(name)) {
      return;
    }

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  const handleClose = () => {
    if (saving || submitLockRef.current) {
      return;
    }

    onClose?.();
  };

  const buildPayload = () => {
    const name = normalizeName(formData.name);
    const address = nullableText(formData.address);
    const description = nullableText(formData.description);

    if (!name || name.length > 100) {
      throw new Error("Warehouse name must contain 1–100 characters.");
    }

    if (address && address.length > 2000) {
      throw new Error("Address cannot exceed 2000 characters.");
    }

    if (description && description.length > 1000) {
      throw new Error("Description cannot exceed 1000 characters.");
    }

    if (isCreateMode) {
      return {
        name,
        address,
        description,
      };
    }

    if (
      !record ||
      !record.warehouseCode ||
      !Number.isSafeInteger(record.__v) ||
      record.__v < 0
    ) {
      throw new Error("Warehouse version is missing. Reload the warehouse.");
    }

    const values = {
      name,
      address,
      description,
    };

    const originalValues = {
      name: normalizeName(record.name),
      address: nullableText(record.address),
      description: nullableText(record.description),
    };

    const payload = {
      version: record.__v,
    };

    for (const field of ["name", "address", "description"]) {
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
      !isOpen ||
      isViewMode ||
      (!isCreateMode && !isEditMode) ||
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
        ? await warehouseApi.create(payload)
        : await warehouseApi.update(record.warehouseCode, payload);

      const savedWarehouse = extractWarehouse(response);

      confirmed = true;

      const updatedRecord = {
        ...record,
        ...savedWarehouse,

        isDefault: isCreateMode ? false : Boolean(record?.isDefault),
      };

      onSave?.(updatedRecord);

      toast.success(
        isCreateMode
          ? `Warehouse ${savedWarehouse.warehouseCode} created successfully`
          : "Warehouse updated successfully",
      );

      onClose?.();
    } catch (requestError) {
      const status = requestError?.response?.status;

      if (confirmed || !status || status >= 500 || status === 408) {
        setUncertain(true);

        const message = confirmed
          ? "The warehouse was saved, but the page could not finish updating. Close this modal and refresh Warehouses."
          : "The save may already have completed. Close this modal and refresh Warehouses before submitting again.";

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
                ? "Update Warehouse"
                : "Save Warehouse"}
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
          ? "Warehouse Details"
          : isEditMode
            ? "Edit Warehouse"
            : "New Warehouse"
      }
      subtitle={
        isCreateMode
          ? "Add a shop, godown or storage location"
          : selectedCode || "Warehouse information"
      }
      width="min(680px, calc(100vw - 24px))"
      footer={footer}
    >
      {loading && (
        <div className="section-info-box" role="status">
          Loading latest warehouse information…
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
                Reload Latest Warehouse
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
                <Building2 size={17} />
              </div>

              <div className="box-modal-section-header-content">
                <h3>Warehouse Information</h3>
                <p>Location code, name and description</p>
              </div>
            </div>

            <div className="box-modal-form-grid">
              <Input
                label="Warehouse Code"
                name="warehouseCode"
                value={
                  isCreateMode
                    ? "Auto-generated on save"
                    : formData.warehouseCode
                }
                readOnly
              />

              <Input
                label="Warehouse Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Example: Main Godown"
                maxLength={100}
                required
                readOnly={isViewMode}
                disabled={!isViewMode && disabled}
              />
              {record && (
                <>
                  <div className="form-field">
                    <span>Status</span>

                    <div>
                      <StatusField value={record.status} />
                    </div>
                  </div>

                  <Input
                    label="Location Type"
                    value={
                      record.isDefault
                        ? "Default Location"
                        : "Additional Location"
                    }
                    readOnly
                  />
                </>
              )}

              <div className="box-modal-form-full">
                <Textarea
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe this location..."
                  rows={3}
                  maxLength={1000}
                  readOnly={isViewMode}
                  disabled={!isViewMode && disabled}
                />
              </div>
            </div>
          </div>

          <div className="box-modal-section">
            <div className="box-modal-section-header">
              <div className="box-modal-section-icon">
                <MapPin size={17} />
              </div>

              <div className="box-modal-section-header-content">
                <h3>Location Address</h3>
                <p>Shop, godown or storage address</p>
              </div>
            </div>

            <div className="box-modal-form-grid">
              <div className="box-modal-form-full">
                <Textarea
                  label="Address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter the location address..."
                  rows={4}
                  maxLength={2000}
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

export default WarehouseModal;
