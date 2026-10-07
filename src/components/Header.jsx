import { useEffect, useRef, useState } from "react";

import {
  Menu,
  Search,
  Building2,
  Bell,
  HelpCircle,
  ChevronDown,
  Palette,
  Check,
  LogOut,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const themes = [
  {
    id: "blue",
    name: "Ocean Blue",
    color: "#2563eb",
  },
  {
    id: "green",
    name: "Emerald",
    color: "#16a34a",
  },
  {
    id: "purple",
    name: "Purple",
    color: "#7c3aed",
  },
  {
    id: "orange",
    name: "Orange",
    color: "#ea580c",
  },
  {
    id: "red",
    name: "Ruby Red",
    color: "#dc2626",
  },
  {
    id: "teal",
    name: "Teal",
    color: "#0d9488",
  },
  {
    id: "indigo",
    name: "Indigo",
    color: "#4f46e5",
  },
  {
    id: "pink",
    name: "Pink",
    color: "#db2777",
  },
  {
    id: "cyan",
    name: "Cyan",
    color: "#0891b2",
  },
  {
    id: "slate",
    name: "Slate",
    color: "#475569",
  },
];

function Header({ onMenuClick }) {
  const navigate = useNavigate();

  /* =========================================
     STATE
  ========================================= */

  const [themeOpen, setThemeOpen] = useState(false);

  const [profileOpen, setProfileOpen] = useState(false);

  const [selectedTheme, setSelectedTheme] = useState(
    localStorage.getItem("trustiq-theme") || "blue",
  );

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  const [selectedTenant, setSelectedTenant] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("selectedTenant") || "null");
    } catch {
      return null;
    }
  });

  /* =========================================
     REFS
  ========================================= */

  const themeRef = useRef(null);

  const profileRef = useRef(null);

  /* =========================================
     LOAD THEME
  ========================================= */

  useEffect(() => {
    const savedTheme = localStorage.getItem("trustiq-theme") || "blue";

    document.documentElement.setAttribute("data-theme", savedTheme);

    setSelectedTheme(savedTheme);
  }, []);

  /* =========================================
     LOAD USER
  ========================================= */

  useEffect(() => {
    const loadUser = () => {
      try {
        const storedUser = localStorage.getItem("user");

        if (storedUser) {
          setUser(JSON.parse(storedUser));
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    };

    loadUser();

    window.addEventListener("userChanged", loadUser);

    return () => {
      window.removeEventListener("userChanged", loadUser);
    };
  }, []);

  /* =========================================
     LOAD SELECTED TENANT
  ========================================= */

  useEffect(() => {
    const loadSelectedTenant = () => {
      try {
        const storedTenant = sessionStorage.getItem("selectedTenant");

        if (storedTenant) {
          setSelectedTenant(JSON.parse(storedTenant));
        } else {
          setSelectedTenant(null);
        }
      } catch {
        setSelectedTenant(null);
      }
    };

    loadSelectedTenant();

    window.addEventListener("tenantChanged", loadSelectedTenant);

    return () => {
      window.removeEventListener("tenantChanged", loadSelectedTenant);
    };
  }, []);

  /* =========================================
     CLOSE DROPDOWNS
  ========================================= */

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (themeRef.current && !themeRef.current.contains(event.target)) {
        setThemeOpen(false);
      }

      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  /* =========================================
     THEME
  ========================================= */

  const applyTheme = (themeId) => {
    document.documentElement.setAttribute("data-theme", themeId);

    localStorage.setItem("trustiq-theme", themeId);

    setSelectedTheme(themeId);

    setThemeOpen(false);
  };

  /* =========================================
     LOGOUT
  ========================================= */

  const handleLogout = () => {
    localStorage.removeItem("token");

    localStorage.removeItem("user");

    localStorage.removeItem("tenant");

    sessionStorage.removeItem("selectedTenantId");

    sessionStorage.removeItem("selectedClientCode");

    sessionStorage.removeItem("selectedTenant");

    setUser(null);

    setSelectedTenant(null);

    setProfileOpen(false);

    toast.success("Logged out successfully");

    navigate("/login", {
      replace: true,
    });
  };

  /* =========================================
     USER DATA
  ========================================= */

  const userName = user?.name || user?.username || user?.email || "User";

  const userRole = user?.role || user?.platformRole || "User";

  const userEmail = user?.email || "";

  const userInitials =
    userName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((name) => name.charAt(0).toUpperCase())
      .join("") || "U";

  /* =========================================
     TENANT / TRADER DATA
  ========================================= */

  /*
   * Developer / Support:
   * selectedTenant comes from sessionStorage.
   *
   * Normal trader:
   * user.tenant comes from login.
   */

  const tenant = selectedTenant || user?.tenant || null;

  const tenantName = tenant?.businessName || "TrustIQ ERP";

  const tenantClientCode = tenant?.clientCode || user?.clientCode || null;

  /* =========================================
     PLATFORM ROLE
  ========================================= */

  const isDeveloper = user?.platformRole === "developer";

  const isSupport = user?.platformRole === "support";

  const canSwitchTenant = isDeveloper || isSupport;

  return (
    <header className="header">
      {/* =====================================
          LEFT
      ====================================== */}

      <div className="header-left">
        <button
          type="button"
          className="menu-button"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>

        {/* SEARCH */}

        <div className="search-box">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search anything... (Customer, Invoice, Product, etc.)"
          />
        </div>
      </div>

      {/* =====================================
          RIGHT
      ====================================== */}

      <div className="header-right">
        {/* =====================================
            COMPANY / SELECTED TRADER
        ====================================== */}

        <button type="button" className="company-selector" title={tenantName}>
          <Building2 size={18} />

          <span>{tenantName}</span>

          {canSwitchTenant && <ChevronDown size={16} />}
        </button>

        {/* =====================================
            NOTIFICATIONS
        ====================================== */}

        <button
          type="button"
          className="header-icon-button notification-button"
          aria-label="Notifications"
        >
          <Bell size={20} />

          <span className="notification-dot" />
        </button>

        {/* =====================================
            THEME
        ====================================== */}

        <div className="theme-selector" ref={themeRef}>
          <button
            type="button"
            className={`header-icon-button ${
              themeOpen ? "theme-button-active" : ""
            }`}
            onClick={() => setThemeOpen((previous) => !previous)}
            aria-label="Change theme"
          >
            <Palette size={20} />
          </button>

          {themeOpen && (
            <div className="theme-dropdown">
              <div className="theme-dropdown-header">
                <div>
                  <strong>Appearance</strong>

                  <span>Choose your theme</span>
                </div>
              </div>

              <div className="theme-grid">
                {themes.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    className={`theme-option ${
                      selectedTheme === theme.id ? "theme-option-selected" : ""
                    }`}
                    onClick={() => applyTheme(theme.id)}
                  >
                    <span
                      className="theme-color"
                      style={{
                        background: theme.color,
                      }}
                    >
                      {selectedTheme === theme.id && <Check size={14} />}
                    </span>

                    <span className="theme-name">{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* =====================================
            HELP
        ====================================== */}

        <button type="button" className="header-icon-button" aria-label="Help">
          <HelpCircle size={20} />
        </button>

        {/* =====================================
            PROFILE
        ====================================== */}

        <div className="profile-selector" ref={profileRef}>
          <button
            type="button"
            className="user-profile"
            onClick={() => setProfileOpen((previous) => !previous)}
            aria-label="User profile"
          >
            <div className="user-avatar">{userInitials}</div>

            <div className="user-info">
              <strong>{userName}</strong>

              <span>{userRole}</span>
            </div>

            <ChevronDown
              size={16}
              className={profileOpen ? "profile-arrow-open" : ""}
            />
          </button>

          {/* =================================
              PROFILE DROPDOWN
          ================================== */}

          {profileOpen && (
            <div className="profile-dropdown">
              {/* PROFILE HEADER */}

              <div className="profile-dropdown-header">
                <div className="profile-dropdown-avatar">{userInitials}</div>

                <div>
                  <strong>{userName}</strong>

                  <span>{userEmail}</span>
                </div>
              </div>

              <div className="profile-divider" />

              {/* USER DETAILS */}

              <div className="profile-details">
                <div>
                  <span>Role</span>

                  <strong>{userRole}</strong>
                </div>

                {tenantClientCode && (
                  <div>
                    <span>Client Code</span>

                    <strong>{tenantClientCode}</strong>
                  </div>
                )}

                {tenantName !== "TrustIQ ERP" && (
                  <div>
                    <span>Company</span>

                    <strong>{tenantName}</strong>
                  </div>
                )}
              </div>

              <div className="profile-divider" />

              {/* LOGOUT */}

              <button
                type="button"
                className="logout-button"
                onClick={handleLogout}
              >
                <LogOut size={17} />

                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
