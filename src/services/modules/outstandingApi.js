import apiClient from "../apiClient";

const base = "/outstanding";

const outstandingApi = {
  // Existing: ledger-based balance per party
  getCustomers: (params = {}) =>
    apiClient.get(`${base}/customers`, { params }),

  getSuppliers: (params = {}) =>
    apiClient.get(`${base}/suppliers`, { params }),

  // New: bill-wise ageing, grouped by supplier
  getPayables: (params = {}) =>
    apiClient.get(`${base}/payables`, { params }),

  getPayableParty: (partyId, params = {}) =>
    apiClient.get(`${base}/payables/${encodeURIComponent(partyId)}`, {
      params,
    }),

  // New: invoice-wise ageing, grouped by customer
  getReceivables: (params = {}) =>
    apiClient.get(`${base}/receivables`, { params }),

  getReceivableParty: (partyId, params = {}) =>
    apiClient.get(`${base}/receivables/${encodeURIComponent(partyId)}`, {
      params,
    }),
};

export default outstandingApi;