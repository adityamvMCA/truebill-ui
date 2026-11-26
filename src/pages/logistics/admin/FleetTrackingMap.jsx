import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Truck,
  MapPin,
  Navigation,
  RefreshCw,
  Search,
  Plus,
  Radio,
  Phone,
  Clock,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  X,
  Share2,
  Activity,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Compass,
} from "lucide-react";
import toast from "react-hot-toast";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import BoxModal from "../../../components/common/Modal/BoxModal";
import Button from "../../../components/common/Form/Button";
import Input from "../../../components/common/Form/Input";
import Select from "../../../components/common/Form/Select";
import Textarea from "../../../components/common/Form/Textarea";
import StatusField from "../../../components/common/StatusField/StatusField";
import logisticsApi from "../../../services/modules/logisticsApi";
import { createLogisticsSocket } from "../../../services/modules/logisticsSocket";

export default function FleetTrackingMap() {
  const [trips, setTrips] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [stats, setStats] = useState({
    activeTrips: 0,
    totalDrivers: 0,
    onTripDrivers: 0,
    completedToday: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("STARTED"); // "ALL" | "STARTED" | "SCHEDULED" | "COMPLETED"
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const [sidePanelOpen, setSidePanelOpen] = useState(() => typeof window !== "undefined" && window.innerWidth >= 768);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Responsive resize handler & map invalidator
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Invalidate map size on fullscreen, side panel toggle, or mobile viewport shift
  useEffect(() => {
    const timer1 = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 100);
    const timer2 = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 350);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isFullScreen, sidePanelOpen, isMobile]);

  // Fit all vehicles on screen
  const fitAllVehicles = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const filtered = trips.filter((t) => {
      if (statusFilter === "STARTED") return t.status === "STARTED";
      if (statusFilter === "SCHEDULED") return t.status === "SCHEDULED";
      if (statusFilter === "COMPLETED") return t.status === "COMPLETED";
      return true;
    });

    const validBounds = [];
    filtered.forEach((t) => {
      const lat = t.currentLocation?.lat || t.destination?.lat;
      const lng = t.currentLocation?.lng || t.destination?.lng;
      if (lat && lng) validBounds.push([lat, lng]);
    });

    if (validBounds.length > 0) {
      try {
        map.fitBounds(validBounds, { padding: [60, 60], maxZoom: 15 });
      } catch {}
    } else {
      map.setView([20.5937, 78.9629], 5);
    }
  }, [trips, statusFilter]);

  // Map & Socket refs
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({}); // tripId -> L.marker
  const polylineRef = useRef(null);
  const socketRef = useRef(null);

  // 1. Initial Load: stats, trips, drivers
  useEffect(() => {
    loadAllData();

    // 2. Setup Socket.io connection for live vehicle updates
    const socket = createLogisticsSocket();
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsSocketConnected(true);
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const tenantId =
        user?.activeTenantId ||
        user?.primaryTenantId ||
        user?.tenantId ||
        user?.tenant?._id;

      if (tenantId) {
        socket.emit("trip:join", { tenantId });
      }
    });

    socket.on("disconnect", () => {
      setIsSocketConnected(false);
    });

    // Real-time Driver GPS update broadcasted across tenant
    socket.on("fleet:driver_update", (data) => {
      const { tripId, location, driverId } = data;
      if (!tripId || !location) return;

      setTrips((prevTrips) =>
        prevTrips.map((t) => {
          if (t._id === tripId) {
            const updatedBreadcrumbs = [
              ...(t.locationBreadcrumbs || []),
              {
                lat: location.lat,
                lng: location.lng,
                timestamp: location.timestamp || new Date(),
                speed: location.speed || 0,
              },
            ];

            return {
              ...t,
              status: "STARTED",
              currentLocation: {
                lat: location.lat,
                lng: location.lng,
                speed: location.speed || 0,
                heading: location.heading || 0,
                updatedAt: location.timestamp || new Date(),
              },
              locationBreadcrumbs: updatedBreadcrumbs,
            };
          }
          return t;
        }),
      );

      updateVehicleMarkerOnMap(tripId, location, driverId);
    });

    // Real-time trip status changes
    socket.on("trip:status_change", ({ tripId, status }) => {
      setTrips((prev) =>
        prev.map((t) => (t._id === tripId ? { ...t, status } : t)),
      );
      loadAllData(false);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  const loadAllData = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      setRefreshing(true);

      const [tripsRes, driversRes, statsRes] = await Promise.allSettled([
        logisticsApi.getTrips(),
        logisticsApi.getDrivers(),
        logisticsApi.getFleetStats(),
      ]);

      const tripsList =
        tripsRes.status === "fulfilled"
          ? tripsRes.value?.data?.data || tripsRes.value?.data || []
          : [];
      const driversList =
        driversRes.status === "fulfilled"
          ? driversRes.value?.data?.data || driversRes.value?.data || []
          : [];
      const dashStats =
        statsRes.status === "fulfilled"
          ? statsRes.value?.data?.data || {}
          : {};

      setTrips(Array.isArray(tripsList) ? tripsList : []);
      setDrivers(Array.isArray(driversList) ? driversList : []);
      setStats({
        activeTrips:
          dashStats.activeTrips ??
          (Array.isArray(tripsList) ? tripsList.filter((t) => t.status === "STARTED").length : 0),
        totalDrivers:
          dashStats.totalDrivers ?? (Array.isArray(driversList) ? driversList.length : 0),
        onTripDrivers:
          dashStats.onTripDrivers ??
          (Array.isArray(driversList) ? driversList.filter((d) => d.status === "ON_TRIP").length : 0),
        completedToday:
          dashStats.completedToday ??
          (Array.isArray(tripsList) ? tripsList.filter((t) => t.status === "COMPLETED").length : 0),
      });

      if (tripsRes.status === "rejected" && driversRes.status === "rejected") {
        const err = tripsRes.reason || driversRes.reason;
        toast.error(err?.response?.data?.message || "Failed to load fleet tracking data");
      }
    } catch (err) {
      console.error("Failed to load fleet data:", err);
      toast.error(err?.response?.data?.message || "Failed to refresh fleet tracking data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // -------------------------------------------------------------
  // LEAFLET MAP INITIALIZATION & VEHICLE MARKERS
  // -------------------------------------------------------------
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false,
      }).setView([20.5937, 78.9629], 5); // Default India center

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      mapInstanceRef.current = map;

      // Invalidate size once DOM mounts container
      setTimeout(() => {
        map.invalidateSize();
      }, 150);
      setTimeout(() => {
        map.invalidateSize();
      }, 400);
    }

    renderAllMarkersOnMap();
  }, [trips, statusFilter]);

  // Create custom vector vehicle icon
  const createVehicleIcon = (t, isSelected = false) => {
    const isMoving = t.status === "STARTED";
    const speed = t.currentLocation?.speed || 0;
    const bgCol = isMoving ? "#0ea5e9" : "#64748b";
    const borderCol = isSelected ? "#0284c7" : "#ffffff";

    return L.divIcon({
      className: `vehicle-marker-${t._id}`,
      html: `
        <div style="position:relative;width:40px;height:40px;cursor:pointer;">
          ${
            isMoving
              ? `<span style="position:absolute;inset:0;border-radius:50%;background:#0ea5e9;opacity:0.35;animation:ping 1.8s cubic-bezier(0,0,0.2,1) infinite;"></span>`
              : ""
          }
          <div style="position:relative;background:${bgCol};width:40px;height:40px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:white;box-shadow:0 3px 10px rgba(0,0,0,0.2);border:3px solid ${borderCol};">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <rect x="1" y="3" width="15" height="13"></rect>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
              <circle cx="5.5" cy="18.5" r="2.5"></circle>
              <circle cx="18.5" cy="18.5" r="2.5"></circle>
            </svg>
          </div>
          ${
            isMoving && speed > 0
              ? `<div style="position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);background:#0f172a;color:#38bdf8;font-size:9px;font-weight:800;padding:1px 5px;border-radius:6px;border:1px solid #0ea5e9;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.2);">
                  ${speed} km/h
                </div>`
              : ""
          }
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20],
    });
  };

  const renderAllMarkersOnMap = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const filtered = trips.filter((t) => {
      if (statusFilter === "STARTED") return t.status === "STARTED";
      if (statusFilter === "SCHEDULED") return t.status === "SCHEDULED";
      if (statusFilter === "COMPLETED") return t.status === "COMPLETED";
      return true;
    });

    const currentTripIds = new Set(filtered.map((t) => t._id));

    // Remove obsolete markers
    Object.keys(markersRef.current).forEach((tid) => {
      if (!currentTripIds.has(tid)) {
        map.removeLayer(markersRef.current[tid]);
        delete markersRef.current[tid];
      }
    });

    const validBounds = [];

    filtered.forEach((t) => {
      const lat = t.currentLocation?.lat || t.destination?.lat;
      const lng = t.currentLocation?.lng || t.destination?.lng;
      if (!lat || !lng) return;

      validBounds.push([lat, lng]);
      const coords = [lat, lng];
      const isSelected = selectedTripId === t._id;
      const icon = createVehicleIcon(t, isSelected);

      const popupContent = `
        <div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;min-width:210px;padding:4px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <strong style="color:#0f172a;font-size:13px;">${t.tripNumber}</strong>
            <span style="background:${t.status === "STARTED" ? "#e0f2fe" : "#f1f5f9"};color:${t.status === "STARTED" ? "#0369a1" : "#475569"};font-size:10px;font-weight:700;padding:2px 6px;border-radius:99px;">
              ${t.status}
            </span>
          </div>
          <div style="font-size:12px;color:#334155;line-height:1.4;">
            <div><b>Driver:</b> ${t.driverName || "Assigned"} (${t.vehicleNumber || "VAN"})</div>
            <div><b>Customer:</b> ${t.customerName}</div>
            <div style="margin-top:4px;color:#64748b;font-size:11px;">${t.destination?.address || ""}</div>
            ${t.status === "STARTED" ? `<div style="margin-top:6px;font-weight:bold;color:#0284c7;">Speed: ${t.currentLocation?.speed || 0} km/h &bull; Covered: ${t.distanceCoveredKm || 0} km</div>` : ""}
          </div>
        </div>
      `;

      if (markersRef.current[t._id]) {
        markersRef.current[t._id].setLatLng(coords);
        markersRef.current[t._id].setIcon(icon);
        markersRef.current[t._id].setPopupContent(popupContent);
      } else {
        const marker = L.marker(coords, { icon })
          .addTo(map)
          .bindPopup(popupContent);

        marker.on("click", () => {
          setSelectedTripId(t._id);
        });

        markersRef.current[t._id] = marker;
      }
    });

    if (validBounds.length > 0 && !selectedTripId) {
      try {
        map.fitBounds(validBounds, { padding: [50, 50], maxZoom: 14 });
      } catch {}
    }
  };

  const updateVehicleMarkerOnMap = (tripId, location, driverId) => {
    const map = mapInstanceRef.current;
    if (!map || !location?.lat || !location?.lng) return;

    const coords = [location.lat, location.lng];
    const marker = markersRef.current[tripId];

    if (marker) {
      marker.setLatLng(coords);
    } else {
      renderAllMarkersOnMap();
    }

    if (selectedTripId === tripId) {
      drawRouteForSelectedTrip(tripId);
    }
  };

  const drawRouteForSelectedTrip = useCallback(
    (tripId) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      const trip = trips.find((t) => t._id === tripId);
      if (!trip) return;

      if (polylineRef.current) {
        map.removeLayer(polylineRef.current);
        polylineRef.current = null;
      }

      const points = [];
      if (trip.origin?.lat && trip.origin?.lng) {
        points.push([trip.origin.lat, trip.origin.lng]);
      }

      if (Array.isArray(trip.locationBreadcrumbs)) {
        trip.locationBreadcrumbs.forEach((pt) => {
          if (pt.lat && pt.lng) points.push([pt.lat, pt.lng]);
        });
      }

      if (trip.currentLocation?.lat && trip.currentLocation?.lng) {
        points.push([trip.currentLocation.lat, trip.currentLocation.lng]);
      }

      if (points.length > 1) {
        const polyline = L.polyline(points, {
          color: "#0284c7",
          weight: 4,
          opacity: 0.85,
          smoothFactor: 1,
        }).addTo(map);

        polylineRef.current = polyline;
      }
    },
    [trips],
  );

  useEffect(() => {
    if (selectedTripId) {
      drawRouteForSelectedTrip(selectedTripId);
    } else if (polylineRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }
  }, [selectedTripId, drawRouteForSelectedTrip]);

  const focusTripOnMap = (trip) => {
    setSelectedTripId(trip._id);
    const map = mapInstanceRef.current;
    if (!map) return;

    const lat = trip.currentLocation?.lat || trip.destination?.lat;
    const lng = trip.currentLocation?.lng || trip.destination?.lng;

    if (lat && lng) {
      map.setView([lat, lng], 15, { animate: true });
      if (markersRef.current[trip._id]) {
        markersRef.current[trip._id].openPopup();
      }
    }
  };

  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      if (statusFilter === "STARTED" && t.status !== "STARTED") return false;
      if (statusFilter === "SCHEDULED" && t.status !== "SCHEDULED") return false;
      if (statusFilter === "COMPLETED" && t.status !== "COMPLETED") return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTrip = t.tripNumber?.toLowerCase().includes(q);
        const matchDriver = t.driverName?.toLowerCase().includes(q);
        const matchCust = t.customerName?.toLowerCase().includes(q);
        const matchVeh = t.vehicleNumber?.toLowerCase().includes(q);
        const matchDest = t.destination?.address?.toLowerCase().includes(q);
        return matchTrip || matchDriver || matchCust || matchVeh || matchDest;
      }

      return true;
    });
  }, [trips, statusFilter, searchQuery]);

  const activeSelectedTrip = trips.find((t) => t._id === selectedTripId);

  return (
    <div
      style={
        isFullScreen
          ? {
              position: "fixed",
              inset: 0,
              width: "100vw",
              height: "100vh",
              zIndex: 99999,
              display: "flex",
              flexDirection: "column",
              backgroundColor: "var(--bg-main, #f8fafc)",
              color: "var(--text-main, #0f172a)",
              overflow: "hidden",
            }
          : {
              display: "flex",
              flexDirection: "column",
              height: "calc(100vh - 65px)",
              backgroundColor: "var(--bg-main, #f8fafc)",
              color: "var(--text-main, #0f172a)",
              overflow: "hidden",
            }
      }
    >
      {/* 1. TOP HEADER & METRICS BAR */}
      <header
        style={{
          backgroundColor: "#ffffff",
          borderBottom: "1px solid var(--border-color, #e2e8f0)",
          padding: isMobile ? "10px 14px" : "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
          zIndex: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "10px" : "16px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              backgroundColor: "rgba(14, 165, 233, 0.1)",
              color: "#0284c7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Truck size={20} strokeWidth={2.2} />
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: isMobile ? "16px" : "18px",
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                }}
              >
                Fleet Tracking Command
              </h1>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: "99px",
                  backgroundColor: isSocketConnected ? "#ecfdf5" : "#fef2f2",
                  color: isSocketConnected ? "#059669" : "#dc2626",
                  border: `1px solid ${isSocketConnected ? "#a7f3d0" : "#fecaca"}`,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: isSocketConnected ? "#10b981" : "#ef4444",
                  }}
                />
                {isSocketConnected ? "Live GPS Connected" : "Connecting..."}
              </span>
            </div>
            {!isMobile && (
              <p
                style={{
                  margin: "2px 0 0 0",
                  fontSize: "12px",
                  color: "var(--text-muted, #64748b)",
                }}
              >
                Real-time OpenStreetMap telemetry & vehicle tracking stream
              </p>
            )}
          </div>
        </div>

        {/* Quick Stats & Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? "8px" : "14px", flexWrap: "wrap" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "12px",
              overflowX: isMobile ? "auto" : "visible",
              maxWidth: "100%",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 8px",
                borderRadius: "8px",
                backgroundColor: "#f0fdf4",
                border: "1px solid #bbf7d0",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ color: "#166534" }}>In Transit:</span>
              <strong style={{ color: "#15803d" }}>
                {stats.activeTrips || trips.filter((t) => t.status === "STARTED").length}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 8px",
                borderRadius: "8px",
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ color: "#64748b" }}>Drivers:</span>
              <strong style={{ color: "#0f172a" }}>
                {stats.totalDrivers || drivers.length}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 8px",
                borderRadius: "8px",
                backgroundColor: "#f0fdfa",
                border: "1px solid #ccfbf1",
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ color: "#0f766e" }}>Delivered:</span>
              <strong style={{ color: "#0d9488" }}>
                {stats.completedToday ||
                  trips.filter((t) => t.status === "COMPLETED").length}
              </strong>
            </div>
          </div>

          <button
            type="button"
            onClick={() => loadAllData(false)}
            disabled={refreshing}
            style={{
              padding: "7px 10px",
              borderRadius: "8px",
              border: "1px solid var(--border-color, #e2e8f0)",
              backgroundColor: "#fff",
              cursor: "pointer",
              color: "var(--text-main, #334155)",
              display: "inline-flex",
              alignItems: "center",
            }}
            title="Refresh Fleet Data"
          >
            <RefreshCw
              size={14}
              style={{
                animation: refreshing ? "spin 1s linear infinite" : "none",
              }}
            />
          </button>

          <button
            type="button"
            onClick={fitAllVehicles}
            style={{
              padding: "7px 12px",
              borderRadius: "8px",
              border: "1px solid var(--border-color, #e2e8f0)",
              backgroundColor: "#fff",
              cursor: "pointer",
              color: "var(--primary-color, #2563eb)",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              fontWeight: 600,
            }}
            title="Center and fit all active vehicles"
          >
            <Compass size={15} />
            <span>Fit All</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullScreen(!isFullScreen)}
            style={{
              padding: "7px 12px",
              borderRadius: "8px",
              border: "1px solid var(--border-color, #e2e8f0)",
              backgroundColor: isFullScreen ? "var(--primary-light, #eff6ff)" : "#fff",
              cursor: "pointer",
              color: isFullScreen ? "var(--primary-color, #2563eb)" : "var(--text-main, #334155)",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              fontWeight: 600,
            }}
            title={isFullScreen ? "Exit Full Screen" : "Full Screen Map"}
          >
            {isFullScreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            <span>{isFullScreen ? "Exit" : "Full Screen"}</span>
          </button>

          <button
            type="button"
            className="so-primary-button"
            onClick={() => setShowDispatchModal(true)}
          >
            <Plus size={16} />
            <span>Dispatch Trip</span>
          </button>
        </div>
      </header>

      {/* 2. SPLIT INTERFACE: SIDEBAR + LEAFLET MAP */}
      <div style={{ display: "flex", flex: 1, position: "relative", overflow: "hidden", minHeight: 0 }}>
        {/* MOBILE BACKDROP OVERLAY */}
        {isMobile && sidePanelOpen && (
          <div
            onClick={() => setSidePanelOpen(false)}
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(15, 23, 42, 0.45)",
              zIndex: 40,
              backdropFilter: "blur(2px)",
            }}
          />
        )}

        {/* SIDEBAR PANEL */}
        <aside
          style={{
            position: isMobile ? "absolute" : "relative",
            left: 0,
            top: 0,
            bottom: 0,
            height: "100%",
            width: isMobile ? "min(350px, 86vw)" : sidePanelOpen ? "380px" : "0px",
            minWidth: isMobile ? "auto" : sidePanelOpen ? "380px" : "0px",
            transform: isMobile && !sidePanelOpen ? "translateX(-100%)" : "none",
            transition: isMobile ? "transform 0.25s ease" : "width 0.2s ease",
            backgroundColor: "#ffffff",
            borderRight: "1px solid var(--border-color, #e2e8f0)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: isMobile ? 50 : 10,
            boxShadow: isMobile && sidePanelOpen ? "4px 0 24px rgba(0,0,0,0.25)" : "none",
          }}
        >
          {/* Mobile Drawer Close Header */}
          {isMobile && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 16px",
                borderBottom: "1px solid #e2e8f0",
                backgroundColor: "#f8fafc",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Truck size={18} color="#0284c7" />
                <span style={{ fontWeight: 700, fontSize: "14px", color: "#0f172a" }}>
                  Fleet Vehicles ({trips.length})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSidePanelOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                aria-label="Close vehicles list"
              >
                <X size={20} />
              </button>
            </div>
          )}

          {/* Search & Tabs */}
          <div
            style={{
              padding: "12px",
              borderBottom: "1px solid var(--border-color, #e2e8f0)",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div style={{ position: "relative" }}>
              <Search
                size={14}
                style={{
                  position: "absolute",
                  left: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search trip #, driver, customer..."
                style={{
                  width: "100%",
                  padding: "7px 10px 7px 30px",
                  fontSize: "12px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color, #cbd5e1)",
                  outline: "none",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: "4px",
                backgroundColor: "#f1f5f9",
                padding: "3px",
                borderRadius: "8px",
              }}
            >
              {[
                { id: "STARTED", label: "Moving" },
                { id: "SCHEDULED", label: "Queued" },
                { id: "COMPLETED", label: "Delivered" },
                { id: "ALL", label: "All" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  style={{
                    flex: 1,
                    padding: "5px 0",
                    fontSize: "11px",
                    fontWeight: 600,
                    borderRadius: "6px",
                    border: "none",
                    cursor: "pointer",
                    backgroundColor: statusFilter === tab.id ? "#ffffff" : "transparent",
                    color: statusFilter === tab.id ? "#0284c7" : "#64748b",
                    boxShadow:
                      statusFilter === tab.id ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Trips List */}
          <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
            {filteredTrips.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "40px 16px",
                  color: "var(--text-muted, #94a3b8)",
                }}
              >
                <Truck size={32} strokeWidth={1.5} style={{ margin: "0 auto 8px" }} />
                <div style={{ fontSize: "13px", fontWeight: 600 }}>
                  No trips in this view
                </div>
                <div style={{ fontSize: "11px", marginTop: "4px" }}>
                  Switch filters or click &quot;Dispatch Trip&quot;
                </div>
              </div>
            ) : (
              filteredTrips.map((trip) => {
                const isSelected = trip._id === selectedTripId;
                const isStarted = trip.status === "STARTED";

                return (
                  <div
                    key={trip._id}
                    onClick={() => focusTripOnMap(trip)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "10px",
                      marginBottom: "8px",
                      border: isSelected
                        ? "1.5px solid #0284c7"
                        : "1px solid var(--border-color, #e2e8f0)",
                      backgroundColor: isSelected ? "#f0f9ff" : "#ffffff",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      boxShadow: isSelected
                        ? "0 2px 6px rgba(2, 132, 199, 0.12)"
                        : "0 1px 2px rgba(0,0,0,0.03)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "4px",
                      }}
                    >
                      <strong
                        style={{
                          fontFamily: "monospace",
                          fontSize: "12px",
                          color: "#0f172a",
                        }}
                      >
                        {trip.tripNumber}
                      </strong>
                      <StatusField value={trip.status} size={11} />
                    </div>

                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#1e293b",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>{trip.driverName || "Driver Assigned"}</span>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 500,
                          color: "#64748b",
                        }}
                      >
                        {trip.vehicleNumber || trip.vehicleType || "VAN"}
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--text-muted, #64748b)",
                        marginTop: "4px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      <MapPin size={11} style={{ flexShrink: 0, color: "#ef4444" }} />
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {trip.customerName} &bull; {trip.destination?.address}
                      </span>
                    </div>

                    <div
                      style={{
                        marginTop: "6px",
                        paddingTop: "6px",
                        borderTop: "1px solid var(--border-color, #f1f5f9)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: "10px",
                        color: "#64748b",
                      }}
                    >
                      <span>Covered: {trip.distanceCoveredKm || 0} km</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const url = `${window.location.origin}/track/${trip.trackingToken}`;
                          navigator.clipboard.writeText(url);
                          toast.success("Customer tracking link copied to clipboard!");
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#0284c7",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          fontWeight: 600,
                        }}
                      >
                        <Share2 size={11} /> Copy Link
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* TOGGLE SIDE PANEL BUTTON */}
        {(!isMobile || !sidePanelOpen) && (
          <button
            type="button"
            onClick={() => setSidePanelOpen(!sidePanelOpen)}
            style={{
              position: "absolute",
              left: isMobile ? "12px" : sidePanelOpen ? "390px" : "12px",
              top: "12px",
              zIndex: 35,
              backgroundColor: "#ffffff",
              border: "1px solid var(--border-color, #e2e8f0)",
              padding: isMobile ? "7px 12px" : "6px 8px",
              borderRadius: "8px",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
              color: "var(--text-main, #334155)",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12.5px",
              fontWeight: 600,
              transition: isMobile ? "none" : "left 0.2s ease",
            }}
            title={sidePanelOpen ? "Collapse List" : "Show Fleet List"}
          >
            {sidePanelOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            {isMobile && <span>Vehicles ({trips.length})</span>}
          </button>
        )}

        {/* MAP CONTAINER */}
        <main style={{ flex: 1, position: "relative", height: "100%" }}>
          <div ref={mapContainerRef} style={{ width: "100%", height: "100%", zIndex: 1 }} />

          {/* FLOATING QUICK MAP CONTROLS (Always convenient in full screen or standard view) */}
          <div
            style={{
              position: "absolute",
              top: "14px",
              right: "14px",
              zIndex: 30,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(10px)",
              padding: "6px 8px",
              borderRadius: "10px",
              border: "1px solid var(--border-color, #e2e8f0)",
              boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "4px",
                paddingRight: "6px",
                borderRight: "1px solid var(--border-color, #e2e8f0)",
              }}
            >
              {[
                { id: "ALL", label: "All" },
                { id: "STARTED", label: "Moving" },
                { id: "SCHEDULED", label: "Scheduled" },
                { id: "COMPLETED", label: "Delivered" },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setStatusFilter(pill.id)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    backgroundColor:
                      statusFilter === pill.id
                        ? "var(--primary-color, #2563eb)"
                        : "transparent",
                    color:
                      statusFilter === pill.id
                        ? "#ffffff"
                        : "var(--text-secondary, #64748b)",
                  }}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={fitAllVehicles}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 8px",
                borderRadius: "6px",
                border: "1px solid var(--border-color, #e2e8f0)",
                backgroundColor: "#fff",
                fontSize: "11px",
                fontWeight: 600,
                color: "var(--primary-color, #2563eb)",
                cursor: "pointer",
              }}
              title="Center and fit all active vehicles"
            >
              <Compass size={13} />
              <span>Center</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFullScreen(!isFullScreen)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 8px",
                borderRadius: "6px",
                border: "1px solid var(--border-color, #e2e8f0)",
                backgroundColor: isFullScreen
                  ? "var(--primary-light, #eff6ff)"
                  : "#fff",
                fontSize: "11px",
                fontWeight: 600,
                color: isFullScreen
                  ? "var(--primary-color, #2563eb)"
                  : "var(--text-main, #334155)",
                cursor: "pointer",
              }}
              title={isFullScreen ? "Exit Full Screen" : "Full Screen"}
            >
              {isFullScreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              <span>{isFullScreen ? "Exit" : "Expand"}</span>
            </button>
          </div>

          {/* ACTIVE VEHICLE FLOATING FOCUS CARD */}
          {activeSelectedTrip && (
            <div
              style={{
                position: "absolute",
                bottom: "20px",
                right: "20px",
                zIndex: 30,
                backgroundColor: "#ffffff",
                border: "1px solid var(--border-color, #e2e8f0)",
                borderRadius: "14px",
                padding: "16px",
                maxWidth: "340px",
                width: "100%",
                boxShadow: "0 10px 25px -5px rgba(0,0,0,0.15)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "10px",
                      textTransform: "uppercase",
                      fontWeight: 700,
                      color: "#64748b",
                    }}
                  >
                    Vehicle Focus
                  </div>
                  <strong style={{ fontSize: "15px", color: "#0f172a" }}>
                    {activeSelectedTrip.tripNumber}
                  </strong>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTripId(null)}
                  style={{
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    color: "#94a3b8",
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ fontSize: "12px", lineHeight: "1.6", color: "#334155" }}>
                <div>
                  <b>Driver:</b> {activeSelectedTrip.driverName} (
                  {activeSelectedTrip.vehicleNumber || "VAN"})
                </div>
                <div>
                  <b>Customer:</b> {activeSelectedTrip.customerName}
                </div>
                <div style={{ color: "#64748b", fontSize: "11px", marginTop: "2px" }}>
                  {activeSelectedTrip.destination?.address}
                </div>
                <div
                  style={{
                    marginTop: "6px",
                    paddingTop: "6px",
                    borderTop: "1px solid #f1f5f9",
                    display: "flex",
                    justifyContent: "space-between",
                    fontWeight: 600,
                    color: "#0284c7",
                  }}
                >
                  <span>Speed: {activeSelectedTrip.currentLocation?.speed || 0} km/h</span>
                  <span>Covered: {activeSelectedTrip.distanceCoveredKm || 0} km</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* DISPATCH TRIP MODAL */}
      <DispatchTripModal
        isOpen={showDispatchModal}
        drivers={drivers}
        onClose={() => setShowDispatchModal(false)}
        onSuccess={() => {
          setShowDispatchModal(false);
          loadAllData(false);
        }}
      />
    </div>
  );
}

// -------------------------------------------------------------
// DISPATCH TRIP MODAL USING BOXMODAL & FORM SYSTEM
// -------------------------------------------------------------
function DispatchTripModal({ isOpen, drivers, onClose, onSuccess }) {
  const [driverId, setDriverId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [originAddress, setOriginAddress] = useState("Central Warehouse");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDriverId("");
      setCustomerName("");
      setCustomerPhone("");
      setDestinationAddress("");
      setOriginAddress("Central Warehouse");
      setNotes("");
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!driverId) {
      toast.error("Please select a driver for this dispatch");
      return;
    }
    if (!customerName.trim()) {
      toast.error("Please enter the customer / consignee name");
      return;
    }
    if (!destinationAddress.trim()) {
      toast.error("Please enter the delivery destination address");
      return;
    }

    try {
      setSubmitting(true);
      const res = await logisticsApi.createTrip({
        driverId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        destinationAddress: destinationAddress.trim(),
        originAddress: originAddress.trim(),
        notes: notes.trim(),
      });

      if (res.data?.success) {
        toast.success("Delivery trip dispatched successfully!");
        onSuccess();
      } else {
        toast.error(res.data?.message || "Failed to dispatch trip");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Error dispatching trip");
    } finally {
      setSubmitting(false);
    }
  };

  const driverOptions = drivers.map((d) => ({
    value: d._id,
    label: `${d.name} (${d.phone}) - ${d.vehicleNumber || d.vehicleType || "Vehicle"} [${d.status}]`,
  }));

  const footer = (
    <div className="box-modal-footer-actions">
      <Button
        type="button"
        variant="secondary"
        onClick={onClose}
        disabled={submitting}
      >
        Cancel
      </Button>
      <Button
        type="button"
        variant="primary"
        onClick={handleSubmit}
        loading={submitting}
        disabled={submitting}
      >
        {submitting ? "Dispatching..." : "Confirm & Dispatch"}
      </Button>
    </div>
  );

  return (
    <BoxModal
      show={isOpen}
      onClose={onClose}
      title="Dispatch Delivery Trip"
      subtitle="Assign a driver, vehicle, and destination address for live GPS tracking"
      width="780px"
      footer={footer}
    >
      {/* SECTION 1: Driver & Vehicle */}
      <div className="box-modal-section">
        <div className="box-modal-section-header">
          <div className="box-modal-section-icon">
            <Truck size={17} />
          </div>
          <div className="box-modal-section-header-content">
            <h3>Driver Assignment</h3>
            <p>Select which driver and vehicle will carry out this dispatch</p>
          </div>
        </div>

        <div className="box-modal-form-grid">
          <div className="box-modal-form-full">
            <Select
              label="Fleet Driver"
              name="driverId"
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              options={driverOptions}
              placeholder="-- Select Assigned Driver --"
              required
              disabled={submitting}
            />
          </div>

          <Input
            label="Pickup / Origin Address"
            name="originAddress"
            value={originAddress}
            onChange={(e) => setOriginAddress(e.target.value)}
            placeholder="Central Warehouse"
            disabled={submitting}
          />
        </div>
      </div>

      {/* SECTION 2: Customer & Delivery Destination */}
      <div className="box-modal-section">
        <div className="box-modal-section-header">
          <div className="box-modal-section-icon">
            <MapPin size={17} />
          </div>
          <div className="box-modal-section-header-content">
            <h3>Customer & Destination</h3>
            <p>Consignee details and destination delivery address</p>
          </div>
        </div>

        <div className="box-modal-form-grid">
          <Input
            label="Customer / Consignee Name"
            name="customerName"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="e.g. Acme Corporation / Rajesh Motors"
            required
            disabled={submitting}
          />

          <Input
            label="Customer Phone (for SMS/WhatsApp tracking link)"
            name="customerPhone"
            type="tel"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            placeholder="e.g. 9876543210"
            disabled={submitting}
          />

          <div className="box-modal-form-full">
            <Textarea
              label="Delivery Destination Address"
              name="destinationAddress"
              value={destinationAddress}
              onChange={(e) => setDestinationAddress(e.target.value)}
              placeholder="Full delivery street address, building, city, and pincode..."
              rows={2}
              required
              disabled={submitting}
            />
          </div>

          <div className="box-modal-form-full">
            <Input
              label="Special Dispatch Instructions (Optional)"
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Fragile electronic items; deliver before 5 PM"
              disabled={submitting}
            />
          </div>
        </div>
      </div>
    </BoxModal>
  );
}
