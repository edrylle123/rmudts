// client/src/Components/AttachmentViewer.js
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import axios from "./axios";

export default function AttachmentViewer() {
  const [search] = useSearchParams();
  const navigate = useNavigate();

  const fileParam = search.get("file"); // e.g., "/uploads/abc.pdf"
  const nameParam = search.get("name") || "";
  const [objUrl, setObjUrl] = useState(null);
  const [mime, setMime] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const frameRef = useRef(null);

  useEffect(() => {
    let revoke;
    const load = async () => {
      if (!fileParam) {
        setErr("Missing file path.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const base = (axios.defaults?.baseURL || "http://localhost:8081").replace(/\/$/, "");
        const url = fileParam.startsWith("http") ? fileParam : base + fileParam;

        const res = await axios.get(url, { responseType: "blob" });
        const blob = res.data;
        const type = res.headers["content-type"] || blob.type || "";
        const localUrl = URL.createObjectURL(blob);
        setObjUrl(localUrl);
        setMime(type);
        revoke = localUrl;
      } catch (e) {
        console.error(e);
        setErr("Failed to load the attachment.");
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
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
    // PDFs: try printing the iframe
    if (t.includes("pdf")) {
      const frame = frameRef.current;
      if (frame && frame.contentWindow) {
        frame.contentWindow.focus();
        frame.contentWindow.print();
        return;
      }
      // fallback: open new tab and let user print there
      const w = window.open(objUrl, "_blank", "noopener,noreferrer");
      w && w.focus();
      return;
    }

    // Images / other: open a temporary printable window
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
      <Sidebar />
      <div className="flex-grow-1">
        <Navbar />
        <div className="container p-3">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <h2 className="mb-0">Attachment Viewer</h2>
            <div className="d-flex gap-2">
              <button className="btn btn-outline-secondary" onClick={() => navigate(-1)}>Back</button>
              <button className="btn btn-outline-primary" onClick={openOriginal}>Open Original</button>
              <button className="btn btn-outline-success" onClick={downloadFile}>Download</button>
              <button className="btn btn-primary" onClick={printFile}>Print</button>
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
