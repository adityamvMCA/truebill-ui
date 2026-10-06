import { useEffect, useState } from "react";
import {
  X,
  ShoppingCart,
  User,
  Calendar,
  MapPin,
  Package,
  Plus,
  Trash2,
  IndianRupee,
  Percent,
  FileText,
  Save,
  Send,
} from "lucide-react";
import "../styles/sales-order-modal.css";
function SalesOrderModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    orderDate: new Date().toISOString().split("T")[0],
    customer: "",
    customerCode: "",
    deliveryAddress: "",
    warehouse: "",
    priceList: "",
    notes: "",
  });

  const [items, setItems] = useState([
    {
      id: Date.now(),
      product: "",
      productCode: "",
      quantity: 1,
      rate: 0,
      discount: 0,
      tax: 18,
    },
  ]);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        orderDate: new Date().toISOString().split("T")[0],
        customer: "",
        customerCode: "",
        deliveryAddress: "",
        warehouse: "",
        priceList: "",
        notes: "",
      });

      setItems([
        {
          id: Date.now(),
          product: "",
          productCode: "",
          quantity: 1,
          rate: 0,
          discount: 0,
          tax: 18,
        },
      ]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleItemChange = (id, field, value) => {
    setItems((previous) =>
      previous.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]:
                field === "quantity" ||
                field === "rate" ||
                field === "discount" ||
                field === "tax"
                  ? Number(value)
                  : value,
            }
          : item
      )
    );
  };

  const addItem = () => {
    setItems((previous) => [
      ...previous,
      {
        id: Date.now(),
        product: "",
        productCode: "",
        quantity: 1,
        rate: 0,
        discount: 0,
        tax: 18,
      },
    ]);
  };

  const removeItem = (id) => {
    if (items.length === 1) return;

    setItems((previous) => previous.filter((item) => item.id !== id));
  };

  const calculateItem = (item) => {
    const gross = item.quantity * item.rate;
    const discountAmount = (gross * item.discount) / 100;
    const taxableAmount = gross - discountAmount;
    const taxAmount = (taxableAmount * item.tax) / 100;

    return {
      gross,
      discountAmount,
      taxableAmount,
      taxAmount,
      total: taxableAmount + taxAmount,
    };
  };

  const subtotal = items.reduce(
    (sum, item) => sum + calculateItem(item).taxableAmount,
    0
  );

  const totalTax = items.reduce(
    (sum, item) => sum + calculateItem(item).taxAmount,
    0
  );

  const totalDiscount = items.reduce(
    (sum, item) => sum + calculateItem(item).discountAmount,
    0
  );

  const grandTotal = subtotal + totalTax;

  const handleSubmit = (status) => {
    const orderData = {
      orderNo: "SAL01",
      orderDate: formData.orderDate,
      customer: formData.customer,
      customerCode: formData.customerCode,
      deliveryAddress: formData.deliveryAddress,
      warehouse: formData.warehouse,
      priceList: formData.priceList,
      notes: formData.notes,
      items,
      subtotal,
      totalDiscount,
      totalTax,
      grandTotal,
      status,
    };

    if (onSave) {
      onSave(orderData);
    }

    onClose();
  };

  return (
    <div className="sales-order-modal-overlay">
      <div className="sales-order-modal">
        <div className="sales-order-modal-header">
          <div className="sales-order-modal-title">
            <div className="sales-order-title-icon">
              <ShoppingCart size={20} />
            </div>

            <div>
              <h2>Create Sales Order</h2>
              <span>New Sales Order</span>
            </div>
          </div>

          <button
            type="button"
            className="sales-order-close-btn"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <div className="sales-order-modal-body">
          <div className="sales-order-section">
            <div className="sales-order-section-header">
              <div className="sales-order-section-icon">
                <FileText size={17} />
              </div>

              <div>
                <h3>Order Information</h3>
                <p>Basic sales order details</p>
              </div>
            </div>

            <div className="sales-order-form-grid">
              <div className="sales-order-field">
                <label>
                  <Calendar size={14} />
                  Order Date
                </label>

                <input
                  type="date"
                  name="orderDate"
                  value={formData.orderDate}
                  onChange={handleChange}
                />
              </div>

              <div className="sales-order-field">
                <label>
                  <User size={14} />
                  Customer
                </label>

                <select
                  name="customer"
                  value={formData.customer}
                  onChange={handleChange}
                >
                  <option value="">Select Customer</option>
                  <option value="Shree Balaji Constructions">
                    Shree Balaji Constructions
                  </option>
                  <option value="Vijay Steel Industries">
                    Vijay Steel Industries
                  </option>
                  <option value="Karnataka Electricals">
                    Karnataka Electricals
                  </option>
                  <option value="Om Sai Enterprises">
                    Om Sai Enterprises
                  </option>
                </select>
              </div>

              <div className="sales-order-field">
                <label>Customer Code</label>

                <input
                  type="text"
                  name="customerCode"
                  value={formData.customerCode}
                  onChange={handleChange}
                  placeholder="CU0001"
                />
              </div>

              <div className="sales-order-field">
                <label>Price List</label>

                <select
                  name="priceList"
                  value={formData.priceList}
                  onChange={handleChange}
                >
                  <option value="">Select Price List</option>
                  <option value="Standard">Standard</option>
                  <option value="Wholesale">Wholesale</option>
                  <option value="Retail">Retail</option>
                </select>
              </div>

              <div className="sales-order-field">
                <label>Warehouse</label>

                <select
                  name="warehouse"
                  value={formData.warehouse}
                  onChange={handleChange}
                >
                  <option value="">Select Warehouse</option>
                  <option value="Main Warehouse">Main Warehouse</option>
                  <option value="Bagalkot Warehouse">
                    Bagalkot Warehouse
                  </option>
                  <option value="Hubli Warehouse">Hubli Warehouse</option>
                </select>
              </div>

              <div className="sales-order-field sales-order-field-full">
                <label>
                  <MapPin size={14} />
                  Delivery Address
                </label>

                <textarea
                  name="deliveryAddress"
                  value={formData.deliveryAddress}
                  onChange={handleChange}
                  placeholder="Enter delivery address"
                  rows="2"
                />
              </div>
            </div>
          </div>

          <div className="sales-order-section">
            <div className="sales-order-section-header sales-order-items-header">
              <div className="sales-order-section-icon">
                <Package size={17} />
              </div>

              <div>
                <h3>Products</h3>
                <p>Add products to this sales order</p>
              </div>

              <button
                type="button"
                className="sales-order-add-item-btn"
                onClick={addItem}
              >
                <Plus size={16} />
                Add Product
              </button>
            </div>

            <div className="sales-order-items-wrapper">
              <table className="sales-order-items-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>Discount %</th>
                    <th>Tax %</th>
                    <th>Total</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item) => {
                    const calculation = calculateItem(item);

                    return (
                      <tr key={item.id}>
                        <td>
                          <input
                            type="text"
                            value={item.product}
                            onChange={(e) =>
                              handleItemChange(
                                item.id,
                                "product",
                                e.target.value
                              )
                            }
                            placeholder="Product name"
                          />
                        </td>

                        <td>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(
                                item.id,
                                "quantity",
                                e.target.value
                              )
                            }
                          />
                        </td>

                        <td>
                          <div className="sales-order-input-icon">
                            <IndianRupee size={13} />

                            <input
                              type="number"
                              min="0"
                              value={item.rate}
                              onChange={(e) =>
                                handleItemChange(
                                  item.id,
                                  "rate",
                                  e.target.value
                                )
                              }
                            />
                          </div>
                        </td>

                        <td>
                          <div className="sales-order-input-icon">
                            <Percent size={13} />

                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.discount}
                              onChange={(e) =>
                                handleItemChange(
                                  item.id,
                                  "discount",
                                  e.target.value
                                )
                              }
                            />
                          </div>
                        </td>

                        <td>
                          <div className="sales-order-input-icon">
                            <Percent size={13} />

                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.tax}
                              onChange={(e) =>
                                handleItemChange(
                                  item.id,
                                  "tax",
                                  e.target.value
                                )
                              }
                            />
                          </div>
                        </td>

                        <td>
                          <strong>
                            ₹
                            {calculation.total.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </strong>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="sales-order-delete-item"
                            onClick={() => removeItem(item.id)}
                            disabled={items.length === 1}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="sales-order-bottom-grid">
            <div className="sales-order-section sales-order-notes-section">
              <div className="sales-order-section-header">
                <div className="sales-order-section-icon">
                  <FileText size={17} />
                </div>

                <div>
                  <h3>Notes</h3>
                  <p>Additional information</p>
                </div>
              </div>

              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Enter notes, terms or special instructions..."
                rows="5"
              />
            </div>

            <div className="sales-order-total-card">
              <div className="sales-order-total-row">
                <span>Subtotal</span>
                <strong>
                  ₹
                  {subtotal.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </strong>
              </div>

              <div className="sales-order-total-row">
                <span>Discount</span>
                <strong>
                  ₹
                  {totalDiscount.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </strong>
              </div>

              <div className="sales-order-total-row">
                <span>Tax</span>
                <strong>
                  ₹
                  {totalTax.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </strong>
              </div>

              <div className="sales-order-total-divider"></div>

              <div className="sales-order-grand-total">
                <span>Grand Total</span>
                <strong>
                  ₹
                  {grandTotal.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </strong>
              </div>
            </div>
          </div>
        </div>

        <div className="sales-order-modal-footer">
          <button
            type="button"
            className="sales-order-cancel-btn"
            onClick={onClose}
          >
            <X size={16} />
            Cancel
          </button>

          <div className="sales-order-footer-actions">
            <button
              type="button"
              className="sales-order-draft-btn"
              onClick={() => handleSubmit("Draft")}
            >
              <Save size={16} />
              Save Draft
            </button>

            <button
              type="button"
              className="sales-order-submit-btn"
              onClick={() => handleSubmit("Created")}
            >
              <Send size={16} />
              Create Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SalesOrderModal;