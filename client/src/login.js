// src/Login.js
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors] = useState({});
  const navigate = useNavigate();

  const handleInput = (e) => {
    const { name, value } = e.target;
    setValues((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await axios.post("http://localhost:8081/login", values);

      if (res.data.success) {
        // Save token + user in localStorage
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));

        // Redirect based on role
 if (res.data.user.role === "admin") {
  navigate("/dashboard", { replace: true });
} else {
  navigate("/user-dashboard", { replace: true });
}
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("Something went wrong");
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-primary">
      <div className="bg-white p-4 rounded w-25">
        <h2 className="mb-4 text-center">Login</h2>
        <form onSubmit={handleSubmit}>
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

          <button className="btn btn-success w-100 rounded-0" type="submit">
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
