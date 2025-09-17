// src/Components/CreateUserForm.js
import React, { useState } from "react";
import "./CreateUserForm.css";
import axios from "./axios";

export default function CreateUserForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
    office: "",
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
      await axios.post("/signup", formData);
      alert("User created successfully!");
      setFormData({ name: "", email: "", password: "", role: "user", office: "" });
    } catch (err) {
      console.error(err);
      setError("Error creating user");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () =>
    setFormData({ name: "", email: "", password: "", role: "user", office: "" });

  return (
    <form onSubmit={handleSubmit} className="row g-3">
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="col-md-6">
        <label className="form-label">Full Name *</label>
        <input
          type="text"
          name="name"
          className="form-control"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>

      <div className="col-md-6">
        <label className="form-label">Email *</label>
        <input
          type="email"
          name="email"
          className="form-control"
        value={formData.email}
          onChange={handleChange}
          required
        />
      </div>

      <div className="col-md-6">
        <label className="form-label">Password *</label>
        <input
          type="password"
          name="password"
          className="form-control"
          value={formData.password}
          onChange={handleChange}
          required
        />
      </div>

      <div className="col-md-6">
        <label className="form-label">Role *</label>
        <select
          name="role"
          className="form-select"
          value={formData.role}
          onChange={handleChange}
        >
          <option value="user">Office Secretary</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div className="col-md-12">
        <label className="form-label">Office *</label>
        <select
          name="office"
          className="form-select"
          value={formData.office}
          onChange={handleChange}
          required
        >
          <option value="">-- Choose an Office --</option>
          <option>Office of the President</option>
          <option>VP Admin and Finance</option>
          <option>VP Academic Research and Extension</option>
          <option>Office of the Campus Administrator</option>
          <option>Office of the University Board Secretary</option>
          <option>Office of the Supervising Administrative Officer</option>
          <option>Office of the Chief Administrative Officer</option>
          <option>Accounting Office</option>
          <option>Cashier</option>
          <option>Supply Office</option>
          <option>Budget Office</option>
          <option>Accounting and Finance Office</option>
          <option>Planning and Development Office</option>
          <option>Quality Assurance Office</option>
          <option>Legal Unit</option>
          <option>CITCS</option>
          <option>Office of the Registrar</option>
          <option>Alumni Office</option>
          <option>Information Technology Office</option>
          <option>General Services Unit</option>
          <option>Project Management Unit</option>
          <option>Information Office</option>
          <option>International Relations Office</option>
          <option>Procurement Office</option>
          <option>Human Resource Management Office</option>
        </select>
      </div>

      <div className="col-12 d-flex gap-2">
        <button type="button" className="btn btn-secondary" onClick={resetForm}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Creating…" : "Create User"}
        </button>
      </div>
    </form>
  );
}
