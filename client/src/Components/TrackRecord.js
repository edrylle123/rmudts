import React, { useState } from "react";
import axios from "axios";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import "./TrackRecord.css"; // Assuming you have some custom styles

export default function TrackRecord() {
  const [controlNumber, setControlNumber] = useState("");
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

 const handleTrackRecord = async () => {
  if (!controlNumber) {
    alert("Please enter a control number.");
    return;
  }

  console.log(`Tracking record for control number: ${controlNumber}`); // Log the control number

  setLoading(true);
  setError(null);

  try {
    const token = localStorage.getItem("token");
    const response = await axios.get(
      `http://localhost:8081/records/track/${controlNumber}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    setTrackingData(response.data);
  } catch (err) {
    console.error("Error tracking record:", err);
    setError("Failed to fetch record data.");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="track-record-page">
      <div className="sidebar-container">
        <Sidebar />
      </div>
      <div className="main-content-container">
        <Navbar />
        <div className="content">
          <h2>Track Record</h2>
          <div className="input-container">
            <label>Control Number: </label>
            <input
              type="text"
              value={controlNumber}
              onChange={(e) => setControlNumber(e.target.value)}
            />
            <button onClick={handleTrackRecord}>Track</button>
          </div>

          {loading && <p>Loading...</p>}
          {error && <p>{error}</p>}

          {trackingData && (
            <div className="tracking-info">
              <h3>Current Location: {trackingData.current_office}</h3>
              <h4>Movement History:</h4>
              <ul>
                {trackingData.history.map((movement, index) => (
                  <li key={index}>
                    <p>
                      <strong>Action:</strong> {movement.action}
                      <br />
                      <strong>From Office:</strong> {movement.from_office}
                      <br />
                      <strong>To Office:</strong> {movement.to_office}
                      <br />
                      <strong>Actor:</strong> {movement.actor}
                      <br />
                      <strong>Timestamp:</strong>{" "}
                      {new Date(movement.timestamp).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
