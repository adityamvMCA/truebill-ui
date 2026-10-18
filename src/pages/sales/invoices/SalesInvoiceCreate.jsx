import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  ArrowLeft,
  ChevronDown,
  FileText,
  Plus,
  Save,
  Send,
  StickyNote,
  Trash2,
} from "lucide-react";

import toast from "react-hot-toast";

import ConfirmModal from "../../../components/common/ConfirmModal/ConfirmModal";

import api from "../../../services/api";
import salesInvoiceApi from "../../../services/modules/salesInvoiceApi";

import Input from "../../../components/common/Form/Input";
import Select from "../../../components/common/Form/Select";
import Textarea from "../../../components/common/Form/Textarea";
import Button from "../../../components/common/Form/Button";
import StatusField from "../../../components/common/StatusField/StatusField";

import {
  SALES_PATHS,
  GST_RATES,
  TAX_OPTIONS,
  EMPTY_TOTALS,
  addDays,
  calculatePreview,
  formatPaise,
  getErrors,
  inputDate,
  itemSnapshot,
  loadAllPages,
  localDate,
  useTenantRevision,
} from "./salesInvoiceUtils";

import "../../../styles/invoice-common1.css";

const customerApi = api.customers || api.customer;
const productApi = api.products || api.product;

let rowCounter = 0;

const newItem = () => ({
  rowId: `sales-item-${++rowCounter}`,
  productId: "",
  quantity: "1",
  unitRate: "0",
  discountPercent: "0",
  gstRate: 0,
});

const initialForm = () => {
  const date = localDate();

  return {
    customerId: "",
    invoiceDate: date,
    dueDate: date,
    paymentTerms: "Due on Receipt",
    taxMode: "NONE",
    updateStock: false,
    notes: "",
  };
};

