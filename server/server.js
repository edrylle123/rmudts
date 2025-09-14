// server.js
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

// ====== JWT SECRET ======
const JWT_SECRET = "edryllepogisagad"; // move to .env in production

// ====== Database Connection ======
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "records_db",
});

// ====== Uploads Folder Setup ======
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// ====== Helpers / Middlewares ======
function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader)
    return res.status(401).json({ message: "No token provided" });

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer")
    return res.status(401).json({ message: "Bad authorization header" });

  const token = parts[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = decoded; // { id, email, role, name }
    next();
  });
}

function verifyAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admins only" });
  }
  next();
}

// ====== AUTH ROUTES ======
// small helper so visiting /login in the browser doesn't show Cannot GET
app.get("/login", (req, res) => {
  res.json({ message: "POST /login with { email, password }" });
});

// SIGNUP
// SIGNUP
app.post("/signup", async (req, res) => {
  const { name, email, password, role, idnumber, office } = req.body || {};
  if (!name || !email || !password || !role || !office || role === "Select Role") {
    return res
      .status(400)
      .json({
        success: false,
        message: "All fields including role and office are required",
      });
  }

  try {
    db.query(
      "SELECT id FROM users WHERE email = ?",
      [email],
      async (err, rows) => {
        if (err)
          return res.status(500).json({ success: false, message: err.message });
        if (rows.length > 0) {
          return res
            .status(409)
            .json({ success: false, message: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const sql =
          "INSERT INTO users (name, email, password, role, idnumber, office) VALUES (?, ?, ?, ?, ?, ?)";
        db.query(
          sql,
          [name, email, hashedPassword, role, idnumber || "", office],
          (insertErr, result) => {
            if (insertErr)
              return res
                .status(500)
                .json({ success: false, message: insertErr.message });

            return res.status(201).json({
              success: true,
              message: "User created successfully",
              user: {
                id: result.insertId,
                name,
                email,
                role,
                idnumber: idnumber || "",
                office,
              },
            });
          }
        );
      }
    );
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});


// LOGIN
// LOGIN
app.post("/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ message: "Email and password required" });

  db.query(
    "SELECT * FROM users WHERE email = ?",
    [email],
    async (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!rows || rows.length === 0) {
        return res
          .status(401)
          .json({ success: false, message: "Invalid email or password" });
      }

      const user = rows[0];
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return res
          .status(401)
          .json({ success: false, message: "Invalid email or password" });

      // ✅ include office in JWT
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
          office: user.office, // <-- ADD THIS
        },
        JWT_SECRET,
        { expiresIn: "1h" }
      );

      // ✅ also include office in response
      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          idnumber: user.idnumber || "",
          office: user.office, // <-- ADD THIS
        },
      });
    }
  );
});


// ====== USERS API (Admin only) ======
app.get("/users", verifyToken, verifyAdmin, (req, res) => {
  db.query("SELECT id, name, email, role, idnumber FROM users", (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    return res.json(rows);
  });
});

app.put("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, email, role, password, idnumber } = req.body || {};

  if (!name || !email || !role) {
    return res
      .status(400)
      .json({ message: "name, email and role are required" });
  }

  try {
    let sql, values;
    if (password && password.trim() !== "") {
      const hashed = await bcrypt.hash(password, 10);
      sql =
        "UPDATE users SET name = ?, email = ?, role = ?, idnumber = ?, password = ? WHERE id = ?";
      values = [name, email, role, idnumber || "", hashed, id];
    } else {
      sql =
        "UPDATE users SET name = ?, email = ?, role = ?, idnumber = ? WHERE id = ?";
      values = [name, email, role, idnumber || "", id];
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

// ====== RECORDS API (with file upload) ======
// Utility: generate next control number
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
      const lastControl = result[0].control_number;
      const [datePart, numPart] = lastControl.split("-");
      const newNum = String(parseInt(numPart) + 1).padStart(3, "0");
      nextNumber = `${datePart}-${newNum}`;
    } else {
      const today = new Date();
      const yymmdd = today.toISOString().slice(2, 10).replace(/-/g, "");
      nextNumber = `${yymmdd}-001`;
    }

    callback(null, nextNumber);
  });
}

// GET next control number
app.get("/records/next-control-number", (req, res) => {
  getNextControlNumber((err, nextNum) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json({ control_number: nextNum });
  });
});

// POST create new record with files
// POST create new record with files and destination office
app.post("/records", upload.array("files"), (req, res) => {
  const {
    title,
    classification,
    priority,
    description,
    source,
    retention_period,
    destination_office,
  } = req.body;
  const files = req.files;

  getNextControlNumber((err, nextNum) => {
    if (err) return res.status(500).json({ error: "Error generating control number" });

    const sql = `
      INSERT INTO records 
      (title, classification, priority, description, source, retention_period, created_at, control_number, destination_office)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?)
    `;
    db.query(
      sql,
      [title, classification, priority, description, source, retention_period, nextNum, destination_office],
      (err, result) => {
        if (err) return res.status(500).json({ error: "Database insert error" });

        const recordId = result.insertId;

        if (files && files.length > 0) {
          const fileSql = `
            INSERT INTO record_files (record_id, file_name, file_type, file_size, file_path, retention_period, uploaded_at)
            VALUES ?
          `;
          const values = files.map((file) => [
            recordId,
            file.originalname,
            file.mimetype,
            file.size,
            "/uploads/" + file.filename,
            retention_period,  // ✅ keep retention per file
            new Date(),
          ]);

          db.query(fileSql, [values], (fileErr) => {
            if (fileErr) return res.status(500).json({ error: "File insert error" });

            res.json({
              message: "✅ Record and files saved successfully",
              recordId,
              control_number: nextNum,
              destination_office,
              files: values,
            });
          });
        } else {
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

app.get("/records/my-office", verifyToken, (req, res) => {
  let sql, params;

  if (req.user.role === "admin") {
    // ✅ Admins see all offices
    sql = `
      SELECT r.*, rf.file_name, rf.file_type, rf.file_size, rf.file_path, rf.retention_period 
      FROM records r
      LEFT JOIN record_files rf ON r.id = rf.record_id
      ORDER BY r.created_at DESC
    `;
    params = [];
  } else {
    // ✅ Normal users see only their own office
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
// Fetch records for a specific office



// ====== Start server ======
app.listen(8081, () => {
  console.log("✅ Backend running on port 8081");
});
