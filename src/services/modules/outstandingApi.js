import apiClient from "../apiClient";

const BASE = "/outstanding"; // <- change to your real mount path

const outstandingApi = {
  /* ---------- new: paged + bucketed ---------- */
  getCustomerOutstanding: (params = {}, { signal } = {}) =>
    apiClient.get(`${BASE}/customers`, { params, signal }),

  getCustomerOutstandingSummary: (params = {}, { signal } = {}) =>
    apiClient.get(`${BASE}/customers/summary`, { params, signal }),

  getSupplierOutstanding: (params = {}, { signal } = {}) =>
    apiClient.get(`${BASE}/suppliers`, { params, signal }),

  getSupplierOutstandingSummary: (params = {}, { signal } = {}) =>
    apiClient.get(`${BASE}/suppliers/summary`, { params, signal }),

  /* ---------- old (kept for other pages) ---------- */
  getPayables: (params = {}) => apiClient.get(`${BASE}/payables`, { params }),

  getPayableParty: (partyId, params = {}) =>
    apiClient.get(`${BASE}/payables/${encodeURIComponent(partyId)}`, { params }),

  getReceivables: (params = {}) => apiClient.get(`${BASE}/receivables`, { params }),

  getReceivableParty: (partyId, params = {}) =>
    apiClient.get(`${BASE}/receivables/${encodeURIComponent(partyId)}`, { params }),
};

export default outstandingApi;