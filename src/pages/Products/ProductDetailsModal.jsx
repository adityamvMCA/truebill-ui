import { useEffect, useMemo, useState } from "react";

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

const EMPTY_PRODUCT = {
  _id: "",
  productCode: "",
  name: "",
  type: "GOODS",
  category: "",
  brand: "",
  unit: "PCS",
  description: "",
  hsnSacCode: "",
  gstRate: 18,
  salePrice: 0,
  purchasePrice: 0,
  trackInventory: true,
  openingStock: 0,
  openingStockRate: 0,
  currentStock: 0,
  reorderLevel: 0,
  status: "ACTIVE",
  createdAt: null,
  updatedAt: null,
};

const normalizeProduct = (product = {}) => ({
  ...EMPTY_PRODUCT,
  ...product,

  category: product.category || "",

  brand: product.brand || "",

  description: product.description || "",

  hsnSacCode: product.hsnSacCode || "",

  gstRate: Number(product.gstRate) || 0,

  salePrice: Number(product.salePrice) || 0,

  purchasePrice: Number(product.purchasePrice) || 0,

  openingStock: Number(product.openingStock) || 0,

  openingStockRate: Number(product.openingStockRate) || 0,

  currentStock: Number(product.currentStock) || 0,

  reorderLevel: Number(product.reorderLevel) || 0,

  trackInventory:
    product.type === "SERVICE" ? false : Boolean(product.trackInventory),
});

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function DetailItem({ label, children, fullWidth = false }) {
  return (
    <div
      className={
        fullWidth
          ? "product-detail-item product-detail-full"
          : "product-detail-item"
      }
    >
      <span className="product-detail-label">{label}</span>

      <strong className="product-detail-value">{children || "-"}</strong>
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
  const [activeSection, setActiveSection] = useState("basic");

  const [formData, setFormData] = useState(EMPTY_PRODUCT);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const isEditMode = mode === "edit";

  const isService = formData.type === "SERVICE";

  const openingInventoryValue = useMemo(() => {
    return (
      Number(formData.openingStock || 0) *
      Number(formData.openingStockRate || 0)
    );
  }, [formData.openingStock, formData.openingStockRate]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveSection("basic");

    setFormData(normalizeProduct(product));

    setError("");
  }, [isOpen, product]);

  const updateField = (field, value) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));

    if (error) {
      setError("");
    }
  };

  const getErrorMessage = (apiError) => {
    const responseData = apiError?.response?.data;

    if (typeof responseData?.message === "string") {
      return responseData.message;
    }

    if (typeof responseData?.error === "string") {
      return responseData.error;
    }

    if (Array.isArray(responseData?.errors) && responseData.errors.length) {
      return responseData.errors
        .map((item) =>
          typeof item === "string"
            ? item
            : item?.message || item?.msg || String(item),
        )
        .join(", ");
    }

    return apiError?.message || "Unable to update product. Please try again.";
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setActiveSection("basic");

      setError("Product name is required.");

      return false;
    }

    if (!formData.type) {
      setActiveSection("basic");

      setError("Product type is required.");

      return false;
    }

    if (!formData.unit) {
      setActiveSection("basic");

      setError("Unit is required.");

      return false;
    }

    return true;
  };

  const buildUpdatePayload = () => ({
    name: formData.name.trim(),

    type: formData.type,

    category: formData.category.trim() || null,

    brand: formData.brand.trim() || null,

    description: formData.description.trim() || null,

    unit: formData.unit,

    hsnSacCode: formData.hsnSacCode.trim() || null,

    gstRate: Number(formData.gstRate) || 0,

    salePrice: Number(formData.salePrice) || 0,

    purchasePrice: Number(formData.purchasePrice) || 0,

    trackInventory: isService ? false : Boolean(formData.trackInventory),

    reorderLevel: isService ? 0 : Number(formData.reorderLevel) || 0,

    status: formData.status || "ACTIVE",
  });

  const handleSave = async () => {
    if (saving || !isEditMode || !validateForm()) {
      return;
    }

    try {
      setSaving(true);

      setError("");

      const response = await api.product.update(
        formData.productCode,
        buildUpdatePayload(),
      );

      const updatedProduct =
        response?.data?.product || response?.data?.data || response?.data;

      if (!updatedProduct?._id) {
        throw new Error(
          "Product was updated, but the server did not return product data.",
        );
      }

      onUpdated?.(updatedProduct);

      toast.success(`${updatedProduct.name} updated successfully`);

      onClose?.();
    } catch (apiError) {
      const errorMessage = getErrorMessage(apiError);

      setError(errorMessage);

      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (saving) {
      return;
    }

    setError("");

    onClose?.();
  };

  const sections = [
    {
      id: "basic",
      label: "Basic Details",
      icon: FileText,
      required: true,
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
      label: "Advanced Details",
      icon: Settings,
    },
  ];

  const productTypeOptions = [
    {
      value: "GOODS",
      label: "Goods",
    },

    {
      value: "SERVICE",
      label: "Service",
    },
  ];

  const unitOptions = [
    {
      value: "NOS",
      label: "Numbers",
    },

    {
      value: "PCS",
      label: "Pieces",
    },

    {
      value: "BOX",
      label: "Box",
    },

    {
      value: "BAG",
      label: "Bag",
    },

    {
      value: "PACK",
      label: "Pack",
    },

    {
      value: "SET",
      label: "Set",
    },

    {
      value: "KG",
      label: "Kilogram",
    },

    {
      value: "GRAM",
      label: "Gram",
    },

    {
      value: "TON",
      label: "Ton",
    },

    {
      value: "LITRE",
      label: "Litre",
    },

    {
      value: "ML",
      label: "Millilitre",
    },

    {
      value: "METER",
      label: "Metre",
    },

    {
      value: "FEET",
      label: "Feet",
    },

    {
      value: "SQFT",
      label: "Square Feet",
    },

    {
      value: "SQM",
      label: "Square Metre",
    },

    {
      value: "HOUR",
      label: "Hour",
    },

    {
      value: "DAY",
      label: "Day",
    },

    {
      value: "MONTH",
      label: "Month",
    },
  ];

  const gstRateOptions = [
    {
      value: 0,
      label: "0%",
    },

    {
      value: 3,
      label: "3%",
    },

    {
      value: 5,
      label: "5%",
    },

    {
      value: 12,
      label: "12%",
    },

    {
      value: 18,
      label: "18%",
    },

    {
      value: 28,
      label: "28%",
    },
  ];

  const statusOptions = [
    {
      value: "ACTIVE",
      label: "Active",
    },

    {
      value: "INACTIVE",
      label: "Inactive",
    },
  ];

  const inventoryTrackingOptions = [
    {
      value: "true",
      label: "Yes",
    },

    {
      value: "false",
      label: "No",
    },
  ];

  const renderError = () => {
    if (!error) {
      return null;
    }

    return (
      <div className="section-form-api-error" role="alert">
        {error}
      </div>
    );
  };

  const renderViewBasicSection = () => {
    return (
      <>
        <div className="section-form-title">
          <h3>Basic Details</h3>

          <p>Product master information</p>
        </div>

        <div className="product-detail-grid">
          <DetailItem label="Product Code">{formData.productCode}</DetailItem>

          <DetailItem label="Status">
            <StatusField value={formData.status} />
          </DetailItem>

          <DetailItem label="Product Name">{formData.name}</DetailItem>

          <DetailItem label="Product Type">
            <StatusField value={formData.type} />
          </DetailItem>

          <DetailItem label="Category">{formData.category || "-"}</DetailItem>

          <DetailItem label="Brand">{formData.brand || "-"}</DetailItem>

          <DetailItem label="Unit">{formData.unit}</DetailItem>

          <DetailItem label="Inventory Tracking">
            {formData.trackInventory ? "Yes" : "No"}
          </DetailItem>

          <DetailItem label="Description" fullWidth>
            {formData.description || "-"}
          </DetailItem>
        </div>
      </>
    );
  };

  const renderEditBasicSection = () => {
    return (
      <>
        <div className="section-form-title">
          <h3>Basic Details</h3>

          <p>Update product master information</p>
        </div>

        {renderError()}

        <div className="section-form-grid">
          <Input
            label="Product Code"
            name="productCode"
            value={formData.productCode}
            disabled
          />

          <Select
            label="Status"
            name="status"
            value={formData.status}
            onChange={(event) => updateField("status", event.target.value)}
            options={statusOptions}
          />

          <Input
            label="Product Name"
            name="name"
            value={formData.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="Enter product name"
            required
          />

          <Select
            label="Product Type"
            name="type"
            value={formData.type}
            onChange={(event) => updateField("type", event.target.value)}
            options={productTypeOptions}
            required
          />

          <Input
            label="Category"
            name="category"
            value={formData.category}
            onChange={(event) => updateField("category", event.target.value)}
            placeholder="Enter category"
          />

          <Input
            label="Brand"
            name="brand"
            value={formData.brand}
            onChange={(event) => updateField("brand", event.target.value)}
            placeholder="Enter brand"
          />

          <Select
            label="Unit"
            name="unit"
            value={formData.unit}
            onChange={(event) => updateField("unit", event.target.value)}
            options={unitOptions}
            required
          />

          <Select
            label="Track Inventory"
            name="trackInventory"
            value={String(isService ? false : formData.trackInventory)}
            onChange={(event) =>
              updateField("trackInventory", event.target.value === "true")
            }
            options={inventoryTrackingOptions}
            disabled={isService}
          />

          <div className="section-form-full">
            <Textarea
              label="Description"
              name="description"
              value={formData.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              placeholder="Enter product description..."
              rows={4}
            />
          </div>
        </div>
      </>
    );
  };

  const renderViewPricingSection = () => {
    return (
      <>
        <div className="section-form-title">
          <h3>Pricing & Tax</h3>

          <p>Product price and tax configuration</p>
        </div>

        <div className="product-detail-grid">
          <DetailItem label={isService ? "SAC Code" : "HSN Code"}>
            {formData.hsnSacCode || "-"}
          </DetailItem>

          <DetailItem label="GST Rate">{formData.gstRate}%</DetailItem>

          <DetailItem label="Sale Price">
            {formatCurrency(formData.salePrice)}
          </DetailItem>

          <DetailItem label="Purchase Price">
            {formatCurrency(formData.purchasePrice)}
          </DetailItem>
        </div>
      </>
    );
  };

  const renderEditPricingSection = () => {
    return (
      <>
        <div className="section-form-title">
          <h3>Pricing & Tax</h3>

          <p>Update sale price, purchase price and tax details</p>
        </div>

        {renderError()}

        <div className="section-form-grid">
          <Input
            label={isService ? "SAC Code" : "HSN Code"}
            name="hsnSacCode"
            value={formData.hsnSacCode}
            onChange={(event) => updateField("hsnSacCode", event.target.value)}
            placeholder={isService ? "Enter SAC code" : "Enter HSN code"}
          />

          <Select
            label="GST Rate"
            name="gstRate"
            value={formData.gstRate}
            onChange={(event) => updateField("gstRate", event.target.value)}
            options={gstRateOptions}
          />

          <Input
            label="Sale Price"
            name="salePrice"
            type="number"
            min="0"
            step="0.01"
            value={formData.salePrice}
            onChange={(event) => updateField("salePrice", event.target.value)}
            placeholder="Enter sale price"
          />

          <Input
            label="Purchase Price"
            name="purchasePrice"
            type="number"
            min="0"
            step="0.01"
            value={formData.purchasePrice}
            onChange={(event) =>
              updateField("purchasePrice", event.target.value)
            }
            placeholder="Enter purchase price"
          />
        </div>
      </>
    );
  };

  const renderViewInventorySection = () => {
    if (isService) {
      return (
        <>
          <div className="section-form-title">
            <h3>Inventory</h3>

            <p>Services do not use inventory tracking</p>
          </div>

          <div className="section-info-box">
            <strong>Service Product</strong>

            <p>
              Opening stock, current stock and reorder level are not applicable
              for services.
            </p>
          </div>
        </>
      );
    }

    return (
      <>
        <div className="section-form-title">
          <h3>Inventory</h3>

          <p>Current inventory information</p>
        </div>

        <div className="product-detail-grid">
          <DetailItem label="Track Inventory">
            {formData.trackInventory ? "Yes" : "No"}
          </DetailItem>

          <DetailItem label="Current Stock">
            {`${formData.currentStock} ${formData.unit}`}
          </DetailItem>

          <DetailItem label="Opening Stock">
            {`${formData.openingStock} ${formData.unit}`}
          </DetailItem>

          <DetailItem label="Opening Stock Rate">
            {formatCurrency(formData.openingStockRate)}
          </DetailItem>

          <DetailItem label="Opening Inventory Value">
            {formatCurrency(openingInventoryValue)}
          </DetailItem>

          <DetailItem label="Reorder Level">
            {`${formData.reorderLevel} ${formData.unit}`}
          </DetailItem>
        </div>

        <div className="section-info-box product-stock-info">
          <strong>Stock changes are managed through Stock Movements</strong>

          <p>
            Opening stock and current stock cannot be edited from the Product
            master.
          </p>
        </div>
      </>
    );
  };

  const renderEditInventorySection = () => {
    if (isService) {
      return (
        <>
          <div className="section-form-title">
            <h3>Inventory</h3>

            <p>Services do not use inventory tracking</p>
          </div>

          <div className="section-info-box">
            <strong>Service Product</strong>

            <p>
              Inventory tracking, opening stock and reorder level are not
              applicable for services.
            </p>
          </div>
        </>
      );
    }

    return (
      <>
        <div className="section-form-title">
          <h3>Inventory</h3>

          <p>Update reorder settings and review stock balance</p>
        </div>

        {renderError()}

        <div className="section-form-grid">
          <Select
            label="Track Inventory"
            name="trackInventory"
            value={String(formData.trackInventory)}
            onChange={(event) =>
              updateField("trackInventory", event.target.value === "true")
            }
            options={inventoryTrackingOptions}
          />

          <Input
            label="Reorder Level"
            name="reorderLevel"
            type="number"
            min="0"
            step="0.001"
            value={formData.reorderLevel}
            onChange={(event) =>
              updateField("reorderLevel", event.target.value)
            }
            placeholder="Enter reorder level"
            disabled={!formData.trackInventory}
          />

          <Input
            label="Current Stock"
            name="currentStock"
            value={`${formData.currentStock} ${formData.unit}`}
            disabled
          />

          <Input
            label="Opening Stock"
            name="openingStock"
            value={`${formData.openingStock} ${formData.unit}`}
            disabled
          />

          <Input
            label="Opening Stock Rate"
            name="openingStockRate"
            value={formatCurrency(formData.openingStockRate)}
            disabled
          />

          <Input
            label="Opening Inventory Value"
            name="openingInventoryValue"
            value={formatCurrency(openingInventoryValue)}
            disabled
          />

          <div className="section-form-full">
            <div className="section-info-box product-stock-info">
              <strong>Inventory balance is protected</strong>

              <p>
                Use a stock adjustment, purchase receipt, sales delivery, or
                transfer to change stock quantities.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderViewAdvancedSection = () => {
    return (
      <>
        <div className="section-form-title">
          <h3>Advanced Details</h3>

          <p>Product audit and record information</p>
        </div>

        <div className="product-detail-grid">
          <DetailItem label="Created At">
            {formatDateTime(formData.createdAt)}
          </DetailItem>

          <DetailItem label="Last Updated">
            {formatDateTime(formData.updatedAt)}
          </DetailItem>

          <DetailItem label="Product ID" fullWidth>
            {formData._id}
          </DetailItem>
        </div>
      </>
    );
  };

  const renderEditAdvancedSection = () => {
    return (
      <>
        <div className="section-form-title">
          <h3>Advanced Details</h3>

          <p>Product record information</p>
        </div>

        <div className="product-detail-grid">
          <DetailItem label="Created At">
            {formatDateTime(formData.createdAt)}
          </DetailItem>

          <DetailItem label="Last Updated">
            {formatDateTime(formData.updatedAt)}
          </DetailItem>

          <DetailItem label="Product ID" fullWidth>
            {formData._id}
          </DetailItem>
        </div>
      </>
    );
  };

  const renderSection = () => {
    if (!isEditMode) {
      switch (activeSection) {
        case "basic":
          return renderViewBasicSection();

        case "pricing":
          return renderViewPricingSection();

        case "inventory":
          return renderViewInventorySection();

        case "advanced":
          return renderViewAdvancedSection();

        default:
          return null;
      }
    }

    switch (activeSection) {
      case "basic":
        return renderEditBasicSection();

      case "pricing":
        return renderEditPricingSection();

      case "inventory":
        return renderEditInventorySection();

      case "advanced":
        return renderEditAdvancedSection();

      default:
        return null;
    }
  };

  return (
    <SectionModal
      show={isOpen}
      onClose={handleClose}
      title={isEditMode ? "Edit Product" : "Product Details"}
      subtitle={
        isEditMode ? "Update product information" : "View product information"
      }
      icon={isEditMode ? Pencil : Eye}
      sections={sections}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      onSave={isEditMode ? handleSave : undefined}
      saveText={saving ? "Updating Product..." : "Update Product"}
      saving={saving}
      showSecondary={false}
    >
      {renderSection()}
    </SectionModal>
  );
}

export default ProductDetailsModal;
