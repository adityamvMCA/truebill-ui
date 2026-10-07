import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Building2,
  Search,
  Plus,
  ArrowRight,
  Users,
  CheckCircle2,
  Clock,
  Ban,
  RefreshCw,
} from "lucide-react";

import "./traders.css";
import api from "../../services/api";
import CreateTraderModal from "./CreateTraderModal";

function Traders() {
  const navigate = useNavigate();

  const [traders, setTraders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreateTrader, setShowCreateTrader] = useState(false);

  /* =====================================================
     LOAD TRADERS
  ===================================================== */

  const loadTraders = async () => {
    setLoading(true);

    try {
      const response = await api.tenants.getAll();

      const result = response?.data;

      if (result?.success) {
        setTraders(result?.tenants || []);
      } else {
        toast.error(result?.message || "Unable to load traders");
      }
    } catch (error) {
      console.error("Load traders error:", error);

      toast.error(error?.response?.data?.message || "Unable to load traders");
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     INITIAL LOAD
  ===================================================== */

  useEffect(() => {
    let cancelled = false;

    const fetchTraders = async () => {
      try {
        const response = await api.tenants.getAll();

        if (cancelled) return;

        const result = response?.data;

        if (result?.success) {
          setTraders(result?.tenants || []);
        } else {
          toast.error(result?.message || "Unable to load traders");
        }
      } catch (error) {
        if (cancelled) return;

        console.error("Initial traders load error:", error);

        toast.error(error?.response?.data?.message || "Unable to load traders");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchTraders();

    return () => {
      cancelled = true;
    };
  }, []);

  /* =====================================================
     SELECT TRADER
  ===================================================== */

  const handleSelectTrader = (trader) => {
    if (!trader?._id) {
      toast.error("Invalid trader");
      return;
    }

    sessionStorage.setItem("selectedTenantId", trader._id);

    sessionStorage.setItem("selectedClientCode", trader.clientCode || "");

    sessionStorage.setItem("selectedTenant", JSON.stringify(trader));

    window.dispatchEvent(new Event("tenantChanged"));

    toast.success(`${trader.businessName} selected`);

    navigate("/dashboard");
  };

  /* =====================================================
     FILTER TRADERS
  ===================================================== */

  const filteredTraders = traders.filter((trader) => {
    const value = search.toLowerCase().trim();

    if (!value) {
      return true;
    }

    return (
      trader.businessName?.toLowerCase().includes(value) ||
      trader.clientCode?.toLowerCase().includes(value) ||
      trader.email?.toLowerCase().includes(value) ||
      trader.phone?.toLowerCase().includes(value)
    );
  });

  /* =====================================================
     STATUS ICON
  ===================================================== */

  const getStatusIcon = (status) => {
    if (status === "active") {
      return <CheckCircle2 size={15} />;
    }

    if (status === "trial") {
      return <Clock size={15} />;
    }

    return <Ban size={15} />;
  };

  /* =====================================================
     CREATE TRADER SUCCESS
  ===================================================== */

  const handleTraderCreated = async () => {
    /*
     * Close modal
     */
    setShowCreateTrader(false);

    /*
     * Refresh trader list
     */
    await loadTraders();
  };

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <div className="traders-page">
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="traders-header">
        <div>
          <div className="page-title-row">
            <div className="page-title-icon">
              <Building2 size={22} />
            </div>

            <div>
              <h1>Traders</h1>

              <p>Manage and access your TrustIQ ERP traders</p>
            </div>
          </div>
        </div>

        <div className="traders-header-actions">
          {/* REFRESH */}

          <button
            type="button"
            className="secondary-button"
            onClick={loadTraders}
            disabled={loading}
          >
            <RefreshCw size={17} className={loading ? "spin-icon" : ""} />
            Refresh
          </button>

          {/* ADD TRADER */}

          <button
            type="button"
            className="traders-add-button"
            onClick={() => setShowCreateTrader(true)}
          >
            <Plus size={18} />

            <span>Add Trader</span>
          </button>
        </div>
      </div>

      {/* =================================================
          SUMMARY
      ================================================= */}

      <div className="traders-summary">
        {/* TOTAL */}

        <div className="summary-card">
          <div className="summary-icon">
            <Building2 size={20} />
          </div>

          <div>
            <span>Total Traders</span>

            <strong>{traders.length}</strong>
          </div>
        </div>

        {/* ACTIVE */}

        <div className="summary-card">
          <div className="summary-icon">
            <CheckCircle2 size={20} />
          </div>

          <div>
            <span>Active</span>

            <strong>
              {traders.filter((item) => item.status === "active").length}
            </strong>
          </div>
        </div>

        {/* TRIAL */}

        <div className="summary-card">
          <div className="summary-icon">
            <Clock size={20} />
          </div>

          <div>
            <span>Trial</span>

            <strong>
              {traders.filter((item) => item.status === "trial").length}
            </strong>
          </div>
        </div>

        {/* USERS */}

        <div className="summary-card">
          <div className="summary-icon">
            <Users size={20} />
          </div>

          <div>
            <span>Total Users</span>

            <strong>
              {traders.reduce(
                (total, trader) => total + Number(trader.userCount || 0),
                0,
              )}
            </strong>
          </div>
        </div>
      </div>

      {/* =================================================
          TRADERS CARD
      ================================================= */}

      <div className="traders-card">
        {/* TOOLBAR */}

        <div className="traders-toolbar">
          <div>
            <h2>All Traders</h2>

            <span>
              {filteredTraders.length} trader
              {filteredTraders.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* SEARCH */}

          <div className="traders-search">
            <Search size={18} />

            <input
              type="text"
              placeholder="Search traders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* =================================================
            LOADING
        ================================================= */}

        {loading ? (
          <div className="traders-loading">
            <RefreshCw size={24} className="spin-icon" />

            <span>Loading traders...</span>
          </div>
        ) : filteredTraders.length === 0 ? (
          /* =================================================
             EMPTY
          ================================================= */

          <div className="traders-empty">
            <div className="empty-icon">
              <Building2 size={28} />
            </div>

            <h3>{search ? "No traders found" : "No traders yet"}</h3>

            <p>
              {search
                ? "Try changing your search."
                : "Create your first trader to get started."}
            </p>

            {!search && (
              <button
                type="button"
                className="primary-button"
                onClick={() => setShowCreateTrader(true)}
              >
                <Plus size={17} />
                Add Trader
              </button>
            )}
          </div>
        ) : (
          /* =================================================
             TABLE
          ================================================= */

          <div className="traders-table-wrapper">
            <table className="traders-table">
              <thead>
                <tr>
                  <th>Trader</th>

                  <th>Client Code</th>

                  <th>Contact</th>

                  <th>Plan</th>

                  <th>Users</th>

                  <th>Status</th>

                  <th></th>
                </tr>
              </thead>

              <tbody>
                {filteredTraders.map((trader) => (
                  <tr key={trader._id}>
                    {/* TRADER */}

                    <td>
                      <div className="trader-name">
                        <div className="trader-avatar">
                          {trader.businessName?.charAt(0)?.toUpperCase() || "T"}
                        </div>

                        <div>
                          <strong>{trader.businessName}</strong>

                          <span>{trader.email || "No email"}</span>
                        </div>
                      </div>
                    </td>

                    {/* CLIENT CODE */}

                    <td>
                      <span className="client-code">{trader.clientCode}</span>
                    </td>

                    {/* CONTACT */}

                    <td>
                      <div className="contact-info">
                        <strong>{trader.phone || "-"}</strong>

                        <span>{trader.city || trader.state || ""}</span>
                      </div>
                    </td>

                    {/* PLAN */}

                    <td>
                      <span className="plan-badge">
                        {trader.subscriptionPlan || "-"}
                      </span>
                    </td>

                    {/* USERS */}

                    <td>
                      <span className="user-count">
                        {trader.userCount || 0}
                      </span>
                    </td>

                    {/* STATUS */}

                    <td>
                      <span className={`status-badge status-${trader.status}`}>
                        {getStatusIcon(trader.status)}

                        {trader.status}
                      </span>
                    </td>

                    {/* ACTION */}

                    <td>
                      <button
                        type="button"
                        className="enter-trader-button"
                        onClick={() => handleSelectTrader(trader)}
                        disabled={
                          trader.status === "suspended" ||
                          trader.status === "cancelled"
                        }
                      >
                        Enter ERP
                        <ArrowRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =================================================
          CREATE TRADER MODAL
      ================================================= */}

      <CreateTraderModal
        show={showCreateTrader}
        onClose={() => setShowCreateTrader(false)}
        onSuccess={handleTraderCreated}
      />
    </div>
  );
}

export default Traders;
