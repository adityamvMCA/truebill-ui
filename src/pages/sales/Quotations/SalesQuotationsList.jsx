import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";

import DataList from "../../../components/common/DataList/DataList";
import StatusField from "../../../components/common/StatusField/StatusField";
import ConfirmModal from "../../../components/common/ConfirmModal/ConfirmModal";
import Button from "../../../components/common/Form/Button";

import api from "../../../services/api";
import routes, {
  buildRoute,
} from "../../../config/routes";

const quotationApi = api.salesQuotations;

const STATUSES = [
  "DRAFT",
  "ISSUED",
  "ACCEPTED",
  "REJECTED",
  "CANCELLED",
];

const STATUS_LABELS = {
  DRAFT: "Drafts",
  ISSUED: "Issued",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

const FILTERS = [
  {
    key: "status",
    label: "Quotation Status",
    type: "select",
    options: STATUSES,
  },

  {
    key: "taxMode",
    label: "Tax Mode",
    type: "select",
    options: [
      "NONE",
      "INTRA_STATE",
      "INTER_STATE",
    ],
  },
];

const QUICK_FILTERS = [
  {
    key: "status",
    value: "",
    label: "All",
  },

  ...STATUSES.map((status) => ({
    key: "status",
    value: status,
    label: STATUS_LABELS[status],
  })),
];

const ACTIONS = {
  issue: {
    label: "Issue",
    title: "Issue quotation?",
    confirmText: "Issue Quotation",
    allowedStatus: "DRAFT",
    description:
      "This issues the quotation. Further changes require a revision.",
  },

  accept: {
    label: "Accept",
    title: "Accept quotation?",
    confirmText: "Accept Quotation",
    allowedStatus: "ISSUED",
    description:
      "Record this quotation as accepted by the customer.",
  },

  reject: {
    label: "Reject",
    title: "Reject quotation?",
    confirmText: "Reject Quotation",
    allowedStatus: "ISSUED",
    description:
      "Record this quotation as rejected by the customer.",
  },

  cancel: {
    label: "Cancel",
    title: "Cancel quotation?",
    confirmText: "Cancel Quotation",
    allowedStatus: "DRAFT",
    description:
      "This cancels the draft quotation.",
  },

  delete: {
    label: "Delete",
    title: "Delete quotation draft?",
    confirmText: "Delete Draft",
    allowedStatus: "DRAFT",
    description:
      "This draft will be marked as deleted.",
  },
};

const emptyConfirmState = () => ({
  open: false,
  action: "",
  quotation: null,
});

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatPaise = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  const amount = Number(value);

  return Number.isSafeInteger(amount)
    ? currencyFormatter.format(amount / 100)
    : "—";
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};

const getErrorMessage = (error) => {
  const body = error?.response?.data;

  if (Array.isArray(body?.errors) && body.errors.length) {
    return body.errors
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.message || item?.msg || String(item),
      )
      .join(", ");
  }

  return (
    body?.message ||
    error?.message ||
    "Unable to complete the request."
  );
};

const assertSuccess = (response) => {
  if (response?.data?.success !== true) {
    throw new Error(
      response?.data?.message || "Request failed",
    );
  }
};

const extractList = (response) => {
  assertSuccess(response);

  if (!Array.isArray(response.data.data)) {
    throw new Error("Invalid quotation list response");
  }

  return response.data.data;
};

const extractQuotation = (response) => {
  assertSuccess(response);

  const quotation = response.data.data;

  if (!quotation?._id || !quotation.quotationNumber) {
    throw new Error("Invalid quotation response");
  }

  return quotation;
};

const assertVersion = (quotation) => {
  if (
    !Number.isSafeInteger(quotation.__v) ||
    quotation.__v < 0
  ) {
    throw new Error(
      "Quotation version is missing. Refresh the list.",
    );
  }
};

const getRouteParams = (quotation) => {
  const quotationNumber =
    quotation?.quotationNumber?.trim();

  if (!quotationNumber) {
    throw new Error("Quotation number is missing.");
  }

  if (
    !Number.isSafeInteger(quotation.revision) ||
    quotation.revision < 1
  ) {
    throw new Error("Quotation revision is missing.");
  }

  return {
    quotationNumber: encodeURIComponent(
      quotationNumber,
    ),
    revision: String(quotation.revision),
  };
};

const documentLabel = (quotation) =>
  `${quotation.quotationNumber} / R${quotation.revision}`;

