// import React, { useState, useRef } from "react";
// import "./CreateRecordForm.css";
// import Sidebar from "./Sidebar";
// import Navbar from "./Navbar";
// import axios from "./axios";
// import { QRCodeCanvas } from "qrcode.react";
// import Select from "react-select"; // Import react-select

// const CLASSIFICATION_OPTIONS = ["Academic", "Administrative", "Financial", "HR", "Others"];
// const PRIORITY_OPTIONS = ["Normal", "Urgent", "Immediate"];
// const ORIGIN_OPTIONS = ["Internal", "External"]; // Document type options
// const RETENTION_OPTIONS = [
//   { label: "1 Year", value: "1 Year" },
//   { label: "2 Years", value: "2 Years" },
//   { label: "3 Years", value: "3 Years" },
//   { label: "4 Years", value: "4 Years" },
//   { label: "5 Years", value: "5 Years" },
//   { label: "6 Years", value: "6 Years" },
//   { label: "7 Years", value: "7 Years" },
//   { label: "8 Years", value: "8 Years" },
//   { label: "9 Years", value: "9 Years" },
//   { label: "10 Years", value: "10 Years" },
//   { label: "Permanent", value: "Permanent" },
// ];
// const DESTINATION_OFFICES = [
//   "Accounting Office",
//   "Cashier",
//   "Supply Office",
//   "Office of the Budget Officer",
//   "Office of the Chief Administrative Officer- Finance",
//   "PACD",
//   "Marketing",
//   "Office of the Planning Officer",
//   "Office of the Campus Administrator",
//   "Legal Office",
//   "Quality and Assurance Office",
//   "Registrar Office",
//   "Office of the Vice President - Admin and Finance",
//   "Office of the Board Secretary",
//   "Office of the President",
//   "Office of the Alumni",
//   "Human Resource Office",
//   "International Relations Office",
//   "General Servicing Unit",
//   "Planning Management Unit",
//   "Information Technology Office",
//   "Information Office",
//   "Procurement Office",
//   "Office of the Supervising Administrative Officer",
// ];

// // Reusable autocomplete input
// function AutocompleteInput({ id, label, name, value, onChange, options, required = true, placeholder }) {
//   const listId = `${id || name}-list`;
//   const normalizeOnBlur = () => {
//     if (!value) return;
//     const hit = options.find(opt => opt.toLowerCase() === value.trim().toLowerCase());
//     if (hit && hit !== value) onChange({ target: { name, value: hit } });
//   };
//   return (
//     <div className="col-md-6">
//       <label className="form-label">{label}{required ? " *" : ""}</label>
//       <input
//         className="form-control"
//         name={name}
//         list={listId}
//         value={value}
//         onChange={onChange}
//         onBlur={normalizeOnBlur}
//         required={required}
//         placeholder={placeholder}
//         autoComplete="off"
//       />
//       <datalist id={listId}>
//         {options.map(opt => <option key={opt} value={opt} />)}
//       </datalist>
//       {required && <div className="invalid-feedback">This field is required.</div>}
//     </div>
//   );
// }

// export default function CreateRecordForm() {
//   const [formData, setFormData] = useState({
//     control_number: "",
//     office_requestor: "",
//     classification: "",
//     priority: "",
//     description: "",
//     concerned_personnel: "",
//     retention_period: "",
//     destination_office: "",
//     record_origin: "", // Will hold the document type value
//   });
//   const [activeOrigin, setActiveOrigin] = useState("");
//   const [files, setFiles] = useState([]);
//   const [uploadPct, setUploadPct] = useState(0);
//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState(null);
//   const [validated, setValidated] = useState(false);
//   const [filesError, setFilesError] = useState("");
//   const [showQR, setShowQR] = useState(false);
//   const [createdCN, setCreatedCN] = useState("");
//   const formRef = useRef(null);
//   const fileInputRef = useRef(null);
//   const [dragActive, setDragActive] = useState(false);

//   // ---- handlers
//   const handleOriginSwitch = (origin) => {
//   setActiveOrigin(origin);
//   setFormData((s) => ({ ...s, record_origin: origin }));  // This updates the formData with the correct origin
// };


//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData(s => ({ ...s, [name]: value }));
//   };

//   const mapKey = (f) => `${f.name}__${f.size}__${f.lastModified}`;
//   const addFiles = (incomingList) => {
//     const incoming = Array.from(incomingList || []);
//     if (!incoming.length) return;
//     const cur = new Map(files.map(f => [mapKey(f), f]));
//     for (const f of incoming) cur.set(mapKey(f), f);
//     setFiles(Array.from(cur.values()));
//     setFilesError("");
//   };
//   const handleFilesChange = (e) => { addFiles(e.target.files); e.target.value = ""; };
//   const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

//   const onDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); };
//   const onDragEnter = onDragOver;
//   const onDragLeave = (e) => { if (e.currentTarget.contains(e.relatedTarget)) return; setDragActive(false); };
//   const onDrop = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); addFiles(e.dataTransfer.files); };
//   const openFileDialog = () => fileInputRef.current?.click();

//   const ensureInList = (value, list) => list.some(opt => opt.toLowerCase() === value.trim().toLowerCase());
//   // Handle retention period change (from react-select)
//   const handleRetentionChange = (selectedOption) => {
//     setFormData((prevState) => ({
//       ...prevState,
//       retention_period: selectedOption ? selectedOption.value : ""
//     }));
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     console.log("Form data being submitted:", formData);  // Debug log
//     setError(null);
//     setFilesError("");

//     const formEl = formRef.current;
//     if (!(formEl?.checkValidity?.() ?? true)) {
//       setValidated(true);
//       return;
//     }
//     if (files.length === 0) {
//       setFilesError("Please attach at least one file.");
//       setValidated(true);
//       return;
//     }

//     // Extract the numeric part of the retention_period (e.g., "2 Years" -> 2)
//     const retentionPeriodNumber = parseInt(formData.retention_period.split(" ")[0], 10);
    
//     if (isNaN(retentionPeriodNumber)) {
//       setError("Invalid retention period.");
//       return;
//     }

//     setSaving(true);
//     setUploadPct(0);

//     try {
//       const fd = new FormData();
//       Object.entries(formData).forEach(([k, v]) => {
//         if (k === "retention_period") {
//           fd.append(k, retentionPeriodNumber); // Store numeric retention period
//         } else {
//           fd.append(k, v);
//         }
//       });

//       for (const f of files) {
//         fd.append("files", f); // Ensure the 'files' key matches what your backend expects
//       }

