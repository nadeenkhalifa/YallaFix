require("dotenv").config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const complaintsRoutes = require("./routes/complaints");
const notificationsRoutes = require("./routes/notifications");
const pool = require("./db");

const requiredEnv = ["DATABASE_URL", "JWT_SECRET"];
for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing env var: ${key}`);
    process.exit(1);
  }
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/complaints", complaintsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/manager/workers", require("./routes/manager/workers"));
app.use("/api/admin/users", require("./routes/admin/users"));
app.use("/api/admin/categories", require("./routes/admin/categories"));
app.use("/api/admin/locations", require("./routes/admin/locations"));
app.use("/api/admin/activity-logs", require("./routes/admin/activityLogs"));

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
