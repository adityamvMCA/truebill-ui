import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Truck,
  Navigation,
  Phone,
  MapPin,
  CheckCircle2,
  Play,
  RotateCw,
  LogOut,
  ExternalLink,
  History,
  FileText,
  Maximize2,
  Minimize2,
  Compass,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import BoxModal from "../../../components/common/Modal/BoxModal";
import Button from "../../../components/common/Form/Button";
import Input from "../../../components/common/Form/Input";
import Textarea from "../../../components/common/Form/Textarea";
import StatusField from "../../../components/common/StatusField/StatusField";
import logisticsApi from "../../../services/modules/logisticsApi";
import { createLogisticsSocket } from "../../../services/modules/logisticsSocket";
import "../../../styles/common.css";
import "../../../styles/layout.css";

export default function DriverPortal() {
  const navigate = useNavigate();
  const [driver, setDriver] = useState(null);
  const [activeTrip, setActiveTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("cockpit"); // "cockpit" | "history"
  const [pastTrips, setPastTrips] = useState([]);

  // Fullscreen map mode state - default to true for convenient driver navigation
  const [isFullScreenMap, setIsFullScreenMap] = useState(true);
  const [isDrawerCollapsed, setIsDrawerCollapsed] = useState(false);

  // Telemetry state
  const [isTracking, setIsTracking] = useState(false);
  const [currentCoords, setCurrentCoords] = useState(null);
  const [speedKmH, setSpeedKmH] = useState(0);
  const [accuracyM, setAccuracyM] = useState(0);

  // Delivery Completion modal
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [receiverName, setReceiverName] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [submittingComplete, setSubmittingComplete] = useState(false);

  // Refs for tracking & map
  const socketRef = useRef(null);
  const watchIdRef = useRef(null);
  const periodicTimerRef = useRef(null);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const activeTripRef = useRef(activeTrip);

  useEffect(() => {
    activeTripRef.current = activeTrip;
  }, [activeTrip]);

  // Invalidate Leaflet map size when toggling fullscreen or switching tabs
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [isFullScreenMap, activeTab]);

  // 1. Initial auth check & load active trip
  useEffect(() => {
    const token = localStorage.getItem("driver_token");
    const storedDriver = localStorage.getItem("driver_user");
    if (!token || !storedDriver) {
      navigate("/driver/login", { replace: true });
      return;
    }

    try {
      setDriver(JSON.parse(storedDriver));
    } catch {
      navigate("/driver/login", { replace: true });
      return;
    }

    fetchActiveTrip();

    // Setup socket connection
    const socket = createLogisticsSocket();
    socketRef.current = socket;

    socket.on("connect", () => {
      if (activeTripRef.current?._id) {
        socket.emit("trip:join", {
          tripId: activeTripRef.current._id,
          driverId: JSON.parse(storedDriver)?._id,
        });
      }
    });

    return () => {
      stopGpsTracking();
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [navigate]);

  // Fetch driver active trip
  const fetchActiveTrip = async () => {
    try {
      setRefreshing(true);
      const res = await logisticsApi.getDriverActiveTrip();
      if (res.data?.success) {
        const trip = res.data.data;
        setActiveTrip(trip);
        activeTripRef.current = trip;
        if (trip) {
          setIsFullScreenMap(true);
        }

        if (trip?.status === "STARTED") {
          startGpsTracking(trip._id);
        } else {
          stopGpsTracking();
        }
      }
    } catch (err) {
      console.error(err);
      if (err.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPastTrips = async () => {
    try {
      const res = await logisticsApi.getDriverTrips({ limit: 15 });
      if (res.data?.success) {
        setPastTrips(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // -------------------------------------------------------------
  // HIGH PRECISION GPS TRACKING ENGINE (HTML5 Geolocation)
  // -------------------------------------------------------------
  const startGpsTracking = (tripId) => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsTracking(true);

    const emitLocation = (position) => {
      const { latitude, longitude, speed, heading, accuracy } = position.coords;
      const speedKm = speed ? Math.round(speed * 3.6) : 0;
      const roundedAcc = accuracy ? Math.round(accuracy) : 5;

      setSpeedKmH(speedKm);
      setAccuracyM(roundedAcc);
      setCurrentCoords([latitude, longitude]);

      const payload = {
        lat: latitude,
        lng: longitude,
        speed: speedKm,
        heading: heading || 0,
        accuracy: roundedAcc,
        timestamp: new Date().toISOString(),
      };

      if (socketRef.current?.connected) {
        socketRef.current.emit("driver:location_update", {
          tripId,
          location: payload,
          driverId: driver?._id,
        });
      }

      logisticsApi.postDriverLocation(tripId, payload).catch((err) => {
        console.warn("Location REST sync buffered:", err?.message);
      });

      updateDriverMapMarker([latitude, longitude]);
    };

    const handleGpsError = (err) => {
      console.warn("GPS Tracking warning:", err.message);
    };

    if ("watchPosition" in navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        emitLocation,
        handleGpsError,
        {
          enableHighAccuracy: true,
          maximumAge: 3000,
          timeout: 10000,
        },
      );
    }

    periodicTimerRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(emitLocation, handleGpsError, {
        enableHighAccuracy: true,
        timeout: 5000,
      });
    }, 6000);
  };

  const stopGpsTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (periodicTimerRef.current !== null) {
      clearInterval(periodicTimerRef.current);
      periodicTimerRef.current = null;
    }
    setIsTracking(false);
    setSpeedKmH(0);
  };

  // -------------------------------------------------------------
  // LEAFLET MAP
  // -------------------------------------------------------------
  useEffect(() => {
    if (!mapRef.current || !activeTrip) return;

    if (!mapInstanceRef.current) {
      const defaultCenter = [
        activeTrip.destination?.lat || 20.5937,
        activeTrip.destination?.lng || 78.9629,
      ];

      const map = L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: false,
      }).setView(defaultCenter, 13);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    if (activeTrip.destination?.lat && activeTrip.destination?.lng) {
      const destCoords = [
        activeTrip.destination.lat,
        activeTrip.destination.lng,
      ];
      if (!destMarkerRef.current) {
        const destIcon = L.divIcon({
          className: "dest-icon",
          html: `<div style="background:#dc2626;color:white;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;font-size:14px;font-weight:bold;">📍</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });
        destMarkerRef.current = L.marker(destCoords, { icon: destIcon })
          .addTo(mapInstanceRef.current)
          .bindPopup(`<b>Destination</b><br/>${activeTrip.destination.address}`);
      } else {
        destMarkerRef.current.setLatLng(destCoords);
      }
    }
  }, [activeTrip]);

  const updateDriverMapMarker = (coords) => {
    if (!mapInstanceRef.current) return;

    if (!driverMarkerRef.current) {
      const driverIcon = L.divIcon({
        className: "driver-current-icon",
        html: `<div style="background:var(--primary-color, #2563eb);color:white;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,0.3);border:2px solid white;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <rect x="1" y="3" width="15" height="13"></rect>
            <polygon points="16 8 20 8 23 11 23 16 16 16 8"></polygon>
            <circle cx="5.5" cy="18.5" r="2.5"></circle>
            <circle cx="18.5" cy="18.5" r="2.5"></circle>
          </svg>
        </div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      driverMarkerRef.current = L.marker(coords, { icon: driverIcon }).addTo(
        mapInstanceRef.current,
      );
      mapInstanceRef.current.setView(coords, 15);
    } else {
      driverMarkerRef.current.setLatLng(coords);
    }
  };

  const centerOnDriver = () => {
    if (!mapInstanceRef.current) return;
    if (currentCoords) {
      mapInstanceRef.current.setView(currentCoords, 16, { animate: true });
    } else {
      toast("Waiting for GPS location...");
    }
  };

  const centerOnDestination = () => {
    if (!mapInstanceRef.current || !activeTrip?.destination?.lat) {
      toast("Destination coordinates not available");
      return;
    }
    mapInstanceRef.current.setView(
      [activeTrip.destination.lat, activeTrip.destination.lng],
      15,
      { animate: true },
    );
  };

  // -------------------------------------------------------------
  // TRIP ACTIONS: START & COMPLETE
  // -------------------------------------------------------------
  const handleStartTrip = async () => {
    if (!activeTrip) return;

    try {
      setRefreshing(true);
      toast.loading("Acquiring GPS location...", { id: "trip-action" });

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const res = await logisticsApi.startDriverTrip(activeTrip._id, {
              lat: latitude,
              lng: longitude,
            });

            if (res.data?.success) {
              const updated = res.data.data;
              setActiveTrip(updated);
              activeTripRef.current = updated;
              startGpsTracking(updated._id);
              toast.success("Trip started! Real-time GPS stream active.", {
                id: "trip-action",
              });
            } else {
              toast.error(res.data?.message || "Failed to start trip", {
                id: "trip-action",
              });
            }
          } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to start trip", {
              id: "trip-action",
            });
          } finally {
            setRefreshing(false);
          }
        },
        async () => {
          try {
            const res = await logisticsApi.startDriverTrip(activeTrip._id, {});
            if (res.data?.success) {
              setActiveTrip(res.data.data);
              activeTripRef.current = res.data.data;
              startGpsTracking(res.data.data._id);
              toast.success("Trip started! Tracking initialized.", {
                id: "trip-action",
              });
            }
          } catch (err) {
            toast.error(err.response?.data?.message || "Failed to start trip", {
              id: "trip-action",
            });
          } finally {
            setRefreshing(false);
          }
        },
        { enableHighAccuracy: true, timeout: 8000 },
      );
    } catch (err) {
      setRefreshing(false);
      toast.error(err.message || "Failed to initiate trip start", {
        id: "trip-action",
      });
    }
  };

  const handleConfirmDelivery = async (e) => {
    e?.preventDefault();
    if (!activeTrip) return;

    try {
      setSubmittingComplete(true);
      const res = await logisticsApi.completeDriverTrip(activeTrip._id, {
        signedBy: receiverName.trim() || activeTrip.customerName,
        notes: deliveryNotes.trim() || "Delivered safely",
      });

      if (res.data?.success) {
        toast.success("Delivery completed successfully! Great job!");
        stopGpsTracking();
        setShowCompleteModal(false);
        setIsFullScreenMap(false);
        setActiveTrip(null);
        fetchActiveTrip();
      } else {
        toast.error(res.data?.message || "Failed to complete delivery");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Error completing delivery");
    } finally {
      setSubmittingComplete(false);
    }
  };

  const handleLogout = () => {
    stopGpsTracking();
    localStorage.removeItem("driver_token");
    localStorage.removeItem("driver_user");
    toast.success("Logged out successfully");
    navigate("/driver/login", { replace: true });
  };

  const openExternalNavigation = () => {
    if (!activeTrip?.destination?.address) return;
    const dest =
      activeTrip.destination.lat && activeTrip.destination.lng
        ? `${activeTrip.destination.lat},${activeTrip.destination.lng}`
        : encodeURIComponent(activeTrip.destination.address);
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${dest}`,
      "_blank",
    );
  };

  if (loading) {
    return (
      <div
        className="login-container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            className="login-logo-icon"
            style={{ margin: "0 auto 16px", width: "48px", height: "48px" }}
          >
            <Truck size={28} />
          </div>
          <p style={{ color: "var(--text-secondary)", fontWeight: 600 }}>
            Connecting to Driver Cockpit...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--page-bg, #f8fafc)",
        color: "var(--text-primary, #0f172a)",
        display: "flex",
        flexDirection: "column",
        paddingBottom: isFullScreenMap ? "0" : "40px",
      }}
    >
      {/* 1. TOP APP BAR */}
      {!isFullScreenMap && (
        <header
          style={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            backgroundColor: "var(--header-bg, #ffffff)",
            borderBottom: "1px solid var(--border-color, #e2e8f0)",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                backgroundColor: "var(--primary-color, #2563eb)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Truck size={22} />
            </div>
            <div>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span>{driver?.name || "Driver"}</span>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "1px 8px",
                    borderRadius: "12px",
                    backgroundColor: "var(--primary-light, #eff6ff)",
                    color: "var(--primary-color, #2563eb)",
                    border: "1px solid var(--border-color, #e2e8f0)",
                  }}
                >
                  {driver?.vehicleNumber || "Fleet Driver"}
                </span>
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--text-secondary, #64748b)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginTop: "2px",
                }}
              >
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: isTracking
                      ? "var(--success, #16a34a)"
                      : "var(--text-muted, #94a3b8)",
                    boxShadow: isTracking
                      ? "0 0 6px var(--success, #16a34a)"
                      : "none",
                  }}
                />
                <span>{isTracking ? "GPS Streaming Live" : "Standby / Idle"}</span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={fetchActiveTrip}
              disabled={refreshing}
              style={{
                backgroundColor: "var(--white, #ffffff)",
                border: "1px solid var(--border-color, #cbd5e1)",
                color: "var(--text-primary, #475569)",
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              title="Refresh Trip Data"
            >
              <RotateCw
                size={16}
                style={{
                  animation: refreshing ? "spin 1s linear infinite" : "none",
                }}
              />
            </button>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                backgroundColor: "var(--white, #ffffff)",
                border: "1px solid var(--border-color, #cbd5e1)",
                color: "var(--danger, #dc2626)",
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              title="Log Out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>
      )}

      {/* 2. TABS */}
      {!isFullScreenMap && (
        <div
          style={{
            padding: "14px 16px 0",
            display: "flex",
            gap: "8px",
            maxWidth: "580px",
            margin: "0 auto",
            width: "100%",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("cockpit")}
            style={{
              flex: 1,
              padding: "9px 12px",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: 700,
              border:
                activeTab === "cockpit"
                  ? "none"
                  : "1px solid var(--border-color, #e2e8f0)",
              backgroundColor:
                activeTab === "cockpit"
                  ? "var(--primary-color, #2563eb)"
                  : "var(--card-bg, #ffffff)",
              color:
                activeTab === "cockpit"
                  ? "#ffffff"
                  : "var(--text-secondary, #64748b)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              boxShadow: activeTab === "cockpit" ? "var(--shadow-sm)" : "none",
            }}
          >
            <Navigation size={14} />
            Live Cockpit
          </button>

          {activeTrip && (
            <button
              type="button"
              onClick={() => setIsFullScreenMap(true)}
              style={{
                flex: 1,
                padding: "9px 12px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 700,
                border: "1px solid var(--border-color, #e2e8f0)",
                backgroundColor: "var(--card-bg, #ffffff)",
                color: "var(--primary-color, #2563eb)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <Maximize2 size={14} />
              Full Screen Map
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setActiveTab("history");
              fetchPastTrips();
            }}
            style={{
              flex: 1,
              padding: "9px 12px",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: 700,
              border:
                activeTab === "history"
                  ? "none"
                  : "1px solid var(--border-color, #e2e8f0)",
              backgroundColor:
                activeTab === "history"
                  ? "var(--primary-color, #2563eb)"
                  : "var(--card-bg, #ffffff)",
              color:
                activeTab === "history"
                  ? "#ffffff"
                  : "var(--text-secondary, #64748b)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              boxShadow: activeTab === "history" ? "var(--shadow-sm)" : "none",
            }}
          >
            <History size={14} />
            Trip History
          </button>
        </div>
      )}

      {/* 3. MAIN COCKPIT VIEW */}
      {activeTab === "cockpit" ? (
        <main
          style={{
            padding: isFullScreenMap ? "0" : "16px",
            maxWidth: isFullScreenMap ? "100%" : "580px",
            margin: "0 auto",
            width: "100%",
            flex: isFullScreenMap ? 1 : "initial",
            position: isFullScreenMap ? "relative" : "static",
          }}
        >
          {!activeTrip ? (
            <div
              style={{
                backgroundColor: "var(--card-bg, #ffffff)",
                border: "1px solid var(--border-color, #e2e8f0)",
                borderRadius: "var(--radius-lg, 14px)",
                padding: "40px 20px",
                textAlign: "center",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  backgroundColor: "var(--primary-light, #eff6ff)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  color: "var(--primary-color, #2563eb)",
                }}
              >
                <CheckCircle2 size={32} />
              </div>
              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "var(--text-primary, #0f172a)",
                  margin: "0 0 6px",
                }}
              >
                All Clear! Ready for Next Trip
              </h2>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--text-secondary, #64748b)",
                  margin: "0 auto 20px",
                  maxWidth: "320px",
                }}
              >
                You have no active deliveries scheduled right now. As soon as
                dispatch assigns a trip, it will appear here.
              </p>
              <Button
                variant="primary"
                onClick={fetchActiveTrip}
                loading={refreshing}
                disabled={refreshing}
                icon={RotateCw}
                style={{ margin: "0 auto" }}
              >
                Check For New Trips
              </Button>
            </div>
          ) : (
            <>
              {/* STATUS & TRIP DETAILS (Hidden in Full Screen Map Mode) */}
              {!isFullScreenMap && (
                <div
                  style={{
                    backgroundColor: "var(--card-bg, #ffffff)",
                    border: "1px solid var(--border-color, #e2e8f0)",
                    borderRadius: "var(--radius-lg, 14px)",
                    padding: "18px",
                    marginBottom: "14px",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "14px",
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: "11px",
                          textTransform: "uppercase",
                          fontWeight: 700,
                          color: "var(--text-secondary, #64748b)",
                        }}
                      >
                        Active Delivery Trip
                      </span>
                      <h2
                        style={{
                          fontSize: "20px",
                          fontWeight: 800,
                          color: "var(--text-primary, #0f172a)",
                          margin: "4px 0 0",
                          fontFamily: "monospace",
                        }}
                      >
                        {activeTrip.tripNumber}
                      </h2>
                    </div>

                    <StatusField value={activeTrip.status} />
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "12px",
                      paddingTop: "12px",
                      borderTop: "1px solid var(--border-color, #f1f5f9)",
                      marginBottom: "14px",
                    }}
                  >
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        backgroundColor: "#fee2e2",
                        color: "#dc2626",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <MapPin size={18} />
                    </div>
                    <div>
                      <h4
                        style={{
                          fontSize: "14px",
                          fontWeight: 700,
                          color: "var(--text-primary, #0f172a)",
                          margin: "0 0 3px",
                        }}
                      >
                        {activeTrip.customerName}
                      </h4>
                      <p
                        style={{
                          fontSize: "12px",
                          color: "var(--text-secondary, #475569)",
                          margin: 0,
                          lineHeight: 1.4,
                        }}
                      >
                        {activeTrip.destination?.address}
                      </p>
                    </div>
                  </div>

                  {activeTrip.customerPhone && (
                    <div
                      style={{
                        backgroundColor: "var(--page-bg, #f8fafc)",
                        border: "1px solid var(--border-color, #e2e8f0)",
                        borderRadius: "10px",
                        padding: "10px 14px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: "14px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "13px",
                          color: "var(--text-primary, #334155)",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <Phone size={14} color="var(--text-secondary, #64748b)" />{" "}
                        {activeTrip.customerPhone}
                      </span>
                      <a
                        href={`tel:${activeTrip.customerPhone}`}
                        style={{
                          backgroundColor: "#ecfdf5",
                          color: "#059669",
                          border: "1px solid #a7f3d0",
                          padding: "5px 12px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: 700,
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Phone size={12} /> Call Customer
                      </a>
                    </div>
                  )}

                  {activeTrip.notes && (
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--text-secondary, #475569)",
                        backgroundColor: "var(--page-bg, #f8fafc)",
                        padding: "10px",
                        borderRadius: "10px",
                        border: "1px solid var(--border-color, #e2e8f0)",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "8px",
                      }}
                    >
                      <FileText
                        size={14}
                        style={{
                          flexShrink: 0,
                          marginTop: "2px",
                          color: "var(--text-secondary, #64748b)",
                        }}
                      />
                      <span>{activeTrip.notes}</span>
                    </div>
                  )}
                </div>
              )}

              {/* LIVE TELEMETRY STATS (Only when trip is started & Not Fullscreen) */}
              {!isFullScreenMap && activeTrip.status === "STARTED" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "10px",
                    marginBottom: "14px",
                  }}
                >
                  <div
                    style={{
                      backgroundColor: "var(--card-bg, #ffffff)",
                      border: "1px solid var(--border-color, #e2e8f0)",
                      borderRadius: "12px",
                      padding: "12px",
                      textAlign: "center",
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        color: "var(--text-secondary, #64748b)",
                      }}
                    >
                      Speed
                    </div>
                    <div
                      style={{
                        fontSize: "20px",
                        fontWeight: 800,
                        color: "var(--primary-color, #2563eb)",
                        marginTop: "2px",
                      }}
                    >
                      {speedKmH}{" "}
                      <span
                        style={{
                          fontSize: "11px",
                          color: "var(--text-secondary, #64748b)",
                        }}
                      >
                        km/h
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: "var(--card-bg, #ffffff)",
                      border: "1px solid var(--border-color, #e2e8f0)",
                      borderRadius: "12px",
                      padding: "12px",
                      textAlign: "center",
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        color: "var(--text-secondary, #64748b)",
                      }}
                    >
                      Distance
                    </div>
                    <div
                      style={{
                        fontSize: "20px",
                        fontWeight: 800,
                        color: "var(--success, #16a34a)",
                        marginTop: "2px",
                      }}
                    >
                      {activeTrip.distanceCoveredKm || 0}{" "}
                      <span
                        style={{
                          fontSize: "11px",
                          color: "var(--text-secondary, #64748b)",
                        }}
                      >
                        km
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor: "var(--card-bg, #ffffff)",
                      border: "1px solid var(--border-color, #e2e8f0)",
                      borderRadius: "12px",
                      padding: "12px",
                      textAlign: "center",
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        color: "var(--text-secondary, #64748b)",
                      }}
                    >
                      Accuracy
                    </div>
                    <div
                      style={{
                        fontSize: "20px",
                        fontWeight: 800,
                        color: "var(--warning, #f59e0b)",
                        marginTop: "2px",
                      }}
                    >
                      ±{accuracyM || 5}{" "}
                      <span
                        style={{
                          fontSize: "11px",
                          color: "var(--text-secondary, #64748b)",
                        }}
                      >
                        m
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* LEAFLET MAP WRAPPER (Dynamic height or Fullscreen) */}
              <div
                style={
                  isFullScreenMap
                    ? {
                        position: "fixed",
                        inset: 0,
                        zIndex: 9999,
                        width: "100vw",
                        height: "100vh",
                        backgroundColor: "#ffffff",
                      }
                    : {
                        backgroundColor: "var(--card-bg, #ffffff)",
                        border: "1px solid var(--border-color, #e2e8f0)",
                        borderRadius: "var(--radius-lg, 14px)",
                        overflow: "hidden",
                        marginBottom: "14px",
                        boxShadow: "var(--shadow-sm)",
                      }
                }
              >
                {/* Standard Map Card Header (Only when not in fullscreen mode) */}
                {!isFullScreenMap && (
                  <div
                    style={{
                      padding: "10px 14px",
                      borderBottom: "1px solid var(--border-color, #e2e8f0)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "var(--text-primary, #334155)",
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Navigation
                        size={14}
                        color="var(--primary-color, #2563eb)"
                      />{" "}
                      OpenStreetMap Telemetry
                    </span>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <button
                        type="button"
                        onClick={() => setIsFullScreenMap(true)}
                        style={{
                          backgroundColor: "var(--primary-light, #eff6ff)",
                          border: "1px solid var(--border-color, #cbd5e1)",
                          color: "var(--primary-color, #2563eb)",
                          fontSize: "12px",
                          fontWeight: 700,
                          padding: "4px 8px",
                          borderRadius: "6px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Maximize2 size={13} />
                        <span>Full Screen</span>
                      </button>

                      <button
                        type="button"
                        onClick={openExternalNavigation}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--primary-color, #2563eb)",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        Google Maps <ExternalLink size={12} />
                      </button>
                    </div>
                  </div>
                )}

                {/* FULL SCREEN FLOATING TOP HUD */}
                {isFullScreenMap && (
                  <div
                    style={{
                      position: "fixed",
                      top: "12px",
                      left: "12px",
                      right: "12px",
                      zIndex: 10000,
                      backgroundColor: "rgba(255, 255, 255, 0.95)",
                      backdropFilter: "blur(12px)",
                      border: "1px solid var(--border-color, #e2e8f0)",
                      borderRadius: "14px",
                      padding: "10px 14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "8px",
                          backgroundColor: "var(--primary-color, #2563eb)",
                          color: "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Truck size={18} />
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <strong
                            style={{
                              fontSize: "14px",
                              fontFamily: "monospace",
                              color: "var(--text-primary, #0f172a)",
                            }}
                          >
                            {activeTrip.tripNumber}
                          </strong>
                          <StatusField value={activeTrip.status} size={11} />
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "var(--text-secondary, #64748b)",
                            marginTop: "1px",
                          }}
                        >
                          Speed: <b>{speedKmH} km/h</b> &bull; Covered:{" "}
                          <b>{activeTrip.distanceCoveredKm || 0} km</b>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <button
                        type="button"
                        onClick={centerOnDriver}
                        style={{
                          padding: "6px 10px",
                          borderRadius: "8px",
                          border: "1px solid var(--border-color, #cbd5e1)",
                          backgroundColor: "#ffffff",
                          color: "var(--primary-color, #2563eb)",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                        title="Center GPS"
                      >
                        <Compass size={14} />
                        <span>GPS</span>
                      </button>

                      <button
                        type="button"
                        onClick={centerOnDestination}
                        style={{
                          padding: "6px 10px",
                          borderRadius: "8px",
                          border: "1px solid var(--border-color, #cbd5e1)",
                          backgroundColor: "#ffffff",
                          color: "#dc2626",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                        title="Show Destination"
                      >
                        <MapPin size={14} />
                        <span>Dest</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsFullScreenMap(false)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "8px",
                          border: "none",
                          backgroundColor: "var(--primary-color, #2563eb)",
                          color: "#ffffff",
                          fontSize: "12px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <Minimize2 size={14} />
                        <span>Exit</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* LEAFLET CANVAS */}
                <div
                  ref={mapRef}
                  style={{
                    height: isFullScreenMap ? "100vh" : "280px",
                    width: "100%",
                  }}
                />

                {/* FULL SCREEN FLOATING BOTTOM CONTROLS (Collapsible & Thumb-Friendly) */}
                {isFullScreenMap && (
                  <div
                    style={{
                      position: "fixed",
                      bottom: "16px",
                      left: "14px",
                      right: "14px",
                      zIndex: 10000,
                      maxWidth: "540px",
                      margin: "0 auto",
                      backgroundColor: "rgba(255, 255, 255, 0.96)",
                      backdropFilter: "blur(14px)",
                      border: "1px solid var(--border-color, #e2e8f0)",
                      borderRadius: "16px",
                      padding: isDrawerCollapsed ? "10px 14px" : "14px 16px",
                      boxShadow: "0 10px 30px rgba(0, 0, 0, 0.16)",
                      transition: "all 0.25s ease",
                    }}
                  >
                    {/* Collapsible toggle drag handle / header */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: isDrawerCollapsed ? "0" : "10px",
                        gap: "10px",
                      }}
                    >
                      <div
                        onClick={() => setIsDrawerCollapsed(!isDrawerCollapsed)}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          cursor: "pointer",
                          userSelect: "none",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "10px",
                            fontWeight: 700,
                            color: "var(--text-secondary, #64748b)",
                            textTransform: "uppercase",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          <span>Destination</span>
                          <span
                            style={{
                              fontSize: "10px",
                              color: "var(--primary-color, #2563eb)",
                              fontWeight: 600,
                            }}
                          >
                            {isDrawerCollapsed ? "• Tap to expand" : "• Tap to collapse"}
                          </span>
                        </div>
                        <strong
                          style={{
                            fontSize: "14px",
                            color: "var(--text-primary, #0f172a)",
                            display: "block",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {activeTrip.customerName}
                        </strong>
                        {!isDrawerCollapsed && (
                          <p
                            style={{
                              fontSize: "12px",
                              color: "var(--text-secondary, #475569)",
                              margin: "2px 0 0",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {activeTrip.destination?.address}
                          </p>
                        )}
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {activeTrip.customerPhone && (
                          <a
                            href={`tel:${activeTrip.customerPhone}`}
                            style={{
                              backgroundColor: "#ecfdf5",
                              color: "#059669",
                              border: "1px solid #a7f3d0",
                              padding: "6px 10px",
                              borderRadius: "8px",
                              fontSize: "12px",
                              fontWeight: 700,
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              flexShrink: 0,
                            }}
                          >
                            <Phone size={12} /> Call
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => setIsDrawerCollapsed(!isDrawerCollapsed)}
                          style={{
                            background: "none",
                            border: "1px solid var(--border-color, #e2e8f0)",
                            borderRadius: "8px",
                            padding: "5px 6px",
                            cursor: "pointer",
                            color: "var(--text-secondary, #64748b)",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          title={isDrawerCollapsed ? "Expand drawer" : "Collapse drawer"}
                        >
                          {isDrawerCollapsed ? (
                            <ChevronUp size={16} />
                          ) : (
                            <ChevronDown size={16} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Quick Action Buttons (Always accessible) */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "10px",
                        marginTop: isDrawerCollapsed ? "8px" : "0",
                      }}
                    >
                      <button
                        type="button"
                        onClick={openExternalNavigation}
                        style={{
                          padding: "10px",
                          borderRadius: "8px",
                          border: "1px solid var(--border-color, #cbd5e1)",
                          backgroundColor: "#ffffff",
                          color: "var(--text-primary, #0f172a)",
                          fontSize: "13px",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                        }}
                      >
                        <Navigation
                          size={14}
                          color="var(--primary-color, #2563eb)"
                        />
                        <span>Turn-by-Turn</span>
                      </button>

                      {activeTrip.status === "SCHEDULED" ? (
                        <button
                          type="button"
                          onClick={handleStartTrip}
                          disabled={refreshing}
                          className="so-primary-button"
                          style={{
                            padding: "10px",
                            fontSize: "13px",
                            fontWeight: 700,
                            justifyContent: "center",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            borderRadius: "8px",
                          }}
                        >
                          <Play size={14} fill="currentColor" />
                          <span>START TRIP</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowCompleteModal(true)}
                          className="so-primary-button"
                          style={{
                            padding: "10px",
                            fontSize: "13px",
                            fontWeight: 700,
                            justifyContent: "center",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            borderRadius: "8px",
                            backgroundColor: "var(--success, #16a34a)",
                            borderColor: "var(--success, #16a34a)",
                          }}
                        >
                          <CheckCircle2 size={14} />
                          <span>COMPLETE</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS (Only visible when not in fullscreen mode) */}
              {!isFullScreenMap && (
                <div style={{ marginTop: "16px" }}>
                  {activeTrip.status === "SCHEDULED" ? (
                    <button
                      type="button"
                      onClick={handleStartTrip}
                      disabled={refreshing}
                      className="so-primary-button"
                      style={{
                        width: "100%",
                        padding: "16px",
                        fontSize: "16px",
                        fontWeight: 700,
                        justifyContent: "center",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        borderRadius: "12px",
                      }}
                    >
                      <Play size={18} fill="currentColor" />
                      <span>START DELIVERY TRIP</span>
                    </button>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "12px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={openExternalNavigation}
                        style={{
                          padding: "14px",
                          fontSize: "14px",
                          fontWeight: 600,
                          justifyContent: "center",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          borderRadius: "12px",
                          backgroundColor: "var(--white, #ffffff)",
                          border: "1px solid var(--border-color, #cbd5e1)",
                          color: "var(--text-primary, #0f172a)",
                          cursor: "pointer",
                        }}
                      >
                        <Navigation
                          size={16}
                          color="var(--primary-color, #2563eb)"
                        />
                        <span>Turn-by-Turn</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowCompleteModal(true)}
                        className="so-primary-button"
                        style={{
                          padding: "14px",
                          fontSize: "14px",
                          fontWeight: 700,
                          justifyContent: "center",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          borderRadius: "12px",
                          backgroundColor: "var(--success, #16a34a)",
                          borderColor: "var(--success, #16a34a)",
                        }}
                      >
                        <CheckCircle2 size={16} />
                        <span>COMPLETE TRIP</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      ) : (
        /* 4. TRIP HISTORY VIEW */
        <main
          style={{
            padding: "16px",
            maxWidth: "580px",
            margin: "0 auto",
            width: "100%",
          }}
        >
          <h2
            style={{
              fontSize: "13px",
              fontWeight: 800,
              textTransform: "uppercase",
              color: "var(--text-secondary, #64748b)",
              marginBottom: "12px",
            }}
          >
            Recent Delivery History
          </h2>
          {pastTrips.length === 0 ? (
            <div
              style={{
                backgroundColor: "var(--card-bg, #ffffff)",
                border: "1px solid var(--border-color, #e2e8f0)",
                borderRadius: "var(--radius-lg, 14px)",
                padding: "30px",
                textAlign: "center",
                color: "var(--text-secondary, #64748b)",
              }}
            >
              No recent trips recorded.
            </div>
          ) : (
            pastTrips.map((t) => (
              <div
                key={t._id}
                style={{
                  backgroundColor: "var(--card-bg, #ffffff)",
                  border: "1px solid var(--border-color, #e2e8f0)",
                  borderRadius: "12px",
                  padding: "14px",
                  marginBottom: "10px",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "6px",
                  }}
                >
                  <strong
                    style={{
                      color: "var(--text-primary, #0f172a)",
                      fontSize: "14px",
                      fontFamily: "monospace",
                    }}
                  >
                    {t.tripNumber}
                  </strong>
                  <StatusField value={t.status} size={11} />
                </div>
                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--text-secondary, #475569)",
                    margin: "0 0 8px",
                  }}
                >
                  {t.customerName} &bull; {t.destination?.address}
                </p>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "11px",
                    color: "var(--text-muted, #94a3b8)",
                    borderTop: "1px solid var(--border-color, #f1f5f9)",
                    paddingTop: "6px",
                  }}
                >
                  <span>Distance: {t.distanceCoveredKm || 0} km</span>
                  <span>
                    {t.completedAt
                      ? new Date(t.completedAt).toLocaleDateString()
                      : new Date(t.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </main>
      )}

      {/* 5. DELIVERY COMPLETION MODAL USING BOXMODAL */}
      <BoxModal
        show={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        title="Confirm Delivery Handover"
        subtitle="Confirm that goods have been handed over safely to the customer"
        width="540px"
        footer={
          <div className="box-modal-footer-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCompleteModal(false)}
              disabled={submittingComplete}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleConfirmDelivery}
              loading={submittingComplete}
              disabled={submittingComplete}
            >
              {submittingComplete ? "Confirming..." : "Confirm Delivery"}
            </Button>
          </div>
        }
      >
        <div className="box-modal-section">
          <div className="box-modal-form-grid">
            <div className="box-modal-form-full">
              <Input
                label="Receiver / Signee Name"
                name="receiverName"
                value={receiverName}
                onChange={(e) => setReceiverName(e.target.value)}
                placeholder={activeTrip?.customerName || "e.g. John Doe"}
                disabled={submittingComplete}
              />
            </div>

            <div className="box-modal-form-full">
              <Textarea
                label="Delivery Notes / Remarks"
                name="deliveryNotes"
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="Goods verified and handed over in good condition"
                rows={3}
                disabled={submittingComplete}
              />
            </div>
          </div>
        </div>
      </BoxModal>
    </div>
  );
}
