// server.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { execFile } = require("child_process");
const sharp = require("sharp"); // used for some conversions

// Optional: lightweight image->PDF via pdf-lib (better sizing on images)
const { PDFDocument } = require("pdf-lib");

const app = express();

// ====== Core middleware ======
app.use(cors());
app.use(express.json());

// ====== JWT Secrets ======
const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret_change_me";
const REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || "dev_refresh_secret_change_me";

// ====== Database Connection ======
const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "records_db",
});

// ====== Uploads folder & static serving ======
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use("/uploads", express.static(uploadDir));

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// ====== Auth helpers ======
function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ message: "No token provided" });

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer")
    return res.status(401).json({ message: "Bad authorization header" });

  const token = parts[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = decoded; // { id, email, role, name, office }
    next();
  });
}

function verifyAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admins only" });
  }
  next();
}

// ====== File conversion helpers (optional) ======
const OFFICE_EXTS = [
  ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".odt", ".ods", ".odp", ".rtf", ".txt",
];

// Try to find LibreOffice binary (especially on Windows)
function findSoffice() {
  if (process.platform === "win32") {
    const candidates = [
      "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
      "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
  }
  return "soffice"; // rely on PATH (Linux/Mac)
}

/**
 * Convert Office doc to PDF via LibreOffice, returns output PDF path or null.
 */
function convertOfficeToPdf(inputAbs, outDir) {
  return new Promise((resolve) => {
    const soffice = findSoffice();
    const args = [
      "--headless",
      "--convert-to",
      "pdf",
      "--outdir",
      outDir,
      inputAbs,
    ];
    execFile(soffice, args, { windowsHide: true }, (err) => {
      if (err) return resolve(null);
      const basename = path.basename(inputAbs, path.extname(inputAbs)) + ".pdf";
      const outAbs = path.join(outDir, basename);
      if (fs.existsSync(outAbs)) return resolve(outAbs);
      resolve(null);
    });
  });
}

/**
 * Convert single image (jpg/png/gif/webp/tif/...) to PDF using pdf-lib for exact sizing.
 * Returns outPath or null.
 */
async function convertImageToPdf(inputPath, outPath) {
  try {
    const ext = path.extname(inputPath).toLowerCase();
    const bytes = fs.readFileSync(inputPath);
    const pdfDoc = await PDFDocument.create();

    if (ext === ".jpg" || ext === ".jpeg") {
      const img = await pdfDoc.embedJpg(bytes);
      const { width, height } = img;
      const page = pdfDoc.addPage([width, height]);
      page.drawImage(img, { x: 0, y: 0, width, height });
    } else {
      // Use PNG route (works for png and also for others after sharp -> png)
      let pngBytes = bytes;
      if (ext !== ".png") {
        pngBytes = await sharp(bytes).png().toBuffer();
      }
      const img = await pdfDoc.embedPng(pngBytes);
      const { width, height } = img;
      const page = pdfDoc.addPage([width, height]);
      page.drawImage(img, { x: 0, y: 0, width, height });
    }
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outPath, pdfBytes);
    return outPath;
  } catch (e) {
    console.error("convertImageToPdf failed:", e?.message);
    return null;
  }
}

/**
 * If uploaded file is not PDF, try to convert it to PDF.
 * Returns { name, type, size, pdfPath } or null if not converted / unsupported.
 */
async function convertToPdfIfNeeded(file) {
  try {
    const inputAbs = path.join(uploadDir, file.filename);
    const ext = path.extname(file.originalname || file.filename).toLowerCase();
    const mime = file.mimetype || "";

    // Already PDF
    if (mime.includes("pdf") || ext === ".pdf") return null;

    const targetAbs = path.join(
      uploadDir,
      path.basename(file.filename, path.extname(file.filename)) + ".pdf"
    );

    // Images -> PDF
    if (
      mime.startsWith("image/") ||
      [".jpg",".jpeg",".png",".gif",".webp",".tif",".tiff",".jxl",".jp2",".j2k",".jpx"].includes(ext)
    ) {
      const out = await convertImageToPdf(inputAbs, targetAbs);
      if (!out) return null;
      const stat = fs.statSync(out);
      return {
        name: path.basename(file.originalname, ext) + ".pdf",
        type: "application/pdf",
        size: stat.size,
        pdfPath: "/uploads/" + path.basename(out),
      };
    }

    // Office docs -> PDF via LibreOffice
    if (OFFICE_EXTS.includes(ext)) {
      const out = await convertOfficeToPdf(inputAbs, uploadDir);
      if (!out) return null;
      const stat = fs.statSync(out);
      return {
        name: path.basename(file.originalname, ext) + ".pdf",
        type: "application/pdf",
        size: stat.size,
        pdfPath: "/uploads/" + path.basename(out),
      };
    }
  } catch (e) {
    console.error("convertToPdfIfNeeded failed:", e?.message);
  }
  return null;
}

