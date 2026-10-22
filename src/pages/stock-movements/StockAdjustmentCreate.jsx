import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  FileText,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import toast from "react-hot-toast";

import Input from "../../components/common/Form/Input";
import Select from "../../components/common/Form/Select";
import Textarea from "../../components/common/Form/Textarea";

import {
  FormCard,
  FormFooter,
  FormFull,
  FormGrid,
  PageHeader,
  SegmentedControl,
  SummaryPanel,
} from "../../components/common/FormPage";

import api from "../../services/api";
import warehouseApi from "../../services/modules/warehouseApi";
import warehouseStockApi from "../../services/modules/warehouseStockApi";

const INITIAL_FORM_DATA = {
  productCode: "",
  warehouseId: "",
  adjustmentType: "ADJUSTMENT_IN",
  quantity: "",
  unitRate: "",
  notes: "",
};

const adjustmentTypeOptions = [
  {
    value: "ADJUSTMENT_IN",
    label: "Add Stock",
    icon: <ArrowDownToLine size={14} />,
  },
  {
    value: "ADJUSTMENT_OUT",
    label: "Remove Stock",
    icon: <ArrowUpFromLine size={14} />,
  },
];

const getId = (value) => {
  if (value && typeof value === "object") {
    return String(value._id ?? "");
  }

  return value == null ? "" : String(value);
};

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getApiErrorMessage = (error) => {
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
    body?.error ||
    error?.message ||
    "Unable to complete the request."
  );
};

