// import React, { useEffect, useState } from "react";
// import Sidebar from "./Sidebar";
// import Navbar from "./Navbar";
// import axios from "./axios";

// import { socket } from "../socket"; // adjust path
// import "./Dashboard.css";

// export default function UserDashboard({ user }) {
//   const [records, setRecords] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [nextOffice, setNextOffice] = useState({});
//   const [history, setHistory] = useState([]);
//   const [showHistory, setShowHistory] = useState(false);
//   const [selectedRecord, setSelectedRecord] = useState(null);
//   const [offices, setOffices] = useState([]);

//   const API_BASE =
//     process.env.REACT_APP_API_BASE?.replace(/\/$/, "") || "http://localhost:8081";

//   // ---- data loaders
//   const reloadRecords = async () => {
//     try {
//       setLoading(true);
//       const res = await axios.get("/records/my-office");
//       const rows = Array.isArray(res.data) ? res.data : [];

//       // group rows -> records with files[]
//       const map = new Map();
//       for (const r of rows) {
//         const api_id = r?.id ?? r?.record_id ?? null;
//         const recId = api_id || r?.control_number || Math.random().toString(36).slice(2);
//         if (!map.has(recId)) {
//           map.set(recId, {
//             id: recId,
//             api_id,
//             control_number: r?.control_number || "",
//             title: r?.title || "Untitled",
//             classification: r?.classification || "",
//             priority: r?.priority || "Normal",
//             destination_office: r?.destination_office || "",
//             document_type: r?.document_type || "Internal",
//             created_at: r?.created_at || null,
//             description: r?.description || "",
//             files: [],
//           });
//         }
//         if (r?.file_path) {
//           map.get(recId).files.push({
//             name: r.file_name || (r.file_path ? r.file_path.split("/").pop() : ""),
//             type: r.file_type,
//             size: r.file_size,
//             path: r.file_path,
//             retention_period: r.retention_period,
//           });
//         }
//       }
//       const grouped = Array.from(map.values()).sort((a, b) => {
//         const at = a.created_at ? new Date(a.created_at).getTime() : 0;
//         const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
//         return bt - at;
//       });
//       setRecords(grouped);
//       setError(null);
//     } catch (e) {
//       console.error(e);
//       setError("Failed to load records");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const loadOffices = async () => {
//     try {
//       const res = await axios.get("/offices");
//       const raw = Array.isArray(res.data) ? res.data : [];
//       const names = raw.map((x) => (typeof x === "string" ? x : x?.name)).filter(Boolean);
//       const unique = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
//       setOffices(unique);
//     } catch (e) {
//       console.error("Failed to load offices", e);
//       setOffices([]);
//     }
//   };

//   // ---- socket
//   // useEffect(() => {
//   //   // Do not force websocket. Let Socket.IO fall back to polling if needed.
//   //   const socket = io(API_BASE, {
//   //     withCredentials: false,
//   //     transports: ["polling", "websocket"],
//   //     reconnection: true,
//   //     reconnectionAttempts: Infinity,
//   //     reconnectionDelay: 500,
//   //     timeout: 10000,
//   //     autoConnect: true,
//   //   });

//   //   socket.on("connect", () => {
//   //     // console.log("socket connected", socket.id);
//   //   });

//   //   socket.on("recordUpdated", (data) => {
//   //     if (data?.to_office === user?.office) reloadRecords();
//   //     else setRecords((prev) => prev.filter((r) => r.id !== data?.record_id));
//   //   });

//   //   // initial loads
//   //   reloadRecords();
//   //   loadOffices();

//   //   return () => {
//   //     socket.removeAllListeners();
//   //     socket.disconnect();
//   //   };
//   //   // eslint-disable-next-line react-hooks/exhaustive-deps
//   // }, [user?.office]);
// // ---- socket (singleton)
// useEffect(() => {
//   const onUpdated = (data) => {
//     if (data?.to_office === user?.office) reloadRecords();
//     else setRecords((prev) => prev.filter((r) => r.id !== data?.record_id));
//   };

//   socket.on("recordUpdated", onUpdated);

//   // initial loads
//   reloadRecords();
//   loadOffices();

//   return () => {
//     socket.off("recordUpdated", onUpdated);
//   };
// }, [user?.office]);

//   // ---- actions
//   const handleView = (path) => {
//     if (path) window.open(path, "_blank", "noopener,noreferrer");
//   };

//   const handleHistory = async (recordId) => {
//     try {
//       const res = await axios.get(`/api/tracking/history/${recordId}`);
//       setHistory(res.data || []);
//       setSelectedRecord(recordId);
//       setShowHistory(true);
//     } catch {
//       alert("Failed to fetch history");
//     }
//   };

