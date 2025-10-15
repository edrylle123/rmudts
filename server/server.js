// server.js
require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const multer = require("multer");
// const { pool } = require('./db');  // Assume you're using a MySQL connection pool
const { execFile } = require("child_process");
const sharp = require("sharp");

const { PDFDocument } = require("pdf-lib");

const app = express();
const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");
// ====== Core middleware ======
app.use(cors());
app.use(express.json());
const uploadDir = path.join(__dirname, "uploads");
// Ensure uploads directory exists
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
// Multer file storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir), // Store files in 'uploads' directory
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + "-" + file.originalname); // Unique filenames to avoid conflicts
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Max file size 10MB
});
// ====== JWT Secrets ======
// const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret_change_me";
const REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || "dev_refresh_secret_change_me";
const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret_change_me";
const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "records_db",
});

// ====== DB ======
// const db = mysql.createConnection({
//   host: process.env.DB_HOST || "localhost",
//   user: process.env.DB_USER || "root",
//   password: process.env.DB_PASS || "",
//   database: process.env.DB_NAME || "records_db",
// });

// ====== Uploads ======
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use("/uploads", express.static(path.join(__dirname, "uploads")));





// ====== HTTP + Socket.IO ======
// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] },
// });
// app.set("io", new Server(http.createServer(app), {
//   cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] },
// }));
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:3000", methods: ["GET", "POST"] },
});
app.set("io", io); // optional if other modules read it

io.on("connection", (socket) => {
  console.log("⚡ Socket connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
  });
});

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

// ====== Converters ======
const OFFICE_EXTS = [
  ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".odt", ".ods", ".odp", ".rtf", ".txt",
];
function findSoffice() {
  if (process.platform === "win32") {
    const candidates = [
      "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
      "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
    ];
    for (const p of candidates) if (fs.existsSync(p)) return p;
  }
  return "soffice";
}
function convertOfficeToPdf(inputAbs, outDir) {
  return new Promise((resolve) => {
    const soffice = findSoffice();
    const args = ["--headless", "--convert-to", "pdf", "--outdir", outDir, inputAbs];
    execFile(soffice, args, { windowsHide: true }, (err) => {
      if (err) return resolve(null);
      const basename = path.basename(inputAbs, path.extname(inputAbs)) + ".pdf";
      const outAbs = path.join(outDir, basename);
      resolve(fs.existsSync(outAbs) ? outAbs : null);
    });
  });
}
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
      let pngBytes = bytes;
      if (ext !== ".png") pngBytes = await sharp(bytes).png().toBuffer();
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
async function convertToPdfIfNeeded(file) {
  try {
    const inputAbs = path.join(uploadDir, file.filename);
    const ext = path.extname(file.originalname || file.filename).toLowerCase();
    const mime = file.mimetype || "";
    console.log(`Converting file: ${file.originalname}, Type: ${mime}, Extension: ${ext}`);  // Add a log to check

    if (mime.includes("pdf") || ext === ".pdf") {
      console.log("File is already a PDF, skipping conversion.");  // Log if the file is already PDF
      return null;
    }

    const targetAbs = path.join(
      uploadDir,
      path.basename(file.filename, path.extname(file.filename)) + ".pdf"
    );

    if (
      mime.startsWith("image/") ||
      [".jpg",".jpeg",".png",".gif",".webp",".tif",".tiff",".jxl",".jp2",".j2k",".jpx"].includes(ext)
    ) {
      console.log(`Converting image to PDF: ${file.filename}`);  // Log image conversion
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

    if (OFFICE_EXTS.includes(ext)) {
      console.log(`Converting office document to PDF: ${file.filename}`);  // Log office document conversion
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

// ====== USERS API ======
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

// ====== OFFICES ======
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
    res.json(Array.from(names).sort((a, b) => a.localeCompare(b)));
  });
});
app.get("/records", verifyToken, (req, res) => {
  db.query("SELECT id, control_number, qrcode_path FROM records", (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(rows);
  });
});


// ====== RECORDS ======
// Control number generator
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

