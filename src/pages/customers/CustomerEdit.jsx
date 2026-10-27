import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  BadgeIndianRupee,
  Building2,
  Check,
  ChevronDown,
  ClipboardList,
  FileText,
  Lock,
  MapPin,
  Phone,
  Save,
  UserRound,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import "../../styles/customer-create.css";
import api from "../../services/api";
import routes from "../../config/routes";

import Input from "../../components/common/Form/Input";
import Select from "../../components/common/Form/Select";
import Textarea from "../../components/common/Form/Textarea";

const EMPTY_FORM = {
  customerCode: "",
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

const customerTypeOptions = [
  { value: "Business", label: "Business" },
  { value: "Individual", label: "Individual" },
];

const statusOptions = [
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
];

const priceListOptions = [
  { value: "Standard", label: "Standard" },
  { value: "Wholesale", label: "Wholesale" },
  { value: "Retail", label: "Retail" },
];

const openingBalanceTypeOptions = [
  { value: "DEBIT", label: "Debit" },
  { value: "CREDIT", label: "Credit" },
];

const LIST_ROUTE = routes?.customers?.list || "/customers/list";

const cleanText = (value) => String(value ?? "").trim();

// API returns null for empty optional fields; inputs need strings
const toFormValues = (customer) => {
  const next = { ...EMPTY_FORM };

  Object.keys(EMPTY_FORM).forEach((key) => {
    const value = customer?.[key];

    if (value !== null && value !== undefined) {
      next[key] = value;
    }
  });

  return next;
};

const getApiErrorMessages = (apiError) => {
  const responseData = apiError?.response?.data;

  if (Array.isArray(responseData?.errors) && responseData.errors.length > 0) {
    return responseData.errors.map((item) =>
      typeof item === "string" ? item : item?.message || item?.msg || String(item),
    );
  }

  if (typeof responseData?.message === "string") {
    return [responseData.message];
  }

  if (typeof responseData?.error === "string") {
    return [responseData.error];
  }

  return [
    apiError?.message || "Unable to update the customer. Please try again.",
  ];
};

function CustomerEdit() {
  const navigate = useNavigate();
  const { id } = useParams();

  const customerCodeParam = decodeURIComponent(id || "");

  const [form, setForm] = useState(EMPTY_FORM);
  const [sameAsBilling, setSameAsBilling] = useState(false);

  const [showBusinessDetails, setShowBusinessDetails] = useState(false);
  const [showCreditDetails, setShowCreditDetails] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);

  const loadCustomer = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");

      const response = await api.customers.getByCode(customerCodeParam);

      const customer =
        response?.data?.customer || response?.data?.data || response?.data;

      if (!customer?.customerCode) {
        throw new Error("Customer not found");
      }

      const values = toFormValues(customer);

      setForm(values);

      setSameAsBilling(
        Boolean(values.billingAddress) &&
          values.billingAddress === values.shippingAddress,
      );

      // Open sections that already contain data
      setShowBusinessDetails(
        Boolean(values.gstNo || values.panNo || values.priceList !== "Standard"),
      );

      setShowCreditDetails(
        Boolean(
          Number(values.creditLimit) ||
            Number(values.creditDays) ||
            Number(values.openingBalance) ||
            values.paymentTerms !== "Due on Receipt",
        ),
      );

      setShowNotes(Boolean(values.notes));
    } catch (error) {
      console.error("Unable to load customer:", error);

      setLoadError(
        error?.response?.status === 404
          ? "Customer not found."
          : getApiErrorMessages(error)[0],
      );
    } finally {
      setLoading(false);
    }
  }, [customerCodeParam]);

  useEffect(() => {
    loadCustomer();
  }, [loadCustomer]);

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
      const updated = { ...previous, [name]: nextValue };

      if (sameAsBilling && name === "billingAddress") {
        updated.shippingAddress = nextValue;
      }

      return updated;
    });

    if (errors.length > 0) {
      setErrors([]);
    }
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

  /*
    Opening balance is NOT sent: the backend update does not re-post it to the
    customer ledger, so editing it here would make the customer and ledger
    disagree. customerCode is immutable and also not sent.
  */
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
    creditLimit: Number(form.creditLimit) || 0,
    creditDays: Number(form.creditDays) || 0,
    priceList: cleanText(form.priceList) || "Standard",
    status: form.status,
    notes: cleanText(form.notes),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) {
      return;
    }

    setErrors([]);

    if (cleanText(form.customerName).length < 2) {
      setErrors(["Customer name is required (minimum 2 characters)."]);
      return;
    }

    try {
      setSaving(true);

      await api.customers.update(form.customerCode, buildPayload());

      toast.success(
        `${cleanText(form.customerName)} (${form.customerCode}) updated successfully`,
      );

      navigate(LIST_ROUTE);
    } catch (apiError) {
      console.error("Customer update request failed:", apiError);

      const messages = getApiErrorMessages(apiError);

      setErrors(messages);
      toast.error(messages[0]);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (saving) {
      return;
    }

    navigate(LIST_ROUTE);
  };

  if (loading) {
    return (
      <div className="customer-create-page">
        <main className="customer-create-main">
          <div className="customer-create-card">
            <div className="customer-create-card-body">Loading customer...</div>
          </div>
        </main>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="customer-create-page">
        <main className="customer-create-main">
          <div className="customer-create-alert customer-create-alert-error">
            <div className="customer-create-alert-error-icon">!</div>

            <div>
              <strong>Unable to open customer</strong>
              <ul>
                <li>{loadError}</li>
              </ul>
            </div>
          </div>

          <div className="customer-create-footer-actions">
            <button
              type="button"
              className="customer-create-clear-button"
              onClick={() => navigate(LIST_ROUTE)}
            >
              Back to customers
            </button>

            <button
              type="button"
              className="customer-create-save-button"
              onClick={loadCustomer}
            >
              Try again
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="customer-create-page">
      <header className="customer-create-header">
        <div className="customer-create-heading">
          <div className="customer-create-heading-icon">
            <UserRound size={18} />
          </div>

          <div className="customer-create-heading-copy">
            <h1>Edit Customer</h1>

            <p>
              {form.customerCode} · {form.customerName}
            </p>
          </div>
        </div>

        <div className="customer-create-header-actions">
          <button
            type="button"
            className="customer-create-clear-button"
            onClick={handleCancel}
            disabled={saving}
          >
            <X size={15} />

            <span>Cancel</span>
          </button>

          <button
            type="submit"
            form="customer-edit-form"
            className="customer-create-save-button"
            disabled={saving}
          >
            <Save size={15} />

            <span>{saving ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>
      </header>

      <main className="customer-create-main">
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
          id="customer-edit-form"
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

                <p>Core information for this customer.</p>
              </div>

              <span className="customer-create-required-badge">
                <span>*</span>
                Required
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
                    Customer code <strong>{form.customerCode}</strong> cannot be
                    changed.
                  </small>
                </div>

                <Select
                  label="Customer Type"
                  name="customerType"
                  value={form.customerType}
                  onChange={handleChange}
                  options={customerTypeOptions}
                />

                <Select
                  label="Status"
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  options={statusOptions}
                />
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

                  <p>Used for invoices and reminders.</p>
                </div>
              </div>

              <div className="customer-create-card-body">
                <div className="customer-create-fields-grid">
                  <Input
                    label="Contact Person"
                    name="contactPerson"
                    value={form.contactPerson}
                    onChange={handleChange}
                    placeholder="Example: Rahul Sharma"
                    autoComplete="name"
                  />

                  <Input
                    label="Phone Number"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="9876543210"
                    autoComplete="tel"
                  />

                  <Input
                    label="Alternate Phone"
                    name="alternatePhone"
                    type="tel"
                    inputMode="tel"
                    value={form.alternatePhone}
                    onChange={handleChange}
                    placeholder="Optional"
                  />

                  <Input
                    label="Email Address"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="accounts@example.com"
                    autoComplete="email"
                  />
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

                  <p>Billing and shipping information.</p>
                </div>
              </div>

              <div className="customer-create-card-body">
                <div className="customer-create-fields-grid">
                  <div className="customer-create-field customer-create-full-field">
                    <Textarea
                      label="Billing Address"
                      name="billingAddress"
                      value={form.billingAddress}
                      onChange={handleChange}
                      placeholder="Building, street, area"
                      rows={3}
                    />
                  </div>

                  <label className="customer-create-check-row">
                    <input
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
                    <Textarea
                      label="Shipping Address"
                      name="shippingAddress"
                      value={form.shippingAddress}
                      onChange={handleChange}
                      placeholder="Leave blank when it is the same as billing address"
                      rows={3}
                      disabled={sameAsBilling}
                    />
                  </div>

                  <Input
                    label="City"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    placeholder="Mumbai"
                  />

                  <Input
                    label="State"
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    placeholder="Maharashtra"
                  />

                  <Input
                    label="Pincode"
                    name="pincode"
                    inputMode="numeric"
                    value={form.pincode}
                    onChange={handleChange}
                    placeholder="400001"
                    maxLength={6}
                  />

                  <Input
                    label="Country"
                    name="country"
                    value={form.country}
                    onChange={handleChange}
                    placeholder="India"
                  />
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
              onClick={() => setShowBusinessDetails((previous) => !previous)}
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
                  <Input
                    label="GST Number"
                    name="gstNo"
                    value={form.gstNo}
                    onChange={handleChange}
                    placeholder="27ABCDE1234F1Z5"
                    maxLength={15}
                  />

                  <Input
                    label="PAN Number"
                    name="panNo"
                    value={form.panNo}
                    onChange={handleChange}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                  />

                  <Select
                    label="Price List"
                    name="priceList"
                    value={form.priceList}
                    onChange={handleChange}
                    options={priceListOptions}
                  />
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
                    Credit terms. Opening balance is locked after creation.
                  </small>
                </span>
              </span>

              <ChevronDown size={19} />
            </button>

            {showCreditDetails && (
              <div className="customer-create-expand-body">
                <div className="customer-create-fields-grid customer-create-credit-grid">
                  <Input
                    label="Payment Terms"
                    name="paymentTerms"
                    value={form.paymentTerms}
                    onChange={handleChange}
                    placeholder="Due on Receipt"
                  />

                  <Input
                    label="Credit Days"
                    name="creditDays"
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={form.creditDays}
                    onChange={handleChange}
                  />

                  <Input
                    label="Credit Limit (₹)"
                    name="creditLimit"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={form.creditLimit}
                    onChange={handleChange}
                  />

                  <Input
                    label="Opening Balance (₹)"
                    name="openingBalance"
                    type="number"
                    value={form.openingBalance}
                    onChange={handleChange}
                    disabled
                  />

                  <Select
                    label="Opening Balance Type"
                    name="openingBalanceType"
                    value={form.openingBalanceType}
                    onChange={handleChange}
                    options={openingBalanceTypeOptions}
                    disabled
                  />
                </div>

                <small className="customer-create-footer-note">
                  <Lock size={13} /> Opening balance is posted to the customer
                  ledger when the customer is created and cannot be edited here.
                </small>
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
                <Textarea
                  label="Notes"
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Add payment preferences, internal instructions, or any helpful context."
                  rows={4}
                />
              </div>
            )}
          </section>

          <footer className="customer-create-footer">
            <div className="customer-create-footer-note">
              <Lock size={16} />

              <span>
                Customer code and opening balance cannot be changed after
                creation.
              </span>
            </div>

            <div className="customer-create-footer-actions">
              <button
                type="button"
                className="customer-create-clear-button"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="customer-create-save-button"
                disabled={saving}
              >
                <Save size={15} />

                <span>{saving ? "Saving..." : "Save Changes"}</span>
              </button>
            </div>
          </footer>
        </form>
      </main>
    </div>
  );
}

export default CustomerEdit;