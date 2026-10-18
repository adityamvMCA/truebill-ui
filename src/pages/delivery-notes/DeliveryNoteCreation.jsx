import { useEffect, useMemo, useRef, useState } from "react";

import { useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Plus,
  Save,
  StickyNote,
  Trash2,
  Truck,
} from "lucide-react";

import toast from "react-hot-toast";

import Input from "../../components/common/Form/Input";
import Select from "../../components/common/Form/Select";
import Textarea from "../../components/common/Form/Textarea";
import Button from "../../components/common/Form/Button";

import api from "../../services/api";
import apiClient from "../../services/apiClient";

import "../../styles/invoice-common1.css";
import "./delivery-note-creation.css";

const DEFAULT_LIST_PATH = "/sales/delivery-notes";

const localDate = () => {
  const date = new Date();

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
};

const initialForm = () => ({
  customerId: "",
  deliveryDate: localDate(),
  expectedDeliveryDate: "",

  contactPerson: "",
  contactPhone: "",
  billingAddress: "",
  shippingAddress: "",

  customerReference: "",
  transporterName: "",
  vehicleNumber: "",
  trackingNumber: "",

  transportDocumentNumber: "",
  transportDocumentDate: "",
  eWayBillNumber: "",

  notes: "",
  termsAndConditions: "",
});

let rowSequence = 0;

const newItem = () => ({
  rowId: `delivery-item-${++rowSequence}`,
  productId: "",
  quantity: "1",
  specification: "",
  notes: "",
});

const recordId = (record) => String(record?._id || record?.id || "");

const getErrors = (error) => {
  const body = error?.response?.data;

  if (Array.isArray(body?.errors) && body.errors.length) {
    return body.errors.map((item) =>
      typeof item === "string"
        ? item
        : item?.message || item?.msg || String(item),
    );
  }

  return [body?.message || error?.message || "Unable to complete the request."];
};

const loadAllPages = async (path, fallbackKey, params, signal) => {
  const extract = (response) => {
    const body = response?.data;

    if (body?.success === false) {
      throw new Error(body.message || `Unable to load ${fallbackKey}`);
    }

    const records = Array.isArray(body?.data) ? body.data : body?.[fallbackKey];

    if (!Array.isArray(records)) {
      throw new Error(`Invalid ${fallbackKey} response`);
    }

    return records;
  };

  const first = await apiClient.get(path, {
    params: {
      ...params,
      page: 1,
      limit: 100,
    },
    signal,
  });

  const records = [...extract(first)];

  const pages = Math.max(1, Number(first.data.pagination?.totalPages) || 1);

  for (let page = 2; page <= pages; page += 1) {
    const response = await apiClient.get(path, {
      params: {
        ...params,
        page,
        limit: 100,
      },
      signal,
    });

    records.push(...extract(response));
  }

  return Array.from(
    new Map(records.map((record) => [recordId(record), record])).values(),
  );
};

const parseQuantity = (value) => {
  const input = String(value ?? "").trim();

  if (!/^\d+(?:\.\d{1,3})?$/.test(input)) {
    return null;
  }

  const quantity = Number(input);

  if (!Number.isFinite(quantity) || quantity < 0.001 || quantity > 1000000) {
    return null;
  }

  return quantity;
};

const addressText = (customer, type) => {
  const address =
    type === "shipping"
      ? customer.shippingAddress || customer.billingAddress
      : customer.billingAddress;

  return [
    address,
    customer.city,
    customer.state,
    customer.pincode,
    customer.country,
  ]
    .filter(Boolean)
    .join(", ");
};