//       // Check if files are properly appended to FormData
//       for (let pair of fd.entries()) {
//         console.log(pair[0] + ': ' + pair[1]);
//       }

//       const response = await axios.post("http://localhost:8081/records", fd, {
//         headers: { "Content-Type": "multipart/form-data" },
//         onUploadProgress: (evt) => {
//           if (evt.total) setUploadPct(Math.round((evt.loaded * 100) / evt.total));
//         },
//       });

//       // Handle success
//       const cn = response.data.control_number || formData.control_number;
//       setCreatedCN(cn);
//       setShowQR(true);

//       // Reset form and states
//       setFormData({
//         control_number: "",
//         office_requestor: "",
//         classification: "",
//         priority: "",
//         description: "",
//         concerned_personnel: "",
//         retention_period: "",
//         destination_office: "",
//         record_origin: "",
//       });
//       setFiles([]);
//       setUploadPct(0);
//       setValidated(false);
//       setFilesError("");
//     } catch (err) {
//       console.error("Error during record creation:", err);
//       setError(
//         err?.response?.data?.error || "Failed to create record. Please try again later."
//       );
//     } finally {
//       setSaving(false);
//     }
//   };

//   const dropStyle = {
//     border: `2px dashed ${filesError ? "#dc3545" : "#999"}`,
//     borderRadius: 12,
//     padding: 16,
//     textAlign: "center",
//     cursor: "pointer",
//     background: dragActive ? "rgba(0,123,255,0.08)" : "#fafafa",
//     transition: "background 120ms ease",
//   };

//   return (
//     <div className="d-flex">
//       <Sidebar />
//       <div className="flex-grow-1">
//         <Navbar />
//         <div className="container p-3">
//           <h2>Create New Record</h2>
//           {error && <div className="alert alert-danger">{error}</div>}

//           <div className="mb-3 d-flex gap-2">
//             {ORIGIN_OPTIONS.map(opt => (
//               <button key={opt} type="button" onClick={() => handleOriginSwitch(opt)}
//                 className={`btn ${activeOrigin === opt ? "btn-primary" : "btn-outline-primary"}`}>{opt}</button>
//             ))}
//           </div>

//           <form ref={formRef} className={`row g-3 ${validated ? "was-validated" : ""}`} onSubmit={handleSubmit} encType="multipart/form-data" noValidate>
//             {/* Control No */}
//             <div className="col-md-6">
//               <label className="form-label">Control No. *</label>
//               <input
//                 className="form-control"
//                 name="control_number"
//                 pattern="[A-Za-z0-9._\-\/]+" 
//                 value={formData.control_number}
//                 onChange={handleChange}
//                 placeholder="e.g., 2025-09-001"
//                 required
//                 autoComplete="off"
//               />
//               <div className="invalid-feedback">Control number is required.</div>
//               <div className="form-text">Letters, numbers, -, _, /, . allowed</div>
//             </div>
//             {/* Office/Requestor */}
//             <div className="col-md-6">
//               <label className="form-label">Office/ Requestor *</label>
//               <input
//                 className="form-control"
//                 name="office_requestor"
//                 value={formData.office_requestor}
//                 onChange={handleChange}
//                 required
//               />
//               <div className="invalid-feedback">Office/Requestor is required.</div>
//             </div>
//             {/* Description */}
//             <div className="col-12">
//               <label className="form-label">Title and Description *</label>
//               <textarea className="form-control" name="description" rows={2} value={formData.description} onChange={handleChange} required></textarea>
//               <div className="invalid-feedback">Description is required.</div>
//             </div>
//             {/* Source */}
//             {/* Concerned Personnel */}
//             <div className="col-md-6">
//               <label className="form-label">Concerned Personnel *</label>
//               <input
//                 className="form-control"
//                 name="concerned_personnel"
//                 value={formData.concerned_personnel}
//                 onChange={handleChange}
//                 required
//               />
//               <div className="invalid-feedback">This field is required.</div>
//             </div>
//             <AutocompleteInput label="Destination Office" name="destination_office" value={formData.destination_office} onChange={handleChange} options={DESTINATION_OFFICES} placeholder="Select Destination" />

//             <AutocompleteInput label="Classification" name="classification" value={formData.classification} onChange={handleChange} options={CLASSIFICATION_OPTIONS} placeholder="e.g., Academic" />
//             <AutocompleteInput label="Priority" name="priority" value={formData.priority} onChange={handleChange} options={PRIORITY_OPTIONS} placeholder="e.g., Normal" />
// {/* Retention Period */}
//             <div className="col-md-6">
//               <label className="form-label">Retention Period *</label>
//               <Select
//                 options={RETENTION_OPTIONS}
//                 onChange={handleRetentionChange}
//                 value={RETENTION_OPTIONS.find(option => option.value === formData.retention_period)}
//                 placeholder="Select Retention Period"
//                 isSearchable
//                 required
//               />
//             </div>

//             {/* Attachments */}
//             <div className="col-12">
//               <input ref={fileInputRef} type="file" multiple className="d-none" onChange={handleFilesChange} />
//               <div style={dropStyle} onClick={openFileDialog} onDragOver={onDragOver} onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDrop={onDrop}>
//                 <div className="mb-1 fw-semibold">Drag & drop files here or click to browse</div>
//                 <div className="text-muted small">At least one file required</div>
//               </div>
//               {filesError && <div className="invalid-feedback d-block">{filesError}</div>}
//               {files.length > 0 && (
//                 <ul className="list-unstyled mt-2">
//                   {files.map((f, idx) => (
//                     <li key={mapKey(f)} className="d-flex justify-content-between align-items-center">
//                       <span>{f.name} ({Math.round(f.size / 1024)} KB)</span>
//                       <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeFile(idx)}>Remove</button>
//                     </li>
//                   ))}
//                 </ul>
//               )}
//             </div>

//             {/* Upload progress */}
//             {saving && uploadPct > 0 && (
//               <div className="col-12">
//                 <div className="progress">
//                   <div className="progress-bar" style={{ width: `${uploadPct}%` }}>{uploadPct}%</div>
//                 </div>   
//               </div>
//             )}

//             {/* Submit */}
//             <div className="col-12 d-flex gap-2">
//               <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Create Record"}</button>
//               <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => window.history.back()}>Cancel</button>
//             </div>
//           </form>
//         </div>
//       </div>
//     </div>
//   );
// }








import React, { useState, useRef } from "react";
import "./CreateRecordForm.css";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import axios from "./axios";
import { QRCodeCanvas } from "qrcode.react";
import Select from "react-select"; // Import react-select
import 'bootstrap/dist/css/bootstrap.min.css';

