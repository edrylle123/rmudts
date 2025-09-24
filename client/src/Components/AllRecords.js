// client/src/Components/AllRecords.js
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import axios from "./axios";
import "./PriorityBadges.css";
import "./AllRecords.css"; // << new styles

function priorityClass(p) {
  const v = String(p || "Normal").toLowerCase().trim();
  if (["high", "urgent", "critical"].includes(v)) return "prio prio-high";
  if (["low", "minor"].includes(v)) return "prio prio-low";
  return "prio prio-normal";
}

export default function AllRecords() {
  const [rowsRaw, setRowsRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ---- search / filter state ----
  const [q, setQ] = useState("");
  const [office, setOffice] = useState("All");
  const [classification, setClassification] = useState("All");
  const [priority, setPriority] = useState("All");
  const [docType, setDocType] = useState("All"); // new document type filter
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await axios.get("/records/my-office");
        setRowsRaw(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.error(e);
        setError("Failed to load records");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const records = useMemo(() => {
    const map = new Map();
    for (const r of rowsRaw) {
      const api_id = r?.id ?? r?.record_id ?? null;
      const recId = api_id || r?.control_number || Math.random().toString(36).slice(2);

      if (!map.has(recId)) {
        map.set(recId, {
          id: recId,
          api_id,
          control_number: r?.control_number || "",
          title: r?.title || "",
          classification: r?.classification || "",
          priority: r?.priority || "",
          destination_office: r?.destination_office || "",
          document_type: r?.document_type || "Internal", // <-- new field
          created_at: r?.created_at || null,
          description: r?.description || "",
          files: [],
        });
      }

      if (r?.file_path) {
        map.get(recId).files.push({
          name: r.file_name || (r.file_path ? r.file_path.split("/").pop() : ""),
          type: r.file_type,
          size: r.file_size,
          path: r.file_path,
          retention_period: r.retention_period,
        });
      }
    }

    const arr = Array.from(map.values()).sort((a, b) => {
      const at = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bt - at;
    });

    return arr.map((r) => {
      const fileNames = (r.files || []).map((f) => f.name).join(" ");
      const hay = [
        r.control_number,
        r.title,
        r.classification,
        r.priority,
        r.destination_office,
        r.document_type, // included in search
        r.description,
        fileNames,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return { ...r, _hay: hay };
    });
  }, [rowsRaw]);

  const officeOptions = useMemo(() => {
    const s = new Set();
    records.forEach((r) => r.destination_office && s.add(r.destination_office));
    return ["Offices", ...Array.from(s)];
  }, [records]);

  const classificationOptions = ["Classification", "Academic", "Administrative", "Financial", "HR", "Others"];
  const priorityOptions = ["Priority", "Low", "Normal", "High"];
  const docTypeOptions = ["Record Origin", "Internal", "External"]; // options for new filter

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const fromT = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : null;
    const toT = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : null;

    return records.filter((r) => {
      if (ql && !r._hay.includes(ql)) return false;
      if (office !== "All" && r.destination_office !== office) return false;
      if (classification !== "All" && r.classification !== classification) return false;
      if (priority !== "All" && (r.priority || "Normal") !== priority) return false;
      if (docType !== "All" && r.document_type !== docType) return false;

      if (fromT || toT) {
        const ct = r.created_at ? new Date(r.created_at).getTime() : null;
        if (!ct) return false;
        if (fromT && ct < fromT) return false;
        if (toT && ct > toT) return false;
      }
      return true;
    });
  }, [records, q, office, classification, priority, docType, fromDate, toDate]);

  const fmtDate = (d) => {
    if (!d) return "—";
    try {
      return new Date(d).toLocaleString();
    } catch {
      return String(d);
    }
  };

  const clearFilters = () => {
    setQ("");
    setOffice("All");
    setClassification("All");
    setPriority("All");
    setDocType("All");
    setFromDate("");
    setToDate("");
  };

  const canUseApiId = (val) => typeof val === "number" || /^\d+$/.test(String(val || ""));
  const editPathFor = (r) => {
    if (canUseApiId(r.api_id)) return `/records/${r.api_id}/edit`;
    if (r.control_number) return `/records/${encodeURIComponent(r.control_number)}/edit`;
    return "#";
  };

  const handleEdit = (r) => {
    const path = editPathFor(r);
    if (path === "#") return;
    navigate(path);
  };

  const handleDelete = async (r) => {
    if (!canUseApiId(r.api_id)) {
      alert("This record cannot be deleted because it has no numeric ID from the server.");
      return;
    }
    const ok = window.confirm(
      `Delete record "${r.title || r.control_number || r.id}"?\nThis cannot be undone.`
    );
    if (!ok) return;

    try {
      setDeletingId(r.id);
      await axios.delete(`/records/${r.api_id}`);
      setRowsRaw((prev) =>
        prev.filter((x) => !(x?.id === r.api_id || x?.record_id === r.api_id))
      );
    } catch (e) {
      console.error(e);
      alert(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          "Failed to delete record."
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="d-flex">
      <Sidebar />
      <div className="flex-grow-1">
        <Navbar />
        <div className="container p-3">
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
            <h2 className="mb-0">All Records</h2>
            <div className="text-muted small">
              Showing <strong>{filtered.length}</strong> of {records.length}
            </div>
          </div>

          {/* ---- Neat search/filters toolbar ---- */}
          <div className="filter-toolbar border rounded-3 bg-white p-3 mb-3">
            <div className="row g-2 align-items-center">
              {/* Search */}
              <div className="col-12 col-lg-5">
                <div className="position-relative">
                  <span className="fi fi-search">🔎</span>
                  <input
                    className="form-control ps-5"
                    placeholder="Search by control #, title, office, document type, file name…"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>
              </div>

              {/* Office */}
              <div className="col-6 col-md-3 col-lg-2">
                <div className="position-relative">
                  <span className="fi fi-drop">🏢</span>
                  <select
                    className="form-select ps-5"
                    value={office}
                    onChange={(e) => setOffice(e.target.value)}
                  >
                    {officeOptions.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Classification */}
              <div className="col-6 col-md-3 col-lg-2">
                <div className="position-relative">
                  <span className="fi fi-drop">📂</span>
                  <select
                    className="form-select ps-5"
                    value={classification}
                    onChange={(e) => setClassification(e.target.value)}
                  >
                    {classificationOptions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Priority */}
              <div className="col-6 col-md-3 col-lg-2">
                <div className="position-relative">
                  <span className="fi fi-drop">⚑ </span>
                  <select
                    className="form-select ps-5"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    {priorityOptions.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Document Type */}
              <div className="col-6 col-md-3 col-lg-2">
                <div className="position-relative">
                  <span className="fi fi-drop">📄</span>
                  <select
                    className="form-select ps-5"
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                  >
                    {docTypeOptions.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dates */}
              <div className="col-6 col-md-3 col-lg-3">
                <div className="d-flex gap-2">
                  <div className="position-relative flex-grow-1">
                    <span className="fi fi-cal">📅</span>
                    <input
                      type="date"
                      className="form-control ps-5"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      title="From date"
                    />
                  </div>
                  <div className="position-relative flex-grow-1">
                    <span className="fi fi-cal">📅</span>
                    <input
                      type="date"
                      className="form-control ps-5"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      title="To date"
                    />
                  </div>
                </div>
              </div>

              {/* Clear */}
              <div className="col-12 col-lg-auto ms-auto text-end">
                <button className="btn btn-outline-secondary btn-sm" onClick={clearFilters}>
                  Clear filters
                </button>
              </div>
            </div>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          {loading ? (
            <div>Loading…</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped align-middle">
                <thead>
                  <tr>
                    <th>Control No.</th>
                    <th>Title</th>
                    <th>Classification</th>
                    <th>Priority</th>
                    <th>Destination Office</th>
                    <th>Document Type</th> {/* new column */}
                    <th>Created At</th>
                    <th style={{ minWidth: 260 }}>Attachments</th>
                    <th style={{ width: 140 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id}>
                      <td>{r.control_number || "—"}</td>
                      <td>{r.title || "—"}</td>
                      <td>{r.classification || "—"}</td>
                      <td>
                        <span className={priorityClass(r.priority)}>
                          {r.priority && String(r.priority).trim() ? r.priority : "Normal"}
                        </span>
                      </td>
                      <td>{r.destination_office || "—"}</td>
                      <td>{r.document_type || "Internal"}</td> {/* display document type */}
                      <td>{fmtDate(r.created_at)}</td>
                      <td>
                        {r.files && r.files.length > 0 ? (
                          <ul className="mb-0 small">
                            {r.files.map((f, i) => {
                              const to = `/view?file=${encodeURIComponent(f.path)}${
                                f.name ? `&name=${encodeURIComponent(f.name)}` : ""
                              }`;
                              return (
                                <li key={`${r.id}-f-${i}`}>
                                  <Link to={to}>{f.name || f.path}</Link>
                                  {f.size ? (
                                    <span className="text-muted ms-1">
                                      ({Math.round(f.size / 1024)} KB)
                                    </span>
                                  ) : null}
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>

                      <td>
                        <div className="d-flex gap-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-primary"
                            title="Edit record"
                            onClick={() => handleEdit(r)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            title={canUseApiId(r.api_id) ? "Delete record" : "Cannot delete (missing numeric ID)"}
                            disabled={!canUseApiId(r.api_id) || deletingId === r.id}
                            onClick={() => handleDelete(r)}
                          >
                            {deletingId === r.id ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center text-muted">
                        No records match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
