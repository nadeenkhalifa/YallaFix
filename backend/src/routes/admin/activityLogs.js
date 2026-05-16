const express = require("express");
const pool = require("../../db");
const requireAuth = require("../../middleware/requireAuth");
const { requireRole } = require("../../middleware/requireRole");

const router = express.Router();
router.use(requireAuth);
router.use(requireRole("Admin"));

// GET /api/admin/activity-logs
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT al.*, u.name AS user_name, u.role AS user_role
       FROM activity_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC
       LIMIT 200`
    );
    res.json({ logs: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch activity logs" });
  }
});

module.exports = router;
