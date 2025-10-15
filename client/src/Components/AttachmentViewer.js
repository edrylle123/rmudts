// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import { useSearchParams } from 'react-router-dom';
// import Navbar from './Navbar';
// import Sidebar from './Sidebar';
// import { Worker, Viewer } from '@react-pdf-viewer/core';
// import '@react-pdf-viewer/core/lib/styles/index.css';

// function AttachmentViewer() {
//   const [search] = useSearchParams();
//   const fileParam = search.get('file'); // Get the 'file' param from the URL query string
//   const [fileUrl, setFileUrl] = useState(null); // Store the file URL
//   const [qrCodeUrl, setQrCodeUrl] = useState(null); // Store the QR code URL
//   const [error, setError] = useState(null); // Store any error message

//   // Function to fetch file from server
// const fetchFile = async (fileName) => {
//   try {
//     const token = localStorage.getItem('token');  // Ensure you're passing the token correctly
//     const cleanedFileName = decodeURIComponent(fileName.replace(/^\/+/, ''));  // Clean the fileName from unnecessary slashes

//     const response = await axios.get(`http://localhost:8081/uploads/${cleanedFileName}`, {
//       headers: {
//         Authorization: `Bearer ${token}`,  // Include JWT token for authorization
//       },
//       responseType: 'blob',  // Ensure the response is binary (for file)
//     });

//     const fileURL = URL.createObjectURL(response.data);  // Convert file data to a URL
//     setFileUrl(fileURL);  // Set the file URL to be used in the viewer
//   } catch (err) {
//     console.error("Error fetching file:", err);  // Log the error for debugging
//     setError('Failed to load the file');
//   }
// };


//   // Function to fetch QR code for the record
//   // const fetchQRCode = async (controlNumber) => {
//   //   try {
//   //     const response = await axios.get(`http://localhost:8081/records/get-qrcode-url`, {
//   //       params: { control_number: controlNumber, filePath: fileParam },
//   //     });
//   //     setQrCodeUrl(response.data.qrcode_url); // Set the QR code URL
//   //   } catch (err) {
//   //     console.error("Error fetching QR code:", err);
//   //     setError('Failed to load QR code');
//   //   }
//   // };
//   const fetchQRCode = async (controlNumber) => {
//   try {
//     const token = localStorage.getItem('token');  // Assuming JWT is stored in localStorage
//     const response = await axios.get(`http://localhost:8081/records/get-qrcode-url`, {
//       headers: {
//         Authorization: `Bearer ${token}`,  // Add the token in the Authorization header
//       },
//       params: {
//         filePath: fileParam,  // File path (query parameter)
//         control_number: controlNumber,  // Control number (query parameter)
//       },
//     });
//     setQrCodeUrl(response.data.qrcode_url);  // Set the QR code URL after successful response
//   } catch (err) {
//     console.error("Error fetching QR code:", err);
//     setError('Failed to fetch QR code');
//   }
// };


//   // Use effect hook to fetch file and QR code when fileParam changes
//   useEffect(() => {
//     if (!fileParam || fileParam.trim() === '') {
//       setError('Invalid file parameter');
//       return; // Prevent API call if fileParam is invalid or empty
//     }

//     const controlNumber = fileParam.split('-')[0]; // Assuming control number is part of fileParam, adjust accordingly
//     fetchFile(fileParam); // Fetch the document
//     fetchQRCode(controlNumber); // Fetch the QR code
//   }, [fileParam]); // Re-run the effect whenever fileParam changes

//   // Handle file download
//   const handleFileDownload = () => {
//     if (fileUrl) {
//       const link = document.createElement('a');
//       link.href = fileUrl;
//       link.download = "downloaded_attachment.pdf"; // Specify filename for download
//       link.click(); // Trigger the download
//     }
//   };

//   return (
//     <div className="d-flex">
//       <Sidebar />
//       <div className="flex-grow-1">
//         <Navbar />
//         <div className="container p-3">
//           <h2>Attachment Viewer</h2>

//           {error && <div className="alert alert-danger">{error}</div>} {/* Display error message */}

//           {fileUrl ? (
//             <div>
//               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
//                 <button className="btn btn-outline-secondary" onClick={handleFileDownload}>Download PDF</button>
//               </div>
//               <Worker workerUrl={`https://unpkg.com/pdfjs-dist@2.10.377/es5/build/pdf.worker.min.js`}>
//                 <Viewer fileUrl={fileUrl} />
//               </Worker>
//             </div>
//           ) : (
//             <div>Loading document...</div>  // Show loading message if the file URL is not available
//           )}

