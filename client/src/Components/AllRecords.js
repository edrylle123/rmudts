// // client/src/Components/AllRecords.js
// import React, { useEffect, useMemo, useState } from "react";
// import { Link, useNavigate } from "react-router-dom";
// import Sidebar from "./Sidebar";
// import Navbar from "./Navbar";
// import axios from "./axios";
// import { socket } from "../socket"; // shared socket instance
// import "./PriorityBadges.css";
// import "./AllRecords.css"; 
// import { QRCodeCanvas } from "qrcode.react";

// function priorityClass(p) {
//   const v = String(p || "Normal").toLowerCase().trim();
//   if (["high", "urgent", "critical"].includes(v)) return "prio prio-high";
//   if (["low", "minor"].includes(v)) return "prio prio-low";
//   return "prio prio-normal";
// }

// export default function AllRecords() {
//   const [rowsRaw, setRowsRaw] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [deletingId, setDeletingId] = useState(null);
//   const [showQR, setShowQR] = useState(false);
//   const [qrData, setQrData] = useState({});

//   const [q, setQ] = useState("");
//   const [office, setOffice] = useState("All");
//   const [classification, setClassification] = useState("All");
//   const [priority, setPriority] = useState("All");
//   const [docType, setDocType] = useState("All");
//   const [fromDate, setFromDate] = useState("");
//   const [toDate, setToDate] = useState("");

//   const navigate = useNavigate();

//   // Fetch records
//   const load = async () => {
//     try {
//       setLoading(true);
//       const res = await axios.get("/records/my-office");
//       setRowsRaw(Array.isArray(res.data) ? res.data : []);
//     } catch (e) {
//       console.error(e);
//       setError("Failed to load records");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Socket.IO effect
//   useEffect(() => {
//     socket.on("recordsUpdated", () => load());
//     load();
//     return () => {
//       socket.off("recordsUpdated");
//     };
//   }, []);

//   // Transform records for display
//   const records = useMemo(() => {
//     const map = new Map();
//     for (const r of rowsRaw) {
//       const recId = r.id || r.control_number || Math.random().toString(36).slice(2);
//       if (!map.has(recId)) {
//         map.set(recId, {
//           id: recId,
//           control_number: r.control_number || "",
//           title: r.title || "",
//           classification: r.classification || "",
//           priority: r.priority || "Normal",
//           destination_office: r.destination_office || "",
//           document_type: r.document_type || "Internal",
//           created_at: r.created_at || null,
//           description: r.description || "",
//           files: [],
//           qrcode_path: r.qrcode_path || "",
//         });
//       }
//       if (r.file_path) {
//         map.get(recId).files.push({
//           name: r.file_name || r.file_path.split("/").pop(),
//           path: r.file_path,
//           size: r.file_size,
//         });
//       }
//     }
//     return Array.from(map.values()).sort(
//       (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
//     );
//   }, [rowsRaw]);

//   // Filters
//   const filtered = useMemo(() => {
//     const ql = q.trim().toLowerCase();
//     const fromT = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : null;
//     const toT = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : null;

//     return records.filter((r) => {
//       if (ql && ![r.control_number, r.title, r.classification, r.destination_office, r.document_type]
//           .join(" ").toLowerCase().includes(ql)) return false;
//       if (office !== "All" && r.destination_office !== office) return false;
//       if (classification !== "All" && r.classification !== classification) return false;
//       if (priority !== "All" && r.priority !== priority) return false;
//       if (docType !== "All" && r.document_type !== docType) return false;
//       const ct = r.created_at ? new Date(r.created_at).getTime() : null;
//       if ((fromT && ct < fromT) || (toT && ct > toT)) return false;
//       return true;
//     });
//   }, [records, q, office, classification, priority, docType, fromDate, toDate]);

//   const fmtDate = (d) => d ? new Date(d).toLocaleString() : "—";

//   const clearFilters = () => {
//     setQ(""); setOffice("All"); setClassification("All");
//     setPriority("All"); setDocType("All"); setFromDate(""); setToDate("");
//   };

