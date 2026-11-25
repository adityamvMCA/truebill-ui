import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Truck,
  Plus,
  Search,
  MapPin,
  ExternalLink,
  Share2,
  RotateCw,
  Navigation,
  CheckCircle2,
  Clock,
  Radio,
} from "lucide-react";
import toast from "react-hot-toast";
import logisticsApi from "../../../services/modules/logisticsApi";

export default function TripsList() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchTrips();
  }, [statusFilter]);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await logisticsApi.getTrips(params);
      if (res.data?.success) {
        setTrips(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load trips");
    } finally {
      setLoading(false);
    }
  };

  const copyTrackingLink = (token) => {
    const url = `${window.location.origin}/track/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Customer tracking link copied to clipboard!");
  };

  const filtered = trips.filter(
    (t) =>
      t.tripNumber?.toLowerCase().includes(search.toLowerCase()) ||
      t.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      t.driverName?.toLowerCase().includes(search.toLowerCase()) ||
      t.destination?.address?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 bg-slate-950 min-h-[calc(100vh-65px)] text-slate-100 font-sans">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Truck className="w-6 h-6 text-emerald-400" />
            Logistics Trips & Dispatch History
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track and monitor delivery dispatches, receiver confirmations, and active routes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/logistics/fleet")}
            className="py-2 px-3.5 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-emerald-400 font-bold text-xs rounded-xl flex items-center gap-1.5 transition"
          >
            <Navigation className="w-4 h-4" />
            Live Fleet Map
          </button>
          <button
            onClick={fetchTrips}
            className="p-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-slate-300 transition"
            title="Refresh"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SEARCH & FILTERS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by trip #, customer, driver, address..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
          {[
            { id: "", label: "All" },
            { id: "STARTED", label: "Moving / Started" },
            { id: "SCHEDULED", label: "Scheduled" },
            { id: "COMPLETED", label: "Completed" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`py-1.5 px-3 rounded-lg font-semibold transition ${
                statusFilter === tab.id
                  ? "bg-emerald-500 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TRIPS TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase font-bold tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Trip Number</th>
                <th className="py-3.5 px-4">Customer & Destination</th>
                <th className="py-3.5 px-4">Driver & Vehicle</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Distance</th>
                <th className="py-3.5 px-4">Started / Delivered</th>
                <th className="py-3.5 px-4 text-right">Customer Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading trips...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No trips found for the selected filter.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => {
                  const isStarted = t.status === "STARTED";

                  return (
                    <tr key={t._id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        {t.tripNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">
                          {t.customerName}
                        </div>
                        <div className="text-[11px] text-slate-400 max-w-xs truncate">
                          {t.destination?.address}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-200">
                          {t.driverName}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {t.vehicleNumber || t.vehicleType}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isStarted
                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                              : t.status === "COMPLETED"
                              ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {isStarted && (
                            <Radio className="w-3 h-3 animate-pulse" />
                          )}
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-300">
                        {t.distanceCoveredKm || 0} km
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {t.startedAt ? (
                          <div>
                            Started: {new Date(t.startedAt).toLocaleTimeString()}
                          </div>
                        ) : (
                          <div>
                            Created: {new Date(t.createdAt).toLocaleDateString()}
                          </div>
                        )}
                        {t.completedAt && (
                          <div className="text-emerald-400">
                            Delivered: {new Date(t.completedAt).toLocaleTimeString()}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => copyTrackingLink(t.trackingToken)}
                          className="py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 text-xs font-semibold inline-flex items-center gap-1.5 transition"
                          title="Copy tracking URL for customer"
                        >
                          <Share2 className="w-3.5 h-3.5" /> Share
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