//   const handleRelease = async (recordId, office) => {
//     if (!office) return;
//     const ok = window.confirm(`Release record #${recordId} to ${office}?`);
//     if (!ok) return;
//     try {
//       await axios.post("/api/tracking/release", { record_id: recordId, to_office: office });
//       setRecords((prev) => prev.filter((r) => r.id !== recordId));
//       setNextOffice((prev) => ({ ...prev, [recordId]: "" }));
//     } catch {
//       alert("Failed to release record.");
//     }
//   };

//   // ---- UI helpers
//   const fmtDate = (d) => (d ? new Date(d).toLocaleString() : "—");
//   const totalRecords = records.length;
//   const internalCount = records.filter((r) => r.document_type === "Internal").length;
//   const externalCount = records.filter((r) => r.document_type === "External").length;

//   return (
//     <div className="app-layout">
//       <Sidebar />
//       <div className="main-content">
//         <Navbar />
//         <div className="content-area">
//           <h2 className="page-title">Welcome, {user?.name || "User"}</h2>
//           <p className="subtitle">Latest records for {user?.office || "—"}.</p>

//           <div className="dashboard-widgets">
//             <div className="widget">
//               <div className="widget-title">Total</div>
//               <div className="widget-value">{totalRecords}</div>
//             </div>
//             <div className="widget">
//               <div className="widget-title">Internal</div>
//               <div className="widget-value">{internalCount}</div>
//             </div>
//             <div className="widget">
//               <div className="widget-title">External</div>
//               <div className="widget-value">{externalCount}</div>
//             </div>
//           </div>

//           {loading ? (
//             <div className="status">Loading…</div>
//           ) : error ? (
//             <div className="status error">{error}</div>
//           ) : records.length === 0 ? (
//             <div className="status">No documents assigned to your office.</div>
//           ) : (
//             <div className="records-table">
//               <table>
//                 <thead>
//                   <tr>
//                     <th>Control #</th>
//                     <th>Title</th>
//                     <th>Type</th>
//                     <th>Destination Office</th>
//                     <th>Created At</th>
//                     <th>Files</th>
//                     <th>Actions</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {records.map((r) => (
//                     <tr key={r.id}>
//                       <td>{r.control_number || "—"}</td>
//                       <td>
//                         <div className="title-cell">
//                           <div className="title">{r.title || "—"}</div>
//                           {r.description ? <div className="desc">{r.description}</div> : null}
//                         </div>
//                       </td>
//                       <td>{r.document_type}</td>
//                       <td>{r.destination_office || "—"}</td>
//                       <td>{fmtDate(r.created_at)}</td>

//                       <td>
//                         {(r.files && r.files.length > 0 ? r.files : [{ name: "No file", path: undefined }]).map(
//                           (f, i) => (
//                             <div key={i} className="file-row">
//                               <span className="file-name">
//                                 {f.name}
//                                 {f?.size ? (
//                                   <span className="file-size">({Math.round((f.size || 0) / 1024)} KB)</span>
//                                 ) : null}
//                               </span>
//                             </div>
//                           )
//                         )}
//                       </td>

//                       <td>
//                         <div className="actions">
//                           <button
//                             className="btn-view"
//                             onClick={() => handleView(r.files && r.files[0]?.path)}
//                             title="View first file (if any)"
//                           >
//                             View
//                           </button>

//                           <button
//                             className="btn-history"
//                             onClick={() => handleHistory(r.id)}
//                             title="Movement history"
//                           >
//                             History
//                           </button>

//                           <select
//                             className="office-select"
//                             value={nextOffice[r.id] || ""}
//                             onChange={(e) =>
//                               setNextOffice((prev) => ({ ...prev, [r.id]: e.target.value }))
//                             }
//                             title="Select next office"
//                           >
//                             <option value="">Select next office</option>
//                             {offices.map((o) => (
//                               <option key={o} value={o}>
//                                 {o}
//                               </option>
//                             ))}
//                           </select>

//                           <button
//                             className="btn-release"
//                             disabled={!nextOffice[r.id]}
//                             onClick={() => handleRelease(r.id, nextOffice[r.id])}
//                             title="Release"
//                           >
//                             Release
//                           </button>
//                         </div>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           )}

