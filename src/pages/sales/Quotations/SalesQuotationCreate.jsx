import { useEffect, useMemo, useRef, useState } from "react";

import { useNavigate, useSearchParams } from "react-router-dom";

import { ArrowLeft, FileText, Plus, Save, Trash2 } from "lucide-react";

import toast from "react-hot-toast";

import api from "../../../services/api";

import routes, { buildRoute } from "../../../config/routes";

import Input from "../../../components/common/Form/Input";
import Select from "../../../components/common/Form/Select";
import Textarea from "../../../components/common/Form/Textarea";
import Button from "../../../components/common/Form/Button";

import "../../../styles/invoice-common1.css";

const customerApi = api.customers || api.customer;
const productApi = api.products || api.product;
const quotationApi = api.salesQuotations;

const GST_RATES = [0, 3, 5, 12, 18, 28];

const TAX_OPTIONS = [
  { value: "NONE", label: "No GST" },
  { value: "INTRA_STATE", label: "CGST + SGST" },
  { value: "INTER_STATE", label: "IGST" },
];

const NUMBER_COLUMNS = [
  {
    field: "quantity",
    label: "Quantity",
    min: "0.001",
    max: "1000000",
    step: "0.001",
  },
  {
    field: "unitRate",
    label: "Offered Price/Item (₹)",
    min: "0",
    step: "0.01",
  },
  {
    field: "discountPercent",
    label: "Discount %",
    min: "0",
    max: "100",
    step: "0.01",
  },
];

const EMPTY_TOTALS = {
  gross: 0,
  discount: 0,
  taxable: 0,
  cgst: 0,
  sgst: 0,
  igst: 0,
  total: 0,
};

const formatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatPaise = (value) => formatter.format(value / 100);

const isObjectId = (value) =>
  typeof value === "string" && /^[a-fA-F0-9]{24}$/.test(value);

const localDate = () => {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
};

const addDays = (value, days) => {
  const date = new Date(`${value}T00:00:00.000Z`);

  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
};

const validDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
};

const initialForm = () => {
  const today = localDate();

  return {
    customerId: "",
    quotationDate: today,
    validUntil: addDays(today, 15),
    expectedDeliveryDate: "",
    enquiryReference: "",
    paymentTerms: "Due on Receipt",
    deliveryTerms: "",
    taxMode: "NONE",
    notes: "",
    termsAndConditions: "",
  };
};

let rowCounter = 0;

const newItem = () => ({
  rowId: `quotation-item-${++rowCounter}`,
  productId: "",
  specification: "",
  quantity: "1",
  unitRate: "0",
  discountPercent: "0",
  gstRate: 0,
});

const optionalText = (value) => String(value ?? "").trim() || null;

const formSnapshot = (form, items) =>
  JSON.stringify({
    form,
    items: items.map(({ rowId, ...item }) => item),
  });

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

const extractList = (response, key) => {
  const body = response?.data;

  if (body?.success === false) {
    throw new Error(body.message || `Unable to load ${key}`);
  }

  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.[key])) return body[key];
  if (Array.isArray(body)) return body;

  throw new Error(`Invalid ${key} list response.`);
};

const loadAllPages = async (service, key) => {
  if (typeof service?.getAll !== "function") {
    throw new Error(`Configure the ${key} service with a getAll method.`);
  }

  const first = await service.getAll({
    page: 1,
    limit: 100,
  });

  const records = [...extractList(first, key)];

  const pages = Math.max(1, Number(first.data?.pagination?.totalPages) || 1);

  for (let page = 2; page <= pages; page += 1) {
    const response = await service.getAll({
      page,
      limit: 100,
    });

    records.push(...extractList(response, key));
  }

  return Array.from(
    new Map(records.map((record) => [String(record._id), record])).values(),
  );
};

const scaledInteger = (value, scale) => {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }

  const number = Number(value);
  const scaled = number * scale;
  const rounded = Math.round(scaled);

  if (
    !Number.isFinite(number) ||
    number < 0 ||
    !Number.isSafeInteger(rounded) ||
    Math.abs(scaled - rounded) > 0.000001
  ) {
    return null;
  }

  return rounded;
};

