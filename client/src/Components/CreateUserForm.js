import React, { useState } from "react";
import "./CreateUserForm.css"; // ✅ new CSS file

export default function CreateUserForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
    office: "", // ✅ added
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:8081/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        alert("User created successfully!");
        setFormData({ name: "", email: "", password: "", role: "user" });
      } else {
        alert("Failed to create user.");
      }
    } catch (err) {
      console.error(err);
      alert("Error creating user.");
    }
  };

  return (
    <div className="form-container">
      <h2>Create New User</h2>
      <p>Enter user information and assign a role in the system.</p>

      <form onSubmit={handleSubmit} className="user-form">
        <div className="form-row">
          <div className="form-group">
            <label>Full Name *</label>
            <input
              type="text"
              name="name"
              placeholder="Enter full name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              name="email"
              placeholder="Enter email address"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Password *</label>
            <input
              type="password"
              name="password"
              placeholder="Enter password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Role *</label>
            <select name="role" value={formData.role} onChange={handleChange}>
              <option value="user">Office Secretary</option>
              <option value="admin">Admin</option>
              {/* <option value="student">Student</option>
              <option value="teacher">Teacher</option> */}
            </select>
          </div>
          <div className="form-group">
            <label>Office</label>
            <select
              name="office"

              value={formData.office || ""}
              onChange={handleChange}
              required
            >
              <option value="">-- Choose an Office --</option>
              <option>Office of the President</option>
              <option>VP Admin and Finance</option>
              <option>VP Academic Research and Extension</option>
              <option>Office of the Campus Administrator</option>
              <option>Office of the University Board Secretary</option>
              <option>
                Office of the Supervicing Administrative Officer
                </option>
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
              <option>Internal Audit Office</option>
              <option>CHTM</option>
              <option>CTE</option>
              <option>CITCS</option>
              <option>CAFE</option>
              <option>CCJE</option>
              <option>CHS</option>
            </select>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={() => setFormData({ name: "", email: "", password: "", role: "user" })}
          >>
                                  Cancel
          </button>
          <button type="submit" className="btn-primary">
            Create User
          </button>
        </div>
      </form>
    </div>
  );
}