const CLASSIFICATION_OPTIONS = ["Academic", "Administrative", "Financial", "HR", "Others"];
const PRIORITY_OPTIONS = ["Normal", "Urgent", "Immediate"];
const ORIGIN_OPTIONS = ["Internal", "External"]; // Document type options
const RETENTION_OPTIONS = [
  { label: "1 Year", value: "1 Year" },
  { label: "2 Years", value: "2 Years" },
  { label: "3 Years", value: "3 Years" },
  { label: "4 Years", value: "4 Years" },
  { label: "5 Years", value: "5 Years" },
  { label: "6 Years", value: "6 Years" },
  { label: "7 Years", value: "7 Years" },
  { label: "8 Years", value: "8 Years" },
  { label: "9 Years", value: "9 Years" },
  { label: "10 Years", value: "10 Years" },
  { label: "Permanent", value: "Permanent" },
];
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
    office_requestor: "",
    classification: "",
    priority: "",
    description: "",
    concerned_personnel: "",
    retention_period: "",
    destination_office: "",
    record_origin: "", // Will hold the document type value
  });
  const [activeOrigin, setActiveOrigin] = useState("");
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
    setFormData((s) => ({ ...s, record_origin: origin }));  // This updates the formData with the correct origin
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
  
  const handleFilesChange = (e) => { 
    addFiles(e.target.files); 
    e.target.value = ""; 
  };

  const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const onDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); };
  const onDragEnter = onDragOver;
  const onDragLeave = (e) => { if (e.currentTarget.contains(e.relatedTarget)) return; setDragActive(false); };
  const onDrop = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); addFiles(e.dataTransfer.files); };
  const openFileDialog = () => fileInputRef.current?.click();

  const ensureInList = (value, list) => list.some(opt => opt.toLowerCase() === value.trim().toLowerCase());
  
  // Handle retention period change (from react-select)
  const handleRetentionChange = (selectedOption) => {
    setFormData((prevState) => ({
      ...prevState,
      retention_period: selectedOption ? selectedOption.value : ""
    }));
  };

  // Validate PDF files before submitting
  const validateFiles = () => {
    for (const file of files) {
      if (file.type !== "application/pdf") {
        setFilesError("Only PDF files are allowed.");
        return false;
      }
    }
    setFilesError("");  // Clear previous error if validation passes
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Form data being submitted:", formData);  // Debug log
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

    // Validate files
    if (!validateFiles()) return;

    // Extract the numeric part of the retention_period (e.g., "2 Years" -> 2)
    const retentionPeriodNumber = parseInt(formData.retention_period.split(" ")[0], 10);
    
    if (isNaN(retentionPeriodNumber)) {
      setError("Invalid retention period.");
      return;
    }

    setSaving(true);
    setUploadPct(0);

    try {
      const fd = new FormData();
      Object.entries(formData).forEach(([k, v]) => {
        if (k === "retention_period") {
          fd.append(k, retentionPeriodNumber); // Store numeric retention period
        } else {
          fd.append(k, v);
        }
      });

      for (const f of files) {
        fd.append("files", f); // Ensure the 'files' key matches what your backend expects
      }

      // Check if files are properly appended to FormData
      for (let pair of fd.entries()) {
        console.log(pair[0] + ': ' + pair[1]);
      }

      const response = await axios.post("http://localhost:8081/records", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evt) => {
          if (evt.total) setUploadPct(Math.round((evt.loaded * 100) / evt.total));
        },
      });

      // Handle success
      const cn = response.data.control_number || formData.control_number;
      setCreatedCN(cn);
      setShowQR(true);

      // Reset form and states
      setFormData({
        control_number: "",
        office_requestor: "",
        classification: "",
        priority: "",
        description: "",
        concerned_personnel: "",
        retention_period: "",
        destination_office: "",
        record_origin: "",
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
const closeModal = () => {
    setShowQR(false); // Hide the modal when closing it
  };
  const closePopup = () => {
    setShowQR(false);
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
                className={`btn ${activeOrigin === opt ? "btn-primary" : "btn-outline-primary"}`}>{opt}</button>
            ))}
          </div>

          <form ref={formRef} className={`row g-3 ${validated ? "was-validated" : ""}`} onSubmit={handleSubmit} encType="multipart/form-data" noValidate>
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
            {/* Office/Requestor */}
            <div className="col-md-6">
              <label className="form-label">Office/ Requestor *</label>
              <input
                className="form-control"
                name="office_requestor"
                value={formData.office_requestor}
                onChange={handleChange}
                required
              />
              <div className="invalid-feedback">Office/Requestor is required.</div>
            </div>
            {/* Description */}
            <div className="col-12">
              <label className="form-label">Title and Description *</label>
              <textarea className="form-control" name="description" rows={2} value={formData.description} onChange={handleChange} required></textarea>
              <div className="invalid-feedback">Description is required.</div>
            </div>
            {/* Source */} {/* Concerned Personnel */}
            <div className="col-md-6">
              <label className="form-label">Concerned Personnel *</label>
              <input
                className="form-control"
                name="concerned_personnel"
                value={formData.concerned_personnel}
                onChange={handleChange}
                required
              />
              <div className="invalid-feedback">This field is required.</div>
            </div>
            <AutocompleteInput label="Destination Office" name="destination_office" value={formData.destination_office} onChange={handleChange} options={DESTINATION_OFFICES} placeholder="Select Destination" />

            <AutocompleteInput label="Classification" name="classification" value={formData.classification} onChange={handleChange} options={CLASSIFICATION_OPTIONS} placeholder="e.g., Academic" />
            <AutocompleteInput label="Priority" name="priority" value={formData.priority} onChange={handleChange} options={PRIORITY_OPTIONS} placeholder="e.g., Normal" />
{/* Retention Period */}
            <div className="col-md-6">
              <label className="form-label">Retention Period *</label>
              <Select
                options={RETENTION_OPTIONS}
                onChange={handleRetentionChange}
                value={RETENTION_OPTIONS.find(option => option.value === formData.retention_period)}
                placeholder="Select Retention Period"
                isSearchable
                required
              />
            </div>

            {/* Attachments */}
            <div className="col-12">
              <input ref={fileInputRef} type="file" multiple className="d-none" onChange={handleFilesChange} accept="application/pdf" />
              <div style={dropStyle} onClick={openFileDialog} onDragOver={onDragOver} onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDrop={onDrop}>
                <div className="mb-1 fw-semibold">Drag & drop files here or click to browse</div>
                <div className="text-muted small">At least one PDF file required</div>
              </div>
              {filesError && <div className="invalid-feedback d-block">{filesError}</div>}
              {files.length > 0 && (
                <ul className="list-unstyled mt-2">
                  {files.map((f, idx) => (
                    <li key={mapKey(f)} className="d-flex justify-content-between align-items-center">
                      <span>{f.name} ({Math.round(f.size / 1024)} KB)</span>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeFile(idx)}>Remove</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
{/* {showQR && createdCN && (
  <div>
    <QRCodeCanvas value={createdCN} size={256} />
    <a href={`/uploads/${createdCN}.png`} download>
      <button>Download QR Code</button>
    </a>
  </div>
)} */}
            {/* Upload progress */}
            {saving && uploadPct > 0 && (
              <div className="col-12">
                <div className="progress">
                  <div className="progress-bar" style={{ width: `${uploadPct}%` }}>{uploadPct}%</div>
                </div>   
              </div>
            )}

            {/* Submit */}
            <div className="col-12 d-flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Create Record"}</button>
              <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => window.history.back()}>Cancel</button>
            </div>
          </form>
           {/* Modal to show QR Code */}
      {showQR && createdCN && (
        <div className="qr-popup show">
          <span className="close-btn" onClick={closePopup}>&times;</span>
          <h5>Generated QR Code</h5>
          <br></br>
          <QRCodeCanvas value={createdCN} size={256} />
          <a href={`/uploads/${createdCN}.png`} download>
          <br/>
          <br/>
            <button>Download QR Code</button>
          </a>
        </div>
      )}

      
        </div>
      </div>
    </div>
  );
}






