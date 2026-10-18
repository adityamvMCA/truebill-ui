import apiClient from "../apiClient";

const salesReturnApi = {
  getAll: (params = {}) =>
    apiClient.get("/sales-returns", { params }),

  getByNumber: (returnNumber) =>
    apiClient.get(
      `/sales-returns/number/${encodeURIComponent(returnNumber)}`
    ),

  create: (data) =>
    apiClient.post("/sales-returns", data),

  update: (returnNumber, data) =>
    apiClient.put(
      `/sales-returns/number/${encodeURIComponent(returnNumber)}`,
      data
    ),

  delete: (returnNumber) =>
    apiClient.delete(
      `/sales-returns/number/${encodeURIComponent(returnNumber)}`
    ),

  post: (returnNumber) =>
    apiClient.post(
      `/sales-returns/number/${encodeURIComponent(returnNumber)}/post`
    ),
};

export default salesReturnApi;