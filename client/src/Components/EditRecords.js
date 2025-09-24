// client/src/Components/EditRecord.js
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import axios from "./axios";

const CLASSIFICATION_OPTIONS = ["Academic","Administrative","Financial","HR","Others"];
const PRIORITY_OPTIONS = ["Low","Normal","High"];
const RETENTION_OPTIONS = ["1 Year","3 Years","5 Years","Permanent"];
const DESTINATION_OFFICES = [
  "Accounting Office","Cashier","supply office","Office of the Budget officer",
  "office of the Chief Administrative Officer- Finance","PACD","Marketing",
  "Office of the Planning Officer","Office of the Campus Administrator","Legal Office",
  "Quality and Assurance Office","Registrar office","Office of the Vice President - Admin and Finance",
  "Office of the Board Secretary","Office of the President","office of the Alumni",
  "Human Resource Office","International Relations Office","General Servicing Unit","Planning Management Unit",
  "Information Technology Office","Information Office","Procurement office","Office of the Supervising Administrative Officer",
];
const ORIGIN_OPTIONS = ["Internal","External"];

// Reusable input + datalist with auto-normalize on blur
function AutocompleteInput({ label, name, value, onChange, options, required = true, placeholder }) {
  const listId = `${name}-list`;
  const normalizeOnBlur = () => {
    if (!value) return;
    const hit = options.find(o => o.toLowerCase() === String(value).trim().toLowerCase());
    if (hit && hit !== value) onChange({ target: { name, value: hit } });
  };
  return (
    <div className="col-md-6">
      <label className="form-label">{label}{required ? " *" : ""}</label>
      <input
        className="form-control"
        name={name}
        list={listId}
        value={value || ""}
        onChange={onChange}
        onBlur={normalizeOnBlur}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
      />
      <datalist id={listId}>
        {options.map(o => <option key={o} value={o} />)}
      </datalist>
      {required && <div className="invalid-feedback">This field is required.</div>}
    </div>
  );
}

