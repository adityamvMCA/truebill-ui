import apiClient from "../apiClient";

const BASE_PATH = "/delivery-notes";

const notePath = (deliveryNoteNumber) => {
  if (typeof deliveryNoteNumber !== "string" || !deliveryNoteNumber.trim()) {
    throw new Error("Delivery Note number is required");
  }

  return `${BASE_PATH}/${encodeURIComponent(deliveryNoteNumber.trim())}`;
};

const versionBody = (version) => {
  if (!Number.isSafeInteger(version) || version < 0) {
    throw new Error("Document version is missing. Reload the Delivery Note.");
  }

  return { version };
};

const deliveryNoteApi = {
  getAll: (params = {}) =>
    apiClient.get(BASE_PATH, {
      params,
    }),

  getByNumber: (deliveryNoteNumber) =>
    apiClient.get(notePath(deliveryNoteNumber)),

  create: (payload) => apiClient.post(BASE_PATH, payload),

  createFromOrder: (orderNumber, payload) => {
    if (typeof orderNumber !== "string" || !orderNumber.trim()) {
      throw new Error("Sales Order number is required");
    }

    return apiClient.post(
      `${BASE_PATH}/from-order/${encodeURIComponent(orderNumber.trim())}`,
      payload,
    );
  },

  update: (deliveryNoteNumber, payload) =>
    apiClient.patch(notePath(deliveryNoteNumber), {
      ...payload,
      ...versionBody(payload?.version),
    }),

  dispatch: (deliveryNoteNumber, { version, dispatchRemarks = null } = {}) =>
    apiClient.post(`${notePath(deliveryNoteNumber)}/dispatch`, {
      ...versionBody(version),
      dispatchRemarks,
    }),

  deliver: (
    deliveryNoteNumber,
    {
      version,
      receivedByName,
      receivedByPhone = null,
      deliveryRemarks = null,
    } = {},
  ) => {
    const name = String(receivedByName ?? "").trim();

    if (!name) {
      throw new Error("Recipient name is required");
    }

    return apiClient.post(`${notePath(deliveryNoteNumber)}/deliver`, {
      ...versionBody(version),
      receivedByName: name,
      receivedByPhone,
      deliveryRemarks,
    });
  },

  cancel: (deliveryNoteNumber, { version, cancellationReason } = {}) => {
    const reason = String(cancellationReason ?? "").trim();

    if (!reason) {
      throw new Error("Cancellation reason is required");
    }

    return apiClient.post(`${notePath(deliveryNoteNumber)}/cancel`, {
      ...versionBody(version),
      cancellationReason: reason,
    });
  },

  delete: (deliveryNoteNumber, version) =>
    apiClient.delete(notePath(deliveryNoteNumber), {
      data: versionBody(version),
    }),
};

export default deliveryNoteApi;
