const express = require("express");
const pool = require("../../db");
const requireAuth = require("../../middleware/requireAuth");
const { requireRole } = require("../../middleware/requireRole");

const router = express.Router();
router.use(requireAuth);
router.use(requireRole("Facility Manager"));

// GET /api/manager/workers
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, is_active, created_at
       FROM users WHERE role = 'Worker' ORDER BY created_at DESC`
    );
    res.json({ workers: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch workers" });
  }
});

// PUT /api/manager/workers/:id/status
router.put("/:id/status", async (req, res) => {
  const { is_active } = req.body;
  if (typeof is_active !== "boolean") {
    return res.status(400).json({ error: "is_active must be boolean" });
  }

  try {
    const result = await pool.query(
      `UPDATE users SET is_active = $1 WHERE id = $2 AND role = 'Worker' RETURNING id, name, email, role, is_active`,
      [is_active, req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: "Worker not found" });
    }

    res.json({ worker: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update worker status" });
  }
});

module.exports = router;