//   const handleEdit = (r) => {
//     const path = r.id ? `/records/${r.id}/edit` : "#";
//     if (path !== "#") navigate(path);
//   };

//   const handleDelete = async (r) => {
//     if (!r.id) return alert("Cannot delete this record.");
//     if (!window.confirm(`Delete "${r.title}"? This cannot be undone.`)) return;
//     try {
//       setDeletingId(r.id);
//       await axios.delete(`/records/${r.id}`);
//       setRowsRaw((prev) => prev.filter((x) => x.id !== r.id));
//     } catch (e) {
//       console.error(e);
//       alert("Failed to delete record.");
//     } finally {
//       setDeletingId(null);
//     }
//   };
// const handleViewQR = (r) => {
//   // Ensure that the QR code path is correct and not empty
//   if (!r.qrcode_path || r.qrcode_path === "") {
//     return alert("QR code not available for this record.");
//   }

//   // Prepend the full URL if necessary
//   setQrData({ 
//     control_number: r.control_number, 
//     title: r.title, 
//     url: `http://localhost:8081${r.qrcode_path}` // Assuming the QR code path is relative
//   });
//   setShowQR(true);
// };


//   return (
//     <div className="d-flex">
//       <Sidebar />
//       <div className="flex-grow-1">
//         <Navbar />
//         <div className="container p-3">
//           <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
//             <h2 className="mb-0">All Records</h2>
//             <div className="text-muted small">
//               Showing <strong>{filtered.length}</strong> of {records.length}
//             </div>
//           </div>

//           {/* Filters toolbar */}
//           <div className="filter-toolbar border rounded-3 bg-white p-3 mb-3">
//             <div className="row g-2 align-items-center">
//               <div className="col-12 col-lg-5">
//                 <input
//                   className="form-control"
//                   placeholder="Search by control #, title…"
//                   value={q}
//                   onChange={(e) => setQ(e.target.value)}
//                 />
//               </div>
//               <div className="col-12 col-lg-auto ms-auto text-end">
//                 <button className="btn btn-outline-secondary btn-sm" onClick={clearFilters}>
//                   Clear filters
//                 </button>
//               </div>
//             </div>
//           </div>

//           {loading ? <div>Loading…</div> : (
//             <div className="table-responsive">
//               <table className="table table-striped align-middle">
//                 <thead>
//                   <tr>
//                     <th>Control No.</th>
//                     <th>Title</th>
//                     <th>Classification</th>
//                     <th>Priority</th>
//                     <th>Destination Office</th>
//                     <th>Document Type</th>
//                     <th>Created At</th>
//                     <th>Attachments</th>
//                     <th>Actions</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {filtered.length === 0 && (
//                     <tr><td colSpan={9} className="text-center text-muted">No records match your filters.</td></tr>
//                   )}
//                   {filtered.map((r) => (
//                     <tr key={r.id}>
//                       <td>{r.control_number || "—"}</td>
//                       <td>{r.title || "—"}</td>
//                       <td>{r.classification || "—"}</td>
//                       <td><span className={priorityClass(r.priority)}>{r.priority || "Normal"}</span></td>
//                       <td>{r.destination_office || "—"}</td>
//                       <td>{r.document_type || "Internal"}</td>
//                       <td>{fmtDate(r.created_at)}</td>
//                       <td>
//                         {r.files.length > 0 ? (
//                           <ul className="mb-0 small">
//                             {r.files.map((f, i) => (
//                               <li key={`${r.id}-f-${i}`}>
//                                 <Link to={`/view?file=${encodeURIComponent(f.path)}`}>{f.name}</Link>
//                                 {f.size && <span className="text-muted ms-1">({Math.round(f.size/1024)} KB)</span>}
//                               </li>
//                             ))}
//                           </ul>
//                         ) : "—"}
//                       </td>
//                       <td>
//                         <div className="d-flex gap-1 flex-wrap">
//                           <button className="btn btn-sm btn-outline-primary" onClick={() => handleEdit(r)}>Edit</button>
//                           <button className="btn btn-sm btn-outline-danger"
//                                   disabled={!r.id || deletingId === r.id}
//                                   onClick={() => handleDelete(r)}>
//                             {deletingId === r.id ? "Deleting…" : "Delete"}
//                           </button>
//                           <button className="btn btn-sm btn-outline-secondary" onClick={() => handleViewQR(r)}>
//                             View QR
//                           </button>
//                         </div>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           )}

