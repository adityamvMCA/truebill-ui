import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useLocation } from "react-router-dom";
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
  Layers,
  Crosshair,
  ArrowUp,
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
import api from "../../../services/api";
import logisticsApi from "../../../services/modules/logisticsApi";
import { createLogisticsSocket } from "../../../services/modules/logisticsSocket";
import {
  geocodeAddress,
  fetchRoadRoute,
  formatDistance,
  formatDuration,
  calculateBearing,
  calculateDistanceKm,
  searchAreas,
  reverseGeocode,
  MAP_LAYERS,
} from "../../../utils/logisticsGeo";

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
  const [initialDispatchData, setInitialDispatchData] = useState(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const [sidePanelOpen, setSidePanelOpen] = useState(() => typeof window !== "undefined" && window.innerWidth >= 768);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [mapLayer, setMapLayer] = useState("streets"); // "streets" | "satellite"
  const [areaSearchQuery, setAreaSearchQuery] = useState("");
  const [areaResults, setAreaResults] = useState([]);
  const [isSearchingArea, setIsSearchingArea] = useState(false);
  const [showAreaResults, setShowAreaResults] = useState(false);

  const location = useLocation();

  // Auto-open dispatch modal if navigating from a Delivery Note
  useEffect(() => {
    if (location.state?.dispatchNote) {
      setInitialDispatchData(location.state.dispatchNote);
      setShowDispatchModal(true);
    }
  }, [location.state]);

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
  const tileLayerRef = useRef(null);
  const areaSearchMarkerRef = useRef(null);
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

    // Handle high-frequency live GPS updates for vehicle
    const handleIncomingLocation = (data) => {
      const { tripId, location, driverId, distanceCoveredKm, remainingKm, etaMinutes } = data;
      if (!tripId || !location) return;

      setTrips((prevTrips) =>
        prevTrips.map((t) => {
          if (t._id === tripId) {
            let heading = location.heading;
            if (!heading && t.currentLocation?.lat && (t.currentLocation.lat !== location.lat || t.currentLocation.lng !== location.lng)) {
              heading = calculateBearing(t.currentLocation.lat, t.currentLocation.lng, location.lat, location.lng);
            }

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
              distanceCoveredKm: distanceCoveredKm !== undefined ? distanceCoveredKm : t.distanceCoveredKm,
              remainingKm: remainingKm !== undefined ? remainingKm : t.remainingKm,
              etaMinutes: etaMinutes !== undefined ? etaMinutes : t.etaMinutes,
              currentLocation: {
                lat: location.lat,
                lng: location.lng,
                speed: location.speed || 0,
                heading: heading || t.currentLocation?.heading || 0,
                updatedAt: location.timestamp || new Date(),
              },
              locationBreadcrumbs: updatedBreadcrumbs,
            };
          }
          return t;
        })
      );

      updateVehicleMarkerOnMap(tripId, location, driverId);
    };

    socket.on("fleet:driver_update", handleIncomingLocation);
    socket.on("trip:location_update", handleIncomingLocation);

    // Real-time trip status changes & updates
    const handleTripStatusUpdate = () => {
      loadAllData(false);
    };
    socket.on("trip:status_change", handleTripStatusUpdate);
    socket.on("trip:status_update", handleTripStatusUpdate);
    socket.on("fleet:status_update", handleTripStatusUpdate);

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

      // Auto-resolve coordinates for trips that only have text addresses
      if (Array.isArray(tripsList)) {
        tripsList.forEach(async (t) => {
          if (!t.destination?.lat && t.destination?.address) {
            const geo = await geocodeAddress(t.destination.address);
            if (geo) {
              setTrips((prev) =>
                prev.map((item) =>
                  item._id === t._id
                    ? {
                        ...item,
                        destination: {
                          ...item.destination,
                          lat: geo.lat,
                          lng: geo.lng,
                        },
                      }
                    : item
                )
              );
            }
          }
        });
      }
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

      const initialLayer = MAP_LAYERS[mapLayer] || MAP_LAYERS.streets;
      tileLayerRef.current = L.tileLayer(initialLayer.url, initialLayer.options).addTo(map);

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

  // Switch map layer between Streets & Satellite
  const switchMapLayer = (layerKey) => {
    setMapLayer(layerKey);
    const map = mapInstanceRef.current;
    if (!map) return;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const layer = MAP_LAYERS[layerKey] || MAP_LAYERS.streets;
    tileLayerRef.current = L.tileLayer(layer.url, layer.options).addTo(map);
  };

  // Map Area Search with auto-fly & inspection pin
  const handleAreaSearch = async (val) => {
    setAreaSearchQuery(val);
    if (!val || val.trim().length < 2) {
      setAreaResults([]);
      setShowAreaResults(false);
      return;
    }
    setIsSearchingArea(true);
    setShowAreaResults(true);
    try {
      const results = await searchAreas(val);
      setAreaResults(results);
    } catch {
      setAreaResults([]);
    } finally {
      setIsSearchingArea(false);
    }
  };

  const handleSelectArea = (item) => {
    setShowAreaResults(false);
    setAreaSearchQuery(item.label);
    const map = mapInstanceRef.current;
    if (!map) return;

    map.flyTo([item.lat, item.lng], 16, { duration: 1.5 });

    if (areaSearchMarkerRef.current) {
      map.removeLayer(areaSearchMarkerRef.current);
    }

    const pinIcon = L.divIcon({
      className: "area-search-pin",
      html: `
        <div style="position:relative;display:flex;flex-direction:column;align-items:center;">
          <div style="background:#2563eb;color:#ffffff;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 3px 10px rgba(0,0,0,0.3);margin-bottom:3px;">
            📍 ${item.label.split(",")[0]}
          </div>
          <div style="width:14px;height:14px;background:#2563eb;border:2.5px solid #ffffff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>
        </div>
      `,
      iconSize: [120, 40],
      iconAnchor: [60, 36],
    });

    areaSearchMarkerRef.current = L.marker([item.lat, item.lng], { icon: pinIcon })
      .addTo(map)
      .bindPopup(`<b>${item.label}</b><br/>Lat: ${item.lat.toFixed(5)}, Lng: ${item.lng.toFixed(5)}`)
      .openPopup();
  };

  // Create Rapido / Uber style directional vector vehicle icon
  const createVehicleIcon = (t, isSelected = false) => {
    const isMoving = t.status === "STARTED";
    const speed = t.currentLocation?.speed || 0;
    const heading = t.currentLocation?.heading || 0;
    const bgCol = isMoving ? "#0ea5e9" : "#64748b";
    const borderCol = isSelected ? "#0284c7" : "#ffffff";
    const eta = t.etaMinutes ? `${t.etaMinutes}m` : null;

    return L.divIcon({
      className: `vehicle-marker-${t._id}`,
      html: `
        <div style="position:relative;width:44px;height:44px;cursor:pointer;user-select:none;">
          ${
            isMoving
              ? `<span style="position:absolute;inset:-4px;border-radius:50%;background:#0ea5e9;opacity:0.35;animation:ping 1.8s cubic-bezier(0,0,0.2,1) infinite;"></span>`
              : ""
          }
          <!-- Rotating Heading Arrow & Vehicle Shell -->
          <div style="transform: rotate(${heading}deg); transition: transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1); width:44px; height:44px; display:flex; align-items:center; justify-content:center; position:relative;">
            <!-- Front directional needle pointer -->
            <div style="position:absolute;top:-6px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:8px solid #0284c7;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.3));"></div>

            <!-- Central Vehicle Hub -->
            <div style="position:relative;background:${bgCol};width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;box-shadow:0 4px 14px rgba(0,0,0,0.3);border:2.5px solid ${borderCol};">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
                <rect x="1" y="3" width="15" height="13"></rect>
                <polygon points="16 8 20 8 23 11 23 16 16 16 8"></polygon>
                <circle cx="5.5" cy="18.5" r="2.5"></circle>
                <circle cx="18.5" cy="18.5" r="2.5"></circle>
              </svg>
            </div>
          </div>

          <!-- Speed & ETA badges -->
          ${
            isMoving && (speed > 0 || eta)
              ? `<div style="position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);background:#0f172a;color:#38bdf8;font-size:9px;font-weight:800;padding:1px 5px;border-radius:6px;border:1px solid #0ea5e9;white-space:nowrap;box-shadow:0 2px 4px rgba(0,0,0,0.3);display:flex;gap:3px;align-items:center;">
                  ${speed > 0 ? `<span>${speed} km/h</span>` : ""}
                  ${eta ? `<span style="color:#a7f3d0;">• ${eta}</span>` : ""}
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
      const trip = trips.find((t) => t._id === tripId);
      if (trip) {
        marker.setIcon(createVehicleIcon({ ...trip, currentLocation: location }, selectedTripId === tripId));
      }
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

      const startPt = [
        trip.currentLocation?.lat || trip.origin?.lat,
        trip.currentLocation?.lng || trip.origin?.lng,
      ];
      const endPt = [trip.destination?.lat, trip.destination?.lng];

      if (startPt[0] && startPt[1] && endPt[0] && endPt[1]) {
        fetchRoadRoute(startPt, endPt).then(({ coordinates }) => {
          if (!mapInstanceRef.current) return;
          if (polylineRef.current) {
            mapInstanceRef.current.removeLayer(polylineRef.current);
          }
          const polyline = L.polyline(coordinates, {
            color: "#0284c7",
            weight: 5,
            opacity: 0.9,
            lineCap: "round",
            lineJoin: "round",
          }).addTo(mapInstanceRef.current);
          polylineRef.current = polyline;
          try {
            mapInstanceRef.current.fitBounds(coordinates, { padding: [50, 50], maxZoom: 16 });
          } catch {}
        });
        return;
      }

      const points = [];
      if (trip.origin?.lat && trip.origin?.lng) {
        points.push([trip.origin.lat, trip.origin.lng]);
      }

      const crumbs = trip.path || trip.locationBreadcrumbs;
      if (Array.isArray(crumbs)) {
        crumbs.forEach((pt) => {
          if (pt.lat && pt.lng) points.push([pt.lat, pt.lng]);
        });
      }

      if (trip.currentLocation?.lat && trip.currentLocation?.lng) {
        points.push([trip.currentLocation.lat, trip.currentLocation.lng]);
      }

      // Also connect to destination point if known
      if (trip.destination?.lat && trip.destination?.lng) {
        points.push([trip.destination.lat, trip.destination.lng]);
      }

      if (points.length > 1) {
        const polyline = L.polyline(points, {
          color: "#0284c7",
          weight: 4,
          opacity: 0.85,
          dashArray: "6, 6",
          smoothFactor: 1,
        }).addTo(map);

        polylineRef.current = polyline;

        try {
          map.fitBounds(points, { padding: [50, 50], maxZoom: 15 });
        } catch {}
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

          {/* FLOATING MAP AREA SEARCH BAR (Item 7: Admin can search area in map) */}
          <div
            style={{
              position: "absolute",
              top: "14px",
              left: isMobile ? "60px" : "16px",
              zIndex: 35,
              width: isMobile ? "calc(100% - 130px)" : "320px",
            }}
          >
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                backgroundColor: "#ffffff",
                borderRadius: "10px",
                border: "1px solid var(--border-color, #cbd5e1)",
                boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
                padding: "2px 8px",
              }}
            >
              <Search size={15} color="#64748b" style={{ flexShrink: 0, marginRight: "6px" }} />
              <input
                type="text"
                value={areaSearchQuery}
                onChange={(e) => handleAreaSearch(e.target.value)}
                onFocus={() => {
                  if (areaResults.length > 0) setShowAreaResults(true);
                }}
                placeholder="Search area, landmark, locality..."
                style={{
                  border: "none",
                  outline: "none",
                  fontSize: "12px",
                  padding: "6px 0",
                  width: "100%",
                  color: "#0f172a",
                  backgroundColor: "transparent",
                }}
              />
              {isSearchingArea && (
                <RefreshCw size={13} color="#0284c7" style={{ animation: "spin 1s linear infinite" }} />
              )}
              {areaSearchQuery && !isSearchingArea && (
                <button
                  type="button"
                  onClick={() => {
                    setAreaSearchQuery("");
                    setAreaResults([]);
                    setShowAreaResults(false);
                  }}
                  style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8", padding: "2px" }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Area Search Results Autocomplete Dropdown */}
            {showAreaResults && areaResults.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  right: 0,
                  backgroundColor: "#ffffff",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                  maxHeight: "220px",
                  overflowY: "auto",
                  zIndex: 40,
                }}
              >
                {areaResults.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectArea(item)}
                    style={{
                      padding: "8px 12px",
                      cursor: "pointer",
                      borderBottom: idx < areaResults.length - 1 ? "1px solid #f1f5f9" : "none",
                      fontSize: "12px",
                      lineHeight: "1.3",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>{item.label.split(",")[0]}</div>
                    <div style={{ fontSize: "10px", color: "#64748b" }}>{item.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* FLOATING QUICK MAP CONTROLS */}
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

            {/* Satellite / Streets Map Switcher (Item 6) */}
            <button
              type="button"
              onClick={() => switchMapLayer(mapLayer === "satellite" ? "streets" : "satellite")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 8px",
                borderRadius: "6px",
                border: "1px solid var(--border-color, #e2e8f0)",
                backgroundColor: mapLayer === "satellite" ? "#1e293b" : "#fff",
                fontSize: "11px",
                fontWeight: 600,
                color: mapLayer === "satellite" ? "#38bdf8" : "var(--text-main, #334155)",
                cursor: "pointer",
              }}
              title={mapLayer === "satellite" ? "Switch to Streets View" : "Switch to Satellite View"}
            >
              <Layers size={13} />
              <span>{mapLayer === "satellite" ? "🛰️ Satellite" : "🗺️ Streets"}</span>
            </button>

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
                    flexDirection: "column",
                    gap: "4px",
                    fontSize: "11px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600, color: "#0284c7" }}>
                    <span>Speed: {activeSelectedTrip.currentLocation?.speed || 0} km/h</span>
                    <span>Covered: {activeSelectedTrip.distanceCoveredKm || 0} km</span>
                  </div>
                  {(activeSelectedTrip.remainingKm || activeSelectedTrip.etaMinutes) && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#059669" }}>
                      <span>Remaining: {activeSelectedTrip.remainingKm || "--"} km</span>
                      <span>ETA: {activeSelectedTrip.etaMinutes ? `${activeSelectedTrip.etaMinutes} mins` : "--"}</span>
                    </div>
                  )}
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
        initialData={initialDispatchData}
        onClose={() => {
          setShowDispatchModal(false);
          setInitialDispatchData(null);
        }}
        onSuccess={() => {
          setShowDispatchModal(false);
          setInitialDispatchData(null);
          loadAllData(false);
        }}
      />
    </div>
  );
}

// -------------------------------------------------------------
// DISPATCH TRIP MODAL USING BOXMODAL & FORM SYSTEM
// (With Interactive Map Area Search & Draggable Destination Pin)
// -------------------------------------------------------------
function DispatchTripModal({ isOpen, drivers, initialData, onClose, onSuccess }) {
  const [driverId, setDriverId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [destCoords, setDestCoords] = useState(null); // { lat, lng }
  const [originAddress, setOriginAddress] = useState("Central Warehouse");
  const [notes, setNotes] = useState("");
  const [deliveryNoteId, setDeliveryNoteId] = useState("");
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Modal Map States & Refs
  const [destLayer, setDestLayer] = useState("streets");
  const [modalAreaQuery, setModalAreaQuery] = useState("");
  const [modalAreaResults, setModalAreaResults] = useState([]);
  const [isModalSearching, setIsModalSearching] = useState(false);
  const [showModalResults, setShowModalResults] = useState(false);

  const modalMapContainerRef = useRef(null);
  const modalMapInstanceRef = useRef(null);
  const modalMarkerRef = useRef(null);
  const modalTileLayerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setDriverId(initialData.driverId || "");
        setCustomerName(initialData.customerName || "");
        setCustomerPhone(initialData.customerPhone || "");
        setDestinationAddress(initialData.destinationAddress || "");
        setOriginAddress(initialData.originAddress || "Central Warehouse");
        setNotes(initialData.notes || "");
        setDeliveryNoteId(initialData.deliveryNoteId || "");
        setDeliveryNoteNumber(initialData.deliveryNoteNumber || "");

        if (initialData.destination?.lat && initialData.destination?.lng) {
          setDestCoords({
            lat: initialData.destination.lat,
            lng: initialData.destination.lng,
          });
        } else if (initialData.destinationAddress) {
          geocodeAddress(initialData.destinationAddress).then((geo) => {
            if (geo) setDestCoords(geo);
          });
        } else {
          setDestCoords({ lat: 20.5937, lng: 78.9629 });
        }
      } else {
        setDriverId("");
        setCustomerName("");
        setCustomerPhone("");
        setDestinationAddress("");
        setDestCoords({ lat: 20.5937, lng: 78.9629 });
        setOriginAddress("Central Warehouse");
        setNotes("");
        setDeliveryNoteId("");
        setDeliveryNoteNumber("");
      }
      setModalAreaQuery("");
      setModalAreaResults([]);
      setShowModalResults(false);
    }
  }, [isOpen, initialData]);

  // Initialize interactive Leaflet map inside modal
  useEffect(() => {
    if (!isOpen || !modalMapContainerRef.current) return;

    const timer = setTimeout(() => {
      if (!modalMapContainerRef.current) return;

      const defaultLat = destCoords?.lat || 20.5937;
      const defaultLng = destCoords?.lng || 78.9629;
      const defaultZoom = destCoords ? 14 : 5;

      if (!modalMapInstanceRef.current) {
        const map = L.map(modalMapContainerRef.current, {
          zoomControl: true,
          attributionControl: false,
        }).setView([defaultLat, defaultLng], defaultZoom);

        const layer = MAP_LAYERS[destLayer] || MAP_LAYERS.streets;
        modalTileLayerRef.current = L.tileLayer(layer.url, layer.options).addTo(map);
        modalMapInstanceRef.current = map;

        // Custom draggable red pin icon
        const pinIcon = L.divIcon({
          className: "modal-draggable-pin",
          html: `
            <div style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:grab;">
              <div style="background:#ef4444;color:#ffffff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:6px;box-shadow:0 2px 8px rgba(0,0,0,0.3);margin-bottom:2px;white-space:nowrap;">
                📍 Drop-off Pin
              </div>
              <div style="width:28px;height:28px;background:#ef4444;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;box-shadow:0 3px 10px rgba(0,0,0,0.3);border:2.5px solid white;">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
              </div>
            </div>
          `,
          iconSize: [80, 50],
          iconAnchor: [40, 48],
        });

        const marker = L.marker([defaultLat, defaultLng], {
          icon: pinIcon,
          draggable: true,
        }).addTo(map);
        modalMarkerRef.current = marker;

        // Handle Pin Drag
        marker.on("dragend", async (e) => {
          const pos = e.target.getLatLng();
          setDestCoords({ lat: pos.lat, lng: pos.lng });
          try {
            const geo = await reverseGeocode(pos.lat, pos.lng);
            if (geo?.address) {
              setDestinationAddress(geo.address);
              toast.success("Destination address updated from pinned location!");
            }
          } catch {}
        });

        // Handle Map Click to Reposition Pin
        map.on("click", async (e) => {
          const pos = e.latlng;
          marker.setLatLng(pos);
          setDestCoords({ lat: pos.lat, lng: pos.lng });
          try {
            const geo = await reverseGeocode(pos.lat, pos.lng);
            if (geo?.address) {
              setDestinationAddress(geo.address);
              toast.success("Destination address updated from pinned location!");
            }
          } catch {}
        });
      } else {
        const map = modalMapInstanceRef.current;
        map.invalidateSize();
        if (destCoords) {
          map.setView([destCoords.lat, destCoords.lng], 14);
          if (modalMarkerRef.current) {
            modalMarkerRef.current.setLatLng([destCoords.lat, destCoords.lng]);
          }
        }
      }
    }, 180);

    return () => {
      clearTimeout(timer);
      if (!isOpen && modalMapInstanceRef.current) {
        modalMapInstanceRef.current.remove();
        modalMapInstanceRef.current = null;
        modalMarkerRef.current = null;
      }
    };
  }, [isOpen]);

  // Switch tile layer in modal
  const handleModalLayerSwitch = (layerKey) => {
    setDestLayer(layerKey);
    const map = modalMapInstanceRef.current;
    if (!map) return;
    if (modalTileLayerRef.current) {
      map.removeLayer(modalTileLayerRef.current);
    }
    const layer = MAP_LAYERS[layerKey] || MAP_LAYERS.streets;
    modalTileLayerRef.current = L.tileLayer(layer.url, layer.options).addTo(map);
  };

  // Search area inside modal
  const handleModalAreaSearch = async (val) => {
    setModalAreaQuery(val);
    if (!val || val.trim().length < 2) {
      setModalAreaResults([]);
      setShowModalResults(false);
      return;
    }
    setIsModalSearching(true);
    setShowModalResults(true);
    try {
      const results = await searchAreas(val);
      setModalAreaResults(results);
    } catch {
      setModalAreaResults([]);
    } finally {
      setIsModalSearching(false);
    }
  };

  const handleSelectModalArea = (item) => {
    setShowModalResults(false);
    setModalAreaQuery(item.label);
    setDestCoords({ lat: item.lat, lng: item.lng });
    setDestinationAddress(item.label);

    const map = modalMapInstanceRef.current;
    if (map) {
      map.flyTo([item.lat, item.lng], 15, { duration: 1.2 });
      if (modalMarkerRef.current) {
        modalMarkerRef.current.setLatLng([item.lat, item.lng]);
      }
    }
  };

  // Locate destination address on map manually
  const handleLocateAddressOnMap = async () => {
    if (!destinationAddress.trim()) return;
    try {
      const geo = await geocodeAddress(destinationAddress);
      if (geo) {
        setDestCoords(geo);
        const map = modalMapInstanceRef.current;
        if (map) {
          map.flyTo([geo.lat, geo.lng], 15, { duration: 1.2 });
          if (modalMarkerRef.current) {
            modalMarkerRef.current.setLatLng([geo.lat, geo.lng]);
          }
        }
        toast.success("Located address on map! Drag pin to adjust exact spot.");
      } else {
        toast.error("Could not find coordinates for this address. Use area search above.");
      }
    } catch {}
  };

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
        destinationLat: destCoords?.lat || undefined,
        destinationLng: destCoords?.lng || undefined,
        originAddress: originAddress.trim(),
        notes: notes.trim(),
        deliveryNoteId: deliveryNoteId || undefined,
        deliveryNoteNumber: deliveryNoteNumber || undefined,
      });

      if (res.data?.success) {
        toast.success("Delivery trip dispatched successfully!");
        if (deliveryNoteNumber) {
          try {
            await api.deliveryNote.dispatch(deliveryNoteNumber, {
              dispatchRemarks: "Dispatched with driver via Fleet Command",
            });
            toast.success(`Delivery Note #${deliveryNoteNumber} marked as DISPATCHED!`);
          } catch (dnErr) {
            console.warn("Could not auto-mark delivery note as dispatched:", dnErr);
          }
        }
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
      subtitle="Assign a driver, vehicle, and fine-tune the delivery pin on the interactive map"
      width="820px"
      footer={footer}
    >
      {deliveryNoteNumber && (
        <div
          style={{
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "8px",
            padding: "10px 14px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "13px",
            color: "#1e40af",
            fontWeight: 500,
          }}
        >
          <span style={{ fontSize: "16px" }}>📋</span>
          <span>
            Linked to Delivery Note: <strong>#{deliveryNoteNumber}</strong> (Customer & destination pre-filled)
          </span>
        </div>
      )}

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
            <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
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
              <button
                type="button"
                onClick={handleLocateAddressOnMap}
                style={{
                  height: "42px",
                  padding: "0 12px",
                  marginBottom: "4px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#f8fafc",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#0284c7",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
                title="Geocode & center map on this address"
              >
                <Crosshair size={14} />
                Locate
              </button>
            </div>
          </div>

          {/* ITEM 7: Interactive Destination Pin Adjuster Map */}
          <div className="box-modal-form-full" style={{ marginTop: "4px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "6px",
                flexWrap: "wrap",
                gap: "6px",
              }}
            >
              <label style={{ fontSize: "12px", fontWeight: 700, color: "#334155", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>📍 Drop-off Pin Location</span>
                <span style={{ fontSize: "11px", fontWeight: 500, color: "#64748b" }}>
                  (Drag pin or click map to adjust exact GPS drop-off spot)
                </span>
              </label>

              {/* Satellite / Streets toggle in modal */}
              <div style={{ display: "flex", gap: "4px" }}>
                <button
                  type="button"
                  onClick={() => handleModalLayerSwitch("streets")}
                  style={{
                    padding: "3px 8px",
                    borderRadius: "4px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: destLayer === "streets" ? "#0284c7" : "#fff",
                    color: destLayer === "streets" ? "#fff" : "#475569",
                    fontSize: "10px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  🗺️ Streets
                </button>
                <button
                  type="button"
                  onClick={() => handleModalLayerSwitch("satellite")}
                  style={{
                    padding: "3px 8px",
                    borderRadius: "4px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: destLayer === "satellite" ? "#1e293b" : "#fff",
                    color: destLayer === "satellite" ? "#38bdf8" : "#475569",
                    fontSize: "10px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  🛰️ Satellite
                </button>
              </div>
            </div>

            {/* Modal Area Search Input with Autocomplete */}
            <div style={{ position: "relative", marginBottom: "8px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  padding: "4px 8px",
                }}
              >
                <Search size={14} color="#64748b" style={{ marginRight: "6px" }} />
                <input
                  type="text"
                  value={modalAreaQuery}
                  onChange={(e) => handleModalAreaSearch(e.target.value)}
                  onFocus={() => {
                    if (modalAreaResults.length > 0) setShowModalResults(true);
                  }}
                  placeholder="Search area / locality to fly pin directly (e.g. Indiranagar, Bangalore)..."
                  style={{
                    border: "none",
                    outline: "none",
                    fontSize: "11px",
                    width: "100%",
                    color: "#0f172a",
                  }}
                />
                {isModalSearching && (
                  <RefreshCw size={12} color="#0284c7" style={{ animation: "spin 1s linear infinite" }} />
                )}
                {modalAreaQuery && !isModalSearching && (
                  <button
                    type="button"
                    onClick={() => {
                      setModalAreaQuery("");
                      setModalAreaResults([]);
                      setShowModalResults(false);
                    }}
                    style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8" }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {showModalResults && modalAreaResults.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    backgroundColor: "#ffffff",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    boxShadow: "0 6px 18px rgba(0,0,0,0.12)",
                    maxHeight: "180px",
                    overflowY: "auto",
                    zIndex: 100,
                  }}
                >
                  {modalAreaResults.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectModalArea(item)}
                      style={{
                        padding: "6px 10px",
                        cursor: "pointer",
                        borderBottom: idx < modalAreaResults.length - 1 ? "1px solid #f1f5f9" : "none",
                        fontSize: "11px",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f8fafc")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{item.label.split(",")[0]}</div>
                      <div style={{ fontSize: "10px", color: "#64748b" }}>{item.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Interactive Mini Map Canvas */}
            <div
              style={{
                borderRadius: "8px",
                overflow: "hidden",
                border: "1px solid #cbd5e1",
                position: "relative",
              }}
            >
              <div ref={modalMapContainerRef} style={{ height: "200px", width: "100%" }} />
              {destCoords && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "8px",
                    left: "8px",
                    zIndex: 400,
                    backgroundColor: "rgba(15, 23, 42, 0.85)",
                    backdropFilter: "blur(4px)",
                    color: "#38bdf8",
                    fontSize: "10px",
                    padding: "3px 8px",
                    borderRadius: "4px",
                    fontWeight: 600,
                  }}
                >
                  GPS: {destCoords.lat.toFixed(5)}, {destCoords.lng.toFixed(5)}
                </div>
              )}
            </div>
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
