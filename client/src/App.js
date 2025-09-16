// client/src/App.js
import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./AuthContext";

// Public pages
import Login from "./login";     // <- make sure the filename matches casing
import Signup from "./Signup";   // <- make sure the filename matches casing

// Admin pages
import Dashboard from "./Components/Dashboard";
import CreateRecordForm from "./Components/CreateRecordForm";
import CreateRecordPage from "./Components/CreateRecordPage";
import CreateUserPage from "./Components/CreateUserPage";
import AllRecords from "./Components/AllRecords";
import Analytics from "./Components/Analytics";
import AllUsers from "./Components/AllUsers";
import CreateUserForm from "./Components/CreateUserForm";
// User pages
import UserDashboard from "./Components/UserDashboard";

// Utils
import ProtectedRoute from "./Components/ProtectedRoute";

// Optional shared layout:
// If you want ONE place for Sidebar/Navbar, uncomment and wrap admin/user routes.
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
          {/* If using a shared layout, you can group like this:
          <Route
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AppLayout>
                  <Outlet />
                </AppLayout>
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/createrecord" element={<CreateRecordForm />} />
            <Route path="/createrecordpage" element={<CreateRecordPage />} />
            <Route path="/createuser" element={<CreateUserPage />} />
            <Route path="/all" element={<AllRecords />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/dashboard/all-users" element={<AllUsers />} />
          </Route>
          */}

          {/* Without shared layout (components render their own Sidebar/Navbar) */}
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
          <Route
            path="/all"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
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

          {/* --------- Normal User-only Route --------- */}
          <Route
            path="/user-dashboard"
            element={
              <ProtectedRoute allowedRoles={["user"]}>
                <UserDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
