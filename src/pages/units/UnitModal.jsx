import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  FileText,
  Info,
  Ruler,
} from "lucide-react";

import toast from "react-hot-toast";

import Button from "../../components/common/Form/Button";
import Input from "../../components/common/Form/Input";
import Select from "../../components/common/Form/Select";
import Textarea from "../../components/common/Form/Textarea";
import BoxModal from "../../components/common/Modal/BoxModal";
import StatusField from "../../components/common/StatusField/StatusField";

import productUnitApi from "../../services/modules/productUnitApi";

import "./units.css";

const INITIAL_FORM = {
  unitCode: "",
  name: "",
  symbol: "",
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

const nullableText = (value) =>
  String(value ?? "").trim() || null;

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

const extractUnit = (response) => {
  const unit =
    response?.data?.data ||
    response?.data?.unit;

  if (!unit?._id || !unit?.unitCode) {
    throw new Error(
      "The server did not return a valid unit.",
    );
  }

  return unit;
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
        "unit-detail-item",
        fullWidth
          ? "unit-detail-item--full"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="unit-detail-label">
        {label}
      </span>

      <div className="unit-detail-value">
        {empty ? "—" : children}
      </div>
    </div>
  );
}

function UnitModal({
  isOpen,
  onClose,
  onSave,
  unit = null,
  mode = "create",
}) {
  const isCreateMode =
    mode === "create";

  const isViewMode =
    mode === "view";

  const isEditMode =
    mode === "edit";

  const unitCode =
    unit?.unitCode;

  const [record, setRecord] =
    useState(null);

  const [formData, setFormData] =
    useState({ ...INITIAL_FORM });

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [loadError, setLoadError] =
    useState("");

  const [error, setError] =
    useState("");

  const [needsReload, setNeedsReload] =
    useState(false);

  const [uncertain, setUncertain] =
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
    setFormData({ ...INITIAL_FORM });
    setLoadError("");
    setError("");
    setNeedsReload(false);
    setUncertain(false);

    if (isCreateMode) {
      setLoading(false);
      return undefined;
    }

    const loadUnit = async () => {
      setLoading(true);

      try {
        if (!unitCode) {
          throw new Error(
            "Unit code is missing.",
          );
        }

        const response =
          await productUnitApi.getByCode(
            unitCode,
          );

        const current =
          extractUnit(response);

        if (cancelled) {
          return;
        }

        setRecord(current);

        setFormData({
          unitCode: current.unitCode,
          name: current.name ?? "",
          symbol: current.symbol ?? "",
          description:
            current.description ?? "",
          status: current.status,
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

    loadUnit();

    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    isCreateMode,
    unitCode,
    mode,
    reloadKey,
  ]);

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setFormData((previous) => ({
      ...previous,

      [name]:
        name === "unitCode"
          ? value.toUpperCase()
          : value,
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

  const buildPayload = () => {
    const values = {
      unitCode:
        formData.unitCode
          .trim()
          .toUpperCase(),

      name:
        normalizeName(formData.name),

      symbol:
        nullableText(formData.symbol),

      description:
        nullableText(formData.description),

      status:
        formData.status,
    };

    if (
      !/^[A-Z][A-Z0-9_]{0,19}$/.test(
        values.unitCode,
      )
    ) {
      throw new Error(
        "Unit code must start with a letter and contain up to 20 letters, numbers, or underscores.",
      );
    }

    if (
      !values.name ||
      values.name.length > 100
    ) {
      throw new Error(
        "Unit name must contain 1–100 characters.",
      );
    }

    if (
      values.symbol &&
      values.symbol.length > 20
    ) {
      throw new Error(
        "Symbol cannot exceed 20 characters.",
      );
    }

    if (
      values.description &&
      values.description.length > 1000
    ) {
      throw new Error(
        "Description cannot exceed 1000 characters.",
      );
    }

    if (
      !["ACTIVE", "INACTIVE"].includes(
        values.status,
      )
    ) {
      throw new Error(
        "Select a valid status.",
      );
    }

    if (isCreateMode) {
      return values;
    }

    if (
      !record ||
      !Number.isSafeInteger(record.__v) ||
      record.__v < 0
    ) {
      throw new Error(
        "Unit version is missing. Reload the unit.",
      );
    }

    const originalValues = {
      name:
        normalizeName(record.name),

      symbol:
        nullableText(record.symbol),

      description:
        nullableText(record.description),

      status:
        record.status,
    };

    const payload = {
      version: record.__v,
    };

    for (const field of [
      "name",
      "symbol",
      "description",
      "status",
    ]) {
      if (
        values[field] !==
        originalValues[field]
      ) {
        payload[field] =
          values[field];
      }
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
      const response = isCreateMode
        ? await productUnitApi.create(
            payload,
          )
        : await productUnitApi.update(
            record.unitCode,
            payload,
          );

      const savedUnit =
        extractUnit(response);

      confirmed = true;

      onSave?.(savedUnit);

      toast.success(
        isCreateMode
          ? "Unit created successfully"
          : "Unit updated successfully",
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
          "The save may already have completed. Close this modal and refresh Units before submitting again.";

        setError(message);
        toast.error(message);
      } else {
        if (
          isEditMode &&
          status === 409
        ) {
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
    needsReload ||
    uncertain;

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
        <div className="box-modal-footer-actions unit-modal-footer-actions">
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
                ? "Update Unit"
                : "Save Unit"}
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
          ? "Unit Details"
          : isEditMode
            ? "Edit Unit"
            : "New Unit"
      }
      subtitle={
        isCreateMode
          ? "Add a custom measurement unit"
          : unitCode || "Unit information"
      }
      width="min(620px, calc(100vw - 24px))"
      footer={footer}
    >
      <div className="unit-modal-content">
        {loading && (
          <div
            className="unit-notice"
            role="status"
          >
            Loading latest unit information…
          </div>
        )}

        {loadError && (
          <div
            className="unit-notice unit-notice--error"
            role="alert"
          >
            <p>{loadError}</p>

            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={() =>
                setReloadKey(
                  (value) => value + 1,
                )
              }
            >
              Retry
            </Button>
          </div>
        )}

        {error && (
          <div
            className="unit-notice unit-notice--error"
            role="alert"
          >
            <p>{error}</p>

            {needsReload &&
              !uncertain && (
                <>
                  <p>
                    Reloading replaces your
                    unsaved changes with the
                    latest saved values.
                  </p>

                  <Button
                    type="button"
                    variant="secondary"
                    disabled={saving}
                    onClick={() =>
                      setReloadKey(
                        (value) => value + 1,
                      )
                    }
                  >
                    Reload Latest Unit
                  </Button>
                </>
              )}
          </div>
        )}

        {!loading &&
          !loadError && (
            <>
              <div className="box-modal-section">
                <div className="box-modal-section-header">
                  <div className="box-modal-section-icon">
                    <Ruler
                      size={17}
                      aria-hidden="true"
                    />
                  </div>

                  <div className="box-modal-section-header-content">
                    <h3>Unit Information</h3>

                    <p>
                      Measurement code,
                      display name and symbol
                    </p>
                  </div>
                </div>

                {isViewMode ? (
                  <div className="unit-detail-grid">
                    <DetailItem label="Unit Code">
                      {record?.unitCode}
                    </DetailItem>

                    <DetailItem label="Status">
                      <StatusField
                        value={record?.status}
                      />
                    </DetailItem>

                    <DetailItem label="Unit Name">
                      {record?.name}
                    </DetailItem>

                    <DetailItem label="Symbol">
                      {record?.symbol}
                    </DetailItem>

                    <DetailItem label="Source">
                      {record?.isSystem
                        ? "Default unit"
                        : "Custom unit"}
                    </DetailItem>

                    <DetailItem
                      label="Description"
                      fullWidth
                    >
                      {record?.description ||
                        "No description added."}
                    </DetailItem>
                  </div>
                ) : (
                  <div className="box-modal-form-grid unit-form-grid">
                    <Input
                      label="Unit Code"
                      name="unitCode"
                      value={formData.unitCode}
                      onChange={handleChange}
                      placeholder="Example: BUNDLE"
                      maxLength={20}
                      required
                      disabled={
                        disabled || isEditMode
                      }
                    />

                    <Input
                      label="Unit Name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Example: Bundle"
                      maxLength={100}
                      required
                      disabled={disabled}
                    />

                    <Input
                      label="Symbol"
                      name="symbol"
                      value={formData.symbol}
                      onChange={handleChange}
                      placeholder="Example: bundle"
                      maxLength={20}
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
                        value={
                          formData.description
                        }
                        onChange={handleChange}
                        placeholder="Describe this unit..."
                        rows={4}
                        maxLength={1000}
                        disabled={disabled}
                      />

                      <p className="unit-field-hint">
                        {
                          formData.description
                            .length
                        }
                        /1000 characters
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {record && (
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

                  <div className="unit-detail-grid">
                    <DetailItem label="Created At">
                      {formatDate(
                        record.createdAt,
                      )}
                    </DetailItem>

                    <DetailItem label="Last Updated">
                      {formatDate(
                        record.updatedAt,
                      )}
                    </DetailItem>
                  </div>
                </div>
              )}
            </>
          )}
      </div>
    </BoxModal>
  );
}

export default UnitModal;