// ====== AUTH ROUTES ======
app.get("/login", (req, res) => {
  res.json({ message: "POST /login with { email, password }" });
});

app.post("/signup", async (req, res) => {
  const { name, email, password, role, idnumber, office } = req.body || {};
  if (!name || !email || !password || !role || !office || role === "Select Role") {
    return res.status(400).json({
      success: false,
      message: "All fields including role and office are required",
    });
  }

  try {
    db.query("SELECT id FROM users WHERE email = ?", [email], async (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      if (rows.length > 0) {
        return res.status(409).json({ success: false, message: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const sql =
        "INSERT INTO users (name, email, password, role, idnumber, office) VALUES (?, ?, ?, ?, ?, ?)";
      db.query(
        sql,
        [name, email, hashedPassword, role, idnumber || "", office],
        (insertErr, result) => {
          if (insertErr) {
            return res.status(500).json({ success: false, message: insertErr.message });
          }
          return res.status(201).json({
            success: true,
            message: "User created successfully",
            user: {
              id: result.insertId, name, email, role, idnumber: idnumber || "", office,
            },
          });
        }
      );
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: "Email and password required" });

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!rows || rows.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid email or password" });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name, office: user.office },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name, office: user.office },
      REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      token,
      refreshToken,
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        idnumber: user.idnumber || "", office: user.office,
      },
    });
  });
});

app.post("/refresh-token", (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: "refreshToken required" });

  jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: "Invalid or expired refresh token" });

    const newToken = jwt.sign(
      { id: decoded.id, email: decoded.email, role: decoded.role, name: decoded.name, office: decoded.office },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.json({
      token: newToken,
      user: { id: decoded.id, email: decoded.email, role: decoded.role, name: decoded.name, office: decoded.office },
    });
  });
});

// ====== USERS API (Admin only) ======
app.get("/users", verifyToken, verifyAdmin, (req, res) => {
  db.query("SELECT id, name, email, role, idnumber, office FROM users", (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    return res.json(rows);
  });
});

app.put("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, email, role, password, idnumber, office } = req.body || {};

  if (!name || !email || !role) {
    return res.status(400).json({ message: "name, email and role are required" });
  }

  try {
    let sql, values;
    if (password && password.trim() !== "") {
      const hashed = await bcrypt.hash(password, 10);
      sql =
        "UPDATE users SET name = ?, email = ?, role = ?, idnumber = ?, office = ?, password = ? WHERE id = ?";
      values = [name, email, role, idnumber || "", office || "", hashed, id];
    } else {
      sql =
        "UPDATE users SET name = ?, email = ?, role = ?, idnumber = ?, office = ? WHERE id = ?";
      values = [name, email, role, idnumber || "", office || "", id];
    }

    db.query(sql, values, (err) => {
      if (err) return res.status(500).json({ message: err.message });
      return res.json({ success: true, message: "User updated successfully" });
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

app.delete("/users/:id", verifyToken, verifyAdmin, (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM users WHERE id = ?", [id], (err) => {
    if (err) return res.status(500).json({ message: err.message });
    return res.json({ success: true, message: "User deleted successfully" });
  });
});

// ====== OFFICES DIRECTORY (for filters, etc.) ======
const STATIC_OFFICES = [
  "Office of the President",
  "VP Admin and Finance",
  "VP Academic Research and Extension",
  "Office of the Campus Administrator",
  "Office of the University Board Secretary",
  "Office of the Supervising Administrative Officer",
  "Office of the Chief Administrative Officer",
  "Accounting Office",
  "Cashier",
  "Supply Office",
  "Budget Office",
  "Accounting and Finance Office",
  "Planning and Development Office",
  "Quality Assurance Office",
  "Legal Unit",
  "CITCS",
  "Office of the Registrar",
  "Alumni Office",
  "Information Technology Office",
  "General Services Unit",
  "Project Management Unit",
  "Information Office",
  "International Relations Office",
  "Procurement Office",
  "Human Resource Management Office",
];

app.get("/offices", verifyToken, (req, res) => {
  const sql = `
    SELECT DISTINCT office
    FROM users
    WHERE office IS NOT NULL AND office <> ''
    ORDER BY office ASC
  `;
  db.query(sql, (err, rows) => {
    const names = new Set();
    if (!err && Array.isArray(rows)) rows.forEach((r) => r && r.office && names.add(String(r.office)));
    STATIC_OFFICES.forEach((n) => names.add(n));
    const result = Array.from(names).sort((a, b) => a.localeCompare(b)).map((name, idx) => ({ id: idx + 1, name }));
    res.json(result);
  });
});

// ====== RECORDS API ======

// Utility: generate next control number (preview)
function getNextControlNumber(callback) {
  const sql = `
    SELECT control_number 
    FROM records 
    WHERE control_number IS NOT NULL 
    ORDER BY created_at DESC 
    LIMIT 1
  `;
  db.query(sql, (err, result) => {
    if (err) return callback(err);

    let nextNumber;
    if (result.length > 0) {
      const lastControl = result[0].control_number; // e.g. 250917-012
      const [datePart, numPart] = String(lastControl || "").split("-");
      const newNum = String(parseInt(numPart || "0", 10) + 1).padStart(3, "0");
      nextNumber = `${datePart}-${newNum}`;
    } else {
      const today = new Date();
      const yymmdd = today.toISOString().slice(2, 10).replace(/-/g, "");
      nextNumber = `${yymmdd}-001`;
    }
    callback(null, nextNumber);
  });
}

app.get("/records/next-control-number", (req, res) => {
  getNextControlNumber((err, nextNum) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ control_number: nextNum });
  });
});

