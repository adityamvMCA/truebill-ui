import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Truck,
  MapPin,
  Navigation,
  RefreshCw,
  Search,
  Filter,
  Plus,
  Radio,
  Phone,
  Clock,
  Compass,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Maximize2,
  Minimize2,
  Layers,
  Activity,
  AlertCircle,
  X,
  Share2,
} from "lucide-react";
import toast from "react-hot-toast";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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
  const [sidePanelOpen, setSidePanelOpen] = useState(true);

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
      // Join tenant room so all driver updates for this company stream here
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const tenantId =
        localStorage.getItem("selectedTenantId") ||
        sessionStorage.getItem("selectedTenantId") ||
        user.tenantId;

      if (tenantId) {
        socket.emit("trip:join", { tenantId });
      }
    });

    socket.on("disconnect", () => {
      setIsSocketConnected(false);
    });

    // Real-time location stream from moving vehicles
    socket.on("fleet:driver_update", ({ driverId, tripId, location, distanceCoveredKm }) => {
      if (!location?.lat || !location?.lng) return;

      // Update state in trips
      setTrips((prevTrips) =>
        prevTrips.map((t) => {
          if (t._id === tripId || (driverId && t.driverId === driverId && t.status === "STARTED")) {
            const updatedPath = [...(t.path || []), { ...location, timestamp: new Date() }];
            return {
              ...t,
              status: "STARTED",
              currentLocation: location,
              distanceCoveredKm: distanceCoveredKm !== undefined ? distanceCoveredKm : t.distanceCoveredKm,
              path: updatedPath,
            };
          }
          return t;
        })
      );

      // Smoothly update marker on map
      updateVehicleMarkerOnMap(tripId, location, driverId);
    });

    // Real-time status changes (STARTED, COMPLETED)
    socket.on("fleet:status_update", ({ tripId, status, trip }) => {
      toast.success(
        `Trip ${trip?.tripNumber || "delivery"} status changed to ${status}`,
        { id: `status-${tripId}`, duration: 3000 }
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
      else setRefreshing(true);

      const [tripsRes, statsRes, driversRes] = await Promise.all([
        logisticsApi.getTrips({ limit: 100 }),
        logisticsApi.getFleetStats().catch(() => ({ data: { success: false } })),
        logisticsApi.getDrivers().catch(() => ({ data: { success: false } })),
      ]);

      if (tripsRes.data?.success) {
        setTrips(tripsRes.data.data || []);
      }
      if (statsRes.data?.success) {
        setStats(statsRes.data.data);
      }
      if (driversRes.data?.success) {
        setDrivers(driversRes.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load fleet data:", err);
      toast.error("Failed to refresh fleet tracking data");
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
      // Initialize OpenStreetMap via Leaflet
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false,
      }).setView([20.5937, 78.9629], 5); // Default India center

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    renderAllMarkersOnMap();
  }, [trips, statusFilter]);

  // Create custom vector vehicle icon
  const createVehicleIcon = (t, isSelected = false) => {
    const isMoving = t.status === "STARTED";
    const speed = t.currentLocation?.speed || 0;
    const bgCol = isMoving ? "#10b981" : "#64748b";
    const borderCol = isSelected ? "#3b82f6" : "#ffffff";

    return L.divIcon({
      className: `vehicle-marker-${t._id}`,
      html: `
        <div style="position:relative;width:44px;height:44px;cursor:pointer;">
          ${
            isMoving
              ? `<span style="position:absolute;inset:0;border-radius:50%;background:#10b981;opacity:0.35;animation:ping 1.8s cubic-bezier(0,0,0.2,1) infinite;"></span>`
              : ""
          }
          <div style="position:relative;background:${bgCol};width:44px;height:44px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:white;box-shadow:0 3px 12px rgba(0,0,0,0.35);border:3px solid ${borderCol};">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <rect x="1" y="3" width="15" height="13"></rect>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
              <circle cx="5.5" cy="18.5" r="2.5"></circle>
              <circle cx="18.5" cy="18.5" r="2.5"></circle>
            </svg>
          </div>
          ${
            isMoving && speed > 0
              ? `<div style="position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);background:#0f172a;color:#34d399;font-size:9px;font-weight:900;padding:1px 5px;border-radius:6px;border:1px solid #10b981;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.3);">
                  ${speed} km/h
                </div>`
              : ""
          }
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -22],
    });
  };

  const renderAllMarkersOnMap = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Filter relevant trips
    const filtered = trips.filter((t) => {
      if (statusFilter === "STARTED") return t.status === "STARTED";
      if (statusFilter === "SCHEDULED") return t.status === "SCHEDULED";
      if (statusFilter === "COMPLETED") return t.status === "COMPLETED";
      return true;
    });

    const currentTripIds = new Set(filtered.map((t) => t._id));

    // Remove markers that are no longer in the filter
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
        <div style="font-family:sans-serif;min-width:200px;padding:4px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <strong style="color:#0f172a;font-size:13px;">${t.tripNumber}</strong>
            <span style="background:${t.status === "STARTED" ? "#d1fae5" : "#f1f5f9"};color:${t.status === "STARTED" ? "#065f46" : "#475569"};font-size:10px;font-weight:700;padding:2px 6px;border-radius:99px;">
              ${t.status}
            </span>
          </div>
          <div style="font-size:12px;color:#334155;line-height:1.4;">
            <div><b>Driver:</b> ${t.driverName || "Assigned"} (${t.vehicleNumber || "VAN"})</div>
            <div><b>Customer:</b> ${t.customerName}</div>
            <div style="margin-top:4px;color:#64748b;font-size:11px;">${t.destination?.address || ""}</div>
            ${t.status === "STARTED" ? `<div style="margin-top:6px;font-weight:bold;color:#059669;">Speed: ${t.currentLocation?.speed || 0} km/h &bull; Covered: ${t.distanceCoveredKm || 0} km</div>` : ""}
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

    // Auto-fit bounds if we have points and no specific vehicle is selected
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

    // If currently selected, draw or update polyline
    if (selectedTripId === tripId) {
      drawRouteForSelectedTrip(tripId);
    }
  };

  // Draw breadcrumbs route line for the selected trip
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
      if (trip.path && trip.path.length > 0) {
        trip.path.forEach((p) => {
          if (p.lat && p.lng) points.push([p.lat, p.lng]);
        });
      }
      if (trip.currentLocation?.lat && trip.currentLocation?.lng) {
        points.push([trip.currentLocation.lat, trip.currentLocation.lng]);
      }

      if (points.length >= 2) {
        polylineRef.current = L.polyline(points, {
          color: "#059669",
          weight: 4,
          opacity: 0.85,
          dashArray: "6, 8",
        }).addTo(map);
      }
    },
    [trips]
  );

  const focusTripOnMap = (trip) => {
    setSelectedTripId(trip._id);
    const map = mapInstanceRef.current;
    if (!map) return;

    const lat = trip.currentLocation?.lat || trip.destination?.lat;
    const lng = trip.currentLocation?.lng || trip.destination?.lng;

    if (lat && lng) {
      map.flyTo([lat, lng], 15, { animate: true, duration: 1.2 });
      if (markersRef.current[trip._id]) {
        markersRef.current[trip._id].openPopup();
      }
    } else {
      toast("No GPS coordinate available yet for this vehicle", { icon: "ℹ️" });
    }

    drawRouteForSelectedTrip(trip._id);
  };

  // Filtered trips list for sidebar
  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      const matchesStatus =
        statusFilter === "ALL" || t.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.tripNumber?.toLowerCase().includes(q) ||
        t.customerName?.toLowerCase().includes(q) ||
        t.driverName?.toLowerCase().includes(q) ||
        t.vehicleNumber?.toLowerCase().includes(q) ||
        t.destination?.address?.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [trips, statusFilter, searchQuery]);

  // Selected trip details
  const activeSelectedTrip = useMemo(() => {
    return trips.find((t) => t._id === selectedTripId) || null;
  }, [trips, selectedTripId]);

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* 1. TOP STATS BAR */}
      <section className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-6 overflow-x-auto py-1 scrollbar-none">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              <Truck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white tracking-tight">
                  Fleet Tracking Command
                </h1>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isSocketConnected
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                      : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isSocketConnected ? "bg-emerald-400 animate-pulse" : "bg-rose-400"
                    }`}
                  ></span>
                  {isSocketConnected ? "Live Socket" : "Offline"}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Real-time OpenStreetMap Telemetry
              </p>
            </div>
          </div>

          <div className="h-7 w-px bg-slate-800 hidden sm:block"></div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-slate-400">Moving Vehicles:</span>
              <span className="font-extrabold text-emerald-400 text-sm">
                {stats.activeTrips || trips.filter((t) => t.status === "STARTED").length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400">Drivers:</span>
              <span className="font-bold text-white text-sm">
                {stats.totalDrivers || drivers.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400">Delivered Today:</span>
              <span className="font-bold text-cyan-400 text-sm">
                {stats.completedToday || trips.filter((t) => t.status === "COMPLETED").length}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => loadAllData(false)}
            disabled={refreshing}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition active:scale-95"
            title="Refresh Fleet Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => setShowDispatchModal(true)}
            className="py-1.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Dispatch Trip
          </button>
        </div>
      </section>

      {/* 2. MAIN SPLIT INTERFACE */}
      <div className="flex flex-1 relative overflow-hidden">
        {/* LEFT / SLIDE-OVER FLEET PANEL */}
        <aside
          className={`${
            sidePanelOpen ? "w-full sm:w-96" : "w-0"
          } transition-all duration-200 ease-in-out bg-slate-900 border-r border-slate-800 flex flex-col z-20 shrink-0 overflow-hidden`}
        >
          {/* Filters & Search */}
          <div className="p-3 border-b border-slate-800 space-y-2.5 shrink-0">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search trip, driver, vehicle..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
              />
            </div>

            {/* Status Tabs */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {[
                { id: "STARTED", label: "Moving" },
                { id: "SCHEDULED", label: "Queued" },
                { id: "COMPLETED", label: "Done" },
                { id: "ALL", label: "All" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition ${
                    statusFilter === tab.id
                      ? "bg-emerald-500 text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Trips List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {filteredTrips.length === 0 ? (
              <div className="text-center py-12 px-4 text-slate-400">
                <Truck className="w-10 h-10 stroke-1 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-semibold">No trips found matching filter</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Dispatch a trip or switch status tabs.
                </p>
              </div>
            ) : (
              filteredTrips.map((trip) => {
                const isSelected = trip._id === selectedTripId;
                const isStarted = trip.status === "STARTED";

                return (
                  <div
                    key={trip._id}
                    onClick={() => focusTripOnMap(trip)}
                    className={`p-3 rounded-xl border transition cursor-pointer ${
                      isSelected
                        ? "bg-slate-800/90 border-emerald-500 shadow-md ring-1 ring-emerald-500/30"
                        : "bg-slate-950/60 hover:bg-slate-800/50 border-slate-800"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white text-xs">
                          {trip.tripNumber}
                        </span>
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            isStarted
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : trip.status === "COMPLETED"
                              ? "bg-cyan-500/20 text-cyan-400"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {trip.status}
                        </span>
                      </div>

                      {isStarted && (
                        <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                          <Radio className="w-3 h-3 animate-pulse" />
                          {trip.currentLocation?.speed || 0} km/h
                        </span>
                      )}
                    </div>

                    {/* Driver & Vehicle */}
                    <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
                      <span>{trip.driverName || "Driver Assigned"}</span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {trip.vehicleNumber || "VAN"}
                      </span>
                    </div>

                    {/* Destination Address */}
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                      {trip.customerName} &bull; {trip.destination?.address}
                    </p>

                    {/* Footer Info */}
                    <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                      <span>Dist: {trip.distanceCoveredKm || 0} km</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const url = `${window.location.origin}/track/${trip.trackingToken}`;
                          navigator.clipboard.writeText(url);
                          toast.success("Customer tracking link copied to clipboard!");
                        }}
                        className="hover:text-emerald-400 flex items-center gap-1"
                        title="Copy Public Tracking Link"
                      >
                        <Share2 className="w-3 h-3" /> Copy Link
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* TOGGLE SIDE PANEL BUTTON */}
        <button
          onClick={() => setSidePanelOpen(!sidePanelOpen)}
          className="absolute left-2 top-3 z-30 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 p-2 rounded-xl shadow-xl transition"
          title={sidePanelOpen ? "Collapse Panel" : "Expand Panel"}
        >
          {sidePanelOpen ? <ChevronRight className="w-4 h-4 rotate-180" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {/* MAIN LEAFLET MAP VIEW */}
        <main className="flex-1 relative h-full">
          <div ref={mapContainerRef} className="w-full h-full z-10" />

          {/* ACTIVE TRIP FLOATING CARD (When a vehicle is selected) */}
          {activeSelectedTrip && (
            <div className="absolute bottom-5 right-5 z-30 bg-slate-900/95 border border-slate-700 backdrop-blur-md rounded-2xl p-4 shadow-2xl max-w-sm w-full">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Live Telemetry Focus
                  </span>
                  <h3 className="text-base font-black text-white">
                    {activeSelectedTrip.tripNumber}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedTripId(null)}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Driver:</span>
                  <span className="font-bold text-white">
                    {activeSelectedTrip.driverName} ({activeSelectedTrip.driverPhone})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Vehicle:</span>
                  <span className="font-bold text-white">
                    {activeSelectedTrip.vehicleNumber} ({activeSelectedTrip.vehicleType})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Customer:</span>
                  <span className="font-bold text-white">
                    {activeSelectedTrip.customerName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Destination:</span>
                  <span className="font-medium text-slate-200 text-right max-w-[200px] truncate">
                    {activeSelectedTrip.destination?.address}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-800">
                  <span className="text-slate-400">Speed / Distance:</span>
                  <span className="font-bold text-emerald-400">
                    {activeSelectedTrip.currentLocation?.speed || 0} km/h &bull;{" "}
                    {activeSelectedTrip.distanceCoveredKm || 0} km
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800 flex items-center gap-2">
                <a
                  href={`/track/${activeSelectedTrip.trackingToken}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-1.5 text-center bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition inline-flex items-center justify-center gap-1"
                >
                  Customer View <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/track/${activeSelectedTrip.trackingToken}`;
                    navigator.clipboard.writeText(url);
                    toast.success("Tracking link copied!");
                  }}
                  className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30"
                  title="Copy Tracking Link"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 3. DISPATCH TRIP MODAL */}
      {showDispatchModal && (
        <DispatchTripModal
          drivers={drivers}
          onClose={() => setShowDispatchModal(false)}
          onSuccess={() => {
            setShowDispatchModal(false);
            loadAllData(false);
          }}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// DISPATCH TRIP MODAL COMPONENT
// -------------------------------------------------------------
function DispatchTripModal({ drivers, onClose, onSuccess }) {
  const [driverId, setDriverId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [destinationLat, setDestinationLat] = useState("");
  const [destinationLng, setDestinationLng] = useState("");
  const [originAddress, setOriginAddress] = useState("Central Warehouse");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!driverId || !customerName.trim() || !destinationAddress.trim()) {
      toast.error("Please fill in Driver, Customer name, and Destination address");
      return;
    }

    try {
      setSubmitting(true);
      const res = await logisticsApi.createTrip({
        driverId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        destinationAddress: destinationAddress.trim(),
        destinationLat: destinationLat ? Number(destinationLat) : null,
        destinationLng: destinationLng ? Number(destinationLng) : null,
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

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">
              Dispatch New Logistics Delivery
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Driver Selection */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Select Fleet Driver *
            </label>
            <select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
            >
              <option value="">-- Choose Driver --</option>
              {drivers.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name} ({d.phone}) - {d.vehicleNumber || d.vehicleType} [{d.status}]
                </option>
              ))}
            </select>
          </div>

          {/* Customer Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Customer / Consignee Name *
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Acme Corporation"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Customer Phone
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Destination Address */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Destination Delivery Address *
            </label>
            <textarea
              value={destinationAddress}
              onChange={(e) => setDestinationAddress(e.target.value)}
              placeholder="e.g. 45 Industrial Area, Phase II, Bengaluru"
              rows={2}
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
            />
          </div>

          {/* Origin Address */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Pickup / Origin Location
            </label>
            <input
              type="text"
              value={originAddress}
              onChange={(e) => setOriginAddress(e.target.value)}
              placeholder="Central Warehouse"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
            />
          </div>

          {/* Dispatch Notes */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Special Handling / Dispatch Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Fragile electronic items; deliver before 4 PM"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold transition shadow-lg shadow-emerald-500/20 disabled:opacity-60 cursor-pointer"
            >
              {submitting ? "Dispatching..." : "Confirm & Dispatch"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
