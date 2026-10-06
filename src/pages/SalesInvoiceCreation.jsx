import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  FileText,
  Plus,
  ScanBarcode,
  Settings,
  UserPlus,
  StickyNote,
  ClipboardList,
  Landmark,
  QrCode,
  Receipt,
  Percent,
  Wallet,
  Split,
  Check,
  X,
  Eye,
  Pencil,
  RotateCcw,
} from "lucide-react";

import "../styles/sales-invoice-creation.css";

const SalesInvoiceCreation = () => {
  const [invoiceNo, setInvoiceNo] = useState("39");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [customer, setCustomer] = useState("");
  const [repeatInvoice, setRepeatInvoice] = useState(false);

  const [roundOff, setRoundOff] = useState(false);
  const [roundOffValue, setRoundOffValue] = useState(0);

  const [discount, setDiscount] = useState(0);
  const [additionalCharge, setAdditionalCharge] = useState(0);
  const [paymentReceived, setPaymentReceived] = useState(0);

  const [items, setItems] = useState([]);

  const [showPartyForm, setShowPartyForm] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showBank, setShowBank] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");

  const [partyData, setPartyData] = useState({
    name: "",
    phone: "",
    address: "",
  });

  const addItem = () => {
    setItems((previous) => [
      ...previous,
      {
        id: Date.now(),
        name: "",
        hsn: "",
        qty: 1,
        price: 0,
        discount: 0,
        tax: 0,
      },
    ]);
  };

  const updateItem = (id, field, value) => {
    setItems((previous) =>
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

  const removeItem = (id) => {
    setItems((previous) =>
      previous.filter((item) => item.id !== id)
    );
  };

  const getItemAmount = (item) => {
    const qty = Number(item.qty) || 0;
    const price = Number(item.price) || 0;
    const discountPercent = Number(item.discount) || 0;

    const gross = qty * price;

    return gross - (gross * discountPercent) / 100;
  };

  const subtotal = useMemo(() => {
    return items.reduce(
      (total, item) => total + getItemAmount(item),
      0
    );
  }, [items]);

  const taxAmount = useMemo(() => {
    return items.reduce((total, item) => {
      const amount = getItemAmount(item);
      const taxPercent = Number(item.tax) || 0;

      return total + (amount * taxPercent) / 100;
    }, 0);
  }, [items]);

  const totalDiscount = useMemo(() => {
    return items.reduce((total, item) => {
      const qty = Number(item.qty) || 0;
      const price = Number(item.price) || 0;
      const discountPercent = Number(item.discount) || 0;

      return total + (qty * price * discountPercent) / 100;
    }, 0);
  }, [items]);

  const taxableAmount = subtotal + taxAmount;

  const totalAmount =
    taxableAmount +
    Number(additionalCharge || 0) -
    Number(discount || 0) +
    (roundOff ? Number(roundOffValue || 0) : 0);

  const balanceAmount =
    Math.max(totalAmount - Number(paymentReceived || 0), 0);

  const handleSave = () => {
    const payload = {
      invoiceNo,
      invoiceDate,
      customer,
      repeatInvoice,
      items,
      subtotal,
      totalDiscount,
      taxAmount,
      additionalCharge,
      discount,
      roundOff: roundOff ? Number(roundOffValue || 0) : 0,
      totalAmount,
      paymentReceived,
      balanceAmount,
      notes,
      terms,
      partyData,
    };

    console.log("Sales Invoice:", payload);
  };

  const saveAndNew = () => {
    handleSave();

    setInvoiceNo("");
    setCustomer("");
    setItems([]);
    setPaymentReceived(0);
    setDiscount(0);
    setAdditionalCharge(0);
    setNotes("");
    setTerms("");
  };

  return (
    <div className="sales-invoice-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="sales-invoice-header">

        <div className="invoice-header-left">

          <button
            type="button"
            className="invoice-exit-btn"
          >
            <ArrowLeft size={14} />
            <span>Exit</span>
          </button>

          <div className="invoice-page-title">
            <FileText size={16} />
            <span>Create Sales Invoice</span>
          </div>

        </div>

        <div className="invoice-mode-buttons">

          <button
            type="button"
            className="invoice-mode-active"
          >
            <Pencil size={13} />
            Edit Mode
          </button>

          <button
            type="button"
            className="invoice-mode-disabled"
          >
            <Eye size={13} />
            Preview Mode
          </button>

        </div>

        <div className="invoice-header-actions">

          <button
            type="button"
            className="invoice-icon-button"
            title="Settings"
          >
            <Settings size={15} />
          </button>

          <button
            type="button"
            className="invoice-secondary-button"
            onClick={saveAndNew}
          >
            Save & New
          </button>

          <button
            type="button"
            className="invoice-save-button"
            onClick={handleSave}
          >
            Save
          </button>

        </div>

      </header>

      {/* =====================================================
          MAIN AREA
      ===================================================== */}

      <main className="sales-invoice-main">

        {/* ===================================================
            TOP INFORMATION
        =================================================== */}

        <section className="invoice-top-section">

          {/* BILL TO */}

          <div className="bill-to-section">

            <div className="invoice-section-heading">
              <span>Bill To</span>

              <button
                type="button"
                className="small-settings-btn"
              >
                <Settings size={13} />
              </button>
            </div>

            {!customer ? (
              <button
                type="button"
                className="add-party-box"
                onClick={() => setShowPartyForm(true)}
              >
                <UserPlus size={15} />
                <span>+ Add Party</span>
              </button>
            ) : (
              <div className="selected-party-card">

                <div className="party-avatar">
                  {customer.charAt(0).toUpperCase()}
                </div>

                <div className="party-information">
                  <strong>{customer}</strong>

                  <span>
                    {partyData.phone || "Customer"}
                  </span>

                  {partyData.address && (
                    <span>{partyData.address}</span>
                  )}
                </div>

                <button
                  type="button"
                  className="party-remove-btn"
                  onClick={() => setCustomer("")}
                >
                  <X size={13} />
                </button>

              </div>
            )}

          </div>

          {/* INVOICE DETAILS */}

          <div className="invoice-details-section">

            <div className="invoice-details-heading">

              <span>Invoice Details</span>

              <label className="repeat-invoice">

                <span>Repeat this Invoice</span>

                <input
                  type="checkbox"
                  checked={repeatInvoice}
                  onChange={(e) =>
                    setRepeatInvoice(e.target.checked)
                  }
                />

                <span className="invoice-toggle">
                  <span />
                </span>

                <Settings size={13} />

              </label>

            </div>

            <div className="invoice-details-grid">

              <div className="invoice-field">

                <label>Sales Invoice No.</label>

                <input
                  value={invoiceNo}
                  onChange={(e) =>
                    setInvoiceNo(e.target.value)
                  }
                />

              </div>

              <div className="invoice-field">

                <label>Sales Invoice Date</label>

                <div className="invoice-date-input">

                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) =>
                      setInvoiceDate(e.target.value)
                    }
                  />

                  <CalendarDays size={14} />

                </div>

              </div>

              <button
                type="button"
                className="due-date-box"
              >
                <Plus size={13} />
                <span>+ Add Due Date</span>
              </button>

            </div>

          </div>

        </section>

        {/* ===================================================
            ITEMS TABLE
        =================================================== */}

        <section className="invoice-items-section">

          <div className="invoice-table-wrapper">

            <table className="invoice-items-table">

              <thead>
                <tr>

                  <th className="col-no">NO</th>

                  <th className="col-item">
                    ITEMS
                  </th>

                  <th className="col-hsn">
                    HSN
                  </th>

                  <th className="col-qty">
                    QTY
                  </th>

                  <th className="col-price">
                    PRICE/ITEM (₹)
                  </th>

                  <th className="col-discount">
                    DISCOUNT
                  </th>

                  <th className="col-tax">
                    TAX
                  </th>

                  <th className="col-amount">
                    AMOUNT (₹)
                  </th>

                  <th className="col-settings">
                    <Settings size={13} />
                  </th>

                </tr>
              </thead>

              <tbody>

                {items.length === 0 ? (
                  <tr>
                    <td
                      colSpan="9"
                      className="empty-item-cell"
                    >
                      <button
                        type="button"
                        className="add-item-line"
                        onClick={addItem}
                      >
                        <Plus size={13} />
                        Add Item
                      </button>
                    </td>
                  </tr>
                ) : (
                  <>
                    {items.map((item, index) => (
                      <tr key={item.id}>

                        <td className="item-number">
                          {index + 1}
                        </td>

                        <td>
                          <div className="item-input-wrapper">
                            <select
                              value={item.name}
                              onChange={(e) =>
                                updateItem(
                                  item.id,
                                  "name",
                                  e.target.value
                                )
                              }
                            >
                              <option value="">
                                Select Item
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

                            <ChevronDown size={12} />
                          </div>
                        </td>

                        <td>
                          <input
                            className="table-input"
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
                            className="table-input quantity-input"
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
                            className="table-input"
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
                          <input
                            className="table-input"
                            type="number"
                            min="0"
                            value={item.discount}
                            onChange={(e) =>
                              updateItem(
                                item.id,
                                "discount",
                                e.target.value
                              )
                            }
                          />
                        </td>

                        <td>
                          <input
                            className="table-input"
                            type="number"
                            min="0"
                            value={item.tax}
                            onChange={(e) =>
                              updateItem(
                                item.id,
                                "tax",
                                e.target.value
                              )
                            }
                          />
                        </td>

                        <td className="item-amount">
                          ₹
                          {getItemAmount(item).toFixed(2)}
                        </td>

                        <td>
                          <button
                            type="button"
                            className="delete-item-btn"
                            onClick={() =>
                              removeItem(item.id)
                            }
                          >
                            <X size={13} />
                          </button>
                        </td>

                      </tr>
                    ))}

                    <tr>
                      <td
                        colSpan="9"
                        className="add-more-item-cell"
                      >
                        <button
                          type="button"
                          className="add-item-line"
                          onClick={addItem}
                        >
                          <Plus size={13} />
                          Add Item
                        </button>
                      </td>
                    </tr>
                  </>
                )}

              </tbody>

              <tfoot>

                <tr>

                  <td colSpan="4" />

                  <td className="subtotal-label">
                    Subtotal
                  </td>

                  <td />

                  <td className="subtotal-value">
                    ₹{subtotal.toFixed(2)}
                  </td>

                  <td className="subtotal-value">
                    ₹{taxAmount.toFixed(2)}
                  </td>

                  <td className="subtotal-value">
                    ₹{subtotal.toFixed(2)}
                  </td>

                </tr>

              </tfoot>

            </table>

          </div>

          <button
            type="button"
            className="barcode-btn"
          >
            <ScanBarcode size={14} />
            Scan Barcode
          </button>

        </section>

        {/* ===================================================
            BOTTOM AREA
        =================================================== */}

        <section className="invoice-bottom-section">

          {/* LEFT SIDE */}

          <div className="invoice-extra-section">

            <button
              type="button"
              className={`invoice-extra-row ${
                showNotes ? "invoice-extra-active" : ""
              }`}
              onClick={() => setShowNotes(!showNotes)}
            >
              <StickyNote size={14} />
              <span>Add Notes</span>
              <ChevronDown
                size={13}
                className={
                  showNotes ? "rotate-icon" : ""
                }
              />
            </button>

            {showNotes && (
              <div className="invoice-extra-content">
                <textarea
                  value={notes}
                  onChange={(e) =>
                    setNotes(e.target.value)
                  }
                  placeholder="Enter notes..."
                />
              </div>
            )}

            <button
              type="button"
              className={`invoice-extra-row ${
                showTerms ? "invoice-extra-active" : ""
              }`}
              onClick={() => setShowTerms(!showTerms)}
            >
              <ClipboardList size={14} />
              <span>Add Terms & Conditions</span>
              <ChevronDown
                size={13}
                className={
                  showTerms ? "rotate-icon" : ""
                }
              />
            </button>

            {showTerms && (
              <div className="invoice-extra-content">
                <textarea
                  value={terms}
                  onChange={(e) =>
                    setTerms(e.target.value)
                  }
                  placeholder="Enter terms & conditions..."
                />
              </div>
            )}

            <button
              type="button"
              className={`invoice-extra-row ${
                showBank ? "invoice-extra-active" : ""
              }`}
              onClick={() => setShowBank(!showBank)}
            >
              <Landmark size={14} />
              <span>Add Bank Account</span>
              <ChevronDown
                size={13}
                className={
                  showBank ? "rotate-icon" : ""
                }
              />
            </button>

            {showBank && (
              <div className="invoice-extra-content">

                <select>
                  <option>
                    Select Bank Account
                  </option>

                  <option>
                    SBI - Current Account
                  </option>

                  <option>
                    HDFC - Current Account
                  </option>
                </select>

              </div>
            )}

            <button
              type="button"
              className={`invoice-extra-row ${
                showQr ? "invoice-extra-active" : ""
              }`}
              onClick={() => setShowQr(!showQr)}
            >
              <QrCode size={14} />
              <span>Add Payment QR</span>
              <ChevronDown
                size={13}
                className={
                  showQr ? "rotate-icon" : ""
                }
              />
            </button>

            {showQr && (
              <div className="invoice-extra-content qr-placeholder">
                <QrCode size={28} />
                <span>Payment QR will appear here</span>
              </div>
            )}

          </div>

          {/* RIGHT SIDE */}

          <div className="invoice-payment-section">

            <div className="payment-row payment-link-row">

              <button
                type="button"
                className="payment-link"
              >
                <Plus size={13} />
                Add Additional Charges
              </button>

            </div>

            <div className="payment-row">

              <span>Taxable Amount</span>

              <strong>
                ₹{subtotal.toFixed(2)}
              </strong>

            </div>

            <div className="payment-row">

              <button
                type="button"
                className="payment-link"
                onClick={() =>
                  setDiscount(
                    discount === 0 ? 100 : 0
                  )
                }
              >
                <Percent size={13} />
                Add Discount
              </button>

              <strong>
                ₹{totalDiscount.toFixed(2)}
              </strong>

            </div>

            {/* ROUND OFF */}

            <div className="round-off-row">

              <label className="custom-checkbox">

                <input
                  type="checkbox"
                  checked={roundOff}
                  onChange={(e) =>
                    setRoundOff(e.target.checked)
                  }
                />

                <span>
                  <Check size={10} />
                </span>

              </label>

              <span>Auto Round Off</span>

              <div className="round-off-input">

                <select>
                  <option>Add</option>
                  <option>Less</option>
                </select>

                <input
                  type="number"
                  value={roundOffValue}
                  onChange={(e) =>
                    setRoundOffValue(
                      e.target.value
                    )
                  }
                />

              </div>

            </div>

            {/* TOTAL */}

            <div className="total-amount-row">

              <strong>Total Amount:</strong>

              <div className="total-input">

                <span>₹</span>

                <input
                  value={totalAmount.toFixed(2)}
                  readOnly
                />

              </div>

            </div>

            {/* RECEIVED */}

            <div className="payment-row">

              <span>Total Amount Received</span>

              <strong>
                ₹{Number(
                  paymentReceived || 0
                ).toFixed(2)}
              </strong>

            </div>

            <div className="received-input-row">

              <span>₹</span>

              <input
                type="number"
                min="0"
                value={paymentReceived}
                onChange={(e) =>
                  setPaymentReceived(
                    e.target.value
                  )
                }
                placeholder="Enter payment amount"
              />

              <select>
                <option>Cash</option>
                <option>UPI</option>
                <option>Card</option>
                <option>Bank Transfer</option>
              </select>

            </div>

            {/* FULLY PAID */}

            <div className="fully-paid-row">

              <label className="custom-checkbox">

                <input type="checkbox" />

                <span>
                  <Check size={10} />
                </span>

              </label>

              <span>Mark as fully paid</span>

              <button
                type="button"
                className="split-payment-btn"
              >
                <Split size={13} />
                Split Payment
              </button>

            </div>

            {/* BALANCE */}

            <div className="balance-row">

              <span>Balance Amount</span>

              <strong>
                ₹{balanceAmount.toFixed(2)}
              </strong>

            </div>

          </div>

        </section>

      </main>

      {/* HELP */}

      <button
        type="button"
        className="invoice-help-button"
      >
        <CircleHelp size={17} />
      </button>

      {/* =====================================================
          ADD PARTY MODAL
      ===================================================== */}

      {showPartyForm && (
        <div className="party-modal-overlay">

          <div className="party-modal">

            <div className="party-modal-header">

              <div>
                <h3>Add Party</h3>
                <span>
                  Create customer for this invoice
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowPartyForm(false)
                }
              >
                <X size={17} />
              </button>

            </div>

            <div className="party-modal-body">

              <div className="party-field">

                <label>Party Name *</label>

                <input
                  value={partyData.name}
                  onChange={(e) =>
                    setPartyData({
                      ...partyData,
                      name: e.target.value,
                    })
                  }
                  placeholder="Enter party name"
                />

              </div>

              <div className="party-field">

                <label>Phone</label>

                <input
                  value={partyData.phone}
                  onChange={(e) =>
                    setPartyData({
                      ...partyData,
                      phone: e.target.value,
                    })
                  }
                  placeholder="Enter phone number"
                />

              </div>

              <div className="party-field">

                <label>Address</label>

                <textarea
                  value={partyData.address}
                  onChange={(e) =>
                    setPartyData({
                      ...partyData,
                      address: e.target.value,
                    })
                  }
                  placeholder="Enter address"
                />

              </div>

            </div>

            <div className="party-modal-footer">

              <button
                type="button"
                className="party-cancel-btn"
                onClick={() =>
                  setShowPartyForm(false)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="party-save-btn"
                onClick={() => {

                  if (!partyData.name.trim()) {
                    return;
                  }

                  setCustomer(partyData.name);

                  setShowPartyForm(false);
                }}
              >
                Save Party
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
};

export default SalesInvoiceCreation;