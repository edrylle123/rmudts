// import React, { useEffect, useState } from "react";
// import Sidebar from "./Sidebar";
// import Navbar from "./Navbar";
// import axios from "./axios";
// import { socket } from "../socket";
// import "./UserDashboard.css"; // Ensure this file includes the CSS you've shared

// export default function UserDashboard({ user }) {
//   const [records, setRecords] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [nextOffice, setNextOffice] = useState({});
//   const [history, setHistory] = useState([]);
//   const [showHistory, setShowHistory] = useState(false);
//   const [selectedRecord, setSelectedRecord] = useState(null);
//   const [offices, setOffices] = useState([]);

//   // QR modal state
//   const [showQR, setShowQR] = useState(false);
//   const [qrData, setQrData] = useState({ control_number: "", url: "" });

//   const API_BASE =
//     process.env.REACT_APP_API_BASE?.replace(/\/$/, "") || "http://localhost:8081";

//   // helpers
//   const normalizeQrPath = (p) => {
//     if (!p) return "";
//     return p.startsWith("/uploads/") ? p : `/uploads/${p.replace(/^\/+/, "")}`;
//   };

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
//             qrcode_path: r?.qrcode_path || "",     // <-- include QR from API
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

//   // ---- socket (singleton)
//   useEffect(() => {
//     const onUpdated = (data) => {
//       if (data?.to_office === user?.office) reloadRecords();
//       else setRecords((prev) => prev.filter((r) => r.id !== data?.record_id));
//     };

//     socket.on("recordUpdated", onUpdated);
//     reloadRecords();
//     loadOffices();

//     return () => {
//       socket.off("recordUpdated", onUpdated);
//     };
//   }, [user?.office]);

//   // ---- actions
//   const handleView = (record) => {
//     const p = normalizeQrPath(record.qrcode_path);
//     if (p) {
//       setQrData({
//         control_number: record.control_number,
//         url: `${API_BASE}${p}`,
//       });
//       setShowQR(true);
//       return;
//     }
//     const firstPath = record.files && record.files[0]?.path;
//     if (firstPath) {
//       const url = firstPath.startsWith("http") ? firstPath : `${API_BASE}${firstPath}`;
//       window.open(url, "_blank", "noopener,noreferrer"); // Open the file in a new tab
//     } else {
//       alert("No QR code or file to view.");
//     }
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

//   const handleAttachmentClick = (filePath) => {
//     if (filePath) {
//       // Ensure that the file path is correct (relative path + base URL)
//       const url = filePath.startsWith("http") ? filePath : `${API_BASE}${filePath}`;
//       window.open(url, "_blank", "noopener,noreferrer");
//     } else {
//       alert("Invalid file path.");
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
//         <div className="content-area py-8 px-4">
//           <h2 className="page-title text-xl font-bold">Welcome, {user?.name || "User"}</h2>
//           <p className="subtitle text-md text-gray-500">Latest records for {user?.office || "—"}.</p>

//           <div className="dashboard-widgets grid grid-cols-3 gap-4 my-4">
//             <div className="widget p-4 bg-white shadow-lg rounded-lg">
//               <div className="widget-title text-lg font-semibold">Total</div>
//               <div className="widget-value text-3xl font-bold">{totalRecords}</div>
//             </div>
//             <div className="widget p-4 bg-white shadow-lg rounded-lg">
//               <div className="widget-title text-lg font-semibold">Internal</div>
//               <div className="widget-value text-3xl font-bold">{internalCount}</div>
//             </div>
//             <div className="widget p-4 bg-white shadow-lg rounded-lg">
//               <div className="widget-title text-lg font-semibold">External</div>
//               <div className="widget-value text-3xl font-bold">{externalCount}</div>
//             </div>
//           </div>

//           {loading ? (
//             <div className="status text-center text-xl">Loading…</div>
//           ) : error ? (
//             <div className="status text-center text-xl text-red-500">{error}</div>
//           ) : records.length === 0 ? (
//             <div className="status text-center text-xl text-gray-500">No documents assigned to your office.</div>
//           ) : (
//             <div className="records-cards">
//               {records.map((r) => (
//                 <div key={r.id} className="card">
//                   <div className="card-header">
//                     <h3>{r.control_number || "—"}</h3>
//                     <p>{r.title || "Untitled"}</p>
//                   </div>
//                   <div className="card-body">
//                     <p><strong>Destination Office:</strong> {r.destination_office || "—"}</p>
//                     <p><strong>Created At:</strong> {fmtDate(r.created_at)}</p>
//                     <div>
//                       <strong>Files:</strong>
//                       {r.files.length > 0 ? (
//                         r.files.map((file, index) => (
//                           <div key={index} className="file-row">
//                             <a
//                               href="javascript:void(0)"
//                               className="text-blue-600"
//                               onClick={() => handleAttachmentClick(file.path)}
//                             >
//                               {file.name}
//                             </a>
//                           </div>
//                         ))
//                       ) : (
//                         <p>No attachments</p>
//                       )}
//                     </div>
//                   </div>
//                   <div className="card-footer">
//                     {/* Commented out the original buttons */}
//                     {/* <button className="btn-view" onClick={() => handleView(r)}>View</button>
//                     <button className="btn-history" onClick={() => handleHistory(r.id)}>History</button>
//                     <select className="office-select" value={nextOffice[r.id] || ""} onChange={(e) => setNextOffice({ ...nextOffice, [r.id]: e.target.value })}>
//                       <option value="">Select next office</option>
//                       {offices.map((o) => (
//                         <option key={o} value={o}>{o}</option>
//                       ))} 
//                     </select> 
//                     <button className="btn-release" disabled={!nextOffice[r.id]} onClick={() => handleRelease(r.id, nextOffice[r.id])}>Release</button> */}

