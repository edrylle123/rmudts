// client/src/Components/Navbar.js
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";
import { useAuth } from "../AuthContext";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);

  const pageTitles = {
    "/dashboard": "Dashboard",
    "/createrecord": "Create New Record",
    "/all": "All Records",
    "/analytics": "Analytics",
    "/createuser": "Create New User",
    "/dashboard/all-users": "All Users",
    "/user-dashboard": "My Dashboard",
  };

  const title = pageTitles[location.pathname] || "Records System";

  // Prefer context; fall back to localStorage; then to "Guest"/"User"
  const userEmail = user?.email || localStorage.getItem("userEmail") || "Guest";
  const userRole  = user?.role  || localStorage.getItem("userRole")  || "User";

  const openConfirm = () => setShowConfirm(true);
  const closeConfirm = () => setShowConfirm(false);

  const confirmLogout = () => {
    // Use AuthContext logout if available (it clears storage & redirects)
    if (typeof logout === "function") {
      logout();
    } else {
      localStorage.clear();
      sessionStorage.clear();
      navigate("/", { replace: true });
    }
    // No need to keep the modal open after navigating away
    setShowConfirm(false);
  };

  return (
    <>
      <header className="navbar">
        <h1>{title}</h1>
        <div className="navbar-user">
          <span>👤 {userEmail} ({userRole})</span>
          <button className="btn-logout" onClick={openConfirm}>Logout</button>
        </div>
      </header>

      {showConfirm && (
        <div className="confirm-overlay" onClick={closeConfirm}>
          <div className="confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-title">Log out?</div>
            <div className="confirm-body">
              You’re about to log out of your session.
            </div>
            <div className="confirm-actions">
              <button className="btn btn-outline-secondary" onClick={closeConfirm}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={confirmLogout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
