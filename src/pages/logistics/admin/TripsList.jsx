import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Truck, Navigation, Share2, MapPin, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";

import DataList from "../../../components/common/DataList/DataList";
import StatusField from "../../../components/common/StatusField/StatusField";
import logisticsApi from "../../../services/modules/logisticsApi";

const filters = [
  {
    key: "status",
    label: "Status",
    type: "select",
    options: ["STARTED", "SCHEDULED", "COMPLETED", "CANCELLED"],
  },
];

const quickFilters = [
  { key: "status", value: "", label: "All Trips" },
  { key: "status", value: "STARTED", label: "In Transit" },
  { key: "status", value: "SCHEDULED", label: "Scheduled" },
  { key: "status", value: "COMPLETED", label: "Delivered" },
];

export default function TripsList() {
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState([]);
  const navigate = useNavigate();
  const requestVersion = useRef(0);

  const loadTrips = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);

    try {
      const response = await logisticsApi.getTrips();
      if (version !== requestVersion.current) return;

      const list = response?.data?.data || response?.data || [];
      setTrips(Array.isArray(list) ? list : []);
    } catch (error) {
      if (version !== requestVersion.current) return;
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load trips list",
      );
      setTrips([]);
    } finally {
      if (version === requestVersion.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const copyTrackingLink = (token) => {
    if (!token) {
      toast.error("Tracking token not available");
      return;
    }
    const url = `${window.location.origin}/track/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Customer tracking link copied to clipboard!");
  };

  const columns = useMemo(
    () => [
      {
        key: "tripNumber",
        label: "Trip #",
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
            {value || "TRP"}
          </span>
        ),
      },
      {
        key: "customerName",
        label: "Customer & Destination",
        sortable: true,
        render: (value, row) => (
          <div className="dl-customer">
            <strong style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Truck size={14} className="text-muted" />
              {value || "Unknown Customer"}
            </strong>
            <span
              style={{
                fontSize: "12px",
                color: "var(--text-muted, #64748b)",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <MapPin size={11} />
              {row.destination?.address || "No address provided"}
            </span>
          </div>
        ),
      },
      {
        key: "driverName",
        label: "Driver / Vehicle",
        sortable: true,
        render: (value, row) => (
          <div>
            <strong>{value || "Unassigned"}</strong>
            <div
              style={{
                fontSize: "11px",
                color: "var(--text-muted, #64748b)",
                marginTop: "2px",
              }}
            >
              {row.vehicleNumber || row.vehicleType || "Fleet Vehicle"}
            </div>
          </div>
        ),
      },
      {
        key: "status",
        label: "Trip Status",
        sortable: true,
        render: (value) => <StatusField value={value || "SCHEDULED"} />,
      },
      {
        key: "distanceCoveredKm",
        label: "Distance Covered",
        sortable: true,
        render: (value) => (
          <span style={{ fontWeight: 600 }}>{value ? `${value} km` : "0 km"}</span>
        ),
      },
      {
        key: "createdAt",
        label: "Date & Time",
        sortable: true,
        render: (value, row) => {
          const dateStr = value ? new Date(value).toLocaleDateString() : "—";
          const timeStr = row.startedAt
            ? `Started: ${new Date(row.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
            : row.completedAt
              ? `Delivered: ${new Date(row.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : "Not started";

          return (
            <div>
              <div style={{ fontSize: "12px", fontWeight: 600 }}>{dateStr}</div>
              <div style={{ fontSize: "11px", color: "var(--text-muted, #64748b)" }}>
                {timeStr}
              </div>
            </div>
          );
        },
      },
      {
        key: "trackingToken",
        label: "Actions",
        sortable: false,
        render: (token, row) => (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              type="button"
              onClick={() => copyTrackingLink(token)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 8px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: 600,
                border: "1px solid var(--border-color, #e2e8f0)",
                backgroundColor: "#fff",
                cursor: "pointer",
                color: "var(--text-main, #334155)",
              }}
              title="Copy customer tracking URL"
            >
              <Share2 size={12} />
              <span>Share</span>
            </button>
            <button
              type="button"
              onClick={() => navigate(`/track/${token}`)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 8px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: 600,
                border: "1px solid var(--border-color, #e2e8f0)",
                backgroundColor: "#fff",
                cursor: "pointer",
                color: "var(--text-main, #334155)",
              }}
              title="Preview Customer Live Map"
            >
              <ExternalLink size={12} />
              <span>View</span>
            </button>
          </div>
        ),
      },
    ],
    [navigate],
  );

  return (
    <DataList
      title="Logistics Trips & Dispatches"
      subtitle="Track delivery dispatches, receiver confirmations, distance traveled and active GPS routes"
      columns={columns}
      data={trips}
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
      storageKey="trustiq-logistics-trips"
      searchPlaceholder="Search trip #, customer, driver, address..."
      onRefresh={loadTrips}
      addButton={
        <button
          type="button"
          className="so-primary-button"
          onClick={() => navigate("/logistics/fleet")}
        >
          <Navigation size={16} />
          <span>Live Fleet Map</span>
        </button>
      }
    />
  );
}
