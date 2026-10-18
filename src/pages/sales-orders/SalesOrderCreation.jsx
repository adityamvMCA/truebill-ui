import { useEffect, useMemo, useState } from "react";

import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  CircleHelp,
  FileText,
  Plus,
  Settings,
  StickyNote,
  ClipboardList,
  UserPlus,
  X,
} from "lucide-react";

import salesOrderApi from "../../services/modules/salesOrderApi";

import {
  formatInr,
  rupeesToPaise,
} from "../../utils/amount";

import "./sales-order-creation.css";
import apiClient from "../../services/apiClient";

const emptyItem = () => ({
  lineId: crypto.randomUUID(),
  productId: "",
  productName: "",
  productType: "GOODS",
  unit: "NOS",
  quantity: 1,
  unitRate: 0,
  discountPercent: 0,
  gstRate: 18,
});

const itemAmount = (item) => {
  const quantity = Number(item.quantity) || 0;
  const unitRate = Number(item.unitRate) || 0;
  const discountPercent =
    Number(item.discountPercent) || 0;

  const grossAmount = quantity * unitRate;
  const discountAmount =
    (grossAmount * discountPercent) / 100;

  return grossAmount - discountAmount;
};

const SalesOrderCreation = () => {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  const [customerId, setCustomerId] = useState("");

  const [orderDate, setOrderDate] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const [
    expectedDeliveryDate,
    setExpectedDeliveryDate,
  ] = useState("");

  const [taxMode, setTaxMode] = useState("INTRA_STATE");

  const [paymentTerms, setPaymentTerms] = useState(
    "Due on Receipt",
  );

  const [deliveryTerms, setDeliveryTerms] = useState("");

  const [items, setItems] = useState([emptyItem()]);

  const [notes, setNotes] = useState("");

  const [
    termsAndConditions,
    setTermsAndConditions,
  ] = useState("");

  const [showNotes, setShowNotes] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

useEffect(() => {
  let active = true;

  const extractList = (body, resourceName) => {
    if (Array.isArray(body)) {
      return body;
    }

    if (Array.isArray(body?.data)) {
      return body.data;
    }

    if (Array.isArray(body?.[resourceName])) {
      return body[resourceName];
    }

    if (Array.isArray(body?.data?.[resourceName])) {
      return body.data[resourceName];
    }

    throw new Error(
      `Unexpected ${resourceName} response format`,
    );
  };

  const getLoadError = (reason, resourceName) => {
    const status = reason?.response?.status;

    const message =
      reason?.response?.data?.message ||
      reason?.message ||
      "Request failed";

    return `Unable to load ${resourceName}${
      status ? ` (${status})` : ""
    }: ${message}`;
  };

  const loadData = async () => {
    setError(null);

    const [customerResult, productResult] =
      await Promise.allSettled([
        apiClient.get("/customers", {
          params: {
            limit: 100,
            status: "Active",
          },
        }),

        apiClient.get("/products", {
          params: {
            limit: 100,
            status: "ACTIVE",
          },
        }),
      ]);

    if (!active) {
      return;
    }

    const errors = [];

    if (customerResult.status === "fulfilled") {
      try {
        const body = customerResult.value.data;

        if (body?.success === false) {
          throw new Error(
            body.message || "Customer request failed",
          );
        }

        setCustomers(
          extractList(body, "customers"),
        );
      } catch (loadError) {
        setCustomers([]);

        errors.push(
          getLoadError(loadError, "customers"),
        );
      }
    } else {
      setCustomers([]);

      errors.push(
        getLoadError(
          customerResult.reason,
          "customers",
        ),
      );
    }

    if (productResult.status === "fulfilled") {
      try {
        const body = productResult.value.data;

        if (body?.success === false) {
          throw new Error(
            body.message || "Product request failed",
          );
        }

        setProducts(
          extractList(body, "products"),
        );
      } catch (loadError) {
        setProducts([]);

        errors.push(
          getLoadError(loadError, "products"),
        );
      }
    } else {
      setProducts([]);

      errors.push(
        getLoadError(
          productResult.reason,
          "products",
        ),
      );
    }

    setError(
      errors.length ? errors.join(" | ") : null,
    );
  };

  void loadData();

  return () => {
    active = false;
  };
}, []);

  const totals = useMemo(() => {
    let gross = 0;
    let discount = 0;
    let taxable = 0;
    let tax = 0;

    items.forEach((item) => {
      const quantity = Number(item.quantity) || 0;
      const unitRate = Number(item.unitRate) || 0;
      const discountPercent =
        Number(item.discountPercent) || 0;
      const gstRate = Number(item.gstRate) || 0;

      const itemGross = quantity * unitRate;
      const itemDiscount =
        (itemGross * discountPercent) / 100;
      const itemTaxable = itemGross - itemDiscount;

      const itemTax =
        taxMode === "NONE"
          ? 0
          : (itemTaxable * gstRate) / 100;

      gross += itemGross;
      discount += itemDiscount;
      taxable += itemTaxable;
      tax += itemTax;
    });

    return {
      gross,
      discount,
      taxable,
      tax,
      total: taxable + tax,
    };
  }, [items, taxMode]);

  const updateItem = (lineId, field, value) => {
    setItems((previous) =>
      previous.map((item) =>
        item.lineId === lineId
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  };

  const handleProductChange = (lineId, productId) => {
    const product = products.find(
      (candidate) => candidate._id === productId,
    );

    setItems((previous) =>
      previous.map((item) =>
        item.lineId === lineId
          ? {
              ...item,
              productId,
              productName: product?.name || "",
              productType: product?.type || "GOODS",
              unit: product?.unit || "NOS",
              unitRate: product?.salePrice || 0,
              gstRate: product?.gstRate ?? 18,
            }
          : item,
      ),
    );
  };

  const addItem = () => {
    setItems((previous) => [
      ...previous,
      emptyItem(),
    ]);
  };

  const removeItem = (lineId) => {
    setItems((previous) =>
      previous.length > 1
        ? previous.filter(
            (item) => item.lineId !== lineId,
          )
        : previous,
    );
  };

  const buildPayload = () => ({
    customerId,
    orderDate,
    expectedDeliveryDate:
      expectedDeliveryDate || null,
    taxMode,
    paymentTerms,
    deliveryTerms: deliveryTerms || null,
    items: items.map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
      unitRate: Number(item.unitRate),
      discountPercent: Number(
        item.discountPercent,
      ),
      gstRate:
        taxMode === "NONE"
          ? 0
          : Number(item.gstRate),
    })),
    notes: notes || null,
    termsAndConditions:
      termsAndConditions || null,
    action: "SAVE",
  });

  const handleSave = async () => {
    setError(null);
    setMessage(null);

    if (!customerId) {
      setError("Please select a customer");
      return;
    }

    const invalidItem = items.find(
      (item) => !item.productId,
    );

    if (invalidItem) {
      setError(
        "Please select a product for every item",
      );
      return;
    }

    setSaving(true);

    try {
      const response =
        await salesOrderApi.createOrder(
          buildPayload(),
        );

      setMessage(
        `Sales order ${response.data.data.orderNumber} created successfully`,
      );

      setItems([emptyItem()]);
      setCustomerId("");
      setNotes("");
      setTermsAndConditions("");
    } catch (saveError) {
      setError(
        saveError?.response?.data?.message ||
          "Unable to create sales order",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="sales-order-page">
      <header className="sales-order-header">
        <div className="sales-order-header-left">
          <button
            type="button"
            className="sales-order-exit-btn"
          >
            <ArrowLeft size={14} />
            <span>Exit</span>
          </button>

          <div className="sales-order-page-title">
            <FileText size={16} />
            <span>Create Sales Order</span>
          </div>
        </div>

        <div className="sales-order-header-actions">
          <button
            type="button"
            className="sales-order-icon-button"
          >
            <Settings size={15} />
          </button>

          <button
            type="button"
            className="sales-order-save-button"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </header>

      {(error || message) && (
        <div
          className={
            error
              ? "sales-order-alert error"
              : "sales-order-alert success"
          }
        >
          {error || message}
        </div>
      )}

      <main className="sales-order-main">
        <section className="sales-order-top-section">
          <div className="sales-order-customer-section">
            <div className="sales-order-section-heading">
              <span>Bill To</span>

              <button
                type="button"
                className="sales-order-small-settings-btn"
              >
                <Settings size={13} />
              </button>
            </div>

            <select
              className="sales-order-select"
              value={customerId}
              onChange={(event) =>
                setCustomerId(event.target.value)
              }
            >
              <option value="">
                Select Customer
              </option>

              {customers.map((customer) => (
                <option
                  key={customer._id}
                  value={customer._id}
                >
                  {customer.customerName}
                </option>
              ))}
            </select>

            {!customerId && (
              <button
                type="button"
                className="sales-order-add-party-box"
              >
                <UserPlus size={15} />
                <span>Add Party</span>
              </button>
            )}
          </div>

          <div className="sales-order-details-section">
            <div className="sales-order-details-heading">
              <span>Order Details</span>
            </div>

            <div className="sales-order-details-grid">
              <label className="sales-order-field">
                <span>Order Date</span>

                <div className="sales-order-date-input">
                  <input
                    type="date"
                    value={orderDate}
                    onChange={(event) =>
                      setOrderDate(
                        event.target.value,
                      )
                    }
                  />

                  <CalendarDays size={14} />
                </div>
              </label>

              <label className="sales-order-field">
                <span>Expected Delivery</span>

                <div className="sales-order-date-input">
                  <input
                    type="date"
                    value={expectedDeliveryDate}
                    onChange={(event) =>
                      setExpectedDeliveryDate(
                        event.target.value,
                      )
                    }
                  />

                  <CalendarDays size={14} />
                </div>
              </label>

              <label className="sales-order-field">
                <span>Tax Mode</span>

                <select
                  value={taxMode}
                  onChange={(event) =>
                    setTaxMode(event.target.value)
                  }
                >
                  <option value="INTRA_STATE">
                    Intra-State
                  </option>

                  <option value="INTER_STATE">
                    Inter-State
                  </option>

                  <option value="NONE">
                    No GST
                  </option>
                </select>
              </label>

              <label className="sales-order-field">
                <span>Payment Terms</span>

                <input
                  value={paymentTerms}
                  onChange={(event) =>
                    setPaymentTerms(
                      event.target.value,
                    )
                  }
                />
              </label>
            </div>
          </div>
        </section>

        <section className="sales-order-items-section">
          <div className="sales-order-table-wrapper">
            <table className="sales-order-items-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Item</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Discount %</th>
                  <th>GST %</th>
                  <th>Amount</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {items.map((item, index) => (
                  <tr key={item.lineId}>
                    <td>{index + 1}</td>

                    <td>
                      <select
                        value={item.productId}
                        onChange={(event) =>
                          handleProductChange(
                            item.lineId,
                            event.target.value,
                          )
                        }
                      >
                        <option value="">
                          Select Item
                        </option>

                        {products.map(
                          (product) => (
                            <option
                              key={product._id}
                              value={product._id}
                            >
                              {product.name}
                            </option>
                          ),
                        )}
                      </select>
                    </td>

                    <td>
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(
                            item.lineId,
                            "quantity",
                            event.target.value,
                          )
                        }
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitRate}
                        onChange={(event) =>
                          updateItem(
                            item.lineId,
                            "unitRate",
                            event.target.value,
                          )
                        }
                      />
                    </td>

                    <td>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={
                          item.discountPercent
                        }
                        onChange={(event) =>
                          updateItem(
                            item.lineId,
                            "discountPercent",
                            event.target.value,
                          )
                        }
                      />
                    </td>

                    <td>
                      <select
                        value={item.gstRate}
                        disabled={
                          taxMode === "NONE"
                        }
                        onChange={(event) =>
                          updateItem(
                            item.lineId,
                            "gstRate",
                            event.target.value,
                          )
                        }
                      >
                        {[0, 3, 5, 12, 18, 28].map(
                          (rate) => (
                            <option
                              key={rate}
                              value={rate}
                            >
                              {rate}%
                            </option>
                          ),
                        )}
                      </select>
                    </td>

                    <td>
                      {formatInr(
                        rupeesToPaise(
                          itemAmount(item),
                        ),
                      )}
                    </td>

                    <td>
                      <button
                        type="button"
                        className="sales-order-delete-item-btn"
                        onClick={() =>
                          removeItem(item.lineId)
                        }
                      >
                        <X size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            className="sales-order-add-item-line"
            onClick={addItem}
          >
            <Plus size={13} />
            <span>Add Item</span>
          </button>
        </section>

        <section className="sales-order-bottom-section">
          <div className="sales-order-extra-section">
            <button
              type="button"
              className="sales-order-extra-row"
              onClick={() => setShowNotes(!showNotes)}
            >
              <StickyNote size={14} />
              <span>Add Notes</span>

              <ChevronDown
                size={14}
                className={
                  showNotes ? "rotate-icon" : ""
                }
              />
            </button>

            {showNotes && (
              <textarea
                value={notes}
                placeholder="Enter notes..."
                onChange={(event) =>
                  setNotes(event.target.value)
                }
              />
            )}

            <button
              type="button"
              className="sales-order-extra-row"
              onClick={() => setShowTerms(!showTerms)}
            >
              <ClipboardList size={14} />
              <span>Add Terms & Conditions</span>

              <ChevronDown
                size={14}
                className={
                  showTerms ? "rotate-icon" : ""
                }
              />
            </button>

            {showTerms && (
              <textarea
                value={termsAndConditions}
                placeholder="Enter terms and conditions..."
                onChange={(event) =>
                  setTermsAndConditions(
                    event.target.value,
                  )
                }
              />
            )}
          </div>

          <div className="sales-order-totals-section">
            <div className="sales-order-total-row">
              <span>Gross Amount</span>

              <strong>
                {formatInr(
                  rupeesToPaise(totals.gross),
                )}
              </strong>
            </div>

            <div className="sales-order-total-row">
              <span>Discount</span>

              <strong>
                {formatInr(
                  rupeesToPaise(totals.discount),
                )}
              </strong>
            </div>

            <div className="sales-order-total-row">
              <span>Taxable Amount</span>

              <strong>
                {formatInr(
                  rupeesToPaise(totals.taxable),
                )}
              </strong>
            </div>

            <div className="sales-order-total-row">
              <span>GST</span>

              <strong>
                {formatInr(
                  rupeesToPaise(totals.tax),
                )}
              </strong>
            </div>

            <div className="sales-order-grand-total-row">
              <strong>Total Amount</strong>

              <strong>
                {formatInr(
                  rupeesToPaise(totals.total),
                )}
              </strong>
            </div>
          </div>
        </section>
      </main>

      <button
        type="button"
        className="sales-order-help-button"
      >
        <CircleHelp size={17} />
      </button>
    </div>
  );
};

export default SalesOrderCreation;