function SalesInvoiceForm({ mode, invoiceNumber }) {
  const navigate = useNavigate();

  const viewing = mode === "view";
  const editing = mode === "edit";

  const [form, setForm] = useState(initialForm);
  const [items, setItems] = useState(() => [newItem()]);
  const [invoice, setInvoice] = useState(null);

  const [confirmation, setConfirmation] = useState("");

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [errors, setErrors] = useState([]);
  const [showNotes, setShowNotes] = useState(false);
  const [savingAction, setSavingAction] = useState("");
  const [uncertainResult, setUncertainResult] = useState(false);

  const submitLock = useRef(false);
  const alive = useRef(false);
  const initialSnapshot = useRef("");

  const saving = Boolean(savingAction);

  const disabled =
    loading ||
    loadFailed ||
    saving ||
    uncertainResult ||
    viewing;

  const formDisabled = disabled || Boolean(confirmation);

  useEffect(() => {
    alive.current = true;

    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadFailed(false);
      setErrors([]);

      try {
        if ((editing || viewing) && !invoiceNumber) {
          throw new Error("Invoice number is missing.");
        }

        let loadedInvoice = null;
        let customerRecords = [];
        let productRecords = [];

        if (viewing) {
          const response =
            await salesInvoiceApi.getByNumber(invoiceNumber);

          if (response?.data?.success !== true) {
            throw new Error(
              response?.data?.message ||
                "Unable to load sales invoice.",
            );
          }

          loadedInvoice = response.data.invoice;
        } else {
          const [
            loadedCustomers,
            loadedProducts,
            response,
          ] = await Promise.all([
            loadAllPages(customerApi, "customers"),
            loadAllPages(productApi, "products"),
            editing
              ? salesInvoiceApi.getByNumber(invoiceNumber)
              : Promise.resolve(null),
          ]);

          customerRecords = loadedCustomers.filter(
            (customer) =>
              customer.status === "Active" &&
              !customer.isDeleted,
          );

          productRecords = loadedProducts.filter(
            (product) =>
              product.status === "ACTIVE" &&
              !product.isDeleted,
          );

          if (
            editing &&
            response?.data?.success !== true
          ) {
            throw new Error(
              response?.data?.message ||
                "Unable to load sales invoice.",
            );
          }

          loadedInvoice = response?.data?.invoice || null;
        }

        if (cancelled) return;

        if (
          (viewing || editing) &&
          (
            !loadedInvoice?.invoiceNumber ||
            !Array.isArray(loadedInvoice.items)
          )
        ) {
          throw new Error("Unable to load sales invoice.");
        }

        if (
          editing &&
          loadedInvoice.status !== "DRAFT"
        ) {
          throw new Error(
            "Only draft sales invoices can be edited.",
          );
        }

        const nextForm = loadedInvoice
          ? {
              customerId: String(loadedInvoice.customerId),
              invoiceDate: inputDate(
                loadedInvoice.invoiceDate,
              ),
              dueDate: inputDate(loadedInvoice.dueDate),
              paymentTerms:
                loadedInvoice.paymentTerms ||
                "Due on Receipt",
              taxMode: loadedInvoice.taxMode,
              updateStock: Boolean(
                loadedInvoice.updateStock,
              ),
              notes: loadedInvoice.notes || "",
            }
          : initialForm();

        const nextItems = loadedInvoice
          ? loadedInvoice.items.map((item) => ({
              ...newItem(),
              productId: String(item.productId),
              quantity: String(item.quantity),
              unitRate: String(item.unitRatePaise / 100),
              discountPercent: String(
                item.discountPercent,
              ),
              gstRate: item.gstRate,
            }))
          : [newItem()];

        setInvoice(loadedInvoice);
        setCustomers(customerRecords);
        setProducts(productRecords);
        setForm(nextForm);
        setItems(nextItems);
        setShowNotes(Boolean(nextForm.notes));

        initialSnapshot.current = JSON.stringify({
          form: nextForm,
          items: itemSnapshot(nextItems),
        });
      } catch (error) {
        if (cancelled) return;

        const messages = getErrors(error);

        setErrors(messages);
        setLoadFailed(true);
        toast.error(messages[0]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [
    editing,
    viewing,
    invoiceNumber,
    reloadKey,
  ]);

  const selectedCustomer = useMemo(() => {
    const activeCustomer = customers.find(
      (customer) =>
        String(customer._id) === form.customerId,
    );

    if (activeCustomer) return activeCustomer;

    if (
      viewing &&
      invoice &&
      String(invoice.customerId) === form.customerId
    ) {
      return {
        _id: String(invoice.customerId),
        customerName: invoice.customerName,
        customerCode: invoice.customerCode,
        gstNo: invoice.customerGstNo,
      };
    }

    return null;
  }, [
    customers,
    form.customerId,
    viewing,
    invoice,
  ]);

  const customerOptions = useMemo(() => {
    const options = customers.map((customer) => ({
      value: String(customer._id),
      label:
        `${customer.customerName} ` +
        `(${customer.customerCode})`,
    }));

    if (
      invoice &&
      !options.some(
        (option) =>
          option.value === String(invoice.customerId),
      )
    ) {
      options.unshift({
        value: String(invoice.customerId),
        label:
          `${invoice.customerName} ` +
          `(${invoice.customerCode})`,
      });
    }

    return options;
  }, [customers, invoice]);

  const productMap = useMemo(() => {
    const map = new Map(
      products.map((product) => [
        String(product._id),
        product,
      ]),
    );

    if (viewing && invoice) {
      for (const item of invoice.items) {
        map.set(String(item.productId), {
          _id: String(item.productId),
          name: item.productName,
          productCode: item.productCode,
          unit: item.unit,
          type: item.productType,
          hsnSacCode: item.hsnSacCode,
          trackInventory: item.trackInventory,
        });
      }
    }

    return map;
  }, [products, viewing, invoice]);

  const previews = useMemo(
    () =>
      items.map((item, index) => {
        if (viewing && invoice?.items[index]) {
          const saved = invoice.items[index];

          return {
            valid: true,
            gross: saved.grossAmountPaise,
            discount: saved.discountAmountPaise,
            taxable: saved.taxableAmountPaise,
            cgst: saved.cgstAmountPaise,
            sgst: saved.sgstAmountPaise,
            igst: saved.igstAmountPaise,
            total: saved.totalAmountPaise,
          };
        }

        return calculatePreview(item, form.taxMode);
      }),
    [
      items,
      form.taxMode,
      viewing,
      invoice,
    ],
  );

  const totals = useMemo(() => {
    if (viewing && invoice) {
      return {
        gross: invoice.grossAmountPaise,
        discount: invoice.discountAmountPaise,
        taxable: invoice.taxableAmountPaise,
        cgst: invoice.cgstAmountPaise,
        sgst: invoice.sgstAmountPaise,
        igst: invoice.igstAmountPaise,
        total: invoice.totalAmountPaise,
      };
    }

    return previews.reduce(
      (result, preview) => {
        const next = { ...result };

        for (const key of Object.keys(EMPTY_TOTALS)) {
          next[key] += preview[key];
        }

        return next;
      },
      { ...EMPTY_TOTALS },
    );
  }, [previews, viewing, invoice]);

  const isDirty =
    !loading &&
    !viewing &&
    Boolean(initialSnapshot.current) &&
    JSON.stringify({
      form,
      items: itemSnapshot(items),
    }) !== initialSnapshot.current;

  useEffect(() => {
    const beforeUnload = (event) => {
      if (
        !isDirty &&
        !saving &&
        !uncertainResult
      ) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener(
      "beforeunload",
      beforeUnload,
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        beforeUnload,
      );
    };
  }, [isDirty, saving, uncertainResult]);

  const handleFieldChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors([]);
  };

  const handleCustomerChange = (event) => {
    const customer = customers.find(
      (record) =>
        String(record._id) === event.target.value,
    );

    setForm((previous) => ({
      ...previous,
      customerId: customer
        ? String(customer._id)
        : "",
      paymentTerms:
        customer?.paymentTerms || "Due on Receipt",
      dueDate: addDays(
        previous.invoiceDate,
        customer?.creditDays || 0,
      ),
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
            : productMap.get(item.productId)?.gstRate ?? 0,
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
              unitRate: String(
                product?.salePrice ?? 0,
              ),
              gstRate:
                form.taxMode === "NONE"
                  ? 0
                  : product?.gstRate ?? 0,
            }
          : item,
      ),
    );

    setErrors([]);
  };

  const validateForm = (action) => {
    const messages = [];

    if (
      !customers.some(
        (customer) =>
          String(customer._id) === form.customerId,
      )
    ) {
      messages.push("Select an active customer.");
    }

    if (!form.invoiceDate || !form.dueDate) {
      messages.push(
        "Invoice date and due date are required.",
      );
    } else if (form.dueDate < form.invoiceDate) {
      messages.push(
        "Due date cannot be before invoice date.",
      );
    }

    if (!items.length || items.length > 200) {
      messages.push("Add between 1 and 200 items.");
    }

    const ids = items
      .map((item) => item.productId)
      .filter(Boolean);

    if (new Set(ids).size !== ids.length) {
      messages.push(
        "A product can appear only once in an invoice.",
      );
    }

    items.forEach((item, index) => {
      if (!productMap.has(item.productId)) {
        messages.push(
          `Select an active product for item ${index + 1}.`,
        );
      } else if (!previews[index].valid) {
        messages.push(
          `Check quantity, rate, discount and GST for item ${index + 1}.`,
        );
      }
    });

    if (
      Object.values(totals).some(
        (amount) =>
          !Number.isSafeInteger(amount) ||
          amount < 0,
      )
    ) {
      messages.push(
        "Invoice amounts exceed the supported range.",
      );
    }

    if (
      action === "SAVE_AND_POST" &&
      totals.total <= 0
    ) {
      messages.push(
        "A posted invoice must have a positive total.",
      );
    }

    return messages;
  };

  const saveInvoice = async (
    action,
    postingConfirmed = false,
  ) => {
    if (
      disabled ||
      submitLock.current ||
      (
        confirmation &&
        !postingConfirmed
      )
    ) {
      return;
    }

    const messages = validateForm(action);

    if (messages.length) {
      setErrors(messages);
      toast.error(messages[0]);

      if (postingConfirmed) {
        setConfirmation("");
      }

      return;
    }

    if (
      action === "SAVE_AND_POST" &&
      !postingConfirmed
    ) {
      setConfirmation("post");
      return;
    }

    submitLock.current = true;
    setSavingAction(action);
    setErrors([]);

    try {
      const payload = {
        customerId: form.customerId,
        invoiceDate: form.invoiceDate,
        dueDate: form.dueDate,
        paymentTerms:
          form.paymentTerms.trim() ||
          "Due on Receipt",
        taxMode: form.taxMode,
        updateStock: form.updateStock,

        items: items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitRate: Number(item.unitRate),
          discountPercent: Number(
            item.discountPercent,
          ),
          gstRate:
            form.taxMode === "NONE"
              ? 0
              : Number(item.gstRate),
        })),

        notes: form.notes.trim(),
      };

      const response = editing
        ? await salesInvoiceApi.update(
            invoiceNumber,
            payload,
          )
        : await salesInvoiceApi.create({
            ...payload,
            action,
          });

      if (!alive.current) return;

      const saved = response?.data?.invoice;

      if (
        response?.data?.success !== true ||
        !saved?.invoiceNumber
      ) {
        throw new Error(
          response?.data?.message ||
            "No invoice number returned. Check the list before submitting again.",
        );
      }

      setConfirmation("");

      toast.success(
        saved.status === "POSTED"
          ? `${saved.invoiceNumber} created and posted successfully`
          : `${saved.invoiceNumber} draft saved successfully`,
      );

      navigate(SALES_PATHS.list, {
        replace: true,
      });
    } catch (error) {
      if (!alive.current) return;

      const status = error?.response?.status;

      if (
        !status ||
        status >= 500 ||
        status === 408
      ) {
        setUncertainResult(true);
      }

      const messages = getErrors(error);

      setErrors(messages);
      setConfirmation("");

      toast.error(messages[0]);
    } finally {
      submitLock.current = false;

      if (alive.current) {
        setSavingAction("");
      }
    }
  };

  const exitPage = () => {
    if (saving || submitLock.current) return;

    if (isDirty || uncertainResult) {
      setConfirmation("exit");
      return;
    }

    navigate(SALES_PATHS.list);
  };

  const closeConfirmation = useCallback(() => {
    if (submitLock.current) return;

    setConfirmation("");
  }, []);

  const handleConfirmation = () => {
    if (saving || submitLock.current) return;

    if (confirmation === "post") {
      void saveInvoice("SAVE_AND_POST", true);
      return;
    }

    if (confirmation === "exit") {
      setConfirmation("");

      navigate(SALES_PATHS.list);
    }
  };

  const actionButtons = viewing ? (
    invoice?.status === "DRAFT" ? (
      <Button
        type="button"
        variant="secondary"
        icon={Save}
        disabled={
          loading ||
          loadFailed ||
          Boolean(confirmation)
        }
        onClick={() =>
          navigate(
            SALES_PATHS.edit(invoice.invoiceNumber),
          )
        }
      >
        Edit Draft
      </Button>
    ) : null
  ) : (
    <>
      <Button
        type="button"
        variant="secondary"
        icon={Save}
        disabled={formDisabled}
        loading={savingAction === "SAVE_DRAFT"}
        onClick={() => saveInvoice("SAVE_DRAFT")}
      >
        {editing ? "Save Changes" : "Save Draft"}
      </Button>

      {!editing && (
        <Button
          type="button"
          icon={Send}
          disabled={formDisabled}
          loading={
            savingAction === "SAVE_AND_POST"
          }
          onClick={() =>
            saveInvoice("SAVE_AND_POST")
          }
        >
          Save & Post
        </Button>
      )}
    </>
  );

  const address = selectedCustomer
    ? [
        selectedCustomer.billingAddress,
        selectedCustomer.city,
        selectedCustomer.state,
        selectedCustomer.pincode,
        selectedCustomer.country,
      ]
        .filter(
          (value) =>
            typeof value === "string" &&
            value.trim(),
        )
        .join(", ")
    : "";

  const confirmationTitle =
    confirmation === "post"
      ? "Post sales invoice?"
      : uncertainResult
        ? "Check saved invoices?"
        : "Discard invoice changes?";

  const confirmationMessage =
    confirmation === "post"
      ? form.updateStock
        ? "This creates accounting entries and deducts inventory-tracked goods. Posted invoices cannot be edited or deleted in this version."
        : "This creates accounting entries without deducting stock. Posted invoices cannot be edited or deleted in this version."
      : uncertainResult
        ? "The previous request may already have saved this invoice. Open the Sales Invoices list and verify the result before submitting another invoice."
        : "Your unsaved changes will be lost. Do you want to leave this page?";

  return (
    <div className="doc-page">
      <form
        noValidate
        onSubmit={(event) =>
          event.preventDefault()
        }
      >
        <header className="doc-header">
          <div className="doc-header-left">
            <Button
              type="button"
              variant="secondary"
              icon={ArrowLeft}
              disabled={
                saving ||
                Boolean(confirmation)
              }
              onClick={exitPage}
            >
              Exit
            </Button>

            <div className="doc-title">
              <FileText size={18} />

              <span>
                {viewing
                  ? `Sales Invoice ${invoiceNumber}`
                  : editing
                    ? `Edit Sales Invoice ${invoiceNumber}`
                    : "Create Sales Invoice"}
              </span>
            </div>
          </div>

          <div className="doc-header-actions">
            {actionButtons}
          </div>
        </header>

        {(
          loading ||
          errors.length > 0 ||
          uncertainResult
        ) && (
          <div className="doc-alerts">
            {loading && (
              <div
                className="doc-alert"
                role="status"
              >
                {viewing
                  ? "Loading sales invoice..."
                  : "Loading customers and products..."}
              </div>
            )}

            {errors.length > 0 && (
              <div
                className="doc-alert doc-alert-error"
                role="alert"
              >
                <strong>
                  Please review the following
                </strong>

                <ul>
                  {errors.map(
                    (message, index) => (
                      <li
                        key={`${index}-${message}`}
                      >
                        {message}
                      </li>
                    ),
                  )}
                </ul>

                {loadFailed && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      setReloadKey(
                        (value) => value + 1,
                      )
                    }
                  >
                    Retry Loading
                  </Button>
                )}
              </div>
            )}

            {uncertainResult && (
              <div
                className="doc-alert"
                role="alert"
              >
                The save result is uncertain.
                Submission is locked to avoid an
                accidental duplicate.

                <Button
                  type="button"
                  variant="secondary"
                  disabled={
                    saving ||
                    Boolean(confirmation)
                  }
                  onClick={exitPage}
                >
                  Check Sales Invoices
                </Button>
              </div>
            )}
          </div>
        )}

        {invoice && (
          <div className="doc-alerts">
            <div className="doc-alert">
              <StatusField
                value={invoice.status}
              />
              {" "}
              {invoice.status === "POSTED" && (
                <StatusField
                  value={invoice.paymentStatus}
                />
              )}
            </div>
          </div>
        )}

        <fieldset
          className="doc-fieldset"
          disabled={formDisabled}
        >
          <main className="doc-main">
            <section className="doc-top">
              <div className="doc-panel doc-party-panel">
                <h2 className="doc-panel-title">
                  Bill To
                </h2>

                <Select
                  label="Customer"
                  name="customerId"
                  value={form.customerId}
                  placeholder="Select customer"
                  options={customerOptions}
                  onChange={handleCustomerChange}
                  required
                />

                {selectedCustomer && (
                  <div className="doc-party-card">
                    <div className="doc-avatar">
                      {selectedCustomer.customerName
                        ?.charAt(0)
                        .toUpperCase() || "C"}
                    </div>

                    <div className="doc-party-copy">
                      <h3>
                        {selectedCustomer.customerName}
                      </h3>

                      <p>
                        {selectedCustomer.customerCode}
                      </p>

                      <p>
                        <span>Address:</span>{" "}
                        {address ||
                          (
                            viewing
                              ? "Not stored on this invoice"
                              : "Not provided"
                          )}
                      </p>

                      <p>
                        <span>GSTIN:</span>{" "}
                        {selectedCustomer.gstNo ||
                          "Not provided"}
                      </p>

                      <p>
                        <span>Phone:</span>{" "}
                        {selectedCustomer.phone ||
                          (
                            viewing
                              ? "Not stored on this invoice"
                              : "Not provided"
                          )}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="doc-panel">
                <h2 className="doc-panel-title">
                  Invoice Details
                </h2>

                <div className="doc-fields-grid">
                  <Input
                    label="Invoice Number"
                    name="invoiceNumber"
                    value={
                      invoice?.invoiceNumber ||
                      "Generated after saving"
                    }
                    readOnly
                  />

                  <Input
                    label="Invoice Date"
                    name="invoiceDate"
                    type="date"
                    value={form.invoiceDate}
                    onChange={handleFieldChange}
                    required
                  />

                  <Input
                    label="Due Date"
                    name="dueDate"
                    type="date"
                    value={form.dueDate}
                    min={form.invoiceDate}
                    onChange={handleFieldChange}
                    required
                  />

                  <Input
                    label="Payment Terms"
                    name="paymentTerms"
                    value={form.paymentTerms}
                    onChange={handleFieldChange}
                    maxLength={100}
                  />

                  <Select
                    label="Tax Treatment"
                    name="taxMode"
                    value={form.taxMode}
                    options={TAX_OPTIONS}
                    onChange={handleTaxModeChange}
                  />
                </div>

                <label className="doc-check">
                  <input
                    type="checkbox"
                    checked={form.updateStock}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        updateStock:
                          event.target.checked,
                      }))
                    }
                  />

                  <span>
                    Deduct inventory-tracked goods
                    when posting

                    <small>
                      Select when goods are issued
                      to the customer. Saving a
                      draft does not deduct stock.
                    </small>
                  </span>
                </label>
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
                      <th>Price/Item (₹)</th>
                      <th>Discount %</th>
                      <th>GST</th>
                      <th>Amount</th>

                      <th>
                        <span className="doc-sr-only">
                          Remove
                        </span>
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {items.map((item, index) => {
                      const product =
                        productMap.get(
                          item.productId,
                        );

                      const options = Array.from(
                        productMap.values(),
                      )
                        .filter(
                          (record) =>
                            String(record._id) ===
                              item.productId ||
                            !items.some(
                              (other) =>
                                other.productId ===
                                String(record._id),
                            ),
                        )
                        .map((record) => ({
                          value: String(record._id),
                          label:
                            `${record.name} ` +
                            `(${record.productCode})`,
                        }));

                      if (
                        item.productId &&
                        !options.some(
                          (option) =>
                            option.value ===
                            item.productId,
                        )
                      ) {
                        const savedItem =
                          invoice?.items.find(
                            (record) =>
                              String(
                                record.productId,
                              ) === item.productId,
                          );

                        options.unshift({
                          value: item.productId,
                          label: savedItem
                            ? `${savedItem.productName} (unavailable)`
                            : "Unavailable product",
                        });
                      }

                      return (
                        <tr key={item.rowId}>
                          <td
                            data-label="No."
                            className="doc-cell-no"
                          >
                            {index + 1}
                          </td>

                          <td
                            data-label="Item"
                            className="doc-cell-item"
                          >
                            <Select
                              name={`product-${item.rowId}`}
                              aria-label={`Product ${index + 1}`}
                              value={item.productId}
                              placeholder="Select product"
                              options={options}
                              onChange={(event) =>
                                selectProduct(
                                  item.rowId,
                                  event.target.value,
                                )
                              }
                            />

                            {product && (
                              <small className="doc-item-meta">
                                {product.unit}
                                {" · "}
                                {product.type}

                                {product.trackInventory
                                  ? " · Stock tracked"
                                  : ""}
                              </small>
                            )}
                          </td>

                          <td
                            data-label="HSN / SAC"
                            className="doc-cell-hsn"
                          >
                            {product?.hsnSacCode ||
                              "—"}
                          </td>

                          {[
                            {
                              field: "quantity",
                              label: "Quantity",
                              min: "0.001",
                              max: "1000000",
                              step: "0.001",
                            },
                            {
                              field: "unitRate",
                              label: "Price/Item (₹)",
                              min: "0",
                              max: "1000000000",
                              step: "0.01",
                            },
                            {
                              field:
                                "discountPercent",
                              label: "Discount %",
                              min: "0",
                              max: "100",
                              step: "0.01",
                            },
                          ].map((column) => (
                            <td
                              key={column.field}
                              data-label={
                                column.label
                              }
                            >
                              <Input
                                name={`${column.field}-${item.rowId}`}
                                aria-label={`${column.label} ${index + 1}`}
                                type="number"
                                inputMode="decimal"
                                min={column.min}
                                max={column.max}
                                step={column.step}
                                value={
                                  item[column.field]
                                }
                                onChange={(
                                  event,
                                ) =>
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
                              disabled={
                                formDisabled ||
                                form.taxMode ===
                                  "NONE"
                              }
                              options={GST_RATES.map(
                                (rate) => ({
                                  value: rate,
                                  label: `${rate}%`,
                                }),
                              )}
                              onChange={(event) =>
                                updateItem(
                                  item.rowId,
                                  "gstRate",
                                  Number(
                                    event.target.value,
                                  ),
                                )
                              }
                            />
                          </td>

                          <td
                            data-label="Amount"
                            className="doc-cell-amount"
                          >
                            {previews[index].valid
                              ? formatPaise(
                                  previews[index]
                                    .total,
                                )
                              : "—"}
                          </td>

                          <td
                            data-label="Remove"
                            className="doc-cell-action"
                          >
                            {!viewing && (
                              <button
                                type="button"
                                className="doc-remove-button"
                                aria-label={`Remove item ${index + 1}`}
                                disabled={
                                  items.length === 1
                                }
                                onClick={() =>
                                  setItems(
                                    (previous) =>
                                      previous.filter(
                                        (record) =>
                                          record.rowId !==
                                          item.rowId,
                                      ),
                                  )
                                }
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  <tfoot>
                    <tr>
                      <td
                        colSpan={5}
                        className="doc-subtotal-label"
                      >
                        Subtotal
                      </td>

                      <td className="doc-subtotal-value">
                        {formatPaise(
                          totals.discount,
                        )}
                      </td>

                      <td className="doc-subtotal-value">
                        {formatPaise(
                          totals.cgst +
                            totals.sgst +
                            totals.igst,
                        )}
                      </td>

                      <td className="doc-subtotal-value">
                        {formatPaise(totals.total)}
                      </td>

                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {!viewing && (
                <div className="doc-add-item-row">
                  <button
                    type="button"
                    className="doc-dashed-line"
                    disabled={
                      items.length >= 200
                    }
                    onClick={() =>
                      setItems((previous) => [
                        ...previous,
                        newItem(),
                      ])
                    }
                  >
                    <Plus size={15} />
                    Add Item
                  </button>
                </div>
              )}
            </section>

            <section className="doc-bottom">
              <div className="doc-extras">
                <button
                  type="button"
                  className={`doc-extra-row ${
                    showNotes ? "is-open" : ""
                  }`}
                  aria-expanded={showNotes}
                  disabled={viewing}
                  onClick={() =>
                    setShowNotes(
                      (previous) => !previous,
                    )
                  }
                >
                  <StickyNote size={16} />

                  <span>
                    {viewing ? "Notes" : "Add Notes"}
                  </span>

                  <ChevronDown size={16} />
                </button>

                {showNotes && (
                  <div className="doc-extra-content">
                    <Textarea
                      name="notes"
                      value={form.notes}
                      onChange={handleFieldChange}
                      maxLength={1000}
                      rows={4}
                      placeholder="Customer instructions or sales notes..."
                    />
                  </div>
                )}

                <p className="doc-note">
                  Payments are recorded separately
                  through Customer Receipts.
                  Creating this invoice does not
                  mark it as paid.
                </p>

                {editing && (
                  <p className="doc-note">
                    Save your changes, then post
                    the draft from the Sales
                    Invoices list.
                  </p>
                )}
              </div>

              <div className="doc-summary">
                {[
                  ["Gross Amount", totals.gross],
                  [
                    "Line Discounts",
                    -totals.discount,
                  ],
                  [
                    "Taxable Amount",
                    totals.taxable,
                  ],
                  ...(
                    form.taxMode === "INTRA_STATE"
                      ? [
                          ["CGST", totals.cgst],
                          ["SGST", totals.sgst],
                        ]
                      : []
                  ),
                  ...(
                    form.taxMode === "INTER_STATE"
                      ? [["IGST", totals.igst]]
                      : []
                  ),
                ].map(([label, amount]) => (
                  <div
                    className="doc-summary-row"
                    key={label}
                  >
                    <span>{label}</span>
                    <strong>
                      {formatPaise(amount)}
                    </strong>
                  </div>
                ))}

                <div className="doc-summary-total">
                  <span>Total Amount:</span>

                  <strong>
                    {formatPaise(totals.total)}
                  </strong>
                </div>

                {viewing &&
                  invoice?.status === "POSTED" && (
                    <>
                      <div className="doc-summary-row">
                        <span>Paid Amount</span>

                        <strong>
                          {formatPaise(
                            invoice.paidAmountPaise,
                          )}
                        </strong>
                      </div>

                      <div className="doc-summary-row">
                        <span>
                          Outstanding Amount
                        </span>

                        <strong>
                          {formatPaise(
                            invoice.outstandingAmountPaise,
                          )}
                        </strong>
                      </div>
                    </>
                  )}

                <p className="doc-note">
                  {viewing
                    ? "Amounts shown are the saved invoice totals."
                    : "Preview only. The server calculates final totals."}
                </p>
              </div>
            </section>
          </main>
        </fieldset>

        <div className="doc-mobile-bar">
          <div className="doc-mobile-total">
            <span>Total</span>
            <strong>
              {formatPaise(totals.total)}
            </strong>
          </div>

          <div className="doc-mobile-actions">
            {actionButtons}
          </div>
        </div>
      </form>

      <ConfirmModal
        open={Boolean(confirmation)}
        type={
          confirmation === "post"
            ? "question"
            : "warning"
        }
        title={confirmationTitle}
        message={confirmationMessage}
        confirmText={
          confirmation === "post"
            ? "Yes, Post Invoice"
            : uncertainResult
              ? "Open Invoice List"
              : "Discard & Leave"
        }
        cancelText={
          confirmation === "post"
            ? "Keep Editing"
            : "Stay on Page"
        }
        loading={saving}
        closeOnBackdrop={!saving}
        closeOnEscape={!saving}
        onCancel={closeConfirmation}
        onConfirm={handleConfirmation}
      />
    </div>
  );
}

export default function SalesInvoiceCreate({
  mode = "create",
}) {
  const params = useParams();
  const revision = useTenantRevision();

  const invoiceNumber =
    params.invoiceNumber ||
    params.id ||
    "";

  return (
    <SalesInvoiceForm
      key={`${revision}-${mode}-${invoiceNumber}`}
      mode={mode}
      invoiceNumber={invoiceNumber}
    />
  );
}