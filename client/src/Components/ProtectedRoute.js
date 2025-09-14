// src/ProtectedRoute.js
import React from "react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ user, allowedRoles, children }) {
  if (!user) {
    // not logged in → back to login
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // logged in but role not allowed → redirect based on role
    return user.role === "admin" ? (
      <Navigate to="/dashboard" replace />
    ) : (
        <Navigate to="/user-dashboard" replace />
      );
  }

  // allowed → show the page
  return children;
}