//                     {/* Added new buttons */}
//                     <button className="btn-approve" onClick={() => alert("Approve record")}>Approve</button>
//                     <button className="btn-notation" onClick={() => alert("Add notation to record")}>Add Notation</button>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }
import React, { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import axios from "./axios";
import { socket } from "../socket";
import "./UserDashboard.css"; // Ensure this file includes the CSS you've shared
import { useNavigate } from "react-router-dom";


export default function UserDashboard({ user }) {
  // State declarations
  const [internalCount, setInternalCount] = useState(0); // Track internal records
  const [externalCount, setExternalCount] = useState(0); // Track external records
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nextOffice, setNextOffice] = useState({});
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [offices, setOffices] = useState([]);
const navigate = useNavigate();
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

  const loadOffices = async () => {
  try {
    const res = await axios.get("/offices");
    const raw = Array.isArray(res.data) ? res.data : [];
    const names = raw.map((x) => (typeof x === "string" ? x : x?.name)).filter(Boolean);
    const unique = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
    setOffices(unique);  // Update the offices state
  } catch (e) {
    console.error("Failed to load offices", e);
    setOffices([]);  // Handle error and reset offices
  }
};

useEffect(() => {
  const reloadRecords = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/records/my-office");
      const rows = Array.isArray(res.data) ? res.data : [];

      console.log("Fetched Records:", rows); // Log the fetched records to check the `document_type`

      // Group rows -> records with files[]
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
            record_origin: r?.record_origin || "", // Ensure `document_type` is set correctly
            created_at: r?.created_at || null,
            description: r?.description || "",
            qrcode_path: r?.qrcode_path || "",
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

      // Check the document_type classification here
      const internalCount = grouped.filter((r) => {
        console.log(`Record Origin for ${r.control_number}: ${r.record_origin}`); // Log the document_type for each record
        return r.record_origin === "internal"; // Filter by correct document type
      }).length;

      const externalCount = grouped.filter((r) => r.record_origin === "external").length;

      console.log("Internal Count:", internalCount); // Log the internal count
      console.log("External Count:", externalCount); // Log the external count

      setInternalCount(internalCount);
      setExternalCount(externalCount);

    } catch (e) {
      console.error(e);
      setError("Failed to load records");
    } finally {
      setLoading(false);
    }
  };

  reloadRecords();  // Initial load of records
  loadOffices();    // Load offices data

  return () => {
    // Cleanup logic if needed
  };
}, [user?.office]);  // Re-run effect if user.office changes

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <div className="content-area py-8 px-4">
          <h2 className="page-title text-xl font-bold">Welcome, {user?.name || "User"}</h2>
          <p className="subtitle text-md text-gray-500">Latest records for {user?.office || "—"}.</p>

          <div className="dashboard-widgets grid grid-cols-3 gap-4 my-4">
  <div className="widget p-4 bg-white shadow-lg rounded-lg">
    <div className="widget-title text-lg font-semibold">Total</div>
    <div className="widget-value text-3xl font-bold">{records.length}</div>
  </div>
  <div className="widget p-4 bg-white shadow-lg rounded-lg">
    <div className="widget-title text-lg font-semibold">Internal</div>
    <div className="widget-value text-3xl font-bold">{internalCount}</div>
  </div>
  <div className="widget p-4 bg-white shadow-lg rounded-lg">
    <div className="widget-title text-lg font-semibold">External</div>
    <div className="widget-value text-3xl font-bold">{externalCount}</div>
  </div>
</div>



          {loading ? (
            <div className="status text-center text-xl">Loading…</div>
          ) : error ? (
            <div className="status text-center text-xl text-red-500">{error}</div>
          ) : records.length === 0 ? (
            <div className="status text-center text-xl text-gray-500">No documents assigned to your office.</div>
          ) : (
            <div className="records-cards">
              {records.map((r) => (
                <div key={r.id} className="card">
                  <div className="card-header">
                    <h3>{r.control_number || "—"}</h3>
                    <p>{r.title || "Untitled"}</p>
                  </div>
                  <div className="card-body">
                    <p><strong>Destination Office:</strong> {r.destination_office || "—"}</p>
                    <p><strong>Created At:</strong> {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}</p>
                    <div>
                      <strong>Files:</strong>
                      {r.files.length > 0 ? (
                        r.files.map((file, index) => (
                          <div key={index} className="file-row">
                            <a
                              href="javascript:void(0)"
                              className="text-blue-600"
                              onClick={() => alert(`Opening file: ${file.name}`)}  // Replace with your file opening logic
                            >
                              {file.name}
                            </a>
                          </div>
                        ))
                      ) : (
                        <p>No attachments</p>
                      )}
                    </div>
                  </div>
                  {/* <div className="card-footer">
                    <button className="btn-approve" onClick={() => alert("Approve record")}>Approve</button>
                    <button className="btn-notation" onClick={() => navigate("/routing-slip")}>Add Notation</button>
                  </div> */}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
