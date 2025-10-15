import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import axios from "./axios";
import Select from "react-select";

// Options for select fields
const CLASSIFICATION_OPTIONS = ["Academic", "Administrative", "Financial", "HR", "Others"];
const PRIORITY_OPTIONS = ["Normal", "Urgent", "Immediate"];
const RETENTION_OPTIONS = [
  { label: "1 Year", value: "1" },
  { label: "2 Years", value: "2" },
  { label: "3 Years", value: "3" },
  { label: "4 Years", value: "4" },
  { label: "5 Years", value: "5" },
  { label: "6 Years", value: "6" },
  { label: "7 Years", value: "7" },
  { label: "8 Years", value: "8" },
  { label: "9 Years", value: "9" },
  { label: "10 Years", value: "10" },
  { label: "Permanent", value: "Permanent" },
];

const DESTINATION_OFFICES = [
  "Accounting Office", "Cashier", "Supply Office", "Office of the Budget Officer",
  "Office of the Chief Administrative Officer- Finance", "PACD", "Marketing",
  "Office of the Planning Officer", "Office of the Campus Administrator", "Legal Office",
  "Quality and Assurance Office", "Registrar Office",
  "Office of the Vice President - Admin and Finance", "Office of the Board Secretary",
  "Office of the President", "Office of the Alumni", "Human Resource Office",
  "International Relations Office", "General Servicing Unit", "Planning Management Unit",
  "Information Technology Office", "Information Office", "Procurement Office",
  "Office of the Supervising Administrative Officer",
];

// Autocomplete input component for options
function AutocompleteInput({ label, name, value, onChange, options, required = true, placeholder }) {
  const listId = `${name}-list`;

  const normalizeOnBlur = () => {
    if (!value) return;
    const hit = options.find((opt) => opt.toLowerCase() === value.trim().toLowerCase());
    if (hit && hit !== value) onChange({ target: { name, value: hit } });
  };

  return (
    <div className="col-md-6">
      <label className="form-label">
        {label}
        {required ? " *" : ""}
      </label>
      <input
        className="form-control"
        name={name}
        list={listId}
        value={value ?? ""}
        onBlur={normalizeOnBlur}
        onChange={onChange}
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
    </div>
  );
}

export default function EditRecord() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [validated, setValidated] = useState(false);

  // Initialize formData with empty or default values
  const [formData, setFormData] = useState({
    control_number: "",
    office_requestor: "",
    description: "",
    concerned_personnel: "",
    retention_period: "",
    destination_office: "",
    classification: "",
    priority: "",
    record_origin: "internal",
  });

  // Handle form field changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevState) => ({ ...prevState, [name]: value }));
  };

  // Load record data for editing
  useEffect(() => {
    const loadRecord = async () => {
      setError(null);
      setLoading(true);
      try {
        const res = await axios.get(`/records/${id}`);
        const record = res.data;

        const retentionPeriod = record.retention_period ? String(record.retention_period) : "1";

        setFormData({
          ...record,
          retention_period: retentionPeriod,
          record_origin: record.record_origin || "internal",
        });
      } catch (e) {
        console.error(e);
        setError("Failed to load record");
      } finally {
        setLoading(false);
      }
    };
    loadRecord();
  }, [id]);

  // Handle form submission
// const handleSubmit = async (e) => {
//   e.preventDefault();
//   setError(null);
//   setValidated(true);
//   const formEl = e.currentTarget;

//   // Validate the form before submission
//   if (formEl.checkValidity() === false) return;

//   // Ensure retention_period is provided
//   if (!formData.retention_period) {
//    setError(`Failed to update record: ${e.response?.data?.error || e.message}`);
//     return;
//   }

//   // Format retention_period if necessary
//   // const formattedRetentionPeriod = formData.retention_period === "Permanent" ? "Permanent" : formData.retention_period;
// const formattedRetentionPeriod = formData.retention_period === "Permanent" 
//   ? "Permanent" 
//   : `${formData.retention_period} Years`; // Ensure it's formatted correctly

//   setSaving(true);
//   try {
//     const payload = {
//       control_number: formData.control_number,
//       office_requestor: formData.office_requestor,
//       description: formData.description,
//       concerned_personnel: formData.concerned_personnel,
//       retention_period: formattedRetentionPeriod,  // Send either the formatted string or the raw value
//       destination_office: formData.destination_office,
//       classification: formData.classification,
//       priority: formData.priority,
//       record_origin: formData.record_origin || "internal",
//     };

