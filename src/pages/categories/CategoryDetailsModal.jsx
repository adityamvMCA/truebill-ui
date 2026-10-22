import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  FileText,
  FolderTree,
  Info,
  Pencil,
} from "lucide-react";

import toast from "react-hot-toast";

import Button from "../../components/common/Form/Button";
import Input from "../../components/common/Form/Input";
import Select from "../../components/common/Form/Select";
import Textarea from "../../components/common/Form/Textarea";
import BoxModal from "../../components/common/Modal/BoxModal";
import StatusField from "../../components/common/StatusField/StatusField";

import productCategoryApi from "../../services/modules/productCategoryApi";

import "./category-details.css";

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

const getErrorMessage = (error) => {
  const body = error?.response?.data;

  if (
    Array.isArray(body?.errors) &&
    body.errors.length
  ) {
    return body.errors
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.message ||
            item?.msg ||
            "Validation failed",
      )
      .join(", ");
  }

  return (
    body?.message ||
    error?.message ||
    "Unable to complete the request."
  );
};

const extractCategory = (response) => {
  const record =
    response?.data?.data ||
    response?.data?.category;

  if (
    !record?._id ||
    !record?.categoryCode
  ) {
    throw new Error(
      "The server did not return a valid category.",
    );
  }

  return record;
};

