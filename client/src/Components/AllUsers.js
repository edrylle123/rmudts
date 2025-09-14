// src/Components/AllUsers.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import "./AllUsers.css";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function AllUsers() {

  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null); // object of user being edited
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "user",
    idnumber: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      // if no token, go to login
      navigate("/");
      return;
    }
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get("http://localhost:8081/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data || []);
    } catch (err) {
      console.error("Error fetching users:", err);
      if (err.response && err.response.status === 403) {
        alert("You are not authorized to view users.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await axios.delete(`http://localhost:8081/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("User deleted");
      fetchUsers();
    } catch (err) {
      console.error("Delete error:", err);
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name || "",
      email: user.email || "",
      role: user.role || "user",
      idnumber: user.idnumber || "",
      password: "",
    });
  };

  const handleCancel = () => {
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      role: "user",
      idnumber: "",
      password: "",
    });
  };

  const handleSave = async () => {
    if (!editingUser) return;
    if (!formData.name || !formData.email || !formData.role) {
      alert("Name, email and role are required");
      return;
    }

    try {
      await axios.put(
        `http://localhost:8081/users/${editingUser.id}`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      alert("User updated");
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      console.error("Update error:", err);
      alert(err.response?.data?.message || "Update failed");
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar />


        <div className="all-users-container">
          <h2 className="all-users-title">All Users</h2>

          {loading ? (
            <p>Loading...</p>
          ) : (
              <table className="all-users-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>ID Number</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length ? (
                    users.map((u) => (
                      <tr key={u.id}>
                        <td>{u.id}</td>
                        <td>{u.name}</td>
                        <td>{u.email}</td>
                        <td>{u.role}</td>
                        <td>{u.idnumber}</td>
                        <td>
                          <button
                            className="btn-edit"
                            onClick={() => handleEdit(u)}
                          >
                            Edit
                        </button>
                          <button
                            className="btn-delete"
                            onClick={() => handleDelete(u.id)}
                          >
                            Delete
                        </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                      <tr>
                        <td colSpan="6" className="no-users">
                          No users found
                    </td>
                      </tr>
                    )}
                </tbody>
              </table>
            )}

          {/* Edit Modal */}
          {editingUser && (
            <div className="modal-overlay">
              <div className="modal">
                <h3>Edit User</h3>

                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, name: e.target.value }))
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, email: e.target.value }))
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, role: e.target.value }))
                    }
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>ID Number</label>
                  <input
                    type="text"
                    value={formData.idnumber}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, idnumber: e.target.value }))
                    }
                  />
                </div>

                <div className="form-group">
                  <label>New Password (leave blank to keep current)</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData((p) => ({ ...p, password: e.target.value }))
                    }
                  />
                </div>

                <div className="modal-actions">
                  <button className="btn-save" onClick={handleSave}>
                    Save
                  </button>
                  <button className="btn-cancel" onClick={handleCancel}>
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