//     console.log("Payload being sent:", payload); // Debug log for payload
// console.log("Form data being sent:", formData);
//     // Send PUT request to update the record
//     await axios.put(`/records/${id}`, payload);
//     alert("Record updated.");
//     navigate(-1); // Go back to the previous page
//   } catch (e) {
//     console.error("Error during record update:", e.response?.data || e.message);
//     setError("Failed to update record");
//   } finally {
//     setSaving(false);
//   }
// };
const handleSubmit = async (e) => {
  e.preventDefault();
  setError(null);
  setValidated(true);
  const formEl = e.currentTarget;

  // Validate the form before submission
  if (formEl.checkValidity() === false) return;

  // Ensure all fields are populated
  const requiredFields = ["control_number", "office_requestor", "description", "concerned_personnel", "retention_period", "destination_office", "classification", "priority"];
  for (const field of requiredFields) {
    if (!formData[field]) {
      setError(`${field} is required.`);
      return;
    }
  }

  // Format retention_period if necessary
  // const formattedRetentionPeriod = formData.retention_period === "Permanent" ? "Permanent" : formData.retention_period;
const formattedRetentionPeriod = formData.retention_period === "Permanent" 
  ? "Permanent" 
  : `${formData.retention_period} Years`;

  setSaving(true);
  try {
    const payload = {
      control_number: formData.control_number,
      office_requestor: formData.office_requestor,
      description: formData.description,
      concerned_personnel: formData.concerned_personnel,
      retention_period: formattedRetentionPeriod,
      destination_office: formData.destination_office,
      classification: formData.classification,
      priority: formData.priority,
      record_origin: formData.record_origin || "internal",
    };

    console.log("Payload being sent:", payload); // Debug log for payload

    // Send PUT request to update the record
    await axios.put(`/records/${id}`, payload);
    alert("Record updated.");
    navigate(-1); // Go back to the previous page
  } catch (e) {
    console.error("Error during record update:", e.response?.data || e.message);
    setError("Failed to update record");
  } finally {
    setSaving(false);
  }
};

  return (
    <div className="d-flex">
      <Sidebar />
      <div className="flex-grow-1">
        <Navbar />
        <div className="container p-3">
          <h2>Edit Record</h2>
          {error && <div className="alert alert-danger">{error}</div>}

          <form className={`row g-3 ${validated ? "was-validated" : ""}`} onSubmit={handleSubmit} noValidate>
            {/* Control No */}
            <div className="col-md-6">
              <label className="form-label">Control No. *</label>
              <input
                className="form-control"
                name="control_number"
                value={formData.control_number}
                onChange={handleChange}
                disabled
                required
                placeholder="e.g., 2025-09-001"
              />
              <div className="invalid-feedback">Control number is required.</div>
              <div className="form-text">Letters, numbers, -, _, /, . allowed</div>
            </div>

            {/* Office / Requestor */}
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

            {/* Concerned Personnel */}
            <div className="col-md-6">
              <label className="form-label">Concerned Personnel *</label>
              <input
                className="form-control"
                name="concerned_personnel"
                value={formData.concerned_personnel}
                onChange={handleChange}
                required
              />
              <div className="invalid-feedback">Concerned Personnel is required.</div>
            </div>

            {/* Description */}
            <div className="col-12">
              <label className="form-label">Title and Description *</label>
              <textarea
                className="form-control"
                name="description"
                rows={3}
                value={formData.description}
                onChange={handleChange}
                required
                placeholder="Provide title and description"
              />
              <div className="invalid-feedback">Title and Description are required.</div>
            </div>

            {/* Destination Office */}
            <AutocompleteInput
              label="Destination Office"
              name="destination_office"
              value={formData.destination_office}
              onChange={handleChange}
              options={DESTINATION_OFFICES}
              placeholder="e.g., Accounting Office"
            />

            {/* Classification */}
            <AutocompleteInput
              label="Classification"
              name="classification"
              value={formData.classification}
              onChange={handleChange}
              options={CLASSIFICATION_OPTIONS}
              placeholder="e.g., Academic"
            />

            {/* Priority */}
            <AutocompleteInput
              label="Priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              options={PRIORITY_OPTIONS}
              placeholder="e.g., Normal"
            />

            {/* Retention Period */}
            <div className="col-md-6">
              <label className="form-label">Retention Period *</label>
              <Select
                options={RETENTION_OPTIONS}
                onChange={(option) =>
                  setFormData((prev) => ({ ...prev, retention_period: option?.value ?? "1" }))
                }
                value={RETENTION_OPTIONS.find((opt) => opt.value === formData.retention_period) || null}
                placeholder="Select Retention Period"
                isSearchable
              />
            </div>

            {/* Record Origin (read-only display) */}
            <div className="col-md-6">
              <label className="form-label">Record Origin</label>
              <input className="form-control" value={formData.record_origin} disabled />
            </div>

            {/* Buttons */}
            <div className="col-12 d-flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
