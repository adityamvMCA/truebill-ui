import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Truck } from "lucide-react";
import toast from "react-hot-toast";

import DataList from "../../components/common/DataList/DataList";
import StatusField from "../../components/common/StatusField/StatusField";
import transporterApi from "../../services/modules/transporterApi";
import TransporterModal from "./TransporterModal";

const filters = [
  {
    key: "transportMode",
    label: "Mode",
    type: "select",
    options: ["ROAD", "RAIL", "AIR", "SHIP"],
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: ["ACTIVE", "INACTIVE"],
  },
];

const quickFilters = [
  { key: "status", value: "", label: "All" },
  { key: "status", value: "ACTIVE", label: "Active" },
  { key: "status", value: "INACTIVE", label: "Inactive" },
  { key: "transportMode", value: "ROAD", label: "Road" },
  { key: "transportMode", value: "RAIL", label: "Rail" },
  { key: "transportMode", value: "AIR", label: "Air" },
  { key: "transportMode", value: "SHIP", label: "Ship" },
];

export default function TransportersList() {
  const [loading, setLoading] = useState(true);
  const [transporters, setTransporters] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [busy, setBusy] = useState(false);

  const requestVersion = useRef(0);

  const loadTransporters = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);

    try {
      const response = await transporterApi.getAll({
        page: 1,
        limit: 100,
      });

      if (version !== requestVersion.current) return;

      const resData = response?.data || response;
      const list = Array.isArray(resData?.data)
        ? resData.data
        : Array.isArray(resData)
          ? resData
          : [];

      setTransporters(list);
    } catch (error) {
      if (version !== requestVersion.current) return;
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to load transporters";
      toast.error(msg);
      setTransporters([]);
    } finally {
      if (version === requestVersion.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadTransporters();
  }, [loadTransporters]);

  const handleCreate = () => {
    setEditData(null);
    setShowModal(true);
  };

  const handleEdit = (row) => {
    setEditData(row);
    setShowModal(true);
  };

  const handleDelete = async (row) => {
    if (!row?._id) return;
    const confirmed = window.confirm(
      `Are you sure you want to remove transporter "${row.transporterName || row.name}"?`,
    );
    if (!confirmed) return;

    try {
      setBusy(true);
      await transporterApi.delete(row._id);
      toast.success("Transporter removed successfully");
      loadTransporters();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to remove transporter",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSaved = () => {
    loadTransporters();
  };

  const columns = useMemo(
    () => [
      {
        key: "transporterName",
        label: "Transporter Name",
        sortable: true,
        render: (value, row) => (
          <div className="dl-customer">
            <strong style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Truck size={14} className="text-muted" />
              {value || "N/A"}
            </strong>
            <span style={{ fontSize: "12px", color: "var(--text-muted, #64748b)" }}>
              {[row.phone, row.city, row.state].filter(Boolean).join(" • ")}
            </span>
          </div>
        ),
      },
      {
        key: "transporterId",
        label: "Transporter ID / GSTIN",
        sortable: true,
        render: (value) => <strong>{value || "—"}</strong>,
      },
      {
        key: "transportMode",
        label: "Mode",
        sortable: true,
        render: (value) => (
          <span
            style={{
              padding: "2px 8px",
              borderRadius: "4px",
              fontSize: "12px",
              fontWeight: 600,
              backgroundColor: "var(--bg-tag, #f1f5f9)",
              color: "var(--text-main, #334155)",
            }}
          >
            {value || "ROAD"}
          </span>
        ),
      },
      {
        key: "vehicleNumber",
        label: "Vehicle No.",
        sortable: true,
        render: (value) => value || "—",
      },
      {
        key: "vehicleType",
        label: "Vehicle Type",
        sortable: true,
        render: (value) => value || "REGULAR",
      },
      {
        key: "distanceKm",
        label: "Distance",
        sortable: true,
        render: (value) => (value ? `${value} km` : "—"),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (value) => <StatusField value={value || "ACTIVE"} />,
      },
    ],
    [],
  );

  return (
    <>
      <DataList
        title="Transporters"
        subtitle="Manage transport details, carriers, vehicles and GSTIN for dispatch & e-way bills"
        columns={columns}
        data={transporters}
        loading={loading || busy}
        rowKey="_id"
        showCase="list"
        searchable
        filterable
        sortable
        columnVisibility
        pagination
        filters={filters}
        quickFilters={quickFilters}
        storageKey="trustiq-transporters"
        searchPlaceholder="Search transporter name, GSTIN, vehicle, city, phone..."
        actions={{
          edit: handleEdit,
          delete: handleDelete,
        }}
        onRefresh={loadTransporters}
        addButton={
          <button
            type="button"
            className="so-primary-button"
            onClick={handleCreate}
            disabled={busy}
          >
            <Plus size={16} />
            <span>New Transporter</span>
          </button>
        }
      />

      <TransporterModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditData(null);
        }}
        onSave={handleSaved}
        editData={editData}
      />
    </>
  );
}