function normalizeOrigin(str) {
  return String(str || "internal").toLowerCase() === "external" ? "external" : "internal";
}

// Create record (accept user control_number if provided; else auto)
app.post("/records", upload.array("files"), async (req, res) => {
  const {
    control_number, // optional user input
    title,
    classification,
    priority,
    description,
    source,
    retention_period,
    destination_office,
    record_origin, // "Internal" | "External"
  } = req.body;
  const files = req.files || [];
  const origin = normalizeOrigin(record_origin);

  // Helper to insert and then attach files
  const actuallyInsert = (cn) => {
    const sql = `
      INSERT INTO records
      (title, classification, priority, description, source, retention_period, created_at, control_number, destination_office, record_origin)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?)
    `;
    db.query(
      sql,
      [title, classification, priority, description, source, retention_period, cn, destination_office, origin],
      async (err, result) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ error: "Control number already exists" });
          }
          return res.status(500).json({ error: "Database insert error" });
        }

        const recordId = result.insertId;

        // Optional: Try to convert non-PDFs to PDF and insert both or just original?
        // Here we only save the original upload metadata (as before). If you want to also save converted PDFs, do another insert.
        if (files.length > 0) {
          // Optionally convert to PDF and insert too
          const values = [];
          for (const file of files) {
            values.push([
              recordId,
              file.originalname,
              file.mimetype,
              file.size,
              "/uploads/" + file.filename,
              retention_period,
              new Date(),
            ]);

            // Try conversion (best-effort). If success, also store PDF as a second row.
            try {
              const pdfInfo = await convertToPdfIfNeeded(file);
              if (pdfInfo) {
                values.push([
                  recordId,
                  pdfInfo.name,
                  pdfInfo.type,
                  pdfInfo.size,
                  pdfInfo.pdfPath,
                  retention_period,
                  new Date(),
                ]);
              }
            } catch {}
          }

          const fileSql = `
            INSERT INTO record_files (record_id, file_name, file_type, file_size, file_path, retention_period, uploaded_at)
            VALUES ?
          `;
          db.query(fileSql, [values], (fileErr) => {
            if (fileErr) return res.status(500).json({ error: "File insert error" });

            res.json({
              message: "✅ Record and files saved successfully",
              recordId,
              control_number: cn,
              destination_office,
              record_origin: origin,
              files: values,
            });
          });
        } else {
          res.json({
            message: "✅ Record saved (no files uploaded)",
            recordId,
            control_number: cn,
            destination_office,
            record_origin: origin,
          });
        }
      }
    );
  };

  if (control_number && String(control_number).trim() !== "") {
    // Use user-supplied control number
    return actuallyInsert(String(control_number).trim());
  }

  // Else auto-generate
  getNextControlNumber((err, nextNum) => {
    if (err) return res.status(500).json({ error: "Error generating control number" });
    actuallyInsert(nextNum);
  });
});

