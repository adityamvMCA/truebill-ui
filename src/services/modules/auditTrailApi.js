import apiClient from "../apiClient";

const BASE = "/audit-trail"; // <-- adjust if your API prefix differs

const auditTrailApi = {
  getEntries: (params, config = {}) => apiClient.get(BASE, { params, ...config }),

  getEntry: (id, config = {}) =>
    apiClient.get(`${BASE}/${encodeURIComponent(id)}`, config),

  // Powers the bill finder: bills that have audit history
  searchDocuments: ({ search, page, limit, module }, config = {}) =>
    apiClient.get(`${BASE}/documents`, {
      params: { search: search || undefined, page, limit, module },
      ...config,
    }),
};

export default auditTrailApi;
