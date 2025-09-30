// client/src/Components/CreateRecordForm.js
import React, { useState, useRef } from "react";
import "./CreateRecordForm.css";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import axios from "./axios";
import { QRCodeCanvas } from "qrcode.react";

const CLASSIFICATION_OPTIONS = ["Academic", "Administrative", "Financial", "HR", "Others"];
const PRIORITY_OPTIONS = ["Low", "Normal", "High"];
const RETENTION_OPTIONS = ["1 Year", "3 Years", "5 Years", "Permanent"];
const ORIGIN_OPTIONS = ["Internal", "External"];
const DESTINATION_OFFICES = [
  "Accounting Office",
  "Cashier",
  "Supply Office",
  "Office of the Budget Officer",
  "Office of the Chief Administrative Officer- Finance",
  "PACD",
  "Marketing",
  "Office of the Planning Officer",
  "Office of the Campus Administrator",
  "Legal Office",
  "Quality and Assurance Office",
  "Registrar Office",
  "Office of the Vice President - Admin and Finance",
  "Office of the Board Secretary",
  "Office of the President",
  "Office of the Alumni",
  "Human Resource Office",
  "International Relations Office",
  "General Servicing Unit",
  "Planning Management Unit",
  "Information Technology Office",
  "Information Office",
  "Procurement Office",
  "Office of the Supervising Administrative Officer",
];

// Reusable autocomplete input
function AutocompleteInput({ id, label, name, value, onChange, options, required = true, placeholder }) {
  const listId = `${id || name}-list`;
  const normalizeOnBlur = () => {
    if (!value) return;
    const hit = options.find(opt => opt.toLowerCase() === value.trim().toLowerCase());
    if (hit && hit !== value) onChange({ target: { name, value: hit } });
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
        {options.map(opt => <option key={opt} value={opt} />)}
      </datalist>
      {required && <div className="invalid-feedback">This field is required.</div>}
    </div>
  );
}

export default function CreateRecordForm() {
  const [formData, setFormData] = useState({
    control_number: "",
    title: "",
    classification: "",
    priority: "",
    description: "",
    source: "",
    retention_period: "",
    destination_office: "",
    record_origin: "Internal",
  });
  const [activeOrigin, setActiveOrigin] = useState("Internal");
  const [files, setFiles] = useState([]);
  const [uploadPct, setUploadPct] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [validated, setValidated] = useState(false);
  const [filesError, setFilesError] = useState("");
  const [showQR, setShowQR] = useState(false);
  const [createdCN, setCreatedCN] = useState("");
  const formRef = useRef(null);
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  // ---- handlers
  const handleOriginSwitch = (origin) => {
    setActiveOrigin(origin);
    setFormData(s => ({ ...s, record_origin: origin }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(s => ({ ...s, [name]: value }));
  };

  const mapKey = (f) => `${f.name}__${f.size}__${f.lastModified}`;
  const addFiles = (incomingList) => {
    const incoming = Array.from(incomingList || []);
    if (!incoming.length) return;
    const cur = new Map(files.map(f => [mapKey(f), f]));
    for (const f of incoming) cur.set(mapKey(f), f);
    setFiles(Array.from(cur.values()));
    setFilesError("");
  };
  const handleFilesChange = (e) => { addFiles(e.target.files); e.target.value = ""; };
  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const onDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); };
  const onDragEnter = onDragOver;
  const onDragLeave = (e) => { if (e.currentTarget.contains(e.relatedTarget)) return; setDragActive(false); };
  const onDrop = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); addFiles(e.dataTransfer.files); };
  const openFileDialog = () => fileInputRef.current?.click();

  const ensureInList = (value, list) => list.some(opt => opt.toLowerCase() === value.trim().toLowerCase());

