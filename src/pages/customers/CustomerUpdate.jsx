import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  BadgeIndianRupee,
  Building2,
  Check,
  ChevronDown,
  ClipboardList,
  FileText,
  MapPin,
  Phone,
  Save,
  UserRound,
  X,
} from "lucide-react";

import toast from "react-hot-toast";

import "../../styles/customer-create.css";
import api from "../../services/api";

import Input from "../../components/common/Form/Input";
import Select from "../../components/common/Form/Select";
import Textarea from "../../components/common/Form/Textarea";
import routes from "../../config/routes";

const INITIAL_FORM = {
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

const cleanText = (value) => String(value ?? "").trim();

const createInitialForm = () => ({ ...INITIAL_FORM });

const getCustomerForm = (customer) => {
  const nextForm = createInitialForm();

  for (const key of Object.keys(INITIAL_FORM)) {
    nextForm[key] = customer?.[key] ?? INITIAL_FORM[key];
  }

  return nextForm;
};

const getApiErrorMessages = (apiError) => {
  const responseData = apiError?.response?.data;

  if (Array.isArray(responseData?.errors) && responseData.errors.length > 0) {
    return responseData.errors.map((item) => {
      if (typeof item === "string") {
        return item;
      }

      return item?.message || item?.msg || String(item);
    });
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

const getFormDisplayState = (nextForm) => ({
  sameAsBilling:
    Boolean(nextForm.billingAddress) &&
    nextForm.billingAddress === nextForm.shippingAddress,

  businessDetails: Boolean(
    nextForm.gstNo ||
    nextForm.panNo ||
    nextForm.priceList !== INITIAL_FORM.priceList,
  ),

  creditDetails: Boolean(
    Number(nextForm.creditLimit) ||
    Number(nextForm.creditDays) ||
    Number(nextForm.openingBalance) ||
    nextForm.openingBalanceType !== INITIAL_FORM.openingBalanceType ||
    nextForm.paymentTerms !== INITIAL_FORM.paymentTerms,
  ),

  notes: Boolean(nextForm.notes),
});

function CustomerUpdate() {
  const params = useParams();

  // Your configured route is /customers/edit/:id.
  // Also supports :customerCode if used by another registered route.
  const customerCode = cleanText(params.id || params.customerCode);
  const navigate = useNavigate();
  const [form, setForm] = useState(createInitialForm);
  const [originalForm, setOriginalForm] = useState(null);

  const [sameAsBilling, setSameAsBilling] = useState(false);

  const [showBusinessDetails, setShowBusinessDetails] = useState(false);

  const [showCreditDetails, setShowCreditDetails] = useState(false);

  const [showNotes, setShowNotes] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);

  const [loadedCustomerCode, setLoadedCustomerCode] = useState(null);

  const [reloadKey, setReloadKey] = useState(0);

  const submitLock = useRef(false);

  const customerLoaded =
    Boolean(originalForm) && loadedCustomerCode === customerCode;

  const formDisabled = loading || saving || !customerLoaded;

  const applyForm = (nextForm) => {
    const displayState = getFormDisplayState(nextForm);

    setForm({ ...nextForm });
    setOriginalForm({ ...nextForm });

    setSameAsBilling(displayState.sameAsBilling);
    setShowBusinessDetails(displayState.businessDetails);
    setShowCreditDetails(displayState.creditDetails);
    setShowNotes(displayState.notes);
  };

  useEffect(() => {
    let cancelled = false;

    const loadCustomer = async () => {
      setLoading(true);
      setErrors([]);
      setLoadedCustomerCode(null);
      setOriginalForm(null);
      setForm(createInitialForm());

      if (!customerCode) {
        setErrors([
          "Customer code is missing. Check that the registered edit route includes :id.",
        ]);
        setLoading(false);
        return;
      }

      try {
        const response = await api.customers.getByCode(customerCode);

        if (cancelled) {
          return;
        }

        const customer = response?.data?.customer;

        if (!customer) {
          throw new Error("Customer not found.");
        }

        const nextForm = getCustomerForm(customer);
        const displayState = getFormDisplayState(nextForm);

        setForm({ ...nextForm });
        setOriginalForm({ ...nextForm });

        setSameAsBilling(displayState.sameAsBilling);
        setShowBusinessDetails(displayState.businessDetails);
        setShowCreditDetails(displayState.creditDetails);
        setShowNotes(displayState.notes);

        setLoadedCustomerCode(customerCode);
      } catch (apiError) {
        if (cancelled) {
          return;
        }

        console.error("Customer load request failed:", apiError);

        const errorMessages = getApiErrorMessages(apiError);

        setErrors(errorMessages);
        toast.error(errorMessages[0]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadCustomer();

    return () => {
      cancelled = true;
    };
  }, [customerCode, reloadKey]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (
      formDisabled ||
      name === "openingBalance" ||
      name === "openingBalanceType"
    ) {
      return;
    }

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

    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleSameAsBilling = (checked) => {
    if (formDisabled) {
      return;
    }

    setSameAsBilling(checked);

    setForm((previous) => ({
      ...previous,
      shippingAddress: checked
        ? previous.billingAddress
        : previous.shippingAddress,
    }));
  };

  const resetForm = () => {
    if (formDisabled || !originalForm) {
      return;
    }

    applyForm(originalForm);
    setErrors([]);
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

    shippingAddress: cleanText(
      sameAsBilling ? form.billingAddress : form.shippingAddress,
    ),

    city: cleanText(form.city),
    state: cleanText(form.state),
    pincode: cleanText(form.pincode),
    country: cleanText(form.country) || "India",

    paymentTerms: cleanText(form.paymentTerms) || "Due on Receipt",

    creditLimit: form.creditLimit === "" ? 0 : Number(form.creditLimit),

    creditDays: form.creditDays === "" ? 0 : Number(form.creditDays),

    // Preserve existing values with your current backend validation.
    openingBalance: Number(originalForm?.openingBalance) || 0,

    openingBalanceType: originalForm?.openingBalanceType || "DEBIT",

    priceList: cleanText(form.priceList) || "Standard",

    status: form.status,

    notes: cleanText(form.notes),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (formDisabled || submitLock.current) {
      return;
    }

    setErrors([]);

    const payload = buildPayload();
    const validationErrors = [];

    if (payload.customerName.length < 2) {
      validationErrors.push(
        "Customer name must contain at least 2 characters.",
      );
    }

    if (payload.customerName.length > 200) {
      validationErrors.push("Customer name cannot exceed 200 characters.");
    }

    if (!Number.isFinite(payload.creditLimit) || payload.creditLimit < 0) {
      validationErrors.push(
        "Credit limit must be a valid non-negative number.",
      );
    }

    if (!Number.isInteger(payload.creditDays) || payload.creditDays < 0) {
      validationErrors.push("Credit days must be a non-negative whole number.");
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      toast.error(validationErrors[0]);
      return;
    }

    submitLock.current = true;

    try {
      setSaving(true);

      const response = await api.customers.update(customerCode, payload);

      const customer = response?.data?.customer;

      if (!customer) {
        throw new Error(
          "The update response did not include the customer. Reload to verify the saved details.",
        );
      }

      applyForm(getCustomerForm(customer));

      toast.success(
        `${customer.customerName} updated successfully (${
          customer.customerCode || customerCode
        })`,
      );

      navigate(routes.customers.list, {
        replace: true,
      });
    } catch (apiError) {
      console.error("Customer update request failed:", apiError);

      const errorMessages = getApiErrorMessages(apiError);

      setErrors(errorMessages);
      toast.error(errorMessages[0]);
    } finally {
      submitLock.current = false;
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
            <h1>Update Customer</h1>

            <p>
              Update customer details
              {customerCode ? ` (${customerCode})` : ""}.
            </p>
          </div>
        </div>

        <div className="customer-create-header-actions">
          <button
            type="button"
            className="customer-create-clear-button"
            onClick={resetForm}
            disabled={formDisabled}
          >
            <X size={15} />
            <span>Reset</span>
          </button>

          <button
            type="submit"
            form="customer-update-form"
            className="customer-create-save-button"
            disabled={formDisabled}
          >
            <Save size={15} />

            <span>{saving ? "Updating..." : "Update Customer"}</span>
          </button>
        </div>
      </header>

      <main className="customer-create-main">
        {loading && (
          <div
            className="customer-create-alert"
            role="status"
            aria-live="polite"
          >
            Loading customer details...
          </div>
        )}

        {errors.length > 0 && (
          <div
            className="customer-create-alert customer-create-alert-error"
            role="alert"
          >
            <div className="customer-create-alert-error-icon">!</div>

            <div>
              <strong>
                {customerLoaded
                  ? "Please review the form"
                  : "Unable to load customer"}
              </strong>

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

        {!loading && !customerLoaded && (
          <button
            type="button"
            className="customer-create-clear-button"
            onClick={() => setReloadKey((previous) => previous + 1)}
            style={{ marginBottom: 18 }}
          >
            Retry loading customer
          </button>
        )}

        <form
          id="customer-update-form"
          className="customer-create-form"
          onSubmit={handleSubmit}
          aria-busy={loading || saving}
        >
          <fieldset
            disabled={formDisabled}
            style={{
              border: 0,
              padding: 0,
              margin: 0,
              minWidth: 0,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "inherit",
            }}
          >
            <section className="customer-create-card customer-create-basics-card">
              <div className="customer-create-card-header">
                <div className="customer-create-section-icon">
                  <Building2 size={17} />
                </div>

                <div>
                  <h3>Basic details</h3>

                  <p>Required information for this customer.</p>
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
                        minLength={2}
                        maxLength={200}
                        required
                      />
                    </div>

                    <small>
                      This name appears in customer lists, invoices, and
                      reports.
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

                    <p>Optional, but useful for invoices and reminders.</p>
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

                    <p>Update billing and shipping information.</p>
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
                aria-controls="customer-update-business-details"
              >
                <span className="customer-create-expand-title">
                  <span className="customer-create-section-icon">
                    <FileText size={17} />
                  </span>

                  <span>
                    <strong>Tax & business details</strong>

                    <small>
                      GST, PAN, and price-list information for business
                      customers.
                    </small>
                  </span>
                </span>

                <ChevronDown size={19} />
              </button>

              {showBusinessDetails && (
                <div
                  id="customer-update-business-details"
                  className="customer-create-expand-body"
                >
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
                aria-controls="customer-update-credit-details"
              >
                <span className="customer-create-expand-title">
                  <span className="customer-create-section-icon">
                    <BadgeIndianRupee size={17} />
                  </span>

                  <span>
                    <strong>Credit & opening balance</strong>

                    <small>
                      Update credit settings and view the existing opening
                      balance.
                    </small>
                  </span>
                </span>

                <ChevronDown size={19} />
              </button>

              {showCreditDetails && (
                <div
                  id="customer-update-credit-details"
                  className="customer-create-expand-body"
                >
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
                      step="1"
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
                      min="0"
                      step="0.01"
                      inputMode="decimal"
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

                    <div className="customer-create-field customer-create-full-field">
                      <small>
                        Opening balance is read-only here because this update
                        flow does not adjust the linked ledger’s opening or
                        current balance.
                      </small>
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
                aria-controls="customer-update-notes"
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
                <div
                  id="customer-update-notes"
                  className="customer-create-expand-body customer-create-notes-body"
                >
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
                <UserRound size={16} />

                <span>
                  Update customer information. Reset restores the last loaded or
                  successfully saved details.
                </span>
              </div>

              <div className="customer-create-footer-actions">
                <button
                  type="button"
                  className="customer-create-clear-button"
                  onClick={resetForm}
                  disabled={formDisabled}
                >
                  Reset changes
                </button>

                <button
                  type="submit"
                  className="customer-create-save-button"
                  disabled={formDisabled}
                >
                  <Save size={15} />

                  <span>{saving ? "Updating..." : "Update Customer"}</span>
                </button>
              </div>
            </footer>
          </fieldset>
        </form>
      </main>
    </div>
  );
}

export default CustomerUpdate;
