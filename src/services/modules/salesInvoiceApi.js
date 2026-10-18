import apiClient from "../apiClient";

const encode = (value) => encodeURIComponent(value);

const salesInvoiceApi = {
  getAll(params = {}) {
    return apiClient.get("/sales-invoices", { params });
  },

  getByNumber(invoiceNumber) {
    return apiClient.get(
      `/sales-invoices/number/${encode(invoiceNumber)}`,
    );
  },

  create(payload) {
    return apiClient.post("/sales-invoices", payload);
  },

  update(invoiceNumber, payload) {
    return apiClient.put(
      `/sales-invoices/number/${encode(invoiceNumber)}`,
      payload,
    );
  },

  post(invoiceNumber) {
    return apiClient.post(
      `/sales-invoices/number/${encode(invoiceNumber)}/post`,
      {},
    );
  },

  delete(invoiceNumber) {
    return apiClient.delete(
      `/sales-invoices/number/${encode(invoiceNumber)}`,
    );
  },

  getCustomers(params = {}) {
    return apiClient.get("/customers", { params });
  },

  getProducts(params = {}) {
    return apiClient.get("/products", { params });
  },
};

export default salesInvoiceApi;