const multiplyDivide = (first, second, divisor) => {
  const denominator = BigInt(divisor);

  const result = Number(
    (BigInt(first) * BigInt(second) + denominator / 2n) / denominator,
  );

  if (!Number.isSafeInteger(result)) {
    throw new Error("Amount exceeds the supported range.");
  }

  return result;
};

const calculatePreview = (item, taxMode) => {
  const invalid = {
    ...EMPTY_TOTALS,
    valid: false,
  };

  const quantity = scaledInteger(item.quantity, 1000);
  const rate = scaledInteger(item.unitRate, 100);
  const discount = scaledInteger(item.discountPercent, 100);

  const gstRate = taxMode === "NONE" ? 0 : Number(item.gstRate);

  if (
    !item.productId ||
    quantity === null ||
    quantity < 1 ||
    quantity > 1000000000 ||
    rate === null ||
    discount === null ||
    discount > 10000 ||
    !GST_RATES.includes(gstRate)
  ) {
    return invalid;
  }

  /*
   * Retained to match the quotation backend you shared.
   * Remove this restriction only when its matching
   * backend validation/service restriction is corrected.
   */
  if (taxMode === "INTRA_STATE" && gstRate !== 0 && gstRate % 2 !== 0) {
    return invalid;
  }

  try {
    const gross = multiplyDivide(rate, quantity, 1000);

    const discountAmount = multiplyDivide(gross, discount, 10000);

    const taxable = gross - discountAmount;

    const tax = multiplyDivide(taxable, gstRate, 100);

    const cgst = taxMode === "INTRA_STATE" ? Math.floor(tax / 2) : 0;

    const sgst = taxMode === "INTRA_STATE" ? tax - cgst : 0;

    const igst = taxMode === "INTER_STATE" ? tax : 0;

    const total = taxable + cgst + sgst + igst;

    if (!Number.isSafeInteger(total)) {
      return invalid;
    }

    return {
      valid: true,
      gross,
      discount: discountAmount,
      taxable,
      cgst,
      sgst,
      igst,
      total,
    };
  } catch {
    return invalid;
  }
};

