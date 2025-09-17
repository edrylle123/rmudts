// server.js
require("dotenv").config();
const { PDFDocument } = require("pdf-lib"); // <-- add this

const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { execFile } = require("child_process");
const sharp = require("sharp");

const app = express();
app.use(cors());
app.use(express.json());

// ====== JWT SECRETS ======
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

// ====== Uploads Folder Setup & Static ======
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use("/uploads", express.static(uploadDir)); // serve files

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// ====== Helpers / Middlewares ======
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

// ====== PDF Conversion Utils ======
const OFFICE_EXTS = [
  ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".odt", ".ods", ".odp", ".rtf", ".txt",
];

// Try to find LibreOffice binary (for Windows + others)
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
  // fallback: rely on PATH
  return "soffice";
}

// Convert a single image file to a single-page PDF using pdf-lib.
// Supports JPG/JPEG/PNG directly; other images try to go through sharp -> PNG (optional).
async function convertImageToPdf(inputPath, outPath) {
  const ext = path.extname(inputPath).toLowerCase();
  let bytes = fs.readFileSync(inputPath);

  const pdfDoc = await PDFDocument.create();

  // pdf-lib directly supports JPG and PNG
  if (ext === ".jpg" || ext === ".jpeg") {
    const img = await pdfDoc.embedJpg(bytes);
    const { width, height } = img;
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(img, { x: 0, y: 0, width, height });
  } else if (ext === ".png") {
    const img = await pdfDoc.embedPng(bytes);
    const { width, height } = img;
    const page = pdfDoc.addPage([width, height]);
    page.drawImage(img, { x: 0, y: 0, width, height });
  } else {
    // Try optional sharp -> PNG then embed as PNG (handles gif/webp/tiff/jxl/etc if sharp is installed)
    try {
      const sharp = require("sharp");
      const pngBuf = await sharp(bytes).png().toBuffer();
      const img = await pdfDoc.embedPng(pngBuf);
      const { width, height } = img;
      const page = pdfDoc.addPage([width, height]);
      page.drawImage(img, { x: 0, y: 0, width, height });
    } catch (e) {
      console.error("Image->PDF fallback failed (need sharp?):", e?.message);
      return null;
    }
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outPath, pdfBytes);
  return outPath;
}

/**
 * Try to convert a single uploaded file to PDF.
 * Returns { name, type, size, pdfPath } on success, or null if not converted.
 */
async function convertToPdfIfNeeded(file) {
  try {
    const inputAbs = path.join(uploadDir, file.filename);
    const ext = path.extname(file.originalname || file.filename).toLowerCase();
    const mime = file.mimetype || "";

    // Already a PDF
    if (mime.includes("pdf") || ext === ".pdf") return null;

    // Where to place the new PDF beside the uploaded file
    const targetAbs = path.join(
      uploadDir,
      path.basename(file.filename, path.extname(file.filename)) + ".pdf"
    );

    // Images -> PDF via pdf-lib (with optional sharp fallback)
    if (mime.startsWith("image/") || [".jpg",".jpeg",".png",".gif",".webp",".tif",".tiff",".jxl",".jp2",".j2k",".jpx"].includes(ext)) {
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

    // Office docs -> PDF via LibreOffice (if installed)
    if ([".doc",".docx",".xls",".xlsx",".ppt",".pptx",".odt",".ods",".odp",".rtf",".txt"].includes(ext)) {
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


async function convertImageToPdf(inputPath, outPath) {
  // Convert single image into single-page PDF
  await sharp(inputPath).toFormat("pdf").toFile(outPath);
  return outPath;
}

/**
 * Try to convert a single uploaded file to PDF.
 * Returns { name, type, size, pdfPath } on success, or null.
 */
async function convertToPdfIfNeeded(file) {
  try {
    const inputAbs = path.join(uploadDir, file.filename);
    const ext = path.extname(file.originalname || file.filename).toLowerCase();
    const mime = file.mimetype || "";

    // Already a PDF
    if (mime.includes("pdf") || ext === ".pdf") return null;

    // Target path in uploads/
    const targetAbs = path.join(
      uploadDir,
      path.basename(file.filename, path.extname(file.filename)) + ".pdf"
    );

    // Image -> PDF via sharp
    if (mime.startsWith("image/")) {
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

    // Office doc -> PDF via LibreOffice (if available)
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
    console.error("convertToPdfIfNeeded failed:", e.message);
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

    // OPTIONAL refresh token (create if you use it in the client)
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
// Utility: generate next control number preview
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
      const [datePart, numPart] = lastControl.split("-");
      const newNum = String(parseInt(numPart, 10) + 1).padStart(3, "0");
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

// Create new record with files -> auto-convert to PDF
app.post("/records", upload.array("files"), async (req, res) => {
  const {
    title,
    classification,
    priority,
    description,
    source,
    retention_period,
    destination_office,
  } = req.body;
  const files = req.files || [];
  const safePriority = (priority && String(priority).trim()) ? String(priority).trim() : "Normal";


  getNextControlNumber(async (err, nextNum) => {
    if (err) return res.status(500).json({ error: "Error generating control number" });

    const sql = `
      INSERT INTO records 
      (title, classification, priority, description, source, retention_period, created_at, control_number, destination_office)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?)
    `;
    db.query(
      sql,
      [title, classification, priority, description, source, retention_period, nextNum, destination_office],
      async (err2, result) => {
        if (err2) return res.status(500).json({ error: "Database insert error" });

        const recordId = result.insertId;

        // Always insert original files first
        if (files.length > 0) {
          const fileSql = `
            INSERT INTO record_files (record_id, file_name, file_type, file_size, file_path, retention_period, uploaded_at)
            VALUES ?
          `;
          const originals = files.map((file) => [
            recordId,
            file.originalname,
            file.mimetype,
            file.size,
            "/uploads/" + file.filename,
            retention_period,
            new Date(),
          ]);

          db.query(fileSql, [originals], async (fileErr) => {
            if (fileErr) return res.status(500).json({ error: "File insert error" });

            // Try to convert each file to PDF (image/office) and insert converted copies as extra rows
            try {
              const converted = await Promise.all(files.map((f) => convertToPdfIfNeeded(f)));
              const pdfRows = converted
                .filter(Boolean)
                .map((c) => [
                  recordId,
                  c.name,
                  c.type,
                  c.size,
                  c.pdfPath,
                  retention_period,
                  new Date(),
                ]);

              if (pdfRows.length > 0) {
                db.query(fileSql, [pdfRows], (pdfErr) => {
                  if (pdfErr) console.error("Insert converted PDF rows error:", pdfErr.message);
                  return res.json({
                    message: "✅ Record and files saved successfully (PDFs generated where possible)",
                    recordId,
                    control_number: nextNum,
                    destination_office,
                    files: originals,
                    converted: pdfRows,
                  });
                });
              } else {
                return res.json({
                  message: "✅ Record and files saved successfully",
                  recordId,
                  control_number: nextNum,
                  destination_office,
                  files: originals,
                  converted: [],
                });
              }
            } catch (convErr) {
              console.error("Conversion error:", convErr && convErr.message);
              return res.json({
                message: "✅ Record saved (some files may not have been converted to PDF)",
                recordId,
                control_number: nextNum,
                destination_office,
                files: originals,
                converted: [],
              });
            }
          });
        } else {
          // No file uploads
          res.json({
            message: "✅ Record saved (no files uploaded)",
            recordId,
            control_number: nextNum,
            destination_office,
          });
        }
      }
    );
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

// ====== Start server ======
const PORT = process.env.PORT || 8081;
app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
