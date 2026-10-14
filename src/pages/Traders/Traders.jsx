import { useCallback, useEffect, useMemo, useState } from "react";
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import "./traders.css";
import api from "../../services/api";
import CreateTraderModal from "./CreateTraderModal";

const PAGE_SIZE = 20;

function Traders() {
  const navigate = useNavigate();

  const [traders, setTraders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTraders, setTotalTraders] = useState(0);

  const [showCreateTrader, setShowCreateTrader] = useState(false);

  const getEffectiveStatus = (trader) => {
    if (!trader?.isActive) {
      return "inactive";
    }

    if (
      trader.subscriptionEnd &&
      new Date(trader.subscriptionEnd) <= new Date()
    ) {
      return "expired";
    }

    return trader.status;
  };

  const getDaysLeft = (subscriptionEnd) => {
    if (!subscriptionEnd) {
      return null;
    }

    const endDate = new Date(subscriptionEnd);
    const now = new Date();

    if (endDate <= now) {
      return 0;
    }

    return Math.ceil(
      (endDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
    );
  };

  const isTraderAccessible = (trader) => {
    const effectiveStatus = getEffectiveStatus(trader);

    return effectiveStatus === "active" || effectiveStatus === "trial";
  };

  const getStatusIcon = (status) => {
    if (status === "active") {
      return <CheckCircle2 size={15} />;
    }

    if (status === "trial") {
      return <Clock size={15} />;
    }

    return <Ban size={15} />;
  };

  const loadTraders = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setLoading(true);
      }

      try {
        const response = await api.tenants.getAll({
          params: {
            page,
            limit: PAGE_SIZE,
            search: debouncedSearch || undefined,
          },
        });

        const result = response?.data;

        if (result?.success) {
          setTraders(result?.tenants || []);
          setTotalTraders(result?.total || 0);
          setTotalPages(result?.totalPages || 1);
        } else {
          toast.error(result?.message || "Unable to load traders");
        }
      } catch (error) {
        console.error("Load traders error:", error);

        toast.error(error?.response?.data?.message || "Unable to load traders");
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [page, debouncedSearch],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;

    const fetchTraders = async () => {
      setLoading(true);

      try {
        const response = await api.tenants.getAll({
          params: {
            page,
            limit: PAGE_SIZE,
            search: debouncedSearch || undefined,
          },
        });

        if (cancelled) {
          return;
        }

        const result = response?.data;

        if (result?.success) {
          setTraders(result?.tenants || []);
          setTotalTraders(result?.total || 0);
          setTotalPages(result?.totalPages || 1);
        } else {
          toast.error(result?.message || "Unable to load traders");
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

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
  }, [page, debouncedSearch]);

  const handleSelectTrader = (trader) => {
    if (!trader?._id) {
      toast.error("Invalid trader");
      return;
    }

    if (!isTraderAccessible(trader)) {
      toast.error("This trader subscription is not active");
      return;
    }

    sessionStorage.setItem("selectedTenantId", trader._id);
    sessionStorage.setItem("selectedClientCode", trader.clientCode || "");

    window.dispatchEvent(new Event("tenantChanged"));

    toast.success(`${trader.businessName} selected`);

    navigate("/dashboard");
  };

  const summary = useMemo(() => {
    const active = traders.filter((trader) => {
      const status = getEffectiveStatus(trader);

      return status === "active";
    }).length;

    const trial = traders.filter((trader) => {
      const status = getEffectiveStatus(trader);

      return status === "trial";
    }).length;

    const totalUsers = traders.reduce(
      (total, trader) => total + Number(trader.userCount || 0),
      0,
    );

    return {
      total: totalTraders || traders.length,
      active,
      trial,
      totalUsers,
    };
  }, [traders, totalTraders]);

  const handleTraderCreated = async () => {
    setShowCreateTrader(false);

    setPage(1);

    await loadTraders({ silent: true });
  };

  return (
    <div className="traders-page">
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
          <button
            type="button"
            className="secondary-button"
            onClick={() => loadTraders()}
            disabled={loading}
          >
            <RefreshCw size={17} className={loading ? "spin-icon" : ""} />
            Refresh
          </button>

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

      <div className="traders-summary">
        <div className="summary-card">
          <div className="summary-icon">
            <Building2 size={20} />
          </div>

          <div>
            <span>Total Traders</span>

            <strong>{summary.total}</strong>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">
            <CheckCircle2 size={20} />
          </div>

          <div>
            <span>Active</span>

            <strong>{summary.active}</strong>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">
            <Clock size={20} />
          </div>

          <div>
            <span>Trial</span>

            <strong>{summary.trial}</strong>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">
            <Users size={20} />
          </div>

          <div>
            <span>Users on Page</span>

            <strong>{summary.totalUsers}</strong>
          </div>
        </div>
      </div>

      <div className="traders-card">
        <div className="traders-toolbar">
          <div>
            <h2>All Traders</h2>

            <span>
              {totalTraders} trader
              {totalTraders !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="traders-search">
            <Search size={18} />

            <input
              type="text"
              placeholder="Search traders..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="traders-loading">
            <RefreshCw size={24} className="spin-icon" />

            <span>Loading traders...</span>
          </div>
        ) : traders.length === 0 ? (
          <div className="traders-empty">
            <div className="empty-icon">
              <Building2 size={28} />
            </div>

            <h3>{debouncedSearch ? "No traders found" : "No traders yet"}</h3>

            <p>
              {debouncedSearch
                ? "Try changing your search."
                : "Create your first trader to get started."}
            </p>

            {!debouncedSearch && (
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
          <>
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
                  {traders.map((trader) => {
                    const effectiveStatus = getEffectiveStatus(trader);

                    const accessible = isTraderAccessible(trader);

                    const daysLeft = getDaysLeft(trader.subscriptionEnd);

                    return (
                      <tr key={trader._id}>
                        <td>
                          <div className="trader-name">
                            <div className="trader-avatar">
                              {trader.businessName?.charAt(0)?.toUpperCase() ||
                                "T"}
                            </div>

                            <div>
                              <strong>{trader.businessName}</strong>

                              <span>{trader.email || "No email"}</span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="client-code">
                            {trader.clientCode}
                          </span>
                        </td>

                        <td>
                          <div className="contact-info">
                            <strong>{trader.phone || "-"}</strong>

                            <span>{trader.city || trader.state || ""}</span>
                          </div>
                        </td>

                        <td>
                          <div className="plan-info">
                            <span className="plan-badge">
                              {trader.subscriptionPlan || "-"}
                            </span>

                            {daysLeft !== null && (
                              <span className="plan-expiry">
                                {daysLeft} days left
                              </span>
                            )}
                          </div>
                        </td>

                        <td>
                          <span className="user-count">
                            {trader.userCount || 0}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`status-badge status-${effectiveStatus}`}
                          >
                            {getStatusIcon(effectiveStatus)}

                            {effectiveStatus}
                          </span>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="enter-trader-button"
                            onClick={() => handleSelectTrader(trader)}
                            disabled={!accessible}
                          >
                            Enter ERP
                            <ArrowRight size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="traders-pagination">
                <button
                  type="button"
                  className="pagination-button"
                  onClick={() => setPage((current) => current - 1)}
                  disabled={page === 1 || loading}
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>

                <span>
                  Page {page} of {totalPages}
                </span>

                <button
                  type="button"
                  className="pagination-button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={page >= totalPages || loading}
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <CreateTraderModal
        show={showCreateTrader}
        onClose={() => setShowCreateTrader(false)}
        onSuccess={handleTraderCreated}
      />
    </div>
  );
}

export default Traders;
