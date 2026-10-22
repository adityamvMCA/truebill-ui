import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  FileText,
  IndianRupee,
  Package,
  Settings,
} from "lucide-react";

import toast from "react-hot-toast";

import Input from "../../components/common/Form/Input";
import Select from "../../components/common/Form/Select";
import Textarea from "../../components/common/Form/Textarea";
import SectionModal from "../../components/common/Modal/SectionModal";

import api from "../../services/api";
import productFormApi from "../../services/modules/productFormApi";

import "./product-form.css";

const INITIAL_FORM_DATA = {
  name: "",
  type: "GOODS",
  category: "",
  brand: "",
  unit: "PCS",
  description: "",
  hsnSacCode: "",
  gstRate: "18",
  salePrice: "0",
  purchasePrice: "0",
  trackInventory: true,
  openingStock: "0",
  openingStockRate: "0",
  reorderLevel: "0",
  warehouseId: "",
  status: "ACTIVE",
};

const EMPTY_OPTIONS = {
  categories: [],
  brands: [],
  units: [],
  hsnSacCodes: [],
  taxRates: [],
  warehouses: [],
  inventorySettings: null,
};

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
    label: "Additional Details",
    icon: Settings,
  },
];

const PRODUCT_TYPES = [
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

const currencyFormatter = new Intl.NumberFormat(
  "en-IN",
  {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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
      "A master-data API returned an invalid list.",
    );
  }

  const records = [...first.data.data];

  const pages = Number(
    first.data.pagination?.totalPages ?? 1,
  );

  if (
    !Number.isSafeInteger(pages) ||
    pages < 0
  ) {
    throw new Error(
      "A master-data API returned invalid pagination.",
    );
  }

  for (
    let page = 2;
    page <= pages;
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

const numericValue = (
  value,
  label,
  maximum,
  scale,
) => {
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    throw new Error(
      `${label} is required. Enter 0 if not applicable.`,
    );
  }

  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    number < 0 ||
    number > maximum
  ) {
    throw new Error(
      `${label} must be between 0 and ${maximum}.`,
    );
  }

  if (scale) {
    const scaled = number * scale;
    const integer = Math.round(scaled);

    if (
      !Number.isSafeInteger(integer) ||
      Math.abs(scaled - integer) > 0.000001
    ) {
      throw new Error(
        `${label} has too many decimal places.`,
      );
    }
  }

  return number;
};

