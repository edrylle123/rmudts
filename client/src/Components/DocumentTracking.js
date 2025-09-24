import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import QRCode from "qrcode.react";
import './DocumentTracking.css';

export default function DocumentTracking({ userOffice }) {
  const [office, setOffice] = useState(userOffice || "Records");
  const [documentsInOffice, setDocumentsInOffice] = useState([]);
  const [inTransit, setInTransit] = useState([]);
  const [recentMovements, setRecentMovements] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [destinationOffice, setDestinationOffice] = useState("");
  const [offices, setOffices] = useState([]);

  const fetchTracking = useCallback(async () => {
    try {
      const res = await axios.get(`/api/tracking/${office}`);
      setDocumentsInOffice(res.data.documentsInOffice);
      setInTransit(res.data.inTransit);
      setRecentMovements(res.data.recentMovements);
    } catch (err) { console.error(err); }
  }, [office]);

  const fetchOffices = useCallback(async () => {
    try {
      const res = await axios.get("/offices");
      setOffices(res.data);
      if (res.data.length && !destinationOffice) setDestinationOffice(res.data[0]);
    } catch (err) { console.error(err); }
  }, [destinationOffice]);

  useEffect(() => {
    fetchTracking();
    fetchOffices();
  }, [fetchTracking, fetchOffices]);

  const openModal = (doc) => { setSelectedDoc(doc); setShowModal(true); };
  const closeModal = () => { setSelectedDoc(null); setShowModal(false); };

  const handleRelease = async () => {
    if (!selectedDoc) return;
    try {
      await axios.post("/api/tracking/release", { record_id: selectedDoc.id, to_office: destinationOffice });
      closeModal();
      fetchTracking();
    } catch (err) { console.error(err); }
  };

  const handleReceive = async (doc) => {
    try {
      await axios.post("/api/tracking/receive", { record_id: doc.id, from_office: doc.from_office || "Unknown" });
      fetchTracking();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="tracking-dashboard">
      <h2>Document Tracking ({office})</h2>

      <div className="panel-container">
        <div className="panel">
          <h3>Documents in Office</h3>
          <ul>
            {documentsInOffice.length ? documentsInOffice.map(doc => (
              <li key={doc.id}>
                {doc.control_number} - {doc.title}
                <button onClick={() => openModal(doc)}>Release</button>
              </li>
            )) : <li>None</li>}
          </ul>
        </div>

        <div className="panel">
          <h3>In Transit</h3>
          <ul>
            {inTransit.length ? inTransit.map(doc => (
              <li key={doc.id}>
                {doc.control_number} - {doc.title}
                <button onClick={() => handleReceive(doc)}>Receive</button>
              </li>
            )) : <li>None</li>}
          </ul>
        </div>
      </div>

      <div>
        <h3>Recent Movements</h3>
        <table>
          <thead>
            <tr>
              <th>Ref</th><th>Title</th><th>Action</th>
              <th>From</th><th>To</th><th>Actor</th><th>Time</th>
            </tr>
          </thead>
          <tbody>
            {recentMovements.length ? recentMovements.map(mv => (
              <tr key={mv.id}>
                <td>{mv.record_id}</td>
                <td>{mv.title}</td>
                <td>
                  <span className={`status-badge ${mv.action==='RELEASED'?'status-released':'status-received'}`}>
                    {mv.action}
                  </span>
                </td>
                <td>{mv.from_office}</td>
                <td>{mv.to_office}</td>
                <td>{mv.actor}</td>
                <td>{new Date(mv.timestamp).toLocaleString()}</td>
              </tr>
            )) : <tr><td colSpan="7">No recent movements</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && selectedDoc && (
        <div className="modal-overlay">
          <div className="modal">
            <h4>Release {selectedDoc.control_number}</h4>
            <label>
              Destination Office:
              <select value={destinationOffice} onChange={e => setDestinationOffice(e.target.value)}>
                {offices.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </label>
            <div className="modal-actions">
              <button onClick={handleRelease}>Confirm Release</button>
              <button onClick={closeModal}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
