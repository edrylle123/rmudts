// client/src/Components/CreateRecordForm.js
import React, { useEffect, useState, useRef } from "react";
import "./CreateRecordForm.css";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import axios from "./axios";

const CLASSIFICATION_OPTIONS = [
  "Academic",
  "Administrative",
  "Financial",
  "HR",
  "Others",
];

// EXACT office names as provided
const DESTINATION_OFFICES = [
  
  "Accounting Office",
  "Cashier",
  "supply office",
  "Office of the Budget officer",
  "office of the Chief Administrative Officer- Finance",
  "PACD",
  "Marketing",
  "Office of the Planning Officer",
  "Office of the Campus Administrator",
  "Legal Office",
  "Quality and Assurance Office",
  "Registrar office",
  "Office of the Vice President - Admin and Finance",
  "Office of the Board Secretary",
  "Office of the President",
  "office of the Alumni",
  "Human Resource Office",
  "International Relations Office",
  "General Servicing Unit",
  "Planning Management Unit",
  "Information Technology Office",
  "Information Office",
  "Procurement office",
  "Office of the Supervising Administrative Officer",
];

export default function CreateRecordForm() {
  const [nextControl, setNextControl] = useState("");
  const [fetchingCn, setFetchingCn] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    classification: "Academic",
    priority: "Normal",
    description: "",
    source: "",
    retention: "1 Year",
    destination_office: "",
  });

  const [files, setFiles] = useState([]); // File[]
  const [uploadPct, setUploadPct] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // drag & drop state
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // --- Control number preview ---
  const loadNextControlNumber = async () => {
    try {
      setFetchingCn(true);
      const res = await axios.get("/records/next-control-number");
      setNextControl(res?.data?.control_number || "");
    } catch (e) {
      console.error(e);
      setNextControl("");
    } finally {
      setFetchingCn(false);
    }
  };

  useEffect(() => {
    loadNextControlNumber();
  }, []);

  // --- handlers ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((s) => ({ ...s, [name]: value }));
  };

  const mapKey = (f) => `${f.name}__${f.size}__${f.lastModified}`;
  const addFiles = (incomingList) => {
    const incoming = Array.from(incomingList || []);
    if (!incoming.length) return;
    const cur = new Map(files.map((f) => [mapKey(f), f]));
    for (const f of incoming) cur.set(mapKey(f), f);
    setFiles(Array.from(cur.values()));
  };

  const handleFilesChange = (e) => {
    addFiles(e.target.files);
    // reset so selecting same file again triggers change
    e.target.value = "";
  };

  const removeFile = (idx) => {
    setFiles((list) => list.filter((_, i) => i !== idx));
  };

  // --- drag & drop events ---
  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragActive) setDragActive(true);
  };
  const onDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragActive) setDragActive(true);
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Avoid flicker when moving between children:
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setDragActive(false);
  };
  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dt = e.dataTransfer;
    if (dt?.files?.length) addFiles(dt.files);
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setUploadPct(0);
    try {
      const fd = new FormData();
      fd.append("title", formData.title);
      fd.append("classification", formData.classification);
      fd.append("priority", formData.priority);
      fd.append("description", formData.description);
      fd.append("source", formData.source);
      fd.append("retention_period", formData.retention); // backend expects retention_period
      fd.append("destination_office", formData.destination_office);
      // control number is assigned by the server

      for (const f of files) {
        fd.append("files", f); // multer expects "files"
      }

      await axios.post("/records", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evt) => {
          if (!evt.total) return;
          const pct = Math.round((evt.loaded * 100) / evt.total);
          setUploadPct(pct);
        },
      });

      alert("Record created!");

      // reset form
      setFormData({
        title: "",
        classification: "Academic",
        priority: "Normal",
        description: "",
        source: "",
        retention: "1 Year",
        destination_office: "",
      });
      setFiles([]);
      setUploadPct(0);

      // fetch next preview control number
      await loadNextControlNumber();
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Failed to create record";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  // simple inline styles for the drop zone (works without extra CSS)
  const dropStyle = {
    border: "2px dashed #999",
    borderRadius: 12,
    padding: 16,
    textAlign: "center",
    cursor: "pointer",
    background: dragActive ? "rgba(0, 123, 255, 0.08)" : "#fafafa",
    transition: "background 120ms ease",
  };

  return (
    <div className="d-flex">
      <Sidebar />
      <div className="flex-grow-1">
        <Navbar />
        <div className="container p-3">
          <h2 className="mb-3">Create New Record</h2>
          {error && <div className="alert alert-danger">{error}</div>}

          <form onSubmit={handleSubmit} className="row g-3" encType="multipart/form-data">
            {/* Title */}
            <div className="col-md-6">
              <label className="form-label">Title *</label>
              <input
                className="form-control"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
              />
            </div>

            {/* Control No. (auto preview) */}
            <div className="col-md-6">
              <label className="form-label">Control No.</label>
              <div className="input-group">
                <input
                  className="form-control"
                  value={fetchingCn ? "Generating…" : nextControl || "(assigned on save)"}
                  readOnly
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={loadNextControlNumber}
                  disabled={fetchingCn}
                  title="Refresh next Control No."
                >
                  {fetchingCn ? "…" : "Refresh"}
                </button>
              </div>
              <div className="form-text">
                The official control number is assigned by the server on save.
              </div>
            </div>

            {/* Classification (required) */}
            <div className="col-md-4">
              <label className="form-label">Classification *</label>
              <select
                className="form-select"
                name="classification"
                value={formData.classification}
                onChange={handleChange}
                required
              >
                {CLASSIFICATION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div className="col-md-4">
              <label className="form-label">Priority</label>
              <select
                className="form-select"
                name="priority"
                value={formData.priority}
                onChange={handleChange}
              >
                <option>Low</option>
                <option>Normal</option>
                <option>High</option>
              </select>
            </div>

            {/* Retention */}
            <div className="col-md-4">
              <label className="form-label">Retention</label>
              <select
                className="form-select"
                name="retention"
                value={formData.retention}
                onChange={handleChange}
              >
                <option>1 Year</option>
                <option>3 Years</option>
                <option>5 Years</option>
                <option>Permanent</option>
              </select>
            </div>

            {/* Description */}
            <div className="col-12">
              <label className="form-label">Description</label>
              <textarea
                className="form-control"
                rows="3"
                name="description"
                value={formData.description}
                onChange={handleChange}
              />
            </div>

            {/* Source */}
            <div className="col-md-6">
              <label className="form-label">Source</label>
              <input
                className="form-control"
                name="source"
                value={formData.source}
                onChange={handleChange}
              />
            </div>

            {/* Destination Office (dropdown) */}
            <div className="col-md-6">
              <label className="form-label">Destination Office *</label>
              <select
                className="form-select"
                name="destination_office"
                value={formData.destination_office}
                onChange={handleChange}
                required
              >
                <option value="">— Choose Destination Office —</option>
                {DESTINATION_OFFICES.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Drag & Drop Attachments */}
            <div className="col-12">
              <label className="form-label">Attachments</label>

              {/* Hidden input for click-to-browse */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="d-none"
                onChange={handleFilesChange}
                // accept=".pdf,.doc,.docx,.xls,.xlsx,image/*" // customize if needed
              />

              {/* Drop zone */}
              <div
                style={dropStyle}
                onClick={openFileDialog}
                onDragOver={onDragOver}
                onDragEnter={onDragEnter}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openFileDialog();
                  }
                }}
                aria-label="File upload area"
              >
                <div className="mb-1 fw-semibold">
                  Drag & drop files here, or <u>click to browse</u>
                </div>
                <div className="text-muted small">
                  You can attach multiple files.
                </div>
              </div>

              {/* Selected files list */}
              {files.length > 0 && (
                <div className="mt-2">
                  <div className="small text-muted mb-1">
                    Selected files ({files.length})
                  </div>
                  <ul className="list-unstyled mb-0">
                    {files.map((f, idx) => (
                      <li
                        key={`${f.name}-${f.size}-${f.lastModified}`}
                        className="d-flex align-items-center justify-content-between"
                      >
                        <span className="small">
                          {f.name}{" "}
                          <span className="text-muted">
                            ({Math.round(f.size / 1024)} KB)
                          </span>
                        </span>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => removeFile(idx)}
                          title="Remove file"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Upload progress (if any) */}
            {saving && uploadPct > 0 && (
              <div className="col-12">
                <div
                  className="progress"
                  role="progressbar"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-valuenow={uploadPct}
                >
                  <div className="progress-bar" style={{ width: `${uploadPct}%` }}>
                    {uploadPct}%
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="col-12 d-flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Create Record"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => window.history.back()}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
