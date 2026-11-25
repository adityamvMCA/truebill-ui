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
  Radio,
  ExternalLink,
  ShieldCheck,
  Clock,
  FileText,
  User,
  AlertTriangle,
  History,
} from "lucide-react";
import toast from "react-hot-toast";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import logisticsApi from "../../../services/modules/logisticsApi";
import { createLogisticsSocket } from "../../../services/modules/logisticsSocket";

export default function DriverPortal() {
  const navigate = useNavigate();
  const [driver, setDriver] = useState(null);
  const [activeTrip, setActiveTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("cockpit"); // "cockpit" | "history"
  const [pastTrips, setPastTrips] = useState([]);

  // Telemetry state
  const [isTracking, setIsTracking] = useState(false);
  const [currentCoords, setCurrentCoords] = useState(null);
  const [speedKmH, setSpeedKmH] = useState(0);
  const [accuracyM, setAccuracyM] = useState(0);
  const [lastPingTime, setLastPingTime] = useState(null);

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
  const routeLineRef = useRef(null);
  const activeTripRef = useRef(activeTrip);

  useEffect(() => {
    activeTripRef.current = activeTrip;
  }, [activeTrip]);

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

        // Join socket room if socket is open
        if (socketRef.current && trip?._id) {
          socketRef.current.emit("trip:join", {
            tripId: trip._id,
            driverId: driver?._id,
          });
        }

        // If trip is already STARTED, automatically engage GPS tracking!
        if (trip && trip.status === "STARTED") {
          startGpsTracking(trip._id);
        } else {
          stopGpsTracking();
        }
      }
    } catch (err) {
      console.error("Failed to fetch active trip:", err);
      if (err.response?.status === 401) {
        toast.error("Session expired. Please log in again.");
        handleLogout();
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch past trips history
  const fetchPastTrips = async () => {
    try {
      const res = await logisticsApi.getDriverTrips({ limit: 15 });
      if (res.data?.success) {
        setPastTrips(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch past trips:", err);
    }
  };

  // -------------------------------------------------------------
  // REAL-TIME GPS WATCHER & EMITTER
  // -------------------------------------------------------------
  const streamLocation = useCallback(
    (lat, lng, speed = 0, heading = 0, accuracy = 0) => {
      const tripId = activeTripRef.current?._id;
      if (!tripId) return;

      const spdKmh = speed ? Math.round(speed * 3.6) : 0;
      setCurrentCoords({ lat, lng });
      setSpeedKmH(spdKmh);
      setAccuracyM(Math.round(accuracy));
      setLastPingTime(new Date());

      // 1. Send via Socket for instant low-latency (<50ms) push
      if (socketRef.current?.connected) {
        socketRef.current.emit("driver:location", {
          tripId,
          driverId: driver?._id,
          lat,
          lng,
          speed: spdKmh,
          heading,
          accuracy,
        });
      }

      // Update map marker
      updateDriverMapMarker(lat, lng);
    },
    [driver?._id]
  );

  const startGpsTracking = useCallback(
    (tripId) => {
      if (!navigator.geolocation) {
        toast.error("Geolocation is not supported by your browser");
        return;
      }

      setIsTracking(true);

      // Clear previous watchers if any
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (periodicTimerRef.current) {
        clearInterval(periodicTimerRef.current);
      }

      // 1. HTML5 High-Accuracy Watch Position
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, speed, heading, accuracy } = pos.coords;
          streamLocation(latitude, longitude, speed || 0, heading || 0, accuracy || 0);
        },
        (err) => {
          console.warn("GPS watchPosition warning:", err.message);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 1000,
          timeout: 10000,
        }
      );

      // 2. Periodic fallback ping every 8 seconds (for resilience in mobile background tabs)
      periodicTimerRef.current = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude, speed, heading, accuracy } = pos.coords;
            streamLocation(latitude, longitude, speed || 0, heading || 0, accuracy || 0);

            // Also send HTTP fallback ping every 24s
            if (activeTripRef.current?._id) {
              logisticsApi
                .postDriverLocation(activeTripRef.current._id, {
                  lat: latitude,
                  lng: longitude,
                  speed: speed ? Math.round(speed * 3.6) : 0,
                  heading: heading || 0,
                  accuracy: accuracy || 0,
                })
                .catch(() => {});
            }
          },
          () => {},
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 2000 }
        );
      }, 8000);
    },
    [streamLocation]
  );

  const stopGpsTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (periodicTimerRef.current) {
      clearInterval(periodicTimerRef.current);
      periodicTimerRef.current = null;
    }
    setIsTracking(false);
  };

  // -------------------------------------------------------------
  // LEAFLET MAP INITIALIZATION & UPDATES
  // -------------------------------------------------------------
  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([20.5937, 78.9629], 5);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    // Add or update destination marker
    if (activeTrip?.destination?.lat && activeTrip?.destination?.lng) {
      const destCoords = [
        activeTrip.destination.lat,
        activeTrip.destination.lng,
      ];
      if (!destMarkerRef.current) {
        const destIcon = L.divIcon({
          className: "custom-dest-pin",
          html: `<div style="background-color:#ef4444;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;box-shadow:0 0 10px rgba(239,68,68,0.6);border:2px solid white;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 28],
        });
        destMarkerRef.current = L.marker(destCoords, { icon: destIcon })
          .addTo(mapInstanceRef.current)
          .bindPopup(`<b>Destination:</b><br/>${activeTrip.destination.address}`);
      } else {
        destMarkerRef.current.setLatLng(destCoords);
      }
    }

    // Set initial driver marker if location exists
    const initialLat =
      currentCoords?.lat || activeTrip?.currentLocation?.lat;
    const initialLng =
      currentCoords?.lng || activeTrip?.currentLocation?.lng;

    if (initialLat && initialLng) {
      updateDriverMapMarker(initialLat, initialLng);
      mapInstanceRef.current.setView([initialLat, initialLng], 14);
    }
  }, [activeTrip]);

  const updateDriverMapMarker = (lat, lng) => {
    if (!mapInstanceRef.current) return;

    const coords = [lat, lng];

    if (!driverMarkerRef.current) {
      const driverIcon = L.divIcon({
        className: "custom-driver-pin",
        html: `<div style="position:relative;width:34px;height:34px;">
          <span style="position:absolute;inset:0;border-radius:50%;background:#10b981;opacity:0.4;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></span>
          <div style="position:relative;background:#059669;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;box-shadow:0 2px 10px rgba(0,0,0,0.3);border:2.5px solid white;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
          </div>
        </div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      driverMarkerRef.current = L.marker(coords, { icon: driverIcon }).addTo(
        mapInstanceRef.current
      );
      mapInstanceRef.current.setView(coords, 14);
    } else {
      driverMarkerRef.current.setLatLng(coords);
    }
  };

  // -------------------------------------------------------------
  // TRIP ACTIONS: START & COMPLETE
  // -------------------------------------------------------------
  const handleStartTrip = async () => {
    if (!activeTrip) return;

    try {
      setRefreshing(true);
      toast.loading("Acquiring GPS location...", { id: "trip-action" });

      // Acquire current location
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
        async (error) => {
          // In case GPS permission denied or failed, allow starting without immediate coords
          console.warn("Starting without GPS coords:", error.message);
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
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } catch (err) {
      setRefreshing(false);
      toast.error(err.message || "Failed to initiate trip start", {
        id: "trip-action",
      });
    }
  };

  const handleConfirmDelivery = async (e) => {
    e.preventDefault();
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

  // Google Maps navigation link
  const openExternalNavigation = () => {
    if (!activeTrip?.destination?.address) return;
    const dest = activeTrip.destination.lat && activeTrip.destination.lng
      ? `${activeTrip.destination.lat},${activeTrip.destination.lng}`
      : encodeURIComponent(activeTrip.destination.address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${dest}`, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-medium">Connecting to Driver Cockpit...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-10">
      {/* 1. TOP APP BAR */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-slate-950 flex items-center justify-center shadow-md font-bold">
            <Truck className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight text-white flex items-center gap-2">
              {driver?.name || "Driver"}
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 border border-emerald-500/20">
                {driver?.vehicleNumber || "Active"}
              </span>
            </h1>
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  isTracking ? "bg-emerald-400 animate-pulse" : "bg-slate-500"
                }`}
              ></span>
              {isTracking ? "GPS Streaming Live" : "Standby / Idle"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={fetchActiveTrip}
            disabled={refreshing}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition active:scale-95"
            title="Refresh Trip Data"
          >
            <RotateCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition active:scale-95"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. TABS: COCKPIT vs TRIP HISTORY */}
      <div className="px-4 mt-3 flex items-center gap-2">
        <button
          onClick={() => setActiveTab("cockpit")}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === "cockpit"
              ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
              : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
          }`}
        >
          <Navigation className="w-3.5 h-3.5" />
          Live Cockpit
        </button>
        <button
          onClick={() => {
            setActiveTab("history");
            fetchPastTrips();
          }}
          className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeTab === "history"
              ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
              : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
          }`}
        >
          <History className="w-3.5 h-3.5" />
          Trip History
        </button>
      </div>

      {/* 3. MAIN COCKPIT VIEW */}
      {activeTab === "cockpit" ? (
        <main className="px-4 mt-4 space-y-4 max-w-xl mx-auto w-full">
          {/* A. If no active trip assigned */}
          {!activeTrip ? (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 text-center backdrop-blur shadow-xl">
              <div className="w-16 h-16 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-lg font-bold text-white mb-1">
                All Clear! Ready for Next Delivery
              </h2>
              <p className="text-sm text-slate-400 max-w-sm mx-auto mb-6">
                You have no active deliveries scheduled right now. As soon as dispatch assigns a trip, it will appear here.
              </p>
              <button
                onClick={fetchActiveTrip}
                disabled={refreshing}
                className="py-2.5 px-5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold inline-flex items-center gap-2 transition"
              >
                <RotateCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                Check For New Trips
              </button>
            </div>
          ) : (
            /* B. Active Trip Card */
            <>
              {/* STATUS & TRIP NUMBER HERO CARD */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
                      Active Delivery Trip
                    </span>
                    <h2 className="text-xl font-black text-white mt-0.5 tracking-tight">
                      {activeTrip.tripNumber}
                    </h2>
                  </div>

                  <span
                    className={`px-3 py-1 text-xs font-black uppercase tracking-wider rounded-full flex items-center gap-1.5 ${
                      activeTrip.status === "STARTED"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                    }`}
                  >
                    <Radio className="w-3.5 h-3.5 animate-pulse" />
                    {activeTrip.status}
                  </span>
                </div>

                {/* Destination Details */}
                <div className="space-y-3 pt-3 border-t border-slate-800">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 font-medium">Deliver To:</p>
                      <p className="text-sm font-bold text-white leading-snug">
                        {activeTrip.customerName}
                      </p>
                      <p className="text-xs text-slate-300 mt-0.5">
                        {activeTrip.destination?.address}
                      </p>
                    </div>
                  </div>

                  {activeTrip.customerPhone && (
                    <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                      <span className="text-xs text-slate-400 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {activeTrip.customerPhone}
                      </span>
                      <a
                        href={`tel:${activeTrip.customerPhone}`}
                        className="py-1 px-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-bold rounded-lg transition inline-flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" /> Call
                      </a>
                    </div>
                  )}

                  {activeTrip.notes && (
                    <div className="text-xs text-slate-400 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/50 flex items-start gap-2">
                      <FileText className="w-3.5 h-3.5 shrink-0 text-slate-500 mt-0.5" />
                      <span>{activeTrip.notes}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* LIVE TELEMETRY STATS (Only when started) */}
              {activeTrip.status === "STARTED" && (
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Current Speed
                    </span>
                    <p className="text-xl font-black text-emerald-400 mt-0.5">
                      {speedKmH} <span className="text-xs font-semibold text-slate-400">km/h</span>
                    </p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Distance
                    </span>
                    <p className="text-xl font-black text-cyan-400 mt-0.5">
                      {activeTrip.distanceCoveredKm || 0}{" "}
                      <span className="text-xs font-semibold text-slate-400">km</span>
                    </p>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      GPS Accuracy
                    </span>
                    <p className="text-xl font-black text-amber-400 mt-0.5">
                      ±{accuracyM || 5}{" "}
                      <span className="text-xs font-semibold text-slate-400">m</span>
                    </p>
                  </div>
                </div>
              )}

              {/* OPEN SOURCE MAP (LEAFLET / OSM) */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5">
                    <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                    OpenStreetMap Live View
                  </span>
                  <button
                    onClick={openExternalNavigation}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1"
                  >
                    Google Maps <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
                <div
                  ref={mapRef}
                  style={{ height: "260px", width: "100%", zIndex: 1 }}
                />
              </div>

              {/* ACTION BUTTONS */}
              <div className="space-y-2.5 pt-2">
                {activeTrip.status === "SCHEDULED" ? (
                  <button
                    onClick={handleStartTrip}
                    disabled={refreshing}
                    className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.99] text-slate-950 font-black text-lg rounded-2xl shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2.5 transition cursor-pointer"
                  >
                    <Play className="w-6 h-6 fill-current" />
                    START DELIVERY TRIP
                  </button>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      onClick={openExternalNavigation}
                      className="py-3.5 px-4 bg-slate-800 hover:bg-slate-700 active:scale-[0.99] text-white font-bold rounded-xl flex items-center justify-center gap-2 transition border border-slate-700 text-sm cursor-pointer"
                    >
                      <Navigation className="w-4 h-4 text-cyan-400" />
                      Turn-by-Turn Nav
                    </button>

                    <button
                      onClick={() => setShowCompleteModal(true)}
                      className="py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 font-black rounded-xl shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition text-sm cursor-pointer"
                    >
                      <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                      COMPLETE DELIVERY
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
      ) : (
        /* 4. TRIP HISTORY VIEW */
        <main className="px-4 mt-4 space-y-3 max-w-xl mx-auto w-full">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Recent Delivery History
          </h2>
          {pastTrips.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-sm">
              No recent trips recorded.
            </div>
          ) : (
            pastTrips.map((t) => (
              <div
                key={t._id}
                className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">
                    {t.tripNumber}
                  </span>
                  <span
                    className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                      t.status === "COMPLETED"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {t.status}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium">
                  {t.customerName} &bull; {t.destination?.address}
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/60">
                  <span>Dist: {t.distanceCoveredKm || 0} km</span>
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

      {/* 5. DELIVERY COMPLETION MODAL */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              Confirm Delivery Completion
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter receiver details to mark this trip successfully completed.
            </p>

            <form onSubmit={handleConfirmDelivery} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Receiver Name / Person who accepted goods
                </label>
                <input
                  type="text"
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  placeholder={activeTrip?.customerName || "e.g. John Doe"}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Delivery Notes / Remarks
                </label>
                <textarea
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="Goods verified and handed over in good condition"
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none focus:border-emerald-500"
                ></textarea>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingComplete}
                  className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold text-sm transition shadow-lg shadow-emerald-500/20 disabled:opacity-60"
                >
                  {submittingComplete ? "Confirming..." : "Confirm Delivery"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
