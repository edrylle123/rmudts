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
const { connect } = require("http2");
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
const queryAsync = (sql, params) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) {
        return reject(err); // Reject the Promise with error
      }
      resolve(result); // Resolve the Promise with result
    });
  });
};
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Max file size 10MB
});
const handleFormSubmit = (req, res) => {
  try {
    const { control_number, office_requestor, classification, priority, description, concerned_personnel, retention_period, destination_office, record_origin } = req.body;
if (!control_number || !office_requestor || !classification || !priority || !description || !destination_office || !current_office) {
  return res.status(400).json({ error: "Missing required fields" });
}
    // Check if retention_period is defined and not empty before calling split
    let retentionPeriod = null;
    if (retention_period && retention_period.trim() !== "") {
      // Only split if retention_period is defined and non-empty
      retentionPeriod = parseInt(retention_period.split(" ")[0], 10);
    }

    // Handle the case where retention_period is not provided or is invalid
    if (retention_period && isNaN(retentionPeriod)) {
      return res.status(400).json({ error: "Invalid retention period." });
    }

    // Handle optional fields (if they are empty, use default values)
    const concernedPersonnel = concerned_personnel || "Not provided";
    const destinationOffice = destination_office || "Not provided";

    // Simulate saving to a database (you can replace this with your actual database logic)
    const newRecord = {
      control_number,
      office_requestor,
      classification,
      priority,
      description,
      concerned_personnel: concernedPersonnel,
      retention_period: retentionPeriod,
      destination_office: destinationOffice,
      record_origin,
    };

    console.log("Record saved:", newRecord);

    // Return success response
    res.status(200).json({ message: "Record created successfully", control_number });

  } catch (err) {
    console.error("Error while processing form:", err);  // Log the error for debugging
    res.status(500).json({ error: "Internal Server Error" });
  }
};

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
  res.json({ message: "POST /login with { idnumber, password }" });
});

