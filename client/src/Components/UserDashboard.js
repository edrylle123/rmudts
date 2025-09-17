// client/src/Components/UserDashboard.js
import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import axios from "./axios";
import { useAuth } from "../AuthContext";
import { Link } from "react-router-dom";
import "./PriorityBadges.css";

function priorityClass(p) {
  const v = String(p || "").toLowerCase();
  if (v === "high" || v === "urgent" || v === "critical") return "prio prio-high";
  if (v === "normal" || v === "medium" || v === "standard") return "prio prio-normal";
  if (v === "low") return "prio prio-low";
  return "prio prio-default";
}

export default function UserDashboard() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [limit, setLimit] = useState(5);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await axios.get("/records/my-office");
        const list = Array.isArray(res.data) ? res.data : [];
        setRows(list);
      } catch (e) {
        console.error(e);
        setError("Failed to load recent records");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const records = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      const recId =
        (r && r.id) ||
        (r && r.record_id) ||
        (r && r._id) ||
        (r && r.control_number) ||
        Math.random().toString(36).slice(2);

      if (!map.has(recId)) {
        map.set(recId, {
          id: recId,
          control_number: (r && r.control_number) || "",
          title: (r && r.title) || "",
          classification: (r && r.classification) || "",
          priority: (r && r.priority) || "",
          destination_office: (r && r.destination_office) || "",
          created_at: (r && r.created_at) || null,
          files: [],
        });
      }

      if (r && r.file_name) {
        map.get(recId).files.push({
          name: r.file_name,
          type: r.file_type,
          size: r.file_size,
          path: r.file_path,
          retention_period: r.retention_period,
        });
      }
    }

    const arr = Array.from(map.values()).sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });

    return arr;
  }, [rows]);

  const recent = useMemo(() => records.slice(0, Number(limit) || 5), [records, limit]);

  const apiBase = axios.defaults?.baseURL || "";

  const fmtDate = (d) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleString();
    } catch {
      return String(d);
    }
  };

  return (
    <div className="d-flex">
      <Sidebar />
      <div className="flex-grow-1">
        <Navbar />
        <div className="container p-3">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <h2 className="mb-0">
              Welcome{user && user.name ? `, ${user.name}` : ""}!
            </h2>
            <div className="d-flex align-items-center gap-2">
              <label className="form-label mb-0">Show</label>
              <select
                className="form-select form-select-sm"
                style={{ width: 90 }}
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>
          </div>

          <p className="text-muted">
            Latest records for{" "}
            <strong>
              {(user && user.office) ||
                localStorage.getItem("userOffice") ||
                "your office"}
            </strong>
            .
          </p>

          {error && <div className="alert alert-danger">{error}</div>}

          {loading ? (
            <div>Loading recent records…</div>
          ) : recent.length === 0 ? (
            <div className="alert alert-info">
              No records found for your office yet.
            </div>
          ) : (
            <div className="row g-3">
              {recent.map((r) => (
                <div className="col-12" key={r.id}>
                  <div className="card shadow-sm">
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <h5 className="card-title mb-1">
                            {r.title || "(Untitled Record)"}
                          </h5>
                          <div className="text-muted small">
                            <span className="me-3">
                              <strong>Control #:</strong> {r.control_number || "—"}
                            </span>
                            <span className="me-3">
                              <strong>Classification:</strong>{" "}
                              {r.classification || "—"}
                            </span>
                            <span className="me-3">
                              <span className={priorityClass(r.priority)}>
  {r.priority && String(r.priority).trim() ? r.priority : "Normal"}
</span>
                            </span>
                            <span className="me-3">
                              <strong>Created:</strong> {fmtDate(r.created_at)}
                            </span>
                          </div>
                        </div>
                        <span className="badge bg-secondary">
                          {r.destination_office || "—"}
                        </span>
                      </div>

                      {/* Attachments */}
{r.files && r.files.length > 0 && (
  <div className="mt-3">
    <div className="fw-semibold mb-1">Attachments</div>
    <ul className="mb-0">
      {r.files.map((f, i) => {
        if (!f || !f.path) return null;
        const to = `/view?file=${encodeURIComponent(f.path)}${
          f.name ? `&name=${encodeURIComponent(f.name)}` : ""
        }`;
        return (
          <li key={i} className="small">
            <a href={to}> {/* Using <a> keeps it simple; React Router will still handle /view */}
              {f.name || f.path}
            </a>
            {f.size ? (
              <span className="text-muted ms-2">
                ({Math.round(f.size / 1024)} KB)
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  </div>
)}

                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3">
            <Link to="/all" className="btn btn-outline-primary">
              View all records
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
