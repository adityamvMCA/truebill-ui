import { useEffect, useRef, useState } from "react";

import { FileText, FolderTree, Info } from "lucide-react";

import toast from "react-hot-toast";

import Button from "../../components/common/Form/Button";
import Input from "../../components/common/Form/Input";
import Select from "../../components/common/Form/Select";
import Textarea from "../../components/common/Form/Textarea";
import BoxModal from "../../components/common/Modal/BoxModal";
import StatusField from "../../components/common/StatusField/StatusField";

import productCategoryApi from "../../services/modules/productCategoryApi";

import "./categories.css";

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

  return body?.message || error?.message || "Unable to save category.";
};

const extractCategory = (response) => {
  const body = response?.data;

  const category = body?.data || body?.category;

  if (!category?._id || !category?.categoryCode) {
    throw new Error(
      "The server did not return a valid category with categoryCode.",
    );
  }

  return category;
};

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function CategoryModal({
  isOpen,
  onClose,
  onSave,
  editData = null,
  mode = "create",
}) {
  const isViewMode = mode === "view";
  const isEditMode = mode === "edit";

  const categoryCode = editData?.categoryCode;

  const [formData, setFormData] = useState({ ...INITIAL_FORM });

  const [record, setRecord] = useState(null);

  const [loading, setLoading] = useState(false);

  const [saving, setSaving] = useState(false);

  const [loadError, setLoadError] = useState("");

  const [error, setError] = useState("");

  const [uncertain, setUncertain] = useState(false);

  const [reloadKey, setReloadKey] = useState(0);

  const submitLockRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    let cancelled = false;

    setFormData({ ...INITIAL_FORM });
    setRecord(null);
    setError("");
    setLoadError("");
    setUncertain(false);

    if (!isEditMode && !isViewMode) {
      setLoading(false);
      return undefined;
    }

    const loadCategory = async () => {
      setLoading(true);

      try {
        if (!categoryCode) {
          throw new Error("Category code is missing.");
        }

        const response = await productCategoryApi.getByCode(categoryCode);

        const category = extractCategory(response);

        if (cancelled) {
          return;
        }

        setRecord(category);

        setFormData({
          name: category.name ?? "",
          description: category.description ?? "",
          status: category.status,
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

    loadCategory();

    return () => {
      cancelled = true;
    };
  }, [isOpen, isEditMode, isViewMode, categoryCode, reloadKey]);

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

    const description = formData.description.trim() || null;

    if (!name || name.length > 100) {
      throw new Error("Category name must contain 1–100 characters.");
    }

    if (description && description.length > 1000) {
      throw new Error("Description cannot exceed 1000 characters.");
    }

    if (!["ACTIVE", "INACTIVE"].includes(formData.status)) {
      throw new Error("Select a valid status.");
    }

    if (!isEditMode) {
      return {
        name,
        description,
        status: formData.status,
      };
    }

    if (!record || !Number.isSafeInteger(record.__v) || record.__v < 0) {
      throw new Error("Category version is missing. Reload the category.");
    }

    const payload = {
      version: record.__v,
    };

    if (description !== (String(record.description ?? "").trim() || null)) {
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
      saving ||
      loading ||
      loadError ||
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
      const response = isEditMode
        ? await productCategoryApi.update(record.categoryCode, payload)
        : await productCategoryApi.create(payload);

      const category = extractCategory(response);

      confirmed = true;

      onSave?.(category);

      toast.success(
        isEditMode
          ? "Category updated successfully"
          : "Category created successfully",
      );

      onClose?.();
    } catch (requestError) {
      const status = requestError?.response?.status;

      if (confirmed || !status || status >= 500 || status === 408) {
        setUncertain(true);

        const message =
          "The save may already have completed. Close this modal and refresh Categories before submitting again.";

        setError(message);
        toast.error(message);
      } else {
        const message = getErrorMessage(requestError);

        setError(message);
        toast.error(message);
      }
    } finally {
      submitLockRef.current = false;
      setSaving(false);
    }
  };

  const disabled = saving || loading || Boolean(loadError) || uncertain;

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
        <div className="box-modal-footer-actions category-modal-footer-actions">
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
                ? "Update Category"
                : "Save Category"}
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
          ? "Category Details"
          : isEditMode
            ? "Edit Category"
            : "New Category"
      }
      subtitle={
        isViewMode
          ? "View category information"
          : isEditMode
            ? "Update description and status"
            : "Organize your goods and services"
      }
      width="min(620px, calc(100vw - 24px))"
      footer={footer}
    >
      <div className="category-modal-content">
        {loading && (
          <div className="category-notice" role="status">
            Loading category…
          </div>
        )}

        {loadError && (
          <div className="category-notice category-notice--error" role="alert">
            <p>{loadError}</p>

            <Button
              type="button"
              variant="secondary"
              onClick={() => setReloadKey((value) => value + 1)}
              disabled={loading}
            >
              Retry
            </Button>
          </div>
        )}

        {error && (
          <div className="category-notice category-notice--error" role="alert">
            {error}
          </div>
        )}

        {!loading && !loadError && (
          <div className="box-modal-section">
            <div className="box-modal-section-header">
              <div className="box-modal-section-icon">
                <FolderTree size={17} aria-hidden="true" />
              </div>

              <div className="box-modal-section-header-content">
                <h3>Category Information</h3>

                <p>Classification for Products and services</p>
              </div>
            </div>

            {isViewMode ? (
              <div className="category-detail-grid">
                <div>
                  <span>Category Code</span>
                  <strong>{record?.categoryCode}</strong>
                </div>

                <div>
                  <span>Status</span>
                  <StatusField value={record?.status} />
                </div>

                <div className="category-detail-full">
                  <span>Category Name</span>
                  <strong>{record?.name}</strong>
                </div>

                <div className="category-detail-full">
                  <span>Description</span>
                  <p>{record?.description || "No description added."}</p>
                </div>

                <div>
                  <span>Created</span>
                  <strong>{formatDate(record?.createdAt)}</strong>
                </div>

                <div>
                  <span>Last Updated</span>
                  <strong>{formatDate(record?.updatedAt)}</strong>
                </div>
              </div>
            ) : (
              <div className="box-modal-form-grid category-form-grid">
                {isEditMode && (
                  <Input
                    label="Category Code"
                    name="categoryCode"
                    value={record?.categoryCode || ""}
                    disabled
                  />
                )}

                <Input
                  label="Category Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Example: Electronics"
                  maxLength={100}
                  required
                  disabled={disabled || isEditMode}
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
                    placeholder="Describe the Products grouped under this category..."
                    rows={4}
                    maxLength={1000}
                    disabled={disabled}
                  />

                  <p className="category-field-hint">
                    {formData.description.length}
                    /1000 characters
                  </p>
                </div>

                <div className="box-modal-form-full category-form-info">
                  <Info size={16} aria-hidden="true" />

                  <p>
                    {isEditMode
                      ? "The category name and code are protected. Update its description or status here."
                      : "The category code is generated by the backend. Active categories are available for new Product assignments."}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {isViewMode && record && (
          <div className="category-form-info">
            <FileText size={16} aria-hidden="true" />

            <p>
              Existing Product category values are preserved when the category
              is deactivated.
            </p>
          </div>
        )}
      </div>
    </BoxModal>
  );
}

export default CategoryModal;
