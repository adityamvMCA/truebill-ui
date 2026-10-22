import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Eye,
  FileText,
  IndianRupee,
  Package,
  Pencil,
  Settings,
} from "lucide-react";

import toast from "react-hot-toast";

import Input from "../../components/common/Form/Input";
import Select from "../../components/common/Form/Select";
import Textarea from "../../components/common/Form/Textarea";
import SectionModal from "../../components/common/Modal/SectionModal";
import StatusField from "../../components/common/StatusField/StatusField";

import api from "../../services/api";

import "./product-details.css";

const SECTIONS = [
  {
    id: "basic",
    label: "Basic Details",
    icon: FileText,
  },
  {
    id: "pricing",
    label: "Pricing & Tax",
    icon: IndianRupee,
  },
  {
    id: "inventory",
    label: "Inventory",
    icon: Package,
  },
  {
    id: "advanced",
    label: "Record Details",
    icon: Settings,
  },
];

const EMPTY_MASTERS = {
  categories: [],
  brands: [],
  units: [],
  hsnSacCodes: [],
  taxRates: [],
};

const TYPE_OPTIONS = [
  {
    value: "GOODS",
    label: "Goods",
  },
  {
    value: "SERVICE",
    label: "Service",
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

const TRACKING_OPTIONS = [
  {
    value: "true",
    label: "Yes",
  },
  {
    value: "false",
    label: "No",
  },
];

const MONEY_FORMATTER = new Intl.NumberFormat(
  "en-IN",
  {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  },
);

const QUANTITY_FORMATTER = new Intl.NumberFormat(
  "en-IN",
  {
    maximumFractionDigits: 3,
  },
);

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

const extractProduct = (response) => {
  const body = response?.data;

  const record =
    body?.data ||
    body?.product;

  if (
    !record?._id ||
    !record?.productCode
  ) {
    throw new Error(
      "The server did not return a valid Product.",
    );
  }

  return record;
};

const loadAllPages = async (
  getter,
  params = {},
) => {
  const first = await getter({
    ...params,
    page: 1,
    limit: 100,
  });

  if (!Array.isArray(first?.data?.data)) {
    throw new Error(
      "The server returned an invalid master list.",
    );
  }

  const records = [...first.data.data];

  const totalPages = Number(
    first.data.pagination?.totalPages ?? 1,
  );

  if (
    !Number.isSafeInteger(totalPages) ||
    totalPages < 0
  ) {
    throw new Error(
      "The server returned invalid master pagination.",
    );
  }

  for (
    let page = 2;
    page <= totalPages;
    page += 1
  ) {
    const response = await getter({
      ...params,
      page,
      limit: 100,
    });

    if (
      !Array.isArray(response?.data?.data)
    ) {
      throw new Error(
        "Unable to read a master-data page.",
      );
    }

    records.push(...response.data.data);
  }

  return records;
};

const toFormData = (record) => ({
  ...record,

  category: record.category ?? "",
  brand: record.brand ?? "",
  description: record.description ?? "",
  hsnSacCode: record.hsnSacCode ?? "",

  gstRate: String(record.gstRate ?? 0),
  salePrice: String(record.salePrice ?? 0),
  purchasePrice: String(record.purchasePrice ?? 0),
  reorderLevel: String(record.reorderLevel ?? 0),

  trackInventory:
    record.type === "GOODS" &&
    record.trackInventory === true,
});

const toEditableValues = (record) => {
  const isService =
    record.type === "SERVICE";

  const trackInventory =
    !isService &&
    record.trackInventory === true;

  return {
    name: String(record.name ?? "").trim(),
    type: record.type,

    category:
      String(record.category ?? "").trim() || null,

    brand:
      String(record.brand ?? "").trim() || null,

    description:
      String(record.description ?? "").trim() || null,

    unit: record.unit,

    hsnSacCode:
      String(record.hsnSacCode ?? "").trim() || null,

    gstRate: Number(record.gstRate),
    salePrice: Number(record.salePrice),
    purchasePrice: Number(record.purchasePrice),

    trackInventory,

    reorderLevel:
      trackInventory
        ? Number(record.reorderLevel)
        : 0,

    status: record.status,
  };
};

const withCurrentOption = (
  options,
  currentValue,
) => {
  if (
    currentValue === undefined ||
    currentValue === null ||
    currentValue === ""
  ) {
    return options;
  }

  if (
    options.some(
      (option) =>
        String(option.value) ===
        String(currentValue),
    )
  ) {
    return options;
  }

  return [
    ...options,
    {
      value: currentValue,
      label: `${currentValue} — current value`,
    },
  ];
};

const formatCurrency = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? MONEY_FORMATTER.format(number)
    : "—";
};

const formatQuantity = (
  value,
  unit = "",
) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "—";
  }

  return [
    QUANTITY_FORMATTER.format(number),
    unit,
  ]
    .filter(Boolean)
    .join(" ");
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
        "product-detail-item",
        fullWidth
          ? "product-detail-full"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="product-detail-label">
        {label}
      </span>

      <div className="product-detail-value">
        {empty ? "—" : children}
      </div>
    </div>
  );
}