const handleSubmit = async (e) => {
  e.preventDefault();
  setError(null);
  setFilesError("");

  const formEl = formRef.current;
  if (!(formEl?.checkValidity?.() ?? true)) {
    setValidated(true);
    return;
  }
  if (files.length === 0) {
    setFilesError("Please attach at least one file.");
    setValidated(true);
    return;
  }

  setSaving(true);
  setUploadPct(0);

  try {
    const fd = new FormData();
Object.entries(formData).forEach(([k, v]) => fd.append(k, v));
for (const f of files) fd.append("files", f);
for (let pair of fd.entries()) {
  console.log(pair[0]+ ': '+ pair[1]);
}

    const response = await axios.post("/records", fd, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (evt) => {
        if (evt.total) setUploadPct(Math.round((evt.loaded * 100) / evt.total));
      },
    });

    // If the request succeeds, proceed to show the QR code
    const cn = response.data.control_number || formData.control_number;
    setCreatedCN(cn);
    setShowQR(true);

    // reset form
    setFormData({
      control_number: "",
      title: "",
      classification: "",
      priority: "",
      description: "",
      source: "",
      retention_period: "",
      destination_office: "",
      record_origin: "Internal",
    });
    setFiles([]);
    setUploadPct(0);
    setValidated(false);
    setFilesError("");
  } catch (err) {
    console.error("Error during record creation:", err);
    setError(
      err?.response?.data?.error || "Failed to create record. Please try again later."
    );
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
    background: dragActive ? "rgba(0,123,255,0.08)" : "#fafafa",
    transition: "background 120ms ease",
  };

  return (
    <div className="d-flex">
      <Sidebar />
      <div className="flex-grow-1">
        <Navbar />
        <div className="container p-3">
          <h2>Create New Record</h2>
          {error && <div className="alert alert-danger">{error}</div>}

          <div className="mb-3 d-flex gap-2">
            {ORIGIN_OPTIONS.map(opt => (
              <button key={opt} type="button" onClick={() => handleOriginSwitch(opt)}
                className={`btn ${activeOrigin===opt ? "btn-primary":"btn-outline-primary"}`}>{opt}</button>
            ))}
          </div>

          <form ref={formRef} className={`row g-3 ${validated?"was-validated":""}`} onSubmit={handleSubmit} encType="multipart/form-data" noValidate>
            {/* Control No */}
            <div className="col-md-6">
              <label className="form-label">Control No. *</label>
              <input 
  className="form-control" 
  name="control_number" 
  pattern="[A-Za-z0-9._\-\/]+" 
  value={formData.control_number} 
  onChange={handleChange} 
  placeholder="e.g., 2025-09-001" 
  required 
  autoComplete="off" 
/>

              <div className="invalid-feedback">Control number is required.</div>
              <div className="form-text">Letters, numbers, -, _, /, . allowed</div>
            </div>
            {/* Title */}
            <div className="col-md-6">
              <label className="form-label">Title *</label>
              <input className="form-control" name="title" value={formData.title} onChange={handleChange} required />
              <div className="invalid-feedback">Title is required.</div>
            </div>

            <AutocompleteInput label="Classification" name="classification" value={formData.classification} onChange={handleChange} options={CLASSIFICATION_OPTIONS} placeholder="e.g., Academic" />
            <AutocompleteInput label="Priority" name="priority" value={formData.priority} onChange={handleChange} options={PRIORITY_OPTIONS} placeholder="e.g., Normal" />
            <AutocompleteInput label="Retention" name="retention_period" value={formData.retention_period} onChange={handleChange} options={RETENTION_OPTIONS} placeholder="e.g., 1 Year" />
            <AutocompleteInput label="Destination Office" name="destination_office" value={formData.destination_office} onChange={handleChange} options={DESTINATION_OFFICES} placeholder="Select Destination" />

            {/* Description */}
            <div className="col-12">
              <label className="form-label">Description *</label>
              <textarea className="form-control" name="description" rows={3} value={formData.description} onChange={handleChange} required></textarea>
              <div className="invalid-feedback">Description is required.</div>
            </div>

            {/* Source */}
            <div className="col-md-6">
              <label className="form-label">Concerned Personnel *</label>
              <input className="form-control" name="source" value={formData.source} onChange={handleChange} required />
              <div className="invalid-feedback">This field is required.</div>
            </div>

            {/* Attachments */}
            <div className="col-12">
              <input ref={fileInputRef} type="file" multiple className="d-none" onChange={handleFilesChange} />
              <div style={dropStyle} onClick={openFileDialog} onDragOver={onDragOver} onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDrop={onDrop}>
                <div className="mb-1 fw-semibold">Drag & drop files here or click to browse</div>
                <div className="text-muted small">At least one file required</div>
              </div>
              {filesError && <div className="invalid-feedback d-block">{filesError}</div>}
              {files.length>0 && (
                <ul className="list-unstyled mt-2">
                  {files.map((f, idx)=>(
                    <li key={mapKey(f)} className="d-flex justify-content-between align-items-center">
                      <span>{f.name} ({Math.round(f.size/1024)} KB)</span>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={()=>removeFile(idx)}>Remove</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Upload progress */}
            {saving && uploadPct>0 && (
              <div className="col-12">
                <div className="progress">
                  <div className="progress-bar" style={{width:`${uploadPct}%`}}>{uploadPct}%</div>
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="col-12 d-flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving?"Saving…":"Create Record"}</button>
              <button type="button" className="btn btn-secondary" disabled={saving} onClick={()=>window.history.back()}>Cancel</button>
            </div>
          </form>

          {/* QR Code Modal */}
         {showQR && createdCN && (
  <div className="qr-modal-backdrop">
    <div className="qr-modal-content text-center p-3">
      <h4 className="mb-3">QR Code for {createdCN}</h4>
      {/* Here you fetch the QR code path from the backend */}
      <img src={`http://localhost:8081/uploads/qr-${createdCN}.png`} alt={`QR Code for ${createdCN}`} width={200} height={200} />
      <div className="mt-3">
        <button className="btn btn-secondary" onClick={() => setShowQR(false)}>Close</button>
      </div>
    </div>
  </div>
)}

        </div>
      </div>
    </div>
  );
}
