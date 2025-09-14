import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Navbar.css";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

  // Map paths to titles
  const pageTitles = {
    "/dashboard": "Dashboard",
    "/createrecord": "Create New Record",
    "/all": "All Records",
    "/analytics": "Analytics",
    "/createuser": "Create New User",
  };

  const title = pageTitles[location.pathname] || "Records System";

  // ✅ Pull from localStorage
  const userEmail = localStorage.getItem("userEmail") || "Guest";
  const userRole = localStorage.getItem("userRole") || "User";

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate("/", { replace: true });
  };

  return (
    <header className="navbar">
      <h1>{title}</h1>
      <div className="navbar-user">
        <span>
          👤 {userEmail} ({userRole})
        </span>
        <button className="btn-logout" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </header>
  );
}
