import { useEffect, useRef, useState } from "react";

import { FileText, Tag } from "lucide-react";

import toast from "react-hot-toast";

import Button from "../../components/common/Form/Button";
import Input from "../../components/common/Form/Input";
import Select from "../../components/common/Form/Select";
import Textarea from "../../components/common/Form/Textarea";
import BoxModal from "../../components/common/Modal/BoxModal";
import StatusField from "../../components/common/StatusField/StatusField";

import productBrandApi from "../../services/modules/productBrandApi";

const INITIAL_FORM = {
  name: "",
  description: "",
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

const extractBrand = (response) => {
  const brand = response?.data?.data || response?.data?.brand;

  if (!brand?._id || !brand?.name) {
    throw new Error("The server did not return a valid brand.");
  }

  return brand;
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

function BrandModal({
  isOpen,
  onClose,
  onSave,
  brand = null,
  mode = "create",
}) {
  const isCreateMode = mode === "create";
  const isViewMode = mode === "view";
  const isEditMode = mode === "edit";

  const brandId = brand?._id;

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

    const loadBrand = async () => {
      setLoading(true);

      try {
        if (!brandId) {
          throw new Error("Brand ID is missing.");
        }

        const response = await productBrandApi.getById(brandId);

        const current = extractBrand(response);

        if (cancelled) {
          return;
        }

        setRecord(current);

        setFormData({
          name: current.name ?? "",
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

    loadBrand();

    return () => {
      cancelled = true;
    };
  }, [isOpen, brandId, isCreateMode, mode, reloadKey]);

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
    const values = {
      name: normalizeName(formData.name),
      description: nullableText(formData.description),
      status: formData.status,
    };

    if (!values.name || values.name.length > 100) {
      throw new Error("Brand name must contain 1–100 characters.");
    }

    if (values.description && values.description.length > 1000) {
      throw new Error("Description cannot exceed 1000 characters.");
    }

    if (!["ACTIVE", "INACTIVE"].includes(values.status)) {
      throw new Error("Select a valid status.");
    }

    if (isCreateMode) {
      return values;
    }

    if (!record || !Number.isSafeInteger(record.__v) || record.__v < 0) {
      throw new Error("Brand version is missing. Reload the brand.");
    }

    const original = {
      name: normalizeName(record.name),
      description: nullableText(record.description),
      status: record.status,
    };

    const payload = {
      version: record.__v,
    };

    for (const field of ["name", "description", "status"]) {
      if (values[field] !== original[field]) {
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
        ? await productBrandApi.create(payload)
        : await productBrandApi.update(record._id, payload);

      const savedBrand = extractBrand(response);

      confirmed = true;

      onSave?.(savedBrand);

      toast.success(
        isCreateMode
          ? "Brand created successfully"
          : "Brand updated successfully",
      );

      onClose?.();
    } catch (requestError) {
      const status = requestError?.response?.status;

      if (confirmed || !status || status >= 500 || status === 408) {
        setUncertain(true);

        const message =
          "The save may already have completed. Close this modal and refresh Brands before submitting again.";

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
            {saving ? "Saving..." : isEditMode ? "Update Brand" : "Save Brand"}
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
        isViewMode ? "Brand Details" : isEditMode ? "Edit Brand" : "New Brand"
      }
      subtitle={
        isViewMode
          ? "View brand information"
          : isEditMode
            ? "Update brand information"
            : "Create a brand for your Products"
      }
      width="min(620px, calc(100vw - 24px))"
      footer={footer}
    >
      {loading && (
        <div className="section-info-box" role="status">
          Loading latest brand information…
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
                Reload Latest Brand
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
                <Tag size={17} />
              </div>

              <div className="box-modal-section-header-content">
                <h3>Brand Information</h3>
                <p>Name, description and availability</p>
              </div>
            </div>

            {isViewMode ? (
              <div className="box-modal-form-grid">
                <Input
                  label="Brand Name"
                  name="name"
                  value={record?.name || ""}
                  readOnly
                />

                <div className="form-field">
                  <span>Status</span>

                  <div>
                    <StatusField value={record?.status} />
                  </div>
                </div>

                <div className="box-modal-form-full">
                  <Textarea
                    label="Description"
                    name="description"
                    value={record?.description || "No description added."}
                    rows={4}
                    readOnly
                  />
                </div>
              </div>
            ) : (
              <div className="box-modal-form-grid">
                <Input
                  label="Brand Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Example: Samsung"
                  maxLength={100}
                  required
                  disabled={disabled}
                />

                <Select
                  label="Status"
                  name="status"
                  value={formData.status}
                  options={STATUS_OPTIONS}
                  onChange={handleChange}
                  disabled={disabled}
                />

                <div className="box-modal-form-full">
                  <Textarea
                    label="Description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe this brand..."
                    rows={4}
                    maxLength={1000}
                    disabled={disabled}
                  />
                </div>
              </div>
            )}
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

export default BrandModal;