//           {/* Display QR code if available */}
//           {qrCodeUrl && (
//             <div className="qr-code-container" style={{ marginTop: '20px' }}>
//               <h4>QR Code</h4>
//               <img src={qrCodeUrl} alt="QR Code" />
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// export default AttachmentViewer;
import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import axios from "./axios";

export default function AttachmentViewer() {
  const [search] = useSearchParams();
  const navigate = useNavigate();

  const fileParam = search.get("file");
  const nameParam = search.get("name") || "";
  const [objUrl, setObjUrl] = useState(null);
  const [mime, setMime] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const frameRef = useRef(null);

  // Function to fetch the attachment
  const fetchAttachment = async (filePath) => {
    try {
      const base = (axios.defaults?.baseURL || "http://localhost:8081").replace(/\/$/, "");
      const url = filePath.startsWith("http") ? filePath : base + filePath;
      
      const res = await axios.get(url, { responseType: "blob" });
      const blob = res.data;
      const type = res.headers["content-type"] || blob.type || "";

      setMime(type);
      const localUrl = URL.createObjectURL(blob);
      setObjUrl(localUrl); // Update the URL for displaying the attachment
    } catch (e) {
      console.error("Failed to fetch attachment:", e);
      setErr("Failed to load the attachment.");
    }
  };

  // UseEffect: Fetch file when the component mounts
  useEffect(() => {
    const load = async () => {
      if (!fileParam) {
        setErr("Missing file path.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        await fetchAttachment(fileParam); // Fetch the attachment (PDF, Image, etc.)
      } catch (e) {
        console.error(e);
        setErr("Failed to load the attachment.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [fileParam]);

  const prettyName =
    nameParam ||
    (fileParam ? decodeURIComponent(fileParam.split("/").pop()) : "attachment");

  const openOriginal = () => {
    const base = (axios.defaults?.baseURL || "http://localhost:8081").replace(/\/$/, "");
    const url = fileParam.startsWith("http") ? fileParam : base + fileParam;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const downloadFile = () => {
    if (!objUrl) return;
    const a = document.createElement("a");
    a.href = objUrl;
    a.download = prettyName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const printFile = () => {
    if (!objUrl) return;

    const t = String(mime).toLowerCase();
    if (t.includes("pdf")) {
      const frame = frameRef.current;
      if (frame && frame.contentWindow) {
        frame.contentWindow.focus();
        frame.contentWindow.print();
        return;
      }
      const w = window.open(objUrl, "_blank", "noopener,noreferrer");
      w && w.focus();
      return;
    }

    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) return;
    const isImage = t.startsWith("image/");
    w.document.write(`
      <html>
        <head><title>${prettyName}</title></head>
        <body style="margin:0; padding:0; display:flex; align-items:center; justify-content:center;">
          ${
            isImage
              ? `<img src="${objUrl}" style="max-width:100%; max-height:100vh;" />`
              : `<iframe src="${objUrl}" style="border:0; width:100vw; height:100vh;"></iframe>`
          }
          <script>window.onload = function(){ setTimeout(function(){ window.focus(); window.print(); }, 50); }<\/script>
        </body>
      </html>
    `);
    w.document.close();
  };

  return (
    <div className="d-flex">
      <div className="flex-grow-1">
        <Navbar />
        <div className="container p-3">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <h2 className="mb-0">Attachment Viewer</h2>
            <div className="d-flex gap-2">
              <button className="btn btn-outline-secondary" onClick={() => navigate("/all-records")}>Back</button>
              {/* <button className="btn btn-outline-primary" onClick={openOriginal}>Open Original</button>
              <button className="btn btn-outline-success" onClick={downloadFile}>Download</button>
              <button className="btn btn-primary" onClick={printFile}>Print</button> */}
            </div>
          </div>

          <div className="mb-3 text-muted">{prettyName}</div>

          {loading ? (
            <div>Loading…</div>
          ) : err ? (
            <div className="alert alert-danger">{err}</div>
          ) : (
            <>
              {mime.toLowerCase().includes("pdf") ? (
                <iframe
                  ref={frameRef}
                  title="attachment"
                  src={objUrl}
                  style={{ width: "100%", height: "80vh", border: 0 }}
                />
              ) : mime.toLowerCase().startsWith("image/") ? (
                <div className="text-center">
                  <img
                    src={objUrl}
                    alt={prettyName}
                    style={{ maxWidth: "100%", maxHeight: "80vh" }}
                  />
                </div>
              ) : (
                <div className="alert alert-info">
                  Preview not available for this file type. Use <strong>Open Original</strong> or <strong>Download</strong>.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
