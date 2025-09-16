// client/src/Components/Sidebar.js
import React from "react";
import { Link, useLocation } from "react-router-dom";
import "./Sidebar.css";

export default function Sidebar() {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const role = user?.role || localStorage.getItem("userRole") || "user";

  const Item = ({ to, children }) => (
    <li className={location.pathname === to ? "active mb-2" : "mb-2"}>
      <Link to={to} className="text-decoration-none">{children}</Link>
    </li>
  );

  return (
    <div className="sidebar bg-light vh-100 p-3 d-flex flex-column">
      <h4 className="mb-4">Records System</h4>
      <ul className="list-unstyled flex-grow-1">
        <Item to="/dashboard">Dashboard</Item>
        <Item to="/user-dashboard">My Dashboard</Item>
        <Item to="/createrecord">Create Record</Item>
        <Item to="/all">All Records</Item>
        <Item to="/analytics">Analytics</Item>

        {role === "admin" && (
          <>
            <hr/>
            <Item to="/createuser">Create User</Item>
            <Item to="/dashboard/all-users">All Users</Item>
          </>
        )}
      </ul>
    </div>
  );
}
