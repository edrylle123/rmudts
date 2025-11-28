import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaHome, FaFileAlt, FaUserPlus, FaChartLine, FaBars } from "react-icons/fa"; 
import { MdDashboard } from "react-icons/md"; 
import { IoSettings } from "react-icons/io5";
import { FaLocationCrosshairs } from "react-icons/fa6";
import "./Sidebar.css";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true); // State to manage sidebar visibility
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const role = user?.role || localStorage.getItem("userRole") || "user";

  const Item = ({ to, children, icon }) => (
    <li className={location.pathname === to ? "active mb-2" : "mb-2"}>
      <Link to={to} className="text-decoration-none d-flex align-items-center">
        <span className="me-2">{icon}</span>
        {/* Conditionally render text only when sidebar is expanded */}
        <span className={`sidebar-text ${isOpen ? "" : "d-none"}`}>{children}</span>
      </Link>
    </li>
  );

  const toggleSidebar = () => setIsOpen(!isOpen); // Toggle the sidebar

  // ---------- NORMAL USER MENU ----------
  if (role !== "admin") {
    return (
      <div className={`sidebar ${isOpen ? "expanded" : "collapsed"}`}>
        <div className="sidebar-header">
         <img src="/rtms.png" alt="Logo" className="sidebar-logo mb-2" />
          <h4 className="mb-4">Records System</h4>
          <button className="burger-btn" onClick={toggleSidebar}>
            <FaBars />
          </button>
        </div>
        <ul className="list-unstyled flex-grow-1">
          <Item to="/user-dashboard" icon={<FaHome />}>Dashboard</Item>
          <Item to="/all" icon={<FaFileAlt />}>All Records</Item>
          <Item to="/trackrecord" icon={<FaLocationCrosshairs />}>Tracking</Item>
          <Item to="/settings" icon={<IoSettings />}>Settings</Item>
        </ul>
      </div>
    );
  }

  // ---------- ADMIN MENU ----------
  return (
    <div className={`sidebar ${isOpen ? "expanded" : "collapsed"}`}>
      <div className="sidebar-header">
         <img src="/rtms.png" alt="Logo" className="sidebar-logo mb-2" />

        {/* <h4 className="mb-4">Records System</h4> */}
      
        <div>
  <button className="burger-btn" onClick={toggleSidebar}>
          <FaBars />
        </button>
        </div>
      </div>
      <ul className="list-unstyled flex-grow-1">
        <Item to="/dashboard" icon={<MdDashboard />}>Dashboard</Item>
        <Item to="/createrecord" icon={<FaFileAlt />}>Create Record</Item>
        <Item to="/all" icon={<FaFileAlt />}>All Records</Item>
        <Item to="/analytics" icon={<FaChartLine />}>Analytics</Item>
          <Item to="/trackrecord" icon={<FaLocationCrosshairs />}>Tracking</Item>
        
        <Item to="/createuser" icon={<FaUserPlus />}>Create User</Item>
        <Item to="/dashboard/all-users" icon={<FaUserPlus />}>All Users</Item>
      </ul>
    </div>
  );
}
