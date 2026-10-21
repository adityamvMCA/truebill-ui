import { ClipboardList, PackageCheck, Plus, Truck } from "lucide-react";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import toast from "react-hot-toast";

import DataList from "../../components/common/DataList/DataList";
import StatusField from "../../components/common/StatusField/StatusField";
import api from "../../services/api";

import GoodsReceiptModal from "./GoodsReceiptModal";

import {
  fetchAllPages,
  formatDate,
  getErrorMessage,
  isCancelledRequest,
} from "./goodsReceipt.utils";

import "./GoodsReceipts.css";

function GoodsReceiptsList() {
  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [modalMode, setModalMode] = useState("create");

  const requestRef = useRef(null);

  const loadReceipts = useCallback(async () => {
    requestRef.current?.abort();

    const controller = new AbortController();
    requestRef.current = controller;

    try {
      setLoading(true);

      const records = await fetchAllPages(
        api.goodsReceipt.getAll,
        {},
        controller.signal,
      );

      if (!controller.signal.aborted) {
        setReceipts(records);
      }
    } catch (error) {
      if (!isCancelledRequest(error)) {
        console.error("Unable to load Goods Receipts:", error);
        toast.error(getErrorMessage(error));
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadReceipts();

    return () => requestRef.current?.abort();
  }, [loadReceipts]);

  const summary = useMemo(
    () => ({
      total: receipts.length,

      orderBased: receipts.filter(
        (row) => row.creationMode === "PURCHASE_ORDER",
      ).length,

      direct: receipts.filter((row) => row.creationMode === "DIRECT").length,
    }),
    [receipts],
  );

  const columns = useMemo(
    () => [
      {
        key: "receiptNumber",
        label: "Receipt Number",
        sortable: true,

        render: (value, row) => (
          <button
            type="button"
            className="gr-receipt-link"
            onClick={(event) => {
              event.stopPropagation();
              openModal("view", row);
            }}
          >
            {value || row.receiptNumber || "—"}
          </button>
        ),
      },

      {
        key: "receiptDate",
        label: "Receipt Date",
        sortable: true,
        render: (value) => formatDate(value),
      },

      {
        key: "supplierName",
        label: "Supplier",
        sortable: true,

        render: (value, row) => (
          <div className="gr-document-cell">
            <strong>{value || "—"}</strong>
            <span>{row.supplierCode || "—"}</span>
          </div>
        ),
      },

      {
        key: "creationMode",
        label: "Receipt Type",
        sortable: true,

        render: (value) => (
          <span
            className={`gr-badge ${
              value === "PURCHASE_ORDER" ? "gr-badge--blue" : "gr-badge--purple"
            }`}
          >
            {value === "PURCHASE_ORDER" ? "Purchase Order" : "Direct Receipt"}
          </span>
        ),
      },

      {
        key: "sourceOrderNumber",
        label: "Purchase Order",
        sortable: true,
        render: (value) => value || "—",
      },

      {
        key: "items",
        label: "Receipt Lines",
        sortable: false,
        render: (value) => value?.length || 0,
      },

      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (value) => <StatusField value={value || "CREATED"} />,
      },

      {
        key: "notes",
        label: "Notes",
        visible: false,
        sortable: false,
        render: (value) => value || "—",
      },
    ],
    [],
  );

  const openModal = (mode, row = null) => {
    setModalMode(mode);
    setSelectedReceipt(row);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedReceipt(null);
  };

  return (
    <div className="gr-page">
      <div className="gr-stat-grid">
        <StatCard
          icon={PackageCheck}
          label="Goods Receipts"
          value={summary.total}
          color="blue"
        />

        <StatCard
          icon={ClipboardList}
          label="Against Purchase Orders"
          value={summary.orderBased}
          color="green"
        />

        <StatCard
          icon={Truck}
          label="Direct Receipts"
          value={summary.direct}
          color="purple"
        />
      </div>

      <DataList
        title="Goods Receipts"
        subtitle="Receive goods, record service acceptance, and track supplier deliveries"
        columns={columns}
        data={receipts}
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
            key: "creationMode",
            label: "Receipt Type",
            type: "select",
            options: ["DIRECT", "PURCHASE_ORDER"],
          },
        ]}
        quickFilters={[
          {
            key: "creationMode",
            value: "",
            label: "All Receipts",
          },
          {
            key: "creationMode",
            value: "PURCHASE_ORDER",
            label: "Purchase Orders",
          },
          {
            key: "creationMode",
            value: "DIRECT",
            label: "Direct",
          },
        ]}
        storageKey="trustiq-goods-receipts"
        searchPlaceholder="Search receipt, supplier, purchase order..."
        actions={{
          view: (row) => openModal("view", row),
        }}
        onRefresh={loadReceipts}
        addButton={
          <button
            type="button"
            className="gr-primary-button"
            onClick={() => openModal("create")}
          >
            <Plus size={17} />
            <span>New Goods Receipt</span>
          </button>
        }
      />

      <GoodsReceiptModal
        isOpen={showModal}
        onClose={closeModal}
        onSave={loadReceipts}
        editData={selectedReceipt}
        mode={modalMode}
      />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="gr-stat-card">
      <div className={`gr-stat-icon gr-stat-icon--${color}`}>
        <Icon size={22} />
      </div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

export default GoodsReceiptsList;
