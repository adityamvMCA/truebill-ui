import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  FileText,
  Package,
  Plus,
  Search,
  Settings,
  Trash2,
  User,
  Save,
  CreditCard,
  FilePlus2,
} from "lucide-react";

import "../styles/sales-invoice-modern1.css";

const initialItems = [
  {
    id: 1,
    product: "Cement",
    hsn: "2523",
    qty: 1,
    price: 100,
    tax: 18,
  },
];

function SalesInvoiceCreation1() {
  const [customer, setCustomer] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("39");
  const [invoiceDate, setInvoiceDate] = useState("2026-10-06");
  const [dueDate, setDueDate] = useState("");

  const [items, setItems] = useState(initialItems);

  const [notesOpen, setNotesOpen] = useState(false);
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);

  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");

  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState("Cash");

  const customers = [
    "Rajesh Traders",
    "Sri Krishna Hardware",
    "Agarwal Brothers",
    "Shree Balaji Constructions",
  ];

  const products = [
    "Cement",
    "Steel",
    "Bricks",
    "Sand",
    "Electrical Wire",
  ];

  const subtotal = useMemo(() => {
    return items.reduce(
      (total, item) => total + Number(item.qty) * Number(item.price),
      0
    );
  }, [items]);

  const taxAmount = useMemo(() => {
    return items.reduce(
      (total, item) =>
        total +
        (Number(item.qty) *
          Number(item.price) *
          Number(item.tax)) /
          100,
      0
    );
  }, [items]);

  const discount = 0;

  const totalAmount = subtotal + taxAmount - discount;

  const balanceDue = Math.max(
    totalAmount - Number(paidAmount || 0),
    0
  );

  const formatMoney = (value) =>
    `₹${Number(value).toFixed(2)}`;

  const addItem = () => {
    setItems((previous) => [
      ...previous,
      {
        id: Date.now(),
        product: "",
        hsn: "",
        qty: 1,
        price: 0,
        tax: 18,
      },
    ]);
  };

  const removeItem = (id) => {
    setItems((previous) =>
      previous.filter((item) => item.id !== id)
    );
  };

  const updateItem = (id, field, value) => {
    setItems((previous) =>
      previous.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]:
                field === "qty" ||
                field === "price" ||
                field === "tax"
                  ? Number(value)
                  : value,
            }
          : item
      )
    );
  };

  const handleSave = () => {
    const invoiceData = {
      invoiceNo,
      invoiceDate,
      dueDate,
      customer,
      items,
      notes,
      terms,
      subtotal,
      taxAmount,
      discount,
      totalAmount,
      paidAmount,
      balanceDue,
      paymentMode,
    };

    console.log("Sales Invoice:", invoiceData);

    alert("Sales Invoice saved successfully!");
  };

  return (
    <div className="modern-invoice-page">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="modern-invoice-header">

        <div className="modern-header-left">

          <button
            className="modern-back-button"
            type="button"
          >
            <ArrowLeft size={17} />

            <span>Back</span>
          </button>

          <div className="modern-page-title">
            <FilePlus2 size={20} />

            <div>
              <h1>Create Sales Invoice</h1>
              <p>
                Manage your invoice details easily
              </p>
            </div>
          </div>

        </div>

        <div className="modern-header-actions">

          <button
            type="button"
            className="modern-draft-button"
          >
            <Save size={15} />

            Save Draft
          </button>

          <button
            type="button"
            className="modern-save-button"
            onClick={handleSave}
          >
            <Save size={15} />

            Save Invoice
          </button>

        </div>
      </div>

      {/* =====================================================
          BODY
      ====================================================== */}

      <div className="modern-invoice-container">

        <div className="modern-invoice-main">

          {/* =================================================
              CUSTOMER
          ================================================== */}

          <section className="modern-card">

            <div className="modern-section-title">

              <div className="modern-title-left">

                <div className="modern-title-icon">
                  <User size={17} />
                </div>

                <div>
                  <h2>Customer</h2>
                  <p>
                    Select the customer for this invoice
                  </p>
                </div>

              </div>

              <button
                className="modern-add-button"
                type="button"
              >
                <Plus size={15} />

                Add Customer
              </button>

            </div>

            <div className="modern-customer-select">

              <User size={18} />

              <select
                value={customer}
                onChange={(e) =>
                  setCustomer(e.target.value)
                }
              >
                <option value="">
                  Select Customer
                </option>

                {customers.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>

              <ChevronDown size={17} />
            </div>

            {/* Invoice Details */}

            <div className="modern-fields-grid">

              <div className="modern-field">

                <label>Invoice Number</label>

                <input
                  value={invoiceNo}
                  onChange={(e) =>
                    setInvoiceNo(e.target.value)
                  }
                />

              </div>

              <div className="modern-field">

                <label>Invoice Date</label>

                <div className="modern-input-icon">

                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) =>
                      setInvoiceDate(e.target.value)
                    }
                  />

                  <CalendarDays size={16} />
                </div>

              </div>

              <div className="modern-field">

                <label>
                  Due Date{" "}
                  <span>(Optional)</span>
                </label>

                <div className="modern-input-icon">

                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) =>
                      setDueDate(e.target.value)
                    }
                  />

                  <CalendarDays size={16} />
                </div>

              </div>

            </div>

          </section>

          {/* =================================================
              CONTENT GRID
          ================================================== */}

          <div className="modern-content-grid">

            {/* LEFT */}

            <div className="modern-left-content">

              {/* =================================================
                  ITEMS
              ================================================== */}

              <section className="modern-card">

                <div className="modern-section-title">

                  <div className="modern-title-left">

                    <div className="modern-title-icon">
                      <Package size={17} />
                    </div>

                    <div>
                      <h2>Items</h2>

                      <p>
                        Add products or services
                      </p>
                    </div>

                  </div>

                  <button
                    type="button"
                    className="modern-add-button"
                    onClick={addItem}
                  >
                    <Plus size={15} />

                    Add Item
                  </button>

                </div>

                {/* Search */}

                <div className="modern-item-toolbar">

                  <div className="modern-search">

                    <Search size={16} />

                    <input
                      placeholder="Search product, SKU or barcode..."
                    />

                  </div>

                </div>

                {/* Desktop Table */}

                <div className="modern-items-table-wrapper">

                  <table className="modern-items-table">

                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Product</th>
                        <th>HSN</th>
                        <th>Qty</th>
                        <th>Price (₹)</th>
                        <th>Tax</th>
                        <th>Amount (₹)</th>
                        <th></th>
                      </tr>
                    </thead>

                    <tbody>

                      {items.map((item, index) => {

                        const amount =
                          Number(item.qty) *
                          Number(item.price);

                        const tax =
                          (amount *
                            Number(item.tax)) /
                          100;

                        const finalAmount =
                          amount + tax;

                        return (
                          <tr key={item.id}>

                            <td>
                              {index + 1}
                            </td>

                            <td>

                              <select
                                value={item.product}
                                onChange={(e) =>
                                  updateItem(
                                    item.id,
                                    "product",
                                    e.target.value
                                  )
                                }
                              >

                                <option value="">
                                  Select Product
                                </option>

                                {products.map(
                                  (product) => (
                                    <option
                                      key={product}
                                      value={product}
                                    >
                                      {product}
                                    </option>
                                  )
                                )}

                              </select>

                            </td>

                            <td>

                              <input
                                value={item.hsn}
                                placeholder="HSN"
                                onChange={(e) =>
                                  updateItem(
                                    item.id,
                                    "hsn",
                                    e.target.value
                                  )
                                }
                              />

                            </td>

                            <td>

                              <input
                                type="number"
                                min="1"
                                value={item.qty}
                                onChange={(e) =>
                                  updateItem(
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
                                value={item.price}
                                onChange={(e) =>
                                  updateItem(
                                    item.id,
                                    "price",
                                    e.target.value
                                  )
                                }
                              />

                            </td>

                            <td>

                              <select
                                value={item.tax}
                                onChange={(e) =>
                                  updateItem(
                                    item.id,
                                    "tax",
                                    e.target.value
                                  )
                                }
                              >
                                <option value="0">
                                  0%
                                </option>

                                <option value="5">
                                  5%
                                </option>

                                <option value="12">
                                  12%
                                </option>

                                <option value="18">
                                  18%
                                </option>

                                <option value="28">
                                  28%
                                </option>
                              </select>

                            </td>

                            <td>

                              <strong>
                                {formatMoney(
                                  finalAmount
                                )}
                              </strong>

                            </td>

                            <td>

                              <button
                                type="button"
                                className="modern-delete-button"
                                onClick={() =>
                                  removeItem(item.id)
                                }
                              >
                                <Trash2 size={15} />
                              </button>

                            </td>

                          </tr>
                        );
                      })}

                    </tbody>

                  </table>

                </div>

                <button
                  type="button"
                  className="modern-add-item-line"
                  onClick={addItem}
                >
                  <Plus size={16} />

                  Add Item
                </button>

              </section>

              {/* =================================================
                  NOTES
              ================================================== */}

              <section className="modern-card">

                <button
                  type="button"
                  className="modern-expand-header"
                  onClick={() =>
                    setNotesOpen(!notesOpen)
                  }
                >

                  <div className="modern-expand-left">

                    <FileText size={17} />

                    <div>
                      <strong>
                        Notes, Terms & More Options
                      </strong>

                      <span>
                        Add additional invoice information
                      </span>
                    </div>

                  </div>

                  {notesOpen ? (
                    <ChevronUp size={18} />
                  ) : (
                    <ChevronDown size={18} />
                  )}

                </button>

                {notesOpen && (
                  <div className="modern-extra-content">

                    <div className="modern-extra-field">

                      <label>Notes</label>

                      <textarea
                        value={notes}
                        onChange={(e) =>
                          setNotes(e.target.value)
                        }
                        placeholder="Enter notes..."
                      />

                    </div>

                    <div className="modern-extra-field">

                      <label>
                        Terms & Conditions
                      </label>

                      <textarea
                        value={terms}
                        onChange={(e) =>
                          setTerms(e.target.value)
                        }
                        placeholder="Enter terms and conditions..."
                      />

                    </div>

                  </div>
                )}

              </section>

              {/* =================================================
                  MORE OPTIONS
              ================================================== */}

              <section className="modern-card">

                <button
                  type="button"
                  className="modern-expand-header"
                  onClick={() =>
                    setMoreOptionsOpen(
                      !moreOptionsOpen
                    )
                  }
                >

                  <div className="modern-expand-left">

                    <Settings size={17} />

                    <div>
                      <strong>
                        More Options
                      </strong>

                      <span>
                        Payment, bank and invoice settings
                      </span>
                    </div>

                  </div>

                  {moreOptionsOpen ? (
                    <ChevronUp size={18} />
                  ) : (
                    <ChevronDown size={18} />
                  )}

                </button>

                {moreOptionsOpen && (
                  <div className="modern-options-grid">

                    <button type="button">
                      Add Bank Account
                    </button>

                    <button type="button">
                      Payment QR
                    </button>

                    <button type="button">
                      Additional Charges
                    </button>

                    <button type="button">
                      Round Off
                    </button>

                  </div>
                )}

              </section>

            </div>

            {/* =================================================
                RIGHT SUMMARY
            ================================================== */}

            <aside className="modern-right-content">

              <section className="modern-summary-card">

                <div className="modern-summary-header">

                  <div>
                    <h2>Invoice Summary</h2>

                    <p>
                      Review invoice amount
                    </p>
                  </div>

                  <CreditCard size={20} />

                </div>

                <div className="modern-summary-lines">

                  <div>
                    <span>Subtotal</span>

                    <strong>
                      {formatMoney(subtotal)}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Tax
                      {items.length > 0 &&
                        ` (${items[0].tax}%)`}
                    </span>

                    <strong>
                      {formatMoney(taxAmount)}
                    </strong>
                  </div>

                  <div>
                    <span>Discount</span>

                    <strong>
                      {formatMoney(discount)}
                    </strong>
                  </div>

                </div>

                <div className="modern-total-box">

                  <span>Total Amount</span>

                  <strong>
                    {formatMoney(totalAmount)}
                  </strong>

                </div>

              </section>

              {/* =================================================
                  PAYMENT
              ================================================== */}

              <section className="modern-payment-card">

                <div className="modern-summary-header">

                  <div>
                    <h2>Payment Details</h2>

                    <p>
                      Record payment received
                    </p>
                  </div>

                  <CreditCard size={20} />

                </div>

                <div className="modern-payment-field">

                  <label>
                    Paid Amount
                  </label>

                  <div className="modern-payment-input">

                    <span>₹</span>

                    <input
                      type="number"
                      min="0"
                      value={paidAmount}
                      onChange={(e) =>
                        setPaidAmount(
                          e.target.value
                        )
                      }
                    />

                  </div>

                </div>

                <div className="modern-payment-field">

                  <label>
                    Payment Mode
                  </label>

                  <select
                    value={paymentMode}
                    onChange={(e) =>
                      setPaymentMode(
                        e.target.value
                      )
                    }
                  >

                    <option>Cash</option>
                    <option>UPI</option>
                    <option>Card</option>
                    <option>Bank Transfer</option>
                    <option>Cheque</option>

                  </select>

                </div>

                <div className="modern-balance-box">

                  <span>Balance Due</span>

                  <strong>
                    {formatMoney(balanceDue)}
                  </strong>

                </div>

              </section>

              {/* SAVE */}

              <button
                type="button"
                className="modern-large-save"
                onClick={handleSave}
              >
                <Save size={18} />

                Save Invoice
              </button>

            </aside>

          </div>

        </div>

      </div>
    </div>
  );
}

export default SalesInvoiceCreation1;