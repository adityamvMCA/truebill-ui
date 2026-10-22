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

const INITIAL_FORM_DATA = {
  productCode: "",
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

const formatCurrency = (value) => {
  return `₹${Number(value || 0).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
};

const getProductList = (response) => {
  if (Array.isArray(response?.data?.data)) {
    return response.data.data;
  }

  if (Array.isArray(response?.data?.products)) {
    return response.data.products;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
};

const getApiErrorMessage = (apiError) => {
  const responseData = apiError?.response?.data;

  if (
    typeof responseData?.message === "string"
  ) {
    return responseData.message;
  }

  if (
    typeof responseData?.error === "string"
  ) {
    return responseData.error;
  }

  if (
    Array.isArray(responseData?.errors) &&
    responseData.errors.length > 0
  ) {
    return responseData.errors
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        return (
          item?.message ||
          item?.msg ||
          String(item)
        );
      })
      .join(", ");
  }

  return (
    apiError?.message ||
    "Unable to save stock adjustment. Please try again."
  );
};

function StockMovementCreate() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState(
    INITIAL_FORM_DATA
  );

  const [products, setProducts] = useState([]);

  const [loadingProducts, setLoadingProducts] =
    useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const loadProducts = useCallback(async () => {
    try {
      setLoadingProducts(true);

      const response = await api.product.getAll({
        page: 1,
        limit: 100,
      });

      const productList =
        getProductList(response);

      const inventoryProducts =
        productList.filter(
          (product) =>
            product.type === "GOODS" &&
            product.trackInventory === true &&
            product.status === "ACTIVE"
        );

      setProducts(inventoryProducts);
    } catch (apiError) {
      console.error(
        "Unable to load products:",
        apiError
      );

      toast.error(
        getApiErrorMessage(apiError)
      );

      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const updateField = (field, value) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));

    if (error) {
      setError("");
    }
  };

  const selectedProduct = useMemo(() => {
    return products.find(
      (product) =>
        product.productCode ===
        formData.productCode
    );
  }, [
    formData.productCode,
    products,
  ]);

  const currentStock =
    Number(selectedProduct?.currentStock) || 0;

  const quantity =
    Number(formData.quantity) || 0;

  const unitRate =
    Number(formData.unitRate) || 0;

  const isStockIn =
    formData.adjustmentType ===
    "ADJUSTMENT_IN";

  const stockChange = isStockIn
    ? quantity
    : -quantity;

  const stockAfter = currentStock + stockChange;

  const adjustmentValue =
    quantity * unitRate;

  const hasInsufficientStock =
    formData.adjustmentType ===
      "ADJUSTMENT_OUT" &&
    quantity > currentStock;

  const productOptions = useMemo(() => {
    return [
      {
        value: "",
        label: loadingProducts
          ? "Loading products..."
          : "Select a product",
      },

      ...products.map((product) => ({
        value: product.productCode,
        label: `${product.productCode} — ${product.name}`,
      })),
    ];
  }, [
    loadingProducts,
    products,
  ]);

  const validateForm = () => {
    const productCode = String(
      formData.productCode || ""
    )
      .trim()
      .toUpperCase();

    if (!productCode) {
      setError("Please select a product.");

      return false;
    }

    if (!selectedProduct) {
      setError(
        "Selected product is not available for stock adjustment."
      );

      return false;
    }

    if (
      ![
        "ADJUSTMENT_IN",
        "ADJUSTMENT_OUT",
      ].includes(formData.adjustmentType)
    ) {
      setError(
        "Please select a valid adjustment type."
      );

      return false;
    }

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      setError(
        "Adjustment quantity must be greater than zero."
      );

      return false;
    }

    if (
      !Number.isFinite(unitRate) ||
      unitRate < 0
    ) {
      setError(
        "Unit rate cannot be negative."
      );

      return false;
    }

    if (hasInsufficientStock) {
      setError(
        `Insufficient stock. Available stock is ${currentStock} ${selectedProduct.unit}.`
      );

      return false;
    }

    if (formData.notes.length > 500) {
      setError(
        "Notes cannot exceed 500 characters."
      );

      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (saving || !validateForm()) {
      return;
    }

    const productCode = String(
      formData.productCode
    )
      .trim()
      .toUpperCase();

    const payload = {
      adjustmentType:
        formData.adjustmentType,

      quantity,

      unitRate,

      notes:
        formData.notes.trim() || null,
    };

    try {
      setSaving(true);

      setError("");

      const response =
        await api.stockMovement.createAdjustment(
          productCode,
          payload
        );

      const result = response?.data || response;

      const updatedProduct = result?.product;

      const movement = result?.movement;

      if (
        !updatedProduct?._id ||
        !movement?._id
      ) {
        throw new Error(
          "Stock adjustment was created, but updated stock data was not returned by the server."
        );
      }

      toast.success(
        `${updatedProduct.name} stock adjusted successfully`
      );

      navigate("/stock-movements", {
        state: {
          product: updatedProduct,
          movement,
        },
      });
    } catch (apiError) {
      const errorMessage =
        getApiErrorMessage(apiError);

      setError(errorMessage);

      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (saving) {
      return;
    }

    navigate(-1);
  };

  return (
    <div className="fp-page">
      <PageHeader
        title="New Stock Adjustment"
        subtitle="Add or remove stock with a complete audit trail"
        onBack={handleCancel}
      />

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
                  value={
                    formData.adjustmentType
                  }
                  onChange={(value) =>
                    updateField(
                      "adjustmentType",
                      value
                    )
                  }
                  options={
                    adjustmentTypeOptions
                  }
                />
              </FormFull>

              <FormFull>
                <Select
                  label="Product"
                  name="productCode"
                  value={formData.productCode}
                  onChange={(event) =>
                    updateField(
                      "productCode",
                      event.target.value
                    )
                  }
                  options={productOptions}
                  disabled={loadingProducts}
                  required
                />
              </FormFull>

              <Input
                label="Adjustment Quantity"
                name="quantity"
                type="number"
                min="0.001"
                step="0.001"
                value={formData.quantity}
                onChange={(event) =>
                  updateField(
                    "quantity",
                    event.target.value
                  )
                }
                placeholder="Enter quantity"
                required
              />

              <Input
                label="Unit Rate"
                name="unitRate"
                type="number"
                min="0"
                step="0.01"
                value={formData.unitRate}
                onChange={(event) =>
                  updateField(
                    "unitRate",
                    event.target.value
                  )
                }
                placeholder="Enter unit rate"
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
                    event.target.value
                  )
                }
                placeholder="Example: Physical stock count found extra units in warehouse."
                rows={5}
                maxLength={500}
              />
            </FormGrid>
          </FormCard>
        </main>

        <SummaryPanel
          title="Stock Summary"
          rows={[
            {
              label: "Product",
              value:
                selectedProduct?.name || "-",
            },

            {
              label: "Product Code",
              value:
                selectedProduct?.productCode ||
                "-",
            },

            {
              label: "Current Stock",
              value: selectedProduct
                ? `${currentStock} ${selectedProduct.unit}`
                : "-",
            },

            {
              label: "Adjustment",
              value: quantity
                ? `${
                    isStockIn ? "+" : "-"
                  }${quantity} ${
                    selectedProduct?.unit || ""
                  }`
                : "-",

              tone: quantity
                ? isStockIn
                  ? "success"
                  : "danger"
                : "",
            },

            {
              label: "Unit Rate",
              value: formatCurrency(unitRate),
            },

            {
              label: "Adjustment Value",
              value: formatCurrency(
                adjustmentValue
              ),
            },
          ]}
          highlight={{
            label: "Stock After",
            value: selectedProduct
              ? `${stockAfter} ${selectedProduct.unit}`
              : "-",
          }}
        >
          {hasInsufficientStock && (
            <p className="fp-stock-warning">
              You cannot remove more stock than
              the current available quantity.
            </p>
          )}
        </SummaryPanel>
      </div>

      <FormFooter
        onCancel={handleCancel}
        onSubmit={handleSave}
        submitText="Save Adjustment"
        saving={saving}
        error={error}
      />
    </div>
  );
}

export default StockMovementCreate;