import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";


import salesInvoiceApi from "../../../services/modules/salesInvoiceApi";

import {
  SALES_PATHS,
  formatDate,
  formatPaise,
  getErrors,
  loadAllPages,
  useTenantRevision,
} from "./salesInvoiceUtils";

import "../../../styles/invoice-common1.css";
import DataList from "../../../components/common/DataList/DataList";
import ConfirmModal from "../../../components/common/ConfirmModal/ConfirmModal";
import StatusField from "../../../components/common/StatusField/StatusField";

const INITIAL_CONFIRM = {
  open: false,
  type: "danger",
  title: "",
  message: "",
  confirmText: "Confirm",
  rows: [],
  action: "",
};

const isDraft = (invoice) => invoice?.status === "DRAFT";

function SalesInvoicesListContent() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [confirm, setConfirm] = useState(INITIAL_CONFIRM);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const mounted = useRef(false);
  const requestNumber = useRef(0);
  const actionLock = useRef(false);

  const loadInvoices = useCallback(async () => {
    const request = ++requestNumber.current;

    setLoading(true);

    try {
      const records = await loadAllPages(salesInvoiceApi, "invoices");

      if (mounted.current && request === requestNumber.current) {
        setInvoices(records);
      }
    } catch (error) {
      if (mounted.current && request === requestNumber.current) {
        setInvoices([]);
        toast.error(getErrors(error).join(", "));
      }
    } finally {
      if (mounted.current && request === requestNumber.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;

    loadInvoices();

    return () => {
      mounted.current = false;
      requestNumber.current += 1;
    };
  }, [loadInvoices]);

  const handleView = useCallback(
    (row) => {
      if (!row.invoiceNumber) {
        toast.error("Invoice number is missing.");
        return;
      }

      navigate(SALES_PATHS.view(row.invoiceNumber));
    },
    [navigate],
  );

  const columns = useMemo(
    () => [
      {
        key: "invoiceNumber",
        label: "Invoice Number",
        sortable: true,
        render: (value, row) => (
          <button
            type="button"
            className="doc-link-button"
            aria-label={`View sales invoice ${value}`}
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
        key: "customerName",
        label: "Customer",
        sortable: true,
        render: (value, row) => (
          <div className="dl-customer">
            <strong>{value || "N/A"}</strong>
            <span>{row.customerCode || "N/A"}</span>
          </div>
        ),
      },
      {
        key: "invoiceDate",
        label: "Invoice Date",
        sortable: true,
        render: formatDate,
      },
      {
        key: "dueDate",
        label: "Due Date",
        sortable: true,
        render: formatDate,
      },
      {
        key: "totalAmountPaise",
        label: "Total",
        type: "number",
        sortable: true,
        render: formatPaise,
      },
      {
        key: "paidAmountPaise",
        label: "Paid",
        type: "number",
        sortable: true,
        render: (value, row) =>
          isDraft(row) ? (
            <span className="dl-muted-value">N/A</span>
          ) : (
            formatPaise(value)
          ),
      },
      {
        key: "outstandingAmountPaise",
        label: "Pending Amount",
        type: "number",
        sortable: true,
        render: (value, row) =>
          isDraft(row) ? (
            <span className="dl-muted-value">Not posted</span>
          ) : (
            formatPaise(value)
          ),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (value) => <StatusField value={value} />,
      },
      {
        key: "paymentStatus",
        label: "Payment Status",
        sortable: true,
        render: (value, row) =>
          isDraft(row) ? (
            <span className="dl-muted-value">N/A</span>
          ) : (
            <StatusField value={value} />
          ),
      },
      {
        key: "paymentTerms",
        label: "Payment Terms",
        sortable: true,
        visible: false,
      },
      {
        key: "taxMode",
        label: "Tax Mode",
        sortable: true,
        visible: false,
      },
      ...[
        ["taxableAmountPaise", "Taxable Amount"],
        ["discountAmountPaise", "Discount"],
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
        key: "updateStock",
        label: "Deduct Stock",
        sortable: true,
        visible: false,
        render: (value) => (value ? "Yes" : "No"),
      },
      {
        key: "postedAt",
        label: "Posted On",
        sortable: true,
        visible: false,
        render: formatDate,
      },
      {
        key: "notes",
        label: "Notes",
        visible: false,
        render: (value) => value || <span className="dl-muted-value">N/A</span>,
      },
    ],
    [handleView],
  );

  const filters = [
    {
      key: "status",
      label: "Invoice Status",
      type: "select",
      options: ["DRAFT", "POSTED", "CANCELLED"],
    },
    {
      key: "paymentStatus",
      label: "Payment Status",
      type: "select",
      options: ["UNPAID", "PARTIALLY_PAID", "PAID"],
    },
    {
      key: "taxMode",
      label: "Tax Mode",
      type: "select",
      options: ["NONE", "INTRA_STATE", "INTER_STATE"],
    },
    {
      key: "updateStock",
      label: "Deduct Stock",
      type: "select",
      options: [
        { label: "Yes", value: true },
        { label: "No", value: false },
      ],
    },
  ];

  const quickFilters = [
    { key: "status", value: "", label: "All" },
    { key: "status", value: "DRAFT", label: "Drafts" },
    { key: "status", value: "POSTED", label: "Posted" },
    { key: "status", value: "CANCELLED", label: "Cancelled" },
  ];

  const handleEdit = (row) => {
    if (!isDraft(row)) {
      toast.error("Only draft sales invoices can be edited.");
      return;
    }

    navigate(SALES_PATHS.edit(row.invoiceNumber));
  };

  const openAction = (rows, action) => {
    if (actionLock.current || !rows?.length) return;

    if (rows.some((row) => !isDraft(row))) {
      toast.error("Select only draft sales invoices.");
      return;
    }

    const posting = action === "post";

    setConfirm({
      open: true,
      type: "danger",
      title: posting
        ? "Post selected sales invoices?"
        : "Delete selected drafts?",
      message: posting
        ? `Post ${rows.length} invoice(s)? This creates accounting entries and deducts tracked stock where selected. Posted invoices cannot be edited or deleted.`
        : `Delete ${rows.length} sales invoice draft(s)? These drafts will be marked as deleted.`,
      confirmText: posting ? "Post Drafts" : "Delete Drafts",
      rows,
      action,
    });
  };

  const handleConfirm = async () => {
    if (actionLock.current || !confirm.rows.length) return;

    actionLock.current = true;
    setConfirmLoading(true);

    const action = confirm.action;
    const rows = [...confirm.rows];

    let successCount = 0;
    const failures = [];

    try {
      for (const row of rows) {
        if (!mounted.current) break;

        try {
          const response =
            action === "post"
              ? await salesInvoiceApi.post(row.invoiceNumber)
              : await salesInvoiceApi.delete(row.invoiceNumber);

          if (response?.data?.success !== true) {
            throw new Error(response?.data?.message || "Action failed.");
          }

          successCount += 1;
        } catch (error) {
          failures.push(`${row.invoiceNumber}: ${getErrors(error).join(", ")}`);
        }
      }

      if (!mounted.current) return;

      if (successCount) {
        toast.success(
          `${successCount} invoice(s) ${
            action === "post" ? "posted" : "deleted"
          } successfully`,
        );
      }

      if (failures.length) {
        toast.error(`${failures.length} action(s) failed. ${failures[0]}`);
      }

      // Close and refresh even after uncertain responses.
      // Do not immediately offer the same stale action again.
      setConfirm(INITIAL_CONFIRM);

      await loadInvoices();
    } finally {
      actionLock.current = false;

      if (mounted.current) setConfirmLoading(false);
    }
  };

  return (
    <>
      <DataList
        title="Sales Invoices"
        subtitle="Manage customer invoices and sales postings"
        columns={columns}
        data={invoices}
        loading={loading}
        rowKey="_id"
        showCase="list"
        searchable
        filterable
        sortable
        selectable
        columnVisibility
        pagination
        filters={filters}
        quickFilters={quickFilters}
        storageKey={`trustiq-sales-invoices-${
          sessionStorage.getItem("selectedTenantId") || "current"
        }`}
        searchPlaceholder="Search invoice, customer, customer code..."
        actions={{
          view: handleView,
          edit: handleEdit,
          delete: (row) => openAction([row], "delete"),
        }}
        bulkActions={[
          {
            key: "post",
            label: "Post Drafts",
            action: (rows) => openAction(rows, "post"),
          },
          {
            key: "delete",
            label: "Delete Drafts",
            danger: true,
            action: (rows) => openAction(rows, "delete"),
          },
        ]}
        onRefresh={loadInvoices}
        addButton={
          <button
            type="button"
            className="so-primary-button"
            onClick={() => navigate(SALES_PATHS.create)}
          >
            <Plus size={16} />
            <span>New Sales Invoice</span>
          </button>
        }
      />

      <ConfirmModal
        open={confirm.open}
        type={confirm.type}
        title={confirm.title}
        message={confirm.message}
        confirmText={confirm.confirmText}
        cancelText="Cancel"
        loading={confirmLoading}
        onCancel={() => {
          if (!actionLock.current) {
            setConfirm(INITIAL_CONFIRM);
          }
        }}
        onConfirm={handleConfirm}
      />
    </>
  );
}

export default function SalesInvoicesList() {
  const revision = useTenantRevision();

  return <SalesInvoicesListContent key={revision} />;
}
