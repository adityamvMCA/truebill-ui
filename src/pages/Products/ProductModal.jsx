import { useEffect, useMemo, useState } from "react";

import { FileText, IndianRupee, Package, Settings } from "lucide-react";

import Input from "../../components/common/Form/Input";
import Select from "../../components/common/Form/Select";
import Textarea from "../../components/common/Form/Textarea";
import SectionModal from "../../components/common/Modal/SectionModal";
import api from "../../services/api";
import toast from "react-hot-toast";

const INITIAL_FORM_DATA = {
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

  reorderLevel: 0,

  status: "ACTIVE",
};

const ProductModal = ({ isOpen, onClose, onSave }) => {
  const [activeSection, setActiveSection] = useState("basic");
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setActiveSection("basic");

    setFormData(INITIAL_FORM_DATA);

    setError("");
  }, [isOpen]);

  const updateField = (field, value) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));

    if (error) {
      setError("");
    }
  };
  const isService = formData.type === "SERVICE";
  const openingStockValue = useMemo(() => {
    const stock = Number(formData.openingStock) || 0;

    const rate = Number(formData.openingStockRate) || 0;

    return stock * rate;
  }, [formData.openingStock, formData.openingStockRate]);

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

    if (!isService) {
      const openingStock = Number(formData.openingStock) || 0;

      const openingStockRate = Number(formData.openingStockRate) || 0;

      if (openingStock < 0) {
        setActiveSection("inventory");

        setError("Opening stock cannot be negative.");

        return false;
      }

      if (openingStock > 0 && openingStockRate <= 0) {
        setActiveSection("inventory");

        setError(
          "Opening stock rate is required when opening stock is greater than zero.",
        );

        return false;
      }
    }

    return true;
  };
  const buildPayload = () => {
    return {
      name: formData.name.trim(),

      type: formData.type,

      category: formData.category.trim() || null,

      brand: formData.brand.trim() || null,

      unit: formData.unit,

      description: formData.description.trim() || null,

      hsnSacCode: formData.hsnSacCode.trim() || null,

      gstRate: Number(formData.gstRate) || 0,

      salePrice: Number(formData.salePrice) || 0,

      purchasePrice: Number(formData.purchasePrice) || 0,

      trackInventory: isService ? false : Boolean(formData.trackInventory),

      openingStock:
        isService || !formData.trackInventory
          ? 0
          : Number(formData.openingStock) || 0,

      openingStockRate:
        isService || !formData.trackInventory
          ? 0
          : Number(formData.openingStockRate) || 0,

      reorderLevel:
        isService || !formData.trackInventory
          ? 0
          : Number(formData.reorderLevel) || 0,

      status: formData.status || "ACTIVE",
    };
  };

  const getApiErrorMessage = (apiError) => {
    const responseData = apiError?.response?.data;

    if (typeof responseData?.message === "string") {
      return responseData.message;
    }

    if (typeof responseData?.error === "string") {
      return responseData.error;
    }

    if (Array.isArray(responseData?.errors) && responseData.errors.length > 0) {
      return responseData.errors
        .map((item) => item.message || item.msg || String(item))
        .join(", ");
    }

    return apiError?.message || "Unable to create product. Please try again.";
  };

  const handleSave = async () => {
    if (saving || !validateForm()) {
      return;
    }

    const payload = buildPayload();

    try {
      setSaving(true);

      setError("");

      const response = await api.product.create(payload);

      const createdProduct =
        response?.data?.product || response?.data?.data || response?.data;

      if (!createdProduct?._id) {
        throw new Error(
          "Product was created, but product data was not returned by the server.",
        );
      }

      onSave?.(createdProduct);

      toast.success(`${createdProduct.name} created successfully`);

      setFormData(INITIAL_FORM_DATA);

      setActiveSection("basic");

      setError("");

      onClose?.();
    } catch (apiError) {
      const errorMessage = getApiErrorMessage(apiError);

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
      value: "PCS",
      label: "Pieces",
    },

    {
      value: "BAG",
      label: "Bag",
    },

    {
      value: "BOX",
      label: "Box",
    },

    {
      value: "KG",
      label: "Kilogram",
    },

    {
      value: "LTR",
      label: "Litre",
    },

    {
      value: "MTR",
      label: "Metre",
    },

    {
      value: "SQFT",
      label: "Square Feet",
    },

    {
      value: "HOUR",
      label: "Hour",
    },

    {
      value: "DAY",
      label: "Day",
    },
  ];

  const gstRateOptions = [
    {
      value: 0,
      label: "0%",
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
      value: true,
      label: "Yes",
    },

    {
      value: false,
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

  const renderBasicSection = () => {
    return (
      <>
        <div className="section-form-title">
          <h3>Basic Details</h3>

          <p>Enter basic product information</p>
        </div>

        {renderError()}

        <div className="section-form-grid">
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
            label="Status"
            name="status"
            value={formData.status}
            onChange={(event) => updateField("status", event.target.value)}
            options={statusOptions}
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

  const renderPricingSection = () => {
    return (
      <>
        <div className="section-form-title">
          <h3>Pricing & Tax</h3>

          <p>Configure sale price, purchase price and tax details</p>
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

  const renderInventorySection = () => {
    if (isService) {
      return (
        <>
          <div className="section-form-title">
            <h3>Inventory</h3>

            <p>Services do not use inventory tracking</p>
          </div>

          {renderError()}

          <div className="section-form-grid">
            <div className="section-form-full">
              <div className="section-info-box">
                <strong>Service Product</strong>

                <p>
                  Inventory tracking, opening stock and reorder level are not
                  applicable for services.
                </p>
              </div>
            </div>
          </div>
        </>
      );
    }

    return (
      <>
        <div className="section-form-title">
          <h3>Inventory</h3>

          <p>Configure stock tracking and opening inventory</p>
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
            options={inventoryTrackingOptions.map((option) => ({
              ...option,
              value: String(option.value),
            }))}
          />

          <Input
            label="Opening Stock"
            name="openingStock"
            type="number"
            min="0"
            step="0.001"
            value={formData.openingStock}
            onChange={(event) =>
              updateField("openingStock", event.target.value)
            }
            placeholder="Enter opening stock"
            disabled={!formData.trackInventory}
          />

          <Input
            label="Opening Stock Rate"
            name="openingStockRate"
            type="number"
            min="0"
            step="0.01"
            value={formData.openingStockRate}
            onChange={(event) =>
              updateField("openingStockRate", event.target.value)
            }
            placeholder="Enter cost per unit"
            disabled={!formData.trackInventory}
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

          <div className="section-form-full">
            <div className="section-summary">
              <div>
                <span>Opening Inventory Value</span>

                <strong>₹{openingStockValue.toFixed(2)}</strong>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderAdvancedSection = () => {
    return (
      <>
        <div className="section-form-title">
          <h3>Advanced Details</h3>

          <p>Additional product information</p>
        </div>

        {renderError()}

        <div className="section-form-grid">
          <div className="section-form-full">
            <Textarea
              label="Notes"
              name="description"
              value={formData.description}
              onChange={(event) =>
                updateField("description", event.target.value)
              }
              placeholder="Enter additional notes..."
              rows={5}
            />
          </div>
        </div>
      </>
    );
  };

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
      subtitle="Enter product details"
      icon={Package}
      sections={sections}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      onSave={handleSave}
      saveText={saving ? "Creating Product..." : "Create Product"}
      saving={saving}
      showSecondary={false}
    >
      {renderSection()}
    </SectionModal>
  );
};

export default ProductModal;