//           {showHistory && (
//             <div className="modal-backdrop">
//               <div className="modal-dialog">
//                 <div className="modal-content">
//                   <div className="modal-header">
//                     <div className="modal-title">Record History #{selectedRecord}</div>
//                     <button className="btn-close-modal" onClick={() => setShowHistory(false)}>
//                       Close
//                     </button>
//                   </div>
//                   <div className="modal-body">
//                     {history.length === 0 ? (
//                       <div className="status">No history found.</div>
//                     ) : (
//                       <table className="modal-table">
//                         <thead>
//                           <tr>
//                             <th>Action</th>
//                             <th>From</th>
//                             <th>To</th>
//                             <th>Actor</th>
//                             <th>Timestamp</th>
//                           </tr>
//                         </thead>
//                         <tbody>
//                           {history.map((h, idx) => (
//                             <tr key={idx}>
//                               <td>{h.action}</td>
//                               <td>{h.from_office || "—"}</td>
//                               <td>{h.to_office || "—"}</td>
//                               <td>{h.actor_name || h.actor}</td>
//                               <td>{new Date(h.timestamp).toLocaleString()}</td>
//                             </tr>
//                           ))}
//                         </tbody>
//                       </table>
//                     )}
//                   </div>
//                 </div>
//               </div>
//             </div>
//           )}

//         </div>
//       </div>
//     </div>
//   );
// }


