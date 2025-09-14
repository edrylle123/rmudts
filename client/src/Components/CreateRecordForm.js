import React, { useState, useEffect } from "react";
import "./CreateRecordForm.css";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function CreateRecordForm() {
  const [formData, setFormData] = useState({
    title: "",
    controlnum: "Loading . . .",
    classification: "",
    priority: "Normal",
    description: "",
    source: "",
    retention: "1 Year",
    destination_office: "",   // ✅ NEW
    files: [],
  });

  const [errors, setErrors] = useState({});
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);

  // ✅ Fetch control number on mount
  useEffect(() => {
    fetch("http://localhost:8081/records/next-control-number")
      .then((res) => res.json())
      .then((data) => {
        setFormData((prev) => ({ ...prev, controlnum: data.control_number }));
      })
      .catch((err) => console.error("Error fetching control number:", err));
  }, []);

  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value || "" }));
  };

  const validateFiles = (files) => {
    const invalidFiles = files.filter(
      (file) =>
        !allowedTypes.includes(file.type) || file.size > 10 * 1024 * 1024
    );
    if (invalidFiles.length > 0) {
      setErrors({
        ...errors,
        files: "Only PDF, DOC, DOCX, JPG, PNG files under 10MB are allowed.",
      });
      return [];
    } else {
      setErrors({ ...errors, files: "" });
      return files;
    }
  };

  const handleFileChange = (e) => {
    const files = validateFiles(Array.from(e.target.files));
    if (files.length > 0) {
      setFormData({ ...formData, files: [...formData.files, ...files] });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const files = validateFiles(Array.from(e.dataTransfer.files));
    if (files.length > 0) {
      setFormData({ ...formData, files: [...formData.files, ...files] });
    }
  };

  const handleRemoveFile = (index) => {
    const updatedFiles = formData.files.filter((_, i) => i !== index);
    setFormData({ ...formData, files: updatedFiles });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    let newErrors = {};
    if (!formData.title.trim()) newErrors.title = "Document title is required.";
    if (!formData.classification) newErrors.classification = "Classification is required.";
    if (!formData.destination_office) newErrors.destination_office = "Destination office is required.";
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    const payload = new FormData();
    payload.append("title", formData.title);
    payload.append("classification", formData.classification);
    payload.append("priority", formData.priority);
    payload.append("description", formData.description);
    payload.append("source", formData.source);
    payload.append("retention_period", formData.retention);
    payload.append("destination_office", formData.destination_office);

    formData.files.forEach((file) => {
      payload.append("files", file);
    });

    fetch("http://localhost:8081/records", {
      method: "POST",
      body: payload,   // ✅ no headers, let browser set multipart/form-data
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          alert(data.error);
          setLoading(false);
          return;
        }

        alert(`Record created with Control Number: ${data.control_number}`);

        // Reset form + fetch new control number
        fetch("http://localhost:8081/records/next-control-number")
          .then((res) => res.json())
          .then((nextData) => {
            setFormData({
              title: "",
              classification: "",
              priority: "Normal",
              description: "",
              source: "",
              retention: "1 Year",
              destination_office: "",
              files: [],
              controlnum: nextData.control_number || "N/A",
            });
          });

        setLoading(false);
      })
      .catch((err) => {
        console.error("Error saving record:", err);
        setLoading(false);
      });
  };



  return (
    <div className="app-layout">
      <Sidebar active="create" />
      <div className="main-content">
        <Navbar />
        <div className="form-container">
          <h2>Create New Record</h2>
          <p className="subtitle">
            Enter document information and upload files to create a new record
            in the system.
          </p>

          <form onSubmit={handleSubmit}>
            {/* Document Title & controlnum */}
            <div className="form-row">
              <div className="form-group">
                <label>Document Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Enter document title"
                  disabled={loading}
                />
                {errors.title && <span className="error">{errors.title}</span>}
              </div>
              <div className="form-group">
                <label>Control Number</label>
                <input
                  type="text"
                  name="controlnum"
                  readOnly
                  value={formData.controlnum || "N/A"}
                  disabled
                />
                <small className="hint">Auto-generated</small>
              </div>
            </div>

            {/* Classification & Priority */}
            <div className="form-row">
              <div className="form-group">
                <label>Classification *</label>
                <select
                  name="classification"
                  value={formData.classification}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="">-- Select --</option>
                  <option>Academic</option>
                  <option>Administrative</option>
                  <option>Financial</option>
                  <option>HR</option>
                  <option>Others</option>
                </select>
                {errors.classification && (
                  <span className="error">{errors.classification}</span>
                )}
              </div>
              <div className="form-group">
                <label>Priority Level</label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option>Normal</option>
                  <option>High</option>
                  <option>Urgent</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter document description..."
                disabled={loading}
              ></textarea>
            </div>

            {/* Source & Retention */}
            <div className="form-row">
              <div className="form-group">
                <label>Source/Origin</label>
                <input
                  type="text"
                  name="source"
                  value={formData.source}
                  onChange={handleChange}
                  placeholder="Document source"
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label>Retention Period (Years)</label>
                <select
                  name="retention"
                  value={formData.retention}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option>1 Year</option>
                  <option>3 Years</option>
                  <option>5 Years</option>
                  <option>10 Years</option>
                </select>
              </div>
            </div>
            {/* FILE DESTINATION */}
            <div className="form-group">
              <label>File Destination</label>
              <select
                name="destination_office"   // ✅ FIXED
                value={formData.destination_office} // ✅ FIXED
                onChange={handleChange}
                disabled={loading}
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
            {/* File Upload with Drag & Drop */}
            <div className="form-group">
              <label>Attach Files</label>
              <div
                className={`drop-zone ${dragActive ? "active" : ""}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <p>Drag and drop files here, or click to browse</p>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="file-input"
                  disabled={loading}
                />
                <small className="hint">
                  Supported formats: PDF, DOC, DOCX, JPG, PNG (Max 10MB)
                </small>
              </div>
              {errors.files && <span className="error">{errors.files}</span>}
              {formData.files.length > 0 && (
                <ul className="file-list">
                  {formData.files.map((file, i) => (
                    <li key={i}>
                      {file.type.startsWith("image/") ? (
                        <img
                          src={URL.createObjectURL(file)}
                          alt={file.name}
                          className="preview-img"
                        />
                      ) : (
                          "📄"
                        )}
                      <span className="file-name">{file.name}</span>
                      <button
                        type="button"
                        className="remove-btn"
                        onClick={() => handleRemoveFile(i)}
                        disabled={loading}
                      >
                        ❌
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Buttons */}
            <div className="form-actions">
              <button
                type="button"
                className="btn-secondary"
                disabled={loading}
              >
                Save as Draft
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? <span className="spinner"></span> : "Create Record"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