app.post("/signup", async (req, res) => {
  const { name, password, role, idnumber, office } = req.body || {};
  if (!name ||  !password || !role || !office || role === "Select Role") {
    return res.status(400).json({
      success: false,
      message: "All fields including role and office are required",
    });
  }
  try {
    db.query("SELECT id FROM users WHERE idnumber = ?", [idnumber], async (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      console.error("Database error while checking for existing ID:", err);
      if (rows.length > 0) {
        return res.status(409).json({ success: false, message: "ID Number already registered" });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const sql =
        "INSERT INTO users (name,  password, role, idnumber, office) VALUES (?, ?, ?, ?, ?)";
      db.query(
        sql,
        [name,  hashedPassword, role, idnumber , office],
        (insertErr, result) => {
          if (insertErr) {
            return res.status(500).json({ success: false, message: insertErr.message });
          }
          return res.status(201).json({
            success: true,
            message: "User created successfully",
            user: {
              id: result.insertId, name,  role, idnumber: idnumber, office,
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
  const { idnumber, password } = req.body || {};
  if (!idnumber || !password) return res.status(400).json({ message: "ID Number and password required" });
  db.query("SELECT * FROM users WHERE idnumber = ?", [idnumber], async (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!rows || rows.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid ID Number or password" });
    }
    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid ID Number or password" });

    const token = jwt.sign(
      { id: user.id, idnumber: user.idnumber, role: user.role, name: user.name, office: user.office },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
    const refreshToken = jwt.sign(
      { id: user.id, idnumber: user.idnumber, role: user.role, name: user.name, office: user.office },
      REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      success: true,
      token,
      refreshToken,
      user: {
        id: user.id, name: user.name, role: user.role,
        idnumber: user.idnumber, office: user.office,
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

// Endpoint to forward the record to the next office
// Endpoint to forward the record to the next office
// app.put("/records/forward/:id", verifyToken, async (req, res) => {
//   const { id } = req.params;
//   const { destination_office } = req.body;

//   if (!destination_office) {
//     return res.status(400).json({ error: "Destination office is required" });
//   }

//   const user = req.user;

//   // Permission check: Ensure the user is authorized to forward records
//   if (
//     (user.office !== "Office of the President" && user.role !== "admin") &&
//     !user.office.includes("Office")
//   ) {
//     return res.status(403).json({ error: "You are not authorized to forward records" });
//   }

//   // SQL query to update both current_office and destination_office
//   const sql = `
//     UPDATE records 
//     SET destination_office = ?, current_office = ? 
//     WHERE id = ?
//   `;
//   db.query(sql, [destination_office, destination_office, id], (err, result) => {
//     if (err) {
//       console.error("Error in SQL query:", err);
//       return res.status(500).json({ error: "Failed to forward record" });
//     }

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ error: "Record not found" });
//     }

//     // Notify all connected clients about the record update (via Socket.IO)
//     io.emit("recordUpdated", { record_id: id, to_office: destination_office });

//     res.status(200).json({ message: "Record forwarded successfully" });
//   });
// });

// app.put("/records/forward/:id", verifyToken, async (req, res) => {
//   const { id } = req.params;
//   const { destination_office } = req.body;

//   if (!destination_office) {
//     return res.status(400).json({ error: "Destination office is required" });
//   }

//   const user = req.user;

//   // Permission check: Ensure the user is authorized to forward records
//   if (
//     (user.office !== "Office of the President" && user.role !== "admin") &&
//     !user.office.includes("Office")
//   ) {
//     return res.status(403).json({ error: "You are not authorized to forward records" });
//   }

//   // SQL query to update the current_office and destination_office
//   const sql = `
//     UPDATE records 
//     SET destination_office = ?, current_office = ? 
//     WHERE id = ?
//   `;

//   db.query(sql, [destination_office, currentOffice, id], async (err, result) => {
//     if (err) {
//       console.error("Error in SQL query:", err);
//       return res.status(500).json({ error: "Failed to forward record" });
//     }

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ error: "Record not found" });
//     }

//     // Step 2: Log the transition in the record_history table
//     const historySql = `
//       INSERT INTO record_history (record_id, office_name, action)
//       VALUES (?, ?, ?)
//     `;
//     db.query(historySql, [id, destination_office, 'Forwarded'], (err) => {
//       if (err) {
//         console.error("Error inserting record history:", err);
//         return res.status(500).json({ error: "Failed to log record history" });
//       }

//       // Step 3: Emit real-time notification (Socket.IO)
//       io.emit("recordUpdated", { record_id: id, to_office: destination_office });

//       // Success response
//       res.status(200).json({ message: "Record forwarded successfully" });
//     });
//   });
// });

app.put("/records/forward/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { destination_office } = req.body;

  if (!destination_office) {
    return res.status(400).json({ error: "Destination office is required" });
  }

  const user = req.user;

  // Permission check
  if (
    (user.office !== "Office of the President" && user.role !== "admin") &&
    !user.office.includes("Office")
  ) {
    return res.status(403).json({ error: "You are not authorized to forward records" });
  }

  const sql = `
    UPDATE records
    SET destination_office = ?, current_office = ?
    WHERE id = ?
  `;
  db.query(sql, [destination_office, destination_office, id], (err, result) => {
    if (err) {
      console.error("Error in SQL query:", err);
      return res.status(500).json({ error: "Failed to forward record", details: err.message });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Record not found" });
    }

    io.emit("recordUpdated", { record_id: id, to_office: destination_office });

    res.status(200).json({ message: "Record forwarded successfully" });
  });
});


// app.put("/records/:id", verifyToken, verifyAdmin, upload.array('files'), (req, res) => {
//   const { id } = req.params;
//   const {
//     control_number,
//     office_requestor,
//     classification,
//     priority,
//     description,
//     retention_period,
//     concerned_personnel,
//     destination_office,
//     record_origin
//   } = req.body;

//   // Check if any required fields are missing
//   if (!control_number || !office_requestor || !classification || !priority || !description || !retention_period || !destination_office || !concerned_personnel || !record_origin) {
//     return res.status(400).json({ error: "Missing required fields" }); // Make sure this is the only response sent
//   }


//   // SQL query to update the record
//   const sql = `
//     UPDATE records
//     SET control_number = ?, office_requestor = ?, classification = ?, priority = ?, description = ?, retention_period = ?, concerned_personnel = ?, destination_office = ?, record_origin = ?
//     WHERE id = ?
//   `;
//   // validate required fields (trim strings; allow 0-like numeric values)
 
//   const values = [control_number, office_requestor, classification, priority, description, retention_period, concerned_personnel, destination_office, record_origin, id];

//   // Execute the query
//   db.query(sql, values, (err, result) => {
//     if (err) {
//       return res.status(500).json({ error: err.message }); // Handle DB errors
//     }

//     // If no rows were affected, the record wasn't found
//     if (result.affectedRows === 0) {
//       return res.status(404).json({ error: "Record not found" }); // Handle case where record doesn't exist
//     }

//     // Process files if uploaded
//     const files = req.files || [];11
//     if (files.length > 0) {
//       files.forEach(file => {
//         const filePath = `/uploads/${file.filename}`;
//         const fileSql = `
//           INSERT INTO files (record_id, file_path)
//           VALUES (?, ?)
//         `;
//         db.query(fileSql, [id, filePath], (err, result) => {
//           if (err) {
//             return res.status(500).json({ error: "Failed to save file data" });
//           }
//         });
//       });
//     }

//     // Send a single response after everything is completed
//     res.json({ success: true, message: "Record updated successfully" });
//   });
// });

// ====== USERS API ======




// app.put("/records/:id", verifyToken, verifyAdmin, upload.array('files'), async (req, res) => {
//   const { id } = req.params;
//   const { concerned_personnel, destination_office, retention_period } = req.body;

//   // Log the incoming request data for debugging purposes
//   console.log("Request Body:", req.body);
//   console.log("Files:", req.files);

//   // Check if any required fields are missing for the update
//   if (!concerned_personnel || !destination_office || !retention_period) {
//     return res.status(400).json({ error: "Missing required fields for update" });
//   }

//   // SQL query to update only the specified fields
//   const sql = `
//     UPDATE records
//     SET concerned_personnel = ?, destination_office = ?, retention_period = ?
//     WHERE id = ?
//   `;

//   const values = [concerned_personnel, destination_office, retention_period, id];

//   // Execute the query to update the fields
//   try {
//     const result = await new Promise((resolve, reject) => {
//       db.query(sql, values, (err, result) => {
//         if (err) {
//           return reject(err); // Reject if there is an error
//         }

//         // If no rows were affected, the record wasn't found
//         if (result.affectedRows === 0) {
//           return reject(new Error("Record not found"));
//         }

//         resolve(result); // Resolve on success
//       });
//     });

//     console.log("Record updated:", result);

//     // Process file uploads if any files are uploaded
//     const files = req.files || [];
//     if (files.length > 0) {
//       const filePromises = files.map(file => {
//         return new Promise((resolve, reject) => {
//           const filePath = `/uploads/${file.filename}`;
//           const fileSql = `
//             INSERT INTO record_files (record_id, file_path, file_name, file_size, file_type)
//             VALUES (?, ?, ?, ?, ?)
//           `;

//           db.query(fileSql, [id, filePath, file.originalname, file.size, file.mimetype], (err, result) => {
//             if (err) {
//               return reject(err); // Reject if there is an error with file upload
//             }
//             resolve(result); // Resolve on success
//           });
//         });
//       });

//       // Wait for all files to be uploaded
//       await Promise.all(filePromises);
//     }

//     // After everything is successful, send the response
//     res.json({ success: true, message: "Record updated successfully" });

//   } catch (err) {
//     console.error("Error during record update:", err.message);
//     return res.status(500).json({ error: err.message }); // Send error if something goes wrong
//   }
// });

// app.put("/records/:id", verifyToken, verifyAdmin, upload.array('files'), async (req, res) => {
//   const { id } = req.params;
//   const { concerned_personnel, destination_office, retention_period, current_office, actor, remarks } = req.body;  // actor is the person performing the action

//   // Log the incoming data for debugging purposes
//   console.log("Request Body:", req.body);
//   console.log("Current Office:", current_office); 

//   // Set default value for current_office if it's missing
//   const finalCurrentOffice = current_office || "Office of the President";  // Default office if not provided

//   // Check if any required fields are missing for the update
//   if (!concerned_personnel || !destination_office || !retention_period || !finalCurrentOffice || !actor || !remarks || !current_office) {
//     return res.status(400).json({ error: "Missing required fields for update" });
//   }

//   // SQL query to update only the specified fields
//   const sql = `
//     UPDATE records
//     SET concerned_personnel = ?, destination_office = ?, retention_period = ?, current_office = ?, remarks = ?
//     WHERE id = ?
//   `;

//   const values = [concerned_personnel, destination_office, retention_period, finalCurrentOffice, id];

//   try {
//     const result = await new Promise((resolve, reject) => {
//       db.query(sql, values, (err, result) => {
//         if (err) {
//           return reject(err); // Reject if there is an error
//         }

//         // If no rows were affected, the record wasn't found
//         if (result.affectedRows === 0) {
//           return reject(new Error("Record not found"));
//         }

//         resolve(result); // Resolve on success
//       });
//     });

//     // Insert the document movement history
//     const movementSql = `
//       INSERT INTO record_movements (record_id, action, from_office, to_office, actor)
//       VALUES (?, 'RELEASED', ?, ?, ?)
//     `;
//     const movementValues = [id, finalCurrentOffice, destination_office, actor];  // Log the movement
//     db.query(movementSql, movementValues, (err, movementResult) => {
//       if (err) {
//         console.error("Error inserting movement history:", err);
//       }
//     });

//     console.log("Record updated:", result);

//     // Proceed with file uploads if any
//     const files = req.files || [];
//     if (files.length > 0) {
//       const filePromises = files.map(file => {
//         return new Promise((resolve, reject) => {
//           const filePath = `/uploads/${file.filename}`;
//           const fileSql = `
//             INSERT INTO record_files (record_id, file_path, file_name, file_size, file_type)
//             VALUES (?, ?, ?, ?, ?)
//           `;
//           db.query(fileSql, [id, filePath, file.originalname, file.size, file.mimetype], (err, result) => {
//             if (err) {
//               return reject(err); // Reject if there is an error with file upload
//             }
//             resolve(result); // Resolve on success
//           });
//         });
//       });

//       await Promise.all(filePromises);
//     }

//     // Send a successful response after the update and history logging
//     res.json({ success: true, message: "Record updated successfully" });

//   } catch (err) {
//     console.error("Error during record update:", err.message);
//     return res.status(500).json({ error: err.message }); // Send error if something goes wrong
//   }
// });

app.put("/records/:id", verifyToken, verifyAdmin, upload.array('files'), async (req, res) => {
  const { id } = req.params;
  const { concerned_personnel, destination_office, retention_period, current_office, remarks } = req.body;

  // Get actor from the authenticated user (if available)
  const actor = req.user?.name || "Unknown Actor"; // Or use req.user.id or any other field

  // Log the incoming data for debugging purposes
  console.log("Request Body:", req.body);
  console.log("Actor:", actor);  // Log the actor for debugging
  console.log("Current Office:", current_office);

  // Set default value for current_office if it's missing
  const finalCurrentOffice = current_office || "Office of the President";  // Default office if not provided

  // Check if any required fields are missing for the update
  if (!concerned_personnel || !destination_office || !retention_period || !remarks || !finalCurrentOffice || !actor) {
    return res.status(400).json({ error: "Missing required fields for update" });
  }

  // SQL query to update only the specified fields
  const sql = `
    UPDATE records
    SET concerned_personnel = ?, destination_office = ?, retention_period = ?, current_office = ?, remarks = ?
    WHERE id = ?
  `;

  const values = [concerned_personnel, destination_office, retention_period, finalCurrentOffice, remarks, id];

  try {
    const result = await new Promise((resolve, reject) => {
      db.query(sql, values, (err, result) => {
        if (err) {
          return reject(err); // Reject if there is an error
        }

        // If no rows were affected, the record wasn't found
        if (result.affectedRows === 0) {
          return reject(new Error("Record not found"));
        }

        resolve(result); // Resolve on success
      });
    });

    // Insert the document movement history
    const movementSql = `
      INSERT INTO record_movements (record_id, action, from_office, to_office, actor)
      VALUES (?, 'RELEASED', ?, ?, ?)
    `;
    const movementValues = [id, finalCurrentOffice, destination_office, actor];  // Log the movement
    db.query(movementSql, movementValues, (err, movementResult) => {
      if (err) {
        console.error("Error inserting movement history:", err);
      }
    });

    console.log("Record updated:", result);

    // Proceed with file uploads if any
    const files = req.files || [];
    if (files.length > 0) {
      const filePromises = files.map(file => {
        return new Promise((resolve, reject) => {
          const filePath = `/uploads/${file.filename}`;
          const fileSql = `
            INSERT INTO record_files (record_id, file_path, file_name, file_size, file_type)
            VALUES (?, ?, ?, ?, ?)
          `;
          db.query(fileSql, [id, filePath, file.originalname, file.size, file.mimetype], (err, result) => {
            if (err) {
              return reject(err); // Reject if there is an error with file upload
            }
            resolve(result); // Resolve on success
          });
        });
      });

      await Promise.all(filePromises);
    }

    // Send a successful response after the update and history logging
    res.json({ success: true, message: "Record updated successfully" });

  } catch (err) {
    console.error("Error during record update:", err.message);
    return res.status(500).json({ error: err.message }); // Send error if something goes wrong
  }
});

// app.put("/records/:id", verifyToken, verifyAdmin, upload.array('files'), async (req, res) => {
//   const { id } = req.params;
//   const { concerned_personnel, destination_office, retention_period, current_office } = req.body;

//   // Log the incoming data for debugging purposes
//   console.log("Request Body:", req.body);  // Check that current_office is included here
//   console.log("Current Office:", current_office); // Log current office for debugging

//   // Set default value for current_office if it's missing
//   const finalCurrentOffice = current_office || "Office of the President";

//   // Check if any required fields are missing for the update
//   if (!concerned_personnel || !destination_office || !retention_period || !finalCurrentOffice) {
//     return res.status(400).json({ error: "Missing required fields for update" });
//   }

//   // SQL query to update only the specified fields
//   const sql = `
//     UPDATE records
//     SET concerned_personnel = ?, destination_office = ?, retention_period = ?, current_office = ?
//     WHERE id = ?
//   `;

//   const values = [concerned_personnel, destination_office, retention_period, finalCurrentOffice, id];

//   try {
//     const result = await new Promise((resolve, reject) => {
//       db.query(sql, values, (err, result) => {
//         if (err) {
//           return reject(err); // Reject if there is an error
//         }

//         // If no rows were affected, the record wasn't found
//         if (result.affectedRows === 0) {
//           return reject(new Error("Record not found"));
//         }

//         resolve(result); // Resolve on success
//       });
//     });

//     console.log("Record updated:", result);  // Confirm that the update was successful

//     // Proceed with file uploads if any
//     const files = req.files || [];
//     if (files.length > 0) {
//       const filePromises = files.map(file => {
//         return new Promise((resolve, reject) => {
//           const filePath = `/uploads/${file.filename}`;
//           const fileSql = `
//             INSERT INTO record_files (record_id, file_path, file_name, file_size, file_type)
//             VALUES (?, ?, ?, ?, ?)
//           `;
//           db.query(fileSql, [id, filePath, file.originalname, file.size, file.mimetype], (err, result) => {
//             if (err) {
//               return reject(err); // Reject if there is an error with file upload
//             }
//             resolve(result); // Resolve on success
//           });
//         });
//       });

//       await Promise.all(filePromises);
//     }

//     // After everything is successful, send the response
//     res.json({ success: true, message: "Record updated successfully" });

//   } catch (err) {
//     console.error("Error during record update:", err.message);
//     return res.status(500).json({ error: err.message }); // Send error if something goes wrong
//   }
// });





app.get("/users", verifyToken, verifyAdmin, (req, res) => {
  db.query("SELECT id, name, email, role, idnumber, office FROM users", (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    return res.json(rows);
  });
});


app.put("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { name,  role, password, idnumber, office } = req.body || {};
  if (!name || !idnumber || !role) {
    return res.status(400).json({ message: "name, idnumber and role are required" });
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
// app.get("/next-control-number", async (req, res) => {
//   try {
//     const controlNumber = await generateControlNumber();
//     res.json({ control_number: controlNumber });
//   } catch (err) {
//     console.error("Error generating control number:", err);
//     res.status(500).json({ message: "Failed to generate control number", error: err.message });
//   }
// });

// function normalizeOrigin(str) {
//   return String(str || "internal").toLowerCase() === "external" ? "external" : "internal";
// }

// app.post("/records", upload.array("files"), async (req, res) => {
//   try {
//     const {
//       control_number,
//       office_requestor,
//       classification,
//       priority,
//       description,
//       // concerned_personnel,
//       // retention_period,
//       destination_office,
//       record_origin,
//     } = req.body;

//     // Ensure all fields are provided
//     if (
//       !control_number ||
//       !office_requestor ||
//       !classification ||
//       !priority ||
//       !description ||
//       // !concerned_personnel ||
//       // !retention_period ||
//       !destination_office ||
//       !record_origin
//     ) {
//       return res.status(400).json({ error: "All fields are required." });
//     }

//     // const retentionPeriodNumber = parseInt(retention_period.split(" ")[0], 10);
//     // if (isNaN(retentionPeriodNumber)) {
//     //   return res.status(400).json({ error: "Invalid retention period." });
//     // }

//     // Insert record into database
//     const insertSql = `
//       INSERT INTO records
//       (control_number, office_requestor, classification, priority, description, record_origin, destination_office)
//       VALUES (?, ?, ?, ?, ?, ?, ?)
//     `;

//     const recordResult = await new Promise((resolve, reject) => {
//       db.query(
//         insertSql,
//         [
//           control_number,
//           office_requestor,
//           classification,
//           priority,
//           description,
//           // concerned_personnel,
//           // retentionPeriodNumber, // Store numeric retention period
//           // destination_office,
//           record_origin || "internal",
//           destination_office || "Office of the President",
//         ],
//         (err, result) => (err ? reject(err) : resolve(result))
//       );
//     });

//     // Generate the QR code and save it
//     const qrCodeImagePath = path.join(__dirname, 'uploads', `${control_number}.png`);
//     await QRCode.toFile(qrCodeImagePath, control_number); // Create QR code from control_number

//     // Save QR code path in the database
//     const updateSql = `
//       UPDATE records SET qrcode_path = ? WHERE id = ?
//     `;
//     await new Promise((resolve, reject) => {
//       db.query(
//         updateSql,
//         ["/uploads/" + `${control_number}.png`, recordResult.insertId],
//         (err) => (err ? reject(err) : resolve())
//       );
//     });

//     // If files are uploaded, store them in the 'record_files' table and convert to PDF
//     if (req.files && req.files.length > 0) {
//       const filePromises = req.files.map(async (file) => {
//         // Insert each file into the database
//         const fileSql = `
//           INSERT INTO record_files (record_id, file_name, file_path, file_size, file_type)
//           VALUES (?, ?, ?, ?, ?)
//         `;
//         await new Promise((resolve, reject) => {
//           db.query(
//             fileSql,
//             [
//               recordResult.insertId, // Link the file to the newly inserted record
//               file.originalname,
//               "/uploads/" + file.filename, // Path to the uploaded file
//               file.size,
//               file.mimetype,
//             ],
//             (err) => (err ? reject(err) : resolve())
//           );
//         });

//         // Convert the file to PDF if needed
//         const convertedFile = await convertToPdfIfNeeded(file);
//         if (convertedFile) {
//           // Update the file path to the PDF version
//           const updateSql = `
//             UPDATE record_files
//             SET file_path = ?, file_name = ?, file_size = ?, file_type = ?
//             WHERE record_id = ? AND file_name = ?
//           `;
//           await new Promise((resolve, reject) => {
//             db.query(
//               updateSql,
//               [
//                 convertedFile.pdfPath, // Updated file path
//                 convertedFile.name, // Updated file name
//                 convertedFile.size, // Updated file size
//                 convertedFile.type, // Updated file type
//                 recordResult.insertId, // Match the record ID
//                 file.originalname, // Match the original file name
//               ],
//               (err) => (err ? reject(err) : resolve())
//             );
//           });
//         }
//       });

//       // Wait for all file insertions and conversions to complete
//       await Promise.all(filePromises);
//     }

//     res.status(201).json({
//       message: "Record created successfully with QR code and converted PDF (if needed).",
//       control_number,
//       recordId: recordResult.insertId,
//       qrcode_path: "/uploads/" + `${control_number}.png`, // Send the QR code path in the response
//     });
//   } catch (error) {
//     console.error("Create record failed:", error);
//     res.status(500).json({ error: error.message || "Failed to create record." });
//   }
// });

// QR Code Generation function
// Function to generate the next control number for the day
// Function to generate control number based on the current date
// Function to generate control number
function queryPromise(sql, params) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}
// const generateControlNumber = async (origin) => {
//   const currentDate = new Date();
//   const currentYear = currentDate.getFullYear().toString().slice(-2); // Last 2 digits of the year
//   const currentMonth = String(currentDate.getMonth() + 1).padStart(2, "0"); // 2 digits month
//   const currentDay = String(currentDate.getDate()).padStart(2, "0"); // 2 digits day
//   const datePrefix = `${currentYear}${currentMonth}${currentDay}`;

//   // Determine the WHERE condition based on the origin (Internal or External)
//   let originCondition = '';
//   if (origin === 'Internal') {
//     originCondition = "WHERE record_origin = 'internal'"; // Internal records
//   } else if (origin === 'External') {
//     originCondition = "WHERE record_origin = 'external'"; // External records
//   }

//   try {
//     // Correct SQL syntax: Ensure WHERE clause is correctly formed
//     const sql = `SELECT MAX(SUBSTRING_INDEX(control_number, "-", -1)) AS max_seq 
//                  FROM records ${originCondition} AND control_number LIKE ?`;
//     const params = [`${datePrefix}-%`]; // Match control numbers that start with today's date

//     const rows = await queryPromise(sql, params); // Use the promise wrapper
//     const maxSeq = rows[0]?.max_seq || 0;  // Get the max sequence number for today's date
//     const nextSeq = String(parseInt(maxSeq, 10) + 1).padStart(3, "0"); // Increment the sequence number with leading zeros

//     const controlNumber = `${datePrefix}-${nextSeq}`;
//     return controlNumber;
//   } catch (err) {
//     console.error("Error generating control number:", err);
//     throw new Error("Failed to generate control number");
//   }
// };




// API route to get the next control number based on origin

// Replace your generateControlNumber with this (pure callback, no Promise/await)
// Corrected generateControlNumber function with callback handling


// function generateControlNumber(origin, cb) {
//   if (typeof cb !== 'function') {
//     console.error('Callback is not a function');
//     return; // Exit early if cb is not a function
//   }

//   const now = new Date();
//   const yy = String(now.getFullYear()).slice(-2); // Last 2 digits of year
//   const mm = String(now.getMonth() + 1).padStart(2, "0"); // 2 digits month
//   const dd = String(now.getDate()).padStart(2, "0"); // 2 digits day
//   const datePrefix = `${yy}${mm}${dd}`;

//   const where = [];
//   const params = [];

//   if (origin) {
//     where.push("LOWER(record_origin) = ?");
//     params.push(String(origin).toLowerCase());
//   }

//   where.push("control_number LIKE ?");
//   params.push(`${datePrefix}-%`);

//   const sql = `
//     SELECT MAX(CAST(SUBSTRING_INDEX(control_number, '-', -1) AS UNSIGNED)) AS max_seq
//     FROM records
//     ${where.length ? "WHERE " + where.join(" AND ") : ""}
//   `;

//   db.query(sql, params, function(err, rows) {
//     if (err) {
//       console.error("Database query error:", err);
//       return cb(err);  // Pass the error to the callback
//     }

//     const maxSeq = rows && rows[0] && rows[0].max_seq ? Number(rows[0].max_seq) : 0;
//     const nextSeq = String(maxSeq + 1).padStart(3, "0"); // Increment the sequence and pad it
//     const controlNumber = `${datePrefix}-${nextSeq}`;

//     console.log("Control Number Generated:", controlNumber); // Debug control number before passing it
//     cb(null, controlNumber); // Call the callback with the generated control number
//   });
// }
function generateControlNumber(origin, cb) {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2); // Last 2 digits of year
  const mm = String(now.getMonth() + 1).padStart(2, "0"); // Month as two digits
  const dd = String(now.getDate()).padStart(2, "0"); // Date as two digits
  const datePrefix = `${yy}${mm}${dd}`;

  // Query to find the last control number for a specific record_origin (INTERNAL or EXTERNAL)
  const where = ["control_number LIKE ?", "record_origin = ?"];
  const params = [`${datePrefix}-%`, origin.toLowerCase()];

  const sql = `
    SELECT MAX(CAST(SUBSTRING_INDEX(control_number, '-', -1) AS UNSIGNED)) AS max_seq
    FROM records
    WHERE ${where.join(" AND ")}
  `;

  db.query(sql, params, function (err, rows) {
    if (err) {
      console.error("Error generating control number:", err);
      return cb(err); // Return error via callback
    }

    const maxSeq = rows && rows[0] && rows[0].max_seq ? Number(rows[0].max_seq) : 0;
    const nextSeq = String(maxSeq + 1).padStart(3, "0"); // Increment sequence and pad to 3 digits
    const controlNumber = `${datePrefix}-${nextSeq}`;

    console.log("Generated Control Number:", controlNumber); // Debug control number before passing it
    cb(null, controlNumber); // Pass result via callback
  });
}

// Endpoint to get the next control number
app.get("/next-control-number", (req, res) => {
  const origin = req.query.origin || req.query.recordOrigin; // Get 'origin' from query params
  console.log("Origin:", origin); // Debug to check origin value

  // Define the callback function for your API request
  const callback = (err, controlNumber) => {
    if (err) {
      console.error("Error generating control number:", err);
      return res.status(500).json({ message: "Failed to generate control number" });
    }
    console.log("Generated Control Number:", controlNumber); // Debug the generated control number
    res.json({ control_number: controlNumber }); // Return the result as a JSON response
  };

  // Call generateControlNumber with the callback
  generateControlNumber(origin, callback); // Pass callback here
});


// app.get("/next-control-number", (req, res) => {
//   const origin = req.query.origin || req.query.recordOrigin;  // Get 'origin' from query params
//   console.log("Origin:", origin);  // Debug to check origin value

//   // Define the callback function that will be passed to generateControlNumber
//   const callback = (err, controlNumber) => {
//     if (err) {
//       console.error("Error generating control number:", err);
//       return res.status(500).json({ message: "Failed to generate control number" });
//     }
//     console.log("Generated Control Number:", controlNumber); // Log the control number
//     res.json({ control_number: controlNumber }); // Send the generated control number back to the frontend
//   };

//   // Call generateControlNumber with the callback function
//   generateControlNumber(origin, callback); // Ensure you're passing the callback here
// });

// Backend to generate control number based on the origin (Internal/External)
app.get("/next-control-number", (req, res) => {
  const origin = req.query.origin || "internal"; // Default to "internal" if not provided
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2); // Last 2 digits of year
  const mm = String(now.getMonth() + 1).padStart(2, "0"); // Month as two digits
  const dd = String(now.getDate()).padStart(2, "0"); // Date as two digits
  const datePrefix = `${yy}${mm}${dd}`;

  let whereCondition = `WHERE control_number LIKE ? AND record_origin = ?`;
  let params = [`${datePrefix}-%`, origin.toLowerCase()]; // Include origin condition

  const sql = `
    SELECT MAX(CAST(SUBSTRING_INDEX(control_number, '-', -1) AS UNSIGNED)) AS max_seq
    FROM records
    ${whereCondition}
  `;

  db.query(sql, params, function(err, rows) {
    if (err) {
      console.error("Error generating control number:", err);
      return res.status(500).json({ message: "Failed to generate control number" });
    }

    const maxSeq = rows[0]?.max_seq || 0;
    const nextSeq = String(maxSeq + 1).padStart(3, "0"); // Increment the sequence and pad it to 3 digits
    const controlNumber = `${datePrefix}-${nextSeq}`;

    console.log("Generated Control Number:", controlNumber); // Debug the control number

    res.json({ control_number: controlNumber });
  });
});



// app.post("/records", upload.array("files"), async (req, res) => {
//   try {
//     const {
//       control_number,
//       office_requestor,
//       classification,
//       priority,
//       description,
//       record_origin,
//       destination_office, // Ensure destination_office is included here
//     } = req.body;

//     // Ensure all fields are provided
//     if (
//       !control_number ||
//       !office_requestor ||
//       !classification ||
//       !priority ||
//       !description ||
//       !destination_office ||  // Make sure destination_office is validated
//       !record_origin
//     ) {
//       return res.status(400).json({ error: "All fields are required." });
//     }

//     // Check if the control number already exists with the same record origin (INTERNAL/EXTERNAL)
//     const checkSql = `
//       SELECT * FROM records
//       WHERE control_number = ? AND record_origin = ?
//     `;
//     db.query(checkSql, [control_number, record_origin], (err, rows) => {
//       if (err) {
//         console.error("Database error while checking for duplicate entry:", err);
//         return res.status(500).json({ error: "Database error" });
//       }

//       if (rows.length > 0) {
//         // If there's a duplicate, increment the control number
//         console.log("Duplicate entry detected for the control number with the same origin.");
//         return res.status(400).json({
//           error: `Duplicate entry detected for the control number '${control_number}' with record origin '${record_origin}'.`,
//         });
//       } else {
//         // Insert new record as no duplicate was found
//         const insertSql = `
//           INSERT INTO records
//           (control_number, office_requestor, classification, priority, description, record_origin, destination_office)
//           VALUES (?, ?, ?, ?, ?, ?, ?)
//         `;
//         db.query(
//           insertSql,
//           [
//             control_number,
//             office_requestor,
//             classification,
//             priority,
//             description,
//             record_origin,
//             destination_office || "Office of the President",
//           ],
//           (err, result) => {
//             if (err) {
//               console.error("Error inserting record:", err);
//               return res.status(500).json({ error: "Failed to insert record" });
//             }

//             // Generate the QR code for the record
//             const qrCodeImagePath = path.join(__dirname, 'uploads', `${control_number}.png`);
//             QRCode.toFile(qrCodeImagePath, control_number, { width: 512, margin: 1 }, function (err) {
//               if (err) {
//                 console.error("Error generating QR code:", err);
//                 return res.status(500).json({ error: "Failed to generate QR code" });
//               }

//               // Save QR code path in the database
//               const updateSql = `
//                 UPDATE records SET qrcode_path = ? WHERE id = ?
//               `;
//               db.query(updateSql, ["/uploads/" + `${control_number}.png`, result.insertId], (err) => {
//                 if (err) {
//                   console.error("Error saving QR code path:", err);
//                   return res.status(500).json({ error: "Failed to save QR code path" });
//                 }

//                 res.status(201).json({
//                   message: "Record created successfully with QR code.",
//                   control_number,
//                   recordId: result.insertId,
//                   qrcode_path: "/uploads/" + `${control_number}.png`, // Send the QR code path in the response
//                 });
//               });
//             });
//           }
//         );
//       }
//     });
//   } catch (error) {
//     console.error("Create record failed:", error);
//     res.status(500).json({ error: error.message || "Failed to create record." });
//   }
// });

// app.post("/records", upload.array("files"), async (req, res) => {
//   try {
//     const {
//       control_number,
//       office_requestor,
//       classification,
//       priority,
//       description,
//       record_origin,
//       destination_office, 
//     } = req.body;

//     // Ensure all fields are provided
//     if (
//       !control_number ||
//       !office_requestor ||
//       !classification ||
//       !priority ||
//       !description ||
//       !destination_office ||  
//       !record_origin
//     ) {
//       return res.status(400).json({ error: "All fields are required." });
//     }

//     // Determine the current office based on record origin
//     const current_office = record_origin === "Internal" ? destination_office : "Office of the President"; 

//     // Check if the control number already exists with the same record origin (INTERNAL/EXTERNAL)
//     const checkSql = `
//       SELECT * FROM records
//       WHERE control_number = ? AND record_origin = ?
//     `;
//     db.query(checkSql, [control_number, record_origin], (err, rows) => {
//       if (err) {
//         console.error("Database error while checking for duplicate entry:", err);
//         return res.status(500).json({ error: "Database error" });
//       }

//       if (rows.length > 0) {
//         // If there's a duplicate, increment the control number
//         console.log("Duplicate entry detected for the control number with the same origin.");
//         return res.status(400).json({
//           error: `Duplicate entry detected for the control number '${control_number}' with record origin '${record_origin}'.`,
//         });
//       } else {
//         // Insert new record as no duplicate was found
//         const insertSql = `
//           INSERT INTO records
//           (control_number, office_requestor, classification, priority, description, record_origin, destination_office, current_office)
//           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
//         `;
//         db.query(
//           insertSql,
//           [
//             control_number,
//             office_requestor,
//             classification,
//             priority,
//             description,
//             record_origin,
//             destination_office || "Office of the President",
//             current_office
//           ],
//           (err, result) => {
//             if (err) {
//               console.error("Error inserting record:", err);
//               return res.status(500).json({ error: "Failed to insert record" });
//             }

//             // Generate the QR code for the record
//             const qrCodeImagePath = path.join(__dirname, 'uploads', `${control_number}.png`);
//             QRCode.toFile(qrCodeImagePath, control_number, { width: 512, margin: 1 }, function (err) {
//               if (err) {
//                 console.error("Error generating QR code:", err);
//                 return res.status(500).json({ error: "Failed to generate QR code" });
//               }

//               // Save QR code path in the database
//               const updateSql = `
//                 UPDATE records SET qrcode_path = ? WHERE id = ?
//               `;
//               db.query(updateSql, ["/uploads/" + `${control_number}.png`, result.insertId], (err) => {
//                 if (err) {
//                   console.error("Error saving QR code path:", err);
//                   return res.status(500).json({ error: "Failed to save QR code path" });
//                 }

//                 res.status(201).json({
//                   message: "Record created successfully with QR code.",
//                   control_number,
//                   recordId: result.insertId,
//                   qrcode_path: "/uploads/" + `${control_number}.png`, // Send the QR code path in the response
//                 });
//               });
//             });
//           }
//         );
//       }
//     });
//   } catch (error) {
//     console.error("Create record failed:", error);
//     res.status(500).json({ error: error.message || "Failed to create record." });
//   }
// });
app.post("/records", upload.array("files"), async (req, res) => {
  try {
    console.log("Incoming Request Data:", req.body);  // Log incoming request data

    const { 
      control_number, 
      office_requestor, 
      classification, 
      priority, 
      description, 
      record_origin, 
      destination_office, 
      current_office // Ensure this field is sent from the frontend or handle default
    } = req.body;

    // Check if current_office exists, if not, set it to a default value
    const currentOffice = current_office || "Office of the President";

    const missingFields = [];
    if (!control_number) missingFields.push("control_number");
    if (!office_requestor) missingFields.push("office_requestor");
    if (!classification) missingFields.push("classification");
    if (!priority) missingFields.push("priority");
    if (!description) missingFields.push("description");
    if (!destination_office) missingFields.push("destination_office");
    if (!current_office) missingFields.push("current_office");  // Missing check for current_office

    // If any fields are missing, return the error with details
    if (missingFields.length > 0) {
      return res.status(400).json({ error: `Missing required fields: ${missingFields.join(", ")}` });
    }

    // Check for duplicate control number and record origin
    const checkSql = `SELECT * FROM records WHERE control_number = ? AND record_origin = ?`;
    db.query(checkSql, [control_number, record_origin], (err, rows) => {
      if (err) {
        console.error("Database error while checking for duplicate entry:", err);
        return res.status(500).json({ error: "Database error" });
      }

      if (rows.length > 0) {
        console.log("Duplicate entry detected for the control number with the same origin.");
        return res.status(400).json({
          error: `Duplicate entry detected for the control number '${control_number}' with record origin '${record_origin}'.`
        });
      } else {
        // Proceed with inserting the new record
        const insertSql = `
          INSERT INTO records
          (control_number, office_requestor, classification, priority, description, record_origin, destination_office, current_office)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        db.query(
          insertSql,
          [control_number, office_requestor, classification, priority, description, record_origin, destination_office || "Office of the President", currentOffice],
          (err, result) => {
            if (err) {
              console.error("Error inserting record:", err);
              return res.status(500).json({ error: "Failed to insert record" });
            }

            const qrCodeImagePath = path.join(__dirname, 'uploads', `${control_number}.png`);
            QRCode.toFile(qrCodeImagePath, control_number, { width: 512, margin: 1 }, function (err) {
              if (err) {
                console.error("Error generating QR code:", err);
                return res.status(500).json({ error: "Failed to generate QR code" });
              }

              const updateSql = `
                UPDATE records SET qrcode_path = ? WHERE id = ?
              `;
              db.query(updateSql, ["/uploads/" + `${control_number}.png`, result.insertId], (err) => {
                if (err) {
                  console.error("Error saving QR code path:", err);
                  return res.status(500).json({ error: "Failed to save QR code path" });
                }

                res.status(201).json({
                  message: "Record created successfully with QR code.",
                  control_number,
                  recordId: result.insertId,
                  qrcode_path: "/uploads/" + `${control_number}.png`, // Send the QR code path in the response
                });
              });
            });
          }
        );
      }
    });
  } catch (error) {
    console.error("Create record failed:", error);
    res.status(500).json({ error: error.message || "Failed to create record." });
  }
});

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
// app.get("/records/my-office", verifyToken, (req, res) => {
//   let sql, params;
//   if (req.user.role === "admin") {
//     sql = `
//       SELECT r.*, rf.file_name, rf.file_path, r.record_origin  
//       FROM records r
//       LEFT JOIN record_files rf ON r.id = rf.record_id
//       ORDER BY r.created_at DESC
//     `;
//     params = [];
//   } else {
//     sql = `
//       SELECT r.*, rf.file_name, rf.file_path, r.record_origin  
//       FROM records r
//       LEFT JOIN record_files rf ON r.id = rf.record_id
//       WHERE r.destination_office = ?
//       ORDER BY r.created_at DESC
//     `;
//     params = [req.user.office];
//   }
  
//   db.query(sql, params, (err, rows) => {
//     if (err) {
//       console.error("Error in SQL query:", err);  // Log the error
//       return res.status(500).json({ message: "Database error", error: err });
//     }
//     // console.log("Fetched records:", rows); 
//     res.json(rows);
//   });
// });

// Records visible to current user (admin = all; user = office only)
app.get("/records/my-office", verifyToken, (req, res) => {
  let sql, params;
  if (req.user.role === "admin") {
    sql = `
      SELECT r.*, rf.file_name, rf.file_path, r.record_origin , r.current_office
      FROM records r
      LEFT JOIN record_files rf ON r.id = rf.record_id
      ORDER BY r.created_at DESC
    `;
    params = [];
  } else {
    sql = `
      SELECT r.*, rf.file_name, rf.file_path, r.record_origin , r.current_office
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


app.get("/records/:id", verifyToken, verifyAdmin, (req, res) => {
  const { id } = req.params;

  // SQL to fetch the record details
  const recordSql = `
    SELECT r.*, rf.file_name, rf.file_type, rf.file_size, rf.file_path, rf.retention_period
    FROM records r
    LEFT JOIN record_files rf ON r.id = rf.record_id
    WHERE r.id = ?
  `;

  // SQL to fetch the movement history for this record
  const movementSql = `
    SELECT rm.action, rm.from_office, rm.to_office, rm.actor, rm.timestamp
    FROM record_movements rm
    WHERE rm.record_id = ?
    ORDER BY rm.timestamp DESC
  `;

  db.query(recordSql, [id], (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });

    // Check if record exists
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "Record not found" });
    }

    const record = rows[0]; // First record in the response

    // Fetch the record movements history
    db.query(movementSql, [id], (err, historyRows) => {
      if (err) return res.status(500).json({ error: "Failed to fetch history" });

      // Prepare the response
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
        history: historyRows.map(h => ({
          action: h.action,
          from_office: h.from_office,
          to_office: h.to_office,
          actor: h.actor,
          timestamp: h.timestamp
        })),
      });
    });
  });
});

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

//     // Check if record exists
//     if (!rows || rows.length === 0) {
//       return res.status(404).json({ error: "Record not found" });
//     }

//     const record = rows[0]; // First record in the response
//     res.json({
//       id: record.id,
//       control_number: record.control_number,
//       office_requestor: record.office_requestor,
//       classification: record.classification,
//       priority: record.priority,
//       description: record.description,
//       retention_period: record.retention_period,
//       concerned_personnel: record.concerned_personnel,
//       destination_office: record.destination_office,
//       record_origin: record.record_origin, // Non-editable
//       files: rows.map(r => ({
//         name: r.file_name,
//         path: r.file_path,
//         type: r.file_type,
//         size: r.file_size
//       })),
//     });
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


app.get("/records/total-per-office", verifyToken, (req, res) => {
  let sql;
  let params = [];

  if (req.user.role === "admin") {
    sql = `
      SELECT r.destination_office, COUNT(*) AS total_records
      FROM records r
      GROUP BY r.destination_office
    `;
  } else {
    sql = `
      SELECT r.destination_office, COUNT(*) AS total_records
      FROM records r
      WHERE r.destination_office = ?
      GROUP BY r.destination_office
    `;
    params = [req.user.office];
  }

  db.query(sql, params, (err, rows) => {
    if (err) {
      console.error("Error in SQL query:", err);
      return res.status(500).json({ message: "Database error", error: err });
    }
    res.json(rows); // Send total records per office
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
app.post("/records/move", verifyToken, async (req, res) => {
  try {
    const { record_id, from_office, to_office, actor } = req.body;

    if (!record_id || !from_office || !to_office || !actor) {
      return res.status(400).json({ error: "All fields are required." });
    }

    // Log the movement in the record_movements table
    const movementSql = `
      INSERT INTO record_movements (record_id, action, from_office, to_office, actor)
      VALUES (?, 'RELEASED', ?, ?, ?)
    `;
    db.query(movementSql, [record_id, from_office, to_office, actor], (err, result) => {
      if (err) {
        console.error("Error inserting record movement:", err);
        return res.status(500).json({ error: "Failed to log record movement." });
      }

      // Update the current_office field in the records table
      const updateSql = `
        UPDATE records SET current_office = ? WHERE id = ?
      `;
      db.query(updateSql, [to_office, record_id], (err, result) => {
        if (err) {
          console.error("Error updating current office:", err);
          return res.status(500).json({ error: "Failed to update current office." });
        }

        res.status(200).json({
          message: "Record movement logged and current office updated.",
        });
      });
    });
  } catch (error) {
    console.error("Error handling record movement:", error);
    res.status(500).json({ error: error.message || "Failed to process record movement." });
  }
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