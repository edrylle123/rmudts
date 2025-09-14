import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Login from "./login";
import Signup from "./Signup";
import CreateRecordForm from "./Components/CreateRecordForm";
import CreateRecordPage from "./Components/CreateRecordPage";
import CreateUserPage from "./Components/CreateUserPage";
import AllRecords from "./Components/AllRecords";
import Analytics from "./Components/Analytics";
import Dashboard from "./Components/Dashboard";
import ProtectedRoute from "./Components/ProtectedRoute";
import UserDashboard from "./Components/UserDashboard";
import AllUsers from "./Components/AllUsers";
import { getStoredUser } from "./utils/auth";   // ✅ import helper

function App() {
  const user = getStoredUser(); // ✅ load once

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Admin-only */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute user={user} allowedRoles={["admin"]}>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/createrecord"
          element={
            <ProtectedRoute user={user} allowedRoles={["admin"]}>
              <CreateRecordForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/createrecordpage"
          element={
            <ProtectedRoute user={user} allowedRoles={["admin"]}>
              <CreateRecordPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/createuser"
          element={
            <ProtectedRoute user={user} allowedRoles={["admin"]}>
              <CreateUserPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/all"
          element={
            <ProtectedRoute user={user} allowedRoles={["admin"]}>
              <AllRecords />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute user={user} allowedRoles={["admin"]}>
              <Analytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/all-users"
          element={
            <ProtectedRoute user={user} allowedRoles={["admin"]}>
              <AllUsers />
            </ProtectedRoute>
          }
        />

        {/* Normal user-only */}
        <Route
          path="/user-dashboard"
          element={
            <ProtectedRoute user={user} allowedRoles={["user"]}>
              <UserDashboard user={user} />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
