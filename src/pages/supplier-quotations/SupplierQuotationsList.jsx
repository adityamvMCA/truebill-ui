import { Plus } from "lucide-react";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import DataList from "../../components/common/DataList/DataList";
import StatusField from "../../components/common/StatusField/StatusField";
import ConfirmModal from "../../components/common/ConfirmModal/ConfirmModal";

import api from "../../services/api";

import {
  SUPPLIER_QUOTATION_BASE,
  fetchAllPages,
  formatDate,
  formatPaise,
  getDocument,
  getErrorMessage,
  getId,
  supplierQuotationPath,
} from "./supplierQuotation.utils";

import "./SupplierQuotations.css";

function SupplierQuotationsList() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [quotations, setQuotations] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadSequence = useRef(0);
  const deleteLock = useRef(false);
  const mountedRef = useRef(false);

  const loadQuotations = useCallback(async () => {
    const sequence = ++loadSequence.current;

    try {
      setLoading(true);

      const [records, supplierRecords] = await Promise.all([
        fetchAllPages(
          api.supplierQuotation.getAll,
          "quotations",
        ),

        fetchAllPages(
          api.supplierQuotation.getSuppliers,
          "suppliers",
        ),
      ]);

      if (sequence !== loadSequence.current) return;

      setQuotations(records);
      setSuppliers(supplierRecords);
    } catch (error) {
      if (sequence !== loadSequence.current) return;

      toast.error(getErrorMessage(error));
    } finally {
      if (sequence === loadSequence.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadQuotations();

    return () => {
      mountedRef.current = false;
      loadSequence.current += 1;
    };
  }, [loadQuotations]);

  const supplierMap = useMemo(
    () =>
      new Map(
        suppliers.map((supplier) => [
          getId(supplier),
          supplier,
        ]),
      ),
    [suppliers],
  );

  const rows = useMemo(
    () =>
      quotations.map((quotation) => {
        const supplier = supplierMap.get(
          getId(quotation.supplierId),
        );

        return {
          ...quotation,

          supplierName:
            quotation.supplierName ||
            supplier?.supplierName ||
            "Supplier unavailable",

          supplierCode:
            quotation.supplierCode ||
            supplier?.supplierCode ||
            "—",
        };
      }),
    [quotations, supplierMap],
  );

  const handleView = useCallback(
    (row) => {
      if (!row.quotationNumber) {
        toast.error("Quotation number is missing.");
        return;
      }

      navigate(
        supplierQuotationPath(row.quotationNumber),
      );
    },
    [navigate],
  );

  const handleEdit = (row) => {
    if (row.status !== "CREATED") {
      toast.error("Only CREATED quotations can be edited.");
      return;
    }

    navigate(
      supplierQuotationPath(
        row.quotationNumber,
        "edit",
      ),
    );
  };

  const handleDelete = async (row) => {
    if (deleteLock.current) return;

    if (row.status !== "CREATED") {
      toast.error("Only CREATED quotations can be deleted.");
      return;
    }

    try {
      deleteLock.current = true;

      const response =
        await api.supplierQuotation.getByNumber(
          row.quotationNumber,
        );

      const latest = getDocument(response);

      if (
        !latest?._id ||
        latest.status !== "CREATED" ||
        !Number.isSafeInteger(latest.__v)
      ) {
        throw new Error(
          "The quotation changed. Refresh the list.",
        );
      }

      if (mountedRef.current) {
        setDeleteTarget(latest);
      }
    } catch (error) {
      if (mountedRef.current) {
        toast.error(getErrorMessage(error));
      }
    } finally {
      deleteLock.current = false;
    }
  };

  const confirmDelete = async () => {
    if (deleteLock.current || !deleteTarget) return;

    try {
      deleteLock.current = true;
      setDeleting(true);

      await api.supplierQuotation.delete(
        deleteTarget.quotationNumber,
        {
          version: deleteTarget.__v,
        },
      );

      if (!mountedRef.current) return;

      setQuotations((previous) =>
        previous.filter(
          (quotation) =>
            quotation._id !== deleteTarget._id,
        ),
      );

      setDeleteTarget(null);

      toast.success(
        "Supplier Quotation deleted successfully.",
      );
    } catch (error) {
      if (mountedRef.current) {
        toast.error(getErrorMessage(error));
      }
    } finally {
      deleteLock.current = false;

      if (mountedRef.current) {
        setDeleting(false);
      }
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "quotationNumber",
        label: "Quotation Number",
        sortable: true,

        render: (value, row) => (
          <div className="squ-document-cell">
            <button
              type="button"
              className="squ-document-link"
              onClick={(event) => {
                event.stopPropagation();
                handleView(row);
              }}
            >
              {value || "—"}
            </button>

            <span>
              {row.supplierReferenceNumber ||
                "No supplier reference"}
            </span>
          </div>
        ),
      },

      {
        key: "supplierName",
        label: "Supplier",
        sortable: true,

        render: (value, row) => (
          <div className="squ-document-cell">
            <strong>{value}</strong>
            <span>{row.supplierCode}</span>
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
        key: "creationMode",
        label: "Source",
        sortable: true,

        render: (value, row) => (
          <div className="squ-document-cell">
            <span className="squ-source-badge">
              {value === "RFQ" ? "RFQ" : "Direct"}
            </span>

            {row.sourceRfqNumber && (
              <span>{row.sourceRfqNumber}</span>
            )}
          </div>
        ),
      },

      {
        key: "totalAmountPaise",
        label: "Quoted Amount",
        type: "number",
        sortable: true,

        render: (value) => (
          <strong className="squ-money">
            {formatPaise(value)}
          </strong>
        ),
      },

      {
        key: "status",
        label: "Status",
        sortable: true,

        render: (value) => (
          <StatusField value={value || "CREATED"} />
        ),
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
        sortable: true,
        visible: false,
      },

      {
        key: "notes",
        label: "Notes",
        visible: false,
        render: (value) => value || "—",
      },
    ],
    [handleView],
  );

  return (
    <div className="squ-list-page">
      <DataList
        title="Supplier Quotations"
        subtitle="Record supplier offers and prepare them for comparison"
        columns={columns}
        data={rows}
        loading={loading}
        rowKey="_id"
        showCase="list"
        searchable
        sortable
        filterable
        selectable
        columnVisibility
        pagination
        storageKey="trustiq-supplier-quotations"
        searchPlaceholder="Search quotation, supplier, reference, RFQ..."
        filters={[
          {
            key: "status",
            label: "Status",
            type: "select",
            options: ["CREATED", "CANCELLED"],
          },
          {
            key: "creationMode",
            label: "Source",
            type: "select",
            options: ["DIRECT", "RFQ"],
          },
        ]}
        quickFilters={[
          { key: "status", value: "", label: "All" },
          {
            key: "status",
            value: "CREATED",
            label: "Created",
          },
          {
            key: "creationMode",
            value: "RFQ",
            label: "RFQ Offers",
          },
          {
            key: "creationMode",
            value: "DIRECT",
            label: "Direct",
          },
          {
            key: "status",
            value: "CANCELLED",
            label: "Cancelled",
          },
        ]}
        actions={{
          view: handleView,
          edit: handleEdit,
          delete: handleDelete,
        }}
        onRefresh={loadQuotations}
        addButton={
          <button
            type="button"
            className="squ-primary-button"
            onClick={() =>
              navigate(
                `${SUPPLIER_QUOTATION_BASE}/create`,
              )
            }
          >
            <Plus size={16} />
            <span>New Supplier Quotation</span>
          </button>
        }
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        type="danger"
        title="Delete Supplier Quotation?"
        message={`Delete ${
          deleteTarget?.quotationNumber || "this quotation"
        }?`}
        confirmText="Delete Quotation"
        cancelText="Keep Quotation"
        loading={deleting}
        onCancel={() => {
          if (!deleteLock.current) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

export default SupplierQuotationsList;