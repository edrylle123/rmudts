// client/src/App.js
import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import AttachmentViewer from "./Components/AttachmentViewer";

// Public pages
import Login from "./login";     // <- ensure actual filename/casing matches (e.g. "./Login")
import Signup from "./Signup";   // <- ensure actual filename/casing matches

// Admin pages
import Dashboard from "./Components/Dashboard";
import CreateRecordForm from "./Components/CreateRecordForm";
import CreateRecordPage from "./Components/CreateRecordPage";
import CreateUserPage from "./Components/CreateUserPage";
import AllRecords from "./Components/AllRecords";
import Analytics from "./Components/Analytics";
import AllUsers from "./Components/AllUsers";
// import CreateUserForm from "./Components/CreateUserForm";
import EditRecords from "./Components/EditRecords"; // <- FIXED import (no trailing "s")
import DocumentTracking from "./Components/DocumentTracking";
// User pages
import UserDashboard from "./Components/UserDashboard";

// Utils
import ProtectedRoute from "./Components/ProtectedRoute";

// Optional shared layout:
// import AppLayout from "./AppLayout";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>


        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* --------- Admin-only Routes --------- */}
          {/* With shared layout you could group these; keeping as-is for now */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/createrecord"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <CreateRecordForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/createrecordpage"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <CreateRecordPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/createuser"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <CreateUserPage />
              </ProtectedRoute>
            }
          />

          {/* Primary list path */}
          <Route
            path="/all"
            element={
              <ProtectedRoute allowedRoles={["admin", "user"]}>
                <AllRecords />
              </ProtectedRoute>
            }
          />
          {/* Alias to avoid "No routes matched /all-records" */}
          <Route
            path="/all-records"
            element={
              <ProtectedRoute allowedRoles={["admin", "user"]}>
                <AllRecords />
              </ProtectedRoute>
            }
          />

          <Route
            path="/analytics"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <Analytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/all-users"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AllUsers />
              </ProtectedRoute>
            }
          />

          <Route
            path="/records/:id/edit"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <EditRecords />
              </ProtectedRoute>
            }
          />

          <Route
            path="/view"
            element={
              <ProtectedRoute allowedRoles={["admin", "user"]}>
                <AttachmentViewer />
              </ProtectedRoute>
            }
          />

          {/* --------- Normal User-only Route --------- */}
          <Route
            path="/user-dashboard"
            element={
              <ProtectedRoute allowedRoles={["user"]}>
                <UserDashboard />
              </ProtectedRoute>
            }
            
          />
           {/* Document Tracking Route */}
      <Route
        path="/tracking"
        element={
          <ProtectedRoute allowedRoles={["admin","user"]}>
            <DocumentTracking />
          </ProtectedRoute>
        }
      />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
