// client/src/Components/UserDashboard.js
import React, { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import axios from "./axios";
import { useAuth } from "../AuthContext";

export default function UserDashboard() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get("/records/my-office");
        setRecords(res.data || []);
      } catch (e) {
        console.error(e);
        setError("Failed to load your office records");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="d-flex">
      <Sidebar />
      <div className="flex-grow-1">
        <Navbar />
        <div className="container p-3">
          <h2 className="mb-3">Welcome{user?.name ? `, ${user.name}` : ""}</h2>
          {error && <div className="alert alert-danger">{error}</div>}
          {loading ? (
            <div>Loading records…</div>
          ) : records.length === 0 ? (
            <div className="alert alert-info">No records found for your office.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered">
                <thead>
                  <tr>
                    <th>Control No.</th>
                    <th>Title</th>
                    <th>Classification</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec) => (
                    <tr key={rec.id || rec._id || rec.controlnum}>
                      <td>{rec.controlnum}</td>
                      <td>{rec.title}</td>
                      <td>{rec.classification}</td>
                      <td>{rec.priority}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