function SalesQuotationCreate({ listPath = routes.sales.quotations }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const comparisonGroupId = searchParams.get("comparisonGroupId") || "";

  const addingToComparison = Boolean(comparisonGroupId);

  const invalidComparisonGroup =
    addingToComparison && !isObjectId(comparisonGroupId);

  const [form, setForm] = useState(initialForm);
  const [items, setItems] = useState(() => [newItem()]);

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);

  const [uncertainResult, setUncertainResult] = useState(false);

  const [savedQuotation, setSavedQuotation] = useState(null);

  const mountedRef = useRef(false);
  const submitLock = useRef(false);
  const savedRef = useRef(false);

  const initialSnapshot = useRef(formSnapshot(form, items));

  const disabled =
    loading ||
    loadFailed ||
    saving ||
    uncertainResult ||
    Boolean(savedQuotation) ||
    invalidComparisonGroup;

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadOptions = async () => {
      setLoading(true);
      setLoadFailed(false);
      setErrors([]);

      try {
        const [customerRecords, productRecords] = await Promise.all([
          loadAllPages(customerApi, "customers"),

          loadAllPages(productApi, "products"),
        ]);

        if (cancelled) return;

        setCustomers(
          customerRecords.filter(
            (customer) => customer.status === "Active" && !customer.isDeleted,
          ),
        );

        setProducts(
          productRecords.filter(
            (product) => product.status === "ACTIVE" && !product.isDeleted,
          ),
        );
      } catch (error) {
        if (cancelled) return;

        const messages = getErrors(error);

        setErrors(messages);
        setLoadFailed(true);
        toast.error(messages[0]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const selectedCustomer = useMemo(
    () =>
      customers.find((customer) => String(customer._id) === form.customerId),
    [customers, form.customerId],
  );

  const productMap = useMemo(
    () => new Map(products.map((product) => [String(product._id), product])),
    [products],
  );

  const productOptions = useMemo(
    () =>
      products.map((product) => ({
        value: String(product._id),

        label: `${product.name} ` + `(${product.productCode})`,
      })),
    [products],
  );

  const previews = useMemo(
    () => items.map((item) => calculatePreview(item, form.taxMode)),
    [items, form.taxMode],
  );

  const totals = useMemo(() => {
    const result = { ...EMPTY_TOTALS };

    for (const preview of previews) {
      for (const key of Object.keys(EMPTY_TOTALS)) {
        result[key] += preview[key];
      }
    }

    return result;
  }, [previews]);

  const isDirty = formSnapshot(form, items) !== initialSnapshot.current;

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (savedRef.current) return;

      if (!isDirty && !saving && !uncertainResult) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty, saving, uncertainResult]);

  const getComparisonPath = (groupId) => {
    if (!isObjectId(String(groupId || ""))) {
      throw new Error("The saved quotation has no valid comparison group.");
    }

    if (!routes.sales.compareQuotations) {
      throw new Error("Configure routes.sales.compareQuotations.");
    }

    return buildRoute(routes.sales.compareQuotations, {
      comparisonGroupId: encodeURIComponent(String(groupId)),
    });
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors([]);
  };

  const handleCustomerChange = (event) => {
    const customerId = event.target.value;

    const customer = customers.find(
      (record) => String(record._id) === customerId,
    );

    setForm((previous) => ({
      ...previous,
      customerId: customer ? String(customer._id) : "",

      paymentTerms: customer?.paymentTerms || "Due on Receipt",
    }));

    setErrors([]);
  };

  const handleTaxModeChange = (event) => {
    const taxMode = event.target.value;

    setForm((previous) => ({
      ...previous,
      taxMode,
    }));

    setItems((previous) =>
      previous.map((item) => ({
        ...item,

        gstRate:
          taxMode === "NONE"
            ? 0
            : (productMap.get(item.productId)?.gstRate ?? 0),
      })),
    );

    setErrors([]);
  };

  const updateItem = (rowId, field, value) => {
    setItems((previous) =>
      previous.map((item) =>
        item.rowId === rowId
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );

    setErrors([]);
  };

  const selectProduct = (rowId, productId) => {
    const product = productMap.get(productId);

    setItems((previous) =>
      previous.map((item) =>
        item.rowId === rowId
          ? {
              ...item,
              productId,
              specification: "",
              unitRate: "0",

              gstRate: form.taxMode === "NONE" ? 0 : (product?.gstRate ?? 0),
            }
          : item,
      ),
    );

    setErrors([]);
  };

  const addItem = () => {
    if (disabled || items.length >= 200) {
      return;
    }

    setItems((previous) => [...previous, newItem()]);

    setErrors([]);
  };

  const removeItem = (rowId) => {
    if (disabled || items.length <= 1) {
      return;
    }

    setItems((previous) => previous.filter((item) => item.rowId !== rowId));

    setErrors([]);
  };

  const validateForm = () => {
    const messages = [];

    if (invalidComparisonGroup) {
      messages.push(
        "Invalid comparison group. Open the comparison page again.",
      );
    }

    if (!routes.sales.compareQuotations) {
      messages.push("Configure the quotation comparison route before saving.");
    }

    if (!selectedCustomer) {
      messages.push("Select an active customer.");
    }

    if (!validDate(form.quotationDate) || !validDate(form.validUntil)) {
      messages.push("Valid quotation and offer-validity dates are required.");
    } else if (form.validUntil < form.quotationDate) {
      messages.push("Offer validity cannot be before quotation date.");
    }

    if (form.expectedDeliveryDate) {
      if (!validDate(form.expectedDeliveryDate)) {
        messages.push("Expected delivery date is invalid.");
      } else if (form.expectedDeliveryDate < form.quotationDate) {
        messages.push("Expected delivery cannot be before quotation date.");
      }
    }

    if (!form.paymentTerms.trim()) {
      messages.push("Payment terms are required.");
    }

    if (!TAX_OPTIONS.some((option) => option.value === form.taxMode)) {
      messages.push("Select a valid tax treatment.");
    }

    if (!items.length || items.length > 200) {
      messages.push("Add between 1 and 200 items.");
    }

    items.forEach((item, index) => {
      const product = productMap.get(item.productId);

      const label = `Item ${index + 1}`;

      if (!product) {
        messages.push(`${label}: select an active product.`);
        return;
      }

      if (
        !product.productCode ||
        !product.name ||
        !["GOODS", "SERVICE"].includes(product.type) ||
        !product.unit
      ) {
        messages.push(`${label}: product details are incomplete.`);
      }

      if (!previews[index]?.valid) {
        messages.push(
          `${label}: check quantity, offered price, discount, and GST.`,
        );
      }

      if (form.taxMode === "INTRA_STATE" && Number(item.gstRate) === 3) {
        messages.push(
          `${label}: the current backend rejects 3% intra-state GST.`,
        );
      }

      if (item.specification.trim().length > 1000) {
        messages.push(
          `${label}: specification cannot exceed 1,000 characters.`,
        );
      }
    });

    const textLimits = [
      ["enquiryReference", 100, "Enquiry reference"],
      ["paymentTerms", 100, "Payment terms"],
      ["deliveryTerms", 1000, "Delivery terms"],
      ["notes", 1000, "Notes"],
      ["termsAndConditions", 5000, "Terms and conditions"],
    ];

    for (const [field, maxLength, label] of textLimits) {
      if (form[field].trim().length > maxLength) {
        messages.push(`${label} cannot exceed ${maxLength} characters.`);
      }
    }

    if (
      Object.values(totals).some(
        (amount) => !Number.isSafeInteger(amount) || amount < 0,
      )
    ) {
      messages.push("Quotation amounts exceed the supported range.");
    }

    return [...new Set(messages)];
  };

  const saveQuotation = async () => {
    if (disabled || submitLock.current || savedRef.current) {
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

    let requestStarted = false;

    try {
      if (typeof quotationApi?.create !== "function") {
        throw new Error("Configure api.salesQuotations.create first.");
      }

      const payload = {
        customerId: form.customerId,

        ...(addingToComparison ? { comparisonGroupId } : {}),

        quotationDate: form.quotationDate,

        validUntil: form.validUntil,

        expectedDeliveryDate: form.expectedDeliveryDate || null,

        enquiryReference: optionalText(form.enquiryReference),

        paymentTerms: form.paymentTerms.trim(),

        deliveryTerms: optionalText(form.deliveryTerms),

        taxMode: form.taxMode,

        items: items.map((item) => {
          const product = productMap.get(item.productId);

          return {
            productId: product._id,
            productCode: product.productCode,
            productName: product.name,
            productType: product.type,
            unit: product.unit,

            hsnSacCode: product.hsnSacCode || null,

            specification: optionalText(item.specification),

            quantity: Number(item.quantity),

            unitRatePaise: scaledInteger(item.unitRate, 100),

            discountPercent: Number(item.discountPercent),

            gstRate: form.taxMode === "NONE" ? 0 : Number(item.gstRate),
          };
        }),

        notes: optionalText(form.notes),

        termsAndConditions: optionalText(form.termsAndConditions),
      };

      requestStarted = true;

      const response = await quotationApi.create(payload);

      const quotation = response?.data?.data;

      if (
        response?.data?.success !== true ||
        !quotation?._id ||
        !quotation.quotationNumber
      ) {
        const error = new Error(
          response?.data?.message ||
            "The server did not return a valid quotation. Check the quotation list before submitting again.",
        );

        error.uncertainResult = true;
        throw error;
      }

      /*
       * The create request succeeded.
       * Never create another record because navigation
       * or the comparison-group response is invalid.
       */
      savedRef.current = true;

      if (!mountedRef.current) {
        return;
      }

      setSavedQuotation(quotation);

      toast.success(
        `${quotation.quotationNumber} customer offer saved successfully`,
      );

      const returnedGroupId = String(quotation.comparisonGroupId || "");

      if (
        !isObjectId(returnedGroupId) ||
        (addingToComparison &&
          returnedGroupId.toLowerCase() !== comparisonGroupId.toLowerCase())
      ) {
        setErrors([
          "The offer was saved, but the server returned a missing or different comparison group. Check the quotation list; do not save it again.",
        ]);

        return;
      }

      navigate(getComparisonPath(returnedGroupId), { replace: true });
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }

      const status = error?.response?.status;

      if (
        !savedRef.current &&
        requestStarted &&
        (error.uncertainResult || !status || status >= 500 || status === 408)
      ) {
        setUncertainResult(true);
      }

      const messages = getErrors(error);

      setErrors(messages);
      toast.error(messages[0]);
    } finally {
      submitLock.current = false;

      if (mountedRef.current) {
        setSaving(false);
      }
    }
  };

  const exitPage = () => {
    if (saving) return;

    if (savedRef.current) {
      navigate(listPath);
      return;
    }

    const message = uncertainResult
      ? "The offer may already have been saved. Open the quotation list and verify it?"
      : "Discard this customer offer and leave?";

    if ((isDirty || uncertainResult) && !window.confirm(message)) {
      return;
    }

    if (!uncertainResult && addingToComparison && !invalidComparisonGroup) {
      try {
        navigate(getComparisonPath(comparisonGroupId));

        return;
      } catch {
        // Fall back to the quotation list.
      }
    }

    navigate(listPath);
  };

  const saveButton = (
    <Button
      type="button"
      icon={Save}
      loading={saving}
      disabled={disabled}
      onClick={saveQuotation}
    >
      Save & Compare
    </Button>
  );

  return (
    <div className="doc-page">
      <form noValidate onSubmit={(event) => event.preventDefault()}>
        <header className="doc-header">
          <div className="doc-header-left">
            <Button
              type="button"
              variant="secondary"
              icon={ArrowLeft}
              disabled={saving}
              onClick={exitPage}
            >
              Exit
            </Button>

            <div className="doc-title">
              <FileText size={18} />

              <span>
                {addingToComparison
                  ? "Add Customer Offer"
                  : "Create Customer Quotation"}
              </span>
            </div>
          </div>

          <div className="doc-header-actions">{saveButton}</div>
        </header>

        <div className="doc-alerts">
          <div className="doc-alert">
            {addingToComparison
              ? "This customer offer will be added to the existing comparison."
              : "This offer starts a new comparison. After saving, use Add Customer Offer on the comparison page to record another customer's price."}
          </div>

          {invalidComparisonGroup && (
            <div className="doc-alert doc-alert-error" role="alert">
              Invalid comparison group. Return to the quotation list and open
              the comparison again.
            </div>
          )}

          {loading && (
            <div className="doc-alert" role="status">
              Loading customers and products...
            </div>
          )}

          {errors.length > 0 && (
            <div className="doc-alert doc-alert-error" role="alert">
              <strong>Please review the following</strong>

              <ul>
                {errors.map((message, index) => (
                  <li key={`${index}-${message}`}>{message}</li>
                ))}
              </ul>

              {loadFailed && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={loading}
                  onClick={() => setReloadKey((value) => value + 1)}
                >
                  Retry Loading
                </Button>
              )}
            </div>
          )}

          {uncertainResult && (
            <div className="doc-alert" role="alert">
              The save result is uncertain. Submission is locked to avoid
              duplicate offers.
              <Button type="button" variant="secondary" onClick={exitPage}>
                Check Quotations
              </Button>
            </div>
          )}

          {savedQuotation && (
            <div className="doc-alert" role="status">
              {savedQuotation.quotationNumber} was saved. Submission is locked
              to avoid creating it again.
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate(listPath)}
              >
                Open Quotations
              </Button>
            </div>
          )}
        </div>

        <fieldset className="doc-fieldset" disabled={disabled}>
          <main className="doc-main">
            <section className="doc-top">
              <div className="doc-panel doc-party-panel">
                <h2 className="doc-panel-title">Customer Offer</h2>

                <Select
                  label="Customer"
                  name="customerId"
                  value={form.customerId}
                  placeholder="Select customer"
                  options={customers.map((customer) => ({
                    value: String(customer._id),

                    label:
                      `${customer.customerName} ` +
                      `(${customer.customerCode})`,
                  }))}
                  onChange={handleCustomerChange}
                  required
                />

                {selectedCustomer && (
                  <div className="doc-party-card">
                    <div className="doc-avatar">
                      {selectedCustomer.customerName?.charAt(0).toUpperCase() ||
                        "C"}
                    </div>

                    <div className="doc-party-copy">
                      <h3>{selectedCustomer.customerName}</h3>

                      <p>{selectedCustomer.customerCode}</p>

                      <p>
                        <span>Billing:</span>{" "}
                        {selectedCustomer.billingAddress || "Not provided"}
                      </p>

                      <p>
                        <span>Shipping:</span>{" "}
                        {selectedCustomer.shippingAddress || "Not provided"}
                      </p>

                      <p>
                        <span>GSTIN:</span>{" "}
                        {selectedCustomer.gstNo || "Not provided"}
                      </p>
                    </div>
                  </div>
                )}

                <p className="doc-note">
                  Enter the prices and terms communicated by this customer over
                  the phone.
                </p>
              </div>

              <div className="doc-panel">
                <h2 className="doc-panel-title">Offer Details</h2>

                <div className="doc-fields-grid">
                  <Input
                    label="Quotation Number"
                    name="quotationNumber"
                    value="Generated after saving"
                    readOnly
                  />

                  <Input
                    label="Enquiry / Requirement Reference"
                    name="enquiryReference"
                    value={form.enquiryReference}
                    onChange={handleFieldChange}
                    maxLength={100}
                    placeholder="Requirement or call reference"
                  />

                  <Input
                    label="Quotation Date"
                    name="quotationDate"
                    type="date"
                    value={form.quotationDate}
                    onChange={handleFieldChange}
                    required
                  />

                  <Input
                    label="Offer Valid Until"
                    name="validUntil"
                    type="date"
                    value={form.validUntil}
                    min={form.quotationDate}
                    onChange={handleFieldChange}
                    required
                  />

                  <Input
                    label="Expected Delivery"
                    name="expectedDeliveryDate"
                    type="date"
                    value={form.expectedDeliveryDate}
                    min={form.quotationDate}
                    onChange={handleFieldChange}
                  />

                  <Input
                    label="Payment Terms"
                    name="paymentTerms"
                    value={form.paymentTerms}
                    onChange={handleFieldChange}
                    maxLength={100}
                    required
                  />

                  <Select
                    label="Tax Treatment"
                    name="taxMode"
                    value={form.taxMode}
                    options={TAX_OPTIONS}
                    onChange={handleTaxModeChange}
                  />
                </div>

                <p className="doc-note">
                  The enquiry reference is descriptive. Offers are grouped by
                  the comparison link, not automatically by matching reference
                  text.
                </p>
              </div>
            </section>

            <section className="doc-items">
              <div className="doc-table-wrap">
                <table className="doc-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Items</th>
                      <th>HSN / SAC</th>
                      <th>Qty</th>
                      <th>Offered Price/Item (₹)</th>
                      <th>Discount %</th>
                      <th>GST</th>
                      <th>Amount</th>

                      <th>
                        <span className="doc-sr-only">Remove</span>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {items.map((item, index) => {
                      const product = productMap.get(item.productId);

                      return (
                        <tr key={item.rowId}>
                          <td data-label="No." className="doc-cell-no">
                            {index + 1}
                          </td>

                          <td data-label="Item" className="doc-cell-item">
                            <Select
                              name={`product-${item.rowId}`}
                              aria-label={`Product ${index + 1}`}
                              value={item.productId}
                              placeholder="Select product"
                              options={productOptions}
                              onChange={(event) =>
                                selectProduct(item.rowId, event.target.value)
                              }
                            />

                            {product && (
                              <small className="doc-item-meta">
                                {product.unit}
                                {" · "}
                                {product.type}
                              </small>
                            )}

                            <Input
                              name={`specification-${item.rowId}`}
                              aria-label={`Specification ${index + 1}`}
                              value={item.specification}
                              maxLength={1000}
                              placeholder="Specification (optional)"
                              onChange={(event) =>
                                updateItem(
                                  item.rowId,
                                  "specification",
                                  event.target.value,
                                )
                              }
                            />
                          </td>

                          <td data-label="HSN / SAC" className="doc-cell-hsn">
                            {product?.hsnSacCode || "—"}
                          </td>

                          {NUMBER_COLUMNS.map((column) => (
                            <td key={column.field} data-label={column.label}>
                              <Input
                                name={`${column.field}-${item.rowId}`}
                                aria-label={`${column.label} ${index + 1}`}
                                type="number"
                                inputMode="decimal"
                                min={column.min}
                                max={column.max}
                                step={column.step}
                                value={item[column.field]}
                                onChange={(event) =>
                                  updateItem(
                                    item.rowId,
                                    column.field,
                                    event.target.value,
                                  )
                                }
                              />
                            </td>
                          ))}

                          <td data-label="GST">
                            <Select
                              name={`gst-${item.rowId}`}
                              aria-label={`GST ${index + 1}`}
                              value={item.gstRate}
                              disabled={form.taxMode === "NONE"}
                              options={GST_RATES.map((rate) => ({
                                value: rate,

                                label: `${rate}%`,
                              }))}
                              onChange={(event) =>
                                updateItem(
                                  item.rowId,
                                  "gstRate",
                                  Number(event.target.value),
                                )
                              }
                            />
                          </td>

                          <td data-label="Amount" className="doc-cell-amount">
                            {previews[index].valid
                              ? formatPaise(previews[index].total)
                              : "—"}
                          </td>

                          <td data-label="Remove" className="doc-cell-action">
                            <button
                              type="button"
                              className="doc-remove-button"
                              aria-label={`Remove item ${index + 1}`}
                              disabled={items.length === 1}
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
                  disabled={items.length >= 200}
                  onClick={addItem}
                >
                  <Plus size={15} />
                  Add Item
                </button>
              </div>
            </section>

            <section className="doc-bottom">
              <div className="doc-extras">
                <Textarea
                  label="Delivery Terms"
                  name="deliveryTerms"
                  value={form.deliveryTerms}
                  onChange={handleFieldChange}
                  maxLength={1000}
                  rows={2}
                  placeholder="Delivery arrangements discussed during the call..."
                />

                <Textarea
                  label="Call Notes"
                  name="notes"
                  value={form.notes}
                  onChange={handleFieldChange}
                  maxLength={1000}
                  rows={3}
                  placeholder="Customer's offered price, discussion notes, or conditions..."
                />

                <Textarea
                  label="Terms and Conditions"
                  name="termsAndConditions"
                  value={form.termsAndConditions}
                  onChange={handleFieldChange}
                  maxLength={5000}
                  rows={4}
                  placeholder="Other agreed or proposed terms..."
                />

                <p className="doc-note">
                  Saving records the customer's offer as a draft. The admin can
                  compare offers and select one to create a Sales Order. No
                  customer login or approval is required.
                </p>
              </div>

              <div className="doc-summary">
                {[
                  ["Gross Amount", totals.gross],
                  ["Line Discounts", -totals.discount],
                  ["Taxable Amount", totals.taxable],

                  ...(form.taxMode === "INTRA_STATE"
                    ? [
                        ["CGST", totals.cgst],
                        ["SGST", totals.sgst],
                      ]
                    : []),

                  ...(form.taxMode === "INTER_STATE"
                    ? [["IGST", totals.igst]]
                    : []),
                ].map(([label, amount]) => (
                  <div className="doc-summary-row" key={label}>
                    <span>{label}</span>

                    <strong>{formatPaise(amount)}</strong>
                  </div>
                ))}

                <div className="doc-summary-total">
                  <span>Total Offer:</span>

                  <strong>{formatPaise(totals.total)}</strong>
                </div>

                <p className="doc-note">
                  Preview only. The server calculates final totals. Incomplete
                  lines are excluded from this preview.
                </p>
              </div>
            </section>
          </main>
        </fieldset>

        <div className="doc-mobile-bar">
          <div className="doc-mobile-total">
            <span>Total Offer</span>

            <strong>{formatPaise(totals.total)}</strong>
          </div>

          <div className="doc-mobile-actions">{saveButton}</div>
        </div>
      </form>
    </div>
  );
}

export default SalesQuotationCreate;
