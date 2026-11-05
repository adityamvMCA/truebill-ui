// Barcode page modules re-use the shared apiClient-backed service so every
// consumer imports the same `barcodeApi` name (see services/modules/barcodeApi.js).
import barcodeApi from "../../services/modules/barcodeApi";
import api from "../../services/api";

export { barcodeApi };

/** Create a product (with its scanned barcode / box info) without leaving the scanner. */
export const createProductQuick = (body) => api.product.create(body);

export const searchProducts = (search) =>
  api.product.getAll({ search, page: 1, limit: 10, status: "ACTIVE" });

export const apiError = (e) =>
  e?.response?.data?.errors?.join?.(", ") ||
  e?.response?.data?.message ||
  e?.message ||
  "Something went wrong";