//           {/* QR Modal */}
//           {showQR && (
//             <div className="qr-modal-backdrop" onClick={() => setShowQR(false)}>
//               <div className="qr-modal-dialog" onClick={(e) => e.stopPropagation()}>
//                 <h5>QR Code for {qrData.control_number}</h5>
//                 {/* Display QR code image */}
//                 <img
//                   src={qrData.url}
//                   alt={`QR Code for ${qrData.control_number}`}
//                   style={{ width: 200, height: 200 }}
//                 />
//                 <br />
//                 <button className="btn btn-sm btn-outline-secondary mt-2" onClick={() => setShowQR(false)}>
//                   Close
//                 </button>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import axios from "./axios";
import { socket } from "../socket"; // shared socket instance
import "./PriorityBadges.css";
import "./AllRecords.css"; 
import { QRCodeCanvas } from "qrcode.react";

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
  const [deletingId, setDeletingId] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const [qrData, setQrData] = useState({});

  const [q, setQ] = useState("");
  const [office, setOffice] = useState("All");
  const [classification, setClassification] = useState("All");
  const [priority, setPriority] = useState("All");
  const [docType, setDocType] = useState("All");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const navigate = useNavigate();

  // Fetch records
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

  // Socket.IO effect
  useEffect(() => {
    socket.on("recordsUpdated", () => load());
    load();
    return () => {
      socket.off("recordsUpdated");
    };
  }, []);

  // Transform records for display
  const records = useMemo(() => {
    const map = new Map();
    for (const r of rowsRaw) {
      const recId = r.id || r.control_number || Math.random().toString(36).slice(2);
      if (!map.has(recId)) {
        map.set(recId, {
          id: recId,
          control_number: r.control_number || "",
          title: r.title || "",
          classification: r.classification || "",
          priority: r.priority || "Normal",
          destination_office: r.destination_office || "",
          document_type: r.document_type || "Internal",
          created_at: r.created_at || null,
          description: r.description || "",
          files: [],
          qrcode_path: r.qrcode_path || "", // Ensure this field is returned
        });
      }
      if (r.file_path) {
        map.get(recId).files.push({
          name: r.file_name || r.file_path.split("/").pop(),
          path: r.file_path,
          size: r.file_size,
        });
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [rowsRaw]);

  // Filters
  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const fromT = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : null;
    const toT = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : null;

    return records.filter((r) => {
      if (ql && ![r.control_number, r.title, r.classification, r.destination_office, r.document_type]
          .join(" ").toLowerCase().includes(ql)) return false;
      if (office !== "All" && r.destination_office !== office) return false;
      if (classification !== "All" && r.classification !== classification) return false;
      if (priority !== "All" && r.priority !== priority) return false;
      if (docType !== "All" && r.document_type !== docType) return false;
      const ct = r.created_at ? new Date(r.created_at).getTime() : null;
      if ((fromT && ct < fromT) || (toT && ct > toT)) return false;
      return true;
    });
  }, [records, q, office, classification, priority, docType, fromDate, toDate]);

  const fmtDate = (d) => d ? new Date(d).toLocaleString() : "—";

  const clearFilters = () => {
    setQ(""); setOffice("All"); setClassification("All");
    setPriority("All"); setDocType("All"); setFromDate(""); setToDate("");
  };

  const handleEdit = (r) => {
    const path = r.id ? `/records/${r.id}/edit` : "#";
    if (path !== "#") navigate(path);
  };

  const handleDelete = async (r) => {
    if (!r.id) return alert("Cannot delete this record.");
    if (!window.confirm(`Delete "${r.title}"? This cannot be undone.`)) return;
    try {
      setDeletingId(r.id);
      await axios.delete(`/records/${r.id}`);
      setRowsRaw((prev) => prev.filter((x) => x.id !== r.id));
    } catch (e) {
      console.error(e);
      alert("Failed to delete record.");
    } finally {
      setDeletingId(null);
    }
  };

const handleViewQR = (r) => {
  const p = r.qrcode_path || "";
  if (!p) return alert("QR code not available for this record.");

  const normalized = p.startsWith("/uploads/") ? p : `/uploads/${p.replace(/^\/+/, "")}`;
  setQrData({
    control_number: r.control_number,
    title: r.title,
    url: `http://localhost:8081${normalized}`,
  });
  setShowQR(true);
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

          {/* Filters toolbar */}
          <div className="filter-toolbar border rounded-3 bg-white p-3 mb-3">
            <div className="row g-2 align-items-center">
              <div className="col-12 col-lg-5">
                <input
                  className="form-control"
                  placeholder="Search by control #, title…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <div className="col-12 col-lg-auto ms-auto text-end">
                <button className="btn btn-outline-secondary btn-sm" onClick={clearFilters}>
                  Clear filters
                </button>
              </div>
            </div>
          </div>

          {loading ? <div>Loading…</div> : (
            <div className="table-responsive">
              <table className="table table-striped align-middle">
                <thead>
                  <tr>
                    <th>Control No.</th>
                    <th>Title</th>
                    <th>Classification</th>
                    <th>Priority</th>
                    <th>Destination Office</th>
                    <th>Document Type</th>
                    <th>Created At</th>
                    <th>Attachments</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={9} className="text-center text-muted">No records match your filters.</td></tr>
                  )}
                  {filtered.map((r) => (
                    <tr key={r.id}>
                      <td>{r.control_number || "—"}</td>
                      <td>{r.title || "—"}</td>
                      <td>{r.classification || "—"}</td>
                      <td><span className={priorityClass(r.priority)}>{r.priority || "Normal"}</span></td>
                      <td>{r.destination_office || "—"}</td>
                      <td>{r.document_type || "Internal"}</td>
                      <td>{fmtDate(r.created_at)}</td>
                      <td>
                        {r.files.length > 0 ? (
                          <ul className="mb-0 small">
                            {r.files.map((f, i) => (
                              <li key={`${r.id}-f-${i}`}>
                                <Link to={`/view?file=${encodeURIComponent(f.path)}`}>{f.name}</Link>
                                {f.size && <span className="text-muted ms-1">({Math.round(f.size/1024)} KB)</span>}
                              </li>
                            ))}
                          </ul>
                        ) : "—"}
                      </td>
                      <td>
                        <div className="d-flex gap-1 flex-wrap">
                          <button className="btn btn-sm btn-outline-primary" onClick={() => handleEdit(r)}>Edit</button>
                          <button className="btn btn-sm btn-outline-danger"
                                  disabled={!r.id || deletingId === r.id}
                                  onClick={() => handleDelete(r)}>
                            {deletingId === r.id ? "Deleting…" : "Delete"}
                          </button>
                          <button className="btn btn-sm btn-outline-secondary" onClick={() => handleViewQR(r)}>
                            View QR
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* QR Modal */}
          {showQR && (
            <div className="qr-modal-backdrop" onClick={() => setShowQR(false)}>
              <div className="qr-modal-dialog" onClick={(e) => e.stopPropagation()}>
                <h5>QR Code for {qrData.control_number}</h5>
                {/* Display QR code image */}
                <img
                  src={qrData.url}
                  alt={`QR Code for ${qrData.control_number}`}
                  style={{ width: 200, height: 200 }}
                />
                <br />
                <button className="btn btn-sm btn-outline-secondary mt-2" onClick={() => setShowQR(false)}>
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
