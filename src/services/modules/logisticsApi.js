import axios from "axios";
import apiClient from "../apiClient";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

// Driver-specific client with separate driver token
const driverClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

driverClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("driver_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const logisticsApi = {
  // ------------------------------------
  // ADMIN FLEET & DISPATCH ENDPOINTS
  // ------------------------------------
  getFleetStats: () => apiClient.get("/logistics/fleet/stats"),
  getDrivers: (params = {}) => apiClient.get("/logistics/drivers", { params }),
  createDriver: (data) => apiClient.post("/logistics/drivers", data),
  updateDriver: (id, data) => apiClient.put(`/logistics/drivers/${id}`, data),
  deleteDriver: (id) => apiClient.delete(`/logistics/drivers/${id}`),

  getTrips: (params = {}) => apiClient.get("/logistics/trips", { params }),
  getTripById: (id) => apiClient.get(`/logistics/trips/${id}`),
  createTrip: (data) => apiClient.post("/logistics/trips", data),

  // ------------------------------------
  // DRIVER MOBILE PORTAL ENDPOINTS
  // ------------------------------------
  driverLogin: (credentials) =>
    axios.post(`${API_BASE_URL}/logistics/driver-auth/login`, credentials),
  getDriverActiveTrip: () => driverClient.get("/logistics/driver/active-trip"),
  getDriverTrips: (params = {}) =>
    driverClient.get("/logistics/driver/trips", { params }),
  startDriverTrip: (tripId, data) =>
    driverClient.post(`/logistics/driver/trips/${tripId}/start`, data),
  postDriverLocation: (tripId, data) =>
    driverClient.post(`/logistics/driver/trips/${tripId}/location`, data),
  completeDriverTrip: (tripId, data) =>
    driverClient.post(`/logistics/driver/trips/${tripId}/complete`, data),

  // ------------------------------------
  // PUBLIC TRACKING
  // ------------------------------------
  getPublicTracking: (token) =>
    axios.get(`${API_BASE_URL}/logistics/public/track/${token}`),
};

export default logisticsApi;
