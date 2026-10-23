import apiClient from "../apiClient";

const tenantProvisioningApi = {
  create: (data) => apiClient.post("/tenants", data, { timeout: 180000 }),
};

export default tenantProvisioningApi;