function SalesQuotationsList() {
  const navigate = useNavigate();

  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [confirmState, setConfirmState] =
    useState(emptyConfirmState);

  const [confirmLoading, setConfirmLoading] =
    useState(false);

  const mountedRef = useRef(false);
  const requestRef = useRef(0);
  const mutationLockRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      requestRef.current += 1;
    };
  }, []);

  const loadQuotations = useCallback(async () => {
    const requestId = ++requestRef.current;

    setLoading(true);
    setLoadError("");

    try {
      if (typeof quotationApi?.getAll !== "function") {
        throw new Error(
          "Configure api.salesQuotations.getAll first.",
        );
      }

      const firstResponse = await quotationApi.getAll({
        page: 1,
        limit: 100,
      });

      const records = [...extractList(firstResponse)];

      const totalPages = Math.max(
        1,
        Number(
          firstResponse.data.pagination?.totalPages,
        ) || 1,
      );

      for (
        let page = 2;
        page <= totalPages;
        page += 1
      ) {
        if (
          !mountedRef.current ||
          requestId !== requestRef.current
        ) {
          return;
        }

        const response = await quotationApi.getAll({
          page,
          limit: 100,
        });

        records.push(...extractList(response));
      }

      if (
        !mountedRef.current ||
        requestId !== requestRef.current
      ) {
        return;
      }

      setQuotations(
        Array.from(
          new Map(
            records.map((quotation) => [
              quotation._id,
              quotation,
            ]),
          ).values(),
        ),
      );
    } catch (error) {
      if (
        mountedRef.current &&
        requestId === requestRef.current
      ) {
        const message = getErrorMessage(error);

        setLoadError(message);
        toast.error(message);
      }
    } finally {
      if (
        mountedRef.current &&
        requestId === requestRef.current
      ) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadQuotations();
  }, [loadQuotations]);

  const handleView = useCallback(
    (row) => {
      if (mutationLockRef.current) return;

      try {
        navigate(
          buildRoute(
            routes.sales.viewQuotation,
            getRouteParams(row),
          ),
        );
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [navigate],
  );

  const handleEdit = useCallback(
    (row) => {
      if (mutationLockRef.current) return;

      if (row.status !== "DRAFT") {
        toast.error(
          "Only draft quotations can be edited.",
        );
        return;
      }

      try {
        navigate(
          buildRoute(
            routes.sales.editQuotation,
            getRouteParams(row),
          ),
        );
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [navigate],
  );

  const openAction = useCallback((row, action) => {
    if (mutationLockRef.current) return;

    const config = ACTIONS[action];

    if (!config) return;

    if (row.status !== config.allowedStatus) {
      toast.error(
        `This action requires a ${config.allowedStatus.toLowerCase()} quotation.`,
      );
      return;
    }

    try {
      if (!row._id) {
        throw new Error("Quotation record ID is missing.");
      }

      assertVersion(row);

      setConfirmState({
        open: true,
        action,
        quotation: row,
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, []);

  const closeConfirm = () => {
    if (mutationLockRef.current) return;

    setConfirmState(emptyConfirmState());
  };

  const handleConfirm = async () => {
    const { action, quotation } = confirmState;
    const config = ACTIONS[action];

    if (
      mutationLockRef.current ||
      !quotation ||
      !config
    ) {
      return;
    }

    mutationLockRef.current = true;
    requestRef.current += 1;

    setLoading(false);
    setConfirmLoading(true);

    try {
      if (
        typeof quotationApi?.getById !== "function" ||
        typeof quotationApi[action] !== "function"
      ) {
        throw new Error(
          "Quotation API methods are not configured.",
        );
      }

      // Existing workflow endpoints still identify
      // the exact database record by its internal ID.
      const latestResponse = await quotationApi.getById(
        quotation._id,
      );

      const latest = extractQuotation(latestResponse);

      assertVersion(latest);

      if (
        latest.__v !== quotation.__v ||
        latest.status !== quotation.status ||
        latest.status !== config.allowedStatus
      ) {
        throw new Error(
          "This quotation changed. Review the refreshed list before trying again.",
        );
      }

      const response = await quotationApi[action](
        quotation._id,
        {
          version: quotation.__v,
        },
      );

      assertSuccess(response);

      if (mountedRef.current) {
        toast.success(
          response.data.message ||
            "Quotation updated successfully",
        );
      }
    } catch (error) {
      if (mountedRef.current) {
        toast.error(getErrorMessage(error));
      }
    } finally {
      if (mountedRef.current) {
        setConfirmState(emptyConfirmState());
        await loadQuotations();
      }

      mutationLockRef.current = false;

      if (mountedRef.current) {
        setConfirmLoading(false);
      }
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "quotationNumber",
        label: "Quotation",
        sortable: true,

        render: (value, row) => (
          <button
            type="button"
            className="doc-link-button"
            disabled={confirmLoading}
            onClick={(event) => {
              event.stopPropagation();
              handleView(row);
            }}
          >
            {value || "—"}
          </button>
        ),
      },

      {
        key: "revision",
        label: "Revision",
        type: "number",
        sortable: true,
        render: (value) => `R${value}`,
      },

      {
        key: "customerName",
        label: "Customer",
        sortable: true,

        render: (value, row) => (
          <div className="dl-customer">
            <strong>{value || "—"}</strong>
            <span>{row.customerCode || "—"}</span>
          </div>
        ),
      },

      {
        key: "quotationDate",
        label: "Quotation Date",
        sortable: true,
        render: formatDate,
      },

      {
        key: "validUntil",
        label: "Valid Until",
        sortable: true,
        render: formatDate,
      },

      {
        key: "enquiryReference",
        label: "Enquiry Reference",
        sortable: true,
        render: (value) => value || "—",
      },

      {
        key: "totalAmountPaise",
        label: "Total Amount",
        type: "number",
        sortable: true,
        render: formatPaise,
      },

      {
        key: "status",
        label: "Status",
        sortable: true,

        render: (value) => (
          <StatusField value={value} />
        ),
      },

      {
        key: "workflow",
        label: "Next Actions",
        sortable: false,

        render: (_value, row) => {
          const available =
            row.status === "DRAFT"
              ? ["issue", "cancel"]
              : row.status === "ISSUED"
                ? ["accept", "reject"]
                : [];

          if (!available.length) {
            return (
              <span className="dl-muted-value">
                No further actions
              </span>
            );
          }

          return (
            <div>
              {available.map((action) => (
                <Button
                  key={action}
                  variant="secondary"
                  disabled={confirmLoading}
                  onClick={(event) => {
                    event?.stopPropagation();
                    openAction(row, action);
                  }}
                >
                  {ACTIONS[action].label}
                </Button>
              ))}
            </div>
          );
        },
      },

      {
        key: "expectedDeliveryDate",
        label: "Expected Delivery",
        sortable: true,
        visible: false,
        render: formatDate,
      },

      {
        key: "paymentTerms",
        label: "Payment Terms",
        sortable: true,
        visible: false,
      },

      {
        key: "deliveryTerms",
        label: "Delivery Terms",
        visible: false,
      },

      {
        key: "taxMode",
        label: "Tax Mode",
        sortable: true,
        visible: false,
      },

      ...[
        ["grossAmountPaise", "Gross Amount"],
        ["discountAmountPaise", "Discount"],
        ["taxableAmountPaise", "Taxable Amount"],
        ["cgstAmountPaise", "CGST"],
        ["sgstAmountPaise", "SGST"],
        ["igstAmountPaise", "IGST"],
      ].map(([key, label]) => ({
        key,
        label,
        type: "number",
        sortable: true,
        visible: false,
        render: formatPaise,
      })),

      {
        key: "issuedAt",
        label: "Issued On",
        sortable: true,
        visible: false,
        render: formatDate,
      },

      {
        key: "notes",
        label: "Notes",
        visible: false,
        render: (value) => value || "—",
      },
    ],
    [confirmLoading, handleView, openAction],
  );

  const selectedQuotation = confirmState.quotation;
  const selectedAction = ACTIONS[confirmState.action];

  return (
    <>
      {loadError && (
        <div role="alert">
          <p>Unable to load quotations: {loadError}</p>

          <Button
            variant="secondary"
            disabled={loading || confirmLoading}
            onClick={() => void loadQuotations()}
          >
            Retry
          </Button>
        </div>
      )}

      <DataList
        title="Sales Quotations"
        subtitle="Manage customer quotations, revisions, and approvals"
        columns={columns}
        data={quotations}
        loading={loading}
        rowKey="_id"
        showCase="list"
        searchable
        filterable
        sortable
        columnVisibility
        pagination
        filters={FILTERS}
        quickFilters={QUICK_FILTERS}
        storageKey="trustiq-sales-quotations"
        searchPlaceholder="Search quotation, customer, code, enquiry..."
        actions={{
          view: handleView,
          edit: handleEdit,

          delete: (row) => {
            openAction(row, "delete");
          },
        }}
        onRefresh={() => {
          if (!mutationLockRef.current) {
            void loadQuotations();
          }
        }}
        addButton={
          <Button
            icon={Plus}
            disabled={confirmLoading}
            onClick={() =>
              navigate(routes.sales.createQuotation)
            }
          >
            New Quotation
          </Button>
        }
      />

      <ConfirmModal
        open={confirmState.open}
        type="danger"
        title={selectedAction?.title || ""}
        message={
          selectedQuotation && selectedAction
            ? `${documentLabel(selectedQuotation)} for ${
                selectedQuotation.customerName
              }. ${selectedAction.description}`
            : ""
        }
        confirmText={
          selectedAction?.confirmText || "Confirm"
        }
        cancelText="Back"
        loading={confirmLoading}
        onCancel={closeConfirm}
        onConfirm={handleConfirm}
      />
    </>
  );
}

export default SalesQuotationsList;