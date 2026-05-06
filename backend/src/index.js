// src/index.js
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const complaintsRoutes = require("./routes/complaints");
const attachmentsRoutes = require("./routes/attachments");
const notificationsRoutes = require("./routes/notifications");
const assignmentsRoutes = require("./routes/assignments");
const pool = require("./db");

// Required environment variables
const requiredEnv = ["DATABASE_URL", "JWT_SECRET"];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing env var: ${key}. Copy .env.example to .env and fill it in.`);
    process.exit(1);
  }
}

const app = express();

app.use(cors());           // mobile app lives on a different origin
app.use(express.json());   // parse JSON bodies (multipart handled by multer)

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintsRoutes);
app.use("/attachments", attachmentsRoutes);
app.use("/notifications", notificationsRoutes);
app.use("/assignments", assignmentsRoutes);
app.use("/api/manager/workers", require("./routes/manager/workers"));
app.use("/api/admin/users", require("./routes/admin/users"));

// Last-resort error handler — logs and returns a generic 500
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 3000;

pool.query("SELECT 1")
  .then(() => {
    console.log("DB connection successful");
    app.listen(PORT, () => {
      console.log(`YallaFix API listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("DB connection failed:", err);
    process.exit(1);
  });