// client/src/Components/UserDashboard.js
import React, { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import axios from "./axios";
import { socket } from "../socket";
import "./Dashboard.css";

export default function UserDashboard({ user }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nextOffice, setNextOffice] = useState({});
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [offices, setOffices] = useState([]);

  // QR modal state
  const [showQR, setShowQR] = useState(false);
  const [qrData, setQrData] = useState({ control_number: "", url: "" });

  const API_BASE =
    process.env.REACT_APP_API_BASE?.replace(/\/$/, "") || "http://localhost:8081";

  // helpers
  const normalizeQrPath = (p) => {
    if (!p) return "";
    return p.startsWith("/uploads/") ? p : `/uploads/${p.replace(/^\/+/, "")}`;
  };

  // ---- data loaders
  const reloadRecords = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/records/my-office");
      const rows = Array.isArray(res.data) ? res.data : [];

      // group rows -> records with files[]
      const map = new Map();
      for (const r of rows) {
        const api_id = r?.id ?? r?.record_id ?? null;
        const recId = api_id || r?.control_number || Math.random().toString(36).slice(2);
        if (!map.has(recId)) {
          map.set(recId, {
            id: recId,
            api_id,
            control_number: r?.control_number || "",
            title: r?.title || "Untitled",
            classification: r?.classification || "",
            priority: r?.priority || "Normal",
            destination_office: r?.destination_office || "",
            document_type: r?.document_type || "Internal",
            created_at: r?.created_at || null,
            description: r?.description || "",
            qrcode_path: r?.qrcode_path || "",     // <-- include QR from API
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
      const grouped = Array.from(map.values()).sort((a, b) => {
        const at = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bt - at;
      });
      setRecords(grouped);
      setError(null);
    } catch (e) {
      console.error(e);
      setError("Failed to load records");
    } finally {
      setLoading(false);
    }
  };

  const loadOffices = async () => {
    try {
      const res = await axios.get("/offices");
      const raw = Array.isArray(res.data) ? res.data : [];
      const names = raw.map((x) => (typeof x === "string" ? x : x?.name)).filter(Boolean);
      const unique = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
      setOffices(unique);
    } catch (e) {
      console.error("Failed to load offices", e);
      setOffices([]);
    }
  };

  // ---- socket (singleton)
  useEffect(() => {
    const onUpdated = (data) => {
      if (data?.to_office === user?.office) reloadRecords();
      else setRecords((prev) => prev.filter((r) => r.id !== data?.record_id));
    };

    socket.on("recordUpdated", onUpdated);
    reloadRecords();
    loadOffices();

    return () => {
      socket.off("recordUpdated", onUpdated);
    };
  }, [user?.office]);

  // ---- actions
  // View now prefers the QR code; if not available, opens the first file (if any)
  const handleView = (record) => {
    const p = normalizeQrPath(record.qrcode_path);
    if (p) {
      setQrData({
        control_number: record.control_number,
        url: `${API_BASE}${p}`,
      });
      setShowQR(true);
      return;
    }
    const firstPath = record.files && record.files[0]?.path;
    if (firstPath) {
      window.open(firstPath, "_blank", "noopener,noreferrer");
    } else {
      alert("No QR code or file to view.");
    }
  };

  const handleHistory = async (recordId) => {
    try {
      const res = await axios.get(`/api/tracking/history/${recordId}`);
      setHistory(res.data || []);
      setSelectedRecord(recordId);
      setShowHistory(true);
    } catch {
      alert("Failed to fetch history");
    }
  };

  const handleRelease = async (recordId, office) => {
    if (!office) return;
    const ok = window.confirm(`Release record #${recordId} to ${office}?`);
    if (!ok) return;
    try {
      await axios.post("/api/tracking/release", { record_id: recordId, to_office: office });
      setRecords((prev) => prev.filter((r) => r.id !== recordId));
      setNextOffice((prev) => ({ ...prev, [recordId]: "" }));
    } catch {
      alert("Failed to release record.");
    }
  };

  // ---- UI helpers
  const fmtDate = (d) => (d ? new Date(d).toLocaleString() : "—");
  const totalRecords = records.length;
  const internalCount = records.filter((r) => r.document_type === "Internal").length;
  const externalCount = records.filter((r) => r.document_type === "External").length;

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <div className="content-area">
          <h2 className="page-title">Welcome, {user?.name || "User"}</h2>
          <p className="subtitle">Latest records for {user?.office || "—"}.</p>

          <div className="dashboard-widgets">
            <div className="widget">
              <div className="widget-title">Total</div>
              <div className="widget-value">{totalRecords}</div>
            </div>
            <div className="widget">
              <div className="widget-title">Internal</div>
              <div className="widget-value">{internalCount}</div>
            </div>
            <div className="widget">
              <div className="widget-title">External</div>
              <div className="widget-value">{externalCount}</div>
            </div>
          </div>

          {loading ? (
            <div className="status">Loading…</div>
          ) : error ? (
            <div className="status error">{error}</div>
          ) : records.length === 0 ? (
            <div className="status">No documents assigned to your office.</div>
          ) : (
            <div className="records-table">
              <table>
                <thead>
                  <tr>
                    <th>Control #</th>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Destination Office</th>
                    <th>Created At</th>
                    <th>Files</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id}>
                      <td>{r.control_number || "—"}</td>
                      <td>
                        <div className="title-cell">
                          <div className="title">{r.title || "—"}</div>
                          {r.description ? <div className="desc">{r.description}</div> : null}
                        </div>
                      </td>
                      <td>{r.document_type}</td>
                      <td>{r.destination_office || "—"}</td>
                      <td>{fmtDate(r.created_at)}</td>
                      <td>
                        {(r.files && r.files.length > 0 ? r.files : [{ name: "No file", path: undefined }]).map(
                          (f, i) => (
                            <div key={i} className="file-row">
                              <span className="file-name">
                                {f.name}
                                {f?.size ? (
                                  <span className="file-size">({Math.round((f.size || 0) / 1024)} KB)</span>
                                ) : null}
                              </span>
                            </div>
                          )
                        )}
                      </td>
                      <td>
                        <div className="actions">
                          <button
                            className="btn-view"
                            onClick={() => handleView(r)}  // <-- now shows QR first
                            title="View QR / first file"
                          >
                            View
                          </button>

                          <button
                            className="btn-history"
                            onClick={() => handleHistory(r.id)}
                            title="Movement history"
                          >
                            History
                          </button>

                          <select
                            className="office-select"
                            value={nextOffice[r.id] || ""}
                            onChange={(e) =>
                              setNextOffice((prev) => ({ ...prev, [r.id]: e.target.value }))
                            }
                            title="Select next office"
                          >
                            <option value="">Select next office</option>
                            {offices.map((o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </select>

                          <button
                            className="btn-release"
                            disabled={!nextOffice[r.id]}
                            onClick={() => handleRelease(r.id, nextOffice[r.id])}
                            title="Release"
                          >
                            Release
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
            <div
              className="modal-backdrop"
              onClick={() => setShowQR(false)}
              style={{ background: "rgba(0,0,0,0.4)" }}
            >
              <div
                className="modal-dialog"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: 320 }}
              >
                <div className="modal-content" style={{ textAlign: "center", padding: 16 }}>
                  <div className="modal-title" style={{ marginBottom: 8 }}>
                    QR Code for {qrData.control_number}
                  </div>
                  <img
                    src={qrData.url}
                    alt={`QR Code for ${qrData.control_number}`}
                    style={{ width: 200, height: 200 }}
                  />
                  <div style={{ marginTop: 12 }}>
                    <button className="btn-close-modal" onClick={() => setShowQR(false)}>
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showHistory && (
            <div className="modal-backdrop">
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header">
                    <div className="modal-title">Record History #{selectedRecord}</div>
                    <button className="btn-close-modal" onClick={() => setShowHistory(false)}>
                      Close
                    </button>
                  </div>
                  <div className="modal-body">
                    {history.length === 0 ? (
                      <div className="status">No history found.</div>
                    ) : (
                      <table className="modal-table">
                        <thead>
                          <tr>
                            <th>Action</th>
                            <th>From</th>
                            <th>To</th>
                            <th>Actor</th>
                            <th>Timestamp</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map((h, idx) => (
                            <tr key={idx}>
                              <td>{h.action}</td>
                              <td>{h.from_office || "—"}</td>
                              <td>{h.to_office || "—"}</td>
                              <td>{h.actor_name || h.actor}</td>
                              <td>{new Date(h.timestamp).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
