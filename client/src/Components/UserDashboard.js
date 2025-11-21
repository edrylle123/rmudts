import React, { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import axios from "./axios";
import "./UserDashboard.css";

const DESTINATION_OFFICES = [
  "Records Office",
  "Accounting Office",
  "Cashier",
  "Supply Office",
  "Office of the Budget Officer",
  "Office of the Chief Administrative Officer- Finance",
  "PACD",
  "Marketing",
  "Office of the Planning Officer",
  "Office of the Campus Administrator",
  "Legal Office",
  "Quality and Assurance Office",
  "Registrar Office",
  "Office of the Vice President - Admin and Finance",
  "Office of the Board Secretary",
  "Office of the President",
  "Office of the Alumni",
  "Human Resource Office",
  "International Relations Office",
  "General Servicing Unit",
  "Planning Management Unit",
  "Information Technology Office",
  "Information Office",
  "Procurement Office",
  "Office of the Supervising Administrative Officer",
];

export default function UserDashboard({ user }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextOffice, setNextOffice] = useState({});
  const [offices] = useState(DESTINATION_OFFICES);

  const API_BASE =
    process.env.REACT_APP_API_BASE?.replace(/\/$/, "") ||
    "http://localhost:8081";

  // -------------------- Load Records --------------------
  const reloadRecords = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      if (!token) {
        alert("You must be logged in to view records.");
        return;
      }

      const res = await axios.get(`${API_BASE}/records/my-office`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const rows = Array.isArray(res.data) ? res.data : [];

      // ✅ Make sure to keep real DB id, not control_number
      const formatted = rows.map((r) => ({
        id: r.id, // Use database id
        control_number: r.control_number,
        description: r.description || "",
        destination_office: r.destination_office || "",
       office_requestor: r.office_requestor || "",

        files: r.files || [],
      }));

      setRecords(formatted);
    } catch (error) {
      console.error("Error loading records:", error);
      alert("Failed to load records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reloadRecords();
  }, []);

  // -------------------- Forward Record --------------------
  const handleRelease = async (recordId, office) => {
    if (!office) return alert("Please select a destination office.");

    const ok = window.confirm(`Forward record #${recordId} to ${office}?`);
    if (!ok) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("You must be logged in to perform this action.");
        return;
      }

      const response = await axios.put(
        `${API_BASE}/records/forward/${recordId}`,
        { destination_office: office },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      alert(`Record forwarded to ${office}`);
      setRecords((prev) => prev.filter((r) => r.id !== recordId));
      setNextOffice((prev) => ({ ...prev, [recordId]: "" }));
    } catch (error) {
      console.error("Error forwarding record:", error.response || error);
      alert("Failed to forward record.");
    }
  };

  // Get user name from prop or localStorage
  const name = user?.name || localStorage.getItem("userName") || "Guest"; // Get the user's name, fallback to "Guest"

  // -------------------- Render --------------------
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <div className="content-area py-8 px-4 flex justify-center items-center">
          {/* <h2 className="page-title text-xl font-bold">
            Welcome, {name}
          </h2> */}

          {/* Dashboard Summary */}
          <div className="dashboard-widgets-wrapper flex justify-center items-center my-4">
            <div className="dashboard-widgets grid grid-cols-3 gap-4">
              <div className="widget p-4 bg-white shadow-lg rounded-lg">
                <div className="widget-title text-lg font-semibold">
                  Total Records
                </div>
                <div className="widget-value text-3xl font-bold">
                  {records.length}
                </div>
              </div>
            </div>
          </div>

          {/* Record List */}
          {loading ? (
            <div className="status text-center text-xl">Loading…</div>
          ) : records.length === 0 ? (
            <div className="status text-center text-xl text-gray-500">
              No documents assigned to your office.
            </div>
          ) : (
            <div className="records-cards">
              {records.map((r) => (
                <div key={r.id} className="card">
                  <div className="card-header">
                    <h3>{r.control_number || "—"}</h3>
                    <p>{r.description || "Untitled"}</p>
                  </div>

                  <div className="card-body">
                    <p>
                      <strong>Destination Office:</strong>{" "}
                      {r.destination_office || "—"}
                    </p>
                    <p>
                      <strong>Office Requestor:</strong>{" "}
                      {r.office_requestor || "—"}
                    </p>

                    <div>
                      <strong>Files:</strong>
                      {r.files && r.files.length > 0 ? (
                        r.files.map((file, index) => (
                          <div key={index} className="file-row">
                            <a
                              href={file.path}
                              className="text-blue-600"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {file.name}
                            </a>
                          </div>
                        ))
                      ) : (
                        <p>No attachments</p>
                      )}
                    </div>
                  </div>

                  {/* Office Selector */}
                  <div className="card-footer">
                    <select
                      value={nextOffice[r.id] || ""}
                      onChange={(e) =>
                        setNextOffice({
                          ...nextOffice,
                          [r.id]: e.target.value,
                        })
                      }
                      className="form-control"
                    >
                     
                      <option value="">Select next office</option>
                      {offices.map((office) => (
                        <option key={office} value={office}>
                          {office}
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn-release"
                      disabled={!nextOffice[r.id]}
                      onClick={() =>
                        handleRelease(r.id, nextOffice[r.id])
                      }
                    >
                      Forward to Next Office
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
