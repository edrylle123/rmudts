// client/src/Components/CreateRecordForm.js
import React, { useState, useRef } from "react";
import "./CreateRecordForm.css";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import axios from "./axios";
import {QRCodeCanvas} from "qrcode.react";

const CLASSIFICATION_OPTIONS = ["Academic","Administrative","Financial","HR","Others"];

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


const PRIORITY_OPTIONS = ["Low", "Normal", "High"];
const RETENTION_OPTIONS = ["1 Year", "3 Years", "5 Years", "Permanent"];
const ORIGIN_OPTIONS = ["Internal", "External"];

// Reusable input + datalist with auto-normalize on blur
function AutocompleteInput({
  id,
  label,
  name,
  value,
  onChange,
  options,
  required = true,
  placeholder,
  helpText,
}) {
  const listId = `${id || name}-list`;

  const normalizeOnBlur = () => {
    if (!value) return;
    const hit = options.find(
      (opt) => opt.toLowerCase() === String(value).trim().toLowerCase()
    );
    if (hit && hit !== value) {
      // snap to canonical casing
      onChange({ target: { name, value: hit } });
    }
  };

  return (
    <div className="col-md-6">
      <label className="form-label">{label}{required ? " *" : ""}</label>
      <input
        className="form-control"
        name={name}
        list={listId}
        value={value}
        onChange={onChange}
        onBlur={normalizeOnBlur}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
      />
      <datalist id={listId}>
        {options.map((opt) => (
          <option key={opt} value={opt} />
        ))}
      </datalist>
      {required && <div className="invalid-feedback">This field is required.</div>}
      {helpText && <div className="form-text">{helpText}</div>}
    </div>
  );
}

