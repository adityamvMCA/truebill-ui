import { Plus, RotateCcw, ReceiptText, Wallet } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";

import DataList from "../../components/common/DataList/DataList";
import StatusField from "../../components/common/StatusField/StatusField";
import api from "../../services/api";

import PurchaseReturnModal from "./PurchaseReturnModal";

import {
  fetchAllReturns,
  formatDate,
  formatMoney,
  getErrorMessage,
  isCancelledRequest,
} from "./purchaseReturn.utils";

import "./PurchaseReturns.css";

function PurchaseReturnsList() {
  const [loading, setLoading] = useState(true);
  const [purchaseReturns, setPurchaseReturns] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [modalMode, setModalMode] = useState("create");

  const requestRef = useRef(null);

  const loadPurchaseReturns = useCallback(async () => {
    requestRef.current?.abort();

    const controller = new AbortController();
    requestRef.current = controller;

    try {
      setLoading(true);

      const records = await fetchAllReturns(
        api.purchaseReturn.getAll,
        {},
        controller.signal,
      );

      if (!controller.signal.aborted) {
        setPurchaseReturns(records);
      }
    } catch (error) {
      if (!isCancelledRequest(error)) {
        console.error("Unable to load Purchase Returns:", error);
        toast.error(getErrorMessage(error));
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadPurchaseReturns();

    return () => requestRef.current?.abort();
  }, [loadPurchaseReturns]);

  const summary = useMemo(
    () => ({
      count: purchaseReturns.length,

      totalPaise: purchaseReturns.reduce(
        (sum, row) => sum + Number(row.totalAmountPaise || 0),
        0,
      ),

      stockReturnCount: purchaseReturns.filter((row) =>
        row.items?.some((item) => item.stockReturned),
      ).length,
    }),
    [purchaseReturns],
  );

  const columns = useMemo(
    () => [
      {
        key: "returnNumber",
        label: "Return Number",
        sortable: true,

        render: (value, row) => (
          <div className="pr-document-cell">
            <strong>{value || "—"}</strong>
            <span>{row.billNumber || "No bill reference"}</span>
          </div>
        ),
      },

      {
        key: "returnDate",
        label: "Return Date",
        sortable: true,
        render: (value) => formatDate(value),
      },

      {
        key: "supplierName",
        label: "Supplier",
        sortable: true,

        render: (value, row) => (
          <div className="pr-document-cell">
            <strong>{value || "—"}</strong>
            <span>{row.supplierCode || "—"}</span>
          </div>
        ),
      },

      {
        key: "billNumber",
        label: "Purchase Bill",
        sortable: true,
        render: (value) => value || "—",
      },

      {
        key: "totalAmountPaise",
        label: "Return Amount",
        sortable: true,

        render: (value) => (
          <span className="pr-money">{formatMoney(value)}</span>
        ),
      },

      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (value) => <StatusField value={value || "POSTED"} />,
      },

      {
        key: "reason",
        label: "Reason",
        sortable: false,
        visible: false,
        render: (value) => value || "—",
      },
    ],
    [],
  );

  const openModal = (mode, row = null) => {
    setSelectedReturn(row);
    setModalMode(mode);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedReturn(null);
  };

  return (
    <div className="pr-page">
      <div className="pr-summary-grid">
        <div className="pr-stat-card">
          <div className="pr-stat-icon pr-stat-icon--blue">
            <RotateCcw size={21} />
          </div>

          <div>
            <span className="pr-stat-label">Purchase Returns</span>
            <strong className="pr-stat-value">{summary.count}</strong>
          </div>
        </div>

        <div className="pr-stat-card">
          <div className="pr-stat-icon pr-stat-icon--green">
            <Wallet size={21} />
          </div>

          <div>
            <span className="pr-stat-label">Total Return Value</span>
            <strong className="pr-stat-value">
              {formatMoney(summary.totalPaise)}
            </strong>
          </div>
        </div>

        <div className="pr-stat-card">
          <div className="pr-stat-icon pr-stat-icon--amber">
            <ReceiptText size={21} />
          </div>

          <div>
            <span className="pr-stat-label">Returns With Stock Movement</span>
            <strong className="pr-stat-value">
              {summary.stockReturnCount}
            </strong>
          </div>
        </div>
      </div>

      <DataList
        title="Purchase Returns"
        subtitle="Record supplier returns with automatic accounting and stock adjustments"
        columns={columns}
        data={purchaseReturns}
        loading={loading}
        rowKey="_id"
        showCase="list"
        searchable
        filterable
        sortable
        selectable={false}
        columnVisibility
        pagination
        filters={[
          {
            key: "status",
            label: "Status",
            type: "select",
            options: ["POSTED"],
          },
        ]}
        quickFilters={[
          {
            key: "status",
            value: "",
            label: "All Returns",
          },
          {
            key: "status",
            value: "POSTED",
            label: "Posted",
          },
        ]}
        storageKey="trustiq-purchase-returns"
        searchPlaceholder="Search return number, bill, supplier..."
        actions={{
          view: (row) => openModal("view", row),
        }}
        onRefresh={loadPurchaseReturns}
        addButton={
          <button
            type="button"
            className="pr-primary-button"
            onClick={() => openModal("create")}
          >
            <Plus size={17} />
            <span>New Purchase Return</span>
          </button>
        }
      />

      <PurchaseReturnModal
        isOpen={showModal}
        onClose={closeModal}
        onSave={loadPurchaseReturns}
        editData={selectedReturn}
        mode={modalMode}
      />
    </div>
  );
}

export default PurchaseReturnsList;
