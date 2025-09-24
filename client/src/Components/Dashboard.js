// client/src/Components/Dashboard.js
import React, { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import axios from "./axios";
import "./AppLayout.css";

export default function Dashboard({ user }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nextOffice, setNextOffice] = useState({}); // track selected office per file

  // List of offices for dropdown; replace with API if available
  const officeOptions = [
    "President's Office",
    "Finance",
    "HR",
    "Academic",
    "Administrative",
    "Others",
  ];

  // Load only records assigned to the user's office
  useEffect(() => {
    const loadRecords = async () => {
      try {
        setLoading(true);
        const res = await axios.get("/records/my-office");
        const filtered = (res.data || [])
          .filter(r => r && r.destination_office === user?.office)
          .map(r => ({
            ...r,
            files: Array.isArray(r.files) ? r.files : [],
            document_type: r.document_type || "Internal",
            title: r.title || "Untitled",
            description: r.description || "",
            id: r.id || r.record_id || Math.random().toString(36).slice(2),
          }));
        setRecords(filtered);
      } catch (err) {
        console.error(err);
        setError("Failed to load records");
      } finally {
        setLoading(false);
      }
    };
    loadRecords();
  }, [user]);

  const totalRecords = records.length;
  const internalCount = records.filter(r => r.document_type === "Internal").length;
  const externalCount = records.filter(r => r.document_type === "External").length;

  // Release a file to another office
  const handleRelease = async (recordId, file, office) => {
    if (!office) return;
    if (!window.confirm(`Release "${file.name || file.path}" to ${office}?`)) return;

    try {
      await axios.post("/records/release", {
        record_id: recordId,
        file_path: file.path,
        next_office: office,
      });

      // Remove released file from dashboard
      setRecords(prev =>
        prev
          .map(r => ({
            ...r,
            files: (r.files || []).filter(f => f.path !== file.path)
          }))
          .filter(r => (r.files || []).length > 0)
      );

      setNextOffice(prev => ({ ...prev, [file.path]: "" }));
      alert("File released successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to release file.");
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar />

        <div className="content-area p-3">
          <h2>Welcome, {user?.name || "User"}</h2>
          <p>
            Here are the documents assigned to your office ({user?.office || "—"}).
          </p>

          {/* Dashboard widgets */}
          <div className="dashboard-widgets d-flex gap-3 flex-wrap mb-3">
            <div className="widget bg-light p-3 rounded">
              <h3>Total Documents</h3>
              <p>{totalRecords}</p>
            </div>
            <div className="widget bg-light p-3 rounded">
              <h3>Internal</h3>
              <p>{internalCount}</p>
            </div>
            <div className="widget bg-light p-3 rounded">
              <h3>External</h3>
              <p>{externalCount}</p>
            </div>
          </div>

          {/* Documents list */}
          {loading ? (
            <p>Loading documents…</p>
          ) : error ? (
            <p className="text-danger">{error}</p>
          ) : totalRecords === 0 ? (
            <p>No documents assigned to your office.</p>
          ) : (
            <div className="dashboard-documents">
              {records.map(r => (
                <div key={r.id} className="record mb-3 p-3 border rounded">
                  <div className="record-header mb-2">
                    <strong>{r.title || "Untitled"}</strong> — {r.destination_office} — {r.document_type || "Internal"}
                    <p className="mb-1 text-muted">{r.description || ""}</p>
                  </div>

                  {(r.files || []).map((f, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: "10px",
                        marginBottom: "6px",
                      }}
                    >
                      {/* File name */}
                      <span style={{ flex: "1 1 auto" }}>{f.name || f.path || "Unnamed file"}</span>

                      {/* Select next office */}
                      <select
                        value={nextOffice[f.path] || ""}
                        onChange={(e) =>
                          setNextOffice(prev => ({ ...prev, [f.path]: e.target.value }))
                        }
                        style={{ minWidth: "150px" }}
                      >
                        <option value="">Select next office</option>
                        {officeOptions.map(o => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>

                      {/* Release button */}
                      <button
                        className="btn btn-sm btn-success"
                        style={{ flexShrink: 0 }}
                        disabled={!nextOffice[f.path]}
                        onClick={() => handleRelease(r.id, f, nextOffice[f.path])}
                      >
                        Release
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