export default function CreateRecordForm() {
  const [formData, setFormData] = useState({
    control_number: "",            // user-defined Control No.
    title: "",
    classification: "",
    priority: "",
    description: "",
    source: "",
    retention: "",
    destination_office: "",
    record_origin: "",     // defaulted; still editable
  });
const [activeOrigin, setActiveOrigin] = useState("Internal");
const handleOriginSwitch = (origin) => {
  setActiveOrigin(origin);
  setFormData((s) => ({ ...s, record_origin: origin }));
};
  const [files, setFiles] = useState([]);
  const [uploadPct, setUploadPct] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
const [showQR, setShowQR] = useState(false);
const [createdCN, setCreatedCN] = useState("");
  // validation helpers
  const [validated, setValidated] = useState(false);
  const [filesError, setFilesError] = useState("");
  const formRef = useRef(null);

  // drag & drop
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((s) => ({ ...s, [name]: value }));
  };

  // If you want to strictly require values to be from the list,
  // enable this function and call it in handleSubmit (it is used below).
  const ensureInList = (value, list) => {
    return list.some((opt) => opt.toLowerCase() === String(value).trim().toLowerCase());
  };

  const mapKey = (f) => `${f.name}__${f.size}__${f.lastModified}`;
  const addFiles = (incomingList) => {
    const incoming = Array.from(incomingList || []);
    if (!incoming.length) return;
    const cur = new Map(files.map((f) => [mapKey(f), f]));
    for (const f of incoming) cur.set(mapKey(f), f);
    setFiles(Array.from(cur.values()));
    setFilesError("");
  };
  const handleFilesChange = (e) => {
    addFiles(e.target.files);
    e.target.value = "";
  };
  const removeFile = (idx) => {
    const newList = files.filter((_, i) => i !== idx);
    setFiles(newList);
    if (newList.length === 0) setFilesError("Please attach at least one file.");
  };

  // dnd handlers
  const onDragOver = (e) => { e.preventDefault(); e.stopPropagation(); if (!dragActive) setDragActive(true); };
  const onDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); if (!dragActive) setDragActive(true); };
  const onDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); if (e.currentTarget.contains(e.relatedTarget)) return; setDragActive(false); };
  const onDrop = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); const dt = e.dataTransfer; if (dt?.files?.length) addFiles(dt.files); };
  const openFileDialog = () => fileInputRef.current?.click();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setFilesError("");

    // native required validation
    const formEl = formRef.current;
    const isNativeValid = formEl?.checkValidity?.() ?? true;
    if (!isNativeValid) {
      setValidated(true);
      return;
    }
    // at least one file
    if (files.length === 0) {
      setValidated(true);
      setFilesError("Please attach at least one file.");
      return;
    }

    // Strictly enforce allowed options (case-insensitive)
    if (!ensureInList(formData.classification, CLASSIFICATION_OPTIONS)) {
      setError("Classification must match one of the suggested options.");
      return;
    }
    if (!ensureInList(formData.priority, PRIORITY_OPTIONS)) {
      setError("Priority must be Low, Normal, or High.");
      return;
    }
    if (!ensureInList(formData.retention, RETENTION_OPTIONS)) {
      setError("Retention must match one of the suggested options.");
      return;
    }
    if (!ensureInList(formData.record_origin, ORIGIN_OPTIONS)) {
      setError("Record Origin must be Internal or External.");
      return;
    }
    if (!ensureInList(formData.destination_office, DESTINATION_OFFICES)) {
      setError("Destination Office must match one of the suggested offices.");
      return;
    }

    setSaving(true);
    setUploadPct(0);
    try {
      const fd = new FormData();
      fd.append("control_number", formData.control_number);
      fd.append("title", formData.title);
      fd.append("classification", CLASSIFICATION_OPTIONS.find(
        o => o.toLowerCase() === formData.classification.toLowerCase()
      ) || formData.classification);
      fd.append("priority", PRIORITY_OPTIONS.find(
        o => o.toLowerCase() === formData.priority.toLowerCase()
      ) || formData.priority);
      fd.append("description", formData.description);
      fd.append("source", formData.source);
      fd.append("retention_period", RETENTION_OPTIONS.find(
        o => o.toLowerCase() === formData.retention.toLowerCase()
      ) || formData.retention);
      fd.append("destination_office", DESTINATION_OFFICES.find(
        o => o.toLowerCase() === formData.destination_office.toLowerCase()
      ) || formData.destination_office);
      fd.append("record_origin", ORIGIN_OPTIONS.find(
        o => o.toLowerCase() === formData.record_origin.toLowerCase()
      ) || formData.record_origin);

      for (const f of files) fd.append("files", f);

      await axios.post("/records", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evt) => {
          if (!evt.total) return;
          setUploadPct(Math.round((evt.loaded * 100) / evt.total));
        },
      });

      alert("Record created!");

      setFormData({
        control_number: "",
        title: "",
        classification: "",
        priority: "",
        description: "",
        source: "",
        retention: "",
        destination_office: "",
        record_origin: "Internal",
      });
      setFiles([]);
      setUploadPct(0);
      setValidated(false);
      setFilesError("");
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

  const dropStyle = {
    border: `2px dashed ${filesError ? "#dc3545" : "#999"}`,
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
<div className="mb-3 d-flex gap-2">
  {ORIGIN_OPTIONS.map((opt) => (
    <button
      key={opt}
      type="button"
      onClick={() => handleOriginSwitch(opt)}
      className={`btn ${activeOrigin === opt ? "btn-primary" : "btn-outline-primary"}`}
    >
      {opt}
    </button>
  ))}
</div>

          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className={`row g-3 ${validated ? "was-validated" : ""}`}
            encType="multipart/form-data"
            noValidate
          >
            {/* Control No. (User-defined) */}
            <div className="col-md-6">
              <label className="form-label">Control No. *</label>
              <input
                className="form-control"
                name="control_number"
                required
                pattern="^[A-Za-z0-9\-_/\.]+$"
                value={formData.control_number}
                onChange={handleChange}
                placeholder="e.g., 2025-09-001 or CAO-REC-000123"
                autoComplete="off"
              />
              <div className="invalid-feedback">Control number is required.</div>
              <div className="form-text">
                Use your official format (letters, numbers, -, _, /, . allowed).
              </div>
            </div>

            {/* Title */}
            <div className="col-md-6">
              <label className="form-label">Title *</label>
              <input
                className="form-control"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                autoComplete="off"
              />
              <div className="invalid-feedback">Title is required.</div>
            </div>

            {/* Classification (input + datalist) */}
            <AutocompleteInput
              label="Classification"
              name="classification"
              value={formData.classification}
              onChange={handleChange}
              options={CLASSIFICATION_OPTIONS}
              placeholder="Start typing… e.g., Academic"
              helpText="Type to search and select a classification."
            />

            {/* Priority (input + datalist) */}
            <AutocompleteInput
              label="Priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              options={PRIORITY_OPTIONS}
              placeholder="Start typing… e.g., Normal"
              helpText="Type to search and select a priority."
            />

            {/* Retention (input + datalist) */}
            <AutocompleteInput
              label="Retention"
              name="retention"
              value={formData.retention}
              onChange={handleChange}
              options={RETENTION_OPTIONS}
              placeholder="Start typing… e.g., 1 Year"
              helpText="Type to search and select a retention period."
            />
{/* Record Origin (input + datalist) */}
            {/* <AutocompleteInput
              label="Record Origin"
              name="record_origin"
              value={formData.record_origin}
              onChange={handleChange}
              options={ORIGIN_OPTIONS}
              placeholder="Start typing… e.g., Internal"
              helpText="Type to search and select Internal or External."
            /> */}
            {/* Description */}
            <div className="col-12">
              <label className="form-label">Description *</label>
              <textarea
                className="form-control"
                rows="3"
                name="description"
                required
                value={formData.description}
                onChange={handleChange}
              />
              <div className="invalid-feedback">Description is required.</div>
            </div>

            {/* Concerned Personnel */}
            <div className="col-md-6">
              <label className="form-label">Concerned Personnel *</label>
              <input
                className="form-control"
                name="source"
                
                value={formData.source}
                onChange={handleChange}
                autoComplete="off"
              />
              <div className="invalid-feedback">This field is required.</div>
            </div>

            {/* Destination Office (input + datalist) */}
            <AutocompleteInput
              label="Destination Office"
              name="destination_office"
              value={formData.destination_office}
              onChange={handleChange}
              options={DESTINATION_OFFICES}
              placeholder="Start typing… e.g., Accounting Office"
              helpText="Type to search and select a destination office."
            />

            

            {/* Attachments */}
            <div className="col-12">
              <label className="form-label">Attachments *</label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="d-none"
                onChange={handleFilesChange}
              />

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
                  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openFileDialog(); }
                }}
                aria-label="File upload area"
              >
                <div className="mb-1 fw-semibold">
                  Drag & drop files here, or <u>click to browse</u>
                </div>
                <div className="text-muted small">You must attach at least one file.</div>
              </div>
              {filesError && <div className="invalid-feedback d-block">{filesError}</div>}

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
                          {f.name} <span className="text-muted">({Math.round(f.size / 1024)} KB)</span>
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

            {/* Upload progress */}
            {saving && uploadPct > 0 && (
              <div className="col-12">
                <div className="progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={uploadPct}>
                  <div className="progress-bar" style={{ width: `${uploadPct}%` }}>{uploadPct}%</div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="col-12 d-flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Create Record"}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => window.history.back()} disabled={saving}>
                Cancel
              </button>
            </div>
          </form>
          {/* QR Code popup */}
        {/* QR Code popup */}
{showQR && (
  <div className="qr-modal">
    <h4>QR Code for {createdCN}</h4>
    <QRCodeCanvas value={createdCN} size={150} />
    <button onClick={() => setShowQR(false)}>Close</button>
  </div>
)}
        </div>
      </div>
    </div>
  );
}
