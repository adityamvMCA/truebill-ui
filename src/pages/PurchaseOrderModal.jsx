import { useState } from "react";

import {
  FileText,
  User,
  Package,
  Truck,
  IndianRupee,
  Settings,
  Plus,
  Trash2,
} from "lucide-react";
import Select from "../components/common/Form/Select";
import Input from "../components/common/Form/Input";
import Textarea from "../components/common/Form/Textarea";
import Button from "../components/common/Form/Button";
import SectionModal from "../components/common/Modal/SectionModal";



const PurchaseOrderModal = ({
  isOpen,
  onClose,
  onSave,
}) => {
  /* =====================================================
     ACTIVE SECTION
  ===================================================== */

  const [activeSection, setActiveSection] =
    useState("basic");

  /* =====================================================
     FORM DATA
  ===================================================== */

  const [formData, setFormData] = useState({
    purchaseOrderNo: "PO-00001",

    orderDate: new Date()
      .toISOString()
      .split("T")[0],

    supplier: "",
    supplierPhone: "",

    billingAddress: "",
    shippingAddress: "",

    paymentTerms: "30 Days",

    priceList: "Purchase Price List",

    warehouse: "Main Warehouse",

    expectedDate: "",

    deliveryStatus: "Pending",

    notes: "",
  });

  /* =====================================================
     PRODUCTS
  ===================================================== */

  const [products, setProducts] = useState([
    {
      id: Date.now(),
      product: "",
      qty: 1,
      rate: 0,
      discount: 0,
      tax: 0,
    },
  ]);

  /* =====================================================
     UPDATE FORM FIELD
  ===================================================== */

  const updateField = (field, value) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  /* =====================================================
     UPDATE PRODUCT
  ===================================================== */

  const updateProduct = (
    id,
    field,
    value
  ) => {
    setProducts((previous) =>
      previous.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  /* =====================================================
     ADD PRODUCT
  ===================================================== */

  const addProduct = () => {
    setProducts((previous) => [
      ...previous,
      {
        id: Date.now() + Math.random(),
        product: "",
        qty: 1,
        rate: 0,
        discount: 0,
        tax: 0,
      },
    ]);
  };

  /* =====================================================
     REMOVE PRODUCT
  ===================================================== */

  const removeProduct = (id) => {
    if (products.length === 1) {
      return;
    }

    setProducts((previous) =>
      previous.filter(
        (item) => item.id !== id
      )
    );
  };

  /* =====================================================
     CALCULATE PRODUCT AMOUNT
  ===================================================== */

  const calculateProductAmount = (
    item
  ) => {
    const qty = Number(item.qty) || 0;

    const rate = Number(item.rate) || 0;

    const discount =
      Number(item.discount) || 0;

    const amount = qty * rate;

    return (
      amount -
      (amount * discount) / 100
    );
  };

  /* =====================================================
     SUBTOTAL
  ===================================================== */

  const subtotal = products.reduce(
    (total, item) =>
      total +
      calculateProductAmount(item),
    0
  );

  /* =====================================================
     TAX
  ===================================================== */

  const taxAmount = products.reduce(
    (total, item) => {
      const amount =
        calculateProductAmount(item);

      const tax =
        Number(item.tax) || 0;

      return (
        total +
        (amount * tax) / 100
      );
    },
    0
  );

  /* =====================================================
     GRAND TOTAL
  ===================================================== */

  const grandTotal =
    subtotal + taxAmount;

  /* =====================================================
     SAVE PURCHASE ORDER
  ===================================================== */

  const handleSave = () => {
    const payload = {
      ...formData,

      products,

      subtotal,
      taxAmount,
      grandTotal,

      status: "Created",
    };

    console.log(
      "Purchase Order Payload:",
      payload
    );

    onSave?.(payload);

    onClose?.();
  };

  /* =====================================================
     SAVE DRAFT
  ===================================================== */

  const handleSaveDraft = () => {
    const payload = {
      ...formData,

      products,

      subtotal,
      taxAmount,
      grandTotal,

      status: "Draft",
    };

    console.log(
      "Purchase Order Draft:",
      payload
    );

    onSave?.(payload);
  };

  /* =====================================================
     SECTION CONFIGURATION
  ===================================================== */

  const sections = [
    {
      id: "basic",
      label: "Basic Details",
      icon: FileText,
      required: true,
    },

    {
      id: "supplier",
      label: "Supplier Details",
      icon: User,
    },

    {
      id: "products",
      label: "Products",
      icon: Package,
    },

    {
      id: "delivery",
      label: "Delivery Details",
      icon: Truck,
    },

    {
      id: "pricing",
      label: "Pricing Details",
      icon: IndianRupee,
    },

    {
      id: "advanced",
      label: "Advanced Details",
      icon: Settings,
    },
  ];

  /* =====================================================
     SUPPLIER OPTIONS
  ===================================================== */

  const supplierOptions = [
    {
      value: "SUP001",
      label: "ABC Traders",
    },

    {
      value: "SUP002",
      label: "Shree Suppliers",
    },

    {
      value: "SUP003",
      label: "Karnataka Steel Suppliers",
    },

    {
      value: "SUP004",
      label: "Sri Balaji Enterprises",
    },
  ];

  /* =====================================================
     PAYMENT TERMS
  ===================================================== */

  const paymentTermsOptions = [
    {
      value: "Cash",
      label: "Cash",
    },

    {
      value: "15 Days",
      label: "15 Days",
    },

    {
      value: "30 Days",
      label: "30 Days",
    },

    {
      value: "45 Days",
      label: "45 Days",
    },

    {
      value: "60 Days",
      label: "60 Days",
    },
  ];

  /* =====================================================
     PRICE LIST
  ===================================================== */

  const priceListOptions = [
    {
      value: "Purchase Price List",
      label: "Purchase Price List",
    },

    {
      value: "Wholesale Purchase",
      label: "Wholesale Purchase",
    },

    {
      value: "Special Supplier Price",
      label: "Special Supplier Price",
    },
  ];

  /* =====================================================
     WAREHOUSE
  ===================================================== */

  const warehouseOptions = [
    {
      value: "Main Warehouse",
      label: "Main Warehouse",
    },

    {
      value: "Warehouse 2",
      label: "Warehouse 2",
    },

    {
      value: "Warehouse 3",
      label: "Warehouse 3",
    },
  ];

  /* =====================================================
     DELIVERY STATUS
  ===================================================== */

  const deliveryStatusOptions = [
    {
      value: "Pending",
      label: "Pending",
    },

    {
      value: "Processing",
      label: "Processing",
    },

    {
      value: "Partially Received",
      label: "Partially Received",
    },

    {
      value: "Received",
      label: "Received",
    },
  ];

  /* =====================================================
     PRODUCT OPTIONS
  ===================================================== */

  const productOptions = [
    {
      value: "Cement",
      label: "Cement",
    },

    {
      value: "Steel",
      label: "Steel",
    },

    {
      value: "Bricks",
      label: "Bricks",
    },

    {
      value: "Electrical Wire",
      label: "Electrical Wire",
    },

    {
      value: "Tiles",
      label: "Tiles",
    },

    {
      value: "Paint",
      label: "Paint",
    },
  ];

  /* =====================================================
     BASIC DETAILS
  ===================================================== */

  const renderBasicSection = () => {
    return (
      <>
        <div className="section-form-title">
          <h3>Basic Details</h3>

          <p>
            Enter basic purchase order
            information
          </p>
        </div>

        <div className="section-form-grid">

          {/* PURCHASE ORDER NUMBER */}

          <Input
            label="Purchase Order No"
            name="purchaseOrderNo"
            value={
              formData.purchaseOrderNo
            }
            onChange={(event) =>
              updateField(
                "purchaseOrderNo",
                event.target.value
              )
            }
            placeholder="Enter purchase order number"
            required
          />

          {/* ORDER DATE */}

          <Input
            label="Order Date"
            name="orderDate"
            type="date"
            value={formData.orderDate}
            onChange={(event) =>
              updateField(
                "orderDate",
                event.target.value
              )
            }
            required
          />

          {/* SUPPLIER */}

          <Select
            label="Supplier"
            name="supplier"
            value={formData.supplier}
            onChange={(event) =>
              updateField(
                "supplier",
                event.target.value
              )
            }
            options={supplierOptions}
            placeholder="Select Supplier"
            required
          />

          {/* PAYMENT TERMS */}

          <Select
            label="Payment Terms"
            name="paymentTerms"
            value={
              formData.paymentTerms
            }
            onChange={(event) =>
              updateField(
                "paymentTerms",
                event.target.value
              )
            }
            options={
              paymentTermsOptions
            }
          />

          {/* PRICE LIST */}

          <Select
            label="Price List"
            name="priceList"
            value={formData.priceList}
            onChange={(event) =>
              updateField(
                "priceList",
                event.target.value
              )
            }
            options={priceListOptions}
          />

          {/* WAREHOUSE */}

          <Select
            label="Warehouse"
            name="warehouse"
            value={formData.warehouse}
            onChange={(event) =>
              updateField(
                "warehouse",
                event.target.value
              )
            }
            options={warehouseOptions}
          />

        </div>
      </>
    );
  };

  /* =====================================================
     SUPPLIER DETAILS
  ===================================================== */

  const renderSupplierSection = () => {
    return (
      <>
        <div className="section-form-title">
          <h3>Supplier Details</h3>

          <p>
            Supplier contact and address
            information
          </p>
        </div>

        <div className="section-form-grid">

          <Input
            label="Supplier Phone"
            name="supplierPhone"
            type="tel"
            value={
              formData.supplierPhone
            }
            onChange={(event) =>
              updateField(
                "supplierPhone",
                event.target.value
              )
            }
            placeholder="Enter phone number"
          />

          <div />

          <div className="section-form-full">
            <Textarea
              label="Billing Address"
              name="billingAddress"
              value={
                formData.billingAddress
              }
              onChange={(event) =>
                updateField(
                  "billingAddress",
                  event.target.value
                )
              }
              placeholder="Enter billing address"
              rows={3}
            />
          </div>

          <div className="section-form-full">
            <Textarea
              label="Shipping Address"
              name="shippingAddress"
              value={
                formData.shippingAddress
              }
              onChange={(event) =>
                updateField(
                  "shippingAddress",
                  event.target.value
                )
              }
              placeholder="Enter shipping address"
              rows={3}
            />
          </div>

        </div>
      </>
    );
  };

  /* =====================================================
     PRODUCTS
  ===================================================== */

  const renderProductsSection = () => {
    return (
      <>
        <div className="section-form-title section-products-header">

          <div>
            <h3>Products</h3>

            <p>
              Add products to this purchase
              order
            </p>
          </div>

          <Button
            type="button"
            variant="primary"
            size="small"
            icon={Plus}
            onClick={addProduct}
          >
            Add Product
          </Button>

        </div>

        <div className="section-table-wrapper">

          <table className="section-table">

            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Discount %</th>
                <th>Tax %</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>

            <tbody>

              {products.map((item) => (
                <tr key={item.id}>

                  {/* PRODUCT */}

                  <td>
                    <Select
                      name={`product-${item.id}`}
                      value={item.product}
                      onChange={(event) =>
                        updateProduct(
                          item.id,
                          "product",
                          event.target.value
                        )
                      }
                      options={
                        productOptions
                      }
                      placeholder="Select Product"
                    />
                  </td>

                  {/* QUANTITY */}

                  <td>
                    <Input
                      name={`qty-${item.id}`}
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={(event) =>
                        updateProduct(
                          item.id,
                          "qty",
                          event.target.value
                        )
                      }
                    />
                  </td>

                  {/* RATE */}

                  <td>
                    <Input
                      name={`rate-${item.id}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.rate}
                      onChange={(event) =>
                        updateProduct(
                          item.id,
                          "rate",
                          event.target.value
                        )
                      }
                    />
                  </td>

                  {/* DISCOUNT */}

                  <td>
                    <Input
                      name={`discount-${item.id}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        item.discount
                      }
                      onChange={(event) =>
                        updateProduct(
                          item.id,
                          "discount",
                          event.target.value
                        )
                      }
                    />
                  </td>

                  {/* TAX */}

                  <td>
                    <Input
                      name={`tax-${item.id}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.tax}
                      onChange={(event) =>
                        updateProduct(
                          item.id,
                          "tax",
                          event.target.value
                        )
                      }
                    />
                  </td>

                  {/* AMOUNT */}

                  <td className="section-table-amount">
                    ₹
                    {calculateProductAmount(
                      item
                    ).toFixed(2)}
                  </td>

                  {/* DELETE */}

                  <td>
                    <button
                      type="button"
                      className="section-delete-button"
                      onClick={() =>
                        removeProduct(
                          item.id
                        )
                      }
                      disabled={
                        products.length === 1
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>

                </tr>
              ))}

            </tbody>

          </table>

        </div>

        {/* SUMMARY */}

        <div className="section-summary">

          <div>
            <span>Subtotal</span>

            <strong>
              ₹{subtotal.toFixed(2)}
            </strong>
          </div>

          <div>
            <span>Tax</span>

            <strong>
              ₹{taxAmount.toFixed(2)}
            </strong>
          </div>

          <div className="section-grand-total">
            <span>Grand Total</span>

            <strong>
              ₹{grandTotal.toFixed(2)}
            </strong>
          </div>

        </div>
      </>
    );
  };

  /* =====================================================
     DELIVERY DETAILS
  ===================================================== */

  const renderDeliverySection = () => {
    return (
      <>
        <div className="section-form-title">
          <h3>Delivery Details</h3>

          <p>
            Enter expected delivery
            information
          </p>
        </div>

        <div className="section-form-grid">

          <Input
            label="Expected Date"
            name="expectedDate"
            type="date"
            value={
              formData.expectedDate
            }
            onChange={(event) =>
              updateField(
                "expectedDate",
                event.target.value
              )
            }
          />

          <Select
            label="Delivery Status"
            name="deliveryStatus"
            value={
              formData.deliveryStatus
            }
            onChange={(event) =>
              updateField(
                "deliveryStatus",
                event.target.value
              )
            }
            options={
              deliveryStatusOptions
            }
          />

        </div>
      </>
    );
  };

  /* =====================================================
     PRICING DETAILS
  ===================================================== */

  const renderPricingSection = () => {
    return (
      <>
        <div className="section-form-title">
          <h3>Pricing Details</h3>

          <p>
            Configure purchase pricing
            and payment details
          </p>
        </div>

        <div className="section-form-grid">

          <Select
            label="Price List"
            name="priceList"
            value={formData.priceList}
            onChange={(event) =>
              updateField(
                "priceList",
                event.target.value
              )
            }
            options={priceListOptions}
          />

          <Select
            label="Payment Terms"
            name="paymentTerms"
            value={
              formData.paymentTerms
            }
            onChange={(event) =>
              updateField(
                "paymentTerms",
                event.target.value
              )
            }
            options={
              paymentTermsOptions
            }
          />

        </div>

        <div className="section-summary">

          <div>
            <span>Subtotal</span>

            <strong>
              ₹{subtotal.toFixed(2)}
            </strong>
          </div>

          <div>
            <span>Tax</span>

            <strong>
              ₹{taxAmount.toFixed(2)}
            </strong>
          </div>

          <div className="section-grand-total">
            <span>Grand Total</span>

            <strong>
              ₹{grandTotal.toFixed(2)}
            </strong>
          </div>

        </div>
      </>
    );
  };

  /* =====================================================
     ADVANCED DETAILS
  ===================================================== */

  const renderAdvancedSection = () => {
    return (
      <>
        <div className="section-form-title">
          <h3>Advanced Details</h3>

          <p>
            Additional purchase order
            information
          </p>
        </div>

        <div className="section-form-grid">

          <div className="section-form-full">
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
              placeholder="Enter notes..."
              rows={5}
            />
          </div>

        </div>
      </>
    );
  };

  /* =====================================================
     RENDER ACTIVE SECTION
  ===================================================== */

  const renderSection = () => {
    switch (activeSection) {
      case "basic":
        return renderBasicSection();

      case "supplier":
        return renderSupplierSection();

      case "products":
        return renderProductsSection();

      case "delivery":
        return renderDeliverySection();

      case "pricing":
        return renderPricingSection();

      case "advanced":
        return renderAdvancedSection();

      default:
        return null;
    }
  };

  /* =====================================================
     MODAL
  ===================================================== */

  return (
    <SectionModal
      show={isOpen}
      onClose={onClose}
      title="Create Purchase Order"
      subtitle="Enter purchase order details"
      icon={FileText}
      sections={sections}
      activeSection={activeSection}
      onSectionChange={
        setActiveSection
      }
      onSave={handleSave}
      onSecondary={
        handleSaveDraft
      }
      saveText="Create Purchase Order"
      secondaryText="Save Draft"
      showSecondary
    >
      {renderSection()}
    </SectionModal>
  );
};

export default PurchaseOrderModal;