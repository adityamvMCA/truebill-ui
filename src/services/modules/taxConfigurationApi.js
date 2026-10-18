import apiClient from "../apiClient";

const taxConfigurationApi = {
  get: () => apiClient.get("/tax-configuration"),
  save: (data) => apiClient.put("/tax-configuration", data),
};

export default taxConfigurationApi;
