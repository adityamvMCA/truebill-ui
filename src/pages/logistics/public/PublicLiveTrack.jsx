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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white font-sans">
        <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-medium">Connecting to Live Tracking...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white px-4 font-sans">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white mb-1">
            Tracking Link Unavailable
          </h2>
          <p className="text-sm text-slate-400">{errorMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Banner */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
            <Truck className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">
              Live Order Delivery Tracking
            </h1>
            <p className="text-xs text-slate-400">Order: {trip.tripNumber}</p>
          </div>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
            trip.status === "COMPLETED"
              ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
              : trip.status === "STARTED"
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : "bg-slate-800 text-slate-400"
          }`}
        >
          {trip.status === "STARTED" && (
            <Radio className="w-3.5 h-3.5 animate-pulse" />
          )}
          {trip.status === "STARTED" ? "OUT FOR DELIVERY" : trip.status}
        </span>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row relative">
        {/* Info Drawer */}
        <div className="w-full md:w-80 bg-slate-900/90 border-r border-slate-800 p-4 space-y-4 z-20 shrink-0">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400">
              Delivery Recipient
            </span>
            <p className="text-sm font-bold text-white">{trip.customerName}</p>
            <p className="text-xs text-slate-300 leading-snug">
              {trip.destination?.address}
            </p>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400">
              Assigned Vehicle & Driver
            </span>
            <div className="flex justify-between">
              <span className="text-slate-400">Driver:</span>
              <span className="font-bold text-white">{trip.driverName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Vehicle No:</span>
              <span className="font-bold text-white font-mono">
                {trip.vehicleNumber || trip.vehicleType}
              </span>
            </div>
            {trip.driverPhone && (
              <div className="pt-2 border-t border-slate-800">
                <a
                  href={`tel:${trip.driverPhone}`}
                  className="w-full py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold rounded-lg transition inline-flex items-center justify-center gap-2"
                >
                  <Phone className="w-3.5 h-3.5" /> Call Driver
                </a>
              </div>
            )}
          </div>

          {trip.status === "STARTED" && (
            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 text-center text-xs">
              <span className="text-emerald-400 font-bold flex items-center justify-center gap-1 mb-1">
                <Radio className="w-3.5 h-3.5 animate-pulse" /> Live Telemetry
              </span>
              <p className="text-slate-300 text-[11px]">
                Driver is on the way. Speed:{" "}
                <span className="font-bold text-white">
                  {liveLocation?.speed || 0} km/h
                </span>{" "}
                &bull; Covered:{" "}
                <span className="font-bold text-white">
                  {trip.distanceCoveredKm || 0} km
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Leaflet Map */}
        <div className="flex-1 relative min-h-[400px]">
          <div ref={mapContainerRef} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
}
