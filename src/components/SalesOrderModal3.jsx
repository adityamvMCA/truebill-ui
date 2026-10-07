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

import Select from "./common/Form/Select";
import Input from "./common/Form/Input";
import Textarea from "./common/Form/Textarea";
import Button from "./common/Form/Button";
import SectionModal from "./common/Modal/SectionModal";

// No sales-order-modal.css

const SalesOrderModal3 = ({
  isOpen,
  onClose,
  onSave,
}) => {
  /* =====================================================
     ACTIVE SECTION
  ===================================================== */

  const [activeSection, setActiveSection] = useState("basic");

  /* =====================================================
     FORM DATA
  ===================================================== */

  const [formData, setFormData] = useState({
    orderNo: "SAL01",

    orderDate: new Date()
      .toISOString()
      .split("T")[0],

    customer: "",
    customerPhone: "",

    billingAddress: "",
    shippingAddress: "",

    paymentTerms: "Cash",

    priceList: "Default Price List",

    warehouse: "Main Warehouse",

    deliveryDate: "",

    deliveryStatus: "Pending",

    deliveryAddress: "",

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
     FIELD UPDATE
  ===================================================== */

  const updateField = (field, value) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  /* =====================================================
     PRODUCT UPDATE
  ===================================================== */

  const updateProduct = (id, field, value) => {
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
      previous.filter((item) => item.id !== id)
    );
  };

  /* =====================================================
     PRODUCT AMOUNT
  ===================================================== */

  const calculateProductAmount = (item) => {
    const qty = Number(item.qty) || 0;

    const rate = Number(item.rate) || 0;

    const discount = Number(item.discount) || 0;

    const amount = qty * rate;

    return amount - (amount * discount) / 100;
  };

  /* =====================================================
     SUBTOTAL
  ===================================================== */

  const subtotal = products.reduce(
    (total, item) =>
      total + calculateProductAmount(item),
    0
  );

  /* =====================================================
     TAX
  ===================================================== */

  const taxAmount = products.reduce(
    (total, item) => {
      const amount = calculateProductAmount(item);

      const tax = Number(item.tax) || 0;

      return total + (amount * tax) / 100;
    },
    0
  );

  /* =====================================================
     GRAND TOTAL
  ===================================================== */

  const grandTotal = subtotal + taxAmount;

  /* =====================================================
     SAVE
  ===================================================== */

  const handleSave = () => {
    const payload = {
      ...formData,

      products,

      subtotal,
      taxAmount,
      grandTotal,
    };

    console.log(
      "Sales Order Payload:",
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
      "Sales Order Draft:",
      payload
    );

    onSave?.(payload);
  };

  /* =====================================================
     SECTIONS
  ===================================================== */

  const sections = [
    {
      id: "basic",
      label: "Basic Details",
      icon: FileText,
      required: true,
      title: "Basic Details",
      description:
        "Enter basic sales order information",
    },

    {
      id: "customer",
      label: "Customer Details",
      icon: User,
      title: "Customer Details",
      description:
        "Customer contact and address information",
    },

    {
      id: "products",
      label: "Products",
      icon: Package,
      title: "Products",
      description:
        "Add products to this sales order",
    },

    {
      id: "delivery",
      label: "Delivery Details",
      icon: Truck,
      title: "Delivery Details",
      description:
        "Enter delivery information",
    },

    {
      id: "pricing",
      label: "Pricing Details",
      icon: IndianRupee,
      title: "Pricing Details",
      description:
        "Configure pricing and payment details",
    },

    {
      id: "advanced",
      label: "Advanced Details",
      icon: Settings,
      title: "Advanced Details",
      description:
        "Additional sales order information",
    },
  ];

  /* =====================================================
     OPTIONS
  ===================================================== */

  const customerOptions = [
    {
      value: "CUST001",
      label: "Shree Balaji Constructions",
    },
    {
      value: "CUST002",
      label: "Vijay Steel Industries",
    },
    {
      value: "CUST003",
      label: "Karnataka Electricals",
    },
  ];

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

  const priceListOptions = [
    {
      value: "Default Price List",
      label: "Default Price List",
    },
    {
      value: "Retail Price",
      label: "Retail Price",
    },
    {
      value: "Wholesale Price",
      label: "Wholesale Price",
    },
  ];

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
      value: "Partially Delivered",
      label: "Partially Delivered",
    },
    {
      value: "Delivered",
      label: "Delivered",
    },
  ];

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
  ];

  /* =====================================================
     BASIC SECTION
  ===================================================== */

  const renderBasicSection = () => {
    return (
      <>
        <div className="sales-form-section-title">
          <h3>Basic Details</h3>

          <p>
            Enter basic sales order information
          </p>
        </div>

        <div className="sales-form-grid">

          <Input
            label="Order No"
            name="orderNo"
            value={formData.orderNo}
            onChange={(event) =>
              updateField(
                "orderNo",
                event.target.value
              )
            }
            placeholder="Enter order number"
            required
          />

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

          <Select
            label="Customer"
            name="customer"
            value={formData.customer}
            onChange={(event) =>
              updateField(
                "customer",
                event.target.value
              )
            }
            options={customerOptions}
            placeholder="Select Customer"
            required
          />

          <Select
            label="Payment Terms"
            name="paymentTerms"
            value={formData.paymentTerms}
            onChange={(event) =>
              updateField(
                "paymentTerms",
                event.target.value
              )
            }
            options={paymentTermsOptions}
          />

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
     CUSTOMER SECTION
  ===================================================== */

  const renderCustomerSection = () => {
    return (
      <>
        <div className="sales-form-section-title">
          <h3>Customer Details</h3>

          <p>
            Customer contact and address information
          </p>
        </div>

        <div className="sales-form-grid">

          <Input
            label="Customer Phone"
            name="customerPhone"
            type="tel"
            value={formData.customerPhone}
            onChange={(event) =>
              updateField(
                "customerPhone",
                event.target.value
              )
            }
            placeholder="Enter phone number"
          />

          <div />

          <div className="sales-form-full">
            <Textarea
              label="Billing Address"
              name="billingAddress"
              value={formData.billingAddress}
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

          <div className="sales-form-full">
            <Textarea
              label="Shipping Address"
              name="shippingAddress"
              value={formData.shippingAddress}
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
     PRODUCTS SECTION
  ===================================================== */

  const renderProductsSection = () => {
    return (
      <>
        <div className="sales-products-title">

          <div>
            <h3>Products</h3>

            <p>
              Add products to this sales order
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

        <div className="sales-products-table-wrapper">

          <table className="sales-products-table">

            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Discount %</th>
                <th>Tax %</th>
                <th>Amount</th>
                <th />
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
                      options={productOptions}
                      placeholder="Select Product"
                    />
                  </td>

                  {/* QTY */}
                  <td>
                    <Input
                      name={`qty-${item.id}`}
                      type="number"
                      value={item.qty}
                      onChange={(event) =>
                        updateProduct(
                          item.id,
                          "qty",
                          event.target.value
                        )
                      }
                      min="1"
                    />
                  </td>

                  {/* RATE */}
                  <td>
                    <Input
                      name={`rate-${item.id}`}
                      type="number"
                      value={item.rate}
                      onChange={(event) =>
                        updateProduct(
                          item.id,
                          "rate",
                          event.target.value
                        )
                      }
                      min="0"
                      step="0.01"
                    />
                  </td>

                  {/* DISCOUNT */}
                  <td>
                    <Input
                      name={`discount-${item.id}`}
                      type="number"
                      value={item.discount}
                      onChange={(event) =>
                        updateProduct(
                          item.id,
                          "discount",
                          event.target.value
                        )
                      }
                      min="0"
                      step="0.01"
                    />
                  </td>

                  {/* TAX */}
                  <td>
                    <Input
                      name={`tax-${item.id}`}
                      type="number"
                      value={item.tax}
                      onChange={(event) =>
                        updateProduct(
                          item.id,
                          "tax",
                          event.target.value
                        )
                      }
                      min="0"
                      step="0.01"
                    />
                  </td>

                  {/* AMOUNT */}
                  <td className="sales-product-amount">
                    ₹
                    {calculateProductAmount(
                      item
                    ).toFixed(2)}
                  </td>

                  {/* DELETE */}
                  <td>
                    <button
                      type="button"
                      className="sales-delete-product"
                      onClick={() =>
                        removeProduct(item.id)
                      }
                      disabled={
                        products.length === 1
                      }
                      title={
                        products.length === 1
                          ? "At least one product is required"
                          : "Remove product"
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>

                </tr>
              ))}

            </tbody>

          </table>

        </div>

        {/* SUMMARY */}

        <div className="sales-summary">

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

          <div className="sales-grand-total">
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
     DELIVERY SECTION
  ===================================================== */

  const renderDeliverySection = () => {
    return (
      <>
        <div className="sales-form-section-title">
          <h3>Delivery Details</h3>

          <p>
            Enter delivery information
          </p>
        </div>

        <div className="sales-form-grid">

          <Input
            label="Delivery Date"
            name="deliveryDate"
            type="date"
            value={formData.deliveryDate}
            onChange={(event) =>
              updateField(
                "deliveryDate",
                event.target.value
              )
            }
          />

          <Select
            label="Delivery Status"
            name="deliveryStatus"
            value={formData.deliveryStatus}
            onChange={(event) =>
              updateField(
                "deliveryStatus",
                event.target.value
              )
            }
            options={deliveryStatusOptions}
          />

          <div className="sales-form-full">
            <Textarea
              label="Delivery Address"
              name="deliveryAddress"
              value={formData.deliveryAddress}
              onChange={(event) =>
                updateField(
                  "deliveryAddress",
                  event.target.value
                )
              }
              placeholder="Enter delivery address"
              rows={4}
            />
          </div>

        </div>
      </>
    );
  };

  /* =====================================================
     PRICING SECTION
  ===================================================== */

  const renderPricingSection = () => {
    return (
      <>
        <div className="sales-form-section-title">
          <h3>Pricing Details</h3>

          <p>
            Configure pricing and payment details
          </p>
        </div>

        <div className="sales-form-grid">

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
            value={formData.paymentTerms}
            onChange={(event) =>
              updateField(
                "paymentTerms",
                event.target.value
              )
            }
            options={paymentTermsOptions}
          />

        </div>

        {/* TOTAL PREVIEW */}

        <div className="sales-pricing-summary">

          <div className="sales-pricing-row">
            <span>Subtotal</span>

            <strong>
              ₹{subtotal.toFixed(2)}
            </strong>
          </div>

          <div className="sales-pricing-row">
            <span>Tax</span>

            <strong>
              ₹{taxAmount.toFixed(2)}
            </strong>
          </div>

          <div className="sales-pricing-row sales-pricing-total">
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
     ADVANCED SECTION
  ===================================================== */

  const renderAdvancedSection = () => {
    return (
      <>
        <div className="sales-form-section-title">
          <h3>Advanced Details</h3>

          <p>
            Additional sales order information
          </p>
        </div>

        <div className="sales-form-grid">

          <div className="sales-form-full">
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
     SECTION CONTENT
  ===================================================== */

  const renderSection = () => {
    switch (activeSection) {
      case "basic":
        return renderBasicSection();

      case "customer":
        return renderCustomerSection();

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
     RENDER
  ===================================================== */

  return (
    <SectionModal
      show={isOpen}
      onClose={onClose}

      title="Create Sales Order"
      subtitle="Enter sales order details"

      icon={FileText}

      sections={sections}

      activeSection={activeSection}
      onSectionChange={setActiveSection}

      onSave={handleSave}
      onSecondary={handleSaveDraft}

      saveText="Create Sales Order"
      secondaryText="Save Draft"

      showSecondary
    >
      {renderSection()}
    </SectionModal>
  );
};

export default SalesOrderModal3;