import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  ShoppingCart,
  FileText,
  CreditCard,
  Clock,
  Smartphone,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";
import notificationApi from "../../services/modules/notificationApi";
import "./NotificationDropdown.css";

// Helper for relative timestamps
function formatTimeAgo(dateString) {
  if (!dateString) return "";
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Icon and color mapper for notifications
function getNotificationIcon(item) {
  const type = String(item.type || "").toUpperCase();
  const icon = String(item.icon || "").toLowerCase();
  const text = (item.title + " " + item.message).toLowerCase();

  if (type === "DAILY_STATS" || icon.includes("trending") || icon.includes("chart")) {
    if (text.includes("decreased") || text.includes("down")) {
      return {
        icon: <TrendingDown size={18} color="#ea580c" />,
        bg: "#fff7ed",
      };
    }
    return {
      icon: <TrendingUp size={18} color="#7c3aed" />,
      bg: "#f5f3ff",
    };
  }

  if (type === "LOW_STOCK" || icon.includes("box") || icon.includes("stock") || icon.includes("warning")) {
    return {
      icon: <AlertTriangle size={18} color="#d97706" />,
      bg: "#fffbeb",
    };
  }

  if (type === "SALES_ORDER" || icon.includes("cart") || icon.includes("order")) {
    return {
      icon: <ShoppingCart size={18} color="#2563eb" />,
      bg: "#eff6ff",
    };
  }

  if (type === "SALES_INVOICE" || icon.includes("file") || icon.includes("invoice")) {
    return {
      icon: <FileText size={18} color="#16a34a" />,
      bg: "#f0fdf4",
    };
  }

  if (type === "PAYMENT_RECEIVED" || icon.includes("dollar") || icon.includes("payment")) {
    return {
      icon: <CreditCard size={18} color="#059669" />,
      bg: "#ecfdf5",
    };
  }

  if (type === "PAYMENT_OVERDUE" || icon.includes("clock")) {
    return {
      icon: <Clock size={18} color="#dc2626" />,
      bg: "#fef2f2",
    };
  }

  if (type === "APP_UPDATE" || icon.includes("phone")) {
    return {
      icon: <Smartphone size={18} color="#7c3aed" />,
      bg: "#f5f3ff",
    };
  }

  return {
    icon: <Bell size={18} color="#475569" />,
    bg: "#f1f5f9",
  };
}

export default function NotificationDropdown() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [triggeringStats, setTriggeringStats] = useState(false);
  const [triggeringStock, setTriggeringStock] = useState(false);
  const containerRef = useRef(null);

  // Request browser Notification permission once
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const [resList, resCount] = await Promise.all([
        notificationApi.getNotifications({ limit: 15 }),
        notificationApi.getUnreadCount(),
      ]);

      if (resList.data?.success) {
        setNotifications(resList.data.data?.notifications || []);
      }
      if (resCount.data?.success) {
        setUnreadCount(resCount.data.data?.unreadCount || 0);
      }
    } catch (err) {
      console.warn("Notification fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Poll notifications periodically (every 60s)
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark notifications read");
    }
  };

  // Click single notification
  const handleItemClick = async (item) => {
    try {
      if (!item.isRead) {
        notificationApi.markAsRead(item._id).catch(() => {});
        setNotifications((prev) =>
          prev.map((n) => (n._id === item._id ? { ...n, isRead: true } : n)),
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }

      setIsOpen(false);
      if (item.route) {
        navigate(item.route);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Show native Web Notification with icon
  const showWebNotification = (title, body) => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        new window.Notification(title, {
          body,
          icon: "/favicon.svg",
          badge: "/favicon.svg",
        });
      } catch (err) {
        console.warn("Native web notification blocked:", err);
      }
    }
  };

  // Trigger 6 PM evening stats on-demand for immediate testing
  const handleTriggerDailyStats = async () => {
    try {
      setTriggeringStats(true);
      const res = await notificationApi.triggerDailyStats();
      if (res.data?.success) {
        toast.success("6:00 PM Evening stats notification dispatched!");
        showWebNotification(
          "Daily Sales Update 📊",
          "Automated 6:00 PM evening business summary was sent with icon!",
        );
        await fetchNotifications();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to trigger stats");
    } finally {
      setTriggeringStats(false);
    }
  };

  // Trigger low stock check on-demand
  const handleTriggerLowStock = async () => {
    try {
      setTriggeringStock(true);
      const res = await notificationApi.triggerLowStock();
      if (res.data?.success) {
        toast.success("Low stock alert check triggered!");
        showWebNotification(
          "Low Stock Alert ⚠️",
          "Automated low stock notification was evaluated and sent!",
        );
        await fetchNotifications();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to trigger low stock check");
    } finally {
      setTriggeringStock(false);
    }
  };

  return (
    <div className="notif-dropdown-container" ref={containerRef}>
      <button
        type="button"
        className={`notif-bell-button ${isOpen ? "active" : ""}`}
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notif-badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notif-panel">
          <div className="notif-header">
            <div className="notif-title-row">
              <span className="notif-title">Notifications</span>
              {unreadCount > 0 && (
                <span className="notif-count-pill">{unreadCount} new</span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                className="notif-action-btn"
                onClick={handleMarkAllRead}
              >
                <CheckCheck size={14} />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          <div className="notif-list">
            {loading && notifications.length === 0 ? (
              <div className="notif-empty">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="notif-empty">No notifications yet</div>
            ) : (
              notifications.map((item) => {
                const iconInfo = getNotificationIcon(item);
                return (
                  <div
                    key={item._id}
                    className={`notif-item ${!item.isRead ? "unread" : ""}`}
                    onClick={() => handleItemClick(item)}
                  >
                    <div
                      className="notif-icon-box"
                      style={{ backgroundColor: iconInfo.bg }}
                    >
                      {iconInfo.icon}
                    </div>

                    <div className="notif-content">
                      <div className="notif-item-title">
                        <span>{item.title}</span>
                      </div>
                      <div className="notif-item-msg">{item.message}</div>
                      <div className="notif-item-time">
                        {formatTimeAgo(item.createdAt)}
                      </div>
                    </div>

                    {!item.isRead && <span className="notif-unread-dot" />}
                  </div>
                );
              })
            )}
          </div>

          <div className="notif-footer">
            <button
              type="button"
              className="notif-test-btn"
              onClick={handleTriggerDailyStats}
              disabled={triggeringStats}
              title="Test 6:00 PM automated sales stats notification"
            >
              <BarChart3 size={13} color="#7c3aed" />
              <span>{triggeringStats ? "Sending..." : "Test 6 PM Stats"}</span>
            </button>

            <button
              type="button"
              className="notif-test-btn"
              onClick={handleTriggerLowStock}
              disabled={triggeringStock}
              title="Test low stock automated notification"
            >
              <AlertTriangle size={13} color="#d97706" />
              <span>{triggeringStock ? "Checking..." : "Test Low Stock"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
