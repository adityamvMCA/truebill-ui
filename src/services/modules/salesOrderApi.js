import apiClient from "../apiClient";

const BASE_PATH = "/sales-orders";

const getOrderPath = (orderNumber) => {
  if (
    typeof orderNumber !== "string" ||
    !orderNumber.trim()
  ) {
    throw new Error(
      "Sales order number is required",
    );
  }

  return `${BASE_PATH}/${encodeURIComponent(
    orderNumber.trim(),
  )}`;
};

const getVersionBody = (version) => {
  if (
    !Number.isSafeInteger(version) ||
    version < 0
  ) {
    throw new Error(
      "Sales order version is missing or invalid. Refresh the list before continuing.",
    );
  }

  return {
    version,
  };
};

const salesOrderApi = {
  getOrders: (params = {}) =>
    apiClient.get(BASE_PATH, {
      params,
    }),

  getOrder: (orderNumber) =>
    apiClient.get(
      getOrderPath(orderNumber),
    ),

  createOrder: (payload) =>
    apiClient.post(
      BASE_PATH,
      payload,
    ),

  updateOrder: (orderNumber, payload) =>
    apiClient.patch(
      getOrderPath(orderNumber),
      payload,
    ),

  confirmOrder: (orderNumber, version) =>
    apiClient.post(
      `${getOrderPath(orderNumber)}/confirm`,
      getVersionBody(version),
    ),

  startOrder: (orderNumber, version) =>
    apiClient.post(
      `${getOrderPath(orderNumber)}/start`,
      getVersionBody(version),
    ),

  completeOrder: (orderNumber, version) =>
    apiClient.post(
      `${getOrderPath(orderNumber)}/complete`,
      getVersionBody(version),
    ),

  cancelOrder: (
    orderNumber,
    {
      version,
      cancellationReason = null,
    } = {},
  ) =>
    apiClient.post(
      `${getOrderPath(orderNumber)}/cancel`,
      {
        ...getVersionBody(version),
        cancellationReason,
      },
    ),

  deleteOrder: (orderNumber) =>
    apiClient.delete(
      getOrderPath(orderNumber),
    ),

  convertQuotation: (
    quotationId,
    payload = {},
  ) => {
    if (
      typeof quotationId !== "string" ||
      !/^[a-fA-F0-9]{24}$/.test(quotationId)
    ) {
      throw new Error(
        "A valid quotation ID is required",
      );
    }

    return apiClient.post(
      `${BASE_PATH}/from-quotation/${encodeURIComponent(
        quotationId,
      )}`,
      payload,
    );
  },
};

export default salesOrderApi;