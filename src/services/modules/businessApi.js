import apiClient from "../apiClient";

const businessApi = {
  // Business (Tenants)
  getMyBusinesses: () => apiClient.get("/business/my-businesses"),
  createBusiness: (payload) => apiClient.post("/business", payload),
  switchBusiness: (tenantId) => apiClient.post("/business/switch", { tenantId }),

  // Branches
  getBranches: () => apiClient.get("/branches"),
  createBranch: (payload) => apiClient.post("/branches", payload),
  updateBranch: (branchId, payload) => apiClient.put(`/branches/${branchId}`, payload),
  deleteBranch: (branchId) => apiClient.delete(`/branches/${branchId}`),
};

export default businessApi;
