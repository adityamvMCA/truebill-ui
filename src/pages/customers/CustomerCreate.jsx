import { useState } from "react";
import {
  BadgeIndianRupee,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileText,
  MapPin,
  Phone,
  Plus,
  Save,
  UserRound,
  X,
} from "lucide-react";

import "../../styles/customer-create.css";
import api from "../../services/api";
import Input from "../../components/common/Form/Input";
import Textarea from "../../components/common/Form/Textarea";
import Select from "../../components/common/Form/Select";
const initialForm = {
  customerName: "",
  customerType: "Business",
  contactPerson: "",
  phone: "",
  alternatePhone: "",
  email: "",
  gstNo: "",
  panNo: "",
  billingAddress: "",
  shippingAddress: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
  paymentTerms: "Due on Receipt",
  creditLimit: 0,
  creditDays: 0,
  openingBalance: 0,
  openingBalanceType: "DEBIT",
  priceList: "Standard",
  status: "Active",
  notes: "",
};

const cleanText = (value) => String(value || "").trim();

const CustomerCreate = () => {
  const [form, setForm] = useState(initialForm);
  const [sameAsBilling, setSameAsBilling] = useState(false);
  const [showBusinessDetails, setShowBusinessDetails] = useState(false);
  const [showCreditDetails, setShowCreditDetails] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    let nextValue = value;

    if (name === "phone" || name === "alternatePhone") {
      nextValue = value.replace(/[^\d+\-() ]/g, "");
    }

    if (name === "pincode") {
      nextValue = value.replace(/\D/g, "").slice(0, 6);
    }

    if (name === "gstNo" || name === "panNo") {
      nextValue = value.toUpperCase();
    }

    setForm((previous) => {
      const updated = {
        ...previous,
        [name]: nextValue,
      };

      if (sameAsBilling && name === "billingAddress") {
        updated.shippingAddress = nextValue;
      }

      return updated;
    });
  };

  const handleSameAsBilling = (checked) => {
    setSameAsBilling(checked);

    setForm((previous) => ({
      ...previous,
      shippingAddress: checked
        ? previous.billingAddress
        : previous.shippingAddress,
    }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setSameAsBilling(false);
    setShowBusinessDetails(false);
    setShowCreditDetails(false);
    setShowNotes(false);
    setErrors([]);
    setSuccessMessage("");
  };

  const buildPayload = () => ({
    customerName: cleanText(form.customerName),
    customerType: form.customerType,
    contactPerson: cleanText(form.contactPerson),
    phone: cleanText(form.phone),
    alternatePhone: cleanText(form.alternatePhone),
    email: cleanText(form.email),
    gstNo: cleanText(form.gstNo),
    panNo: cleanText(form.panNo),
    billingAddress: cleanText(form.billingAddress),
    shippingAddress: cleanText(form.shippingAddress),
    city: cleanText(form.city),
    state: cleanText(form.state),
    pincode: cleanText(form.pincode),
    country: cleanText(form.country) || "India",
    paymentTerms: cleanText(form.paymentTerms) || "Due on Receipt",
    creditLimit: Number(form.creditLimit || 0),
    creditDays: Number(form.creditDays || 0),
    openingBalance: Number(form.openingBalance || 0),
    openingBalanceType: form.openingBalanceType,
    priceList: cleanText(form.priceList) || "Standard",
    status: form.status,
    notes: cleanText(form.notes),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();

    setErrors([]);
    setSuccessMessage("");

    if (!cleanText(form.customerName)) {
      setErrors(["Customer name is required."]);
      return;
    }

    setSaving(true);

    try {
      const response = await api.customers.create(buildPayload());
      const customer = response.data.customer;

      setSuccessMessage(
        `${customer.customerName} was created successfully. Customer code: ${customer.customerCode}.`
      );

      setForm(initialForm);
      setSameAsBilling(false);
      setShowBusinessDetails(false);
      setShowCreditDetails(false);
      setShowNotes(false);
    } catch (error) {
      const responseData = error.response?.data;

      console.error("Customer create request failed:", {
        status: error.response?.status,
        responseData,
        error,
      });

      setErrors(
        Array.isArray(responseData?.errors)
          ? responseData.errors
          : [
              responseData?.message ||
                "Unable to create the customer. Please try again.",
            ]
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="customer-create-page">
      <header className="customer-create-header">
        <div className="customer-create-heading">
          <div className="customer-create-heading-icon">
            <UserRound size={18} />
          </div>

          <div className="customer-create-heading-copy">
            <h1>Create Customer</h1>
            <p>Add a customer for invoices, sales, and receivables.</p>
          </div>
        </div>

        <div className="customer-create-header-actions">
          <button
            type="button"
            className="customer-create-clear-button"
            onClick={resetForm}
            disabled={saving}
          >
            <X size={15} />
            <span>Clear</span>
          </button>

          <button
            type="submit"
            form="customer-create-form"
            className="customer-create-save-button"
            disabled={saving}
          >
            <Save size={15} />
            <span>{saving ? "Creating..." : "Create Customer"}</span>
          </button>
        </div>
      </header>

      <main className="customer-create-main">
       
        {successMessage && (
          <div className="customer-create-alert customer-create-alert-success">
            <CheckCircle2 size={19} />

            <div>
              <strong>Customer created</strong>
              <span>{successMessage}</span>
            </div>

            <button
              type="button"
              onClick={() => setSuccessMessage("")}
              aria-label="Dismiss success message"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {errors.length > 0 && (
          <div className="customer-create-alert customer-create-alert-error">
            <div className="customer-create-alert-error-icon">!</div>

            <div>
              <strong>Please review the form</strong>

              <ul>
                {errors.map((message, index) => (
                  <li key={`${message}-${index}`}>{message}</li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => setErrors([])}
              aria-label="Dismiss errors"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <form
          id="customer-create-form"
          className="customer-create-form"
          onSubmit={handleSubmit}
        >
          <section className="customer-create-card customer-create-basics-card">
            <div className="customer-create-card-header">
              <div className="customer-create-section-icon">
                <Building2 size={17} />
              </div>

              <div>
                <h3>Basic details</h3>
                <p>Required information to create a customer.</p>
              </div>

              <span className="customer-create-required-badge">
                <span>*</span> Required
              </span>
            </div>

            <div className="customer-create-card-body">
              <div className="customer-create-basics-layout">
                <div className="customer-create-field customer-create-name-field">
                  <label htmlFor="customerName">
                    Customer name <span>*</span>
                  </label>

                  <div className="customer-create-input-with-icon">
                    <UserRound size={16} />

                    <input
                      id="customerName"
                      name="customerName"
                      value={form.customerName}
                      onChange={handleChange}
                      placeholder="Example: ABC Traders Pvt Ltd"
                      autoComplete="organization"
                      required
                    />
                  </div>

                  <small>
                    This name appears in customer lists, invoices, and reports.
                  </small>
                </div>

                <div className="customer-create-field">
                  <label htmlFor="customerType">Customer type</label>

                  <div className="customer-create-select-wrap">
                    <select
                      id="customerType"
                      name="customerType"
                      value={form.customerType}
                      onChange={handleChange}
                    >
                      <option value="Business">Business</option>
                      <option value="Individual">Individual</option>
                    </select>

                    <ChevronDown size={15} />
                  </div>
                </div>

                <div className="customer-create-field">
                  <label htmlFor="status">Status</label>

                  <div className="customer-create-select-wrap">
                    <select
                      id="status"
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>

                    <ChevronDown size={15} />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="customer-create-main-grid">
            <section className="customer-create-card">
              <div className="customer-create-card-header">
                <div className="customer-create-section-icon">
                  <Phone size={17} />
                </div>

                <div>
                  <h3>Contact details</h3>
                  <p>Optional, but useful for invoices and reminders.</p>
                </div>
              </div>

              <div className="customer-create-card-body">
                <div className="customer-create-fields-grid">
                  <div className="customer-create-field">
                    <label htmlFor="contactPerson">Contact person</label>

                    <Input
                      id="contactPerson"
                      name="contactPerson"
                      value={form.contactPerson}
                      onChange={handleChange}
                      placeholder="Example: Rahul Sharma"
                      autoComplete="name"
                    />
                  </div>

                  <div className="customer-create-field">
                    <label htmlFor="phone">Phone number</label>

                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="9876543210"
                      autoComplete="tel"
                    />
                  </div>

                  <div className="customer-create-field">
                    <label htmlFor="alternatePhone">Alternate phone</label>

                    <Input
                      id="alternatePhone"
                      name="alternatePhone"
                      type="tel"
                      inputMode="tel"
                      value={form.alternatePhone}
                      onChange={handleChange}
                      placeholder="Optional"
                    />
                  </div>

                  <div className="customer-create-field">
                    <label htmlFor="email">Email address</label>

                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="accounts@example.com"
                      autoComplete="email"
                    />
                  </div>
                </div>
              </div>
            </section>

            <section className="customer-create-card">
              <div className="customer-create-card-header">
                <div className="customer-create-section-icon">
                  <MapPin size={17} />
                </div>

                <div>
                  <h3>Address details</h3>
                  <p>Add an address now or complete it later.</p>
                </div>
              </div>

              <div className="customer-create-card-body">
                <div className="customer-create-fields-grid">
                  <div className="customer-create-field customer-create-full-field">
                    <label htmlFor="billingAddress">Billing address</label>

                    <Textarea
                      id="billingAddress"
                      name="billingAddress"
                      value={form.billingAddress}
                      onChange={handleChange}
                      placeholder="Building, street, area"
                      rows="3"
                    />
                  </div>

                  <label className="customer-create-check-row">
                    <Input
                      type="checkbox"
                      checked={sameAsBilling}
                      onChange={(event) =>
                        handleSameAsBilling(event.target.checked)
                      }
                    />

                    <span className="customer-create-check-ui">
                      <Check size={11} />
                    </span>

                    <span>Shipping address is same as billing address</span>
                  </label>

                  <div className="customer-create-field customer-create-full-field">
                    <label htmlFor="shippingAddress">Shipping address</label>

                    <Textarea
                      id="shippingAddress"
                      name="shippingAddress"
                      value={form.shippingAddress}
                      onChange={handleChange}
                      placeholder="Leave blank when it is the same as billing address"
                      rows="3"
                      disabled={sameAsBilling}
                    />
                  </div>

                  <div className="customer-create-field">
                    <label htmlFor="city">City</label>

                    <Input
                      id="city"
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      placeholder="Mumbai"
                    />
                  </div>

                  <div className="customer-create-field">
                    <label htmlFor="state">State</label>

                    <Input
                      id="state"
                      name="state"
                      value={form.state}
                      onChange={handleChange}
                      placeholder="Maharashtra"
                    />
                  </div>

                  <div className="customer-create-field">
                    <label htmlFor="pincode">Pincode</label>

                    <Input
                      id="pincode"
                      name="pincode"
                      inputMode="numeric"
                      value={form.pincode}
                      onChange={handleChange}
                      placeholder="400001"
                      maxLength="6"
                    />
                  </div>

                  <div className="customer-create-field">
                    <label htmlFor="country">Country</label>

                    <Input
                      id="country"
                      name="country"
                      value={form.country}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>

          <section className="customer-create-card customer-create-expandable-card">
            <button
              type="button"
              className={`customer-create-expand-trigger ${
                showBusinessDetails ? "is-open" : ""
              }`}
              onClick={() =>
                setShowBusinessDetails((previous) => !previous)
              }
              aria-expanded={showBusinessDetails}
            >
              <span className="customer-create-expand-title">
                <span className="customer-create-section-icon">
                  <FileText size={17} />
                </span>

                <span>
                  <strong>Tax & business details</strong>
                  <small>
                    GST, PAN, and price-list information for business customers.
                  </small>
                </span>
              </span>

              <ChevronDown size={19} />
            </button>

            {showBusinessDetails && (
              <div className="customer-create-expand-body">
                <div className="customer-create-fields-grid customer-create-business-grid">
                  <div className="customer-create-field">
                    <label htmlFor="gstNo">GST number</label>

                    <Input
                      id="gstNo"
                      name="gstNo"
                      value={form.gstNo}
                      onChange={handleChange}
                      placeholder="27ABCDE1234F1Z5"
                      maxLength="15"
                    />
                  </div>

                  <div className="customer-create-field">
                    <label htmlFor="panNo">PAN number</label>

                    <Input
                      id="panNo"
                      name="panNo"
                      value={form.panNo}
                      onChange={handleChange}
                      placeholder="ABCDE1234F"
                      maxLength="10"
                    />
                  </div>

                  <div className="customer-create-field">
                    <label htmlFor="priceList">Price list</label>

                    <div className="customer-create-select-wrap">
                      <Select
                        id="priceList"
                        name="priceList"
                        value={form.priceList}
                        onChange={handleChange}
                      >
                        <option value="Standard">Standard</option>
                        <option value="Wholesale">Wholesale</option>
                        <option value="Retail">Retail</option>
                      </Select>

                      <ChevronDown size={15} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="customer-create-card customer-create-expandable-card">
            <button
              type="button"
              className={`customer-create-expand-trigger ${
                showCreditDetails ? "is-open" : ""
              }`}
              onClick={() => setShowCreditDetails((previous) => !previous)}
              aria-expanded={showCreditDetails}
            >
              <span className="customer-create-expand-title">
                <span className="customer-create-section-icon">
                  <BadgeIndianRupee size={17} />
                </span>

                <span>
                  <strong>Credit & opening balance</strong>
                  <small>
                    Optional. Configure only when this customer receives credit.
                  </small>
                </span>
              </span>

              <ChevronDown size={19} />
            </button>

            {showCreditDetails && (
              <div className="customer-create-expand-body">
                <div className="customer-create-fields-grid customer-create-credit-grid">
                  <div className="customer-create-field">
                    <label htmlFor="paymentTerms">Payment terms</label>

                    <Input
                      id="paymentTerms"
                      name="paymentTerms"
                      value={form.paymentTerms}
                      onChange={handleChange}
                      placeholder="Due on Receipt"
                    />
                  </div>

                  <div className="customer-create-field">
                    <label htmlFor="creditDays">Credit days</label>

                    <Input
                      id="creditDays"
                      name="creditDays"
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={form.creditDays}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="customer-create-field">
                    <label htmlFor="creditLimit">Credit limit (₹)</label>

                    <Input
                      id="creditLimit"
                      name="creditLimit"
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={form.creditLimit}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="customer-create-field">
                    <label htmlFor="openingBalance">Opening balance (₹)</label>

                    <Input
                      id="openingBalance"
                      name="openingBalance"
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={form.openingBalance}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="customer-create-field">
                    <label htmlFor="openingBalanceType">
                      Opening balance type
                    </label>

                    <div className="customer-create-select-wrap">
                      <Select
                        id="openingBalanceType"
                        name="openingBalanceType"
                        value={form.openingBalanceType}
                        onChange={handleChange}
                      >
                        <option value="DEBIT">Debit</option>
                        <option value="CREDIT">Credit</option>
                      </Select>

                      <ChevronDown size={15} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="customer-create-card customer-create-expandable-card">
            <button
              type="button"
              className={`customer-create-expand-trigger ${
                showNotes ? "is-open" : ""
              }`}
              onClick={() => setShowNotes((previous) => !previous)}
              aria-expanded={showNotes}
            >
              <span className="customer-create-expand-title">
                <span className="customer-create-section-icon">
                  <ClipboardList size={17} />
                </span>

                <span>
                  <strong>Internal notes</strong>
                  <small>Optional notes for your team only.</small>
                </span>
              </span>

              <ChevronDown size={19} />
            </button>

            {showNotes && (
              <div className="customer-create-expand-body customer-create-notes-body">
                <div className="customer-create-field">
                  <label htmlFor="notes">Notes</label>

                  <Textarea
                    id="notes"
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    placeholder="Add payment preferences, internal instructions, or any helpful context."
                    rows="4"
                  />
                </div>
              </div>
            )}
          </section>

          <footer className="customer-create-footer">
            <div className="customer-create-footer-note">
              <Plus size={16} />
              <span>
                You can create a customer with only a customer name. More
                details can be added later.
              </span>
            </div>

            <div className="customer-create-footer-actions">
              <button
                type="button"
                className="customer-create-clear-button"
                onClick={resetForm}
                disabled={saving}
              >
                Clear form
              </button>

              <button
                type="submit"
                className="customer-create-save-button"
                disabled={saving}
              >
                <Save size={15} />
                {saving ? "Creating..." : "Create Customer"}
              </button>
            </div>
          </footer>
        </form>
      </main>
    </div>
  );
};

export default CustomerCreate;