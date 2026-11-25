import { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Search,
  Phone,
  Truck,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Shield,
  RotateCw,
  X,
  Lock,
} from "lucide-react";
import toast from "react-hot-toast";
import logisticsApi from "../../../services/modules/logisticsApi";

export default function DriversList() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const res = await logisticsApi.getDrivers();
      if (res.data?.success) {
        setDrivers(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load drivers list");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to deactivate and remove driver "${name}"?`)) {
      return;
    }
    try {
      const res = await logisticsApi.deleteDriver(id);
      if (res.data?.success) {
        toast.success("Driver removed successfully");
        fetchDrivers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete driver");
    }
  };

  const filtered = drivers.filter(
    (d) =>
      d.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.phone?.includes(search) ||
      d.vehicleNumber?.toLowerCase().includes(search.toLowerCase()) ||
      d.driverCode?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 bg-slate-950 min-h-[calc(100vh-65px)] text-slate-100 font-sans">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-400" />
            Fleet Drivers Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage company drivers, assigned delivery vehicles, and mobile portal access
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchDrivers}
            className="p-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-xl text-slate-300 transition"
            title="Refresh"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setEditingDriver(null);
              setShowAddModal(true);
            }}
            className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Add New Driver
          </button>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="mb-4 max-w-md relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, vehicle number..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-emerald-500"
        />
      </div>

      {/* DRIVERS TABLE / GRID */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase font-bold tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Driver Code</th>
                <th className="py-3.5 px-4">Driver Name</th>
                <th className="py-3.5 px-4">Phone / Login</th>
                <th className="py-3.5 px-4">Vehicle</th>
                <th className="py-3.5 px-4">License No.</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading drivers...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No drivers registered yet. Click &quot;Add New Driver&quot; to onboard your first driver.
                  </td>
                </tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d._id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-300">
                      {d.driverCode || "DRV"}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center text-xs font-bold">
                        {d.name.charAt(0).toUpperCase()}
                      </div>
                      {d.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        {d.phone}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-white">
                        {d.vehicleNumber || "Not assigned"}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1.5 px-1.5 py-0.5 rounded bg-slate-800">
                        {d.vehicleType || "VAN"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono">
                      {d.licenseNumber || "N/A"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          d.status === "ON_TRIP"
                            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                            : d.status === "AVAILABLE"
                            ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            d.status === "ON_TRIP"
                              ? "bg-emerald-400 animate-pulse"
                              : d.status === "AVAILABLE"
                              ? "bg-cyan-400"
                              : "bg-slate-500"
                          }`}
                        ></span>
                        {d.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditingDriver(d);
                            setShowAddModal(true);
                          }}
                          className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                          title="Edit Driver"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(d._id, d.name)}
                          className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                          title="Delete Driver"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT DRIVER MODAL */}
      {showAddModal && (
        <DriverModal
          driver={editingDriver}
          onClose={() => {
            setShowAddModal(false);
            setEditingDriver(null);
          }}
          onSuccess={() => {
            setShowAddModal(false);
            setEditingDriver(null);
            fetchDrivers();
          }}
        />
      )}
    </div>
  );
}

function DriverModal({ driver, onClose, onSuccess }) {
  const isEdit = Boolean(driver?._id);
  const [name, setName] = useState(driver?.name || "");
  const [phone, setPhone] = useState(driver?.phone || "");
  const [email, setEmail] = useState(driver?.email || "");
  const [password, setPassword] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState(driver?.vehicleNumber || "");
  const [vehicleType, setVehicleType] = useState(driver?.vehicleType || "VAN");
  const [licenseNumber, setLicenseNumber] = useState(driver?.licenseNumber || "");
  const [status, setStatus] = useState(driver?.status || "AVAILABLE");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error("Driver Name and Phone number are required");
      return;
    }
    if (!isEdit && !password.trim()) {
      toast.error("Please set a login password for the driver");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        vehicleNumber: vehicleNumber.trim().toUpperCase(),
        vehicleType,
        licenseNumber: licenseNumber.trim().toUpperCase(),
        status,
        ...(password.trim() ? { password: password.trim() } : {}),
      };

      if (isEdit) {
        await logisticsApi.updateDriver(driver._id, payload);
        toast.success("Driver updated successfully");
      } else {
        await logisticsApi.createDriver(payload);
        toast.success("Driver created and onboarded!");
      }

      onSuccess();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-400" />
            {isEdit ? "Edit Driver Profile" : "Register Fleet Driver"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Kumar"
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Phone Number (Login ID) *
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                {isEdit ? "Reset Password" : "Login Password *"}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isEdit ? "Leave blank to keep current" : "Min 4 characters"}
                required={!isEdit}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Vehicle Number
              </label>
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="e.g. KA-01-AB-1234"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white uppercase outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Vehicle Type
              </label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
              >
                <option value="VAN">Delivery Van</option>
                <option value="TRUCK">Heavy Truck</option>
                <option value="BIKE">Two Wheeler / Bike</option>
                <option value="THREE_WHEELER">Three Wheeler / Auto</option>
                <option value="CAR">Car / Sedan</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                License Number
              </label>
              <input
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="DL-XXXXXXXX"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white uppercase outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Driver Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
              >
                <option value="AVAILABLE">Available / Ready</option>
                <option value="ON_TRIP">On Trip</option>
                <option value="OFF_DUTY">Off Duty</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold transition shadow-lg shadow-emerald-500/20 disabled:opacity-60 cursor-pointer"
            >
              {submitting ? "Saving..." : isEdit ? "Update Driver" : "Save Driver"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