app.post("/records", upload.array("files"), async (req, res) => {
  try {
    const {
      control_number,
      office_requestor,
      classification,
      priority,
      description,
      concerned_personnel,
      retention_period,
      destination_office,
      record_origin,
    } = req.body;

    // Ensure all fields are provided
    if (
      !control_number ||
      !office_requestor ||
      !classification ||
      !priority ||
      !description ||
      !concerned_personnel ||
      !retention_period ||
      !destination_office ||
      !record_origin
    ) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const retentionPeriodNumber = parseInt(retention_period.split(" ")[0], 10);
    if (isNaN(retentionPeriodNumber)) {
      return res.status(400).json({ error: "Invalid retention period." });
    }

    // Insert record into database
    const insertSql = `
      INSERT INTO records
      (control_number, office_requestor, classification, priority, description, concerned_personnel, retention_period, destination_office, record_origin)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const recordResult = await new Promise((resolve, reject) => {
      db.query(
        insertSql,
        [
          control_number,
          office_requestor,
          classification,
          priority,
          description,
          concerned_personnel,
          retentionPeriodNumber, // Store numeric retention period
          destination_office,
          record_origin || "internal",
        ],
        (err, result) => (err ? reject(err) : resolve(result))
      );
    });

    // Generate the QR code and save it
    const qrCodeImagePath = path.join(__dirname, 'uploads', `${control_number}.png`);
    await QRCode.toFile(qrCodeImagePath, control_number); // Create QR code from control_number

    // Save QR code path in the database
    const updateSql = `
      UPDATE records SET qrcode_path = ? WHERE id = ?
    `;
    await new Promise((resolve, reject) => {
      db.query(
        updateSql,
        ["/uploads/" + `${control_number}.png`, recordResult.insertId],
        (err) => (err ? reject(err) : resolve())
      );
    });

    // If files are uploaded, store them in the 'record_files' table and convert to PDF
    if (req.files && req.files.length > 0) {
      const filePromises = req.files.map(async (file) => {
        // Insert each file into the database
        const fileSql = `
          INSERT INTO record_files (record_id, file_name, file_path, file_size, file_type)
          VALUES (?, ?, ?, ?, ?)
        `;
        await new Promise((resolve, reject) => {
          db.query(
            fileSql,
            [
              recordResult.insertId, // Link the file to the newly inserted record
              file.originalname,
              "/uploads/" + file.filename, // Path to the uploaded file
              file.size,
              file.mimetype,
            ],
            (err) => (err ? reject(err) : resolve())
          );
        });

        // Convert the file to PDF if needed
        const convertedFile = await convertToPdfIfNeeded(file);
        if (convertedFile) {
          // Update the file path to the PDF version
          const updateSql = `
            UPDATE record_files
            SET file_path = ?, file_name = ?, file_size = ?, file_type = ?
            WHERE record_id = ? AND file_name = ?
          `;
          await new Promise((resolve, reject) => {
            db.query(
              updateSql,
              [
                convertedFile.pdfPath, // Updated file path
                convertedFile.name, // Updated file name
                convertedFile.size, // Updated file size
                convertedFile.type, // Updated file type
                recordResult.insertId, // Match the record ID
                file.originalname, // Match the original file name
              ],
              (err) => (err ? reject(err) : resolve())
            );
          });
        }
      });

      // Wait for all file insertions and conversions to complete
      await Promise.all(filePromises);
    }

    res.status(201).json({
      message: "Record created successfully with QR code and converted PDF (if needed).",
      control_number,
      recordId: recordResult.insertId,
      qrcode_path: "/uploads/" + `${control_number}.png`, // Send the QR code path in the response
    });
  } catch (error) {
    console.error("Create record failed:", error);
    res.status(500).json({ error: error.message || "Failed to create record." });
  }
});

// QR Code Generation function
async function generateQRCode(control_number) {
  const qrFileName = `qr-${control_number}.png`;  // QR code file name
  const qrData = JSON.stringify({ control_number, title: `QR Code for ${control_number}` });
  const qrAbsPath = path.join(uploadDir, qrFileName); // Path to save the file

  try {
    // Generate and save the QR code to the uploads directory
    await QRCode.toFile(qrAbsPath, qrData, { width: 512, margin: 1 });
    console.log("QR code saved at:", qrAbsPath);  // Log the file path
    return qrFileName;  // Return the file name to store in the database
  } catch (err) {
    console.error("QR Code generation failed:", err);
    return null;
  }
}

// Records visible to current user (admin = all; user = office only)
app.get("/records/my-office", verifyToken, (req, res) => {
  let sql, params;
  if (req.user.role === "admin") {
    sql = `
      SELECT r.*, rf.file_name, rf.file_path, r.record_origin  
      FROM records r
      LEFT JOIN record_files rf ON r.id = rf.record_id
      ORDER BY r.created_at DESC
    `;
    params = [];
  } else {
    sql = `
      SELECT r.*, rf.file_name, rf.file_path, r.record_origin  
      FROM records r
      LEFT JOIN record_files rf ON r.id = rf.record_id
      WHERE r.destination_office = ?
      ORDER BY r.created_at DESC
    `;
    params = [req.user.office];
  }
  
  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error("Error in SQL query:", err);  // Log the error
      return res.status(500).json({ message: "Database error", error: err });
    }
    // console.log("Fetched records:", rows); 
    res.json(rows);
  });
});

// GET one record by numeric id
// Get record by ID for the Edit form (Admin)
// app.get("/records/:id", verifyToken, verifyAdmin, (req, res) => {
//   const { id } = req.params;
//   const sql = `
//     SELECT r.*, rf.file_name, rf.file_type, rf.file_size, rf.file_path, rf.retention_period
//     FROM records r
//     LEFT JOIN record_files rf ON r.id = rf.record_id
//     WHERE r.id = ?
//   `;
//   db.query(sql, [id], (err, rows) => {
//     if (err) return res.status(500).json({ error: "Database error" });
//     if (!rows || rows.length === 0) return res.status(404).json({ error: "Record not found" });

//     const record = rows[0];
//     res.json({
//       id: record.id,
//       title: record.title,
//       classification: record.classification,
//       priority: record.priority,
//       description: record.description,
//       retention_period: record.retention_period,
//       concerned_personnel: record.concerned_personnel,
//       destination_office: record.destination_office,
//       record_origin: record.record_origin,  // Non-editable
//       files: rows.map(r => ({
//         name: r.file_name,
//         path: r.file_path
//       })),
//     });
//   });
// });
app.get('/records/:id', (req, res) => {
  const { id } = req.params;
  const query = "SELECT * FROM records WHERE id = ?";
  
  db.query(query, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }

    const record = results[0];

    // Send only the number (no "Years")
    res.json({
      ...record,
      retention_period: record.retention_period, // It's just a number
    });
  });
});
app.get("/records/:id", verifyToken, verifyAdmin, (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT r.*, rf.file_name, rf.file_type, rf.file_size, rf.file_path, rf.retention_period
    FROM records r
    LEFT JOIN record_files rf ON r.id = rf.record_id
    WHERE r.id = ?
  `;

  db.query(sql, [id], (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });

    // Check if record exists
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "Record not found" });
    }

    const record = rows[0]; // First record in the response
    res.json({
      id: record.id,
      control_number: record.control_number,
      office_requestor: record.office_requestor,
      classification: record.classification,
      priority: record.priority,
      description: record.description,
      retention_period: record.retention_period,
      concerned_personnel: record.concerned_personnel,
      destination_office: record.destination_office,
      record_origin: record.record_origin, // Non-editable
      files: rows.map(r => ({
        name: r.file_name,
        path: r.file_path,
        type: r.file_type,
        size: r.file_size
      })),
    });
  });
});

// Update record (Admin) without editing control_number, but allow record_origin as non-editable
// app.put("/records/:id", verifyToken, verifyAdmin, (req, res) => {
//   const { id } = req.params;
//   let { title, classification, priority, description, retention_period, concerned_personnel, destination_office, record_origin } = req.body;

//   if (!title || !classification || !priority || !description || !retention_period || !destination_office) {
//     return res.status(400).json({ error: "Missing required fields" });
//   }

//   // Make sure record_origin is not updated (non-editable)
//   record_origin = record_origin || "internal";  // Default to "internal" if not provided

//   const sql = `
//     UPDATE records
//     SET title = ?, classification = ?, priority = ?, description = ?, retention_period = ?, concerned_personnel = ?, destination_office = ?, record_origin = ?
//     WHERE id = ?
//   `;
//   const values = [title, classification, priority, description, retention_period, concerned_personnel, destination_office, record_origin, id];
  
//   db.query(sql, values, (err, result) => {
//     if (err) return res.status(500).json({ error: err.message });
//     if (result.affectedRows === 0) return res.status(404).json({ error: "Record not found" });

//     res.json({ success: true, message: "Record updated successfully" });
//   });
// });


// app.put("/records/:id", verifyToken, verifyAdmin, (req, res) => {
//   const { id } = req.params;
//   let { title, classification, priority, description, retention_period, concerned_personnel, destination_office, record_origin } = req.body;

//   // Check for required fields
//   if (!title || !classification || !priority || !description || !retention_period || !destination_office) {
//     return res.status(400).json({ error: "Missing required fields" });
//   }

//   // Make sure record_origin is not updated (non-editable)
//   record_origin = record_origin || "internal";  // Default to "internal" if not provided

//   // If retention_period is a string, convert it to a number (assuming it's like '3 Years')
//  // Backend: Ensure retention_period is correctly parsed as a number
// const retentionPeriodNumber = parseInt(retention_period.split(" ")[0], 10); // Extract the number before "Years"
// if (isNaN(retentionPeriodNumber)) {
//   return res.status(400).json({ error: "Invalid retention period" });
// }
//   // Ensure record_origin is not updated (non-editable)
//   record_origin = record_origin || "internal";  // Default to "internal" if not provided
//   // SQL query to update the record
// const sql = `
//   UPDATE records
//   SET title = ?, classification = ?, priority = ?, description = ?, retention_period = ?, concerned_personnel = ?, destination_office = ?, record_origin = ?
//   WHERE id = ?
// `;
// const values = [title, classification, priority, description, retention_period, concerned_personnel, destination_office, record_origin, id];

//   db.query(sql, values, async (err, result) => {
//     if (err) return res.status(500).json({ error: err.message });
//     if (result.affectedRows === 0) return res.status(404).json({ error: "Record not found" });

//     // Optionally, if files need to be handled, you would process file uploads here
//     if (req.files && req.files.length > 0) {
//       // Process and update files in the 'record_files' table
//       const filePromises = req.files.map(async (file) => {
//         // You can insert the new files here (e.g., upload them to a folder and save their paths)
//         const fileSql = `
//           INSERT INTO record_files (record_id, file_name, file_path, file_size, file_type)
//           VALUES (?, ?, ?, ?, ?)
//         `;
//         await new Promise((resolve, reject) => {
//           db.query(
//             fileSql,
//             [
//               result.insertId,  // Link the new file to the record
//               file.originalname,
//               "/uploads/" + file.filename, // Path to the uploaded file
//               file.size,
//               file.mimetype,
//             ],
//             (err) => (err ? reject(err) : resolve())
//           );
//         });
//       });

//       // Wait for all file insertions to complete
//       await Promise.all(filePromises);
//     }

//     // If QR code needs to be updated, generate the new QR code and update it
//     const qrCodeImagePath = path.join(__dirname, 'uploads', `${title}-qr.png`);
//     await QRCode.toFile(qrCodeImagePath, title); // Generate a new QR code for the updated record

//     // Update the QR code path in the database
//     const updateQRCodeSql = `
//       UPDATE records SET qrcode_path = ? WHERE id = ?
//     `;
//     await new Promise((resolve, reject) => {
//       db.query(
//         updateQRCodeSql,
//         ["/uploads/" + `${title}-qr.png`, result.insertId],
//         (err) => (err ? reject(err) : resolve())
//       );
//     });

//     // Send success response
//     res.json({ success: true, message: "Record updated successfully" });
//   });
// });
app.put("/records/:id", verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  let {
    office_requestor,
    control_number,
    classification,
    priority,
    description,
    retention_period,
    concerned_personnel,
    destination_office,
    record_origin,
  } = req.body;

  // Validate required fields
  if (!control_number || !classification || !priority || !description || !retention_period || !destination_office) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Normalize record origin
  record_origin = "internal"; // Always enforce internal (non-editable)

  // Normalize retention_period
  let finalRetentionPeriod = retention_period;
  if (retention_period !== "Permanent") {
    const parsed = parseInt(retention_period.toString().split(" ")[0], 10);
    if (isNaN(parsed)) {
      return res.status(400).json({ error: "Invalid retention period" });
    }
    finalRetentionPeriod = parsed;
  }

  // Update the record
  const sql = `
    UPDATE records
    SET  office_requestor = ?, control_number = ?, classification = ?, priority = ?, description = ?, retention_period = ?, 
        concerned_personnel = ?, destination_office = ?, record_origin = ?
    WHERE id = ?
  `;
  const values = [
office_requestor || null,
    control_number,
    classification,
    priority,
    description,
    finalRetentionPeriod,
    concerned_personnel,
    destination_office,
    record_origin,
    id,
  ];

  db.query(sql, values, async (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ error: "Record not found" });

    // Process files (optional)
    if (req.files && req.files.length > 0) {
      const filePromises = req.files.map((file) => {
        const fileSql = `
          INSERT INTO record_files (record_id, file_name, file_path, file_size, file_type)
          VALUES (?, ?, ?, ?, ?)
        `;
        return new Promise((resolve, reject) => {
          db.query(
            fileSql,
            [
              id,
              file.originalname,
              "/uploads/" + file.filename,
              file.size,
              file.mimetype,
            ],
            (err) => (err ? reject(err) : resolve())
          );
        });
      });

      await Promise.all(filePromises);
    }

    // Generate QR Code
    const qrCodeImagePath = path.join(__dirname, 'uploads', `${control_number}-qr.png`);
    await QRCode.toFile(qrCodeImagePath, control_number);

    // Update QR path
    const updateQRCodeSql = `UPDATE records SET qrcode_path = ? WHERE id = ?`;
    await new Promise((resolve, reject) => {
      db.query(updateQRCodeSql, ["/uploads/" + `${control_number}-qr.png`, id], (err) =>
        err ? reject(err) : resolve()
      );
    });

    res.json({ success: true, message: "Record updated successfully" });
  });
});



