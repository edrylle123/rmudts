// src/Components/UserDashboard.js
import React, { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import axios from "axios";

export default function UserDashboard({ user }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true); // ✅ Added this line

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    axios
      .get("http://localhost:8081/records/my-office", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setRecords(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching records:", err);
        setLoading(false);
      });
  }, []);


  return (
    <div className="app-layout">
      <Sidebar active="user-dashboard" />
      <div className="main-content">
        <Navbar />
        <h2 className="text-xl font-bold mb-4">
          Records for {user?.office}
        </h2>

        {records.length === 0 ? (
          <p>No records found for your office.</p>
        ) : (
            <table className="min-w-full border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border px-4 py-2">Control #</th>
                  <th className="border px-4 py-2">Title</th>
                  <th className="border px-4 py-2">Classification</th>
                  <th className="border px-4 py-2">Priority</th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => (
                  <tr key={rec.id}>
                    <td className="border px-4 py-2">{rec.controlnum}</td>
                    <td className="border px-4 py-2">{rec.title}</td>
                    <td className="border px-4 py-2">{rec.classification}</td>
                    <td className="border px-4 py-2">{rec.priority}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  );
}
