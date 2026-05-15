const express = require("express");
const pool = require("../../db");
const requireAuth = require("../../middleware/requireAuth");
const { requireRole } = require("../../middleware/requireRole");
const { logActivity } = require("../../helpers/notify");

const router = express.Router();
router.use(requireAuth);

// GET /api/admin/locations - public to all authenticated users
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM locations ORDER BY name`);
    res.json({ locations: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch locations" });
  }
});

// POST /api/admin/locations - Admin only
router.post("/", requireRole("Admin"), async (req, res) => {
  const { name, building, floor, room } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  try {
    const result = await pool.query(
      `INSERT INTO locations (name, building, floor, room) VALUES ($1, $2, $3, $4) RETURNING *`,
      [name.trim(), building || null, floor || null, room || null]
    );
    await logActivity(req.user.id, "location_created", "location", result.rows[0].id, name);
    res.status(201).json({ location: result.rows[0] });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Location already exists" });
    res.status(500).json({ error: "Failed to create location" });
  }
});

// PUT /api/admin/locations/:id - Admin only
router.put("/:id", requireRole("Admin"), async (req, res) => {
  const { name, building, floor, room } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });
  try {
    const result = await pool.query(
      `UPDATE locations SET name = $1, building = $2, floor = $3, room = $4 WHERE id = $5 RETURNING *`,
      [name.trim(), building || null, floor || null, room || null, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: "Location not found" });
    res.json({ location: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: "Failed to update location" });
  }
});

// DELETE /api/admin/locations/:id - Admin only
router.delete("/:id", requireRole("Admin"), async (req, res) => {
  try {
    const result = await pool.query(`DELETE FROM locations WHERE id = $1 RETURNING id`, [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: "Location not found" });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete location" });
  }
});

module.exports = router;