// GET one record by control number
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

// UPDATE record
// app.put("/records/:id", verifyToken, (req, res) => {
//   const { id } = req.params;
//   let {
//     control_number,
//     title,
//     classification,
//     priority,
//     description,
//     source,
//     retention_period,
//     destination_office,
//     record_origin,
//   } = req.body || {};

//   if (!title || !classification || !priority || !description || !source || !retention_period || !destination_office) {
//     return res.status(400).json({ error: "Missing required fields" });
//   }
//   record_origin = normalizeOrigin(record_origin);

//   const sql = `
//     UPDATE records
//     SET control_number = ?, title = ?, classification = ?, priority = ?, description = ?,
//         source = ?, retention_period = ?, destination_office = ?, record_origin = ?
//     WHERE id = ?
//   `;
//   const vals = [
//     control_number || null,
//     title, classification, priority, description,
//     source, retention_period, destination_office, record_origin,
//     id
//   ];
//   db.query(sql, vals, (err, result) => {
//     if (err) {
//       if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "Control number already exists" });
//       return res.status(500).json({ error: err.message });
//     }
//     if (result.affectedRows === 0) return res.status(404).json({ error: "Record not found" });
//     res.json({ success: true, message: "Record updated" });
//   });
// });

// DELETE record (+ files)
app.delete("/records/:id", verifyToken, (req, res) => {
  const { id } = req.params;
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

// ====== TRACKING ======
// History
app.get("/api/tracking/history/:id", verifyToken, (req, res) => {
  const recordId = req.params.id;
  const q = `
    SELECT rm.*, u.name AS actor_name
    FROM record_movements rm
    LEFT JOIN users u ON rm.actor = u.name OR rm.actor = u.id
    WHERE rm.record_id = ?
    ORDER BY rm.timestamp ASC
  `;
  db.query(q, [recordId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Release
app.post("/api/tracking/release", verifyToken, (req, res) => {
  const { record_id, to_office } = req.body;
  const from_office = req.user?.office || "Unknown";
  const actor = req.user?.name || "System";

  const sql = `
    INSERT INTO record_movements (record_id, action, from_office, to_office, actor)
    VALUES (?, 'RELEASED', ?, ?, ?)
  `;
  db.query(sql, [record_id, from_office, to_office, actor], (err) => {
    if (err) return res.status(500).json({ error: err.message });

    db.query("UPDATE records SET destination_office = ? WHERE id = ?", [to_office, record_id]);

    const io = req.app.get("io");
    io.emit("recordUpdated", { record_id, to_office, from_office, actor });

    res.json({ success: true, message: "Record released successfully" });
  });
});
// app.get("/records/my-office", verifyToken, (req, res) => {
//   let sql, params;
//   if (req.user.role === "admin") {
//     sql = `
//       SELECT r.*, rf.file_name, rf.file_type, rf.file_size, rf.file_path, rf.retention_period
//       FROM records r
//       LEFT JOIN record_files rf ON r.id = rf.record_id
//       ORDER BY r.created_at DESC
//     `;
//     params = [];
//   } else {
//     sql = `
//       SELECT r.*, rf.file_name, rf.file_type, rf.file_size, rf.file_path, rf.retention_period
//       FROM records r
//       LEFT JOIN record_files rf ON r.id = rf.record_id
//       WHERE r.destination_office = ?
//       ORDER BY r.created_at DESC
//     `;
//     params = [req.user.office];
//   }
//   db.query(sql, params, (err, rows) => {
//     if (err) return res.status(500).json({ error: "Database error" });
//     res.json(rows); // Send all records with their file information
//   });
// });

// Fetched records from DB, ensuring document_origin is aliased as document_type
app.get("/records/my-office", verifyToken, (req, res) => {
  let sql, params;
  if (req.user.role === "admin") {
    sql = `
      SELECT r.*, rf.file_name, rf.file_path, r.record_origin 
      FROM records r
      LEFT JOIN record_files rf ON r.id = rf.record_id
      ORDER BY r.created_at DESC
    `;
    params = [];
  } else {
    sql = `
      SELECT r.*, rf.file_name, rf.file_path, r.record_origin
      FROM records r
      LEFT JOIN record_files rf ON r.id = rf.record_id
      WHERE r.destination_office = ?
      ORDER BY r.created_at DESC
    `;
    params = [req.user.office];
  }

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error("Error in SQL query:", err);
      return res.status(500).json({ message: "Database error", error: err });
    }
    res.json(rows); // Send all records with their file information
  });
});

app.post("/api/tracking/receive", verifyToken, (req, res) => {
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

          const io = req.app.get("io");
          io.emit("recordUpdated", { record_id, to_office: req.user.office, from_office, actor });

          res.json({ message: "Document received successfully" });
        }
      );
    }
  );
});

// My-office via movements
app.get("/api/tracking/my-office", verifyToken, (req, res) => {
  const userOffice = req.user.office;
  const q = `
    SELECT r.*
    FROM records r
    WHERE r.id IN (
      SELECT rm.record_id
      FROM record_movements rm
      WHERE rm.id = (SELECT MAX(id) FROM record_movements WHERE record_id = rm.record_id)
      AND rm.to_office = ?
    )
  `;
  db.query(q, [userOffice], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ====== Start ======
const PORT = process.env.PORT || 8081;
server.listen(PORT, () => {
  console.log(`✅ Backend + Socket.IO on ${PORT}`);
});