function DeliveryNoteCreation({ listPath = DEFAULT_LIST_PATH }) {
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [items, setItems] = useState(() => [newItem()]);

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);

  const [showNotes, setShowNotes] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const [createdNote, setCreatedNote] = useState(null);
  const [uncertain, setUncertain] = useState(false);

  const submitLock = useRef(false);
  const mountedRef = useRef(false);
  const dirtyRef = useRef(false);

  const locked =
    loading || loadFailed || saving || uncertain || Boolean(createdNote);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const loadOptions = async () => {
      setLoading(true);
      setLoadFailed(false);
      setErrors([]);

      try {
        const [customerRecords, productRecords] = await Promise.all([
          loadAllPages(
            "/customers",
            "customers",
            { status: "Active" },
            controller.signal,
          ),

          loadAllPages(
            "/products",
            "products",
            { status: "ACTIVE" },
            controller.signal,
          ),
        ]);

        if (!active) {
          return;
        }

        setCustomers(
          customerRecords.filter(
            (customer) => customer.status === "Active" && !customer.isDeleted,
          ),
        );

        setProducts(
          productRecords.filter(
            (product) =>
              product.status === "ACTIVE" &&
              product.type === "GOODS" &&
              !product.isDeleted,
          ),
        );
      } catch (error) {
        if (!active) {
          return;
        }

        setLoadFailed(true);
        setErrors(getErrors(error));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadOptions();

    return () => {
      active = false;
      controller.abort();
    };
  }, [reloadKey]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!createdNote && (dirtyRef.current || uncertain || saving)) {
        event.preventDefault();
        event.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [createdNote, uncertain, saving]);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => recordId(customer) === form.customerId),
    [customers, form.customerId],
  );

  const productMap = useMemo(
    () => new Map(products.map((product) => [recordId(product), product])),
    [products],
  );

  const quantityByUnit = useMemo(() => {
    const totals = new Map();

    for (const item of items) {
      const product = productMap.get(item.productId);
      const quantity = parseQuantity(item.quantity);

      if (!product || quantity === null) {
        continue;
      }

      const unit = product.unit || "Units";
      const milli = Math.round(quantity * 1000);

      totals.set(unit, (totals.get(unit) || 0) + milli);
    }

    return Array.from(totals, ([unit, milli]) => ({
      unit,
      quantity: milli / 1000,
    }));
  }, [items, productMap]);

  const markDirty = () => {
    dirtyRef.current = true;
    setErrors([]);
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;

    markDirty();

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleCustomerChange = (event) => {
    const customerId = event.target.value;

    const customer = customers.find(
      (record) => recordId(record) === customerId,
    );

    markDirty();

    setForm((previous) => ({
      ...previous,
      customerId,

      contactPerson: customer?.contactPerson || "",
      contactPhone: customer?.phone || "",

      billingAddress: customer ? addressText(customer, "billing") : "",

      shippingAddress: customer ? addressText(customer, "shipping") : "",
    }));
  };

  const updateItem = (rowId, field, value) => {
    markDirty();

    setItems((previous) =>
      previous.map((item) =>
        item.rowId === rowId ? { ...item, [field]: value } : item,
      ),
    );
  };

  const addItem = () => {
    if (locked || items.length >= 200) {
      return;
    }

    markDirty();

    setItems((previous) => [...previous, newItem()]);
  };

  const removeItem = (rowId) => {
    if (locked || items.length <= 1) {
      return;
    }

    markDirty();

    setItems((previous) => previous.filter((item) => item.rowId !== rowId));
  };

  const validateForm = () => {
    const messages = [];

    if (!selectedCustomer) {
      messages.push("Select an active customer.");
    }

    if (!form.deliveryDate) {
      messages.push("Delivery Note date is required.");
    }

    if (
      form.expectedDeliveryDate &&
      form.expectedDeliveryDate < form.deliveryDate
    ) {
      messages.push(
        "Expected delivery date cannot be before Delivery Note date.",
      );
    }

    if (!form.shippingAddress.trim()) {
      messages.push("Shipping address is required.");
    }

    if (!items.length || items.length > 200) {
      messages.push("Add between 1 and 200 items.");
    }

    const selectedIds = new Set();

    items.forEach((item, index) => {
      if (!productMap.has(item.productId)) {
        messages.push(`Select an active Goods product for item ${index + 1}.`);
      } else if (selectedIds.has(item.productId)) {
        messages.push(`Item ${index + 1}: a product can appear only once.`);
      }

      selectedIds.add(item.productId);

      if (parseQuantity(item.quantity) === null) {
        messages.push(
          `Item ${index + 1}: enter quantity from 0.001 to 1,000,000 with at most three decimal places.`,
        );
      }
    });

    return messages;
  };

  const buildPayload = () => ({
    customerId: form.customerId,

    deliveryDate: form.deliveryDate,
    expectedDeliveryDate: form.expectedDeliveryDate || null,

    contactPerson: form.contactPerson.trim() || null,
    contactPhone: form.contactPhone.trim() || null,

    billingAddress: form.billingAddress.trim() || null,
    shippingAddress: form.shippingAddress.trim(),

    customerReference: form.customerReference.trim() || null,

    transporterName: form.transporterName.trim() || null,
    vehicleNumber: form.vehicleNumber.trim().toUpperCase() || null,
    trackingNumber: form.trackingNumber.trim() || null,

    transportDocumentNumber: form.transportDocumentNumber.trim() || null,

    transportDocumentDate: form.transportDocumentDate || null,

    eWayBillNumber: form.eWayBillNumber.trim() || null,

    items: items.map((item) => ({
      productId: item.productId,
      quantity: parseQuantity(item.quantity),
      specification: item.specification.trim() || null,
      notes: item.notes.trim() || null,
    })),

    notes: form.notes.trim() || null,

    termsAndConditions: form.termsAndConditions.trim() || null,
  });

  const handleSave = async () => {
    if (submitLock.current || locked) {
      return;
    }

    const messages = validateForm();

    if (messages.length) {
      setErrors(messages);
      toast.error(messages[0]);
      return;
    }

    submitLock.current = true;
    setSaving(true);
    setErrors([]);

    try {
      const response = await api.deliveryNote.create(buildPayload());

      const note = response?.data?.data;

      if (
        response?.data?.success !== true ||
        !note?._id ||
        !note.deliveryNoteNumber
      ) {
        throw new Error(
          "The server did not return a Delivery Note number. Check the list before creating another note.",
        );
      }

      if (!mountedRef.current) {
        return;
      }

      dirtyRef.current = false;
      setCreatedNote(note);

      toast.success(`${note.deliveryNoteNumber} created successfully`);
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }

      const status = error?.response?.status;

      // Creation is not idempotent yet. Do not encourage
      // automatic retry after an uncertain response.
      const resultUncertain = !status || status >= 500 || status === 408;

      setUncertain(resultUncertain);
      setErrors(getErrors(error));

      toast.error(getErrors(error)[0]);
    } finally {
      submitLock.current = false;

      if (mountedRef.current) {
        setSaving(false);
      }
    }
  };

  const exitPage = () => {
    if (submitLock.current) {
      return;
    }

    if (!createdNote && (dirtyRef.current || uncertain)) {
      const message = uncertain
        ? "The previous save may have reached the server. Check the Delivery Note list before creating another. Leave this page?"
        : "Discard the unsaved Delivery Note and leave?";

      if (!window.confirm(message)) {
        return;
      }
    }

    navigate(listPath);
  };

  const saveButton = (
    <Button icon={Save} loading={saving} disabled={locked} onClick={handleSave}>
      Save Delivery Note
    </Button>
  );

  const renderInput = (label, name, extra = {}) => (
    <Input
      key={name}
      label={label}
      name={name}
      value={form[name]}
      onChange={handleFieldChange}
      {...extra}
    />
  );

  return (
    <div className="doc-page dn-create-page">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void handleSave();
        }}
      >
        <header className="doc-header">
          <div className="doc-header-left">
            <Button
              variant="secondary"
              icon={ArrowLeft}
              disabled={saving}
              onClick={exitPage}
            >
              Exit
            </Button>

            <div className="doc-title">
              <Truck size={19} />
              <span>Create Delivery Note</span>
            </div>
          </div>

          <div className="doc-header-actions">{saveButton}</div>
        </header>

        {(loading || errors.length > 0 || createdNote || uncertain) && (
          <div className="doc-alerts dn-alert-stack">
            {loading && (
              <div className="doc-alert" role="status">
                Loading customers and Goods products...
              </div>
            )}

            {createdNote && (
              <div className="doc-alert dn-success" role="status">
                <CheckCircle2 size={18} />

                <div>
                  <strong>{createdNote.deliveryNoteNumber} created</strong>

                  <p>Status: CREATED. No stock has been deducted.</p>

                  <Button
                    variant="secondary"
                    onClick={() => navigate(listPath)}
                  >
                    Go to Delivery Notes
                  </Button>
                </div>
              </div>
            )}

            {uncertain && (
              <div className="doc-alert" role="status">
                The save result is uncertain. The form is locked to prevent an
                accidental duplicate. Check the Delivery Note list before
                submitting again.
              </div>
            )}

            {errors.length > 0 && (
              <div className="doc-alert doc-alert-error" role="alert">
                <ul>
                  {errors.map((message, index) => (
                    <li key={`${index}-${message}`}>{message}</li>
                  ))}
                </ul>

                {loadFailed && (
                  <Button
                    variant="secondary"
                    onClick={() => setReloadKey((value) => value + 1)}
                  >
                    Retry Loading
                  </Button>
                )}

                {uncertain && (
                  <Button variant="secondary" onClick={exitPage}>
                    Check Delivery Note List
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        <fieldset className="doc-fieldset" disabled={locked}>
          <main className="doc-main">
            <section className="doc-top">
              <div className="doc-panel doc-party-panel">
                <h2 className="doc-panel-title">Deliver To</h2>

                <Select
                  label="Customer"
                  name="customerId"
                  value={form.customerId}
                  placeholder="Select customer"
                  options={customers.map((customer) => ({
                    value: recordId(customer),
                    label: `${customer.customerName} (${customer.customerCode})`,
                  }))}
                  onChange={handleCustomerChange}
                  required
                />

                {selectedCustomer && (
                  <div className="doc-party-card dn-party-card">
                    <div className="doc-avatar">
                      {selectedCustomer.customerName?.charAt(0).toUpperCase()}
                    </div>

                    <div className="doc-party-copy">
                      <h3>{selectedCustomer.customerName}</h3>

                      <p>{selectedCustomer.customerCode}</p>

                      <p>
                        <span>GSTIN:</span>{" "}
                        {selectedCustomer.gstNo || "Not provided"}
                      </p>

                      <p>
                        <span>Phone:</span>{" "}
                        {selectedCustomer.phone || "Not provided"}
                      </p>

                      <p>
                        <span>Customer Address:</span>{" "}
                        {addressText(selectedCustomer, "billing") ||
                          "Not provided"}
                      </p>
                    </div>
                  </div>
                )}

                <div className="dn-address-fields">
                  <Textarea
                    label="Shipping Address"
                    name="shippingAddress"
                    value={form.shippingAddress}
                    onChange={handleFieldChange}
                    maxLength={2000}
                    rows={3}
                    required
                  />

                  <Textarea
                    label="Billing Address"
                    name="billingAddress"
                    value={form.billingAddress}
                    onChange={handleFieldChange}
                    maxLength={2000}
                    rows={3}
                  />
                </div>
              </div>

              <div className="doc-panel">
                <h2 className="doc-panel-title">Delivery Note Details</h2>

                <div className="doc-fields-grid">
                  <Input
                    label="Delivery Note Number"
                    name="deliveryNoteNumber"
                    value="Generated after saving"
                    readOnly
                  />

                  {renderInput("Delivery Note Date", "deliveryDate", {
                    type: "date",
                    required: true,
                  })}

                  {renderInput("Expected Delivery", "expectedDeliveryDate", {
                    type: "date",
                    min: form.deliveryDate,
                  })}

                  {renderInput("Customer Reference", "customerReference", {
                    maxLength: 100,
                  })}

                  {renderInput("Contact Person", "contactPerson", {
                    maxLength: 150,
                  })}

                  {renderInput("Contact Phone", "contactPhone", {
                    type: "tel",
                    maxLength: 30,
                  })}
                </div>
              </div>
            </section>

            <section className="doc-items">
              <div className="doc-table-wrap">
                <table className="doc-table dn-items-table">
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Goods Product</th>
                      <th>Unit</th>
                      <th>Quantity</th>
                      <th>Specification</th>
                      <th>Notes</th>
                      <th>
                        <span className="doc-sr-only">Remove</span>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {items.map((item, index) => {
                      const product = productMap.get(item.productId);

                      const options = products
                        .filter(
                          (candidate) =>
                            recordId(candidate) === item.productId ||
                            !items.some(
                              (other) =>
                                other.productId === recordId(candidate),
                            ),
                        )
                        .map((candidate) => ({
                          value: recordId(candidate),
                          label: `${candidate.name} (${candidate.productCode})`,
                        }));

                      return (
                        <tr key={item.rowId}>
                          <td className="doc-cell-no" data-label="No.">
                            {index + 1}
                          </td>

                          <td
                            className="doc-cell-item"
                            data-label="Goods Product"
                          >
                            <Select
                              name={`product-${item.rowId}`}
                              aria-label={`Product ${index + 1}`}
                              value={item.productId}
                              placeholder="Select Goods product"
                              options={options}
                              onChange={(event) =>
                                updateItem(
                                  item.rowId,
                                  "productId",
                                  event.target.value,
                                )
                              }
                            />

                            {product && (
                              <small className="doc-item-meta">
                                {product.trackInventory
                                  ? `Current stock: ${product.currentStock ?? 0} ${product.unit}`
                                  : "Inventory not tracked"}
                              </small>
                            )}
                          </td>

                          <td data-label="Unit">
                            <Input
                              name={`unit-${item.rowId}`}
                              aria-label={`Unit ${index + 1}`}
                              value={product?.unit || "—"}
                              readOnly
                            />
                          </td>

                          <td data-label="Quantity">
                            <Input
                              name={`quantity-${item.rowId}`}
                              aria-label={`Quantity ${index + 1}`}
                              type="number"
                              min="0.001"
                              max="1000000"
                              step="0.001"
                              inputMode="decimal"
                              value={item.quantity}
                              onChange={(event) =>
                                updateItem(
                                  item.rowId,
                                  "quantity",
                                  event.target.value,
                                )
                              }
                            />
                          </td>

                          <td data-label="Specification">
                            <Input
                              name={`specification-${item.rowId}`}
                              aria-label={`Specification ${index + 1}`}
                              value={item.specification}
                              maxLength={1000}
                              onChange={(event) =>
                                updateItem(
                                  item.rowId,
                                  "specification",
                                  event.target.value,
                                )
                              }
                            />
                          </td>

                          <td data-label="Item Notes">
                            <Input
                              name={`notes-${item.rowId}`}
                              aria-label={`Notes ${index + 1}`}
                              value={item.notes}
                              maxLength={500}
                              onChange={(event) =>
                                updateItem(
                                  item.rowId,
                                  "notes",
                                  event.target.value,
                                )
                              }
                            />
                          </td>

                          <td className="doc-cell-action" data-label="Remove">
                            <button
                              type="button"
                              className="doc-remove-button"
                              aria-label={`Remove item ${index + 1}`}
                              disabled={items.length <= 1}
                              onClick={() => removeItem(item.rowId)}
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

              <div className="doc-add-item-row">
                <button
                  type="button"
                  className="doc-dashed-line"
                  onClick={addItem}
                  disabled={items.length >= 200}
                >
                  <Plus size={16} />
                  Add Item
                </button>
              </div>
            </section>

            <section className="doc-panel dn-transport-panel">
              <h2 className="doc-panel-title">Transport Details</h2>

              <div className="doc-fields-grid dn-transport-grid">
                {renderInput("Transporter", "transporterName", {
                  maxLength: 200,
                })}

                {renderInput("Vehicle Number", "vehicleNumber", {
                  maxLength: 30,
                })}

                {renderInput("Tracking Number", "trackingNumber", {
                  maxLength: 100,
                })}

                {renderInput(
                  "Transport Document Number",
                  "transportDocumentNumber",
                  { maxLength: 100 },
                )}

                {renderInput(
                  "Transport Document Date",
                  "transportDocumentDate",
                  { type: "date" },
                )}

                {renderInput("E-Way Bill Reference", "eWayBillNumber", {
                  maxLength: 50,
                })}
              </div>

              <p className="doc-note">
                E-way bill reference is informational. This screen does not
                generate an e-way bill.
              </p>
            </section>

            <section className="doc-bottom">
              <div className="doc-extras">
                <button
                  type="button"
                  className={`doc-extra-row ${showNotes ? "is-open" : ""}`}
                  aria-expanded={showNotes}
                  onClick={() => setShowNotes((value) => !value)}
                >
                  <StickyNote size={16} />
                  <span>Notes</span>
                  <ChevronDown size={16} />
                </button>

                {showNotes && (
                  <div className="doc-extra-content">
                    <Textarea
                      name="notes"
                      aria-label="Delivery Note notes"
                      value={form.notes}
                      onChange={handleFieldChange}
                      maxLength={1000}
                      rows={3}
                    />
                  </div>
                )}

                <button
                  type="button"
                  className={`doc-extra-row ${showTerms ? "is-open" : ""}`}
                  aria-expanded={showTerms}
                  onClick={() => setShowTerms((value) => !value)}
                >
                  <ClipboardList size={16} />
                  <span>Terms & Conditions</span>
                  <ChevronDown size={16} />
                </button>

                {showTerms && (
                  <div className="doc-extra-content">
                    <Textarea
                      name="termsAndConditions"
                      aria-label="Delivery terms and conditions"
                      value={form.termsAndConditions}
                      onChange={handleFieldChange}
                      maxLength={5000}
                      rows={4}
                    />
                  </div>
                )}
              </div>

              <div className="doc-summary">
                <div className="doc-summary-row">
                  <span>Creation Status</span>
                  <strong>CREATED</strong>
                </div>

                <div className="doc-summary-row">
                  <span>Selected Products</span>
                  <strong>
                    {items.filter((item) => item.productId).length}
                  </strong>
                </div>

                {quantityByUnit.map((entry) => (
                  <div className="doc-summary-row" key={entry.unit}>
                    <span>Quantity ({entry.unit})</span>
                    <strong>{entry.quantity}</strong>
                  </div>
                ))}

                <p className="doc-note">
                  Quantities with different units are not added together. Saving
                  creates the document only. Stock is checked and deducted at
                  dispatch.
                </p>
              </div>
            </section>
          </main>
        </fieldset>

        <div className="doc-mobile-bar dn-mobile-save-bar">
          <div className="doc-mobile-total">
            <span>
              {createdNote ? createdNote.deliveryNoteNumber : "Delivery Note"}
            </span>

            <strong>
              {createdNote
                ? "CREATED"
                : `${items.filter((item) => item.productId).length} items`}
            </strong>
          </div>

          <div className="doc-mobile-actions">
            <Button
              type="button"
              variant="secondary"
              icon={ArrowLeft}
              disabled={saving}
              onClick={exitPage}
            >
              Exit
            </Button>

            {createdNote || uncertain ? (
              <Button type="button" disabled={saving} onClick={exitPage}>
                {uncertain ? "Check List" : "Go to List"}
              </Button>
            ) : (
              <Button
                type="button"
                icon={Save}
                loading={saving}
                disabled={locked}
                onClick={handleSave}
              >
                Save Delivery Note
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

export default DeliveryNoteCreation;
