import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Truck, Phone, Lock, Eye, EyeOff, LogIn, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import logisticsApi from "../../../services/modules/logisticsApi";

export default function DriverLogin() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!phone.trim() || !password.trim()) {
      setErrorMsg("Please enter both phone number and password");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");
      const res = await logisticsApi.driverLogin({
        phone: phone.trim(),
        password: password.trim(),
      });

      if (res.data?.success) {
        const { token, driver } = res.data.data;
        localStorage.setItem("driver_token", token);
        localStorage.setItem("driver_user", JSON.stringify(driver));
        toast.success(`Welcome back, ${driver.name}!`);
        navigate("/driver", { replace: true });
      } else {
        setErrorMsg(res.data?.message || "Login failed");
      }
    } catch (err) {
      console.error("Driver login failed:", err);
      const msg =
        err.response?.data?.message ||
        "Invalid phone number or password. Please try again.";
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center px-4 py-8">
      {/* Background ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-emerald-600/15 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-blue-600/15 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl relative z-10">
        {/* App Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/25 mb-4">
            <Truck className="w-8 h-8 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Driver Delivery Cockpit
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time Logistics & GPS Tracking Portal
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Registered Phone Number
            </label>
            <div className="relative">
              <Phone className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                required
                className="w-full bg-slate-950/80 border border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl pl-11 pr-4 py-3 text-white placeholder-slate-500 text-base outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Driver Password
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                className="w-full bg-slate-950/80 border border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl pl-11 pr-12 py-3 text-white placeholder-slate-500 text-base outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition disabled:opacity-60 disabled:cursor-not-allowed text-base cursor-pointer"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <LogIn className="w-5 h-5 stroke-[2.5]" />
                <span>Log In & Start Shift</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800 text-center">
          <p className="text-xs text-slate-500">
            Account assigned by your logistics dispatcher. Need access? Contact your fleet manager.
          </p>
        </div>
      </div>
    </div>
  );
}
