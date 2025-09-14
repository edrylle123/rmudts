// src/Components/Sidebar.js
import React from "react";
import { Link } from "react-router-dom";
import "./Sidebar.css";

export default function Sidebar() {
  const user = JSON.parse(localStorage.getItem("user"));
  const role = user?.role || "user"; // default: user

  return (
    <div className="sidebar bg-light vh-100 p-3 d-flex flex-column">
      <h4 className="mb-4">Records System</h4>
      <ul className="list-unstyled flex-grow-1">
        {/* Always visible */}
        <li className="mb-2">
          <Link to="/dashboard" className="text-decoration-none">
            Dashboard
          </Link>
        </li>

        {/* Admin-only menu */}
        {role === "admin" && (
          <>
            <li className="mb-2">
              <Link to="/createrecord" className="text-decoration-none">
                + Create Record
              </Link>
            </li>
            <li className="mb-2">
              <Link to="/analytics" className="text-decoration-none">
                Analytics
              </Link>
            </li>
            <li className="mb-2">
              <Link to="/all" className="text-decoration-none">
                All Records
              </Link>
            </li>
            <li className="mb-2">
              <Link to="/createuser" className="text-decoration-none">
                Create User
              </Link>
            </li>
            <li className="mb-2">
              <Link to="/dashboard/all-users" className="text-decoration-none">
                User
              </Link>
            </li>
          </>
        )}
      </ul>
    </div>
  );
}