const ProductModal = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [activeSection, setActiveSection] =
    useState("basic");

  const [formData, setFormData] = useState({
    ...INITIAL_FORM_DATA,
  });

  const [options, setOptions] = useState({
    ...EMPTY_OPTIONS,
  });

  const [loadingOptions, setLoadingOptions] =
    useState(true);

  const [optionsError, setOptionsError] =
    useState("");

  const [reloadKey, setReloadKey] =
    useState(0);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [uncertain, setUncertain] =
    useState(false);

  const submitLockRef = useRef(false);

  const isService =
    formData.type === "SERVICE";

  const inventoryEnabled =
    !isService &&
    formData.trackInventory === true;

  const settings =
    options.inventorySettings;

  const needsOpeningWarehouse =
    inventoryEnabled &&
    Number(formData.openingStock) > 0 &&
    settings?.warehouseTrackingStatus === "READY" &&
    settings?.multiWarehouseEnabled === true;

  const blocked =
    saving ||
    loadingOptions ||
    Boolean(optionsError) ||
    !settings ||
    uncertain;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveSection("basic");
    setFormData({ ...INITIAL_FORM_DATA });
    setError("");
    setUncertain(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    let cancelled = false;

    const loadOptions = async () => {
      setLoadingOptions(true);
      setOptionsError("");
      setOptions({ ...EMPTY_OPTIONS });

      try {
        const [
          categories,
          brands,
          units,
          hsnSacCodes,
          taxRates,
          settingsResponse,
        ] = await Promise.all([
          loadAllPages(
            productFormApi.getCategories,
            { status: "ACTIVE" },
          ),

          loadAllPages(
            productFormApi.getBrands,
            { status: "ACTIVE" },
          ),

          loadAllPages(
            productFormApi.getUnits,
            { status: "ACTIVE" },
          ),

          loadAllPages(
            productFormApi.getHsnSacCodes,
            { status: "ACTIVE" },
          ),

          loadAllPages(
            productFormApi.getTaxRates,
            {
              status: "ACTIVE",
              taxType: "GST",
            },
          ),

          productFormApi.getInventorySettings(),
        ]);

        if (cancelled) {
          return;
        }

        const inventorySettings =
          settingsResponse?.data?.data;

        if (
          !inventorySettings ||
          typeof inventorySettings.multiWarehouseEnabled !==
            "boolean"
        ) {
          throw new Error(
            "Inventory settings were not returned correctly.",
          );
        }

        if (
          !["NOT_INITIALIZED", "READY"].includes(
            inventorySettings.warehouseTrackingStatus,
          )
        ) {
          throw new Error(
            "Inventory settings contain an invalid tracking status.",
          );
        }

        if (
          inventorySettings.multiWarehouseEnabled &&
          inventorySettings.warehouseTrackingStatus !==
            "READY"
        ) {
          throw new Error(
            "Multiple warehouses cannot be used before inventory initialization.",
          );
        }

        const activeUnits = units.filter(
          (unit) =>
            unit.status === "ACTIVE",
        );

        const activeRates = taxRates.filter(
          (rate) =>
            rate.status === "ACTIVE" &&
            rate.taxType === "GST",
        );

        let warehouses = [];

        if (
          inventorySettings.multiWarehouseEnabled
        ) {
          warehouses = await loadAllPages(
            productFormApi.getWarehouses,
            { status: "ACTIVE" },
          );
        }

        if (cancelled) {
          return;
        }

        setOptions({
          categories: categories.filter(
            (item) =>
              item.status === "ACTIVE",
          ),

          brands: brands.filter(
            (item) =>
              item.status === "ACTIVE",
          ),

          units: activeUnits,

          hsnSacCodes: hsnSacCodes.filter(
            (item) =>
              item.status === "ACTIVE",
          ),

          taxRates: activeRates,

          warehouses: warehouses.filter(
            (item) =>
              item.status === "ACTIVE",
          ),

          inventorySettings,
        });

        setFormData((previous) => {
          let unit =
            previous.unit ||
            INITIAL_FORM_DATA.unit;

          if (
            activeUnits.length > 0 &&
            !activeUnits.some(
              (item) =>
                item.unitCode === unit,
            )
          ) {
            unit = activeUnits.some(
              (item) =>
                item.unitCode === "NOS",
            )
              ? "NOS"
              : activeUnits[0].unitCode;
          }

          let gstRate =
            previous.gstRate === ""
              ? INITIAL_FORM_DATA.gstRate
              : String(previous.gstRate);

          if (
            activeRates.length > 0 &&
            !activeRates.some(
              (item) =>
                String(item.rate) === gstRate,
            )
          ) {
            gstRate = "";
          }

          return {
            ...previous,
            unit,
            gstRate,
          };
        });
      } catch (requestError) {
        if (!cancelled) {
          setOptionsError(
            getErrorMessage(requestError),
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingOptions(false);
        }
      }
    };

    loadOptions();

    return () => {
      cancelled = true;
    };
  }, [isOpen, reloadKey]);

  const updateField = (field, value) => {
    if (
      blocked ||
      submitLockRef.current
    ) {
      return;
    }

    setFormData((previous) => {
      const next = {
        ...previous,
        [field]: value,
      };

      if (
        field === "type" &&
        value === "SERVICE"
      ) {
        next.trackInventory = false;
        next.openingStock = "0";
        next.openingStockRate = "0";
        next.reorderLevel = "0";
        next.warehouseId = "";
      }

      if (
        field === "trackInventory" &&
        value === false
      ) {
        next.openingStock = "0";
        next.openingStockRate = "0";
        next.reorderLevel = "0";
        next.warehouseId = "";
      }

      if (
        field === "openingStock" &&
        !(Number(value) > 0)
      ) {
        next.warehouseId = "";
      }

      return next;
    });

    setError("");
  };

  const openingStockValue = useMemo(() => {
    if (!inventoryEnabled) {
      return 0;
    }

    const quantity =
      Number(formData.openingStock);

    const rate =
      Number(formData.openingStockRate);

    if (
      !Number.isFinite(quantity) ||
      !Number.isFinite(rate) ||
      quantity < 0 ||
      rate < 0
    ) {
      return null;
    }

    return quantity * rate;
  }, [
    inventoryEnabled,
    formData.openingStock,
    formData.openingStockRate,
  ]);

  const categoryOptions = [
    {
      value: "",
      label: "No category",
    },

    ...options.categories.map((item) => ({
      value: item.name,
      label: item.name,
    })),
  ];

  const brandOptions = [
    {
      value: "",
      label: "No brand",
    },

    ...options.brands.map((item) => ({
      value: item.name,
      label: item.name,
    })),
  ];

  const unitOptions = options.units.length
    ? options.units.map((item) => ({
        value: item.unitCode,
        label: `${item.unitCode} — ${item.name}`,
      }))
    : [
        {
          value:
            formData.unit ||
            INITIAL_FORM_DATA.unit,

          label:
            formData.unit ||
            INITIAL_FORM_DATA.unit,
        },
      ];

  const hsnOptions = [
    {
      value: "",
      label: "Not specified",
    },

    ...options.hsnSacCodes.map((item) => ({
      value: item.code,

      label: item.description
        ? `${item.code} — ${item.description}`
        : item.code,
    })),
  ];

  const rateOptions = options.taxRates.length
    ? [
        {
          value: "",
          label: "Select GST rate",
        },

        ...options.taxRates.map((item) => ({
          value: String(item.rate),
          label: `${item.rate}% — ${item.name}`,
        })),
      ]
    : [
        {
          value:
            formData.gstRate === ""
              ? INITIAL_FORM_DATA.gstRate
              : String(formData.gstRate),

          label: `${
            formData.gstRate === ""
              ? INITIAL_FORM_DATA.gstRate
              : formData.gstRate
          }%`,
        },
      ];

  const warehouseOptions = [
    {
      value: "",
      label: "Select opening-stock location",
    },

    ...options.warehouses.map((item) => ({
      value: String(item._id),
      label:
        `${item.warehouseCode} — ${item.name}`,
    })),
  ];

  const buildPayload = () => {
    const fail = (section, message) => {
      setActiveSection(section);
      throw new Error(message);
    };

    const name = formData.name.trim();

    if (
      name.length < 2 ||
      name.length > 200
    ) {
      fail(
        "basic",
        "Product name must contain 2–200 characters.",
      );
    }

    if (
      !["GOODS", "SERVICE"].includes(
        formData.type,
      )
    ) {
      fail(
        "basic",
        "Select a valid Product type.",
      );
    }

    const unit =
      String(formData.unit ?? "").trim();

    if (!unit) {
      fail(
        "basic",
        "Unit is required.",
      );
    }

    if (
      options.units.length > 0 &&
      !options.units.some(
        (item) =>
          item.unitCode === unit,
      )
    ) {
      fail(
        "basic",
        "Select an active unit.",
      );
    }

    if (
      formData.category &&
      !options.categories.some(
        (item) =>
          item.name === formData.category,
      )
    ) {
      fail(
        "basic",
        "Select an active category.",
      );
    }

    if (
      formData.brand &&
      !options.brands.some(
        (item) =>
          item.name === formData.brand,
      )
    ) {
      fail(
        "basic",
        "Select an active brand.",
      );
    }

    if (
      formData.hsnSacCode &&
      !options.hsnSacCodes.some(
        (item) =>
          item.code === formData.hsnSacCode,
      )
    ) {
      fail(
        "pricing",
        "Select an active HSN/SAC code.",
      );
    }

    let gstRate;

    try {
      gstRate = numericValue(
        formData.gstRate,
        "GST rate",
        100,
        100,
      );
    } catch (validationError) {
      fail(
        "pricing",
        validationError.message,
      );
    }

    if (
      options.taxRates.length > 0 &&
      !options.taxRates.some(
        (item) =>
          Number(item.rate) === gstRate,
      )
    ) {
      fail(
        "pricing",
        "Select an active GST rate.",
      );
    }

    let salePrice;
    let purchasePrice;

    try {
      salePrice = numericValue(
        formData.salePrice,
        "Sale price",
        1000000000,
        100,
      );

      purchasePrice = numericValue(
        formData.purchasePrice,
        "Purchase price",
        1000000000,
        100,
      );
    } catch (validationError) {
      fail(
        "pricing",
        validationError.message,
      );
    }

    let openingStock = 0;
    let openingStockRate = 0;
    let reorderLevel = 0;

    if (inventoryEnabled) {
      try {
        openingStock = numericValue(
          formData.openingStock,
          "Opening stock",
          1000000,
          1000,
        );

        openingStockRate = numericValue(
          formData.openingStockRate,
          "Opening stock rate",
          1000000000,
          100,
        );

        reorderLevel = numericValue(
          formData.reorderLevel,
          "Reorder level",
          1000000,
          1000,
        );
      } catch (validationError) {
        fail(
          "inventory",
          validationError.message,
        );
      }
    }

    if (
      needsOpeningWarehouse &&
      !options.warehouses.some(
        (item) =>
          String(item._id) ===
          String(formData.warehouseId),
      )
    ) {
      fail(
        "inventory",
        "Select an active opening-stock warehouse.",
      );
    }

    if (
      !["ACTIVE", "INACTIVE"].includes(
        formData.status,
      )
    ) {
      fail(
        "basic",
        "Select a valid status.",
      );
    }

    if (
      formData.description.trim().length > 1000
    ) {
      fail(
        "advanced",
        "Description cannot exceed 1000 characters.",
      );
    }

    return {
      name,
      type: formData.type,

      category:
        formData.category || null,

      brand:
        formData.brand || null,

      unit,

      description:
        formData.description.trim() || null,

      hsnSacCode:
        formData.hsnSacCode || null,

      gstRate,
      salePrice,
      purchasePrice,

      trackInventory:
        inventoryEnabled,

      openingStock,
      openingStockRate,
      reorderLevel,

      status: formData.status,

      ...(needsOpeningWarehouse
        ? {
            warehouseId:
              formData.warehouseId,
          }
        : {}),
    };
  };

  const handleSave = async () => {
    if (
      !isOpen ||
      blocked ||
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
      const response =
        await api.product.create(payload);

      const createdProduct =
        response?.data?.data ||
        response?.data?.product;

      if (
        !createdProduct?._id ||
        !createdProduct?.productCode
      ) {
        throw new Error(
          "The server did not return a confirmed Product record.",
        );
      }

      confirmed = true;

      onSave?.(createdProduct);

      toast.success(
        `${createdProduct.name} created successfully`,
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

        const message = confirmed
          ? "The Product was created, but the screen could not finish updating. Close this form and refresh the Product list."
          : "The save outcome is uncertain. Close this form and check the Product list before creating it again.";

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

  const renderBasicSection = () => (
    <>
      <div className="section-form-title">
        <h3>Basic Details</h3>
        <p>Enter basic Product information.</p>
      </div>

      <div className="section-form-grid">
        <Input
          label="Product Name"
          name="name"
          value={formData.name}
          onChange={(event) =>
            updateField(
              "name",
              event.target.value,
            )
          }
          placeholder="Enter Product name"
          maxLength={200}
          required
        />

        <Select
          label="Product Type"
          name="type"
          value={formData.type}
          options={PRODUCT_TYPES}
          onChange={(event) =>
            updateField(
              "type",
              event.target.value,
            )
          }
          required
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
          required
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
      </div>
    </>
  );

  const renderPricingSection = () => (
    <>
      <div className="section-form-title">
        <h3>Pricing & Tax</h3>
        <p>Configure prices and tax details.</p>
      </div>

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
          required
        />

        <Input
          label="Sale Price"
          name="salePrice"
          type="number"
          inputMode="decimal"
          min="0"
          max="1000000000"
          step="0.01"
          value={formData.salePrice}
          onChange={(event) =>
            updateField(
              "salePrice",
              event.target.value,
            )
          }
        />

        <Input
          label="Purchase Price"
          name="purchasePrice"
          type="number"
          inputMode="decimal"
          min="0"
          max="1000000000"
          step="0.01"
          value={formData.purchasePrice}
          onChange={(event) =>
            updateField(
              "purchasePrice",
              event.target.value,
            )
          }
        />
      </div>
    </>
  );

  const renderInventorySection = () => (
    <>
      <div className="section-form-title">
        <h3>Inventory</h3>
        <p>
          {isService
            ? "Services do not maintain stock."
            : "Configure tracking and initial stock."}
        </p>
      </div>

      {isService ? (
        <div className="product-form-info">
          <strong>Service Product</strong>
          <p>
            Stock tracking, opening quantity,
            warehouses, and reorder levels do
            not apply.
          </p>
        </div>
      ) : (
        <>
          <div className="section-form-grid">
            <Select
              label="Track Inventory"
              name="trackInventory"
              value={String(
                formData.trackInventory,
              )}
              options={TRACKING_OPTIONS}
              onChange={(event) =>
                updateField(
                  "trackInventory",
                  event.target.value === "true",
                )
              }
            />

            {inventoryEnabled && (
              <>
                <Input
                  label="Opening Stock"
                  name="openingStock"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="1000000"
                  step="0.001"
                  value={formData.openingStock}
                  onChange={(event) =>
                    updateField(
                      "openingStock",
                      event.target.value,
                    )
                  }
                />

                <Input
                  label="Opening Stock Rate"
                  name="openingStockRate"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="1000000000"
                  step="0.01"
                  value={
                    formData.openingStockRate
                  }
                  onChange={(event) =>
                    updateField(
                      "openingStockRate",
                      event.target.value,
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
                  onChange={(event) =>
                    updateField(
                      "reorderLevel",
                      event.target.value,
                    )
                  }
                />

                {needsOpeningWarehouse && (
                  <div className="section-form-full">
                    <Select
                      label="Opening Stock Warehouse"
                      name="warehouseId"
                      value={
                        formData.warehouseId
                      }
                      options={
                        warehouseOptions
                      }
                      onChange={(event) =>
                        updateField(
                          "warehouseId",
                          event.target.value,
                        )
                      }
                      required
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {!inventoryEnabled && (
            <div className="product-form-info">
              <strong>
                Stock tracking is disabled
              </strong>
              <p>
                This Product will not maintain
                quantities or create stock
                movements.
              </p>
            </div>
          )}

          {inventoryEnabled && (
            <>
              {settings?.warehouseTrackingStatus ===
                "READY" &&
                !settings.multiWarehouseEnabled && (
                  <p className="product-form-hint">
                    Opening stock uses{" "}
                    {settings.defaultWarehouse?.name ||
                      "the default location"}{" "}
                    automatically.
                  </p>
                )}

              {settings?.warehouseTrackingStatus ===
                "NOT_INITIALIZED" && (
                  <p className="product-form-hint">
                    Opening stock is recorded
                    using the current Product
                    stock system. Warehouse
                    allocation is not active yet.
                  </p>
                )}

              <div className="section-summary">
                <div>
                  <span>
                    Opening Inventory Value
                  </span>

                  <strong>
                    {openingStockValue === null
                      ? "—"
                      : currencyFormatter.format(
                          openingStockValue,
                        )}
                  </strong>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </>
  );

  const renderAdvancedSection = () => (
    <>
      <div className="section-form-title">
        <h3>Additional Details</h3>
        <p>
          Description is stored once on the
          Product record.
        </p>
      </div>

      <div className="section-form-grid">
        <div className="section-form-full">
          <Textarea
            label="Description"
            name="description"
            value={formData.description}
            onChange={(event) =>
              updateField(
                "description",
                event.target.value,
              )
            }
            placeholder="Enter Product description..."
            maxLength={1000}
            rows={5}
          />

          <p className="product-form-hint">
            {formData.description.length}/1000 characters
          </p>
        </div>
      </div>
    </>
  );

  const renderSection = () => {
    switch (activeSection) {
      case "basic":
        return renderBasicSection();

      case "pricing":
        return renderPricingSection();

      case "inventory":
        return renderInventorySection();

      case "advanced":
        return renderAdvancedSection();

      default:
        return null;
    }
  };

  return (
    <SectionModal
      show={isOpen}
      onClose={handleClose}
      title="Create Product"
      subtitle="Goods, services, pricing and opening stock"
      icon={Package}
      sections={SECTIONS}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      onSave={handleSave}
      saveText="Create Product"
      saveLoading={saving}
      saveDisabled={blocked}
      showSecondary={false}
      className="product-create-modal"
    >
      {loadingOptions && (
        <div
          className="product-form-notice"
          role="status"
        >
          Loading Product masters and inventory settings…
        </div>
      )}

      {optionsError && (
        <div
          className="product-form-notice product-form-notice--error"
          role="alert"
        >
          <strong>
            Unable to load Product options
          </strong>

          <p>{optionsError}</p>

          <button
            type="button"
            className="product-form-retry"
            disabled={loadingOptions || saving}
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
          className="product-form-notice product-form-notice--error"
          role="alert"
        >
          {error}
        </div>
      )}

      <fieldset
        className="product-form-fieldset"
        disabled={blocked}
      >
        {renderSection()}
      </fieldset>
    </SectionModal>
  );
};

export default ProductModal;