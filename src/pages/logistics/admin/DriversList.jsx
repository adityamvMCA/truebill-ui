import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, User, Phone, Truck, Shield } from "lucide-react";
import toast from "react-hot-toast";

import DataList from "../../../components/common/DataList/DataList";
import StatusField from "../../../components/common/StatusField/StatusField";
import logisticsApi from "../../../services/modules/logisticsApi";
import DriverModal from "./DriverModal";

const filters = [
  {
    key: "vehicleType",
    label: "Vehicle Type",
    type: "select",
    options: ["TRUCK", "VAN", "TEMPO", "THREE_WHEELER", "BIKE"],
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    options: ["AVAILABLE", "ON_TRIP", "OFF_DUTY", "INACTIVE"],
  },
];

const quickFilters = [
  { key: "status", value: "", label: "All Drivers" },
  { key: "status", value: "AVAILABLE", label: "Available" },
  { key: "status", value: "ON_TRIP", label: "On Trip" },
  { key: "status", value: "OFF_DUTY", label: "Off Duty" },
  { key: "status", value: "INACTIVE", label: "Inactive" },
];

export default function DriversList() {
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [busy, setBusy] = useState(false);

  const requestVersion = useRef(0);

  const loadDrivers = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);

    try {
      const response = await logisticsApi.getDrivers();
      if (version !== requestVersion.current) return;

      const list = response?.data?.data || response?.data || [];
      setDrivers(Array.isArray(list) ? list : []);
    } catch (error) {
      if (version !== requestVersion.current) return;
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load drivers",
      );
      setDrivers([]);
    } finally {
      if (version === requestVersion.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadDrivers();
  }, [loadDrivers]);

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
      `Are you sure you want to deactivate and remove driver "${row.name}"?`,
    );
    if (!confirmed) return;

    try {
      setBusy(true);
      await logisticsApi.deleteDriver(row._id);
      toast.success("Driver removed successfully");
      loadDrivers();
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to remove driver",
      );
    } finally {
      setBusy(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "driverCode",
        label: "Driver Code",
        sortable: true,
        render: (value) => (
          <span
            style={{
              fontFamily: "monospace",
              fontWeight: 700,
              fontSize: "12px",
              padding: "2px 6px",
              borderRadius: "4px",
              backgroundColor: "var(--bg-tag, #f1f5f9)",
              color: "var(--text-main, #334155)",
            }}
          >
            {value || "DRV"}
          </span>
        ),
      },
      {
        key: "name",
        label: "Driver Name",
        sortable: true,
        render: (value, row) => (
          <div className="dl-customer">
            <strong style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <User size={14} className="text-muted" />
              {value || "N/A"}
            </strong>
            <span style={{ fontSize: "12px", color: "var(--text-muted, #64748b)" }}>
              {row.email || "No email assigned"}
            </span>
          </div>
        ),
      },
      {
        key: "phone",
        label: "Phone / Login ID",
        sortable: true,
        render: (value) => (
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Phone size={13} style={{ color: "var(--text-muted, #64748b)" }} />
            <strong>{value || "—"}</strong>
          </span>
        ),
      },
      {
        key: "vehicleNumber",
        label: "Assigned Vehicle",
        sortable: true,
        render: (value, row) => (
          <div>
            <strong>{value || "Not assigned"}</strong>
            {row.vehicleType && (
              <span
                style={{
                  marginLeft: "6px",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  fontSize: "10px",
                  fontWeight: 600,
                  backgroundColor: "var(--bg-tag, #f1f5f9)",
                  color: "var(--text-muted, #475569)",
                }}
              >
                {row.vehicleType}
              </span>
            )}
          </div>
        ),
      },
      {
        key: "licenseNumber",
        label: "License Number",
        sortable: true,
        render: (value) => (
          <span style={{ fontFamily: "monospace", fontSize: "12px" }}>
            {value || "—"}
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (value) => <StatusField value={value || "AVAILABLE"} />,
      },
    ],
    [],
  );

  return (
    <>
      <DataList
        title="Fleet Drivers"
        subtitle="Manage company drivers, assigned delivery vehicles, login credentials and real-time status"
        columns={columns}
        data={drivers}
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
        storageKey="trustiq-fleet-drivers"
        searchPlaceholder="Search driver name, phone, code, vehicle number..."
        actions={{
          edit: handleEdit,
          delete: handleDelete,
        }}
        onRefresh={loadDrivers}
        addButton={
          <button
            type="button"
            className="so-primary-button"
            onClick={handleCreate}
            disabled={busy}
          >
            <Plus size={16} />
            <span>New Driver</span>
          </button>
        }
      />

      <DriverModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditData(null);
        }}
        onSave={loadDrivers}
        editData={editData}
      />
    </>
  );
}
