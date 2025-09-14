import React from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import "./AppLayout.css";

export default function AppLayout({ children, active }) {
  return (
    <div className="app-layout">
      <Sidebar active={active} />
      <div className="main-content">
        <Navbar />
        <div className="page-content">{children}</div>
      </div>
    </div>
  );
}
