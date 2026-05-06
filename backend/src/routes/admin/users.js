const express = require("express");
const pool = require("../../db");
const requireAuth = require("../../middleware/requireAuth");
const { requireRole } = require("../../middleware/requireRole");

const router = express.Router();
router.use(requireAuth);
router.use(requireRole("Admin"));

// GET /api/admin/users
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, is_active, created_at FROM users ORDER BY created_at DESC`
    );
    res.json({ users: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// PUT /api/admin/users/:id/status
router.put("/:id/status", async (req, res) => {
  const { is_active } = req.body;
  if (typeof is_active !== "boolean") {
    return res.status(400).json({ error: "is_active must be boolean" });
  }

  try {
    const result = await pool.query(
      `UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, name, email, role, is_active`,
      [is_active, req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update user status" });
  }
});

module.exports = router;
