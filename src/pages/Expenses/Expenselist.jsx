import { Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import DataList from "../../components/common/DataList/DataList";


import routes from "../../config/routes";

import { STATUS_LABELS, formatPaise } from "./expense.utils";

import "./expense.css";
import expenseApi from "../../services/modules/expenseApi";

const getErrorMessage = (error) => {
  const responseData = error?.response?.data;

  if (Array.isArray(responseData?.errors) && responseData.errors.length > 0) {
    return responseData.errors
      .map((item) =>
        typeof item === "string"
          ? item
          : item?.message || item?.msg || "Validation failed",
      )
      .join(", ");
  }

  if (typeof responseData?.message === "string") {
    return responseData.message;
  }

  return error?.message || "Something went wrong. Please try again.";
};

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "N/A";

const METHOD_LABELS = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  UPI: "UPI",
  CHEQUE: "Cheque",
  CARD: "Card",
};

// Route helpers. Add matching entries to config/routes if you like;
// these fallbacks work without it.
const listPath = () => routes.expenses?.list || "/expenses";

const createPath = () => routes.expenses?.create || "/expenses/new";

// const detailPath = (expenseNumber) =>
//   typeof routes.expenses?.detail === "function"
//     ? routes.expenses.details(expenseNumber)
//     : `${listPath()}/${encodeURIComponent(expenseNumber)}`;

const detailPath = (expenseNumber) =>
  `${routes.expenses.details}/${encodeURIComponent(expenseNumber)}`;
const filters = [
  {
    key: "status",
    label: "Status",
    type: "select",
    options: ["NEW", "APPROVED", "REJECTED", "CANCELLED"],
  },
  {
    key: "paymentMode",
    label: "Payment",
    type: "select",
    options: ["PAID", "PAYABLE"],
  },
];

const quickFilters = [
  { key: "status", value: "", label: "All" },
  { key: "status", value: "NEW", label: "Awaiting Approval" },
  { key: "status", value: "APPROVED", label: "Approved" },
  { key: "status", value: "REJECTED", label: "Rejected" },
  { key: "status", value: "CANCELLED", label: "Cancelled" },
];

function ExpenseList() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);

  const requestVersion = useRef(0);

  const loadExpenses = useCallback(async () => {
    const version = ++requestVersion.current;

    setLoading(true);

    try {
      const collected = [];

      let page = 1;
      let totalPages = 1;

      // DataList handles local filtering/pagination, so fetch every page.
      do {
        const response = await expenseApi.getAll({
          page,
          limit: 100,
        });

        const result = response?.data;

        if (result?.success === false || !Array.isArray(result?.data)) {
          throw new Error(result?.message || "Invalid expense list response.");
        }

        collected.push(...result.data);

        totalPages = Number(result?.pagination?.totalPages);

        if (!Number.isInteger(totalPages) || totalPages < 0) {
          throw new Error("Invalid expense pagination response.");
        }

        page += 1;
      } while (page <= totalPages);

      if (version !== requestVersion.current) return;

      const unique = new Map(
        collected.map((expense) => [expense._id, expense]),
      );

      // Add flat fields so DataList search and sort can use them.
      setExpenses(
        [...unique.values()].map((expense) => {
          const firstLine = expense.lines?.[0];
          const extra = (expense.lines?.length || 1) - 1;

          return {
            ...expense,

            partyName:
              expense.paymentMode === "PAYABLE"
                ? expense.supplierName || ""
                : expense.payeeName || "",

            accountSummary: firstLine
              ? `${firstLine.ledgerName}${extra > 0 ? ` +${extra} more` : ""}`
              : "",

            paymentSummary:
              expense.paymentMode === "PAYABLE"
                ? "Pay later"
                : METHOD_LABELS[expense.paymentMethod] ||
                  expense.paymentMethod ||
                  "",
          };
        }),
      );
    } catch (error) {
      if (version === requestVersion.current) {
        toast.error(getErrorMessage(error));
      }
    } finally {
      if (version === requestVersion.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadExpenses();

    return () => {
      requestVersion.current += 1;
    };
  }, [loadExpenses]);

  // Opens the details page.
  const handleView = useCallback(
    (row) => {
      if (!row?.expenseNumber) return;

      navigate(detailPath(row.expenseNumber));
    },
    [navigate],
  );

  const handleCreate = () => {
    navigate(createPath());
  };

  const handleRefresh = async () => {
    await loadExpenses();
  };

  const columns = useMemo(
    () => [
      {
        key: "expenseNumber",
        label: "Expense No.",
        sortable: true,

        render: (value, row) => (
          <button
            type="button"
            className="doc-link-button"
            aria-label={`View expense ${value}`}
            onClick={(event) => {
              event.stopPropagation();
              handleView(row);
            }}
          >
            {value || "N/A"}
          </button>
        ),
      },

      {
        key: "expenseDate",
        label: "Date",
        type: "date",
        sortable: true,

        render: (value) => formatDate(value),
      },

      {
        key: "accountSummary",
        label: "Expense Account",
        sortable: true,

        render: (value) => value || "N/A",
      },

      {
        key: "partyName",
        label: "Paid To / Supplier",
        sortable: true,

        render: (value) => value || <span className="dl-muted-value">N/A</span>,
      },

      {
        key: "paymentSummary",
        label: "Payment",
        sortable: true,
      },

      {
        key: "totalAmountPaise",
        label: "Total",
        type: "number",
        sortable: true,

        render: (value) => formatPaise(value),
      },

      {
        key: "status",
        label: "Status",
        sortable: true,

        render: (value) => (
          <span
            className={`exp-status exp-status-${String(
              value || "",
            ).toLowerCase()}`}
          >
            {STATUS_LABELS[value] || value || "N/A"}
          </span>
        ),
      },

      {
        key: "referenceNumber",
        label: "Reference",
        sortable: true,
        visible: false,

        render: (value) => value || <span className="dl-muted-value">N/A</span>,
      },

      {
        key: "taxTotalPaise",
        label: "GST",
        type: "number",
        visible: false,

        render: (value) => formatPaise(value),
      },

      {
        key: "paymentMode",
        label: "Payment Mode",
        visible: false,
      },
    ],
    [handleView],
  );

  return (
    <DataList
      title="Expenses"
      subtitle="Record expenses and track admin approval"
      columns={columns}
      data={expenses}
      loading={loading}
      rowKey="_id"
      showCase="list"
      searchable
      filterable
      sortable
      columnVisibility
      pagination
      filters={filters}
      quickFilters={quickFilters}
      storageKey="trustiq-expenses"
      searchPlaceholder="Search number, account, supplier, reference..."
      actions={{
        view: handleView,
      }}
      onRowClick={handleView}
      onRefresh={handleRefresh}
      addButton={
        <button
          type="button"
          className="so-primary-button"
          onClick={handleCreate}
        >
          <Plus size={16} />
          <span>New Expense</span>
        </button>
      }
    />
  );
}

export default ExpenseList;
