// client/src/login.js
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "./AuthContext";
import axios from "./Components/axios";
import "./login.css";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!form.email.trim() || !form.password.trim()) {
      setErr("Email and password are required.");
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post("/login", {
        email: form.email.trim(),
        password: form.password,
      });

      // Expected server response:
      // { success:true, token, refreshToken, user: { id, name, email, role, office, idnumber? } }
      const { token, refreshToken, user } = res.data || {};

      if (!token || !user) {
        throw new Error("Malformed server response.");
      }

      // Store tokens & user (AuthContext will also persist)
      login(user, token, refreshToken);

      // extra convenience keys for Navbar, etc.
      localStorage.setItem("userEmail", user.email || "");
      localStorage.setItem("userRole", user.role || "");
      localStorage.setItem("userOffice", user.office || "");

      // redirect based on role
      if ((user.role || "").toLowerCase() === "admin") {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/user-dashboard", { replace: true });
      }
    } catch (error) {
      // Helpful error messages
      if (error.response) {
        // Server responded with a status code
        const msg =
          error.response.data?.message ||
          error.response.data?.error ||
          `Login failed (HTTP ${error.response.status}).`;
        setErr(msg);
        console.error("Login error (response):", error.response);
      } else if (error.request) {
        // No response received
        setErr("Cannot reach the server. Is the backend running on http://localhost:8081?");
        console.error("Login error (no response):", error.request);
      } else {
        // Something else
        setErr(error.message || "Unexpected error during login.");
        console.error("Login error:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page d-flex align-items-center justify-content-center">
      <div className="card shadow" style={{ width: 420, maxWidth: "92%" }}>
        <div className="card-body">
          <h3 className="card-title mb-3 text-center">Sign in</h3>

          {err && <div className="alert alert-danger">{err}</div>}

          <form onSubmit={handleSubmit} className="d-grid gap-3">
            <div>
              <label className="form-label">Email</label>
              <input
                type="email"
                name="email"
                className="form-control"
                value={form.email}
                onChange={onChange}
                placeholder="you@example.com"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label className="form-label">Password</label>
              <input
                type="password"
                name="password"
                className="form-control"
                value={form.password}
                onChange={onChange}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="mt-3 text-center">
            <small className="text-muted">
              No account? <Link to="/signup">Create one</Link>
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}
