import apiClient from "../apiClient";

const productApi = {
  getAll: (params = {}) =>
    apiClient.get("/products", {
      params,
    }),

  getByCode: (productCode) =>
    apiClient.get(
      `/products/code/${productCode}`
    ),

  create: (data) =>
    apiClient.post("/products", data),

  import: (formData) =>
    apiClient.post(
      "/products/import",
      formData,
      {
        headers: {
          "Content-Type":
            "multipart/form-data",
        },
      }
    ),

  update: (productCode, data) =>
    apiClient.put(
      `/products/code/${productCode}`,
      data
    ),

  delete: (productCode) =>
    apiClient.delete(
      `/products/code/${productCode}`
    ),
};

export default productApi;