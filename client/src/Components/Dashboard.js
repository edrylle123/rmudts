import React from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import "./AppLayout.css";
import "./AppLayout.css"; // ✅ reuse same layout styles

export default function Dashboard() {
  return (
    <div className="app-layout">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="main-content">
        <Navbar />

        <div className="content-area">
          <h2>Welcome to the Dashboard</h2>
          <p>
            This is where you can view system stats, quick actions, or recent
            activity.
          </p>

          {/* Example dashboard widgets */}
          <div className="dashboard-widgets">
            <div className="widget">
              <h3>Total Records</h3>
              <p>120</p>
            </div>
            <div className="widget">
              <h3>Active Users</h3>
              <p>25</p>
            </div>
            <div className="widget">
              <h3>Pending Approvals</h3>
              <p>8</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
