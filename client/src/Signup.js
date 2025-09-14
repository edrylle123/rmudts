// src/Signup.js
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// Simple validation function inline (you can keep your external file if preferred)
function validate(values) {
  const errors = {};
  if (!values.name) errors.name = "Full name is required";
  if (!values.email) errors.email = "Email is required";
  if (!values.password) errors.password = "Password is required";
  if (!values.idnumber) errors.idnumber = "ID number is required";
  if (!values.role || values.role === "Select Role")
    errors.role = "Please select a role";
  return errors;
}

export default function Signup() {
  const [values, setValues] = useState({
    name: "",
    role: "Select Role",
    idnumber: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const handleInput = (e) => {
    const { name, value } = e.target;
    setValues((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate(values);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    try {
      const res = await axios.post("http://localhost:8081/signup", values);
      if (res.data && res.data.success) {
        alert("Account Created Successfully");
        navigate("/");
      } else {
        alert(res.data.message || "Signup failed");
      }
    } catch (err) {
      console.error("Signup error:", err.response || err);
      const msg = err.response?.data?.message || "Error creating account";
      alert(msg);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-primary">
      <div className="bg-white p-4 rounded w-25">
        <h2 className="mb-4 text-center">Sign Up</h2>
        <form onSubmit={handleSubmit}>
          {/* Full Name */}
          <div className="mb-3">
            <label>
              <strong>Full Name:</strong>
            </label>
            <input
              type="text"
              name="name"
              value={values.name}
              onChange={handleInput}
              className="form-control rounded-0"
              placeholder="Enter your full name"
            />
            <span className="text-danger">{errors.name}</span>
          </div>

          {/* Role */}
          <div className="mb-3">
            <label>
              <strong>Role:</strong>
            </label>
            <select
              name="role"
              value={values.role}
              onChange={handleInput}
              className="form-control rounded-0"
            >
              <option disabled>Select Role</option>
              <option value="admin">Admin</option>
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
            <span className="text-danger">{errors.role}</span>
          </div>

          {/* Email */}
          <div className="mb-3">
            <label>
              <strong>Email:</strong>
            </label>
            <input
              type="email"
              name="email"
              value={values.email}
              onChange={handleInput}
              className="form-control rounded-0"
              placeholder="Enter your email"
            />
            <span className="text-danger">{errors.email}</span>
          </div>

          {/* Password */}
          <div className="mb-3">
            <label>
              <strong>Password:</strong>
            </label>
            <input
              type="password"
              name="password"
              value={values.password}
              onChange={handleInput}
              className="form-control rounded-0"
              placeholder="Enter your password"
            />
            <span className="text-danger">{errors.password}</span>
          </div>

          {/* ID Number */}
          <div className="mb-3">
            <label>
              <strong>ID Number:</strong>
            </label>
            <input
              type="text"
              name="idnumber"
              value={values.idnumber}
              onChange={handleInput}
              className="form-control rounded-0"
              placeholder="Enter your ID number"
            />
            <span className="text-danger">{errors.idnumber}</span>
          </div>

          <button className="btn btn-success w-100 rounded-0" type="submit">
            Create Account
          </button>
        </form>
      </div>
    </div>
  );
}
