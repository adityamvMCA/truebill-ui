import apiClient from "../apiClient";

const BASE = "/sales-invoices"; // <-- adjust if your API prefix differs

const billProfitApi = {
  getReport: (params, config = {}) =>
    apiClient.get(`${BASE}/reports/bill-profit`, { params, ...config }),

  getBill: (invoiceNumber, config = {}) =>
    apiClient.get(`${BASE}/number/${encodeURIComponent(invoiceNumber)}/profit`, config),

  // Used by the bill finder (existing list endpoint, posted bills only)
  searchInvoices: ({ search, page, limit }, config = {}) =>
    apiClient.get(BASE, {
      params: { search: search || undefined, page, limit, status: "POSTED" },
      ...config,
    }),
};

export default billProfitApi;
