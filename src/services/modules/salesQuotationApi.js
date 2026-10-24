import apiClient from "../apiClient";

// Match the path where salesQuotation.routes is mounted.
const BASE_PATH = "/sales-quotations";

const getObjectId = (value, label) => {
  if (typeof value !== "string") {
    throw new Error(`A valid ${label} is required`);
  }

  const id = value.trim();

  if (!/^[a-fA-F0-9]{24}$/.test(id)) {
    throw new Error(`A valid ${label} is required`);
  }

  return id;
};

const getQuotationPath = (quotationId) => {
  const id = getObjectId(quotationId, "quotation ID");

  return `${BASE_PATH}/${encodeURIComponent(id)}`;
};

const getVersionBody = (version) => {
  if (!Number.isSafeInteger(version) || version < 0) {
    throw new Error(
      "Quotation version is missing or invalid. Refresh the list before continuing.",
    );
  }

  return { version };
};

const salesQuotationApi = {
  getAll: (params = {}) =>
    apiClient.get(BASE_PATH, {
      params,
    }),

  getById: (quotationId) => apiClient.get(getQuotationPath(quotationId)),

  create: (payload) => apiClient.post(BASE_PATH, payload),

  update: (quotationId, { version, ...fields } = {}) =>
    apiClient.patch(getQuotationPath(quotationId), {
      ...fields,
      ...getVersionBody(version),
    }),

  issue: (quotationId, { version } = {}) =>
    apiClient.post(
      `${getQuotationPath(quotationId)}/issue`,
      getVersionBody(version),
    ),

  accept: (quotationId, { version, acceptanceReference = null } = {}) =>
    apiClient.post(`${getQuotationPath(quotationId)}/accept`, {
      ...getVersionBody(version),
      acceptanceReference,
    }),

  reject: (quotationId, { version, rejectionReason = null } = {}) =>
    apiClient.post(`${getQuotationPath(quotationId)}/reject`, {
      ...getVersionBody(version),
      rejectionReason,
    }),

  cancel: (quotationId, { version, cancellationReason = null } = {}) =>
    apiClient.post(`${getQuotationPath(quotationId)}/cancel`, {
      ...getVersionBody(version),
      cancellationReason,
    }),

  createRevision: (quotationId, { version, ...fields } = {}) =>
    apiClient.post(`${getQuotationPath(quotationId)}/revisions`, {
      ...fields,
      ...getVersionBody(version),
    }),

  delete: (quotationId, { version } = {}) =>
    apiClient.delete(getQuotationPath(quotationId), {
      data: getVersionBody(version),
    }),
  getByNumber: (quotationNumber, revision) => {
    const number = String(quotationNumber ?? "").trim();

    const revisionNumber = Number(revision);

    if (!number) {
      throw new Error("Quotation number is required");
    }

    if (!Number.isSafeInteger(revisionNumber) || revisionNumber < 1) {
      throw new Error("A valid quotation revision is required");
    }

    return apiClient.get(
      `${BASE_PATH}/by-number/${encodeURIComponent(number)}/${revisionNumber}`,
    );
  },
  compare: (comparisonGroupId) =>
    apiClient.get(`${BASE_PATH}/compare`, {
      params: {
        comparisonGroupId: getObjectId(
          comparisonGroupId,
          "comparison group ID",
        ),
      },
    }),
};

export default salesQuotationApi;