function ProductDetailsModal({
  isOpen,
  onClose,
  product,
  mode = "view",
  onUpdated,
}) {
  const productCode =
    product?.productCode;

  const isEditMode =
    mode === "edit";

  const [activeSection, setActiveSection] =
    useState("basic");

  const [original, setOriginal] =
    useState(null);

  const [formData, setFormData] =
    useState(null);

  const [masters, setMasters] =
    useState(EMPTY_MASTERS);

  const [loading, setLoading] =
    useState(false);

  const [loadError, setLoadError] =
    useState("");

  const [error, setError] =
    useState("");

  const [saving, setSaving] =
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

    setActiveSection("basic");
    setOriginal(null);
    setFormData(null);
    setMasters(EMPTY_MASTERS);
    setLoading(true);
    setLoadError("");
    setError("");
    setUncertain(false);

    const load = async () => {
      try {
        if (!productCode) {
          throw new Error(
            "Product code is missing.",
          );
        }

        const response =
          await api.product.getByCode(
            productCode,
          );

        const record =
          extractProduct(response);

        let masterData =
          EMPTY_MASTERS;

        if (isEditMode) {
          const [
            categories,
            brands,
            units,
            hsnSacCodes,
            taxRates,
          ] = await Promise.all([
            loadAllPages(
              api.productForm.getCategories,
              { status: "ACTIVE" },
            ),

            loadAllPages(
              api.productForm.getBrands,
              { status: "ACTIVE" },
            ),

            loadAllPages(
              api.productForm.getUnits,
              { status: "ACTIVE" },
            ),

            loadAllPages(
              api.productForm.getHsnSacCodes,
              { status: "ACTIVE" },
            ),

            loadAllPages(
              api.productForm.getTaxRates,
              {
                status: "ACTIVE",
                taxType: "GST",
              },
            ),
          ]);

          masterData = {
            categories: categories.filter(
              (item) =>
                item.status === "ACTIVE",
            ),

            brands: brands.filter(
              (item) =>
                item.status === "ACTIVE",
            ),

            units: units.filter(
              (item) =>
                item.status === "ACTIVE",
            ),

            hsnSacCodes: hsnSacCodes.filter(
              (item) =>
                item.status === "ACTIVE",
            ),

            taxRates: taxRates.filter(
              (item) =>
                item.status === "ACTIVE" &&
                item.taxType === "GST",
            ),
          };
        }

        if (cancelled) {
          return;
        }

        setOriginal(record);
        setFormData(toFormData(record));
        setMasters(masterData);
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

    load();

    return () => {
      cancelled = true;
    };
  }, [
    isOpen,
    productCode,
    isEditMode,
    reloadKey,
  ]);

  const isService =
    formData?.type === "SERVICE";

  const inventoryEnabled =
    formData?.type === "GOODS" &&
    formData?.trackInventory === true;

  const openingInventoryValue = useMemo(() => {
    if (!original) {
      return 0;
    }

    return (
      Number(original.openingStock ?? 0) *
      Number(original.openingStockRate ?? 0)
    );
  }, [original]);

  const updateField = (field, value) => {
    setFormData((previous) => {
      if (!previous) {
        return previous;
      }

      const next = {
        ...previous,
        [field]: value,
      };

      if (
        field === "type" &&
        value === "SERVICE"
      ) {
        next.trackInventory = false;
        next.reorderLevel = "0";
      }

      if (
        field === "trackInventory" &&
        value === false
      ) {
        next.reorderLevel = "0";
      }

      return next;
    });

    setError("");
  };

  const categoryOptions =
    withCurrentOption(
      [
        {
          value: "",
          label: "No category",
        },

        ...masters.categories.map(
          (item) => ({
            value: item.name,
            label: item.name,
          }),
        ),
      ],
      original?.category,
    );

  const brandOptions =
    withCurrentOption(
      [
        {
          value: "",
          label: "No brand",
        },

        ...masters.brands.map(
          (item) => ({
            value: item.name,
            label: item.name,
          }),
        ),
      ],
      original?.brand,
    );

  const unitOptions =
    withCurrentOption(
      masters.units.map((item) => ({
        value: item.unitCode,

        label:
          `${item.unitCode} — ${item.name}`,
      })),
      original?.unit,
    );

  const hsnOptions =
    withCurrentOption(
      [
        {
          value: "",
          label: "Not specified",
        },

        ...masters.hsnSacCodes.map(
          (item) => ({
            value: item.code,

            label: item.description
              ? `${item.code} — ${item.description}`
              : item.code,
          }),
        ),
      ],
      original?.hsnSacCode,
    );

  const rateOptions =
    withCurrentOption(
      masters.taxRates.map(
        (item) => ({
          value: String(item.rate),
          label: `${item.rate}% — ${item.name}`,
        }),
      ),
      original?.gstRate == null
        ? ""
        : String(original.gstRate),
    );

  const buildUpdatePayload = () => {
    const next =
      toEditableValues(formData);

    const baseline =
      toEditableValues(original);

    const payload =
      Object.fromEntries(
        Object.entries(next).filter(
          ([field, value]) =>
            !Object.is(
              value,
              baseline[field],
            ),
        ),
      );

    const fail = (
      section,
      message,
    ) => {
      setActiveSection(section);
      throw new Error(message);
    };

    if (!Object.keys(payload).length) {
      throw new Error(
        "No changes to save.",
      );
    }

    if (
      "name" in payload &&
      (
        payload.name.length < 2 ||
        payload.name.length > 200
      )
    ) {
      fail(
        "basic",
        "Product name must contain 2–200 characters.",
      );
    }

    const selections = [
      {
        field: "category",
        section: "basic",
        values: masters.categories.map(
          (item) => item.name,
        ),
        optional: true,
      },
      {
        field: "brand",
        section: "basic",
        values: masters.brands.map(
          (item) => item.name,
        ),
        optional: true,
      },
      {
        field: "unit",
        section: "basic",
        values: masters.units.map(
          (item) => item.unitCode,
        ),
      },
      {
        field: "hsnSacCode",
        section: "pricing",
        values: masters.hsnSacCodes.map(
          (item) => item.code,
        ),
        optional: true,
      },
      {
        field: "gstRate",
        section: "pricing",
        values: masters.taxRates.map(
          (item) => item.rate,
        ),
      },
    ];

    for (const selection of selections) {
      if (
        !(selection.field in payload)
      ) {
        continue;
      }

      const value =
        payload[selection.field];

      if (
        selection.optional &&
        value === null
      ) {
        continue;
      }

      if (
        !selection.values.includes(value)
      ) {
        fail(
          selection.section,
          `Select an active ${selection.field} value.`,
        );
      }
    }

    for (const rule of [
      {
        field: "salePrice",
        label: "Sale price",
        section: "pricing",
        maximum: 1000000000,
        scale: 100,
      },
      {
        field: "purchasePrice",
        label: "Purchase price",
        section: "pricing",
        maximum: 1000000000,
        scale: 100,
      },
      {
        field: "reorderLevel",
        label: "Reorder level",
        section: "inventory",
        maximum: 1000000,
        scale: 1000,
      },
    ]) {
      if (!(rule.field in payload)) {
        continue;
      }

      const raw =
        formData[rule.field];

      const value =
        payload[rule.field];

      if (
        String(raw).trim() === "" &&
        !(
          rule.field === "reorderLevel" &&
          !next.trackInventory
        )
      ) {
        fail(
          rule.section,
          `${rule.label} is required. Enter 0 if not applicable.`,
        );
      }

      if (
        !Number.isFinite(value) ||
        value < 0 ||
        value > rule.maximum
      ) {
        fail(
          rule.section,
          `${rule.label} must be between 0 and ${rule.maximum}.`,
        );
      }

      const scaled =
        value * rule.scale;

      const integer =
        Math.round(scaled);

      if (
        !Number.isSafeInteger(integer) ||
        Math.abs(scaled - integer) >
          0.000001
      ) {
        fail(
          rule.section,
          `${rule.label} has too many decimal places.`,
        );
      }
    }

    if (
      "description" in payload &&
      (payload.description?.length ?? 0) >
        1000
    ) {
      fail(
        "basic",
        "Description cannot exceed 1000 characters.",
      );
    }

    return payload;
  };

  const handleSave = async () => {
    if (
      !isEditMode ||
      !original ||
      loading ||
      loadError ||
      saving ||
      uncertain ||
      submitLockRef.current
    ) {
      return;
    }

    let payload;

    try {
      payload =
        buildUpdatePayload();
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
        await api.product.update(
          original.productCode,
          payload,
        );

      const updatedProduct =
        extractProduct(response);

      confirmed = true;

      onUpdated?.(updatedProduct);

      toast.success(
        `${updatedProduct.name} updated successfully`,
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
          "The update may already have been saved. Close this modal and refresh the Product list before editing again.";

        setError(message);
        toast.error(message);
      } else {
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

  const handleClose = () => {
    if (
      !saving &&
      !submitLockRef.current
    ) {
      onClose?.();
    }
  };

  const renderBasic = () => {
    if (!isEditMode) {
      return (
        <div className="product-detail-grid">
          <DetailItem label="Product Code">
            {formData.productCode}
          </DetailItem>

          <DetailItem label="Status">
            <StatusField
              value={formData.status}
            />
          </DetailItem>

          <DetailItem label="Product Name">
            {formData.name}
          </DetailItem>

          <DetailItem label="Type">
            <StatusField
              value={formData.type}
            />
          </DetailItem>

          <DetailItem label="Category">
            {formData.category}
          </DetailItem>

          <DetailItem label="Brand">
            {formData.brand}
          </DetailItem>

          <DetailItem label="Unit">
            {formData.unit}
          </DetailItem>

          <DetailItem label="Track Inventory">
            {inventoryEnabled
              ? "Yes"
              : "No"}
          </DetailItem>

          <DetailItem
            label="Description"
            fullWidth
          >
            {formData.description}
          </DetailItem>
        </div>
      );
    }

    return (
      <div className="section-form-grid">
        <Input
          label="Product Code"
          name="productCode"
          value={formData.productCode}
          readOnly
        />

        <Select
          label="Status"
          name="status"
          value={formData.status}
          options={STATUS_OPTIONS}
          onChange={(event) =>
            updateField(
              "status",
              event.target.value,
            )
          }
        />

        <Input
          label="Product Name"
          name="name"
          value={formData.name}
          maxLength={200}
          onChange={(event) =>
            updateField(
              "name",
              event.target.value,
            )
          }
          required
        />

        <Select
          label="Product Type"
          name="type"
          value={formData.type}
          options={TYPE_OPTIONS}
          onChange={(event) =>
            updateField(
              "type",
              event.target.value,
            )
          }
        />

        <Select
          label="Category"
          name="category"
          value={formData.category}
          options={categoryOptions}
          onChange={(event) =>
            updateField(
              "category",
              event.target.value,
            )
          }
        />

        <Select
          label="Brand"
          name="brand"
          value={formData.brand}
          options={brandOptions}
          onChange={(event) =>
            updateField(
              "brand",
              event.target.value,
            )
          }
        />

        <Select
          label="Unit"
          name="unit"
          value={formData.unit}
          options={unitOptions}
          onChange={(event) =>
            updateField(
              "unit",
              event.target.value,
            )
          }
        />

        <div className="section-form-full">
          <Textarea
            label="Description"
            name="description"
            value={formData.description}
            maxLength={1000}
            rows={4}
            onChange={(event) =>
              updateField(
                "description",
                event.target.value,
              )
            }
          />
        </div>

        <div className="section-form-full product-details-info">
          Existing values can remain unchanged.
          New selections must be active.
          Product type, unit, and inventory
          tracking changes are checked by the
          backend against stock history.
        </div>
      </div>
    );
  };

  const renderPricing = () => {
    if (!isEditMode) {
      return (
        <div className="product-detail-grid">
          <DetailItem
            label={
              isService
                ? "SAC Code"
                : "HSN Code"
            }
          >
            {formData.hsnSacCode}
          </DetailItem>

          <DetailItem label="GST Rate">
            {`${formData.gstRate}%`}
          </DetailItem>

          <DetailItem label="Sale Price">
            {formatCurrency(
              formData.salePrice,
            )}
          </DetailItem>

          <DetailItem label="Purchase Price">
            {formatCurrency(
              formData.purchasePrice,
            )}
          </DetailItem>
        </div>
      );
    }

    return (
      <div className="section-form-grid">
        <Select
          label={
            isService
              ? "SAC Code"
              : "HSN Code"
          }
          name="hsnSacCode"
          value={formData.hsnSacCode}
          options={hsnOptions}
          onChange={(event) =>
            updateField(
              "hsnSacCode",
              event.target.value,
            )
          }
        />

        <Select
          label="GST Rate"
          name="gstRate"
          value={formData.gstRate}
          options={rateOptions}
          onChange={(event) =>
            updateField(
              "gstRate",
              event.target.value,
            )
          }
        />

        {[
          ["salePrice", "Sale Price"],
          ["purchasePrice", "Purchase Price"],
        ].map(([field, label]) => (
          <Input
            key={field}
            label={label}
            name={field}
            type="number"
            inputMode="decimal"
            min="0"
            max="1000000000"
            step="0.01"
            value={formData[field]}
            onChange={(event) =>
              updateField(
                field,
                event.target.value,
              )
            }
          />
        ))}
      </div>
    );
  };

  const renderInventory = () => (
    <>
      {isEditMode && (
        <div className="section-form-grid">
          <Select
            label="Track Inventory"
            name="trackInventory"
            value={String(
              formData.trackInventory,
            )}
            options={TRACKING_OPTIONS}
            disabled={isService}
            onChange={(event) =>
              updateField(
                "trackInventory",
                event.target.value === "true",
              )
            }
          />

          <Input
            label="Reorder Level"
            name="reorderLevel"
            type="number"
            inputMode="decimal"
            min="0"
            max="1000000"
            step="0.001"
            value={formData.reorderLevel}
            disabled={!inventoryEnabled}
            onChange={(event) =>
              updateField(
                "reorderLevel",
                event.target.value,
              )
            }
          />
        </div>
      )}

      <div className="product-detail-grid product-details-stock">
        <DetailItem label="Current Combined Stock">
          {original.type === "GOODS" &&
          original.trackInventory
            ? formatQuantity(
                original.currentStock,
                original.unit,
              )
            : "Not applicable"}
        </DetailItem>

        <DetailItem label="Opening Stock">
          {original.type === "GOODS" &&
          original.trackInventory
            ? formatQuantity(
                original.openingStock,
                original.unit,
              )
            : "Not applicable"}
        </DetailItem>

        <DetailItem label="Opening Stock Rate">
          {original.type === "GOODS" &&
          original.trackInventory
            ? formatCurrency(
                original.openingStockRate,
              )
            : "Not applicable"}
        </DetailItem>

        <DetailItem label="Opening Inventory Value">
          {original.type === "GOODS" &&
          original.trackInventory
            ? formatCurrency(
                openingInventoryValue,
              )
            : "Not applicable"}
        </DetailItem>

        {!isEditMode && (
          <DetailItem label="Reorder Level">
            {inventoryEnabled
              ? formatQuantity(
                  formData.reorderLevel,
                  formData.unit,
                )
              : "Not applicable"}
          </DetailItem>
        )}
      </div>
    </>
  );

  const renderAdvanced = () => (
    <div className="product-detail-grid">
      <DetailItem label="Created At">
        {formatDateTime(
          original.createdAt,
        )}
      </DetailItem>

      <DetailItem label="Last Updated">
        {formatDateTime(
          original.updatedAt,
        )}
      </DetailItem>

      <DetailItem
        label="Product ID"
        fullWidth
      >
        {original._id}
      </DetailItem>
    </div>
  );

  const renderSection = () => {
    switch (activeSection) {
      case "basic":
        return renderBasic();

      case "pricing":
        return renderPricing();

      case "inventory":
        return renderInventory();

      case "advanced":
        return renderAdvanced();

      default:
        return null;
    }
  };

  return (
    <SectionModal
      show={isOpen}
      onClose={handleClose}
      title={
        isEditMode
          ? "Edit Product"
          : "Product Details"
      }
      subtitle={
        original?.productCode ||
        productCode ||
        "Product information"
      }
      icon={
        isEditMode
          ? Pencil
          : Eye
      }
      sections={SECTIONS}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      onSave={
        isEditMode
          ? handleSave
          : undefined
      }
      saveText="Update Product"
      saveLoading={saving}
      saveDisabled={
        loading ||
        Boolean(loadError) ||
        !formData ||
        uncertain
      }
      showSecondary={false}
      className="product-details-modal"
    >
      {loading && (
        <div
          className="product-details-notice"
          role="status"
        >
          Loading current Product information…
        </div>
      )}

      {loadError && (
        <div
          className="product-details-notice product-details-notice--error"
          role="alert"
        >
          <p>{loadError}</p>

          <button
            type="button"
            className="product-details-retry"
            onClick={() =>
              setReloadKey(
                (value) => value + 1,
              )
            }
          >
            Retry
          </button>
        </div>
      )}

      {error && (
        <div
          className="product-details-notice product-details-notice--error"
          role="alert"
        >
          {error}
        </div>
      )}

      {!loading &&
        !loadError &&
        original &&
        formData && (
          <fieldset
            className="product-details-fieldset"
            disabled={
              saving || uncertain
            }
          >
            <div className="section-form-title">
              <h3>
                {
                  SECTIONS.find(
                    (section) =>
                      section.id ===
                      activeSection,
                  )?.label
                }
              </h3>

              <p>
                {isEditMode
                  ? "Only changed fields will be submitted."
                  : "Latest saved Product information."}
              </p>
            </div>

            {renderSection()}
          </fieldset>
        )}
    </SectionModal>
  );
}

export default ProductDetailsModal;