// import React, { useState, useRef } from "react";
// import "./CreateRecordForm.css";
// import Sidebar from "./Sidebar";
// import Navbar from "./Navbar";
// import axios from "./axios";
// import { QRCodeCanvas } from "qrcode.react";
// import Select from "react-select"; // Import react-select

// const CLASSIFICATION_OPTIONS = ["Academic", "Administrative", "Financial", "HR", "Others"];
// const PRIORITY_OPTIONS = ["Normal", "Urgent", "Immediate"];
// const ORIGIN_OPTIONS = ["Internal", "External"]; // Document type options
// const RETENTION_OPTIONS = [
//   { label: "1 Year", value: "1 Year" },
//   { label: "2 Years", value: "2 Years" },
//   { label: "3 Years", value: "3 Years" },
//   { label: "4 Years", value: "4 Years" },
//   { label: "5 Years", value: "5 Years" },
//   { label: "6 Years", value: "6 Years" },
//   { label: "7 Years", value: "7 Years" },
//   { label: "8 Years", value: "8 Years" },
//   { label: "9 Years", value: "9 Years" },
//   { label: "10 Years", value: "10 Years" },
//   { label: "Permanent", value: "Permanent" },
// ];
// const DESTINATION_OFFICES = [
//   "Accounting Office",
//   "Cashier",
//   "Supply Office",
//   "Office of the Budget Officer",
//   "Office of the Chief Administrative Officer- Finance",
//   "PACD",
//   "Marketing",
//   "Office of the Planning Officer",
//   "Office of the Campus Administrator",
//   "Legal Office",
//   "Quality and Assurance Office",
//   "Registrar Office",
//   "Office of the Vice President - Admin and Finance",
//   "Office of the Board Secretary",
//   "Office of the President",
//   "Office of the Alumni",
//   "Human Resource Office",
//   "International Relations Office",
//   "General Servicing Unit",
//   "Planning Management Unit",
//   "Information Technology Office",
//   "Information Office",
//   "Procurement Office",
//   "Office of the Supervising Administrative Officer",
// ];

// // Reusable autocomplete input
// function AutocompleteInput({ id, label, name, value, onChange, options, required = true, placeholder }) {
//   const listId = `${id || name}-list`;
//   const normalizeOnBlur = () => {
//     if (!value) return;
//     const hit = options.find(opt => opt.toLowerCase() === value.trim().toLowerCase());
//     if (hit && hit !== value) onChange({ target: { name, value: hit } });
//   };
//   return (
//     <div className="col-md-6">
//       <label className="form-label">{label}{required ? " *" : ""}</label>
//       <input
//         className="form-control"
//         name={name}
//         list={listId}
//         value={value}
//         onChange={onChange}
//         onBlur={normalizeOnBlur}
//         required={required}
//         placeholder={placeholder}
//         autoComplete="off"
//       />
//       <datalist id={listId}>
//         {options.map(opt => <option key={opt} value={opt} />)}
//       </datalist>
//       {required && <div className="invalid-feedback">This field is required.</div>}
//     </div>
//   );
// }
// import React, { useState, useRef } from "react";
// import { QRCodeCanvas } from "qrcode.react"; // Correct import
// import "./CreateRecordForm.css";
// import Sidebar from "./Sidebar";
// import Navbar from "./Navbar";
// import axios from "./axios";
// import Select from "react-select"; // Import react-select

// // Constants for form options
// const CLASSIFICATION_OPTIONS = ["Academic", "Administrative", "Financial", "HR", "Others"];
// const PRIORITY_OPTIONS = ["Normal", "Urgent", "Immediate"];
// const ORIGIN_OPTIONS = ["Internal", "External"]; // Document type options
// const RETENTION_OPTIONS = [
//   { label: "1 Year", value: "1 Year" },
//   { label: "2 Years", value: "2 Years" },
//   { label: "3 Years", value: "3 Years" },
//   { label: "4 Years", value: "4 Years" },
//   { label: "5 Years", value: "5 Years" },
//   { label: "6 Years", value: "6 Years" },
//   { label: "7 Years", value: "7 Years" },
//   { label: "8 Years", value: "8 Years" },
//   { label: "9 Years", value: "9 Years" },
//   { label: "10 Years", value: "10 Years" },
//   { label: "Permanent", value: "Permanent" },
// ];
// const DESTINATION_OFFICES = [
//   "Accounting Office",
//   "Cashier",
//   "Supply Office",
//   "Office of the Budget Officer",
//   "Office of the Chief Administrative Officer- Finance",
//   "PACD",
//   "Marketing",
//   "Office of the Planning Officer",
//   "Office of the Campus Administrator",
//   "Legal Office",
//   "Quality and Assurance Office",
//   "Registrar Office",
//   "Office of the Vice President - Admin and Finance",
//   "Office of the Board Secretary",
//   "Office of the President",
//   "Office of the Alumni",
//   "Human Resource Office",
//   "International Relations Office",
//   "General Servicing Unit",
//   "Planning Management Unit",
//   "Information Technology Office",
//   "Information Office",
//   "Procurement Office",
//   "Office of the Supervising Administrative Officer",
// ];

