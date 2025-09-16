// client/src/Components/CreateRecordForm.js
import React, { useState } from "react";
import "./CreateRecordForm.css";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import axios from "./axios";

export default function CreateRecordForm() {
  const [formData, setFormData] = useState({
    title: "",
    controlnum: "",
    classification: "",
    priority: "Normal",
    description: "",
    source: "",
    retention: "1 Year",
    destination_office: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((s) => ({ ...s, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await axios.post("/records", formData);
      alert("Record created!");
      setFormData({
        title: "",
        controlnum: "",
        classification: "",
        priority: "Normal",
        description: "",
        source: "",
        retention: "1 Year",
        destination_office: "",
      });
    } catch (err) {
      console.error(err);
      setError("Failed to create record");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="d-flex">
      <Sidebar />
      <div className="flex-grow-1">
        <Navbar />
        <div className="container p-3">
          <h2 className="mb-3">Create New Record</h2>
          {error && <div className="alert alert-danger">{error}</div>}
          <form onSubmit={handleSubmit} className="row g-3">
            <div className="col-md-6">
              <label className="form-label">Title *</label>
              <input className="form-control" name="title" required value={formData.title} onChange={handleChange} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Control No.</label>
              <input className="form-control" name="controlnum" value={formData.controlnum} onChange={handleChange} />
            </div>
            <div className="col-md-4">
              <label className="form-label">Classification</label>
              <input className="form-control" name="classification" value={formData.classification} onChange={handleChange} />
            </div>
            <div className="col-md-4">
              <label className="form-label">Priority</label>
              <select className="form-select" name="priority" value={formData.priority} onChange={handleChange}>
                <option>Low</option>
                <option>Normal</option>
                <option>High</option>
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Retention</label>
              <select className="form-select" name="retention" value={formData.retention} onChange={handleChange}>
                <option>1 Year</option>
                <option>3 Years</option>
                <option>5 Years</option>
                <option>Permanent</option>
              </select>
            </div>
            <div className="col-12">
              <label className="form-label">Description</label>
              <textarea className="form-control" rows="3" name="description" value={formData.description} onChange={handleChange} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Source</label>
              <input className="form-control" name="source" value={formData.source} onChange={handleChange} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Destination Office</label>
              <input className="form-control" name="destination_office" value={formData.destination_office} onChange={handleChange} />
            </div>
            <div className="col-12 d-flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Create Record"}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => window.history.back()}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
