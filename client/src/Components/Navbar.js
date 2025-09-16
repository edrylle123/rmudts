// client/src/Components/Navbar.js
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";
import { useAuth } from "../AuthContext";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

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
  const userEmail =
    user?.email || localStorage.getItem("userEmail") || "Guest";
  const userRole =
    user?.role || localStorage.getItem("userRole") || "User";

  const handleLogout = () => {
    logout?.(); // uses AuthContext logout (also clears LS + redirects)
    // If you want to be extra safe:
    // localStorage.clear();
    // sessionStorage.clear();
    // navigate("/", { replace: true });
  };

  return (
    <header className="navbar">
      <h1>{title}</h1>
      <div className="navbar-user">
        <span>👤 {userEmail} ({userRole})</span>
        <button className="btn-logout" onClick={handleLogout}>Logout</button>
      </div>
    </header>
  );
}
