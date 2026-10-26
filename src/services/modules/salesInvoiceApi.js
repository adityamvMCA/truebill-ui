import apiClient from "../apiClient";

const BASE_PATH = "/sales-invoices";

const getDocumentNumber = (value, label) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required`);
  }

  const number = value.trim();

  if (number.length > 100) {
    throw new Error(`${label} cannot exceed 100 characters`);
  }

  return number;
};

const getInvoicePath = (invoiceNumber) => {
  const number = getDocumentNumber(invoiceNumber, "Invoice number");

  return `${BASE_PATH}/number/` + encodeURIComponent(number);
};

const getOrderInvoicePath = (orderNumber) => {
  const number = getDocumentNumber(orderNumber, "Sales Order number");

  return `${BASE_PATH}/from-sales-order/` + encodeURIComponent(number);
};

const validateVersion = (version) => {
  if (!Number.isSafeInteger(version) || version < 0) {
    throw new Error(
      "Sales Order version is missing or invalid. Refresh the order before creating an invoice.",
    );
  }

  return version;
};

const validateDateOnly = (value, label) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must use YYYY-MM-DD format`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error(`${label} must be a valid calendar date`);
  }

  return value;
};

const salesInvoiceApi = {
  /* ==========================================
     LIST / DETAILS
     ========================================== */

  getAll(params = {}) {
    return apiClient.get(BASE_PATH, {
      params,
    });
  },

  getByNumber(invoiceNumber) {
    return apiClient.get(getInvoicePath(invoiceNumber));
  },

  /* ==========================================
     DIRECT INVOICE CREATION

     SAVE_CREATED creates a CREATED invoice.
     SAVE_AND_POST creates and posts it.
     ========================================== */

  create(payload) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invoice payload is required");
    }

    const action = payload.action ?? "SAVE_CREATED";

    if (!["SAVE_CREATED", "SAVE_AND_POST"].includes(action)) {
      throw new Error("Invoice action must be SAVE_CREATED or SAVE_AND_POST");
    }

    return apiClient.post(BASE_PATH, {
      ...payload,
      action,
    });
  },

  /* ==========================================
     CREATE FROM SALES ORDER

     Customer, products, quantities, prices,
     and tax treatment come from the backend.

     The resulting invoice status is CREATED.
     ========================================== */

  createFromSalesOrder(orderNumber, payload = {}) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Invoice creation details are required");
    }

    const version = validateVersion(payload.version);

    const invoiceDate = validateDateOnly(payload.invoiceDate, "Invoice date");

    const dueDate = validateDateOnly(payload.dueDate, "Due date");

    if (dueDate < invoiceDate) {
      throw new Error("Due date cannot be before invoice date");
    }

    return apiClient.post(getOrderInvoicePath(orderNumber), {
      version,
      invoiceDate,
      dueDate,
    });
  },

  /* ==========================================
     UPDATE / POST / DELETE
     ========================================== */

  update(invoiceNumber, payload) {
    return apiClient.put(getInvoicePath(invoiceNumber), payload);
  },

  post(invoiceNumber) {
    return apiClient.post(`${getInvoicePath(invoiceNumber)}/post`, {});
  },

  delete(invoiceNumber) {
    return apiClient.delete(getInvoicePath(invoiceNumber));
  },

  /* ==========================================
     FORM OPTIONS
     ========================================== */

  getCustomers(params = {}) {
    return apiClient.get("/customers", {
      params,
    });
  },

  getProducts(params = {}) {
    return apiClient.get("/products", {
      params,
    });
  },
  /* ==========================================
     E-WAY BILL
     ========================================== */

  saveEwayBill(invoiceNumber, payload) {
    return apiClient.put(`${getInvoicePath(invoiceNumber)}/eway-bill`, payload);
  },

  exportEwayBill(invoiceNumber) {
    return apiClient.get(`${getInvoicePath(invoiceNumber)}/eway-bill/export`);
  },

  recordEwayBill(invoiceNumber, payload) {
    return apiClient.post(
      `${getInvoicePath(invoiceNumber)}/eway-bill/record`,
      payload,
    );
  },

  updateEwayBillVehicle(invoiceNumber, payload) {
    return apiClient.post(
      `${getInvoicePath(invoiceNumber)}/eway-bill/vehicle`,
      payload,
    );
  },

  extendEwayBill(invoiceNumber, payload) {
    return apiClient.post(
      `${getInvoicePath(invoiceNumber)}/eway-bill/extend`,
      payload,
    );
  },

  cancelEwayBill(invoiceNumber, payload) {
    return apiClient.post(
      `${getInvoicePath(invoiceNumber)}/eway-bill/cancel`,
      payload,
    );
  },
};

export default salesInvoiceApi;