// // Autocomplete input component for form fields
// function AutocompleteInput({ id, label, name, value, onChange, options, required = true, placeholder }) {
//   const listId = `${id || name}-list`;
//   const normalizeOnBlur = () => {
//     if (!value) return;
//     const hit = options.find(opt => opt.toLowerCase() === value.trim().toLowerCase());
//     if (hit && hit !== value) onChange({ target: { name, value: hit } });
//   };

//   return (
//     <div className="col-md-6">
//       <label className="form-label">{label}{required ? " *" : ""}</label>
//       <input
//         className="form-control"
//         name={name}
//         list={listId}
//         value={value}
//         onChange={onChange}
//         onBlur={normalizeOnBlur}
//         required={required}
//         placeholder={placeholder}
//         autoComplete="off"
//       />
//       <datalist id={listId}>
//         {options.map(opt => <option key={opt} value={opt} />)}
//       </datalist>
//       {required && <div className="invalid-feedback">This field is required.</div>}
//     </div>
//   );
// }

// export default function CreateRecordForm() {
//   const [formData, setFormData] = useState({
//     control_number: "",
//     office_requestor: "",
//     classification: "",
//     priority: "",
//     description: "",
//     concerned_personnel: "",
//     retention_period: "",
//     destination_office: "",
//     record_origin: "", // Will hold the document type value
//   });

//   const [activeOrigin, setActiveOrigin] = useState("");
//   const [files, setFiles] = useState([]);
//   const [uploadPct, setUploadPct] = useState(0);
//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState(null);
//   const [validated, setValidated] = useState(false);
//   const [filesError, setFilesError] = useState("");
//   const [showQR, setShowQR] = useState(false); // Added state to control QR display
//   const [createdCN, setCreatedCN] = useState(""); // Store the created control number
//   const formRef = useRef(null);
//   const fileInputRef = useRef(null);
//   const [dragActive, setDragActive] = useState(false);
//   const [modalVisible, setModalVisible] = useState(false); // For controlling modal visibility
//   const [qrCodeDataUrl, setQrCodeDataUrl] = useState(""); // Store QR code as a data URL for downloading
  
//   // Handle file download
//   const handleDownloadQRCode = () => {
//     const link = document.createElement("a");
//     link.href = qrCodeDataUrl; // Using the generated QR code's data URL
//     link.download = `${createdCN}-QRCode.png`;
//     link.click();
//   };

//   // Handle origin type change (Internal/External)
//   const handleOriginSwitch = (origin) => {
//     setActiveOrigin(origin);
//     setFormData((s) => ({ ...s, record_origin: origin }));
//   };

//   // Handle form input changes
//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData(s => ({ ...s, [name]: value }));
//   };

//   // Handling file uploads and file validation
//   const mapKey = (f) => `${f.name}__${f.size}__${f.lastModified}`;
//   const addFiles = (incomingList) => {
//     const incoming = Array.from(incomingList || []);
//     if (!incoming.length) return;
//     const cur = new Map(files.map(f => [mapKey(f), f]));
//     for (const f of incoming) cur.set(mapKey(f), f);
//     setFiles(Array.from(cur.values()));
//     setFilesError("");
//   };
  
//   const handleFilesChange = (e) => { 
//     addFiles(e.target.files); 
//     e.target.value = ""; 
//   };

//   const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

//   const onDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); };
//   const onDragEnter = onDragOver;
//   const onDragLeave = (e) => { if (e.currentTarget.contains(e.relatedTarget)) return; setDragActive(false); };
//   const onDrop = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); addFiles(e.dataTransfer.files); };
//   const openFileDialog = () => fileInputRef.current?.click();

//   const ensureInList = (value, list) => list.some(opt => opt.toLowerCase() === value.trim().toLowerCase());
  
//   // Handle retention period change (from react-select)
//   const handleRetentionChange = (selectedOption) => {
//     setFormData((prevState) => ({
//       ...prevState,
//       retention_period: selectedOption ? selectedOption.value : ""
//     }));
//   };

//   // Validate PDF files before submitting
//   const validateFiles = () => {
//     for (const file of files) {
//       if (file.type !== "application/pdf") {
//         setFilesError("Only PDF files are allowed.");
//         return false;
//       }
//     }
//     setFilesError("");  // Clear previous error if validation passes
//     return true;
//   };

//   // Handle form submission
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError(null);
//     setFilesError("");

//     const formEl = formRef.current;
//     if (!(formEl?.checkValidity?.() ?? true)) {
//       setValidated(true);
//       return;
//     }
//     if (files.length === 0) {
//       setFilesError("Please attach at least one file.");
//       setValidated(true);
//       return;
//     }

//     if (!validateFiles()) return;

//     const retentionPeriodNumber = parseInt(formData.retention_period.split(" ")[0], 10);
    
//     if (isNaN(retentionPeriodNumber)) {
//       setError("Invalid retention period.");
//       return;
//     }

//     setSaving(true);
//     setUploadPct(0);

//     try {
//       const fd = new FormData();
//       Object.entries(formData).forEach(([k, v]) => {
//         if (k === "retention_period") {
//           fd.append(k, retentionPeriodNumber); // Store numeric retention period
//         } else {
//           fd.append(k, v);
//         }
//       });

//       for (const f of files) {
//         fd.append("files", f); // Ensure the 'files' key matches what your backend expects
//       }

//       const response = await axios.post("http://localhost:8081/records", fd, {
//         headers: { "Content-Type": "multipart/form-data" },
//         onUploadProgress: (evt) => {
//           if (evt.total) setUploadPct(Math.round((evt.loaded * 100) / evt.total));
//         },
//       });

//       const cn = response.data.control_number || formData.control_number;
//       setCreatedCN(cn);
//       setShowQR(true); // Show QR code after successful creation
//       setModalVisible(true); // Show modal with QR code

//       const qrCodeData = await new Promise((resolve) => {
//         const canvas = document.createElement("canvas");
//         QRCodeCanvas({ value: cn, size: 256, canvas });
//         resolve(canvas.toDataURL()); // Get Base64 image of QR code
//       });

//       setQrCodeDataUrl(qrCodeData); // Store data URL for downloading the QR code