const getRows = (response) => {
  if (Array.isArray(response?.data?.data)) {
    return response.data.data;
  }

  if (Array.isArray(response?.data?.products)) {
    return response.data.products;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  throw new Error(
    "The server returned an invalid list response.",
  );
};

const loadAllPages = async (fetchPage, isCurrent) => {
  const first = await fetchPage({
    page: 1,
    limit: 100,
  });

  if (!isCurrent()) {
    return null;
  }

  const records = [...getRows(first)];

  const pages = Number(
    first?.data?.pagination?.totalPages ?? 1,
  );

  if (
    !Number.isSafeInteger(pages) ||
    pages < 0
  ) {
    throw new Error("Invalid pagination response.");
  }

  for (let page = 2; page <= pages; page += 1) {
    const response = await fetchPage({
      page,
      limit: 100,
    });

    if (!isCurrent()) {
      return null;
    }

    records.push(...getRows(response));
  }

  return records;
};

const validScaledNumber = (
  value,
  scale,
  minimum,
  maximum,
) => {
  if (
    !Number.isFinite(value) ||
    value < minimum ||
    value > maximum
  ) {
    return false;
  }

  const scaled = value * scale;
  const rounded = Math.round(scaled);

  return (
    Number.isSafeInteger(rounded) &&
    Math.abs(scaled - rounded) <= 0.000001
  );
};

function StockAdjustmentCreate() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    ...INITIAL_FORM_DATA,
  });

  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [settings, setSettings] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [balanceState, setBalanceState] = useState({
    productCode: "",
    loading: false,
    error: "",
    balances: new Map(),
  });

  const [balanceReloadKey, setBalanceReloadKey] =
    useState(0);

  const [saving, setSaving] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState("");

  const submitLockRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const isCurrent = () => !cancelled;

    const load = async () => {
      setLoading(true);
      setLoadError("");

      setProducts([]);
      setWarehouses([]);
      setSettings(null);

      setFormData((previous) => ({
        ...previous,
        productCode: "",
        warehouseId: "",
      }));

      try {
        const settingsResponse =
          await warehouseApi.getSettings();

        if (!isCurrent()) {
          return;
        }

        const inventorySettings =
          settingsResponse?.data?.data;

        if (
          !inventorySettings?.defaultWarehouseId ||
          typeof inventorySettings.multiWarehouseEnabled !==
            "boolean" ||
          !["NOT_INITIALIZED", "READY"].includes(
            inventorySettings.warehouseTrackingStatus,
          )
        ) {
          throw new Error(
            "The server returned invalid inventory settings.",
          );
        }

        if (
          inventorySettings.multiWarehouseEnabled &&
          inventorySettings.warehouseTrackingStatus !==
            "READY"
        ) {
          throw new Error(
            "Multi-warehouse mode requires initialized warehouse stock.",
          );
        }

        const productRecords = await loadAllPages(
          (params) => api.product.getAll(params),
          isCurrent,
        );

        if (!isCurrent() || !productRecords) {
          return;
        }

        let warehouseRecords = [];

        if (inventorySettings.multiWarehouseEnabled) {
          warehouseRecords = await loadAllPages(
            (params) => warehouseApi.getAll(params),
            isCurrent,
          );

          if (!isCurrent() || !warehouseRecords) {
            return;
          }
        }

        const availableProducts = Array.from(
          new Map(
            productRecords
              .filter(
                (product) =>
                  product.type === "GOODS" &&
                  product.trackInventory === true &&
                  product.status === "ACTIVE" &&
                  product.isDeleted !== true,
              )
              .map((product) => [
                product.productCode,
                product,
              ]),
          ).values(),
        );

        const availableWarehouses =
          warehouseRecords.filter(
            (warehouse) =>
              warehouse.status === "ACTIVE",
          );

        setProducts(availableProducts);
        setWarehouses(availableWarehouses);
        setSettings(inventorySettings);
      } catch (requestError) {
        if (isCurrent()) {
          setLoadError(
            getApiErrorMessage(requestError),
          );
        }
      } finally {
        if (isCurrent()) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const trackingReady =
    settings?.warehouseTrackingStatus === "READY";

  const multiWarehouseEnabled =
    settings?.multiWarehouseEnabled === true;

  const selectedProduct = useMemo(
    () =>
      products.find(
        (product) =>
          product.productCode ===
          formData.productCode,
      ),
    [products, formData.productCode],
  );

  const resolvedWarehouseId = trackingReady
    ? multiWarehouseEnabled
      ? formData.warehouseId
      : getId(settings?.defaultWarehouseId)
    : "";

  const selectedWarehouse = multiWarehouseEnabled
    ? warehouses.find(
        (warehouse) =>
          getId(warehouse._id) ===
          resolvedWarehouseId,
      )
    : settings?.defaultWarehouse;

  useEffect(() => {
    let cancelled = false;

    const productCode = formData.productCode;

    if (
      !trackingReady ||
      !selectedProduct
    ) {
      setBalanceState({
        productCode: "",
        loading: false,
        error: "",
        balances: new Map(),
      });

      return undefined;
    }

    setBalanceState({
      productCode,
      loading: true,
      error: "",
      balances: new Map(),
    });

    const loadBalances = async () => {
      try {
        const rows = await loadAllPages(
          (params) =>
            warehouseStockApi.getByProduct(
              productCode,
              params,
            ),
          () => !cancelled,
        );

        if (cancelled || !rows) {
          return;
        }

        const balances = new Map();

        for (const row of rows) {
          const warehouseId =
            getId(row.warehouseId);

          if (
            !warehouseId ||
            !validScaledNumber(
              row.currentStock,
              1000,
              0,
              Number.MAX_SAFE_INTEGER / 1000,
            )
          ) {
            throw new Error(
              "The server returned an invalid warehouse stock record.",
            );
          }

          if (balances.has(warehouseId)) {
            throw new Error(
              "Duplicate warehouse stock records were returned.",
            );
          }

          balances.set(
            warehouseId,
            row.currentStock,
          );
        }

        setBalanceState({
          productCode,
          loading: false,
          error: "",
          balances,
        });
      } catch (requestError) {
        if (!cancelled) {
          setBalanceState({
            productCode,
            loading: false,
            error: getApiErrorMessage(requestError),
            balances: new Map(),
          });
        }
      }
    };

    loadBalances();

    return () => {
      cancelled = true;
    };
  }, [
    formData.productCode,
    selectedProduct,
    trackingReady,
    balanceReloadKey,
  ]);

  const balanceMatchesProduct =
    balanceState.productCode ===
    formData.productCode;

  let currentStock = null;

  if (selectedProduct && !trackingReady) {
    if (
      validScaledNumber(
        selectedProduct.currentStock,
        1000,
        0,
        Number.MAX_SAFE_INTEGER / 1000,
      )
    ) {
      currentStock = selectedProduct.currentStock;
    }
  } else if (
    selectedProduct &&
    trackingReady &&
    resolvedWarehouseId &&
    balanceMatchesProduct &&
    !balanceState.loading &&
    !balanceState.error
  ) {
    currentStock =
      balanceState.balances.get(
        resolvedWarehouseId,
      ) ?? 0;
  }

  const parsedQuantity =
    Number(formData.quantity);

  const parsedUnitRate =
    formData.unitRate.trim() === ""
      ? 0
      : Number(formData.unitRate);

  const quantityIsValid =
    formData.quantity.trim() !== "" &&
    validScaledNumber(
      parsedQuantity,
      1000,
      0.001,
      1000000,
    );

  const rateIsValid = validScaledNumber(
    parsedUnitRate,
    100,
    0,
    1000000000,
  );

  const isStockIn =
    formData.adjustmentType ===
    "ADJUSTMENT_IN";

  const stockAfter =
    currentStock !== null && quantityIsValid
      ? (
          Math.round(currentStock * 1000) +
          (isStockIn ? 1 : -1) *
            Math.round(parsedQuantity * 1000)
        ) / 1000
      : currentStock;

  const adjustmentValuePaise =
    quantityIsValid && rateIsValid
      ? (
          BigInt(
            Math.round(parsedQuantity * 1000),
          ) *
            BigInt(
              Math.round(parsedUnitRate * 100),
            ) +
          500n
        ) / 1000n
      : null;

  const valueIsSafe =
    adjustmentValuePaise !== null &&
    adjustmentValuePaise <=
      BigInt(Number.MAX_SAFE_INTEGER);

  const hasInsufficientStock =
    !isStockIn &&
    quantityIsValid &&
    currentStock !== null &&
    parsedQuantity > currentStock;

  const busy = loading || saving;

  const updateField = (field, value) => {
    if (
      busy ||
      uncertain ||
      submitLockRef.current
    ) {
      return;
    }

    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));

    setError("");
  };

  const productOptions = useMemo(
    () => [
      {
        value: "",
        label: loading
          ? "Loading products..."
          : "Select a product",
      },
      ...products.map((product) => ({
        value: product.productCode,
        label:
          `${product.productCode} — ${product.name}`,
      })),
    ],
    [products, loading],
  );

  const warehouseOptions = useMemo(
    () => [
      {
        value: "",
        label: "Select a warehouse",
      },
      ...warehouses.map((warehouse) => ({
        value: getId(warehouse._id),
        label:
          `${warehouse.warehouseCode} — ${warehouse.name}`,
      })),
    ],
    [warehouses],
  );

  const validateForm = () => {
    if (loading || loadError || !settings) {
      throw new Error(
        "Load inventory settings and products before saving.",
      );
    }

    if (!selectedProduct) {
      throw new Error(
        "Please select an available inventory product.",
      );
    }

    if (
      !["ADJUSTMENT_IN", "ADJUSTMENT_OUT"].includes(
        formData.adjustmentType,
      )
    ) {
      throw new Error(
        "Please select a valid adjustment type.",
      );
    }

    if (
      multiWarehouseEnabled &&
      !selectedWarehouse
    ) {
      throw new Error(
        "Please select an active warehouse.",
      );
    }

    if (
      trackingReady &&
      (
        !balanceMatchesProduct ||
        balanceState.loading ||
        balanceState.error
      )
    ) {
      throw new Error(
        balanceState.error ||
          "Wait for the warehouse stock balance to load.",
      );
    }

    if (currentStock === null) {
      throw new Error(
        "A valid available stock balance could not be loaded.",
      );
    }

    if (!quantityIsValid) {
      throw new Error(
        "Quantity must be between 0.001 and 1,000,000 with at most three decimal places.",
      );
    }

    if (!rateIsValid) {
      throw new Error(
        "Unit rate must be between 0 and 1,000,000,000 with at most two decimal places.",
      );
    }

    if (!valueIsSafe) {
      throw new Error(
        "Adjustment value exceeds the supported range.",
      );
    }

    if (hasInsufficientStock) {
      throw new Error(
        `Insufficient stock. Available stock is ${currentStock} ${selectedProduct.unit}.`,
      );
    }

    if (
      stockAfter === null ||
      !validScaledNumber(
        stockAfter,
        1000,
        0,
        Number.MAX_SAFE_INTEGER / 1000,
      )
    ) {
      throw new Error(
        "The resulting stock balance is outside the supported range.",
      );
    }

    if (formData.notes.trim().length > 500) {
      throw new Error(
        "Notes cannot exceed 500 characters.",
      );
    }
  };

  const handleSave = async () => {
    if (
      busy ||
      uncertain ||
      submitLockRef.current
    ) {
      return;
    }

    try {
      validateForm();
    } catch (validationError) {
      setError(validationError.message);
      return;
    }

    const payload = {
      adjustmentType: formData.adjustmentType,
      quantity: parsedQuantity,
      unitRate: parsedUnitRate,
      notes: formData.notes.trim() || null,

      ...(multiWarehouseEnabled
        ? {
            warehouseId: resolvedWarehouseId,
          }
        : {}),
    };

    submitLockRef.current = true;
    setSaving(true);
    setError("");

    let confirmed = false;

    try {
      const response =
        await api.stockMovement.createAdjustment(
          selectedProduct.productCode,
          payload,
        );

      const body = response?.data ?? response;
      const result = body?.data ?? body;

      const updatedProduct = result?.product;
      const movement = result?.movement;

      if (
        !updatedProduct?._id ||
        !movement?._id
      ) {
        const responseError = new Error(
          "The adjustment response did not contain the saved product and movement.",
        );

        responseError.uncertainSave = true;
        throw responseError;
      }

      confirmed = true;

      toast.success(
        `${updatedProduct.name} stock adjusted successfully`,
      );

      navigate("/stock-movements", {
        state: {
          product: updatedProduct,
          movement,
        },
      });
    } catch (requestError) {
      const status =
        requestError?.response?.status;

      const unknownResult =
        confirmed ||
        requestError.uncertainSave ||
        !status ||
        status === 408 ||
        status >= 500;

      const message = unknownResult
        ? "The adjustment may already have completed. Do not submit again. Open Stock Movements and verify the result before creating another adjustment."
        : getApiErrorMessage(requestError);

      if (unknownResult) {
        setUncertain(true);
      } else if (
        status === 409 &&
        trackingReady
      ) {
        setBalanceReloadKey(
          (previous) => previous + 1,
        );
      }

      setError(message);
      toast.error(message);
    } finally {
      submitLockRef.current = false;
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (
      saving ||
      submitLockRef.current
    ) {
      return;
    }

    navigate(-1);
  };

  const stockUnit =
    selectedProduct?.unit || "";

  const stockDisplay =
    currentStock !== null
      ? `${currentStock} ${stockUnit}`
      : trackingReady &&
          selectedProduct &&
          (
            balanceState.loading ||
            !balanceMatchesProduct
          )
        ? "Loading..."
        : "—";

  return (
    <div className="fp-page">
      <PageHeader
        title="New Stock Adjustment"
        subtitle="Add or remove stock with a complete audit trail"
        onBack={handleCancel}
      />

      {loadError && (
        <div
          className="section-form-api-error"
          role="alert"
        >
          <p>{loadError}</p>

          <button
            type="button"
            className="doc-link-button"
            disabled={busy || uncertain}
            onClick={() =>
              setReloadKey(
                (previous) => previous + 1,
              )
            }
          >
            Retry Loading
          </button>
        </div>
      )}

      <div className="fp-layout">
        <main className="fp-main">
          <FormCard
            title="Adjustment Details"
            description="Choose the product and adjustment quantity"
            icon={Boxes}
          >
            <FormGrid columns={2}>
              <FormFull>
                <SegmentedControl
                  label="Adjustment Type"
                  value={formData.adjustmentType}
                  onChange={(value) =>
                    updateField(
                      "adjustmentType",
                      value,
                    )
                  }
                  options={adjustmentTypeOptions}
                />
              </FormFull>

              {multiWarehouseEnabled && (
                <FormFull>
                  <Select
                    label="Warehouse"
                    name="warehouseId"
                    value={formData.warehouseId}
                    onChange={(event) =>
                      updateField(
                        "warehouseId",
                        event.target.value,
                      )
                    }
                    options={warehouseOptions}
                    disabled={busy || uncertain}
                    required
                  />
                </FormFull>
              )}

              {trackingReady &&
                !multiWarehouseEnabled && (
                  <FormFull>
                    <Input
                      label="Warehouse"
                      value={
                        selectedWarehouse?.name ||
                        "Default Location"
                      }
                      readOnly
                    />
                  </FormFull>
                )}

              <FormFull>
                <Select
                  label="Product"
                  name="productCode"
                  value={formData.productCode}
                  onChange={(event) =>
                    updateField(
                      "productCode",
                      event.target.value,
                    )
                  }
                  options={productOptions}
                  disabled={
                    busy ||
                    uncertain ||
                    Boolean(loadError)
                  }
                  required
                />
              </FormFull>

              {trackingReady &&
                balanceMatchesProduct &&
                balanceState.error && (
                  <FormFull>
                    <div
                      className="section-form-api-error"
                      role="alert"
                    >
                      <p>{balanceState.error}</p>

                      <button
                        type="button"
                        className="doc-link-button"
                        disabled={busy || uncertain}
                        onClick={() =>
                          setBalanceReloadKey(
                            (previous) =>
                              previous + 1,
                          )
                        }
                      >
                        Retry Stock Balance
                      </button>
                    </div>
                  </FormFull>
                )}

              <Input
                label="Adjustment Quantity"
                name="quantity"
                type="number"
                min="0.001"
                max="1000000"
                step="0.001"
                value={formData.quantity}
                onChange={(event) =>
                  updateField(
                    "quantity",
                    event.target.value,
                  )
                }
                placeholder="Enter quantity"
                disabled={busy || uncertain}
                required
              />

              <Input
                label="Unit Rate"
                name="unitRate"
                type="number"
                min="0"
                max="1000000000"
                step="0.01"
                value={formData.unitRate}
                onChange={(event) =>
                  updateField(
                    "unitRate",
                    event.target.value,
                  )
                }
                placeholder="Enter unit rate"
                disabled={busy || uncertain}
              />
            </FormGrid>
          </FormCard>

          <FormCard
            title="Notes"
            description="Explain why this stock adjustment is needed"
            icon={FileText}
          >
            <FormGrid columns={1}>
              <Textarea
                label="Notes"
                name="notes"
                value={formData.notes}
                onChange={(event) =>
                  updateField(
                    "notes",
                    event.target.value,
                  )
                }
                placeholder="Example: Physical count found additional units."
                rows={5}
                maxLength={500}
                disabled={busy || uncertain}
              />
            </FormGrid>
          </FormCard>
        </main>

        <SummaryPanel
          title="Stock Summary"
          rows={[
            {
              label: "Product",
              value: selectedProduct?.name || "—",
            },
            {
              label: "Product Code",
              value:
                selectedProduct?.productCode || "—",
            },
            {
              label: "Location",
              value: trackingReady
                ? selectedWarehouse?.name ||
                  "Select a warehouse"
                : "Aggregate Product Stock",
            },
            {
              label: "Available Stock",
              value: stockDisplay,
            },
            {
              label: "Adjustment",
              value: quantityIsValid
                ? `${isStockIn ? "+" : "-"}${parsedQuantity} ${stockUnit}`
                : "—",

              tone: quantityIsValid
                ? isStockIn
                  ? "success"
                  : "danger"
                : "",
            },
            {
              label: "Unit Rate",
              value: rateIsValid
                ? formatCurrency(parsedUnitRate)
                : "—",
            },
            {
              label: "Adjustment Value",
              value: valueIsSafe
                ? formatCurrency(
                    Number(adjustmentValuePaise) /
                      100,
                  )
                : "—",
            },
          ]}
          highlight={{
            label: "Stock After",
            value:
              stockAfter !== null
                ? `${stockAfter} ${stockUnit}`
                : "—",
          }}
        >
          {hasInsufficientStock && (
            <p className="fp-stock-warning">
              You cannot remove more stock than
              the available quantity at this location.
            </p>
          )}

          {uncertain && (
            <button
              type="button"
              className="doc-link-button"
              disabled={saving}
              onClick={() =>
                navigate("/stock-movements")
              }
            >
              Verify in Stock Movements
            </button>
          )}
        </SummaryPanel>
      </div>

      <FormFooter
        onCancel={handleCancel}
        onSubmit={handleSave}
        submitText={
          uncertain
            ? "Verify Previous Adjustment"
            : "Save Adjustment"
        }
        saving={saving}
        error={error}
      />
    </div>
  );
}

export default StockAdjustmentCreate;