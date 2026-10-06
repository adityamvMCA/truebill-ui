import { useState } from "react";
import {
  X,
  FileText,
  User,
  Package,
  Truck,
  IndianRupee,
  Settings,
  ChevronDown,
  Plus,
  Trash2,
} from "lucide-react";

import "../styles/sales-order-modal1.css";

const SalesOrderModal1 = ({ isOpen, onClose, onSave }) => {
  const [activeSection, setActiveSection] = useState("basic");

  const [formData, setFormData] = useState({
    orderNo: "SAL01",
    orderDate: new Date().toISOString().split("T")[0],
    customer: "",
    customerPhone: "",
    billingAddress: "",
    shippingAddress: "",
    paymentTerms: "Cash",
    priceList: "Default Price List",
    warehouse: "Main Warehouse",
    notes: "",
  });

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

  if (!isOpen) return null;

  const updateField = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateProduct = (id, field, value) => {
    setProducts((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  const addProduct = () => {
    setProducts((prev) => [
      ...prev,
      {
        id: Date.now(),
        product: "",
        qty: 1,
        rate: 0,
        discount: 0,
        tax: 0,
      },
    ]);
  };

  const removeProduct = (id) => {
    if (products.length === 1) return;

    setProducts((prev) => prev.filter((item) => item.id !== id));
  };

  const calculateProductAmount = (item) => {
    const qty = Number(item.qty) || 0;
    const rate = Number(item.rate) || 0;
    const discount = Number(item.discount) || 0;

    const amount = qty * rate;
    return amount - (amount * discount) / 100;
  };

  const subtotal = products.reduce(
    (total, item) => total + calculateProductAmount(item),
    0
  );

  const taxAmount = products.reduce((total, item) => {
    const amount = calculateProductAmount(item);
    const tax = Number(item.tax) || 0;

    return total + (amount * tax) / 100;
  }, 0);

  const grandTotal = subtotal + taxAmount;

  const handleSave = () => {
    const payload = {
      ...formData,
      products,
      subtotal,
      taxAmount,
      grandTotal,
    };

    if (onSave) {
      onSave(payload);
    }

    onClose();
  };

  const sections = [
    {
      id: "basic",
      label: "Basic Details",
      icon: FileText,
      required: true,
    },
    {
      id: "customer",
      label: "Customer Details",
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

  return (
    <div className="sales-modal-overlay">
      <div className="sales-modal">

        <div className="sales-modal-header">
          <div className="sales-modal-title">
            <div className="sales-modal-title-icon">
              <FileText size={17} />
            </div>

            <div>
              <h2>Create Sales Order</h2>
              <span>Enter sales order details</span>
            </div>
          </div>

          <button
            type="button"
            className="sales-modal-close"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <div className="sales-modal-content">

          {/* LEFT MENU */}

          <div className="sales-modal-sidebar">

            <div className="sales-modal-sidebar-title">
              Sales Order
            </div>

            {sections.map((section) => {
              const Icon = section.icon;

              return (
                <button
                  key={section.id}
                  type="button"
                  className={`sales-modal-menu-item ${
                    activeSection === section.id
                      ? "sales-modal-menu-active"
                      : ""
                  }`}
                  onClick={() => setActiveSection(section.id)}
                >
                  <span className="sales-modal-menu-icon">
                    <Icon size={15} />
                  </span>

                  <span>{section.label}</span>

                  {section.required && (
                    <b>*</b>
                  )}
                </button>
              );
            })}

          </div>

          {/* RIGHT CONTENT */}

          <div className="sales-modal-form">

            {activeSection === "basic" && (
              <>
                <div className="sales-form-section-title">
                  <h3>Basic Details</h3>
                  <p>Enter basic sales order information</p>
                </div>

                <div className="sales-form-grid">

                  <div className="sales-field">
                    <label>
                      Order No <span>*</span>
                    </label>

                    <input
                      value={formData.orderNo}
                      onChange={(e) =>
                        updateField("orderNo", e.target.value)
                      }
                    />
                  </div>

                  <div className="sales-field">
                    <label>
                      Order Date <span>*</span>
                    </label>

                    <input
                      type="date"
                      value={formData.orderDate}
                      onChange={(e) =>
                        updateField("orderDate", e.target.value)
                      }
                    />
                  </div>

                  <div className="sales-field">
                    <label>
                      Customer <span>*</span>
                    </label>

                    <div className="sales-select-wrapper">
                      <select
                        value={formData.customer}
                        onChange={(e) =>
                          updateField("customer", e.target.value)
                        }
                      >
                        <option value="">Select Customer</option>
                        <option value="CUST001">
                          Shree Balaji Constructions
                        </option>
                        <option value="CUST002">
                          Vijay Steel Industries
                        </option>
                        <option value="CUST003">
                          Karnataka Electricals
                        </option>
                      </select>

                      <ChevronDown size={15} />
                    </div>
                  </div>

                  <div className="sales-field">
                    <label>Payment Terms</label>

                    <div className="sales-select-wrapper">
                      <select
                        value={formData.paymentTerms}
                        onChange={(e) =>
                          updateField(
                            "paymentTerms",
                            e.target.value
                          )
                        }
                      >
                        <option>Cash</option>
                        <option>15 Days</option>
                        <option>30 Days</option>
                        <option>45 Days</option>
                        <option>60 Days</option>
                      </select>

                      <ChevronDown size={15} />
                    </div>
                  </div>

                  <div className="sales-field">
                    <label>Price List</label>

                    <div className="sales-select-wrapper">
                      <select
                        value={formData.priceList}
                        onChange={(e) =>
                          updateField(
                            "priceList",
                            e.target.value
                          )
                        }
                      >
                        <option>Default Price List</option>
                        <option>Retail Price</option>
                        <option>Wholesale Price</option>
                      </select>

                      <ChevronDown size={15} />
                    </div>
                  </div>

                  <div className="sales-field">
                    <label>Warehouse</label>

                    <div className="sales-select-wrapper">
                      <select
                        value={formData.warehouse}
                        onChange={(e) =>
                          updateField(
                            "warehouse",
                            e.target.value
                          )
                        }
                      >
                        <option>Main Warehouse</option>
                        <option>Warehouse 2</option>
                        <option>Warehouse 3</option>
                      </select>

                      <ChevronDown size={15} />
                    </div>
                  </div>

                </div>
              </>
            )}

            {activeSection === "customer" && (
              <>
                <div className="sales-form-section-title">
                  <h3>Customer Details</h3>
                  <p>Customer contact and address information</p>
                </div>

                <div className="sales-form-grid">

                  <div className="sales-field">
                    <label>Customer Phone</label>

                    <input
                      placeholder="Enter phone number"
                      value={formData.customerPhone}
                      onChange={(e) =>
                        updateField(
                          "customerPhone",
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div className="sales-field sales-field-full">
                    <label>Billing Address</label>

                    <textarea
                      rows="3"
                      placeholder="Enter billing address"
                      value={formData.billingAddress}
                      onChange={(e) =>
                        updateField(
                          "billingAddress",
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div className="sales-field sales-field-full">
                    <label>Shipping Address</label>

                    <textarea
                      rows="3"
                      placeholder="Enter shipping address"
                      value={formData.shippingAddress}
                      onChange={(e) =>
                        updateField(
                          "shippingAddress",
                          e.target.value
                        )
                      }
                    />
                  </div>

                </div>
              </>
            )}

            {activeSection === "products" && (
              <>
                <div className="sales-form-section-title sales-products-title">
                  <div>
                    <h3>Products</h3>
                    <p>Add products to this sales order</p>
                  </div>

                  <button
                    type="button"
                    className="sales-add-product-btn"
                    onClick={addProduct}
                  >
                    <Plus size={15} />
                    Add Product
                  </button>
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
                        <th></th>
                      </tr>
                    </thead>

                    <tbody>
                      {products.map((item) => (
                        <tr key={item.id}>

                          <td>
                            <select
                              value={item.product}
                              onChange={(e) =>
                                updateProduct(
                                  item.id,
                                  "product",
                                  e.target.value
                                )
                              }
                            >
                              <option value="">
                                Select Product
                              </option>
                              <option value="Cement">
                                Cement
                              </option>
                              <option value="Steel">
                                Steel
                              </option>
                              <option value="Bricks">
                                Bricks
                              </option>
                              <option value="Electrical Wire">
                                Electrical Wire
                              </option>
                            </select>
                          </td>

                          <td>
                            <input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={(e) =>
                                updateProduct(
                                  item.id,
                                  "qty",
                                  e.target.value
                                )
                              }
                            />
                          </td>

                          <td>
                            <input
                              type="number"
                              min="0"
                              value={item.rate}
                              onChange={(e) =>
                                updateProduct(
                                  item.id,
                                  "rate",
                                  e.target.value
                                )
                              }
                            />
                          </td>

                          <td>
                            <input
                              type="number"
                              min="0"
                              value={item.discount}
                              onChange={(e) =>
                                updateProduct(
                                  item.id,
                                  "discount",
                                  e.target.value
                                )
                              }
                            />
                          </td>

                          <td>
                            <input
                              type="number"
                              min="0"
                              value={item.tax}
                              onChange={(e) =>
                                updateProduct(
                                  item.id,
                                  "tax",
                                  e.target.value
                                )
                              }
                            />
                          </td>

                          <td className="sales-product-amount">
                            ₹
                            {calculateProductAmount(item).toFixed(2)}
                          </td>

                          <td>
                            <button
                              type="button"
                              className="sales-delete-product"
                              onClick={() =>
                                removeProduct(item.id)
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
            )}

            {activeSection === "delivery" && (
              <>
                <div className="sales-form-section-title">
                  <h3>Delivery Details</h3>
                  <p>Enter delivery information</p>
                </div>

                <div className="sales-form-grid">

                  <div className="sales-field">
                    <label>Delivery Date</label>
                    <input type="date" />
                  </div>

                  <div className="sales-field">
                    <label>Delivery Status</label>

                    <div className="sales-select-wrapper">
                      <select>
                        <option>Pending</option>
                        <option>Processing</option>
                        <option>Partially Delivered</option>
                        <option>Delivered</option>
                      </select>

                      <ChevronDown size={15} />
                    </div>
                  </div>

                  <div className="sales-field sales-field-full">
                    <label>Delivery Address</label>

                    <textarea
                      rows="4"
                      placeholder="Enter delivery address"
                    />
                  </div>

                </div>
              </>
            )}

            {activeSection === "pricing" && (
              <>
                <div className="sales-form-section-title">
                  <h3>Pricing Details</h3>
                  <p>Configure pricing and payment details</p>
                </div>

                <div className="sales-form-grid">

                  <div className="sales-field">
                    <label>Price List</label>

                    <div className="sales-select-wrapper">
                      <select>
                        <option>Default Price List</option>
                        <option>Retail Price</option>
                        <option>Wholesale Price</option>
                      </select>

                      <ChevronDown size={15} />
                    </div>
                  </div>

                  <div className="sales-field">
                    <label>Payment Terms</label>

                    <div className="sales-select-wrapper">
                      <select>
                        <option>Cash</option>
                        <option>15 Days</option>
                        <option>30 Days</option>
                        <option>45 Days</option>
                      </select>

                      <ChevronDown size={15} />
                    </div>
                  </div>

                </div>
              </>
            )}

            {activeSection === "advanced" && (
              <>
                <div className="sales-form-section-title">
                  <h3>Advanced Details</h3>
                  <p>Additional sales order information</p>
                </div>

                <div className="sales-form-grid">

                  <div className="sales-field sales-field-full">
                    <label>Notes</label>

                    <textarea
                      rows="5"
                      placeholder="Enter notes..."
                      value={formData.notes}
                      onChange={(e) =>
                        updateField(
                          "notes",
                          e.target.value
                        )
                      }
                    />
                  </div>

                </div>
              </>
            )}

          </div>
        </div>

        <div className="sales-modal-footer">

          <button
            type="button"
            className="sales-cancel-btn"
            onClick={onClose}
          >
            Cancel
          </button>

          <div className="sales-footer-right">

            <button
              type="button"
              className="sales-save-draft-btn"
              onClick={handleSave}
            >
              Save Draft
            </button>

            <button
              type="button"
              className="sales-create-btn"
              onClick={handleSave}
            >
              Create Sales Order
            </button>

          </div>

        </div>

      </div>
    </div>
  );
};

export default SalesOrderModal1;