
import apiClient from "../apiClient";

const ledgerGroupApi = {
  // Get ledger groups, optionally filtered by nature.
  // Example: getAll({ nature: "LIABILITY" })
  getAll: (params = {}) =>
    apiClient.get("/accounting/ledger-groups", { params }),

  // Seed default ledger groups for the current tenant.
  seed: (data = {}) =>
    apiClient.post("/accounting/ledger-groups/seed", data),
};

export default ledgerGroupApi;