//       // Reset form and states
//       setFormData({
//         control_number: "",
//         office_requestor: "",
//         classification: "",
//         priority: "",
//         description: "",
//         concerned_personnel: "",
//         retention_period: "",
//         destination_office: "",
//         record_origin: "",
//       });
//       setFiles([]);
//       setUploadPct(0);
//       setValidated(false);
//       setFilesError("");
//     } catch (err) {
//       console.error("Error during record creation:", err);
//       setError(
//         err?.response?.data?.error || "Failed to create record. Please try again later."
//       );
//     } finally {
//       setSaving(false);
//     }
//   };

//   const dropStyle = {
//     border: `2px dashed ${filesError ? "#dc3545" : "#999"}`,
//     borderRadius: 12,
//     padding: 16,
//     textAlign: "center",
//     cursor: "pointer",
//     background: dragActive ? "rgba(0,123,255,0.08)" : "#fafafa",
//     transition: "background 120ms ease",
//   };
//   return (
//     <div className="d-flex">
//       <Sidebar />
//       <div className="flex-grow-1">
//         <Navbar />
//         <div className="container p-3">
//           <h2>Create New Record</h2>
//           {error && <div className="alert alert-danger">{error}</div>}

//           <div className="mb-3 d-flex gap-2">
//             {ORIGIN_OPTIONS.map(opt => (
//               <button key={opt} type="button" onClick={() => handleOriginSwitch(opt)}
//                 className={`btn ${activeOrigin === opt ? "btn-primary" : "btn-outline-primary"}`}>{opt}</button>
//             ))}
//           </div>

//           <form ref={formRef} className={`row g-3 ${validated ? "was-validated" : ""}`} onSubmit={handleSubmit} encType="multipart/form-data" noValidate>
//             {/* Control No */}
//             <div className="col-md-6">
//               <label className="form-label">Control No. *</label>
//               <input
//                 className="form-control"
//                 name="control_number"
//                 pattern="[A-Za-z0-9._\-\/]+" 
//                 value={formData.control_number}
//                 onChange={handleChange}
//                 placeholder="e.g., 2025-09-001"
//                 required
//                 autoComplete="off"
//               />
//               <div className="invalid-feedback">Control number is required.</div>
//               <div className="form-text">Letters, numbers, -, _, /, . allowed</div>
//             </div>
//             {/* Office/Requestor */}
//             <div className="col-md-6">
//               <label className="form-label">Office/ Requestor *</label>
//               <input
//                 className="form-control"
//                 name="office_requestor"
//                 value={formData.office_requestor}
//                 onChange={handleChange}
//                 required
//               />
//               <div className="invalid-feedback">Office/Requestor is required.</div>
//             </div>
//             {/* Description */}
//             <div className="col-12">
//               <label className="form-label">Title and Description *</label>
//               <textarea className="form-control" name="description" rows={2} value={formData.description} onChange={handleChange} required></textarea>
//               <div className="invalid-feedback">Description is required.</div>
//             </div>
//             {/* Source */} {/* Concerned Personnel */}
//             <div className="col-md-6">
//               <label className="form-label">Concerned Personnel *</label>
//               <input
//                 className="form-control"
//                 name="concerned_personnel"
//                 value={formData.concerned_personnel}
//                 onChange={handleChange}
//                 required
//               />
//               <div className="invalid-feedback">This field is required.</div>
//             </div>
//             <AutocompleteInput label="Destination Office" name="destination_office" value={formData.destination_office} onChange={handleChange} options={DESTINATION_OFFICES} placeholder="Select Destination" />

//             <AutocompleteInput label="Classification" name="classification" value={formData.classification} onChange={handleChange} options={CLASSIFICATION_OPTIONS} placeholder="e.g., Academic" />
//             <AutocompleteInput label="Priority" name="priority" value={formData.priority} onChange={handleChange} options={PRIORITY_OPTIONS} placeholder="e.g., Normal" />
// {/* Retention Period */}
//             <div className="col-md-6">
//               <label className="form-label">Retention Period *</label>
//               <Select
//                 options={RETENTION_OPTIONS}
//                 onChange={handleRetentionChange}
//                 value={RETENTION_OPTIONS.find(option => option.value === formData.retention_period)}
//                 placeholder="Select Retention Period"
//                 isSearchable
//                 required
//               />
//             </div>

//             {/* Attachments */}
//             <div className="col-12">
//               <input ref={fileInputRef} type="file" multiple className="d-none" onChange={handleFilesChange} accept="application/pdf" />
//               <div style={dropStyle} onClick={openFileDialog} onDragOver={onDragOver} onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDrop={onDrop}>
//                 <div className="mb-1 fw-semibold">Drag & drop files here or click to browse</div>
//                 <div className="text-muted small">At least one PDF file required</div>
//               </div>
//               {filesError && <div className="invalid-feedback d-block">{filesError}</div>}
//               {files.length > 0 && (
//                 <ul className="list-unstyled mt-2">
//                   {files.map((f, idx) => (
//                     <li key={mapKey(f)} className="d-flex justify-content-between align-items-center">
//                       <span>{f.name} ({Math.round(f.size / 1024)} KB)</span>
//                       <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeFile(idx)}>Remove</button>
//                     </li>
//                   ))}
//                 </ul>
//               )}
//             </div>

//             {/* Upload progress */}
//             {saving && uploadPct > 0 && (
//               <div className="col-12">
//                 <div className="progress">
//                   <div className="progress-bar" style={{ width: `${uploadPct}%` }}>{uploadPct}%</div>
//                 </div>   
//               </div>
//             )}

//             {/* Submit */}
//             <div className="col-12 d-flex gap-2">
//               <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Create Record"}</button>
//               <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => window.history.back()}>Cancel</button>
//             </div>
//           </form>

//           {/* QR Code */}
//           {/* {showQR && (
//             <div className="qr-code-container mt-4">
//               <h4>QR Code for Control Number: {createdCN}</h4>
//               <QRCodeCanvas value={createdCN} size={256} />
//             </div>
//           )} */}
//          {/* QR Code Modal */}
//          {modalVisible && (
//             <div className="modal">
//               <div className="modal-content">
//                 <h4>QR Code for Control Number: {createdCN}</h4>
//                 <QRCodeCanvas value={createdCN} size={256} />
//                 <div className="button-container">
//                   <button onClick={handleDownloadQRCode}>Download QR Code</button>
//                   <button onClick={() => setModalVisible(false)}>Close</button>
//                 </div>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }













// import React, { useState, useRef } from "react";
// import { QRCodeCanvas } from "qrcode.react"; // Correct import
// import "./CreateRecordForm.css";
// import Sidebar from "./Sidebar";
// import Navbar from "./Navbar";
// import axios from "./axios";
// import Select from "react-select"; // Import react-select
// import "./CreateRecordForm.css"
// // Constants for form options
// const CLASSIFICATION_OPTIONS = ["Academic", "Administrative", "Financial", "HR", "Others"];
// const PRIORITY_OPTIONS = ["Normal", "Urgent", "Immediate"];
// const ORIGIN_OPTIONS = ["Internal", "External"];
// const RETENTION_OPTIONS = [
//   { label: "1 Year", value: "1 Year" },
//   { label: "2 Years", value: "2 Years" },
//   { label: "3 Years", value: "3 Years" },
//   { label: "4 Years", value: "4 Years" },
//   { label: "5 Years", value: "5 Years" },
//   { label: "6 Years", value: "6 Years" },
//   { label: "7 Years", value: "7 Years" },
//   { label: "8 Years", value: "8 Years" },
//   { label: "9 Years", value: "9 Years" },
//   { label: "10 Years", value: "10 Years" },
//   { label: "Permanent", value: "Permanent" },
// ];
// const DESTINATION_OFFICES = [
//   "Accounting Office", "Cashier", "Supply Office", "Office of the Budget Officer",
//   "Office of the Chief Administrative Officer- Finance", "PACD", "Marketing", "Office of the Planning Officer",
//   "Office of the Campus Administrator", "Legal Office", "Quality and Assurance Office", "Registrar Office",
//   "Office of the Vice President - Admin and Finance", "Office of the Board Secretary", "Office of the President",
//   "Office of the Alumni", "Human Resource Office", "International Relations Office", "General Servicing Unit",
//   "Planning Management Unit", "Information Technology Office", "Information Office", "Procurement Office",
//   "Office of the Supervising Administrative Officer"
// ];

// // Autocomplete input component for form fields
// function AutocompleteInput({ id, label, name, value, onChange, options, required = true, placeholder }) {
//   const listId = `${id || name}-list`;
//   const normalizeOnBlur = () => {
//     if (!value) return;
//     const hit = options.find(opt => opt.toLowerCase() === value.trim().toLowerCase());
//     if (hit && hit !== value) onChange({ target: { name, value: hit } });
//   };

//   return (
//     <div className="col-md-6">
//       <label className="form-label">{label}{required ? " *" : ""}</label>
//       <input
//         className="form-control"
//         name={name}
//         list={listId}
//         value={value}
//         onChange={onChange}
//         onBlur={normalizeOnBlur}
//         required={required}
//         placeholder={placeholder}
//         autoComplete="off"
//       />
//       <datalist id={listId}>
//         {options.map(opt => <option key={opt} value={opt} />)}
//       </datalist>
//       {required && <div className="invalid-feedback">This field is required.</div>}
//     </div>
//   );
// }

// export default function CreateRecordForm() {
//   const [formData, setFormData] = useState({
//     control_number: "",
//     office_requestor: "",
//     classification: "",
//     priority: "",
//     description: "",
//     concerned_personnel: "",
//     retention_period: "",
//     destination_office: "",
//     record_origin: "",
//   });

//   const [activeOrigin, setActiveOrigin] = useState("");
//   const [files, setFiles] = useState([]);
//   const [uploadPct, setUploadPct] = useState(0);
//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState(null);
//   const [validated, setValidated] = useState(false);
//   const [filesError, setFilesError] = useState("");
//   const [showQR, setShowQR] = useState(false); // Added state to control QR display
//   const [createdCN, setCreatedCN] = useState(""); // Store the created control number
//   const formRef = useRef(null);
//   const fileInputRef = useRef(null);
//   const [dragActive, setDragActive] = useState(false);
//   const [modalVisible, setModalVisible] = useState(false); // For controlling modal visibility
//   const [qrCodeDataUrl, setQrCodeDataUrl] = useState(""); // Store QR code as a data URL for downloading
  
//   // Handle file download
//   const handleDownloadQRCode = () => {
//     const link = document.createElement("a");
//     link.href = qrCodeDataUrl; // Using the generated QR code's data URL
//     link.download = `${createdCN}-QRCode.png`;
//     link.click();
//   };

//   // Handle origin type change (Internal/External)
//   const handleOriginSwitch = (origin) => {
//     setActiveOrigin(origin);
//     setFormData((s) => ({ ...s, record_origin: origin }));
//   };

//   // Handle form input changes
//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData(s => ({ ...s, [name]: value }));
//   };

//   // Handling file uploads and file validation
//   const mapKey = (f) => `${f.name}__${f.size}__${f.lastModified}`;
//   const addFiles = (incomingList) => {
//     const incoming = Array.from(incomingList || []);
//     if (!incoming.length) return;
//     const cur = new Map(files.map(f => [mapKey(f), f]));
//     for (const f of incoming) cur.set(mapKey(f), f);
//     setFiles(Array.from(cur.values()));
//     setFilesError("");
//   };

//   const handleFilesChange = (e) => { 
//     addFiles(e.target.files); 
//     e.target.value = ""; 
//   };

//   const removeFile = (idx) => setFiles(prev => prev.filter((_, i) => i !== idx));

//   const onDragOver = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); };
//   const onDragEnter = onDragOver;
//   const onDragLeave = (e) => { if (e.currentTarget.contains(e.relatedTarget)) return; setDragActive(false); };
//   const onDrop = (e) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); addFiles(e.dataTransfer.files); };
//   const openFileDialog = () => fileInputRef.current?.click();

//   const ensureInList = (value, list) => list.some(opt => opt.toLowerCase() === value.trim().toLowerCase());

//   // Handle retention period change (from react-select)
//   const handleRetentionChange = (selectedOption) => {
//     setFormData((prevState) => ({
//       ...prevState,
//       retention_period: selectedOption ? selectedOption.value : ""
//     }));
//   };

//   // Validate PDF files before submitting
//   const validateFiles = () => {
//     for (const file of files) {
//       if (file.type !== "application/pdf") {
//         setFilesError("Only PDF files are allowed.");
//         return false;
//       }
//     }
//     setFilesError("");  // Clear previous error if validation passes
//     return true;
//   };

//   // Handle form submission
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError(null);
//     setFilesError("");

//     const formEl = formRef.current;
//     if (!(formEl?.checkValidity?.() ?? true)) {
//       setValidated(true);
//       return;
//     }
//     if (files.length === 0) {
//       setFilesError("Please attach at least one file.");
//       setValidated(true);
//       return;
//     }

//     if (!validateFiles()) return;

//     const retentionPeriodNumber = parseInt(formData.retention_period.split(" ")[0], 10);