// Records visible to current user (admin = all; user = office only)
app.get("/records/my-office", verifyToken, (req, res) => {
  let sql, params;
  if (req.user.role === "admin") {
    sql = `
      SELECT r.*, rf.file_name, rf.file_type, rf.file_size, rf.file_path, rf.retention_period 
      FROM records r
      LEFT JOIN record_files rf ON r.id = rf.record_id
      ORDER BY r.created_at DESC
    `;
    params = [];
  } else {
    sql = `
      SELECT r.*, rf.file_name, rf.file_type, rf.file_size, rf.file_path, rf.retention_period 
      FROM records r
      LEFT JOIN record_files rf ON r.id = rf.record_id
      WHERE r.destination_office = ?
      ORDER BY r.created_at DESC
    `;
    params = [req.user.office];
  }

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(rows);
  });
});

// ====== New: GET one record by numeric id ======
app.get("/records/:id", verifyToken, (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT r.*, rf.file_name, rf.file_type, rf.file_size, rf.file_path, rf.retention_period
    FROM records r
    LEFT JOIN record_files rf ON r.id = rf.record_id
    WHERE r.id = ?
  `;
  db.query(sql, [id], (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (!rows || rows.length === 0) return res.status(404).json({ error: "Record not found" });

    const base = {
      id: rows[0].id,
      control_number: rows[0].control_number,
      title: rows[0].title,
      classification: rows[0].classification,
      priority: rows[0].priority,
      description: rows[0].description,
      source: rows[0].source,
      retention_period: rows[0].retention_period,
      destination_office: rows[0].destination_office,
      record_origin: rows[0].record_origin,
      created_at: rows[0].created_at,
      files: [],
    };
    rows.forEach(r => {
      if (r.file_path) {
        base.files.push({
          name: r.file_name || (r.file_path.split("/").pop()),
          type: r.file_type,
          size: r.file_size,
          path: r.file_path,
          retention_period: r.retention_period,
        });
      }
    });
    res.json(base);
  });
});

// ====== New: GET one record by control number ======
app.get("/records/by-control/:cn", verifyToken, (req, res) => {
  const { cn } = req.params;
  const sql = `
    SELECT r.*, rf.file_name, rf.file_type, rf.file_size, rf.file_path, rf.retention_period
    FROM records r
    LEFT JOIN record_files rf ON r.id = rf.record_id
    WHERE r.control_number = ?
  `;
  db.query(sql, [cn], (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    if (!rows || rows.length === 0) return res.status(404).json({ error: "Record not found" });

    const base = {
      id: rows[0].id,
      control_number: rows[0].control_number,
      title: rows[0].title,
      classification: rows[0].classification,
      priority: rows[0].priority,
      description: rows[0].description,
      source: rows[0].source,
      retention_period: rows[0].retention_period,
      destination_office: rows[0].destination_office,
      record_origin: rows[0].record_origin,
      created_at: rows[0].created_at,
      files: [],
    };
    rows.forEach(r => {
      if (r.file_path) {
        base.files.push({
          name: r.file_name || (r.file_path.split("/").pop()),
          type: r.file_type,
          size: r.file_size,
          path: r.file_path,
          retention_period: r.retention_period,
        });
      }
    });
    res.json(base);
  });
});

// ====== New: UPDATE record (metadata only) ======
app.put("/records/:id", verifyToken, (req, res) => {
  const { id } = req.params;
  let {
    control_number,
    title,
    classification,
    priority,
    description,
    source,
    retention_period,
    destination_office,
    record_origin,
  } = req.body || {};

  if (!title || !classification || !priority || !description || !source || !retention_period || !destination_office) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  record_origin = normalizeOrigin(record_origin);

  const sql = `
    UPDATE records
    SET control_number = ?, title = ?, classification = ?, priority = ?, description = ?,
        source = ?, retention_period = ?, destination_office = ?, record_origin = ?
    WHERE id = ?
  `;
  const vals = [
    control_number || null,
    title, classification, priority, description,
    source, retention_period, destination_office, record_origin,
    id
  ];

  db.query(sql, vals, (err, result) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({ error: "Control number already exists" });
      }
      return res.status(500).json({ error: err.message });
    }
    if (result.affectedRows === 0) return res.status(404).json({ error: "Record not found" });
    res.json({ success: true, message: "Record updated" });
  });
});

// ====== New: DELETE record (and its files on disk) ======
app.delete("/records/:id", verifyToken, (req, res) => {
  const { id } = req.params;

  // Fetch file paths to delete physically after DB deletion
  const sel = "SELECT file_path FROM record_files WHERE record_id = ?";
  db.query(sel, [id], (selErr, rows) => {
    if (selErr) return res.status(500).json({ error: selErr.message });

    const delFiles = "DELETE FROM record_files WHERE record_id = ?";
    const delRec = "DELETE FROM records WHERE id = ?";

    db.query(delFiles, [id], (dfErr) => {
      if (dfErr) return res.status(500).json({ error: dfErr.message });

      db.query(delRec, [id], (drErr, result) => {
        if (drErr) return res.status(500).json({ error: drErr.message });
        if (result.affectedRows === 0) return res.status(404).json({ error: "Record not found" });

        // Best-effort unlink
        (rows || []).forEach(r => {
          if (r.file_path && r.file_path.startsWith("/uploads/")) {
            const abs = path.join(__dirname, r.file_path);
            fs.unlink(abs, () => {});
          }
        });

        res.json({ success: true, message: "Record and files deleted" });
      });
    });
  });
});
// =================== DOCUMENT TRACKING ROUTES ===================

// Release document
app.post("/api/tracking/release", verifyToken, async (req, res) => {
  const { record_id, to_office } = req.body;
  const actor = req.user.name;

  db.query(
    "UPDATE records SET status='IN_TRANSIT' WHERE id=?",
    [record_id],
    (err) => {
      if (err) return res.status(500).json({ message: err.message });

      db.query(
        "INSERT INTO record_movements (record_id, action, from_office, to_office, actor) VALUES (?, 'RELEASED', ?, ?, ?)",
        [record_id, req.user.office, to_office, actor],
        (err2) => {
          if (err2) return res.status(500).json({ message: err2.message });
          res.json({ message: "Document released successfully" });
        }
      );
    }
  );
});

// Receive document
app.post("/api/tracking/receive", verifyToken, async (req, res) => {
  const { record_id, from_office } = req.body;
  const actor = req.user.name;

  db.query(
    "UPDATE records SET status='IN_OFFICE', destination_office=? WHERE id=?",
    [req.user.office, record_id],
    (err) => {
      if (err) return res.status(500).json({ message: err.message });

      db.query(
        "INSERT INTO record_movements (record_id, action, from_office, to_office, actor) VALUES (?, 'RECEIVED', ?, ?, ?)",
        [record_id, from_office, req.user.office, actor],
        (err2) => {
          if (err2) return res.status(500).json({ message: err2.message });
          res.json({ message: "Document received successfully" });
        }
      );
    }
  );
});

// Fetch tracking data for a specific office
app.get("/api/tracking/:office", verifyToken, async (req, res) => {
  const { office } = req.params;
  try {
    const documentsInOffice = await new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM records WHERE destination_office=? AND status='IN_OFFICE'",
        [office],
        (err, rows) => (err ? reject(err) : resolve(rows))
      );
    });

    const inTransit = await new Promise((resolve, reject) => {
      db.query(
        "SELECT * FROM records WHERE status='IN_TRANSIT' AND destination_office != ?",
        [office],
        (err, rows) => (err ? reject(err) : resolve(rows))
      );
    });

    const recentMovements = await new Promise((resolve, reject) => {
      db.query(
        "SELECT rm.*, r.title FROM record_movements rm LEFT JOIN records r ON r.id = rm.record_id WHERE from_office=? OR to_office=? ORDER BY timestamp DESC LIMIT 20",
        [office, office],
        (err, rows) => (err ? reject(err) : resolve(rows))
      );
    });

    res.json({ documentsInOffice, inTransit, recentMovements });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

// Fetch all offices (for modal dropdown)
app.get("/offices", verifyToken, (req, res) => {
  const sql = `SELECT DISTINCT office FROM users WHERE office IS NOT NULL AND office <> '' ORDER BY office ASC`;
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    const offices = Array.from(new Set(rows.map(r => r.office)));
    res.json(offices);
  });
});



// ====== Start server ======
const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
