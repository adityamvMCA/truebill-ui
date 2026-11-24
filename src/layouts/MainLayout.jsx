import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import TrialExpiredBanner from "../components/common/TrialExpiredBanner/TrialExpiredBanner";

function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleMenuClick = () => {
    if (window.innerWidth < 768) {
      setMobileOpen(true);
    } else {
      setCollapsed((previous) => !previous);
    }
  };

  return (
    <div className="app-container">

      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {mobileOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        className={`main-section ${
          collapsed ? "main-section-collapsed" : ""
        }`}
      >
        <Header onMenuClick={handleMenuClick} />

        {/* Read-Only Warning Banner shown across app when trial expires */}
        <TrialExpiredBanner />

        <main className="main-content">
          <Outlet />
        </main>
      </div>

    </div>
  );
}

export default MainLayout;