const formatDateTime = (value) => {
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

function DetailItem({
  label,
  children,
  fullWidth = false,
}) {
  const empty =
    children === undefined ||
    children === null ||
    children === "";

  return (
    <div
      className={[
        "category-details-item",
        fullWidth
          ? "category-details-item--full"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="category-details-label">
        {label}
      </span>

      <div className="category-details-value">
        {empty ? "—" : children}
      </div>
    </div>
  );
}

function CategoryDetailsModal({
  isOpen,
  onClose,
  category,
  mode = "view",
  onUpdated,
}) {
  const categoryCode =
    category?.categoryCode;

  const isEditMode =
    mode === "edit";

  const [record, setRecord] =
    useState(null);

  const [formData, setFormData] =
    useState({
      description: "",
      status: "ACTIVE",
    });

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [loadError, setLoadError] =
    useState("");

  const [error, setError] =
    useState("");

  const [uncertain, setUncertain] =
    useState(false);

  const [needsReload, setNeedsReload] =
    useState(false);

  const [reloadKey, setReloadKey] =
    useState(0);

  const submitLockRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    let cancelled = false;

    setRecord(null);
    setLoading(true);
    setLoadError("");
    setError("");
    setUncertain(false);
    setNeedsReload(false);

    const loadCategory = async () => {
      try {
        if (!categoryCode) {
          throw new Error(
            "Category code is missing.",
          );
        }

        const response =
          await productCategoryApi.getByCode(
            categoryCode,
          );

        const current =
          extractCategory(response);

        if (cancelled) {
          return;
        }

        setRecord(current);

        setFormData({
          description:
            current.description ?? "",

          status:
            current.status,
        });
      } catch (requestError) {
        if (!cancelled) {
          setLoadError(
            getErrorMessage(requestError),
          );
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
  }, [
    isOpen,
    categoryCode,
    isEditMode,
    reloadKey,
  ]);

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  const handleClose = () => {
    if (
      !saving &&
      !submitLockRef.current
    ) {
      onClose?.();
    }
  };

  const reloadCategory = () => {
    if (
      saving ||
      submitLockRef.current
    ) {
      return;
    }

    setReloadKey(
      (value) => value + 1,
    );
  };

  const buildPayload = () => {
    if (
      !record ||
      !Number.isSafeInteger(record.__v) ||
      record.__v < 0
    ) {
      throw new Error(
        "Category version is missing. Reload the category.",
      );
    }

    const description =
      formData.description.trim() || null;

    if (
      description &&
      description.length > 1000
    ) {
      throw new Error(
        "Description cannot exceed 1000 characters.",
      );
    }

    if (
      !["ACTIVE", "INACTIVE"].includes(
        formData.status,
      )
    ) {
      throw new Error(
        "Select a valid status.",
      );
    }

    const payload = {
      version: record.__v,
    };

    const originalDescription =
      String(record.description ?? "")
        .trim() || null;

    if (
      description !== originalDescription
    ) {
      payload.description =
        description;
    }

    if (
      formData.status !== record.status
    ) {
      payload.status =
        formData.status;
    }

    if (
      Object.keys(payload).length === 1
    ) {
      throw new Error(
        "No changes to save.",
      );
    }

    return payload;
  };

  const handleSave = async () => {
    if (
      !isEditMode ||
      loading ||
      saving ||
      loadError ||
      uncertain ||
      needsReload ||
      submitLockRef.current
    ) {
      return;
    }

    let payload;

    try {
      payload = buildPayload();
    } catch (validationError) {
      setError(
        validationError.message,
      );

      return;
    }

    submitLockRef.current = true;
    setSaving(true);
    setError("");

    let confirmed = false;

    try {
      const response =
        await productCategoryApi.update(
          record.categoryCode,
          payload,
        );

      const updatedCategory =
        extractCategory(response);

      confirmed = true;

      onUpdated?.(updatedCategory);

      toast.success(
        "Category updated successfully",
      );

      onClose?.();
    } catch (requestError) {
      const status =
        requestError?.response?.status;

      if (
        confirmed ||
        !status ||
        status >= 500 ||
        status === 408
      ) {
        setUncertain(true);

        const message =
          "The update may already have been saved. Close this modal and refresh the Categories list before editing again.";

        setError(message);
        toast.error(message);
      } else {
        if (status === 409) {
          setNeedsReload(true);
        }

        const message =
          getErrorMessage(requestError);

        setError(message);
        toast.error(message);
      }
    } finally {
      submitLockRef.current = false;
      setSaving(false);
    }
  };

  const disabled =
    loading ||
    saving ||
    Boolean(loadError) ||
    !record ||
    uncertain ||
    needsReload;

  const footer = (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={handleClose}
        disabled={saving}
      >
        {isEditMode
          ? "Cancel"
          : "Close"}
      </Button>

      {isEditMode && (
        <div className="box-modal-footer-actions category-details-footer-actions">
          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            loading={saving}
            disabled={disabled}
          >
            {saving
              ? "Updating..."
              : "Update Category"}
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
        isEditMode
          ? "Edit Category"
          : "Category Details"
      }
      subtitle={
        record?.categoryCode ||
        categoryCode ||
        "Category information"
      }
      width="min(620px, calc(100vw - 24px))"
      footer={footer}
    >
      <div className="category-details-content">
        {loading && (
          <div
            className="category-details-notice"
            role="status"
          >
            Loading latest category information…
          </div>
        )}

        {loadError && (
          <div
            className="category-details-notice category-details-notice--error"
            role="alert"
          >
            <p>{loadError}</p>

            <Button
              type="button"
              variant="secondary"
              onClick={reloadCategory}
              disabled={loading || saving}
            >
              Retry
            </Button>
          </div>
        )}

        {error && (
          <div
            className="category-details-notice category-details-notice--error"
            role="alert"
          >
            <p>{error}</p>

            {needsReload &&
              !uncertain && (
                <>
                  <p>
                    Reloading replaces your
                    unsaved description and
                    status with the latest
                    saved values.
                  </p>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={reloadCategory}
                    disabled={saving}
                  >
                    Reload Latest Category
                  </Button>
                </>
              )}
          </div>
        )}

        {!loading &&
          !loadError &&
          record && (
            <>
              <div className="box-modal-section">
                <div className="box-modal-section-header">
                  <div className="box-modal-section-icon">
                    {isEditMode ? (
                      <Pencil
                        size={17}
                        aria-hidden="true"
                      />
                    ) : (
                      <FolderTree
                        size={17}
                        aria-hidden="true"
                      />
                    )}
                  </div>

                  <div className="box-modal-section-header-content">
                    <h3>
                      Category Information
                    </h3>

                    <p>
                      {isEditMode
                        ? "Update description and availability"
                        : "Saved category details"}
                    </p>
                  </div>
                </div>

                {isEditMode ? (
                  <div className="box-modal-form-grid category-details-form-grid">
                    <Input
                      label="Category Code"
                      name="categoryCode"
                      value={
                        record.categoryCode
                      }
                      disabled
                    />

                    <Input
                      label="Category Name"
                      name="name"
                      value={record.name}
                      disabled
                    />

                    <Select
                      label="Status"
                      name="status"
                      value={formData.status}
                      options={
                        STATUS_OPTIONS
                      }
                      onChange={
                        handleChange
                      }
                      disabled={disabled}
                    />

                    <div className="box-modal-form-full">
                      <Textarea
                        label="Description"
                        name="description"
                        value={
                          formData.description
                        }
                        onChange={
                          handleChange
                        }
                        placeholder="Describe this category..."
                        rows={4}
                        maxLength={1000}
                        disabled={disabled}
                      />

                      <p className="category-details-counter">
                        {
                          formData.description
                            .length
                        }
                        /1000 characters
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="category-details-grid">
                    <DetailItem label="Category Code">
                      {
                        record.categoryCode
                      }
                    </DetailItem>

                    <DetailItem label="Status">
                      <StatusField
                        value={
                          record.status
                        }
                      />
                    </DetailItem>

                    <DetailItem
                      label="Category Name"
                      fullWidth
                    >
                      {record.name}
                    </DetailItem>

                    <DetailItem
                      label="Description"
                      fullWidth
                    >
                      {record.description ||
                        "No description added."}
                    </DetailItem>
                  </div>
                )}
              </div>

              <div className="category-details-info">
                <Info
                  size={16}
                  aria-hidden="true"
                />

                <p>
                  {isEditMode
                    ? "Category name and code are protected. Deactivating this category prevents new assignments; existing Product category values remain unchanged."
                    : "This category groups Products and services. Its status controls availability for new category assignments."}
                </p>
              </div>

              <div className="box-modal-section">
                <div className="box-modal-section-header">
                  <div className="box-modal-section-icon">
                    <FileText
                      size={17}
                      aria-hidden="true"
                    />
                  </div>

                  <div className="box-modal-section-header-content">
                    <h3>Record Information</h3>
                    <p>Creation and update history</p>
                  </div>
                </div>

                <div className="category-details-grid">
                  <DetailItem label="Created At">
                    {formatDateTime(
                      record.createdAt,
                    )}
                  </DetailItem>

                  <DetailItem label="Last Updated">
                    {formatDateTime(
                      record.updatedAt,
                    )}
                  </DetailItem>

                  <DetailItem
                    label="Record ID"
                    fullWidth
                  >
                    {record._id}
                  </DetailItem>
                </div>
              </div>
            </>
          )}
      </div>
    </BoxModal>
  );
}

export default CategoryDetailsModal;