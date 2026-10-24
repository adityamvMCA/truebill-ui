import apiClient from "../apiClient";

const noteApi = {
  getAll: (params = {}) => apiClient.get("/notes", { params }),
  getById: (id) => apiClient.get(`/notes/${encodeURIComponent(id)}`),
  // requestId is sent in the body and as X-Request-Id (UUID v4, one per submit attempt).
  create: (data) =>
    apiClient.post("/notes", data, {
      headers: { "X-Request-Id": data.requestId },
    }),
};

export default noteApi;