export default function EditRecords() {
  const { id } = useParams(); // can be numeric id or a control number (string)
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [validated, setValidated] = useState(false);

  // Numeric server id used for PUT
  const [apiId, setApiId] = useState(null);
  const [form, setForm] = useState({
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  // fetch record either by numeric id or by control number
  useEffect(() => {
    const load = async () => {
      setError(null);
      setLoading(true);
      try {
        let res;
        if (/^\d+$/.test(id)) {
          res = await axios.get(`/records/${id}`);
        } else {
          res = await axios.get(`/records/by-control/${encodeURIComponent(id)}`);
        }
        const r = res.data;
        setApiId(r.id);
        setForm({
          control_number: r.control_number || "",
          title: r.title || "",
          classification: r.classification || "",
          priority: r.priority || "Normal",
          description: r.description || "",
          source: r.source || "",
          retention_period: r.retention_period || "",
          destination_office: r.destination_office || "",
          record_origin: (r.record_origin || "internal").toLowerCase() === "external" ? "External" : "Internal",
        });
      } catch (e) {
        console.error(e);
        setError(
          e?.response?.data?.error ||
          e?.response?.data?.message ||
          "Failed to load record"
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const ensureInList = (value, list) =>
    list.some(o => o.toLowerCase() === String(value).trim().toLowerCase());

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setValidated(true);

    // native required validation
    const formEl = e.currentTarget;
    if (formEl?.checkValidity && !formEl.checkValidity()) {
      return; // browser will show invalid-feedback
    }

    // list validations (case-insensitive)
    if (!ensureInList(form.classification, CLASSIFICATION_OPTIONS)) {
      setError("Classification must match one of the suggestions.");
      return;
    }
    if (!ensureInList(form.priority, PRIORITY_OPTIONS)) {
      setError("Priority must be Low, Normal, or High.");
      return;
    }
    if (!ensureInList(form.retention_period, RETENTION_OPTIONS)) {
      setError("Retention must match one of the suggestions.");
      return;
    }
    if (!ensureInList(form.record_origin, ORIGIN_OPTIONS)) {
      setError("Record Origin must be Internal or External.");
      return;
    }
    if (!ensureInList(form.destination_office, DESTINATION_OFFICES)) {
      setError("Destination Office must match one of the suggestions.");
      return;
    }
    if (!apiId) {
      setError("This record has no numeric ID and cannot be updated.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        control_number: form.control_number,
        title: form.title,
        classification:
          CLASSIFICATION_OPTIONS.find(o => o.toLowerCase() === form.classification.toLowerCase()) || form.classification,
        priority:
          PRIORITY_OPTIONS.find(o => o.toLowerCase() === form.priority.toLowerCase()) || form.priority,
        description: form.description,
        source: form.source,
        retention_period:
          RETENTION_OPTIONS.find(o => o.toLowerCase() === form.retention_period.toLowerCase()) || form.retention_period,
        destination_office:
          DESTINATION_OFFICES.find(o => o.toLowerCase() === form.destination_office.toLowerCase()) || form.destination_office,
        record_origin: form.record_origin, // server normalizes to internal/external
      };

      await axios.put(`/records/${apiId}`, payload);
      alert("Record updated.");
      navigate(-1); // go back to the previous page (no hardcoded route)
    } catch (e) {
      console.error(e);
      setError(
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        "Failed to update record"
      );
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
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
            <h2 className="mb-0">Edit Record</h2>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => navigate(-1)}
            >
              Back
            </button>
          </div>

          {loading ? (
            <div>Loading…</div>
          ) : (
            <form className={`row g-3 ${validated ? "was-validated" : ""}`} onSubmit={handleSubmit} noValidate>
              {error && <div className="col-12 alert alert-danger">{error}</div>}

              <div className="col-md-6">
  <label className="form-label">Control No. *</label>
  <input
    className="form-control"
    name="control_number"
    required
    value={form.control_number}
    onChange={handleChange}
    autoComplete="off"
  />
  <div className="form-text">
    Allowed: letters, numbers, dot, underscore, slash, dash.
  </div>
</div>


              <div className="col-md-6">
                <label className="form-label">Title *</label>
                <input
                  className="form-control"
                  name="title"
                  required
                  value={form.title}
                  onChange={handleChange}
                  autoComplete="off"
                />
                <div className="invalid-feedback">Title is required.</div>
              </div>

              <AutocompleteInput
                label="Classification"
                name="classification"
                value={form.classification}
                onChange={handleChange}
                options={CLASSIFICATION_OPTIONS}
                placeholder="Start typing… e.g., Academic"
              />

              <AutocompleteInput
                label="Priority"
                name="priority"
                value={form.priority}
                onChange={handleChange}
                options={PRIORITY_OPTIONS}
                placeholder="Start typing… e.g., Normal"
              />

              <AutocompleteInput
                label="Retention"
                name="retention_period"
                value={form.retention_period}
                onChange={handleChange}
                options={RETENTION_OPTIONS}
                placeholder="Start typing… e.g., 1 Year"
              />

              <div className="col-12">
                <label className="form-label">Description *</label>
                <textarea
                  className="form-control"
                  rows="3"
                  name="description"
                  required
                  value={form.description}
                  onChange={handleChange}
                  autoComplete="off"
                />
                <div className="invalid-feedback">Description is required.</div>
              </div>

              <div className="col-md-6">
                <label className="form-label">Concerned Personnel *</label>
                <input
                  className="form-control"
                  name="source"
                  required
                  value={form.source}
                  onChange={handleChange}
                  autoComplete="off"
                />
                <div className="invalid-feedback">This field is required.</div>
              </div>

              <AutocompleteInput
                label="Destination Office"
                name="destination_office"
                value={form.destination_office}
                onChange={handleChange}
                options={DESTINATION_OFFICES}
                placeholder="Start typing… e.g., Accounting Office"
              />

              <AutocompleteInput
                label="Record Origin"
                name="record_origin"
                value={form.record_origin}
                onChange={handleChange}
                options={ORIGIN_OPTIONS}
                placeholder="Internal or External"
              />

              <div className="col-12 d-flex gap-2">
                <button type="submit" className="btn btn-primary" disabled={saving || !apiId}>
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => navigate(-1)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
