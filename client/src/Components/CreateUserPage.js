import React from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import CreateUserForm from "./CreateUserForm";
import "./AppLayout.css";

export default function CreateUserPage() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <div className="content-area">
          <CreateUserForm />
        </div>
      </div>
    </div>
  );
}