//     if (isNaN(retentionPeriodNumber)) {
//       setError("Invalid retention period.");
//       return;
//     }

//     setSaving(true);
//     setUploadPct(0);

//     try {
//       const fd = new FormData();
//       Object.entries(formData).forEach(([k, v]) => {
//         if (k === "retention_period") {
//           fd.append(k, retentionPeriodNumber); // Store numeric retention period
//         } else {
//           fd.append(k, v);
//         }
//       });

//       for (const f of files) {
//         fd.append("files", f); // Ensure the 'files' key matches what your backend expects
//       }

//       const response = await axios.post("http://localhost:8081/records", fd, {
//         headers: { "Content-Type": "multipart/form-data" },
//         onUploadProgress: (evt) => {
//           if (evt.total) setUploadPct(Math.round((evt.loaded * 100) / evt.total));
//         },
//       });

//       const cn = response.data.control_number || formData.control_number;
//       setCreatedCN(cn); // Save control number
//       setQrCodeDataUrl(""); // Clear previous QR code data URL before generating new one
//       setModalVisible(true); // Show modal with success message

//     } catch (err) {
//       console.error("Error during record creation:", err);
//       setError(
//         err?.response?.data?.error || "Failed to create record. Please try again later."
//       );
//     } finally {
//       setSaving(false);
//     }
//   };

//   return (
//     <div className="d-flex">
//       <Sidebar />
//       <div className="flex-grow-1">
//         <Navbar />
//         <div className="container p-3">
//           <h2>Create New Record</h2>
//           {error && <div className="alert alert-danger">{error}</div>}

//           <form ref={formRef} className={`row g-3 ${validated ? "was-validated" : ""}`} onSubmit={handleSubmit} encType="multipart/form-data" noValidate>
//             {/* Control No */}
//             <div className="col-md-6">
//               <label className="form-label">Control No. *</label>
//               <input
//                 className="form-control"
//                 name="control_number"
//                 pattern="[A-Za-z0-9._\-\/]+" 
//                 value={formData.control_number}
//                 onChange={handleChange}
//                 placeholder="e.g., 2025-09-001"
//                 required
//                 autoComplete="off"
//               />
//               <div className="invalid-feedback">Control number is required.</div>
//               <div className="form-text">Letters, numbers, -, _, /, . allowed</div>
//             </div>

//             {/* Office/Requestor */}
//             <div className="col-md-6">
//               <label className="form-label">Office/ Requestor *</label>
//               <input
//                 className="form-control"
//                 name="office_requestor"
//                 value={formData.office_requestor}
//                 onChange={handleChange}
//                 required
//               />
//               <div className="invalid-feedback">Office/Requestor is required.</div>
//             </div>

//             {/* Description */}
//             <div className="col-12">
//               <label className="form-label">Title and Description *</label>
//               <textarea className="form-control" name="description" rows={2} value={formData.description} onChange={handleChange} required></textarea>
//               <div className="invalid-feedback">Description is required.</div>
//             </div>

//             {/* Concerned Personnel */}
//             <div className="col-md-6">
//               <label className="form-label">Concerned Personnel *</label>
//               <input
//                 className="form-control"
//                 name="concerned_personnel"
//                 value={formData.concerned_personnel}
//                 onChange={handleChange}
//                 required
//               />
//               <div className="invalid-feedback">This field is required.</div>
//             </div>

//             {/* Autocomplete Inputs */}
//             <AutocompleteInput label="Destination Office" name="destination_office" value={formData.destination_office} onChange={handleChange} options={DESTINATION_OFFICES} placeholder="Select Destination" />
//             <AutocompleteInput label="Classification" name="classification" value={formData.classification} onChange={handleChange} options={CLASSIFICATION_OPTIONS} placeholder="e.g., Academic" />
//             <AutocompleteInput label="Priority" name="priority" value={formData.priority} onChange={handleChange} options={PRIORITY_OPTIONS} placeholder="e.g., Normal" />
            
//             {/* Retention Period */}
//             <div className="col-md-6">
//               <label className="form-label">Retention Period *</label>
//               <Select
//                 options={RETENTION_OPTIONS}
//                 onChange={handleRetentionChange}
//                 value={RETENTION_OPTIONS.find(option => option.value === formData.retention_period)}
//                 placeholder="Select Retention Period"
//                 isSearchable
//                 required
//               />
//             </div>

//             {/* Attachments */}
//             <div className="col-12">
//               <input ref={fileInputRef} type="file" multiple className="d-none" onChange={handleFilesChange} accept="application/pdf" />
//               <div style={{ border: `2px dashed ${filesError ? "#dc3545" : "#999"}`, borderRadius: 12, padding: 16, textAlign: "center", cursor: "pointer", background: dragActive ? "rgba(0,123,255,0.08)" : "#fafafa", transition: "background 120ms ease" }} onClick={openFileDialog} onDragOver={onDragOver} onDragEnter={onDragEnter} onDragLeave={onDragLeave} onDrop={onDrop}>
//                 <div className="mb-1 fw-semibold">Drag & drop files here or click to browse</div>
//                 <div className="text-muted small">At least one PDF file required</div>
//               </div>
//               {filesError && <div className="invalid-feedback d-block">{filesError}</div>}
//               {files.length > 0 && (
//                 <ul className="list-unstyled mt-2">
//                   {files.map((f, idx) => (
//                     <li key={mapKey(f)} className="d-flex justify-content-between align-items-center">
//                       <span>{f.name} ({Math.round(f.size / 1024)} KB)</span>
//                       <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeFile(idx)}>Remove</button>
//                     </li>
//                   ))}
//                 </ul>
//               )}
//             </div>

//             {/* Upload progress */}
//             {saving && uploadPct > 0 && (
//               <div className="col-12">
//                 <div className="progress">
//                   <div className="progress-bar" style={{ width: `${uploadPct}%` }}>{uploadPct}%</div>
//                 </div>
//               </div>
//             )}

//             {/* Submit */}
//             <div className="col-12 d-flex gap-2">
//               <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Create Record"}</button>
//               <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => window.history.back()}>Cancel</button>
//             </div>
//           </form>

         

//         </div>
//          {/* Success Modal */}
//           {modalVisible && (
//             <div className="modal">
//               <div className="modal-content">
//                 <h4>Record Created Successfully!</h4>
//                 <p>Your record has been successfully submitted.</p>
//                 {/* QR Code Generation is intact but not displayed for now */}
//                 <button onClick={() => setModalVisible(false)}>Close</button>
//               </div>
//             </div>
//           )}
//       </div>
//     </div>
//   );
// }
