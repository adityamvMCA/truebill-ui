import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  Truck,
  MapPin,
  Navigation,
  CheckCircle2,
  Phone,
  Clock,
  Radio,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import logisticsApi from "../../../services/modules/logisticsApi";
import { createLogisticsSocket } from "../../../services/modules/logisticsSocket";
import "../logistics.css";

export default function PublicLiveTrack() {
  const { token } = useParams();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [liveLocation, setLiveLocation] = useState(null);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const vehicleMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const polylineRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    // 1. Fetch trip details via public token
    logisticsApi
      .getPublicTracking(token)
      .then((res) => {
        if (res.data?.success) {
          const t = res.data.data;
          setTrip(t);
          if (t.currentLocation) {
            setLiveLocation(t.currentLocation);
          }
        } else {
          setErrorMsg(res.data?.message || "Invalid tracking link");
        }
      })
      .catch((err) => {
        setErrorMsg(
          err.response?.data?.message || "Tracking link not found or expired"
        );
      })
      .finally(() => {
        setLoading(false);
      });

    // 2. Setup socket for real-time customer updates
    const socket = createLogisticsSocket();
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("trip:join", { trackingToken: token });
    });

    socket.on("trip:location_update", ({ location, distanceCoveredKm }) => {
      if (location?.lat && location?.lng) {
        setLiveLocation(location);
        setTrip((prev) =>
          prev
            ? {
                ...prev,
                currentLocation: location,
                distanceCoveredKm:
                  distanceCoveredKm !== undefined
                    ? distanceCoveredKm
                    : prev.distanceCoveredKm,
              }
            : prev
        );
      }
    });

    socket.on("trip:status_update", ({ status, trip: updatedTrip }) => {
      if (updatedTrip) {
        setTrip(updatedTrip);
      } else {
        setTrip((prev) => (prev ? { ...prev, status } : prev));
      }
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [token]);

  // Leaflet map initialization
  useEffect(() => {
    if (!mapContainerRef.current || !trip) return;

    if (!mapInstanceRef.current) {
      const initialLat =
        liveLocation?.lat || trip.destination?.lat || 20.5937;
      const initialLng =
        liveLocation?.lng || trip.destination?.lng || 78.9629;

      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false,
      }).setView([initialLat, initialLng], 14);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const bounds = [];

    // Destination marker
    if (trip.destination?.lat && trip.destination?.lng) {
      const destCoords = [trip.destination.lat, trip.destination.lng];
      bounds.push(destCoords);

      if (!destMarkerRef.current) {
        const destIcon = L.divIcon({
          className: "dest-pin",
          html: `<div style="background:#ef4444;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;box-shadow:0 3px 10px rgba(0,0,0,0.3);border:2.5px solid white;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });
        destMarkerRef.current = L.marker(destCoords, { icon: destIcon })
          .addTo(map)
          .bindPopup(`<b>Destination</b><br/>${trip.destination.address}`);
      }
    }

    // Vehicle marker
    const vehLat = liveLocation?.lat || trip.currentLocation?.lat;
    const vehLng = liveLocation?.lng || trip.currentLocation?.lng;

    if (vehLat && vehLng) {
      const vehCoords = [vehLat, vehLng];
      bounds.push(vehCoords);

      if (!vehicleMarkerRef.current) {
        const vehIcon = L.divIcon({
          className: "vehicle-pin",
          html: `<div style="position:relative;width:40px;height:40px;">
            <span style="position:absolute;inset:0;border-radius:50%;background:#10b981;opacity:0.4;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></span>
            <div style="position:relative;background:#059669;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;box-shadow:0 3px 12px rgba(0,0,0,0.4);border:3px solid white;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>
            </div>
          </div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });
        vehicleMarkerRef.current = L.marker(vehCoords, { icon: vehIcon })
          .addTo(map)
          .bindPopup(`<b>Your Delivery Vehicle</b><br/>${trip.vehicleNumber}`);
      } else {
        vehicleMarkerRef.current.setLatLng(vehCoords);
      }
    }

    if (bounds.length > 0) {
      try {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      } catch {}
    }
  }, [trip, liveLocation]);

  if (loading) {
    return (
      <div className="driver-login-page">
        <div style={{ textAlign: "center" }}>
          <div className="driver-logo-box" style={{ animation: "pulse 2s infinite" }}>
            <Truck size={32} />
          </div>
          <p style={{ color: "#94a3b8", fontWeight: 600 }}>Connecting to Live Tracking...</p>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="login-container">
        <div className="login-card" style={{ textAlign: "center" }}>
          <AlertCircle size={44} color="var(--danger, #dc2626)" style={{ margin: "0 auto 12px" }} />
          <h1>Tracking Link Unavailable</h1>
          <p className="login-subtitle" style={{ marginBottom: 0 }}>{errorMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="driver-portal-layout" style={{ minHeight: "100vh" }}>
      {/* Top Banner */}
      <header className="driver-header">
        <div className="driver-header-left">
          <div className="driver-avatar-box">
            <Truck size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="driver-title-text">Live Delivery Tracking</h1>
            <div style={{ fontSize: 11, color: "#64748b" }}>Order #{trip.tripNumber}</div>
          </div>
        </div>

        <span
          className={
            trip.status === "STARTED"
              ? "driver-badge-started"
              : "driver-badge-scheduled"
          }
        >
          {trip.status === "STARTED" && <Radio size={14} />}
          {trip.status === "STARTED" ? "OUT FOR DELIVERY" : trip.status}
        </span>
      </header>

      {/* Main Container */}
      <div style={{ display: "flex", flex: 1, flexDirection: "column", position: "relative" }}>
        {/* Info Box */}
        <div style={{ padding: 16, maxWidth: 580, margin: "0 auto", width: "100%" }}>
          <div className="driver-card" style={{ marginBottom: 12 }}>
            <span className="driver-trip-label">Recipient</span>
            <h4 style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: "4px 0 2px" }}>
              {trip.customerName}
            </h4>
            <p style={{ fontSize: 12, color: "#475569", margin: 0 }}>{trip.destination?.address}</p>
          </div>

          <div className="driver-card" style={{ marginBottom: 12, fontSize: 12 }}>
            <span className="driver-trip-label" style={{ display: "block", marginBottom: 8 }}>
              Vehicle & Driver
            </span>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ color: "#64748b" }}>Driver:</span>
              <strong style={{ color: "#0f172a" }}>{trip.driverName}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ color: "#64748b" }}>Vehicle:</span>
              <strong style={{ color: "#0f172a" }}>{trip.vehicleNumber || trip.vehicleType}</strong>
            </div>
            {trip.driverPhone && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #e2e8f0" }}>
                <a
                  href={`tel:${trip.driverPhone}`}
                  className="driver-call-btn"
                  style={{ width: "100%", justifyContent: "center", padding: 8 }}
                >
                  <Phone size={14} /> Call Driver ({trip.driverPhone})
                </a>
              </div>
            )}
          </div>

          {trip.status === "STARTED" && (
            <div
              style={{
                background: "#ecfdf5",
                border: "1px solid #a7f3d0",
                borderRadius: 12,
                padding: "10px 14px",
                textAlign: "center",
                fontSize: 12,
                color: "#059669",
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Radio size={14} />
              <span>
                Vehicle is moving live &bull; Speed:{" "}
                <strong>{liveLocation?.speed || 0} km/h</strong> &bull; Distance:{" "}
                <strong>{trip.distanceCoveredKm || 0} km</strong>
              </span>
            </div>
          )}

          {/* Map */}
          <div className="driver-map-wrapper">
            <div className="driver-map-header">
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Navigation size={14} color="#059669" /> OpenStreetMap Vehicle Route
              </span>
            </div>
            <div ref={mapContainerRef} style={{ height: 320, width: "100%" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
