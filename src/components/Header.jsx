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
} from "lucide-react";


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
  const [themeOpen, setThemeOpen] =
    useState(false);

  const [selectedTheme, setSelectedTheme] =
    useState(
      localStorage.getItem(
        "trustiq-theme"
      ) || "blue"
    );

  const themeRef = useRef(null);


  /* =====================================
     APPLY THEME
  ====================================== */

  const applyTheme = (themeId) => {
    document.documentElement.setAttribute(
      "data-theme",
      themeId
    );

    localStorage.setItem(
      "trustiq-theme",
      themeId
    );

    setSelectedTheme(themeId);

    setThemeOpen(false);
  };


  /* =====================================
     LOAD THEME
  ====================================== */

  useEffect(() => {
    const savedTheme =
      localStorage.getItem(
        "trustiq-theme"
      ) || "blue";

    document.documentElement.setAttribute(
      "data-theme",
      savedTheme
    );

    setSelectedTheme(savedTheme);
  }, []);


  /* =====================================
     CLOSE THEME DROPDOWN
  ====================================== */

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        themeRef.current &&
        !themeRef.current.contains(
          event.target
        )
      ) {
        setThemeOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);


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


        {/* Search */}

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

        {/* Company */}

        <button
          type="button"
          className="company-selector"
        >

          <Building2 size={18} />

          <span>
            DSV Traders
          </span>

          <ChevronDown size={16} />

        </button>


        {/* Notification */}

        <button
          type="button"
          className="header-icon-button notification-button"
          aria-label="Notifications"
        >

          <Bell size={20} />

          <span className="notification-dot" />

        </button>


        {/* Theme */}

        <div
          className="theme-selector"
          ref={themeRef}
        >

          <button
            type="button"
            className={`header-icon-button ${
              themeOpen
                ? "theme-button-active"
                : ""
            }`}
            onClick={() =>
              setThemeOpen(
                (previous) =>
                  !previous
              )
            }
            aria-label="Change theme"
          >

            <Palette size={20} />

          </button>


          {/* Theme dropdown */}

          {themeOpen && (

            <div className="theme-dropdown">

              <div className="theme-dropdown-header">

                <div>
                  <strong>
                    Appearance
                  </strong>

                  <span>
                    Choose your theme
                  </span>
                </div>

              </div>


              <div className="theme-grid">

                {themes.map((theme) => (

                  <button
                    key={theme.id}
                    type="button"
                    className={`theme-option ${
                      selectedTheme ===
                      theme.id
                        ? "theme-option-selected"
                        : ""
                    }`}
                    onClick={() =>
                      applyTheme(
                        theme.id
                      )
                    }
                  >

                    <span
                      className="theme-color"
                      style={{
                        background:
                          theme.color,
                      }}
                    >
                      {selectedTheme ===
                        theme.id && (
                        <Check
                          size={14}
                        />
                      )}
                    </span>

                    <span className="theme-name">
                      {theme.name}
                    </span>

                  </button>

                ))}

              </div>

            </div>

          )}

        </div>


        {/* Help */}

        <button
          type="button"
          className="header-icon-button"
          aria-label="Help"
        >

          <HelpCircle size={20} />

        </button>


        {/* User */}

        <button
          type="button"
          className="user-profile"
        >

          <div className="user-avatar">
            AD
          </div>

          <div className="user-info">

            <strong>
              Admin
            </strong>

            <span>
              Administrator
            </span>

          </div>

          <ChevronDown size={16} />

        </button>

      </div>

    </header>
  );
}


export default Header;